/**
 * Workflow selftest: runs each workflow script under `.claude/workflows/` against stubbed agents and
 * asserts how it stops and what it returns. `build-change-task.js` runs with the review sizes
 * `tools/policy.json` holds, and its cases assert how many skeptics it sends; `review-prompts.js` runs
 * with groups of findings built here and the policy's `promptReview*` keys, and its cases assert
 * which findings it refuses as below the threshold, how many skeptics it sends each change and each
 * consolidation, which reports it refuses, which branches it lets the session merge, which analyses
 * it lets the session mark read and which findings it holds. It holds every script to what the Workflow runtime accepts: a pure `meta`
 * literal first, every phase declared there, and no clock or randomness. A script under
 * `.claude/workflows/` with no suite here is refused, so a workflow cannot land unheld.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: `build-change-task.js` is tracked for the first
 * time in the change that adds this file (asdlc-openspec-d6b), and `review-prompts.js` in the change
 * that adds its suite (asdlc-openspec-lzr). Were this wrong, it would let through the logic a real run
 * cannot show cheaply. For the build: a third review round, an unverified vote counted as refuted, a
 * spec contradiction halting before skeptics confirmed it, a coverage gap sent to skeptics, a listener
 * left on 127.0.0.1 and not reported, or a policy key renamed so that every run refuses. For the
 * prompt review: a branch merged that changed another group's file, failed its gates, was never
 * provisioned by the WorktreeCreate hook, or carried an edit a majority of its skeptics did not
 * uphold; a finding below the threshold passed to an agent; an analysis marked read whose file's
 * agent returned nothing; or a finding read and not proposed that is not returned to be held (since
 * asdlc-openspec-pnm); or a consolidation merged whose rows do not say where each removed rule went,
 * or that a majority of its skeptics did not uphold (since asdlc-openspec-aa0). Each costs millions
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
 * NEEDS only committed files: the workflows and `tools/policy.json`. It writes only under the
 * temporary directory. No agent, no network. Milliseconds.
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.WORKFLOWS_ROOT ?? REPO_ROOT

const WORKFLOWS = '.claude/workflows'
const BUILD = `${WORKFLOWS}/build-change-task.js`
const REVIEW = `${WORKFLOWS}/review-prompts.js`
const POLICY = 'tools/policy.json'
const POLICY_KEYS = ['buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'assetLabels']
const REVIEW_POLICY_KEYS = ['promptReviewRecurrenceCount', 'promptReviewMajorSeverities', 'promptReviewSkeptics']
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

const args = (kind, extra = {}) => ({
  task: { id: 'example-1', title: 'An example task', body: 'Build the example.' },
  change: 'example-change',
  worktree: WORKTREE,
  branch: BRANCH,
  kind,
  ...extra,
})

const work = (extra = {}) => ({ summary: 'done', filesChanged: ['apps/example.js'], proofs: [PASSING], decisions: [], findings: [], ...extra })

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
    if (label === 'build') return s.build === undefined ? work() : s.build
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
      scenario: { build: work({ proofs: [{ command: 'npm run example:test', passed: false, output: '1 failing' }] }) },
      expect: ['proof-failing', /^the build's proof\(s\) npm run example:test did not pass/],
      check: ({ calls }) => (count(calls, /^review /) ? 'a reviewer ran after a failing proof' : calls.at(-1) === 'sweep' ? null : 'the sweep did not run'),
    },
    {
      name: "a builder's confirmed spec contradiction stops the run before any reviewer",
      args: args(widest),
      scenario: { build: work({ findings: [finding('The spec leaves rounding undecided', { kind: 'spec-contradiction' })] }) },
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
  const suites = [{ file: BUILD }, { file: REVIEW }]
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
  const missing = policy ? [...POLICY_KEYS, ...REVIEW_POLICY_KEYS].filter((k) => policy[k] === undefined) : []
  if (missing.length) staticProblems.push(`${POLICY} has no ${missing.join(', ')}`)
  if (staticProblems.length || suites.some((s) => !s.body)) {
    console.error(`workflows selftest: a workflow or the policy cannot be run.\n`)
    for (const problem of staticProblems) console.error(`  - ${problem}\n`)
    process.exit(1)
  }
  suites[0].cases = buildCases(policy).map((c) => ({ ...c, answer: scenario(policy, c.scenario) }))
  suites[1].cases = reviewCases(policy).map((c) => ({ ...c, answer: reviewAnswer(c.args, c.reports, c.verdict) }))

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

  const failed = results.filter((r) => !r.ok)
  for (const { file, name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${file.split('/').pop()}: ${name} -- ${detail}`)
  const tally = [...suites.map((s) => s.file), WORKFLOWS].map((file) => {
    const mine = results.filter((r) => r.file === file)
    const controls = mine.filter((r) => r.control).length
    return `${file === WORKFLOWS ? 'the unheld-file check' : file}: ${controls} control(s) and ${mine.length - controls} scenario(s)`
  })
  console.log(`workflows selftest: ${results.length - failed.length}/${results.length} cases hold (${tally.join('; ')}).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

await main()
