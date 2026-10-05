/**
 * Workflow selftest: runs each workflow script under `.claude/workflows/` against stubbed agents and
 * asserts how it stops and what it returns. `build-change-task.js` runs with the review sizes, the
 * red-first kinds and the independent-test keys `tools/policy/` holds, and its cases assert how
 * many skeptics it sends, which kinds it stops as not-red when a named scenario has neither a red
 * record nor an already-green report, and, for its test-builder and architect, each stop and each
 * triage route, by its reason: the test-builder called by its agent type with a prompt built from
 * the allowed inputs alone, and no planted test source, assertion text or stack frame in any
 * builder's or fixer's prompt. It also holds `.claude/agents/test-builder.md` to a `tools:` line of
 * StructuredOutput alone, on the tracked file and on a copy given Bash; `review-prompts.js` runs
 * with groups of findings built here and the policy's `promptReview*` keys, and its cases assert
 * which findings it refuses as below the threshold, how many skeptics it sends each change, each
 * consolidation and each unstated edit, which reports it refuses, which branches it lets the session merge, which analyses
 * it lets the session mark read and which findings it holds, and how it answers each stored decision
 * case of a changed file with the old text and the new and which outcome keeps a branch out. Each
 * finding it is passed carries a `match` as `scripts/match-held-findings.mjs` prints one, and its
 * cases assert which answers the workflow runs on and which it refuses before any agent.
 * `author-prompt-cases.js` runs with seeds and cases built here and the policy's `promptReviewCase*`
 * keys, and its cases assert how many authors it sends each seed, what each is shown, which reader's
 * copy or path it refuses, and which case it stores. Each of the two runs once more with its reader
 * answered by running the command it gives, `scripts/prompt-case-texts.mjs`, in a fixture git
 * repository built under the temporary directory: the command must be one plain run of that script
 * naming no git, each author and answer must be sent to the file holding the text git holds at its
 * ref, and a text git cannot show, a head with no merge base and an argument that climbs out of the
 * script's root must each be refused by its reason. Every stored case under `.claude/prompt-cases/`
 * goes through both, and the two must give one case and one file the same answer prompt; the two
 * agents they run by agentType are held the same way to a `tools:` line of Read and StructuredOutput
 * alone. `verify-change-trace.js` runs with a
 * two-capability change built here and the policy's `verifyTrace*` keys, and its cases assert which
 * inputs it refuses, how it matches each tracer's rows to its scenarios, which gap it gives each
 * row, how many skeptics it sends each gap, how it tallies them, and what a run again keeps. Its
 * clause run runs on the result of its own clean first run, with answers from the plan
 * `scripts/judge-trace-clauses.mjs` makes of the fixture's specs and tests through a stubbed client,
 * and those cases assert which row a clause under `verifyTraceClauseThreshold` sends to the skeptics,
 * each outcome of their votes, and each refusal. Its
 * result then goes through `scripts/render-trace.mjs` and `scripts/render-pr-body.mjs`, over delta
 * specs written under the temporary directory, and their cases assert what each writes and what each
 * refuses. It holds every script to what the Workflow runtime accepts: a pure `meta`
 * literal first, every phase declared there, and no clock or randomness. A script under
 * `.claude/workflows/` with no suite here is refused, so a workflow cannot land unheld.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: `build-change-task.js` is tracked for the first
 * time in the change that adds this file (asdlc-openspec-d6b), and `review-prompts.js` in the change
 * that adds its suite (asdlc-openspec-lzr). Were this wrong, it would let through the logic a real run
 * cannot show cheaply. For the build: a third review round, an unverified vote counted as refuted, a
 * spec contradiction halting before skeptics confirmed it, a coverage gap sent to skeptics, a listener
 * left on 127.0.0.1 and not reported, or a policy key renamed so that every run refuses; or a task of
 * a kind `buildRedFirstKinds` lists let through to review with a named scenario that has neither a red
 * record nor an already-green report, a task of another kind stopped for one, or an already-green
 * report counted as passed (since asdlc-openspec-fye); or a test-builder that can read the
 * app-builder's work, an app-builder that writes the test-builder's tests, a flaky test counted as
 * passing, a fixer handed a test's source, even with its spaces moved, or the runner's words as its
 * environment, or a test-builder handed the architect's words (since asdlc-openspec-j09.11; the last
 * three were found by the session's review of 2026-09-29, each case seen failing before its fix); or a
 * task naming no ID that, having no test-builder, leaves every earlier task's build-stage file
 * unrun (since asdlc-openspec-ao0, its case seen failing before its fix); or an earlier task's file,
 * rewritten by the test-builder, sent back unrun for naming earlier tasks' IDs (since
 * asdlc-openspec-wkgb, its case seen failing before its fix). For the
 * prompt review: a branch merged that changed another group's file, failed its gates, was never
 * provisioned by the WorktreeCreate hook, or carried an edit a majority of its skeptics did not
 * uphold; a finding below the threshold passed to an agent; an analysis marked read whose file's
 * agent returned nothing; or a finding read and not proposed that is not returned to be held (since
 * asdlc-openspec-pnm); or a consolidation merged whose rows do not say where each removed rule went,
 * or that a majority of its skeptics did not uphold (since asdlc-openspec-aa0); or a branch merged
 * that turned a stored case from right to wrong or left one unanswered, a case stored that some
 * answer with the trunk's text did not choose as expected, an answer or an author that could run a
 * command, one sent to a path its reader's command did not write, or a changed file a report left
 * unlisted, whose cases no one answered (since asdlc-openspec-7c1). Each of the flip, the bar to
 * store, the unlisted file and the authoring reader's path was seen failing with its guard removed;
 * the review reader's path check was not, since the session's classifier refused that edit. A
 * reader stub never meets the tools' limit on a line's length, so the session's review measured the
 * real commands instead (`docs/decisions.md` § D-32). Nor does a stub meet Claude Code: on 2026-10-04
 * it refused each reader its command, an inline script that ran git, inside the review's own
 * worktree, and three prompt reviews stopped with no case authored or answered (asdlc-openspec-jtrt).
 * Since then a reader's command that is not one plain run of the reader script, or that names git, is
 * refused, its case seen failing before its fix, and the readers run for real in a fixture
 * repository, the script's refusal of a climbing argument seen failing with its check removed. Since
 * asdlc-openspec-d078 it refuses a review that merges a branch with an edit to a file its report lists
 * as changed and names in no change it states, or only in an entry that is no edit, which no skeptic
 * read; its three cases were seen failing before its fix. Since asdlc-openspec-6yt.1 it refuses a
 * review that runs a finding keyed by the model under a threshold or for another key, or by the
 * session where the model's answer met one; each check of the match, deleted in a copy, turned its
 * case red. Since the branch review of 2026-10-05 it also refuses a held key the model gave whose
 * count is not its runs and the runs that key's held lines name, counted once each, or that names no
 * such runs; the three cases were seen failing before the fix, 297 of 300 cases holding. For the
 * trace (since asdlc-openspec-as9):
 * a scenario left out of every group, a group a tracer returned short or read at
 * another commit counted as traced, a row's gap taken from the tracer's words rather than its
 * reading, a gap nobody could verify counted refuted, a failed proof cleared by a skeptic's vote, a
 * dead lens's reading kept on a run again, and a trace or a pull-request body written with a
 * scenario missing, a gap open or a row that did not pass; and since asdlc-openspec-6yt.3, a clause
 * run that judges a clause at its threshold, judges a trace that had a gap, or loses a corrected
 * row's tracer reading, each of the three seen failing with its guard removed. Each costs millions
 * of tokens, a wrong verdict, a rule lost from a prompt or a finding never reviewed,
 * before anyone sees it, and no other gate reads their logic: `check:prompts` counts only the words
 * of their string literals, and `openspec:check` reads only skills and agents.
 *
 * INVOCATION.
 *
 *   mise run workflows:selftest    every case, against the tracked workflow and policy
 *
 * By hand, point `WORKFLOWS_ROOT` at a copy whose workflow or policy you have doctored, to see which
 * case catches the change:
 *
 *   WORKFLOWS_ROOT=/tmp/doctored node scripts/workflows.selftest.mjs
 *
 * HOW IT RUNS THE SCRIPT. A workflow is not a module: it uses the runtime's `agent`, `parallel`,
 * `pipeline`, `phase`, `log` and `args`, with top-level `await` and `return`. This file cuts the
 * `meta` literal off, evaluates the rest as the body of an async function, and passes stubs for each,
 * plus a `Date` and a `Math.random` that throw, as the runtime's do. Each stubbed agent is answered by
 * its label (each workflow's header lists them), and each answer is checked against the schema the
 * agent was given: a field the schema does not declare is refused, since a real agent would never
 * return it. The build's Setup agent's answer is the real policy, and so is the review's
 * `args.policy`; every number a case expects is read from it, so no case restates a constant, and a
 * case the policy's values cannot exercise fails and says why. Each suite has an undoctored control
 * that must pass before any of its other cases is trusted.
 *
 * The refusal of a script with no suite is held the same way: a control directory built under the
 * temporary directory holding only the suites' scripts must report nothing, and the same with one
 * more script must report it, by its reason.
 *
 * NEEDS only committed files: the workflows, the records under `tools/policy/` read through
 * `tools/lib/policy.ts`, the three tool-less agents under `.claude/agents/`, the stored cases under
 * `.claude/prompt-cases/`, the trace renderers with `scripts/lib/trace.mjs`, and the clause check's
 * plan in `scripts/judge-trace-clauses.mjs` with the test reader it imports; each renderer runs
 * twice as a child process. It needs git too, for the readers' fixture repository, which it builds
 * and runs `scripts/prompt-case-texts.mjs` in with no `GIT_*` key, so a hook's `GIT_DIR` cannot
 * point either at this repository. It
 * writes only under the temporary directory. No agent, no network. 0.27 s wall, both of two runs,
 * through `node --run` (`/usr/bin/time -p`) on a macOS 26.7 laptop with Node 26.8.1, 2026-09-29, with
 * the test-builder and architect cases, much of it those four child processes; 0.63 s and 0.62 s on
 * 2026-10-03, with the stored prompt cases' suites, timed by a script around `node --run` on the same
 * laptop (asdlc-openspec-7c1). 1.62 s and 1.55 s on 2026-10-04 with the readers' fixture repository,
 * where the trunk's selftest took 0.64 s and 0.66 s, each run as `node` under `/usr/bin/time -p` on the
 * same laptop with Git 2.54.0. The difference, about 0.9 s, is the reader cases', its fixture
 * repository and the script's five runs, since nothing else here changed (asdlc-openspec-jtrt).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv, gitIn, SCRATCH_GIT_ENV } from '../tools/lib/git-env.ts'
import { POLICY_DIR, readPolicy } from '../tools/lib/policy.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.WORKFLOWS_ROOT ?? REPO_ROOT

const WORKFLOWS = '.claude/workflows'
const BUILD = `${WORKFLOWS}/build-change-task.js`
const REVIEW = `${WORKFLOWS}/review-prompts.js`
const VERIFY = `${WORKFLOWS}/verify-change-trace.js`
const AUTHOR = `${WORKFLOWS}/author-prompt-cases.js`
/** The bank of stored decision cases, one JSON file per case (`.claude/prompt-cases/README.md`). */
const CASES_DIR = '.claude/prompt-cases'
/** The script each prompt workflow's reader agent runs to write the texts its cases are answered from. */
const READER = 'scripts/prompt-case-texts.mjs'
/** The keys Setup's command prints, as `POLICY_KEYS` in `build-change-task.js` lists them: keep the two in agreement. */
const POLICY_KEYS = [
  'buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'buildRedFirstKinds', 'assetLabels',
  'buildIndependentKinds', 'buildArchitectMaxRounds', 'independentInputs', 'independentTestDir', 'independentLayers', 'architectRunLayers', 'testTraceLayers',
]
const TEST_BUILDER_AGENT = '.claude/agents/test-builder.md'
/**
 * Each agent a workflow runs by agentType with the tools it may have and no other: the test-builder
 * its structured output alone, so nothing on disk or in git reaches it; a prompt case's author and
 * answerer Read beside it, to read the one file their workflow wrote, and no command or search.
 */
const AGENT_TOOLS = {
  [TEST_BUILDER_AGENT]: 'StructuredOutput',
  '.claude/agents/prompt-case-author.md': 'Read, StructuredOutput',
  '.claude/agents/prompt-case-answerer.md': 'Read, StructuredOutput',
}
const TOOLLESS_AGENTS = Object.keys(AGENT_TOOLS)
const REVIEW_POLICY_KEYS = ['promptReviewRecurrenceCount', 'promptReviewMajorSeverities', 'promptReviewSkeptics', 'promptReviewCaseLenses', 'promptReviewCaseRepetitions', 'promptReviewMatchHeldMinProbability', 'promptReviewMatchNoneMinProbability']
/** The key of the trace's clause run, a probability, as `CLAUSE_KEY` in `verify-change-trace.js` names it. */
const CLAUSE_KEY_NAME = 'verifyTraceClauseThreshold'
const VERIFY_POLICY_KEYS = ['verifyTraceMaxScenarios', 'verifyTraceDesignLenses', 'verifyTraceSkeptics', CLAUSE_KEY_NAME]
const HEAD = 'export const meta = {'

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/* ----------------------------------------------------------------------- reading the script ----- */

/** The index of the brace that closes the one at `open`, skipping quoted strings. */
function closingBrace(text, open) {
  let depth = 0
  for (let i = open; i < text.length; i++) {
    const c = text[i]
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === '\\') i++
    } else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i
  }
  return -1
}

/** A workflow's `meta`, its body, and why the runtime would refuse it, if it would. */
function readWorkflow(root, file) {
  let source
  try {
    source = readFileSync(join(root, file), 'utf8')
  } catch (error) {
    return { problems: [`${file} could not be read: ${error.message}`] }
  }
  const problems = []
  if (!source.startsWith(HEAD)) {
    return { problems: [`${file} does not start with \`${HEAD}\`, which the Workflow runtime needs first`] }
  }
  const open = HEAD.length - 1
  const close = closingBrace(source, open)
  if (close === -1) return { problems: [`${file}: the meta literal never closes`] }
  const literal = source.slice(open, close + 1)
  let meta = null
  if (literal.includes('${')) problems.push(`${file}: the meta literal interpolates, and the runtime needs a pure literal`)
  try {
    meta = new Function(`"use strict"; return (${literal})`)()
  } catch (error) {
    problems.push(`${file}: the meta literal is not a pure literal (${error.message})`)
  }
  if (meta && (typeof meta.name !== 'string' || typeof meta.description !== 'string' || !Array.isArray(meta.phases))) {
    problems.push(`${file}: meta needs a name, a description and a list of phases`)
  }
  const body = source.slice(close + 1)
  const declared = new Set((meta?.phases ?? []).map((p) => p.title))
  const used = new Set([...body.matchAll(/\bphase(?:\(\s*|:\s*)'([^']+)'/g)].map((m) => m[1]))
  for (const title of [...used].sort()) {
    if (!declared.has(title)) problems.push(`${file}: the phase '${title}' is used but not declared in meta.phases`)
  }
  for (const [pattern, what] of [
    [/\bDate\.now\b/, 'Date.now()'],
    [/\bMath\.random\b/, 'Math.random()'],
    [/\bnew Date\s*\(/, 'new Date()'],
  ]) {
    if (pattern.test(body)) problems.push(`${file} calls ${what}, which the Workflow runtime forbids`)
  }
  return { meta, body, problems }
}

/** The scripts under `.claude/workflows/` that no suite here runs. */
function unheld(root, suites) {
  let names
  try {
    names = readdirSync(join(root, WORKFLOWS))
  } catch (error) {
    return [`${WORKFLOWS} could not be listed: ${error.message}`]
  }
  const held = new Set(suites.map((s) => s.file))
  return names
    .filter((name) => name.endsWith('.js'))
    .map((name) => `${WORKFLOWS}/${name}`)
    .filter((file) => !held.has(file))
    .sort()
    .map((file) => `${file} has no suite in scripts/workflows.selftest.mjs, so nothing holds it; add one`)
}

/* ----------------------------------------------------------------------------- the runtime ----- */

/** Why `value` does not satisfy `schema`, or null. Strict: an undeclared field is refused. */
function schemaProblem(schema, value, path) {
  if (schema.type === 'object') {
    if (!isPlainObject(value)) return `${path} is not an object`
    const props = schema.properties ?? {}
    for (const key of schema.required ?? []) {
      if (!(key in props)) return `${path}: \`${key}\` is required but not a property, so the schema is unsatisfiable`
      if (!(key in value)) return `${path}.${key} is missing`
    }
    for (const [key, v] of Object.entries(value)) {
      if (!(key in props)) return `${path}.${key} is not in the schema, so a real agent would never return it`
      const problem = schemaProblem(props[key], v, `${path}.${key}`)
      if (problem) return problem
    }
    return null
  }
  if (schema.type === 'array') {
    if (!Array.isArray(value)) return `${path} is not an array`
    for (const [i, item] of value.entries()) {
      const problem = schemaProblem(schema.items, item, `${path}[${i}]`)
      if (problem) return problem
    }
    return null
  }
  const typeOk =
    schema.type === 'string' ? typeof value === 'string'
    : schema.type === 'boolean' ? typeof value === 'boolean'
    : schema.type === 'integer' ? Number.isInteger(value)
    : null
  if (typeOk === null) return `${path}: the schema type ${schema.type} is not one this selftest reads`
  if (!typeOk) return `${path} is not a ${schema.type}`
  if (schema.enum && !schema.enum.includes(value)) return `${path} is ${JSON.stringify(value)}, outside ${schema.enum.join('|')}`
  return null
}

function ForbiddenDate() {
  throw new Error('the workflow used Date, which the Workflow runtime forbids')
}
ForbiddenDate.now = () => {
  throw new Error('the workflow called Date.now(), which the Workflow runtime forbids')
}
const SafeMath = Object.create(Math, {
  random: {
    value: () => {
      throw new Error('the workflow called Math.random(), which the Workflow runtime forbids')
    },
  },
})

/** Run the body once, answering each agent with `answer(label, prompt)`. */
async function run(body, args, answer) {
  const calls = []
  const options = []
  const logs = []
  const problems = []
  const agent = async (prompt, opts = {}) => {
    const label = opts.label ?? ''
    calls.push(label)
    options.push({ label, prompt, isolation: opts.isolation, agentType: opts.agentType })
    const reply = answer(label, prompt)
    if (reply === null || reply === undefined) return null
    if (opts.schema) {
      const problem = schemaProblem(opts.schema, reply, label)
      if (problem) problems.push(`the stub's answer to "${label}" does not fit its schema: ${problem}`)
    }
    return reply
  }
  const settle = async (thunk) => {
    try {
      return await thunk()
    } catch (error) {
      problems.push(`an agent call threw: ${error.message}`)
      return null
    }
  }
  const parallel = (thunks) => Promise.all(thunks.map(settle))
  const pipeline = (items, ...stages) =>
    Promise.all(
      items.map((item, index) =>
        settle(async () => {
          let prev = item
          for (const stage of stages) prev = await stage(prev, item, index)
          return prev
        }),
      ),
    )
  const budget = { total: null, spent: () => 0, remaining: () => Infinity }
  const workflow = () => {
    throw new Error('this workflow runs no other workflow')
  }
  const fn = new AsyncFunction('agent', 'parallel', 'pipeline', 'phase', 'log', 'args', 'budget', 'workflow', 'Date', 'Math', body)
  let result
  try {
    result = await fn(agent, parallel, pipeline, () => {}, (m) => logs.push(m), args, budget, workflow, ForbiddenDate, SafeMath)
  } catch (error) {
    problems.push(`the workflow threw: ${error.stack ?? error.message}`)
  }
  return { result, calls, options, logs, problems }
}

/* ------------------------------------------------------------------------------ fixtures ----- */

const WORKTREE = '/tmp/worktrees/example'
const BRANCH = 'agent/example'
const BASELINE = [{ pid: '100', port: '5000', command: 'already-listening' }]
const PASSING = { command: 'npm run example:test', passed: true, output: 'ok' }
const SCENARIO = '[EXA-001] The display shows 1'
const SECOND = '[EXA-002] The display clears'
const FAILURE = 'expected 1, got 0'
const EVIDENCE = 'The proof passed before any change: the display already showed 1.'

const APP = 'example'
const IDIR = `apps/${APP}/test/independent`
const CONTRACT = `${IDIR}/build/contract/display.test.js`
/** Planted in the test-builder's file, the runner's output and the architect's account: no builder or fixer prompt may hold one. */
const PLANTED = ['planted-source-line', 'planted-assertion-text', 'TestContext.<anonymous>', 'display.test.js']
const FRAME = `    at TestContext.<anonymous> (file://${WORKTREE}/${CONTRACT}:9:3)`
const EXPECTED = 'the display shows 1'
const OBSERVED = 'The display showed 0.'
/** The line of the test a rewrite-test route quotes as wrong: text the test-builder wrote itself. */
const QUOTED = "assert.equal(marker, 'planted-assertion-text')"

const args = (kind, extra = {}) => ({
  task: { id: 'example-1.2', title: 'An example task', body: 'Build the example.' },
  scenarios: [SCENARIO],
  change: 'example-change',
  worktree: WORKTREE,
  branch: BRANCH,
  kind,
  app: APP,
  ...extra,
})

/** A test-builder's file: one contract test of SCENARIO, its source holding the planted markers. */
const testFile = (extra = {}, id = 'EXA-001') => ({
  path: CONTRACT,
  layer: 'contract',
  runAt: 'build',
  content: [
    "import { test } from 'node:test'",
    "import assert from 'node:assert/strict'",
    '// trace-defaults: layer=contract level=1',
    `// trace: ${id}:happy@aaaaaaaaaaaa`,
    `test('[${id}] The display shows 1', () => {`,
    "  const marker = 'planted-source-line'",
    "  assert.equal(marker, 'planted-assertion-text')",
    '})',
  ].join('\n'),
  ...extra,
})
const tests = (files = [testFile()]) => ({ files, complete: true, findings: [] })

/** FNV-1a over UTF-16 code units, as the workflow's Setup command computes it. */
function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
const INPUT_FILES = [
  { path: 'openspec/changes/example-change/design.md', text: '# Design\n\nThe display shows what was pressed.\n' },
  { path: 'openspec/changes/example-change/specs/example/spec.md', text: '#### Scenario: [EXA-001] The display shows 1\n\n- WHEN 1 is pressed\n- THEN the display shows 1\n' },
  { path: `apps/${APP}/binding-surface.md`, text: '# Binding Surface\n\n`press(key)` and `displayText()`.\n' },
]
const LEAKED = { path: `apps/${APP}/public/app.js`, text: "export const leaked = 'app-builder-code'\n" }
const TASKS = [{ id: 'example-1.2', status: 'in_progress', title: 'An example task', description: 'Build the example.' }]
/** Setup's inputs as its command prints them; `doctor` changes the printed object after the checksum. */
const inputsJson = (files = INPUT_FILES, doctor = (x) => x) => JSON.stringify(doctor({ files, tasks: TASKS, fnv: fnv(JSON.stringify({ files, tasks: TASKS })) }))
const CITED = ['EXA-001:happy@aaaaaaaaaaaa', 'EXA-001:negative@aaaaaaaaaaaa', `surface:apps/${APP}/binding-surface.md@bbbbbbbbbbbb`]

const attempt = (passed, output = passed ? 'ok' : `not ok 1 - [EXA-001] The display shows 1\n${FRAME}\n  planted-assertion-text`) => ({ passed, output })
/** The runner's answer: `outcome(path)` gives each file's attempts; clean status unless `status` is given. */
const ranWith = (prompt, outcome = () => [attempt(true)], status = '') => ({
  results: [...prompt.matchAll(/^- node scripts\/run-tests\.mjs "([^"]+)"$/gm)].map((m) => ({ path: m[1], attempts: outcome(m[1]) })),
  platform: 'linux',
  node: 'v22.22.2',
  status,
})
/** An architect's answer, its observed account quoting the planted source, assertion and frame. */
const routed = (route, extra = {}) => ({
  route,
  id: 'EXA-001',
  expected: EXPECTED,
  observed: [OBSERVED, "  assert.equal(marker, 'planted-assertion-text')", FRAME, "const marker = 'planted-source-line'", 'It failed in display.test.js.'].join('\n'),
  lowerLayer: route === 'fix-app' ? 'functional' : '',
  contradicts: route === 'rewrite-test' ? QUOTED : '',
  reason: route === 'rewrite-test' ? 'The test asserts a value no scenario states.' : 'The text holds.',
  ...extra,
})

const work = (extra = {}) => ({ summary: 'done', filesChanged: ['apps/example.js'], proofs: [PASSING], decisions: [], findings: [], ...extra })

const red = (scenario) => ({ scenario, command: PASSING.command, failure: FAILURE })

/** The builder's work, which also carries its red run: by default one red record for SCENARIO. */
const built = (extra = {}) => work({ red: [red(SCENARIO)], alreadyGreen: [], ...extra })

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

const finding = (title, extra = {}) => ({
  kind: 'defect',
  severity: 'minor',
  title,
  file: 'apps/example.js',
  against: 'The display shows 1.',
  evidence: 'The probe printed 0.',
  fix: 'Round once.',
  ...extra,
})

const vote = (verdict, followUp = false) => ({ verdict, reason: `the skeptic's ${verdict} reason`, followUp })

/**
 * An answer function for one scenario. `reviews[round][lens]` is a list of findings, or null for a
 * reviewer that returns nothing; `verdict(title, i, n, round)` answers each skeptic; `merge(prompt)`
 * answers the merge agent, which by default puts each block of the prompt in one group.
 */
function scenario(policy, s = {}) {
  const policyJson = s.policyJson ?? JSON.stringify(Object.fromEntries(POLICY_KEYS.map((k) => [k, policy[k]])))
  return (label, prompt) => {
    if (label === 'setup') {
      // The keys the stub prints are the ones Setup's command names, so the two lists cannot drift apart.
      const command = `node --no-warnings tools/lib/policy.ts ${POLICY_KEYS.join(' ')}`
      const printed = prompt.includes(command) ? policyJson : `the Setup prompt does not run \`${command}\``
      const answer = { policyJson: printed, toplevel: s.toplevel ?? WORKTREE, branch: s.branch ?? BRANCH, listeners: BASELINE }
      return prompt.includes('inputsJson') ? { ...answer, inputsJson: s.inputsJson ?? inputsJson() } : answer
    }
    if (label === 'cite') return { output: CITED.join('\n') }
    if (label === 'build') return s.build === undefined ? built() : s.build
    if (label === 'test-builder') return s.tests === undefined ? tests() : s.tests
    if (label === 'sweep') return s.sweep === undefined ? { listeners: BASELINE } : s.sweep
    let m = /^run a(\d+)$/.exec(label)
    if (m) return s.run ? s.run(Number(m[1]), prompt) : ranWith(prompt)
    m = /^architect a(\d+): (.*)$/.exec(label)
    if (m) return s.architect ? s.architect(Number(m[1]), m[2]) : routed('fix-app')
    m = /^redesign (\d+)\/(\d+) a(\d+): (.*)$/.exec(label)
    if (m) return s.redesign ? s.redesign(Number(m[1])) : vote('upheld')
    m = /^fix a(\d+)$/.exec(label)
    if (m) return work({ summary: `fixed in architect round ${m[1]}` })
    m = /^test-builder a(\d+)$/.exec(label)
    if (m) return s.rewrite === undefined ? tests() : s.rewrite
    m = /^review (\S+) r(\d+)$/.exec(label)
    if (m) {
      const findings = s.reviews?.[m[2]]?.[m[1]]
      return findings === null ? null : { checked: ['the example'], findings: findings ?? [] }
    }
    m = /^merge r(\d+)$/.exec(label)
    if (m) return s.merge ? s.merge(prompt) : { groups: blocksOf(prompt) }
    m = /^skeptic (\d+)\/(\d+) r(\d+): (.*)$/.exec(label)
    if (m) return s.verdict ? s.verdict(m[4], Number(m[1]), Number(m[2]), Number(m[3])) : vote('upheld')
    m = /^fix r(\d+)$/.exec(label)
    if (m) return s.fix === undefined ? work({ summary: `fixed in round ${m[1]}` }) : s.fix
    throw new Error(`no stub answers the label "${label}"`)
  }
}

/** The merge prompt's blocks of `[i]` lines, each as one group of indices. */
function blocksOf(prompt) {
  return prompt
    .split(/\n\n/)
    .map((block) => [...block.matchAll(/^\[(\d+)\]/gm)].map((m) => Number(m[1])))
    .filter((group) => group.length)
}

const count = (calls, pattern) => calls.filter((label) => pattern.test(label)).length
const skepticsFor = (calls, title) => count(calls, new RegExp(`^skeptic \\d+/\\d+ r\\d+: ${title.slice(0, 40).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}$`))
const titles = (list) => list.map((f) => f.title)

/* --------------------------------------------------------------------------------- cases ----- */

/**
 * Each case runs one scenario and returns why its outcome is wrong, or null. `expect` names the
 * `stopped` value and a pattern its `why` must match, so a case fails for the reason it names.
 */
function buildCases(policy) {
  const kinds = Object.keys(policy.buildReviewLenses)
  const widest = [...kinds].sort((a, b) => policy.buildReviewLenses[b].length - policy.buildReviewLenses[a].length)[0]
  const lenses = policy.buildReviewLenses[widest]
  const [first, second] = lenses
  const skeptics = policy.buildReviewSkeptics
  const majors = policy.buildReviewMajorSeverities
  const minors = Object.keys(skeptics).filter((s) => !majors.includes(s))
  const major = majors[0]
  const minor = minors[0]
  const max = policy.buildReviewMaxRounds

  const list = []
  for (const kind of kinds) {
    list.push({
      name: `control: a clean ${kind} task runs its ${policy.buildReviewLenses[kind].length} lens(es) once and stops`,
      control: true,
      args: args(kind),
      scenario: {},
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result, calls, options }) => {
        const reviews = calls.filter((l) => l.startsWith('review '))
        const want = policy.buildReviewLenses[kind].map((l) => `review ${l} r1`)
        if (reviews.join() !== want.join()) return `reviewed with ${reviews.join(', ')}, not ${want.join(', ')}`
        if (calls[0] !== 'setup' || calls.at(-1) !== 'sweep') return `the calls ran ${calls.join(', ')}`
        if (count(calls, /^skeptic /)) return 'sent a skeptic with nothing to confirm'
        if (result.fixUnreviewed) return 'reported an unreviewed fix with no fix'
        if (!result.listeners.checked || result.listeners.leftBehind.length) return 'did not report a clean sweep'
        if (result.rounds.length !== 2 || result.rounds[1].raised !== 0) return `counted rounds ${JSON.stringify(result.rounds)}`
        if (!policy.buildIndependentKinds.includes(kind)) {
          return result.independent === null && !calls.includes('test-builder') ? null : 'a kind the test-builder does not run for ran one'
        }
        const tb = options.find((o) => o.label === 'test-builder')
        if (!tb || tb.agentType !== 'test-builder' || tb.isolation !== undefined) return `the test-builder ran as ${JSON.stringify(tb && { agentType: tb.agentType, isolation: tb.isolation })}`
        if (calls.join() !== ['setup', 'cite', 'build', 'test-builder', ...want, 'run a1', 'sweep'].join()) return `the calls ran ${calls.join(', ')}`
        const [r] = result.independent.rounds
        if (result.independent.rounds.length !== 1 || r.passed.join() !== CONTRACT) return `the architect's rounds are ${JSON.stringify(result.independent.rounds)}`
        return result.independent.files.map((f) => f.path).join() === CONTRACT ? null : 'the test-builder\'s file is not returned for the parent to commit'
      },
    })
  }

  list.push(
    {
      name: `each severity gets its own number of skeptics (${Object.entries(skeptics).map(([s, n]) => `${s} ${n}`).join(', ')})`,
      args: args(widest),
      scenario: { reviews: { 1: { [first]: [finding('A minor defect in a.js', { severity: minor, file: 'a.js' }), finding('A major defect in b.js', { severity: major, file: 'b.js' })] } } },
      check: ({ calls }) => {
        const got = [skepticsFor(calls, 'A minor defect in a.js'), skepticsFor(calls, 'A major defect in b.js')]
        return got[0] === skeptics[minor] && got[1] === skeptics[major]
          ? null
          : `sent ${got[0]} skeptic(s) to the ${minor} and ${got[1]} to the ${major}, not ${skeptics[minor]} and ${skeptics[major]}`
      },
    },
    {
      name: 'votes with no majority leave a finding unverified, never refuted, and unfixed',
      args: args(widest),
      scenario: {
        reviews: { 1: { [first]: [finding('A split finding', { severity: major })] } },
        verdict: (title, i) => (i === 1 ? vote('upheld') : i === 2 ? vote('refuted') : vote('unverified')),
      },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result, calls }) => {
        if (!titles(result.unverified).includes('A split finding')) return 'the finding is not in unverified'
        if (titles(result.refuted).includes('A split finding')) return 'the finding was counted as refuted'
        if (count(calls, /^fix /)) return 'an unverified finding was fixed'
        return null
      },
    },
    {
      name: 'skeptics that return nothing leave a finding unverified, not refuted',
      args: args(widest),
      scenario: { reviews: { 1: { [first]: [finding('A finding nobody judged')] } }, verdict: () => null },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result }) =>
        titles(result.unverified).includes('A finding nobody judged') && !result.refuted.length ? null : 'the finding was not left unverified',
    },
    {
      name: `a confirmed spec contradiction halts before any fix, at the blocker count, and the sweep still runs`,
      args: args(widest),
      scenario: {
        reviews: { 1: { [first]: [finding('A scenario that cannot hold', { kind: 'spec-contradiction', severity: minor, file: 'spec.md' }), finding('A defect beside it', { severity: major, file: 'b.js' })] } },
      },
      expect: ['spec-contradiction', /^round 1 confirmed 1 spec contradiction\(s\): "A scenario that cannot hold"/],
      check: ({ result, calls }) => {
        if (count(calls, /^fix /)) return 'a fix ran after a confirmed spec contradiction'
        if (calls.at(-1) !== 'sweep') return 'the halt skipped the sweep'
        if (skepticsFor(calls, 'A scenario that cannot hold') !== skeptics.blocker) {
          return `the ${minor} spec contradiction went to ${skepticsFor(calls, 'A scenario that cannot hold')} skeptic(s), not the blocker count ${skeptics.blocker}`
        }
        const defect = result.confirmed.find((f) => f.title === 'A defect beside it')
        return defect && defect.fixed === false ? null : 'the defect beside it is not reported confirmed and unfixed'
      },
    },
    {
      name: 'an unverified spec contradiction goes back to the parent and does not halt',
      args: args(widest),
      scenario: {
        reviews: { 1: { [first]: [finding('A contradiction nobody could check', { kind: 'spec-contradiction' })] } },
        verdict: () => vote('unverified'),
      },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result }) => (titles(result.unverified).includes('A contradiction nobody could check') ? null : 'it is not in unverified'),
    },
    {
      name: 'a coverage gap goes to no skeptic, halts nothing, and is returned for filing',
      args: args(widest),
      scenario: { reviews: { 1: { [first]: [finding('An untested but correct behaviour', { kind: 'coverage-gap', severity: major })] } } },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result, calls }) => {
        if (count(calls, /^skeptic /)) return 'a coverage gap was sent to skeptics'
        const gap = result.followUps.find((f) => f.title === 'An untested but correct behaviour')
        return gap && gap.kind === 'coverage-gap' ? null : 'the coverage gap is not in followUps'
      },
    },
    {
      name: 'a finding refuted as asking for what nothing states comes back as a coverage gap to file',
      args: args(widest),
      scenario: { reviews: { 1: { [first]: [finding('A behaviour no scenario asks for')] } }, verdict: () => vote('refuted', true) },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result }) => {
        if (!titles(result.refuted).includes('A behaviour no scenario asks for')) return 'it is not counted refuted'
        const gap = result.followUps.find((f) => f.title === 'A behaviour no scenario asks for')
        return gap && gap.kind === 'coverage-gap' ? null : 'it is not in followUps as a coverage gap'
      },
    },
    {
      name: 'two lenses reporting one defect on one file are confirmed once, crediting both; another kind there is not merged',
      args: args(widest),
      scenario: {
        reviews: {
          1: {
            [first]: [finding('The total is wrong', { file: 'apps/total.js:12' }), finding('The total is untested', { kind: 'coverage-gap', file: 'apps/total.js' })],
            [second]: [finding('Sums come out one short', { file: './apps/total.js' })],
          },
        },
      },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result, calls }) => {
        if (second === undefined) return `no kind in the policy runs two lenses, so a merge cannot be exercised`
        if (count(calls, /^merge r1$/) !== 1) return 'the merge agent did not run once'
        if (skepticsFor(calls, 'Sums come out one short')) return 'the duplicate went to skeptics on its own'
        const merged = result.confirmed.find((f) => f.title === 'The total is wrong')
        if (!merged || merged.raisedBy.join() !== [first, second].join()) return `the merged finding credits ${merged?.raisedBy}`
        if (!result.followUps.some((f) => f.title === 'The total is untested')) return 'the coverage gap on the same file was merged away'
        return result.rounds[1].merged === 1 ? null : `counted ${result.rounds[1].merged} merged, not 1`
      },
    },
    {
      name: 'a merge that loses a finding is discarded, and the findings are kept apart',
      args: args(widest),
      scenario: {
        reviews: { 1: { [first]: [finding('One reading of it', { file: 'c.js' })], [second]: [finding('Another reading of it', { file: 'c.js' })] } },
        merge: (prompt) => ({ groups: [[blocksOf(prompt)[0][0]]] }),
      },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result, logs }) => {
        if (!logs.some((l) => /kept apart/.test(l))) return 'no log line says the merge was discarded'
        return result.confirmed.length === 2 ? null : `confirmed ${result.confirmed.length} finding(s), not the 2 kept apart`
      },
    },
    {
      name: `a round that confirms only ${minors.join(' or ')} defects fixes them and stops, the fix unreviewed`,
      args: args(widest),
      scenario: { reviews: { 1: { [first]: [finding('A small defect', { severity: minor })] } } },
      expect: ['nothing-major', /^round 1 confirmed no .*, and the 1 it did confirm were fixed/],
      check: ({ result, calls }) => {
        if (count(calls, / r2$/)) return 'a second round ran after a round with nothing major'
        if (!result.fixUnreviewed) return 'the fix is not reported unreviewed'
        return result.confirmed[0]?.fixed === true ? null : 'the confirmed defect is not marked fixed'
      },
    },
    {
      name: `a ${major} defect in every round stops at the last round allowed (${max}), its fix unreviewed`,
      args: args(widest),
      scenario: {
        reviews: Object.fromEntries(Array.from({ length: max + 1 }, (_, i) => [i + 1, { [first]: [finding(`A ${major} defect in round ${i + 1}`, { severity: major })] }])),
      },
      expect: ['round-limit', new RegExp(`^round ${max}, the last of ${max}, confirmed 1 `)],
      check: ({ result, calls }) => {
        if (count(calls, new RegExp(` r${max + 1}$`))) return `a round ${max + 1} ran`
        if (count(calls, /^fix r\d+$/) !== max) return `fixed ${count(calls, /^fix r\d+$/)} time(s), not ${max}`
        return result.fixUnreviewed ? null : 'the last fix is not reported unreviewed'
      },
    },
    {
      name: 'a failing build proof stops the run before any reviewer',
      args: args(widest),
      scenario: { build: built({ proofs: [{ command: 'npm run example:test', passed: false, output: '1 failing' }] }) },
      expect: ['proof-failing', /^the build's proof\(s\) npm run example:test did not pass/],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran after a failing proof' : calls.at(-1) === 'sweep' ? null : 'the sweep did not run'),
    },
    {
      name: "a builder's confirmed spec contradiction stops the run before any reviewer",
      args: args(widest),
      scenario: { build: built({ findings: [finding('The spec leaves rounding undecided', { kind: 'spec-contradiction' })] }) },
      expect: ['spec-contradiction', /^the build found 1 spec contradiction\(s\)/],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran after the build confirmed a spec contradiction' : null),
    },
    {
      name: 'a builder that returns nothing stops the run, and the sweep still runs',
      args: args(widest),
      scenario: { build: null },
      expect: ['agent-died', /^the builder returned nothing/],
      check: ({ calls }) => (calls.at(-1) === 'sweep' ? null : 'the sweep did not run'),
    },
    {
      name: 'a proof failing after the fix stops the run',
      args: args(widest),
      scenario: {
        reviews: { 1: { [first]: [finding('A defect the fix breaks', { severity: major })] } },
        fix: work({ proofs: [{ command: 'npm run example:test', passed: false, output: '2 failing' }] }),
      },
      expect: ['proof-failing', /^after the fix of round 1, the proof\(s\) npm run example:test did not pass/],
      check: () => null,
    },
    {
      name: 'a listener the run started is reported left behind, and one there before is not',
      args: args(widest),
      scenario: { sweep: { listeners: [...BASELINE, { pid: '4242', port: '8080', command: 'node serve.js' }] } },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ result }) =>
        result.listeners.leftBehind.map((l) => l.pid).join() === '4242' ? null : `left behind: ${JSON.stringify(result.listeners.leftBehind)}`,
    },
    {
      name: 'refused: a task given no task',
      args: { ...args(widest), task: undefined },
      scenario: {},
      expect: ['refused', /^args\.task must be/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a kind with no lens set',
      args: args('asset:nonesuch'),
      scenario: {},
      expect: ['refused', /^args\.kind asset:nonesuch has no lens set/],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: 'refused: focus for a lens the kind does not run',
      args: args(widest, { lenses: { nonesuch: 'probe this too' } }),
      scenario: {},
      expect: ['refused', /^args\.lenses names nonesuch, which the kind /],
      check: () => null,
    },
    {
      name: 'refused: a policy without buildReviewMaxRounds',
      args: args(widest),
      scenario: { policyJson: JSON.stringify(Object.fromEntries(POLICY_KEYS.filter((k) => k !== 'buildReviewMaxRounds').map((k) => [k, policy[k]]))) },
      expect: ['refused', /^tools\/policy\/ has no `buildReviewMaxRounds`/],
      check: () => null,
    },
    {
      name: 'refused: a policy naming a lens the workflow does not have',
      args: args(widest),
      scenario: {
        policyJson: JSON.stringify({ ...Object.fromEntries(POLICY_KEYS.map((k) => [k, policy[k]])), buildReviewLenses: { ...policy.buildReviewLenses, [widest]: [...lenses, 'nonesuch'] } }),
      },
      expect: ['refused', /names the lens nonesuch for /],
      check: () => null,
    },
    {
      name: 'refused: a worktree that is not where Setup ran',
      args: args(widest),
      scenario: { toplevel: '/tmp/worktrees/another' },
      expect: ['refused', /^args\.worktree is \/tmp\/worktrees\/example, but Setup ran in \/tmp\/worktrees\/another/],
      check: () => null,
    },
  )

  /* The red run, held for the kinds `buildRedFirstKinds` lists and for none it does not. */
  const redFirst = policy.buildRedFirstKinds
  const others = kinds.filter((kind) => !redFirst.includes(kind))
  const unexercised = (name, why) => ({ name, args: args(widest), scenario: {}, check: () => `cannot be exercised: ${why}` })
  const noReview = ({ calls }) =>
    count(calls, /^review /) ? 'a reviewer ran after a build that left a named scenario with neither record' : calls.at(-1) === 'sweep' ? null : 'the sweep did not run'
  const reviewedWith = (kind) => ({ calls }) => {
    const reviews = calls.filter((l) => l.startsWith('review '))
    return reviews.length === policy.buildReviewLenses[kind].length ? null : `reviewed with ${reviews.join(', ') || 'no lens'}`
  }

  for (const kind of redFirst) {
    list.push({
      name: `not-red: a task of kind ${kind} whose builder returns neither a red record nor an already-green report for a named scenario stops before any reviewer, naming it`,
      args: args(kind),
      scenario: { build: built({ red: [] }) },
      expect: ['not-red', new RegExp(`^the builder returned no red record and no already-green report for 1 scenario\\(s\\): "${escape(SCENARIO)}"; no reviewer ran`)],
      check: noReview,
    })
  }
  if (!redFirst.length) list.push(unexercised('not-red: a task of a red-first kind with neither record for a named scenario', 'tools/policy/agent-workflows.json `buildRedFirstKinds` lists no kind'))
  for (const kind of others) {
    list.push({
      name: `a task of kind ${kind} whose builder returns neither record for a named scenario is not held to one, and runs on to review`,
      args: args(kind),
      scenario: { build: built({ red: [] }) },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: reviewedWith(kind),
    })
  }
  if (!others.length) list.push(unexercised('a task of a kind not held to the red run', 'tools/policy/agent-workflows.json `buildRedFirstKinds` lists every kind'))

  if (redFirst.length) {
    const kind = redFirst[0]
    const unnamed = 'example: A scenario the task does not name'
    list.push(
      {
        name: `not-red: on a task of kind ${kind}, red records for one named scenario and one unnamed stop the run for the other named one alone`,
        args: args(kind, { scenarios: [SCENARIO, ` ${SECOND} `] }),
        scenario: { build: built({ red: [red(SCENARIO), red(unnamed)] }) },
        expect: ['not-red', new RegExp(`for 1 scenario\\(s\\): "${escape(SECOND)}"; no reviewer ran`)],
        check: noReview,
      },
      {
        name: `an already-green report on a task of kind ${kind} comes back unverified with its evidence, never as passed or judged, and the run goes on`,
        args: args(kind),
        scenario: { build: built({ red: [], alreadyGreen: [{ scenario: SCENARIO, command: PASSING.command, evidence: EVIDENCE }] }) },
        expect: ['nothing-major', /^round 1 confirmed no /],
        check: ({ result, calls, options }) => {
          const green = result.unverified.filter((f) => f.kind === 'already-green')
          if (green.length !== 1) return `unverified holds ${JSON.stringify(result.unverified)}`
          const [g] = green
          if (g.against !== SCENARIO || g.evidence !== EVIDENCE || g.command !== PASSING.command) return `it came back as ${JSON.stringify(g)}`
          if (result.build.red.length || !result.build.alreadyGreen.length) return 'the build does not report it among alreadyGreen alone'
          if (count(calls, /^skeptic /) || result.confirmed.length || result.refuted.length) return 'it was sent to skeptics'
          if (result.rounds[0].unverified !== result.build.alreadyGreen.length) {
            return `round 0 counts ${result.rounds[0].unverified} unverified, not the ${result.build.alreadyGreen.length} already-green report(s)`
          }
          const counted = result.rounds.reduce((n, r) => n + r.unverified, 0)
          if (counted !== result.unverified.length) return `the rounds count ${counted} unverified, but ${result.unverified.length} are returned`
          const review = options.find((o) => o.label.startsWith('review '))
          return review.prompt.includes(`- [unverified, with the parent] ${g.title} (${PASSING.command})`) ? null : "a reviewer's prompt does not list it as with the parent"
        },
      },
    )
  }
  list.push(
    {
      name: "the build's red records reach the review, with the scenario, the command and the failure",
      args: args(widest),
      scenario: {},
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: ({ options }) =>
        options.some((o) => o.label.startsWith('review ') && o.prompt.includes(`- ${SCENARIO} (${PASSING.command}): ${FAILURE}`))
          ? null
          : `no reviewer of the ${widest} task was given the red record`,
    },
    {
      name: 'refused: a task given no scenarios, before any agent runs',
      args: { ...args(widest), scenarios: undefined },
      scenario: {},
      expect: ['refused', /^args\.scenarios must be an array of non-empty strings/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a policy whose buildRedFirstKinds names a kind that is not an assetLabels key',
      args: args(widest),
      scenario: {
        policyJson: JSON.stringify({ ...Object.fromEntries(POLICY_KEYS.map((k) => [k, policy[k]])), buildRedFirstKinds: [...redFirst, 'asset:nonesuch'] }),
      },
      expect: ['refused', /^tools\/policy\/agent-workflows\.json `buildRedFirstKinds` must be a list of `assetLabels` keys/],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
  )

  /*
   * The honesty lens's judgement of each mutant the thresholds gate lists as undetected (the
   * header's Mutants paragraph, asdlc-openspec-4vo): routed by its judgement, not its kind, each
   * way beside a control whose finding names no mutant. Were this wrong, a survivor judged
   * detectable could be filed away as a coverage gap, an excuse could reach the fixer without the
   * comment the gate reads, or merged away with it, and a judgement the run cannot read could be
   * fixed on the lens's word.
   */
  const HONESTY = 'honesty'
  const honest = [widest, ...kinds].find((kind) => policy.buildReviewLenses[kind].includes(HONESTY))
  const MUTANT_LINE = 'undetected: apps/example.js:12:7 EqualityOperator "x >= 1" (Survived)'
  const SECOND_MUTANT = 'undetected: apps/example.js:20:3 StringLiteral "\\"\\"" (NoCoverage)'
  /** A reviewer's finding on a mutant, its file other than the gate's; `judgement` undefined leaves the field out, as an agent would. */
  const survivor = (title, judgement, extra = {}) =>
    finding(title, { mutant: MUTANT_LINE, ...(judgement === undefined ? {} : { judgement }), file: 'apps/elsewhere.js', ...extra })
  const honestyRun = (findings) => ({ reviews: { 1: { [HONESTY]: findings } } })
  const fixPromptOf = (options) => options.find((o) => o.label === 'fix r1')?.prompt ?? ''
  const fixedOnce = ['nothing-major', /^round 1 confirmed no .*, and the \d+ it did confirm were fixed/]
  if (honest === undefined) {
    list.push(unexercised('a mutant the thresholds gate left undetected, judged each way', `no kind in tools/policy/agent-workflows.json \`buildReviewLenses\` runs the ${HONESTY} lens`))
  } else {
    list.push(
      {
        name: `control: an ${HONESTY} finding that names no mutant is routed by its own kind, as any reviewer's (${honest})`,
        control: true,
        args: args(honest),
        scenario: honestyRun([finding('An untested branch of the parser', { kind: 'coverage-gap' })]),
        expect: ['nothing-major', /^round 1 confirmed no /],
        check: ({ result, calls }) => {
          if (count(calls, /^skeptic |^fix /)) return 'a finding with nothing to confirm went to a skeptic or a fixer'
          return result.followUps.some((f) => f.title === 'An untested branch of the parser' && f.kind === 'coverage-gap') ? null : 'the coverage gap is not returned for filing'
        },
      },
      {
        name: `the ${HONESTY} reviewer is sent to the thresholds gate's undetected mutants under apps/, with the three judgements, and mutates by hand only outside apps/`,
        args: args(honest),
        scenario: {},
        expect: ['nothing-major', /^round 1 confirmed no /],
        check: ({ options }) => {
          const prompt = options.find((o) => o.label === `review ${HONESTY} r1`)?.prompt ?? ''
          const wanted = ['mise run thresholds:check', 'mise run thresholds:commands:check', 'detectable', 'excuse', 'spec-gap', '.scratch/mutants-<n>/', 'outside apps/']
          const missing = wanted.filter((text) => !prompt.includes(text))
          return missing.length ? `the ${HONESTY} reviewer's prompt does not hold ${missing.join(', ')}` : null
        },
      },
      {
        name: 'a survivor judged detectable is confirmed and fixed as a defect, on the file the gate names, even where the lens called it a coverage gap',
        args: args(honest),
        scenario: honestyRun([survivor('A boundary no test pins', 'detectable', { kind: 'coverage-gap' })]),
        expect: fixedOnce,
        check: ({ result, calls, options }) => {
          const f = result.confirmed.find((x) => x.title === 'A boundary no test pins')
          if (!f || f.kind !== 'defect' || f.file !== 'apps/example.js' || f.fixed !== true) return `it came back as ${JSON.stringify(f ?? result.followUps)}`
          if (skepticsFor(calls, 'A boundary no test pins') !== skeptics[f.severity]) return `it went to ${skepticsFor(calls, 'A boundary no test pins')} skeptic(s), not the ${skeptics[f.severity]} its severity gets`
          return fixPromptOf(options).includes('A boundary no test pins') ? null : 'the fixer was not given it'
        },
      },
      {
        name: "a survivor judged an excuse reaches the fixer as the gate's Stryker comment with its reason, above the mutant's line, as a minor defect that earns no second round",
        args: args(honest),
        scenario: honestyRun([survivor('An equivalent comparison', 'excuse', { severity: major, fix: 'The two comparisons\n agree on every integer.' })]),
        expect: majors.includes('minor') ? ['round-limit', /./] : fixedOnce,
        check: ({ result, options }) => {
          if (majors.includes('minor')) return 'cannot be exercised: `buildReviewMajorSeverities` lists minor, so an excuse earns another round'
          const f = result.confirmed.find((x) => x.title === 'An equivalent comparison')
          if (!f || f.severity !== 'minor' || f.fixed !== true) return `it came back as ${JSON.stringify(f ?? result.unverified)}`
          const comment = '`// Stryker disable next-line EqualityOperator: The two comparisons agree on every integer.`'
          const prompt = fixPromptOf(options)
          return prompt.includes(comment) && prompt.includes('apps/example.js:12') ? null : `the fixer's prompt does not hold ${comment} above apps/example.js:12`
        },
      },
      {
        name: 'a survivor judged a spec gap goes back as the workflow routes a coverage gap, to no skeptic and no fixer, even where the lens called it a defect',
        args: args(honest),
        scenario: honestyRun([survivor('A rounding rule no scenario states', 'spec-gap', { severity: major })]),
        expect: ['nothing-major', /^round 1 confirmed no /],
        check: ({ result, calls }) => {
          if (count(calls, /^skeptic |^fix /)) return 'it went to a skeptic or a fixer'
          const f = result.followUps.find((x) => x.title === 'A rounding rule no scenario states')
          return f && f.kind === 'coverage-gap' && f.file === 'apps/example.js' ? null : `it came back as ${JSON.stringify(f ?? result.confirmed)}`
        },
      },
      {
        name: 'a judgement whose mutant is not a line the gate prints, that gives no judgement, or that excuses with no reason goes back to the parent unverified, to no skeptic and no fixer',
        args: args(honest),
        scenario: honestyRun([
          survivor('A mutant named in prose', 'detectable', { mutant: 'the comparison on line 12' }),
          survivor('A mutant left unjudged', undefined),
          survivor('An excuse with no reason', 'excuse', { fix: ' \n ' }),
        ]),
        expect: ['nothing-major', /^round 1 confirmed no /],
        check: ({ result, calls }) => {
          if (count(calls, /^skeptic |^fix /)) return 'it went to a skeptic or a fixer'
          const back = titles(result.unverified)
          const wanted = ['A mutant named in prose', 'A mutant left unjudged', 'An excuse with no reason']
          if (wanted.some((t) => !back.includes(t))) return `unverified holds ${back.join(', ') || 'nothing'}, not ${wanted.join(', ')}`
          const counted = result.rounds.reduce((n, r) => n + r.unverified, 0)
          return counted === result.unverified.length ? null : `the rounds count ${counted} unverified, but ${result.unverified.length} are returned`
        },
      },
      {
        name: 'two survivors on one file are never merged, and each excuse reaches the fixer as its own comment',
        args: args(honest),
        scenario: honestyRun([survivor('Excuse the first', 'excuse', { fix: 'the first reason' }), survivor('Excuse the second', 'excuse', { mutant: SECOND_MUTANT, fix: 'the second reason' })]),
        expect: majors.includes('minor') ? ['round-limit', /./] : fixedOnce,
        check: ({ result, calls, options }) => {
          if (count(calls, /^merge r1$/)) return 'the survivors went to the merge agent'
          if (result.confirmed.length !== 2) return `confirmed ${titles(result.confirmed).join(', ') || 'nothing'}, not the two survivors`
          const prompt = fixPromptOf(options)
          const comments = ['// Stryker disable next-line EqualityOperator: the first reason', '// Stryker disable next-line StringLiteral: the second reason']
          return comments.every((c) => prompt.includes(c)) && prompt.includes('apps/example.js:20') ? null : "the fixer's prompt does not hold both comments, each above its line"
        },
      },
    )
  }
  list.push(...independentCases(policy))
  return list
}

/**
 * The test-builder and the architect, for the first kind `buildIndependentKinds` lists: a case for
 * each stop they add and each route of the triage, each asserting its reason.
 */
function independentCases(policy) {
  const kind = policy.buildIndependentKinds[0]
  if (kind === undefined) {
    return [{ name: 'the test-builder and the architect', args: args(Object.keys(policy.buildReviewLenses)[0]), scenario: {}, check: () => 'cannot be exercised: tools/policy/agent-workflows.json `buildIndependentKinds` lists no kind' }]
  }
  const maxA = policy.buildArchitectMaxRounds
  const blocker = policy.buildReviewSkeptics.blocker
  const failFirst = (failRounds) => (round, prompt) => ranWith(prompt, () => (round <= failRounds ? [attempt(false), attempt(false)] : [attempt(true)]))
  const builderPrompts = (options) => options.filter((o) => o.label === 'build' || /^fix [ra]\d+$/.test(o.label))
  const leaks = (options) => {
    const hits = builderPrompts(options).flatMap((o) => PLANTED.filter((p) => o.prompt.includes(p)).map((p) => `${o.label} holds ${p}`))
    return hits.length ? hits.join('; ') : null
  }
  const passedAfter = /; the 1 test-builder file\(s\) run here passed$/
  const APP_CODE = "apps/example/public/app.js has export const leaked = 'app-builder-code', so import leaked"
  const REQUEST = '/sum?a=1&b=2'
  /** The default test file with `lines` added to its test's body. */
  const sourced = (lines) => testFile({ content: testFile().content.split('\n').slice(0, -1).concat(lines, '})').join('\n') })
  /** A build-stage file an earlier task committed, which Setup reads among the inputs and this task's test-builder does not return. */
  const EARLIER = `${IDIR}/build/contract/earlier.test.js`
  const withEarlier = inputsJson([...INPUT_FILES, { path: EARLIER, text: testFile().content.replace('The display shows 1', 'The display shows 1 again') }])
  const failEarlier = (round, prompt) => ranWith(prompt, (path) => (path === EARLIER && round === 1 ? [attempt(false), attempt(false)] : [attempt(true)]))
  const passedTwo = /; the 2 test-builder file\(s\) run here passed$/
  /** An earlier file whose tests name an ID this task does not, and the test-builder's rewrite of it, which still names it. */
  const STRAY_EARLIER = testFile({}, 'EXA-009').content
  const REWRITTEN = testFile({ path: EARLIER, content: STRAY_EARLIER.replace('The display shows 1', 'The display shows 1 once') })
  /** A scenario named without an ID token, so the task gets no test-builder of its own. */
  const NO_ID = 'example: A scenario named without an ID'
  return [
    {
      name: "fix-app: an earlier task's committed build-stage file, failing after this task, is run and triaged, and its route goes to the fixer",
      args: args(kind),
      scenario: { inputsJson: withEarlier, run: failEarlier },
      expect: ['nothing-major', passedTwo],
      check: ({ result, calls }) => {
        const [first] = result.independent.rounds
        if (first.failed.join() !== EARLIER || first.routes[0]?.route !== 'fix-app') return `round 1 is ${JSON.stringify(first)}`
        return count(calls, /^fix a1$/) === 1 ? null : `the architect's fixer ran ${count(calls, /^fix a1$/)} time(s)`
      },
    },
    {
      name: "rewrite-test: an earlier task's committed file routed rewrite-test goes to the test-builder with its content, and comes back for the parent to write",
      args: args(kind),
      scenario: { inputsJson: withEarlier, run: failEarlier, architect: () => routed('rewrite-test'), rewrite: tests([testFile({ path: EARLIER })]) },
      expect: ['nothing-major', passedTwo],
      check: ({ result, options }) => {
        const again = options.filter((o) => o.label === 'test-builder a1')
        if (again.length !== 1 || !again[0].prompt.includes(`### ${EARLIER}`) || !again[0].prompt.includes(`EXA-001 is violated here: "${QUOTED}"`)) return `the test-builder was not asked to rewrite ${EARLIER}`
        return result.independent.files.some((f) => f.path === EARLIER) ? null : `independent.files lacks the rewritten ${EARLIER}`
      },
    },
    {
      name: "rewrite-test: an earlier task's committed file whose tests name an ID the task does not keeps its exemption once rewritten: the next run writes the rewrite and runs it, and it comes back for the parent to write",
      args: args(kind),
      scenario: {
        inputsJson: inputsJson([...INPUT_FILES, { path: EARLIER, text: STRAY_EARLIER }]),
        run: failEarlier,
        architect: () => routed('rewrite-test', { id: 'EXA-009' }),
        rewrite: tests([REWRITTEN]),
      },
      expect: ['nothing-major', passedTwo],
      check: ({ result, options }) => {
        const run = options.find((o) => o.label === 'run a2')
        if (!run || !run.prompt.includes(`- node scripts/run-tests.mjs "${EARLIER}"`)) return `the runner of architect round 2 was not given the rewritten ${EARLIER} to run`
        if (!run.prompt.slice(run.prompt.indexOf('## The files')).includes(REWRITTEN.content)) return `the runner of architect round 2 was not given the rewritten ${EARLIER} to write`
        const back = result.independent.files.find((f) => f.path === EARLIER)
        return back && back.content === REWRITTEN.content ? null : `independent.files lacks the rewritten ${EARLIER}`
      },
    },
    {
      name: "the runner runs an earlier task's committed build-stage file where it stands, and is never given it to write, and the parent is never given it back",
      args: args(kind),
      scenario: { inputsJson: withEarlier },
      expect: ['nothing-major', passedTwo],
      check: ({ result, options }) => {
        const { prompt } = options.find((o) => o.label === 'run a1')
        if (!prompt.includes(`- node scripts/run-tests.mjs "${EARLIER}"`)) return `the runner was not given ${EARLIER} to run`
        if (prompt.slice(prompt.indexOf('## The files')).includes(EARLIER)) return `the runner was given ${EARLIER} to write`
        return result.independent.files.some((f) => f.path === EARLIER) ? `independent.files holds the committed ${EARLIER}` : null
      },
    },
    {
      name: `the test-builder's prompt holds the inputs and hashes Setup gave it, and no input outside \`independentInputs\`, nor \`settled\` or \`guide\`; the dropped path is logged`,
      args: args(kind, { settled: ['A red record: settled-by-the-parent'], guide: 'guide-for-the-builder' }),
      scenario: { inputsJson: inputsJson([...INPUT_FILES, LEAKED]) },
      expect: ['nothing-major', passedAfter],
      check: ({ options, logs }) => {
        const { prompt } = options.find((o) => o.label === 'test-builder')
        const held = [LEAKED.path, 'app-builder-code', 'settled-by-the-parent', 'guide-for-the-builder'].filter((s) => prompt.includes(s))
        if (held.length) return `the test-builder's prompt holds ${held.join(', ')}`
        const missing = [...INPUT_FILES.map((f) => f.text.trim()), ...CITED, SCENARIO, IDIR].filter((s) => !prompt.includes(s))
        if (missing.length) return `the test-builder's prompt lacks ${missing.join(' | ')}`
        return logs.some((l) => l.startsWith(`Dropped from the test-builder's inputs: ${LEAKED.path}`)) ? null : 'no log line names the dropped path'
      },
    },
    {
      name: "the test-builder's prompt is byte-identical whatever the builder returns, since it is built before the builder returns",
      args: args(kind),
      scenario: {},
      twin: { build: built({ summary: 'another build', filesChanged: ['apps/example/other.js'], red: [{ scenario: SCENARIO, command: 'node other', failure: 'other' }] }) },
      expect: ['nothing-major', passedAfter],
      check: ({ options, twin }) => {
        const first = options.find((o) => o.label === 'test-builder').prompt
        const second = twin.options.find((o) => o.label === 'test-builder').prompt
        return first === second ? null : "the test-builder's prompt differs between two builds"
      },
    },
    {
      name: `not-independent: an app-builder that changes a file under ${IDIR} stops the run before any reviewer`,
      args: args(kind),
      scenario: { build: built({ filesChanged: ['apps/example.js', `${WORKTREE}/${IDIR}/contract/mine.test.js`] }) },
      expect: ['not-independent', new RegExp(`^the app-builder changed ${escape(IDIR)}/contract/mine\\.test\\.js, under the test-builder's directory; no reviewer ran`)],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran' : null),
    },
    {
      name: 'not-independent: a test-builder file outside its directory, or at a layer `independentLayers` does not list, stops the run before any reviewer',
      args: args(kind),
      scenario: { tests: tests([testFile({ path: `apps/${APP}/test/display.test.js` }), testFile({ path: `${IDIR}/build/unit/display.test.js`, layer: 'unit' })]) },
      expect: ['not-independent', new RegExp(`^the test-builder returned apps/${APP}/test/display\\.test\\.js \\(contract, build\\), ${escape(IDIR)}/build/unit/display\\.test\\.js \\(unit, verify\\), outside `)],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran' : null),
    },
    {
      name: 'not-independent: an E2E test or a Verify-deferred fitness function under the build stage, or a build-time contract test under verify, stops the run before any reviewer',
      args: args(kind),
      scenario: {
        tests: tests([
          testFile({ path: `${IDIR}/build/e2e/journey.test.js`, layer: 'e2e', runAt: 'verify' }),
          testFile({ path: `${IDIR}/build/fitness/heavy.test.js`, layer: 'fitness', runAt: 'verify' }),
          testFile({ path: `${IDIR}/verify/contract/display.test.js` }),
          testFile({ path: `${IDIR}/verify/fitness/timed.test.js`, layer: 'fitness', runAt: 'verify' }),
        ]),
      },
      expect: [
        'not-independent',
        new RegExp(
          `^the test-builder returned ${escape(IDIR)}/build/e2e/journey\\.test\\.js \\(e2e, verify\\), ${escape(IDIR)}/build/fitness/heavy\\.test\\.js \\(fitness, verify\\), ` +
            `${escape(IDIR)}/verify/contract/display\\.test\\.js \\(contract, build\\), outside ${escape(IDIR)}/<stage>/<layer>/<name>\\.test\\.js; no reviewer ran$`,
        ),
      ],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran' : null),
    },
    {
      name: "not-independent: a runner that leaves the test-builder's file in the worktree stops the run before any architect or fixer",
      args: args(kind),
      scenario: { run: (round, prompt) => ranWith(prompt, () => [attempt(false), attempt(false)], `?? ${CONTRACT}`) },
      expect: ['not-independent', new RegExp(`^the runner of architect round 1 left the test-builder's files in the worktree: \\?\\? ${escape(CONTRACT)}`)],
      check: ({ calls }) => (count(calls, /^(architect|fix) a/) ? `ran ${calls.join(', ')}` : null),
    },
    {
      name: 'agent-died: a test-builder that returns nothing stops the run, naming where its agentType is resolved',
      args: args(kind),
      scenario: { tests: null },
      expect: ['agent-died', /^the test-builder returned nothing; an `agentType` is resolved from the agents of the checkout the calling session started in/],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran' : null),
    },
    {
      name: 'fix-app: the fixer is told the four fields and the lower layer, and no test source, assertion or stack frame reaches any builder or fixer; the next run passes',
      args: args(kind),
      scenario: { run: failFirst(1) },
      expect: ['nothing-major', passedAfter],
      check: ({ result, options }) => {
        const leak = leaks(options)
        if (leak) return leak
        const fix = options.filter((o) => o.label === 'fix a1')
        if (fix.length !== 1) return `the architect's fixer ran ${fix.length} time(s)`
        const want = ['1. EXA-001', `Expected, as written: ${EXPECTED}`, `Observed: ${OBSERVED}`, 'Environment: linux, Node v22.22.2, orchestration level 1', 'a functional test, and see it fail before you fix it']
        const lacking = want.filter((w) => !fix[0].prompt.includes(w))
        if (lacking.length) return `the fixer's prompt lacks ${lacking.join(' | ')}`
        const [first] = result.independent.rounds
        if (first.failed.join() !== CONTRACT || first.routes[0].route !== 'fix-app') return `round 1 is ${JSON.stringify(first)}`
        return result.fixUnreviewed ? null : 'the fix is not reported unreviewed'
      },
    },
    {
      name: 'rewrite-test: the test-builder is asked again, by agentType, with the ID and the line the architect quotes, no fixer runs, and the next run passes',
      args: args(kind),
      scenario: { run: failFirst(1), architect: () => routed('rewrite-test') },
      expect: ['nothing-major', passedAfter],
      check: ({ calls, options }) => {
        if (count(calls, /^fix a/)) return 'a fixer ran on a rewrite-test route'
        const again = options.filter((o) => o.label === 'test-builder a1')
        if (again.length !== 1 || again[0].agentType !== 'test-builder') return `the test-builder was asked again ${again.length} time(s), as ${again[0]?.agentType}`
        return again[0].prompt.includes('## Rewrite these') && again[0].prompt.includes(`EXA-001 is violated here: "${QUOTED}"`) ? null : 'its prompt lacks the ID and the quoted line'
      },
    },
    {
      name: 'untriaged: a rewrite-test whose quote is found in neither the test nor the inputs is acted on by no one',
      args: args(kind),
      scenario: { run: failFirst(maxA), architect: () => routed('rewrite-test', { contradicts: 'export const leaked' }) },
      expect: ['architect-failing', /\(untriaged\)$/],
      check: ({ result, calls }) => {
        if (count(calls, /^(fix|test-builder) a/)) return `ran ${calls.join(', ')}`
        return result.independent.untriaged.some((u) => /contradicted text is not found verbatim/.test(u.why)) ? null : `untriaged: ${JSON.stringify(result.independent.untriaged)}`
      },
    },
    {
      name: `re-design: a re-design the ${blocker} blocker skeptics uphold stops the run, and nothing after it is fixed or rewritten`,
      args: args(kind),
      scenario: { run: failFirst(maxA), architect: () => routed('re-design') },
      expect: ['re-design', new RegExp(`^architect round 1: ${blocker} skeptics confirmed a re-design pass for EXA-001 \\(${escape(CONTRACT)}\\)`)],
      check: ({ calls }) => {
        if (count(calls, /^redesign \d+\/\d+ a1: /) !== blocker) return `sent ${count(calls, /^redesign /)} skeptic(s), not ${blocker}`
        return count(calls, /^(fix|test-builder) a/) ? `ran ${calls.join(', ')}` : null
      },
    },
    {
      name: 're-design: one the skeptics refute stops nothing as re-design, is acted on by no one, and the run stops architect-failing',
      args: args(kind),
      scenario: { run: failFirst(maxA), architect: () => routed('re-design'), redesign: () => vote('refuted') },
      expect: ['architect-failing', new RegExp(`^at architect round 1 of at most ${maxA}, 1 test-builder file\\(s\\) still fail .*\\(re-design, refuted\\)`)],
      check: ({ calls }) => (count(calls, /^(fix|test-builder) a/) ? `ran ${calls.join(', ')}` : null),
    },
    {
      name: 'flaky: a test that fails and then passes counts as failing, and goes to the architect',
      args: args(kind),
      scenario: { run: (round, prompt) => ranWith(prompt, () => (round === 1 ? [attempt(false), attempt(true)] : [attempt(true)])) },
      expect: ['nothing-major', passedAfter],
      check: ({ result, calls }) => {
        const [first] = result.independent.rounds
        if (first.flaky.join() !== CONTRACT || first.passed.length) return `round 1 is ${JSON.stringify(first)}`
        return calls.includes(`architect a1: ${CONTRACT}`) ? null : 'the flaky test went to no architect'
      },
    },
    {
      name: `architect-failing: a test failing at every one of the ${maxA} run(s) stops the run, the last run's failure triaged and not acted on`,
      args: args(kind),
      scenario: { run: failFirst(maxA) },
      expect: ['architect-failing', new RegExp(`^at architect round ${maxA} of at most ${maxA}, 1 test-builder file\\(s\\) still fail`)],
      check: ({ calls }) => {
        if (count(calls, /^run a\d+$/) !== maxA) return `ran the tests ${count(calls, /^run a\d+$/)} time(s)`
        if (count(calls, /^architect a\d+: /) !== maxA) return `triaged ${count(calls, /^architect a\d+: /)} time(s)`
        return count(calls, /^fix a\d+$/) === maxA - 1 ? null : `fixed ${count(calls, /^fix a\d+$/)} time(s), not ${maxA - 1}`
      },
    },
    {
      name: 'rewrite-test in code: a file whose tests name an ID the task does not is sent back unrun, to no architect',
      args: args(kind),
      scenario: { tests: tests([testFile({}, 'EXA-009')]) },
      expect: ['nothing-major', passedAfter],
      check: ({ result, calls }) => {
        if (calls.includes(`architect a1: ${CONTRACT}`) || calls.includes('run a1')) return `ran ${calls.join(', ')}`
        const [first] = result.independent.rounds
        if (first.routes[0]?.by !== 'code' || !/its tests name EXA-009, which task example-1\.2 does not/.test(first.routes[0].reason)) return `round 1 is ${JSON.stringify(first)}`
        return calls.includes('test-builder a1') && calls.includes('run a2') ? null : `ran ${calls.join(', ')}`
      },
    },
    {
      name: "rewrite-test in code: a file of this task's whose rewrite still names an ID the task does not is sent back unrun again, to no runner, and the run stops architect-failing",
      args: args(kind),
      scenario: { tests: tests([testFile({}, 'EXA-009')]), rewrite: tests([testFile({}, 'EXA-009')]) },
      expect: ['architect-failing', new RegExp(`^at architect round ${maxA} of at most ${maxA}, 0 test-builder file\\(s\\) still fail and 1 were sent back unrun: ${escape(CONTRACT)} \\(rewrite-test\\)$`)],
      check: ({ calls }) => {
        if (!calls.includes('test-builder a1')) return `cannot be exercised: \`buildArchitectMaxRounds\` is ${maxA}, so no rewrite was asked for: ran ${calls.join(', ')}`
        return count(calls, /^(run|architect) a/) ? `ran ${calls.join(', ')}` : null
      },
    },
    {
      name: 'untriaged: an architect whose expected text is not in the delta specs or the design is acted on by no one',
      args: args(kind),
      scenario: { run: failFirst(maxA), architect: () => routed('fix-app', { expected: 'the display shows 2' }) },
      expect: ['architect-failing', /\(untriaged\)$/],
      check: ({ result, calls }) => {
        if (count(calls, /^(fix|test-builder) a/)) return `ran ${calls.join(', ')}`
        return result.independent.untriaged.some((u) => /not found verbatim/.test(u.why)) ? null : `untriaged: ${JSON.stringify(result.independent.untriaged)}`
      },
    },
    {
      name: "rewrite-test: the architect's free-text reason, which may name the app-builder's code, reaches no test-builder prompt",
      args: args(kind),
      scenario: { run: failFirst(1), architect: () => routed('rewrite-test', { reason: APP_CODE }) },
      expect: ['nothing-major', passedAfter],
      check: ({ options }) => {
        const held = options.filter((o) => o.label.startsWith('test-builder') && o.prompt.includes('app-builder-code'))
        return held.length ? `${held.map((o) => o.label).join(', ')} holds the architect's reason` : null
      },
    },
    {
      name: 'fix-app: a line of the test quoted with its spaces moved reaches no builder or fixer',
      args: args(kind),
      scenario: {
        tests: tests([sourced(['  const shown = display.readPlanted(key)'])]),
        run: failFirst(1),
        architect: () => routed('fix-app', { observed: `${OBSERVED}\nconst shown=display.readPlanted( key )` }),
      },
      expect: ['nothing-major', passedAfter],
      check: ({ options }) => {
        const held = builderPrompts(options).filter((o) => o.prompt.includes('readPlanted'))
        return held.length ? `${held.map((o) => o.label).join(', ')} holds the test's source line` : null
      },
    },
    {
      name: "fix-app: the environment is built from a platform and a Node version code accepts, never from the runner's words",
      args: args(kind),
      scenario: { run: (round, prompt) => ({ ...failFirst(1)(round, prompt), platform: "linux; assert.equal(marker, 'planted-assertion-text')" }) },
      expect: ['nothing-major', passedAfter],
      check: ({ options }) => {
        const leak = leaks(options)
        if (leak) return leak
        return options.find((o) => o.label === 'fix a1').prompt.includes('Environment: unknown, Node v22.22.2, orchestration level 1') ? null : "the fixer's environment is not built from checked values"
      },
    },
    {
      name: 'fix-app: an observed line naming a request the spec states survives the screen, though the test holds it as a literal',
      args: args(kind),
      scenario: {
        inputsJson: inputsJson(INPUT_FILES.map((f) => (f.path.endsWith('spec.md') ? { ...f, text: `${f.text}- AND GET ${REQUEST} answers the sum\n` } : f))),
        tests: tests([sourced([`  const reply = get('${REQUEST}')`])]),
        run: failFirst(1),
        architect: () => routed('fix-app', { observed: `GET ${REQUEST} answered 500.` }),
      },
      expect: ['nothing-major', passedAfter],
      check: ({ options }) => (options.find((o) => o.label === 'fix a1').prompt.includes(`Observed: GET ${REQUEST} answered 500.`) ? null : 'the spec-stated request was screened out'),
    },
    {
      name: 're-design: one no skeptic could judge is named unverified, acted on by no one, and the run stops architect-failing',
      args: args(kind),
      scenario: { run: failFirst(maxA), architect: () => routed('re-design'), redesign: () => null },
      expect: ['architect-failing', /\(re-design, unverified\)/],
      check: ({ calls }) => (count(calls, /^(fix|test-builder) a/) ? `ran ${calls.join(', ')}` : null),
    },
    {
      name: `not-independent: an app-builder's path that climbs into ${IDIR}, or spells it in another case, stops the run before any reviewer`,
      args: args(kind),
      scenario: { build: built({ filesChanged: [`apps/${APP}/test/unit/../independent/contract/x.test.js`, `apps/${APP}/test/Independent/contract/y.test.js`] }) },
      expect: ['not-independent', new RegExp(`^the app-builder changed ${escape(IDIR)}/contract/x\\.test\\.js, apps/${APP}/test/Independent/contract/y\\.test\\.js, under`)],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran' : null),
    },
    {
      name: 'a task that names no ID gets no test-builder, and says so; with no earlier build-stage file there is nothing to run, so no runner runs and the review ends the run',
      args: args(kind, { scenarios: [NO_ID] }),
      scenario: { build: built({ red: [red(NO_ID)] }) },
      expect: ['nothing-major', /^round 1 confirmed no [^;]*$/],
      check: ({ result, calls }) =>
        !calls.includes('test-builder') && !count(calls, /^(run|architect) a/) && /names no scenario or NFR by its ID/.test(result.independent.skipped) ? null : `ran ${calls.join(', ')}`,
    },
    {
      name: "a task that names no ID still runs an earlier task's committed build-stage file where it stands, and one failing at every run is triaged, sent to the fixer, and stops the run architect-failing, naming it",
      args: args(kind, { scenarios: [NO_ID] }),
      scenario: { build: built({ red: [red(NO_ID)] }), inputsJson: withEarlier, run: failFirst(maxA) },
      expect: ['architect-failing', new RegExp(`^at architect round ${maxA} of at most ${maxA}, 1 test-builder file\\(s\\) still fail and 0 were sent back unrun: ${escape(EARLIER)} \\(fix-app\\)$`)],
      check: ({ result, calls, options }) => {
        if (calls.includes('test-builder') || calls.includes('cite')) return `a task naming no ID got a test-builder of its own: ${calls.join(', ')}`
        if (!/names no scenario or NFR by its ID/.test(result.independent.skipped)) return `independent.skipped is ${result.independent.skipped}`
        const run = options.find((o) => o.label === 'run a1')
        if (!run || !run.prompt.includes(`- node scripts/run-tests.mjs "${EARLIER}"`)) return `the runner was not given ${EARLIER} to run`
        if (run.prompt.slice(run.prompt.indexOf('## The files')).includes(EARLIER)) return `the runner was given ${EARLIER} to write`
        if (count(calls, /^architect a\d+: /) !== maxA || !calls.includes(`architect a1: ${EARLIER}`)) return `triaged as ${calls.join(', ')}`
        if (count(calls, /^fix a\d+$/) !== maxA - 1) return `the architect's fixer ran ${count(calls, /^fix a\d+$/)} time(s), not ${maxA - 1}`
        return result.independent.files.length ? `independent.files holds ${result.independent.files.map((f) => f.path).join(', ')}` : null
      },
    },
    {
      name: "refused: Setup's copy of the inputs does not match its checksum",
      args: args(kind),
      scenario: { inputsJson: inputsJson(INPUT_FILES, (x) => ({ ...x, files: [{ ...x.files[0], text: 'edited in the copy' }, ...x.files.slice(1)] })) },
      expect: ['refused', /^Setup's copy of the test-builder's inputs does not match the checksum its command printed/],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: `refused: a task of kind ${kind} with no app`,
      args: { ...args(kind), app: undefined },
      scenario: {},
      expect: ['refused', new RegExp(`^args\\.app must name the app under apps/ for a task of kind ${escape(kind)}`)],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: 'refused: a policy whose architectRunLayers is not drawn from independentLayers',
      args: args(kind),
      scenario: { policyJson: JSON.stringify({ ...Object.fromEntries(POLICY_KEYS.map((k) => [k, policy[k]])), architectRunLayers: ['unit'] }) },
      expect: ['refused', /^tools\/policy\/agent-workflows\.json `architectRunLayers` must be a list drawn from `independentLayers`/],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
  ]
}

/* ----------------------------------------------------------- review-prompts.js: fixtures ----- */

const BEAD = '.claude/skills/bead/SKILL.md'
const OPEN_PR = '.claude/skills/open-pr/SKILL.md'
const OTHER = '.claude/skills/other/SKILL.md'
const RUN_A = 'example-1@2026-09-26T00:00:00Z'
const RUN_B = 'example-2@2026-09-26T01:00:00Z'
const RUN_C = 'example-3@2026-09-26T02:00:00Z'

/**
 * The policy's prompt-review keys as the agent's § 4 prints them, every `promptReview*` key but the
 * `Means`, so the workflow reads the tracked values and ignores the ones it does not use.
 */
const promptPolicy = (policy) => Object.fromEntries(Object.entries(policy).filter(([k]) => k.startsWith('promptReview') && !k.endsWith('Means')))

/** The severities the policy counts, and the first of them that does not skip the count. */
const severitiesOf = (policy) => Object.keys(policy.promptReviewSkeptics)
const countedSeverity = (policy) => severitiesOf(policy).find((s) => !policy.promptReviewMajorSeverities.includes(s))

/**
 * One finding on `file` shown by `runs`, at a counted severity and the count the threshold asks, unless
 * `extra` says otherwise. Its `match` is what `scripts/match-held-findings.mjs` prints for a key the
 * model gave at its threshold: the held key where the count names a held run, `none` where it names
 * none.
 */
const reviewFinding = (policy, file, name, runs, extra = {}) => {
  const f = {
    key: `${file}#${name}`,
    title: `The ${name} finding`,
    severity: countedSeverity(policy) ?? severitiesOf(policy).at(-1),
    count: Math.max(policy.promptReviewRecurrenceCount, runs.length),
    runs,
    evidence: `The runs ${runs.join(', ')} showed it.`,
    ...extra,
  }
  return 'match' in extra ? f : { ...f, match: modelMatch(policy, f) }
}

/**
 * The `match` the model gives finding `f` at its threshold, one entry per run: its own key where its
 * count names a held run, with `held` naming as many runs outside this batch as the count needs, and
 * `none` where it names none.
 */
const modelMatch = (policy, f) => {
  const runs = [...new Set(f.runs)]
  if (f.count === runs.length) return runs.map((run) => ({ run, by: 'model', choice: 'none', probability: policy.promptReviewMatchNoneMinProbability }))
  const held = Array.from({ length: f.count - runs.length }, (_, i) => `example-held-${i + 1}@2026-09-20T00:00:00Z`)
  return runs.map((run) => ({ run, by: 'model', choice: f.key, probability: policy.promptReviewMatchHeldMinProbability, held }))
}

const BEAD_KEY = `${BEAD}#gates-before-staging`
const OPEN_PR_KEY = `${OPEN_PR}#second-watcher`

/** Two groups, `bead` from runs A and B and `open-pr` from runs B and C, so run B is in both. */
const reviewArgs = (policy, groups, extra = {}) => ({
  policy: promptPolicy(policy),
  groups: groups ?? [
    { id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B])] },
    { id: 'open-pr', files: [OPEN_PR], findings: [reviewFinding(policy, OPEN_PR, 'second-watcher', [RUN_B, RUN_C])] },
  ],
  ...extra,
})

const gateRun = (passed) => ({ command: 'mise run check:prompts', passed, output: passed ? 'ok' : '1 problem' })

/** A clean change answering finding `f`, to the file its key names. */
const change = (f) => ({
  file: f.key.split('#')[0],
  finding: f.key,
  title: `A fix for ${f.key}`,
  edit: 'One sentence added.',
  why: 'The runs show the gap.',
  frequency: `In ${f.runs.join(' and ')}.`,
  cost: 'One gate run repeated in each.',
  words: 12,
})

const CONSOLIDATION_COMMIT = 'c'.repeat(40)

/** A clean consolidation of `file`: one row of each disposition, each saying where its text went. */
const consolidation = (file, extra = {}) => ({
  file,
  commit: CONSOLIDATION_COMMIT,
  wordsBefore: 100,
  wordsAfter: 80,
  removed: [
    { text: 'A rule CLAUDE.md states.', disposition: 'kept', where: 'CLAUDE.md § The task store', loadedBy: 'every session', why: '' },
    { text: 'The day it went wrong.', disposition: 'moved', where: '#13', loadedBy: '', why: '' },
    { text: 'A second reason for one rule.', disposition: 'deleted', where: '', loadedBy: '', why: 'The kept clause states its failure.' },
  ],
  ...extra,
})

/** A clean report of a change answering every finding of the group, unless `extra` says otherwise. */
const changed = (group, extra = {}) => ({
  verdict: 'changed',
  branch: `agent/wf_example-${group.id}`,
  head: 'a'.repeat(40),
  filesChanged: [...group.files],
  changes: group.findings.map(change),
  consolidations: [],
  notChanged: [],
  earlierReviews: [],
  unverified: [],
  gates: [gateRun(true)],
  ...extra,
})

/** A clean report of no change, every finding set aside, unless `extra` says otherwise. */
const unchanged = (group, extra = {}) => ({
  verdict: 'unchanged',
  branch: `agent/wf_example-${group.id}`,
  head: 'b'.repeat(40),
  filesChanged: [],
  changes: [],
  consolidations: [],
  notChanged: group.findings.map((f) => ({ finding: f.key, reason: 'The finding does not hold.' })),
  earlierReviews: [{ pr: '#45', change: 'close with the reason passed from a file', outcome: 'working', evidence: 'Both runs closed so.' }],
  unverified: [],
  gates: [],
  ...extra,
})

const reviewVote = (verdict) => ({ verdict, reason: `the skeptic's ${verdict} reason` })

/** A fan-out lane's branch, which an injected report names after its own as a second `--discard`. */
const INJECTED_LANE = 'agent/agent-a452486a3b8cc4f0b'

/* --------------------------------------------------------------- the stored cases: fixtures ----- */

/** The merge base the review's reader stub prints, and the commit a stored case's run read its prompt at. */
const BASE_SHA = 'd'.repeat(40)
const CASE_COMMIT = 'e'.repeat(7)
/** What an answer stub returns to choose a place the case does not have. */
const OUT_OF_RANGE = 'out-of-range'

/** A stored case on `file`, expecting `a`, in the format `.claude/prompt-cases/README.md` gives. */
const storedCase = (policy, file, id, extra = {}) => ({
  id,
  prompt: file,
  lens: policy.promptReviewCaseLenses[0],
  source: { run: RUN_A, point: 1, commit: CASE_COMMIT },
  situation: `A session running ${file} has written a new file and is about to run the gates.`,
  options: [
    { id: 'a', text: `For ${id}, stage the new file, then run the gates.` },
    { id: 'b', text: `For ${id}, run the gates first, and stage the new file after.` },
    { id: 'c', text: `For ${id}, skip the gates.` },
  ],
  expected: 'a',
  settledBy: 'The run staged first, and the gates read the new file.',
  ...extra,
})

/** The text of `file` at `ref`, as a reader stub writes it: only its length reaches the stub's output. */
const textAt = (ref, file) => `The text of ${file} at ${ref}.`
/** Where a reader stub says its command wrote the texts, as the real command's `root` would be. */
const TEXTS_ROOT = '/tmp/worktrees/example/.scratch/prompt-case-texts'
/** Where a reader stub says it wrote `file` at `ref`. */
const pathAt = (ref, file) => `${TEXTS_ROOT}/${ref}/${file}`

/** The answer an answer stub returns to choose `optionId` of case `c`, at the place `prompt` shows it. */
function choiceOf(prompt, c, optionId) {
  if (optionId === null) return null
  if (optionId === OUT_OF_RANGE) return { choice: c.options.length + 1, why: 'a place the case does not have' }
  const shown = prompt.split('## The options')[1].trim().split('\n').map((line) => line.replace(/^\d+\. /, ''))
  return { choice: shown.indexOf(c.options.find((o) => o.id === optionId).text) + 1, why: `the text leads to ${optionId}` }
}

/** The command a reader agent is given: the last paragraph of its prompt, as each workflow's reader prompt ends. */
const commandOf = (prompt) => prompt.split('\n\n').at(-1)
/** The arguments that command passes the reader script, after `node` and the script's path. */
const readerArgs = (prompt) => commandOf(prompt).split(' ').slice(2)

/** The review reader stub's reply: the path of each file its command names at the merge base and at the head, with the checksum, unless `doctor` changes it. */
function reviewReader(prompt, doctor) {
  const [, head, ...files] = readerArgs(prompt)
  const texts = [BASE_SHA, head].flatMap((ref) => files.map((file) => ({ ref, file, path: pathAt(ref, file), bytes: textAt(ref, file).length })))
  const out = { base: BASE_SHA, root: TEXTS_ROOT, texts, fnv: fnv(JSON.stringify({ base: BASE_SHA, root: TEXTS_ROOT, texts })) }
  return { output: JSON.stringify(doctor ? doctor(out) : out) }
}

/** A reader's output with `change` made to its texts, its checksum computed over the change, so only the change itself can refuse it. */
const reseal = (out, change) => {
  const texts = out.texts.map(change)
  const { fnv: _old, ...rest } = out
  return { ...rest, texts, fnv: fnv(JSON.stringify({ ...rest, texts })) }
}

/**
 * Answers each `review <id>` agent: `reports[id]` is a function of the group, or null for an agent
 * that returns nothing. By default `bead` changes its file and `open-pr` changes nothing. Each
 * `skeptic <i>/<n> <id>: <key>` is answered by `verdict(key, i, n)`, upheld by default. Each
 * `read <id>` is answered by `reader(prompt)`, the stub above by default, and each `answer <i>/<n>
 * <side> <id>: <case>` chooses the option `answers(case, side, i, n)` names, the expected one by
 * default.
 */
function reviewAnswer(args, reports = {}, verdict, answers, reader) {
  return (label, prompt) => {
    let m = /^review (\S+)$/.exec(label)
    if (m) {
      const group = args.groups.find((g) => g.id === m[1])
      const make = reports[m[1]]
      if (make === null) return null
      return make ? make(group) : m[1] === 'bead' ? changed(group) : unchanged(group)
    }
    m = /^skeptic (\d+)\/(\d+) (\S+): (.+)$/.exec(label)
    if (m) return verdict ? verdict(m[4], Number(m[1]), Number(m[2])) : reviewVote('upheld')
    if (/^read \S+$/.test(label)) return reader ? reader(prompt) : reviewReader(prompt)
    m = /^answer (\d+)\/(\d+) (old|new) (\S+): (\S+)$/.exec(label)
    if (m) {
      const c = args.cases.find((x) => x.id === m[5])
      return choiceOf(prompt, c, answers ? answers(c, m[3], Number(m[1]), Number(m[2])) : c.expected)
    }
    throw new Error(`no stub answers the label "${label}"`)
  }
}

const statusOf = (result, id) => result.groups.find((g) => g.id === id)?.status
const problemsOf = (result, id) => (result.groups.find((g) => g.id === id)?.problems ?? []).join('; ')
const heldRuns = (result) => result.runsHeld.map((h) => h.run).join()
const heldFinding = (result, key) => result.findingsHeld.find((h) => h.key === key)
/** The keys `findingsCarried` lists, joined; a missing list reads as one, so a script that drops it fails every check below. */
const carriedKeys = (result) => (Array.isArray(result.findingsCarried) ? result.findingsCarried.map((f) => f.key).join() : 'no findingsCarried')
const changeOf = (result, id, key) => result.groups.find((g) => g.id === id)?.changes?.find((c) => c.finding === key)
const skepticsOn = (calls, key) => calls.filter((label) => label.startsWith('skeptic ') && label.endsWith(`: ${key}`)).length

/** A case where the `bead` group's report breaks one rule: it is refused for that reason, and only it. */
function refusedBead(policy, name, report, reason) {
  return {
    name,
    args: reviewArgs(policy),
    reports: { bead: report },
    expect: ['done', /^0 to merge, 1 unchanged, 0 not upheld, 1 refused, 0 died; 0 of 0 change\(s\) upheld by 0 skeptic\(s\); 1 of 3 run\(s\) read, 1 finding\(s\) held$/],
    check: ({ result, calls }) => {
      if (statusOf(result, 'bead') !== 'refused') return `bead is ${statusOf(result, 'bead')}, not refused`
      if (!reason.test(problemsOf(result, 'bead'))) return `bead was refused for another reason: ${problemsOf(result, 'bead')}`
      if (calls.some((label) => label.startsWith('skeptic '))) return 'a skeptic judged a refused report'
      if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
      if (heldRuns(result) !== [RUN_A, RUN_B].join()) return `held ${heldRuns(result)}, not bead's runs`
      if (heldFinding(result, BEAD_KEY)) return "a refused group's finding was held, though its runs stay pending"
      return result.runsRead.join() === RUN_C ? null : `read ${result.runsRead.join()}, not ${RUN_C} alone`
    },
  }
}

/* -------------------------------------------------------------- review-prompts.js: cases ----- */

function reviewCases(policy) {
  const skeptics = policy.promptReviewSkeptics
  const majors = policy.promptReviewMajorSeverities
  const least = policy.promptReviewRecurrenceCount
  const counted = countedSeverity(policy)
  const major = majors[0]
  const one = (id, file, name, runs, extra) => ({ id, files: [file], findings: [reviewFinding(policy, file, name, runs, extra)] })
  const beforeAnyAgent = ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null)

  /** A case the policy's values cannot exercise fails with that reason, rather than passing unrun. */
  const unexercised = (name, why) => ({ name, args: reviewArgs(policy), reports: {}, check: () => `cannot be exercised: ${why}` })

  const list = [
    {
      name: 'control: one group changes its file and one changes nothing, each agent in a worktree of its own; skeptics uphold the change, the one merges, every run is read, and the finding set aside is held',
      control: true,
      args: reviewArgs(policy),
      reports: {},
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result, options, calls }) => {
        const reviews = options.filter((o) => o.label.startsWith('review '))
        if (reviews.map((o) => o.label).join() !== 'review bead,review open-pr') return `ran ${reviews.map((o) => o.label).join(', ')}`
        if (reviews.some((o) => o.isolation !== 'worktree')) return 'a file agent ran without isolation: worktree'
        const prompt = reviews[0].prompt
        if (!prompt.includes(BEAD_KEY) || !prompt.includes(RUN_A) || !prompt.includes('§ How a file is judged')) {
          return "the bead agent's prompt does not name its finding, its runs and the section it reads first"
        }
        if (prompt.includes(OPEN_PR)) return "the bead agent's prompt names another group's file"
        const sent = skepticsOn(calls, BEAD_KEY)
        const severity = reviewFinding(policy, BEAD, 'x', [RUN_A]).severity
        if (sent !== skeptics[severity]) return `sent ${sent} skeptic(s) to bead's change, not the ${skeptics[severity]} a ${severity} finding gets`
        if (skepticsOn(calls, OPEN_PR_KEY)) return 'a skeptic judged a group that changed nothing'
        const skeptic = options.find((o) => o.label.startsWith('skeptic '))
        if (skeptic.isolation !== undefined || !skeptic.prompt.includes('git diff origin/main...agent/wf_example-bead')) {
          return "a skeptic does not read bead's diff where the session runs"
        }
        const c = changeOf(result, 'bead', BEAD_KEY)
        if (c?.outcome !== 'upheld' || c.met !== 'recurrence' || c.votes.length !== sent) return `bead's change came back ${JSON.stringify(c)}`
        if (result.merge.join() !== 'agent/wf_example-bead') return `merge is ${result.merge.join(', ')}`
        if (statusOf(result, 'bead') !== 'merge' || statusOf(result, 'open-pr') !== 'unchanged') return 'the statuses are not merge and unchanged'
        if (result.runsRead.join() !== [RUN_A, RUN_B, RUN_C].join() || result.runsHeld.length) return `read ${result.runsRead.join()}, held ${heldRuns(result)}`
        if (carriedKeys(result) !== BEAD_KEY) return `findingsCarried is ${carriedKeys(result) || 'empty'}, not the merged finding ${BEAD_KEY} alone`
        const given = reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B])
        const carried = result.findingsCarried[0]
        if (carried.runs.join() !== [RUN_A, RUN_B].join() || carried.count !== given.count) return `the carried finding came back ${JSON.stringify(carried)}, not its runs and count`
        const held = heldFinding(result, OPEN_PR_KEY)
        if (heldFinding(result, BEAD_KEY)) return 'the merged finding was held'
        return held && /^set aside by its file's agent: /.test(held.reason) && held.count === least && held.runs.join() === [RUN_B, RUN_C].join()
          ? null
          : `the finding set aside was held as ${JSON.stringify(held)}`
      },
    },
    {
      name: `each change gets the skeptics its finding's severity is given (${Object.entries(skeptics).map(([s, n]) => `${s} ${n}`).join(', ')}), and a ${major} finding one run showed is proposed by severity`,
      args: reviewArgs(policy, [
        {
          id: 'bead',
          files: [BEAD],
          findings: [reviewFinding(policy, BEAD, 'counted', [RUN_A, RUN_B]), reviewFinding(policy, BEAD, 'severe', [RUN_A], { severity: major, count: 1 })],
        },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: {},
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 2 of 2 change\(s\) upheld/],
      check: ({ result, calls }) => {
        const got = [skepticsOn(calls, `${BEAD}#counted`), skepticsOn(calls, `${BEAD}#severe`)]
        const want = [skeptics[counted], skeptics[major]]
        if (got.join() !== want.join()) return `sent ${got.join(' and ')} skeptic(s), not ${want.join(' and ')}`
        const met = [changeOf(result, 'bead', `${BEAD}#counted`).met, changeOf(result, 'bead', `${BEAD}#severe`).met]
        return met.join() === 'recurrence,severity' ? null : `the changes say they met the threshold by ${met.join(' and ')}`
      },
    },
    {
      name: 'a merged group carries only the findings its changes name: one it set aside is held, never carried',
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'carried-one', [RUN_A, RUN_B]), reviewFinding(policy, BEAD, 'set-aside-one', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: { bead: (g) => changed(g, { changes: [change(g.findings[0])], notChanged: [{ finding: g.findings[1].key, reason: 'Another edit covers it.' }] }) },
      check: ({ result }) => {
        if (statusOf(result, 'bead') !== 'merge') return `bead is ${statusOf(result, 'bead')}, not merge`
        if (carriedKeys(result) !== `${BEAD}#carried-one`) return `findingsCarried is ${carriedKeys(result)}, not the changed finding alone`
        return heldFinding(result, `${BEAD}#set-aside-one`) ? null : 'the finding set aside was not held'
      },
    },
    least >= 2 && counted
      ? {
          name: `refused: a ${counted} finding shown by fewer than ${least} runs, before any agent runs`,
          args: reviewArgs(policy, [one('bead', BEAD, 'once', [RUN_A], { count: least - 1 })]),
          expect: ['refused', new RegExp(`^group bead: the finding \\.claude/skills/bead/SKILL\\.md#once was shown by ${least - 1} run\\(s\\) at ${counted}, below the threshold`)],
          check: beforeAnyAgent,
        }
      : unexercised('refused: a finding below the threshold', 'the policy counts no severity, or a count of 1 meets it'),
    {
      name: 'refused: a policy without promptReviewSkeptics, before any agent runs',
      args: reviewArgs(policy, undefined, { policy: Object.fromEntries(Object.entries(promptPolicy(policy)).filter(([k]) => k !== 'promptReviewSkeptics')) }),
      expect: ['refused', /^args\.policy has no `promptReviewSkeptics`/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a finding whose key names a file its group was not given',
      args: reviewArgs(policy, [{ id: 'bead', files: [BEAD], findings: [reviewFinding(policy, OPEN_PR, 'elsewhere', [RUN_A])] }]),
      expect: ['refused', /^group bead: the finding \.claude\/skills\/open-pr\/SKILL\.md#elsewhere names \.claude\/skills\/open-pr\/SKILL\.md, which is not one of its files/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: one key on two findings',
      args: reviewArgs(policy, [{ id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'twice', [RUN_A]), reviewFinding(policy, BEAD, 'twice', [RUN_B])] }]),
      expect: ['refused', /^the key \.claude\/skills\/bead\/SKILL\.md#twice is on two findings/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a count below the runs a finding names',
      args: reviewArgs(policy, [one('bead', BEAD, 'undercounted', [RUN_A, RUN_B], { severity: major, count: 1 })]),
      expect: ['refused', /^group bead: the finding .*#undercounted has the count 1, fewer than the 2 run\(s\) it names/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a file in two groups, before any agent runs',
      args: reviewArgs(policy, [one('bead', BEAD, 'x', [RUN_A]), { id: 'both', files: [OPEN_PR, `./${BEAD}`], findings: [reviewFinding(policy, OPEN_PR, 'y', [RUN_B])] }]),
      expect: ['refused', /^the file \.claude\/skills\/bead\/SKILL\.md is in groups bead and both/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: an absolute path',
      args: reviewArgs(policy, [one('bead', '/etc/hosts', 'x', [RUN_A])]),
      expect: ['refused', /^group bead: the file "\/etc\/hosts" is absolute/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a path that climbs out of the repository',
      args: reviewArgs(policy, [one('bead', '.claude/../../outside.md', 'x', [RUN_A])]),
      expect: ['refused', /^group bead: the file ".*" has an empty or `\.\.` segment/],
      check: () => null,
    },
    {
      name: 'refused: no groups',
      args: reviewArgs(policy, []),
      expect: ['refused', /^args\.groups must be a non-empty list/],
      check: () => null,
    },
    {
      name: 'refused: a group with no findings',
      args: reviewArgs(policy, [{ id: 'bead', files: [BEAD], findings: [] }]),
      expect: ['refused', /^group bead: findings must be a non-empty list/],
      check: () => null,
    },
    refusedBead(
      policy,
      'a branch the WorktreeCreate hook did not provision is not merged, and its runs are held',
      (g) => changed(g, { branch: 'worktree-wf_example-bead' }),
      /is not an agent\/ branch/,
    ),
    // A report is its agent's own output, and its branch reaches a skeptic's `git diff` and the
    // session's `git merge` and `mise run worktree:gc --discard` (the push security review of #147).
    refusedBead(
      policy,
      'a branch holding a space and a flag after it, as an injected report gives one, is refused before any command takes it',
      (g) => changed(g, { branch: `agent/wf_example-bead --discard ${INJECTED_LANE}` }),
      /its branch "agent\/wf_example-bead --discard agent\/agent-a452486a3b8cc4f0b" has a character outside A-Za-z0-9\._\/-/,
    ),
    refusedBead(
      policy,
      'a branch holding a `;` is refused before any command takes it',
      (g) => changed(g, { branch: 'agent/wf_example-bead;touch .scratch/pwned' }),
      /its branch "agent\/wf_example-bead;touch \.scratch\/pwned" has a character outside A-Za-z0-9\._\/-/,
    ),
    refusedBead(
      policy,
      'a change to a file the group was not given is not merged',
      (g) => changed(g, { filesChanged: [BEAD, OPEN_PR] }),
      /changes \.claude\/skills\/open-pr\/SKILL\.md, which it was not given/,
    ),
    refusedBead(policy, 'a change whose gate failed is not merged', (g) => changed(g, { gates: [gateRun(false)] }), /did not pass/),
    refusedBead(policy, 'a change with no gate run is not merged', (g) => changed(g, { gates: [] }), /ran no gate/),
    refusedBead(policy, 'a report of a change that states none is not merged', (g) => changed(g, { changes: [] }), /states none/),
    refusedBead(policy, 'a report of a change whose branch changes no file is not merged', (g) => changed(g, { filesChanged: [] }), /changes no file/),
    refusedBead(
      policy,
      'a report stating a change to a file the group was not given is not merged, though its branch is clean',
      (g) => changed(g, { changes: [{ ...change(g.findings[0]), file: OPEN_PR }] }),
      /states a change to \.claude\/skills\/open-pr\/SKILL\.md, which it was not given/,
    ),
    {
      name: 'a report stating a change to a file of its own that its branch does not list as changed is not merged, so no stored case of that file goes unanswered',
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD, OTHER], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B]), reviewFinding(policy, OTHER, 'other', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: { bead: (g) => changed(g, { filesChanged: [BEAD] }) },
      expect: ['done', /^0 to merge, 1 unchanged, 0 not upheld, 1 refused, 0 died;/],
      check: ({ result }) =>
        /states a change to \.claude\/skills\/other\/SKILL\.md, which its branch does not change/.test(problemsOf(result, 'bead')) ? null : `bead's problems were ${problemsOf(result, 'bead')}`,
    },
    refusedBead(
      policy,
      'a change naming a finding its group was not given is not merged',
      (g) => changed(g, { changes: [...g.findings.map(change), { ...change(g.findings[0]), finding: `${BEAD}#never-given` }] }),
      /names the finding\(s\) \.claude\/skills\/bead\/SKILL\.md#never-given, which its group was not given/,
    ),
    {
      name: "a point set aside that names none of the group's findings is returned under asides, and the branch still merges",
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { notChanged: [{ finding: 'Considered, not a finding: a second copy in docs/playbook.md', reason: 'Out of scope.' }] }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result }) => {
        const bead = result.groups.find((g) => g.id === 'bead')
        if (bead.status !== 'merge') return `bead is ${bead.status}, not merge: ${problemsOf(result, 'bead')}`
        if (bead.asides?.map((a) => a.finding).join() !== 'Considered, not a finding: a second copy in docs/playbook.md') return `bead's asides are ${JSON.stringify(bead.asides)}`
        if (result.groups.find((g) => g.id === 'open-pr').asides?.length !== 0) return "open-pr's asides are not an empty list"
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    refusedBead(
      policy,
      'a report that sets aside only a misspelling of a finding it was given neither changes nor sets it aside, and is not merged',
      (g) => unchanged(g, { notChanged: [{ finding: `${BEAD}#gates-before-stagin`, reason: 'The finding does not hold.' }] }),
      /neither changes nor sets aside the finding\(s\) \.claude\/skills\/bead\/SKILL\.md#gates-before-staging/,
    ),
    refusedBead(
      policy,
      'a report that neither changes nor sets aside a finding it was given is not merged',
      (g) => unchanged(g, { notChanged: [] }),
      /neither changes nor sets aside the finding\(s\) \.claude\/skills\/bead\/SKILL\.md#gates-before-staging/,
    ),
    refusedBead(
      policy,
      'a report of no change whose branch changes a file is refused',
      (g) => unchanged(g, { filesChanged: [BEAD] }),
      /reports no change, but its branch changes \.claude\/skills\/bead\/SKILL\.md/,
    ),
    refusedBead(
      policy,
      'a report of no change that states a change is refused, so its finding is neither merged nor dropped unheld',
      (g) => unchanged(g, { changes: g.findings.map(change), notChanged: [] }),
      /reports no change, but states 1 change\(s\)/,
    ),
    // asdlc-openspec-wzei: an entry of `changes` that is no edit goes to no skeptic, so its refutation
    // cannot keep the group's upheld edits out. The first two cases were seen failing against the
    // trunk's script before the fix; the last two hold where the rule stops.
    {
      name: 'a finding set aside under notChanged and also listed under changes with no edit reaches no skeptic, keeps out none of its group\'s upheld edits, and is held as set aside with its reason',
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B]), reviewFinding(policy, BEAD, 'left-alone', [RUN_A])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: {
        bead: (g) =>
          changed(g, {
            changes: [change(g.findings[0]), { ...change(g.findings[1]), title: '(none: accounted under notChanged)', edit: 'No edit; see notChanged.', words: 0 }],
            notChanged: [{ finding: g.findings[1].key, reason: 'Neither run reports a cost.' }],
          }),
      },
      verdict: (key) => reviewVote(key === `${BEAD}#left-alone` ? 'refuted' : 'upheld'),
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 2 finding\(s\) held$/],
      check: ({ result, calls }) => {
        if (skepticsOn(calls, `${BEAD}#left-alone`)) return 'a skeptic judged, as an edit, the finding its agent set aside'
        if (result.merge.join() !== 'agent/wf_example-bead') return `merge is ${result.merge.join(', ')}, not bead's branch: ${problemsOf(result, 'bead')}`
        const notEdits = result.groups.find((g) => g.id === 'bead').notEdits
        if (notEdits?.map((c) => c.finding).join() !== `${BEAD}#left-alone`) return `bead's entries that are no edit are ${JSON.stringify(notEdits)}`
        const held = heldFinding(result, `${BEAD}#left-alone`)
        return held?.reason === "set aside by its file's agent: Neither run reports a cost." ? null : `the finding set aside was held as ${JSON.stringify(held)}`
      },
    },
    {
      name: `a consolidation reported again under changes, with its net words beside the edit for its finding to its file, is judged by its ${skeptics.blocker} consolidation skeptic(s) alone, not a second time as a change`,
      args: reviewArgs(policy),
      reports: {
        bead: (g) =>
          changed(g, {
            changes: [change(g.findings[0]), { ...change(g.findings[0]), title: 'Consolidation that makes room in bead', edit: 'The consolidation, reported again.', words: consolidation(BEAD).wordsAfter - consolidation(BEAD).wordsBefore }],
            consolidations: [consolidation(BEAD)],
          }),
      },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 1 consolidation\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result, calls }) => {
        const severity = reviewFinding(policy, BEAD, 'x', [RUN_A]).severity
        const sent = skepticsOn(calls, BEAD_KEY)
        if (sent !== skeptics[severity]) return `sent ${sent} skeptic(s) to bead's finding, not the ${skeptics[severity]} its one edit gets`
        if (skepticsOn(calls, `consolidation of ${BEAD}`) !== skeptics.blocker) return `sent ${skepticsOn(calls, `consolidation of ${BEAD}`)} skeptic(s) to the consolidation, not ${skeptics.blocker}`
        const notEdits = result.groups.find((g) => g.id === 'bead').notEdits
        if (notEdits?.map((c) => c.title).join() !== 'Consolidation that makes room in bead') return `bead's entries that are no edit are ${JSON.stringify(notEdits)}`
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    {
      name: "an edit with its file's consolidation's net words, and no other entry for its finding, is still judged as a change",
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { changes: [{ ...change(g.findings[0]), words: consolidation(BEAD).wordsAfter - consolidation(BEAD).wordsBefore }], consolidations: [consolidation(BEAD)] }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 1 consolidation\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result, calls }) => {
        const severity = reviewFinding(policy, BEAD, 'x', [RUN_A]).severity
        if (skepticsOn(calls, BEAD_KEY) !== skeptics[severity]) return `sent ${skepticsOn(calls, BEAD_KEY)} skeptic(s) to bead's one edit, not ${skeptics[severity]}`
        const notEdits = result.groups.find((g) => g.id === 'bead').notEdits
        return (notEdits ?? []).length === 0 ? null : `bead's entries that are no edit are ${JSON.stringify(notEdits)}, not none`
      },
    },
    refusedBead(
      policy,
      'a change naming a finding its group was not given is not merged, though the report also sets that key aside under notChanged',
      (g) =>
        changed(g, {
          changes: [...g.findings.map(change), { ...change(g.findings[0]), finding: `${BEAD}#never-given` }],
          notChanged: [{ finding: `${BEAD}#never-given`, reason: 'Out of scope.' }],
        }),
      /names the finding\(s\) \.claude\/skills\/bead\/SKILL\.md#never-given, which its group was not given/,
    ),
    // asdlc-openspec-d078: a skeptic reads the diff of every file a report lists under filesChanged
    // before its branch merges, though no change it states names the file. The three cases were seen
    // failing against the script before the fix.
    {
      name: `a file the report lists as changed and names in no change, as one finding's edit across two files stated as one change, is not refused: its diff from the trunk goes to the ${skeptics.blocker} skeptic(s) of an unstated edit, with the changes the report states, and the branch merges once they uphold it`,
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD, OTHER], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: { bead: (g) => changed(g, { filesChanged: [BEAD, OTHER] }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 1 unstated edit\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result, options }) => {
        const on = options.filter((o) => o.label.endsWith(`: unstated edit to ${OTHER}`))
        if (on.length !== skeptics.blocker) return `sent ${on.length} skeptic(s) to the edit to ${OTHER}, not the blocker count ${skeptics.blocker}`
        if (on.some((o) => o.isolation !== undefined || !o.prompt.includes(`git diff origin/main...agent/wf_example-bead -- ${OTHER}`))) return `a skeptic of the unstated edit does not read the diff of ${OTHER} from the trunk where the session runs`
        if (on.some((o) => !o.prompt.includes(`A fix for ${BEAD_KEY}`))) return 'a skeptic of the unstated edit is not shown the change the report states'
        const u = result.groups.find((g) => g.id === 'bead').unstated
        if (u?.length !== 1 || u[0].file !== OTHER || u[0].outcome !== 'upheld' || u[0].votes.length !== skeptics.blocker) return `bead's unstated edits came back ${JSON.stringify(u)}`
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    {
      name: `a file named only by an entry of changes whose finding the report sets aside goes to the ${skeptics.blocker} skeptic(s) of an unstated edit, though the entry goes to none; their refutation keeps the branch out, and the upheld finding is held naming it`,
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD, OTHER], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B]), reviewFinding(policy, OTHER, 'left-alone', [RUN_A])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: {
        bead: (g) =>
          changed(g, {
            changes: [change(g.findings[0]), { ...change(g.findings[1]), title: '(none: accounted under notChanged)', edit: 'No edit; see notChanged.', words: 0 }],
            notChanged: [{ finding: g.findings[1].key, reason: 'Neither run reports a cost.' }],
          }),
      },
      verdict: (key) => reviewVote(key === `unstated edit to ${OTHER}` ? 'refuted' : 'upheld'),
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 0 of 1 unstated edit\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 3 finding\(s\) held$/],
      check: ({ result, calls }) => {
        if (skepticsOn(calls, `${OTHER}#left-alone`)) return 'a skeptic judged, as an edit, the entry whose finding its agent set aside'
        if (skepticsOn(calls, `unstated edit to ${OTHER}`) !== skeptics.blocker) return `sent ${skepticsOn(calls, `unstated edit to ${OTHER}`)} skeptic(s) to the edit to ${OTHER}, not ${skeptics.blocker}`
        if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
        const held = heldFinding(result, BEAD_KEY)
        if (!held || !/^upheld, but its branch also carried the unstated edit to \.claude\/skills\/other\/SKILL\.md, which the skeptics did not uphold/.test(held.reason)) return `the upheld finding was held as ${JSON.stringify(held)}`
        const aside = heldFinding(result, `${OTHER}#left-alone`)
        return aside?.reason === "set aside by its file's agent: Neither run reports a cost." ? null : `the finding set aside was held as ${JSON.stringify(aside)}`
      },
    },
    {
      name: "a consolidated file no change names is an unstated edit, its diff read from the consolidation's commit to the branch, so what the branch does to it after the consolidation is read too",
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD, OTHER], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: { bead: (g) => changed(g, { filesChanged: [BEAD, OTHER], consolidations: [consolidation(OTHER)] }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 1 consolidation\(s\) upheld by \d+ skeptic\(s\); 1 of 1 unstated edit\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ options }) => {
        const on = options.filter((o) => o.label.endsWith(`: unstated edit to ${OTHER}`))
        return on.length && on.every((o) => o.prompt.includes(`git diff ${CONSOLIDATION_COMMIT}...agent/wf_example-bead -- ${OTHER}`))
          ? null
          : `the edit to ${OTHER} after its consolidation was read by ${on.length} skeptic(s), not each from the consolidation's commit`
      },
    },
    {
      name: `a consolidation goes to the blocker count of skeptics (${skeptics.blocker}) whatever its finding's severity, its file's edit is read from the consolidation's commit, and the branch merges once both are upheld`,
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { consolidations: [consolidation(BEAD)] }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 1 consolidation\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 1 finding\(s\) held$/],
      check: ({ result, options, calls }) => {
        const label = `consolidation of ${BEAD}`
        const sent = skepticsOn(calls, label)
        if (sent !== skeptics.blocker) return `sent ${sent} skeptic(s) to the consolidation, not the blocker count ${skeptics.blocker}`
        const onConsolidation = options.find((o) => o.label.endsWith(`: ${label}`))
        if (!onConsolidation.prompt.includes(`git diff origin/main...${CONSOLIDATION_COMMIT} -- ${BEAD}`) || !onConsolidation.prompt.includes('A rule CLAUDE.md states.')) {
          return "the consolidation's skeptic does not read its commit's diff and its rows"
        }
        const onChange = options.find((o) => o.label.endsWith(`: ${BEAD_KEY}`))
        if (!onChange.prompt.includes(`git diff ${CONSOLIDATION_COMMIT}...agent/wf_example-bead -- ${BEAD}`)) return "the edit's skeptic reads the consolidation with the edit"
        const k = result.groups.find((g) => g.id === 'bead').consolidations[0]
        if (k.outcome !== 'upheld' || k.votes.length !== sent) return `the consolidation came back ${JSON.stringify(k)}`
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    {
      name: 'a consolidation not upheld keeps its branch out, its runs are read, and the finding whose edit was upheld is held naming the consolidation',
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { consolidations: [consolidation(BEAD)] }) },
      verdict: (key) => reviewVote(key.startsWith('consolidation of ') ? 'refuted' : 'upheld'),
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 0 of 1 consolidation\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 2 finding\(s\) held$/],
      check: ({ result }) => {
        if (statusOf(result, 'bead') !== 'not-upheld') return `bead is ${statusOf(result, 'bead')}, not not-upheld`
        if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
        if (carriedKeys(result) !== '') return `findingsCarried is ${carriedKeys(result)}, though no branch merged`
        const held = heldFinding(result, BEAD_KEY)
        return held && /^upheld, but its branch also carried the consolidation of \.claude\/skills\/bead\/SKILL\.md, which the skeptics did not uphold/.test(held.reason)
          ? null
          : `held as ${JSON.stringify(held)}`
      },
    },
    refusedBead(
      policy,
      'a report of no change that states a consolidation is refused',
      (g) => unchanged(g, { consolidations: [consolidation(BEAD)] }),
      /reports no change, but states 1 consolidation\(s\)/,
    ),
    refusedBead(
      policy,
      'a consolidation of a file the group was not given is not merged',
      (g) => changed(g, { consolidations: [consolidation(OPEN_PR)] }),
      /states a consolidation of \.claude\/skills\/open-pr\/SKILL\.md, which it was not given/,
    ),
    {
      name: 'a consolidation of a file its branch does not change is not merged',
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD, OTHER], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: { bead: (g) => changed(g, { filesChanged: [BEAD], consolidations: [consolidation(OTHER)] }) },
      expect: ['done', /^0 to merge, 1 unchanged, 0 not upheld, 1 refused, 0 died;/],
      check: ({ result }) =>
        /states a consolidation of \.claude\/skills\/other\/SKILL\.md, which its branch does not change/.test(problemsOf(result, 'bead')) ? null : `bead's problems were ${problemsOf(result, 'bead')}`,
    },
    refusedBead(
      policy,
      'two consolidations of one file are not merged',
      (g) => changed(g, { consolidations: [consolidation(BEAD), consolidation(BEAD)] }),
      /states two consolidations of \.claude\/skills\/bead\/SKILL\.md/,
    ),
    refusedBead(
      policy,
      'a consolidation naming no commit is not merged',
      (g) => changed(g, { consolidations: [consolidation(BEAD, { commit: ' ' })] }),
      /its consolidation of \.claude\/skills\/bead\/SKILL\.md names no commit/,
    ),
    refusedBead(
      policy,
      'a consolidation naming something other than a commit hash, which a skeptic\'s `git diff` would run, is not merged',
      (g) => changed(g, { consolidations: [consolidation(BEAD, { commit: 'HEAD;touch .scratch/pwned' })] }),
      /its consolidation of \.claude\/skills\/bead\/SKILL\.md names no commit hash/,
    ),
    refusedBead(
      policy,
      'a consolidation that frees no words is not merged',
      (g) => changed(g, { consolidations: [consolidation(BEAD, { wordsAfter: 100 })] }),
      /its consolidation of \.claude\/skills\/bead\/SKILL\.md frees no words: 100 before, 100 after/,
    ),
    refusedBead(
      policy,
      'a consolidation listing nothing it removed is not merged',
      (g) => changed(g, { consolidations: [consolidation(BEAD, { removed: [] })] }),
      /its consolidation of \.claude\/skills\/bead\/SKILL\.md lists nothing it removed/,
    ),
    ...[
      ['kept', 'names no loader', { loadedBy: '' }],
      ['moved', 'names no pull request', { where: '' }],
      ['deleted', 'gives no reason', { why: '' }],
    ].map(([disposition, what, blank]) =>
      refusedBead(
        policy,
        `a consolidation whose ${disposition} row ${what} is not merged`,
        (g) => changed(g, { consolidations: [consolidation(BEAD, { removed: consolidation(BEAD).removed.map((row) => (row.disposition === disposition ? { ...row, ...blank } : row)) })] }),
        /its consolidation of \.claude\/skills\/bead\/SKILL\.md has 1 row\(s\) that do not say where the text went/,
      ),
    ),
    skeptics[major] >= 3
      ? {
          name: `votes with no majority leave a ${major} change unverified, never refuted; its branch is not merged, its runs are read and its finding held with the votes`,
          args: reviewArgs(policy, [one('bead', BEAD, 'split', [RUN_A, RUN_B], { severity: major }), one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C])]),
          reports: {},
          verdict: (key, i) => reviewVote(i === 1 ? 'upheld' : i === 2 ? 'refuted' : 'unverified'),
          expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 0 of 1 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 2 finding\(s\) held$/],
          check: ({ result }) => {
            if (statusOf(result, 'bead') !== 'not-upheld') return `bead is ${statusOf(result, 'bead')}, not not-upheld`
            if (changeOf(result, 'bead', `${BEAD}#split`).outcome !== 'unverified') return 'the change was not left unverified'
            if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
            const held = heldFinding(result, `${BEAD}#split`)
            return held && /^the skeptics did not uphold its edit: 1 upheld, 1 refuted and \d+ unverified of \d+$/.test(held.reason) ? null : `held as ${JSON.stringify(held)}`
          },
        }
      : unexercised(`votes with no majority on a ${major} change`, `the policy sends a ${major} finding fewer than 3 skeptics, so no vote can split`),
    {
      name: 'skeptics that return nothing leave a change unverified, not refuted, and its branch unmerged',
      args: reviewArgs(policy),
      reports: {},
      verdict: () => null,
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 0 of 1 change\(s\) upheld/],
      check: ({ result }) => {
        const c = changeOf(result, 'bead', BEAD_KEY)
        if (c.outcome !== 'unverified') return `the change came back ${c.outcome}`
        return c.votes.every((v) => v === 'unverified: the skeptic returned nothing') ? null : `the votes were ${c.votes.join(' | ')}`
      },
    },
    {
      name: 'a refuted change keeps its branch out, and the upheld change beside it is held with that reason',
      args: reviewArgs(policy, [
        { id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'sound', [RUN_A, RUN_B]), reviewFinding(policy, BEAD, 'unsound', [RUN_A, RUN_B])] },
        one('open-pr', OPEN_PR, 'second-watcher', [RUN_B, RUN_C]),
      ]),
      reports: {},
      verdict: (key) => reviewVote(key.endsWith('#unsound') ? 'refuted' : 'upheld'),
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 1 of 2 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 3 finding\(s\) held$/],
      check: ({ result }) => {
        if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
        const sound = heldFinding(result, `${BEAD}#sound`)
        const unsound = heldFinding(result, `${BEAD}#unsound`)
        if (!sound || !/^upheld, but its branch also carried .*#unsound, which the skeptics did not uphold/.test(sound.reason)) return `the upheld finding was held as ${JSON.stringify(sound)}`
        return unsound && /^the skeptics did not uphold its edit: 0 upheld, \d+ refuted/.test(unsound.reason) ? null : `the refuted finding was held as ${JSON.stringify(unsound)}`
      },
    },
    {
      name: 'an agent that returns nothing holds its runs, and a run only other groups cite is read',
      args: reviewArgs(policy),
      reports: { 'open-pr': null },
      expect: ['done', /^1 to merge, 0 unchanged, 0 not upheld, 0 refused, 1 died; 1 of 1 change\(s\) upheld by \d+ skeptic\(s\); 1 of 3 run\(s\) read, 0 finding\(s\) held$/],
      check: ({ result }) => {
        if (statusOf(result, 'open-pr') !== 'died') return `open-pr is ${statusOf(result, 'open-pr')}, not died`
        if (result.merge.join() !== 'agent/wf_example-bead') return `merge is ${result.merge.join(', ')}`
        if (result.runsRead.join() !== RUN_A) return `read ${result.runsRead.join()}, not ${RUN_A} alone`
        const b = result.runsHeld.find((h) => h.run === RUN_B)
        return heldRuns(result) === [RUN_B, RUN_C].join() && b.heldBy.join() === 'open-pr' ? null : `held ${JSON.stringify(result.runsHeld)}`
      },
    },
    {
      name: 'two groups reporting one branch are both refused',
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { branch: 'agent/wf_example-same' }), 'open-pr': (g) => unchanged(g, { branch: 'agent/wf_example-same' }) },
      expect: ['done', /^0 to merge, 0 unchanged, 0 not upheld, 2 refused, 0 died; 0 of 0 change\(s\) upheld by 0 skeptic\(s\); 0 of 3 run\(s\) read, 0 finding\(s\) held$/],
      check: ({ result }) =>
        ['bead', 'open-pr'].every((id) => /report the one branch agent\/wf_example-same/.test(problemsOf(result, id)))
          ? null
          : `the problems were ${problemsOf(result, 'bead')} and ${problemsOf(result, 'open-pr')}`,
    },
    {
      name: 'every agent returning nothing stops the run, with every run held',
      args: reviewArgs(policy),
      reports: { bead: null, 'open-pr': null },
      expect: ['agent-died', /^every agent returned nothing/],
      check: ({ result }) =>
        !result.runsRead.length && result.runsHeld.length === 3 && !result.merge.length && !result.findingsHeld.length ? null : 'a run was read, a finding held or a branch merged',
    },
    ...storedCaseCases(policy),
    ...discardCases(policy),
    ...matchCases(policy),
  ]
  return list
}

/**
 * The review's cases for the worktrees its groups leave (asdlc-openspec-dss). The script runs no git,
 * so what it holds is `discard`, the list the session removes with `mise run worktree:gc --discard`:
 * every group whose report names a branch, merged or not, each with its status as the reason it goes.
 * The branch is the report's word, and the script assigns none, so a branch no workflow agent of this
 * run could have been given is held out in `discardDropped`, with why: one of no workflow agent's
 * shape, as a fan-out lane's is, one two groups report, and one of a run that more than half the
 * groups' workflow agent branches do not share. A branch that a character outside a branch's own
 * makes a second argument, as an injected report would give one, is none of that shape either.
 */
function discardCases(policy) {
  const listed = (result) => JSON.stringify(result.discard)
  const want = (...entries) => JSON.stringify(entries.map(([id, status]) => ({ id, branch: `agent/wf_example-${id}`, status })))
  const dropped = (result) => JSON.stringify(result.discardDropped)
  const three = reviewArgs(policy, [
    ...reviewArgs(policy).groups,
    { id: 'other', files: [OTHER], findings: [reviewFinding(policy, OTHER, 'third-finding', [RUN_C])] },
  ])
  const LANE = 'agent/agent-a8900798095a74b2f'
  /** What an injected report gives as its branch: this run's next, and a lane's, which `--discard` pasted after it would remove. */
  const INJECTED = `agent/wf_abc-3 --discard ${INJECTED_LANE}`
  return [
    {
      name: "a report naming a fan-out lane's branch, which no workflow agent is given, keeps it out of discard, saying why, and the others' go",
      args: three,
      reports: { other: (g) => unchanged(g, { branch: LANE }) },
      expect: ['done', /^1 to merge, 2 unchanged, 0 not upheld, 0 refused, 0 died;/],
      check: ({ result }) =>
        listed(result) !== want(['bead', 'merge'], ['open-pr', 'unchanged'])
          ? `discard is ${listed(result)}`
          : dropped(result) === JSON.stringify([{ id: 'other', branch: LANE, status: 'unchanged', why: "it is no workflow agent's branch" }])
            ? null
            : `discardDropped is ${dropped(result)}`,
    },
    {
      name: "a report naming another run's workflow agent branch keeps it out of discard, saying why, where most groups name this run's",
      args: three,
      reports: { other: (g) => unchanged(g, { branch: 'agent/wf_elsewhere-1' }) },
      expect: ['done', /^1 to merge, 2 unchanged, 0 not upheld, 0 refused, 0 died;/],
      check: ({ result }) =>
        listed(result) !== want(['bead', 'merge'], ['open-pr', 'unchanged'])
          ? `discard is ${listed(result)}`
          : dropped(result) === JSON.stringify([{ id: 'other', branch: 'agent/wf_elsewhere-1', status: 'unchanged', why: 'only 1 of 3 groups name wf_elsewhere' }])
            ? null
            : `discardDropped is ${dropped(result)}`,
    },
    {
      name: 'two groups naming two runs keep both branches out of discard, since neither run is more than half the groups',
      args: reviewArgs(policy),
      reports: { 'open-pr': (g) => unchanged(g, { branch: 'agent/wf_elsewhere-1' }) },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died;/],
      check: ({ result }) =>
        listed(result) !== '[]'
          ? `discard is ${listed(result)}`
          : dropped(result) ===
              JSON.stringify([
                { id: 'bead', branch: 'agent/wf_example-bead', status: 'merge', why: 'only 1 of 2 groups name wf_example' },
                { id: 'open-pr', branch: 'agent/wf_elsewhere-1', status: 'unchanged', why: 'only 1 of 2 groups name wf_elsewhere' },
              ])
            ? null
            : `discardDropped is ${dropped(result)}`,
    },
    {
      name: "an injected report naming this run's next branch and a lane's after it is refused, and is in neither discard nor merge, where the others' go",
      args: three,
      reports: {
        bead: (g) => changed(g, { branch: 'agent/wf_abc-1' }),
        'open-pr': (g) => unchanged(g, { branch: 'agent/wf_abc-2' }),
        other: (g) => changed(g, { branch: INJECTED }),
      },
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 1 refused, 0 died;/],
      check: ({ result }) => {
        if (statusOf(result, 'other') !== 'refused' || !/its branch ".*" has a character outside A-Za-z0-9\._\/-/.test(problemsOf(result, 'other'))) {
          return `other is ${statusOf(result, 'other')}: ${problemsOf(result, 'other')}`
        }
        if (JSON.stringify(result.merge) !== JSON.stringify(['agent/wf_abc-1'])) return `merge is ${JSON.stringify(result.merge)}`
        const honest = [
          { id: 'bead', branch: 'agent/wf_abc-1', status: 'merge' },
          { id: 'open-pr', branch: 'agent/wf_abc-2', status: 'unchanged' },
        ]
        if (listed(result) !== JSON.stringify(honest)) return `discard is ${listed(result)}`
        return dropped(result) === JSON.stringify([{ id: 'other', branch: INJECTED, status: 'refused', why: "it is no workflow agent's branch" }])
          ? null
          : `discardDropped is ${dropped(result)}`
      },
    },
    {
      name: 'one branch two groups report is kept out of discard for both, saying why',
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { branch: 'agent/wf_example-same' }), 'open-pr': (g) => unchanged(g, { branch: 'agent/wf_example-same' }) },
      expect: ['done', /^0 to merge, 0 unchanged, 0 not upheld, 2 refused, 0 died;/],
      check: ({ result }) =>
        listed(result) === '[]' &&
        dropped(result) ===
          JSON.stringify(
            ['bead', 'open-pr'].map((id) => ({ id, branch: 'agent/wf_example-same', status: 'refused', why: 'groups bead and open-pr report it' })),
          )
          ? null
          : `discard is ${listed(result)} and discardDropped ${dropped(result)}`,
    },
    {
      name: "a rejected group's worktree is handed to the session to remove, with not-upheld as its reason, beside the unchanged group's",
      args: reviewArgs(policy),
      reports: {},
      verdict: () => reviewVote('refuted'),
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died;/],
      check: ({ result }) => (listed(result) === want(['bead', 'not-upheld'], ['open-pr', 'unchanged']) ? null : `discard is ${listed(result)}`),
    },
    {
      name: "a merged group's worktree is handed to remove too, its commits carried by the merge the session makes first",
      args: reviewArgs(policy),
      reports: {},
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died;/],
      check: ({ result }) => (listed(result) === want(['bead', 'merge'], ['open-pr', 'unchanged']) ? null : `discard is ${listed(result)}`),
    },
    {
      name: "a refused group's worktree is handed to remove with refused as its reason, and a group whose agent died, naming no branch, is not",
      args: reviewArgs(policy),
      reports: { bead: (g) => changed(g, { gates: [gateRun(false)] }), 'open-pr': null },
      expect: ['done', /^0 to merge, 0 unchanged, 0 not upheld, 1 refused, 1 died;/],
      check: ({ result }) => (listed(result) === want(['bead', 'refused']) ? null : `discard is ${listed(result)}`),
    },
    {
      name: 'arguments refused before any agent runs leave nothing to remove',
      args: reviewArgs(policy, []),
      expect: ['refused', /^args\.groups must be a non-empty list/],
      check: ({ result }) => (listed(result) === '[]' && dropped(result) === '[]' ? null : `discard is ${listed(result)} and discardDropped ${dropped(result)}`),
    },
  ]
}

/** The review's cases for the stored decision cases (`docs/decisions.md` § D-32). */
function storedCaseCases(policy) {
  const reps = policy.promptReviewCaseRepetitions
  const HEAD_SHA = 'a'.repeat(40)
  const CASE = 'bead-stages-first'
  const withCases = (cases, extra) => reviewArgs(policy, undefined, { cases, ...extra })
  const one = withCases([storedCase(policy, BEAD, CASE)])
  const caseOf = (result, id) => result.cases.find((r) => r.id === id)
  const labelled = (options, prefix) => options.filter((o) => o.label.startsWith(prefix))
  const regressedOn = (outcome, reason) => ({ result }) => {
    if (statusOf(result, 'bead') !== 'regressed') return `bead is ${statusOf(result, 'bead')}, not regressed`
    if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
    if (carriedKeys(result) !== '') return `findingsCarried is ${carriedKeys(result)}, though the regressed branch did not merge`
    const c = caseOf(result, CASE)
    if (c?.outcome !== outcome) return `the case came back ${JSON.stringify(c)}, not ${outcome}`
    if (reason && !reason.test(c.why ?? '')) return `the case is ${outcome} for another reason: ${c.why}`
    const held = heldFinding(result, BEAD_KEY)
    if (!held || !held.reason.startsWith(`upheld, but its branch turned a stored case wrong or left one unanswered, so the branch was not merged: ${CASE} (${outcome}`)) return `held as ${JSON.stringify(held)}`
    return result.runsRead.join() === [RUN_A, RUN_B, RUN_C].join() ? null : `read ${result.runsRead.join()}, held ${heldRuns(result)}`
  }
  const keptOut = (n, unanswered) => new RegExp(`; ${n} of 1 stored case\\(s\\) flipped and ${unanswered} unanswered, by \\d+ answer\\(s\\), 1 branch\\(es\\) kept out; 3 of 3 run\\(s\\) read, 2 finding\\(s\\) held$`)
  const unexercised = (name, why) => ({ name, args: one, reports: {}, check: () => `cannot be exercised: ${why}` })

  return [
    {
      name: `control with stored cases: each case of a file an upheld branch changes is answered ${reps} time(s) with its old text and as many with its new, by the tool-less answerer, its options turned one place each time; a case of a file no branch changes is not answered, and the branch merges`,
      control: true,
      args: withCases([storedCase(policy, BEAD, CASE), storedCase(policy, OPEN_PR, 'open-pr-one-watcher')]),
      reports: {},
      expect: ['done', new RegExp(`^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died; 1 of 1 change\\(s\\) upheld by \\d+ skeptic\\(s\\); 0 of 1 stored case\\(s\\) flipped and 0 unanswered, by ${2 * reps} answer\\(s\\), 0 branch\\(es\\) kept out; 3 of 3 run\\(s\\) read, 1 finding\\(s\\) held$`)],
      check: ({ result, options }) => {
        const answers = labelled(options, 'answer ')
        if (answers.length !== 2 * reps) return `ran ${answers.length} answer(s), not ${2 * reps}`
        if (answers.some((o) => o.agentType !== 'prompt-case-answerer')) return 'an answer ran without the agentType prompt-case-answerer'
        if (answers.some((o) => !o.label.endsWith(`bead: ${CASE}`))) return 'a case of a file no branch changes was answered'
        const read = labelled(options, 'read ')
        if (read.map((o) => o.label).join() !== 'read bead' || commandOf(read[0].prompt) !== `node ${READER} --head ${HEAD_SHA} ${BEAD}`) return "the reader was not asked for bead's file at its head"
        const old = answers.find((o) => o.label === `answer 1/${reps} old bead: ${CASE}`)
        const neu = answers.find((o) => o.label === `answer 1/${reps} new bead: ${CASE}`)
        if (!old?.prompt.includes(pathAt(BASE_SHA, BEAD)) || old.prompt.includes(pathAt(HEAD_SHA, BEAD))) return "the old answer was not sent to the merge base's text alone"
        if (!neu?.prompt.includes(pathAt(HEAD_SHA, BEAD)) || neu.prompt.includes(pathAt(BASE_SHA, BEAD))) return "the new answer was not sent to the head's text alone"
        if (old.prompt.includes(textAt(BASE_SHA, BEAD))) return "an answer's prompt carries the text itself, which a model would have had to copy"
        if (old.prompt.includes('expected') || old.prompt.includes('settled')) return "an answer's prompt names the expected option or what settles it"
        if (reps >= 2) {
          const second = answers.find((o) => o.label === `answer 2/${reps} old bead: ${CASE}`)
          const first = second.prompt.split('## The options')[1].trim().split('\n')[0]
          if (first !== `1. ${storedCase(policy, BEAD, CASE).options[1].text}`) return `the second repetition shows first ${first}, not the case's second option`
        }
        const c = caseOf(result, CASE)
        if (c?.outcome !== 'held' || c.old !== reps || c.new !== reps || c.of !== reps || c.group !== 'bead') return `the case came back ${JSON.stringify(c)}`
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    {
      name: 'a stored case the old text answers right and the new text wrong flips: its branch is regressed and not merged, its runs are read, and its upheld finding is held naming the case',
      args: one,
      reports: {},
      answers: (c, side) => (side === 'new' ? 'b' : c.expected),
      expect: ['done', keptOut(1, 0)],
      check: regressedOn('flipped'),
    },
    reps >= 3
      ? {
          name: `a majority decides each text: ${reps - 1} of ${reps} right with the old text and 1 with the new flips the case`,
          args: one,
          reports: {},
          answers: (c, side, i) => (side === 'old' ? (i === reps ? 'b' : c.expected) : i === 1 ? c.expected : 'b'),
          expect: ['done', keptOut(1, 0)],
          check: regressedOn('flipped'),
        }
      : unexercised('a majority decides each text', `with ${reps} repetition(s) no text can be right by a majority short of every answer`),
    reps >= 3
      ? {
          name: `one stray answer on each text holds the case (${reps - 1} of ${reps} right on both), so noise in one answer keeps no branch out`,
          args: one,
          reports: {},
          answers: (c, _side, i) => (i === reps ? 'b' : c.expected),
          expect: ['done', /^1 to merge, .*; 0 of 1 stored case\(s\) flipped and 0 unanswered/],
          check: ({ result }) => (caseOf(result, CASE)?.outcome === 'held' && caseOf(result, CASE).old === reps - 1 ? null : `the case came back ${JSON.stringify(caseOf(result, CASE))}`),
        }
      : unexercised('one stray answer on each text holds the case', `with ${reps} repetition(s) one stray answer is a majority`),
    {
      name: 'a case the trunk already answers wrong is failing and keeps no branch out, and one only the new text answers right is fixed',
      args: withCases([storedCase(policy, BEAD, 'bead-failing'), storedCase(policy, BEAD, 'bead-fixed')]),
      reports: {},
      answers: (c, side) => (c.id === 'bead-fixed' && side === 'new' ? c.expected : 'b'),
      expect: ['done', /^1 to merge, .*; 0 of 2 stored case\(s\) flipped and 0 unanswered, by \d+ answer\(s\), 0 branch\(es\) kept out;/],
      check: ({ result }) => {
        const got = ['bead-failing', 'bead-fixed'].map((id) => caseOf(result, id)?.outcome).join()
        if (got !== 'failing,fixed') return `the cases came back ${got}`
        return result.merge.join() === 'agent/wf_example-bead' ? null : `merge is ${result.merge.join(', ')}`
      },
    },
    {
      name: 'an answer that returns nothing leaves its case unanswered, which keeps the branch out, never counted as a wrong answer',
      args: one,
      reports: {},
      answers: (c, side, i) => (side === 'new' && i === 1 ? null : c.expected),
      expect: ['done', keptOut(0, 1)],
      check: regressedOn('unanswered'),
    },
    {
      name: 'an answer choosing a place the case does not have leaves its case unanswered, which keeps the branch out',
      args: one,
      reports: {},
      answers: (c, side, i) => (side === 'old' && i === 1 ? OUT_OF_RANGE : c.expected),
      expect: ['done', keptOut(0, 1)],
      check: regressedOn('unanswered'),
    },
    {
      name: "a reader's copy that does not match its checksum leaves every case unanswered, by that reason, and no answer runs",
      args: one,
      reports: {},
      reader: (prompt) => reviewReader(prompt, (out) => ({ ...out, texts: out.texts.map((t) => ({ ...t, bytes: t.bytes + 1 })) })),
      expect: ['done', keptOut(0, 1)],
      check: (outcome) => regressedOn('unanswered', /not copied verbatim/)(outcome) ?? (labelled(outcome.options, 'answer ').length ? 'an answer ran on an unverified copy' : null),
    },
    {
      name: 'a reader that names a path other than where its command writes, its checksum sound, leaves every case unanswered by that reason, and no answer is sent there',
      args: one,
      reports: {},
      reader: (prompt) => reviewReader(prompt, (out) => reseal(out, (t) => (t.ref === BASE_SHA ? { ...t, path: '/etc/hosts' } : t))),
      expect: ['done', keptOut(0, 1)],
      check: (outcome) => regressedOn('unanswered', /names "\/etc\/hosts" for \.claude\/skills\/bead\/SKILL\.md, which is not where its command writes/)(outcome) ?? (labelled(outcome.options, 'answer ').length ? 'an answer was sent to that path' : null),
    },
    {
      name: 'a reader that returns nothing leaves every case unanswered, which keeps the branch out',
      args: one,
      reports: {},
      reader: () => null,
      expect: ['done', keptOut(0, 1)],
      check: regressedOn('unanswered', /^the reader returned nothing$/),
    },
    {
      name: 'a head that is no commit hash is never put in the reader\'s command, and its cases are unanswered',
      args: one,
      reports: { bead: (g) => changed(g, { head: "x';rm -rf ." }) },
      expect: ['done', keptOut(0, 1)],
      check: (outcome) => regressedOn('unanswered', /is no commit hash/)(outcome) ?? (labelled(outcome.options, 'read ').length ? 'a reader ran with that head' : null),
    },
    {
      name: 'a branch its skeptics did not uphold has none of its cases answered',
      args: one,
      reports: {},
      verdict: () => reviewVote('refuted'),
      expect: ['done', /^0 to merge, 1 unchanged, 1 not upheld, 0 refused, 0 died; 0 of 1 change\(s\) upheld by \d+ skeptic\(s\); 3 of 3 run\(s\) read, 2 finding\(s\) held$/],
      check: ({ options, result }) => (labelled(options, 'read ').length || labelled(options, 'answer ').length || result.cases.length ? 'a case of a branch kept out was answered' : null),
    },
    {
      name: "refused: a stored case whose prompt is no group's file, before any agent runs",
      args: withCases([storedCase(policy, OTHER, 'other-case')]),
      expect: ['refused', /^args\.cases\[0\] cannot be answered: its prompt "\.claude\/skills\/other\/SKILL\.md" is no group's file$/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a stored case whose expected answer is none of its options',
      args: withCases([storedCase(policy, BEAD, CASE, { expected: 'z' })]),
      expect: ['refused', /^args\.cases\[0\] cannot be answered: its expected answer "z" is none of its options$/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: two stored cases with one id',
      args: withCases([storedCase(policy, BEAD, CASE), storedCase(policy, OPEN_PR, CASE)]),
      expect: ['refused', /^the case id bead-stages-first is on two cases$/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a policy without promptReviewCaseRepetitions',
      args: reviewArgs(policy, undefined, { policy: Object.fromEntries(Object.entries(promptPolicy(policy)).filter(([k]) => k !== 'promptReviewCaseRepetitions')) }),
      expect: ['refused', /^args\.policy has no `promptReviewCaseRepetitions`/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
  ]
}

/**
 * The review's cases for each finding's `match`, the answers `scripts/match-held-findings.mjs` gave
 * the session, passed in through `args` since a workflow cannot call TypeSafe (asdlc-openspec-6yt.1).
 * Each outcome the match script prints runs: a held key the model gave, its held lines naming a run
 * outside this batch or only one in it, `none` the model gave, a finding the session keyed where the
 * model's answer met no threshold, the same with no key set, and a file with no held key. Each answer
 * the key or the count does not bear out refuses the run before any agent, by its reason, among them
 * a held key whose count leaves out a run its `held` names, and one with no `held`. That script's
 * own selftest holds the call: its stubbed client, the key missing and a call that fails, which the
 * workflow never sees, since the session stops there.
 */
function matchCases(policy) {
  const heldMin = policy.promptReviewMatchHeldMinProbability
  const noneMin = policy.promptReviewMatchNoneMinProbability
  const under = (p) => Math.round((p - 0.01) * 100) / 100
  const entry = (run, by, choice = null, probability = null, held) => ({ run, by, choice, probability, ...(held === undefined ? {} : { held }) })
  const NONE = 'none'
  /** A run outside this batch that the held key's held lines name. */
  const RUN_HELD = 'example-0@2026-09-25T00:00:00Z'
  /** The model's held key for `run` at its threshold, its held lines naming `held`. */
  const heldKey = (run, held = [RUN_HELD]) => entry(run, 'model', BEAD_KEY, heldMin, held)
  /** The two default groups, bead's finding from runs A and B with its `match` and count from `extra`. */
  const withBead = (extra) =>
    reviewArgs(policy, [
      { id: 'bead', files: [BEAD], findings: [reviewFinding(policy, BEAD, 'gates-before-staging', [RUN_A, RUN_B], extra)] },
      { id: 'open-pr', files: [OPEN_PR], findings: [reviewFinding(policy, OPEN_PR, 'second-watcher', [RUN_B, RUN_C])] },
    ])
  /** A count naming one held run beside the two of this batch. */
  const HELD = 3
  const runs = (name, match, count = 2) => {
    const args = withBead({ match, count })
    return {
      name,
      args,
      reports: {},
      expect: ['done', /^1 to merge, 1 unchanged, 0 not upheld, 0 refused, 0 died;/],
      check: ({ result }) => {
        const c = changeOf(result, 'bead', BEAD_KEY)
        if (JSON.stringify(c?.match) !== JSON.stringify(match)) return `bead's change carries the match ${JSON.stringify(c?.match)}`
        const held = heldFinding(result, OPEN_PR_KEY)
        const given = args.groups[1].findings[0].match
        return JSON.stringify(held?.match) === JSON.stringify(given) ? null : `the finding held carries the match ${JSON.stringify(held?.match)}`
      },
    }
  }
  const keyedAgainst = (by, run) => new RegExp(`^group bead: the finding \\.claude/skills/bead/SKILL\\.md#gates-before-staging was keyed by the ${by} for ${run.replace(/[.]/g, '\\.')} against its match or count$`)
  const refused = (name, match, reason, count = 2) => ({
    name: `refused: ${name}, before any agent runs`,
    args: withBead({ match, count }),
    expect: ['refused', reason],
    check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
  })
  const lacking = /^group bead: the finding \.claude\/skills\/bead\/SKILL\.md#gates-before-staging lacks a match per run$/
  const policyWithout = (key) => Object.fromEntries(Object.entries(promptPolicy(policy)).filter(([k]) => k !== key))
  return [
    runs(`same: a held key the model gave at ${heldMin}, its threshold, keys the finding, whose count names the held run its held lines name; its change and the finding held beside it carry their match`, [heldKey(RUN_A), heldKey(RUN_B)], HELD),
    runs("pending: a held key the model gave whose held lines name only a run of this batch, held while its analysis stayed pending, counts this batch's runs alone", [heldKey(RUN_A, [RUN_A]), heldKey(RUN_B, [RUN_A])]),
    runs(`none: none the model gave at ${noneMin}, its threshold, gives a new key that counts no held run`, [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_B, 'model', NONE, noneMin)]),
    runs("related: the session keys a finding where the model's top label met no threshold, its answer kept beside", [entry(RUN_A, 'reviewer', BEAD_KEY, under(heldMin)), entry(RUN_B, 'reviewer', NONE, under(noneMin))], HELD),
    runs('key missing: the session keys a finding no call answered', [entry(RUN_A, 'reviewer'), entry(RUN_B, 'reviewer')], HELD),
    runs('no held key: a finding of a file with no held key gets a new key with no call', [entry(RUN_A, 'no-held-key'), entry(RUN_B, 'no-held-key')]),
    runs("a finding the session joined across runs, the model's none on one and its own on the other, runs", [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_B, 'reviewer', NONE, under(noneMin))]),
    refused('a held key the model gave a hair under its threshold', [entry(RUN_A, 'model', BEAD_KEY, under(heldMin), [RUN_HELD]), heldKey(RUN_B)], keyedAgainst('model', RUN_A), HELD),
    refused('none the model gave a hair under its threshold', [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_B, 'model', NONE, under(noneMin))], keyedAgainst('model', RUN_B)),
    refused("a held key the model gave that is not the finding's", [entry(RUN_A, 'model', `${BEAD}#another-finding`, heldMin, [RUN_HELD]), heldKey(RUN_B)], keyedAgainst('model', RUN_A), HELD),
    refused("a held key the model gave whose held lines name a run outside this batch, where the count is this batch's runs alone, so the finding drifts back to one", [heldKey(RUN_A), heldKey(RUN_B)], keyedAgainst('model', RUN_A)),
    refused('a held key the model gave with no held runs beside it', [heldKey(RUN_A), entry(RUN_B, 'model', BEAD_KEY, heldMin)], keyedAgainst('model', RUN_B), HELD),
    refused('a held key the model gave whose held runs hold a blank run id', [heldKey(RUN_A, [' ']), heldKey(RUN_B, [' '])], keyedAgainst('model', RUN_A), HELD),
    refused('none the model gave on a finding whose count names a held run', [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_B, 'model', NONE, noneMin)], keyedAgainst('model', RUN_A), HELD),
    refused("the session's key where the model's held key met its threshold", [entry(RUN_A, 'reviewer', BEAD_KEY, heldMin), heldKey(RUN_B)], keyedAgainst('reviewer', RUN_A), HELD),
    refused("the session's key where the model's none met its threshold", [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_B, 'reviewer', NONE, noneMin)], keyedAgainst('reviewer', RUN_B)),
    refused('no held key on a finding whose count names a held run', [entry(RUN_A, 'no-held-key'), entry(RUN_B, 'no-held-key')], keyedAgainst('no-held-key', RUN_A), HELD),
    refused('no held key carrying an answer', [entry(RUN_A, 'no-held-key', NONE, noneMin), entry(RUN_B, 'no-held-key')], keyedAgainst('no-held-key', RUN_A)),
    refused("a finding joined across runs, the model's none on one and its held key on the other", [entry(RUN_A, 'model', NONE, noneMin), heldKey(RUN_B)], keyedAgainst('model', RUN_A), HELD),
    refused('a finding with no match', undefined, lacking),
    refused("a match missing one run's entry", [entry(RUN_A, 'model', NONE, noneMin)], lacking),
    refused('a match entry for a run the finding does not name', [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_C, 'model', NONE, noneMin)], lacking),
    refused('two match entries for one run', [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_A, 'model', NONE, noneMin)], lacking),
    refused("a second entry for one run beside the other run's", [entry(RUN_A, 'model', NONE, noneMin), entry(RUN_A, 'reviewer'), entry(RUN_B, 'model', NONE, noneMin)], lacking),
    refused('a match entry keyed by none of the model, the reviewer and no held key', [entry(RUN_A, 'guess', NONE, noneMin), entry(RUN_B, 'model', NONE, noneMin)], lacking),
    {
      name: 'refused: a policy without promptReviewMatchHeldMinProbability, before any agent runs',
      args: reviewArgs(policy, undefined, { policy: policyWithout('promptReviewMatchHeldMinProbability') }),
      expect: ['refused', /^args\.policy has no `promptReviewMatchHeldMinProbability`/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a threshold of 0.5, at which two labels could meet it, before any agent runs',
      args: reviewArgs(policy, undefined, { policy: { ...promptPolicy(policy), promptReviewMatchNoneMinProbability: 0.5 } }),
      expect: ['refused', /^args\.policy `promptReviewMatchNoneMinProbability` must be above 0\.5 and at most 1$/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
  ]
}

/* --------------------------------------------------- author-prompt-cases.js: fixtures ----- */

/** The lenses the workflow's library marks as needing a run, which a seed from a section never gets. */
const RUN_ONLY_LENSES = ['recorded']
const TRUNK = 'origin/main'

const SEED_RUN = {
  key: `${BEAD}#stage-before-gates`,
  prompt: BEAD,
  source: { run: RUN_A, point: 3, commit: CASE_COMMIT },
  evidence: 'The run staged its new file before the gates, and the gates read it.',
  settledBy: "The run's action.",
}
const SEED_SECTION = {
  key: `${OPEN_PR}#one-watcher`,
  prompt: OPEN_PR,
  source: { section: "The open-pr skill's step that watches the checks" },
  evidence: 'The step says to watch with one watcher.',
  settledBy: "The step's own sentence.",
}

/** An author's clean candidate for the seed `key` through `lens`: its options as texts, and its expected one by its place among them. */
const candidate = (key, lens, extra = {}) => ({
  situation: `The situation of ${key}, through ${lens}.`,
  options: [`For ${key} through ${lens}, the wrong thing.`, `For ${key} through ${lens}, the right thing.`],
  expected: 2,
  settledBy: 'The run did the right thing.',
  ...extra,
})

const authorArgs = (policy, extra = {}) => ({ policy: promptPolicy(policy), seeds: [SEED_RUN, SEED_SECTION], cases: [storedCase(policy, BEAD, 'bead-stages-first')], ...extra })

/** The authoring reader stub's reply: the path of each `[ref, file]` its command names, null where `texts` has none, with the checksum, unless `doctor` changes it. */
function authorReader(prompt, texts = textAt, doctor) {
  const want = readerArgs(prompt).map((arg) => [arg.slice(0, arg.indexOf(':')), arg.slice(arg.indexOf(':') + 1)])
  const list = want.map(([ref, file]) => {
    const text = texts(ref, file)
    return { ref, file, path: text === null ? null : pathAt(ref, file), bytes: text === null ? 0 : text.length }
  })
  const out = { root: TEXTS_ROOT, texts: list, fnv: fnv(JSON.stringify({ root: TEXTS_ROOT, texts: list })) }
  return { output: JSON.stringify(doctor ? doctor(out) : out) }
}

/**
 * Answers the authoring workflow's agents: `read` by `s.reader(prompt)`, the stub above over
 * `s.texts` by default; `author <lens> <key>` by `s.authors(key, lens)`, a clean candidate by
 * default; and `answer <i>/<n> <case>` with the option `s.answers(case, i, n)` names, the expected
 * one by default.
 */
function authorAnswer(args, s = {}) {
  return (label, prompt) => {
    if (label === 'read') return s.reader ? s.reader(prompt) : authorReader(prompt, s.texts, s.doctor)
    let m = /^author (\S+) (\S+)$/.exec(label)
    if (m) return s.authors ? s.authors(m[2], m[1]) : candidate(m[2], m[1])
    m = /^answer (\d+)\/(\d+) (\S+)$/.exec(label)
    if (m) {
      const c = args.cases.find((x) => x.id === m[3])
      return choiceOf(prompt, c, s.answers ? s.answers(c, Number(m[1]), Number(m[2])) : c.expected)
    }
    throw new Error(`no stub answers the label "${label}"`)
  }
}

/* ------------------------------------------------------- author-prompt-cases.js: cases ----- */

function authorCases(policy) {
  const lenses = policy.promptReviewCaseLenses
  const reps = policy.promptReviewCaseRepetitions
  const sectionLenses = lenses.filter((l) => !RUN_ONLY_LENSES.includes(l))
  const authors = lenses.length + sectionLenses.length
  const labelled = (options, prefix) => options.filter((o) => o.label.startsWith(prefix))
  const beforeAnyAgent = ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null)
  const turnedAway = (right) => ({ result }) => {
    const t = result.turnedAway[0]
    if (result.validated.length || t?.case.id !== 'bead-stages-first') return `validated ${result.validated.map((r) => r.case.id).join()}, turned away ${result.turnedAway.map((r) => r.case.id).join()}`
    return t.right === right && t.of === reps ? null : `turned away with ${t.right} of ${t.of} right, not ${right} of ${reps}`
  }
  const validateOnly = authorArgs(policy, { seeds: [] })

  return [
    {
      name: `control: one author per lens for a run's seed (${lenses.length}) and per lens needing no run for a section's (${sectionLenses.length}), each given its own seed and text alone; a case every one of ${reps} answers chose as expected is validated`,
      control: true,
      args: authorArgs(policy),
      expect: ['done', new RegExp(`^${authors} author\\(s\\) wrote ${authors} candidate\\(s\\) for 2 seed\\(s\\), 0 dropped; 1 of 1 case\\(s\\) validated by ${reps} answer\\(s\\), 0 turned away$`)],
      check: ({ result, options }) => {
        const read = labelled(options, 'read')
        const want = [`${CASE_COMMIT}:${BEAD}`, `${TRUNK}:${OPEN_PR}`, `${TRUNK}:${BEAD}`]
        if (read.length !== 1 || readerArgs(read[0].prompt).join() !== want.join()) return 'the reader was not asked for each seed\'s text at its ref and the case\'s at the trunk'
        const written = labelled(options, 'author ')
        if (written.some((o) => o.agentType !== 'prompt-case-author')) return 'an author ran without the agentType prompt-case-author'
        const runLabels = written.filter((o) => o.label.endsWith(SEED_RUN.key)).map((o) => o.label.split(' ')[1])
        const sectionLabels = written.filter((o) => o.label.endsWith(SEED_SECTION.key)).map((o) => o.label.split(' ')[1])
        if (runLabels.join() !== lenses.join() || sectionLabels.join() !== sectionLenses.join()) return `wrote through ${runLabels.join()} and ${sectionLabels.join()}`
        const own = written.find((o) => o.label.endsWith(SEED_RUN.key))
        if (!own.prompt.includes(SEED_RUN.evidence) || !own.prompt.includes(pathAt(CASE_COMMIT, BEAD))) return "a run's author was not given its evidence and sent to the text at its commit"
        if (own.prompt.includes(SEED_SECTION.evidence) || own.prompt.includes(pathAt(TRUNK, BEAD)) || own.prompt.includes('bead-stages-first')) return 'an author was shown another seed, another text or a stored case'
        if (own.prompt.includes(textAt(CASE_COMMIT, BEAD))) return "an author's prompt carries the text itself, which a model would have had to copy"
        const answers = labelled(options, 'answer ')
        if (answers.length !== reps || answers.some((o) => o.agentType !== 'prompt-case-answerer' || !o.prompt.includes(pathAt(TRUNK, BEAD)))) return "the case was not answered by the answerer agent, sent to the trunk's text"
        const c = result.candidates.find((x) => x.key === SEED_RUN.key && x.lens === lenses[0])
        if (c?.problem !== null || c.case.prompt !== BEAD || c.case.lens !== lenses[0] || JSON.stringify(c.case.source) !== JSON.stringify(SEED_RUN.source)) return `a candidate came back ${JSON.stringify(c)}`
        const ids = c.case.options.map((o) => o.id).join()
        if (c.case.id !== `stage-before-gates-${lenses[0]}` || ids !== 'a,b' || c.case.expected !== 'b' || c.case.options[1].text !== candidate(SEED_RUN.key, lenses[0]).options[1]) {
          return `a candidate's ids were not assigned by place: id ${c.case.id}, options ${ids}, expected ${c.case.expected}`
        }
        const v = result.validated[0]
        return v?.case.id === 'bead-stages-first' && v.right === reps && v.answers.length === reps ? null : `validated ${JSON.stringify(v)}`
      },
    },
    {
      name: `a case one of whose ${reps} answers chose another option is turned away, not stored`,
      args: validateOnly,
      stubs: { answers: (c, i) => (i === reps ? 'b' : c.expected) },
      expect: ['done', /; 0 of 1 case\(s\) validated by \d+ answer\(s\), 1 turned away$/],
      check: turnedAway(reps - 1),
    },
    {
      name: 'a case whose answer returned nothing is turned away, the missing answer named',
      args: validateOnly,
      stubs: { answers: (c, i) => (i === 1 ? null : c.expected) },
      expect: ['done', /; 0 of 1 case\(s\) validated by \d+ answer\(s\), 1 turned away$/],
      check: (outcome) => turnedAway(reps - 1)(outcome) ?? (outcome.result.turnedAway[0].answers.some((a) => a.option === null && a.why === 'the answerer returned nothing') ? null : 'the missing answer is not named'),
    },
    {
      name: 'a case whose answer chose a place it does not have is turned away',
      args: validateOnly,
      stubs: { answers: (c, i) => (i === 1 ? OUT_OF_RANGE : c.expected) },
      expect: ['done', /; 0 of 1 case\(s\) validated by \d+ answer\(s\), 1 turned away$/],
      check: turnedAway(reps - 1),
    },
    {
      name: "a reader's copy that does not match its checksum stops the run as unread, by that reason, and no author or answer runs",
      args: authorArgs(policy),
      stubs: { doctor: (out) => ({ ...out, texts: out.texts.map((t) => ({ ...t, bytes: t.bytes + 1 })) }) },
      expect: ['unread', /not copied verbatim/],
      check: ({ calls }) => (calls.join() === 'read' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: 'a reader that names a path other than where its command writes, its checksum sound, stops the run as unread by that reason, and no author or answer is sent there',
      args: authorArgs(policy),
      stubs: { doctor: (out) => reseal(out, (t) => (t.ref === CASE_COMMIT ? { ...t, path: '/etc/hosts' } : t)) },
      expect: ['unread', /names "\/etc\/hosts" for \.claude\/skills\/bead\/SKILL\.md, which is not where its command writes$/],
      check: ({ calls }) => (calls.join() === 'read' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: 'a reader whose root is not where its command writes stops the run as unread',
      args: authorArgs(policy),
      stubs: { doctor: (out) => reseal({ ...out, root: '/etc' }, (t) => t) },
      expect: ['unread', /^the reader's root "\/etc" is not where its command writes$/],
      check: ({ calls }) => (calls.join() === 'read' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: 'a reader that returns nothing stops the run as unread',
      args: authorArgs(policy),
      stubs: { reader: () => null },
      expect: ['unread', /^the reader returned nothing$/],
      check: ({ calls }) => (calls.join() === 'read' ? null : `ran ${calls.join(', ')}`),
    },
    {
      name: "a seed whose text git could not show gets no author, and its candidate says why; the others are written",
      args: authorArgs(policy),
      stubs: { texts: (ref, file) => (ref === CASE_COMMIT ? null : textAt(ref, file)) },
      expect: ['done', new RegExp(`^${sectionLenses.length} author\\(s\\) wrote ${sectionLenses.length} candidate\\(s\\) for 2 seed\\(s\\), 1 dropped;`)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('author ') && l.endsWith(SEED_RUN.key))) return 'an author ran on a text git could not show'
        const c = result.candidates.find((x) => x.key === SEED_RUN.key)
        return c?.problem === `git could not show ${BEAD} at ${CASE_COMMIT}` ? null : `the seed came back ${JSON.stringify(c)}`
      },
    },
    {
      name: 'a candidate whose expected answer is none of its options is dropped by that reason, and one whose author returned nothing is dropped too',
      args: authorArgs(policy, { seeds: [SEED_RUN] }),
      stubs: { authors: (key, lens) => (lens === lenses[0] ? candidate(key, lens, { expected: 3 }) : null) },
      expect: ['done', new RegExp(`^${lenses.length} author\\(s\\) wrote 0 candidate\\(s\\) for 1 seed\\(s\\), ${lenses.length} dropped;`)],
      check: ({ result }) => {
        const bad = result.candidates.find((c) => c.lens === lenses[0])
        if (bad?.problem !== 'its expected answer, option 3, is none of its 2 options') return `the bad candidate came back ${JSON.stringify(bad)}`
        const none = result.candidates.filter((c) => c.lens !== lenses[0])
        return none.every((c) => c.problem === 'the author returned nothing') ? null : `the others came back ${JSON.stringify(none)}`
      },
    },
    {
      name: 'refused: a lens the workflow has no text for, before any agent runs',
      args: authorArgs(policy, { policy: { ...promptPolicy(policy), promptReviewCaseLenses: [...lenses, 'invented'] } }),
      expect: ['refused', /^args\.policy `promptReviewCaseLenses` must be distinct lenses drawn from /],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a policy without promptReviewCaseRepetitions',
      args: authorArgs(policy, { policy: Object.fromEntries(Object.entries(promptPolicy(policy)).filter(([k]) => k !== 'promptReviewCaseRepetitions')) }),
      expect: ['refused', /^args\.policy has no `promptReviewCaseRepetitions`/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: no seed and no case',
      args: authorArgs(policy, { seeds: [], cases: [] }),
      expect: ['refused', /^args holds no seed to write a case for and no case to validate$/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a case whose id the bank already holds',
      args: authorArgs(policy, { known: ['bead-stages-first'] }),
      expect: ['refused', /^the case id bead-stages-first is already taken$/],
      check: beforeAnyAgent,
    },
    {
      name: 'refused: a case whose expected answer is none of its options',
      args: authorArgs(policy, { cases: [storedCase(policy, BEAD, 'bead-stages-first', { expected: 'z' })] }),
      expect: ['refused', /^args\.cases\[0\] is not a case as `\.claude\/prompt-cases\/README\.md` gives one: its expected answer "z" is none of its options$/],
      check: beforeAnyAgent,
    },
    {
      name: "refused: a seed whose commit is no hash, so it never reaches the reader's command",
      args: authorArgs(policy, { seeds: [{ ...SEED_RUN, source: { ...SEED_RUN.source, commit: "x';rm -rf ." } }] }),
      expect: ['refused', /^seed \.claude\/skills\/bead\/SKILL\.md#stage-before-gates: its commit must be the hash the run read the prompt at$/],
      check: beforeAnyAgent,
    },
    lenses.some((l) => RUN_ONLY_LENSES.includes(l))
      ? {
          name: `refused: a case through the ${lenses.find((l) => RUN_ONLY_LENSES.includes(l))} lens whose source is a section`,
          args: authorArgs(policy, { cases: [storedCase(policy, BEAD, 'bead-stages-first', { lens: lenses.find((l) => RUN_ONLY_LENSES.includes(l)), source: { section: 'A section of bead' } })] }),
          expect: ['refused', /lens needs a run, and its source is a section$/],
          check: beforeAnyAgent,
        }
      : { name: 'refused: a case through a lens needing a run whose source is a section', args: authorArgs(policy), check: () => 'cannot be exercised: the policy names no lens that needs a run' },
  ]
}

/* ------------------------------------------------------- verify-change-trace.js: fixtures ----- */

const CHANGE = 'example-change'
const COMMIT = '0123456789abcdef0123456789abcdef01234567'
const PREVIOUS = 'fedcba9876543210fedcba9876543210fedcba98'
const OLDEST = '1111111111111111111111111111111111111111'
const RECORDED = 'example-1.7'

/** A design reading a run again keeps, as the earlier result's `design.lenses` gives it, unless `extra` says otherwise. */
const keptLens = (key, extra = {}) => ({
  key,
  label: `Lens ${key}`,
  status: 'read',
  checked: [{ decision: `The decision ${key} reads`, verified: 'Unchanged since.' }],
  ...extra,
})

/** A skeptic that refutes a row's gap with the reading it established: a proof that exercises the scenario. */
const PROVING = { verdict: 'refuted', reason: 'Another assertion drives the display.', proofKind: 'test', proof: 'test/alpha.test.js: Two plus two, its display assertion', exercises: true }

/** The fixture change's scenarios, by capability: the delta specs the renderer cases write, too. */
const SPECS = {
  alpha: [
    ['Adds', 'Two plus two'],
    ['Adds', 'Zero plus zero'],
    ['Clears', 'Clear empties the display'],
  ],
  beta: [
    ['Serves', 'The page is served'],
    ['Serves', 'An unknown path is not found'],
  ],
}
const scenariosOf = (capability) => SPECS[capability].map(([requirement, scenario]) => ({ requirement, scenario }))

/** The fixture's scenarios with the `[<ID>] <title>` token a living header carries, as scripts/check-openspec.mjs holds it. */
const ID_PREFIX = { alpha: 'ALP', beta: 'BET' }
const withId = (capability, i, title) => `[${ID_PREFIX[capability]}-${String(i + 1).padStart(3, '0')}] ${title}`
const SPECS_WITH_IDS = Object.fromEntries(Object.entries(SPECS).map(([capability, list]) => [capability, list.map(([requirement, scenario], i) => [requirement, withId(capability, i, scenario)])]))
const bare = (name) => name.replace(/^\[[^\]\s]+\] /, '')

const TEST_FILE = 'apps/example/test/example.test.js'

/** A test of the stubbed fresh run, as scripts/fresh-run.mjs writes one, passing unless `extra` says otherwise. */
const runTest = (name, ids, extra = {}) => ({ file: TEST_FILE, name, script: 'example:test', layer: 'functional', level: 1, ids, partition: 'change', component: 'example', status: 'pass', durationMs: 1.5, rerun: null, ...extra })

/**
 * The stubbed fresh run at COMMIT, the one both the workflow and the report's renderers read: a
 * passing test named for each fixture scenario, with and without its ID, a negative test for each
 * scenario that carries one, and the record's entry of each such scenario giving it both.
 * `tests(t)` may change each test, `specs(s)` each spec entry, and `extra` the rest.
 */
function stubRun({ tests = (t) => t, specs = (s) => s, ...extra } = {}) {
  const all = []
  const entries = []
  for (const [capability, list] of Object.entries(SPECS)) {
    list.forEach(([requirement, title], i) => {
      const named = withId(capability, i, title)
      const id = /^\[([^\]]+)\]/.exec(named)[1]
      all.push(runTest(title, []), runTest(named, [id]), runTest(`${named}, refused`, [id]))
      entries.push({
        id,
        kind: 'scenario',
        capability,
        title,
        requirement,
        nfr: null,
        state: 'added',
        hash: 'a'.repeat(12),
        tests: { happy: [{ file: TEST_FILE, name: named }], negative: [{ file: TEST_FILE, name: `${named}, refused` }] },
        noNegative: [],
        obligation: { happy: 'met', negative: 'met', because: null },
      })
    })
  }
  return {
    change: CHANGE,
    commit: COMMIT,
    base: PREVIOUS,
    environment: 'a local clone of HEAD under the temporary directory, after npm ci',
    node: 'v0.0.0',
    platform: 'stub',
    install: { command: 'npm ci --no-audit --no-fund', ms: 0 },
    tasks: ['example-1.2'],
    scripts: [{ script: 'example:test', status: 0, ms: 1 }],
    tests: all.map(tests).filter(Boolean),
    specs: entries.map(specs),
    contracts: [],
    taskPaths: [{ id: 'example-1.2', paths: ['apps/example/app.js'] }],
    baseline: [],
    trace: { failures: [], advisories: [], notes: [], summary: 'stub' },
    thresholds: { script: 'thresholds:commands:check', status: 0, ms: 1, output: 'thresholds:commands:check: every threshold holds.' },
    fitness: [],
    problems: [],
    ...extra,
  }
}

/** The stubbed run with the test named `name` changed by `extra`. */
const runWith = (name, extra) => stubRun({ tests: (t) => (t.name === name ? { ...t, ...extra } : t) })

/** The policy's `verifyTrace*` keys, as the workflow's header prints them. */
const verifyPolicy = (policy) => Object.fromEntries(Object.entries(policy).filter(([k]) => k.startsWith('verifyTrace') && !k.endsWith('Means')))

const lensesOf = (n, from = 1) => Array.from({ length: n }, (_, i) => ({ key: `lens-${i + from}`, label: `Lens ${i + from}`, focus: `The decisions of part ${i + from}.` }))

/** A first run over both capabilities, with a design and the lenses the policy gives, unless `extra` says otherwise. */
const verifyArgs = (policy, extra = {}) => ({
  change: CHANGE,
  worktree: '/tmp/worktrees/example-change',
  branch: 'agent/example-change',
  commit: COMMIT,
  scenarios: 5,
  groups: [
    { key: 'alpha', capability: 'alpha', scenarios: scenariosOf('alpha'), files: ['test/alpha.test.js'] },
    { key: 'beta', capability: 'beta', scenarios: scenariosOf('beta') },
  ],
  design: true,
  lenses: lensesOf(policy.verifyTraceDesignLenses),
  manual: [{ issue: RECORDED, covers: 'The page is served, in a real browser' }],
  run: stubRun(),
  policy: verifyPolicy(policy),
  ...extra,
})

/** A row that proves `s` by a test that exercises it, unless `extra` says otherwise; its result is the fresh run's. */
const traceRow = (s, extra = {}) => ({
  requirement: s.requirement,
  scenario: s.scenario,
  proofKind: 'test',
  proof: `${TEST_FILE}: ${s.scenario}`,
  tests: [{ file: TEST_FILE, name: s.scenario }],
  exercises: true,
  notes: 'Read the test line by line; it drives the WHEN and asserts every THEN.',
  ...extra,
})

/** A tracer's clean answer for group `g`, each row changed by `change(scenario)` where it returns something. */
const cleanTrace = (g, change = () => ({})) => ({ head: COMMIT, rows: g.scenarios.map((s) => traceRow(s, change(s.scenario) ?? {})), below: [] })

const cleanLens = (key) => ({ head: COMMIT, checked: [{ decision: `The decision ${key} reads`, verified: 'The code does what it says.' }], gaps: [], below: [] })

/**
 * Answers each agent of the trace: `traces[key]` and `lenses[key]` are a function of the group or
 * lens, or null for an agent that returns nothing; each skeptic is answered by
 * `verdict(title, i, n, source)`, upheld by default.
 */
function verifyAnswer(args, s = {}) {
  return (label) => {
    let m = /^trace (\S+)$/.exec(label)
    if (m) {
      const make = s.traces?.[m[1]]
      if (make === null) return null
      const group = args.groups.find((g) => g.key === m[1])
      return make ? make(group) : cleanTrace(group)
    }
    m = /^design (\S+)$/.exec(label)
    if (m) {
      const make = s.lenses?.[m[1]]
      if (make === null) return null
      return make ? make(m[1]) : cleanLens(m[1])
    }
    m = /^skeptic (\d+)\/(\d+) (\S+): (.+)$/.exec(label)
    if (m) return s.verdict ? s.verdict(m[4], Number(m[1]), Number(m[2]), m[3]) : reviewVote('upheld')
    throw new Error(`no stub answers the label "${label}"`)
  }
}

const skepticsFrom = (calls, source) => calls.filter((label) => new RegExp(`^skeptic \\d+/\\d+ ${source}: `).test(label)).length
const rowOf = (result, scenario) => result.rows.find((r) => r.scenario === scenario)
const groupOf = (result, key) => result.groups.find((g) => g.key === key)

/* ---------------------------------------------------------- verify-change-trace.js: cases ----- */

function verifyCases(policy) {
  const n = policy.verifyTraceSkeptics
  const lenses = policy.verifyTraceDesignLenses
  const most = policy.verifyTraceMaxScenarios
  const beforeAnyAgent = ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null)
  const unexercised = (name, why) => ({ name, args: verifyArgs(policy), check: () => `cannot be exercised: ${why}` })
  const refused = (name, args, reason) => ({ name, args, expect: ['refused', reason], check: beforeAnyAgent })
  const tallyOf = (upheld, unverified, refuted, measured = 0) => {
    const judged = upheld + unverified + refuted
    return new RegExp(`; ${judged + measured} gap\\(s\\), ${measured} measured and ${judged} judged by ${judged * n} skeptic\\(s\\): ${upheld} upheld, ${unverified} unverified, ${refuted} refuted; `)
  }
  const alphaRow = (change) => ({ traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? change : null)) } })
  const notExercised = alphaRow({ exercises: false, notes: 'It asserts the sum and never the display.' })
  const keptRun = (design, extra = {}) => verifyArgs(policy, { previous: { commit: PREVIOUS, design }, lenses: lensesOf(lenses - 1, 2), ...extra })

  return [
    {
      name: `control: a clean first run sends one tracer per group and the ${lenses} lens(es) the policy gives, no skeptic, and stops no-gap with every row in its group's order`,
      control: true,
      args: verifyArgs(policy),
      scenario: {},
      expect: ['no-gap', new RegExp(`^every one of the 5 scenario\\(s\\) traced, ${lenses} design lens\\(es\\) read and 0 kept; 0 gap\\(s\\), 0 measured and 0 judged by 0 skeptic\\(s\\)`)],
      check: ({ result, calls, options }) => {
        const want = ['trace alpha', 'trace beta', ...lensesOf(lenses).map((l) => `design ${l.key}`)]
        if (calls.join() !== want.join()) return `ran ${calls.join(', ')}, not ${want.join(', ')}`
        const alpha = options.find((o) => o.label === 'trace alpha').prompt
        if (!alpha.includes('Adds / Two plus two') || alpha.includes('An unknown path is not found')) return "the alpha tracer's prompt does not list its own scenarios alone"
        if (!alpha.includes('§ 4. Every scenario is traced') || !alpha.includes(RECORDED) || !alpha.includes(COMMIT)) {
          return "the alpha tracer's prompt does not send it to the section, name the manual proof and the commit"
        }
        const order = result.rows.map((r) => r.scenario).join()
        if (order !== [...SPECS.alpha, ...SPECS.beta].map(([, s]) => s).join()) return `rows came back as ${order}`
        if (result.rows.some((r) => r.gap || r.kept || r.readAt !== COMMIT)) return 'a clean row carries a gap, a kept flag or another commit'
        if (JSON.stringify(result.counts.byCapability) !== '{"alpha":3,"beta":2}') return `counted ${JSON.stringify(result.counts.byCapability)}`
        return result.design.lenses.every((l) => l.status === 'read') && result.design.lenses.length === lenses ? null : `the lenses came back ${JSON.stringify(result.design.lenses)}`
      },
    },
    {
      name: `a row whose proof does not exercise its scenario is a gap, sent to the ${n} skeptic(s) the policy gives; upheld, it stops the run gaps`,
      args: verifyArgs(policy),
      scenario: notExercised,
      expect: ['gaps', tallyOf(1, 0, 0)],
      check: ({ result, calls }) => {
        if (skepticsFrom(calls, 'alpha') !== n) return `sent ${skepticsFrom(calls, 'alpha')} skeptic(s), not ${n}`
        const gap = rowOf(result, 'Two plus two').gap
        return gap?.kind === 'not-exercised' && gap.outcome === 'upheld' ? null : `the row's gap came back ${JSON.stringify(gap)}`
      },
    },
    {
      name: "a gap a majority refutes with a proving reading leaves the run no-gap, the row carrying the skeptics' reading and the tracer's kept as traced",
      args: verifyArgs(policy),
      scenario: { ...notExercised, verdict: () => PROVING },
      expect: ['no-gap', tallyOf(0, 0, 1)],
      check: ({ result }) => {
        const row = rowOf(result, 'Two plus two')
        if (result.gaps[0]?.outcome !== 'refuted' || row.gap?.outcome !== 'refuted') return 'the gap is not listed refuted'
        if (row.proof !== PROVING.proof || row.exercises !== true) return `the row carries ${row.proof}, exercises ${row.exercises}, not the skeptics' reading`
        return row.traced?.exercises === false && result.counts.correctedRows === 1 ? null : `the tracer's reading came back ${JSON.stringify(row.traced)}`
      },
    },
    {
      name: "a refutation with no reading whose proof exercises the scenario clears nothing: the gap stands unverified, and says why",
      args: verifyArgs(policy),
      scenario: { ...notExercised, verdict: () => reviewVote('refuted') },
      expect: ['gaps', tallyOf(0, 1, 0)],
      check: ({ result }) => {
        const row = rowOf(result, 'Two plus two')
        if (row.gap?.outcome !== 'unverified' || row.traced || row.exercises !== false) return `the row came back ${JSON.stringify(row)}`
        return /no refuting skeptic gave a reading whose proof exercises the scenario/.test(result.gaps[0].votes.at(-1)) ? null : `the votes were ${result.gaps[0].votes.join(' | ')}`
      },
    },
    {
      name: 'a proof that failed in the fresh run is a measured gap: no skeptic judges it, and it stays a gap however they would vote',
      args: verifyArgs(policy, { run: runWith('Two plus two', { status: 'fail' }) }),
      scenario: { verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged a measured failure'
        const gap = rowOf(result, 'Two plus two').gap
        return gap?.kind === 'fails' && gap.outcome === 'measured' && result.gaps[0].outcome === 'measured' ? null : `the gap came back ${JSON.stringify(gap)}`
      },
    },
    {
      name: "a refuted gap on a proof that failed: the row carries the skeptics' reading, and its failure stays a measured gap",
      args: verifyArgs(policy, { run: runWith('Two plus two', { status: 'fail' }) }),
      scenario: { ...alphaRow({ exercises: false }), verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 1, 1)],
      check: ({ result }) => {
        const row = rowOf(result, 'Two plus two')
        if (!row.traced || row.exercises !== true) return "the row does not carry the skeptics' reading"
        return row.gap?.kind === 'fails' && row.gap.outcome === 'measured' ? null : `the row's gap came back ${JSON.stringify(row.gap)}`
      },
    },
    {
      name: 'a test that failed and then passed its one re-run is flaky: a measured fail no skeptic clears',
      args: verifyArgs(policy, { run: runWith('Two plus two', { status: 'fail', rerun: { status: 'pass', command: 'node scripts/run-tests.mjs --name x', durationMs: 1, output: null } }) }),
      scenario: { verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged a flaky test'
        const row = rowOf(result, 'Two plus two')
        if (row.result !== 'fail' || row.measured[0]?.status !== 'flaky') return `the row came back ${row.result}, measured ${JSON.stringify(row.measured)}`
        return row.gap?.kind === 'fails' && row.gap.outcome === 'measured' ? null : `the gap came back ${JSON.stringify(row.gap)}`
      },
    },
    {
      name: "a row's result is the fresh run's, whatever its tracer says, and a test the run does not hold is not-run",
      args: verifyArgs(policy),
      scenario: alphaRow({ result: 'pass', tests: [{ file: TEST_FILE, name: 'Two plus two, a test the run never held' }] }),
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result }) => {
        const row = rowOf(result, 'Two plus two')
        return row.result === 'not-run' && row.gap?.kind === 'not-run' && row.measured[0]?.status === 'not in the run' ? null : `the row came back ${JSON.stringify(row)}`
      },
    },
    {
      name: "a row with no test takes its tracer's result, of the gate or check it ran",
      args: verifyArgs(policy),
      scenario: { traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? { tests: [], proof: 'mise run openspec:check', result: 'pass' } : s === 'Zero plus zero' ? { tests: [], proof: 'mise run openspec:check', result: 'fail' } : null)) } },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result }) => {
        const pass = rowOf(result, 'Two plus two')
        const fail = rowOf(result, 'Zero plus zero')
        return pass.checked && !pass.gap && fail.gap?.kind === 'fails' ? null : `the rows came back ${JSON.stringify([pass, fail])}`
      },
    },
    {
      name: "a test the record does not give the scenario's ID is dropped in code, with a note, and the tracer's prompt lists the record's tests",
      args: verifyArgs(policy, { groups: [{ key: 'alpha', capability: 'alpha', scenarios: SPECS_WITH_IDS.alpha.map(([requirement, scenario]) => ({ requirement, scenario })) }, verifyArgs(policy).groups[1]] }),
      scenario: { traces: { alpha: (g) => cleanTrace(g, (s) => (s === '[ALP-001] Two plus two' ? { tests: [{ file: TEST_FILE, name: 'Two plus two' }] } : null)) } },
      expect: ['gaps', tallyOf(1, 0, 0)],
      check: ({ result, options }) => {
        const row = rowOf(result, '[ALP-001] Two plus two')
        if (row.gap?.kind !== 'no-proof' || row.tests.length) return `the row came back ${JSON.stringify(row)}`
        if (!/dropped, as not the record's tests for it: apps\/example\/test\/example\.test\.js: Two plus two/.test(row.notes)) return `its notes read ${row.notes}`
        const prompt = options.find((o) => o.label === 'trace alpha').prompt
        return prompt.includes(`${TEST_FILE}: [ALP-001] Two plus two (happy); ${TEST_FILE}: [ALP-001] Two plus two, refused (negative)`) ? null : "the tracer's prompt does not list the record's tests"
      },
    },
    {
      name: 'a scenario the record gives no test, and no gate or check proves, is a measured no-proof gap no skeptic clears',
      args: verifyArgs(policy, {
        groups: [{ key: 'alpha', capability: 'alpha', scenarios: SPECS_WITH_IDS.alpha.map(([requirement, scenario]) => ({ requirement, scenario })) }, verifyArgs(policy).groups[1]],
        run: stubRun({ specs: (s) => (s.id === 'ALP-003' ? { ...s, tests: { happy: [], negative: [] } } : s) }),
      }),
      scenario: { traces: { alpha: (g) => cleanTrace(g, (s) => (s === '[ALP-003] Clear empties the display' ? { proofKind: 'none', proof: '', tests: [] } : null)) }, verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged a scenario the record gives no test'
        const gap = result.gaps[0]
        return gap?.kind === 'no-proof' && gap.outcome === 'measured' && /the record gives it no test/.test(gap.title) ? null : `the gap came back ${JSON.stringify(gap)}`
      },
    },
    {
      name: "a test dropped from a scenario the record gives no test leaves it no proof: the tracer's own result clears nothing, and the gap is measured",
      args: verifyArgs(policy, {
        groups: [{ key: 'alpha', capability: 'alpha', scenarios: SPECS_WITH_IDS.alpha.map(([requirement, scenario]) => ({ requirement, scenario })) }, verifyArgs(policy).groups[1]],
        run: stubRun({ specs: (s) => (s.id === 'ALP-003' ? { ...s, tests: { happy: [], negative: [] } } : s) }),
      }),
      scenario: {
        traces: { alpha: (g) => cleanTrace(g, (s) => (s === '[ALP-003] Clear empties the display' ? { tests: [{ file: TEST_FILE, name: '[BET-001] The page is served' }], result: 'pass' } : null)) },
        verdict: () => PROVING,
      },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged it'
        const row = rowOf(result, '[ALP-003] Clear empties the display')
        return !row.checked && row.gap?.kind === 'no-proof' && row.gap.outcome === 'measured' ? null : `the row came back checked ${row.checked}, gap ${JSON.stringify(row.gap)}`
      },
    },
    n >= 3
      ? {
          name: 'votes with no majority leave a gap unverified, never refuted, and the run stops gaps',
          args: verifyArgs(policy),
          scenario: { ...notExercised, verdict: (title, i) => reviewVote(i === 1 ? 'upheld' : i === 2 ? 'refuted' : 'unverified') },
          expect: ['gaps', tallyOf(0, 1, 0)],
          check: ({ result }) => (result.gaps[0].outcome === 'unverified' ? null : `the gap came back ${result.gaps[0].outcome}`),
        }
      : unexercised('votes with no majority on a gap', `the policy sends a gap ${n} skeptic(s), fewer than 3, so no vote can split`),
    {
      name: 'skeptics that return nothing leave a gap unverified, not refuted',
      args: verifyArgs(policy),
      scenario: { ...notExercised, verdict: () => null },
      expect: ['gaps', tallyOf(0, 1, 0)],
      check: ({ result }) => (result.gaps[0].votes.every((v) => v === 'unverified: the skeptic returned nothing') ? null : `the votes were ${result.gaps[0].votes.join(' | ')}`),
    },
    most >= 7
      ? {
          name: "each row's gap is decided from its reading: no proof, a manual proof no plan recorded, not exercised, failing, not run, a manual proof answered pass; only the first three go to skeptics, and a recorded manual proof is none",
          args: verifyArgs(policy, {
            scenarios: 7,
            groups: [
              {
                key: 'kinds',
                capability: 'alpha',
                scenarios: ['none', 'unrecorded', 'unexercised', 'failing', 'unrun', 'manual-pass', 'recorded'].map((scenario) => ({ requirement: 'Kinds', scenario })),
              },
            ],
            design: false,
            lenses: [],
            run: { ...stubRun(), tests: [...stubRun().tests, runTest('unexercised', []), runTest('failing', [], { status: 'fail' }), runTest('unrun', [], { status: 'skip' })] },
          }),
          scenario: {
            traces: {
              kinds: (g) =>
                cleanTrace(g, (s) => ({
                  none: { proofKind: 'none', proof: '', tests: [] },
                  unrecorded: { proofKind: 'manual', proof: 'bd show example-9.9', tests: [], result: 'recorded' },
                  unexercised: { exercises: false },
                  failing: {},
                  unrun: {},
                  'manual-pass': { proofKind: 'manual', proof: `bd show ${RECORDED}`, tests: [], result: 'pass' },
                  recorded: { proofKind: 'manual', proof: `bd show ${RECORDED}, its note`, tests: [], result: 'recorded' },
                })[s]),
            },
          },
          expect: ['gaps', tallyOf(3, 0, 0, 3)],
          check: ({ result, calls }) => {
            const kinds = result.rows.map((r) => r.gap?.kind ?? 'none').join()
            if (kinds !== 'no-proof,no-proof,not-exercised,fails,not-run,not-run,none') return `the rows' gaps came back ${kinds}`
            if (!/names no manual proof the plan recorded/.test(result.gaps[1].title)) return `the unrecorded proof's gap reads ${result.gaps[1].title}`
            return skepticsFrom(calls, 'kinds') === 3 * n ? null : `sent ${skepticsFrom(calls, 'kinds')} skeptic(s), not ${3 * n}`
          },
        }
      : unexercised("each row's gap from its reading", `the policy gives a tracer ${most} scenario(s), fewer than the 7 the case needs`),
    {
      name: 'a tracer that returns a row for a scenario not its own and none for one of its own is mismatched; the run is incomplete and its gaps go to no skeptic',
      args: verifyArgs(policy),
      scenario: { traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? { scenario: 'Two plus three', exercises: false } : null)) } },
      expect: ['incomplete', /^group alpha mismatched; 2 of 5 scenario\(s\) traced; 0 gap\(s\), 0 measured and 0 judged/],
      check: ({ result, calls }) => {
        const problems = groupOf(result, 'alpha').problems.join('; ')
        if (!/a row for Adds \/ Two plus three, which is not one of its scenarios/.test(problems) || !/no row for Two plus two/.test(problems)) return `alpha's problems were ${problems}`
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged a mismatched group'
        return groupOf(result, 'alpha').returned.length === 3 ? null : "alpha's rows did not come back for the session"
      },
    },
    {
      name: 'a tracer that returns two rows for one scenario is mismatched',
      args: verifyArgs(policy),
      scenario: { traces: { beta: (g) => ({ ...cleanTrace(g), rows: [...cleanTrace(g).rows, traceRow(g.scenarios[0])] }) } },
      expect: ['incomplete', /^group beta mismatched; 3 of 5 /],
      check: ({ result }) => (/two rows for The page is served/.test(groupOf(result, 'beta').problems.join()) ? null : `beta's problems were ${groupOf(result, 'beta').problems}`),
    },
    {
      name: "a scenario named with its ID token on one side and without it on the other is traced, and its row keeps the name args gives",
      args: verifyArgs(policy, {
        groups: [
          { key: 'alpha', capability: 'alpha', scenarios: SPECS_WITH_IDS.alpha.map(([requirement, scenario]) => ({ requirement, scenario })) },
          { key: 'beta', capability: 'beta', scenarios: scenariosOf('beta') },
        ],
      }),
      scenario: {
        traces: {
          alpha: (g) => ({ ...cleanTrace(g), rows: g.scenarios.map((s) => traceRow({ ...s, scenario: bare(s.scenario) }, { tests: [{ file: TEST_FILE, name: s.scenario }] })) }),
          beta: (g) => ({ ...cleanTrace(g), rows: g.scenarios.map((s, i) => traceRow({ ...s, scenario: withId('beta', i, s.scenario) })) }),
        },
      },
      expect: ['no-gap', /^every one of the 5 scenario\(s\) traced/],
      check: ({ result }) => {
        const names = result.rows.map((r) => r.scenario).join(' | ')
        const want = [...SPECS_WITH_IDS.alpha.map(([, s]) => s), ...SPECS.beta.map(([, s]) => s)].join(' | ')
        return names === want ? null : `the rows came back named ${names}`
      },
    },
    {
      name: 'a row that gives its scenario another ID than the one its scenario carries is mismatched',
      args: verifyArgs(policy, { groups: [{ key: 'alpha', capability: 'alpha', scenarios: SPECS_WITH_IDS.alpha.map(([requirement, scenario]) => ({ requirement, scenario })) }, verifyArgs(policy).groups[1]] }),
      scenario: { traces: { alpha: (g) => ({ ...cleanTrace(g), rows: g.scenarios.map((s, i) => traceRow(i === 0 ? { ...s, scenario: `[ALP-009] ${bare(s.scenario)}` } : s)) }) } },
      expect: ['incomplete', /^group alpha mismatched; 2 of 5 /],
      check: ({ result }) =>
        /the row for \[ALP-001\] Two plus two gives its scenario another ID/.test(groupOf(result, 'alpha').problems.join('; ')) ? null : `alpha's problems were ${groupOf(result, 'alpha').problems}`,
    },
    {
      name: 'a tracer that read another commit is stale, and its rows count for nothing',
      args: verifyArgs(policy),
      scenario: { traces: { beta: (g) => ({ ...cleanTrace(g), head: PREVIOUS }) } },
      expect: ['incomplete', /^group beta stale; 3 of 5 /],
      check: ({ result }) => (/^the tracer read fedcba98\w+, not 0123456789/.test(groupOf(result, 'beta').problems[0]) ? null : `beta's problems were ${groupOf(result, 'beta').problems}`),
    },
    {
      name: 'a tracer whose head is a prefix of the commit but not a commit, one character, is stale',
      args: verifyArgs(policy),
      scenario: { traces: { beta: (g) => ({ ...cleanTrace(g), head: COMMIT[0] }) } },
      expect: ['incomplete', /^group beta stale; 3 of 5 /],
      check: ({ result }) => (/^the tracer read 0, not 0123456789/.test(groupOf(result, 'beta').problems[0]) ? null : `beta's problems were ${groupOf(result, 'beta').problems}`),
    },
    {
      name: 'a tracer that returns nothing leaves the run incomplete',
      args: verifyArgs(policy),
      scenario: { traces: { beta: null } },
      expect: ['incomplete', /^group beta died; 3 of 5 /],
      check: () => null,
    },
    {
      name: 'every tracer returning nothing stops the run agent-died',
      args: verifyArgs(policy),
      scenario: { traces: { alpha: null, beta: null } },
      expect: ['agent-died', /^every tracer returned nothing/],
      check: ({ result }) => (result.rows.length ? `returned ${result.rows.length} row(s)` : null),
    },
    lenses >= 1
      ? {
          name: 'a design lens that returns nothing leaves the run incomplete, though every scenario traced',
          args: verifyArgs(policy),
          scenario: { lenses: { 'lens-1': null } },
          expect: ['incomplete', /^lens lens-1 died; 5 of 5 /],
          check: () => null,
        }
      : unexercised('a design lens that returns nothing', 'the policy gives no design lens'),
    lenses >= 1
      ? {
          name: `a design lens's gap goes to the ${n} skeptic(s) the policy gives, and upheld stops the run gaps`,
          args: verifyArgs(policy),
          scenario: {
            lenses: { 'lens-1': (key) => ({ ...cleanLens(key), gaps: [{ decision: 'Serve only the app folder', where: 'serve.js:12', title: 'It serves the repository root', evidence: 'A request for /package.json returned 200.' }] }) },
          },
          expect: ['gaps', tallyOf(1, 0, 0)],
          check: ({ result, calls }) => (skepticsFrom(calls, 'lens-1') === n && result.gaps[0].kind === 'design' ? null : `the design gap came back ${JSON.stringify(result.gaps[0])}`),
        }
      : unexercised("a design lens's gap", 'the policy gives no design lens'),
    {
      name: 'a finding below a gap goes to no skeptic and comes back with where it was found',
      args: verifyArgs(policy),
      scenario: { traces: { alpha: (g) => ({ ...cleanTrace(g), below: [{ where: 'test/alpha.test.js:4', title: 'Its name claims a rounding check', evidence: 'It checks no rounding.' }] }) } },
      expect: ['no-gap', /; 0 gap\(s\), 0 measured and 0 judged by 0 skeptic\(s\): 0 upheld, 0 unverified, 0 refuted; 1 finding\(s\) below a gap$/],
      check: ({ result, calls }) => (!calls.some((l) => l.startsWith('skeptic ')) && result.below[0]?.source === 'alpha' ? null : `below came back ${JSON.stringify(result.below)}`),
    },
    lenses >= 1
      ? {
          name: "a run again: a kept row keeps the reading args gives, whatever its tracer says, with the new result and the commit it was read at, the earlier run's where it names none; a kept lens is not run, and keeps its own commit",
          args: keptRun([keptLens('lens-1', { status: 'kept', readAt: OLDEST })], {
            groups: [
              {
                key: 'alpha',
                capability: 'alpha',
                scenarios: scenariosOf('alpha'),
                kept: [
                  { requirement: 'Adds', scenario: 'Two plus two', proofKind: 'test', proof: 'test/kept.test.js: Two plus two', tests: [{ file: TEST_FILE, name: 'Two plus two' }], exercises: true, readAt: OLDEST },
                  { requirement: 'Adds', scenario: 'Zero plus zero', proofKind: 'test', proof: 'test/kept.test.js: Zero plus zero', tests: [{ file: TEST_FILE, name: 'Zero plus zero' }], exercises: true },
                ],
              },
              { key: 'beta', capability: 'beta', scenarios: scenariosOf('beta') },
            ],
          }),
          scenario: { traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? { proofKind: 'none', proof: '', exercises: false } : null)) } },
          expect: ['no-gap', new RegExp(`^every one of the 5 scenario\\(s\\) traced, ${lenses - 1} design lens\\(es\\) read and 1 kept; `)],
          check: ({ result, calls, options }) => {
            const row = rowOf(result, 'Two plus two')
            if (row.proof !== 'test/kept.test.js: Two plus two' || !row.exercises || !row.kept || row.readAt !== OLDEST || row.gap) return `the kept row came back ${JSON.stringify(row)}`
            if (rowOf(result, 'Zero plus zero').readAt !== PREVIOUS) return `a kept row naming no commit was stamped ${rowOf(result, 'Zero plus zero').readAt}, not the earlier run's`
            if (rowOf(result, 'Clear empties the display').kept) return 'a row the args did not keep is marked kept'
            if (calls.includes('design lens-1')) return 'the kept lens ran again'
            if (!options.find((o) => o.label === 'trace alpha').prompt.includes(`Kept from the trace at ${PREVIOUS}`)) return "the alpha tracer's prompt does not say which rows keep their reading"
            const kept = result.design.lenses.find((l) => l.key === 'lens-1')
            return kept?.status === 'kept' && kept.readAt === OLDEST ? null : `lens-1 came back ${JSON.stringify(kept)}`
          },
        }
      : unexercised('a run again', 'the policy gives no design lens to keep'),
    refused(
      'refused: a policy without verifyTraceSkeptics, before any agent runs',
      verifyArgs(policy, { policy: Object.fromEntries(Object.entries(verifyPolicy(policy)).filter(([k]) => k !== 'verifyTraceSkeptics')) }),
      /^args\.policy has no `verifyTraceSkeptics`/,
    ),
    refused(
      `refused: a group of more scenarios than verifyTraceMaxScenarios (${most}) gives one tracer`,
      verifyArgs(policy, {
        scenarios: most + 1,
        groups: [{ key: 'big', capability: 'alpha', scenarios: Array.from({ length: most + 1 }, (_, i) => ({ requirement: 'Many', scenario: `Case ${i + 1}` })) }],
        design: false,
        lenses: [],
      }),
      new RegExp(`^group big: ${most + 1} scenarios, more than the ${most} \`verifyTraceMaxScenarios\` gives one tracer`),
    ),
    refused('refused: groups that hold fewer scenarios than the delta specs', verifyArgs(policy, { scenarios: 6 }), /^args\.groups hold 5 scenario\(s\), but args\.scenarios says the delta specs hold 6/),
    refused(
      'refused: one scenario in two groups',
      verifyArgs(policy, {
        scenarios: 6,
        groups: [...verifyArgs(policy).groups, { key: 'again', capability: 'alpha', scenarios: [{ requirement: 'Adds', scenario: 'Two plus two' }] }],
      }),
      /^the scenario alpha \/ Adds \/ Two plus two is in groups alpha and again/,
    ),
    refused(
      `refused: a first run of a change with a design given ${lenses + 1} lens(es), not the ${lenses} the policy gives`,
      verifyArgs(policy, { lenses: lensesOf(lenses + 1) }),
      new RegExp(`^a first run of a change with a design takes ${lenses} lens\\(es\\)`),
    ),
    refused('refused: a lens for a change with no design', verifyArgs(policy, { design: false }), /^args\.design says the change has no design\.md/),
    refused(
      'refused: kept rows on a first run',
      verifyArgs(policy, { groups: [{ ...verifyArgs(policy).groups[0], kept: [{ requirement: 'Adds', scenario: 'Two plus two', proofKind: 'test', proof: 'x', exercises: true }] }, verifyArgs(policy).groups[1]] }),
      /^group alpha: kept rows need args\.previous/,
    ),
    refused(
      "refused: a kept row for a scenario not of its group",
      verifyArgs(policy, {
        previous: { commit: PREVIOUS },
        groups: [{ ...verifyArgs(policy).groups[0], kept: [{ requirement: 'Serves', scenario: 'The page is served', proofKind: 'test', proof: 'x', exercises: true }] }, verifyArgs(policy).groups[1]],
      }),
      /^group alpha: kept\[0\] is Serves \/ The page is served, which is not one of the group's scenarios/,
    ),
    refused(
      'refused: a run again whose lenses and kept readings do not add up to the policy',
      verifyArgs(policy, { previous: { commit: PREVIOUS, design: [keptLens('lens-0')] } }),
      new RegExp(`^a run again runs a lens for each part of the design the diff changes and keeps the rest: ${lenses} run and 1 kept`),
    ),
    lenses >= 1
      ? refused(
          'refused: a lens that both runs again and keeps its reading',
          verifyArgs(policy, { previous: { commit: PREVIOUS, design: [keptLens('lens-1')] } }),
          /^the lens lens-1 both runs again and keeps its earlier reading/,
        )
      : unexercised('a lens run again and kept', 'the policy gives no design lens'),
    ...(lenses >= 1
      ? [
          refused(
            'refused: a kept design reading of a lens that died in the earlier run, so it cannot stand in for one',
            keptRun([keptLens('lens-1', { status: 'died', checked: [] })]),
            /^args\.previous\.design\[0\]: the lens lens-1 came back "died" from the earlier run, not read or kept, so it has no reading to keep/,
          ),
          refused(
            'refused: a kept design reading that checked no decision',
            keptRun([keptLens('lens-1', { checked: [] })]),
            /^args\.previous\.design\[0\]: the lens lens-1 keeps no decision it checked/,
          ),
          refused('refused: one lens kept twice', keptRun([keptLens('lens-1'), keptLens('lens-1')]), /^args\.previous\.design keeps the lens lens-1 twice/),
          refused(
            'refused: a kept design reading under the key of a group',
            keptRun([keptLens('alpha')]),
            /^args\.previous\.design\[0\]: the kept lens alpha has the key of a group/,
          ),
          refused(
            "refused: a kept row whose readAt is not a commit",
            keptRun([keptLens('lens-1')], {
              groups: [{ ...verifyArgs(policy).groups[0], kept: [{ requirement: 'Adds', scenario: 'Two plus two', proofKind: 'test', proof: 'x', exercises: true, readAt: 'HEAD~1' }] }, verifyArgs(policy).groups[1]],
            }),
            /^group alpha: kept\[0\]: readAt must be the commit its reading was taken at/,
          ),
        ]
      : [unexercised('a kept design reading', 'the policy gives no design lens')]),
    refused('refused: a commit that is not one', verifyArgs(policy, { commit: 'HEAD' }), /^args\.commit must be the commit traced/),
    refused('refused: a fresh run of another commit than the one traced', verifyArgs(policy, { run: stubRun({ commit: PREVIOUS }) }), /^args\.run is the fresh run at fedcba98\w+, not 0123456789\w+: run `mise run tests:fresh` at the commit traced/),
    refused('refused: no fresh run', verifyArgs(policy, { run: undefined }), /^args\.run must be the fresh run/),
    lenses >= 1
      ? refused(
          'refused: one key naming a group and a lens',
          verifyArgs(policy, { lenses: [{ key: 'alpha', label: 'Alpha', focus: 'x' }, ...lensesOf(lenses - 1, 2)] }),
          /^the key alpha names two groups or lenses/,
        )
      : unexercised('one key naming a group and a lens', 'the policy gives no design lens'),
  ]
}

/* ------------------------------------------------- verify-change-trace.js: the clause run ----- */

/** The fixture change's tests as one file's source, each named for its scenario and asserting what `pass` gives it. */
const CLAUSE_TESTS = [
  "import assert from 'node:assert/strict'",
  "import { test } from 'node:test'",
  "import { run } from '../app.js'",
  '',
  ...Object.values(SPECS).flatMap((list) => list.map(([, scenario]) => `test('${scenario}', () => {\n  assert.equal(run('${scenario}'), 'done')\n})\n`)),
].join('\n')

/** A delta spec's text for `list`, in the form writeSpecs writes it: each scenario's WHEN and its one THEN. */
const specOf = (list) => {
  const lines = ['## ADDED Requirements', '']
  let last = null
  for (const [requirement, scenario] of list) {
    if (requirement !== last) lines.push(`### Requirement: ${requirement}`, '', 'The system SHALL do it.', '')
    last = requirement
    lines.push(`#### Scenario: ${scenario}`, '', '- **WHEN** it happens', '- **THEN** it is done', '')
  }
  return lines.join('\n')
}

/**
 * The trace workflow's clause run, on the result of its own clean first run: the clause judge of
 * `scripts/judge-trace-clauses.mjs` planned over the fixture's specs and tests and asked through a
 * stubbed client, a clause asserted and a clause missing; then each outcome of the skeptics, each
 * refusal by its reason before any agent runs, and what the two renderers make of the result. The
 * client's key missing and a call failing are the judge's own selftest's, since no answer reaches a
 * clause run then.
 */
async function clauseResults(body, policy) {
  const judgeScript = await import('./judge-trace-clauses.mjs')
  const lib = await import('./lib/trace.mjs')
  const t = policy.verifyTraceClauseThreshold
  const n = policy.verifyTraceSkeptics
  const base = verifyArgs(policy)
  const first = (await run(body, base, verifyAnswer(base))).result
  const corrected = (await run(body, base, verifyAnswer(base, { traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? { exercises: false } : null)) }, verdict: () => PROVING }))).result
  const plan = judgeScript.planClauses({
    result: first,
    specText: (capability) => (SPECS[capability] ? specOf(SPECS[capability]) : null),
    fileText: (path) => (path === TEST_FILE ? CLAUSE_TESTS : null),
    policy: judgeScript.clausePolicy(policy),
  })
  /** The judge's answers through a stub client giving each clause of `doubted` scenarios `low`, and every other 1. */
  const judged = async (doubted = [], low = 0) => {
    const stub = { noul: async (q) => Object.fromEntries(Object.keys(q.questions).map((name) => [name, doubted.some((s) => q.state.scenario.endsWith(` / ${s}`)) ? low : 1])) }
    return { change: CHANGE, commit: COMMIT, model: 'jev-selftest', rows: await judgeScript.askClauses(plan.requests, stub), skipped: plan.skipped }
  }
  const clauseRun = async (clauses, scenario = {}, extra = {}) => {
    const args = verifyArgs(policy, { first, clauses, ...extra })
    return run(body, args, verifyAnswer(args, scenario))
  }
  const by = (out, scenario) => out.result?.rows.find((r) => r.scenario === scenario)
  const problemsOf = (out) => (out.problems.length ? out.problems.join(' | ') : null)
  const scenarios = Object.entries(SPECS).flatMap(([capability, list]) => list.map(([requirement, scenario]) => ({ capability, requirement, scenario })))

  const asserted = await clauseRun(await judged())
  const missing = await clauseRun(await judged(['Two plus two']))
  const atThreshold = await clauseRun(await judged(['Two plus two'], t))
  const refuted = await clauseRun(await judged(['Two plus two']), { verdict: () => PROVING })
  const bare = await clauseRun(await judged(['Two plus two']), { verdict: () => reviewVote('refuted') })
  const silent = await clauseRun(await judged(['Two plus two']), { verdict: () => null })
  const again = await run(body, verifyArgs(policy, { first: corrected, clauses: await judged(['Two plus two']) }), verifyAnswer(base, { verdict: () => ({ ...PROVING, proof: 'test/alpha.test.js: Two plus two, its second assertion' }) }))

  const cases = [
    {
      name: 'control: the judge plans one request per row over the specs and tests, and a clause run whose every clause is asserted runs no agent and stops no-gap with every row as the first run left it',
      control: true,
      detail: () => {
        if (plan.problems.length || plan.requests.length !== 5) return `the plan came back ${JSON.stringify({ problems: plan.problems, requests: plan.requests.length })}`
        if (problemsOf(asserted)) return problemsOf(asserted)
        const r = asserted.result
        if (asserted.calls.length) return `ran ${asserted.calls.join(', ')}`
        if (r.stopped !== 'no-gap' || !/^a clause run: 5 clause\(s\) of 5 row\(s\) judged, 0 row\(s\) with one under /.test(r.why)) return `stopped ${r.stopped}: ${r.why}`
        if (JSON.stringify(r.rows) !== JSON.stringify(first.rows)) return 'a row changed'
        return r.clauses.judged === 5 && r.clauses.doubted === 0 && r.clauses.model === 'jev-selftest' ? null : `clauses came back ${JSON.stringify(r.clauses)}`
      },
    },
    {
      name: `a clause the judge's answer puts under ${CLAUSE_KEY_NAME} makes its row an unasserted gap, named with the clause and sent to the ${n} skeptic(s) the policy gives; upheld, it stops the run gaps and the row still exercises its scenario, as its tracer read it`,
      detail: () => {
        if (problemsOf(missing)) return problemsOf(missing)
        const row = by(missing, 'Two plus two')
        if (missing.calls.length !== n || skepticsFrom(missing.calls, 'alpha') !== n) return `ran ${missing.calls.join(', ')}`
        if (missing.result.stopped !== 'gaps' || row.gap?.kind !== 'unasserted' || row.gap.outcome !== 'upheld' || row.exercises !== true) return `the row came back ${JSON.stringify(row)}`
        const gap = missing.result.gaps.at(-1)
        return /^Two plus two: its tests may not assert THEN it is done$/.test(gap.title) && /^jev-selftest: 0 for THEN it is done, under [\d.]+\. Read the test/.test(gap.evidence) ? null : `the gap reads ${gap.title} / ${gap.evidence}`
      },
    },
    {
      name: 'a clause exactly at the threshold is not under it: no gap, and no skeptic',
      detail: () => problemsOf(atThreshold) ?? (atThreshold.calls.length || atThreshold.result.stopped !== 'no-gap' ? `ran ${atThreshold.calls.join(', ')}; stopped ${atThreshold.result.stopped}` : null),
    },
    {
      name: "an unasserted gap a majority refutes with a proving reading leaves the run no-gap, the row carrying the skeptics' reading and its tracer's as traced",
      detail: () => {
        if (problemsOf(refuted)) return problemsOf(refuted)
        const row = by(refuted, 'Two plus two')
        if (refuted.result.stopped !== 'no-gap' || row.gap?.outcome !== 'refuted' || row.proof !== PROVING.proof) return `the row came back ${JSON.stringify(row)}`
        return row.traced?.proof === first.rows[0].proof && refuted.result.counts.refuted === 1 ? null : `traced ${JSON.stringify(row.traced)}, counts ${JSON.stringify(refuted.result.counts)}`
      },
    },
    {
      name: 'a refutation with no reading whose proof exercises the scenario clears no unasserted gap, and skeptics that return nothing leave it unverified',
      detail: () => {
        for (const out of [bare, silent]) {
          if (problemsOf(out)) return problemsOf(out)
          const row = by(out, 'Two plus two')
          if (out.result.stopped !== 'gaps' || row.gap?.outcome !== 'unverified') return `the row came back ${JSON.stringify(row)}`
        }
        return null
      },
    },
    {
      name: "a row the first run's skeptics corrected keeps its tracer's reading as traced through a second correction",
      detail: () => {
        if (problemsOf(again)) return problemsOf(again)
        const row = by(again, 'Two plus two')
        return again.result.stopped === 'no-gap' && row.traced?.exercises === false && /its second assertion$/.test(row.proof) ? null : `the row came back ${JSON.stringify(row)}`
      },
    },
  ]
  const refusals = [
    ['a policy without the threshold', { policy: Object.fromEntries(Object.entries(verifyPolicy(policy)).filter(([k]) => k !== CLAUSE_KEY_NAME)) }, /^args\.policy `verifyTraceClauseThreshold` must be above 0 and at most 1/],
    ['a first run that stopped with gaps', { first: { ...first, stopped: 'gaps' } }, /^args\.first stopped gaps, not no-gap in a first run/],
    ["a first run that is a clause run's result", { first: asserted.result }, /^args\.first stopped no-gap in a clause run/],
    ['a first run of another commit', { first: { ...first, commit: PREVIOUS } }, /^args\.first must be the result of a run at args\.commit/],
    ['answers judged at another commit', { clauses: { ...(await judged()), commit: PREVIOUS } }, /^args\.clauses must be what scripts\/judge-trace-clauses\.mjs wrote at args\.commit/],
    ['answers with no first run', { first: undefined }, /^args\.first must be the result of a run at args\.commit/],
    ['answers for a scenario no row holds', { clauses: { ...(await judged()), rows: [{ capability: 'alpha', requirement: 'Adds', scenario: 'Two plus three', clauses: [{ clause: 'THEN it is done', p: 0 }] }] } }, /^args\.clauses\.rows\[0\] names no row of args\.first, once, whose proof exercises it/],
    ['answers for one row twice', { clauses: { ...(await judged()), rows: [(await judged()).rows[0], (await judged()).rows[0]] } }, /^args\.clauses\.rows\[1\] names no row of args\.first, once/],
    ['answers for a row whose proof does not exercise it', { first: { ...first, rows: first.rows.map((r, i) => (i ? r : { ...r, exercises: false })) } }, /^args\.clauses\.rows\[0\] names no row of args\.first, once, whose proof exercises it/],
    ['an answer that is no probability', { clauses: { ...(await judged()), rows: [{ ...(await judged()).rows[0], clauses: [{ clause: 'THEN it is done', p: 1.5 }] }] } }, /^args\.clauses\.rows\[0\] must list \{ clause, p \}, p from 0 to 1/],
  ]
  for (const [what, extra, reason] of refusals) {
    const args = verifyArgs(policy, { first, clauses: await judged(), ...extra })
    const out = await run(body, args, verifyAnswer(args))
    cases.push({
      name: `refused: ${what}, before any agent runs`,
      detail: () => problemsOf(out) ?? (out.result.stopped === 'refused' && reason.test(out.result.why) && !out.calls.length ? null : `stopped ${out.result.stopped} (${out.result.why}); ran ${out.calls.join(', ')}`),
    })
  }
  cases.push(
    {
      file: 'scripts/render-trace.mjs',
      name: "an unasserted gap renders in the trace with its clause and its votes, and the trace says what the clause check judged; a trace with no clause run says none ran",
      detail: () => {
        const text = lib.renderTrace(missing.result, scenarios, 'specs')
        if (!text.includes('| unasserted, upheld |') || !/- \*\*upheld\*\* \([^)]*\): `unasserted` at alpha \/ Two plus two, `[^`]*`\. Two plus two: its tests may not assert THEN it is done/.test(text)) return `the trace reads ${text}`
        if (!/TypeSafe `jev-selftest` second-checked 5 clause\(s\) of 5 row\(s\) through `scripts\/judge-trace-clauses\.mjs`, and sent the skeptics the 1 row\(s\) with one under `verifyTraceClauseThreshold`/.test(text)) return 'the trace does not say what the clause check judged'
        return lib.renderTrace(first, scenarios, 'specs').includes('No clause was second-checked by TypeSafe') ? null : 'a trace with no clause run does not say so'
      },
    },
    {
      file: 'scripts/render-pr-body.mjs',
      name: 'refuses a clause run whose unasserted gap no majority refuted, by its reason, and writes one whose every unasserted gap was refuted, saying so',
      detail: () => {
        const open = lib.prBodyProblems(missing.result).join(' | ')
        if (!/the trace stopped `gaps`, not `no-gap`/.test(open) || !/1 row\(s\) have a gap no majority refuted: Two plus two/.test(open)) return `the problems were ${open}`
        if (lib.prBodyProblems(refuted.result).length) return `the refuted run was refused: ${lib.prBodyProblems(refuted.result).join(' | ')}`
        return /sent the skeptics the 1 row\(s\) with one under `verifyTraceClauseThreshold` \([\d.]+\) as an `unasserted` gap, each refuted\./.test(lib.renderPrSection(refuted.result, scenarios)) ? null : 'the body does not say the clause check ran and each gap was refuted'
      },
    },
  )
  const exercisable = t > 0 && t <= 1 ? null : `cannot be exercised: \`${CLAUSE_KEY_NAME}\` is ${t}, not a probability above 0`
  return cases.map((c) => {
    let detail
    try {
      detail = exercisable ?? c.detail()
    } catch (error) {
      detail = `threw: ${error.stack ?? error.message}`
    }
    return { file: c.file ?? VERIFY, name: c.name, control: Boolean(c.control), ok: detail === null, detail: detail ?? 'holds' }
  })
}

/* ------------------------------------------------------------------------ the trace renderers ----- */

/** Delta specs for the fixture change under `root`/`dir`, from `specs`. */
function writeSpecs(root, dir, specs) {
  for (const [capability, list] of Object.entries(specs)) {
    const lines = ['## ADDED Requirements', '']
    let last = null
    for (const [requirement, scenario] of list) {
      if (requirement !== last) lines.push(`### Requirement: ${requirement}`, '', 'The system SHALL do it.', '')
      last = requirement
      lines.push(`#### Scenario: ${scenario}`, '', '- **WHEN** it happens', '- **THEN** it is done', '')
    }
    mkdirSync(join(root, dir, capability), { recursive: true })
    writeFileSync(join(root, dir, capability, 'spec.md'), lines.join('\n'))
  }
}

/**
 * The renderers of `scripts/render-trace.mjs` and `scripts/render-pr-body.mjs`, run on this file's
 * stubbed runs of the trace workflow, over delta specs written under the temporary directory: a
 * control through both command lines, then each refusal by its reason.
 */
async function rendererResults(body, policy) {
  const lib = await import('./lib/trace.mjs')
  const clean = (await run(body, verifyArgs(policy), verifyAnswer(verifyArgs(policy)))).result
  const gapped = (await run(body, verifyArgs(policy), verifyAnswer(verifyArgs(policy), { traces: { alpha: (g) => cleanTrace(g, (s) => (s === 'Two plus two' ? { exercises: false } : null)) } }))).result
  const active = `openspec/changes/${CHANGE}/specs`
  const archived = `openspec/changes/archive/2026-09-28-${CHANGE}/specs`
  const base = mkdtempSync(join(tmpdir(), 'workflows-renderers-'))
  let n = 0
  const tree = (setup) => {
    const root = join(base, String(n++))
    setup(root)
    return root
  }
  const cli = (script, root, argv) => spawnSync(process.execPath, [join(REPO_ROOT, 'scripts', script), ...argv], { env: { ...process.env, TRACE_ROOT: root }, encoding: 'utf8' })
  const save = (root, result, fresh = stubRun()) => {
    mkdirSync(join(root, '.scratch'), { recursive: true })
    writeFileSync(join(root, '.scratch', `${CHANGE}-trace.json`), JSON.stringify(result))
    if (fresh !== null) writeFileSync(join(root, '.scratch', `${CHANGE}-verify.json`), JSON.stringify(fresh))
  }
  const report = await import('./lib/verify-report.mjs')
  const section = (fresh) => report.renderVerifySection(report.verifyReport(fresh))
  const refusedFor = (out, reason) => (out.status === 1 && reason.test(out.stderr) ? null : `exited ${out.status}: ${out.stderr || out.stdout}`)

  const cases = [
    {
      file: 'scripts/render-trace.mjs',
      name: 'control: both command lines write from a clean result, the trace opening on the commit and a row for every scenario in the delta specs',
      control: true,
      test: () => {
        const root = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, clean)
          writeFileSync(join(r, '.scratch', 'head.md'), '# Head\n')
        })
        const trace = cli('render-trace.mjs', root, [CHANGE])
        if (trace.status !== 0) return `render-trace exited ${trace.status}: ${trace.stderr}`
        const text = readFileSync(join(root, '.scratch', `${CHANGE}-trace.md`), 'utf8')
        if (text.split('\n')[0] !== `# Scenario trace of ${CHANGE} at ${COMMIT}`) return `the trace opens "${text.split('\n')[0]}"`
        if (text.split('\n').filter((l) => /^\| (alpha|beta) \|/.test(l)).length !== 5) return 'the trace does not hold 5 rows'
        const body = cli('render-pr-body.mjs', root, [CHANGE, '--head', '.scratch/head.md'])
        if (body.status !== 0) return `render-pr-body exited ${body.status}: ${body.stderr}`
        const pr = readFileSync(join(root, '.scratch', `${CHANGE}-pr.md`), 'utf8')
        if (!pr.startsWith('# Head\n\n## Scenario trace\n') || !pr.includes('every one of the 5 scenarios')) return `the body reads ${pr.slice(0, 200)}`
        // Both renderers of the verification report write one section from one stubbed run.
        const verify = cli('render-verify-report.mjs', root, [CHANGE])
        if (verify.status !== 0) return `render-verify-report exited ${verify.status}: ${verify.stderr}`
        const note = readFileSync(join(root, '.scratch', `${CHANGE}-verify.md`), 'utf8')
        const want = section(stubRun())
        if (note !== `# Verification report of ${CHANGE} at ${COMMIT}\n\n${want}`) return `the report reads ${note.slice(0, 300)}`
        if (!pr.includes(`</details>\n\n${want}`)) return 'the body does not carry the same verification report after the trace'
        return want.includes('**Verdict: `accept`.**') && want.includes('| ALP-001 | alpha | added | [ALP-001] Two plus two (functional, pass) | [ALP-001] Two plus two, refused (functional, pass) | pass |')
          ? null
          : `the clean report reads ${want.slice(0, 600)}`
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: 'a flaky test is gap 5 and rejects the change, in the report on the epic, and render-pr-body refuses to write the body, by its reason',
      test: () => {
        const flaky = runWith('[ALP-001] Two plus two', { status: 'fail', rerun: { status: 'pass', command: 'node scripts/run-tests.mjs --name "[ALP-001] Two plus two"', durationMs: 1, output: null } })
        const root = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, clean, flaky)
        })
        const verify = cli('render-verify-report.mjs', root, [CHANGE])
        if (verify.status !== 0) return `render-verify-report exited ${verify.status}: ${verify.stderr}`
        const note = readFileSync(join(root, '.scratch', `${CHANGE}-verify.md`), 'utf8')
        if (!/\*\*Verdict: `reject`\*\*, for 1 reason\(s\):\n\n- 1 flaky test\(s\), which count as failing \(gap 5\)/.test(note)) return `the report reads ${note.slice(0, 500)}`
        if (!/5\. Flaky tests:\n\n- apps\/example\/test\/example\.test\.js: "\[ALP-001\] Two plus two" failed, then passed when run once more/.test(note)) return 'gap 5 does not name the flaky test'
        if (!/\| ALP-001 \|[^\n]*\| flaky \|/.test(note)) return "the scenario's status is not flaky"
        return refusedFor(cli('render-pr-body.mjs', root, [CHANGE]), /the verification report's verdict is `reject`, not `accept`: 1 flaky test\(s\)/)
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: "the report's verdict names each reason: a test that failed twice, an unmet obligation the baseline does not waive, a rule 5 refusal, a Commands' run that failed and a problem of the run; a waived one, an inverted pyramid and a removed scenario do not reject",
      test: () => {
        const fresh = stubRun({
          tests: (t) => (t.name === '[ALP-002] Zero plus zero' ? { ...t, status: 'fail', rerun: { status: 'fail', command: 'x', durationMs: 1, output: 'no' } } : t.name === 'Two plus two' ? { ...t, layer: 'e2e' } : t.name === 'Zero plus zero' ? { ...t, layer: 'e2e' } : t),
          specs: (s) =>
            s.id === 'BET-001'
              ? { ...s, obligation: { happy: 'met', negative: 'unmet', because: null } }
              : s.id === 'BET-002'
                ? { ...s, state: 'living', obligation: { happy: 'met', negative: 'unmet', because: null } }
                : s.id === 'ALP-003'
                  ? { ...s, state: 'removed' }
                  : s,
          baseline: ['BET-001:negative', 'BET-002:negative'],
          trace: { failures: ['rule 5: the commit abc "x" changes apps/example/app.js and names no task'], advisories: [], notes: [], summary: 'stub' },
          thresholds: { script: 'thresholds:commands:check', status: 1, ms: 1, output: 'thresholds:commands:check: 1 refusal.' },
          problems: ['apps/example/test/b.test.js failed on load'],
        })
        const r = report.verifyReport(fresh)
        const reasons = r.reasons.join(' | ')
        const wanted = [
          /^apps\/example\/test\/example\.test\.js: "\[ALP-002\] Zero plus zero" fails, and failed again when run once more$/,
          /^1 unmet obligation\(s\) of a happy-path or negative test the baseline does not waive \(gap 1\)$/,
          /^1 implementation element\(s\) resolving to no task \(gap 3\)$/,
          /^`thresholds:commands:check` exited 1$/,
          /^the run: apps\/example\/test\/b\.test\.js failed on load$/,
        ]
        const missed = wanted.filter((w) => !r.reasons.some((x) => w.test(x)))
        if (missed.length || r.reasons.length !== wanted.length) return `the reasons were ${reasons}`
        const status = (id) => r.scenarios.find((s) => s.id === id).status
        if (status('BET-001') !== 'no test' || status('BET-002') !== 'waived (baseline)' || status('ALP-003') !== 'to retire' || status('ALP-002') !== 'fail') {
          return `statuses: ${r.scenarios.map((s) => `${s.id} ${s.status}`).join(', ')}`
        }
        const layers = r.layers.map((l) => `${l.component}/${l.layer}/${l.tests}`).join(', ')
        return layers === 'example/e2e/2, example/functional/13' && r.tasks[0].paths[0] === 'apps/example/app.js' ? null : `layers ${layers}, tasks ${JSON.stringify(r.tasks)}`
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: 'a scenario whose tests were all skipped reads `no test`, and each skipped blocking test is a reason to reject',
      test: () => {
        const r = report.verifyReport(stubRun({ tests: (t) => (t.ids.includes('ALP-001') ? { ...t, status: 'skip' } : t) }))
        const status = r.scenarios.find((s) => s.id === 'ALP-001').status
        if (status !== 'no test') return `ALP-001 reads ${status}`
        const skipped = r.reasons.filter((x) => /" is skipped or todo, so it proves nothing$/.test(x)).length
        return r.verdict === 'reject' && skipped === 2 ? null : `verdict ${r.verdict}: ${r.reasons.join(' | ')}`
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: 'a scenario one of whose tests no script ran reads `not run`, never `pass`, in the model and the table',
      test: () => {
        const r = report.verifyReport(stubRun({ tests: (t) => (t.name === '[ALP-001] Two plus two, refused' ? null : t) }))
        const status = r.scenarios.find((s) => s.id === 'ALP-001').status
        if (status !== 'not run') return `ALP-001 reads ${status}`
        return /\| ALP-001 \|[^\n]*\(\?, not run\) \| not run \|/.test(report.renderVerifySection(r)) ? null : 'the table does not show it not run'
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: 'a run whose commit or base is not 7 to 40 hex digits is refused, and render-pr-body refuses an empty one',
      test: () => {
        const problems = report.verifyProblems(stubRun({ commit: '' })).join(' | ')
        if (!/its `commit` is not a commit of 7 to 40 hex digits/.test(problems)) return `the problems were ${problems}`
        if (!report.verifyProblems(stubRun({ base: 'main' })).some((p) => /its `base` is not a commit/.test(p))) return 'a base of main was taken'
        const root = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, clean, stubRun({ commit: '' }))
        })
        return refusedFor(cli('render-pr-body.mjs', root, [CHANGE]), /its `commit` is not a commit of 7 to 40 hex digits/)
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: 'an E2E layer larger than the functional one is an advisory inversion, never a reason',
      test: () => {
        const r = report.verifyReport(stubRun({ tests: (t) => ({ ...t, layer: t.name.includes('refused') ? 'functional' : 'e2e' }) }))
        if (r.verdict !== 'accept') return `the verdict was ${r.verdict}: ${r.reasons.join(' | ')}`
        return r.advisory.some((a) => /^the component example has 10 E2E test\(s\) and 5 functional one\(s\): an inverted pyramid/.test(a)) ? null : `advisory: ${r.advisory.join(' | ')}`
      },
    },
    {
      file: 'scripts/render-verify-report.mjs',
      name: "refuses JSON that is not a fresh run's, and one for another change, by its reason",
      test: () => {
        const root = tree((r) => {
          mkdirSync(join(r, '.scratch'), { recursive: true })
          writeFileSync(join(r, '.scratch', `${CHANGE}-verify.json`), JSON.stringify({ change: CHANGE, commit: COMMIT }))
          writeFileSync(join(r, '.scratch', 'other-verify.json'), JSON.stringify(stubRun()))
        })
        return (
          refusedFor(cli('render-verify-report.mjs', root, [CHANGE]), /verify\.json: it has no `base`, `environment`/) ??
          refusedFor(cli('render-verify-report.mjs', root, ['other']), /is the run for example-change, not other/)
        )
      },
    },
    {
      file: 'scripts/render-pr-body.mjs',
      name: 'refuses a fresh run of another commit than the trace, and a trace with no fresh run, by its reason',
      test: () => {
        const other = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, clean, stubRun({ commit: PREVIOUS }))
        })
        const none = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, clean, null)
        })
        return (
          refusedFor(cli('render-pr-body.mjs', other, [CHANGE]), /is the run at fedcba98\w+, and the trace was taken at 0123456789\w+: both are of one commit/) ??
          refusedFor(cli('render-pr-body.mjs', none, [CHANGE]), /the fresh run \.scratch\/example-change-verify\.json could not be read/)
        )
      },
    },
    {
      file: 'scripts/render-trace.mjs',
      name: 'refuses a result missing a scenario the delta specs hold, by its reason',
      test: () => {
        const root = tree((r) => {
          writeSpecs(r, active, { ...SPECS, beta: [...SPECS.beta, ['Serves', 'A third path']] })
          save(r, clean)
        })
        return refusedFor(cli('render-trace.mjs', root, [CHANGE]), /no row for beta \/ Serves \/ A third path/)
      },
    },
    {
      file: 'scripts/render-trace.mjs',
      name: 'refuses a row no delta spec holds',
      test: () => lib.matchProblems(clean.rows, SPECS.alpha.map(([requirement, scenario]) => ({ capability: 'alpha', requirement, scenario }))).some((p) => /^a row for beta \/ Serves \/ The page is served, which no delta spec holds$/.test(p)) ? null : 'no problem names the row',
    },
    {
      file: 'scripts/render-trace.mjs',
      name: "refuses a refused run's result, which traced nothing",
      test: () => (/^the workflow refused its arguments/.test(lib.parseResult(JSON.stringify({ change: CHANGE, stopped: 'refused', why: 'x' })).problem ?? '') ? null : 'it did not refuse'),
    },
    {
      file: 'scripts/render-trace.mjs',
      name: "reads a workflow state file's result, and finds an archived change's delta specs, but not two folders for one change",
      test: () => {
        if (lib.parseResult(JSON.stringify({ result: clean })).problem) return 'it did not read through { result }'
        const root = tree((r) => writeSpecs(r, archived, SPECS))
        if (lib.specsDir(root, CHANGE).dir !== archived) return `found ${JSON.stringify(lib.specsDir(root, CHANGE))}`
        writeSpecs(root, active, SPECS)
        return /are in 2 places/.test(lib.specsDir(root, CHANGE).problem ?? '') ? null : 'two folders were not refused'
      },
    },
    {
      file: 'scripts/render-trace.mjs',
      name: "matches rows to delta-spec headers that carry ID tokens, a row named with its ID or without, shows each header's ID, and refuses a row whose ID is another",
      test: () => {
        const specs = Object.entries(SPECS_WITH_IDS).flatMap(([capability, list]) => list.map(([requirement, scenario]) => ({ capability, requirement, scenario })))
        const mixed = clean.rows.map((r, i) => (i === 1 ? { ...r, scenario: withId(r.capability, 1, r.scenario) } : r))
        const problems = lib.matchProblems(mixed, specs)
        if (problems.length) return `rows with and without the ID did not match: ${problems.join(' | ')}`
        if (!lib.renderTrace({ ...clean, rows: mixed }, specs, 'specs').includes('| alpha | Adds | [ALP-001] Two plus two |')) return "the trace does not show the header's ID"
        const clashing = mixed.map((r, i) => (i === 0 ? { ...r, scenario: `[ALP-009] ${r.scenario}` } : r))
        return lib.matchProblems(clashing, specs).some((p) => /^the row for alpha \/ \[ALP-001\] Two plus two names its scenario \[ALP-009\], not \[ALP-001\]$/.test(p))
          ? null
          : `a clashing ID was not refused by its reason: ${lib.matchProblems(clashing, specs).join(' | ')}`
      },
    },
    {
      file: 'scripts/render-pr-body.mjs',
      name: 'refuses a trace with a gap no majority refuted, by its reason',
      test: () => {
        const root = tree((r) => {
          writeSpecs(r, active, SPECS)
          save(r, gapped)
        })
        return refusedFor(cli('render-pr-body.mjs', root, [CHANGE]), /the trace stopped `gaps`, not `no-gap`[\s\S]*1 row\(s\) have a gap no majority refuted: Two plus two/)
      },
    },
    {
      file: 'scripts/render-pr-body.mjs',
      name: 'refuses, under a no-gap verdict, a row that failed, one whose proof does not exercise it, one with no proof, a manual proof not recorded, and a design lens that was not read',
      test: () => {
        const doctor = [{ result: 'fail' }, { exercises: false }, { proofKind: 'none', proof: '' }, { proofKind: 'manual', result: 'pass' }]
        const rows = clean.rows.map((r, i) => ({ ...r, ...(doctor[i] ?? {}) }))
        const design = { ...clean.design, lenses: clean.design.lenses.map((l, i) => (i === 0 ? { ...l, status: 'died' } : l)) }
        const problems = lib.prBodyProblems({ ...clean, rows, design }).join(' | ')
        const wanted = [
          /alpha \/ Two plus two: its result is fail, not pass/,
          /alpha \/ Zero plus zero: its proof does not exercise it/,
          /alpha \/ Clear empties the display has no proof/,
          /beta \/ The page is served: its result is pass, not recorded/,
          /the design lens lens-1 is died, not read or kept/,
        ]
        const missed = wanted.filter((w) => !w.test(problems))
        if (missed.length) return `no problem matched ${missed.join(', ')}: ${problems}`
        return lib.prBodyProblems(clean).length ? `the clean result was refused: ${lib.prBodyProblems(clean).join(' | ')}` : null
      },
    },
  ]
  const results = []
  try {
    for (const c of cases) {
      let detail
      try {
        detail = c.test()
      } catch (error) {
        detail = `threw: ${error.stack ?? error.message}`
      }
      results.push({ file: c.file, name: c.name, control: Boolean(c.control), ok: detail === null, detail: detail ?? 'holds' })
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  return results
}

/* ---------------------------------------------------------------- the unheld-file refusal ----- */

/**
 * `unheld` run on a workflows directory built under the temporary directory: a control holding only
 * the suites' files, which must report nothing, then the same with a script no suite runs and a file
 * that is not a script, which must report the script alone, by its reason.
 */
function unheldResults(suites) {
  const root = mkdtempSync(join(tmpdir(), 'workflows-unheld-'))
  try {
    mkdirSync(join(root, WORKFLOWS), { recursive: true })
    for (const s of suites) writeFileSync(join(root, s.file), '')
    const control = unheld(root, suites)
    writeFileSync(join(root, WORKFLOWS, 'extra.js'), '')
    writeFileSync(join(root, WORKFLOWS, 'notes.md'), '')
    const doctored = unheld(root, suites)
    const refusedForItsReason = doctored.length === 1 && /^\.claude\/workflows\/extra\.js has no suite in /.test(doctored[0])
    return [
      {
        file: WORKFLOWS,
        name: "control: a workflows directory holding only the suites' scripts has nothing unheld",
        control: true,
        ok: control.length === 0,
        detail: control.length ? control.join(' | ') : 'holds',
      },
      {
        file: WORKFLOWS,
        name: 'a script no suite runs is refused, by its reason, and a file that is not a script is not',
        control: false,
        ok: refusedForItsReason,
        detail: refusedForItsReason ? 'holds' : `reported ${JSON.stringify(doctored)}`,
      },
    ]
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/* -------------------------------------------------------------- the tool-less agents' tools ----- */

/** The `tools:` line of an agent file's frontmatter, or null when it names none, which grants every tool. */
function toolsOf(text) {
  const front = /^---\n([\s\S]*?)\n---/.exec(text.replace(/\r\n?/g, '\n'))
  const line = front && /^tools:[ \t]*(.*)$/m.exec(front[1])
  return line ? line[1].trim() : null
}

/** Why the agent file `file` under `root` grants other tools than `AGENT_TOOLS` gives it, or null. */
function toolsProblem(root, file) {
  let text
  try {
    text = readFileSync(join(root, file), 'utf8')
  } catch (error) {
    return `${file} could not be read: ${error.message}`
  }
  const tools = toolsOf(text)
  return tools === AGENT_TOOLS[file]
    ? null
    : `${file} gives its agent the tools ${tools ?? 'it names none of, which is every tool'}, where it may have ${AGENT_TOOLS[file]} alone`
}

/**
 * For each such agent, the tools line held on the tracked file, which must pass, and on a copy under
 * the temporary directory that adds Bash, which must be refused by its reason.
 */
function toolsResults() {
  const root = mkdtempSync(join(tmpdir(), 'workflows-tools-'))
  try {
    mkdirSync(join(root, '.claude/agents'), { recursive: true })
    return TOOLLESS_AGENTS.flatMap((file) => {
      const control = toolsProblem(ROOT, file)
      const live = control ? '' : readFileSync(join(ROOT, file), 'utf8')
      writeFileSync(join(root, file), live.replace(/^tools:.*$/m, `tools: ${AGENT_TOOLS[file]}, Bash`))
      const doctored = toolsProblem(root, file)
      const refused = (doctored ?? '').endsWith(`gives its agent the tools ${AGENT_TOOLS[file]}, Bash, where it may have ${AGENT_TOOLS[file]} alone`)
      return [
        { file, name: `control: the tracked agent's tools are ${AGENT_TOOLS[file]} alone`, control: true, ok: control === null, detail: control ?? 'holds' },
        { file, name: 'the agent given Bash beside them is refused, by its reason', control: false, ok: refused, detail: refused ? 'holds' : `reported ${JSON.stringify(doctored)}` },
      ]
    })
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/* --------------------------------------------------------------------- the stored cases' bank ----- */

/** Every stored case under `root`'s bank, each with its file, or why the bank cannot be read. */
function readBank(root) {
  let names
  try {
    names = readdirSync(join(root, CASES_DIR)).filter((n) => n.endsWith('.json')).sort()
  } catch (error) {
    return { problem: `${CASES_DIR} could not be listed: ${error.message}` }
  }
  const cases = []
  for (const name of names) {
    let c
    try {
      c = JSON.parse(readFileSync(join(root, CASES_DIR, name), 'utf8'))
    } catch (error) {
      return { problem: `${CASES_DIR}/${name} is not JSON: ${error.message}` }
    }
    if (c?.id !== name.replace(/\.json$/, '')) return { problem: `${CASES_DIR}/${name} holds the case ${JSON.stringify(c?.id)}, not the one its name gives` }
    cases.push(c)
  }
  return { cases }
}

/** Why the bank under `root` is not one both workflows accept, or null: the authoring workflow validates it, and the review answers every case. */
async function bankProblem(root, authorBody, reviewBody, policy) {
  const bank = readBank(root)
  if (bank.problem) return bank.problem
  if (!bank.cases.length) return null
  const authored = await run(authorBody, { policy: promptPolicy(policy), cases: bank.cases }, authorAnswer({ cases: bank.cases }))
  if (authored.problems.length) return authored.problems.join(' | ')
  if (authored.result.stopped !== 'done') return `the authoring workflow ${authored.result.stopped} the bank: ${authored.result.why}`
  if (authored.result.validated.length !== bank.cases.length) return `the authoring workflow validated ${authored.result.validated.length} of the bank's ${bank.cases.length} case(s)`
  const files = [...new Set(bank.cases.map((c) => c.prompt))]
  const groups = files.map((file, i) => ({ id: `bank-${i + 1}`, files: [file], findings: [reviewFinding(policy, file, 'bank', [RUN_A])] }))
  const args = { policy: promptPolicy(policy), groups, cases: bank.cases }
  const reviewed = await run(reviewBody, args, reviewAnswer(args, Object.fromEntries(groups.map((g) => [g.id, (group) => changed(group)]))))
  if (reviewed.problems.length) return reviewed.problems.join(' | ')
  if (reviewed.result.stopped !== 'done') return `the review ${reviewed.result.stopped} the bank: ${reviewed.result.why}`
  const held = reviewed.result.cases.filter((r) => r.outcome === 'held').length
  return held === bank.cases.length ? null : `the review held ${held} of the bank's ${bank.cases.length} case(s)`
}

/**
 * The tracked bank, which both workflows must accept, and a copy under the temporary directory with
 * one case's expected answer made none of its options, which must be refused by that reason.
 */
async function bankResults(authorBody, reviewBody, policy) {
  const bank = readBank(ROOT)
  const control = await bankProblem(ROOT, authorBody, reviewBody, policy)
  const root = mkdtempSync(join(tmpdir(), 'workflows-bank-'))
  try {
    mkdirSync(join(root, CASES_DIR), { recursive: true })
    const first = bank.cases?.[0] ?? storedCase(policy, BEAD, 'bead-stages-first')
    writeFileSync(join(root, CASES_DIR, `${first.id}.json`), JSON.stringify({ ...first, expected: 'z' }))
    const doctored = await bankProblem(root, authorBody, reviewBody, policy)
    const refused = /^the authoring workflow refused the bank: args\.cases\[0\] is not a case as .* gives one: its expected answer "z" is none of its options$/.test(doctored ?? '')
    return [
      { file: CASES_DIR, name: `control: every stored case (${bank.cases?.length ?? 0}) is one the authoring workflow validates and the review answers, its file named for its id`, control: true, ok: control === null, detail: control ?? 'holds' },
      { file: CASES_DIR, name: 'a stored case whose expected answer is none of its options is refused, by its reason', control: false, ok: refused, detail: refused ? 'holds' : `reported ${JSON.stringify(doctored)}` },
    ]
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

/**
 * The answer prompt each workflow builds for one case and one text, at every repetition: the two
 * must be one, so a case is answered alike when it is validated and when it is judged. The doctored
 * run changes one word of the review's copy, which must be seen.
 */
async function parityResults(authorBody, reviewBody, policy) {
  const reps = policy.promptReviewCaseRepetitions
  const c = storedCase(policy, BEAD, 'bead-parity')
  /** A prompt with the path of the text it is sent to masked, since each workflow's reader writes the text under its own ref. */
  const masked = (prompt) => prompt.split(TEXTS_ROOT).map((part, i) => (i ? part.replace(/^[^`]*/, '') : part)).join('<the text>')
  const authorPrompts = async () => {
    const out = await run(authorBody, { policy: promptPolicy(policy), cases: [c] }, authorAnswer({ cases: [c] }))
    return out.options.filter((o) => o.label.startsWith('answer ')).map((o) => masked(o.prompt))
  }
  const reviewPrompts = async (body) => {
    const args = reviewArgs(policy, undefined, { cases: [c] })
    const out = await run(body, args, reviewAnswer(args))
    const of = (side) => out.options.filter((o) => o.label.startsWith('answer ') && o.label.includes(` ${side} `)).map((o) => masked(o.prompt))
    return [of('old'), of('new')]
  }
  const one = (a, [olds, news]) => a.length === reps && a.every((p, i) => p === olds[i] && p === news[i])
  const authored = await authorPrompts()
  const control = one(authored, await reviewPrompts(reviewBody))
  const doctored = one(authored, await reviewPrompts(reviewBody.replace('the version under test', 'the version being tested')))
  return [
    { file: AUTHOR, name: `control: the authoring and review workflows give one case and text one answer prompt at each of ${reps} repetition(s)`, control: true, ok: control, detail: control ? 'holds' : 'the two answer prompts differ' },
    { file: AUTHOR, name: "a word changed in the review's answer prompt is seen", control: false, ok: !doctored, detail: !doctored ? 'holds' : 'the changed prompt still matched' },
  ]
}

/* -------------------------------------------------------------------------- the case readers ----- */

/**
 * Why a reader's command is not one plain run of the reader script, or null. Claude Code refuses a
 * session isolated in a worktree a command that names git in a form it cannot verify stays inside
 * that worktree, and each workflow's reader runs in the review's worktree (asdlc-openspec-jtrt).
 */
function plainProblem(command) {
  if (/\bgit\b/.test(command)) return `the reader's command names git: ${command.slice(0, 160)}`
  const [node, script, ...rest] = command.split(' ')
  if (node !== 'node' || script !== READER || !rest.length || rest.some((t) => !/^[A-Za-z0-9._/:-]+$/.test(t))) return `the reader's command is not one plain run of ${READER}: ${command.slice(0, 160)}`
  return null
}

/**
 * A repository under `dir` holding bead's and open-pr's prompts at four commits: `before`, which has
 * no bead; `seed`, a run's commit; `trunk`, which `origin/main` names; and `head`, a branch's. Each
 * text is `textAt(<label>, <file>)`. Git runs with no `GIT_*` key and no configuration of this
 * machine's, so a hook's `GIT_DIR` cannot point it at this repository.
 */
function readerRepo(dir) {
  const git = gitIn(dir, SCRATCH_GIT_ENV)
  git(['init', '-q', '-b', 'main'])
  const commit = (label, files) => {
    for (const file of files) {
      mkdirSync(dirname(join(dir, file)), { recursive: true })
      writeFileSync(join(dir, file), textAt(label, file))
    }
    git(['add', '-A'])
    git(['-c', 'user.name=workflows selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', label])
    return git(['rev-parse', 'HEAD']).trim()
  }
  const before = commit('before', [OPEN_PR])
  const seed = commit('seed', [BEAD, OPEN_PR])
  const trunk = commit('trunk', [BEAD, OPEN_PR])
  git(['update-ref', 'refs/remotes/origin/main', trunk])
  return { before, seed, trunk, head: commit('head', [BEAD, OPEN_PR]) }
}

/**
 * A reader agent that runs the command its prompt gives, as a session would, in `dir`, and returns
 * what it printed. Only the program is made absolute: `node` as this process's, and the reader
 * script as this checkout's, which the fixture does not hold.
 */
const realReader = (dir) => (prompt) => {
  const command = commandOf(prompt).replace(/^node /, `'${process.execPath}' `).replace(` ${READER} `, ` '${resolve(ROOT, READER)}' `)
  const ran = spawnSync('/bin/sh', ['-c', command], { cwd: dir, env: gitEnv(), encoding: 'utf8' })
  return { output: `${ran.stdout ?? ''}${ran.stderr ?? ''}`.trim() }
}

/** The text of the file a prompt sends its agent to read, or null. */
function sentTo(prompt) {
  const path = /from `([^`]+)`/.exec(prompt)?.[1]
  try {
    return path ? readFileSync(path, 'utf8') : null
  } catch {
    return null
  }
}

/**
 * Each workflow with its reader answered by running the command it was given, in a fixture
 * repository: the readers' output reaching the workflows is what the real command printed, where
 * every other case's is a stub's. The control must accept both and send each author and answer to the
 * file holding the text git holds at its ref; then the command must be a plain one, and a text git
 * cannot show, a head with no merge base, and an argument that climbs out of the script's root, given
 * to the script directly, must each be refused by its reason.
 */
async function readerResults(authorBody, reviewBody, policy) {
  const dir = mkdtempSync(join(tmpdir(), 'workflows-reader-'))
  try {
    const commits = readerRepo(dir)
    // First, while nothing has written under the fixture's `.scratch/`: a good argument, then one that climbs.
    const climbed = spawnSync(process.execPath, [resolve(ROOT, READER), `${commits.trunk}:${BEAD}`,`${commits.trunk}:../${BEAD}`], { cwd: dir, env: gitEnv(), encoding: 'utf8' })
    const climbProblem = (() => {
      if (climbed.status !== 2 || !/the file "\.\.\/\.claude\/skills\/bead\/SKILL\.md" has an empty, `\.` or `\.\.` segment/.test(climbed.stderr)) return `exited ${climbed.status}: ${(climbed.stdout + climbed.stderr).trim().slice(0, 200)}`
      return readdirSync(dir).includes('.scratch') ? 'it wrote a text before refusing' : null
    })()
    const reader = realReader(dir)
    const authorRun = (commit) => {
      const a = authorArgs(policy, { seeds: [{ ...SEED_RUN, source: { ...SEED_RUN.source, commit } }, SEED_SECTION] })
      return run(authorBody, a, authorAnswer(a, { reader }))
    }
    const reviewRun = (head) => {
      const a = reviewArgs(policy, undefined, { cases: [storedCase(policy, BEAD, 'bead-stages-first')] })
      return run(reviewBody, a, reviewAnswer(a, { bead: (g) => changed(g, { head }) }, undefined, undefined, reader))
    }
    const labelled = (out, pattern) => out.options.filter((o) => pattern.test(o.label))

    const authored = await authorRun(commits.seed)
    const reviewed = await reviewRun(commits.head)
    const control = (() => {
      for (const [name, out] of [['the authoring workflow', authored], ['the review', reviewed]]) if (out.problems.length) return `${name}: ${out.problems.join(' | ')}`
      const a = authored.result
      if (a.stopped !== 'done' || a.counts.dropped || a.counts.validated !== 1) return `the authoring workflow stopped ${a.stopped}: ${a.why}`
      const c = reviewed.result.cases?.[0]
      if (reviewed.result.stopped !== 'done' || c?.outcome !== 'held') return `the review's case came back ${JSON.stringify(c)}: ${reviewed.result.why}`
      const sends = [
        ["the run seed's authors", labelled(authored, new RegExp(`^author \\S+ ${escape(SEED_RUN.key)}$`)), textAt('seed', BEAD)],
        ["the section seed's authors", labelled(authored, new RegExp(`^author \\S+ ${escape(SEED_SECTION.key)}$`)), textAt('trunk', OPEN_PR)],
        ["the case's answers", labelled(authored, /^answer /), textAt('trunk', BEAD)],
        ["the review's old answers", labelled(reviewed, /^answer \S+ old bead: /), textAt('trunk', BEAD)],
        ["the review's new answers", labelled(reviewed, /^answer \S+ new bead: /), textAt('head', BEAD)],
      ]
      const none = sends.find(([, agents]) => !agents.length)
      if (none) return `none of ${none[0]} ran`
      for (const [, agents, text] of sends) {
        const wrong = agents.find((o) => sentTo(o.prompt) !== text)
        if (wrong) return `${wrong.label} was sent to ${JSON.stringify(sentTo(wrong.prompt))}, not ${JSON.stringify(text)}`
      }
      return null
    })()

    const commands = [...labelled(authored, /^read$/), ...labelled(reviewed, /^read \S+$/)].map((o) => commandOf(o.prompt))
    const plain = commands.length === 2 ? (commands.map(plainProblem).find(Boolean) ?? null) : `${commands.length} reader(s) ran, not 2`

    const absent = await authorRun(commits.before)
    const absentProblem = (() => {
      if (absent.problems.length) return absent.problems.join(' | ')
      const c = absent.result.candidates?.find((x) => x.key === SEED_RUN.key)
      if (c?.problem !== `git could not show ${BEAD} at ${commits.before}`) return `the seed's candidate came back ${JSON.stringify(c)}`
      return labelled(absent, new RegExp(`^author \\S+ ${escape(SEED_RUN.key)}$`)).length ? 'an author ran on a text git could not show' : null
    })()

    const orphan = await reviewRun('f'.repeat(40))
    const orphanProblem = (() => {
      if (orphan.problems.length) return orphan.problems.join(' | ')
      const c = orphan.result.cases?.[0]
      if (c?.outcome !== 'unanswered' || !/^the reader's output is not the JSON its command prints/.test(c.why ?? '')) return `the case came back ${JSON.stringify(c)}`
      return labelled(orphan, /^answer /).length ? 'an answer ran with no text read' : null
    })()

    return [
      { file: READER, name: 'control: run in a fixture repository, the command each workflow gives its reader writes texts both workflows accept, and each author and answer is sent to the file holding the text git holds at its ref', control: true, ok: control === null, detail: control ?? 'holds' },
      { file: READER, name: "each workflow gives its reader one plain run of the reader script, naming no git, so Claude Code does not refuse it to a session isolated in a worktree (asdlc-openspec-jtrt)", control: false, ok: plain === null, detail: plain ?? 'holds' },
      { file: READER, name: 'a seed whose prompt git cannot show at its commit gets no path, so no author, by that reason', control: false, ok: absentProblem === null, detail: absentProblem ?? 'holds' },
      { file: READER, name: "a head with no merge base with origin/main leaves the review's cases unanswered: the reader prints no JSON, and no answer runs", control: false, ok: orphanProblem === null, detail: orphanProblem ?? 'holds' },
      { file: READER, name: 'the script refuses a file with a `..` segment, by that reason, before it writes any text', control: false, ok: climbProblem === null, detail: climbProblem ?? 'holds' },
    ]
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* ------------------------------------------------------------------------------- selftest ----- */

/** Why a case's outcome is wrong, or null. */
function judge(c, outcome) {
  if (outcome.problems.length) return outcome.problems.join(' | ')
  if (!outcome.result) return 'the workflow returned nothing'
  if (c.expect && outcome.result.stopped !== c.expect[0]) return `stopped ${outcome.result.stopped} (${outcome.result.why}), not ${c.expect[0]}`
  if (c.expect && !c.expect[1].test(outcome.result.why)) return `stopped ${c.expect[0]}, but not for that reason: ${outcome.result.why}`
  return c.check(outcome)
}

async function main() {
  const suites = [{ file: BUILD }, { file: REVIEW }, { file: VERIFY }, { file: AUTHOR }]
  const staticProblems = unheld(ROOT, suites)
  for (const s of suites) {
    Object.assign(s, readWorkflow(ROOT, s.file))
    staticProblems.push(...s.problems)
  }
  let policy
  try {
    policy = readPolicy(ROOT)
  } catch (error) {
    staticProblems.push(`${POLICY_DIR}/ could not be read: ${error.message}`)
  }
  const missing = policy ? [...POLICY_KEYS, ...REVIEW_POLICY_KEYS, ...VERIFY_POLICY_KEYS].filter((k) => policy[k] === undefined) : []
  if (missing.length) staticProblems.push(`${POLICY_DIR}/ has no ${missing.join(', ')}`)
  if (staticProblems.length || suites.some((s) => !s.body)) {
    console.error(`workflows selftest: a workflow or the policy cannot be run.\n`)
    for (const problem of staticProblems) console.error(`  - ${problem}\n`)
    process.exit(1)
  }
  suites[0].cases = buildCases(policy).map((c) => ({ ...c, answer: scenario(policy, c.scenario), twinAnswer: c.twin && scenario(policy, c.twin) }))
  suites[1].cases = reviewCases(policy).map((c) => ({ ...c, answer: reviewAnswer(c.args, c.reports, c.verdict, c.answers, c.reader) }))
  suites[2].cases = verifyCases(policy).map((c) => ({ ...c, answer: verifyAnswer(c.args, c.scenario) }))
  suites[3].cases = authorCases(policy).map((c) => ({ ...c, answer: authorAnswer(c.args, c.stubs) }))

  const results = unheldResults(suites)
  if (!results[0].ok) {
    console.error(`workflows selftest: the unheld-file check fails on a clean directory, so its refusal cannot be trusted: ${results[0].detail}`)
    process.exit(1)
  }
  const tools = toolsResults()
  const untrusted = tools.find((t) => t.control && !t.ok)
  if (untrusted) {
    console.error(`workflows selftest: the tools line of ${untrusted.file} fails on the tracked agent file, so its refusal cannot be trusted: ${untrusted.detail}`)
    process.exit(1)
  }
  results.push(...tools)
  for (const s of suites) {
    for (const c of s.cases) {
      const outcome = await run(s.body, c.args, c.answer)
      if (c.twinAnswer) outcome.twin = await run(s.body, c.args, c.twinAnswer)
      const detail = judge(c, outcome)
      results.push({ file: s.file, name: c.name, control: Boolean(c.control), ok: detail === null, detail: detail ?? 'holds' })
      if (c.control && detail !== null) {
        console.error(`workflows selftest: a clean run of ${s.file} does not pass, so none of its cases can be trusted: ${c.name}: ${detail}`)
        process.exit(1)
      }
    }
  }
  const rendered = await rendererResults(suites[2].body, policy)
  if (!rendered[0].ok) {
    console.error(`workflows selftest: the trace renderers fail on a clean result, so none of their cases can be trusted: ${rendered[0].detail}`)
    process.exit(1)
  }
  results.push(...rendered)
  const clauses = await clauseResults(suites[2].body, policy)
  if (!clauses[0].ok) {
    console.error(`workflows selftest: a clean clause run of ${VERIFY} does not pass, so none of its cases can be trusted: ${clauses[0].detail}`)
    process.exit(1)
  }
  results.push(...clauses)
  for (const extra of [await bankResults(suites[3].body, suites[1].body, policy), await parityResults(suites[3].body, suites[1].body, policy), await readerResults(suites[3].body, suites[1].body, policy)]) {
    if (!extra[0].ok) {
      console.error(`workflows selftest: ${extra[0].name} fails, so its refusal cannot be trusted: ${extra[0].detail}`)
      process.exit(1)
    }
    results.push(...extra)
  }

  const failed = results.filter((r) => !r.ok)
  for (const { file, name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${file.split('/').pop()}: ${name} -- ${detail}`)
  const renderers = [...new Set(rendered.map((r) => r.file))]
  const tally = [...suites.map((s) => s.file), ...renderers, ...TOOLLESS_AGENTS, CASES_DIR, READER, WORKFLOWS].map((file) => {
    const mine = results.filter((r) => r.file === file)
    const controls = mine.filter((r) => r.control).length
    return `${file === WORKFLOWS ? 'the unheld-file check' : file}: ${controls} control(s) and ${mine.length - controls} scenario(s)`
  })
  console.log(`workflows selftest: ${results.length - failed.length}/${results.length} cases hold (${tally.join('; ')}).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

await main()
