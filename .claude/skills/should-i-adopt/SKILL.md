---
name: should-i-adopt
description: Assess whether to bring a tool or a pattern into this repository's harness - look for a prior decision first, name the problem it would solve, test its integration friction against this repository's rules with trials inside Docker, weigh it against not adopting, and file the brief as a decision issue for a person to choose from. Use when asked "should we adopt, add, use or switch to X", to evaluate or vet a CLI, library, MCP server, plugin, hook, linter or practice for the harness, or before a session adds one that no register entry decided.
argument-hint: "<tool or pattern> [the problem it would solve]"
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

# Should I adopt it?

The argument names a candidate, a tool or a pattern, and may name the problem it would solve. A run
ends with a decision brief in the tracker, or with the prior decision that settles it (step 2), and
changes no tracked file: adopting is a person's choice, recorded after they make it
(`CLAUDE.md` § A program proposes; only a person promotes). Run it from the primary checkout: a
worktree session refuses a container command that runs git (not verified against the CLI), which
step 5 needs. A run in a worktree session says so to the user, and any claim it then leaves untried
is named as no trial checked.

## 1. Name the problem

Write down what the harness does badly today that the candidate would fix, with its evidence: an
issue, a file, a gate's output. When the argument gives none, ask. A candidate with no problem is
all cost.

## 2. Look for a prior decision

Search for the candidate's name and for its kind, such as "hook runner" as well as the product:
`docs/decisions.md`, `docs/retired/`, the tracker (`CLAUDE.md` § The task store), each with a
second phrasing, and `git log -S <name> --oneline origin/main`.

- **An entry decided it, or an alternatives list ruled it out:** it is not re-argued (`CLAUDE.md` §
  Decisions live in the register). Look only for evidence it did not weigh, and stop at the first
  answer: a release after the version it assessed; that release's notes and its diff of the code
  behind each defect the entry cites; one trial (step 5) of the defect that weighed most, if the
  diff leaves it open. With nothing new, report the entry, what you checked and what would reopen
  it, and stop. Otherwise assess only what is new, and the brief names the entry it would amend.
- **An open issue carries the question:** the brief becomes a note on it, counted as `CLAUDE.md` §
  The task store says, not a new issue.

## 3. Map what it would touch

List every file, script, job, hook, prompt and policy record the adoption would add or change, and
what in the harness already does part of the job; the `code-graph` skill gives leads. These are the
requirements any option must meet.

## 4. Assess its friction here

Answer each question with what the candidate does, what it collides with (cite the path or
section), and a severity: **blocks** (it cannot land as it is), **costs** (it lands with work or an
ongoing price) or **none**. The evidence is a trial (step 5), a source with its URL and version, or
"unverified". A claim that decides the verdict needs a trial: documentation leaves out the defect
that matters.

1. **Where its instructions live.** Writing into `CLAUDE.md`, a user-level file or a memory store,
   or shipping its own skill, gives a rule a second home (`CLAUDE.md` § Rules for agents live in
   tracked files, and nowhere else). A vendored prompt needs the opening line and a row in
   `tools/policy/prompt-budgets.json`.
2. **What files it adds, and of which kind** (`CLAUDE.md` § Three kinds of file, and never a fourth).
   Output a model writes, or that carries a timestamp or randomness, cannot be committed as
   generated output.
3. **What it reads, which decides its tier** (`CLAUDE.md` § The gate ladder). Measure its time
   against that tier's; a hook's budget is in `.claude/README.md` § The hooks.
4. **What it writes outside its own files:** the shared `.git/hooks`, `core.hooksPath`, an install
   script that runs from whichever worktree runs `npm ci`, `~/.claude/`, global git or shell config.
   Every checkout shares that state, and no tracked file can remove it.
5. **How it behaves in a linked worktree:** paths baked to one checkout, per-machine state, and
   `CLAUDE_PROJECT_DIR`, which names the directory a session started in and does not follow it
   into a worktree (`.claude/README.md` § The hooks; verified against the CLI, 2.1.289).
6. **What it does to output an agent reads.** A filter, cap or rewrite breaks `CLAUDE.md` §
   Verification before claiming, and output larger than a tool result holds is read in part.
7. **The commands a session would run:** which `scripts/hooks/guard-git.mjs` or the permission
   classifier refuse, and which of its own must never run here, each needing a guard.
8. **Dependencies and platforms:** `package.json`, `package-lock.json`, a new runtime, Git and Node
   versions, macOS, Linux and the dev container (`.devcontainer/Dockerfile`). A path in
   `prReviewHighRiskPaths` (`tools/policy/pr-review.json`) sends every pull request touching it to a
   person.
9. **Cost:** money or tokens per run and who pays, words added to prompts every session loads, CI
   minutes and job time.
10. **Health:** the version assessed, release dates and breaking changes, open issues touching the
    answers above, how many maintain it, and its license.
11. **Reversal:** what retiring it takes (`docs/retired/README.md` § The three dispositions), and
    what it leaves on a machine that no tracked file can remove.

For a pattern, also name the home each of its rules would take, the gate that would hold it, and the
measure that would show it is not working, defined as `count-index.md` § Rates and metrics asks.

## 5. Try it in Docker, never on the host

A trial runs only in a container: a bad install damages the host's `~/.claude/`, the shared
`.git/hooks` and global config, and that outlives the trial. On the host a run only reads:
documentation, release notes, source, and calls to a service that change nothing there.

- **Docker must answer** `docker info`; Rancher Desktop puts the binary in `~/.rd/bin`. If it does
  not, ask the user to start Rancher Desktop and wait. Never fall back to the host.
- **Note what is there first:** `docker image ls`, `docker ps -a`, `docker network ls` and
  `docker volume ls`, before the first trial.
- **Give the container the trunk, never a mount of a checkout or a home directory:**
  `git bundle create <dir>/trunk.bundle origin/main` in a directory `mktemp -d` made, mounted
  read-only. Inside, `git init`, then
  `git fetch <bundle> refs/remotes/origin/main:refs/heads/trunk` and `git switch trunk`.
- **Use the image** `.devcontainer/Dockerfile` builds for what installs into the harness, and the
  candidate's own images for a server it runs; pin the candidate's version. A slim one lacks a
  compiler and the Git the hooks need, and npm exits 0 on a failed optional build.
- **Number each trial** E1, E2 and on, keeping its commands and the output it rests on. A trial
  outranks a document where they disagree.
- **A candidate no container can hold**, because it needs Claude Code's own settings, a GUI or a
  paid account, is assessed from sources, and the brief names the claims no trial checked.
- **Remove only what the run made:** containers, images, networks and volumes absent from the first
  listing. Pulling an image already there makes nothing new, and removing it takes someone else's.

## 6. Weigh the options

Always include not adopting; where they fit, add building the small part needed here, a narrower use
of the candidate, and one alternative. For each, give what it gains, loses, and costs to land and to
keep. An option a **blocks** answer rules out goes under "Ruled out" with that answer.

## 7. Recommend, and say where it loses

Choose **adopt**, **adopt with conditions** (each condition is work an issue can carry), **not now**
(name what would change the answer) or **do not adopt**. Give the case where it loses
(`CLAUDE.md` § A question shows where its recommendation loses).

## 8. File the brief

File it as a `decision` issue titled as the question ("Decide whether to adopt X for Y"), with the
`repo:` label and one `assetLabels` label (`tools/policy/vocabulary.json`) for each kind of file
adopting would change. The brief, in this order:

1. **Measured:** the commit and date the run read, and the candidate's version.
2. **Why it is open:** step 1's problem and its evidence.
3. **Prior decisions:** what step 2 found, or where it looked.
4. **What any option must provide:** step 3's requirements.
5. **Friction:** step 4 as a table of question, answer, severity and evidence.
6. **Trials:** each one's number, commands and result.
7. **Alternatives Considered**, bd's required name for the options, then **Ruled out**.
8. **Rationale**, its required name for the recommendation, and where it loses.
9. **Open questions:** what no source or trial settled.
10. **Acceptance Criteria:** the person chooses an option or none. Adopting becomes an entry under
    `docs/decisions.md` § How an entry is written, its work filed as issues; not adopting is the
    close reason, so the next person to raise it finds why.

## 9. Report

Close the run with the `close-prompt-run` skill, its analysis on the brief's issue. Then report the
recommendation in one line with where it loses, the issue's id, the trials run, and every claim left
unverified.
