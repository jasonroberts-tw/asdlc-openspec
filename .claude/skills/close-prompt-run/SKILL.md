---
name: close-prompt-run
description: Close a run of a prompt executed from a file - write the run's analysis as a note in the tracker, and launch the batched prompt review in the background, under a name of its own, when one is due. Use as the closing step of every such run, after its tracker push (CLAUDE.md § Prompt reviews).
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Close a prompt run

This skill is the one home of the analysis's form, of the rule for what is pending, and of a
review's name; the read and held lines' form is the agent's. The markers and thresholds below are
keys of `tools/policy.json`.

## 1. Write the analysis, or none

No analysis is written by a prompt another prompt called, such as `open-pr` inside `bead`, whose
caller's analysis names it; by the reviewer's own run; or by a run that worked no issue, which goes
unreviewed. Such a run stops here.

Any other run writes one analysis, as a note on the issue or epic it worked
(`bd note <id> --file <file>`). A run that worked several issues writes one, on the first one its
pull request's title carries. Its first line is
`promptReviewAnalysisMarker`, a space, and the run id: the issue's id, `@`, and the UTC second the
note is written, as `date -u +%Y-%m-%dT%H:%M:%SZ` prints it. The next lines name every prompt file
the run loaded and the commit it read them at. Then comes the analysis: what made the run slower or
wrong, each point with the prompt it concerns. It ends with the counts across runs that
`.claude/skills/change-finalize/SKILL.md` § 9. Report prints, so the reviewer can tell a finding
that recurs from one seen once. The tracker is public, so an analysis quotes no secret.

## 2. Check whether a review is due

After the tracker push, list every issue carrying an analysis,
`bd list --all --notes-contains "<analysis marker>" --json -n 0`. In an issue's notes, an analysis
runs from its marker line to the next line that opens with `promptReviewAnalysisMarker`,
`promptReviewReadMarker` or `promptReviewHeldMarker`, and it is pending while no line of
`promptReviewReadMarker`, a space and its run id follows it.

A review is due when `promptReviewDueCount` analyses or more are pending, or the oldest, by the time
in its run id, is older than `promptReviewDueAgeDays` days. None starts while a pull request from a
branch `agent/review-prompts-*` is open (`gh pr list --state open --json headRefName`), or while
`claude agents --json` lists a session whose name starts with `review-prompts` and whose `state` is
`working`: the pending analyses wait for it. Counting only a working one keeps a finished review
that is still open from holding up the next. When no review is due, or none may start, stop here.

## 3. Launch the review

Name the review once: `review-prompts-` and the UTC date and time, as `date -u +%Y%m%d-%H%M` prints
them. It is the name of the review's session, of its worktree and, as `agent/<name>`, of its branch,
and the only way a review tells itself from another one that is working.

Leave your worktree (`ExitWorktree`, action `keep`): a background session launched inside a linked
worktree writes on that worktree's branch. From
the primary checkout, launch the reviewer, with the name in both places:

    claude --bg --agent continuous-prompt-improvement --permission-mode auto --name <name> "Review the pending prompt-run analyses as <name>."

The mode is passed on the command line because a session started this way does not apply an agent
file's `permissionMode`, and unless the machine's default is `auto` would stop at its first
permission prompt with nobody waiting on it. Neither wait for the reviewer nor relay what it finds.

## 4. Report

Name the issue and run id of the analysis, if one was written, and, if a review launched, its name
and the session the launch printed.
