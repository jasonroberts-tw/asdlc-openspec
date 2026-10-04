# The decision register

One file of numbered decisions (`D-NN`) and risks (`R-NN`). A decision that is not
written down is re-argued from the losing side the next time an agent meets it; one that is written
here is not re-litigated by any agent (`CLAUDE.md` § Decisions live in the register). **When a
document and this register disagree, the register wins**, and the document is what needs correcting.

<!-- kit 2.1-1 · ADAPT: the one entry below is true of any repository bootstrapped from the starter
     kit. It is dated 1970-01-01 because the kit cannot know the day you adopted it. Replace that
     date with yours in BOTH places it appears (the status line's parenthetical and the entry's
     Recorded line; `mise run check:register` holds the two to each other), name the issue that
     carried the adoption, and delete this comment. Your own first decision is D-02. -->

**Status: every decision from D-01 to D-35 is recorded and applied (D-01 added 1970-01-01; D-02 and D-03 added 2026-09-23; D-04, D-05 and D-06 added 2026-09-24; D-07 added 2026-09-25; D-08, D-09, D-10, D-11 and D-12 added 2026-09-26; D-13, D-14, D-15 and D-16 added 2026-09-28; D-17 added 2026-09-29; D-18 added 2026-09-30; D-19, D-20, D-21, D-22 and D-23 added 2026-10-01; D-24, D-25, D-26, D-27 and D-28 added 2026-10-02; D-29, D-30, D-31, D-32 and D-33 added 2026-10-03; D-34 and D-35 added 2026-10-04).**

> The status line and the table below are a summary of the `### D-` headings, never the reverse:
> update them from the headings, and never delete a line to make the gate pass. The range
> `D-01 … D-35` is checked by `mise run check:register`, which reads those headings, the table and each
> entry's Recorded line, in both directions. Adding a decision means a new heading, a new table row, a
> new clause in the status line's parenthetical and a new bound in the two places above, in one change.
> No other file states the range: a file that cites this register cites it without a bound, because a
> copy that is right today is the copy that goes stale next.

## How an entry is written

Every entry has the same skeleton, in this order:

```text
### D-NN · <title>

**Recorded YYYY-MM-DD**, carried by <the issue in the task store that carried it>.

**Builds on / amends:** <the ids this entry builds on or amends, or "nothing">.

**Decision.** <what was decided, stated so that it can be followed without reading the rest>.

**Why.** <the reason, and the alternative that lost>.

**What changed.** <the file-level record: each file added, changed, moved or deleted>.

**Figures.** <every figure the entry states, each with the command that re-derives it beside it;
or "none">.
```

A risk is `### R-NN · <title>` with the same skeleton, **Risk** in place of **Decision**.

## How an entry changes

An entry is never rewritten. A later decision that changes it adds a dated blockquote under each
entry it changes, in the form `> **Amended YYYY-MM-DD by D-NN.** <what changed>`, and lists every
entry it amended in its own body. A superseded entry keeps its heading, marked superseded, so an id
cited anywhere still resolves. A withdrawn risk keeps its id, which is never reused, and is never
reported as closed or met: it was withdrawn, and the entry says why.

## Decisions — recorded and applied

| Id | Decision | Applied as |
|---|---|---|
| **D-01** | This repository adopts the starter kit's conventions | `CLAUDE.md`, this register, and the files the kit's bootstrap laid down |
| **D-02** | Product work runs as OpenSpec-format changes, tracked in `bd` | The `change-*` skills, `openspec/`, the `openspec:check` gate, and the generated `openspec-*` skills deleted |
| **D-03** | The workflow's constants live in `tools/policy.json`, starting with the change label | `tools/policy.json`, the key cited by every prompt that spells the label, and `openspec:check` holding them to it |
| **D-04** | The repository carries a demo product, a calculator served on loopback only | `apps/calculator/`, served by `npm run calculator:serve` on `127.0.0.1` alone; its tests as the `calculator-test` pre-push job and a CI step; and the worktree briefing's port paragraphs |
| **D-05** | A prompt review runs in the background, and lives in its own pull request rather than in a file | `CLAUDE.md` § Prompt reviews, the `continuous-prompt-improvement` agent, and `docs/prompt-reviews/` and every `Reviewed:` trailer deleted |
| **D-06** | The learning loop is retired; a run's labels in the tracker show what recurs | `tools/outcomes/` and `artifacts/outcomes/` deleted with their scripts and jobs; three label vocabularies in `tools/policy.json`; `CLAUDE.md` § The task store and § Product work runs as OpenSpec-format changes; `change-finalize`'s report and the prompt reviewer's analysis read the counts |
| **D-07** | A reviewer merges each pull request that satisfies the issues it carries, one at a time | `.github/workflows/pr-review.yml`, the `pr-reviewer` agent and `scripts/pr-review.mjs`; the `prReview*` keys of `tools/policy.json`; `CLAUDE.md` § Git workflow; the `bead` and `change-finalize` skills; `verify.yml` dispatched after each merge |
| **D-08** | A run leaves its analysis in the tracker, and one review reads every pending analysis as a batch | `CLAUDE.md` § Prompt reviews; the `continuous-prompt-improvement` agent and `.claude/workflows/review-prompts.js`, held by `workflows:selftest`; the four `promptReview*` keys of `tools/policy.json`; `bead` § 8 |
| **D-09** | An in-session guard refuses a `gh` command that applies the approval label, from any checkout | `scripts/hooks/guard-git.mjs`, held by `worktree:selftest`; the guard's rows in `.claude/README.md`, `scripts/hooks/README.md` and `README.md` |
| **D-10** | A prompt review proposes an edit only for a finding that recurs or is severe, and carries it once skeptics uphold it | The threshold check and the skeptic step of `.claude/workflows/review-prompts.js`, held by `workflows:selftest`; `promptReviewHeldMarker`, `promptReviewRecurrenceCount`, `promptReviewMajorSeverities` and `promptReviewSkeptics` in `tools/policy.json`; `CLAUDE.md` § Prompt reviews; the `continuous-prompt-improvement` agent |
| **D-11** | `beads:check` refuses an open found issue with no asset label, as D-06 item 4 asked | Rule 4 of `scripts/check-beads.mjs`, held by `beads:selftest` at pre-push and in CI; `gatedBy` in `tools/policy.json` |
| **D-12** | A prompt that an edit would take past its word budget is consolidated first, and every rule it removes is accounted for | `.claude/agents/continuous-prompt-improvement.md` § How a prompt is consolidated; the consolidations of `.claude/workflows/review-prompts.js`, held by `workflows:selftest`; the refusal of `check:prompts`; `bead` consolidated and its budget lowered in `tools/policy.json` |
| **D-13** | The agentic test strategy is adopted, and each of its rules lands in a home of its own | `docs/test-strategy.md` as the dated record; each rule's home, a gate's header, a skill or the build workflow, landed by the issue item 17's table names |
| **D-14** | A build task sees each scenario's proof fail before the code that passes it, or reports it already green, and the build workflow stops a run that does neither | The `not-red` stop and red records of `.claude/workflows/build-change-task.js`, held by `workflows:selftest`; `buildRedFirstKinds` in `tools/policy.json`; `change-build` § 3; `bead` § 4 |
| **D-15** | The kit's pipeline graph is retired; a check that reads outside the repository is stood in for by its selftest | `tools/pipeline/`, `docs/pipeline.md`, the `corpus-regen` formula and the sibling-checkout resolvers deleted with their scripts, jobs and steps; `gitEnv()` kept in `tools/lib/git-env.ts`; `CLAUDE.md` § The gate ladder |
| **D-16** | A session's own review and design workflows are bounded by policy, and the build and prompt reviews send one skeptic to a major finding | `CLAUDE.md` § A workflow a session writes itself is bounded, consolidated first; `sessionReviewMaxFindings`, `sessionReviewSkeptics` and `sessionWorkflowMaxAgents` in `tools/policy.json`; `buildReviewSkeptics.major` and `promptReviewSkeptics.major` at 1, held by `workflows:selftest` |
| **D-17** | A run closes through the `close-prompt-run` skill, which names each prompt review for itself, and the reviewer reads its policy first and makes no worktree it does not need | `.claude/skills/close-prompt-run/SKILL.md`; `CLAUDE.md` § Prompt reviews and § Bash command style; the `continuous-prompt-improvement` agent, consolidated first; `bead` § 8; the three prompts' budgets and the skill's in `tools/policy.json` |
| **D-18** | RTK is removed, with the ripgrep step it needed and the guard's reading of its prefix | `CLAUDE.md` without its block, and its budget in `tools/policy.json`; `README.md` § Setup and `.devcontainer/` without RTK or ripgrep; `scripts/hooks/guard-git.mjs`, which no longer reads through an `rtk` prefix, and `worktree:selftest` without its `rtk` cases; the guard's rows in `README.md`, `.claude/README.md` and `scripts/hooks/README.md` |
| **D-19** | Git's config-based hooks replace lefthook, and dispatch to a runner of this repository's own | `scripts/git-hooks.mjs`, the runner, with its install, `mise run gates` through `git hook run`, and `hooks:selftest` at pre-push and in CI; `git-hooks.yml`, the renamed job file, read by `scripts/check-jobs.mjs`; `gitHooksFailedOutputBytes` in `tools/policy.json`; `package.json` without lefthook, and its `prepare`; `.devcontainer/` without lefthook or `bd hooks install`; `CLAUDE.md` § The gate ladder; `lefthook-windows.yml` deleted (`asdlc-openspec-uc1`) |
| **D-20** | A local code graph is built with graphify on each person's machine, never committed, and queried through its MCP server | `scripts/code-graph.mjs` as `mise run code-graph` and `code-graph:mcp`, held by `code-graph:selftest` at pre-push and in CI; `graphify-out/` in `.gitignore`; the `code-graph` skill; the worktree briefing's carve-out, consolidated first; the `graphify*` keys and two budgets in `tools/policy.json`; D-19's amendment |
| **D-21** | `open-pr` reviews each branch before its push, in an agent's own context, and the reviewer's brief carries the facts its job can compute | `.claude/skills/open-pr/SKILL.md` § 5 and the `branch-reviewer` agent; `brief --local` and the brief's three facts in `scripts/pr-review.mjs`, held by `pr-review:selftest`; `.claude/agents/pr-reviewer.md` § What you are given; the three prompts' budgets in `tools/policy.json` |
| **D-22** | The tracker's git integration runs from the job file, and the install clears what lefthook left in .git/hooks | The tracker's five jobs in `git-hooks.yml`; `.devcontainer/entrypoint.sh` without `bd hooks install`; the install's cleanup and the runner's warnings in `scripts/git-hooks.mjs`, held by `hooks:selftest`; D-19's amendment |
| **D-23** | An in-session guard refuses graphify's update, watch, hook install and claude install, from any checkout | `scripts/hooks/guard-git.mjs`, held by `worktree:selftest`; the guard's rows in `.claude/README.md`, `scripts/hooks/README.md` and `README.md`, and the code graph's row in `README.md` § The guardrails; D-20's amendment |
| **D-24** | The co-change map of merged pull requests is committed, pinned to a trunk commit that only its `:update` moves | `tools/coupling/` as `mise run coupling` and `coupling:update`, held by `coupling:check` and `coupling:selftest` at pre-push and in CI; `artifacts/coupling/cochange.json`; the `coupling*` keys in `tools/policy.json`; trace's git and committed-file helpers moved to `tools/lib/` |
| **D-25** | The emitter-drift hook is retired, its list of triggers empty | `scripts/hooks/check-emitted-drift.mjs` and its `PostToolUse` registration in `.claude/settings.json` deleted; its rows in `README.md`, `.claude/README.md` and `scripts/hooks/README.md` removed; `CNT-HOOKS` re-derived; D-06's and D-24's amendments |
| **D-26** | The harness assessment is split by what each half reads, reports and enforces nothing, and takes its repository's specifics from one record | `tools/harness/` as `mise run harness` and `harness:graph`, held by `harness:selftest` at pre-push and in CI, with a Python 3 beside the step; `tools/harness/harness.config.json`; five job globs widened and `worktree:selftest` named in the CI file's absent block, from its first report |
| **D-27** | The policy is split under `tools/policy/` by who may change each key and who reads it, read through one loader and held by a gate of its own | `tools/policy/`, five records and a README, and `tools/policy.json` deleted; `tools/lib/policy.ts`; `check:policy` and its selftest at pre-push and in CI; `check:prompts` reading the budgets by path; `CLAUDE.md` § Three kinds of file, and never a fourth, consolidated first; D-03's, D-07's, D-23's and D-26's amendments |
| **D-28** | The code-graph server serves the harness assessment's combined graph while it was built from the graph beside it | `scripts/code-graph.mjs`'s choice of the file it registers, held by `code-graph:selftest`; `tools/harness/graph.py` writing the combined graph beside the graph with the graph's blob id, held by `harness:selftest`; `graphifyCombinedGraphFile` in `tools/policy/tool-settings.json`; the `code-graph` skill, consolidated first; D-20's and D-26's amendments |
| **D-29** | An issue's type and priority are the first rows of a rubric in the policy that fit it, and `beads:check` refuses a type the rubric does not name | `issueTypes`, `issuePriorities` and `foundIssueCommand` in `tools/policy/vocabulary.json`; rule 5 of `scripts/check-beads.mjs`, held by `beads:selftest` at pre-push and in CI; `CLAUDE.md` § The task store, consolidated first, and its budget in `tools/policy/prompt-budgets.json` |
| **D-30** | The explore skill is OpenSpec's explore stance, adapted: it draws, cites, writes only a brief, and hands a change to `change-propose` | `.claude/skills/explore/SKILL.md` and the `LICENSE` beside it; its budget in `tools/policy/prompt-budgets.json`; the skills row of `.claude/README.md`; `README.md` § Working here; D-13's amendment |
| **D-31** | mise is the toolchain: `mise.toml` is the one home of every tool version, and CI, the dev container and the setup steps install from it | `mise.toml` and `mise.lock`; `check:toolchain` and its selftest at pre-push and in CI; `jdx/mise-action` in both workflows, with `bd` from it held by `pr-review:check`; the dev container's mise layer; `README.md` § Setup; `toolchainLockPlatforms` in `tools/policy/tool-settings.json`; D-26's amendment |
| **D-32** | A prompt review answers each changed prompt's stored decision cases with its old text and its new, and a case that flips from right to wrong keeps the edit out | `.claude/workflows/author-prompt-cases.js` and the Regress phase of `.claude/workflows/review-prompts.js`, held by `workflows:selftest`; the agents `prompt-case-author` and `prompt-case-answerer`; `.claude/prompt-cases/` and its first cases; `promptReviewCaseLenses` and `promptReviewCaseRepetitions` in `tools/policy/agent-workflows.json`; the reviewer and the workflow, consolidated first; D-10's, D-12's and D-17's amendments |
| **D-33** | `utils/install-dolt.sh` and `scripts/python.mjs` retire, made redundant by mise | Both files deleted, and `utils/` with them; `harness:graph` and `harness:selftest` run `python` through mise's shims; their rows in `README.md`, `scripts/README.md` and `tools/README.md`; D-26's and D-31's amendments |
| **D-34** | The `engines` floor rises to Node 24.21.0, the version `mise.toml` pins, so every gate runs it | `engines` in `package.json` and in `package-lock.json`'s root entry; the comment above the `node` pin in `mise.toml`; `README.md` § The Node floor, on every platform; the headers of `scripts/run-tests.mjs` and `scripts/check-thresholds.mjs`; D-31's amendment |
| **D-35** | graphify and uv are pinned in `mise.toml`, and the `graphifyVersion` key retires | The two pins, their lock entries and graphify's uv lock under `.mise/locks/`, which the dev container copies in; `check:toolchain` admitting a `pypi:` tool's `version` and `extras` and holding its uv lock; `scripts/code-graph.mjs` reading the pin and registering `mise which`'s `graphify-mcp`; the key gone from `tools/policy/tool-settings.json`; D-20's, D-23's, D-26's and D-31's amendments |
| **D-35** | mise is the task runner: every task moves from `package.json` to `tasks.toml`, but `prepare` and `calculator:serve` | `tasks.toml`; `mise.toml`'s `[task_config]` and three `task.*` settings, admitted by `check:toolchain`; `package.json` with two scripts; `mise run` in every hook job, CI step, launcher and prompt; `check:jobs` holding the launchers and the one registry; `scripts/fresh-run.mjs` trusting its clone; the `add-npm-script` skill moved to `add-task`; `README.md` § The tasks; D-02's, D-03's, D-04's, D-11's, D-19's, D-20's, D-22's, D-23's, D-24's, D-26's, D-28's and D-29's amendments |

## Risks

| Id | Risk | Held by |
|---|---|---|
| **R-01** | Anything holding a maintainer's credentials, an agent included, can approve a high-risk pull request | `CLAUDE.md` § Git workflow and review; `scripts/hooks/guard-git.mjs` for a session's `gh` command (D-09); nothing for the web UI, curl, a browser tool, a command behind an `rtk` prefix (D-18) or anything outside a session |

## The entries

### D-01 · This repository adopts the starter kit's conventions

**Recorded 1970-01-01**, carried by <the issue in the task store that carried it>.

**Builds on / amends:** nothing; this is the first entry.

**Decision.** This repository is worked in by agents under the conventions laid down from the starter
kit: a rule an agent must follow has exactly one home, a tracked file; every task is an issue in the
task store; decisions are recorded in this register and the register wins a disagreement; and the
same checks run at four latencies, of which a slower tier never trusts a faster one.

**Why.** Each convention was taken because of the failure it prevents, and `CLAUDE.md` states that
failure beside the rule. Adopting them as one recorded decision means a later change to any of them is
an amendment here, with its reason, rather than a quiet edit to a prompt.

**What changed.** `CLAUDE.md` and `AGENTS.md` at the root; this file; and every file
`KIT-CHECKLIST.md` listed as laid down on the day of the bootstrap. The checklist itself is deleted
once it is worked through, and the commit that added these files is the lasting record.

**Figures.** None.

> **Amended 2026-09-24 by D-05.** `CLAUDE.md` § Prompt reviews, as the kit laid it down, no longer holds. A review is no longer kept in a file under `docs/prompt-reviews/` and appended to on every run, and a prompt no longer carries a `Reviewed:` trailer. The reviewer runs in the background, nobody waits for it, and a review that proposes a change is the description of its own pull request.

> **Amended 2026-09-24 by D-06.** The kit's learning loop, its sections 2.3 and 2.4, is retired: `tools/outcomes/`, `artifacts/outcomes/` and their scripts and jobs are deleted. `CLAUDE.md` § A program proposes; only a person promotes keeps its principle and no longer names the loop. What recurs across runs is read from labels in the tracker instead.

> **Amended 2026-09-28 by D-15.** The kit's pipeline graph, its section 2.6, and the `corpus-regen` formula of its section 1.3 are retired: `tools/pipeline/`, `docs/pipeline.md`, `.beads/formulas/corpus-regen.formula.toml` and the sibling-checkout resolvers under `tools/lib/` are deleted with their scripts, jobs and steps. `CLAUDE.md` § The gate ladder no longer names a digest gate as what stands in for a check that reads outside the repository: that check's selftest over fixtures runs in both tiers.

> **Amended 2026-10-01 by D-19.** lefthook is to be replaced. The kit laid it down as the hook runner, and no entry adopted it. Git's config-based hooks will call a runner of this repository's own, and `.git/hooks` is left to the other tools that write there. Until `asdlc-openspec-uc1` lands, lefthook runs the hooks as before. The same checks run at four latencies under either runner.

### D-02 · Product work runs as OpenSpec-format changes, tracked in bd

**Recorded 2026-09-23**, carried by `asdlc-openspec-95a`.

**Builds on / amends:** D-01, which it builds on and does not amend: every task is still an issue
in the task store, and a change's tasks are issues like any other.

**Decision.** Product work, meaning a change to what the product does stated as requirements, runs
as a change in OpenSpec's on-disk format through six skills of this repository's own, in order:
`change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify` and
`change-finalize`.

1. **One change is one worktree and one pull request.** The worktree is `agent/<change>`, cut by the
   one worktree script. The branch carries the change's proposal, its delta specs, its code and its
   archive, and they land together.
2. **The change lives at `openspec/changes/<change>/`**: a `proposal.md`, delta specs under
   `specs/<capability>/spec.md`, and a `design.md` only when the change needs one. A change carries at
   least one delta. Work that changes no requirement is not a change; it goes through the `bead`
   skill.
3. **Each change is one `bd` epic labelled `spec-change`, and its tasks are the epic's children.**
   There is no `tasks.md`. An issue that seeds a change becomes its epic rather than being closed.
   The general sweeps of the queue (`bd ready` in the `bead` skill and the `fan-out-work` agent)
   exclude the label, and `change-build` works the change's own tasks in its worktree. An issue
   discovered along the way is filed without the label, linked `discovered-from` the epic, so it joins
   the general queue. Until `tools/policy.json` exists, this entry is the one home of the label's
   spelling.
4. **The OpenSpec CLI is a pinned devDependency, used for two commands only**: `openspec validate`
   and `openspec archive`. `openspec init` and `openspec update` are not run here.
   `openspec/config.yaml` names the schema and nothing else: the rules for writing a proposal, a
   delta or a design live in the skills.
5. **The archive runs on the change's branch, before the merge.** The living spec (`openspec/specs/`)
   is hand-maintained source that the archive edits, not generated output.
   `openspec/changes/archive/` records what each change proposed; it is history, not a retirement
   under `docs/retired/`.
6. **A change's pull request is rebase-merged.** `npm run worktree:gc` can then prove the branch is
   in the trunk; after a squash merge it keeps the branch.
7. **The ten skills `openspec init` generated under `.claude/skills/openspec-*/` are retired**, and
   `npm run openspec:check` refuses their return.

**Why.** Product work needs two things: a record of requirements that outlives the change that set
them, and a proposal a person reviews before the build starts. OpenSpec's delta specs and living spec
are that record, and `openspec archive` merges a delta into the living spec deterministically. Three
alternatives lost:

- **OpenSpec's own workflow skills.** They track a change's tasks in a `tasks.md` checklist, which
  `CLAUDE.md` § The task store forbids. `openspec update` rewrites them from each machine's global
  configuration, which no project file can pin. Their archive skill bypasses the CLI's merge with a
  plain `mv`.
- **A custom OpenSpec schema whose task artifact files issues in `bd`, with forked skills.** The CLI's
  artifact status, apply progress and archive gate read checkboxes only. The tracker would then need
  a checkbox mirror kept in step by hand, and the schema commands are marked experimental.
- **Writing the delta merge here.** It would be an emitter-sized tool to own, for a merge the pinned
  CLI already performs.

Archiving after the merge also lost. A branch cannot push to `main`, so it would take a second
worktree and a second pull request per change, and the trunk would hold unarchived changes in
between.

**What changed.**

- **This entry.**
- **`CLAUDE.md`:** § Product work runs as OpenSpec-format changes points here and at the skills. § Prompt reviews now says what the basename of a skill's review file is.
- **`.claude/skills/change-{propose,design,plan,build,verify,finalize}/SKILL.md`:** added.
- **`.claude/skills/openspec-*/`:** deleted.
  - `git log -1 --diff-filter=D --format=%H -- .claude/skills/openspec-propose/SKILL.md` names the deleting commit.
  - `git show <that commit>^:<path>` recovers any of its files.
- **`openspec/config.yaml`:** kept from `openspec init`, with its commented examples replaced by the reason it holds nothing but the schema.
- **`openspec/README.md`:** added.
- **`package.json` and `package-lock.json`:**
  - `@fission-ai/openspec` is pinned.
  - Its install script is denied in `allowScripts`; it only prints a shell-completion tip.
  - The scripts `openspec:check` and `openspec:selftest` are added.
- **`scripts/check-openspec.mjs`:** added, run by `lefthook.yml` and `.github/workflows/verify.yml`.
- **`tools/citations/scan.ts`:** `openspec/changes/archive/` is history.
- **`.claude/skills/bead/SKILL.md` and `.claude/agents/fan-out-work.md`:** the general sweep excludes the label.
- **`.claude/worktree-CONTEXT.md.tmpl`:** the merge window binds only a session nobody is directing.
- **`README.md`, `scripts/README.md` and `docs/README.md`:** one row each.

Retirement checklist for the deleted skills, each item done in this change:

- **Their references are gone.** `git grep -n -E "opsx|openspec-(apply|archive|continue|explore|ff|new|propose|sync|update|verify)"` finds only this entry and the gate that refuses the directories.
- **Their return is refused** by `openspec:check`, with the reason naming this entry.
- **No README row named them**, so none was removed.

**Figures.** Ten generated skills deleted. `git log --diff-filter=D --name-only --format= -- '.claude/skills/openspec-*/SKILL.md'` lists them.

> **Amended 2026-09-23 by D-03.** Item 3's last sentence no longer holds: `tools/policy.json` exists, and the label's spelling lives there under `specChangeLabel`. Every skill and agent that spells the label cites that key, and `npm run openspec:check` holds them to its value.

> **Amended 2026-09-28 by D-13.** Item 2's list of what a change's folder holds gains one file: a `findings.md`, the brief of an `explore` run that preceded the change, which `change-propose` commits there. The six stages stand, and Explore is not a stage.

> **Amended 2026-10-04 by D-35.** Item 6's `npm run worktree:gc` and `npm run openspec:check` run as `mise run worktree:gc` and `mise run openspec:check`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-03 · The workflow's constants live in tools/policy.json, starting with the change label

**Recorded 2026-09-23**, carried by `asdlc-openspec-4gp`.

**Builds on / amends:** amends D-02, whose item 3 made that entry the home of the `spec-change` label's spelling until `tools/policy.json` existed. Builds on D-01, whose conventions include `CLAUDE.md` § Three kinds of file, and never a fourth.

**Decision.** `tools/policy.json` is the workflow's policy file. A constant that a prompt or a tool of the workflow reads, and that belongs to no one tool, lives there under a key. Beside it sits a `<key>Means` sibling stating what the value decides, where it is changed, and when and why it was decided.

1. **Its first key is `specChangeLabel`,** the spelling of the label D-02 puts on a change's epic and on every one of its tasks.
2. **A skill or agent that spells the label cites the key.** `npm run openspec:check` refuses one that spells it without citing the key, and one that cites the key but spells another value.
3. **The file declares no `intervention` block.** The run-outcome schema's intervention enum is still the starter kit's starting vocabulary, and nothing but the schema reads it. `npm run outcomes:record:selftest` now ties the two only where the file declares the block, as `tools/outcomes/paths.ts`, the selftest's own header and the schema's description already said.

**Why.** D-02 had to spell the label somewhere, and said the register would hold it until the policy file existed. A register entry is never rewritten, so a spelling kept there could change only by a new decision, and no tool reads the register for it. Meanwhile seven prompts spelled the label and nothing held them to each other. Three alternatives lost:

- **`tools/outcomes/policy.json`,** which already exists. Its `whatItDoesNOTDo` excludes the workflow's own constants, and the label is not the learning loop's.
- **Writing the whole file at once,** moving every constant the prompts and tools read, as `asdlc-openspec-4wk` asked; that issue was closed without the file being written. This entry moves one constant and gives the file its shape. The next constant moves in the change that needs it.
- **Copying the four intervention codes into the file** so that the tie as written would pass. That would be a second copy of a placeholder list, with meanings invented for codes no run has used.

**What changed.**

- **`tools/policy.json`:** added.
- **This register:** D-02 carries the amendment above; the status line, the blockquote's bound and the decisions table carry D-03.
- **`.claude/skills/{bead,change-propose,change-plan,change-build,change-verify,change-finalize}/SKILL.md` and `.claude/agents/fan-out-work.md`:** each cites `specChangeLabel` where it spells the label.
- **`scripts/check-openspec.mjs`:** refuses a policy file without the key or its `Means` sibling, a prompt that spells the label without citing the key, and a prompt that cites the key and spells another value. Its selftest breaks each.
- **`tools/outcomes/record.selftest.ts`:** the intervention tie skips a policy file that declares no `intervention` block, with a case holding that.
- **`lefthook.yml`:** the `openspec` job's glob adds `tools/policy.json` and `.claude/agents/**`, and the `outcomes-record-selftest` job's adds `tools/policy.json`.
- **`tools/README.md`, `scripts/README.md` and `README.md`:** one row added or reworded each.

**Figures.** Seven prompts spell the label: `git grep -l -w spec-change -- .claude` lists them.

> **Amended 2026-09-24 by D-06.** Item 3 and the first alternative no longer apply: the run-outcome schema, `tools/outcomes/record.selftest.ts` and `tools/outcomes/policy.json` are deleted, so no intervention enum exists to tie to, and `outcomes-record-selftest` is no longer a job. `tools/policy.json` now also carries `assetLabels`, `foundAtLabels` and `rerouteLabels`, which no gate holds yet.

> **Amended 2026-09-26 by D-11.** The amendment above no longer holds for `assetLabels`: `beads:check` holds it. `foundAtLabels` and `rerouteLabels` are still held by no gate.

> **Amended 2026-10-02 by D-27.** The decision's file is gone. The policy is five records under `tools/policy/`, read whole through `tools/lib/policy.ts`, and they hold every constant a prompt or a tool of the workflow reads: the settings of single tools in `tools/policy/tool-settings.json` too, not only the constants that belong to no one tool. Each constant keeps its key and its `Means` sibling, or, in the budgets' table, its reason in its row. `specChangeLabel` is in `tools/policy/vocabulary.json`, and item 2 stands.

> **Amended 2026-10-04 by D-35.** Item 2's `npm run openspec:check` runs as `mise run openspec:check`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them. Item 3's `outcomes:record:selftest` is no task: D-06 retired it.

### D-04 · The repository carries a demo product, a calculator served on loopback only

**Recorded 2026-09-24**, carried by `asdlc-openspec-zgh`. The maintainer accepted it on 2026-09-23, during the `change-design` stage of the change `add-calculator-web-app`.

**Builds on / amends:** amends nothing. Builds on D-01, whose gate ladder (`CLAUDE.md` § The gate ladder) it reads without amending: a test that starts a server from committed files and talks to it over loopback is not "a network" in that section's sense. Builds on D-02, whose lifecycle runs the change that carries this entry.

**Decision.** `apps/calculator/` is a demo product: a calculator page, the local server that hands it to a browser, and the tests that hold both to their specs.

1. **`npm run calculator:serve` is the one thing in this repository that listens on a port.** It listens on `127.0.0.1` alone, never on another interface, and only when a person starts it; it serves until that person stops it. No hook, job or CI step runs the script.
2. **The calculator's tests may bind loopback ports.** They bind free ports on `127.0.0.1`, and the server's default port for a moment while it is free. A test that starts that server from committed files and talks to it over a temporary loopback port reads only committed files in the sense of `CLAUDE.md` § The gate ladder, so `calculator:test` is a pre-push job and a `.github/workflows/verify.yml` step.
3. **The worktree briefing says so.** `.claude/worktree-CONTEXT.md.tmpl` names `calculator:serve` as the one listener. In a worktree, `.worktree/ports.env`'s `APP_PORT` is the port to pass as `PORT` (`PORT=<APP_PORT> npm run calculator:serve`), so two worktrees serving at once do not collide. The server does not read that file: `PORT` is the only way a port reaches it. `SB_PORT` stays reserved and unused, and wanting a port for anything else still means stop.

**Why.** D-02's lifecycle had its skills and its gate and nothing to act on: `openspec/specs/` was empty, and no change had yet run through every stage. `asdlc-openspec-zgh` asked for one small, real change run end to end. A calculator run on one's own machine is small enough to finish in one pass and still has behaviour worth specifying, and it leaves a product that later changes can modify. Three alternatives lost:

- **A static page opened from disk, with no server.** Browsers block ES modules loaded from `file://`, so the page would need a bundler, which the change's spec rules out by requiring no build step, or classic scripts, which export nothing for Node's test runner to import, so the tests could no longer load the files the browser runs.
- **Treating loopback as network.** Under the gate ladder that would keep every server test out of pre-push and CI, the loopback-only and path-containment scenarios among them. Those tests bind nothing but `127.0.0.1` and read nothing but committed files, and they are the scenarios a server meant for one machine most needs held on every push.
- **No register entry.** The briefing called a port-serving application something this repository "deliberately does not contain". Reversing that is a decision, and a quiet edit to the briefing would have left the next reader to re-argue it.

The server reading `.worktree/ports.env` itself also lost: the spec names `PORT` and a default, and nothing else, so a worktree passes `APP_PORT` through `PORT`.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-04.
- **`apps/calculator/`:** added. `public/` holds the page and its logic (`index.html`, `style.css`, `main.js`, `app.js`, `calculator.js`); `server.js` is the request handler and `serve.js` the command; `test/` holds `calculator.test.js`, `page.test.js`, `server.test.js` and `serve.test.js`. `apps/calculator/`, `public/` and `test/` each have a `README.md`.
- **`package.json` and `package-lock.json`:** the scripts `calculator:serve` and `calculator:test`; `jsdom` pinned exactly as a devDependency, with the packages it pulls in.
- **`lefthook.yml`:** the pre-push job `calculator-test`, with its measured cost; `apps/**` added to the globs of `check-jobs` and `check-jobs-selftest`.
- **`.github/workflows/verify.yml`:** a step running `npm run calculator:test`.
- **`scripts/check-jobs.mjs`:** `apps/` is a third root for the paths a script names; a path is read after a quote as well as after whitespace; a glob is held to matching a file, and one written with `**` or `[...]` is refused as a form the gate does not read; and `calculator:serve` is a named exception, since it never returns. Its selftest gains a case for each path and glob rule: a missing `apps/` path, bare and quoted; a glob that matches no file in its directory, and one whose directory was renamed; a `**` glob, refused; and a `?` glob that matches a file, passed. Its control must now read at least one `apps/` path and one glob. No case was added for the `calculator:serve` exception: the control holds it, since the undoctored copy fails without the entry. Its older cases no longer name a fixture file this repository does not have.
- **`README.md`:** rows in § How it is laid out, § Working here, § Where to read next and § What runs automatically, where the `check:jobs` row also names `apps/`; and the `calculator` sub-section of § The npm scripts.
- **`openspec/changes/add-calculator-web-app/`:** added: the proposal, the design, and the delta specs of `calculator` and `calculator-local-server`.
- **`.claude/worktree-CONTEXT.md.tmpl`:** the port paragraphs, which said nothing here serves a port, name `calculator:serve` as the one thing that does and `APP_PORT` as its port in a worktree, and cite this entry.
- **`scripts/new-worktree.sh` and `scripts/render-worktree-context.mjs`:** the printed ports line and the allocator's comment no longer call both ports unused.
- **To come, in `change-finalize`:** the archive, run on this branch before the merge (D-02, item 5), writes the living specs `openspec/specs/calculator/spec.md` and `openspec/specs/calculator-local-server/spec.md` and moves the change under `openspec/changes/archive/`.

**Figures.** None.

> **Amended 2026-09-29 by D-13.** Item 2 no longer holds for every check that runs the server's tests. This records the maintainer's choice of 2026-09-28, made as the answer to question 3 of the spike `asdlc-openspec-j09.2` and written in that issue's notes under "The maintainer's answer, 2026-09-28"; it is not a new decision. The mutation run of a Command, `npm run thresholds:commands:check`, reads only committed files and talks to its servers over loopback, and it is a `.github/workflows/verify.yml` step and a `change-verify` run, not a pre-push job, for its cost: 181.05 s and 185.99 s wall for all 72 of `serve.js`'s mutants one at a time, and 19.02-19.04 s for a change to one of its lines, on the host the header of `scripts/check-thresholds.mjs` names, which holds the measurements. Where it loses: a push that leaves a mutant of a changed `serve.js` line undetected passes pre-push and is refused minutes later in CI. The mutation run of the Routines and the coverage run, `npm run thresholds:check`, stay a pre-push job and a CI step, as item 2 has `calculator:test`. Landed by `asdlc-openspec-j09.10`, which carries D-13 items 8 and 9.

> **Amended 2026-10-04 by D-35.** Items 1 and 3 stand as written: `calculator:serve` stays a `package.json` script, run by `npm run calculator:serve` after `npm ci` alone, the command the living spec names. The CI step What changed names and the two gates of the amendment of 2026-09-29 run as `mise run calculator:test`, `mise run thresholds:commands:check` and `mise run thresholds:check`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-05 · A prompt review runs in the background, and lives in its own pull request rather than in a file

**Recorded 2026-09-24**, carried by `asdlc-openspec-64b`. The maintainer chose each part below on 2026-09-24, when the issue was worked.

**Builds on / amends:** amends D-01, whose conventions included `CLAUDE.md` § Prompt reviews as the starter kit laid it down. Builds on D-02, whose `change-*` skills are among the prompts this entry strips of a trailer.

**Decision.** How a run of a prompt is reviewed, and what the review leaves behind.

1. **The reviewer runs in the background, and nobody waits for it.** The session that ran the prompt writes its analysis of the run under `.scratch/` in its own worktree, since the harness refuses a background session's edit in the shared checkout. It then leaves the worktree, keeping it, and from the primary checkout launches `continuous-prompt-improvement` with `claude --bg --agent`, naming the analysis by its path. Agent view lists that session, and its supervisor keeps it running after the launcher ends. The launcher neither waits for the review nor relays it. `CLAUDE.md` § Prompt reviews holds the command, and every caller points there.
2. **A review that proposes a change is a pull request.** The reviewer makes the change in its own worktree and opens a pull request against `main`. The review is that pull request's description, and a person decides whether it merges.
3. **A review that proposes nothing leaves nothing.** It edits no file, makes no worktree and opens no pull request, and no run is counted anywhere.
4. **No review is a file in this repository, and no prompt carries a `Reviewed:` trailer.** The earlier reviews of a prompt are the descriptions of the pull requests that changed it, and the agent's file says how to find them.
5. **`docs/prompt-reviews/` is deleted outright**, with its README and every review in it. `git show` recovers them (below).

**Why.** The maintainer asked for three things on 2026-09-23, after the review of the `change-propose` run on `add-calculator-web-app`: to "launch it as a background fire and forget managed by the agent view supervisor"; "if no changes are suggested, don't make edits just to track number of runs"; and to "stop adding extra markdown files with the content of the [review], that can live in the PR description". Under the kit's rule, every review edited two files even when the prompt did not change: it appended a dated section to the review file, and it extended the trailer's list of runs. The launching session also waited for the reviewer and relayed its report. Four alternatives lost:

- **An in-process subagent, started in the background by the Agent tool.** Agent view shows no row for it, and it ends with the session that started it, so the supervisor does not manage it.
- **Moving the review files to `docs/retired/`.** They would have stayed findable in the tree. Nothing live reads them once the trailers go, and `git show` recovers them, so the maintainer chose to delete them.
- **A trailer citing the pull request of the latest review.** It would change with every applied review. `git log` on the prompt finds the same pull requests, so the maintainer chose to drop trailers.
- **Deleting the directory while review pull requests were still open.** Each would have re-created it on merge. This change waited for them to land, and deletes the reviews they added.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-05; D-01 carries the amendment above.
- **`CLAUDE.md`:** § Prompt reviews is rewritten: the analysis written in the launcher's worktree, the launch from the primary checkout, and what a review leaves behind. The first draft had the launcher write the analysis in the primary checkout; the harness refused that edit from this change's own background session, so the file stays in the worktree it came from.
- **`.claude/agents/continuous-prompt-improvement.md`:** rewritten. It says what the reviewer reads first and when it stops, how it finds earlier reviews, and the pull request it opens. The shape of a review moves here from `docs/prompt-reviews/README.md`.
- **`.claude/skills/bead/SKILL.md`:** § 8 launches the review as `CLAUDE.md` § Prompt reviews says, before the report, and the report names the reviewer's session. Its `Reviewed:` trailer is dropped.
- **`.claude/skills/change-{propose,design,plan,build,verify,finalize}/SKILL.md`:** each `Reviewed:` trailer is dropped.
- **`docs/prompt-reviews/`:** deleted: `README.md`, and the reviews of `bead` and of every `change-*` skill.
- **`tools/citations/memory.ts`, `check.ts` and `selftest.ts`:** the memory rule's history exemption for `docs/prompt-reviews/` goes with the directory. So do `MEMORY_HISTORY`, which held nothing else, and the selftest's case for it. The gate's summary names what the memory pass skips as binary, the one reason left for skipping a file in its roster.
- **`scripts/check-prompts.mjs`:** its header no longer names a `Reviewed:` trailer among what it does not check, and says why none is refused.
- **`README.md` and `docs/README.md`:** the sentence and the rows that named `docs/prompt-reviews/`.
- **Left as it is:** `KIT-CHECKLIST.md`, the bootstrap's record of what it laid down on the day, still names `docs/prompt-reviews/` and the trailer rule.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n prompt-reviews` finds this entry, the header of `tools/citations/memory.ts` saying the exemption is gone, and `KIT-CHECKLIST.md`.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- docs/prompt-reviews/README.md` names the deleting commit, and `git show <that commit>^:docs/prompt-reviews/<file>` recovers any of them.
- **Their return is not refused by a gate.** Review holds it, as it holds a trailer's return.

**Figures.** Seven review files and the directory's README deleted: `git log -1 --diff-filter=D --name-only --format= -- docs/prompt-reviews/` lists them. Seven `Reviewed:` trailers dropped: `git grep -n "^Reviewed:" <the deleting commit>^ -- .claude` lists them.

> **Amended 2026-09-26 by D-08.** Items 1 and 3 no longer hold as written. A run no longer launches a reviewer on itself: it writes its analysis as a note in the tracker, and one review over every pending analysis starts when a threshold holds, launched by the run whose closing step finds it due, from the primary checkout, as `review-prompts`. A review that proposes nothing still edits no file and opens no pull request, but it appends a read line to each analysis it read, so a run is now counted in the tracker. Items 2, 4 and 5 stand.

### D-06 · The learning loop is retired; a run's labels in the tracker show what recurs

**Recorded 2026-09-24**, carried by `asdlc-openspec-6dn`. The maintainer chose each part below on 2026-09-24, first from the recommendation that answered whether `asdlc-openspec-ri0` had happened for `add-calculator-web-app`, then from a second opinion on that recommendation.

**Builds on / amends:** amends D-01, whose conventions included the starter kit's learning loop (its sections 2.3 and 2.4) and `CLAUDE.md` § A program proposes; only a person promotes as the kit laid it down. Amends D-03, whose item 3 and first alternative rest on files this entry deletes. Builds on D-02, whose epics carry the send-back labels below, and on D-05, whose reviewer is one of the two readers of the counts.

**Decision.** The kit's learning loop, one record per run and reports derived from the records, is retired. What recurs across runs is read from labels a run leaves in the tracker.

1. **The loop is deleted outright** (`docs/retired/README.md` § The three dispositions, *Delete it outright*): `tools/outcomes/` and `artifacts/outcomes/`; the scripts `outcomes`, `outcomes:check`, `outcomes:selftest`, `outcomes:record:selftest` and `outcomes:propose`; their three pre-push jobs and three CI steps; and their rows in the hooks' tables of emitter-owned paths. `tools/lib/bd-launcher.ts` stays: `scripts/check-beads.mjs` imports it.
2. **An issue a run finds carries where it was found and what it would fix.** An issue filed `discovered-from` the issue or epic a run was working carries, beside its `repo:` label, the `foundAtLabels` label for the stage that found it and one `assetLabels` label for each kind of file it would change. The pair is counted by `bd count -l <found-at label> --by-label`. `CLAUDE.md` § The task store holds the rule.
3. **A change's epic carries each stage it was sent back to.** When a later stage revises the proposal or a delta spec, the design, or the epic's tasks, or `change-verify` sends work back to `change-build`, the epic gets that stage's `rerouteLabels` label. That rework lands as commits inside the change and never becomes an issue, so rule 2 cannot see it. `CLAUDE.md` § Product work runs as OpenSpec-format changes holds the rule, and each skill that sends a change back points at it.
4. **The three vocabularies live in `tools/policy.json`**, each with its `Means` sibling (D-03). Prompts cite the keys and spell none of the values. No gate holds them yet; `asdlc-openspec-dzi` asks `beads:check` to refuse a found issue without them.
5. **The counts have two readers.** `change-finalize`'s report prints them (`.claude/skills/change-finalize/SKILL.md` § 9. Report), for the person who decides what is promoted; and the analysis a prompt review is handed ends with them (`CLAUDE.md` § Prompt reviews), so the reviewer can tell a finding that recurs from one seen once. Both report counts, never a rate.
6. **The first change is labelled after the fact, from evidence only.** Each of the 25 issues discovered from `asdlc-openspec-zgh` carries its asset labels. Fourteen carry a found-at label because their own text says which stage found them: nine the build, one the proposal, and four a review after the change ended. `asdlc-openspec-kce` is among the four: its text says it was observed while proposing and came to light in the prompt review of that run. The other eleven carry none: six can be placed only by inference from what they cite, four never say, and one names two stages. The epic carries all four send-back labels:
   - its spec was revised at design and during the build (`9e8f56e`, `d00e197`);
   - its design was revised during the build and at verify (`d00e197`, `fe1360a`);
   - two tasks were added after planning (`asdlc-openspec-zgh.8`, `asdlc-openspec-zgh.9`);
   - the re-run of `change-verify` sent `asdlc-openspec-zgh.9` back to the build.
7. **`asdlc-openspec-ri0` is closed, not done.** It asked `change-finalize` to write a record on every terminal path, complete, failed and blocked. `change-finalize` lands only a verified change, so no failed or blocked change reaches it, and the criterion could not have been met from there.

**Why.** The maintainer asked on 2026-09-24 whether `asdlc-openspec-ri0` had happened for `add-calculator-web-app`. It had not: `change-finalize` wrote no record, nothing called `tools/outcomes/write-record.ts`, and `artifacts/outcomes/records/` held no file, so every report had been derived from nothing. The loop's two jobs were covered elsewhere: prompts by the review of each run (D-05), and product behaviour by `change-verify` and the living spec (D-02). Defects a run found outside its own files were already issues in the tracker, filed by hand. The one thing only the loop offered was a view across runs, which, with one change archived and a floor of five records before a rate, it could not yet give. A second opinion then showed that labels on found issues alone would miss the calculator change's largest corrections. Its spec went from 30 scenarios to 47 during the build, and its design was amended twice at verify. Both landed as commits and neither became an issue. Five alternatives lost:

- **Wiring `ri0` as filed.** The criterion could not be met from `change-finalize` (item 7), `bead` and `fan-out-work` wrote no record either, and the schema's stage and asset lists were still the kit's placeholders.
- **Moving the loop to `docs/retired/`.** `retire-asset` moves a retired asset there, but nothing live reads TypeScript tools once their jobs go, and `git show` recovers them, as D-05 chose for the review files.
- **Asset labels alone,** the first recommendation. They count what a run files and miss the rework inside a change, which is what the send-back labels count.
- **The prompt reviewer as the only reader.** It proposes changes to prompts; a count of gate, environment or product fixes needs a person to read it.
- **A tool that tabulates the pairs.** `bd count -l <label> --by-label` gives them, and a tool would be the loop again in miniature.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-06; D-01 and D-03 carry the amendments above.
- **`tools/outcomes/` and `artifacts/outcomes/`:** deleted.
- **`package.json`:** the five `outcomes` scripts are removed.
- **`lefthook.yml`:** the jobs `outcomes-record-selftest`, `outcomes-check` and `outcomes-selftest` are removed.
- **`.github/workflows/verify.yml`:** the three `outcomes` steps are removed. Its list of retired steps says why a restored one would be wrong, and its list of deliberately absent steps no longer names the filing step.
- **`scripts/assert-not-hand-edited.mjs`, `scripts/hooks/_shared.mjs` and `scripts/hooks/check-emitted-drift.mjs`:** each table's one row, the loop's, is removed, and the table says so.
- **`scripts/check-jobs.mjs`:** `outcomes` and `outcomes:propose` leave the list of scripts with no job.
- **`tools/lib/bd-launcher.ts`:** its header marks the filing step as a retired caller.
- **`tools/policy.json`:** `assetLabels`, `foundAtLabels` and `rerouteLabels`, each with its `Means` sibling; its `gatedBy` and `whatItDoesNOTDo` no longer name the loop.
- **`CLAUDE.md`:** § The task store gains the found-issue labels; § Product work runs as OpenSpec-format changes gains the send-back label; § Prompt reviews ends the analysis with the counts; § A program proposes; only a person promotes is rewritten without the loop.
- **`.claude/skills/bead/SKILL.md` and `.claude/skills/change-build/SKILL.md`:** the filing command carries the labels. `bead` no longer names `outcomes:check`, and `change-build` labels the epic when it revises the spec, the design or the plan.
- **`.claude/skills/change-design/SKILL.md` and `.claude/skills/change-verify/SKILL.md`:** each labels the epic where it sends a change back.
- **`.claude/skills/change-finalize/SKILL.md`:** § 9. Report prints the counts.
- **`.claude/agents/continuous-prompt-improvement.md`:** says how to weigh the counts at the end of the analysis.
- **`README.md` and `tools/README.md`:** the loop's section, scripts and rows are gone; the guardrail row names the prompt reviewer.
- **Left as it is:** `KIT-CHECKLIST.md`, the bootstrap's record of what it laid down on the day, still names the loop's files, as D-05 left it naming the review files.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n -i -E "outcomes|learning loop|run-outcome"` finds this entry and the amendments above, D-03's own text, `KIT-CHECKLIST.md`, and comments that say the loop is retired: `.github/workflows/verify.yml`, the three hooks' tables, `tools/lib/bd-launcher.ts` and `tools/policy.json`, plus the pointer in `README.md` § The work, and what its runs leave behind. It also finds "outcomes" as a plain word in the header of `scripts/check-beads.mjs`, which is about something else.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- tools/outcomes/index.ts` names the deleting commit, and `git show <that commit>^:<path>` recovers any of its files. The kit's own `tools/bootstrap.mjs`, which wrote `KIT-CHECKLIST.md`, lays down a fresh copy unadapted to this repository; how it selects only sections 2.3 and 2.4 was not checked from here.
- **Their return is not refused by a gate.** Review holds it, and `.github/workflows/verify.yml` says why a restored step would be wrong.

**Figures.**

- 23 files deleted, 17 under `tools/outcomes/` and 6 under `artifacts/outcomes/`: `git log -1 --diff-filter=D --name-only --format= -- tools/outcomes/ artifacts/outcomes/` lists them.
- 2,197 lines in the 12 TypeScript files: `git grep -c "" <that commit>^ -- "tools/outcomes/*.ts"` gives each file's count.
- No record: `git ls-tree -r --name-only <that commit>^ -- artifacts/outcomes/records` prints nothing.
- One archived change: `git ls-tree --name-only <that commit>^ openspec/changes/archive/`.
- The calculator spec's scenarios, 30 before the build's revision and 47 after: `git grep -c "#### Scenario:" d00e197^ -- openspec/changes/add-calculator-web-app/specs/calculator/spec.md`, and the same at `d00e197`.
- The 25 issues discovered from the first change, and the labels each was given on 2026-09-24: `bd show asdlc-openspec-zgh` lists them under DISCOVERED, with the epic's own labels, and `bd show <id>` gives each one's. `bd count -l <found-at label> --by-label` counts them with every issue filed since, so it grows after this date.

> **Amended 2026-09-26 by D-11.** Item 4 no longer holds for `assetLabels`: `beads:check` refuses an open issue filed `discovered-from` that carries none of its labels, and `beads:selftest` holds that refusal in CI. `foundAtLabels` and `rerouteLabels` are still held by no gate.

> **Amended 2026-09-29 by D-17.** Item 5's second reader is unchanged, but the rule that an analysis ends with the counts is no longer in `CLAUDE.md` § Prompt reviews: `.claude/skills/close-prompt-run/SKILL.md` § 1. Write the analysis, or none, holds it.

> **Amended 2026-10-02 by D-25.** Of the three tables of emitter-owned paths that "What changed" and the retirement checklist name, the drift hook's has gone with the hook. `scripts/assert-not-hand-edited.mjs`'s and `scripts/hooks/_shared.mjs`'s remain.

### D-07 · A reviewer merges each pull request that satisfies the issues it carries, one at a time

**Recorded 2026-09-25**, carried by `asdlc-openspec-mi6`. The maintainer asked for it on 2026-09-25. They allowed the rules in the prompts to be updated, and responsibilities moved, to make it work.

**Builds on / amends:** amends no entry's text. Builds on:

- D-02, whose item 6 rebase-merges a change's pull request; the reviewer merges that way too.
- D-03, whose policy file holds the reviewer's constants.
- D-05, which it leaves as it stands: a prompt review's pull request cites no issue, so a person still decides whether it merges.

**Decision.** `.github/workflows/pr-review.yml` reviews each open pull request against `main`, one at a time, and merges each one that passes.

1. **One at a time.** Every run that reviews or merges shares one concurrency group, whose pending runs queue (`queue: max`) rather than cancel.
   - A run takes one action: a merge before a review, the oldest pull request first. It dispatches itself again while more are waiting.
   - No merge happens while `main`'s own `verify` run is anything but green.
   - A head is reviewed only once `verify` has passed on it.
2. **A pull request cites the issues it carries in its title**, as the ids in the parentheses that end it. A title that cites none is reviewed, and a person merges it. A prompt review's pull request is one of these.
3. **Claude Code judges, and decides nothing.** It runs as `.claude/agents/pr-reviewer.md`, with read-only tools and a read-only token, from a brief `scripts/pr-review.mjs` writes. It judges three dimensions:
   - **Correctness:** it reports every acceptance criterion of every cited issue as met, not met or unverifiable, with evidence.
   - **Maintainability:** it holds each changed file to the product rubric or the context-engineering rubric, as `prReviewContextPaths` assigns it.
   - **Blast radius and risk:** it judges who a mistake would reach and how far.
4. **`scripts/pr-review.mjs` decides**, by the `prReview*` keys of `tools/policy.json`:
   - a criterion the reviewer did not report counts as unverified;
   - a blocker or major finding fails maintainability;
   - risk is never below a floor computed from the changed paths and JSON keys. The floor covers CI, the reviewer itself, the rules and this register.
5. **What each outcome does.** Each is the `pr-review` status on the head and a comment on the pull request.
   - A failed dimension requests changes: a red status, which the author's watcher reads.
   - A criterion nobody can verify, a title with no issue, or high risk asks a person. The person merges it, or applies the approval label, and the reviewer then merges that head.
   - Otherwise the reviewer rebase-merges it and dispatches `verify.yml` on `main`, since a merge made with a workflow token starts no push run.
6. **The reviewer authenticates to Anthropic by workload identity federation, and no API key is stored.**
   - Only the review job requests `id-token: write`. The action exchanges that job's GitHub OIDC token for a short-lived Anthropic token.
   - The four ids are the repository's Actions secrets. The maintainer chose to keep them out of this public tree, and secrets rather than variables keep them out of its public logs.
   - The federation rule is expected to accept a run on `main` alone. A run started by `pull_request_target` carries another subject, so it only merges, and hands a review to a dispatched run on `main`.
7. **A product change's pull request merges through the reviewer too.** `change-finalize` ends its title with the epic's id and waits for the merge instead of asking the user for one.
8. **An agent never applies the approval label** (`CLAUDE.md` § Git workflow). R-01 records why that rule is all that holds it today.

**Why.** The maintainer asked that a pull request which satisfies every dimension "should automatically be merged", and that the workflow "run single threaded for now, only processing one PR at a time so merge conflict thrashing doesn't occur". Seven alternatives lost:

- **GitHub's own approval as the person's gate.** One account opened and merged every pull request so far, and GitHub does not let an author approve their own.
- **An environment with required reviewers.** A run waiting for that approval holds the concurrency group, so one high-risk pull request would stop the queue.
- **Letting Claude Code merge through its own tools.** The judge would hold what it judges with, and a pull request that persuaded it would merge itself.
- **GitHub's default concurrency queue.** It keeps one pending run and cancels the one before it, so a pull request's wake-up could be lost.
- **Reviewing before `verify` passes.** That spends a review on a head CI then refuses.
- **The review as a pre-push job or a `verify.yml` step.** It reads a token and a language model (`CLAUDE.md` § The gate ladder). Only its wiring and its decisions are gates.
- **A stored API key.** It never expires, anything that reads the repository's secrets could spend it, and Anthropic's credential precedence lets it silently win over federation. So `pr-review:check` refuses one. The federation ids themselves are not credentials: a token is minted only for a GitHub OIDC token the rule's match conditions accept.

**What changed.**

- **This register:** this entry and R-01; the status line, the blockquote's bound, the decisions table and the risks table.
- **Added:** `.github/workflows/pr-review.yml`, with `.github/workflows/README.md`; `.claude/agents/pr-reviewer.md`; `scripts/pr-review.mjs`.
- **`tools/policy.json`:** the `prReview*` keys, each with its `Means` sibling; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name them.
- **`package.json`:** `pr-review:check` and `pr-review:selftest`, each a pre-push job in `lefthook.yml` and a step in `.github/workflows/verify.yml`.
- **`.github/workflows/verify.yml`:** a `workflow_dispatch` trigger, for the reviewer's merges.
- **The repository's Actions secrets, outside this tree:** `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID`. No gate can read them; a wrong one shows as a failed exchange on the Console's authentication history.
- **`CLAUDE.md`:** § Git workflow says how a pull request reaches the trunk and who applies the approval label.
- **`.claude/skills/bead/SKILL.md`:** § 6 ends the title with the carried ids and reads the `pr-review` check.
- **`.claude/skills/change-finalize/SKILL.md`:** § 5 ends the title with the epic's id; § 7 waits for the reviewer's merge.
- **`.claude/agents/continuous-prompt-improvement.md`:** § 3 says its pull request stays a person's to merge.
- **`README.md`:** each section that says who merges, or lists what runs and where; and `scripts/README.md`, one row.

**Figures.** 45 pull requests, every one opened and merged by one account, as of 2026-09-25: `gh pr list --state all --limit 200 --json author,mergedBy`.

> **Amended 2026-09-26 by D-09.** Item 8's rule is no longer all that holds the approval label: `scripts/hooks/guard-git.mjs` refuses a session's `gh` command that applies it, from any checkout. The rule stands, and still alone holds every other way of applying the label.

> **Amended 2026-10-02 by D-27.** Item 4's keys are in `tools/policy/pr-review.json`. The floor holds that record, `tools/policy/prompt-budgets.json` and the loader `scripts/pr-review.mjs` reads them through, `tools/lib/policy.ts`, whole, by path, through `prReviewHighRiskPaths`, where `prReviewHighRiskJsonKeys` held the `prReview*` keys of `tools/policy.json` one by one; `pr-review:check` refuses a floor that stops covering any of the three.

### D-08 · A run leaves its analysis in the tracker, and one review reads every pending analysis as a batch

**Recorded 2026-09-26**, carried by `asdlc-openspec-lzr`. The maintainer chose the note, the two thresholds, the one review over every analysis and the workflow script, items 1 to 4, on 2026-09-25, when the issue was filed. On 2026-09-26, when it was worked, they chose what checks the thresholds, the script's name, and items 5 to 8, each from a recommendation put with the case where it loses.

**Builds on / amends:** amends D-05, whose items 1 and 3 launched one reviewer per run and left nothing behind a review that proposed nothing. Builds on D-06, whose counts across runs each analysis still ends with, and on D-07, which leaves a review's pull request, citing no issue, to a person.

**Decision.** How a run of a prompt is recorded, and when and how the runs are reviewed. `CLAUDE.md` § Prompt reviews holds the rule and the launch command, and every caller points there.

1. **A run's analysis is a note in the tracker**, on the issue or epic the run worked. Its first line is `promptReviewAnalysisMarker` and a run id, the issue's id, `@` and the UTC second the note was written; the next name every prompt the run loaded and the commit it read them at. A prompt another prompt called, the reviewer's own run, and a run that worked no issue write none.
2. **A review starts when either threshold holds**: `promptReviewDueCount` analyses pending, or the oldest older than `promptReviewDueAgeDays` days. The closing step of every run checks both, and the reviewer checks them again when it starts. No scheduler does.
3. **One review reads every pending analysis, with one agent per prompt file.** The reviewer groups the evidence by the file each finding concerns, putting the files one finding spans in one group, and opens one pull request over every file the agents change.
4. **The agents run through a workflow script**, `.claude/workflows/review-prompts.js`, each in a worktree of its own. The script judges each agent's report in code: a branch the WorktreeCreate hook did not provision, a file the agent was not given, a failed or missing gate, or a run its evidence does not come from keeps the branch out of the merge. The session running the agent does everything with a side effect: it reads the notes and applies the thresholds, merges the branches the script returns, gates the result, opens the pull request with `open-pr`, and marks the analyses read.
5. **No second review starts while one is under way**: while a pull request from a branch `agent/review-prompts-*` is open, or `claude agents --json` lists a session named `review-prompts` whose `state` is `working`. The pending analyses wait for it. Without `--all` that command lists no finished background session: on 2026-09-26 the stopped probe session `c9d01a77` was listed only with `--all`, as `done`, and while it ran it was listed as `working`.
6. **What a review read is marked by an appended line**, `promptReviewReadMarker`, the run id, and the review's pull request or `no change`. An analysis is pending while no such line names it. One whose file's agent returned nothing, or whose report the script refused, gets no line and waits for the next review.
7. **The reviewer's session is named `review-prompts`**, one name for every review, since one runs at a time. `asdlc-openspec-7nk`, which asked for a name per run, `review-<prompt>-<context>`, closed as obsolete.
8. **The skeptics wait for `asdlc-openspec-pnm`.** This review has no skeptic step and no recurrence threshold, and proposes any edit its agents judge worth making, as D-05's reviewer did. pnm adds both once its own open decisions are settled.

**Why.** The maintainer asked on 2026-09-25 for the reviews one `bead` run triggers, of `bead` and of `open-pr` inside it, to be rolled up. Under D-05 every run launched a reviewer, so two reviews of one prompt could run at once, and did: #48 and #51, both of `.claude/skills/bead/SKILL.md`, collided and were superseded by #53, which carries a commit from each. And a review that proposed nothing left nothing, while the analysis it read sat in a worktree removed once its branch landed, so a recurrence count (`asdlc-openspec-pnm`) had nothing across runs to count. GEPA's reflection over minibatches of traces, crediting each piece of feedback to the module it concerns, is the model the batch follows (https://arxiv.org/abs/2507.19457, as read by a research session on 2026-09-25). Nine alternatives lost:

- **A comment on the run's pull request.** `change-propose` to `change-verify` run before any pull request exists.
- **An event issue of its own for each run.** An issue per run, where the issue the run worked is already there to carry the note.
- **A comment on the issue, which has an id of its own.** `bd list` filters on notes, not comments, so finding the pending analyses would mean reading every issue.
- **A review per prompt.** It would split a contradiction between two prompts, `bead` and `open-pr` say, across two reviews that each see half of it.
- **Agents the reviewer starts in worktrees, as `fan-out-work` does.** They need only prose, but what they count and which branch merges would be the model's judgement, and no selftest would hold it. The script's rules are held by `workflows:selftest`, as `build-change-task.js`'s are.
- **A scheduler**, a task on the machine or a GitHub Actions schedule. It would review an old analysis on time in a week when no prompt runs, which the closing step cannot. The machine's task is set up outside the repository, where no gate sees it, and an Actions job would both run the model and write, which D-07 keeps apart.
- **A second review over the files an open review leaves alone.** It keeps the other files moving, where a review pull request nobody merges now holds up every later review.
- **Metadata on the issue to mark what was read.** A structured field `bd list --metadata-field` filters exactly, where a hand edit that breaks a read line miscounts; but it is a second write for every run to keep in step with the note.
- **A session name for each review, carrying its date.** Past reviews could be told apart at a glance in agent view, where each now reads `review-prompts`.

Two checks this decision rested on were run first, on 2026-09-26. A workflow agent with `isolation: 'worktree'` landed on `agent/wf_55659cd9-cb4-1` at `origin/main`, with `.worktree/CONTEXT.md`, so the WorktreeCreate hook provisions it. A `claude --bg` session called the Workflow tool when its launch prompt named a script, and that run's agent landed on `agent/wf_b5b546d9-f08-1` the same way. Neither worktree was removed when its agent ended, though neither changed a file; `npm run worktree:gc` removes such a worktree once its branch is in `origin/main`, and the reviewer runs it last.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-08; D-05 carries the amendment above.
- **`CLAUDE.md`:** § Prompt reviews is rewritten: the analysis as a note with its marker line, the closing step's check of the thresholds, when no review starts, the launch as `review-prompts`, and what a review leaves.
- **`.claude/agents/continuous-prompt-improvement.md`:** rewritten as the reviewer of a batch. § How a file is judged keeps, for each of the workflow's agents, what its § 1 and § 2 said about reading a prompt, its earlier reviews and a run's own branch.
- **Added:** `.claude/workflows/review-prompts.js`.
- **`scripts/workflows.selftest.mjs`:** runs a suite for each workflow, adds one for `review-prompts.js` with its own control, and refuses a workflow file it has no suite for.
- **`tools/policy.json`:** `promptReviewAnalysisMarker`, `promptReviewReadMarker`, `promptReviewDueCount` and `promptReviewDueAgeDays`, each with its `Means` sibling; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name them.
- **`.claude/skills/bead/SKILL.md`:** § 8 writes the run's analysis and checks whether a review is due, and the report names the analysis's issue and run id.
- **`.claude/README.md`, `scripts/README.md`, `lefthook.yml` and `README.md`:** the workflows row, the selftest's row, the `workflows-selftest` job's comment and measured cost, and the rows that said a run launches its own review.

**Figures.** Eleven review pull requests opened between 2026-09-24T23:47Z (#28) and 2026-09-25T23:10Z (#53), the titles in that range that cite no issue: `gh pr list --state all --limit 100 --json number,title,createdAt`. `promptReviewDueCount` and `promptReviewDueAgeDays` are choices made from that pace, not measurements.

> **Amended 2026-09-26 by D-10.** Item 8 no longer holds. The review proposes an edit only for a finding that `promptReviewRecurrenceCount` runs have shown or whose severity is in `promptReviewMajorSeverities`, and merges a branch only once a majority of its `promptReviewSkeptics` upheld every edit on it. Beside item 6's read line, the review appends a held line for each finding it read and did not carry into its pull request, which the next review counts, and an analysis now ends at the next line that opens with any of the three markers.

> **Amended 2026-09-29 by D-17.** `.claude/skills/close-prompt-run/SKILL.md`, not `CLAUDE.md` § Prompt reviews, now holds the analysis note, the due check, when no review starts and the launch; that section keeps the rule that a run ends with the skill. Item 7 no longer holds, nor does its alternative's loss: each review is named `review-prompts-` and the UTC date and time, and item 5's check counts every working session whose name starts with `review-prompts`, leaving out the reviewer's own.

### D-09 · An in-session guard refuses a gh command that applies the approval label, from any checkout

**Recorded 2026-09-26**, carried by `asdlc-openspec-g1b`. The maintainer chose it on 2026-09-26 from the issue's two options, put to them as the recommendation with the case where it loses.

**Builds on / amends:** amends R-01, whose risk said no guard refuses the label and whose record of what changed said nothing had; and D-07, whose item 8 said that rule was all that held it. Builds on D-03, whose policy file spells the label.

**Decision.** `scripts/hooks/guard-git.mjs` refuses, in every session and from any checkout, the primary one included, a `gh` command that applies `prReviewLabels.approved`.

1. **What it refuses:** `gh pr edit` or `gh issue edit` with `--add-label`, and `gh pr create` with `--label`, naming the label in any letter case, alone or in a list; and `gh api` writing an issue's labels, by `POST`, `PUT` or `PATCH` to `repos/<owner>/<repo>/issues/<n>` or its `/labels`, with a `labels` field that names it.
2. **What it cannot read, it refuses:** a `gh api` label write whose body is a file (`--input`, or a `-F labels…=@file` field), and any label at all while `tools/policy.json` cannot be read.
3. **It reads the spelling from `tools/policy.json`**, and only when a command applies a label, so a rename there moves the guard with it.
4. **The agents keep the maintainer's credentials**, and the reviewer's check of who applied the label is unchanged.

**Why.** R-01 left the label held by one sentence of `CLAUDE.md`. Two alternatives lost:

- **Agents under an identity of their own**, a bot account or a GitHub App, whose label the reviewer refuses. It holds wherever the label is applied, and the guard does not. Where the guard loses: an agent that applies the label through curl or a browser tool passes it, and the reviewer merges a high-risk pull request no person looked at; under a bot identity, the reviewer would refuse the bot's label. The repository has no such identity yet (R-01).
- **The label rule in a linked worktree only**, as the guard's merge rule is. The hook runs only on a session's Bash calls, so it never stands between a person and the label, and a session in the primary checkout is as much an agent as one in a worktree.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-09; D-07 and R-01 carry an amendment each, and the risks table a new cell for R-01.
- **`scripts/hooks/guard-git.mjs`:** the label rule and its header paragraph, and `GUARD_GIT_ROOT`, which points it at a doctored policy. Its `gh` parser now reads past flags, which also stops `gh --repo <repo> pr create` with no `--base` from passing the base rule, and reads `gh pr new` as the `create` it aliases; and a brace inside a word no longer splits a statement, which hid the endpoint of `gh api repos/{owner}/{repo}/…`.
- **`scripts/hooks/worktree-hooks.selftest.mjs`:** a section asserting each refusal by its reason, beside controls, from the primary checkout and from a worktree.
- **`lefthook.yml`:** `tools/policy.json` in the `worktree-hooks` job's glob.
- **`.claude/README.md`, `scripts/hooks/README.md` and `README.md`:** the guard's rows, which said it acted only in a linked worktree, and a row for the label in `README.md` § The guardrails.

**Figures.** None.

### D-10 · A prompt review proposes an edit only for a finding that recurs or is severe, and carries it once skeptics uphold it

**Recorded 2026-09-26**, carried by `asdlc-openspec-pnm`. On 2026-09-26 the maintainer chose the threshold, what an edit states, the skeptics, when they run, and a held line in the analysis notes, items 1, 2, 3 and the first sentence of 5, each from a recommendation put with the case where it loses. The session that built it chose the rest: items 4, 6 and 7, the held line's marker, and holding a finding for a reason other than the threshold.

**Builds on / amends:** amends D-08, whose item 8 left the skeptic step and the recurrence threshold to `asdlc-openspec-pnm`. Builds on D-03, whose policy file holds the new keys; on D-07, which leaves a review's pull request to a person; and on the severities `.claude/agents/pr-reviewer.md` § 2. Maintainability defines.

**Decision.** Which findings a prompt review proposes an edit for, and which of its edits reach its pull request. `CLAUDE.md` § Prompt reviews holds the rule and the held line's form; the agent's § 3 and the workflow's header hold the mechanics.

1. **The threshold.** A finding goes to a file's agent only when `promptReviewRecurrenceCount` distinct runs have shown it, or its severity is in `promptReviewMajorSeverities`. The reviewer's session counts and applies it before the workflow runs, since only it reads every analysis. `.claude/workflows/review-prompts.js` refuses a finding below it, and returns with each change the condition its finding met.
2. **Each proposed edit states** how often the situation arises, what it costs when it does, and the net words it adds, each figure citing a run, a label count or a pull request.
3. **Skeptics judge each edit after its file's agent commits it, reading the branch's diff.** `promptReviewSkeptics` gives how many for each severity, the counts `buildReviewSkeptics` gives, and a majority of those sent decides. Each answers two questions: had the prompt said this, would the runs have gone differently; and does the edit break another path through the prompt, or another caller of it. The script tallies the votes, and the review's pull request lists them.
4. **A branch merges only when a majority upheld every edit on it.** The script runs no git, so it cannot take one commit of a branch and leave another. One edit not upheld keeps the whole branch out, and its runs are still read.
5. **A finding read and not carried is held.** A line of `promptReviewHeldMarker`, the run id, the finding's key, its count so far and the reason goes on the issue of each run that showed it, and the next review counts the finding from it. A finding is held when it is below the threshold, when its agent set it aside, when its edit was not upheld, or when its edit was upheld on a branch kept out. One held for any reason but the first goes to an agent again only when a run its held lines do not name shows it.
6. **Two findings are one** when they concern the same prompt file and describe the same failure, the same step done wrong or missing at the same place, however each analysis words it. The session judges it, and a finding that is one with a held line takes that line's key, `<file>#<name>`. The script holds each key to a file of its group and to one finding in the batch.
7. **The policy reaches the workflow as `args.policy`**, the `promptReview*` keys the session prints from the review worktree's `tools/policy.json`. The script reads no file, and refuses a key that is missing or of the wrong shape.

**Why.** Every review pull request since D-05 that was not superseded merged, so the reviewer's own judgement was the only filter between a plausible finding and an edit, and each edit costs its words on every later run of its prompt (`asdlc-openspec-2wv` measures the `bead` skill's growth). Error analysis counts failures by category before fixing any (https://hamel.dev/blog/posts/evals-faq/why-is-error-analysis-so-important-in-llm-evals-and-how-is-it-performed.html), and FMEA weighs severity before occurrence (https://accendoreliability.com/prioritizing-risk-in-an-fmea/). A research session read both on 2026-09-25 and found no primary source for a number of occurrences, so the count is this repository's choice. Six alternatives lost:

- **An edit on the first run that shows a finding, as D-08's review made.** This is where the threshold loses: a one-off minor defect that costs an hour, and recurs a week later, is now paid for twice before it is fixed.
- **Skeptics on each finding before its file's agent edits.** A refuted finding would then cost no agent run and no worktree, which the chosen order spends; but a skeptic judging a finding cannot see whether the edit breaks another caller of the prompt.
- **Fewer skeptics.** The chosen counts send 15 for a batch of 5 major findings, but a single vote would decide an edit that every later run of the prompt reads.
- **Merging the upheld commits of a branch and dropping the rest.** It needs git in the script, or cherry-picks in the session whose conflicts no selftest holds. A branch kept out holds its upheld findings instead, and a run that shows one again brings it back.
- **A Setup agent reading the policy, as `build-change-task.js` does.** It costs one more agent per review, and its read could differ from the values the session applied.
- **A held line only for a finding below the threshold.** A finding set aside or not upheld would start its count again at the next review, so a recurring one would never be counted as recurring.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-10; D-08 carries an amendment.
- **`tools/policy.json`:** `promptReviewHeldMarker`, `promptReviewRecurrenceCount`, `promptReviewMajorSeverities` and `promptReviewSkeptics`, each with its `Means` sibling; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name them, and so does `tools/README.md`'s row.
- **`.claude/workflows/review-prompts.js`:** each group carries its findings in place of free evidence, with `args.policy`; the threshold check, the skeptic step, the `not-upheld` status and `findingsHeld`; each change names its finding and states its frequency, cost and words.
- **`scripts/workflows.selftest.mjs`:** the review suite runs with the policy's values, and its cases hold the threshold, the number of skeptics and their tally, and the findings held.
- **`CLAUDE.md`:** § Prompt reviews states the threshold, the skeptics and the held line, and where an analysis now ends.
- **`.claude/agents/continuous-prompt-improvement.md`:** § 2 collects the held lines; § 3 counts, holds and groups; § 4 passes the policy; § 6 writes the held lines; § 7 lists each finding's condition, figures and votes; § How a file is judged says what the threshold decides and what it leaves to the agent and the skeptics.
- **`lefthook.yml`, `.github/workflows/verify.yml`, `README.md`, `scripts/README.md` and `.claude/README.md`:** the `workflows-selftest` job's comment and cost, the step's name and comment, and the rows that describe the workflow or its selftest.

**Figures.** Eleven review pull requests from #28 to #53, the titles in that range that cite no issue: nine merged, and #48 and #51 were closed when #53 superseded them (`gh pr list --state all --limit 100 --json number,title,state`). A batch of 5 major findings sends 15 skeptics: 5 times `promptReviewSkeptics.major`, 3.

> **Amended 2026-09-26 by D-12.** Items 3 and 4 judged a finding's edits alone. A branch may now also carry a consolidation of a file its edit would take past its word budget. The consolidation goes to `promptReviewSkeptics.blocker` skeptics, who answer two questions of its own, and the branch merges only when it is upheld too.

> **Amended 2026-09-28 by D-16.** Item 3 still gives `promptReviewSkeptics` the counts `buildReviewSkeptics` gives, but those counts now send one skeptic to a major finding, not three, so a batch of 5 major findings sends 5 skeptics, not the 15 the Figures above state. The alternative "Fewer skeptics", which lost here, is what D-16 item 3 chose for a major finding, with the case where it loses that this entry gave: a single vote decides a major edit that every later run of the prompt reads. `blocker` stays at 3, and so does a consolidation's count.

> **Amended 2026-09-29 by D-17.** The held line's form is no longer in `CLAUDE.md` § Prompt reviews: `.claude/agents/continuous-prompt-improvement.md` § 6. Mark what was read spells it, and the rule stands. Item 7's source of the policy no longer holds: the session prints the `promptReview*` keys from `main`'s `tools/policy.json` through one `gh api` call, before it applies any threshold and before any worktree exists, where it printed them from the review worktree's copy. Both read the trunk, so `args.policy` carries the same values; the script still reads no file and refuses a key that is missing or of the wrong shape.

> **Amended 2026-10-03 by D-32.** Item 4 merged a branch once a majority upheld every edit on it. Such a branch is now answered too: each stored decision case of a file it changes, with the old text and the new, and a case that flips from right to wrong, or goes unanswered, keeps it out as an edit not upheld does. Its runs are still read, and its findings held with the case named.

### D-11 · beads:check refuses an open found issue with no asset label, as D-06 item 4 asked

**Recorded 2026-09-26**, carried by `asdlc-openspec-dzi`. D-06 item 4, the maintainer's on 2026-09-24, named this gate as the one to come. This entry records that it now holds, and corrects the two places the register said no gate did.

**Builds on / amends:** amends D-06, whose item 4 said no gate holds the three label vocabularies, and D-03, whose amendment by D-06 said the same. Builds on D-03, whose policy file holds `assetLabels`.

**Decision.** `npm run beads:check` refuses an open issue filed `discovered-from` that carries no label `assetLabels` lists, reading the list from `tools/policy.json` and spelling none of its values.

1. **It stays a pre-push job and not a CI step,** because it reads the tracker (`CLAUDE.md` § The gate ladder).
2. **`npm run beads:selftest` holds the refusal,** over a fixture export and a copy of the policy, through the root override `BEADS_CHECK_ROOT`. It reads only committed files and fixtures, so it is a pre-push job and a `.github/workflows/verify.yml` step.
3. **`foundAtLabels` and `rerouteLabels` stay ungated.** Issues filed before D-06 carry no found-at label, as `foundAtLabelsMeans` allows, so a rule for them needs a cut-off date, which is the maintainer's to choose (`asdlc-openspec-sbp`).

**Why.** Without the rule, an issue filed with no asset label drops out of the pairs `bd count -l <found-at label> --by-label` prints, and nothing says so. The sweep of 2026-09-26 found two such open issues, `asdlc-openspec-egt` and `asdlc-openspec-pkn`, both filed before D-06, and labelled them by hand. One alternative lost:

- **Refusing a missing found-at label in the same rule.** It would refuse every open found issue filed before D-06 until a cut-off is chosen. Where the chosen rule loses: an issue filed while its asset is unclear is refused at the next push of any branch until someone labels it.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-11; D-03 and D-06 carry an amendment each.
- **`scripts/check-beads.mjs`:** rule 4, `BEADS_CHECK_ROOT` and `--selftest`.
- **`package.json`:** the `beads:selftest` script.
- **`lefthook.yml`:** the `beads-selftest` job.
- **`.github/workflows/verify.yml`:** the `beads:selftest` step, and the list of deliberately absent steps names only `beads:check`.
- **`tools/policy.json`, `tools/README.md`, `README.md` and `scripts/README.md`:** `gatedBy` and the rows that said no gate holds the labels.

**Figures.** None: `npm run beads:check` names each open issue it refuses, and names none at the commit that added this entry.

> **Amended 2026-10-04 by D-35.** The Decision's `npm run beads:check` and item 2's `npm run beads:selftest` run as `mise run beads:check` and `mise run beads:selftest`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-12 · A prompt that an edit would take past its word budget is consolidated first, and every rule it removes is accounted for

**Recorded 2026-09-26**, carried by `asdlc-openspec-aa0`. On 2026-09-26 the maintainer chose who consolidates, the first pass and the proof, items 1, 2 and 3, each from a recommendation put with the case where it loses. The session that built it chose the rest: items 4, 5 and 6.

**Builds on / amends:** amends D-10, whose items 3 and 4 judged and merged a finding's edits alone. Builds on D-08, whose review's file agents run the consolidation; on D-03, whose policy file holds each prompt's budget; and on D-07, which leaves a pull request that changes a budget to a person.

**Decision.** How a prompt makes room when an edit would take it past its word budget. `.claude/agents/continuous-prompt-improvement.md` § How a prompt is consolidated holds the procedure, and the header of `.claude/workflows/review-prompts.js` holds how a review judges one.

1. **The file's agent consolidates its file first**, in its own worktree, and the review's one pull request carries the consolidation with the edit. Any other session that edits a prompt past its budget does the same, and a raise, which a person merges, covers only what the consolidation did not free. A file's agent, which may not edit `tools/policy.json`, leaves out an edit that still does not fit and sets its finding aside with the words it needs. Where it loses: a small urgent fix arrives bundled with a large rewrite.
2. **The first pass consolidated `bead`**, set its budget to the result, and the procedure was written from what that pass needed. Where it loses: a procedure shaped by `bead` may not fit `CLAUDE.md`, the file every session loads.
3. **The proof is a table in the pull request's description**, one row for each sentence or clause removed: kept elsewhere, naming where and what loads that file wherever the prompt is loaded; moved to the pull request that tells its incident; or deleted, with why. A sentence whose row cannot name what loads its new home stays.
4. **What may go:** a restatement of `CLAUDE.md`; a step that a file the prompt sends the session to states at that step; incident prose, or an example drawn from one; and explanation past the one clause that states a kept rule's failure. Every heading another file cites stays.
5. **Skeptics judge a consolidation** against its own commit's diff, at the `promptReviewSkeptics.blocker` count whatever its findings' severities, and answer whether every removal has a row and whether each row holds. A change to a consolidated file is judged from the consolidation's commit, and a branch merges only when its consolidation is upheld too.
6. **The budget falls to the prompt's new count** once the edit lands, and its `Means` names the consolidation, so the room it freed is not spent unseen.

**Why.** The budgets of `asdlc-openspec-2wv` stop a prompt growing, but said nothing about how to make room. A rewrite can lose rules without anyone seeing: the ACE paper reports a context rewritten from 18,282 tokens to 122, with accuracy falling from 66.7 to 57.1, below the 63.7 baseline (https://arxiv.org/abs/2510.04618, as read by a research session on 2026-09-25). Three alternatives lost:

- **A consolidation pull request of its own, opened before the edit's.** It keeps an urgent fix small, and the fix waits a merge longer.
- **The table alone, without what loads each new home.** A rule kept in a file the session never reads is lost in practice.
- **A consolidation judged by its edit's skeptics.** Their questions ask whether the runs would have gone differently, which a removal that keeps every rule cannot answer, and a minor finding's single skeptic would decide a rewrite every later run reads.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-12; D-10 carries an amendment.
- **`.claude/skills/bead/SKILL.md`:** consolidated, and its budget lowered.
- **`.claude/agents/continuous-prompt-improvement.md`:** consolidated, then § How a prompt is consolidated, § 5's step that sets a consolidated file's budget, and § 7's table.
- **`.claude/workflows/review-prompts.js`:** its literals consolidated, then each report's `consolidations`, the rules they are held to, their skeptics, and a change's diff read from its consolidation's commit.
- **`scripts/workflows.selftest.mjs`:** cases for a consolidation's skeptic count, one not upheld, and each rule a consolidation is held to.
- **`scripts/check-prompts.mjs`:** the refusal of a prompt over its budget points at the procedure.
- **`tools/policy.json`:** the budgets of the three files, each with the figures in its `Means`; `promptReviewSkepticsMeans` and `provenance`.
- **`README.md`, `scripts/README.md` and `.claude/README.md`:** the rows that say what the workflow and its selftest hold.

**Figures.** Each is `node scripts/check-prompts.mjs --counts`, at `d69527a` for the first figure and at this entry's commit for the second: `.claude/skills/bead/SKILL.md` 1,857 and 1,635; `.claude/agents/continuous-prompt-improvement.md` 2,261 and 2,516; the literals of `.claude/workflows/review-prompts.js` 1,441 and 1,720. What each consolidation freed on its own, 229, 126 and 43, is the same command at its own commit, and the pull request lists those commits; bead's 7 words back came from the review, which found that removing one qualifier had broadened a rule. The ACE figures are the paper's.

> **Amended 2026-09-29 by D-17.** Item 4 holds in a workflow's literals too: a workflow's agents load `CLAUDE.md`, so a restatement of it may go there as anywhere, where the agent's § How a prompt is consolidated had counted only the files a prompt sends its session to.

> **Amended 2026-10-03 by D-32.** Item 5 merged a consolidated file's branch once its consolidation was upheld too. The stored decision cases of that file are now answered as well, its old text the trunk's and its new the branch's, consolidation and edit together, and a case that flips keeps the branch out. A rule a consolidation lost that a stored case holds now shows as a flip.

### D-13 · The agentic test strategy is adopted, and each of its rules lands in a home of its own

**Recorded 2026-09-28**, carried by `asdlc-openspec-j09.1`, a child of the epic `asdlc-openspec-j09`. On 2026-09-28 the maintainer supplied the strategy, chose items 1 to 5 when the epic was filed, and chose items 6 to 15 and the first sentence of item 17 when this entry was worked, each from a recommendation put with the case where it loses. Item 7 is the one they chose over the recommendation. Item 16 and item 17's table map the strategy onto the children the epic filed.

**Builds on / amends:** amends D-02, whose item 2 lists what a change's folder holds. Builds on D-02's six stages, which it keeps; on D-03, whose policy file holds the prefixes, thresholds and samples below; on D-06, whose send-back label marks a change that goes back to Propose; and on D-12, under which every child of the epic that edits a prompt consolidates it first.

**Decision.** This repository adopts the agentic test strategy the maintainer supplied on 2026-09-28. Its text, with this entry's answers marked where they amend it, is `docs/test-strategy.md`, a dated record over which the register, the gates and the skills win. A rule of the strategy binds from the pull request that lands its home, which item 17 names; until then, the change process runs as it stood.

What the epic decided:

1. **A scenario's ID is a token in its header**, `#### Scenario: [<PREFIX>-NNN] <title>`, unique within its capability's prefix and never reused. Each capability's prefix is a key of `tools/policy.json`. Where it loses: two changes in flight take the same next ID, and the second to merge re-keys its scenario and its tests.
2. **An NFR is a spec requirement**, with its ID in its header, `### Requirement: [NFR-<PREFIX>-NNN] <title>`, which `openspec archive` merges like any requirement. The strategy defines an NFR in `design.md`; here a design refers to one by its ID and never defines one.
3. **A change to a scenario or to an NFR goes back to Propose**, and the epic gets the `rerouteLabels` label for propose. A re-design pass changes neither.
4. **Explore is optional, and it is the existing `explore` skill.** There is no seventh stage. Where an explore brief preceded a change, `change-propose` commits it in the change's folder as `findings.md`, which OpenSpec 1.6.0 validates and archives with the change.
5. **The calculator's existing gaps go into a ratchet.** Its unmet obligations sit in a committed baseline that may fall and never rise, and every new or modified scenario meets every obligation.

What was settled when this entry was worked:

6. **Traceability rule 3 binds `asset:product` tasks.** A change's plan lists every other task as exempt beside its draft. Where it loses: an `asset:tool` task that rewires an app's npm script changes behaviour, cites no scenario, and passes the draft.
7. **A scenario no harness here can observe is proved by an automated test in a real browser**, never by hand. The recommendation was a manual proof recorded with its reason, which loses where a later handler breaks the behaviour and nobody checks again by hand; the browser costs a download at install and a tier to decide. That work is `asdlc-openspec-9j8`, a follow-up rather than a child of the epic. Until it lands, the scenario "Space presses the focused button" has no proof, and its gap sits in item 5's baseline.
8. **The coverage threshold measures changed lines**: the coverable lines and branches a branch adds or changes under `apps/`, against `origin/main`. The whole product's figure is reported and not gated. Where it loses: an untested file stays untested until some change edits it.
9. **A rate below its minimum sample is not a rate.** The mutation score and the coverage each get a minimum sample in `tools/policy.json`, landed by `asdlc-openspec-j09.10` with its value from the spike `asdlc-openspec-j09.2`. Below it, the gate prints the counts and no rate, and fails on any surviving mutant or uncovered changed line not listed with a reason. Where it loses: a change with six mutants, one of them equivalent, fails until someone records why.
10. **A scenario's happy-path test may declare its negative test not applicable**, with the reason. The trace gate accepts the declaration, and the verification report lists every one as an advisory item. Where it loses: a builder declares a hard negative not applicable to save the work, and only a reviewer who reads the reason catches it.
11. **A reworded scenario header is a removal and an addition.** The old ID retires and is never reused, the new scenario takes the next ID, and its tests are regenerated. A modified scenario is a new body under the same header, which is how OpenSpec 1.6.0 matches a MODIFIED block: it refuses one that renames a scenario or gives one an ID. Where it loses: a typo fixed in a title retires its ID and re-keys its tests.
12. **The agent that ran a failing test runs it once more**: the architect in Build and the verifier in Verify, never the test runner. A test that fails and then passes is flaky, and counts as failing. Where it loses: a flaky E2E test costs a second full run each time it fails.
13. **A contract states only what its scenarios state.** Every operation of a contract artifact cites the scenario IDs it serves, and its wire form, the paths, media types and schemas, is the design's how. Where it loses: a status code no scenario states cannot enter a contract until a scenario for it has gone back through Propose.
14. **An NFR's scenarios owe no happy-path or negative test.** OpenSpec's strict validation refuses a requirement without a scenario, so every NFR carries one; a fitness function, or a test that references the NFR, satisfies traceability rule 2 for it. Where it loses: an NFR proved by one fitness function gets no negative test.
15. **Where the design's artifacts live.** Contract artifacts live in the product tree, under `apps/<app>/contracts/`, since an archived change is history and nothing edits it. Each app's Binding Surface is one hand-maintained file, `apps/<app>/binding-surface.md`, which `change-design` edits on the change's branch, and a change's `design.md` names what it changes there. Where it loses: two changes in flight that both edit one app's Binding Surface conflict when the second rebases.

How the strategy maps onto this repository:

16. **The strategy's roles.** The app-builder and the test-builder are agents of the build workflow, `.claude/workflows/build-change-task.js`. The architect is that workflow's triage together with the session running `change-build`, which acts on the route the workflow returns. The verifier is the session running `change-verify`. Where Verify rejects a change, the user picks the route, as `.claude/skills/change-verify/SKILL.md` § 6. Verdict has it.
17. **Every rule a program can check goes into a gate**, whose header is a home for a rule (`CLAUDE.md` § Rules for agents live in tracked files, and nowhere else) that costs no prompt words and that CI holds. A prompt carries a pointer, and the rules that need judgement. Where it loses: a builder that never read a gate's header learns its rule only when the gate refuses its push, a round-trip that the rule stated in the build prompt would have saved. The home of each of the strategy's rules, and the issue that lands it:

| The strategy's rule | Its home | Landed by |
|---|---|---|
| Scenario and NFR IDs, stable for the life of the system (items 1, 2 and 11) | the header of `scripts/check-openspec.mjs` | `asdlc-openspec-j09.3` |
| Propose writes the IDs and the NFRs, and keeps an explore brief (items 1 to 4) | `.claude/skills/change-propose/SKILL.md` | `asdlc-openspec-j09.4` |
| Traceability rules 7 and 8, a test's layer and its orchestration level, and a declared negative (item 10) | the header of the tool that reads a test's metadata | `asdlc-openspec-j09.5` |
| The Binding Surface, contract artifacts and fitness-function declarations (items 13 and 15) | `.claude/skills/change-design/SKILL.md` | `asdlc-openspec-j09.6` |
| Traceability rules 4 to 8, the happy-path-and-negative obligation, Finalize's rules for tests on removed or modified IDs, and the ratchet (item 5) | the header of the trace gate, `trace:check` | `asdlc-openspec-j09.7` |
| Traceability rules 1 to 3 (item 6), which read task bodies in `bd` and so no CI gate can hold | `.claude/skills/change-plan/SKILL.md`, and again at Verify | `asdlc-openspec-j09.8` |
| No test deleted, skipped, disabled or weakened without a recorded architect decision | the header of the test-inventory gate | `asdlc-openspec-j09.9` |
| The thresholds and their minimum samples (items 8 and 9) | keys of `tools/policy.json`, `count-index.md` § Rates and metrics, and the header of the gate that measures them | `asdlc-openspec-j09.10` |
| The build agents, their shared inputs and independence, test ownership, the architect's triage, the feedback's four fields, the pyramid's agent responsibilities, test data isolation and dependency mocking | `.claude/workflows/build-change-task.js` | `asdlc-openspec-j09.11` |
| Finalize retires or regenerates the tests on a removed or modified ID | `.claude/skills/change-finalize/SKILL.md`, which runs the trace gate | `asdlc-openspec-j09.12` |
| The Build exit criteria and re-design passes (item 3) | `.claude/skills/change-build/SKILL.md` | `asdlc-openspec-j09.13` |
| Verify: a fresh environment, the regression suite, flaky tests (item 12), the verification report and the pyramid's shape | `.claude/skills/change-verify/SKILL.md` | `asdlc-openspec-j09.14` |
| Orchestration levels 2 and 3, a test in a container or under compose | not adopted until a product needs them | `asdlc-openspec-sm3` |
| A scenario no harness here can observe (item 7) | the calculator's tests | `asdlc-openspec-9j8` |

**Why.** The maintainer supplied the strategy on 2026-09-28 and asked for a plan to bring it into the change process. Until then a change's proof was a trace written by hand under `.scratch/` at Verify (`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced), a test traced to its scenario by the scenario's exact name (`apps/calculator/test/README.md`), one agent wrote the code and every test of a task (`.claude/workflows/build-change-task.js`), and nothing measured coverage or a mutation score. Each item above names the case where it loses. Four alternatives lost as well:

- **Explore as a seventh stage with a skill of its own.** It would change D-02's six stages for a step the `explore` skill already does, where keeping its brief as `findings.md` is enough for the later stages to read it.
- **NFRs defined in `design.md`, as the strategy has them.** A design is archived with its change and nothing edits it afterwards, so an NFR's ID would outlive the only file that stated it; `openspec archive` merges a spec requirement into the living spec.
- **Holding the calculator to every obligation at once.** Every change would wait until the existing gaps were closed, where the ratchet lets each change close some of them and refuses new ones.
- **The strategy's text as the home of its rules.** A document under `docs/` is a dated record that points at the home of each rule (`CLAUDE.md` § Rules for agents live in tracked files, and nowhere else), so every rule gets its home in item 17's table, and the text stays as supplied.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-13; D-02 carries an amendment.
- **`docs/test-strategy.md`:** added: the strategy as the maintainer supplied it, with each of this entry's answers marked where it amends the text.
- **`docs/README.md` and `README.md` § Where to read next:** a row each.
- **To come:** each home in item 17's table, in the issue it names.

**Figures.** None.

> **Amended 2026-10-03 by D-30.** Item 4's `explore` skill is now OpenSpec's explore stance, adapted. It writes its brief only on request, to `.scratch/`, and `change-propose` still commits that brief as `findings.md`. Explore stays optional, and is still not a stage.

### D-14 · A build task sees each scenario's proof fail before the code that passes it, or reports it already green, and the build workflow stops a run that does neither

**Recorded 2026-09-28**, carried by `asdlc-openspec-fye`. The maintainer chose item 1 on 2026-09-26 and items 2, 4 and 6 on 2026-09-28, each put with the case where it loses; the issue's notes record each answer. Items 2 and 6 are the ones they chose over the recommendation. The issue's acceptance criteria asked for items 3, 5 and 7.

**Builds on / amends:** amends nothing. Builds on D-02, whose `change-build` stage runs `.claude/workflows/build-change-task.js`; on D-03, whose policy file holds the new key; on D-12, under which each prompt this change would take past its budget was consolidated first; on D-07, which leaves a pull request that changes a budget to a person; and on D-13, whose item 17 names `asdlc-openspec-j09.11` as the home of the build agents in the same workflow, work this entry's red run is a prerequisite of.

**Decision.** Before a build task changes the code under test, its builder runs each named scenario's proof and sees it fail, or reports the scenario already green with its evidence, and the build workflow stops a run of a held kind that does neither for a scenario the parent named. The workflow's header holds the mechanics; `.claude/skills/change-build/SKILL.md` § 3 says what the parent does when it stops.

1. **The workflow stops the run, rather than a rule stated only in the prompts.** For a task whose kind is in `buildRedFirstKinds`, a scenario the task names with neither a red record (the scenario, the command and the failure it printed) nor an already-green report stops the run as `not-red`, before any review, and `why` names the scenario. Where it loses: a scenario of a MODIFIED requirement whose behaviour the code already partly has cannot fail first, so the builder reports it already green, with its evidence, and the parent judges each such scenario, a round-trip a rule stated only in the prompt would not cost. In return, a builder cannot skip the red run silently.
2. **`buildRedFirstKinds` is `asset:product` alone.** A docs, prompt, register, environment, tool or gate task is asked for the red run and not held to it. Where it loses: a gate's new selftest case that passes before the refusal it holds exists is not caught by a red run, only later by the honesty lens.
3. **An already-green report reaches the parent among `unverified`, never as passed**, carrying its command and evidence, and the parent judges it as it judges any unverified finding.
4. **The parent names the scenarios.** `args.scenarios` holds each scenario the task names, as the task names it, and `[]` when it names none; the workflow refuses a run without it and checks a record for each in code, so no run skips the check by omission. Where it loses: a scenario the parent leaves off the list is never checked for a red run, where a builder parsing the task body itself would have found it.
5. **The spec lens holds each red failure to its scenario's THEN**: an error before it, such as an import error, a syntax error or a missing file, is not a red run.
6. **After `not-red`, the parent keeps the build and takes each missing record itself.** For each scenario `why` names, it reverts the change under test, runs the proof and sees it fail, and restores the change. Since no review has run, the workflow then runs again with the build in place and `settled` carrying each red record; the maintainer's answer names how a record is taken, and this step is this entry's session's reading of what follows it. Where it loses: it relies on the revert being faithful, and one that leaves part of the change in place, or takes part of the test with it, records a failure that proves nothing. The recommendation was to discard the build and run the workflow again, which needs no revert and loses where a correct build whose builder only forgot to report its red run is paid for twice.
7. **A defect fixed through `bead` lands only after a test or selftest case that reproduces it has been seen to fail**, and the pull request's body names that run (`.claude/skills/bead/SKILL.md` § 4).

**Why.** A test first run after the code that passes it can pass without that code, and nothing here saw one fail: the honesty lens's mutants catch such a test only after the build, and only for the mutations a reviewer thinks of. The rule is adapted from obra/superpowers' test-driven-development skill ("Verify RED": the test fails, for the expected reason, before the code that passes it), read at `8ca22dba9a94f28898bbce59f2537ff4d87c747d` under its MIT licence and rewritten to this repository's rules rather than copied. Four alternatives lost:

- **A rule stated only in the prompts.** It costs no round-trip for a scenario that is already green, but a builder that skips the red run says nothing, and nothing sees it.
- **`asset:product`, `asset:tool` and `asset:gate`, the kinds whose proofs are commands, as proposed on 2026-09-26.** Where it would have lost: an `asset:tool` task that only renames a flag has no proof that can fail first, so its builder reports it already green and the parent judges it.
- **The builder listing the scenarios it ran.** It needs no new argument, but a builder that skipped the red run could list none, and the check would pass.
- **Discarding the build after `not-red` and running the workflow again, the recommendation for item 6.** It needs no revert, but a correct build whose builder only forgot to report its red run is paid for twice.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-14.
- **`.claude/workflows/build-change-task.js`:** its literals consolidated, then `args.scenarios`, the builder's red records and already-green reports, the `not-red` stop, each already-green report among `unverified`, the red records in the spec lens's prompt, `buildRedFirstKinds` read and checked, and the header.
- **`scripts/workflows.selftest.mjs`:** cases for a task of each held kind whose builder returns neither record for a named scenario, red records that leave a named scenario uncovered, an already-green report, a task of each other kind running on without them, the red records reaching the review, a run given no scenarios and a policy naming a kind that is not an `assetLabels` key.
- **`tools/policy.json`:** `buildRedFirstKinds` and its `Means`; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance`; the budgets of the three prompts, each with its figures in its `Means`.
- **`.claude/skills/change-build/SKILL.md`:** consolidated twice, then § 3 passes `scenarios`, says what the parent does after `not-red`, and has `settled` carry each red record.
- **`.claude/skills/bead/SKILL.md`:** consolidated, then § 4's rule for a defect's fix.
- **`tools/README.md`, `README.md`, `scripts/README.md` and `.claude/README.md`:** the rows that say what the policy's keys, the workflow and its selftest hold.
- **`lefthook.yml`:** the `workflows-selftest` job's comment and its measured cost.

**Figures.** Each is `node scripts/check-prompts.mjs --counts`, at `62f5ae8` for the first figure and at this entry's commit for the second: the literals of `.claude/workflows/build-change-task.js` 2,561 and 2,670; `.claude/skills/change-build/SKILL.md` 1,316 and 1,314; `.claude/skills/bead/SKILL.md` 1,635 and 1,652. What each consolidation freed on its own is the same command at its own commit: 86 for the workflow's literals, 47 and then 4 for change-build, and 21 for bead; the pull request lists those commits.

### D-15 · The kit's pipeline graph is retired; a check that reads outside the repository is stood in for by its selftest

**Recorded 2026-09-28**, carried by `asdlc-openspec-hvm`. The maintainer asked on 2026-09-28 for the case that the pipeline was obsolete to be pressure-tested, and chose to retire it from the answer, which put the retirement with the one situation where it loses.

**Builds on / amends:** amends D-01, whose conventions included the starter kit's pipeline graph (its section 2.6), the `corpus-regen` formula (its section 1.3), and the sentence of `CLAUDE.md` § The gate ladder that named a digest gate as the stand-in for a check that reads outside the repository. Builds on D-06, which deleted the only emitter this repository had and whose disposition this follows; on D-07 and D-11, whose selftests are the stand-ins that sentence now names; and on D-13, whose trace emitter (`asdlc-openspec-j09.7`) is held by its own `:check` twin.

**Decision.** The pipeline graph, the record of which generated artifact is built from which, and the gates that held it, are retired.

1. **They are deleted outright** (`docs/retired/README.md` § The three dispositions, *Delete it outright*): `tools/pipeline/`, the record, its gates, its stamp and its worked example; `docs/pipeline.md`; `.beads/formulas/corpus-regen.formula.toml`; the scripts `pipeline:check`, `pipeline:example`, `pipeline:selftest`, `pipeline:stale` and `pipeline:stale:check`; their three pre-push jobs and three CI steps.
2. **The sibling-checkout resolver goes, and `gitEnv()` stays.** `tools/lib/sibling-root.ts` found a checkout beside the primary one, which nothing here reads; `tools/lib/estate-root.ts` was its copy from before a rename, and nothing imported it. `gitEnv()`, which `tools/citations/selftest.ts` needs to build a scratch tree from inside a hook, moves to `tools/lib/git-env.ts`, and its assertion that it leaks no `GIT_*` key moves from `pipeline:selftest` into `citations:selftest`.
3. **A check that reads outside the repository is stood in for by its selftest over fixtures**, a pre-push job and a CI step, as `beads:selftest` stands in for `beads:check` (D-11) and `pr-review:selftest` for the reviewer (D-07). `CLAUDE.md` § The gate ladder, the header of `.github/workflows/verify.yml` and the pre-push header of `lefthook.yml` say so where they named a digest gate.
4. **What to regenerate after an input moves is answered by the emitter's own `:check` twin** (`CLAUDE.md` § The script suffix contract), which re-derives the artifact and refuses one left stale. `bead` § 4, `docs/playbook.md` and `README.md` § The guardrails point there.
5. **`asdlc-openspec-v20` is closed as obsolete**: it asked for a header of `tools/pipeline/glob.ts` to be corrected, and the file is deleted.

**Why.** The record held one node, the kit's worked example `X-EXAMPLE`, from the bootstrap to this entry, so its gates proved that a summary of a four-entry list agreed with itself. The only emitter this repository ever had, `tools/outcomes/`, was never a node, and D-06 deleted it. The formula's own header said to delete it unless a multi-step regeneration cycle existed, and none could without an emitter. No sibling checkout was configured anywhere. Meanwhile the engine cost three pre-push jobs, three CI steps, and five issues spent on its copied-in headers and comments, and its stamp wrote a timestamp that `CLAUDE.md` § The script suffix contract forbids an emitter.

Where this loses: an emitter that reads a language model or another checkout and commits what it writes. After this entry nothing tells a person that such an artifact's inputs moved since it was written, where a digest stamped into it would have. None exists: the trace workflow of `asdlc-openspec-as9` writes under `.scratch/`, which is not tracked. The first such emitter restores the digest gate from git (below) or brings its own, under an entry of its own. Three alternatives lost:

- **Keeping it for the trace emitter, `asdlc-openspec-j09.7`.** That emitter reads committed files, so its `:check` twin holds it and catches strictly more than a digest can, as the record's own comments said. The graph would add only an order of regeneration, which a failing `:check` shows one step at a time.
- **Keeping only the digest gate**, `stale.ts` and the stamp, for an emitter that reads outside the repository. No such emitter exists or is filed, and a gate with no subject costs a job and draws upkeep, as the five issues show.
- **Moving it to `docs/retired/`.** Nothing live reads TypeScript tools once their jobs go, and `git show` recovers them, as D-06 chose for the learning loop.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-15; D-01 carries the amendment above.
- **Deleted:** `tools/pipeline/`, `docs/pipeline.md`, `.beads/formulas/corpus-regen.formula.toml`, `tools/lib/sibling-root.ts` and `tools/lib/estate-root.ts`.
- **Added:** `tools/lib/git-env.ts`.
- **`package.json`:** the five `pipeline:*` scripts are removed.
- **`lefthook.yml`:** the jobs `pipeline-check`, `pipeline-stale` and `pipeline-selftest` are removed, and the pre-push header names the selftest as the stand-in.
- **`.github/workflows/verify.yml`:** the three `pipeline` steps are removed; its list of retired steps says why a restored one would be wrong, and its header names the selftest as the stand-in.
- **`CLAUDE.md`:** § The gate ladder names the selftest over fixtures in place of a digest gate.
- **`.claude/skills/bead/SKILL.md`:** § 4 no longer names `pipeline:stale`; the `:check` twin refuses a stale artifact.
- **`.claude/skills/add-npm-script/SKILL.md`:** the example of a third segment, the header's needs line, the rule for a script that reads another checkout, and step 5 of removing a script.
- **`tools/policy.json`:** the word budgets of `CLAUDE.md`, `bead` and `add-npm-script` fall to their new counts.
- **`scripts/check-jobs.mjs`:** `pipeline:example` and `pipeline:stale` leave the list of scripts with no job, and its header no longer names `pipeline:check`.
- **`tools/citations/selftest.ts`:** imports `gitEnv()` from its new file, asserts it leaks no `GIT_*` key, and its live-path fixture names a file that exists.
- **`tools/citations/scan.ts`:** a passage no longer cites `tools/pipeline/check.ts:139` for a phrase that file never held.
- **`README.md`, `docs/README.md`, `docs/playbook.md`, `tools/README.md` and `.gitignore`:** the `pipeline` scripts' section and rows, the rows for `docs/pipeline.md`, `tools/pipeline/` and `tools/lib/sibling-root.ts`, a row for `tools/lib/git-env.ts`, the guardrail row that named the pipeline's gates, the playbook's steps and its status line, and the ignore file's note on `.beads/formulas/`.
- **Left as it is, each on purpose:**
  - the memory rule's scope (`tools/citations/memory.ts`) and the `citations-selftest` job's glob still name `.beads/formulas/`, so a formula that returns is covered from its first commit;
  - the header of `scripts/hooks/gate-summary.mjs` names `pipeline:check` in a dated incident, which stays true about its date;
  - `openspec/changes/archive/2026-09-24-add-calculator-web-app/` names the record and the page, as the record of that change;
  - the header of `scripts/check-reference-mirrors.mjs` names "the sibling-checkout resolver under `tools/lib/`", which `asdlc-openspec-b1b` carries with the rest of that unwired gate.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n -i -E "pipeline|sibling-root|estate-root|corpus-regen|X-EXAMPLE|digest gate"` finds this entry and its amendment of D-01; the list of retired steps in `.github/workflows/verify.yml`, the status line of `docs/playbook.md`, the note of what the retirement took out in `tools/lib/git-env.ts` and three budget notes in `tools/policy.json`, each a record of this retirement; the header of `scripts/hooks/gate-summary.mjs` and the archived change, left as they are above; the workflow runtime's `pipeline()` function in `.claude/workflows/` and `scripts/workflows.selftest.mjs`, which is another thing of the same name; and "a pipeline" as a plain word in `tools/citations/memory.ts`.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- tools/pipeline/graph.ts` names the deleting commit, and `git show <that commit>^:<path>` recovers any of its files, the digest gate's `tools/pipeline/stale.ts`, `assess.ts`, `digest.ts`, `glob.ts` and `provenance.ts` among them.
- **Their return is not refused by a gate.** Review holds it, and `.github/workflows/verify.yml` says why a restored step would be wrong.

**Figures.**

- 16 files deleted, 12 under `tools/pipeline/`: `git log -1 --diff-filter=D --name-only --format= -- tools/pipeline/ docs/pipeline.md .beads/formulas/ tools/lib/sibling-root.ts tools/lib/estate-root.ts` lists them.
- 2,481 lines in the 12 files under `tools/pipeline/`: `git grep -c "" <that commit>^ -- tools/pipeline` gives each file's count.
- One node in the record, `X-EXAMPLE`, at the bootstrap and ever since: `git grep -n "id: '" <commit> -- tools/pipeline/graph.ts` at `5417b33`, at `5e89232^` and at `<that commit>^`.
- `pipeline:selftest` at 3.85 s wall and 40 of 40 cases, on a macOS laptop with Node 26.8.1 on 2026-09-28: `/usr/bin/time -p node tools/pipeline/selftest.ts` at `<that commit>^`.
- Five issues on the engine's copied-in headers and comments, `asdlc-openspec-npe`, `v6m`, `1i1`, `egt` and `v20`: `bd search pipeline` lists them with `asdlc-openspec-qxz`, which was about the Stop hook's header, and with `asdlc-openspec-hvm`, which carries this entry.

### D-16 · A session's own review and design workflows are bounded by policy, and the build and prompt reviews send one skeptic to a major finding

**Recorded 2026-09-28**, carried by `asdlc-openspec-hsg`, found while the epic `asdlc-openspec-j09` was worked. On 2026-09-28 the maintainer chose items 1, 2 and 3, each from a recommendation put with the case where it loses; item 3 is the one they chose over the recommendation. The session that coordinated the run settled item 4's value, and the session that built it named the keys.

**Builds on / amends:** amends D-10, whose item 3 gave `promptReviewSkeptics` the counts `buildReviewSkeptics` gives, three for a major finding, and whose alternative "Fewer skeptics" lost. Builds on D-03, whose policy file holds the new keys; on D-12, under which `CLAUDE.md` was consolidated before it took the rule; and on D-07, which leaves a pull request that changes `CLAUDE.md` or this register to a person.

**Decision.** How much a session spends on a review or design workflow it writes itself, outside `.claude/workflows/`, and how many skeptics the tracked build and prompt reviews send to a major finding. `CLAUDE.md` § A workflow a session writes itself is bounded holds the rule, and `tools/policy.json` holds its numbers, each with the case where it loses in its `Means`.

1. **A session's own review before a pull request comes in tiers.** A branch that changes only prompts or documents gets none beyond the pull-request reviewer. A branch with code or a gate gets one adversarial reviewer, at medium effort, that runs the code and reports at most `sessionReviewMaxFindings` findings; `sessionReviewSkeptics` sends one skeptic to each blocker or major finding, and a minor goes to the author unjudged. Where it loses: a dedicated adversary that built doctored inputs found the code-fence defect in `asdlc-openspec-j09.3`'s gate; one general reviewer may miss that kind, and the pull-request reviewer, which runs nothing, will not catch it.
2. **The rule lives in `CLAUDE.md`, with its numbers under keys of `tools/policy.json`**, so every session reads it, and it holds over an effort level or an orchestration default that says cost is no constraint. Every such workflow, a design panel as much as a review, sets each agent's effort. `CLAUDE.md` was consolidated first, under D-12, and a person merges it. Where it loses: its words cost every session, including the many that orchestrate nothing, where a rule only in `bead` and `fan-out-work` would cost only the sessions that load them.
3. **The tracked reviews send one skeptic to a major finding.** `buildReviewSkeptics.major` and `promptReviewSkeptics.major` fall from 3 to 1; `blocker` and `minor` stay, and so does a consolidation's count, which is the `blocker` count. The recommendation was to leave the build workflow's sizes for `asdlc-openspec-j09.11` to resize with the pilot's figures. Where the choice loses: a single vote now decides each major finding in a build or a prompt review, where D-10 chose three so that one vote would not decide an edit every later run of a prompt reads.
4. **A workflow a session writes itself runs at most `sessionWorkflowMaxAgents` agents** unless the user asks for more, the workflow-size guideline the session's harness gave it (`bd show asdlc-openspec-hsg`). Item 1's review needs at most one reviewer and one skeptic for each of its findings. Where it loses: a design question that needs more independent readings than the cap runs as two workflows, or waits for the user to ask for more.

**Why.** On 2026-09-28 the session working the epic `asdlc-openspec-j09` wrote its own review workflow and ran it on three lane branches before their pull requests, with four dimension reviewers and three skeptics for every finding, minor ones included, each skeptic rebuilding doctored copies to reproduce its finding. By the figures `bd show asdlc-openspec-hsg` gives, each with the workflow run whose state file, outside this repository, it was read from, the three reviews spent many times what building the three branches did; and a design-panel workflow the session wrote was stopped before any of its four readers finished. The session's harness had a guideline for a workflow's size, but the session was also under an effort level that told it token cost was not a constraint, and nothing in this repository's tracked rules bounded a workflow a session writes itself. The reviews did find real defects, so the choice was how much review, not none. Each item above names the case where it loses, and one alternative lost as well:

- **The review that session ran:** a reviewer for each of four dimensions, and three skeptics for every finding. It found real defects, the one item 1 names among them, and it spent more than the work it reviewed.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-16; D-10 carries an amendment.
- **`CLAUDE.md`:** consolidated under D-12 in a commit of its own, then § A workflow a session writes itself is bounded.
- **`tools/policy.json`:** `sessionReviewMaxFindings`, `sessionReviewSkeptics` and `sessionWorkflowMaxAgents`, each with its `Means`; `buildReviewSkeptics.major` and `promptReviewSkeptics.major` at 1, and their `Means`; `promptWordBudgetClaudeMd` lowered to `CLAUDE.md`'s new count, and its `Means`; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name the new keys.
- **`tools/README.md`:** `policy.json`'s row names the new keys.
- **Not changed:** `scripts/workflows.selftest.mjs`, which reads each count from the policy and splits a vote at the first severity of `buildReviewMajorSeverities` and `promptReviewMajorSeverities`, `blocker`, whose count stays at 3.

**Figures.** `CLAUDE.md` held 3,906 words at `b6b0906`, after D-15 changed § The gate ladder; consolidating it freed 149, to 3,757, and § A workflow a session writes itself is bounded added 130, to 3,887 at this entry's commit, each `node scripts/check-prompts.mjs --counts`; the pull request names the consolidation's commit, and gives the same two steps from 3,907 at `5a939d9`, where this branch was cut. A batch of 5 major findings in a prompt review now sends 5 skeptics, 5 times `promptReviewSkeptics.major`, 1, where it sent 15. Item 1's review runs at most 9 agents: one reviewer and one skeptic for each of `sessionReviewMaxFindings`, 8, findings, as `sessionReviewSkeptics` gives, within `sessionWorkflowMaxAgents`, 10. The incident's agent and token figures are the issue's, read from workflow state files outside this repository, and are not re-derived here.

### D-17 · A run closes through the `close-prompt-run` skill, which names each prompt review for itself, and the reviewer reads its policy first and makes no worktree it does not need

**Recorded 2026-09-29**, carried by `asdlc-openspec-03c`. On 2026-09-29 the maintainer read `.claude/agents/continuous-prompt-improvement.md` through with a session and chose items 1 to 6; the session that built it chose the skill's name, the launch prompt that carries the review's name, and reading the policy through `gh api`.

**Builds on / amends:** amends D-06, whose item 5 found the analysis's closing counts in `CLAUDE.md` § Prompt reviews; D-08, whose decision put the rule and the launch in that section, whose item 5 counted a session by one name, and whose item 7 gave every review that name; D-10, whose decision put the held line's form in that section and whose item 7 had the session print the policy from the review worktree; and D-12, whose item 4 the agent had applied to a workflow's literals only in part. Builds on D-03, whose policy file holds the skill's budget; and on D-07, which leaves a pull request that changes `CLAUDE.md`, a budget or this register to a person.

**Decision.** How a run of a prompt hands over to the batched review, and how the reviewer starts. `.claude/skills/close-prompt-run/SKILL.md` holds the analysis note, the due check and the launch; `.claude/agents/continuous-prompt-improvement.md` holds what a review does and leaves.

1. **The closing step is a skill.** `CLAUDE.md` § Prompt reviews keeps only the rule that a run of a prompt from a file ends with `close-prompt-run`, and points at the skill and the agent. Where it loses: the markers and the due rule were in every session's context, and now reach only a run that invokes the skill, so a prompt whose closing step does not is a run no review reads.
2. **Each review has a name of its own**, `review-prompts-` and the UTC date and time, which names its session, its worktree and its branch, and which its launch prompt carries. The check that no review is under way counts every working session whose name starts with `review-prompts`, leaving out the reviewer's own, and a reviewer launched with no name stops. Where it loses: agent view no longer shows every review under one name, and a person who starts a review by hand without the skill gets one that stops at once (`asdlc-openspec-hjc`).
3. **The reviewer reads the trunk's prompt-review keys before it applies any**, in § 2, with one `gh api` call that filters them. Where it loses: the read needs the network, which the review needs anyway for `gh pr list`.
4. **The reviewer makes a worktree only when a group formed**, and writes its tracker notes from a directory `mktemp -d` makes, which `CLAUDE.md` § Bash command style now names for a session with no worktree. `mktemp -d` was chosen over a directory a harness variable names, which nothing here showed is set in every background session. Where it loses: the note files stay in the system's temporary directory until it is cleaned, where `.scratch/` went with the worktree.
5. **A workflow's agents load `CLAUDE.md`.** Claude Code's documentation says only the built-in Explore and Plan agents skip it (https://code.claude.com/docs/en/sub-agents), and is silent on a Workflow script's agents, so a probe settled it: an agent spawned with no `agentType`, as `review-prompts.js` spawns its own, quoted `CLAUDE.md` from its starting context without reading a file. D-12 item 4 therefore holds in a workflow's literals, and the agent's restatements of `CLAUDE.md` for its file agents go.
6. **The agent's contradictions and gaps go.** The `isolation: worktree` its frontmatter carried, against a body that starts in the primary checkout and stops in a worktree; the sentence that re-applied § 3 once § 4 had read the policy; a branch held "for the reason § 6 reports", which § 6 never gave; § 3's rule for a finding held for another reason, now saying it must still meet the threshold; the budget rule, now saying the reviewer's session sets it and a review never raises it; and § 7's "Deliberately not changed", which now lists each group's asides (`asdlc-openspec-b99`).

**Why.** The read-through found that a review could not tell itself from another, applied thresholds it had not read, and carried a frontmatter key that would stop it wherever honoured. Moving the rule out of `CLAUDE.md` takes 624 words from every session's context. Two alternatives lost:

- **The reviewer tells itself apart by its session id**, which needs no name. The launcher knows a name before it launches, and a session is not known to learn its own id from `claude agents --json`.
- **Leaving the rule in `CLAUDE.md` and adding the name there.** Every session pays for words that only a closing step reads.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-17; D-06, D-08, D-10 and D-12 carry an amendment each.
- **Added:** `.claude/skills/close-prompt-run/SKILL.md`.
- **`CLAUDE.md`:** § Prompt reviews reduced to the rule and its pointers; § Bash command style names a directory `mktemp -d` makes.
- **`.claude/agents/continuous-prompt-improvement.md`:** consolidated under D-12 in a commit of its own, then items 2 to 6.
- **`.claude/skills/bead/SKILL.md`:** § 8 closes the run with the skill.
- **`tools/policy.json`:** `promptWordBudgetSkillClosePromptRun` and its `Means`; the budgets of `CLAUDE.md`, the agent and `bead` lowered to their new counts; the analysis, due-count and held markers' `Means`, `describes` and `whatItDoesNOTDo` point at the new homes.
- **`tools/README.md`:** `policy.json`'s row points at the skill for the markers and thresholds.
- **`.claude/workflows/review-prompts.js`:** a header comment points at the agent's § 6 for the held line.
- **`README.md` and `docs/playbook.md`:** a row for the skill, and the rows and steps that cited `CLAUDE.md` § Prompt reviews for what moved.

**Figures.** Each word count is `node scripts/check-prompts.mjs --counts`, at `658d708` for the first figure and at this entry's commit for the second: `CLAUDE.md` 3,886 and 3,262; `.claude/agents/continuous-prompt-improvement.md` 2,516 and 2,161, through 2,069 at the consolidation's commit; `.claude/skills/bead/SKILL.md` 1,617 and 1,609; the new skill 672. The probe is workflow run `wf_d0754fca-d86`, whose record is outside this repository.

> **Amended 2026-10-03 by D-32.** Item 4 had the reviewer make a worktree only when a group formed. It now makes one when a group formed or a finding settled by a source seeds a stored decision case, since `.claude/workflows/author-prompt-cases.js` runs from it; with neither, it still makes none.

### D-18 · RTK is removed, with the ripgrep step it needed and the guard's reading of its prefix

**Recorded 2026-09-30**, carried by `asdlc-openspec-wxz`. On 2026-09-30 the maintainer read RTK's own ledger of its savings with a session and chose to take RTK out. They chose items 3 and 4 from recommendations put with the case where each loses, item 4 over the recommendation.

**Builds on / amends:** amends R-01, whose amendment by D-09 lists what the guard does not see. Builds on D-12, whose item 6 lowers `CLAUDE.md`'s budget to its new count; on D-07, which leaves a pull request that changes `CLAUDE.md` or this register to a person; and on D-15, whose disposition this follows. RTK came in with no entry of its own (`ec1b41c`, `asdlc-openspec-6yp`, `asdlc-openspec-luu`), so none is superseded.

**Decision.** RTK, the proxy that condensed command output before an agent read it, is no longer used here.

1. **Its block leaves `CLAUDE.md`**, and `promptWordBudgetClaudeMd` falls to the new count.
2. **The setup steps and the dev container no longer install it.** `README.md` § Setup loses the RTK step on each platform and the dev container's clause. `.devcontainer/Dockerfile` loses `RTK_VERSION` and the RTK layer, and `.devcontainer/README.md` its mention and its bullet on RTK's hook.
3. **The ripgrep step goes too.** `asdlc-openspec-f58` added it the same day, in pull request 90, because RTK's `rtk rg` runs the `rg` binary. Nothing in the repository runs `rg`. Where it loses: in a plain terminal outside Claude Code, the dev container's own shell included, `rg` is then "command not found", where keeping it would answer. Inside a session the two are the same, since `rg` there is Claude Code's own copy.
4. **`scripts/hooks/guard-git.mjs` stops reading through an `rtk` prefix.** `RTK_SHELL` and `rtkCall`, from `asdlc-openspec-luu`, go with their 13 selftest cases and a sentence in the guard's row of `README.md`, `.claude/README.md` and `scripts/hooks/README.md`. What it no longer sees is recorded in R-01's amendment, not in the guard's header, by the maintainer's choice. The recommendation was to keep it. Where the choice loses: on a machine that still runs RTK, the guard does not refuse `rtk git push origin main` from a worktree, or `rtk gh pr edit --add-label` with the approval label from any checkout.
5. **A machine set up from the old steps removes RTK itself**, since no tracked file can. `rtk init -g --uninstall` removes `~/.claude/RTK.md`, the `@RTK.md` line of `~/.claude/CLAUDE.md` and the hook in `~/.claude/settings.json`, and leaves a clone's `CLAUDE.md` alone. Then every Claude Code session restarts, and the `rtk` binary and RTK's directory go. `rtk config` names the directory. On macOS it holds `recall.db`, up to 30 days of the output RTK hid. On Windows, `winget uninstall rtk-ai.rtk` removes a binary winget installed; it has not been run on Windows here.
6. **The issues RTK raised are closed as obsolete**: `asdlc-openspec-1ac`, `1mu`, `5ke` and `2nt`, on 2026-09-30 at the maintainer's direction, before this entry landed. `asdlc-openspec-6dx` keeps its Vale layer, and `asdlc-openspec-zfz` its build of the image, without RTK or ripgrep.

**Why.** RTK's own ledger on the maintainer's machine put about 71% of the tokens it booked as saved in output hidden or rewritten before an agent read it. `rtk grep` alone booked 63%. A search under its caps of 25 matches a file and 200 in all came back unchanged when the session's audit tried one. Past a cap it hides the rest, strips the indentation of the lines it shows and cuts them near 80 characters. `rtk gh pr checks` drops the check descriptions `open-pr` § 7 chooses by. About 19%, `rtk read`'s share, is `head` and `tail` windows booked against the whole file's size (`src/cmds/system/read.rs` at RTK v0.50.0), tokens `head` never showed.

What it hid broke this repository's rules. `CLAUDE.md` § Verification before claiming needs the lines an agent counts from (`asdlc-openspec-1mu`). A gate's reason could vanish from its output (`asdlc-openspec-5ke`). `open-pr` read a settled pull request as pending (`asdlc-openspec-1ac`). Its block told agents to treat the output as complete and to batch commands (`asdlc-openspec-2nt`). The harness refused commands behind its prefix (`asdlc-openspec-cir`). Two alternatives lost:

- **Excluding the harmful commands in RTK's config**, as `asdlc-openspec-1ac` planned for `gh`. Excluding `git`, `gh`, `grep`, `rg`, `npm` and `npx` leaves `read`, `ls` and `find`, whose booked savings are mostly the accounting above. The exclusion also lives in a per-machine file no tracked file sets, so the dev container and every other machine would keep the harm.
- **Raising RTK's caps.** Past a raised cap the lines shown are still cut, and its recall store keeps the cut form.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-18; R-01's row and entry carry its amendment.
- **`CLAUDE.md`:** the `<!-- rtk-instructions v2 -->` block is removed.
- **`tools/policy.json`:** `promptWordBudgetClaudeMd` falls from 3,343 to 3,263, and its `Means` says why.
- **`README.md`:** § Setup loses the RTK and ripgrep steps on macOS and Linux and on Windows, and the dev container's clause on RTK. Windows' pointer to the `vale sync` step moves from step 7 to step 5. § What runs automatically loses the guard row's `rtk` sentence.
- **`.devcontainer/Dockerfile`:** `RTK_VERSION`, the RTK layer and `ripgrep` in the base-packages layer are removed, with the header's list.
- **`.devcontainer/README.md`:** the list of what the image gives, and the bullet on RTK's hook.
- **`scripts/hooks/guard-git.mjs`:** `RTK_SHELL`, `rtkCall`, their branch in `inspectStatement` and the header's paragraph on the `rtk` prefix are removed.
- **`scripts/hooks/worktree-hooks.selftest.mjs`:** the 13 cases of a command behind an `rtk` prefix, 9 refused and 4 controls.
- **`.claude/README.md` and `scripts/hooks/README.md`:** the guard's row loses its `rtk` sentence.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n -i -w -e rtk -e ripgrep` finds this entry, R-01's row and amendment, and the history in `promptWordBudgetClaudeMdMeans`. Each is a record of this removal.
- **The recovery.** `git log -1 --format=%H -S RTK_SHELL -- scripts/hooks/guard-git.mjs` names the removing commit. `git show <that commit>^:<path>` recovers each file as it was, the block in `CLAUDE.md`, the RTK layer of `.devcontainer/Dockerfile` and `rtkCall` among them.
- **Its return is not refused by a gate.** Review holds it, and this entry says why.

**Figures.**

- `CLAUDE.md` held 3,343 words at `fba6626` and 3,263 at this entry's commit: `node scripts/check-prompts.mjs --counts`.
- Nine tracked files named RTK at `fba6626`, on 80 lines: `git grep -c -i -w -e rtk -e rtk-ai fba6626`.
- The 13 selftest cases are the two arrays under `guard-git: a command behind an rtk prefix` in `scripts/hooks/worktree-hooks.selftest.mjs` at `fba6626`.
- RTK's ledger: 515 commands and 184.7K tokens booked as saved; `rtk grep` 116.4K, `rtk read` 35.1K, `rtk git show` 8.6K over 2 calls, `rtk gh pr checks` 6.9K over 10 calls, and one `rtk ls` 8.2K. The shares above are 131.9K and 35.1K of 184.7K. These are `rtk gain` on the maintainer's machine on 2026-09-30, outside this repository, and are not re-derived here.

### D-19 · Git's config-based hooks replace lefthook, and dispatch to a runner of this repository's own

**Recorded 2026-10-01**, carried by `asdlc-openspec-pp6`. On 2026-10-01 the maintainer chose Option 2 of the decision brief in that issue. It was the research session's recommendation, and the brief put it with the case where it loses. The brief condenses four research reports, which are that issue's comments. Where the brief and a report disagree, the report's hands-on result wins.

**Builds on / amends:** amends D-01, whose conventions brought lefthook in through the starter kit's hook-runner parameter. No entry adopted or weighed lefthook: before this one, the register named `lefthook.yml` only in other entries' records of what changed. Builds on D-07, which leaves a pull request that changes this register to a person. Builds on D-15 item 3, under which a check that reads outside the repository, as `beads:check` reads the tracker, is stood in for in CI by its selftest.

**Decision.** lefthook stops being this repository's git hook runner. Git's config-based hooks call a runner this repository writes, and the runner reads a tracked job file. Until the pull request that carries `asdlc-openspec-uc1` lands, lefthook runs the hooks as it does today, and `CLAUDE.md` § The gate ladder stands as written. This entry decides the shape. That issue's design holds the steps and the choices this entry leaves open. Each choice is put to the maintainer with the case where its recommendation loses.

1. **Each event gets one config hook, and all five dispatch to one runner.** `pre-commit`, `prepare-commit-msg`, `post-checkout`, `post-merge` and `pre-push` each get a `hook.<name>.command` and a `hook.<name>.event` in the repository's own config, which Git reads from 2.54.0. The command is a relative path, so Git runs each checkout's own copy of the runner from that checkout's root. Nothing in the shared config or in `.git/hooks` names a worktree's path.
2. **`.git/hooks` stops being this repository's.** Git runs the classic `.git/hooks/<event>` script after the config hooks, so what the tracker and graphify write there runs too. lefthook renamed another tool's hook `<hook>.old`, which never runs, and erased a section appended to its own shim.
3. **The runner does for the jobs what lefthook did.** That is:
   - the staged files at commit, and the pushed files from the push's standard input;
   - glob matching;
   - parallel jobs, with the one sequential group;
   - each job's environment;
   - the output, and a forced run.
   The runner is a script under `scripts/`, with the header, `--selftest` and root override that `CLAUDE.md` § Standing rules for prompts and gates requires. Its selftest is a pre-push job and a CI step.
4. **The job file keeps `lefthook.yml`'s schema, under a new name.** `scripts/check-jobs.mjs` reads it with only the file name changed, and each job's comment stays beside the job.
5. **`npm run gates` keeps its name and goes through git.** It runs the pre-push hook with `git hook run --to-stdin`, given the branch's push line, and forces every job. A run by hand then sees the environment and the standard input of a real push. A checkout with no hooks installed fails rather than reporting a clean run.
6. **No dependency's install script writes hooks.** lefthook leaves `devDependencies`, and its postinstall goes with it. A step of this repository's own writes the five config entries, and it writes the same thing from whichever checkout runs it.
7. **Git runs one hook per event, and the runner runs the jobs.** Git does not run one hook per job, which is shape A2 below.

**Why.** Git gives each hook event one file in the shared `.git/hooks`, and three tools write those files here: lefthook, the tracker and graphify. The brief in `asdlc-openspec-pp6` gives the hazards that followed, each with its evidence:

- lefthook's npm postinstall rewrote those files from whichever worktree last ran `npm ci`, so every checkout's hooks named one worktree's binary.
- Its install displaced or erased the other tools' hooks.
- Its bare run skipped every job and exited 0 when a push changed nothing.
- A full run printed more than an agent's tool output holds.
- Its shim ran the lefthook on PATH before the pinned one.
- A run by hand saw a different environment from a real push.

This option removes their cause, one file with many owners and an install script that rewrites it, rather than working around it. It stays in Node and in this repository's gate conventions. Five alternatives lost:

- **Keeping lefthook, hardened.** The hardening is a pinned binary per worktree, no auto-install, output only on failure, a sentinel job, and `gates` through a git alias. It is the cheapest, and it fixes the output and the pin. What it leaves:
  - Nothing locks the shared hooks. In the lefthook report's experiment E3-f, one worktree on a config without the hardening reverted every checkout's shim.
  - Other tools' hooks still cannot sit beside it.
  - The skip-all is by design.
  - Two worktrees committing at once share one stash and one patch file (evilmartians/lefthook#1529).
  - A missing binary exits 0 by default (evilmartians/lefthook#1548). Both issues were open on 2026-09-30.
- **hk 2.4.0.** Its config is Pkl, with no JSON export for `scripts/check-jobs.mjs` to read. `hk run pre-push --all` checks only unpushed files, a false green. It has no npm package. Under a Git older than 2.54 it overwrites existing hooks with no backup. It shipped a breaking 2.0.0 on 2026-09-13, then six releases in the next 15 days.
- **prek 0.5.4.** It runs hooks in parallel only within one priority. Its own install renames foreign hooks `.legacy` and erases appended sections. It is pre-1.0, with 2026 bugs, since fixed, that lost commits and corrupted an index from a linked worktree.
- **Shape A2: one config hook per job, with Git 2.55 running them in parallel.** Git 2.54.0, the first Git on PATH on the maintainer's Mac, runs them one after another. A worktree runs the primary checkout's job list unless every worktree carries its own include through `extensions.worktreeConfig`. And nothing prints a total.
- **pre-commit 4.6.2, Husky 9.1.7, simple-git-hooks 2.14.0, or `core.hooksPath` to a tracked directory.** The brief ruled all four out:
  - pre-commit runs no two hooks in parallel.
  - Husky takes `core.hooksPath`, so `.git/hooks` stops running.
  - simple-git-hooks deletes the hooks it does not manage, and its postinstall rewrites the shared hooks.
  - A tracked hooks directory turns the tracker's and graphify's writes into changes to tracked files.

Where it loses:

- **An older Git runs no gate.** Under a Git older than 2.54, the `hook.*` keys run nothing and nothing says so; lefthook's shim runs under any Git. That reading is from Git's documentation before 2.54, and no report ran an older Git to confirm it. A push from such a host or GUI client runs no gate. CI still runs every gate that reads only committed files, so there the loss is a red pull request minutes later instead of a refused push. The exceptions are `beads:check` and the tracker's own pre-push hook: they read the tracker, and no CI step runs them.
- **The dev container is such a host** until `asdlc-openspec-tvy` moves its base image, since it carries Git 2.51.1.
- **Everything lefthook did for the jobs becomes code this repository writes and selftests.** Node's `path.matchesGlob` differs from lefthook's matcher in both directions, so every glob is ratified again.

**What changed.**

- **This register:** this entry. The status line, the blockquote's bound and the decisions table carry D-19, and the status line says its migration is still to land. D-01 carries an amendment.
- **To come, with `asdlc-openspec-uc1`:**
  - the runner and its selftest;
  - the job file, under its new name;
  - `scripts/check-jobs.mjs`;
  - `npm run gates` and the install step;
  - `package.json` and `package-lock.json`, without lefthook;
  - `.devcontainer/`;
  - every prompt and document that names lefthook.
  `lefthook-windows.yml` and the `lefthook-local.yml` convention go with it, under a retirement checklist in its pull request.

**Figures.**

- 30 tracked files named lefthook at `d0f26e6`: `git grep -i -l lefthook d0f26e6`.
- `lefthook.yml` held 37 run blocks at `d0f26e6`: `npm run check:jobs`. Of them, 32 are pre-push jobs and 2 are pre-commit jobs. Three of the pre-push jobs are the sequential group `calculator-suites`. Reading the file with js-yaml, as `scripts/check-jobs.mjs` does, gives the split.
- On the maintainer's Mac on 2026-10-01, `/usr/bin/git` was 2.54.0 (Apple Git-157) and first on PATH, and Homebrew's Git was 2.55.0: `which -a git`, then `--version` on each.
- The dev container's Git 2.51.1 comes from image 2.0.5's history in devcontainers/images, outside this repository, as `asdlc-openspec-tvy` records. It is not re-derived here.

> **Amended 2026-10-01 by D-20.** graphify writes no git hooks here. D-20 refuses `graphify hook install`, whose hooks rebuild the graph with `graphify update` and erode its document layer, so item 2 and the Why no longer hold where they name graphify as a writer of `.git/hooks`. The tracker still writes there.

> **Amended 2026-10-01 by D-22.** Item 2 no longer holds where it expects the tracker's own hooks in `.git/hooks`. The tracker's git integration runs from its five jobs in `git-hooks.yml`, and nothing here runs `bd hooks install`. A section bd writes there on its own still runs, but it runs bd a second time, and the install and the runner warn of it. The install also removes what lefthook left in `.git/hooks`.

> **Amended 2026-10-04 by D-35.** Item 5's forced suite is `mise run gates`: it keeps its name and goes through Git as before, launched by mise, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them. The jobs `git-hooks.yml` runs launch through `mise run` in place of `node --run`, and `check:jobs` refuses a job left on the old launcher.

### D-20 · A local code graph is built with graphify on each person's machine, never committed, and queried through its MCP server

**Recorded 2026-10-01**, carried by `asdlc-openspec-rsc`. On 2026-10-01 the maintainer chose to keep the graph local, and asked for a checked-in script that builds it, its output folder gitignored, and query access through a skill and an MCP server the script registers. They chose local-scope registration, Opus for the documents and this entry from recommendations each put with the case where it loses, Opus over the recommendation of Sonnet.

**Builds on / amends:** amends D-19, whose item 2 and Why name graphify among the tools that write `.git/hooks`. Builds on D-03, which puts the constants the script reads in `tools/policy.json`; on D-12, under which the worktree briefing was consolidated before its carve-out; and on D-07, which leaves a pull request that changes this register or a word budget to a person. The script reads a language model and the person's own plan, so under `CLAUDE.md` § The gate ladder no job or step runs it. Its selftest, the script run against a fixture repository with stub tools (`asdlc-openspec-i3c`), is a pre-push job and a CI step in its place.

**Decision.** A person who wants a knowledge graph of this repository builds one with graphify on their own machine. It is never committed.

1. **`npm run code-graph` builds it** into the primary checkout's `graphify-out/`, from whichever checkout runs it (`scripts/code-graph.mjs`). It runs `graphify extract` with the `claude-cli` backend, which calls `claude -p` with the model `graphifyClaudeCliModel` names, then `graphify cluster-only`, which names the communities with the same model. It withholds an exported API key or cloud-provider setting from those calls, which `claude -p` would otherwise bill in place of the person's own plan. `-- --code-only` builds the code layer alone and calls no model.
2. **Never `graphify update`, `watch`, `hook install` or `claude install`.** The first three rebuild through the path that erodes the document layer; the last writes graphify's advice to run `update` into `CLAUDE.md`. The script refuses graphify's git hooks, and the `code-graph` skill tells a session never to run any of the four. So graphify writes no `.git/hooks` here, as D-19's amendment records.
3. **The script stamps every item a language model produced `_origin: "semantic"`** whenever a build changed the graph, which keeps an `update` run by anyone from deleting it. It exits 1 on a partial extraction, which graphify can write with exit 0, after stamping what graphify wrote.
4. **`graphify-out/` is gitignored**, unanchored, so a stray build inside a worktree is ignored too.
5. **The script registers graphify's MCP server at Claude Code's local scope** for the primary checkout's path. Claude Code reads that registration for the checkout's linked worktrees too. `npm run code-graph:mcp` registers it alone.
6. **The `code-graph` skill** has a session query the graph through the server's tools only, read each answer as a lead to verify, and never build the graph itself. The worktree briefing lets a worktree read through those tools and nothing else outside it.
7. **A person refreshes the graph by running the script again.** A trigger after a pull waits for D-19's runner (`asdlc-openspec-uc1`).

**Why.** The first graph, built on 2026-09-30 by graphify's own agent skill, was judged worth having: its links between prompts, documents and scripts answered questions the code alone does not. It cost $10.40 for 57 documents. No near-term use justified committing it and keeping it in step with every change, so each person who wants it pays for their own. Committing lost on more than cost: the graph is no file of `CLAUDE.md` § Three kinds of file, and never a fourth, since half of it comes from a language model and no `:check` can re-derive it. Every change to code rewrites `graph.json`, so open pull requests conflict on it. graphify's union merge driver is local git config, which GitHub's server-side merge never runs. And `scripts/pr-review.mjs` merges a pull request without requiring its branch to be up to date with `main`, so `main`'s copy could go stale.

graphify's own refresh is what this entry routes around. Its README, its hooks and its `CLAUDE.md` block all refresh with `graphify update`, which decides whether a node came from its parser or a language model by the shape of the node's `source_location`, then deletes the "parser" items of each file it re-parses. Two runs on a copy of the first graph took its concept nodes from 157 to 22 and its links between documents and code from 898 to 156. A copy stamped as item 3 says kept all 249 of its concept, rationale and paper nodes outside the files edited between the runs, and all 878 of its links of the kinds a language model makes, through two runs, where an unstamped control fell to 108 and 280.

Four alternatives lost:

- **Committing the graph.** Nobody would pay a first build after the first, but it fails the three-kinds rule and conflicts as above.
- **A tracked `.mcp.json`.** It reaches every worktree with no registration step. But every session, and every headless `claude -p` run with the reviewer's among them, would start the server, failing with an approval prompt for whoever has no graphify.
- **Registering at user scope.** It reaches every worktree with no question. But the server would load in every repository on the machine, answering about this one.
- **Vendoring graphify's own skill.** It is 5,268 words, lacks the first line `check:prompts` requires, advises `graphify update`, and saves answers to steer later runs, which `CLAUDE.md` § A program proposes; only a person promotes rules out.

Where it loses:

- **Each person pays a first build.** It sends every document to Opus on their own plan. The script's path has not been measured; the agent skill's first build cost $10.40, and Sonnet, the recommendation, would cost less.
- **The graph describes the primary checkout at its last build,** not an agent's branch, and goes stale until someone runs the script again.
- **Two of graphify's gaps stay.** It does not normalise the ids a language model gives. And data JSON such as `tools/policy.json` gets no node, so links to it are dropped.
- **Only the script and the skill refuse graphify's eroding commands.** A person, or a user-level graphify skill, can still run `graphify update` on the graph.
- **The script relies on graphify 0.9.73's internals:** the `_origin` field, the text of its warnings and its file types. A new release is checked against the script's header before `graphifyVersion` moves.
- **The script withholds only what it can see.** An `apiKeyHelper` or an `env` block in a person's own Claude Code settings can still make `claude -p` bill an API key.
- **Claude Code's documentation does not say that local scope reaches a linked worktree.** It was observed: a local-scope server registered for the primary checkout was listed as connected by `claude mcp list` run in a worktree on 2026-10-01, and no key for the worktree appeared in `~/.claude.json`.

**What changed.**

- **This register:** this entry. The status line, the blockquote's bound and the decisions table carry D-20, and D-19 carries an amendment.
- **`scripts/code-graph.mjs`:** new, with its `--selftest` and its row in `scripts/README.md`.
- **`package.json`:** `code-graph` and `code-graph:mcp`, which `scripts/check-jobs.mjs` declares as operator commands, and `code-graph:selftest`.
- **`lefthook.yml` and `.github/workflows/verify.yml`:** the `code-graph-selftest` pre-push job and its CI step.
- **`tools/policy.json`:** `graphifyVersion`, `graphifyClaudeCliModel`, `graphifySemanticExtensions`, `graphifyOutDir`, `graphifyMcpServerName` and `promptWordBudgetSkillCodeGraph`, each with its `Means`. `promptWordBudgetWorktreeContext` falls from 940 to 937, and `describes`, `gatedBy` and `provenance` name the new keys.
- **`.claude/skills/code-graph/SKILL.md`:** new.
- **`.claude/worktree-CONTEXT.md.tmpl`:** consolidated first, freeing 10 words, then given the carve-out for the server's tools, 7 words.
- **`.gitignore`:** `graphify-out/`.
- **`README.md`:** the gitignored path, a row in § Working here, the `### code-graph` sub-section of § The npm scripts, and a row in § The guardrails.

**Figures.**

- 3,649,692 tokens and $10.40: the four extraction agents' 27 calls in Langfuse, session 56c6cce4, 2026-09-30 23:26:34-23:35:31 UTC, at Langfuse's managed prices for `claude-opus-5-5`. Outside this repository; not re-derived here.
- 157 to 22 concept nodes and 898 to 156 links: two `graphify update` runs on a clone holding a copy of that graph, on 2026-10-01. 249 and 878 kept against 108 and 280: a stamped copy and its control, the same day, on clones at `7669dad`. Neither run is in this repository, and neither is re-derived here.
- 5,268 words: `wc -w` on graphify 0.9.73's own `SKILL.md`, outside this repository.
- 937 words in the worktree briefing and 283 in the skill: `node scripts/check-prompts.mjs --counts`.
- 31 checks in `code-graph:selftest`, and 11.98-12.06 s with 29 of them: `/usr/bin/time -p node --run code-graph:selftest`, the job's comment in `lefthook.yml` naming the host.

> **Amended 2026-10-01 by D-23.** Item 2 and the loss "Only the script and the skill refuse graphify's eroding commands" no longer hold for a session's command line: `scripts/hooks/guard-git.mjs` refuses `graphify update`, `watch`, `hook install` and `claude install` in every session, from any checkout. A person's own terminal, graphify behind a launcher or a shell word such as `nohup`, graphify's library called through `python -c`, as a user-level graphify skill runs its `--update`, and `graphify install --project`, which writes all that `claude install` does, still pass it.

> **Amended 2026-10-02 by D-28.** Item 5's server is registered on the harness assessment's combined graph, the file `graphifyCombinedGraphFile` names beside `graph.json`, while that file records the git blob id of the `graph.json` beside it, and on `graph.json` otherwise. Item 6's skill tells a session what the combined graph's added edges are.

> **Amended 2026-10-04 by D-35.** graphify's release is the `pypi:graphifyy` pin in `mise.toml`, which `mise install` installs with its MCP extra, and no longer `graphifyVersion`, which is retired. The script names `mise install` where it named `uv tool install`, and item 5's server is the `graphify-mcp` that `mise which` names. The loss "The script relies on graphify 0.9.73's internals" now reads: a new release is checked against the script's header, and the guard's reading of its command line, before the pin moves, as the comment above the pin says.

> **Amended 2026-10-04 by D-35.** Item 1's `npm run code-graph` and item 5's `npm run code-graph:mcp` run as `mise run code-graph` and `mise run code-graph:mcp`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-21 · `open-pr` reviews each branch before its push, in an agent's own context, and the reviewer's brief carries the facts its job can compute

**Recorded 2026-10-01**, carried by `asdlc-openspec-ivn` and `asdlc-openspec-744`. On 2026-10-01 the maintainer adopted both from a meta-analysis of the pull-request reviewer's verdicts: the local review mandated by `open-pr` itself, done by a custom agent for its context, and the facts put in the brief or the prompt gate tightened. The session chose the brief, for the reasons below.

**Builds on / amends:** builds on D-07, whose brief this extends and whose agent's rubric the local review applies, and on D-12, under which `open-pr` and `pr-reviewer` were consolidated before their edits. Builds on D-16 without amending it: D-16's tiers bound a review workflow a session writes itself, and the local review is none, but a tracked agent `open-pr` runs. A branch with code or a gate still gets D-16 item 1's adversarial reviewer, which runs the code, as the local review, which runs nothing, cannot. It amends nothing.

**Decision.**

1. **`open-pr` § 5 reviews the branch before each push.** The `branch-reviewer` agent reads a brief that `scripts/pr-review.mjs brief --local` writes for the branch's last commit, and judges the branch by `.claude/agents/pr-reviewer.md`, which stays the rubric's one home. The session fixes what the agent says would draw a request for changes, and each minor finding in a file the branch changes, then pushes; it does not review those fixes again. Every caller of `open-pr` does this.
2. **The agent reads only**, with Read, Grep and Glob: the local brief carries what the reviewer's carries, so it needs no command.
3. **Every brief carries three facts its job computes**: the tracker state of each other issue the cited issues and the body name; the branch's commits, each with the lines it changes; and, when a prompt or `tools/policy.json` changed, `node scripts/check-prompts.mjs --counts` over a copy of the head's files, run by the checkout's own script, never the pull request's. The reviewer judges a criterion one of them settles as met or not-met.

**Why.** In the reviewer's verdicts of 2026-09-25 to 2026-10-01, 8 pull requests drew a `changes` verdict for a defect of their own, holding 12 distinct blocking causes. 4 of them were gaps a reader finds and no gate can (#55 twice, #72, #79), each found a push and a review after a reader before the push could have found it. Criteria were marked unverifiable for facts the brief job could compute: a budget equal to its prompt's count (#56, #79), a consolidation committed alone and first (#79), a follow-up filed (#58). Three alternatives lost:

- **The adversarial-verifier, or the build workflow's lenses, run from `bead` alone**, the options `asdlc-openspec-ivn` first offered: they reach `bead` and not the other callers of `open-pr`, and judge by rubrics other than the reviewer's.
- **A review in the authoring session's own context**: the session reads what it meant to write, not what it wrote.
- **`check:prompts` refusing a budget above its count**: it settles only the first kind of fact, and sends every pull request that shrinks a prompt to a person, since each `promptWordBudget*` key is on `prReviewHighRiskJsonKeys`.

Where it loses: every pull request pays one more review, at the reviewer's model and effort, before each push, a one-word fix's among them; the first, of this entry's own branch, took 267,564 tokens and 522 seconds. And the local review samples the same model as the reviewer, so it does not find all that the reviewer will: in 7 pull requests of that week the reviewer named minor findings on a later head that the earlier head already carried.

**What changed.**

- `scripts/pr-review.mjs`: `brief --local`, and the three facts in every brief; `pr-review:selftest` holds each part that runs without the network.
- `.claude/agents/branch-reviewer.md`, new; `.claude/skills/open-pr/SKILL.md` § 5 and `.claude/agents/pr-reviewer.md` § What you are given and § 1, each consolidated first; the three prompts' budgets in `tools/policy.json`.
- `docs/playbook.md` § 4.4, and the rows in `.claude/README.md`, `scripts/README.md` and `README.md`.
- This register: this entry, its table row, the status line and the bound.

**Figures.**

- 79 verdict comments on 46 pull requests, 2026-09-25 to 2026-10-01: `gh api "repos/{owner}/{repo}/issues/comments?per_page=100" --paginate`, kept where the author is `github-actions[bot]` and the body opens with `<!-- pr-review:verdict`, read on 2026-10-01. The 8 pull requests and 12 causes are those comments' `changes` verdicts, less #50's, whose cause was a planted commit (`5253f22`); the pull request that carries this entry lists each cause.
- The 7 pull requests whose reviewer named, on a later head, a minor finding the earlier head already carried: #57, #58, #61, #62, #66, #70 and #75, from their verdict comments (`gh pr view <n> --comments`), read on 2026-10-01.
- The first local review, of this entry's branch at `615b5bb`: 267,564 tokens, 22 tool calls and 522 seconds, as the session that ran it reported them on 2026-10-01. That is outside this repository, and not re-derived here.
- The budgets: `node scripts/check-prompts.mjs --counts` at this entry's commit, each figure in its `Means` in `tools/policy.json`.

### D-22 · The tracker's git integration runs from the job file, and the install clears what lefthook left in .git/hooks

**Recorded 2026-10-01**, carried by `asdlc-openspec-uc1`. The maintainer chose each item that day. Each was put with the case where its recommendation loses, and every answer is in that issue's notes and description. The pull-request reviewer, judging #99 at d13aca8, asked a person whether item 1 departs from D-19 item 2 enough to need an entry; the maintainer chose this one.

**Builds on / amends:** amends D-19 item 2, as D-20 amended it for graphify, where it expects the tracker's own hooks to run from `.git/hooks`. Builds on D-19 item 1, whose plain command item 3 keeps, and on D-07, which leaves a pull request that changes this register to a person.

**Decision.**

1. **The tracker's git integration runs from its five jobs in `git-hooks.yml`**, one for each event the runner installs. Nothing here runs `bd hooks install`: the dev container's entrypoint no longer does. A `BEGIN BEADS INTEGRATION` section in `.git/hooks`, which `bd init` or `bd doctor --fix` can write, runs bd a second time after its job. `npm run hooks:install` and the runner warn of one.
2. **`npm run hooks:install` removes what lefthook left in `.git/hooks`**: each shim, known by its generated text, with any section appended to it, and `.git/info/lefthook.checksum`. It leaves an `.old` or `.backup` copy and reports it. The runner warns of a shim that comes back, at every event.
3. **A checkout whose branch predates the runner gets the plain command**, `node scripts/git-hooks.mjs <event>`, as D-19 item 1 states it. Such a worktree cannot commit until it is rebased, since prepare-commit-msg runs even under `--no-verify`.
4. **`git grep -i lefthook` may also find the cleanup of item 2**, its warning, their selftest cases and the rows that say the install removes lefthook's shims, beside the history D-19's migration leaves. `asdlc-openspec-uc1`'s criterion 2 was amended to allow them.

**Why.** Before the migration, the tracker ran only through lefthook's jobs: on 2026-10-01 none of the five live hooks in the primary checkout's `.git/hooks` carried bd's section. Each was a lefthook shim naming one worktree's binary. The sections the dev container had appended survived only in five `.backup` copies from 2025-09-25, because lefthook's reinstall erased them (`asdlc-openspec-uc1`, step 0a). A section bd appends does not pass on the status of what runs before it. A foreign hook that ended in `false` exited 0 once bd's section ran (step 0b). So the tracker's hooks in `.git/hooks` were a file with two owners, the cause D-19 removes, and its jobs keep its integration in tracked config. The cleanup removes what a pre-migration worktree's `npm ci` puts back. In every run of the migration's own suite, the runner's warning named the lefthook shim still in the shared `.git/hooks/pre-push`. Three alternatives lost:

- **The tracker owns `.git/hooks`** through `bd hooks install`, and its jobs leave the job file. Its integration would survive anything that happens to the runner. But it lives in untracked state no gate reads, and a missing hook is silent, as the erased sections were.
- **A guarded command** that skips, with one line, a checkout with no `scripts/git-hooks.mjs`. A worktree on an old base could keep committing. But its pushes would run no gate until it was rebased, where the plain command refuses.
- **No cleanup**, so `git grep lefthook` finds history alone. But nothing would remove or name a shim that comes back, and every commit would run both runners.

Where it loses:

- **`bd init` or `bd doctor --fix` puts the tracker's hooks back**, and bd runs twice on every event until someone removes them. The warning names them; nothing removes them.
- **Every worktree on an old base stops committing** once any `npm ci` on a new branch runs the install, until it is rebased (`asdlc-openspec-7du`).
- **The grep is no longer a test of history alone.** A live mention copied back in can hide among the cleanup's.

**What changed.**

- **This register:** this entry. The status line, the blockquote's bound and the decisions table carry D-22, and D-19 carries an amendment.
- **`git-hooks.yml`:** the tracker's five jobs, kept from `lefthook.yml`, with the comment that they are its integration.
- **`scripts/git-hooks.mjs`:** the install's cleanup and the warnings of items 1 and 2, held by `hooks:selftest`.
- **`.devcontainer/entrypoint.sh`:** no `bd hooks install`.

**Figures.**

- Five lefthook shims, five `.backup` copies and no `BEGIN BEADS INTEGRATION` section in the primary checkout's `.git/hooks` on 2026-10-01: `ls -la` and `grep -c "BEGIN BEADS"` there, read-only, outside this repository (`asdlc-openspec-uc1`'s notes, step 0a). Not re-derived here.
- A foreign hook ending in `false` exiting 0 under bd 1.3.0's appended section: a scratch repository with its own `bd init --sandbox` project, outside this repository (the same notes, step 0b). Not re-derived here.

> **Amended 2026-10-04 by D-35.** Items 1 and 2's `npm run hooks:install` runs as `mise run hooks:install`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them. `npm ci`'s `prepare`, which runs the same install, stays a `package.json` script.

### D-23 · An in-session guard refuses graphify's update, watch, hook install and claude install, from any checkout

**Recorded 2026-10-01**, carried by `asdlc-openspec-bmw`. That issue was filed the same day from `asdlc-openspec-rsc`, which recorded D-20, with this guard as its acceptance criteria, and the maintainer asked a session to work it. This entry records what those criteria decided, because the guard makes a line of D-20 untrue.

**Builds on / amends:** amends D-20, whose item 2 and whose loss "Only the script and the skill refuse graphify's eroding commands" say nothing in a session refuses them. Builds on D-09, whose guard this extends, from any checkout as its label rule is, and on D-07, which leaves a pull request that changes this register to a person.

**Decision.** `scripts/hooks/guard-git.mjs` refuses, in every session and from any checkout, the primary one included, a Bash command that runs graphify's `update`, `watch`, `hook install` or `claude install`.

1. **What it refuses:** graphify whose first argument is `update` or `watch`, or whose first two are `hook install` or `claude install`. graphify reads its command from those positions only. It is read when run by name from any path, or as a Python module, `graphify` or `graphify.__main__`, past Python's options in any form Python reads (`-X dev -m`, `-um`, `-mgraphify`). It is read in each statement the command line holds, split at `;`, `&&`, `||`, `|`, `&` or a line break, and inside `bash -c`, when the statement opens with it after any environment assignments.
2. **What it leaves alone:** every other graphify command. `query`, `path` and `explain` read the graph, `extract` builds it as `npm run code-graph` does, and `hook status` and `claude uninstall` share only a first word with a refused command. It also lets through a refused command followed by `-h`, `--help` or `-?`, which graphify answers with a line of help and nothing else (its `__main__.py`).
3. **The refusal names the command, what it does, `npm run code-graph` and D-20**, and no other graphify command. It tells the session not to run `npm run code-graph` itself, which spends the person's own plan, as the `code-graph` skill's step 2 does.
4. **The list lives in the guard**, as `GRAPHIFY_ERODING`, not in `tools/policy.json`: only the guard reads it, and that file holds the constants that belong to no one tool.

**Why.** D-20 left the four commands to the `code-graph` skill's instruction, and graphify's git hooks to `scripts/code-graph.mjs`, and listed that among its losses. graphify's user-level skill and the block `claude install` writes both advise `update`, so a session that reads either is told the opposite of the skill. Two alternatives lost:

- **A sibling hook of its own**, keeping `guard-git.mjs` to git and `gh`. It would start one more process on every Bash call and add a registration to `.claude/settings.json`, which `CNT-HOOKS` counts, for a rule that needs the same parser.
- **Refusing `graphify install` too**, which the `code-graph` skill also forbids. Plain, it copies graphify's skill to `~/.claude/skills/` and writes a registration into `~/.claude/CLAUDE.md`; with `--project`, it does all that `claude install` does, and more (below). The issue's criteria hold the guard to D-20's four, so a person decides it in `asdlc-openspec-c8ib`.

Where it loses:

- **`graphify install --project` passes, and writes all that the refused `claude install` writes.** It calls the same function, which puts graphify's advice to run `update` into `./CLAUDE.md` and its PreToolUse hooks into `.claude/settings.json`, and also copies graphify's skill into `.claude/skills/` (graphify 0.9.73's `install.py`). Refusing it would have widened the issue's criteria; `asdlc-openspec-c8ib` carries it.
- **It refuses a command aimed at another project's graph.** A session started here that is asked to run `graphify update ~/other-project` is refused, though that graph is not this repository's; without the guard it would run.
- **It reads only a statement of a session's command line that opens with graphify.** graphify behind a launcher (`env`, `uvx`, `pipx run`) or a shell word (`nohup`, `time`, `exec`, `then`), in `bash -lc` or `eval`, its library called through `python -c`, as graphify's own skill runs its `--update`, a person's own terminal, and a git hook installed before this entry all pass it. The guard's git rules miss the same shell forms; `asdlc-openspec-u70n` carries both.
- **It reads graphify 0.9.73's command line by position, and that release's help guard.** A release that reads its command otherwise leaves the guard wrong, and `graphifyVersionMeans` sends whoever moves the release to the script's header alone (`asdlc-openspec-8fn9`).

**What changed.**

- **This register:** this entry. The status line, the blockquote's bound and the decisions table carry D-23, and D-20 carries an amendment.
- **`scripts/hooks/guard-git.mjs`:** the graphify rule, with `GRAPHIFY_ERODING`, `GRAPHIFY_HELP` and a reader of Python's options, and its header paragraph.
- **`scripts/hooks/worktree-hooks.selftest.mjs`:** a section asserting each refusal by its reason, from the primary checkout and a worktree, beside graphify's reading commands and the near misses as controls.
- **`git-hooks.yml`:** the `worktree-hooks` job's comment, with what the new cases cost.
- **`.claude/README.md`, `scripts/hooks/README.md` and `README.md`:** the guard's rows, and the code graph's row in `README.md` § The guardrails, which said no gate refused one.

**Figures.**

- 157 to 22 concept nodes and 898 to 156 links, in the guard's header: D-20's Figures, quoted, not re-derived here.
- 12 refusals and 10 controls in the selftest's section `guard-git: graphify's eroding commands, from any checkout`: `node scripts/hooks/worktree-hooks.selftest.mjs`.
- graphify reading its command from its first argument and a second word from its second, its help guard, and what `install` and `install --project` write: graphify 0.9.73's `__main__.py`, `cli.py` and `install.py`, read on 2026-10-01, outside this repository. Not re-derived here.

> **Amended 2026-10-02 by D-27.** Item 4's reason no longer holds as written: the policy now holds the settings of single tools too, in `tools/policy/tool-settings.json`. The list stays in the guard. D-27 moves no constant an earlier decision kept out of the policy, and moving this one is a decision of its own.

> **Amended 2026-10-04 by D-35.** The loss "It reads graphify 0.9.73's command line by position, and that release's help guard" no longer stands as written: `graphifyVersionMeans` is retired with its key, and the comment above the `pypi:graphifyy` pin in `mise.toml` names `GRAPHIFY_ERODING` and `GRAPHIFY_HELP`, and what of graphify to re-read for them, among what is checked before the pin moves.

> **Amended 2026-10-04 by D-35.** Items 2 and 3's `npm run code-graph` runs as `mise run code-graph`, and the guard's refusal names it so, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-24 · The co-change map of merged pull requests is committed, pinned to a trunk commit that only its `:update` moves

**Recorded 2026-10-02**, carried by `asdlc-openspec-3oln`. On 2026-10-02 the maintainer asked for a machine-readable map of the files that change together in this repository's pull requests, saved under `artifacts/`, for lane partitioning and for decomposition. They chose a committed map pinned to a recorded trunk commit over a local, gitignored one, and the emitter in one pull request with the fan-out wiring in a follow-up, `asdlc-openspec-gtjp`. Each choice was put with the case where its recommendation loses.

**Builds on / amends:** builds on D-03, which puts the emitter's thresholds in `tools/policy.json`, and on D-07, whose rebase merge (`prReviewMergeMethod`) lets a merged pull request be read from git alone, and which leaves a pull request that changes this register to a person. Builds on D-20 without amending it: D-20 refused to commit a graph that every change rewrites, and no ordinary change rewrites this map. It amends nothing.

**Decision.**

1. **`tools/coupling/coupling.ts` writes the co-change map, `artifacts/coupling/cochange.json`, from git history alone.** It reads one unit per pull request merged to `main`: a run of rebased commits that share a merger's committer address and time, with the files the run changed, each named as it is at the baseline. The header of `tools/coupling/coupling.ts` holds the rules, and the eight `coupling*` keys of `tools/policy.json` hold the thresholds.
2. **The map is committed, and records the one trunk commit it is read through, `throughCommit`.** `npm run coupling` re-derives it through that commit and never moves it; only `npm run coupling:update` moves it, to `origin/main`. Regenerating every derived artifact before a pull request, as `CLAUDE.md` § The gate ladder asks, leaves the map's bytes as they were.
3. **`coupling:check` is a pre-push job and a CI step.** Its verdict is a pure function of committed files and of trunk history through a commit that is never rewritten. It refuses a baseline off `origin/main`'s first-parent chain, and prints, without failing, how many pull requests landed after it.
4. **No prompt reads the map yet.** Wiring it into `.claude/agents/fan-out-work.md` § 2 is `asdlc-openspec-gtjp`, which also settles how a derived map may steer dispatch under `CLAUDE.md` § A program proposes; only a person promotes.

**Why.** Fan-out decides by hand which ready issues can share a lane, and its overlap kinds see only the files each issue is predicted to touch: a file that habitually changes beside them is found when two lanes conflict at cherry-pick. A committed map that every pull request regenerated through `origin/main` would rewrite itself in each of them, and two open pull requests would conflict on it, the reason D-20 gives for not committing its graph. Pinned, it is generated output with a `:check` twin, and only a deliberate `coupling:update` rewrites it. Three alternatives lost:

- **A local, gitignored map built at dispatch.** It would always be current. But nothing would hold it to its emitter, no diff would show how the coupling moves, and a reader who only reads files, a reviewer among them, would find none.
- **Reading pull requests from GitHub's API.** It names each pull request, but a check that reads the network runs in no pre-push job and no CI step (`CLAUDE.md` § The gate ladder).
- **Grouping commits by the issue ids their subjects end with.** A direct push and a pull request that carry the same issue would read as one, and a commit naming no issue would be lost.

Where it loses:

- **The map lags the trunk between updates.** A file added after the baseline has no edges, so two issues coupled only through it look independent until someone runs `coupling:update`.
- **It reads rebase merges only.** The check refuses a merge commit and a `prReviewMergeMethod` other than `rebase`, but a squash merged by hand reads as a direct push, and a direct push made with a GitHub noreply address reads as a pull request.
- **Two pull requests merged by one address in one second read as one.** D-07 merges one at a time, which makes that unlikely, not impossible.
- **A rename that also rewrites more than half the file** starts its history again at the new name, and a sweep of `couplingMaxUnitFiles` files or fewer is counted, its unrelated files coupled.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound.
- **`tools/coupling/coupling.ts` and `tools/coupling/selftest.ts`:** new, with their row in `tools/README.md`.
- **`artifacts/coupling/cochange.json`:** new, written by `npm run coupling:update` through `f862fe0`.
- **`tools/lib/git-env.ts` and `tools/lib/committed.ts`:** `gitIn`, `gitOk` and `SCRATCH_GIT_ENV` in the first, and `readText` and `firstDifference` in the second, new, all moved from `tools/trace/trace.ts`, which with `tools/trace/selftest.ts` now imports them; `gitIn`'s runner takes a standard input. `scripts/fresh-run.mjs` copies `tools/lib/committed.ts` into its selftest's fixture beside trace.
- **`tools/policy.json`:** the eight `coupling*` keys, each with its `Means`, and `describes`, `gatedBy` and `provenance` naming them.
- **`package.json`:** `coupling`, `coupling:check`, `coupling:selftest` and `coupling:update`; `scripts/check-jobs.mjs` declares the bare emitter and the `:update`.
- **`git-hooks.yml` and `.github/workflows/verify.yml`:** the `coupling-check` and `coupling-selftest` jobs and their steps.
- **`scripts/hooks/_shared.mjs`:** the map's redirect row, which the in-session guard and the pre-commit hook read. `scripts/assert-not-hand-edited.mjs` and `scripts/hooks/check-emitted-drift.mjs` say why they have no row for it: neither has a selftest to hold one to.
- **`README.md`:** § How it is laid out, the `### coupling` sub-section of § The npm scripts, a row in § The guardrails and two in § What runs automatically.
- **`count-index.md` § Rates and metrics:** a pair's co-change and a file's hub share.

**Figures.**

- 93 merged pull requests through `f862fe0`, and 18 direct pushes: `npm run coupling:check` prints the first, and the map's `excluded.directCommits` is the second. GitHub's list of the pull requests merged to `main` agreed with the units one for one on 2026-10-02; the pull request that carries this entry gives that check, which reads the network and is not re-derived here.
- Every figure behind a threshold: the `Means` of its key in `tools/policy.json`, each measured through `f862fe0`.
- 0.47-0.50 s for `coupling:check` and 7.98-11.81 s for `coupling:selftest`: their jobs' comments in `git-hooks.yml`, which name the host.

> **Amended 2026-10-02 by D-25.** `scripts/hooks/check-emitted-drift.mjs` is deleted, so of the two files "What changed" names as saying why they have no row for the map, only `scripts/assert-not-hand-edited.mjs` remains. No hook re-runs `coupling:check` in session. It holds the map at pre-push and in CI, as before.

> **Amended 2026-10-04 by D-35.** Item 2's `npm run coupling` and `npm run coupling:update` run as `mise run coupling` and `mise run coupling:update`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-25 · The emitter-drift hook is retired, its list of triggers empty

**Recorded 2026-10-02**, carried by `asdlc-openspec-ehk5`. On 2026-10-02 the maintainer asked whether `scripts/hooks/check-emitted-drift.mjs` did anything with no triggers, and whether anything argued against retiring it. Shown that it did nothing and that nothing argued for it, they asked for it to be retired.

**Builds on / amends:** amends D-06 and D-24, whose records name the hook as live. Builds on D-24 item 3, which holds the co-change map at pre-push and in CI.

**Decision.** `scripts/hooks/check-emitted-drift.mjs`, the `PostToolUse` hook on Write and Edit, is deleted outright (`docs/retired/README.md` § The three dispositions, *Delete it outright*). Its one registration leaves `.claude/settings.json`, which then registers no `PostToolUse` hook. No emitter's `:check` runs in session; each still runs at pre-push and in CI.

**Why.** Its `TRIGGERS` array was empty, so every run exited 0 having checked nothing. Every emitter had left it or been left out:

- the learning loop's row left with the loop (D-06);
- the trace record's inputs had none on purpose: `trace:check` also refuses a scenario still owed a test, so it would fail after nearly every edit to a spec or a test while a change is written;
- the co-change map's row was added in `55b5dca` and removed in `1a998fd`, because the hook had no selftest to hold a row to.

Yet the settings file started it on every Write and Edit under the status "Re-checking emitted-output drift". Three README rows said it re-ran the `:check` twin of any emitter whose input was just edited. The tables named a guardrail that nothing provided. Its cost per run was not the reason (Figures). One alternative lost:

- **A selftest for the hook, and the co-change map's row restored.** An edit to `tools/coupling/coupling.ts` or a `coupling*` key of `tools/policy.json` would then be reported at the edit. No open issue asked for it, and `coupling:check` already holds the map at pre-push and in CI, as `trace:check` holds the trace record.

Where it loses:

- **An emitter edit not followed by its re-run is found at push, not at the edit.** A session that edits `tools/coupling/coupling.ts` and goes on without `npm run coupling` learns of it from the pre-push `coupling-check` job, under every edit made since. That was already true with the empty hook. Against the alternative above, it is what this entry gives up.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendments under D-06 and D-24.
- **`scripts/hooks/check-emitted-drift.mjs`:** deleted.
- **`.claude/settings.json`:** the `PostToolUse` block, the hook's one registration, is removed.
- **`count-index.md`:** the `CNT-HOOKS` value, one registration fewer, as `npm run counts:check` re-derives it.
- **`README.md` § What runs automatically, `.claude/README.md` § The hooks and `scripts/hooks/README.md`:** the hook's row in each is removed.
- **Left as they are:** `artifacts/coupling/cochange.json`, generated output pinned to `f862fe0`, where the hook still exists, names it among the files it read. Once `coupling:update` moves its baseline past this entry's commit, the hook is a file absent at `throughCommit`, whose changes the header of `tools/coupling/coupling.ts` says are dropped. `scripts/hooks/_shared.mjs` keeps `npmRun`, which `gate-summary.mjs` calls.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads it.** `git grep -n -i -E "check-emitted-drift|emitted-output drift|PostToolUse"` finds this entry and its table row, the records of D-06 and D-24, D-24's amendment, and the generated `artifacts/coupling/cochange.json`.
- **Every live reference, and what became of it.** The registration in `.claude/settings.json` and the three README rows are removed, and `CNT-HOOKS` is re-derived. None is repointed or marked: no live file needs the hook's lineage.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- scripts/hooks/check-emitted-drift.mjs` names the deleting commit. `git show <that commit>^:scripts/hooks/check-emitted-drift.mjs` recovers the file, and `git show <that commit>^:.claude/settings.json` its registration.
- **Its return is not refused by a gate.** Review holds it. `1a998fd` removed the last row because the hook had no selftest to hold it to.

**Figures.**

- An empty `TRIGGERS`: lines 31 to 39 of `git show 2660d32:scripts/hooks/check-emitted-drift.mjs`.
- 0.03-0.04 s wall per run with empty input, three runs on 2026-10-02 on a macOS 26.7.1 laptop (Apple M3 Max) with Node 26.8.1: `/usr/bin/time -p node scripts/hooks/check-emitted-drift.mjs` at `2660d32`.
- Seven hook registrations at `2660d32` and one fewer after this entry: the `hooks` arrays of `git show 2660d32:.claude/settings.json`, and `npm run counts:check` for the current tree.
- The map's row, added in `55b5dca` and removed in `1a998fd`: `git log --format="%h %s" -G "gates: \['coupling:check'\]" -- scripts/hooks/check-emitted-drift.mjs` lists those two and no other.

### D-26 · The harness assessment is split by what each half reads, reports and enforces nothing, and takes its repository's specifics from one record

**Recorded 2026-10-02**, carried by `asdlc-openspec-o6w1`. On 2026-10-02 the maintainer brought an untracked script a contributor wrote, which held the hook jobs' globs and the harness's wiring against the local code graph, with the contributor's own list of what it assumed. The maintainer asked how D-24's co-change map could be combined with that graph, and for a proposal that took in the script and widened what it could see along the glob axis. They approved the proposal, which put each choice with the case where it loses, and asked for it to be filed and worked.

**Builds on / amends:** builds on D-24, whose map is an input and whose `couplingMinSampleUnits` and `couplingClusterMinJaccardPermille` the assessment reads from `tools/policy.json` rather than copying; on D-20, whose local graph the graph half reads as `scripts/code-graph.mjs` does, as a person's command and never a session's, and beside which it writes a second local file, leaving the registered server on `graph.json`; and on D-19, whose job file it reads in the runner's schema. It amends nothing.

**Decision.**

1. **The core, `tools/harness/harness.ts` (`npm run harness`), reads only committed files and the map.** It writes a dated report, JSON and Markdown, under `.scratch/harness/`, never committed. The report holds each hook job's glob to its inputs by kind: what its entry imports, the manifest and lockfile of a package it imports, what it reads from the checkout, what a script it launches imports, the file its check twin compares, what its comment names. It also holds each gate a README table names to some registration, and each script to both the pre-push and the CI tier unless the CI file declares otherwise. Each item has a stable key and a level: a finding rests on exact evidence, a lead on a heuristic, a note on a declaration. Its header gives the rules and each check's limits.
2. **The graph half, `tools/harness/graph.py` (`npm run harness:graph`), is standard-library Python run through `scripts/python.mjs`.** It reads the core's report, the local graph and the map, reports the graph's freshness, the co-change pairs it has no edge for and the map's clusters against its communities, and writes one combined graph: the wiring and the co-change edges in graphify's ids, each pair in both directions, under a relation and a context of their own, with `multigraph` true. It refuses to write a combined graph that would lose an edge in graphify's loader or hide a pair from one end. It never writes the graph and runs no graphify command.
3. **Neither command runs in a job; `harness:selftest` does, at pre-push and in CI.** The selftest plants one gap per case in fixture repositories beside a control that reports nothing, then runs the graph half's own selftest. CI installs a Python 3 beside its step, as `scripts/python.mjs`'s header says it does.
4. **Every repository-specific fact both halves read is in `tools/harness/harness.config.json`**, a self-describing record with a `Means` for each constant (`CLAUDE.md` § Three kinds of file, and never a fourth), or named there where another file already holds it: the path roots as `scripts/check-jobs.mjs`'s constant, the map's thresholds and graphify's file types as keys of `tools/policy.json`. Pointing the assessment at another harness built from the same kinds of parts (npm scripts, a job file in lefthook's schema, GitHub Actions workflows, Claude Code's settings) changes that file and no code.
5. **What its first report found is fixed where the issue already changed the file:** five job globs in `git-hooks.yml` gained the manifest, the lockfile, `.vale.ini` or `.gitignore`, and the CI file's absent block names `worktree:selftest`. The one finding left, a gate nothing runs, was already `asdlc-openspec-b1b`.

**Why.** The script found two gaps along the axis it was built for, and it could not see most of the rest. It read every input through the code graph, so a file a job reads at run time, a lockfile and a launched script were invisible. Its glob matcher approximated `path.matchesGlob`, and it counted package nodes as deleted files, so it called every graph stale. Splitting by what each half reads is `CLAUDE.md` § The gate ladder applied to the tool: the core needs nothing a fresh clone lacks, and the graph half needs what only a person's machine has. Five alternatives lost:

- **Keeping the untracked script.** Nobody else could run it or trust it, and its contributor named its missing selftest among its gaps.
- **One Node script for both.** The check that a combined graph loads without loss needs graphify's own loader, which is Python, so the graph half would shell out to Python regardless.
- **One Python script for both.** The core would match globs by a copy of Node's rules rather than Node's, read YAML through a dependency graphify's own interpreter lacks, and need a Python toolchain on every machine before any of its checks could become a gate.
- **Making the core a gate now.** Its first run gave three read leads, two of them real; a gate that fails on the third is a gate people push past with `--no-verify`. Promoting a check is a person's decision on the evidence the reports leave (`CLAUDE.md` § A program proposes; only a person promotes).
- **Its constants in `tools/policy.json`.** That file holds the workflow's constants that belong to no one tool (D-03). These belong to one tool, and they are what changes when it is pointed at another harness.

Where it loses:

- **The repository tracks its first Python file.** The selftest's job now needs a Python 3 on every machine that pushes, and fails, as `scripts/python.mjs` rules, where none is found; CI pays a `setup-python` step, and the dev container image installs one.
- **The loader check leans on graphify's private `graphify.serve._load_graph`.** A release that renames it turns the check into a skip, which says so; `graphifyVersion` moving is the moment to look, as D-20 asks for graphify's other internals.
- **The core reads code by pattern, not by parsing.** A computed import, a path built at run time, a read through a parameter and a launch from a table are invisible or leads, as its limits say. A read made only in a mode the job does not run is over-reported: one of the first run's three read leads.
- **A finding waits for someone to run it.** Nothing runs `npm run harness` on a schedule, so a glob can drift between reports.
- **A session's code-graph queries never see the co-change edges.** The registered server serves `graph.json`, and `scripts/code-graph.mjs` points it back there on every build; a person serves the combined graph with `--graph`.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound.
- **`tools/harness/harness.ts`, `tools/harness/graph.py`, `tools/harness/selftest.ts` and `tools/harness/harness.config.json`:** new, with their row in `tools/README.md`.
- **`package.json`:** `harness`, `harness:graph` and `harness:selftest`; `scripts/check-jobs.mjs` declares the first two as operator commands.
- **`git-hooks.yml`:** the `harness-selftest` job; `package-lock.json` in the globs of `check-jobs` and `check-jobs-selftest`, `package.json` and `package-lock.json` in those of `pr-review-check` and `pr-review-selftest`, and `.vale.ini` and `.gitignore` in that of `worktree-hooks`, each comment saying why.
- **`.github/workflows/verify.yml`:** `actions/setup-python@v5` and the `harness:selftest` step; `worktree:selftest` named in the absent block.
- **`README.md`:** the `### harness` sub-section of § The npm scripts, a row in § The guardrails, a row in § What runs automatically and the three rows whose jobs' globs widened, `.scratch/`'s line, and a Python 3 in each platform's list in § Setup.
- **`.devcontainer/Dockerfile`:** `python3` among the base packages.
- **`count-index.md` § Rates and metrics:** the jobs a file fires per hundred pull requests.

**Figures.**

- 8 findings, 11 leads and 5 notes over 42 jobs before the globs widened, and 1 finding, 9 leads and 6 notes over 43 jobs after: `npm run harness` at this change's head, and the same over a copy of it through `HARNESS_ROOT` with `git-hooks.yml` and `.github/workflows/verify.yml` as `2660d32` has them.
- 25 pre-push globs that match `tools/policy.json`, against the 20 the untracked script counted: the core's hubs table; the 20 is from that script's report of 2026-10-01, outside this repository.
- 84 links lost, 12 of them imports, when the map was added to the maintainer's graph with `multigraph` false: a prototype run on 2026-10-02 against a graph built at `f862fe0`, outside this repository, not re-derived here.
- 82 checks in the core's selftest and 38 in the graph half's, 39 under graphify's own interpreter, and 5.48-5.60 s for the job: `npm run harness:selftest`, and the job's comment in `git-hooks.yml`, which names the host.

> **Amended 2026-10-02 by D-27.** The four keys item 4 names are in `tools/policy/tool-settings.json`, and the references in `tools/harness/harness.config.json` name that record. The alternative *Its constants in `tools/policy.json`* lost for two reasons, and the first no longer holds, since the policy now holds the settings of single tools too. The second keeps the record beside the tool: its constants are what changes when the assessment is pointed at another harness.

> **Amended 2026-10-02 by D-28.** Item 2's combined graph records the git blob id of the graph it combines, and a run from the checkout that holds that graph, with no `--graph`, writes it beside the graph, in the file `graphifyCombinedGraphFile` names; any other run writes it beside the graph half's report, as before, under that name. The loss "A session's code-graph queries never see the co-change edges" now holds only between a build of the graph and the next run of the harness and of `npm run code-graph:mcp`.

> **Amended 2026-10-03 by D-31.** The Python 3 the selftest's job needs is the one `mise.toml` pins, which every machine set up from `README.md` § Setup, CI and the dev container install through mise. The loss "CI pays a `setup-python` step, and the dev container image installs one" now reads: mise installs it beside the rest of the toolchain, and `check:toolchain` refuses a second install of it.

> **Amended 2026-10-03 by D-33.** Items 2 and 3 run the graph half with `python`, the Python 3 `mise.toml` pins, through mise's shims, and `scripts/python.mjs` is deleted. The loss "The repository tracks its first Python file" now reads: where no `python` runs, the selftest's job fails and names mise's shims.

> **Amended 2026-10-04 by D-35.** The loss "The loader check leans on graphify's private `graphify.serve._load_graph`" names `graphifyVersion` moving as the moment to look. That key is retired, and the moment is the `pypi:graphifyy` pin in `mise.toml` moving.

> **Amended 2026-10-04 by D-35.** Items 1 and 2's `npm run harness` and `npm run harness:graph` run as `mise run harness` and `mise run harness:graph`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-27 · The policy is split under `tools/policy/` by who may change each key and who reads it, read through one loader and held by a gate of its own

**Recorded 2026-10-02**, carried by `asdlc-openspec-umg3`. On 2026-10-02 the maintainer asked whether the name "policy" fits `tools/policy.json`'s reason for being, and then which logical splits its contents support. Shown the seams with the case where each loses, they approved a plan for five records and asked for it to be built. Asked, they named the first two records `vocabulary.json` and `agent-workflows.json`, kept the single-tool settings in one record rather than one beside each tool, and made the word budgets a table in this change.

**Builds on / amends:** amends D-03, whose decision made `tools/policy.json` the policy file, for constants that belong to no one tool; D-07, whose item 4 decides by the `prReview*` keys of that file and whose floor held them to a person key by key; D-23, whose item 4 kept the guard's graphify list out of that file because it held only constants that belong to no one tool; and D-26, whose assessment names four keys of that file and which gave the same reason for keeping its own record. Builds on D-12, under which `CLAUDE.md` was consolidated before it took the table's sentence, and on D-07, which leaves a pull request that changes `CLAUDE.md`, this register or a word budget to a person.

**Decision.**

1. **The policy is five records under `tools/policy/`**, split first by who may change a key and then by who reads it. `tools/policy/README.md` has a row per record.
   - `pr-review.json`, the `prReview*` keys, and `prompt-budgets.json`, every prompt's word budget, are a person's to merge: `prReviewHighRiskPaths` names both, whole, and the loader they are read through.
   - `tool-settings.json` holds the settings of single tools: the coverage and mutation gate, the worktree sweep, the hook runner's output, the fresh run's deadline, the local code graph, the co-change map and the citation-support check.
   - `vocabulary.json` holds the spellings every stage of the workflow agrees on, and `agent-workflows.json` the sizes and bounds of the agent workflows. The `promptReview*` keys stay together there, because the prompt reviewer fetches them by prefix.

   Every key keeps its name, its value and its `Means`, except as items 2 and 3 say. An entry recorded before this one that names `tools/policy.json` means the record that now holds the key it names.
2. **The `promptWordBudget*` keys are one table, `promptWordBudgets`, keyed by each prompt's path**, each row the budget (`words`) and its reason (`means`), the reason its key's `Means` gave. The one reason that named another budget's key, `.claude/workflows/build-change-task.js`'s, names that budget's row instead. `CLAUDE.md` § Three kinds of file, and never a fourth now says a table keyed by what it governs carries each row's reason in the row. `check:prompts` looks a budget up by the path it governs and refuses a row that names no prompt; it builds no key name.
3. **Four values changed with the move.** `prReviewHighRiskPaths` gained the two records a person merges and the loader the reviewer reads its floor through, and `prReviewHighRiskJsonKeys` lost its entry for `tools/policy.json`; `pr-review:check` refuses a floor that stops covering any of the three. `prReviewContextPaths` names `tools/policy/**`. `typesafeModelMeans` says the TypeSafe helper takes its model from its caller, as it did.
4. **Every reader reads through `tools/lib/policy.ts`**, which merges the records and refuses a key two of them define, so a key can move between records with no reader changing. `node tools/lib/policy.ts <key>...` prints keys for a prompt or a workflow's command, and a fixture copies and doctors the records through it. The harness reads its four keys through its record's references, which now name `tools/policy/tool-settings.json`.
5. **`check:policy` holds the records**: each one's five header fields, a `Means` beside every constant, no `Means` without its constant, no key in two records, the README naming every record and no other, nothing else in the directory, and no `tools/policy.json` back beside them. `check:policy:selftest` asserts each refusal's reason beside an undoctored copy. Both run at pre-push and in CI.
6. **`tools/policy.json` is deleted outright** (`docs/retired/README.md` § The three dispositions, *Delete it outright*). Constants an earlier decision kept out of it stay where they are: the guard's graphify list (D-23) and the harness's own record (D-26).

**Why.** The file said it held the constants that belong to no one tool and no rule, and it held four kinds of key in one namespace. Thirty-one were settings of single tools, each read by one script and its selftest, four of them by the harness as well. No code read its header fields, and each gate held the `Means` of only the keys it read. It held the reviewer's keys and the budgets to a person key by key, because, as that key's `Means` said, the whole file was too wide. Four alternatives lost:

- **Two files, shared constants and policy**, the split the maintainer first proposed. A split by kind alone breaks the two groups that must stay whole: the `prReview*` keys mix spellings with the floor the reviewer protects, and the reviewer fetches the `promptReview*` keys by prefix.
- **A record beside each tool**, as D-26 gave the harness. Seven records of five header fields each, and the tunables of the workflow in seven directories.
- **Keeping the budget keys and deferring the table.** The gate would go on building a key name from each path, and a budget would stay two keys.
- **Readers that each open one record by its path.** A key that moved would read as absent, and each reader would fall back to a default or skip.

Where it loses:

- **Every reader reads every record**, so a malformed `tool-settings.json` stops `check:prompts` as well as the tools it configures, and each job's glob names the whole directory.
- **A tool's settings are not beside it.** Whoever edits `tools/coupling/coupling.ts` must know its thresholds are in `tools/policy/tool-settings.json`, and the repository has two patterns for single-tool constants, this one and the harness's.
- **Prose names a record**, so a key that moves between records leaves a stale path in prose, which no gate reads.
- **Five headers to keep true**, where there was one.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendments under D-03, D-07, D-23 and D-26.
- **`tools/policy/`:** new, five records and a README, from `tools/policy.json` at `962358c`. **`tools/policy.json`:** deleted.
- **`tools/lib/policy.ts`:** new, the loader, with its row in `tools/README.md`, where the `policy.json` row became the `policy/` row.
- **`scripts/check-policy.mjs`:** new, the gate; `check:policy` and `check:policy:selftest` in `package.json`, each a pre-push job in `git-hooks.yml` and a step in `.github/workflows/verify.yml`, with their rows in `README.md` and `scripts/README.md`.
- **`scripts/check-prompts.mjs`:** reads the budgets by path; `budgetKey()` is gone; `--counts` prints each prompt's words and budget.
- **`scripts/pr-review.mjs`:** reads the policy through the loader, holds the floor to the two records, and shows the counts when the budgets' record changes.
- **The readers, onto the loader:** `scripts/check-beads.mjs`, `scripts/check-openspec.mjs`, `scripts/check-test-inventory.mjs` (at HEAD, through `readPolicyAt`), `scripts/check-thresholds.mjs`, `scripts/test-trace.mjs`, `scripts/run-tests.mjs`, `scripts/fresh-run.mjs`, `scripts/git-hooks.mjs`, `scripts/hooks/guard-git.mjs` (which loads it only when a command applies a label), `scripts/prune-worktree-branches.mjs`, `scripts/code-graph.mjs`, `tools/trace/trace.ts`, `tools/citations/support.ts`, `tools/coupling/coupling.ts`, the three workflows under `.claude/workflows/` and `scripts/workflows.selftest.mjs`. The selftests and fixtures that copied or doctored the file copy and doctor the records through `copyPolicy` and `editPolicy`, or write records of their own.
- **`tools/harness/harness.config.json`:** its four references name `tools/policy/tool-settings.json`, and `tools/harness/graph.py`'s selftest writes the record each names.
- **`artifacts/coupling/cochange.json`:** its banner names the records, regenerated by `npm run coupling` with its baseline unmoved.
- **`git-hooks.yml`:** every glob that named `tools/policy.json` names `tools/policy/**`, and the loader where the glob held no `tools/lib/`.
- **`CLAUDE.md`:** consolidated first, in a commit of its own (", with its reason beside it," in § Three kinds of file, and never a fourth, which the sentence before it states); then the table's sentence, with "Either way," so the section's failure clause holds for both forms, and five references repointed. Its budget rises by the 11 words the consolidation did not free.
- **The skills and agents that cite a key:** each names the record that holds it, token for token, so no other prompt's count moved. `.claude/agents/continuous-prompt-improvement.md` reads the trunk's `promptReview*` keys from `tools/policy/agent-workflows.json`, and two of its sentences were re-split for Vale with no change in count.
- **`README.md`, `.claude/README.md`, `scripts/README.md`, `scripts/hooks/README.md`, `openspec/README.md`, `count-index.md`, the two READMEs under `apps/calculator/test/independent/`, `.github/workflows/pr-review.yml` and `verify.yml`:** each reference repointed.
- **Left as they are:** `artifacts/coupling/cochange.json`, generated output pinned to `f862fe0`, where the file still exists; `docs/playbook.md` and `docs/test-strategy.md`, dated documents that stay true about their dates; and `couplingHubMinPercentMeans`, a measurement through `f862fe0` that names the file among the hubs.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads it.** `git grep -n -F "tools/policy.json"` finds this register, the records' provenance and headers and the comments that say the file was split, `check:policy`'s refusal of its return, and what *Left as they are* names above.
- **Every live reference, and what became of it.** Each is repointed to the record that holds the key it names, or to `tools/policy/` where it meant the whole policy. None is marked: no live file needs the file's lineage, which each record's `provenance` gives.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- tools/policy.json` names the deleting commit, and `git show <that commit>^:tools/policy.json` recovers the file.
- **Its return is refused by a gate.** `check:policy` refuses `tools/policy.json` beside the records, since a key added there would reach no reader.

**Figures.**

- 104 data keys at `962358c`, the keys of `git show 962358c:tools/policy.json` less its five header fields and each `Means`; and 10, 25, 10 and 31 constants and 28 rows in `vocabulary.json`, `agent-workflows.json`, `pr-review.json`, `tool-settings.json` and `prompt-budgets.json`, each record's keys less its header and each `Means`, and the rows of `promptWordBudgets`.
- 172 values and reasons unchanged and 9 differences, each one item 2 or 3 names: the one-off comparison of the records with `git show 962358c:tools/policy.json` that the pull request's body gives.
- `CLAUDE.md` at 3,234 words, 3,229 after its consolidation and 3,245 after the table's sentence; `.claude/workflows/build-change-task.js` at 4,001 words and 3,997 after its Setup and inputs commands read through the loader, run with `--no-warnings`: `node scripts/check-prompts.mjs --counts` at `962358c`, at the consolidation's commit and at this entry's.
- 0.09 s wall for `check:policy` and 0.12 s for its selftest, through `node --run` (`/usr/bin/time -p`, one run each) on a macOS 26.7.1 laptop with Node 26.8.1, 2026-10-02.

### D-28 · The code-graph server serves the harness assessment's combined graph while it was built from the graph beside it

**Recorded 2026-10-02**, carried by `asdlc-openspec-fot7`. On 2026-10-02 the maintainer, given D-26's follow-ups, chose "code-graph serving the combined file when one exists": the graph half writing the combined graph into the graph's folder, and `scripts/code-graph.mjs` registering the server on it there. Serving it only while it was built from the graph beside it is this entry's session's choice, stated to the maintainer when the work began and written into the issue with the case where it loses. Writing it beside the graph only from the checkout that holds the graph is the maintainer's choice, made before the push once the session's review found a worktree's run serving that branch's wiring; the issue's criterion 1 records it.

**Builds on / amends:** amends D-20, whose script registered the server on `graph.json` alone, and D-26, which wrote the combined graph beside its report and named among its losses that a session's code-graph queries never see the co-change edges. Builds on D-27, whose split puts the new key in `tools/policy/tool-settings.json` and the skill's budget in `tools/policy/prompt-budgets.json`; on D-12, under which the `code-graph` skill was consolidated before its edit; and on D-07, which leaves a change to this register or a word budget to a person.

**Decision.**

1. **`tools/harness/graph.py`, run from the checkout that holds the graph with no `--graph`, writes the combined graph beside it**, in the file `graphifyCombinedGraphFile` in `tools/policy/tool-settings.json` names, and records in it the git blob id of that `graph.json`, under the field `graphifyCombinedGraphBlobField` names. Run from a linked worktree, whose wiring and map are its branch's, or with `--graph`, it writes the file beside its report, not served, and says so. Its report stays under `.scratch/harness/<date>/`.
2. **`scripts/code-graph.mjs` registers the MCP server on that file while the blob id it records is the `graph.json` beside it**, and on `graph.json` otherwise, printing which and why, after a build and on `npm run code-graph:mcp` alike. A build that registers nothing, with `--no-mcp` or because it failed, says that the server may still be on the combined graph of the build before.
3. **The `code-graph` skill tells a session what the added edges are**: a co-change edge counts pull requests that changed both files, not a dependency, and a wiring edge is what the harness declares, each named by the key of `tools/harness/harness.config.json` that holds its relation or context. It was consolidated first, and its budget raised by what that did not free.

**Why.** The combined graph is what combining the co-change map with the code graph was for, and D-26 left it to a person running graphify with `--graph`. The blob id keeps a rebuild that registers from being hidden: a build rewrites `graph.json`, and a combined graph of the build before would answer with files the new build dropped and without those it added, and nothing would say so. Three alternatives lost:

- **Serving the combined file whenever it exists.** Simplest, and what the maintainer's words described. It loses on the first build after a harness run, as above.
- **`code-graph` running the harness after each build.** Always current. But a build would then need a Python 3, the day's core report and the map, and could fail for reasons that have nothing to do with graphify.
- **A second registered server for the combined graph.** Both graphs always served. But every session would load two servers' tools, and the skill would have to say which to ask, in words its budget does not hold.

Where it loses:

- **After every build that registers, the server is on the plain graph** until `npm run harness`, `npm run harness:graph` and `npm run code-graph:mcp` run again: three commands a person must remember, which `code-graph` prints each time. A build with `--no-mcp`, or one that fails, leaves the server where it was, possibly on the combined graph of the build before, and only warns.
- **A worktree cannot refresh the served graph.** Its run writes beside its report, so the served combined graph moves only when the harness runs from the checkout that holds the graph, after a pull.
- **The combined graph's wiring and co-change edges are as of the core report's date and the map's baseline**, which the blob id does not hold; only the graph's own build is checked.
- **A co-change edge carries graphify's `EXTRACTED` confidence**, which the skill's rule for guesses does not reach; the skill's sentence is the one guard against reading it as a dependency.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendments under D-20 and D-26.
- **`scripts/code-graph.mjs`:** `servedGraph` and `blobId`, the registration through them, a registration's argument compared whole, the warning after a build that registers nothing, the header, and ten selftest cases and a control check, with its row in `scripts/README.md`.
- **`tools/harness/graph.py`:** the combined graph beside the graph, with the graph's blob id; the wiring edges' context and the blob's field read from the config and the policy; its header, banner and selftest. **`tools/harness/harness.config.json`:** `combinedGraphPolicy`, `combinedGraphBlobPolicy` and `wiringContext`; `reportDirMeans` and `cochangeRelationMeans` corrected; `gatedBy`, `whatItDoesNOTDo` and `provenance` naming them.
- **`tools/policy/tool-settings.json`:** `graphifyCombinedGraphFile` and `graphifyCombinedGraphBlobField`, each with its `Means`; `describes`, `whyThisFileExists`, `gatedBy` and `provenance` naming it; and the record's row in `tools/policy/README.md`. **`tools/policy/prompt-budgets.json`:** the `code-graph` skill's row from 283 to 297.
- **`.claude/skills/code-graph/SKILL.md`:** consolidated in two commits, then the sentence on the added edges.
- **`git-hooks.yml`:** the comments of `code-graph-selftest` and `harness-selftest`, re-measured.
- **`README.md`:** the `code-graph`, `code-graph:mcp`, `code-graph:selftest` and `harness:graph` rows; **`tools/README.md`:** the `harness/` row.

**Figures.**

- 283 words to 266 by the first consolidation and 255 by the second, and 297 with the sentence: `node scripts/check-prompts.mjs --counts` at each commit. The two consolidations freed 28 words, and the sentence adds 42.
- 42 checks in `code-graph:selftest` and 24.96-25.15 s for its job; 82 and 48 checks in `harness:selftest`, 49 under graphify's own interpreter, and 5.67-6.33 s for its job: each run, and the jobs' comments in `git-hooks.yml`, which name the host.

> **Amended 2026-10-04 by D-35.** Item 2's `npm run code-graph:mcp` runs as `mise run code-graph:mcp`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-29 · An issue's type and priority are the first rows of a rubric in the policy that fit it, and `beads:check` refuses a type the rubric does not name

**Recorded 2026-10-03**, carried by `asdlc-openspec-6g6w`. On 2026-10-03 the maintainer chose each part from recommendations put with the case where each loses. They chose seven types over the recommended four, and the other three as recommended: a priority scale by what leaving an issue undone costs, a gate on the type alone, and no bulk re-triage of the issues already filed. The rows' wording is this entry's session's, shown to the maintainer before the work began.

**Builds on / amends:** builds on D-02, whose item 3 makes a change's epic and is the rubric's first row; on D-06, whose labels the found-issue command already carries; on D-11, whose rule 4 of `beads:check` the new rule 5 follows; on D-27, which puts a spelling every stage reads in `tools/policy/vocabulary.json`; and on D-12, under which `CLAUDE.md` was consolidated before its edit. It amends none: no entry decided a type or a priority beyond D-02's epic.

**Decision.**

1. **Seven types, tried in order, the first that fits winning:** epic, decision, bug, spike, feature, chore, task. They are `issueTypes` in `tools/policy/vocabulary.json`, each row saying when it applies. An epic is only `change-propose`'s to set. A bug is a wrong result a command shows, a document that contradicts the code included. A chore changes no behaviour and no rule. A task is what the other rows leave.
2. **Five priorities, each defined by what leaving the issue undone costs:** 0, work cannot proceed; 1, a safeguard fails silently; 2, planned work, `bd`'s default; 3, found on the way with nothing breaking while it waits, and the default for an issue filed `discovered-from`; 4, someday. They are `issuePriorities` in the same record, tried from 0 down.
3. **`CLAUDE.md` § The task store says an issue takes the first rows that fit,** and that a session that works or notes an issue moves it to the rows that fit, with a note naming them. No issue already filed is retyped or re-ranked in bulk.
4. **`foundIssueCommand` carries `-t` and `-p`,** so a found issue is filed with both rather than taking `bd`'s defaults.
5. **`npm run beads:check` refuses an issue that is not closed whose type no row names** (rule 5 of `scripts/check-beads.mjs`), reading the types from the policy and spelling none. It refuses a policy without the key, or with a row that names no type. `npm run beads:selftest` holds each refusal. Nothing holds an issue's priority.

**Why.** Before this entry nothing said which type or priority an issue takes. Only `change-propose`, with `-t epic`, and `should-i-adopt`, with a `decision`, chose a type, and nothing chose a priority. Yet the priority decides what is worked next: `bd ready` sorts by it unless told otherwise, and `bead`, `change-build` and `fan-out-work` take what it lists first. Without a rubric the tracker drifted, as § Figures shows. Three alternatives lost:

- **Four types, epic, decision, bug and task.** Fewer judgements, and every issue not then closed already carried one of them. The maintainer kept feature, chore and spike so that `bd count --by-type` can separate a new capability, upkeep and an investigation.
- **Three priorities, 1, 2 and 4.** Fewer judgements. But work found on the way would share 2 with work a person asked for, and a sweep that takes the top of `bd ready` could take a nit first.
- **No gate, the rubric in the policy and the prompt alone.** Nothing would refuse a stray type, and the drift in § Figures came from prose that no gate read.

Where it loses:

- **The line between feature, chore and task stays a filer's judgement.** The order settles an issue that fits two rows, not one that two filers read differently, and the gate cannot tell a fitting row from a wrong one.
- **Friction that recurs sinks.** A cost every session pays is ranked by its size each time, so it stays at 3, below all planned work, however many sessions it slows. `asdlc-openspec-23bi` is one: a hook that asks each edit of `scripts/README.md` to rewrite rows the edit did not touch.
- **One stray type blocks unrelated pushes.** `beads-check` runs on every push with no glob, so an issue someone files as `story` from the command line refuses the push of every branch until it is retyped.
- **Issues already filed keep their old rows until someone works or notes them.** Found work filed at 2 sorts alongside planned work until then.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound.
- **`tools/policy/vocabulary.json`:** `issueTypes` and `issuePriorities`, each with its `Means`; `foundIssueCommand` and its `Means`; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` naming them. **`tools/policy/README.md`:** the record's row.
- **`scripts/check-beads.mjs`:** rule 5, the policy read once for rules 4 and 5, the header, and five selftest cases, with a closed issue of an unnamed type in the control. Its rows in `scripts/README.md` and `README.md`, the jobs' comment in `git-hooks.yml`, and the step's comment in `.github/workflows/verify.yml`, re-measured.
- **`CLAUDE.md`:** consolidated in a commit of its own, then § The task store's two sentences. **`tools/policy/prompt-budgets.json`:** its row from 3,240 to 3,258.

**Figures.** Each was taken on 2026-10-03 from `bd export --output <file>`, counted by a script over that file, with the `bd count` equivalent beside it:

- 232 issues: 163 task, 42 bug, 10 chore, 6 epic, 6 feature, 3 decision, 2 spike (`bd count --by-type`). The 87 not closed are 70 task, 12 bug, 3 epic, 1 feature and 1 decision, each a type `issueTypes` names (`bd count --status open --by-type`, 85, and `bd count --status in_progress --by-type`, 2).
- Priorities: none at 0, 14 at 1, 127 at 2, 82 at 3, 9 at 4 (`bd count --by-priority`). The 14 at 1 are 8 bugs and 6 tasks, all closed. 60 of the 82 at 3 and 45 of the 127 at 2 were filed `discovered-from`; 37 of those at 2 are an epic's children.
- 3 tasks carry `## Steps to Reproduce`, the section `bd lint` asks of a bug, all filed from 2026-10-01 to 2026-10-03: `asdlc-openspec-dw7b`, `asdlc-openspec-d2qv` and `asdlc-openspec-23bi` (`bd count --type task --desc-contains "## Steps to Reproduce"`).
- `CLAUDE.md` from 3,240 words to 3,213 by the consolidation and 3,258 with the sentences: `node scripts/check-prompts.mjs --counts` at each commit.
- 14 checks in `beads:selftest`, and 1.11-1.98 s for its job: each run, and the job's comment in `git-hooks.yml`, which names the host.

> **Amended 2026-10-04 by D-35.** Item 5's `npm run beads:check` and `npm run beads:selftest` run as `mise run beads:check` and `mise run beads:selftest`, since the tasks moved from `package.json` to `tasks.toml`, where `npm run` finds none of them.

### D-30 · The explore skill is OpenSpec's explore stance, adapted: it draws, cites, writes only a brief, and hands a change to change-propose

**Recorded 2026-10-03**, carried by `asdlc-openspec-wox3`. On 2026-10-03 the maintainer named the problems: the skill was too rigid, and it drew nothing. Given that issue's brief, they asked for a version that met the seven conditions of its recommended option, with guidance on citations added and the license question researched. The skill's text, the license file beside it and the hand-off through `.scratch/` are this entry's session's choices.

**Builds on / amends:** amends D-13, whose item 4 made Explore the existing `explore` skill and its brief a change's `findings.md`. Builds on D-02, whose item 7 retired the `openspec-*` skills `openspec init` generated, `openspec-explore` among them; this entry does not reverse it, since no generated skill returns and `openspec:check` still refuses one. Builds on D-12, under which a prompt is consolidated before its budget rises; on D-27, whose table holds that budget; and on D-07, which leaves a change to this register or to a word budget to a person.

**Decision.** `.claude/skills/explore/SKILL.md` is an adaptation of OpenSpec 1.14.0's `openspec-explore` template.

1. **A stance, not a procedure.** It follows the conversation, asks one question at a time in dependency order when a change is being planned, and draws in plain ASCII. Where it loses: a user who wanted only the evidence gets a conversation until they ask for a brief.
2. **The old procedure is kept, on request.** Asked for research or a decision brief, it lists its assumptions with its guesses and stops for correction, then has a subagent inventory the evidence, paths and quotes with no recommendation.
3. **Every claim about the repository carries a citation**, in a form `citations:check` resolves, a document by section and never by line, so that a brief is committed as it stands. Where it loses: a reply grows longer by its sources.
4. **It writes only the brief**, to `.scratch/explore-<topic>.md`, after the user says yes, and nothing under `openspec/changes/`. A change is started by `change-propose`, which commits the brief as `findings.md`, as D-13 item 4 has it. The hand-off names the brief's path, to be read before the worktree is cut, since a worktree does not carry `.scratch/`. Where it loses: a `change-propose` run started without that path finds no brief, and the change gets no `findings.md`.
5. **OpenSpec's notice travels with its text.** The skill names its source, and `.claude/skills/explore/LICENSE` holds OpenSpec's copyright line and the MIT permission notice as OpenSpec 1.14.0 publishes them. Where it loses: a reader who takes the file to cover the whole skill reads this repository's additions as MIT too, though the skill's attribution says only that it is adapted from OpenSpec's.
6. **It is not kept in step with upstream.** A later OpenSpec release is ported by hand if anyone chooses to, and nothing reports drift.

**Why.** The maintainer found the skill too rigid: every run stopped at a numbered list of assumptions, then returned an inventory with no recommendation. They also wanted diagrams, and asked for guidance on citations. Items 1 to 3 answer those. The brief on `asdlc-openspec-wox3` assessed the untracked candidate, OpenSpec 1.14.0's template with its OpenSpec-specific sections cut, and found it could not land as it stood. Each problem, and where it is answered:

- **`check:prompts` refused it**, for want of the opening line and over its budget. The skill opens with the line, its text is consolidated, and its budget rises by what that left (What changed).
- **Two of its pointers named sections it had cut.** Both are gone, and the skill's § Planning a change names what to read instead.
- **It let a request to capture a change write change artifacts by hand**, outside `change-propose`. Item 4.
- **It kept its record "in the conversation, not in files"**, which left `findings.md` nothing to commit. Item 4.
- **Its recommendations showed no losing case.** The skill's § Planning a change asks for one, pointing at `CLAUDE.md` § A question shows where its recommendation loses, and the example that had none is cut.
- **It dropped the license notice.** Item 5.

On the license, MIT asks that "the above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software", and does not define substantial. The GNU licensing FAQ says of a program that copies part of itself into its output that "the copied text in the output is covered by the same license that covers it in the source code" (https://www.gnu.org/licenses/gpl-faq.en.html, read 2026-10-03). The template is a string in OpenSpec's own source, `dist/core/templates/workflows/explore.js`, and its generator writes only `license: MIT` into a skill's frontmatter, with no copyright line or notice (`dist/core/shared/skill-generation.js`, in the 1.14.0 package). A file beside the skill costs nothing a run loads, where the notice inside it would load with every run. Three alternatives lost:

- **Not adopting.** Both problems stay.
- **Rewriting the old skill in a few hundred words.** Cheaper per run, but it rebuilds from scratch a stance the upstream text already states, and no trial showed that a shorter prompt keeps it.
- **The adaptation as a second skill beside the old one.** Two descriptions that both claim exploring and planning leave it unpredictable which one a session selects.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendment under D-13.
- **`.claude/skills/explore/SKILL.md`:** replaced. `git show aa20aee:.claude/skills/explore/SKILL.md` recovers the old text.
- **`.claude/skills/explore/LICENSE`:** added, OpenSpec 1.14.0's `LICENSE` as published. **`.claude/README.md`:** the skills row says a skill adapted from another project's text keeps that project's license beside it.
- **`tools/policy/prompt-budgets.json`:** the skill's row from 118 to 1,114, and `provenance`.
- **`README.md` § Working here:** the skill's row.

**Figures.**

- 118, the old skill's words, and 1,114, the new skill's: `node scripts/check-prompts.mjs --counts` at `aa20aee` and at this entry's commit.
- 1,372 and 1,389, the candidate's words without and with the opening line: trials E2 and E3 on `asdlc-openspec-wox3`. The candidate is untracked; its text is OpenSpec 1.14.0's `getExploreSkillTemplate()` with that issue's list of edits.
- 169, the words the notice would add inside the skill: `wc -w .claude/skills/explore/LICENSE`.

### D-31 · mise is the toolchain: `mise.toml` is the one home of every tool version, and CI, the dev container and the setup steps install from it

**Recorded 2026-10-03**, carried by `asdlc-openspec-8juz.2`, a child of `asdlc-openspec-8juz`. On 2026-10-03 the maintainer asked for a plan to introduce mise, replacing every tool or mechanism it can replace, to consolidate the project's setup. Each choice was put with the case where it loses, and the maintainer chose: mise required, as the only documented setup path; Node 24 on every machine; graphify, uv and gh pinned too; and the scripts moved to mise tasks, with the hook runner kept. A spike, `asdlc-openspec-8juz.1`, measured mise in this repository first, and its findings set item 5.

**Builds on / amends:** amends D-26, whose loss named a `setup-python` step in CI and a Python in the dev container's apt layer. Builds on D-19, whose runner and jobs are unchanged and run on the Node mise installs; on D-27, whose split puts `toolchainLockPlatforms` in `tools/policy/tool-settings.json` and whose reviewer floor gains the toolchain's config and lock files and the dev container; and on D-07, which leaves a change to `.github/**`, `package-lock.json` or this register to a person.

**Decision.**

1. **`mise.toml` is the one home of every tool version the repository installs**: Node 24.21.0, Python 3.12.15, Vale 3.23.0, `bd` 1.3.0 from its own GitHub release, and gh 2.102.0, each an exact version. `mise.lock` records each one's download URL and checksum for every platform `toolchainLockPlatforms` names. Not in it: Git, a system prerequisite whose floor the hook runner holds; Claude Code, which updates itself; and the npm packages, which `package.json` pins. graphify and uv join it in `asdlc-openspec-8juz.3`.
2. **mise is required.** `README.md` § Setup installs Git and mise, puts mise's shims first on the `PATH` every process inherits, and runs `mise trust` and `mise install`; it installs no other tool by hand.
3. **CI installs through `jdx/mise-action`**, the action pinned by commit, and mise by one release and its binary's `sha256`, the same in every step; the whole toolset in every job, locked. The reviewer's workflow takes `bd` that way and runs `bd --version` before `bd bootstrap`, which `pr-review:check` holds. Vale is then on the runner, and `vale:selftest` becomes a CI step.
4. **The dev container copies in the same mise**, its image pinned by digest, and installs the toolset, locked, as an image layer, with the shims on `PATH` through `ENV`. mise trusts the workspace folder's `mise.toml` and no wider path, and the entrypoint warns, and never installs, while the image lags `mise.toml`. Claude Code moves to its own installer.
5. **`[settings] not_found_system_fallback = false`, with auto-install left on.** The spike found that with `auto_install = false`, `mise run` and a shim each ran the system's Node when the pinned one was missing, and said nothing. With the fallback off a shim refuses instead, and with auto-install on a moved pin installs at its next use, which eight runs at once did without a failure.
6. **`check:toolchain` holds all of it**, at pre-push and in CI: an exact pin, a plain string with no option table, a lock entry for each pin and platform, one mise for CI and the container no older than `min_version`, no second home for a pinned tool, and nothing in `mise.toml` but `min_version` and its three tables, the one template the task move needs, and the two settings of item 5. A setting it does not admit could turn off mise's checksum, signature or provenance checks, and an option table could run a command at install, so each later setting or option is admitted by name, in the change that needs it. It refuses, too, any tracked mise config but the root `mise.toml`, and, where `mise` is on `PATH`, a reading of `mise.toml` by mise that differs from its own. The reviewer's floor holds every such config, and the dev container, to a person. A security review of this change found that a config beside `mise.toml` would act unread, and that a file two parsers read differently would pass the gate.

**Why.** Node's version had four homes that disagreed: `engines` said 22.22.2 or newer, the container ran the newest 22.x, CI the newest release `engines` allowed (24.21.0), and the maintainer's machine 26.8.1. `bd`'s version lived in a Dockerfile `ARG` that the reviewer's workflow read back with `sed`, Vale's in another, and Python's in CI alone, and a contributor installed each by hand from a list per platform. Four alternatives lost:

- **asdf.** It manages versions the same way, but reads `.tool-versions` alone, with no lockfile and no checksums, and each of its plugins is a shell script fetched from a repository of its own.
- **Nix or devbox.** Reproducible to the byte, but a second package manager on every machine, slower to install, and nothing in this repository's CI or container speaks it.
- **Keeping the per-tool installs and gating their agreement.** A gate could hold the Dockerfile's ARGs, CI's setup steps and the README's lists equal, but every install would stay its own mechanism on each platform, and setup would stay a list a person runs by hand.
- **mise as an optional convenience.** The README's manual lists would stay beside it, and every version would be stated twice, which `CLAUDE.md` § Three kinds of file, and never a fourth forbids.

Where it loses:

- **The `engines` floor goes unexercised.** Every machine runs 24, so code that needs 24 passes every gate and fails for someone on 22.22.2. `asdlc-openspec-8juz.8` carries the decision whether the floor rises.
- **The container no longer runs the oldest supported major**, which its Dockerfile had chosen so that code needing a newer major failed there first.
- **mise is required.** A contributor who cannot install it has no documented route.
- **A Claude Code session whose `PATH` lacks the shims runs no guards.** Its hooks run a bare `node` and exit 127 when none is found, which Claude Code does not treat as a block. The README's step prevents that for a terminal; a session launched from the desktop app is unmeasured, and `asdlc-openspec-8juz.10` asks the maintainer to measure it.
- **A clone that has not run `mise trust` fails `check:toolchain`** wherever `mise` is on `PATH`, since mise then refuses to read `mise.toml` for the gate; a machine with no `mise` on `PATH` passes that comparison unasked, and the gate says so.
- **A pin bump matches no job's glob but `check:toolchain`'s**, so the other gates meet the new version only on a forced `npm run gates` or in CI.
- **A bare `node` run in a directory with no `mise.toml` above it fails in the container**, which has no system Node. Every gate runs from the clone, and a shim hands the real tool directories to what it starts, so no gate meets it; a global default would be a second home for the pin.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendment under D-26.
- **`mise.toml` and `mise.lock`:** new, at the root, with their row in `README.md` § How it is laid out.
- **`scripts/check-toolchain.mjs`:** new, the gate; `check:toolchain` and `check:toolchain:selftest` in `package.json`, each a pre-push job in `git-hooks.yml` and a step in `.github/workflows/verify.yml`, with their rows in `README.md` and `scripts/README.md`. **`package.json` and `package-lock.json`:** `smol-toml` at exactly 1.9.0, the TOML parser the gate reads with.
- **`tools/policy/tool-settings.json`:** `toolchainLockPlatforms` with its `Means`, and the record's header and its row in `tools/policy/README.md` naming it. **`tools/policy/pr-review.json`:** in `prReviewHighRiskPaths`, `mise.lock`, `mise.toml` at any depth, every other place mise reads a project config from, and `.devcontainer/**`.
- **`.github/workflows/verify.yml`:** `jdx/mise-action` and an npm cache in place of the Node and Python setup actions; the two gate steps and `vale:selftest`; Vale out of the absent block.
- **`.github/workflows/pr-review.yml`:** `jdx/mise-action` in each job, and in the review job `bd` from it, with `bd --version` a step of its own, in place of the npm install that read `ARG BD_VERSION` with `sed`; the header's incident and needs. **`scripts/pr-review.mjs`:** `pr-review:check` holds the new install, its four old checks and their four cases replaced by four checks and six cases; and the floor's check covers six of the toolchain's paths, three of its globs each with a case.
- **`.devcontainer/`:** the Dockerfile without its version ARGs, NodeSource, the gh and Vale layers, apt `python3` and the global npm installs, and with mise and the locked install; `devcontainer.json` with the repository's root as its build context; `Dockerfile.dockerignore`, new, admitting only what the build reads; `entrypoint.sh` warning while the image lags `mise.toml`; and the directory's README.
- **`README.md`:** § Setup on each platform; the Node floor's command under a heading of its own, § The Node floor, on every platform; rows in § The guardrails, § The npm scripts and § What runs automatically, and the `vale:selftest` rows now CI's too.
- **`.gitignore`:** a person's own mise files. **Headers:** `scripts/check-beads.mjs`, `scripts/vale.selftest.mjs`, `scripts/python.mjs` and `tools/lib/bd-launcher.ts`, each where it named the old installs.

**Figures.**

- 5 tools pinned, each locked for 5 platforms, 25 platform entries: `mise lock --platform linux-arm64,linux-x64,macos-arm64,macos-x64,windows-x64` at this change, and `npm run check:toolchain`.
- 61 cases in `check:toolchain:selftest`, 5 of them controls; 50 of 50 deletions each turning a case red, one at a time: the gate's 39 `problems.push` sites, its one `notes.push`, its 5 second-home patterns and the 5 spellings of rule 6. `npm run check:toolchain:selftest`, and a run of it with each of those disabled in turn, by a helper that is not tracked.
- 0.41 s wall for the gate and 2.02 s for its selftest: the jobs' comments in `git-hooks.yml`, which name the host.
- The spike's figures, each in `asdlc-openspec-8juz.1`'s notes with its command: medians of 95 ms through `node --run` and 91 to 98 ms through `mise run` over 20 runs, 39 of 39 pre-push gates with the same exit status both ways, and 7 tools installed in 6.0 s.

> **Amended 2026-10-03 by D-33.** `scripts/python.mjs`, one of the headers What changed lists, is deleted, and its readers run the `python` that this entry's `mise.toml` pins.

> **Amended 2026-10-04 by D-34.** `engines` is `>=24.21.0`, starting at the `node` this entry's `mise.toml` pins, so the loss "The `engines` floor goes unexercised" holds no longer, until a bump of the pin leaves the floor below it, which D-34's loss describes. Why's `engines` at 22.22.2 stays true of its date.

> **Amended 2026-10-04 by D-35.** Item 1's graphify and uv have joined `mise.toml`: uv 0.12.22, and graphify 0.9.73 with its MCP extra. Item 6 admits one option table, a `pypi:` tool's `version` and list of `extras`, and holds such a tool's lock to the uv lock under `.mise/locks/` that `mise.lock` names, in place of a URL and checksum per platform. The comment at the head of `mise.toml` now says to run `mise install` before `mise lock`.

### D-32 · A prompt review answers each changed prompt's stored decision cases with its old text and its new, and a case that flips from right to wrong keeps the edit out

**Recorded 2026-10-03**, carried by `asdlc-openspec-7c1`. The maintainer chose items 1 to 3 on 2026-09-26, item 3 their own proposal. On 2026-10-03 they confirmed item 3's shape, one author per lens in a workflow of its own, and chose items 4, 5 and 7, each the recommendation, from options put with the case where it loses. The session that built it chose items 6, 8 and 9.

**Builds on / amends:** amends D-10, whose item 4 merged a branch once a majority upheld every edit on it; D-12, whose item 5 merged a consolidated file's branch once its consolidation was upheld too; and D-17, whose item 4 had the reviewer make a worktree only when a group formed. Builds on D-08, whose batched review it extends; on D-27, whose `tools/policy/agent-workflows.json` holds the new keys and `tools/policy/prompt-budgets.json` the new and raised budgets; and on D-07, which leaves a change to this register or a budget to a person.

**Decision.** How a prompt review tests what an edit does to the decisions its prompt already makes. `.claude/prompt-cases/README.md` holds a case's format and how one is written, validated and judged; the header of each workflow, `.claude/workflows/author-prompt-cases.js` and `.claude/workflows/review-prompts.js`, holds its mechanics; `.claude/agents/continuous-prompt-improvement.md` § 3 to § 5 and § 7 hold the reviewer's part. Each item gives its cost per review.

1. **Stored decision cases, run as a regression check.** For each file a branch changes, by an edit or a consolidation, every stored case of that file is answered with the old text and the new, once a majority of the branch's skeptics upheld it. An edit's own case is not required to fail first. Cost: twice `promptReviewCaseRepetitions` answers for each stored case of each changed file, and one reader for each branch with such a case. Where it loses: the bank starts at the cases of item 7, so most paths through most prompts have no case, and a clean run can read as safe when it covered little.
2. **A case the old text answers right and the new text answers wrong keeps the branch out**, as an edit a majority did not uphold does under D-10; so does a case left unanswered. A text answers it right when a majority of its answers chose the expected option. Cost: none beyond item 1. Where it loses: a case whose expected answer the edit means to change blocks that fix until a person updates the case; `asdlc-openspec-a484` asks whether the edit's finding may.
3. **Several authors, each with narrowly scoped context, write candidate cases for a settled finding, and the reviewer chooses one or combines them.** One author per lens `promptReviewCaseLenses` names, each given one finding's evidence, the prompt as that run read it, and `CLAUDE.md`, in a workflow of its own run before `review-prompts.js`, so no one who shapes a case has seen the change it will judge. A seed drawn from a section gets no lens that needs a run. Cost: one author per lens for each settled finding, then the answers of item 4. Where it loses: an author cannot see that two findings are one, so the reviewer merges their candidates by hand; the case stored still rests on the reviewer's one choice, and a combined case is one no author wrote.
4. **A case is stored only when every one of `promptReviewCaseRepetitions` answers with the trunk's text chooses its expected option.** Cost: that many answers for each case chosen. Where it loses: a sound case answered right 80% of the time is turned away about half the time, so the bank grows slowly; and a case that shows a failure the trunk still has is turned away, though it is evidence for an edit.
5. **A case's expected answer is an option, judged in code, never prose the prompt writes; its source is a run, with the point of its analysis and the commit the run read the prompt at, or a prompt's section.** The second admits the cases the issues waiting on this one write from a prompt's rules. Cost: none. Where it loses: a prompt whose output is prose, such as eli5, is held only on what it says it would do; `asdlc-openspec-1kie` asks whether a model grades prose cases.
6. **One JSON file per case under `.claude/prompt-cases/`, with a `README.md`, carried in the review's pull request**, whose description lists each case's outcome and counts and the authors and answers each workflow spent. The reviewer opens one when it validated a case, even with no branch to merge. Cost: none. Where it loses: a review that only adds cases opens a pull request that someone still has to merge.
7. **The first cases are built by running the authoring workflow on the 9 settled findings** that `asdlc-openspec-7c1`'s description lists, each re-checked against its analysis first. Cost: once, the authors, the readers and the answers the Figures below give. Where it loses: the workflow's first real run is part of the change that adds it, and found a defect of its own, the candidates' ids, which the change fixed.
8. **Each author and each answer is an agent by `agentType` whose only tools are Read and its structured output**, `prompt-case-author` and `prompt-case-answerer`, so it can run no command and search for nothing, such as a case's expected answer. One reader agent runs a command that writes each text it needs under `.scratch/prompt-case-texts/` and prints only their paths, with a checksum the script re-derives; the script refuses a path other than where the command writes, and sends each author or answer to read its one file. Each answer sees the options in an order turned one place per repetition. Cost: one reader for each run of the authoring workflow and one for each group with a stored case, each a single command; the authors and answers cost what items 1, 3 and 4 give. Where it loses: an agent that guessed the path of another file, a stored case or the prompt's other version, could read it, and nothing records that it did not. And an agentType resolves from the checkout the calling session started in, which for a review is the primary checkout, so until that checkout's `main` holds this change every answer returns nothing and every branch with a stored case is kept out.
9. **The reviewer makes its worktree when a group formed or a seed was found**, since the authoring workflow runs from it. Cost: one worktree, and its `npm ci`, for a review with seeds and no group. Where it loses: a review whose seeds all yield no case cuts a worktree for nothing.

**Why.** A skeptic under D-10 reads an edit's diff and asks whether the runs it was given would have gone differently and whether another caller breaks; nothing ran the edited prompt against a decision it already made right. Point 7 of `asdlc-openspec-aa0`'s analysis records one: a consolidation of `bead` dropped "stated as requirements" and broadened a routing rule, and the pull-request reviewer, not the review, caught it. Superpowers' `writing-skills` tests a skill with written scenarios that each force a choice, and the maintainer took that shape on 2026-09-26. Seven alternatives lost:

- **Replaying whole recorded runs**, the issue's first framing. Claude Code cannot resume a run from a mid-point, and a whole `bead` run needs a sandbox for git, GitHub and `bd`.
- **Requiring each edit's own case to fail on the old text first.** In 6 of the 9 settled findings the run had already chosen right under the old text, so it would hold most edits and add little to D-10's first skeptic question.
- **`claude plugin eval` as the harness**, moved to `asdlc-openspec-31k`, since packaging the prompts as a plugin has value beyond evaluation.
- **A majority of the repetitions as the bar to store a case.** A case answered right 70% of the time on both texts would be stored 78% of the time and then flip by noise alone in 17% of the reviews that change its prompt.
- **llm-rubric as the judge of prose cases**, moved to `asdlc-openspec-1kie`: a devDependency, a pinned grader, and a key this repository does not store.
- **An answer with Bash, told to read one version with `git show`.** It could search the repository and read the case's expected answer under `.claude/prompt-cases/`, and nothing would show it had.
- **An answer with no tool, the text in its prompt**, as the branch first built it. A reader agent then has to retype every text through its output, exactly, for its checksum to match. It can: the first run of the authoring workflow, on that design, returned a 46,547-character line that matched. But the session's review of this change measured `CLAUDE.md` alone at a 39,891-character line, which the Bash tool showed as a 2 KB preview and Read as its first 21,247 characters, so each copy rests on an agent reassembling a line no tool shows it whole, at the cost of retyping it, and one slip fails the run.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; amendments under D-10, D-12 and D-17.
- **Added:** `.claude/workflows/author-prompt-cases.js`; `.claude/agents/prompt-case-author.md` and `.claude/agents/prompt-case-answerer.md`; `.claude/prompt-cases/`, its `README.md` and the first cases.
- **`.claude/workflows/review-prompts.js`:** consolidated under D-12 in a commit of its own, then `args.cases`, the Regress phase, the `regressed` status, `cases` in its result, and the `promptReviewCaseRepetitions` key it reads.
- **`.claude/agents/continuous-prompt-improvement.md`:** consolidated under D-12 in a commit of its own, then the seeds in § 3, the authoring workflow and the cases passed in § 4, the cases written in § 5 and each branch's diff held there to the files its report lists, and the stored cases in § 7 item 3.
- **`tools/policy/agent-workflows.json`:** `promptReviewCaseLenses` and `promptReviewCaseRepetitions`, each with its `Means`, and the record's header naming them. **`tools/policy/prompt-budgets.json`:** a budget for each new prompt, and the raised budgets of the two consolidated ones.
- **`scripts/workflows.selftest.mjs`:** a suite for the authoring workflow, the stored cases' cases in the review's suite, the bank run through both workflows, one answer prompt held across the two, and the two agents' tools lines; its job's glob and cost in `git-hooks.yml`, and its step's comment in `.github/workflows/verify.yml`.
- **`README.md`, `.claude/README.md` and `scripts/README.md`:** the rows that describe the workflows, the agents, the bank and the selftest.

**Figures.**

- 9 settled findings, `asdlc-openspec-7c1`'s description, § Current state and § Re-measured 2026-10-03: `bead` 3, `fan-out-work` 4, `continuous-prompt-improvement` 1 and the worktree briefing 1.
- At the policy's values, 3 lenses and 3 repetitions: a review spends 6 answers on each stored case of each changed file, 3 authors on each settled finding, and 3 answers on each case it validates (`tools/policy/agent-workflows.json`).
- The first cases, from the workflows' results; each run's record is outside this repository. 27 authors wrote a candidate each for the 9 seeds, with a reader (run `wf_da18974f-de7`); the candidate format of the time kept 4 and dropped 23 for an id alone, which the change that follows it fixed. The session chose 9, one per seed. 3 answers each validated them (`wf_088b6cb9-680`, and `wf_6419984c-c57` for the one case whose third answer the session cut short). The first of those runs never returned its result, and the session that ran it wrote one of its own, with fields the script does not have; the outcome here is the committed script replayed on that run's recorded answers. 7 were stored, each 3 of 3: `bead` 3, the reviewer 1, `fan-out-work` 2 and the worktree briefing 1. 2 were turned away, both `fan-out-work`'s, at 1 of 3 and 0 of 3: its text still leads a session to renumber only the places its overlap table names, and to put lanes that share one-line strings into one lane. A run on the design item 8 replaced spent 28 agents more (`wf_635b368c-78f`); its candidates went unused. The reviewer's case was answered again, 3 of 3 (`wf_b657633c-a4b`), once one of its wrong options named `tools/policy/prompt-budgets.json` in place of `tools/policy.json`, which D-27 retired.
- The probabilities in item 4 and in the alternatives are binomial: with n answers each right with probability p, a text is right when at least floor(n/2)+1 are, a case is stored with probability p^n, and a stored case flips by noise with probability P(right)·(1 − P(right)). At n = 3: p = 0.7 gives 0.784 right, 0.343 stored and 0.169 flipped; p = 0.8 gives 0.512 stored; p = 0.95 gives 0.857 stored and 0.007 flipped.
- The reader's printed line, each the command cut from its workflow's source and run by a script that is not tracked: 1,517 characters for the six texts of the first cases' run, where the texts total 55,204 bytes; and 1,288 for `CLAUDE.md` and `review-prompts.js` at a merge base and a head, 131,772 bytes.
- Word counts, each `node scripts/check-prompts.mjs --counts`: the literals of `review-prompts.js` 1,720 at `e8919c3`, 1,683 after its consolidation, and 2,058 with the cases' step; `continuous-prompt-improvement.md` 2,161, 2,076 and 2,262.

### D-33 · `utils/install-dolt.sh` and `scripts/python.mjs` retire, made redundant by mise

**Recorded 2026-10-03**, carried by `asdlc-openspec-8juz.4`, a child of `asdlc-openspec-8juz`. The epic, as the maintainer agreed it on 2026-10-03, retires both: Dolt is not pinned in `mise.toml` because the tracker runs it embedded, and mise's shim gives every platform a `python`.

**Builds on / amends:** amends D-26, whose items 2 and 3 run the graph half through `scripts/python.mjs` and whose loss "The repository tracks its first Python file" names that helper's refusal; and D-31, whose What changed lists `scripts/python.mjs` among the headers it changed. Builds on D-31, whose `mise.toml` pins the Python every machine runs, and on D-07, which leaves a change to this register to a person.

**Decision.**

1. **`utils/install-dolt.sh` is deleted outright, and `utils/` with it**, the disposition `docs/retired/README.md` § The three dispositions gives a file nothing live reads. No tracked file named it, and the tracker runs Dolt embedded (`dolt_mode` in `.beads/metadata.json`), so no machine here installs Dolt. `git show 1ec50f8:utils/install-dolt.sh` is the recovery.
2. **`scripts/python.mjs` is deleted outright.** Each of its readers runs `python`, the Python 3 `mise.toml` pins, which mise's shims put on `PATH` on every platform. `harness:graph` is `python tools/harness/graph.py`, and `tools/harness/selftest.ts` spawns `python` for the graph half's selftest; where none runs, it fails and names mise's shims. `git show 1ec50f8:scripts/python.mjs` is the recovery.

**Why.** The helper probed `python3`, `python` and `py -3` in an order of its own on each platform, because no one name ran a Python 3 everywhere. On native Windows `python3` is the Microsoft Store's App Execution Alias, a stub that fails with an install prompt, slowly; a stock WSL2 Ubuntu has no `python`. mise's shim is named `python` on every platform, so the probe has nothing left to choose between. The Dolt script installed a Dolt nothing here runs. Two alternatives lost:

- **Moving either file under `docs/retired/`.** No live gate or citation needs its lineage.
- **Keeping the helper as a fallback.** It would run whichever Python 3 the machine has where mise's is missing: the silent substitution D-31 item 5 turns off for every pinned tool.

Where it loses:

- **A `python` started outside mise's `PATH` is whatever that `PATH` holds**, on a machine whose profile does not put the shims first, such as the one `asdlc-openspec-jvpe` describes. Where it holds none, `harness:selftest` fails and names mise's shims. On native Windows it can hold the Store alias, which starts and fails with an install prompt of its own, so the selftest fails without naming the shims. Where it holds another Python 3, the graph half runs on that, unchecked. The helper ran a Python 3 in all three cases.
- **The `harness-selftest` job fails on a machine set up before mise's shims step.** On 2026-10-03 the maintainer's laptop had no `python` on the `PATH` this session's shell inherited, and `python3` was `/usr/local/bin/python3`. A push there that changes `tools/harness/` runs that job.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; amendments under D-26 and D-31.
- **Deleted:** `utils/install-dolt.sh`; `scripts/python.mjs`, with its row in `scripts/README.md`.
- **`package.json`:** `harness:graph` runs `python tools/harness/graph.py`.
- **`tools/harness/selftest.ts`:** spawns `python`, says why it failed where none runs, and its header says so. **`tools/harness/graph.py`:** its invocation lines.
- **`git-hooks.yml`:** `scripts/python.mjs` out of the `harness-selftest` job's glob, and its comment.
- **`README.md`:** the `harness:selftest` row of § The npm scripts, and its row of § What runs automatically. The seven other rows there whose jobs' globs gained `scripts/lib/tasks.mjs` with `asdlc-openspec-8juz.5`, which that change left as they were, name it now. **`tools/README.md`:** the `harness/` row.

**Figures.**

- 90 checks in the core's selftest and 48 in the graph half's, under mise's Python 3.12.15 and Node 24.21.0: `npm run harness:selftest` with mise's shims first on `PATH`. Under the session shell's own `PATH`, which has no `python`, the core's 90 pass and the graph half's run fails, naming mise's shims.
- `npm run harness:graph` under the same Python exits 0 and writes a combined graph of 2,149 nodes and 6,823 links beside its report, from a worktree of this change after `npm run harness` there: each command with mise's shims first on `PATH`, on 2026-10-03, over the maintainer's local graph, which no commit holds.
- The Store alias's cost, 1.9 to 2.2 s to fail on one Windows machine, measured 2026-09-09: the deleted helper's header (`git show 1ec50f8:scripts/python.mjs`).

### D-34 · The `engines` floor rises to Node 24.21.0, the version `mise.toml` pins, so every gate runs it

**Recorded 2026-10-04**, carried by `asdlc-openspec-8juz.8`, a child of `asdlc-openspec-8juz`. On 2026-10-04 the maintainer decided, in the session working the epic: "package.json engines can move to node 24." The exact floor was left to the session that worked the issue, within two limits: `README.md` § The Node floor, on every platform, and the pin. That session chose 24.21.0, the recommendation its brief gave, with the cases below where it loses.

**Builds on / amends:** amends D-31, whose loss "The `engines` floor goes unexercised" named `asdlc-openspec-8juz.8` as the carrier of this decision. Builds on D-31's `mise.toml`, whose `node` pin the floor starts at, and on D-07, whose floor, as D-31 widened it, leaves a change to `engines`, `package-lock.json`, `mise.toml` or this register to a person.

**Decision.** `engines.node` is `>=24.21.0`, in `package.json` and in `package-lock.json`'s root entry. The oldest Node the repository supports is then the one `mise.toml` installs on every machine and in CI, so every gate, hook and CI job runs the floor itself. This entry sets the floor once. It makes no rule that a later bump of the pin moves it; its third loss says what such a bump leaves.

**Why.** With `engines` at 22.22.2 and every machine on 24 (D-31), code that needs Node 24 passed every gate and failed for someone on 22, since nothing ran the floor. The maintainer chose to raise the floor rather than exercise 22.22.2 some other way. On the 24 line it could sit anywhere from 24.11.0, the lowest 24.x every locked package accepts and so the lowest `README.md` § The Node floor, on every platform allows, up to the pin; a bare `>=24` would sit below that. Two alternatives lost:

- **Keeping 22.22.2 and running a CI leg on it**, the issue's other option. Every pull request's CI would install a second Node and run the suite twice, and the pre-push gates, which run on the pin, would still pass code that the leg then refuses.
- **`>=24.11.0`, the locked minimum.** It admits every 24.x from 24.11.0 up to the pin, and no gate runs any of them, so code that needs an API added to 24 after 24.11.0 passes every gate and fails there: the failure the issue names, narrowed and not gone.

Where it loses:

- **A machine on Node 22, which the old floor admitted, is outside the floor now**, though the code may still run there: nothing says it does, and nothing would notice when it stops. This is the case where the maintainer's choice gives the worse result.
- **A machine on 24.x below 24.21.0**, such as one whose Node is a distribution's package, is told it is below the floor, though every locked package accepts 24.11.0 and up and the code may run there. `>=24.11.0` would have admitted it, unexercised.
- **A bump of the pin leaves the floor below it again.** A `node` pin above 24.21.0, moved without raising `engines` in the same change, puts every gate back on a version above the floor, and nothing holds the two equal. The comment above the pin in `mise.toml` says so to whoever moves it.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendment under D-31.
- **`package.json` and `package-lock.json`:** `engines.node`, `>=24.21.0`, edited by hand in the lockfile's root entry; `npm ci` accepts it, and the lockfile's diff is that one line.
- **`mise.toml`:** the comment above the `node` pin, which said `engines` stayed at 22.22.2. No pin moved, so `mise.lock` is unchanged.
- **`README.md`:** § The Node floor, on every platform, which said nothing here runs the floor.
- **Headers:** `scripts/run-tests.mjs` and `scripts/check-thresholds.mjs`, where they said what `run()` does "at the floor": it has no `cwd` option, and its lcov export is an instance. Each was true of 22.22.2 and is not of 24.21.0. No line of code changed.

**Figures.**

- 24.11.0, the lowest 24.x every package in `package-lock.json` accepts, set by the 37 `@babel/*` packages whose range is `^22.18.0 || >=24.11.0`. 217 locked packages carry an `engines.node`, in 50 distinct ranges, each read by `semver` 7.8.5, the version the lockfile installs. Every one of them accepts every version `>=24.21.0` admits (`semver.subset`), where 61 did not accept every version `>=22.22.2` admitted. A script that is not tracked computed each, testing every 24.m.p with m and p below 100 against every range; on the 22 line it gives 22.22.0, as `asdlc-openspec-xn4`'s note of 2026-10-01 read it. `README.md`'s one-line program cannot derive these, since it refuses `node_modules/tunnel`'s `>=0.6.11 <=0.7.0 || >=0.7.3` (`asdlc-openspec-xn4`).
- 24.21.0, the `node` pin in `mise.toml`, and `node -v` under mise's shims.
- At 24.21.0, by two scripts that are not tracked, on 2026-10-04: `run()` given `cwd` found the test file a relative glob named under it, and the same call without `cwd` found none; the `lcov` export of `node:test/reporters` is a function; a module the coverage include glob named, which no test imported, got no coverage record; and `--experimental-test-coverage` given to the process did not reach a `run()` given no `coverage` option. The last two keep the headers' other claims about the floor true.

### D-35 · graphify and uv are pinned in `mise.toml`, and the `graphifyVersion` key retires

**Recorded 2026-10-04**, carried by `asdlc-openspec-8juz.3`, a child of `asdlc-openspec-8juz`. D-31 item 1 said graphify and uv would join `mise.toml` in this issue. On 2026-10-04 the maintainer ran its lock in the branch's worktree, after Claude Code's permission classifier refused a session's run of that step as untrusted code integration (the issue's notes).

**Builds on / amends:** amends D-20, whose script read graphify's release from `graphifyVersion` and named `uv tool install` as its install; D-23 and D-26, whose losses send whoever moves the release to that key or its `Means`; and D-31, whose item 6 admits no tool option table and each later option by name in the change that needs it. Builds on D-31, whose `mise.toml` and `mise.lock` this extends; on D-27, whose `tools/policy/tool-settings.json` held the retired key; and on D-07, which leaves a change to `mise.toml`, `mise.lock`, `.mise/**`, `.devcontainer/**` or this register to a person.

**Decision.**

1. **`mise.toml` pins uv 0.12.22 and graphify 0.9.73, as `"pypi:graphifyy" = { version = "0.9.73", extras = ["mcp"] }`.** `mise install` installs both on every machine, CI and the dev container among them. uv is locked as every other tool is, with a URL and a checksum per platform. graphify is locked by a uv lock of its dependencies under `.mise/locks/pypi-graphifyy/0.9.73~0d7b0bde/`, committed, which `mise.lock` names by its path and the sha256 of its `uv.lock`. Why graphify is pinned, and what to check before moving it, is the comment above the pin.
2. **`graphifyVersion` and its `Means` retire from `tools/policy/tool-settings.json`.** `scripts/code-graph.mjs` reads the release from `mise.toml`, refuses a graphify first on `PATH` that reports another, and names `mise install` in each refusal of a missing or wrong graphify.
3. **The script registers the `graphify-mcp` that `mise which graphify-mcp` names**: the installed file, not a shim, which resolves by the directory Claude Code starts it from and that directory's trust. A registration at another `graphify-mcp`, such as one `uv tool install` put on `PATH`, moves to it at the next run.
4. **`check:toolchain` admits one option table, a `pypi:` tool's, holding `version` and a list of `extras` alone.** Every other key still refuses, as D-31 item 6 asks. Such a tool's lock is held to the uv lock `mise.lock` names: under `.mise/locks/`, hashing to the recorded digest, its `pyproject.toml` asking for exactly the pin with its extras and holding nothing else, its `uv.lock` holding that release, and the lock's extras the pin's. A uv lock there that no entry of `mise.lock` names is refused, and so is a file in a lock's directory besides those two, such as a `uv.toml`, which uv reads as configuration when it runs there.
5. **The dev container copies `.mise/locks/` into its build beside `mise.toml` and `mise.lock`**, under the folder its `COPY` of `mise.toml` names, through its `COPY` and `Dockerfile.dockerignore`, since the image's `mise install --locked` fails on a `pypi:` tool without its uv lock. `check:toolchain` refuses a Dockerfile or an ignore file that leaves it out while a `pypi:` tool is pinned.

**Why.** graphify's release had a home of its own, a policy key, and an install of its own, a `uv tool install` line each person ran by hand, while every other tool's version lived in `mise.toml` (D-31). That install also left graphify's dependencies floating: the spike's unlocked install chose `mcp` 2.3.0 where its locked one chose 2.2.0 (`asdlc-openspec-8juz.1`, question 7). Four alternatives lost:

- **Keeping the key beside the pin.** Two homes for one version, which D-31 rules out.
- **The `pipx:` backend.** mise 2026.10.0 no longer lists it (`mise backends ls`, the spike).
- **Admitting any option for a `pypi:` tool, or `extras` for any tool.** An option such as `postinstall` runs a command at install, and the other backends lock per platform, with no uv lock to hold extras to.
- **Admitting `extras = ["mcp"]` alone**, as the note `asdlc-openspec-8juz.2` left on `asdlc-openspec-8juz.3` asked. The list the gate admitted would be a second home for graphify's extras beside the pin, and one more place to edit when they move. An extra adds packages to the install, the same kind of thing the uv lock already holds for graphify itself. Each one lands in the committed `uv.lock`, which the gate holds to the pin and D-07 leaves to a person. What the gate refuses instead is an extras list that is not a list of extra names. Where it loses: another extra graphify declares, added and relocked, passes the gate with every package it brings, and only the person merging that `uv.lock` sees them.

Where it loses:

- **Every machine installs graphify, used or not.** CI's `jdx/mise-action` steps and the dev container's image install the whole toolset, so they install it too: 58 packages on the maintainer's macOS arm64 laptop.
- **The uv lock is resolved for every Python from 3.10**, so a dependency can sit at an older release than an install under the pinned 3.12 would choose. uv resolved it under CPython 3.13.15 on that laptop, and installed it under 3.12.15.
- **`mise install --locked` refused the two new pins until an unlocked `mise install` had recorded them in `mise.lock`**, which `mise lock` then filled in. The comment at the head of `mise.toml`, and the gate's refusals, now say to run `mise install` before `mise lock`.
- **Rule 7 compares a `pypi:` pin's version, not its extras.** mise's `ls --current --json` gives a requested version and no extras, so an `extras` that mise and the gate read differently passes rule 7; the lock check holds the extras to `mise.lock`'s and the uv lock's.
- **The registration names mise's install directory, whose name carries a hash of how the release was installed** (`0.9.73~uv~<hash>`), not the release alone. A relock that installs 0.9.73 anew, followed by `mise prune`, leaves the server pointing at a file that is gone, until `npm run code-graph:mcp` registers it again. The shim, which the entry rejected, would have followed the install.
- **No image was built for this change.** Its locked install was run as a dry run over a copy of what the Dockerfile copies, where every tool but graphify said it would install and graphify stopped only for want of an installed Python, which a real install puts first; building the image is `asdlc-openspec-zfz`'s.
- **The first criterion is a person's run.** `npm run code-graph` sends changed documents to a model on that person's plan and writes `~/.claude.json`, so no session ran it; `asdlc-openspec-xh2a` carries it.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; amendments under D-20, D-23, D-26 and D-31.
- **`mise.toml`, `mise.lock` and `.mise/locks/pypi-graphifyy/0.9.73~0d7b0bde/`:** the two pins with their comments, their lock entries, and graphify's uv lock, new; the head comment's order of `mise install` and `mise lock`. The comment above graphify's pin names what a new release is checked against: the script's header, the guard's `GRAPHIFY_ERODING` and `GRAPHIFY_HELP`, and the private loader the check of `tools/harness/graph.py` reads.
- **`scripts/check-toolchain.mjs`:** rules 2 and 5 for a `pypi:` tool, rule 3's for the dev container, the stale-lock refusal and the refusal of another file in a lock's directory, the relock text, its summary line and header; twenty selftest cases, one of them a control, its copies carrying `.mise/locks/` and the ignore file, and its placeholder control for a `pypi:` lock dropped for the live one.
- **`.devcontainer/Dockerfile`, `.devcontainer/Dockerfile.dockerignore` and `.devcontainer/README.md`:** `.mise/locks/` copied into the toolchain layer and let into its build context, `uv` and `graphify` in the layer's smoke line, and the header and rows that list the toolchain and the build context, and the order of `mise install` and `mise lock`.
- **`scripts/code-graph.mjs`:** the pin read from `mise.toml`, `mise install` in its refusals, `graphify-mcp` from `mise which`, and its header; a stub `mise` in its selftest and three checks.
- **`tools/policy/tool-settings.json`:** `graphifyVersion` and `graphifyVersionMeans` removed; `describes`, `graphifySemanticExtensionsMeans`, `gatedBy` and `provenance` repointed, and `whatItDoesNOTDo` says the record holds no tool's version.
- **Comments:** `scripts/hooks/guard-git.mjs` and `tools/harness/graph.py`, each where it named the key.
- **`git-hooks.yml`:** `.mise/locks/**` in `check-toolchain-selftest`'s glob, and the dev container's ignore file in both toolchain jobs'; `mise.toml`, `package.json` and `package-lock.json` in `code-graph-selftest`'s; and each comment.
- **`README.md` and `scripts/README.md`:** the code graph's row in § Working here; the rows of `check:toolchain`, `code-graph:selftest` and `scripts/code-graph.mjs`, and the push rows of both; the layout's `mise.lock` row and a row for `.mise/locks/`; and what § Setup's `mise install` fetches.

**Figures.**

- 7 tools pinned: 6 locked for 5 platforms, 30 platform entries, and graphify by a uv lock of 69 packages. The maintainer's `mise lock --platform linux-x64,linux-arm64,macos-arm64,macos-x64,windows-x64` on 2026-10-04 printed "Updated 30 platform entries (5 skipped)", then "Using CPython 3.13.15" and "Resolved 69 packages" from uv; `grep -c '^\[\[package\]\]'` on the `uv.lock` gives 69; `npm run check:toolchain` passes.
- 58 packages installed under CPython 3.12.15 in 1.3 s: the maintainer's `mise install --locked` on macOS arm64, 2026-10-04, with uv's cache warm from the spike.
- The `uv.lock`'s sha256, `2233fdc8…`, which `mise.lock` records: `shasum -a 256` on it.
- 80 cases in `check:toolchain:selftest`, 5 of them controls, and 45 checks in `code-graph:selftest`: each selftest; their costs are on their jobs in `git-hooks.yml`.

### D-35 · mise is the task runner: every task moves from `package.json` to `tasks.toml`, but `prepare` and `calculator:serve`

**Recorded 2026-10-04**, carried by `asdlc-openspec-8juz.6`, a child of `asdlc-openspec-8juz`. On 2026-10-03 the maintainer chose to move the scripts to mise tasks and keep the hook runner, among the choices D-31 records. The spike `asdlc-openspec-8juz.1` measured the move first, and its findings set items 4 and 5; `asdlc-openspec-8juz.5` put every reader of the manifest behind one loader before it. The session that worked the issue chose items 6 and 7.

**Builds on / amends:** amends D-02, D-03, D-04, D-11, D-19, D-20, D-22, D-23, D-24, D-26, D-28 and D-29, whose numbered items name a task's command as `npm run <task>`: `git grep -n -E "npm run|node --run" docs/decisions.md` at `95c3e1a`, read entry by entry. Builds on D-31, whose `mise.toml` and `check:toolchain` this entry extends and whose setup makes mise required already; on D-12, under which a prompt's budget falls to its new count; and on D-07, which leaves a change to `mise.toml`, `.github/**`, `CLAUDE.md`, a budget or this register to a person.

**Decision.**

1. **`tasks.toml` holds every task the repository runs by name**, each a table with `run` and an optional `description`, every other key refused by `scripts/lib/tasks.mjs`, since a key such as `depends`, `dir` or `env` would make mise run it otherwise than the command every reader sees. `mise.toml` includes it through `[task_config] includes = ["tasks.toml"]` and defines no task of its own, so a task's edit is not an edit to the file D-31 puts on the reviewer's floor.
2. **`package.json` keeps two scripts and no more.** `prepare`, which `npm ci` runs after an install and nothing else can name; and `calculator:serve`, the command `openspec/specs/calculator-local-server/spec.md` names, which a person runs after `npm ci` alone. Moving it would change a requirement, which goes through `change-propose`.
3. **Every hook job, CI step, launcher and prompt calls `mise run <task>`.** `runTask` in `scripts/hooks/_shared.mjs` launches `mise run --quiet` in a checkout with a `tasks.toml` and `npm run --silent` in one without, and refuses a task that checkout's own manifest lacks. `scripts/fresh-run.mjs` launches the same way, hands a task its arguments after its name with no `--`, which mise would take for itself, refuses a commit with neither manifest, and sets `MISE_TRUSTED_CONFIG_PATHS` to its clone, which shares no trust, so a `mise run` there writes no trust entry for a directory that is gone a minute later.
4. **`[task_config] dir = "{{cwd}}"`, with `runTask`'s refusal, is the mitigation for a task a worktree lacks.** mise reads every config from the working directory up, so in a worktree under `.claude/worktrees/` such a task resolved to the primary checkout's definition and ran in the primary checkout: a gate passed on the wrong tree. With the line it runs against the worktree's own files, and fails where they lack its script.
5. **`[settings] task.output = "interleave"`, `task.quiet = true` and `task.timings = false`**, under which a task prints only what its command prints, as `node --run` did. `check:toolchain` admits these three by name under `task`, and refuses any other `task.*` setting, as D-31 item 6 asks of a setting.
6. **`check:jobs` holds the move.** A job's token resolves in the registry its launcher reads: `mise run`, the tasks; `npm run` and `node --run`, `package.json` alone, so a job left on the old launcher fails at the push that keeps it. Beside a `tasks.toml`, `package.json` holds exactly the two scripts of item 2 and `tasks.toml` neither of them; `mise.toml` defines no task, and its `[task_config]` holds item 1's `includes` and item 4's `dir`. A tree from before the move, which the loader still reads, is held as before.
7. **The `add-npm-script` skill becomes `add-task`**, the disposition "Move the paragraph, not the file" of `docs/retired/README.md` § The three dispositions: every paragraph moved, rewritten for `tasks.toml`, and nothing was left behind, so `git show 95c3e1a:.claude/skills/add-npm-script/SKILL.md` is the old text. `README.md` § The npm scripts becomes § The tasks. `CLAUDE.md` § The script suffix contract keeps its heading, which this register cites.

**Why.** D-31 made mise the one home of every tool version, and the tasks were the last thing a second tool held: `node --run` ran them with `node_modules/.bin` on `PATH`, `npm run` in CI, each its own launcher. With mise required, one tool reads both, and `runTask` already chose the launcher by the manifest. Four alternatives lost:

- **Keeping the scripts in `package.json`.** Nothing changes, and two tools go on reading two registries for one checkout, where D-31 chose one.
- **The tasks in `mise.toml` itself.** One file fewer, but every task's edit becomes an edit to a file on the reviewer's floor, which a person merges.
- **`MISE_CEILING_PATHS` against the parent config.** The spike found it the only setting that stops the borrowing outright, and only as an environment variable naming a machine's own absolute path, which no tracked file can set for every process that runs mise.
- **Moving `prepare` and `calculator:serve` too.** `npm ci` runs `prepare` from `package.json` and nowhere else, and the living spec names `npm run calculator:serve`.

Where it loses:

- **Latency.** LATENCY-FIGURES
- **A failing gate gains one line**, `[<task>] ERROR task failed`, on stderr after its own output, even with `task.quiet`.
- **Two registries stay.** `npm run <name>` for any name but item 2's fails with npm's "Missing script", and a reader looks in two files for a name; `check:jobs` keeps the split, and nothing keeps a person from typing the old command.
- **`dir = "{{cwd}}"` changes where a borrowed task runs, not whether it is borrowed.** In a worktree cut before this entry, with no `tasks.toml`, a person or a prompt that types `mise run <task>` runs the primary checkout's definition on that worktree's files, which pass or fail as that definition finds them; `runTask` refuses such a task, but a hand-typed one is unguarded. And a task started from a subdirectory resolves its `scripts/` paths there, and fails.
- **`node_modules/.bin` is not on a task's `PATH`**, as it was under `node --run`. No gate spawns a package's binary by its bare name, and all 39 pre-push gates gave the same exit status both ways in the spike; a task that needs one names its path.

**What changed.**

- **This register:** this entry, its table row, the status line and the bound; the amendments under D-02, D-03, D-04, D-11, D-19, D-20, D-22, D-23, D-24, D-26, D-28 and D-29; the preamble's `check:register` command; the Applied-as cells of D-19, D-20, D-24 and D-26.
- **`tasks.toml`:** new, every script `package.json` had but `prepare` and `calculator:serve`, with a header. **`package.json`:** those two scripts alone. **`mise.toml`:** `[task_config]`, the three `task.*` settings and the comments that give each its reason.
- **`scripts/check-jobs.mjs`:** item 6, its header and its selftest, whose fixture is now the five files it reads. **`scripts/check-toolchain.mjs`:** the three settings admitted by their dotted paths, a case for a `task.*` setting it does not admit, and its task_config cases editing the live file's table.
- **`scripts/fresh-run.mjs`:** item 3's launch, trust and refusal, and its selftest's fixture in a `tasks.toml`, with a case each for a commit from before the move and one with neither manifest. **`scripts/hooks/_shared.mjs`:** `taskLaunch` names the manifests by the loader's constants. **`scripts/hooks/gate-summary.selftest.mjs`:** a case for a checkout with neither manifest.
- **`git-hooks.yml`:** `mise run` in every job, `tasks.toml` and `mise.toml` in the globs of the jobs that read them, `tasks.toml` in the five whose verdict turns on a task's command, the manifest and lockfile in `tests-fresh-selftest`'s, and the header's launcher paragraph from the spike's measurements. **`.github/workflows/verify.yml`:** `mise run` in every step.
- **Prompts:** `npm run <task>` and `node --run <task>` became `mise run <task>` in `CLAUDE.md`, the skills, the agents, the workflows' literals and the worktree briefing's template, and a `--` before a task's arguments was dropped; the budgets of the prompts whose count fell, fallen with them, and the moved skill's row. **`.claude/prompt-cases/`:** its README's command; the three cases whose text spells `npm run gates` are unchanged, since a stored case is written and validated through the prompt reviewer's workflow (`.claude/prompt-cases/README.md` § How a case is made, stored and judged), and the spelling bears on none of the decisions they hold.
- **The rest:** the same in `README.md`, `docs/playbook.md`, `count-index.md`, the READMEs under `scripts/`, `apps/calculator/` and `openspec/`, the `.devcontainer/` files, the policy records, `tools/harness/harness.config.json`, and the headers and messages of the scripts and tools that name a task, with the selftests that assert them; each line that quotes a dated incident or measurement kept as it was. **`apps/calculator/binding-surface.md`:** its test command, which moves the surface's hash, so the 15 trace lines of `page.test.js`, `serve.test.js` and `server.test.js` that cite it are cited again, each test otherwise unchanged. **Regenerated:** `artifacts/trace/`, `artifacts/coupling/cochange.json` and `artifacts/thresholds/baseline.json`, whose banners name their emitters' commands.

**Figures.**

FIGURES

### R-01 · Anything holding a maintainer's credentials can approve a high-risk pull request

**Recorded 2026-09-25**, carried by `asdlc-openspec-mi6`.

**Builds on / amends:** builds on D-07, whose approval label it is about.

**Risk.** The reviewer counts the approval label when a non-bot account with write access applies it after the verdict on the head. The sessions that work here run `gh` with the maintainer's own credentials. An agent that applied the label would therefore count as the maintainer, and a high-risk pull request would merge without a person having read it. `CLAUDE.md` § Git workflow forbids an agent to apply it; no guard refuses one.

**Why.** It is accepted for now because the alternative needs an identity the repository does not yet have. GitHub cannot tell two sessions of one account apart. The fix is either for agents to act under an identity of their own, a bot account or a GitHub App, whose approval the reviewer refuses; or a guard that refuses the command in session. `asdlc-openspec-g1b` carries it.

**What changed.** Nothing yet, beyond the rule in `CLAUDE.md` § Git workflow.

**Figures.** None.

> **Amended 2026-09-26 by D-09.** A guard now refuses one: `scripts/hooks/guard-git.mjs` refuses, from any checkout, a session's `gh` command that applies the approval label, where the Risk and What changed above say nothing did. It reads only the command line of a session's Bash call, so the risk stands for a label applied through the web UI, curl, a browser tool, a GraphQL mutation (which names a label by its id), a program the command starts, or anything outside a session.

> **Amended 2026-09-30 by D-18.** The guard no longer reads through an `rtk` prefix. On a machine that still runs RTK, `rtk gh pr edit --add-label` with the approval label joins the list above of what it does not see.
