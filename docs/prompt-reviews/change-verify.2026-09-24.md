# Review of the `change-verify` skill

**Written:** 2026-09-24

The review of `.claude/skills/change-verify/SKILL.md`, the fifth `change-*` stage, which checks a
built change against its specs before it lands. Where this file and the skill disagree about what the
skill says, the skill wins; this file is the evidence for why it says it. Where either disagrees with
`CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-24

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-verify/SKILL.md`, as last changed by commit `6fbec90`
  (`git log -1 ce70200 -- .claude/skills/change-verify/SKILL.md`). It reads the same on
  `agent/add-calculator-web-app` at `ce70200` and on `main` at `ed9e239`.
- **Run:** 2026-09-24, a maintainer present, on the change `add-calculator-web-app`, epic
  `asdlc-openspec-zgh`, branch `agent/add-calculator-web-app`.
- **Output:** verdict "no gap", after one fix. The first pass upheld two design gaps. The maintainer
  had the design amended in commit `ce70200`, and the rerun found none. The trace is in
  `.scratch/add-calculator-web-app-trace.md`, which is gitignored, so this review has not read it.
- **Input:** the executing session's own analysis of the run. It is an input, not a verdict; the
  corrections below say where it is wrong.
- **Commit ids:** `ce70200` is the change branch's commit before the rebase that
  `change-finalize` ran, and it was never pushed. PR #17 merged the same commit to `main` as
  `fe1360a`. The change's design is now
  `openspec/changes/archive/2026-09-24-add-calculator-web-app/design.md`.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **A design gap where the code is right had no route.** Step 6 sent a gap to `change-build` (fix
   the code) or `change-propose` (revise the spec). Both gaps of this run were the third case: the
   code was right, and items 4 and 5 of the Decisions section of the change's design said something
   narrower or wider than the code. The session had to leave the skill to route them: the maintainer chose to amend the
   design, and the verify session committed `ce70200` itself, although the skill says the stage
   "only reads".
   **Fix, applied:** step 6 names three routes and says the user picks one. The third is the design,
   revised with the user in `change-design`, along with every comment and README row that repeated
   its claim (`ce70200` had to fix six such files as well). The report says which side the verifier
   believes is wrong, and why. Step 4's design sentence now says a disagreement is a gap "whichever
   of the two turns out to be wrong", so that a wrong design is not read as "no gap because the code
   is fine".

2. **A rerun "from step 2" did not say what it must re-derive.** Read literally, it repeats the whole
   trace: 61 rows, one per `#### Scenario:` (`git grep -c "^#### Scenario:" ce70200 --
   openspec/changes/add-calculator-web-app/specs` gives 13 and 48), each proof read in full, plus
   the design lenses and skeptics. That trace was the run's longest step. The session kept the 61
   rows on its own judgement because `ce70200` changed no code path. `.claude/skills/change-finalize/SKILL.md`
   § 2. Rebase, and verify again repeats `change-verify` from step 2 after every rebase, so the same
   question comes up on every change.
   **Fix, applied:** a **Running again** paragraph in step 4. The trace's first line names the
   commit it was taken at. A rerun reads `git diff <that commit>`, and a row keeps its reading only
   when its scenario, its proof and the code the proof exercises changed in comments or prose alone.
   Every other row is traced again, as is every design decision the diff changes. Every proof is run
   again either way. The test is a reading of the diff, not a list of file names: `ce70200` touched
   `server.js` and two test files (comments only), so a file-name test would have forced the full
   re-trace this run rightly skipped.

3. **A finding below a gap had nowhere to go.** The re-check turned up three wording notes that no
   scenario states: a non-scenario test whose name claims more statuses than it sends, a README row
   making the same claim, and a list of Node's protocol errors that leaves out 408. The skill knew
   only "gap" and "no gap". The session listed them for the maintainer to route. The stop rule that
   decided they were not gaps lived only in the session.
   The maintainer routed all three into the change: `asdlc-openspec-zgh.9`, a new child of the epic
   with the `spec-change` label, to be "fixed before change-finalize" (`bd show asdlc-openspec-zgh.9`).
   **Fix, applied:** step 4 says such a finding is not a gap. The verifier names it in the report and
   asks the user where it goes. The routes are those of `.claude/skills/change-build/SKILL.md` § 5.
   What the build turns up: a new child of the epic, which reopens step 2 until it is closed, or a
   follow-up filed outside the change. It is filed inside the tracker bracket. `CLAUDE.md` § The task
   store is why it is filed rather than only listed: work is an issue in `bd`, not a line in a
   report. The opening paragraph now says the stage changes no tracked file and writes only the
   trace and the issues the user has it file. That replaces "only reads", which was already false
   for the trace under `.scratch/`. A first draft of this fix always filed the finding outside the
   change, which the maintainer's own choice of zgh.9 contradicts, so the choice is left to the user.
   `.claude/skills/change-design/SKILL.md` § 4. Commit it, and stop gains a sentence for fix 1's
   route. When verify sends a design gap there, the design already exists: it is amended, and the
   stage hands back to verify, not to `change-plan`.

### Corrections to the run's own analysis

- **"The maintainer chose to amend design.md only ... in commit ce70200, with no code change."**
  Half right. `git show --stat ce70200` lists seven files: `design.md`, three READMEs under
  `apps/calculator/`, and `server.js`, `test/page.test.js` and `test/server.test.js`. The last three
  changed in comments only, so "no code path changes", in the commit message's words, holds.
  "design.md only" does not. This is why fix 2 tests the diff's content and not its file list.
- **Point 8, whether an agent-driven browser counts as manual verification.** The skill defers to
  "the manual verification the plan recorded, and who did it", and the plan did record who.
  `bd show asdlc-openspec-zgh.7` § Who and how says: "The building agent does this with a browser
  tool, or the maintainer if none is available." The run followed the plan, so the question did not
  arise in this run.
- **Point 7, the maintainer's stop rule.** "Only real spec breaks block; coverage gaps become
  follow-ups" disagrees with the skill if "coverage gap" means a scenario with no proof. The skill
  calls that a gap, and it blocks. The run found no such scenario, so the two never met. Fix 3 takes
  only the part of the rule that agrees with the skill: a finding outside the skill's list of gaps
  is a follow-up.

### Deliberately not changed

- **Step 2 found every child closed (point 2).** zgh's acceptance criterion "change-verify refuses
  while a child is open" went unexercised because `change-build` had closed every child, not because
  of the skill. A lifecycle smoke test that wants that refusal exercised has to open a child on
  purpose. That is the epic's business, not this prompt's.
- **"From the primary checkout, enter the worktree" (point 1).** The sentence is conditional and did
  not apply, as the session saw. It is repeated in five `change-*` skills, and rewording one would
  leave the others out of step for no gain in this run.
- **Manual verification by an agent (point 8).** See the correction above. `.claude/skills/change-plan/SKILL.md` § 2. Draft
  the tasks already asks the plan to say "who verifies it and how", and the verify step reads that.
- **The trace's method (point 4): a workflow with design lenses and three skeptics per gap.** The
  skill does not ask for that method, and this review cannot measure what it cost. Its two upheld
  gaps were real, so there is no evidence to cap it.
- **The trace in the pull request's body (point 10).** `.scratch/` is gitignored, but the file stays
  on disk in the worktree, and `.claude/skills/change-finalize/SKILL.md` § 5. Push, and open the
  pull request already puts
  "the scenario trace from `change-verify`, as re-run in step 2" in the body. Nothing is lost.
- **The skip count of `npm run gates` (point 9).** The two skips were for an input that was
  legitimately absent, which `CLAUDE.md` § The gate ladder allows. Nothing for this prompt.

### What this review could not verify

- The trace itself (`.scratch/add-calculator-web-app-trace.md`). It is in the executing worktree's
  gitignored `.scratch/`, outside this reviewer's worktree.
- The gates result (22 of 22 jobs, two selftest skips) and the test-suite rerun, which rest on the
  session's analysis.
- How long the first trace took, and how long the rerun saved. Fix 2 rests on the trace being the
  run's longest step, which is the session's account.
- The three wording notes, as the session first worded them. `asdlc-openspec-zgh.9` holds them as
  filed. It also adds a missing test of the server's 500 and a README sentence about AltGr, and it
  is closed at `2943645`, which this reviewer has not read.
