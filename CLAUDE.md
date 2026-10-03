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

The tracker's memory commands (in Beads, `remember`, `recall` and `memories`) are not used; do not
write a memory and do not cite one from a tracked file. The harness's per-project memory directory under
`~/.claude/projects/` is not used either. A fact worth keeping goes in a tracked file or, if it is work,
in `bd`.

`bd prime`, which the tracker's plugin runs at each session's start and compaction, prints
`.beads/PRIME.md`: task-tracking guidance that states no rule, only where each lives, and overrides
nothing here.

## Verification before claiming

Never state a count, a figure, a "resolved" status or a fact about the environment derived from
titles, memory or inference. Re-derive every number in a document, an issue, a pull-request body or
an analysis from the repository at the time of writing. Cite the source path inline. If you cannot
verify a figure, say so. Do not estimate.

The same holds for a fact a session hands a subagent. A premise in a brief, such as whether an API
exists, the version that added it, or a value computed from the code, is verified first and given
with its source, or given as a question for the subagent to check. A subagent that finds a premise
false builds on what it found, not on the brief, and names the false premise in its report: what it
builds on a premise it knows is false is work someone later replaces.

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
option's description or preview. An example on which the recommendation wins, or on which every
option agrees, answers the question for them.

## Bash command style

Run each gate, test, or git command as a SEPARATE Bash call. Do not chain with `&&`, `;`, or `|`:
a chain's failure does not say which step failed. Do not use heredocs to write files.
Never `cd`, and never name a directory:
every call starts at the checkout root, so name the file as an explicit repository-relative
argument. Keep long prose out of the command line and pass it from a file under `.scratch/`, or,
in a session with no worktree, in a directory `mktemp -d` makes, with `-F`, `--body-file` or the
tool's equivalent. Prefer the Read, Edit and Write tools over `cat`,
`head`, `sed -n` and shell redirection. Read anything outside the repository in its own call. Never
let a secret-shaped read share a call with real work: a compound command is refused as a unit.

When a call is refused anyway, follow Guards.

## Guards

If a command you need is refused by the permission classifier, do not attempt a workaround. Skip
it, keep going with everything else, and give one `RUN THESE YOURSELF` code block at the end of the
report with the exact commands, in order.

A command a subagent reports refused may be run once by the session that launched it, as its own
single call, before that session hands it to the user: the classifier judges each call in its own
context, so a subagent's refusal is not its parent's. If that call is refused too, the command goes
in the block. The parent never tries again in pieces, through another tool, or through another
subagent; each of those is a workaround.

## The task store

Every task is an issue in `bd`, never a markdown checklist or an in-session todo list.
`bd ready` is the queue; do not add a status table to a document. Every run of tracker writes is
bracketed: pull before the first write and push after the last, and a rejected push is reported
with its exact command and error, never forced. Every open issue carries a label naming where its
work lands. An issue's type and priority are the first rows of `issueTypes` and `issuePriorities` in
`tools/policy/vocabulary.json` that fit it: set when filed, and moved, with a note naming them, when
a session works or notes it. Otherwise `bd ready` ranks by who filed it, and when.

An issue a run files `discovered-from` the issue or epic it ran on also carries, from
`tools/policy/vocabulary.json`, the `foundAtLabels` label for the stage that found it and one `assetLabels`
label for each kind of file it would change. Those pairs are what `bd count` reads across runs
(`.claude/skills/change-finalize/SKILL.md` § 9. Report).

## Product work runs as OpenSpec-format changes

A change to what the product does, stated as requirements, runs through the `change-*` skills in
order: `change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify`,
`change-finalize`. One change is one worktree, one pull request and one `bd` epic whose tasks are its
children; the shape and its reasons are `docs/decisions.md` § D-02. Never track a change's tasks in a
`tasks.md`, and never run `openspec init` or `openspec update` here.

A change's branch is first pushed by `change-finalize`'s `open-pr`: until `change-build` writes
their tests, the pre-push trace gate rightly refuses the delta's new and modified scenarios. An
earlier backup push is the user's to run, with `--no-verify`, skipping every pre-push job; no CI
runs before a pull request.

Each stage starts in a fresh session and never depends on an earlier stage's conversation, because
one session that runs every stage carries each stage's context into the next. It picks the change
up from what the earlier stages wrote down:

- **its name**: the stage's argument, or else the `change` metadata of the one open epic that carries
  the change label (`specChangeLabel` in `tools/policy/vocabulary.json`), which
  `bd list --label <that label> --type epic --status open,in_progress,blocked --json` lists. With
  several, ask the user which;
- **its epic**, with the epic's description, notes and children;
- **its worktree**, `.claude/worktrees/<change>` on the branch `agent/<change>`, and the change's
  folder there, `openspec/changes/<change>/`.

What a later stage needs from an earlier one, such as the user's answer to a question or a decision
to write no design, goes into one of these before the earlier stage ends.

When a later stage sends a change back, the epic gets the `rerouteLabels` label, from
`tools/policy/vocabulary.json`, for each earlier stage whose work it reopens: the proposal or a delta
spec revised, the design revised, a task added to the epic, or work `change-verify` sends back to
`change-build`. That rework lands as
commits inside the change and never becomes an issue, so without the label no count sees it.

## Decisions live in the register

`docs/decisions.md` holds the numbered decisions (`D-NN`) and risks (`R-NN`) that no agent
re-litigates. An entry is never rewritten. A later decision adds a dated amendment under each entry
it changes. When a document and the register disagree, the register wins. Retiring a file is a
register decision with a checklist, not a tidy-up. A retired file moves to `docs/retired/` under a
banner naming the decision. Or it is deleted under an entry with `git show` as the recovery.

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
stating what the value decides and where it is changed. A table keyed by what it governs carries
each row's reason in the row. Either way, a reader needs to know what a record changes and what it
leaves alone before the array.
Generated output under `artifacts/`, which nothing edits by hand: it carries a banner naming its
emitter, and a correction goes into the hand-maintained source, so the next run carries it. A
constant a tool or a prompt reads lives in a policy file under a key, and is stated nowhere else.

## The script suffix contract

A script named `<group>:<verb>` in `package.json` is a public name. The bare name writes the
artifact. `:check` re-derives it in memory, diffs against what is committed, exits 1 on any
difference or on a stale file a fresh run would not write, and writes nothing. `:selftest` asserts
invariants from fixtures it builds under the temporary directory. `:update` moves a baseline.

Every emitter obeys the same rules from its first commit. It has no timestamp and no randomness. It
has one canonical serialiser. It sorts by code point so two runtimes agree. Its `:check` twin lands
in the same change. An emitter that walks a graph compares its walk with a hand-ratified fixture. It
refuses to write on disagreement, because a wrong walk returns a smaller answer and says nothing.

## The gate ladder

The same checks run at four latencies, and a slower tier never trusts a faster one:

| Tier | Latency | Shape |
|---|---|---|
| In-session hooks (`scripts/hooks/`) | milliseconds | may be unsound; never block a stop |
| Pre-commit (`git-hooks.yml`) | seconds | sequential, over staged files only |
| Pre-push (`git-hooks.yml`) | tens of seconds | parallel, each job scoped by a glob of what it reads |
| `.github/workflows/verify.yml` | minutes | every gate, binding on every pull request and every push to `main` |

Where a check runs is decided by what it reads. A check that reads only committed files is a
pre-push job **and** a `.github/workflows/verify.yml` step, even one that talks over loopback to a
server it starts from them (`docs/decisions.md` § D-04). A check that reads something outside the
repository (another checkout, a token, a network, a language model) runs in neither; its selftest
over fixtures runs in both.
A legitimately absent input skips clean and prints why; a tool that is found and then fails is a
failure, never a skip.

**`npm run gates` is the forced full suite**, run through Git as a push runs it. Before opening or
updating a pull request: regenerate every derived artifact, run `npm run gates`, fetch and rebase
onto `origin/main`, and run it again.

## A workflow a session writes itself is bounded

A review or design workflow a session writes itself, outside `.claude/workflows/`, stays within
keys of `tools/policy/agent-workflows.json`, because a review nothing bounds can cost more than the work
it reviews. A branch that changes only prompts or documents gets none beyond the pull-request
reviewer. A branch with code or a gate gets one adversarial reviewer, at medium effort, that runs
the code and reports at most `sessionReviewMaxFindings` findings; each goes to the skeptics
`sessionReviewSkeptics` gives its severity, and one given none goes to the author unjudged. Every
such workflow sets each agent's effort and runs at most `sessionWorkflowMaxAgents` agents unless
the user asks for more. An effort level or an orchestration default that says cost is no
constraint raises none of it.

## Standing rules for prompts and gates

Each of these holds from the first file it applies to, and for every one after it.

- **The first line of every substantial skill and agent** is: "Read CLAUDE.md first. Everything
  below is subordinate to it and points at it rather than restating it."
- **A rule in a prompt states the failure it prevents in one clause, and carries no incident.** In
  `CLAUDE.md`, a skill or an agent, the dated incident behind a rule goes in the description of the
  pull request that adds or changes the rule, because every session loads the prompt and only the
  reader who edits the rule needs the incident. That reader finds it from the prompt:
  `git log --format=%h origin/main -- <prompt>` lists the commits that changed it, and
  `gh api repos/{owner}/{repo}/commits/<commit>/pulls` names the pull request each one landed from.
  The header of a script, an emitter or a hook is not a prompt, and keeps its incident (below).
- **Every gate has a `--selftest` mode.** It copies the gate's inputs under the temporary directory,
  breaks exactly one thing per case, asserts the run fails **for that reason**, and keeps one
  undoctored control case that must pass, without which every other case could be failing on the
  copy. It is exposed as `<name>:selftest` and runs as its own pre-push job.
- **Every gate has a root override**: an environment variable naming a doctored copy, so a by-hand
  run can point the gate at a fixture without editing it.
- **A guard's selftest asserts the reason a refusal reports**, not the refusal alone: a check that
  only sees "refused" passes with the guard deleted whenever something else refuses first.
- **Every script under `scripts/`, every emitter under `tools/` and every hook under
  `scripts/hooks/` opens with a header of four parts, in this order.** They are: what it emits or
  checks; **the failure it exists to prevent**, as the incident that happened, dated, with the wrong
  fix tried first where there was one; the invocation with its flags; and what it needs (another
  checkout, a token, a network). On day one, with no incident yet, that paragraph says what the
  script would let through if it were wrong, and the first incident replaces it. It is the paragraph
  readers actually need, and the one to keep when cutting: a gate whose header says only what it
  checks is the one the next person weakens to make a push go through. A measured cost lives there
  too, so "why is this not a pre-push job" is answerable from the file. An emitter's header adds
  four labelled lines: `KIND` (its lifecycle), `INVARIANTS` (what it never does), `RE-ENTRY`
  (whether a second run is idempotent, and what `--check` does) and `STALE WHEN` (the inputs whose
  change makes its output stale). A ten-line helper can carry one sentence.

## Citations

Strip a file copied in from another repository before this gate's first run. Replace its header
citations to sections, reviews, tracker ids and commits that do not exist here with your own, or
drop them.

Cite a document by section, `<file>.md § <Heading>`, not by line: a line pointer rots on every edit
above it. Every pointer of either form in every tracked text file must resolve; the citations gate
holds them. A proposed widening of that gate is measured before it is adopted and, if refused,
recorded in `docs/decisions.md`.

## Git workflow

The trunk is `main`. Agent work happens on `agent/<name>` branches cut from
`origin/main` by the one worktree script, and reaches the trunk by pull request; name the base
explicitly on every pull request, because a tool that infers one infers the default branch. The
protected branches are main, release: never push to, switch to or rewrite one from a
worktree. Rebase onto `origin/main` rather than merging the trunk into a branch, and use
`--rebase` on every pull. Commit or push only when asked; asking for work agreed in conversation
asks for its pull request, or finished work sits unpushed for another turn.

A pull request reaches the trunk through the reviewer, `.github/workflows/pr-review.yml`, one at a
time (`docs/decisions.md` § D-07). Its title ends with the ids of the issues it carries, in
parentheses, and the reviewer holds it to their acceptance criteria. The reviewer merges a pull
request that satisfies every dimension and is not high risk. A person merges any other, or approves
its head by applying the approval label (`prReviewLabels` in `tools/policy/pr-review.json`), after which
the reviewer merges it. An agent never applies that label: the approval is a person's, and GitHub cannot
tell a person from an agent holding their credentials (`docs/decisions.md` § R-01). An agent opens
every pull request with the `open-pr` skill, which holds the steps from the push to the verdict.

## Prompt reviews

After a prompt is executed from a file, the session that ran it closes the run with the
`close-prompt-run` skill, after its tracker push. One review, the `continuous-prompt-improvement`
agent, reads every run's analysis no review has read yet, as a batch, and
proposes its edits as one pull request, whose description is the review and which a person merges
or not (`docs/decisions.md` § D-08 and § D-17). The skill is the home of the markers, of what is
pending and of the launch; the agent's file is the home of what a review leaves. A review is not a
file in this repository, and a prompt carries no `Reviewed:` trailer.

## A program proposes; only a person promotes

Nothing a program derives from its runs filters or instructs until a person has read the evidence
and promoted it by editing the hand-maintained source. The label counts across runs are evidence
for a person to read, never a rule. A proposal that does not hold
is closed with its reason, so the next one to raise it finds why.

## Worktree-local context

The briefing below exists only in a linked worktree, where the worktree script renders it from
`.claude/worktree-CONTEXT.md.tmpl`. It takes precedence where it conflicts with the guidance above.

@.worktree/CONTEXT.md