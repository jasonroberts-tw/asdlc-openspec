# How work gets done here, in plain language

**Written:** 2026-09-28.

**Status:** amended 2026-09-28 by `asdlc-openspec-iom`, which names the harness. Amended 2026-10-03
by `asdlc-openspec-a7x`, which says a product fix that changes no requirement goes straight to work.
Amended 2026-10-04 by `asdlc-openspec-qcqm`: the automated reviewer decides by a list of risky things
alone, and the review before an agent shares its work reads the change against its item
(`docs/decisions.md` § D-37).

**Which document wins.** This page simplifies. Where it and a technical document disagree, the
technical document is right and this page needs correcting.

**Who this is for.** A reader who runs nothing: a sponsor, a reviewer, or someone deciding whether
to work this way. No command on this page needs to be typed, and none is shown. The route an
operator follows, step by step, is `docs/playbook.md`.

## The short version

AI agents do software work in this repository, under rules a person can check. Work goes in as an
item on a shared to-do list, and comes out as a proposed change. A second agent reads it against
what the item asked for before it is shared, and an automated reviewer merges it unless it is
risky. People decide what the product should do, and approve anything risky.

## What the repository is for

The subject of this repository is the way of working, not a product. That way of working, meaning
the rules, checks, instructions and tools the agents work under, is called the harness. The product
in it is a demo: a
calculator that runs in a browser on one machine, served to that machine alone. It exists so the
way of working has something real to act on, with requirements to write, code to build and tests
to hold the code to them, and it is small enough for one change to go all the way through. Nobody
ships it, and nothing here deploys it. Wherever the calculator appears in this repository, read it
as the worked example (`docs/decisions.md` § D-04).

## The three things, and the loop between them

**The to-do list.** Every piece of work is an item on one shared list, never a checklist in a
document. Each item says where its work lands. An agent takes an item, first checks that what the
item claims is still true of the code, and only then does the work, in a private copy of the
repository, so that agents working at the same time do not tread on each other. A problem the agent
finds outside its item is not fixed on the side: it becomes a new item of its own. An item that
changes the harness goes straight to work this way. So does a fix to the product that leaves its
requirements as they are, such as making the calculator give the answer they already ask for. An
item that changes what the product does first becomes a written agreement, below.

**The written agreement of what the product does.** A change to what the product does starts as a
written proposal: the requirements it adds or alters, each with concrete examples of the form
"when this happens, then that is the result". A person reads and approves it before any code is
written. The work is then split into items, each built and proved by a test, and the whole is
checked against every example before it lands. When it lands, the agreement becomes part of the
standing description of what the product does, and that description wins over anything else
written about the product.

**The checks and the reviewer.** The same automatic checks run at several moments: inside the
agent's session, when it saves its work, before it shares it, and on the shared server for every
proposed change. A later moment never trusts an earlier one. Before an agent shares its work, a
second agent, with no part in writing it, reads the change against what its item asked for, how
easy it is to keep up and how far a mistake in it could reach, and the first agent fixes what it
finds. Once the shared server's checks pass, an automated reviewer asks one thing: does the change
touch a file on a fixed list of risky things? The list holds the file of rules every agent reads
first, the reviewer itself, the shared server's jobs, the recorded decisions, the tools' versions
and the outside code the project uses. If it does, a person decides. If not, the reviewer merges
it. Beside its answer it lists which checks run each changed file, and the files that often change
with it, for a person to read.

**The loop between them.** What the work turns up goes back on the list. Each new item a run files
is labelled with the stage that found it and the kind of thing it would fix, so over time the list
shows what keeps going wrong. Each run also leaves a short account of itself. Once enough accounts
have gathered, or the oldest has waited long enough, a review reads them together and proposes
changes to the agents' instructions, as one proposed change. Other agents test each edit first. If
the change touches a file on the list of risky things, as a change to the rules every agent reads
first does, a person decides whether to accept it; if not, the reviewer merges it. That is the one
way a program's lessons from its runs reach the agents without a person reading them first.

## Who decides what

- **A person approves a product change** at each of its reviews: the proposal, the design and the
  plan, before any of it is built.
- **A person answers what the files cannot.** An agent that needs a decision asks, and when it
  recommends an option it shows a case where that option gives the worse result.
- **A person approves a high-risk change**, and the agents are forbidden to give that approval
  themselves. A guard stops an agent's own command for it, but not every route to it
  (`docs/decisions.md` § R-01).
- **A person decides whether the agents' instructions change** when the change a review proposes
  touches a file on the list of risky things; the reviewer merges any other.
- **A recorded decision is not argued again.** Changing one takes a new recorded decision, which
  says what it changes and why.

## How big it is

This page writes no size as a number. A count that more than one document repeats lives in one
table, `count-index.md`, under a key, and an automatic check re-measures every value there on each
push; a page that copied the number would go stale without anyone noticing. So a size is written
here as its key, and the number is in that table.

- The automatic steps that run around an agent's actions inside a session, some of them checks and
  some setting up its private copy: `CNT-HOOKS`.

Other sizes, such as how many changes have landed or how many items are open, are read from their
source when someone needs them, and are not copied onto this page.

## What has not happened yet

- **No measure of success is reported yet.** The table where each measure would be defined has no
  row, and a measure without a row is not reported (`count-index.md` § Rates and metrics). Until
  one exists, nobody can say from a number whether this way of working is paying off.
- **Only part of the loop's labelling is checked.** The label for what a problem would fix is
  enforced; the labels for where a problem was found, and for which stages sent a change back, are
  not yet (`docs/decisions.md` § D-11). The picture of what keeps going wrong rests partly on
  agents labelling correctly.
- **A person's approval can still be imitated.** Anything holding the maintainer's own credentials
  outside an agent's session could apply the approval (`docs/decisions.md` § R-01). The rule that
  only a person approves rests on that rule and a partial guard.
- **The product route has met only the demo.** It has run end to end on the calculator,
  which has no users, no stored data and no deployment. How the route copes with those is untested.
- **The starter kit's setup is not finished.** Some of its steps are still open, and some files still
  carry placeholder notes saying what to write there (`README.md` § What is still a placeholder).

## Words used on this page

| Word | Meaning |
|---|---|
| agent | An AI model working in the repository through a session, under the rules in `CLAUDE.md`. |
| repository | The project's files and their full history, shared through a server. |
| harness | Everything in the repository that runs the work: the rules, checks, instructions and tools. Everything but the product. |
| product | What the work is done on. Here, a demo calculator. |
| to-do list | The tracker, called `bd`: every piece of work, one item each. |
| item | One entry on the to-do list; the technical documents call it an issue. |
| private copy | A separate checkout of the repository for one piece of work; the technical documents call it a worktree. |
| requirement | One thing the product must do, written so that it can be checked. |
| example | A "when this, then that" case under a requirement; the technical documents call it a scenario, and each becomes a test. |
| standing description | What the product does now, one file per area of the product; the technical documents call it the living spec. |
| check | An automatic test of the repository that refuses one kind of mistake; the technical documents call it a gate. |
| proposed change | A pull request: a set of changes offered for merging into the shared version. |
| reviewer | The automated reviewer that merges each proposed change, or leaves it to a person when it touches a file on the list of risky things. |
| recorded decision | An entry in `docs/decisions.md`, the register, which wins over every other document. |
| instructions | The files that tell the agents how to work: `CLAUDE.md`, and the skills and agents under `.claude/`. |
| key | A name such as `CNT-HOOKS`, standing for a count kept in `count-index.md`. |

## Where to read more

| If you want | Read |
|---|---|
| the route an operator follows | `docs/playbook.md` |
| what was decided and why | `docs/decisions.md` |
| the rules every agent follows | `CLAUDE.md` |
| why the repository exists, and how its parts fit | `README.md` |
| what the demo calculator does | `openspec/specs/calculator/spec.md` |
| every counted figure | `count-index.md` |
