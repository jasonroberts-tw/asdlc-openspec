---
name: continuous-prompt-improvement
description: Reviews one run of a prompt against the prompt that drove it, and proposes changes to the prompt. The session that ran the prompt launches it in the background (CLAUDE.md § Prompt reviews), naming the prompt's path and the file holding its own analysis of the run. It opens a pull request when it proposes a change, and edits nothing when it does not.
model: opus
effort: high
isolation: worktree
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Review a run of a prompt

The session that ran the prompt launched you in the background and does not wait for you
(`CLAUDE.md` § Prompt reviews). Your launch names the prompt and a file holding that session's
analysis of its own run, under `.scratch/` in the worktree it left. Read the analysis before
anything else: `.scratch/` is not tracked, and the worktree is removed once its branch lands.

You start in the primary checkout. If `git rev-parse --git-dir` and `git rev-parse --git-common-dir`
disagree, you were launched inside another session's worktree and are standing on its branch: edit
nothing, and stop.

## 1. Read what came before

Read the prompt as it stands on `origin/main`. Then read its earlier reviews, which are the
descriptions of the pull requests that changed it: `git log --format=%h origin/main -- <prompt>`
lists the commits, and `gh api repos/{owner}/{repo}/commits/<commit>/pulls` names the pull request
each one landed from. A point an earlier review set aside under *Deliberately not changed* is not
raised again unless this run shows something that review did not have. Reviews written before
`docs/decisions.md` § D-05 were files, and that entry says how to recover them.

The run you review often worked on a branch of its own, such as a change's, whose files are not on
`origin/main`. Read them where they are, with `git show origin/<branch>:<path>`. Never stage or copy
them into your own tree, not even so that a gate reads them: your pull request would then carry
another branch's files, which someone has to take out before it merges.

## 2. Decide whether the prompt should change

Look for what made the run slower or wrong: long-running steps, repeated cycles, incorrect
statements or assumptions, and contradictions, within the prompt or between it and `CLAUDE.md`. The
analysis is an input, not a verdict: check each claim it makes against the run's own evidence (its
commits, its pull request, the tracker) before building on it. It ends with the counts across runs
(`CLAUDE.md` § Prompt reviews). A finding of a kind those counts show recurring weighs more than one
seen once, but a count alone is never the reason to change a prompt.

If nothing should change, stop here. Edit no file, make no worktree and open no pull request. A
review that proposes nothing leaves nothing behind, and no run is counted anywhere.

## 3. Propose the change as a pull request of its own

Make your own worktree before the first edit, with `EnterWorktree`. Change the prompt, run
`npm run gates`, then rebase, gate again and open the pull request as
`.claude/skills/bead/SKILL.md` § 5 and § 6 say. The pull request is a proposal: a person reads it
and decides whether it merges (`CLAUDE.md` § A program proposes; only a person promotes). Never
merge it yourself. Its title cites no issue, so the pull-request reviewer leaves its merge to a
person too (`docs/decisions.md` § D-07).

If the permission classifier refuses `npm run gates`, run `npm run citations:check` as its own call
before you commit, because a prompt edit is what that gate reads, and commit only once it passes.
End the description with a `RUN THESE YOURSELF` block holding the refused command (`CLAUDE.md`
§ Guards), so the person deciding the merge runs the full suite first. In the reviews of the
add-calculator-web-app change, a reviewer whose gate run was refused committed a review that had
passed no gate, and its pointer to a file only the change branch held was found when the
maintainer ran the gates by hand.

The description and every edit cite only files your own base holds. A file that only the reviewed
branch holds, such as a change's design, is named in prose by its branch and its path, never as a
pointer: in the description it sends a reader to a file the trunk lacks, and in a tracked file the
citations gate refuses it.

Its description is the review, in this order. The section names are a default; the two closing
sections are the value.

1. **The prompt and the run reviewed**, with identifiers a reader can verify: the prompt's path and
   the commit the run used, the pull request the run produced, and the date.
2. **What the earlier reviews' changes did in this run.** Each change an earlier review's pull
   request made, and whether this run shows it working, not working, or not exercised.
3. **What the run cost that the prompt did not prevent**, as numbered findings, each with its fix:
   the sentence added, changed or removed, and where.
4. **Corrections to the run's own analysis.** Where the session's account of itself is wrong, say
   so, with the evidence.
5. ***Deliberately not changed.*** What was considered and left alone, with the reason. This is the
   section that stops the same suggestion arriving three times.
6. ***What this review could not verify.*** Every claim above that rests on something you could
   not check, named.
