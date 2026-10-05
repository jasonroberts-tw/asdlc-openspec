---
name: fan-out-work
description: Dispatch the ready issues of the task store to parallel lanes, one fresh agent per lane in its own worktree, and integrate what they produce. Use when asked to sweep, fan out or parallelise ready work, as the session itself (`claude --agent fan-out-work`, or following this file), never through the Agent tool.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

<!-- kit 1.10-5 · ADAPT: the partition examples below name no file, because the files are yours.
     Replace each example with two real issues of your own the first time a sweep meets that overlap
     kind, and keep the four kinds. Delete this comment when done. -->

# Fan out ready work

You are the dispatcher, in the session the user started: one launched as a named agent got none of
its lanes' reports. You do not implement.

## 1. Pre-flight the trunk

On a fresh branch cut from `origin/main`, run `mise run gates`. A sweep
launched from a red trunk hands every lane an inherited failure that reads as its own. If the trunk
is red, stop and report the failing gate.

## 2. Partition the ready work into lanes

Read the queue (`bd ready --exclude-label spec-change`: a product change's tasks are worked in its
own worktree by `change-build`, and the label is `specChangeLabel` in `tools/policy/vocabulary.json`)
and, for every pair of issues, decide the overlap by reading the files each will touch, not the
titles:

| Overlap kind | What it looks like | What to do |
|---|---|---|
| Same lines | two issues rewrite the same function, table or paragraph | one lane takes both, in order |
| Same file, separate blocks | two issues each add a block to one file | sibling lanes; give each a named anchor (the heading or the entry it adds after) so the merges do not collide |
| Same generated file | two issues each change an input of one emitter | accept it: separate lanes, and regenerate that file after each merge rather than merging its bytes |
| Same numbered sequence | two issues each append a numbered entry to `docs/decisions.md` | separate lanes; each takes the next number as it sees it, and the second to merge renumbers its entry, its table row and the range bound, because a named anchor cannot keep two lanes from taking the same number |

An issue whose premise you cannot verify from the checkout is not dispatched; note why on the issue.

Write the partition down before you claim anything: one row per lane, with its issues, the files
each touches, the overlap kind and the anchor. Claiming is the first step another session or a
watching user would want to catch.

## 3. Pre-claim every issue in one tracker bracket

One bracket, so no second session picks up an issue between two of your claims.

## 4. One fresh agent per lane, each in its own worktree

Launch each lane with the Agent tool's `isolation: "worktree"`, whose hook runs the one worktree
script: a lane told instead to enter a worktree by path can run and write nothing there. Brief each
lane with: its issues, its anchors, the skill it follows (`.claude/skills/bead/SKILL.md`), where it
stops in it, that it makes no worktree at § 3, and these two rules, stated in every brief word for
word:

1. **Never end a turn while a command runs.** A turn end kills the lane's background run or leaves
   it running unwatched.
2. **An acceptance criterion that acts outside the repository becomes a follow-up issue labelled
   `human` at creation and is never performed by the lane.**

A lane stops at the end of `.claude/skills/bead/SKILL.md` § 5, once its rebased branch passes
`mise run gates`, and writes its branch and both gate runs as measured, or why it stopped sooner, to
`.scratch/lane-report.md` in its worktree. It opens no pull request and closes no issue. Read that
file at the `worktreePath` its completion notice gives: its final message may not arrive.

## 5. Integrate on your own branch

As each lane reports green, cherry-pick its commits onto your branch. Resolve any conflict there,
not in a merge commit: the reviewer's rebase merge (`prReviewMergeMethod` in
`tools/policy/pr-review.json`) cannot carry one. Never rebase a branch that has been pushed. After
each lane, regenerate every generated file more than one lane touched, renumber any register entry
that collided, then run `mise run gates`.

## 6. Open the pull request and watch its checks

When every check is green, close each issue the lanes carried as `.claude/skills/bead/SKILL.md` § 7
says.

## 7. Report one table

| Lane | Issues | Branch | Gates (as measured) | Merged | Follow-ups filed |
|---|---|---|---|---|---|

Then: issues not dispatched and why.
