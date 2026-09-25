---
name: bead
description: Work one or more issues from the task store end to end - verify the premise, claim, implement, gate, open the pull request, close on green. Use when asked to work, pick up or finish an issue.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Work an issue

The argument is one issue id, several, or nothing (then take the top of
`bd ready --exclude-label spec-change`: a product change's tasks are worked in its own worktree by
`change-build`, `docs/decisions.md` § D-02, and the label is `specChangeLabel` in
`tools/policy.json`). Work agreed in conversation that no issue carries yet is filed before it is
worked, in step 3. Every tracker
write below sits inside the bracket `CLAUDE.md` § The task store describes: pull before the first
write (`bd dolt pull`), push after the last (`bd dolt push`), and report a rejected push rather
than forcing it.

## 1. Verify the premise before any work

An issue's title is not evidence, and nor is a "blocked on" line in its prose: `bd show` lists the
dependencies the tracker records. Read the issue, then read the code it talks about, and decide
which of four things is true, citing file and line for each claim:

- **still valid**: the defect or the gap is there, as described;
- **already fixed**: name the commit or the pull request that fixed it;
- **obsolete**: what it asks for no longer applies, and why;
- **blocked**: the work needs something that is in neither the repository nor the issue's own
  scope; name it, and the open issue that carries it, if one does.

Read that code as the trunk has it. This step runs in the primary checkout, whose `main` trails
`origin/main` until someone pulls it, and step 3's worktree is cut from `origin/main`. Run
`git fetch origin main`, then read with `git show origin/main:<path>`. Where a fetch is not wanted
yet, as in plan mode, `gh api "repos/{owner}/{repo}/contents/<path>?ref=main" -H "Accept: application/vnd.github.raw"`
reads the same file without one. An agent sent to read the code reads the checkout's copy unless its
brief says otherwise, so say so.

This skill and `CLAUDE.md` came from that checkout too: the harness read both from it, so they can
trail the trunk in the same way. After the fetch,
`git diff --stat HEAD...origin/main -- .claude/skills/bead/SKILL.md CLAUDE.md` names each of the two
that the trunk has changed and the checkout lacks. Read the trunk's copy of each one it names, as
above, and follow that copy from here on.

Name, too, any entry in the decision register an acceptance criterion implies. An amendment is made
by a new decision (`docs/decisions.md` § How an entry changes), and no agent re-litigates a
recorded one, so the person reviewing the pull request reads it first (step 6).

An issue that asks for a change to what the product does, stated as requirements, is not worked
here: it seeds a change, and `change-propose` takes it.

What happens next depends on who is listening:

- **With a live user:** when the premise does not hold, show the evidence and stop. The user decides
  whether the issue closes, changes or stands. When it changes, record that in the issue before any
  work: rewrite its title and description, with a dated section naming what was dropped and why so
  it is never re-filed, and file any part split out as its own issue. The same holds when the user
  changes the scope once work has begun: record it before the work it adds, and rewrite any
  follow-up already filed from the issue to match, so neither still describes the old scope.
- **In an autonomous session:** write the evidence into the issue as a note, leave the issue open,
  and move to the next one. Never close an issue on your own reading of its premise.
- **Blocked:** with a live user, taking on the prerequisite is the user's call on scope. In an
  autonomous session, take it on only when no open issue carries it and the acceptance criteria
  cannot be met without it: write its smallest form, and open the pull request's body with it
  (step 6). Otherwise it is a premise that does not hold, handled as above.

## 2. Partition before claiming

With several issues, decide before claiming any of them which can share a branch and which cannot,
by the overlap kinds in `.claude/agents/fan-out-work.md` § 2. Partition the ready work into lanes,
read from the files each issue will touch, not from its title. Two issues that rewrite the same
lines share a branch. Two branches that each add a row beside the same anchor, such as neighbouring
rows of a README table or jobs in `lefthook.yml`, stay separate and conflict when the second merges;
step 6 finds that. Two issues that describe one defect are one lane; where their acceptance criteria
conflict, the choice and its reason go in the pull-request body and in both close reasons. Claim
only what this session will finish.

Separate branches are worked one after another, never interleaved. Take one through step 6, its
watcher running in the background, then leave its worktree with `ExitWorktree` (action `keep`) and
make the next with `EnterWorktree`, which creates no worktree from inside another. Step 7 closes
each issue as its own checks go green. A request to sweep or parallelise ready work goes to the
`fan-out-work` agent instead.

## 3. Claim, then work in a worktree

Claim the issue in the tracker (`bd update <id> --claim`); with several, claim every one step 2
kept, in one bracket, before the first worktree. Make the worktree with the one worktree script,
never natively: `EnterWorktree`, whose hook runs `scripts/new-worktree.sh`. Run `npm ci`
first inside it. Read `.worktree/CONTEXT.md` there: it names the branch, the base and the rules of a
shared repository. Tracker writes that carry a body, such as step 1's re-scoping, are made from
here, with the body file under this worktree's `.scratch/`. Work agreed in conversation has no issue
to claim yet, so the order turns round: make the worktree, search for an issue that already carries
the work as step 4 says, then file it from here and claim it.

## 4. Implement, regenerate, gate

Make the change. Regenerate every derived artifact the change touches, with its emitter, never by
hand, and only after the last edit to the emitter or its inputs: an emitter's own source is one of
its inputs, so even a comment edit stales its output. `npm run pipeline:stale` names each stale
node and the command that rebuilds it. A
first run that stamps an output which had none makes `pipeline:stale:check` bind it from then on
(`docs/pipeline.md` § The two gates): say so in the pull request.

Stage every file the change adds (`git add`) before the gates run: the citations and count-index
gates read the files `git ls-files` lists, so a new file not yet added passes them unread.
Run `npm run gates`: the forced full suite, never the bare hook runner, and the build check here.
There is no `tsc` to run: the repository has no `tsconfig.json` and no TypeScript package, and
`package.json` runs its `.ts` files with `node` directly. Run no script name `package.json` does not
list. A red gate is fixed or reported, never bypassed.

A defect found on the way is fixed in this branch only when it sits in a file the issue already
changes. Anything else is filed as its own issue, never folded in, and before the pull request
opens, so the pull request's body names the new id. File it from a body file under `.scratch/`,
with the command `.claude/skills/change-build/SKILL.md` § 5. What the build turns up gives:
`bd create "<title>" -l <the repo: label>,<its found-at label>,<its asset: labels> --deps discovered-from:<id> --body-file <file> --silent`,
with the labels `CLAUDE.md` § The task store names; here the found-at label is bead's.

Before filing this or any follow-up, search for it. `bd search "<words>"` matches titles only and
`bd list --all --desc-contains "<words>"` matches descriptions; both include closed issues. Run
both, then again with a second phrasing, because a string can miss: `Stop hook` does not match
`` `Stop` hook ``. A match gets a note (`bd note`), not a second issue. A follow-up's body carries
the sections `bd lint --help` lists for its type.

## 5. Rebase and gate again

Fetch, rebase onto `origin/main`, and run `npm run gates` again: the first run proved the change,
the second proves it against what landed meanwhile.

## 6. Open the pull request and watch its checks

Before opening, list the open pull requests:

    gh pr list --state open --json number,headRefName,files

For each one that touches a file this branch touches, test the merge:

    git merge-tree --write-tree --name-only origin/<its branch> HEAD

A shared file is not a conflict; a conflict this reports is.

Push the branch and open the pull request with its base named explicitly (`main`), its body passed
from a file under `.scratch/`. Its title ends with the id of each issue it carries, in parentheses:
the reviewer holds the pull request to their acceptance criteria (`CLAUDE.md` § Git workflow). The body opens with any register entry or prerequisite step 1 named,
then any conflict found above, with the pull request it is against. If `gh pr create` fails, run
`gh pr list --head <branch>` before retrying: a create can land after its client gives up. Watch the
checks with one `gh pr checks <number> --watch` in the background, and no second watcher; never end
the turn while it runs. Started just after the create, it can exit 1 at once with "no checks
reported", because CI has not registered its run yet: that is not a failing check, and starting the
watcher again is not a second one. A failing check is read, fixed on the same branch and pushed
again. The reviewer's `pr-review` check is one of them. It stays pending until the reviewer has
judged the head, and fails when the review requests changes, with the reasons in its comment on the
pull request (`gh pr view <number> --comments`). A review that asks for a person passes it, so the
watcher ends. The report then says the pull request waits for a person, and why.

## 7. Close on green, with a reason

When every check is green, close the issue with a reason that names the pull request. Write the
reason to a file under `.scratch/` and close with `bd close <id> --reason-file <file>`, as
`CLAUDE.md` § Bash command style asks of any prose: from a worktree, the harness can refuse an
inline `--reason` whose text it cannot tell from a git command. An acceptance criterion that acts
outside the repository is not performed: it becomes a follow-up issue labelled `human`, created
with its label at creation; step 4 says how to search for it and what its body carries.

## 8. Report

First launch the review of this run as `CLAUDE.md` § Prompt reviews says, and do not wait for it.

Then one short report: what was verified in step 1 and where, what changed, what was regenerated,
both gate runs as measured, the pull request, the issue's final state, every follow-up filed, the
reviewer's session, and a `RUN THESE YOURSELF` block for any command that was refused
(`CLAUDE.md` § Guards).
