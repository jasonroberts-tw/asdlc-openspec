/**
 * Workflow selftest: runs each workflow script under `.claude/workflows/` against stubbed agents and
 * asserts how it stops and what it returns. `build-change-task.js` runs with the review sizes
 * `tools/policy.json` holds, and its cases assert how many skeptics it sends; `review-prompts.js` runs
 * with groups of files built here, and its cases assert which branches it lets the session merge and
 * which analyses it lets the session mark read. It holds every script to what the Workflow runtime
 * accepts: a pure `meta` literal first, every phase declared there, and no clock or randomness. A
 * script under `.claude/workflows/` with no suite here is refused, so a workflow cannot land unheld.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: `build-change-task.js` is tracked for the first
 * time in the change that adds this file (asdlc-openspec-d6b), and `review-prompts.js` in the change
 * that adds its suite (asdlc-openspec-lzr). Were this wrong, it would let through the logic a real run
 * cannot show cheaply. For the build: a third review round, an unverified vote counted as refuted, a
 * spec contradiction halting before skeptics confirmed it, a coverage gap sent to skeptics, a listener
 * left on 127.0.0.1 and not reported, or a policy key renamed so that every run refuses. For the
 * prompt review: a branch merged that changed another group's file, failed its gates or was never
 * provisioned by the WorktreeCreate hook, or an analysis marked read whose file's agent returned
 * nothing. Each costs millions of tokens, a wrong verdict or a finding never reviewed, before anyone
 * sees it, and no other gate reads these files: `check:prompts` and `openspec:check` read only skills
 * and agents.
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
 * return it. The build's Setup agent's answer is the real policy, and every number a build case
 * expects is read from it, so no case restates a constant. Each suite has an undoctored control that
 * must pass before any of its other cases is trusted.
 *
 * NEEDS only committed files: the workflows and `tools/policy.json`. No agent, no network. Milliseconds.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.WORKFLOWS_ROOT ?? REPO_ROOT

const WORKFLOWS = '.claude/workflows'
const BUILD = `${WORKFLOWS}/build-change-task.js`
const REVIEW = `${WORKFLOWS}/review-prompts.js`
const POLICY = 'tools/policy.json'
const POLICY_KEYS = ['buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'assetLabels']
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
const RUN_A = 'example-1@2026-09-26T00:00:00Z'
const RUN_B = 'example-2@2026-09-26T01:00:00Z'
const RUN_C = 'example-3@2026-09-26T02:00:00Z'

/** Two groups, `bead` from runs A and B and `open-pr` from runs B and C, so run B is in both. */
const reviewArgs = (groups) => ({
  groups: groups ?? [
    { id: 'bead', files: [BEAD], runs: [RUN_A, RUN_B], evidence: 'Both runs gated before staging a new file.' },
    { id: 'open-pr', files: [OPEN_PR], runs: [RUN_B, RUN_C], evidence: 'Both runs started a second watcher.' },
  ],
})

const gateRun = (passed) => ({ command: 'npm run check:prompts', passed, output: passed ? 'ok' : '1 problem' })

/** A clean report of a change to the group's first file, unless `extra` says otherwise. */
const changed = (group, extra = {}) => ({
  verdict: 'changed',
  branch: `agent/wf_example-${group.id}`,
  head: 'a'.repeat(40),
  filesChanged: [...group.files],
  changes: [{ file: group.files[0], title: `A fix to ${group.id}`, runs: [group.runs[0]], edit: 'One sentence added.', why: 'The runs show the gap.' }],
  notChanged: [],
  earlierReviews: [],
  unverified: [],
  gates: [gateRun(true)],
  ...extra,
})

/** A clean report of no change, unless `extra` says otherwise. */
const unchanged = (group, extra = {}) => ({
  verdict: 'unchanged',
  branch: `agent/wf_example-${group.id}`,
  head: 'b'.repeat(40),
  filesChanged: [],
  changes: [],
  notChanged: [{ title: `Nothing to change in ${group.id}`, runs: [...group.runs], reason: 'The finding does not hold.' }],
  earlierReviews: [{ pr: '#45', change: 'close with the reason passed from a file', outcome: 'working', evidence: 'Both runs closed so.' }],
  unverified: [],
  gates: [],
  ...extra,
})

/**
 * Answers each `review <id>` agent: `reports[id]` is a function of the group, or null for an agent
 * that returns nothing. By default `bead` changes its file and `open-pr` changes nothing.
 */
function reviewAnswer(args, reports = {}) {
  return (label) => {
    const m = /^review (\S+)$/.exec(label)
    if (!m) throw new Error(`no stub answers the label "${label}"`)
    const group = args.groups.find((g) => g.id === m[1])
    const make = reports[m[1]]
    if (make === null) return null
    return make ? make(group) : m[1] === 'bead' ? changed(group) : unchanged(group)
  }
}

const statusOf = (result, id) => result.groups.find((g) => g.id === id)?.status
const problemsOf = (result, id) => (result.groups.find((g) => g.id === id)?.problems ?? []).join('; ')
const heldRuns = (result) => result.runsHeld.map((h) => h.run).join()

/** A case where the `bead` group's report breaks one rule: it is refused for that reason, and only it. */
function refusedBead(name, report, reason) {
  return {
    name,
    args: reviewArgs(),
    reports: { bead: report },
    expect: ['done', /^0 to merge, 1 unchanged, 1 refused, 0 died; 1 of 3 run\(s\) read$/],
    check: ({ result }) => {
      if (statusOf(result, 'bead') !== 'refused') return `bead is ${statusOf(result, 'bead')}, not refused`
      if (!reason.test(problemsOf(result, 'bead'))) return `bead was refused for another reason: ${problemsOf(result, 'bead')}`
      if (result.merge.length) return `merge is ${result.merge.join(', ')}, not empty`
      if (heldRuns(result) !== [RUN_A, RUN_B].join()) return `held ${heldRuns(result)}, not bead's runs`
      return result.runsRead.join() === RUN_C ? null : `read ${result.runsRead.join()}, not ${RUN_C} alone`
    },
  }
}

/* -------------------------------------------------------------- review-prompts.js: cases ----- */

function reviewCases() {
  return [
    {
      name: 'control: one group changes its file and one changes nothing, each agent in a worktree of its own; the one merges and every run is read',
      control: true,
      args: reviewArgs(),
      reports: {},
      expect: ['done', /^1 to merge, 1 unchanged, 0 refused, 0 died; 3 of 3 run\(s\) read$/],
      check: ({ result, options }) => {
        const labels = options.map((o) => o.label)
        if (labels.join() !== 'review bead,review open-pr') return `ran ${labels.join(', ')}`
        if (options.some((o) => o.isolation !== 'worktree')) return 'an agent ran without isolation: worktree'
        const prompt = options[0].prompt
        if (!prompt.includes(BEAD) || !prompt.includes(RUN_A) || !prompt.includes('§ How a file is judged')) {
          return "the bead agent's prompt does not name its file, its runs and the section it reads first"
        }
        if (prompt.includes(OPEN_PR)) return "the bead agent's prompt names another group's file"
        if (result.merge.join() !== 'agent/wf_example-bead') return `merge is ${result.merge.join(', ')}`
        if (statusOf(result, 'bead') !== 'merge' || statusOf(result, 'open-pr') !== 'unchanged') return 'the statuses are not merge and unchanged'
        return result.runsRead.join() === [RUN_A, RUN_B, RUN_C].join() && !result.runsHeld.length ? null : `read ${result.runsRead.join()}, held ${heldRuns(result)}`
      },
    },
    {
      name: 'refused: a file in two groups, before any agent runs',
      args: reviewArgs([
        { id: 'bead', files: [BEAD], runs: [RUN_A], evidence: 'e' },
        { id: 'both', files: [OPEN_PR, `./${BEAD}`], runs: [RUN_B], evidence: 'e' },
      ]),
      expect: ['refused', /^the file \.claude\/skills\/bead\/SKILL\.md is in groups bead and both/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: an absolute path',
      args: reviewArgs([{ id: 'bead', files: ['/etc/hosts'], runs: [RUN_A], evidence: 'e' }]),
      expect: ['refused', /^group bead: the file "\/etc\/hosts" is absolute/],
      check: ({ calls }) => (calls.length ? `ran ${calls.join(', ')} before refusing` : null),
    },
    {
      name: 'refused: a path that climbs out of the repository',
      args: reviewArgs([{ id: 'bead', files: ['.claude/../../outside.md'], runs: [RUN_A], evidence: 'e' }]),
      expect: ['refused', /^group bead: the file ".*" has an empty or `\.\.` segment/],
      check: () => null,
    },
    {
      name: 'refused: no groups',
      args: reviewArgs([]),
      expect: ['refused', /^args\.groups must be a non-empty list/],
      check: () => null,
    },
    {
      name: 'refused: a group with no runs',
      args: reviewArgs([{ id: 'bead', files: [BEAD], runs: [], evidence: 'e' }]),
      expect: ['refused', /^group bead: runs must be a non-empty list/],
      check: () => null,
    },
    refusedBead(
      'a branch the WorktreeCreate hook did not provision is not merged, and its runs are held',
      (g) => changed(g, { branch: 'worktree-wf_example-bead' }),
      /is not an agent\/ branch/,
    ),
    refusedBead(
      'a change to a file the group was not given is not merged',
      (g) => changed(g, { filesChanged: [BEAD, OPEN_PR] }),
      /changes \.claude\/skills\/open-pr\/SKILL\.md, which it was not given/,
    ),
    refusedBead('a change whose gate failed is not merged', (g) => changed(g, { gates: [gateRun(false)] }), /did not pass/),
    refusedBead('a change with no gate run is not merged', (g) => changed(g, { gates: [] }), /ran no gate/),
    refusedBead('a report of a change that states none is not merged', (g) => changed(g, { changes: [] }), /states none/),
    refusedBead('a report of a change whose branch changes no file is not merged', (g) => changed(g, { filesChanged: [] }), /changes no file/),
    refusedBead(
      'a report citing a run its evidence does not come from is not merged',
      (g) => changed(g, { changes: [{ file: BEAD, title: 'A fix', runs: [RUN_C], edit: 'e', why: 'w' }] }),
      /cites the run\(s\) example-3@2026-09-26T02:00:00Z, which its evidence does not come from/,
    ),
    refusedBead(
      'a report of no change whose branch changes a file is refused',
      (g) => unchanged(g, { filesChanged: [BEAD] }),
      /reports no change, but its branch changes \.claude\/skills\/bead\/SKILL\.md/,
    ),
    {
      name: 'an agent that returns nothing holds its runs, and a run only other groups cite is read',
      args: reviewArgs(),
      reports: { 'open-pr': null },
      expect: ['done', /^1 to merge, 0 unchanged, 0 refused, 1 died; 1 of 3 run\(s\) read$/],
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
      args: reviewArgs(),
      reports: { bead: (g) => changed(g, { branch: 'agent/wf_example-same' }), 'open-pr': (g) => unchanged(g, { branch: 'agent/wf_example-same' }) },
      expect: ['done', /^0 to merge, 0 unchanged, 2 refused, 0 died; 0 of 3 run\(s\) read$/],
      check: ({ result }) =>
        ['bead', 'open-pr'].every((id) => /report the one branch agent\/wf_example-same/.test(problemsOf(result, id)))
          ? null
          : `the problems were ${problemsOf(result, 'bead')} and ${problemsOf(result, 'open-pr')}`,
    },
    {
      name: 'every agent returning nothing stops the run, with every run held',
      args: reviewArgs(),
      reports: { bead: null, 'open-pr': null },
      expect: ['agent-died', /^every agent returned nothing/],
      check: ({ result }) => (!result.runsRead.length && result.runsHeld.length === 3 && !result.merge.length ? null : 'a run was read or a branch merged'),
    },
  ]
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
  const missing = policy ? POLICY_KEYS.filter((k) => policy[k] === undefined) : []
  if (missing.length) staticProblems.push(`${POLICY} has no ${missing.join(', ')}`)
  if (staticProblems.length || suites.some((s) => !s.body)) {
    console.error(`workflows selftest: a workflow or the policy cannot be run.\n`)
    for (const problem of staticProblems) console.error(`  - ${problem}\n`)
    process.exit(1)
  }
  suites[0].cases = buildCases(policy).map((c) => ({ ...c, answer: scenario(policy, c.scenario) }))
  suites[1].cases = reviewCases().map((c) => ({ ...c, answer: reviewAnswer(c.args, c.reports) }))

  const results = []
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
  const tally = suites.map((s) => {
    const mine = results.filter((r) => r.file === s.file)
    const controls = mine.filter((r) => r.control).length
    return `${s.file}: ${controls} control(s) and ${mine.length - controls} scenario(s)`
  })
  console.log(`workflows selftest: ${results.length - failed.length}/${results.length} cases hold (${tally.join('; ')}).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

await main()
