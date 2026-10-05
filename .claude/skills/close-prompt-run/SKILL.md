---
name: close-prompt-run
description: Close a run of a prompt executed from a file - write the run's analysis as a note in the tracker, and launch the batched prompt review in the background, under a name of its own, when one is due. Use as the closing step of every such run, after its tracker push (CLAUDE.md § Prompt reviews).
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Close a prompt run

This skill is the one home of when a review starts and of a review's name. The form of each line a
run or a review writes in the tracker, the analysis's among them, and what is pending, are the
header of `scripts/prompt-runs.mjs`. The `promptReview*` keys below are
`tools/policy/agent-workflows.json`'s.

## 1. Write the analysis, or none

No analysis is written by a prompt another prompt called, such as `open-pr` inside `bead`, whose
caller's analysis names it; by the reviewer's own run; or by a run that worked no issue, which goes
unreviewed. Such a run stops here.

Any other run writes one analysis, as a note on the issue or epic it worked
(`bd note <id> --file <file>`). A run that worked several issues writes one, on the first one its
pull request's title carries. It opens in the form the header of `scripts/prompt-runs.mjs` gives:
the marker line, with the UTC second the note is written as `date -u +%Y-%m-%dT%H:%M:%SZ` prints
it; each of this repository's prompts the run loaded, and no other, with its commit; and the line of
`claude --version`. Then comes the analysis: what made the run slower or wrong, each point with the
prompt it concerns. It ends with the counts, so the reviewer can tell a finding
that recurs from one seen once:
`bd count -t epic -l spec-change --by-label` (`specChangeLabel`), `bd count --by-label`, and
`bd count -l <label> --by-label` for each `foundAtLabels` label the second lists
(`.claude/skills/change-finalize/SKILL.md` § 9. Report). The tracker is public, so an analysis
quotes no secret.

## 2. Check whether a review is due

After the tracker push, run `mise run prompt-runs --only pending`. It prints whether a review is
due, by `promptReviewDueCount` and `promptReviewDueAgeDays`, and fails on a line in the tracker that
does not parse, naming it: report that line and stop, since no review starts until a person fixes
it.

None starts while a pull request from a
branch `agent/review-prompts-*` is open (`gh pr list --state open --json headRefName`), or while
`claude agents --json` lists a session whose name starts with `review-prompts` and whose `state` is
`working` (verified against the CLI, 2.1.289): the pending analyses wait for it. A finished one
still listed holds up none. When no review is due, or none may start, stop here.

## 3. Launch the review

Name the review once: `review-prompts-` and the UTC date and time, as `date -u +%Y%m%d-%H%M` prints
them. It is the name of the review's session, of its worktree and, as `agent/<name>`, of its branch,
and the only way a review tells itself from another that is working.

Leave your worktree (`ExitWorktree`, action `keep`): a background session launched inside a linked
worktree writes on that worktree's branch (not verified against the CLI). From the primary
checkout, launch the reviewer, with the name in both places:

    claude --bg --agent continuous-prompt-improvement --permission-mode auto --name <name> "Review the pending prompt-run analyses as <name>."

A session launched so ignores the agent file's `permissionMode`: without the flag, unless the
machine's default is `auto`, it would stop at its first permission prompt with nobody waiting
(not verified against the CLI). Neither wait for the reviewer nor relay what it finds.

## 4. Report

Name the issue and run id of the analysis, if one was written, and, if a review launched, its name
and the session the launch printed.
