---
name: retire-asset
description: use this skill when an asset or artifact is no longer needed and should be retired.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

Retiring a file is a register decision with a checklist
(`CLAUDE.md` § Decisions live in the register). Record it in `docs/decisions.md`;
`docs/retired/README.md` says what the entry names.

1. **Choose the disposition** from `docs/retired/README.md` § The three dispositions, and name it
   in the entry. Moving the file under `docs/retired/` is one of the three, not the default.
2. **Say why it was retired** in the entry. A file moved under `docs/retired/` also opens with the
   banner in `docs/retired/README.md` § The banner.
3. **Repoint or mark every live reference**, as
   `docs/retired/README.md` § What a live file may still say about a retired one says, and list
   each one in the entry's checklist.
