/**
 * Prompt gate. It holds every prompt to two things.
 *
 * THE OPENING LINE. Every skill (`.claude/skills/<name>/SKILL.md`) and every agent
 * (`.claude/agents/*.md`) opens, on the first line after its frontmatter, with the sentence
 * CLAUDE.md § Standing rules for prompts and gates requires. The sentence is read out of `CLAUDE.md`
 * on every run, so it has one home and this file states it nowhere.
 *
 * THE WORD BUDGET. Every prompt is held to a word budget, a row of its own in the table
 * `promptWordBudgets` of `tools/policy/prompt-budgets.json`: every skill and every agent, `CLAUDE.md`,
 * `AGENTS.md`, `.claude/worktree-CONTEXT.md.tmpl` (the briefing `CLAUDE.md` imports in a worktree),
 * `.beads/PRIME.md` (what `bd prime` prints in place of its own text when the tracker's plugin runs it
 * at a session's start and before a compaction), each workflow under `.claude/workflows/`, and each
 * hook under `scripts/hooks/` but its selftests (`docs/decisions.md` § D-59). A prompt over its
 * budget is refused, and so is a prompt with none, so a new prompt gets one when it lands. A word is
 * a whitespace-separated token. A markdown prompt, the briefing and `.beads/PRIME.md` are counted
 * whole, frontmatter included. A workflow is counted on the text of its string and template
 * literals, cooked as the runtime cooks them, and on nothing else: that text is what its agents
 * receive, and what its caller reads back, whether a prompt is written as one template literal or
 * concatenated from pieces. A hook is counted the same way, `_shared.mjs` among them: a refusal is
 * text the blocked session reads and acts on (`CLAUDE.md` § Guards), and a hook prints the redirect
 * text `_shared.mjs` holds, while its header, which keeps its incident, is a comment.
 *
 * A row is keyed by the prompt's repository-relative path and holds `words`, the budget, and
 * `means`, the reason it is that figure (`docs/decisions.md` § D-27). A budget rises only by an edit
 * to its row, with the reason in its `means`, and `prReviewHighRiskPaths` names the record, so a
 * person merges every such edit. A row that names no prompt is refused, so a retired prompt's budget
 * goes with it. Until D-27 each budget was a key of `tools/policy.json` whose name this gate built
 * from the path, `.claude/skills/open-pr/SKILL.md` as `promptWordBudgetSkillOpenPr`.
 *
 * THE INCIDENT LIST, a flag and not a check: it refuses nothing. CLAUDE.md § Standing rules for
 * prompts and gates says a prompt carries no incident, and `--incidents` lists each line that holds
 * the marks of a dated one, for a person or a prompt review to read: an ISO date, alone or in a
 * timestamp; a tracker id, in the shape `prReviewIssuePattern` in `tools/policy/pr-review.json`
 * gives; a pull request number, `#` and digits; or a Workflow tool run id, `wf_`, eight hex digits,
 * a dash and three. A markdown prompt is read line by line, frontmatter included. A workflow is read
 * only in its string and template literals, cooked, each line of a literal numbered by the source
 * line it starts on, so a dated incident in its header comment, where CLAUDE.md keeps a script's
 * incident, is not listed. Each row is `  <path>:<line>  dated: <marks>`, the form
 * `scripts/prompt-incidents.mjs` prints its rows in, `undated:` and a probability, for the paragraphs
 * a language model judges to tell an incident with none of these marks: the two read as one list. A
 * hook is read as a workflow is, in its literals alone, so its header's incident is not listed.
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
 * whitespace. The hooks came under the budget on 2026-10-08 (`docs/decisions.md` § D-59): until then
 * nothing read the text a hook refuses with, though `CLAUDE.md` § Guards has a session do what it says.
 *
 * The incident list has no incident yet: on 2026-10-05, at 158b73e, `git grep` for a date, a
 * tracker id or a `#` and two digits over `CLAUDE.md`, the skills, the agents and the briefing found
 * none (asdlc-openspec-r6ha.3), and the list guards against a prompt review's edit bringing one back
 * unseen. Were it wrong, it would let through an incident told in a form it does not match: one with
 * no date, id or number, which `scripts/prompt-incidents.mjs` judges; a date spelled out, or "pull
 * request 147"; and a tracker id of another shape once the tracker's prefix moves and the policy key
 * does not. It would list, too, a line that holds such a mark for another reason, such as an example
 * of an id's form, which a reader sets aside. Its first run over the hooks, on 2026-10-08, listed
 * one line: a tracker id in `guard-git.mjs`'s refusal of a bare `git worktree prune`, taken out by
 * the change that brought the hooks in, since the guard's header keeps that incident.
 *
 * INVOCATION.
 *
 *   mise run check:prompts                     the gate
 *   mise run check:prompts:selftest            its fixtures -- every refusal exercised on a doctored copy
 *   node scripts/check-prompts.mjs --counts   every prompt's words and its budget, in code-point
 *                                             order of path; it refuses nothing
 *   node scripts/check-prompts.mjs --incidents
 *                                             each prompt line holding a date, a tracker id, a
 *                                             pull request number or a workflow run id, as
 *                                             `<path>:<line>`, in code-point order of path; it
 *                                             refuses nothing, and exits 0
 *
 * NO EXEMPTION. `CLAUDE.md` asks the line of every skill and agent, and this gate asks it of each.
 * Until 2026-10-10 (asdlc-openspec-phmi) the bullet asked it of every *substantial* one, while this
 * gate already asked it of all, because the line costs one line and deciding what is substantial is
 * how six were skipped. A prompt that should go without it is named in `.claude/README.md` with its reason and
 * added to a table here in the same change; there is none today. No prompt goes without a budget.
 *
 * A HEURISTIC, NOT A PARSER, reads a workflow or a hook. No JavaScript parser is a dependency here,
 * and adding one changes `package-lock.json`, which `prReviewHighRiskPaths` gives a person to merge.
 * The tokeniser below skips line and block comments, and skips a regular expression where a `/`
 * stands where an operand is expected, judged from the token before it as a JavaScript tokeniser
 * judges it. It follows a template literal into each substitution and back, so a string inside
 * `${...}` is counted too. The selftest pins its count of a fixture workflow and a fixture hook to
 * counts made by hand, with a regular expression holding every quote mark and a comment holding
 * quoted words. On 2026-10-08 its count of each of the eight hooks' literals equalled the count of
 * the same literals that `@babel/parser`, which Stryker installs, gave.
 *
 * WHAT IS NOT CHECKED. A prompt's cost in tokens: code blocks, paths and commands cost more tokens
 * per word than prose, so a prompt that swaps prose for them stays under its budget while its cost
 * rises. A workflow's or a hook's code, its comments, and any text it builds from other than a
 * literal; a literal that is not prompt text, such as a schema's type name, an import's specifier or a
 * flag a guard matches, is counted anyway. A hook's selftest, which no session reads. A file beside a
 * `SKILL.md` in its skill's directory, of which none is tracked, and a `README.md` under
 * `.claude/agents/`, which describes the agents and is not one. The opening line of `CLAUDE.md`,
 * `AGENTS.md`, the briefing, `.beads/PRIME.md`, a workflow and a hook, none of which is a skill or an
 * agent.
 * A `Reviewed:` trailer is not refused here: prompts carry none since `docs/decisions.md` § D-05, and
 * review is what holds that.
 *
 * NEGATIVE TESTING. `--selftest` builds a fixture tree under `os.tmpdir()`, doctors ONE thing per
 * case and asserts the run fails FOR THAT REASON, plus an undoctored control that must pass and
 * that `--incidents` must list nothing in. An incident case asserts the exact rows `--incidents`
 * lists, one mark or one place it must not look per case, and one runs it as a process. By
 * hand, point `PROMPTS_CHECK_ROOT` at a doctored copy:
 *
 *   PROMPTS_CHECK_ROOT=/tmp/doctored node scripts/check-prompts.mjs
 *
 * NEEDS only committed files: `CLAUDE.md`, the prompts and the records under `tools/policy/`, read
 * through `tools/lib/policy.ts`, `--incidents` reading `prReviewIssuePattern` there and saying so
 * when it cannot. No tool, no network.
 * 0.08 s wall for the gate and 0.15 s for its selftest through `node --run` (`/usr/bin/time -p`,
 * two runs each, both alike) on a macOS 26.7 laptop with Node 26.8.1, 2026-09-26.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { editPolicy, POLICY_DIR, readPolicy } from '../tools/lib/policy.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.PROMPTS_CHECK_ROOT ?? REPO_ROOT

const SKILLS_DIR = '.claude/skills'
const AGENTS_DIR = '.claude/agents'
const WORKFLOWS_DIR = '.claude/workflows'
/** The Claude Code hooks, whose refusals a blocked session reads and acts on (docs/decisions.md § D-59). */
const HOOKS_DIR = 'scripts/hooks'
const TEMPLATE = '.claude/worktree-CONTEXT.md.tmpl'
/** What `bd prime` prints in place of its own text, at every session start and compaction. */
const PRIME = '.beads/PRIME.md'
/** The record that holds the budgets, named in every message; the loader reads every record. */
const BUDGETS = 'tools/policy/prompt-budgets.json'
/** The constant in that record: a table from a prompt's path to `{ words, means }`. */
const TABLE = 'promptWordBudgets'
const RULE_HOME = 'CLAUDE.md § Standing rules for prompts and gates'
/** The bullet in `CLAUDE.md` that carries the sentence, up to the quotation mark that opens it. */
const RULE_LEAD = '**The first line of every skill and agent** is: "'
/** The prompts outside the three directories. */
const SINGLE_PROMPTS = ['AGENTS.md', 'CLAUDE.md', TEMPLATE, PRIME]

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

/**
 * Every prompt the budget covers under `root`: the skills and agents, the workflows, the hooks but
 * their selftests, and the single files.
 */
export function budgeted(root) {
  const found = prompts(root)
  const workflows = join(root, WORKFLOWS_DIR)
  if (existsSync(workflows)) {
    for (const name of readdirSync(workflows)) if (name.endsWith('.js')) found.push(`${WORKFLOWS_DIR}/${name}`)
  }
  const hooks = join(root, HOOKS_DIR)
  if (existsSync(hooks)) {
    for (const name of readdirSync(hooks)) {
      if (name.endsWith('.mjs') && !name.endsWith('.selftest.mjs')) found.push(`${HOOKS_DIR}/${name}`)
    }
  }
  for (const path of SINGLE_PROMPTS) if (existsSync(join(root, path))) found.push(path)
  return found.sort(byCodePoint)
}

/** Whether the prompt at `path` is code, counted and read in its string and template literals alone. */
const inLiterals = (path) => path.startsWith(`${WORKFLOWS_DIR}/`) || path.startsWith(`${HOOKS_DIR}/`)

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
export const literalTexts = (source) => literalSpans(source).map((span) => span.text)

/**
 * `literalTexts` with where each character came from: `{ text, at }`, where `at[k]` is the offset in
 * `source` of the character, or the escape, that cooked to `text[k]`.
 */
export function literalSpans(source) {
  const texts = []
  const n = source.length
  let i = 0
  let at = []

  /** Append `cooked`, which began at `from` in the source. */
  const add = (text, cooked, from) => {
    for (let k = 0; k < cooked.length; k++) at.push(from)
    return text + cooked
  }
  const push = (text) => {
    texts.push({ text, at })
    at = []
  }

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
      const from = i
      text = add(text, source[i] === '\\' ? escape() : source[i++], from)
    }
    i++
    push(text)
  }

  const template = () => {
    let text = ''
    i++
    while (i < n && source[i] !== '`') {
      if (source[i] === '$' && source[i + 1] === '{') {
        push(text)
        text = ''
        i += 2
        code(true)
      } else {
        const from = i
        text = add(text, source[i] === '\\' ? escape() : source[i++], from)
      }
    }
    i++
    push(text)
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

/** The words of the prompt at `path`: a workflow's or a hook's literals, or any other prompt whole. */
function countWords(root, path) {
  const text = readFileSync(join(root, path), 'utf8')
  return inLiterals(path) ? words(literalTexts(text).join('\n')) : words(text)
}

/* ------------------------------------------------------------------------------ the lines ----- */

/** The 1-based line of `source` that holds offset `offset`, from the offsets each line starts at. */
function lineAt(starts, offset) {
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (starts[mid] <= offset) low = mid
    else high = mid - 1
  }
  return low + 1
}

/**
 * The lines of the prompt at `path` as its agents read them, each `{ line, text, literal }`: every
 * line of a markdown prompt, frontmatter included, all of `literal` -1; and every line of each string
 * and template literal of a workflow or a hook, cooked, numbered by the source line its first
 * character comes from and carrying the literal's index, so a reader keeps two literals apart. Their
 * comments and code give none. A line of a literal that is empty has `line` null, since no character
 * places it.
 */
export function promptLines(root, path) {
  const source = readFileSync(join(root, path), 'utf8')
  if (!inLiterals(path)) {
    return source.split(/\r?\n/).map((text, i) => ({ line: i + 1, text, literal: -1 }))
  }
  const starts = [0]
  for (let i = 0; i < source.length; i++) if (source[i] === '\n') starts.push(i + 1)
  const lines = []
  literalSpans(source).forEach(({ text, at }, literal) => {
    let from = 0
    for (const piece of text.split('\n')) {
      lines.push({ line: piece === '' ? null : lineAt(starts, at[from]), text: piece, literal })
      from += piece.length + 1
    }
  })
  return lines
}

/* ------------------------------------------------------------------------- the incidents ----- */

/** The key, in `tools/policy/pr-review.json`, whose value is the shape of a tracker id. */
const ISSUE_PATTERN_KEY = 'prReviewIssuePattern'

/** The marks of a dated incident beside the tracker id: an ISO date, a pull request number, a run id. */
const DATED_MARKS = ['\\b\\d{4}-\\d{2}-\\d{2}\\b', '(?<![\\w&])#\\d+\\b', '\\bwf_[0-9a-f]{8}-[0-9a-f]{3}\\b']

/** The tracker id's shape from the policy under `root`, or why it could not be read. */
function trackerPattern(root) {
  try {
    const pattern = readPolicy(root)[ISSUE_PATTERN_KEY]
    if (typeof pattern !== 'string' || pattern === '') throw new Error(`\`${ISSUE_PATTERN_KEY}\` is ${pattern === undefined ? 'missing' : 'not a pattern'}`)
    new RegExp(pattern)
    return { pattern, unreadable: null }
  } catch (error) {
    return { pattern: null, unreadable: error.message }
  }
}

/** One row of the incident list, in the form both halves print it: `--incidents` here, `dated:`. */
export const incidentRow = (path, line, what) => `  ${path}:${line}  ${what}`

/**
 * The expression, global, that finds every mark of a dated incident in a line of a prompt under
 * `root`, and why the tracker id's shape could not be read, or null; without it, no tracker id is a mark.
 */
export function incidentMarker(root) {
  const { pattern, unreadable } = trackerPattern(root)
  return { marker: new RegExp([...DATED_MARKS, ...(pattern === null ? [] : [`(?:${pattern})`])].join('|'), 'g'), unreadable }
}

/**
 * Every line of every prompt under `root` that holds a mark of a dated incident, as
 * `{ path, line, marks }` in code-point order of path and then by line, two literals on one source
 * line giving one row; the count of prompts read; and why the tracker id's shape could not be read,
 * or null, in which case no tracker id is listed and every other mark still is.
 */
export function listIncidents(root) {
  const { marker, unreadable } = incidentMarker(root)
  const rows = []
  const paths = budgeted(root)
  for (const path of paths) {
    for (const { line, text } of promptLines(root, path)) {
      const marks = text.match(marker)
      if (marks === null) continue
      const last = rows.at(-1)
      if (last?.path === path && last.line === line) last.marks.push(...marks)
      else rows.push({ path, line, marks: [...marks] })
    }
  }
  for (const row of rows) row.marks = [...new Set(row.marks)]
  return { rows, prompts: paths.length, unreadable }
}

/**
 * Every budgeted prompt under `root`, as { path, words, budget, means }, and the table, or why it
 * could not be read. `budget` and `means` are whatever the prompt's row holds, or undefined.
 */
export function measure(root) {
  const measured = budgeted(root).map((path) => ({ path, words: countWords(root, path) }))
  let table = null
  let unreadable = null
  try {
    table = readPolicy(root)[TABLE]
    if (!isRecord(table)) throw new Error(`\`${TABLE}\` in ${BUDGETS} is ${table === undefined ? 'missing' : 'not a table keyed by path'}`)
  } catch (error) {
    table = null
    unreadable = error.message
  }
  for (const m of measured) {
    const row = table?.[m.path]
    m.budget = isRecord(row) ? row.words : row
    m.means = isRecord(row) ? row.means : undefined
    m.row = row
  }
  return { measured, table, unreadable }
}

/** Why the prompts under `root` break their budgets, one message per problem. */
function budgetProblems(root, { measured, table, unreadable }) {
  if (unreadable !== null) {
    return [`${POLICY_DIR}/ under ${root} could not be read (${unreadable}), and every prompt's word budget is there.`]
  }
  const problems = []
  for (const { path, words: count, budget, means, row } of measured) {
    const where = `${BUDGETS} \`${TABLE}\` row for ${path}`
    if (row === undefined) {
      problems.push(
        `${path} has no word budget: ${BUDGETS} has no row for it. Add one, set to the ${count} word(s) the ` +
          'prompt holds now, with a `means` saying why.',
      )
      continue
    }
    if (!Number.isInteger(budget) || budget < 1) {
      problems.push(`${where} has words ${JSON.stringify(budget)}, not a whole number of words of at least 1.`)
      continue
    }
    if (typeof means !== 'string' || !means.trim()) {
      problems.push(
        `${where} has no \`means\` saying why the budget is what it is ` +
          '(`CLAUDE.md` § Three kinds of file, and never a fourth).',
      )
    }
    if (count > budget) {
      const counted = inLiterals(path) ? ' in its string and template literals' : ''
      problems.push(
        `${path}: ${count} words${counted}, over its budget of ${budget} (its row in ${BUDGETS}). ` +
          'Consolidate it first, as `.claude/agents/continuous-prompt-improvement.md` § How a prompt is consolidated says, ' +
          "and raise the budget there only by what that does not free, with the reason in the row's `means`; a person merges a raise.",
      )
    }
  }
  const paths = new Set(measured.map((m) => m.path))
  for (const path of Object.keys(table).sort(byCodePoint)) {
    if (!paths.has(path)) {
      problems.push(
        `${BUDGETS} \`${TABLE}\` has a row for ${path}, which is no prompt this gate reads. ` +
          'Remove the row, or restore its prompt.',
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
        `and ${measured.length} prompt(s) are each within the word budget ${BUDGETS} gives it ` +
        `(${total} words of ${allowed}).`,
    )
    process.exit(0)
  }
  console.error(`prompts: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/** `--counts`: every budgeted prompt's words beside its budget. It refuses nothing. */
function printCounts() {
  const { measured, unreadable } = measure(ROOT)
  if (unreadable !== null) console.log(`prompts: ${POLICY_DIR}/ could not be read (${unreadable}), so no budget is shown.\n`)
  console.log(`  ${'words'.padStart(6)}  ${'budget'.padStart(6)}  path`)
  for (const m of measured) {
    const budget = Number.isInteger(m.budget) ? String(m.budget) : '-'
    console.log(`  ${String(m.words).padStart(6)}  ${budget.padStart(6)}  ${m.path}`)
  }
  const whole = measured.filter((m) => Number.isInteger(m.budget))
  const over = whole.filter((m) => m.words > m.budget).length
  const under = whole.filter((m) => m.words < m.budget).length
  console.log(
    `\nprompts: ${measured.length} prompt(s): ${whole.length - over - under} at their budget, ${over} over it, ` +
      `${under} under it, and ${measured.length - whole.length} with no whole-number budget.`,
  )
}

/** The list `--incidents` prints, from what `listIncidents` found. */
export function incidentReport({ rows, prompts, unreadable }) {
  const lines = []
  if (unreadable !== null) {
    lines.push(`prompts --incidents: ${POLICY_DIR}/ gives no tracker id's shape (${unreadable}), so no tracker id is listed.`)
  }
  const held = new Set(rows.map((row) => row.path)).size
  lines.push(
    `prompts --incidents: ${rows.length} line(s) in ${held} of ${prompts} prompt(s) hold a date, a tracker id, a pull ` +
      `request number or a workflow run id, the marks of an incident ${RULE_HOME} keeps out of a prompt. ` +
      'It refuses nothing.',
  )
  if (rows.length > 0) lines.push('')
  for (const { path, line, marks } of rows) lines.push(incidentRow(path, line, `dated: ${marks.join(', ')}`))
  return lines.join('\n')
}

/* --------------------------------------------------------------------------------- selftest ----- */

const LINE = 'Read the rules first. Everything below is subordinate to them.'

/** Wrapped across two lines on purpose, as the real bullet is. */
const RULES = `# Rules

- **The first line of every skill and agent** is: "Read the rules first.
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

/**
 * A hook whose literals hold 6 words, counted by hand: the import's specifier (1), the refusal (4),
 * and the template's stretch before its substitution (1); the stretch after it is a newline. Its
 * header, and the 'quotes' in it, hold none.
 */
const HOOK = [
  '/**',
  " * A hook's header: no word of it is counted, nor its 'quotes'.",
  ' */',
  "import { readHookInput } from './_shared.mjs'",
  '',
  "const REASON = 'Leave this worktree first.'",
  'process.stderr.write(`BLOCKED: ${REASON}\\n`)',
  '',
].join('\n')

/** Each budgeted fixture file's words, counted by hand, not by this gate. */
const FIXTURE_BUDGETS = {
  '.beads/PRIME.md': 6,
  '.claude/agents/gamma.md': 18,
  '.claude/skills/alpha/SKILL.md': 18,
  '.claude/skills/beta/SKILL.md': 18,
  '.claude/workflows/delta.js': 17,
  '.claude/worktree-CONTEXT.md.tmpl': 7,
  'AGENTS.md': 2,
  'CLAUDE.md': 22,
  'scripts/hooks/guard-epsilon.mjs': 6,
}

/** The fixture's budgets record, and a second record the gate reads past, as the live policy has. */
const FIXTURE_RECORD = {
  describes: 'A fixture policy.',
  [TABLE]: Object.fromEntries(
    Object.entries(FIXTURE_BUDGETS).map(([path, words]) => [path, { words, means: `The most words ${path} may hold.` }]),
  ),
  [`${TABLE}Means`]: 'The fixture budgets.',
}
const OTHER_RECORD = 'tools/policy/other.json'
/** The fixture's tracker id shape, its own prefix, so a case can tell the policy's shape from a spelled one. */
const OTHER_CONSTANTS = {
  otherKey: 'a key of another tool, which the gate leaves alone',
  [ISSUE_PATTERN_KEY]: 'fixture-[a-z0-9]+(?:\\.[0-9]+)*',
}

const FIXTURE = {
  'CLAUDE.md': RULES,
  'AGENTS.md': 'Read `CLAUDE.md`.\n',
  [PRIME]: 'Read `CLAUDE.md` § The task store.\n',
  '.claude/worktree-CONTEXT.md.tmpl': '# Local context\n\nYou are in {{WORKTREE_PATH}}.\n',
  '.claude/skills/alpha/SKILL.md': `---\nname: alpha\ndescription: first\n---\n\n${LINE}\n\nDo alpha.\n`,
  '.claude/skills/beta/SKILL.md': `---\nname: beta\ndescription: second\n---\n\n${LINE}\n\nDo beta.\n`,
  '.claude/agents/gamma.md': `---\nname: gamma\ndescription: third\n---\n\n${LINE}\n\nBe gamma.\n`,
  '.claude/workflows/delta.js': WORKFLOW,
  'scripts/hooks/guard-epsilon.mjs': HOOK,
  // A hook's selftest is no prompt: it has no budget row, and the control passes with it here.
  'scripts/hooks/guard-epsilon.selftest.mjs': "console.log('the hook refuses what it should, by its reason')\n",
  [BUDGETS]: `${JSON.stringify(FIXTURE_RECORD, null, 2)}\n`,
  [OTHER_RECORD]: `${JSON.stringify(OTHER_CONSTANTS, null, 2)}\n`,
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-prompts-'))
  const results = []
  try {
    for (const { name, doctor, expect, listed, says, run } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      writeTree(dir, FIXTURE)
      doctor(dir)
      const held = []
      const problems = []
      if (expect !== undefined) {
        const { failures } = runCheck(dir)
        if (expect === 'pass') {
          if (failures.length === 0) held.push('passes')
          else problems.push(`unexpected failure(s): ${failures.join(' | ')}`)
        } else if (failures.some((failure) => expect.test(failure))) {
          held.push(`fails for that reason (${failures.length} failure(s))`)
        } else {
          problems.push(failures.length === 0 ? 'PASSED, but should have failed' : `failed, but not for that reason: ${failures.join(' | ')}`)
        }
      }
      if (listed !== undefined) {
        const report = incidentReport(listIncidents(dir))
        const rows = report.split('\n').filter((line) => line.startsWith('  '))
        if (JSON.stringify(rows) === JSON.stringify(listed)) held.push(`lists ${rows.length === 0 ? 'nothing' : rows.map((row) => row.trim()).join(' | ')}`)
        else problems.push(`--incidents listed ${JSON.stringify(rows)}, not ${JSON.stringify(listed)}`)
        if (says !== undefined && !says.test(report)) problems.push(`--incidents does not say ${says}: ${JSON.stringify(report)}`)
      }
      if (run !== undefined) {
        const problem = run(dir)
        if (problem === null) held.push('as a process too')
        else problems.push(problem)
      }
      const ok = problems.length === 0 && held.length > 0
      const detail = ok ? held.join('; ') : problems.join('; ') || 'the case asserts nothing'
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

/** Rewrite the fixture's budgets through `change`, which edits the table in place, as the loader does. */
const editTable = (change) => (dir) => editPolicy(dir, (policy) => change(policy[TABLE]))

const escaped = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** The refusal of `path` at `count` words over `budget`, naming its record, anchored at the start. */
const refusedOver = (path, count, budget) =>
  new RegExp(`^${escaped(path)}: ${count} words(?: in its string and template literals)?, over its budget of ${budget} \\(its row in tools/policy/prompt-budgets\\.json\\)`)

function cases() {
  const alpha = '.claude/skills/alpha/SKILL.md'
  const beta = '.claude/skills/beta/SKILL.md'
  const gamma = '.claude/agents/gamma.md'
  const delta = '.claude/workflows/delta.js'
  const epsilon = 'scripts/hooks/guard-epsilon.mjs'
  const refusedOpening = (path) => new RegExp(`^${escaped(path)}: its first line after the frontmatter is `)
  return [
    {
      name: 'control: the undoctored fixture passes, and --incidents lists nothing',
      doctor: () => {},
      expect: 'pass',
      listed: [],
      says: /^prompts --incidents: 0 line\(s\) in 0 of 9 prompt\(s\) hold a date, a tracker id, a pull request number or a workflow run id/,
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
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => t.replace('every skill and agent', 'every prompt')),
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
      expect: refusedOver('CLAUDE.md', 23, 22),
    },
    {
      name: 'AGENTS.md one word over its budget',
      doctor: (dir) => edit(dir, 'AGENTS.md', (t) => t.replace('`CLAUDE.md`.', '`CLAUDE.md` first.')),
      expect: refusedOver('AGENTS.md', 3, 2),
    },
    {
      name: "the tracker's session text one word over its budget",
      doctor: (dir) => edit(dir, PRIME, (t) => t.replace('task store.', 'task store first.')),
      expect: refusedOver(PRIME, 7, 6),
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
      name: "a word added to a hook's refusal, counted in its literals",
      doctor: (dir) => edit(dir, epsilon, (t) => t.replace('worktree first.', 'worktree right away.')),
      expect: new RegExp(`^${escaped(epsilon)}: 7 words in its string and template literals, over its budget of 6 `),
    },
    {
      name: "words added to a hook's header are not counted, and it passes",
      doctor: (dir) => edit(dir, epsilon, (t) => t.replace(" * A hook's header:", " * A hook's long header, with its incident:")),
      expect: 'pass',
    },
    {
      name: 'a new hook with no budget',
      doctor: (dir) => writeTree(dir, { 'scripts/hooks/guard-zeta.mjs': "process.stderr.write('Stop here.')\n" }),
      expect: /^scripts\/hooks\/guard-zeta\.mjs has no word budget: tools\/policy\/prompt-budgets\.json has no row for it\. Add one, set to the 2 word\(s\)/,
    },
    {
      name: "a row for a hook's selftest names no prompt",
      doctor: editTable((t) => {
        t['scripts/hooks/guard-epsilon.selftest.mjs'] = { words: 8, means: 'The most words the selftest may hold.' }
      }),
      expect: /^tools\/policy\/prompt-budgets\.json `promptWordBudgets` has a row for scripts\/hooks\/guard-epsilon\.selftest\.mjs, which is no prompt this gate reads/,
    },
    {
      name: 'a new skill with no budget',
      doctor: (dir) => writeTree(dir, { '.claude/skills/epsilon/SKILL.md': `---\nname: epsilon\n---\n\n${LINE}\n` }),
      expect: /^\.claude\/skills\/epsilon\/SKILL\.md has no word budget: tools\/policy\/prompt-budgets\.json has no row for it\. Add one, set to the 14 word\(s\)/,
    },
    {
      name: 'a new workflow with no budget',
      doctor: (dir) => writeTree(dir, { '.claude/workflows/new-flow.js': "export const meta = { name: 'new flow' }\n" }),
      expect: /^\.claude\/workflows\/new-flow\.js has no word budget: tools\/policy\/prompt-budgets\.json has no row for it\. Add one, set to the 2 word\(s\)/,
    },
    {
      name: 'a row with no reason',
      doctor: editTable((t) => delete t['.claude/skills/beta/SKILL.md'].means),
      expect: /^tools\/policy\/prompt-budgets\.json `promptWordBudgets` row for \.claude\/skills\/beta\/SKILL\.md has no `means`/,
    },
    {
      name: 'a budget that is not a whole number',
      doctor: editTable((t) => {
        t['.claude/agents/gamma.md'].words = '18'
      }),
      expect: /^tools\/policy\/prompt-budgets\.json `promptWordBudgets` row for \.claude\/agents\/gamma\.md has words "18", not a whole number of words of at least 1/,
    },
    {
      name: 'a row that names no prompt',
      doctor: editTable((t) => {
        t['.claude/skills/retired/SKILL.md'] = { words: 10, means: 'The most words a retired skill may hold.' }
      }),
      expect: /^tools\/policy\/prompt-budgets\.json `promptWordBudgets` has a row for \.claude\/skills\/retired\/SKILL\.md, which is no prompt this gate reads/,
    },
    {
      name: 'no table in the policy',
      doctor: (dir) => rmSync(join(dir, BUDGETS)),
      expect: /^tools\/policy\/ under .* could not be read \(`promptWordBudgets` in tools\/policy\/prompt-budgets\.json is missing\), and every prompt's word budget is there/,
    },
    {
      name: 'the table defined in two records',
      doctor: (dir) => writeTree(dir, { [OTHER_RECORD]: `${JSON.stringify({ [TABLE]: {} })}\n` }),
      expect: /^tools\/policy\/ under .* could not be read \(`promptWordBudgets` is defined in both tools\/policy\/other\.json and tools\/policy\/prompt-budgets\.json/,
    },
    // --incidents: one mark, or one place it must not look, per case. Each row is matched whole.
    {
      name: 'a date in a skill is listed by its line, and the gate, which it does not touch, still passes',
      doctor: (dir) => edit(dir, alpha, (t) => t.replace('Do alpha.', 'Done 2026-09-23.')),
      expect: 'pass',
      listed: [`  ${alpha}:8  dated: 2026-09-23`],
      says: /^prompts --incidents: 1 line\(s\) in 1 of 9 prompt\(s\) hold a date/,
    },
    {
      name: "a tracker id in a hook's refusal is listed by its line",
      doctor: (dir) => edit(dir, epsilon, (t) => t.replace('worktree first.', 'worktree first (fixture-486e).')),
      listed: [`  ${epsilon}:6  dated: fixture-486e`],
    },
    {
      name: "a dated incident in a hook's header is not listed, and is not counted",
      doctor: (dir) => edit(dir, epsilon, (t) => t.replace(" * A hook's header:", " * A hook's header, from 2026-10-06 (fixture-486e):")),
      expect: 'pass',
      listed: [],
    },
    {
      name: "a tracker id in an agent, a child's dotted suffix and all, in the policy's shape",
      doctor: (dir) => edit(dir, gamma, (t) => t.replace('Be gamma.', 'Be fixture-r6ha.3.')),
      listed: [`  ${gamma}:8  dated: fixture-r6ha.3`],
    },
    {
      name: "an id in another tracker's shape is not listed: the shape is the policy's, not spelled here",
      doctor: (dir) => edit(dir, gamma, (t) => t.replace('Be gamma.', 'Be asdlc-openspec-44p.')),
      listed: [],
    },
    {
      name: 'a pull request number in CLAUDE.md, beside a heading whose # is no number',
      doctor: (dir) => edit(dir, 'CLAUDE.md', (t) => t.replace('# Rules', '# Rules, since #147')),
      // Built, so the citations gate does not read the row as a pointer into this checkout's CLAUDE.md.
      listed: [`  ${'CLAUDE.md'}:1  dated: #147`],
    },
    {
      name: 'an HTML entity and a fragment after a name are not pull request numbers',
      doctor: (dir) => edit(dir, PRIME, (t) => `${t}See &#169; and notes.md#12.\n`),
      listed: [],
    },
    {
      name: "a frontmatter line is read, as the skill's description loads",
      doctor: (dir) => edit(dir, beta, (t) => t.replace('description: second', 'description: second, since 2026-09-23')),
      listed: [`  ${beta}:3  dated: 2026-09-23`],
    },
    {
      name: "a workflow run id in a workflow's string literal",
      doctor: (dir) => edit(dir, delta, (t) => t.replace("'Read the rule first.'", "'Read the rule first, as wf_5aec3e94-07b did.'")),
      listed: [`  ${delta}:11  dated: wf_5aec3e94-07b`],
    },
    {
      name: "a date on a template literal's second line is listed by that line, not the line its stretch opens on",
      doctor: (dir) => edit(dir, delta, (t) => t.replace("in ${'the worktree'}", "in 2026-09-29 ${'the worktree'}")),
      listed: [`  ${delta}:18  dated: 2026-09-29`],
    },
    {
      name: 'two literals on one source line give one row, holding both marks',
      doctor: (dir) => edit(dir, delta, (t) => t.replace("'Report ' + RULE + ' then stop.'", "'Report #12' + RULE + ' then stop 2026-01-01.'")),
      listed: [`  ${delta}:19  dated: #12, 2026-01-01`],
    },
    {
      name: "a dated incident in a workflow's header comment is not listed, and is not counted",
      doctor: (dir) => edit(dir, delta, (t) => t.replace(' * The header:', ' * The header, from 2026-09-28 (fixture-44p, #147, wf_5aec3e94-07b):')),
      expect: 'pass',
      listed: [],
    },
    {
      name: 'a policy with no tracker id shape: --incidents says so, and still lists the date',
      doctor: (dir) => {
        const { [ISSUE_PATTERN_KEY]: _dropped, ...rest } = OTHER_CONSTANTS
        writeTree(dir, { [OTHER_RECORD]: `${JSON.stringify(rest, null, 2)}\n` })
        edit(dir, alpha, (t) => t.replace('Do alpha.', 'Done 2026-09-23, fixture-44p.'))
      },
      listed: [`  ${alpha}:8  dated: 2026-09-23`],
      says: /^prompts --incidents: tools\/policy\/ gives no tracker id's shape \(`prReviewIssuePattern` is missing\), so no tracker id is listed\./,
    },
    {
      name: '--incidents run as a process prints its rows and exits 0, where the gate would refuse',
      doctor: (dir) => edit(dir, alpha, (t) => t.replace('Do alpha.', 'Done on 2026-09-23 by fixture-44p, #147.')),
      expect: refusedOver(alpha, 22, 18),
      run: (dir) => {
        const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--incidents'], {
          env: { ...process.env, PROMPTS_CHECK_ROOT: dir },
          encoding: 'utf8',
        })
        const row = `  ${alpha}:8  dated: 2026-09-23, fixture-44p, #147`
        if (child.status !== 0) return `--incidents as a process exited ${child.status}: ${child.stderr}`
        return child.stdout.split('\n').includes(row) ? null : `--incidents as a process did not print ${JSON.stringify(row)}: ${child.stdout}`
      },
    },
  ]
}

// Run only as the entry point: `scripts/prompt-incidents.mjs` imports the lines and the list. Both
// sides are real paths, since a copy run from the temporary directory, behind a symlink on macOS,
// that read as an import would exit 0 having checked nothing.
const entry = process.argv[1] === undefined ? null : realpathSync(resolve(process.argv[1]))
if (entry !== null && realpathSync(fileURLToPath(import.meta.url)) === entry) {
  if (process.argv.includes('--selftest')) selftest()
  else if (process.argv.includes('--counts')) printCounts()
  else if (process.argv.includes('--incidents')) console.log(incidentReport(listIncidents(ROOT)))
  else main()
}
