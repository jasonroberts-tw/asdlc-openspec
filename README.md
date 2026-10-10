# Agentic SDLC Harness (Spec-driven)

**This repository is where agents do product work under rules a person can check: what the product
should do is agreed before code is written, every rule has one home, and every claim is re-derived
rather than remembered.** Its name, `asdlc-openspec`, is short for an agentic software development
lifecycle run on OpenSpec. It puts two things together to get there, and each was taken for the
failure it prevents.

## Key Capabilities
- CLAUDE.md - the rules of the repo, how all agents must function
	- gate ladder - a ratcheted approach from fastest to slowest
		- agent hooks -> pre-commit hooks -> pre-push hooks -> CI verify job
	- git workflow
		- worktree -> PR -> automated PR review
	- automated harness improvement
		- tracked prompt files automatically reviewed after running
	- documentation integrity
		- keep README files up to date for all sub-folders
		- ensure citations from one markdown to another are correct and not stale
		- decisions always recorded in a single source of truth
- beads: how work is tracked by agents + humans
- application development workflow (OpenSpec)
- skills & agents - how agents operate, how they do work (not a complete list)
	- fan-out-work: analyzes backlog, creates lanes where predicted changes don't overlap, dispatches in parallel
	- open-pr: creates structured PR, runs the branch-reviewer before the push, waits for the pull-request reviewer and then the merge, and removes the worktree and branch after it
	- branch-reviewer: runs before each push, judges three dimensions (correctness, maintainability, blast radius)
	- pull-request reviewer: runs in CI with no model, in one job; passes what is off the high-risk floor, which GitHub's auto-merge then merges, and leaves each changed file's reach and co-change partners to the branch review's brief
- tools/policy/: conventions, definitions, configuration
- optional dev container for increased workload isolation

## Principles

**A person decides; agents propose and build.** A person reviews each change's proposal before its
build starts. A person also approves every pull request on the high-risk floor: a change to CI, the
rules, the toolchain, a dependency, a recorded decision, the reviewer itself, the command a gate
runs or a gate that holds the product. Nothing a program proposes
instructs an agent until then, but for a prompt review off the floor (`CLAUDE.md` § A program
proposes; only a person promotes). The rest merge through the pull-request reviewer, one at a time,
once `verify` passes; whether each does what its issues ask is the branch review's, before its push
(`docs/decisions.md` § D-07 and § D-37).

**It is built to learn from its own runs.** A defect a run finds outside the files its issue
changes is filed as an issue of its own, labelled with the kind of file it would change, so the
tracker shows what recurs across runs. A prompt that has run is reviewed in the background, and a
review that finds something opens a pull request fixing it in the prompt. A gate's header names the
incident it exists to prevent.
What a run shows lands in the skill, gate or decision that should have caught it, so the next run
does not meet it again.

**The harness and the product.** The harness, which this page's title names, is everything here
that runs the work: the rules, skills, agents, gates, hooks, tools and documents. The product is
what the work is done on: a demo calculator, its code under `apps/` and its requirements under
`openspec/` (`docs/decisions.md` § D-04). A harness change, or a product fix that changes no
requirement, goes through the `bead` skill. A change to what the product does goes through the
`change-*` skills (`docs/decisions.md` § D-02).


**On this page:** [Read in this order](#read-in-this-order)
· [How it is laid out](#how-it-is-laid-out)
· [The guardrails](#the-guardrails)
· [Setup](#setup)
· [Working here](#working-here)
· [The tasks](#the-tasks)
· [The work, and what its runs leave behind](#the-work-and-what-its-runs-leave-behind)
· [What is still a placeholder](#what-is-still-a-placeholder)
· [Where to read next](#where-to-read-next)
· [What runs automatically](#what-runs-automatically)

## Read in this order

1. This page, down to § The guardrails: why the repository exists, what it is and how its parts
   fit.
1. `CLAUDE.md`, whole. It is written for agents, and it is also the shortest complete statement of
   how work is done here; every guardrail below is a rule there first.
1. `docs/README.md`: the documentation index and the conventions every document follows.
1. The `README.md` of whichever directory you are about to change. Each one is a thesis sentence
   and a table with one row per file.

## How it is laid out

Every directory that holds more than one file of a kind has its own `README.md`; this table is the
level above them. `apps/` and `openspec/` hold the product; every other path is the harness.

| Path | What it holds |
|---|---|
| `CLAUDE.md` | The only home for a rule an agent must follow. `AGENTS.md` is one line pointing at it, so a second home never grows. |
| `.claude/` | What Claude Code loads at session start: `settings.json` (the plugins and the hook registrations, nothing else), the skills under `skills/`, the agents under `agents/`, the workflow scripts a skill runs under `workflows/`, and the template for a worktree's briefing; and, beside the prompts, the stored decision cases a prompt review answers them with, under `prompt-cases/`. |
| `scripts/` | Single-file gates, and the scripts a git hook or an operator calls. Each refuses one thing, and its header says which incident it exists to prevent. |
| `scripts/hooks/` | The in-session hooks: the fastest tier of checks, run by Claude Code around an agent's tool calls. |
| `tools/` | Emitters and multi-file checks, one directory each, TypeScript run directly by Node. |
| `artifacts/` | Generated output. Nothing here is edited by hand; each file names the emitter that wrote it, and a correction goes into that emitter's hand-maintained source. It has three directories: `coupling/`, whose one file is the co-change map of the pull requests merged to `main`; `trace/`, with a `README.md` its emitter writes; and `thresholds/`, whose one file is the thresholds gate's ratchet baseline. |
| `docs/` | What a person reads: the documentation index, and the documents it lists. |
| `openspec/` | The product's requirements, in OpenSpec's on-disk format: the living spec of each capability, the changes in flight against it, and the archive of those that landed. |
| `apps/` | The product's code, one directory per app, each with its own `README.md`, its Binding Surface in `binding-surface.md` (what a test may depend on), and its tests beside it. `calculator/` is the first: plain ES modules, run as committed in a browser and under Node's test runner, with no build step. |
| `count-index.md` | Every count that more than one file restates, under a `CNT-*` key, with the source it re-derives from. |
| `CONTEXT.md` | The glossary: each word this repository gives a meaning of its own, with the file that decides it. |
| `.beads/` | The configuration of `bd`, the issue tracker. Its database syncs through the git remote and is never committed; `bd bootstrap` hydrates it. `PRIME.md` is what `bd prime` prints in place of its own text when the tracker's plugin runs it at a session's start and before a compaction: it points at where each rule lives and states none. |
| `git-hooks.yml` | The git-hook tiers: which gate runs at commit and at push, each with the glob that scopes it and a note of its measured cost. `scripts/git-hooks.mjs` runs it, called by the five `hook.asdlc-*` entries `mise run hooks:install` writes into the repository's config. |
| `mise.toml`, `mise.lock` | The toolchain: every tool version the repository installs, and the lockfile that holds each one's download URL and checksum per platform, or, for a `pypi:` tool such as graphify, the path and digest of its uv lock. CI, the dev container and § Setup install from them (`docs/decisions.md` § D-31), and `mise run check:toolchain` holds them. |
| `.mise/locks/` | The uv lock of each `pypi:` tool's dependencies, with the versions and hashes uv installs them at, which `mise lock` writes and `mise.lock` names. CI and the dev container install from it too (`docs/decisions.md` § D-35). |
| `tasks.toml` | Every task the hooks, CI and the prompts run by name, through `mise run <name>`, each with a `description` of what it does; § The tasks has one row each, giving the tier it runs at. `package.json` keeps two scripts beside it, `prepare` and `calculator:serve` (`docs/decisions.md` § D-36), and `mise run check:jobs` holds the two lists apart. |
| `.vale.ini`, `.vale-styles/Layout/` | The configuration of Vale, the prose linter the `vale@agent-tools` hook runs on each edit of prose, and `Layout`, the one style this repository writes itself. |
| `.github/workflows/verify.yml` | The slowest tier: every gate that reads only committed files, on every pull request and every push to `main`. |
| `.github/workflows/pr-review.yml` | The pull-request reviewer: on each pushed head it submits one review, approving a head whose changes are off the high-risk floor, which GitHub's auto-merge then merges, and commenting that a person decides on the rest, with no model and no secret, in one job that installs no npm package and writes only the review. Each changed file's reach and co-change partners are in the branch review's brief, before the push; the review prints neither. |
| `.devcontainer/` | A container that needs nothing from the network at create time. |
| `KIT-CHECKLIST.md` | What the starter kit's bootstrap laid down, step by step, and what is still to adapt. Deleted once it is worked through. |

Some paths appear only on a working machine and are gitignored, each with its reason in
`.gitignore`:

- `.scratch/`: commit messages, pull-request bodies and tracker notes, passed to tools by file,
  and the harness assessment's dated reports under `harness/`.
- `.claude/worktrees/`: one checkout per parallel agent.
- `.worktree/`: a worktree's rendered briefing.
- `.claude/settings.local.json`: machine-specific permissions.
- `.vale-styles/`, all but `Layout/`: the styles `vale sync` downloads.
- `graphify-out/`: the local code graph `mise run code-graph` builds, never committed
  (`docs/decisions.md` § D-20).
- `__pycache__/`, anywhere in the tree: the bytecode cache Python writes beside a tracked Python
  file that another Python process imports.

Every file is one of three kinds: hand-maintained source, a hand-authored decision record (JSON
that emitters read and nothing writes) or generated output that nothing edits by hand
(`CLAUDE.md` § Three kinds of file, and never a fourth). Knowing which kind you are looking at
tells you whether to edit it.

## The guardrails

The same checks run at four latencies, and a slower tier never trusts a faster one: in-session
hooks, pre-commit, pre-push, and `.github/workflows/verify.yml` (`CLAUDE.md` § The gate ladder).
Where a check runs is decided by what it reads. § What runs automatically, at the foot of this page,
lists each one by its trigger.

Each row below is a failure this repository is built to refuse, what refuses it, and the home of
the rule. The third column wins over the first two.

| What it stops | What enforces it | The rule's home |
|---|---|---|
| A rule with two homes, one of them stale; a rule kept in an agent's memory store | The citations gate's memory rule (`tools/citations/memory.ts`), and review | `CLAUDE.md` § Rules for agents live in tracked files, and nowhere else |
| A hand edit to generated output | `scripts/hooks/block-generated-edit.mjs` in session, `scripts/assert-not-hand-edited.mjs` at commit, and each emitter's `:check` twin at push and in CI | `CLAUDE.md` § The script suffix contract |
| A green run that ran nothing | `mise run gates` forces the full suite, and refuses a clone whose hooks are not installed; the hook runner names every job it skips; `check:jobs` refuses a gate no job runs unless it is declared, with its reason; `scripts/run-tests.mjs` fails a test run whose pattern matches no file or matches a file that declares no test | `CLAUDE.md` § The gate ladder |
| A test that does not say which IDs it proves, how, at which layer and level, or against which version of each artifact; or a test that runs and that a gate reading tests from source cannot see | `scripts/run-tests.mjs` reads every test file it runs through `scripts/test-trace.mjs`, fails the run on metadata that reader refuses, and fails it on any test that reader and Node's runner do not both see; `tests:selftest` and `tests:trace:selftest` hold both | the header of `scripts/test-trace.mjs` |
| A scenario without its happy-path or its negative test, a test on an ID no spec heads or on an old version of what it proves, a change under `apps/` in a commit that names no task, or a contract operation no test covers | `trace:check`, at push and in CI, re-derives the traceability record and holds it to traceability rules 5 to 8, the happy-path-and-negative obligation and a ratchet baseline of the gaps that predate it, which may fall and never rise; `trace:selftest` holds each refusal | the header of `tools/trace/trace.ts` |
| A proof whose tracer says, at verify, that it exercises its scenario, while it never asserts one of the scenario's THEN, AND or BUT clauses, or asserts another value than the spec writes out | `mise run trace:clauses`, which `change-verify` runs outside its trace workflow on a trace with no gap, asks TypeSafe of each clause, and the workflow's clause run sends each row with a clause under `verifyTraceClauseThreshold` to its skeptics; `render-pr-body.mjs` refuses the body while that gap stands. Nothing when `TYPESAFE_API_KEY` is not set, and the trace says no clause was checked. `trace:clauses:selftest` and `workflows:selftest` hold both halves | the header of `scripts/judge-trace-clauses.mjs`; `docs/decisions.md` § D-42 |
| A test deleted, skipped or disabled, or its assertions weakened, on a branch with no recorded architect decision | `tests:inventory:check` compares the tests at HEAD with those at the merge base with `origin/main` and refuses each such change unless a commit on the branch carries a trailer naming the test and the reason; `tests:inventory:selftest` holds it | the header of `scripts/check-test-inventory.mjs` |
| Changed code under `apps/` that no test runs, or that tests run without detecting a fault injected into it | `thresholds:check`, at push and in CI, holds the lines and branches a branch changes to Node's own coverage and the changed lines of its Routines to StrykerJS's mutation score, each against its threshold and minimum sample in `tools/policy/tool-settings.json`. It also holds the ratchet baseline of the product's undetected mutants, which may fall and never rise; `thresholds:commands:check` holds the changed Commands in CI; `thresholds:selftest` holds each refusal. A change to a test alone mutates nothing | the header of `scripts/check-thresholds.mjs`; each metric's definition in `count-index.md` § Rates and metrics |
| A gate or a guard that still passes with its refusal deleted | Every gate's and every guard's selftest: one break per case, the refusal's reason asserted, one undoctored control. `check:jobs` refuses a check task that has neither a selftest task of its name nor one its exceptions name; nothing refuses a guard with none | `CLAUDE.md` § Standing rules for prompts and gates |
| A skill or agent that does not defer to `CLAUDE.md`; a prompt that grows without a person deciding it may | `check:prompts` refuses a skill or agent whose first line is not the line `CLAUDE.md` requires, and a prompt over its word budget in `tools/policy/prompt-budgets.json` or with none; a raise changes a record the pull-request reviewer holds high risk | `CLAUDE.md` § Standing rules for prompts and gates; the budgets' rules in the header of `scripts/check-prompts.mjs` |
| A prompt that tells an incident, where its pull request should | Nothing refuses it. `node scripts/check-prompts.mjs --incidents` lists each prompt line holding a date, a tracker id, a pull request number or a workflow run id, for a person to read, and a prompt review's file agents run it on their edits; `mise run prompts:incidents` asks TypeSafe of each paragraph that list does not name whether it tells one, and prints those it judges do in the same form. `check:prompts:selftest` and `prompts:incidents:selftest` hold what each lists | `CLAUDE.md` § Standing rules for prompts and gates; the incident list in the header of `scripts/check-prompts.mjs`; the header of `scripts/prompt-incidents.mjs` |
| A prompt sentence on how Claude Code behaves that an update has made false | Nothing refuses it. Each such sentence says "verified against the CLI, <version>" or "not verified against the CLI", and each prompt review lists those not verified and those verified on an older Claude Code than its runs record | `CLAUDE.md` § Standing rules for prompts and gates; `.claude/agents/continuous-prompt-improvement.md` § 7; `docs/decisions.md` § D-45 |
| A constant with no reason beside it, one key given two values, or a key added where no reader reads it | `check:policy`, at push and in CI, refuses a policy record without its header or a `Means` beside each constant, a key two records define, and `tools/policy.json` back beside the records; `tools/lib/policy.ts` refuses a key two records define for every reader; `check:policy:selftest` holds each refusal | `CLAUDE.md` § Three kinds of file, and never a fourth; `docs/decisions.md` § D-27 |
| A tool version stated in a second place, a pin that is a range, a pin the lockfile does not verify, a second mise config, or CI and the dev container on two mise releases | `check:toolchain`, at push and in CI, holds `mise.toml` to `mise.lock`, the workflows and the Dockerfile, and `check:toolchain:selftest` holds each refusal. CI's locked install refuses a pin the lockfile does not hold | the header of `mise.toml`; `docs/decisions.md` § D-31 |
| A Node floor below what a locked package accepts, or a locked range nothing reads | `check:node-floor`, at push and in CI, holds `package.json` `engines` to every range `package-lock.json` locks, and refuses a range form it cannot read; `check:node-floor:selftest` holds each form it reads and each refusal | `README.md` § The Node floor, on every platform; `docs/decisions.md` § D-34 |
| An agent in a worktree pushing to, switching to or rewriting a protected branch | `scripts/hooks/guard-git.mjs`, and the worktree hooks that provision only through `scripts/new-worktree.sh` | `CLAUDE.md` § Git workflow |
| A session in the dev container acting as the maintainer, whose credentials can merge past the trunk's ruleset, approve the pull request it requires an approval on, or edit it | `.devcontainer/devcontainer.json` mounts none of the host's logins and the GitHub App's key alone, and the image's `git` and `gh` act as the App through `scripts/github-app-token.mjs`, which `github-app-token:selftest` holds. Nothing for a session started on the host, which keeps the routes `docs/decisions.md` § R-02 carries, or in a container VS Code attaches to, which brings your git credentials and SSH agent in | `docs/decisions.md` § D-51; `.devcontainer/README.md` |
| An agent approving a pull request, or merging past the checks the trunk's ruleset requires, which only a person does | `scripts/hooks/guard-git.mjs`, from any checkout, for `gh pr review --approve` and `gh pr merge --admin`; nothing for `gh api`, curl, a browser tool or the web UI (`docs/decisions.md` § R-01) | `CLAUDE.md` § Git workflow |
| A prune that unregisters a worktree its checkout cannot see, as every host worktree was to a dev container on a bind-mounted clone | Since D-54 the dev container mounts no host checkout, so its git sees no host record. `scripts/hooks/worktree-remove.mjs` prunes nothing; `scripts/prune-worktree-branches.mjs` refuses while a stale record's parent directory is missing too; `scripts/hooks/guard-git.mjs` refuses a session's `git worktree prune`, but its dry run, from any checkout; the dev container's image sets `gc.worktreePruneExpire` to `never`. Nothing for a container made before D-54 and not recreated, which keeps the bind mount | `.devcontainer/README.md` § The host's worktrees, seen from the container |
| A dev container sharing a checkout with the host: its `.git`, its tracker database, which two writers corrupted, and code the host then runs | `.devcontainer/devcontainer.json` sets `workspaceMount` empty and mounts the container's clone from a volume of its own, which `.devcontainer/entrypoint.sh` clones at the first start. Nothing for a container made before D-54 and not recreated | `docs/decisions.md` § D-54; `.devcontainer/README.md` § The container's clone |
| A workflow other than the reviewer's able to approve a pull request, or to pass the `verify` check, which GitHub merges by | `pr-review:check`, at push and in CI, and `scripts/hooks/guard-workflow-edit.mjs` on a session's Write or Edit, each refusing a workflow that grants `pull-requests: write`, `statuses: write`, `checks: write` or `write-all`, or, outside `verify.yml`, names a job for the check; and any workflow but the prompt review's whose expressions could read the agents' App key, whose token approves a pull request the App did not open, or the prompt review's on another event or outside its environment; nothing for a workflow written through Bash, or a job whose name an expression builds | `docs/decisions.md` § D-57; `docs/decisions/asdlc-openspec-ic9h.md` § Decision |
| A figure restated from memory that has since moved | `counts:check` re-derives every keyed count from its source | `count-index.md` § How to use it |
| A pointer to a file or a section that is gone | `citations:check`, over every tracked text file | `CLAUDE.md` § Citations |
| A prose line an edit left more than a word past column 100, whitespace at the end of a line, or a heading with no blank line before it | The `Layout` style, through the `vale@agent-tools` hook on each edit of prose, at error level; `vale:selftest`, at push, holds each rule | the comment that opens each rule in `.vale-styles/Layout/` |
| A recorded decision argued again, or a register whose summary drifts from its entries | `check:register` | `CLAUDE.md` § Decisions live in the register |
| A record under `docs/decisions/` not named for its heading's id, missing a line of the skeleton, naming an entry that does not exist or amending one that never got its blockquote; a pointer to a record that does not resolve, a bare path included | `check:register:records`, at push and in CI, over every tracked text file; `check:register:records:selftest` holds each refusal | the header of `scripts/check-register-records.mjs`; `docs/decisions.md` § How an entry is written |
| Work tracked in a checklist or a status table, an issue that does not say where its work lands, a found issue that does not say what kind of file it would change or, filed since D-06, which stage found it, or an issue of a type the rubric does not describe | The issue: `beads:check`, at push, refuses an open issue with no `repo:` label; an open issue filed `discovered-from` with no label `assetLabels` in `tools/policy/vocabulary.json` lists or, if created since the instant `foundAtLabelsSince` there names, none that `foundAtLabels` lists; and an open issue whose type no row of `issueTypes` there names. `beads:selftest` holds each refusal. Its priority: review alone, because no check can tell which row of `issuePriorities` fits. The checklist or status table: review alone, because no gate scans a file for one | `CLAUDE.md` § The task store |
| A generated artifact left stale after its input moved | Each emitter's `:check` twin, which re-derives the artifact and diffs it, at push and in CI | `CLAUDE.md` § The script suffix contract |
| A pre-push job skipped on the push that changed one of its inputs, because its glob misses it | Nothing refuses it. `mise run harness` reports each job whose glob misses a module its entry imports, a pinned package's manifest or lockfile, a file it reads from the checkout, a script it launches or a generated file its check compares, and the gates nothing runs, for a person to act on; `harness:selftest` holds each kind | the header of `tools/harness/harness.ts`; `git-hooks.yml`'s rule for a glob; `docs/decisions.md` § D-26 |
| A co-change map read through a commit the trunk never had, or one its emitter or policy no longer writes | `coupling:check`, at push and in CI, re-derives the map through the trunk commit it records and refuses a difference, and a commit off `origin/main`'s first-parent chain; `coupling:selftest` holds each refusal | the header of `tools/coupling/coupling.ts`; `docs/decisions.md` § D-24 |
| A high-risk pull request merged without a person | `.github/workflows/pr-review.yml` approves only a head off the floor, deciding through `scripts/pr-review.mjs`, and the trunk's ruleset holds auto-merge to one approving review; `scripts/hooks/guard-git.mjs` refuses a session's `gh pr review --approve`; `pr-review:check` and `pr-review:selftest` hold the reviewer's wiring and its decisions | `CLAUDE.md` § Git workflow |
| A pull request merged without being held to the issue it carries | The `branch-reviewer` agent `open-pr` § 5 runs before each push; nothing in CI, which judges only the floor (`docs/decisions.md` § D-37) | `.claude/skills/open-pr/SKILL.md` § 5. Push and open it |
| A program that rewrites its own instructions from what it observed | The prompt reviewer only opens a pull request; one that touches the high-risk floor, as a word budget does, waits for a person, and its skeptics and stored cases judge its edits first | `CLAUDE.md` § A program proposes; only a person promotes |
| A prompt no run loads, carried unnoticed in every session's words; two readers of the prompt review's lines in the tracker that disagree on what is pending or held; a held finding no line ever ends, which every review reads and holds again; a review's edit that did not hold, which nothing counts | Nothing refuses any. `prompt-runs` parses the lines in the one form its header gives, fails on one that does not parse, and prints the pending, the held and which a closed line ends. It prints each fix a merged review carried, with whether a later run showed it again, and each prompt's loads over the window and, at its floor, the prompts no analysed run loaded, for a person to consider retiring; `close-prompt-run` and the prompt reviewer read what it prints. `prompt-runs:selftest` holds it | the header of `scripts/prompt-runs.mjs`; the load and fix-recurrence metrics in `count-index.md` § Rates and metrics |
| A prompt, a response or a tool's output from a run's Langfuse trace reaching the public tracker or the prompt review's pull request; a Langfuse key sent to another host or held by code no person reviews; a session's work after its analysis counted as the run's | `prompt-runs:figures` asks Langfuse for no field group that holds an observation's text, keeps no field it does not count and prints a tool name or usage key only of an identifier's shape; it refuses a policy naming `io` or `metadata`, a base URL that is not https, and a path that would resolve to another host; it runs nothing, reading the pending analyses from a file `prompt-runs` wrote in a step with no key, and ends each run's window at its analysis. `prompt-runs:figures:selftest` holds each, with a canary in every text field. The high-risk floor holds the script and the `langfuse*` keys to a person | the header of `scripts/prompt-run-figures.mjs`; `docs/decisions/asdlc-openspec-ic9h.md` § Decision |
| A prompt edit that changes what a prompt has a session write, such as an explanation that drops the caveat it was asked to keep, which a forced choice cannot see | Nothing refuses it. `review-prompts.js` answers each prose case of a changed file with the old text and the new and returns the answers sealed; `prompt-review:grade` asks TypeSafe whether each answer does what the case expects, and the review's pull request lists the counts for the person who merges. `workflows:selftest` holds both, over a stubbed judge | the header of `scripts/grade-prose-cases.mjs`; `docs/decisions/asdlc-openspec-1kie.md` § Decision |
| A recurring prompt-review finding counted from one again because a review keyed it under a new name | `prompt-review:match` asks TypeSafe whether each new finding is one a held line keys, and `review-prompts.js` refuses a finding whose key or count the answer that decided it does not bear out; `prompt-review:match:selftest` and `workflows:selftest` hold both. Nothing refuses a session that copies an answer wrong without contradicting the key or the count | the header of `scripts/match-held-findings.mjs`; `.claude/agents/continuous-prompt-improvement.md` § 3 |
| A chained shell command whose failing step cannot be told apart, or a workaround for a refused command | Convention: a refused command is dropped, run once in the prescribed form or through a dedicated tool when only its form was refused, asked of the user with `!` when later work needs it, or listed in a `RUN THESE YOURSELF` block at the end of the agent's report, each line saying why and what to expect; nothing refuses a workaround | `CLAUDE.md` § Bash command style and § Guards |
| A local code graph whose document layer is eroded, or a partial one reported as built | `scripts/code-graph.mjs` builds with `graphify extract`, never `update`, stamps what a language model produced, and exits 1 on graphify's partial-extraction warnings; the `code-graph` skill tells a session never to run graphify's eroding commands, and `scripts/hooks/guard-git.mjs` refuses a session's `graphify update`, `watch`, `hook install` or `claude install`, from any checkout; nothing refuses graphify behind a launcher or a shell word such as `nohup`, its library called through `python -c`, `graphify install --project`, or anything outside a session | `docs/decisions.md` § D-20 |

Every script opens with a header saying what it checks, **the failure it exists to prevent**, how
to invoke it and what it needs, so read the header before weakening a gate that is in your way.
Every decision nobody should re-argue is an entry in the register, amended and never rewritten: a
numbered one in `docs/decisions.md`, frozen at D-59, or a record of its own under `docs/decisions/`.

## Setup

Numbered per platform. Every step is a command to run or a file to write, in order; a step that
does not apply to your platform is absent from its list, not marked optional.

<!-- kit 3.1-5 · ADAPT: these are the steps the kit's own files need. Add yours (a second checkout,
     a token, a toolchain) at the position where a fresh machine needs them, on every platform's
     list, and re-run the lists on a fresh machine before trusting them. Every item is written
     `1.` so each list stays numbered for any selection of the kit; number them literally once
     yours are settled. Delete this comment when done. -->

### macOS and Linux

1. Install Git 2.54.0 or newer, the first that runs the config-based hooks this repository installs,
   and mise: `brew install mise`, or `curl https://mise.run | sh`. Check that `mise --version`
   answers with a release no older than the `min_version` in `mise.toml`. mise installs every other
   tool at the version `mise.toml` pins (`docs/decisions.md` § D-31).
1. Put mise's shims first on the `PATH` that every process inherits, after every line that puts
   another directory first. Make `export PATH="$HOME/.local/share/mise/shims:$PATH"` the last line
   of `~/.zprofile` and of `~/.zshrc` under zsh. Under bash, make it the last line of
   `~/.bash_profile` (or `~/.profile` where there is none) and of `~/.bashrc`. In PowerShell, make
   `$env:PATH = "$HOME/.local/share/mise/shims:$env:PATH"` the last line of `$PROFILE`. A line in
   `~/.zshenv` is not enough: a login zsh reads `~/.zprofile` after it, and Homebrew's
   `brew shellenv` there puts its own directory back in front. A login bash skips `~/.profile` when
   `~/.bash_profile` exists. Open a new terminal, and check that `sh -c 'command -v node'` prints a
   path under `~/.local/share/mise/shims`. Any other path means another directory still comes
   first. Git's hooks and Claude Code's hooks run a bare `node`. Without the shims they find another
   Node or none, and Claude Code's guard hooks stop guarding in silence. Then check that
   `sh -c 'command -v mise'` prints a path as well. The shims hold the tools mise installs, not mise
   itself, and Git's pre-push gates and Claude Code's Stop and SubagentStop hooks run
   `mise run <task>`: with no `mise` on the `PATH`, each exits 127. If the check prints nothing, put
   mise's own directory after the shims in the same line. `curl https://mise.run | sh` installs
   mise in `~/.local/bin` and adds nothing to the `PATH`, so there the line reads
   `export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"`, or
   `$env:PATH = "$HOME/.local/share/mise/shims:$HOME/.local/bin:$env:PATH"` in PowerShell.
1. Clone, then run `mise trust` and `mise install` in the clone. The trust is needed because
   `mise.toml` carries a setting, and a linked worktree shares it. The install fetches Node, Python
   3, `bd`, `gh`, Vale and uv from `mise.lock`, each download checked against its checksum, and
   graphify with its dependencies at the versions and hashes its uv lock under `.mise/locks/`
   records. Vale is the
   prose linter the `vale@agent-tools` plugin in `.claude/settings.json` runs on every edit of
   prose; without it, the plugin's hook exits in silence. Check that `node -v` and `bd --version`
   answer with the versions `mise.toml` pins.
1. Run `npm ci` in the clone. Its `prepare` step writes the git hooks into the clone's config, and
   refuses a Git older than 2.54.0; if your package manager blocks install scripts, run
   `mise run hooks:install` once.
1. Run `vale sync` in the clone. It downloads the styles `.vale.ini` names into the directory its
   `StylesPath` names, where git ignores all but `Layout`, the style this repository tracks, and it
   needs the network. Then check that `vale ls-config`
   loads: until the sync, it stops with E201, and the hook answers every edit with the same error. A
   worktree cut by `scripts/new-worktree.sh` copies these styles from this checkout.
1. Set `sync.remote` in `.beads/config.yaml` if it still holds a placeholder (`<protocol>` is
   `git+https` or `git+ssh`), run `chmod 700 .beads` (git does not carry the mode, and `bd` warns
   on every command without it) and `git config beads.role maintainer` (`contributor` on a fork;
   git config is per clone, so no tracked file can set it), then `bd bootstrap`. Never `bd init`:
   it creates a new tracker instead of hydrating this one, and takes over the git hooks directory.
1. With Claude Code installed, register the marketplaces of the two plugins `.claude/settings.json`
   enables, then install each plugin for this clone. Run these in the clone, after the steps above
   have installed `bd` and Vale, because the beads plugin's hook runs `bd prime`:

   ```sh
   claude plugin marketplace add gastownhall/beads
   claude plugin marketplace add vale-cli/agent-tools
   claude plugin install beads@beads-marketplace --scope project
   claude plugin install vale@agent-tools --scope project
   ```

   The marketplaces are declared in your own user settings, and each install record names this
   clone's path. An enabled plugin loads only with both, and only `/plugin` says when one is
   missing: the beads plugin's hooks, skills and agent, and the Vale plugin's hook, then never run.
   Check that `claude plugin list` shows both plugins, enabled, at project scope. If `/plugin` later
   reports a plugin "not cached", its install record is gone: run that plugin's install again.
1. Run `mise run gates` and read a green suite before the first change. It refuses a clone whose
   hooks are not installed (`CLAUDE.md` § The gate ladder).

### Windows, native

1. Install Git 2.54.0 or newer, and mise with `winget install -e --id jdx.mise`. Check that
   `mise --version` answers with a release no older than the `min_version` in `mise.toml`. None of
   this list has been run on Windows here (`asdlc-openspec-8juz.9`).
1. Put `%LOCALAPPDATA%\mise\shims` first on your user `PATH`, in System Properties under
   Environment Variables. Open a new shell, and check that `Get-Command node` names a path in it.
   Git's hooks and Claude Code's hooks run a bare `node`, and mise's shims there are `.exe` files.
   Then check that `Get-Command mise` names a path as well. The shims hold the tools mise installs,
   not mise itself, and Git's pre-push gates and Claude Code's Stop and SubagentStop hooks run
   `mise run <task>`. If the check names none, add the directory that holds `mise.exe` to the same
   `PATH`, after the shims.
1. Clone, then run `mise trust` and `mise install` in the clone, as step 3 of macOS and Linux says.
   Check that `node -v` and `bd --version` answer from the shell you will work in.
1. Run `npm ci` in the clone. If install scripts are blocked, run `mise run hooks:install` once.
1. Run `vale sync` in the clone, then check that `vale ls-config` loads, as step 5 of macOS and
   Linux says.
1. Set `sync.remote` in `.beads/config.yaml` if it still holds a placeholder (`<protocol>` is
   `git+https` or `git+ssh`), run `git config beads.role maintainer` (`contributor` on a fork),
   then `bd bootstrap`. Never `bd init`.
1. Register the two plugin marketplaces, install both plugins for this clone and check
   `claude plugin list`, as step 7 of macOS and Linux says.
1. Run `mise run gates` and read a green suite before the first change.

A clone that is built on Windows is not also built from Linux (a container, WSL): `node_modules`
holds platform-native binaries. Use one clone per platform.

### Dev container

An agent session in the container acts as the agents' GitHub App and holds none of your logins
(`docs/decisions.md` § D-51). Of your other credentials it holds only your TypeSafe key, and only
once you set it (`docs/decisions/asdlc-openspec-llbi.md` § Decision).

1. Install the Dev Containers CLI: `npm install -g @devcontainers/cli`. Start the container with it,
   not with VS Code's "Reopen in Container", which brings your git credentials and SSH agent in.
1. Put the App's private key, alone, in `~/.asdlc-agent-j/` on the host, as
   `.devcontainer/README.md` § Giving it the App's key says. The directory must exist, even empty,
   or Docker does not start the container.
1. Run `devcontainer up --workspace-folder <clone>`, naming any clone, the one your sessions on the
   host use included. The folder supplies only the configuration and the build's context: the
   container mounts no host checkout and clones the repository into a volume of its own at its
   first start (`docs/decisions.md` § D-54). For a clone that already has a container from before
   that, add `--remove-existing-container`: `devcontainer up` starts an existing container, stopped
   ones included, with the mounts it was made with, the bind-mounted checkout among them.
   `docker ps -a --filter label=devcontainer.local_folder=<the clone's absolute path>` lists it;
   without `-a`, a stopped one does not show.
1. Wait for the first build, which installs every tool `mise.toml` pins from `mise.lock`.
   `.devcontainer/entrypoint.sh` then runs the install, the git hooks, the tracker's mode and role
   that step 6 of macOS and Linux sets, and the tracker's hydration on every start, registers each
   plugin marketplace and installs each plugin for the clone where one is missing, sets the App's
   bot account as git's commit identity where none is set, and warns rather than fails; read its
   output once (`docker logs` on the container shows it). If it warns that a tool `mise.toml` pins
   is missing from the image, rebuild the container; if it warns that the GitHub App could not mint
   a token, fix the key and start again.
1. So that the container's sessions can call TypeSafe, set `DEVCONTAINER_TYPESAFE_API_KEY` to your
   key in the shell you run `devcontainer exec` from, as `.devcontainer/README.md` § TypeSafe's key
   says. Without it, each tool that calls TypeSafe skips there and says why.
1. Run `devcontainer exec --workspace-folder <clone> claude`, and log in once: Claude Code keeps its
   state in a volume of the container's own.
1. If it warned that Vale cannot load `.vale.ini`, run `vale sync` once in the container, then check
   that `vale ls-config` loads. The image carries every tool `mise.toml` pins; the styles land in the
   clone, so a rebuild keeps them.
1. Check that `claude plugin list` in the container's clone shows both plugins, enabled, at project
   scope. If the entrypoint warned that it could not add a marketplace or install a plugin, run the
   command its warning names.
1. Run `mise run gates` and read a green suite before the first change.

`.devcontainer/README.md` has the reasons, what the container no longer shares, and how `git` and
`gh` act as the App.

### The Node floor, on every platform

`package.json` `engines` is the oldest Node the repository supports. It starts at the version
`mise.toml` pins for every machine, so every gate runs the floor (`docs/decisions.md` § D-34),
until a bump of the pin leaves the floor below it. The floor is never below the lowest version on
its major line that every package in `package-lock.json` accepts, or a dependency refuses a Node
the floor calls enough. `mise run check:node-floor` prints that version beside the floor, from the
clone, and refuses a floor below it; raise `engines` when it does (the floor may sit above). It
refuses a range form it cannot read rather than skip it, and the header of
`scripts/check-node-floor.mjs` lists the forms it reads. It runs at push whenever `package.json`,
the lockfile or the gate changes, and in CI on every pull request and push to `main`, so a
lockfile change that lifts that version above the floor is refused on the push that makes it.

## Working here

<!-- kit 3.1-5 · ADAPT: one row per thing a person does here, and the skill, agent, command or
     script that does it. The kit lists what it laid down; add yours as they appear, and delete a
     row whose tool you retire. Delete this comment when done. -->

| To do this | Use this | Notes |
|---|---|---|
| See what is ready to be worked | `bd ready` | The queue. There is no status table anywhere else, by rule. |
| Change the harness, or fix the product without changing a requirement | the `bead` skill | Verifies the issue's premise first, then claims, implements, gates, opens the pull request and closes the issue once it merges. |
| Change what the product does | the `change-*` skills, in order: `change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify`, `change-finalize` | One worktree, one pull request and one `bd` epic per change. The proposal and the delta specs are reviewed before any code is written, and the archive merges them into the living spec under `openspec/` before the merge. |
| Run the calculator on your machine | `npm run calculator:serve` | It prints the URL to open, on `127.0.0.1` only, and serves until Ctrl-C. Set `PORT` to serve on another port, such as when its default is taken. |
| Have agents work the ready issues in parallel | the `fan-out-work` agent, as the session itself: `claude --agent fan-out-work`, or ask a session to fan out | The session is the dispatcher, never an agent it launches. One fresh agent per lane, each in its own worktree, integrated on the dispatcher's branch. |
| Think a topic through, or research it, before changing anything | the `explore` skill | A conversation that draws in ASCII, cites its sources and changes nothing. Asked for a brief, it lists its guesses first, then an inventory of evidence with no recommendations; `change-propose` commits the brief as `findings.md` (`docs/decisions.md` § D-30). |
| Decide whether to bring a tool or a pattern into the harness | the `should-i-adopt` skill | Looks for a prior decision first, tries the candidate against this repository's rules in Docker only, and files a decision brief for a person to choose from. It changes no tracked file. |
| Have the last reply, or one term, explained in plain words | the `eli5` skill | It supplies the missing background and changes nothing; the original's facts and caveats survive exactly. |
| Draft what a person must do for an issue an agent cannot finish | the `human-plan` skill | |
| Retire a file | the `retire-asset` skill | A register decision with a checklist, not a tidy-up. |
| Add, rename or remove a task | the `add-task` skill | It keeps the task's `description`, § The tasks below, the hook runner and CI in step. |
| Make a worktree by hand | `scripts/new-worktree.sh <task-ref> <slug>` | From the primary checkout. It cuts `agent/<name>` from `origin/main`; `npm ci` is the first command inside. |
| Check your work before a pull request | `mise run gates` | Then fetch, rebase onto `origin/main`, and run it again if the rebase moved the branch. |
| Find why a gate, test, proof or CI job fails, before fixing it | the `root-cause` skill | Reproduces the failure alone, tests one hypothesis at a time and notes each refuted one on the issue, sees a case fail before the fix, and stops for a person after `rootCauseMaxFixes` fixes that failed (`tools/policy/agent-workflows.json`). `bead`, `change-build` and `open-pr` send a session to it where a failure's cause is not yet known. Adapted from obra/superpowers' `systematic-debugging`, whose license sits beside it. |
| Open a pull request | the `open-pr` skill | Tests the merge against the open pull requests, ends the title with the ids of the issues carried, reviews the branch with the `branch-reviewer` agent before the push, watches the checks with one watcher, and says what each outcome of `verify` and the reviewer asks, enabling auto-merge once `verify` passes and the reviewer has approved. It then waits for the merge with `scripts/pr-review.mjs wait`, and removes the worktree and branch. Every other skill and agent that opens a pull request opens it with this one. |
| Close a run of a prompt | the `close-prompt-run` skill | Leaves the run's analysis as a note in the tracker and, when enough are pending or the oldest is old enough, launches the reviewer in the background under a name of its own, without waiting for it. |
| Improve a prompt after running it | the `continuous-prompt-improvement` agent | Launched by the `close-prompt-run` skill (`CLAUDE.md` § Prompt reviews). One review reads every pending analysis, one agent per prompt file; what they change is one pull request, whose description is the review. An edit that turns a stored choice case of its prompt from right to wrong stays out of it, and a prose case's grades are listed in it for the person who merges (`.claude/prompt-cases/README.md`). |
| Get a pull request reviewed and merged | nothing: `.github/workflows/pr-review.yml` reviews each pushed head, and `open-pr` enables auto-merge once it has approved and `verify` passes | GitHub merges one off the high-risk floor (`prReviewHighRisk*` in `tools/policy/pr-review.json`) once `verify` passes too. A review that did not complete is run again by the maintainer, with the `gh run rerun <run> --failed` that `open-pr` hands them, since the App sessions act as cannot. |
| Merge a pull request the reviewer left to a person | approve it, and merge it or enable auto-merge | A person only, never an agent (`CLAUDE.md` § Git workflow). |
| Check a pull request, report or analysis before trusting it | the `adversarial-verifier` agent | Pass it the pull request number or file path. Every claim is re-derived from source; it reports a verdict table and changes nothing. `change-propose`, `change-design` and `change-plan` run it on what each wrote, before each stops for review (`docs/decisions.md` § D-39). |
| Ask how parts of the repository connect | the `code-graph` skill, through the `graphify` MCP server | Each person builds the graph: `mise install`, step 3 of § Setup, installs the graphify release `mise.toml` pins, with its MCP extra; then run `mise run code-graph` from any checkout. It builds into the primary checkout and registers the server for it and its worktrees. A first build sends every document to the model `graphifyClaudeCliModel` names, on your own Claude plan; later builds send only what changed (`docs/decisions.md` § D-20). |

## The tasks

Every task in `tasks.toml` is run with `mise run <name>`, and its `description` there says what it
does and what breaks without it: `mise tasks ls` lists each beside its name, and
`mise tasks info <name>` prints one whole. Where a description and the header of the script its task
runs disagree, the header wins. A name of the form `<group>:<verb>` is public: the bare name writes
the artifact, `:check` re-derives it and writes nothing, `:selftest` proves the gate refuses what it
should (`CLAUDE.md` § The script suffix contract). The table gives the tier each task runs at, read
off `git-hooks.yml` and `.github/workflows/verify.yml`; where it disagrees with them, they win.

`calculator:serve` is not a task of `tasks.toml`: `package.json` keeps it beside `prepare`, and
`npm run calculator:serve` runs it (`docs/decisions.md` § D-36), so it has no `description` to say
what it does. It serves the calculator page on `127.0.0.1` alone, at the port `PORT` names or at the
default `apps/calculator/serve.js` holds, and prints the URL; it runs until Ctrl-C, and a port in use
or an invalid `PORT` is refused in one line. Without it the calculator can be tested but not used.
No job runs it, since it never returns: `calculator:test` runs the same file and proves what it
does.

<!-- kit 3.1-5 · ADAPT: one row per task, kept in step with `tasks.toml` by the add-task
     skill where you took it. The kit lists the tasks it laid down. Delete this comment when
     done. -->

| Task | Gate |
|---|---|
| `beads:check` | pre-push |
| `beads:selftest` | pre-push + CI |
| `calculator:test` | pre-push + CI |
| `calculator:test:independent` | pre-push + CI |
| `calculator:test:verify` | |
| `check:jobs` | pre-push + CI |
| `check:jobs:selftest` | pre-push + CI |
| `check:node-floor` | pre-push + CI |
| `check:node-floor:selftest` | pre-push + CI |
| `check:policy` | pre-push + CI |
| `check:policy:selftest` | pre-push + CI |
| `check:prompts` | pre-push + CI |
| `check:prompts:selftest` | pre-push + CI |
| `check:register` | pre-push + CI |
| `check:register:selftest` | pre-push + CI |
| `check:register:records` | pre-push + CI |
| `check:register:records:selftest` | pre-push + CI |
| `check:toolchain` | pre-push + CI |
| `check:toolchain:selftest` | pre-push + CI |
| `citations:check` | pre-push + CI |
| `citations:selftest` | pre-push + CI |
| `citations:support` | |
| `citations:support:selftest` | pre-push + CI |
| `code-graph` | |
| `code-graph:mcp` | |
| `code-graph:selftest` | pre-push + CI |
| `counts:check` | pre-push + CI |
| `counts:selftest` | pre-push + CI |
| `coupling` | |
| `coupling:check` | pre-push + CI |
| `coupling:selftest` | pre-push + CI |
| `coupling:update` | |
| `gate-summary:selftest` | pre-push + CI |
| `gates` | |
| `github-app-token:selftest` | pre-push + CI |
| `harness` | |
| `harness:graph` | |
| `harness:selftest` | pre-push + CI |
| `hooks:install` | |
| `hooks:selftest` | pre-push + CI |
| `openspec:check` | pre-push + CI |
| `openspec:selftest` | pre-push + CI |
| `pr-review:check` | pre-push + CI |
| `pr-review:selftest` | pre-push + CI |
| `prompt-review:grade` | |
| `prompt-review:match` | |
| `prompt-review:match:selftest` | pre-push + CI |
| `prompt-runs` | |
| `prompt-runs:figures` | |
| `prompt-runs:figures:selftest` | pre-push + CI |
| `prompt-runs:selftest` | pre-push + CI |
| `prompts:incidents` | |
| `prompts:incidents:selftest` | pre-push + CI |
| `tests:fresh` | |
| `tests:fresh:selftest` | pre-push + CI |
| `tests:inventory:check` | pre-push + CI |
| `tests:inventory:selftest` | pre-push + CI |
| `tests:selftest` | pre-push + CI |
| `tests:trace:selftest` | pre-push + CI |
| `thresholds:check` | pre-push + CI |
| `thresholds:commands:check` | CI |
| `thresholds:selftest` | pre-push + CI |
| `thresholds:update` | |
| `trace` | |
| `trace:check` | pre-push + CI |
| `trace:clauses` | |
| `trace:clauses:selftest` | pre-push + CI |
| `trace:selftest` | pre-push + CI |
| `trace:update` | |
| `vale:selftest` | pre-push + CI |
| `workflows:selftest` | pre-push + CI |
| `worktree:gc` | |
| `worktree:selftest` | pre-push |

## The work, and what its runs leave behind

The **work** is what this repository does to a **work item**, one unit of the queue; a **run** is one
execution of the work on one item. What the work is, and how a run is started, is this repository's
own to say here.

A run leaves behind its commits and pull request, and an issue in `bd` for each defect it found
outside its own files, linked `discovered-from` the issue or epic it ran on. Each of those issues
carries one or more of the labels `assetLabels` in `tools/policy/vocabulary.json` lists, one per kind
of file it would change, so `bd count --by-label` shows which kind keeps needing a fix after a run.
A defect an issue already carries is not filed again: the run notes that issue and raises its count
label, `seenLabelPrefix` in the same file, so how often a cost recurs shows on the issue itself. It
is filed afresh as well only when that issue closed as done and the defect is back. It
also leaves its analysis of itself as a note on the issue it worked, and the prompts that ran are
reviewed from those notes in batches, as `.claude/skills/close-prompt-run/SKILL.md` says. A program
proposes, and only a person promotes (`CLAUDE.md` § A program proposes; only a person promotes).

## Where to read next

| Path | What it is |
|---|---|
| `CLAUDE.md` | Read first. The only home for a rule an agent must follow here. |
| `docs/README.md` | The documentation index, and the conventions every document follows. |
| `docs/decisions.md` | The register's numbered decisions and risks, frozen at D-59. The register wins a disagreement with any document. |
| `docs/decisions/` | The register's decisions and risks after D-59, a record each. |
| `docs/playbook.md` | The route one issue takes to the trunk, step by step, each step naming the file or command that decides it. |
| `docs/plain-language-guide.md` | How work gets done here, for a reader who runs nothing. |
| `docs/test-strategy.md` | The agentic test strategy the change process adopts, as supplied, with the register's amendments marked. |
| `CONTEXT.md` | The glossary of the words this repository gives a meaning of its own. |
| `count-index.md` | Every count describing the current measured state, under a key. |
| `scripts/README.md` | The single-file gates and git-job scripts, one row each. |
| `scripts/hooks/README.md` | The Claude Code hooks, one row each. |
| `.github/workflows/README.md` | The CI workflow and the pull-request reviewer, one row each. |
| `tools/README.md` | The emitters and multi-file checks, one row each. |
| `apps/calculator/README.md` | The calculator demo app: what each file and directory holds, and which specs win over it. |
| `.claude/README.md` | What Claude Code loads when a session starts here. |
| `.devcontainer/README.md` | The dev container: what it shares with the host and what it no longer does, the App it acts as, and how to start it. |
| `KIT-CHECKLIST.md` | What the kit laid down, and what is still to adapt. |

## What runs automatically

Nothing here needs remembering: each row fires on its trigger. The third column is the file that
wires it, and where this table and that file disagree, the file wins and the row is corrected.
Every pre-push job with a glob also runs on a push that changes `tasks.toml`, which holds its
command, whether or not its row names that file. The settings file registers `CNT-HOOKS` session
hooks, and a running session picks up a hook added to it with no restart
(`.claude/README.md` § The hooks).

<!-- kit 3.1-5 · WRITE: one row per hook, job or workflow, added in the same change as its wiring.
     The kit lists only what it wired. -->

| Trigger | Effect | Wired in |
|---|---|---|
| `npm ci` | `package.json`'s `prepare` runs `scripts/git-hooks.mjs --install`, unless `CI` is set: it writes the five `hook.asdlc-*` entries into the repository's config, which run the git hooks below, and removes lefthook's shims from `.git/hooks`. It refuses a Git older than 2.54.0. | `package.json` (`prepare`) |
| `git commit`, `git checkout`, `git merge`, `git push` | `scripts/git-hooks.mjs` runs the event's jobs from `git-hooks.yml`, those whose globs match the staged or pushed files and every one with no glob, and prints one line per job, the jobs it skipped and a total. | the repository's config (`hook.asdlc-*`, from `mise run hooks:install`) |
| A session is about to run a Bash command | `scripts/hooks/guard-git.mjs` refuses, from a linked worktree, a git command against a protected branch or the worktree registry; any git command in what a removed worktree leaves under `.claude/worktrees/`, where git would act on the primary checkout; and from any checkout, a `gh pr create` that does not name `main` as its base, a `gh pr review --approve`, which is a person's, and a `gh pr merge --admin`, which merges past the required checks. From any checkout it also refuses a `git worktree prune` that is not a dry run, and graphify's `update`, `watch`, `hook install` and `claude install`, which erode the local code graph or write graphify's advice to run `update` into `CLAUDE.md`. Beside it, `scripts/hooks/guard-unprovisioned-worktree.mjs` refuses every command in a worktree `scripts/new-worktree.sh` did not provision. | `.claude/settings.json` (`PreToolUse`) |
| A session is about to write or edit a file | `scripts/hooks/block-generated-edit.mjs` refuses an edit to generated output and names where the change belongs. `scripts/hooks/guard-workflow-edit.mjs` refuses an edit that would let a workflow other than the reviewer's approve a pull request or pass `verify`. | `.claude/settings.json` (`PreToolUse`) |
| A session has written or edited a prose file | The `vale@agent-tools` plugin's hook runs Vale over the whole file and hands back its error-level alerts, the `Layout` style's among them. It is silent where `vale` is not installed, and where the plugin is not: `claude plugin list` shows whether it is. | `.claude/settings.json` (`enabledPlugins`) |
| A session stops | `scripts/hooks/gate-summary.mjs` runs the fastest gates over the session's checkout, untracked files included, and prints one verdict line. It never blocks the stop. | `.claude/settings.json` (`Stop`) |
| A subagent stops | The same hook, over the checkout the subagent worked in, with a verdict that says it is a subagent's. | `.claude/settings.json` (`SubagentStop`) |
| Claude Code creates a worktree | `scripts/hooks/worktree-create.mjs` provisions it through `scripts/new-worktree.sh`: `agent/<name>` off `origin/main`, with a rendered briefing. | `.claude/settings.json` (`WorktreeCreate`) |
| Claude Code removes a worktree | `scripts/hooks/worktree-remove.mjs` removes the checkout, keeps the branch, and sweeps merged agent branches. | `.claude/settings.json` (`WorktreeRemove`) |
| `git commit`, with a staged path under `artifacts/` | `scripts/assert-not-hand-edited.mjs` refuses a generated file that no longer matches its generator. | `git-hooks.yml` (`pre-commit`) |
| `git commit`, `git checkout`, `git merge`, `git push` | The tracker's own git hooks, as jobs of the hook runner rather than a section `bd hooks install` writes into `.git/hooks`, which would run them twice. | `git-hooks.yml` (`pre-commit`, `prepare-commit-msg`, `post-checkout`, `post-merge`, `pre-push`) |
| `git push` | `beads:check` holds the open issues to the label, type and identifier rules. It reads the tracker's database, so it is not a `.github/workflows/verify.yml` step. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/check-beads.mjs`, `tools/policy/`, `tools/lib/policy.ts` or `tools/lib/bd-launcher.ts` | `beads:selftest`: `beads:check`'s refusals of an issue with no `repo:` label, of a found issue with no label `assetLabels` lists, of a found issue filed since `foundAtLabelsSince` that carries no label `foundAtLabels` lists and of an issue whose type no row of `issueTypes` names, over a fixture export, each asserting its reason. It runs no `bd`, so it is a `.github/workflows/verify.yml` step as well. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/git-hooks.mjs`, `git-hooks.yml`, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts`, `package.json` or the lockfile | `hooks:selftest`: the hook runner's refusals of a key, token or event it does not read and of a policy without its cap, each asserting its reason, and commits, pushes, a linked worktree, the install, `mise run gates`, an older Git and a signal through real Git in scratch repositories. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tasks.toml`, `mise.toml`, `package.json`, the lockfile, `git-hooks.yml`, `.github/workflows/verify.yml`, or anything under `tools/`, `scripts/` or `apps/`, the gate among them | `check:jobs` and its selftest: every job names a task that exists in the registry its launcher reads; every task no job runs is declared, and no declaration is stale or of the wrong kind; every `tools/`, `scripts/` or `apps/` path a task names exists as spelled, case included; every glob a task names matches a file; and the tasks have one registry. Every check task has a selftest task of its name, or one its exceptions name. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a skill, an agent, a workflow, `CLAUDE.md`, `AGENTS.md`, the worktree briefing template, `.beads/PRIME.md`, `tools/policy/`, `tools/lib/policy.ts` or the gate | `check:prompts`: every skill and agent opens with the line `CLAUDE.md` requires, and every prompt is within its word budget; `check:prompts:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/prompt-incidents.mjs`, `scripts/check-prompts.mjs`, `tools/lib/`, `tools/policy/`, `package.json` or the lockfile | `prompts:incidents:selftest`: the prompt-incident advisory over a stubbed judge. The advisory itself reads a token and the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a mise config, `mise.lock` or a uv lock under `.mise/locks/`, a workflow, the Dockerfile or its ignore file, a version file at the root, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts`, the gate, the task loader, `package.json` or the lockfile | `check:toolchain`: every pin exact and in the lockfile for every platform the policy names, one mise for CI and the dev container, no second home, and no mise config but `mise.toml`; `check:toolchain:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `package.json`, the lockfile or the gate | `check:node-floor`: the floor in `engines` not below the lowest version on its major line that every locked package accepts, and every locked range one the gate reads; `check:node-floor:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/policy/`, `tools/policy.json`, `tools/lib/policy.ts` or the gate | `check:policy`: every policy record carries its header and a `Means` beside every constant, no key has two homes, the directory's README names each record, and the retired single file has not come back; `check:policy:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` | `citations:check`: every line and section pointer in every tracked text file resolves. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the citations gate, `tools/lib/`, `CLAUDE.md` or a prompt file | `citations:selftest`: the citations gate, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/citations/`, `tools/lib/`, `tools/policy/`, `package.json` or `package-lock.json` | `citations:support:selftest`: the citation-support advisory over a stubbed judge. The advisory itself reads a token and the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/match-held-findings.mjs`, `tools/lib/`, `tools/policy/`, `tasks.toml`, `package.json` or `package-lock.json` | `prompt-review:match:selftest`: the prompt review's match of new findings to held ones, over a fixture export and a stubbed judge. The match itself reads a token, the tracker and the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/prompt-runs.mjs`, `tools/lib/`, `tools/policy/`, `tasks.toml`, `package.json` or `package-lock.json` | `prompt-runs:selftest`: the parser of the prompt review's lines and its report, over fixture exports. The command itself reads the tracker, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/prompt-run-figures.mjs`, `scripts/prompt-runs.mjs`, `tools/lib/`, `tools/policy/`, `tasks.toml`, `package.json` or `package-lock.json` | `prompt-runs:figures:selftest`: the prompt runs' Langfuse figures, over a stub of Langfuse's API on loopback and a pending file `prompt-runs` writes from a fixture export. The command itself reads two projects' keys and Langfuse over the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/github-app-token.mjs`, `.devcontainer/gh`, `.devcontainer/git-credential-github-app`, `.devcontainer/Dockerfile`, `.devcontainer/entrypoint.sh`, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts` or `tasks.toml` | `github-app-token:selftest`: the dev container's GitHub App helper over a stub of GitHub's endpoint on loopback, the image's two wrappers through real `git` and `sh`, real `git` under the git config the Dockerfile writes, and the entrypoint's `commit_identity`, `tracing`, `statusline` and `clone` under bash. The helper itself reads the App's key and GitHub's API, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a hook, a worktree script, `.vale.ini` or `.gitignore` | `worktree:selftest`: the worktree hooks and the guard, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `.vale.ini`, `.vale-styles/Layout/` or its selftest | `vale:selftest`: the `Layout` style's rules over fixtures, and every styled section of `.vale.ini` applying it. It runs `vale`, which mise installs on the CI runner too, so it is a `.github/workflows/verify.yml` step as well. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a hook, the citations gate, `tools/lib/` or what `check:jobs` reads | `gate-summary:selftest`: the Stop hook's verdict over untracked and ignored files, and the checkout it gates; and the checkout the edit hook places an edit in. | `git-hooks.yml` (`pre-push`) |
| `git push` | `counts:check` re-derives every value in `count-index.md` from the source the index names for it; `counts:selftest` holds the gate to its fixtures when the gate changes. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the register, `CLAUDE.md` or the gate | `check:register` holds the register's header, summary table and dates to its entries, and its selftest holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` | `check:register:records`: each record under `docs/decisions/` named for its heading's id, whole, naming only entries that exist and carrying each amendment it makes, and every pointer to a record in a tracked text file resolved. It has no glob, since a pointer can be added to any file. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the register, its records, `CLAUDE.md`, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts` or the gate | `check:register:records:selftest`: the records gate over git work trees under the temporary directory, a control and a doctored copy per refusal. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `openspec/`, a skill, an agent, `tools/policy/`, `tools/lib/policy.ts`, the gate or the pinned CLI | `openspec:check` validates the living spec and every active change, proves each change applies, holds every scenario and NFR requirement to a unique ID that no archived change gave another title (never reused, within the limits the gate's header names), and holds every prompt that spells the change label to `tools/policy/vocabulary.json`; `openspec:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a workflow under `.claude/workflows/`, a tool-less agent (`.claude/agents/test-builder.md`, `prompt-case-author.md`, `prompt-case-answerer.md`), a stored case under `.claude/prompt-cases/`, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts`, `tools/lib/typesafe.ts`, the trace or verification-report renderers, the trace's clause check or the test reader it imports, `scripts/prompt-case-texts.mjs`, the prose cases' grader, its selftest, `package.json` or the lockfile | `workflows:selftest`: the change-build review workflow, the prompt review workflow, the prompt cases' authoring workflow and the change-verify trace workflow, run against stubbed agents with the policy's review sizes, red-first kinds, independent-test keys, prompt-review threshold, case lenses and repetitions, trace sizes, skeptic counts and clause threshold. Beside them run the trace's renderers on its result, the trace's clause run over the clause check's plan and a stubbed client, the verification report's renderers on a stubbed fresh run, every choice case through both prompt workflows and every prose case through the review, the prose cases' grader on the review's answers over a stubbed judge, the prompt workflows' readers for real in a fixture repository, and the tool-less agents' tools lines. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/judge-trace-clauses.mjs`, the trace or test reader it imports, `tools/lib/`, `tools/policy/`, `package.json` or the lockfile | `trace:clauses:selftest`: the trace's clause check over a fixture repository and a stubbed client. The check itself reads a token and the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/fresh-run.mjs`, the test runner, the reader, `scripts/lib/`'s test-dirs, tasks and bin-path helpers, the trace gate, `tools/lib/`, `tools/policy/`, `mise.toml`, `package.json` or the lockfile | `tests:fresh:selftest`: the verifier's fresh run over a fixture repository, `npm ci` stubbed, its tasks run through `mise run`, and a commit with no `tasks.toml` refused. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/code-graph.mjs`, `tools/lib/`, `tools/policy/`, `mise.toml`, `package.json` or the lockfile | `code-graph:selftest`: the code-graph script over a fixture repository, graphify, its MCP server, `claude` and `mise` stubbed. The script itself reads a language model and your plan, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/calculator/`, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `tasks.toml`, `package.json` or the lockfile | `calculator:test`: the calculator's scenarios, each a test named for its ID, under Node's own test runner, with no matched file allowed to declare none, every test's `// trace:` metadata read, and every test the runner reports held to the tests that reader sees. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/calculator/`, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `tasks.toml`, `package.json` or the lockfile | `calculator:test:independent`: the test-builder's contract tests and build-time fitness functions under `apps/calculator/test/independent/build/`, held as `calculator:test` holds the rest, and a pass that says so while there is none. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs` or `tools/policy/`, `tools/lib/policy.ts` | `tests:selftest`: the test runner, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `tests:trace:selftest`: the test-trace reader and its hash, negative-tested, with one archive by the pinned OpenSpec CLI. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `openspec/`, `apps/`, `artifacts/trace/`, the trace gate, `tools/lib/`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tasks.toml`, `package.json` or the lockfile | `trace:check`: the traceability record re-derived and diffed, and every rule the header of `tools/trace/trace.ts` holds, the ratchet baseline among them. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the trace gate, `tools/lib/`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `package.json` or the lockfile | `trace:selftest`: the trace gate, negative-tested over fixture repositories, with trial archives by the pinned OpenSpec CLI, whose count the job's comment in `git-hooks.yml` gives with its cost. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `artifacts/coupling/`, the co-change gate, `tools/lib/`, `tools/policy/`, `tasks.toml` or `package.json` | `coupling:check`: the co-change map re-derived through the trunk commit it records and diffed, that commit held to `origin/main`, and a note of how many pull requests landed after it. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the co-change gate, `tools/lib/`, `scripts/hooks/_shared.mjs`, `scripts/lib/tasks.mjs`, `tools/policy/` or `package.json` | `coupling:selftest`: the co-change gate, negative-tested over fixture repositories built from its ratified history. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/harness/`, `tools/lib/`, `scripts/lib/tasks.mjs`, `package.json` or the lockfile | `harness:selftest`: the harness assessment's core over fixture repositories and its graph half over fixture graphs. The two commands write a local report or read the local code graph, so they run in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` | `tests:inventory:check`: no test removed, skipped or weakened since the merge base with `origin/main` without an architect decision in a commit's trailer. It has no glob, since a push that only rewords a commit message can change its verdict. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/check-test-inventory.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/lib/git-env.ts`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `tests:inventory:selftest`: the test-inventory gate, negative-tested over doctored test files and fixture repositories. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/`, `artifacts/thresholds/`, the thresholds gate, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `tasks.toml`, `package.json` or the lockfile | `thresholds:check`: the changed code's coverage and its Routines' mutation score held to the policy's thresholds, and the ratchet baseline. The Commands' run is a `.github/workflows/verify.yml` step alone. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the thresholds gate, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `thresholds:selftest`: the thresholds gate, negative-tested over a fixture repository, with StrykerJS's tap and command runners. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes anything under `scripts/` or `tools/`, a workflow, the branch reviewer, `tasks.toml`, `package.json` or the lockfile | `pr-review:check`: the reviewer's workflow, agent and policy agree, no other workflow can approve or pass `verify`, and the floor covers every file the gates `prReviewFloorTasks` lists run and import and every policy key those files name, which it derives (`docs/decisions.md` § D-38). It holds `.github/workflows/verify.yml` to running each of those gates in a job where nothing off the floor runs first (`docs/decisions.md` § D-55); `pr-review:selftest`: its decisions over fixtures, and the check over doctored copies. | `git-hooks.yml` (`pre-push`) |
| A pull request, or a push to `main`, a merge among them | Every gate that reads only committed files, cheapest first. It trusts none of the faster tiers. | `.github/workflows/verify.yml` |
| A pull request against `main` opened, reopened, made ready for review or pushed to | The reviewer reviews that head from the floor alone, approving it or commenting that a person decides, with a token that writes pull requests and nothing else, and writes the reasons to the run's summary. GitHub's auto-merge merges a head that is approved and whose `verify` passes. | `.github/workflows/pr-review.yml` |
| The dev container starts | At the first start, the container's own clone, made in its volume; then `npm ci` when the lockfile moved, the git hooks, `.beads` at mode 700 and `beads.role` where none is set, the tracker's hydration, and the App's bot account as git's commit identity where none is set; each step warns and carries on. It warns, too, while a tool `mise.toml` pins is missing from the image, which it never installs; while Vale cannot load `.vale.ini`, though it runs no `vale sync`; and while the GitHub App cannot mint a token. | `.devcontainer/entrypoint.sh` |
| `git` or `gh` reaches GitHub in the dev container | `scripts/github-app-token.mjs` hands it a token of the agents' GitHub App, minting a fresh one once the kept one has less than `githubAppTokenRefreshSeconds` left, through the image's git credential helper and its `gh` wrapper. | `.devcontainer/Dockerfile` |

## What is still a placeholder

 A comment of the form `kit <section> · ADAPT` or `kit <section> · WRITE`, in any file, says what
  to write there and when to delete the comment. List the files that carry one with
  `git grep -l -E "kit [0-9.-]+ · (ADAPT|WRITE)"`.

## P.S.

This page describes and points; it holds no rule. The rules an agent follows are in `CLAUDE.md`.
The status of work is in `bd`, never here.
Where this page and a file it points at disagree, that file wins and this page is corrected.