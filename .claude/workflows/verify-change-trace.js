export const meta = {
  name: 'verify-change-trace',
  description: 'Trace every scenario of a product change to a proof run now, one tracer per group of scenarios, hold the code to its design through the lenses the session names, and have skeptics judge each gap',
  whenToUse: 'Step 4 of the change-verify skill, once per verification, from the change worktree',
  phases: [
    { title: 'Trace', detail: 'one tracer per group of scenarios reads each proof against its scenario and runs it' },
    { title: 'Design', detail: 'one agent per design lens holds the code to its part of design.md' },
    { title: 'Confirm', detail: 'skeptics, as many as the policy gives, judge each gap' },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Takes the scenario trace that this section of the change-verify skill asks for:
 * `.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced
 * One tracer per group of scenarios reads the tests the traceability record gives each scenario and
 * judges only whether they exercise what it states, running only a gate or check the fresh run does
 * not cover; one agent per design lens holds the code to its part of the change's design.md; and
 * skeptics judge every gap. This script matches each tracer's rows to its scenarios, takes each
 * row's result from the fresh run of `scripts/fresh-run.mjs`, decides each row's gap from its
 * reading, tallies each vote and computes every count, in code, never by an agent (the maintainer's
 * choice 4 in asdlc-openspec-j09.14's notes). It writes nothing: the session saves what it
 * returns to `.scratch/<change>-trace.json`, and `scripts/render-trace.mjs` writes the trace from it.
 * That section defines a gap and a finding below one, and every agent here is sent to read it.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the add-calculator-web-app verify ran an untracked
 * ancestor of this script, run wf_a6d4492d-9ca: 5 tracers, 3 design lenses and 3 skeptics for each
 * gap, 23 agents and 1.87M tokens (`bd show asdlc-openspec-as9`). It named that change, its paths
 * and its one manual-proof issue in its prompts, and told a skeptic that could not verify a
 * gap to answer refuted, the rule `.claude/workflows/build-change-task.js`'s header records
 * rejecting a real gap. `npm run worktree:gc` then deleted its two renderers with the change's
 * worktree, so the next change would have written all three again. Were this script wrong, it would
 * let through: a scenario in no group, or in two; a group a tracer returned short, padded or read at
 * another commit, counted as traced; a row whose gap the tracer's own words decided; a manual proof
 * no plan recorded; a kept row read again, or a row read again kept; and a gap no majority judged,
 * reported refuted.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file inside the change's worktree, so
 * that the script and the policy the session prints come from one commit, and `args`:
 *
 *   change     the change's name; its delta specs are under openspec/changes/<change>/specs/
 *   worktree   the worktree's absolute path, as `git rev-parse --show-toplevel` prints it there
 *   branch     the worktree's branch, as `git branch --show-current` prints it
 *   commit     the commit traced, as `git rev-parse HEAD` prints it; the trace's first line names it
 *   run        the fresh run at that commit, `.scratch/<change>-verify.json` as `scripts/fresh-run.mjs`
 *              writes it, its failing tests run once more; one of another commit is refused
 *   scenarios  how many `#### Scenario:` lines the delta specs hold, the sum of what
 *              `git grep -c "^#### Scenario:" -- openspec/changes/<change>/specs` prints
 *   groups     [{ key, capability, scenarios, files, focus, kept }], one tracer each:
 *                key        lower case letters, digits and dashes; the tracer's label
 *                capability the folder of its delta spec under openspec/changes/<change>/specs/
 *                scenarios  [{ requirement, scenario }], each as its `### Requirement:` and
 *                           `#### Scenario:` headings spell it: whole requirements of one capability
 *                           where they fit, at most `verifyTraceMaxScenarios` of them
 *                files      optional [path]: the proof files to start from
 *                focus      optional: what this group's tracer should also know
 *                kept       optional, on a run again only: [{ requirement, scenario, proofKind, proof,
 *                           exercises, readAt }], each a row of the earlier result that keeps its
 *                           reading, as the rule "Running again" in that section decides; `readAt`
 *                           is the commit the reading was taken at, and without it, previous.commit
 *   design     true when openspec/changes/<change>/design.md exists
 *   lenses     [{ key, label, focus }], one agent each: its label, and the design decisions it reads.
 *              None without a design; `verifyTraceDesignLenses` on a first run with one; on a run
 *              again, one for each part of the design the diff changes
 *   previous   on a run again: { commit, design }, the commit the earlier trace's first line names,
 *              and the design readings it keeps, [{ key, label, status, checked, readAt }] as the
 *              earlier result's `design.lenses` gives them: each `read` or `kept` there, with a
 *              decision checked, once, under a key no group or lens here has; with `lenses`, one per
 *              part of the design
 *   manual     optional [{ issue, covers }]: each manual proof the plan recorded, and what it proves
 *   policy     the `verifyTrace*` keys of `tools/policy.json`, as this prints them in the worktree:
 *                node -p "JSON.stringify(Object.fromEntries(Object.entries(require('./tools/policy.json')).filter(([k]) => k.startsWith('verifyTrace') && !k.endsWith('Means'))))"
 *   settled    optional [string]: decided already, by the user or an earlier run; no agent raises it
 *
 * WHAT IT JUDGES IN CODE.
 *
 *   The input, before any agent runs: every scenario in exactly one group, their sum `args.scenarios`,
 *   no group over `verifyTraceMaxScenarios`, the lens count above, a kept row only on a run again,
 *   for a scenario of its own group, and a kept design reading only as `previous` says.
 *
 *   A group. Its tracer returns `head`, the commit it read, and one row per scenario, matched by
 *   requirement and scenario title, each written with or without the `[<ID>]` token that
 *   scripts/check-openspec.mjs holds a living header to (`docs/decisions.md` § D-13, item 1). A group
 *   whose tracer returned nothing is `died`; read at another commit, or at a head that is not a
 *   commit of 7 to 40 hex digits, `stale`; with a row for a scenario not its own, two rows for one,
 *   none for one, or a row whose ID differs from the one its scenario carries, `mismatched`. Only a `traced` group's
 *   rows count and its gaps go on; the others come back with what the tracer returned, for the
 *   session to run again. A kept row's reading, its proofKind, proof and exercises, is the one `args`
 *   gives, and so is its `readAt`; its result is the one run now.
 *
 *   A row's result. A test proves a scenario only when the record gives it that scenario's ID: any
 *   other a tracer names is dropped, and its notes say so. The result is the fresh run's: `fail` when
 *   one of its tests failed, or failed and then passed its one re-run, which counts as failing
 *   (`docs/decisions.md` § D-13, item 12); `pass` when all passed; `not-run` otherwise, a test the run
 *   did not hold included. Only a row with no test takes its tracer's result, of the gate or check
 *   it ran.
 *
 *   A row's gap, from its reading, in this order: no proof, a manual proof that names no issue of
 *   `args.manual`, or no test and no gate or check that ran, is `no-proof`; a proof that does not
 *   exercise the scenario, `not-exercised`; one that failed, `fails`; one whose result is not `pass`,
 *   or a manual proof whose result is not `recorded`, `not-run`. `fails` and `not-run` are measured,
 *   and so is `no-proof` for a scenario the record gives no test: no skeptic judges them, and they
 *   stay gaps. A design lens reports its gaps itself, each `design`, and is `died`, `stale` or `read`.
 *
 *   The tally. Each gap that is not measured goes to `verifyTraceSkeptics` skeptics, who answer
 *   upheld, refuted or unverified. With n sent, floor(n/2)+1 upheld upholds it and as many refuted
 *   refutes it; anything else, a skeptic that returns nothing included, leaves it unverified, never
 *   refuted. A row's gap is refuted only with the reading a refuting skeptic established, a proof
 *   that exercises the scenario, which the row then carries in place of the tracer's, kept as
 *   `traced`; without one it is unverified. The corrected row's gap is taken again from its reading,
 *   so a proof that failed stays a measured gap. A finding below a gap goes to no skeptic: the
 *   session asks the user where it goes.
 *
 * WHAT IT RETURNS. { change, commit, branch, previous, stopped, why, rows, gaps, below, design,
 * manual, groups, counts }, the contract `scripts/lib/trace.mjs` reads. Each row carries its group,
 * capability, requirement, scenario, reading with its `tests`, result, `measured` (each test's status
 * in the fresh run), `checked` (a gate or check its tracer ran), notes, `readAt`, `kept` and `gap`, its kind
 * and outcome (`upheld`, `refuted`, `unverified` or `measured`) or null, and `traced`, the tracer's
 * own reading, where skeptics corrected it; `rows` is in the order of `args.groups`. `stopped` is one
 * of:
 *
 *   refused     an argument or the policy did not hold; `why` names it, and no agent ran
 *   agent-died  every tracer returned nothing, so no scenario was traced
 *   incomplete  a group or a lens is not `traced` or `read`; the session runs the workflow again
 *   gaps        every scenario traced and every lens read, and a gap was upheld, left unverified or
 *               measured
 *   no-gap      every scenario traced and every lens read, and each gap reported was refuted
 *
 * EXTENDING IT. `docs/decisions.md` § D-13 makes `.claude/skills/change-verify/SKILL.md` the home of
 * Verify's rules, in its item 17, and asdlc-openspec-j09.14 landed them: the fresh run, the re-run of
 * a failing test (item 12) and the verification report, `scripts/lib/verify-report.mjs`. Since then
 * the skill passes no `args.manual`, as item 7 has it, so a manual proof is a `no-proof` gap; the
 * `manual` proof kind goes with asdlc-openspec-9j8, which carries the one scenario a manual proof
 * stood for. A field added to the result is read by `scripts/lib/trace.mjs`, and the selftest runs
 * the renderers on this script's result, so a change on either side shows there.
 *
 * LABELS. Each tracer is labelled `trace <key>`, each design lens `design <key>`, and each skeptic
 * `skeptic <i>/<n> <key>: <title>`. scripts/workflows.selftest.mjs routes its stubbed agents by them:
 * change one here and change it there.
 *
 * NEEDS a change worktree with node, git and `bd` (the tracers read a manual proof with `bd show`,
 * which writes nothing), and the Workflow tool. Nothing here reads a file: the session passes the
 * policy as `args.policy` and the fresh run as `args.run`. `npm run workflows:selftest` runs this script against stubbed agents.
 */

const A = args || {}

const PROOF_KINDS = ['test', 'manual', 'test+manual', 'none']
const RESULTS = ['pass', 'fail', 'not-run', 'recorded']
const OUTCOMES = ['upheld', 'refuted', 'unverified']
/** The gaps a proof's run measured, which no skeptic's vote clears. */
const MEASURED = ['fails', 'not-run']
/** Whether a gap is measured: a proof's run, or a scenario the record gives no test that no gate or check proves. */
const isMeasured = (gap) => MEASURED.includes(gap.kind) || gap.byRecord === true
/** The design readings a run again may keep: read, or kept by the run before it. */
const KEEPABLE = ['read', 'kept']
const POLICY_KEYS = ['verifyTraceMaxScenarios', 'verifyTraceDesignLenses', 'verifyTraceSkeptics']
const HOME = '`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced'
const NAME = /^[a-z0-9][a-z0-9-]*$/
const COMMIT = /^[0-9a-f]{7,40}$/
const WHY = {
  'no-proof': 'no proof',
  'no-record': 'it names no manual proof the plan recorded',
  'no-test': 'it names no test the record gives it, and no check that ran',
  'no-record-test': 'the record gives it no test, and no check proves it',
  'not-exercised': 'the proof does not exercise what the scenario states',
  fails: 'the proof fails',
  'not-run': 'the proof did not pass when run now',
}

/* ----------------------------------------------------------------------------- the schemas ----- */

const BELOW = {
  type: 'array',
  items: {
    type: 'object',
    properties: { where: { type: 'string' }, title: { type: 'string' }, evidence: { type: 'string' } },
    required: ['where', 'title', 'evidence'],
  },
}

const TESTS = {
  type: 'array',
  items: { type: 'object', properties: { file: { type: 'string' }, name: { type: 'string' } }, required: ['file', 'name'] },
}

// `tests` are the record's tests that exercise the scenario, whose result code reads from the fresh
// run; `result` is given only for a gate or check the fresh run does not cover, which the tracer ran.
const TRACE_SCHEMA = {
  type: 'object',
  properties: {
    head: { type: 'string' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          requirement: { type: 'string' },
          scenario: { type: 'string' },
          proofKind: { type: 'string', enum: PROOF_KINDS },
          proof: { type: 'string' },
          tests: TESTS,
          exercises: { type: 'boolean' },
          result: { type: 'string', enum: RESULTS },
          notes: { type: 'string' },
        },
        required: ['requirement', 'scenario', 'proofKind', 'proof', 'tests', 'exercises', 'notes'],
      },
    },
    below: BELOW,
  },
  required: ['head', 'rows', 'below'],
}

const LENS_SCHEMA = {
  type: 'object',
  properties: {
    head: { type: 'string' },
    checked: {
      type: 'array',
      items: { type: 'object', properties: { decision: { type: 'string' }, verified: { type: 'string' } }, required: ['decision', 'verified'] },
    },
    gaps: {
      type: 'array',
      items: {
        type: 'object',
        properties: { decision: { type: 'string' }, where: { type: 'string' }, title: { type: 'string' }, evidence: { type: 'string' } },
        required: ['decision', 'where', 'title', 'evidence'],
      },
    },
    below: BELOW,
  },
  required: ['head', 'checked', 'gaps', 'below'],
}

// The reading is optional: a skeptic that refutes a row's gap returns the one it established.
const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: OUTCOMES },
    reason: { type: 'string' },
    proofKind: { type: 'string', enum: PROOF_KINDS },
    proof: { type: 'string' },
    tests: TESTS,
    exercises: { type: 'boolean' },
  },
  required: ['verdict', 'reason'],
}

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isWhole = (v) => Number.isInteger(v) && v >= 1
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
/** A header's ID token and title, `[<ID>] <title>` as scripts/check-openspec.mjs holds it; a header with no token is its title. */
const ID_TOKEN = /^\[([^\]\s]+)\] (\S.*)$/
const splitId = (name) => {
  const m = ID_TOKEN.exec(String(name).trim())
  return m ? { id: m[1], title: m[2].trim() } : { id: null, title: String(name).trim() }
}
/** Scenarios match by capability, requirement and title, each name with or without its ID token. */
const scenarioKey = (capability, requirement, scenario) => `${capability.trim()}\u0000${splitId(requirement).title}\u0000${splitId(scenario).title}`
/** The requirement or scenario whose ID the row gives differently from its header, or null; only two IDs clash. */
const idClash = (row, s) => ['requirement', 'scenario'].find((part) => {
  const a = splitId(row[part]).id
  const b = splitId(s[part]).id
  return a && b && a !== b
})
const isCommit = (v) => typeof v === 'string' && COMMIT.test(v.trim())
/** Whether two commits, each 7 to 40 hex digits, name the same one: the shorter is the longer's prefix. */
const sameCommit = (a, b) => {
  if (!isCommit(a) || !isCommit(b)) return false
  const x = a.trim()
  const y = b.trim()
  return x.startsWith(y) || y.startsWith(x)
}

/** Why the policy the session passed cannot drive a run, or null when it can. */
function policyProblem() {
  const p = A.policy
  if (!isPlainObject(p)) return 'args.policy must be the `verifyTrace*` keys of tools/policy.json, as the header prints them'
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return `args.policy has no ${missing.map((k) => `\`${k}\``).join(', ')}: pass the keys tools/policy.json holds`
  const bad = POLICY_KEYS.find((key) => !isWhole(p[key]))
  return bad ? `args.policy \`${bad}\` must be a whole number of at least 1` : null
}

/** Why the kept rows of group `g` cannot be passed on, or null when they can. `own` holds its scenarios' keys. */
function keptProblem(g, own) {
  if (!A.previous) return `group ${g.key}: kept rows need args.previous, the trace whose reading they keep`
  if (!Array.isArray(g.kept)) return `group ${g.key}: kept must be a list of rows`
  const seen = new Set()
  for (const [j, r] of g.kept.entries()) {
    const where = `group ${g.key}: kept[${j}]`
    if (!isPlainObject(r) || !isText(r.requirement) || !isText(r.scenario)) return `${where} must name its requirement and scenario`
    const key = scenarioKey(g.capability, r.requirement, r.scenario)
    if (!own.has(key)) return `${where} is ${r.requirement.trim()} / ${r.scenario.trim()}, which is not one of the group's scenarios`
    if (seen.has(key)) return `${where} keeps ${r.scenario.trim()} twice`
    seen.add(key)
    if (!PROOF_KINDS.includes(r.proofKind) || typeof r.proof !== 'string' || typeof r.exercises !== 'boolean') {
      return `${where} must carry the reading it keeps: proofKind, proof and exercises, as the earlier result gives them`
    }
    if (r.readAt !== undefined && !isCommit(r.readAt)) return `${where}: readAt must be the commit its reading was taken at, as the earlier result gives it`
    if (r.tests !== undefined && (!Array.isArray(r.tests) || r.tests.some((t) => !isPlainObject(t) || !isText(t.file) || !isText(t.name)))) return `${where}: tests must be a list of { file, name }`
  }
  return null
}

/** Why the design readings a run again keeps cannot be kept, or null. `names` holds every group's and lens's key. */
function keptLensProblem(kept, lensKeys, names) {
  const seen = new Set()
  for (const [i, d] of kept.entries()) {
    const where = `args.previous.design[${i}]`
    if (!isPlainObject(d) || !isText(d.key) || !isText(d.label) || !Array.isArray(d.checked)) {
      return `${where} must be { key, label, status, checked, readAt }, a reading as the earlier result's design.lenses gives it`
    }
    const key = d.key.trim()
    if (!KEEPABLE.includes(d.status)) {
      return `${where}: the lens ${key} came back ${JSON.stringify(d.status)} from the earlier run, not ${KEEPABLE.join(' or ')}, so it has no reading to keep; run it again`
    }
    if (!d.checked.length || !d.checked.every((c) => isPlainObject(c) && isText(c.decision) && typeof c.verified === 'string')) {
      return `${where}: the lens ${key} keeps no decision it checked, so it has no reading to keep; run it again`
    }
    if (d.readAt !== undefined && !isCommit(d.readAt)) return `${where}: readAt must be the commit the lens read, as the earlier result gives it`
    if (seen.has(key)) return `args.previous.design keeps the lens ${key} twice`
    seen.add(key)
    if (lensKeys.has(key)) return `the lens ${key} both runs again and keeps its earlier reading`
    if (names.has(key)) return `${where}: the kept lens ${key} has the key of a group; a kept lens keeps its own key`
  }
  return null
}

/** Why group `g` cannot be traced, or null when it can. `names` and `placed` span every group and lens. */
function groupProblem(g, i, names, placed) {
  if (!isPlainObject(g)) return `args.groups[${i}] must be an object`
  if (!isText(g.key) || !NAME.test(g.key)) return `args.groups[${i}].key must be lower case letters, digits and dashes`
  if (names.has(g.key)) return `the key ${g.key} names two groups or lenses`
  names.add(g.key)
  if (!isText(g.capability)) return `group ${g.key}: capability must name its delta spec's folder`
  if (!Array.isArray(g.scenarios) || !g.scenarios.length) return `group ${g.key}: scenarios must be a non-empty list of { requirement, scenario }`
  const most = A.policy.verifyTraceMaxScenarios
  if (g.scenarios.length > most) {
    return `group ${g.key}: ${g.scenarios.length} scenarios, more than the ${most} \`verifyTraceMaxScenarios\` gives one tracer; split it`
  }
  const own = new Set()
  for (const [j, s] of g.scenarios.entries()) {
    if (!isPlainObject(s) || !isText(s.requirement) || !isText(s.scenario)) {
      return `group ${g.key}: scenarios[${j}] must be { requirement, scenario }, each as its heading spells it`
    }
    const key = scenarioKey(g.capability, s.requirement, s.scenario)
    if (placed.has(key)) {
      return `the scenario ${g.capability.trim()} / ${s.requirement.trim()} / ${s.scenario.trim()} is in groups ${placed.get(key)} and ${g.key}; each is traced once`
    }
    placed.set(key, g.key)
    own.add(key)
  }
  if (g.files !== undefined && (!Array.isArray(g.files) || g.files.some((f) => !isText(f)))) return `group ${g.key}: files must be a list of paths`
  if (g.focus !== undefined && !isText(g.focus)) return `group ${g.key}: focus must be a non-empty string`
  return g.kept === undefined ? null : keptProblem(g, own)
}

/** Why the lenses and the kept design readings do not fit the design and the policy, or null. */
function lensProblem(names) {
  const lenses = A.lenses === undefined ? [] : A.lenses
  if (!Array.isArray(lenses)) return 'args.lenses must be a list of { key, label, focus }'
  const groupKeys = new Set(names)
  for (const [i, l] of lenses.entries()) {
    if (!isPlainObject(l) || !isText(l.key) || !NAME.test(l.key)) return `args.lenses[${i}].key must be lower case letters, digits and dashes`
    if (names.has(l.key)) return `the key ${l.key} names two groups or lenses`
    names.add(l.key)
    if (!isText(l.label) || !isText(l.focus)) return `lens ${l.key}: label and focus must be non-empty: its name, and the decisions it reads`
  }
  const kept = (A.previous && A.previous.design) || []
  const badKept = keptLensProblem(kept, new Set(lenses.map((l) => l.key)), groupKeys)
  if (badKept) return badKept
  const n = A.policy.verifyTraceDesignLenses
  if (!A.design) return lenses.length || kept.length ? 'args.design says the change has no design.md, so it takes no lens and keeps no lens reading' : null
  if (!A.previous) return lenses.length === n ? null : `a first run of a change with a design takes ${n} lens(es), as \`verifyTraceDesignLenses\` gives, not ${lenses.length}`
  if (lenses.length + kept.length !== n) {
    return `a run again runs a lens for each part of the design the diff changes and keeps the rest: ${lenses.length} run and ${kept.length} kept, not the ${n} \`verifyTraceDesignLenses\` gives`
  }
  return null
}

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  const badPolicy = policyProblem()
  if (badPolicy) return badPolicy
  for (const key of ['change', 'worktree', 'branch']) if (!isText(A[key])) return `args.${key} must be a non-empty string`
  if (!isText(A.commit) || !COMMIT.test(A.commit.trim())) return 'args.commit must be the commit traced, as `git rev-parse HEAD` prints it'
  const r = A.run
  if (!isPlainObject(r) || !Array.isArray(r.tests) || !Array.isArray(r.specs)) return 'args.run must be the fresh run, `.scratch/<change>-verify.json` as scripts/fresh-run.mjs writes it'
  if (!sameCommit(r.commit, A.commit)) return `args.run is the fresh run at ${String(r.commit).trim() || 'no commit'}, not ${A.commit.trim()}: run \`npm run tests:fresh\` at the commit traced`
  if (!isWhole(A.scenarios)) return 'args.scenarios must be how many `#### Scenario:` lines the delta specs hold'
  if (typeof A.design !== 'boolean') return 'args.design must say whether openspec/changes/<change>/design.md exists'
  if (A.previous !== undefined) {
    const p = A.previous
    if (!isPlainObject(p) || !isText(p.commit) || !COMMIT.test(p.commit.trim())) {
      return 'args.previous must be { commit, design }, with the commit the earlier trace names on its first line'
    }
    if (p.design !== undefined && !Array.isArray(p.design)) {
      return 'args.previous.design must list each design reading kept, as the earlier result gives it'
    }
  }
  if (!Array.isArray(A.groups) || !A.groups.length) return 'args.groups must be a non-empty list of { key, capability, scenarios }'
  const names = new Set()
  const placed = new Map()
  for (const [i, g] of A.groups.entries()) {
    const problem = groupProblem(g, i, names, placed)
    if (problem) return problem
  }
  if (placed.size !== A.scenarios) {
    return `args.groups hold ${placed.size} scenario(s), but args.scenarios says the delta specs hold ${A.scenarios}: every scenario is in one group`
  }
  const badLens = lensProblem(names)
  if (badLens) return badLens
  if (A.manual !== undefined && (!Array.isArray(A.manual) || A.manual.some((m) => !isPlainObject(m) || !isText(m.issue) || !isText(m.covers)))) {
    return 'args.manual must be a list of { issue, covers }, each a manual proof the plan recorded'
  }
  if (A.settled !== undefined && (!Array.isArray(A.settled) || A.settled.some((s) => !isText(s)))) return 'args.settled must be a list of non-empty strings'
  return null
}

/* ------------------------------------------------------------------------------ the prompts ----- */

const settledBlock = () => (A.settled && A.settled.length ? `\n\n## Settled already; do not raise these again\n\n${A.settled.map((s) => `- ${s}`).join('\n')}` : '')

function rules() {
  const design = A.design ? `, and its design is openspec/changes/${A.change}/design.md` : ''
  return [
    `You are one agent of the scenario trace of the product change ${A.change}, in the git worktree ${A.worktree}, on branch ${A.branch} at commit ${A.commit}. Its delta specs are under openspec/changes/${A.change}/specs/${design}.`,
    `Read ${HOME} first: it defines a gap, and a finding below one. The session that ran you writes the trace.`,
    'Rules for this run, on top of CLAUDE.md and .worktree/CONTEXT.md:',
    '- Change nothing: no edit, commit, stash or tracker write. Throwaway files go under .scratch/ only.',
    '- Run each command as its own Bash call, as CLAUDE.md asks.',
    '- Stop every process you start before you return, and leave nothing listening.',
  ].join('\n')
}

function manualBlock() {
  if (!A.manual || !A.manual.length) return '## Manual proofs\n\nThe plan recorded none.'
  const list = A.manual.map((m) => `- ${m.issue.trim()}: ${m.covers}`).join('\n')
  return `## Manual proofs the plan recorded\n\nRead each with \`bd show <issue>\`, which writes nothing. A row proved by hand names its issue in proof.\n\n${list}`
}

function keptBlock(g) {
  if (!g.kept || !g.kept.length) return ''
  const list = g.kept.map((r) => `- ${r.requirement.trim()} / ${r.scenario.trim()}: ${r.proofKind}, ${r.proof}`).join('\n')
  return `\n\n## Kept from the trace at ${A.previous.commit.trim()}\n\nThese keep their reading, under "Running again" in that section: return their rows and read none again.\n\n${list}`
}

/** A scenario's line in its tracer's prompt, with the tests the record gives it. */
function scenarioLine(s) {
  const tests = recordTests(s.scenario)
  const given = tests === null ? 'no ID the record lists; find them yourself' : tests.length ? tests.map((t) => `${t.file}: ${t.name} (${t.role})`).join('; ') : 'the record gives it no test'
  return `- ${s.requirement.trim()} / ${s.scenario.trim()}\n  tests: ${given}`
}

function tracePrompt(g) {
  const files = g.files && g.files.length ? `\n\nStart from these proof files: ${g.files.join(', ')}.` : ''
  const focus = g.focus ? `\n\n## For this group, also\n\n${g.focus}` : ''
  return [
    rules(),
    '',
    `## Your group: ${g.key}`,
    '',
    `The capability ${g.capability.trim()}, in openspec/changes/${A.change}/specs/${g.capability.trim()}/spec.md. Its scenarios, each as requirement / scenario, with the record's tests for it:`,
    '',
    g.scenarios.map(scenarioLine).join('\n') + files,
    '',
    '## For each scenario',
    '',
    'Code reads each result from a fresh run of every test. You judge only whether a test exercises its scenario.',
    "1. Read each test given line by line: it exercises the scenario only when it drives the WHEN and asserts every THEN and AND, with the values the spec writes out. Never trust a test's name. Return in tests those that do, with proofKind test and exercises true when together they do; say why not in notes.",
    '2. With no test given, name the gate or check that proves it, run it, and give its result; or proofKind none. A manual proof counts only if listed below.',
    '',
    'Return one row per scenario above, its requirement and scenario verbatim, and head as `git rev-parse HEAD` prints it. Report each finding below a gap under below.' +
      keptBlock(g) +
      focus,
    '',
    manualBlock() + settledBlock(),
  ].join('\n')
}

function lensPrompt(l) {
  return [
    rules(),
    '',
    `## Your lens: ${l.label}`,
    '',
    l.focus,
    '',
    `Read openspec/changes/${A.change}/design.md. For each decision in your part of it, add to checked the decision and what you verified. Report a gap only where the code, the tests or the wiring as committed do not do what the decision says, with the file and line on both sides. Report each finding below a gap under below, and head as \`git rev-parse HEAD\` prints it.` +
      settledBlock(),
  ].join('\n')
}

function skepticPrompt(g, i, n) {
  const at = g.kind === 'design' ? `Decision: ${g.decision}` : `Scenario: ${g.capability} / ${g.requirement} / ${g.scenario}`
  return [
    rules(),
    '',
    `You are skeptic ${i} of ${n} on one gap. Judge it against the delta specs, the design and the manual proofs below, and nothing else. Read the files it names and, where it helps, run the proof it names.`,
    '',
    '- upheld: you checked it, and it holds, as the kind it claims.',
    '- refuted: you checked it, and it is wrong: a proof does exercise the scenario, the code does follow the decision, or it is not a gap as that section defines one. Refuting a scenario\'s gap, also return the reading you established, proofKind, proof, tests and exercises, as a tracer gives them: without a proof that exercises the scenario, a refutation clears nothing.',
    '- unverified: you could not establish either. Say what stopped you. Never answer refuted because you could not verify it.',
    '',
    manualBlock() + settledBlock(),
    '',
    '## The gap',
    '',
    `Kind: ${g.kind}`,
    at,
    `Where: ${g.where}`,
    `Title: ${g.title}`,
    `Evidence: ${g.evidence}`,
  ].join('\n')
}

/* ------------------------------------------------------------------------ judging a report ----- */

/** The issue ids a proof names, as whole words. */
const idsIn = (text) => (String(text).match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) || []).map((w) => w.replace(/[.]+$/, ''))

const testKey = (t) => `${String(t.file).trim()}\u0000${String(t.name).trim()}`
/** The fresh run's tests by file and name, built once the arguments hold. */
let ran = new Map()
/** A test's status in the fresh run: a fail and then a pass on its one re-run is `flaky`, which counts as failing. */
const runStatus = (t) => (t.status === 'fail' ? (t.rerun && t.rerun.status === 'pass' ? 'flaky' : 'fail') : t.status)

/** The tests the record gives a scenario's ID, or null for a scenario whose header names no ID the record lists. */
function recordTests(scenario) {
  const id = splitId(scenario).id
  const spec = id ? A.run.specs.find((x) => x.id === id) : null
  if (!spec || !isPlainObject(spec.tests)) return null
  const t = spec.tests
  return [...(t.happy || []).map((x) => ({ ...x, role: 'happy' })), ...(t.negative || []).map((x) => ({ ...x, role: 'negative' })), ...(t.cite || []).map((x) => ({ ...x, role: 'cites' }))]
}

/**
 * A reading's result, measured in code: the fresh run's statuses of its tests, `fail` when one
 * failed or is flaky, `pass` when all passed and `not-run` otherwise; for a reading with no test, the
 * result of the gate or check its tracer ran, `own`.
 */
function measure(reading, own) {
  const tests = reading.tests || []
  if (reading.proofKind === 'none') return { result: 'not-run', measured: [] }
  if (!tests.length) return { result: own || 'not-run', measured: [] }
  const measured = tests.map((t) => {
    const found = ran.get(testKey(t))
    return { file: t.file, name: t.name, status: found ? runStatus(found) : 'not in the run' }
  })
  const statuses = measured.map((m) => m.status)
  const result = statuses.some((s) => s === 'fail' || s === 'flaky') ? 'fail' : statuses.every((s) => s === 'pass') ? 'pass' : 'not-run'
  return { result, measured }
}

/** A row's gap, as the header orders the kinds, or null. */
function gapOf(row) {
  if (row.proofKind === 'none') return { kind: 'no-proof', why: WHY['no-proof'] }
  if (row.proofKind !== 'test') {
    const recorded = (A.manual || []).map((m) => m.issue.trim())
    if (!idsIn(row.proof).some((id) => recorded.includes(id))) return { kind: 'no-proof', why: WHY['no-record'] }
  }
  if (row.proofKind !== 'manual' && !(row.tests || []).length && !row.checked) return { kind: 'no-proof', why: WHY['no-test'] }
  if (!row.exercises) return { kind: 'not-exercised', why: WHY['not-exercised'] }
  if (row.result === 'fail') return { kind: 'fails', why: WHY.fails }
  const passed = row.proofKind === 'manual' ? row.result === 'recorded' : row.result === 'pass'
  return passed ? null : { kind: 'not-run', why: WHY['not-run'] }
}

/** The gap entry of `row`'s gap `gap`, as the skeptics and the trace read it. */
const gapEntry = (row, gap) => ({
  kind: gap.kind,
  source: row.group,
  capability: row.capability,
  requirement: row.requirement,
  scenario: row.scenario,
  decision: '',
  where: row.proof.trim() || '(no proof)',
  title: `${row.scenario}: ${gap.why}`,
  evidence: row.notes,
})

/** A measured gap's entry: no skeptic judges it. */
const measuredEntry = (entry) => ({ ...entry, outcome: 'measured', skeptics: 0, upheld: 0, refuted: 0, votes: [] })

/** What group `g`'s tracer returned, judged: its status, and, when traced, its rows and gaps. */
function judgeTrace(g, out) {
  const base = { key: g.key, capability: g.capability.trim(), scenarios: g.scenarios.length, rows: [], gaps: [], below: [] }
  if (!out) return { ...base, status: 'died', problems: ['the tracer returned nothing'] }
  if (!sameCommit(out.head, A.commit)) {
    return { ...base, status: 'stale', problems: [`the tracer read ${String(out.head).trim() || 'no commit'}, not ${A.commit.trim()}`], returned: out.rows }
  }
  const own = new Map(g.scenarios.map((s) => [scenarioKey(g.capability, s.requirement, s.scenario), s]))
  const byKey = new Map()
  const problems = []
  for (const r of out.rows) {
    const key = scenarioKey(g.capability, r.requirement, r.scenario)
    if (!own.has(key)) problems.push(`a row for ${r.requirement.trim()} / ${r.scenario.trim()}, which is not one of its scenarios`)
    else if (byKey.has(key)) problems.push(`two rows for ${r.scenario.trim()}`)
    else if (idClash(r, own.get(key))) problems.push(`the row for ${own.get(key).scenario.trim()} gives its ${idClash(r, own.get(key))} another ID`)
    else byKey.set(key, r)
  }
  const missing = [...own.keys()].filter((key) => !byKey.has(key))
  if (missing.length) problems.push(`no row for ${missing.map((key) => own.get(key).scenario.trim()).join(', ')}`)
  if (problems.length) return { ...base, status: 'mismatched', problems, returned: out.rows }

  const kept = new Map((g.kept || []).map((r) => [scenarioKey(g.capability, r.requirement, r.scenario), r]))
  const rows = []
  const gaps = []
  for (const [key, s] of own) {
    const r = byKey.get(key)
    const k = kept.get(key)
    const from = k || r
    // Only a test the record gives the scenario proves it: one citing another ID is dropped, and said so.
    const allowed = recordTests(s.scenario)
    const named = Array.isArray(from.tests) ? from.tests : []
    const tests = allowed ? named.filter((t) => allowed.some((a) => testKey(a) === testKey(t))) : named
    const dropped = named.filter((t) => !tests.includes(t))
    const reading = { proofKind: from.proofKind, proof: from.proof, exercises: from.exercises, tests: tests.map((t) => ({ file: t.file, name: t.name })) }
    const checked = !tests.length && reading.proofKind !== 'manual' && RESULTS.includes(r.result)
    const { result, measured } = measure(reading, r.result)
    const note = dropped.length ? ` [dropped, as not the record's tests for it: ${dropped.map((t) => `${t.file}: ${t.name}`).join('; ')}]` : ''
    const row = {
      group: g.key,
      capability: g.capability.trim(),
      requirement: s.requirement.trim(),
      scenario: s.scenario.trim(),
      ...reading,
      result,
      measured,
      checked,
      notes: r.notes + note,
      readAt: k ? (k.readAt || A.previous.commit).trim() : A.commit.trim(),
      kept: Boolean(k),
      gap: null,
    }
    const gap = gapOf(row)
    if (gap) {
      // A scenario the record gives no test, and no gate or check proves, has no proof as measured.
      const byRecord = gap.kind === 'no-proof' && allowed !== null && allowed.length === 0
      gaps.push({ ...gapEntry(row, gap), byRecord })
      row.gap = { kind: gap.kind, outcome: null, byRecord }
    }
    rows.push(row)
  }
  return { ...base, status: 'traced', problems: [], rows, gaps, below: out.below.map((b) => ({ source: g.key, ...b })) }
}

/** What lens `l` returned, judged: its status, and, when read, its decisions and gaps. */
function judgeLens(l, out) {
  const base = { key: l.key, label: l.label, readAt: A.commit.trim(), kept: false, checked: [], gaps: [], below: [] }
  if (!out) return { ...base, status: 'died', problems: ['the lens returned nothing'] }
  if (!sameCommit(out.head, A.commit)) return { ...base, status: 'stale', problems: [`the lens read ${String(out.head).trim() || 'no commit'}, not ${A.commit.trim()}`] }
  const gaps = out.gaps.map((x) => ({ kind: 'design', source: l.key, capability: '', requirement: '', scenario: '', decision: x.decision, where: x.where, title: x.title, evidence: x.evidence }))
  return { ...base, status: 'read', problems: [], checked: out.checked, gaps, below: out.below.map((b) => ({ source: l.key, ...b })) }
}

/** Majority of those sent, as the header states. A missing vote is an unverified one. */
function tally(votes) {
  const n = votes.length
  const majority = Math.floor(n / 2) + 1
  const cast = votes.map((v) => v || { verdict: 'unverified', reason: 'the skeptic returned nothing' })
  const upheld = cast.filter((v) => v.verdict === 'upheld').length
  const refuted = cast.filter((v) => v.verdict === 'refuted').length
  const outcome = upheld >= majority ? 'upheld' : refuted >= majority ? 'refuted' : 'unverified'
  const proving = cast.find((v) => v.verdict === 'refuted' && PROOF_KINDS.includes(v.proofKind) && v.proofKind !== 'none' && isText(v.proof) && v.exercises === true)
  const reading = proving ? { proofKind: proving.proofKind, proof: proving.proof.trim(), exercises: true, ...(Array.isArray(proving.tests) && proving.tests.length ? { tests: proving.tests } : {}) } : null
  return { outcome, skeptics: n, upheld, refuted, votes: cast.map((v) => `${v.verdict}: ${v.reason}`), reading }
}

/** Each gap with the outcome of its skeptics. */
async function confirm(gaps) {
  if (!gaps.length) return []
  const n = A.policy.verifyTraceSkeptics
  const judged = await pipeline(
    gaps,
    (g) =>
      parallel(
        Array.from({ length: n }, (_, i) => () =>
          agent(skepticPrompt(g, i + 1, n), { label: `skeptic ${i + 1}/${n} ${g.source}: ${g.title.slice(0, 40)}`, phase: 'Confirm', schema: VERDICT_SCHEMA }),
        ),
      ),
    (votes) => tally(votes),
  )
  return gaps.map((g, i) => ({ ...g, ...(judged[i] || tally(Array.from({ length: n }, () => null))) }))
}

/**
 * A row whose gap was judged, with the gap entries it now carries, as the header's tally says: a
 * refutation clears a gap only with a proving reading, which the row then carries, and the
 * corrected row's gap is taken again from it.
 */
function settle(r, judged) {
  const { reading, ...entry } = judged
  const stands = (why) => ({ row: { ...r, gap: { kind: entry.kind, outcome: 'unverified' } }, gaps: [{ ...entry, outcome: 'unverified', votes: [...entry.votes, why] }] })
  if (entry.outcome !== 'refuted') return { row: { ...r, gap: { kind: entry.kind, outcome: entry.outcome } }, gaps: [entry] }
  if (!reading) return stands('a majority refuted it, but no refuting skeptic gave a reading whose proof exercises the scenario, so it stands unverified')
  let corrected = { ...r, ...reading, traced: { proofKind: r.proofKind, proof: r.proof, exercises: r.exercises } }
  if (reading.tests) {
    // The skeptic's tests prove it only where the record gives them the scenario, and their result is the fresh run's.
    const allowed = recordTests(r.scenario)
    const tests = reading.tests.filter((t) => !allowed || allowed.some((a) => testKey(a) === testKey(t))).map((t) => ({ file: t.file, name: t.name }))
    corrected = { ...corrected, tests, checked: false, ...measure({ ...corrected, tests }, undefined) }
  }
  const again = gapOf(corrected)
  if (!again) return { row: { ...corrected, gap: { kind: entry.kind, outcome: 'refuted' } }, gaps: [entry] }
  if (!MEASURED.includes(again.kind)) return stands(`a majority refuted it, but the reading a skeptic gave still has a gap: ${again.why}`)
  return { row: { ...corrected, gap: { kind: again.kind, outcome: 'measured' } }, gaps: [entry, measuredEntry(gapEntry(corrected, again))] }
}

/** A traced group with its gaps settled: measured ones kept, the rest judged, each row carrying its outcome. */
async function confirmGroup(t) {
  if (t.status !== 'traced') return t
  const judged = await confirm(t.gaps.filter((g) => !isMeasured(g)))
  const byScenario = new Map(judged.map((g) => [scenarioKey(g.capability, g.requirement, g.scenario), g]))
  const rows = []
  const gaps = []
  for (const r of t.rows) {
    if (!r.gap) rows.push(r)
    else if (isMeasured(r.gap)) {
      rows.push({ ...r, gap: { kind: r.gap.kind, outcome: 'measured' } })
      gaps.push(measuredEntry(gapEntry(r, { kind: r.gap.kind, why: r.gap.byRecord ? WHY['no-record-test'] : WHY[r.gap.kind] })))
    } else {
      const settled = settle(r, byScenario.get(scenarioKey(r.capability, r.requirement, r.scenario)))
      rows.push(settled.row)
      gaps.push(...settled.gaps)
    }
  }
  return { ...t, rows, gaps }
}

async function confirmLens(d) {
  return d.status === 'read' ? { ...d, gaps: (await confirm(d.gaps)).map(({ reading, ...g }) => g) } : d
}

/* ---------------------------------------------------------------------------------- the run ----- */

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

function result(stopped, why, groups, lenses) {
  const rows = groups.flatMap((g) => g.rows)
  const gaps = [...groups.flatMap((g) => g.gaps), ...lenses.flatMap((l) => l.gaps)]
  const below = [...groups.flatMap((g) => g.below), ...lenses.flatMap((l) => l.below)]
  const kept = ((A.previous && A.previous.design) || []).map((d) => ({
    key: d.key.trim(),
    label: d.label,
    readAt: (d.readAt || A.previous.commit).trim(),
    kept: true,
    status: 'kept',
    problems: [],
    checked: d.checked,
  }))
  const byCapability = {}
  for (const capability of [...new Set(rows.map((r) => r.capability))].sort(byCodePoint)) byCapability[capability] = rows.filter((r) => r.capability === capability).length
  const byProofKind = {}
  for (const kind of PROOF_KINDS) byProofKind[kind] = rows.filter((r) => r.proofKind === kind).length
  const outcome = (o) => gaps.filter((g) => g.outcome === o).length
  const counts = {
    scenarios: A.scenarios,
    groups: groups.length,
    traced: groups.filter((g) => g.status === 'traced').length,
    lenses: lenses.length + kept.length,
    read: lenses.filter((l) => l.status === 'read').length,
    keptLenses: kept.length,
    rows: rows.length,
    keptRows: rows.filter((r) => r.kept).length,
    correctedRows: rows.filter((r) => r.traced).length,
    byCapability,
    byProofKind,
    gaps: gaps.length,
    measured: outcome('measured'),
    judged: gaps.length - outcome('measured'),
    upheld: outcome('upheld'),
    refuted: outcome('refuted'),
    unverified: outcome('unverified'),
    skeptics: gaps.reduce((n, g) => n + g.skeptics, 0),
    below: below.length,
  }
  return {
    change: A.change,
    commit: A.commit.trim(),
    branch: A.branch,
    previous: A.previous ? A.previous.commit.trim() : null,
    stopped,
    why: typeof why === 'function' ? why(counts) : why,
    rows,
    gaps,
    below,
    design: {
      present: A.design,
      lenses: [...lenses.map(({ key, label, readAt, kept: k, status, problems, checked }) => ({ key, label, readAt, kept: k, status, problems, checked })), ...kept],
    },
    manual: A.manual || [],
    groups: groups.map(({ key, capability, scenarios, status, problems, returned }) => ({ key, capability, scenarios, status, problems, returned: returned || [] })),
    counts,
  }
}

const badArgs = argsProblem()
if (badArgs) {
  log(`Refused: ${badArgs}`)
  return { change: A.change || null, commit: null, branch: null, previous: null, stopped: 'refused', why: badArgs, rows: [], gaps: [], below: [], design: null, manual: [], groups: [], counts: null }
}

ran = new Map(A.run.tests.map((t) => [testKey(t), t]))
phase('Trace')
log(`${A.change} at ${A.commit.trim()}: ${A.scenarios} scenario(s) in ${A.groups.length} group(s), ${(A.lenses || []).length} design lens(es) to run`)
const traced = await pipeline(
  A.groups,
  (g) => agent(tracePrompt(g), { label: `trace ${g.key}`, phase: 'Trace', schema: TRACE_SCHEMA }),
  (out, g) => confirmGroup(judgeTrace(g, out)),
)
const groups = A.groups.map((g, i) => traced[i] || judgeTrace(g, null))

const lensList = A.lenses || []
let lenses = []
if (lensList.length) {
  phase('Design')
  const read = await pipeline(
    lensList,
    (l) => agent(lensPrompt(l), { label: `design ${l.key}`, phase: 'Design', schema: LENS_SCHEMA }),
    (out, l) => confirmLens(judgeLens(l, out)),
  )
  lenses = lensList.map((l, i) => read[i] || judgeLens(l, null))
}

for (const g of groups.filter((x) => x.status !== 'traced')) log(`Group ${g.key} ${g.status}: ${g.problems.join('; ')}`)
for (const l of lenses.filter((x) => x.status !== 'read')) log(`Lens ${l.key} ${l.status}: ${l.problems.join('; ')}`)

const tallied = (c) =>
  `${c.gaps} gap(s), ${c.measured} measured and ${c.judged} judged by ${c.skeptics} skeptic(s): ${c.upheld} upheld, ${c.unverified} unverified, ${c.refuted} refuted; ${c.below} finding(s) below a gap`
let out
if (groups.every((g) => g.status === 'died')) {
  out = result('agent-died', 'every tracer returned nothing, so no scenario was traced', groups, lenses)
} else if (groups.some((g) => g.status !== 'traced') || lenses.some((l) => l.status !== 'read')) {
  const missing = [...groups.filter((g) => g.status !== 'traced').map((g) => `group ${g.key} ${g.status}`), ...lenses.filter((l) => l.status !== 'read').map((l) => `lens ${l.key} ${l.status}`)]
  out = result('incomplete', (c) => `${missing.join(', ')}; ${c.rows} of ${c.scenarios} scenario(s) traced; ${tallied(c)}`, groups, lenses)
} else {
  const open = groups.some((g) => g.gaps.some((x) => x.outcome !== 'refuted')) || lenses.some((l) => l.gaps.some((x) => x.outcome !== 'refuted'))
  out = result(open ? 'gaps' : 'no-gap', (c) => `every one of the ${c.scenarios} scenario(s) traced, ${c.read} design lens(es) read and ${c.keptLenses} kept; ${tallied(c)}`, groups, lenses)
}
log(`Stopped (${out.stopped}): ${out.why}`)
return out
