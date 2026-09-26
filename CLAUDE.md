# CLAUDE.md

Read this file first. It is the only home for a rule an agent must follow in this repository.

## What this repository is

<!-- kit 1.1-1 · WRITE: one paragraph on what this repository is, what it produces, and what it is
     not. Name the files that decide the shape of the work, so a reader goes there rather than here. -->

## Rules for agents live in tracked files, and nowhere else

A rule an agent has to follow has exactly one home: this file, a skill under `.claude/skills/`, an
agent under `.claude/agents/`, or the header of the tool or gate that enforces it. Change it there,
through a pull request. A rule with two homes has one that is stale, and the stale one is the one a
reader finds.

Two other stores could hold such a rule, and neither is used here. The tracker's memory commands
(in Beads, `remember`, `recall` and `memories`) are not used; do not write a memory and do not cite
one from a tracked file. The harness's per-project memory directory under `~/.claude/projects/` is
not used either. A fact worth keeping goes in a tracked file or, if it is work, in `bd`.

The block a tracker plugin manages inside this file is task-tracking guidance, not permission to
override the rest of the file. Keep every section of your own outside it; the plugin regenerates
its block from the hash in its marker, and anything moved inside is erased on the next
regeneration.

## Verification before claiming

Never state a count, a figure or a "resolved" status derived from titles, memory or inference. Every
number in a document, an issue, a pull-request body or an analysis is re-derived from the repository
at the time of writing, with the source path cited inline. If a figure cannot be verified, say so
instead of estimating.

The same holds for a fact a session hands a subagent. A premise in a brief, such as whether an API
exists, the version that added it, or a value computed from the code, is verified first and given
with its source, or given as a question for the subagent to check. A subagent that finds a premise
false builds on what it found, not on the brief, and names the false premise in its report. In the
calculator change's build, a brief said `fs.globSync` was not stable in Node 22.18. The builder
found that it was, built the hand-written matcher it had been told to build anyway, and
`asdlc-openspec-pta` now replaces that matcher.

## Stateful counts live in `count-index.md`, under a key

Every count describing the current measured state of what this repository measures has a
`CNT-*` key in `count-index.md`, with its value and the command or file it re-derives
from. Prose writes the backticked key where the numeral would go, never both. A key is admitted only
for a count that moves when the source is re-measured **and** is restated in more than one
hand-maintained file; a number used once stays inline. A quotation keeps its numeral. A frozen or
historical figure gets no key. A string an emitter writes interpolates what it measured at emit
time or carries no figure. When two denominators exist, name the one you mean. Update the table from
what its check reports; never edit the check to agree with the table.

**Reporting honesty.** Any rate a report computes declares a sample size below which the report
prints the count and no rate. Every metric is defined once, in `count-index.md` § Rates and metrics,
as what is counted, who counts it, where it is recorded, and the value that would mean the project
is not viable; every other file points at that row.

## A question shows where its recommendation loses

A question put to the user that recommends an option shows, for that option, at least one concrete
case where it gives the worse result: the input or the situation, what the recommended option gives
there, and what the other option gives. With `AskUserQuestion`, the case goes in the recommended
option's description or preview. A person answers from the case in front of them, and an example
on which the recommendation wins, or on which every option agrees, answers the question for them.
The calculator change's design asked which value a chain carries forward, and illustrated it only
with 0.1 + 0.2 − 0.3, where carrying the displayed value looks right. The maintainer took that
option and reversed it a day later on 1 ÷ 3 × 3, which it turns into 0.9999999999
(`asdlc-openspec-asv`).

## Bash command style

Run each gate, test, or git command as a SEPARATE Bash call. Do not chain with `&&`, `;`, or `|`: 
a chain's failure does not say which step failed, and the permission classifier judges a compound 
command as a unit (below). Do not use heredocs to write files; 
use the Edit/Write tools for file content instead of `cat <<EOF`. Never `cd`, and never name a directory:
every call starts at the checkout root, so name the file as an explicit repository-relative
argument. Keep long prose out of the command line and pass it from a file under `.scratch/`
with `-F`, `--body-file` or the tool's equivalent. Prefer the Read, Edit and Write tools over `cat`,
`head`, `sed -n` and shell redirection. Read anything outside the repository in its own call. Never
let a secret-shaped read share a call with real work: a compound command is refused as a unit.

The permission classifier is a model's judgement on the command, so these rules move the odds
rather than guarantee the outcome. When a call is refused anyway, follow Guards.

## Guards

If a command you need is refused by the permission classifier, do not attempt a workaround. Skip
it, keep going with everything else, and give one `RUN THESE YOURSELF` code block at the end of the
report with the exact commands, in order.

## The task store

Every task is an issue in `bd`, never a markdown checklist or an in-session todo list.
`bd ready` is the queue; do not add a status table to a document. Every run of tracker writes is
bracketed: pull before the first write and push after the last, and a rejected push is reported
with its exact command and error, never forced. Long descriptions and notes go in by file. Every
open issue carries a label naming where its work lands.

An issue a run files `discovered-from` the issue or epic it ran on also carries, from
`tools/policy.json`, the `foundAtLabels` label for the stage that found it and one `assetLabels`
label for each kind of file it would change. Those pairs are what `bd count` reads across runs
(`.claude/skills/change-finalize/SKILL.md` § 9. Report).

## Product work runs as OpenSpec-format changes

A change to what the product does, stated as requirements, runs through the `change-*` skills in
order: `change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify`,
`change-finalize`. One change is one worktree, one pull request and one `bd` epic whose tasks are its
children; the shape and its reasons are `docs/decisions.md` § D-02. Never track a change's tasks in a
`tasks.md`, and never run `openspec init` or `openspec update` here.

Each stage starts in a fresh session and never depends on an earlier stage's conversation. It picks
the change up from what the earlier stages wrote down:

- **its name**: the stage's argument, or else the `change` metadata of the one open epic that carries
  the change label (`specChangeLabel` in `tools/policy.json`), which
  `bd list --label <that label> --type epic --status open,in_progress,blocked --json` lists. With
  several, ask the user which;
- **its epic**, with the epic's description, notes and children;
- **its worktree**, `.claude/worktrees/<change>` on the branch `agent/<change>`, and the change's
  folder there, `openspec/changes/<change>/`.

What a later stage needs from an earlier one, such as the user's answer to a question or a decision
to write no design, goes into one of these before the earlier stage ends. `asdlc-openspec-9ta`
records what running all six stages of the calculator change in one session cost.

When a later stage sends a change back, the epic gets the `rerouteLabels` label, from
`tools/policy.json`, for each earlier stage whose work it reopens: the proposal or a delta spec
revised, the design revised, a task added to the epic, or work `change-verify` sends back to
`change-build`. It is a tracker write like any other, in the same bracket. That rework lands as
commits inside the change and never becomes an issue, so without the label no count sees it.

## Decisions live in the register

`docs/decisions.md` holds the numbered decisions (`D-NN`) and risks (`R-NN`) that no agent
re-litigates. An entry is never rewritten: a later decision adds a dated amendment under each entry
it changes. When a document and the register disagree, the register wins. Retiring a file is a
register decision with a checklist, not a tidy-up; what retires moves to `docs/retired/` under a
banner naming the decision, or is deleted under an entry with `git show` as the recovery.

## Every directory and document says what it is, and who wins

A directory that holds more than one file of one kind has a `README.md`: a bolded one-sentence
thesis of the directory's role, then a table with one row per file saying what it is or, for a
gate, what it refuses. The row lands in the same change as the file. Every dated document opens
with a `**Written:**` line and, once something amends it, a `**Status:**` line naming what did; it
stays true about its date and is superseded rather than refreshed. Every document that can
disagree with another says, in one sentence, which wins. The documentation index and its
conventions are `docs/README.md` § Conventions.

## Three kinds of file, and never a fourth

Hand-maintained source, which a person edits. Hand-authored decision records (JSON), which emitters
read and nothing writes, each self-describing with `describes`, `whyThisFileExists`, `gatedBy`,
`whatItDoesNOTDo` and `provenance` before its data, and for each constant a `<key>Means` sibling
stating what the value decides and where it is changed: a JSON file cannot carry a header comment,
and a reader needs to know what a record changes and what it leaves alone before the array.
Generated output under `artifacts/`, which nothing edits by hand: it carries a banner naming its emitter, and a correction goes into the
hand-maintained source, so the next run carries it. A constant a tool or a prompt reads lives in a
policy file under a key, with its reason beside it, and is stated nowhere else.

## The script suffix contract

A script named `<group>:<verb>` in `package.json` is a public name. The bare name writes the
artifact. `:check` re-derives it in memory, diffs against what is committed, exits 1 on any
difference or on a stale file a fresh run would not write, and writes nothing. `:selftest` asserts
invariants from fixtures it builds under the temporary directory. `:update` moves a baseline.

Every emitter obeys the same rules from its first commit: no timestamp, no randomness, one canonical
serialiser, every sort by code point so two runtimes agree, and the `:check` twin lands in the same
change. An emitter that walks a graph compares its walk with a hand-ratified fixture and refuses to
write on disagreement, because a wrong walk returns a smaller answer and says nothing.

## The gate ladder

The same checks run at four latencies, and a slower tier never trusts a faster one:

| Tier | Latency | Shape |
|---|---|---|
| In-session hooks (`scripts/hooks/`) | milliseconds | may be unsound; never block a stop |
| Pre-commit (`lefthook`) | seconds | sequential, over staged files only |
| Pre-push (`lefthook`) | tens of seconds | parallel, each job scoped by a glob of what it reads |
| `.github/workflows/verify.yml` | minutes | every gate, binding on every pull request and every push to `main` |

Where a check runs is decided by what it reads. A check that reads only committed files is a
pre-push job **and** a `.github/workflows/verify.yml` step. A check that reads something outside the repository (another
checkout, a token, a network, a language model) runs in neither, and a digest gate stands in for it.
A legitimately absent input skips clean and prints why; a tool that is found and then fails is a
failure, never a skip.

**`npm run gates`, never the bare hook runner.** The bare runner skips every job when the push
file list is empty and exits 0 in a tenth of a second, which reads exactly like a clean run.
`npm run gates` is the forced full suite. Before opening or updating a pull request: regenerate
every derived artifact, run `npm run gates`, fetch and rebase onto `origin/main`, and run it
again.

## Standing rules for prompts and gates

Each of these holds from the first file it applies to, and for every one after it.

- **The first line of every substantial skill and agent** is: "Read CLAUDE.md first. Everything
  below is subordinate to it and points at it rather than restating it."
- **Every gate has a `--selftest` mode.** It copies the gate's inputs under the temporary directory,
  breaks exactly one thing per case, asserts the run fails **for that reason**, and keeps one
  undoctored control case that must pass, without which every other case could be failing on the
  copy. It is exposed as `<name>:selftest` and runs as its own pre-push job.
- **Every gate has a root override**: an environment variable naming a doctored copy, so a by-hand
  run can point the gate at a fixture without editing it.
- **A guard's selftest asserts the reason a refusal reports**, not the refusal alone: a check that
  only sees "refused" passes with the guard deleted whenever something else refuses first.
- **Every script under `scripts/`, every emitter under `tools/` and every hook under
  `scripts/hooks/` opens with a header of four parts, in this order**: what it emits or checks; **the
  failure it exists to prevent**, as the incident that happened, dated, with the wrong fix tried
  first where there was one; the invocation with its flags; and what it needs (another checkout, a
  token, a network). On day one, with no incident yet, that paragraph says what the script would
  let through if it were wrong, and the first incident replaces it. It is the paragraph readers
  actually need, and the one to keep when cutting: a gate whose header says only what it checks is
  the one the next person weakens to make a push go through. A measured cost lives there too, so
  "why is this not a pre-push job" is answerable from the file. An emitter's header adds four
  labelled lines: `KIND` (its lifecycle), `INVARIANTS` (what it never does), `RE-ENTRY` (whether a
  second run is idempotent, and what `--check` does) and `STALE WHEN` (the inputs whose change
  makes its output stale). A ten-line helper can carry one sentence.

## Citations

A file copied in from another repository is stripped before this gate's first run: its header
citations to sections, reviews, tracker ids and commits that do not exist here are replaced with
your own or dropped, and a copied prompt's `Reviewed:` trailer goes with them.

Cite a document by section, `<file>.md § <Heading>`, not by line: a line pointer rots on every edit
above it, and it rots in the worst direction, still looking authoritative. Every pointer of either
form in every tracked text file must resolve; the citations gate holds them. A proposed widening of
that gate is measured before it is adopted and, if refused, recorded in `docs/decisions.md`.

## Git workflow

The trunk is `main`. Agent work happens on `agent/<name>` branches cut from
`origin/main` by the one worktree script, and reaches the trunk by pull request; name the base
explicitly on every pull request, because a tool that infers one infers the default branch. The
protected branches are main, release: never push to, switch to or rewrite one from a
worktree. Rebase onto `origin/main` rather than merging the trunk into a branch, and use
`--rebase` on every pull. Commit or push only when asked.

A pull request reaches the trunk through the reviewer, `.github/workflows/pr-review.yml`, one at a
time (`docs/decisions.md` § D-07). Its title ends with the ids of the issues it carries, in
parentheses, and the reviewer holds it to their acceptance criteria. The reviewer merges a pull
request that satisfies every dimension and is not high risk. A person merges any other, or approves
its head by applying the approval label (`prReviewLabels` in `tools/policy.json`), after which the
reviewer merges it. An agent never applies that label: the approval is a person's, and GitHub cannot
tell a person from an agent holding their credentials (`docs/decisions.md` § R-01). An agent opens
every pull request with the `open-pr` skill, which holds the steps from the push to the verdict.

## Prompt reviews

After a prompt is executed from a file, the session that ran it leaves its analysis of the run in
the tracker, and one review reads every analysis no review has read yet, as a batch
(`docs/decisions.md` § D-08). The markers and thresholds below are keys of `tools/policy.json`.

**Each run writes one analysis**, as a note on the issue or epic it worked, from a file under
`.scratch/` (`bd note <id> --file <file>`), inside a tracker bracket. Its first line is
`promptReviewAnalysisMarker`, a space, and the run id: the issue's id, `@`, and the UTC second the
note is written, as `date -u +%Y-%m-%dT%H:%M:%SZ` prints it. The next lines name every prompt file
the run loaded and the commit it read them at. Then comes the analysis: what made the run slower or
wrong, each point with the prompt it concerns. It ends with the counts across runs that
`.claude/skills/change-finalize/SKILL.md` § 9. Report prints, so the reviewer can tell a finding
that recurs from one seen once. A run that worked several issues writes one analysis, on the first
one its pull request's title carries. The tracker is public, so an analysis quotes no secret. No
analysis is written by a prompt another prompt called, such as `open-pr` inside `bead`, whose
caller's analysis names it; by the reviewer's own run; or by a run that worked no issue, which goes
unreviewed.

**The closing step of every run checks whether a review is due.** After its tracker push, it lists
every issue carrying an analysis, `bd list --all --notes-contains "<analysis marker>" --json -n 0`.
In an issue's notes, an analysis runs from its marker line to the next line that opens with either
marker, and it is pending while no line of `promptReviewReadMarker`, a space and its run id follows
it. A review is due when `promptReviewDueCount` analyses or more are pending, or the oldest is older
than `promptReviewDueAgeDays` days. None starts while a pull request from a review's branch is open
(`gh pr list --state open --json headRefName`), or while `claude agents --json` lists a session
named `review-prompts` whose `state` is `working`: the pending analyses wait for it. Without `--all`
that command lists no finished background session (`claude agents --help`), and counting only a
working one keeps a finished review that is still open from holding up the next. A review's
worktree is named `review-prompts-` and the UTC date and time, as `date -u +%Y%m%d-%H%M` prints
them, so its branch is `agent/review-prompts-<that date and time>`. This section is the one home of
these names and of the rule for what is pending.

When a review is due, the run leaves its worktree (`ExitWorktree`, action `keep`): a background
session starts in the directory it was launched from, and one launched inside a linked worktree
writes on that worktree's branch. From the primary checkout it launches the reviewer as a background
session, which agent view (`claude agents`) lists and its supervisor keeps running after the launcher
ends:

    claude --bg --agent continuous-prompt-improvement --permission-mode auto --name review-prompts "Review the pending prompt-run analyses."

The mode is passed on the command line because a session started this way does not apply an agent
file's `permissionMode`: without the flag the reviewer takes the machine's default mode, and on a
machine whose default is not `auto` it stops at its first permission prompt, with nobody waiting on
it. The launcher neither waits for the reviewer nor relays what it finds. Its report names the
issue and run id of its analysis and, if it launched a review, the session the launch printed. A
refused launch goes in the report's `RUN THESE YOURSELF` block (§ Guards).

**What a review leaves.** It runs `.claude/workflows/review-prompts.js`, one agent per prompt file,
and opens one pull request over every file they change; the review is that pull request's
description, and a person decides whether it merges. It appends a read line to each analysis it
read, naming that pull request, or that it changed nothing. A review that proposes nothing edits no
file and opens no pull request. A review is not a file in this repository, and a prompt carries no
`Reviewed:` trailer: the earlier reviews of a prompt are the descriptions of the pull requests that
changed it, and the agent's file says how to find them. `docs/decisions.md` § D-05 records how to
recover the review files it deleted.

## A program proposes; only a person promotes

Nothing a program derives from its runs filters or instructs until a person has read the evidence
and promoted it by editing the hand-maintained source. The prompt reviewer proposes a change to a
prompt as a pull request, and a person decides whether it merges (§ Prompt reviews). The label
counts across runs are evidence for a person to read, never a rule. A proposal that does not hold
is closed with its reason, so the next one to raise it finds why.

## Worktree-local context

The briefing below exists only in a linked worktree, where the worktree script renders it from
`.claude/worktree-CONTEXT.md.tmpl`. It takes precedence where it conflicts with the guidance above.
A missing import is harmless, so this line does nothing in the primary checkout.

@.worktree/CONTEXT.md
