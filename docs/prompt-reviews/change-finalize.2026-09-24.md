# Review of the `change-finalize` skill

**Written:** 2026-09-24

The review of `.claude/skills/change-finalize/SKILL.md`, the sixth and last `change-*` stage, which
rebases a verified change, archives it into the living spec, opens its pull request and, after the
merge, closes its epic and cleans up. Where this file and the skill disagree about what the skill
says, the skill wins; this file is the evidence for why it says it. Where either disagrees with
`CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-24

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-finalize/SKILL.md`, as last changed by `6fbec90`
  (`git log origin/main -- .claude/skills/change-finalize/SKILL.md`). The change branch did not
  touch it.
- **Run:** 2026-09-24, a maintainer present, on the change `add-calculator-web-app`, epic
  `asdlc-openspec-zgh`, starting in its worktree.
- **Output:** pull request 17, merged by the maintainer at 2026-09-24T21:59:52Z
  (`gh pr view 17 --json state,mergedAt,mergedBy`). Its 17 commits sit in a line on `main`, from
  `2b7f63b` to `dd9e924`, the archive commit, on the parent `ed9e239`.
- **Tracker:** the epic is closed with the reason "Merged in
  https://github.com/jasonroberts-tw/asdlc-openspec/pull/17; archived as
  openspec/changes/archive/2026-09-24-add-calculator-web-app/". Its notes record the merge and the
  question it left open (`bd show asdlc-openspec-zgh`).
- **Input:** the executing session's own analysis of the run. It is an input, not a verdict; the
  corrections below say where it is wrong or incomplete.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **Every commit id cited during the build is dead, and the pull-request body had to map each task
   to its commit by hand.**
   - `change-build`'s step 4 closes a task with `"<short commit id>: <what now exists>"`. For
     example, `asdlc-openspec-zgh.1` closed as "4c5cc11: the calculator logic ...". No remote branch
     contains `4c5cc11` (`git branch -r --contains 4c5cc11` prints nothing). On `main` that work is
     `d692201`, found by its subject (`git log origin/main --grep="calculator logic"`).
   - The ids changed twice. Step 2's `git rebase origin/main` rewrote them once. GitHub's rebase merge
     rewrote them again, even though the branch already sat on the trunk's tip: the pull request's
     first commit, `732276c`, has the parent `ed9e239` (`gh api
     repos/jasonroberts-tw/asdlc-openspec/pulls/17/commits`), and so does `main`'s `2b7f63b`. The
     branch's `95ad445` is `fe1360a` on `main`, and `git merge-base --is-ancestor 95ad445
     origin/main` exits 1. `scripts/prune-worktree-branches.mjs` says the same in its header: after
     a rebase merge, "the commit SHAs on trunk differ".
   - The subject is what survives both rewrites.
   - **Fix, applied,** in step 5: the body lists each closed task with the subject of the commit
     that closed it, not its id, and says why.

2. **Step 4 did not say to look for the change's old paths elsewhere in the repository.**
   `apps/calculator/README.md` pointed readers at the delta specs that the archive had moved. The
   session found it with `git grep` and fixed it in the archive commit (`git show dd9e924 --
   apps/calculator/README.md`). The same search found `docs/decisions.md` § D-04. The session left
   that entry as recorded, which was right, and it is still the only match on `main`
   (`git grep -n "openspec/changes/add-calculator-web-app" origin/main`). The citations gate did not
   catch the README, because it checks only `<file>.md:NN` and `<file>.md` § citations
   (`tools/citations/check.ts`, its header). **Fix, applied,** in step 4: a bullet that runs the
   search and points each match at the living spec or the archive, except a register entry.

3. **The archive's formatting was left to be found.** For a new capability the pinned CLI writes
   `## Purpose` and `## Requirements` with no blank line after either heading
   (`node_modules/@fission-ai/openspec/dist/core/specs-apply.js`, the skeleton string with the
   `TBD - created by archiving change` placeholder). The session added both blank lines.
   **Fix, applied,** in step 4's Purpose bullet: one sentence, since the session is already editing
   that line.

4. **The skill assumes the agent merges.** The maintainer merged pull request 17 on GitHub while the
   session was busy elsewhere, and step 7 had no branch for that. The session carried on and ran
   step 8. That was right, but it was the session's own call. The criterion on the epic that needed
   `gh pr merge --rebase --delete-branch` run from the primary checkout went unobserved, as the
   epic's note records. **Fix, applied,** in step 7: when the user merges, `gh pr view <number>
   --json state,mergedAt` shows it, and the session carries on from the remote-branch check. That
   check now has its command too, `git ls-remote --heads origin agent/<change>`, which is how the
   session saw the remote branch was gone.

5. **Step 8 described the sweep as scoped to this change, and it is not.**
   - Step 8 said `npm run worktree:gc` "removes the change's worktree and its local branch". By the
     session's account it would have removed 14 worktrees, only one of them this change's.
   - The script removes every worktree under `.claude/worktrees/` that is clean and whose branch is
     in the trunk. Its only check for a live session is a process whose working directory is inside
     the worktree, read from `/proc`. Its header says that where `/proc` is absent "the check is
     skipped" (`scripts/prune-worktree-branches.mjs`).
   - This host is macOS. A worktree that another session has just cut from `origin/main` is clean,
     and its branch is an ancestor of the trunk. This reviewer's own worktree was in that state when
     it started. So the sweep, run bare, can remove a worktree that a live session is working in.
   - The session ran `--dry-run` first and asked the maintainer, who chose the full sweep. That was
     right, but it went against the skill, which said to run it bare.
   - **Fix, applied,** in step 8: dry run first. If it names only this change's worktree, run it.
     If it names others, show the user the list and run it only on their word. The step says why.

6. **Two figures in the body took a search.** The issues filed along the way came from
   `bd dep list asdlc-openspec-zgh --direction=up`, which lists the nine children by `parent-child`
   and the 12 filed issues by `discovered-from` (re-run for this review). **Fix, applied,** in step 5:
   that command, beside the bullet it serves.

### Corrections to the run's own analysis

- **The rewrite at the merge was not caused by the trunk moving.** The analysis says the maintainer's
  rebase merge changed the ids "again". It did, but not because `main` had moved: the branch was
  already on `ed9e239`, the trunk's tip, and GitHub still wrote new commits (finding 1). So an id on
  the branch never survives a rebase merge, even with no rebase at all in step 2.
- **The stale `node_modules` in the primary checkout did not touch this run.**
  `scripts/prune-worktree-branches.mjs` imports only `node:child_process`, `node:fs` and `node:path`,
  so the sweep needs no dependencies. The pull did bring a lockfile change: `package-lock.json` gains
  543 lines between `ac307b6` and `dd9e924` (`git diff --stat`). See *Deliberately not changed*.

### Deliberately not changed

- **"From the primary checkout, enter the worktree" (step 1).** The same sentence stands in five
  `change-*` skills, and pull requests 19, 21 and 22 disagree about it: 19 rewords it in
  `change-design`, and the reviews in 21 and 22 leave it for one change across all five. This run
  adds nothing new. `ExitWorktree` with `keep` worked in step 6 although the session had not entered
  the worktree with `EnterWorktree`.
- **What a rerun of verification re-derives (step 2).** The session kept the 61 trace rows, because
  nothing after the last verification changed code except a new test. Step 2 sends the session to
  `change-verify` from its step 2, so the "Running again" rule proposed in pull request 22 applies
  here once it lands, with no word in this skill.
- **How `change-build` cites a commit when it closes a task.** Finding 1's root is `change-build`'s
  step 4, which puts a short id in the close reason. This review writes only this skill and this
  file, and pull request 21 is open on `change-build`. Proposed for that skill: close with the
  commit's subject, or say in the close reason that the id is pre-rebase. Until then, finding 1's fix
  keeps the pull-request body right, and the close reasons stay as they are.
- **The archive's "Consider splitting changes with more than 10 deltas" warning.** It is advice, not
  a refusal, and step 3 already says that only a refusal stops the step.
- **The size of the trace in the body.** The session condensed 61 verbose rows with a throwaway
  script that refused to write when its counts disagreed with the `#### Scenario:` counts. The shape
  of the trace is `change-verify`'s, which pull request 22 is changing, and one run is no evidence
  for a format.
- **`npm ci` in the primary checkout after step 8's pull.** The pull brought a lockfile change, and
  the next `npm run` there that needs a new dependency will fail on the stale tree. It cost this run nothing (see the corrections).
  If a later run needs dependencies after the pull, add "If the pull changed `package-lock.json`,
  run `npm ci`" to step 8.
- **The epic's criterion that `git branch --list 'agent/*'` is empty.** It cannot hold while other
  agents' branches exist, but it belongs to `asdlc-openspec-zgh`, not to this skill, and that epic is
  closed.
- **Watching the checks.** By the analysis's account, `gh pr checks --watch` polled CI and it
  passed. Unlike in the `bead` skill's first run, nothing went wrong, so there is nothing to fix.

### What this review could not verify

- No transcript was available. These rest on the analysis alone: the 14 worktrees the dry run
  named, the maintainer's choice of the full sweep, the `ExitWorktree` call, the archive's warning
  text, the throwaway script, the test and gate counts of the re-verification (75 of 75 tests, 22 of
  22 gates), and the CI result and how it was watched.
- How the remote branch was deleted. `gh pr view 17` does not say whether the maintainer's merge
  deleted it, and the epic's note records the same gap.
- Whether GitHub rewrites the ids on every rebase merge. This review saw it on one pull request,
  where the branch was already on the trunk's tip.
- The pre-rebase ids the session's own PR body mapped from. Only the pull request's head ids (from
  GitHub) and the trunk's ids were read.
