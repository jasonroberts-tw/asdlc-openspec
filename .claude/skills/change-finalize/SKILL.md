---
name: change-finalize
description: Land a verified change - rebase, archive it into the living spec, open the pull request, and once the user says so, merge it, clean up its worktree and branch, and close its epic once its acceptance criteria are checked. Use after change-verify, when asked to finalize, archive, ship or merge a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Finalize a change

The last of the six `change-*` stages (`docs/decisions.md` § D-02). It starts in the change's
worktree and ends in the primary checkout. The archive runs here, on the branch, before the merge,
so the living spec and the code land in the same pull request. Every tracker write below sits
inside the bracket `CLAUDE.md` § The task store describes. Every question below that recommends an
option takes the form `CLAUDE.md` § A question shows where its recommendation loses gives.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns (the
  label is `specChangeLabel` in `tools/policy.json`). If none or several come back, stop and say
  what was found.

## 2. Rebase, and verify again

Run `git fetch origin`, then `git rebase origin/main`. If the rebase conflicts in a way you did not
anticipate, stop and report it.

Then repeat `change-verify` from its step 2 on the rebased branch. A change that landed in the
meantime can leave this one's MODIFIED block naming a requirement that no longer reads the same.
`npm run openspec:check` says so.

## 3. Archive

Run `OPENSPEC_TELEMETRY=0 node_modules/.bin/openspec archive <change> --yes`. That is the pinned CLI
that `npm ci` installed. It does two things:

- merges every delta into `openspec/specs/`;
- moves the change to `openspec/changes/archive/<date>-<change>/`. The date is UTC.

It changes no file at all when a delta is invalid or does not apply. The gate would have caught that
in step 2, so a refusal here means stop and read it.

## 4. Settle the living spec

- **Write the Purpose of each new capability.** For each capability the archive created, replace
  its Purpose placeholder (`TBD - created by archiving change ...`) with a sentence or two on what
  the capability covers. `npm run openspec:check` refuses the placeholder. The archive also writes
  `## Purpose` and `## Requirements` with no blank line after them; add one, as the rest of the
  file has.
- **Read each living spec the archive touched.** The merge is mechanical, so fix any requirement
  that now reads wrongly beside its neighbours. The living spec is hand-maintained source.
- **Point the repository at the new paths.** `git grep -n "openspec/changes/<change>/"` lists every
  file that still names a path the archive moved. Point each at the living spec or the archive
  path, except a `docs/decisions.md` entry, which stays as recorded (`CLAUDE.md` § Decisions live in
  the register). The citations gate does not catch these: a bare path is not a citation it checks.
- Then run `npm run gates`.
- **Commit** the archive move, the living spec, the Purpose and every file repointed together, with
  the message passed from a file under `.scratch/`.

## 5. Push, and open the pull request

Run `git push -u origin agent/<change>`.

Write the body to `.scratch/<change>-pr.md`. It covers:

- what changed, from the proposal's What Changes;
- each requirement added, modified, removed or renamed, and the living spec files now holding them;
- the scenario trace from `change-verify`, as re-run in step 2;
- the epic and its closed tasks, each with the subject of the commit that closed it, not its id.
  The rebase in step 2 rewrote every id on the branch, and GitHub's rebase merge rewrites them
  again, so an id in a task's close reason never reaches the trunk;
- what was deliberately left undone, and every issue filed along the way.
  `bd dep list <epic> --direction=up` lists the tasks (`via parent-child`) and the filed issues
  (`via discovered-from`).

Every figure in the body is re-derived (`CLAUDE.md` § Verification before claiming).

Then run `gh pr create --base main --head agent/<change> --title "<change>: <what changed>" --body-file .scratch/<change>-pr.md`.

Poll the checks in the background, and never end the turn while they run. Read a failing check, fix
it on the branch, and push again.

## 6. Leave the worktree

Call `ExitWorktree` with `keep`. The branch is not in the trunk yet, so `remove` would either refuse
or discard it. The session is back in the primary checkout.

## 7. Merge, on the user's word

Merging is the person's call, and `scripts/hooks/guard-git.mjs` refuses it from a worktree. Ask the
user. On a yes, run `gh pr merge <number> --rebase --delete-branch`. If the user merges it
themselves, `gh pr view <number> --json state,mergedAt` shows `MERGED`; carry on from the remote
branch below, and then step 8.

Always rebase, never squash. `npm run worktree:gc` can prove a rebase-merged branch is in the trunk,
but it keeps a squash-merged one.

If the remote branch survives the merge (`git ls-remote --heads origin agent/<change>` prints it),
run `git push origin --delete agent/<change>`.

## 8. Clean up, check the epic's criteria, and close it

The cleanup comes first, because an epic's criteria can name its result, such as the worktree
gone.

1. Update the primary checkout: `git fetch origin`, then `git pull --rebase`.
2. Run `npm run worktree:gc -- --dry-run` first. The sweep is not scoped to this change: it
   removes every clean worktree under `.claude/worktrees/` whose branch it proves is in
   `origin/main`, with that branch. Where `/proc` is absent, as on macOS, it cannot see a session
   working in one, and a worktree just cut from `origin/main` is clean and proven
   (`scripts/prune-worktree-branches.mjs`, its header). If the dry run names only this change's
   worktree, run `npm run worktree:gc`. If it names others, show the user the list, and run it
   only on their word.
3. Confirm with `git worktree list` that the worktree is gone.
4. Check each of the epic's acceptance criteria. They are the bullets under `## Acceptance Criteria`
   in its description, and its `acceptance_criteria` field, as `bd show <epic> --json` prints them.
   Give each one a line for the report: the criterion, its state, and the command you ran or the
   file you read that shows the state now. The state is one of three:
   - **met**: the command or the file shows it holds;
   - **unmet**: it shows it does not;
   - **not exercised**: the criterion asks for a behaviour this change never triggered, such as a
     refusal that nothing gave cause for.

   The epic's own notes and a stage's report are not that evidence
   (`CLAUDE.md` § Verification before claiming). An epic with no criteria gets one line that says
   so.
5. For each criterion that is unmet or not exercised, ask the user whether to file a follow-up that
   carries it. File each follow-up they approve `discovered-from` the epic, as
   `.claude/skills/change-build/SKILL.md` § 5. What the build turns up files an out-of-scope issue,
   with finalize's found-at label. A criterion with no approved follow-up blocks the close, and the
   epic stays open. Otherwise close it:
   `bd close <epic> --reason "Merged in <pull request URL>; archived as openspec/changes/archive/<date>-<change>/"`,
   adding each follow-up's id and the criterion it carries.

## 9. Report

Report:

- the pull request and its merge;
- each of the epic's acceptance criteria as step 8 found it, with the command or file that shows
  its state, and each follow-up filed for one;
- the epic, closed, or the criteria that hold it open;
- the living spec files and the archive path;
- both gate runs, as measured;
- every issue filed along the way;
- the counts across runs, as each command prints them, with the number of changes behind them.
  They are the evidence a person reads for what keeps needing a fix (`CLAUDE.md` § A program
  proposes; only a person promotes), and the end of the analysis a prompt review is handed
  (`CLAUDE.md` § Prompt reviews). Report the counts, never a rate:
  - `bd count -t epic -l <the change label> --by-label`, where the label is `specChangeLabel` in
    `tools/policy.json`: its total is the number of changes, and its `rerouteLabels` rows are how
    many of them were sent back to each stage;
  - `bd count --by-label`: its `foundAtLabels` and `assetLabels` rows count the issues runs have
    filed, by where each was found and by what it would fix;
  - `bd count -l <label> --by-label`, once for each `foundAtLabels` label the previous command
    lists: the `assetLabels` rows are the pairs, the recurrence signal;
- a `RUN THESE YOURSELF` block for any command that was refused (`CLAUDE.md` § Guards).
