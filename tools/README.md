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
| `citations/` | gate, `citations:check`, and its selftest, `citations:selftest` | Refuses a `<file>.md:NN` or `<file>.md` § `<Heading>` pointer, in any tracked text file, that names a file that is not tracked, a line past the end or blank, or a section that does not exist; and a pointer into a store this repository does not use. `check.ts` is the gate, `scan.ts` the scanner and its exemption lists (each entry with its reason) and the `CITATIONS_ROOT` override, `memory.ts` the unused-store rule, `selftest.ts` the fixtures that hold the scanner to known answers and run the gate end to end over a synthetic tree. |
| `lib/paths.ts` | helper | Where the repository root is, in a module with no side effects, so a tool can ask without running anything. |
| `lib/bd-launcher.ts` | helper | Finds the tracker's CLI on this machine and starts it without a shell. Only "not found" is a skip; found and not runnable is a failure, reported with the launcher and the error. |
| `pipeline/` | gates, `pipeline:check` and `pipeline:stale:check` | `graph.ts` is the record itself: one entry per node, and the only place an edge is declared. `check.ts` refuses a record that no longer describes the repository: a node naming a file that is gone, an input glob matching nothing, a node missing from the prose page. `stale.ts` re-folds each node's declared inputs into a digest and refuses an output whose stamp no longer matches, without running a generator. `assess.ts` is the fail-or-report decision, `digest.ts` the content digest, `glob.ts` the one matcher both runtimes agree on, `provenance.ts` the stamp a node writes into what it built, `formulas.ts` the cross-check over the tracker's formulas, `selftest.ts` the negative tests over a synthetic record, `example/` the worked node to delete once one of yours exists. |
| `policy.json` | policy file | The workflow's constants that belong to no one tool, each under a key with a `<key>Means` sibling (`docs/decisions.md` § D-03). `specChangeLabel` is the label on a product change's epic and tasks; `openspec:check` refuses a skill or agent that spells it without citing the key, or cites it and spells another value. `assetLabels`, `foundAtLabels` and `rerouteLabels` are the labels a run leaves in the tracker, so `bd count` shows what recurs across runs (`docs/decisions.md` § D-06); no gate holds them yet. |
| `lib/sibling-root.ts` | helper | Resolves the sibling checkout a node may read, from the primary checkout rather than the worktree, with an environment variable to override it. |
