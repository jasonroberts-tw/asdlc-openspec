---
name: change-propose
description: Start a change to what the product does - agree its name, open its epic in bd, cut its worktree, and write its proposal and delta specs in OpenSpec's format, then stop for review. Use when asked to propose, start or spec a product change, from a description or from an issue id.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Propose a change

The first of the six `change-*` stages (`docs/decisions.md` § D-02). The argument is a description
of the change, or the id of an issue that seeds it. It starts in the primary checkout and ends in the
change's worktree, stopped for the user's review. Every tracker write below sits inside the bracket
`CLAUDE.md` § The task store describes. Every question below that recommends an option takes the
form `CLAUDE.md` § A question shows where its recommendation loses gives.

## 1. Decide that it is a change

A change alters a requirement: something a user or a caller of the product can observe. If no
requirement would read differently afterwards (a refactor, a gate, a document, the tooling), it is
not a change. Say so and hand it to the `bead` skill.

With a seeding issue, verify its premise first, exactly as the `bead` skill's step 1 does, and stop
with the evidence if it does not hold.

The worktree is cut from `origin/main`, and the primary checkout's `main` can trail it. Run
`git fetch origin main` first, and read what this step and the next check at `origin/main`
(`git ls-tree -r --name-only origin/main openspec/`, `git show origin/main:<path>`), not in the
checkout.

## 2. Name it, and ask

Propose one kebab-case name, a verb and its object (`add-farewell`, `require-login-for-export`),
at most 64 characters: it names the branch and the worktree too. It must not already exist under
`openspec/changes/`, nor under `openspec/changes/archive/` with any date prefix. Ask the user to
confirm it. It cannot change once the worktree exists.

Before asking, read the worktree briefing's template as the trunk has it,
`git show origin/main:.claude/worktree-CONTEXT.md.tmpl`. The briefing takes precedence where it
conflicts (`CLAUDE.md` § Worktree-local context), and it names things this repository does not
contain. If the change needs one of them, put the conflict in the same question as the name, for the
user to decide. If they go ahead, the proposal's `## Impact` names the template and the
`docs/decisions.md` entry the reversal needs.

## 3. Open the epic

With `<change>` the confirmed name:

- **From a seeding issue:** `bd update <id> -t epic --add-label spec-change --spec-id openspec/changes/<change> --set-metadata change=<change>`.
  The issue keeps its id, its history and its `repo:` label; it becomes the change's epic rather than
  being closed. Stop if another actor holds it in progress.
- **Otherwise:** write the epic's description (the why, in a paragraph) to
  `.scratch/<change>-epic.md`, then
  `bd create "<change>: <what changes, in a line>" -t epic -l spec-change,<the repo: label open issues here carry> --spec-id openspec/changes/<change> --metadata '{"change":"<change>"}' --body-file .scratch/<change>-epic.md --silent`.

The `spec-change` label keeps the epic and every child out of the general queue, and the later
stages find the epic by its `change` metadata. The spelling's one home is `specChangeLabel` in
`tools/policy.json`; this skill spells it only to run the commands above.

## 4. Cut the worktree

Call `EnterWorktree` with the name `<change>`. The harness hook provisions it through the one
worktree script as `agent/<change>`, cut from `origin/main`. Never run `git worktree add` yourself.

Inside it, run `npm ci`, then read `.worktree/CONTEXT.md`.

## 5. Write the proposal

Read `openspec/specs/` first. A requirement that is already specified gets modified, not added a
second time.

Then write `openspec/changes/<change>/proposal.md` with these sections, in order:

- **`## Why`:** the problem or the opportunity, and why now, in a short paragraph of substance. The
  CLI warns below fifty characters. With a seeding issue, name its id here.
- **`## What Changes`:** one bullet per change in behaviour. Mark a breaking one **BREAKING**.
- **`## Capabilities`:** a `### New Capabilities` list and a `### Modified Capabilities` list, one
  bullet per kebab-case capability, each saying what it covers or what changes in it.
  - A modified capability uses its exact directory name under `openspec/specs/`.
  - The list is the contract: every capability on it gets exactly one delta spec in step 6, and no
    other capability gets one.
- **`## Impact`:** the code, interfaces, dependencies and documents the change touches.

## 6. Write one delta spec per capability

Write each to `openspec/changes/<change>/specs/<capability>/spec.md`. The archive merges these into
the living spec mechanically, so the grammar is exact:

- **Operations.** Use the operation headers you need: `## ADDED Requirements`,
  `## MODIFIED Requirements`, `## REMOVED Requirements`, `## RENAMED Requirements`. A new capability
  uses ADDED only.
- **Requirements.** Each one is `### Requirement: <name>`, then its text, stated with SHALL or MUST.
- **Scenarios.** Each requirement has at least one `#### Scenario: <name>` with exactly four
  hashes. Three hashes, or a bullet, is silently not a scenario. Under it go `- **WHEN** <condition>`
  and `- **THEN** <outcome>` lines, with `- **AND** ...` lines as needed. A later stage traces every
  scenario to a test, so write each one so it can become one.
- **MODIFIED.** Copy the whole requirement block from `openspec/specs/<capability>/spec.md`, with
  its header text exactly as it stands there, then edit the copy. A partial block loses the rest of
  the requirement at archive.
- **REMOVED.** Give the requirement's `### Requirement: <name>` header, then a `**Reason**:` line and
  a `**Migration**:` line.
- **RENAMED.** Give a `` - FROM: `### Requirement: <old name>` `` line followed by a
  `` - TO: `### Requirement: <new name>` `` line, and put any change to the requirement's text under
  MODIFIED with the new name.

Cite any other file by its full path from the repository root. A bare `spec.md` is ambiguous here,
because every capability has one.

## 7. Check it, commit it, and stop

- Run `npm run openspec:check`. It validates every delta strictly and trial-archives the change
  against the living spec. Fix what it names.
- Commit the change folder with its message passed from a file under `.scratch/`.
- Stop, and report the name, the epic, the capabilities and each requirement with its scenarios.

The user reviews the proposal and the specs before anything else happens. Revisions happen here, in
this stage. The next stage is `change-design`.
