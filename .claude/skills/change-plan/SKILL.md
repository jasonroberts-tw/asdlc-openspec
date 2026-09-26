---
name: change-plan
description: Turn a reviewed change into tasks - child issues of its epic in bd, each tied to the scenarios it satisfies and the test or gate that proves it - and write the epic's acceptance criteria, once the user approves the draft. Use after change-propose (and change-design, where one was written), when asked to plan a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Plan a change

The third of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's
worktree. A change's tasks are issues in `bd` under its epic, never a `tasks.md`. Every tracker write
below sits inside the bracket `CLAUDE.md` § The task store describes. Every question below that
recommends an option takes the form `CLAUDE.md` § A question shows where its recommendation loses
gives.

## 1. Find the change and its epic

- **The change.** Its name is found as `CLAUDE.md` § Product work runs as OpenSpec-format changes
  says. The branch is `agent/<change>`. From the primary checkout, enter the worktree with
  `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy.json`). If none or several come back, stop and say
  what was found.

Read the proposal, every delta spec, and the design, or else the note on the epic in which
`change-design` ruled one out. With neither, `change-design` has not run: stop and say so. A draft
already at `.scratch/<change>-plan.md` is an earlier session's; take it to step 3 rather than
drafting again.

## 2. Draft the tasks and the epic's criteria

Write the draft to `.scratch/<change>-plan.md`, not to the tracker. List the tasks in dependency
order. Give each one:

- **A title** that says what exists once it is done.
- **The scenarios it satisfies**, each as `<capability>: <scenario name>` taken from the delta specs.
- **Its proof**: the test, gate or check that proves it, named precisely enough to run.
- **The tasks it waits on.**

Then check the draft as a whole:

- **Every scenario in every delta spec is covered** by at least one task, or is marked manual,
  saying who verifies it and how.
- **Each task is small enough** to finish and prove in one sitting, **and whole**: what must land
  together is one task. A new npm script comes with its job or its `UNJOBBED_BY_KIND` entry in
  `scripts/check-jobs.mjs` (the `add-npm-script` skill), never in a later task. `change-build`
  commits each task on its own and runs `npm run gates` once, at the end, and no pre-commit job runs
  `check:jobs` (`lefthook.yml`), so nothing would catch the split.
- **Nothing is left out:** regenerating any artifact whose input the change moves, and adding the
  `README.md` row for any new file (`CLAUDE.md` § Every directory and document says what it is, and
  who wins).
- **The living spec is never a task.** The archive in `change-finalize` edits it.

Then draft the epic's acceptance criteria in the same file. The reviewer holds the change's pull
request to them, and `change-finalize` checks them before it closes the epic. They are the bullets
under `## Acceptance Criteria` in the epic's description and its `acceptance_criteria` field, as
`bd show <epic> --json` prints them. An epic that already states criteria, as one seeded from an
issue with criteria does, keeps them: the draft lists them as they stand. An epic with none gets
them drafted here:

- **What "done" means around the code**, which no scenario states: what the change's documents say,
  whether a dependency was added, what the pull request carries, such as the archive folder, and the
  state of the worktree and branch after the merge. A criterion restates no scenario:
  `change-verify` already traces every scenario to its proof.
- **Each one checkable** by a command or a file that shows whether it holds, as
  `.claude/skills/change-finalize/SKILL.md` § 8. Clean up, check the epic's criteria, and close it
  reports it.

## 3. Stop for approval

Show the draft, with its scenario-by-scenario coverage and the epic's criteria. Beside a criterion
only the merge can settle, such as the worktree gone, say that the reviewer cannot verify it from the
pull request and so hands the merge to a person
(`.claude/skills/change-finalize/SKILL.md` § 7. Merge, through the reviewer). Write nothing to the
tracker until the user approves. Edit the draft as they direct.

## 4. File it

In one bracket, create one child per task, in the draft's order, so that each task's predecessors
already exist:

- **Write each body first**, to its own file under `.scratch/`. It carries the scenarios, the proof
  and what done means.
- **Create the child:**
  `bd create "<title>" --parent <epic> --body-file <that file> --deps blocked-by:<predecessor id> --silent`.
  Several predecessors go in the one flag, comma-separated:
  `--deps blocked-by:<id>,blocked-by:<id>` (`bd create --help`). Leave out `--deps` for a task that
  waits on nothing.
- **Keep the labels it inherits.** Each child inherits the epic's labels, `spec-change` and the
  `repo:` label, and must keep both. The first keeps it out of the general queue, and the second is
  where its work lands.

In the same bracket, write the criteria the draft drafted; an epic that kept its own needs no write.
`bd update --body-file` replaces the whole description, so build the file from the description as it
stands after the bracket's pull: write the `description` that `bd show <epic> --json` prints,
unchanged, to `.scratch/<change>-epic-description.md`, and end it with a `## Acceptance Criteria`
section holding the approved criteria as bullets. Then run
`bd update <epic> --body-file .scratch/<change>-epic-description.md`, and read the epic back to
check that it holds its earlier description and the criteria.

Afterwards, `bd ready --parent <epic>` lists exactly the tasks that wait on nothing.

## 5. Report

Report the epic, its acceptance criteria and whether this stage wrote them or the epic kept its own,
each task's id with the scenarios it covers, what was marked manual, and the first ready task. The
next stage is `change-build`, in a fresh session given the change's name
(`CLAUDE.md` § Product work runs as OpenSpec-format changes).
