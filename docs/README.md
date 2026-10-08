# `docs/`

**The documents a person reads to understand this repository, one row each.** A rule an agent must
follow is not here: it lives in `CLAUDE.md`, a skill, an agent or the header of the gate that
enforces it, and a document points at that home rather than restating it.

## The documents in this folder

| Document | What it is |
|---|---|
| `docs/decisions.md` | The register's numbered decisions (`D-NN`) and risks (`R-NN`), which nobody re-litigates, frozen at D-59. An entry is never rewritten; a later decision adds a dated amendment under each entry it changes. |
| `docs/decisions/README.md` | The register's decisions and risks after D-59, a record each, named for its `bd` id, with no row per record: how one is written, cited and found. |
| `docs/retired/README.md` | What has been retired, each file under a banner naming the decision that retired it. Kept as the evidence a decision was recorded from, never as guidance. |
| `docs/playbook.md` | The route one issue takes to the trunk, by the harness route or the product route, with a glossary, a table of where the truth lives and a crib sheet. Dated, and a route rather than an authority: the file or command each step names wins a disagreement. |
| `docs/plain-language-guide.md` | How work gets done here, for a reader who runs nothing: the parts, the loop between them, who decides what, and what has not happened yet. Dated; any technical document wins a disagreement. |
| `docs/test-strategy.md` | The agentic test strategy as the maintainer supplied it on 2026-09-28, with the answers of `docs/decisions.md` § D-13 marked where they amend it. A dated record, the home of no rule: the register, the gates and the skills win a disagreement. |

## The documents that live elsewhere

| Document | What it is |
|---|---|
| `CLAUDE.md` | Read first. The only home for a rule an agent must follow here. |
| `AGENTS.md` | The pointer for an agent tool other than Claude Code that reads that name: it sends the reader to `CLAUDE.md` and holds no rule of its own. |
| `README.md` | Setup, numbered per platform, and the table of what runs automatically. |
| `count-index.md` | Every count describing the current measured state, under a key, with the source each value re-derives from. |
| `openspec/README.md` | The product's requirements: the living spec of each capability, the changes in flight, the archive, and which of them wins. |
| `.claude/README.md` | What Claude Code loads when a session starts here: the settings, the hooks, the skills and the agents. |

## Conventions

- **A dated document stays true about its date.** It is superseded, never refreshed: a new
  document says what changed, and the old one stays in the tree, literal, as the evidence a decision
  was recorded from.
- **Every dated document says when it was written, at its head.** A `**Written:**` line gives the
  date, and, once something amends the document, a `**Status:**` line names what did: the decision,
  the document or the change that superseded or corrected it. A reader learns from the first screen
  whether to keep reading.
- **Every document that can disagree with another says, in one sentence, which wins.** A route
  through the work says the file or command that decides each step wins; a guide for a reader who
  runs nothing says the technical document wins; a cache says its source wins.
- When a document and the register (`docs/decisions.md` and `docs/decisions/`) disagree, the register wins: correct the document, and never re-argue the decision.
- **Numbers cite their source.** A figure is re-derived at the time of writing, with the path or
  command it came from beside it, or it is reported as not verified (`CLAUDE.md` § Verification
  before claiming).
- **A count that more than one document restates is cited by its key** in `count-index.md`, where
  the numeral would go, never both.
- **The status of work lives in `bd` and never in a document.** Run `bd ready`; do not
  add a status table to a document in this folder. Prose that tracks status becomes a second
  tracker that nobody updates.
- **Cite by section, never by line**: the file in backticks, then `§` and the heading. The
  citations gate resolves every pointer of that form in every tracked file.
