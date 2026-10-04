/**
 * The selftest of `.vale-styles/Layout/`, this repository's own Vale style: each of its three rules
 * fires on the fault it names, at the line it is on, and on nothing else; and every section of
 * `.vale.ini` that lints Markdown with a style applies it.
 *
 *   mise run vale:selftest                           the cases below
 *   VALE_SELFTEST_ROOT=<dir> mise run vale:selftest  the same, over a doctored copy of `.vale.ini` and
 *                                                   `.vale-styles/Layout/` under <dir>
 *
 * WHAT IT WOULD LET THROUGH IF IT WERE WRONG. The rules run in the vale@agent-tools plugin's hook on
 * every Write and Edit of prose, and nowhere else, so a rule that stops matching says nothing: the
 * hook stays quiet and the next re-wrap fault reaches the pull-request reviewer, which named one in 7
 * pull requests between 2026-09-25 and 2026-10-01 (asdlc-openspec-m7p). A rule that matches too much
 * is as bad the other way: the hook lints the whole file, so every edit of a file it misreads is
 * asked to rewrite text it did not touch. A section of `.vale.ini` without the style lints its files
 * with no Layout rule, and says nothing either.
 *
 * NEGATIVE TESTING. It copies the style's rules under `os.tmpdir()` with a `.vale.ini` that applies
 * them alone. An undoctored control holds every construct a rule must pass, and must draw no alert;
 * each doctored case breaks one thing and must draw exactly its rule's alert at its line, so a case
 * cannot pass on another rule's alert. The section check runs on the live `.vale.ini`, as its
 * control, and on a copy with the style taken out of one section, which must be refused by name.
 * Last, it runs itself twice as a child: with no `vale` on PATH it must skip, and with a stub `vale`
 * that exits non-zero it must fail and not skip. It once read any failure of `vale --version` as a
 * missing `vale` and skipped (the pull-request review of `61f0323`, asdlc-openspec-m7p).
 *
 * NEEDS. `vale` on PATH, the release `mise.toml` pins, which README.md § Setup, the dev container and
 * CI each install (`docs/decisions.md` § D-31). Without it the run skips clean and says why. A
 * `vale` that is found and then fails is a failure.
 * No network: the style is tracked, and `vale sync` is never run. Under a second.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT = process.env.VALE_SELFTEST_ROOT ?? REPO_ROOT
const STYLE = join('.vale-styles', 'Layout')
const STYLE_NAME = 'Layout'

/**
 * The sections of a `.vale.ini` that lint with a style and do not apply this one, by header. A
 * section whose `BasedOnStyles` is empty lints nothing, and is left alone.
 */
function sectionsWithoutStyle(ini) {
  const missing = []
  let section = null
  for (const line of ini.split('\n')) {
    const header = /^\[(.+)\]\s*$/.exec(line)
    if (header) section = header[1]
    const based = /^BasedOnStyles\s*=\s*(.*)$/.exec(line)
    if (!based || section === null) continue
    const styles = based[1].split(',').map((s) => s.trim()).filter(Boolean)
    if (styles.length > 0 && !styles.includes(STYLE_NAME)) missing.push(section)
  }
  return missing
}

/** A line of exactly `width` characters that opens with `prefix` and ends in a word. */
function exact(prefix, width) {
  const words = ['alpha', 'beta', 'gamma', 'delta', 'epsilon']
  let s = prefix
  for (let i = 0; [...s].length < width + 10; i++) s += ` ${words[i % words.length]}`
  const cut = [...s].slice(0, width).join('')
  return cut.endsWith(' ') ? `${cut.slice(0, -1)}x` : cut
}

const CONTROL = [
  '---',
  `description: ${Array(10).fill('front matter words').join(' ')}`,
  '---',
  '',
  '# A heading right after the front matter',
  '',
  exact('Two lines, each within the margin:', 100),
  'the second closes the paragraph.',
  '',
  `${exact('One word hanging past the margin is how this tree wraps:', 100)} over`,
  'the paragraph goes on.',
  '',
  Array(4).fill('A paragraph written as one line, as the register writes them, is never measured.').join(' '),
  '',
  `${exact('A long code span is one word:', 95)} \`node scripts/a-long-command.mjs --with --many --flags\``,
  'and the paragraph goes on.',
  '',
  '```text',
  Array(5).fill('a fenced line far past the margin').join(' '),
  '```',
  '',
  `| ${Array(5).fill('a table row far past the margin').join(' ')} |`,
  '',
  exact(`Section signs are two bytes and one character each: ${'§'.repeat(30)}`, 100),
  'and the paragraph goes on.',
  '',
  '1. an outer item',
  '   - a nested item',
  `   ${Array(3).fill('A paragraph of the outer item, written as one line after the nested list.').join(' ')}`,
  '',
  '## A heading after a blank line',
  '',
]

/** Each case is the control with one thing broken, and the one alert it must draw. */
const CASES = [
  {
    name: 'a line two words past the margin, in a wrapped paragraph',
    lines: [`${exact('Two words past the margin:', 100)} after this`, 'the paragraph goes on.'],
    check: 'Layout.Rewrap',
    at: 1,
  },
  {
    name: "a list item's continuation line two words past the margin",
    lines: ['- a list item', `${exact('  continuation:', 100)} two more`],
    check: 'Layout.Rewrap',
    at: 2,
  },
  {
    name: 'a line past the margin after two-byte characters, at its own line',
    lines: [`${'§'.repeat(40)} two-byte characters above`, `${exact(`${'§'.repeat(20)} then`, 100)} two more`],
    check: 'Layout.Rewrap',
    at: 2,
  },
  {
    name: 'a line that ends in a space',
    lines: ['A line that ends in a space ', 'and the next does not.'],
    check: 'Layout.TrailingSpace',
    at: 1,
  },
  {
    name: 'a line in a fence that ends in a tab',
    lines: ['```text', 'code\t', '```'],
    check: 'Layout.TrailingSpace',
    at: 2,
  },
  {
    name: 'a heading with no blank line before it',
    lines: ['A paragraph line', '## A heading'],
    check: 'Layout.HeadingSpace',
    at: 2,
  },
]

const results = []
const check = (name, ok, detail) => {
  results.push(ok)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `: ${detail}`}`)
}

function vale(cwd, file) {
  let out
  try {
    out = execFileSync('vale', ['--output=JSON', '--no-exit', file], { cwd, encoding: 'utf8' })
  } catch (error) {
    throw new Error(`vale failed on ${file}: ${String(error.stderr || error.message).trim()}`)
  }
  return Object.values(JSON.parse(out)).flat().map((a) => `${a.Line} ${a.Check}`)
}

function main() {
  try {
    execFileSync('vale', ['--version'], { stdio: ['ignore', 'ignore', 'pipe'] })
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('vale:selftest: skipped: `vale` is not on PATH, so no Layout rule can run here (README.md § Setup installs it)')
      return
    }
    console.error(`vale:selftest: \`vale --version\` failed, and a tool that is found and fails is a failure: ${String(error.stderr || error.message).trim()}`)
    process.exit(1)
  }
  const dir = mkdtempSync(join(tmpdir(), 'vale-layout-'))
  try {
    mkdirSync(join(dir, 'styles', STYLE_NAME), { recursive: true })
    const rules = readdirSync(join(ROOT, STYLE)).filter((f) => f.endsWith('.yml'))
    if (rules.length === 0) throw new Error(`${join(ROOT, STYLE)} holds no rule`)
    for (const rule of rules) copyFileSync(join(ROOT, STYLE, rule), join(dir, 'styles', STYLE_NAME, rule))
    writeFileSync(join(dir, '.vale.ini'), `StylesPath = styles\nMinAlertLevel = suggestion\n\n[*.md]\nBasedOnStyles = ${STYLE_NAME}\n`)

    console.log(`vale:selftest: the ${STYLE_NAME} style's ${rules.length} rules over fixtures`)
    writeFileSync(join(dir, 'control.md'), CONTROL.join('\n'))
    const control = vale(dir, 'control.md')
    check('control: every construct a rule must pass draws no alert', control.length === 0, control.join(', '))
    if (control.length > 0) throw new Error('the control drew alerts, so no case below can be trusted')
    CASES.forEach((c, i) => {
      const file = `case-${i + 1}.md`
      const offset = CONTROL.length
      writeFileSync(join(dir, file), [...CONTROL, ...c.lines, ''].join('\n'))
      const got = vale(dir, file)
      const want = [`${offset + c.at} ${c.check}`]
      check(`${c.name} draws ${c.check}, at its line, alone`, JSON.stringify(got) === JSON.stringify(want), `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`)
    })

    console.log(`vale:selftest: every styled section of .vale.ini applies ${STYLE_NAME}`)
    const ini = readFileSync(join(ROOT, '.vale.ini'), 'utf8')
    const live = sectionsWithoutStyle(ini)
    check(`control: no styled section of ${join(ROOT, '.vale.ini')} lacks ${STYLE_NAME}`, live.length === 0, `lacking: ${live.join(', ')}`)
    const doctored = ini.replace(/^(\[README\.md\]\nBasedOnStyles = .*), Layout$/m, '$1')
    const refused = sectionsWithoutStyle(doctored)
    check(
      'a styled section with the style taken out is refused by name',
      doctored !== ini && refused.length === 1 && refused[0] === 'README.md',
      doctored === ini ? 'the doctoring did not reach [README.md]' : `refused: ${JSON.stringify(refused)}`,
    )

    console.log('vale:selftest: a `vale` that is absent skips, and one that is found and fails is a failure')
    if (process.platform === 'win32') {
      console.log('  skipped on Windows: the stub `vale` these cases put on PATH is a POSIX shell script')
    } else {
      const bin = join(dir, 'bin')
      mkdirSync(bin)
      const self = (path) => spawnSync(process.execPath, [SELF], { env: { ...process.env, PATH: path }, encoding: 'utf8' })
      const absent = self(join(dir, 'empty'))
      check(
        'with no `vale` on PATH it skips clean, saying why',
        absent.status === 0 && /skipped: `vale` is not on PATH/.test(absent.stdout),
        `status ${absent.status}: ${JSON.stringify(`${absent.stdout}${absent.stderr}`.slice(0, 300))}`,
      )
      writeFileSync(join(bin, 'vale'), '#!/bin/sh\necho "vale: broken" >&2\nexit 3\n', { mode: 0o755 })
      const failing = self(bin)
      check(
        'with a `vale` that exits non-zero it fails, by its reason, and does not skip',
        failing.status !== 0 && !/skipped/.test(failing.stdout) && /`vale --version` failed/.test(failing.stderr),
        `status ${failing.status}: ${JSON.stringify(`${failing.stdout}${failing.stderr}`.slice(0, 300))}`,
      )
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
  const failed = results.filter((ok) => !ok).length
  console.log(failed === 0 ? `vale:selftest: all ${results.length} checks passed` : `vale:selftest: ${failed} of ${results.length} checks failed`)
  if (failed > 0) process.exit(1)
}

main()
