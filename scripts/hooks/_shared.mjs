/**
 * Shared helpers for the Claude Code hooks in this directory.
 *
 * These hooks run on EVERY matching tool call, so the budget is a few hundred milliseconds. Nothing
 * here starts a TypeScript process, reads a large document or shells out. `node` plus `fs` only.
 *
 * Why this tier exists: most of the work in this
 * repository is done by an agent, and a gate that fires after the agent has spent twenty minutes
 * going the wrong way is worth far less than one that stops it at the first keystroke.
 */
import { closeSync, openSync, readFileSync, readSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

/** The repository root. This file lives at `scripts/hooks/_shared.mjs`. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

/**
 * Read the hook payload from stdin.
 *
 * Returns `null` rather than hanging when there is no stdin, so every hook in this directory can be
 * run by hand and exits cleanly with nothing to do.
 */
export async function readHookInput() {
  if (process.stdin.isTTY) return null
  const chunks = []
  for await (const c of process.stdin) chunks.push(c)
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * The file path a Write/Edit call is aimed at, from either spelling of the payload.
 *
 * `tool_input.file_path` is the documented field; the text is `content` on Write and `new_string` on
 * Edit. Both are read because a Write to a path that does not exist yet has no file on disk to
 * inspect, and the incoming TEXT is then the only evidence available.
 */
export function editTarget(input) {
  const ti = input?.tool_input ?? {}
  return {
    filePath: typeof ti.file_path === 'string' ? ti.file_path : null,
    text: [ti.content, ti.file_text, ti.new_string].find((t) => typeof t === 'string') ?? '',
  }
}

/** A repo-relative POSIX path, or `null` when the target is outside this repository. */
export function toRepoRel(filePath) {
  if (typeof filePath !== 'string' || filePath === '') return null
  const rel = relative(ROOT, resolve(ROOT, filePath))
  if (rel === '' || rel.startsWith('..')) return null
  return rel.split(sep).join('/')
}

/**
 * The first 2,000 bytes of a file -- its header and nothing else.
 *
 * The window matters. An emitter contains the literal string "GENERATED ... DO NOT EDIT BY HAND"
 * because it EMITS it. A whole-file search would classify every emitter as generated output and refuse
 * every edit to the only files that can actually fix anything.
 */
export function header(absPath) {
  try {
    const fd = openSync(absPath, 'r')
    try {
      const buf = Buffer.alloc(2000)
      const n = readSync(fd, buf, 0, 2000, 0)
      return buf.subarray(0, n).toString('utf8')
    } finally {
      closeSync(fd)
    }
  } catch {
    return ''
  }
}

/**
 * Does this text carry a generator's own hands-off banner in its header?
 *
 * BOTH SIGNALS ON THE SAME LINE, which is not fussiness. Every real banner in this repository is one
 * shouted line naming the tool and forbidding the edit in the same breath. Testing the two halves
 * against the whole header instead flags any FILE THAT DISCUSSES build products: it flagged
 * scripts/assert-not-hand-edited.mjs, whose entire subject is this check.
 *
 * The two generated Markdown reports split their banner over two lines and so slip past this. They do
 * not need it -- `generatedFileRedirect` covers them by path and gives a better message anyway. This
 * function is only the catch-all for a generator nobody has told that table about.
 */
export function hasGeneratedBanner(text) {
  // Two separate patterns, applied line by line, so no line of THIS file carries both halves and
  // trips the check on itself.
  const namesATool = /\bgenerated\b/i
  const forbidsTheEdit = /do not (?:edit by hand|hand-edit)/i
  return text
    .slice(0, 2000)
    .split('\n')
    .some((line) => namesATool.test(line) && forbidsTheEdit.test(line))
}

/**
 * Is the content heuristic even worth running on this path?
 *
 * NOT ON PROSE. A document that quotes the banner in order to explain it is normal and expected,
 * and the heuristic once refused to let such a document be edited. Generated Markdown is covered by
 * `generatedFileRedirect` below, by path, with a better message than the catch-all could give. So
 * the catch-all covers code and data only.
 */
export function bannerCheckApplies(rel) {
  return !/\.(?:md|mdx|txt|rst|adoc)$/i.test(rel)
}

/* ============================================================================================= *
 * Which files a generator owns, and where a change to them actually belongs.
 * ============================================================================================= */

function redirect(rel, what, where, command) {
  return [
    `${rel} is GENERATED ${what}. A hand edit here is overwritten by the next run.`,
    '',
    `Edit instead: ${where}`,
    `Then:         ${command}`,
  ].join('\n')
}

/**
 * One row per emitter-owned path: a test over the repository-relative path, where the change
 * belongs, and the command that re-emits. Path-based rather than content-based so the message can be
 * SPECIFIC about where the change belongs; `hasGeneratedBanner` is the catch-all underneath it, for
 * a generated file this table has not been taught about yet.
 *
 * Every row goes in the same change as the emitter it names, and leaves with it: a redirect naming
 * a command that no longer exists is worse than none, because the reader runs it. A row never claims
 * a path that a different emitter owns.
 *
 * kit 1.5-5 · ADAPT: the kit's one row left with the learning loop. Add a row the day an emitter of
 * yours owns a path, and delete this line.
 */
const REDIRECTS = [
  // Empty. Its one row was the learning loop's tree, `artifacts/outcomes/`, re-emitted by
  // `npm run outcomes`, and left with the loop (`docs/decisions.md` § D-06).
]

/** `null` when nothing generates this path, otherwise the message to hand back. */
export function generatedFileRedirect(rel) {
  for (const row of REDIRECTS) {
    if (row.owns(rel)) return redirect(rel, row.what, row.where, row.command)
  }
  return null
}

/* ============================================================================================= *
 * Running an npm script without a shell.
 * ============================================================================================= */

const WINDOWS = process.platform === 'win32'
const NPM = WINDOWS ? 'npm.cmd' : 'npm'

/**
 * Run `npm run <script>` and resolve with its exit code and combined output. Never rejects.
 *
 * Windows needs a shell: since the CVE-2024-27980 fix Node refuses to `spawn` a `.cmd` file without
 * one and throws EINVAL. The whole command therefore goes through as ONE string with no argv array,
 * which is also what keeps Node's DEP0190 warning off the hook's stderr. `script` is always a literal
 * from the caller in this repository, never anything a payload supplied.
 */
export function npmRun(script, { timeoutMs = 120_000 } = {}) {
  return new Promise((done) => {
    const child = WINDOWS
      ? spawn(`${NPM} run --silent ${script}`, { cwd: ROOT, windowsHide: true, shell: true })
      : spawn(NPM, ['run', '--silent', script], { cwd: ROOT })
    let out = ''
    const take = (b) => {
      out += b.toString('utf8')
      if (out.length > 20_000) out = out.slice(-20_000)
    }
    child.stdout.on('data', take)
    child.stderr.on('data', take)
    const timer = setTimeout(() => child.kill(), timeoutMs)
    child.on('error', (e) => {
      clearTimeout(timer)
      done({ code: 127, out: `could not run \`npm run ${script}\`: ${e.message}` })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      done({ code: code ?? 1, out: out.trim() })
    })
  })
}

/** Read a file, or a fallback. */
export function readOr(absPath, fallback = '') {
  try {
    return readFileSync(absPath, 'utf8')
  } catch {
    return fallback
  }
}
