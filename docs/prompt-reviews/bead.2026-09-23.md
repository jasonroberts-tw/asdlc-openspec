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

## Third review of 2026-09-23

### How this review merged with the second

This review was written in parallel with the second, against the same prompt at commit `fad7da8`,
and landed after it. The two gave different fixes for the same gap. For several lanes, the second
works the branches one after another, leaving each with `ExitWorktree` (action `keep`), and sends a
sweep to `fan-out-work`. It also lists sending lanes out by default under *Deliberately not
changed*. This review's finding 1 sends each lane after the first to an agent launched with
`isolation: "worktree"`. The second landed first, so the skill keeps its steps 2, 3 and 8. From this
review, the skill takes only what the second did not cover:

- **Step 2 (finding 2):** two issues describing one defect are one lane.
- **Step 7 (findings 2 and 3):** search before filing a follow-up, and give it the sections
  `bd lint --help` lists for its type.

The fixes proposed for finding 1 (lanes to isolated agents) and finding 5 (where the review lands)
are **not applied**. The findings stay below as the evidence of this run.

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/bead/SKILL.md` as it stood at commit `fad7da8`, with the changes of
  § Review of 2026-09-23 applied.
- **Run:** 2026-09-23, a background session with no visible user. The user said "Fix all the ready
  bugs"; `bd ready --type bug` listed `asdlc-openspec-u77`, `-f60`, `-iko`, `-is0` and `-qxz`, and
  the skill was invoked with all five.
- **Output:** four pull requests, open against `main` (`gh pr list --state all`, read 2026-09-23):
  4 on `agent/stop-hook-docs` (iko and qxz), 5 (is0), 6 (u77) and 9 (f60), the last three on
  `agent/agent-<hex>` branches. `verify` passed on each, in 31s, 20s, 20s and 26s (`gh pr checks 4`,
  `5`, `6` and `9`).
- **Tracker:** all five closed with a reason naming their pull request (`bd show` on each). Two
  follow-ups: `asdlc-openspec-80c` (bug, open, one note appended) and `asdlc-openspec-zp0` (task,
  labelled `human`).
- **Input:** the session's own analysis of the run, passed with this review's request. It is an
  input, not a verdict.

### What the first review's changes did in this run

- **Finding 4 (claim first, name `EnterWorktree`):** the claim held; all five were claimed in one
  bracket before any worktree existed. `EnterWorktree` served the first lane only, which is where
  finding 1 below starts.
- **Finding 5 (the bracket commands spelled):** every tracker push succeeded first try, and the
  analysis reports no command found by trial.
- **Finding 8 (`npm run gates` is the build check):** held. No typecheck was attempted.
- **Finding 10 (the review lands on this branch):** held, on pull request 4; with four pull requests,
  "this branch" named none of them, finding 5 below.
- **Findings 3, 6, 7 and 9:** not exercised or not reported. Finding 3 applies to a live user and
  there was none; the analysis records no regeneration and does not say how the checks were watched.

### What the run cost that the prompt did not prevent

1. **A second lane had no route.** Step 2 partitions several issues into branches; step 3 makes "the
   worktree" with `EnterWorktree`, whose own description refuses a new worktree while the session is
   in one, and `ExitWorktree`'s description says to call it only when the user asks. The session
   forked one agent per remaining lane with `isolation: "worktree"`, and kept every `bd` write in
   the parent, so no two sessions pushed Dolt at once; the analysis says that choice was its own,
   not the skill's. **Fix,** in step 3: the lanes after the first go to agents launched with
   `isolation: "worktree"`, briefed with the three rules of `.claude/agents/fan-out-work.md` § 4.
   One fresh agent per lane and barred from `bd` writes, and this session makes every tracker write.
2. **Two issues describing one defect, with conflicting criteria, and the earlier run filed the
   second.** `asdlc-openspec-iko` was created at 2026-09-23T12:16:37Z; `asdlc-openspec-qxz` at
   14:25:13Z, by the `asdlc-openspec-v6m` run this file's first review covers (its description:
   "Found 2026-09-23 while working asdlc-openspec-v6m"). `bd search "Stop hook" --created-before
   2026-09-23T14:25:00Z` returns iko alone, so one search before filing would have found it. iko
   allows the briefing to "name no script and point at the hook"; qxz requires the template to name
   the gates. The first review declined a filing rule for want of a second run; this is that run.
   **Fix,** in step 7: search before filing, and a match gets a note, not a second issue. In step 2:
   duplicates are one lane, and a conflict between their criteria is recorded in the pull-request
   body and both close reasons.
3. **A follow-up bug lacked the sections `bd` expects.** `bd create --type bug` warned of a missing
   `## Steps to Reproduce`, costing a read, an edit and a `bd update`. `bd lint --help` lists the
   sections per type (bug: Steps to Reproduce and Acceptance Criteria; task: Acceptance Criteria).
   **Fix,** in step 7: a follow-up's body carries the sections `bd lint --help` lists for its type.
4. **A search string missed.** `grep "Stop hook"` found nothing, because the template writes
   `` `Stop` hook `` (`.claude/worktree-CONTEXT.md.tmpl` line 46). It is step 1's "a title is not
   evidence" applied to a search string, not a gap in the skill. **Not changed.**
5. **Where the review lands, with several pull requests.** Step 8 says "this branch, in this pull
   request". **Fix,** in step 8: the branch of the lane this session worked, in its pull request.

### Corrections to the run's own analysis

- **Step 1's rewrite rule did not apply.** The analysis faults itself for not rewriting qxz's
  criteria first. That rule sits under step 1's live-user bullet, and the session had no live user;
  both premises held, so the autonomous bullet (a note, the issue left open) did not apply either.
  The skill had no rule for duplicates at all, which is finding 2.
- **The deviation is in the pull-request body, not the close reasons.** Pull request 4's body says
  "This deviates from qxz's acceptance criterion" and why (`gh pr view 4`). The close reasons of iko
  and qxz are identical and state what the briefing now does, not that a criterion was departed from
  (`bd show asdlc-openspec-qxz`). Finding 2's fix asks for both. The session added the deviation to
  qxz as a note after this review.
- **`fan-out-work` does not match what the run did.** The analysis says the skill names neither it
  nor subagent lanes, which is true. But `.claude/agents/fan-out-work.md` § 5. Integrate on your own
  branch merges every lane into one dispatcher branch and one pull request, where this run opened
  four, and its § 4 briefs each lane to follow this skill, which makes a lane claim and close its own
  issues, against the central tracker writes this run used and finding 1 adopts.
- **The briefing fix is not on `main` yet.** The analysis says lane A fixed the briefing line that
  invited the typecheck attempt. It did, on `agent/stop-hook-docs`
  (`.claude/worktree-CONTEXT.md.tmpl` line 46 now points at `GATES`), and it reaches other worktrees
  only when pull request 4 merges.

### Deliberately not changed

- **One integrated pull request or one per lane.** `fan-out-work` produces the first and this run
  the second. Which the user wants is theirs to say; finding 1 routes the lanes and leaves that open.
- **`fan-out-work`'s lane brief.** Its § 4 conflicts with finding 1's central tracker writes; this
  review writes only the skill and this file, and no issue is filed for it yet.
- **Descriptive lane branch names.** The forks' `agent/agent-<hex>` branches meet `CLAUDE.md` § Git
  workflow's `agent/<name>`; a descriptive name is cosmetic.
- **`bd duplicate` at closure.** Closing both issues with the reason naming pull request 4 is
  truthful and links them; finding 2's search stops the duplicate at the source.
- **Narration.** The harness nudged once during step 1, in a background job with no visible user;
  nothing measured came of it.

### What this review could not verify

- The session's own steps: the `bd create` warning and the calls it cost, the missed `grep`, the
  harness's nudge, and the gate counts of lanes B, C and D (18/18, 18/18, 19/19). Lane A's 18/18
  before and after the rebase is in pull request 4's body. No transcript was available.
- Whether an agent launched with `isolation: "worktree"` can be given a descriptive worktree name.
- The review agent was itself launched isolated in its own worktree, and its edits to this one were
  refused; the session applied them as the agent returned them, with one wording change to step 3.

## Fourth review of 2026-09-23

### How this review relates to the second and third

The run reviewed here read the same prompt as the second and third, at `fad7da8`, and ran alongside
them. Its review was drafted at the time by an agent whose edits never landed (finding 3). This
review was written afresh against `053e51c`, after the second and third had landed, and does not
use that draft. It makes one change, on the maintainer's instruction of 2026-09-23
(`asdlc-openspec-5c7`): the rule for a defect found on the way. That instruction overrides the
first review's "Filing an out-of-scope discovery" and the second's "A general rule for widening
scope", both under *Deliberately not changed*. The change builds on the third review's search before
filing (its finding 2) rather than adding a second rule beside it: step 7's two sentences on
follow-ups move to step 4 and are extended there, and step 7 points at them. This run's other
findings, on closing before merge and on where the review lands, are recorded with their evidence
and **not applied**.

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/bead/SKILL.md` as it stood at commit `fad7da8`, with the changes of
  § Review of 2026-09-23 applied. The second and third reviews' changes were not in it. They landed
  as `78d235e` (pull request 11, merged 16:56:37Z) and `b546990` (pull request 4, merged 17:05:04Z),
  after this run's pull request opened (`gh pr list --state all --json number,mergedAt,mergeCommit`).
- **Run:** 2026-09-23, a background session, on `asdlc-openspec-npe`: give `tools/pipeline/stale.ts`
  the four-part gate header and strip the names copied in from another repository. The issue was
  claimed at 15:57:13Z (`started_at` in `bd show asdlc-openspec-npe --json`).
- **Output:** pull request 7 on `agent/asdlc-openspec-npe-stale-header`, opened 16:03:26Z.
  - Its one commit, `4d7fada`, on `fad7da8`, changes only `tools/pipeline/stale.ts`, +58 −34
    (`git show --stat 4d7fada`, `git rev-parse 4d7fada^`).
  - `verify` passed on it in 26s (run 35886065691, job 16:03:34Z to 16:04:00Z,
    `gh run view 35886065691 --json jobs`).
  - The head was later rebased to `7e9df1d` (committed 17:11:10Z). `verify` passed again in 25s,
    and the pull request merged at 17:12:47Z as `0746ef4` (`gh pr view 7`).
- **Tracker:** `npe` was held open with a note, then closed at 17:19:34Z, after the merge, with a
  reason naming pull request 7 and `0746ef4`. One follow-up, `asdlc-openspec-1i1`: created at
  16:03:19Z, `discovered-from` npe, labelled `repo:asdlc-openspec`, not closed
  (`bd show asdlc-openspec-1i1 --json`).
- **Input:** the parent session's account of the run, passed with this review's request. No
  transcript was available. It is an input, not a verdict.

### What the earlier reviews' changes did in this run

Only the first review's changes were in the prompt this run read. The findings named here are that
review's; the pointers at the end of a line are to this review's findings below.

- **Finding 4 (claim first, `EnterWorktree`, `npm ci`):** held, in that order, by the account.
- **Finding 5 (the bracket commands spelled):** not reported.
- **Findings 6 and 7 (regenerate after the last edit; a first stamp binds the gate):** exercised,
  and held. Pull request 7's body says nothing was regenerated, because `stale.ts` is not one of
  X-EXAMPLE's generator inputs. It also reports `npm run pipeline:stale` at 1 current and 0 stale,
  and `npm run outcomes:check` green.
- **Finding 8 (`npm run gates` is the build check):** held. 18/18 jobs, in 4.13 s before the rebase
  and 4.19 s after it (pull request 7's body). No typecheck is reported.
- **Finding 9 (one watcher):** held, by the account.
- **Finding 10 (the review lands on this branch, in this pull request):** did not hold; finding 3.
- **Finding 3 (recording a re-scope with a live user):** not exercised.
- **The third review's search before filing** was not in this prompt, and no search was run;
  finding 2.

### What the run cost that the prompt did not prevent

1. **No rule said which defect found on the way is fixed in the branch and which is filed.**
   - The run found copied-in names inside `stale.ts`'s own body ("three of the nodes below", "the
     extractor command", "rebase the corpus", "the design note"), and the same kind in
     `tools/pipeline/assess.ts`, `provenance.ts`, `digest.ts` and `check.ts`.
   - It fixed the first in the branch, as pull request 7's body lists. It filed the second as
     `asdlc-openspec-1i1`, seven seconds before the pull request opened (created 16:03:19Z, opened
     16:03:26Z), so the body names it. That was the right boundary, reached by judgement: the prompt
     said nothing on it, and `.claude/skills/change-build/SKILL.md` § 5. What the build turns up
     states it for that skill's stage only.
   - The leftovers are still on `main` at `053e51c`; pull request 12, open, works 1i1
     (`gh pr list --state open`). `git grep -c -i -e "design note" -e corpus` counts 11 lines in
     `assess.ts`, 4 in `provenance.ts`, 1 in `digest.ts` and 2 in `check.ts`. The 3 lines it counts
     in `stale.ts` all name `corpus-regen`, which pull request 7 kept on purpose.
   - The first review declined a filing rule for want of a second run; the second declined a general
     widening rule for the same reason. The maintainer asked for the rule on 2026-09-23.
   - **Fix, applied on the maintainer's word,** in step 4: a defect is fixed in the branch only when
     it sits in a file the issue already changes. Anything else is filed before the pull request
     opens, so its body names the new id: `discovered-from` the issue, carrying the `repo:` label
     (`CLAUDE.md` § The task store), its body from a file under `.scratch/`, in the command shape
     change-build gives.

2. **No search was run before filing, and the search step 7 prescribed reads titles only.**
   - This run's prompt had no search rule; the third review added one afterwards. Re-run for this
     review, `bd search "corpus"` returns 1i1 alone, and `bd list --all --desc-contains "corpus"`
     returns 1i1 and npe, the issue that found it. So 1i1 is not a duplicate.
   - `bd search` matches titles only (`bd search --help`: "Text queries search titles. Use
     --desc-contains for description search."). With `--desc-contains` and no query it fails with
     "search query is required". An issue that names a defect only in its description is invisible
     to it: `bd search "gate-summary"` finds nothing, though iko and qxz both name
     `gate-summary.mjs` in their descriptions.
   - The candidates, measured read-only with bd 1.3.0 (`bd version`):
     - `bd search "hook" --desc-contains "gate-summary"` returns iko and qxz, but
       `bd search "corpus" --desc-contains "gate-summary"` returns nothing, though `bd search
       "corpus"` alone returns 1i1. The query and the filter are ANDed: together they narrow a
       search, they do not widen it.
     - `bd list --desc-contains "gate-summary"` returns nothing, because `bd list` hides closed
       issues by default. `bd list --all --desc-contains "gate-summary"` returns iko and qxz, both
       closed.
     - `bd list --all --desc-contains "lint:ratchet"` returns 1i1, which `bd search "lint:ratchet"`
       misses. `bd list --all --desc-contains "Stop hook docs"`, a phrase only in qxz's title,
       returns nothing: the filter reads descriptions only. Titles and descriptions take one
       command each.
     - `bd list --all --desc-contains "Stop hook that runs"` returns qxz alone, because iko writes
       `` `Stop` hook ``. `"hook that runs"` returns both. That is the third review's finding 4
       again, in the tracker instead of in `grep`.
   - **Fix,** in step 4, where step 7's two sentences on follow-ups now live: `bd search "<words>"`
     for titles and `bd list --all --desc-contains "<words>"` for descriptions, then both again with
     a second phrasing. The third review left finding 4 unchanged, calling it step 1's rule applied
     to a search string. A string search that the skill itself prescribes is the skill's gap, and the
     maintainer asked for the advice.

3. **The review did not land where step 8 says, for the second run in a row.**
   - Step 8 puts the review "on this branch, in this pull request". The session started
     `continuous-prompt-improvement` before closing npe. Its reason: step 8 comes after step 7's
     close, so the close would be on a head that is not the pull request's last.
   - The review agent was pinned to its own worktree, and its `git -C` and Edit calls on the
     session's worktree were refused. It wrote into its own worktree instead. One edit, this
     discovery rule, was refused by the permission classifier ("Modify Shared Resources") and not
     retried. The session did not apply it on the agent's behalf (`CLAUDE.md` § Guards). The agent's
     branch, `agent/agent-a831cf3194baea757`, still points at `fad7da8`, with no commit of its own
     (`git branch --list`).
   - Pull request 7 merged at 17:12:47Z without the review, which lands here, in a pull request of
     its own.
   - The third review's *What this review could not verify* records the same refusal for its own
     review agent; that session applied the returned edits by hand.
   - **Not applied.** Two shapes are open: the session applies the returned edits itself, as the
     third run did, or step 8 lets the review land in a pull request of its own. That choice is the
     maintainer's.

4. **Issues were closed while their pull requests were open, and a concurrent worktree still read
   the defect one of them closed.**
   - Six issues were closed with reasons naming unmerged pull requests: iko and qxz at 15:57:51Z
     (pull request 4), is0 and u77 at 15:59:47Z (5 and 6), bls at 16:05:31Z (8) and f60 at
     16:07:47Z (9) (`closed_at` in `bd show <id> --json`). 44p and 4gp closed the same way, at
     16:12:14Z and 16:21:24Z (pull requests 10 and 11).
   - Those five pull requests merged between 16:52:52Z and 17:10:07Z (`gh pr list --state all
     --json number,mergedAt`), 47 to 68 minutes after their issues closed. None closed unmerged, so
     the risk the first review names under *Deliberately not changed* did not occur.
   - A different cost did. The template at `fad7da8` told every new worktree that the Stop hook runs
     `typecheck` / `lint:strict:cached` / `pipeline:check` (`git show
     fad7da8:.claude/worktree-CONTEXT.md.tmpl`, its Environment section). That is the briefing npe's
     worktree was given, while iko and qxz, the issues for that defect, read as closed. The third
     review's *Corrections* notes the same.
   - The session held npe open against step 7, with a note naming the six, and closed it at
     17:19:34Z after the maintainer said pull request 7 had merged.
   - **Not applied.** The second review's *Corrections* calls closing on green settled, because its
     run added no new evidence. This run does add evidence: a closed issue whose fix is not yet on
     `main` reads as fixed to every worktree cut in the gap. Step 7's close rule stands until the
     maintainer decides.

5. **Outside the skill, named and not fixed.**
   - **No file says how a gate header's four parts are labelled.** `CLAUDE.md` § Standing rules for
     prompts and gates spells the emitter's four labelled lines but describes a gate's four parts in
     prose. `git grep` over `*.md` finds neither `INVOCATION` nor `THE FAILURE IT EXISTS TO
     PREVENT`, though files under `scripts/` and `tools/` carry both. The session read four sibling
     headers (`graph.ts`, `example/emit.ts`, `selftest.ts`, `check.ts`) to infer CHECKS / THE
     FAILURE IT EXISTS TO PREVENT / INVOCATION / NEEDS. `bd list --all --desc-contains "invocation"`
     returns npe and v6m, both closed, and neither is about the spelling.
   - **The briefing still chains the rebase and inlines the body.** On `main` at `053e51c`, the
     Finishing section of `.claude/worktree-CONTEXT.md.tmpl` gives `git fetch origin && git rebase
     origin/main` as one command and `gh pr create ... --body "..."` with an inline body, against
     `CLAUDE.md` § Bash command style. `CLAUDE.md` § Worktree-local context gives the briefing
     precedence. The first review named this with no issue, and there is still none:
     `bd list --all --desc-contains` finds nothing for "Finishing" or "rebase origin/main", and for
     "worktree-CONTEXT" finds only iko, qxz and `asdlc-openspec-iy4`. iy4 covers the template's
     trunk-based sentence.

6. **Minor, and not the skill's.**
   - An unquoted `--include=*.ts` in a `grep` was expanded by zsh and failed once.
   - `awk 'length > 100'` counts bytes on this machine. Over `tools/pipeline/stale.ts` it reports 7
     lines, where counting characters with `node` gives 5, so two lines with a multi-byte character
     show as false positives.
   - No tracked file sets a line width: `git ls-files` finds no `.editorconfig` and no Prettier,
     markdownlint, Biome or ESLint config. The rewrap to 100 was self-imposed. `stale.ts`'s comments
     wrap at 100; its lines past 100 are four printed strings and one 101-character divider.

### Corrections to the run's own analysis

- **The six closes came earlier than "around 16:10Z".** They fell between 15:57:51Z and 16:07:47Z
  (finding 4).
- **Pull request 7 merged on a rebased head, not on `4d7fada`.** `4d7fada` is the head `verify`
  passed in 26s. The head that merged is `7e9df1d`, rebased at 17:11:10Z onto `8e614a5`, which is
  `main` after pull requests 4, 5, 6, 8, 9, 10 and 11 had merged (`git rev-parse 7e9df1d^`). It
  passed `verify` again in 25s and landed as `0746ef4`. The session's two gate runs tested
  `4d7fada` on `fad7da8`. Only CI's second run tested the tree that merged.

### Deliberately not changed

- **Step 7's close rule.** Finding 4's evidence is recorded; the decision is the maintainer's.
- **Reviewing before closing (steps 7 and 8 reordered).** The earlier review agent proposed it from
  this run. It is not applied: it does not help when the review cannot be written into the branch
  at all (finding 3), and it waits on the same decisions as findings 3 and 4.
- **Where the review lands (finding 3).** Two runs now show that an isolated review agent cannot
  write into the session's worktree. The third review's fix for its finding 5 was not applied
  either.
- **The `repo:` label's value in the command.** The skill keeps change-build's placeholder,
  `<the repo: label>`. The value belongs to the repository, and `CLAUDE.md` § The task store holds
  the rule.
- **Step 7's `human` follow-up.** It stays in step 7. Only the two sentences on searching and body
  sections moved to step 4, and step 7 points at them.
- **The briefing template, the header-label spelling and the minor items (findings 5 and 6).** This
  review writes only the skill and this file, and files nothing: the session that asked for it makes
  every tracker write.

### What this review could not verify

- No transcript was available. These rest on the account alone: the premise check by file and line;
  the claim, `EnterWorktree` and `npm ci` order; the single watcher; that no search was run before
  filing; the review agent's pinning and its refused `git -C` and Edit calls; the classifier's
  "Modify Shared Resources" refusal; the session's reason for starting the review before closing;
  the four sibling headers read; the zsh glob failure; and the earlier review agent's remark on line
  width.
- The briefing actually rendered into npe's worktree. This review read no other worktree. It read
  the template at `fad7da8`, and that `4d7fada`'s parent is `fad7da8`.
- Who rebased pull request 7's head to `7e9df1d`, and whether any gate ran locally on it.
- The earlier review agent's uncommitted edits. They were not read, by instruction; only its
  branch's position was checked.
- That `bd list --all --desc-contains` stays under its default limit of 50 rows for a common word.
  No phrase tested here came near it.
