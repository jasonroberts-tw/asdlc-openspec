# `tools/policy/`

**The workflow's policy: every constant a prompt or a tool reads, each under a key with its reason
beside it, in one record per kind of key.** The records split the constants by who may change them
and who reads them (`docs/decisions.md` § D-27). Every record is a hand-authored decision record
(`CLAUDE.md` § Three kinds of file, and never a fourth): it opens with `describes`,
`whyThisFileExists`, `gatedBy`, `whatItDoesNOTDo` and `provenance`, and gives each constant a
`<key>Means` sibling.

A reader asks for a key, never for a record: `tools/lib/policy.ts` merges every record into one
object and refuses a key two records define, and `node tools/lib/policy.ts <key>...` prints keys for
a prompt or a workflow's command. `check:policy` refuses a record without its header, a constant
without its `Means`, a key in two records, and a record this table does not name. What each value
must be is held by the gates its record's `gatedBy` names.

Each record's header is the authority on it. Where a row here and a record disagree, the record wins
and the row is corrected; where a record and `docs/decisions.md` disagree, the register wins.

| Record | Who merges a change | What it holds |
|---|---|---|
| `vocabulary.json` | the reviewer; a person for a key `prReviewHighRiskJsonKeys` names | The spellings every stage of the workflow agrees on. For a change: the label on its epic and tasks (`specChangeLabel`) and each capability's ID prefix (`specIdPrefixes`). For the tracker: the three label vocabularies a run leaves there and the instant from which a found issue must carry a found-at label, the type and priority every issue is filed with (`issueTypes`, `issuePriorities`), and the command that files a found issue with them. For a test: the hash length and layers of its trace line, the layers that count toward a scenario's obligation, and the key of the trailer that records an architect's decision to remove, skip or weaken one. `openspec:check`, `calculator:test`, `trace:check`, `tests:inventory:check` and `beads:check` hold them. |
| `agent-workflows.json` | the reviewer; a person for a key `prReviewHighRiskJsonKeys` names | The sizes and bounds of the agent workflows: the build workflow's review, red run and independent test-builder (`buildReview*`, `buildRedFirstKinds`, `buildIndependentKinds`, `independent*`, `architectRunLayers`, `buildArchitectMaxRounds`); the scenario trace at verify (`verifyTrace*`); the batched prompt review's markers, thresholds and skeptics, and its TypeSafe match's (`promptReview*`, kept together because the reviewer reads them by prefix); and the bounds on a workflow a session writes itself (`session*`). `workflows:selftest` holds the ones a workflow script reads, and `prompt-review:match:selftest` the match's. |
| `pr-review.json` | a person: `prReviewHighRiskPaths` names it | What the pull-request reviewer decides a merge by (`prReview*`): the shape of an issue's ID, its status and required check, its labels and approvers, the rubric the branch reviewer holds each path to, the high-risk floor, which is the whole decision since `docs/decisions.md` § D-37, the merge method, and how often a session's `scripts/pr-review.mjs wait` reads a pull request. `pr-review:check` holds them, and refuses a floor that does not cover this record, `prompt-budgets.json`, the loader, `tools/lib/policy.ts`, the git helper the merging job imports, the branch reviewer and the `open-pr` skill that runs it, `tasks.toml`, the approval-label guard and the helper it imports, a committed `node_modules`, a Stryker config, or the toolchain's config and lock files and the dev container's Dockerfile. It refuses too a floor that misses a file a gate `prReviewFloorTasks` lists runs or imports, or a policy key such a file names, which it derives (`docs/decisions.md` § D-38). |
| `prompt-budgets.json` | a person: `prReviewHighRiskPaths` names it | `promptWordBudgets`, one table keyed by each prompt's path, each row the most words the prompt may hold and the reason for the figure. `check:prompts` refuses a prompt over its budget or with no row, a row that names no prompt, and a row with no reason. |
| `tool-settings.json` | the reviewer; a person for a key `prReviewHighRiskJsonKeys` names | The settings of single tools: the coverage and mutation gate (`threshold*`, `mutationCommands`), the worktree sweep (`worktreeGc*`), the git hook runner's output (`gitHooksFailedOutputBytes`), the fresh run's deadline (`freshRunDeadlineSeconds`), the platforms the toolchain's lockfile covers (`toolchainLockPlatforms`), the local code graph (`graphify*`), the co-change map (`coupling*`), and the advisory citation-support check (`typesafeModel`, `citationSupport*`). The harness reads six of them through `tools/harness/harness.config.json`, which keeps its own settings beside it (`docs/decisions.md` § D-26). |
