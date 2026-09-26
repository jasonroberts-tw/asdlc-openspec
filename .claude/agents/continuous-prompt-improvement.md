---
name: continuous-prompt-improvement
description: Reviews every run of a prompt that no review has read yet, in one batch, and proposes changes to the prompts they concern. A run whose closing step finds a review due launches it in the background (CLAUDE.md § Prompt reviews). It reads the runs' analyses from the tracker, runs one agent per prompt file through .claude/workflows/review-prompts.js, opens one pull request over what they change, and marks each analysis read. It edits nothing when nothing should change.
model: opus
effort: high
isolation: worktree
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Review the pending runs of the prompts

A run whose closing step found a review due launched you in the background, and nobody waits for you
(`CLAUDE.md` § Prompt reviews). Your input is every analysis in the tracker that no review has read
yet. Your output is one pull request over every prompt file the analyses show should change, or none,
a read line for each analysis you read, and a held line for each finding you read and did not carry
into that pull request.

You start in the primary checkout. If `git rev-parse --git-dir` and `git rev-parse --git-common-dir`
disagree, you were launched inside another session's worktree and are standing on its branch: edit
nothing, and stop.

## 1. Stop if another review is under way

Stop, editing nothing and writing nothing, while `CLAUDE.md` § Prompt reviews says no review starts:
a pull request from a review's branch is open, or `claude agents --json` lists a session of the
review's name, besides this one, whose `state` is `working`.

## 2. Collect the pending analyses

Find every pending analysis as `CLAUDE.md` § Prompt reviews says. Apply both thresholds again,
`promptReviewDueCount` and `promptReviewDueAgeDays`, the age read from the run id's time. If neither
holds, the launch was early: stop, editing nothing and writing nothing.

Collect every held line too, whether its analysis is pending or not: with `promptReviewHeldMarker`
as the marker, `bd list --all --notes-contains "<held marker>" --json -n 0` lists the issues that
carry one, and § 3 counts each.

An analysis is an input, not a verdict. Check each claim it makes against the run's own evidence,
its commits, its pull request and its issue, before building on it, and read a file the run worked
on its own branch where it is, as § How a file is judged says.

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
earlier review held for another reason goes to a group again only when a run its held lines do not
name shows it, as § How a file is judged asks of a point set aside.

A group is one file, or several when one finding concerns them together, such as two prompts that
contradict each other; a file is in one group only. Its findings are those that met the threshold,
each with its key, title, severity, count, the run ids in this batch that showed it, and what those
runs showed. Add to that evidence the counts across runs the analyses end with.

A finding that concerns no prompt, such as a gate or the product, is not this review's: the run that
found it files it (`CLAUDE.md` § The task store). Name it in the description, or in the closing
report when no pull request opens (§ 6). A run with no finding on any prompt, or whose every finding
was held, gets no group: the workflow never sees it, and § 6 marks it read all the same.

## 4. Run the workflow

Make your own worktree, with `EnterWorktree` and the name `CLAUDE.md` § Prompt reviews gives a
review's worktree, and run `npm ci` there; § 6 writes its tracker notes from its `.scratch/`. If § 3
formed no group, skip the workflow and § 5, and go to § 6. Otherwise print the policy's
prompt-review keys there, as one call:

    node -p "JSON.stringify(Object.fromEntries(Object.entries(require('./tools/policy.json')).filter(([k]) => k.startsWith('promptReview') && !k.endsWith('Means'))))"

If its threshold differs from the one § 3 applied, apply § 3 again with it. Then run the Workflow
tool with `scriptPath` set to `.claude/workflows/review-prompts.js` in that worktree, and `args`
holding the groups of § 3, what that call printed as `policy`, and anything already settled. The
script's header says what each agent is told, what it returns, the rules it holds each agent's
report to, and how the skeptics judge each change. It refuses a finding below the threshold before
any agent runs. It returns the branches to merge, each group's report and status, each change's
votes, which runs were read and which held, and the findings to hold.

## 5. Merge, gate, and open one pull request

If `merge` is empty, open no pull request and go to § 6.

Otherwise merge each branch in `merge` into yours, in its order, with `git merge --no-ff <branch>`.
Before each merge, check what the agent reported against git: `git diff --name-only
origin/main...<branch>` must list only files of that branch's group. A branch that lists another file
is not merged: its group's runs are held as the workflow's `runsHeld` are, for the reason § 6
reports. The groups share no file, so a conflict means something the script did not catch: stop and
report it. For each consolidation a merged branch carries, set its file's budget in
`tools/policy.json` as § How a prompt is consolidated says.
Then run `npm run gates`, rebase onto `origin/main` and run it again, as
`.claude/skills/bead/SKILL.md` § 4 and § 5 say, and open the pull request with the `open-pr` skill.
Its title cites no issue, and a person decides whether it merges: never merge it yourself. A gate
that fails in a file a group changed is fixed on your branch; one that fails elsewhere is reported.

If the permission classifier refuses `npm run gates`, run `npm run citations:check` as its own call
before you push, because a prompt edit is what that gate reads, and push only once it passes: a
review that passed no gate can carry a pointer that does not resolve. End the description with a
`RUN THESE YOURSELF` block holding the refused command (`CLAUDE.md` § Guards), so the person deciding
the merge runs the full suite first.

## 6. Mark what was read

The runs read are those in the workflow's `runsRead`, less any § 5 held, and every run § 3 gave no
group. In one tracker bracket (`CLAUDE.md` § The task store), append to the issue carrying each run
read one line: the read marker, a space, the run id, a space, and the pull request's URL, or
`no change` when you opened none. Write the lines from a file under `.scratch/` with
`bd note <id> --file <file>`. A run held gets no line and stays pending for the next review.

In the same bracket, append a held line, as `CLAUDE.md` § Prompt reviews spells it, for each
finding § 3 held and each one the workflow's `findingsHeld` lists, with its count and its reason:
one for each run in this batch that showed it and that no held line of its key names yet, on the
issue carrying that run.

Then run `npm run worktree:gc`. It removes each agent's worktree whose branch is already in
`origin/main`, which is every one that changed nothing; the others go once your pull request merges.

End with a closing report: the pull request, or that none opened; the runs read; each run held, with
the group that held it and why; each finding held, with its count and reason; and each finding that
concerns no prompt. The description names the same, but when no pull request opens this report is
the only record of what held a run.

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
   § How a prompt is consolidated asks for, and its skeptics' votes.
4. **Corrections to the runs' own analyses.** Where a session's account of itself is wrong, say so,
   with the evidence.
5. **What this review read and held.** The runs marked read; each run held with the group that held
   it and why, from the workflow's `runsHeld` and each group's `problems`; and each finding held,
   with its count and reason, from § 3 and the workflow's `findingsHeld`.
6. ***Deliberately not changed.*** What was considered and left alone, with the reason. This is the
   section that stops the same suggestion arriving three times.
7. ***What this review could not verify.*** Every claim above that rests on something no agent could
   check, named.

## How a file is judged

Each agent the workflow runs reads this section before anything else, for the files it was given.

Read each file as it stands on `origin/main`, where your worktree was cut. Then read its earlier
reviews, which are the descriptions of the pull requests that changed it:
`git log --format=%h origin/main -- <file>` lists the commits, and
`gh api repos/{owner}/{repo}/commits/<commit>/pulls` names the pull request each one landed from. A
point an earlier review set aside under *Deliberately not changed* is not raised again unless these
runs show something that review did not have. Reviews written before `docs/decisions.md` § D-05
were files, and that entry says how to recover them.

A run often worked on a branch of its own, such as a change's, whose files are not on `origin/main`.
Read them where they are, with `git show origin/<branch>:<path>`. Never stage or copy them into your
own tree, not even so that a gate reads them: the pull request would then carry another branch's
files, which someone has to take out before it merges.

Look for what made a run slower or wrong: long-running steps, repeated cycles, incorrect statements
or assumptions, and contradictions, within a prompt or between it and `CLAUDE.md`. Every finding a
file's agent is given met the threshold of § 3: enough runs showed it, or it is severe. That makes it
worth reading, not worth an edit, and a count alone is never the reason to change a prompt. Each
change states how often the situation arises, what it costs when it does, and the net words the edit
adds, each figure citing a run, a label count or a pull request, because every later run of the
prompt reads those words. If nothing should change, change nothing: a review that proposes nothing
leaves nothing but its read and held lines.

Every edit cites only files your own base holds. A file that only a reviewed branch holds, such as a
change's design, is named in prose by its branch and its path, never as a pointer: in the
description it sends a reader to a file the trunk lacks, and in a tracked file the citations gate
refuses it. An edit that adds or changes a rule states the failure it prevents in one clause, and
the runs that showed the failure go in the description, with the finding, never in the prompt
(`CLAUDE.md` § Standing rules for prompts and gates).

## How a prompt is consolidated

An edit that would take a prompt past its word budget, a key in `tools/policy.json` that
`node scripts/check-prompts.mjs --counts` prints beside the prompt's words, consolidates the prompt
first. A raise, which a person merges, covers only what the consolidation did not free. A file's
agent may not edit `tools/policy.json`, so it leaves out an edit that still does not fit, and sets
its finding aside with the words the edit needs; its held line brings the raise to a person.

What loads the prompt decides what can go: `CLAUDE.md`, in every session, and each file the prompt
sends the session to at a step. Whether a workflow's agents load `CLAUDE.md` is not established, so
in a workflow's literals only the second counts. Remove only:

- a restatement of a rule `CLAUDE.md` states, keeping a `CLAUDE.md` § pointer where the step needs one;
- a step one of those files states where the prompt sends the session to it;
- incident prose, or an example drawn from one, which the pull request that added it keeps:
  `git log -S "<text>" -- <file>` finds the commit;
- explanation past the one clause that states a kept rule's failure.

Keep every heading another file cites: `git grep` the prompt's path and its name.

Commit the consolidation alone, before the edit. The pull request's description gives one row for
each sentence or clause removed: kept, naming the file and section that state it and what loads that
file wherever this prompt is loaded; moved, naming the pull request that tells it; or deleted, saying
why. A sentence whose row cannot name what loads its new home stays: a rule kept where the session
never reads it is lost. Once the edit lands, the prompt's budget is its new count, and its `Means`
names the consolidation.

A file's agent reports its consolidation under `consolidations`, skeptics judge the rows against its
commit's diff, as `.claude/workflows/review-prompts.js`'s header says, and the reviewer's session
sets the budget (§ 5).
