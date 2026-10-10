# The words this repository uses

**The glossary: each word this repository gives a meaning of its own, with the file that decides
it.** Where a definition here and the file it cites disagree, that file wins, and this one is what
needs correcting. Where either disagrees with the register (`docs/decisions.md` and
`docs/decisions/`), the register wins. A worktree's briefing is `.worktree/CONTEXT.md`, not this.

## The work and the tracker

**issue**:
One unit of work in the tracker, with an id such as `asdlc-openspec-zgh`; also called a bead. Every
task is one, never a checklist (`CLAUDE.md` § The task store).

**`bd`**:
The tracker's command-line tool. Its database syncs through the git remote and is never committed
(`README.md` § How it is laid out).

**the queue**:
What `bd ready` lists: the open issues nothing blocks (`CLAUDE.md` § The task store).

**tracker bracket**:
`bd dolt pull` before a run's first tracker write and `bd dolt push` after its last. A rejected push
is reported, never forced (`CLAUDE.md` § The task store).

**premise**:
What an issue claims is true of the repository, checked against the trunk before any work
(`.claude/skills/bead/SKILL.md` § 1. Verify the premise before any work).

**found issue**:
An issue a run files `discovered-from` the one it worked. It carries a `foundAtLabels` label and
`assetLabels` labels from `tools/policy/vocabulary.json` (`CLAUDE.md` § The task store).

**harness**:
Everything in this repository that runs the work: the rules, skills, agents, gates, hooks, tools and
documents. A harness change takes the harness route (`docs/playbook.md` § 4.2 The harness route).

**product**:
What the work is done on: the demo calculator's code under `apps/` and its requirements under
`openspec/` (`docs/decisions.md` § D-04).

**trunk**:
`main`. The protected branches are `main` and `release`, and nothing is pushed to either from a
worktree (`CLAUDE.md` § Git workflow).

**worktree**:
A checkout of its own under `.claude/worktrees/<name>`, on the branch `agent/<name>` cut from
`origin/main`, made only through `scripts/new-worktree.sh` (`.claude/README.md`).

**primary checkout**:
The clone a session starts in. The premise is read from here, and a prompt review is launched from
here (`.claude/skills/close-prompt-run/SKILL.md` § 3. Launch the review).

**`.scratch/`**:
The gitignored directory for commit messages, pull-request bodies and tracker notes, each passed to
its tool by file (`CLAUDE.md` § Bash command style).

**`RUN THESE YOURSELF`**:
The block ending a report. It lists, in order, each refused command still needed that no later work
depended on. A comment above each says why it should run, and one below says the result to expect
(`CLAUDE.md` § Guards).

## Product changes

**change**:
A product change: a change to what the product does, stated as requirements. It is one worktree, one
pull request and one epic (`docs/decisions.md` § D-02).

**epic**:
The issue that carries a change. Its tasks are its children. It carries the change label,
`specChangeLabel` in `tools/policy/vocabulary.json`, which keeps them out of the general queue
(`docs/decisions.md` § D-02).

**capability**:
One area of the product's behaviour with a living spec of its own, such as `calculator`
(`openspec/README.md`).

**living spec**:
`openspec/specs/<capability>/spec.md`: what the product does now. It wins over any archived change
(`openspec/README.md`).

**proposal**:
A change's `proposal.md`: why, what changes, the capabilities it touches, and its impact
(`.claude/skills/change-propose/SKILL.md` § 5. Write the proposal).

**delta spec**:
The requirements a change adds, modifies, removes or renames in the living spec. There is one file
for each capability (`.claude/skills/change-propose/SKILL.md` § 6. Write one delta spec per capability).

**requirement, scenario**:
A `### Requirement:` stated with SHALL or MUST, proved by `#### Scenario:` blocks of WHEN and THEN
lines. Each is written so it can become a test (`.claude/skills/change-propose/SKILL.md` § 6. Write
one delta spec per capability).

**design**:
A change's `design.md`, the how, written only when the change needs one
(`.claude/skills/change-design/SKILL.md` § 2. Decide whether it needs a design).

**trace**:
One row per scenario, naming the proof that exercises it and its result as run
(`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced).

**verification report**:
What Verify found, from a fresh run of every test: the status of every ID, the gap analysis, the
tests by layer, the thresholds and the verdict. It goes on the epic and into the pull request, never
into a committed file (`scripts/lib/verify-report.mjs`).

**archive**:
The pinned OpenSpec CLI merging a change's deltas into the living spec and moving the change under
`openspec/changes/archive/`. It runs on the change's branch, before the merge
(`.claude/skills/change-finalize/SKILL.md` § 3. Archive).

**send-back**:
A later stage reopening an earlier stage's work. The epic gets that stage's `rerouteLabels` label,
because the rework lands as commits and never as an issue (`CLAUDE.md` § Product work runs as
OpenSpec-format changes).

## Checks

**check**:
Anything that tests the repository or a tool call and can fail: a gate, a guard, a test, or an
emitter's `:check` twin. The gate ladder runs the same checks at four latencies (`CLAUDE.md` § The
gate ladder).

**gate**:
A check run as a task, `mise run <name>`, that refuses one thing. Its header names the failure it
exists to prevent. Its selftest proves it still refuses, and a root override points it at a fixture
(`CLAUDE.md` § Standing rules for prompts and gates).
_Avoid_: guard, for a gate.

**guard**:
A check run as an in-session hook under `scripts/hooks/` that refuses a tool call, such as
`guard-git.mjs`. Its selftest asserts the reason it refuses for, and it needs no root override
(`CLAUDE.md` § Standing rules for prompts and gates; `scripts/hooks/README.md`).
_Avoid_: gate, for a guard.

**gate ladder**:
The same checks in session, at commit, at push and in CI. A slower tier never trusts a faster one
(`CLAUDE.md` § The gate ladder).

**`mise run gates`**:
The forced full pre-push suite, and the only way to run it by hand (`CLAUDE.md` § The gate ladder).

**register**:
The decisions and risks no agent re-argues, amended and never rewritten. The numbered ones (`D-NN`,
`R-NN`) are in `docs/decisions.md`, frozen at D-59, and each after it is a record under
`docs/decisions/` (`CLAUDE.md` § Decisions live in the register).

**policy file**:
A record under `tools/policy/`, which holds every constant a prompt or a tool reads, each beside a
`Means` sibling saying what it decides (`CLAUDE.md` § Three kinds of file, and never a fourth;
`docs/decisions.md` § D-27).

**count key**:
A `CNT-*` key in `count-index.md`, written where the numeral would go (`count-index.md` § How to use
it).

**pull-request reviewer**:
`.github/workflows/pr-review.yml`. On each pushed head it reviews by the high-risk floor. It approves
a head off the floor, the approval GitHub's auto-merge waits for beside `verify`. On a head on the
floor it comments that a person decides, and a person approves and merges it (`docs/decisions.md`
§ D-57).

**branch review**:
The `branch-reviewer` agent, run before each push. It holds the branch to the cited issues'
acceptance criteria and the house rubrics (`.claude/skills/open-pr/SKILL.md` § 5).

## Prompts and their review

**prompt**:
`CLAUDE.md`, `AGENTS.md`, a skill, an agent, a workflow script's literals, a hook's literals, the
worktree briefing template or `.beads/PRIME.md`. Each is held to a word budget in
`tools/policy/prompt-budgets.json` (the `check:prompts` task's `description` in `tasks.toml`;
`docs/decisions.md` § D-59).

**analysis**:
A run's account of itself, left as a note on the issue it worked, which a prompt review later reads
(`.claude/skills/close-prompt-run/SKILL.md` § 1. Write the analysis, or none).

**prompt review**:
A background session that reads the pending analyses as one batch and proposes prompt edits as one
pull request. That pull request merges as any other does: by GitHub's auto-merge off the high-risk
floor, by a person on it (`CLAUDE.md` § Prompt reviews).
