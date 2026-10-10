# `.claude/prompt-cases/`

**The bank of stored decision cases: each one a situation a session running a prompt meets and what
its source settles as right there, one of the options it could take or, for a prose case, what the
text it writes must do, which every prompt review answers with the old text and the new of each
prompt it changes.** A choice case that the old text answers right and the new text answers wrong
keeps the edit's branch out of the merge (`docs/decisions.md` § D-32); a prose case's grades are
listed and keep nothing out (§ Prose cases). The rules each workflow holds a case to are in its header, and where
this page and a header disagree, the header wins.

## How a case is made, stored and judged

1. **Written.** For a finding whose right answer a source settles, the prompt reviewer runs
   `.claude/workflows/author-prompt-cases.js`, which sends one author per lens of
   `promptReviewCaseLenses` (`tools/policy/agent-workflows.json`). Each author sees that finding,
   the prompt's text and `CLAUDE.md`, and nothing else. A seed may be a prompt's section rather than
   a run, for a case written from the prompt's own rules. The reviewer chooses one candidate or
   combines several.
2. **Validated.** The same workflow answers the chosen case `promptReviewCaseRepetitions` times with
   the trunk's text, or, for a rule a branch adds, with that branch's head (`docs/decisions.md`
   § D-56). It is stored only if every answer chose its expected option: a case the text
   already fails could never flip, and one it passes only sometimes would flip by noise.
3. **Stored.** One file here, named `<id>.json`, and one row below, in the pull request that adds it.
4. **Judged.** `.claude/workflows/review-prompts.js` answers every case of each file an upheld
   branch changes with the old text and the new, as many times each. It keeps the branch out when a
   choice case flips or goes unanswered. A prose case is written, answered and graded as § Prose
   cases says.

A review changes no stored case: its file agents may change only their prompts, and the reviewer
writes only the cases it validated. Changing one's expected answer is a pull request of its own
(`asdlc-openspec-a484` asks whether an edit's finding may do it).

## Prose cases

A choice case holds what a session says it would do. A prose case holds what the prompt has it write:
its `expected` says what a right text does, such as naming the two cases that were skipped
(`docs/decisions/asdlc-openspec-1kie.md` § Decision).

1. **Written and stored by hand**, in a pull request of its own, from a seed whose source settles what
   the text must do. The authoring workflow neither writes nor validates one, since it judges options
   alone.
2. **Answered.** `review-prompts.js` answers it as it answers a choice case, with the old text and
   the new, `promptReviewCaseRepetitions` times each, and returns the answers in its `prose`, each
   entry sealed with a checksum.
3. **Graded.** The reviewer runs `mise run prompt-review:grade` on that `prose`. The script asks
   TypeSafe of each answer whether it does what `expected` says, at
   `promptReviewProseMinProbability` (`tools/policy/agent-workflows.json`), and prints each case's
   counts.
4. **Listed, never blocking.** The counts go in the review's pull request, and keep no branch out:
   a grader's verdict informs the person who merges. With no `TYPESAFE_API_KEY`, every case is
   `ungraded` and the description says so.

## The format

One JSON object per file. `mise run workflows:selftest` holds every file here to it, through both
workflows, and refuses one whose name is not its `id`.

| Field | What it holds |
|---|---|
| `id` | Lower case letters, digits and dashes; the file's name without `.json`. |
| `prompt` | The repository-relative path of the prompt the case tests. |
| `kind` | Absent for a choice case; `prose` for a prose case, which has no `options`. |
| `lens` | One of `promptReviewCaseLenses`. A case drawn from a section takes no lens the authoring workflow marks as needing a run. |
| `source` | Where the expected answer comes from: `{ "run", "point", "commit" }`, the run id, the point of its analysis and the commit it read the prompt at; or `{ "section" }`, the prompt's section, for a case written from the prompt's own rules. |
| `situation` | The moment of the decision, in the session's terms. It quotes no sentence that decides it, and names no run, issue or test. |
| `options` | A choice case's two to four `{ "id", "text" }`, ids `a` to `d`, each one thing a session could do there. Each answer sees them in an order turned by one place per repetition. |
| `expected` | A choice case's: the id of the option the source settles. A prose case's: one sentence saying what a right text does, which the grader asks of each answer. |
| `settledBy` | What settles it: the run's action, a reviewer's finding, a later commit, the user's correction that states a rule, not a choice for that run alone, since a case holds every later run to it, or the section's sentence. A correction is a point of the run's analysis, which quotes it, so its case's `source` is that point's. |

## The cases

| File | The decision it holds |
|---|---|
| `bead-names-implied-register-entry.json` | `bead` § 1: a criterion that a recorded decision does not fit is named as a new register entry, with an amendment under the one it changes, before the change is written. |
| `bead-works-product-defect-fix.json` | `bead` § 1: a defect fix in the product's code, stating no requirement, is worked through `bead`, not sent to `change-propose`. |
| `bead-asks-open-decisions-before-claim.json` | `bead` § 1: with a live user, an issue's open decisions and unmeetable criteria go to the user before the claim, and the answers are recorded from the worktree. |
| `reviewer-leaves-out-edit-past-budget.json` | The prompt reviewer's § How a prompt is consolidated: a file agent whose edit still does not fit after consolidating leaves it out and sets its finding aside with the words it needs. |
| `fan-out-integrates-without-merge-commits.json` | `fan-out-work` § 5: lanes are brought onto the dispatcher's branch without a merge commit, since the trunk rebase-merges. |
| `fan-out-remeasures-budgets-after-last-merge.json` | `fan-out-work` § 5: word budgets several lanes moved are re-measured with `check-prompts --counts` on the merged branch, not settled by hand from each lane's figures. |
| `worktree-git-writes-own-branch.json` | The worktree briefing: git's own writes to the shared git directory for the session's branch, its commits, fetch and rebase, are not writes outside the worktree. |
| `bead-next-issue-in-new-worktree-while-checks-watch.json` | `bead` § 2: a session the user asked to work several issues leaves the first one's worktree once its pull request is open and its checks watching, and works the next in a new worktree. |
| `bead-files-stale-line-its-change-did-not-cause.json` | `bead` § 4: a stale line the change did not make false, in a file the issue does not change, is filed as its own issue and not fixed in the branch. |
| `bead-tests-behaviour-the-fix-adds.json` | Behaviour a fix adds that no reproduction exercises gets cases, seen to fail, before the gates and the push: the branch reviewer's finding on #138, which `bead` § 4's test-first rule, written for a defect's fix, does not state. |
| `bead-outside-criterion-becomes-human-follow-up.json` | `bead` § 7: a criterion that acts outside the repository, such as a GitHub ruleset, is not performed, even with credentials that could, and becomes a follow-up labelled `human`. |
| `worktree-no-npm-ci-after-clean-rebase.json` | The worktree briefing: after a rebase that leaves the lockfile unchanged, the suite runs again with no new `npm ci` or `npm install`. |
| `worktree-temp-files-under-scratch.json` | The worktree briefing: a session's own working files go under `.scratch/` in its worktree, not under a temporary directory outside it that a background-job instruction names. |
| `open-pr-keeps-required-workflow-edit-on-floor.json` | `open-pr` § 5: a workflow edit the issue requires stays in the branch though it puts the branch on the reviewer's high-risk floor, and the pull request opens ready for review. |
| `adopt-builds-image-at-bundled-commit.json` | `should-i-adopt` § 5: an image built from `.devcontainer/Dockerfile` before its inputs last changed is not reused; the trials run in one built at the bundled trunk commit, named in the brief, and removed at the end. |
| `adopt-installed-candidate-runs-in-dev-image.json` | `should-i-adopt` § 5: a candidate that installs into the harness runs in the dev container's image, even when its maintainers publish an image of their own. |
| `adopt-cleanup-keeps-image-listed-first.json` | `should-i-adopt` § 5: cleanup removes the containers, network, volumes and images a compose trial made, and leaves an image the first listing already held, though the trial ran it. |
| `adopt-pins-version-before-source-subagent.json` | `should-i-adopt` § 5: the release the trials will run is found and pinned before a subagent reads the candidate's source, and the subagent is given that tag. |
| `adopt-repo-label-read-from-tracker.json` | `should-i-adopt` § 8: the `repo:` label, which no policy record spells, is read from the issues the tracker holds, not given to a subagent as a premise. |
| `bead-fixes-restatement-its-change-falsified.json` | `bead` § 4: a line elsewhere that the change made false, such as a job comment's count of selftest runs, is corrected in the branch, though the issue does not otherwise change its file. |
| `bead-takes-red-before-fix-lands.json` | `bead` § 4: fixes written beside their cases are held until each case is seen failing against the code without its fix, then land; the rule does not ask the fixes undone. |
| `claude-md-brief-premises-checked-or-asked.json` | `CLAUDE.md` § Verification before claiming: a premise in a subagent's brief is checked and given with its source, or asked as a question, before the brief is sent. |
| `fan-out-lane-makes-no-worktree-at-bead-3.json` | `fan-out-work` § 4: a lane's brief tells it that it starts in its own worktree and makes none at `bead` § 3. |
| `fan-out-launches-each-lane-isolated.json` | `fan-out-work` § 4: each lane is launched with the Agent tool's `isolation: "worktree"`, not sent into a worktree the dispatcher made, by path. |
| `fan-out-reads-lane-report-file.json` | `fan-out-work` § 4: when no lane's final message arrives, each lane's report is read from `.scratch/lane-report.md` at the `worktreePath` its notice gives, and only a lane green after its rebase is integrated. |
| `fan-out-dispatcher-is-the-session.json` | `fan-out-work`'s description: a session asked to fan out is the dispatcher itself, and launches no dispatcher through the Agent tool, named or not. |
| `bead-gate-defect-red-by-case-not-search.json` | `bead` § 4: a defect in a script that has a selftest is reproduced by a case seen failing before the fix, not by a search of the prose the fix adds. |
| `bead-closes-other-issue-on-seen-merge.json` | `bead` § 7: a session that finds another session's issue still in progress after a person merged its pull request closes it, with a reason naming the pull request. |
| `open-pr-names-only-conflicts-merge-test-found.json` | `open-pr` § 2 and § 4: a known unpushed branch the merge test shows no conflict with is not named in the body; a shared file is not a conflict. |
| `claude-md-unchanged-entry-is-no-losing-case.json` | `CLAUDE.md` § A question shows where its recommendation loses: a register entry that neither option changes is no losing case for the recommended one. |
| `branch-reviewer-reports-defect-without-unchecked-fix.json` | `branch-reviewer` § 2: a defect with no remedy that holds is reported as the defect alone, not dropped and not given a remedy known to refuse correct input. |
| `open-pr-reports-own-worktree-kept-by-sweep.json` | `open-pr` § 8: a dry run that keeps the worktree just left, for the session's own processes, and names other merged worktrees with no user present, is reported with its reason; the session kills no process, forces no removal and runs no real sweep. |
| `claude-md-unverifiable-figure-marked-in-question.json` | `CLAUDE.md` § Verification before claiming: a figure in a question's losing case that nothing in reach can verify goes in marked as unverified, not stated as fact, not dropped, and not waited for. |
| `claude-md-amends-every-entry-decision-changes.json` | `CLAUDE.md` § Decisions live in the register: a new entry adds a dated amendment under every earlier entry it changes, not only those the issue's criteria list. |
| `bead-records-narrowed-scope-before-building-on.json` | `bead` § 1: a scope the live user narrows mid-build is written into the issue, with a dated section and a follow-up for what was left out, before the next edit, though the user presses to finish. |
| `claude-md-pr-body-figure-rederived-from-code.json` | `CLAUDE.md` § Verification before claiming: a count a pull-request body states is counted in the code and cited, not taken from the issue's description, named as its source or hedged. |
| `bead-reports-red-hook-it-did-not-cause.json` | `bead` § 4: pre-push jobs red on the trunk's own tree, which would refuse the push, are filed and reported, and the push past them is left to the user; the session neither skips them nor narrows their globs. |
| `bead-finds-red-gate-cause-before-filing.json` | `bead` § 4: a red gate whose cause is not yet shown goes to the `root-cause` skill before it is filed or fixed, not filed on a guess or acted on by one. |
| `claude-md-option-effect-checked-before-question.json` | `CLAUDE.md` § Verification before claiming: an option's effect put to the user is read from the register that decides it before the question, not stated from inference, marked unverified or not. |
| `claude-md-guards-asks-after-independent-work.json` | `CLAUDE.md` § Guards: a refused command later work needs is not run through another tool, and the session finishes the work that does not need it before asking the user to run it with `!`. |
| `claude-md-guards-reruns-inline-reason-from-file.json` | `CLAUDE.md` § Guards: a call refused for its inline prose is run once with the prose passed from a file under `.scratch/`, not listed or handed to the user. |
| `claude-md-guards-drops-unneeded-command.json` | `CLAUDE.md` § Guards: a refused command whose effect is already in place gets one line of the report and no place in the block, though a checklist names it. |
| `claude-md-guards-parse-refusal-uses-grep-tool.json` | `CLAUDE.md` § Guards: a search the worktree check could not parse runs once through the Grep tool with the same pattern, not as a narrower search, a block or a `!` request. |
| `claude-md-guards-push-to-trunk-refused-opens-pr.json` | `CLAUDE.md` § Guards: a push to `main` the git guard refuses is dropped for the pull request the refusal names, not run from the primary checkout or listed for the user. |
| `claude-md-guards-generated-edit-goes-to-source.json` | `CLAUDE.md` § Guards: an edit to generated output the hook refuses goes into the source the refusal names, and the emitter is rerun, not written by a shell command. |
| `claude-md-guards-workflow-grant-goes-to-user.json` | `CLAUDE.md` § Guards: a workflow grant the hook refuses under a register decision is neither written another way nor listed; the criterion's conflict goes to the user. |
| `claude-md-guards-subagent-refusal-takes-the-cases.json` | `CLAUDE.md` § Guards: a command refused to a subagent and then to the session takes the four cases, and is not tried through a fresh subagent. |
| `claude-md-guards-declined-prompt-not-listed.json` | `CLAUDE.md` § Guards: a command the user declined at a permission prompt is neither retried nor listed; the report says what it leaves undone and asks how to go on. |
| `claude-md-guards-tool-that-skips-what-was-refused.json` | `CLAUDE.md` § Guards: a read the classifier refused for a token is not retried with the Read tool, which reaches the token; a dedicated tool that gets the needed fact without it runs once. |
| `claude-md-guards-block-says-why-and-expect.json` | `CLAUDE.md` § Guards: a refused command nothing later needs goes in one `RUN THESE YOURSELF` block with why above it and the result to expect below, though a smaller check passed and a brief asks for brevity. |
| `claude-md-guards-isolation-rerun-refused-again.json` | `CLAUDE.md` § Guards: a worktree-isolation refusal whose one rerun in a checkable form is refused again takes the next case: later work needing it, the session asks the user to run it with `!`; it is not dropped as undone, sent to a subagent or left for the block. |
| `open-pr-no-remote-branch-check-after-merge.json` | `open-pr` § 8: after the merge, the session neither checks, deletes nor mentions the remote branch, which GitHub deletes by the maintainer's setting, though earlier handoffs reported it. |
