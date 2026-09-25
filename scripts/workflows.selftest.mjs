/**
 * Workflow selftest: runs `.claude/workflows/build-change-task.js` against stubbed agents, with the
 * review sizes `tools/policy.json` holds, and asserts how it stops, how many skeptics it sends, and
 * what it returns. It also holds the file to what the Workflow runtime accepts: a pure `meta` literal
 * first, every phase declared there, and no clock or randomness.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: the workflow is tracked for the first time in the
 * change that adds this file (asdlc-openspec-d6b). Were this wrong, it would let through the logic a
 * real run cannot show cheaply: a third review round, an unverified vote counted as refuted, a spec
 * contradiction halting before skeptics confirmed it, a coverage gap sent to skeptics, a listener left
 * on 127.0.0.1 and not reported, or a policy key renamed so that every run refuses. Each costs millions
 * of tokens, or a wrong verdict, before anyone sees it, and no other gate reads the file:
 * `check:prompts` and `openspec:check` read only skills and agents.
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
 * HOW IT RUNS THE SCRIPT. The workflow is not a module: it uses the runtime's `agent`, `parallel`,
 * `pipeline`, `phase`, `log` and `args`, with top-level `await` and `return`. This file cuts the
 * `meta` literal off, evaluates the rest as the body of an async function, and passes stubs for each,
 * plus a `Date` and a `Math.random` that throw, as the runtime's do. Each stubbed agent is answered by
 * its label (the workflow's header lists them), and each answer is checked against the schema the
 * agent was given: a field the schema does not declare is refused, since a real agent would never
 * return it. The Setup agent's answer is the real policy, and every number a case expects is read from
 * it, so no case restates a constant.
 *
 * NEEDS only committed files: the workflow and `tools/policy.json`. No agent, no network. Milliseconds.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.WORKFLOWS_ROOT ?? REPO_ROOT

const WORKFLOW = '.claude/workflows/build-change-task.js'
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

/** The workflow's `meta`, its body, and why the runtime would refuse it, if it would. */
function readWorkflow(root) {
  const source = readFileSync(join(root, WORKFLOW), 'utf8')
  const problems = []
  if (!source.startsWith(HEAD)) {
    return { problems: [`${WORKFLOW} does not start with \`${HEAD}\`, which the Workflow runtime needs first`] }
  }
  const open = HEAD.length - 1
  const close = closingBrace(source, open)
  if (close === -1) return { problems: [`${WORKFLOW}: the meta literal never closes`] }
  const literal = source.slice(open, close + 1)
  let meta = null
  if (literal.includes('${')) problems.push(`${WORKFLOW}: the meta literal interpolates, and the runtime needs a pure literal`)
  try {
    meta = new Function(`"use strict"; return (${literal})`)()
  } catch (error) {
    problems.push(`${WORKFLOW}: the meta literal is not a pure literal (${error.message})`)
  }
  if (meta && (typeof meta.name !== 'string' || typeof meta.description !== 'string' || !Array.isArray(meta.phases))) {
    problems.push(`${WORKFLOW}: meta needs a name, a description and a list of phases`)
  }
  const body = source.slice(close + 1)
  const declared = new Set((meta?.phases ?? []).map((p) => p.title))
  const used = new Set([...body.matchAll(/\bphase(?:\(\s*|:\s*)'([^']+)'/g)].map((m) => m[1]))
  for (const title of [...used].sort()) {
    if (!declared.has(title)) problems.push(`${WORKFLOW}: the phase '${title}' is used but not declared in meta.phases`)
  }
  for (const [pattern, what] of [
    [/\bDate\.now\b/, 'Date.now()'],
    [/\bMath\.random\b/, 'Math.random()'],
    [/\bnew Date\s*\(/, 'new Date()'],
  ]) {
    if (pattern.test(body)) problems.push(`${WORKFLOW} calls ${what}, which the Workflow runtime forbids`)
  }
  return { meta, body, problems }
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
  const logs = []
  const problems = []
  const agent = async (prompt, opts = {}) => {
    const label = opts.label ?? ''
    calls.push(label)
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
  return { result, calls, logs, problems }
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
function cases(policy) {
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

/* ------------------------------------------------------------------------------- selftest ----- */

async function main() {
  const { body, problems: staticProblems } = readWorkflow(ROOT)
  let policy
  try {
    policy = JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8'))
  } catch (error) {
    staticProblems.push(`${POLICY} could not be read: ${error.message}`)
  }
  const missing = policy ? POLICY_KEYS.filter((k) => policy[k] === undefined) : []
  if (missing.length) staticProblems.push(`${POLICY} has no ${missing.join(', ')}`)
  if (staticProblems.length || !body) {
    console.error(`workflows selftest: the workflow or the policy cannot be run.\n`)
    for (const problem of staticProblems) console.error(`  - ${problem}\n`)
    process.exit(1)
  }

  const results = []
  for (const c of cases(policy)) {
    const outcome = await run(body, c.args, scenario(policy, c.scenario))
    let detail = null
    if (outcome.problems.length) detail = outcome.problems.join(' | ')
    else if (!outcome.result) detail = 'the workflow returned nothing'
    else if (c.expect && outcome.result.stopped !== c.expect[0]) {
      detail = `stopped ${outcome.result.stopped} (${outcome.result.why}), not ${c.expect[0]}`
    } else if (c.expect && !c.expect[1].test(outcome.result.why)) {
      detail = `stopped ${c.expect[0]}, but not for that reason: ${outcome.result.why}`
    } else detail = c.check(outcome)
    results.push({ name: c.name, ok: detail === null, detail: detail ?? 'holds' })
    if (c.control && detail !== null) {
      console.error(`workflows selftest: a clean run does not pass, so no case can be trusted: ${c.name}: ${detail}`)
      process.exit(1)
    }
  }

  const failed = results.filter((r) => !r.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  const controls = results.filter((r) => r.name.startsWith('control')).length
  console.log(
    `workflows selftest: ${results.length - failed.length}/${results.length} cases hold` +
      ` (${controls} control(s), one per kind, plus ${results.length - controls} scenario(s)), against ${WORKFLOW}.`,
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

await main()
