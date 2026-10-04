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
	- open-pr: creates structured PR and waits for reviewer with guidance on how to reply
	- pr-reviewer: runs in CI, measures three dimensions (correctness, maintainability, blast radius). has threshold for auto-approval
- tools/policy/: conventions, definitions, configuration
- optional dev container for increased workload isolation

## Principles

**A person decides; agents propose and build.** A person reviews each change's proposal before its
build starts, decides whether each change a prompt review proposes merges, and approves every pull
request the reviewer judges high risk or cannot verify. Nothing a program proposes instructs an agent
until then (`CLAUDE.md` § A program proposes; only a person promotes). The rest merge through the
pull-request reviewer, one at a time, once each satisfies the issues it carries
(`docs/decisions.md` § D-07).

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
· [The npm scripts](#the-npm-scripts)
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
| `.beads/` | The configuration of `bd`, the issue tracker. Its database syncs through the git remote and is never committed; `bd bootstrap` hydrates it. `PRIME.md` is what `bd prime` prints in place of its own text when the tracker's plugin runs it at a session's start and before a compaction: it points at where each rule lives and states none. |
| `git-hooks.yml` | The git-hook tiers: which gate runs at commit and at push, each with the glob that scopes it and a note of its measured cost. `scripts/git-hooks.mjs` runs it, called by the five `hook.asdlc-*` entries `npm run hooks:install` writes into the repository's config. |
| `mise.toml`, `mise.lock` | The toolchain: every tool version the repository installs, and the lockfile that holds each one's download URL and checksum per platform. CI, the dev container and § Setup install from them (`docs/decisions.md` § D-31), and `npm run check:toolchain` holds them. |
| `.vale.ini`, `.vale-styles/Layout/` | The configuration of Vale, the prose linter the `vale@agent-tools` hook runs on each edit of prose, and `Layout`, the one style this repository writes itself. |
| `.github/workflows/verify.yml` | The slowest tier: every gate that reads only committed files, on every pull request and every push to `main`. |
| `.github/workflows/pr-review.yml` | The pull-request reviewer: one pull request at a time, Claude Code judges it against the issues its title cites, and it merges when every dimension passes and the risk is not high. |
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
- `graphify-out/`: the local code graph `npm run code-graph` builds, never committed
  (`docs/decisions.md` § D-20).

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
| A green run that ran nothing | `npm run gates` forces the full suite, and refuses a clone whose hooks are not installed; the hook runner names every job it skips; `check:jobs` refuses a gate no job runs unless it is declared, with its reason; `scripts/run-tests.mjs` fails a test run whose pattern matches no file or matches a file that declares no test | `CLAUDE.md` § The gate ladder |
| A test that does not say which IDs it proves, how, at which layer and level, or against which version of each artifact; or a test that runs and that a gate reading tests from source cannot see | `scripts/run-tests.mjs` reads every test file it runs through `scripts/test-trace.mjs`, fails the run on metadata that reader refuses, and fails it on any test that reader and Node's runner do not both see; `tests:selftest` and `tests:trace:selftest` hold both | the header of `scripts/test-trace.mjs` |
| A scenario without its happy-path or its negative test, a test on an ID no spec heads or on an old version of what it proves, a change under `apps/` in a commit that names no task, or a contract operation no test covers | `trace:check`, at push and in CI, re-derives the traceability record and holds it to traceability rules 5 to 8, the happy-path-and-negative obligation and a ratchet baseline of the gaps that predate it, which may fall and never rise; `trace:selftest` holds each refusal | the header of `tools/trace/trace.ts` |
| A test deleted, skipped or disabled, or its assertions weakened, on a branch with no recorded architect decision | `tests:inventory:check` compares the tests at HEAD with those at the merge base with `origin/main` and refuses each such change unless a commit on the branch carries a trailer naming the test and the reason; `tests:inventory:selftest` holds it | the header of `scripts/check-test-inventory.mjs` |
| Changed code under `apps/` that no test runs, or that tests run without detecting a fault injected into it | `thresholds:check`, at push and in CI, holds the lines and branches a branch changes to Node's own coverage and the changed lines of its Routines to StrykerJS's mutation score, each against its threshold and minimum sample in `tools/policy/tool-settings.json`. It also holds the ratchet baseline of the product's undetected mutants, which may fall and never rise; `thresholds:commands:check` holds the changed Commands in CI; `thresholds:selftest` holds each refusal. A change to a test alone mutates nothing | the header of `scripts/check-thresholds.mjs`; each metric's definition in `count-index.md` § Rates and metrics |
| A gate that still passes with its guard deleted | Every gate's `:selftest`: one break per case, the refusal's reason asserted, one undoctored control | `CLAUDE.md` § Standing rules for prompts and gates |
| A skill or agent that does not defer to `CLAUDE.md`; a prompt that grows without a person deciding it may | `check:prompts` refuses a skill or agent whose first line is not the line `CLAUDE.md` requires, and a prompt over its word budget in `tools/policy/prompt-budgets.json` or with none; a raise changes a record the pull-request reviewer holds high risk | `CLAUDE.md` § Standing rules for prompts and gates; the budgets' rules in the header of `scripts/check-prompts.mjs` |
| A constant with no reason beside it, one key given two values, or a key added where no reader reads it | `check:policy`, at push and in CI, refuses a policy record without its header or a `Means` beside each constant, a key two records define, and `tools/policy.json` back beside the records; `tools/lib/policy.ts` refuses a key two records define for every reader; `check:policy:selftest` holds each refusal | `CLAUDE.md` § Three kinds of file, and never a fourth; `docs/decisions.md` § D-27 |
| A tool version stated in a second place, a pin that is a range, a pin the lockfile does not verify, a second mise config, or CI and the dev container on two mise releases | `check:toolchain`, at push and in CI, holds `mise.toml` to `mise.lock`, the workflows and the Dockerfile, and `check:toolchain:selftest` holds each refusal. CI's locked install refuses a pin the lockfile does not hold | the header of `mise.toml`; `docs/decisions.md` § D-31 |
| An agent in a worktree pushing to, switching to or rewriting a protected branch | `scripts/hooks/guard-git.mjs`, and the worktree hooks that provision only through `scripts/new-worktree.sh` | `CLAUDE.md` § Git workflow |
| An agent applying the reviewer's approval label, which only a person applies | `scripts/hooks/guard-git.mjs`, from any checkout, for a `gh` command; nothing for the web UI, curl or a browser tool (`docs/decisions.md` § R-01) | `CLAUDE.md` § Git workflow |
| A figure restated from memory that has since moved | `counts:check` re-derives every keyed count from its source | `count-index.md` § How to use it |
| A pointer to a file or a section that is gone | `citations:check`, over every tracked text file | `CLAUDE.md` § Citations |
| A prose line an edit left more than a word past column 100, whitespace at the end of a line, or a heading with no blank line before it | The `Layout` style, through the `vale@agent-tools` hook on each edit of prose, at error level; `vale:selftest`, at push, holds each rule | the comment that opens each rule in `.vale-styles/Layout/` |
| A recorded decision argued again, or a register whose summary drifts from its entries | `check:register` | `CLAUDE.md` § Decisions live in the register |
| Work tracked in a checklist or a status table, an issue that does not say where its work lands, a found issue that does not say what kind of file it would change, or an issue of a type the rubric does not describe | The issue: `beads:check`, at push, refuses an open issue with no `repo:` label, an open issue filed `discovered-from` with no label `assetLabels` in `tools/policy/vocabulary.json` lists, and an open issue whose type no row of `issueTypes` there names; `beads:selftest` holds each refusal. Its priority: review alone, because no check can tell which row of `issuePriorities` fits. The checklist or status table: review alone, because no gate scans a file for one | `CLAUDE.md` § The task store |
| A generated artifact left stale after its input moved | Each emitter's `:check` twin, which re-derives the artifact and diffs it, at push and in CI | `CLAUDE.md` § The script suffix contract |
| A pre-push job skipped on the push that changed one of its inputs, because its glob misses it | Nothing refuses it. `npm run harness` reports each job whose glob misses a module its entry imports, a pinned package's manifest or lockfile, a file it reads from the checkout, a script it launches or a generated file its check compares, and the gates nothing runs, for a person to act on; `harness:selftest` holds each kind | the header of `tools/harness/harness.ts`; `git-hooks.yml`'s rule for a glob; `docs/decisions.md` § D-26 |
| A co-change map read through a commit the trunk never had, or one its emitter or policy no longer writes | `coupling:check`, at push and in CI, re-derives the map through the trunk commit it records and refuses a difference, and a commit off `origin/main`'s first-parent chain; `coupling:selftest` holds each refusal | the header of `tools/coupling/coupling.ts`; `docs/decisions.md` § D-24 |
| A pull request merged without being held to the issue it carries, a high-risk one merged without a person, or two merged at once | `.github/workflows/pr-review.yml`, one run at a time, deciding through `scripts/pr-review.mjs`; `pr-review:check` and `pr-review:selftest` hold its wiring and its decisions | `CLAUDE.md` § Git workflow |
| A program that rewrites its own instructions from what it observed | The prompt reviewer only opens a pull request, and a person decides whether it merges | `CLAUDE.md` § A program proposes; only a person promotes |
| A chained shell command whose failing step cannot be told apart, or a workaround for a refused command | Convention, and a `RUN THESE YOURSELF` block at the end of the agent's report | `CLAUDE.md` § Bash command style |
| A local code graph whose document layer is eroded, or a partial one reported as built | `scripts/code-graph.mjs` builds with `graphify extract`, never `update`, stamps what a language model produced, and exits 1 on graphify's partial-extraction warnings; the `code-graph` skill tells a session never to run graphify's eroding commands, and `scripts/hooks/guard-git.mjs` refuses a session's `graphify update`, `watch`, `hook install` or `claude install`, from any checkout; nothing refuses graphify behind a launcher or a shell word such as `nohup`, its library called through `python -c`, `graphify install --project`, or anything outside a session | `docs/decisions.md` § D-20 |

Every script opens with a header saying what it checks, **the failure it exists to prevent**, how
to invoke it and what it needs, so read the header before weakening a gate that is in your way.
Every decision nobody should re-argue is a numbered entry in `docs/decisions.md`, amended and never
rewritten.

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
   Node or none, and Claude Code's guard hooks stop guarding in silence.
1. Clone, then run `mise trust` and `mise install` in the clone. The trust is needed because
   `mise.toml` carries a setting, and a linked worktree shares it. The install fetches Node, Python
   3, `bd`, `gh` and Vale from `mise.lock`, each download checked against its checksum. Vale is the
   prose linter the `vale@agent-tools` plugin in `.claude/settings.json` runs on every edit of
   prose; without it, the plugin's hook exits in silence. Check that `node -v` and `bd --version`
   answer with the versions `mise.toml` pins.
1. Run `npm ci` in the clone. Its `prepare` step writes the git hooks into the clone's config, and
   refuses a Git older than 2.54.0; if your package manager blocks install scripts, run
   `npm run hooks:install` once.
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
1. Run `npm run gates` and read a green suite before the first change. It refuses a clone whose
   hooks are not installed (`CLAUDE.md` § The gate ladder).

### Windows, native

1. Install Git 2.54.0 or newer, and mise with `winget install -e --id jdx.mise`. Check that
   `mise --version` answers with a release no older than the `min_version` in `mise.toml`. None of
   this list has been run on Windows here (`asdlc-openspec-8juz.9`).
1. Put `%LOCALAPPDATA%\mise\shims` first on your user `PATH`, in System Properties under
   Environment Variables. Open a new shell, and check that `Get-Command node` names a path in it.
   Git's hooks and Claude Code's hooks run a bare `node`, and mise's shims there are `.exe` files.
1. Clone, then run `mise trust` and `mise install` in the clone, as step 3 of macOS and Linux says.
   Check that `node -v` and `bd --version` answer from the shell you will work in.
1. Run `npm ci` in the clone. If install scripts are blocked, run `npm run hooks:install` once.
1. Run `vale sync` in the clone, then check that `vale ls-config` loads, as step 5 of macOS and
   Linux says.
1. Set `sync.remote` in `.beads/config.yaml` if it still holds a placeholder (`<protocol>` is
   `git+https` or `git+ssh`), run `git config beads.role maintainer` (`contributor` on a fork),
   then `bd bootstrap`. Never `bd init`.
1. Run `npm run gates` and read a green suite before the first change.

A clone that is built on Windows is not also built from Linux (a container, WSL): `node_modules`
holds platform-native binaries. Use one clone per platform.

### Dev container

1. On the host, run `claude` and `gh` once each, so the files the container bind-mounts exist.
1. Clone, open the folder in VS Code, and choose "Reopen in Container".
1. Wait for the first build, which installs every tool `mise.toml` pins from `mise.lock`.
   `.devcontainer/entrypoint.sh` then runs the install, the git hooks and the tracker's hydration on
   every start, and warns rather than fails; read its output once. If it warns that a tool
   `mise.toml` pins is missing from the image, rebuild the container.
1. If it warned that Vale cannot load `.vale.ini`, run `vale sync` once in the container, then check
   that `vale ls-config` loads. The image carries every tool `mise.toml` pins; the styles land in the
   clone, so a rebuild keeps them.
1. Run `npm run gates` and read a green suite before the first change.

`.devcontainer/README.md` has the reasons and the mounts.

### The Node floor, on every platform

`package.json` `engines` is the oldest Node the repository supports. It starts at the version
`mise.toml` pins for every machine, so every gate runs the floor (`docs/decisions.md` § D-34),
until a bump of the pin leaves the floor below it. The floor is never below the lowest version on
its major line that every package in `package-lock.json` accepts, or a dependency refuses a Node
the floor calls enough. After a change to the lockfile, this prints that version beside the floor,
from the clone; raise `engines` if the floor is lower (it may sit above). It refuses a range form
it cannot read rather than skip it, and it has not been run in PowerShell (`asdlc-openspec-xn4`):

```sh
node -e "const L=require('./package-lock.json').packages,F=require('./package.json').engines.node,M=+F.match(/[0-9]+/)[0],n=s=>{const p=s.replace(/^v/,'').split('.').map(Number);return[p.length,(p[0]*1e3+(p[1]||0))*1e3+(p[2]||0)]},iv=c=>{const m=c.match(/^(>=|\^)?(v?[0-9]+(\.[0-9]+){0,2})$/);if(m===null)throw Error('cannot read '+c);const[k,lo]=n(m[2]);return[lo,m[1]=='>='?Infinity:m[1]?((lo/1e6|0)+1)*1e6:lo+[1e6,1e3,1][k-1]]},R=Object.entries(L).filter(([p,x])=>p&&x.engines&&x.engines.node).map(([p,x])=>x.engines.node.replace(/>=\s+/g,'>=').split('||').map(a=>a.trim().split(/\s+/).map(iv).reduce((a,b)=>[Math.max(a[0],b[0]),Math.min(a[1],b[1])]))),C=R.flat().map(i=>i[0]).concat(M*1e6).filter(c=>(c/1e6|0)==M&&R.every(r=>r.some(i=>i[0]<=c&&c<i[1]))).sort((a,b)=>a-b),f=c=>[c/1e6|0,(c/1e3|0)-(c/1e6|0)*1e3,c-(c/1e3|0)*1e3].join('.');console.log(C.length?'lowest '+M+'.x every locked package accepts: '+f(C[0])+'; package.json engines: '+F:'no '+M+'.x version satisfies every locked package; package.json engines: '+F)"
```

## Working here

<!-- kit 3.1-5 · ADAPT: one row per thing a person does here, and the skill, agent, command or
     script that does it. The kit lists what it laid down; add yours as they appear, and delete a
     row whose tool you retire. Delete this comment when done. -->

| To do this | Use this | Notes |
|---|---|---|
| See what is ready to be worked | `bd ready` | The queue. There is no status table anywhere else, by rule. |
| Change the harness, or fix the product without changing a requirement | the `bead` skill | Verifies the issue's premise first, then claims, implements, gates, opens the pull request and closes on green. |
| Change what the product does | the `change-*` skills, in order: `change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify`, `change-finalize` | One worktree, one pull request and one `bd` epic per change. The proposal and the delta specs are reviewed before any code is written, and the archive merges them into the living spec under `openspec/` before the merge. |
| Run the calculator on your machine | `npm run calculator:serve` | It prints the URL to open, on `127.0.0.1` only, and serves until Ctrl-C. Set `PORT` to serve on another port, such as when its default is taken. |
| Have agents work the ready issues in parallel | the `fan-out-work` agent | One fresh agent per lane, each in its own worktree, integrated on the dispatcher's branch. |
| Think a topic through, or research it, before changing anything | the `explore` skill | A conversation that draws in ASCII, cites its sources and changes nothing. Asked for a brief, it lists its guesses first, then an inventory of evidence with no recommendations; `change-propose` commits the brief as `findings.md` (`docs/decisions.md` § D-30). |
| Decide whether to bring a tool or a pattern into the harness | the `should-i-adopt` skill | Looks for a prior decision first, tries the candidate against this repository's rules in Docker only, and files a decision brief for a person to choose from. It changes no tracked file. |
| Have the last reply, or one term, explained in plain words | the `eli5` skill | It supplies the missing background and changes nothing; the original's facts and caveats survive exactly. |
| Draft what a person must do for an issue an agent cannot finish | the `human-plan` skill | |
| Retire a file | the `retire-asset` skill | A register decision with a checklist, not a tidy-up. |
| Add, rename or remove an npm script | the `add-npm-script` skill | It keeps § The npm scripts below, the hook runner and CI in step. |
| Make a worktree by hand | `scripts/new-worktree.sh <task-ref> <slug>` | From the primary checkout. It cuts `agent/<name>` from `origin/main`; `npm ci` is the first command inside. |
| Check your work before a pull request | `npm run gates` | Then fetch, rebase onto `origin/main`, and run it again. |
| Open a pull request | the `open-pr` skill | Tests the merge against the open pull requests, ends the title with the ids of the issues carried, sets the reviewer's `pr-review` status pending from the session, watches the checks with one watcher, and says what each outcome of `verify` and the reviewer asks. Every other skill and agent that opens a pull request opens it with this one. |
| Close a run of a prompt | the `close-prompt-run` skill | Leaves the run's analysis as a note in the tracker and, when enough are pending or the oldest is old enough, launches the reviewer in the background under a name of its own, without waiting for it. |
| Improve a prompt after running it | the `continuous-prompt-improvement` agent | Launched by the `close-prompt-run` skill (`CLAUDE.md` § Prompt reviews). One review reads every pending analysis, one agent per prompt file; what they change is one pull request, whose description is the review. An edit that turns a stored decision case of its prompt from right to wrong stays out of it (`.claude/prompt-cases/README.md`). |
| Get a pull request reviewed and merged | nothing: `.github/workflows/pr-review.yml` takes it once `verify` passes | It merges one whose title cites the issues it carries, satisfies them, and is not high risk. `gh workflow run pr-review.yml -f pr=<number>` reviews a head again. |
| Approve a pull request the reviewer left to a person | apply the approval label, `prReviewLabels` in `tools/policy/pr-review.json` | A person only, never an agent (`CLAUDE.md` § Git workflow). It approves the head the reviewer last judged, and a push needs it again. Merging by hand works too. |
| Check a pull request, report or analysis before trusting it | the `adversarial-verifier` agent | Pass it the pull request number or file path. Every claim is re-derived from source; it reports a verdict table and changes nothing. |
| Ask how parts of the repository connect | the `code-graph` skill, through the `graphify` MCP server | Each person builds the graph: install the graphify release `graphifyVersion` in `tools/policy/tool-settings.json` pins, with its MCP extra, then run `npm run code-graph` from any checkout. It builds into the primary checkout and registers the server for it and its worktrees. A first build sends every document to the model `graphifyClaudeCliModel` names, on your own Claude plan; later builds send only what changed (`docs/decisions.md` § D-20). |

## The npm scripts

Every script in `package.json`, one sub-section per prefix. A name of the form `<group>:<verb>` is
public: the bare name writes the artifact, `:check` re-derives it and writes nothing, `:selftest`
proves the gate refuses what it should (`CLAUDE.md` § The script suffix contract). The **Gate**
column is read off `git-hooks.yml` and `.github/workflows/verify.yml`; where it disagrees with them,
they win.

<!-- kit 3.1-5 · ADAPT: one row per script, kept in step with `package.json` by the add-npm-script
     skill where you took it. The kit lists the scripts it laid down. Delete this comment when
     done. -->

### beads

| Script | What it does | Gate |
|---|---|---|
| `beads:check` | Refuses an open issue with no label naming where its work lands, an open issue filed `discovered-from` another with no label `assetLabels` in `tools/policy/vocabulary.json` lists, an open issue whose type no row of `issueTypes` there names, and an issue citing an identifier that does not resolve here. Without the second, a found issue drops out of `bd count --by-label` and the count still reads as complete. Without the third, an issue takes a type no filer was told when to use. It reads the tracker's database, which a fresh clone in CI does not have. | pre-push |
| `beads:selftest` | The tracker gate, negative-tested: each refusal over a fixture export and a copy of the committed policy, read through `BEADS_CHECK_ROOT`, with an undoctored control that must name the fixture's bead count. It runs no `bd`, so it runs in CI too. Without it the gate could lose a rule, or read the live tracker when pointed at a copy, and still pass. | pre-push + CI |

### calculator

| Script | What it does | Gate |
|---|---|---|
| `calculator:serve` | Serves the calculator page on `127.0.0.1` alone, at the port `PORT` names or at the default `apps/calculator/serve.js` holds, and prints the URL; it runs until Ctrl-C, and a port in use or an invalid `PORT` is refused in one line. Without it the calculator can be tested but not used. No job runs it, since it never returns: `calculator:test` runs the same file and proves what it does. | |
| `calculator:test` | Runs the test files directly in `apps/calculator/test/` (its `README.md` lists them) with Node's own test runner: each scenario of the calculator and of its local server is a test named for its ID and title, under a suite named for its requirement, except the few a browser alone can show, which `apps/calculator/test/README.md` names. Without it nothing holds the calculator to its specs. It runs through `scripts/run-tests.mjs`, which also fails the run when its pattern matches no file or a matched file declares no test, since Node's runner passes both, and when a test's metadata breaks the convention in the header of `scripts/test-trace.mjs` or a test is one that reader and the runner do not both see. | pre-push + CI |
| `calculator:test:independent` | Runs every test file under `apps/calculator/test/independent/build/`, the contract tests and build-time fitness functions the build workflow's test-builder writes, through `scripts/run-tests.mjs --dir`, with the same refusals as `calculator:test`; while the directory holds no test it passes and says so. Without it the tests that check the calculator's Binding Surface independently of the agent that built it would run only inside a build. It runs none of `independent/verify/`, which the strategy leaves to Verify. | pre-push + CI |
| `calculator:test:verify` | Runs every test file under `apps/calculator/test/independent/verify/`, the E2E tests and Verify-deferred fitness functions the test-builder writes, the same way; while the directory holds no test it passes and says so. `docs/test-strategy.md` § Build exit criteria runs them at Verify, so no push or CI step runs it, and `scripts/check-jobs.mjs` names it as an exception; change-verify's fresh run, `tests:fresh`, runs it in a clone of HEAD. Its `--dir` is also how the trace and test-inventory gates find those tests, without which they would not count an E2E test toward its scenario or see one removed, and how the thresholds gate leaves them out of its coverage and mutation runs. | |

### check

| Script | What it does | Gate |
|---|---|---|
| `check:jobs` | Holds the hook runner's configuration, the CI workflow and `package.json` to each other: every job names a script that exists, every script no job runs is declared with its reason, and every declaration is current and of the right kind. It also holds each script to the files it names: a `tools/`, `scripts/` or `apps/` path exists as spelled, case included, and a glob matches a file. Without it a gate can be unwired, or a script can name a file that is gone, and nothing says so. | pre-push + CI |
| `check:jobs:selftest` | The job cross-check, negative-tested. | pre-push + CI |
| `check:policy` | Refuses a record under `tools/policy/` without its five header fields, a constant without its `Means` sibling and a `Means` without its constant, a key two records define, a record `tools/policy/README.md` does not name and any other file in the directory, and `tools/policy.json` back beside the records. Without it a key lands with no reason beside it, two records give one key two values and each reader takes one, and a key added to the retired file reaches no reader. | pre-push + CI |
| `check:policy:selftest` | The policy gate, negative-tested over copies of the live records. | pre-push + CI |
| `check:prompts` | Refuses a skill or agent whose first line after its frontmatter is not the sentence `CLAUDE.md` requires, read out of `CLAUDE.md` so the sentence has one home. Refuses too a prompt over its word budget, or with none: every skill and agent, `CLAUDE.md`, `AGENTS.md`, the worktree briefing template, `.beads/PRIME.md` and the string literals of each workflow, each against its row, by path, in `tools/policy/prompt-budgets.json`. Without it a prompt copied in or written fresh loses the line, and a prompt grows with every review, and nothing says so. `node scripts/check-prompts.mjs --counts` prints each prompt's words beside its budget. | pre-push + CI |
| `check:prompts:selftest` | The prompt gate, negative-tested against a fixture tree it builds. | pre-push + CI |
| `check:register` | Holds the register's status line, summary table and dates to its entries, in both directions. | pre-push + CI |
| `check:register:selftest` | The register gate, negative-tested. | pre-push + CI |
| `check:toolchain` | Holds `mise.toml`, the one home of every tool version, to `mise.lock` and to every other place a tool could be installed. Each pin is exact, and locked with a URL and checksum for every platform `toolchainLockPlatforms` names. Every workflow's `jdx/mise-action`, pinned by commit, pins the mise the dev container copies in, each by its digest. No setup action, NodeSource, npm install of `bd`, `uv tool install`, version `ARG` or other manager's version file installs a tool a second way. `mise.toml` holds no `[env]`, `[hooks]` or `[tasks]`, no tool option table, no setting it does not admit, and no template but `[task_config] dir = "{{cwd}}"`. No other mise config is tracked, and mise reads `mise.toml` as the gate does. Without it a second home comes back and drifts from the pin unseen. | pre-push + CI |
| `check:toolchain:selftest` | The toolchain gate, negative-tested over copies of the live files, beside five controls. | pre-push + CI |

### citations

| Script | What it does | Gate |
|---|---|---|
| `citations:check` | Resolves every line and section pointer in every tracked text file, and refuses a pointer into a memory store this repository does not use. Without it a renamed heading leaves pointers that still look authoritative. | pre-push + CI |
| `citations:selftest` | The citations gate, negative-tested: its scanner held to fixtures, and the gate run end to end over a synthetic tree through `CITATIONS_ROOT`, with exact counts in the control and one break per doctored copy. Without it the gate can go quietly green over a repository it has stopped reading. | pre-push + CI |
| `citations:support` | An advisory, never a gate: judges, with a TypeSafe Choice, whether the section a citation names says what the sentence citing it claims, and prints the citations that fall under the policy's threshold for a person to read. `-- --file <path>` limits it to one file, `-- --dry-run` counts without a call. It reads `TYPESAFE_API_KEY` and the network. When the key is not set it says so and falls back to an offline word-overlap check, weaker and printed as such, at `citationSupportOverlapMinShare` in `tools/policy/tool-settings.json`. Without it a pointer that resolves to prose that does not say what is claimed passes `citations:check` unread. | |
| `citations:support:selftest` | The advisory, negative-tested over a fixture tree and a stubbed judge: each outcome, what is skipped and why, a missing key that falls back to word overlap and a failed call that fails and never falls back, the fallback's share and threshold, and once through the real SDK to a refused loopback connection. Needs no key. Without it the advisory can swallow a failed call and print a clean report over a run that judged nothing. | pre-push + CI |

### code-graph

| Script | What it does | Gate |
|---|---|---|
| `code-graph` | Builds the local code graph with graphify into the primary checkout's gitignored `graphify-out/` and registers graphify's MCP server for it at Claude Code's local scope, which that checkout's worktrees share. The server is on the harness assessment's combined graph beside it while that records this build, and on the graph otherwise, as after a build that registers (`docs/decisions.md` § D-28). A build with `--no-mcp`, or one that fails, leaves the server where it was, and says so. `-- --code-only` parses code alone and calls no model; `-- --force` re-sends every document; `-- --no-mcp` leaves Claude Code's configuration alone. It reads the network, a language model and your own Claude plan, so no job runs it. Without it a graph is refreshed with `graphify update`, which erodes its document layer (`docs/decisions.md` § D-20). | |
| `code-graph:mcp` | Registers the MCP server alone, or leaves a matching registration as it is: on the combined graph `harness:graph` wrote, while it records the graph beside it, and on the graph otherwise. Run it after `harness:graph` to serve what it wrote. | |
| `code-graph:selftest` | The script, negative-tested against a fixture repository with stub graphify, graphify-mcp and `claude` first on PATH. It covers the stamp on what a language model made and on nothing the parser made, the withheld API key, the policy's model, folder and server name, each partial-extraction text graphify prints, a registration left alone or replaced, the lock, a run under a git hook's exported `GIT_DIR`, and each refusal by its reason, with an undoctored control. It also holds that the combined graph is registered only while it records the graph beside it. Without it a reworded graphify warning, or a stamp that misses an item, passes unseen until a graph erodes. | pre-push + CI |

### counts

| Script | What it does | Gate |
|---|---|---|
| `counts:check` | Re-derives every value in `count-index.md` from the source the index names for it. The table is updated from what it reports, never the reverse. | pre-push + CI |
| `counts:selftest` | The count-index gate, negative-tested. | pre-push + CI |

### coupling

| Script | What it does | Gate |
|---|---|---|
| `coupling` | Writes the co-change map, `artifacts/coupling/cochange.json`, through the trunk commit it records, `throughCommit`: which files the pull requests merged to `main` changed together, read from git history, with how often, the hub files that change with nearly everything, and the clusters of files that move as one. It never moves that commit, so it writes the same bytes until the emitter or its keys in `tools/policy/tool-settings.json` change; with no map it refuses. Without it, which issues can run in parallel lanes, and where a decomposition would cut, are argued from memory of what changed together. No job runs it: `coupling:check` is its gate. | |
| `coupling:check` | Re-derives the map and refuses any difference, any other file under `artifacts/coupling/`, a `throughCommit` off `origin/main`'s first-parent chain, a merge commit on it, a shallow clone, and a `coupling*` key missing or malformed. It prints how many pull requests landed after the baseline, and does not fail on them. Without it a hand-edited map, or one an edit to its emitter left behind, reads as current. | pre-push + CI |
| `coupling:selftest` | The co-change gate, negative-tested: each refusal on a doctored copy of a fixture repository built from the ratified history, its reason asserted beside a control. It also holds the history walk to its hand-ratified fixture, each command's refusal to check or write when a walk disagrees with it, and the command line through `COUPLING_ROOT`, under an exported `GIT_DIR` and a hostile git configuration. | pre-push + CI |
| `coupling:update` | Moves the map's baseline to `origin/main`, and writes the map through it. Run it after `git fetch origin main`, when the map lags the trunk by more than its reader will accept. No job runs it, since a job that did would move the baseline it holds. | |

### gate-summary

| Script | What it does | Gate |
|---|---|---|
| `gate-summary:selftest` | The Stop and SubagentStop hook, run as Claude Code runs it over scratch trees: an untracked file with a broken pointer must turn its verdict to FAIL for that reason, an ignored one must not, and a subagent's verdict must say so. A copy of the hook in a scratch repository must run its gates in the linked worktree the payload's `cwd` names, and its verdict must say what that worktree's own gate read. A copy of `block-generated-edit.mjs` must refuse an edit to generated output in a linked worktree with the reason it gives in the primary checkout. Without it the hook could go back to reporting PASS over files it never read, or over a checkout it never gated, and the edit hook to passing every generated file in a worktree. | pre-push + CI |

### gates

| Script | What it does | Gate |
|---|---|---|
| `gates` | The forced full pre-push suite, run through `git hook run` with the branch's push line, so it sees a real push's environment and input. It refuses a clone whose hooks are not installed, and a Git older than 2.54.0, rather than report a clean run that ran nothing. | |

### harness

| Script | What it does | Gate |
|---|---|---|
| `harness` | Writes a dated report of the harness under `.scratch/harness/`, from committed files and the co-change map. It names each hook job whose glob misses one of its inputs, by kind; each gate a README table names that nothing runs; each script that runs at pre-push or in CI but not both, undeclared; and code files that change together and import neither way. Its tables give the rule sections scripts cite and, per file, the jobs that declare it, the jobs whose imports reach it, how often pull requests change it and how many globbed jobs that fires per hundred pull requests. Each item is a finding, a lead or a note, under a stable key, and the report names what changed since the last one and whether the tool did. It reports and enforces nothing. Without it a glob that misses an input is found when the job it should have run is first needed. | |
| `harness:graph` | After `harness`, for the same date: the local code graph's freshness, the graph's own leads, the co-change pairs with no edge between them in the graph, and the map's clusters against the graph's communities. It writes one combined graph, the local graph with the harness's wiring and the co-change edges added. Run from the checkout that holds the graph, it writes it beside the graph, where `code-graph:mcp` then serves it to sessions; from a worktree, or with `--graph`, beside its report, not served. With no graph it says so and exits 0. Run under graphify's own Python, it also loads that graph through graphify's loader and reports an edge lost. | |
| `harness:selftest` | The core over fixture repositories, one planted gap per case, the keys it adds and their reasons asserted beside a control that reports nothing; the command line through `HARNESS_ROOT`; then the graph half over fixture graphs, through the `python` that `mise.toml` pins, which fails, saying so, where none runs. | pre-push + CI |

### hooks

| Script | What it does | Gate |
|---|---|---|
| `hooks:install` | Writes the five `hook.asdlc-*` entries into the repository's config, the same from any checkout, and removes lefthook's shims from `.git/hooks`; it reports a `.old` or `.backup` file and a tracker section it leaves. `npm ci` runs it through `prepare`; run it by hand after an install that skipped scripts. Without it no commit or push here runs a gate. It refuses a Git older than 2.54.0, under which the entries run nothing. | |
| `hooks:selftest` | The hook runner, negative-tested: each refusal of the job file and the policy over a doctored copy, and commits, pushes, a linked worktree, the install, `npm run gates`, an older Git and a signal through real Git in scratch repositories with a bare remote, beside a control commit and push. Without it a glob the runner misread, or a skip it did not print, would read as a pass. | pre-push + CI |

### openspec

| Script | What it does | Gate |
|---|---|---|
| `openspec:check` | Validates every living spec and active change under `openspec/` strictly with the pinned CLI, and trial-archives each active change into a scratch copy so a delta that cannot merge is refused before Finalize. It refuses a living spec still carrying the archive's placeholder Purpose, a scenario or NFR requirement without a unique ID carrying its capability's prefix (`specIdPrefixes` in `tools/policy/vocabulary.json`), and an ID an archived change gave another title. It refuses, too, a retired `openspec-*` skill that `openspec init` or `openspec update` wrote back, and a skill or agent that spells the change label without citing its one home, `specChangeLabel` in `tools/policy/vocabulary.json`. | pre-push + CI |
| `openspec:selftest` | The OpenSpec gate, negative-tested against a fixture tree it builds. | pre-push + CI |

### pr-review

| Script | What it does | Gate |
|---|---|---|
| `pr-review:check` | Holds the pull-request reviewer's four files to each other: the policy's `prReview*` keys whole, and a floor that covers the reviewer itself; `pr-review.yml` queuing rather than cancelling, waking on `verify`'s runs and filtering on the policy's approval label; and the agent it names read-only. It holds, too, the review job installing `bd` with `CI` unset and running `bd --version` in the same step, and `verify.yml` carrying the required check and a dispatch trigger. Without it a renamed label or check leaves approvals and merges waiting on the schedule, and nothing says why. | pre-push + CI |
| `pr-review:selftest` | Every decision the reviewer makes, over fixtures built from the live policy, each case asserting its reason: which verdicts merge, ask a person or request changes, which approvals count, what the queue takes next, and which heads `mark` sets pending when the session that opened the pull request, or a person, runs it. It holds the brief's facts too: which other issues the cited issues and the body name, that the prompt counts come from the commit and not the working tree, when they are shown and that a failed count always is, how the commits read, and what `brief --local` refuses as its inputs. It also runs the wiring gate over doctored copies with an undoctored control. Without it a change to the decisions shows only in a merge nobody meant. | pre-push + CI |

### tests

| Script | What it does | Gate |
|---|---|---|
| `tests:fresh` | The verifier's fresh run, from a change's worktree (`change-verify` § 4): it clones HEAD under the temporary directory with the worktree's `origin/main` and no remote, runs `npm ci`, every test script, the trace gate and `thresholds:commands:check` there, sorts each test by the traceability record, and writes `.scratch/<change>-verify.json`, which the trace workflow and the verification report read. `--rerun` runs one failing test once more, by name, in a fresh clone. Without it Verify runs the proofs in a worktree whose leftover state a test can pass on, and a flaky test can be retried until green. It reads the network through `npm ci`, so no job runs it. | |
| `tests:fresh:selftest` | The fresh run, negative-tested over a fixture repository with `npm ci` stubbed: the clone is of HEAD, with the checkout's `origin/main` and no remote, and is removed; a dirty tree, a temporary root inside a repository, a missing `origin/main` and a failed install are refused by their reasons. A test the record lacks is a problem of the run, a test citing a task passed in joins the change's partition, and a failing test is run once more by name, once. Without it the stand-in for a run no job can make would not exist. | pre-push + CI |
| `tests:inventory:check` | Compares the tests at HEAD with those at its merge base with `origin/main`, read from git, and refuses a test removed, one given a skip, a todo or an only, and one with fewer assertions, unless a commit on the branch records an architect's decision for it in a trailer, the key `testInventoryTrailer` in `tools/policy/vocabulary.json`. A test renamed with its call unchanged and every ID of its old name kept is not a removal, and on `main` it passes. Without it a builder can turn a failing run green by deleting, skipping or weakening the test, and every other gate stays green. | pre-push + CI |
| `tests:inventory:selftest` | The test-inventory gate, negative-tested: each refusal over doctored copies of a fixture's test files, with a control whose assertions and skips are counted by hand, and through git over fixture repositories, among them a decision in the wrong paragraph of a commit message or with its key in another case, a shallow clone and one with no `origin/main`. Without it the gate could let a rename drop a test's ID, miss a kind of skip, count assertions in a comment, or read the working tree instead of the commits, and still pass. | pre-push + CI |
| `tests:selftest` | The test runner behind `calculator:test`, `calculator:test:independent` and `calculator:test:verify`, negative-tested against fixture trees it builds: it must refuse a matched file that declares no test, a pattern that matches no file and a `--dir` that is not a directory, pass a `--dir` that holds no test yet only saying so, and still fail a failing test, at any depth under a `--dir` too. It must refuse too a test with no trace line, a test made in a loop or inside another test's body, which the reader cannot see, a test under a condition, which the runner never registers, and a policy without the reader's keys. By `--name` it must run exactly one test of that name, refusing a name that runs none or two. Without it the runner could go back to passing a run that tested nothing, as Node's own runner does, or let a test run that a gate reading tests from source never counts. | pre-push + CI |
| `tests:trace:selftest` | The test-trace reader, `scripts/test-trace.mjs`, negative-tested: each refusal of a test's name or `// trace:` metadata on a doctored copy of a source, with a control read field by field, a name's escapes read as JavaScript reads them and a commented-out test left unread, and `cite` refusing a ref no trace line carries. It holds the reader's hash, too, over a fixture spec tree, where the control is the sha256 of the text the definition names. A requirement's statement or a scenario's own block moves a hash; a blank line, a sibling or a renamed requirement does not, and an archive by the pinned OpenSpec CLI moves none. Without it the convention could be read wrong, or a hash go stale on an edit that changes nothing a test proves, and every gate that reads tests through it would agree. | pre-push + CI |

### thresholds

| Script | What it does | Gate |
|---|---|---|
| `thresholds:check` | Runs every test file but those of the test-builder's Verify stage once with Node's own coverage. It holds the code lines and branches a branch changes under `apps/`, against its merge base with `origin/main`, to the thresholds and minimum samples in `tools/policy/tool-settings.json`, and prints the whole product's figures beside them, ungated. Then StrykerJS's tap runner mutates the changed lines of the Routines over the same tests, and it holds their mutants to the mutation threshold. A change to a test alone mutates nothing. It holds the ratchet baseline, `artifacts/thresholds/baseline.json`, to the one at the merge base, carried through the branch's edits. Below a minimum sample it gives the counts and no rate, and refuses any one gap a directive does not excuse with a reason. Without it a change can land code no test runs, or tests that run it and detect nothing, and every other gate passes. | pre-push + CI |
| `thresholds:commands:check` | Has StrykerJS's command runner mutate the changed lines of the Commands, the files `mutationCommands` in `tools/policy/tool-settings.json` names, one mutant at a time, and holds their mutants as `thresholds:check` holds the Routines'. It is no pre-push job, for its minutes of cost, which the header of `scripts/check-thresholds.mjs` gives; `tests:fresh` runs it too, at `change-verify`, and the verification report carries its output. Without it code the tests reach only by spawning a process is never scored, since the tap runner cannot see it. | CI |
| `thresholds:selftest` | The thresholds gate, negative-tested over a fixture repository laid out as the calculator is and sized from the live policy's minimum samples: each refusal of coverage, of the Routines' and the Commands' mutants and of the baseline asserted with its reason beside two controls, the baseline's update, and the command line through `THRESHOLDS_ROOT`. It holds, too, that the test-builder's Verify stage runs in neither the coverage run nor the Routines' mutation run. Without it a threshold could stop being read, or a gap stop being refused, and the gate still pass. | pre-push + CI |
| `thresholds:update` | Carries the ratchet baseline, `artifacts/thresholds/baseline.json`, from the merge base through the branch's edits: it re-keys each entry to where its code now sits, drops each on a line the branch changes, which the branch answers for, mutates the lines of the rest and drops each a test now detects. On the branch that creates the baseline it mutates the whole product and lists the undetected mutants of each run below its threshold; it adds none after that. No job runs it, since a job that did would move the baseline it holds. | |

### trace

| Script | What it does | Gate |
|---|---|---|
| `trace` | Writes the traceability record, `artifacts/trace/record.json`, and the directory's `README.md`: every scenario and NFR requirement of the living specs and the active deltas, with its tests by role and its obligation; every test, with each reference it cites and whether that is current; every contract operation; and every task a commit on HEAD names, with the paths under `apps/` it changed. Without it Verify has no record to sort a change's tests from the regression suite by, and a scenario's proof is traced by hand. A commit joins the record only once it exists, so it runs after the last commit that changes `apps/`. No job runs it: `trace:check` is its gate. | |
| `trace:check` | Re-derives the record and its README and refuses any difference, or any other file under `artifacts/trace/`. It holds the rules the header of `tools/trace/trace.ts` gives, refusing a commit of the branch that changes `apps/` and names no task, a contract operation with no contract test, a test with no ID or no artifact hash, an ID nothing heads, and a hash that is not current. It refuses, too, a scenario with no happy-path or no negative test at the functional layer or above that the baseline does not list, and holds the baseline itself, which may fall and never rise. Without it a scenario can land half-proved, or a test keep proving a scenario its change rewrote. | pre-push + CI |
| `trace:selftest` | The trace gate, negative-tested: each refusal on a doctored copy of a fixture repository, its reason asserted beside a control, the baseline's update, the history walk against its hand-ratified fixture, and the command line through `TRACE_ROOT`. | pre-push + CI |
| `trace:update` | Moves the ratchet baseline, `artifacts/trace/baseline.json`, down to the obligations still unmet that the baseline at the branch's merge base with `origin/main` lists. It adds none, and prints each it would not add, which the change then meets. No job runs it, since a job that did would move the baseline it holds. | |

### vale

| Script | What it does | Gate |
|---|---|---|
| `vale:selftest` | This repository's own Vale style, `.vale-styles/Layout/`, over fixtures: a control holding every construct its rules must pass draws no alert, and each doctored case draws exactly its rule's alert at its line; every section of `.vale.ini` that lints with a style applies it, and one with the style taken out is refused by name. It runs the `vale` mise installs, in CI too, and skips clean where none is on PATH; a `vale` that is found and fails is a failure, which it holds by running itself with a failing stub. Without it a rule that stops matching leaves the hook silent over the fault it names. | pre-push + CI |

### workflows

| Script | What it does | Gate |
|---|---|---|
| `workflows:selftest` | Runs each workflow under `.claude/workflows/` against stubbed agents with the values in `tools/policy/agent-workflows.json`. For the change-build review, `build-change-task.js`: how it stops, how many skeptics it sends a finding, that a finding nobody could verify is never counted refuted, and that it reports a listener it left behind. It must stop as `not-red`, before any review, a task of a kind `buildRedFirstKinds` lists when a scenario the parent named has neither a red record nor an already-green report, and no task of another kind. For a task of a kind `buildIndependentKinds` lists, its test-builder must be called by its agent type with a prompt built from the allowed inputs alone. For such a task it must stop as `not-independent` a builder writing under the test-builder's directory, a test-builder file outside it or under the wrong stage (an E2E test or a Verify-deferred fitness function under `build/`), or a runner that leaves one behind. For such a task it must run every build-stage file an earlier task committed beside the task's own, where it stands and never written, and route each failure, an earlier file's included, to rewrite-test, fix-app or re-design. It must stop such a task on a re-design its skeptics uphold and on tests still failing at the last run, and let no planted test source, assertion or stack frame reach its builder's or fixer's prompt. `.claude/agents/test-builder.md` must have no tool but its structured output. For the prompt review, `review-prompts.js`: that it refuses a finding below the threshold, sends each edit the skeptics its severity is given and each consolidation the `blocker` count, refuses a consolidation that does not say where each removed rule went, merges no branch a majority did not uphold, and returns every finding it read and did not carry, to be held. It also keeps out a branch that turns a stored decision case of a file it changes from right to wrong, or leaves one unanswered. For its cases, `author-prompt-cases.js`: that it sends one author per lens, shown its own seed alone, stores a case only when every answer chose its expected option, and refuses a reader's copy its checksum does not match or a path other than where its command writes. Every case under `.claude/prompt-cases/` must pass both workflows, which give one case one answer prompt. `prompt-case-author.md` and `prompt-case-answerer.md` may have no tool but Read and their structured output. For the change-verify trace, `verify-change-trace.js`: that it counts no group its tracer returned short or read at another commit, gives each row its gap from its reading, never counts an unverified gap refuted, and never lets a skeptic's vote clear a proof that failed. It must keep on a run again only the readings it is given, of lenses that read, take each row's result from the fresh run, counting a flaky test as failing, and refuse a run of another commit. The trace and pull-request-body renderers must refuse a result with a scenario missing, a gap open or a row that did not pass. The verification report's two renderers must write one section from one stubbed run, and reject on a flaky or failing test, an unmet obligation or a failed Commands' run. It also holds each file to what the Workflow runtime accepts, and refuses a workflow with no suite. Without it a wrong stop rule shows only in a real run, at millions of tokens. | pre-push + CI |

### worktree

| Script | What it does | Gate |
|---|---|---|
| `worktree:gc` | Removes a clean checkout with no process in it once HEAD there has been still for `worktreeGcMinAgeHours`, or at once when `-- --finished <name>` names it. It deletes an agent branch only on proof its content is in the trunk, a merged pull request's head among the proofs; `-- --dry-run` prints what it would do. | |
| `worktree:selftest` | The worktree hooks, the git guard and the branch sweep, negative-tested against a scratch repository it builds, and the worktree briefing rendered from its template into a scratch directory. | pre-push |

## The work, and what its runs leave behind

The **work** is what this repository does to a **work item**, one unit of the queue; a **run** is one
execution of the work on one item. What the work is, and how a run is started, is this repository's
own to say here.

A run leaves behind its commits and pull request, and an issue in `bd` for each defect it found
outside its own files, linked `discovered-from` the issue or epic it ran on. Each of those issues
carries one or more of the labels `assetLabels` in `tools/policy/vocabulary.json` lists, one per kind
of file it would change, so `bd count --by-label` shows which kind keeps needing a fix after a run. It
also leaves its analysis of itself as a note on the issue it worked, and the prompts that ran are
reviewed from those notes in batches, as `.claude/skills/close-prompt-run/SKILL.md` says. A program
proposes, and only a person promotes (`CLAUDE.md` § A program proposes; only a person promotes).

## Where to read next

| Path | What it is |
|---|---|
| `CLAUDE.md` | Read first. The only home for a rule an agent must follow here. |
| `docs/README.md` | The documentation index, and the conventions every document follows. |
| `docs/decisions.md` | The register of numbered decisions and risks. It wins a disagreement with any document. |
| `docs/playbook.md` | The route one issue takes to the trunk, step by step, each step naming the file or command that decides it. |
| `docs/plain-language-guide.md` | How work gets done here, for a reader who runs nothing. |
| `docs/test-strategy.md` | The agentic test strategy the change process adopts, as supplied, with the register's amendments marked. |
| `count-index.md` | Every count describing the current measured state, under a key. |
| `scripts/README.md` | The single-file gates and git-job scripts, one row each. |
| `scripts/hooks/README.md` | The Claude Code hooks, one row each. |
| `.github/workflows/README.md` | The CI workflow and the pull-request reviewer, one row each. |
| `tools/README.md` | The emitters and multi-file checks, one row each. |
| `apps/calculator/README.md` | The calculator demo app: what each file and directory holds, and which specs win over it. |
| `.claude/README.md` | What Claude Code loads when a session starts here. |
| `.devcontainer/README.md` | The dev container's mounts, each with its failure mode. |
| `KIT-CHECKLIST.md` | What the kit laid down, and what is still to adapt. |

## What runs automatically

Nothing here needs remembering: each row fires on its trigger. The third column is the file that
wires it, and where this table and that file disagree, the file wins and the row is corrected.
The settings file registers `CNT-HOOKS` session hooks, and a session reads it once,
at its start: restart the session after changing it.

<!-- kit 3.1-5 · WRITE: one row per hook, job or workflow, added in the same change as its wiring.
     The kit lists only what it wired. -->

| Trigger | Effect | Wired in |
|---|---|---|
| `npm ci` | `package.json`'s `prepare` runs `scripts/git-hooks.mjs --install`, unless `CI` is set: it writes the five `hook.asdlc-*` entries into the repository's config, which run the git hooks below, and removes lefthook's shims from `.git/hooks`. It refuses a Git older than 2.54.0. | `package.json` (`prepare`) |
| `git commit`, `git checkout`, `git merge`, `git push` | `scripts/git-hooks.mjs` runs the event's jobs from `git-hooks.yml`, those whose globs match the staged or pushed files and every one with no glob, and prints one line per job, the jobs it skipped and a total. | the repository's config (`hook.asdlc-*`, from `npm run hooks:install`) |
| A session is about to run a Bash command | `scripts/hooks/guard-git.mjs` refuses, from a linked worktree, a git command against a protected branch or the worktree registry; any git command in what a removed worktree leaves under `.claude/worktrees/`, where git would act on the primary checkout; and from any checkout, a `gh pr create` that does not name `main` as its base and a `gh` command that applies the reviewer's approval label. From any checkout it also refuses graphify's `update`, `watch`, `hook install` and `claude install`, which erode the local code graph or write graphify's advice to run `update` into `CLAUDE.md`. | `.claude/settings.json` (`PreToolUse`) |
| A session is about to write or edit a file | `scripts/hooks/block-generated-edit.mjs` refuses an edit to generated output and names where the change belongs. | `.claude/settings.json` (`PreToolUse`) |
| A session has written or edited a prose file | The `vale@agent-tools` plugin's hook runs Vale over the whole file and hands back its error-level alerts, the `Layout` style's among them. It is silent where `vale` is not installed. | `.claude/settings.json` (`enabledPlugins`) |
| A session stops | `scripts/hooks/gate-summary.mjs` runs the fastest gates over the session's checkout, untracked files included, and prints one verdict line. It never blocks the stop. | `.claude/settings.json` (`Stop`) |
| A subagent stops | The same hook, over the checkout the subagent worked in, with a verdict that says it is a subagent's. | `.claude/settings.json` (`SubagentStop`) |
| Claude Code creates a worktree | `scripts/hooks/worktree-create.mjs` provisions it through `scripts/new-worktree.sh`: `agent/<name>` off `origin/main`, with a rendered briefing. | `.claude/settings.json` (`WorktreeCreate`) |
| Claude Code removes a worktree | `scripts/hooks/worktree-remove.mjs` removes the checkout, keeps the branch, and sweeps merged agent branches. | `.claude/settings.json` (`WorktreeRemove`) |
| `git commit`, with a staged path under `artifacts/` | `scripts/assert-not-hand-edited.mjs` refuses a generated file that no longer matches its generator. | `git-hooks.yml` (`pre-commit`) |
| `git commit`, `git checkout`, `git merge`, `git push` | The tracker's own git hooks, as jobs of the hook runner rather than a section `bd hooks install` writes into `.git/hooks`, which would run them twice. | `git-hooks.yml` (`pre-commit`, `prepare-commit-msg`, `post-checkout`, `post-merge`, `pre-push`) |
| `git push` | `beads:check` holds the open issues to the label, type and identifier rules. It reads the tracker's database, so it is not a `.github/workflows/verify.yml` step. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/check-beads.mjs`, `tools/policy/`, `tools/lib/policy.ts` or `tools/lib/bd-launcher.ts` | `beads:selftest`: `beads:check`'s refusals of an issue with no `repo:` label, of a found issue with no label `assetLabels` lists and of an issue whose type no row of `issueTypes` names, over a fixture export, each asserting its reason. It runs no `bd`, so it is a `.github/workflows/verify.yml` step as well. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/git-hooks.mjs`, `git-hooks.yml`, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts`, `package.json` or the lockfile | `hooks:selftest`: the hook runner's refusals of a key, token or event it does not read and of a policy without its cap, each asserting its reason, and commits, pushes, a linked worktree, the install, `npm run gates`, an older Git and a signal through real Git in scratch repositories. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `package.json`, the lockfile, `git-hooks.yml`, `.github/workflows/verify.yml`, or anything under `tools/`, `scripts/` or `apps/`, the gate among them | `check:jobs` and its selftest: every job names a script that exists; every script no job runs is declared, and no declaration is stale or of the wrong kind; every `tools/`, `scripts/` or `apps/` path a script names exists as spelled, case included; and every glob a script names matches a file. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a skill, an agent, a workflow, `CLAUDE.md`, `AGENTS.md`, the worktree briefing template, `.beads/PRIME.md`, `tools/policy/`, `tools/lib/policy.ts` or the gate | `check:prompts`: every skill and agent opens with the line `CLAUDE.md` requires, and every prompt is within its word budget; `check:prompts:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a mise config or `mise.lock`, a workflow, the Dockerfile, a version file at the root, `tools/policy/`, `tools/lib/policy.ts`, `tools/lib/git-env.ts`, the gate, `package.json` or the lockfile | `check:toolchain`: every pin exact and in the lockfile for every platform the policy names, one mise for CI and the dev container, no second home, and no mise config but `mise.toml`; `check:toolchain:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/policy/`, `tools/policy.json`, `tools/lib/policy.ts` or the gate | `check:policy`: every policy record carries its header and a `Means` beside every constant, no key has two homes, the directory's README names each record, and the retired single file has not come back; `check:policy:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` | `citations:check`: every line and section pointer in every tracked text file resolves. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the citations gate, `tools/lib/`, `CLAUDE.md` or a prompt file | `citations:selftest`: the citations gate, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/citations/`, `tools/lib/`, `tools/policy/`, `package.json` or `package-lock.json` | `citations:support:selftest`: the citation-support advisory over a stubbed judge. The advisory itself reads a token and the network, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a hook, a worktree script, `.vale.ini` or `.gitignore` | `worktree:selftest`: the worktree hooks and the guard, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `.vale.ini`, `.vale-styles/Layout/` or its selftest | `vale:selftest`: the `Layout` style's rules over fixtures, and every styled section of `.vale.ini` applying it. It runs `vale`, which mise installs on the CI runner too, so it is a `.github/workflows/verify.yml` step as well. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a hook, the citations gate, `tools/lib/` or what `check:jobs` reads | `gate-summary:selftest`: the Stop hook's verdict over untracked and ignored files, and the checkout it gates; and the checkout the edit hook places an edit in. | `git-hooks.yml` (`pre-push`) |
| `git push` | `counts:check` re-derives every value in `count-index.md` from the source the index names for it; `counts:selftest` holds the gate to its fixtures when the gate changes. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the register, `CLAUDE.md` or the gate | `check:register` holds the register's header, summary table and dates to its entries, and its selftest holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `openspec/`, a skill, an agent, `tools/policy/`, `tools/lib/policy.ts`, the gate or the pinned CLI | `openspec:check` validates the living spec and every active change, proves each change applies, holds every scenario and NFR requirement to a unique ID that no archived change gave another title (never reused, within the limits the gate's header names), and holds every prompt that spells the change label to `tools/policy/vocabulary.json`; `openspec:selftest` holds the gate. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes a workflow under `.claude/workflows/`, a tool-less agent (`.claude/agents/test-builder.md`, `prompt-case-author.md`, `prompt-case-answerer.md`), a stored case under `.claude/prompt-cases/`, `tools/policy/`, `tools/lib/policy.ts`, the trace or verification-report renderers or its selftest | `workflows:selftest`: the change-build review workflow, the prompt review workflow, the prompt cases' authoring workflow and the change-verify trace workflow, run against stubbed agents with the policy's review sizes, red-first kinds, independent-test keys, prompt-review threshold, case lenses and repetitions, trace sizes and skeptic counts. Beside them run the trace's renderers on its result, the verification report's on a stubbed fresh run, every stored case through both prompt workflows, and the tool-less agents' tools lines. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/fresh-run.mjs`, the test runner, the reader, `scripts/lib/`'s test-dirs, tasks and bin-path helpers, the trace gate, `tools/lib/` or `tools/policy/` | `tests:fresh:selftest`: the verifier's fresh run over a fixture repository, `npm ci` stubbed. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/code-graph.mjs`, `tools/lib/` or `tools/policy/` | `code-graph:selftest`: the code-graph script over a fixture repository, graphify, its MCP server and `claude` stubbed. The script itself reads a language model and your plan, so it runs in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/calculator/`, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `calculator:test`: the calculator's scenarios, each a test named for its ID, under Node's own test runner, with no matched file allowed to declare none, every test's `// trace:` metadata read, and every test the runner reports held to the tests that reader sees. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/calculator/`, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `calculator:test:independent`: the test-builder's contract tests and build-time fitness functions under `apps/calculator/test/independent/build/`, held as `calculator:test` holds the rest, and a pass that says so while there is none. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/test-dirs.mjs` or `tools/policy/`, `tools/lib/policy.ts` | `tests:selftest`: the test runner, negative-tested. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `tests:trace:selftest`: the test-trace reader and its hash, negative-tested, with one archive by the pinned OpenSpec CLI. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `openspec/`, `apps/`, `artifacts/trace/`, the trace gate, `tools/lib/`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `package.json` or the lockfile | `trace:check`: the traceability record re-derived and diffed, and every rule the header of `tools/trace/trace.ts` holds, the ratchet baseline among them. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the trace gate, `tools/lib/`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `package.json` or the lockfile | `trace:selftest`: the trace gate, negative-tested over fixture repositories, with trial archives by the pinned OpenSpec CLI, whose count the job's comment in `git-hooks.yml` gives with its cost. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `artifacts/coupling/`, the co-change gate, `tools/lib/`, `tools/policy/` or `package.json` | `coupling:check`: the co-change map re-derived through the trunk commit it records and diffed, that commit held to `origin/main`, and a note of how many pull requests landed after it. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the co-change gate, `tools/lib/`, `scripts/hooks/_shared.mjs`, `scripts/lib/tasks.mjs`, `tools/policy/` or `package.json` | `coupling:selftest`: the co-change gate, negative-tested over fixture repositories built from its ratified history. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `tools/harness/`, `tools/lib/`, `scripts/lib/tasks.mjs`, `package.json` or the lockfile | `harness:selftest`: the harness assessment's core over fixture repositories and its graph half over fixture graphs. The two commands write a local report or read the local code graph, so they run in no job. | `git-hooks.yml` (`pre-push`) |
| `git push` | `tests:inventory:check`: no test removed, skipped or weakened since the merge base with `origin/main` without an architect decision in a commit's trailer. It has no glob, since a push that only rewords a commit message can change its verdict. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `scripts/check-test-inventory.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/lib/git-env.ts`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `tests:inventory:selftest`: the test-inventory gate, negative-tested over doctored test files and fixture repositories. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes `apps/`, `artifacts/thresholds/`, the thresholds gate, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `thresholds:check`: the changed code's coverage and its Routines' mutation score held to the policy's thresholds, and the ratchet baseline. The Commands' run is a `.github/workflows/verify.yml` step alone. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the thresholds gate, `scripts/run-tests.mjs`, `scripts/test-trace.mjs`, `scripts/lib/bin-path.mjs`, `scripts/lib/tasks.mjs`, `scripts/lib/test-dirs.mjs`, `tools/policy/`, `tools/lib/policy.ts`, `package.json` or the lockfile | `thresholds:selftest`: the thresholds gate, negative-tested over a fixture repository, with StrykerJS's tap and command runners. | `git-hooks.yml` (`pre-push`) |
| `git push` that changes the reviewer's script, `tools/policy/`, `tools/lib/policy.ts`, a workflow, the reviewer's agent, `package.json` or the lockfile | `pr-review:check`: the reviewer's workflow, agent and policy agree; `pr-review:selftest`: its decisions over fixtures, and the check over doctored copies. | `git-hooks.yml` (`pre-push`) |
| A pull request, a push to `main`, or a merge the reviewer made | Every gate that reads only committed files, cheapest first. It trusts none of the faster tiers. After a reviewer's merge it runs by dispatch, since that merge starts no push run. | `.github/workflows/verify.yml` |
| A `verify` run ends, a person applies the approval label, every 15 minutes, or by hand | The reviewer takes one action, one run at a time: it merges a pull request whose verdict allows it, or reviews the oldest head that passed `verify` and has no verdict, and runs again while more are waiting. | `.github/workflows/pr-review.yml` |
| The dev container starts | `npm ci` when the lockfile moved, the git hooks, and the tracker's hydration; each step warns and carries on. It warns, too, while a tool `mise.toml` pins is missing from the image, which it never installs, and while Vale cannot load `.vale.ini`, and runs no `vale sync`. | `.devcontainer/entrypoint.sh` |

## What is still a placeholder

 A comment of the form `kit <section> · ADAPT` or `kit <section> · WRITE`, in any file, says what
  to write there and when to delete the comment. List the files that carry one with
  `git grep -l -E "kit [0-9.-]+ · (ADAPT|WRITE)"`.

## P.S.

This page describes and points; it holds no rule. The rules an agent follows are in `CLAUDE.md`.
The status of work is in `bd`, never here.
Where this page and a file it points at disagree, that file wins and this page is corrected.