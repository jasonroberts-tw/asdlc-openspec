---
name: change-verify
description: Check a built change against its specs before it lands - every task closed, the specs valid and applicable, every scenario traced to a proof that was run, the gates green - and refuse on any gap. Use after change-build, when asked to verify a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Verify a change

The fifth of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's worktree
and only reads. When it finds a gap, the gap is fixed in the stage that owns it, and verification then
runs again from step 2.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns. If none
  or several come back, stop and say what was found.

## 2. Every task is closed

`bd list --parent <epic> --status open,in_progress,blocked,deferred --json` prints an empty list.

Anything else goes back to `change-build`.

## 3. The specs are valid, and apply

`npm run openspec:check` passes. That means every delta validates strictly, and the change applies to
the living spec as it stands on this branch.

## 4. Every scenario is traced

Write the trace to `.scratch/<change>-trace.md`, one row per `#### Scenario:` in every delta spec.
Each row gives the capability, the scenario, its proof and the result as measured. The proof is one of:

- the test, gate or check that exercises the scenario, together with the result of running it now;
- the manual verification the plan recorded, and who did it.

A row is a gap when:

- the scenario has no proof;
- the proof does not exercise what the scenario states. Read the test; never trust its name;
- the proof fails.

Where there is a `design.md`, read it too: a decision the code does not follow is a gap.

## 5. The gates are green

`npm run gates` passes.

## 6. Verdict

- **Any gap:** report each one with its file and scenario, then stop. The code is fixed in
  `change-build`, or the spec is revised with the user in `change-propose`, and verification runs again
  from step 2.
- **No gap:** report the trace and the gates as measured. The trace goes into the pull request's body.
  The next stage is `change-finalize`.
