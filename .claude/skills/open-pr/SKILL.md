---
name: open-pr
description: Open a pull request from an agent branch and see it through its checks - test the merge against the open pull requests, end the title with the ids of the issues it carries, pass the body from a file, set the reviewer's status pending from the session, watch with one watcher, and act on each outcome of verify and the pull-request reviewer. Use whenever a session opens a pull request - from the bead or change-finalize skill, the fan-out-work or prompt-review agent, or when asked to open one.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Open a pull request

This is the one home for opening a pull request here. A caller brings three things:

- **the branch**, `agent/<name>`, checked out in the session's worktree;
- **the issues it carries**, by id, or none;
- **the body**, in a file under `.scratch/`, holding what the caller says it holds.

This skill does the rest, and hands back the pull request and the outcome its checks reached
(step 7). What follows, such as closing an issue or removing a worktree, is the caller's.

## 1. The branch is ready

It has passed `npm run gates` twice, before and after a rebase onto `origin/main`
(`CLAUDE.md` § The gate ladder). If it has not, do that first.

## 2. Test the merge against the open pull requests

    gh pr list --state open --json number,headRefName,files

For each one that touches a file this branch touches, test the merge:

    git merge-tree --write-tree --name-only origin/<its branch> HEAD

A shared file is not a conflict; a conflict this reports is. The body names each one (step 4).

## 3. The title

A sentence saying what changed, ending with the id of each issue the branch carries, in
parentheses and separated by commas: `worktree:selftest renders the briefing template it is globbed
on (asdlc-openspec-pb2)`. The reviewer reads the issues from those parentheses and nowhere else,
with `prReviewIssuePattern` in `tools/policy.json`, and holds the pull request to their acceptance
criteria (`CLAUDE.md` § Git workflow). An id in the title's middle or in the body is not carried.

A pull request that carries no issue, such as a prompt review's, ends with no parentheses. The
reviewer then leaves its merge to a person (`docs/decisions.md` § D-07). Never cite an issue the
branch does not carry to get it reviewed.

## 4. The body

It is passed from its file with `--body-file` (`CLAUDE.md` § Bash command style). It opens with
any register entry or prerequisite the caller names, then each conflict step 2 found, with the pull
request it is against. It ends with the attribution line the harness gives for pull requests.

## 5. Push, open, and mark it pending

    git push -u origin <branch>
    gh pr create --base main --head <branch> --title "<title>" --body-file <file>

The base is typed, never inferred (`CLAUDE.md` § Git workflow), and
`scripts/hooks/guard-git.mjs` refuses a create that does not name it. Open it ready for review: the
reviewer takes no draft, so `--draft` only when the request says draft. If the create fails, run
`gh pr list --head <branch>` before retrying: a create can land after its client gives up.

Then, at once, set the reviewer's status pending on the new head:

    PR=<number> node scripts/pr-review.mjs mark

The workflow's own `mark` job does the same, seconds later, and until one of them has, a watcher has
no check to wait on. The command marks only a head nobody has marked, and prints why when it does
not. It sets no other state, and nothing else here sets `pr-review` by hand: every verdict is the
reviewer's workflow's.

## 6. Watch it with one watcher

    gh pr checks <number> --watch

Run it in the background, and no second watcher; never end the turn while it runs. If it exits at
once with "no checks reported", nothing had registered yet: that is not a failing check, and
starting it again is not a second watcher.

## 7. Act on the outcome

The watcher ends once `verify` and the reviewer's `pr-review` check have both settled. `pr-review`
stays pending until the reviewer has judged the head, which it does once `verify` passes there. The
verdict is that status and a comment on the pull request (`gh pr view <number> --comments`). The
descriptions below are the ones `scripts/pr-review.mjs` sets (`statusFor`, `chooseNext`).

| What the checks show | What it asks |
|---|---|
| `verify` fails, and `pr-review` says "verify failed at …; the review waits for a green run" | Read the failing job, then fix, gate and push on the same branch. |
| `pr-review` fails: "Conflicts with main: rebase onto origin/main and push" | Fetch, rebase onto `origin/main`, gate, and push with `--force-with-lease`. |
| `pr-review` fails: "Changes requested: …" | Read the comment's reasons, then fix, gate and push on the same branch. The reviewer judges the new head. |
| `pr-review` passes: "Every dimension passes; the reviewer merges it" | The reviewer merges it. `gh pr view <number> --json state,mergedAt` shows `MERGED` once it has. |
| `pr-review` passes: "A person decides: …" | It waits for a person, for the reason given; say so, and why. A person merges it, or applies the approval label for the reviewer to merge it. Never apply the label yourself (`CLAUDE.md` § Git workflow). |
| `pr-review` errors: "The review did not complete: …" | Read the review job's log first: `gh run list --workflow pr-review.yml`, then `gh run view <run> --log-failed`. A cause in the reviewer's own workflow is not this branch's to fix: the caller files it as a defect found on the way, and the pull request waits on that issue. A cause that does not repeat, such as a network error, is run again once with the command the comment gives, `gh workflow run pr-review.yml -f pr=<number>`. |

A push makes a new head with no status: mark it (step 5) and watch it again (step 6).

Hand the caller the pull request's number and URL, and the outcome in the words of its status.
