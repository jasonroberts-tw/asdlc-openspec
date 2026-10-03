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
   the prompt's text and `CLAUDE.md`, and nothing else. The reviewer chooses one candidate or
   combines several. A session that writes cases from a prompt's own rules writes the candidate
   itself.
2. **Validated.** The same workflow answers the chosen case `promptReviewCaseRepetitions` times with
   the trunk's text. It is stored only if every answer chose its expected option: a case the text
   already fails could never flip, and one it passes only sometimes would flip by noise.
3. **Stored.** One file here, named `<id>.json`, and one row below, in the pull request that adds
   it. A person or the reviewer merges it, as any pull request.
4. **Judged.** `.claude/workflows/review-prompts.js` answers every case of each file an upheld
   branch changes with the old text and the new, as many times each. It keeps the branch out when a
   case flips or goes unanswered.

Only a person changes a stored case's expected answer, by hand (`asdlc-openspec-a484` asks whether
an edit's finding may). A case's expected answer is an option, never prose the prompt writes
(`asdlc-openspec-1kie` asks whether that changes).

## The format

One JSON object per file. `npm run workflows:selftest` holds every file here to it, through both
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
