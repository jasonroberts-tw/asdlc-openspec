---
name: change-plan
description: Turn a reviewed change into tasks - child issues of its epic in bd, each tied to the scenarios it satisfies and the test or gate that proves it - once the user approves the draft. Use after change-propose (and change-design, where one was written), when asked to plan a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Plan a change

The third of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's
worktree. A change's tasks are issues in `bd` under its epic, never a `tasks.md`. Every tracker write
below sits inside the bracket `CLAUDE.md` § The task store describes.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns. If none
  or several come back, stop and say what was found.

Read the proposal, every delta spec, and the design where there is one.

## 2. Draft the tasks

Write the draft to `.scratch/<change>-plan.md`, not to the tracker. List the tasks in dependency
order. Give each one:

- **A title** that says what exists once it is done.
- **The scenarios it satisfies**, each as `<capability>: <scenario name>` taken from the delta specs.
- **Its proof**: the test, gate or check that proves it, named precisely enough to run.
- **The tasks it waits on.**

Then check the draft as a whole:

- **Every scenario in every delta spec is covered** by at least one task, or is marked manual,
  saying who verifies it and how.
- **Each task is small enough** to finish and prove in one sitting.
- **Nothing is left out:** regenerating any artifact whose input the change moves, and adding the
  `README.md` row for any new file (`CLAUDE.md` § Every directory and document says what it is, and
  who wins).
- **The living spec is never a task.** The archive in `change-finalize` edits it.

## 3. Stop for approval

Show the draft, with its scenario-by-scenario coverage. Write nothing to the tracker until the user
approves. Edit the draft as they direct.

## 4. File it

In one bracket, create one child per task, in the draft's order, so that each task's predecessors
already exist:

- **Write each body first**, to its own file under `.scratch/`. It carries the scenarios, the proof
  and what done means.
- **Create the child:**
  `bd create "<title>" --parent <epic> --body-file <that file> --deps blocked-by:<predecessor id> --silent`.
  Leave out `--deps` for a task that waits on nothing.
- **Keep the labels it inherits.** Each child inherits the epic's labels, `spec-change` and the
  `repo:` label, and must keep both. The first keeps it out of the general queue, and the second is
  where its work lands.

Afterwards, `bd ready --parent <epic>` lists exactly the tasks that wait on nothing.

## 5. Report

Report the epic, each task's id with the scenarios it covers, what was marked manual, and the first
ready task. The next stage is `change-build`.
