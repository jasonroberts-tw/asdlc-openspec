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
