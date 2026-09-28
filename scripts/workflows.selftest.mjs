/**
 * Workflow selftest: runs each workflow script under `.claude/workflows/` against stubbed agents and
 * asserts how it stops and what it returns. `build-change-task.js` runs with the review sizes and the
 * red-first kinds `tools/policy.json` holds, and its cases assert how many skeptics it sends and which
 * kinds it stops as not-red when a named scenario has neither a red record nor an already-green
 * report; `review-prompts.js` runs
 * with groups of findings built here and the policy's `promptReview*` keys, and its cases assert
 * which findings it refuses as below the threshold, how many skeptics it sends each change and each
 * consolidation, which reports it refuses, which branches it lets the session merge, which analyses
 * it lets the session mark read and which findings it holds. `verify-change-trace.js` runs with a
 * two-capability change built here and the policy's `verifyTrace*` keys, and its cases assert which
 * inputs it refuses, how it matches each tracer's rows to its scenarios, which gap it gives each
 * row, how many skeptics it sends each gap, how it tallies them, and what a run again keeps. Its
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
 * report counted as passed (since asdlc-openspec-fye). For the
 * prompt review: a branch merged that changed another group's file, failed its gates, was never
 * provisioned by the WorktreeCreate hook, or carried an edit a majority of its skeptics did not
 * uphold; a finding below the threshold passed to an agent; an analysis marked read whose file's
 * agent returned nothing; or a finding read and not proposed that is not returned to be held (since
 * asdlc-openspec-pnm); or a consolidation merged whose rows do not say where each removed rule went,
 * or that a majority of its skeptics did not uphold (since asdlc-openspec-aa0). For the trace (since
 * asdlc-openspec-as9): a scenario left out of every group, a group a tracer returned short or read at
 * another commit counted as traced, a row's gap taken from the tracer's words rather than its
 * reading, a gap nobody could verify counted refuted, a failed proof cleared by a skeptic's vote, a
 * dead lens's reading kept on a run again, and a trace or a pull-request body written with a
 * scenario missing, a gap open or a row that did not pass. Each costs millions
 * of tokens, a wrong verdict, a rule lost from a prompt or a finding never reviewed,
 * before anyone sees it, and no other gate reads their logic: `check:prompts` counts only the words
 * of their string literals, and `openspec:check` reads only skills and agents.
 *
 * INVOCATION.
 *
 *   npm run workflows:selftest    every case, against the tracked workflow and policy
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
 * NEEDS only committed files: the workflows, `tools/policy.json`, and the trace renderers with
 * `scripts/lib/trace.mjs`; each renderer runs twice as a child process. It writes only under the
 * temporary directory. No agent, no network. 0.35-0.39 s wall through `node --run` (`/usr/bin/time -p`,
 * two runs, while other worktrees ran, with the change-build suite's red-first cases) on a macOS 26.7
 * laptop with Node 26.8.1, 2026-09-28, much of it those four child processes.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.WORKFLOWS_ROOT ?? REPO_ROOT

const WORKFLOWS = '.claude/workflows'
const BUILD = `${WORKFLOWS}/build-change-task.js`
const REVIEW = `${WORKFLOWS}/review-prompts.js`
const VERIFY = `${WORKFLOWS}/verify-change-trace.js`
const POLICY = 'tools/policy.json'
const POLICY_KEYS = ['buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'buildRedFirstKinds', 'assetLabels']
const REVIEW_POLICY_KEYS = ['promptReviewRecurrenceCount', 'promptReviewMajorSeverities', 'promptReviewSkeptics']
const VERIFY_POLICY_KEYS = ['verifyTraceMaxScenarios', 'verifyTraceDesignLenses', 'verifyTraceSkeptics']
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
    options.push({ label, prompt, isolation: opts.isolation })
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
const SCENARIO = 'example: The display shows 1'
const SECOND = 'example: The display clears'
const FAILURE = 'expected 1, got 0'
const EVIDENCE = 'The proof passed before any change: the display already showed 1.'

const args = (kind, extra = {}) => ({
  task: { id: 'example-1', title: 'An example task', body: 'Build the example.' },
  scenarios: [SCENARIO],
  change: 'example-change',
  worktree: WORKTREE,
  branch: BRANCH,
  kind,
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
      return { policyJson, toplevel: s.toplevel ?? WORKTREE, branch: s.branch ?? BRANCH, listeners: BASELINE }
    }
    if (label === 'build') return s.build === undefined ? built() : s.build
    if (label === 'sweep') return s.sweep === undefined ? { listeners: BASELINE } : s.sweep
    let m = /^review (\S+) r(\d+)$/.exec(label)
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
      check: ({ result, calls }) => {
        const reviews = calls.filter((l) => l.startsWith('review '))
        const want = policy.buildReviewLenses[kind].map((l) => `review ${l} r1`)
        if (reviews.join() !== want.join()) return `reviewed with ${reviews.join(', ')}, not ${want.join(', ')}`
        if (calls[0] !== 'setup' || calls.at(-1) !== 'sweep') return `the calls ran ${calls.join(', ')}`
        if (count(calls, /^skeptic /)) return 'sent a skeptic with nothing to confirm'
        if (result.fixUnreviewed) return 'reported an unreviewed fix with no fix'
        if (!result.listeners.checked || result.listeners.leftBehind.length) return 'did not report a clean sweep'
        if (result.rounds.length !== 2 || result.rounds[1].raised !== 0) return `counted rounds ${JSON.stringify(result.rounds)}`
        return null
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
      expect: ['refused', /^tools\/policy\.json has no `buildReviewMaxRounds`/],
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
  if (!redFirst.length) list.push(unexercised('not-red: a task of a red-first kind with neither record for a named scenario', 'tools/policy.json `buildRedFirstKinds` lists no kind'))
  for (const kind of others) {
    list.push({
      name: `a task of kind ${kind} whose builder returns neither record for a named scenario is not held to one, and runs on to review`,
      args: args(kind),
      scenario: { build: built({ red: [] }) },
      expect: ['nothing-major', /^round 1 confirmed no /],
      check: reviewedWith(kind),
    })
  }
  if (!others.length) list.push(unexercised('a task of a kind not held to the red run', 'tools/policy.json `buildRedFirstKinds` lists every kind'))

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
      expect: ['refused', /^tools\/policy\.json `buildRedFirstKinds` must be a list of `assetLabels` keys/],
      check: ({ calls }) => (calls.join() === 'setup' ? null : `ran ${calls.join(', ')}`),
    },
  )
  return list
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

/** One finding on `file` shown by `runs`, at a counted severity and the count the threshold asks, unless `extra` says otherwise. */
const reviewFinding = (policy, file, name, runs, extra = {}) => ({
  key: `${file}#${name}`,
  title: `The ${name} finding`,
  severity: countedSeverity(policy) ?? severitiesOf(policy).at(-1),
  count: Math.max(policy.promptReviewRecurrenceCount, runs.length),
  runs,
  evidence: `The runs ${runs.join(', ')} showed it.`,
  ...extra,
})

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

const gateRun = (passed) => ({ command: 'npm run check:prompts', passed, output: passed ? 'ok' : '1 problem' })

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

/**
 * Answers each `review <id>` agent: `reports[id]` is a function of the group, or null for an agent
 * that returns nothing. By default `bead` changes its file and `open-pr` changes nothing. Each
 * `skeptic <i>/<n> <id>: <key>` is answered by `verdict(key, i, n)`, upheld by default.
 */
function reviewAnswer(args, reports = {}, verdict) {
  return (label) => {
    let m = /^review (\S+)$/.exec(label)
    if (m) {
      const group = args.groups.find((g) => g.id === m[1])
      const make = reports[m[1]]
      if (make === null) return null
      return make ? make(group) : m[1] === 'bead' ? changed(group) : unchanged(group)
    }
    m = /^skeptic (\d+)\/(\d+) (\S+): (.+)$/.exec(label)
    if (m) return verdict ? verdict(m[4], Number(m[1]), Number(m[2])) : reviewVote('upheld')
    throw new Error(`no stub answers the label "${label}"`)
  }
}

const statusOf = (result, id) => result.groups.find((g) => g.id === id)?.status
const problemsOf = (result, id) => (result.groups.find((g) => g.id === id)?.problems ?? []).join('; ')
const heldRuns = (result) => result.runsHeld.map((h) => h.run).join()
const heldFinding = (result, key) => result.findingsHeld.find((h) => h.key === key)
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
    refusedBead(
      policy,
      'a change naming a finding its group was not given is not merged',
      (g) => changed(g, { changes: [...g.findings.map(change), { ...change(g.findings[0]), finding: `${BEAD}#never-given` }] }),
      /names the finding\(s\) \.claude\/skills\/bead\/SKILL\.md#never-given, which its group was not given/,
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
  ]
  return list
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
  policy: verifyPolicy(policy),
  ...extra,
})

/** A row that proves `s` by a test that exercises it and passes, unless `extra` says otherwise. */
const traceRow = (s, extra = {}) => ({
  requirement: s.requirement,
  scenario: s.scenario,
  proofKind: 'test',
  proof: `test/example.test.js: ${s.scenario}`,
  exercises: true,
  result: 'pass',
  notes: 'Read the test and ran the file once; it passed.',
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
      name: 'a proof that failed is a measured gap: no skeptic judges it, and it stays a gap however they would vote',
      args: verifyArgs(policy),
      scenario: { ...alphaRow({ result: 'fail', notes: 'It failed: expected 4, got 5.' }), verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 0, 1)],
      check: ({ result, calls }) => {
        if (calls.some((l) => l.startsWith('skeptic '))) return 'a skeptic judged a measured failure'
        const gap = rowOf(result, 'Two plus two').gap
        return gap?.kind === 'fails' && gap.outcome === 'measured' && result.gaps[0].outcome === 'measured' ? null : `the gap came back ${JSON.stringify(gap)}`
      },
    },
    {
      name: "a refuted gap on a proof that failed: the row carries the skeptics' reading, and its failure stays a measured gap",
      args: verifyArgs(policy),
      scenario: { ...alphaRow({ exercises: false, result: 'fail' }), verdict: () => PROVING },
      expect: ['gaps', tallyOf(0, 0, 1, 1)],
      check: ({ result }) => {
        const row = rowOf(result, 'Two plus two')
        if (!row.traced || row.exercises !== true) return "the row does not carry the skeptics' reading"
        return row.gap?.kind === 'fails' && row.gap.outcome === 'measured' ? null : `the row's gap came back ${JSON.stringify(row.gap)}`
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
          }),
          scenario: {
            traces: {
              kinds: (g) =>
                cleanTrace(g, (s) => ({
                  none: { proofKind: 'none', proof: '', result: 'not-run' },
                  unrecorded: { proofKind: 'manual', proof: 'bd show example-9.9', result: 'recorded' },
                  unexercised: { exercises: false },
                  failing: { result: 'fail' },
                  unrun: { result: 'not-run' },
                  'manual-pass': { proofKind: 'manual', proof: `bd show ${RECORDED}`, result: 'pass' },
                  recorded: { proofKind: 'manual', proof: `bd show ${RECORDED}, its note`, result: 'recorded' },
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
          alpha: (g) => ({ ...cleanTrace(g), rows: g.scenarios.map((s) => traceRow({ ...s, scenario: bare(s.scenario) })) }),
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
                  { requirement: 'Adds', scenario: 'Two plus two', proofKind: 'test', proof: 'test/kept.test.js: Two plus two', exercises: true, readAt: OLDEST },
                  { requirement: 'Adds', scenario: 'Zero plus zero', proofKind: 'test', proof: 'test/kept.test.js: Zero plus zero', exercises: true },
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
    lenses >= 1
      ? refused(
          'refused: one key naming a group and a lens',
          verifyArgs(policy, { lenses: [{ key: 'alpha', label: 'Alpha', focus: 'x' }, ...lensesOf(lenses - 1, 2)] }),
          /^the key alpha names two groups or lenses/,
        )
      : unexercised('one key naming a group and a lens', 'the policy gives no design lens'),
  ]
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
  const save = (root, result) => {
    mkdirSync(join(root, '.scratch'), { recursive: true })
    writeFileSync(join(root, '.scratch', `${CHANGE}-trace.json`), JSON.stringify(result))
  }
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
        return pr.startsWith('# Head\n\n## Scenario trace\n') && pr.includes('every one of the 5 scenarios') ? null : `the body reads ${pr.slice(0, 200)}`
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
  const suites = [{ file: BUILD }, { file: REVIEW }, { file: VERIFY }]
  const staticProblems = unheld(ROOT, suites)
  for (const s of suites) {
    Object.assign(s, readWorkflow(ROOT, s.file))
    staticProblems.push(...s.problems)
  }
  let policy
  try {
    policy = JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8'))
  } catch (error) {
    staticProblems.push(`${POLICY} could not be read: ${error.message}`)
  }
  const missing = policy ? [...POLICY_KEYS, ...REVIEW_POLICY_KEYS, ...VERIFY_POLICY_KEYS].filter((k) => policy[k] === undefined) : []
  if (missing.length) staticProblems.push(`${POLICY} has no ${missing.join(', ')}`)
  if (staticProblems.length || suites.some((s) => !s.body)) {
    console.error(`workflows selftest: a workflow or the policy cannot be run.\n`)
    for (const problem of staticProblems) console.error(`  - ${problem}\n`)
    process.exit(1)
  }
  suites[0].cases = buildCases(policy).map((c) => ({ ...c, answer: scenario(policy, c.scenario) }))
  suites[1].cases = reviewCases(policy).map((c) => ({ ...c, answer: reviewAnswer(c.args, c.reports, c.verdict) }))
  suites[2].cases = verifyCases(policy).map((c) => ({ ...c, answer: verifyAnswer(c.args, c.scenario) }))

  const results = unheldResults(suites)
  if (!results[0].ok) {
    console.error(`workflows selftest: the unheld-file check fails on a clean directory, so its refusal cannot be trusted: ${results[0].detail}`)
    process.exit(1)
  }
  for (const s of suites) {
    for (const c of s.cases) {
      const detail = judge(c, await run(s.body, c.args, c.answer))
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

  const failed = results.filter((r) => !r.ok)
  for (const { file, name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${file.split('/').pop()}: ${name} -- ${detail}`)
  const renderers = [...new Set(rendered.map((r) => r.file))]
  const tally = [...suites.map((s) => s.file), ...renderers, WORKFLOWS].map((file) => {
    const mine = results.filter((r) => r.file === file)
    const controls = mine.filter((r) => r.control).length
    return `${file === WORKFLOWS ? 'the unheld-file check' : file}: ${controls} control(s) and ${mine.length - controls} scenario(s)`
  })
  console.log(`workflows selftest: ${results.length - failed.length}/${results.length} cases hold (${tally.join('; ')}).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

await main()
