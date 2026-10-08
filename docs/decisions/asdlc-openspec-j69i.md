# asdlc-openspec-j69i · `check:register:records` holds each record under `docs/decisions/` to its name, its skeleton and its amendments, and refuses a dead pointer to one

**Recorded 2026-10-08**, carried by `asdlc-openspec-j69i`. The issue was filed with the layout
`asdlc-openspec-w95h` adopted, and set the six refusals and the standing rules a gate follows. At
`asdlc-openspec-vjgj`'s claim the maintainer moved the freeze it named from D-54 to D-59. The session
chose where the bare path is held, how an amendment is told from an entry the record only cites,
and how the gate reaches the floor.

**Builds on / amends:** amends `docs/decisions/asdlc-openspec-vjgj.md`, whose loss "No gate holds a
record yet" this gate closes. Builds on D-37, whose floor is decided by path, and so takes the
gate's file; and on D-55, whose held run of the product's gates this gate does not take.

**Decision.**

1. **`scripts/check-register-records.mjs`, as `check:register:records`, refuses six faults**, each by
   its reason, which its header gives in full:
   1. a file under `docs/decisions/` but `README.md` not named for the tracker id in its own heading;
   2. a record with a numbered id, which only the frozen file holds;
   3. a record missing a line of the skeleton, or with one out of order;
   4. an id its Builds on / amends line names that is neither a heading of the frozen file nor a
      record;
   5. an amendment the two sides disagree on, in either direction;
   6. a pointer to a record that does not resolve: a bare or sectioned `docs/decisions/<name>.md` in
      any tracked text file, a `docs/decisions.md` § pointer to a tracker id, and an amendment
      blockquote naming no record.

   With no record yet, it skips clean and says why.
2. **The bare path is held here, under `docs/decisions/` alone, and not in the citations gate**,
   whose header says a bare-path rule across the tree was measured and refused.
3. **An amendment is what a sentence of the Builds on / amends line that opens with "amends"
   names.** A numbered id anywhere in the line must exist; a tracker id in another sentence is not
   read, since it may name an issue. `docs/decisions.md` § How an entry is written says so.
4. **It runs at pre-push with no glob, since it reads every tracked text file, and as a step of
   `verify`'s `gates` job.** Its selftest runs beside it, with a glob of what its fixtures read.
5. **Its file is on the floor by its path**, in `prReviewHighRiskPaths`, and its task is not in
   `prReviewFloorTasks`.

**Why.** Under the layout, nothing read a record: `check:register` reads the frozen file alone, and
the citations gate passed a bare path to a missing record (w95h's trial E6b). The alternatives lost:

- **The citations gate learning bare paths.** One gate would hold every pointer. But it reopens a
  widening that gate measured and refused, which `CLAUDE.md` § Citations has measured before it is
  adopted.
- **Every id in the Builds on / amends line read as amended.** No convention to learn. But it would
  ask a blockquote of every entry a record builds on, and `asdlc-openspec-1iak`'s line names an
  issue, `asdlc-openspec-locj`, that is no record.
- **The task in `prReviewFloorTasks`.** Its run in `verify` would be held as D-55 holds the
  product's gates. But that list is the gates of the product, which D-38 decided, so it would need an
  amendment of its own, and every pull request that adds or amends a record is on the floor already.
- **A glob of `docs/decisions/**` for the gate's job**, as the issue's What gave. Fewer pushes would
  run it. But a dead pointer added to any other file would not run it at push.

Where it loses:

- **An "amends" sentence that names an issue is refused**, as naming no record: one written as D-51
  wrote "with `asdlc-openspec-64wd`'s split sequenced after them" fails, and its writer moves the
  issue to a sentence of its own.
- **A tracker id in a builds-on sentence is not checked**, so a record that builds on another by a
  mistyped bare id passes; written as a path, `docs/decisions/<id>.md`, it is checked.
- **Its run in `verify` is not held as the product's gates are** (D-55). Code of a pull request's
  that runs earlier in the `gates` job could rewrite what it reads, and only a pull request that
  changes no record could gain by it.
- **A pointer split across a line break**, the file at one line's end and its `§` at the next's
  start, is not read, where the citations gate reads one.
- **Every push runs it**, at 0.18 s.

**What changed.**

- **`scripts/check-register-records.mjs`:** new, the gate and its selftest.
- **`tasks.toml`:** `check:register:records` and `check:register:records:selftest`.
- **`git-hooks.yml`:** two pre-push jobs. **`.github/workflows/verify.yml`:** two steps in `gates`.
- **`tools/policy/pr-review.json`:** the gate's file in `prReviewHighRiskPaths`, with its reason and
  a dated sentence in the key's `Means`.
- **`docs/decisions.md`:** § How an entry is written's sentence on the "amends" sentence.
- **`docs/decisions/`:** this record; the amendment in `asdlc-openspec-vjgj.md`; and `README.md`, on
  what holds a record and the bare path.
- **`README.md`:** rows in § The guardrails, § The tasks and § What runs automatically.
  **`scripts/README.md`:** the gate's row.

**Figures.**

- 21 of 21 selftest cases hold, a control and 20 doctored copies:
  `mise run check:register:records:selftest`.
- 16 of 16 refusal sites each turn a case red when disabled: a helper that is not tracked ran the
  selftest with each `fail(` call of the gate made a no-op in turn.
- 0.18 s wall for the gate and 5.04 s for its selftest, one run each with `/usr/bin/time -p`: the
  jobs' comments in `git-hooks.yml`.
- 4 records, this one among them, and 14 pointers to a record across 244 tracked text files, every
  one resolving: `mise run check:register:records` at this entry's commit.
