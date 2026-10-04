/**
 * Node-floor gate. It reads the floor, `engines.node` in `package.json`, and the `engines.node` of
 * every package `package-lock.json` locks, and prints the lowest version on the floor's major line
 * that every locked package accepts, beside the floor. It refuses:
 *
 *   - a floor below that version, which some locked package refuses though the floor calls it enough;
 *   - a floor's major line on which no version satisfies every locked package;
 *   - a range it cannot read, rather than skip or misread it. It reads `>=`, `<=`, `^` on a major
 *     above 0, and a bare version (`22`, `22.18` or `22.18.0`), each with an optional `v` and a space
 *     after the operator, joined by spaces (all must hold) and by `||` (one must). It refuses every
 *     other comparator, by its text: `~`, `<`, `>`, `*`, an `x`, a hyphen range, a pre-release, an
 *     empty range, and a caret on major 0, whose upper bound semver narrows to the minor or patch. It
 *     refuses too a locked package whose `engines` is not an object, or whose `engines.node` is not a
 *     string;
 *   - a floor that is not one `>=` version, since the floor is the oldest Node the repository
 *     supports; a `package.json` or `package-lock.json` that does not parse; and a lockfile with no
 *     `packages` object, over which it would read no range and pass.
 *
 * It holds the rule `README.md` § The Node floor, on every platform states, and no more: a floor at or
 * above that version passes even where a range leaves a gap above it, and nothing here holds the floor
 * to the `node` `mise.toml` pins (`docs/decisions.md` § D-34 names that loss). The lockfile's root
 * entry, which repeats the floor, is not read.
 *
 * THE FAILURE IT EXISTS TO PREVENT. The same reading lived in `README.md` as a one-line `node -e`
 * program of about a thousand characters, added when the floor rose to 22.22.2 (e17644d, PR #56,
 * asdlc-openspec-373), and no job ran it. PR #71 (f27dc79, merged 2026-09-29) locked
 * node_modules/tunnel, whose range is `>=0.6.11 <=0.7.0 || >=0.7.3`, and from then on every run of
 * the program threw `cannot read <=0.7.0` and printed no floor. Nothing noticed until a review on
 * 2026-10-01 (asdlc-openspec-xn4). On 2026-10-04 the session that raised the floor to 24.21.0
 * derived its limit with a script that is not tracked (`docs/decisions.md` § D-34, Figures). As a
 * pre-push job and a CI step, this refuses a lockfile change that brings a form it cannot read, or
 * that lifts that lowest version above the floor, on the push that makes it.
 *
 * INVOCATION.
 *
 *   npm run check:node-floor                        the gate
 *   npm run check:node-floor:selftest               its fixtures -- every form it reads, and every
 *                                                   refusal on a doctored copy
 *   NODE_FLOOR_ROOT=<dir> npm run check:node-floor  the same gate over a doctored copy
 *
 * NEEDS only committed files: `package.json` and `package-lock.json`. No tool, no network.
 * 0.20-0.45 s wall for the gate and 0.74-0.80 s for its 28 cases through `node --run`
 * (`/usr/bin/time -p`, two runs each, while sibling worktrees ran their gates) on a macOS 26.7.1
 * laptop (Apple M3 Max) with Node 24.21.0, 2026-10-03.
 */
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SELF = fileURLToPath(import.meta.url)
const REPO_ROOT = resolve(dirname(SELF), '..')
const ROOT = process.env.NODE_FLOOR_ROOT ?? REPO_ROOT
const RULE_HOME = '`README.md` § The Node floor, on every platform'

/** A version is [major, minor, patch]; TOP stands above every version, as the upper bound of `>=`. */
const TOP = [Infinity, 0, 0]
const ZERO = [0, 0, 0]
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
const show = (v) => v.join('.')
const COMPARATOR = /^(>=|<=|\^)?v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/
const FLOOR = /^>=\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?$/

/** The half-open interval [lo, hi) one comparator admits; throws, naming it, on a form it cannot read. */
function comparator(text) {
  const m = COMPARATOR.exec(text)
  if (m === null) throw new RangeError(`cannot read \`${text}\``)
  const [, op = '', ...parts] = m
  const given = parts.filter((p) => p !== undefined).length
  const v = parts.map((p) => Number(p ?? 0))
  // The first version past every one the given parts name: 22 -> 23.0.0, 22.18 -> 22.19.0, 22.18.0 -> 22.18.1.
  const past = v.map((n, i) => (i < given - 1 ? n : i === given - 1 ? n + 1 : 0))
  if (op === '>=') return [v, TOP]
  if (op === '<=') return [ZERO, past]
  if (op === '^') {
    if (v[0] === 0) throw new RangeError(`cannot read \`${text}\`: a caret on major 0 admits less than its major line, and this gate reads no narrower caret`)
    return [v, [v[0] + 1, 0, 0]]
  }
  return [v, past]
}

/** The intervals a range admits, one per `||` alternative, each the intersection of its comparators. */
export function intervals(range) {
  return range
    .replace(/(>=|<=|\^)\s+/g, '$1')
    .split('||')
    .map((alternative) =>
      alternative
        .trim()
        .split(/\s+/)
        .map(comparator)
        .reduce(([lo, hi], [l, h]) => [cmp(l, lo) > 0 ? l : lo, cmp(h, hi) < 0 ? h : hi]),
    )
}

const accepts = (ranges, v) => ranges.some(([lo, hi]) => cmp(lo, v) <= 0 && cmp(v, hi) < 0)

/**
 * The gate over the two files under `root`: every problem, one message each, and, when the ranges
 * read, the floor, the lowest version on its major line every locked package accepts, and how many
 * locked packages carry a range.
 */
export function runCheck(root) {
  const read = (name) => {
    try {
      return JSON.parse(readFileSync(join(root, name), 'utf8'))
    } catch (error) {
      throw new Error(`${name} cannot be read as JSON under ${root}: ${error.message}`)
    }
  }
  let manifest
  let lock
  try {
    manifest = read('package.json')
    lock = read('package-lock.json')
  } catch (error) {
    return { problems: [error.message] }
  }
  const floorText = manifest?.engines?.node
  const f = typeof floorText === 'string' ? FLOOR.exec(floorText) : null
  if (f === null) {
    return { problems: [`package.json engines.node is ${JSON.stringify(floorText)}, not one \`>=\` version: the floor is the oldest Node the repository supports (${RULE_HOME}).`] }
  }
  const floor = f.slice(1).map((p) => Number(p ?? 0))
  const major = floor[0]

  const { packages } = lock ?? {}
  if (packages === null || typeof packages !== 'object' || Array.isArray(packages)) {
    return { problems: [`package-lock.json has no \`packages\` object, so no locked package's range can be read; npm writes one from lockfile version 2.`] }
  }
  const problems = []
  const locked = []
  for (const [path, entry] of Object.entries(packages)) {
    if (path === '' || entry?.engines === undefined) continue
    const { engines } = entry
    if (engines === null || typeof engines !== 'object' || Array.isArray(engines) || (engines.node !== undefined && typeof engines.node !== 'string')) {
      problems.push(`${path}: cannot read its engines, ${JSON.stringify(engines)}: an engines.node that is not a string would be skipped, not read.`)
      continue
    }
    if (engines.node === undefined) continue
    try {
      locked.push({ path, range: engines.node, ranges: intervals(engines.node) })
    } catch (error) {
      problems.push(`${path}: engines.node \`${engines.node}\`: ${error.message}. A range this gate cannot read is refused, not skipped (${RULE_HOME}).`)
    }
  }
  if (problems.length > 0) return { problems }

  const candidates = [[major, 0, 0], ...locked.flatMap(({ ranges }) => ranges.map(([lo]) => lo))]
  const lowest = candidates
    .filter((v) => v[0] === major && locked.every(({ ranges }) => accepts(ranges, v)))
    .sort(cmp)[0]
  const result = { problems, floor: floorText, carriers: locked.length, lowest: lowest === undefined ? undefined : show(lowest) }
  if (lowest === undefined) {
    problems.push(`no ${major}.x version satisfies every locked package; package.json engines: ${floorText}. Move the floor to a major line every locked package accepts, or the dependency that refuses this one (${RULE_HOME}).`)
  } else if (cmp(floor, lowest) < 0) {
    const refusing = locked.filter(({ ranges }) => !accepts(ranges, floor)).map(({ path, range }) => `${path} (${range})`)
    problems.push(`package.json engines ${floorText} is below ${show(lowest)}, the lowest ${major}.x every locked package accepts; ${show(floor)} is refused by ${refusing.join(', ')}. Raise engines to ${show(lowest)} or above (${RULE_HOME}).`)
  }
  return result
}

function main() {
  const { problems, floor, carriers, lowest } = runCheck(ROOT)
  if (problems.length === 0) {
    console.log(`node-floor: lowest ${lowest.split('.')[0]}.x every locked package accepts: ${lowest}; package.json engines: ${floor}. The floor is not below it, over ${carriers} locked packages that carry an engines.node.`)
    process.exit(0)
  }
  console.error(`node-floor: ${problems.length} problem(s).\n`)
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

/** A fixture: a manifest with `floor` and a lockfile locking one package per range, as npm writes them. */
const fixture = (floor, ranges) => (dir) => {
  const engines = (node) => (node === undefined ? {} : { engines: { node } })
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ name: 'fixture', private: true, ...engines(floor) }, null, 2)}\n`)
  const packages = { '': { name: 'fixture', ...engines(floor) } }
  ranges.forEach((range, i) => {
    packages[`node_modules/p${i}`] = { version: '1.0.0', ...(typeof range === 'string' ? { engines: { node: range } } : range) }
  })
  writeFileSync(join(dir, 'package-lock.json'), `${JSON.stringify({ name: 'fixture', lockfileVersion: 3, requires: true, packages }, null, 2)}\n`)
}
const live = (dir) => {
  copyFileSync(join(REPO_ROOT, 'package.json'), join(dir, 'package.json'))
  copyFileSync(join(REPO_ROOT, 'package-lock.json'), join(dir, 'package-lock.json'))
}

/**
 * A form case: the floor sits at `lowest`, so it passes only when the gate reads exactly that. A
 * misreading of the form that gives a higher version is refused as a floor below it, and one that
 * gives a lower version reads another lowest.
 */
const reads = (name, lowest, ranges) => ({ name, doctor: fixture(`>=${lowest}`, ranges), expect: lowest })

/**
 * Each case builds its files, then expects either the lowest version it names, read with no problem,
 * or a problem matching its pattern.
 */
function cases() {
  return [
    { name: 'control: the live package.json and package-lock.json, undoctored', doctor: live, expect: 'pass' },
    reads('form `>=`, with and without a space after it: the higher bound wins', '20.5.0', ['>=20.5.0', '>= 18']),
    reads('form `>=` with a `v`', '12.22.7', ['>=v12.22.7']),
    reads('form `^`: bounded below the next major', '21.7.0', ['^20.5.0 || >=21.7.0']),
    reads('form `^`: from its version up', '20.5.0', ['^18.17.0 || ^20.5.0']),
    reads('a bare version: its minor line, every patch of it', '20.4.2', ['18 || 20.4 || >=22', '>=20.4.2']),
    reads('a bare major: its whole line', '20.9.1', ['18 || 20', '>=20.9.1']),
    reads('`||`: the lowest alternative on the line', '20.2.0', ['18 || >=20.6 || ^20.2.0']),
    reads('a space-separated AND: every comparator holds', '14.17.0', ['>=16 || 14 >=14.17']),
    reads('form `<=`: its version is admitted', '20.3.0', ['>=18 <=20.3.0 || >=20.9.0', '>=20.3.0']),
    reads('form `<=`: nothing past its version is', '20.9.0', ['>=18 <=20.3.0 || >=20.9.0', '>=20.3.1']),
    reads('form `<=` on a minor: every patch of it', '20.3.5', ['<= 20.3', '>=20.3.5']),
    reads("node_modules/tunnel's range, which the README's one-line program threw on", '0.6.11', ['>=0.6.11 <=0.7.0 || >=0.7.3']),
    reads('a package with no engines, or none for node, constrains nothing', '20.1.0', ['>=20.1.0', {}, { engines: { npm: '>=9' } }]),
    { name: 'a form it refuses: `~1.2`', doctor: fixture('>=20.0.0', ['>=18', '~1.2']), expect: /^node_modules\/p1: engines\.node `~1\.2`: cannot read `~1\.2`\./ },
    { name: 'a form it refuses: `<`', doctor: fixture('>=20.0.0', ['>=18 <21']), expect: /^node_modules\/p0: engines\.node `>=18 <21`: cannot read `<21`\./ },
    { name: 'a form it refuses: an empty alternative', doctor: fixture('>=20.0.0', ['>=18 ||']), expect: /^node_modules\/p0: engines\.node `>=18 \|\|`: cannot read ``\./ },
    { name: 'a form it refuses: a caret on major 0', doctor: fixture('>=20.0.0', ['^0.7.0 || >=18']), expect: /^node_modules\/p0: engines\.node `\^0\.7\.0 \|\| >=18`: cannot read `\^0\.7\.0`: a caret on major 0/ },
    { name: 'engines that is not an object', doctor: fixture('>=20.0.0', [{ engines: ['node >= 0.4'] }]), expect: /^node_modules\/p0: cannot read its engines, \["node >= 0\.4"\]/ },
    { name: 'engines.node that is not a string', doctor: fixture('>=20.0.0', [{ engines: { node: 18 } }]), expect: /^node_modules\/p0: cannot read its engines, \{"node":18\}/ },
    { name: 'a floor below the lowest version every locked package accepts', doctor: fixture('>=20.0.0', ['>=18', '>=20.5.0']), expect: /^package\.json engines >=20\.0\.0 is below 20\.5\.0, the lowest 20\.x every locked package accepts; 20\.0\.0 is refused by node_modules\/p1 \(>=20\.5\.0\)\./ },
    { name: "no version on the floor's major line satisfies every locked package", doctor: fixture('>=20.0.0', ['^18.17.0 || >=22']), expect: /^no 20\.x version satisfies every locked package; package\.json engines: >=20\.0\.0\./ },
    { name: 'a floor that is not one `>=` version', doctor: fixture('^24.21.0', ['>=18']), expect: /^package\.json engines\.node is "\^24\.21\.0", not one `>=` version/ },
    { name: 'no floor at all', doctor: fixture(undefined, ['>=18']), expect: /^package\.json engines\.node is undefined, not one `>=` version/ },
    {
      name: 'a lockfile that does not parse',
      doctor: (dir) => {
        live(dir)
        writeFileSync(join(dir, 'package-lock.json'), '{\n')
      },
      expect: /^package-lock\.json cannot be read as JSON under /,
    },
    {
      name: 'a lockfile with no packages object, as npm wrote before lockfile version 2',
      doctor: (dir) => {
        fixture('>=20.0.0', [])(dir)
        writeFileSync(join(dir, 'package-lock.json'), `${JSON.stringify({ name: 'fixture', lockfileVersion: 1, dependencies: {} })}\n`)
      },
      expect: /^package-lock\.json has no `packages` object/,
    },
  ]
}

/** The command line over a fixture through NODE_FLOOR_ROOT: its exit status and what it says. */
function cliCases() {
  const run = (dir) => spawnSync(process.execPath, [SELF], { env: { ...process.env, NODE_FLOOR_ROOT: dir }, encoding: 'utf8' })
  return [
    {
      name: 'command line: a fixture it accepts exits 0 and prints the lowest version beside the floor',
      doctor: fixture('>=20.6.0', ['18 || >=20.6', '>=20.1.0']),
      check: (dir) => {
        const r = run(dir)
        const line = 'node-floor: lowest 20.x every locked package accepts: 20.6.0; package.json engines: >=20.6.0. The floor is not below it, over 2 locked packages that carry an engines.node.'
        return r.status === 0 && r.stdout.trim() === line ? null : `exited ${r.status}: ${(r.stdout + r.stderr).trim()}`
      },
    },
    {
      name: 'command line: a fixture it refuses exits 1 and says why',
      doctor: fixture('>=20.0.0', ['~1.2']),
      check: (dir) => {
        const r = run(dir)
        return r.status === 1 && /node_modules\/p0: engines\.node `~1\.2`: cannot read `~1\.2`/.test(r.stderr) ? null : `exited ${r.status}: ${(r.stdout + r.stderr).trim()}`
      },
    },
  ]
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-node-floor-'))
  const results = []
  try {
    for (const { name, doctor, expect } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      mkdirSync(dir, { recursive: true })
      doctor(dir)
      let outcome
      try {
        outcome = runCheck(dir)
      } catch (error) {
        // A gate that throws has refused nothing by its reason, so the case fails rather than the run.
        outcome = { problems: [`threw ${error.name}: ${error.message}`] }
      }
      const { problems, lowest } = outcome
      let ok
      let detail
      if (expect instanceof RegExp) {
        ok = problems.some((problem) => expect.test(problem))
        detail = ok
          ? `fails for that reason (${problems.length} problem(s))`
          : problems.length === 0
            ? `PASSED with ${lowest}, but should have failed`
            : `failed, but not for that reason: ${problems.join(' | ')}`
      } else if (problems.length > 0) {
        ok = false
        detail = `unexpected problem(s): ${problems.join(' | ')}`
      } else {
        ok = expect === 'pass' || lowest === expect
        detail = ok ? `reads ${lowest}` : `read ${lowest}, not ${expect}`
      }
      results.push({ name, ok, detail })
      if (name.startsWith('control') && !ok) {
        console.error(`selftest: the undoctored copy does not pass, so no case can be trusted: ${detail}`)
        process.exit(1)
      }
    }
    for (const { name, doctor, check } of cliCases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      mkdirSync(dir, { recursive: true })
      doctor(dir)
      const problem = check(dir)
      results.push({ name, ok: problem === null, detail: problem ?? 'holds' })
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  console.log(`node-floor selftest: ${results.length - failed.length}/${results.length} cases hold (the control, ${cases().length - 1} fixtures and ${cliCases().length} runs of the command line).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

if (process.argv.includes('--selftest')) selftest()
else main()
