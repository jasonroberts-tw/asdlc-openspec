---
name: add-task
description: use this skill when adding, renaming or removing a task in tasks.toml — including a new emitter, gate, check or selftest that will be run as `mise run <name>`.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

A task in `tasks.toml` is a public name. Prompts, tool headers, the READMEs and policy files
cite it as prose, and **nothing in this repository gates those citations** — a renamed task
leaves dead references behind that stay green forever. `mise run check:jobs` holds only the `run:`
lines of `git-hooks.yml` and the CI workflow, and its own list of the tasks no job runs. Treat the
name and the documentation as part of the change, not as follow-up.

## 1. Name it

`<group>:<verb>`. Reuse an existing prefix wherever one fits; a new prefix means a new README
sub-section, which is a decision, not a side effect. A person makes it when they merge the pull
request, so its description names the new prefix and says why no existing one fits.

The suffixes are the bare name, `:check`, `:selftest` and `:update`, and what each one must do is
`CLAUDE.md` § The script suffix contract. An emitter's `:check` twin in particular is how a
reviewer trusts a committed artifact.

A third segment only when it names a sub-artifact rather than a variation
(`check:jobs:selftest`).

## 2. Put the code where its neighbours are

A node emitter with its own module tree goes in `tools/<name>/*.ts`, run by plain `node`. Node
22.18+ strips the types itself, so write every relative import with its `.ts` extension, and use
no enums, namespaces or parameter properties, which the stripper cannot erase. A gate is one file,
`scripts/*.mjs`, run with `node`. Match the neighbours and add no new runtime: a launcher adds its
start-up time to every run of every script it starts.

Open the file with the header its neighbours use. It says what the file emits, **the failure it
exists to prevent**, the `mise run <name>` call with its flags, and what it needs from outside this
repository.

## 3. If it writes an artifact, make it deterministic

An unchanged input produces byte-identical output. That is what makes the artifact diffable in
review, and it is the precondition for a `:check` twin. The rules that get there, the twin landing
in the same change among them, are `CLAUDE.md` § The script suffix contract.

## 4. Decide gating from what it reads, not from how much you trust it

- **Reads only committed files** → it can be a `pre-push` job *and* a CI step, even when it talks
  over loopback to a server it starts from them (`docs/decisions.md` § D-04).
- **Reads another checkout** → it can be neither. CI does not clone that checkout, so a `--check`
  there would compare a real artifact against one with every source-derived signal zeroed. Say so
  in the header; its selftest over fixtures is the job and the step (`CLAUDE.md` § The gate ladder).
- **Legitimately-absent input** → skip clean with a message, never fail. A gate that is red on every
  fresh clone gets bypassed with `--no-verify`, which costs you every other gate too.

Then wire it: a job in `git-hooks.yml` under `pre-push`, a step in `.github/workflows/verify.yml`,
or both. The job is `run: mise run <name>`, plus a `glob` listing every file whose change can
alter its verdict, re-derived from what the script reads and imports. The pre-push header there
states the rule. When in doubt, make it wider: a too-narrow glob is a gate that silently stops
running on a real push, and `mise run gates` runs every job regardless. A task that no job runs,
such as a bare emitter or an operator command, gets an entry in `UNJOBBED_BY_KIND` in
`scripts/check-jobs.mjs`, under its kind, in the same change; `check:jobs` refuses it otherwise.

## 5. Update `README.md` § The tasks — this is not optional

The section lists **every** task in `tasks.toml`, by these rules:

- One `###` sub-section per prefix, sub-sections alphabetical. A new prefix gets a new sub-section
  in its alphabetical position; a prefix that loses its last task loses its sub-section.
- Rows alphabetical within the sub-section. Each row is `` | `task` | what it does | Gate | ``.
- The **Gate** cell is `pre-push`, `CI`, `pre-push + CI`, or empty — read off `git-hooks.yml` and
  `.github/workflows/verify.yml` as they now stand, not off what you intended.
- The description says what the task does and what breaks without it. It does not restate the
  command line; `tasks.toml` holds that, and two copies means one goes stale.
- Any figure in it must be re-derived at the time of writing, with no exceptions for numbers copied
  out of a source comment. Those drift silently, because a numeral in a comment is not an input to
  anything.

Also update `README.md` § What runs automatically when you add, change or remove a hook, a job or
a CI step. In `README.md` § The guardrails, update any row that names the task, and the row of any
failure the task now refuses. No row can name a task that is only now being added, so an
addition finds its row by the failure it refuses.

## 6. Renaming or removing one

Do all four, in any order. Step 3 is held by a gate, `check:jobs`; a miss anywhere else stays
green.

1. Delete or rewrite the `tasks.toml` entry.
2. Delete or rewrite its rows in `README.md`: § The tasks, and the sub-section if it is now
   empty, and § The guardrails and § What runs automatically wherever they name it.
3. Remove the `git-hooks.yml` job and the `verify.yml` step. If no job ran it, remove its entry from
   `UNJOBBED_BY_KIND` in `scripts/check-jobs.mjs`, which `check:jobs` refuses once the task is
   gone.
4. Search tracked files of every type for the bare name, one call per name:
   `git grep -n -w -F <old-name>`. Fix every live hit. Most citations carry no `mise run`: the
   READMEs cite the name in backticks, `tools/policy/*.json` in a `gatedBy` string, and a gate keeps
   it as a quoted string in a list. A recursive `grep` also walks `node_modules/` and, from the
   primary checkout, every worktree under `.claude/worktrees/`. Two files keep their hits:
   `docs/decisions.md`, whose entries are never rewritten (`CLAUDE.md` § Decisions live in the
   register), and `KIT-CHECKLIST.md`, left as `docs/decisions.md` § D-05 left it.

A retired task's references are worth leaving *only* as an explicit comment saying it is retired
and why; the CI workflow is where such a comment belongs.

## 7. Verify before you claim it works

```bash
mise run <new-task>
mise run gates
```

Confirm your job actually fired rather than silently matching nothing: check that its name appears
in the run's output. A job that never fires is worse than no job, because you will now defend the
green result.

One at a time, delete each refusal or check the script makes, rerun its selftest and restore it:
each deletion must turn a case red, or nothing holds it.

Run each command as a separate Bash call, as `CLAUDE.md` § Bash command style asks, so a red
result names the step that produced it.
