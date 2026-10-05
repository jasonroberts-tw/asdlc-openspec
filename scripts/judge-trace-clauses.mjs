/**
 * Judges, with TypeSafe, each outcome clause of every scenario a change's trace says its tests
 * exercise, and writes the answers for the trace workflow's clause run, `.scratch/<change>-clauses.json`.
 *
 * WHAT IT DOES. It reads the result `.claude/workflows/verify-change-trace.js` returned, saved as
 * `.scratch/<change>-trace.json`, once it stopped `no-gap`. For each row whose tracer marked
 * `exercises: true` and whose proof names tests, code reads the row's scenario from the change's delta
 * spec at the trace's commit and splits it into its clauses: those before its first THEN, which set it
 * up, and the THEN and each AND or BUT after it, the outcomes. It takes each test's body from its file
 * at that commit, found by name through `scripts/test-trace.mjs`, and every declaration outside a test
 * body that the bodies use, followed through the declarations they use, with the comment above each.
 * Then it asks TypeSafe one Noul per outcome, a row's outcomes in one request and every row's request at
 * once: do these tests set up what the scenario's first clauses describe and then assert this
 * outcome, with every value it states? It writes each outcome's probability of yes, row by row, with
 * the model that gave it, and decides nothing (`docs/decisions.md` § D-42).
 *
 * WHAT THE SESSION DOES NEXT (`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced).
 * Once it has written the file, the session runs the trace workflow again, its clause run, with every
 * argument the first run had, this file as `clauses` and the saved trace as `first`; saves what that
 * returns over `.scratch/<change>-trace.json`; and only then has `scripts/render-trace.mjs` write the
 * trace. The clause run sends each row with an outcome under `verifyTraceClauseThreshold` to the
 * skeptics as an `unasserted` gap, and runs no other agent. No answer ever sets `exercises` or clears
 * a gap. With no key there is no file and no clause run, and the trace says no clause was checked; a
 * failed call stops verification there, for the session to report.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: until it, a tracer's `exercises: true` reached
 * the pull request's body unjudged, since the workflow makes a gap only of `false` and
 * `prBodyProblems` in `scripts/lib/trace.mjs` trusts `true` (asdlc-openspec-6yt.3). Were this wrong,
 * it would let through a test that asserts none of its THEN, or another value than the spec writes
 * out, standing as its scenario's proof: by a row or an outcome it never asked about, a test body cut
 * short or run on into the next, or a failed call read as no doubt, which would print a clean summary
 * over a run that judged nothing. So a missing key skips, saying why, and once a key is set a failed
 * call fails (`tools/lib/typesafe.ts`). The definitions are in the state because a run on 2026-09-29
 * that described the helpers in one line gave its lowest scores to sound tests whose values a constant
 * and a helper outside the body held (the issue's notes). Measured with them on 2026-10-05, over the
 * 78 outcome clauses of the 60 living scenarios with a happy test, one sound clause fell under the
 * threshold and 180 of 188 mutations did; `verifyTraceClauseThresholdMeans` in
 * `tools/policy/agent-workflows.json` holds the figures.
 *
 * INVOCATION, from the change's worktree, once the session has saved the trace:
 *
 *   mise run trace:clauses <change>       reads .scratch/<change>-trace.json and writes
 *                                         .scratch/<change>-clauses.json
 *   node scripts/judge-trace-clauses.mjs <change> --result <file> --out <file>
 *   mise run trace:clauses:selftest       the selftest, `--selftest`: a fixture repository and a
 *                                         stubbed judge, and once the real SDK against a refused
 *                                         loopback connection
 *
 * Paths are relative to the checkout; `TRACE_ROOT` names another root, a doctored copy that is a git
 * repository holding the trace's commit, for a run by hand. It exits 0 when it wrote the answers, and
 * when `TYPESAFE_API_KEY` is not set: it says why, writes nothing, and the trace stands as its tracers
 * read it. It exits 1 when it refused, naming each reason, or when a call failed, and 2 on a usage
 * error. It refuses a trace that did not stop `no-gap`, one that is a clause run's result already, a
 * scenario its delta spec does not hold at the commit, and a test its file does not hold there. Not an
 * emitter or a gate: it writes only under `.scratch/`, and reads a token and the network.
 *
 * WHERE IT LOSES. An outcome asserted by a helper imported from another file, or by code no
 * declaration holds, reads as unasserted: the model sees the import line and not the helper, and the
 * row costs one skeptic round. Every row's request is sent at once, with no bound: 164 requests sent
 * so on 2026-09-29 took 1,106 ms. A scenario with no THEN, and a row whose proof names no test, a gate,
 * a check or a manual proof, are not judged, and the file lists each with why.
 *
 * NEEDS git, to read the delta specs and the tests at the trace's commit; `TYPESAFE_API_KEY` and the
 * network to judge, through `tools/lib/typesafe.ts` with `npm ci` for the SDK; and the policy's
 * `verifyTraceClauseThreshold`, `typesafeModel` and the keys `scripts/test-trace.mjs` reads. No job
 * runs it; its selftest runs at pre-push and in CI and needs no key.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv, gitIn, SCRATCH_GIT_ENV } from '../tools/lib/git-env.ts'
import { copyPolicy, editPolicy, POLICY_DIR, readPolicy } from '../tools/lib/policy.ts'
import { createJudge } from '../tools/lib/typesafe.ts'
import { parseResult, specsDir, splitId } from './lib/trace.mjs'
import { readTests, tracePolicy } from './test-trace.mjs'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const NAME = 'judge-trace-clauses'
export const THRESHOLD_KEY = 'verifyTraceClauseThreshold'
const MODEL_KEY = 'typesafeModel'

/**
 * What each outcome's Noul asks, its clause after it. Asking whether the tests set up what `given`
 * describes caught 75 of 78 outcomes paired with the next scenario's test on 2026-10-05, where the
 * same question without it caught 62, many of those scenarios sharing a THEN (`Error`).
 */
const QUESTION = 'Do the tests in the state, read with the definitions given, set up what `given` describes and then assert this outcome, with every value it states?'

/* --------------------------------------------------------------------------------- policy ------- */

/** The threshold, the model and the test reader's keys, from the merged policy; or a thrown Error naming the key. */
export function clausePolicy(policy) {
  const threshold = policy[THRESHOLD_KEY]
  if (typeof threshold !== 'number' || !(threshold > 0 && threshold <= 1)) {
    throw new Error(`${POLICY_DIR}/ has no probability above 0 and at most 1 under \`${THRESHOLD_KEY}\`: ${JSON.stringify(threshold)}`)
  }
  const model = policy[MODEL_KEY]
  if (typeof model !== 'string' || !model) throw new Error(`${POLICY_DIR}/ has no model under \`${MODEL_KEY}\`: ${JSON.stringify(model)}`)
  return { threshold, model, trace: tracePolicy(policy) }
}

/* -------------------------------------------------------------------------------- clauses ------- */

const HEADER = /^#{1,6}\s/
const CLAUSE = /^\s*[-*]\s+\*\*(GIVEN|WHEN|THEN|AND|BUT)\*\*\s*(.*)$/

/**
 * The lines of the scenario `scenario` under the requirement `requirement` in one delta spec's text,
 * from below its header to the next header, each matched by its title with or without its ID token;
 * or null when the spec holds no such scenario.
 */
export function scenarioBlock(text, requirement, scenario) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  let current = null
  for (let i = 0; i < lines.length; i++) {
    const req = /^### Requirement:\s*(.+?)\s*$/.exec(lines[i])
    if (req) current = splitId(req[1]).title
    const scen = /^#### Scenario:\s*(.+?)\s*$/.exec(lines[i])
    if (scen && current === splitId(requirement).title && splitId(scen[1]).title === splitId(scenario).title) {
      let end = i + 1
      while (end < lines.length && !HEADER.test(lines[end])) end++
      return lines.slice(i + 1, end)
    }
  }
  return null
}

/**
 * A scenario's clauses, each its keyword and its text, a wrapped line joined to it: `given`, those
 * before its first THEN, and `outcomes`, the THEN and each AND or BUT after it. An AND or a BUT joins
 * the side of the clause before it.
 */
export function clausesOf(block) {
  const given = []
  const outcomes = []
  let side = given
  let last = null
  for (const line of block) {
    const m = CLAUSE.exec(line)
    if (m) {
      if (m[1] === 'THEN') side = outcomes
      else if (m[1] === 'GIVEN' || m[1] === 'WHEN') side = given
      side.push(`${m[1]} ${m[2].trim()}`)
      last = side
    } else if (last && line.trim() && !/^\s*[-*]\s/.test(line)) {
      last[last.length - 1] += ` ${line.trim()}`
    } else last = null
  }
  return { given, outcomes }
}

/* ------------------------------------------------------------------------------ test code ------- */

/**
 * Walks `text` from `from` as JavaScript code, skipping strings, template literals, comments and
 * regular expressions, and calls `stop(char, depth)` at each newline and each closing bracket of the
 * code; returns the index `stop` first answers true at, or -1.
 */
function walk(text, from, stop) {
  const stack = []
  let prev = ''
  for (let i = from; i < text.length; i++) {
    const c = text[i]
    if (stack.at(-1) === '`') {
      if (c === '\\') i++
      else if (c === '`') {
        stack.pop()
        prev = '`'
      } else if (c === '$' && text[i + 1] === '{') {
        stack.push('${')
        i++
        prev = '{'
      }
      continue
    }
    if (c === '\n') {
      if (stop('\n', stack.length)) return i
      continue
    }
    if (c === ' ' || c === '\t' || c === '\r') continue
    if (c === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i)
      if (nl === -1) return -1
      i = nl - 1
      continue
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2)
      if (end === -1) return -1
      i = end + 1
      continue
    }
    if (c === "'" || c === '"') {
      for (i++; i < text.length && text[i] !== c && text[i] !== '\n'; i++) if (text[i] === '\\') i++
      prev = c
      continue
    }
    if (c === '`') {
      stack.push('`')
      continue
    }
    if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev))) {
      let inClass = false
      for (i++; i < text.length && text[i] !== '\n'; i++) {
        if (text[i] === '\\') i++
        else if (text[i] === '[') inClass = true
        else if (text[i] === ']') inClass = false
        else if (text[i] === '/' && !inClass) break
      }
      prev = '/'
      continue
    }
    prev = c
    if (c === '(' || c === '[' || c === '{') stack.push(c)
    else if (c === ')' || c === ']' || c === '}') {
      stack.pop()
      if (stop(c, stack.length)) return i
    }
  }
  return -1
}

/** The offset of the start of each line of `text`, and one past its end. */
const lineStarts = (text) => {
  const starts = [0]
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1)
  return starts
}
/** The index of the line holding offset `at`. */
const lineOf = (starts, at) => {
  let line = 0
  while (line + 1 < starts.length && starts[line + 1] <= at) line++
  return line
}

const CALL = /^\s*(?:test|it)(?:\.(?:skip|todo|only))?\(/
const DECLARATION = /^\s*(?:export\s+)?(?:async\s+function\b|function\b|class\b|const\b|let\b|var\b|import\b)/
const IDENTIFIER = /[A-Za-z_$][\w$]*/g

/** The names a declaration statement binds. */
function bound(statement) {
  const names = (text) => (text.match(IDENTIFIER) ?? []).filter((n) => n !== 'as')
  let m = /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/.exec(statement)
  if (m) return [m[1]]
  m = /^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(statement)
  if (m) return [m[1]]
  m = /^\s*(?:export\s+)?(?:const|let|var)\s+([^=]+?)\s*=/.exec(statement)
  if (m) return names(m[1].replace(/[\w$]+\s*:/g, ''))
  m = /^\s*import\s+([\s\S]+?)\s+from\s/.exec(statement)
  if (m) return names(m[1].replace(/[\w$]+\s+as\s+/g, '').replace(/\*\s*as\s+/g, ''))
  return []
}

/**
 * The tests of one file's source by name, each with its body, its call from its line to the bracket
 * that closes it; and the file's declarations outside every body, each with the comment above it and
 * the names it binds. A call whose bracket never closes runs to the next test's call, or the end.
 */
export function readSource(text, policy, file) {
  const source = text.replace(/\r\n?/g, '\n')
  const lines = source.split('\n')
  const starts = lineStarts(source)
  const tests = readTests(source, policy, file).tests
  const spans = tests.map((t, n) => {
    const first = t.line - 1
    const call = CALL.exec(lines[first])
    const close = call ? walk(source, starts[first] + call[0].length - 1, (c, depth) => c !== '\n' && depth === 0) : -1
    const next = n + 1 < tests.length ? tests[n + 1].line - 1 : lines.length
    const last = close === -1 ? next - 1 : lineOf(starts, close)
    return { name: t.name, first, last, body: lines.slice(first, last + 1).join('\n').trimEnd() }
  })
  const inBody = (i) => spans.some((s) => i >= s.first && i <= s.last)
  const declarations = []
  for (let i = 0; i < lines.length; i++) {
    if (inBody(i) || !DECLARATION.test(lines[i])) continue
    const end = walk(source, starts[i], (c, depth) => c === '\n' && depth === 0)
    const last = end === -1 ? lines.length - 1 : lineOf(starts, end)
    let top = i
    while (top > 0 && /^\s*(?:\/\*|\*|\/\/(?!\s*trace))/.test(lines[top - 1])) top--
    const statement = lines.slice(i, last + 1).join('\n')
    declarations.push({ names: bound(statement), text: lines.slice(top, last + 1).join('\n') })
    i = last
  }
  return { tests: new Map(spans.map((s) => [s.name, s.body])), declarations }
}

/** The declarations, in file order, that `bodies` use, and those the used ones use in turn. */
export function definitionsFor(declarations, bodies) {
  const used = new Set(bodies.flatMap((b) => b.match(IDENTIFIER) ?? []))
  const taken = new Set()
  let grew = true
  while (grew) {
    grew = false
    for (const [i, d] of declarations.entries()) {
      if (taken.has(i) || !d.names.some((n) => used.has(n))) continue
      taken.add(i)
      for (const n of d.text.match(IDENTIFIER) ?? []) used.add(n)
      grew = true
    }
  }
  return declarations.filter((_, i) => taken.has(i)).map((d) => d.text)
}

/* ------------------------------------------------------------------------------ the plan ------- */

const rowName = (r) => `${r.capability} / ${r.requirement} / ${r.scenario}`

/**
 * One request per row to judge, and the rows not judged with why; or the problems that refuse the
 * run. `specText(capability)` and `fileText(path)` read a file at the trace's commit, or give null.
 */
export function planClauses({ result, specText, fileText, policy }) {
  const requests = []
  const skipped = []
  const problems = []
  const sources = new Map()
  const sourceOf = (file) => {
    if (!sources.has(file)) {
      const text = fileText(file)
      sources.set(file, text === null ? null : readSource(text, policy.trace, file))
    }
    return sources.get(file)
  }
  for (const r of result.rows) {
    const row = { capability: r.capability, requirement: r.requirement, scenario: r.scenario }
    if (r.exercises !== true) {
      skipped.push({ ...row, why: 'its tracer did not mark its proof as exercising it' })
      continue
    }
    if (!Array.isArray(r.tests) || !r.tests.length) {
      skipped.push({ ...row, why: 'its proof names no test: a gate, a check or a manual proof' })
      continue
    }
    const spec = specText(r.capability)
    const block = spec === null ? null : scenarioBlock(spec, r.requirement, r.scenario)
    if (block === null) {
      problems.push(`the delta spec of ${r.capability} holds no scenario ${r.scenario} under ${r.requirement} at ${result.commit}`)
      continue
    }
    const { given, outcomes } = clausesOf(block)
    if (!outcomes.length) {
      skipped.push({ ...row, why: 'its scenario has no THEN clause' })
      continue
    }
    const tests = []
    const definitions = []
    for (const t of r.tests) {
      const source = sourceOf(t.file)
      const body = source?.tests.get(t.name)
      if (body === undefined) {
        problems.push(source ? `${t.file} holds no test named "${t.name}" at ${result.commit}` : `${t.file} is not in the commit ${result.commit}`)
        continue
      }
      tests.push({ file: t.file, name: t.name, body })
    }
    for (const file of [...new Set(tests.map((t) => t.file))]) {
      const text = definitionsFor(sourceOf(file).declarations, tests.filter((t) => t.file === file).map((t) => t.body))
      if (text.length) definitions.push({ file, text: text.join('\n\n') })
    }
    if (tests.length !== r.tests.length) continue
    requests.push({
      row,
      outcomes,
      state: { scenario: `${r.requirement} / ${r.scenario}`, given, tests, definitions },
      questions: Object.fromEntries(outcomes.map((clause, i) => [`c${i + 1}`, `${QUESTION} ${clause}`])),
    })
  }
  return { requests, skipped, problems }
}

/**
 * Each request asked at once, and each row with its outcomes' probabilities of yes. The first failed
 * call rejects, with the SDK's error; an answer with no probability for an outcome rejects, naming it.
 */
export async function askClauses(requests, judge) {
  return Promise.all(
    requests.map(async (q) => {
      const answer = await judge.noul({ state: q.state, questions: q.questions })
      const clauses = q.outcomes.map((clause, i) => {
        const p = answer?.[`c${i + 1}`]
        if (typeof p !== 'number' || !(p >= 0 && p <= 1)) throw new Error(`the answer for ${rowName(q.row)} has no probability for "${clause}"`)
        return { clause, p }
      })
      return { ...q.row, clauses }
    }),
  )
}

/* ------------------------------------------------------------------------------- the command ------- */

/** The command, its dependencies handed in so the selftest can run it whole over a stub. */
export async function clausesMain(argv, deps = {}) {
  const root = deps.root ?? process.env.TRACE_ROOT ?? REPO_ROOT
  const env = deps.env ?? process.env
  const out = deps.out ?? ((t) => console.log(t))
  const err = deps.err ?? ((t) => console.error(t))
  const makeJudge = deps.makeJudge ?? createJudge
  const usage = (message) => {
    err(`${NAME}: ${message}\n\nusage: node scripts/judge-trace-clauses.mjs <change> [--result <file>] [--out <file>] | --selftest`)
    return 2
  }
  const refuse = (problems) => {
    err(`${NAME}: refused, and wrote nothing.\n\n${problems.map((p) => `  - ${p}`).join('\n')}`)
    return 1
  }

  const positionals = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--result' || arg === '--out') {
      if (!argv[i + 1] || argv[i + 1].startsWith('-')) return usage(`${arg} needs a file`)
      flags[arg.slice(2)] = argv[++i]
    } else if (arg.startsWith('-')) return usage(`unknown flag ${JSON.stringify(arg)}`)
    else positionals.push(arg)
  }
  if (positionals.length !== 1) return usage('name one change')
  const [change] = positionals
  const input = flags.result ?? `.scratch/${change}-trace.json`
  const output = flags.out ?? `.scratch/${change}-clauses.json`

  let policy
  try {
    policy = clausePolicy(readPolicy(root))
  } catch (error) {
    return refuse([error.message])
  }
  let text
  try {
    text = readFileSync(join(root, input), 'utf8')
  } catch (error) {
    return refuse([`${input} could not be read (${error.message}); save the workflow's result there first`])
  }
  const { result, problem } = parseResult(text)
  if (problem) return refuse([`${input}: ${problem}`])
  if (result.change !== change) return refuse([`${input} is the result for ${result.change}, not ${change}`])
  if (result.stopped !== 'no-gap') return refuse([`${input} stopped \`${result.stopped}\`, not \`no-gap\`: the clauses are judged on a trace with no gap, once its gaps are fixed`])
  if (result.clauses) return refuse([`${input} is a clause run's result already; judge the trace of the run before it`])
  const specs = specsDir(root, change)
  if (specs.problem) return refuse([specs.problem])
  const git = gitIn(root)
  try {
    git(['rev-parse', '--verify', '--quiet', `${result.commit}^{commit}`])
  } catch {
    return refuse([`${input} was taken at ${result.commit}, which is not a commit of the repository at ${root}`])
  }
  const show = (path) => {
    try {
      return git(['show', `${result.commit}:${path}`])
    } catch {
      return null
    }
  }
  const plan = planClauses({ result, specText: (capability) => show(`${specs.dir}/${capability}/spec.md`), fileText: show, policy })
  if (plan.problems.length) return refuse(plan.problems)

  let made
  try {
    made = await makeJudge({ env, model: policy.model })
  } catch (error) {
    err(`${NAME} FAILED: ${error.message}`)
    return 1
  }
  if ('skip' in made) {
    out(`${NAME}: ${made.skip} No clause was judged and nothing was written: the trace stands as its tracers read it, and no clause run follows.`)
    return 0
  }
  let rows
  try {
    rows = await askClauses(plan.requests, made.judge)
  } catch (error) {
    err(`${NAME} FAILED: a TypeSafe call failed, so no clause is judged and nothing was written: ${error.message}`)
    return 1
  }

  mkdirSync(dirname(join(root, output)), { recursive: true })
  writeFileSync(join(root, output), `${JSON.stringify({ change, commit: result.commit, model: policy.model, rows, skipped: plan.skipped }, null, 2)}\n`)
  const judged = rows.reduce((n, r) => n + r.clauses.length, 0)
  const doubted = rows.filter((r) => r.clauses.some((c) => c.p < policy.threshold))
  const under = rows.reduce((n, r) => n + r.clauses.filter((c) => c.p < policy.threshold).length, 0)
  out(
    `${NAME}: ${judged} clause(s) of ${rows.length} row(s) judged at ${String(result.commit).slice(0, 12)} by ${policy.model};` +
      ` ${under} under \`${THRESHOLD_KEY}\` (${policy.threshold}), in ${doubted.length} row(s)${doubted.length ? `: ${doubted.map((r) => r.scenario).join(', ')}` : ''};` +
      ` ${plan.skipped.length} row(s) not judged. Wrote ${output}: run the workflow again with it as \`clauses\` and ${input} as \`first\`.`,
  )
  return 0
}

/* ------------------------------------------------------------------------------- selftest ------- */

const FIXED_THRESHOLD = 0.45
const SPEC = [
  '## ADDED Requirements',
  '',
  '### Requirement: Sums',
  '',
  'The demo SHALL add.',
  '',
  '#### Scenario: [DEM-001] Two plus two',
  '',
  '- **WHEN** a person adds `2` and `2`',
  '- **THEN** the result is `4`',
  '- **AND** the history shows',
  '  `2 + 2`',
  '',
  '#### Scenario: [DEM-002] Clear resets',
  '',
  '- **GIVEN** a sum was made',
  '- **AND** a person presses clear',
  '- **THEN** the display shows `0`',
  '',
  '#### Scenario: [DEM-003] Served by a check',
  '',
  '- **WHEN** the check runs',
  '- **THEN** it passes',
  '',
  '### Requirement: Quiet',
  '',
  'The demo SHALL be quiet.',
  '',
  '#### Scenario: [DEM-004] No outcome',
  '',
  '- **WHEN** nothing happens',
  '',
].join('\n')
const TESTS = [
  "import assert from 'node:assert/strict'",
  "import { test } from 'node:test'",
  "import { add, clear, history } from '../app.js'",
  "import { unrelated } from '../other.js'",
  '',
  '// trace-defaults: layer=functional level=1',
  '',
  '/** The two operands every sum adds. */',
  'const OPERANDS = [2, 2]',
  '',
  '/** Adds the operands, through a helper the body calls. */',
  'function sum() {',
  '  return add(...OPERANDS)',
  '}',
  '',
  'function unused() {',
  "  return unrelated('never read')",
  '}',
  '',
  '// trace: DEM-001:happy@aaaaaaaaaaaa',
  "test('[DEM-001] Two plus two', () => {",
  "  const note = 'a ) and a } in a string'",
  '  const shown = `${history()}`',
  '  assert.equal(sum(), 4) // a comment holding a (',
  "  assert.equal(shown, '2 + 2', note)",
  '})',
  '',
  '// trace: DEM-002:happy@aaaaaaaaaaaa',
  "test('[DEM-002] Clear resets', () => {",
  '  assert.match(clear(), /^[)}]?0$/)',
  '})',
  '',
  '// trace: DEM-004:happy@aaaaaaaaaaaa',
  "test('[DEM-004] No outcome', () => {",
  '  assert.ok(unused)',
  '})',
  '',
].join('\n')
const TEST_FILE = 'apps/demo/test/demo.test.js'
const SPEC_DIR = 'openspec/changes/demo/specs'

/** A row of the fixture's trace, proved by the named tests unless `extra` says otherwise. */
const fixtureRow = (requirement, scenario, names, extra = {}) => ({
  group: 'demo',
  capability: 'demo',
  requirement,
  scenario,
  proofKind: 'test',
  proof: names.join('; ') || 'mise run demo:check',
  tests: names.map((name) => ({ file: TEST_FILE, name })),
  exercises: true,
  result: 'pass',
  measured: [],
  checked: !names.length,
  notes: 'Read line by line.',
  readAt: '',
  kept: false,
  gap: null,
  ...extra,
})

/** The fixture's trace at `commit`, stopped no-gap, changed by `extra`. */
const fixtureTrace = (commit, extra = {}) => ({
  change: 'demo',
  commit,
  branch: 'agent/demo',
  previous: null,
  stopped: 'no-gap',
  why: 'every one of the 4 scenario(s) traced',
  rows: [
    fixtureRow('Sums', '[DEM-001] Two plus two', ['[DEM-001] Two plus two']),
    fixtureRow('Sums', '[DEM-002] Clear resets', ['[DEM-002] Clear resets']),
    fixtureRow('Sums', '[DEM-003] Served by a check', []),
    fixtureRow('Quiet', '[DEM-004] No outcome', ['[DEM-004] No outcome']),
  ].map((r) => ({ ...r, readAt: commit })),
  gaps: [],
  below: [],
  design: { present: false, lenses: [] },
  manual: [],
  groups: [],
  counts: {},
  clauses: null,
  ...extra,
})

/** The selftest: a fixture repository under the temporary directory, a stubbed judge, and the real SDK once. */
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
  console.log(`${NAME} selftest\n`)
  const dir = mkdtempSync(join(tmpdir(), `${NAME}-`))
  try {
    for (const [path, text] of [[`${SPEC_DIR}/demo/spec.md`, SPEC], [TEST_FILE, TESTS]]) {
      mkdirSync(dirname(join(dir, path)), { recursive: true })
      writeFileSync(join(dir, path), text)
    }
    copyPolicy(REPO_ROOT, dir)
    const fix = () => {
      copyPolicy(REPO_ROOT, dir)
      if (readPolicy(dir)[THRESHOLD_KEY] !== FIXED_THRESHOLD) editPolicy(dir, (p) => (p[THRESHOLD_KEY] = FIXED_THRESHOLD))
    }
    fix()
    const git = gitIn(dir, SCRATCH_GIT_ENV)
    git(['init', '-q', '-b', 'main'])
    git(['add', '-A'])
    git(['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'fixture'])
    const commit = git(['rev-parse', 'HEAD']).trim()
    const save = (name, trace) => {
      mkdirSync(join(dir, '.scratch'), { recursive: true })
      writeFileSync(join(dir, '.scratch', name), JSON.stringify(trace))
    }
    save('demo-trace.json', fixtureTrace(commit))
    const OUT = join(dir, '.scratch', 'demo-clauses.json')

    const stub = (asked, answer = () => 0.9) => ({
      async choose() {
        throw new Error('the clause judge asks no Choice')
      },
      async noul(question) {
        asked.push(question)
        return Object.fromEntries(Object.keys(question.questions).map((name) => [name, answer(question, name)]))
      },
    })
    const run = async (argv, options = {}) => {
      rmSync(OUT, { force: true })
      const asked = []
      const outs = []
      const errs = []
      const judge = options.judge ?? stub(asked, options.answer)
      const code = await clausesMain(argv, {
        root: dir,
        env: options.env ?? { TYPESAFE_API_KEY: 'selftest-not-a-key' },
        out: (t) => outs.push(t),
        err: (t) => errs.push(t),
        ...(options.real ? {} : { makeJudge: async () => ({ judge }) }),
      })
      const written = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : null
      return { code, out: outs.join('\n'), err: errs.join('\n'), asked, written }
    }
    const askedFor = (r, scenario) => r.asked.find((q) => q.state.scenario.endsWith(scenario))

    // The control: every outcome asserted, and what the judge is sent.
    const control = await run(['demo'])
    ok('control: a no-gap trace is judged and its answers written, exit 0', control.code === 0 && control.written !== null, control.err || control.out)
    ok(
      'one request per row its tests prove, a row proved by a check and a scenario with no THEN listed as not judged, with why',
      control.asked.length === 2 &&
        JSON.stringify(control.written?.skipped.map((s) => [s.scenario, s.why])) ===
          JSON.stringify([['[DEM-003] Served by a check', 'its proof names no test: a gate, a check or a manual proof'], ['[DEM-004] No outcome', 'its scenario has no THEN clause']]),
      JSON.stringify(control.written?.skipped),
    )
    const two = askedFor(control, 'Two plus two')
    ok(
      'one question per outcome, the THEN and the AND, a wrapped line joined to its clause',
      JSON.stringify(Object.values(two?.questions ?? {})) === JSON.stringify([`${QUESTION} THEN the result is \`4\``, `${QUESTION} AND the history shows \`2 + 2\``]),
      JSON.stringify(two?.questions),
    )
    ok('the state names the scenario and the WHEN that sets it up', two?.state.scenario === 'Sums / [DEM-001] Two plus two' && JSON.stringify(two.state.given) === '["WHEN a person adds `2` and `2`"]', JSON.stringify(two?.state))
    const clearQ = askedFor(control, 'Clear resets')
    ok(
      'a GIVEN and the AND after it set the scenario up; they are not asked about',
      JSON.stringify(clearQ?.state.given) === '["GIVEN a sum was made","AND a person presses clear"]' && Object.keys(clearQ.questions).length === 1,
      JSON.stringify(clearQ?.state),
    )
    const body = two?.state.tests[0]?.body ?? ''
    ok(
      "a test's body runs from its call to the bracket that closes it, past a bracket in a string, a template, a comment and a regular expression",
      body.startsWith("test('[DEM-001] Two plus two'") && body.endsWith("assert.equal(shown, '2 + 2', note)\n})") && (clearQ?.state.tests[0]?.body ?? '').endsWith('/^[)}]?0$/)\n})'),
      JSON.stringify([body, clearQ?.state.tests[0]?.body]),
    )
    const defs = two?.state.definitions[0]?.text ?? ''
    ok(
      'the definitions are those the body uses, followed through what they use, each with its comment, and no others',
      defs.includes('/** The two operands every sum adds. */\nconst OPERANDS = [2, 2]') &&
        defs.includes('function sum() {\n  return add(...OPERANDS)\n}') &&
        defs.includes("import { add, clear, history } from '../app.js'") &&
        defs.includes("import assert from 'node:assert/strict'") &&
        !defs.includes('unused') &&
        !defs.includes('unrelated'),
      defs,
    )
    ok(
      'the file holds each row with each outcome and its probability, the commit and the model',
      control.written?.commit === commit &&
        control.written.model === readPolicy(REPO_ROOT)[MODEL_KEY] &&
        JSON.stringify(control.written.rows.map((r) => [r.scenario, r.clauses.map((c) => [c.clause, c.p])])) ===
          JSON.stringify([['[DEM-001] Two plus two', [['THEN the result is `4`', 0.9], ['AND the history shows `2 + 2`', 0.9]]], ['[DEM-002] Clear resets', [['THEN the display shows `0`', 0.9]]]]),
      JSON.stringify(control.written?.rows),
    )
    ok('the summary counts none under the threshold', /: 3 clause\(s\) of 2 row\(s\) judged at .*; 0 under `verifyTraceClauseThreshold` \(0\.45\), in 0 row\(s\); 2 row\(s\) not judged/.test(control.out), control.out)

    // A clause missing, and one at the threshold.
    const missing = await run(['demo'], { answer: (q, name) => (q.state.scenario.endsWith('Two plus two') && name === 'c2' ? 0.1 : 0.9) })
    ok(
      'a clause the tests do not assert is written with its low probability, and the summary names its row',
      missing.code === 0 && missing.written?.rows[0].clauses[1].p === 0.1 && /; 1 under `verifyTraceClauseThreshold` \(0\.45\), in 1 row\(s\): \[DEM-001\] Two plus two;/.test(missing.out),
      missing.out + missing.err,
    )
    const at = await run(['demo'], { answer: () => FIXED_THRESHOLD })
    ok('a clause exactly at the threshold is not under it', at.code === 0 && /; 0 under /.test(at.out), at.out)

    // Key missing, and a call that fails.
    for (const env of [{}, { TYPESAFE_API_KEY: '  ' }]) {
      const skipped = await run(['demo'], { env, real: true })
      ok(
        `no key (${JSON.stringify(env)}): it says why, writes nothing, and exits 0`,
        skipped.code === 0 && /TYPESAFE_API_KEY is not set/.test(skipped.out) && /no clause run follows/.test(skipped.out) && skipped.written === null,
        skipped.out + skipped.err,
      )
    }
    const failing = await run(['demo'], {
      judge: {
        async noul() {
          throw new Error('503 service unavailable (request req_selftest)')
        },
      },
    })
    ok(
      'a key is set and a call fails: it FAILS, exit 1, with the SDK error, and writes nothing',
      failing.code === 1 && /FAILED: a TypeSafe call failed, so no clause is judged and nothing was written: 503 service unavailable/.test(failing.err) && failing.written === null && failing.out === '',
      failing.err,
    )
    const empty = await run(['demo'], { judge: { noul: async () => ({}) } })
    ok(
      'an answer with no probability for an outcome fails the run and names the outcome',
      empty.code === 1 && /has no probability for "THEN the result is `4`"/.test(empty.err) && empty.written === null,
      empty.err,
    )

    // Each refusal, by its reason, with nothing asked and nothing written.
    const refusedFor = async (what, name, trace, reason) => {
      save(name, trace)
      const r = await run(['demo', '--result', `.scratch/${name}`])
      ok(`refused: ${what}`, r.code === 1 && reason.test(r.err) && !r.asked.length && r.written === null, r.err || r.out)
    }
    await refusedFor('a trace that stopped with gaps', 'gaps.json', fixtureTrace(commit, { stopped: 'gaps' }), /stopped `gaps`, not `no-gap`/)
    await refusedFor("a clause run's result", 'again.json', fixtureTrace(commit, { clauses: { judged: 3 } }), /is a clause run's result already/)
    await refusedFor('a trace of another change', 'other.json', fixtureTrace(commit, { change: 'other' }), /is the result for other, not demo/)
    await refusedFor('a trace taken at a commit the repository does not hold', 'orphan.json', fixtureTrace('f'.repeat(40)), /which is not a commit of the repository/)
    const renamed = fixtureTrace(commit)
    renamed.rows[0] = { ...renamed.rows[0], tests: [{ file: TEST_FILE, name: '[DEM-001] Gone' }] }
    await refusedFor('a test its file does not hold at the commit', 'renamed.json', renamed, /apps\/demo\/test\/demo\.test\.js holds no test named "\[DEM-001\] Gone"/)
    const unknown = fixtureTrace(commit)
    unknown.rows[1] = { ...unknown.rows[1], scenario: '[DEM-009] Never written' }
    await refusedFor('a scenario its delta spec does not hold', 'unknown.json', unknown, /holds no scenario \[DEM-009\] Never written under Sums/)
    editPolicy(dir, (p) => delete p[THRESHOLD_KEY])
    const noKey = await run(['demo'])
    ok('refused: a policy without the threshold, naming the key', noKey.code === 1 && /has no probability above 0 and at most 1 under `verifyTraceClauseThreshold`/.test(noKey.err), noKey.err)
    fix()
    editPolicy(dir, (p) => (p[THRESHOLD_KEY] = 1.5))
    const high = await run(['demo'])
    ok('refused: a threshold above 1', high.code === 1 && /verifyTraceClauseThreshold`: 1\.5/.test(high.err), high.err)
    fix()
    for (const [argv, reason] of [[[], /name one change/], [['demo', '--bogus'], /unknown flag "--bogus"/], [['demo', '--out'], /--out needs a file/]]) {
      const r = await run(argv)
      ok(`usage: ${JSON.stringify(argv)} exits 2`, r.code === 2 && reason.test(r.err), r.err)
    }

    // The client: its noul, and the real SDK against a refused connection.
    const made = await createJudge({ env: { TYPESAFE_API_KEY: 'selftest-not-a-key' }, model: 'jev-selftest' })
    ok('the shared client returns a judge with noul, and makes no call, when a key is set', 'judge' in made && typeof made.judge.noul === 'function')
    const child = (extra) =>
      spawnSync(process.execPath, [SELF, 'demo'], { cwd: dir, env: { ...gitEnv(), TRACE_ROOT: dir, ...extra }, encoding: 'utf8', timeout: 60_000 })
    rmSync(OUT, { force: true })
    const wired = child({ TYPESAFE_API_KEY: 'selftest-not-a-key', TYPESAFE_BASE_URL: 'http://127.0.0.1:1' })
    ok(
      'through the real SDK to a refused connection: it fails, exit 1, and writes nothing',
      wired.status === 1 && /FAILED: a TypeSafe call failed/.test(wired.stderr) && !existsSync(OUT),
      `exit ${wired.status}; ${wired.stderr.split('\n')[0]}`,
    )
    const unset = child({ TYPESAFE_API_KEY: '' })
    ok('as a process with no key: it says why and exits 0', unset.status === 0 && /TYPESAFE_API_KEY is not set/.test(unset.stdout) && !existsSync(OUT), `exit ${unset.status}; ${unset.stdout}${unset.stderr}`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  console.log(`\n${checks} checks, ${failures} failed`)
  return failures ? 1 : 0
}

if (resolve(process.argv[1] ?? '') === SELF) {
  const argv = process.argv.slice(2)
  if (argv[0] === '--selftest') {
    if (argv.length > 1) {
      console.error(`${NAME}: --selftest takes no other argument`)
      process.exitCode = 2
    } else process.exitCode = await selftest()
  } else process.exitCode = await clausesMain(argv)
}
