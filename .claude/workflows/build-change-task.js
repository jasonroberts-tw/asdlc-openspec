export const meta = {
  name: 'build-change-task',
  description: 'Build one task of a product change in its worktree, review it through the lenses tools/policy.json names for its kind, confirm each finding with skeptics sized to its severity, and fix until a round confirms nothing major',
  whenToUse: 'Step 3 of the change-build skill, once for each task of a planned change, from the change worktree',
  phases: [
    { title: 'Setup', detail: 'read the review sizes from tools/policy.json, and list the listeners already on 127.0.0.1' },
    { title: 'Build', detail: 'one agent builds the task and runs its proofs' },
    { title: 'Review', detail: 'one reviewer for each lens the policy names for the kind' },
    { title: 'Merge', detail: 'findings of one kind on one file that describe one defect become one' },
    { title: 'Confirm', detail: 'skeptics, as many as the policy gives the severity, judge each defect and spec contradiction' },
    { title: 'Fix', detail: 'one agent fixes the confirmed defects and runs the proofs again' },
    { title: 'Sweep', detail: 'list the listeners on 127.0.0.1 again, and report any the run left behind' },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Builds one task of a product change in the change's worktree, then reviews what was
 * built: one reviewer for each lens `tools/policy.json` names for the task's kind, the findings merged,
 * each defect and spec contradiction confirmed by skeptics, the confirmed defects fixed, and another
 * round only while a round confirms a major one. It commits nothing and writes nothing to the tracker:
 * the parent session does both (`.claude/skills/change-build/SKILL.md` § 3. Build it, and prove it).
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the calculator change (asdlc-openspec-zgh) built
 * every task through an untracked ancestor of this script, which three skeptics per finding and three
 * rounds made cost 22.4M tokens across its build runs, and which failed three ways. It halted on any
 * reviewer's "spec problem" unconfirmed: eleven stopped one pass of zgh.1, and seven of them were
 * scenarios no test covered or mutants the tests did not catch, each halt a round of questions to the
 * maintainer. A skeptic that could not verify a finding answered refuted, and so rejected a real gap,
 * Node's own 400 and 431 answers carrying no Content-Security-Policy, which change-verify upheld. And a
 * reviewer's mutant copy of apps/calculator/serve.js was left listening on 127.0.0.1:8080 for 74
 * minutes. `bd show asdlc-openspec-d6b` gives each figure and the file it was measured from.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file inside the change's worktree, so
 * that the script and the policy it reads come from one commit, and `args`:
 *
 *   task      { id, title, body }: the tracker task, as `bd show <id>` prints it
 *   change    the change's name; its delta specs and design are under openspec/changes/<change>/
 *   worktree  the worktree's absolute path, as `git rev-parse --show-toplevel` prints it there
 *   branch    the worktree's branch
 *   kind      the `assetLabels` key for what the task mainly changes; `buildReviewLenses` maps it to lenses
 *   lenses    optional { <lens key>: focus }: this task's own probes, mutations or cases for a lens the
 *             kind runs. The policy picks the lenses; this adds to them and never adds one
 *   guide     optional: what the builder reads first, or builds in what order
 *   settled   optional [string]: decided already, by the parent or the user; no agent raises it again
 *
 * WHAT IT RETURNS. { task, stopped, why, build, lastFix, fixUnreviewed, rounds, confirmed, unverified,
 * refuted, unplanned, followUps, listeners }. Every count in it is computed here, never by an agent.
 * `rounds` has one entry per round, round 0 being the build's own findings. `stopped` is one of:
 *
 *   refused             an argument or the policy did not hold; `why` names it. Only Setup ran
 *   agent-died          the builder, the fixer or every reviewer of a round returned nothing
 *   proof-failing       a proof the builder or the fixer ran did not pass; no review followed it
 *   spec-contradiction  a spec contradiction was confirmed; nothing after it was fixed
 *   nothing-major       a round confirmed no defect at a `buildReviewMajorSeverities` severity
 *   round-limit         the last round `buildReviewMaxRounds` allows confirmed a major defect; its fix
 *                       is unreviewed
 *
 * THE MECHANICS, whose one home is this header. The kinds of finding are defined in KIND_RULE below,
 * which every agent reads, but for one case, a scenario a known-wrong implementation satisfies, whose
 * home is `.claude/skills/change-build/SKILL.md` § 5. What the build turns up. That section also says
 * what the parent does with each kind, and KIND_RULE cites it for the one case and has every agent
 * read it first.
 *
 *   Merge. Findings of one kind naming one file go, where there are two or more, to one agent that
 *   groups those describing one defect. A group becomes one finding, with the highest severity among
 *   them, every lens that raised it, and each lens's evidence. A grouping that does not place each
 *   finding exactly once, or mixes files or kinds, is discarded, logged, and the findings kept apart.
 *
 *   Confirmation. A defect goes to `buildReviewSkeptics[severity]` skeptics, and a spec contradiction
 *   always to the `blocker` count, since a confirmed one halts the run. Each answers upheld, refuted or
 *   unverified. With n sent, floor(n/2)+1 upheld confirms it and as many refuted refutes it; anything
 *   else, a skeptic that returns nothing included, leaves it unverified, and it goes back to the parent
 *   as such, never as refuted. A refuted finding that that many skeptics also mark followUp becomes a
 *   coverage gap to file. Coverage gaps, out-of-scope and unplanned findings are never confirmed: the
 *   parent searches the tracker before filing one, and whoever works it checks its premise first.
 *
 *   Stop order, after each round's confirmation: a confirmed spec contradiction stops the run; else the
 *   confirmed defects are fixed and the proofs run again; then a round that confirmed no defect at a
 *   major severity stops it, and so does the last round allowed; else the next round reviews the fix.
 *
 *   Sweep. Setup lists the listeners on 127.0.0.1. Every exit after Setup lists them again, and each one
 *   that was not there before is `listeners.leftBehind`, for the parent to stop.
 *
 * LABELS. Agents are labelled `setup`, `build`, `review <lens> r<n>`, `merge r<n>`,
 * `skeptic <i>/<n> r<round>: <title>`, `fix r<n>` and `sweep`. scripts/workflows.selftest.mjs routes its
 * stubbed agents by them: change one here and change it there.
 *
 * NEEDS a change worktree with node and git, `lsof` (macOS) or `ss` (Linux) for the listeners, and the
 * Workflow tool. Nothing here reads a file: Setup's agent reads the policy. `npm run workflows:selftest`
 * runs this script against stubbed agents.
 */

const A = args || {}

const SEVERITIES = ['blocker', 'major', 'minor']
const KINDS = ['defect', 'spec-contradiction', 'coverage-gap', 'out-of-scope', 'unplanned']
const BUILDER_KINDS = ['spec-contradiction', 'coverage-gap', 'out-of-scope', 'unplanned']
const CONFIRMED_KINDS = ['defect', 'spec-contradiction']
const POLICY_KEYS = ['buildReviewLenses', 'buildReviewSkeptics', 'buildReviewMaxRounds', 'buildReviewMajorSeverities', 'assetLabels']
const ROUTES = '`.claude/skills/change-build/SKILL.md` § 5. What the build turns up'

/* ------------------------------------------------------------------------------ the lenses ----- */

const LENSES = {
  spec: {
    label: 'the tests prove the scenarios',
    prompt: [
      'For each scenario the task names, find the test the task names as its proof.',
      "The test must drive exactly the scenario's WHEN and assert every THEN and AND, including a value shown part-way through a sequence, with each expected value written out rather than computed by the code under test.",
      'Where the design or the task sets a rule for test names, hold each name to it character for character.',
      "Run the task's proof and read what it reports.",
      'Report a scenario with no test or with a test that under-asserts it, and a test named like a scenario that is not one.',
    ].join(' '),
  },
  behaviour: {
    label: 'the code does what the specs say',
    prompt: [
      'Probe the real thing this task changes: the module, the page, the server, the command or the gate.',
      'Before you run each probe, write down the result the delta specs, the design or the task say it must give, derived from their text and never from the code.',
      'Put every probe under .scratch/. Start a server in your own script, on port 0 of 127.0.0.1, and close it again; kill every child process you start.',
      'Cover the cases the text names, and the inputs just either side of every limit it states.',
      'Report each divergence with the probe, the result the text requires, and the result you got.',
    ].join(' '),
  },
  honesty: {
    label: 'the proofs catch a wrong implementation',
    prompt: [
      "Try to make the task's proof pass while the code is wrong. Never edit the task's files: other reviewers are reading them.",
      'Copy the code under test and the test or selftest that proves it into .scratch/mutants-<n>/, with its relative paths still working, make one mutation per copy, and run the proof against the copy.',
      'Mutate what the scenarios state: each condition, each boundary, each branch, each value written out. For a gate, break the gate and run its selftest: a case that still holds does not assert its reason.',
      'Give each surviving mutant its kind by the rule below. A mutation that cannot change anything observable is equivalent, and not a finding.',
      'Also look for skipped, todo or only tests, assertions that can pass over an empty list, and helpers that swallow exceptions.',
      'Look too for a test whose assertions depend on the environment, such as whether a port is free, with a weaker branch it can pass on; hold it to the rule for such a test in ' + ROUTES + '.',
    ].join(' '),
  },
  wiring: {
    label: 'the repository around the change',
    prompt: [
      "Hold the files around the change to what the task's acceptance criteria ask of them.",
      'An npm script it adds is wired as the add-npm-script skill says: a lefthook job whose glob is re-derived from what the script reads, a cost note measured on this host, and a .github/workflows/verify.yml step where the script reads only committed files.',
      "A file it adds has its row in its directory's README.md. A script, emitter or hook it adds opens with the header CLAUDE.md asks of one.",
      'Every comment and README sentence it touches is true of the code.',
      'Run npm run check:jobs and npm run citations:check, each as its own call, and report what they print.',
    ].join(' '),
  },
  contract: {
    label: 'the text says what the task asks',
    prompt: [
      "Read every line the task adds or changes, and hold it to the task's acceptance criteria, the delta specs and the design: everything they ask for is there, and nothing they do not ask for is.",
      'Hold it also to the rules for its kind of file: a register entry to how docs/decisions.md says an entry is written and changed; a README to what CLAUDE.md asks of a directory README; a prompt to what CLAUDE.md asks of a skill or an agent; a template to the placeholders its renderer fills.',
      'Run the gate that holds the file, where one does (npm run check:register for the register, npm run check:prompts for a prompt), and report what it prints.',
    ].join(' '),
  },
  record: {
    label: 'every claim is true of the repository',
    prompt: [
      'Re-derive every claim the changed text makes about the repository: each file, script, path, command, figure and date.',
      "A file-level record, such as a register entry's What changed or a README table, must match git diff --stat origin/main...HEAD and git status --short, with nothing missing and nothing extra.",
      'Each figure must come with the command that re-derives it, and equal what that command prints now.',
      'Run npm run citations:check and npm run counts:check, each as its own call, and report what they print.',
    ].join(' '),
  },
}

/* ------------------------------------------------------------------------------- the rules ----- */

const KIND_RULE = [
  'Read ' + ROUTES + ' before you give any finding a kind: one case below is decided there, not here.',
  'Give every finding one kind. First quote, in `against`, the sentence of the delta specs, the design or the task that says what should happen.',
  '- No sentence to quote: coverage-gap. The behaviour may well be right, but nothing states it, so nothing proves it. A mutant you can call wrong only by your own judgement is one.',
  '- The code as it stands breaks the sentence: defect.',
  "- Only a known-wrong implementation, a mutant, breaks it: when no scenario is about that sentence, coverage-gap; when a faithful test of the scenario would fail the mutant but the task's own test passes it, defect, because the task's proof does not prove its scenario; " +
    'otherwise, the kind ' + ROUTES + ' gives it.',
  '- A scenario that cannot hold as written, a behaviour the delta specs leave undecided so that the build had to choose, or anything else that § 5 calls a spec that is wrong: spec-contradiction. Code that gets a behaviour right where no scenario speaks is never one.',
  '- A real defect in a file or a task this task does not own: out-of-scope. Work this change needs that no task of its plan covers: unplanned.',
  'Grade a finding blocker or major when it breaks a scenario or an acceptance criterion, and minor when it is real but small. Report nothing that is a matter of taste.',
  'Where each kind goes is ' + ROUTES + '; the parent session routes it, not you.',
].join('\n')

function rules() {
  return [
    `You are working in the git worktree ${A.worktree}, on branch ${A.branch}, on task ${A.task.id} of the product change ${A.change}. Its delta specs, and its design where it has one, are under openspec/changes/${A.change}/.`,
    'Rules for this run, on top of CLAUDE.md and .worktree/CONTEXT.md:',
    '- Stay inside the worktree. Do not commit, push, stash, reset or switch branches, and write nothing to the tracker: the parent session commits and closes the task.',
    `- Never edit anything under openspec/changes/${A.change}/. Where the specs or the design cannot be followed as written, report a spec-contradiction rather than coding around it.`,
    '- Use no Node API or syntax newer than the engines floor in package.json, and match the style of the files beside the one you edit.',
    '- Throwaway files go under .scratch/ only.',
    '- A probe that needs a listener binds port 0 on 127.0.0.1, in its own script, never through a command that fixes the port. Stop every process you start before you return, and check that nothing you started still listens.',
    '- Run each command as its own Bash call, as CLAUDE.md asks.',
  ].join('\n')
}

function taskBlock() {
  return `## Task ${A.task.id}: ${A.task.title}\n\n${A.task.body}`
}

function settledBlock() {
  return A.settled && A.settled.length
    ? `\n\n## Settled already; do not raise these again\n\n${A.settled.map((s) => `- ${s}`).join('\n')}`
    : ''
}

/* ----------------------------------------------------------------------------- the schemas ----- */

const STRINGS = { type: 'array', items: { type: 'string' } }

function findingSchema(kinds) {
  return {
    type: 'object',
    properties: {
      kind: { type: 'string', enum: kinds },
      severity: { type: 'string', enum: SEVERITIES },
      title: { type: 'string' },
      file: { type: 'string' },
      against: { type: 'string' },
      evidence: { type: 'string' },
      fix: { type: 'string' },
    },
    required: ['kind', 'severity', 'title', 'file', 'against', 'evidence', 'fix'],
  }
}

const LISTENERS = {
  type: 'array',
  items: {
    type: 'object',
    properties: { pid: { type: 'string' }, port: { type: 'string' }, command: { type: 'string' } },
    required: ['pid', 'port', 'command'],
  },
}

// No enum here: a policy that is wrong must reach the code below whole, to be refused with a reason,
// not be tidied by the agent that read it.
const SETUP_SCHEMA = {
  type: 'object',
  properties: { policyJson: { type: 'string' }, toplevel: { type: 'string' }, branch: { type: 'string' }, listeners: LISTENERS },
  required: ['policyJson', 'toplevel', 'branch', 'listeners'],
}

const WORK_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    filesChanged: STRINGS,
    proofs: {
      type: 'array',
      items: {
        type: 'object',
        properties: { command: { type: 'string' }, passed: { type: 'boolean' }, output: { type: 'string' } },
        required: ['command', 'passed', 'output'],
      },
    },
    decisions: STRINGS,
    findings: { type: 'array', items: findingSchema(BUILDER_KINDS) },
  },
  required: ['summary', 'filesChanged', 'proofs', 'decisions', 'findings'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: { checked: STRINGS, findings: { type: 'array', items: findingSchema(KINDS) } },
  required: ['checked', 'findings'],
}

const MERGE_SCHEMA = {
  type: 'object',
  properties: { groups: { type: 'array', items: { type: 'array', items: { type: 'integer' } } } },
  required: ['groups'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['upheld', 'refuted', 'unverified'] },
    reason: { type: 'string' },
    followUp: { type: 'boolean' },
  },
  required: ['verdict', 'reason', 'followUp'],
}

const SWEEP_SCHEMA = { type: 'object', properties: { listeners: LISTENERS }, required: ['listeners'] }

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isWhole = (v) => Number.isInteger(v) && v >= 1
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  if (!isPlainObject(A.task) || !isText(A.task.id) || !isText(A.task.title) || !isText(A.task.body)) {
    return 'args.task must be { id, title, body }, each a non-empty string, as `bd show <id>` prints them'
  }
  for (const key of ['change', 'worktree', 'branch', 'kind']) {
    if (!isText(A[key])) return `args.${key} must be a non-empty string`
  }
  if (A.lenses !== undefined && (!isPlainObject(A.lenses) || Object.values(A.lenses).some((v) => !isText(v)))) {
    return 'args.lenses must be an object mapping a lens key to the focus text for this task'
  }
  if (A.guide !== undefined && typeof A.guide !== 'string') return 'args.guide must be a string'
  if (A.settled !== undefined && (!Array.isArray(A.settled) || A.settled.some((s) => !isText(s)))) {
    return 'args.settled must be an array of non-empty strings'
  }
  return null
}

/** The policy Setup read, checked, or the reason it cannot be used. */
function readPolicy(setup) {
  let p
  try {
    p = JSON.parse(setup.policyJson)
  } catch (error) {
    return { problem: `tools/policy.json could not be read: Setup printed ${JSON.stringify(setup.policyJson.slice(0, 200))}` }
  }
  if (!isPlainObject(p)) return { problem: 'tools/policy.json could not be read: Setup did not print an object' }
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return { problem: `tools/policy.json has no ${missing.map((k) => `\`${k}\``).join(', ')}` }

  const labels = isPlainObject(p.assetLabels) ? Object.keys(p.assetLabels) : []
  const lensSets = p.buildReviewLenses
  if (!isPlainObject(lensSets) || Object.values(lensSets).some((set) => !Array.isArray(set) || !set.length)) {
    return { problem: 'tools/policy.json `buildReviewLenses` must map each kind to a non-empty list of lens keys' }
  }
  for (const [kind, set] of Object.entries(lensSets)) {
    if (!labels.includes(kind)) {
      return { problem: `tools/policy.json \`buildReviewLenses\` has the kind ${kind}, which is not an \`assetLabels\` key` }
    }
    const unknown = set.filter((lens) => !Object.prototype.hasOwnProperty.call(LENSES, lens))
    if (unknown.length) {
      return {
        problem: `tools/policy.json \`buildReviewLenses\` names the lens ${unknown.join(', ')} for ${kind}, which this workflow does not have (it has: ${Object.keys(LENSES).join(', ')})`,
      }
    }
  }
  const skeptics = p.buildReviewSkeptics
  if (!isPlainObject(skeptics) || SEVERITIES.some((s) => !isWhole(skeptics[s])) || Object.keys(skeptics).length !== SEVERITIES.length) {
    return { problem: `tools/policy.json \`buildReviewSkeptics\` must give exactly ${SEVERITIES.join(', ')} each a whole number of at least 1` }
  }
  if (!isWhole(p.buildReviewMaxRounds)) {
    return { problem: 'tools/policy.json `buildReviewMaxRounds` must be a whole number of at least 1' }
  }
  const majors = p.buildReviewMajorSeverities
  if (!Array.isArray(majors) || majors.some((s) => !SEVERITIES.includes(s))) {
    return { problem: `tools/policy.json \`buildReviewMajorSeverities\` must be a list drawn from ${SEVERITIES.join(', ')}` }
  }

  if (!Object.prototype.hasOwnProperty.call(lensSets, A.kind)) {
    return { problem: `args.kind ${A.kind} has no lens set in tools/policy.json \`buildReviewLenses\` (it has: ${Object.keys(lensSets).join(', ')})` }
  }
  const extra = Object.keys(A.lenses || {}).filter((lens) => !lensSets[A.kind].includes(lens))
  if (extra.length) {
    return { problem: `args.lenses names ${extra.join(', ')}, which the kind ${A.kind} does not run (it runs: ${lensSets[A.kind].join(', ')})` }
  }
  const strip = (path) => path.trim().replace(/\/+$/, '')
  if (strip(setup.toplevel) !== strip(A.worktree)) {
    return { problem: `args.worktree is ${A.worktree}, but Setup ran in ${setup.toplevel.trim()}: pass the path git rev-parse --show-toplevel prints there` }
  }
  if (setup.branch.trim() !== A.branch.trim()) {
    return { problem: `args.branch is ${A.branch}, but the worktree is on ${setup.branch.trim()}` }
  }
  return { policy: p }
}

/* ---------------------------------------------------------------------------- the run state ----- */

const S = {
  build: null,
  lastFix: null,
  fixUnreviewed: false,
  rounds: [],
  confirmed: [],
  unverified: [],
  refuted: [],
  unplanned: [],
  followUps: [],
}
let policy = null
let before = []

function newRound(round, lenses) {
  const byKind = {}
  for (const kind of KINDS) byKind[kind] = 0
  const record = { round, lenses, lensesMissing: [], raised: 0, merged: 0, byKind, skeptics: 0, confirmed: 0, refuted: 0, unverified: 0, fixed: 0 }
  S.rounds.push(record)
  return record
}

const work = (w) => ({ summary: w.summary, filesChanged: w.filesChanged, proofs: w.proofs, decisions: w.decisions })

function summary(stopped, why, listeners) {
  return {
    task: A.task && A.task.id,
    stopped,
    why,
    build: S.build,
    lastFix: S.lastFix,
    fixUnreviewed: S.fixUnreviewed,
    rounds: S.rounds,
    confirmed: S.confirmed,
    unverified: S.unverified,
    refuted: S.refuted,
    unplanned: S.unplanned,
    followUps: S.followUps,
    listeners,
  }
}

function refuse(why, listeners) {
  log(`Refused: ${why}`)
  return summary('refused', why, { checked: false, before: listeners || [], after: null, leftBehind: [] })
}

const keyOf = (l) => `${String(l.pid).trim()}:${String(l.port).trim()}`

/** Every exit after Setup: list the listeners again, and name those the run left behind. */
async function finish(stopped, why) {
  phase('Sweep')
  const sweep = await agent(
    'List the TCP listeners on 127.0.0.1 now, and do nothing else: on macOS run `lsof -nP -iTCP@127.0.0.1 -sTCP:LISTEN`, on Linux `ss -ltnpH src 127.0.0.1`, as one Bash call. Return one entry per listening socket with its pid, its port and its command, as printed. Change nothing and stop nothing.',
    { label: 'sweep', phase: 'Sweep', schema: SWEEP_SCHEMA, effort: 'low' },
  )
  const seen = new Set(before.map(keyOf))
  const leftBehind = sweep ? sweep.listeners.filter((l) => !seen.has(keyOf(l))) : []
  if (!sweep) why += '; the sweep returned nothing, so the listeners were not checked'
  if (leftBehind.length) {
    log(`Left behind on 127.0.0.1: ${leftBehind.map((l) => `${l.command} (pid ${l.pid}, port ${l.port})`).join('; ')}`)
  }
  log(`Stopped (${stopped}): ${why}`)
  return summary(stopped, why, { checked: Boolean(sweep), before, after: sweep ? sweep.listeners : null, leftBehind })
}

/* ------------------------------------------------------------------------ sorting findings ----- */

const normalise = (file) =>
  String(file)
    .trim()
    .replace(A.worktree.replace(/\/+$/, '') + '/', '')
    .replace(/^\.\//, '')
    .replace(/:\d+(?:[-:]\d+)?$/, '')

const rank = (severity) => SEVERITIES.indexOf(severity)

/**
 * File every finding that is not confirmed where the parent will find it, count each kind on the
 * round, and return those that go to skeptics.
 */
function route(findings, record, round, source) {
  const toConfirm = []
  for (const f of findings) {
    record.byKind[f.kind] = (record.byKind[f.kind] || 0) + 1
    const entry = { round, source, ...f }
    if (CONFIRMED_KINDS.includes(f.kind)) toConfirm.push(entry)
    else if (f.kind === 'unplanned') S.unplanned.push(entry)
    else S.followUps.push(entry)
  }
  return toConfirm
}

/** Findings of one kind on one file that describe one defect, merged; the rest as they were. */
async function merge(findings, round) {
  const byPlace = new Map()
  findings.forEach((f, i) => {
    const place = `${normalise(f.file)}\u0000${f.kind}`
    if (!byPlace.has(place)) byPlace.set(place, [])
    byPlace.get(place).push(i)
  })
  const shared = [...byPlace.values()].filter((indices) => indices.length > 1)
  if (!shared.length) return findings

  phase('Merge')
  const listing = shared
    .map((indices) =>
      indices
        .map((i) => {
          const f = findings[i]
          return `[${i}] ${normalise(f.file)} (${f.kind}, ${f.severity}) ${f.title}: ${f.evidence.slice(0, 300)}`
        })
        .join('\n'),
    )
    .join('\n\n')
  const out = await agent(
    `Independent reviewers of task ${A.task.id} reported the findings below, listed in blocks by the file they name and their kind. Within each block, decide which findings describe the same defect: the same wrong behaviour at the same place, however it is worded. Return every index below exactly once, in groups; a finding like no other is a group of one, and a group never spans two blocks. Read nothing and change nothing.\n\n${listing}`,
    { label: `merge r${round}`, phase: 'Merge', schema: MERGE_SCHEMA, effort: 'low' },
  )

  const blockOf = new Map()
  shared.forEach((indices, b) => indices.forEach((i) => blockOf.set(i, b)))
  const used = out ? out.groups.flat() : []
  const sound =
    out &&
    used.length === blockOf.size &&
    new Set(used).size === used.length &&
    used.every((i) => blockOf.has(i)) &&
    out.groups.every((g) => g.length > 0 && g.every((i) => blockOf.get(i) === blockOf.get(g[0])))
  if (!sound) {
    log(`Round ${round}: the merge did not place each finding exactly once within its file and kind; the findings are kept apart`)
    return findings
  }

  const merged = findings.filter((_, i) => !blockOf.has(i))
  for (const group of out.groups) {
    const members = group.map((i) => findings[i]).sort((a, b) => rank(a.severity) - rank(b.severity))
    if (members.length === 1) {
      merged.push(members[0])
      continue
    }
    const raisedBy = []
    for (const m of members) for (const lens of m.raisedBy) if (!raisedBy.includes(lens)) raisedBy.push(lens)
    merged.push({
      ...members[0],
      raisedBy,
      evidence: members.map((m) => `[${m.raisedBy.join(', ')}] ${m.evidence}`).join('\n'),
    })
  }
  return merged
}

/** Majority of those sent, as the header states. A missing vote is an unverified one. */
function tally(f, votes) {
  const n = votes.length
  const majority = Math.floor(n / 2) + 1
  const cast = votes.map((v) => v || { verdict: 'unverified', reason: 'the skeptic returned nothing', followUp: false })
  const upheld = cast.filter((v) => v.verdict === 'upheld').length
  const refuted = cast.filter((v) => v.verdict === 'refuted')
  const outcome = upheld >= majority ? 'confirmed' : refuted.length >= majority ? 'refuted' : 'unverified'
  const followUp = outcome === 'refuted' && refuted.filter((v) => v.followUp).length >= majority
  return {
    ...f,
    outcome,
    skeptics: n,
    followUp,
    votes: cast.map((v) => `${v.verdict}${v.followUp ? ', follow-up' : ''}: ${v.reason}`),
  }
}

function skepticPrompt(f, i, n) {
  return [
    rules(),
    '',
    `You are skeptic ${i} of ${n} on a finding about task ${A.task.id}. Judge it against the delta specs under openspec/changes/${A.change}/, the design there where there is one, and the task below, and against nothing else. Read the files it names and, where it helps, run the command it cites. You change nothing.`,
    '',
    '- upheld: you checked it, and it holds, as the kind it claims.',
    '- refuted: you checked it, and it is wrong: factually, already satisfied, or asking for more than the specs, the design and the task state. Set followUp when it is refuted only because nothing states the behaviour it asks for, and that behaviour deserves a scenario or a test.',
    '- unverified: you could not establish either. Say what stopped you. Never answer refuted because you could not verify it.',
    '',
    KIND_RULE,
    '',
    taskBlock() + settledBlock(),
    '',
    '## The finding',
    '',
    `Kind: ${f.kind}`,
    `Severity: ${f.severity}`,
    `Title: ${f.title}`,
    `File: ${f.file}`,
    `Against: ${f.against}`,
    `Evidence: ${f.evidence}`,
    `Proposed fix: ${f.fix}`,
  ].join('\n')
}

/** Send each finding to its skeptics, file the outcome, and count it on the round. */
async function judge(findings, record, round) {
  phase('Confirm')
  const judged = await pipeline(
    findings,
    (f) => {
      const n = policy.buildReviewSkeptics[f.kind === 'spec-contradiction' ? 'blocker' : f.severity]
      return parallel(
        Array.from({ length: n }, (_, i) => () =>
          agent(skepticPrompt(f, i + 1, n), {
            label: `skeptic ${i + 1}/${n} r${round}: ${f.title.slice(0, 40)}`,
            phase: 'Confirm',
            schema: VERDICT_SCHEMA,
          }),
        ),
      )
    },
    (votes, f) => tally(f, votes),
  )
  const done = judged.filter(Boolean)
  for (const f of done) {
    record.skeptics += f.skeptics
    record[f.outcome] += 1
    if (f.outcome === 'confirmed') {
      f.fixed = false
      S.confirmed.push(f)
    }
    else if (f.outcome === 'unverified') S.unverified.push(f)
    else {
      S.refuted.push({ round, title: f.title, file: f.file, reason: f.votes.find((v) => v.startsWith('refuted')) || f.votes[0], followUp: f.followUp })
      if (f.followUp) S.followUps.push({ ...f, kind: 'coverage-gap' })
    }
  }
  return done
}

const confirmedSpec = (judged) => judged.filter((f) => f.outcome === 'confirmed' && f.kind === 'spec-contradiction')
const titles = (fs) => fs.map((f) => `"${f.title}"`).join(', ')

/* ------------------------------------------------------------------------------- the prompts ----- */

function reviewPrompt(lens, round) {
  const def = LENSES[lens]
  const focus = A.lenses && A.lenses[lens] ? `\n\n## For this task, also\n\n${A.lenses[lens]}` : ''
  const seen = [
    ...S.confirmed.map((f) => `- [confirmed${f.fixed ? ' and fixed' : ''}] ${f.title} (${f.file})`),
    ...S.refuted.map((f) => `- [refuted] ${f.title} (${f.file})`),
    ...S.unverified.map((f) => `- [unverified, with the parent] ${f.title} (${f.file})`),
    ...S.followUps.map((f) => `- [returned for filing] ${f.title} (${f.file})`),
    ...S.unplanned.map((f) => `- [returned to the parent] ${f.title} (${f.file})`),
  ]
  const prior = seen.length ? `\n\n## Judged already; raise one again only with new evidence\n\n${seen.join('\n')}` : ''
  const fixNote = round > 1 && S.lastFix ? `\n\n## The fix after round ${round - 1} reported\n\n${S.lastFix.summary}` : ''
  return [
    rules(),
    '',
    `You are an independent reviewer of task ${A.task.id}, through one lens only: ${def.label}. You change nothing in the repository; throwaway probes go under .scratch/. Report only real findings, each with evidence a reader can check again: the file and line, or the command and what it printed.`,
    '',
    KIND_RULE,
    '',
    taskBlock(),
    '',
    `## Your lens: ${def.label}`,
    '',
    def.prompt + focus + settledBlock() + prior + fixNote,
  ].join('\n')
}

function buildPrompt() {
  const guide = A.guide ? `\n\n## The parent session's guide\n\n${A.guide}` : ''
  return [
    rules(),
    '',
    taskBlock() + guide + settledBlock(),
    '',
    '## How to work',
    '',
    "Read the task, the delta specs and the design first. Build what the task asks, and run every proof it names, each as its own call, until each passes as measured. Regenerate every derived artifact the change touches with its emitter, never by hand. A defect in your own work is fixed, never reported.",
    '',
    'Report as findings only what you found and did not fix, by this rule:',
    '',
    KIND_RULE,
    '',
    'Return every file you created or changed, each proof you ran with its real output trimmed to what matters, and each decision you made that the design left to the build.',
  ].join('\n')
}

function fixPrompt(defects) {
  const list = defects
    .map((f, i) => `${i + 1}. [${f.severity}] ${f.title} (${f.file})\n   Against: ${f.against}\n   Evidence: ${f.evidence}\n   Proposed fix: ${f.fix}`)
    .join('\n\n')
  return [
    rules(),
    '',
    taskBlock() + settledBlock(),
    '',
    '## Fix these confirmed defects, and nothing else',
    '',
    list,
    '',
    "Then run every proof the task names again, each as its own call, and return their real output. Report as findings only what you could not fix without contradicting the specs, and what you found outside this task, by this rule:",
    '',
    KIND_RULE,
  ].join('\n')
}

/* ---------------------------------------------------------------------------------- the run ----- */

const badArgs = argsProblem()
if (badArgs) return refuse(badArgs)

phase('Setup')
const setup = await agent(
  [
    `Work in ${A.worktree}. Run each of these as its own Bash call, and return what each prints, verbatim, even where it looks wrong.`,
    '',
    `1. policyJson: node -p "JSON.stringify(Object.fromEntries(${JSON.stringify(POLICY_KEYS).replace(/"/g, "'")}.map((k) => [k, require('./tools/policy.json')[k]])))"`,
    '2. toplevel: git rev-parse --show-toplevel',
    '3. branch: git branch --show-current',
    '4. listeners: the TCP listeners on 127.0.0.1, with `lsof -nP -iTCP@127.0.0.1 -sTCP:LISTEN` on macOS or `ss -ltnpH src 127.0.0.1` on Linux; one entry per listening socket with its pid, its port and its command, and an empty list when there is none.',
    '',
    'Change nothing and stop nothing.',
  ].join('\n'),
  { label: 'setup', phase: 'Setup', schema: SETUP_SCHEMA, effort: 'low' },
)
if (!setup) return refuse('the Setup agent returned nothing, so tools/policy.json was not read')
const read = readPolicy(setup)
if (read.problem) return refuse(read.problem, setup.listeners)
policy = read.policy
before = setup.listeners
const lensKeys = policy.buildReviewLenses[A.kind]
const majors = policy.buildReviewMajorSeverities
const maxRounds = policy.buildReviewMaxRounds
log(`Task ${A.task.id} (${A.kind}): lenses ${lensKeys.join(', ')}; at most ${maxRounds} round(s)`)

phase('Build')
const built = await agent(buildPrompt(), { label: 'build', phase: 'Build', schema: WORK_SCHEMA })
if (!built) return finish('agent-died', 'the builder returned nothing, so nothing was built or reviewed')
S.build = work(built)
const buildRound = newRound(0, ['build'])
buildRound.raised = built.findings.length
const buildToConfirm = route(built.findings.map((f) => ({ ...f, raisedBy: ['build'] })), buildRound, 0, 'build')
if (buildToConfirm.length) {
  const judged = await judge(buildToConfirm, buildRound, 0)
  const spec = confirmedSpec(judged)
  if (spec.length) return finish('spec-contradiction', `the build found ${spec.length} spec contradiction(s) the skeptics confirmed: ${titles(spec)}; no reviewer ran`)
}
const buildFailing = built.proofs.filter((p) => !p.passed)
if (buildFailing.length) {
  return finish('proof-failing', `the build's proof(s) ${buildFailing.map((p) => p.command).join(', ')} did not pass; no reviewer ran`)
}

for (let round = 1; round <= maxRounds; round++) {
  const record = newRound(round, lensKeys)
  phase('Review')
  const reviews = await parallel(
    lensKeys.map((lens) => () => agent(reviewPrompt(lens, round), { label: `review ${lens} r${round}`, phase: 'Review', schema: REVIEW_SCHEMA })),
  )
  S.fixUnreviewed = false
  record.lensesMissing = lensKeys.filter((_, i) => !reviews[i])
  if (record.lensesMissing.length === lensKeys.length) {
    return finish('agent-died', `every reviewer of round ${round} returned nothing, so ${round === 1 ? 'the build' : 'the last fix'} is unreviewed`)
  }
  const raw = []
  reviews.forEach((r, i) => {
    if (r) for (const f of r.findings) raw.push({ ...f, raisedBy: [lensKeys[i]] })
  })
  record.raised = raw.length
  const merged = await merge(raw, round)
  record.merged = raw.length - merged.length
  const toConfirm = route(merged, record, round, 'review')
  const judged = toConfirm.length ? await judge(toConfirm, record, round) : []
  log(`Round ${round}: ${record.raised} raised, ${record.merged} merged away, ${toConfirm.length} to skeptics: ${record.confirmed} confirmed, ${record.refuted} refuted, ${record.unverified} unverified`)

  const spec = confirmedSpec(judged)
  if (spec.length) {
    return finish('spec-contradiction', `round ${round} confirmed ${spec.length} spec contradiction(s): ${titles(spec)}; nothing was fixed after them`)
  }

  const defects = judged.filter((f) => f.outcome === 'confirmed' && f.kind === 'defect')
  if (defects.length) {
    phase('Fix')
    const fix = await agent(fixPrompt(defects), { label: `fix r${round}`, phase: 'Fix', schema: WORK_SCHEMA })
    if (!fix) return finish('agent-died', `the fixer of round ${round} returned nothing, so its ${defects.length} confirmed defect(s) are unfixed`)
    S.lastFix = work(fix)
    S.fixUnreviewed = true
    record.fixed = defects.length
    for (const d of defects) d.fixed = true
    const fixToConfirm = route(fix.findings.map((f) => ({ ...f, raisedBy: [`fix r${round}`] })), record, round, 'fix')
    if (fixToConfirm.length) {
      const fixSpec = confirmedSpec(await judge(fixToConfirm, record, round))
      if (fixSpec.length) {
        return finish('spec-contradiction', `the fix of round ${round} found ${fixSpec.length} spec contradiction(s) the skeptics confirmed: ${titles(fixSpec)}`)
      }
    }
    const fixFailing = fix.proofs.filter((p) => !p.passed)
    if (fixFailing.length) {
      return finish('proof-failing', `after the fix of round ${round}, the proof(s) ${fixFailing.map((p) => p.command).join(', ')} did not pass`)
    }
  }

  const major = defects.filter((f) => majors.includes(f.severity))
  const missing = record.lensesMissing.length
    ? `; the ${record.lensesMissing.join(', ')} reviewer(s) returned nothing, so the round saw less than the policy asks`
    : ''
  if (!major.length) {
    const fixed = defects.length ? `, and the ${defects.length} it did confirm were fixed` : ''
    return finish('nothing-major', `round ${round} confirmed no ${majors.join(' or ')} defect${fixed}${missing}`)
  }
  if (round === maxRounds) {
    return finish('round-limit', `round ${round}, the last of ${maxRounds}, confirmed ${major.length} ${majors.join(' or ')} defect(s) and they were fixed; that fix is unreviewed${missing}`)
  }
}

return finish('round-limit', `no round ran: \`buildReviewMaxRounds\` is ${maxRounds}`)
