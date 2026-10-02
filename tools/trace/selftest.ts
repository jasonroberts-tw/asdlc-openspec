/**
 * The trace gate's selftest: every refusal of `tools/trace/trace.ts`, each on a doctored copy of a
 * fixture repository it builds under the temporary directory, asserting the reason the refusal
 * reports, beside an undoctored control that must pass; the ratchet's update; the history walk held
 * to its ratified fixture; and the command line run end to end through `TRACE_ROOT`.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what the gate would let through if a
 * rule of it broke and this file were absent. Every rule of the gate reads the same derivation, so a
 * refusal that stopped firing would leave the gate green over the calculator, whose tests meet each
 * rule the gate holds today or sit in its baseline: nothing live would show it. Each case breaks one
 * thing and asserts the refusal's own words, so a case cannot pass because another rule refused.
 *
 * INVOCATION. `npm run trace:selftest`. Nothing to point at a copy: it builds its own.
 *
 * NEEDS git, the live records under `tools/policy/`, which each fixture copies so a change to a key
 * the gate reads is felt here, and the pinned OpenSpec CLI (`npm ci`), which trial-archives an active change
 * eight times, two in each of four cases. No network; it writes only under the temporary directory.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { hashRef, readTracePolicy } from '../../scripts/test-trace.mjs'
import { SCRATCH_GIT_ENV, gitIn } from '../lib/git-env.ts'
import { ROOT } from '../lib/paths.ts'
import { copyPolicy, editPolicy } from '../lib/policy.ts'
import { BASELINE, README, RECORD, baselineText, check, derive, emit, ratify, serialise, update, walk } from './trace.ts'

const TRACE = fileURLToPath(new URL('./trace.ts', import.meta.url))
const SPEC = 'openspec/specs/greeting/spec.md'
const TESTS = 'apps/greeter/test/greet.test.js'
/** A test under the directory a script runs with `--dir`, as the build workflow's test-builder writes one. */
const INDEPENDENT_TEST = 'apps/greeter/test/independent/contract/greet.test.js'
const CONTRACT = 'apps/greeter/contracts/api.json'
const SURFACE = 'apps/greeter/binding-surface.md'

const LIVING = `# greeting Specification

## Purpose
How the greeter greets a reader who arrives, returns or leaves.

## Requirements

### Requirement: Greeting is polite
The system SHALL greet every reader politely.

#### Scenario: [GRT-001] A reader arrives
- **WHEN** a reader arrives
- **THEN** the system greets them politely

#### Scenario: [GRT-002] A reader returns
- **WHEN** a reader returns
- **THEN** the system greets them again

### Requirement: Farewell is polite
The system SHALL bid every departing reader farewell.

#### Scenario: [GRT-004] A reader leaves
- **WHEN** a reader leaves
- **THEN** the system bids them farewell

### Requirement: [NFR-GRT-001] Greeting is prompt
The system SHALL greet a reader within one second.

#### Scenario: [GRT-003] A greeting is timed
- **WHEN** a reader arrives
- **THEN** the greeting shows within one second
`

const CONTRACT_DOC = {
  openapi: '3.1.0',
  info: { title: 'greeter', version: '1' },
  paths: { '/greeting': { get: { operationId: 'getGreeting', 'x-scenarios': ['GRT-001'] } } },
}

/** The tests, with `{<ref>}` standing for that ref's current hash, filled in when written. */
const TEST_SOURCE = `import { test } from 'node:test'
// trace-defaults: layer=functional level=1

// trace: GRT-001:happy@{GRT-001}
test('[GRT-001] A reader arrives', () => {})

// trace: GRT-001:negative@{GRT-001}
test('[GRT-001] A passer-by is not greeted', () => {})

// trace: GRT-002:happy@{GRT-002} no-negative:GRT-002 "a return has no near miss"
test('[GRT-002] A reader returns', () => {})

// trace: GRT-004:happy@{GRT-004}
test('[GRT-004] A reader leaves', () => {})

// trace: NFR-GRT-001@{NFR-GRT-001} layer=fitness
test('[NFR-GRT-001] A greeting is timed', () => {})

// trace: GRT-001:happy@{GRT-001} contract:${CONTRACT}#getGreeting@{contract:${CONTRACT}} layer=contract
test('[GRT-001] The greeting endpoint answers', () => {})

// trace: asdlc-openspec-abc.2 surface:${SURFACE}@{surface:${SURFACE}}
test('[asdlc-openspec-abc.2] The greeter imports nothing', () => {})
`

const PROPOSAL = `## Why

Readers who return after a long absence are greeted as if they had never left, and the greeter's
maintainers have asked for the greeting to notice.

## What Changes

- Change the greeting capability.
`

const TREE: Record<string, string> = {
  'package.json': `${JSON.stringify({ type: 'module', scripts: { 'greeter:test': 'node scripts/run-tests.mjs "apps/greeter/test/*.test.js"' } }, null, 2)}\n`,
  'openspec/config.yaml': 'schema: spec-driven\n',
  [SPEC]: LIVING,
  [SURFACE]: '# Binding Surface\n\nThe greeter exports `greet(reader)`.\n',
  [CONTRACT]: `${JSON.stringify(CONTRACT_DOC, null, 2)}\n`,
  'apps/greeter/greet.js': "export const greet = (reader) => `Hello, ${reader}`\n",
}

/** A git command in a fixture repository, with no configuration of this machine's, committing as a fixed identity. */
function scratchGit(dir: string) {
  const git = gitIn(dir, SCRATCH_GIT_ENV)
  const as = ['-c', 'user.name=trace', '-c', 'user.email=trace@example.invalid', '-c', 'commit.gpgsign=false']
  return (args: string[]) => git(args[0] === 'commit' ? [...as, ...args] : args)
}

function put(dir: string, path: string, text: string) {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}

function edit(dir: string, path: string, change: (text: string) => string) {
  const before = readFileSync(join(dir, path), 'utf8')
  const after = change(before)
  if (after === before) throw new Error(`the doctoring of ${path} changed nothing`)
  writeFileSync(join(dir, path), after)
}

/** Write the tests from `source`, each `@{<ref>}` its current hash in `dir`. */
function writeTests(dir: string, source = TEST_SOURCE) {
  const policy = readTracePolicy(dir)
  put(dir, TESTS, source.replace(/@\{([^{}]+)\}/g, (_, ref) => `@${hashRef(dir, ref, policy)}`))
}

/** The test source with `from` replaced by `to`, refusing a fixture that lacks `from`. */
function swap(from: string, to: string, source = TEST_SOURCE) {
  if (!source.includes(from)) throw new Error(`the fixture lacks ${JSON.stringify(from)}`)
  return source.replace(from, to)
}

function commitAll(dir: string, subject: string) {
  const git = scratchGit(dir)
  git(['add', '-A'])
  git(['commit', '-q', '-m', subject])
}

/** An active change `name` with `delta` as its greeting delta spec. */
function addChange(dir: string, name: string, delta: string) {
  put(dir, `openspec/changes/${name}/proposal.md`, PROPOSAL)
  put(dir, `openspec/changes/${name}/specs/greeting/spec.md`, delta)
}

/**
 * The control: a main commit with the greeter and a baseline, `origin/main` on it, and a branch
 * commit that changes the greeter and names its task, then the record written over it.
 */
function buildControl(dir: string) {
  for (const [path, text] of Object.entries(TREE)) put(dir, path, text)
  copyPolicy(ROOT, dir)
  writeTests(dir)
  const git = scratchGit(dir)
  git(['init', '-q', '-b', 'main'])
  commitAll(dir, 'The greeter (asdlc-openspec-abc.1)')
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
  update(dir, { ratified: true })
  commitAll(dir, 'The baseline of the greeter (asdlc-openspec-abc.1)')
  git(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
  edit(dir, 'apps/greeter/greet.js', (text) => text.replace('Hello', 'Hello again'))
  commitAll(dir, 'The greeter says hello again (asdlc-openspec-abc.2)')
  emit(dir, { ratified: true })
  commitAll(dir, 'The trace record of the greeter (asdlc-openspec-abc.2)')
}

type Case = {
  name: string
  doctor: (dir: string) => void
  /** A refusal's reason that must be among the failures, or `pass` for none at all. */
  expect: RegExp | 'pass'
  /** Anything else the case asserts of the tree after it ran, returning why it does not hold. */
  also?: (dir: string, failures: string[]) => string | null
}

const reemit = (dir: string) => emit(dir, { ratified: true })
const record = (dir: string) => JSON.parse(readFileSync(join(dir, RECORD), 'utf8'))

function cases(): Case[] {
  return [
    {
      name: 'control: the undoctored fixture passes, its declared negative advisory and its NFR scenario exempt',
      doctor: () => {},
      expect: 'pass',
      also: (dir) => {
        const { advisories } = check(dir, { ratified: true })
        if (!advisories.some((line) => /^GRT-002 declares its negative test not applicable/.test(line))) return `advisories ${JSON.stringify(advisories)}`
        const specs = record(dir).specs
        const nfrScenario = specs.find((spec: any) => spec.id === 'GRT-003')
        if (nfrScenario?.obligation?.happy !== 'exempt' || nfrScenario.nfr !== 'NFR-GRT-001') return `GRT-003 reads ${JSON.stringify(nfrScenario)}`
        const baseline = JSON.parse(readFileSync(join(dir, BASELINE), 'utf8')).unmet
        if (JSON.stringify(baseline) !== '["GRT-004:negative"]') return `the baseline lists ${JSON.stringify(baseline)}`
        const tasks = record(dir).tasks.map((task: any) => [task.id, task.paths])
        const want = [['asdlc-openspec-abc.1', ['apps/greeter/binding-surface.md', 'apps/greeter/contracts/api.json', 'apps/greeter/greet.js', TESTS]], ['asdlc-openspec-abc.2', ['apps/greeter/greet.js']]]
        return JSON.stringify(tasks) === JSON.stringify(want) ? null : `the tasks read ${JSON.stringify(tasks)}`
      },
    },
    {
      name: 'rule 5: a file under apps/ that a commit naming no task changed',
      doctor: (dir) => {
        put(dir, 'apps/greeter/extra.js', 'export const extra = 1\n')
        commitAll(dir, 'Tidy up the greeter')
      },
      expect: /^rule 5: apps\/greeter\/extra\.js changes on this branch, and no commit since its merge base with origin\/main that changed it names a task/,
    },
    {
      name: 'rule 5 passes the same file in a commit whose subject names its task',
      doctor: (dir) => {
        put(dir, 'apps/greeter/extra.js', 'export const extra = 1\n')
        commitAll(dir, 'Tidy up the greeter (asdlc-openspec-abc.3)')
        reemit(dir)
      },
      expect: 'pass',
    },
    {
      name: 'rule 5: a commit naming no task, to a path an earlier task-naming commit already changed',
      doctor: (dir) => {
        edit(dir, 'apps/greeter/greet.js', (text) => text.replace('Hello again', 'Hello once more'))
        commitAll(dir, 'Tidy the greeting')
      },
      expect: /^rule 5: the commit [0-9a-f]+ "Tidy the greeting" changes apps\/greeter\/greet\.js and names no task in the parentheses ending its subject/,
    },
    {
      name: 'rule 5: origin/main missing, so the branch cannot be measured',
      doctor: (dir) => scratchGit(dir)(['update-ref', '-d', 'refs/remotes/origin/main']),
      expect: /^rule 5: origin\/main is not a ref here, so the branch cannot be measured/,
    },
    {
      name: 'rule 6: a contract operation that no contract test cites',
      doctor: (dir) => {
        edit(dir, CONTRACT, (text) => text.replace('"get": {', '"post": { "operationId": "postGreeting", "x-scenarios": ["GRT-001"] },\n      "get": {'))
        writeTests(dir)
        reemit(dir)
      },
      expect: /^rule 6: the operation `postGreeting` of apps\/greeter\/contracts\/api\.json has no contract test/,
    },
    {
      name: 'rule 6: a contract operation with no operationId',
      doctor: (dir) => {
        edit(dir, CONTRACT, (text) => text.replace('"get": {', '"post": {},\n      "get": {'))
        writeTests(dir)
        reemit(dir)
      },
      expect: /^rule 6: `POST \/greeting` in apps\/greeter\/contracts\/api\.json has no operationId a test can cite/,
    },
    {
      name: 'rule 6: two operations of one contract sharing an operationId',
      doctor: (dir) => {
        edit(dir, CONTRACT, (text) => text.replace('"get": {', '"post": { "operationId": "getGreeting", "x-scenarios": ["GRT-001"] },\n      "get": {'))
        writeTests(dir)
        reemit(dir)
      },
      expect: /^rule 6: two operations of apps\/greeter\/contracts\/api\.json are `getGreeting`, so a test citing it names neither/,
    },
    {
      name: 'rule 6: a contract that is not JSON',
      doctor: (dir) => {
        put(dir, CONTRACT, '{ "openapi": "3.1.0", \n')
        writeTests(dir)
        reemit(dir)
      },
      expect: /^rule 6: apps\/greeter\/contracts\/api\.json is not JSON \(.*\), so its operations cannot be read/,
    },
    {
      name: 'rule 6: a contract test that is skipped does not cover its operation',
      doctor: (dir) => {
        writeTests(dir, swap("test('[GRT-001] The greeting endpoint answers'", "test.skip('[GRT-001] The greeting endpoint answers'"))
        reemit(dir)
      },
      expect: /^rule 6: the operation `getGreeting` of apps\/greeter\/contracts\/api\.json has no contract test/,
    },
    {
      name: 'rule 7: a test whose name names no ID',
      doctor: (dir) => {
        writeTests(dir, swap("test('[GRT-001] A passer-by is not greeted'", "test('A passer-by is not greeted'"))
        reemit(dir)
      },
      expect: /^rule 7: apps\/greeter\/test\/greet\.test\.js: "A passer-by is not greeted" references no scenario, NFR or task ID/,
    },
    {
      name: 'rule 8: a test that carries no artifact hash',
      doctor: (dir) => {
        writeTests(dir, swap(` surface:${SURFACE}@{surface:${SURFACE}}`, ''))
        reemit(dir)
      },
      expect: /^rule 8: apps\/greeter\/test\/greet\.test\.js: "\[asdlc-openspec-abc\.2\] The greeter imports nothing" carries no artifact hash/,
    },
    {
      name: 'unknown: a test citing an ID no spec heads',
      doctor: (dir) => {
        writeTests(dir, `${TEST_SOURCE}\n// trace: GRT-099:happy@{GRT-001}\ntest('[GRT-099] A ghost is greeted', () => {})\n`)
        reemit(dir)
      },
      expect: /^unknown: apps\/greeter\/test\/greet\.test\.js: "\[GRT-099\] A ghost is greeted" cites GRT-099, which heads no scenario or NFR requirement/,
    },
    {
      name: 'unknown: a test on a scenario the archive removed from the living spec, as Finalize leaves it',
      doctor: (dir) => {
        edit(dir, SPEC, (text) => text.replace(/### Requirement: Farewell is polite[\s\S]*?(?=### Requirement: \[NFR)/, ''))
        reemit(dir)
      },
      expect: /^unknown: apps\/greeter\/test\/greet\.test\.js: "\[GRT-004\] A reader leaves" cites GRT-004, which heads no scenario/,
    },
    {
      name: 'unknown: a contract operation its file does not have',
      doctor: (dir) => {
        writeTests(dir, swap(`#getGreeting@`, `#getFarewell@`))
        reemit(dir)
      },
      expect: /^unknown: .*"\[GRT-001\] The greeting endpoint answers" cites `contract:apps\/greeter\/contracts\/api\.json#getFarewell`, an operation apps\/greeter\/contracts\/api\.json does not have/,
    },
    {
      name: 'stale: a scenario edited since its test was written',
      doctor: (dir) => {
        edit(dir, SPEC, (text) => text.replace('greets them politely', 'greets them politely, by name'))
        reemit(dir)
      },
      expect: /^stale: apps\/greeter\/test\/greet\.test\.js: "\[GRT-001\] A reader arrives" was written against `GRT-001:happy@[0-9a-f]+`, and its current hash is/,
    },
    {
      name: 'stale: a Binding Surface edited since its task-only test was written',
      doctor: (dir) => {
        edit(dir, SURFACE, (text) => `${text}It also exports \`farewell(reader)\`.\n`)
        reemit(dir)
      },
      expect: /^stale: .*"\[asdlc-openspec-abc\.2\] The greeter imports nothing" was written against `surface:apps\/greeter\/binding-surface\.md@/,
    },
    {
      name: 'stale: a scenario an active change modifies, whose tests were written against the living one, which are the change\'s',
      doctor: (dir) => {
        addChange(
          dir,
          'greet-by-name',
          '## MODIFIED Requirements\n\n### Requirement: Greeting is polite\nThe system SHALL greet every reader politely.\n\n' +
            '#### Scenario: [GRT-001] A reader arrives\n- **WHEN** a reader arrives\n- **THEN** the system greets them politely, by name\n\n' +
            '#### Scenario: [GRT-002] A reader returns\n- **WHEN** a reader returns\n- **THEN** the system greets them again\n',
        )
        reemit(dir)
      },
      expect: /^stale: apps\/greeter\/test\/greet\.test\.js: "\[GRT-001\] A reader arrives" was written against `GRT-001:happy@/,
      also: (dir) => {
        const r = record(dir)
        const states = r.specs.filter((spec: any) => spec.id === 'GRT-001' || spec.id === 'GRT-002').map((spec: any) => `${spec.id} ${spec.state}`)
        const partition = r.tests.find((test: any) => test.name === '[GRT-001] A reader arrives')?.partition
        return JSON.stringify(states) === '["GRT-001 modified","GRT-002 living"]' && partition === 'change' ? null : `states ${JSON.stringify(states)}, partition ${partition}`
      },
    },
    {
      name: 'obligation: a scenario with no negative test',
      doctor: (dir) => {
        writeTests(dir, swap("// trace: GRT-001:negative@{GRT-001}\ntest('[GRT-001] A passer-by is not greeted', () => {})\n", ''))
        reemit(dir)
      },
      expect: /^obligation: GRT-001 \(greeting, "A reader arrives"\) has no negative test at a layer `traceObligationLayers` lists; write one citing `GRT-001:negative@<hash>`/,
    },
    {
      name: 'obligation: a negative test under a directory a script runs with --dir meets it',
      doctor: (dir) => {
        const negative = "// trace: GRT-001:negative@{GRT-001}\ntest('[GRT-001] A passer-by is not greeted', () => {})\n"
        writeTests(dir, swap(negative, ''))
        const policy = readTracePolicy(dir)
        const source = `import { test } from 'node:test'\n// trace-defaults: layer=contract level=1\n\n${negative}`
        put(dir, INDEPENDENT_TEST, source.replace(/@\{([^{}]+)\}/g, (_, ref) => `@${hashRef(dir, ref, policy)}`))
        edit(dir, 'package.json', (text) => {
          const manifest = JSON.parse(text)
          manifest.scripts['greeter:test:independent'] = 'node scripts/run-tests.mjs --dir apps/greeter/test/independent'
          return `${JSON.stringify(manifest, null, 2)}\n`
        })
        commitAll(dir, 'The passer-by test moves to the independent tests (asdlc-openspec-abc.3)')
        reemit(dir)
      },
      expect: 'pass',
      also: (dir) => {
        const test = record(dir).tests.find((t: any) => t.name === '[GRT-001] A passer-by is not greeted')
        return test?.file === INDEPENDENT_TEST ? null : `the record reads the test as ${JSON.stringify(test)}`
      },
    },
    {
      name: 'obligation: a negative test at the unit layer does not count',
      doctor: (dir) => {
        writeTests(dir, swap('// trace: GRT-001:negative@{GRT-001}', '// trace: GRT-001:negative@{GRT-001} layer=unit'))
        reemit(dir)
      },
      expect: /^obligation: GRT-001 \(greeting, "A reader arrives"\) has no negative test at a layer/,
    },
    {
      name: 'obligation: a skipped negative test does not count',
      doctor: (dir) => {
        writeTests(dir, swap("test('[GRT-001] A passer-by is not greeted'", "test.skip('[GRT-001] A passer-by is not greeted'"))
        reemit(dir)
      },
      expect: /^obligation: GRT-001 \(greeting, "A reader arrives"\) has no negative test at a layer/,
    },
    {
      name: 'obligation: a scenario with no happy-path test',
      doctor: (dir) => {
        writeTests(dir, swap("// trace: GRT-004:happy@{GRT-004}\ntest('[GRT-004] A reader leaves', () => {})\n", ''))
        reemit(dir)
      },
      expect: /^obligation: GRT-004 \(greeting, "A reader leaves"\) has no happy-path test at a layer `traceObligationLayers` lists; write one citing `GRT-004:happy@<hash>`/,
    },
    {
      name: 'obligation: a negative declared not applicable no longer, so it is owed',
      doctor: (dir) => {
        writeTests(dir, swap(' no-negative:GRT-002 "a return has no near miss"', ''))
        reemit(dir)
      },
      expect: /^obligation: GRT-002 \(greeting, "A reader returns"\) has no negative test/,
    },
    {
      name: 'obligation: a scenario an active change adds owes both tests, and no baseline waives them',
      doctor: (dir) => {
        addChange(
          dir,
          'welcome-back',
          '## ADDED Requirements\n\n### Requirement: Welcome back is warm\nThe system SHALL welcome a returning reader warmly.\n\n' +
            '#### Scenario: [GRT-005] A reader is welcomed back\n- **WHEN** a reader returns after a week\n- **THEN** the system welcomes them back\n',
        )
        reemit(dir)
      },
      expect: /^obligation: GRT-005 \(greeting, "A reader is welcomed back"\) has no happy-path test at a layer `traceObligationLayers` lists, and it is new or modified, which no baseline waives/,
    },
    {
      name: 'baseline: an entry that is now met',
      doctor: (dir) => {
        writeTests(dir, `${TEST_SOURCE}\n// trace: GRT-004:negative@{GRT-004}\ntest('[GRT-004] A reader who stays is not bid farewell', () => {})\n`)
        reemit(dir)
      },
      expect: /^baseline: GRT-004:negative is listed and is no longer unmet \(met, or its scenario gone\); run `npm run trace:update`/,
    },
    {
      name: 'baseline: an entry for a scenario an active change modifies',
      doctor: (dir) => {
        addChange(
          dir,
          'farewell-by-name',
          '## MODIFIED Requirements\n\n### Requirement: Farewell is polite\nThe system SHALL bid every departing reader farewell.\n\n' +
            '#### Scenario: [GRT-004] A reader leaves\n- **WHEN** a reader leaves\n- **THEN** the system bids them farewell by name\n',
        )
        writeTests(dir)
        reemit(dir)
      },
      expect: /^baseline: GRT-004:negative is listed, and an active change adds or modifies GRT-004, whose every obligation is met in the change/,
    },
    {
      name: 'baseline: an entry the baseline at the merge base does not list, which the ratchet refuses',
      doctor: (dir) => {
        writeTests(dir, swap("// trace: GRT-001:negative@{GRT-001}\ntest('[GRT-001] A passer-by is not greeted', () => {})\n", ''))
        reemit(dir)
        writeFileSync(join(dir, BASELINE), baselineText(['GRT-001:negative', 'GRT-004:negative']))
      },
      expect: /^baseline: GRT-001:negative is listed, and the baseline at the merge base with origin\/main does not list it: the baseline may fall and never rise/,
    },
    {
      name: 'baseline: a file edited by hand',
      doctor: (dir) => edit(dir, BASELINE, (text) => `${JSON.stringify(JSON.parse(text))}\n`),
      expect: /^baseline: artifacts\/trace\/baseline\.json is not as `npm run trace:update` writes it/,
    },
    {
      name: 'baseline: none',
      doctor: (dir) => rmSync(join(dir, BASELINE)),
      expect: /^baseline: artifacts\/trace\/baseline\.json does not exist; run `npm run trace:update`/,
    },
    {
      name: 'baseline: a file that is not JSON',
      doctor: (dir) => put(dir, BASELINE, 'CALC-001:negative\n'),
      expect: /^baseline: artifacts\/trace\/baseline\.json cannot be read: it is not JSON/,
    },
    {
      name: 'baseline: a file with no unmet list',
      doctor: (dir) => put(dir, BASELINE, serialise({ _: ['a baseline'], entries: ['GRT-004:negative'] })),
      expect: /^baseline: artifacts\/trace\/baseline\.json cannot be read: it has no `unmet` list/,
    },
    {
      name: 'baseline: the one at the merge base cannot be read',
      doctor: (dir) => {
        const good = readFileSync(join(dir, BASELINE), 'utf8')
        put(dir, BASELINE, 'not a baseline\n')
        commitAll(dir, 'A broken baseline on the trunk (asdlc-openspec-abc.2)')
        scratchGit(dir)(['update-ref', 'refs/remotes/origin/main', 'HEAD'])
        put(dir, BASELINE, good)
      },
      expect: /^baseline: artifacts\/trace\/baseline\.json at the merge base [0-9a-f]{12} cannot be read: it is not JSON/,
    },
    {
      name: "baseline: a scenario an active change removes owes nothing, its entry must go and its tests are to retire",
      doctor: (dir) => {
        addChange(dir, 'no-farewell', '## REMOVED Requirements\n\n### Requirement: Farewell is polite\n**Reason**: nobody leaves.\n**Migration**: none.\n')
        reemit(dir)
      },
      expect: /^baseline: GRT-004:negative is listed and is no longer unmet/,
      also: (dir) => {
        const r = record(dir)
        const spec = r.specs.find((s: any) => s.id === 'GRT-004')
        const partition = r.tests.find((test: any) => test.name === '[GRT-004] A reader leaves')?.partition
        return spec?.state === 'removed' && spec.obligation.happy === 'exempt' && partition === 'retire' ? null : `GRT-004 ${JSON.stringify(spec)}, partition ${partition}`
      },
    },
    {
      name: 'record: stale, a test changed and the record not written again',
      doctor: (dir) => writeTests(dir, swap('// trace: GRT-001:negative@{GRT-001}', '// trace: GRT-001:negative@{GRT-001} layer=integration')),
      expect: /^record: artifacts\/trace\/record\.json is stale, line \d+: committed .*run `npm run trace` after the last commit that changes apps\//,
    },
    {
      name: 'record: none',
      doctor: (dir) => rmSync(join(dir, RECORD)),
      expect: /^record: artifacts\/trace\/record\.json does not exist; run `npm run trace` and commit it/,
    },
    {
      name: 'record: the README edited by hand',
      doctor: (dir) => edit(dir, README, (text) => text.replace('nothing edits by hand', 'hardly anything edits by hand')),
      expect: /^record: artifacts\/trace\/README\.md is stale, line \d+: .*it is never edited by hand: `npm run trace` writes it/,
    },
    {
      name: 'record: a file in artifacts/trace/ that neither command writes',
      doctor: (dir) => put(dir, 'artifacts/trace/record.old.json', '{}\n'),
      expect: /^record: artifacts\/trace\/record\.old\.json is a file neither `npm run trace` nor `npm run trace:update` writes/,
    },
    {
      name: 'record: a policy whose obligation layers name one testTraceLayers does not',
      doctor: (dir) => editPolicy(dir, (policy) => (policy.traceObligationLayers = ['functional', 'system'])),
      expect: /^record: it cannot be derived: tools\/policy\/vocabulary\.json has no list under `traceObligationLayers` of layers `testTraceLayers` declares/,
    },
    {
      name: 'reader: no package script runs the test runner, so no test is read',
      doctor: (dir) => edit(dir, 'package.json', (text) => text.replace('node scripts/run-tests.mjs', 'node --test')),
      expect: /^reader: no script in package\.json runs `node scripts\/run-tests\.mjs` over a quoted pattern/,
    },
    {
      name: 'reader: metadata the reader refuses is refused here in its words',
      doctor: (dir) => {
        writeTests(dir, swap('// trace: GRT-001:negative@{GRT-001}', '// trace: GRT-001:negative@{GRT-001} proves-it'))
        reemit(dir)
      },
      expect: /^reader: apps\/greeter\/test\/greet\.test\.js:\d+: `proves-it` is not a token of a `\/\/ trace:` line/,
    },
  ]
}

function run(base: string, control: string, results: { name: string; ok: boolean; detail: string }[]) {
  for (const { name, doctor, expect, also } of cases()) {
    const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60))
    cpSync(control, dir, { recursive: true })
    let ok: boolean
    let detail: string
    try {
      doctor(dir)
      const { failures } = check(dir, { ratified: true })
      if (expect === 'pass') {
        ok = failures.length === 0
        detail = ok ? 'passes' : `unexpected refusal(s): ${failures.join(' | ')}`
      } else {
        ok = failures.some((failure) => expect.test(failure))
        detail = ok
          ? `refused for that reason (${failures.length} refusal(s))`
          : failures.length === 0
            ? 'PASSED, but should have been refused'
            : `refused, but not for that reason: ${failures.join(' | ')}`
      }
      const more = ok && also ? also(dir, failures) : null
      if (more !== null) {
        ok = false
        detail = more
      }
    } catch (error) {
      ok = false
      detail = `threw: ${(error as Error).stack}`
    }
    results.push({ name, ok, detail })
    if (name.startsWith('control') && !ok) return false
  }
  return true
}

/** The ratchet's update, the walk's ratification, and the command line through `TRACE_ROOT`. */
function others(base: string, control: string) {
  const out: { name: string; ok: boolean; detail: string }[] = []
  const copy = (name: string) => {
    const dir = join(base, name)
    cpSync(control, dir, { recursive: true })
    return dir
  }
  const attempt = (name: string, body: () => [boolean, string]) => {
    try {
      const [ok, detail] = body()
      out.push({ name, ok, detail })
    } catch (error) {
      out.push({ name, ok: false, detail: `threw: ${(error as Error).stack}` })
    }
  }

  attempt('trace:update drops an entry now met and adds none the base does not list', () => {
    const dir = copy('update-falls')
    writeTests(
      dir,
      `${swap("// trace: GRT-001:negative@{GRT-001}\ntest('[GRT-001] A passer-by is not greeted', () => {})\n", '')}` +
        `\n// trace: GRT-004:negative@{GRT-004}\ntest('[GRT-004] A reader who stays is not bid farewell', () => {})\n`,
    )
    const moved = update(dir, { ratified: true })
    const text = readFileSync(join(dir, BASELINE), 'utf8')
    const ok = text === baselineText([]) && JSON.stringify(moved) === JSON.stringify({ kept: [], dropped: ['GRT-004:negative'], refused: ['GRT-001:negative'] })
    return [ok, `wrote ${JSON.stringify(JSON.parse(text).unmet)}, returned ${JSON.stringify(moved)}`]
  })

  attempt('the history walk agrees with its hand-ratified fixture', () => {
    const problem = ratify()
    return [problem === null, problem ?? 'agrees']
  })
  attempt('a history walk that drops a commit is refused before anything is written', () => {
    // The oldest commit, which names abc.1: a walk that loses it returns a smaller answer.
    const problem = ratify((git, pattern, range) => walk(git, pattern, range).slice(0, -1))
    return [problem !== null && /^the history walk read the hand-ratified fixture as /.test(problem), problem ?? 'PASSED, but should have been refused']
  })

  const cli = (dir: string, ...args: string[]) =>
    spawnSync(process.execPath, [TRACE, ...args], { encoding: 'utf8', env: { ...process.env, TRACE_ROOT: dir } })
  attempt('the command line: trace:check passes the control through TRACE_ROOT', () => {
    const run = cli(control, '--check')
    return [run.status === 0 && /every rule holds/.test(run.stdout), `status ${run.status}, ${JSON.stringify((run.stdout + run.stderr).trim().slice(0, 400))}`]
  })
  attempt('the command line: trace:check refuses a doctored copy with the reason, and writes nothing', () => {
    const dir = copy('cli-stale')
    writeTests(dir, swap('// trace: GRT-001:negative@{GRT-001}', '// trace: GRT-001:negative@{GRT-001} layer=integration'))
    const before = readFileSync(join(dir, RECORD), 'utf8')
    const run = cli(dir, '--check')
    const after = readFileSync(join(dir, RECORD), 'utf8')
    return [run.status === 1 && /record: artifacts\/trace\/record\.json is stale/.test(run.stderr) && before === after, `status ${run.status}, record ${before === after ? 'untouched' : 'REWRITTEN'}`]
  })
  attempt('the command line: trace writes the record trace:check then passes, the same bytes as a second run', () => {
    const dir = copy('cli-write')
    writeTests(dir, swap('// trace: GRT-001:negative@{GRT-001}', '// trace: GRT-001:negative@{GRT-001} layer=integration'))
    const first = cli(dir)
    const once = readFileSync(join(dir, RECORD), 'utf8')
    cli(dir)
    const twice = readFileSync(join(dir, RECORD), 'utf8')
    const checked = cli(dir, '--check')
    const derived = serialise(derive(dir).record)
    return [first.status === 0 && once === twice && once === derived && checked.status === 0, `write ${first.status}, check ${checked.status}, ${once === twice ? 'same bytes' : 'DIFFERENT bytes'}`]
  })
  attempt('the command line: trace:update moves the baseline through TRACE_ROOT', () => {
    const dir = copy('cli-update')
    writeTests(dir, `${TEST_SOURCE}\n// trace: GRT-004:negative@{GRT-004}\ntest('[GRT-004] A reader who stays is not bid farewell', () => {})\n`)
    const run = cli(dir, '--update')
    return [run.status === 0 && readFileSync(join(dir, BASELINE), 'utf8') === baselineText([]), `status ${run.status}, ${JSON.stringify(run.stdout.trim())}`]
  })
  attempt('the command line: a TRACE_ROOT below the top of its checkout is refused', () => {
    const run = cli(join(control, 'apps'), '--check')
    return [run.status === 1 && /is not the top of a git checkout/.test(run.stderr), `status ${run.status}, ${JSON.stringify(run.stderr.trim().slice(0, 300))}`]
  })
  attempt('the command line: a shallow clone is refused, since its history is not whole', () => {
    const dir = join(base, 'shallow')
    // The scratch environment, never this process's: a pre-push hook exports GIT_DIR, which a clone
    // would write this repository's objects under.
    const cloned = spawnSync('git', ['clone', '-q', '--depth', '1', pathToFileURL(control).href, dir], { encoding: 'utf8', env: SCRATCH_GIT_ENV })
    if (cloned.status !== 0) return [false, `the shallow clone failed: ${cloned.stderr}`]
    const run = cli(dir, '--check')
    return [run.status === 1 && /this is a shallow clone/.test(run.stderr), `status ${run.status}, ${JSON.stringify(run.stderr.trim().slice(0, 300))}`]
  })
  return out
}

function main() {
  const base = mkdtempSync(join(tmpdir(), 'trace-selftest-'))
  const results: { name: string; ok: boolean; detail: string }[] = []
  let fatal: string | null = null
  try {
    const control = join(base, 'control')
    buildControl(control)
    if (run(base, control, results)) results.push(...others(base, control))
    else fatal = 'the undoctored fixture does not pass'
  } catch (error) {
    fatal = `the fixture could not be built: ${(error as Error).stack}`
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  if (fatal) console.error(`trace selftest: ${fatal}, so no case can be trusted.`)
  console.log(`trace selftest: ${results.length - failed.length}/${results.length} cases hold.`)
  process.exit(failed.length === 0 && fatal === null ? 0 : 1)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main()
