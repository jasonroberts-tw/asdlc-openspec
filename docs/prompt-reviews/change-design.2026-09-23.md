# Review of the `change-design` skill

**Written:** 2026-09-23

The review of `.claude/skills/change-design/SKILL.md`, the second `change-*` stage, which writes a
change's `design.md` or records that it needs none. Where this file and the skill disagree about
what the skill says, the skill wins; this file is the evidence for why it says it. Where either
disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-23

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-design/SKILL.md`, as it stood at commit `ac307b6`.
- **Run:** 2026-09-23, a live user present, on change `add-calculator-web-app` (epic
  `asdlc-openspec-zgh`), in the worktree `.claude/worktrees/add-calculator-web-app` on branch
  `agent/add-calculator-web-app`, straight after the user accepted the proposal.
- **Output:** commit `7ba59c4`, which adds `openspec/changes/add-calculator-web-app/design.md` and
  revises that change's `proposal.md` and `specs/calculator/spec.md` (`git show --stat 7ba59c4`).
  The session reports `npm run openspec:check` and `npm run citations:check` green.
- **Input:** the session's own analysis of the run, passed with this review's request. It is an
  input, not a verdict.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **A green citations run that never read the design.** With `design.md` untracked, the session's
   first `npm run citations:check` was green at 108 section citations across 105 files; after
   `git add`, 113 across 106 (the session's figures). The gate lists its inputs from tracked files
   only (`tools/citations/check.ts`, `trackedFiles()`); `scripts/check-openspec.mjs` reads the
   directory with `readdirSync`, so it needs no staging. Step 4 named neither gate.
   *Fix:* § 4 now says to stage every file the stage wrote or revised, then run both gates as
   separate calls, and says why staging comes first.
2. **The proposal drifted from a revised spec.** § 3 sent a missing behaviour to the delta spec but
   said nothing of `proposal.md`'s `## What Changes`, which still described the old behaviour; the
   session fixed it unprompted (`proposal.md` changes in `7ba59c4`).
   *Fix:* the first bullet of § 3 now says to bring `## What Changes` into line in the same commit.
3. **A register entry's timing was unstated.** § 3 said to propose a binding decision but not when
   the entry is written. The session recorded D-04 as accepted, to be written by the build, and
   named it with no `§` pointer because no such heading exists yet (the design's Context section
   and its eighth decision, at `7ba59c4`).
   *Fix:* the second bullet of § 3 now states that practice as the rule.
4. **§ 1 assumed a start in the primary checkout.** This run began in the worktree, left there by
   `change-propose`. *Fix:* § 1 enters the worktree only if the session is not already in it.

### Corrections to the run's own analysis

- Finding 1 calls this "the same gap as finding 5 of the change-propose review". No review of
  `change-propose` exists in `docs/prompt-reviews/` at `ac307b6`, and `git log --all` shows no
  commit adding one, so that finding is not citable from here.

### Deliberately not changed

- **The length of the design.** At `7ba59c4` it is 295 lines and carries build-level detail
  (script names, a pre-push job, README rows). It is the first product code in the repository, and
  `change-plan` turns it into tasks; no rule was added to cap it.
- **The three questions asked in one AskUserQuestion call**, and the scratch script that reproduced
  every figure in the spec. Both went well; the skill does not need to prescribe them.

### What this review could not verify

- The citation counts in finding 1 (108/105 and 113/106) and the green gate runs come from the
  session's analysis; this review did not re-run either gate on the uncommitted state.
- The happy-dom advisory (CVE-2025-61927, GHSA-37j7-fg3j-429f) the design cites was not re-checked.
