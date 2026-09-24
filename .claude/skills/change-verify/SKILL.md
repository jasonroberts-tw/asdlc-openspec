---
name: change-verify
description: Check a built change against its specs before it lands - every task closed, the specs valid and applicable, every scenario traced to a proof that was run, the gates green - and refuse on any gap. Use after change-build, when asked to verify a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Verify a change

The fifth of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's worktree
and changes no tracked file: it writes only the trace under `.scratch/` and any issue the user has it
file in step 4. When it finds a gap, the gap is fixed in the stage that owns it (step 6), and verification then
runs again from step 2.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy.json`). If none or several come back, stop and say
  what was found.

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

Where there is a `design.md`, read it too: a decision the code does not follow is a gap, whichever of
the two turns out to be wrong.

A finding that is none of these is not a gap: a test name, a comment or a README row that claims more
than its code does, where no scenario and no design decision states the claim. Name each one in the
report and ask the user where it goes. The routes are the ones for what the build turns up
(`.claude/skills/change-build/SKILL.md` § 5. What the build turns up). It becomes a new child of the
epic, which reopens step 2 until `change-build` closes it, or a follow-up filed outside the change.
File it as the user decides, inside the bracket `CLAUDE.md` § The task store describes.

**Running again.** The trace's first line names the commit it was taken at. On a run from step 2
after a fix or a rebase, read `git diff <that commit>`. A row keeps its reading when the diff changes
its scenario, its proof and the code the proof exercises only in comments or prose; every other row
is traced again, and so is every design decision the diff changes. Every proof is run again either
way, and each row carries the new result.

## 5. The gates are green

`npm run gates` passes.

## 6. Verdict

- **Any gap:** report each one with its file and its scenario or design decision, and which side you
  believe is wrong and why, then stop. The user picks the route: the code is fixed in `change-build`;
  the spec is revised with the user in `change-propose`; or, where the code is right and the design
  is not, the design is revised with the user in `change-design`, with every comment and README row
  that repeated its claim. Verification then runs again from step 2.
- **No gap:** report the trace, the gates as measured and each finding below a gap, with where
  it went. The trace goes into
  the pull request's body. The next stage is `change-finalize`.

Reviewed: `docs/prompt-reviews/change-verify.2026-09-24.md` § Review of 2026-09-24 (run of 2026-09-24 on `add-calculator-web-app`, epic `asdlc-openspec-zgh`).
