---
name: change-verify
description: Check a built change against its specs before it lands - every task closed, the specs valid and applicable, every scenario traced to a proof that was run, the gates green - and refuse on any gap. Use after change-build, when asked to verify a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Verify a change

The fifth of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's worktree
and changes no tracked file: it writes only the fresh run, the trace and the report under `.scratch/`,
any issue the user has it file in step 4, and the epic's label and notes (steps 4 and 6). When it
finds a gap, the gap is fixed in the stage that owns it (step 6), and verification then runs again
from step 2.

## 1. Find the change and its epic

- **The change.** Its name is found as `CLAUDE.md` § Product work runs as OpenSpec-format changes
  says. From the primary checkout, enter the worktree with `EnterWorktree` and the path
  `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy.json`). If none or several come back, stop and say
  what was found.

## 2. Every task is closed

`bd list --parent <epic> --status open,in_progress,blocked,deferred --json` prints an empty list.

Anything else means the build has not finished. Report each child the command printed, with its
status, and stop: steps 3 to 5 would measure code those children have yet to change. The next stage
is `change-build`.

This refusal writes nothing: no trace, no note and no label.

## 3. The specs are valid, and apply

`npm run openspec:check` passes.

## 4. Every scenario is traced

**The fresh run.** `npm run tests:fresh -- <change> --tasks <ids>`, given the task ids and the Bash
timeout the header of `scripts/fresh-run.mjs` names, runs what it names in a clone of HEAD and writes
`.scratch/<change>-verify.json`. For each failing test it prints a
command: run each once, as its own Bash call, and never again, since an unasked retry hides a flaky
test. A test that fails and then passes is flaky, and counts as failing.

**The trace.** Write it to `.scratch/<change>-trace.md`, one row per `#### Scenario:` in every delta
spec. Take it with `.claude/workflows/verify-change-trace.js`, through the Workflow tool, passing the
run as `run`: its header says what to pass, on a run again too, and what each result means. Save
what it returns to `.scratch/<change>-trace.json`, and `node scripts/render-trace.mjs <change>`
writes the trace. The proof is a test the traceability record gives the scenario, or a gate or check
that exercises it, with its result now; a manual verification is none.

A row is a gap when:

- the scenario has no proof;
- the proof does not exercise what the scenario states. Read the test; never trust its name;
- the proof fails.

Where there is a `design.md`, read it too: a decision the code does not follow is a gap, whichever of
the two turns out to be wrong.

A finding that is none of these is not a gap: a test name, a comment or a README row that claims more
than its code does, where no scenario and no design decision states the claim. Name each one in the
report and ask the user where it goes. The routes are the ones for what the build turns up
(`.claude/skills/change-build/SKILL.md` § 5. What the build turns up). File it as the user decides:
a new child labels the epic for plan and for build (`CLAUDE.md` § Product work runs as
OpenSpec-format changes), and a follow-up carries the labels `CLAUDE.md` § The task store names,
with verify's found-at label.

**Traceability rules 1 to 3**, which read the epic's children and no gate holds: every scenario ID
of every delta is named by a task (rule 1); every NFR is in the `nfrIds` of a fitness record under
`apps/<app>/fitness/`, or named by a task whose proof is a test that references it (rule 2); every
child labelled `asset:product` names a scenario or NFR ID (rule 3). A miss is a gap.

**The report.** `node scripts/render-verify-report.mjs <change>` writes it, `.scratch/<change>-verify.md`,
from the run, as the header of `scripts/lib/verify-report.mjs` derives it. It is never committed.

**Running again.** The trace's first line names the commit it was taken at. On a run from step 2
after a fix or a rebase, read `git diff <that commit>`. A row keeps its reading when the diff changes
its scenario, its proof and the code the proof exercises only in comments or prose; every other row
is traced again, and so is every design decision the diff changes. The fresh run is taken again
either way, and each row carries its new result.

## 5. The gates are green

`npm run gates` passes.

## 6. Verdict

- **Any gap**, which includes a failing blocking test, an unmet obligation and a gap-analysis item not
  waived (the report's verdict `reject`): report each one with its file and its scenario, ID or design
  decision, and which side you believe is wrong and why, then stop. The user picks the route: the code is fixed in `change-build`;
  the spec is revised with the user in `change-propose`; or, where the code is right and the design
  is not, the design is revised with the user in `change-design`, with every comment and README row
  that repeated its claim. Label the epic for the stage the user picks (`CLAUDE.md` § Product work
  runs as OpenSpec-format changes), and record the send-back on the epic with
  `bd note <epic> --file <file>`: each gap, its file, its scenario or design decision, and the
  route the user picked; the report goes on the epic as a note of its own. Verification then runs
  again from step 2.
- **No gap:** report the trace, the gates as measured and each finding below a gap, with where
  it went. The report goes on the epic as a note, and the trace and the report go into the pull
  request's body, as `node scripts/render-pr-body.mjs <change>` renders them. The next stage is `change-finalize` (`CLAUDE.md` § Product work runs as
  OpenSpec-format changes).
