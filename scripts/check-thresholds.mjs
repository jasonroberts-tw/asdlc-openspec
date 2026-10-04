/**
 * Thresholds gate: the coverage of the code a branch changes under `apps/`, and the mutation score of
 * the Routines and Commands it changes, each held to its threshold and its minimum sample in
 * `tools/policy/tool-settings.json`, with a ratchet baseline, `artifacts/thresholds/baseline.json`,
 * of the mutants the product left undetected where it measured below a threshold when the gate
 * landed. This header is the one home of the rules behind the strategy's two thresholds and their
 * minimum samples (`docs/decisions.md` § D-13, items 8 and 9, and item 17's table; landed by
 * asdlc-openspec-j09.10).
 * What each metric counts is defined once, in `count-index.md` § Rates and metrics.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong or absent. Before it nothing measured either figure: a change could land code no test runs,
 * or tests that run it and assert nothing, and every gate would pass, since a test that passes
 * without the code it names looks exactly like one that proves it. Three measurements of the spike,
 * asdlc-openspec-j09.2, shape what it refuses. A module no test imports gets no coverage record at
 * all at the engines floor, so a changed file with no record counts as wholly uncovered here rather
 * than as absent. Node counts a comment line inside an executed range as covered, so one test over
 * `calculator.js` read 90.39% of its physical lines and 79.51% of its code lines; the gate counts
 * code lines. And one test read 79.51% of code lines covered where its mutation score was 41.50%,
 * which is why coverage alone is not the gate.
 *
 * WHAT IT MEASURES. The merge base with `origin/main` is the base, and the working tree against it is
 * the change: every line `git diff -U0` gives on the new side under `apps/`, and every line of a file
 * git does not track yet, so a module not yet added is not invisible. The files counted are those the
 * `code` globs of `thresholdScope` match and its `tests` globs do not.
 *
 *   - Coverage. Every test file the quoted patterns of a package script running
 *     `scripts/run-tests.mjs` match (as `tools/trace/trace.ts` reads them), and every one under a
 *     `--dir` of one (`scripts/lib/test-dirs.mjs`), runs once with Node's own
 *     coverage, through `runTests()`, which changes to the root because `run()` had no `cwd` option
 *     at 22.22.2, the floor before `docs/decisions.md` § D-34. The figures come from the runner's
 *     `test:coverage` summary, whose per-line and per-branch counts were the same at 22.22.2 and
 *     26.8.1; its lcov export was not (an instance at 22.22.2, a factory at 26.8.1 and at 24.21.0,
 *     the floor since), so none is written. `run()`'s own thresholds are not used: they
 *     judge totals, and the runner's `process.exit(0)` swallows them. A changed code line is a changed
 *     line holding a character outside a comment and outside whitespace, as `scanSource` reads the
 *     file, so a line inside a multi-line template literal counts as code; a changed branch is a
 *     branch Node reports starting on a changed line. The branch denominator moves with the tests:
 *     V8 reports the branches inside a function only once something runs it, so a count is printed
 *     with every rate. The whole product's figures, every code line counted as changed, are printed
 *     on every run and never gated (D-13, item 8).
 *   - Mutation. StrykerJS 10 makes the mutants and the count, and the build workflow's honesty lens
 *     is to judge only the ones this gate lists as undetected (asdlc-openspec-j09.2's notes, answer
 *     2; asdlc-openspec-4vo changes the lens). A Command is a file whose code the tests reach by
 *     spawning a process, each a key of `mutationCommands` with the test files its run runs; every
 *     other file counted is a Routine. The Routines' run uses the tap runner over every test file no
 *     Command lists, since a test file that spawns a server leaves it running when the tap runner
 *     kills that file's process on a failure (the spike found 30 such processes, one listening on
 *     every interface); a server started in the test's own process dies with it. The Commands' run
 *     uses the command runner, one mutant at a time, since at 13 at once 11 of 454 mutants changed
 *     outcome between two runs and at one none did, and the tap runner cannot see what a spawned
 *     process runs: 25 of `serve.js`'s 72 mutants were invisible to it. Every test process runs on
 *     the node that runs this gate, put first in PATH, since the tap runner spawns `node` from PATH.
 *     Stryker's sandbox holds `apps/` and `package.json` only, under the temporary directory. A
 *     Routine or Command is mutated over its changed lines alone, Stryker taking only the mutants
 *     that lie wholly inside them, so a change to a test file alone mutates nothing: the
 *     maintainer's choice of 2026-09-29 (asdlc-openspec-j09.10's notes), over mutating the file
 *     whole when its test changes, which catches a weakened test with no source line changed but
 *     costs a whole-file run on every test-only change. The score is Stryker's own: killed and timed
 *     out over those plus survived and without coverage; an invalid mutant, one whose test run
 *     errored, is left out, and so is one a comment ignores.
 *
 * WHAT IT REFUSES, each refusal opening with what it measured:
 *
 *   - `coverage: lines`, `coverage: branches`, and each mutation run over its changed code: a rate
 *     below its threshold in `thresholdPercents`; or, below its minimum sample in
 *     `thresholdMinSamples`, where no rate is given, any one uncovered, untaken or undetected.
 *   - `coverage`: a changed `node:coverage` directive with no reason, one that disables a range, and
 *     one that ignores more than the next line, which excuses a range under one reason as a
 *     `disable` does.
 *   - `mutation`: a mutant a `Stryker disable` comment ignores with no reason, and a changed
 *     `Stryker disable` without `next-line`, which silences every mutant after it with one reason.
 *   - `baseline`: below.
 *   - `policy`, `branch`: a policy without the gate's keys; a checkout with no `origin/main`, or a
 *     root that is not the top of one.
 *   - `suite`: a failing test, in the words of `scripts/run-tests.mjs`, since coverage over a failing
 *     suite measures the wrong thing. A mutation run whose first test run fails in Stryker's sandbox
 *     is refused under the run's own name, with Stryker's reason.
 *
 * WHERE A REASON IS WRITTEN. In the product's source, beside the line it excuses, in the directive
 * the tool that counts it already honours: `/* node:coverage ignore next *\/ // <reason>` for a line
 * no test can reach, one directive to a line, and `// Stryker disable next-line <mutators>: <reason>`
 * for a mutant no test should detect, such as an equivalent one. Node then leaves the line out of its
 * figures and Stryker reports the mutant as ignored, so the gate's figures and each tool's own agree;
 * the reason moves with its line and goes when the line does. Node honours the directive only spelled
 * exactly so, a block comment holding nothing else, so its reason is the line comment after it;
 * where Node recorded a file, a line it counted is counted whatever a comment says. The gate prints
 * every excused line and mutant as advisory, for the reviewer and the verification report. Where it
 * loses: the product's code carries the tools' comments, and a builder can write a reason as easily
 * as a reviewer can; review holds what the reason says. A statement over three lines that no test
 * can reach takes three directives, each with its reason. The alternative was a list in a file of
 * its own, which keeps the product's code clean and loses where an edit above a line moves every line
 * number it names, or leaves an entry behind for a line that is gone.
 *
 * THE RATCHET. `artifacts/thresholds/baseline.json` records where the product measured below a
 * threshold when the gate landed, as the epic's decision 4 has the trace's baseline record its unmet
 * obligations: the undetected mutants of each mutation run whose whole-product score fell below it.
 * An entry is a mutant's file, mutator, replacement, the code it replaces, and which occurrence of
 * that code in the file it is, counted over the file's text as committed beside the baseline. It
 * waives nothing, since the gate mutates changed lines alone: a listed mutant whose line a branch
 * changes is that branch's to answer for, counted as any mutant of changed code, as a modified
 * scenario meets every obligation (D-13, item 5), and the gate prints it as advisory. It may fall and
 * never rise. `thresholds:check` reads the merge base's baseline against the merge base's own text,
 * carries each entry through the diff's hunks to where its code now sits, and refuses a listed entry
 * that is not one carried so: one the merge base did not list, which is a rise; one whose line the
 * branch changed or removed; and one whose occurrence an edit elsewhere in its file has moved. Then
 * `npm run thresholds:update` re-keys what stays, drops what the branch changed, mutates the lines
 * of what stays and drops each now detected. It adds an entry only on the branch that creates the
 * baseline. Counted over the working tree alone, an occurrence moves when an earlier line holding the
 * same code is edited, and a later mutant of the same code can take a key an edit freed; counted in
 * the merge base's text and carried through the hunks, an entry names its own mutant or none. It is a
 * baseline of its own, not an entry kind of `artifacts/trace/baseline.json`: that one's
 * `trace:update` re-derives it from committed files in a third of a second, where this one's
 * creation needs a mutation run of minutes, and `trace:check` refuses an entry that is not a
 * scenario's obligation.
 *
 * THE CALCULATOR'S FIRST MEASUREMENT, 2026-09-28, with `--product` and `--commands --product` below,
 * over its code as origin/main has it at 6c79a6a and its tests as this gate's branch has them, every
 * code line counted as changed: code lines 97.74% (303 of 310 covered) and branches 94.27% (148 of
 * 157 taken), both above their threshold; the Routines 90.03% (343 of 381 detected, one invalid),
 * above it; and `serve.js`, its one Command, 77.78% (56 of 72), below it. The baseline lists the 16
 * undetected mutants of `serve.js`'s run, and none of the Routines'.
 *
 * NOT THIS GATE'S. Whether a surviving mutant matters, which the honesty lens judges from the list
 * this gate prints; a test deleted, skipped or weakened, which a change to a test file alone does not
 * reach here, since it mutates nothing: the test-inventory gate's (asdlc-openspec-j09.9), which
 * counts assertions and does not judge their strength; code outside `apps/`, a gate's own selftest
 * among it, which Stryker cannot mutate and the lens still does; and the whole product's figure,
 * which it prints and never gates.
 *
 * INVOCATION.
 *
 *   npm run thresholds:check            coverage and the changed Routines' mutants; pre-push and CI
 *   npm run thresholds:commands:check   the changed Commands' mutants; CI and change-verify only
 *   npm run thresholds:update           re-key the baseline to the branch's edits, and let it fall
 *   npm run thresholds:selftest         each refusal on a doctored fixture repository, beside a control
 *   node scripts/check-thresholds.mjs [--commands] --product
 *                                       every line of code counted as changed: the whole product's
 *                                       figures, which is how the first measurement was taken
 *
 * `THRESHOLDS_ROOT=<dir>` points the first three at a doctored copy, the top of a git checkout.
 *
 * WHERE IT RUNS, by what it reads (`CLAUDE.md` § The gate ladder). It reads committed files and git
 * history, runs the tests on loopback, and runs Stryker, which reads nothing outside the repository
 * at run time (its dashboard reporter would, and is never configured), so `thresholds:check` is a
 * pre-push job and a CI step. `thresholds:commands:check` is a CI step and a change-verify run and
 * not a pre-push job, an exception to the ladder the register records (`docs/decisions.md` § D-04,
 * its amendment of 2026-09-29, from the maintainer's answer 3 in asdlc-openspec-j09.2's notes;
 * asdlc-openspec-j09.14 added the run to `change-verify`, in `scripts/fresh-run.mjs`), for its cost: 181.05 s and
 * 185.99 s wall (`/usr/bin/time -p`, two runs) for all 72 of `serve.js`'s mutants one at a time, a
 * change to every line of it, on a macOS laptop (Apple M3 Max) with Node 26.8.1, 2026-09-28, where
 * the spike measured 182-213 s; a change to one of its lines, 3 mutants, took 19.02-19.04 s (two
 * runs, 2026-09-29), most of it the suite's first run. Where it loses: a push that leaves a mutant of a changed `serve.js`
 * line undetected passes pre-push and is refused minutes later in CI. It starts no Stryker when no
 * Command's code changed. `thresholds:check` costs the suite's one run with coverage, and the
 * Routines' mutants when their code changed; `git-hooks.yml` carries its measurement.
 *
 * NEEDS git and `origin/main` (a shallow clone has no merge base, so CI checks out with
 * `fetch-depth: 0`), the gate's keys in `tools/policy/tool-settings.json`, and
 * `@stryker-mutator/core` and `@stryker-mutator/tap-runner` (`npm ci`). No network.
 *
 * KIND: gate, and the emitter of the baseline: `thresholds:update` writes it, and the two checks
 *   write nothing.
 * INVARIANTS: no timestamp, commit id or randomness in the baseline; its list sorted by code point;
 *   one serialiser; an occurrence counted over the file's own text, whole.
 * RE-ENTRY: a second `thresholds:update` over the same tree writes the same bytes and drops nothing
 *   more, as long as Stryker's outcomes repeat, which they did over three runs of each runner on the
 *   calculator (the same 38 and 16 undetected).
 * STALE WHEN: a branch edits a file the baseline lists a mutant of, so that the mutant's line
 *   changes or its occurrence moves, which `thresholds:check` refuses until `thresholds:update` runs;
 *   or a test comes to detect a listed mutant, which only `thresholds:update` measures, and drops.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv } from '../tools/lib/git-env.ts'
import { POLICY_DIR, copyPolicy, readPolicy as readConstants } from '../tools/lib/policy.ts'
import { runTests } from './run-tests.mjs'
import { PACKAGE_JSON, TASKS_TOML, loadTasks, taskFiles } from './lib/tasks.mjs'
import { dirGlob, scriptDirs } from './lib/test-dirs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
/** The policy record that holds the gate's keys, named in each refusal about them; the keys are read from every record merged. */
const TOOL_SETTINGS = `${POLICY_DIR}/tool-settings.json`
export const BASELINE = 'artifacts/thresholds/baseline.json'
/** The trunk a branch is measured from (`CLAUDE.md` § Git workflow). */
const TRUNK = 'origin/main'
/** The runner whose quoted patterns in the tasks name the test files (the header of scripts/run-tests.mjs). */
const RUNNER = 'scripts/run-tests.mjs'
const KEYS = {
  percents: 'thresholdPercents',
  samples: 'thresholdMinSamples',
  scope: 'thresholdScope',
  commands: 'mutationCommands',
}
/** What Stryker writes as the reason of a mutant a `Stryker disable` comment ignores without one. */
const STRYKER_DEFAULT_REASON = 'Ignored using a comment'
/** Mutants of each outcome, as Stryker's own score counts them. */
const DETECTED = new Set(['Killed', 'Timeout'])
const UNDETECTED = new Set(['Survived', 'NoCoverage'])
const INVALID = new Set(['RuntimeError', 'CompileError'])
const BASELINE_BANNER = [
  'GENERATED by `npm run thresholds:update` (scripts/check-thresholds.mjs). Do not edit by hand: it lists the mutants the product left undetected where it measured below a threshold when the gate landed, and it may fall and never rise.',
  'Each entry is a mutant: its file, its mutator, its replacement, the code it replaces and which occurrence of that code in the file, as committed beside this baseline, it is. It waives nothing; the header of scripts/check-thresholds.mjs is the rule.',
]

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const percent = (part, whole) => `${((100 * part) / whole).toFixed(2)}%`
const lineCount = (text) => (text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0))
const allLines = (text) => new Set(Array.from({ length: lineCount(text) }, (_, n) => n + 1))
const posix = (path) => path.split('\\').join('/')

/* --------------------------------------------------------------------------------- policy ------- */

/** The gate's keys of the policy under `root`, or an Error naming the first that is wrong. */
export function readPolicy(root) {
  let policy
  try {
    policy = readConstants(root)
  } catch (error) {
    throw new Error(`${POLICY_DIR}/ cannot be read (${error.message}), so no threshold is known.`)
  }
  const whole = (value, low, high) => Number.isInteger(value) && value >= low && value <= high
  const percents = policy[KEYS.percents]
  if (!['branches', 'lines', 'mutation'].every((key) => whole(percents?.[key], 1, 100))) {
    throw new Error(`${TOOL_SETTINGS} has no whole percentage from 1 to 100 under each of \`${KEYS.percents}.lines\`, \`.branches\` and \`.mutation\`.`)
  }
  const samples = policy[KEYS.samples]
  if (!['branches', 'lines', 'mutants'].every((key) => whole(samples?.[key], 1, 1e6))) {
    throw new Error(`${TOOL_SETTINGS} has no whole number of at least 1 under each of \`${KEYS.samples}.lines\`, \`.branches\` and \`.mutants\`.`)
  }
  const scope = policy[KEYS.scope]
  const globs = (list) => Array.isArray(list) && list.length > 0 && list.every((glob) => typeof glob === 'string' && glob.startsWith('apps/'))
  if (!globs(scope?.code) || !globs(scope?.tests)) {
    throw new Error(`${TOOL_SETTINGS} has no \`${KEYS.scope}\` whose \`code\` and \`tests\` are each a list of globs under apps/.`)
  }
  const commands = policy[KEYS.commands]
  if (
    commands === null ||
    typeof commands !== 'object' ||
    Array.isArray(commands) ||
    Object.entries(commands).some(([file, tests]) => !file.startsWith('apps/') || !Array.isArray(tests) || tests.length === 0 || tests.some((test) => typeof test !== 'string'))
  ) {
    throw new Error(`${TOOL_SETTINGS} has no \`${KEYS.commands}\` object mapping each Command's file under apps/ to the test files its mutation run runs.`)
  }
  for (const key of Object.values(KEYS)) {
    if (typeof policy[`${key}Means`] !== 'string') throw new Error(`${TOOL_SETTINGS} has \`${key}\` and no \`${key}Means\` saying what it decides.`)
  }
  return { percents, samples, scope, commands }
}

/* --------------------------------------------------------------------------------- git ---------- */

function git(root, args) {
  const run = spawnSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, env: gitEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (run.error) throw new Error(`git could not start: ${run.error.message}`)
  if (run.status !== 0) throw new Error(`\`git ${args.join(' ')}\` failed: ${(run.stderr || run.stdout).trim()}`)
  return run.stdout
}

/** The merge base with the trunk, or an Error saying why there is none to measure from. */
function mergeBase(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']).trim()
  if (realpathSync(top) !== realpathSync(root)) {
    throw new Error(`${root} is not the top of a git checkout (git reads ${top} from there); point THRESHOLDS_ROOT at a checkout's top.`)
  }
  const verify = spawnSync('git', ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`], { cwd: root, env: gitEnv(), encoding: 'utf8' })
  if (verify.status !== 0) {
    throw new Error(`${TRUNK} is not a ref here, so what the branch changed cannot be measured: \`git fetch origin main\` (in CI, check out with \`fetch-depth: 0\`).`)
  }
  return git(root, ['merge-base', TRUNK, 'HEAD']).trim()
}

/**
 * What the branch changed under apps/, as the working tree has it against `base`: for each path, the
 * `-U0` hunks, the new-side lines they add or change, the old-side lines they change or remove, and
 * whether the file is new or gone. A file git does not track yet is new, every line of it changed,
 * so a module not yet added is not invisible.
 */
export function readDiff(root, base) {
  const out = git(root, ['diff', '-U0', '--no-color', '--no-ext-diff', '--no-renames', '--src-prefix=a/', '--dst-prefix=b/', base, '--', 'apps/'])
  const files = new Map()
  let from = null
  let current = null
  // A file's `---` and `+++` lines come between its `diff --git` line and its first hunk; inside a
  // hunk, a removed line of `-- x` reads `--- x` too.
  let header = false
  for (const line of out.split('\n')) {
    if (line.startsWith('diff --git ')) {
      header = true
      continue
    }
    if (header && line.startsWith('--- ')) {
      from = line === '--- /dev/null' ? null : line.slice('--- a/'.length)
      continue
    }
    if (header && line.startsWith('+++ ')) {
      header = false
      const to = line === '+++ /dev/null' ? null : line.slice('+++ b/'.length)
      current = { hunks: [], changed: new Set(), oldChanged: new Set(), added: from === null, deleted: to === null }
      files.set(to ?? from, current)
      continue
    }
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line)
    if (hunk && current !== null) {
      const h = { oldStart: Number(hunk[1]), oldCount: hunk[2] === undefined ? 1 : Number(hunk[2]), newStart: Number(hunk[3]), newCount: hunk[4] === undefined ? 1 : Number(hunk[4]) }
      current.hunks.push(h)
      for (let k = h.newStart; k < h.newStart + h.newCount; k++) current.changed.add(k)
      for (let k = h.oldStart; k < h.oldStart + h.oldCount; k++) current.oldChanged.add(k)
    }
  }
  for (const path of git(root, ['ls-files', '--others', '--exclude-standard', '-z', '--', 'apps/']).split('\0')) {
    if (path !== '') files.set(path, { hunks: [], changed: allLines(readFileSync(join(root, path), 'utf8')), oldChanged: new Set(), added: true, deleted: false })
  }
  return files
}

/** The new-side line numbers `diff` changes, per path still in the working tree. */
function changedOf(diff) {
  return new Map([...diff].filter(([, file]) => !file.deleted && file.changed.size > 0).map(([path, file]) => [path, file.changed]))
}

/**
 * Where the merge base's line `line` of a file sits in the working tree, carried through the
 * file's hunks, or null where the branch changed or removed it.
 */
function carryLine(file, line) {
  if (file === undefined) return line
  if (file.deleted || file.oldChanged.has(line)) return null
  let shift = 0
  for (const h of file.hunks) {
    const before = h.oldCount > 0 ? h.oldStart + h.oldCount - 1 < line : h.oldStart < line
    if (before) shift += h.newCount - h.oldCount
  }
  return line + shift
}

/* --------------------------------------------------------------------------------- sources ------ */

const KEYWORDS_BEFORE_REGEX = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await'])
/** The keywords whose parenthesised head a statement follows, after whose `)` a `/` opens a regular expression. */
const KEYWORDS_BEFORE_HEAD = new Set(['if', 'while', 'for', 'with'])

/**
 * What a JavaScript source holds, line by line: `code`, the lines with a character outside a
 * comment and outside whitespace, every line a string or template literal spans among them; and
 * `comments`, each comment with its first and last line, whether it is a block comment, its text,
 * and the text of a line comment that follows a block comment on its last line. A `/` opens a
 * regular expression after an operator, an opening bracket, a keyword such as `return`, the `)` that
 * closes an `if`, `while`, `for` or `with` head, or nothing, and divides after a name, a number or
 * any other closing bracket. Where it loses: a regular expression after a closing brace that ends an
 * object literal, or a division after one that ends a block, is read the other way round, which
 * matters only when what follows holds `//`, `/*`, a quote or a backquote.
 */
export function scanSource(text) {
  const code = new Set()
  const comments = []
  let line = 1
  let i = 0
  let prev = null
  let lastWord = null
  const parens = []
  const stack = []
  let depth = 0
  const n = text.length
  const mark = () => code.add(line)
  if (text.startsWith('#!')) while (i < n && text[i] !== '\n') i++
  while (i < n) {
    const c = text[i]
    if (c === '\n') {
      line++
      i++
      continue
    }
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '/' && text[i + 1] === '/') {
      const newline = text.indexOf('\n', i)
      const end = newline === -1 ? n : newline
      const body = text.slice(i + 2, end)
      const last = comments.at(-1)
      if (last?.block && last.endLine === line && last.trailing === null && /^[ \t]*$/.test(text.slice(last.end, i))) last.trailing = body.trim()
      comments.push({ line, endLine: line, block: false, text: body, trailing: null, end })
      i = end
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      const start = line
      const close = text.indexOf('*/', i + 2)
      const end = close === -1 ? n : close + 2
      const body = text.slice(i + 2, close === -1 ? n : close)
      for (const ch of body) if (ch === '\n') line++
      comments.push({ line: start, endLine: line, block: true, text: body, trailing: null, end })
      i = end
      continue
    }
    mark()
    const word = lastWord
    lastWord = null
    if (c === "'" || c === '"') {
      i++
      while (i < n && text[i] !== c && text[i] !== '\n') {
        if (text[i] === '\\') {
          i++
          if (text[i] === '\n') {
            line++
            mark()
          }
        }
        i++
      }
      i++
      prev = 'value'
      continue
    }
    // A template literal, opened by a backquote or resumed by the brace that closes a `${`.
    if (c === '`' || (c === '}' && stack.length > 0 && depth === stack.at(-1) + 1)) {
      if (c === '}') {
        stack.pop()
        depth--
      }
      i++
      while (i < n && text[i] !== '`') {
        if (text[i] === '\\') i++
        else if (text[i] === '$' && text[i + 1] === '{') break
        if (text[i] === '\n') {
          line++
          mark()
        }
        i++
      }
      if (text[i] === '$') {
        stack.push(depth)
        depth++
        i += 2
        prev = null
      } else {
        i++
        prev = 'value'
      }
      continue
    }
    if (c === '/') {
      i++
      if (prev === 'value') {
        prev = null
        continue
      }
      let inClass = false
      while (i < n && text[i] !== '\n') {
        if (text[i] === '\\') i++
        else if (text[i] === '[') inClass = true
        else if (text[i] === ']') inClass = false
        else if (text[i] === '/' && !inClass) break
        i++
      }
      i++
      while (i < n && /[a-z]/i.test(text[i])) i++
      prev = 'value'
      continue
    }
    if (/[A-Za-z0-9_$\u0080-\uffff]/.test(c)) {
      const start = i
      while (i < n && /[A-Za-z0-9_$.\u0080-\uffff]/.test(text[i])) i++
      lastWord = text.slice(start, i)
      prev = KEYWORDS_BEFORE_REGEX.has(lastWord) ? null : 'value'
      continue
    }
    if (c === '{') depth++
    if (c === '}') depth--
    if (c === '(') parens.push(KEYWORDS_BEFORE_HEAD.has(word))
    // The `)` of a statement's head is followed by a statement, where a `/` opens a regular expression.
    if (c === ')') prev = parens.pop() ? null : 'value'
    else prev = c === ']' ? 'value' : null
    i++
  }
  return { code, comments }
}

/**
 * The lines Node's coverage directives leave out, each with the directive that does it: `ignore
 * next` and `ignore next <n>` the line or lines after the comment's own, and `disable` every line
 * after it up to and including the `enable` that ends it, as Node 22.22.2 and 26.8.1 were measured to
 * do. Both honour only a block comment spelled exactly `/* node:coverage ignore next *\/`, one space
 * each side and between the words, and ignored `/*node:coverage ignore next*\/`, a doubled space and
 * `ignore next 1*\/`, so this reads that spelling alone. The reason is the text of a line comment
 * after the directive on the same line, or null.
 */
export function coverageDirectives(comments, total) {
  const ignored = new Map()
  const directives = []
  let open = null
  for (const comment of comments) {
    if (!comment.block) continue
    const match = /^ node:coverage (ignore next(?: (\d+))?|disable|enable) $/.exec(comment.text)
    if (!match) continue
    const kind = match[1].startsWith('ignore') ? 'ignore next' : match[1]
    const directive = { line: comment.endLine, kind, count: match[2] === undefined ? 1 : Number(match[2]), reason: comment.trailing || null }
    directives.push(directive)
    if (kind === 'ignore next') {
      for (let k = directive.line + 1; k <= directive.line + directive.count; k++) ignored.set(k, directive)
    } else if (kind === 'disable' && open === null) open = directive
    else if (kind === 'enable' && open !== null) {
      for (let k = open.line + 1; k <= directive.line; k++) ignored.set(k, open)
      open = null
    }
  }
  if (open !== null) for (let k = open.line + 1; k <= total; k++) ignored.set(k, open)
  return { ignored, directives }
}

/** A Stryker directive in a comment (`// Stryker disable next-line <mutators>: <reason>`), as its instrumenter reads one. */
const STRYKER_DIRECTIVE = /^\s?Stryker (disable|restore)(?: (next-line))? ([a-zA-Z, ]+)(?::(.+)?)?/

/* --------------------------------------------------------------------------------- scope -------- */

/**
 * The tree's tasks, read through `scripts/lib/tasks.mjs`. A tree with neither manifest throws, as a
 * missing `package.json` did before the loader: judged with no test patterns, it would pass.
 */
function tasksOf(root) {
  const manifest = loadTasks(root)
  if (manifest === null) throw new Error(`${root} has neither ${TASKS_TOML} nor ${PACKAGE_JSON}, so no test pattern can be read.`)
  return manifest.tasks
}

/** The quoted patterns of every task that runs the runner, as `tools/trace/trace.ts` reads them. */
function testPatterns(root) {
  const invocation = new RegExp(`node ${RUNNER.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}((?:\\s+"[^"]+")+)`, 'g')
  const patterns = []
  for (const command of Object.values(tasksOf(root))) {
    for (const call of command.matchAll(invocation)) for (const quoted of call[1].matchAll(/"([^"]+)"/g)) patterns.push(quoted[1])
  }
  return [...new Set(patterns)].sort(byCodePoint)
}

/** The `--dir` directories of every task that runs the runner (`scripts/lib/test-dirs.mjs`). */
const testDirs = (root) => scriptDirs(tasksOf(root))

/** Every file under `root` that the scope's `code` globs match and its `tests` globs do not. */
function scopeFiles(root, scope) {
  const tests = new Set(scope.tests.flatMap((glob) => globSync(glob, { cwd: root }).map(posix)))
  return new Set(scope.code.flatMap((glob) => globSync(glob, { cwd: root }).map(posix)).filter((file) => !tests.has(file)))
}

/* --------------------------------------------------------------------------------- judging ------ */

/**
 * One rate judged against its threshold and minimum sample: the line to print and the refusals.
 * Below the minimum sample no rate is given, and any one unit not counted good is refused, since a
 * rate over so few is not a rate (`count-index.md` § Rates and metrics).
 */
function judge({ label, good, total, min, threshold, unit, many = `${unit}s`, verb }) {
  const bad = total - good
  if (total < min) {
    return {
      line: `${label}: ${good} of ${plural(total, unit, many)} ${verb}; below the minimum sample of ${min}, so no rate is given.`,
      refusals: bad === 0 ? [] : [`${label}: ${plural(bad, unit, many)} not ${verb}, below the minimum sample of ${min}, where each one fails unless a directive excuses it with a reason; each is listed above.`],
    }
  }
  return {
    line: `${label}: ${good} of ${plural(total, unit, many)} ${verb}, ${percent(good, total)} against a threshold of ${threshold}%.`,
    refusals: (100 * good) / total >= threshold ? [] : [`${label}: ${percent(good, total)} of ${plural(total, unit, many)} ${verb}, below the threshold of ${threshold}%; each one not ${verb} is listed above.`],
  }
}

/**
 * Coverage of `changed` (each path to its changed line numbers) under `root`, judged from Node's
 * summary: what was counted, the refusals, and the lines to print.
 */
export function judgeCoverage(root, changed, inScope, summary, policy) {
  const records = new Map((summary?.files ?? []).map((file) => [posix(relative(root, file.path)), file]))
  const refusals = []
  const missed = []
  const untaken = []
  const excused = []
  const counts = { files: 0, lines: 0, linesHit: 0, branches: 0, branchesHit: 0 }
  for (const path of [...changed.keys()].sort(byCodePoint)) {
    if (!inScope.has(path)) continue
    counts.files++
    const text = readFileSync(join(root, path), 'utf8')
    const { code, comments } = scanSource(text)
    const { ignored, directives } = coverageDirectives(comments, lineCount(text))
    const mine = changed.get(path)
    for (const directive of directives) {
      if (!mine.has(directive.line)) continue
      if (directive.kind !== 'enable' && directive.reason === null) {
        refusals.push(`coverage: ${path}:${directive.line} holds a \`node:coverage ${directive.kind}\` directive with no reason; write it after the directive, as \`/* node:coverage ignore next */ // <reason>\`.`)
      }
      if (directive.kind === 'disable') {
        refusals.push(`coverage: ${path}:${directive.line} disables coverage up to an \`enable\`, excusing every line between with one reason; excuse each line with \`ignore next\` and its own reason.`)
      }
      if (directive.kind === 'ignore next' && directive.count > 1) {
        refusals.push(
          `coverage: ${path}:${directive.line} ignores the next ${directive.count} lines under one reason, as a \`disable\` would; excuse each line with its own` +
            ' `/* node:coverage ignore next */ // <reason>`.',
        )
      }
    }
    const record = records.get(path)
    const hits = new Map((record?.lines ?? []).map(({ line, count }) => [line, count]))
    for (const k of [...mine].sort((a, b) => a - b)) {
      if (!code.has(k)) continue
      const directive = ignored.get(k)
      // Where Node recorded the file, its own reading of the directives wins: a line it counted is counted.
      const counted = record !== undefined && hits.has(k)
      if (!counted && directive?.reason) {
        excused.push(`${path}:${k} excused from coverage (${directive.reason})`)
        continue
      }
      counts.lines++
      if (counted) {
        if (hits.get(k) > 0) counts.linesHit++
        else missed.push(`${path}:${k}`)
      } else if (record === undefined) missed.push(`${path}:${k}, in a file no test loads, so Node recorded no coverage for it`)
      else if (directive !== undefined) missed.push(`${path}:${k}, which the directive on line ${directive.line} ignores without a reason`)
      else missed.push(`${path}:${k}, which Node left out of its figures with no directive this gate reads`)
    }
    for (const { line, count } of record?.branches ?? []) {
      if (!mine.has(line) || !hits.has(line)) continue
      counts.branches++
      if (count > 0) counts.branchesHit++
      else untaken.push(`${path}:${line}`)
    }
  }
  const { percents, samples } = policy
  const lines = judge({ label: 'coverage: lines', good: counts.linesHit, total: counts.lines, min: samples.lines, threshold: percents.lines, unit: 'changed code line', verb: 'covered' })
  const branches = judge({ label: 'coverage: branches', good: counts.branchesHit, total: counts.branches, min: samples.branches, threshold: percents.branches, unit: 'changed branch', many: 'changed branches', verb: 'taken' })
  refusals.push(...lines.refusals, ...branches.refusals)
  const printed = [
    `coverage: ${plural(counts.files, 'changed file')} of code under apps/.`,
    lines.line,
    ...missed.map((entry) => `  uncovered: ${entry}`),
    branches.line,
    ...untaken.map((entry) => `  untaken: a branch at ${entry}`),
    ...excused.map((entry) => `  advisory: ${entry}`),
  ]
  return { refusals, printed, counts }
}

/* --------------------------------------------------------------------------------- mutants ------ */

function lineStarts(text) {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return starts
}

/** The one-based line of the offset `at`, by binary search over the lines' start offsets. */
function lineAt(starts, at) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (starts[mid] <= at) low = mid
    else high = mid - 1
  }
  return low + 1
}

/** How many times `code` occurs in `text` at an offset before `at`. */
function occurrencesBefore(text, code, at) {
  let seen = 0
  for (let from = text.indexOf(code); from !== -1 && from < at; from = text.indexOf(code, from + 1)) seen++
  return seen
}

/** The offset of an entry's code in `text`, at its occurrence, or -1 where it has none. */
function locate(text, entry) {
  if (entry.code === '') return -1
  let at = -1
  for (let k = 0; k < entry.occurrence; k++) {
    at = text.indexOf(entry.code, at + 1)
    if (at === -1) return -1
  }
  return at
}

const entryKey = (entry) => JSON.stringify([entry.file, entry.mutator, entry.replacement, entry.code, entry.occurrence])

/**
 * Each mutant of `results` as the gate reads it: its path, place and outcome, and its entry, the
 * file, mutator, replacement, the code it replaces and which occurrence of that code in the working
 * tree's text it is, which is what the baseline lists.
 */
export function readMutants(root, results) {
  const texts = new Map()
  const read = (path) => {
    if (!texts.has(path)) {
      const text = readFileSync(join(root, path), 'utf8')
      texts.set(path, { text, starts: lineStarts(text) })
    }
    return texts.get(path)
  }
  return results
    .map((result) => {
      const path = posix(relative(root, result.fileName))
      const { text, starts } = read(path)
      const { start, end } = result.location
      // Stryker's positions here are one-based, columns included.
      const from = starts[start.line - 1] + start.column - 1
      const code = text.slice(from, starts[end.line - 1] + end.column - 1)
      const entry = { file: path, mutator: result.mutatorName, replacement: result.replacement ?? '', code, occurrence: occurrencesBefore(text, code, from) + 1 }
      return { path, start, status: result.status, reason: result.statusReason ?? '', entry, key: entryKey(entry), text: `${path}:${start.line}:${start.column} ${result.mutatorName} ${JSON.stringify(result.replacement ?? '')} (${result.status})` }
    })
    .sort((a, b) => byCodePoint(a.path, b.path) || a.start.line - b.start.line || a.start.column - b.start.column || byCodePoint(a.key, b.key))
}

/** One mutation run's mutants, all of changed code, judged against the threshold and the minimum sample. */
export function judgeMutation(label, mutants, policy) {
  const refusals = []
  const advisories = []
  const detected = mutants.filter((mutant) => DETECTED.has(mutant.status))
  const undetected = mutants.filter((mutant) => UNDETECTED.has(mutant.status))
  const invalid = mutants.filter((mutant) => INVALID.has(mutant.status))
  const ignored = mutants.filter((mutant) => mutant.status === 'Ignored')
  for (const mutant of mutants) {
    if (!DETECTED.has(mutant.status) && !UNDETECTED.has(mutant.status) && !INVALID.has(mutant.status) && mutant.status !== 'Ignored') {
      refusals.push(`${label}: ${mutant.text} has an outcome this gate does not count; read Stryker's report and this file's header.`)
    }
  }
  for (const mutant of ignored) {
    const reason = mutant.reason.trim()
    if (reason === '' || reason === STRYKER_DEFAULT_REASON) {
      refusals.push(`${label}: ${mutant.text} is ignored by a \`Stryker disable\` comment that gives no reason; write it after a colon, as \`// Stryker disable next-line <mutator>: <reason>\`.`)
    } else advisories.push(`${mutant.text} excused (${reason})`)
  }
  const judgement = judge({ label, good: detected.length, total: detected.length + undetected.length, min: policy.samples.mutants, threshold: policy.percents.mutation, unit: 'mutant', verb: 'detected' })
  refusals.push(...judgement.refusals)
  const printed = [
    `${label}: ${plural(mutants.length, 'mutant')} of changed code; ${detected.length} detected, ${undetected.length} undetected, ${invalid.length} invalid (its test run errored, which the score leaves out), ${ignored.length} ignored by a comment.`,
    ...undetected.map((mutant) => `  undetected: ${mutant.text}`),
    judgement.line,
    ...advisories.map((entry) => `  advisory: ${entry}`),
  ]
  return { refusals, printed, counts: { mutants: mutants.length, detected: detected.length, undetected: undetected.length } }
}

/**
 * Run StrykerJS over `mutate` under `root` and return its mutant results. `runner` is `tap`, with the
 * test files `tests`, or `command`, running `tests` through `node --test` one mutant at a time. The
 * sandbox holds `apps/` and `package.json` only, under the temporary directory, and every test
 * process runs on the node that runs this gate.
 */
async function strykerRun(root, runner, mutate, tests) {
  const { Stryker } = await import('@stryker-mutator/core')
  const temp = mkdtempSync(join(tmpdir(), 'thresholds-stryker-'))
  const cwd = process.cwd()
  const path = process.env.PATH
  process.chdir(root)
  process.env.PATH = `${dirname(process.execPath)}${delimiter}${path ?? ''}`
  const options = {
    mutate,
    testRunner: runner,
    reporters: ['json'],
    jsonReporter: { fileName: join(temp, 'mutation.json') },
    logLevel: 'warn',
    fileLogLevel: 'off',
    tempDirName: join(temp, 'sandbox'),
    cleanTempDir: 'always',
    ignorePatterns: ['/*', '!/apps', '!/package.json'],
    incremental: false,
    ...(runner === 'tap'
      ? { tap: { testFiles: tests } }
      : { concurrency: 1, coverageAnalysis: 'off', commandRunner: { command: [JSON.stringify(process.execPath), '--test', ...tests.map((test) => JSON.stringify(test))].join(' ') } }),
  }
  try {
    return await new Stryker(options).runMutationTest()
  } finally {
    process.chdir(cwd)
    process.env.PATH = path
    rmSync(temp, { recursive: true, force: true })
  }
}

/** The runner and the test files that mutate `file`: a Command's own, or the Routines' tap run over every test file no Command lists. */
function runnerOf(file, policy, tests) {
  if (Object.hasOwn(policy.commands, file)) return { runner: 'command', tests: policy.commands[file] }
  const commandTests = new Set(Object.values(policy.commands).flat())
  return { runner: 'tap', tests: tests.filter((test) => !commandTests.has(test)) }
}

/**
 * The mutation runs of one kind, `routines` or `commands`, each `{ runner, tests, mutate, files }`:
 * a file mutated over the ranges `lines` gives it (its changed lines, as a check reads them), or
 * wholly where `whole` is set, grouped by the runner and test files that mutate it.
 */
function mutationRuns(kind, { policy, inScope, lines, tests, whole = false }) {
  const groups = new Map()
  for (const file of [...inScope].sort(byCodePoint)) {
    const run = runnerOf(file, policy, tests)
    if ((run.runner === 'command') !== (kind === 'commands')) continue
    if (!whole && !lines.has(file)) continue
    const key = JSON.stringify([run.runner, run.tests])
    if (!groups.has(key)) groups.set(key, { ...run, mutate: [], files: [] })
    const group = groups.get(key)
    group.files.push(file)
    group.mutate.push(...(whole ? [file] : mutateRanges(file, lines.get(file))))
  }
  return [...groups.values()]
}

/** A file's lines merged into Stryker's `<file>:<start>-<end>` ranges. */
function mutateRanges(path, lines) {
  const ranges = []
  let start = null
  let end = null
  for (const k of [...lines].sort((a, b) => a - b)) {
    if (start !== null && k === end + 1) end = k
    else {
      if (start !== null) ranges.push(`${path}:${start}-${end}`)
      start = end = k
    }
  }
  if (start !== null) ranges.push(`${path}:${start}-${end}`)
  return ranges
}

/* --------------------------------------------------------------------------------- baseline ----- */

/** The baseline file for `entries`, as `thresholds:update` writes it. */
export function baselineText(entries) {
  const sorted = [...entries].sort((a, b) => byCodePoint(entryKey(a), entryKey(b)))
  return `${JSON.stringify({ _: BASELINE_BANNER, undetected: sorted }, null, 2)}\n`
}

/** The entries of a baseline's text, or the reason it is not one. */
function parseBaseline(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { problem: `it is not JSON (${error.message})` }
  }
  const shape = (entry) =>
    entry !== null &&
    typeof entry === 'object' &&
    ['file', 'mutator', 'replacement', 'code'].every((key) => typeof entry[key] === 'string') &&
    entry.code !== '' &&
    Number.isInteger(entry.occurrence) &&
    entry.occurrence >= 1 &&
    Object.keys(entry).length === 5
  if (!Array.isArray(parsed?.undetected) || !parsed.undetected.every(shape)) {
    return { problem: 'it has no `undetected` list of entries, each a `file`, `mutator`, `replacement`, `code` and `occurrence`' }
  }
  return { entries: parsed.undetected }
}

/** The baseline under `root`: its entries, and each problem with the file itself. */
function readBaseline(root) {
  const path = join(root, BASELINE)
  if (!existsSync(path)) return { entries: [], problems: [`baseline: ${BASELINE} does not exist; run \`npm run thresholds:update\` and commit it.`] }
  const text = readFileSync(path, 'utf8')
  const parsed = parseBaseline(text)
  if ('problem' in parsed) return { entries: [], problems: [`baseline: ${BASELINE} cannot be read: ${parsed.problem}; \`npm run thresholds:update\` writes it.`] }
  const keys = parsed.entries.map(entryKey)
  const problems = []
  if (text !== baselineText(parsed.entries) || new Set(keys).size !== keys.length) {
    problems.push(`baseline: ${BASELINE} is not as \`npm run thresholds:update\` writes it; it is never edited by hand.`)
  }
  return { entries: parsed.entries, problems }
}

/** The baseline's entries at the merge base, or null where that commit has none. */
function baseBaseline(root, base) {
  const shown = spawnSync('git', ['show', `${base}:${BASELINE}`], { cwd: root, env: gitEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  if (shown.status !== 0) return null
  const parsed = parseBaseline(shown.stdout)
  if ('problem' in parsed) throw new Error(`${BASELINE} at the merge base ${base.slice(0, 12)} cannot be read: ${parsed.problem}.`)
  return parsed.entries
}

/**
 * The merge base's entries carried through the branch's edits: `kept`, each an entry still on a line
 * the branch leaves as it was, re-keyed to its occurrence in the working tree's text; `answered`,
 * each whose line the branch changed or removed, which that branch answers for; and `gone`, each
 * whose code the merge base's own text does not hold at its occurrence.
 */
function carry(root, base, diff, entries) {
  const baseTexts = new Map()
  const baseText = (file) => {
    if (!baseTexts.has(file)) {
      const shown = spawnSync('git', ['show', `${base}:${file}`], { cwd: root, env: gitEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      baseTexts.set(file, shown.status === 0 ? shown.stdout : null)
    }
    return baseTexts.get(file)
  }
  const kept = []
  const answered = []
  const gone = []
  for (const entry of entries) {
    const before = baseText(entry.file)
    const at = before === null ? -1 : locate(before, entry)
    if (at === -1) {
      gone.push(entry)
      continue
    }
    const starts = lineStarts(before)
    const first = lineAt(starts, at)
    const last = lineAt(starts, at + entry.code.length - 1)
    const file = diff.get(entry.file)
    const lines = []
    for (let k = first; k <= last; k++) lines.push(carryLine(file, k))
    if (lines.some((k) => k === null) || !existsSync(join(root, entry.file))) {
      answered.push(entry)
      continue
    }
    const after = readFileSync(join(root, entry.file), 'utf8')
    const moved = lineStarts(after)[lines[0] - 1] + (at - starts[first - 1])
    if (!after.startsWith(entry.code, moved)) {
      gone.push(entry)
      continue
    }
    kept.push({ ...entry, occurrence: occurrencesBefore(after, entry.code, moved) + 1 })
  }
  return { kept, answered, gone }
}

const describe = (entry) => `${entry.file}'s ${entry.mutator} mutant ${JSON.stringify(entry.replacement)} of ${JSON.stringify(entry.code)}, occurrence ${entry.occurrence},`

/* --------------------------------------------------------------------------------- the gate ----- */

/** What every command reads first: the policy, the files in scope, the test files and what changed. */
function setUp(root, { product }) {
  const policy = readPolicy(root)
  const inScope = scopeFiles(root, policy.scope)
  const tests = [...testPatterns(root), ...testDirs(root).map(dirGlob)]
    .flatMap((pattern) => globSync(pattern, { cwd: root }).map(posix))
    .sort(byCodePoint)
  if (product) {
    const changed = new Map([...inScope].map((path) => [path, allLines(readFileSync(join(root, path), 'utf8'))]))
    return { policy, inScope, tests, changed, diff: null, base: null, said: `the whole product: every line of ${plural(inScope.size, 'file')} of code under apps/ counts as changed.` }
  }
  const base = mergeBase(root)
  const diff = readDiff(root, base)
  const changed = changedOf(diff)
  const count = [...changed.keys()].filter((path) => inScope.has(path)).length
  return { policy, inScope, tests, changed, diff, base, said: `measured against the merge base ${base.slice(0, 12)} with ${TRUNK}: ${plural(count, 'file')} of code under apps/ changed.` }
}

/**
 * Every refusal of the gate under `root`, and the lines to print. `commands` measures the Commands'
 * mutants in place of the coverage and the Routines'; `product` counts every line of code as changed,
 * which is the whole product's figure. `stages` lets the selftest leave out a stage its case does
 * not measure.
 */
export async function check(given, { commands = false, product = false, stages = { coverage: true, mutation: true } } = {}) {
  // The real path, since Node's coverage and Stryker report files resolved: macOS's temporary directory is a link.
  const root = realpathSync(given)
  const printed = []
  const refusals = []
  let context
  try {
    context = setUp(root, { product })
  } catch (error) {
    return { refusals: [`${error.message.startsWith(POLICY_DIR) ? 'policy' : 'branch'}: ${error.message}`], printed }
  }
  const { policy, inScope, tests, changed, diff, base } = context
  printed.push(context.said)

  // A `Stryker disable` without `next-line` on a changed line silences every mutant after it.
  for (const path of [...changed.keys()].filter((file) => inScope.has(file)).sort(byCodePoint)) {
    for (const comment of scanSource(readFileSync(join(root, path), 'utf8')).comments) {
      const match = STRYKER_DIRECTIVE.exec(comment.text)
      if (match && match[1] === 'disable' && match[2] === undefined && changed.get(path).has(comment.line)) {
        refusals.push(`mutation: ${path}:${comment.line} disables mutants up to a \`restore\` with one reason; excuse each line with \`// Stryker disable next-line <mutator>: <reason>\`.`)
      }
    }
  }

  // The baseline, carried from the merge base through the branch's edits.
  if (!product && !commands) {
    const baseline = readBaseline(root)
    refusals.push(...baseline.problems)
    if (baseline.problems.length === 0) {
      try {
        const prior = baseBaseline(root, base)
        if (prior === null) {
          printed.push(`note: the merge base ${base.slice(0, 12)} has no ${BASELINE}, so no entry is held to it: this branch creates the baseline.`)
          for (const entry of baseline.entries) {
            const path = join(root, entry.file)
            if (!existsSync(path) || locate(readFileSync(path, 'utf8'), entry) === -1) refusals.push(`baseline: ${describe(entry)} is listed, and its file holds no such occurrence; \`npm run thresholds:update\` writes the baseline.`)
          }
        } else {
          const carried = carry(root, base, diff, prior)
          const kept = new Set(carried.kept.map(entryKey))
          for (const entry of baseline.entries) {
            if (kept.has(entryKey(entry))) continue
            refusals.push(
              `baseline: ${describe(entry)} is listed, and no entry of the baseline at the merge base with ${TRUNK} sits there once this branch's edits are carried through:` +
                ' a rise, which the baseline never takes (D-13, item 5), or an entry an edit to its file has moved or answered for. `npm run thresholds:update` re-keys what stays and drops the rest.',
            )
          }
          for (const entry of carried.answered) printed.push(`  advisory: ${describe(entry)} is listed at the merge base, on a line this branch changes or removes; the branch answers for it as for any mutant of changed code, and \`npm run thresholds:update\` drops it`)
          for (const entry of carried.gone) printed.push(`  advisory: ${describe(entry)} is listed at the merge base, where its file holds no such occurrence; \`npm run thresholds:update\` drops it`)
        }
      } catch (error) {
        refusals.push(`baseline: ${error.message}`)
      }
    }
  }

  if (!commands && stages.coverage) {
    const { failures, coverage } = await runTests(root, testPatterns(root), { coverage: { include: policy.scope.code, exclude: policy.scope.tests }, dirs: testDirs(root) })
    if (failures.length > 0) return { refusals: [...refusals, ...failures.map((failure) => `suite: it does not pass, so its coverage is not judged: ${failure}`)], printed }
    if (coverage === null) return { refusals: [...refusals, "suite: Node's test runner sent no coverage summary, so no line can be judged; this Node does not measure coverage through run()."], printed }
    const judged = judgeCoverage(root, changed, inScope, coverage, policy)
    refusals.push(...judged.refusals)
    printed.push(...judged.printed)
    if (!product) {
      const all = new Map([...inScope].map((path) => [path, allLines(readFileSync(join(root, path), 'utf8'))]))
      const { lines, linesHit, branches, branchesHit } = judgeCoverage(root, all, inScope, coverage, policy).counts
      printed.push(
        `the whole product, reported and not gated (D-13, item 8): ${linesHit} of ${plural(lines, 'code line')} covered${lines > 0 ? ` (${percent(linesHit, lines)})` : ''},` +
          ` ${branchesHit} of ${plural(branches, 'branch', 'branches')} taken${branches > 0 ? ` (${percent(branchesHit, branches)})` : ''}.`,
      )
    }
  }
  if (!stages.mutation) return { refusals, printed }

  const kind = commands ? 'Commands' : 'Routines'
  const label = `mutation of the ${kind}`
  const runs = mutationRuns(commands ? 'commands' : 'routines', { policy, inScope, lines: changed, tests })
  if (runs.length === 0) {
    printed.push(`${label}: no line of a ${kind === 'Commands' ? 'Command' : 'Routine'} changed, so no mutant is made; a change to a test alone mutates nothing (the header says why).`)
    return { refusals, printed }
  }
  const results = []
  for (const run of runs) {
    printed.push(`${label}: ${run.runner} runner over ${plural(run.tests.length, 'test file')}, mutating the changed lines of ${plural(run.files.length, 'file')}.`)
    try {
      results.push(...(await strykerRun(root, run.runner, run.mutate, run.tests)))
    } catch (error) {
      return { refusals: [...refusals, `${label}: Stryker could not run: ${error.message}`], printed }
    }
  }
  const judged = judgeMutation(label, readMutants(root, results), policy)
  return { refusals: [...refusals, ...judged.refusals], printed: [...printed, ...judged.printed] }
}

/**
 * `thresholds:update`. Where the merge base has a baseline: carry its entries through the branch's
 * edits, drop each the branch answers for or whose code is gone, mutate the lines of the rest, and
 * keep each still undetected, re-keyed to the working tree's text. Where it has none, on the branch
 * that creates it: mutate every Routine and Command wholly, and list the undetected mutants of each
 * run whose score falls below its threshold, or below its minimum sample with any undetected, on
 * lines the branch leaves as they were. Returns what it wrote and why each entry went.
 */
export async function update(given) {
  const root = realpathSync(given)
  const { policy, inScope, tests, changed, diff, base } = setUp(root, { product: false })
  const prior = baseBaseline(root, base)
  const write = (entries) => {
    mkdirSync(dirname(join(root, BASELINE)), { recursive: true })
    writeFileSync(join(root, BASELINE), baselineText(entries))
  }
  if (prior === null) {
    const entries = []
    const runs = []
    for (const kind of ['routines', 'commands']) {
      for (const run of mutationRuns(kind, { policy, inScope, lines: changed, tests, whole: true })) {
        const mutants = readMutants(root, await strykerRun(root, run.runner, run.mutate, run.tests))
        const detected = mutants.filter((mutant) => DETECTED.has(mutant.status)).length
        const undetected = mutants.filter((mutant) => UNDETECTED.has(mutant.status))
        const total = detected + undetected.length
        const below = total < policy.samples.mutants ? undetected.length > 0 : (100 * detected) / total < policy.percents.mutation
        runs.push({ runner: run.runner, files: run.files, detected, undetected: undetected.length, below })
        if (!below) continue
        for (const mutant of undetected) {
          const mine = changed.get(mutant.path) ?? new Set()
          const span = mutant.entry.code.split('\n').length
          let untouched = true
          for (let k = mutant.start.line; k < mutant.start.line + span; k++) if (mine.has(k)) untouched = false
          if (untouched) entries.push(mutant.entry)
        }
      }
    }
    write(entries)
    return { created: true, entries, runs, dropped: { answered: 0, gone: 0, detected: 0 } }
  }
  const carried = carry(root, base, diff, prior)
  const byFile = new Map()
  for (const entry of carried.kept) {
    const text = readFileSync(join(root, entry.file), 'utf8')
    const starts = lineStarts(text)
    const at = locate(text, entry)
    const lines = byFile.get(entry.file) ?? new Set()
    for (let k = lineAt(starts, at); k <= lineAt(starts, at + entry.code.length - 1); k++) lines.add(k)
    byFile.set(entry.file, lines)
  }
  const undetected = new Set()
  for (const kind of ['routines', 'commands']) {
    for (const run of mutationRuns(kind, { policy, inScope: new Set(byFile.keys()), lines: byFile, tests })) {
      for (const mutant of readMutants(root, await strykerRun(root, run.runner, run.mutate, run.tests))) if (UNDETECTED.has(mutant.status)) undetected.add(mutant.key)
    }
  }
  const entries = carried.kept.filter((entry) => undetected.has(entryKey(entry)))
  write(entries)
  return { created: false, entries, runs: [], dropped: { answered: carried.answered.length, gone: carried.gone.length, detected: carried.kept.length - entries.length } }
}

/* --------------------------------------------------------------------------------- the CLI ------ */

async function main(argv) {
  const root = process.env.THRESHOLDS_ROOT ? resolve(process.env.THRESHOLDS_ROOT) : REPO_ROOT
  const known = new Set(['--commands', '--product', '--update'])
  if (argv.some((arg) => !known.has(arg)) || (argv.includes('--update') && argv.length > 1)) {
    console.error('usage: node scripts/check-thresholds.mjs [--commands] [--product] | --update | --selftest')
    process.exit(1)
  }
  if (argv.includes('--update')) {
    try {
      const { created, entries, runs, dropped } = await update(root)
      if (created) {
        for (const run of runs) {
          console.log(`thresholds:update: the ${run.runner} runner over ${plural(run.files.length, 'file')}: ${run.detected} detected, ${run.undetected} undetected; ${run.below ? 'below the threshold, so its undetected mutants are listed' : 'at or above the threshold, so none is listed'}.`)
        }
      }
      console.log(
        `thresholds:update: wrote ${BASELINE} with ${plural(entries.length, 'entry', 'entries')}${created ? ', creating it' : ''}; dropped ${dropped.answered} on a line this branch changes,` +
          ` ${dropped.gone} whose code is gone and ${dropped.detected} now detected.`,
      )
      process.exit(0)
    } catch (error) {
      console.error(`thresholds:update: ${error.message}`)
      process.exit(1)
    }
  }
  const name = argv.includes('--commands') ? 'thresholds:commands:check' : 'thresholds:check'
  const { refusals, printed } = await check(root, { commands: argv.includes('--commands'), product: argv.includes('--product') })
  for (const line of printed) console.log(line)
  if (refusals.length === 0) {
    console.log(`${name}: every threshold holds.`)
    process.exit(0)
  }
  console.error(`\n${name}: ${plural(refusals.length, 'refusal')}.\n`)
  for (const refusal of refusals) console.error(`  - ${refusal}\n`)
  console.error('Each refusal names what it measured; the header of scripts/check-thresholds.mjs is its home.')
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

/**
 * The fixture: a repository laid out as the calculator is, so the live policy's scope and its one
 * Command apply unchanged. `public/calc.js` holds Routines, each an `if (x > n)` or a ternary on it,
 * and `serve.js` is a Command its test spawns. `twin`, `legacy` and `triplet` each hold `x > 5`, its
 * first, second and third occurrence; `legacy` alone is tested without its boundary, so one mutant of
 * it survives, and the merge base's baseline lists it at occurrence 2. Sized from the live minimum
 * samples, so the control's changed code is over each of them: a Routine `f`/`g` has four code
 * lines, at least two branches and seven mutants.
 */
function fixture(policy, hashLength) {
  const { samples } = policy
  const k = Math.max(Math.ceil(samples.lines / 4), Math.ceil(samples.branches / 2), Math.ceil(samples.mutants / 7)) + 1
  const hash = 'a'.repeat(hashLength)
  const fn = (name, n) => `export function ${name}(x) {\n  if (x > ${n}) return '${name}-a'\n  return '${name}-b'\n}\n`
  const ternary = (name) => `export const ${name} = (x) => (x > 5 ? '${name}-a' : '${name}-b')\n`
  let id = 0
  const test = (name, n, { boundary = true, above = true } = {}) => {
    id++
    const tag = `GRT-${String(id).padStart(3, '0')}`
    const lines = [...(above ? [`  assert.equal(${name}(${n + 1}), '${name}-a')`] : []), ...(boundary ? [`  assert.equal(${name}(${n}), '${name}-b')`] : []), `  assert.equal(${name}(${n - 1}), '${name}-b')`]
    return `// trace: ${tag}:happy@${hash}\ntest('[${tag}] ${name}', () => {\n${lines.join('\n')}\n})\n`
  }
  const head = (names) => `import assert from 'node:assert/strict'\nimport { test } from 'node:test'\nimport { ${names.join(', ')} } from '../public/calc.js'\n// trace-defaults: layer=functional level=1\n`
  const olds = Array.from({ length: k }, (_, n) => `f${n + 1}`)
  const news = Array.from({ length: k }, (_, n) => `g${n + 1}`)
  /** The Routines: `twin`, `legacy` unless left out, `triplet`, then `names`; and a comment appended to `twin`'s line, where given. */
  const calc = (names, { legacy = true, twinNote = '' } = {}) =>
    [ternary('twin').replace('\n', `${twinNote}\n`), ...(legacy ? [fn('legacy', 5)] : []), ternary('triplet'), ...names.map((name, n) => fn(name, n + 10))].join('\n')
  const calcTest = (names, options = {}, { legacy = true } = {}) =>
    [
      head(['twin', ...(legacy ? ['legacy'] : []), 'triplet', ...names]),
      test('twin', 5, options.twin ?? {}),
      ...(legacy ? [test('legacy', 5, { boundary: false, ...(options.legacy ?? {}) })] : []),
      test('triplet', 5, options.triplet ?? {}),
      ...names.map((name, n) => test(name, n + 10, options[name] ?? {})),
    ].join('\n')
  const serve = (n, words = ['big', 'small']) => `const n = Number(process.argv[2])\nif (n > ${n}) console.log('${words[0]}')\nelse console.log('${words[1]}')\n`
  const serveTest = (n, { boundary = true, words = ['big', 'small'] } = {}) => {
    const run = (value, word) => `  assert.equal(execFileSync(process.execPath, [SERVE, '${value}'], { encoding: 'utf8' }).trim(), '${word}')`
    const body = [run(n + 1, words[0]), ...(boundary ? [run(n, words[1])] : []), run(n - 1, words[1])].join('\n')
    return (
      "import assert from 'node:assert/strict'\nimport { execFileSync } from 'node:child_process'\nimport { test } from 'node:test'\nimport { fileURLToPath } from 'node:url'\n" +
      "// trace-defaults: layer=integration level=1\nconst SERVE = fileURLToPath(new URL('../serve.js', import.meta.url))\n" +
      `// trace: GRT-900:happy@${hash}\ntest('[GRT-900] serve', () => {\n${body}\n})\n`
    )
  }
  const legacyEntry = { file: 'apps/calculator/public/calc.js', mutator: 'EqualityOperator', replacement: 'x >= 5', code: 'x > 5', occurrence: 2 }
  const base = {
    ...taskFiles(PACKAGE_JSON, { 'calculator:test': 'node scripts/run-tests.mjs "apps/calculator/test/*.test.js"' }, { type: 'module' }),
    'apps/calculator/public/calc.js': calc(olds),
    'apps/calculator/serve.js': serve(3),
    'apps/calculator/test/calc.test.js': calcTest(olds),
    'apps/calculator/test/serve.test.js': serveTest(3),
    [BASELINE]: baselineText([legacyEntry]),
  }
  // The control's branch: the new Routines g1..gk, each tested wholly, beside the old ones.
  const branch = { 'apps/calculator/public/calc.js': calc([...olds, ...news]), 'apps/calculator/test/calc.test.js': calcTest([...olds, ...news]) }
  return { hash, k, olds, news, calc, calcTest, serve, serveTest, fn, base, branch, legacyEntry }
}

const SELFTEST_GIT_ENV = () => ({ ...gitEnv(), GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' })

function gitSelftest(dir, args) {
  const run = spawnSync('git', ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env: SELFTEST_GIT_ENV(), encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`git ${args.join(' ')} failed in the fixture: ${run.stderr}`)
  return run.stdout
}

function writeTree(dir, files) {
  for (const [path, body] of Object.entries(files)) {
    const target = join(dir, path)
    if (body === null) {
      rmSync(target, { force: true })
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, body)
  }
}

/**
 * The cases, each doctoring one thing of the control's branch. `expect` is `pass` or the expression
 * one refusal must match; `printed`, where given, one printed line must match too. `stages` leaves
 * out a stage the case does not measure, `commands` runs the Commands' check, `update` runs
 * `thresholds:update` and holds what it writes, `git` runs a git command in the copy first, and
 * `scan` holds the reader's code lines for a source.
 */
function cases(f, policy) {
  const { percents, samples } = policy
  const only = { coverage: { coverage: true, mutation: false }, mutation: { coverage: false, mutation: true }, none: { coverage: false, mutation: false } }
  const withNew = (extraCalc, extraTest = '') => ({ 'apps/calculator/public/calc.js': f.calc(f.olds) + `\n${extraCalc}`, 'apps/calculator/test/calc.test.js': f.calcTest(f.olds) + extraTest })
  const g = f.fn('g1', 50)
  const gTest = (options) => {
    const lines = [...(options.above === false ? [] : ["  assert.equal(g1(51), 'g1-a')"]), ...(options.boundary === false ? [] : ["  assert.equal(g1(50), 'g1-b')"]), "  assert.equal(g1(49), 'g1-b')"]
    return `import { g1 } from '../public/calc.js'\n// trace: GRT-800:happy@${f.hash}\ntest('[GRT-800] g1', () => {\n${lines.join('\n')}\n})\n`
  }
  const excuse = (reason) => `/* node:coverage ignore next */ // ${reason}\n`
  const gExcused = `export function g1(x) {\n  ${excuse('reached only by hand, in this fixture')}  if (x > 50) return 'g1-a'\n  ${excuse('reached only by hand, in this fixture')}  return 'g1-b'\n${excuse('reached only by hand, in this fixture')}}\n`
  const strengthened = f.calcTest(f.olds, { legacy: { boundary: true } })
  const lineRefusal = new RegExp(`^coverage: lines: [\\d.]+% of \\d+ changed code lines covered, below the threshold of ${percents.lines}%`)
  const branchRefusal = new RegExp(`^coverage: branches: [\\d.]+% of \\d+ changed branches taken, below the threshold of ${percents.branches}%`)
  const lineSample = new RegExp(`^coverage: lines: \\d+ changed code lines? not covered, below the minimum sample of ${samples.lines}`)
  const mutantSample = (kind) => new RegExp(`^mutation of the ${kind}: \\d+ mutants? not detected, below the minimum sample of ${samples.mutants}`)
  const notCarried = (occurrence) => new RegExp(`^baseline: apps/calculator/public/calc\\.js's EqualityOperator mutant "x >= 5" of "x > 5", occurrence ${occurrence}, is listed, and no entry of the baseline at the merge base`)
  return [
    {
      name: 'control: the branch adds Routines, each covered and every mutant detected, over every minimum sample',
      files: f.branch,
      expect: 'pass',
      printed: new RegExp(`^mutation of the Routines: ${f.k * 7} mutants of changed code; ${f.k * 7} detected, 0 undetected`),
    },
    {
      name: 'a new Routine no test calls, so its changed lines fall below the line threshold',
      files: { ...f.branch, 'apps/calculator/test/calc.test.js': f.calcTest([...f.olds, ...f.news.slice(0, -1)]) },
      stages: only.coverage,
      expect: lineRefusal,
    },
    {
      name: 'two new Routines never take their first branch, so the changed branches fall below the branch threshold',
      files: { ...f.branch, 'apps/calculator/test/calc.test.js': f.calcTest([...f.olds, ...f.news], { g1: { above: false }, g2: { above: false } }) },
      stages: only.coverage,
      expect: branchRefusal,
    },
    { name: 'below the line sample, one uncovered changed line fails', files: withNew(g), stages: only.coverage, expect: lineSample },
    {
      name: 'below the line sample, the uncovered lines excused one by one, each with a reason, pass',
      files: withNew(gExcused),
      stages: only.coverage,
      expect: 'pass',
      printed: /^ {2}advisory: apps\/calculator\/public\/calc\.js:\d+ excused from coverage \(reached only by hand, in this fixture\)$/,
    },
    { name: 'a directive spelled as Node does not honour it excuses nothing', files: withNew(`/*node:coverage ignore next 4*/ // reached only by hand, in this fixture\n${g}`), stages: only.coverage, expect: lineSample },
    { name: 'a coverage directive with no reason', files: withNew(`/* node:coverage ignore next */\n${g}`), stages: only.coverage, expect: /holds a `node:coverage ignore next` directive with no reason/ },
    {
      name: 'a coverage directive that ignores several lines under one reason',
      files: withNew(`/* node:coverage ignore next 4 */ // reached only by hand, in this fixture\n${g}`),
      stages: only.coverage,
      expect: /ignores the next 4 lines under one reason, as a `disable` would/,
    },
    { name: 'a coverage directive that disables a range', files: withNew(`/* node:coverage disable */ // not reached\n${g}/* node:coverage enable */\n`), stages: only.coverage, expect: /disables coverage up to an `enable`/ },
    {
      name: 'a changed file no test loads counts as uncovered',
      files: { 'apps/calculator/public/unloaded.js': "export const unloaded = () => 'never'\n" },
      stages: only.coverage,
      expect: lineSample,
      printed: /uncovered: apps\/calculator\/public\/unloaded\.js:1, in a file no test loads/,
    },
    ...[PACKAGE_JSON, TASKS_TOML].map((file) => ({
      name: `a changed Routine that only a test under a --dir directory runs counts as covered, the tasks in ${file}`,
      files: {
        ...withNew(g),
        ...taskFiles(file, { 'calculator:test': 'node scripts/run-tests.mjs "apps/calculator/test/*.test.js"', 'calculator:test:independent': 'node scripts/run-tests.mjs --dir apps/calculator/test/independent' }, { type: 'module' }),
        'apps/calculator/test/independent/contract/g1.test.js': `import assert from 'node:assert/strict'\nimport { test } from 'node:test'\n// trace-defaults: layer=contract level=1\n${gTest({}).replace("'../public/calc.js'", "'../../../public/calc.js'")}`,
      },
      stages: only.coverage,
      expect: 'pass',
    })),
    { name: 'a change of comments only has no code line, and passes with its counts', files: withNew('// a note on the Routines above\n'), stages: only.coverage, expect: 'pass', printed: /^coverage: lines: 0 of 0 changed code lines covered; below the minimum sample/ },
    { name: 'a failing test fails the gate before any coverage is judged', files: withNew(g, `\n// trace: GRT-801:happy@${f.hash}\ntest('[GRT-801] wrong', () => { assert.equal(1, 2) })\n`), stages: only.coverage, expect: /^suite: it does not pass, so its coverage is not judged: 1 test\(s\) failed/ },
    {
      name: "a failing test's refusal names it, since a coverage run prints no report",
      files: withNew(g, `\n// trace: GRT-801:happy@${f.hash}\ntest('[GRT-801] wrong', () => { assert.equal(1, 2) })\n`),
      stages: only.coverage,
      expect: /^suite: it does not pass, so its coverage is not judged: 1 test\(s\) failed: apps\/calculator\/test\/calc\.test\.js:\d+ "\[GRT-801\] wrong" \(Expected values to be strictly equal/,
    },
    { name: 'no origin/main to measure from', files: f.branch, git: ['update-ref', '-d', 'refs/remotes/origin/main'], stages: only.none, expect: /^branch: origin\/main is not a ref here/ },
    { name: 'a policy without the thresholds', files: { ...f.branch, [TOOL_SETTINGS]: '{}\n' }, stages: only.none, expect: /^policy: tools\/policy\/tool-settings\.json has no whole percentage from 1 to 100 under each of `thresholdPercents/ },
    {
      name: 'two of the new Routines untested, so their mutants fall below the mutation threshold',
      files: { ...f.branch, 'apps/calculator/test/calc.test.js': f.calcTest([...f.olds, ...f.news.slice(0, -2)]) },
      stages: only.mutation,
      expect: new RegExp(`^mutation of the Routines: [\\d.]+% of \\d+ mutants detected, below the threshold of ${percents.mutation}%`),
    },
    { name: 'below the mutant sample, one surviving mutant fails', files: withNew(g, `\n${gTest({ boundary: false })}`), stages: only.mutation, expect: mutantSample('Routines') },
    {
      name: 'below the mutant sample, the survivor excused with a reason passes',
      files: withNew(g.replace('  if', '  // Stryker disable next-line EqualityOperator: the boundary is not specified, in this fixture\n  if'), `\n${gTest({ boundary: false })}`),
      stages: only.mutation,
      expect: 'pass',
      printed: /advisory: .*EqualityOperator .* excused \(the boundary is not specified, in this fixture\)/,
    },
    {
      name: 'a mutant ignored by a comment with no reason',
      files: withNew(g.replace('  if', '  // Stryker disable next-line EqualityOperator\n  if'), `\n${gTest({ boundary: false })}`),
      stages: only.mutation,
      expect: /is ignored by a `Stryker disable` comment that gives no reason/,
    },
    { name: 'a Stryker disable without next-line', files: withNew(`// Stryker disable all: every mutant below\n${g}`), stages: only.none, expect: /disables mutants up to a `restore` with one reason/ },
    {
      name: "a change to a test alone mutates nothing, a dropped assertion among it, which the inventory gate holds",
      files: { 'apps/calculator/test/calc.test.js': f.calcTest(f.olds, { f1: { boundary: false } }) },
      stages: only.mutation,
      expect: 'pass',
      printed: /^mutation of the Routines: no line of a Routine changed, so no mutant is made; a change to a test alone mutates nothing/,
    },
    {
      name: 'an edit to an earlier line holding a listed mutant\'s code leaves the entry where it was',
      files: { 'apps/calculator/public/calc.js': f.calc(f.olds, { twinNote: ' // the twin of legacy' }) },
      stages: only.none,
      expect: 'pass',
    },
    {
      name: "a listed mutant's function removed leaves its entry refused, not moved onto the next occurrence of its code",
      files: { 'apps/calculator/public/calc.js': f.calc(f.olds, { legacy: false }), 'apps/calculator/test/calc.test.js': f.calcTest(f.olds, {}, { legacy: false }) },
      stages: only.none,
      expect: notCarried(2),
      printed: /advisory: apps\/calculator\/public\/calc\.js's EqualityOperator mutant "x >= 5" of "x > 5", occurrence 2, is listed at the merge base, on a line this branch changes or removes/,
    },
    { name: 'a baseline entry the merge base does not list', files: { [BASELINE]: baselineText([f.legacyEntry, { ...f.legacyEntry, occurrence: 3 }]) }, stages: only.none, expect: notCarried(3) },
    { name: 'a baseline edited by hand', files: { [BASELINE]: baselineText([f.legacyEntry]).replace('\n  "undetected"', '\n\n  "undetected"') }, stages: only.none, expect: /is not as `npm run thresholds:update` writes it/ },
    { name: 'no baseline', files: { [BASELINE]: null }, stages: only.none, expect: /^baseline: artifacts\/thresholds\/baseline\.json does not exist/ },
    { name: 'update drops a listed mutant a test now detects', files: { 'apps/calculator/test/calc.test.js': strengthened }, update: { keep: [], dropped: { answered: 0, gone: 0, detected: 1 } } },
    {
      name: "update drops the entry of a function the branch removes, and lists no later survivor of the same code in its place",
      files: { 'apps/calculator/public/calc.js': f.calc(f.olds, { legacy: false }), 'apps/calculator/test/calc.test.js': f.calcTest(f.olds, { triplet: { boundary: false } }, { legacy: false }) },
      update: { keep: [], dropped: { answered: 1, gone: 0, detected: 0 } },
    },
    {
      name: 'update re-keys an entry an edit above it moves, to its occurrence in the working tree',
      files: { 'apps/calculator/public/calc.js': f.calc(f.olds).replace(`export const twin = (x) => (x > 5 ? 'twin-a' : 'twin-b')\n`, `export const twin = (x) => (x >= 6 ? 'twin-a' : 'twin-b')\n`) },
      update: { keep: [{ ...f.legacyEntry, occurrence: 1 }], dropped: { answered: 0, gone: 0, detected: 0 } },
    },
    {
      name: 'update, where the merge base has no baseline, lists the undetected mutants of a run below its threshold and none of a run above it',
      files: { 'apps/calculator/test/calc.test.js': f.calcTest([]) },
      git: ['rm', '-q', BASELINE],
      commit: true,
      update: { created: true, onlyFile: 'apps/calculator/public/calc.js' },
    },
    { name: "control: the Command's changed line, every mutant detected", files: { 'apps/calculator/serve.js': f.serve(3, ['large', 'small']), 'apps/calculator/test/serve.test.js': f.serveTest(3, { words: ['large', 'small'] }) }, commands: true, expect: 'pass' },
    { name: "the Command's changed line leaves a mutant undetected, below the mutant sample", files: { 'apps/calculator/serve.js': f.serve(4), 'apps/calculator/test/serve.test.js': f.serveTest(4, { boundary: false }) }, commands: true, expect: mutantSample('Commands') },
    {
      // Each added line makes about five mutants and its test detects two, those that print for 2 to 4.
      name: "the Command's added lines, over the mutant sample, fall below the mutation threshold",
      files: { 'apps/calculator/serve.js': f.serve(3) + Array.from({ length: Math.ceil(samples.mutants / 5) + 2 }, (_, n) => `if (n > ${100 * (n + 1)}) console.log('over ${100 * (n + 1)}')\n`).join('') },
      commands: true,
      expect: new RegExp(`^mutation of the Commands: [\\d.]+% of \\d+ mutants detected, below the threshold of ${percents.mutation}%`),
    },
    {
      name: 'the reader takes a / after the head of an if, a while or a for for a regular expression',
      scan: { text: "if (a) /'/.test(b)\n// a comment\nif (c) /`/.test(d)\n// another\nwhile (e) /\\/*/.test(f)\n// a third\nx()\n", code: [1, 3, 5, 7] },
    },
  ]
}

async function selftest() {
  const started = Date.now()
  const policy = readPolicy(REPO_ROOT)
  const hashLength = readConstants(REPO_ROOT).testTraceHashLength
  const f = fixture(policy, hashLength)
  const temp = mkdtempSync(join(tmpdir(), 'thresholds-selftest-'))
  const results = []
  let untrusted = null
  try {
    const base = join(temp, 'base')
    writeTree(base, f.base)
    copyPolicy(REPO_ROOT, base)
    gitSelftest(base, ['init', '-q', '-b', 'main'])
    gitSelftest(base, ['add', '-A'])
    gitSelftest(base, ['commit', '-q', '-m', 'base'])
    gitSelftest(base, ['update-ref', 'refs/remotes/origin/main', 'HEAD'])
    for (const [n, testCase] of cases(f, policy).entries()) {
      if (testCase.scan) {
        const got = [...scanSource(testCase.scan.text).code].sort((a, b) => a - b)
        const ok = got.join(',') === testCase.scan.code.join(',')
        results.push({ name: testCase.name, ok, detail: ok ? `reads code on lines ${got.join(', ')}` : `reads code on lines ${got.join(', ')}, where ${testCase.scan.code.join(', ')} hold it` })
        continue
      }
      const dir = join(temp, `case-${n}`)
      cpSync(base, dir, { recursive: true })
      if (testCase.git) gitSelftest(dir, testCase.git)
      if (testCase.commit) {
        gitSelftest(dir, ['commit', '-q', '-m', 'the merge base, doctored'])
        gitSelftest(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD'])
      }
      writeTree(dir, testCase.files)
      if (testCase.update) {
        const want = testCase.update
        const got = await update(dir)
        const written = readFileSync(join(dir, BASELINE), 'utf8')
        const parsed = parseBaseline(written)
        let ok = 'entries' in parsed && written === baselineText(parsed.entries)
        if (want.created) ok = ok && got.created && got.entries.length > 0 && got.entries.every((entry) => entry.file === want.onlyFile) && got.runs.some((run) => !run.below)
        else ok = ok && !got.created && written === baselineText(want.keep) && JSON.stringify(got.dropped) === JSON.stringify(want.dropped)
        const shown = got.entries.slice(0, 3).map((entry) => `${entry.file} ${JSON.stringify(entry.code)} at occurrence ${entry.occurrence}`)
        const detail = `wrote ${plural(got.entries.length, 'entry', 'entries')} (${shown.join('; ') || 'none'}${got.entries.length > 3 ? '; ...' : ''}), dropped ${JSON.stringify(got.dropped)}`
        results.push({ name: testCase.name, ok, detail })
        continue
      }
      const { refusals, printed } = await check(dir, { commands: testCase.commands ?? false, stages: testCase.stages ?? { coverage: true, mutation: true } })
      let ok = testCase.expect === 'pass' ? refusals.length === 0 : refusals.some((refusal) => testCase.expect.test(refusal))
      let detail = ok ? (testCase.expect === 'pass' ? 'passes' : `refused for that reason (${plural(refusals.length, 'refusal')})`) : refusals.length === 0 ? 'PASSED, but should have been refused' : `refused, but not for that reason: ${refusals.join(' | ')}`
      if (ok && testCase.printed && !printed.some((line) => testCase.printed.test(line))) {
        ok = false
        detail = `does not print ${testCase.printed}: ${printed.join(' | ')}`
      }
      results.push({ name: testCase.name, ok, detail })
      if (testCase.name.startsWith('control') && !ok) {
        untrusted = `${testCase.name} -- ${detail}`
        break
      }
    }
    if (untrusted !== null) return
    // The command line, through the root override, on a copy with no trunk to measure from.
    const cli = join(temp, 'cli')
    cpSync(base, cli, { recursive: true })
    gitSelftest(cli, ['update-ref', '-d', 'refs/remotes/origin/main'])
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, THRESHOLDS_ROOT: cli }, encoding: 'utf8' })
    const cliOk = run.status === 1 && /branch: origin\/main is not a ref here/.test(run.stderr)
    results.push({ name: 'the command line reads THRESHOLDS_ROOT and exits 1 with the reason', ok: cliOk, detail: cliOk ? 'refused for that reason' : `exit ${run.status}: ${run.stderr.trim()}` })
  } finally {
    // Cleaned up before any exit, which a `finally` would not outlive.
    rmSync(temp, { recursive: true, force: true })
    if (untrusted !== null) {
      console.error(`selftest: the control does not hold, so no case can be trusted: ${untrusted}`)
      process.exit(1)
    }
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  console.log(`thresholds selftest: ${results.length - failed.length}/${results.length} cases hold (two controls, ${results.length - 2} doctored), in ${((Date.now() - started) / 1000).toFixed(1)} s.`)
  process.exit(failed.length === 0 ? 0 : 1)
}

if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) await selftest()
  else await main(argv)
}
