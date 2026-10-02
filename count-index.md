# Count index

**The one place a count describing the current measured state of this repository is written.**
Every other hand-maintained file cites the key, so a figure has one home and cannot drift between
two. This table is a cache of its sources: where the table and a source disagree, the source wins,
`npm run counts:check` says so, and the table is updated from what the check reports.

<!-- kit 3.3-1 · WRITE: one row per figure that describes the current measured state of the thing
     you measure, added in the same change as its row in the second table. The kit seeds the
     tables with what it laid down and can re-derive on the first day; replace or extend it with
     the counts your own documents restate. Delete this comment when your first key has landed. -->

## The counts

| Key | Value | What it counts |
|---|---|---|
| `CNT-HOOKS` | 6 | Hook registrations in `.claude/settings.json`: every entry of every `hooks` array, across every event and matcher group. |

## Where each value comes from

One row per key, in one of four spellings that `scripts/check-count-index.mjs` reads and
re-derives from: `files: <glob>` (how many tracked files match), `json: <file> <pointer>` (what a
pointer reaches in a committed JSON file, `*` standing for every key or index), `deriver` (a
function in the check, one per key), or `by-hand: <command>` (measured over something outside this
repository, so not checked there; the command is how a person re-derives it). The check's header
defines each spelling exactly.

| Key | Re-derives from |
|---|---|
| `CNT-HOOKS` | `json: .claude/settings.json /hooks/*/*/hooks` |

## How to use it

- **Prose writes the backticked key where the numeral would go, never both.** A sentence reads
  "the settings file registers `CNT-HOOKS` hooks", and the reader who wants the
  number opens this file. A numeral beside the key is a second copy, and it is the copy that
  drifts.
- **A key is admitted only for a count that moves when the source is re-measured and is restated
  in more than one hand-maintained file.** A number used once stays inline, with its source cited
  beside it.
- **A quotation keeps its numeral.** What a document, a commit or a person said at the time is
  evidence, and rewriting it to a key falsifies it.
- **A frozen or historical figure gets no key.** A measurement taken on a date stays true about
  that date; it is written as a numeral with the date and the source.
- **A string an emitter writes interpolates what it measured at emit time, or carries no figure.**
  Generated output never cites a key and never repeats a numeral from this table.
- **Name the denominator when two exist.** "Incomplete" over every item and "incomplete" over the
  items in scope are two counts, and each gets its own key and its own "what it counts".
- **Update the table from what the check reports; never edit the check to agree with the table.**
  A key and its source row land in the same change, or the check reports the key as unbacked.
- **A `by-hand:` key is re-derived by a person whenever its source moves**, with the command its
  row gives, because neither the pre-push suite nor `.github/workflows/verify.yml` can reach what it measures.

The rule behind all of it is `CLAUDE.md` § Verification before claiming: a count is re-derived at
the time of writing and its source cited, or it is reported as not verified.

## Rates and metrics

**A rate is printed only over a declared minimum sample.** Any report that computes a rate names
the sample size below which it prints the count and no rate, so a rate over three records never
reads as a finding. The minimum is a constant the report reads: it lives in the policy file of the
tool that computes the rate, under a key, with its reason beside it, and is stated nowhere else.

**Every metric is defined once, here.** A metric that a report, a review or a sponsor will be
shown has one row below, and every other file points at the row rather than redefining it. If the
definitions move to a generated file, this section names the hand-maintained source it is
generated from and keeps nothing else.

| Metric | What is counted | Who counts it | Where it is recorded | The value that would mean the project is not viable |
|---|---|---|---|---|
| Coverage of changed code | Of the code lines a branch adds or changes under `apps/`, against its merge base with `origin/main`, those Node's own coverage counts run by the suite; and, as a second rate, of the branches Node reports starting on those lines, those taken. A code line holds a character outside a comment and outside whitespace. A changed file no test loads counts every changed code line uncovered; a line a `node:coverage` directive excuses with a reason is left out. The files counted are `thresholdScope` in `tools/policy/tool-settings.json`. Below `thresholdMinSamples.lines` or `.branches` the counts are given and no rate. | `npm run thresholds:check` (`scripts/check-thresholds.mjs`), at pre-push and in CI. | Printed by each run, with the whole product's figures beside it, which are not gated; nothing commits it. The verification report does not carry it: its fresh run makes the Commands' mutation run alone. | Below `thresholdPercents.lines` or `.branches` on the changed code of more than half the changes `change-build` hands to `change-verify`, over at least five such changes, with fewer only the count: the build's agents would then not be running what they write, and a change could leave Build only by a person writing its tests. |
| Mutation score of changed code | Of the mutants StrykerJS makes over the source lines a branch changes in the Routines, and in a run of their own in the Commands (`mutationCommands` in `tools/policy/tool-settings.json`), those killed or timed out, over those and the ones that survived or ran with no test covering them. A change to a test alone makes no mutant. A mutant a `Stryker disable next-line` comment ignores with a reason, and one whose test run errored, is left out. Below `thresholdMinSamples.mutants` the counts are given and no rate. | `npm run thresholds:check` for the Routines, at pre-push and in CI, and `npm run thresholds:commands:check` for the Commands, in CI, and at `change-verify` in its fresh run, `scripts/fresh-run.mjs` (`scripts/check-thresholds.mjs`). | Printed by each run, with each undetected mutant listed for the honesty lens; nothing commits it, and the verification report carries the Commands' run as the gate printed it (`scripts/lib/verify-report.mjs`). The mutants the product left undetected where it measured below the threshold when the gate landed are `artifacts/thresholds/baseline.json`. | Below `thresholdPercents.mutation` on the changed code of more than half the changes `change-build` hands to `change-verify`, over at least five such changes, with fewer only the count; or, over the same changes, more mutants of changed code excused by a comment than detected: the tests would then pass by exemption rather than by detecting faults. |
| Co-change of a pair of files | Of the counted pull requests merged to `main` through the co-change map's `throughCommit` that changed either file, those that changed both, in thousandths, rounded half up (`jaccardPermille`). A pull request is counted when it changed at least one file and no more than `couplingMaxUnitFiles`, each path named as it is at the baseline. A pair changed together by fewer than `couplingMinTogether` is not written; where fewer than `couplingMinSampleUnits` pull requests changed either file, the count is given and no rate. | `npm run coupling` and `npm run coupling:update` (`tools/coupling/coupling.ts`); `npm run coupling:check` re-derives it at pre-push and in CI. | `artifacts/coupling/cochange.json`, each row of `edges`. | The largest cluster holding more than half the map's non-hub files, over at least `couplingMinSampleUnits` counted pull requests, with fewer only the count: no two lanes could then be kept apart by the map, and it would show no seam a decomposition could cut along. |
| Hub share of a file | Of the counted pull requests through the map's `throughCommit`, as above, those that changed the file; at or above `couplingHubMinPercent` the file is a hub. Below `couplingMinSampleUnits` counted pull requests no file is marked either way. | The same as the row above. | `artifacts/coupling/cochange.json`: `changes` and `hub` in each row of `files`, over `counted`. | More than half the files the map lists being hubs, over the same sample: most changes would then go through files that every other change touches, and any two lanes would collide on them. |
| Jobs a file fires per hundred pull requests | The pre-push jobs whose globs `path.matchesGlob` matches to the file, times the counted pull requests through the map's `throughCommit` that changed it, per hundred counted pull requests, rounded half up. Below `couplingMinSampleUnits` counted pull requests the counts are given and no rate. | `npm run harness` (`tools/harness/harness.ts`), by hand. | The report it writes under `.scratch/harness/`, never committed: `firesPerHundredPrs` in each row of `tables.hubs`. | Any one file firing, per hundred pull requests, more than fifty times the number of pre-push jobs, over the same sample: a push would then on average run half the suite for that one file, and the globs would scope nothing. |
