---
name: open-pr
description: Open a pull request from an agent branch and see it through to its merge - test the merge against the open pull requests, watch with one watcher, act on each outcome of verify and the pull-request reviewer, enable auto-merge once both pass, wait for the merge, and remove the worktree and branch after it. Use whenever a session opens a pull request - from the bead or change-finalize skill, the fan-out-work or prompt-review agent, or when asked to open one.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Open a pull request

A caller brings three things:

- **the branch**, `agent/<name>`, checked out in the session's worktree;
- **the issues it carries**, by id, or none;
- **the body**, in a file under `.scratch/`, holding what the caller says it holds.

This skill does the rest, through step 8. What follows is the caller's.

## 1. The branch is ready

Gate and rebase it as `CLAUDE.md` § The gate ladder says.

## 2. Test the merge against the open pull requests

    gh pr list --state open --json number,headRefName,files

For each one that touches a file this branch touches, test the merge:

    git merge-tree --write-tree --name-only origin/<its branch> HEAD

A shared file is not a conflict; a conflict this reports is.

## 3. The title

A sentence saying what changed, ending with the ids the branch carries as `CLAUDE.md` § Git
workflow says, separated by commas. The branch review reads them from those parentheses and nowhere
else, with `prReviewIssuePattern` in `tools/policy/pr-review.json`.

A pull request that carries no issue, such as a prompt review's, ends with no parentheses. Never
cite an issue the branch does not carry.

## 4. The body

It opens with any register entry or prerequisite the caller names, then each conflict step 2 found,
with the pull request it is against. It ends with the attribution line Claude Code gives for pull
requests (verified against the CLI, 2.1.289).

## 5. Push and open it

First review the branch in a context of its own, once before each push: off the high-risk floor,
no later review reads it for correctness or maintainability (`docs/decisions.md` § D-37). Write the
title, on one line, to a file beside the body, then run

    env TITLE_FILE=<title file> BODY_FILE=<body file> REVIEW_DIR=.scratch/review node scripts/pr-review.mjs brief --local

and launch the `branch-reviewer` agent on `.scratch/review/brief.md`. It reviews the branch's last
commit. Fix each criterion it reports not met and each finding in a file the branch changes,
whatever its severity; commit, and gate as step 1 says. A doubt it leaves for a person goes to the
user before the push, or, with no user, into the body. Do not review those fixes again.

    git push -u origin <branch>
    gh pr create --base main --head <branch> --title "<title>" --body-file <file>

Open it ready for review, since GitHub merges no draft: `--draft` only when the request says draft.
If the create fails, run `gh pr list --head <branch>` before retrying: a create can land after its
client gives up.

## 6. Watch it with one watcher

First ask `gh pr view <number> --json mergeable` until it is not `UNKNOWN`. At `CONFLICTING`
GitHub starts no `verify`, so the watcher would never end: rebase as step 7's conflict row says.
Otherwise:

    gh pr checks <number> --watch

Run it in the background, and no second watcher; end the turn to wait only if its exit wakes the
session (verified against the CLI, 2.1.289). If it exits at once with "no checks reported", nothing
had registered yet: that is not a failing check, and starting it again is not a second watcher.

## 7. Act on the outcome

The watcher ends once `verify` and the `review #<number>` job have both settled. The reviewer's
verdict is its review on the head (`gh pr view <number> --json reviews`), whose bodies
`scripts/pr-review.mjs` sets (`reviewFor`); the run each names gives every reason.

| What the checks and the review show | What it asks |
|---|---|
| `verify` fails | Read the failing job, find its cause with the `root-cause` skill where it is not yet known, then fix, gate and push on the same branch. |
| The pull request conflicts with `main` | Fetch, rebase onto `origin/main`, gate, and push with `--force-with-lease`. |
| `verify` passes and the reviewer approved: "Off the high-risk floor: auto-merge can merge it once verify passes" | Have GitHub merge it, with `prReviewMergeMethod` (`tools/policy/pr-review.json`): `gh pr merge <number> --auto --rebase`. Then wait (step 8). |
| The reviewer commented "A person decides: …" | It waits for a person's approval, for the reason given; say so, and why, then wait (step 8). |
| The reviewer commented "The review did not complete: …", or the `review #<number>` job fails | Read that run: `gh run view <run> --log-failed`. A cause in the reviewer's own workflow is not this branch's to fix: the caller files it as a defect found on the way, and the pull request waits on that issue. A cause that does not repeat, such as a network error, is the maintainer's (`docs/decisions.md` § D-51): give them `gh run rerun <run> --failed`, and the pull request waits on it. |

Never approve it, pass `--admin`, nor ask GitHub to merge a head not yet approved and passed: each
merges a head no person read (`CLAUDE.md` § Git workflow).

A push makes a new head, which the reviewer decides again: review it first unless the push only
rebased, and watch it again (step 6).

## 8. Wait for the merge, then clean up

Once GitHub is asked to merge it, or a person decides with a user told why, run in the background,
as the one watcher:

    env PR=<number> node scripts/pr-review.mjs wait

It prints one line, and exits 0 once the pull request has merged. It exits 1 once it has closed
unmerged; once nothing will merge it, when step 7's row applies or the line gives the command; or on
a failed read, after which starting it again is not a second watcher. With no user, a person's verdict
is handed back unmerged, since nobody would tell the person it waits on.

Once it has merged, clean up from the primary checkout. GitHub deletes the remote branch itself, by
the maintainer's setting; it needs no check or mention. A session by then in another branch's
worktree cleans up once it leaves that one, naming each merged worktree with its own `--finished`.

1. Leave the worktree with `ExitWorktree`, action `keep`. The sweep below keeps it while this
   session or a process it started is there; a `--finished` run after the session ends removes it
   (not verified against the CLI).
2. Run `git fetch origin`, then `mise run worktree:gc --dry-run --finished <worktree>`. The sweep is
   not this worktree's alone (`scripts/prune-worktree-branches.mjs`). If the dry run names this
   worktree alone, run it again without `--dry-run`; if it names others, only on the user's word,
   and with no user, report them. One that keeps this worktree is reported with the reason it gives.

Hand the caller the pull request's number and URL, whether it merged, in `wait`'s line or the words
of its status, and what the cleanup removed.
