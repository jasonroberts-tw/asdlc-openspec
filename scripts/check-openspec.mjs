/**
 * OpenSpec gate: every living spec and every active change under `openspec/` is valid, every active
 * change applies to the living spec, every scenario and NFR requirement carries a unique ID that no
 * archived change gave another title, and no retired generated skill has come back.
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
 *   5. The change label spelled in a skill or agent that does not cite `specChangeLabel` in
 *      `tools/policy.json`, its one home (`docs/decisions.md` § D-03), or one that cites the key and
 *      still spells an old value after the label moved. The label decides what the general queue
 *      offers, so a prompt spelling a stale one sweeps a change's tasks into it. Before D-03 the
 *      spelling sat in eight files, the register and seven prompts, and nothing held them together.
 *   6. A scenario or NFR requirement with no ID, or with an ID another header has or once had. Under
 *      D-13 a test is to name the ID it proves (asdlc-openspec-j09.5), so an ID on two scenarios
 *      would let one test stand for either, and an ID reused after its scenario was removed would
 *      let an old test pass for a scenario it never read. Nothing else reads the IDs: `openspec
 *      validate --strict` passes a header with none, with a malformed one, and with one another
 *      header already carries (each measured on the pinned 1.6.0 by this file's selftest, where the
 *      CLI reports nothing for those cases).
 *
 * IDS (`docs/decisions.md` § D-13, items 1, 2 and 11, whose table names this header their home;
 * landed by asdlc-openspec-j09.3). A scenario is headed `#### Scenario: [<PREFIX>-NNN] <title>` and
 * an NFR requirement `### Requirement: [NFR-<PREFIX>-NNN] <title>`, where the prefix is its
 * capability's under `specIdPrefixes` in `tools/policy.json` and NNN is three digits or more,
 * zero-padded, from 001. A requirement that is not an NFR carries no ID; its scenarios do. An ID is
 * unique within its prefix and never reused, and a reworded header is a removal and an addition with
 * a new ID, because the pinned OpenSpec matches a MODIFIED scenario by its whole header. Over the
 * living specs and the active deltas, the gate refuses:
 *
 *   - a scenario without its capability's ID, and any other level-4 header under a requirement,
 *     which OpenSpec counts as a scenario;
 *   - a requirement header that opens with a bracketed token, or with `NFR`, and is not
 *     `[NFR-<PREFIX>-NNN] <title>`; a capability with no prefix; a prefix that is not capital
 *     letters and digits, or is `NFR`, or is another capability's;
 *   - one ID on two headers of different titles, a `RENAMED` block's `TO:` line counted; on two
 *     headers of one file; or on two headers of a living spec as a trial archive leaves it;
 *   - an ID that a delta under `openspec/changes/archive/` gave a different title.
 *
 * THE NEXT FREE ID of a prefix is one more than the highest it has reached in what this gate reads:
 * the living specs, the active changes on this branch, and every archived delta. The gate prints it
 * on success and in each refusal that needs one. Two changes in flight can take the same ID, since
 * neither branch sees the other: the first to merge keeps it, and the second fails this gate when it
 * rebases onto `origin/main` (one ID on two headers) and re-keys its header and its tests.
 *
 * WHAT IS NOT CHECKED, deliberately: an archived change under `openspec/changes/archive/` (the CLI
 * does not list it, and it records what a change proposed on its day), beyond reading the title it
 * gave each ID; the proposal's prose, beyond what the CLI validates; the change's epic in `bd`, which
 * a fresh clone does not have (`change-verify` checks it in session); a spelling of the label outside
 * the skills and agents, such as the register's, which records what was decided on its day; and a
 * prefix spelled in a prompt, since a stale one is refused at the first header written with it. Two
 * gaps in the ID rules are known. An NFR requirement written with no ID and no leading `NFR` reads
 * as a functional requirement. And an ID whose only record is the living spec, as is every ID given
 * by editing the living spec directly when IDs were introduced (asdlc-openspec-j09.3), leaves no
 * trace once a change removes it, because the change's delta need not carry it (a `REMOVED` block
 * names the requirement and not its scenarios): nothing then refuses its reuse, and the next free
 * ID stays above it only while a higher ID of its prefix survives. asdlc-openspec-fa7 carries it.
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
 * fifth of a second, and the gate spends one per run plus one per active change. The ID rules read
 * the spec files themselves and start no CLI of their own.
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
const AGENTS_DIR = '.claude/agents'
/** The workflow's policy file, and the key under which it spells the change label (D-03). */
const POLICY_FILE = 'tools/policy.json'
const LABEL_KEY = 'specChangeLabel'
/** The policy key that maps each capability to the prefix of its scenario and NFR IDs. */
const PREFIX_KEY = 'specIdPrefixes'
/** The folder under `openspec/changes/` the archive moves a landed change into. */
const ARCHIVE_DIR = 'archive'
/** OpenSpec 1.6.0's own requirement header (`requirement-blocks.js`), and a `RENAMED` block's `TO:`. */
const REQUIREMENT_HEADER = /^###\s*Requirement:\s*(.+?)\s*$/i
const RENAMED_TO = /^\s*-?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/
/** A scenario header. OpenSpec counts every level-4 header under a requirement as a scenario. */
const SCENARIO_HEADER = /^####\s*Scenario:\s*(.*?)\s*$/
const LEVEL_FOUR = /^####\s/
/** A header's text as an ID takes it: the ID in brackets, then the title. */
const ID_TOKEN = /^\[([^\]]*)\]\s*(.*)$/
/** A well-formed ID: `NFR-` or nothing, a prefix, and a number of three digits or more. */
const ID_SHAPE = /^(NFR-)?([A-Z][A-Z0-9]*)-(\d{3,})$/
const PREFIX_SHAPE = /^[A-Z][A-Z0-9]*$/
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

  /* ------------------------------------------------- 2. the change label has one home ----------- */

  const policy = readPolicy(root, fail)
  const label = changeLabel(policy, fail)
  if (label !== null) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const spelled = new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`)
    for (const path of promptFiles(root)) {
      const text = readFileSync(join(root, path), 'utf8')
      const spells = spelled.test(text)
      const cites = text.includes(LABEL_KEY)
      if (spells && !cites) {
        fail(
          `${path} spells the change label \`${label}\` without citing \`${LABEL_KEY}\` in` +
            ` ${POLICY_FILE}, its one home (\`docs/decisions.md\` § D-03). Cite the key where the` +
            ` prompt first spells the label.`,
        )
      } else if (cites && !spells) {
        fail(
          `${path} cites \`${LABEL_KEY}\` but never spells its value \`${label}\`: the label moved in` +
            ` ${POLICY_FILE} and this prompt still spells the old one. Respell it here.`,
        )
      }
    }
  }

  /* ------------------------------------------------- 3. the tree the CLI reads ------------------ */

  const openspecDir = join(root, OPENSPEC_DIR)
  if (!existsSync(openspecDir) || !statSync(openspecDir).isDirectory()) {
    fail(
      `${OPENSPEC_DIR}/ is missing under ${root}. D-02 keeps the living spec and every change there,` +
        ` and without it the CLI would walk up to the nearest enclosing \`${OPENSPEC_DIR}/\` and` +
        ` validate someone else's tree.`,
    )
    return { failures, specs: 0, changes: 0, ids: null }
  }

  /* ------------------------------------------------- 4. every scenario and NFR has its ID ------- */

  const ids = checkIds(root, idPrefixes(policy, fail), fail)

  /* ------------------------------------------------- 5. strict validation, per item ------------- */

  if (!bin) {
    fail(
      `the pinned OpenSpec CLI is not installed: no \`node_modules/.bin/openspec\` above ${REPO_ROOT}.` +
        ` Run \`npm ci\`. A gate fails on a missing tool; it never downloads one.`,
    )
    return { failures, specs: 0, changes: 0, ids }
  }

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
    return { failures, specs: 0, changes: 0, ids }
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

  /* ------------------------------------------------- 6. no archive placeholder left behind ------ */

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

  /* ------------------------------------------------- 7. every active change applies ------------- */

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
      } else {
        mergedDuplicates(root, scratch, id, ids.next, fail)
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true })
    }
  }

  return {
    failures,
    specs: items.filter((item) => item.type === 'spec').length,
    changes: items.filter((item) => item.type === 'change').length,
    ids,
  }
}

/** The policy file, parsed, or undefined after reporting why it cannot be read. */
function readPolicy(root, fail) {
  const path = join(root, POLICY_FILE)
  if (!existsSync(path)) {
    fail(
      `${POLICY_FILE} is missing under ${root}. It is the one home of the change label` +
        ` (\`docs/decisions.md\` § D-03), which the change-* skills and the general sweeps spell,` +
        ` and of the prefix of every capability's scenario and NFR IDs.`,
    )
    return undefined
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    fail(`${POLICY_FILE} does not parse as JSON: ${error.message}`)
    return undefined
  }
}

/** The change label as the policy file spells it, or null after reporting why it cannot be read. */
function changeLabel(policy, fail) {
  if (policy === undefined) return null
  const label = policy?.[LABEL_KEY]
  if (typeof label !== 'string' || label.trim() === '') {
    fail(
      `${POLICY_FILE} carries no \`${LABEL_KEY}\` string. D-03 moved the change label's spelling` +
        ` there; restore the key rather than spelling the label in the prompts alone.`,
    )
    return null
  }
  const means = policy[`${LABEL_KEY}Means`]
  if (typeof means !== 'string' || means.trim() === '') {
    fail(
      `${POLICY_FILE} carries \`${LABEL_KEY}\` with no \`${LABEL_KEY}Means\` sibling saying what it` +
        ` decides and where it is changed (\`CLAUDE.md\` § Three kinds of file, and never a fourth).`,
    )
  }
  return label
}

/**
 * Each capability's ID prefix as the policy file holds it, as a Map, or null after reporting why it
 * cannot be read. A malformed prefix is reported and mapped to null, so its headers go unread rather
 * than each refused; a shared one is reported and kept, so both capabilities' headers are read.
 */
function idPrefixes(policy, fail) {
  if (policy === undefined) return null
  const held = policy?.[PREFIX_KEY]
  if (held === null || typeof held !== 'object' || Array.isArray(held) || Object.keys(held).length === 0) {
    fail(
      `${POLICY_FILE} carries no \`${PREFIX_KEY}\` object mapping each capability to the prefix of its` +
        ` scenario and NFR IDs. Restore the key: it is the prefixes' one home, and no skill or gate` +
        ` spells one.`,
    )
    return null
  }
  const means = policy[`${PREFIX_KEY}Means`]
  if (typeof means !== 'string' || means.trim() === '') {
    fail(
      `${POLICY_FILE} carries \`${PREFIX_KEY}\` with no \`${PREFIX_KEY}Means\` sibling saying what it` +
        ` decides and where it is changed (\`CLAUDE.md\` § Three kinds of file, and never a fourth).`,
    )
  }
  const prefixes = new Map()
  const owner = new Map()
  for (const capability of Object.keys(held).sort(byCodePoint)) {
    const prefix = held[capability]
    if (typeof prefix !== 'string' || !PREFIX_SHAPE.test(prefix) || prefix === 'NFR') {
      fail(
        `${POLICY_FILE} gives capability \`${capability}\` the prefix ${JSON.stringify(prefix)} under` +
          ` \`${PREFIX_KEY}\`: a prefix is capital letters and digits, opening with a letter, and is` +
          ` not \`NFR\`, which opens an NFR requirement's ID.`,
      )
      prefixes.set(capability, null)
      continue
    }
    if (owner.has(prefix)) {
      fail(
        `${POLICY_FILE} gives capabilities \`${owner.get(prefix)}\` and \`${capability}\` one prefix,` +
          ` \`${prefix}\`, under \`${PREFIX_KEY}\`: an ID names one capability, so each has its own.`,
      )
    }
    owner.set(prefix, capability)
    prefixes.set(capability, prefix)
  }
  return prefixes
}

/**
 * The ID rules of this file's header, over the living specs and the active deltas, with the archive
 * as the record of what each ID was once called. Returns what the summary and the trial archive
 * need: the living spec's ID counts, the next free ID of each prefix, and `next`, which names it.
 */
function checkIds(root, prefixes, fail) {
  const highest = new Map()
  const note = (id) => {
    const shape = id.match(ID_SHAPE)
    if (!shape) return
    const namespace = `${shape[1] ?? ''}${shape[2]}`
    highest.set(namespace, Math.max(highest.get(namespace) ?? 0, Number(shape[3])))
  }
  const next = (namespace) => `${namespace}-${String((highest.get(namespace) ?? 0) + 1).padStart(3, '0')}`

  const archived = new Map()
  for (const file of specFiles(root, true)) {
    for (const header of readHeaders(readFileSync(join(root, file.path), 'utf8'))) {
      const token = header.text.match(ID_TOKEN)
      const id = token?.[1].trim()
      if (!token || !ID_SHAPE.test(id)) continue
      note(id)
      if (!archived.has(id)) archived.set(id, [])
      archived.get(id).push({ title: token[2].trim(), change: file.change })
    }
  }

  const entries = []
  const problems = []
  const unprefixed = new Map()
  for (const file of specFiles(root, false)) {
    const prefix = prefixes?.get(file.capability)
    if (prefix === undefined && prefixes !== null) {
      if (!unprefixed.has(file.capability)) unprefixed.set(file.capability, [])
      unprefixed.get(file.capability).push(file.path)
    }
    if (typeof prefix !== 'string') continue
    for (const header of readHeaders(readFileSync(join(root, file.path), 'utf8'))) {
      const verdict = judge(header, prefix)
      if (verdict === null) continue
      const at = {
        ...verdict,
        header,
        capability: file.capability,
        change: file.change,
        path: file.path,
        where: `${file.path}:${header.line}`,
      }
      if (verdict.problem) {
        problems.push(at)
      } else {
        note(verdict.id)
        entries.push(at)
      }
    }
  }

  for (const [capability, paths] of unprefixed) {
    fail(
      `capability \`${capability}\` has no ID prefix under \`${PREFIX_KEY}\` in ${POLICY_FILE}, so no` +
        ` header of ${paths.join(', ')} can be checked. Add one in the change that adds the capability.`,
    )
  }
  for (const at of problems) fail(problemMessage(at, next(at.namespace)))

  const byId = new Map()
  for (const entry of entries) {
    if (!byId.has(entry.id)) byId.set(entry.id, [])
    byId.get(entry.id).push(entry)
  }
  for (const id of [...byId.keys()].sort(byCodePoint)) {
    const group = byId.get(id)
    const titles = [...new Set(group.map((entry) => entry.title))]
    if (titles.length > 1) {
      const heads = titles.map((title) => `"${title}" at ${group.find((entry) => entry.title === title).where}`)
      fail(
        `\`[${id}]\` heads ${titles.length} different ${group[0].kind}s: ${heads.join(', ')}. An ID is` +
          ` unique within its prefix and never reused, and a reworded header takes a new ID: re-key` +
          ` the newer, and its tests, to the next free ID, ${next(group[0].namespace)}. Two changes in` +
          ` flight that took the same ID meet here when the second rebases onto \`origin/main\`.`,
      )
      continue
    }
    const byPath = new Map()
    for (const entry of group) byPath.set(entry.path, [...(byPath.get(entry.path) ?? []), entry.header.line])
    for (const [path, lines] of byPath) {
      if (lines.length < 2) continue
      fail(
        `\`[${id}]\` heads ${lines.length} ${group[0].kind}s of ${path}, at lines ${lines.join(', ')}.` +
          ` An ID heads one ${group[0].kind}: give every one after the first a new ID, from the next` +
          ` free, ${next(group[0].namespace)}.`,
      )
    }
  }

  const reported = new Set()
  for (const entry of entries) {
    for (const record of archived.get(entry.id) ?? []) {
      const key = `${entry.id}\0${entry.title}\0${record.change}`
      if (record.title === entry.title || reported.has(key)) continue
      reported.add(key)
      fail(
        `${entry.where}: \`[${entry.id}]\` heads "${entry.title}", but archived change` +
          ` \`${record.change}\` gave it "${record.title}". An ID is never reused, and a reworded` +
          ` header takes a new ID: head this one with the next free ID, ${next(entry.namespace)}.`,
      )
    }
  }

  const living = entries.filter((entry) => entry.change === undefined)
  const namespaces = [...new Set(prefixes?.values() ?? [])]
    .filter((prefix) => typeof prefix === 'string')
    .sort(byCodePoint)
    .flatMap((prefix) => [prefix, `NFR-${prefix}`])
  return {
    scenarios: new Set(living.filter((entry) => entry.kind === 'scenario').map((entry) => entry.id)).size,
    nfrs: new Set(living.filter((entry) => entry.kind === 'NFR requirement').map((entry) => entry.id)).size,
    free: namespaces.map(next),
    next,
  }
}

/**
 * One header read against its capability's prefix: `{ id, title, kind, namespace }` for a
 * well-formed ID, `{ problem, ... }` for a header the rules refuse, or null for a requirement that
 * is not an NFR, which carries no ID.
 */
function judge(header, prefix) {
  const token = header.text.match(ID_TOKEN)
  const id = token ? token[1].trim() : null
  const title = token ? token[2].trim() : header.text
  if (header.kind === 'stray') return { problem: 'stray', namespace: prefix }
  const nfr = header.kind === 'requirement'
  const namespace = nfr ? `NFR-${prefix}` : prefix
  if (nfr && !token) return /^NFR\b/.test(header.text) ? { problem: 'unbracketed', namespace, title } : null
  if (!token) return { problem: 'no-id', namespace, title }
  const shape = id.match(ID_SHAPE)
  const canonical = shape && Number(shape[3]) >= 1 && shape[3] === String(Number(shape[3])).padStart(3, '0')
  if (!canonical || `${shape[1] ?? ''}${shape[2]}` !== namespace) return { problem: 'malformed', namespace, id, title, nfr }
  if (title === '') return { problem: 'untitled', namespace, id }
  return { id, title, kind: nfr ? 'NFR requirement' : 'scenario', namespace }
}

function problemMessage(at, free) {
  const { where, capability, namespace, id, title, header } = at
  switch (at.problem) {
    case 'no-id':
      return (
        `${where}: scenario "${title}" carries no ID. Head it \`#### Scenario: [${namespace}-NNN] ${title}\`,` +
        ` with the next free ID of its prefix, ${free}. An ID is how a task and a test name the` +
        ` scenario they trace to.`
      )
    case 'malformed':
      return at.nfr
        ? `${where}: NFR requirement "${title}" carries \`[${id}]\`, which is not an NFR ID of capability` +
            ` \`${capability}\`: an NFR requirement is headed \`[${namespace}-NNN] <title>\`, NNN three` +
            ` digits or more from 001, and the next free is ${free}. A requirement that is not an NFR` +
            ` carries no ID; its scenarios do.`
        : `${where}: scenario "${title}" carries \`[${id}]\`, which is not a scenario ID of capability` +
            ` \`${capability}\`: a scenario is headed \`[${namespace}-NNN] <title>\`, NNN three digits or` +
            ` more from 001, and the next free is ${free}.`
    case 'unbracketed':
      return (
        `${where}: requirement "${title}" opens with \`NFR\` but carries no ID in brackets: an NFR` +
        ` requirement is headed \`### Requirement: [${namespace}-NNN] <title>\`, and the next free is ${free}.`
      )
    case 'stray':
      return (
        `${where}: \`${header.raw}\` is a scenario to OpenSpec, which counts every level-4 header under a` +
        ` requirement, and it is not headed \`#### Scenario: [${namespace}-NNN] <title>\`; the next free` +
        ` ID is ${free}.`
      )
    default:
      return `${where}: \`[${id}]\` heads no title. A header is its ID and then its title.`
  }
}

/**
 * After a trial archive: an ID the merged living spec carries on two headers of one title where the
 * living spec before it did not, as when a delta restates a scenario under another requirement. Two
 * titles on one ID are left to `checkIds`, which has already refused them.
 */
function mergedDuplicates(root, scratch, change, next, fail) {
  const merged = join(scratch, OPENSPEC_DIR, 'specs')
  for (const capability of listDirs(merged)) {
    const path = `${OPENSPEC_DIR}/specs/${capability}/spec.md`
    if (!isFile(join(scratch, path))) continue
    const after = idLines(readFileSync(join(scratch, path), 'utf8'))
    const before = isFile(join(root, path)) ? idLines(readFileSync(join(root, path), 'utf8')) : new Map()
    for (const [id, { lines, titles }] of after) {
      if (lines.length < 2 || titles.size > 1 || (before.get(id)?.lines.length ?? 0) >= 2) continue
      fail(
        `change \`${change}\`, once archived, would leave \`[${id}]\` on ${lines.length} headers of` +
          ` ${path}, at lines ${lines.join(', ')} of the merged file. An ID heads one scenario or NFR` +
          ` requirement: give the one the change adds the next free ID, ${next(id.replace(/-\d+$/, ''))}.`,
      )
    }
  }
}

/** Each well-formed ID of one spec file, with the lines and the titles of the headers that carry it. */
function idLines(text) {
  const found = new Map()
  for (const header of readHeaders(text)) {
    const token = header.text.match(ID_TOKEN)
    const id = token?.[1].trim()
    if (id === undefined || !ID_SHAPE.test(id)) continue
    if (!found.has(id)) found.set(id, { lines: [], titles: new Set() })
    found.get(id).lines.push(header.line)
    found.get(id).titles.add(token[2].trim())
  }
  return found
}

/**
 * The headers of one spec file an ID can sit on, outside fenced code: every requirement header and
 * `RENAMED` `TO:` line (`requirement`), every `#### Scenario:` (`scenario`), and any other level-4
 * header after the first requirement (`stray`), which OpenSpec also counts as a scenario.
 */
function readHeaders(text) {
  const headers = []
  let fence = null
  let inRequirements = false
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence !== null) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null
      continue
    }
    if (marker) {
      fence = marker[1]
      continue
    }
    const at = { line: index + 1, raw: line.trim() }
    const requirement = line.match(REQUIREMENT_HEADER) ?? line.match(RENAMED_TO)
    if (requirement) {
      inRequirements = true
      headers.push({ ...at, kind: 'requirement', text: requirement[1].trim() })
      continue
    }
    const scenario = line.match(SCENARIO_HEADER)
    if (scenario) headers.push({ ...at, kind: 'scenario', text: scenario[1].trim() })
    else if (inRequirements && LEVEL_FOUR.test(line)) headers.push({ ...at, kind: 'stray', text: line.trim() })
  }
  return headers
}

/**
 * The spec files the ID rules read, in code-point order, each `{ path, capability, change }`: the
 * living specs (no `change`) and the active deltas, or with `archived` every archived delta.
 */
function specFiles(root, archived) {
  const found = []
  const changesDir = join(root, OPENSPEC_DIR, 'changes')
  if (!archived) {
    for (const capability of listDirs(join(root, OPENSPEC_DIR, 'specs'))) {
      found.push({ path: `${OPENSPEC_DIR}/specs/${capability}/spec.md`, capability })
    }
  }
  const base = archived ? join(changesDir, ARCHIVE_DIR) : changesDir
  const prefix = archived ? `${OPENSPEC_DIR}/changes/${ARCHIVE_DIR}` : `${OPENSPEC_DIR}/changes`
  for (const change of listDirs(base)) {
    if (!archived && change === ARCHIVE_DIR) continue
    for (const capability of listDirs(join(base, change, 'specs'))) {
      found.push({ path: `${prefix}/${change}/specs/${capability}/spec.md`, capability, change })
    }
  }
  return found.filter((file) => isFile(join(root, file.path)))
}

function listDirs(dir) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return []
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort(byCodePoint)
}

function isFile(path) {
  return existsSync(path) && statSync(path).isFile()
}

/** Every skill and agent under `root`, as repository-relative paths in code-point order. */
function promptFiles(root) {
  const found = []
  const skills = join(root, SKILLS_DIR)
  if (existsSync(skills)) {
    for (const name of readdirSync(skills)) {
      const path = join(skills, name, 'SKILL.md')
      if (existsSync(path) && statSync(path).isFile()) found.push(`${SKILLS_DIR}/${name}/SKILL.md`)
    }
  }
  const agents = join(root, AGENTS_DIR)
  if (existsSync(agents)) {
    for (const name of readdirSync(agents)) {
      if (name.endsWith('.md') && name !== 'README.md') found.push(`${AGENTS_DIR}/${name}`)
    }
  }
  return found.sort(byCodePoint)
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
  const { failures, specs, changes, ids } = runCheck(ROOT, bin)
  if (failures.length === 0) {
    if (specs === 0 && changes === 0) {
      console.log(
        `openspec: nothing to validate yet (no living spec under ${OPENSPEC_DIR}/specs/, no active` +
          ` change under ${OPENSPEC_DIR}/changes/); no retired skill under ${SKILLS_DIR}/; every` +
          ` prompt that spells the change label cites ${LABEL_KEY} in ${POLICY_FILE}.`,
      )
    } else {
      console.log(
        `openspec: ${specs} living spec(s) and ${changes} active change(s) validate strictly; every` +
          ` active change applies to the living spec; every scenario and NFR requirement carries its` +
          ` capability's ID, unique and never reused (${ids.scenarios} scenario ID(s) and ${ids.nfrs}` +
          ` NFR ID(s) in the living specs; next free: ${ids.free.join(', ')}); no retired skill under` +
          ` ${SKILLS_DIR}/; every prompt that spells the change label cites ${LABEL_KEY} in ${POLICY_FILE}.`,
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

#### Scenario: [GRT-001] A reader arrives
- **WHEN** a reader arrives
- **THEN** the system greets them politely

### Requirement: [NFR-GRT-001] Greeting is prompt
The system SHALL greet a reader within one second of arrival.

#### Scenario: [GRT-002] A greeting is timed
- **WHEN** a reader arrives
- **THEN** the greeting shows within one second
`

/** The delta that added the greeting's first scenario, as the archive keeps it. */
const ARCHIVED_DELTA = `## ADDED Requirements

### Requirement: Greeting is polite
The system SHALL greet every reader politely.

#### Scenario: [GRT-001] A reader arrives
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

#### Scenario: [GRT-003] A reader leaves
- **WHEN** a reader leaves
- **THEN** the system bids them farewell
`

const POLICY = `${JSON.stringify(
  {
    specChangeLabel: 'spec-change',
    specChangeLabelMeans: 'The label on a change.',
    specIdPrefixes: { greeting: 'GRT' },
    specIdPrefixesMeans: 'The prefix of each capability.',
  },
  null,
  2,
)}\n`

const FIXTURE = {
  'openspec/config.yaml': 'schema: spec-driven\n',
  'openspec/specs/greeting/spec.md': LIVING_SPEC,
  'openspec/changes/add-farewell/proposal.md': PROPOSAL,
  'openspec/changes/add-farewell/specs/greeting/spec.md': DELTA,
  'openspec/changes/archive/2026-01-01-add-greeting/specs/greeting/spec.md': ARCHIVED_DELTA,
  'tools/policy.json': POLICY,
  '.claude/skills/change-propose/SKILL.md':
    '---\nname: change-propose\n---\n\nLabel the epic `spec-change` (`specChangeLabel` in `tools/policy.json`).\n',
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
  const skill = '.claude/skills/change-propose/SKILL.md'
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
      name: 'the policy file is missing',
      doctor: (dir) => rmSync(join(dir, 'tools/policy.json')),
      expect: /^tools\/policy\.json is missing under /,
    },
    {
      name: 'the policy file carries the label with no Means sibling',
      doctor: (dir) =>
        edit(dir, 'tools/policy.json', (t) => t.replace(/,\n\s*"specChangeLabelMeans": "[^"]*"/, '')),
      expect: /^tools\/policy\.json carries `specChangeLabel` with no `specChangeLabelMeans` sibling/,
    },
    {
      name: 'a skill spells the label without citing its key',
      doctor: (dir) => edit(dir, skill, (t) => t.replace(' (`specChangeLabel` in `tools/policy.json`)', '')),
      expect: /^\.claude\/skills\/change-propose\/SKILL\.md spells the change label `spec-change` without citing `specChangeLabel`/,
    },
    {
      name: 'an agent spells the label without citing its key',
      doctor: (dir) =>
        writeTree(dir, {
          '.claude/agents/sweep.md': '---\nname: sweep\n---\n\nRun `bd ready --exclude-label spec-change`.\n',
        }),
      expect: /^\.claude\/agents\/sweep\.md spells the change label `spec-change` without citing/,
    },
    {
      name: 'the label moves in the policy file and a skill still spells the old one',
      doctor: (dir) =>
        edit(dir, 'tools/policy.json', (t) =>
          t.replace('"specChangeLabel": "spec-change"', '"specChangeLabel": "product-change"'),
        ),
      expect: /^\.claude\/skills\/change-propose\/SKILL\.md cites `specChangeLabel` but never spells its value `product-change`/,
    },
    {
      name: 'a living scenario without an ID, and the next free ID named',
      doctor: (dir) => edit(dir, living, (t) => t.replace('Scenario: [GRT-001] A reader', 'Scenario: A reader')),
      // GRT-003 is the delta's, so the next free is GRT-004.
      expect: /^openspec\/specs\/greeting\/spec\.md:\d+: scenario "A reader arrives" carries no ID\. .*next free ID of its prefix, GRT-004\./,
    },
    {
      name: 'a delta scenario without an ID',
      doctor: (dir) => edit(dir, delta, (t) => t.replace('[GRT-003] ', '')),
      expect: /^openspec\/changes\/add-farewell\/specs\/greeting\/spec\.md:\d+: scenario "A reader leaves" carries no ID\./,
    },
    {
      name: "a scenario whose ID is not of its capability's prefix",
      doctor: (dir) => edit(dir, living, (t) => t.replace('[GRT-001]', '[GREET-1]')),
      expect: /^openspec\/specs\/greeting\/spec\.md:\d+: scenario "A reader arrives" carries `\[GREET-1\]`, which is not a scenario ID of capability `greeting`/,
    },
    {
      name: 'an ID that heads no title',
      doctor: (dir) => edit(dir, delta, (t) => t.replace('[GRT-003] A reader leaves', '[GRT-003]')),
      expect: /^openspec\/changes\/add-farewell\/specs\/greeting\/spec\.md:\d+: `\[GRT-003\]` heads no title\./,
    },
    {
      name: 'a level-4 header not headed as a scenario, which OpenSpec counts as one',
      doctor: (dir) => edit(dir, delta, (t) => t.replace('#### Scenario: [GRT-003] A reader leaves', '#### A reader leaves')),
      expect: /^openspec\/changes\/add-farewell\/specs\/greeting\/spec\.md:\d+: `#### A reader leaves` is a scenario to OpenSpec/,
    },
    {
      name: 'an NFR requirement whose ID is not [NFR-<PREFIX>-NNN]',
      doctor: (dir) => edit(dir, living, (t) => t.replace('[NFR-GRT-001]', '[NFR-001]')),
      expect: /^openspec\/specs\/greeting\/spec\.md:\d+: NFR requirement "Greeting is prompt" carries `\[NFR-001\]`, which is not an NFR ID of capability `greeting`/,
    },
    {
      name: 'an NFR requirement with its ID out of brackets',
      doctor: (dir) => edit(dir, living, (t) => t.replace('[NFR-GRT-001] Greeting', 'NFR-GRT-001 Greeting')),
      expect: /^openspec\/specs\/greeting\/spec\.md:\d+: requirement "NFR-GRT-001 Greeting is prompt" opens with `NFR` but carries no ID in brackets/,
    },
    {
      name: 'one ID on two scenarios, across the living spec and a delta',
      doctor: (dir) => edit(dir, delta, (t) => t.replace('[GRT-003]', '[GRT-002]')),
      // With GRT-003 gone, the highest is GRT-002, so the next free is GRT-003.
      expect: /^`\[GRT-002\]` heads 2 different scenarios: "A greeting is timed" at openspec\/specs\/greeting\/spec\.md:\d+, "A reader leaves" at openspec\/changes\/add-farewell\/specs\/greeting\/spec\.md:\d+\. .*next free ID, GRT-003\./,
    },
    {
      name: 'one ID on two NFR requirements, across the living spec and a delta',
      doctor: (dir) =>
        edit(dir, delta, (t) =>
          t.concat(
            '\n### Requirement: [NFR-GRT-001] Farewell is prompt\nThe system SHALL bid farewell within one second.\n\n',
            '#### Scenario: [GRT-004] A farewell is timed\n- **WHEN** a reader leaves\n- **THEN** the farewell shows within one second\n',
          ),
        ),
      expect: /^`\[NFR-GRT-001\]` heads 2 different NFR requirements: "Greeting is prompt" at .*, "Farewell is prompt" at /,
    },
    {
      name: 'a RENAMED block that keeps an NFR requirement ID for a new title',
      doctor: (dir) =>
        edit(dir, delta, (t) =>
          t.concat(
            '\n## RENAMED Requirements\n',
            '- FROM: `### Requirement: [NFR-GRT-001] Greeting is prompt`\n',
            '- TO: `### Requirement: [NFR-GRT-001] Greeting is quick`\n',
          ),
        ),
      expect: /^`\[NFR-GRT-001\]` heads 2 different NFR requirements: "Greeting is prompt" at .*, "Greeting is quick" at /,
    },
    {
      name: 'one ID on two scenarios of one file',
      doctor: (dir) =>
        edit(dir, living, (t) =>
          t.concat('\n#### Scenario: [GRT-001] A reader arrives\n- **WHEN** a reader arrives\n- **THEN** the greeting shows\n'),
        ),
      expect: /^`\[GRT-001\]` heads 2 scenarios of openspec\/specs\/greeting\/spec\.md, at lines \d+, \d+\./,
    },
    {
      name: 'a change that would leave one ID on two headers of the living spec once archived',
      // The same ID and title as the living spec's, restated under the requirement the change adds.
      doctor: (dir) => edit(dir, delta, (t) => t.replace('[GRT-003] A reader leaves', '[GRT-002] A greeting is timed')),
      expect: /^change `add-farewell`, once archived, would leave `\[GRT-002\]` on 2 headers of openspec\/specs\/greeting\/spec\.md/,
    },
    {
      name: 'an ID that an archived delta gave a different title',
      doctor: (dir) =>
        writeTree(dir, {
          'openspec/changes/archive/2026-02-01-add-wave/specs/greeting/spec.md': ARCHIVED_DELTA.replace(
            '[GRT-001] A reader arrives',
            '[GRT-003] A reader waves',
          ),
        }),
      expect: /^openspec\/changes\/add-farewell\/specs\/greeting\/spec\.md:\d+: `\[GRT-003\]` heads "A reader leaves", but archived change `2026-02-01-add-wave` gave it "A reader waves"\. .*next free ID, GRT-004\./,
    },
    {
      name: 'a living header reworded in place, keeping the ID an archived delta gave it',
      doctor: (dir) => edit(dir, living, (t) => t.replace('[GRT-001] A reader arrives', '[GRT-001] A reader walks in')),
      expect: /^openspec\/specs\/greeting\/spec\.md:\d+: `\[GRT-001\]` heads "A reader walks in", but archived change `2026-01-01-add-greeting` gave it "A reader arrives"/,
    },
    {
      name: 'the policy file carries no ID prefixes',
      doctor: (dir) => edit(dir, 'tools/policy.json', (t) => t.replace(/,\n\s*"specIdPrefixes": \{[^}]*\}/, '')),
      expect: /^tools\/policy\.json carries no `specIdPrefixes` object/,
    },
    {
      name: 'the policy file carries the ID prefixes with no Means sibling',
      doctor: (dir) => edit(dir, 'tools/policy.json', (t) => t.replace(/,\n\s*"specIdPrefixesMeans": "[^"]*"/, '')),
      expect: /^tools\/policy\.json carries `specIdPrefixes` with no `specIdPrefixesMeans` sibling/,
    },
    {
      name: 'a capability with no ID prefix',
      doctor: (dir) => edit(dir, 'tools/policy.json', (t) => t.replace('"greeting": "GRT"', '"welcome": "GRT"')),
      expect: /^capability `greeting` has no ID prefix under `specIdPrefixes` in tools\/policy\.json/,
    },
    {
      name: 'a prefix that is not capital letters and digits',
      doctor: (dir) => edit(dir, 'tools/policy.json', (t) => t.replace('"greeting": "GRT"', '"greeting": "grt"')),
      expect: /^tools\/policy\.json gives capability `greeting` the prefix "grt" under `specIdPrefixes`/,
    },
    {
      name: 'two capabilities that share one prefix',
      doctor: (dir) =>
        edit(dir, 'tools/policy.json', (t) => t.replace('"greeting": "GRT"', '"farewell": "GRT",\n    "greeting": "GRT"')),
      expect: /^tools\/policy\.json gives capabilities `farewell` and `greeting` one prefix, `GRT`/,
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
