/**
 * OpenSpec gate: every living spec and every active change under `openspec/` is valid, every active
 * change applies to the living spec, and no retired generated skill has come back.
 *
 *   npm run openspec:check       the gate
 *   npm run openspec:selftest    its fixtures -- every refusal exercised on a doctored copy
 *
 * THE JOB THIS EXISTS FOR. Product work runs as changes in OpenSpec's on-disk format, and the pinned
 * OpenSpec CLI is used for two commands only: `validate` and `archive` (`docs/decisions.md` § D-02).
 * No incident yet; this is what it would let through if it were wrong or absent:
 *
 *   1. A delta spec that the archive cannot merge. Measured on the pinned 1.6.0 on 2026-09-23:
 *      `openspec validate --strict` passes a change whose MODIFIED requirement names a requirement
 *      the living spec does not have; only `openspec archive` refuses it ("... - not found. Aborted.
 *      No files were changed."). So validation alone would wave the change through review and the
 *      failure would surface at Finalize, after the build. This gate trial-archives every active
 *      change into a scratch copy of `openspec/` and refuses the one that does not apply.
 *   2. A requirement with no scenario, a change with no delta at all, a requirement without
 *      SHALL or MUST: the CLI's own strict validation, reported per item.
 *   3. A living spec still carrying the Purpose the archive writes for a new capability
 *      ("TBD - created by archiving change <id>. Update Purpose after archive."). It is long enough
 *      to pass `--strict`, so nothing else notices it.
 *   4. A generated `openspec-*` skill written back by `openspec init` or `openspec update`, which
 *      rewrite them from each machine's global configuration. They were retired by D-02 because their
 *      tracking model (a `tasks.md` checklist) contradicts `CLAUDE.md` § The task store.
 *
 * WHAT IS NOT CHECKED, deliberately: an archived change under `openspec/changes/archive/` (the CLI
 * does not list it, and it records what a change proposed on its day); the proposal's prose, beyond
 * what the CLI validates; and the change's epic in `bd`, which a fresh clone does not have
 * (`change-verify` checks it in session).
 *
 * The CLI never reaches the network: telemetry is turned off in the environment of every spawn. It
 * resolves its root as the nearest `openspec/` above its working directory, so the gate refuses a
 * tree with no `openspec/` rather than let the CLI walk up into an enclosing checkout.
 *
 * NEGATIVE TESTING. `--selftest` builds a small fixture tree under `os.tmpdir()`, doctors ONE thing
 * per case and asserts the run fails FOR THAT REASON, plus an undoctored control that must pass. By
 * hand, point `OPENSPEC_CHECK_ROOT` at a doctored copy:
 *
 *   OPENSPEC_CHECK_ROOT=/tmp/doctored node scripts/check-openspec.mjs
 *
 * NEEDS the pinned devDependency `@fission-ai/openspec` (`npm ci`), found by walking up from this
 * checkout (`scripts/lib/bin-path.mjs`), never through `npx`. Reads only committed files; no
 * sibling checkout, no token. Cost measured on the author's macOS host: one CLI start is about a
 * fifth of a second, and the gate spends one per run plus one per active change.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { findBin } from './lib/bin-path.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.OPENSPEC_CHECK_ROOT ?? REPO_ROOT

const OPENSPEC_DIR = 'openspec'
const SKILLS_DIR = '.claude/skills'
/** The directory prefix `openspec init` and `openspec update` write skills under. */
const RETIRED_SKILL_PREFIX = 'openspec-'
/** The opening of the Purpose `openspec archive` writes into a living spec it creates. */
const ARCHIVE_PLACEHOLDER = 'TBD - created by archiving change'
/** Every spawn of the CLI: no telemetry, no colour codes in the text it prints. */
const CLI_ENV = { OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1', NO_COLOR: '1' }

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Run every assertion against the tree at `root` with the CLI at `bin`. Returns the failures rather
 * than exiting, so the selftest can run it against doctored copies.
 */
export function runCheck(root, bin) {
  const failures = []
  const fail = (message) => failures.push(message)

  /* ------------------------------------------------- 1. no retired skill has come back ---------- */

  const skillsDir = join(root, SKILLS_DIR)
  if (existsSync(skillsDir)) {
    for (const name of readdirSync(skillsDir).sort(byCodePoint)) {
      if (!name.startsWith(RETIRED_SKILL_PREFIX)) continue
      fail(
        `${SKILLS_DIR}/${name}/ is a generated OpenSpec skill, retired by D-02` +
          ` (\`docs/decisions.md\` § D-02). Delete it: the \`change-*\` skills run the workflow, and` +
          ` \`openspec init\` and \`openspec update\` are not run in this repository.`,
      )
    }
  }

  /* ------------------------------------------------- 2. the tree the CLI reads ------------------ */

  const openspecDir = join(root, OPENSPEC_DIR)
  if (!existsSync(openspecDir) || !statSync(openspecDir).isDirectory()) {
    fail(
      `${OPENSPEC_DIR}/ is missing under ${root}. D-02 keeps the living spec and every change there,` +
        ` and without it the CLI would walk up to the nearest enclosing \`${OPENSPEC_DIR}/\` and` +
        ` validate someone else's tree.`,
    )
    return { failures, specs: 0, changes: 0 }
  }
  if (!bin) {
    fail(
      `the pinned OpenSpec CLI is not installed: no \`node_modules/.bin/openspec\` above ${REPO_ROOT}.` +
        ` Run \`npm ci\`. A gate fails on a missing tool; it never downloads one.`,
    )
    return { failures, specs: 0, changes: 0 }
  }

  /* ------------------------------------------------- 3. strict validation, per item ------------- */

  const run = spawnSync(bin, ['validate', '--all', '--strict', '--no-interactive', '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, ...CLI_ENV },
  })
  let report
  try {
    report = JSON.parse(run.stdout)
  } catch {
    const said = firstLine(run.stderr) || firstLine(run.stdout) || run.error?.message || 'nothing'
    fail(
      `\`openspec validate\` did not answer in JSON (exit ${run.status}; it said: ${said}). The CLI` +
        ` was found and then failed, which is a failure, never a skip.`,
    )
    return { failures, specs: 0, changes: 0 }
  }
  const items = [...(report.items ?? [])].sort(
    (a, b) => byCodePoint(a.type, b.type) || byCodePoint(a.id, b.id),
  )
  let invalid = 0
  for (const item of items) {
    if (item.valid) continue
    invalid++
    const issues = item.issues ?? []
    if (issues.length === 0) fail(`${item.type} \`${item.id}\` is invalid, and the CLI named no issue.`)
    for (const issue of issues) {
      fail(`${item.type} \`${item.id}\`: ${issue.level} at ${issue.path}: ${issue.message}`)
    }
  }
  if (run.status !== 0 && invalid === 0) {
    fail(`\`openspec validate\` exited ${run.status} but reported no invalid item.`)
  }

  /* ------------------------------------------------- 4. no archive placeholder left behind ------ */

  const specsDir = join(openspecDir, 'specs')
  if (existsSync(specsDir)) {
    for (const capability of readdirSync(specsDir).sort(byCodePoint)) {
      const specPath = join(specsDir, capability, 'spec.md')
      if (!existsSync(specPath)) continue
      if (readFileSync(specPath, 'utf8').includes(ARCHIVE_PLACEHOLDER)) {
        fail(
          `${OPENSPEC_DIR}/specs/${capability}/spec.md still carries the Purpose the archive writes` +
            ` for a new capability ("${ARCHIVE_PLACEHOLDER} ..."). Write the capability's real` +
            ` Purpose; \`change-finalize\` does this right after the archive.`,
        )
      }
    }
  }

  /* ------------------------------------------------- 5. every active change applies ------------- */

  const changes = items.filter((item) => item.type === 'change' && item.valid).map((item) => item.id)
  for (const id of changes) {
    const scratch = mkdtempSync(join(tmpdir(), 'check-openspec-apply-'))
    try {
      cpSync(openspecDir, join(scratch, OPENSPEC_DIR), { recursive: true })
      const trial = spawnSync(bin, ['archive', id, '--yes'], {
        cwd: scratch,
        encoding: 'utf8',
        env: { ...process.env, ...CLI_ENV },
      })
      if (trial.status !== 0) {
        fail(
          `change \`${id}\` does not apply to the living spec: ${archiveReason(trial)}. The archive` +
            ` refuses when a MODIFIED, REMOVED or RENAMED block names a requirement the living spec` +
            ` does not have (rebase onto \`origin/main\` and re-read it), and when the merged spec` +
            ` would not validate (a living-spec failure above is then the cause).`,
        )
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }

  return {
    failures,
    specs: items.filter((item) => item.type === 'spec').length,
    changes: items.filter((item) => item.type === 'change').length,
  }
}

function firstLine(text) {
  return (text ?? '').split('\n').map((line) => line.trim()).find((line) => line !== '') ?? ''
}

/** The lines of a refused archive that say why, without the non-blocking proposal warnings. */
function archiveReason(trial) {
  const lines = `${trial.stdout ?? ''}\n${trial.stderr ?? ''}`
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  const why = lines.filter((line) => /fail|error|not found|abort/i.test(line))
  const said = (why.length > 0 ? why : lines.slice(-1)).join(' / ').replace(/[.:]+$/, '')
  return said || `exit ${trial.status}, no output`
}

/* --------------------------------------------------------------------------------- the gate ----- */

function main() {
  const bin = findBin('openspec', REPO_ROOT)
  const { failures, specs, changes } = runCheck(ROOT, bin)
  if (failures.length === 0) {
    if (specs === 0 && changes === 0) {
      console.log(
        `openspec: nothing to validate yet (no living spec under ${OPENSPEC_DIR}/specs/, no active` +
          ` change under ${OPENSPEC_DIR}/changes/); no retired skill under ${SKILLS_DIR}/.`,
      )
    } else {
      console.log(
        `openspec: ${specs} living spec(s) and ${changes} active change(s) validate strictly; every` +
          ` active change applies to the living spec; no retired skill under ${SKILLS_DIR}/.`,
      )
    }
    process.exit(0)
  }
  console.error(`openspec: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

const LIVING_SPEC = `# greeting Specification

## Purpose
How the greeting capability greets a reader who arrives, in every channel it serves.

## Requirements
### Requirement: Greeting is polite
The system SHALL greet every reader politely.

#### Scenario: A reader arrives
- **WHEN** a reader arrives
- **THEN** the system greets them politely
`

const PROPOSAL = `## Why

Readers who leave are never thanked, and every reviewer of the greeting has asked for a farewell.

## What Changes

- Add a farewell to the greeting capability.
`

const DELTA = `## ADDED Requirements

### Requirement: Farewell is polite
The system SHALL bid every departing reader a polite farewell.

#### Scenario: A reader leaves
- **WHEN** a reader leaves
- **THEN** the system bids them farewell
`

const FIXTURE = {
  'openspec/config.yaml': 'schema: spec-driven\n',
  'openspec/specs/greeting/spec.md': LIVING_SPEC,
  'openspec/changes/add-farewell/proposal.md': PROPOSAL,
  'openspec/changes/add-farewell/specs/greeting/spec.md': DELTA,
  '.claude/skills/change-propose/SKILL.md': '---\nname: change-propose\n---\n',
}

function selftest() {
  const bin = findBin('openspec', REPO_ROOT)
  if (!bin) {
    console.error('selftest: the pinned OpenSpec CLI is not installed; run `npm ci` first.')
    process.exit(1)
  }
  const base = mkdtempSync(join(tmpdir(), 'check-openspec-'))
  const results = []
  try {
    for (const { name, doctor, expect, tool } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      writeTree(dir, FIXTURE)
      doctor(dir)
      const { failures } = runCheck(dir, tool === undefined ? bin : tool)
      let ok
      let detail
      if (expect === 'pass') {
        ok = failures.length === 0
        detail = ok ? 'passes' : `unexpected failure(s): ${failures.join(' | ')}`
      } else {
        ok = failures.some((failure) => expect.test(failure))
        detail = ok
          ? `fails for that reason (${failures.length} failure(s))`
          : failures.length === 0
            ? 'PASSED, but should have failed'
            : `failed, but not for that reason: ${failures.join(' | ')}`
      }
      results.push({ name, ok, detail })
      if (name.startsWith('control') && !ok) {
        console.error(`selftest: the undoctored fixture does not pass, so no case can be trusted: ${detail}`)
        process.exit(1)
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }

  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  }
  console.log(
    `openspec selftest: ${results.length - failed.length}/${results.length} cases hold` +
      ` (control plus ${results.length - 1} doctored copies).`,
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

function writeTree(dir, files) {
  for (const [relative, body] of Object.entries(files)) {
    const path = join(dir, relative)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
}

/** Rewrite one file in a doctored copy; a rewrite that changes nothing is a broken fixture. */
function edit(dir, relative, transform) {
  const path = join(dir, relative)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after === before) {
    throw new Error(`selftest fixture for ${relative} changed nothing -- the doctoring missed its target`)
  }
  writeFileSync(path, after)
}

function cases() {
  const delta = 'openspec/changes/add-farewell/specs/greeting/spec.md'
  const living = 'openspec/specs/greeting/spec.md'
  return [
    {
      name: 'control: the undoctored fixture passes',
      doctor: () => {},
      expect: 'pass',
    },
    {
      name: 'a tree with no living spec and no change passes, and says so',
      doctor: (dir) => {
        rmSync(join(dir, 'openspec/specs'), { recursive: true })
        rmSync(join(dir, 'openspec/changes'), { recursive: true })
      },
      expect: 'pass',
    },
    {
      name: 'an ADDED requirement with no scenario',
      doctor: (dir) => edit(dir, delta, (t) => t.replace(/\n#### Scenario:[\s\S]*$/, '\n')),
      expect: /^change `add-farewell`: ERROR at .*must include at least one scenario/,
    },
    {
      name: 'a MODIFIED requirement the living spec does not have',
      doctor: (dir) =>
        edit(dir, delta, (t) =>
          t
            .replace('## ADDED Requirements', '## MODIFIED Requirements')
            .replace('Requirement: Farewell is polite', 'Requirement: Farewell is loud'),
        ),
      expect: /^change `add-farewell` does not apply to the living spec: .*not found/,
    },
    {
      name: 'a change with no delta at all',
      doctor: (dir) => rmSync(join(dir, 'openspec/changes/add-farewell/specs'), { recursive: true }),
      expect: /^change `add-farewell`: ERROR at .*at least one delta/,
    },
    {
      name: 'a living requirement without SHALL or MUST',
      doctor: (dir) =>
        edit(dir, living, (t) =>
          t.replace('The system SHALL greet every reader politely.', 'The system greets every reader.'),
        ),
      expect: /^spec `greeting`: ERROR at .*must contain SHALL or MUST/,
    },
    {
      name: 'a living spec still carrying the archive placeholder Purpose',
      doctor: (dir) =>
        edit(dir, living, (t) =>
          t.replace(
            'How the greeting capability greets a reader who arrives, in every channel it serves.',
            'TBD - created by archiving change add-greeting. Update Purpose after archive.',
          ),
        ),
      expect: /^openspec\/specs\/greeting\/spec\.md still carries the Purpose the archive writes/,
    },
    {
      name: 'a generated openspec-* skill written back',
      doctor: (dir) =>
        writeTree(dir, { '.claude/skills/openspec-propose/SKILL.md': '---\nname: openspec-propose\n---\n' }),
      expect: /^\.claude\/skills\/openspec-propose\/ is a generated OpenSpec skill, retired by D-02/,
    },
    {
      name: 'no openspec/ directory',
      doctor: (dir) => rmSync(join(dir, 'openspec'), { recursive: true }),
      expect: /^openspec\/ is missing under /,
    },
    {
      name: 'the CLI is not installed',
      doctor: () => {},
      tool: null,
      expect: /^the pinned OpenSpec CLI is not installed/,
    },
    {
      name: 'the CLI is found and then fails',
      doctor: () => {},
      // Node itself, asked to run a module called `validate`: found, runs, exits 1, prints no JSON.
      tool: process.execPath,
      expect: /^`openspec validate` did not answer in JSON \(exit 1;/,
    },
  ]
}

if (process.argv.includes('--selftest')) selftest()
else main()
