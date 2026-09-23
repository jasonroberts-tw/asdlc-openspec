# Review of the `bead` skill

**Written:** 2026-09-23

The review of `.claude/skills/bead/SKILL.md`, the skill that works one issue from the task store end
to end. Where this file and the skill disagree about what the skill says, the skill wins; this file
is the evidence for why it says it. Where either disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-23

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/bead/SKILL.md`, as it stood at commit `9bf2220` (then `origin/main`).
- **Run:** 2026-09-23, a live user present, on issue `asdlc-openspec-v6m`, which added the four
  labelled lines of an emitter header to `tools/pipeline/example/emit.ts`.
- **Output:** pull request 3 (https://github.com/jasonroberts-tw/asdlc-openspec/pull/3), commit
  `a0c902f` on `agent/asdlc-openspec-v6m-emitter-header`, touching `tools/pipeline/example/emit.ts`
  and `tools/pipeline/example/summary.json` (`git log --stat agent/asdlc-openspec-v6m-emitter-header`).
  Its `verify` check passed in 23s (`gh pr checks 3`, read 2026-09-23).
- **Tracker:** `asdlc-openspec-v6m` closed with the pull request in its reason; the split-out part
  filed as `asdlc-openspec-npe`; a defect found on the way filed as `asdlc-openspec-qxz`
  (`bd show asdlc-openspec-v6m`, `bd show asdlc-openspec-qxz`).
- **Input:** the session's own analysis of the run, passed with this review's request. It is an
  input, not a verdict; the corrections section below says where it is wrong.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **The skill was never adapted, and the run hit every gap the adaptation would have closed.** The
   skill's `kit 1.10-1 · ADAPT` comment asked for the toolchain a change builds with, the artifacts
   it must regenerate and the gates that are this repository's, "under the step it belongs to". None
   was added, and findings 6, 7 and 8 are those three gaps. **Fix:** the additions below, under
   step 4; the comment is deleted, as it asks, now that its three gaps are filled.

2. **A premise check against a checkout outside the repository cost a disk search.** The issue named
   "the kit checkout, not in this repository" without a path, so the session ran `find` to locate it.
   The path is machine-local and has no place in a tracked skill. **Not applied** (see *Deliberately
   not changed*).

3. **The skill says the user decides that an issue "changes", but not how the change is recorded.**
   The session improvised: it rewrote the issue's title and description, added a dated "Scope,
   narrowed" section naming what was dropped and why, and filed the split-out part as its own issue.
   That was right, and it is what keeps a dropped part from being re-filed under new wording
   (`CLAUDE.md` § A program proposes; only a person promotes holds the same principle for proposals).
   **Fix,** in step 1, under the live-user bullet: when the user decides the issue changes, record it
   in the issue before any work, in exactly that shape.

4. **Step 3 did not name the worktree script or say where body-carrying tracker writes happen.** The
   session reordered step 3 to worktree first, then the re-scoping writes, then the claim, because a
   body file goes under `.scratch/` (`CLAUDE.md` § Bash command style). **Fix,** in step 3: spell the
   claim (`bd update <id> --claim`, which carries no body and so stays first), name `EnterWorktree`
   and the script its hook runs (`scripts/hooks/worktree-create.mjs` routes it to
   `scripts/new-worktree.sh`), and say that writes carrying a body are made from the worktree.

5. **The tracker bracket was stated but not spelled.** The session found `bd dolt pull` and
   `bd dolt push` by trying them (`bd dolt --help` lists both under "Version control"). **Fix,** in
   the opening paragraph: name the two commands inside the existing bracket sentence.

6. **Regeneration had no way to find what was stale, and ran twice.** An edit to a comment in
   `tools/pipeline/example/emit.ts` staled `tools/pipeline/example/summary.json`, because the emitter's
   own source is a declared input of node X-EXAMPLE (`docs/pipeline.md` § X-EXAMPLE, its STALE WHEN
   line). The session regenerated, rewrapped a comment, and regenerated again. `npm run pipeline:stale`
   names each stale node and the command that rebuilds it; `npm run outcomes:check` covers the
   learning loop's tree, which is not a pipeline node. **Fix,** in step 4: regenerate after the last
   edit to an emitter or its inputs, and name both commands.

7. **Regenerating can change what a gate binds, and the skill is silent on it.** The first run of the
   example emitter wrote the output's first stamp, which moves X-EXAMPLE from reported to binding
   under `pipeline:stale:check` (`docs/pipeline.md` § The two gates). The session flagged it in the
   pull-request body, which was right. **Fix,** in step 4: say so in the pull request.

8. **Two calls were spent on a typecheck that does not exist.** The user's global instructions ask
   for a build or `tsc --noEmit`, and the worktree briefing's Environment section says a Stop hook
   runs `typecheck` / `lint:strict:cached` / `pipeline:check`. `package.json` lists none of
   `typecheck`, `lint:strict` or `lint:strict:cached`, and the `GATES` list in
   `scripts/hooks/gate-summary.mjs` is `check:jobs` and `citations:check` only. **Fix,** in step 4:
   `npm run gates` is the build check, and a script name `package.json` does not list is not run.
   The stale briefing and hook header are `asdlc-openspec-qxz`, outside this review's two files.

9. **Two watchers ran on one check.** Step 6 says "poll the checks in the background" without a
   command; the session started `gh pr checks 3 --watch` in the background and then `gh run watch`
   in the foreground. **Fix,** in step 6: one `gh pr checks <number> --watch` in the background, and
   no second watcher.

10. **The report step does not mention the prompt review, or where it lands.** `CLAUDE.md` § Prompt
    reviews requires one after every run of a prompt from a file, and the worktree briefing's
    Finishing section forbids a second task, so the review can only land on the same branch. **Fix,**
    in step 8: hand the analysis to `continuous-prompt-improvement`, and say its review lands on this
    branch and in this pull request.

### Corrections to the run's own analysis

- **The claim was never blocked by the body-file rule.** The analysis says tracker writes with bodies
  could only happen after the worktree existed, so it claimed last. `bd update <id> --claim` carries
  no body (`bd update --help`), so the claim could have stayed first, where it stops a second agent
  taking the same issue; only the re-scoping writes needed to wait. Finding 4's fix keeps the claim
  first.
- **No repository hook refuses edits in the primary checkout.** The analysis says "the shared checkout
  refuses edits until the session is isolated". `.claude/settings.json` wires one PreToolUse hook on
  Write and Edit, `scripts/hooks/block-generated-edit.mjs`, which guards generated output. The refusal
  is the harness's: the session ran as a background job, and the harness rejects a background job's
  file edits in the shared checkout until it enters a worktree. It holds for that kind of session
  only, which is why finding 4's fix names the worktree's `.scratch/` rather than blaming a gate.
- **The first stamp binding the gate is the designed lifecycle, not a new question.** The analysis
  calls it a reviewer decision. `docs/pipeline.md` § The two gates says an UNSTAMPED output is
  "binding from the first run of its emitter", and `docs/pipeline.md` § X-EXAMPLE says the node is
  laid down unstamped until its emitter runs here once. Flagging it in the pull request was still
  right, since a reviewer should see a gate start to bind; finding 7 keeps that.
- **The drift was invisible at edit time for a reason outside the skill.** The analysis puts the
  double regeneration on the skill alone. `scripts/hooks/check-emitted-drift.mjs` re-runs a gate after
  an edit to an emitter's input, but its `TRIGGERS` hold only the outcomes policy and schema; there is
  no row for `tools/pipeline/example/emit.ts` or `entries.json`, though its own ADAPT line asks for a
  row per emitter input and one for the emitter itself. With that row, the first comment edit would
  have reported the stale output at once.
- **The briefing contradicts `CLAUDE.md`, and the briefing wins.** Not raised by the analysis. The
  template `.claude/worktree-CONTEXT.md.tmpl`, in its Finishing section, gives
  `git fetch origin && git rebase origin/main` as one command and `gh pr create ... --body "..."`
  with an inline body, against `CLAUDE.md` § Bash command style, and `CLAUDE.md` § Worktree-local
  context says the briefing takes precedence where they conflict. The session followed the stricter
  rule; the next one may not.

### Deliberately not changed

- **Asking for an unnamed checkout's path (finding 2).** The reviewer proposed that step 1 ask a live
  user for the path rather than search the disk. The session that applied this review declined it:
  one search found the checkout in one call, a question costs a round trip with a user who may have
  stepped away, and an autonomous session has no one to ask. The finding stays as evidence; a run
  where the search costs more than a call is the reason to revisit it.
- **The kit checkout's path.** It is an absolute path on one machine; written into a tracked skill it
  is wrong on every other. If a stable home is wanted, it is a policy key or the issue template, not
  this skill.
- **Closing on green before merge (step 7).** If the pull request is later closed unmerged, the issue
  stays closed with no open work. The skill's session ends at green and merging is the user's act, so
  reopening (`bd reopen`) belongs to whoever closes the pull request; the close reason names it, so
  the link is there to follow.
- **"Citing file and line" in step 1.** It governs evidence written into an issue or a report, which
  the citations gate does not scan, and a line is the precise pointer there. `CLAUDE.md` § Citations
  governs tracked documents.
- **Filing an out-of-scope discovery.** The run filed `asdlc-openspec-qxz` correctly without a rule;
  `change-build` spells the command for its own stage, and one run is not evidence that `bead` needs
  it too.
- **The gate-ladder sequence.** Regenerate, gate, rebase, gate again is `CLAUDE.md` § The gate
  ladder; steps 4 and 5 state their part of it and do not restate the rest.
- **The briefing template, `scripts/hooks/gate-summary.mjs` and `scripts/hooks/check-emitted-drift.mjs`.**
  Their defects are named above, but this review writes only the skill and this file. The first two
  are `asdlc-openspec-qxz`; the drift hook's missing row and the briefing's chained command have no
  issue yet.

### What this review could not verify

- Every step of the session itself: the `find` for the kit checkout, the two `typecheck` calls, the
  two regenerations, the two watchers, the gate runs' timings and job counts. No transcript was
  available; these rest on the session's analysis. The `verify` result and time were read from
  `gh pr checks 3`.
- The kit checkout's contents (`authored/reference/emitter-shape.mjs`, `authored/emitters-README.md`,
  the kit copy of `tools/pipeline/stale.ts`). This review read nothing outside the repository.
- That `gh pr checks <number> --watch` alone is sufficient in every case, for example when a check
  is re-run under a new run id. It was sufficient in this run by the analysis's account.

## Second review of 2026-09-23

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/bead/SKILL.md`, as it stood at commit `fad7da8`.
- **Run:** 2026-09-23, a background session with the user possibly away, on three issues:
  `asdlc-openspec-bls`, `asdlc-openspec-44p` and `asdlc-openspec-4gp`. All three were claimed between
  16:00:06Z and 16:00:07Z, and they closed at 16:05:31Z, 16:12:14Z and 16:21:24Z (`started_at` and
  `closed_at` in `bd show <id> --json`).
- **Output:**
  - `bls`: pull request 8, `agent/bls-hook-reasons`, commit `f30f637`. `verify` passed in 18s
    (`gh pr checks 8`). Follow-up filed: `asdlc-openspec-iy4`.
  - `44p`: pull request 10, `agent/44p-prompt-first-line`, commit `ae49194`. `verify` passed in 25s
    (`gh pr checks 10`). Follow-up filed: `asdlc-openspec-0c6`.
  - `4gp`: pull request 11, `agent/4gp-policy-label`, commit `52d7658`. `verify` passed in 29s
    (`gh pr checks 11`).
  - All three pull requests have base `main` and were open and unmerged when this review was written
    (`gh pr list --state all`).
- **Tracker:** each issue is closed with a reason that names its pull request and says `verify` is
  green. Both follow-ups carry `repo:asdlc-openspec` (`bd label list <id>`) and are linked
  `discovered-from` the issue that found them.
- **Input:** the session's own analysis of the run. It is an input, not a verdict; the corrections
  below say where it is wrong.

### What the earlier reviews' changes did in this run

- **The spelled bracket (`bd dolt pull`, `bd dolt push`):** working, by the analysis's account. No
  discovery calls.
- **Step 3's claim, `EnterWorktree` and `npm ci`:** working. All three claims came before the first
  pull request was opened. The step still said "the issue", singular; finding 1 covers that.
- **Recording a re-scope in the issue (step 1, live user):** not exercised. No premise failed with a
  user present.
- **Regenerating after the last edit, and saying a first stamp binds the gate (step 4):** not
  exercised. No pull-request body names a regeneration.
- **"`npm run gates` is the build check; run no script `package.json` does not list" (step 4):**
  mostly working. No missing script was run. One call was still spent listing `package.json` to
  confirm there is no typecheck, because the user's global instructions ask for `tsc`. Finding 6
  closes that.
- **One watcher (step 6):** working, one per pull request, by the analysis's account.
- **The prompt review lands in the same pull request (step 8):** working, but "this pull request"
  had three candidates. The session picked 11, the one that already edited this skill. Finding 7
  covers that.
- **Closing on green before merge**, deliberately not changed last time: held as designed. Pull
  requests 8, 10 and 11 were unmerged when their issues were closed.

### What the run cost that the prompt did not prevent

1. **The skill did not say how one session moves between worktrees.** Step 2 put three disjoint
   issues on three branches.
   - `EnterWorktree` will not create a worktree from inside another; its description says so.
   - `ExitWorktree`'s description says to call it only when the user asks. The session called it
     with action `keep` anyway, then called `EnterWorktree` again.
   - Working the branches one after another was cheap: three pull requests about 21 minutes after
     the first claim. The only gap is that no instruction covered the calls.
   - **Fix,** in step 2: separate branches are worked one after another. Take each through step 6,
     leave with `ExitWorktree` (action `keep`), then create the next with `EnterWorktree`. A request
     to sweep or parallelise goes to `fan-out-work`.
   - **Fix,** in step 3: with several issues, claim every one in one bracket, before the first
     worktree. That is what the run did.

2. **The partition rule missed the one conflict the run created.** Step 2 said only issues that
   "rewrite the same lines" belong together.
   - Pull requests 10 and 11 conflict in `scripts/README.md`: 10 adds a row directly under the
     `check-openspec.mjs` row, and 11 rewrites that row (`git merge-tree --write-tree --name-only
     agent/44p-prompt-first-line agent/4gp-policy-label` exits 1).
   - `.claude/agents/fan-out-work.md` § 2. Partition the ready work into lanes already names this
     overlap kind ("same file, separate blocks"). The skill restated only one of its four kinds.
   - **Fix,** in step 2: partition by that table's overlap kinds, read from the files each issue
     touches.
   - **Fix,** in step 6: before opening, list the open pull requests. For each one that shares a
     file, test the merge with `git merge-tree`. Name any conflict in the body.

3. **Step 1 had no outcome for "valid but blocked".**
   - `4gp` said "Blocked on `tools/policy.json` existing". That was prose only: `bd show` lists no
     blocking dependency, just `discovered-from asdlc-openspec-95a`.
   - The issue meant to write the file, `asdlc-openspec-4wk`, was closed with the reason "Closed"
     and the file was never written.
   - The session wrote the smallest form of the file and said so in the pull-request body. That was
     right, but it was the session's own call.
   - **Fix,** in step 1: a fourth outcome, **blocked**, and what each kind of session does with it.
     With a live user, taking the prerequisite on is the user's scope decision. In an autonomous
     session, take it on only when no open issue carries it and the acceptance criteria cannot be
     met without it, and put it at the top of the pull-request body. Also: a "blocked on" line in
     an issue's prose is no more evidence than its title.

4. **An acceptance criterion required a register decision that the issue never named.**
   - `4gp` asked for "a dated amendment" under D-02. An amendment has the form `Amended <date> by
     D-NN` (`docs/decisions.md` § How an entry changes), so it takes a new decision, here D-03.
   - A recorded decision is not re-litigated by any agent. The session led the body of pull
     request 11 with it, and that was right.
   - **Fix,** in step 1: name any register entry an acceptance criterion implies.
   - **Fix,** in step 6: the pull-request body opens with it.

5. **A `gh pr create` timed out.** It failed once with a network i/o timeout. The session retried,
   then checked with `gh pr list` that no duplicate had been opened. A create can land after its
   client gives up, and a duplicate pull request is something a person has to close. **Fix,** in
   step 6: after a failed create, run `gh pr list --head <branch>` before retrying.

6. **A call was spent confirming there is no typecheck.** The repository has no `tsconfig.json` and
   no TypeScript package in `package-lock.json`. `package.json` runs the `.ts` files with `node`
   directly (`engines` asks for `>=22.18`). **Fix,** in step 4: there is no `tsc` to run, and why.

7. **Step 8 did not say which pull request carries the review when there are several.** **Fix,** in
   step 8: the one that already edits this skill, which keeps two branches from both editing it.
   Otherwise, the last one opened.

8. **Output volume.** `npm run gates` ran twice per branch, six times in all: 18/18, 20/20 and 18/18
   jobs green before and after each rebase (the bodies of pull requests 8, 10 and 11). By the
   analysis's account the pre-push hook also reran the matching jobs on each push. This costs
   context, not correctness. **Not applied;** see *Deliberately not changed*.

### Corrections to the run's own analysis

- **The overlap was not with pull request 9.**
  - The analysis guessed that 9 and 10 collide on `package.json`, `lefthook.yml` and
    `.github/workflows/verify.yml`. They share those files, but 9 merges cleanly with both 10 and
    11 (`git merge-tree --write-tree`, exit 0 for each pair).
  - The conflict that exists is between the session's own branches, in `scripts/README.md`
    (finding 2). Listing pull requests by file would have flagged 9 as a false alarm and still
    missed the real conflict; testing the merge catches both cases.
- **Pull request 11 did not stay unfinished.** `verify` passed in 29s, and `4gp` closed at
  16:21:24Z with the pull request in its reason. Step 7 was carried out for all three issues.
- **Closing on green before merge is settled.** This file's review of 2026-09-23 already lists it
  under *Deliberately not changed*, with the reason. This run adds no new evidence.
- **Writing `tools/policy.json` was arguably inside `4gp`'s scope.** Its first acceptance criterion
  (the file holds the label under a key) can only be met by creating the file. The issue's own
  description already said `4wk` had closed with the work undone. Finding 3's fix covers the
  general case either way.
- **D-03 decides more than the issue asked.** Its sentence "The next constant moves in the change
  that needs it" settles what is left of `asdlc-openspec-4wk`. That issue is a closed kit-checklist
  item that still blocks `asdlc-openspec-dmc` (`bd show asdlc-openspec-4wk`). The body of pull
  request 11 flags this under "Decisions to check". Its reviewer should read that sentence as the
  decision being recorded.
- **Scope calls the analysis asked to have checked:**
  - **`bls`, `scripts/prune-worktree-branches.mjs`:** sound. It is the same double `main` in its own
    `PROTECTED` set, from the same kit substitution. It was a four-line change, named in the body,
    and what the gates refuse did not change. The template with the related defect was filed as
    `iy4` rather than folded in, which is consistent with that.
  - **`44p`, the optional `check:prompts` gate:** sound. It has a selftest with a control case, a
    root override (`PROMPTS_CHECK_ROOT`), a pre-push job and `verify.yml` steps, as `CLAUDE.md`
    § Standing rules for prompts and gates requires. It is stricter than that section's word
    "substantial", and its header and the pull-request body both say so. One nit: its header gave
    the invocation before the failure it prevents, and the standing rule's order is the failure
    first. The session reordered it on pull request 10 after reading this review.
  - **`4gp`, the new `openspec:check` refusal:** sound, and it is what makes the change safe. Every
    prompt still spells the label's value inside a runnable command, so the policy key is its home
    and the gate holds each copy to it. The change to `tools/outcomes/record.selftest.ts` relaxes a
    gate to match three descriptions of it. The pull-request body names it for review, which is the
    right thing for an autonomous session to do.

### Deliberately not changed

- **Sending several disjoint issues to `fan-out-work` by default.** It runs gates on the trunk
  first, starts one agent per lane, merges forward and opens one combined pull request. That is
  more work than three small branches in sequence, which here took about 21 minutes. It is the
  route only when asked to sweep or parallelise.
- **Gate output volume (finding 8).** Running the forced suite twice is `CLAUDE.md` § The gate
  ladder. `CLAUDE.md` § Bash command style forbids piping the output to trim it. Revisit only if a
  run runs out of context.
- **A general rule for widening scope.** The three widenings were each sound and each named in its
  body. One run's good judgement is no evidence for a rule, as with the filing rule the review of
  2026-09-23 declined.
- **The worktree briefing's Finishing step, "do not open a second task".** It is rendered into one
  worktree for one task, and the session left that worktree rather than starting a second task in
  it. The template is outside this review's two files, and `CLAUDE.md` § Worktree-local context gives
  it precedence. If the next change to the template says the rule binds its own worktree, the
  ambiguity goes away. `asdlc-openspec-iy4` covers a different sentence of it; this point has no
  issue yet.
- **Turning a "blocked on" line into a tracker dependency.** That happens when an issue is filed,
  not in this skill. Finding 3's fix only stops a reader treating the prose as evidence.

### What this review could not verify

- No transcript was available. These rest on the analysis alone: the `ExitWorktree` and
  `EnterWorktree` calls, the one `package.json` listing, one watcher per pull request, the timed-out
  `gh pr create` and its retry, about 300 lines per gate run, the pre-push reruns, and the bracket
  commands used.
- Whether the merged tree of pull requests 10 and 11 is green once the `scripts/README.md` conflict
  is resolved. No gates were run on a merge of the two.
- Whether `ExitWorktree` and `EnterWorktree` behave the same in a foreground session. Their
  descriptions were read on 2026-09-23 in a worktree-isolated session.
- That node strips types in every `.ts` file the gates run. What was checked: no `tsconfig.json`,
  no TypeScript package in `package-lock.json`, and every `.ts` script in `package.json` run with
  `node`.
