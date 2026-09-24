# Review of the `change-build` skill

**Written:** 2026-09-24

The review of `.claude/skills/change-build/SKILL.md`, the fourth `change-*` stage, which builds a
planned change's tasks in its worktree. Where this file and the skill disagree about what the skill
says, the skill wins; this file is the evidence for why it says it. Where either disagrees with
`CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-24

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-build/SKILL.md` as it stood at `origin/main` `ed9e239`. The
  change branch does not touch it (`git log origin/main..agent/add-calculator-web-app --
  .claude/skills` is empty).
- **Run:** 2026-09-23 to 2026-09-24, a live maintainer present, on the change
  add-calculator-web-app, epic `asdlc-openspec-zgh`, in `.claude/worktrees/add-calculator-web-app`.
  The file is named for the day the run finished.
- **Output:** eight children closed, `zgh.1` to `zgh.8` (`bd list --parent asdlc-openspec-zgh
  --all --json`), on branch `agent/add-calculator-web-app`, not yet a pull request.
- **Input:** the session's own analysis, passed with this review's request. It is an input, not a
  verdict; the corrections section says where it is wrong.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **Review had no stopping rule, so it looped on coverage.** The skill says nothing about how much
   review is enough. `7cfcea2` records "Four review passes over asdlc-openspec-zgh.1" and a spec that
   grew from 30 to 47 scenarios before the task's code landed. The maintainer then set a stop rule,
   recorded only in `zgh.1`'s description ("A finding blocks this task only when the code
   contradicts the spec"), which is not a home for a rule (`CLAUDE.md` § Rules for agents live in
   tracked files, and nowhere else). **Fix:** a first bullet in step 5: a review finding blocks the
   task only when the code contradicts the spec, the design or the task; a behaviour the code gets
   right but no scenario proves is filed out of scope.
2. **Spec-first commits were practised but not stated.** Every revision made during the build was
   committed before and apart from the code it allowed: `7cfcea2` before `4c5cc11`, `527e657` before
   `916c383`, `448f425` before `5d0c6e5`, `ebf3ee0` and `13432dc` before `30cda26`
   (`git log --reverse origin/main..agent/add-calculator-web-app`). Those revisions touched
   the change's design as well as its delta spec, which step 5 did not name. **Fix:** step 5's third bullet
   now revises the design where affected and commits the revision on its own, before the code.

### Corrections to the run's own analysis

- "Across all of them, 14 commits": 14 is the branch's count, but `aa7f050` (propose) and `7ba59c4`
  (design) predate the build, so the build made 12.
- The stop rule as the analysis states it ("the spec, the task or the design") is wider than the one
  recorded in `zgh.1` ("the spec"). The skill takes the wider form, since a contradiction of the
  design or the task is as much a defect; the maintainer may narrow it.
- "22 pre-push jobs" holds: `lefthook.yml` on the branch lists 22 under `pre-push`.

### Deliberately not changed

- **Claim leases.** `bd reclaim --help` says a lease matters only to a reaper, and nothing in the
  repository runs `bd reclaim` or `bd heartbeat` (`git grep` finds neither). With no reaper, an
  expired lease changes nothing. Revisit when a supervisor reclaims leases.
- **Listeners left behind by review.** The leftover process came from the review workflow the session
  chose, which the skill does not prescribe, and the test that passed only through its fallback is a
  property of the calculator's server tests (the comment on the `calculator-test` job in
  `lefthook.yml`, on the change branch, says they bind the default port "while it is free"). Both belong to that workflow or to an issue on the tests, not
  to this skill.
- **Step 1 assumes the primary checkout.** The same sentence stands in `change-design`,
  `change-plan`, `change-verify` and `change-finalize` (`git grep "From the primary" --
  .claude/skills`); fixing one of five would make them disagree. It is one change across all five.

### What this review could not verify

- The five-minute lease on `zgh.8`: the closed issue no longer carries `lease_expires_at`.
- The leftover listener on 127.0.0.1:8080 and the maintainer's approval of each spec revision: the
  first rests on the session's account; the second on it and `7cfcea2`'s message.
- The stop rule's wording on 2026-09-24 beyond what `zgh.1` records.
