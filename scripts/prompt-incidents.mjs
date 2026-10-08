/**
 * `mise run prompts:incidents` -- does a paragraph of a prompt tell an incident that nothing marks,
 * with no date, tracker id, pull request number or run id in it? An ADVISORY command: it prints
 * findings for a person to read and refuses nothing.
 *
 * WHAT IT DOES. Code reads every prompt `scripts/check-prompts.mjs` holds to a word budget, through
 * that gate's `promptLines`: a markdown prompt line by line, frontmatter included, and a workflow or,
 * since `docs/decisions.md` § D-59, a hook only in its string and template literals. A paragraph is a
 * run of non-blank lines, a workflow's or a hook's within one literal. A paragraph with a line `node scripts/check-prompts.mjs --incidents` lists is left to
 * that list, which names it already, and one of fewer than `promptIncidentMinWords` words is not
 * judged. For each prompt, ONE request asks TypeSafe one Noul per paragraph left, over a state that
 * holds the prompt's path and those paragraphs keyed by their first line: does this paragraph tell a
 * particular past event, dated or not, rather than only the rule it motivates? A paragraph whose
 * probability of yes is at or above `promptIncidentMinProbability` is printed as
 * `  <path>:<line>  undated: P(incident) <p>`, the form `--incidents` prints its rows in with
 * `dated:`, so the two read as one list: this command is its undated half.
 *
 * THE FAILURE IT EXISTS TO PREVENT. CLAUDE.md § Standing rules for prompts and gates says a prompt
 * carries no incident, which belongs in the description of the pull request that adds or changes the
 * rule, and a regular expression finds only the dated ones: in the 2026-09-29 experiment in the notes
 * of asdlc-openspec-6yt.5, one over dates, `#N` and issue ids found the 10 dated incidents planted in
 * real prompt paragraphs and none of the 10 undated, where a TypeSafe Noul found all 20. No undated
 * incident is known to have reached a prompt since the rule, so this is a guard against a return.
 * Were it wrong, it would let through an incident told in fewer than `promptIncidentMinWords` words,
 * or cut that short by a template literal's substitutions, and one the model reads as a rule; and it
 * would send a person to read a rule worded as a worked example. The wrong fixes, refused in the
 * shape of asdlc-openspec-6yt.5 on 2026-10-05: a numeral judgment for count keys and a which-wins
 * judgment, each dropped with its reason in that issue's description.
 *
 * WHY IT IS NOT A GATE. It reads `TYPESAFE_API_KEY` and the network, so it runs in neither pre-push
 * nor `.github/workflows/verify.yml`, and never inside a workflow script, which has no Node.js API to
 * read the key with (`CLAUDE.md` § The gate ladder; the maintainer's answer of 2026-10-05 on
 * asdlc-openspec-6yt). Its selftest, `mise run prompts:incidents:selftest`, runs in both over a stubbed
 * judge. A finding only ever sends a person to read a paragraph; it never refuses, and it changes no
 * file (`CLAUDE.md` § A program proposes; only a person promotes).
 *
 * WHERE IT LOSES. A rule worded as a worked example ("a session that pushes before it rebases ...")
 * reads like an incident, and a person reads a false finding. The threshold was set from an
 * experiment that asked of one paragraph at a time in its own wording, where this command asks of a
 * whole prompt's paragraphs in one request in its own, and judged no workflow literal, so its
 * `Means` asks for it to be measured again on the real data. A judgment is a probability, so a
 * finding is read and a silence is not proof.
 *
 *   mise run prompts:incidents                    every prompt
 *   mise run prompts:incidents --file <path>      only that prompt, by the repository-relative path
 *                                                 `node scripts/check-prompts.mjs --counts` prints
 *                                                 (repeatable), as a session checks what it changed
 *   mise run prompts:incidents --dry-run          count what would be judged; no key, no call
 *   mise run prompts:incidents:selftest           the selftest; `node scripts/prompt-incidents.mjs --selftest`
 *   PROMPTS_CHECK_ROOT=<dir> mise run prompts:incidents   the same run over a doctored copy, the
 *                                                 root `scripts/check-prompts.mjs` reads too
 *
 * Exit 0 with or without findings, and 0 when `TYPESAFE_API_KEY` is not set, saying why; 1 when the
 * key is set and a call fails or gives no probability for a paragraph, or the policy is wrong; 2 on a
 * bad flag. Its constants are `typesafeModel` and `promptIncident*` in
 * `tools/policy/tool-settings.json`, each with a `Means`, read through `tools/lib/policy.ts`, and the
 * tracker id's shape `--incidents` reads.
 *
 * NEEDS `TYPESAFE_API_KEY` and the network to judge, through `noul` in `tools/lib/typesafe.ts`, and
 * `npm ci` for the SDK it loads. One request per prompt, sent one after another, so a failure stops
 * the run at the prompt it names. Without the key it needs neither, and makes no call.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { POLICY_DIR, readPolicy } from '../tools/lib/policy.ts'
import { createJudge } from '../tools/lib/typesafe.ts'
import { budgeted, incidentMarker, incidentReport, incidentRow, listIncidents, promptLines } from './check-prompts.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.PROMPTS_CHECK_ROOT ?? REPO_ROOT
const NAME = 'prompts:incidents'
/** The record that holds this command's keys, named in a refusal. */
const POLICY_FILE = 'tools/policy/tool-settings.json'
const RULE_HOME = 'CLAUDE.md § Standing rules for prompts and gates'

/** The keys this command reads, each with a `<key>Means` sibling, and the shape each must have. */
const POLICY_KEYS = [
  { key: 'typesafeModel', ok: (v) => typeof v === 'string' && v !== '', shape: 'a model name' },
  { key: 'promptIncidentMinProbability', ok: (v) => typeof v === 'number' && v >= 0 && v <= 1, shape: 'a probability from 0 to 1' },
  { key: 'promptIncidentMinWords', ok: (v) => Number.isInteger(v) && v >= 1, shape: 'a whole number of words of at least 1' },
]

/** This command's keys from the policy under `root`, or a thrown error naming the key that is missing or wrong. */
export function loadPolicy(root) {
  let raw
  try {
    raw = readPolicy(root)
  } catch (error) {
    throw new Error(`${POLICY_DIR}/ cannot be read: ${error.message}`)
  }
  for (const { key, ok, shape } of POLICY_KEYS) {
    if (!ok(raw[key])) throw new Error(`${POLICY_FILE} has no usable \`${key}\`, ${shape}: ${JSON.stringify(raw[key]) ?? 'missing'}`)
    if (typeof raw[`${key}Means`] !== 'string') throw new Error(`${POLICY_FILE} has \`${key}\` and no \`${key}Means\` saying what it decides.`)
  }
  return { model: raw.typesafeModel, min: raw.promptIncidentMinProbability, minWords: raw.promptIncidentMinWords }
}

const words = (text) => text.split(/\s+/).filter(Boolean).length

/** The paragraphs of the prompt at `path`, each `{ line, lines }`: a run of non-blank lines, a workflow's within one literal. */
export function paragraphs(root, path) {
  const found = []
  let current = null
  for (const { line, text, literal } of promptLines(root, path)) {
    if (text.trim() === '') {
      current = null
      continue
    }
    if (current === null || current.literal !== literal) {
      current = { line, literal, lines: [] }
      found.push(current)
    }
    current.lines.push(text)
  }
  return found.map(({ line, lines }) => ({ line, lines }))
}

/**
 * Every paragraph worth judging, by prompt: `{ prompts: [{ path, units: [{ key, line, text }] }] }`,
 * with the count of paragraphs left to `--incidents` (`dated`) and of those too short (`small`), and
 * why the tracker id's shape could not be read, or null. A unit's key names it in the state; two on
 * one source line take a suffix.
 */
export function collect(root, policy, only = []) {
  const { marker, unreadable } = incidentMarker(root)
  const prompts = []
  let dated = 0
  let small = 0
  let judged = 0
  for (const path of budgeted(root)) {
    if (only.length > 0 && !only.includes(path)) continue
    const units = []
    const taken = new Set()
    for (const { line, lines } of paragraphs(root, path)) {
      if (lines.some((text) => text.match(marker) !== null)) {
        dated++
        continue
      }
      const text = lines.join('\n')
      if (words(text) < policy.minWords) {
        small++
        continue
      }
      let key = `L${line}`
      for (let n = 2; taken.has(key); n++) key = `L${line}_${n}`
      taken.add(key)
      units.push({ key, line, text })
    }
    judged += units.length
    prompts.push({ path, units })
  }
  return { prompts, dated, small, judged, unreadable }
}

/** The question asked of one paragraph. A question's name never reaches the model, so it names the paragraph's place in the state. */
export const question = (key) =>
  `Does the paragraph at \`paragraphs.${key}\` tell of an incident: a particular past event, such as` +
  ' something one run, session, review or pull request did, found or got wrong, whether or not it is' +
  ' dated? Answer no when it only states a rule, a step or a definition, or states in general terms' +
  ' the failure a rule prevents, a general example of the kind of case a rule covers included.'

/**
 * Judge every unit, one request per prompt, one after another. The first error stops the run and
 * rejects with it, as does an answer with no probability for a paragraph: a failed call is a
 * failure, never a paragraph left unjudged in silence.
 */
export async function judgeAll(collected, judge, policy) {
  const findings = []
  for (const { path, units } of collected.prompts) {
    if (units.length === 0) continue
    const answers = await judge.noul({
      state: { prompt: path, paragraphs: Object.fromEntries(units.map((u) => [u.key, u.text])) },
      questions: Object.fromEntries(units.map((u) => [u.key, question(u.key)])),
    })
    for (const { key, line } of units) {
      const p = answers?.[key]
      if (typeof p !== 'number' || !(p >= 0 && p <= 1)) {
        throw new Error(`the answer for ${path}:${line} (${key}) is no probability from 0 to 1: ${JSON.stringify(p) ?? 'missing'}`)
      }
      if (p >= policy.min) findings.push({ path, line, p })
    }
  }
  return findings
}

/** The report: counts, never a rate, and each row in the form `--incidents` prints its own. */
export function report(collected, findings, policy) {
  const lines = []
  if (collected.unreadable !== null) {
    lines.push(`${NAME}: ${POLICY_DIR}/ gives no tracker id's shape (${collected.unreadable}), so a paragraph holding one is judged here and not left to \`--incidents\`.`)
  }
  const held = new Set(findings.map((f) => f.path)).size
  lines.push(
    `${NAME}: ${findings.length} paragraph(s) in ${held} of ${collected.prompts.length} prompt(s) tell an incident with no date, ` +
      `tracker id, pull request number or workflow run id to mark it, at P(incident) >= ${policy.min}, of ${collected.judged} judged; ` +
      `${collected.dated} holding such a mark are left to \`node scripts/check-prompts.mjs --incidents\`, and ${collected.small} ` +
      `under ${policy.minWords} words are not judged. It refuses nothing.`,
  )
  if (findings.length > 0) lines.push('')
  for (const { path, line, p } of findings) lines.push(incidentRow(path, line, `undated: P(incident) ${p.toFixed(2)}`))
  lines.push(
    '',
    `Advisory: each row is a probability for a person to read. A rule worded as a worked example reads as an incident and is noise; ${RULE_HOME} says where an incident goes.`,
  )
  return lines.join('\n')
}

/** The command, with its dependencies handed in so the selftest can run it whole over a stub. */
export async function main(argv, deps = {}) {
  const env = deps.env ?? process.env
  const out = deps.out ?? ((text) => console.log(text))
  const err = deps.err ?? ((text) => console.error(text))
  const makeJudge = deps.makeJudge ?? createJudge
  const root = deps.root ?? ROOT

  const only = []
  let dryRun = false
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--file' && argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) only.push(argv[++i])
    else {
      err(`${NAME}: unknown or incomplete flag ${JSON.stringify(arg)}. See the header of scripts/prompt-incidents.mjs.`)
      return 2
    }
  }
  const prompts = new Set(budgeted(root))
  for (const path of only) {
    if (!prompts.has(path)) {
      err(`${NAME}: --file ${JSON.stringify(path)} names no prompt. Give its repository-relative path, as \`node scripts/check-prompts.mjs --counts\` prints it.`)
      return 2
    }
  }

  let policy
  try {
    policy = loadPolicy(root)
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  const collected = collect(root, policy, only)
  if (dryRun) {
    const requests = collected.prompts.filter((p) => p.units.length > 0).length
    out(
      `${NAME} --dry-run: ${collected.judged} paragraph(s) across ${collected.prompts.length} prompt(s) would be judged, in ` +
        `${requests} request(s); ${collected.dated} holding a mark are left to \`--incidents\`, and ${collected.small} under ` +
        `${policy.minWords} words would not be judged. No call was made.`,
    )
    return 0
  }

  let made
  try {
    made = await makeJudge({ env, model: policy.model })
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  if ('skip' in made) {
    out(`${NAME}: ${made.skip}`)
    return 0
  }
  let findings
  try {
    findings = await judgeAll(collected, made.judge, policy)
  } catch (error) {
    err(`${NAME} FAILED: a TypeSafe call failed, so no verdict is reported: ${error.message}`)
    return 1
  }
  out(report(collected, findings, policy))
  return 0
}

/* --------------------------------------------------------------------------------- selftest ----- */

const SKILL = '.claude/skills/alpha/SKILL.md'
const WORKFLOW = '.claude/workflows/delta.js'
/** The fixture's rules, named so no row below spells a line pointer the citations gate would resolve in this checkout. */
const RULES = 'CLAUDE.md'

/** A fixture whose answers are known by construction: the stub says yes by what a paragraph holds. */
const FIXTURE = {
  'CLAUDE.md': ['# Rules', '', 'A prompt carries no incident; its pull request does.', '', 'Since fixture-44p no prompt has carried a dated one.', ''].join('\n'),
  [SKILL]: [
    '---',
    'name: alpha',
    'description: a fixture skill for the stub',
    '---',
    '',
    'Read the rules first. Everything below is subordinate to them.',
    '',
    'Push only once the gates pass: a push before them fails in CI.',
    '',
    'The run pushed before its gates had passed, and failed in CI twice.',
    '',
    'On 2026-09-23 a session skipped the gates and nothing refused it.',
    '',
    '## Steps',
    '',
    'This paragraph sits AT THE LINE for the stub.',
    '',
    'This paragraph sits UNDER THE LINE for the stub.',
    '',
  ].join('\n'),
  [WORKFLOW]: [
    "export const meta = { name: 'delta', description: 'A fixture workflow for the stub' }",
    '/*',
    ' * Header: on 2026-09-28 run wf_5aec3e94-07b refused a report (fixture-44p), and the agent pushed before its gates had passed.',
    ' */',
    "const RULE = 'Report what the agent did, then stop.'",
    'function prompt(task) {',
    '  return `Work on ${task.id} in the worktree.',
    '',
    'The last review agent pushed before its gates had passed.`',
    '}',
    '',
  ].join('\n'),
}

const FIXTURE_POLICY = {
  describes: 'A fixture policy.',
  typesafeModel: 'jev-selftest',
  typesafeModelMeans: 'The fixture model.',
  promptIncidentMinProbability: 0.5,
  promptIncidentMinProbabilityMeans: 'The fixture threshold.',
  promptIncidentMinWords: 4,
  promptIncidentMinWordsMeans: 'The fixture minimum.',
  prReviewIssuePattern: 'fixture-[a-z0-9]+(?:\\.[0-9]+)*',
  prReviewIssuePatternMeans: "The fixture tracker's shape.",
}

/** The probability the stub gives a paragraph, by what it holds. */
const decide = (text) =>
  text.includes('pushed before its gates') ? 0.93 : text.includes('AT THE LINE') ? 0.5 : text.includes('UNDER THE LINE') ? 0.49 : 0.05

const CONTROL_ROWS = [
  `  ${SKILL}:10  undated: P(incident) 0.93`,
  `  ${SKILL}:16  undated: P(incident) 0.50`,
  `  ${WORKFLOW}:9  undated: P(incident) 0.93`,
]

/** One row of either half, `--incidents`'s or this command's. */
const ROW = /^ {2}(\S+):(\d+) {2}(dated|undated): \S.*$/

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
  console.log('prompt incidents selftest\n')

  const base = mkdtempSync(join(tmpdir(), 'prompt-incidents-'))
  try {
    /** A fixture tree under `base`, its policy doctored by `edit` and its files by `files`; its root. */
    let made = 0
    const tree = (edit = () => {}, files = {}) => {
      const root = join(base, `tree-${++made}`)
      const policy = structuredClone(FIXTURE_POLICY)
      edit(policy)
      for (const [path, text] of Object.entries({ ...FIXTURE, ...files, 'tools/policy/settings.json': `${JSON.stringify(policy, null, 2)}\n` })) {
        mkdirSync(dirname(join(root, path)), { recursive: true })
        writeFileSync(join(root, path), text)
      }
      return root
    }
    const CONTROL = tree()

    const stub = (asked, answer = (state, questions) => Object.fromEntries(Object.keys(questions).map((k) => [k, decide(state.paragraphs[k])]))) => ({
      async noul({ state, questions }) {
        asked.push({ state, questions })
        return answer(state, questions)
      },
    })
    const run = async (argv, { root = CONTROL, judge, env = { TYPESAFE_API_KEY: 'selftest-not-a-key' } } = {}) => {
      const asked = []
      const out = []
      const err = []
      const used = judge === undefined ? stub(asked) : judge
      const code = await main(argv, {
        env,
        root,
        out: (t) => out.push(t),
        err: (t) => err.push(t),
        ...(used === 'real' ? {} : { makeJudge: async () => ({ judge: used }) }),
      })
      return { code, out: out.join('\n'), err: err.join('\n'), asked }
    }
    const rowsOf = (text) => text.split('\n').filter((line) => line.startsWith('  '))
    const sent = (r) => r.asked.flatMap((a) => Object.values(a.state.paragraphs))

    /* 1. The control: each outcome, and what is left out ------------------------------------- */

    const control = await run([])
    ok('control: the undoctored tree runs to a report, exit 0', control.code === 0 && control.err === '', control.err)
    ok('the paragraphs at or above the threshold are listed, by their first line, and no others', JSON.stringify(rowsOf(control.out)) === JSON.stringify(CONTROL_ROWS), JSON.stringify(rowsOf(control.out)))
    ok(
      'the report counts what it listed, judged, left to --incidents and did not judge',
      /^prompts:incidents: 3 paragraph\(s\) in 2 of 3 prompt\(s\) tell an incident with no date, tracker id, pull request number or workflow run id to mark it, at P\(incident\) >= 0\.5, of 10 judged; 2 holding such a mark are left to `node scripts\/check-prompts\.mjs --incidents`, and 5 under 4 words are not judged\. It refuses nothing\.$/m.test(control.out),
      control.out.split('\n')[0],
    )
    ok('a paragraph exactly AT the threshold is listed, and one a hair under it is not: the threshold is inclusive', control.out.includes(`${SKILL}:16 `) && !control.out.includes(`${SKILL}:18 `))
    ok('a paragraph that states only a rule is not listed', !control.out.includes(`${SKILL}:8 `))
    ok('the report says it is advisory, and where an incident goes', /Advisory: each row is a probability for a person to read/.test(control.out) && control.out.includes(RULE_HOME))

    /* 2. What the judge is sent ---------------------------------------------------------------- */

    ok('one request per prompt with a paragraph to judge, in code-point order of path', JSON.stringify(control.asked.map((a) => a.state.prompt)) === JSON.stringify([SKILL, WORKFLOW, 'CLAUDE.md']), JSON.stringify(control.asked.map((a) => a.state.prompt)))
    ok(
      'each question names its own paragraph by its path in the state, and every paragraph sent has one',
      control.asked.every((a) => JSON.stringify(Object.keys(a.questions)) === JSON.stringify(Object.keys(a.state.paragraphs)) && Object.keys(a.questions).every((k) => a.questions[k] === question(k) && a.questions[k].includes(`\`paragraphs.${k}\``))),
      JSON.stringify(control.asked.map((a) => Object.keys(a.questions))),
    )
    ok('a paragraph is keyed by its first line, and sent whole', control.asked[0]?.state.paragraphs.L10 === 'The run pushed before its gates had passed, and failed in CI twice.', JSON.stringify(control.asked[0]?.state.paragraphs))
    ok('a paragraph holding a date or a tracker id is left to --incidents and never sent', !sent(control).some((t) => t.includes('2026-09-23') || t.includes('fixture-44p')))
    ok('a paragraph under the fewest words is never sent: a heading, a one-word literal', !sent(control).some((t) => t === '## Steps' || t === 'delta' || t === '# Rules'))
    ok("a workflow's header comment is never sent, though it tells an incident", !sent(control).some((t) => t.includes('Header:') || t.includes('wf_5aec3e94-07b')))
    ok("a workflow's literal is split at its blank line, and its paragraph keeps the source line it opens on", control.asked[1]?.state.paragraphs.L9 === 'The last review agent pushed before its gates had passed.', JSON.stringify(control.asked[1]?.state.paragraphs))
    const twice = await run(['--file', WORKFLOW], {
      root: tree(() => {}, { [WORKFLOW]: FIXTURE[WORKFLOW].replace("const RULE = 'Report what the agent did, then stop.'", "const RULE = 'Report what the agent did, ' + 'pushed before its gates had passed.'") }),
    })
    ok(
      'two paragraphs on one source line are both sent, under two keys, and each is listed by that line',
      JSON.stringify(Object.keys(twice.asked[0]?.state.paragraphs ?? {})) === JSON.stringify(['L1', 'L5', 'L5_2', 'L9']) &&
        JSON.stringify(rowsOf(twice.out)) === JSON.stringify([`  ${WORKFLOW}:5  undated: P(incident) 0.93`, `  ${WORKFLOW}:9  undated: P(incident) 0.93`]),
      `${JSON.stringify(Object.keys(twice.asked[0]?.state.paragraphs ?? {}))} ${JSON.stringify(rowsOf(twice.out))}`,
    )
    const three = await run([], { root: tree((p) => (p.promptIncidentMinWords = 3)) })
    ok(
      'the fewest words is the least a paragraph sent holds: at 3, the three-word stretch of a template literal is sent, the heading of two still not',
      sent(three).includes(' in the worktree.') && !sent(three).includes('## Steps') && /of 11 judged/.test(three.out),
      `${JSON.stringify(sent(three))} ${three.out.split('\n')[0]}`,
    )

    /* 3. The form both halves print, and what each leaves to the other ------------------------- */

    const dated = rowsOf(incidentReport(listIncidents(CONTROL)))
    ok('--incidents over the same tree lists the paragraphs this command left to it, by their lines', JSON.stringify(dated) === JSON.stringify([`  ${SKILL}:12  dated: 2026-09-23`, `  ${RULES}:5  dated: fixture-44p`]), JSON.stringify(dated))
    ok('every row of either half has one form, path:line, dated or undated, and what marked it', [...dated, ...rowsOf(control.out)].every((row) => ROW.test(row)))
    ok('the two halves name no line twice', new Set([...dated, ...rowsOf(control.out)].map((row) => ROW.exec(row)?.slice(1, 3).join(':'))).size === dated.length + CONTROL_ROWS.length)
    const noShape = await run([], { root: tree((p) => delete p.prReviewIssuePattern) })
    ok(
      "with no tracker id's shape, the report says so first, and the paragraph holding one is judged here",
      /^prompts:incidents: tools\/policy\/ gives no tracker id's shape \(`prReviewIssuePattern` is missing\), so a paragraph holding one is judged here and not left to `--incidents`\.$/m.test(noShape.out.split('\n')[0]) &&
        sent(noShape).includes('Since fixture-44p no prompt has carried a dated one.'),
      noShape.out.split('\n')[0],
    )

    /* 4. The ways a run ends without a judgment ------------------------------------------------- */

    for (const env of [{}, { TYPESAFE_API_KEY: '' }, { TYPESAFE_API_KEY: '   ' }]) {
      const offline = await run([], { judge: 'real', env })
      ok(`no key (${JSON.stringify(env)}): says why, lists nothing and exits 0`, offline.code === 0 && /^prompts:incidents: TYPESAFE_API_KEY is not set, so no TypeSafe call was made/.test(offline.out) && rowsOf(offline.out).length === 0 && offline.err === '', offline.out + offline.err)
    }
    const failing = await run([], {
      judge: {
        async noul() {
          throw new Error('503 service unavailable (request req_selftest)')
        },
      },
    })
    ok(
      'a key is present and the call fails: the run FAILS, exit 1, with the SDK error in the message, and prints no report',
      failing.code === 1 && /^prompts:incidents FAILED: a TypeSafe call failed, so no verdict is reported: 503 service unavailable \(request req_selftest\)$/.test(failing.err) && failing.out === '',
      failing.err + failing.out,
    )
    const missing = await run([], { judge: stub([], (state, questions) => Object.fromEntries(Object.keys(questions).filter((k) => k !== 'L10').map((k) => [k, 0.1]))) })
    ok('an answer with no probability for a paragraph fails the run and names the paragraph', missing.code === 1 && /the answer for \.claude\/skills\/alpha\/SKILL\.md:10 \(L10\) is no probability from 0 to 1: missing/.test(missing.err) && missing.out === '', missing.err)
    const outside = await run([], { judge: stub([], (state, questions) => Object.fromEntries(Object.keys(questions).map((k) => [k, 1.5]))) })
    ok('an answer outside 0 to 1 fails the run and names the paragraph', outside.code === 1 && /is no probability from 0 to 1: 1\.5/.test(outside.err), outside.err)

    /* 5. The policy, one break per copy --------------------------------------------------------- */

    const broken = [
      ['the threshold missing', (p) => delete p.promptIncidentMinProbability, /has no usable `promptIncidentMinProbability`, a probability from 0 to 1: missing/],
      ["the threshold's Means missing", (p) => delete p.promptIncidentMinProbabilityMeans, /has `promptIncidentMinProbability` and no `promptIncidentMinProbabilityMeans`/],
      ['a threshold over 1', (p) => (p.promptIncidentMinProbability = 1.5), /has no usable `promptIncidentMinProbability`, a probability from 0 to 1: 1\.5/],
      ['the fewest words missing', (p) => delete p.promptIncidentMinWords, /has no usable `promptIncidentMinWords`, a whole number of words of at least 1: missing/],
      ['the fewest words not whole', (p) => (p.promptIncidentMinWords = 2.5), /has no usable `promptIncidentMinWords`, a whole number of words of at least 1: 2\.5/],
      ['the fewest words zero', (p) => (p.promptIncidentMinWords = 0), /has no usable `promptIncidentMinWords`, a whole number of words of at least 1: 0/],
      ["the model's Means missing", (p) => delete p.typesafeModelMeans, /has `typesafeModel` and no `typesafeModelMeans`/],
    ]
    for (const [what, edit, reason] of broken) {
      const r = await run([], { root: tree(edit), judge: 'real', env: {} })
      ok(`${what}: the run fails, exit 1, naming it, even with no key`, r.code === 1 && reason.test(r.err) && r.out === '', r.err + r.out)
    }
    let live
    try {
      live = loadPolicy(REPO_ROOT)
    } catch (error) {
      live = error
    }
    ok('the live policy carries every key this command reads, each with its Means', !(live instanceof Error), String(live?.message))

    /* 6. The flags ------------------------------------------------------------------------------ */

    const one = await run(['--file', WORKFLOW])
    ok('--file limits the run to that prompt: one request, its rows alone', one.code === 0 && one.asked.length === 1 && JSON.stringify(rowsOf(one.out)) === JSON.stringify([CONTROL_ROWS[2]]), JSON.stringify(rowsOf(one.out)))
    const nowhere = await run(['--file', 'docs/nothing.md'])
    ok('--file naming no prompt is refused with its reason, exit 2, before any call', nowhere.code === 2 && /--file "docs\/nothing\.md" names no prompt/.test(nowhere.err) && nowhere.asked.length === 0, nowhere.err)
    const bare = await run(['--file'])
    ok('--file with nothing after it is refused, exit 2', bare.code === 2 && /unknown or incomplete flag "--file"/.test(bare.err), bare.err)
    const flagged = await run(['--file', '--dry-run'])
    ok('--file followed by a flag is refused, not read as a path, exit 2', flagged.code === 2 && /unknown or incomplete flag "--file"/.test(flagged.err), flagged.err)
    const bogus = await run(['--bogus'])
    ok('an unknown flag is refused, exit 2', bogus.code === 2 && /unknown or incomplete flag "--bogus"/.test(bogus.err), bogus.err)
    const dry = await run(['--dry-run'], { judge: 'real', env: {} })
    ok(
      '--dry-run counts what would be judged, with no key and no call',
      dry.code === 0 && /^prompts:incidents --dry-run: 10 paragraph\(s\) across 3 prompt\(s\) would be judged, in 3 request\(s\); 2 holding a mark are left to `--incidents`, and 5 under 4 words would not be judged\. No call was made\.$/.test(dry.out),
      dry.out + dry.err,
    )

    /* 7. As a process: the root override, the entry point, and the real SDK --------------------- */

    const self = fileURLToPath(import.meta.url)
    const child = (args, extra) =>
      spawnSync(process.execPath, [self, ...args], {
        env: { ...process.env, PROMPTS_CHECK_ROOT: CONTROL, TYPESAFE_API_KEY: '', TYPESAFE_BASE_URL: '', ...extra },
        encoding: 'utf8',
        timeout: 60_000,
      })
    const counted = child(['--dry-run'], {})
    ok('as a process, PROMPTS_CHECK_ROOT points it at a doctored copy', counted.status === 0 && /10 paragraph\(s\) across 3 prompt\(s\) would be judged/.test(counted.stdout), `exit ${counted.status}; ${counted.stdout}${counted.stderr}`)
    const unset = child([], {})
    ok('as a process with no key: prints why, and exits 0', unset.status === 0 && /TYPESAFE_API_KEY is not set/.test(unset.stdout), `exit ${unset.status}; ${unset.stdout}${unset.stderr}`)
    const wired = child([], { TYPESAFE_API_KEY: 'selftest-not-a-key', TYPESAFE_BASE_URL: 'http://127.0.0.1:1' })
    ok(
      'with a key, through the shared client to a refused connection: the command fails, exit 1, and does not skip',
      wired.status === 1 && /^prompts:incidents FAILED: a TypeSafe call failed, so no verdict is reported: /.test(wired.stderr) && !/not set/.test(wired.stdout),
      `exit ${wired.status}; ${wired.stderr.split('\n')[0]}`,
    )
    console.log(`         its reason: ${wired.stderr.split('\n')[0]}`)
    const forwarded = child(['--selftest', '--bogus'], {})
    ok('`--selftest` with another flag is a usage error, and does not start a selftest', forwarded.status === 2, `exit ${forwarded.status}`)
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  console.log(`\n${checks} checks, ${failures} failed`)
  return failures === 0 ? 0 : 1
}

// Run only as the entry point, compared by real path, as `scripts/check-prompts.mjs` is.
const entry = process.argv[1] === undefined ? null : realpathSync(resolve(process.argv[1]))
if (entry !== null && realpathSync(fileURLToPath(import.meta.url)) === entry) {
  const args = process.argv.slice(2)
  process.exitCode = args.length === 1 && args[0] === '--selftest' ? await selftest() : await main(args)
}
