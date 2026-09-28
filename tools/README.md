# `tools/`

**Emitters, and any check that is a multi-file module: one directory per tool.** An emitter writes
generated output under `artifacts/` and nothing else, is deterministic, and lands with its
`:check` twin (`CLAUDE.md` § The script suffix contract). A single-file gate lives under
`scripts/`.

Each tool's header is the authority on it: what it emits or checks, the failure it exists to
prevent, its invocation and what it needs (`CLAUDE.md` § Standing rules for prompts and gates).
Where a row here and a header disagree, the header wins and the row is corrected.

<!-- kit 3.1-1 · WRITE: one row per tool, added in the same change as the tool. For a gate, say
     what it refuses; for an emitter, what it writes and from what. The kit lists only what it laid
     down. -->

| Path | Kind | What it is, or what it refuses |
|---|---|---|
| `citations/` | gate, `citations:check`, and its selftest, `citations:selftest` | Refuses a `<file>.md:NN` or `<file>.md` § `<Heading>` pointer, in any tracked text file (a section pointer that one line break splits included), that names a file that is not tracked, a line past the end or blank, or a section that does not exist; and a pointer into a store this repository does not use. `check.ts` is the gate, `scan.ts` the scanner and its exemption lists (each entry with its reason) and the `CITATIONS_ROOT` override, `memory.ts` the unused-store rule, `selftest.ts` the fixtures that hold the scanner to known answers and run the gate end to end over a synthetic tree. |
| `lib/paths.ts` | helper | Where the repository root is, in a module with no side effects, so a tool can ask without running anything. |
| `lib/bd-launcher.ts` | helper | Finds the tracker's CLI on this machine and starts it without a shell. Only "not found" is a skip; found and not runnable is a failure, reported with the launcher and the error. |
| `policy.json` | policy file | The workflow's constants that belong to no one tool, each under a key with a `<key>Means` sibling (`docs/decisions.md` § D-03). `specChangeLabel` is the label on a product change's epic and tasks; `openspec:check` refuses a skill or agent that spells it without citing the key, or cites it and spells another value. `assetLabels`, `foundAtLabels` and `rerouteLabels` are the labels a run leaves in the tracker, so `bd count` shows what recurs across runs (`docs/decisions.md` § D-06); `beads:check` holds `assetLabels`, and no gate holds the other two yet. The four `buildReview*` keys size the review `.claude/workflows/build-change-task.js` runs on each task of a product change, `buildRedFirstKinds` names the kinds of task it stops as `not-red`, before any review, when a scenario the parent named has neither a red record nor an already-green report (`docs/decisions.md` § D-14), and `workflows:selftest` holds all five. The `promptReview*` keys are the markers, thresholds and skeptic counts of the batched prompt review (`CLAUDE.md` § Prompt reviews; `docs/decisions.md` § D-08 and § D-10): `workflows:selftest` holds the three `.claude/workflows/review-prompts.js` reads, and no gate holds the markers or the due thresholds. The `promptWordBudget*` keys are the most words each prompt may hold, one key per prompt: every skill and agent, `CLAUDE.md`, `AGENTS.md`, the worktree briefing template and the string literals of each workflow. `check:prompts` refuses a prompt over its budget or with none, and `prReviewHighRiskJsonKeys` makes every change to one a person's to merge. |
| `lib/git-env.ts` | helper | This process's environment without any `GIT_*` key, so git run against a scratch tree from inside a hook reads that tree and not this checkout. `citations:selftest` imports it and asserts it leaks no such key. |
