/**
 * Prompt-case texts: writes the text of each prompt a prompt review's decision cases need, at the
 * commit it is asked for, under `.scratch/prompt-case-texts/<ref>/<file>` where it is run, and prints
 * one line of JSON naming each path with a checksum. The reader agent of
 * `.claude/workflows/author-prompt-cases.js` and of `.claude/workflows/review-prompts.js` runs it; the
 * workflow re-derives the checksum, refuses a path other than `<root>/<ref>/<file>`, and sends each
 * author or answer to read its one file, so no model copies a text.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-10-04 Claude Code refused each workflow's reader its
 * command inside the prompt review's own worktree: "this command names git in a form too complex to
 * verify that it stays inside the worktree". The command was this script's logic inline, a
 * `node --no-warnings -e` string that called git through `child_process`. The authoring workflow's
 * run wf_37cd9b9e-724, in the review review-prompts-20261004-0417, stopped unread before any author
 * ran. That review and the two after it (0645 and 1705) each left unrun the group whose files have
 * stored cases, since every one of those cases would have gone unanswered, and five runs' analyses
 * stayed pending. Each reviewing session's own run of the command, once, as `CLAUDE.md` § Guards
 * allows, was refused in the same words (asdlc-openspec-jtrt). The readers now run this script, a plain
 * command that names no git. The git it runs, `show` and `merge-base` alone, runs in the directory it
 * is run from, the session's own worktree, with no `GIT_*` key, so no inherited `GIT_DIR` points it at
 * another. Were it wrong, it would let through a text written anywhere but the path it prints, a path
 * printed for a text git could not show, or an argument that climbs out of its root.
 *
 * INVOCATION. From the top of the checkout whose commits hold the prompts, as each reader runs it:
 *
 *   node scripts/prompt-case-texts.mjs <ref>:<file>...
 *       each file at its ref; prints { root, texts, fnv }
 *   node scripts/prompt-case-texts.mjs --head <commit> <file>...
 *       each file at the merge base of <commit> with origin/main, then at <commit>; prints
 *       { base, root, texts, fnv }
 *
 * Each of `texts` is { ref, file, path, bytes }, with a null path and no bytes where git could not
 * show the file at the ref. `fnv` is FNV-1a over the UTF-16 code units of the JSON of the fields
 * before it, as each workflow's `fnv` computes it. A ref or a file holding any character but letters,
 * digits, `.`, `_`, `/` and `-`, opening with `/` or `-`, or with an empty, `.` or `..` segment is
 * refused with exit 2, and so is a call with no file. A commit with no merge base exits 1.
 *
 * NEEDS git, and a checkout holding `origin/main` and every commit asked for. No network.
 * `mise run workflows:selftest` runs it in a fixture repository through both workflows, and holds the
 * command each workflow gives its reader to one plain run of it.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gitEnv } from '../tools/lib/git-env.ts'

const TRUNK = 'origin/main'
/** Where the texts go, under the directory this is run from. Each workflow refuses a root that does not end so. */
const ROOT = resolve('.scratch/prompt-case-texts')
/** A ref or a path as the workflows hand one over: nothing a shell would read, and nothing that leaves the root. */
const SAFE = /^[A-Za-z0-9._/-]+$/

/** Why `value` cannot be a ref or a file here, or null. */
function unsafe(value, what) {
  if (!SAFE.test(value) || value.startsWith('/') || value.startsWith('-')) return `${what} ${JSON.stringify(value)} must be letters, digits, \`.\`, \`_\`, \`/\` and \`-\`, opening with neither \`/\` nor \`-\``
  return value.split('/').some((s) => s === '' || s === '.' || s === '..') ? `${what} ${JSON.stringify(value)} has an empty, \`.\` or \`..\` segment` : null
}

function refuse(why) {
  console.error(`prompt-case-texts: ${why}`)
  process.exit(2)
}

/** The `[ref, file]` pairs to write, and the head when a merge base is asked for. */
function parse(argv) {
  if (argv[0] === '--head') {
    const [, head = '', ...files] = argv
    return { head, want: null, files }
  }
  const want = argv.map((arg) => {
    const at = arg.indexOf(':')
    if (at < 1) refuse(`${JSON.stringify(arg)} is not <ref>:<file>`)
    return [arg.slice(0, at), arg.slice(at + 1)]
  })
  return { head: null, want, files: want.map(([, file]) => file) }
}

const git = (args) => execFileSync('git', args, { env: gitEnv(), encoding: 'utf8', maxBuffer: 1e8, stdio: ['ignore', 'pipe', 'ignore'] })

/** One text written to its path, or a null path where git could not show it. */
function write(ref, file) {
  const path = join(ROOT, ref, file)
  try {
    const text = git(['show', `${ref}:${file}`])
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
    return { ref, file, path, bytes: Buffer.byteLength(text) }
  } catch {
    return { ref, file, path: null, bytes: 0 }
  }
}

/** FNV-1a over the UTF-16 code units of `s`, as each workflow re-derives it. */
function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

const { head, want, files } = parse(process.argv.slice(2))
if (!files.length) refuse('name at least one file')
for (const [value, what] of [...(head === null ? want.map(([ref]) => [ref, 'the ref']) : [[head, 'the head']]), ...files.map((f) => [f, 'the file'])]) {
  const why = unsafe(value, what)
  if (why) refuse(why)
}

let out
if (head === null) {
  out = { root: ROOT, texts: want.map(([ref, file]) => write(ref, file)) }
} else {
  let base
  try {
    base = git(['merge-base', TRUNK, head]).trim()
  } catch {
    console.error(`prompt-case-texts: git finds no merge base of ${head} with ${TRUNK}`)
    process.exit(1)
  }
  out = { base, root: ROOT, texts: [base, head].flatMap((ref) => files.map((file) => write(ref, file))) }
}
console.log(JSON.stringify({ ...out, fnv: fnv(JSON.stringify(out)) }))
