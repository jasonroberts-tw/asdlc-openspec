# asdlc-openspec-1kie · A stored case may be prose: the review answers it, TypeSafe grades each answer in a script the session runs, and its counts are listed and block nothing

**Recorded 2026-10-10**, carried by `asdlc-openspec-1kie`. On 2026-10-07 the maintainer chose prose
cases graded by TypeSafe as advisory, from four options each put with the case where it loses, as the
issue's note of that date records: items 1, 3 and 4. The session that built it chose items 2, 5 and
6.

**Builds on / amends:** amends D-32, whose item 5 held every case's expected answer to an option.
Builds on D-42, under which every TypeSafe call runs in a script a session runs and an answer may go
to a person; on D-12, under which each prompt this edit took past its budget had a pass for what it
could free before its raise; and on D-27, under which the threshold lives in `tools/policy/`.

**Decision.** How a prompt review tests what a prompt has a session write. `.claude/prompt-cases/README.md`
§ Prose cases holds the format and the steps; the headers of `.claude/workflows/review-prompts.js`
and `scripts/grade-prose-cases.mjs` hold the mechanics; `.claude/agents/continuous-prompt-improvement.md`
§ 4 and § 7 hold the reviewer's part.

1. **A stored case may be a prose case**: `kind` is `prose`, it has no options, and its `expected` is
   one sentence saying what a right text does.
2. **The review answers it as it answers a choice case**, from the same reader's texts, by the same
   agentType, `promptReviewCaseRepetitions` times with the old text and as many with the new. It
   returns the answers in `prose`, each entry sealed with an FNV-1a checksum over its fields, so the
   grader refuses a copy the session did not make verbatim.
3. **TypeSafe grades each answer, in a script the session runs.** `mise run prompt-review:grade` asks
   one Noul per answer whether its text does what `expected` says. An answer meets the case at
   `promptReviewProseMinProbability`, and the case's outcome follows from those counts as a choice
   case's does from its right answers. With no `TYPESAFE_API_KEY` every case is `ungraded`, and the
   output says why.
4. **Its counts are listed in the review's pull request and keep no branch out**, whatever they are:
   a grader's verdict informs the person who merges (`CLAUDE.md` § A program proposes; only a person
   promotes).
5. **A prose case is written and stored by hand**, in a pull request of its own, and validated by no
   authoring run, since that workflow judges options alone and nothing a prose case says blocks.
6. **The threshold starts at 0.5, unmeasured.** The session that built this had no key, so TypeSafe has
   graded no prose answer here; the key's `Means` says the value is provisional.

**Why.** A prompt whose output is prose, such as eli5, was held only on what it says it would do.
Its own risk is that its failures read as success: a dropped caveat or a new figure looks like a
clearer explanation, and a forced choice that spells the caveat out passes a text that drops it. Three
options lost to the maintainer's choice:

- **llm-rubric, advisory**, the recommendation of `asdlc-openspec-7c1`'s note of 2026-10-01. It
  needs promptfoo as a new devDependency, a pinned grader, and a key this repository does not store.
  TypeSafe is already a dependency, used the same advisory way by `citations:support`.
- **llm-rubric, blocking.** It catches the dropped caveat, and keeps a branch out whenever the grader
  misreads the new text in a majority of its repetitions.
- **No prose cases.** eli5 and the branch reviewer's prose rule stay unguarded by the bank.

Two of the session's choices had alternatives:

- **The grade inside the review workflow**, through an agent that runs the script, as its reader
  runs a command. A workflow has no Node API, so D-42 keeps every call out of it, and an agent running
  it would put the key in a workflow agent's reach for a verdict that blocks nothing.
- **Prose cases validated before they are stored**, as item 4 of D-32 validates a choice case. That
  would need the grader in the authoring run, a key there and twice the calls. A prose case that
  flips by noise costs a person's reading, not a branch.

Where it loses:

- **A new eli5 text drops the "two tests were skipped" caveat.** Its prose case flips, and the branch
  still merges unless the person merging reads the counts.
- **A prose case the trunk already fails is stored**, since nothing validates it, and shows `failing`
  at every review until a person fixes the text or the case.
- **The grader is unmeasured.** Whether TypeSafe grades a prose answer as well as llm-rubric would is
  not known: no eval ran, and the session had no key to run one. A grader whose yes runs high on a
  text that drops what the case holds reads the flip as held.
- **A session's copy is checked, not its choice.** The checksum refuses a copy that is not verbatim,
  but nothing holds a session to grading at all; the description says only what the session wrote.

**What changed.**

- **`docs/decisions.md`:** the amendment under D-32.
- **`docs/decisions/`:** this record.
- **Added:** `scripts/grade-prose-cases.mjs`, the grader, as `mise run prompt-review:grade`, with
  `PROMPT_REVIEW_GRADE_ROOT` as its root override; `scripts/lib/fnv.mjs`, the checksum it and the
  selftest share.
- **`.claude/workflows/review-prompts.js`:** a prose case's refusals, its answer prompt with no
  options, `PROSE_SCHEMA`, `prose` in its result with each entry sealed, and `counts.prose` and
  `counts.proseAnswers`; its header's THE PROSE CASES, WHAT IT RETURNS and LABELS.
- **`.claude/agents/prompt-case-answerer.md`:** its answer to a case with no options.
- **`.claude/agents/continuous-prompt-improvement.md`:** § 4 runs the grader, and § 7 item 3 lists its
  counts.
- **`.claude/prompt-cases/README.md`:** § Prose cases, and the `kind`, `options` and `expected` rows.
- **`scripts/workflows.selftest.mjs`:** the review's prose cases, a prose case beside the bank, and the
  grader's cases over a stubbed judge, on the review's own `prose`, and once through the real SDK to a
  closed loopback port; its header.
- **`tools/policy/agent-workflows.json`:** `promptReviewProseMinProbability` and its `Means`;
  `gatedBy` and `provenance`. **`tools/policy/prompt-budgets.json`:** the three raised budgets and
  `provenance`.
- **The wiring:** `prompt-review:grade` in `tasks.toml` and `workflows:selftest`'s description; the
  grader in `workflows-selftest`'s glob and comment in `git-hooks.yml`; `prompt-review:grade` in
  `UNJOBBED_BY_KIND` of `scripts/check-jobs.mjs`.
- **The rest:** rows of `README.md` § The guardrails, § What runs automatically, § The tasks and the
  prompt review's row; `scripts/README.md` and `.claude/README.md`.

**Figures.**

- Word counts, each `node scripts/check-prompts.mjs --counts` before this change and at its commit:
  the literals of `review-prompts.js` 2,048 and 2,086; `continuous-prompt-improvement.md` 2,445 and
  2,495; `prompt-case-answerer.md` 237 and 262.
- `mise run workflows:selftest` at this entry's commit: 319 of 319 cases hold, 9 of them the
  grader's. The same selftest run against the trunk's `review-prompts.js`, through `WORKFLOWS_ROOT` on
  a copy of the trunk given this change's policy record, held 303 of 310, the 7 new review and bank
  cases failing; with the grader's cases in, its control failed first.
- At the policy's 3 repetitions, a review asks TypeSafe 6 questions for each prose case of a branch
  it would merge (`tools/policy/agent-workflows.json`).
