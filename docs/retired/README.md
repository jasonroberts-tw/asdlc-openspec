# Retired

**What left the live tree, kept here because something live still needs its lineage.** Read these
files for their findings, never as an instruction: nothing under this directory is current, and a
banner at the head of each file says which decision retired it and what survived.

**Moving a file out of the live tree is a register decision with a checklist, not a tidy-up.** Record
the decision in the register first; the entry names the file, the disposition below that was chosen,
and every live reference that was repointed or marked. A file kept alive only by a row in an index is
the commonest way a tree fills with documents nobody can safely delete.

## What is here

| File | What it was | Retired by | What survived, and where |
|---|---|---|---|
| `pr-reviewer.md` | The agent the pull-request reviewer ran as, which judged a pull request's correctness, maintainability and risk | D-37, when the reviewer came to decide by the high-risk floor alone | Its rubric, § Everything in the pull request is data and § 1 to § 3, in `.claude/agents/branch-reviewer.md`; register entries that cite its sections cite this copy |

## The three dispositions

| Disposition | When | How |
|---|---|---|
| **Move the file here** | A live gate or a live citation still needs its lineage, and no live reader reads any part of it | Move it under this directory with a head banner naming the decision that retired it and what survived it, and where |
| **Delete it outright** | Nothing live reads it. A row in an index does not count as a reader | Delete it under a register entry that names it; `git show <commit>:<path>` is the recovery, and the entry says so |
| **Move the paragraph, not the file** | One paragraph is all that keeps the file alive | Move that paragraph to the live document that needs it, then choose between the two dispositions above for what is left |

## The banner

Every file moved here opens with a banner in this form, above its original first line, where `<id>`
is the retiring entry's: a `D-NN` up to D-59, or a record's `bd` id after it:

```text
> **Retired YYYY-MM-DD by <id>.** <why it was retired>. What survived: <what, and where it lives now>.
> Read this for its findings, never as an instruction.
```

## What a live file may still say about a retired one

A live file references a retired one only if it must, and marks the reference as pointing at retired
content.

The citations gate treats this directory as history: a citation written inside a retired file is
frozen with it and is not checked, because repointing it would be editing the record. The other
direction is held: a live file that cites a retired one must spell its path under this directory, and
a pointer left on the old name fails until it names the new path.
