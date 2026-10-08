# asdlc-openspec-1iak · A selftest whose tasks run in a fixture repository of its own gives the fixture the clone's node pin, or runs node by its path

**Recorded 2026-10-08**, carried by `asdlc-openspec-1iak`. On 2026-10-07 the maintainer chose an
amendment under D-31, from a new entry, over the Dockerfile's comment alone, each put with the case
where it loses. The session chose the words.

**Builds on / amends:** amends D-31, whose last loss says no gate meets a bare `node` in a directory
with no `mise.toml` above it, since every gate runs from the clone. Builds on the comment on the
shims in `.devcontainer/Dockerfile`, which `asdlc-openspec-locj` gave the two routes this entry
names.

**Decision.** A selftest whose tasks run in a fixture repository of its own, where mise resolves
`node` from the fixture's `mise.toml` and not from the `PATH` it was handed, takes one of two
routes:

1. **its fixture's `mise.toml` carries the clone's node pin**, as `fixtureMise` in
   `scripts/fresh-run.mjs` does; or
2. **it runs node by its path**, as `scripts/hooks/gate-summary.selftest.mjs` does.

The dev container's image still sets no global default for node, which would be a second home for
the pin (D-31 item 1).

**Why.** `tests:fresh:selftest` met D-31's loss. Its fixture's `mise.toml` pinned no tool, so in the
dev container each test task failed with "No version is set for shim: node"
(`asdlc-openspec-locj`). D-31 says no gate meets that loss because every gate runs from the clone,
and a selftest with a fixture of its own is a gate that does not. The register wins over the
Dockerfile's comment (`CLAUDE.md` § Decisions live in the register), so the register's reason had to
change. The alternative lost:

- **The Dockerfile's comment alone.** No register change, and the comment already names both
  routes. But D-31's loss would keep a reason that a fixture's selftest contradicts, and a reader is
  told that the register wins.

Where it loses:

- **A third route.** The next fixture's selftest that finds another leaves this entry naming two of
  three, and needs an entry of its own, where the comment alone would be edited in that pull
  request.
- **Nothing holds a new fixture's selftest to either route.** One that takes neither is caught only
  where mise resolves node from the fixture, as the dev container did for `tests:fresh:selftest`.

**What changed.**

- **`docs/decisions.md`:** the amendment under D-31.
- **`docs/decisions/`:** this record.

**Figures.** None.
