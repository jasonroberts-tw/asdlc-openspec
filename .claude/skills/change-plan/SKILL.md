---
name: change-plan
description: Turn a reviewed change into tasks - child issues of its epic in bd, each tied to the scenarios it satisfies and the test or gate that proves it - and write the epic's acceptance criteria, once the user approves the draft. Use after change-propose (and change-design, where one was written), when asked to plan a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Plan a change

The third of the six `change-*` stages (`docs/decisions.md` § D-02). Every tracker write below sits
inside the bracket `CLAUDE.md` § The task store describes. Every question below that recommends an
option takes the form `CLAUDE.md` § A question shows where its recommendation loses gives.

## 1. Find the change and its epic

- **The change.** Its name is found as `CLAUDE.md` § Product work runs as OpenSpec-format changes
  says. From the primary checkout, enter the worktree with `EnterWorktree` and the path
  `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy/vocabulary.json`). If none or several come back, stop and
  say what was found.

Read the proposal, its `findings.md` where there is one, every delta spec, and the design, or else
the note on the epic in which `change-design` ruled one out. With neither, `change-design` has not
run: stop and say so. A draft already at `.scratch/<change>-plan.md` is an earlier session's; take
it to step 3 rather than drafting again.

## 2. Draft the tasks and the epic's criteria

Write the draft to `.scratch/<change>-plan.md`, not to the tracker. List the tasks in dependency
order. Give each one:

- **A title** that says what exists once it is done.
- **Its kind**: the `assetLabels` key in `tools/policy/vocabulary.json` for what it mainly changes.
- **The scenarios and NFRs it satisfies**, as `[<ID>] <title>` from the delta specs.
- **Its proof**: the test, gate or check that proves it, named precisely enough to run. A scenario
  the test environment cannot observe is proved by an automated test in a real browser, or the task
  names the open issue that carries one; never by hand, a check no later change repeats
  (`docs/decisions.md` § D-13, item 7).
- **The tasks it waits on.**

Then check the draft as a whole, and fix what fails before § 3. The first three are traceability
rules 1 to 3 (`docs/decisions.md` § D-13, items 6 and 14), which no gate reads:

- **Rule 1:** every scenario ID in every delta spec is named by a task.
- **Rule 2:** every NFR is in a fitness record's `nfrIds` under `apps/<app>/fitness/`, or a task's
  proof is a test that references it.
- **Rule 3:** every `asset:product` task names an ID, and the draft lists every other task as
  exempt.
- **Each task is small enough** to finish and prove in one sitting, **and whole**: what must land
  together is one task. A new task comes with its job or its `UNJOBBED_BY_KIND` entry in
  `scripts/check-jobs.mjs` (the `add-task` skill), never in a later task: nothing would catch
  the split.
- **Nothing is left out:** regenerating any artifact whose input the change moves, and adding the
  `README.md` row for any new file (`CLAUDE.md` § Every directory and document says what it is, and
  who wins).
- **The living spec is never a task.** The archive in `change-finalize` edits it.

Then draft the epic's acceptance criteria in the same file. They are the bullets under
`## Acceptance Criteria` in the epic's description and its `acceptance_criteria` field, as
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

Show the draft, with its coverage of each ID, its exempt tasks and the epic's criteria. Write nothing
to the tracker until the user approves. Edit the draft as they direct.

## 4. File it

In one bracket, create one child per task, in the draft's order, so that each task's predecessors
already exist:

- **Write each body first**, to its own file under `.scratch/`. It carries the IDs, the proof and
  what done means.
- **Create the child:**
  `bd create "<title>" --parent <epic> --no-inherit-labels -l spec-change,<its repo: label>,<its kind> --body-file <that file> --deps blocked-by:<predecessor id> --silent`.
  Several predecessors go in the one flag, comma-separated:
  `--deps blocked-by:<id>,blocked-by:<id>` (`bd create --help`). Leave out `--deps` for a task that
  waits on nothing.
- **Its labels are those three alone:** `spec-change`, which keeps it out of the general queue, the
  epic's `repo:` label, and its kind, which rule 3 reads. The epic's `asset:`, found-at and reroute
  labels are not the task's.

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
each task's id with its kind and the IDs it covers, and the first ready task.
