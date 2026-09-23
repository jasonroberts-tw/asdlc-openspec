/**
 * Prompt gate: every skill (`.claude/skills/<name>/SKILL.md`) and every agent (`.claude/agents/*.md`)
 * opens, on the first line after its frontmatter, with the sentence CLAUDE.md § Standing rules for
 * prompts and gates requires. The sentence is read out of `CLAUDE.md` on every run, so it has one
 * home and this file states it nowhere.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-23 six of the fifteen skills and agents tracked at
 * commit fad7da8 (`git ls-files .claude/skills .claude/agents`) did not open with the line, while
 * `.claude/README.md` said every one did (asdlc-openspec-44p). All six were copied in from the
 * starter kit, which `KIT-CHECKLIST.md` records as `unchanged`, and nothing refused any of them. A
 * prompt without the line does not tell the model that `CLAUDE.md` wins where the two disagree, and
 * the prompts that lacked it included the one that tells an agent how to retire a file, which
 * `CLAUDE.md` makes a register decision with a checklist.
 *
 * INVOCATION.
 *
 *   npm run check:prompts             the gate
 *   npm run check:prompts:selftest    its fixtures -- every refusal exercised on a doctored copy
 *
 * NO EXEMPTION. `CLAUDE.md` asks the line of every *substantial* prompt. This gate asks it of every
 * prompt, because the line costs one line and deciding what is substantial is how six were skipped.
 * A prompt that should go without it is named in `.claude/README.md` with its reason and added to a
 * table here in the same change; there is none today.
 *
 * WHAT IS NOT CHECKED: the rest of a prompt, its `Reviewed:` trailer, and a `README.md` under
 * `.claude/agents/`, which describes the agents and is not one.
 *
 * NEGATIVE TESTING. `--selftest` builds a fixture tree under `os.tmpdir()`, doctors ONE thing per
 * case and asserts the run fails FOR THAT REASON, plus an undoctored control that must pass. By
 * hand, point `PROMPTS_CHECK_ROOT` at a doctored copy:
 *
 *   PROMPTS_CHECK_ROOT=/tmp/doctored node scripts/check-prompts.mjs
 *
 * NEEDS only committed files: `CLAUDE.md` and the prompts. No tool, no network. Milliseconds.
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.PROMPTS_CHECK_ROOT ?? REPO_ROOT

const SKILLS_DIR = '.claude/skills'
const AGENTS_DIR = '.claude/agents'
const RULE_HOME = 'CLAUDE.md § Standing rules for prompts and gates'
/** The bullet in `CLAUDE.md` that carries the sentence, up to the quotation mark that opens it. */
const RULE_LEAD = '**The first line of every substantial skill and agent** is: "'

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

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
    return { failures, skills: 0, agents: 0 }
  }
  const found = prompts(root)
  if (found.length === 0) {
    failures.push(
      `found no skill under ${SKILLS_DIR}/ and no agent under ${AGENTS_DIR}/ in ${root}. A gate over ` +
        'nothing passes for the wrong reason; point PROMPTS_CHECK_ROOT at a checkout.',
    )
    return { failures, skills: 0, agents: 0 }
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
  return {
    failures,
    skills: found.filter((path) => path.startsWith(`${SKILLS_DIR}/`)).length,
    agents: found.filter((path) => path.startsWith(`${AGENTS_DIR}/`)).length,
  }
}

/* --------------------------------------------------------------------------------- the gate ----- */

function main() {
  const { failures, skills, agents } = runCheck(ROOT)
  if (failures.length === 0) {
    console.log(
      `prompts: ${skills} skill(s) and ${agents} agent(s) each open with the line ${RULE_HOME} requires.`,
    )
    process.exit(0)
  }
  console.error(`prompts: ${failures.length} failure(s).\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

const LINE = 'Read the rules first. Everything below is subordinate to them.'

/** Wrapped across two lines on purpose, as the real bullet is. */
const RULES = `# Rules

- **The first line of every substantial skill and agent** is: "Read the rules first.
  Everything below is subordinate to them."
`

const FIXTURE = {
  'CLAUDE.md': RULES,
  '.claude/skills/alpha/SKILL.md': `---\nname: alpha\ndescription: first\n---\n\n${LINE}\n\nDo alpha.\n`,
  '.claude/skills/beta/SKILL.md': `---\nname: beta\ndescription: second\n---\n\n${LINE}\n\nDo beta.\n`,
  '.claude/agents/gamma.md': `---\nname: gamma\ndescription: third\n---\n\n${LINE}\n\nBe gamma.\n`,
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

function cases() {
  const beta = '.claude/skills/beta/SKILL.md'
  const gamma = '.claude/agents/gamma.md'
  const refusedOpening = (path) =>
    new RegExp(`^${path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}: its first line after the frontmatter is `)
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
      name: 'a README beside the agents is not an agent, and passes without the line',
      doctor: (dir) => writeTree(dir, { '.claude/agents/README.md': '# Agents\n\nWhat each one does.\n' }),
      expect: 'pass',
    },
  ]
}

if (process.argv.includes('--selftest')) selftest()
else main()
