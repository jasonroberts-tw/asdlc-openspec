export const meta = {
  name: 'review-prompts',
  description: 'Review the prompt files a batch of prompt-run analyses concerns, one agent per file or group of files in a worktree of its own, have skeptics judge each edit, and return which branches to merge, which analyses were read and which findings were held',
  whenToUse: 'Step 4 of the continuous-prompt-improvement agent, once per review, from the review worktree',
  phases: [
    { title: 'Review', detail: 'one agent per file or group of files, each in its own worktree, changes its files or leaves them' },
    { title: 'Confirm', detail: "skeptics, as many as the policy gives the finding's severity, judge each edit against its branch's diff" },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Runs the file agents of one prompt review, and the skeptics that judge their edits.
 * The session running the `continuous-prompt-improvement` agent collects the pending analyses, counts
 * each finding across runs, holds each one below the threshold, groups the rest by the prompt file
 * each concerns, and passes the groups here. Each group gets one agent, in a worktree of its own,
 * which changes its files and commits on its branch, or changes nothing. Skeptics then judge each
 * change against its branch's diff. This script judges each agent's report and tallies each vote in
 * code, and returns the branches the session may merge, the analyses it may mark read and the
 * findings it holds. It merges nothing, pushes nothing and writes nothing to the tracker: the session
 * does all three (`.claude/agents/continuous-prompt-improvement.md` § 5 and § 6).
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-25 two reviews of `.claude/skills/bead/SKILL.md` ran at
 * once, one per run, and collided: #48 and #51 were superseded by #53, which carries one commit from
 * each (asdlc-openspec-lzr). A batch has one review over every pending analysis, so that cannot recur,
 * but it moves the risk here. Were this script wrong, it would let through: an agent that edited a
 * file another group owns, whose branch then conflicts or overwrites; a branch the WorktreeCreate hook
 * never provisioned (`worktree-<name>`, with no briefing and the wrong base, as the header of
 * scripts/hooks/worktree-create.mjs tables), merged as if it were; a change whose gates failed; a
 * change for a finding its group was not given; and an analysis marked read although the agent for
 * one of its files returned nothing, so that its finding is never reviewed. Since asdlc-openspec-pnm
 * it would also let through a finding below the threshold proposed as an edit, a branch merged with
 * an edit a majority of its skeptics did not uphold, and a finding read and proposed nowhere that no
 * held line records, so that its count starts again at the next review.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file inside the review's worktree, so
 * that the script and the agent file its agents read come from one commit, and `args`:
 *
 *   groups    [{ id, files, findings }], one per agent:
 *               id        a short name, lower case, digits and dashes: the agent's label
 *               files     the repository-relative paths this agent may change; each file is in one
 *                         group only
 *               findings  [{ key, title, severity, count, runs, evidence }], each finding about
 *                         these files that met the threshold:
 *                 key       `<file>#<name>`: one of the group's files, `#`, and a name in lower case
 *                           letters, digits and dashes; one finding in the batch has it, and its
 *                           held lines spell it (`CLAUDE.md` § Prompt reviews)
 *                 title     the finding, in one line
 *                 severity  blocker, major or minor, as `.claude/agents/pr-reviewer.md` § 2. Maintainability defines them
 *                 count     how many distinct runs have shown it: those below and those its held
 *                           lines name
 *                 runs      the run ids in this batch that showed it, each as its marker line gives it
 *                 evidence  what those runs showed
 *   policy    the `promptReview*` keys of `tools/policy.json`, as the agent's § 4 prints them; this
 *             script reads the three in POLICY_KEYS below and ignores the rest
 *   settled   optional [string]: decided already, by the maintainer or an earlier review; no agent
 *             raises it again
 *
 * THE THRESHOLD, checked before any agent runs. A finding meets it when its count is at least
 * `promptReviewRecurrenceCount` or its severity is in `promptReviewMajorSeverities`. The session holds
 * every finding that meets neither, so one that reaches this script refuses the run. Each change
 * returns `met`, the condition its finding met: `recurrence`, `severity`, or both.
 *
 * WHAT IT RETURNS. { stopped, why, groups, merge, runsRead, runsHeld, findingsHeld, counts }. Every
 * count in it is computed here, never by an agent. `stopped` is one of:
 *
 *   refused     an argument did not hold; `why` names it, and no agent ran
 *   agent-died  every file agent returned nothing
 *   done        every file agent ran, or some did; `groups` says which
 *
 * Each entry of `groups` is the agent's report with its `id`, its `files`, its `findings`, its
 * `runs`, a `status` and the `problems` found with it. The status is one of:
 *
 *   merge       it changed its files, nothing below was wrong, and a majority of each change's
 *               skeptics upheld it: its branch is in `merge`
 *   unchanged   it changed nothing, and said why
 *   not-upheld  it changed its files and broke no rule below, but one of its changes was not upheld;
 *               its branch is not merged, its runs are read, and its findings are held
 *   refused     its report broke a rule below; its branch is not merged, and `problems` says why
 *   died        the agent returned nothing
 *
 * Each change a skeptic judged carries its finding's `severity`, `count` and `met`, the `outcome`
 * (upheld, refuted or unverified), how many `skeptics` were sent, and each one's vote in `votes`.
 *
 * THE RULES a report is held to, in this order, each a problem when broken:
 *
 *   - its branch is an `agent/` branch, as the WorktreeCreate hook names one, where the harness's own
 *     fallback names it `worktree-<name>` (CLAUDE.md § Git workflow);
 *   - no two groups report one branch;
 *   - a changed report lists the files its branch changes, every one of them its own, states at
 *     least one change, each to a file of its own, and ran gates that all passed;
 *   - an unchanged report lists no changed file and states no change;
 *   - every change and every finding set aside names a finding of its own group, and every finding of
 *     its group is changed or set aside.
 *
 *   These rules judge what each agent reports of its branch and its files, which a script that runs
 *   no git cannot check; the session checks each branch's diff against its group's files before it
 *   merges it (`.claude/agents/continuous-prompt-improvement.md` § 5).
 *
 * THE SKEPTICS. Each change of a group that broke no rule goes to `promptReviewSkeptics[severity]`
 * skeptics, the severity its finding's. Each reads the branch's diff and answers upheld, refuted or
 * unverified to two questions: had the prompt said this, would the runs have gone differently; and
 * does the edit break another path through the prompt, or another caller of it. With n sent,
 * floor(n/2)+1 upheld upholds a change and as many refuted refutes it; anything else, a skeptic that
 * returns nothing included, leaves it unverified. A group merges only when every change it carries is
 * upheld: the script runs no git, so it cannot take one change of a branch and leave another.
 *
 *   `merge` lists the merging groups' branches in the order of `args.groups`. A run is in `runsRead`
 *   when every group whose findings cite it is `merge`, `unchanged` or `not-upheld`; otherwise it is
 *   in `runsHeld`, with the groups that held it, and the session leaves it pending for the next
 *   review. `findingsHeld` lists each finding of a read group that no merged branch carries, set aside
 *   by its agent, not upheld, or upheld on a branch kept out, with its key, its runs, its count and
 *   the reason; the session appends a held line for each of its runs.
 *
 * LABELS. Each file agent is labelled `review <id>`, and each skeptic `skeptic <i>/<n> <id>: <key>`.
 * scripts/workflows.selftest.mjs routes its stubbed agents by those labels: change one here and change
 * it there.
 *
 * NEEDS a review worktree, the Workflow tool, and a WorktreeCreate hook that cuts each agent's
 * worktree from `origin/main`: on 2026-09-26 a workflow agent's `isolation: 'worktree'` landed on
 * `agent/wf_<run>-<n>` at `origin/main` with its briefing, from a session and from a `claude --bg`
 * session alike (asdlc-openspec-lzr). A worktree an agent leaves is not removed when it ends, changed
 * or not; `npm run worktree:gc` removes each once its branch is contained in `origin/main`. The
 * skeptics run where the session does, in the review worktree, and read each branch there. Nothing
 * here reads a file: the session passes the policy as `args.policy`. `npm run workflows:selftest`
 * runs this script against stubbed agents.
 */

const A = args || {}

const VERDICTS = ['changed', 'unchanged']
const OUTCOMES = ['working', 'not working', 'not exercised']
const SEVERITIES = ['blocker', 'major', 'minor']
const POLICY_KEYS = ['promptReviewRecurrenceCount', 'promptReviewMajorSeverities', 'promptReviewSkeptics']
const PROVISIONED = 'agent/'
const JUDGED = '`.claude/agents/continuous-prompt-improvement.md` § How a file is judged'
const KEY = /^(.+)#([a-z0-9][a-z0-9-]*)$/

/* ----------------------------------------------------------------------------- the schemas ----- */

const STRINGS = { type: 'array', items: { type: 'string' } }

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: VERDICTS },
    branch: { type: 'string' },
    head: { type: 'string' },
    filesChanged: STRINGS,
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          finding: { type: 'string' },
          title: { type: 'string' },
          edit: { type: 'string' },
          why: { type: 'string' },
          frequency: { type: 'string' },
          cost: { type: 'string' },
          words: { type: 'integer' },
        },
        required: ['file', 'finding', 'title', 'edit', 'why', 'frequency', 'cost', 'words'],
      },
    },
    notChanged: {
      type: 'array',
      items: {
        type: 'object',
        properties: { finding: { type: 'string' }, reason: { type: 'string' } },
        required: ['finding', 'reason'],
      },
    },
    earlierReviews: {
      type: 'array',
      items: {
        type: 'object',
        properties: { pr: { type: 'string' }, change: { type: 'string' }, outcome: { type: 'string', enum: OUTCOMES }, evidence: { type: 'string' } },
        required: ['pr', 'change', 'outcome', 'evidence'],
      },
    },
    unverified: STRINGS,
    gates: {
      type: 'array',
      items: {
        type: 'object',
        properties: { command: { type: 'string' }, passed: { type: 'boolean' }, output: { type: 'string' } },
        required: ['command', 'passed', 'output'],
      },
    },
  },
  required: ['verdict', 'branch', 'head', 'filesChanged', 'changes', 'notChanged', 'earlierReviews', 'unverified', 'gates'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { verdict: { type: 'string', enum: ['upheld', 'refuted', 'unverified'] }, reason: { type: 'string' } },
  required: ['verdict', 'reason'],
}

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText)
const isWhole = (v) => Number.isInteger(v) && v >= 1
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clean = (path) => String(path).trim().replace(/^\.\//, '')

/** The run ids a group's findings cite, each once, in the order the findings give them. */
const runsOf = (g) => [...new Set(g.findings.flatMap((f) => f.runs))]

/** Why a path cannot be handed to an agent as its own, or null when it can. */
function pathProblem(path) {
  if (!isText(path)) return 'is empty'
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'is absolute; pass it relative to the repository'
  if (clean(path).split('/').some((segment) => segment === '..' || segment === '')) return 'has an empty or `..` segment'
  return null
}

/** Why the policy the session passed cannot drive a run, or null when it can. */
function policyProblem() {
  const p = A.policy
  if (!isPlainObject(p)) return 'args.policy must be the `promptReview*` keys of tools/policy.json, as the agent\'s § 4 prints them'
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return `args.policy has no ${missing.map((k) => `\`${k}\``).join(', ')}: pass the keys tools/policy.json holds`
  if (!isWhole(p.promptReviewRecurrenceCount)) return 'args.policy `promptReviewRecurrenceCount` must be a whole number of at least 1'
  const majors = p.promptReviewMajorSeverities
  if (!Array.isArray(majors) || majors.some((s) => !SEVERITIES.includes(s))) {
    return `args.policy \`promptReviewMajorSeverities\` must be a list drawn from ${SEVERITIES.join(', ')}`
  }
  const skeptics = p.promptReviewSkeptics
  if (!isPlainObject(skeptics) || SEVERITIES.some((s) => !isWhole(skeptics[s])) || Object.keys(skeptics).length !== SEVERITIES.length) {
    return `args.policy \`promptReviewSkeptics\` must give exactly ${SEVERITIES.join(', ')} each a whole number of at least 1`
  }
  return null
}

/** Why one finding of group `g` cannot be passed to its agent, or null when it can. */
function findingProblem(g, f, i, keys) {
  const where = `group ${g.id}: findings[${i}]`
  if (!isPlainObject(f)) return `${where} must be an object`
  const m = isText(f.key) ? KEY.exec(f.key.trim()) : null
  if (!m) return `${where}.key must be \`<file>#<name>\`, the name in lower case letters, digits and dashes`
  if (!g.files.map(clean).includes(clean(m[1]))) return `group ${g.id}: the finding ${f.key} names ${clean(m[1])}, which is not one of its files`
  if (keys.has(f.key.trim())) return `the key ${f.key} is on two findings; one finding has it`
  keys.add(f.key.trim())
  if (!isText(f.title)) return `group ${g.id}: the finding ${f.key} has no title`
  if (!SEVERITIES.includes(f.severity)) return `group ${g.id}: the finding ${f.key} has the severity ${JSON.stringify(f.severity)}, not one of ${SEVERITIES.join(', ')}`
  if (!isTextList(f.runs)) return `group ${g.id}: the finding ${f.key} must name the runs in this batch that showed it`
  if (!isWhole(f.count) || f.count < new Set(f.runs).size) {
    return `group ${g.id}: the finding ${f.key} has the count ${JSON.stringify(f.count)}, fewer than the ${new Set(f.runs).size} run(s) it names`
  }
  if (!isText(f.evidence)) return `group ${g.id}: the finding ${f.key} has no evidence`
  const { promptReviewRecurrenceCount: least, promptReviewMajorSeverities: majors } = A.policy
  if (f.count < least && !majors.includes(f.severity)) {
    return `group ${g.id}: the finding ${f.key} was shown by ${f.count} run(s) at ${f.severity}, below the threshold (${least} runs, or ${majors.join(' or ')}); hold it (\`.claude/agents/continuous-prompt-improvement.md\` § 3) rather than pass it`
  }
  return null
}

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  const badPolicy = policyProblem()
  if (badPolicy) return badPolicy
  if (!Array.isArray(A.groups) || A.groups.length === 0) return 'args.groups must be a non-empty list of { id, files, findings }'
  const ids = new Set()
  const owner = new Map()
  const keys = new Set()
  for (const [i, g] of A.groups.entries()) {
    if (!isPlainObject(g)) return `args.groups[${i}] must be an object`
    if (!isText(g.id) || !/^[a-z0-9][a-z0-9-]*$/.test(g.id)) return `args.groups[${i}].id must be lower case letters, digits and dashes`
    if (ids.has(g.id)) return `args.groups has the id ${g.id} twice`
    ids.add(g.id)
    if (!isTextList(g.files)) return `group ${g.id}: files must be a non-empty list of paths`
    for (const file of g.files) {
      const problem = pathProblem(file)
      if (problem) return `group ${g.id}: the file ${JSON.stringify(file)} ${problem}`
      const path = clean(file)
      if (owner.has(path)) return `the file ${path} is in groups ${owner.get(path)} and ${g.id}; a file belongs to one group, and a finding across files puts them in one`
      owner.set(path, g.id)
    }
    if (!Array.isArray(g.findings) || g.findings.length === 0) return `group ${g.id}: findings must be a non-empty list of { key, title, severity, count, runs, evidence }`
    for (const [j, f] of g.findings.entries()) {
      const problem = findingProblem(g, f, j, keys)
      if (problem) return problem
    }
  }
  if (A.settled !== undefined && (!Array.isArray(A.settled) || A.settled.some((s) => !isText(s)))) {
    return 'args.settled must be a list of non-empty strings'
  }
  return null
}

/** The condition of the threshold a finding met: `recurrence`, `severity`, or both. */
function metBy(f) {
  const recurs = f.count >= A.policy.promptReviewRecurrenceCount
  const severe = A.policy.promptReviewMajorSeverities.includes(f.severity)
  return recurs && severe ? 'recurrence and severity' : recurs ? 'recurrence' : 'severity'
}

/* ------------------------------------------------------------------------------ the prompts ----- */

const settledBlock = () => (A.settled && A.settled.length ? `\n\n## Settled already; do not raise these again\n\n${A.settled.map((s) => `- ${s}`).join('\n')}` : '')

function findingBlock(f) {
  return [
    `### ${f.key.trim()}: ${f.title}`,
    '',
    `Severity ${f.severity}. Shown by ${f.count} run(s), of which this batch holds ${f.runs.join(', ')}. It met the threshold by ${metBy(f)}.`,
    '',
    f.evidence,
  ].join('\n')
}

function reviewPrompt(g) {
  const files = g.files.map((f) => `- ${clean(f)}`).join('\n')
  return [
    `You are one of ${A.groups.length} reviewers in a batched review of this repository's prompts (\`CLAUDE.md\` § Prompt reviews). You work in a git worktree of your own, on a branch of its own: \`git branch --show-current\` names it.`,
    '',
    'Rules for this run, on top of CLAUDE.md and .worktree/CONTEXT.md:',
    '- Change only the files listed under Your files. Create, delete and rename none.',
    '- Commit your change on your branch as one commit. Do not push, open a pull request, stash, reset, rebase or switch branches, and write nothing to the tracker: the session that ran this workflow merges your branch, opens the one pull request and marks the analyses read.',
    '- Throwaway files go under .scratch/ only.',
    '- Run each command as its own Bash call, as CLAUDE.md asks.',
    '',
    `Read ${JUDGED} before anything else.`,
    '',
    '## Your files',
    '',
    files,
    '',
    '## The findings, each of which met the threshold',
    '',
    g.findings.map(findingBlock).join('\n\n') + settledBlock(),
    '',
    '## How to finish',
    '',
    '- Account for every finding above by its key: each change names under finding the one it answers, and each finding you leave alone goes under notChanged with your reason.',
    '- If nothing should change: edit nothing and commit nothing. Return the verdict unchanged.',
    '- If a file should change: make the edit, run `npm ci`, stage it with `git add`, run `npm run check:prompts` and `npm run citations:check`, fix what they report in your own files, and commit. Return the verdict changed, with each gate you ran and what it printed.',
    "- Each change states how often the situation arises (frequency) and what it costs when it does (cost), each figure citing a run, a label count or a pull request, and the net words the edit adds (words, negative when it removes more), counted from `git diff --word-diff=porcelain origin/main...HEAD` on its file.",
    "- After you finish, skeptics judge each change against your branch's diff. A branch merges only when a majority upholds every change on it, so leave out an edit you would not defend.",
    '- branch is what `git branch --show-current` prints, head what `git log -1 --format=%H` prints, and filesChanged what `git diff --name-only origin/main...HEAD` prints, one path each, after your last commit.',
  ].join('\n')
}

function skepticPrompt(g, c, f, i, n) {
  return [
    `You are skeptic ${i} of ${n} on one edit a batched review of this repository's prompts proposes (\`CLAUDE.md\` § Prompt reviews). You change nothing, commit nothing and write nothing to the tracker; throwaway files go under .scratch/ only. Run each command as its own Bash call, as CLAUDE.md asks.`,
    '',
    `Read ${JUDGED} first. Then read the edit, \`git diff origin/main...${g.branch.trim()} -- ${clean(c.file)}\`, and the file as \`origin/main\` has it.`,
    '',
    'Answer two questions about the edit, and only these:',
    '',
    "1. Had the prompt said this, would the runs below have gone differently? Read what each run did, from the evidence and, where it helps, from its issue (`bd show` with the id before the run id's `@`), its commits and its pull request.",
    "2. Does the edit break another path through the prompt, or another caller of it: a skill, an agent, a workflow or CLAUDE.md that runs this prompt or points at the text it changes? `git grep` the file's name and the heading of the section the edit changes.",
    '',
    '- upheld: you checked both; the answer to 1 is yes, and to 2 is no.',
    '- refuted: you checked, and the answer to 1 is no or to 2 is yes. Say which, with the evidence.',
    '- unverified: you could not establish either. Say what stopped you. Never answer refuted because you could not verify it.',
    '',
    '## The finding',
    '',
    findingBlock(f) + settledBlock(),
    '',
    '## The edit, as its agent reported it',
    '',
    `File: ${clean(c.file)}`,
    `Title: ${c.title}`,
    `Edit: ${c.edit}`,
    `Why: ${c.why}`,
    `How often the situation arises: ${c.frequency}`,
    `What it costs when it does: ${c.cost}`,
    `Net words the edit adds: ${c.words}`,
  ].join('\n')
}

/* ------------------------------------------------------------------------ judging a report ----- */

/** The problems with one agent's report, in the order the header states the rules. */
function problemsOf(g, r) {
  const problems = []
  const own = new Set(g.files.map(clean))
  const keys = new Set(g.findings.map((f) => f.key.trim()))
  if (!r.branch.trim().startsWith(PROVISIONED)) {
    problems.push(`its branch ${r.branch.trim()} is not an ${PROVISIONED} branch, so the WorktreeCreate hook did not provision its worktree, and its base and briefing are unknown`)
  }
  const changed = r.filesChanged.map(clean).filter(Boolean)
  if (r.verdict === 'changed') {
    if (!changed.length) problems.push('it reports a change, but its branch changes no file')
    const stray = changed.filter((f) => !own.has(f))
    if (stray.length) problems.push(`its branch changes ${stray.join(', ')}, which it was not given`)
    if (!r.changes.length) problems.push('it reports a change, but states none')
    const elsewhere = [...new Set(r.changes.map((c) => clean(c.file)).filter((f) => !own.has(f)))]
    if (elsewhere.length) problems.push(`it states a change to ${elsewhere.join(', ')}, which it was not given`)
    const failing = r.gates.filter((gate) => !gate.passed)
    if (!r.gates.length) problems.push('it changed a file and ran no gate')
    else if (failing.length) problems.push(`its gate(s) ${failing.map((gate) => gate.command).join(', ')} did not pass`)
  } else {
    if (changed.length) problems.push(`it reports no change, but its branch changes ${changed.join(', ')}`)
    if (r.changes.length) problems.push(`it reports no change, but states ${r.changes.length} change(s)`)
  }
  const named = [...r.changes.map((c) => c.finding.trim()), ...r.notChanged.map((n) => n.finding.trim())]
  const foreign = [...new Set(named.filter((key) => !keys.has(key)))]
  if (foreign.length) problems.push(`it names the finding(s) ${foreign.join(', ')}, which its group was not given`)
  const missed = [...keys].filter((key) => !named.includes(key))
  if (missed.length) problems.push(`it neither changes nor sets aside the finding(s) ${missed.join(', ')}`)
  return problems
}

/** Majority of those sent, as the header states. A missing vote is an unverified one. */
function tally(votes) {
  const n = votes.length
  const majority = Math.floor(n / 2) + 1
  const cast = votes.map((v) => v || { verdict: 'unverified', reason: 'the skeptic returned nothing' })
  const upheld = cast.filter((v) => v.verdict === 'upheld').length
  const refuted = cast.filter((v) => v.verdict === 'refuted').length
  const outcome = upheld >= majority ? 'upheld' : refuted >= majority ? 'refuted' : 'unverified'
  return { outcome, skeptics: n, upheld, refuted, votes: cast.map((v) => `${v.verdict}: ${v.reason}`) }
}

const voteLine = (c) => `${c.upheld} upheld, ${c.refuted} refuted and ${c.skeptics - c.upheld - c.refuted} unverified of ${c.skeptics}`

/* ---------------------------------------------------------------------------------- the run ----- */

const badArgs = argsProblem()
if (badArgs) {
  log(`Refused: ${badArgs}`)
  return { stopped: 'refused', why: badArgs, groups: [], merge: [], runsRead: [], runsHeld: [], findingsHeld: [], counts: null }
}

phase('Review')
log(`${A.groups.length} group(s), ${A.groups.reduce((n, g) => n + g.files.length, 0)} file(s), ${A.groups.reduce((n, g) => n + g.findings.length, 0)} finding(s)`)
const reports = await parallel(
  A.groups.map((g) => () => agent(reviewPrompt(g), { label: `review ${g.id}`, phase: 'Review', isolation: 'worktree', schema: REPORT_SCHEMA })),
)

const groups = A.groups.map((g, i) => {
  const r = reports[i]
  const base = { id: g.id, files: g.files.map(clean), findings: g.findings, runs: runsOf(g) }
  if (!r) return { ...base, status: 'died', problems: ['the agent returned nothing'] }
  const problems = problemsOf(g, r)
  return { ...base, ...r, status: problems.length ? 'refused' : r.verdict === 'changed' ? 'merge' : 'unchanged', problems }
})

const byBranch = new Map()
for (const g of groups) {
  if (g.status === 'died') continue
  const branch = g.branch.trim()
  if (byBranch.has(branch)) {
    for (const other of [byBranch.get(branch), g]) {
      other.problems.push(`groups ${byBranch.get(branch).id} and ${g.id} report the one branch ${branch}`)
      other.status = 'refused'
    }
  } else byBranch.set(branch, g)
}

for (const g of groups) {
  if (g.status === 'refused') log(`Group ${g.id} refused: ${g.problems.join('; ')}`)
  if (g.status === 'died') log(`Group ${g.id}: the agent returned nothing`)
}

const findingOf = (g, key) => g.findings.find((f) => f.key.trim() === key.trim())
const toJudge = groups.filter((g) => g.status === 'merge').flatMap((g) => g.changes.map((c) => ({ g, c, f: findingOf(g, c.finding) })))

if (toJudge.length) {
  phase('Confirm')
  const judged = await pipeline(
    toJudge,
    ({ g, c, f }) => {
      const n = A.policy.promptReviewSkeptics[f.severity]
      return parallel(
        Array.from({ length: n }, (_, i) => () =>
          agent(skepticPrompt(g, c, f, i + 1, n), { label: `skeptic ${i + 1}/${n} ${g.id}: ${f.key.trim()}`, phase: 'Confirm', schema: VERDICT_SCHEMA }),
        ),
      )
    },
    (votes) => tally(votes),
  )
  toJudge.forEach(({ g, c, f }, i) => {
    const t = judged[i] || { outcome: 'unverified', skeptics: 0, upheld: 0, refuted: 0, votes: ['the skeptics returned nothing'] }
    Object.assign(c, { severity: f.severity, count: f.count, met: metBy(f), ...t })
  })
  for (const g of groups) {
    if (g.status !== 'merge') continue
    const lost = g.changes.filter((c) => c.outcome !== 'upheld')
    if (lost.length) {
      g.status = 'not-upheld'
      log(`Group ${g.id} not upheld: ${lost.map((c) => `${c.finding.trim()} (${voteLine(c)})`).join('; ')}`)
    }
  }
}

const read = (g) => g.status === 'merge' || g.status === 'unchanged' || g.status === 'not-upheld'
const allRuns = [...new Set(A.groups.flatMap(runsOf))]
const runsRead = []
const runsHeld = []
for (const run of allRuns) {
  const holding = groups.filter((g) => g.runs.includes(run) && !read(g)).map((g) => g.id)
  if (holding.length) runsHeld.push({ run, heldBy: holding })
  else runsRead.push(run)
}

/** Each finding of a read group that no merged branch carries, with the reason it is held. */
const findingsHeld = []
for (const g of groups.filter(read)) {
  const lost = g.status === 'not-upheld' ? g.changes.filter((c) => c.outcome !== 'upheld').map((c) => c.finding.trim()) : []
  for (const f of g.findings) {
    const key = f.key.trim()
    const mine = g.changes.filter((c) => c.finding.trim() === key)
    let reason = null
    if (!mine.length) {
      const aside = g.notChanged.find((n) => n.finding.trim() === key)
      reason = `set aside by its file's agent: ${aside.reason}`
    } else if (lost.includes(key)) {
      reason = `the skeptics did not uphold its edit: ${mine.filter((c) => c.outcome !== 'upheld').map(voteLine).join('; ')}`
    } else if (g.status === 'not-upheld') {
      reason = `upheld, but its branch also carried ${[...new Set(lost)].join(', ')}, which the skeptics did not uphold, so the branch was not merged`
    }
    if (reason) findingsHeld.push({ key, runs: f.runs, count: f.count, reason })
  }
}

const count = (status) => groups.filter((g) => g.status === status).length
const judgedChanges = toJudge.map(({ c }) => c)
const counts = {
  groups: groups.length,
  merge: count('merge'),
  unchanged: count('unchanged'),
  notUpheld: count('not-upheld'),
  refused: count('refused'),
  died: count('died'),
  changes: judgedChanges.length,
  upheld: judgedChanges.filter((c) => c.outcome === 'upheld').length,
  skeptics: judgedChanges.reduce((n, c) => n + c.skeptics, 0),
  runs: allRuns.length,
  runsRead: runsRead.length,
  runsHeld: runsHeld.length,
  findingsHeld: findingsHeld.length,
}
const merge = groups.filter((g) => g.status === 'merge').map((g) => g.branch.trim())

if (counts.died === counts.groups) {
  const why = 'every agent returned nothing, so no file was reviewed and every run stays pending'
  log(`Stopped (agent-died): ${why}`)
  return { stopped: 'agent-died', why, groups, merge, runsRead, runsHeld, findingsHeld, counts }
}
const why = `${counts.merge} to merge, ${counts.unchanged} unchanged, ${counts.notUpheld} not upheld, ${counts.refused} refused, ${counts.died} died; ${counts.upheld} of ${counts.changes} change(s) upheld by ${counts.skeptics} skeptic(s); ${counts.runsRead} of ${counts.runs} run(s) read, ${counts.findingsHeld} finding(s) held`
log(`Stopped (done): ${why}`)
return { stopped: 'done', why, groups, merge, runsRead, runsHeld, findingsHeld, counts }
