/**
 * Test runner: runs Node's own test runner over the files the given patterns match, prints its usual
 * report, and fails the run when a test fails, when a pattern matches no file, or when a matched file
 * declares no test. It also reads every matched file through `scripts/test-trace.mjs`, whose header
 * is the home of the convention each test's name and `// trace:` line follow, and fails the run on
 * any metadata that reader refuses and on any test that it and the runner do not both see.
 *
 * THE FAILURE IT EXISTS TO PREVENT. `node --test` passes a run that tested nothing, and no flag of it
 * refuses one. On 2026-09-23 a quoted pattern that matched no file printed `tests 0` and exited 0
 * (asdlc-openspec-frm). On 2026-09-25, with Node 26.8.1, a file that matched the pattern and declared
 * no test was reported as ONE PASSING TEST, named for the file's own path (`tests 1`, `pass 1`, exit
 * 0), so a guard on the reported total would not see it either. `npm run calculator:test`, its
 * pre-push job and its CI step ran `node --test` directly, and could read green over a suite that ran
 * nothing. `check:jobs` has refused a package script's quoted pattern that matches no file since
 * asdlc-openspec-zgh.5; nothing refused the file that matches and holds no test.
 *
 * The cross-check with the reader has no incident yet; this is what it would let through without it.
 * The trace gate and the test-inventory gate read tests from source, through that reader, since they
 * run no test (asdlc-openspec-j09.7, asdlc-openspec-j09.9). A test the reader cannot see, one made in
 * a loop, by a helper or inside another test's body, would then run here and be missing there: a
 * scenario it proves would count as unproved, and its removal would go unnoticed. A test the reader
 * sees and the runner never registers, one under an `if`, would count as a proof that never runs.
 *
 * WHAT IT COUNTS. For each matched file, every `test:pass` and `test:fail` event of kind `test` the
 * runner reports for it, except the one named for the file's own path, which stands for the file
 * itself and is the only event a file with no test produces. A skipped or todo test counts, because
 * it is declared; a suite (`describe`) is not a test. A failure is any `test:fail` that is not a todo
 * test, which is the rule `node --test` exits by; a file that throws on load fails that way. A suite
 * or test that fails only because a subtest failed is not counted again, and each failure is named
 * by its file, line, name and the first line of its error: a run with no reporter, the coverage run
 * `scripts/check-thresholds.mjs` makes, prints nothing else. On 2026-09-29 that run refused a pre-push
 * with "2 test(s) failed; the report above names each one" over no report at all, where one failing
 * test inside a suite counts two (asdlc-openspec-j09.10).
 *
 * WHAT IT COMPARES. For each matched file that reports a test, the tests the reader reads and the
 * tests the runner reports, each keyed by the line of its call, where the runner places even a call
 * written over several lines, and its name, counted as a multiset, so one call the runner reports
 * twice, as a loop makes it, is refused. A file that reports none is refused above already.
 *
 * A DIRECTORY. `--dir <dir>` runs every file whose name ends in `.test.js` at any depth under
 * `<dir>`, which must be a directory; one that holds no such file yet passes and says so. Since
 * asdlc-openspec-j09.11, `calculator:test:independent` runs the build stage of the test-builder's
 * directory this way and `calculator:test:verify` its verify stage, and until a change writes its
 * first contract, fitness or E2E test each holds only its README, a legitimately absent input
 * (`CLAUDE.md` § The gate ladder). A pattern that matches no file is still
 * refused: a pattern is spelled by hand and can be wrong, where the directory is checked to exist, by
 * this run and by `check:jobs`. Wrong here, a directory whose every test was deleted would pass as one
 * not yet written; the test-inventory gate catches that deletion. The glob of the files under a
 * `--dir` has one home, `scripts/lib/test-dirs.mjs`, which the trace, test-inventory and thresholds
 * gates import too, so each counts the tests this runner runs.
 *
 * ONE TEST, BY NAME. `--name <name>` runs only the test whose name is exactly `<name>`, which it
 * escapes and anchors (`^...$`) for Node's `testNamePatterns`, and refuses the run unless exactly one
 * test of that name ran; it passes when that test passes. It is how the verifier runs a failing
 * test once more (`docs/decisions.md` § D-13, item 12, and `scripts/fresh-run.mjs`). Wrong here, a
 * re-run could pass over nothing: probed on 2026-09-29 at Node 26.8.1, the only release on the
 * probing host, a name that matches no test reports only the event named for the file, which
 * passes, and an unanchored one also runs every test whose name begins with it; the design lane's
 * probes in asdlc-openspec-j09.14's notes found, at 22.22.2 and 26.8.1, an unescaped `[CALC-001]`
 * refused and an anchored, escaped name exact, inside a `describe` too. The tests filtered out are
 * never reported (26.8.1), so the
 * cross-check and the refusal of a file that declares no test do not apply to such a run.
 *
 * RESULTS. `--results <file>` writes, beside the usual report, `{ files, tests, failures, notes,
 * results }` as JSON, where `results` is each test the runner reported, `{ file, name, line, status,
 * durationMs }`, its status `pass`, `fail`, `skip` or `todo` and its duration Node's own
 * `duration_ms`, sorted by file, line and name; a file that fails on load is one result with a null
 * name. `scripts/fresh-run.mjs` reads it.
 *
 * INVOCATION.
 *
 *   node scripts/run-tests.mjs "<pattern>" [...]   the run; `npm run calculator:test` is one
 *   node scripts/run-tests.mjs --dir <dir> [...]   every test file under <dir>; `npm run
 *                                                  calculator:test:independent` is one
 *   node scripts/run-tests.mjs --name "<name>" "<file>"   the one test of that name, run once more
 *   ... --results <file>                           the results as JSON, too
 *   npm run tests:selftest                         its fixtures -- each refusal on a doctored tree
 *
 * A pattern is a glob relative to the repository root, quoted so that this script expands it with
 * `fs.globSync` and the shell does not. By hand, point `RUN_TESTS_ROOT` at a doctored copy and the
 * patterns resolve against it instead:
 *
 *   RUN_TESTS_ROOT=/tmp/doctored node scripts/run-tests.mjs "test/*.test.js"
 *
 * NEEDS Node's own test runner and `fs.globSync`, within the `engines` floor in `package.json`
 * (asdlc-openspec-pta cites the release that marked `fs.globSync` stable), and the reader's keys in
 * `tools/policy/` under the root, without which it refuses the run. No network and nothing
 * outside the repository. Files run in parallel, one process each, as `node --test` runs them; the
 * cost is the tests' own, and `git-hooks.yml`'s `calculator-test` job carries the measurement.
 */
import { globSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { run } from 'node:test'
import { spec } from 'node:test/reporters'
import { fileURLToPath } from 'node:url'
import { dirGlob } from './lib/test-dirs.mjs'
import { VOCABULARY, readTests, readTracePolicy } from './test-trace.mjs'
import { readPolicy, recordPaths } from '../tools/lib/policy.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Run the files `patterns` match under `root`. Returns the failures rather than exiting, so the
 * selftest can run it against doctored trees. `report`, when given, receives the runner's usual
 * report.
 *
 * `coverage`, when given as `{ include, exclude }` (globs relative to `root`), turns on Node's own
 * coverage and returns the runner's `test:coverage` summary as `coverage`, or null when it sent
 * none. It is judged by `scripts/check-thresholds.mjs`, never by `run()`'s own thresholds, which
 * this file's `process.exit(0)` would swallow. At 22.22.2, the engines floor before
 * `docs/decisions.md` § D-34, `run()` had no `cwd` option and resolved the globs and the reported
 * paths against `process.cwd()`, so the run changes to `root` and back; 24.21.0, the floor since,
 * has the option, which this does not use: the change of directory works at both, and whether `cwd`
 * also roots the coverage globs is unmeasured. A flag such as `--experimental-test-coverage` given to
 * this process reaches `run()` at neither, since its own `coverage` option, false unless set,
 * overrides it.
 */
export async function runTests(root, patterns, { report = null, coverage = null, dirs = [], name = null } = {}) {
  const failures = []
  const notes = []
  if (patterns.length === 0 && dirs.length === 0) {
    failures.push('no pattern given: name the test files to run, as a quoted glob.')
    return { failures, notes, files: 0, tests: 0, coverage: null, results: [] }
  }
  if (name !== null && (typeof name !== 'string' || name === '')) {
    failures.push('--name given no name: name the one test to run, exactly as its call spells it.')
    return { failures, notes, files: 0, tests: 0, coverage: null, results: [] }
  }

  const files = []
  for (const dir of dirs) {
    if (!statSync(resolve(root, dir), { throwIfNoEntry: false })?.isDirectory()) {
      failures.push(`--dir ${dir} is not a directory under ${root}: repoint it at the directory that holds the tests.`)
      continue
    }
    const matched = globSync(dirGlob(dir), { cwd: root }).sort(byCodePoint)
    if (matched.length === 0) notes.push(`no test file under ${dir} yet, so there is nothing of it to run.`)
    for (const file of matched) files.push(file)
  }
  for (const pattern of patterns) {
    const matched = globSync(pattern, { cwd: root }).sort(byCodePoint)
    if (matched.length === 0) {
      failures.push(
        `the pattern "${pattern}" matches no file under ${root}. A run over nothing passes for the ` +
          'wrong reason; repoint the pattern at the test files.',
      )
    }
    for (const file of matched) files.push(file)
  }
  if (files.length === 0) return { failures, notes, files: 0, tests: 0, coverage: null, results: [] }

  /**
   * Declared tests per file, keyed by the path the runner reports: the real path, since a root
   * reached through a symbolic link (macOS's temporary directory is one) is reported resolved.
   */
  const pathOf = (file) => realpathSync(resolve(root, file))
  const declared = new Map(files.map((file) => [pathOf(file), 0]))
  const reported = new Map(files.map((file) => [pathOf(file), []]))
  const failed = []
  const relativeOf = new Map(files.map((file) => [pathOf(file), file]))
  const results = []

  // What the reader makes of each file, before any of it runs.
  let policy = null
  try {
    policy = readTracePolicy(root)
  } catch (error) {
    failures.push(`${error.message} Without it no test's metadata can be read (the header of scripts/test-trace.mjs).`)
  }
  const read = new Map()
  if (policy !== null) {
    for (const file of files) {
      const { tests, problems } = readTests(readFileSync(resolve(root, file), 'utf8'), policy, file)
      failures.push(...problems)
      read.set(pathOf(file), tests)
    }
  }

  const options = { files: [...declared.keys()], concurrency: true }
  if (name !== null) options.testNamePatterns = [new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`)]
  if (coverage !== null) {
    Object.assign(options, { coverage: true, coverageIncludeGlobs: coverage.include, coverageExcludeGlobs: coverage.exclude })
  }
  const cwd = process.cwd()
  if (coverage !== null) process.chdir(root)
  let summary = null
  const reporter = report === null ? null : new spec()
  if (reporter !== null) reporter.pipe(report, { end: false })
  try {
    for await (const event of run(options)) {
      if (reporter !== null) reporter.write(event)
      if (event.type === 'test:coverage') summary = event.data.summary
      if (event.type !== 'test:pass' && event.type !== 'test:fail') continue
      const { name: called, file, line, details, todo, skip } = event.data
      const failing = event.type === 'test:fail' && (todo === undefined || todo === false)
      if (failing && details?.error?.failureType !== 'subtestsFailed') failed.push(failureOf(root, event.data))
      if (details?.type !== 'test' || !declared.has(file)) continue
      const durationMs = typeof details.duration_ms === 'number' ? details.duration_ms : null
      if (called === file) {
        // The event named for the file stands for the file itself: a failure there is one on load.
        if (failing) results.push({ file: relativeOf.get(file), name: null, line, status: 'fail', durationMs })
        continue
      }
      declared.set(file, declared.get(file) + 1)
      reported.get(file).push({ line, name: called })
      const status = failing ? 'fail' : isSet(todo) ? 'todo' : isSet(skip) ? 'skip' : 'pass'
      results.push({ file: relativeOf.get(file), name: called, line, status, durationMs })
    }
  } finally {
    if (coverage !== null) process.chdir(cwd)
  }
  if (reporter !== null) {
    reporter.end()
    await new Promise((done) => reporter.once('end', done).resume())
  }

  if (failed.length > 0) {
    // Named here, since a run with no reporter, the coverage run among them, prints nothing above.
    const where = reporter === null ? '' : '; the report above gives each full error'
    failures.push(`${failed.length} test(s) failed: ${failed.join('; ')}${where}.`)
  }
  results.sort((a, b) => byCodePoint(a.file, b.file) || a.line - b.line || byCodePoint(a.name ?? '', b.name ?? ''))
  const tests = [...declared.values()].reduce((sum, count) => sum + count, 0)
  if (name !== null) {
    // Every other test is filtered out and never reported, so neither the cross-check nor the
    // refusal of a file that declares no test applies: what must hold is that one test ran.
    const ran = results.filter((r) => r.name === name).length
    if (ran === 0) {
      failures.push(`no test named "${name}" ran under ${root}: spell the name exactly as its call does, and give the file that holds it.`)
    } else if (ran > 1) {
      failures.push(`${ran} tests named "${name}" ran under ${root}: --name re-runs exactly one test, so give only the file that holds the one to re-run.`)
    }
    return { failures, notes, files: files.length, tests, coverage: summary, results }
  }
  for (const [path, count] of declared) {
    const file = files.find((f) => pathOf(f) === path)
    if (count > 0) {
      if (read.has(path)) failures.push(...crossCheck(file, read.get(path), reported.get(path)))
      continue
    }
    failures.push(
      `${file} matches ${patterns.map((p) => `"${p}"`).join(', ')} and declares no test. The ` +
        "runner reports such a file as one passing test named for its own path, so it counts toward " +
        "the total and exits 0; add the file's tests, or move it out of the pattern.",
    )
  }
  return { failures, notes, files: files.length, tests, coverage: summary, results }
}

/** Whether a test's `skip` or `todo` field is set: true, or the reason given for it. */
const isSet = (value) => value !== undefined && value !== false

/**
 * Each test of `file` that the reader reads and the runner does not report, or the other way
 * round, keyed by its line and its name and counted, so that a call the runner reports twice is
 * refused once. In line order, then by name.
 */
function crossCheck(file, readHere, reportedHere) {
  const counts = new Map()
  const tally = (list, side) => {
    for (const { line, name } of list) {
      const key = `${line}\u0000${name}`
      const entry = counts.get(key) ?? { line, name, read: 0, reported: 0 }
      entry[side]++
      counts.set(key, entry)
    }
  }
  tally(readHere, 'read')
  tally(reportedHere, 'reported')
  const problems = []
  const order = [...counts.values()].sort((a, b) => a.line - b.line || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const { line, name, read, reported } of order) {
    if (reported > read) {
      problems.push(
        `${file}:${line}: the runner reported ${reported} test(s) named "${name}" here, and` +
          ` scripts/test-trace.mjs reads ${read}: a test made in a loop, by a helper or inside another` +
          " test's body is one the trace and inventory gates cannot see. Write each test as a literal call" +
          ' (the header of scripts/test-trace.mjs).',
      )
    } else if (read > reported) {
      problems.push(
        `${file}:${line}: scripts/test-trace.mjs reads the test "${name}" here, and the runner reported` +
          ` ${reported}: a test under a condition, inside a block comment opened after other code on its` +
          ' line, or one the runner never reached, would count as a proof that never ran. Register every' +
          ' test, and skip one with the `skip` option and its reason.',
      )
    }
  }
  return problems
}

/**
 * One failed test as `<file>:<line> "<name>" (<first line of its error>)`, the file relative to
 * `root`. The event named for the file's own path is the file failing as a whole, as one that
 * throws on load does, and is named as the file alone.
 */
function failureOf(root, { name, file, line, details }) {
  const path = file === undefined ? '(no file)' : relative(realpathSync(root), file)
  const error = details?.error?.cause ?? details?.error
  const message = String(error?.message ?? error ?? 'no error given').split('\n')[0].trim().slice(0, 200)
  return name === file ? `${path} (${message})` : `${path}:${line} "${name}" (${message})`
}

/* --------------------------------------------------------------------------------- the run ------ */

async function main(args) {
  const root = process.env.RUN_TESTS_ROOT ? resolve(process.env.RUN_TESTS_ROOT) : REPO_ROOT
  const patterns = []
  const dirs = []
  let name = null
  let out = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dir') dirs.push(args[++i] ?? '')
    else if (args[i] === '--name') name = args[++i] ?? ''
    else if (args[i] === '--results') out = args[++i] ?? ''
    else patterns.push(args[i])
  }
  if (out === '') {
    console.error('tests: --results given no file: name the file the results are written to.')
    process.exit(1)
  }
  const { failures, notes, files, tests, results } = await runTests(root, patterns, { report: process.stdout, dirs, name })
  if (out !== null) writeFileSync(resolve(out), `${JSON.stringify({ files, tests, failures, notes, results }, null, 2)}\n`)
  for (const note of notes) console.log(`tests: ${note}`)
  if (failures.length === 0) {
    if (name !== null) console.log(`\ntests: the one test named "${name}" ran, and passed.`)
    else console.log(`\ntests: ${tests} test(s) across ${files} file(s), each file declaring at least one.`)
    process.exit(0)
  }
  console.error(`\ntests: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

/**
 * The fixture's tests carry trace lines under the live policy, copied in, so a change to the reader's
 * keys that the calculator's tests would feel is felt here too. Each hash is only of the right shape:
 * the runner checks none against a spec. Read when the selftest runs, so that a run of the tests
 * with the policy missing is refused with its reason rather than failing on import.
 */
function fixture() {
  const policy = Object.fromEntries(recordPaths(REPO_ROOT).map((path) => [path, readFileSync(join(REPO_ROOT, path), 'utf8')]))
  const hash = 'a'.repeat(readPolicy(REPO_ROOT).testTraceHashLength)
  const trace = (id) => `// trace: ${id}:happy@${hash}`
  const head = "import { describe, test } from 'node:test'\n// trace-defaults: layer=functional level=1\n"
  /** A test file of `head`, then `body`, with the trace line for `id` directly above it. */
  const file = (id, body) => `${head}${trace(id)}\n${body}\n`
  const passing = `${head}describe('a suite', () => {
  ${trace('GRT-001')}
  test('[GRT-001] one', () => {})
  ${trace('GRT-002')}
  test(
    '[GRT-002] two',
    () => {},
  )
})
`
  return {
    file,
    head,
    trace,
    files: {
      'package.json': '{ "type": "module" }\n',
      ...policy,
      'test/a.test.js': passing,
      'test/b.test.js': file('GRT-003', "test('[GRT-003] three', () => {})"),
    },
  }
}
const PATTERN = 'test/*.test.js'

async function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'run-tests-'))
  const results = []
  const { files: tree, ...helpers } = fixture()
  try {
    for (const { name, files, patterns = [PATTERN], dirs = [], only = null, note = null, check = null, expect } of cases(helpers)) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      writeTree(dir, { ...tree, ...files })
      const { failures, notes, results: ran } = await runTests(dir, patterns, { dirs, name: only })
      let ok
      let detail
      if (expect === 'pass') {
        const wrong = check === null || failures.length ? null : check(ran ?? [])
        ok = failures.length === 0 && (note === null || notes.some((n) => note.test(n))) && wrong === null
        detail = ok
          ? 'passes'
          : failures.length
            ? `unexpected failure(s): ${failures.join(' | ')}`
            : wrong ?? `passes without the note: ${JSON.stringify(notes)}`
      } else {
        ok = failures.some((failure) => expect.test(failure))
        detail = ok
          ? `fails for that reason (${failures.length} failure(s))`
          : failures.length === 0
            ? 'PASSED, but should have failed'
            : `failed, but not for that reason: ${failures.join(' | ')}`
      }
      results.push({ name, ok, detail })
      if (name.startsWith('control') && !ok) {
        console.error(`selftest: the undoctored fixture does not pass, so no case can be trusted: ${detail}`)
        process.exit(1)
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }

  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  }
  console.log(
    `tests selftest: ${results.length - failed.length}/${results.length} cases hold` +
      ` (control plus ${results.length - 1} doctored trees).`,
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

function writeTree(dir, files) {
  for (const [relative, body] of Object.entries(files)) {
    if (body === null) continue
    const path = join(dir, relative)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
}

/**
 * The cases, each doctoring one thing. `file(id, body)` is a test file whose first test traces
 * `id`, `head` its first two lines and `trace(id)` a trace line.
 */
function cases({ file, head, trace }) {
  const bs = String.fromCharCode(92)
  const noTest = (path) => new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} matches .* and declares no test`)
  return [
    {
      name: 'control: the undoctored fixture passes',
      files: {},
      expect: 'pass',
    },
    {
      name: 'a matched file that declares no test',
      files: { 'test/c.test.js': '// its tests were deleted\nexport const kept = 1\n' },
      expect: noTest('test/c.test.js'),
    },
    {
      name: 'a matched file that holds a suite and no test',
      files: { 'test/c.test.js': "import { describe } from 'node:test'\ndescribe('empty', () => {})\n" },
      expect: noTest('test/c.test.js'),
    },
    {
      name: 'a pattern that matches no file',
      patterns: ['tests/*.test.js'],
      files: {},
      expect: /^the pattern "tests\/\*\.test\.js" matches no file under /,
    },
    {
      name: 'no pattern at all',
      patterns: [],
      files: {},
      expect: /^no pattern given/,
    },
    {
      name: 'a --dir whose directory holds no test file yet passes, and says so',
      patterns: [],
      dirs: ['independent'],
      files: { 'independent/README.md': '# The tests to come\n' },
      note: /^no test file under independent yet/,
      expect: 'pass',
    },
    {
      name: 'a --dir that names no directory',
      patterns: [],
      dirs: ['independents'],
      files: { 'independent/README.md': '# The tests to come\n' },
      expect: /^--dir independents is not a directory under /,
    },
    {
      name: 'a --dir runs the test files at any depth below it, and a failing one fails the run',
      patterns: [],
      dirs: ['independent'],
      files: { 'independent/contract/c.test.js': file('GRT-005', "test('[GRT-005] five', () => { throw new Error('no') })") },
      expect: /^1 test\(s\) failed/,
    },
    {
      name: 'a failing test still fails the run',
      files: { 'test/b.test.js': file('GRT-003', "test('[GRT-003] three', () => { throw new Error('no') })") },
      expect: /^1 test\(s\) failed: test\/b\.test\.js:4 "\[GRT-003\] three" \(no\)\.$/,
    },
    {
      name: 'a failing test inside a suite counts once, by its own name',
      files: { 'test/a.test.js': fixture().files['test/a.test.js'].replace('() => {})', "() => { throw new Error('no') })") },
      expect: /^1 test\(s\) failed: test\/a\.test\.js:5 "\[GRT-001\] one" \(no\)\.$/,
    },
    {
      name: 'a file that throws on load fails the run',
      files: { 'test/b.test.js': "throw new Error('does not load')\n" },
      expect: /^1 test\(s\) failed: test\/b\.test\.js \(/,
    },
    {
      name: 'a file whose only test is skipped still declares one, and passes',
      files: { 'test/b.test.js': file('GRT-003', "test('[GRT-003] later', { skip: true }, () => {})") },
      expect: 'pass',
    },
    {
      name: 'a failing todo test does not fail the run, as under node --test',
      files: { 'test/b.test.js': file('GRT-003', "test('[GRT-003] soon', { todo: true }, () => { throw new Error('no') })") },
      expect: 'pass',
    },
    {
      name: 'a test with no trace line, which the reader refuses',
      files: { 'test/b.test.js': "import { test } from 'node:test'\ntest('[GRT-003] three', () => {})\n" },
      expect: /^test\/b\.test\.js:2: the test "\[GRT-003\] three" has no `\/\/ trace:` line directly above it/,
    },
    {
      name: 'tests made in a loop, which the reader cannot see',
      files: {
        'test/b.test.js': file('GRT-003', "test('[GRT-003] three', () => {})\nfor (const n of [4, 5]) test(`[GRT-00${n}] made`, () => {})"),
      },
      expect: /^test\/b\.test\.js:5: the runner reported 1 test\(s\) named "\[GRT-004\] made" here, and scripts\/test-trace\.mjs reads 0/,
    },
    {
      name: 'one literal call run twice by a loop',
      files: { 'test/b.test.js': `${head}for (const n of [1, 2])\n${trace('GRT-003')}\ntest('[GRT-003] twice', () => {})\n` },
      expect: /^test\/b\.test\.js:5: the runner reported 2 test\(s\) named "\[GRT-003\] twice" here, and scripts\/test-trace\.mjs reads 1/,
    },
    {
      name: "a subtest inside another test's body",
      files: {
        'test/b.test.js': file('GRT-003', "test('[GRT-003] outer', async (t) => {\n  await t.test('[GRT-003] inner', () => {})\n})"),
      },
      expect: /^test\/b\.test\.js:5: the runner reported 1 test\(s\) named "\[GRT-003\] inner" here, and scripts\/test-trace\.mjs reads 0/,
    },
    {
      name: 'a test under a condition that does not hold',
      files: {
        'test/b.test.js': file(
          'GRT-003',
          `test('[GRT-003] three', () => {})\nif (process.env.RUN_TESTS_SELFTEST_NEVER_SET) {\n  ${trace('GRT-004')}\n  test('[GRT-004] held back', () => {})\n}`,
        ),
      },
      expect: /^test\/b\.test\.js:7: scripts\/test-trace\.mjs reads the test "\[GRT-004\] held back" here, and the runner reported 0/,
    },
    {
      name: 'a name with escapes, which the reader and the runner read alike, passes',
      // The backslash is built, so the fixture's escapes are not ones this file's own parse reads.
      files: { 'test/b.test.js': file('GRT-003', `test('[GRT-003] 5 ${bs}u2212 2${bs}t${bs}x41', () => {})`) },
      expect: 'pass',
    },
    {
      name: 'a traced test inside a block comment, which neither reads, passes',
      files: {
        'test/b.test.js': file('GRT-003', `test('[GRT-003] three', () => {})\n/*\n${trace('GRT-004')}\ntest('[GRT-004] commented out', () => {})\n*/`),
      },
      expect: 'pass',
    },
    {
      name: 'the results name each test run with its file, status and duration, in code-point order',
      files: { 'test/b.test.js': file('GRT-003', `test('[GRT-003] three', () => {})\n${trace('GRT-004')}\ntest('[GRT-004] later', { skip: true }, () => {})`) },
      check: (ran) => {
        const got = ran.map((r) => `${r.file}|${r.name}|${r.status}|${typeof r.durationMs}`).join(' ; ')
        const want = [
          'test/a.test.js|[GRT-001] one|pass|number',
          'test/a.test.js|[GRT-002] two|pass|number',
          'test/b.test.js|[GRT-003] three|pass|number',
          'test/b.test.js|[GRT-004] later|skip|number',
        ].join(' ; ')
        return got === want ? null : `the results read ${got}`
      },
      expect: 'pass',
    },
    {
      name: '--name runs the one test of that exact name, escaped and anchored, and no other',
      only: '[GRT-001] one',
      files: { 'test/c.test.js': file('GRT-001', "test('[GRT-001] one more', () => { throw new Error('ran, though its name only begins so') })") },
      check: (ran) => (ran.length === 1 && ran[0].name === '[GRT-001] one' && ran[0].status === 'pass' ? null : `ran ${JSON.stringify(ran)}`),
      expect: 'pass',
    },
    {
      name: '--name fails the run when the one test of that name fails',
      only: '[GRT-003] three',
      files: { 'test/b.test.js': file('GRT-003', "test('[GRT-003] three', () => { throw new Error('no') })") },
      expect: /^1 test\(s\) failed/,
    },
    {
      name: '--name that names no test is refused, not passed',
      only: '[GRT-009] nine',
      files: {},
      expect: /^no test named "\[GRT-009\] nine" ran under /,
    },
    {
      name: '--name that names two tests is refused, since it re-runs one test',
      only: '[GRT-003] three',
      files: { 'test/c.test.js': file('GRT-003', "test('[GRT-003] three', () => {})") },
      expect: /^2 tests named "\[GRT-003\] three" ran under .*: --name re-runs exactly one test/,
    },
    {
      name: 'a policy without the reader\'s keys',
      files: { [VOCABULARY]: '{}\n' },
      expect: /^tools\/policy\/vocabulary\.json has no whole number from 1 to 64 under `testTraceHashLength`/,
    },
  ]
}

// The command line runs only when this file is the one invoked: `scripts/check-thresholds.mjs`
// imports `runTests` and must not start a run of its own.
if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.includes('--selftest')) await selftest()
  else await main(args)
}
