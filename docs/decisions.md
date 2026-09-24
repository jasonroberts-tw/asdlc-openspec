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

**Status: every decision from D-01 to D-05 is recorded and applied (D-01 added 1970-01-01; D-02 and D-03 added 2026-09-23; D-04 and D-05 added 2026-09-24).**

> The status line and the table below are a summary of the `### D-` headings, never the reverse:
> update them from the headings, and never delete a line to make the gate pass. The range
> `D-01 … D-05` is checked by `npm run check:register`, which reads those headings, the table and each
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

## Risks

None recorded yet. The first is `R-01`.

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

1. **The reviewer runs in the background, and nobody waits for it.** The session that ran the prompt leaves its worktree, writes its analysis of the run under `.scratch/` in the primary checkout, and launches `continuous-prompt-improvement` with `claude --bg --agent`. Agent view lists that session, and its supervisor keeps it running after the launcher ends. The launcher neither waits for the review nor relays it. `CLAUDE.md` § Prompt reviews holds the command, and every caller points there.
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
- **`CLAUDE.md`:** § Prompt reviews is rewritten: the launch, from the primary checkout, and what a review leaves behind.
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
