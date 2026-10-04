/**
 * Trace emitter and gate. It writes the traceability record, `artifacts/trace/record.json`, from
 * committed files and git history, and holds against it the rules of `docs/test-strategy.md`
 * § Traceability that a program can check, with a ratchet baseline, `artifacts/trace/baseline.json`,
 * of the obligations the product did not meet when the rules landed. This header is the one home of
 * traceability rules 4 to 8, the happy-path-and-negative obligation, Finalize's rules for tests on a
 * removed or modified ID, and the ratchet (`docs/decisions.md` § D-13, item 17's table, and items 5,
 * 10 and 14; landed by asdlc-openspec-j09.7).
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong or absent. Before it, a change's proof was a trace written by hand under `.scratch/` at
 * Verify, which nothing committed and no gate read: a scenario could land with a happy-path test and
 * no negative one, a test could name an ID no spec heads, or keep proving the old version of a
 * scenario its change rewrote, and a file under `apps/` could change with no task behind it. A record
 * that misses a test, a scenario or a commit returns a smaller answer and says nothing, so the tests
 * are read only through `scripts/test-trace.mjs`, which `scripts/run-tests.mjs` holds to what Node's
 * runner reports, and the history walk is compared with a hand-ratified fixture before every write
 * and every check, which refuse on a disagreement.
 *
 * THE RECORD. `npm run trace` writes it with the directory's `README.md`, whose text is this file's;
 * the record is one JSON document in four lists, each sorted by code point:
 *
 *   - `specs`: every scenario and NFR requirement a living spec or an active change's delta heads, as
 *     the reader's `specIndex` gives them, with its capability, title, requirement, the NFR it sits
 *     under, its current hash, its tests by role, each `no-negative:` declared for it, its obligation
 *     and its state: `living`; `added` or `modified` by an active delta (modified: its hash there is
 *     not its living one); or `removed`, when a trial archive of the active changes by the pinned
 *     OpenSpec CLI, into a scratch copy, leaves it out of the living specs.
 *   - `tests`: every test in the files matched by the quoted patterns of each package script that
 *     runs `scripts/run-tests.mjs`, and in the files under each `--dir` of one, as
 *     `scripts/lib/test-dirs.mjs` expands it (the test-builder's contract, fitness and E2E tests),
 *     read through the reader: its layer, level, modifier and IDs, each
 *     reference with its hash and its status, and its partition. A test is `change` when it cites an
 *     added or modified ID, `retire` when every ID it cites is removed, `unresolved` when it cites an
 *     ID nothing heads, and `regression` otherwise, a task-only test included; Verify moves into
 *     `change` a test citing one of the epic's tasks, which only the tracker knows.
 *   - `contracts`: every operation of an OpenAPI document under `apps/<app>/contracts/`, with its
 *     file's hash and the contract tests that cite it.
 *   - `tasks`: every task ID that a commit reachable from HEAD, a merge aside, names in the
 *     parentheses ending its subject, matched by `prReviewIssuePattern` as the pull-request reviewer
 *     reads a title, since a body names follow-ups it does not carry; the paths under `apps/` those
 *     commits change, a rename as both paths, which
 *     are the implementation elements until a later issue reads symbols; and the tests citing it.
 *     It walks all of HEAD's history, not the branch's `origin/main..HEAD`: that range is empty on
 *     `main` once a branch merges, so a record written from it would go stale at every merge, where
 *     a rebase merge (`prReviewMergeMethod`) replays each commit with its subject and its paths. A
 *     commit joins the record only once it exists, so `npm run trace` runs after the last commit
 *     that changes `apps/`, and its record is committed after that, or amended into it.
 *
 * THE RULES `npm run trace:check` holds. It re-derives the record in memory and refuses, each
 * refusal opening with the name below:
 *
 *   - `record`: a committed record or README that differs from the re-derivation, or none; and a
 *     file in `artifacts/trace/` that neither command writes, which a fresh run would not leave.
 *   - `rule 5`: a commit of the branch, from its merge base with `origin/main`, that changes a path
 *     under `apps/` and names no task, even where an earlier commit naming one changed that path;
 *     and a path under `apps/` the branch changes that no task-naming commit changed, as a merge's
 *     resolution can.
 *   - `rule 6`: a contract operation that no test at layer `contract` cites; an operation with no
 *     `operationId`, or one another operation of its file shares, which no test can cite; a
 *     contract file that is not JSON.
 *   - `rule 7`: a test whose name names no ID.
 *   - `rule 8`: a test that carries no artifact hash. A task-only test carries its Binding
 *     Surface's, by the reader's convention.
 *   - `unknown`: a scenario or NFR ID that heads nothing in the living specs or an active delta, a
 *     contract operation its file does not have, or an artifact that is not there. After
 *     Finalize's archive a test on a removed ID is refused this way, so it is retired in its change.
 *   - `stale`: a hash of a scenario, an NFR requirement, a Binding Surface or a contract that is not
 *     the current one. A test on a scenario an active delta modifies is refused this way until it is
 *     regenerated against the delta.
 *   - `obligation`: a scenario with no happy-path test or no negative test at a layer that
 *     `traceObligationLayers` in `tools/policy/vocabulary.json` lists, neither skipped nor todo,
 *     that the baseline does not list. A `no-negative:<ID> "<reason>"` on one of its happy-path
 *     tests meets the negative obligation and is printed as advisory (D-13, item 10); the scenarios
 *     of an NFR requirement owe neither test (item 14); a scenario an active change removes owes
 *     nothing.
 *   - `baseline`: below.
 *   - `reader`: any metadata `scripts/test-trace.mjs` refuses, in its words; `calculator:test`
 *     refuses it too.
 *
 * THE RATCHET. `artifacts/trace/baseline.json` lists the unmet obligations of scenarios no active
 * delta adds or modifies, each as the reference a test would cite to meet it (`CALC-005:negative`).
 * It is generated output under `artifacts/`, not a decision record: a program writes it and a person
 * never does (`CLAUDE.md` § Three kinds of file, and never a fourth). It is a file of its own because
 * `npm run trace` never moves it; only `npm run trace:update` does (`CLAUDE.md` § The script suffix
 * contract). `trace:check` refuses an entry that is met or no longer owed; an entry for a scenario an
 * active delta adds or modifies, since every new or modified scenario meets every obligation (item
 * 5); an entry the baseline at the branch's merge base with `origin/main` does not list, which is the
 * ratchet itself; and a file that is not as `trace:update` writes it. `trace:update` writes each
 * unmet obligation it may keep, those the base's baseline lists, so it only ever drops an entry, and
 * prints each it may not add. Where the base has no baseline, on the branch that creates it, it
 * writes them all, and `trace:check`'s rise check skips and says so.
 *
 * NOT THIS GATE'S. Rules 1 to 3 read task bodies in `bd`, which a clone does not have: change-plan
 * checks them in its draft and change-verify again (D-13, item 17's table). Rule 4 needs which tasks
 * are complete, which `bd` knows: Verify reads each task's paths from the record. Nor whether a task
 * ID names a real issue, whether an NFR has a fitness function (rule 2), a test's `skip` option, which
 * the reader does not see (the test-inventory gate's, asdlc-openspec-j09.9), or whether a test
 * exercises what it cites, which the verify trace's tracers judge.
 *
 * INVOCATION.
 *
 *   npm run trace              write the record
 *   npm run trace:check        re-derive the record, diff it and hold the rules; writes nothing
 *   npm run trace:update       move the baseline down to the obligations still unmet
 *   npm run trace:selftest     each refusal on a doctored fixture repository, beside a control
 *
 * `TRACE_ROOT=<dir>` points the first three at a doctored copy, the top of a git checkout.
 *
 * NEEDS git and the whole history of HEAD (a shallow clone is refused, so CI checks out with
 * `fetch-depth: 0`), `origin/main` for `trace:check` and `trace:update`, the keys of `tools/policy/`
 * the reader and this file read, and, only while a change is active, the pinned OpenSpec CLI
 * (`npm ci`). Reads only committed files and git history; no network. Its cost is on its job in
 * `git-hooks.yml`.
 *
 * KIND: emitter and gate; `trace` writes the record and the README, `trace:update` the baseline,
 *   `trace:check` nothing.
 * INVARIANTS: no timestamp, commit id or randomness in either file; every list sorted by code point;
 *   one serialiser; the history walk agrees with a hand-ratified fixture before anything is written
 *   or checked.
 * RE-ENTRY: a second `npm run trace` over the same inputs writes the same bytes, and `trace:check`
 *   passes exactly when it would write none; `trace:update` run twice drops nothing more.
 * STALE WHEN: a living spec or an active delta changes; a test file the runner's patterns or
 *   `--dir` directories match, or a pattern or a `--dir` in `package.json`; a contract or a Binding
 *   Surface; a key of `tools/policy/` it reads; a commit that names a task and changes `apps/`
 *   joins HEAD's history; this file, `scripts/test-trace.mjs` or `scripts/lib/test-dirs.mjs`.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findBin } from '../../scripts/lib/bin-path.mjs'
import { PACKAGE_JSON, loadTasks } from '../../scripts/lib/tasks.mjs'
import { dirGlob, scriptDirs } from '../../scripts/lib/test-dirs.mjs'
import { VOCABULARY, hashRef, readTests, readTracePolicy, specIndex } from '../../scripts/test-trace.mjs'
import { firstDifference, readText } from '../lib/committed.ts'
import { SCRATCH_GIT_ENV, gitIn, gitOk, type Git } from '../lib/git-env.ts'
import { ROOT as REPO_ROOT } from '../lib/paths.ts'
import { readPolicy } from '../lib/policy.ts'

export const DIR = 'artifacts/trace'
export const RECORD = `${DIR}/record.json`
export const BASELINE = `${DIR}/baseline.json`
export const README = `${DIR}/README.md`
/** The trunk a branch is measured from (`CLAUDE.md` § Git workflow). */
const TRUNK = 'origin/main'
const OBLIGATION_KEY = 'traceObligationLayers'
const LAYERS_KEY = 'testTraceLayers'
const TASK_KEY = 'prReviewIssuePattern'
/** The runner whose quoted patterns name the test files (the header of scripts/run-tests.mjs). */
const RUNNER = 'scripts/run-tests.mjs'
/** Where a contract artifact lives (`docs/decisions.md` § D-13, item 15). */
const CONTRACTS = 'apps/*/contracts/**/*.json'
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
const NFR_ID = /^NFR-[A-Z][A-Z0-9]*-\d{3,}$/
const ID_HEADER = /^(?:Scenario|Requirement):\s*\[([^\]\s]+)\]\s+(.*)$/i
/** Every spawn of the OpenSpec CLI: no telemetry, no colour codes. */
const CLI_ENV = { OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1', NO_COLOR: '1' }

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const sorted = (items: Iterable<string>) => [...new Set(items)].sort(byCodePoint)
const testKey = (file: string, name: string) => `${file}\u0000${name}`
const testRef = (test: { file: string; name: string }) => ({ file: test.file, name: test.name })
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** What a derivation counted, in words, for the summary a run prints. */
function counted(facts: Derived['facts']): string {
  return (
    `${count(facts.scenarios, 'scenario')}, ${count(facts.nfrs, 'NFR requirement')}, ${count(facts.tests, 'test')},` +
    ` ${count(facts.operations, 'contract operation')} and ${count(facts.tasks, 'task')}`
  )
}

/** The one serialiser both files are written with. */
export function serialise(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

const RECORD_BANNER = [
  'GENERATED by `npm run trace` (tools/trace/trace.ts). Do not edit by hand: a correction goes into the specs, the tests or the commits it is read from, and `npm run trace` writes it again.',
  'The traceability record: every scenario and NFR requirement of the living specs and the active deltas, every test the runner\'s patterns match, every contract operation, and every task a commit on HEAD names with the paths under apps/ it changed.',
  'npm run trace:check re-derives it and refuses a difference; the rules it holds are the header of tools/trace/trace.ts.',
]

/**
 * The directory's README, which `npm run trace` writes with the record, since nothing under
 * `artifacts/` is edited by hand (`CLAUDE.md` § Three kinds of file, and never a fourth).
 */
const README_TEXT = `# \`artifacts/trace/\`

<!-- GENERATED by \`npm run trace\` (tools/trace/trace.ts). Do not edit by hand: change the text in the emitter and run it again. -->

**The traceability record and its ratchet baseline: the generated output of
\`tools/trace/trace.ts\`, which nothing edits by hand.**
A correction goes into what the record is read from, the specs, the tests, the contracts or the
commits, and the emitter writes it again; \`npm run trace:check\` refuses a file here that differs
from what it re-derives, and any other file.

| File | Written by | What it is |
|---|---|---|
| \`record.json\` | \`npm run trace\` | Every scenario and NFR requirement of the living specs and the active deltas, with its tests and its obligation; every test, with each reference it cites and whether that is current; every contract operation; and every task a commit on HEAD names, with the paths under \`apps/\` it changed. |
| \`baseline.json\` | \`npm run trace:update\`, and nothing else | The obligations scenarios did not meet when the gate landed, each as the reference a test would cite to meet it. It may fall and never rise. |

Where a row here and the header of \`tools/trace/trace.ts\` disagree, the header wins, and the row is
corrected in the emitter.
`

const BASELINE_BANNER = [
  'GENERATED by `npm run trace:update` (tools/trace/trace.ts). Do not edit by hand: it lists the obligations scenarios did not meet, and it may fall and never rise.',
  'Each entry is the reference a test would cite to meet it. npm run trace:check refuses an entry that is met, one for a new or modified scenario, and one the baseline at the merge base with origin/main does not list; the header of tools/trace/trace.ts is the rule.',
]

/* --------------------------------------------------------------------------------- git ---------- */

// `gitIn`, `gitOk` and `SCRATCH_GIT_ENV` live in tools/lib/git-env.ts, which the co-change emitter
// reads too.

/**
 * The task IDs a commit subject names: those matching `pattern` inside the parentheses that end
 * it, as `citedIssues` in `scripts/pr-review.mjs` reads a pull request's title.
 */
export function subjectTasks(subject: string, pattern: string): string[] {
  const tail = /\(([^()]*)\)\s*$/.exec(subject)
  if (!tail) return []
  return sorted([...tail[1].matchAll(new RegExp(`(?<![\\w-])${pattern}(?![\\w-])`, 'g'))].map((m) => m[0]))
}

type Commit = { sha: string; subject: string; tasks: string[]; paths: string[] }

/**
 * Every commit of `range` that changes a path under `apps/`, merges left out, each with its
 * abbreviated id (for a refusal to name, never for the record), the task IDs its subject names and
 * the paths under `apps/` it changes, a rename as both paths.
 */
export function walk(git: Git, pattern: string, range: string[]): Commit[] {
  const out = git(['log', '--no-color', '--no-show-signature', '--no-merges', '--full-history', '--no-renames', '-z', '--format=%x1e%h%x1f%s', '--name-only', ...range, '--', 'apps/'])
  const commits: Commit[] = []
  for (const chunk of out.split('\u001e').slice(1)) {
    const nul = chunk.indexOf('\u0000')
    const head = nul < 0 ? chunk : chunk.slice(0, nul)
    const cut = head.indexOf('\u001f')
    const sha = head.slice(0, cut)
    const subject = head.slice(cut + 1)
    const paths = (nul < 0 ? '' : chunk.slice(nul + 1)).replace(/^\n/, '').split('\u0000').filter((path) => path !== '')
    commits.push({ sha, subject, tasks: subjectTasks(subject, pattern), paths: sorted(paths) })
  }
  return commits
}

/** Each task the commits name, with the paths they change: `{ task: [path] }`, sorted. */
function taskPaths(commits: Commit[]): Map<string, string[]> {
  const paths = new Map<string, Set<string>>()
  for (const commit of commits) {
    for (const task of commit.tasks) {
      if (!paths.has(task)) paths.set(task, new Set())
      for (const path of commit.paths) paths.get(task)!.add(path)
    }
  }
  return new Map(sorted(paths.keys()).map((task) => [task, sorted(paths.get(task)!)]))
}

/**
 * The walk of a history built here and ratified by hand: the task each commit names and the paths
 * under `apps/` it changes. A merge, a commit naming no task, one naming two, a rename, one that
 * changes nothing under `apps/` and one whose closing parentheses hold no ID are each in it.
 */
const RATIFIED = {
  'asdlc-openspec-abc.1': ['apps/x/a.js'],
  'asdlc-openspec-abc.2': ['apps/x/c.js'],
  'asdlc-openspec-abc.3': ['apps/x/e.js'],
  'asdlc-openspec-abc.4': ['apps/x/e.js'],
  'asdlc-openspec-abc.5': ['apps/x/a.js', 'apps/x/d.js'],
}

/**
 * Why `walker` reads the ratified history other than by hand, or null when it agrees. The emitter
 * and the check run it before anything else, since a walk that drops a commit says nothing.
 */
export function ratify(walker: typeof walk = walk): string | null {
  const dir = mkdtempSync(join(tmpdir(), 'trace-ratify-'))
  try {
    // One `git fast-import` builds the whole history: a commit at a time took about twenty git
    // starts, measured at 0.45 s a ratification against 0.12 s this way, on the host of the cost
    // note on `trace-check` in git-hooks.yml, 2026-09-28.
    const data = (text: string) => `data ${Buffer.byteLength(text)}\n${text}\n`
    let mark = 0
    const commit = (branch: string, subject: string, from: number | null, lines: string[], merge: number | null = null) => {
      mark++
      return (
        `commit refs/heads/${branch}\nmark :${mark}\ncommitter trace <trace@example.invalid> ${1700000000 + mark} +0000\n${data(subject)}` +
        `${from === null ? '' : `from :${from}\n`}${merge === null ? '' : `merge :${merge}\n`}${lines.join('')}\n`
      )
    }
    const file = (path: string, text: string) => `M 100644 inline ${path}\n${data(text)}`
    const stream = [
      commit('main', 'Add a (asdlc-openspec-abc.1)', null, [file('apps/x/a.js', 'a\n'), file('docs/n.md', 'n\n')]),
      commit('main', 'Add b, naming no task', 1, [file('apps/x/b.js', 'b\n')]),
      commit('side', 'Add c (asdlc-openspec-abc.2)', 2, [file('apps/x/c.js', 'c\n')]),
      commit('main', 'Add e (asdlc-openspec-abc.3, asdlc-openspec-abc.4)', 2, [file('apps/x/e.js', 'e\n')]),
      commit('main', 'Merge side (asdlc-openspec-abc.9)', 4, [file('apps/x/c.js', 'c\n')], 3),
      commit('main', 'Rename a (asdlc-openspec-abc.5)', 5, ['R apps/x/a.js apps/x/d.js\n']),
      commit('main', 'Only a document (asdlc-openspec-abc.6)', 6, [file('docs/n.md', 'n, again\n')]),
      commit('main', 'Name asdlc-openspec-abc.7 in passing (not an ID: see the notes)', 7, [file('apps/x/b.js', 'b, again\n')]),
    ].join('')
    const git = gitIn(dir, SCRATCH_GIT_ENV)
    git(['init', '-q', '--bare'])
    const imported = spawnSync('git', ['fast-import', '--quiet'], { cwd: dir, env: SCRATCH_GIT_ENV, input: stream, encoding: 'utf8' })
    if (imported.status !== 0) throw new Error(`git fast-import refused the fixture: ${imported.stderr.trim()}`)
    const read = Object.fromEntries(taskPaths(walker(git, 'asdlc-openspec-[a-z0-9]+(?:\\.[0-9]+)*', ['main'])))
    const want = JSON.stringify(RATIFIED)
    const got = JSON.stringify(read)
    return got === want ? null : `the history walk read the hand-ratified fixture as ${got}, where it is ${want}`
  } catch (error) {
    return `the history walk could not read the hand-ratified fixture: ${(error as Error).message}`
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* --------------------------------------------------------------------------------- inputs ------- */

/** The obligation layers and the task pattern, from the policy the reader also reads. */
function tracePolicyExtras(root: string): { layers: string[]; task: string } {
  const policy = readPolicy(root)
  const layers = policy[OBLIGATION_KEY]
  const known = (policy[LAYERS_KEY] ?? {}) as object
  if (!Array.isArray(layers) || layers.length === 0 || layers.some((layer) => typeof layer !== 'string' || !Object.hasOwn(known, layer))) {
    throw new Error(
      `${VOCABULARY} has no list under \`${OBLIGATION_KEY}\` of layers \`${LAYERS_KEY}\` declares: the layers whose tests count toward a` +
        ` scenario's happy-path and negative obligation (the header of tools/trace/trace.ts).`,
    )
  }
  return { layers, task: policy[TASK_KEY] as string }
}

/**
 * The test files: every file the quoted patterns of a script running the runner match, and every
 * file under a `--dir` of one, as `scripts/lib/test-dirs.mjs` expands it. The scripts are the tree's
 * tasks, read through `scripts/lib/tasks.mjs`.
 */
function testFiles(root: string, findings: string[]): string[] {
  const manifest = loadTasks(root)
  const file = manifest?.file ?? PACKAGE_JSON
  const scripts: Record<string, string> = manifest?.tasks ?? {}
  const patterns: string[] = []
  const invocation = new RegExp(`node ${RUNNER.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}((?:\\s+"[^"]+")+)`, 'g')
  for (const command of Object.values(scripts)) {
    for (const call of command.matchAll(invocation)) {
      for (const quoted of call[1].matchAll(/"([^"]+)"/g)) patterns.push(quoted[1])
    }
  }
  try {
    patterns.push(...scriptDirs(scripts).map(dirGlob))
  } catch (error) {
    findings.push(`reader: ${(error as Error).message}`)
  }
  if (patterns.length === 0) {
    findings.push(`reader: no script in ${file} runs \`node ${RUNNER}\` over a quoted pattern, so no test file can be read.`)
    return []
  }
  return sorted(patterns.flatMap((pattern) => globSync(pattern, { cwd: root })).filter((file) => statSync(join(root, file)).isFile()))
}

type Ref = { ref: string; kind: string; id?: string; role?: string; path?: string; operation?: string; hash: string | null; status: string }
type Test = {
  file: string
  name: string
  modifier: string | null
  layer: string | null
  level: number | null
  ids: string[]
  refs: Ref[]
  noNegative: { id: string; reason: string }[]
  partition?: string
}

function refText(ref: any): string {
  if (ref.kind === 'scenario') return `${ref.id}:${ref.role}`
  if (ref.kind === 'nfr' || ref.kind === 'task') return ref.id
  if (ref.kind === 'surface') return `surface:${ref.path}`
  return `contract:${ref.path}#${ref.operation}`
}

/** Each active change: a directory under `openspec/changes/` other than the archive. */
function activeChanges(root: string): string[] {
  const dir = join(root, 'openspec', 'changes')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name !== 'archive' && statSync(join(dir, name)).isDirectory())
    .sort(byCodePoint)
}

/**
 * The living IDs the active changes remove: each is archived, in order, into a scratch copy of
 * `openspec/` by the pinned CLI, and an ID the living specs head that the result does not is removed.
 */
function removedIds(root: string, changes: string[], index: Map<string, any[]>, findings: string[]): Set<string> {
  const removed = new Set<string>()
  if (changes.length === 0) return removed
  const bin = findBin('openspec', REPO_ROOT)
  if (bin === null) {
    findings.push('reader: the pinned OpenSpec CLI is not installed (run `npm ci`); it trial-archives each active change to learn which IDs the change removes.')
    return removed
  }
  const scratch = mkdtempSync(join(tmpdir(), 'trace-archive-'))
  try {
    cpSync(join(root, 'openspec'), join(scratch, 'openspec'), { recursive: true })
    for (const change of changes) {
      const run = spawnSync(bin, ['archive', change, '--yes'], {
        cwd: scratch,
        encoding: 'utf8',
        env: { ...process.env, ...CLI_ENV },
        shell: process.platform === 'win32',
      })
      if (run.status !== 0) {
        findings.push(`reader: the active change \`${change}\` does not archive into the living specs, so what it removes is unknown; \`npm run openspec:check\` says why.`)
      }
    }
    const after = specIndex(scratch)
    for (const [id, blocks] of index) {
      if (blocks.some((block) => !block.delta) && !after.has(id)) removed.add(id)
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
  return removed
}

/** A header's ID token and title, `Scenario: [CALC-003] Digits build a number` read as its title. */
function titleOf(header: string | null): string | null {
  if (header === null) return null
  const token = ID_HEADER.exec(header)
  return token ? token[2].trim() : header.replace(/^(?:Scenario|Requirement):\s*/i, '').trim()
}

/** The capability a spec file belongs to, from its path. */
function capabilityOf(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 2]
}

/* --------------------------------------------------------------------------------- derive ------- */

export type Derived = {
  record: any
  findings: string[]
  advisories: string[]
  unmet: string[]
  fresh: Set<string>
  facts: { scenarios: number; nfrs: number; tests: number; operations: number; tasks: number }
}

/**
 * The record under `root`, and every rule it breaks that the record itself shows. The rules that
 * need the branch or the baseline are `check`'s. Throws when the record cannot be derived at all.
 */
export function derive(root: string): Derived {
  const git = gitIn(root)
  topLevel(git, root)
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('this is a shallow clone, so the tasks section would miss every commit it lacks: fetch the whole history (in CI, check out with `fetch-depth: 0`).')
  }
  const policy = readTracePolicy(root)
  const extras = tracePolicyExtras(root)
  const findings: string[] = []
  const advisories: string[] = []

  // The tests, through the reader.
  const tests: Test[] = []
  for (const file of testFiles(root, findings)) {
    const read = readTests(readFileSync(join(root, file), 'utf8'), policy, file)
    for (const problem of read.problems) findings.push(`reader: ${problem}`)
    for (const test of read.tests) {
      tests.push({
        file,
        name: test.name,
        modifier: test.modifier,
        layer: test.layer,
        level: test.level,
        ids: test.ids,
        refs: test.refs.map((ref: any) => ({ ...ref, ref: refText(ref), hash: ref.hash ?? null, status: 'task' })),
        noNegative: test.noNegative,
      })
    }
  }
  tests.sort((a, b) => byCodePoint(a.file, b.file) || byCodePoint(a.name, b.name))

  // The specs, through the reader's index; removals through a trial archive.
  const index = specIndex(root)
  const removed = removedIds(root, activeChanges(root), index, findings)
  const livingOnly = new Map([...index].map(([id, blocks]) => [id, blocks.filter((block: any) => !block.delta)]))
  const specs = new Map<string, any>()
  for (const id of sorted(index.keys())) {
    let hash: string
    try {
      hash = hashRef(root, id, policy, index)
    } catch (error) {
      findings.push(`reader: ${(error as Error).message}`)
      continue
    }
    const blocks = index.get(id)!
    const deltas = blocks.filter((block: any) => block.delta)
    const block = deltas[0] ?? blocks[0]
    const living = livingOnly.get(id)!.length > 0
    let state = 'living'
    if (removed.has(id)) state = 'removed'
    else if (deltas.length > 0 && !living) state = 'added'
    else if (deltas.length > 0 && hashRef(root, id, policy, livingOnly) !== hash) state = 'modified'
    const nfr = NFR_ID.test(id)
    const under = block.requirement === null ? null : ID_HEADER.exec(block.requirement)?.[1] ?? null
    specs.set(id, {
      id,
      kind: nfr ? 'nfr' : 'scenario',
      capability: capabilityOf(block.path),
      title: titleOf(block.header),
      requirement: nfr ? null : titleOf(block.requirement),
      nfr: nfr ? null : under !== null && NFR_ID.test(under) ? under : null,
      state,
      hash,
      tests: nfr ? { cite: [] } : { happy: [], negative: [] },
      noNegative: [],
      obligation: null,
    })
  }

  // Each reference resolved and dated.
  const current = new Map<string, string>()
  const currentHash = (ref: Ref) => {
    const key = ref.kind === 'scenario' ? ref.id! : ref.ref
    if (!current.has(key)) current.set(key, hashRef(root, ref.kind === 'contract' ? `contract:${ref.path}#${ref.operation}` : key, policy, index))
    return current.get(key)!
  }
  const contracts = readContracts(root, policy, findings)
  for (const test of tests) {
    const where = `${test.file}: "${test.name}"`
    if (test.ids.length === 0) findings.push(`rule 7: ${where} references no scenario, NFR or task ID; open its name with \`[<ID>]\` (docs/test-strategy.md § Traceability, rule 7).`)
    if (!test.refs.some((ref) => ref.hash !== null)) {
      findings.push(`rule 8: ${where} carries no artifact hash, so nothing records the version it was written against; cite each artifact with its hash (rule 8, and the header of scripts/test-trace.mjs).`)
    }
    for (const ref of test.refs) {
      if (ref.kind === 'task') continue
      if ((ref.kind === 'scenario' || ref.kind === 'nfr') && !specs.has(ref.id!)) {
        ref.status = 'unknown'
        findings.push(`unknown: ${where} cites ${ref.id}, which heads no scenario or NFR requirement in the living specs or an active change's delta; a test on an ID its change removed is retired in that change.`)
        continue
      }
      if (ref.kind === 'contract' && !contracts.some((op) => op.file === ref.path && op.operation === ref.operation)) {
        if (existsSync(join(root, ref.path!))) {
          ref.status = 'unknown'
          findings.push(`unknown: ${where} cites \`${ref.ref}\`, an operation ${ref.path} does not have.`)
          continue
        }
      }
      let now: string
      try {
        now = currentHash(ref)
      } catch (error) {
        ref.status = 'unknown'
        findings.push(`unknown: ${where} cites \`${ref.ref}\`: ${(error as Error).message}`)
        continue
      }
      ref.status = now === ref.hash ? 'current' : 'stale'
      if (ref.status === 'stale') {
        findings.push(
          `stale: ${where} was written against \`${ref.ref}@${ref.hash}\`, and its current hash is ${now}: the artifact changed since. Regenerate the test` +
            ` against it, then cite it again (\`node scripts/test-trace.mjs cite ${ref.ref}\`).`,
        )
      }
    }
  }

  // Tests on each spec, the partitions, and the obligations.
  for (const test of tests) {
    const cited = test.refs.filter((ref) => ref.kind === 'scenario' || ref.kind === 'nfr')
    for (const ref of cited) {
      const spec = specs.get(ref.id!)
      if (spec === undefined) continue
      if (ref.kind === 'nfr') spec.tests.cite.push(testRef(test))
      else spec.tests[ref.role!].push(testRef(test))
    }
    for (const { id, reason } of test.noNegative) specs.get(id)?.noNegative.push({ ...testRef(test), reason })
    const states = cited.map((ref) => specs.get(ref.id!)?.state ?? 'unknown')
    test.partition = states.includes('unknown')
      ? 'unresolved'
      : states.some((state) => state === 'added' || state === 'modified')
        ? 'change'
        : states.length > 0 && states.every((state) => state === 'removed')
          ? 'retire'
          : 'regression'
  }
  const byTest = new Map(tests.map((test) => [testKey(test.file, test.name), test]))
  const runs = (test: Test) => test.modifier !== 'skip' && test.modifier !== 'todo'
  const counts = (entry: { file: string; name: string }) => {
    const test = byTest.get(testKey(entry.file, entry.name))!
    return runs(test) && extras.layers.includes(test.layer!)
  }
  const unmet: string[] = []
  const fresh = new Set<string>()
  for (const spec of specs.values()) {
    if (spec.state === 'added' || spec.state === 'modified') fresh.add(spec.id)
    if (spec.kind === 'nfr') continue
    if (spec.nfr !== null) {
      spec.obligation = { happy: 'exempt', negative: 'exempt', because: `a scenario of ${spec.nfr}, which a fitness function or a test of the NFR proves (D-13, item 14)` }
      continue
    }
    if (spec.state === 'removed') {
      spec.obligation = { happy: 'exempt', negative: 'exempt', because: 'an active change removes it; its tests are to retire' }
      continue
    }
    const happy = spec.tests.happy.some(counts) ? 'met' : 'unmet'
    const declared = spec.noNegative.filter((entry: any) => runs(byTest.get(testKey(entry.file, entry.name))!))
    const negative = spec.tests.negative.some(counts) ? 'met' : declared.length > 0 ? 'declared' : 'unmet'
    spec.obligation = { happy, negative, because: null }
    if (happy === 'unmet') unmet.push(`${spec.id}:happy`)
    if (negative === 'unmet') unmet.push(`${spec.id}:negative`)
    for (const entry of negative === 'declared' ? declared : []) {
      advisories.push(`${spec.id} declares its negative test not applicable, on "${entry.name}" in ${entry.file}: "${entry.reason}" (D-13, item 10).`)
    }
  }

  // The tasks: every one a commit on HEAD names, and every one a test cites.
  const history = taskPaths(walk(git, extras.task, ['HEAD']))
  const tasks = new Map<string, { id: string; paths: string[]; tests: any[] }>()
  for (const [id, paths] of history) tasks.set(id, { id, paths, tests: [] })
  for (const test of tests) {
    for (const ref of test.refs.filter((r) => r.kind === 'task')) {
      if (!tasks.has(ref.id!)) tasks.set(ref.id!, { id: ref.id!, paths: [], tests: [] })
      tasks.get(ref.id!)!.tests.push(testRef(test))
    }
  }
  for (const op of contracts) {
    op.tests = tests
      .filter((test) => test.layer === 'contract' && test.refs.some((ref) => ref.kind === 'contract' && ref.path === op.file && ref.operation === op.operation))
      .map(testRef)
    if (!op.tests.some((entry) => runs(byTest.get(testKey(entry.file, entry.name))!))) {
      findings.push(
        `rule 6: the operation \`${op.operation}\` of ${op.file} has no contract test: no test at layer contract, neither skipped nor todo,` +
          ` cites \`contract:${op.file}#${op.operation}\` (rule 6).`,
      )
    }
  }

  const record = {
    _: RECORD_BANNER,
    specs: [...specs.values()],
    tests: tests.map((test) => ({
      file: test.file,
      name: test.name,
      modifier: test.modifier,
      layer: test.layer,
      level: test.level,
      ids: test.ids,
      refs: test.refs.map((ref) => ({ ref: ref.ref, hash: ref.hash, status: ref.status })),
      partition: test.partition,
    })),
    contracts: contracts.map((op) => ({ file: op.file, operation: op.operation, hash: op.hash, tests: op.tests })),
    tasks: sorted(tasks.keys()).map((id) => tasks.get(id)),
  }
  const scenarios = [...specs.values()].filter((spec) => spec.kind === 'scenario').length
  return {
    record,
    findings,
    advisories: sorted(advisories),
    unmet: sorted(unmet),
    fresh,
    facts: { scenarios, nfrs: specs.size - scenarios, tests: tests.length, operations: contracts.length, tasks: tasks.size },
  }
}

/** Refuses a root that is not the top of its own git checkout, which git would read past. */
function topLevel(git: Git, root: string) {
  const top = git(['rev-parse', '--show-toplevel']).trim()
  if (realpathSync(top) !== realpathSync(root)) {
    throw new Error(`${root} is not the top of a git checkout (git reads ${top} from there); point TRACE_ROOT at a checkout's top.`)
  }
}

/** Every operation of an OpenAPI contract, `{ file, operation, hash, tests }`, sorted. */
function readContracts(root: string, policy: any, findings: string[]) {
  const ops: { file: string; operation: string; hash: string; tests: any[] }[] = []
  for (const file of sorted(globSync(CONTRACTS, { cwd: root }))) {
    let doc: any
    try {
      doc = JSON.parse(readFileSync(join(root, file), 'utf8'))
    } catch (error) {
      findings.push(`rule 6: ${file} is not JSON (${(error as Error).message}), so its operations cannot be read.`)
      continue
    }
    if (typeof doc?.openapi !== 'string' || doc.paths === null || typeof doc.paths !== 'object') continue
    const hash = hashRef(root, file, policy)
    const seen = new Set<string>()
    for (const path of Object.keys(doc.paths).sort(byCodePoint)) {
      for (const method of METHODS) {
        const operation = doc.paths[path]?.[method]
        if (operation === undefined) continue
        const id = operation?.operationId
        if (typeof id !== 'string' || !/^[A-Za-z0-9_.-]+$/.test(id)) {
          findings.push(`rule 6: \`${method.toUpperCase()} ${path}\` in ${file} has no operationId a test can cite (\`contract:${file}#<operationId>\`).`)
          continue
        }
        if (seen.has(id)) {
          findings.push(`rule 6: two operations of ${file} are \`${id}\`, so a test citing it names neither.`)
          continue
        }
        seen.add(id)
        ops.push({ file, operation: id, hash, tests: [] })
      }
    }
  }
  return ops.sort((a, b) => byCodePoint(a.file, b.file) || byCodePoint(a.operation, b.operation))
}

/* --------------------------------------------------------------------------------- the branch --- */

/** The merge base with the trunk, refusing a checkout with no trunk to measure from. */
function mergeBase(git: Git): string {
  if (!gitOk(git, ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`])) {
    throw new Error(`${TRUNK} is not a ref here, so the branch cannot be measured: \`git fetch origin main\` (in CI, check out with \`fetch-depth: 0\`).`)
  }
  return git(['merge-base', TRUNK, 'HEAD']).trim()
}

/**
 * Rule 5: each commit of the branch that changes a path under `apps/` and names no task, and each
 * such path the branch changes that no task-naming commit of it changed, as a merge's resolution
 * can. A path an earlier task-naming commit changed does not excuse a later commit that names none.
 */
function branchFindings(git: Git, base: string, pattern: string): { findings: string[]; changed: number } {
  const changed = git(['diff', '--no-color', '--no-renames', '--name-only', '-z', base, 'HEAD', '--', 'apps/']).split('\u0000').filter((path) => path !== '')
  const covered = new Set<string>()
  const findings: string[] = []
  for (const commit of walk(git, pattern, [`${base}..HEAD`])) {
    if (commit.tasks.length > 0) for (const path of commit.paths) covered.add(path)
    else {
      findings.push(
        `rule 5: the commit ${commit.sha} "${commit.subject}" changes ${commit.paths.join(', ')} and names no task in the parentheses ending` +
          ' its subject, so what it changed resolves to no task; give it a subject that ends `(<task id>)` (rule 5, the header of tools/trace/trace.ts).',
      )
    }
  }
  for (const path of sorted(changed).filter((path) => !covered.has(path))) {
    findings.push(
      `rule 5: ${path} changes on this branch, and no commit since its merge base with ${TRUNK} that changed it names a task in the` +
        ' parentheses ending its subject; change it in a commit whose subject ends `(<task id>)` (rule 5, the header of tools/trace/trace.ts).',
    )
  }
  return { findings: findings.sort(byCodePoint), changed: changed.length }
}

/** The entries of a baseline file's text, or the reason it is not one. */
function parseBaseline(text: string): { entries: string[] } | { problem: string } {
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { problem: `it is not JSON (${(error as Error).message})` }
  }
  if (!Array.isArray(parsed?.unmet) || parsed.unmet.some((entry: unknown) => typeof entry !== 'string' || !/^[^:\s]+:(?:happy|negative)$/.test(entry))) {
    return { problem: 'it has no `unmet` list of `<scenario>:happy` and `<scenario>:negative` entries' }
  }
  return { entries: parsed.unmet }
}

/** The baseline file for `entries`, as `trace:update` writes it. */
export function baselineText(entries: string[]): string {
  return serialise({ _: BASELINE_BANNER, unmet: sorted(entries) })
}

/** The baseline at the merge base, or null where that commit has none. */
function baseBaseline(git: Git, base: string): Set<string> | null {
  if (!gitOk(git, ['cat-file', '-e', `${base}:${BASELINE}`])) return null
  const parsed = parseBaseline(git(['show', `${base}:${BASELINE}`]))
  if ('problem' in parsed) throw new Error(`${BASELINE} at the merge base ${base.slice(0, 12)} cannot be read: ${parsed.problem}.`)
  return new Set(parsed.entries)
}

/* --------------------------------------------------------------------------------- commands ----- */

// `readText` and `firstDifference` live in tools/lib/committed.ts, which the co-change emitter reads too.

export type Checked = { failures: string[]; advisories: string[]; notes: string[]; summary: string }

/**
 * What `check`, `emit` and `update` take: `ratified` says the caller has already held the walk to
 * the ratified fixture, as the selftest does once for its cases, and `walker` is the walk held to
 * it, which only the selftest replaces, with one that disagrees.
 */
type Guarded = { ratified?: boolean; walker?: typeof walk }

/** Every refusal of `trace:check` under `root`. Writes nothing. */
export function check(root: string, { ratified: already = false, walker = walk }: Guarded = {}): Checked {
  const failures: string[] = []
  const notes: string[] = []
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) return { failures: [`record: ${ratified}; nothing is checked until it agrees.`], advisories: [], notes, summary: '' }
  let derived: Derived
  try {
    derived = derive(root)
  } catch (error) {
    return { failures: [`record: it cannot be derived: ${(error as Error).message}`], advisories: [], notes, summary: '' }
  }
  failures.push(...derived.findings)

  const committed = readText(join(root, RECORD))
  const fresh = serialise(derived.record)
  if (committed === null) failures.push(`record: ${RECORD} does not exist; run \`npm run trace\` and commit it.`)
  else if (committed !== fresh) {
    failures.push(`record: ${RECORD} is stale, ${firstDifference(committed, fresh)}; run \`npm run trace\` after the last commit that changes apps/, and commit what it writes.`)
  }
  const readme = readText(join(root, README))
  if (readme === null) failures.push(`record: ${README} does not exist; run \`npm run trace\` and commit it.`)
  else if (readme !== README_TEXT) failures.push(`record: ${README} is stale, ${firstDifference(readme, README_TEXT)}; it is never edited by hand: \`npm run trace\` writes it.`)
  for (const name of existsSync(join(root, DIR)) ? readdirSync(join(root, DIR)).sort(byCodePoint) : []) {
    if (![RECORD, BASELINE, README].includes(`${DIR}/${name}`)) {
      failures.push(`record: ${DIR}/${name} is a file neither \`npm run trace\` nor \`npm run trace:update\` writes, so a fresh run would not leave it; delete it (\`CLAUDE.md\` § The script suffix contract).`)
    }
  }

  const git = gitIn(root)
  let base: string | null = null
  let changed = 0
  try {
    base = mergeBase(git)
    const branch = branchFindings(git, base, tracePolicyExtras(root).task)
    failures.push(...branch.findings)
    changed = branch.changed
  } catch (error) {
    failures.push(`rule 5: ${(error as Error).message}`)
  }

  const unmet = new Set(derived.unmet)
  const text = readText(join(root, BASELINE))
  let listed = new Set<string>()
  if (text === null) failures.push(`baseline: ${BASELINE} does not exist; run \`npm run trace:update\` and commit it.`)
  else {
    const parsed = parseBaseline(text)
    if ('problem' in parsed) failures.push(`baseline: ${BASELINE} cannot be read: ${parsed.problem}; \`npm run trace:update\` writes it.`)
    else {
      listed = new Set(parsed.entries)
      if (text !== baselineText(parsed.entries) || parsed.entries.length !== listed.size) {
        failures.push(`baseline: ${BASELINE} is not as \`npm run trace:update\` writes it (${firstDifference(text, baselineText(parsed.entries))}); it is never edited by hand.`)
      }
      let prior: Set<string> | null = null
      try {
        prior = base === null ? null : baseBaseline(git, base)
      } catch (error) {
        failures.push(`baseline: ${(error as Error).message}`)
      }
      if (base !== null && prior === null) notes.push(`the merge base ${base.slice(0, 12)} has no ${BASELINE}, so no entry is held to it: this branch creates the baseline.`)
      for (const entry of sorted(listed)) {
        const id = entry.split(':')[0]
        if (derived.fresh.has(id)) {
          failures.push(`baseline: ${entry} is listed, and an active change adds or modifies ${id}, whose every obligation is met in the change (D-13, item 5); write its test and run \`npm run trace:update\`.`)
        } else if (!unmet.has(entry)) {
          failures.push(`baseline: ${entry} is listed and is no longer unmet (met, or its scenario gone); run \`npm run trace:update\` so the baseline falls.`)
        }
        if (prior !== null && !prior.has(entry)) {
          failures.push(`baseline: ${entry} is listed, and the baseline at the merge base with ${TRUNK} does not list it: the baseline may fall and never rise (D-13, item 5).`)
        }
      }
    }
  }
  const scenario = new Map(derived.record.specs.map((spec: any) => [spec.id, spec]))
  for (const entry of derived.unmet) {
    if (listed.has(entry) && !derived.fresh.has(entry.split(':')[0])) continue
    const [id, role] = entry.split(':')
    const spec: any = scenario.get(id)
    const kind = role === 'happy' ? 'happy-path' : 'negative'
    const fix =
      role === 'happy'
        ? `write one citing \`${entry}@<hash>\``
        : `write one citing \`${entry}@<hash>\`, or declare \`no-negative:${id} "<reason>"\` on its happy-path test (D-13, item 10)`
    failures.push(
      `obligation: ${id} (${spec.capability}, "${spec.title}") has no ${kind} test at a layer \`${OBLIGATION_KEY}\` lists` +
        `${derived.fresh.has(id) ? ', and it is new or modified, which no baseline waives' : ''}; ${fix} (\`node scripts/test-trace.mjs cite ${entry}\`).`,
    )
  }
  const waived = derived.unmet.filter((entry) => listed.has(entry) && !derived.fresh.has(entry.split(':')[0])).length
  const summary =
    `${counted(derived.facts)}; ${count(derived.unmet.length, 'unmet obligation')}, ${waived} of them waived by the baseline;` +
    ` ${count(derived.advisories.length, 'negative test')} declared not applicable; ${count(changed, 'path')} under apps/ changed on this branch.`
  return { failures, advisories: derived.advisories, notes, summary }
}

/** `npm run trace`: write the record. Refuses to write what it cannot derive, or when the walk is wrong. */
export function emit(root: string, { ratified: already = false, walker = walk }: Guarded = {}): { wrote: boolean; message: string; findings: number } {
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) return { wrote: false, message: `${ratified}; refusing to write ${RECORD}.`, findings: 0 }
  const derived = derive(root)
  mkdirSync(dirname(join(root, RECORD)), { recursive: true })
  writeFileSync(join(root, RECORD), serialise(derived.record))
  writeFileSync(join(root, README), README_TEXT)
  return {
    wrote: true,
    message: `wrote ${RECORD} and ${README}: ${counted(derived.facts)}.`,
    findings: derived.findings.length,
  }
}

/** `npm run trace:update`: move the baseline down to the obligations still unmet that it may keep. */
export function update(root: string, { ratified: already = false, walker = walk }: Guarded = {}): { kept: string[]; dropped: string[]; refused: string[] } {
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) throw new Error(`${ratified}; refusing to write ${BASELINE}.`)
  const derived = derive(root)
  const git = gitIn(root)
  const prior = baseBaseline(git, mergeBase(git))
  const candidates = derived.unmet.filter((entry) => !derived.fresh.has(entry.split(':')[0]))
  const kept = candidates.filter((entry) => prior === null || prior.has(entry))
  const refused = sorted([...derived.unmet.filter((entry) => !kept.includes(entry))])
  const before = readText(join(root, BASELINE))
  const parsed = before === null ? null : parseBaseline(before)
  const was = parsed !== null && 'entries' in parsed ? parsed.entries : []
  mkdirSync(dirname(join(root, BASELINE)), { recursive: true })
  writeFileSync(join(root, BASELINE), baselineText(kept))
  return { kept: sorted(kept), dropped: sorted(was.filter((entry) => !kept.includes(entry))), refused }
}

/* --------------------------------------------------------------------------------- the CLI ------ */

function main(argv: string[]) {
  const root = process.env.TRACE_ROOT ? resolve(process.env.TRACE_ROOT) : REPO_ROOT
  const [flag, ...rest] = argv
  if (rest.length > 0 || (flag !== undefined && flag !== '--check' && flag !== '--update')) {
    console.error('usage: node tools/trace/trace.ts [--check | --update]')
    process.exit(1)
  }
  if (flag === '--check') {
    const { failures, advisories, notes, summary } = check(root)
    for (const note of notes) console.log(`note: ${note}`)
    for (const advisory of advisories) console.log(`advisory: ${advisory}`)
    if (failures.length === 0) {
      console.log(`trace:check: ${RECORD} is current and every rule holds: ${summary}`)
      process.exit(0)
    }
    console.error(`trace:check: ${failures.length} refusal(s)${summary ? ` over ${summary}` : '.'}\n`)
    for (const failure of failures) console.error(`  - ${failure}\n`)
    console.error('Each refusal names its rule; the header of tools/trace/trace.ts is its home.')
    process.exit(1)
  }
  try {
    if (flag === '--update') {
      const { kept, dropped, refused } = update(root)
      console.log(`trace:update: wrote ${BASELINE} with ${kept.length} entries; dropped ${dropped.length}${dropped.length ? `: ${dropped.join(', ')}` : ''}.`)
      if (refused.length > 0) {
        console.log(`It may not add ${refused.length}, which the baseline at the merge base does not list or whose scenario is new or modified; each is met in the change: ${refused.join(', ')}.`)
      }
      process.exit(0)
    }
    const { wrote, message, findings } = emit(root)
    if (!wrote) {
      console.error(`trace: ${message}`)
      process.exit(1)
    }
    console.log(`trace: ${message}${findings > 0 ? ` \`npm run trace:check\` refuses ${findings} finding(s) the record shows.` : ''}`)
  } catch (error) {
    console.error(`trace: ${(error as Error).message}`)
    process.exit(1)
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
