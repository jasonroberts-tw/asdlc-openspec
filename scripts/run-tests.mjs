/**
 * Test runner: runs Node's own test runner over the files the given patterns match, prints its usual
 * report, and fails the run when a test fails, when a pattern matches no file, or when a matched file
 * declares no test.
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
 * WHAT IT COUNTS. For each matched file, every `test:pass` and `test:fail` event of kind `test` the
 * runner reports for it, except the one named for the file's own path, which stands for the file
 * itself and is the only event a file with no test produces. A skipped or todo test counts, because
 * it is declared; a suite (`describe`) is not a test. A failure is any `test:fail` that is not a todo
 * test, which is the rule `node --test` exits by; a file that throws on load fails that way.
 *
 * INVOCATION.
 *
 *   node scripts/run-tests.mjs "<pattern>" [...]   the run; `npm run calculator:test` is one
 *   npm run tests:selftest                         its fixtures -- each refusal on a doctored tree
 *
 * A pattern is a glob relative to the repository root, quoted so that this script expands it with
 * `fs.globSync` and the shell does not. By hand, point `RUN_TESTS_ROOT` at a doctored copy and the
 * patterns resolve against it instead:
 *
 *   RUN_TESTS_ROOT=/tmp/doctored node scripts/run-tests.mjs "test/*.test.js"
 *
 * NEEDS Node's own test runner and `fs.globSync`, within the `engines` floor in `package.json`
 * (asdlc-openspec-pta cites the release that marked `fs.globSync` stable). No network and nothing
 * outside the repository. Files run in parallel, one process each, as `node --test` runs them; the
 * cost is the tests' own, and `lefthook.yml`'s `calculator-test` job carries the measurement.
 */
import { globSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { run } from 'node:test'
import { spec } from 'node:test/reporters'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Run the files `patterns` match under `root`. Returns the failures rather than exiting, so the
 * selftest can run it against doctored trees. `report`, when given, receives the runner's usual
 * report.
 */
export async function runTests(root, patterns, { report = null } = {}) {
  const failures = []
  if (patterns.length === 0) {
    failures.push('no pattern given: name the test files to run, as a quoted glob.')
    return { failures, files: 0, tests: 0 }
  }

  const files = []
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
  if (files.length === 0) return { failures, files: 0, tests: 0 }

  /**
   * Declared tests per file, keyed by the path the runner reports: the real path, since a root
   * reached through a symbolic link (macOS's temporary directory is one) is reported resolved.
   */
  const pathOf = (file) => realpathSync(resolve(root, file))
  const declared = new Map(files.map((file) => [pathOf(file), 0]))
  let failed = 0

  const stream = run({ files: [...declared.keys()], concurrency: true })
  const reporter = report === null ? null : new spec()
  if (reporter !== null) reporter.pipe(report, { end: false })
  for await (const event of stream) {
    if (reporter !== null) reporter.write(event)
    if (event.type !== 'test:pass' && event.type !== 'test:fail') continue
    const { name, file, details, todo } = event.data
    if (event.type === 'test:fail' && (todo === undefined || todo === false)) failed++
    if (details?.type !== 'test' || name === file || !declared.has(file)) continue
    declared.set(file, declared.get(file) + 1)
  }
  if (reporter !== null) {
    reporter.end()
    await new Promise((done) => reporter.once('end', done).resume())
  }

  if (failed > 0) failures.push(`${failed} test(s) failed; the report above names each one.`)
  for (const [path, count] of declared) {
    if (count > 0) continue
    const file = files.find((f) => pathOf(f) === path)
    failures.push(
      `${file} matches ${patterns.map((p) => `"${p}"`).join(', ')} and declares no test. The ` +
        "runner reports such a file as one passing test named for its own path, so it counts toward " +
        "the total and exits 0; add the file's tests, or move it out of the pattern.",
    )
  }
  const tests = [...declared.values()].reduce((sum, count) => sum + count, 0)
  return { failures, files: files.length, tests }
}

/* --------------------------------------------------------------------------------- the run ------ */

async function main(patterns) {
  const root = process.env.RUN_TESTS_ROOT ? resolve(process.env.RUN_TESTS_ROOT) : REPO_ROOT
  const { failures, files, tests } = await runTests(root, patterns, { report: process.stdout })
  if (failures.length === 0) {
    console.log(`\ntests: ${tests} test(s) across ${files} file(s), each file declaring at least one.`)
    process.exit(0)
  }
  console.error(`\ntests: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

const PASSING = `import { describe, test } from 'node:test'
describe('a suite', () => {
  test('one', () => {})
  test('two', () => {})
})
`
const FIXTURE = {
  'package.json': '{ "type": "module" }\n',
  'test/a.test.js': PASSING,
  'test/b.test.js': `import { test } from 'node:test'\ntest('three', () => {})\n`,
}
const PATTERN = 'test/*.test.js'

async function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'run-tests-'))
  const results = []
  try {
    for (const { name, files, patterns = [PATTERN], expect } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      writeTree(dir, { ...FIXTURE, ...files })
      const { failures } = await runTests(dir, patterns)
      let ok
      let detail
      if (expect === 'pass') {
        ok = failures.length === 0
        detail = ok ? 'passes' : `unexpected failure(s): ${failures.join(' | ')}`
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

function cases() {
  const noTest = (file) => new RegExp(`^${file.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')} matches .* and declares no test`)
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
      name: 'a failing test still fails the run',
      files: { 'test/b.test.js': "import { test } from 'node:test'\ntest('three', () => { throw new Error('no') })\n" },
      expect: /^1 test\(s\) failed/,
    },
    {
      name: 'a file that throws on load fails the run',
      files: { 'test/b.test.js': "throw new Error('does not load')\n" },
      expect: /^1 test\(s\) failed/,
    },
    {
      name: 'a file whose only test is skipped still declares one, and passes',
      files: { 'test/b.test.js': "import { test } from 'node:test'\ntest('later', { skip: true }, () => {})\n" },
      expect: 'pass',
    },
    {
      name: 'a failing todo test does not fail the run, as under node --test',
      files: {
        'test/b.test.js': "import { test } from 'node:test'\ntest('soon', { todo: true }, () => { throw new Error('no') })\n",
      },
      expect: 'pass',
    },
  ]
}

const args = process.argv.slice(2)
if (args.includes('--selftest')) await selftest()
else await main(args)
