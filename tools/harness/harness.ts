/**
 * Harness assessment, the core. It reads only committed files and the co-change map, and writes a
 * dated report of where what the harness DECLARES (the hook jobs' globs, the CI file, the README
 * tables, the registrations) disagrees with what the code DOES (imports, reads, launches,
 * generates) and with how often pull requests change each file. The graph half,
 * `tools/harness/graph.py`, reads this report beside the local code graph. Why the two are split,
 * and why neither is a gate, is `docs/decisions.md` § D-26.
 *
 * THE FAILURE IT EXISTS TO PREVENT. A pre-push job whose glob misses one of its inputs is skipped
 * on exactly the push that changes that input, and reads green. Measured on 2026-10-02 at `2660d32`,
 * before this tool: `worktree-hooks` copies the checkout's own `.vale.ini` and `.gitignore` into a
 * fixture and its glob holds neither, and four jobs import a pinned package without the manifest or
 * the lockfile in their globs. The wrong fix came first: an untracked script read the jobs' imports
 * from the code graph alone, so it saw neither, matched globs with a hand-written approximation that
 * counted `tools/policy.json` in 20 globs where `path.matchesGlob` counts 25, and called every graph
 * stale because it took package nodes for deleted files.
 *
 * WHAT IT CHECKS. Each finding carries a stable key and a level: `finding` (the evidence is exact),
 * `lead` (a heuristic a person reads before acting) or `note` (declared, or for information).
 *
 *   - glob: every job of the hook file that has a glob, by input kind. `import`: the static imports
 *     of its entry files, transitively, scanned from the source. `package`: a pinned package those
 *     import, which puts the manifest and the lockfile in the glob. `read` (lead): a path joined
 *     onto a checkout-root constant inside a read, from literals or module constants. `launch`: the
 *     imports of a package script the closure launches by an explicit `run <script>` argument; a
 *     launcher that picks the name from data gives a lead. `generated`: a file the redirect table
 *     gives an emitter whose `:check` twin the job runs. `declared` (lead): a path the comment above
 *     the job names, a citation skipped. `dead` (note): a glob that matches no tracked file. A job
 *     of a staged-file event is held instead to cover every generated file, when its closure
 *     imports the redirect table. Matching is `path.matchesGlob`, the hook runner's own.
 *   - reach: each file a README table gives a gate kind that no registration reaches: package
 *     scripts, hook jobs, CI steps, the other workflows, the session hooks, and the `mise run`
 *     mentions in prompts, each through its imports. A kind that says it is not wired is a note.
 *   - parity: a script a pre-push job runs that no CI step runs, or the reverse, unless the CI
 *     file declares it so.
 *   - observed (lead): two code files that change together at or above the configured Jaccard
 *     index, neither a hub, where neither imports the other.
 *
 * Tables, not findings: each `CLAUDE.md` rule section and the scripts and tools that cite it; hubs,
 * each file's declaring jobs, the jobs whose imports reach it, the pull requests that changed it and
 * the globbed jobs it fires per pull request (`count-index.md` § Rates and metrics); and the direct
 * imports between changed files that never changed together.
 *
 * THE REPORT. `<reportDir>/<date>/harness.json` and `harness.md`, under the configured gitignored
 * folder. It opens with what the run read, each source by its git blob id, this file's and the
 * config's ids, and the map's baseline, and with each check's limits. It compares itself with the
 * latest earlier report by key: every item, notes included, that appeared and went, and whether this
 * file or the config changed between the two, so a moved count is not taken for a moved harness.
 *
 * REACH, FOR THE REVIEWER. The export `reach(root, rev, paths)` gives each path's row: the pre-push
 * jobs whose globs match it and those whose imports reach it, the workflow lines whose task or named
 * entry imports it, and the session hooks whose entry does, all as the commit `rev` declares them.
 * Its one consumer is `scripts/pr-review.mjs brief --local`, whose brief prints the rows as evidence
 * for the branch reviewer and decides nothing on them; the pull-request reviewer's verdict printed
 * them too until `docs/decisions.md` § D-46. `docs/decisions.md` § D-26 still holds: this reports
 * and enforces nothing. Were it wrong, it would describe the wrong tree: read from the working tree, the
 * branch under review rather than its base; and were it to import a file of the commit, as the
 * report imports the redirect table, the reviewer would run code it was asked only to read. So it
 * reads that commit's tree and blobs through git alone, and writes nothing. Its limits: a file read
 * rather than imported, or of an extension `codeExtensions` does not name, is reached by globs
 * alone, and so is a path the commit does not track, such as one the pull request adds. Its cost,
 * measured 2026-10-04 at `67f954f` through Apple's `/usr/bin/git`: three paths in a median of
 * 167 ms over five runs in one process, every blob read by one `git cat-file --batch`; a spawn per
 * blob took 1173 ms for the same call, 57 of its 59 spawns reading blobs.
 *
 * INVOCATION.
 *
 *   mise run harness                      the report for today, compared with the last one
 *   node tools/harness/harness.ts --date 2026-10-02 [--out <dir>]
 *   mise run harness:selftest             the core over fixture repositories, then the graph half
 *   reach(root, rev, paths), imported     each path's row, as the commit `rev` declares it
 *
 * `HARNESS_ROOT=<dir>` points it at a doctored copy, the top of a git checkout. It exits 0 with
 * findings, which it reports and never enforces, and 1 when an input cannot be read. `reach` throws
 * an error opening `input: ` for a rev that names no commit.
 *
 * NEEDS git, `js-yaml`, Node's `path.matchesGlob`, `scripts/lib/tasks.mjs`, through which it reads the
 * tasks from the `tasks.toml` the checkout tracks (one that tracks none is an input it cannot read),
 * and the files `tools/harness/harness.config.json` names; the map's sample from
 * `couplingMinSampleUnits` in `tools/policy/tool-settings.json`. `reach` needs the commit's objects
 * under `root` and the config as that commit holds it. No network.
 *
 * KIND: assessment; writes a local report, never a committed artifact. `reach` returns its rows and
 *   writes nothing.
 * INVARIANTS: reads committed files only, and `reach` the objects of its commit only, importing and
 *   running none of them; every list sorted by code point; one serialiser; the date is the run's
 *   argument and appears nowhere else; no randomness.
 * RE-ENTRY: a second run with the same date and inputs writes the same bytes; `reach` with the same
 *   commit and paths returns the same rows.
 * STALE WHEN: any file it read, as its blob ids say; this file or the config. A `reach` row, when its
 *   commit changes.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, matchesGlob, posix, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { tasksFrom } from '../../scripts/lib/tasks.mjs'
import { gitIn, gitOk } from '../lib/git-env.ts'
import { ROOT as REPO_ROOT } from '../lib/paths.ts'

export const CONFIG = 'tools/harness/harness.config.json'

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const sorted = (items: Iterable<string>) => [...new Set(items)].sort(byCodePoint)

/* --------------------------------------------------------------------------------- config ------- */

export type ReadmeTable = { readme: string; fileColumn: string; kindColumn: string; gateKind: string; notWired: string }

export type Config = {
  reportDir: string
  pathRootsFrom: { file: string; constant: string }
  codeExtensions: string[]
  launchHelpers: string[]
  dependencyManifest: string
  packageLockfile: string
  hookJobs: string
  prePushEvent: string
  stagedFileEvents: string[]
  ciWorkflow: string
  ciAbsentMarker: string
  ciOnlyMarker: string
  otherWorkflows: string[]
  sessionSettings: string
  promptPaths: string[]
  readmeTables: ReadmeTable[]
  generatedRedirectModule: string
  generatedRedirectExport: string
  generatedRoot: string
  liveReadRootPattern: string
  rulesFile: string
  cochangeMap: string
  cochangeSamplePolicy: { file: string; key: string }
  observedJaccardPolicy: { file: string; key: string }
  hubsTop: number
  neverChangedMinJobs: number
}

const isString = (v: unknown) => typeof v === 'string' && v !== ''
const isStrings = (v: unknown) => Array.isArray(v) && v.every(isString)
const isWhole = (min: number) => (v: unknown) => Number.isInteger(v) && (v as number) >= min
const isRegex = (v: unknown) => {
  if (!isString(v)) return false
  try {
    new RegExp(v as string)
    return true
  } catch {
    return false
  }
}

const KEYS: { [K in keyof Config]: { ok: (v: unknown) => boolean; shape: string } } = {
  reportDir: { ok: isString, shape: 'a path' },
  pathRootsFrom: { ok: (v: any) => v && isString(v.file) && isString(v.constant), shape: 'a { file, constant }' },
  codeExtensions: { ok: isStrings, shape: 'a list of extensions' },
  launchHelpers: { ok: isStrings, shape: 'a list of function names' },
  dependencyManifest: { ok: isString, shape: 'a path' },
  packageLockfile: { ok: isString, shape: 'a path' },
  hookJobs: { ok: isString, shape: 'a path' },
  prePushEvent: { ok: isString, shape: 'an event name' },
  stagedFileEvents: { ok: isStrings, shape: 'a list of event names' },
  ciWorkflow: { ok: isString, shape: 'a path' },
  ciAbsentMarker: { ok: isRegex, shape: 'a regular expression' },
  ciOnlyMarker: { ok: isRegex, shape: 'a regular expression' },
  otherWorkflows: { ok: isStrings, shape: 'a list of paths' },
  sessionSettings: { ok: isString, shape: 'a path' },
  promptPaths: { ok: isStrings, shape: 'a list of paths' },
  readmeTables: {
    ok: (v) => Array.isArray(v) && v.every((t) => t && ['readme', 'fileColumn', 'kindColumn'].every((k) => isString(t[k])) && isRegex(t.gateKind) && isRegex(t.notWired)),
    shape: 'a list of { readme, fileColumn, kindColumn, gateKind, notWired }',
  },
  generatedRedirectModule: { ok: isString, shape: 'a path' },
  generatedRedirectExport: { ok: isString, shape: 'an export name' },
  generatedRoot: { ok: isString, shape: 'a directory' },
  liveReadRootPattern: { ok: isRegex, shape: 'a regular expression' },
  rulesFile: { ok: isString, shape: 'a path' },
  cochangeMap: { ok: isString, shape: 'a path' },
  cochangeSamplePolicy: { ok: (v: any) => v && isString(v.file) && isString(v.key), shape: 'a { file, key }' },
  observedJaccardPolicy: { ok: (v: any) => v && isString(v.file) && isString(v.key), shape: 'a { file, key }' },
  hubsTop: { ok: isWhole(1), shape: 'a whole number of at least 1' },
  neverChangedMinJobs: { ok: isWhole(1), shape: 'a whole number of at least 1' },
}

/** What a self-describing record states before its data (`CLAUDE.md` § Three kinds of file). */
const PREAMBLE = ['describes', 'whyThisFileExists', 'gatedBy', 'whatItDoesNOTDo', 'provenance']

/** The config under `root`, as `parseConfig` checks it. */
export function readConfig(root: string): Config {
  let text: string
  try {
    text = readFileSync(join(root, CONFIG), 'utf8')
  } catch (error) {
    throw new Error(`config: ${CONFIG} cannot be read: ${(error as Error).message}`)
  }
  return parseConfig(text)
}

/** The config's text, refusing a preamble key, a constant, its `Means` or its shape missing. */
export function parseConfig(text: string): Config {
  let raw: any
  try {
    raw = JSON.parse(text)
  } catch (error) {
    throw new Error(`config: ${CONFIG} cannot be read: ${(error as Error).message}`)
  }
  const problems: string[] = []
  for (const key of PREAMBLE) if (!isString(raw[key])) problems.push(`\`${key}\` is missing`)
  for (const [key, { ok, shape }] of Object.entries(KEYS)) {
    if (!Object.hasOwn(raw, key)) problems.push(`\`${key}\` is missing`)
    else if (!ok(raw[key])) problems.push(`\`${key}\` is not ${shape}`)
    if (!isString(raw[`${key}Means`])) problems.push(`\`${key}Means\` is missing`)
  }
  if (problems.length > 0) throw new Error(`config: ${CONFIG}: ${problems.join('; ')}.`)
  return raw as Config
}

/* --------------------------------------------------------------------------------- source ------- */

/**
 * A source file with its comments blanked (`code`) and, at the same offsets, its string contents
 * blanked too (`blank`), so a pattern found in `blank` is never inside a string or a comment and
 * the literal it points at is read from `code`; and the span of every literal that interpolates
 * nothing, quote to quote. A template's `${...}` is code, nested templates included, tracked by a
 * stack of the braces opened inside each. Regular-expression literals are told from division by the
 * token before them, so one directly after `)`, as in `if (s) /x/.test(s)`, is read as division.
 */
export function lex(src: string): { code: string; blank: string; spans: { start: number; end: number }[] } {
  const code = src.split('')
  const blank = src.split('')
  const spans: { start: number; end: number }[] = []
  const space = (from: number, to: number, both: boolean) => {
    for (let k = from; k < to; k++) {
      if (src[k] === '\n') continue
      blank[k] = ' '
      if (both) code[k] = ' '
    }
  }
  let i = 0
  let last = ''
  const regexAfter = /[(,=:[!&|?{};+\-*%<>~^]/
  // One entry per open `${`: how many `{` opened inside it are not yet closed.
  const braces: number[] = []
  // A template's text from `from` to its closing backtick or its next `${`; returns where code
  // resumes. `opened` is the backtick's offset when the text starts the template.
  const template = (from: number, opened: number | null): number => {
    let j = from
    while (j < src.length && src[j] !== '`' && !(src[j] === '$' && src[j + 1] === '{')) j += src[j] === '\\' ? 2 : 1
    space(from, Math.min(j, src.length), false)
    if (src[j] === '$') {
      braces.push(0)
      last = '{'
      return j + 2
    }
    if (opened !== null) spans.push({ start: opened, end: j + 1 })
    last = '`'
    return j + 1
  }
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '`') {
      i = template(i + 1, i)
      continue
    }
    if (braces.length > 0 && c === '{') braces[braces.length - 1]++
    if (braces.length > 0 && c === '}') {
      if (braces[braces.length - 1] === 0) {
        braces.pop()
        i = template(i + 1, null)
        continue
      }
      braces[braces.length - 1]--
    }
    if (c === '/' && d === '/') {
      const end = src.indexOf('\n', i)
      const stop = end < 0 ? src.length : end
      space(i, stop, true)
      i = stop
      continue
    }
    if (c === '/' && d === '*') {
      const end = src.indexOf('*/', i + 2)
      const stop = end < 0 ? src.length : end + 2
      space(i, stop, true)
      i = stop
      continue
    }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < src.length && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1
      space(i + 1, Math.min(j, src.length), false)
      spans.push({ start: i, end: j + 1 })
      i = j + 1
      last = c
      continue
    }
    if (c === '/' && (last === '' || regexAfter.test(last) || /\b(?:return|typeof|case|in|of|delete|void|throw|new)\s*$/.test(src.slice(Math.max(0, i - 12), i)))) {
      let j = i + 1
      let inClass = false
      while (j < src.length && src[j] !== '\n') {
        if (src[j] === '\\') j += 2
        else if (src[j] === '[') (inClass = true), j++
        else if (src[j] === ']') (inClass = false), j++
        else if (src[j] === '/' && !inClass) break
        else j++
      }
      space(i + 1, j, false)
      i = j + 1
      last = '/'
      continue
    }
    if (!/\s/.test(c)) last = c
    i++
  }
  return { code: code.join(''), blank: blank.join(''), spans }
}

/** The literal starting at the quote `at` in `code`, or null when it interpolates. */
function literalAt(code: string, at: number): string | null {
  const q = code[at]
  if (q !== "'" && q !== '"' && q !== '`') return null
  let j = at + 1
  let out = ''
  while (j < code.length && code[j] !== q) {
    if (code[j] === '\\') {
      out += code[j + 1]
      j += 2
      continue
    }
    if (q === '`' && code[j] === '$' && code[j + 1] === '{') return null
    out += code[j++]
  }
  return out
}

/** The arguments of the call whose `(` is at `open`, as raw text, split at depth-0 commas. */
function callArgs(code: string, blank: string, open: number): string[] {
  const args: string[] = []
  let depth = 0
  let start = open + 1
  for (let j = open; j < blank.length; j++) {
    const c = blank[j]
    if (c === '(' || c === '[' || c === '{') depth++
    else if (c === ')' || c === ']' || c === '}') {
      depth--
      if (depth === 0) {
        args.push(code.slice(start, j).trim())
        return args
      }
    } else if (c === ',' && depth === 1) {
      args.push(code.slice(start, j).trim())
      start = j + 1
    }
  }
  return args
}

/** A package script a file starts: by a literal name, by a module constant, or by a name in its data. */
type Launch = { script: string; how: 'literal' | 'constant' | 'data' }

type Scan = { imports: string[]; packages: string[]; reads: string[]; launches: Launch[] }

/* --------------------------------------------------------------------------------- the repo ------ */

/** Where a run reads the tracked files: their paths, and one path's text. */
type Source = { tracked: string[]; read: (path: string) => string }

/** The files the index tracks under `root`, read from the working tree. */
function worktreeSource(root: string): Source {
  const tracked = gitIn(root)(['ls-files', '-z']).split('\u0000').filter((path) => path !== '')
  return { tracked, read: (path) => readFileSync(join(root, path), 'utf8') }
}

/**
 * The files of the commit `commit`, read from its blobs and never from the working tree: every blob
 * by one `git cat-file --batch`, since a spawn per file was most of a run's time. Each text runs from
 * its header to the next blob's, found by the id that header opens with, so no byte count is taken
 * from decoded text; a text that does not hash back to its id, such as one that is not UTF-8, is read
 * again on its own.
 */
function commitSource(root: string, commit: string): Source {
  const git = gitIn(root)
  const entries = git(['ls-tree', '-r', '-z', '--full-tree', commit])
    .split('\u0000')
    .filter((line) => line !== '')
    .map((line) => {
      const tab = line.indexOf('\t')
      const [, type, oid] = line.slice(0, tab).split(' ')
      return { path: line.slice(tab + 1), type, oid }
    })
  const blobs = entries.filter((e) => e.type === 'blob')
  const out = blobs.length === 0 ? '' : git(['cat-file', '--batch'], blobs.map((b) => `${b.oid}\n`).join(''))
  const texts = new Map<string, { oid: string; text: string }>()
  for (let n = 0, at = 0; n < blobs.length && out.startsWith(`${blobs[n].oid} blob `, at); n++) {
    const start = out.indexOf('\n', at) + 1
    const end = n + 1 < blobs.length ? out.indexOf(`\n${blobs[n + 1].oid} blob `, start) : out.length - 1
    if (start === 0 || end < start) break
    texts.set(blobs[n].path, { oid: blobs[n].oid, text: out.slice(start, end) })
    at = end + 1
  }
  return {
    tracked: entries.map((e) => e.path),
    read: (path) => {
      const blob = texts.get(path)
      return blob !== undefined && blobId(blob.text) === blob.oid ? blob.text : git(['cat-file', 'blob', `${commit}:${path}`])
    },
  }
}

/** Everything the run reads, each file once, with the blob id of what it read. */
class Repo {
  root: string
  cfg: Config
  tracked: string[]
  trackedSet: Set<string>
  dirs: Set<string>
  read = new Map<string, string>()
  pathRoots: string[]
  /** The tracked file the tasks were read from, `tasks.toml`. */
  taskManifest: string
  scripts: Record<string, string>
  dependencies: Set<string>
  scans = new Map<string, Scan>()
  closures = new Map<string, Set<string>>()
  source: Source

  /** `where` names what `source` reads, in the refusal of one with no `tasks.toml`. */
  constructor(root: string, cfg: Config, source: Source = worktreeSource(root), where: string = root) {
    this.root = root
    this.cfg = cfg
    this.source = source
    this.tracked = [...source.tracked].sort(byCodePoint)
    this.trackedSet = new Set(this.tracked)
    this.dirs = new Set()
    for (const file of this.tracked) for (let dir = posix.dirname(file); dir !== '.'; dir = posix.dirname(dir)) this.dirs.add(dir)
    this.pathRoots = this.constantList(cfg.pathRootsFrom)
    let tasks: { file: string; tasks: Record<string, string> }
    try {
      tasks = tasksFrom((path: string) => this.text(path), where)
    } catch (error) {
      throw new Error(`input: ${(error as Error).message}`)
    }
    this.taskManifest = tasks.file
    this.scripts = tasks.tasks
    const manifest = JSON.parse(this.text(cfg.dependencyManifest) ?? '{}')
    this.dependencies = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})])
  }

  /** A tracked file's text, recorded among what the run read; null when it is not tracked. */
  text(path: string): string | null {
    if (this.read.has(path)) return this.read.get(path)!
    if (!this.trackedSet.has(path)) return null
    const body = this.source.read(path)
    this.read.set(path, body)
    return body
  }

  /** The list of string literals a module constant holds, read from its source, so it has one home. */
  constantList(ref: { file: string; constant: string }): string[] {
    const text = this.text(ref.file)
    const body = text === null ? null : new RegExp(String.raw`\bconst\s+${ref.constant}\s*=\s*\[([^\]]*)\]`).exec(text)?.[1]
    const items = body === null || body === undefined ? [] : [...body.matchAll(/(['"])([^'"]+)\1/g)].map((m) => m[2])
    if (items.length === 0) throw new Error(`input: \`${ref.constant}\` in ${ref.file}, which ${CONFIG} names, is not a list of string literals.`)
    return items
  }

  isCode(path: string) {
    return this.cfg.codeExtensions.some((ext) => path.endsWith(ext))
  }

  /** What one code file imports, reads from the checkout and launches; cached. */
  scan(file: string): Scan {
    if (this.scans.has(file)) return this.scans.get(file)!
    const out: Scan = { imports: [], packages: [], reads: [], launches: [] }
    this.scans.set(file, out)
    const src = this.isCode(file) ? this.text(file) : null
    if (src === null) return out
    const { code, blank, spans } = lex(src)
    const spec = (at: number) => literalAt(code, at)
    const addImport = (s: string | null) => {
      if (s === null || s.startsWith('node:')) return
      if (s.startsWith('.')) {
        const target = posix.normalize(posix.join(posix.dirname(file), s))
        if (this.trackedSet.has(target)) out.imports.push(target)
      } else {
        const name = s.startsWith('@') ? s.split('/').slice(0, 2).join('/') : s.split('/')[0]
        if (this.dependencies.has(name)) out.packages.push(name)
      }
    }
    for (const m of blank.matchAll(/(?:^|\n)[ \t]*(?:import|export)\b[^;'"`]*?\bfrom\s*(['"])/g)) addImport(spec(m.index! + m[0].length - 1))
    for (const m of blank.matchAll(/(?:^|[;\n])\s*import\s*(['"])/g)) addImport(spec(m.index! + m[0].length - 1))
    for (const m of blank.matchAll(/\b(?:import|require)\s*\(\s*(['"`])/g)) addImport(spec(m.index! + m[0].length - 1))

    // Module constants, so `join(ROOT, POLICY_FILE)` resolves; and loops over literal lists.
    const consts = new Map<string, string>()
    for (const m of blank.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])/g)) {
      const value = spec(m.index! + m[0].length - 1)
      if (value !== null) consts.set(m[1], value)
    }
    const loops: { name: string; values: string[]; at: number }[] = []
    for (const m of blank.matchAll(/\bfor\s*\(\s*const\s+([A-Za-z_$][\w$]*)\s+of\s*\[/g)) {
      const open = m.index! + m[0].length - 1
      const items = callArgs(code.replace(/\[/g, '('), blank.replace(/\[/g, '(').replace(/\]/g, ')'), open)
      const values = items.map((item) => literalAt(item, 0))
      if (values.length > 0 && values.every((v) => v !== null)) loops.push({ name: m[1], values: values as string[], at: open })
    }
    const rootName = new RegExp(this.cfg.liveReadRootPattern)
    const argValues = (arg: string, at: number): string[] | null => {
      const literal = literalAt(arg, 0)
      if (literal !== null && literal.length === arg.length - 2) return [literal]
      if (/^[A-Za-z_$][\w$]*$/.test(arg)) {
        if (consts.has(arg)) return [consts.get(arg)!]
        const loop = loops.filter((l) => l.name === arg && l.at < at && at - l.at < 600).pop()
        if (loop) return loop.values
      }
      return null
    }
    for (const m of blank.matchAll(/\b(?:join|resolve)\s*\(/g)) {
      const open = m.index! + m[0].length - 1
      if (/(?:writeFileSync|appendFileSync|mkdirSync|rmSync)\s*\(\s*$/.test(blank.slice(Math.max(0, m.index! - 40), m.index!))) continue
      const args = callArgs(code, blank, open)
      if (args.length < 2 || !rootName.test(args[0])) continue
      let paths = ['']
      for (const arg of args.slice(1)) {
        const values = argValues(arg, open)
        if (values === null) {
          paths = []
          break
        }
        paths = paths.flatMap((p) => values.map((v) => (p === '' ? v : `${p}/${v}`)))
      }
      for (const raw of paths) {
        const path = posix.normalize(raw).replace(/^\.\//, '').replace(/\/$/, '')
        if (this.trackedSet.has(path)) out.reads.push(path)
        else if (this.dirs.has(path)) out.reads.push(`${path}/**`)
      }
    }

    // Launches: `run` or `--run` as the first element of an argv array, then the script, a literal
    // or a module constant, `--silent`, `--quiet` or `-q` passed over; and in a file that launches,
    // every literal that is a script's name. The literals in order, from the lexer's spans.
    const strings = spans.map(({ start, end }) => ({ value: literalAt(code, start), start, end }))
    const after = (end: number) => /^\s*,\s*(?:(['"])|([A-Za-z_$][\w$]*))/.exec(blank.slice(end, end + 200))
    const argAfter = (k: number): { value: string; how: 'literal' | 'constant'; k: number } | null => {
      const m = after(strings[k].end)
      if (m?.[1] && k + 1 < strings.length && strings[k + 1].value !== null) return { value: strings[k + 1].value!, how: 'literal', k: k + 1 }
      if (m?.[2] && consts.has(m[2])) return { value: consts.get(m[2])!, how: 'constant', k }
      return null
    }
    const how = new Map<string, Launch['how']>()
    let argv = false
    for (let k = 0; k < strings.length; k++) {
      if ((strings[k].value !== 'run' && strings[k].value !== '--run') || !/\[\s*$/.test(blank.slice(Math.max(0, strings[k].start - 40), strings[k].start))) continue
      argv = true
      let next = argAfter(k)
      if (next !== null && ['--silent', '--quiet', '-q'].includes(next.value) && next.how === 'literal') next = argAfter(next.k)
      if (next && Object.hasOwn(this.scripts, next.value)) how.set(next.value, next.how)
    }
    const helper = this.cfg.launchHelpers.length > 0 && new RegExp(String.raw`\b(?:${this.cfg.launchHelpers.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\s*\(`).test(blank)
    if (argv || helper) {
      for (const { value } of strings) if (value !== null && Object.hasOwn(this.scripts, value) && !how.has(value)) how.set(value, 'data')
    }
    out.launches = [...how].map(([script, h]) => ({ script, how: h })).sort((a, b) => byCodePoint(a.script, b.script))
    for (const key of ['imports', 'packages', 'reads'] as const) out[key] = sorted(out[key])
    return out
  }

  /** The files `entry` reaches by static imports, itself included. */
  closure(entry: string): Set<string> {
    if (this.closures.has(entry)) return this.closures.get(entry)!
    const seen = new Set([entry])
    const stack = [entry]
    while (stack.length > 0) for (const next of this.scan(stack.pop()!).imports) if (!seen.has(next)) seen.add(next), stack.push(next)
    this.closures.set(entry, seen)
    return seen
  }

  /** The repository paths a command names under the path roots, code files only. */
  pathsIn(command: string): string[] {
    const roots = this.pathRoots.map((r) => r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
    const re = new RegExp(String.raw`(?:^|[\s"'=/])((?:${roots})/[\w./-]+)`, 'g')
    return sorted([...command.matchAll(re)].map((m) => m[1].replace(/[.,;:]+$/, '')).filter((p) => this.trackedSet.has(p)))
  }

  /**
   * The tasks a command runs: through `mise run`, or through `npm run` or `node --run`, which
   * `check:jobs` refuses for a task of `tasks.toml` but which are read here, so such a launch is wired.
   */
  scriptsIn(command: string): string[] {
    return sorted([...command.matchAll(/\b(?:(?:npm run|node --run) (?:--silent )?|mise run (?:-q |--quiet )?)([A-Za-z0-9][\w:.-]*)/g)].map((m) => m[1]).filter((s) => Object.hasOwn(this.scripts, s)))
  }

  /** The entry files of a package script, through the scripts it runs in turn. */
  entriesOf(script: string, seen = new Set<string>()): string[] {
    if (seen.has(script) || !Object.hasOwn(this.scripts, script)) return []
    seen.add(script)
    const command = this.scripts[script]
    return sorted([...this.pathsIn(command).filter((p) => this.isCode(p)), ...this.scriptsIn(command).flatMap((s) => this.entriesOf(s, seen))])
  }

  covers(globs: string[], item: string): boolean {
    if (item.endsWith('/**')) {
      const dir = item.slice(0, -3)
      return this.tracked.some((f) => f.startsWith(`${dir}/`) && globs.some((g) => matchesGlob(f, g)))
    }
    return globs.some((g) => matchesGlob(item, g))
  }
}

/* --------------------------------------------------------------------------------- jobs --------- */

export type Job = { event: string; name: string; run: string; globs: string[] | null; comment: string }

/** The hook file's jobs, groups flattened, each with the comment block above its `- name:` line. */
function readJobs(repo: Repo): Job[] {
  const text = repo.text(repo.cfg.hookJobs)
  if (text === null) throw new Error(`input: ${repo.cfg.hookJobs} is not tracked.`)
  const parsed = yamlLoad(text) as Record<string, any>
  const comments = new Map<string, string>()
  let event = ''
  const lines = text.split('\n')
  lines.forEach((line, n) => {
    const top = /^([A-Za-z][\w-]*):\s*$/.exec(line)
    if (top) event = top[1]
    const named = /^\s*- name: (\S+)/.exec(line)
    if (!named) return
    const block: string[] = []
    for (let k = n - 1; k >= 0 && /^\s*#/.test(lines[k]); k--) block.unshift(lines[k].replace(/^\s*#\s?/, ''))
    comments.set(`${event}/${named[1]}`, block.join(' '))
  })
  const jobs: Job[] = []
  const walk = (ev: string, list: any[]) => {
    for (const job of list ?? []) {
      if (job?.group) walk(ev, job.group.jobs)
      else if (job?.name) {
        const globs = job.glob === undefined ? null : ([] as string[]).concat(job.glob)
        jobs.push({ event: ev, name: job.name, run: String(job.run ?? ''), globs, comment: comments.get(`${ev}/${job.name}`) ?? '' })
      }
    }
  }
  for (const [ev, block] of Object.entries(parsed ?? {})) if (block && typeof block === 'object' && Array.isArray(block.jobs)) walk(ev, block.jobs)
  return jobs
}

/** The entry files a job's `run` reaches: package scripts it runs, and code paths it names. */
function jobEntries(repo: Repo, job: Job): string[] {
  return sorted([...repo.pathsIn(job.run).filter((p) => repo.isCode(p)), ...repo.scriptsIn(job.run).flatMap((s) => repo.entriesOf(s))])
}

/* --------------------------------------------------------------------------------- findings ----- */

export type Level = 'finding' | 'lead' | 'note'
export type Finding = { key: string; check: string; level: Level; subject: string; item: string; reason: string }

/** Each check's limits, stated in every report so a reader knows what the run could not see. */
export const LIMITS: Record<string, string> = {
  'glob/import': 'Static import specifiers only, relative ones resolved and bare ones counted as packages when the manifest declares them; a computed specifier is not followed. The source is read by a lexer, not a parser: a regular expression directly after `)`, as in `if (s) /x/.test(s)`, is read as division, and a quote inside it can hide what follows on that line.',
  'glob/package': 'A package import puts the manifest and the lockfile in the glob, as the hook file\'s job comments state for each job that pins one.',
  'glob/read': 'A path joined onto a checkout-root constant, from literals, module constants or a loop over a literal list. A path built at runtime or read through a parameter is missed; a read made only in a mode the job does not run is over-reported. A directory read counts as covered when the glob reaches any file under it, since a literal naming a directory does not say which of its files are read. A lead.',
  'glob/launch': '`run` or `--run` first in an argv array, then the script by name or by a module constant, is followed into that script\'s imports; in a file that launches, any literal that is a script\'s name is too. Every launch is a lead: a process may run the script from a fixture\'s copy, which no pattern can tell. A command spelled in a message is not a launch.',
  'glob/generated': 'Only the check twin of an emitter the redirect table names; a selftest of the emitter runs over fixtures and is not held to it.',
  'glob/declared': 'Backticked paths in the comment above the job, a citation (`x` § Heading, the header of `x`, a parenthesised path) skipped; a directory it names counts as covered when the glob reaches any file under it, as for a read. A lead.',
  'glob/dead': 'A glob that matches no tracked file today: stale, or kept for a file that does not exist yet. A note.',
  reach: 'Gate kinds come from the README tables the config names; a directory row is reached when any file under it is. Whether a script has a job is `check:jobs`\'s, not this.',
  parity: 'Scripts run by pre-push jobs against scripts run by CI steps; the CI file\'s absent block and its per-step marker are the declared exceptions.',
  observed: 'Code-to-code pairs only, from the map\'s counted pull requests through its baseline; a file newer than the baseline has no edges.',
  hubs: 'A file\'s share is over the map\'s counted pull requests, written only at or above the map\'s sample; a file newer than the baseline has no share.',
}

const keyOf = (...parts: string[]) => parts.join('|')

/* --------------------------------------------------------------------------------- checks ------- */

type RedirectRow = { path: string; script: string }

/** Every tracked path under the generated root that the redirect table assigns, and its script. */
async function redirects(repo: Repo): Promise<RedirectRow[]> {
  const module = join(repo.root, repo.cfg.generatedRedirectModule)
  if (!existsSync(module)) return []
  repo.text(repo.cfg.generatedRedirectModule)
  const loaded = await import(pathToFileURL(module).href)
  const fn = loaded[repo.cfg.generatedRedirectExport]
  if (typeof fn !== 'function') throw new Error(`input: ${repo.cfg.generatedRedirectModule} exports no function \`${repo.cfg.generatedRedirectExport}\`.`)
  const rows: RedirectRow[] = []
  for (const path of repo.tracked.filter((p) => p.startsWith(`${repo.cfg.generatedRoot}/`))) {
    const message = fn(path)
    const script = typeof message === 'string' ? /\b(?:npm|mise) run ([A-Za-z0-9][\w:.-]*)/.exec(message)?.[1] : undefined
    if (script) rows.push({ path, script })
  }
  return rows
}

/** The emitter base a script names: `trace` for `trace`, `trace:update` and `trace:check`. */
const baseOf = (script: string) => script.replace(/:(?:update|check)$/, '')

function checkGlobs(repo: Repo, jobs: Job[], rows: RedirectRow[], findings: Finding[]) {
  const add = (job: Job, kind: string, item: string, level: Level, reason: string) =>
    findings.push({ key: keyOf('glob', `${job.event}/${job.name}`, kind, item), check: `glob/${kind}`, level, subject: `${job.event}/${job.name}`, item, reason })
  const redirectModule = repo.cfg.generatedRedirectModule
  for (const job of jobs) {
    if (job.globs === null) continue
    const globs = job.globs
    for (const glob of globs) if (!repo.tracked.some((f) => matchesGlob(f, glob))) add(job, 'dead', glob, 'note', `\`${glob}\` matches no tracked file.`)
    const entries = jobEntries(repo, job)
    const closure = new Set(entries.flatMap((e) => [...repo.closure(e)]))
    if (repo.cfg.stagedFileEvents.includes(job.event)) {
      if (closure.has(redirectModule)) {
        for (const row of rows) if (!repo.covers(globs, row.path)) add(job, 'generated', row.path, 'finding', `its closure imports \`${redirectModule}\`, which assigns \`${row.path}\` to \`mise run ${row.script}\`, and a staged change to it would not run the job.`)
      }
      continue
    }
    const inGlob = (path: string) => repo.covers(globs, path)
    for (const file of sorted(closure)) if (!inGlob(file)) add(job, 'import', file, 'finding', `imported by ${entries.map((e) => `\`${e}\``).join(', ')}, transitively.`)
    const packages = sorted([...closure].flatMap((f) => repo.scan(f).packages))
    if (packages.length > 0) {
      for (const pin of [repo.cfg.dependencyManifest, repo.cfg.packageLockfile]) if (!inGlob(pin)) add(job, 'package', pin, 'finding', `its closure imports ${packages.map((p) => `\`${p}\``).join(', ')}, which \`${pin}\` pins.`)
    }
    for (const read of sorted([...closure].flatMap((f) => repo.scan(f).reads))) {
      if (!inGlob(read)) {
        const by = sorted([...closure].filter((f) => repo.scan(f).reads.includes(read)))
        add(job, 'read', read, 'lead', `joined onto a checkout root and read in ${by.map((f) => `\`${f}\``).join(', ')}.`)
      }
    }
    // The strongest evidence of each launch wins: a literal over a constant over data.
    const rank = { literal: 0, constant: 1, data: 2 }
    const launched = new Map<string, Launch['how']>()
    for (const file of closure) for (const { script, how } of repo.scan(file).launches) if (!launched.has(script) || rank[how] < rank[launched.get(script)!]) launched.set(script, how)
    const said = { literal: 'by name', constant: 'by a name a module constant holds', data: 'by a name it takes from data' }
    for (const [script, how] of [...launched].sort(([a], [b]) => byCodePoint(a, b))) {
      for (const entry of repo.entriesOf(script)) {
        for (const file of sorted(repo.closure(entry))) {
          if (closure.has(file) || inGlob(file)) continue
          add(job, 'launch', file, 'lead', `the closure launches \`${script}\`, ${said[how]}, which reaches \`${file}\`; where that runs from a fixture's copy, it is not an input.`)
        }
      }
    }
    for (const script of repo.scriptsIn(job.run)) {
      if (!script.endsWith(':check')) continue
      for (const row of rows) {
        if (baseOf(row.script) !== baseOf(script)) continue
        if (!inGlob(row.path)) add(job, 'generated', row.path, 'finding', `it runs \`${script}\`, the check twin of the emitter that writes \`${row.path}\` (\`mise run ${row.script}\`).`)
      }
    }
    for (const declared of declaredIn(repo, job.comment)) {
      if (!inGlob(declared)) add(job, 'declared', declared, 'lead', 'the comment above the job names it among what the job reads.')
    }
  }
}

/** Backticked tracked paths in a job's comment, citations skipped. */
function declaredIn(repo: Repo, comment: string): string[] {
  const out: string[] = []
  for (const m of comment.matchAll(/`([^`]+)`/g)) {
    const after = comment.slice(m.index! + m[0].length, m.index! + m[0].length + 3)
    const before = comment.slice(Math.max(0, m.index! - 14), m.index!)
    if (/^\s*§/.test(after) || /header of\s*$/.test(before) || (/\($/.test(before) && /^\)/.test(after))) continue
    const token = m[1].replace(/\/\*\*$/, '').replace(/\/$/, '')
    if (repo.trackedSet.has(token)) out.push(token)
    else if (repo.dirs.has(token)) out.push(`${token}/**`)
  }
  return sorted(out)
}

type Wire = { from: string; to: string; relation: string; declaredIn: string; detail?: string }

/** Every registration: who runs which entry, and the declared wiring the graph half overlays. */
function registrations(repo: Repo, jobs: Job[], rows: RedirectRow[]): { entries: Set<string>; wiring: Wire[]; promptScripts: Map<string, string[]> } {
  const entries = new Set<string>()
  const wiring: Wire[] = []
  for (const [script, command] of Object.entries(repo.scripts)) {
    for (const path of repo.pathsIn(command)) {
      wiring.push({ from: `script:${script}`, to: `file:${path}`, relation: 'invokes', declaredIn: repo.taskManifest })
      if (repo.isCode(path)) entries.add(path)
    }
  }
  for (const job of jobs) {
    const id = `job:${job.event}/${job.name}`
    wiring.push({ from: `file:${repo.cfg.hookJobs}`, to: id, relation: 'declares_job', declaredIn: repo.cfg.hookJobs })
    for (const script of repo.scriptsIn(job.run)) wiring.push({ from: id, to: `script:${script}`, relation: 'runs', declaredIn: repo.cfg.hookJobs })
    for (const path of repo.pathsIn(job.run)) {
      wiring.push({ from: id, to: `file:${path}`, relation: 'runs', declaredIn: repo.cfg.hookJobs })
      if (repo.isCode(path)) entries.add(path)
    }
    for (const glob of job.globs ?? []) for (const file of repo.tracked) if (matchesGlob(file, glob)) wiring.push({ from: id, to: `file:${file}`, relation: 'declares_input', declaredIn: repo.cfg.hookJobs, detail: glob })
  }
  for (const workflow of [repo.cfg.ciWorkflow, ...repo.cfg.otherWorkflows]) {
    const text = repo.text(workflow)
    if (text === null) continue
    for (const line of text.split('\n').filter((l) => !/^\s*#/.test(l))) {
      for (const script of repo.scriptsIn(line)) wiring.push({ from: `file:${workflow}`, to: `script:${script}`, relation: 'runs', declaredIn: workflow })
      for (const path of repo.pathsIn(line)) {
        wiring.push({ from: `file:${workflow}`, to: `file:${path}`, relation: 'runs', declaredIn: workflow })
        if (repo.isCode(path)) entries.add(path)
      }
    }
  }
  const settings = repo.text(repo.cfg.sessionSettings)
  if (settings !== null) {
    const hooks = JSON.parse(settings).hooks ?? {}
    for (const [event, blocks] of Object.entries(hooks) as [string, any[]][]) {
      for (const block of blocks) {
        for (const hook of block.hooks ?? []) {
          for (const path of repo.pathsIn(String(hook.command ?? ''))) {
            wiring.push({ from: `file:${repo.cfg.sessionSettings}`, to: `file:${path}`, relation: 'registers_hook', declaredIn: repo.cfg.sessionSettings, detail: `${event}${block.matcher ? ` ${block.matcher}` : ''}` })
            if (repo.isCode(path)) entries.add(path)
          }
        }
      }
    }
  }
  const promptScripts = new Map<string, string[]>()
  const prompts = repo.tracked.filter((f) => repo.cfg.promptPaths.some((p) => f === p || f.startsWith(`${p}/`)))
  for (const prompt of prompts) {
    const text = repo.text(prompt) ?? ''
    for (const script of repo.scriptsIn(text)) {
      wiring.push({ from: `file:${prompt}`, to: `script:${script}`, relation: 'names_script', declaredIn: prompt })
      promptScripts.set(script, sorted([...(promptScripts.get(script) ?? []), prompt]))
    }
    for (const path of repo.pathsIn(text).filter((p) => repo.isCode(p) && new RegExp(String.raw`\bnode\s+${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(text))) entries.add(path)
  }
  for (const row of rows) wiring.push({ from: `script:${row.script}`, to: `file:${row.path}`, relation: 'generates', declaredIn: repo.cfg.generatedRedirectModule })
  const unique = new Map(wiring.map((w) => [JSON.stringify(w), w]))
  return { entries, wiring: [...unique.values()].sort((a, b) => byCodePoint(JSON.stringify(a), JSON.stringify(b))), promptScripts }
}

type Row = { readme: string; path: string; kind: string; gate: boolean; notWired: boolean }

/** The rows of each configured README table, paths made repository-relative. */
function readmeRows(repo: Repo): Row[] {
  const rows: Row[] = []
  for (const table of repo.cfg.readmeTables) {
    const text = repo.text(table.readme)
    if (text === null) continue
    const lines = text.split('\n').filter((l) => /^\|/.test(l))
    const cells = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
    const head = lines.findIndex((l) => cells(l).includes(table.fileColumn) && cells(l).includes(table.kindColumn))
    if (head < 0) continue
    const fileAt = cells(lines[head]).indexOf(table.fileColumn)
    const kindAt = cells(lines[head]).indexOf(table.kindColumn)
    for (const line of lines.slice(head + 2)) {
      const row = cells(line)
      const name = /`([^`]+)`/.exec(row[fileAt] ?? '')?.[1]
      if (!name) continue
      const path = posix.join(posix.dirname(table.readme), name).replace(/\/$/, '')
      const kind = (row[kindAt] ?? '').replace(/`/g, '')
      rows.push({ readme: table.readme, path, kind, gate: new RegExp(table.gateKind, 'i').test(kind), notWired: new RegExp(table.notWired, 'i').test(kind) })
    }
  }
  return rows
}

function checkReach(repo: Repo, entries: Set<string>, findings: Finding[]) {
  const reached = new Set<string>()
  for (const entry of entries) for (const file of repo.closure(entry)) reached.add(file)
  for (const row of readmeRows(repo)) {
    if (!row.gate) continue
    const isDir = repo.dirs.has(row.path)
    const hit = isDir ? repo.tracked.some((f) => f.startsWith(`${row.path}/`) && reached.has(f)) : reached.has(row.path)
    if (hit) continue
    const level: Level = row.notWired ? 'note' : 'finding'
    const why = row.notWired ? `its row in \`${row.readme}\` says so: "${row.kind}".` : `its row in \`${row.readme}\` gives it the kind "${row.kind}", and no package script, job, workflow, session hook or prompt reaches it.`
    findings.push({ key: keyOf('reach', row.path), check: 'reach', level, subject: row.path, item: row.path, reason: why })
  }
}

function checkParity(repo: Repo, jobs: Job[], findings: Finding[]) {
  const prePush = new Set(jobs.filter((j) => j.event === repo.cfg.prePushEvent).flatMap((j) => repo.scriptsIn(j.run)))
  const text = repo.text(repo.cfg.ciWorkflow) ?? ''
  const lines = text.split('\n')
  const ci = new Set<string>()
  const ciOnlyDeclared = new Set<string>()
  const absent = new Set<string>()
  const onlyMarker = new RegExp(repo.cfg.ciOnlyMarker, 'i')
  const absentMarker = new RegExp(repo.cfg.ciAbsentMarker)
  lines.forEach((line, n) => {
    if (/^\s*#/.test(line)) {
      if (absentMarker.test(line)) {
        for (let k = n + 1; k < lines.length && /^\s*#/.test(lines[k]) && lines[k].trim() !== '#'; k++) {
          for (const m of lines[k].matchAll(/`([^`]+)`/g)) if (Object.hasOwn(repo.scripts, m[1])) absent.add(m[1])
        }
      }
      return
    }
    const scripts = repo.scriptsIn(line)
    if (scripts.length === 0) return
    const block: string[] = []
    for (let k = n - 1; k >= 0 && (/^\s*#/.test(lines[k]) || /^\s*- name:/.test(lines[k])); k--) if (/^\s*#/.test(lines[k])) block.unshift(lines[k])
    for (const script of scripts) {
      ci.add(script)
      if (onlyMarker.test(block.join(' '))) ciOnlyDeclared.add(script)
    }
  })
  for (const script of sorted(prePush)) {
    if (ci.has(script)) continue
    const declared = absent.has(script)
    findings.push({
      key: keyOf('parity', 'pre-push-only', script),
      check: 'parity',
      level: declared ? 'note' : 'finding',
      subject: script,
      item: 'pre-push only',
      reason: declared ? `named in the absent block of \`${repo.cfg.ciWorkflow}\`.` : `a pre-push job runs it, no step of \`${repo.cfg.ciWorkflow}\` does, and its absent block does not name it.`,
    })
  }
  for (const script of sorted(ci)) {
    if (prePush.has(script)) continue
    const declared = ciOnlyDeclared.has(script)
    findings.push({
      key: keyOf('parity', 'ci-only', script),
      check: 'parity',
      level: declared ? 'note' : 'finding',
      subject: script,
      item: 'CI only',
      reason: declared ? `the comment above its step says so.` : `a step of \`${repo.cfg.ciWorkflow}\` runs it, no pre-push job does, and the comment above its step does not say why.`,
    })
  }
}

type CoChange = { throughCommit: string; counted: number; files: { path: string; changes: number; hub: boolean | null }[]; edges: { a: string; b: string; together: number; jaccardPermille: number | null }[]; clusters: { id: string; files: string[] }[] | null }

function readMap(repo: Repo): CoChange | null {
  const text = repo.text(repo.cfg.cochangeMap)
  return text === null ? null : (JSON.parse(text) as CoChange)
}

/** A whole number another policy file holds, so the value has one home; refuses one that is not there. */
function policyNumber(repo: Repo, ref: { file: string; key: string }): number {
  const text = repo.text(ref.file)
  const value = text === null ? undefined : JSON.parse(text)[ref.key]
  if (!Number.isInteger(value)) throw new Error(`input: \`${ref.key}\` in ${ref.file}, which ${CONFIG} names, is not a whole number.`)
  return value
}

function checkObserved(repo: Repo, map: CoChange | null, findings: Finding[]): { stableImports: { a: string; b: string }[] } {
  if (map === null) return { stableImports: [] }
  const threshold = policyNumber(repo, repo.cfg.observedJaccardPolicy)
  const hubs = new Set(map.files.filter((f) => f.hub).map((f) => f.path))
  const changed = new Set(map.files.map((f) => f.path))
  for (const edge of map.edges) {
    if ((edge.jaccardPermille ?? 0) < threshold || hubs.has(edge.a) || hubs.has(edge.b)) continue
    if (!repo.isCode(edge.a) || !repo.isCode(edge.b) || !repo.trackedSet.has(edge.a) || !repo.trackedSet.has(edge.b)) continue
    if (repo.closure(edge.a).has(edge.b) || repo.closure(edge.b).has(edge.a)) continue
    findings.push({
      key: keyOf('observed', edge.a, edge.b),
      check: 'observed',
      level: 'lead',
      subject: edge.a,
      item: edge.b,
      reason: `changed together in ${edge.together} counted pull requests (Jaccard ${edge.jaccardPermille}/1000), and neither imports the other.`,
    })
  }
  const pairs = new Set(map.edges.map((e) => `${e.a}\u0000${e.b}`))
  const stable: { a: string; b: string }[] = []
  for (const file of repo.tracked.filter((f) => repo.isCode(f) && changed.has(f))) {
    for (const target of repo.scan(file).imports) {
      if (!changed.has(target)) continue
      const [a, b] = [file, target].sort(byCodePoint)
      if (!pairs.has(`${a}\u0000${b}`)) stable.push({ a: file, b: target })
    }
  }
  return { stableImports: stable.sort((x, y) => byCodePoint(`${x.a} ${x.b}`, `${y.a} ${y.b}`)) }
}

type Hub = { path: string; declaredJobs: number; importJobs: number; changes: number | null; firesPerHundredPrs: number | null }

function hubs(repo: Repo, jobs: Job[], map: CoChange | null): { rows: Hub[]; neverChanged: string[]; sampled: boolean } {
  const prePush = jobs.filter((j) => j.event === repo.cfg.prePushEvent && j.globs !== null)
  const closures = prePush.map((job) => new Set(jobEntries(repo, job).flatMap((e) => [...repo.closure(e)])))
  const changes = new Map((map?.files ?? []).map((f) => [f.path, f.changes]))
  const sampled = map !== null && map.counted >= policyNumber(repo, repo.cfg.cochangeSamplePolicy)
  const rows: Hub[] = []
  for (const path of repo.tracked) {
    const declaredJobs = prePush.filter((job) => job.globs!.some((g) => matchesGlob(path, g))).length
    const importJobs = closures.filter((c) => c.has(path)).length
    const changed = changes.get(path) ?? null
    if (declaredJobs === 0 && changed === null) continue
    // Globbed jobs this file fires per hundred pull requests, rounded half up: a whole number.
    const fires = sampled && changed !== null ? Math.floor((200 * declaredJobs * changed + map!.counted) / (2 * map!.counted)) : null
    rows.push({ path, declaredJobs, importJobs, changes: changed, firesPerHundredPrs: fires })
  }
  const git = gitIn(repo.root)
  const neverChanged = map === null ? [] : rows.filter((r) => r.declaredJobs >= repo.cfg.neverChangedMinJobs && r.changes === null && gitOk(git, ['cat-file', '-e', `${map.throughCommit}:${r.path}`])).map((r) => r.path)
  return { rows, neverChanged, sampled }
}

function pairing(repo: Repo): { section: string; citedBy: string[] }[] {
  const text = repo.text(repo.cfg.rulesFile) ?? ''
  const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim())
  const bodies = repo.tracked
    .filter((f) => repo.pathRoots.some((r) => f.startsWith(`${r}/`)) && repo.isCode(f))
    .map((f) => [f, (repo.text(f) ?? '').replace(/`/g, '')] as const)
  return heads.map((head) => {
    const plain = head.replace(/`/g, '')
    const cite = new RegExp(`§\\s*${plain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i')
    return { section: plain, citedBy: sorted(bodies.filter(([, body]) => cite.test(body)).map(([f]) => f)) }
  })
}

/* --------------------------------------------------------------------------------- reach -------- */

/** What runs one path at a commit: jobs by `<event>/<name>`, steps and hooks by where each is declared. */
export type ReachRow = { path: string; globJobs: string[]; importJobs: string[]; steps: string[]; hooks: string[] }

/** The full id of the commit `rev` names in `root`; refuses a rev that names none. */
function commitOf(root: string, rev: string): string {
  if (rev === '' || rev.startsWith('-')) throw new Error(`input: \`${rev}\` names no commit in ${root}.`)
  try {
    return gitIn(root)(['rev-parse', '--verify', `${rev}^{commit}`]).trim()
  } catch (error) {
    const message = (error as Error).message
    if (message.startsWith('git could not start')) throw error
    throw new Error(`input: \`${rev}\` names no commit in ${root}: ${message}`)
  }
}

/**
 * For each of `paths`, the pre-push jobs whose globs match it and whose imports reach it, the
 * workflow steps and the session hooks whose entries import it, all as the commit `rev` declares
 * them: its tree and blobs alone, through git, so neither the working tree nor a file of the
 * repository is read, imported or run. A path the commit does not track is matched by globs alone.
 */
export function reach(root: string, rev: string, paths: string[]): { rev: string; rows: ReachRow[] } {
  const commit = commitOf(root, rev)
  const source = commitSource(root, commit)
  if (!source.tracked.includes(CONFIG)) throw new Error(`config: ${CONFIG} cannot be read: it is not tracked at ${commit}.`)
  const cfg = parseConfig(source.read(CONFIG))
  const repo = new Repo(root, cfg, source, `the commit ${commit.slice(0, 7)}`)
  const importsOf = (entries: string[]) => new Set(entries.flatMap((entry) => [...repo.closure(entry)]))
  const jobs = readJobs(repo)
    .filter((job) => job.event === cfg.prePushEvent)
    .map((job) => ({ name: `${job.event}/${job.name}`, globs: job.globs, imports: importsOf(jobEntries(repo, job)) }))
  // Each workflow line and session hook that runs code, as a row names it, with what its entries import.
  const runners: { kind: 'steps' | 'hooks'; label: string; imports: Set<string> }[] = []
  for (const workflow of [cfg.ciWorkflow, ...cfg.otherWorkflows]) {
    for (const line of (repo.text(workflow) ?? '').split('\n').filter((l) => !/^\s*#/.test(l))) {
      for (const task of repo.scriptsIn(line)) runners.push({ kind: 'steps', label: `${workflow}: mise run ${task}`, imports: importsOf(repo.entriesOf(task)) })
      for (const entry of repo.pathsIn(line).filter((p) => repo.isCode(p))) runners.push({ kind: 'steps', label: `${workflow}: ${entry}`, imports: repo.closure(entry) })
    }
  }
  const settings = repo.text(cfg.sessionSettings)
  for (const [event, blocks] of Object.entries(settings === null ? {} : (JSON.parse(settings).hooks ?? {})) as [string, any[]][]) {
    for (const block of blocks) {
      for (const hook of block.hooks ?? []) {
        for (const entry of repo.pathsIn(String(hook.command ?? '')).filter((p) => repo.isCode(p))) {
          runners.push({ kind: 'hooks', label: `${event}${block.matcher ? ` ${block.matcher}` : ''}: ${entry}`, imports: repo.closure(entry) })
        }
      }
    }
  }
  const rows = sorted(paths).map((path) => {
    // A path new at the head is in no closure at the base; said here rather than left to follow.
    const tracked = repo.trackedSet.has(path)
    const by = (kind: 'steps' | 'hooks') => sorted(tracked ? runners.filter((r) => r.kind === kind && r.imports.has(path)).map((r) => r.label) : [])
    return {
      path,
      globJobs: sorted(jobs.filter((job) => job.globs !== null && job.globs.some((g) => matchesGlob(path, g))).map((job) => job.name)),
      importJobs: sorted(tracked ? jobs.filter((job) => job.imports.has(path)).map((job) => job.name) : []),
      steps: by('steps'),
      hooks: by('hooks'),
    }
  })
  return { rev: commit, rows }
}

/* --------------------------------------------------------------------------------- report ------- */

/** Git's blob id of a text, the id `git hash-object` gives the file. */
export function blobId(text: string): string {
  const bytes = Buffer.from(text, 'utf8')
  return createHash('sha1').update(`blob ${bytes.length}\u0000`).update(bytes).digest('hex')
}

export type Report = {
  _: string[]
  date: string
  read: { script: string; config: string; tasks: string; cochangeThrough: string | null; sources: { path: string; blob: string }[] }
  limits: Record<string, string>
  summary: Record<string, number>
  findings: Finding[]
  tables: { pairing: { section: string; citedBy: string[] }[]; hubs: Hub[]; neverChanged: string[]; stableImports: { a: string; b: string }[]; promptScripts: { script: string; prompts: string[] }[] }
  wiring: Wire[]
  comparison: { previous: string | null; appeared: string[]; went: string[]; scriptChanged: boolean | null; configChanged: boolean | null }
}

const BANNER = [
  'Written by `mise run harness` (tools/harness/harness.ts): a local assessment, never committed. Each finding has a stable key and a level: finding, lead or note.',
  'read: what the run read, each file by its git blob id, and the file the tasks came from. limits: what each check cannot see. comparison: what changed since the latest earlier report, by key.',
]

/** Assess the checkout under `root` for `date`; `previous` is the latest earlier report, if any. */
export async function assess(root: string, date: string, previous: Report | null = null): Promise<Report> {
  const cfg = readConfig(root)
  const repo = new Repo(root, cfg)
  const configText = readFileSync(join(root, CONFIG), 'utf8')
  // The script that ran, not a copy under `root`: a change to it is what the comparison names.
  const scriptText = readFileSync(fileURLToPath(import.meta.url), 'utf8')
  const jobs = readJobs(repo)
  const rows = await redirects(repo)
  const findings: Finding[] = []
  checkGlobs(repo, jobs, rows, findings)
  const { entries, wiring, promptScripts } = registrations(repo, jobs, rows)
  checkReach(repo, entries, findings)
  checkParity(repo, jobs, findings)
  const map = readMap(repo)
  const { stableImports } = checkObserved(repo, map, findings)
  const hub = hubs(repo, jobs, map)
  // Before `read` is built below, so every file the table reads is among the sources it names.
  const pairs = pairing(repo)
  findings.sort((a, b) => byCodePoint(a.key, b.key))
  const unique = findings.filter((f, n) => n === 0 || findings[n - 1].key !== f.key)
  const count = (level: Level) => unique.filter((f) => f.level === level).length
  const summary: Record<string, number> = {
    jobs: jobs.length,
    jobsWithGlob: jobs.filter((j) => j.globs !== null).length,
    findings: count('finding'),
    leads: count('lead'),
    notes: count('note'),
  }
  for (const f of unique) summary[`${f.level}:${f.check}`] = (summary[`${f.level}:${f.check}`] ?? 0) + 1
  // Every item, notes included: a note that goes, such as a declared exception, is a change too.
  const keyed = (r: Report | null) => new Set((r?.findings ?? []).map((f) => f.key))
  const now = keyed({ findings: unique } as Report)
  const before = keyed(previous)
  const report: Report = {
    _: BANNER,
    date,
    read: {
      script: blobId(scriptText),
      config: blobId(configText),
      tasks: repo.taskManifest,
      cochangeThrough: map?.throughCommit ?? null,
      sources: [...repo.read.entries()].map(([path, text]) => ({ path, blob: blobId(text) })).sort((a, b) => byCodePoint(a.path, b.path)),
    },
    limits: LIMITS,
    summary: Object.fromEntries(Object.entries(summary).sort(([a], [b]) => byCodePoint(a, b))),
    findings: unique,
    tables: {
      pairing: pairs,
      hubs: hub.rows,
      neverChanged: hub.neverChanged,
      stableImports,
      promptScripts: [...promptScripts].map(([script, prompts]) => ({ script, prompts })).sort((a, b) => byCodePoint(a.script, b.script)),
    },
    wiring,
    comparison: {
      previous: previous?.date ?? null,
      appeared: sorted([...now].filter((k) => !before.has(k))),
      went: sorted([...before].filter((k) => !now.has(k))),
      scriptChanged: previous ? previous.read.script !== blobId(scriptText) : null,
      configChanged: previous ? previous.read.config !== blobId(configText) : null,
    },
  }
  return report
}

/** The one serialiser: two-space JSON, each finding, hub row and wire on one line. */
export function serialise(report: Report): string {
  const oneLine = new Set(['findings', 'wiring', 'sources', 'hubs', 'pairing', 'stableImports', 'promptScripts'])
  const render = (value: unknown, key: string, indent: string): string => {
    if (Array.isArray(value) && value.length > 0 && oneLine.has(key)) return `[\n${value.map((v) => `${indent}  ${JSON.stringify(v)}`).join(',\n')}\n${indent}]`
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const entries = Object.entries(value)
      if (entries.length === 0) return '{}'
      return `{\n${entries.map(([k, v]) => `${indent}  ${JSON.stringify(k)}: ${render(v, k, `${indent}  `)}`).join(',\n')}\n${indent}}`
    }
    return JSON.stringify(value)
  }
  return `${render(report, '', '')}\n`
}

/** The report as Markdown, for a person. */
export function markdown(report: Report, cfg: Config): string {
  const out: string[] = [`# Harness assessment, ${report.date}`, '']
  out.push(`Written by \`mise run harness\`. Script blob \`${report.read.script.slice(0, 12)}\`, config blob \`${report.read.config.slice(0, 12)}\`, co-change map through \`${(report.read.cochangeThrough ?? 'none').slice(0, 12)}\`, ${report.read.sources.length} files read.`, '')
  out.push(`${report.summary.findings} findings, ${report.summary.leads} leads, ${report.summary.notes} notes over ${report.summary.jobs} jobs, ${report.summary.jobsWithGlob} with a glob. A finding rests on exact evidence; a lead is a heuristic to read before acting; a note is declared or informational.`, '')
  const c = report.comparison
  out.push('## Compared with the last report', '')
  if (c.previous === null) out.push('No earlier report.', '')
  else {
    out.push(`Against ${c.previous}: ${c.appeared.length} appeared, ${c.went.length} went. The script ${c.scriptChanged ? 'changed' : 'did not change'} and the config ${c.configChanged ? 'changed' : 'did not change'} between the two${c.scriptChanged || c.configChanged ? ', so a moved count may be the tool, not the harness' : ''}.`, '')
    for (const key of c.appeared) out.push(`- appeared: \`${key}\``)
    for (const key of c.went) out.push(`- went: \`${key}\``)
    if (c.appeared.length + c.went.length > 0) out.push('')
  }
  const sections: [string, string][] = [
    ['glob/', 'Glob cover'],
    ['reach', 'Reachability of gates'],
    ['parity', 'Pre-push and CI parity'],
    ['observed', 'Co-change without imports'],
  ]
  for (const [prefix, title] of sections) {
    out.push(`## ${title}`, '')
    const mine = report.findings.filter((f) => f.check.startsWith(prefix))
    if (mine.length === 0) out.push('Nothing.', '')
    for (const level of ['finding', 'lead', 'note'] as Level[]) {
      for (const f of mine.filter((x) => x.level === level)) out.push(`- **${level}** \`${f.subject}\`: \`${f.item}\`: ${f.reason}`)
    }
    if (mine.length > 0) out.push('')
  }
  out.push('## Hubs', '')
  out.push(`Pre-push jobs whose globs match the file, jobs whose imports reach it, counted pull requests that changed it, and the globbed jobs it fires per hundred pull requests (\`count-index.md\` § Rates and metrics)${report.tables.hubs.some((h) => h.firesPerHundredPrs !== null) ? '' : '; no rate is written, the map being under its sample'}.`, '')
  out.push('| file | glob jobs | import jobs | changed | fires /100 PRs |', '|---|---|---|---|---|')
  const top = (key: 'declaredJobs' | 'firesPerHundredPrs') => [...report.tables.hubs].sort((a, b) => (b[key] ?? -1) - (a[key] ?? -1) || byCodePoint(a.path, b.path)).slice(0, cfg.hubsTop)
  const shown = new Map([...top('declaredJobs'), ...top('firesPerHundredPrs')].map((h) => [h.path, h]))
  for (const h of [...shown.values()].sort((a, b) => (b.firesPerHundredPrs ?? -1) - (a.firesPerHundredPrs ?? -1) || b.declaredJobs - a.declaredJobs || byCodePoint(a.path, b.path))) {
    out.push(`| \`${h.path}\` | ${h.declaredJobs} | ${h.importJobs} | ${h.changes ?? '-'} | ${h.firesPerHundredPrs ?? '-'} |`)
  }
  out.push('', `In ${cfg.neverChangedMinJobs} or more globs and changed by no counted pull request since the map's baseline: ${report.tables.neverChanged.map((p) => `\`${p}\``).join(', ') || 'none'}.`, '')
  out.push('## Rule sections and the scripts that cite them', '')
  for (const row of report.tables.pairing) out.push(`- [${row.citedBy.length > 0 ? 'cited' : ' -- '}] ${row.section}${row.citedBy.length > 0 ? ` <- ${row.citedBy.map((f) => `\`${f}\``).join(', ')}` : ''}`)
  out.push('', 'Uncited is a gap only where the rule is mechanically checkable.', '')
  out.push('## Imports that never changed together', '')
  out.push(`${report.tables.stableImports.length} direct imports between files the map counts, never changed together by enough pull requests to be an edge: interfaces that held.`, '')
  out.push('## What each check cannot see', '')
  for (const [check, limit] of Object.entries(report.limits)) out.push(`- \`${check}\`: ${limit}`)
  out.push('')
  return out.join('\n')
}

/** The latest report under `dir` dated before `date`. */
export function latestBefore(dir: string, date: string): Report | null {
  if (!existsSync(dir)) return null
  const dates = readdirSync(dir).filter((name) => name < date && existsSync(join(dir, name, 'harness.json'))).sort(byCodePoint)
  if (dates.length === 0) return null
  return JSON.parse(readFileSync(join(dir, dates[dates.length - 1], 'harness.json'), 'utf8')) as Report
}

/** Run, write the dated report under `out`, and return it. */
export async function run(root: string, date: string, out?: string): Promise<{ report: Report; dir: string }> {
  const cfg = readConfig(root)
  const base = out ?? join(root, cfg.reportDir)
  const report = await assess(root, date, latestBefore(base, date))
  const dir = join(base, date)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'harness.json'), serialise(report))
  writeFileSync(join(dir, 'harness.md'), markdown(report, cfg))
  return { report, dir }
}

/* --------------------------------------------------------------------------------- the CLI ------ */

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function main(argv: string[]) {
  const root = process.env.HARNESS_ROOT ? resolve(process.env.HARNESS_ROOT) : REPO_ROOT
  let date = today()
  let out: string | undefined
  for (let k = 0; k < argv.length; k++) {
    if (argv[k] === '--date' && /^\d{4}-\d{2}-\d{2}$/.test(argv[k + 1] ?? '')) date = argv[++k]
    else if (argv[k] === '--out' && argv[k + 1]) out = resolve(argv[++k])
    else {
      console.error('usage: node tools/harness/harness.ts [--date YYYY-MM-DD] [--out <dir>]')
      process.exit(1)
    }
  }
  try {
    const { report, dir } = await run(root, date, out)
    const s = report.summary
    console.log(`harness: ${s.findings} findings, ${s.leads} leads, ${s.notes} notes over ${s.jobs} jobs; wrote ${dir}/harness.json and harness.md.`)
    if (report.comparison.previous) console.log(`harness: against ${report.comparison.previous}, ${report.comparison.appeared.length} appeared and ${report.comparison.went.length} went; script ${report.comparison.scriptChanged ? 'changed' : 'unchanged'}, config ${report.comparison.configChanged ? 'changed' : 'unchanged'}.`)
  } catch (error) {
    console.error(`harness: ${(error as Error).message}`)
    process.exit(1)
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await main(process.argv.slice(2))
