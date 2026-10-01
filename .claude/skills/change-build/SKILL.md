---
name: change-build
description: Implement a planned change's tasks one at a time in its worktree - claim, build, prove, commit, close - until nothing under its epic is open. Use after change-plan, when asked to build or implement a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Build a change

## 1. Find the change and its epic

- **The change.** Its name is found as `CLAUDE.md` § Product work runs as OpenSpec-format changes
  says. From the primary checkout, enter the worktree with `EnterWorktree` and the path
  `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy.json`). If none or several come back, stop and say
  what was found.

## 2. Take the next task

Take a child already in progress (`bd list --parent <epic> --status in_progress --json`) first: its
notes and the branch's commits since it was claimed (`git log`) show how far it got.

Otherwise run `bd ready --parent <epic> --json`, take the first task it lists, read it, and claim it
with `bd update <id> --claim`.

If nothing is ready but children are still open, read why with `bd ready --explain` and report it.
Never work around a blocker.

If no child is open at all and the epic's latest note is a send-back, it names what to fix: from
`change-verify`, a gap in the code; from `change-finalize`, each test `trace:check` refused after
the archive. Retire each on a removed ID, with the decision the header of
`scripts/check-test-inventory.mjs` asks for, and regenerate each on a modified one, or fix the gap,
as step 3 says; each commit names the task `artifacts/trace/record.json` lists beside the test's
file. Note on the epic what was fixed and in which commit
subject, then go to step 6.

## 3. Build it, and prove it

Run `.claude/workflows/build-change-task.js` with the Workflow tool, once for the task, with
`scriptPath` set to that file inside the worktree. Its header says what each argument means and what
it returns. Pass each as it says, reading `settled` from the task's notes and the design, not from
an earlier session's conversation.

Then act on what it returns:

- **`stopped`.** `spec-contradiction` is a spec that is wrong (§ 5). `proof-failing`, `not-red`
  and `agent-died`: find the cause, fix it or run the workflow again, and report it if neither works;
  never commit around it. After `not-red`, keep the build: for each scenario `why` names, revert
  the change under test, see its proof fail and restore the change before the workflow runs again;
  a discarded build is paid for twice. `refused`: correct what `why` names and run it again.
  `not-independent`: delete every uncommitted file under the app's `independentTestDir`, then as
  `agent-died`. `re-design`: a re-design pass (§ 5). `architect-failing`: never fix the code
  against a test you read, or the fix fits that test; run the workflow again with each route's ID
  and expected text in `settled`, or start a re-design pass. `nothing-major` and `round-limit`:
  carry on below, unless `independent.complete` is false: then as `agent-died`.
- **Each `unverified` finding:** judge it yourself against the delta specs, the design and the task.
  Fix one that holds, and ask the user about one you cannot settle.
- **Each of `followUps`:** file it as out of scope (§ 5), once a search of the tracker finds no match.
- **Each of `unplanned`:** in scope but missing from the plan (§ 5).
- **`listeners.leftBehind`:** stop each process, and say so in the report. Where
  `listeners.checked` is false, list the listeners on `127.0.0.1` yourself.
- **`fixUnreviewed`:** read the last fix's diff before you commit.

Then, whatever the run returned:

- Run the proof the task names yourself, and see it pass as measured.
- Regenerate every derived artifact the change touches.
- After `nothing-major` or `round-limit`, write each of `independent.files` at its path, whole.
- Commit, naming the task's id in the parentheses that close the subject, the only place
  `trace:check` reads it (rule 5 in the header of `tools/trace/trace.ts`).

After a spec revision or a re-design pass (§ 5), run the workflow for the task again. Whenever it
runs again for a task, `settled` carries the revision, each answer the user gave to a doubt, and
each red record.

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
- **A doubt about a scenario's expected value**, whether you hold it yourself or `build.decisions`
  or `lastFix.decisions` raises it: put it to the user before the task that encodes the value is
  committed, and never hold it for the report in step 6. Every task built on the value before the
  user reverses it is rework. Record the answer on the task with `bd note`, where a later session's
  `settled` finds it.
- **A test whose assertions depend on the environment**, such as whether a port is free, fails or
  skips visibly where the environment is not the one it needs, and never passes on a weaker branch
  that asserts less.
- **Out of scope**, such as a defect nearby or a gap somewhere else: file it with
  `foundIssueCommand` in `tools/policy.json`, discovered from the epic, with the labels `CLAUDE.md`
  § The task store names; here the found-at label is build's. Give it no `spec-change` label, so
  it joins the general queue, and carry on. Never fold it into this change unannounced.
- **In scope but missing from the plan:** add it as a new child of the epic, once the user agrees,
  and label the epic for plan (`CLAUDE.md` § Product work runs as OpenSpec-format changes).
- **A spec that is wrong**, meaning a scenario or an NFR that cannot hold as written or a
  requirement that is missing: stop and tell the user; it goes back to `change-propose`. Label the
  epic for propose (`rerouteLabels` in `tools/policy.json`) and note on it what must change and
  why. The code never outruns the spec.
- **A re-design pass**, when the design cannot hold as written: with the user, write a new version
  of `design.md` and of each contract artifact it affects, under
  `.claude/skills/change-design/SKILL.md` § 3. Write it. Commit it alone, named as step 3 says,
  before the code it allows, and label the epic for design. It changes no delta spec: a scenario or
  NFR that must change is a spec that is wrong.
- **After either**, reopen (`bd reopen`) each task that `artifacts/trace/record.json` links to a
  changed NFR, contract element or Binding Surface element, so step 2 builds it and its tests again;
  `trace:check` refuses each test on one as `stale` until then.

## 6. Repeat, then hand over

Go back to step 2 until
`bd list --parent <epic> --status open,in_progress,blocked,deferred --json` prints an empty list.

Then run `npm run trace`, commit the record (THE RECORD in the header of `tools/trace/trace.ts`),
and run `npm run gates`. Hand over only when each of `docs/test-strategy.md` § Build exit criteria
holds, as shown by:

- **Tasks and implementation elements:** the empty list above, each closed `asset:product` child
  among the record's `tasks` with a path, and `trace:check`.
- **The test-builder's declaration, and no open architect decision:** each task committed only as
  § 3 allows, with `independent.complete` not false, and no re-design pass or send-back open (§ 5).
- **Your re-run of the app-builder's suite, and the test inventory:** the app's test script and
  `tests:inventory:check` (the header of `scripts/check-test-inventory.mjs`) among the gates.
- **The mutation threshold:** `thresholds:check` for the Routines; for the Commands, the CI step
  `thresholds:commands:check`, run on the pull request and at `change-verify` (the amendment of
  `docs/decisions.md` § D-04).
- **The contract tests and build-time fitness functions:** the app's script for the `build` stage
  of its `independentTestDir`, such as `calculator:test:independent`, among the gates.

Report each task closed with its commit, every issue filed along the way, and the gates as
measured. The next stage is `change-verify`, given the change's name (`CLAUDE.md` § Product work
runs as OpenSpec-format changes).
