# `docs/decisions/`

**The register's decisions and risks after D-59, one record each, named for its `bd` id; those up to
D-59 stay in `docs/decisions.md`, frozen.** A record wins any disagreement with a document, as every
entry of the register does (`CLAUDE.md` § Decisions live in the register), and this page is not one.

This directory has no table with a row per record. Every new record would append a row to it, and
two branches that each add one would conflict there, which the layout exists to stop
(`CLAUDE.md` § Every directory and document says what it is, and who wins).

- **Writing one:** the skeleton, the record's name and heading, and which `bd` issue gives its id
  are `docs/decisions.md` § How an entry is written; an amendment under an earlier entry is
  § How an entry changes.
- **Citing one:** `` `docs/decisions/<id>.md` § Decision ``, or `§ Risk` for a risk. The citations
  gate checks that form; a bare path to a record it does not check.
- **Finding one:** `git ls-files docs/decisions/` lists them, and
  `git grep <id> origin/main -- docs/decisions.md docs/decisions/` finds every entry that names an
  id, in either place.
