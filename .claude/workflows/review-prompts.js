export const meta = {
  name: 'review-prompts',
  description: 'Review the prompt files a batch of prompt-run analyses concerns, one agent per file or group of files in a worktree of its own, and return which branches to merge and which analyses were read',
  whenToUse: 'Step 4 of the continuous-prompt-improvement agent, once per review, from the review worktree',
  phases: [
    { title: 'Review', detail: 'one agent per file or group of files, each in its own worktree, changes its files or leaves them' },
  ],
}

/*
 * Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.
 *
 * WHAT IT DOES. Runs the file agents of one prompt review. The session running the
 * `continuous-prompt-improvement` agent collects the pending analyses, groups their evidence by the
 * prompt file each finding concerns, and passes the groups here. Each group gets one agent, in a
 * worktree of its own, which changes its files and commits on its branch, or changes nothing. This
 * script then judges each agent's report in code and returns the branches the session may merge and
 * the analyses it may mark read. It merges nothing, pushes nothing and writes nothing to the tracker:
 * the session does all three (`.claude/agents/continuous-prompt-improvement.md` § 5 and § 6).
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-25 two reviews of `.claude/skills/bead/SKILL.md` ran at
 * once, one per run, and collided: #48 and #51 were superseded by #53, which carries one commit from
 * each (asdlc-openspec-lzr). A batch has one review over every pending analysis, so that cannot recur,
 * but it moves the risk here. Were this script wrong, it would let through: an agent that edited a
 * file another group owns, whose branch then conflicts or overwrites; a branch the WorktreeCreate hook
 * never provisioned (`worktree-<name>`, with no briefing and the wrong base, as the header of
 * scripts/hooks/worktree-create.mjs tables), merged as if it were; a change whose gates failed; a
 * change citing a run no analysis named; and an analysis marked read although the agent for one of
 * its files returned nothing, so that its finding is never reviewed.
 *
 * INVOCATION. The Workflow tool, with `scriptPath` set to this file inside the review's worktree, so
 * that the script and the agent file its agents read come from one commit, and `args`:
 *
 *   groups    [{ id, files, runs, evidence }], one per agent:
 *               id        a short name, lower case, digits and dashes: the agent's label
 *               files     the repository-relative paths this agent may change; each file is in one
 *                         group only
 *               runs      the run ids of the analyses the evidence comes from, each as its marker line
 *                         gives it (`CLAUDE.md` § Prompt reviews)
 *               evidence  the findings about these files, each with the run ids that showed it
 *   settled   optional [string]: decided already, by the maintainer or an earlier review; no agent
 *             raises it again
 *
 * WHAT IT RETURNS. { stopped, why, groups, merge, runsRead, runsHeld, counts }. Every count in it is
 * computed here, never by an agent. `stopped` is one of:
 *
 *   refused     an argument did not hold; `why` names it, and no agent ran
 *   agent-died  every agent returned nothing
 *   done        every agent ran, or some did; `groups` says which
 *
 * Each entry of `groups` is the agent's report with its `id`, its `files`, its `runs`, a `status` and
 * the `problems` found with it. The status is one of:
 *
 *   merge       it changed its files, and nothing below was wrong: its branch is in `merge`
 *   unchanged   it changed nothing, and said why
 *   refused     its report broke a rule below; its branch is not merged, and `problems` says why
 *   died        the agent returned nothing
 *
 * THE RULES a report is held to, in this order, each a problem when broken:
 *
 *   - its branch is an `agent/` branch, as the WorktreeCreate hook names one, where the harness's own
 *     fallback names it `worktree-<name>` (CLAUDE.md § Git workflow);
 *   - no two groups report one branch;
 *   - a changed report lists the files its branch changes, every one of them its own, states at
 *     least one change, each to a file of its own, and ran gates that all passed;
 *   - an unchanged report lists no changed file;
 *   - every change and every finding set aside cites at least one run, and only runs in its own
 *     evidence.
 *
 *   These rules judge what each agent reports of its branch and its files, which a script that runs
 *   no git cannot check; the session checks each branch's diff against its group's files before it
 *   merges it (`.claude/agents/continuous-prompt-improvement.md` § 5).
 *
 *   `merge` lists the merging groups' branches in the order of `args.groups`. A run is in `runsRead`
 *   when every group whose evidence cites it is `merge` or `unchanged`; otherwise it is in `runsHeld`,
 *   with the groups that held it, and the session leaves it pending for the next review.
 *
 * LABELS. Each agent is labelled `review <id>`. scripts/workflows.selftest.mjs routes its stubbed
 * agents by that label: change it here and change it there.
 *
 * NEEDS a review worktree, the Workflow tool, and a WorktreeCreate hook that cuts each agent's
 * worktree from `origin/main`: on 2026-09-26 a workflow agent's `isolation: 'worktree'` landed on
 * `agent/wf_<run>-<n>` at `origin/main` with its briefing, from a session and from a `claude --bg`
 * session alike (asdlc-openspec-lzr). A worktree an agent leaves is not removed when it ends, changed
 * or not; `npm run worktree:gc` removes each once its branch is contained in `origin/main`. Nothing
 * here reads a file. `npm run workflows:selftest` runs this script against stubbed agents.
 */

const A = args || {}

const VERDICTS = ['changed', 'unchanged']
const OUTCOMES = ['working', 'not working', 'not exercised']
const PROVISIONED = 'agent/'
const JUDGED = '`.claude/agents/continuous-prompt-improvement.md` § How a file is judged'

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
        properties: { file: { type: 'string' }, title: { type: 'string' }, runs: STRINGS, edit: { type: 'string' }, why: { type: 'string' } },
        required: ['file', 'title', 'runs', 'edit', 'why'],
      },
    },
    notChanged: {
      type: 'array',
      items: {
        type: 'object',
        properties: { title: { type: 'string' }, runs: STRINGS, reason: { type: 'string' } },
        required: ['title', 'runs', 'reason'],
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

/* ------------------------------------------------------------------------ checking the input ----- */

const isText = (v) => typeof v === 'string' && v.trim() !== ''
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText)
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const clean = (path) => String(path).trim().replace(/^\.\//, '')

/** Why a path cannot be handed to an agent as its own, or null when it can. */
function pathProblem(path) {
  if (!isText(path)) return 'is empty'
  if (path.startsWith('/') || /^[A-Za-z]:/.test(path)) return 'is absolute; pass it relative to the repository'
  if (clean(path).split('/').some((segment) => segment === '..' || segment === '')) return 'has an empty or `..` segment'
  return null
}

/** Why the arguments cannot drive a run, or null when they can. Nothing has run yet. */
function argsProblem() {
  if (!Array.isArray(A.groups) || A.groups.length === 0) return 'args.groups must be a non-empty list of { id, files, runs, evidence }'
  const ids = new Set()
  const owner = new Map()
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
    if (!isTextList(g.runs)) return `group ${g.id}: runs must be a non-empty list of run ids`
    if (!isText(g.evidence)) return `group ${g.id}: evidence must be a non-empty string`
  }
  if (A.settled !== undefined && (!Array.isArray(A.settled) || A.settled.some((s) => !isText(s)))) {
    return 'args.settled must be a list of non-empty strings'
  }
  return null
}

/* ------------------------------------------------------------------------------- the prompt ----- */

function reviewPrompt(g) {
  const files = g.files.map((f) => `- ${clean(f)}`).join('\n')
  const settled = A.settled && A.settled.length
    ? `\n\n## Settled already; do not raise these again\n\n${A.settled.map((s) => `- ${s}`).join('\n')}`
    : ''
  return [
    `You are one of ${A.groups.length} reviewers in a batched review of this repository's prompts (\`CLAUDE.md\` § Prompt reviews). You work in a git worktree of your own, on a branch of its own: \`git branch --show-current\` names it.`,
    '',
    'Rules for this run, on top of CLAUDE.md and .worktree/CONTEXT.md:',
    '- Change only the files listed under Your files. Create, delete and rename none.',
    '- Commit your change on your branch as one commit. Do not push, open a pull request, stash, reset, rebase or switch branches, and write nothing to the tracker: the session that ran this workflow merges your branch, opens the one pull request and marks the analyses read.',
    '- Throwaway files go under .scratch/ only.',
    '- Run each command as its own Bash call, as CLAUDE.md asks.',
    '',
    `Read ${JUDGED} before anything else. It says what to look for, how to find the earlier reviews of your files, what to cite, and when to change nothing.`,
    '',
    '## Your files',
    '',
    files,
    '',
    `## The evidence, from the runs ${g.runs.join(', ')}`,
    '',
    g.evidence + settled,
    '',
    '## How to finish',
    '',
    '- If nothing should change: edit nothing and commit nothing. Return the verdict unchanged, with each finding you set aside under notChanged.',
    '- If a file should change: make the edit, run `npm ci`, stage it with `git add`, run `npm run check:prompts` and `npm run citations:check`, fix what they report in your own files, and commit. Return the verdict changed, with each gate you ran and what it printed.',
    '- Every change and every finding you set aside names, under runs, the run ids above that showed it, and no other.',
    '- branch is what `git branch --show-current` prints, head what `git log -1 --format=%H` prints, and filesChanged what `git diff --name-only origin/main...HEAD` prints, one path each, after your last commit.',
  ].join('\n')
}

/* ------------------------------------------------------------------------ judging a report ----- */

/** The problems with one agent's report, in the order the header states the rules. */
function problemsOf(g, r) {
  const problems = []
  const own = new Set(g.files.map(clean))
  const runs = new Set(g.runs)
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
  } else if (changed.length) {
    problems.push(`it reports no change, but its branch changes ${changed.join(', ')}`)
  }
  const cited = [...r.changes, ...r.notChanged]
  const bare = cited.filter((f) => !f.runs.length)
  if (bare.length) problems.push(`${bare.map((f) => `"${f.title}"`).join(', ')} cite(s) no run`)
  const foreign = [...new Set(cited.flatMap((f) => f.runs).filter((run) => !runs.has(run)))]
  if (foreign.length) problems.push(`it cites the run(s) ${foreign.join(', ')}, which its evidence does not come from`)
  return problems
}

/* ---------------------------------------------------------------------------------- the run ----- */

const badArgs = argsProblem()
if (badArgs) {
  log(`Refused: ${badArgs}`)
  return { stopped: 'refused', why: badArgs, groups: [], merge: [], runsRead: [], runsHeld: [], counts: null }
}

phase('Review')
log(`${A.groups.length} group(s), ${A.groups.reduce((n, g) => n + g.files.length, 0)} file(s)`)
const reports = await parallel(
  A.groups.map((g) => () => agent(reviewPrompt(g), { label: `review ${g.id}`, phase: 'Review', isolation: 'worktree', schema: REPORT_SCHEMA })),
)

const groups = A.groups.map((g, i) => {
  const r = reports[i]
  const base = { id: g.id, files: g.files.map(clean), runs: g.runs }
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

const read = (g) => g.status === 'merge' || g.status === 'unchanged'
const allRuns = [...new Set(A.groups.flatMap((g) => g.runs))]
const runsRead = []
const runsHeld = []
for (const run of allRuns) {
  const holding = groups.filter((g) => g.runs.includes(run) && !read(g)).map((g) => g.id)
  if (holding.length) runsHeld.push({ run, heldBy: holding })
  else runsRead.push(run)
}

const count = (status) => groups.filter((g) => g.status === status).length
const counts = {
  groups: groups.length,
  merge: count('merge'),
  unchanged: count('unchanged'),
  refused: count('refused'),
  died: count('died'),
  runs: allRuns.length,
  runsRead: runsRead.length,
  runsHeld: runsHeld.length,
}
const merge = groups.filter((g) => g.status === 'merge').map((g) => g.branch.trim())

if (counts.died === counts.groups) {
  const why = 'every agent returned nothing, so no file was reviewed and every run stays pending'
  log(`Stopped (agent-died): ${why}`)
  return { stopped: 'agent-died', why, groups, merge, runsRead, runsHeld, counts }
}
const why = `${counts.merge} to merge, ${counts.unchanged} unchanged, ${counts.refused} refused, ${counts.died} died; ${counts.runsRead} of ${counts.runs} run(s) read`
log(`Stopped (done): ${why}`)
return { stopped: 'done', why, groups, merge, runsRead, runsHeld, counts }
