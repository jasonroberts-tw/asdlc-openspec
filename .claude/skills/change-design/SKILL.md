---
name: change-design
description: Write a proposed change's design.md when the change needs one - the how, its decisions and trade-offs - or record that it needs none. Use after change-propose, when asked to design a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Design a change

The second of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's
worktree, after the user has reviewed the proposal and its delta specs.

## 1. Find the change

The branch is `agent/<change>` (`git branch --show-current`). If the session is not already in the
worktree, enter it with `EnterWorktree` and the path `.claude/worktrees/<change>`.

Read the following before writing anything:

- `openspec/changes/<change>/proposal.md`;
- every delta spec under the change's `specs/`;
- the living spec under `openspec/specs/` of each capability the change modifies;
- the code the proposal's Impact names.

## 2. Decide whether it needs a design

Write `design.md` only when one of these holds:

- the change cuts across several modules, or introduces a pattern the code does not have yet;
- it adds a dependency or changes a data model;
- it carries a security, performance or migration risk;
- the specs leave open a technical choice that the build should not make on its own.

Otherwise write no file. Say so in the report and hand over to `change-plan`. An empty design is
noise the next reader has to rule out.

## 3. Write it

Write `openspec/changes/<change>/design.md` with these sections, in this order:

- **`## Context`:** the current state, and the constraints on the change.
- **`## Goals / Non-Goals`**
- **`## Decisions`:** each choice, with the alternative that lost and why.
- **`## Risks / Trade-offs`:** each as a risk and its mitigation.
- **`## Migration Plan`** and **`## Open Questions`**, when they apply.

A design says how, never what:

- **A behaviour the design needs that no scenario states** belongs in a delta spec. Revise the spec
  with the user; never hide the requirement here. Bring the proposal's `## What Changes` into line
  with the revised spec in the same commit, or the proposal restates the old behaviour.
- **A decision that binds the repository beyond this change**, such as a rule or a convention, is a
  register entry (`CLAUDE.md` § Decisions live in the register), not a line of this design. Propose
  it to the user. An entry the user accepts is written by a build task, not in this stage; until it
  exists, the design names it by its number with no `§` pointer, which the citations gate would
  refuse as unresolved.
- **A design that relies on an existing decision** cites that decision's register entry by
  section, as `CLAUDE.md` § Citations describes.

## 4. Commit it, and stop

Stage the design and every file this stage revised with `git add`, then run `npm run openspec:check`
and `npm run citations:check`, each as its own call. Stage first: the citations gate reads only
tracked files, so a design not yet added passes without being read.

Commit, with the message passed from a file under `.scratch/`. Report what the design decides and
what it leaves open, then stop.

The user reviews it before `change-plan` turns it into tasks.

When `change-verify` sends a design gap here (`.claude/skills/change-verify/SKILL.md` § 6. Verdict),
the design already exists. Amend the decision it names, and any comment and README row that repeats
it. Stage, check and commit as above, then hand back to `change-verify`, which runs again from
step 2.

Reviewed: `docs/prompt-reviews/change-design.2026-09-23.md` § Review of 2026-09-23 (the run of
2026-09-23 on change `add-calculator-web-app`, epic `asdlc-openspec-zgh`, commit `7ba59c4`).
