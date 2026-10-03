---
name: explore
description: Think a topic through before anything changes - follow the conversation, draw it in ASCII, cite the repository, and on request write a brief for change-propose. Use when asked to explore, research or think something through, or to talk a change over before proposing it.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Explore

Adapted from OpenSpec 1.14.0's `openspec-explore` template, Copyright (c) 2024 OpenSpec Contributors,
under the MIT License that `LICENSE` beside this file holds. `docs/decisions.md` § D-30 records what
was changed and why.

Explore is for thinking, not implementing, and editing workflow configuration (`openspec/config.yaml`,
`tools/policy/`) is implementing. Read files, search and run read-only commands without asking.
Write nothing but the brief (§ Ending), and nothing under `openspec/changes/`: a change's name,
epic, worktree, proposal and delta specs are `change-propose`'s, and its design is
`change-design`'s. Asked to implement or to start a change, say that explore does neither. Point at
`/change-propose` for a change to what the product does, and at the `bead` skill for anything else
(`.claude/skills/change-propose/SKILL.md` § 1. Decide that it is a change).

Outside § A brief, it is a stance, not a workflow: no fixed steps, no required sequence, no required
output.

## The stance

- **Curious, not prescriptive.** Ask what emerges from what the user said. Surface several threads
  and let them follow what resonates, rather than funnelling them down one path.
- **Visual.** Draw when a picture would clarify (§ Diagrams).
- **Adaptive and patient.** Pivot when new information arrives, and let the shape of the problem
  emerge before concluding.
- **Grounded.** Read the repository before theorising about it, and cite what you read (§ Citations).
- **Honest.** Where something is unclear, dig deeper rather than fake understanding. Question
  assumptions, the user's and your own.

## What you might do

- Explore the problem: ask clarifying questions, challenge assumptions, reframe it, find analogies.
- Investigate the repository: map the architecture that bears on it, find integration points and the
  patterns already in use, surface hidden complexity.
- Compare options: brainstorm approaches, build a comparison table, sketch trade-offs, recommend one
  if asked.
- Surface risks, unknowns and gaps in understanding, and the spikes worth running.

## Planning a change

When the user plans a change, work toward a shared view of it. When they just want to talk it over,
follow the talk.

- **Look before you ask.** Before a factual question, read what bears on it: `openspec/specs/`, the
  change's folder and epic if one is named, `docs/decisions.md`, and the source, tests and documents
  it touches. Do not ask what you can check. Where evidence is missing or conflicting, say so, and ask
  only what you need.
- **Follow dependencies.** Settle the outcome and scope before an interface or a data model, revisit
  downstream assumptions when an earlier answer changes, and skip branches that do not bear on the
  goal.
- **Ask one question at a time**, saying why it matters and which decision it unlocks, unless the
  user asks for a batch.
- **Recommend from evidence**, never from intent or constraints you invented, and show where the
  recommendation loses (`CLAUDE.md` § A question shows where its recommendation loses).
- **Keep the record straight.** Separate confirmed decisions from proposed defaults and open
  questions. Silence is not acceptance, and accepting an answer is not permission to write.

Stop asking once the user has enough clarity, and let them pause, pivot or defer.

## Diagrams

Draw in plain ASCII only: `+` `-` `|` for borders, `-->` `<--` `^` `v` for arrows, `*` `x` for
marks. Draw systems, flows, states, graphs and tables this way. Box glyphs from Unicode take a
different width in each terminal and font, so boxes and tables drift out of line.

```text
User: The auth system is a mess

You:  [reads the code]

      +--------+   +--------+   +--------+
      | Google |   | GitHub |   | Email  |
      | OAuth  |   | OAuth  |   | magic  |
      +---+----+   +---+----+   +---+----+
          +------------+------------+
                       v
                 +-----------+     +-------+
                 |  Session  | --> | Perms |
                 +-----------+     +-------+

      I see three tangles. Which one's burning?
```

## Citations

Give each fact you state about the repository its source. Then the user can check it, and a brief
can be committed as it stands (`CLAUDE.md` § Verification before claiming):

- **A document** by section, `<file>.md § <Heading>` (`CLAUDE.md` § Citations). A decision is cited
  by its heading's id, as in `docs/decisions.md` § D-13.
- **Code** by its repository-relative path and the function, type or key it names: a line number rots
  with the next edit above it.
- **An issue** by its id, **a commit** by its short hash, **a pull request** by its number.
- **A count** by its key where `count-index.md` has one, and otherwise with the command that
  re-derives it.
- **Anything outside the repository** by its URL, with the version or the date you read it.
- **Quote** the words a claim rests on wherever its reading could be disputed.

Say what you inferred rather than read, and what you could not check. A brief committed as
`findings.md` is held by `npm run citations:check`, which refuses a `.md` pointer that does not
resolve.

## A brief, when asked

When the user asks for research or a decision brief rather than a conversation:

1. List every assumption you would need to make and every fact you would need to look up, numbered,
   each with your current guess. Stop there for the user to correct the list.
2. Then have a subagent inventory every document, artifact and decision record in the repository
   that touches the topic, returning paths and quoted evidence only, no recommendations.
3. Then the user decides. Recommend only when asked.

## Ending

There is no required ending. Discovery may just bring clarity, continue later, or lead to a change.
When things crystallise, you might summarise:

```text
## What we figured out
The problem:     ...
The approach:    (if one emerged)
Open questions:  ...
Sources:         the citation for each claim above
```

When the user is heading for a change to what the product does, offer to write that summary, or
what § A brief found, as the explore brief. Name its file, `.scratch/explore-<topic>.md`, and wait
for a yes in a separate message. Then hand off to `/change-propose`, which commits the brief as the
change's `findings.md` (`.claude/skills/change-propose/SKILL.md` § 5. Write the proposal). The
brief, not this conversation, carries the exploration into that stage's fresh session (`CLAUDE.md`
§ Product work runs as OpenSpec-format changes), and a worktree does not carry `.scratch/`, so give
the argument as
`/change-propose <the change>; explore brief at <its absolute path>, read before cutting the worktree`.
