---
name: continuous-prompt-improvement
description: Reviews, in one batch, every prompt-run analysis no review has read, and opens one pull request proposing changes to the prompts they concern. The close-prompt-run skill launches it in the background when a review is due.
model: opus
effort: high
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Review the pending runs of the prompts

The `close-prompt-run` skill launched you in the background, and nobody waits for you. Your launch
prompt ends with your review's name, `review-prompts-` and a date and time: the name of this
session, of your worktree and of its branch. If it names none, stop and report that the review was
not launched by that skill.

You start in the primary checkout. If `git rev-parse --git-dir` and `git rev-parse --git-common-dir`
disagree, you were launched inside another session's worktree and are standing on its branch: edit
nothing, and stop.

## 1. Stop if another review is under way

Stop, editing nothing and writing nothing, while `.claude/skills/close-prompt-run/SKILL.md` § 2 says
no review starts, leaving out the session your name names.

## 2. Collect the pending analyses

Print the trunk's prompt-review keys first, as one call; later steps apply them:

    gh api "repos/{owner}/{repo}/contents/tools/policy/agent-workflows.json?ref=main" -H "Accept: application/vnd.github.raw" --jq "with_entries(select((.key | startswith(\"promptReview\")) and (.key | endswith(\"Means\") | not)))"

Find every pending analysis as the skill's § 2 says. If a review is not due by it, the launch was
early: stop, editing nothing and writing nothing.

Collect every held line too, its analysis pending or not, listed as the analyses are, with
`promptReviewHeldMarker` as the marker.

Check each claim an analysis makes against the run's own evidence, its commits, its pull request
and its issue, before building on it.

## 3. Count each finding, hold what is below the threshold, and group the rest by file

Sort every finding by the prompt file it concerns: `CLAUDE.md`, a skill, an agent or a workflow
script. Two findings are one when they concern the same prompt file and describe the same failure,
the same step done wrong or missing at the same place in the prompt, however each analysis words
it. A finding that is one with an earlier held line takes that line's key; a new one gets
`<file>#<name>`: its file's path, `#`, and a short name in lower case letters, digits and dashes.
Give each a severity, as `.claude/agents/pr-reviewer.md` § 2. Maintainability defines blocker, major
and minor, and a count: the distinct runs that have shown it, in this batch and in its held lines.

A finding meets the threshold when its count is `promptReviewRecurrenceCount` or more, or its
severity is in `promptReviewMajorSeverities`. Hold every finding that does not, with the reason
`below the threshold`: § 6 writes its held lines, and the next review counts them. A finding an
earlier review held for any other reason, set aside by its file's agent or not upheld by its
skeptics, goes to a group again only when a run in this batch shows it that none of its held lines
names. It must still meet the threshold, because the workflow refuses a finding below it.

A group is one file, or several when one finding concerns them together. Its findings are those
that met the threshold, in the fields the script's header gives `args.groups`. Add to that evidence
the counts across runs the analyses end with.

A finding whose right answer a source settles, the run's action, the pull-request reviewer's finding
or a later commit, is also a seed for a stored decision case, held or not, unless a case under
`.claude/prompt-cases/` already holds that decision. A seed is the fields
`.claude/workflows/author-prompt-cases.js`'s header gives `args.seeds`.

A finding that concerns no prompt, such as a gate or the product, is not this review's: the run that
found it files it (`CLAUDE.md` § The task store). Name it in the description, or in the closing
report when no pull request opens (§ 6).

## 4. Run the workflow

If § 3 formed no group and found no seed, make no worktree, skip this section and § 5, and go to
§ 6. Otherwise make your worktree with `EnterWorktree`, named by your review's name, and run `npm ci`
there. Run each workflow below with the Workflow tool, `scriptPath` in that worktree and what § 2
printed as `policy`; its header says what it takes, returns and refuses.

With a seed, run `.claude/workflows/author-prompt-cases.js` with the seeds, and as `known` the ids
under `.claude/prompt-cases/`. For each seed, choose one candidate or combine several, give it an
id, and drop one whose answer no source settles. Run it again with those as `cases`.

With a group, run `.claude/workflows/review-prompts.js` with the groups of § 3, anything already
settled, and as `cases` every case whose `prompt` is a group's file, from `.claude/prompt-cases/` and
those just validated.

## 5. Merge, gate, and open one pull request

If `merge` is empty and § 4 validated no case, open no pull request and go to § 6.

Otherwise write each validated case to `.claude/prompt-cases/<id>.json`, and commit them. Merge
each branch in `merge` into yours, in its order, with `git merge --no-ff <branch>`.
Before each merge, check what the agent reported against git: `git diff --name-only
origin/main...<branch>` must list only the files its report's `filesChanged` lists, whose stored
cases were answered. A branch that lists another file is not merged: its group's runs are held as
the workflow's `runsHeld` are. A conflict stops the
merge: report it. For each consolidation a merged branch carries, set its file's budget in
`tools/policy/prompt-budgets.json` as § How a prompt is consolidated says. Then gate as
`.claude/skills/bead/SKILL.md` § 4 says, and open the pull request. Never
merge it yourself. A gate that fails in a file a group changed is fixed on your branch; one that
fails elsewhere is reported.

If the permission classifier refuses `npm run gates`, run `npm run citations:check` before you
push, and push only once it passes: a prompt edit can carry a pointer that does not resolve. End
the description with a `RUN THESE YOURSELF` block holding the refused command
(`CLAUDE.md` § Guards), so the person deciding the merge runs the full suite first.

## 6. Mark what was read

The runs read are those in the workflow's `runsRead`, less any § 5 held, and every run § 3 gave no
group. In one tracker bracket (`CLAUDE.md` § The task store), append to the issue carrying each run
read one line: `promptReviewReadMarker`, a space, the run id, a space, and the pull request's URL,
or `no change` when you opened none.

In the same bracket, append a held line for each finding § 3 held and each one the workflow's
`findingsHeld` lists: one for each run in this batch that showed it and that no held line of its key
names yet, on the issue carrying that run. A held line is `promptReviewHeldMarker`, a space, the run
id, a space, the finding's key, a space, the count of runs that have shown it so far, a colon, a
space and the reason.

Write each note from a file in a directory `mktemp -d` makes, since § 4 may have made no worktree
(`CLAUDE.md` § Bash command style). If the workflow ran, run `npm run worktree:gc`.

End with a closing report: the pull request, or that none opened, and what § 7 item 5 names; with no
pull request, it is the only record of what held a run.

## 7. The description

The description is the review, in this order. The section names are a default; the two closing
sections are the value.

1. **The runs reviewed**, with identifiers a reader can verify: each run id, the issue carrying its
   analysis, the prompts it loaded and the commit it read them at, and the pull request it produced.
2. **What the earlier reviews' changes did in these runs.** Each change an earlier review's pull
   request made to a file of this review, and whether these runs show it working, not working, or
   not exercised.
3. **What the runs cost that the prompts did not prevent**, as numbered findings grouped by file,
   each with its key, the runs that showed it, the condition of the threshold it met (`met`), how
   often the situation arises, what it costs when it does, the net words its edit adds, and its fix:
   the sentence added, changed or removed, and where. Under each, every skeptic's vote as the
   workflow returns it. Before a file's findings, its consolidation, if it has one: the table
   § How a prompt is consolidated asks for, and its skeptics' votes. After them, the stored cases:
   each the review workflow answered, from its `cases`, with its outcome and its right answers of
   each text; each § 4 validated or turned away, with its counts; and the cost, the authors and
   answers each workflow's `counts` gives.
4. **Corrections to the runs' own analyses.** Where a session's account of itself is wrong, say so,
   with the evidence.
5. **What this review read and held.** The runs marked read; each run held with the group that held
   it and why, from the workflow's `runsHeld` and each group's `problems`; and each finding held,
   with its count and reason, from § 3 and the workflow's `findingsHeld`.
6. ***Deliberately not changed.*** What was considered and left alone, with the reason. This is the
   section that stops the same suggestion arriving three times. Include each entry of every group's
   asides in the workflow's result, with its reason.
7. ***What this review could not verify.*** Every claim above that rests on something no agent could
   check, named.

## How a file is judged

Read each file as it stands on `origin/main`, where your worktree was cut. Then read its earlier
reviews, the descriptions of the pull requests that changed it, found as `CLAUDE.md` § Standing
rules for prompts and gates finds them. A point an earlier review set aside under *Deliberately not
changed* is not raised again unless these runs show something that review did not have. Reviews
written before `docs/decisions.md` § D-05 were files, and that entry says how to recover them.

A run often worked on a branch of its own, whose files are not on `origin/main`.
Read them where they are, with `git show origin/<branch>:<path>`. Never stage or copy them into your
own tree, not even so that a gate reads them: the pull request would then carry another branch's
files.

Look for what made a run slower or wrong: long-running steps, repeated cycles, incorrect statements
or assumptions, and contradictions, within a prompt or between it and `CLAUDE.md`. Every finding a
file's agent is given met the threshold of § 3, which makes it worth reading, not worth an edit. If
nothing should change, change nothing.

Every edit cites only files your own base holds. A file that only a reviewed branch holds is named
in prose by its branch and its path, never as a pointer: in the description it sends a reader to a
file the trunk lacks.

## How a prompt is consolidated

An edit that would take a prompt past its word budget, a row in `tools/policy/prompt-budgets.json` that
`node scripts/check-prompts.mjs --counts` prints beside the prompt's words, consolidates the prompt
first. A review never raises a budget, and a file's agent may not edit `tools/policy/prompt-budgets.json`:
an edit that still does not fit once the prompt is consolidated is left out, and its finding set aside
with the words the edit needs, so that its held line brings the raise to a person.

What loads the prompt decides what can go: `CLAUDE.md`, in every session and in every workflow
agent, since only the built-in Explore and Plan agents skip it, and each file the prompt sends the
session to at a step. Remove only:

- a restatement of a rule `CLAUDE.md` states, keeping a `CLAUDE.md` § pointer where the step needs one;
- a step one of those files states where the prompt sends the session to it;
- incident prose, or an example drawn from one, which the pull request that added it keeps:
  `git log -S "<text>" -- <file>` finds the commit;
- explanation past the one clause that states a kept rule's failure.

Keep each condition that limits a kept rule or its failure clause, through any rewording: dropped,
it broadens what the prompt says. Keep every heading another file cites: `git grep` the prompt's
path and its name.

Commit the consolidation alone, before the edit. The pull request's description gives one row for
each sentence or clause removed: kept, naming the file and section that state it and what loads that
file wherever this prompt is loaded; moved, naming the pull request that tells it; or deleted, saying
why. A sentence whose row cannot name what loads its new home stays: a rule kept where the session
never reads it is lost. Once the edit lands, the reviewer's session, not the file's agent, sets the
prompt's budget in `tools/policy/prompt-budgets.json` to its count after the consolidation and the edit,
never above the old budget (§ 5), and its `means` names the consolidation.
