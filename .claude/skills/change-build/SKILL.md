---
name: change-build
description: Implement a planned change's tasks one at a time in its worktree - claim, build, prove, commit, close - until nothing under its epic is open. Use after change-plan, when asked to build or implement a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Build a change

The fourth of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's
worktree until no child of the change's epic is open. The general queue never offers these tasks,
because their `spec-change` label (`specChangeLabel` in `tools/policy.json`) keeps them out, so
this stage is the only one that works them.
Every tracker write below sits inside the bracket `CLAUDE.md` § The task store describes.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns. If none
  or several come back, stop and say what was found.

## 2. Take the next task

Run `bd ready --parent <epic> --json`, take the first task it lists, read it, and claim it with
`bd update <id> --claim`.

If nothing is ready but children are still open, read why with `bd ready --explain` and report it.
Never work around a blocker.

## 3. Build it, and prove it

- Make the change the task describes.
- Run the proof the task names, and see it pass as measured. A proof you did not run is not a proof.
- Regenerate every derived artifact the change touches with its emitter, never by hand.
- Commit, with the message passed from a file under `.scratch/`, naming the task's id.

## 4. Close it

Run `bd close <id> --reason "<short commit id>: <what now exists>"`.

## 5. What the build turns up

- **Out of scope**, such as a defect nearby or a gap somewhere else: file it with
  `bd create "<title>" -l <the repo: label> --deps discovered-from:<epic> --body-file <file> --silent`.
  Give it no `spec-change` label, so it joins the general queue, and carry on. Never fold it into
  this change unannounced.
- **In scope but missing from the plan:** add it as a new child of the epic, once the user agrees.
- **A spec that is wrong**, meaning a scenario that cannot hold as written or a requirement that is
  missing: stop and tell the user. Revise the delta spec first, under the grammar `change-propose`
  gives, then the plan. The code never outruns the spec.

## 6. Repeat, then hand over

Go back to step 2 until
`bd list --parent <epic> --status open,in_progress,blocked,deferred --json` prints an empty list.

Then run `npm run gates` and report each task closed with its commit, every issue filed along the
way, and the gates as measured. The next stage is `change-verify`.
