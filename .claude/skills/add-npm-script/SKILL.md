---
name: add-npm-script
description: use this skill when adding, renaming or removing an npm script in package.json — including a new emitter, gate, check or selftest that will be run as `npm run <name>`.
---

Read CLAUDE.md first. Everything below is subordinate to it and points at it rather than restating it.

A script in `package.json` is a public name. Prompts, tool headers, the READMEs and policy files
cite it as prose, and **nothing in this repository gates those citations** — a renamed script
leaves dead references behind that stay green forever. `npm run check:jobs` holds only the `run:`
lines of `lefthook.yml` and the CI workflow, and its own list of the scripts no job runs. Treat the
name and the documentation as part of the change, not as follow-up.

## 1. Name it

`<group>:<verb>`. Reuse an existing prefix wherever one fits; a new prefix means a new README
sub-section, which is a decision, not a side effect. A person makes it when they merge the pull
request, so its description names the new prefix and says why no existing one fits.

The suffixes are the bare name, `:check`, `:selftest` and `:update`, and what each one must do is
`CLAUDE.md` § The script suffix contract. An emitter's `:check` twin in particular is how a
reviewer trusts a committed artifact.

A third segment only when it names a sub-artifact rather than a variation
(`pipeline:stale:check`, `lint:ratchet:update`).

## 2. Put the code where its neighbours are

`tools/<name>/*.ts` run by plain `node` for a node emitter that has its own module tree (Node 22.18+
strips the types itself; write every relative import with its `.ts` extension and use no enums,
namespaces or parameter properties, which the stripper cannot erase); a single-file `scripts/*.mjs`
run with `node` for a gate. Match the neighbours and introduce no new runtime: a launcher adds its
start-up time to every run of every script it starts.

Open the file with the header the neighbours use: what it emits, **the failure it exists to
prevent** (in this repository that is the paragraph readers actually need), the `npm run <name>`
invocation with its flags, and whether it needs the sibling `../sibling` checkout. Node emitters
carry the `KIND / INVARIANTS / RE-ENTRY / STALE WHEN` block.

## 3. If it writes an artifact, make it deterministic

An unchanged input produces byte-identical output. That is what makes the artifact diffable in
review, and it is the precondition for a `:check` twin. The rules that get there, the twin landing
in the same change among them, are `CLAUDE.md` § The script suffix contract.

## 4. Decide gating from what it reads, not from how much you trust it

- **Reads only committed files** → it can be a `pre-push` job *and* a CI step.
- **Reads `../sibling`** → it can be neither. CI does not clone that checkout, so a `--check`
  there would compare a real artifact against one with every source-derived signal zeroed. Say so
  in the header, and rely on
  `npm run pipeline:stale` to keep the node behind an automated gate.
- **Legitimately-absent input** → skip clean with a message, never fail. A gate that is red on every
  fresh clone gets bypassed with `--no-verify`, which costs you every other gate too.

Then wire it: a job in `lefthook.yml` under `pre-push` — `run: node --run <name>`, plus a `glob`
listing every file whose change can alter its verdict, re-derived from what the script reads and
imports (the pre-push header there states the rule; when in doubt, wider — a too-narrow glob is a
gate that silently stops running on a real push, and `npm run gates` runs every job regardless) —
a step in `.github/workflows/verify.yml`, or both. If it is a pipeline node's emitter or check, register it
in `tools/pipeline/graph.ts` — `npm run pipeline:check` will tell you if the manifest no longer
describes the repository. A script that no job runs, such as a bare emitter or an operator command,
gets an entry in `UNJOBBED_BY_KIND` in `scripts/check-jobs.mjs`, under its kind, in the same
change; `check:jobs` refuses it otherwise.

## 5. Update `README.md` § The npm scripts — this is not optional

The section documents **every** script in `package.json`, and its structure is mechanical:

- One `###` sub-section per prefix, sub-sections alphabetical. A new prefix gets a new sub-section
  in its alphabetical position; a prefix that loses its last script loses its sub-section.
- Rows alphabetical within the sub-section. Each row is `` | `script` | what it does | Gate | ``.
- The **Gate** cell is `pre-push`, `CI`, `pre-push + CI`, or empty — read off `lefthook.yml` and
  `.github/workflows/verify.yml` as they now stand, not off what you intended.
- The description says what the script does and what breaks without it. It does not restate the
  command line; `package.json` holds that, and two copies means one goes stale.
- Any figure in it must be re-derived at the time of writing, with no exceptions for numbers copied
  out of a source comment. Those drift silently, because a numeral in a comment is not an input to
  anything.

Also update `README.md` § What runs automatically when you add, change or remove a hook, a job or
a CI step. In `README.md` § The guardrails, update any row that names the script, and the row of any
failure the script now refuses. No row can name a script that is only now being added, so an
addition finds its row by the failure it refuses.

## 6. Renaming or removing one

Do all five, in any order. Steps 3 and 5 are held by gates, `check:jobs` and `pipeline:check`; a
miss anywhere else stays green.

1. Delete or rewrite the `package.json` entry.
2. Delete or rewrite its rows in `README.md`: § The npm scripts, and the sub-section if it is now
   empty, and § The guardrails and § What runs automatically wherever they name it.
3. Remove the `lefthook.yml` job and the `verify.yml` step. If no job ran it, remove its entry from
   `UNJOBBED_BY_KIND` in `scripts/check-jobs.mjs`, which `check:jobs` refuses once the script is
   gone.
4. Search tracked files of every type for the bare name, one call per name:
   `git grep -n -w -F <old-name>`. Fix every live hit. Most citations carry no `npm run`:
   `lefthook.yml` launches through `node --run`, the READMEs cite the name in backticks,
   `tools/policy.json` in a `gatedBy` string, and a gate keeps it as a quoted string in a list. A
   recursive `grep` also walks `node_modules/` and, from the primary checkout, every worktree under
   `.claude/worktrees/`. Two files keep their hits: `docs/decisions.md`, whose entries are never
   rewritten (`CLAUDE.md` § Decisions live in the register), and `KIT-CHECKLIST.md`, left as
   `docs/decisions.md` § D-05 left it.
5. If it was a pipeline node's check, update `tools/pipeline/graph.ts`.

A retired script's references are worth leaving *only* as an explicit comment saying it is retired
and why; the CI workflow is where such a comment belongs.

## 7. Verify before you claim it works

```bash
npm run <new-script>
npm run gates
```

`npm run gates`, never the bare `lefthook run pre-push` — the bare form reports every job as
skipped whenever HEAD matches the tracking remote and exits 0. Then confirm your
job actually fired rather than silently matching nothing: check that its name appears in the run's
output. A job that never fires is worse than no job, because you will now defend the green result.

Run each command as a separate Bash call, as `CLAUDE.md` § Bash command style asks, so a red
result names the step that produced it.
