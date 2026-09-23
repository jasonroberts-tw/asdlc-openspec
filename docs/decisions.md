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

**Status: every decision from D-01 to D-02 is recorded and applied (D-01 added 1970-01-01; D-02 added 2026-09-23).**

> The status line and the table below are a summary of the `### D-` headings, never the reverse:
> update them from the headings, and never delete a line to make the gate pass. The range
> `D-01 … D-02` is checked by `npm run check:register`, which reads those headings, the table and each
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
