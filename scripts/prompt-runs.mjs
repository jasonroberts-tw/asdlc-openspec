/**
 * Prompt runs: parses the prompt review's lines in the tracker and prints, for the two prompts that
 * read them and for a person, what is pending and whether a review is due, what is held and what is
 * closed, and how often each prompt was loaded. An operator command that
 * `.claude/skills/close-prompt-run/SKILL.md` § 2 and `.claude/agents/continuous-prompt-improvement.md`
 * § 2 run, never a gate.
 *
 * THE LINES, AND THIS HEADER AS THEIR ONE HOME. Every line below is a line of an issue's notes, as
 * `bd export` prints them, and opens at the start of the line with a value of
 * `tools/policy/agent-workflows.json`, its marker, and then one space. A marker is the value of any
 * key of that record spelt `promptReview…Marker`. A line that opens with a marker's word followed by
 * anything but a letter, digit, dash or underscore is a marker line, and fails the command unless it
 * is in its form below: a colon, a tab or nothing after the word is a broken line, never prose, and so
 * is a line of a marker this header gives no form. A run id is an issue's id, `@`, and a UTC second
 * spelled as `date -u +%Y-%m-%dT%H:%M:%SZ` prints it: a second that exists, and none after now.
 *
 *   the analysis   `promptReviewAnalysisMarker`, a space and the run id, alone on its line. The
 *                  analysis runs from that line to the next marker line, of any marker, or to the
 *                  end of the notes.
 *                  Somewhere after its marker line comes a line holding `promptReviewLoadedHeading`
 *                  alone, then one line for each of this repository's prompts the run loaded: its
 *                  row's path in `tools/policy/prompt-budgets.json` (the worktree briefing's is its
 *                  template's), a space, and the commit it was read at, 7 to 40 hex digits of either
 *                  case. A run id one analysis already opened opens no second: the later note is
 *                  counted once, and the first line of the report says how many were. Then one
 *                  line holds what `claude --version` printed, opening with the version, such as
 *                  `2.1.289 (Claude Code)`. An analysis with no such heading, or whose run id's time
 *                  is before `promptReviewLoadedSince`, when D-44 reached the trunk, is in the form
 *                  before D-44, prose, and is listed as not counted, never as loading nothing: nine
 *                  analyses written before D-44 hold the heading's words as a prose label.
 *   the read line  `promptReviewReadMarker`, a space, the run id, a space, and the review's pull
 *                  request URL or `no change`. An analysis is pending while no read line names its
 *                  run id.
 *   the held line  `promptReviewHeldMarker`, a space, the run id, a space, the finding's key, a space,
 *                  the count of runs that have shown it so far, a colon, a space and the reason. A key
 *                  is a prompt's path, `#`, and a name of lower-case letters, digits and dashes that
 *                  opens with a letter or digit.
 *   the closed line  `promptReviewClosedMarker`, a space, the run id, a space, the key, a space, how
 *                  it ended, a colon, a space and the reason. The run id is the latest run that
 *                  showed the finding, and the key's path holds no `#`. How it ended is one of three:
 *                    `carried <pull request URL>`  a review's pull request carried an edit for it;
 *                                         the URL holds no `?` or `#`;
 *                    `issue <issue id>`   an issue owns it, as one a run filed owns a finding no
 *                                         prompt owns, whose key's path is then the file it concerns;
 *                    `aside`              a person set it aside, and the reason is theirs.
 *                  Of a key's closed lines, the one of the latest run decides; on a tie, the later in
 *                  one issue's notes, since a line is appended, or else the one whose reason sorts
 *                  last. It closes the key, whatever held lines follow it, which record only that a
 *                  run showed the finding again; but a carried line closes it only once its pull
 *                  request has merged, and one whose pull request closed unmerged leaves the key held,
 *                  reopened. A key keeps its count, and `scripts/match-held-findings.mjs`, which reads
 *                  held lines alone, offers it, only through its held lines, so a review writes them
 *                  beside a closed line (`.claude/agents/continuous-prompt-improvement.md` § 6).
 *
 * WHAT IT PRINTS. Each section opens with a line that names it.
 *
 *   the first line  how many analyses, how many in D-44's form, how many since the cut-off are not,
 *             which shrinks the sample unseen by a run that reads `--only pending`, and how many
 *             notes opened a run id already counted.
 *   pending   each analysis no read line names, with the issue whose notes hold it; and whether a
 *             review is due: when `promptReviewDueCount` analyses or more are pending, or the oldest,
 *             by the time in its run id, is older than `promptReviewDueAgeDays` days. Whether a
 *             review may start beside one under way is not read here: `close-prompt-run` § 2 checks
 *             that.
 *   held      each key a held or closed line names, with its file, the highest count its held lines
 *             give, the runs they name and the reason of its held line of the highest count, on a tie
 *             the line of the latest run; and its state: `held`, `closed` with the closed line that
 *             decides, `carried` while that line's pull request is open, or `reopened` once it closed
 *             unmerged.
 *   loads     the window, the `promptReviewLoadWindowDays` days before the newest analysis's time,
 *             the newest included. For each row of `promptWordBudgets`, the analyses in the window
 *             in D-44's form that loaded it. Then each analysis in the window not in that form, and
 *             each path an analysis lists that has no row.
 *   candidates  each row no analysis in the window loaded and that `promptReviewUnloadedPrompts`
 *             does not name, for a person to consider retiring (`.claude/skills/retire-asset/SKILL.md`).
 *             Only at or above `promptReviewLoadFloor` analyses in D-44's form in the window; below
 *             it, the count and no candidate. The table names the prompts no analysed run loads by
 *             design, each with its reason. The command retires nothing.
 *   the metric  the share of rows, less the table's, that no analysis in the window loaded, as
 *             `count-index.md` § Rates and metrics defines it, and whether it is at or above
 *             `promptReviewLoadNotViableShare`, the value that means the project is not viable.
 *             Below the floor, the counts and no share.
 *
 * `--json` prints the same as one JSON object, for a session to read, and `--only <section>` prints
 * the first line and one section: `pending`, `held`, or `loads` with the candidates and the metric.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; the command came with asdlc-openspec-r6ha.5.
 * Until it, the reviewer's session and each run's close read these lines as prose, and nothing
 * counted how often a prompt was loaded, so a prompt no run used went unnoticed, and two readers of
 * one form could disagree on what was pending. Were it wrong, it would let through a line a hand
 * edit broke, read as nothing pending or nothing held, so every count starts again; an analysis in
 * the old form counted as loading nothing, so every prompt reads as unused; a candidate named under
 * the floor, or one the table names, for a person to retire a prompt that runs need; and a window
 * read from the wall clock, so the same tracker gives two answers a day apart. Since
 * asdlc-openspec-r6ha.6 it would also let through a closed key read as held, which every review then
 * reads and holds again, as the keys of `asdlc-openspec-hpdd`'s notes were for want of the line; a
 * key carried by a pull request that closed unmerged read as closed, so its finding is never raised
 * again though nothing fixed it; and an analysis read past a closed line, holding it as prose.
 *
 * WHERE IT LOSES. One malformed line anywhere in the tracker fails it, exit 1, and with it the due
 * check of every run's close, until a person fixes the line; read as prose, the model read past one.
 * The maintainer chose this on 2026-10-05 over a reader for the reviewer alone (asdlc-openspec-r6ha.5).
 * And "loaded" is not "helped": a prompt every run loads can still mislead every run.
 *
 * INVOCATION.
 *
 *   mise run prompt-runs                       the report, as text
 *   mise run prompt-runs --json                the same, as one JSON object
 *   mise run prompt-runs --only pending        one section: `pending`, `held` or `loads`
 *   mise run prompt-runs --now <time>          the due check at that UTC time, in the run-id spelling,
 *                                              where it is now by default; nothing else reads a clock
 *   mise run prompt-runs:selftest              the selftest (`--selftest`)
 *   PROMPT_RUNS_ROOT=<dir> mise run prompt-runs
 *                       the same over a doctored copy: a directory holding the policy's records under
 *                       `tools/policy/` and `export.jsonl`, one issue per line as `bd export` prints
 *                       it, and, when a carried line is read, `pull-requests.json`, each pull request
 *                       URL to its state, `OPEN`, `CLOSED` or `MERGED`; it then runs no `bd` and no
 *                       `gh`, and a copy with no export, or no state for a carried line, is a failure,
 *                       never a fall back to the live tracker or GitHub
 *
 * EXIT. 0 with the report; 2 on a bad flag; 1 on a failure, each named: a line that does not parse,
 * with its issue; a policy key missing or wrong; a table entry with no budget row; the tracker or the
 * override's export unreadable; a carried line's pull request whose state cannot be read.
 *
 * NEEDS `bd` on PATH and the tracker's database, read through `tools/lib/bd-launcher.ts`, unless the
 * override names an export. For the held section, when a carried line names a pull request, `gh`,
 * signed in, and the network: `gh pr view` gives each one's state. `--only pending` and
 * `--only loads` read no pull request, so the due check of a run's close needs neither.
 * `mise run prompt-runs --only pending` took 1.57 s wall over the tracker's 300 issues,
 * `bd export` included, and the selftest 0.56 s, each through `mise run` (`/usr/bin/time -p`, one
 * run) on a macOS 26.7.1 laptop with Node 24.21.0, 2026-10-05.
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describeLauncher, resolveBd, runBd } from '../tools/lib/bd-launcher.ts'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT_ENV = 'PROMPT_RUNS_ROOT'
const OVERRIDE_EXPORT = 'export.jsonl'
const OVERRIDE_PULL_REQUESTS = 'pull-requests.json'
const NAME = 'prompt-runs'
const DAY_MS = 24 * 60 * 60 * 1000

/** A run id: an issue's id, `@`, and a UTC second. */
const RUN_ID = /^(\S+)@(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$/
/** A loaded prompt's line, after the heading: a path, a space, a commit. */
const LOADED = /^(\S+) ([0-9a-fA-F]{7,40})$/
/** What may follow a marker's word on a line that still opens with that word. */
const WORD_GOES_ON = /[A-Za-z0-9_-]/
/** A UTC second as a run id spells it, from a time. */
const isoSecond = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z')
/** What `claude --version` prints: the version first. */
const VERSION = /^(\d+\.\d+\.\d+)(?:\s.*)?$/
/** A policy key whose value is a marker, as the header says. */
const MARKER_KEY = /^promptReview[A-Za-z]+Marker$/
/** What follows a closed line's marker: run id, key, file, how it ended (with its pull request's URL and number, or its issue), and reason. */
const CLOSED = /^(\S+) (([^\s#]+)#[a-z0-9][a-z0-9-]*) (carried (https:\/\/[^\s?#]+\/pull\/(\d+))|issue ([A-Za-z0-9][A-Za-z0-9._-]*)|aside): (.+)$/
/** The states a pull request's carried line reads, as `gh pr view --json state` spells them. */
const PR_STATES = ['OPEN', 'CLOSED', 'MERGED']

/** The policy keys this command reads, and what each must be. */
const KEYS = [
  ['promptReviewAnalysisMarker', 'word'],
  ['promptReviewReadMarker', 'word'],
  ['promptReviewHeldMarker', 'word'],
  ['promptReviewClosedMarker', 'word'],
  ['promptReviewLoadedHeading', 'text'],
  ['promptReviewLoadedSince', 'instant'],
  ['promptReviewDueCount', 'count'],
  ['promptReviewDueAgeDays', 'count'],
  ['promptReviewLoadWindowDays', 'count'],
  ['promptReviewLoadFloor', 'count'],
  ['promptReviewUnloadedPrompts', 'table'],
  ['promptReviewLoadNotViableShare', 'share'],
  ['promptWordBudgets', 'budgets'],
]

/** Code-point order, so two runtimes agree. */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/* -------------------------------------------------------------------------------- the policy ----- */

/** The keys this command reads from the records under `root`, or a thrown error naming the one that is wrong. */
export function loadPolicy(root) {
  let raw
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Error(`tools/policy/ under ${root} cannot be read: ${error.message}`)
  }
  for (const [key, kind] of KEYS) {
    const value = raw[key]
    const bad = (what) => new Error(`the policy's \`${key}\` is ${JSON.stringify(value)}, where it must be ${what}`)
    if (value === undefined) throw new Error(`the policy has no \`${key}\``)
    if (kind === 'word' && !(typeof value === 'string' && /^\S+$/.test(value))) throw bad('one word')
    if (kind === 'text' && !(typeof value === 'string' && value.trim() !== '' && value === value.trim())) throw bad('text with no space at either end')
    if (kind === 'count' && !(Number.isInteger(value) && value >= 1)) throw bad('a whole number of at least 1')
    if (kind === 'share' && !(typeof value === 'number' && value > 0 && value <= 1)) throw bad('a share above 0 and at most 1')
    if (kind === 'instant' && !(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value) && !Number.isNaN(Date.parse(value)))) throw bad('a UTC second in the run-id spelling, ending in Z')
    if (kind === 'table' && !(value && typeof value === 'object' && !Array.isArray(value))) throw bad('a table of paths, each with its reason')
    if (kind === 'budgets' && !(value && typeof value === 'object' && Object.keys(value).length > 0)) throw bad('the table of prompt budgets')
    if (kind !== 'budgets' && typeof raw[`${key}Means`] !== 'string') throw new Error(`the policy has \`${key}\` and no \`${key}Means\` saying what it decides`)
  }
  const policy = Object.fromEntries(KEYS.map(([key]) => [key, raw[key]]))
  const markerKeys = Object.keys(raw).filter((key) => MARKER_KEY.test(key)).sort(byCodePoint)
  for (const key of markerKeys) {
    if (!(typeof raw[key] === 'string' && /^\S+$/.test(raw[key]))) throw new Error(`the policy's \`${key}\` is ${JSON.stringify(raw[key])}, where it must be one word`)
  }
  const markers = markerKeys.map((key) => raw[key])
  if (new Set(markers).size !== markers.length) throw new Error(`the ${markers.length} markers must differ, and are ${JSON.stringify(markers)}`)
  policy.markers = markers
  if (markers.some((m) => policy.promptReviewLoadedHeading.startsWith(m))) {
    throw new Error(`\`promptReviewLoadedHeading\` opens with a marker's word, so an analysis would end at it`)
  }
  for (const [path, reason] of Object.entries(policy.promptReviewUnloadedPrompts)) {
    if (!Object.hasOwn(policy.promptWordBudgets, path)) throw new Error(`\`promptReviewUnloadedPrompts\` names ${path}, which has no row in \`promptWordBudgets\`: a stale entry hides nothing, and says what is not so`)
    if (!(typeof reason === 'string' && reason.trim() !== '')) throw new Error(`\`promptReviewUnloadedPrompts\` names ${path} with no reason`)
  }
  return policy
}

/* ------------------------------------------------------------------------------- the tracker ----- */

/** One issue per non-empty line of an export, or a thrown error naming what is not one. */
function parseExport(text, from) {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  return lines.map((line, i) => {
    try {
      return JSON.parse(line)
    } catch {
      throw new Error(`${from} line ${i + 1} is not JSON, so it is not what \`bd export\` prints`)
    }
  })
}

/**
 * Every issue in the tracker, from the override's export or from `bd export`; a thrown error when
 * neither can be read. `envName` is the caller's override variable, which the error names;
 * `scripts/match-held-findings.mjs` reads the tracker through this too.
 */
export function readTracker(root, overridden, envName = ROOT_ENV) {
  if (overridden) {
    let text
    try {
      text = readFileSync(join(root, OVERRIDE_EXPORT), 'utf8')
    } catch (error) {
      throw new Error(`${envName} names ${root}, which holds no readable ${OVERRIDE_EXPORT} (${error.code ?? error.message}); this command never falls back to the live tracker`)
    }
    return parseExport(text, join(root, OVERRIDE_EXPORT))
  }
  const found = resolveBd()
  if (!found.found) throw new Error(`\`bd\` was not found (${found.reason}), so the tracker's lines cannot be read`)
  if (!found.runnable) throw new Error(`\`bd\` was found and cannot be run: ${found.reason}`)
  const run = runBd(found.launcher, ['export'], { cwd: REPO_ROOT })
  const through = describeLauncher(found.launcher)
  if (run.error || run.status !== 0) {
    throw new Error(`\`bd export\` through ${through} ${run.error ? `could not start: ${run.error.message}` : `exited ${run.status}: ${run.stderr.trim().split('\n').at(-1) ?? ''}`}`)
  }
  return parseExport(run.stdout, `what \`bd export\` printed through ${through}`)
}

/* ------------------------------------------------------------------------------- the parsing ----- */

/** A run id's issue and time, or null when it is not one: its time must be a second that exists. */
function runOf(text) {
  const m = RUN_ID.exec(text)
  if (!m) return null
  const at = Date.parse(m[2])
  return Number.isNaN(at) || isoSecond(at) !== m[2] ? null : { run: text, issue: m[1], at }
}

/** The marker a line opens with, and what follows its one space, or `rest: null` when no space does. */
function markerOf(line, markers) {
  for (const m of markers) {
    if (!line.startsWith(m) || WORD_GOES_ON.test(line[m.length] ?? '')) continue
    return { marker: m, rest: line[m.length] === ' ' ? line.slice(m.length + 1).trimEnd() : null }
  }
  return null
}

/** An analysis's form, from the lines after its marker line: its loads and version, or a problem. */
function readAnalysisBody(lines, heading) {
  const start = lines.findIndex((line) => line.trim() === heading)
  if (start < 0) return { form: 'prose' }
  const loads = []
  let i = start + 1
  for (; i < lines.length; i++) {
    const m = LOADED.exec(lines[i].trim())
    if (!m) break
    if (m[1].startsWith('/') || m[1].split('/').includes('..')) return { problem: `lists ${m[1]}, which is no repository-relative path` }
    loads.push({ path: m[1], commit: m[2] })
  }
  if (!loads.length) return { problem: `has the line \`${heading}\` and no prompt under it in the form "<path> <commit>"; the first line under it is ${JSON.stringify(lines[start + 1] ?? '')}` }
  const version = VERSION.exec((lines[i] ?? '').trim())
  if (!version) return { problem: `lists ${loads.length} prompt(s), and the line after them, ${JSON.stringify(lines[i] ?? '')}, is neither "<path> <commit>" nor what \`claude --version\` prints` }
  return { form: 'loaded', loads, version: version[1] }
}

/** A held line's run id, key, file, count and reason, or null when what follows its marker is not one. */
export function parseHeldLine(rest) {
  const m = rest === null ? null : /^(\S+) ((\S+)#[a-z0-9][a-z0-9-]*) (\d+): (.+)$/.exec(rest)
  const run = m && runOf(m[1])
  return run ? { run: run.run, at: run.at, key: m[2], file: m[3], count: Number(m[4]), reason: m[5].trim() } : null
}

/** A closed line's run id, key, file, how it ended and reason, or null when what follows its marker is not one. */
export function parseClosedLine(rest) {
  const m = rest === null ? null : CLOSED.exec(rest)
  const run = m && runOf(m[1])
  if (!run) return null
  const how = m[4].split(' ')[0]
  return { run: run.run, at: run.at, key: m[2], file: m[3], how, url: m[5] ?? null, owner: m[7] ?? null, reason: m[8].trim() }
}

/**
 * Each pull request URL's state, from the override's `pull-requests.json` or from `gh pr view`; a
 * thrown error naming the one that cannot be read. Only a carried line's URL is asked, and none when
 * no carried line is read.
 */
export function readPullRequests(root, overridden, urls) {
  const states = new Map()
  if (!urls.length) return states
  let file = null
  if (overridden) {
    try {
      file = JSON.parse(readFileSync(join(root, OVERRIDE_PULL_REQUESTS), 'utf8'))
    } catch (error) {
      throw new Error(`${ROOT_ENV} names ${root}, which holds no readable ${OVERRIDE_PULL_REQUESTS} (${error.code ?? error.message}), and a carried line needs its pull request's state; this command never falls back to GitHub`)
    }
  }
  for (const url of urls) {
    let state
    if (file) state = file[url]
    else {
      const run = spawnSync('gh', ['pr', 'view', url, '--json', 'state', '--jq', '.state'], { cwd: REPO_ROOT, encoding: 'utf8' })
      if (run.error || run.status !== 0) throw new Error(`\`gh pr view ${url}\` ${run.error ? `could not start: ${run.error.message}` : `exited ${run.status}: ${run.stderr.trim().split('\n').at(-1) ?? ''}`}, so the carried line naming it cannot be read`)
      state = run.stdout.trim()
    }
    if (!PR_STATES.includes(state)) throw new Error(`the pull request ${url}, which a carried line names, has the state ${JSON.stringify(state ?? null)}, not one of ${PR_STATES.join(', ')}`)
    states.set(url, state)
  }
  return states
}

/** What follows `marker` on `line`, when the line opens with that marker's word, else undefined; null when no one space follows it. */
export function afterMarker(line, marker) {
  const found = markerOf(line, [marker])
  return found ? found.rest : undefined
}

/**
 * Every analysis, read line, held line and closed line in the issues' notes, and every line that
 * opens with a marker and does not parse, an analysis whose loaded prompts do not, and a run id after
 * `now`, as a problem naming its issue. An analysis whose run id an earlier note opened is counted
 * once, in `duplicates`. The forms are this file's header's.
 */
export function parseTracker(issues, policy, now = Date.now()) {
  const { promptReviewAnalysisMarker: A, promptReviewReadMarker: R, promptReviewHeldMarker: H, promptReviewClosedMarker: C, promptReviewLoadedHeading: heading } = policy
  const since = Date.parse(policy.promptReviewLoadedSince)
  const analyses = []
  const reads = []
  const held = []
  const closed = []
  const problems = []
  const seen = new Set()
  let duplicates = 0
  const later = (run, id) => {
    if (run.at <= now) return false
    problems.push(`${id}: the run id ${run.run} is after now, ${isoSecond(now)}, so it cannot be a run's`)
    return true
  }
  for (const issue of issues) {
    const id = issue?.id ?? '(an issue with no id)'
    let open = null
    const close = () => {
      if (!open) return
      const body = open.at < since ? { form: 'prose' } : readAnalysisBody(open.lines, heading)
      if (body.problem) problems.push(`${id}: the analysis ${open.run} ${body.problem}`)
      else if (seen.has(open.run)) duplicates++
      else {
        seen.add(open.run)
        analyses.push({ run: open.run, issue: id, at: open.at, form: body.form, loads: body.loads ?? [], version: body.version ?? null })
      }
      open = null
    }
    let order = -1
    for (const line of String(issue?.notes ?? '').split('\n')) {
      order++
      const found = markerOf(line, policy.markers)
      if (!found) {
        if (open) open.lines.push(line)
        continue
      }
      close()
      const { marker, rest } = found
      if (marker === A) {
        const run = rest === null ? null : runOf(rest)
        if (!run) problems.push(`${id}: the line ${JSON.stringify(line)} opens with \`${A}\` and is not "${A} <run id>"`)
        else if (!later(run, id)) open = { ...run, lines: [] }
      } else if (marker === R) {
        const m = rest === null ? null : /^(\S+) (https:\/\/\S+|no change)$/.exec(rest)
        const run = m && runOf(m[1])
        if (!run) problems.push(`${id}: the line ${JSON.stringify(line)} opens with \`${R}\` and is not "${R} <run id> <pull request URL or no change>"`)
        else if (!later(run, id)) reads.push({ run: run.run, issue: id, pr: m[2] })
      } else if (marker === H) {
        const line_ = parseHeldLine(rest)
        if (!line_) problems.push(`${id}: the line ${JSON.stringify(line)} opens with \`${H}\` and is not "${H} <run id> <file>#<name> <count>: <reason>"`)
        else if (!later(line_, id)) held.push({ ...line_, issue: id })
      } else if (marker === C) {
        const line_ = parseClosedLine(rest)
        if (!line_) problems.push(`${id}: the line ${JSON.stringify(line)} opens with \`${C}\` and is not "${C} <run id> <file>#<name> <carried <pull request URL>, issue <issue id> or aside>: <reason>"`)
        else if (!later(line_, id)) closed.push({ ...line_, issue: id, order })
      } else {
        problems.push(`${id}: the line ${JSON.stringify(line)} opens with \`${marker}\`, a marker of the policy that the header of scripts/prompt-runs.mjs gives no form`)
      }
    }
    close()
  }
  return { analyses, reads, held, closed, problems, duplicates }
}

/* ------------------------------------------------------------------------------- the report ----- */

/** What is pending, and whether a review is due at `now`. */
export function pendingOf(parsed, policy, now) {
  const read = new Set(parsed.reads.map((r) => r.run))
  const pending = parsed.analyses.filter((a) => !read.has(a.run)).sort((a, b) => a.at - b.at || byCodePoint(a.run, b.run))
  const oldest = pending[0] ?? null
  const ageDays = oldest ? (now - oldest.at) / DAY_MS : 0
  const byCount = pending.length >= policy.promptReviewDueCount
  const byAge = oldest !== null && ageDays > policy.promptReviewDueAgeDays
  const why = byCount
    ? `${pending.length} pending, at or above \`promptReviewDueCount\` (${policy.promptReviewDueCount})`
    : byAge
      ? `the oldest, ${oldest.run}, is ${ageDays.toFixed(1)} days old, past \`promptReviewDueAgeDays\` (${policy.promptReviewDueAgeDays})`
      : `${pending.length} pending, under \`promptReviewDueCount\` (${policy.promptReviewDueCount}), and ${oldest ? `the oldest ${ageDays.toFixed(1)} days old` : 'none old'}, within \`promptReviewDueAgeDays\` (${policy.promptReviewDueAgeDays})`
  return { due: byCount || byAge, why, analyses: pending.map((a) => ({ run: a.run, issue: a.issue })) }
}

/** The carried lines' pull request URLs, each once, in code-point order: the ones whose state the held section reads. */
export const carriedUrls = (parsed) => [...new Set(parsed.closed.filter((c) => c.how === 'carried').map((c) => c.url))].sort(byCodePoint)

/** A key's state from the closed line that decides it, and its pull request's state when that line is carried. */
function stateOf(decides, prs) {
  if (!decides) return { state: 'held' }
  const { run, how, url, owner, reason } = decides
  const closed = { run, how, ...(url ? { url } : {}), ...(owner ? { issue: owner } : {}), reason }
  if (how !== 'carried') return { state: 'closed', closed }
  const pr = prs.get(url)
  return { state: pr === 'MERGED' ? 'closed' : pr === 'OPEN' ? 'carried' : 'reopened', closed: { ...closed, pullRequest: pr } }
}

/**
 * Each key a held or closed line names: its file, highest count, the runs its held lines name and
 * the reason of its held line of the highest count, on a tie the line of the latest run, whatever
 * order the export gives the lines in; and its state, from the closed line of the latest run, on a tie
 * the later in one issue's notes or else the one whose reason sorts last, and `prs`, each carried
 * line's pull request URL to its state.
 */
export function heldOf(parsed, prs = new Map()) {
  const keys = new Map()
  const entry = (line) => keys.get(line.key) ?? { key: line.key, file: line.file, count: 0, runs: new Set(), reason: '', best: null, decides: null }
  for (const line of parsed.held) {
    const k = entry(line)
    const b = k.best
    if (!b || line.count > b.count || (line.count === b.count && (line.at > b.at || (line.at === b.at && byCodePoint(line.reason, b.reason) > 0)))) {
      k.best = line
      k.count = line.count
      k.reason = line.reason
    }
    k.runs.add(line.run)
    keys.set(line.key, k)
  }
  for (const line of parsed.closed ?? []) {
    const k = entry(line)
    const d = k.decides
    const after = line.issue === d?.issue ? line.order > d.order : byCodePoint(line.reason, d?.reason ?? '') > 0
    if (!d || line.at > d.at || (line.at === d.at && after)) k.decides = line
    keys.set(line.key, k)
  }
  return [...keys.values()]
    .sort((a, b) => byCodePoint(a.key, b.key))
    .map(({ best, decides, ...k }) => ({ ...k, runs: [...k.runs].sort(byCodePoint), ...stateOf(decides, prs) }))
}

/** The loads over the window, the analyses not counted, the paths with no row, the candidates and the metric. */
export function loadsOf(parsed, policy) {
  const rows = Object.keys(policy.promptWordBudgets).sort(byCodePoint)
  const table = policy.promptReviewUnloadedPrompts
  if (!parsed.analyses.length) {
    return { window: null, sample: 0, floor: policy.promptReviewLoadFloor, loads: rows.map((path) => ({ path, analyses: 0 })), notCounted: [], noRow: [], candidates: [], metric: null }
  }
  const newest = Math.max(...parsed.analyses.map((a) => a.at))
  const from = newest - policy.promptReviewLoadWindowDays * DAY_MS
  const inWindow = parsed.analyses.filter((a) => a.at >= from)
  const counted = inWindow.filter((a) => a.form === 'loaded')
  const loads = new Map(rows.map((path) => [path, 0]))
  const noRow = new Map()
  for (const a of counted) {
    for (const path of new Set(a.loads.map((l) => l.path))) {
      if (loads.has(path)) loads.set(path, loads.get(path) + 1)
      else noRow.set(path, [...(noRow.get(path) ?? []), a.run])
    }
  }
  const atFloor = counted.length >= policy.promptReviewLoadFloor
  const considered = rows.filter((path) => !Object.hasOwn(table, path))
  const unloaded = considered.filter((path) => loads.get(path) === 0)
  return {
    window: { from: new Date(from).toISOString().replace('.000Z', 'Z'), to: new Date(newest).toISOString().replace('.000Z', 'Z'), days: policy.promptReviewLoadWindowDays },
    sample: counted.length,
    floor: policy.promptReviewLoadFloor,
    loads: rows.map((path) => ({ path, analyses: loads.get(path), ...(Object.hasOwn(table, path) ? { unloadedByDesign: table[path] } : {}) })),
    notCounted: inWindow.filter((a) => a.form !== 'loaded').map((a) => a.run).sort(byCodePoint),
    noRow: [...noRow.entries()].sort((a, b) => byCodePoint(a[0], b[0])).map(([path, runs]) => ({ path, runs: runs.sort(byCodePoint) })),
    candidates: atFloor ? unloaded : [],
    metric: atFloor ? { unloaded: unloaded.length, of: considered.length, notViable: unloaded.length >= policy.promptReviewLoadNotViableShare * considered.length } : null,
  }
}

/** The sections `--only` may name; `loads` carries the candidates and the metric. */
const SECTIONS = ['pending', 'held', 'loads']

/** The report as text, one section after another, or the one `only` names. */
export function render(report, only = null) {
  const out = []
  const { pending, held, loads } = report
  const since = report.proseSinceCutOff ? `, ${report.proseSinceCutOff} since the cut-off not in it` : ''
  const twice = report.duplicates ? `; ${report.duplicates} more note(s) opened a run id already counted, and are counted once` : ''
  out.push(`${NAME}: ${report.analyses} analyses (${report.loadedForm} in D-44's form${since}), ${report.reads} read lines, ${report.heldLines} held lines, ${report.closedLines} closed lines${twice}.`)
  if (!only || only === 'pending') {
    out.push('')
    out.push(`pending: ${pending.analyses.length}; a review is ${pending.due ? 'due' : 'not due'}: ${pending.why}.`)
    for (const a of pending.analyses) out.push(`  ${a.run}  ${a.issue}`)
  }
  if (!only || only === 'held') {
    out.push('')
    const closed = held.filter((k) => k.state === 'closed').length
    out.push(`held: ${held.length} key(s), ${closed} of them closed.`)
    const how = (c) => (c.how === 'carried' ? `carried by ${c.url}, ${c.pullRequest}` : c.how === 'issue' ? `owned by ${c.issue}` : 'set aside by a person')
    for (const k of held) {
      const lines = k.runs.length ? `count ${k.count}, runs ${k.runs.join(' ')}: ${k.reason}` : 'no held line'
      out.push(k.state === 'held' ? `  ${k.key}  ${lines}` : `  ${k.key}  ${k.state}, ${how(k.closed)}, at ${k.closed.run}: ${k.closed.reason}; ${lines}`)
    }
  }
  if (only && only !== 'loads') return out.join('\n')
  out.push('')
  if (!loads.window) out.push('loads: no analysis in the tracker, so no window.')
  else {
    out.push(`loads: the ${loads.window.days} days to ${loads.window.to}, from ${loads.window.from}: ${loads.sample} analyses in D-44's form, against a floor of ${loads.floor}.`)
    for (const row of loads.loads) out.push(`  ${String(row.analyses).padStart(4)}  ${row.path}${row.unloadedByDesign ? `  (no analysed run loads it: ${row.unloadedByDesign})` : ''}`)
    out.push(`  not counted, not in D-44's form: ${loads.notCounted.length ? loads.notCounted.join(' ') : 'none'}`)
    out.push(`  listed and with no budget row: ${loads.noRow.length ? loads.noRow.map((r) => `${r.path} (${r.runs.join(' ')})`).join('; ') : 'none'}`)
  }
  out.push('')
  if (!loads.window || loads.sample < loads.floor) out.push(`candidates: none named; ${loads.sample} analyses in D-44's form in the window, under the floor of ${loads.floor}.`)
  else {
    out.push(`candidates: ${loads.candidates.length}, for a person to consider retiring (.claude/skills/retire-asset/SKILL.md); this command retires nothing.`)
    for (const path of loads.candidates) out.push(`  ${path}`)
  }
  out.push('')
  if (!loads.metric) out.push(`the metric: no share under the floor; the counts are above.`)
  else {
    const m = loads.metric
    out.push(`the metric: ${m.unloaded} of ${m.of} prompts, less those no analysed run loads by design, loaded by no analysis in the window${m.notViable ? ': at or above `promptReviewLoadNotViableShare`, the value count-index.md § Rates and metrics gives as not viable' : ''}.`)
  }
  return out.join('\n')
}

/* ------------------------------------------------------------------------------- the command ----- */

/** The command, its dependencies handed in so the selftest runs it whole. */
export function main(argv, deps = {}) {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => process.stdout.write(`${t}\n`))
  const err = deps.err ?? ((t) => process.stderr.write(`${t}\n`))
  const overridden = Boolean(env[ROOT_ENV])
  const root = overridden ? resolve(env[ROOT_ENV]) : REPO_ROOT

  let json = false
  let only = null
  let now = deps.now ?? Date.now()
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--json') json = true
    else if (argv[i] === '--only' && SECTIONS.includes(argv[i + 1])) only = argv[++i]
    else if (argv[i] === '--now' && argv[i + 1] && !argv[i + 1].startsWith('--')) {
      const text = argv[++i]
      const at = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(text) ? Date.parse(text) : Number.NaN
      if (Number.isNaN(at) || isoSecond(at) !== text) {
        err(`${NAME}: --now takes a UTC second in the run-id spelling, such as 2026-10-05T12:00:00Z.`)
        return 2
      }
      now = at
    } else {
      err(`${NAME}: unknown or incomplete flag ${JSON.stringify(argv[i])}. See the header of scripts/prompt-runs.mjs.`)
      return 2
    }
  }

  let policy
  let parsed
  try {
    policy = loadPolicy(root)
    parsed = parseTracker(readTracker(root, overridden), policy, now)
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  if (parsed.problems.length) {
    err(`${NAME} FAILED: ${parsed.problems.length} line(s) in the tracker do not parse in the form the header of scripts/prompt-runs.mjs gives, so nothing is counted until each is fixed:`)
    for (const p of parsed.problems) err(`  ${p}`)
    return 1
  }
  let prs = new Map()
  if (!only || only === 'held') {
    try {
      prs = (deps.pullRequests ?? ((urls) => readPullRequests(root, overridden, urls)))(carriedUrls(parsed))
    } catch (error) {
      err(`${NAME} FAILED: ${error.message}`)
      return 1
    }
  }
  const report = {
    analyses: parsed.analyses.length,
    loadedForm: parsed.analyses.filter((a) => a.form === 'loaded').length,
    proseSinceCutOff: parsed.analyses.filter((a) => a.form === 'prose' && a.at >= Date.parse(policy.promptReviewLoadedSince)).length,
    duplicates: parsed.duplicates,
    reads: parsed.reads.length,
    heldLines: parsed.held.length,
    closedLines: parsed.closed.length,
    pending: pendingOf(parsed, policy, now),
    held: heldOf(parsed, prs),
    loads: loadsOf(parsed, policy),
  }
  if (only) for (const section of SECTIONS) if (section !== only) delete report[section]
  out(json ? JSON.stringify(report) : render(report, only))
  return 0
}

/* ------------------------------------------------------------------------------ the selftest ----- */

/**
 * The selftest: the command run whole, in this process, over fixture directories under the temporary
 * directory, each holding the live policy's records and a fixture export, through `PROMPT_RUNS_ROOT`.
 * Each case breaks one thing and asserts the reason the run reports, and an undoctored control must
 * pass first. Needs no `bd`, no network and no token.
 */
function selftest() {
  let checks = 0
  let failures = 0
  const ok = (what, cond, detail = '') => {
    checks++
    if (cond) console.log(`  ok   ${what}`)
    else {
      failures++
      console.error(`  FAIL ${what}${detail ? ` -- ${detail}` : ''}`)
    }
  }
  console.log('prompt-runs selftest\n')

  const dir = mkdtempSync(join(tmpdir(), 'prompt-runs-selftest-'))
  try {
    const live = loadPolicy(REPO_ROOT)
    const { promptReviewAnalysisMarker: A, promptReviewReadMarker: R, promptReviewHeldMarker: H, promptReviewLoadedHeading: HEADING } = live
    const FLOOR = live.promptReviewLoadFloor
    const WINDOW = live.promptReviewLoadWindowDays
    const ROWS = Object.keys(live.promptWordBudgets).sort(byCodePoint)
    const TABLE = Object.keys(live.promptReviewUnloadedPrompts)
    const considered = ROWS.filter((p) => !TABLE.includes(p))
    if (considered.length < 4 || TABLE.length < 1) throw new Error('the live budgets and table leave too few rows for the cases below')
    const [LOADED_ALWAYS, LOADED_SOME, NEVER, ALSO_NEVER] = considered
    const EXCLUDED = TABLE[0]
    const LOADED_REST = considered.slice(4)
    const SINCE = Date.parse(live.promptReviewLoadedSince)
    const NEWEST = SINCE + (WINDOW + 30) * DAY_MS
    const iso = (ms) => new Date(ms).toISOString().replace('.000Z', 'Z')

    /** One new-form analysis's notes: its marker line, the loaded prompts, the version, a finding. */
    const analysis = (run, paths, { version = '2.1.289 (Claude Code)', heading = HEADING } = {}) =>
      [`${A} ${run}`, '', heading, ...paths.map((p) => `${p} abc1234`), version, '', 'What made the run slower or wrong: nothing.'].join('\n')
    /**
     * The control's tracker: as many new-form analyses as the floor, one an hour back from NEWEST,
     * each loading LOADED_ALWAYS and the rest of the considered rows but NEVER and ALSO_NEVER, every
     * other one LOADED_SOME; all read but the newest two; a held key on two runs; and one analysis
     * older than the window, which loads NEVER and must not count.
     */
    const controlIssues = () => {
      const issues = []
      for (let i = 0; i < FLOOR; i++) {
        const run = `example-${i}@${iso(NEWEST - i * 60 * 60 * 1000)}`
        const paths = [LOADED_ALWAYS, ...(i % 2 === 0 ? [LOADED_SOME] : []), ...LOADED_REST]
        const notes = [analysis(run, paths)]
        if (i >= 2) notes.push(`${R} ${run} https://example.com/pull/1`)
        if (i === 3 || i === 5) notes.push(`${H} ${run} ${LOADED_ALWAYS}#a-finding ${i === 3 ? 2 : 1}: below the threshold, minor: a step was skipped ${i}`)
        issues.push({ id: `example-${i}`, notes: notes.join('\n') })
      }
      const old = `example-old@${iso(NEWEST - (WINDOW + 1) * DAY_MS)}`
      issues.push({ id: 'example-old', notes: [analysis(old, [NEVER]), `${R} ${old} no change`].join('\n') })
      return issues
    }
    const fixture = (name, issues, change, prs) => {
      const root = join(dir, name)
      copyPolicy(REPO_ROOT, root)
      if (change) editPolicy(root, change, 'tools/policy/agent-workflows.json')
      if (issues) writeFileSync(join(root, OVERRIDE_EXPORT), issues.map((i) => JSON.stringify(i)).join('\n') + '\n')
      if (prs) writeFileSync(join(root, OVERRIDE_PULL_REQUESTS), JSON.stringify(prs))
      return root
    }
    const NOW = iso(NEWEST + 60 * 60 * 1000)
    const run = (root, argv = ['--json', '--now', NOW]) => {
      const outs = []
      const errs = []
      const code = main(argv, { env: { [ROOT_ENV]: root }, out: (t) => outs.push(t), err: (t) => errs.push(t) })
      const text = outs.join('\n')
      let report = null
      try {
        report = argv.includes('--json') && text ? JSON.parse(text) : null
      } catch {}
      return { code, out: text, err: errs.join('\n'), report }
    }
    const loadOf = (report, path) => report?.loads.loads.find((l) => l.path === path)?.analyses

    /* The control. */
    const control = run(fixture('control', controlIssues()))
    ok('control: the undoctored fixture runs to a report, exit 0', control.code === 0 && control.report !== null, control.err)
    if (control.code !== 0 || !control.report) throw new Error('the control does not pass, so no other case can be trusted')
    const c = control.report
    ok(`the window counts the ${FLOOR} analyses in it and leaves out the one ${WINDOW + 1} days old`, c.loads.sample === FLOOR && loadOf(c, NEVER) === 0, JSON.stringify(c.loads.window))
    ok('each row is counted once per analysis that loaded it', loadOf(c, LOADED_ALWAYS) === FLOOR && loadOf(c, LOADED_SOME) === Math.ceil(FLOOR / 2), `${loadOf(c, LOADED_ALWAYS)} ${loadOf(c, LOADED_SOME)}`)
    ok(
      'at the floor, the candidates are the considered rows no analysis loaded, in code-point order, and never a row the table names',
      JSON.stringify(c.loads.candidates) === JSON.stringify([NEVER, ALSO_NEVER].sort(byCodePoint)) && !c.loads.candidates.includes(EXCLUDED),
      JSON.stringify(c.loads.candidates),
    )
    ok(`the table's row is printed with its reason, and counted as no candidate`, c.loads.loads.find((l) => l.path === EXCLUDED)?.unloadedByDesign === live.promptReviewUnloadedPrompts[EXCLUDED])
    ok(
      'the metric is the share of considered rows no analysis loaded, and under half is not "not viable"',
      c.loads.metric?.unloaded === 2 && c.loads.metric?.of === considered.length && c.loads.metric?.notViable === (2 * 2 >= considered.length),
      JSON.stringify(c.loads.metric),
    )
    ok('pending is each analysis no read line names, oldest first', JSON.stringify(c.pending.analyses.map((a) => a.issue)) === JSON.stringify(['example-1', 'example-0']), JSON.stringify(c.pending))
    ok(
      `two pending and the oldest an hour old is not due, under \`promptReviewDueCount\` (${live.promptReviewDueCount})`,
      live.promptReviewDueCount > 2 ? c.pending.due === false && /under `promptReviewDueCount`/.test(c.pending.why) : true,
      c.pending.why,
    )
    ok(
      'a held key gives its highest count, the runs its lines name and the reason of its line of the highest count',
      JSON.stringify(c.held) ===
        JSON.stringify([{ key: `${LOADED_ALWAYS}#a-finding`, file: LOADED_ALWAYS, count: 2, runs: [`example-3@${iso(NEWEST - 3 * 3600000)}`, `example-5@${iso(NEWEST - 5 * 3600000)}`].sort(byCodePoint), reason: 'below the threshold, minor: a step was skipped 3', state: 'held' }]),
      JSON.stringify(c.held),
    )
    const text = run(fixture('control-text', controlIssues()), ['--now', NOW])
    ok('the text report names each section', text.code === 0 && ['pending:', 'held:', 'loads:', 'candidates:', 'the metric:'].every((s) => text.out.includes(`\n${s}`)), text.out.slice(0, 300))
    const onlyPending = run(fixture('only pending', controlIssues()), ['--only', 'pending', '--now', NOW])
    ok('`--only pending` prints the pending section and no other', onlyPending.code === 0 && onlyPending.out.includes('\npending:') && !/\n(held|loads|candidates|the metric):/.test(onlyPending.out), onlyPending.out.slice(0, 300))
    const onlyHeld = run(fixture('only held', controlIssues()), ['--json', '--only', 'held', '--now', NOW])
    ok('`--json --only held` holds the held keys and no other section', onlyHeld.code === 0 && Array.isArray(onlyHeld.report?.held) && !('pending' in onlyHeld.report) && !('loads' in onlyHeld.report), JSON.stringify(Object.keys(onlyHeld.report ?? {})))
    const onlyBad = run(fixture('only a bad section', controlIssues()), ['--only', 'everything'])
    ok('`--only` with a section it does not have exits 2, naming the flag', onlyBad.code === 2 && /unknown or incomplete flag "--only"/.test(onlyBad.err), onlyBad.err)

    /* A line that does not parse fails the run, naming its issue and why. */
    const broken = (name, mutate, expect) => {
      const issues = controlIssues()
      mutate(issues)
      const r = run(fixture(name, issues))
      ok(`${name}: exit 1, by its reason`, r.code === 1 && expect.test(r.err), r.err)
    }
    broken('a malformed loaded line', (is) => (is[0].notes = is[0].notes.replace(`${LOADED_ALWAYS} abc1234`, `${LOADED_ALWAYS} not-a-commit`)), /example-0: the analysis \S+ has the line .* and no prompt under it|example-0: the analysis \S+ lists \d+ prompt\(s\), and the line after them/)
    broken('an analysis with no version line', (is) => (is[0].notes = is[0].notes.replace('2.1.289 (Claude Code)', '')), /example-0: the analysis \S+ lists \d+ prompt\(s\), and the line after them, "", is neither/)
    broken('a heading with no prompt under it', (is) => (is[0].notes = is[0].notes.replace(`${HEADING}\n`, `${HEADING}\n\n`)), /example-0: the analysis \S+ has the line `[^`]+` and no prompt under it/)
    broken('a malformed analysis marker line', (is) => (is[0].notes = is[0].notes.replace(/^(\S+) (\S+)@/, '$1 $2 at ')), /example-0: the line .* opens with `[^`]+` and is not "\S+ <run id>"/)
    broken('a malformed read line', (is) => (is[2].notes = is[2].notes.replace('https://example.com/pull/1', 'merged')), /example-2: the line .* opens with `[^`]+` and is not "\S+ <run id> <pull request URL or no change>"/)
    broken('a malformed held line', (is) => (is[3].notes = is[3].notes.replace(' 2: below', ' two: below')), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <count>: <reason>"/)

    /* An old-form analysis is listed as not counted, never as loading nothing. */
    {
      const issues = controlIssues()
      issues[0].notes = `${A} ${issues[0].notes.split('\n')[0].split(' ')[1]}\n\nProse naming ${LOADED_ALWAYS} at abc1234.`
      const r = run(fixture('old form', issues))
      ok(
        'an analysis with no heading is listed as not counted, and the sample and the loads leave it out',
        r.code === 0 && r.report.loads.notCounted.includes(issues[0].notes.split('\n')[0].split(' ')[1]) && r.report.loads.sample === FLOOR - 1 && loadOf(r.report, LOADED_ALWAYS) === FLOOR - 1,
        JSON.stringify(r.report?.loads.notCounted),
      )
      ok('below the floor, no candidate is named and no share is given', r.report.loads.candidates.length === 0 && r.report.loads.metric === null)
    }

    /* An analysis from before the cut-off is prose, even holding the heading's words as a label. */
    {
      const issues = controlIssues()
      const before = `example-before@${iso(SINCE - 1000)}`
      issues.push({ id: 'example-before', notes: [`${A} ${before}`, HEADING, `- ${LOADED_ALWAYS}, read at abc1234, in prose.`].join('\n') })
      const r = run(fixture('before the cut-off', issues))
      ok(
        'an analysis before `promptReviewLoadedSince` with the heading\'s words over prose is not counted and fails nothing, exit 0',
        r.code === 0 && r.report.analyses === FLOOR + 2 && r.report.loadedForm === FLOOR + 1,
        `${r.code} ${r.err} ${JSON.stringify({ analyses: r.report?.analyses, loadedForm: r.report?.loadedForm })}`,
      )
      const after = controlIssues()
      after[0].notes = after[0].notes.replace(`${LOADED_ALWAYS} abc1234`, `- ${LOADED_ALWAYS}, read at abc1234, in prose.`)
      const strict = run(fixture('after the cut-off', after))
      ok('the same prose under the heading after the cut-off fails, by its reason', strict.code === 1 && /example-0: the analysis \S+ has the line `[^`]+` and no prompt under it/.test(strict.err), strict.err)
    }

    /* A path with no row is listed, and is no load of any row. */
    {
      const issues = controlIssues()
      issues[1].notes = issues[1].notes.replace(`${LOADED_ALWAYS} abc1234`, `${LOADED_ALWAYS} abc1234\n.claude/skills/not-a-prompt/SKILL.md abc1234`)
      const r = run(fixture('unknown path', issues))
      ok(
        'a listed path with no budget row is printed under no row, with its run, exit 0',
        r.code === 0 && r.report.loads.noRow.length === 1 && r.report.loads.noRow[0].path === '.claude/skills/not-a-prompt/SKILL.md' && r.report.loads.noRow[0].runs.length === 1,
        JSON.stringify(r.report?.loads.noRow),
      )
    }

    /* Below the floor: the count, and no candidate. */
    {
      const r = run(fixture('below the floor', controlIssues().slice(0, FLOOR - 1)))
      ok(
        `${FLOOR - 1} analyses, one under the floor, names no candidate and gives no share, and says why`,
        r.code === 0 && r.report.loads.sample === FLOOR - 1 && r.report.loads.candidates.length === 0 && r.report.loads.metric === null,
        JSON.stringify(r.report?.loads),
      )
      const t = run(fixture('below the floor, text', controlIssues().slice(0, FLOOR - 1)), ['--now', NOW])
      ok('the text says the sample is under the floor', new RegExp(`candidates: none named; ${FLOOR - 1} analyses in D-44's form in the window, under the floor of ${FLOOR}`).test(t.out), t.out)
    }

    /* Half or more unloaded is the not-viable value. */
    {
      const issues = controlIssues().map((i) => ({ ...i, notes: i.notes.split('\n').filter((l) => !LOADED_REST.some((p) => l.startsWith(`${p} `))).join('\n') }))
      const r = run(fixture('not viable', issues))
      ok(
        'with only two considered rows loaded, half or more are unloaded, and the metric says not viable',
        r.report?.loads.metric?.notViable === true && r.report.loads.metric.unloaded === considered.length - 2,
        JSON.stringify(r.report?.loads.metric),
      )
    }

    /* Due: by count, by age. */
    {
      const issues = controlIssues().map((i) => ({ ...i, notes: i.notes.split('\n').filter((l) => !l.startsWith(`${R} `)).join('\n') }))
      const r = run(fixture('due by count', issues))
      ok(`${FLOOR + 1} pending is due, by \`promptReviewDueCount\``, r.report?.pending.due === true && /at or above `promptReviewDueCount`/.test(r.report.pending.why), r.report?.pending.why)
      const late = run(fixture('due by age', controlIssues()), ['--json', '--now', iso(NEWEST + (live.promptReviewDueAgeDays + 1) * DAY_MS)])
      ok(`the oldest pending past \`promptReviewDueAgeDays\` is due, by age`, late.report?.pending.due === true && /past `promptReviewDueAgeDays`/.test(late.report.pending.why), late.report?.pending.why)
    }

    /* A marker word not followed by one space is a broken line, never prose. */
    broken('a marker followed by a colon', (is) => (is[0].notes = is[0].notes.replace(`${A} `, `${A}: `)), /example-0: the line .* opens with `[^`]+` and is not "\S+ <run id>"/)
    broken('a held marker followed by a tab', (is) => (is[3].notes = is[3].notes.replace(`${H} `, `${H}\t`)), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <count>: <reason>"/)
    broken('a marker alone on its line', (is) => (is[0].notes = is[0].notes.replace(`${A} `, `${A}\n`)), /example-0: the line .* opens with `[^`]+` and is not "\S+ <run id>"/)

    /* A run id's time is a real second, and none is after now. */
    broken('a run id on a day no month has', (is) => (is[0].notes = is[0].notes.replace(/@\d{4}-\d{2}-\d{2}T/, '@2026-11-31T')), /example-0: the line .* opens with `[^`]+` and is not "\S+ <run id>"/)
    broken('a run id after now', (is) => (is[0].notes = is[0].notes.replace(/@\d{4}-/, '@2062-')), /example-0: the run id \S+ is after now/)

    /* A run noted twice is one analysis. */
    {
      const issues = controlIssues()
      issues.push({ id: 'example-copy', notes: issues[0].notes })
      const r = run(fixture('a run noted twice', issues))
      ok(
        'an analysis whose run id another note already opened is counted once, in pending, the sample and the loads, and the first line says so',
        r.code === 0 && r.report.pending.analyses.length === 2 && r.report.loads.sample === FLOOR && loadOf(r.report, LOADED_ALWAYS) === FLOOR && r.report.duplicates === 1,
        JSON.stringify({ pending: r.report?.pending.analyses, sample: r.report?.loads.sample, duplicates: r.report?.duplicates }),
      )
    }

    /* Pending names the issue whose notes hold the analysis. */
    {
      const issues = controlIssues()
      issues[0].id = 'example-holder'
      const r = run(fixture('held on another issue', issues))
      ok('pending names the issue that holds the analysis, not the one its run id names', r.report?.pending.analyses.some((a) => a.issue === 'example-holder' && a.run.startsWith('example-0@')), JSON.stringify(r.report?.pending.analyses))
    }

    /* On a tie, the held key's reason is its latest run's, whatever the export's order. */
    {
      const tie = (order) => {
        const issues = controlIssues()
        const later = `example-7@${iso(NEWEST - 7 * 3600000)}`
        const earlier = `example-9@${iso(NEWEST - 9 * 3600000)}`
        issues[7].notes += `\n${H} ${later} ${LOADED_ALWAYS}#a-tie 1: the later run's reason`
        issues[9].notes += `\n${H} ${earlier} ${LOADED_ALWAYS}#a-tie 1: the earlier run's reason`
        if (order === 'reversed') issues.reverse()
        return run(fixture(`a tie, ${order}`, issues)).report?.held.find((k) => k.key === `${LOADED_ALWAYS}#a-tie`)?.reason
      }
      ok("a held key's reason on a tie is the latest run's, in either export order", tie('in order') === "the later run's reason" && tie('reversed') === "the later run's reason", `${tie('in order')} | ${tie('reversed')}`)
    }

    /* A commit in capitals is hex digits too. */
    {
      const issues = controlIssues()
      issues[0].notes = issues[0].notes.replaceAll(' abc1234', ' ABC1234')
      const r = run(fixture('a commit in capitals', issues))
      ok('a commit of capital hex digits parses', r.code === 0 && r.report.loads.sample === FLOOR, r.err)
    }

    /* An analysis since the cut-off with no heading is counted in the first line as not in the form. */
    {
      const issues = controlIssues()
      const first = issues[0].notes.split('\n')[0]
      issues[0].notes = `${first}\n\nProse naming ${LOADED_ALWAYS}.`
      const r = run(fixture('since the cut-off, no heading', issues))
      const t = run(fixture('since the cut-off, no heading, text', issues), ['--only', 'pending', '--now', NOW])
      ok(
        'an analysis since the cut-off with no heading is counted apart, and the first line of every section says so',
        r.report?.proseSinceCutOff === 1 && /1 since the cut-off not in it/.test(t.out.split('\n')[0]),
        `${r.report?.proseSinceCutOff} ${t.out.split('\n')[0]}`,
      )
    }

    /* The not-viable share is the policy's, not the command's. */
    {
      const issues = controlIssues().map((i) => ({ ...i, notes: i.notes.split('\n').filter((l) => !LOADED_REST.some((p) => l.startsWith(`${p} `))).join('\n') }))
      const r = run(fixture('a share of nearly all', issues, (p) => (p.promptReviewLoadNotViableShare = 0.99)))
      ok('with the share at 0.99, the same unloaded rows are not "not viable"', r.report?.loads.metric?.notViable === false, JSON.stringify(r.report?.loads.metric))
    }

    /* The table keeps a prompt it names out of the candidates. */
    {
      const r = run(fixture('the table names a candidate', controlIssues(), (p) => (p.promptReviewUnloadedPrompts = { ...p.promptReviewUnloadedPrompts, [NEVER]: 'a reason' })))
      ok(`a prompt the table names, ${NEVER}, is no longer a candidate, and the other unloaded one still is`, JSON.stringify(r.report?.loads.candidates) === JSON.stringify([ALSO_NEVER]), JSON.stringify(r.report?.loads.candidates))
    }

    /* The closed line: each of its three forms, the state each gives a key, and a malformed one. */
    {
      const C = live.promptReviewClosedMarker
      const runAt = (i) => `example-${i}@${iso(NEWEST - i * 3600000)}`
      const pull = (n) => `https://example.com/owner/repo/pull/${n}`
      const PRS = { [pull(7)]: 'MERGED', [pull(8)]: 'OPEN', [pull(9)]: 'CLOSED' }
      const withClosed = () => {
        const issues = controlIssues()
        issues[3].notes += `\n${C} ${runAt(3)} ${LOADED_ALWAYS}#a-finding aside: the maintainer's reason`
        issues[6].notes += `\n${C} ${runAt(6)} ${LOADED_SOME}#owned issue example-owner: no prompt's; a run filed it`
        issues[7].notes += `\n${C} ${runAt(7)} ${LOADED_ALWAYS}#merged carried ${pull(7)}: an edit carried it`
        issues[8].notes += `\n${C} ${runAt(8)} ${LOADED_ALWAYS}#open carried ${pull(8)}: an edit carried it`
        issues[9].notes += `\n${H} ${runAt(9)} ${LOADED_ALWAYS}#unmerged 2: below the threshold, minor: the held reason\n${C} ${runAt(9)} ${LOADED_ALWAYS}#unmerged carried ${pull(9)}: an edit carried it`
        return issues
      }
      const r = run(fixture('closed lines', withClosed(), null, PRS))
      const keyOf = (name) => r.report?.held.find((k) => k.key === `${name.includes('#') ? '' : `${LOADED_ALWAYS}#`}${name}`)
      ok('closed lines of each form parse, exit 0, and the first line counts them', r.code === 0 && r.report.closedLines === 5, `${r.code} ${r.err} ${r.report?.closedLines}`)
      ok(
        'set aside by a person: the key is closed, with the person\'s reason, and keeps its held lines\' count and runs',
        keyOf('a-finding')?.state === 'closed' && keyOf('a-finding').closed.how === 'aside' && keyOf('a-finding').closed.reason === "the maintainer's reason" && keyOf('a-finding').count === 2 && keyOf('a-finding').runs.length === 2,
        JSON.stringify(keyOf('a-finding')),
      )
      ok(
        'owned by an issue: a key no held line names is listed, closed by its issue',
        keyOf(`${LOADED_SOME}#owned`)?.state === 'closed' && keyOf(`${LOADED_SOME}#owned`).closed.issue === 'example-owner' && keyOf(`${LOADED_SOME}#owned`).runs.length === 0,
        JSON.stringify(keyOf(`${LOADED_SOME}#owned`)),
      )
      ok("carried by a merged pull request: the key is closed, naming the pull request and its state", keyOf('merged')?.state === 'closed' && keyOf('merged').closed.url === pull(7) && keyOf('merged').closed.pullRequest === 'MERGED', JSON.stringify(keyOf('merged')))
      ok('carried by an open pull request: the key is carried, not closed', keyOf('open')?.state === 'carried', JSON.stringify(keyOf('open')))
      ok("carried by a pull request closed unmerged: the key is reopened, with its held line's reason", keyOf('unmerged')?.state === 'reopened' && keyOf('unmerged').reason === 'below the threshold, minor: the held reason', JSON.stringify(keyOf('unmerged')))
      const t = run(fixture('closed lines, text', withClosed(), null, PRS), ['--only', 'held', '--now', NOW])
      ok(
        'the text names how many keys are closed, and each closed key with how it ended',
        /\nheld: \d+ key\(s\), 3 of them closed\./.test(t.out) && t.out.includes(`#a-finding  closed, set aside by a person, at ${runAt(3)}: the maintainer's reason; count 2`) && t.out.includes('#owned  closed, owned by example-owner'),
        t.out,
      )
      {
        const issues = withClosed()
        issues[2].notes += `\n${H} ${runAt(2)} ${LOADED_ALWAYS}#a-finding 3: below the threshold, minor: shown again`
        const again = run(fixture('a held line after a closed one', issues, null, PRS))
        const k = again.report?.held.find((x) => x.key === `${LOADED_ALWAYS}#a-finding`)
        ok('a held line of a later run leaves a closed key closed, and counts the run', k?.state === 'closed' && k.count === 3 && k.runs.length === 3, JSON.stringify(k))
      }
      {
        const decided = (order) => {
          const issues = withClosed()
          issues[6].notes += `\n${C} ${runAt(6)} ${LOADED_ALWAYS}#twice aside: the older line's reason`
          issues[4].notes += `\n${C} ${runAt(4)} ${LOADED_ALWAYS}#twice carried ${pull(9)}: the later line's reason`
          if (order === 'reversed') issues.reverse()
          return run(fixture(`two closed lines, ${order}`, issues, null, PRS)).report?.held.find((x) => x.key === `${LOADED_ALWAYS}#twice`)
        }
        const [a, b] = [decided('in order'), decided('reversed')]
        ok("of two closed lines, the later run's decides, in either export order: here its pull request closed unmerged, so the key is reopened", a?.state === 'reopened' && a.closed.reason === "the later line's reason" && b?.state === 'reopened' && b.closed.reason === "the later line's reason", `${JSON.stringify(a)} | ${JSON.stringify(b)}`)
      }
      {
        const issues = withClosed()
        issues[5].notes += `\n${C} ${runAt(5)} ${LOADED_ALWAYS}#tie carried ${pull(9)}: zz an edit carried it\n${C} ${runAt(5)} ${LOADED_ALWAYS}#tie aside: a person set it aside after the pull request closed`
        const k = run(fixture('a tie on one issue', issues, null, PRS)).report?.held.find((x) => x.key === `${LOADED_ALWAYS}#tie`)
        ok("of two closed lines on one run and one issue, the later in the notes decides, whatever its reason sorts: a person's aside after a carried line closes the key", k?.state === 'closed' && k.closed.how === 'aside', JSON.stringify(k))
      }
      {
        const issues = controlIssues()
        const lines = issues[0].notes.split('\n')
        issues[0].notes = [lines[0], `${C} ${runAt(0)} ${LOADED_ALWAYS}#a-finding aside: closed mid-analysis`, ...lines.slice(1)].join('\n')
        const cut = run(fixture('an analysis ends at a closed line', issues))
        ok(
          'an analysis ends at a closed line, so the heading after it is no part of it: the analysis is prose, out of the sample',
          cut.code === 0 && cut.report.proseSinceCutOff === 1 && cut.report.loads.sample === FLOOR - 1,
          `${cut.code} ${cut.err} ${cut.report?.proseSinceCutOff} ${cut.report?.loads.sample}`,
        )
      }
      broken('a closed line naming a pull request by number, not URL', (is) => (is[3].notes += `\n${C} ${runAt(3)} ${LOADED_ALWAYS}#a-finding carried 93: an edit`), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <carried <pull request URL>, issue <issue id> or aside>: <reason>"/)
      broken('a closed line ended some other way', (is) => (is[3].notes += `\n${C} ${runAt(3)} ${LOADED_ALWAYS}#a-finding fixed: by itself`), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <carried/)
      broken('a closed line whose issue id ends in a colon', (is) => (is[3].notes += `\n${C} ${runAt(3)} ${LOADED_ALWAYS}#a-finding issue example-1:: owned`), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <carried/)
      broken('a closed line whose file holds a #', (is) => (is[3].notes += `\n${C} ${runAt(3)} a#b#c aside: a reason`), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <carried/)
      broken('a carried line whose URL has a query', (is) => (is[3].notes += `\n${C} ${runAt(3)} ${LOADED_ALWAYS}#a-finding carried ${pull(12)}?x=/pull/3: an edit`), /example-3: the line .* opens with `[^`]+` and is not "\S+ <run id> <file>#<name> <carried/)
      {
        const issues = controlIssues()
        issues[3].notes += '\nprompt-run-other a line of a marker with no form'
        const r2 = run(fixture('a marker with no form', issues, (p) => (p.promptReviewOtherMarker = 'prompt-run-other')))
        ok('a line of a policy marker the header gives no form fails, by its reason', r2.code === 1 && /example-3: the line .* opens with `prompt-run-other`, a marker of the policy that the header of scripts\/prompt-runs\.mjs gives no form/.test(r2.err), r2.err)
      }
      {
        const noFile = run(fixture('a carried line, no states', withClosed()))
        ok('a carried line with no state to read fails, and never falls back to GitHub', noFile.code === 1 && /holds no readable pull-requests\.json .* never falls back to GitHub/.test(noFile.err), noFile.err)
        const missing = run(fixture('a carried line, its state missing', withClosed(), null, { [pull(7)]: 'MERGED' }))
        ok("a carried line whose pull request the states leave out fails, naming it", missing.code === 1 && new RegExp(`the pull request ${pull(8).replaceAll('.', '\\.')}, which a carried line names, has the state null`).test(missing.err), missing.err)
        const pendingOnly = run(fixture('a carried line, pending only', withClosed()), ['--json', '--only', 'pending', '--now', NOW])
        ok('`--only pending` reads no pull request, so it needs no state', pendingOnly.code === 0 && pendingOnly.report?.pending, pendingOnly.err)
      }
    }

    /* The policy, and the export. */
    const policyCase = (name, change, expect) => {
      const r = run(fixture(name, controlIssues(), change))
      ok(`${name}: exit 1, by its reason`, r.code === 1 && expect.test(r.err), r.err)
    }
    policyCase('a policy without the floor', (p) => delete p.promptReviewLoadFloor, /the policy has no `promptReviewLoadFloor`/)
    policyCase('a window of 0 days', (p) => (p.promptReviewLoadWindowDays = 0), /`promptReviewLoadWindowDays` is 0, where it must be a whole number of at least 1/)
    policyCase('a table entry with no budget row', (p) => (p.promptReviewUnloadedPrompts = { ...p.promptReviewUnloadedPrompts, '.claude/skills/gone/SKILL.md': 'a reason' }), /names \.claude\/skills\/gone\/SKILL\.md, which has no row in `promptWordBudgets`/)
    policyCase('a heading that opens with a marker', (p) => (p.promptReviewLoadedHeading = `${A} loaded:`), /`promptReviewLoadedHeading` opens with a marker's word/)
    policyCase('a share of 1.5', (p) => (p.promptReviewLoadNotViableShare = 1.5), /`promptReviewLoadNotViableShare` is 1\.5, where it must be a share above 0 and at most 1/)
    policyCase('a policy without the closed marker', (p) => delete p.promptReviewClosedMarker, /the policy has no `promptReviewClosedMarker`/)
    policyCase('a closed marker spelt as the held one', (p) => (p.promptReviewClosedMarker = p.promptReviewHeldMarker), /the 4 markers must differ/)
    {
      const root = fixture('no export', null)
      const r = run(root)
      ok('an override with no export fails, and never falls back to the live tracker', r.code === 1 && /holds no readable export\.jsonl .* never falls back to the live tracker/.test(r.err), r.err)
    }
    {
      const r = run(fixture('a bad flag', controlIssues()), ['--since', 'yesterday'])
      ok('an unknown flag exits 2, naming it', r.code === 2 && /unknown or incomplete flag "--since"/.test(r.err), r.err)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(`\nprompt-runs selftest: ${checks - failures}/${checks} checks hold.`)
  return failures ? 1 : 0
}

if (process.argv[1] && resolve(process.argv[1]) === SELF) {
  process.exitCode = process.argv[2] === '--selftest' ? selftest() : main(process.argv.slice(2))
}
