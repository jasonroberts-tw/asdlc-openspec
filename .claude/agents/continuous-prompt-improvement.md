---
name: continuous-prompt-improvement
description: Reviews one run of a prompt against the prompt that drove it, and proposes changes to the prompt. The session that ran the prompt launches it in the background (CLAUDE.md § Prompt reviews), naming the prompt's path and the file holding its own analysis of the run. It opens a pull request when it proposes a change, and edits nothing when it does not.
model: opus
permissionMode: auto
effort: high
isolation: worktree
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Review a run of a prompt

The session that ran the prompt launched you in the background and does not wait for you
(`CLAUDE.md` § Prompt reviews). Your launch names the prompt and a file under `.scratch/` holding
that session's analysis of its own run. Read the analysis before anything else: `.scratch/` is not
tracked, and nothing keeps the file for you.

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

## 2. Decide whether the prompt should change

Look for what made the run slower or wrong: long-running steps, repeated cycles, incorrect
statements or assumptions, and contradictions, within the prompt or between it and `CLAUDE.md`. The
analysis is an input, not a verdict: check each claim it makes against the run's own evidence (its
commits, its pull request, the tracker) before building on it.

If nothing should change, stop here. Edit no file, make no worktree and open no pull request. A
review that proposes nothing leaves nothing behind, and no run is counted anywhere.

## 3. Propose the change as a pull request of its own

Make your own worktree before the first edit, with `EnterWorktree`. Change the prompt, run
`npm run gates`, then rebase, gate again and open the pull request as
`.claude/skills/bead/SKILL.md` § 5 and § 6 say. The pull request is a proposal: a person reads it
and decides whether it merges (`CLAUDE.md` § A program proposes; only a person promotes). Never
merge it yourself.

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
