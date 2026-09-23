---
name: change-finalize
description: Land a verified change - rebase, archive it into the living spec, open the pull request, and once the user says so, merge it, close its epic and clean up its worktree and branch. Use after change-verify, when asked to finalize, archive, ship or merge a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Finalize a change

The last of the six `change-*` stages (`docs/decisions.md` § D-02). It starts in the change's
worktree and ends in the primary checkout. The archive runs here, on the branch, before the merge,
so the living spec and the code land in the same pull request. Every tracker write below sits
inside the bracket `CLAUDE.md` § The task store describes.

## 1. Find the change and its epic

- **The change.** The branch is `agent/<change>` (`git branch --show-current`). From the primary
  checkout, enter the worktree with `EnterWorktree` and the path `.claude/worktrees/<change>`.
- **The epic.** It is the one issue that
  `bd list --label spec-change --type epic --metadata-field change=<change> --json` returns. If none
  or several come back, stop and say what was found.

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
  the capability covers. `npm run openspec:check` refuses the placeholder.
- **Read each living spec the archive touched.** The merge is mechanical, so fix any requirement
  that now reads wrongly beside its neighbours. The living spec is hand-maintained source.
- Then run `npm run gates`.
- **Commit** the archive move, the living spec and the Purpose together, with the message passed
  from a file under `.scratch/`.

## 5. Push, and open the pull request

Run `git push -u origin agent/<change>`.

Write the body to `.scratch/<change>-pr.md`. It covers:

- what changed, from the proposal's What Changes;
- each requirement added, modified, removed or renamed, and the living spec files now holding them;
- the scenario trace from `change-verify`, as re-run in step 2;
- the epic and its closed tasks;
- what was deliberately left undone, and every issue filed along the way.

Every figure in the body is re-derived (`CLAUDE.md` § Verification before claiming).

Then run `gh pr create --base main --head agent/<change> --title "<change>: <what changed>" --body-file .scratch/<change>-pr.md`.

Poll the checks in the background, and never end the turn while they run. Read a failing check, fix
it on the branch, and push again.

## 6. Leave the worktree

Call `ExitWorktree` with `keep`. The branch is not in the trunk yet, so `remove` would either refuse
or discard it. The session is back in the primary checkout.

## 7. Merge, on the user's word

Merging is the person's call, and `scripts/hooks/guard-git.mjs` refuses it from a worktree. Ask the
user. On a yes, run `gh pr merge <number> --rebase --delete-branch`.

Always rebase, never squash. `npm run worktree:gc` can prove a rebase-merged branch is in the trunk,
but it keeps a squash-merged one.

If the remote branch survives the merge, run `git push origin --delete agent/<change>`.

## 8. Close the epic, and clean up

1. Close the epic: `bd close <epic> --reason "Merged in <pull request URL>; archived as openspec/changes/archive/<date>-<change>/"`.
2. Update the primary checkout: `git fetch origin`, then `git pull --rebase`.
3. Run `npm run worktree:gc`. It removes the change's worktree and its local branch once it has
   proved their commits are in `origin/main`.
4. Confirm with `git worktree list` that the worktree is gone.

## 9. Report

Report:

- the pull request and its merge;
- the epic, closed;
- the living spec files and the archive path;
- both gate runs, as measured;
- every issue filed along the way;
- a `RUN THESE YOURSELF` block for any command that was refused (`CLAUDE.md` § Guards).
