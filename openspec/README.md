# `openspec/`

**The product's requirements: the living spec of every capability, the changes in flight against
it, and the record of every change that landed.** It uses OpenSpec's on-disk format, so the pinned
OpenSpec CLI can validate it and merge a change into it. The work itself is run by the `change-*`
skills under `.claude/skills/`. The decision and its reasons are `docs/decisions.md` § D-02.

**Which wins.**

- The register (`docs/decisions.md`) wins over anything here.
- The living spec under `specs/` states what the product does now, and wins over any archived change.
- Within an open change, its delta specs win over its `design.md`, and the design wins over nothing
  the specs state.

| Path | What it is |
|---|---|
| `config.yaml` | The CLI's configuration. It names the schema the CLI parses with, and nothing else; the authoring rules live in the skills. |
| `specs/<capability>/spec.md` | The living spec of one capability: its Purpose, then its requirements, each with the scenarios that prove it. Hand-maintained source. The archive edits it when a change lands, and a person edits it the rest of the time. |
| `changes/<change>/` | One change in flight, on its own branch, `agent/<change>`: `proposal.md` (why, what changes, the capabilities it touches), one delta spec per capability under `specs/<capability>/spec.md`, and `design.md` when the change needs one. Its tasks are issues in `bd` under the change's epic; there is no `tasks.md`. |
| `changes/archive/<date>-<change>/` | A change as it was proposed, moved here by the archive on the day it landed (the date is UTC). History: its citations are exempt from the citations gate, and nothing here is edited. |

Do not run `openspec init` or `openspec update` here. They write back the generated skills D-02
retired, and `npm run openspec:check` refuses those.
