---
name: change-design
description: Write a proposed change's design.md when the change needs one - the how, its decisions and trade-offs - or record that it needs none. Use after change-propose, when asked to design a change.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Design a change

The second of the six `change-*` stages (`docs/decisions.md` § D-02). It runs in the change's
worktree, after the user has reviewed the proposal and its delta specs. Every question below that
recommends an option takes the form `CLAUDE.md` § A question shows where its recommendation loses
gives.

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
- it makes the product compute a value, or carry one forward from one step to the next, such as a
  number, an amount, a date or a duration;
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

Every value the change makes the product compute or carry forward gets its own decision under
`## Decisions`, and the decision states three things:

- **its representation**, such as a binary float, a decimal, an exact fraction, or an integer count
  of the smallest unit;
- **its precision**: how many digits or places it keeps, and where that stops;
- **its rounding rule**: whether it rounds, where, and which way, and whether the next step computes
  from the rounded value or the exact one. "Rounded for display" says what is shown, not what is
  carried forward.

The calculator change's design stated no numeric model, and its build rebuilt the arithmetic five
times (`asdlc-openspec-asv`).

A design says how, never what:

- **A behaviour the design needs that no scenario states** belongs in a delta spec. Revise the spec
  with the user; never hide the requirement here. Bring the proposal's `## What Changes` into line
  with the revised spec in the same commit, or the proposal restates the old behaviour. Label the
  epic for propose (`CLAUDE.md` § Product work runs as OpenSpec-format changes).
- **A decision that binds the repository beyond this change**, such as a rule or a convention, is a
  register entry (`CLAUDE.md` § Decisions live in the register), not a line of this design. Propose
  it to the user. An entry the user accepts is written by a build task, not in this stage; until it
  exists, the design names it by its number with no `§` pointer, which the citations gate would
  refuse as unresolved.
- **A design that relies on an existing decision** cites that decision's register entry by
  section, as `CLAUDE.md` § Citations describes.

## 4. Settle each scenario's expected value

Work out the expected value of every scenario in the delta specs from the design's decisions. A
scenario whose expected value depends on a choice the design has not made, such as which value a
chain carries forward or where a result rounds, is a question for the user in this stage. It never
goes to `## Open Questions` for the build to settle: the build encodes whichever value it meets
first, and every task built on a value the user later reverses is rework. Record the answer as a
decision in the design. Where the answer changes a scenario, revise the delta spec with the user,
with the proposal and the epic's label, as § 3 says of a behaviour no scenario states.

## 5. Commit it, and stop

Stage the design and every file this stage revised with `git add`, then run `npm run openspec:check`
and `npm run citations:check`, each as its own call. Stage first: the citations gate reads only
tracked files, so a design not yet added passes without being read.

Commit, with the message passed from a file under `.scratch/`. Report what the design decides, each
question step 4 put to the user with its answer, and what the design leaves open, then stop.

The user reviews it before `change-plan` turns it into tasks.

When `change-verify` sends a design gap here (`.claude/skills/change-verify/SKILL.md` § 6. Verdict),
the design already exists. Amend the decision it names, and any comment and README row that repeats
it. Stage, check and commit as above, then hand back to `change-verify`, which runs again from
step 2.
