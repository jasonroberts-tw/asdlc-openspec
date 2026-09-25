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
Every tracker write below sits inside the bracket `CLAUDE.md` § The task store describes. Every
question below that recommends an option takes the form
`CLAUDE.md` § A question shows where its recommendation loses gives.

## 1. Find the change and its epic

- **The change.** Its name is found as `CLAUDE.md` § Product work runs as OpenSpec-format changes
  says. The branch is `agent/<change>`. From the primary checkout, enter the worktree with
  `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns. If none
  or several come back, stop and say what was found.

## 2. Take the next task

A child already in progress (`bd list --parent <epic> --status in_progress --json`) is one an
earlier session claimed and did not close. Take it first: its notes and the branch's commits since
it was claimed (`git log`) show how far it got.

Otherwise run `bd ready --parent <epic> --json`, take the first task it lists, read it, and claim it
with `bd update <id> --claim`.

If nothing is ready but children are still open, read why with `bd ready --explain` and report it.
Never work around a blocker.

If no child is open at all and the epic's latest note is a send-back from `change-verify`, it names
the gap in the code to fix. Fix it, prove it and commit it as step 3 says, note on the epic what was
fixed and in which commit subject, then go to step 6.

## 3. Build it, and prove it

Run `.claude/workflows/build-change-task.js` with the Workflow tool, once for the task, with
`scriptPath` set to that file inside the worktree, so the script and the policy it reads come from
one commit. Its header says what each argument means and what it returns. Pass:

- `task`, the task's id, title and body as `bd show <id>` prints them; `change`; `worktree`, as
  `git rev-parse --show-toplevel` prints it there; and `branch`.
- `kind`, the `assetLabels` key in `tools/policy.json` for what the task mainly changes.
  `buildReviewLenses` there maps it to the review's lenses, and the workflow reads the rest of the
  review's sizes from that file itself.
- `lenses`, only where the task needs its own probes, mutations or cases for a lens its kind runs;
  `guide`, only where the builder needs a reading order; `settled`, for what the user or an earlier
  run has already decided, read from the task's notes and the design, not from an earlier
  session's conversation.

Then act on what it returns:

- **`stopped`.** `spec-contradiction` is a spec that is wrong (§ 5). `proof-failing` and
  `agent-died`: find the cause, fix it or run the workflow again, and report it if neither works;
  never commit around it. `refused`: correct what `why` names and run it again. `nothing-major` and
  `round-limit`: carry on below.
- **Each `unverified` finding:** judge it yourself against the delta specs, the design and the task.
  Fix one that holds, and ask the user about one you cannot settle.
- **Each of `followUps`:** file it as out of scope (§ 5), once a search of the tracker finds no match.
- **Each of `unplanned`:** in scope but missing from the plan (§ 5).
- **`listeners.leftBehind`:** stop each process, and say so in the report. Where
  `listeners.checked` is false, list the listeners on `127.0.0.1` yourself.
- **`fixUnreviewed`:** read the last fix's diff before you commit.

Then, whatever the workflow reported:

- Run the proof the task names yourself, and see it pass as measured. A proof you did not run is not
  a proof.
- Regenerate every derived artifact the change touches with its emitter, never by hand.
- Put any doubt about a scenario's expected value to the user, and have the answer, before the
  commit below (§ 5). `build.decisions` and `lastFix.decisions` can raise one.
- Commit, with the message passed from a file under `.scratch/`, naming the task's id.

After a spec revision (§ 5), run the workflow for the task again. Whenever it runs again for a task,
`settled` carries the revision and each answer the user gave to a doubt.

## 4. Close it

Run `bd close <id> --reason "<the subject of the commit that built it>"`. The subject, never the id:
`change-finalize` rebases the branch and its pull request is rebase-merged
(`docs/decisions.md` § D-02), and each of them rewrites every commit id.

## 5. What the build turns up

- **A review finding** blocks the task only when the code contradicts the spec, the design or the
  task. A behaviour the code gets right but no scenario proves is out of scope, filed as below, so
  review does not loop on coverage.
- **A scenario that a known-wrong implementation satisfies**, every WHEN and THEN as written, is a
  spec that is wrong (below), not a coverage gap: the spec states the behaviour, and the scenario
  that states it cannot fail.
- **A doubt about a scenario's expected value**, whether you hold it yourself or a decision the
  build reports raises it: put it to the user before the task that encodes the value is committed,
  and never hold it for the report in step 6. Every task built on the value before the user
  reverses it is rework. Record the answer on the task with `bd note`, where a later session's
  `settled` finds it.
- **A test whose assertions depend on the environment**, such as whether a port is free, fails or
  skips visibly where the environment is not the one it needs, and never passes on a weaker branch
  that asserts less. A pass on the weaker branch prints the same as a pass on the full one.
- **Out of scope**, such as a defect nearby or a gap somewhere else: file it with
  `bd create "<title>" -l <the repo: label>,<its found-at label>,<its asset: labels> --deps discovered-from:<epic> --body-file <file> --silent`,
  with the labels `CLAUDE.md` § The task store names; here the found-at label is build's.
  Give it no `spec-change` label, so it joins the general queue, and carry on. Never fold it into
  this change unannounced.
- **In scope but missing from the plan:** add it as a new child of the epic, once the user agrees,
  and label the epic for plan (`CLAUDE.md` § Product work runs as OpenSpec-format changes).
- **A spec that is wrong**, meaning a scenario that cannot hold as written or a requirement that is
  missing: stop and tell the user. Revise the delta spec first, under the grammar `change-propose`
  gives, then the design where it is affected, then the plan, and commit that revision on its own,
  before the code it allows. The code never outruns the spec. Label the epic for each stage whose
  file the revision changed (`CLAUDE.md` § Product work runs as OpenSpec-format changes).

## 6. Repeat, then hand over

Go back to step 2 until
`bd list --parent <epic> --status open,in_progress,blocked,deferred --json` prints an empty list.

Then run `npm run gates` and report each task closed with its commit, every issue filed along the
way, and the gates as measured. The next stage is `change-verify`, in a fresh session given the
change's name (`CLAUDE.md` § Product work runs as OpenSpec-format changes).
