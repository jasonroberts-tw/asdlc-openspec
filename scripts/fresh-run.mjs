/**
 * The verifier's fresh run: clones the change worktree's HEAD into the temporary directory, installs
 * it with `npm ci`, and runs there every test script, the trace gate and the Commands' mutation run;
 * then sorts every test the runner reported by the traceability record and writes it all to
 * `.scratch/<change>-verify.json`, which `scripts/lib/verify-report.mjs` reads for the verification
 * report and `.claude/workflows/verify-change-trace.js` for each scenario's result. With `--rerun`,
 * it runs one failing test of that file once more, in a fresh clone of the same commit, and records
 * the second result beside the first. `.claude/skills/change-verify/SKILL.md` § 4 runs both; the
 * steps and their reasons are the notes of asdlc-openspec-j09.14 (the maintainer's choices 1 to 3).
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. Before it, Verify ran the proofs in the change's own worktree, whose `node_modules`, ignored
 * files and leftover state a test could pass on and a clean checkout would not give it. A clone that
 * is not of HEAD, or of a tree with uncommitted edits, verifies code no commit holds; one whose
 * `origin/main` is the primary checkout's local `main` (what `git clone` of it gives) measures the
 * trace's rule 5 and the thresholds from the wrong base; one left with an `origin` remote can fetch
 * or push into the primary; and one made inside a repository is read by git as part of it. A run
 * that lost a test the record lists, or reported one it does not, would sort a test into no
 * partition and say nothing, so every result joins the record one to one by file and name, and each
 * that does not is a problem the report puts in its verdict. And a re-run left to the test runner
 * would retry silently, which `docs/decisions.md` § D-13, item 12, forbids: `--rerun` runs one test,
 * once, when the session asks.
 *
 * WHAT A RUN DOES, in order, each child spawned with its `cwd` set and no `GIT_*` key:
 *
 *   1. Refuses a tree with any change `git status --porcelain` shows, a checkout whose top is not the
 *      root, one with no `origin/main`, and a temporary root that is inside a git repository.
 *   2. `git clone --local --no-checkout` of the root's common git directory, `checkout --detach` of
 *      HEAD, `git remote remove origin`, and `refs/remotes/origin/main` set to the root's
 *      `origin/main`; then `npm ci --no-audit --no-fund`.
 *   3. Every package script that runs `scripts/run-tests.mjs` and neither `--selftest` nor `--name`,
 *      in code-point order, each with `--results`: the calculator's tests and the test-builder's
 *      contract, fitness and E2E tests, so a fitness function deferred to Verify runs as the test
 *      that measures it. Then `check()` of `tools/trace/trace.ts` in a child, and
 *      `thresholds:commands:check` where `package.json` has it, its output kept as the gate prints it.
 *   4. Reads the clone's committed record, `artifacts/trace/record.json`, and its baseline, and the
 *      fitness records under `apps/<app>/fitness/`; joins each result to the record's test of the
 *      same file and name; and gives each test the record's partition, moved to `change` when it
 *      cites one of `--tasks`, the epic's children, which only the tracker knows and a clone has not.
 *   5. Writes the JSON, and removes the clone whatever happened.
 *
 * INVOCATION, from the change's worktree:
 *
 *   npm run tests:fresh -- <change> --tasks <id>[,<id>...]   the run; `--tasks` from
 *                                                           `bd list --parent <epic> --all --json`
 *   node scripts/fresh-run.mjs <change> --rerun "<name>"     one failing test once more, recorded
 *   npm run tests:fresh:selftest                             its fixtures, stubbing `npm ci`
 *
 * `FRESH_RUN_ROOT` names the checkout to run from, a doctored copy by hand; `FRESH_RUN_TMP` the
 * temporary root the clone goes under (the OS's by default). It exits 0 when it wrote the JSON,
 * whatever the tests did, 1 when it refused, naming why, and 2 on a usage error. It is not a gate and
 * not an emitter: it writes only under `.scratch/`, and its runtimes differ from run to run.
 *
 * NEEDS git, the commits of the root's HEAD and `origin/main` in its object store, and the network,
 * through `npm ci`, so it is no pre-push job and no CI step (`CLAUDE.md` § The gate ladder); its
 * selftest over a fixture repository stands in, with the install stubbed (`docs/decisions.md`
 * § D-15, item 3). COST, measured 2026-09-29 on a macOS laptop (Apple M3 Max, Node 26.8.1, a warm npm
 * cache) over this repository with 75 tests and no Command's line changed: 6.68 s wall
 * (`/usr/bin/time -p`), of it `npm ci` 2.49 s, `calculator:test` 1.78 s,
 * `calculator:test:independent` 0.20 s, the trace gate 0.36 s and `thresholds:commands:check` 0.26 s;
 * the Commands' run is minutes when a Command's lines change (the header of
 * `scripts/check-thresholds.mjs`), and a `--rerun` is a clone and an install again, about 3 s. The
 * selftest took 8.82-8.87 s alone and 15-29 s inside `npm run gates`. The clone gets no probed port pair, so a future test that binds a fixed port collides with one serving
 * in the worktree (the maintainer's choice 1, where it loses).
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, globSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { arch, platform, release, tmpdir } from 'node:os'
import { delimiter, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { words } from './lib/test-dirs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const RUNNER = 'scripts/run-tests.mjs'
export const RECORD = 'artifacts/trace/record.json'
export const BASELINE = 'artifacts/trace/baseline.json'
export const COMMANDS_CHECK = 'thresholds:commands:check'
const TRUNK = 'origin/main'
const FITNESS = 'apps/*/fitness/*.json'
const ENVIRONMENT = 'a local clone of HEAD under the temporary directory, after npm ci'
const INSTALL = ['npm', 'ci', '--no-audit', '--no-fund']

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const testKey = (file, name) => `${file}\u0000${name}`

/** The path of a change's fresh-run JSON under `root`. */
export const verifyFile = (change) => `.scratch/${change}-verify.json`

/** The environment every child runs in: no `GIT_*` key, and this node first in PATH, so npm's children run on it too. */
function childEnv() {
  const env = {}
  for (const [key, value] of Object.entries(process.env)) if (!key.startsWith('GIT_')) env[key] = value
  env.PATH = `${dirname(process.execPath)}${delimiter}${env.PATH ?? ''}`
  env.npm_config_update_notifier = 'false'
  return env
}

/** Runs `command` with `args` in `cwd`; `{ status, stdout, stderr, ms }`. Never throws on a non-zero exit. */
function spawn(command, args, cwd) {
  const started = performance.now()
  const run = spawnSync(command, args, { cwd, env: childEnv(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, shell: process.platform === 'win32' && command === 'npm' })
  const ms = Math.round(performance.now() - started)
  if (run.error) return { status: null, stdout: '', stderr: `could not start ${command}: ${run.error.message}`, ms }
  return { status: run.status, stdout: run.stdout ?? '', stderr: run.stderr ?? '', ms }
}

/** git in `cwd`, returning its trimmed output, or throwing with its message. */
function git(cwd, args) {
  const run = spawn('git', ['-c', 'core.quotepath=off', ...args], cwd)
  if (run.status !== 0) throw new Error(`\`git ${args.join(' ')}\` in ${cwd} failed: ${(run.stderr || run.stdout).trim()}`)
  return run.stdout.trim()
}

class Refusal extends Error {}
const refuse = (message) => {
  throw new Refusal(message)
}

/** The last lines of a child's output, for a refusal to quote. */
const tail = (run) => `${run.stdout}\n${run.stderr}`.trim().split('\n').slice(-12).join('\n')

/* ------------------------------------------------------------------------------ the checkout ---- */

/** What the run is of: the root's HEAD, its `origin/main`, and its common git directory. Refuses as step 1 says. */
function source(root) {
  let top
  try {
    top = git(root, ['rev-parse', '--show-toplevel'])
  } catch (error) {
    refuse(`${root} is not a git checkout: ${error.message}`)
  }
  if (realpathSync(top) !== realpathSync(root)) refuse(`${root} is not the top of its checkout (git reads ${top}); run from the change worktree's top.`)
  const dirty = git(root, ['status', '--porcelain', '--untracked-files=all'])
  if (dirty) {
    refuse(
      `the tree at ${root} has changes no commit holds, so a clone of HEAD would verify other code: ${dirty.split('\n').slice(0, 5).join('; ')}. ` +
        'Commit them, or remove them, and run again.',
    )
  }
  const head = git(root, ['rev-parse', 'HEAD'])
  let base
  try {
    base = git(root, ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`])
  } catch {
    refuse(`${TRUNK} is not a ref at ${root}, so the clone would have no base to measure from: \`git fetch origin main\`.`)
  }
  const common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'])
  return { head, base, common }
}

/** The temporary root, refused when git reads it as inside a repository. */
function temporaryRoot(tmp) {
  if (!existsSync(tmp) || !statSync(tmp).isDirectory()) refuse(`the temporary root ${tmp} is not a directory.`)
  const inside = spawn('git', ['rev-parse', '--git-dir'], tmp)
  if (inside.status === 0) {
    refuse(
      `the temporary root ${realpathSync(tmp)} is inside the git repository at ${inside.stdout.trim()}, so git in the clone could read that repository's ` +
        'files or refs as its own; point FRESH_RUN_TMP at a directory outside every repository.',
    )
  }
  return realpathSync(tmp)
}

/**
 * A clone of `commit` under a new directory of `tmp`, installed, handed to `work(clone, out)`, and
 * removed afterwards whatever `work` did. `out` is a directory beside the clone for the children's
 * results.
 */
async function withClone({ common, commit, base, tmp, install }, work) {
  const dir = mkdtempSync(join(tmp, 'fresh-run-'))
  const clone = join(dir, 'repo')
  const out = join(dir, 'out')
  mkdirSync(out)
  try {
    git(dir, ['clone', '--local', '--no-checkout', '--quiet', common, clone])
    git(clone, ['checkout', '--quiet', '--detach', commit])
    git(clone, ['remote', 'remove', 'origin'])
    git(clone, ['update-ref', `refs/remotes/${TRUNK}`, base])
    if (git(clone, ['rev-parse', 'HEAD']) !== commit) refuse(`the clone's HEAD is not ${commit}.`)
    const installed = await install(clone)
    if (installed.status !== 0) refuse(`\`${installed.command}\` failed in the clone, so nothing ran there:\n${tail(installed)}`)
    return await work(clone, out, installed)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** `npm ci` in `clone`: the install step the selftest stands in for. */
export async function npmCi(clone) {
  const run = spawn(INSTALL[0], INSTALL.slice(1), clone)
  return { ...run, command: INSTALL.join(' ') }
}

/* ------------------------------------------------------------------------------- the run ------- */

/** The package scripts that run the test runner over tests: neither its selftest nor a re-run by name. */
export function testScripts(scripts) {
  return Object.keys(scripts ?? {})
    .filter((name) => {
      const w = words(scripts[name])
      return w.includes(RUNNER) && !w.includes('--selftest') && !w.includes('--name') && !w.includes('--results')
    })
    .sort(byCodePoint)
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))

/** Each test script in the clone, with its exit and its results. */
function runScripts(clone, out, scripts) {
  return testScripts(scripts).map((script) => {
    const file = join(out, `${script.replace(/[^a-z0-9]+/gi, '-')}.json`)
    const run = spawn('npm', ['run', '--silent', script, '--', '--results', file], clone)
    const results = existsSync(file) ? readJson(file) : null
    return { script, status: run.status, ms: run.ms, results, output: results ? null : tail(run) }
  })
}

const TRACE_CHILD = "const m = await import('./tools/trace/trace.ts'); process.stdout.write(JSON.stringify(m.check(process.cwd())))"

/** `check()` of the clone's trace gate, in a child: its failures, advisories, notes and summary, or why none came back. */
function traceCheck(clone) {
  if (!existsSync(join(clone, 'tools/trace/trace.ts'))) return { error: 'the commit has no tools/trace/trace.ts, so no rule was checked' }
  const run = spawn(process.execPath, ['--input-type=module', '-e', TRACE_CHILD], clone)
  try {
    const checked = JSON.parse(run.stdout)
    return { failures: checked.failures, advisories: checked.advisories, notes: checked.notes, summary: checked.summary, ms: run.ms }
  } catch {
    return { error: `the trace gate returned no result (exit ${run.status}): ${tail(run)}` }
  }
}

/** The Commands' mutation run, as the gate prints it, or why it did not run. */
function commandsCheck(clone, scripts) {
  if (!scripts[COMMANDS_CHECK]) return { script: COMMANDS_CHECK, skipped: `package.json at this commit has no \`${COMMANDS_CHECK}\`` }
  const run = spawn('npm', ['run', '--silent', COMMANDS_CHECK], clone)
  return { script: COMMANDS_CHECK, status: run.status, ms: run.ms, output: `${run.stdout}${run.stderr}`.replace(/\s+$/, '') }
}

/** The fitness records under `apps/<app>/fitness/`, each as the report needs it. */
function fitnessRecords(clone) {
  return globSync(FITNESS, { cwd: clone })
    .sort(byCodePoint)
    .map((file) => {
      try {
        const r = readJson(join(clone, file))
        const env = r.executionEnvironment
        const environment = String(env && typeof env === 'object' ? env.environment ?? '' : env ?? '')
        return { file, property: r.property ?? null, nfrIds: Array.isArray(r.nfrIds) ? r.nfrIds : [], environment, failureSemantics: r.failureSemantics ?? null }
      } catch (error) {
        return { file, problem: `it is not JSON (${error.message})` }
      }
    })
}

/**
 * The run's JSON from what ran: every result joined to the record's test of its file and name, and
 * each problem of that join; pure, so the selftest holds it on its own.
 */
export function assemble({ change, head, base, tasks, install, scripts, record, baseline, trace, thresholds, fitness }) {
  const problems = []
  const byKey = new Map(record.tests.map((t) => [testKey(t.file, t.name), t]))
  const seen = new Map()
  const tests = []
  for (const s of scripts) {
    if (s.results === null) {
      problems.push(`the test script \`${s.script}\` wrote no results (exit ${s.status}), so its tests are unknown: ${s.output}`)
      continue
    }
    for (const r of s.results.results) {
      if (r.name === null) {
        problems.push(`${r.file} failed on load under \`${s.script}\`, so none of its tests ran`)
        continue
      }
      const key = testKey(r.file, r.name)
      if (seen.has(key)) {
        problems.push(`${r.file}: "${r.name}" ran under both \`${seen.get(key)}\` and \`${s.script}\`; one test runs once`)
        continue
      }
      seen.set(key, s.script)
      const t = byKey.get(key)
      if (!t) {
        problems.push(`${r.file}: "${r.name}" ran under \`${s.script}\`, and the record does not list it, so it sorts into no partition; run \`npm run trace\` and commit the record`)
        continue
      }
      const cited = t.refs.map((ref) => ref.ref.split(/[:@]/)[0])
      const partition = t.partition !== 'retire' && tasks.some((task) => cited.includes(task)) ? 'change' : t.partition
      const component = /^apps\/([^/]+)\//.exec(r.file)?.[1] ?? null
      tests.push({ file: r.file, name: r.name, script: s.script, layer: t.layer, level: t.level, ids: t.ids, partition, component, status: r.status, durationMs: r.durationMs, rerun: null })
    }
    for (const failure of s.results.failures.filter((f) => !/^\d+ test\(s\) failed/.test(f))) problems.push(`\`${s.script}\`: ${failure}`)
  }
  for (const t of record.tests) if (!seen.has(testKey(t.file, t.name))) problems.push(`${t.file}: "${t.name}" is in the record, and no test script ran it`)
  tests.sort((a, b) => byCodePoint(a.file, b.file) || byCodePoint(a.name, b.name))
  const wanted = new Set(tasks)
  return {
    change,
    commit: head,
    base,
    environment: ENVIRONMENT,
    node: process.version,
    platform: `${platform()} ${release()} ${arch()}`,
    install: { command: install.command, ms: install.ms },
    tasks: [...tasks].sort(byCodePoint),
    scripts: scripts.map(({ script, status, ms }) => ({ script, status, ms })),
    tests,
    specs: record.specs,
    contracts: record.contracts,
    taskPaths: record.tasks.filter((t) => wanted.has(t.id)).map(({ id, paths }) => ({ id, paths })),
    baseline,
    trace,
    thresholds,
    fitness,
    problems,
  }
}

/** The whole run: step 1 to 5 of the header. Returns the JSON it wrote and where. */
export async function freshRun(root, change, { tasks = [], tmp = tmpdir(), install = npmCi } = {}) {
  const src = source(root)
  const temporary = temporaryRoot(tmp)
  const run = await withClone({ ...src, commit: src.head, tmp: temporary, install }, (clone, out, installed) => {
    const pkg = readJson(join(clone, 'package.json'))
    const scripts = runScripts(clone, out, pkg.scripts ?? {})
    const trace = traceCheck(clone)
    const thresholds = commandsCheck(clone, pkg.scripts ?? {})
    if (!existsSync(join(clone, RECORD))) refuse(`the commit has no ${RECORD}, so no test can be sorted: run \`npm run trace\` and commit it.`)
    const record = readJson(join(clone, RECORD))
    const baseline = existsSync(join(clone, BASELINE)) ? readJson(join(clone, BASELINE)).unmet ?? [] : []
    return assemble({ change, head: src.head, base: src.base, tasks, install: installed, scripts, record, baseline, trace, thresholds, fitness: fitnessRecords(clone) })
  })
  const file = verifyFile(change)
  mkdirSync(join(root, '.scratch'), { recursive: true })
  writeFileSync(join(root, file), `${JSON.stringify(run, null, 2)}\n`)
  return { file, run }
}

/**
 * One failing test of the run at `root`'s `.scratch/<change>-verify.json`, run once more by name in a
 * fresh clone of the run's commit, its result recorded beside the first. Refuses a test that did not
 * fail, one already run again, a name two failing tests share, and a run not of the root's HEAD.
 */
export async function rerun(root, change, name, { tmp = tmpdir(), install = npmCi } = {}) {
  const file = verifyFile(change)
  if (!existsSync(join(root, file))) refuse(`${file} does not exist: run the fresh run first.`)
  const run = readJson(join(root, file))
  const head = git(root, ['rev-parse', 'HEAD'])
  if (run.commit !== head) refuse(`${file} is the run at ${run.commit}, and HEAD is ${head}: a test is run again at the commit that failed it, so run the whole suite again.`)
  const named = run.tests.filter((t) => t.name === name)
  if (!named.length) refuse(`no test of ${file} is named "${name}"; give the name exactly as the run records it.`)
  const failing = named.filter((t) => t.status === 'fail')
  if (!failing.length) refuse(`"${name}" did not fail in ${file} (${named.map((t) => t.status).join(', ')}), so there is nothing to run again.`)
  if (failing.length > 1) refuse(`"${name}" names ${failing.length} failing tests of ${file}, in ${failing.map((t) => t.file).join(' and ')}; rename one, since a re-run is of one test.`)
  const test = failing[0]
  if (test.rerun !== null) refuse(`"${name}" was run once more already (${test.rerun.status}); a failing test is run again once, never more (docs/decisions.md § D-13, item 12).`)
  const { common } = source(root)
  const command = `node ${RUNNER} --name ${JSON.stringify(name)} ${JSON.stringify(test.file)}`
  const second = await withClone({ common, commit: run.commit, base: run.base, tmp: temporaryRoot(tmp), install }, (clone, out) => {
    const results = join(out, 'rerun.json')
    const again = spawn(process.execPath, [RUNNER, '--name', name, test.file, '--results', results], clone)
    const got = existsSync(results) ? readJson(results) : null
    const ran = got ? got.results.filter((r) => r.name === name) : []
    if (again.status === 0 && ran.length === 1 && ran[0].status === 'pass') return { status: 'pass', durationMs: ran[0].durationMs, command, output: null }
    if (ran.length === 1 && ran[0].status === 'fail') return { status: 'fail', durationMs: ran[0].durationMs, command, output: tail(again) }
    refuse(`the re-run of "${name}" did not run that one test (exit ${again.status}):\n${tail(again)}`)
  })
  test.rerun = second
  writeFileSync(join(root, file), `${JSON.stringify(run, null, 2)}\n`)
  return { file, test }
}

/* ------------------------------------------------------------------------------- the CLI ------- */

function usage(message) {
  console.error(`fresh-run: ${message}\n\nusage: node scripts/fresh-run.mjs <change> [--tasks <id>[,<id>...]] | <change> --rerun "<name>" | --selftest`)
  process.exit(2)
}

async function main(argv) {
  const root = process.env.FRESH_RUN_ROOT ? resolve(process.env.FRESH_RUN_ROOT) : REPO_ROOT
  const tmp = process.env.FRESH_RUN_TMP ? resolve(process.env.FRESH_RUN_TMP) : tmpdir()
  const positional = []
  let tasks = []
  let name = null
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--tasks') tasks = (argv[++i] ?? '').split(',').map((t) => t.trim()).filter(Boolean)
    else if (argv[i] === '--rerun') name = argv[++i] ?? ''
    else if (argv[i].startsWith('--')) usage(`unknown flag ${argv[i]}`)
    else positional.push(argv[i])
  }
  if (positional.length !== 1 || !/^[a-z0-9][a-z0-9-]*$/.test(positional[0])) usage('name one change, as its folder under openspec/changes/ is named')
  if (name === '') usage('--rerun needs the failing test\'s name')
  const [change] = positional
  try {
    if (name !== null) {
      const { file, test } = await rerun(root, change, name, { tmp })
      const verdict = test.rerun.status === 'pass' ? 'failed and then passed: flaky, and it counts as failing' : 'failed twice'
      console.log(`fresh-run: "${name}" ${verdict}; recorded in ${file}.`)
      return
    }
    const { file, run } = await freshRun(root, change, { tasks, tmp })
    const failing = run.tests.filter((t) => t.status === 'fail')
    console.log(`fresh-run: wrote ${file}: ${run.tests.length} test(s) at ${run.commit.slice(0, 12)}, ${failing.length} failing, ${run.problems.length} problem(s); trace ${run.trace.error ? 'not checked' : `${run.trace.failures.length} refusal(s)`}; ${run.thresholds.skipped ? `${COMMANDS_CHECK} skipped` : `${COMMANDS_CHECK} exit ${run.thresholds.status}`}.`)
    for (const t of failing) console.log(`  run once more, as its own call: node scripts/fresh-run.mjs ${change} --rerun ${JSON.stringify(t.name)}`)
  } catch (error) {
    if (!(error instanceof Refusal)) throw error
    console.error(`fresh-run: refused, and wrote nothing.\n\n  - ${error.message}\n`)
    process.exit(1)
  }
}

/* ------------------------------------------------------------------------------ the selftest --- */

/** Files the fixture copies from this repository: the runner, the reader, the trace gate and the policy. */
const COPIED = [
  'scripts/run-tests.mjs',
  'scripts/test-trace.mjs',
  'scripts/lib/test-dirs.mjs',
  'scripts/lib/bin-path.mjs',
  'tools/trace/trace.ts',
  'tools/lib/git-env.ts',
  'tools/lib/paths.ts',
  'tools/policy.json',
]
const TASK = 'asdlc-openspec-fx.1'
const TEST_FILE = 'apps/calculator/test/a.test.js'
const HAPPY = '[CALC-001] Two plus two'
const NEGATIVE = '[CALC-001] Two plus three is not four'
const TASK_TEST = `[${TASK}] A task of the change`
const FLAKY_ENV = 'FRESH_RUN_SELFTEST_FLAKY'
const SPEC = `# calculator Specification

## Purpose

The selftest's calculator.

## Requirements

### Requirement: Adds

The calculator SHALL add.

#### Scenario: [CALC-001] Two plus two

- **WHEN** it adds two and two
- **THEN** it shows four
`

/** git in the fixture, with no configuration of this machine's and a fixed author. */
function fixtureGit(dir, args) {
  const env = { ...childEnv(), GIT_CONFIG_GLOBAL: process.platform === 'win32' ? 'NUL' : '/dev/null', GIT_CONFIG_SYSTEM: process.platform === 'win32' ? 'NUL' : '/dev/null' }
  const run = spawnSync('git', ['-c', 'user.name=fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', ...args], { cwd: dir, env, encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`fixture: \`git ${args.join(' ')}\` failed: ${run.stderr}`)
  return run.stdout.trim()
}

const write = (dir, file, text) => {
  mkdirSync(dirname(join(dir, file)), { recursive: true })
  writeFileSync(join(dir, file), text)
}

/** The fixture's one test file; `negative` is the body of its negative test. */
function testFile(hash, surface, negative = '') {
  return [
    "import { existsSync, writeFileSync } from 'node:fs'",
    "import { test } from 'node:test'",
    '// trace-defaults: layer=functional level=1',
    `// trace: CALC-001:happy@${hash}`,
    `test('${HAPPY}', () => {})`,
    `// trace: CALC-001:negative@${hash}`,
    `test('${NEGATIVE}', () => {${negative}})`,
    `// trace: ${TASK} surface:apps/calculator/binding-surface.md@${surface}`,
    `test('${TASK_TEST}', () => {})`,
    '',
  ].join('\n')
}

/**
 * The fixture repository, a checkout of the branch `work`: commit A holds the product, its record and
 * baseline written by the trace gate, and `origin/main` names it; commit B, on top, changes only a
 * note, and the local `main` names B, as a primary checkout's local `main` can run ahead of
 * `origin/main`. Returns the directory and what each case needs.
 */
async function buildFixture(base) {
  const dir = join(base, 'fixture')
  mkdirSync(dir)
  for (const file of COPIED) write(dir, file, readFileSync(join(REPO_ROOT, file), 'utf8'))
  write(dir, 'package.json', `${JSON.stringify({ type: 'module', scripts: { 'calculator:test': `node ${RUNNER} "apps/calculator/test/*.test.js"`, [COMMANDS_CHECK]: 'node stub/commands.mjs' } }, null, 2)}\n`)
  write(dir, 'stub/commands.mjs', "console.log('thresholds:commands:check: every threshold holds, as the stub prints it.')\n")
  write(dir, 'openspec/specs/calculator/spec.md', SPEC)
  write(dir, 'apps/calculator/binding-surface.md', '# The binding surface\n')
  write(dir, 'apps/calculator/fitness/latency.json', `${JSON.stringify({ property: 'latency', nfrIds: [], executionEnvironment: 'verify', failureSemantics: 'advisory' })}\n`)
  write(dir, '.gitignore', 'node_modules/\n.scratch/\n')
  const reader = await import('./test-trace.mjs')
  const policy = reader.readTracePolicy(dir)
  const hash = reader.hashRef(dir, 'CALC-001', policy)
  const surface = reader.hashRef(dir, 'surface:apps/calculator/binding-surface.md', policy)
  write(dir, TEST_FILE, testFile(hash, surface))
  fixtureGit(dir, ['init', '--quiet', '--initial-branch=work'])
  fixtureGit(dir, ['add', '-A'])
  fixtureGit(dir, ['commit', '--quiet', '-m', `The fixture (${TASK})`])
  fixtureGit(dir, ['update-ref', `refs/remotes/${TRUNK}`, 'HEAD'])
  const trace = await import('../tools/trace/trace.ts')
  const emitted = trace.emit(dir)
  if (!emitted.wrote) throw new Error(`fixture: the trace gate wrote no record: ${emitted.message}`)
  trace.update(dir)
  fixtureGit(dir, ['add', '-A'])
  fixtureGit(dir, ['commit', '--quiet', '--amend', '--no-edit'])
  const a = fixtureGit(dir, ['rev-parse', 'HEAD'])
  fixtureGit(dir, ['update-ref', `refs/remotes/${TRUNK}`, a])
  write(dir, 'NOTE.md', 'A note.\n')
  fixtureGit(dir, ['add', '-A'])
  fixtureGit(dir, ['commit', '--quiet', '-m', `A note (${TASK})`])
  const b = fixtureGit(dir, ['rev-parse', 'HEAD'])
  fixtureGit(dir, ['branch', 'main', b])
  const checked = trace.check(dir)
  if (checked.failures.length) throw new Error(`fixture: the trace gate refuses the fixture: ${checked.failures.join(' | ')}`)
  return { dir, a, b, hash, surface }
}

/** A stub for `npm ci` that installs nothing and records what the clone's git says. */
function stubInstall(seen, { status = 0 } = {}) {
  return async (clone) => {
    const trunk = spawn('git', ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`], clone)
    seen.push({ remotes: git(clone, ['remote']), trunk: trunk.status === 0 ? trunk.stdout.trim() : '(none)', head: git(clone, ['rev-parse', 'HEAD']) })
    return { status, stdout: '', stderr: status ? 'the stub install failed on purpose' : '', ms: 0, command: 'stub install' }
  }
}

const CHANGE = 'fixture-change'

/** Each case: `doctor(dir, fx)` breaks one thing, `act(dir, ctx)` runs, and `expect` is a reason or a check. */
function selftestCases() {
  const refusedFor = (reason) => (outcome) => (outcome.refused && reason.test(outcome.refused) ? null : outcome.refused ? `refused, but not for that reason: ${outcome.refused}` : 'it ran, and should have refused')
  const ran = (check) => (outcome) => (outcome.refused ? `refused: ${outcome.refused}` : check(outcome))
  const byName = (run, name) => run.tests.find((t) => t.name === name)
  return [
    {
      name: 'control: a clean checkout runs every test in a clone of HEAD, whose origin/main is the checkout\'s and whose origin remote is gone, and the clone is removed',
      control: true,
      expect: ran(({ run, seen, fx, leftovers }) => {
        if (seen.length !== 1) return `the install ran ${seen.length} time(s)`
        if (seen[0].remotes !== '') return `the clone kept the remote(s) ${seen[0].remotes}`
        if (seen[0].trunk !== fx.a) return `the clone's ${TRUNK} is ${seen[0].trunk}, not the checkout's ${fx.a} (the local main is ${fx.b})`
        if (seen[0].head !== fx.b || run.commit !== fx.b || run.base !== fx.a) return `the clone is of ${seen[0].head}, the run of ${run.commit} on ${run.base}`
        const got = run.tests.map((t) => `${t.name}|${t.status}|${t.partition}|${t.layer}|${t.component}`).join(' ; ')
        const want = [NEGATIVE, HAPPY, TASK_TEST].map((name) => `${name}|pass|regression|functional|calculator`).join(' ; ')
        if (got !== want) return `the tests came back ${got}`
        if (run.problems.length) return `problems: ${run.problems.join(' | ')}`
        if (run.trace.error || run.trace.failures.length) return `the trace came back ${JSON.stringify(run.trace)}`
        if (run.thresholds.status !== 0 || !/as the stub prints it/.test(run.thresholds.output)) return `the thresholds came back ${JSON.stringify(run.thresholds)}`
        if (run.fitness.length !== 1 || run.fitness[0].environment !== 'verify') return `the fitness records came back ${JSON.stringify(run.fitness)}`
        return leftovers.length ? `left ${leftovers.join(', ')} under the temporary root` : null
      }),
    },
    {
      name: 'a test citing one of --tasks moves from regression into the change\'s partition',
      tasks: [TASK],
      expect: ran(({ run }) => (byName(run, TASK_TEST)?.partition === 'change' && byName(run, HAPPY).partition === 'regression' ? null : `partitions: ${run.tests.map((t) => t.partition).join(', ')}`)),
    },
    {
      name: 'a tree with a change no commit holds is refused',
      doctor: (dir) => write(dir, 'untracked.txt', 'not committed\n'),
      expect: refusedFor(/has changes no commit holds, so a clone of HEAD would verify other code: \?\? untracked\.txt/),
    },
    {
      name: 'a temporary root inside a git repository is refused',
      tmp: (dir) => join(dir, 'apps'),
      expect: refusedFor(/^the temporary root .* is inside the git repository at /),
    },
    {
      name: `a checkout with no ${TRUNK} is refused`,
      doctor: (dir) => fixtureGit(dir, ['update-ref', '-d', `refs/remotes/${TRUNK}`]),
      expect: refusedFor(/^origin\/main is not a ref at /),
    },
    {
      name: 'an install that fails is refused, and the clone is still removed',
      install: 1,
      expect: (outcome) => refusedFor(/^`stub install` failed in the clone, so nothing ran there/)(outcome) ?? (outcome.leftovers.length ? `left ${outcome.leftovers.join(', ')}` : null),
    },
    {
      name: 'a test the record does not list is a problem of the run, by its reason',
      doctor: (dir, fx) => {
        write(dir, TEST_FILE, `${testFile(fx.hash, fx.surface)}// trace: CALC-001:happy@${fx.hash}\ntest('[CALC-001] Two plus two, again', () => {})\n`)
        fixtureGit(dir, ['commit', '--quiet', '-am', `A test the record lacks (${TASK})`])
      },
      expect: ran(({ run }) => (run.problems.some((p) => /"\[CALC-001\] Two plus two, again" ran under `calculator:test`, and the record does not list it/.test(p)) ? null : `problems: ${run.problems.join(' | ')}`)),
    },
    {
      name: 'a failing test is recorded failing; --rerun runs it once more in a fresh clone and records a pass beside it, and refuses a second re-run',
      flaky: true,
      doctor: (dir, fx) => {
        write(dir, TEST_FILE, testFile(fx.hash, fx.surface, ` if (!existsSync(process.env.${FLAKY_ENV})) { writeFileSync(process.env.${FLAKY_ENV}, ''); throw new Error('the first run fails') } `))
        fixtureGit(dir, ['commit', '--quiet', '-am', `A flaky test (${TASK})`])
      },
      rerun: [NEGATIVE, NEGATIVE],
      expect: (outcome) => {
        if (!outcome.run) return `the run refused: ${outcome.refused}`
        if (byName(outcome.run, NEGATIVE)?.status !== 'fail') return `the first run recorded ${byName(outcome.run, NEGATIVE)?.status}`
        const first = outcome.reruns[0]
        if (first.refused || first.test.rerun.status !== 'pass' || !first.test.rerun.command.includes('--name')) return `the re-run came back ${JSON.stringify(first)}`
        const saved = readJson(join(outcome.dir, verifyFile(CHANGE)))
        if (byName(saved, NEGATIVE).rerun?.status !== 'pass') return 'the re-run is not recorded in the JSON'
        return /was run once more already \(pass\)/.test(outcome.reruns[1].refused ?? '') ? null : `a second re-run came back ${JSON.stringify(outcome.reruns[1])}`
      },
    },
    {
      name: '--rerun of a test that did not fail is refused',
      rerun: [HAPPY],
      expect: (outcome) => (/^"\[CALC-001\] Two plus two" did not fail in /.test(outcome.reruns?.[0]?.refused ?? '') ? null : `the re-run came back ${JSON.stringify(outcome.reruns)}`),
    },
    {
      name: '--rerun after HEAD moved is refused',
      rerun: [HAPPY],
      after: (dir) => {
        write(dir, 'NOTE.md', 'Another note.\n')
        fixtureGit(dir, ['commit', '--quiet', '-am', `Another note (${TASK})`])
      },
      expect: (outcome) => (/is the run at \w+, and HEAD is \w+: a test is run again at the commit that failed it/.test(outcome.reruns?.[0]?.refused ?? '') ? null : `the re-run came back ${JSON.stringify(outcome.reruns)}`),
    },
  ]
}

async function attempt(fn) {
  try {
    return { value: await fn() }
  } catch (error) {
    return error instanceof Refusal ? { refused: error.message } : { threw: error.stack ?? String(error) }
  }
}

async function selftest() {
  const started = performance.now()
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'fresh-run-selftest-')))
  const results = []
  try {
    const fx = await buildFixture(base)
    let n = 0
    for (const c of selftestCases()) {
      const dir = join(base, `case-${n}`)
      const tmp = join(base, `tmp-${n++}`)
      mkdirSync(tmp)
      cpSyncTree(fx.dir, dir)
      if (c.doctor) c.doctor(dir, fx)
      const seen = []
      const install = stubInstall(seen, { status: c.install ?? 0 })
      if (c.flaky) process.env[FLAKY_ENV] = join(tmp, 'flaky-marker')
      const outcome = { seen, fx, dir }
      try {
        const first = await attempt(() => freshRun(dir, CHANGE, { tasks: c.tasks ?? [], tmp: c.tmp ? c.tmp(dir) : tmp, install }))
        outcome.refused = first.refused ?? (first.threw ? `(it threw, which is no refusal) ${first.threw}` : undefined)
        outcome.run = first.value?.run
        if (c.after) c.after(dir)
        if (c.rerun && outcome.run) {
          outcome.reruns = []
          for (const name of c.rerun) {
            const again = await attempt(() => rerun(dir, CHANGE, name, { tmp, install }))
            outcome.reruns.push(again.value ?? { refused: again.refused, threw: again.threw })
          }
        }
      } finally {
        delete process.env[FLAKY_ENV]
      }
      outcome.leftovers = readdirList(tmp).filter((name) => name.startsWith('fresh-run-'))
      let detail
      try {
        detail = c.expect(outcome)
      } catch (error) {
        detail = `threw: ${error.stack}`
      }
      results.push({ name: c.name, ok: detail === null, detail: detail ?? 'holds' })
      if (c.control && detail !== null) {
        console.error(`selftest: the undoctored fixture does not pass, so no case can be trusted: ${detail}`)
        process.exitCode = 1
        return
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((r) => !r.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  console.log(`fresh-run selftest: ${results.length - failed.length}/${results.length} cases hold (control plus ${results.length - 1} doctored), in ${((performance.now() - started) / 1000).toFixed(1)} s.`)
  process.exitCode = failed.length ? 1 : 0
}

const readdirList = (dir) => (existsSync(dir) ? readdirSync(dir) : [])

/** A copy of the fixture, its git directory included. */
const cpSyncTree = (from, to) => cpSync(from, to, { recursive: true })

if (process.argv[1] !== undefined && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) await selftest()
  else await main(argv)
}
