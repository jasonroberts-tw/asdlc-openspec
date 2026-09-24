# Review of the `change-plan` skill

**Written:** 2026-09-23

The review of `.claude/skills/change-plan/SKILL.md`, the third `change-*` stage, which turns a
reviewed change into child issues of its epic. Where this file and the skill disagree about what the
skill says, the skill wins; this file is the evidence for why it says it. Where either disagrees with
`CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-23

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-plan/SKILL.md` as it stands at `ac307b6`. The change branch,
  `agent/add-calculator-web-app`, carries the same file (`git diff HEAD agent/add-calculator-web-app
  -- .claude/skills/change-plan` is empty).
- **Run:** 2026-09-23, on the change `add-calculator-web-app`, epic `asdlc-openspec-zgh`, in its
  worktree, with the maintainer present to approve the draft.
- **Output:** seven children, `asdlc-openspec-zgh.1` to `.7`, created 19:28:49Z to 19:29:18Z, each
  labelled `repo:asdlc-openspec` and `spec-change` (`bd children asdlc-openspec-zgh --json`).
  - Their bodies name 25 + 5 `calculator` scenarios (`.1`, `.2`) and 6 + 7
    `calculator-local-server` scenarios (`.3`, `.4`).
  - `git grep -c "#### Scenario:" agent/add-calculator-web-app -- openspec/changes/add-calculator-web-app`
    gives 30 and 13, so the four bodies cover all 43.
  - `.6` is blocked by both `.4` and `.5`; `.7` by `.4`; `.5` and `.2` by `.1`.
- **Input:** the session's own analysis of the run. It is an input, not a verdict.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **Step 4 spelled `--deps` for one predecessor only.** `.6` waits on two. The session read
   `bd create --help` to find the form, which gives `'blocked-by:bd-20,discovered-from:bd-15'` as its
   example. **Fix,** in step 4: several predecessors go in the one flag, comma-separated, with the
   help as the source.

2. **Nothing said a task must leave the tree whole.** The session read
   `.claude/skills/change-build/SKILL.md` and `scripts/check-jobs.mjs` to infer that a new npm script
   and its wiring belong in one task; `.1` and `.4` each carry both, and `.1`'s proof names
   `npm run check:jobs`. A plan that split them would pass unnoticed:
   `.claude/skills/change-build/SKILL.md` § 6. Repeat, then hand over runs `npm run gates` once, at
   the end, and `lefthook.yml`'s pre-commit tier runs only `generated-files-are-not-hand-edited` and
   `beads`. **Fix,** in step 2, on the "small enough" bullet: a task is also whole, a new npm script
   landing with its job or its `UNJOBBED_BY_KIND` entry, pointing at the `add-npm-script` skill for
   the wiring rather than restating it.

### Corrections to the run's own analysis

- **"The gates would be red between the two commits" overstates what anything would see.** No tier
  runs `check:jobs` on an intermediate commit (finding 2), so a split would not turn anything red; it
  would leave a commit that fails `check:jobs` with no gate run on it, and a task whose own proof
  could fail. That is the reason the plan, not a gate, has to hold it.
- **There is no "`check:jobs` declaration".** The un-jobbed scripts are declared in the
  `UNJOBBED_BY_KIND` table inside `scripts/check-jobs.mjs`; the skill names it so.

### Deliberately not changed

- **A manual check that backs up automated proofs (friction 3).** The session made the real-browser
  check its own task, `.7`, whose proof is a dated note. That fits the skill as written: a task needs
  a proof "named precisely enough to run", and a manual procedure with a recorded result is one.
  `.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced already accepts "the manual
  verification the plan recorded". One run that handled it well is no evidence for a rule.
- **Naming how to find stale artifacts at plan time (friction 4).** At plan time nothing has moved
  yet, so the check is a reading of which inputs the change will touch, not a command to run. The
  session did it by reading the pipeline record and `count-index.md`, and found nothing. The
  analysis rates it low; it stays so.

### What this review could not verify

- The session's own steps: the reading of `bd create --help`, of `change-build` and
  `scripts/check-jobs.mjs` before drafting, the single pull/push bracket, and the maintainer's
  approval of the draft unchanged. No transcript was available.
- The `bd ready` results the analysis reports (only `.1` ready under the epic; none of the children
  in `bd ready --exclude-label spec-change`). They were not re-run, as a later build may have moved
  them; the dependencies above are consistent with the first.
