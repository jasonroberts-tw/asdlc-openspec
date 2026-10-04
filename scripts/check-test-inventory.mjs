/**
 * Test-inventory gate: compares the tests at a branch's HEAD with the tests at its merge base with
 * `origin/main`, and refuses each test removed, given a skip, a todo or an only, or left with fewer
 * assertions, unless a commit on the branch records an architect's decision for it in a trailer.
 * This header is the home of that rule: `docs/test-strategy.md` § Test ownership lets the
 * app-builder delete, skip or disable a test, or weaken its assertions, only with a recorded
 * architect decision, and `docs/decisions.md` § D-13, item 17, gives the rule to the header of the
 * test-inventory gate (landed by asdlc-openspec-j09.9).
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong or absent. A builder whose test fails can turn the run green by deleting the test, marking
 * it skip or todo, or dropping the assertion that fails, and every other gate stays green:
 * `scripts/run-tests.mjs` counts a skipped test as declared and passes a failing todo test (its
 * header, WHAT IT COUNTS), and a scenario that another test still names looks proved. A gate that
 * missed a test at the base would never see it go, so this one reads tests only through
 * `scripts/test-trace.mjs`, which the runner holds to the tests it runs, and a test call it cannot
 * read to its closing parenthesis fails the run rather than passing it.
 *
 * WHICH FILES HOLD TESTS. At each of the two commits, the files that commit's tree holds that a
 * quoted pattern of a script running `scripts/run-tests.mjs` matches, by `path.matchesGlob`; the
 * runner expands the same pattern with `fs.globSync`, over the working tree. The scripts are each
 * commit's own, read through `scripts/lib/tasks.mjs`: its `tasks.toml`, or its `package.json`'s
 * `scripts` where it has none. So a branch that moves the tasks from one to the other is read on
 * each side as that side holds them; read from one file at both, the side without it would hold no
 * pattern, and a test the move deleted would pass unseen.
 * A `--dir <dir>` of such a script stands for the glob `scripts/lib/test-dirs.mjs` gives, the files
 * the runner runs under it, and a `--dir` with no directory fails the run rather than read as none.
 * So a pattern narrowed until a file drops out removes that file's tests. Both commits are read from
 * git, never from the working tree.
 *
 * A TEST is its file and its name, as the reader reads them. A test at the base whose file and name
 * the head does not have is removed, unless it was RENAMED: the head has, in any file, a test that
 * is not at the base whose call is the old one's after its name, token for token (its modifier, its
 * options and its function, whitespace and comments aside), and whose name keeps every ID the old
 * name gave, as the reader parses them; each such test pairs with one removed test, its own file
 * first. So a rename may add IDs, as prefixing a name with its scenario's does, and may not drop
 * one: the scenario whose ID goes would lose a test with no decision. A renamed test is reported as
 * one, and held to the two rules below as its new name. A name that changes with any other edit to
 * the call is a removal and an addition. Where that loses: a test renamed and edited in one commit
 * needs a decision recorded as removed, where a gate that paired tests by their titles would let it
 * through.
 *
 * A SKIP, TODO OR ONLY IS ADDED when the head's test carries more than the base's of any one of: its
 * modifier (`test.skip(`, `.todo(`, `.only(`); a `skip`, `todo` or `only` key of its options object
 * literal, with its value's text, so that a changed condition counts as a new skip, unless the value
 * is `false`, `null`, `undefined`, `0` or an empty string; a call `<context>.skip(` or `.todo(` in its
 * body; a `<context>.skip(` or `.todo(` in a `before` or `beforeEach` hook of the file, or of a
 * suite around it, outside every test; and each modifier or key of a `describe` or `suite` call
 * around it. A value that is one name, `{ skip: SIGNAL_SKIP }`, is read as that name and the
 * initializer of the file's top-level `const`, `let` or `var` of it, up to the line break that ends
 * its statement, so a constant switched on is a skip added. A `describe` or `suite` used other than
 * as a call of its own name (`describe['skip'](`, `const xdescribe = describe.skip`, or passed as a
 * value) fails the run, as a test call it cannot read does: a suite it skips would go unseen. A test
 * new on the branch adds every one it carries. Where that loses: a new test skipped on one platform,
 * with the reason the runner prints, needs a decision recorded too.
 *
 * ASSERTIONS ARE COUNTED statically, per test, as the call sites inside its call after its name:
 *   - a call on an assert binding: `assert`, or a name an import from `node:assert`,
 *     `node:assert/strict`, `assert` or `assert/strict` binds, called itself or through a member
 *     chain (`assert(x)`, `assert.equal(`, `assert.strict.equal(`, and `equal(` where `equal` is
 *     imported from one of them);
 *   - a call through a member named `assert` of any object, as the test context's (`t.assert.ok(`);
 *   - a call of a helper whose name is `assert` then a capital, a digit or `_` (`assertRefused(`),
 *     counted as one assertion, whatever it asserts.
 * A test is weakened when its count at the head is below its count at the base. It cannot see an
 * assertion in a helper named otherwise, or a helper edited to assert less; how many times a call
 * site runs, in a loop or behind a condition; an assertion replaced by a weaker one (`deepEqual` by
 * `ok`), by one that cannot fail (`assert.ok(true)`), or its expected value changed; a skip in an
 * options object held in a variable or spread into it, one whose value is an expression over names
 * (`skip: !HAS_X`), a name imported or declared below the top level, or a `let` assigned again; a
 * skip called from a helper, or from a hook in another file; and a test's own alias
 * (`const xit = it.skip`), which the runner's cross-check with the reader refuses instead. Review
 * holds those.
 *
 * THE DECISION is a trailer in the last paragraph of a commit message on the branch, where git reads
 * trailers, its key the value of `testInventoryTrailer` in `tools/policy/vocabulary.json`, written
 * here as that policy key's name in angle brackets:
 *
 *   <testInventoryTrailer>: remove apps/calculator/test/calculator.test.js "[CALC-003] Digits build a number" <reason>
 *
 * The kind is `remove` for a test removed, `skip` for a skip, todo or only added, and `weaken` for
 * fewer assertions; then the test's file, its name in double quotes as the refusal prints it, and a
 * reason, which must not be empty. A renamed test is named by its file and name at the head. A
 * refusal prints the line to write. One trailer clears one kind for one test, from any commit on
 * the branch, `git log <merge base>..HEAD`. Its key must be the policy's spelled exactly, case
 * included: the gate reads every trailer and keeps those, where git's own `%(trailers:key=)` filter
 * would match a key in any case. The gate holds that a decision is recorded, not who
 * recorded it: the architect is the build workflow's triage together with the session running
 * `change-build` (`docs/decisions.md` § D-13, item 16), and the pull-request reviewer reads the
 * trailer beside the diff.
 *
 * ON `main`, or wherever HEAD is its own merge base with `origin/main`, the branch has no commit of
 * its own and the gate passes. A shallow clone, or one with no `origin/main`, cannot show the merge
 * base, so the gate fails there with the fix rather than pass; `.github/workflows/verify.yml` checks
 * out with `fetch-depth: 0` for it.
 *
 * INVOCATION.
 *
 *   npm run tests:inventory:check        the gate, over this checkout's HEAD and `origin/main`
 *   npm run tests:inventory:selftest     each refusal over fixture repositories it builds under
 *                                        the temporary directory, beside undoctored controls
 *
 * By hand, point `TEST_INVENTORY_ROOT` at a doctored repository and the gate reads its HEAD and its
 * `origin/main` instead: `TEST_INVENTORY_ROOT=/tmp/doctored node scripts/check-test-inventory.mjs`.
 *
 * NEEDS git, a clone with `origin/main` and its history back to the merge base, and at HEAD
 * `testInventoryTrailer` and the reader's keys in `tools/policy/`. It reads only committed files
 * and git history: no network, and nothing outside the repository. Seven git processes a run, and
 * one more to list the policy's records at HEAD and one to read each (`readPolicyAt` in
 * `tools/lib/policy.ts`); the cost of the gate and of its selftest is on their jobs in
 * `git-hooks.yml`.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, matchesGlob, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gitEnv, gitIn } from '../tools/lib/git-env.ts'
import { POLICY_DIR, mergeRecords, parseRecord, readPolicy, readPolicyAt } from '../tools/lib/policy.ts'
import { PACKAGE_JSON, TASKS_TOML, taskFiles, tasksFrom } from './lib/tasks.mjs'
import { dirGlob, runnerDirs } from './lib/test-dirs.mjs'
import { PR_REVIEW, VOCABULARY, readTests, tracePolicy } from './test-trace.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SELF = fileURLToPath(import.meta.url)

const TRUNK = 'refs/remotes/origin/main'
const MANIFEST = PACKAGE_JSON
const MANIFESTS = [TASKS_TOML, PACKAGE_JSON]
const RUNNER = 'scripts/run-tests.mjs'
const TRAILER_KEY = 'testInventoryTrailer'
const KINDS = ['remove', 'skip', 'weaken']

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/* --------------------------------------------------------------------------------- git ---------- */

/** Git run in `root`, with no `GIT_*` key of a hook's environment to point it elsewhere. */
function git(root, args, input) {
  const result = spawnSync('git', ['-C', root, ...args], {
    env: gitEnv(),
    input,
    maxBuffer: 1024 * 1024 * 1024,
  })
  if (result.error) throw new Error(`git could not be run (${result.error.message}); the gate needs git on PATH.`)
  return { status: result.status, stdout: result.stdout, stderr: result.stderr.toString('utf8').trim() }
}

function gitText(root, args, what) {
  const result = git(root, args)
  if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed while reading ${what}: ${result.stderr}`)
  return result.stdout.toString('utf8')
}

/** Each `<commit>:<path>` spec's text, or null where the commit has no such file: one git process. */
function readBlobs(root, specs) {
  const found = new Map()
  if (specs.length === 0) return found
  const result = git(root, ['cat-file', '--batch'], `${specs.join('\n')}\n`)
  if (result.status !== 0) throw new Error(`git cat-file --batch failed: ${result.stderr}`)
  const out = result.stdout
  let at = 0
  for (const spec of specs) {
    const end = out.indexOf(0x0a, at)
    const header = out.subarray(at, end).toString('utf8')
    at = end + 1
    const [, type, size] = header.split(' ')
    if (header.endsWith(' missing') || size === undefined) {
      found.set(spec, null)
      continue
    }
    const length = Number(size)
    found.set(spec, type === 'blob' ? out.subarray(at, at + length).toString('utf8') : null)
    at += length + 1
  }
  return found
}

/* --------------------------------------------------------------------------------- the files ---- */

/**
 * The quoted patterns of every script in `scripts` (a name-to-command map, or null where the commit
 * has no manifest) that runs the test runner, and the glob of the files under each `--dir` of one
 * (`scripts/lib/test-dirs.mjs`); a `--dir` with no directory throws.
 */
export function testPatterns(scripts) {
  if (scripts === null) return []
  const patterns = []
  for (const name of Object.keys(scripts).sort(byCodePoint)) {
    const words = [...scripts[name].matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3])
    const at = words.indexOf(RUNNER)
    if (at < 0) continue
    for (let i = at + 1; i < words.length; i++) {
      if (['&&', '||', ';', '|'].includes(words[i])) break
      if (words[i] === '--dir') i++
      else if (!words[i].startsWith('-')) patterns.push(words[i])
    }
    patterns.push(...runnerDirs(scripts[name]).map(dirGlob))
  }
  return [...new Set(patterns)]
}

/** The paths among `paths` that a pattern of `scripts` matches: the files that hold tests. */
export function testFiles(paths, scripts) {
  const patterns = testPatterns(scripts)
  return paths.filter((path) => patterns.some((pattern) => matchesGlob(path, pattern))).sort(byCodePoint)
}

/** The scripts a commit's manifest defines, from `text(file)`, its text at that commit or null; null with neither. */
const scriptsAt = (text) => tasksFrom(text)?.tasks ?? null

function listTree(root, commit) {
  return gitText(root, ['ls-tree', '-r', '--name-only', '-z', commit], `the tree of ${commit}`)
    .split('\0')
    .filter((path) => path !== '')
}

/* --------------------------------------------------------------------------------- the lexer ---- */

const REGEX_AFTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await'])
/** Any character past ASCII may be part of a name. Tested by code point, so the code writes none. */
const ID_START = (c) => /[A-Za-z_$]/.test(c) || c.charCodeAt(0) > 0x7f
const ID_PART = (c) => /[\w$]/.test(c) || c.charCodeAt(0) > 0x7f
/** Whitespace that is not a line feed: space, tab, CR, FF, VT, no-break space, BOM, U+2028, U+2029. */
const SPACES = new Set([0x20, 0x09, 0x0d, 0x0c, 0x0b, 0xa0, 0xfeff, 0x2028, 0x2029])
const SPACE = (c) => SPACES.has(c.charCodeAt(0))

/**
 * The tokens of a JavaScript source, enough to find where a call ends: identifiers, numbers,
 * strings, template chunks, regular expression literals and punctuation, each with its line;
 * comments and whitespace dropped. A `/` opens a regular expression where an operand may start:
 * at the start, after punctuation other than `)`, `]` and `}`, and after a keyword that takes an
 * operand. Where it guesses wrong, a call's parentheses go unbalanced and the gate fails the run.
 */
export function lex(text) {
  const tokens = []
  const substitutions = []
  const n = text.length
  let i = 0
  let line = 1
  const push = (type, value, at, open = false) => tokens.push({ type, value, line: at, open })
  const regexAllowed = () => {
    const prev = tokens[tokens.length - 1]
    if (prev === undefined) return true
    if (prev.type === 'punct') return prev.value !== ')' && prev.value !== ']' && prev.value !== '}'
    if (prev.type === 'id') return REGEX_AFTER.has(prev.value)
    return prev.type === 'tpl' && prev.open
  }
  /** A template's chunk from `i`, just past its opening backtick or `}`, delimiters kept. */
  const template = () => {
    const at = line
    const start = i - 1
    while (i < n) {
      const c = text[i]
      if (c === '\\') {
        if (text[i + 1] === '\n') line++
        i += 2
      } else if (c === '`') {
        i++
        push('tpl', text.slice(start, i), at)
        return
      } else if (c === '$' && text[i + 1] === '{') {
        i += 2
        push('tpl', text.slice(start, i), at, true)
        substitutions.push(0)
        return
      } else {
        if (c === '\n') line++
        i++
      }
    }
    push('tpl', text.slice(start, i), at)
  }
  if (text.startsWith('#!')) while (i < n && text[i] !== '\n') i++
  while (i < n) {
    const c = text[i]
    if (c === '\n') {
      line++
      i++
    } else if (SPACE(c)) {
      i++
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i++
    } else if (c === '/' && text[i + 1] === '*') {
      const close = text.indexOf('*/', i + 2)
      const stop = close < 0 ? n : close + 2
      for (let k = i; k < stop; k++) if (text[k] === '\n') line++
      i = stop
    } else if (c === '"' || c === "'") {
      const at = line
      let j = i + 1
      while (j < n && text[j] !== c && text[j] !== '\n') {
        if (text[j] === '\\') {
          if (text[j + 1] === '\n') line++
          j++
        }
        j++
      }
      const closed = text[j] === c
      push('str', text.slice(i, closed ? j + 1 : j), at)
      i = closed ? j + 1 : j
    } else if (c === '`') {
      i++
      template()
    } else if (c === '/' && regexAllowed() && regexEnd(text, i) > 0) {
      const end = regexEnd(text, i)
      push('re', text.slice(i, end), line)
      i = end
    } else if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] ?? ''))) {
      let j = i + 1
      while (j < n && /[\w.]/.test(text[j])) j++
      push('num', text.slice(i, j), line)
      i = j
    } else if (ID_START(c)) {
      let j = i + 1
      while (j < n && ID_PART(text[j])) j++
      push('id', text.slice(i, j), line)
      i = j
    } else if (c === '?' && text[i + 1] === '.' && !/[0-9]/.test(text[i + 2] ?? '')) {
      push('punct', '?.', line)
      i += 2
    } else if (c === '.' && text[i + 1] === '.' && text[i + 2] === '.') {
      push('punct', '...', line)
      i += 3
    } else if (c === '}' && substitutions.length > 0 && substitutions[substitutions.length - 1] === 0) {
      substitutions.pop()
      i++
      template()
    } else {
      if (substitutions.length > 0 && c === '{') substitutions[substitutions.length - 1]++
      if (substitutions.length > 0 && c === '}') substitutions[substitutions.length - 1]--
      push('punct', c, line)
      i++
    }
  }
  return tokens
}

/** The index after a regular expression literal opening at `i`, flags included, or -1. */
function regexEnd(text, i) {
  let inClass = false
  for (let j = i + 1; j < text.length && text[j] !== '\n'; j++) {
    const c = text[j]
    if (c === '\\') j++
    else if (c === '[') inClass = true
    else if (c === ']') inClass = false
    else if (c === '/' && !inClass) {
      let end = j + 1
      while (end < text.length && ID_PART(text[end])) end++
      return end
    }
  }
  return -1
}

const isPunct = (token, value) => token !== undefined && token.type === 'punct' && token.value === value
const isId = (token, value) => token !== undefined && token.type === 'id' && (value === undefined || token.value === value)
const isDot = (token) => isPunct(token, '.') || isPunct(token, '?.')

/** The index of the `)` that closes the `(` at `open`, or -1 where the brackets do not balance. */
function closing(tokens, open) {
  let depth = 0
  for (let k = open; k < tokens.length; k++) {
    const { type, value } = tokens[k]
    if (type !== 'punct') continue
    if (value === '(' || value === '[' || value === '{') depth++
    else if (value === ')' || value === ']' || value === '}') {
      depth--
      if (depth === 0) return value === ')' ? k : -1
      if (depth < 0) return -1
    }
  }
  return -1
}

/** The top-level comma-separated parts of the tokens between `from` and `to`, as `[start, end)`. */
function parts(tokens, from, to) {
  const list = []
  let start = from
  let depth = 0
  for (let k = from; k < to; k++) {
    const { type, value } = tokens[k]
    if (type !== 'punct') continue
    if (value === '(' || value === '[' || value === '{') depth++
    else if (value === ')' || value === ']' || value === '}') depth--
    else if (value === ',' && depth === 0) {
      list.push([start, k])
      start = k + 1
    }
  }
  if (start < to) list.push([start, to])
  return list
}

const WORDY = new Set(['id', 'num', 'str', 're', 'tpl'])

/**
 * The tokens between `from` and `to` as one line: a space only between two words, so that neither
 * a comment, a line break nor a reformat changes it (`process.platform==='win32'`).
 */
function render(tokens, from, to) {
  let out = ''
  for (let k = from; k < to; k++) {
    if (k > from && WORDY.has(tokens[k].type) && WORDY.has(tokens[k - 1].type)) out += ' '
    out += tokens[k].value
  }
  return out
}

/**
 * The call at token `at` of `test`, `it`, `describe` or `suite`, optionally with its modifier:
 * `{ modifier, open, close }`, `open` and `close` being its parentheses, or null if there is none.
 */
function callAt(tokens, at) {
  let k = at + 1
  let modifier = null
  if (isDot(tokens[k]) && isId(tokens[k + 1]) && ['skip', 'todo', 'only'].includes(tokens[k + 1].value)) {
    modifier = tokens[k + 1].value
    k += 2
  }
  if (!isPunct(tokens[k], '(')) return null
  return { modifier, open: k, close: closing(tokens, k) }
}

const FALSY = new Set(['false', 'null', 'undefined', '0', "''", '""'])
const OPENERS = new Set(['(', '[', '{'])
const CLOSERS = new Set([')', ']', '}'])

/**
 * The initializer of each top-level `const`, `let` or `var` of one name, rendered: the tokens after
 * its `=` up to a `;`, a `,` or a line break that ends the statement, at the depth it opened. A line
 * break ends it unless the line ends in punctuation other than a closing bracket, or the next line
 * opens with punctuation other than an opening bracket, as a ternary or a concatenation continues.
 */
function topLevelValues(tokens) {
  const values = new Map()
  let depth = 0
  for (let k = 0; k < tokens.length; k++) {
    const token = tokens[k]
    if (token.type === 'punct' && OPENERS.has(token.value)) depth++
    else if (token.type === 'punct' && CLOSERS.has(token.value)) depth--
    if (depth !== 0 || !['const', 'let', 'var'].some((word) => isId(token, word)) || isDot(tokens[k - 1])) continue
    if (!isId(tokens[k + 1]) || !isPunct(tokens[k + 2], '=') || isPunct(tokens[k + 3], '=')) continue
    let inner = 0
    let m = k + 3
    for (; m < tokens.length; m++) {
      const next = tokens[m]
      if (inner === 0 && m > k + 3) {
        const prev = tokens[m - 1]
        if (isPunct(next, ';') || isPunct(next, ',')) break
        const continues = (prev.type === 'punct' && !CLOSERS.has(prev.value)) || (next.type === 'punct' && !OPENERS.has(next.value))
        if (next.line > prev.line && !continues) break
      }
      if (next.type === 'punct' && OPENERS.has(next.value)) inner++
      else if (next.type === 'punct' && CLOSERS.has(next.value)) {
        if (inner === 0) break
        inner--
      }
    }
    if (!values.has(tokens[k + 1].value)) values.set(tokens[k + 1].value, render(tokens, k + 3, m))
  }
  return values
}

/**
 * A call's modifier and the `skip`, `todo` and `only` keys of its options object literal. A value
 * that is one name of a top-level `const`, `let` or `var` is read as that name and its initializer.
 */
function ownDisablers(tokens, call, constants) {
  const found = call.modifier === null ? [] : [`.${call.modifier}`]
  const options = parts(tokens, call.open + 1, call.close)[1]
  if (options === undefined || !isPunct(tokens[options[0]], '{') || !isPunct(tokens[options[1] - 1], '}')) return found
  for (const [from, to] of parts(tokens, options[0] + 1, options[1] - 1)) {
    const first = tokens[from]
    let key = null
    let at = null
    if (to - from >= 3 && (first.type === 'id' || first.type === 'str') && isPunct(tokens[from + 1], ':')) {
      key = first.type === 'str' ? first.value.slice(1, -1) : first.value
      at = from + 2
    } else if (to - from === 1 && first.type === 'id') {
      key = first.value
      at = from
    }
    if (!['skip', 'todo', 'only'].includes(key)) continue
    let value = render(tokens, at, to)
    let decides = value
    if (to - at === 1 && tokens[at].type === 'id' && constants.has(value)) {
      decides = constants.get(value)
      value = `${value} (= ${decides})`
    }
    if (!FALSY.has(decides)) found.push(`${key}: ${value}`)
  }
  return found
}

const ASSERT_MODULE = /^(?:node:)?assert(?:\/strict)?$/
const ASSERT_HELPER = /^assert[A-Z0-9_]/

/** `assert`, and every name an import from an assert module binds in the source. */
function assertRoots(tokens) {
  const roots = new Set(['assert'])
  tokens.forEach((token, at) => {
    if (!isId(token, 'import') || isDot(tokens[at - 1])) return
    let k = at + 1
    while (k < tokens.length && !isId(tokens[k], 'from') && tokens[k].type !== 'str' && !isPunct(tokens[k], ';') && !isPunct(tokens[k], '(')) k++
    if (!isId(tokens[k], 'from') || tokens[k + 1]?.type !== 'str' || !ASSERT_MODULE.test(tokens[k + 1].value.slice(1, -1))) return
    for (let q = at + 1; q < k; q++) {
      if (isId(tokens[q]) && tokens[q].value !== 'as' && !isId(tokens[q + 1], 'as')) roots.add(tokens[q].value)
    }
  })
  return roots
}

/** The assertion call sites between `from` and `to`, as the header counts them. */
function countAssertions(tokens, from, to, roots) {
  let count = 0
  for (let k = from; k < to; k++) {
    if (!isId(tokens[k]) || isDot(tokens[k - 1]) || isId(tokens[k - 1], 'function')) continue
    const chain = [tokens[k].value]
    let m = k + 1
    while (m + 1 < to && isDot(tokens[m]) && isId(tokens[m + 1])) {
      chain.push(tokens[m + 1].value)
      m += 2
    }
    if (!isPunct(tokens[m], '(')) continue
    if (roots.has(chain[0]) || (chain.length >= 3 && chain.slice(1, -1).includes('assert')) || (chain.length === 1 && ASSERT_HELPER.test(chain[0]))) count++
  }
  return count
}

/** The `<context>.skip(` and `.todo(` calls between `from` and `to`. */
function bodySkips(tokens, from, to) {
  const found = []
  for (let k = from + 2; k < to; k++) {
    if (isId(tokens[k]) && ['skip', 'todo'].includes(tokens[k].value) && isDot(tokens[k - 1]) && isId(tokens[k - 2]) && isPunct(tokens[k + 1], '(')) {
      found.push(`<context>.${tokens[k].value}()`)
    }
  }
  return found
}

/** The index spans of every `import ... from` clause, where a name is bound and not used. */
function importClauses(tokens) {
  const spans = []
  tokens.forEach((token, at) => {
    if (!isId(token, 'import') || isDot(tokens[at - 1])) return
    let k = at + 1
    while (k < tokens.length && !isId(tokens[k], 'from') && tokens[k].type !== 'str' && !isPunct(tokens[k], ';') && !isPunct(tokens[k], '(')) k++
    spans.push([at, k])
  })
  return spans
}

/**
 * The inventory of one test file's source: each test the reader reads, with its line, its IDs, its
 * assertion count, what skips it and the text of its call after its name; and the problems that
 * kept a test, or a suite around one, from being read.
 */
export function readInventory(file, source, policy) {
  const { tests } = readTests(source, policy, file)
  const tokens = lex(source)
  const roots = assertRoots(tokens)
  const constants = topLevelValues(tokens)
  const imports = importClauses(tokens)
  const problems = []
  const problem = (at, message) => problems.push(`${file}:${tokens[at].line}: ${message}`)

  // Every suite, read as a call; any other use of `describe` or `suite` hides what it skips.
  const suites = []
  tokens.forEach((token, at) => {
    if (!isId(token) || !['describe', 'suite'].includes(token.value) || isDot(tokens[at - 1])) return
    if (imports.some(([from, to]) => from < at && at < to)) return
    if ((isPunct(tokens[at - 1], '{') || isPunct(tokens[at - 1], ',')) && isPunct(tokens[at + 1], ':')) return
    const call = callAt(tokens, at)
    if (call === null) {
      problem(
        at,
        `\`${token.value}\` is used other than as a call, \`${token.value}(\` or \`${token.value}.skip(\`, \`.todo(\` or` +
          ' `.only(`: reached through brackets, bound to another name or passed as a value, a suite it skips' +
          ' cannot be seen. Call it by its own name.',
      )
    } else if (call.close < 0) {
      problem(at, `the \`${token.value}\` call here cannot be read to its closing parenthesis, so what it skips cannot be counted.`)
    } else {
      suites.push({ ...call, disablers: ownDisablers(tokens, call, constants), hooks: [] })
    }
  })

  const calls = []
  for (const test of tests) {
    const at = tokens.findIndex((token, k) => token.line === test.line && isId(token) && ['test', 'it'].includes(token.value) && !isDot(tokens[k - 1]) && callAt(tokens, k) !== null)
    const call = at < 0 ? null : callAt(tokens, at)
    if (call === null || call.close < 0) {
      problems.push(
        `${file}:${test.line}: the call of "${test.name}" cannot be read to its closing parenthesis, so its` +
          ' assertions and skips cannot be counted. Fix the source, or the lexer in' +
          ' scripts/check-test-inventory.mjs if the source is valid JavaScript.',
      )
      continue
    }
    calls.push({ test, call })
  }

  // A skip called in a `before` or `beforeEach` hook outside every test skips the tests of the
  // innermost suite around it, or of the whole file.
  const fileHooks = []
  const inside = (outer, at) => outer.open < at && at < outer.close
  tokens.forEach((token, at) => {
    if (!isId(token) || !['before', 'beforeEach'].includes(token.value) || isDot(tokens[at - 1]) || !isPunct(tokens[at + 1], '(')) return
    if (calls.some(({ call }) => inside(call, at))) return
    const close = closing(tokens, at + 1)
    if (close < 0) return
    const skips = bodySkips(tokens, at + 1, close).map((skip) => `hook ${skip}`)
    const around = suites.filter((suite) => inside(suite, at)).sort((a, b) => b.open - a.open)[0]
    ;(around === undefined ? fileHooks : around.hooks).push(...skips)
  })

  const read = calls.map(({ test, call }) => {
    const [name] = parts(tokens, call.open + 1, call.close)
    const after = name === undefined ? call.open + 1 : name[1]
    const around = suites
      .filter((suite) => suite.open < call.open && call.close < suite.close)
      .flatMap((suite) => [...suite.disablers, ...suite.hooks].map((disabler) => `describe ${disabler}`))
    return {
      file,
      name: test.name,
      ids: test.ids,
      line: test.line,
      assertions: countAssertions(tokens, after, call.close, roots),
      disablers: [...ownDisablers(tokens, call, constants), ...bodySkips(tokens, after, call.close), ...around, ...fileHooks.map((skip) => `file ${skip}`)].sort(byCodePoint),
      call: `${call.modifier ?? ''} ${render(tokens, after, call.close + 1)}`,
    }
  })
  return { tests: read, problems }
}


/* --------------------------------------------------------------------------------- compare ------ */

/** What is in `later` beyond what `earlier` holds, counted as multisets. */
function beyond(later, earlier) {
  const left = [...earlier]
  return later.filter((item) => {
    const at = left.indexOf(item)
    if (at < 0) return true
    left.splice(at, 1)
    return false
  })
}

/**
 * The findings of a head against its base: each `{ kind, file, name, what }`, and the tests renamed
 * with their call unchanged, `{ from, to }`.
 */
export function compare(base, head) {
  const key = (test) => `${test.file}\u0000${test.name}`
  const heads = new Map()
  for (const test of head) heads.set(key(test), [...(heads.get(key(test)) ?? []), test])
  const pairs = []
  const removed = []
  for (const test of base) {
    const same = heads.get(key(test))
    if (same !== undefined && same.length > 0) pairs.push({ base: test, head: same.shift() })
    else removed.push(test)
  }
  const added = [...heads.values()].flat()
  const renamed = []
  const gone = []
  const keeps = (old) => (a) => a.call === old.call && old.ids.every((id) => a.ids.includes(id))
  for (const test of removed) {
    const match = added.find((a) => keeps(test)(a) && a.file === test.file) ?? added.find(keeps(test))
    if (match === undefined) {
      gone.push(test)
      continue
    }
    added.splice(added.indexOf(match), 1)
    pairs.push({ base: test, head: match })
    renamed.push({ from: test, to: match })
  }
  const findings = []
  for (const test of gone) {
    const near = added.filter((a) => a.file === test.file)
    const dropped = near.filter((a) => a.call === test.call).map((a) => `"${a.name}", whose call is unchanged and whose name drops ${test.ids.filter((id) => !a.ids.includes(id)).join(', ')}`)
    const changed = near.filter((a) => a.call !== test.call).map((a) => `"${a.name}"`)
    findings.push({
      kind: 'remove',
      file: test.file,
      name: test.name,
      what:
        `was at line ${test.line} at the merge base and is not at HEAD, and no test new at HEAD keeps its call and every ID it names` +
        (dropped.length > 0 ? ` (new in the same file: ${dropped.join('; ')})` : '') +
        (changed.length > 0 ? ` (new in the same file, each with its call changed: ${changed.join(', ')})` : ''),
    })
  }
  for (const { base: was, head: now } of pairs) {
    const more = beyond(now.disablers, was.disablers)
    if (more.length > 0) findings.push({ kind: 'skip', file: now.file, name: now.name, what: `adds ${more.join(', ')}` })
    if (now.assertions < was.assertions) {
      findings.push({ kind: 'weaken', file: now.file, name: now.name, what: `has ${now.assertions} assertion call site(s), where it had ${was.assertions}` })
    }
  }
  for (const test of added) {
    if (test.disablers.length > 0) findings.push({ kind: 'skip', file: test.file, name: test.name, what: `is new on this branch, and carries ${test.disablers.join(', ')}` })
  }
  findings.sort((a, b) => byCodePoint(a.file, b.file) || byCodePoint(a.name, b.name) || KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind))
  return { findings, renamed }
}

/** The trailer that clears `finding`, less its reason. */
const trailerFor = (trailer, finding) => `${trailer}: ${finding.kind} ${finding.file} "${finding.name}"`

/** Whether one of `values`, the trailer's values on the branch, clears `finding` with a reason. */
function cleared(values, finding) {
  const prefix = `${finding.kind} ${finding.file} "${finding.name}" `
  return values.some((value) => value.startsWith(prefix) && value.slice(prefix.length).trim() !== '')
}

/**
 * The trailer's key from the policy's constants, its records merged. Throws an Error saying so when
 * it has none, or one git could not read as a trailer's key.
 */
export function trailerKey(policy) {
  const key = policy?.[TRAILER_KEY]
  if (typeof key !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(key)) {
    throw new Error(
      `${VOCABULARY} at HEAD has no trailer key under \`${TRAILER_KEY}\`: the key of the trailer that` +
        " records an architect's decision (the header of scripts/check-test-inventory.mjs).",
    )
  }
  return key
}

/**
 * The decision over two sides already read: `sides` is the merge base then HEAD, each
 * `{ commit, files: [{ path, source }] }` for the files that hold tests; `values` are the trailer's
 * values on the branch. Returns `{ ok, report }`, `report` being the lines to print.
 */
export function judge({ sides, policy, trailer, values }) {
  const reader = tracePolicy(policy)
  const problems = []
  const read = sides.map(({ commit, files }, n) => {
    const tests = []
    for (const { path, source } of files) {
      const inventory = readInventory(path, source, reader)
      tests.push(...inventory.tests)
      problems.push(...inventory.problems.map((problem) => `${n === 0 ? 'at the merge base' : 'at HEAD'}, ${problem}`))
    }
    return { commit, files, tests }
  })
  if (problems.length > 0) {
    return { ok: false, report: [`test-inventory: ${problems.length} place(s) in the test files could not be read, so nothing was compared:`, ...problems.map((p) => `  - ${p}`)] }
  }
  const [base, head] = read
  const { findings, renamed } = compare(base.tests, head.tests)
  const open = findings.filter((finding) => !cleared(values, finding))
  const count = (side) => `${side.tests.length} test(s) in ${side.files.length} file(s)`
  const summary =
    `${count(base)} at the merge base ${base.commit.slice(0, 7)}, ${count(head)} at HEAD ${head.commit.slice(0, 7)};` +
    ` ${renamed.length} renamed with the call unchanged, ${findings.length - open.length} change(s) cleared by a \`${trailer}\` trailer`
  const renames = renamed.map(({ from, to }) => `  renamed: ${from.file} "${from.name}" -> ${to.file} "${to.name}"`)
  if (open.length === 0) {
    return { ok: true, report: [`test-inventory: ${summary}, and none removed, skipped or weakened without one.`, ...renames] }
  }
  return {
    ok: false,
    report: [
      `test-inventory: ${open.length} change(s) to the tests carry no architect decision (${summary}).`,
      ...open.flatMap((finding) => [
        `  - ${finding.kind}: ${finding.file} "${finding.name}" ${finding.what}.`,
        '    Restore it, or record the decision in the last paragraph of a commit message on this branch:',
        `    ${trailerFor(trailer, finding)} <the reason>`,
      ]),
      ...(values.length > 0 ? [`  The branch's \`${trailer}\` trailers, none of which clears a change above:`, ...values.map((value) => `    ${value}`)] : []),
      ...renames,
    ],
  }
}

/* --------------------------------------------------------------------------------- the gate ----- */

/**
 * The gate over the repository at `root`: reads HEAD, its merge base with origin/main, the files
 * that hold tests at each, and the branch's trailers from git, and judges them. Returns
 * `{ ok, report }`; throws an Error when the repository cannot show what the gate reads.
 */
export function checkInventory(root) {
  const [shallow, head] = gitText(root, ['rev-parse', '--is-shallow-repository', 'HEAD'], 'HEAD').trim().split('\n')
  if (shallow === 'true') {
    throw new Error(
      'this clone is shallow, so the merge base with origin/main may be missing from it. Fetch the whole' +
        ' history (`git fetch --unshallow origin`; in CI, check out with `fetch-depth: 0`).',
    )
  }
  const found = git(root, ['merge-base', head, TRUNK])
  if (found.status !== 0) {
    const trunk = git(root, ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`])
    if (trunk.status !== 0) throw new Error('this clone has no origin/main, which the branch is compared with. Run `git fetch origin main`.')
    throw new Error(`HEAD and origin/main have no merge base: ${found.stderr || 'unrelated histories'}.`)
  }
  const base = found.stdout.toString('utf8').trim()
  if (base === head) {
    return {
      ok: true,
      report: [`test-inventory: HEAD ${head.slice(0, 7)} is its own merge base with origin/main, so no commit of this branch can remove, skip or weaken a test.`],
    }
  }

  const meta = readBlobs(root, [base, head].flatMap((commit) => MANIFESTS.map((file) => `${commit}:${file}`)))
  let policy = null
  try {
    policy = readPolicyAt(gitIn(root), head)
  } catch (error) {
    throw new Error(`${POLICY_DIR}/ at HEAD cannot be read (${error.message}).`)
  }
  const trailer = trailerKey(policy)
  const listed = [base, head].map((commit) => ({ commit, paths: testFiles(listTree(root, commit), scriptsAt((file) => meta.get(`${commit}:${file}`))) }))
  const blobs = readBlobs(root, listed.flatMap(({ commit, paths }) => paths.map((path) => `${commit}:${path}`)))
  const sides = listed.map(({ commit, paths }) => ({
    commit,
    files: paths.map((path) => ({ path, source: blobs.get(`${commit}:${path}`) })).filter(({ source }) => source !== null),
  }))
  // Every trailer, and only those whose key is the policy's spelled exactly: git's own `key=`
  // filter matches a key in any case.
  const log = gitText(root, ['log', '--format=%(trailers:only=true,unfold=true)', `${base}..${head}`], "the branch's commit messages")
  const values = log
    .split('\n')
    .map((line) => line.match(/^([^:\s]+):(.*)$/))
    .filter((match) => match !== null && match[1] === trailer)
    .map((match) => match[2].trim())
    .filter((value) => value !== '')
  return judge({ sides, policy, trailer, values })
}

function main() {
  const root = process.env.TEST_INVENTORY_ROOT ? resolve(process.env.TEST_INVENTORY_ROOT) : REPO_ROOT
  let result
  try {
    result = checkInventory(root)
  } catch (error) {
    console.error(`test-inventory: ${error.message}`)
    process.exit(1)
  }
  for (const line of result.report) (result.ok ? console.log : console.error)(line)
  process.exit(result.ok ? 0 : 1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

/** The fixture's policy, by record: only the keys the reader and the gate read, each where it lives. */
const FIXTURE_POLICY = {
  [VOCABULARY]: { testTraceHashLength: 12, testTraceLayers: { functional: 1 } },
  [PR_REVIEW]: { prReviewIssuePattern: 'asdlc-openspec-[a-z0-9]+(?:\\.[0-9]+)*' },
}
const recordText = (data) => `${JSON.stringify(data, null, 2)}\n`

const A_TEST = `import assert, { equal } from 'node:assert/strict'
import { describe, test } from 'node:test'
// trace-defaults: layer=functional level=1

/** Holds two values equal. */
function assertPair(a, b) {
  assert.equal(a, b)
}

/** Whether the slow tests skip: never, in this fixture; its initializer runs over four lines. */
const SKIP_SLOW =
  process.env.FIXTURE_NEVER_SET === 'yes'
    ? 'slow here'
    : false
const UNRELATED = [1]

describe('arithmetic', () => {
  // trace: FIX-001:happy@aaaaaaaaaaaa
  test('[FIX-001] adds', () => {
    assert.equal(1 + 1, 2)
    equal(2 + 2, 4)
    const shown = ')' + "(" + \`(\${String(')')}\` // assert.ok(false)
    /* assert.ok(false) ( */
    assert.match(shown, /[)(]+/)
  })

  // trace: FIX-002:happy@aaaaaaaaaaaa
  test('[FIX-002] subtracts', { skip: SKIP_SLOW }, async (t) => {
    t.assert.equal(3 - 1, 2)
    assertPair(5 - 5, 0)
    for (const n of [1, 2]) {
      await Promise.resolve().then(() => {
        assert.ok(n > 0, 'a callback holding a paren )')
      })
    }
  })

  // trace: FIX-003:happy@aaaaaaaaaaaa
  test('[FIX-003] divides', { skip: process.platform === 'win32', timeout: 1000 }, () => {
    assert.equal(6 / 3 / 2, 1)
  })
})
`

const B_TEST = `import assert from 'node:assert/strict'
import { test } from 'node:test'
// trace-defaults: layer=functional level=1
const SKIP_NEVER = false

// trace: FIX-004:happy@aaaaaaaaaaaa
test(
  '[FIX-004] multiplies',
  { skip: SKIP_NEVER },
  () => {
    // assert.equal(1, 2)
    const note = 'assert.ok(false)'
    assert.deepEqual([2 * 2], [4], note)
  },
)
`

/** What `readInventory` must make of the fixture's two files, written out by hand. */
const HAND = {
  '[FIX-001] adds': { assertions: 3, disablers: [] },
  '[FIX-002] subtracts': { assertions: 3, disablers: ["skip: SKIP_SLOW (= process.env.FIXTURE_NEVER_SET==='yes'?'slow here':false)"] },
  '[FIX-003] divides': { assertions: 1, disablers: ["skip: process.platform==='win32'"] },
  '[FIX-004] multiplies': { assertions: 1, disablers: [] },
}

function fixtureFiles(trailerKey) {
  return {
    ...taskFiles(
      PACKAGE_JSON,
      {
        'unit:test': 'node scripts/run-tests.mjs "test/*.test.js"',
        'unit:selftest': 'node scripts/run-tests.mjs --selftest',
      },
      { type: 'module' },
    ),
    [VOCABULARY]: recordText({ ...FIXTURE_POLICY[VOCABULARY], [TRAILER_KEY]: trailerKey }),
    [PR_REVIEW]: recordText(FIXTURE_POLICY[PR_REVIEW]),
    'test/a.test.js': A_TEST,
    'test/b.test.js': B_TEST,
    'test/nested/c.test.js': "// trace: FIX-005:happy@aaaaaaaaaaaa\ntest('[FIX-005] not matched', () => {})\n",
    'README.md': '# fixture\n',
  }
}

function writeTree(dir, files) {
  for (const [relative, body] of Object.entries(files)) {
    const path = join(dir, relative)
    if (body === null) {
      rmSync(path, { force: true })
      continue
    }
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
}

/** A side as `judge` takes it, from a tree of path to text, where a null text is no file. */
function sideOf(commit, tree) {
  const paths = Object.keys(tree).filter((path) => tree[path] !== null)
  return { commit, files: testFiles(paths, scriptsAt((file) => tree[file] ?? null)).map((path) => ({ path, source: tree[path] })) }
}

/** Whether `result` is the outcome `expect` names, and what to print for it. */
function held(result, expect) {
  const shown = result.report.join(' | ')
  const ok = expect.pass !== undefined ? result.ok && expect.pass.test(shown) : !result.ok && expect.refuse.test(shown)
  return [ok, ok ? (result.ok ? 'passes' : 'refused for that reason') : `${result.ok ? 'PASSED' : 'refused'}: ${shown}`]
}

function selftest() {
  const results = []
  const record = (name, ok, detail) => results.push({ name, ok, detail })
  let live
  try {
    live = trailerKey(readPolicy(REPO_ROOT))
    record('the live policy spells the trailer', true, `${TRAILER_KEY} is ${live}`)
  } catch (error) {
    record('the live policy spells the trailer', false, error.message)
    return finish(results)
  }

  // The reading, by hand: the lexer's traps (a paren in a string, a template, a comment and a
  // regular expression; division; an assertion in a comment or a string) are all in the fixture.
  const files = fixtureFiles(live)
  const policy = mergeRecords([VOCABULARY, PR_REVIEW].map((path) => parseRecord(path, files[path])))
  const got = {}
  for (const file of ['test/a.test.js', 'test/b.test.js']) {
    const { tests, problems } = readInventory(file, files[file], tracePolicy(policy))
    if (problems.length > 0) got.problems = problems
    for (const test of tests) got[test.name] = { assertions: test.assertions, disablers: test.disablers }
  }
  const same = JSON.stringify(got) === JSON.stringify(HAND)
  record('control: each fixture test reads with the assertions and skips counted by hand', same, same ? '4 tests' : `read ${JSON.stringify(got)}`)
  if (!same) return finish(results, 'the fixture does not read as counted by hand')

  // The decision, in-process: the fixture as the merge base, one doctored copy as HEAD.
  for (const { name, base = () => ({}), edit = () => ({}), values = [], expect } of judgeCases(files)) {
    let result
    try {
      result = judge({ sides: [sideOf('ba5e0000', { ...files, ...base(files) }), sideOf('4ead0000', { ...files, ...edit(files) })], policy, trailer: live, values })
    } catch (error) {
      result = { ok: false, report: [`threw: ${error.message}`] }
    }
    record(name, ...held(result, expect))
    if (name.startsWith('control') && !results.at(-1).ok) return finish(results, 'the undoctored decision does not pass')
  }

  // The git reading: fixture repositories, the fixture committed as origin/main, and a branch.
  const base = mkdtempSync(join(tmpdir(), 'test-inventory-'))
  const globalConfig = join(base, 'gitconfig')
  writeFileSync(globalConfig, '')
  const env = { ...gitEnv(), GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1' }
  const config = ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false', '-c', `core.hooksPath=${join(base, 'no-hooks')}`]
  const run = (dir, args) => {
    const result = spawnSync('git', ['-C', dir, ...config, ...args], { env, encoding: 'utf8' })
    if (result.status !== 0) throw new Error(`git ${args.join(' ')}: ${result.stderr}`)
    return result.stdout
  }
  const commit = (dir, edits, message = ['a change']) => {
    writeTree(dir, edits)
    run(dir, ['add', '-A'])
    run(dir, ['commit', '-q', '--allow-empty', ...message.flatMap((paragraph) => ['-m', paragraph])])
  }
  let fatal = null
  try {
    const repo = join(base, 'repo')
    mkdirSync(repo)
    run(repo, ['-c', 'init.defaultBranch=main', 'init', '-q'])
    commit(repo, files, ['the base'])
    run(repo, ['update-ref', TRUNK, 'HEAD'])
    const fresh = () => run(repo, ['switch', '-q', '--discard-changes', '-C', 'case', 'main'])

    for (const { name, commits = [], after, prepare, expect } of gitCases(files, live)) {
      let result
      try {
        fresh()
        const dir = prepare ? prepare({ base, repo, run, commit }) : repo
        for (const { edits = () => ({}), message } of commits) commit(dir, edits(files), message)
        if (after) writeTree(dir, after(files))
        result = checkInventory(dir)
      } catch (error) {
        result = { ok: false, report: [error.message] }
      }
      record(name, ...held(result, expect))
      if (name.startsWith('control') && !results.at(-1).ok) {
        fatal = 'an undoctored control does not pass'
        break
      }
    }

    if (fatal === null) {
      // The root override, end to end: the CLI pointed at a fixture that removes a test.
      fresh()
      commit(repo, { 'test/b.test.js': null })
      const cli = spawnSync(process.execPath, [SELF], { encoding: 'utf8', env: { ...process.env, TEST_INVENTORY_ROOT: repo } })
      const refusal = cli.stderr.split('\n').find((line) => /- remove: test\/b\.test\.js "\[FIX-004\] multiplies"/.test(line))
      record(
        'the CLI reads the repository TEST_INVENTORY_ROOT names',
        cli.status === 1 && refusal !== undefined,
        `status ${cli.status}, ${refusal === undefined ? `stderr ${JSON.stringify(cli.stderr.trim())}` : `printed ${JSON.stringify(refusal.trim())}`}`,
      )
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  return finish(results, fatal)
}

function finish(results, fatal = null) {
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  if (fatal) console.error(`selftest: ${fatal}, so no case can be trusted.`)
  console.log(`test-inventory selftest: ${results.length - failed.length}/${results.length} cases hold.`)
  process.exit(failed.length === 0 && fatal === null ? 0 : 1)
}

const swap = (path, from, to) => (tree) => {
  if (!tree[path].includes(from)) throw new Error(`the fixture's ${path} lacks ${JSON.stringify(from)}`)
  return { [path]: tree[path].replace(from, to) }
}
const removeB = () => ({ 'test/b.test.js': null })
/** The fixture's scripts moved from its package.json to a tasks.toml, as the move to mise moves them. */
const toToml = (tree) => {
  const { scripts, ...rest } = JSON.parse(tree[MANIFEST])
  return taskFiles(TASKS_TOML, scripts, rest)
}
const addSquares = (options) => (tree) => ({
  'test/b.test.js': `${tree['test/b.test.js']}\n// trace: FIX-006:happy@aaaaaaaaaaaa\ntest('[FIX-006] squares', ${options}() => {\n  assert.equal(3 ** 2, 9)\n})\n`,
})
/** The fixture's manifest with a script that runs the runner over `test/independent` by `--dir` (`--dir` alone where `dir` is empty), and `extra` files. */
const withDir = (extra, dir = 'test/independent') => (tree) => {
  const manifest = JSON.parse(tree[MANIFEST])
  manifest.scripts['unit:independent'] = `node scripts/run-tests.mjs --dir${dir ? ` ${dir}` : ''}`
  return { [MANIFEST]: `${JSON.stringify(manifest, null, 2)}\n`, ...extra }
}
const D_TEST = "import assert from 'node:assert/strict'\nimport { test } from 'node:test'\n// trace-defaults: layer=contract level=1\n\n// trace: FIX-007:happy@aaaaaaaaaaaa\ntest('[FIX-007] answers', () => {\n  assert.equal(7, 7)\n})\n"
const refusedAs = (kind, file, name) => new RegExp(`- ${kind}: ${file.replace(/[./]/g, '\\$&')} "${name.replace(/[[\]]/g, '\\$&')}"`)

/**
 * The decision's cases: each edits the fixture into a HEAD, gives the branch's trailer values, and
 * passes or refuses for the reason its expression names.
 */
function judgeCases() {
  const removedB = refusedAs('remove', 'test/b.test.js', '[FIX-004] multiplies')
  return [
    {
      name: 'control: a test added, an assertion added, a file no pattern matches deleted, and skip: false, pass',
      edit: (tree) => ({
        ...swap('test/a.test.js', '    assert.equal(1 + 1, 2)\n', '    assert.equal(1 + 1, 2)\n    assert.equal(2 + 1, 3)\n')(tree),
        ...addSquares('{ skip: false }, ')(tree),
        'test/nested/c.test.js': null,
      }),
      expect: { pass: /^test-inventory: 4 test\(s\) in 2 file\(s\) at the merge base ba5e000, 5 test\(s\) in 2 file\(s\) at HEAD 4ead000; 0 renamed with the call unchanged, 0 change\(s\) cleared/ },
    },
    { name: 'a test removed', edit: removeB, expect: { refuse: /- remove: test\/b\.test\.js "\[FIX-004\] multiplies" was at line 7 at the merge base and is not at HEAD/ } },
    { name: 'a test removed, with the decision recorded, passes', edit: removeB, values: ['remove test/b.test.js "[FIX-004] multiplies" its scenario retires'], expect: { pass: /1 change\(s\) cleared by a `[\w-]+` trailer, and none removed/ } },
    { name: 'a decision with no reason', edit: removeB, values: ['remove test/b.test.js "[FIX-004] multiplies"'], expect: { refuse: removedB } },
    { name: 'a decision whose reason is blank', edit: removeB, values: ['remove test/b.test.js "[FIX-004] multiplies"   '], expect: { refuse: removedB } },
    { name: 'a decision of another kind', edit: removeB, values: ['skip test/b.test.js "[FIX-004] multiplies" it is slow'], expect: { refuse: removedB } },
    { name: 'a decision naming another file', edit: removeB, values: ['remove test/a.test.js "[FIX-004] multiplies" retired'], expect: { refuse: removedB } },
    {
      name: 'a test renamed with its call unchanged passes, reported as renamed',
      edit: swap('test/b.test.js', "'[FIX-004] multiplies'", "'[FIX-004] multiplies two numbers'"),
      expect: { pass: /1 renamed with the call unchanged.*renamed: test\/b\.test\.js "\[FIX-004\] multiplies" -> test\/b\.test\.js "\[FIX-004\] multiplies two numbers"/ },
    },
    {
      name: 'a test file moved with its tests unchanged passes, as renamed',
      edit: (tree) => ({ 'test/b.test.js': null, 'test/d.test.js': tree['test/b.test.js'] }),
      expect: { pass: /1 renamed with the call unchanged.*-> test\/d\.test\.js "\[FIX-004\] multiplies"/ },
    },
    {
      name: 'a test renamed with its body changed',
      edit: (tree) => ({ 'test/b.test.js': tree['test/b.test.js'].replace("'[FIX-004] multiplies'", "'[FIX-004] multiplies twice'").replace('[2 * 2], [4]', '[2 * 3], [6]') }),
      expect: { refuse: /- remove: test\/b\.test\.js "\[FIX-004\] multiplies" .*new in the same file, each with its call changed: "\[FIX-004\] multiplies twice"/ },
    },
    {
      name: 'a test renamed with its call unchanged and an ID dropped',
      edit: swap('test/b.test.js', "'[FIX-004] multiplies'", "'[FIX-077] multiplies'"),
      expect: { refuse: /- remove: test\/b\.test\.js "\[FIX-004\] multiplies" .*new in the same file: "\[FIX-077\] multiplies", whose call is unchanged and whose name drops FIX-004/ },
    },
    {
      name: 'a test renamed with its call unchanged and an ID added passes, as renamed',
      edit: swap('test/b.test.js', "'[FIX-004] multiplies'", "'[FIX-004, FIX-009] multiplies'"),
      expect: { pass: /1 renamed with the call unchanged.*-> test\/b\.test\.js "\[FIX-004, FIX-009\] multiplies"/ },
    },
    { name: 'a pattern narrowed until a file drops out', edit: swap('package.json', 'test/*.test.js', 'test/a.test.js'), expect: { refuse: removedB } },
    {
      name: 'the scripts moved to a tasks.toml with every test kept pass, each side read from its own manifest',
      edit: toToml,
      expect: { pass: /4 test\(s\) in 2 file\(s\) at the merge base ba5e000, 4 test\(s\) in 2 file\(s\) at HEAD 4ead000; 0 renamed/ },
    },
    { name: 'the scripts moved to a tasks.toml and a test removed with them', edit: (tree) => ({ ...toToml(tree), ...removeB() }), expect: { refuse: removedB } },
    {
      name: 'a test removed from a directory a script runs with --dir',
      base: withDir({ 'test/independent/contract/d.test.js': D_TEST }),
      edit: withDir({ 'test/independent/contract/d.test.js': null }),
      expect: { refuse: /- remove: test\/independent\/contract\/d\.test\.js "\[FIX-007\] answers" was at line \d+ at the merge base and is not at HEAD/ },
    },
    { name: 'a --dir that names no directory, which is refused rather than read as no files', edit: withDir({}, ''), expect: { refuse: /`--dir` with no directory after it/ } },
    { name: 'a .skip modifier added', edit: swap('test/b.test.js', 'test(\n', 'test.skip(\n'), expect: { refuse: /- skip: test\/b\.test\.js "\[FIX-004\] multiplies" adds \.skip\./ } },
    { name: 'an .only modifier added', edit: swap('test/a.test.js', "test('[FIX-001]", "test.only('[FIX-001]"), expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-001\] adds" adds \.only\./ } },
    { name: 'a todo option added', edit: swap('test/a.test.js', "'[FIX-001] adds', () =>", "'[FIX-001] adds', { todo: 'later' }, () =>"), expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-001\] adds" adds todo: 'later'\./ } },
    { name: "a skip option's condition widened", edit: swap('test/a.test.js', "skip: process.platform === 'win32'", 'skip: true'), expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-003\] divides" adds skip: true\./ } },
    {
      name: 'a skip called in the body',
      edit: swap('test/a.test.js', '    t.assert.equal(3 - 1, 2)\n', "    t.skip('not today')\n    t.assert.equal(3 - 1, 2)\n"),
      expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-002\] subtracts" adds <context>\.skip\(\)\./ },
    },
    {
      name: 'a describe around the tests skipped',
      edit: swap('test/a.test.js', "describe('arithmetic'", "describe.skip('arithmetic'"),
      expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-001\] adds" adds describe \.skip\..*- skip: test\/a\.test\.js "\[FIX-002\] subtracts" adds describe \.skip\..*- skip: test\/a\.test\.js "\[FIX-003\] divides" adds describe \.skip\./ },
    },
    {
      name: 'the top-level constant a skip names switched on',
      edit: swap('test/b.test.js', 'const SKIP_NEVER = false', 'const SKIP_NEVER = true'),
      expect: { refuse: /- skip: test\/b\.test\.js "\[FIX-004\] multiplies" adds skip: SKIP_NEVER \(= true\)\./ },
    },
    {
      name: "a multi-line constant's condition widened",
      edit: swap('test/a.test.js', "    ? 'slow here'\n    : false\n", "    ? 'slow here'\n    : 'always'\n"),
      expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-002\] subtracts" adds skip: SKIP_SLOW \(= process\.env\.FIXTURE_NEVER_SET==='yes'\?'slow here':'always'\)\./ },
    },
    {
      name: 'a skip called in a beforeEach hook of the suite around the tests',
      edit: swap('test/a.test.js', "describe('arithmetic', () => {\n", "describe('arithmetic', () => {\n  beforeEach((t) => t.skip('flaky'))\n"),
      expect: { refuse: /- skip: test\/a\.test\.js "\[FIX-001\] adds" adds describe hook <context>\.skip\(\)\..*"\[FIX-003\] divides" adds describe hook <context>\.skip\(\)\./ },
    },
    {
      name: 'a skip called in a before hook of the file',
      edit: swap('test/b.test.js', 'const SKIP_NEVER = false\n', "const SKIP_NEVER = false\nbefore((t) => t.skip('later'))\n"),
      expect: { refuse: /- skip: test\/b\.test\.js "\[FIX-004\] multiplies" adds file hook <context>\.skip\(\)\./ },
    },
    {
      name: 'a suite reached through brackets',
      edit: swap('test/a.test.js', "describe('arithmetic'", "describe['skip']('arithmetic'"),
      expect: { refuse: /could not be read.*test\/a\.test\.js:\d+: `describe` is used other than as a call/ },
    },
    {
      name: "a suite's skip bound to another name",
      edit: swap('test/a.test.js', "describe('arithmetic'", "const xdescribe = describe.skip\nxdescribe('arithmetic'"),
      expect: { refuse: /could not be read.*test\/a\.test\.js:\d+: `describe` is used other than as a call/ },
    },
    {
      name: 'a suite bound to another name',
      edit: swap('test/a.test.js', "describe('arithmetic'", "const group = describe\ngroup.skip('arithmetic'"),
      expect: { refuse: /could not be read.*test\/a\.test\.js:\d+: `describe` is used other than as a call/ },
    },
    { name: 'a new test that carries a skip', edit: addSquares("{ skip: 'no time' }, "),expect: { refuse: /- skip: test\/b\.test\.js "\[FIX-006\] squares" is new on this branch, and carries skip: 'no time'\./ } },
    { name: 'an assertion removed', edit: swap('test/a.test.js', '    assert.equal(1 + 1, 2)\n', ''), expect: { refuse: /- weaken: test\/a\.test\.js "\[FIX-001\] adds" has 2 assertion call site\(s\), where it had 3\./ } },
    {
      name: 'an assertion moved into a comment',
      edit: swap('test/b.test.js', '    assert.deepEqual([2 * 2], [4], note)\n', '    // assert.deepEqual([2 * 2], [4], note)\n'),
      expect: { refuse: /- weaken: test\/b\.test\.js "\[FIX-004\] multiplies" has 0 assertion call site\(s\), where it had 1\./ },
    },
    {
      name: "an assertion through the test context's assert removed",
      edit: swap('test/a.test.js', '    t.assert.equal(3 - 1, 2)\n', ''),
      expect: { refuse: /- weaken: test\/a\.test\.js "\[FIX-002\] subtracts" has 2 assertion call site\(s\), where it had 3\./ },
    },
    { name: 'a call of an assert helper removed', edit: swap('test/a.test.js', '    assertPair(5 - 5, 0)\n', ''), expect: { refuse: /- weaken: test\/a\.test\.js "\[FIX-002\] subtracts" has 2 assertion call site\(s\), where it had 3\./ } },
    { name: 'a call of an assertion imported by name removed', edit: swap('test/a.test.js', '    equal(2 + 2, 4)\n', ''), expect: { refuse: /- weaken: test\/a\.test\.js "\[FIX-001\] adds" has 2 assertion call site\(s\), where it had 3\./ } },
    {
      name: 'an assertion removed, with the decision recorded, passes',
      edit: swap('test/a.test.js', '    equal(2 + 2, 4)\n', ''),
      values: ['weaken test/a.test.js "[FIX-001] adds" the sum is asserted twice'],
      expect: { pass: /1 change\(s\) cleared/ },
    },
    {
      name: 'a test call that cannot be read to its end',
      edit: swap('test/b.test.js', '    assert.deepEqual([2 * 2], [4], note)\n', '    assert.deepEqual([2 * 2], [4], note\n'),
      expect: { refuse: /at HEAD, test\/b\.test\.js:7: the call of "\[FIX-004\] multiplies" cannot be read to its closing parenthesis/ },
    },
  ]
}

/**
 * The git reading's cases: each makes commits on a branch from the fixture's base, or prepares a
 * repository of its own, and passes or refuses for the reason its expression names. `trailer` is
 * the live trailer's key.
 */
function gitCases(files, trailer) {
  const decide = (line) => ['a change', `${trailer}: ${line}\nCo-Authored-By: selftest <selftest@example.invalid>`]
  const removedB = refusedAs('remove', 'test/b.test.js', '[FIX-004] multiplies')
  return [
    {
      name: 'control: a branch that adds a test and an assertion passes, both commits read from git',
      commits: [{ edits: (tree) => ({ ...swap('test/a.test.js', '    equal(2 + 2, 4)\n', '    equal(2 + 2, 4)\n    equal(2 + 3, 5)\n')(tree), ...addSquares('')(tree) }) }],
      expect: { pass: /^test-inventory: 4 test\(s\) in 2 file\(s\) at the merge base \w{7}, 5 test\(s\) in 2 file\(s\) at HEAD \w{7}; 0 renamed/ },
    },
    { name: 'control: HEAD at origin/main passes', expect: { pass: /is its own merge base with origin\/main/ } },
    {
      name: 'control: a removal left uncommitted in the working tree is not read',
      commits: [{ edits: () => ({ 'README.md': '# fixture, noted\n' }) }],
      after: removeB,
      expect: { pass: /4 test\(s\) in 2 file\(s\) at HEAD/ },
    },
    { name: 'a test removed on a commit', commits: [{ edits: removeB }], expect: { refuse: removedB } },
    {
      name: "a decision in the last paragraph of the removing commit's message clears it",
      commits: [{ edits: removeB, message: decide('remove test/b.test.js "[FIX-004] multiplies" its scenario retires with this change') }],
      expect: { pass: /1 change\(s\) cleared/ },
    },
    {
      name: 'a decision on an earlier commit of the branch clears a later removal',
      commits: [{ edits: () => ({ 'README.md': '# fixture, noted\n' }), message: decide('remove test/b.test.js "[FIX-004] multiplies" retired by the change') }, { edits: removeB }],
      expect: { pass: /1 change\(s\) cleared/ },
    },
    {
      name: 'a decision outside the last paragraph, which git does not read as a trailer',
      commits: [{ edits: removeB, message: ['a change', `${trailer}: remove test/b.test.js "[FIX-004] multiplies" retired`, 'A closing paragraph.'] }],
      expect: { refuse: removedB },
    },
    {
      name: "a decision whose key differs from the policy's in case, which git's own filter would match",
      commits: [{ edits: removeB, message: ['a change', `${trailer.toLowerCase()}: remove test/b.test.js "[FIX-004] multiplies" retired\nCo-Authored-By: selftest <selftest@example.invalid>`] }],
      expect: trailer.toLowerCase() === trailer ? { pass: /this case needs a key with a capital/ } : { refuse: removedB },
    },
    { name: "a pattern narrowed in HEAD's package.json", commits: [{ edits: swap('package.json', 'test/*.test.js', 'test/a.test.js') }], expect: { refuse: removedB } },
    {
      name: "control: the base's scripts in package.json and HEAD's in a tasks.toml, every test kept, pass",
      commits: [{ edits: toToml }],
      expect: { pass: /^test-inventory: 4 test\(s\) in 2 file\(s\) at the merge base \w{7}, 4 test\(s\) in 2 file\(s\) at HEAD \w{7}; 0 renamed/ },
    },
    {
      name: "the base's scripts in package.json and HEAD's in a tasks.toml with a test removed, which a read of one file at both would pass",
      commits: [{ edits: (tree) => ({ ...toToml(tree), ...removeB() }) }],
      expect: { refuse: removedB },
    },
    {
      name: 'a policy at HEAD with no trailer key',
      commits: [{ edits: () => ({ [VOCABULARY]: recordText(FIXTURE_POLICY[VOCABULARY]) }) }],
      expect: { refuse: /has no trailer key under `testInventoryTrailer`/ },
    },
    {
      name: 'a shallow clone',
      prepare: ({ base, repo, run }) => {
        const shallow = join(base, 'shallow')
        run(base, ['clone', '-q', '--depth', '1', '--branch', 'main', `file://${repo}`, shallow])
        return shallow
      },
      expect: { refuse: /this clone is shallow/ },
    },
    {
      name: 'a clone with no origin/main',
      prepare: ({ base, run, commit }) => {
        const lone = join(base, 'lone')
        mkdirSync(lone)
        run(lone, ['-c', 'init.defaultBranch=main', 'init', '-q'])
        commit(lone, files)
        return lone
      },
      expect: { refuse: /this clone has no origin\/main/ },
    },
  ]
}

if (resolve(process.argv[1] ?? '') === SELF) {
  if (process.argv.includes('--selftest')) selftest()
  else main()
}
