# `.claude/prompt-cases/`

**The bank of stored decision cases: each one a situation a session running a prompt meets, the
options it could take there, and the one its source settles as right, which every prompt review
answers with the old text and the new of each prompt it changes.** A case that the old text answers
right and the new text answers wrong keeps the edit's branch out of the merge
(`docs/decisions.md` § D-32). The rules each workflow holds a case to are in its header, and where
this page and a header disagree, the header wins.

## How a case is made, stored and judged

1. **Written.** For a finding whose right answer a source settles, the prompt reviewer runs
   `.claude/workflows/author-prompt-cases.js`, which sends one author per lens of
   `promptReviewCaseLenses` (`tools/policy/agent-workflows.json`). Each author sees that finding,
   the prompt's text and `CLAUDE.md`, and nothing else. A seed may be a prompt's section rather than
   a run, for a case written from the prompt's own rules. The reviewer chooses one candidate or
   combines several.
2. **Validated.** The same workflow answers the chosen case `promptReviewCaseRepetitions` times with
   the trunk's text. It is stored only if every answer chose its expected option: a case the text
   already fails could never flip, and one it passes only sometimes would flip by noise.
3. **Stored.** One file here, named `<id>.json`, and one row below, in the pull request that adds it.
4. **Judged.** `.claude/workflows/review-prompts.js` answers every case of each file an upheld
   branch changes with the old text and the new, as many times each. It keeps the branch out when a
   case flips or goes unanswered.

A review changes no stored case: its file agents may change only their prompts, and the reviewer
writes only the cases it validated. Changing one's expected answer is a pull request of its own
(`asdlc-openspec-a484` asks whether an edit's finding may do it). A case's expected answer is an
option, never prose the prompt writes (`asdlc-openspec-1kie` asks whether that changes).

## The format

One JSON object per file. `mise run workflows:selftest` holds every file here to it, through both
workflows, and refuses one whose name is not its `id`.

| Field | What it holds |
|---|---|
| `id` | Lower case letters, digits and dashes; the file's name without `.json`. |
| `prompt` | The repository-relative path of the prompt the case tests. |
| `lens` | One of `promptReviewCaseLenses`. A case drawn from a section takes no lens the authoring workflow marks as needing a run. |
| `source` | Where the expected answer comes from: `{ "run", "point", "commit" }`, the run id, the point of its analysis and the commit it read the prompt at; or `{ "section" }`, the prompt's section, for a case written from the prompt's own rules. |
| `situation` | The moment of the decision, in the session's terms. It quotes no sentence that decides it, and names no run, issue or test. |
| `options` | Two to four `{ "id", "text" }`, ids `a` to `d`, each one thing a session could do there. Each answer sees them in an order turned by one place per repetition. |
| `expected` | The id of the option the source settles. |
| `settledBy` | What settles it: the run's action, the pull-request reviewer's finding, a later commit, or the section's sentence. |

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
| `bead-tests-behaviour-the-fix-adds.json` | `bead` § 4: behaviour a fix adds that no reproduction exercises gets cases, seen to fail, before the gates and the push. |
| `bead-outside-criterion-becomes-human-follow-up.json` | `bead` § 7: a criterion that acts outside the repository, such as a GitHub ruleset, is not performed, even with credentials that could, and becomes a follow-up labelled `human`. |
| `worktree-no-npm-ci-after-clean-rebase.json` | The worktree briefing: after a rebase that leaves the lockfile unchanged, the suite runs again with no new `npm ci` or `npm install`. |
| `worktree-temp-files-under-scratch.json` | The worktree briefing: a session's own working files go under `.scratch/` in its worktree, not under a temporary directory outside it that a background-job instruction names. |
| `open-pr-keeps-required-workflow-edit-on-floor.json` | `open-pr` § 5: a workflow edit the issue requires stays in the branch though it puts the branch on the reviewer's high-risk floor, and the pull request opens ready for review. |
