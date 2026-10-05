---
name: open-pr
description: Open a pull request from an agent branch and see it through its checks - test the merge against the open pull requests, end the title with the ids of the issues it carries, pass the body from a file, set the reviewer's status pending from the session, watch with one watcher, and act on each outcome of verify and the pull-request reviewer. Use whenever a session opens a pull request - from the bead or change-finalize skill, the fan-out-work or prompt-review agent, or when asked to open one.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Open a pull request

A caller brings three things:

- **the branch**, `agent/<name>`, checked out in the session's worktree;
- **the issues it carries**, by id, or none;
- **the body**, in a file under `.scratch/`, holding what the caller says it holds.

This skill does the rest, and hands back the pull request and the outcome its checks reached
(step 7). What follows is the caller's.

## 1. The branch is ready

It is gated and rebased as `CLAUDE.md` § The gate ladder says. If it is not, do that first.

## 2. Test the merge against the open pull requests

    gh pr list --state open --json number,headRefName,files

For each one that touches a file this branch touches, test the merge:

    git merge-tree --write-tree --name-only origin/<its branch> HEAD

A shared file is not a conflict; a conflict this reports is. The body names each one (step 4).

## 3. The title

A sentence saying what changed, ending with the id of each issue the branch carries, in
parentheses and separated by commas. The branch review reads the issues from those parentheses and
nowhere else, with `prReviewIssuePattern` in `tools/policy/pr-review.json` (`CLAUDE.md` § Git workflow).

A pull request that carries no issue, such as a prompt review's, ends with no parentheses, and the
reviewer decides it by the floor like any other (`docs/decisions.md` § D-37). Never cite an issue
the branch does not carry.

## 4. The body

It opens with any register entry or prerequisite the caller names, then each conflict step 2 found,
with the pull request it is against. It ends with the attribution line Claude Code gives for pull
requests.

## 5. Push, open, and mark it pending

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

The base is typed (`CLAUDE.md` § Git workflow). Open it ready for review: the reviewer takes no
draft, so `--draft` only when the request says draft. If the create fails, run
`gh pr list --head <branch>` before retrying: a create can land after its client gives up.

Then, at once, set the reviewer's status pending on the new head:

    env PR=<number> node scripts/pr-review.mjs mark

Until it is done, a watcher has no check to wait on. Nothing else here sets `pr-review` by hand:
every verdict is the reviewer's workflow's.

## 6. Watch it with one watcher

First ask `gh pr view <number> --json mergeable` until it is not `UNKNOWN`. At `CONFLICTING`
GitHub starts no `verify`, so the watcher would never end: rebase as step 7's conflict row says.
Otherwise:

    gh pr checks <number> --watch

Run it in the background, and no second watcher; end the turn to wait only if its exit wakes the
session. If it exits at once with "no checks reported", nothing had registered yet: that is not a
failing check, and starting it again is not a second watcher.

## 7. Act on the outcome

The watcher ends once `verify` and the reviewer's `pr-review` check have both settled. The verdict
is that status and a comment on the pull request (`gh pr view <number> --comments`). The
descriptions below are the ones `scripts/pr-review.mjs` sets (`statusFor`, `chooseNext`).

| What the checks show | What it asks |
|---|---|
| `verify` fails, and `pr-review` says "verify failed at …; the review waits for a green run" | Read the failing job, then fix, gate and push on the same branch. |
| `pr-review` fails: "Conflicts with main: rebase onto origin/main and push" | Fetch, rebase onto `origin/main`, gate, and push with `--force-with-lease`. |
| `pr-review` passes: "Off the high-risk floor; the reviewer merges it" | The reviewer merges it. `gh pr view <number> --json state,mergedAt` shows `MERGED` once it has. |
| `pr-review` passes: "A person decides: …" | It waits for a person, for the reason given; say so, and why. Never apply the approval label yourself (`CLAUDE.md` § Git workflow). |
| `pr-review` errors: "The review did not complete: …" | Read the `act` job's log first: `gh run list --workflow pr-review.yml`, then `gh run view <run> --log-failed`. A cause in the reviewer's own workflow is not this branch's to fix: the caller files it as a defect found on the way, and the pull request waits on that issue. A cause that does not repeat, such as a network error, is run again once with the command the comment gives, `gh workflow run pr-review.yml -f pr=<number>`. |

A push makes a new head with no status: review it first unless the push only rebased, mark it
(step 5), and watch it again (step 6).

The reach and co-change partners the comment prints decide nothing, and no push answers them.

Hand the caller the pull request's number and URL, and the outcome in the words of its status.
