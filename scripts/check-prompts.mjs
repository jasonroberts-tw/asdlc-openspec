/**
 * Prompt gate. It holds every prompt to two things.
 *
 * THE OPENING LINE. Every skill (`.claude/skills/<name>/SKILL.md`) and every agent
 * (`.claude/agents/*.md`) opens, on the first line after its frontmatter, with the sentence
 * CLAUDE.md § Standing rules for prompts and gates requires. The sentence is read out of `CLAUDE.md`
 * on every run, so it has one home and this file states it nowhere.
 *
 * THE WORD BUDGET. Every prompt is held to a word budget, a key of its own in `tools/policy.json`:
 * every skill and every agent, `CLAUDE.md`, `AGENTS.md`, `.claude/worktree-CONTEXT.md.tmpl` (the
 * briefing `CLAUDE.md` imports in a worktree), and each workflow under `.claude/workflows/`. A prompt
 * over its budget is refused, and so is a prompt with none, so a new prompt gets one when it lands. A
 * word is a whitespace-separated token. A markdown prompt and the briefing are counted whole,
 * frontmatter included. A workflow is counted on the text of its string and template literals, cooked
 * as the runtime cooks them, and on nothing else: that text is what its agents receive, and what its
 * caller reads back, whether a prompt is written as one template literal or concatenated from pieces.
 *
 * A prompt's key is `promptWordBudget` followed by `ClaudeMd`, `AgentsMd`, `WorktreeContext`, or
 * `Skill`, `Agent` or `Workflow` and its name in PascalCase: `.claude/skills/open-pr/SKILL.md` is
 * `promptWordBudgetSkillOpenPr`. Each key has a `<key>Means` sibling. A budget rises only by an edit
 * to its key, with the reason in that sibling, and `prReviewHighRiskJsonKeys` makes every such edit
 * one a person merges. A `promptWordBudget` key that names no prompt is refused, so a retired
 * prompt's budget goes with it.
 *
 * THE FAILURE IT EXISTS TO PREVENT, one incident for each check.
 *
 * The opening line. On 2026-09-23 six of the fifteen skills and agents tracked at commit fad7da8
 * (`git ls-files .claude/skills .claude/agents`) did not open with the line, while
 * `.claude/README.md` said every one did (asdlc-openspec-44p). All six were copied in from the
 * starter kit, which `KIT-CHECKLIST.md` records as `unchanged`, and nothing refused any of them. A
 * prompt without the line does not tell the model that `CLAUDE.md` wins where the two disagree, and
 * the prompts that lacked it included the one that tells an agent how to retire a file, which
 * `CLAUDE.md` makes a register decision with a checklist.
 *
 * The word budget. Every prompt review added words, and almost none took any away.
 * `.claude/skills/bead/SKILL.md` held 627 words at the bootstrap (5417b33) and 1,900 at 3724017: the
 * eight review commits fad7da8, 78d235e, b546990, c0eddcb, 5b2569c, cd8fb96, 7d2cb03 and 39eb1be
 * added 1,182 of them, and it shrank only twice, by 64 words at 26bc841 and by 161 at 4097416, when
 * `open-pr` was extracted from it. `CLAUDE.md`, which every session loads, grew from 2,275 words at
 * 5417b33 to 3,318 at 16440e9, where a run of `bead` loaded 6,080 words of prompt (`CLAUDE.md`,
 * `bead` and `open-pr`) before it read its issue. On 2026-09-25 the maintainer asked for a way to
 * stop prompts growing without bound (asdlc-openspec-2wv). Nothing had refused any of that growth:
 * this gate read only a prompt's first line. Each figure is `git show <commit>:<path>` split on
 * whitespace.
 *
 * INVOCATION.
 *
 *   npm run check:prompts                     the gate
 *   npm run check:prompts:selftest            its fixtures -- every refusal exercised on a doctored copy
 *   node scripts/check-prompts.mjs --counts   every prompt's words, its key and its budget, in
 *                                             code-point order of path; it refuses nothing
 *
 * NO EXEMPTION. `CLAUDE.md` asks the line of every *substantial* prompt. This gate asks it of every
 * skill and agent, because the line costs one line and deciding what is substantial is how six were
 * skipped. A prompt that should go without it is named in `.claude/README.md` with its reason and
 * added to a table here in the same change; there is none today. No prompt goes without a budget.
 *
 * A HEURISTIC, NOT A PARSER, reads a workflow. No JavaScript parser is a dependency here, and adding
 * one changes `package-lock.json`, which `prReviewHighRiskPaths` gives a person to merge. The
 * tokeniser below skips line and block comments, and skips a regular expression where a `/` stands
 * where an operand is expected, judged from the token before it as a JavaScript tokeniser judges it.
 * It follows a template literal into each substitution and back, so a string inside `${...}` is
 * counted too. The selftest pins its count of a fixture workflow to a count made by hand, with a
 * regular expression holding every quote mark and a comment holding quoted words.
 *
 * WHAT IS NOT CHECKED. A prompt's cost in tokens: code blocks, paths and commands cost more tokens
 * per word than prose, so a prompt that swaps prose for them stays under its budget while its cost
 * rises. A workflow's code, its comments, and any text it builds from other than a literal; a literal
 * that is not prompt text, such as a schema's type name, is counted anyway. A file beside a
 * `SKILL.md` in its skill's directory, of which none is tracked, and a `README.md` under
 * `.claude/agents/`, which describes the agents and is not one. The opening line of `CLAUDE.md`,
 * `AGENTS.md`, the briefing and a workflow, none of which is a skill or an agent. A `Reviewed:`
 * trailer is not refused here: prompts carry none since `docs/decisions.md` § D-05, and review is
 * what holds that.
 *
 * NEGATIVE TESTING. `--selftest` builds a fixture tree under `os.tmpdir()`, doctors ONE thing per
 * case and asserts the run fails FOR THAT REASON, plus an undoctored control that must pass. By
 * hand, point `PROMPTS_CHECK_ROOT` at a doctored copy:
 *
 *   PROMPTS_CHECK_ROOT=/tmp/doctored node scripts/check-prompts.mjs
 *
 * NEEDS only committed files: `CLAUDE.md`, the prompts and `tools/policy.json`. No tool, no network.
 * 0.08 s wall for the gate and 0.15 s for its selftest through `node --run` (`/usr/bin/time -p`,
 * two runs each, both alike) on a macOS 26.7 laptop with Node 26.8.1, 2026-09-26.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.PROMPTS_CHECK_ROOT ?? REPO_ROOT

const SKILLS_DIR = '.claude/skills'
const AGENTS_DIR = '.claude/agents'
const WORKFLOWS_DIR = '.claude/workflows'
const TEMPLATE = '.claude/worktree-CONTEXT.md.tmpl'
const POLICY = 'tools/policy.json'
const RULE_HOME = 'CLAUDE.md § Standing rules for prompts and gates'
/** The bullet in `CLAUDE.md` that carries the sentence, up to the quotation mark that opens it. */
const RULE_LEAD = '**The first line of every substantial skill and agent** is: "'
const BUDGET_PREFIX = 'promptWordBudget'
/** The prompts outside the three directories, each with the name its budget key ends in. */
const SINGLE_PROMPTS = { 'AGENTS.md': 'AgentsMd', 'CLAUDE.md': 'ClaudeMd', [TEMPLATE]: 'WorktreeContext' }

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/** The sentence `CLAUDE.md` requires, with its line wrapping collapsed, or null when it states none. */
function requiredLine(root) {
  const path = join(root, 'CLAUDE.md')
  if (!existsSync(path)) return null
  const text = readFileSync(path, 'utf8').replace(/\s+/g, ' ')
  const start = text.indexOf(RULE_LEAD)
  if (start === -1) return null
  const from = start + RULE_LEAD.length
  const end = text.indexOf('"', from)
  return end === -1 ? null : text.slice(from, end).trim() || null
}

/** Every skill and agent under `root`, as repository-relative paths in code-point order. */
function prompts(root) {
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
      if (!name.endsWith('.md') || name === 'README.md') continue
      found.push(`${AGENTS_DIR}/${name}`)
    }
  }
  return found.sort(byCodePoint)
}

/** Every prompt the budget covers under `root`: the skills and agents, the workflows, and the single files. */
function budgeted(root) {
  const found = prompts(root)
  const workflows = join(root, WORKFLOWS_DIR)
  if (existsSync(workflows)) {
    for (const name of readdirSync(workflows)) if (name.endsWith('.js')) found.push(`${WORKFLOWS_DIR}/${name}`)
  }
  for (const path of Object.keys(SINGLE_PROMPTS)) if (existsSync(join(root, path))) found.push(path)
  return found.sort(byCodePoint)
}

const pascal = (name) =>
  name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')

/** The `tools/policy.json` key that holds the budget of the prompt at `path`. */
export function budgetKey(path) {
  if (Object.hasOwn(SINGLE_PROMPTS, path)) return BUDGET_PREFIX + SINGLE_PROMPTS[path]
  for (const [kind, pattern] of [
    ['Skill', /^\.claude\/skills\/([^/]+)\/SKILL\.md$/],
    ['Agent', /^\.claude\/agents\/([^/]+)\.md$/],
    ['Workflow', /^\.claude\/workflows\/([^/]+)\.js$/],
  ]) {
    const match = pattern.exec(path)
    if (match) return BUDGET_PREFIX + kind + pascal(match[1])
  }
  throw new Error(`${path} is not a prompt this gate budgets`)
}

/** Why `text` does not open with `line` after its frontmatter, or null when it does. */
function openingProblem(text, line) {
  const lines = text.split(/\r?\n/)
  let i = 0
  if (lines[0] === '---') {
    const close = lines.indexOf('---', 1)
    if (close === -1) return 'its frontmatter opens with `---` and never closes'
    i = close + 1
  }
  while (i < lines.length && lines[i].trim() === '') i++
  if (i >= lines.length) return 'it has nothing after its frontmatter'
  const first = lines[i].trim()
  if (first === line) return null
  const shown = first.length > 80 ? `${first.slice(0, 77)}...` : first
  return `its first line after the frontmatter is "${shown}"`
}

/* ------------------------------------------------------------------------------ counting ----- */

const words = (text) => text.split(/\s+/).filter(Boolean).length

/** Keywords after which a `/` opens a regular expression rather than dividing. */
const OPERAND_AFTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await'])
const SIMPLE_ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', 0: '\0' }

/**
 * The text of every string and template literal in a JavaScript source, cooked as the runtime cooks
 * it: one entry per quoted string, and one per stretch of a template literal between its
 * substitutions. Comments and regular expressions are skipped. A heuristic, as the header says.
 */
export function literalTexts(source) {
  const texts = []
  const n = source.length
  let i = 0

  const escape = () => {
    const c = source[i + 1]
    i += 2
    if (c === undefined || c === '\n' || c === '\u2028' || c === '\u2029') return ''
    if (c === '\r') {
      if (source[i] === '\n') i++
      return ''
    }
    if (c === 'x' || c === 'u') {
      let hex
      if (c === 'u' && source[i] === '{') {
        const end = source.indexOf('}', i)
        hex = end === -1 ? '' : source.slice(i + 1, end)
        i = end === -1 ? n : end + 1
      } else {
        hex = source.slice(i, i + (c === 'x' ? 2 : 4))
        i += hex.length
      }
      const point = Number.parseInt(hex, 16)
      return Number.isInteger(point) && point <= 0x10ffff ? String.fromCodePoint(point) : ''
    }
    return SIMPLE_ESCAPES[c] ?? c
  }

  const quoted = (quote) => {
    let text = ''
    i++
    while (i < n && source[i] !== quote && source[i] !== '\n') {
      if (source[i] === '\\') text += escape()
      else text += source[i++]
    }
    i++
    texts.push(text)
  }

  const template = () => {
    let text = ''
    i++
    while (i < n && source[i] !== '`') {
      if (source[i] === '\\') text += escape()
      else if (source[i] === '$' && source[i + 1] === '{') {
        texts.push(text)
        text = ''
        i += 2
        code(true)
      } else text += source[i++]
    }
    i++
    texts.push(text)
  }

  const regex = () => {
    let inClass = false
    for (i++; i < n && source[i] !== '\n'; i++) {
      const c = source[i]
      if (c === '\\') i++
      else if (c === '[') inClass = true
      else if (c === ']') inClass = false
      else if (c === '/' && !inClass) {
        i++
        break
      }
    }
    while (i < n && /[A-Za-z]/.test(source[i])) i++
  }

  const operandExpected = (last) => last === '' || OPERAND_AFTER.has(last) || (last.length === 1 && !/[A-Za-z0-9_$)\]]/.test(last))

  /** Code up to the end, or up to the `}` that closes the substitution it was called for. */
  function code(inSubstitution) {
    let depth = 0
    let last = ''
    while (i < n) {
      const c = source[i]
      if (c === '/' && source[i + 1] === '/') {
        const end = source.indexOf('\n', i)
        i = end === -1 ? n : end
      } else if (c === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2)
        i = end === -1 ? n : end + 2
      } else if (/\s/.test(c)) i++
      else if (c === "'" || c === '"') {
        quoted(c)
        last = 'a literal'
      } else if (c === '`') {
        template()
        last = 'a literal'
      } else if (/[A-Za-z0-9_$]/.test(c)) {
        const start = i
        while (i < n && /[A-Za-z0-9_$]/.test(source[i])) i++
        last = source.slice(start, i)
      } else if (c === '/' && operandExpected(last)) {
        regex()
        last = 'a literal'
      } else {
        if (c === '{') depth++
        else if (c === '}') {
          if (depth === 0 && inSubstitution) {
            i++
            return
          }
          depth--
        }
        last = c
        i++
      }
    }
  }

  code(false)
  return texts
}

/** The words of the prompt at `path`: a workflow's literals, or any other prompt whole. */
function countWords(root, path) {
  const text = readFileSync(join(root, path), 'utf8')
  return path.startsWith(`${WORKFLOWS_DIR}/`) ? words(literalTexts(text).join('\n')) : words(text)
}

/**
 * Every budgeted prompt under `root`, as { path, key, words, budget }, and the policy, or why it
 * could not be read. `budget` is whatever the policy holds under the key, or undefined.
 */
export function measure(root) {
  const measured = budgeted(root).map((path) => ({ path, key: budgetKey(path), words: countWords(root, path) }))
  let policy = null
  let unreadable = null
  try {
    policy = JSON.parse(readFileSync(join(root, POLICY), 'utf8'))
    if (!isRecord(policy)) throw new Error('it holds no JSON object')
  } catch (error) {
    policy = null
    unreadable = error.message
  }
  for (const m of measured) m.budget = policy?.[m.key]
  return { measured, policy, unreadable }
}

/** Why the prompts under `root` break their budgets, one message per problem. */
function budgetProblems(root, { measured, policy, unreadable }) {
  if (unreadable !== null) {
    return [`${POLICY} under ${root} could not be read (${unreadable}), and every prompt's word budget is there.`]
  }
  const problems = []
  for (const { path, key, words: count, budget } of measured) {
    const where = `${POLICY} \`${key}\``
    if (budget === undefined) {
      problems.push(
        `${path} has no word budget: ${POLICY} has no \`${key}\`. Add it, set to the ${count} word(s) the ` +
          `prompt holds now, with a \`${key}Means\` sibling saying why.`,
      )
      continue
    }
    if (!Number.isInteger(budget) || budget < 1) {
      problems.push(`${where} is ${JSON.stringify(budget)}, not a whole number of words of at least 1.`)
      continue
    }
    const means = policy[`${key}Means`]
    if (typeof means !== 'string' || !means.trim()) {
      problems.push(
        `${where} has no \`${key}Means\` sibling saying why the budget is what it is ` +
          '(`CLAUDE.md` § Three kinds of file, and never a fourth).',
      )
    }
    if (count > budget) {
      const counted = path.startsWith(`${WORKFLOWS_DIR}/`) ? ' in its string and template literals' : ''
      problems.push(
        `${path}: ${count} words${counted}, over its budget of ${budget} (\`${key}\` in ${POLICY}). ` +
          `Consolidate it to fit, or raise the budget there with the reason in \`${key}Means\`, which a person merges.`,
      )
    }
  }
  const keys = new Set(measured.map((m) => m.key))
  for (const key of Object.keys(policy).filter((k) => k.startsWith(BUDGET_PREFIX)).sort(byCodePoint)) {
    const base = key.endsWith('Means') ? key.slice(0, -'Means'.length) : key
    if (!keys.has(base)) {
      problems.push(
        `${POLICY} \`${key}\` is the budget of no prompt this gate reads, by the key the header of ` +
          'scripts/check-prompts.mjs names for each. Remove it with its sibling, or restore its prompt.',
      )
    }
  }
  return problems
}

/**
 * Run every assertion against the tree at `root`. Returns the failures rather than exiting, so the
 * selftest can run it against doctored copies.
 */
export function runCheck(root) {
  const failures = []
  const line = requiredLine(root)
  if (line === null) {
    failures.push(
      `CLAUDE.md under ${root} states no first line for a prompt: the bullet opening ` +
        `${JSON.stringify(RULE_LEAD)} is missing or has no closing quotation mark. The sentence has ` +
        `one home, ${RULE_HOME}; restore it there rather than stating it in this gate.`,
    )
    return { failures, skills: 0, agents: 0, measured: [] }
  }
  const found = prompts(root)
  if (found.length === 0) {
    failures.push(
      `found no skill under ${SKILLS_DIR}/ and no agent under ${AGENTS_DIR}/ in ${root}. A gate over ` +
        'nothing passes for the wrong reason; point PROMPTS_CHECK_ROOT at a checkout.',
    )
    return { failures, skills: 0, agents: 0, measured: [] }
  }
  for (const path of found) {
    const problem = openingProblem(readFileSync(join(root, path), 'utf8'), line)
    if (problem !== null) {
      failures.push(
        `${path}: ${problem}, not the line ${RULE_HOME} requires. Put it on the first line after ` +
          `the frontmatter, with a blank line either side: "${line}"`,
      )
    }
  }
  const measurement = measure(root)
  failures.push(...budgetProblems(root, measurement))
  return {
    failures,
    skills: found.filter((path) => path.startsWith(`${SKILLS_DIR}/`)).length,
    agents: found.filter((path) => path.startsWith(`${AGENTS_DIR}/`)).length,
    measured: measurement.measured,
  }
}

/* --------------------------------------------------------------------------------- the gate ----- */

function main() {
  const { failures, skills, agents, measured } = runCheck(ROOT)
  if (failures.length === 0) {
    const total = measured.reduce((sum, m) => sum + m.words, 0)
    const allowed = measured.reduce((sum, m) => sum + m.budget, 0)
    console.log(
      `prompts: ${skills} skill(s) and ${agents} agent(s) each open with the line ${RULE_HOME} requires, ` +
        `and ${measured.length} prompt(s) are each within the word budget ${POLICY} gives it ` +
        `(${total} words of ${allowed}).`,
    )
    process.exit(0)
  }
  console.error(`prompts: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/** `--counts`: every budgeted prompt's words beside its key and budget. It refuses nothing. */
function printCounts() {
  const { measured, unreadable } = measure(ROOT)
  if (unreadable !== null) console.log(`prompts: ${POLICY} could not be read (${unreadable}), so no budget is shown.\n`)
  const width = Math.max(3, ...measured.map((m) => m.key.length))
  console.log(`  ${'words'.padStart(6)}  ${'budget'.padStart(6)}  ${'key'.padEnd(width)}  path`)
  for (const m of measured) {
    const budget = Number.isInteger(m.budget) ? String(m.budget) : '-'
    console.log(`  ${String(m.words).padStart(6)}  ${budget.padStart(6)}  ${m.key.padEnd(width)}  ${m.path}`)
  }
  const whole = measured.filter((m) => Number.isInteger(m.budget))
  const over = whole.filter((m) => m.words > m.budget).length
  const under = whole.filter((m) => m.words < m.budget).length
  console.log(
    `\nprompts: ${measured.length} prompt(s): ${whole.length - over - under} at their budget, ${over} over it, ` +
      `${under} under it, and ${measured.length - whole.length} with no whole-number budget.`,
  )
}

/* --------------------------------------------------------------------------------- selftest ----- */

const LINE = 'Read the rules first. Everything below is subordinate to them.'

/** Wrapped across two lines on purpose, as the real bullet is. */
const RULES = `# Rules

- **The first line of every substantial skill and agent** is: "Read the rules first.
  Everything below is subordinate to them."
`

/**
 * A workflow whose literals hold 17 words, counted by hand: 'delta' and 'Do delta' (3), the rule (4),
 * the string after the division (1), the template's stretches and the string in its substitution
 * (6), and the two concatenated pieces (3). The comments, the regular expression holding every quote
 * mark and the joining newline hold none. A division read as a regular expression would swallow the
 * string after it.
 */
const WORKFLOW = [
  'export const meta = {',
  "  name: 'delta',",
  "  description: 'Do delta',",
  '}',
  '',
  '/*',
  " * The header: no word of it is counted, nor the 'quotes' or `ticks` in it.",
  ' */',
  '',
  "// A line comment, with a 'quote' and a `tick` of its own.",
  "const RULE = 'Read the rule first.'",
  'const QUOTES = /["\'`]\\/+/g',
  "const half = { of: 4 / 2, word: 'half' }",
  '',
  'function prompt(task) {',
  '  return [',
  '    `Work on ${task.id}',
  "in ${'the worktree'} now.`,",
  "    'Report ' + RULE + ' then stop.',",
  "  ].join('\\n')",
  '}',
  '',
].join('\n')

/** Each budgeted fixture file's key and its words, counted by hand, not by this gate. */
const BUDGETS = {
  '.claude/agents/gamma.md': ['promptWordBudgetAgentGamma', 18],
  '.claude/skills/alpha/SKILL.md': ['promptWordBudgetSkillAlpha', 18],
  '.claude/skills/beta/SKILL.md': ['promptWordBudgetSkillBeta', 18],
  '.claude/workflows/delta.js': ['promptWordBudgetWorkflowDelta', 17],
  '.claude/worktree-CONTEXT.md.tmpl': ['promptWordBudgetWorktreeContext', 7],
  'AGENTS.md': ['promptWordBudgetAgentsMd', 2],
  'CLAUDE.md': ['promptWordBudgetClaudeMd', 23],
}

const FIXTURE_POLICY = {
  describes: 'A fixture policy.',
  otherKey: 'a key of another tool, which the gate leaves alone',
  ...Object.fromEntries(
    Object.entries(BUDGETS).flatMap(([path, [key, budget]]) => [
      [key, budget],
      [`${key}Means`, `The most words ${path} may hold.`],
    ]),
  ),
}

const FIXTURE = {
  'CLAUDE.md': RULES,
  'AGENTS.md': 'Read `CLAUDE.md`.\n',
  '.claude/worktree-CONTEXT.md.tmpl': '# Local context\n\nYou are in {{WORKTREE_PATH}}.\n',
  '.claude/skills/alpha/SKILL.md': `---\nname: alpha\ndescription: first\n---\n\n${LINE}\n\nDo alpha.\n`,
  '.claude/skills/beta/SKILL.md': `---\nname: beta\ndescription: second\n---\n\n${LINE}\n\nDo beta.\n`,
  '.claude/agents/gamma.md': `---\nname: gamma\ndescription: third\n---\n\n${LINE}\n\nBe gamma.\n`,
  '.claude/workflows/delta.js': WORKFLOW,
  [POLICY]: `${JSON.stringify(FIXTURE_POLICY, null, 2)}\n`,
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-prompts-'))
  const results = []
  try {
    for (const { name, doctor, expect } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      writeTree(dir, FIXTURE)
      doctor(dir)
      const { failures } = runCheck(dir)
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
    `prompts selftest: ${results.length - failed.length}/${results.length} cases hold` +
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

/** Rewrite the fixture policy through `change`, which edits the parsed object in place. */
const editPolicy = (change) => (dir) =>
  edit(dir, POLICY, (text) => {
    const policy = JSON.parse(text)
    change(policy)
    return `${JSON.stringify(policy, null, 2)}\n`
  })

const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** The refusal of `path` at `count` words over `budget`, naming its key, anchored at the start. */
const refusedOver = (path, count, budget) =>
  new RegExp(`^${escaped(path)}: ${count} words(?: in its string and template literals)?, over its budget of ${budget} \\(\`${BUDGETS[path][0]}\` in tools/policy\\.json\\)`)

function cases() {
  const alpha = '.claude/skills/alpha/SKILL.md'
  const beta = '.claude/skills/beta/SKILL.md'
  const gamma = '.claude/agents/gamma.md'
  const delta = '.claude/workflows/delta.js'
  const refusedOpening = (path) => new RegExp(`^${escaped(path)}: its first line after the frontmatter is `)
  return [
    {
      name: 'control: the undoctored fixture passes',
      doctor: () => {},
      expect: 'pass',
    },
    {
      name: 'a skill without the line',
      doctor: (dir) => edit(dir, beta, (t) => t.replace(`${LINE}\n\n`, '')),
      expect: refusedOpening(beta),
    },
    {
      name: 'an agent without the line',
      doctor: (dir) => edit(dir, gamma, (t) => t.replace(`${LINE}\n\n`, '')),
      expect: refusedOpening(gamma),
    },
    {
      name: 'the line present, but not first',
      doctor: (dir) => edit(dir, beta, (t) => t.replace(`${LINE}\n\nDo beta.`, `Do beta.\n\n${LINE}`)),
      expect: refusedOpening(beta),
    },
    {
      name: 'the line reworded by one word',
      doctor: (dir) => edit(dir, beta, (t) => t.replace('Read the rules first.', 'Read the rules later.')),
      expect: refusedOpening(beta),
    },
    {
      name: 'a frontmatter that never closes',
      doctor: (dir) => edit(dir, beta, (t) => t.replace('description: second\n---\n', 'description: second\n')),
      expect: /^\.claude\/skills\/beta\/SKILL\.md: its frontmatter opens with `---` and never closes/,
    },
    {
      name: 'a prompt with nothing after its frontmatter',
      doctor: (dir) => edit(dir, beta, (t) => t.replace(/---\n\n[\s\S]*$/, '---\n')),
      expect: /^\.claude\/skills\/beta\/SKILL\.md: it has nothing after its frontmatter/,
    },
    {
      name: 'CLAUDE.md no longer states the line',
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => t.replace('substantial skill and agent', 'prompt')),
      expect: /^CLAUDE\.md under .* states no first line for a prompt/,
    },
    {
      name: 'no skill and no agent at all',
      doctor: (dir) => {
        rmSync(join(dir, '.claude/skills'), { recursive: true })
        rmSync(join(dir, '.claude/agents'), { recursive: true })
      },
      expect: /^found no skill under \.claude\/skills\/ and no agent under \.claude\/agents\//,
    },
    {
      name: 'a README beside the agents is not an agent, and passes without the line or a budget',
      doctor: (dir) => writeTree(dir, { '.claude/agents/README.md': '# Agents\n\nWhat each one does.\n' }),
      expect: 'pass',
    },
    {
      name: 'a skill one word over its budget, its frontmatter counted',
      doctor: (dir) => edit(dir, alpha, (t) => t.replace('Do alpha.', 'Do alpha now.')),
      expect: refusedOver(alpha, 19, 18),
    },
    {
      name: 'an agent one word over its budget',
      doctor: (dir) => edit(dir, gamma, (t) => t.replace('Be gamma.', 'Be gamma now.')),
      expect: refusedOver(gamma, 19, 18),
    },
    {
      name: 'CLAUDE.md one word over its budget',
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => t.replace('# Rules', '# The rules')),
      expect: refusedOver('CLAUDE.md', 24, 23),
    },
    {
      name: 'AGENTS.md one word over its budget',
      doctor: (dir) => edit(dir, 'AGENTS.md', (t) => t.replace('`CLAUDE.md`.', '`CLAUDE.md` first.')),
      expect: refusedOver('AGENTS.md', 3, 2),
    },
    {
      name: 'the worktree briefing one word over its budget',
      doctor: (dir) => edit(dir, TEMPLATE, (t) => t.replace('You are in', 'You are working in')),
      expect: refusedOver(TEMPLATE, 8, 7),
    },
    {
      name: "a word added to a workflow's template literal",
      doctor: (dir) => edit(dir, delta, (t) => t.replace(' now.`', ' right now.`')),
      expect: refusedOver(delta, 18, 17),
    },
    {
      name: "a word added to a string inside a template literal's substitution",
      doctor: (dir) => edit(dir, delta, (t) => t.replace("'the worktree'", "'the shared worktree'")),
      expect: refusedOver(delta, 18, 17),
    },
    {
      name: "a word added to a workflow's concatenated string",
      doctor: (dir) => edit(dir, delta, (t) => t.replace("' then stop.'", "' then stop there.'")),
      expect: refusedOver(delta, 18, 17),
    },
    {
      name: "words added to a workflow's comments are not counted, and it passes",
      doctor: (dir) => edit(dir, delta, (t) => t.replace(' * The header:', ' * The long header:').replace('// A line', '// A longer line')),
      expect: 'pass',
    },
    {
      name: 'a new skill with no budget',
      doctor: (dir) => writeTree(dir, { '.claude/skills/epsilon/SKILL.md': `---\nname: epsilon\n---\n\n${LINE}\n` }),
      expect: /^\.claude\/skills\/epsilon\/SKILL\.md has no word budget: tools\/policy\.json has no `promptWordBudgetSkillEpsilon`\. Add it, set to the 14 word\(s\)/,
    },
    {
      name: 'a new workflow with no budget',
      doctor: (dir) => writeTree(dir, { '.claude/workflows/new-flow.js': "export const meta = { name: 'new flow' }\n" }),
      expect: /^\.claude\/workflows\/new-flow\.js has no word budget: tools\/policy\.json has no `promptWordBudgetWorkflowNewFlow`\. Add it, set to the 2 word\(s\)/,
    },
    {
      name: 'a budget with no Means sibling',
      doctor: editPolicy((p) => delete p.promptWordBudgetSkillBetaMeans),
      expect: /^tools\/policy\.json `promptWordBudgetSkillBeta` has no `promptWordBudgetSkillBetaMeans` sibling/,
    },
    {
      name: 'a budget that is not a whole number',
      doctor: editPolicy((p) => {
        p.promptWordBudgetAgentGamma = '18'
      }),
      expect: /^tools\/policy\.json `promptWordBudgetAgentGamma` is "18", not a whole number of words of at least 1/,
    },
    {
      name: 'a budget that names no prompt',
      doctor: editPolicy((p) => {
        p.promptWordBudgetSkillRetired = 10
        p.promptWordBudgetSkillRetiredMeans = 'The most words a retired skill may hold.'
      }),
      expect: /^tools\/policy\.json `promptWordBudgetSkillRetired` is the budget of no prompt this gate reads/,
    },
    {
      name: 'no policy file',
      doctor: (dir) => rmSync(join(dir, POLICY)),
      expect: /^tools\/policy\.json under .* could not be read \(.*\), and every prompt's word budget is there/,
    },
  ]
}

if (process.argv.includes('--selftest')) selftest()
else if (process.argv.includes('--counts')) printCounts()
else main()
