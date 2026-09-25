---
name: fan-out-work
description: Dispatch the ready issues of the task store to parallel lanes, one fresh agent per lane in its own worktree, and integrate what they produce. Use when asked to sweep, fan out or parallelise ready work.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

<!-- kit 1.10-5 · ADAPT: the partition examples below name no file, because the files are yours.
     Replace each example with two real issues of your own the first time a sweep meets that overlap
     kind, and keep the four kinds. Delete this comment when done. -->

# Fan out ready work

You are the dispatcher. You do not implement; you partition, brief, integrate and report.

## 1. Pre-flight the trunk

On a fresh branch cut from `origin/main`, run `npm run gates`: the forced full suite. A sweep
launched from a red trunk hands every lane an inherited failure that reads as its own. If the trunk
is red, stop and report the failing gate; do not dispatch.

## 2. Partition the ready work into lanes

Read the queue (`bd ready --exclude-label spec-change`: a product change's tasks are worked in its
own worktree by `change-build`, `docs/decisions.md` § D-02, and the label is `specChangeLabel` in
`tools/policy.json`) and, for every pair of issues, decide
the overlap by reading the files each will touch, not the titles:

| Overlap kind | What it looks like | What to do |
|---|---|---|
| Same lines | two issues rewrite the same function, table or paragraph | one lane takes both, in order |
| Same file, separate blocks | two issues each add a block to one file | sibling lanes; give each a named anchor (the heading or the entry it adds after) so the merges do not collide |
| Same generated file | two issues each change an input of one emitter | accept it: separate lanes, and regenerate that file after each merge rather than merging its bytes |
| Same numbered sequence | two issues each append a numbered entry to `docs/decisions.md` (a decision, a risk) | separate lanes; each takes the next number as it sees it, and the second to merge renumbers its entry, its table row and the range bound, because a named anchor cannot keep two lanes from taking the same number |

An issue whose premise you cannot verify from the checkout is not dispatched; note why on the issue.

Write the partition down before you claim anything: one row per lane, with its issues, the files
each touches, the overlap kind and the anchor. Claiming is the first step another session or a
watching user would want to catch, and the record is the brief of step 4 and the first columns of
the report in step 7.

## 3. Pre-claim every issue in one tracker bracket

Pull, claim every issue of every lane, push. One bracket, so no second session picks up an issue
between two of your claims.

## 4. One fresh agent per lane, each in its own worktree

Make each worktree with the one worktree script. Brief each lane with: its issues, its anchors, the
base, the skill it follows (`.claude/skills/bead/SKILL.md`) and where it stops in it, and these
three rules, stated in every brief word for word:

1. **Never end a turn while a command runs.** A turn end kills the lane's background run or leaves
   it running unwatched.
2. **Label every issue the lane creates at creation**, with the label naming where its work lands.
3. **An acceptance criterion that acts outside the repository becomes a follow-up issue labelled
   `human` and is never performed by the lane.**

A lane stops at the end of `.claude/skills/bead/SKILL.md` § 5, once its rebased branch passes
`npm run gates`, and reports its branch and both gate runs as measured. It opens no pull request
and closes no issue: step 5 merges its branch, and step 6 opens the one pull request and closes its
issues.

## 5. Integrate on your own branch, merging forward

As each lane reports green, merge its branch into the dispatcher's branch. Never rebase a branch
that has been pushed. After each merge, regenerate every generated file more than one lane touched,
renumber any register entry that collided, then run `npm run gates`.

## 6. Open the pull request and watch its checks

Open it with the `open-pr` skill. Its title ends with the id of every issue the lanes carried. When
every check is green, close each of those issues as `.claude/skills/bead/SKILL.md` § 7 says, with a
reason naming the pull request.

## 7. Report one table

| Lane | Issues | Branch | Gates (as measured) | Merged | Follow-ups filed |
|---|---|---|---|---|---|

Then: issues not dispatched and why, and a `RUN THESE YOURSELF` block for any command that was
refused (`CLAUDE.md` § Guards).
