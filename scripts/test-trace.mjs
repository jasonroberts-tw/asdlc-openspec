/**
 * Test-trace reader: reads, from a test file's source, what each test proves, how, at which layer
 * and orchestration level, and against which version of each artifact; and hashes an artifact a test
 * cites. This header is the one home of the convention every test here is written in
 * (`docs/decisions.md` § D-13, item 17, which gives it to the header of the tool that reads a test's
 * metadata; landed by asdlc-openspec-j09.5, whose notes record the maintainer's choices).
 * `scripts/run-tests.mjs` reads every test file it runs through it and refuses what it refuses; the
 * trace gate (asdlc-openspec-j09.7) and the test-inventory gate (asdlc-openspec-j09.9) are to read
 * tests through it too, from committed files and from a merge base.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong or absent. Before it, a test traced to its scenario by the scenario's title copied into its
 * name, and nothing recorded which version of the scenario it was written against, so a scenario
 * rewritten under the same title left its old test standing as its proof. And a reader that misses a
 * test returns a smaller answer and says nothing: the trace gate would count a scenario unproved by
 * a test it never saw. So `scripts/run-tests.mjs` compares, file by file, the tests this reader
 * finds with the tests Node's runner reports, by the line of the call and the name, and refuses
 * either difference.
 *
 * THE NAME. A test's name is one string literal, the first argument of a call that opens its line
 * (`test(`, `it(`, or either with `.skip`, `.todo` or `.only`), written on that line or alone on the
 * next. It is `[<ID>] <title>`, or `[<ID>, <ID>] <title>` for several: the IDs it references, then
 * its title. An ID is a scenario's (`CALC-003`), an NFR requirement's (`NFR-CALC-001`) or a tracker
 * task's (`asdlc-openspec-zgh.4`, the shape `prReviewIssuePattern` in `tools/policy.json` holds). A
 * happy-path test's title is its scenario's title, as its header has it after the ID. A name is
 * unique in its file. A test registered in a loop, by a helper, under a condition or inside another
 * test's body is refused, by this reader or by the runner's cross-check: write each as a literal call,
 * and skip one with the `skip` option and its reason rather than an `if`.
 *
 * THE TRACE LINE. Directly above that line, one or more consecutive lines `// trace: <token> ...`,
 * read as one, whose tokens are separated by spaces, and whose reasons are in double quotes:
 *
 *   <SCENARIO>:happy@<hash>          the happy-path test of that scenario
 *   <SCENARIO>:negative@<hash>       its negative test (docs/test-strategy.md § Test classifications)
 *   <NFR>@<hash>                     a test of that NFR requirement
 *   <task>                           a task the test serves; it carries no hash
 *   surface:<path>@<hash>            the app's Binding Surface file, apps/<app>/binding-surface.md
 *   contract:<path>#<operation>@<hash>  a contract under apps/<app>/contracts/, and the operation
 *                                    (its operationId) the test covers
 *   layer=<layer>                    its layer, where the file's default does not hold
 *   level=<n> ["<reason>"]           its orchestration level, 1 to 3, with the reason when it is above
 *                                    its layer's default, and only then
 *   no-negative:<SCENARIO> "<reason>"  on a happy-path test: that scenario's negative test is not
 *                                    applicable, and why (D-13, item 10)
 *
 * The IDs of its scenario, NFR and task tokens are exactly the IDs of its name. A test whose name
 * carries task IDs alone also cites its app's Binding Surface: a task is in the tracker, which a
 * clone does not have, so the surface is the artifact whose version the test was written against.
 * The layers and each one's default level are `testTraceLayers` in `tools/policy.json`; mutation is
 * not a layer, and a mutation run references the suite it targets (the strategy's rule 7). A line
 * `// trace-defaults: layer=<layer> level=<n> ["<reason>"]`, at most one, above a file's first test,
 * gives the layer and level of every test that does not state its own: a test's level is its own,
 * else the file's, else its layer's default, and a layer with none (fitness) must be given one.
 *
 *   // trace-defaults: layer=functional level=1
 *   // trace: CALC-003:happy@<hash>
 *   test('[CALC-003] Digits build a number', () => { ... })
 *   // trace: asdlc-openspec-zgh.4 surface:apps/calculator/binding-surface.md@<hash>
 *   test('[asdlc-openspec-zgh.4] SIGTERM stops the server as Ctrl-C does', ...)
 *
 * THE HASH of an artifact is the first `testTraceHashLength` characters (`tools/policy.json`) of the
 * lowercase hex sha256 of its text, as UTF-8. `node scripts/test-trace.mjs cite <ref>` prints it.
 *
 *   - A scenario: its requirement's statement, the requirement's lines below its header up to the
 *     next header, then the scenario's block, from its header line up to the next header of its level
 *     or above; each normalised, the two joined by a line feed. The requirement is the nearest header
 *     above the scenario of a lower level, and must be headed `Requirement:`. Its header is left out:
 *     a change that only renames a requirement moves no scenario's hash, before or after its archive,
 *     since a requirement that is not an NFR carries no ID and its name is not what a test proves.
 *   - An NFR requirement: its whole block, from its header line up to the next header of its level
 *     or above, its scenarios included; normalised. Its header carries its ID, and a new title takes
 *     a new ID (the header of scripts/check-openspec.mjs).
 *   - A file (a Binding Surface or a contract): its whole text, with CR LF and a lone CR read as LF.
 *
 * Normalised: CR LF and a lone CR read as LF, trailing spaces and tabs stripped from each line, the
 * lines then empty dropped, and the rest joined by a line feed, so that an archive by the pinned
 * OpenSpec 1.6.0, which rewrites the blank lines around the blocks it merges (measured 2026-09-28: it
 * drops the blank lines that end a block and joins two requirements with one), moves no hash; the
 * selftest archives a fixture change with that CLI and asserts it. A header inside fenced code is not
 * a header, by OpenSpec 1.6.0's fence rule (`requirement-text.js`, which
 * `scripts/check-openspec.mjs` follows too). The block is read from an active change's delta spec
 * when an ADDED or MODIFIED section of one heads it, and from the living spec otherwise; an ID that
 * two active deltas head, or none of the files, is refused. A scenario's hash changes with any change
 * to its requirement's statement, a typo fix included: the maintainer chose that over the scenario's
 * block alone, which left a test current when its requirement's prose was reworded.
 *
 * WHAT IT DOES NOT CHECK, each the trace gate's (asdlc-openspec-j09.7): whether an ID heads a
 * scenario or an NFR requirement that exists, whether a hash is current, and whether a scenario has
 * its happy-path and its negative test. Nor whether a test's layer is the right one, or whether a
 * happy-path test's title is its scenario's, which review holds. The runner's cross-check holds only
 * that the tests it reports are the tests read here.
 *
 * INVOCATION.
 *
 *   node scripts/test-trace.mjs cite <ref> [...]   print each ref with its current hash, as a trace
 *                                                  line cites it: an ID (`CALC-003`,
 *                                                  `CALC-003:happy`, `NFR-CALC-001`),
 *                                                  `surface:<path>` or `contract:<path>#<operation>`
 *   npm run tests:trace:selftest                   its fixtures, each refusal on a doctored copy
 *
 * The verb is not `hash`: on 2026-09-28 the harness of a session isolated in a worktree refused
 * `node scripts/test-trace.mjs hash <ref>` as running a string through the shell's `hash` builtin.
 * By hand, point `TEST_TRACE_ROOT` at a doctored copy and `cite` reads the specs and the policy there
 * instead: `TEST_TRACE_ROOT=/tmp/doctored node scripts/test-trace.mjs cite CALC-003`.
 *
 * NEEDS `tools/policy.json` (`testTraceHashLength`, `testTraceLayers`, `prReviewIssuePattern`) and,
 * for a hash, the specs under `openspec/` and the file a ref names. The selftest also runs the
 * pinned OpenSpec CLI once, to archive a fixture change (`npm ci`). Reads only committed files; no
 * network. Reading the calculator's four test files through it, the policy included, took 3.4 ms on
 * a macOS laptop with Node 26.8.1 on 2026-09-28, nothing beside the runner's own cost; the
 * selftest's cost is on its job in `lefthook.yml`.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { findBin } from './lib/bin-path.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SELF = fileURLToPath(import.meta.url)

export const POLICY_FILE = 'tools/policy.json'
const HASH_LENGTH_KEY = 'testTraceHashLength'
const LAYERS_KEY = 'testTraceLayers'
const TASK_PATTERN_KEY = 'prReviewIssuePattern'

const SCENARIO_ID = /^(?!NFR-)[A-Z][A-Z0-9]*-\d{3,}$/
const NFR_ID = /^NFR-[A-Z][A-Z0-9]*-\d{3,}$/
const SURFACE_PATH = /^apps\/[^/\s]+\/binding-surface\.md$/
const CONTRACT_PATH = /^apps\/[^/\s]+\/contracts\/\S+$/
const OPERATION = /^[A-Za-z0-9_.-]+$/
const CALL = /^\s*(?:test|it)(?:\.(skip|todo|only))?\(\s*(.*)$/
const TRACE = /^\s*\/\/\s*trace:(.*)$/
const DEFAULTS = /^\s*\/\/\s*trace-defaults:(.*)$/
const LITERAL = /^(['"`])((?:\\.|(?!\1)[^\\])*)\1/
const NAME = /^\[([^\]]+)\] (\S.*)$/
const LEVELS = [1, 2, 3]

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

/* --------------------------------------------------------------------------------- policy ------- */

/**
 * The constants the convention reads, from `tools/policy.json` under `root`. Throws an Error whose
 * message says which key is missing or malformed.
 */
export function readTracePolicy(root) {
  let policy
  try {
    policy = JSON.parse(readFileSync(join(root, POLICY_FILE), 'utf8'))
  } catch (error) {
    throw new Error(`${POLICY_FILE} cannot be read as JSON under ${root} (${error.message}).`)
  }
  return tracePolicy(policy)
}

/** The same constants, from a policy already parsed: `{ hashLength, layers, task }`. */
export function tracePolicy(policy) {
  const hashLength = policy[HASH_LENGTH_KEY]
  if (!Number.isInteger(hashLength) || hashLength < 1 || hashLength > 64) {
    throw new Error(
      `${POLICY_FILE} has no whole number from 1 to 64 under \`${HASH_LENGTH_KEY}\`: the length of` +
        ` every hash a test's \`// trace:\` line carries (the header of scripts/test-trace.mjs).`,
    )
  }
  const layers = policy[LAYERS_KEY]
  const levelOk = (level) => level === null || LEVELS.includes(level)
  if (
    layers === null ||
    typeof layers !== 'object' ||
    Array.isArray(layers) ||
    Object.keys(layers).length === 0 ||
    !Object.values(layers).every(levelOk)
  ) {
    throw new Error(
      `${POLICY_FILE} has no object under \`${LAYERS_KEY}\` mapping each layer a test may declare` +
        ` to its default orchestration level, 1 to 3, or null where the level is declared per test.`,
    )
  }
  let task
  try {
    if (typeof policy[TASK_PATTERN_KEY] !== 'string') throw new Error('not a string')
    task = new RegExp(`^(?:${policy[TASK_PATTERN_KEY]})$`)
  } catch {
    throw new Error(`${POLICY_FILE} has no regular expression under \`${TASK_PATTERN_KEY}\`: a tracker task's ID.`)
  }
  return { hashLength, layers, task }
}

/* --------------------------------------------------------------------------------- the reader --- */

/**
 * The tests of one test file's source, and the problems its trace metadata has. Each test is
 * `{ line, name, modifier, ids, refs, layer, level, reason, noNegative }`, `line` being the 1-based
 * line of its call; each problem a string `<file>:<line>: <what is wrong, and what to do>`.
 */
export function readTests(text, policy, file = '<source>') {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const problems = []
  const problem = (index, message) => problems.push(`${file}:${index + 1}: ${message}`)
  const tests = []
  const consumed = new Set()

  const calls = []
  let defaults = { layer: null, level: null, reason: null }
  let defaultsAt = null
  lines.forEach((line, index) => {
    const call = line.match(CALL)
    if (call) calls.push({ index, modifier: call[1] ?? null, rest: call[2] })
    const given = line.match(DEFAULTS)
    if (!given) return
    if (defaultsAt !== null) {
      problem(index, `a second \`// trace-defaults:\` line; the first is at line ${defaultsAt + 1}. Keep one.`)
      return
    }
    defaultsAt = index
    if (calls.length > 0) {
      problem(index, '`// trace-defaults:` below a test: put it above the file\'s first test.')
    }
    defaults = parseDefaults(given[1], policy, (message) => problem(index, message))
  })

  const names = new Map()
  for (const { index, modifier, rest } of calls) {
    let first = index
    while (first > 0 && TRACE.test(lines[first - 1])) first--
    for (let at = first; at < index; at++) consumed.add(at)

    const source = rest.trim() === '' ? (lines[index + 1] ?? '').trim() : rest
    const literal = source.match(LITERAL)
    if (!literal || (literal[1] === '`' && literal[2].includes('${'))) {
      problem(
        index,
        'this test\'s name is not one string literal. Write it as `\'[<ID>] <title>\'`, the call\'s first' +
          ' argument, on this line or alone on the next.',
      )
      continue
    }
    const name = literal[2].replace(/\\(.)/g, '$1')
    const test = { line: index + 1, name, modifier, ids: [], refs: [], layer: null, level: null, reason: null, noNegative: [] }
    tests.push(test)
    if (names.has(name)) {
      problem(index, `the name "${name}" is already the name of the test at line ${names.get(name)}; a name is unique in its file.`)
    } else {
      names.set(name, index + 1)
    }

    const bracket = name.match(NAME)
    const nameIds = bracket ? bracket[1].split(', ') : []
    if (!bracket || nameIds.some((id) => !isId(id, policy))) {
      problem(
        index,
        `"${name}" does not open with the IDs it references: write \`[<ID>] <title>\` or` +
          ' `[<ID>, <ID>] <title>`, each ID a scenario\'s, an NFR requirement\'s or a tracker task\'s.',
      )
    }
    const twice = nameIds.filter((id, n) => nameIds.indexOf(id) !== n)
    if (twice.length > 0) problem(index, `"${name}" names ${twice.join(', ')} twice; name each ID once.`)
    test.ids = nameIds

    if (first === index) {
      problem(index, `the test "${name}" has no \`// trace:\` line directly above it (the header of scripts/test-trace.mjs).`)
      continue
    }
    const words = lines
      .slice(first, index)
      .map((line) => line.match(TRACE)[1])
      .join(' ')
    parseTrace(words, test, policy, (message) => problem(first, message))
    resolveLayer(test, defaults, policy, (message) => problem(first, message))

    const traced = test.refs.filter((ref) => 'id' in ref).map((ref) => ref.id)
    const missing = nameIds.filter((id) => !traced.includes(id))
    const extra = traced.filter((id) => !nameIds.includes(id))
    if (bracket && (missing.length > 0 || extra.length > 0)) {
      problem(
        first,
        `the IDs of "${name}" and of its \`// trace:\` line differ` +
          (missing.length > 0 ? `; the name has ${missing.join(', ')} and the line does not` : '') +
          (extra.length > 0 ? `; the line has ${extra.join(', ')} and the name does not` : '') +
          '. They name the same IDs.',
      )
    }
    const kinds = new Set(test.refs.map((ref) => ref.kind))
    if (kinds.has('task') && !kinds.has('scenario') && !kinds.has('nfr') && !kinds.has('surface')) {
      problem(
        first,
        `"${name}" references tasks alone, so it also cites its app's Binding Surface,` +
          ' `surface:apps/<app>/binding-surface.md@<hash>`: the tracker is not in a clone, and the surface' +
          ' is the artifact whose version the test was written against.',
      )
    }
    for (const { id } of test.noNegative) {
      if (!test.refs.some((ref) => ref.kind === 'scenario' && ref.id === id && ref.role === 'happy')) {
        problem(first, `\`no-negative:${id}\` is on a test that is not ${id}'s happy-path test; declare it on that test.`)
      }
    }
  }

  lines.forEach((line, index) => {
    if (TRACE.test(line) && !consumed.has(index)) {
      problem(index, 'a `// trace:` line that no test call directly follows; put it on the line above its test.')
    }
  })
  return { tests, problems }
}

function isId(id, policy) {
  return SCENARIO_ID.test(id) || NFR_ID.test(id) || policy.task.test(id)
}

/** The words of a trace line, a double-quoted reason being one word. */
function tokens(words) {
  const out = []
  for (const match of words.matchAll(/"([^"]*)"|(\S+)/g)) {
    out.push(match[1] !== undefined ? { reason: match[1].trim() } : { word: match[2] })
  }
  return out
}

function hashOk(hash, policy) {
  return new RegExp(`^[0-9a-f]{${policy.hashLength}}$`).test(hash)
}

function parseDefaults(words, policy, problem) {
  const defaults = { layer: null, level: null, reason: null }
  const list = tokens(words)
  for (let n = 0; n < list.length; n++) {
    const { word, reason } = list[n]
    if (word?.startsWith('layer=') && defaults.layer === null) {
      defaults.layer = checkLayer(word.slice(6), policy, problem)
    } else if (word?.startsWith('level=') && defaults.level === null) {
      defaults.level = checkLevel(word.slice(6), problem)
      if (list[n + 1]?.reason !== undefined) defaults.reason = list[++n].reason
    } else {
      problem(
        `\`// trace-defaults:\` holds \`${word ?? `"${reason}"`}\`; it takes \`layer=<layer>\` and` +
          ' `level=<n>`, each once, and a reason only after the level.',
      )
    }
  }
  return defaults
}

function checkLayer(layer, policy, problem) {
  if (Object.hasOwn(policy.layers, layer)) return layer
  const known = Object.keys(policy.layers).sort(byCodePoint).join(', ')
  problem(`\`layer=${layer}\` names no layer; the layers are ${known} (\`${LAYERS_KEY}\` in ${POLICY_FILE}).`)
  return null
}

function checkLevel(level, problem) {
  const n = Number(level)
  if (/^\d+$/.test(level) && LEVELS.includes(n)) return n
  problem(`\`level=${level}\` is not an orchestration level; a level is 1, 2 or 3 (docs/test-strategy.md § Environment orchestration rules).`)
  return null
}

function parseTrace(words, test, policy, problem) {
  const list = tokens(words)
  const seen = new Set()
  const once = (key, shown) => {
    if (seen.has(key)) {
      problem(`\`${shown}\` appears twice in the \`// trace:\` line; name each reference once.`)
      return false
    }
    seen.add(key)
    return true
  }
  const withHash = (word) => {
    const at = word.lastIndexOf('@')
    return at < 0 ? [word, null] : [word.slice(0, at), word.slice(at + 1)]
  }
  const needHash = (shown, hash) => {
    if (hash !== null && hashOk(hash, policy)) return true
    problem(
      `\`${shown}\` does not end in \`@\` and a hash of ${policy.hashLength} lowercase hex characters;` +
        ` \`node scripts/test-trace.mjs cite\` prints it.`,
    )
    return false
  }
  const notAToken = (word) =>
    problem(
      `\`${word}\` is not a token of a \`// trace:\` line: a scenario, NFR or task reference, \`surface:\`,` +
        ' `contract:`, `layer=`, `level=` or `no-negative:` (the header of scripts/test-trace.mjs).',
    )
  for (let n = 0; n < list.length; n++) {
    const { word, reason } = list[n]
    if (word === undefined) {
      problem(`the reason "${reason}" follows neither \`level=<n>\` nor \`no-negative:<ID>\`; a reason follows one of them.`)
      continue
    }
    if (word.startsWith('layer=')) {
      if (once('layer=', 'layer=')) test.layer = checkLayer(word.slice(6), policy, problem)
    } else if (word.startsWith('level=')) {
      if (once('level=', 'level=')) test.level = checkLevel(word.slice(6), problem)
      if (list[n + 1]?.reason !== undefined) test.reason = list[++n].reason
    } else if (word.startsWith('no-negative:')) {
      const id = word.slice('no-negative:'.length)
      if (!SCENARIO_ID.test(id)) problem(`\`${word}\` does not name a scenario ID.`)
      const why = list[n + 1]?.reason
      if (why === undefined || why === '') {
        problem(`\`${word}\` gives no reason; follow it with the reason in double quotes.`)
      }
      if (why !== undefined) n++
      if (once(word, word)) test.noNegative.push({ id, reason: why ?? '' })
    } else if (word.startsWith('surface:')) {
      const [path, hash] = withHash(word.slice('surface:'.length))
      if (!SURFACE_PATH.test(path)) problem(`\`${word}\` does not name an app's Binding Surface, \`apps/<app>/binding-surface.md\`.`)
      else if (needHash(word, hash) && once(`surface:${path}`, word)) test.refs.push({ kind: 'surface', path, hash })
    } else if (word.startsWith('contract:')) {
      const [target, hash] = withHash(word.slice('contract:'.length))
      const [path, operation, ...more] = target.split('#')
      if (!CONTRACT_PATH.test(path) || path.split('/').includes('..') || operation === undefined || !OPERATION.test(operation) || more.length > 0) {
        problem(`\`${word}\` is not \`contract:apps/<app>/contracts/<file>#<operationId>@<hash>\`.`)
      } else if (needHash(word, hash) && once(`contract:${target}`, word)) {
        test.refs.push({ kind: 'contract', path, operation, hash })
      }
    } else {
      const [head, hash] = withHash(word)
      const [id, role, ...more] = head.split(':')
      if (SCENARIO_ID.test(id) && more.length === 0) {
        if (role !== 'happy' && role !== 'negative') {
          problem(`\`${word}\` names a scenario without its role: write \`${id}:happy@<hash>\` or \`${id}:negative@<hash>\`.`)
        } else if (needHash(word, hash) && once(id, id)) {
          test.refs.push({ kind: 'scenario', id, role, hash })
        }
      } else if (NFR_ID.test(id) && role === undefined) {
        if (needHash(word, hash) && once(id, id)) test.refs.push({ kind: 'nfr', id, hash })
      } else if (policy.task.test(word)) {
        if (once(word, word)) test.refs.push({ kind: 'task', id: word })
      } else {
        notAToken(word)
      }
    }
  }
}

/** The test's layer and level, from its own line, else the file's defaults, else its layer's default. */
function resolveLayer(test, defaults, policy, problem) {
  const fromTest = test.level !== null
  test.layer ??= defaults.layer
  if (test.layer === null) {
    problem(`"${test.name}" declares no layer, and the file's \`// trace-defaults:\` gives none: add \`layer=<layer>\`.`)
    return
  }
  const floor = policy.layers[test.layer]
  if (!fromTest) {
    test.level = defaults.level ?? floor
    test.reason = defaults.level === null ? null : defaults.reason
  }
  if (test.level === null) {
    problem(`"${test.name}" is at layer ${test.layer}, which has no default level: add \`level=<n>\`.`)
    return
  }
  if (floor !== null && test.level > floor && !test.reason) {
    problem(
      `"${test.name}" is at level ${test.level}, above ${test.layer}'s default of ${floor}, with no reason:` +
        ` write \`level=${test.level} "<why it needs it>"\`.`,
    )
  }
  if (floor !== null && test.level <= floor && test.reason) {
    problem(`"${test.name}" gives a reason for level ${test.level}, which is not above ${test.layer}'s default of ${floor}; drop it.`)
  }
}

/* --------------------------------------------------------------------------------- the hash ----- */

/** The text of `lines` as the hash reads it: trailing spaces and tabs stripped, empty lines dropped. */
function normalise(lines) {
  return lines
    .map((line) => line.replace(/[ \t]+$/, ''))
    .filter((line) => line !== '')
    .join('\n')
}

function sha(text, length) {
  return createHash('sha256').update(text, 'utf8').digest('hex').slice(0, length)
}

/**
 * The lines of `lines` inside fenced code, the fence lines included, by OpenSpec 1.6.0's rule
 * (`requirement-text.js`, `buildCodeFenceMask`): a fence opens on three or more backticks or tildes
 * after any indent, and closes only on a line of the same marker, at least as long, with nothing
 * after it but whitespace.
 */
function fenceMask(lines) {
  const mask = new Array(lines.length).fill(false)
  let open = null
  for (let index = 0; index < lines.length; index++) {
    if (open === null) {
      const opener = lines[index].match(/^\s*(`{3,}|~{3,})/)
      if (opener) {
        open = opener[1]
        mask[index] = true
      }
      continue
    }
    mask[index] = true
    const closer = lines[index].match(/^\s*(`{3,}|~{3,})\s*$/)
    if (closer && closer[1][0] === open[0] && closer[1].length >= open.length) open = null
  }
  return mask
}

/**
 * Every ID-bearing block of one spec file, `{ id, line, text }` or `{ id, line, error }`, `text`
 * being what the hash reads. In a delta (`delta`), only its ADDED and MODIFIED sections are read.
 */
function specBlocks(source, delta) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const mask = fenceMask(lines)
  const heads = []
  let section = null
  lines.forEach((line, index) => {
    const header = mask[index] ? null : line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (!header) return
    const level = header[1].length
    if (level <= 2) section = header[2].match(/^(ADDED|MODIFIED|REMOVED|RENAMED)\s+Requirements$/i)?.[1].toUpperCase() ?? null
    heads.push({ index, level, title: header[2], section })
  })
  const end = (n) => heads.slice(n + 1).find((later) => later.level <= heads[n].level)?.index ?? lines.length
  const blocks = []
  heads.forEach((head, n) => {
    if (delta && head.section !== 'ADDED' && head.section !== 'MODIFIED') return
    const nfr = head.title.match(/^Requirement:\s*\[(NFR-[^\]\s]+)\]\s/i)
    const scenario = head.title.match(/^Scenario:\s*\[([^\]\s]+)\]\s/i)
    if (nfr) {
      blocks.push({ id: nfr[1], line: head.index + 1, text: normalise(lines.slice(head.index, end(n))) })
    } else if (scenario) {
      const above = heads.slice(0, n).reverse().find((earlier) => earlier.level < head.level)
      if (above === undefined || !/^Requirement:/i.test(above.title)) {
        blocks.push({ id: scenario[1], line: head.index + 1, error: 'has no `Requirement:` header above it' })
        return
      }
      const r = heads.indexOf(above)
      const statement = lines.slice(above.index + 1, heads[r + 1].index)
      blocks.push({
        id: scenario[1],
        line: head.index + 1,
        text: `${normalise(statement)}\n${normalise(lines.slice(head.index, end(n)))}`,
      })
    }
  })
  return blocks
}

function listDirs(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isDirectory())
    .sort(byCodePoint)
}

/** Every ID-bearing block under `root`'s `openspec/`, keyed by ID: `[{ path, delta, line, text | error }]`. */
export function specIndex(root) {
  const index = new Map()
  const read = (path, delta) => {
    if (!existsSync(join(root, path))) return
    for (const block of specBlocks(readFileSync(join(root, path), 'utf8'), delta)) {
      if (!index.has(block.id)) index.set(block.id, [])
      index.get(block.id).push({ path, delta, ...block })
    }
  }
  for (const capability of listDirs(join(root, 'openspec', 'specs'))) read(`openspec/specs/${capability}/spec.md`, false)
  for (const change of listDirs(join(root, 'openspec', 'changes'))) {
    if (change === 'archive') continue
    for (const capability of listDirs(join(root, 'openspec', 'changes', change, 'specs'))) {
      read(`openspec/changes/${change}/specs/${capability}/spec.md`, true)
    }
  }
  return index
}

/**
 * The current hash of `ref` under `root`: a scenario or NFR ID, optionally with its role
 * (`CALC-003:happy`), `surface:<path>`, `contract:<path>#<operation>`, or a path. Throws an Error
 * saying why when there is none.
 */
export function hashRef(root, ref, policy, index = specIndex(root)) {
  const target = ref.replace(/^(surface|contract):/, '').replace(/#.*$/, '')
  const id = target.split(':')[0]
  if (SCENARIO_ID.test(id) || NFR_ID.test(id)) {
    const found = index.get(id) ?? []
    const deltas = found.filter((block) => block.delta)
    const chosen = deltas.length > 0 ? deltas : found
    if (chosen.length === 0) {
      throw new Error(`no scenario or NFR requirement is headed [${id}] in the living specs or an active change's delta.`)
    }
    if (chosen.length > 1) {
      const where = chosen.map((block) => `${block.path}:${block.line}`).join(', ')
      throw new Error(`[${id}] heads ${chosen.length} blocks (${where}), so its version is ambiguous.`)
    }
    const [block] = chosen
    if (block.error) throw new Error(`[${id}] at ${block.path}:${block.line} ${block.error}.`)
    return sha(block.text, policy.hashLength)
  }
  if (target.startsWith('/') || target.split('/').includes('..') || !existsSync(join(root, target)) || !statSync(join(root, target)).isFile()) {
    throw new Error(`\`${target}\` is neither a scenario or NFR ID nor a file under ${root}.`)
  }
  return sha(readFileSync(join(root, target), 'utf8').replace(/\r\n?/g, '\n'), policy.hashLength)
}

/* --------------------------------------------------------------------------------- the CLI ------ */

function citeCommand(refs) {
  const root = process.env.TEST_TRACE_ROOT ? resolve(process.env.TEST_TRACE_ROOT) : REPO_ROOT
  if (refs.length === 0) {
    console.error('test-trace: name what to hash: an ID, `surface:<path>` or `contract:<path>#<operation>`.')
    process.exit(1)
  }
  let policy
  try {
    policy = readTracePolicy(root)
  } catch (error) {
    console.error(`test-trace: ${error.message}`)
    process.exit(1)
  }
  const index = specIndex(root)
  let failed = 0
  for (const ref of refs) {
    try {
      console.log(`${ref}@${hashRef(root, ref, policy, index)}`)
    } catch (error) {
      failed++
      console.error(`test-trace: ${ref}: ${error.message}`)
    }
  }
  process.exit(failed === 0 ? 0 : 1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

const POLICY = `${JSON.stringify(
  {
    [HASH_LENGTH_KEY]: 12,
    [LAYERS_KEY]: { unit: 1, functional: 1, integration: 2, contract: 2, e2e: 3, fitness: null },
    [TASK_PATTERN_KEY]: 'asdlc-openspec-[a-z0-9]+(?:\\.[0-9]+)*',
  },
  null,
  2,
)}\n`

const LIVING = `# greeting Specification

## Purpose
How the greeting capability greets a reader.

## Requirements

### Requirement: Greeting is polite
The system SHALL greet every reader politely.

#### Scenario: [GRT-001] A reader arrives

- **WHEN** a reader arrives
- **THEN** the system greets them politely

#### Scenario: [GRT-002] A reader returns
- **WHEN** a reader returns
- **THEN** the system greets them again

### Requirement: [NFR-GRT-001] Greeting is prompt
The system SHALL greet a reader within one second.

#### Scenario: [GRT-003] A greeting is timed
- **WHEN** a reader arrives
- **THEN** the greeting shows within one second
`

const DELTA = `## ADDED Requirements

### Requirement: Farewell is polite
The system SHALL bid every departing reader farewell.

#### Scenario: [GRT-004] A reader leaves

- **WHEN** a reader leaves
- **THEN** the system bids them farewell


## REMOVED Requirements

### Requirement: [NFR-GRT-001] Greeting is prompt
**Reason**: nobody times it.
`

const PROPOSAL = `## Why

Readers who leave are never thanked, and every reviewer of the greeting has asked for a farewell.

## What Changes

- Add a farewell to the greeting capability.
`

const TREE = {
  'tools/policy.json': POLICY,
  'openspec/config.yaml': 'schema: spec-driven\n',
  'openspec/specs/greeting/spec.md': LIVING,
  'openspec/changes/add-farewell/proposal.md': PROPOSAL,
  'openspec/changes/add-farewell/specs/greeting/spec.md': DELTA,
  'apps/greeter/binding-surface.md': '# Binding Surface\n\nNothing yet.\n',
}

/** The normalised texts the definition above says each hash reads, written out by hand. */
const EXPECTED = {
  'GRT-001':
    'The system SHALL greet every reader politely.\n' +
    '#### Scenario: [GRT-001] A reader arrives\n- **WHEN** a reader arrives\n- **THEN** the system greets them politely',
  'NFR-GRT-001':
    '### Requirement: [NFR-GRT-001] Greeting is prompt\nThe system SHALL greet a reader within one second.\n' +
    '#### Scenario: [GRT-003] A greeting is timed\n- **WHEN** a reader arrives\n- **THEN** the greeting shows within one second',
  'GRT-004':
    'The system SHALL bid every departing reader farewell.\n' +
    '#### Scenario: [GRT-004] A reader leaves\n- **WHEN** a reader leaves\n- **THEN** the system bids them farewell',
}

const SOURCE = `import { test } from 'node:test'
// trace-defaults: layer=functional level=1

// trace: GRT-001:happy@aaaaaaaaaaaa
test('[GRT-001] A reader arrives', () => {})

// trace: GRT-001:negative@aaaaaaaaaaaa layer=integration
test('[GRT-001] A reader who is not arriving is not greeted', () => {})

// trace: GRT-002:happy@bbbbbbbbbbbb no-negative:GRT-002 "a return has no near miss"
// trace: level=2 "needs a real browser"
test(
  '[GRT-002] A reader returns',
  () => {},
)

// trace: asdlc-openspec-abc.1 surface:apps/greeter/binding-surface.md@cccccccccccc
test.skip('[asdlc-openspec-abc.1] The greeting module imports nothing', () => {})

// trace: NFR-GRT-001@dddddddddddd layer=fitness level=1
test('[NFR-GRT-001] A greeting is timed', () => {})

// trace: GRT-003:happy@eeeeeeeeeeee contract:apps/greeter/contracts/api.json#getGreeting@ffffffffffff layer=contract
it('[GRT-003] The greeting endpoint answers', () => {})
`

/** What the reader must make of SOURCE, test by test, written out by hand. */
const READ = [
  {
    line: 5, name: '[GRT-001] A reader arrives', modifier: null, ids: ['GRT-001'], layer: 'functional', level: 1, reason: null, noNegative: [],
    refs: [{ kind: 'scenario', id: 'GRT-001', role: 'happy', hash: 'aaaaaaaaaaaa' }],
  },
  {
    line: 8, name: '[GRT-001] A reader who is not arriving is not greeted', modifier: null, ids: ['GRT-001'], layer: 'integration', level: 1, reason: null, noNegative: [],
    refs: [{ kind: 'scenario', id: 'GRT-001', role: 'negative', hash: 'aaaaaaaaaaaa' }],
  },
  {
    line: 12, name: '[GRT-002] A reader returns', modifier: null, ids: ['GRT-002'], layer: 'functional', level: 2, reason: 'needs a real browser',
    noNegative: [{ id: 'GRT-002', reason: 'a return has no near miss' }],
    refs: [{ kind: 'scenario', id: 'GRT-002', role: 'happy', hash: 'bbbbbbbbbbbb' }],
  },
  {
    line: 18, name: '[asdlc-openspec-abc.1] The greeting module imports nothing', modifier: 'skip', ids: ['asdlc-openspec-abc.1'], layer: 'functional', level: 1, reason: null, noNegative: [],
    refs: [{ kind: 'task', id: 'asdlc-openspec-abc.1' }, { kind: 'surface', path: 'apps/greeter/binding-surface.md', hash: 'cccccccccccc' }],
  },
  {
    line: 21, name: '[NFR-GRT-001] A greeting is timed', modifier: null, ids: ['NFR-GRT-001'], layer: 'fitness', level: 1, reason: null, noNegative: [],
    refs: [{ kind: 'nfr', id: 'NFR-GRT-001', hash: 'dddddddddddd' }],
  },
  {
    line: 24, name: '[GRT-003] The greeting endpoint answers', modifier: null, ids: ['GRT-003'], layer: 'contract', level: 1, reason: null, noNegative: [],
    refs: [
      { kind: 'scenario', id: 'GRT-003', role: 'happy', hash: 'eeeeeeeeeeee' },
      { kind: 'contract', path: 'apps/greeter/contracts/api.json', operation: 'getGreeting', hash: 'ffffffffffff' },
    ],
  },
]

function selftest() {
  const results = []
  const record = (name, ok, detail) => results.push({ name, ok, detail })

  // The live policy: every test here reads its hash length and layers from it.
  try {
    const live = readTracePolicy(REPO_ROOT)
    record('the live policy reads', true, `hash length ${live.hashLength}, layers ${Object.keys(live.layers).sort(byCodePoint).join(', ')}`)
  } catch (error) {
    record('the live policy reads', false, error.message)
  }

  // The reader: the control, then one doctored source per refusal, each asserting its reason.
  const fixturePolicy = tracePolicy(JSON.parse(POLICY))
  const control = readTests(SOURCE, fixturePolicy, 'f.test.js')
  const same = control.problems.length === 0 && isDeepStrictEqual(control.tests, READ)
  record(
    'control: every token kind reads, with its layer, level, reason and references',
    same,
    same ? `${control.tests.length} tests read` : `read ${JSON.stringify({ tests: control.tests, problems: control.problems })}`,
  )
  if (!same) return finish(results, 'the undoctored source does not read as written out')

  for (const { name, edit, expect } of readerCases()) {
    const { problems } = readTests(edit(SOURCE), fixturePolicy, 'f.test.js')
    const ok = problems.some((p) => expect.test(p))
    record(name, ok, ok ? 'refused for that reason' : problems.length === 0 ? 'PASSED, but should have failed' : `refused, but not for that reason: ${problems.join(' | ')}`)
  }

  // The hash: a fixture tree, each case doctoring one thing.
  const base = mkdtempSync(join(tmpdir(), 'test-trace-'))
  try {
    for (const { name, files = {}, run } of hashCases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60))
      writeTree(dir, { ...TREE, ...files })
      let ok
      let detail
      try {
        ;[ok, detail] = run(dir, readTracePolicy(dir))
      } catch (error) {
        ok = false
        detail = `threw: ${error.message}`
      }
      record(name, ok, detail)
      if (name.startsWith('control') && !ok) return finish(results, 'the undoctored fixture tree does not hash as defined')
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  return finish(results)
}

function finish(results, fatal = null) {
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  if (fatal) console.error(`selftest: ${fatal}, so no case can be trusted.`)
  console.log(`test-trace selftest: ${results.length - failed.length}/${results.length} cases hold.`)
  process.exit(failed.length === 0 && fatal === null ? 0 : 1)
}

function readerCases() {
  const swap = (from, to) => (text) => {
    if (!text.includes(from)) throw new Error(`fixture lacks ${from}`)
    return text.replace(from, to)
  }
  return [
    { name: 'a test with no trace line', edit: swap("// trace: GRT-001:happy@aaaaaaaaaaaa\n", ''), expect: /:4: the test "\[GRT-001\] A reader arrives" has no `\/\/ trace:` line directly above it/ },
    { name: 'a trace line parted from its test by a blank line', edit: swap("aaaa\ntest('[GRT-001] A reader arrives'", "aaaa\n\ntest('[GRT-001] A reader arrives'"), expect: /:4: a `\/\/ trace:` line that no test call directly follows/ },
    { name: 'a name that is not a string literal', edit: swap("test('[GRT-001] A reader arrives'", 'test(`[GRT-001] ${"A reader"} arrives`'), expect: /:5: this test's name is not one string literal/ },
    { name: 'a name that does not open with its IDs', edit: swap("test('[GRT-001] A reader arrives'", "test('A reader arrives'"), expect: /"A reader arrives" does not open with the IDs it references/ },
    { name: 'a name that names one ID twice', edit: swap("test('[GRT-001] A reader arrives'", "test('[GRT-001, GRT-001] A reader arrives'"), expect: /"\[GRT-001, GRT-001\] A reader arrives" names GRT-001 twice/ },
    { name: 'a name whose IDs differ from its trace line', edit: swap("test('[GRT-001] A reader arrives'", "test('[GRT-002] A reader arrives'"), expect: /the IDs of "\[GRT-002\] A reader arrives" and of its `\/\/ trace:` line differ; the name has GRT-002 and the line does not; the line has GRT-001/ },
    { name: 'two tests of one name', edit: swap('A reader who is not arriving is not greeted', 'A reader arrives'), expect: /the name "\[GRT-001\] A reader arrives" is already the name of the test at line 5/ },
    { name: 'a token the grammar does not have', edit: swap('GRT-001:happy@aaaaaaaaaaaa\n', 'GRT-001:happy@aaaaaaaaaaaa proves-it\n'), expect: /`proves-it` is not a token of a `\/\/ trace:` line/ },
    { name: 'a scenario token with a second colon', edit: swap('GRT-001:happy@aaaaaaaaaaaa\n', 'GRT-001:happy:twice@aaaaaaaaaaaa\n'), expect: /`GRT-001:happy:twice@aaaaaaaaaaaa` is not a token of a `\/\/ trace:` line/ },
    { name: 'a hash of the wrong length', edit: swap('GRT-001:happy@aaaaaaaaaaaa\n', 'GRT-001:happy@aaaaaaa\n'), expect: /`GRT-001:happy@aaaaaaa` does not end in `@` and a hash of 12 lowercase hex characters/ },
    { name: 'a hash in capitals', edit: swap('GRT-001:happy@aaaaaaaaaaaa\n', 'GRT-001:happy@AAAAAAAAAAAA\n'), expect: /`GRT-001:happy@AAAAAAAAAAAA` does not end in `@` and a hash of 12 lowercase hex characters/ },
    { name: 'a scenario without its role', edit: swap('GRT-001:happy@aaaaaaaaaaaa\n', 'GRT-001@aaaaaaaaaaaa\n'), expect: /`GRT-001@aaaaaaaaaaaa` names a scenario without its role/ },
    { name: 'a layer the policy does not list', edit: swap('layer=integration', 'layer=system'), expect: /`layer=system` names no layer; the layers are contract, e2e, fitness, functional, integration, unit/ },
    { name: 'no layer anywhere', edit: swap('// trace-defaults: layer=functional level=1\n', '// trace-defaults: level=1\n'), expect: /"\[GRT-001\] A reader arrives" declares no layer/ },
    {
      name: 'a fitness test with no level, from its line or the file',
      edit: (text) => swap('layer=fitness level=1', 'layer=fitness')(swap('layer=functional level=1\n', 'layer=functional\n')(text)),
      expect: /"\[NFR-GRT-001\] A greeting is timed" is at layer fitness, which has no default level/,
    },
    { name: 'a level above its default with no reason', edit: swap('level=2 "needs a real browser"', 'level=2'), expect: /"\[GRT-002\] A reader returns" is at level 2, above functional's default of 1, with no reason/ },
    { name: 'a reason for a level not above its default', edit: swap('layer=integration\n', 'layer=integration level=2 "habit"\n'), expect: /gives a reason for level 2, which is not above integration's default of 2/ },
    { name: 'a level outside 1 to 3', edit: swap('layer=fitness level=1', 'layer=fitness level=4'), expect: /`level=4` is not an orchestration level/ },
    { name: 'a no-negative with no reason', edit: swap('no-negative:GRT-002 "a return has no near miss"', 'no-negative:GRT-002'), expect: /`no-negative:GRT-002` gives no reason/ },
    { name: 'a no-negative that names no scenario', edit: swap('no-negative:GRT-002 "a return', 'no-negative:NFR-GRT-001 "a return'), expect: /`no-negative:NFR-GRT-001` does not name a scenario ID/ },
    { name: "a no-negative on a test that is not that scenario's happy path", edit: swap('layer=integration\n', 'layer=integration no-negative:GRT-001 "none"\n'), expect: /`no-negative:GRT-001` is on a test that is not GRT-001's happy-path test/ },
    { name: 'a task-only test that cites no Binding Surface', edit: swap(' surface:apps/greeter/binding-surface.md@cccccccccccc', ''), expect: /references tasks alone, so it also cites its app's Binding Surface/ },
    { name: 'a surface that is not a binding-surface.md', edit: swap('surface:apps/greeter/binding-surface.md', 'surface:apps/greeter/README.md'), expect: /`surface:apps\/greeter\/README\.md@cccccccccccc` does not name an app's Binding Surface/ },
    { name: 'a contract without its operation', edit: swap('api.json#getGreeting@', 'api.json@'), expect: /`contract:apps\/greeter\/contracts\/api\.json@ffffffffffff` is not `contract:apps\/<app>\/contracts\/<file>#<operationId>@<hash>`/ },
    { name: 'a contract path that climbs out of contracts/', edit: swap('contracts/api.json#', 'contracts/../../secret.json#'), expect: /`contract:apps\/greeter\/contracts\/\.\.\/\.\.\/secret\.json#getGreeting@ffffffffffff` is not `contract:/ },
    { name: 'one reference twice', edit: swap('GRT-001:negative@aaaaaaaaaaaa', 'GRT-001:negative@aaaaaaaaaaaa GRT-001:happy@aaaaaaaaaaaa'), expect: /`GRT-001` appears twice in the `\/\/ trace:` line/ },
    { name: 'a reason that follows nothing', edit: swap('layer=integration\n', 'layer=integration "why"\n'), expect: /the reason "why" follows neither `level=<n>` nor `no-negative:<ID>`/ },
    { name: 'a second trace-defaults line', edit: swap("// trace-defaults: layer=functional level=1\n", '// trace-defaults: layer=functional level=1\n// trace-defaults: layer=unit\n'), expect: /:3: a second `\/\/ trace-defaults:` line; the first is at line 2/ },
    {
      name: 'trace-defaults below a test',
      edit: (text) => `${swap('// trace-defaults: layer=functional level=1\n', '')(text)}// trace-defaults: layer=functional level=1\n`,
      expect: /:24: `\/\/ trace-defaults:` below a test/,
    },
    { name: 'a trace-defaults key the grammar does not have', edit: swap('layer=functional level=1\n', 'layer=functional level=1 role=happy\n'), expect: /`\/\/ trace-defaults:` holds `role=happy`/ },
  ]
}

function hashCases() {
  const hashOf = (dir, policy, ref) => hashRef(dir, ref, policy)
  const expected = (id, policy) => sha(EXPECTED[id], policy.hashLength)
  const unchanged = (edits, ref) => (dir, policy) => {
    const before = hashOf(dir, policy, ref)
    for (const [path, transform] of edits) writeFileSync(join(dir, path), transform(readFileSync(join(dir, path), 'utf8')))
    const after = hashOf(dir, policy, ref)
    return [before === after, before === after ? `${ref} held at ${before}` : `${ref} moved from ${before} to ${after}`]
  }
  const moved = (edits, ref) => (dir, policy) => {
    const [held, detail] = unchanged(edits, ref)(dir, policy)
    return [!held, held ? `${detail}, but should have moved` : detail]
  }
  const refused = (ref, expect) => (dir, policy) => {
    try {
      const hash = hashOf(dir, policy, ref)
      return [false, `PASSED with ${hash}, but should have been refused`]
    } catch (error) {
      return [expect.test(error.message), error.message]
    }
  }
  const living = 'openspec/specs/greeting/spec.md'
  const delta = 'openspec/changes/add-farewell/specs/greeting/spec.md'
  return [
    {
      name: 'control: each hash is the sha256 of the text the definition names',
      run: (dir, policy) => {
        const got = ['GRT-001', 'NFR-GRT-001', 'GRT-004'].map((id) => [id, hashOf(dir, policy, id), expected(id, policy)])
        const bad = got.filter(([, a, b]) => a !== b)
        return [bad.length === 0, bad.length === 0 ? got.map(([id, h]) => `${id}@${h}`).join(' ') : `differ: ${JSON.stringify(bad)}`]
      },
    },
    {
      name: 'the cite command prints each ref with its hash, reading the tree TEST_TRACE_ROOT names',
      run: (dir, policy) => {
        const env = { ...process.env, TEST_TRACE_ROOT: dir }
        const cli = spawnSync(process.execPath, [SELF, 'cite', 'GRT-001:happy', 'surface:apps/greeter/binding-surface.md'], { encoding: 'utf8', env })
        const surface = sha('# Binding Surface\n\nNothing yet.\n', policy.hashLength)
        const want = `GRT-001:happy@${expected('GRT-001', policy)}\nsurface:apps/greeter/binding-surface.md@${surface}\n`
        return [cli.status === 0 && cli.stdout === want, `status ${cli.status}, printed ${JSON.stringify(cli.stdout)}${cli.stderr ? `, stderr ${cli.stderr}` : ''}`]
      },
    },
    {
      name: 'a role on the ID does not change its hash',
      run: (dir, policy) => {
        const a = hashOf(dir, policy, 'GRT-001:happy')
        const b = hashOf(dir, policy, 'GRT-001')
        return [a === b, `${a} and ${b}`]
      },
    },
    {
      name: 'blank lines and trailing spaces do not move a hash',
      run: unchanged([[living, (t) => t.replace('- **WHEN** a reader arrives\n', '- **WHEN** a reader arrives   \n\n\n')]], 'GRT-001'),
    },
    { name: "an edit to the requirement's statement moves its scenario's hash", run: moved([[living, (t) => t.replace('politely.', 'politely, always.')]], 'GRT-002') },
    { name: "a new name for the requirement does not move its scenario's hash", run: unchanged([[living, (t) => t.replace('### Requirement: Greeting is polite', '### Requirement: Greeting is courteous')]], 'GRT-001') },
    { name: "an edit to a sibling scenario does not move a scenario's hash", run: unchanged([[living, (t) => t.replace('greets them again', 'greets them once more')]], 'GRT-001') },
    { name: "an edit to a scenario's own block moves its hash", run: moved([[living, (t) => t.replace('greets them again', 'greets them once more')]], 'GRT-002') },
    { name: "an edit to an NFR requirement's scenario moves the NFR's hash", run: moved([[living, (t) => t.replace('within one second\n', 'within a second\n')]], 'NFR-GRT-001') },
    {
      name: 'a header inside fenced code stays inside the block',
      files: { [living]: LIVING.replace('- **THEN** the system greets them politely\n', '- **THEN** the system greets them politely\n\n```\n#### not a header\n```\n') },
      run: (dir, policy) => {
        const want = sha(`${EXPECTED['GRT-001']}\n\`\`\`\n#### not a header\n\`\`\``, policy.hashLength)
        const got = hashOf(dir, policy, 'GRT-001')
        return [got === want, `GRT-001@${got}, where the block with its fence reads @${want}`]
      },
    },
    {
      name: "an active change's delta copy wins over the living spec",
      files: {
        [delta]: DELTA.replace(
          '## REMOVED',
          '## MODIFIED Requirements\n\n### Requirement: Greeting is polite\nThe system SHALL greet every reader politely, by name.\n\n' +
            '#### Scenario: [GRT-001] A reader arrives\n- **WHEN** a named reader arrives\n- **THEN** the system greets them by name\n\n## REMOVED',
        ),
      },
      run: (dir, policy) => {
        const want = sha(
          'The system SHALL greet every reader politely, by name.\n#### Scenario: [GRT-001] A reader arrives\n' +
            '- **WHEN** a named reader arrives\n- **THEN** the system greets them by name',
          policy.hashLength,
        )
        const got = hashOf(dir, policy, 'GRT-001')
        return [got === want, `GRT-001@${got}; the delta's block reads @${want}, the living spec's @${expected('GRT-001', policy)}`]
      },
    },
    {
      name: "a delta's REMOVED section is not read",
      run: (dir, policy) => {
        const got = hashOf(dir, policy, 'NFR-GRT-001')
        return [got === expected('NFR-GRT-001', policy), `NFR-GRT-001@${got}, the living spec's`]
      },
    },
    {
      name: 'an ID two active deltas head is refused',
      files: { 'openspec/changes/add-wave/proposal.md': PROPOSAL, 'openspec/changes/add-wave/specs/greeting/spec.md': DELTA },
      run: refused('GRT-004', /^\[GRT-004\] heads 2 blocks \(.*add-farewell.*add-wave.*\), so its version is ambiguous\.$/),
    },
    { name: 'an ID no file heads is refused', run: refused('GRT-099', /^no scenario or NFR requirement is headed \[GRT-099\]/) },
    {
      name: 'a scenario with no requirement above it is refused',
      files: { [living]: LIVING.replace('### Requirement: Greeting is polite', '### Greeting is polite') },
      run: refused('GRT-001', /^\[GRT-001\] at openspec\/specs\/greeting\/spec\.md:\d+ has no `Requirement:` header above it\.$/),
    },
    { name: 'a path outside the tree is refused', run: refused('surface:../apps/greeter/binding-surface.md', /is neither a scenario or NFR ID nor a file under/) },
    {
      name: "a file's hash reads CR LF as LF",
      run: unchanged([['apps/greeter/binding-surface.md', (t) => t.replace(/\n/g, '\r\n')]], 'surface:apps/greeter/binding-surface.md'),
    },
    {
      name: 'a policy with no hash length is refused',
      run: (dir) => {
        writeFileSync(join(dir, POLICY_FILE), POLICY.replace(`"${HASH_LENGTH_KEY}": 12,`, ''))
        try {
          readTracePolicy(dir)
          return [false, 'PASSED, but should have been refused']
        } catch (error) {
          return [/has no whole number from 1 to 64 under `testTraceHashLength`/.test(error.message), error.message]
        }
      },
    },
    {
      name: 'hashes are the same once the pinned OpenSpec CLI archives a change that adds a scenario and renames a requirement',
      run: (dir, policy) => {
        const bin = findBin('openspec', REPO_ROOT)
        if (bin === null) return [false, 'the pinned OpenSpec CLI is not installed; run `npm ci`']
        // The fixture's REMOVED block names an NFR the archive would drop; keep the ADDED block and
        // rename the requirement GRT-001 and GRT-002 sit under.
        writeFileSync(
          join(dir, delta),
          DELTA.replace(
            /\n## REMOVED[\s\S]*$/,
            '\n## RENAMED Requirements\n\n- FROM: `### Requirement: Greeting is polite`\n- TO: `### Requirement: Greeting is courteous`\n',
          ),
        )
        const refs = ['GRT-001', 'GRT-002', 'GRT-004']
        const before = refs.map((ref) => hashOf(dir, policy, ref))
        const env = { ...process.env, OPENSPEC_TELEMETRY: '0', DO_NOT_TRACK: '1', NO_COLOR: '1' }
        const archive = spawnSync(bin, ['archive', 'add-farewell', '--yes'], { cwd: dir, encoding: 'utf8', env, shell: process.platform === 'win32' })
        if (archive.status !== 0) return [false, `the archive failed: ${archive.stderr || archive.stdout}`]
        const merged = readFileSync(join(dir, living), 'utf8')
        if (!merged.includes('### Requirement: Greeting is courteous') || !merged.includes('[GRT-004]') || existsSync(join(dir, delta))) {
          return [false, `the archive did not merge the delta as the case needs: ${JSON.stringify(merged)}`]
        }
        const after = refs.map((ref) => hashOf(dir, policy, ref))
        const raw = merged.includes('#### Scenario: [GRT-004] A reader leaves\n\n- **WHEN**') ? 'kept' : 'rewrote'
        const shown = refs.map((ref, n) => `${ref}@${before[n]}${before[n] === after[n] ? '' : `->${after[n]}`}`).join(' ')
        return [JSON.stringify(before) === JSON.stringify(after), `${shown}; the archive ${raw} the blank line under GRT-004's header`]
      },
    },
  ]
}

function writeTree(dir, files) {
  for (const [relative, body] of Object.entries(files)) {
    if (body === null) continue
    const path = join(dir, relative)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, body)
  }
}

const [command, ...rest] = process.argv.slice(2)
if (resolve(process.argv[1] ?? '') === SELF) {
  if (command === '--selftest') selftest()
  else if (command === 'cite') citeCommand(rest)
  else {
    console.error('usage: node scripts/test-trace.mjs cite <ref> [...] | --selftest')
    process.exit(1)
  }
}
