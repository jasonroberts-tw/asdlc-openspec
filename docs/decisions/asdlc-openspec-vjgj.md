# asdlc-openspec-vjgj · Each decision after D-59 is a record of its own under `docs/decisions/`, and `docs/decisions.md` is frozen but for amendment blockquotes

**Recorded 2026-10-08**, carried by `asdlc-openspec-vjgj`. The maintainer chose the layout on
2026-10-06, as option 7 of `asdlc-openspec-w95h`. The alternatives were bd ids in the one file (that
brief's first recommendation), records with a generated view, and not adopting, each put with the
case where it loses. At this entry's claim, on 2026-10-08, they made two more choices, each from
options put with the case where it loses. The file freezes at D-59, its last numbered entry, over
moving D-55 to D-59 into records. An entry's id is the issue its Recorded line names, with a new
decision issue for a second entry from that issue, over the decision issue and over a new decision
issue for every entry. The session chose where the skeleton lives, the record's heading and the
words.

**Builds on / amends:** amends D-01, whose register was the one file the kit laid down. Builds on
D-07, whose floor holds the register, now `docs/decisions/**` beside `docs/decisions.md`; on D-12,
under which `CLAUDE.md` was consolidated before its edit and each changed prompt's budget is set to
its count; and on D-27, whose records take the policy changes.

**Decision.**

1. **Every decision or risk after D-59 is a record of its own**, `docs/decisions/<id>.md`, in the
   skeleton of `docs/decisions.md` § How an entry is written, and opens with `# <id> · <title>`.
2. **Its id is the `bd` id of the issue that carries it**, the one its Recorded line names. A second
   entry from that issue takes the id of a new `bd create --type decision`, whose body points at
   the record and repeats none of it.
3. **A record is cited as `` `docs/decisions/<id>.md` § Decision ``**, or `§ Risk` for a risk. The
   citations gate checks that form, and does not check a bare path (w95h's trials E6b, E6c and E6e).
4. **`docs/decisions.md` is frozen at D-59.** Its headings, status line, tables and range bound never
   change again, so `check:register` holds them as they stand. It takes only the dated blockquote a
   later entry adds under one of its entries, and no table cell moves with it (E8a against E8b).
   Only a pointer to one of its numbered entries names it.
5. **`docs/decisions/README.md` has the bolded thesis and no table with a row per record**, under an
   exemption `CLAUDE.md` § Every directory and document says what it is, and who wins states.
6. **`docs/decisions/**` is on the high-risk floor** (`prReviewHighRiskPaths` in
   `tools/policy/pr-review.json`), so a pull request that adds or amends a record is a person's to
   merge, as one that changes `docs/decisions.md` is. `docs/decisions/` is in
   `citationSupportSkipPaths`, and `.vale.ini` styles a record as it styles `docs/decisions.md`.

**Why.** Register ids collided between branches. The trunk's commit messages record 10
renumberings across 9 entries, and renumbering D-31 changed 19 files. When two branches each add a
record, the second rebases with no conflict (E7a). When each adds a numbered entry to the one file,
the second stops on 3 hunks (E4a). The pointers into `docs/decisions.md` keep resolving, with none
rewritten. The alternatives lost:

- **bd ids in the one file** (option 3, the brief's first recommendation). Renumbering ends there
  too, but the second of two branches still stops on 3 hunks, the status clause, the table row and
  the insertion point, and a person resolves them by hand (E4a2).
- **Records with a committed, generated view** (the candidate as specified). The view conflicts as
  the one file does (E4b). The emitter, its `:check` and a migration of every entry, 56 when w95h
  split them at D-54 (E3), also cost more than this layout's one gate.
- **A README row per record, kept in id order.** Two rows conflict when they land in the same gap
  (E7d). The maintainer chose the exemption: "use an exemption", "don't keep sorting".
- **Freezing at D-54, where w95h measured**, by moving D-55 to D-59 into records. That rewrites five
  entries, which `docs/decisions.md` § How an entry changes forbids, and every pointer to them.
- **The decision issue as the id**, `asdlc-openspec-w95h` for this entry. It fails for an entry
  chosen in conversation, with no decision issue, as D-58 and D-59 were.

Where it loses:

- **The register lives in two places**, so a reader that searches only `docs/decisions.md` misses a
  record. `bead` § 1's `git grep`, which this entry widens, was one. The maintainer's answer: "the
  baseline prompt should be clear that the decisions are in the folder as individual files and not
  decisions.md. only old citations would go directly to decisions.md", which `CLAUDE.md` § Decisions
  live in the register now says.
- **No gate holds a record yet.** Its name, its skeleton, the ids it amends and the blockquote under
  each go unchecked until `asdlc-openspec-j69i` lands. A bare path to a missing record passes the
  citations gate meanwhile (E6b).
- **An issue that carries two entries**, as `asdlc-openspec-owva.1` carried D-51 and R-02, names one
  record for itself and the other for a decision issue that holds only a pointer.
- **Two branches that amend one frozen entry still conflict** (E8d), as in every layout.
- **A reader going by w95h's close reason, "frozen at D-54"**, looks for D-55 under
  `docs/decisions/` and finds nothing.
- **`CLAUDE.md` names no range.** `check:register` refuses a full range there (`CITING_FILES` in
  `scripts/check-register-status.mjs`), so `CLAUDE.md` says "after D-59" and "a numbered entry"
  where `docs/decisions.md` says D-01 to D-59.

**What changed.**

- **`docs/decisions.md`:** the preamble says the file is frozen and points at `docs/decisions/`; the
  blockquote above the table says nothing in it changes again; § How an entry is written gives a
  record's name, heading and id; § How an entry changes names the amending entry by its id and moves
  no table cell; D-01's amendment.
- **`docs/decisions/`:** this record and `README.md`.
- **`CLAUDE.md`:** § Decisions live in the register, consolidated first; § Every directory and
  document says what it is, and who wins, with the exemption; § Citations.
- **Prompts that named the one file or the numbering:** `.claude/agents/fan-out-work.md`, without
  its "Same numbered sequence" row and its renumbering step; `.claude/agents/branch-reviewer.md`;
  the skills `bead`, `change-design`, `add-task`, `change-finalize`, `change-propose`, `explore`,
  `retire-asset` and `should-i-adopt`; `.claude/workflows/build-change-task.js`'s record lens, whose
  `check:register` holds `docs/decisions.md` alone; and the budget of each that moved, in
  `tools/policy/prompt-budgets.json`.
- **Stored cases:** `bead-names-implied-register-entry.json`,
  `fan-out-integrates-without-merge-commits.json` and
  `claude-md-amends-every-entry-decision-changes.json`, reworded where they gave an entry a number or
  put a new one in the one file. No expected answer changes.
- **Policy:** `docs/decisions/**` in `prReviewHighRiskPaths` (`tools/policy/pr-review.json`);
  `docs/decisions/` in `citationSupportSkipPaths` (`tools/policy/tool-settings.json`);
  `asset:register`'s description (`tools/policy/vocabulary.json`).
- **`.vale.ini`:** a `[docs/decisions/*.md]` section, styled as `[docs/decisions.md]`.
- **Documents:** the register's rows and sentences in `README.md`, `docs/README.md` (with a row for
  this directory's README), `docs/playbook.md` and `docs/plain-language-guide.md` (each with a dated
  amendment on its Status line), `docs/retired/README.md` (its banner names the retiring entry by
  its id), `openspec/README.md` and `tools/policy/README.md`.

**Figures.**

- 10 renumberings across 9 entries: `asdlc-openspec-w95h`'s brief, from the commits
  `git log -i -E --grep "renumber|written as D-|was D-[0-9]+|reached the trunk first|landed (its own )?D-" origin/main`
  lists, each body read in turn. The same command lists the same 13 commits at `d769f55`, where the
  brief ran, and at `e523fbf`, where this branch was cut.
- 19 files changed by D-31's renumbering: `git show --shortstat e8919c3`.
- The trials E3 to E8: `asdlc-openspec-w95h`'s notes, run in an image built at `d769f55`. E3 split
  that commit's `docs/decisions.md` into 56 records, D-01 to D-54, R-01 and R-02.
- `CLAUDE.md` from 3,594 words to 3,562 after its consolidation, and to 3,627 after the edit, its new
  budget: `node scripts/check-prompts.mjs --counts` at each commit.
