/**
 * Register-records gate: each record under `docs/decisions/` is named for the id in its own
 * heading, keeps the entry skeleton, names only entries that exist, and carries the blockquote of
 * every amendment it makes; and no pointer to a record dangles.
 *
 * WHAT IT CHECKS. Since asdlc-openspec-vjgj, each decision or risk after D-59 is a record of its own,
 * `docs/decisions/<bd-id>.md`, and `docs/decisions.md` is frozen but for the blockquote a later entry
 * adds under one of its entries (`docs/decisions.md` § How an entry is written, and § How an entry
 * changes). It refuses, each with its reason:
 *   1. a file under `docs/decisions/` but `README.md` that is not a record named for the id in its
 *      own heading: a name that is not a tracker id (`prReviewIssuePattern` in
 *      `tools/policy/pr-review.json`), one that differs from the heading's id, a file that is not
 *      `.md`, or a directory;
 *   2. a record whose name is a numbered id, `D-NN` or `R-NN`, which only the frozen file holds;
 *   3. a record without the skeleton's heading `# <id> · <title>` on its first line, or without one
 *      of its lines, Recorded, Builds on / amends, Decision (or Risk), Why, What changed and Figures,
 *      in that order;
 *   4. an id its Builds on / amends line names that matches neither a heading of the frozen file nor
 *      a record: every `D-NN` and `R-NN` in the line, and every tracker id in a sentence of it that
 *      opens with "amends". A tracker id in another sentence is not read, since it may name an issue;
 *   5. an amendment the two sides disagree on: an entry a record's "amends" sentence names with no
 *      `> **Amended <date> by <id>.**` blockquote by that record under it, in the frozen file or in
 *      the amended record; or such a blockquote under an entry that the record it names does not
 *      name in an "amends" sentence;
 *   6. a pointer to a record that does not resolve: a `docs/decisions/<name>.md` path, bare or with
 *      a section, in any tracked text file, naming a file that is not tracked; a `docs/decisions.md`
 *      § pointer to a tracker id, which no heading of the frozen file carries; and an amendment
 *      blockquote naming a tracker id that is no record. The citations gate checks a record's path
 *      only with a section after it, and passes a bare path to a missing file (asdlc-openspec-w95h,
 *      its trial E6b); this gate holds the bare path under `docs/decisions/` alone, since a bare-path
 *      rule across the tree was measured and refused there (`tools/citations/scan.ts`'s header).
 * With no record under `docs/decisions/`, it skips clean and says why, reading no pointer.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: the layout landed with its first three records
 * on 2026-10-08 (#183, #184), and asdlc-openspec-vjgj's record names this gate's absence among its
 * losses. Without it, a record filed under a name that is not its heading's id, or under a numbered
 * id that collides with the frozen file, lands unchecked, and so does one that drops its Why or its
 * Figures. So does an amendment that names an entry that does not exist, and an amended frozen entry
 * that never got its blockquote, which leaves the frozen file saying what the register no longer
 * holds. A bare path to a record that was never written, or was named wrongly, reads as a citation
 * and is not one.
 *
 * INVOCATION.
 *   mise run check:register:records            the gate
 *   mise run check:register:records:selftest   its fixtures: a control, and one doctored copy per
 *                                              refusal, each asserting its reason
 *   CHECK_REGISTER_RECORDS_ROOT=<copy> node scripts/check-register-records.mjs
 *                                              the gate over a doctored copy, a git work tree, by hand
 *
 * NEEDS. git on the PATH, to list the tracked files, run with no inherited `GIT_*` key
 * (`tools/lib/git-env.ts`); committed files only; no network. It reads every tracked text file for
 * pointers, so its pre-push job has no glob, as the citations gate's has none.
 */
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitIn, SCRATCH_GIT_ENV } from '../tools/lib/git-env.ts'
import { copyPolicy, readPolicy } from '../tools/lib/policy.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT_VARIABLE = 'CHECK_REGISTER_RECORDS_ROOT'
const ROOT = process.env[ROOT_VARIABLE] ?? REPO_ROOT

const FROZEN = 'docs/decisions.md'
const DIR = 'docs/decisions'
const README = `${DIR}/README.md`
/** The key, in `tools/policy/pr-review.json`, whose value is the shape of a tracker id. */
const ISSUE_PATTERN_KEY = 'prReviewIssuePattern'

/** A numbered id, which only the frozen file's headings carry. */
const NUMBERED_RE = /^[DR]-\d{2}$/
/** A frozen entry's heading: three hashes, as `scripts/check-register-status.mjs` reads a decision's. */
const FROZEN_HEADING_RE = /^### ([DR]-\d{2}) · /
/** Any heading of level one to three, which ends an entry's section. */
const SECTION_END_RE = /^#{1,3} /
/** Every numbered id in a line. */
const NUMBERED_IDS_RE = /(?<![\w-])[DR]-\d{2}(?!\d)/g
/** A record's heading, on its first line. */
const RECORD_HEADING_RE = /^# (\S+) · \S/
/** An amendment blockquote, and the id of the entry that made it. */
const AMENDED_RE = /^> \*\*Amended \d{4}-\d{2}-\d{2} by ([^*\s]+?)\.\*\*/
/** A pointer to a file under the records' directory: its name. A `<placeholder>` is not one. */
const RECORD_PATH_RE = /docs\/decisions\/([A-Za-z0-9][A-Za-z0-9._-]*\.md)/g
/** The skeleton's lines after the heading, in order, as `docs/decisions.md` § How an entry is written gives them. */
const SKELETON = [
  { label: 'Recorded', re: /^\*\*Recorded \d{4}-\d{2}-\d{2}\*\*/ },
  { label: 'Builds on / amends', re: /^\*\*Builds on \/ amends:\*\*/ },
  { label: 'Decision (or Risk)', re: /^\*\*(?:Decision|Risk)\.\*\*/ },
  { label: 'Why', re: /^\*\*Why\.\*\*/ },
  { label: 'What changed', re: /^\*\*What changed\.\*\*/ },
  { label: 'Figures', re: /^\*\*Figures\.\*\*/ },
]
const BUILDS_ON = SKELETON[1]

/** The tracker id's shape from the policy under `root`. Throws, naming the key, when it cannot be read. */
function trackerPattern(root) {
  const pattern = readPolicy(root)[ISSUE_PATTERN_KEY]
  if (typeof pattern !== 'string' || pattern === '') {
    throw new Error(`\`${ISSUE_PATTERN_KEY}\` in tools/policy/ is ${pattern === undefined ? 'missing' : 'not a pattern'}`)
  }
  return pattern
}

/** The sentences of a Builds on / amends line, after its label. */
function sentencesOf(paragraph) {
  return paragraph
    .replace(BUILDS_ON.re, '')
    .split(/(?<=\.)\s+(?=[A-Z])/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

/** The lines of a section: from `start` up to the next heading of level one to three. */
function sectionLines(lines, start) {
  const out = []
  for (let index = start + 1; index < lines.length; index++) {
    if (SECTION_END_RE.test(lines[index])) break
    out.push({ text: lines[index], number: index + 1 })
  }
  return out
}

/**
 * Every assertion against the git work tree at `root`. Returns the failures rather than exiting, so
 * the selftest can run it over doctored copies.
 */
export function runCheck(root) {
  const failures = []
  const fail = (message) => failures.push(message)

  const pattern = trackerPattern(root)
  const trackerIdRe = new RegExp(`^(?:${pattern})$`)
  const trackerIdsRe = () => new RegExp(`(?<![\\w-])(?:${pattern})(?!\\w)`, 'g')
  const frozenPointerRe = () => new RegExp(`docs/decisions\\.md\`?\\s*§\\s*\`?((?:${pattern}))(?!\\w)`, 'g')

  const tracked = gitIn(root)(['ls-files', '-z'])
    .split('\0')
    .filter((path) => path !== '' && existsSync(join(root, path)))
  const trackedSet = new Set(tracked)
  const read = (path) => readFileSync(join(root, path), 'utf8')

  /* ------------------------------------------------------------------- the frozen file ----- */

  const frozenLines = trackedSet.has(FROZEN) ? read(FROZEN).split('\n') : []
  /** Each frozen entry's id, the line of its heading and the amendment blockquotes in its section. */
  const frozen = new Map()
  frozenLines.forEach((line, index) => {
    const heading = FROZEN_HEADING_RE.exec(line)
    if (!heading) return
    const amendedBy = sectionLines(frozenLines, index)
      .map(({ text, number }) => ({ by: AMENDED_RE.exec(text)?.[1], number }))
      .filter(({ by }) => by !== undefined)
    frozen.set(heading[1], { line: index + 1, amendedBy })
  })

  /* --------------------------------------------------------------------------- records ----- */

  const underDir = tracked.filter((path) => path.startsWith(`${DIR}/`) && path !== README)
  const records = new Map()
  for (const path of underDir) {
    const rest = path.slice(DIR.length + 1)
    if (rest.includes('/')) {
      fail(`1. ${path}: a directory under ${DIR}/ holds it. Only records, \`<bd-id>.md\`, and README.md live there.`)
      continue
    }
    if (!rest.endsWith('.md')) {
      fail(`1. ${path}: it is not a record, \`<bd-id>.md\`. Only records and README.md live under ${DIR}/.`)
      continue
    }
    const id = rest.slice(0, -'.md'.length)
    if (NUMBERED_RE.test(id)) {
      fail(`2. ${path}: ${id} is a numbered id, which only the frozen ${FROZEN} holds. A record takes the tracker id of the issue that carries it.`)
      continue
    }
    if (!trackerIdRe.test(id)) {
      fail(`1. ${path}: ${id} is not a tracker id (\`${ISSUE_PATTERN_KEY}\` in tools/policy/pr-review.json). A record is named \`${DIR}/<bd-id>.md\`.`)
      continue
    }
    const lines = read(path).split('\n')
    const heading = RECORD_HEADING_RE.exec(lines[0] ?? '')
    if (!heading) {
      fail(`3. ${path}: its first line is not the skeleton's heading, \`# <id> · <title>\` (${FROZEN} § How an entry is written).`)
    } else if (heading[1] !== id) {
      fail(`1. ${path}: its heading names ${heading[1]}, but the file is named ${id}. A record is named for the id in its own heading.`)
    }

    // The skeleton's lines, each found at a line's start, in order.
    let previous = null
    let buildsOnAt = -1
    for (const step of SKELETON) {
      const at = lines.findIndex((line) => step.re.test(line))
      if (at < 0) {
        fail(`3. ${path}: it has no ${step.label} line, which the skeleton asks for (${FROZEN} § How an entry is written).`)
        continue
      }
      if (previous !== null && at < previous.at) {
        fail(`3. ${path}: its ${step.label} line (:${at + 1}) comes before its ${previous.label} line (:${previous.at + 1}). The skeleton's order is ${FROZEN} § How an entry is written.`)
      }
      if (step === BUILDS_ON) buildsOnAt = at
      previous = { label: step.label, at }
    }

    // The Builds on / amends paragraph: its line and those up to the next blank line.
    let paragraph = ''
    if (buildsOnAt >= 0) {
      for (let index = buildsOnAt; index < lines.length && lines[index].trim() !== ''; index++) paragraph += `${lines[index]} `
    }
    const amends = new Set()
    const numbered = new Set()
    for (const sentence of sentencesOf(paragraph)) {
      for (const match of sentence.matchAll(NUMBERED_IDS_RE)) numbered.add(match[0])
      if (/^(?:it\s+)?amends\b/i.test(sentence)) {
        for (const match of sentence.matchAll(NUMBERED_IDS_RE)) amends.add(match[0])
        for (const match of sentence.matchAll(trackerIdsRe())) amends.add(match[0])
      }
    }
    records.set(id, { path, lines, amends, numbered })
  }

  if (records.size === 0) {
    return { failures, skipped: `${DIR}/ holds no record yet, so there is nothing to hold, and no pointer to a record is read.`, records: 0, pointers: 0, files: 0 }
  }

  // Every amendment blockquote inside a record is under its own entry, which the record is.
  for (const record of records.values()) {
    record.amendedBy = record.lines
      .map((text, index) => ({ by: AMENDED_RE.exec(text)?.[1], number: index + 1 }))
      .filter(({ by }) => by !== undefined)
  }

  /* -------------------------------------------------- 4 and 5: what each record names ----- */

  for (const [id, record] of records) {
    for (const entry of record.numbered) {
      if (!frozen.has(entry)) fail(`4. ${record.path}: its Builds on / amends line names ${entry}, which is no heading of ${FROZEN}.`)
    }
    for (const entry of record.amends) {
      if (NUMBERED_RE.test(entry)) {
        const target = frozen.get(entry)
        if (target && !target.amendedBy.some(({ by }) => by === id)) {
          fail(`5. ${record.path}: it amends ${entry}, but ${FROZEN} has no \`> **Amended <date> by ${id}.**\` blockquote under ${entry} (:${target.line}).`)
        }
        continue
      }
      if (entry === id) continue
      const target = records.get(entry)
      if (!target) {
        fail(`4. ${record.path}: its "amends" sentence names ${entry}, which is no record under ${DIR}/.`)
        continue
      }
      if (!target.amendedBy.some(({ by }) => by === id)) {
        fail(`5. ${record.path}: it amends ${entry}, but ${target.path} has no \`> **Amended <date> by ${id}.**\` blockquote.`)
      }
    }
  }

  /* ------------------------------------------ 5 and 6: what each blockquote names ----- */

  const blockquotes = [
    ...[...frozen].flatMap(([entry, { amendedBy }]) => amendedBy.map((quote) => ({ ...quote, entry, where: FROZEN }))),
    ...[...records].flatMap(([entry, { amendedBy, path }]) => amendedBy.map((quote) => ({ ...quote, entry, where: path }))),
  ]
  for (const { by, number, entry, where } of blockquotes) {
    if (!trackerIdRe.test(by)) continue
    const amender = records.get(by)
    if (!amender) {
      fail(`6. ${where}:${number}: the blockquote under ${entry} names ${by} as the entry that amended it, which is no record under ${DIR}/.`)
    } else if (!amender.amends.has(entry)) {
      fail(`5. ${where}:${number}: the blockquote under ${entry} names ${by}, whose "amends" sentences in ${amender.path} do not name ${entry}.`)
    }
  }

  /* ------------------------------------------------------- 6: pointers in every file ----- */

  let pointers = 0
  let files = 0
  for (const path of tracked) {
    const text = read(path)
    if (text.includes('\0')) continue
    files++
    text.split('\n').forEach((line, index) => {
      for (const match of line.matchAll(RECORD_PATH_RE)) {
        pointers++
        if (!trackedSet.has(`${DIR}/${match[1]}`)) {
          fail(`6. ${path}:${index + 1}: it points at ${DIR}/${match[1]}, which is not a tracked file.`)
        }
      }
      for (const match of line.matchAll(frozenPointerRe())) {
        pointers++
        fail(`6. ${path}:${index + 1}: it points at ${FROZEN} § ${match[1]}, which no heading there carries. A record is cited as \`${DIR}/${match[1]}.md\` § Decision.`)
      }
    })
  }

  return { failures, skipped: null, records: records.size, pointers, files }
}

/* ------------------------------------------------------------------------------- the gate ----- */

function main() {
  let result
  try {
    result = runCheck(ROOT)
  } catch (error) {
    console.error(`register records: could not run: ${error.message}`)
    process.exit(1)
  }
  const { failures, skipped, records, pointers, files } = result
  if (skipped !== null && failures.length === 0) {
    console.log(`register records: skipped: ${skipped}`)
    process.exit(0)
  }
  if (failures.length === 0) {
    console.log(
      `register records: ${records} record(s) under ${DIR}/, each named for its heading's id, whole, naming only entries` +
        ` that exist and carrying each amendment it makes; ${pointers} pointer(s) to a record across ${files} tracked text files resolve.`,
    )
    process.exit(0)
  }
  console.error(`register records: ${failures.length} failure(s). ${FROZEN} § How an entry is written and § How an entry changes.\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* ------------------------------------------------------------------------------- selftest ----- */

/** A tracker id no record has, for the doctored cases. */
const DEAD = 'asdlc-openspec-zzzz'
/** A second, for a synthetic record. */
const SPARE = 'asdlc-openspec-zzzy'

/** A record with the whole skeleton, whose Builds on / amends line is `buildsOn`. */
const recordText = (id, buildsOn, tail = '') =>
  [
    `# ${id} · A synthetic record`,
    '',
    `**Recorded 2026-10-08**, carried by \`${id}\`.`,
    '',
    `**Builds on / amends:** ${buildsOn}`,
    '',
    '**Decision.** A synthetic decision.',
    '',
    '**Why.** A synthetic reason.',
    '',
    '**What changed.** Nothing.',
    '',
    '**Figures.** None.',
    tail,
  ].join('\n')

/** The files a fixture copies: the frozen file, everything under the records' directory, and CLAUDE.md. */
function fixtureFiles() {
  return gitIn(REPO_ROOT)(['ls-files', '-z', '--', FROZEN, DIR, 'CLAUDE.md'])
    .split('\0')
    .filter(Boolean)
}

/** Copy the inputs and the policy into `dir`, doctor it, and make it a git work tree with every file staged. */
function fixture(base, name, doctor) {
  const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-').slice(0, 80))
  for (const relative of fixtureFiles()) {
    const dest = join(dir, relative)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(REPO_ROOT, relative), dest)
  }
  copyPolicy(REPO_ROOT, dir)
  doctor(dir)
  const git = gitIn(dir, SCRATCH_GIT_ENV)
  git(['init', '-q'])
  git(['add', '-A'])
  return dir
}

/** Rewrite one file in a doctored copy; a rewrite that changes nothing is a broken fixture. */
function edit(dir, relative, transform) {
  const path = join(dir, relative)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after === before) throw new Error(`selftest fixture for ${relative} changed nothing -- the doctoring missed its target`)
  writeFileSync(path, after)
}

function write(dir, relative, text) {
  mkdirSync(dirname(join(dir, relative)), { recursive: true })
  writeFileSync(join(dir, relative), text)
}

/**
 * The record the cases doctor, from the undoctored copy's own parse: the first in code-point order
 * whose "amends" sentence names a frozen entry, that entry, and a frozen entry it does not amend.
 */
function context(dir) {
  const lines = readFileSync(join(dir, FROZEN), 'utf8').split('\n')
  const headings = lines.map((line) => FROZEN_HEADING_RE.exec(line)?.[1]).filter(Boolean)
  for (const relative of fixtureFiles().filter((path) => path.startsWith(`${DIR}/`) && path !== README).sort()) {
    const text = readFileSync(join(dir, relative), 'utf8')
    const id = relative.slice(DIR.length + 1, -'.md'.length)
    const line = text.split('\n').find((candidate) => BUILDS_ON.re.test(candidate)) ?? ''
    const amended = sentencesOf(line)
      .filter((sentence) => /^(?:it\s+)?amends\b/i.test(sentence))
      .flatMap((sentence) => [...sentence.matchAll(NUMBERED_IDS_RE)].map((match) => match[0]))
    if (amended.length === 0) continue
    const other = headings.find((heading) => !amended.includes(heading))
    return { id, path: relative, amended: amended[0], other }
  }
  return null
}

/** Append `sentence` as a sentence of its own at the end of a record's Builds on / amends paragraph. */
function appendToBuildsOn(sentence) {
  return (text) => {
    const lines = text.split('\n')
    let at = lines.findIndex((line) => BUILDS_ON.re.test(line))
    while (at + 1 < lines.length && lines[at + 1].trim() !== '') at++
    lines[at] = `${lines[at]} ${sentence}`
    return lines.join('\n')
  }
}

/** Insert `quote` as a blockquote at the end of the frozen entry `entry`'s section. */
function quoteUnder(entry, quote) {
  return (text) => {
    const lines = text.split('\n')
    const at = lines.findIndex((line) => line.startsWith(`### ${entry} · `))
    let end = lines.length
    for (let index = at + 1; index < lines.length; index++) {
      if (SECTION_END_RE.test(lines[index])) {
        end = index
        break
      }
    }
    lines.splice(end, 0, quote, '')
    return lines.join('\n')
  }
}

function cases({ id, path, amended, other }) {
  const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const deadPath = `${DIR}/${DEAD}.md`
  const sparePath = `${DIR}/${SPARE}.md`
  return [
    { name: 'control: the undoctored copy passes', doctor: () => {}, expect: 'pass' },
    {
      name: 'refusal 1: a record whose heading names another id',
      doctor: (dir) => edit(dir, path, (t) => t.replace(`# ${id} · `, `# ${id}x · `)),
      expect: new RegExp(`^1\\. ${escaped(path)}: its heading names ${id}x, but the file is named ${id}\\.`),
    },
    {
      name: 'refusal 1: a file named for no tracker id',
      doctor: (dir) => write(dir, `${DIR}/notes.md`, recordText('notes', 'nothing.')),
      expect: /^1\. docs\/decisions\/notes\.md: notes is not a tracker id/,
    },
    {
      name: 'refusal 1: a file that is not markdown',
      doctor: (dir) => write(dir, `${DIR}/${DEAD}.txt`, 'text\n'),
      expect: new RegExp(`^1\\. docs/decisions/${DEAD}\\.txt: it is not a record`),
    },
    {
      name: 'refusal 1: a directory under the records',
      doctor: (dir) => write(dir, `${DIR}/nested/${DEAD}.md`, recordText(DEAD, 'nothing.')),
      expect: new RegExp(`^1\\. docs/decisions/nested/${DEAD}\\.md: a directory under docs/decisions/ holds it`),
    },
    {
      name: 'refusal 2: a record with a numbered id',
      doctor: (dir) => write(dir, `${DIR}/D-60.md`, recordText('D-60', 'nothing.')),
      expect: /^2\. docs\/decisions\/D-60\.md: D-60 is a numbered id, which only the frozen docs\/decisions\.md holds/,
    },
    {
      name: 'refusal 3: a record without its Why line',
      doctor: (dir) => edit(dir, path, (t) => t.replace(/^\*\*Why\.\*\*/m, 'Why it was chosen:')),
      expect: new RegExp(`^3\\. ${escaped(path)}: it has no Why line`),
    },
    {
      name: 'refusal 3: a record whose What changed line comes before its Why line',
      doctor: (dir) =>
        write(
          dir,
          sparePath,
          recordText(SPARE, 'nothing.').replace(
            '**Why.** A synthetic reason.\n\n**What changed.** Nothing.',
            '**What changed.** Nothing.\n\n**Why.** A synthetic reason.',
          ),
        ),
      expect: new RegExp(`^3\\. ${escaped(sparePath)}: its What changed line \\(:\\d+\\) comes before its Why line \\(:\\d+\\)\\.`),
    },
    {
      name: 'refusal 3: a record whose heading is gone',
      doctor: (dir) => edit(dir, path, (t) => t.replace(`# ${id} · `, `${id} · `)),
      expect: new RegExp(`^3\\. ${escaped(path)}: its first line is not the skeleton's heading`),
    },
    {
      name: 'refusal 4: a Builds on sentence names a numbered entry with no heading',
      doctor: (dir) => edit(dir, path, appendToBuildsOn('Builds on D-99 too.')),
      expect: new RegExp(`^4\\. ${escaped(path)}: its Builds on / amends line names D-99, which is no heading of docs/decisions\\.md\\.`),
    },
    {
      name: 'refusal 4: an "amends" sentence names a tracker id that is no record',
      doctor: (dir) => edit(dir, path, appendToBuildsOn(`It amends ${DEAD} too.`)),
      expect: new RegExp(`^4\\. ${escaped(path)}: its "amends" sentence names ${DEAD}, which is no record under docs/decisions/\\.`),
    },
    {
      name: 'control: a tracker id in a sentence that does not open with "amends" is not read',
      doctor: (dir) => edit(dir, path, appendToBuildsOn(`Builds on ${DEAD}'s note.`)),
      expect: 'pass',
    },
    {
      name: `refusal 5: ${amended} loses the blockquote ${id} added under it`,
      doctor: (dir) =>
        edit(dir, FROZEN, (t) =>
          t
            .split('\n')
            .filter((line) => !new RegExp(`^> \\*\\*Amended \\d{4}-\\d{2}-\\d{2} by ${escaped(id)}\\.\\*\\*`).test(line))
            .join('\n'),
        ),
      expect: new RegExp(`^5\\. ${escaped(path)}: it amends ${amended}, but docs/decisions\\.md has no \`> \\*\\*Amended <date> by ${id}\\.\\*\\*\` blockquote under ${amended}`),
    },
    {
      name: `refusal 5: a blockquote by ${id} under ${other}, which it does not amend`,
      doctor: (dir) => edit(dir, FROZEN, quoteUnder(other, `> **Amended 2026-10-08 by ${id}.** Doctored.`)),
      expect: new RegExp(`^5\\. docs/decisions\\.md:\\d+: the blockquote under ${other} names ${id}, whose "amends" sentences in ${escaped(path)} do not name ${other}\\.`),
    },
    {
      name: 'control: a record that amends another record, with the blockquote in it',
      doctor: (dir) => {
        write(dir, sparePath, recordText(SPARE, `amends \`${path}\`, whose loss it closes.`))
        edit(dir, path, (t) => `${t.replace(/\n*$/, '')}\n\n> **Amended 2026-10-08 by ${SPARE}.** Doctored.\n`)
      },
      expect: 'pass',
    },
    {
      name: 'refusal 5: a record that amends another record, with no blockquote in it',
      doctor: (dir) => write(dir, sparePath, recordText(SPARE, `amends \`${path}\`, whose loss it closes.`)),
      expect: new RegExp(`^5\\. ${escaped(sparePath)}: it amends ${id}, but ${escaped(path)} has no \`> \\*\\*Amended <date> by ${SPARE}\\.\\*\\*\` blockquote\\.`),
    },
    {
      name: 'refusal 6: a bare path to a record that does not exist',
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => `${t}\nSee \`${deadPath}\`.\n`),
      expect: new RegExp(`^6\\. CLAUDE\\.md:\\d+: it points at ${escaped(deadPath)}, which is not a tracked file\\.`),
    },
    {
      name: 'refusal 6: a section pointer to a record in the frozen file',
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => `${t}\nSee \`${FROZEN}\` § ${id}.\n`),
      expect: new RegExp(`^6\\. CLAUDE\\.md:\\d+: it points at docs/decisions\\.md § ${id}, which no heading there carries\\.`),
    },
    {
      name: 'refusal 6: a blockquote names a tracker id that is no record',
      doctor: (dir) => edit(dir, FROZEN, quoteUnder(other, `> **Amended 2026-10-08 by ${DEAD}.** Doctored.`)),
      expect: new RegExp(`^6\\. docs/decisions\\.md:\\d+: the blockquote under ${other} names ${DEAD} as the entry that amended it, which is no record`),
    },
    {
      name: 'no record yet: it skips clean and says why',
      doctor: (dir) => {
        for (const relative of fixtureFiles().filter((file) => file.startsWith(`${DIR}/`) && file !== README)) rmSync(join(dir, relative))
      },
      expect: 'skip',
    },
  ]
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-register-records-'))
  const results = []
  try {
    const pristine = fixture(base, 'pristine', () => {})
    const control = runCheck(pristine)
    if (control.failures.length > 0 || control.skipped !== null) {
      console.error('selftest: the undoctored copy does not pass, so no case below can be trusted:\n')
      for (const failure of control.failures) console.error(`  - ${failure}\n`)
      if (control.skipped !== null) console.error(`  - it skipped: ${control.skipped}\n`)
      process.exit(1)
    }
    const ctx = context(pristine)
    if (ctx === null || ctx.other === undefined) {
      console.error(`selftest: no record under ${DIR}/ amends a frozen entry, so the amendment cases have nothing to doctor.`)
      process.exit(1)
    }

    for (const { name, doctor, expect } of cases(ctx)) {
      const dir = fixture(base, name, doctor)
      const { failures, skipped } = runCheck(dir)
      let ok
      let detail
      if (expect === 'pass') {
        ok = failures.length === 0 && skipped === null
        detail = ok ? 'passes' : `unexpected: ${skipped ?? failures.join(' | ')}`
      } else if (expect === 'skip') {
        ok = failures.length === 0 && /^docs\/decisions\/ holds no record yet/.test(skipped ?? '')
        detail = ok ? `skips: ${skipped}` : `did not skip clean: ${skipped ?? failures.join(' | ')}`
      } else {
        ok = failures.some((failure) => expect.test(failure))
        detail = ok
          ? `fails for that reason (${failures.length} failure(s))`
          : failures.length === 0
            ? 'PASSED, but should have failed'
            : `failed, but not for that reason: ${failures.join(' | ')}`
      }
      results.push({ name, ok, detail })
    }

    // The gate as a process, through its root override, over a doctored copy: exit 1, with the reason.
    const doctored = fixture(base, 'as a process', (dir) => edit(dir, 'CLAUDE.md', (t) => `${t}\nSee \`${DIR}/${DEAD}.md\`.\n`))
    const run = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, [ROOT_VARIABLE]: doctored }, encoding: 'utf8' })
    const asProcess = run.status === 1 && run.stderr.includes(`it points at ${DIR}/${DEAD}.md, which is not a tracked file`)
    results.push({
      name: `the gate run as a process through ${ROOT_VARIABLE} over a doctored copy`,
      ok: asProcess,
      detail: asProcess ? 'exits 1 with the reason' : `exit ${run.status}: ${(run.stderr || run.stdout).trim()}`,
    })
  } finally {
    rmSync(base, { recursive: true, force: true })
  }

  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  console.log(`register records selftest: ${results.length - failed.length}/${results.length} cases hold (the control and its doctored copies).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

if (process.argv.includes('--selftest')) selftest()
else main()
