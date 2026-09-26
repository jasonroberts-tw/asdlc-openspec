# The decision register

One file of numbered decisions (`D-NN`) and risks (`R-NN`). A decision that is not
written down is re-argued from the losing side the next time an agent meets it; one that is written
here is not re-litigated by any agent (`CLAUDE.md` § Decisions live in the register). **When a
document and this register disagree, the register wins**, and the document is what needs correcting.

<!-- kit 2.1-1 · ADAPT: the one entry below is true of any repository bootstrapped from the starter
     kit. It is dated 1970-01-01 because the kit cannot know the day you adopted it. Replace that
     date with yours in BOTH places it appears (the status line's parenthetical and the entry's
     Recorded line; `npm run check:register` holds the two to each other), name the issue that
     carried the adoption, and delete this comment. Your own first decision is D-02. -->

**Status: every decision from D-01 to D-08 is recorded and applied (D-01 added 1970-01-01; D-02 and D-03 added 2026-09-23; D-04, D-05 and D-06 added 2026-09-24; D-07 added 2026-09-25; D-08 added 2026-09-26).**

> The status line and the table below are a summary of the `### D-` headings, never the reverse:
> update them from the headings, and never delete a line to make the gate pass. The range
> `D-01 … D-08` is checked by `npm run check:register`, which reads those headings, the table and each
> entry's Recorded line, in both directions. Adding a decision means a new heading, a new table row, a
> new clause in the status line's parenthetical and a new bound in the two places above, in one change.
> No other file states the range: a file that cites this register cites it without a bound, because a
> copy that is right today is the copy that goes stale next.

## How an entry is written

Every entry has the same skeleton, in this order:

```text
### D-NN · <title>

**Recorded YYYY-MM-DD**, carried by <the issue in the task store that carried it>.

**Builds on / amends:** <the ids this entry builds on or amends, or "nothing">.

**Decision.** <what was decided, stated so that it can be followed without reading the rest>.

**Why.** <the reason, and the alternative that lost>.

**What changed.** <the file-level record: each file added, changed, moved or deleted>.

**Figures.** <every figure the entry states, each with the command that re-derives it beside it;
or "none">.
```

A risk is `### R-NN · <title>` with the same skeleton, **Risk** in place of **Decision**.

## How an entry changes

An entry is never rewritten. A later decision that changes it adds a dated blockquote under each
entry it changes, in the form `> **Amended YYYY-MM-DD by D-NN.** <what changed>`, and lists every
entry it amended in its own body. A superseded entry keeps its heading, marked superseded, so an id
cited anywhere still resolves. A withdrawn risk keeps its id, which is never reused, and is never
reported as closed or met: it was withdrawn, and the entry says why.

## Decisions — recorded and applied

| Id | Decision | Applied as |
|---|---|---|
| **D-01** | This repository adopts the starter kit's conventions | `CLAUDE.md`, this register, and the files the kit's bootstrap laid down |
| **D-02** | Product work runs as OpenSpec-format changes, tracked in `bd` | The `change-*` skills, `openspec/`, the `openspec:check` gate, and the generated `openspec-*` skills deleted |
| **D-03** | The workflow's constants live in `tools/policy.json`, starting with the change label | `tools/policy.json`, the key cited by every prompt that spells the label, and `openspec:check` holding them to it |
| **D-04** | The repository carries a demo product, a calculator served on loopback only | `apps/calculator/`, served by `npm run calculator:serve` on `127.0.0.1` alone; its tests as the `calculator-test` pre-push job and a CI step; and the worktree briefing's port paragraphs |
| **D-05** | A prompt review runs in the background, and lives in its own pull request rather than in a file | `CLAUDE.md` § Prompt reviews, the `continuous-prompt-improvement` agent, and `docs/prompt-reviews/` and every `Reviewed:` trailer deleted |
| **D-06** | The learning loop is retired; a run's labels in the tracker show what recurs | `tools/outcomes/` and `artifacts/outcomes/` deleted with their scripts and jobs; three label vocabularies in `tools/policy.json`; `CLAUDE.md` § The task store and § Product work runs as OpenSpec-format changes; `change-finalize`'s report and the prompt reviewer's analysis read the counts |
| **D-07** | A reviewer merges each pull request that satisfies the issues it carries, one at a time | `.github/workflows/pr-review.yml`, the `pr-reviewer` agent and `scripts/pr-review.mjs`; the `prReview*` keys of `tools/policy.json`; `CLAUDE.md` § Git workflow; the `bead` and `change-finalize` skills; `verify.yml` dispatched after each merge |
| **D-08** | A run leaves its analysis in the tracker, and one review reads every pending analysis as a batch | `CLAUDE.md` § Prompt reviews; the `continuous-prompt-improvement` agent and `.claude/workflows/review-prompts.js`, held by `workflows:selftest`; the four `promptReview*` keys of `tools/policy.json`; `bead` § 8 |

## Risks

| Id | Risk | Held by |
|---|---|---|
| **R-01** | Anything holding a maintainer's credentials, an agent included, can approve a high-risk pull request | `CLAUDE.md` § Git workflow and review; no guard yet (`asdlc-openspec-g1b`) |

## The entries

### D-01 · This repository adopts the starter kit's conventions

**Recorded 1970-01-01**, carried by <the issue in the task store that carried it>.

**Builds on / amends:** nothing; this is the first entry.

**Decision.** This repository is worked in by agents under the conventions laid down from the starter
kit: a rule an agent must follow has exactly one home, a tracked file; every task is an issue in the
task store; decisions are recorded in this register and the register wins a disagreement; and the
same checks run at four latencies, of which a slower tier never trusts a faster one.

**Why.** Each convention was taken because of the failure it prevents, and `CLAUDE.md` states that
failure beside the rule. Adopting them as one recorded decision means a later change to any of them is
an amendment here, with its reason, rather than a quiet edit to a prompt.

**What changed.** `CLAUDE.md` and `AGENTS.md` at the root; this file; and every file
`KIT-CHECKLIST.md` listed as laid down on the day of the bootstrap. The checklist itself is deleted
once it is worked through, and the commit that added these files is the lasting record.

**Figures.** None.

> **Amended 2026-09-24 by D-05.** `CLAUDE.md` § Prompt reviews, as the kit laid it down, no longer holds. A review is no longer kept in a file under `docs/prompt-reviews/` and appended to on every run, and a prompt no longer carries a `Reviewed:` trailer. The reviewer runs in the background, nobody waits for it, and a review that proposes a change is the description of its own pull request.

> **Amended 2026-09-24 by D-06.** The kit's learning loop, its sections 2.3 and 2.4, is retired: `tools/outcomes/`, `artifacts/outcomes/` and their scripts and jobs are deleted. `CLAUDE.md` § A program proposes; only a person promotes keeps its principle and no longer names the loop. What recurs across runs is read from labels in the tracker instead.

### D-02 · Product work runs as OpenSpec-format changes, tracked in bd

**Recorded 2026-09-23**, carried by `asdlc-openspec-95a`.

**Builds on / amends:** D-01, which it builds on and does not amend: every task is still an issue
in the task store, and a change's tasks are issues like any other.

**Decision.** Product work, meaning a change to what the product does stated as requirements, runs
as a change in OpenSpec's on-disk format through six skills of this repository's own, in order:
`change-propose`, `change-design`, `change-plan`, `change-build`, `change-verify` and
`change-finalize`.

1. **One change is one worktree and one pull request.** The worktree is `agent/<change>`, cut by the
   one worktree script. The branch carries the change's proposal, its delta specs, its code and its
   archive, and they land together.
2. **The change lives at `openspec/changes/<change>/`**: a `proposal.md`, delta specs under
   `specs/<capability>/spec.md`, and a `design.md` only when the change needs one. A change carries at
   least one delta. Work that changes no requirement is not a change; it goes through the `bead`
   skill.
3. **Each change is one `bd` epic labelled `spec-change`, and its tasks are the epic's children.**
   There is no `tasks.md`. An issue that seeds a change becomes its epic rather than being closed.
   The general sweeps of the queue (`bd ready` in the `bead` skill and the `fan-out-work` agent)
   exclude the label, and `change-build` works the change's own tasks in its worktree. An issue
   discovered along the way is filed without the label, linked `discovered-from` the epic, so it joins
   the general queue. Until `tools/policy.json` exists, this entry is the one home of the label's
   spelling.
4. **The OpenSpec CLI is a pinned devDependency, used for two commands only**: `openspec validate`
   and `openspec archive`. `openspec init` and `openspec update` are not run here.
   `openspec/config.yaml` names the schema and nothing else: the rules for writing a proposal, a
   delta or a design live in the skills.
5. **The archive runs on the change's branch, before the merge.** The living spec (`openspec/specs/`)
   is hand-maintained source that the archive edits, not generated output.
   `openspec/changes/archive/` records what each change proposed; it is history, not a retirement
   under `docs/retired/`.
6. **A change's pull request is rebase-merged.** `npm run worktree:gc` can then prove the branch is
   in the trunk; after a squash merge it keeps the branch.
7. **The ten skills `openspec init` generated under `.claude/skills/openspec-*/` are retired**, and
   `npm run openspec:check` refuses their return.

**Why.** Product work needs two things: a record of requirements that outlives the change that set
them, and a proposal a person reviews before the build starts. OpenSpec's delta specs and living spec
are that record, and `openspec archive` merges a delta into the living spec deterministically. Three
alternatives lost:

- **OpenSpec's own workflow skills.** They track a change's tasks in a `tasks.md` checklist, which
  `CLAUDE.md` § The task store forbids. `openspec update` rewrites them from each machine's global
  configuration, which no project file can pin. Their archive skill bypasses the CLI's merge with a
  plain `mv`.
- **A custom OpenSpec schema whose task artifact files issues in `bd`, with forked skills.** The CLI's
  artifact status, apply progress and archive gate read checkboxes only. The tracker would then need
  a checkbox mirror kept in step by hand, and the schema commands are marked experimental.
- **Writing the delta merge here.** It would be an emitter-sized tool to own, for a merge the pinned
  CLI already performs.

Archiving after the merge also lost. A branch cannot push to `main`, so it would take a second
worktree and a second pull request per change, and the trunk would hold unarchived changes in
between.

**What changed.**

- **This entry.**
- **`CLAUDE.md`:** § Product work runs as OpenSpec-format changes points here and at the skills. § Prompt reviews now says what the basename of a skill's review file is.
- **`.claude/skills/change-{propose,design,plan,build,verify,finalize}/SKILL.md`:** added.
- **`.claude/skills/openspec-*/`:** deleted.
  - `git log -1 --diff-filter=D --format=%H -- .claude/skills/openspec-propose/SKILL.md` names the deleting commit.
  - `git show <that commit>^:<path>` recovers any of its files.
- **`openspec/config.yaml`:** kept from `openspec init`, with its commented examples replaced by the reason it holds nothing but the schema.
- **`openspec/README.md`:** added.
- **`package.json` and `package-lock.json`:**
  - `@fission-ai/openspec` is pinned.
  - Its install script is denied in `allowScripts`; it only prints a shell-completion tip.
  - The scripts `openspec:check` and `openspec:selftest` are added.
- **`scripts/check-openspec.mjs`:** added, run by `lefthook.yml` and `.github/workflows/verify.yml`.
- **`tools/citations/scan.ts`:** `openspec/changes/archive/` is history.
- **`.claude/skills/bead/SKILL.md` and `.claude/agents/fan-out-work.md`:** the general sweep excludes the label.
- **`.claude/worktree-CONTEXT.md.tmpl`:** the merge window binds only a session nobody is directing.
- **`README.md`, `scripts/README.md` and `docs/README.md`:** one row each.

Retirement checklist for the deleted skills, each item done in this change:

- **Their references are gone.** `git grep -n -E "opsx|openspec-(apply|archive|continue|explore|ff|new|propose|sync|update|verify)"` finds only this entry and the gate that refuses the directories.
- **Their return is refused** by `openspec:check`, with the reason naming this entry.
- **No README row named them**, so none was removed.

**Figures.** Ten generated skills deleted. `git log --diff-filter=D --name-only --format= -- '.claude/skills/openspec-*/SKILL.md'` lists them.

> **Amended 2026-09-23 by D-03.** Item 3's last sentence no longer holds: `tools/policy.json` exists, and the label's spelling lives there under `specChangeLabel`. Every skill and agent that spells the label cites that key, and `npm run openspec:check` holds them to its value.

### D-03 · The workflow's constants live in tools/policy.json, starting with the change label

**Recorded 2026-09-23**, carried by `asdlc-openspec-4gp`.

**Builds on / amends:** amends D-02, whose item 3 made that entry the home of the `spec-change` label's spelling until `tools/policy.json` existed. Builds on D-01, whose conventions include `CLAUDE.md` § Three kinds of file, and never a fourth.

**Decision.** `tools/policy.json` is the workflow's policy file. A constant that a prompt or a tool of the workflow reads, and that belongs to no one tool, lives there under a key. Beside it sits a `<key>Means` sibling stating what the value decides, where it is changed, and when and why it was decided.

1. **Its first key is `specChangeLabel`,** the spelling of the label D-02 puts on a change's epic and on every one of its tasks.
2. **A skill or agent that spells the label cites the key.** `npm run openspec:check` refuses one that spells it without citing the key, and one that cites the key but spells another value.
3. **The file declares no `intervention` block.** The run-outcome schema's intervention enum is still the starter kit's starting vocabulary, and nothing but the schema reads it. `npm run outcomes:record:selftest` now ties the two only where the file declares the block, as `tools/outcomes/paths.ts`, the selftest's own header and the schema's description already said.

**Why.** D-02 had to spell the label somewhere, and said the register would hold it until the policy file existed. A register entry is never rewritten, so a spelling kept there could change only by a new decision, and no tool reads the register for it. Meanwhile seven prompts spelled the label and nothing held them to each other. Three alternatives lost:

- **`tools/outcomes/policy.json`,** which already exists. Its `whatItDoesNOTDo` excludes the workflow's own constants, and the label is not the learning loop's.
- **Writing the whole file at once,** moving every constant the prompts and tools read, as `asdlc-openspec-4wk` asked; that issue was closed without the file being written. This entry moves one constant and gives the file its shape. The next constant moves in the change that needs it.
- **Copying the four intervention codes into the file** so that the tie as written would pass. That would be a second copy of a placeholder list, with meanings invented for codes no run has used.

**What changed.**

- **`tools/policy.json`:** added.
- **This register:** D-02 carries the amendment above; the status line, the blockquote's bound and the decisions table carry D-03.
- **`.claude/skills/{bead,change-propose,change-plan,change-build,change-verify,change-finalize}/SKILL.md` and `.claude/agents/fan-out-work.md`:** each cites `specChangeLabel` where it spells the label.
- **`scripts/check-openspec.mjs`:** refuses a policy file without the key or its `Means` sibling, a prompt that spells the label without citing the key, and a prompt that cites the key and spells another value. Its selftest breaks each.
- **`tools/outcomes/record.selftest.ts`:** the intervention tie skips a policy file that declares no `intervention` block, with a case holding that.
- **`lefthook.yml`:** the `openspec` job's glob adds `tools/policy.json` and `.claude/agents/**`, and the `outcomes-record-selftest` job's adds `tools/policy.json`.
- **`tools/README.md`, `scripts/README.md` and `README.md`:** one row added or reworded each.

**Figures.** Seven prompts spell the label: `git grep -l -w spec-change -- .claude` lists them.

> **Amended 2026-09-24 by D-06.** Item 3 and the first alternative no longer apply: the run-outcome schema, `tools/outcomes/record.selftest.ts` and `tools/outcomes/policy.json` are deleted, so no intervention enum exists to tie to, and `outcomes-record-selftest` is no longer a job. `tools/policy.json` now also carries `assetLabels`, `foundAtLabels` and `rerouteLabels`, which no gate holds yet.

### D-04 · The repository carries a demo product, a calculator served on loopback only

**Recorded 2026-09-24**, carried by `asdlc-openspec-zgh`. The maintainer accepted it on 2026-09-23, during the `change-design` stage of the change `add-calculator-web-app`.

**Builds on / amends:** amends nothing. Builds on D-01, whose gate ladder (`CLAUDE.md` § The gate ladder) it reads without amending: a test that starts a server from committed files and talks to it over loopback is not "a network" in that section's sense. Builds on D-02, whose lifecycle runs the change that carries this entry.

**Decision.** `apps/calculator/` is a demo product: a calculator page, the local server that hands it to a browser, and the tests that hold both to their specs.

1. **`npm run calculator:serve` is the one thing in this repository that listens on a port.** It listens on `127.0.0.1` alone, never on another interface, and only when a person starts it; it serves until that person stops it. No hook, job or CI step runs the script.
2. **The calculator's tests may bind loopback ports.** They bind free ports on `127.0.0.1`, and the server's default port for a moment while it is free. A test that starts that server from committed files and talks to it over a temporary loopback port reads only committed files in the sense of `CLAUDE.md` § The gate ladder, so `calculator:test` is a pre-push job and a `.github/workflows/verify.yml` step.
3. **The worktree briefing says so.** `.claude/worktree-CONTEXT.md.tmpl` names `calculator:serve` as the one listener. In a worktree, `.worktree/ports.env`'s `APP_PORT` is the port to pass as `PORT` (`PORT=<APP_PORT> npm run calculator:serve`), so two worktrees serving at once do not collide. The server does not read that file: `PORT` is the only way a port reaches it. `SB_PORT` stays reserved and unused, and wanting a port for anything else still means stop.

**Why.** D-02's lifecycle had its skills and its gate and nothing to act on: `openspec/specs/` was empty, and no change had yet run through every stage. `asdlc-openspec-zgh` asked for one small, real change run end to end. A calculator run on one's own machine is small enough to finish in one pass and still has behaviour worth specifying, and it leaves a product that later changes can modify. Three alternatives lost:

- **A static page opened from disk, with no server.** Browsers block ES modules loaded from `file://`, so the page would need a bundler, which the change's spec rules out by requiring no build step, or classic scripts, which export nothing for Node's test runner to import, so the tests could no longer load the files the browser runs.
- **Treating loopback as network.** Under the gate ladder that would keep every server test out of pre-push and CI, the loopback-only and path-containment scenarios among them. Those tests bind nothing but `127.0.0.1` and read nothing but committed files, and they are the scenarios a server meant for one machine most needs held on every push.
- **No register entry.** The briefing called a port-serving application something this repository "deliberately does not contain". Reversing that is a decision, and a quiet edit to the briefing would have left the next reader to re-argue it.

The server reading `.worktree/ports.env` itself also lost: the spec names `PORT` and a default, and nothing else, so a worktree passes `APP_PORT` through `PORT`.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-04.
- **`apps/calculator/`:** added. `public/` holds the page and its logic (`index.html`, `style.css`, `main.js`, `app.js`, `calculator.js`); `server.js` is the request handler and `serve.js` the command; `test/` holds `calculator.test.js`, `page.test.js`, `server.test.js` and `serve.test.js`. `apps/calculator/`, `public/` and `test/` each have a `README.md`.
- **`package.json` and `package-lock.json`:** the scripts `calculator:serve` and `calculator:test`; `jsdom` pinned exactly as a devDependency, with the packages it pulls in.
- **`lefthook.yml`:** the pre-push job `calculator-test`, with its measured cost; `apps/**` added to the globs of `check-jobs` and `check-jobs-selftest`.
- **`.github/workflows/verify.yml`:** a step running `npm run calculator:test`.
- **`scripts/check-jobs.mjs`:** `apps/` is a third root for the paths a script names; a path is read after a quote as well as after whitespace; a glob is held to matching a file, and one written with `**` or `[...]` is refused as a form the gate does not read; and `calculator:serve` is a named exception, since it never returns. Its selftest gains a case for each path and glob rule: a missing `apps/` path, bare and quoted; a glob that matches no file in its directory, and one whose directory was renamed; a `**` glob, refused; and a `?` glob that matches a file, passed. Its control must now read at least one `apps/` path and one glob. No case was added for the `calculator:serve` exception: the control holds it, since the undoctored copy fails without the entry. Its older cases no longer name a fixture file this repository does not have.
- **`README.md`:** rows in § How it is laid out, § Working here, § Where to read next and § What runs automatically, where the `check:jobs` row also names `apps/`; and the `calculator` sub-section of § The npm scripts.
- **`openspec/changes/add-calculator-web-app/`:** added: the proposal, the design, and the delta specs of `calculator` and `calculator-local-server`.
- **`.claude/worktree-CONTEXT.md.tmpl`:** the port paragraphs, which said nothing here serves a port, name `calculator:serve` as the one thing that does and `APP_PORT` as its port in a worktree, and cite this entry.
- **`scripts/new-worktree.sh` and `scripts/render-worktree-context.mjs`:** the printed ports line and the allocator's comment no longer call both ports unused.
- **To come, in `change-finalize`:** the archive, run on this branch before the merge (D-02, item 5), writes the living specs `openspec/specs/calculator/spec.md` and `openspec/specs/calculator-local-server/spec.md` and moves the change under `openspec/changes/archive/`.

**Figures.** None.

### D-05 · A prompt review runs in the background, and lives in its own pull request rather than in a file

**Recorded 2026-09-24**, carried by `asdlc-openspec-64b`. The maintainer chose each part below on 2026-09-24, when the issue was worked.

**Builds on / amends:** amends D-01, whose conventions included `CLAUDE.md` § Prompt reviews as the starter kit laid it down. Builds on D-02, whose `change-*` skills are among the prompts this entry strips of a trailer.

**Decision.** How a run of a prompt is reviewed, and what the review leaves behind.

1. **The reviewer runs in the background, and nobody waits for it.** The session that ran the prompt writes its analysis of the run under `.scratch/` in its own worktree, since the harness refuses a background session's edit in the shared checkout. It then leaves the worktree, keeping it, and from the primary checkout launches `continuous-prompt-improvement` with `claude --bg --agent`, naming the analysis by its path. Agent view lists that session, and its supervisor keeps it running after the launcher ends. The launcher neither waits for the review nor relays it. `CLAUDE.md` § Prompt reviews holds the command, and every caller points there.
2. **A review that proposes a change is a pull request.** The reviewer makes the change in its own worktree and opens a pull request against `main`. The review is that pull request's description, and a person decides whether it merges.
3. **A review that proposes nothing leaves nothing.** It edits no file, makes no worktree and opens no pull request, and no run is counted anywhere.
4. **No review is a file in this repository, and no prompt carries a `Reviewed:` trailer.** The earlier reviews of a prompt are the descriptions of the pull requests that changed it, and the agent's file says how to find them.
5. **`docs/prompt-reviews/` is deleted outright**, with its README and every review in it. `git show` recovers them (below).

**Why.** The maintainer asked for three things on 2026-09-23, after the review of the `change-propose` run on `add-calculator-web-app`: to "launch it as a background fire and forget managed by the agent view supervisor"; "if no changes are suggested, don't make edits just to track number of runs"; and to "stop adding extra markdown files with the content of the [review], that can live in the PR description". Under the kit's rule, every review edited two files even when the prompt did not change: it appended a dated section to the review file, and it extended the trailer's list of runs. The launching session also waited for the reviewer and relayed its report. Four alternatives lost:

- **An in-process subagent, started in the background by the Agent tool.** Agent view shows no row for it, and it ends with the session that started it, so the supervisor does not manage it.
- **Moving the review files to `docs/retired/`.** They would have stayed findable in the tree. Nothing live reads them once the trailers go, and `git show` recovers them, so the maintainer chose to delete them.
- **A trailer citing the pull request of the latest review.** It would change with every applied review. `git log` on the prompt finds the same pull requests, so the maintainer chose to drop trailers.
- **Deleting the directory while review pull requests were still open.** Each would have re-created it on merge. This change waited for them to land, and deletes the reviews they added.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-05; D-01 carries the amendment above.
- **`CLAUDE.md`:** § Prompt reviews is rewritten: the analysis written in the launcher's worktree, the launch from the primary checkout, and what a review leaves behind. The first draft had the launcher write the analysis in the primary checkout; the harness refused that edit from this change's own background session, so the file stays in the worktree it came from.
- **`.claude/agents/continuous-prompt-improvement.md`:** rewritten. It says what the reviewer reads first and when it stops, how it finds earlier reviews, and the pull request it opens. The shape of a review moves here from `docs/prompt-reviews/README.md`.
- **`.claude/skills/bead/SKILL.md`:** § 8 launches the review as `CLAUDE.md` § Prompt reviews says, before the report, and the report names the reviewer's session. Its `Reviewed:` trailer is dropped.
- **`.claude/skills/change-{propose,design,plan,build,verify,finalize}/SKILL.md`:** each `Reviewed:` trailer is dropped.
- **`docs/prompt-reviews/`:** deleted: `README.md`, and the reviews of `bead` and of every `change-*` skill.
- **`tools/citations/memory.ts`, `check.ts` and `selftest.ts`:** the memory rule's history exemption for `docs/prompt-reviews/` goes with the directory. So do `MEMORY_HISTORY`, which held nothing else, and the selftest's case for it. The gate's summary names what the memory pass skips as binary, the one reason left for skipping a file in its roster.
- **`scripts/check-prompts.mjs`:** its header no longer names a `Reviewed:` trailer among what it does not check, and says why none is refused.
- **`README.md` and `docs/README.md`:** the sentence and the rows that named `docs/prompt-reviews/`.
- **Left as it is:** `KIT-CHECKLIST.md`, the bootstrap's record of what it laid down on the day, still names `docs/prompt-reviews/` and the trailer rule.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n prompt-reviews` finds this entry, the header of `tools/citations/memory.ts` saying the exemption is gone, and `KIT-CHECKLIST.md`.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- docs/prompt-reviews/README.md` names the deleting commit, and `git show <that commit>^:docs/prompt-reviews/<file>` recovers any of them.
- **Their return is not refused by a gate.** Review holds it, as it holds a trailer's return.

**Figures.** Seven review files and the directory's README deleted: `git log -1 --diff-filter=D --name-only --format= -- docs/prompt-reviews/` lists them. Seven `Reviewed:` trailers dropped: `git grep -n "^Reviewed:" <the deleting commit>^ -- .claude` lists them.

> **Amended 2026-09-26 by D-08.** Items 1 and 3 no longer hold as written. A run no longer launches a reviewer on itself: it writes its analysis as a note in the tracker, and one review over every pending analysis starts when a threshold holds, launched by the run whose closing step finds it due, from the primary checkout, as `review-prompts`. A review that proposes nothing still edits no file and opens no pull request, but it appends a read line to each analysis it read, so a run is now counted in the tracker. Items 2, 4 and 5 stand.

### D-06 · The learning loop is retired; a run's labels in the tracker show what recurs

**Recorded 2026-09-24**, carried by `asdlc-openspec-6dn`. The maintainer chose each part below on 2026-09-24, first from the recommendation that answered whether `asdlc-openspec-ri0` had happened for `add-calculator-web-app`, then from a second opinion on that recommendation.

**Builds on / amends:** amends D-01, whose conventions included the starter kit's learning loop (its sections 2.3 and 2.4) and `CLAUDE.md` § A program proposes; only a person promotes as the kit laid it down. Amends D-03, whose item 3 and first alternative rest on files this entry deletes. Builds on D-02, whose epics carry the send-back labels below, and on D-05, whose reviewer is one of the two readers of the counts.

**Decision.** The kit's learning loop, one record per run and reports derived from the records, is retired. What recurs across runs is read from labels a run leaves in the tracker.

1. **The loop is deleted outright** (`docs/retired/README.md` § The three dispositions, *Delete it outright*): `tools/outcomes/` and `artifacts/outcomes/`; the scripts `outcomes`, `outcomes:check`, `outcomes:selftest`, `outcomes:record:selftest` and `outcomes:propose`; their three pre-push jobs and three CI steps; and their rows in the hooks' tables of emitter-owned paths. `tools/lib/bd-launcher.ts` stays: `scripts/check-beads.mjs` imports it.
2. **An issue a run finds carries where it was found and what it would fix.** An issue filed `discovered-from` the issue or epic a run was working carries, beside its `repo:` label, the `foundAtLabels` label for the stage that found it and one `assetLabels` label for each kind of file it would change. The pair is the kit's recurrence signal (`KIT-CHECKLIST.md` § Step 21), and `bd count -l <found-at label> --by-label` counts it. `CLAUDE.md` § The task store holds the rule.
3. **A change's epic carries each stage it was sent back to.** When a later stage revises the proposal or a delta spec, the design, or the epic's tasks, or `change-verify` sends work back to `change-build`, the epic gets that stage's `rerouteLabels` label. That rework lands as commits inside the change and never becomes an issue, so rule 2 cannot see it. `CLAUDE.md` § Product work runs as OpenSpec-format changes holds the rule, and each skill that sends a change back points at it.
4. **The three vocabularies live in `tools/policy.json`**, each with its `Means` sibling (D-03). Prompts cite the keys and spell none of the values. No gate holds them yet; `asdlc-openspec-dzi` asks `beads:check` to refuse a found issue without them.
5. **The counts have two readers.** `change-finalize`'s report prints them (`.claude/skills/change-finalize/SKILL.md` § 9. Report), for the person who decides what is promoted; and the analysis a prompt review is handed ends with them (`CLAUDE.md` § Prompt reviews), so the reviewer can tell a finding that recurs from one seen once. Both report counts, never a rate.
6. **The first change is labelled after the fact, from evidence only.** Each of the 25 issues discovered from `asdlc-openspec-zgh` carries its asset labels. Fourteen carry a found-at label because their own text says which stage found them: nine the build, one the proposal, and four a review after the change ended. `asdlc-openspec-kce` is among the four: its text says it was observed while proposing and came to light in the prompt review of that run. The other eleven carry none: six can be placed only by inference from what they cite, four never say, and one names two stages. The epic carries all four send-back labels:
   - its spec was revised at design and during the build (`9e8f56e`, `d00e197`);
   - its design was revised during the build and at verify (`d00e197`, `fe1360a`);
   - two tasks were added after planning (`asdlc-openspec-zgh.8`, `asdlc-openspec-zgh.9`);
   - the re-run of `change-verify` sent `asdlc-openspec-zgh.9` back to the build.
7. **`asdlc-openspec-ri0` is closed, not done.** It asked `change-finalize` to write a record on every terminal path, complete, failed and blocked. `change-finalize` lands only a verified change, so no failed or blocked change reaches it, and the criterion could not have been met from there.

**Why.** The maintainer asked on 2026-09-24 whether `asdlc-openspec-ri0` had happened for `add-calculator-web-app`. It had not: `change-finalize` wrote no record, nothing called `tools/outcomes/write-record.ts`, and `artifacts/outcomes/records/` held no file, so every report had been derived from nothing. The loop's two jobs were covered elsewhere: prompts by the review of each run (D-05), and product behaviour by `change-verify` and the living spec (D-02). Defects a run found outside its own files were already issues in the tracker, filed by hand. The one thing only the loop offered was a view across runs, which, with one change archived and a floor of five records before a rate, it could not yet give. A second opinion then showed that labels on found issues alone would miss the calculator change's largest corrections. Its spec went from 30 scenarios to 47 during the build, and its design was amended twice at verify. Both landed as commits and neither became an issue. Five alternatives lost:

- **Wiring `ri0` as filed.** The criterion could not be met from `change-finalize` (item 7), `bead` and `fan-out-work` wrote no record either, and the schema's stage and asset lists were still the kit's placeholders.
- **Moving the loop to `docs/retired/`.** `retire-asset` moves a retired asset there, but nothing live reads TypeScript tools once their jobs go, and `git show` recovers them, as D-05 chose for the review files.
- **Asset labels alone,** the first recommendation. They count what a run files and miss the rework inside a change, which is what the send-back labels count.
- **The prompt reviewer as the only reader.** It proposes changes to prompts; a count of gate, environment or product fixes needs a person to read it.
- **A tool that tabulates the pairs.** `bd count -l <label> --by-label` gives them, and a tool would be the loop again in miniature.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-06; D-01 and D-03 carry the amendments above.
- **`tools/outcomes/` and `artifacts/outcomes/`:** deleted.
- **`package.json`:** the five `outcomes` scripts are removed.
- **`lefthook.yml`:** the jobs `outcomes-record-selftest`, `outcomes-check` and `outcomes-selftest` are removed.
- **`.github/workflows/verify.yml`:** the three `outcomes` steps are removed. Its list of retired steps says why a restored one would be wrong, and its list of deliberately absent steps no longer names the filing step.
- **`scripts/assert-not-hand-edited.mjs`, `scripts/hooks/_shared.mjs` and `scripts/hooks/check-emitted-drift.mjs`:** each table's one row, the loop's, is removed, and the table says so.
- **`scripts/check-jobs.mjs`:** `outcomes` and `outcomes:propose` leave the list of scripts with no job.
- **`tools/lib/bd-launcher.ts`:** its header marks the filing step as a retired caller.
- **`tools/policy.json`:** `assetLabels`, `foundAtLabels` and `rerouteLabels`, each with its `Means` sibling; its `gatedBy` and `whatItDoesNOTDo` no longer name the loop.
- **`CLAUDE.md`:** § The task store gains the found-issue labels; § Product work runs as OpenSpec-format changes gains the send-back label; § Prompt reviews ends the analysis with the counts; § A program proposes; only a person promotes is rewritten without the loop.
- **`.claude/skills/bead/SKILL.md` and `.claude/skills/change-build/SKILL.md`:** the filing command carries the labels. `bead` no longer names `outcomes:check`, and `change-build` labels the epic when it revises the spec, the design or the plan.
- **`.claude/skills/change-design/SKILL.md` and `.claude/skills/change-verify/SKILL.md`:** each labels the epic where it sends a change back.
- **`.claude/skills/change-finalize/SKILL.md`:** § 9. Report prints the counts.
- **`.claude/agents/continuous-prompt-improvement.md`:** says how to weigh the counts at the end of the analysis.
- **`README.md` and `tools/README.md`:** the loop's section, scripts and rows are gone; the guardrail row names the prompt reviewer.
- **Left as it is:** `KIT-CHECKLIST.md`, the bootstrap's record of what it laid down on the day, still names the loop's files, as D-05 left it naming the review files.

Retirement checklist, the disposition *Delete it outright* of `docs/retired/README.md` § The three dispositions:

- **Nothing live reads them.** `git grep -n -i -E "outcomes|learning loop|run-outcome"` finds this entry and the amendments above, D-03's own text, `KIT-CHECKLIST.md`, and comments that say the loop is retired: `.github/workflows/verify.yml`, the three hooks' tables, `tools/lib/bd-launcher.ts` and `tools/policy.json`, plus the pointer in `README.md` § The work, and what its runs leave behind. It also finds "outcomes" as a plain word in the header of `scripts/check-beads.mjs`, which is about something else.
- **The recovery.** `git log -1 --diff-filter=D --format=%H -- tools/outcomes/index.ts` names the deleting commit, and `git show <that commit>^:<path>` recovers any of its files. The kit's own `tools/bootstrap.mjs`, which wrote `KIT-CHECKLIST.md`, lays down a fresh copy unadapted to this repository; how it selects only sections 2.3 and 2.4 was not checked from here.
- **Their return is not refused by a gate.** Review holds it, and `.github/workflows/verify.yml` says why a restored step would be wrong.

**Figures.**

- 23 files deleted, 17 under `tools/outcomes/` and 6 under `artifacts/outcomes/`: `git log -1 --diff-filter=D --name-only --format= -- tools/outcomes/ artifacts/outcomes/` lists them.
- 2,197 lines in the 12 TypeScript files: `git grep -c "" <that commit>^ -- "tools/outcomes/*.ts"` gives each file's count.
- No record: `git ls-tree -r --name-only <that commit>^ -- artifacts/outcomes/records` prints nothing.
- One archived change: `git ls-tree --name-only <that commit>^ openspec/changes/archive/`.
- The calculator spec's scenarios, 30 before the build's revision and 47 after: `git grep -c "#### Scenario:" d00e197^ -- openspec/changes/add-calculator-web-app/specs/calculator/spec.md`, and the same at `d00e197`.
- The 25 issues discovered from the first change, and the labels each was given on 2026-09-24: `bd show asdlc-openspec-zgh` lists them under DISCOVERED, with the epic's own labels, and `bd show <id>` gives each one's. `bd count -l <found-at label> --by-label` counts them with every issue filed since, so it grows after this date.

### D-07 · A reviewer merges each pull request that satisfies the issues it carries, one at a time

**Recorded 2026-09-25**, carried by `asdlc-openspec-mi6`. The maintainer asked for it on 2026-09-25. They allowed the rules in the prompts to be updated, and responsibilities moved, to make it work.

**Builds on / amends:** amends no entry's text. Builds on:

- D-02, whose item 6 rebase-merges a change's pull request; the reviewer merges that way too.
- D-03, whose policy file holds the reviewer's constants.
- D-05, which it leaves as it stands: a prompt review's pull request cites no issue, so a person still decides whether it merges.

**Decision.** `.github/workflows/pr-review.yml` reviews each open pull request against `main`, one at a time, and merges each one that passes.

1. **One at a time.** Every run that reviews or merges shares one concurrency group, whose pending runs queue (`queue: max`) rather than cancel.
   - A run takes one action: a merge before a review, the oldest pull request first. It dispatches itself again while more are waiting.
   - No merge happens while `main`'s own `verify` run is anything but green.
   - A head is reviewed only once `verify` has passed on it.
2. **A pull request cites the issues it carries in its title**, as the ids in the parentheses that end it. A title that cites none is reviewed, and a person merges it. A prompt review's pull request is one of these.
3. **Claude Code judges, and decides nothing.** It runs as `.claude/agents/pr-reviewer.md`, with read-only tools and a read-only token, from a brief `scripts/pr-review.mjs` writes. It judges three dimensions:
   - **Correctness:** it reports every acceptance criterion of every cited issue as met, not met or unverifiable, with evidence.
   - **Maintainability:** it holds each changed file to the product rubric or the context-engineering rubric, as `prReviewContextPaths` assigns it.
   - **Blast radius and risk:** it judges who a mistake would reach and how far.
4. **`scripts/pr-review.mjs` decides**, by the `prReview*` keys of `tools/policy.json`:
   - a criterion the reviewer did not report counts as unverified;
   - a blocker or major finding fails maintainability;
   - risk is never below a floor computed from the changed paths and JSON keys. The floor covers CI, the reviewer itself, the rules and this register.
5. **What each outcome does.** Each is the `pr-review` status on the head and a comment on the pull request.
   - A failed dimension requests changes: a red status, which the author's watcher reads.
   - A criterion nobody can verify, a title with no issue, or high risk asks a person. The person merges it, or applies the approval label, and the reviewer then merges that head.
   - Otherwise the reviewer rebase-merges it and dispatches `verify.yml` on `main`, since a merge made with a workflow token starts no push run.
6. **The reviewer authenticates to Anthropic by workload identity federation, and no API key is stored.**
   - Only the review job requests `id-token: write`. The action exchanges that job's GitHub OIDC token for a short-lived Anthropic token.
   - The four ids are the repository's Actions secrets. The maintainer chose to keep them out of this public tree, and secrets rather than variables keep them out of its public logs.
   - The federation rule is expected to accept a run on `main` alone. A run started by `pull_request_target` carries another subject, so it only merges, and hands a review to a dispatched run on `main`.
7. **A product change's pull request merges through the reviewer too.** `change-finalize` ends its title with the epic's id and waits for the merge instead of asking the user for one.
8. **An agent never applies the approval label** (`CLAUDE.md` § Git workflow). R-01 records why that rule is all that holds it today.

**Why.** The maintainer asked that a pull request which satisfies every dimension "should automatically be merged", and that the workflow "run single threaded for now, only processing one PR at a time so merge conflict thrashing doesn't occur". Seven alternatives lost:

- **GitHub's own approval as the person's gate.** One account opened and merged every pull request so far, and GitHub does not let an author approve their own.
- **An environment with required reviewers.** A run waiting for that approval holds the concurrency group, so one high-risk pull request would stop the queue.
- **Letting Claude Code merge through its own tools.** The judge would hold what it judges with, and a pull request that persuaded it would merge itself.
- **GitHub's default concurrency queue.** It keeps one pending run and cancels the one before it, so a pull request's wake-up could be lost.
- **Reviewing before `verify` passes.** That spends a review on a head CI then refuses.
- **The review as a pre-push job or a `verify.yml` step.** It reads a token and a language model (`CLAUDE.md` § The gate ladder). Only its wiring and its decisions are gates.
- **A stored API key.** It never expires, anything that reads the repository's secrets could spend it, and Anthropic's credential precedence lets it silently win over federation. So `pr-review:check` refuses one. The federation ids themselves are not credentials: a token is minted only for a GitHub OIDC token the rule's match conditions accept.

**What changed.**

- **This register:** this entry and R-01; the status line, the blockquote's bound, the decisions table and the risks table.
- **Added:** `.github/workflows/pr-review.yml`, with `.github/workflows/README.md`; `.claude/agents/pr-reviewer.md`; `scripts/pr-review.mjs`.
- **`tools/policy.json`:** the `prReview*` keys, each with its `Means` sibling; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name them.
- **`package.json`:** `pr-review:check` and `pr-review:selftest`, each a pre-push job in `lefthook.yml` and a step in `.github/workflows/verify.yml`.
- **`.github/workflows/verify.yml`:** a `workflow_dispatch` trigger, for the reviewer's merges.
- **The repository's Actions secrets, outside this tree:** `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_ORGANIZATION_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID` and `ANTHROPIC_WORKSPACE_ID`. No gate can read them; a wrong one shows as a failed exchange on the Console's authentication history.
- **`CLAUDE.md`:** § Git workflow says how a pull request reaches the trunk and who applies the approval label.
- **`.claude/skills/bead/SKILL.md`:** § 6 ends the title with the carried ids and reads the `pr-review` check.
- **`.claude/skills/change-finalize/SKILL.md`:** § 5 ends the title with the epic's id; § 7 waits for the reviewer's merge.
- **`.claude/agents/continuous-prompt-improvement.md`:** § 3 says its pull request stays a person's to merge.
- **`README.md`:** each section that says who merges, or lists what runs and where; and `scripts/README.md`, one row.

**Figures.** 45 pull requests, every one opened and merged by one account, as of 2026-09-25: `gh pr list --state all --limit 200 --json author,mergedBy`.

### D-08 · A run leaves its analysis in the tracker, and one review reads every pending analysis as a batch

**Recorded 2026-09-26**, carried by `asdlc-openspec-lzr`. The maintainer chose the note, the two thresholds, the one review over every analysis and the workflow script, items 1 to 4, on 2026-09-25, when the issue was filed. On 2026-09-26, when it was worked, they chose what checks the thresholds, the script's name, and items 5 to 8, each from a recommendation put with the case where it loses.

**Builds on / amends:** amends D-05, whose items 1 and 3 launched one reviewer per run and left nothing behind a review that proposed nothing. Builds on D-06, whose counts across runs each analysis still ends with, and on D-07, which leaves a review's pull request, citing no issue, to a person.

**Decision.** How a run of a prompt is recorded, and when and how the runs are reviewed. `CLAUDE.md` § Prompt reviews holds the rule and the launch command, and every caller points there.

1. **A run's analysis is a note in the tracker**, on the issue or epic the run worked. Its first line is `promptReviewAnalysisMarker` and a run id, the issue's id, `@` and the UTC second the note was written; the next name every prompt the run loaded and the commit it read them at. A prompt another prompt called, the reviewer's own run, and a run that worked no issue write none.
2. **A review starts when either threshold holds**: `promptReviewDueCount` analyses pending, or the oldest older than `promptReviewDueAgeDays` days. The closing step of every run checks both, and the reviewer checks them again when it starts. No scheduler does.
3. **One review reads every pending analysis, with one agent per prompt file.** The reviewer groups the evidence by the file each finding concerns, putting the files one finding spans in one group, and opens one pull request over every file the agents change.
4. **The agents run through a workflow script**, `.claude/workflows/review-prompts.js`, each in a worktree of its own. The script judges each agent's report in code: a branch the WorktreeCreate hook did not provision, a file the agent was not given, a failed or missing gate, or a run its evidence does not come from keeps the branch out of the merge. The session running the agent does everything with a side effect: it reads the notes and applies the thresholds, merges the branches the script returns, gates the result, opens the pull request with `open-pr`, and marks the analyses read.
5. **No second review starts while one is under way**: while a pull request from a branch `agent/review-prompts-*` is open, or `claude agents --json` lists a session named `review-prompts`. The pending analyses wait for it.
6. **What a review read is marked by an appended line**, `promptReviewReadMarker`, the run id, and the review's pull request or `no change`. An analysis is pending while no such line names it. One whose file's agent returned nothing, or whose report the script refused, gets no line and waits for the next review.
7. **The reviewer's session is named `review-prompts`**, one name for every review, since one runs at a time. `asdlc-openspec-7nk`, which asked for a name per run, `review-<prompt>-<context>`, closed as obsolete.
8. **The skeptics wait for `asdlc-openspec-pnm`.** This review has no skeptic step and no recurrence threshold, and proposes any edit its agents judge worth making, as D-05's reviewer did. pnm adds both once its own open decisions are settled.

**Why.** The maintainer asked on 2026-09-25 for the reviews one `bead` run triggers, of `bead` and of `open-pr` inside it, to be rolled up. Under D-05 every run launched a reviewer, so two reviews of one prompt could run at once, and did: #48 and #51, both of `.claude/skills/bead/SKILL.md`, collided and were superseded by #53, which carries a commit from each. And a review that proposed nothing left nothing, while the analysis it read sat in a worktree removed once its branch landed, so a recurrence count (`asdlc-openspec-pnm`) had nothing across runs to count. GEPA's reflection over minibatches of traces, crediting each piece of feedback to the module it concerns, is the model the batch follows (https://arxiv.org/abs/2507.19457, as read by a research session on 2026-09-25). Nine alternatives lost:

- **A comment on the run's pull request.** `change-propose` to `change-verify` run before any pull request exists.
- **An event issue of its own for each run.** An issue per run, where the issue the run worked is already there to carry the note.
- **A comment on the issue, which has an id of its own.** `bd list` filters on notes, not comments, so finding the pending analyses would mean reading every issue.
- **A review per prompt.** It would split a contradiction between two prompts, `bead` and `open-pr` say, across two reviews that each see half of it.
- **Agents the reviewer starts in worktrees, as `fan-out-work` does.** They need only prose, but what they count and which branch merges would be the model's judgement, and no selftest would hold it. The script's rules are held by `workflows:selftest`, as `build-change-task.js`'s are.
- **A scheduler**, a task on the machine or a GitHub Actions schedule. It would review an old analysis on time in a week when no prompt runs, which the closing step cannot. The machine's task is set up outside the repository, where no gate sees it, and an Actions job would both run the model and write, which D-07 keeps apart.
- **A second review over the files an open review leaves alone.** It keeps the other files moving, where a review pull request nobody merges now holds up every later review.
- **Metadata on the issue to mark what was read.** A structured field `bd list --metadata-field` filters exactly, where a hand edit that breaks a read line miscounts; but it is a second write for every run to keep in step with the note.
- **A session name for each review, carrying its date.** Past reviews could be told apart at a glance in agent view, where each now reads `review-prompts`.

Two checks this decision rested on were run first, on 2026-09-26. A workflow agent with `isolation: 'worktree'` landed on `agent/wf_55659cd9-cb4-1` at `origin/main`, with `.worktree/CONTEXT.md`, so the WorktreeCreate hook provisions it. A `claude --bg` session called the Workflow tool when its launch prompt named a script, and that run's agent landed on `agent/wf_b5b546d9-f08-1` the same way. Neither worktree was removed when its agent ended, though neither changed a file; `npm run worktree:gc` removes such a worktree once its branch is in `origin/main`, and the reviewer runs it last.

**What changed.**

- **This register:** this entry; the status line, the blockquote's bound and the decisions table carry D-08; D-05 carries the amendment above.
- **`CLAUDE.md`:** § Prompt reviews is rewritten: the analysis as a note with its marker line, the closing step's check of the thresholds, when no review starts, the launch as `review-prompts`, and what a review leaves.
- **`.claude/agents/continuous-prompt-improvement.md`:** rewritten as the reviewer of a batch. § How a file is judged keeps, for each of the workflow's agents, what its § 1 and § 2 said about reading a prompt, its earlier reviews and a run's own branch.
- **Added:** `.claude/workflows/review-prompts.js`.
- **`scripts/workflows.selftest.mjs`:** runs a suite for each workflow, adds one for `review-prompts.js` with its own control, and refuses a workflow file it has no suite for.
- **`tools/policy.json`:** `promptReviewAnalysisMarker`, `promptReviewReadMarker`, `promptReviewDueCount` and `promptReviewDueAgeDays`, each with its `Means` sibling; `describes`, `gatedBy`, `whatItDoesNOTDo` and `provenance` name them.
- **`.claude/skills/bead/SKILL.md`:** § 8 writes the run's analysis and checks whether a review is due, and the report names the analysis's issue and run id.
- **`.claude/README.md`, `scripts/README.md`, `lefthook.yml` and `README.md`:** the workflows row, the selftest's row, the `workflows-selftest` job's comment and measured cost, and the rows that said a run launches its own review.

**Figures.** Eleven review pull requests opened between 2026-09-24T23:47Z (#28) and 2026-09-25T23:10Z (#53), the titles in that range that cite no issue: `gh pr list --state all --limit 100 --json number,title,createdAt`. `promptReviewDueCount` and `promptReviewDueAgeDays` are choices made from that pace, not measurements.

### R-01 · Anything holding a maintainer's credentials can approve a high-risk pull request

**Recorded 2026-09-25**, carried by `asdlc-openspec-mi6`.

**Builds on / amends:** builds on D-07, whose approval label it is about.

**Risk.** The reviewer counts the approval label when a non-bot account with write access applies it after the verdict on the head. The sessions that work here run `gh` with the maintainer's own credentials. An agent that applied the label would therefore count as the maintainer, and a high-risk pull request would merge without a person having read it. `CLAUDE.md` § Git workflow forbids an agent to apply it; no guard refuses one.

**Why.** It is accepted for now because the alternative needs an identity the repository does not yet have. GitHub cannot tell two sessions of one account apart. The fix is either for agents to act under an identity of their own, a bot account or a GitHub App, whose approval the reviewer refuses; or a guard that refuses the command in session. `asdlc-openspec-g1b` carries it.

**What changed.** Nothing yet, beyond the rule in `CLAUDE.md` § Git workflow.

**Figures.** None.
