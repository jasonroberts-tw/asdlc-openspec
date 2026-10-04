export const meta = {
  name: 'review-prompts',
  description: 'Review the prompt files a batch of prompt-run analyses concerns, one agent per file or group of files in a worktree of its own, have skeptics judge each edit, answer the stored decision cases of each changed file with its old text and its new, and return which branches to merge, which analyses were read and which findings were held',
  whenToUse: 'Step 4 of the continuous-prompt-improvement agent, once per review, from the review worktree',
  phases: [
    { title: 'Review', detail: 'one agent per file or group of files, each in its own worktree, changes its files or leaves them' },
    { title: 'Confirm', detail: "skeptics, as many as the policy gives the finding's severity, judge each edit against its branch's diff" },
    { title: 'Regress', detail: 'each stored case of a file an upheld branch changes, answered with the old text and the new' },
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
 * change against its branch's diff, and each stored decision case of a file an upheld branch changes
 * is answered with that file's old text and its new (`docs/decisions.md` § D-32). This script judges
 * each agent's report and tallies each vote and each answer in code, and returns the branches the
 * session may merge, the analyses it may mark read and the findings it holds. It merges nothing,
 * pushes nothing and writes nothing to the tracker: the session does all three
 * (`.claude/agents/continuous-prompt-improvement.md` § 5 and § 6).
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
 * held line records, so that its count starts again at the next review. Since asdlc-openspec-aa0 it
 * would also let through a consolidation that removes a rule and says nowhere where the rule went, or
 * one no majority of its skeptics upheld: a rewrite that collapses a context loses what the next run
 * needed, and nothing says so (https://arxiv.org/abs/2510.04618, "context collapse"). Since
 * asdlc-openspec-7c1 it would also let through an edit that turns a decision the prompt made right into
 * a wrong one, which a skeptic reading the diff for the runs it was given never sees; an answer from
 * an agent that could run a command or search for the case's expected answer; an answer sent to a
 * file other than the text its reader wrote; and a file the branch changed whose cases go unanswered
 * because its report states a change to it and does not list it. A file the report neither states
 * nor lists is the session's to catch: it holds a branch whose diff names a file the report does not
 * list (`.claude/agents/continuous-prompt-improvement.md` § 5).
 *
 * Wrong the other way, it refuses what it should pass. On 2026-09-28 (run wf_5aec3e94-07b) it refused
 * 3 of 4 groups, each with an edit whose gates passed, because each listed under `notChanged` a point
 * it had considered that was none of its group's findings, which the prompt never forbade: nothing
 * merged, and every analysis stayed pending (asdlc-openspec-b99). Such an entry is now an aside.
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
 *                           held lines spell it (`.claude/agents/continuous-prompt-improvement.md`
 *                           § 6. Mark what was read)
 *                 title     the finding, in one line
 *                 severity  blocker, major or minor, as `.claude/agents/pr-reviewer.md` § 2. Maintainability defines them
 *                 count     how many distinct runs have shown it: those below and those its held
 *                           lines name
 *                 runs      the run ids in this batch that showed it, each as its marker line gives it
 *                 evidence  what those runs showed
 *   policy    the `promptReview*` keys of `tools/policy/agent-workflows.json`, as the agent's § 2
 *             prints them; this script reads the four in POLICY_KEYS below and ignores the rest
 *   settled   optional [string]: decided already, by the maintainer or an earlier review; no agent
 *             raises it again
 *   cases     optional [case]: every stored decision case, in the format
 *             `.claude/prompt-cases/README.md` gives, whose prompt is a file of a group, and each new
 *             one `.claude/workflows/author-prompt-cases.js` validated for this review
 *
 * THE THRESHOLD, checked before any agent runs. A finding meets it when its count is at least
 * `promptReviewRecurrenceCount` or its severity is in `promptReviewMajorSeverities`. The session holds
 * every finding that meets neither, so one that reaches this script refuses the run. Each change
 * returns `met`, the condition its finding met: `recurrence`, `severity`, or both.
 *
 * WHAT IT RETURNS. { stopped, why, groups, merge, runsRead, runsHeld, findingsHeld, cases, counts }. Every
 * count in it is computed here, never by an agent. `stopped` is one of:
 *
 *   refused     an argument did not hold; `why` names it, and no agent ran
 *   agent-died  every file agent returned nothing
 *   done        every file agent ran, or some did; `groups` says which
 *
 * Each entry of `groups` is the agent's report with its `id`, its `files`, its `findings`, its
 * `runs`, its `asides` (below), a `status` and the `problems` found with it. The status is one of:
 *
 *   merge       it changed its files, nothing below was wrong, and a majority of each change's
 *               skeptics upheld it: its branch is in `merge`
 *   unchanged   it changed nothing, and said why
 *   not-upheld  it changed its files and broke no rule below, but one of its changes was not upheld;
 *               its branch is not merged, its runs are read, and its findings are held
 *   regressed   every change was upheld, but a stored case of a file it changed flipped or went
 *               unanswered (below); its branch is not merged, its runs are read, and its findings
 *               are held
 *   refused     its report broke a rule below; its branch is not merged, and `problems` says why
 *   died        the agent returned nothing
 *
 * Each change a skeptic judged carries its finding's `severity`, `count` and `met`, the `outcome`
 * (upheld, refuted or unverified), how many `skeptics` were sent, and each one's vote in `votes`.
 * Each consolidation a group reports (`.claude/agents/continuous-prompt-improvement.md` § How a prompt
 * is consolidated) carries its `file`, its `commit`, its `wordsBefore` and `wordsAfter`, its `removed`
 * rows, and, once judged, the same `outcome`, `skeptics` and `votes`.
 *
 * THE RULES a report is held to, in this order, each a problem when broken:
 *
 *   - its branch is an `agent/` branch, as the WorktreeCreate hook names one, where Claude Code's own
 *     fallback names it `worktree-<name>` (CLAUDE.md § Git workflow);
 *   - no two groups report one branch;
 *   - a changed report lists the files its branch changes, every one of them its own, states at
 *     least one change, each to a file of its own that it lists, and ran gates that all passed: the
 *     stored cases a branch is answered on are those of the files it lists;
 *   - each consolidation it states is of a file of its own that its branch changes, one per file,
 *     names its commit, frees words, and lists what it removed, every row saying where its text went:
 *     a kept row names the place and what loads it, a moved row the pull request, a deleted row why;
 *   - an unchanged report lists no changed file and states no change and no consolidation;
 *   - every change names a finding of its own group, and every finding of its group is changed or set
 *     aside.
 *
 *   An entry of `notChanged` that names none of its group's findings breaks no rule: it is returned in
 *   the group's `asides`, and the branch is judged as if it were absent. The prompt asks the agent to
 *   set aside each finding it leaves alone and never says the list holds only those, so an agent uses
 *   it for a point it considered, and such an entry changes no file and sets no finding aside. A
 *   misspelt key still refuses the report, by the rule above: the finding it meant is neither changed
 *   nor set aside. The script, not the prompt, carries this, because a rule in the prompt could be
 *   disobeyed, and each time it was the whole branch would be lost again.
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
 * returns nothing included, leaves it unverified. A change to a consolidated file is read from its
 * consolidation's commit, so its skeptics judge the edit alone. Each consolidation goes to the
 * `blocker` count of skeptics, whatever its findings' severities, because a rule it loses is lost to
 * every later run of the prompt; each answers whether its rows account for every removal and whether
 * each row holds. A group merges only when every change and every consolidation it carries is
 * upheld: the script runs no git, so it cannot take one commit of a branch and leave another.
 *
 * THE STORED CASES. For each group still `merge` once its skeptics have voted, every case whose prompt
 * its branch changes is answered `promptReviewCaseRepetitions` times with the file's text at the
 * branch's merge base with `origin/main`, the old, and as many with its text at the branch's head, the
 * new. One reader agent per group runs a command that writes those texts under
 * `.scratch/prompt-case-texts/` where the session stands and prints their paths with a checksum this
 * script re-derives; a copy that is not verbatim, or a path other than where the command writes, is
 * refused. Each answer is an agent by the agentType `prompt-case-answerer`, whose only tools are
 * Read and its structured output, sent to one of those files and shown the options in an order
 * turned by one place at each repetition. No model copies a text: one that did would retype tens of
 * thousands of characters, more than the tools show an agent of a single line. A text is right when floor(n/2)+1 of its n answers chose the case's expected
 * option. A case's outcome is `held` when both texts are right, `flipped` when the old is and the new
 * is not, `fixed` when only the new is, `failing` when neither is, and `unanswered` when an answer is
 * missing or out of range, or a text could not be read. A `flipped` or `unanswered` case makes its
 * group `regressed`; a `failing` one blocks nothing, since the trunk already answers it wrong, and is
 * returned for the session to report. `cases` lists each case answered, with its group, its
 * `outcome`, its `old` and `new` counts of right answers of `of`, and each answer's option and why.
 *
 *   `merge` lists the merging groups' branches in the order of `args.groups`. A run is in `runsRead`
 *   when every group whose findings cite it is `merge`, `unchanged`, `not-upheld` or `regressed`; otherwise it is
 *   in `runsHeld`, with the groups that held it, and the session leaves it pending for the next
 *   review. `findingsHeld` lists each finding of a read group that no merged branch carries, set aside
 *   by its agent, not upheld, or upheld on a branch kept out, with its key, its runs, its count and
 *   the reason; the session appends a held line for each of its runs.
 *
 * LABELS. Each file agent is labelled `review <id>`, each skeptic of a change `skeptic <i>/<n> <id>:
 * <key>`, each skeptic of a consolidation `skeptic <i>/<n> <id>: consolidation of <file>`, each reader
 * `read <id>`, and each answer `answer <i>/<n> old <id>: <case>` or `answer <i>/<n> new <id>: <case>`.
 * scripts/workflows.selftest.mjs routes its stubbed agents by those labels: change one here and change
 * it there. `answerPrompt` is a copy of `.claude/workflows/author-prompt-cases.js`'s, and the selftest
 * holds the two to one answer prompt for one case and file, so a case is answered alike when it is
 * validated and when it is judged.
 *
 * NEEDS a review worktree, the Workflow tool, and a WorktreeCreate hook that cuts each agent's
 * worktree from `origin/main`: on 2026-09-26 a workflow agent's `isolation: 'worktree'` landed on
 * `agent/wf_<run>-<n>` at `origin/main` with its briefing, from a session and from a `claude --bg`
 * session alike (asdlc-openspec-lzr). A worktree an agent leaves is not removed when it ends, changed
 * or not; `mise run worktree:gc` removes each once its branch is contained in `origin/main`. The
 * skeptics and the readers run where the session does, in the review worktree, and read each branch
 * there. The answers need the agent `prompt-case-answerer` in the checkout the session started in, the
 * primary checkout for a review `close-prompt-run` launched (`.claude/README.md`): where it is absent,
 * every answer returns nothing, and every branch whose files have a stored case is `regressed`. An
 * answer could read a file other than the one it is sent to if it guessed its path, and nothing here
 * records that it did not. The script reads no file: the session passes the policy as `args.policy`.
 * `mise run workflows:selftest` runs this script against stubbed agents.
 */

const A = args || {}

const VERDICTS = ['changed', 'unchanged']
const OUTCOMES = ['working', 'not working', 'not exercised']
const SEVERITIES = ['blocker', 'major', 'minor']
const POLICY_KEYS = ['promptReviewRecurrenceCount', 'promptReviewMajorSeverities', 'promptReviewSkeptics', 'promptReviewCaseRepetitions']
const ANSWERER = 'prompt-case-answerer'
/** A case outcome that keeps its branch out, as the header says why. */
const BLOCKING = ['flipped', 'unanswered']
const DISPOSITIONS = ['kept', 'moved', 'deleted']
/** The severity whose skeptic count judges a consolidation, as the header says why. */
const CONSOLIDATION_SEVERITY = 'blocker'
const PROVISIONED = 'agent/'
const JUDGED = '`.claude/agents/continuous-prompt-improvement.md` § How a file is judged'
const CONSOLIDATED = '`.claude/agents/continuous-prompt-improvement.md` § How a prompt is consolidated'
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
    consolidations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          commit: { type: 'string' },
          wordsBefore: { type: 'integer' },
          wordsAfter: { type: 'integer' },
          removed: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                disposition: { type: 'string', enum: DISPOSITIONS },
                where: { type: 'string' },
                loadedBy: { type: 'string' },
                why: { type: 'string' },
              },
              required: ['text', 'disposition', 'where', 'loadedBy', 'why'],
            },
          },
        },
        required: ['file', 'commit', 'wordsBefore', 'wordsAfter', 'removed'],
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
  required: ['verdict', 'branch', 'head', 'filesChanged', 'changes', 'consolidations', 'notChanged', 'earlierReviews', 'unverified', 'gates'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: { verdict: { type: 'string', enum: ['upheld', 'refuted', 'unverified'] }, reason: { type: 'string' } },
  required: ['verdict', 'reason'],
}

const ANSWER_SCHEMA = { type: 'object', properties: { choice: { type: 'integer' }, why: { type: 'string' } }, required: ['choice', 'why'] }
const READ_SCHEMA = { type: 'object', properties: { output: { type: 'string' } }, required: ['output'] }

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
  if (!isPlainObject(p)) return 'args.policy must be the `promptReview*` keys of tools/policy/agent-workflows.json, as the agent\'s § 2 prints them'
  const missing = POLICY_KEYS.filter((key) => p[key] === undefined || p[key] === null)
  if (missing.length) return `args.policy has no ${missing.map((k) => `\`${k}\``).join(', ')}: pass the keys tools/policy/agent-workflows.json holds`
  if (!isWhole(p.promptReviewRecurrenceCount)) return 'args.policy `promptReviewRecurrenceCount` must be a whole number of at least 1'
  const majors = p.promptReviewMajorSeverities
  if (!Array.isArray(majors) || majors.some((s) => !SEVERITIES.includes(s))) {
    return `args.policy \`promptReviewMajorSeverities\` must be a list drawn from ${SEVERITIES.join(', ')}`
  }
  const skeptics = p.promptReviewSkeptics
  if (!isPlainObject(skeptics) || SEVERITIES.some((s) => !isWhole(skeptics[s])) || Object.keys(skeptics).length !== SEVERITIES.length) {
    return `args.policy \`promptReviewSkeptics\` must give exactly ${SEVERITIES.join(', ')} each a whole number of at least 1`
  }
  return isWhole(p.promptReviewCaseRepetitions) ? null : 'args.policy `promptReviewCaseRepetitions` must be a whole number of at least 1'
}

/** Why a stored case cannot be answered, or null; `owner` maps each group's files to it. */
function caseProblem(c, owner) {
  if (!isPlainObject(c) || !isText(c.id) || !/^[a-z0-9][a-z0-9-]*$/.test(c.id)) return 'it has no id of lower case letters, digits and dashes'
  if (!isText(c.prompt) || !/^[A-Za-z0-9._/-]+$/.test(c.prompt) || !owner.has(clean(c.prompt))) return `its prompt ${JSON.stringify(c.prompt)} is no group's file`
  if (!isText(c.situation) || !Array.isArray(c.options) || c.options.length < 2 || c.options.length > 4) return 'it needs a situation and two to four options'
  const ids = c.options.map((o) => (isPlainObject(o) ? o.id : undefined))
  if (c.options.some((o) => !isPlainObject(o) || !isText(o.id) || !isText(o.text)) || new Set(ids).size !== ids.length) return 'its options need distinct ids and a text each'
  return ids.includes(c.expected) ? null : `its expected answer ${JSON.stringify(c.expected)} is none of its options`
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
  if (A.cases !== undefined && !Array.isArray(A.cases)) return 'args.cases must be a list'
  const caseIds = new Set()
  for (const [i, c] of (A.cases || []).entries()) {
    const problem = caseProblem(c, owner)
    if (problem) return `args.cases[${i}] cannot be answered: ${problem}`
    if (caseIds.has(c.id)) return `the case id ${c.id} is on two cases`
    caseIds.add(c.id)
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

/** What every skeptic is told of its own conduct, and of an answer it could not establish. */
const SKEPTIC_RULES = 'You change nothing, commit nothing and write nothing to the tracker; throwaway files go under .scratch/ only.'
const UNVERIFIED = '- unverified: you could not establish either. Say what stopped you. Never answer refuted because you could not verify it.'

/** The consolidation group `g` reports of `file`, or undefined. */
const consolidationOf = (g, file) => (g.consolidations || []).find((k) => clean(k.file) === clean(file))

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
    `You are one of ${A.groups.length} reviewers in a batched review of this repository's prompts (\`CLAUDE.md\` § Prompt reviews). You work in a git worktree of your own, on a branch of its own.`,
    '',
    'Rules for this run:',
    '- Change only the files listed under Your files. Create, delete and rename none.',
    "- Commit your change on your branch as one commit, after a consolidation's own commit if you made one. Do not push, open a pull request, stash, reset, rebase or switch branches, and write nothing to the tracker: the session that ran this workflow merges your branch, opens the one pull request and marks the analyses read.",
    '- Throwaway files go under .scratch/ only.',
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
    '- If a file should change: make the edit, stage it with `git add`, run `mise run check:prompts` and `mise run citations:check`, fix what they report in your own files, and commit. Return the verdict changed, with each gate you ran and what it printed.',
    `- If your edit would take a file past its word budget, consolidate the file first, as ${CONSOLIDATED} says, commit that alone, and report it under consolidations.`,
    "- Each change states how often the situation arises (frequency) and what it costs when it does (cost), each figure citing a run, a label count or a pull request, and the net words the edit adds (words, negative when it removes more), counted from `git diff --word-diff=porcelain origin/main...HEAD` on its file.",
    "- After you finish, skeptics judge each change against your branch's diff. A branch merges only when a majority upholds every change on it, so leave out an edit you would not defend.",
    '- branch is what `git branch --show-current` prints, head what `git log -1 --format=%H` prints, and filesChanged what `git diff --name-only origin/main...HEAD` prints, one path each, after your last commit.',
  ].join('\n')
}

function skepticPrompt(g, c, f, i, n) {
  const k = consolidationOf(g, c.file)
  const base = k ? k.commit.trim() : 'origin/main'
  return [
    `You are skeptic ${i} of ${n} on one edit a batched review of this repository's prompts proposes (\`CLAUDE.md\` § Prompt reviews). ${SKEPTIC_RULES}`,
    '',
    `Read ${JUDGED} first. Then read the edit, \`git diff ${base}...${g.branch.trim()} -- ${clean(c.file)}\`, and the file as \`${base}\` has it.`,
    '',
    'Answer two questions about the edit, and only these:',
    '',
    "1. Had the prompt said this, would the runs below have gone differently? Read what each run did, from the evidence and, where it helps, from its issue (`bd show` with the id before the run id's `@`), its commits and its pull request.",
    "2. Does the edit break another path through the prompt, or another caller of it: a skill, an agent, a workflow or CLAUDE.md that runs this prompt or points at the text it changes? `git grep` the file's name and the heading of the section the edit changes.",
    '',
    '- upheld: you checked both; the answer to 1 is yes, and to 2 is no.',
    '- refuted: you checked, and the answer to 1 is no or to 2 is yes. Say which, with the evidence.',
    UNVERIFIED,
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

const rowLine = (row, i) => `${i + 1}. ${row.disposition}: "${row.text}" Where: ${row.where || '-'}. Loaded by: ${row.loadedBy || '-'}. Why: ${row.why || '-'}.`

function consolidationPrompt(k, i, n) {
  const file = clean(k.file)
  return [
    `You are skeptic ${i} of ${n} on one consolidation a batched review of this repository's prompts proposes (\`CLAUDE.md\` § Prompt reviews). ${SKEPTIC_RULES}`,
    '',
    `Read ${CONSOLIDATED} first. Then read the consolidation, \`git diff origin/main...${k.commit.trim()} -- ${file}\`, and each file a row names.`,
    '',
    'Answer two questions about it, and only these:',
    '',
    '1. Does every sentence or clause the diff removes have a row below, and is every row text the diff removes?',
    '2. Does each row hold: a kept rule stated where it names, in a file loaded wherever this prompt is; a moved one told in the pull request it names; a deleted one needless for its reason?',
    '',
    '- upheld: you checked both, and the answer to each is yes.',
    '- refuted: you checked, and the answer to one is no. Name the row or the removal, with the evidence.',
    UNVERIFIED,
    '',
    '## The consolidation, as its agent reported it',
    '',
    `${file}: ${k.wordsBefore} words before and ${k.wordsAfter} after, in ${k.commit.trim()}.`,
    '',
    k.removed.map(rowLine).join('\n'),
  ].join('\n')
}

/** The case's options in the order the `r`th repetition shows them, so each takes each place in turn. */
const rotated = (options, r) => options.slice(r % options.length).concat(options.slice(0, r % options.length))

/** The prompt one answer to case `c` is given, with the version of its prompt under test at `path`. */
function answerPrompt(c, path, r) {
  return [
    `You are a session running \`${c.prompt}\`. Read its text, the version under test, from \`${path}\`, and no other file.`,
    '',
    '## The situation',
    '',
    c.situation,
    '',
    '## The options',
    '',
    ...rotated(c.options, r).map((o, i) => `${i + 1}. ${o.text}`),
  ].join('\n')
}

/** FNV-1a over the UTF-16 code units of `s`, as the reader's command computes it. */
function fnv(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

/**
 * The reader's command: git shows each file at the merge base of `head` with `origin/main` and at
 * `head` into `<root>/<ref>/<file>`, root `.scratch/prompt-case-texts` where the session stands, and
 * it prints each path with a checksum. No model copies a text: each answer reads its file.
 */
function readCommand(head, files) {
  const js = [
    "const cp=require('child_process'),fs=require('fs'),p=require('path');const git=(a)=>cp.execFileSync('git',a,{encoding:'utf8',maxBuffer:1e8,stdio:['ignore','pipe','ignore']});",
    `const root=p.resolve('.scratch/prompt-case-texts');const head='${head}';const files=${JSON.stringify(files).replace(/"/g, "'")};`,
    "const base=git(['merge-base','origin/main',head]).trim();",
    "const texts=[base,head].flatMap((ref)=>files.map((file)=>{const path=p.join(root,ref,file);try{const t=git(['show',ref+':'+file]);fs.mkdirSync(p.dirname(path),{recursive:true});fs.writeFileSync(path,t);return {ref,file,path,bytes:Buffer.byteLength(t)}}catch(e){return {ref,file,path:null,bytes:0}}}));",
    'const s=JSON.stringify({base,root,texts});let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}',
    'console.log(JSON.stringify({base,root,texts,fnv:h}))',
  ].join('')
  return `node --no-warnings -e "${js}"`
}

/** The paths of the old and new texts the reader wrote, keyed by file, or the reason they cannot be used. */
function readTexts(reply, head) {
  let p
  try {
    p = JSON.parse(reply.output)
  } catch (error) {
    return { problem: `the reader's output is not the JSON its command prints: ${JSON.stringify(String(reply.output).slice(0, 200))}` }
  }
  if (!isPlainObject(p) || !isText(p.base) || !isText(p.root) || !Array.isArray(p.texts) || !Number.isInteger(p.fnv)) return { problem: "the reader's output holds no base, root, paths and checksum" }
  if (fnv(JSON.stringify({ base: p.base, root: p.root, texts: p.texts })) !== p.fnv) return { problem: "the reader's copy does not match the checksum its command printed, so it was not copied verbatim" }
  if (!/^[0-9a-f]{40}$/.test(p.base) || !p.root.startsWith('/') || !p.root.endsWith('/.scratch/prompt-case-texts')) return { problem: `the reader's base ${JSON.stringify(p.base)} or root ${JSON.stringify(p.root)} is not what its command prints` }
  const stray = p.texts.find((t) => t.path !== null && t.path !== `${p.root}/${t.ref}/${t.file}`)
  if (stray) return { problem: `the reader names ${JSON.stringify(stray.path)} for ${stray.file}, which is not where its command writes` }
  const at = (ref, file) => p.texts.find((t) => t.ref === ref && t.file === file)?.path ?? null
  return { old: (file) => at(p.base, file), new: (file) => at(head, file) }
}

/* ------------------------------------------------------------------------ judging a report ----- */

/** Whether a consolidation's row says where its text went, as the header's rules ask. */
function placed(row) {
  if (row.disposition === 'kept') return isText(row.where) && isText(row.loadedBy)
  if (row.disposition === 'moved') return isText(row.where)
  return isText(row.why)
}

/** The problems with the consolidations a changed report states, given its own files and the files its branch changes. */
function consolidationProblems(r, own, changed) {
  const problems = []
  const seen = new Set()
  for (const k of r.consolidations) {
    const file = clean(k.file)
    if (!own.has(file)) {
      problems.push(`it states a consolidation of ${file}, which it was not given`)
      continue
    }
    if (!changed.includes(file)) problems.push(`it states a consolidation of ${file}, which its branch does not change`)
    if (seen.has(file)) problems.push(`it states two consolidations of ${file}`)
    seen.add(file)
    if (!isText(k.commit)) problems.push(`its consolidation of ${file} names no commit`)
    if (!(k.wordsAfter < k.wordsBefore)) problems.push(`its consolidation of ${file} frees no words: ${k.wordsBefore} before, ${k.wordsAfter} after`)
    if (!k.removed.length) problems.push(`its consolidation of ${file} lists nothing it removed`)
    const unplaced = k.removed.filter((row) => !placed(row)).length
    if (unplaced) problems.push(`its consolidation of ${file} has ${unplaced} row(s) that do not say where the text went`)
  }
  return problems
}

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
    const unlisted = [...new Set(r.changes.map((c) => clean(c.file)).filter((f) => own.has(f) && !changed.includes(f)))]
    if (unlisted.length) problems.push(`it states a change to ${unlisted.join(', ')}, which its branch does not change`)
    const failing = r.gates.filter((gate) => !gate.passed)
    if (!r.gates.length) problems.push('it changed a file and ran no gate')
    else if (failing.length) problems.push(`its gate(s) ${failing.map((gate) => gate.command).join(', ')} did not pass`)
    problems.push(...consolidationProblems(r, own, changed))
  } else {
    if (changed.length) problems.push(`it reports no change, but its branch changes ${changed.join(', ')}`)
    if (r.changes.length) problems.push(`it reports no change, but states ${r.changes.length} change(s)`)
    if (r.consolidations.length) problems.push(`it reports no change, but states ${r.consolidations.length} consolidation(s)`)
  }
  const foreign = [...new Set(r.changes.map((c) => c.finding.trim()).filter((key) => !keys.has(key)))]
  if (foreign.length) problems.push(`it names the finding(s) ${foreign.join(', ')}, which its group was not given`)
  const named = [...r.changes.map((c) => c.finding.trim()), ...r.notChanged.map((n) => n.finding.trim())]
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
  return { stopped: 'refused', why: badArgs, groups: [], merge: [], runsRead: [], runsHeld: [], findingsHeld: [], cases: [], counts: null }
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
  const keys = new Set(g.findings.map((f) => f.key.trim()))
  const asides = r.notChanged.filter((n) => !keys.has(n.finding.trim()))
  return { ...base, ...r, asides, status: problems.length ? 'refused' : r.verdict === 'changed' ? 'merge' : 'unchanged', problems }
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
const merging = groups.filter((g) => g.status === 'merge')
const toJudge = merging.flatMap((g) => [...g.consolidations.map((k) => ({ g, k })), ...g.changes.map((c) => ({ g, c, f: findingOf(g, c.finding) }))])

/** The `i`th of `n` skeptics of one item to judge: a consolidation, or a change. */
function skeptic({ g, k, c, f }, i, n) {
  return k
    ? agent(consolidationPrompt(k, i, n), { label: `skeptic ${i}/${n} ${g.id}: consolidation of ${clean(k.file)}`, phase: 'Confirm', schema: VERDICT_SCHEMA })
    : agent(skepticPrompt(g, c, f, i, n), { label: `skeptic ${i}/${n} ${g.id}: ${f.key.trim()}`, phase: 'Confirm', schema: VERDICT_SCHEMA })
}

if (toJudge.length) {
  phase('Confirm')
  const judged = await pipeline(
    toJudge,
    (item) => {
      const n = A.policy.promptReviewSkeptics[item.k ? CONSOLIDATION_SEVERITY : item.f.severity]
      return parallel(Array.from({ length: n }, (_, i) => () => skeptic(item, i + 1, n)))
    },
    (votes) => tally(votes),
  )
  toJudge.forEach(({ k, c, f }, i) => {
    const t = judged[i] || { outcome: 'unverified', skeptics: 0, upheld: 0, refuted: 0, votes: ['the skeptics returned nothing'] }
    if (k) Object.assign(k, t)
    else Object.assign(c, { severity: f.severity, count: f.count, met: metBy(f), ...t })
  })
  for (const g of merging) {
    const lost = [
      ...g.consolidations.filter((k) => k.outcome !== 'upheld').map((k) => ({ name: `the consolidation of ${clean(k.file)}`, votes: voteLine(k) })),
      ...g.changes.filter((c) => c.outcome !== 'upheld').map((c) => ({ name: c.finding.trim(), votes: voteLine(c) })),
    ]
    if (lost.length) {
      g.status = 'not-upheld'
      g.lost = lost.map((l) => l.name)
      log(`Group ${g.id} not upheld: ${lost.map((l) => `${l.name} (${l.votes})`).join('; ')}`)
    }
  }
}

const reps = A.policy.promptReviewCaseRepetitions
const majority = Math.floor(reps / 2) + 1

/** One case's outcome from its old and new answers, each the option an answer chose or null. */
function judgeCase(g, c, olds, news) {
  const right = (list) => list.filter((o) => o === c.expected).length
  const [o, w] = [right(olds), right(news)]
  const outcome = [...olds, ...news].includes(null) ? 'unanswered' : o >= majority ? (w >= majority ? 'held' : 'flipped') : w >= majority ? 'fixed' : 'failing'
  return { id: c.id, prompt: clean(c.prompt), group: g.id, outcome, old: o, new: w, of: reps }
}

/** Every answer to case `c` of group `g`, `reps` with its old text and `reps` with its new. */
async function answerCase(g, c, texts) {
  const file = clean(c.prompt)
  const [oldPath, newPath] = [texts.old(file), texts.new(file)]
  if (oldPath === null || newPath === null) return { ...judgeCase(g, c, [null], []), answers: [], why: `git could not show ${file} at both texts` }
  const asks = ['old', 'new'].flatMap((side) => Array.from({ length: reps }, (_, r) => ({ side, r, path: side === 'old' ? oldPath : newPath })))
  const replies = await parallel(
    asks.map(({ side, r, path }) => () => agent(answerPrompt(c, path, r), { label: `answer ${r + 1}/${reps} ${side} ${g.id}: ${c.id}`, phase: 'Regress', schema: ANSWER_SCHEMA, agentType: ANSWERER })),
  )
  const answers = asks.map(({ side, r }, i) => ({ side, option: replies[i] ? rotated(c.options, r)[replies[i].choice - 1]?.id ?? null : null, why: replies[i]?.why ?? 'the answerer returned nothing' }))
  const of = (side) => answers.filter((a) => a.side === side).map((a) => a.option)
  return { ...judgeCase(g, c, of('old'), of('new')), answers, why: null }
}

/** The outcome of every stored case of the files group `g`'s branch changes. */
async function regress(g) {
  const files = new Set(g.filesChanged.map(clean))
  const mine = (A.cases || []).filter((c) => files.has(clean(c.prompt)))
  if (!mine.length) return []
  const head = g.head.trim()
  const unread = (why) => mine.map((c) => ({ ...judgeCase(g, c, [null], []), answers: [], why }))
  if (!/^[0-9a-f]{40}$/.test(head)) return unread(`its head ${JSON.stringify(head)} is no commit hash, so its text cannot be read`)
  const reply = await agent(
    `Run this one command where you stand, and return in output the one line it prints, verbatim, even where it looks wrong. Change nothing else.\n\n${readCommand(head, [...new Set(mine.map((c) => clean(c.prompt)))])}`,
    { label: `read ${g.id}`, phase: 'Regress', schema: READ_SCHEMA, effort: 'low' },
  )
  const texts = reply ? readTexts(reply, head) : { problem: 'the reader returned nothing' }
  if (texts.problem) return unread(texts.problem)
  return (await pipeline(mine, (c) => answerCase(g, c, texts))).map((r, i) => r || { ...judgeCase(g, mine[i], [null], []), answers: [], why: 'its answers could not be run' })
}

const stillMerging = groups.filter((g) => g.status === 'merge')
const caseResults = []
if (stillMerging.some((g) => (A.cases || []).some((c) => g.filesChanged.map(clean).includes(clean(c.prompt))))) {
  phase('Regress')
  const regressed = await pipeline(stillMerging, regress)
  stillMerging.forEach((g, i) => {
    const mine = regressed[i] || []
    caseResults.push(...mine)
    const blocking = mine.filter((r) => BLOCKING.includes(r.outcome))
    if (blocking.length) {
      g.status = 'regressed'
      g.regressedBy = blocking.map((r) => `${r.id} (${r.outcome}: ${r.why ?? `${r.old} then ${r.new} of ${r.of} right`})`)
      log(`Group ${g.id} regressed: ${g.regressedBy.join('; ')}`)
    }
  })
}

const read = (g) => g.status === 'merge' || g.status === 'unchanged' || g.status === 'not-upheld' || g.status === 'regressed'
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
  const lost = g.status === 'not-upheld' ? g.lost : []
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
    } else if (g.status === 'regressed') {
      reason = `upheld, but its branch turned a stored case wrong or left one unanswered, so the branch was not merged: ${g.regressedBy.join('; ')}`
    }
    if (reason) findingsHeld.push({ key, runs: f.runs, count: f.count, reason })
  }
}

const count = (status) => groups.filter((g) => g.status === status).length
const judgedChanges = toJudge.filter(({ c }) => c).map(({ c }) => c)
const judgedConsolidations = toJudge.filter(({ k }) => k).map(({ k }) => k)
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
  consolidations: judgedConsolidations.length,
  consolidationsUpheld: judgedConsolidations.filter((k) => k.outcome === 'upheld').length,
  consolidationSkeptics: judgedConsolidations.reduce((n, k) => n + k.skeptics, 0),
  runs: allRuns.length,
  runsRead: runsRead.length,
  runsHeld: runsHeld.length,
  findingsHeld: findingsHeld.length,
  cases: caseResults.length,
  flipped: caseResults.filter((r) => r.outcome === 'flipped').length,
  unanswered: caseResults.filter((r) => r.outcome === 'unanswered').length,
  answers: caseResults.reduce((n, r) => n + r.answers.length, 0),
  regressed: count('regressed'),
}
const merge = groups.filter((g) => g.status === 'merge').map((g) => g.branch.trim())
const cases = caseResults

if (counts.died === counts.groups) {
  const why = 'every agent returned nothing, so no file was reviewed and every run stays pending'
  log(`Stopped (agent-died): ${why}`)
  return { stopped: 'agent-died', why, groups, merge, runsRead, runsHeld, findingsHeld, cases, counts }
}
const consolidationClause = counts.consolidations
  ? `; ${counts.consolidationsUpheld} of ${counts.consolidations} consolidation(s) upheld by ${counts.consolidationSkeptics} skeptic(s)`
  : ''
const caseClause = counts.cases
  ? `; ${counts.flipped} of ${counts.cases} stored case(s) flipped and ${counts.unanswered} unanswered, by ${counts.answers} answer(s), ${counts.regressed} branch(es) kept out`
  : ''
const why = `${counts.merge} to merge, ${counts.unchanged} unchanged, ${counts.notUpheld} not upheld, ${counts.refused} refused, ${counts.died} died; ${counts.upheld} of ${counts.changes} change(s) upheld by ${counts.skeptics} skeptic(s)${consolidationClause}${caseClause}; ${counts.runsRead} of ${counts.runs} run(s) read, ${counts.findingsHeld} finding(s) held`
log(`Stopped (done): ${why}`)
return { stopped: 'done', why, groups, merge, runsRead, runsHeld, findingsHeld, cases, counts }
