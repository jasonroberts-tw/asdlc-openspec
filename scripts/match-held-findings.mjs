/**
 * Prompt-review match: for each finding of a prompt review's batch, asks TypeSafe whether it is one
 * an earlier review already holds about the same prompt file, and prints which key it takes and which
 * answer decided it, for the reviewer's session to pass to `.claude/workflows/review-prompts.js` as
 * each finding's `match` (`.claude/agents/continuous-prompt-improvement.md` § 3). An operator command
 * that the reviewer's session runs before that workflow, never a gate.
 *
 * WHAT IT DOES. Code reads every held line from the tracker: each line of an issue's notes, in what
 * `bd export` prints, that opens with `promptReviewHeldMarker`, in the form the header of
 * `scripts/prompt-runs.mjs` gives (§ 6 of that agent writes them). For each finding of the
 * input it gathers the keys held about the finding's file, the part of a key before its `#`. Each is
 * one option, labelled by its key, its text the reason of its held line of the highest count (the
 * later on a tie); `promptReviewMatchNoneOption` is one more, labelled `none`. One Choice per finding,
 * through `tools/lib/typesafe.ts`, asks which option describes the same failure, the test § 3 states:
 * the same step done wrong or missing at the same place in the prompt, however each words it. Code
 * then routes on the model's top label, the one with the highest probability:
 *
 *   a held key at `promptReviewMatchHeldMinProbability` or more  the finding takes that key, `by: model`
 *   `none` at `promptReviewMatchNoneMinProbability` or more       a new key the session names, `by: model`
 *   anything else                                                 the session keys it, `by: reviewer`,
 *                                                                 the model's answer beside its own
 *   a file no held line names a key of                            a new key, `by: no-held-key`, no call
 *
 * Each threshold is above 0.5, so only the top label can meet one; a policy where one is not is
 * refused. The calls go one after another, so the first that fails stops the run.
 *
 * WITHOUT A KEY. When `TYPESAFE_API_KEY` is not set, no call is made: every finding whose file holds a
 * key goes to the session, `by: reviewer` with `choice` and `probability` null, the output's `skip`
 * says why, and the run exits 0, so a review runs as it did before this script. A key that is set
 * and a call that fails is a failure, exit 1, and never a quiet run without the model.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; the script came with asdlc-openspec-6yt.1. Until
 * it, the reviewer's session decided in its own context whether a new finding was one already held,
 * and coined a new key whenever it judged not. Everything after joins on the key's exact text: the
 * workflow, and the next review's count from the held lines. So a recurring minor finding whose key
 * drifts at each review starts again at one each time, and never reaches `promptReviewRecurrenceCount`,
 * the loss `promptReviewHeldMarkerMeans` records for a hand-edited line. Were this script wrong, it
 * would let through a model's answer taken under its threshold, a failed call or an unreadable
 * tracker read as "nothing held", so that every finding gets a new key and every count starts again,
 * a key held about another file offered as an option, and a held key printed with `held` short of
 * the runs its held lines name, so that the workflow holds the count to too few.
 *
 * WHERE IT LOSES. Two failures at one place in a prompt, worded alike, get two keys from a session
 * that reads them closely; the model may give the second the first's key at a threshold, and carry it
 * past `promptReviewRecurrenceCount` a run early, where its skeptics then judge an edit for it. A held
 * line a hand edit broke is not offered: it is listed in the output's `held.unparsed`, and the
 * session names it in the review's description. Within one batch, whether two new findings are one
 * is still the session's to decide. `promptReviewMatchNoneMinProbability` is the value the 2026-09-29
 * note on asdlc-openspec-6yt.1 proposed from its small sample of findings; the maintainer chose
 * `promptReviewMatchHeldMinProbability` on 2026-10-05 from the larger measurement over the tracker's
 * held lines. Each key's `Means` in `tools/policy/agent-workflows.json` gives its figures, and says it
 * is provisional.
 *
 * INVOCATION.
 *
 *   mise run prompt-review:match --input <file>             the match, printed as one line of JSON
 *   mise run prompt-review:match --input <file> --dry-run   each finding's held keys; no key, no call
 *   mise run prompt-review:match:selftest                   the selftest (`--selftest`)
 *   PROMPT_REVIEW_MATCH_ROOT=<dir> mise run prompt-review:match --input <file>
 *                       the same over a doctored copy: a directory holding the policy's records under
 *                       `tools/policy/` and `export.jsonl`, one issue per line as `bd export` prints
 *                       it; it then runs no `bd`, and a copy with no export is a failure, never a fall
 *                       back to the live tracker
 *
 * The input is a JSON file the session writes under `.scratch/`:
 *
 *   { "findings": [{ "id", "run", "file", "finding" }] }, one entry for each finding of each analysis:
 *     id       its name, once in the input, such as `<run>#<n>`
 *     run      the run that showed it, as its analysis's marker line gives the run id
 *     file     the repository-relative prompt file it concerns
 *     finding  what made the run slower or wrong, as the analysis states it
 *
 * The output, on stdout:
 *
 *   { model, skip, held: { lines, keys, unparsed }, findings: [{ id, file, key, match, top }] }
 *     skip      null, or why no call was made
 *     key       the held key the model gave, or null for a new key or one the session decides
 *     match     { run, by, choice, probability, held? }: `by` is `model`, `reviewer` or `no-held-key`,
 *               `choice` the model's top label (a held key or `none`) and `probability` its
 *               probability, both null where no call was made. `held` is on an entry the model keyed
 *               with a held key alone: the distinct run ids that key's held lines name, in code-point
 *               order, which may name a run of this batch, held while its analysis stayed pending.
 *               The session copies the entry, unchanged, into the finding it passes
 *               `review-prompts.js` (`args.groups` there), one entry for each run of that finding,
 *               and that script refuses one its key or count does not bear out.
 *     top       the model's three likeliest labels with their probabilities, for the session to read
 *               where it decides
 *
 * What the session does with each answer: `by: model` with a `key` takes it, and its count is the
 * distinct runs of its runs in this batch and its `held` together, as `review-prompts.js` requires;
 * `by: model` with no key, or `by: no-held-key`, gets a new key; `by: reviewer` the session keys as
 * § 3 says, and its `match` entry keeps the model's answer beside the key the session gave. A finding
 * the session then joins to another of this batch carries one entry for each of its runs.
 *
 * EXIT. 0 with the match printed, the key set or not; 2 on a bad flag or a bad input, which the
 * session corrects and runs again; 1 on a failure: a policy key missing or wrong, the tracker or the
 * override's export unreadable, or a TypeSafe call that failed or answered without a label. On 1 the
 * review stops, editing nothing and writing nothing, reports the failure, and its analyses stay
 * pending for the next review.
 *
 * NEEDS `TYPESAFE_API_KEY` and the network to judge (`tools/lib/typesafe.ts`); `bd` on PATH and the
 * tracker's database, read through `scripts/prompt-runs.mjs`'s reader, which uses
 * `tools/lib/bd-launcher.ts`, and its held lines parsed by that file's parser, unless the override
 * names an export;
 * `npm ci`, for the SDK. One request per finding with a held key, at 143 to 302 ms each in the
 * 2026-09-29 experiment; 140 such requests, six at a time, took 5.6 s on 2026-10-05 over the
 * tracker's 234 held lines. Without the key it needs neither the network nor the SDK. The selftest
 * took 1.74 s wall through `mise run` (`/usr/bin/time -p`, one run) on a macOS 26.7.1 laptop with
 * Node 26.8.1, 2026-10-05.
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv } from '../tools/lib/git-env.ts'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'
import { createJudge } from '../tools/lib/typesafe.ts'
import { afterMarker, parseHeldLine, readTracker as readTrackerThrough } from './prompt-runs.mjs'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT_ENV = 'PROMPT_REVIEW_MATCH_ROOT'
/** Under the override, the export sits here, as `scripts/check-beads.mjs` reads its own. */
const OVERRIDE_EXPORT = 'export.jsonl'
const POLICY_FILE = 'tools/policy/agent-workflows.json'
const NAME = 'prompt-review:match'

/** The one label beside the held keys; no key is it, since a key holds a `#`. */
export const NONE = 'none'
/** Who decided a finding's key, as `review-prompts.js` reads `match.by`. */
export const MODEL = 'model'
export const REVIEWER = 'reviewer'
export const NO_HELD_KEY = 'no-held-key'
/** How many of the model's likeliest labels the output gives the session to read. */
const TOP = 3

/** The question TypeSafe is asked of each finding; the options are its file's held keys and `none`. */
export const INSTRUCTIONS =
  'The state holds one finding from a run of a prompt file: `file` is the prompt it concerns, and' +
  ' `finding` says what made the run slower or wrong. Each option but `none` is a finding an earlier' +
  " review of that file holds: its label is that finding's key, and its text the reason it was held." +
  ' Which option describes the same failure as `finding`: the same step done wrong or missing at the' +
  ' same place in the prompt, however each words it?'

/** The policy keys this script reads, each with a `Means`, and what each must be. */
const KEYS = [
  ['typesafeModel', 'text'],
  ['promptReviewHeldMarker', 'text'],
  ['promptReviewMatchHeldMinProbability', 'threshold'],
  ['promptReviewMatchNoneMinProbability', 'threshold'],
  ['promptReviewMatchNoneOption', 'text'],
]

/** The keys this script reads from the records under `root`, or a thrown error naming the one that is wrong. */
export function loadPolicy(root) {
  let raw
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Error(`tools/policy/ under ${root} cannot be read: ${error.message}`)
  }
  for (const [key, kind] of KEYS) {
    const value = raw[key]
    if (kind === 'text' && !(typeof value === 'string' && value.trim() !== '')) throw new Error(`the policy has no \`${key}\` that is text`)
    if (kind === 'threshold' && !(typeof value === 'number' && value > 0.5 && value <= 1)) {
      throw new Error(`the policy's \`${key}\` is ${JSON.stringify(value)}, where it must be a probability above 0.5 and at most 1, so that only the top label can meet it`)
    }
    if (typeof raw[`${key}Means`] !== 'string') throw new Error(`the policy has \`${key}\` and no \`${key}Means\` saying what it decides`)
  }
  return Object.fromEntries(KEYS.map(([key]) => [key, raw[key]]))
}

/* ------------------------------------------------------------------------------ the held lines ----- */

/** Every issue in the tracker, through the one reader `scripts/prompt-runs.mjs` keeps, naming this command's override. */
export function readTracker(root, overridden) {
  return readTrackerThrough(root, overridden, ROOT_ENV)
}

/**
 * The held lines in the issues' notes: each `{ run, at, key, file, count, reason }`, parsed by
 * `scripts/prompt-runs.mjs`, whose header is the one home of the line's form, and each line that
 * opens with the marker and does not parse, with its issue, so a broken one is named, not dropped.
 * That command fails on such a line; this one lists it, since it reads the held lines alone.
 */
export function heldLines(issues, marker) {
  const lines = []
  const unparsed = []
  for (const issue of issues) {
    for (const line of String(issue?.notes ?? '').split('\n')) {
      const rest = afterMarker(line, marker)
      if (rest === undefined) continue
      const held = parseHeldLine(rest)
      if (held) lines.push(held)
      else unparsed.push({ issue: issue.id ?? null, line })
    }
  }
  return { lines, unparsed }
}

/** Each held key of `file`, with the reason of its line of the highest count, the later on a tie, in code-point order of key. */
export function optionsFor(file, lines) {
  const best = new Map()
  for (const line of lines) {
    if (line.file !== file) continue
    const seen = best.get(line.key)
    if (!seen || line.count >= seen.count) best.set(line.key, line)
  }
  return [...best.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).map((key) => ({ key, reason: best.get(key).reason }))
}

/** The distinct runs `key`'s held lines name, in code-point order: what a finding given that key counts beside its own runs. */
export function heldRuns(key, lines) {
  return [...new Set(lines.filter((line) => line.key === key).map((line) => line.run))].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
}

/* --------------------------------------------------------------------------------- the input ----- */

/** The findings of the input, or a thrown error whose `usage` is set, naming what is wrong. */
export function readInput(path) {
  const fail = (why) => Object.assign(new Error(`the input ${path} ${why}`), { usage: true })
  let data
  try {
    data = JSON.parse(readFileSync(path, 'utf8'))
  } catch (error) {
    throw fail(`cannot be read as JSON: ${error.message}`)
  }
  if (!Array.isArray(data?.findings) || data.findings.length === 0) throw fail('holds no non-empty list `findings`')
  const ids = new Set()
  for (const [i, f] of data.findings.entries()) {
    const text = (v) => typeof v === 'string' && v.trim() !== ''
    if (!text(f?.id) || ids.has(f.id)) throw fail(`has findings[${i}] with no id, or an id another finding has`)
    ids.add(f.id)
    if (!text(f.run) || /\s/.test(f.run.trim())) throw fail(`has the finding ${f.id} with no run id, or one holding a space`)
    if (!text(f.file) || f.file.startsWith('/') || f.file.split('/').includes('..')) throw fail(`has the finding ${f.id} with no repository-relative file`)
    if (!text(f.finding)) throw fail(`has the finding ${f.id} with no text`)
  }
  return data.findings.map((f) => ({ id: f.id, run: f.run.trim(), file: f.file.trim().replace(/^\.\//, ''), finding: f.finding.trim() }))
}

/* ------------------------------------------------------------------------------- the routing ----- */

/** The labels of `probabilities` from the likeliest, ties in the order the options were given. */
function ranked(probabilities, labels) {
  return labels.map((label, i) => ({ label, probability: probabilities[label], i })).sort((a, b) => b.probability - a.probability || a.i - b.i)
}

/** Who keys a finding the model answered, and with what, as the header's table routes it. */
export function route(top, policy) {
  const decisive = top.probability >= (top.label === NONE ? policy.promptReviewMatchNoneMinProbability : policy.promptReviewMatchHeldMinProbability)
  return { by: decisive ? MODEL : REVIEWER, key: decisive && top.label !== NONE ? top.label : null }
}

/** Each finding's key and match: one request per finding with a held key, one after another. A failed call throws. */
export async function matchAll(findings, lines, policy, judge) {
  const out = []
  for (const f of findings) {
    const options = optionsFor(f.file, lines)
    const entry = (by, key, answer = null) => ({
      id: f.id,
      file: f.file,
      key,
      match: { run: f.run, by, choice: answer?.label ?? null, probability: answer?.probability ?? null, ...(by === MODEL && key !== null ? { held: heldRuns(key, lines) } : {}) },
      top: answer ? answer.top : [],
    })
    if (!options.length) {
      out.push(entry(NO_HELD_KEY, null))
      continue
    }
    if (!judge) {
      out.push(entry(REVIEWER, null))
      continue
    }
    const criteria = Object.fromEntries([...options.map((o) => [o.key, o.reason]), [NONE, policy.promptReviewMatchNoneOption]])
    const answer = await judge.choose({ state: { file: f.file, finding: f.finding }, instructions: INSTRUCTIONS, criteria })
    const labels = Object.keys(criteria)
    for (const label of labels) {
      const p = answer?.probabilities?.[label]
      if (typeof p !== 'number' || !(p >= 0 && p <= 1)) throw new Error(`the answer for ${f.id} has no probability for "${label}"`)
    }
    const order = ranked(answer.probabilities, labels)
    const { by, key } = route(order[0], policy)
    out.push(entry(by, key, { label: order[0].label, probability: order[0].probability, top: order.slice(0, TOP).map(({ label, probability }) => ({ label, probability })) }))
  }
  return out
}

/* ---------------------------------------------------------------------------------- the command ----- */

/** The command, its dependencies handed in so the selftest runs it whole over a stub. */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => process.stdout.write(`${t}\n`))
  const err = deps.err ?? ((t) => process.stderr.write(`${t}\n`))
  const makeJudge = deps.makeJudge ?? createJudge
  const overridden = Boolean(env[ROOT_ENV])
  const root = overridden ? resolve(env[ROOT_ENV]) : REPO_ROOT

  let input = null
  let dryRun = false
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') dryRun = true
    else if (argv[i] === '--input' && argv[i + 1] && !argv[i + 1].startsWith('--')) input = argv[++i]
    else {
      err(`${NAME}: unknown or incomplete flag ${JSON.stringify(argv[i])}. See the header of scripts/match-held-findings.mjs.`)
      return 2
    }
  }
  if (!input) {
    err(`${NAME}: --input <file> is required: the findings, as the header of scripts/match-held-findings.mjs gives them.`)
    return 2
  }
  let findings
  try {
    findings = readInput(input)
  } catch (error) {
    err(`${NAME}: ${error.message}. Correct it and run again.`)
    return 2
  }

  let policy
  let held
  try {
    policy = loadPolicy(root)
    held = heldLines(readTracker(root, overridden), policy.promptReviewHeldMarker)
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  const heldSummary = { lines: held.lines.length, keys: new Set(held.lines.map((l) => l.key)).size, unparsed: held.unparsed }
  if (held.unparsed.length) err(`${NAME}: ${held.unparsed.length} line(s) open with \`${policy.promptReviewHeldMarker}\` and do not parse, so they are not offered; the output's held.unparsed lists them`)

  if (dryRun) {
    out(JSON.stringify({ dryRun: true, held: heldSummary, findings: findings.map((f) => ({ id: f.id, file: f.file, options: optionsFor(f.file, held.lines).map((o) => o.key) })) }))
    return 0
  }

  let judge = null
  let skip = null
  const asking = findings.some((f) => optionsFor(f.file, held.lines).length)
  if (asking) {
    let made
    try {
      made = await makeJudge({ env, model: policy.typesafeModel })
    } catch (error) {
      err(`${NAME} FAILED: ${error.message}`)
      return 1
    }
    if ('skip' in made) skip = made.skip
    else judge = made.judge
  }
  let matched
  try {
    matched = await matchAll(findings, held.lines, policy, judge)
  } catch (error) {
    err(`${NAME} FAILED: a TypeSafe call failed, so no finding is keyed: ${error.message}`)
    return 1
  }
  const tally = (by, keyed) => matched.filter((m) => m.match.by === by && (keyed === undefined || (m.key !== null) === keyed)).length
  err(
    `${NAME} -- ${matched.length} finding(s): ${tally(MODEL, true)} given a held key by the model, ${tally(MODEL, false)} a new key by the model,` +
      ` ${tally(NO_HELD_KEY)} a new key with no key held about its file, ${tally(REVIEWER)} for the session to key${skip ? ` (${skip})` : ''}`,
  )
  out(JSON.stringify({ model: policy.typesafeModel, skip, held: heldSummary, findings: matched }))
  return 0
}

/* --------------------------------------------------------------------------------- the selftest ----- */

/**
 * The selftest: the command run whole, in this process, over a fixture directory under the temporary
 * directory that holds the live policy's records and a fixture export, through `PROMPT_REVIEW_MATCH_ROOT`,
 * with a stubbed judge; and twice as a child process, once with no key and once through the real SDK
 * to a closed loopback port. Each case breaks one thing and asserts the reason the run reports, and
 * an undoctored control must pass first. Needs no key and no network beyond a refused connection to
 * 127.0.0.1, and `npm ci` for that one case.
 */
async function selftest() {
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
  console.log('prompt-review match selftest\n')

  const BEAD = '.claude/skills/bead/SKILL.md'
  const OPEN_PR = '.claude/skills/open-pr/SKILL.md'
  const OTHER = '.claude/skills/other/SKILL.md'
  const STAGE = `${BEAD}#gates-before-staging`
  const BUDGET = `${BEAD}#budget-before-edit`
  const WATCH = `${OPEN_PR}#second-watcher`
  const dir = mkdtempSync(join(tmpdir(), 'prompt-review-match-selftest-'))
  try {
    const live = loadPolicy(REPO_ROOT)
    const marker = live.promptReviewHeldMarker
    const heldLine = (run, key, count, reason) => `${marker} ${run} ${key} ${count}: ${reason}`
    const ISSUES = [
      { id: 'example-1', notes: ['prompt-run-analysis example-1@2026-09-20T00:00:00Z', heldLine('example-1@2026-09-20T00:00:00Z', STAGE, 1, 'below the threshold, minor: the gates ran before a new file was staged')].join('\n') },
      {
        id: 'example-2',
        notes: [
          heldLine('example-2@2026-09-21T00:00:00Z', STAGE, 2, 'below the threshold, minor: the gates read a tree without the new file, which was staged after them'),
          heldLine('example-2@2026-09-21T00:00:00Z', BUDGET, 1, 'below the threshold, minor: a prompt edit was made before its word budget was checked'),
          heldLine('example-2@2026-09-21T00:00:00Z', WATCH, 1, 'set aside by its file\'s agent: a second watcher was started on one pull request'),
          `${marker} a held line a hand edit broke`,
        ].join('\n'),
      },
      { id: 'example-3', notes: 'No held line here; it quotes one: ' + heldLine('x@y', STAGE, 9, 'not at the start of a line') },
    ]
    /** The runs STAGE's held lines name, the line quoted mid-line not among them. */
    const HELD_RUNS = ['example-1@2026-09-20T00:00:00Z', 'example-2@2026-09-21T00:00:00Z']
    const fixture = (name, change, issues = ISSUES) => {
      const root = join(dir, name)
      copyPolicy(REPO_ROOT, root)
      if (change) editPolicy(root, change)
      if (issues) writeFileSync(join(root, OVERRIDE_EXPORT), issues.map((i) => JSON.stringify(i)).join('\n') + '\n')
      return root
    }
    const CONTROL = fixture('control')
    const heldMin = live.promptReviewMatchHeldMinProbability
    const noneMin = live.promptReviewMatchNoneMinProbability

    const RUN = 'example-9@2026-10-01T00:00:00Z'
    const FINDINGS = [
      { id: 'same', run: RUN, file: BEAD, finding: 'The gates ran before the new file was added, so they never read it.' },
      { id: 'new', run: RUN, file: BEAD, finding: 'The session opened a second worktree for one issue.' },
      { id: 'related', run: RUN, file: BEAD, finding: 'The consolidation dropped a condition of a kept rule.' },
      { id: 'unheld', run: RUN, file: OTHER, finding: 'A step of a file no review holds anything about.' },
    ]
    const inputFile = (name, findings = FINDINGS) => {
      const path = join(dir, `${name}.json`)
      writeFileSync(path, JSON.stringify({ findings }))
      return path
    }
    const INPUT = inputFile('input')

    /** What the stub answers, by the finding's text: a probability for each label, the rest spread over the others. */
    const answers = {
      'The gates ran before the new file was added, so they never read it.': { [STAGE]: heldMin },
      'The session opened a second worktree for one issue.': { [NONE]: noneMin },
      'The consolidation dropped a condition of a kept rule.': { [BUDGET]: Math.round((heldMin - 0.01) * 100) / 100 },
    }
    const answerFor = (question, wanted) => {
      const labels = Object.keys(question.criteria)
      const [label, p] = Object.entries(wanted)[0]
      const rest = (1 - p) / (labels.length - 1)
      const probabilities = Object.fromEntries(labels.map((l) => [l, l === label ? p : rest]))
      return { choice: label, confidence: p, probabilities }
    }
    const stub = (asked, answer) => ({
      async choose(question) {
        asked.push(question)
        return answer ? answer(question) : answerFor(question, answers[question.state.finding])
      },
    })
    const run = async (argv, { root = CONTROL, judge, env, asked = [] } = {}) => {
      const outs = []
      const errs = []
      const code = await main(argv, {
        env: { [ROOT_ENV]: root, TYPESAFE_API_KEY: 'selftest-not-a-key', ...env },
        out: (t) => outs.push(t),
        err: (t) => errs.push(t),
        ...(judge === 'real' ? {} : { makeJudge: async () => ({ judge: judge ?? stub(asked) }) }),
      })
      const text = outs.join('\n')
      let result = null
      try {
        result = text ? JSON.parse(text) : null
      } catch {}
      return { code, out: text, err: errs.join('\n'), result, asked }
    }
    const of = (result, id) => result?.findings.find((f) => f.id === id)

    /* The control: each outcome, what is offered and what is not. */
    const control = await run(['--input', INPUT])
    ok('control: the undoctored fixture runs to a match, exit 0', control.code === 0 && control.result !== null, control.err)
    if (control.code !== 0 || !control.result) throw new Error('the control does not pass, so no other case can be trusted')
    ok(
      `a held key at ${heldMin}, the threshold itself, keys the finding, by the model`,
      JSON.stringify(of(control.result, 'same')) ===
        JSON.stringify({ id: 'same', file: BEAD, key: STAGE, match: { run: RUN, by: MODEL, choice: STAGE, probability: heldMin, held: HELD_RUNS }, top: of(control.result, 'same').top }),
      JSON.stringify(of(control.result, 'same')),
    )
    ok(
      "the held key's match names in `held` the runs its held lines name, and no entry but a held key the model gave carries `held`",
      JSON.stringify(of(control.result, 'same')?.match.held) === JSON.stringify(HELD_RUNS) && ['new', 'related', 'unheld'].every((id) => of(control.result, id) && !('held' in of(control.result, id).match)),
      JSON.stringify(control.result.findings.map((f) => f.match)),
    )
    ok(
      `none at ${noneMin}, the threshold itself, gives a new key, by the model, with no held key`,
      of(control.result, 'new')?.key === null && JSON.stringify(of(control.result, 'new').match) === JSON.stringify({ run: RUN, by: MODEL, choice: NONE, probability: noneMin }),
      JSON.stringify(of(control.result, 'new')),
    )
    ok(
      'a held key a hair under its threshold goes to the session, the model\'s answer beside it',
      of(control.result, 'related')?.key === null && of(control.result, 'related').match.by === REVIEWER && of(control.result, 'related').match.choice === BUDGET,
      JSON.stringify(of(control.result, 'related')),
    )
    ok(
      'a file no held line names a key of gets a new key with no call',
      of(control.result, 'unheld')?.match.by === NO_HELD_KEY && of(control.result, 'unheld').match.choice === null && !control.asked.some((q) => q.state.file === OTHER),
      JSON.stringify(of(control.result, 'unheld')),
    )
    ok('one request for each finding with a held key, and no other', control.asked.length === 3, `${control.asked.length} asked`)
    const asked = control.asked[0]
    ok(
      "the options are the file's held keys and none, and no key of another file",
      asked && JSON.stringify(Object.keys(asked.criteria)) === JSON.stringify([BUDGET, STAGE, NONE]),
      JSON.stringify(asked && Object.keys(asked.criteria)),
    )
    ok(
      "a key's text is the reason of its held line of the highest count, and none's the policy's",
      asked?.criteria[STAGE] === 'below the threshold, minor: the gates read a tree without the new file, which was staged after them' &&
        asked.criteria[NONE] === live.promptReviewMatchNoneOption,
      JSON.stringify(asked?.criteria),
    )
    ok(
      'the state is the finding and its file, and the instructions name both',
      asked?.state.file === BEAD && asked.state.finding === FINDINGS[0].finding && asked.instructions.includes('`file`') && asked.instructions.includes('`finding`'),
      JSON.stringify(asked?.state),
    )
    ok(
      'the held lines are counted, a broken one listed and not offered, and one quoted mid-line not read',
      control.result.held.lines === 4 && control.result.held.keys === 3 && control.result.held.unparsed.length === 1 && control.result.held.unparsed[0].issue === 'example-2',
      JSON.stringify(control.result.held),
    )
    ok('the top labels are given, likeliest first', of(control.result, 'same').top[0].label === STAGE && of(control.result, 'same').top.length === TOP, JSON.stringify(of(control.result, 'same').top))
    ok('the model the policy pins is named, and no skip', control.result.model === live.typesafeModel && control.result.skip === null, JSON.stringify(control.result.model))

    /* A run held again while its analysis stayed pending, and a held line read after a later run's. */
    const again = ISSUES.map((i) => (i.id === 'example-2' ? { ...i, notes: `${i.notes}\n${heldLine(HELD_RUNS[1], STAGE, 2, 'held again while its analysis stayed pending')}` } : i))
    again.push({ id: 'example-0', notes: heldLine('example-0@2026-09-19T00:00:00Z', STAGE, 1, 'below the threshold, minor: the first run that showed it') })
    const repeated = await run(['--input', inputFile('repeated', [FINDINGS[0]])], { root: fixture('repeated', null, again) })
    ok(
      '`held` names each run once, however many of its held lines name it, in code-point order',
      JSON.stringify(of(repeated.result, 'same')?.match.held) === JSON.stringify(['example-0@2026-09-19T00:00:00Z', ...HELD_RUNS]),
      repeated.out + repeated.err,
    )

    /* Each threshold, from the other side. */
    const underNone = await run(['--input', inputFile('under-none', [FINDINGS[1]])], { judge: stub([], (q) => answerFor(q, { [NONE]: Math.round((noneMin - 0.01) * 100) / 100 })) })
    ok('none a hair under its threshold goes to the session', of(underNone.result, 'new')?.match.by === REVIEWER && of(underNone.result, 'new').match.choice === NONE, underNone.out + underNone.err)
    const lowNone = await run(['--input', INPUT], { root: fixture('low-none', (p) => (p.promptReviewMatchNoneMinProbability = 0.5)) })
    ok('a threshold of 0.5, where two labels could meet it, is refused, naming the key', lowNone.code === 1 && /`promptReviewMatchNoneMinProbability` is 0\.5, where it must be a probability above 0\.5/.test(lowNone.err), lowNone.err)
    const noKey = await run(['--input', INPUT], { root: fixture('no-key', (p) => delete p.promptReviewMatchHeldMinProbability) })
    ok('a policy without a threshold is refused, naming it', noKey.code === 1 && /`promptReviewMatchHeldMinProbability` is undefined/.test(noKey.err), noKey.err)
    const noOption = await run(['--input', INPUT], { root: fixture('no-option', (p) => delete p.promptReviewMatchNoneOption) })
    ok('a policy without the none option is refused, naming it', noOption.code === 1 && /no `promptReviewMatchNoneOption` that is text/.test(noOption.err), noOption.err)
    const noMeans = await run(['--input', INPUT], { root: fixture('no-means', (p) => delete p.promptReviewMatchNoneOptionMeans) })
    ok('a key with no Means is refused, naming the Means', noMeans.code === 1 && /`promptReviewMatchNoneOption` and no `promptReviewMatchNoneOptionMeans`/.test(noMeans.err), noMeans.err)
    ok('the live policy carries every key this command reads, each with its Means', loadPolicy(REPO_ROOT).promptReviewMatchNoneOption === live.promptReviewMatchNoneOption)

    /* The key missing, and a call that fails. */
    for (const env of [{ TYPESAFE_API_KEY: '' }, { TYPESAFE_API_KEY: '   ' }]) {
      const missing = await run(['--input', INPUT], { judge: 'real', env })
      ok(
        `no key (${JSON.stringify(env.TYPESAFE_API_KEY)}): no call, every finding with a held key to the session with no answer, the skip given, exit 0`,
        missing.code === 0 &&
          /TYPESAFE_API_KEY is not set/.test(missing.result?.skip ?? '') &&
          ['same', 'new', 'related'].every((id) => JSON.stringify(of(missing.result, id)?.match) === JSON.stringify({ run: RUN, by: REVIEWER, choice: null, probability: null })) &&
          of(missing.result, 'unheld')?.match.by === NO_HELD_KEY,
        missing.out + missing.err,
      )
    }
    const failing = await run(['--input', INPUT], {
      judge: {
        async choose() {
          throw new Error('503 service unavailable (request req_selftest)')
        },
      },
    })
    ok(
      'a key is set and the call fails: the run FAILS, exit 1, with the SDK error, and prints no match',
      failing.code === 1 && /FAILED: a TypeSafe call failed, so no finding is keyed: 503 service unavailable \(request req_selftest\)/.test(failing.err) && failing.out === '',
      failing.err + failing.out,
    )
    const malformed = await run(['--input', INPUT], { judge: stub([], (q) => ({ choice: NONE, confidence: 1, probabilities: { [NONE]: 1 } })) })
    ok('an answer with a label missing from its probabilities fails the run, naming the label', malformed.code === 1 && /has no probability for "\.claude\/skills\/bead\/SKILL\.md#budget-before-edit"/.test(malformed.err), malformed.err)
    const onlyUnheld = await run(['--input', inputFile('only-unheld', [FINDINGS[3]])], { judge: 'real', env: { TYPESAFE_API_KEY: 'selftest-not-a-key', TYPESAFE_BASE_URL: 'http://127.0.0.1:1' } })
    ok('with no finding to ask about, no judge is made and no call is sent', onlyUnheld.code === 0 && of(onlyUnheld.result, 'unheld')?.match.by === NO_HELD_KEY, onlyUnheld.err)

    /* The tracker. */
    const noExport = await run(['--input', INPUT], { root: fixture('no-export', null, null) })
    ok('an override with no export fails, and never falls back to the live tracker', noExport.code === 1 && /holds no readable export\.jsonl .*never falls back to the live tracker/.test(noExport.err), noExport.err)
    const badExport = fixture('bad-export')
    writeFileSync(join(badExport, OVERRIDE_EXPORT), 'not an issue\n')
    const notJson = await run(['--input', INPUT], { root: badExport })
    ok('an export line that is not JSON fails, naming the line', notJson.code === 1 && /line 1 is not JSON/.test(notJson.err), notJson.err)

    /* The input and the flags. */
    const usage = [
      ['no --input', [], /--input <file> is required/],
      ['an unknown flag', ['--bogus'], /unknown or incomplete flag "--bogus"/],
      ['--input followed by a flag', ['--input', '--dry-run'], /unknown or incomplete flag "--input"/],
      ['two findings with one id', ['--input', inputFile('twice', [FINDINGS[0], FINDINGS[0]])], /findings\[1\] with no id, or an id another finding has/],
      ['a run id holding a space', ['--input', inputFile('space', [{ ...FINDINGS[0], run: 'a b' }])], /with no run id, or one holding a space/],
      ['a file that climbs out', ['--input', inputFile('climb', [{ ...FINDINGS[0], file: '../x.md' }])], /with no repository-relative file/],
      ['a finding with no text', ['--input', inputFile('blank', [{ ...FINDINGS[0], finding: ' ' }])], /with no text/],
      ['an empty list', ['--input', inputFile('empty', [])], /holds no non-empty list `findings`/],
    ]
    for (const [what, argv, reason] of usage) {
      const r = await run(argv)
      ok(`${what} is refused, exit 2, by its reason, before any call`, r.code === 2 && reason.test(r.err) && r.asked.length === 0, r.err)
    }
    const dry = await run(['--input', INPUT, '--dry-run'], { judge: 'real', env: { TYPESAFE_API_KEY: '' } })
    ok(
      '--dry-run lists each finding\'s held keys, with no call',
      dry.code === 0 && JSON.stringify(dry.result?.findings.map((f) => f.options.length)) === JSON.stringify([2, 2, 2, 0]),
      dry.out + dry.err,
    )

    /* As a process. */
    const child = (env) =>
      spawnSync(process.execPath, [SELF, '--input', INPUT], { encoding: 'utf8', timeout: 60_000, env: { ...gitEnv(), [ROOT_ENV]: CONTROL, ...env } })
    const wired = child({ TYPESAFE_API_KEY: 'selftest-not-a-key', TYPESAFE_BASE_URL: 'http://127.0.0.1:1' })
    ok(
      'through the real SDK to a refused connection: the command fails, exit 1, and prints no match',
      wired.status === 1 && /prompt-review:match FAILED: a TypeSafe call failed/.test(wired.stderr) && wired.stdout === '',
      `exit ${wired.status}; ${wired.stderr.split('\n')[0]}`,
    )
    const unset = child({ TYPESAFE_API_KEY: '' })
    ok('as a process with no key: the skip given, exit 0', unset.status === 0 && /TYPESAFE_API_KEY is not set/.test(unset.stdout), `exit ${unset.status}; ${unset.stderr}`)
    const forwarded = spawnSync(process.execPath, [SELF, '--selftest', '--bogus'], { encoding: 'utf8', timeout: 60_000, env: gitEnv() })
    ok('`--selftest` with another flag is a usage error, and does not start a selftest', forwarded.status === 2, `exit ${forwarded.status}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(`\nprompt-review match selftest: ${checks - failures}/${checks} checks hold.`)
  return failures ? 1 : 0
}

/** Whether this file is the one node was asked to run, through a symbolic link too, as macOS's temporary directory is. */
const isEntry = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === realpathSync(SELF)
  } catch {
    return false
  }
}

if (isEntry()) {
  const argv = process.argv.slice(2)
  if (argv.includes('--selftest')) {
    if (argv.length !== 1) {
      console.error(`${NAME}: --selftest takes no other flag`)
      process.exitCode = 2
    } else process.exitCode = await selftest()
  } else process.exitCode = await main(argv)
}
