/**
 * The co-change gate's selftest: every refusal of `tools/coupling/coupling.ts`, asserting the reason
 * each reports. The check's are on doctored copies of a fixture repository it builds under the
 * temporary directory, beside an undoctored control that must pass. Each of `check`, `emit` and
 * `update` is given a walk that disagrees with the ratified fixture, and must refuse and write
 * nothing; the walk's refusals of git output it cannot read are fed that output. It also holds the
 * walk to its ratified fixture, the rounding of the index, `partnersOf` over the ratified map, and
 * the command line run end to end through `COUPLING_ROOT`, under a hook's exported `GIT_DIR` and a
 * hostile git configuration.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what the gate would let through if a
 * rule of it broke and this file were absent. The live map passes the check whatever the rules
 * are, since the check re-derives what the emitter wrote: a refusal that stopped firing would leave
 * the gate green over a hand-edited map or a baseline off the trunk, and nothing live would show
 * it. Each case breaks one thing and asserts the refusal's own words, so a case cannot pass
 * because another rule refused.
 *
 * INVOCATION. `mise run coupling:selftest`. Nothing to point at a copy: it builds its own.
 *
 * NEEDS git, and the live records under `tools/policy/`, which the fixture copies with the `coupling*`
 * keys set to the ratified fixture's values, so a change to another key the gate reads is felt here; one
 * case holds that the live values have the shapes the check reads. No network; it writes only under
 * the temporary directory.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generatedFileRedirect } from '../../scripts/hooks/_shared.mjs'
import { SCRATCH_GIT_ENV, gitIn } from '../lib/git-env.ts'
import { ROOT } from '../lib/paths.ts'
import { copyPolicy, editPolicy } from '../lib/policy.ts'
import { FIXTURE_OPTIONS, KEYS, MAP, RATIFIED, check, emit, jaccardPermille, parseDiffs, partnersOf, ratifiedStream, ratify, readPolicy, update, walk } from './coupling.ts'

const COUPLING = fileURLToPath(new URL('./coupling.ts', import.meta.url))
/** The record that holds the `coupling*` keys, which one case breaks. */
const COUPLING_RECORD = 'tools/policy/tool-settings.json'
const IDENTITY = ['-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', '-c', 'commit.gpgsign=false']

/** git in a fixture repository, with no configuration of this machine's. */
const scratchGit = (dir: string) => gitIn(dir, SCRATCH_GIT_ENV)

function fastImport(dir: string, stream: string) {
  const run = spawnSync('git', ['fast-import', '--quiet'], { cwd: dir, env: SCRATCH_GIT_ENV, input: stream, encoding: 'utf8' })
  if (run.status !== 0) throw new Error(`git fast-import refused the fixture: ${run.stderr.trim()}`)
}

/** The live records copied under `dir`, with each `coupling*` key set to the ratified fixture's value. */
function writeFixturePolicy(dir: string) {
  copyPolicy(ROOT, dir)
  editPolicy(dir, (policy) => {
    for (const [name, { key }] of Object.entries(KEYS)) policy[key] = (FIXTURE_OPTIONS as any)[name]
  })
}

function edit(dir: string, path: string, change: (text: string) => string) {
  const before = readFileSync(join(dir, path), 'utf8')
  const after = change(before)
  if (after === before) throw new Error(`the doctoring of ${path} changed nothing`)
  writeFileSync(join(dir, path), after)
}

const recorded = (dir: string) => JSON.parse(readFileSync(join(dir, MAP), 'utf8'))

/**
 * The control: the ratified history, `origin/main` at its baseline while the map is written, then
 * one more pull request merged and `origin/main` moved to it, so two land after the baseline.
 */
function buildControl(dir: string) {
  mkdirSync(join(dir, 'tools'), { recursive: true })
  const git = scratchGit(dir)
  git(['init', '-q', '-b', 'main'])
  fastImport(dir, ratifiedStream())
  git(['update-ref', 'refs/remotes/origin/main', 'refs/heads/through'])
  writeFixturePolicy(dir)
  update(dir, { ratified: true })
  const tip = git(['rev-parse', 'refs/heads/main']).trim()
  const body = 'const c = 9\n'
  fastImport(
    dir,
    `commit refs/heads/main\ncommitter Person <1+person@users.noreply.github.com> 1700002300 +0000\ndata 3\nU13\nfrom ${tip}\n` +
      `M 100644 inline src/c.js\ndata ${Buffer.byteLength(body)}\n${body}\n`,
  )
  git(['update-ref', 'refs/remotes/origin/main', 'refs/heads/main'])
}

type Case = {
  name: string
  doctor: (dir: string) => void
  /** A refusal's reason that must be among the failures, or `pass` for none at all. */
  expect: RegExp | 'pass'
  /** Anything else the case asserts of the tree after it ran, returning why it does not hold. */
  also?: (dir: string, failures: string[], notes: string[]) => string | null
}

/** A commit made here on top of `parents`, with the baseline's tree: a side commit or a merge. */
function commitOn(dir: string, subject: string, parents: string[]): string {
  const git = scratchGit(dir)
  const tree = git(['rev-parse', `${parents[0]}^{tree}`]).trim()
  return git([...IDENTITY, 'commit-tree', tree, ...parents.flatMap((parent) => ['-p', parent]), '-m', subject]).trim()
}

const setThrough = (dir: string, sha: string) => edit(dir, MAP, (text) => text.replace(/"throughCommit": "[0-9a-f]+"/, `"throughCommit": "${sha}"`))
const setPolicy = editPolicy

function cases(): Case[] {
  return [
    {
      name: 'control: the undoctored fixture passes, its map the ratified one, two pull requests after its baseline',
      doctor: () => {},
      expect: 'pass',
      also: (dir, _failures, notes) => {
        const map = recorded(dir)
        const got = JSON.stringify({ units: map.units, counted: map.counted, excluded: map.excluded, files: map.files, edges: map.edges, clusters: map.clusters })
        if (got !== JSON.stringify(RATIFIED)) return `the control's map is ${got}, not the ratified one`
        if (!notes.some((note) => /^2 merged pull requests landed on origin\/main after the map's baseline [0-9a-f]{12};/.test(note))) {
          return `no note says two pull requests landed after the baseline: ${JSON.stringify(notes)}`
        }
        return null
      },
    },
    {
      name: 'map: none',
      doctor: (dir) => rmSync(join(dir, MAP)),
      expect: /^map: artifacts\/coupling\/cochange\.json does not exist; run `mise run coupling:update`/,
    },
    {
      name: 'map: a count edited by hand',
      doctor: (dir) => edit(dir, MAP, (text) => text.replace('"b":"src/c.js","together":6', '"b":"src/c.js","together":7')),
      expect: /^map: artifacts\/coupling\/cochange\.json is stale, line \d+: committed .*together\\":7.*, re-derived .*together\\":6/,
    },
    {
      // At 4, the fixture's two edges changed together three times go.
      name: 'map: a threshold changed in the policy and the map not written again',
      doctor: (dir) => setPolicy(dir, (policy) => (policy.couplingMinTogether = 4)),
      expect: /^map: artifacts\/coupling\/cochange\.json is stale, line \d+/,
    },
    {
      name: 'map: a file that is not JSON',
      doctor: (dir) => writeFileSync(join(dir, MAP), '{ "throughCommit": \n'),
      expect: /^map: artifacts\/coupling\/cochange\.json is not JSON/,
    },
    {
      name: 'map: a file in artifacts/coupling/ the emitter does not write',
      doctor: (dir) => writeFileSync(join(dir, 'artifacts/coupling/notes.txt'), 'a note\n'),
      expect: /^map: artifacts\/coupling\/notes\.txt is a file neither `mise run coupling` nor `mise run coupling:update` writes/,
    },
    {
      name: 'baseline: no throughCommit',
      doctor: (dir) => edit(dir, MAP, (text) => text.replace(/\n  "throughCommit": "[0-9a-f]+",/, '')),
      expect: /^baseline: artifacts\/coupling\/cochange\.json has no `throughCommit` that is a full commit id/,
    },
    {
      name: 'baseline: a throughCommit that is not a full commit id',
      doctor: (dir) => setThrough(dir, recorded(dir).throughCommit.slice(0, 12)),
      expect: /^baseline: artifacts\/coupling\/cochange\.json has no `throughCommit` that is a full commit id/,
    },
    {
      name: 'baseline: a throughCommit this clone does not have',
      doctor: (dir) => setThrough(dir, '0123456789abcdef0123456789abcdef01234567'),
      expect: /^baseline: `throughCommit` 0123456789ab is not a commit in this clone/,
    },
    {
      name: "baseline: a throughCommit off origin/main's first-parent chain, as a branch's own commit is",
      doctor: (dir) => setThrough(dir, commitOn(dir, 'a commit no pull request merged', [recorded(dir).throughCommit])),
      expect: /^baseline: `throughCommit` [0-9a-f]{12} is not on origin\/main's first-parent chain/,
    },
    {
      name: 'history: no origin/main to hold the baseline to',
      doctor: (dir) => scratchGit(dir)(['update-ref', '-d', 'refs/remotes/origin/main']),
      expect: /^history: origin\/main is not a ref here/,
    },
    {
      name: 'history: a merge commit on the first-parent chain',
      doctor: (dir) => {
        const merge = commitOn(dir, 'a merge commit', [recorded(dir).throughCommit, 'refs/heads/main~5'])
        setThrough(dir, merge)
        scratchGit(dir)(['update-ref', 'refs/remotes/origin/main', merge])
      },
      expect: /^history: [0-9a-f]{12} on the first-parent chain is a merge commit/,
    },
    {
      name: 'a merge commit on origin/main after the baseline is counted in the note, never refused',
      doctor: (dir) => {
        const git = scratchGit(dir)
        const merge = commitOn(dir, 'a merge commit after the baseline', [git(['rev-parse', 'refs/remotes/origin/main']).trim(), recorded(dir).throughCommit])
        git(['update-ref', 'refs/remotes/origin/main', merge])
      },
      expect: 'pass',
      also: (_dir, _failures, notes) =>
        notes.some((note) => /^2 merged pull requests landed on origin\/main after the map's baseline/.test(note)) ? null : `the note is not the two pull requests: ${JSON.stringify(notes)}`,
    },
    {
      name: 'policy: a policy file that is not JSON',
      doctor: (dir) => writeFileSync(join(dir, COUPLING_RECORD), '{ "couplingMinTogether": \n'),
      expect: /^policy: tools\/policy\/ cannot be read: tools\/policy\/tool-settings\.json does not parse as JSON/,
    },
    {
      name: 'policy: a coupling key missing',
      doctor: (dir) => setPolicy(dir, (policy) => delete policy.couplingMinTogether),
      expect: /^policy: tools\/policy\/tool-settings\.json `couplingMinTogether` is missing/,
    },
    {
      name: "policy: a coupling key's Means missing",
      doctor: (dir) => setPolicy(dir, (policy) => delete policy.couplingHubMinPercentMeans),
      expect: /^policy: tools\/policy\/tool-settings\.json `couplingHubMinPercentMeans` is missing/,
    },
    {
      name: 'policy: a committer pattern that does not compile',
      doctor: (dir) => setPolicy(dir, (policy) => (policy.couplingMergeCommitterPattern = '^[0-9+@')),
      expect: /^policy: tools\/policy\/tool-settings\.json `couplingMergeCommitterPattern` is not a regular expression that compiles/,
    },
    {
      name: 'policy: a share over 100 percent',
      doctor: (dir) => setPolicy(dir, (policy) => (policy.couplingHubMinPercent = 101)),
      expect: /^policy: tools\/policy\/tool-settings\.json `couplingHubMinPercent` is not a whole number from 1 to 100/,
    },
    {
      name: 'policy: an ignore list that is not a list of globs',
      doctor: (dir) => setPolicy(dir, (policy) => (policy.couplingIgnoredPaths = 'artifacts/coupling/**')),
      expect: /^policy: tools\/policy\/tool-settings\.json `couplingIgnoredPaths` is not a list of globs/,
    },
    {
      name: 'policy: a merge method other than rebase, under which a squash merge reads as a direct push',
      doctor: (dir) => setPolicy(dir, (policy) => (policy.prReviewMergeMethod = 'squash')),
      expect: /^policy: tools\/policy\/pr-review\.json `prReviewMergeMethod` is "squash"/,
    },
  ]
}

type Result = { name: string; ok: boolean; detail: string }

function run(base: string, control: string, results: Result[]): boolean {
  for (const { name, doctor, expect, also } of cases()) {
    const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-').slice(0, 60))
    cpSync(control, dir, { recursive: true })
    let ok: boolean
    let detail: string
    try {
      doctor(dir)
      const { failures, notes } = check(dir, { ratified: true })
      if (expect === 'pass') {
        ok = failures.length === 0
        detail = ok ? 'passes' : `unexpected refusal(s): ${failures.join(' | ')}`
      } else {
        ok = failures.some((failure) => expect.test(failure))
        detail = ok
          ? `refused for that reason (${failures.length} refusal(s))`
          : failures.length === 0
            ? 'PASSED, but should have been refused'
            : `refused, but not for that reason: ${failures.join(' | ')}`
      }
      const more = ok && also ? also(dir, failures, notes) : null
      if (more !== null) {
        ok = false
        detail = more
      }
    } catch (error) {
      ok = false
      detail = `threw: ${(error as Error).stack}`
    }
    results.push({ name, ok, detail })
    if (name.startsWith('control') && !ok) return false
  }
  return true
}

/** The walk's ratification, the index's rounding, the live policy, and the command line. */
function others(base: string, control: string): Result[] {
  const out: Result[] = []
  const copy = (name: string) => {
    const dir = join(base, name)
    cpSync(control, dir, { recursive: true })
    return dir
  }
  const attempt = (name: string, body: () => [boolean, string]) => {
    try {
      const [ok, detail] = body()
      out.push({ name, ok, detail })
    } catch (error) {
      out.push({ name, ok: false, detail: `threw: ${(error as Error).stack}` })
    }
  }

  attempt('the history walk agrees with its hand-ratified fixture', () => {
    const problem = ratify()
    return [problem === null, problem ?? 'agrees']
  })
  // A walk that loses the oldest pull request: it returns a smaller answer and says nothing.
  const dropping: typeof walk = (git, through, o) => {
    const read = walk(git, through, o)
    return { ...read, units: read.units.slice(1) }
  }
  const DISAGREES = /^map: the history walk read the hand-ratified fixture as /
  attempt('the ratification reads a walk that drops a pull request as a disagreement', () => {
    const problem = ratify(dropping)
    return [problem !== null && /^the history walk read the hand-ratified fixture as /.test(problem), problem?.slice(0, 120) ?? 'PASSED, but should have been refused']
  })
  attempt('coupling:check, given a walk that disagrees with its fixture, refuses and checks nothing else', () => {
    const { failures } = check(copy('guard-check'), { walker: dropping })
    return [failures.length === 1 && DISAGREES.test(failures[0]) && /; nothing is checked until it agrees\.$/.test(failures[0]), JSON.stringify(failures.map((f) => f.slice(0, 120)))]
  })
  for (const [name, run] of [
    ['coupling', emit],
    ['coupling:update', update],
  ] as const) {
    attempt(`${name}, given a walk that disagrees with its fixture, refuses to write and leaves the map as it was`, () => {
      const dir = copy(`guard-${name.replace(':', '-')}`)
      edit(dir, MAP, (body) => body.replace('"b":"src/c.js","together":6', '"b":"src/c.js","together":7'))
      const before = readFileSync(join(dir, MAP), 'utf8')
      let refusal = ''
      try {
        run(dir, { walker: dropping })
      } catch (error) {
        refusal = (error as Error).message
      }
      const untouched = readFileSync(join(dir, MAP), 'utf8') === before
      return [DISAGREES.test(refusal) && /; refusing to write artifacts\/coupling\/cochange\.json\.$/.test(refusal) && untouched, `${untouched ? 'map untouched' : 'map REWRITTEN'}, ${JSON.stringify(refusal.slice(0, 120))}`]
    })
  }
  attempt("the walk refuses git diff-tree output it cannot read, each in its own words", () => {
    const pair = `${'a'.repeat(40)} ${'b'.repeat(40)}\n`
    const reasons = ['M\u0000x.js\u0000', `${pair}M\u0000x.js`, `${pair}C075\u0000x.js\u0000y.js\u0000`].map((out) => {
      try {
        parseDiffs(out)
        return 'PASSED'
      } catch (error) {
        return (error as Error).message
      }
    })
    const want = [/^history: git diff-tree printed a record before any pair/, /^history: git diff-tree's output ends inside a record/, /^history: git diff-tree printed the status "C075", which this walk does not read/]
    return [reasons.every((reason, n) => want[n].test(reason)), JSON.stringify(reasons.map((r) => r.slice(0, 80)))]
  })
  attempt('the walk refuses a step git diff-tree printed nothing for', () => {
    const git = scratchGit(control)
    const silent = (args: string[], input?: string) => (args[0] === 'diff-tree' ? '' : git(args, input))
    let refusal = ''
    try {
      walk(silent, git(['rev-parse', 'refs/heads/through']).trim(), FIXTURE_OPTIONS)
    } catch (error) {
      refusal = (error as Error).message
    }
    return [/^history: git diff-tree printed nothing for the step ending [0-9a-f]{12}\.$/.test(refusal), JSON.stringify(refusal)]
  })
  attempt('the index is in thousandths, rounded half up', () => {
    const got = [jaccardPermille(1, 16), jaccardPermille(1, 3), jaccardPermille(2, 3), jaccardPermille(3, 8), jaccardPermille(5, 5)]
    return [JSON.stringify(got) === JSON.stringify([63, 333, 667, 375, 1000]), `read ${JSON.stringify(got)}`]
  })
  // The partners a change leaves alone, over the ratified map at its cluster threshold, 500: each case
  // isolates one reason an edge is dropped, beside the one partner that is found.
  const partners = (changed: string[], min = FIXTURE_OPTIONS.clusterMinJaccardPermille, map: Parameters<typeof partnersOf>[0] = RATIFIED) =>
    JSON.stringify(partnersOf(map, changed, min))
  const pair = (j: number | null) => ({ files: [{ path: 'x.js', changes: 9, hub: false }, { path: 'y.js', changes: 9, hub: false }], edges: [{ a: 'x.js', b: 'y.js', together: 5, jaccardPermille: j }] })
  attempt('partners, control: lib/core/b.js changed alone leaves src/c.js, and its hub partner is not named', () => {
    const got = partners(['lib/core/b.js'])
    return [got === JSON.stringify([{ path: 'lib/core/b.js', partner: 'src/c.js', together: 6, jaccardPermille: 1000 }]), got]
  })
  attempt('partners: a partner the change also changes is not named', () => {
    const got = partners(['lib/core/b.js', 'src/c.js'])
    return [got === '[]', got]
  })
  attempt('partners: a hub changed names none of its edges', () => {
    const got = partners(['package.json'])
    return [got === '[]', got]
  })
  attempt('partners: an index under its sample is never counted, at any threshold', () => {
    const got = partners(['x.js'], 1, pair(null))
    return [got === '[]', got]
  })
  attempt('partners: an edge below the threshold is not named, and one at it is', () => {
    const below = partners(['x.js'], 500, pair(499))
    const at = partners(['y.js'], 499, pair(499))
    return [below === '[]' && at === JSON.stringify([{ path: 'y.js', partner: 'x.js', together: 5, jaccardPermille: 499 }]), `below ${below}, at ${at}`]
  })
  attempt('the live policy has every coupling key, its Means and the shape the check reads', () => {
    const options = readPolicy(ROOT)
    return [true, `read ${Object.keys(options).length} options`]
  })
  attempt("the hand-edit guards name the emitter as the map's owner", () => {
    const message = generatedFileRedirect(MAP) ?? ''
    return [/mise run coupling/.test(message) && /tools\/coupling\/coupling\.ts/.test(message), JSON.stringify(message.slice(0, 200))]
  })

  const cli = (dir: string, args: string[], env: NodeJS.ProcessEnv = {}) =>
    spawnSync(process.execPath, [COUPLING, ...args], { encoding: 'utf8', env: { ...process.env, ...env, COUPLING_ROOT: dir } })
  const text = (run: ReturnType<typeof cli>) => JSON.stringify((run.stdout + run.stderr).trim().slice(0, 400))
  attempt('the command line: coupling:check passes the control through COUPLING_ROOT, and says what landed after', () => {
    const run = cli(control, ['--check'])
    return [run.status === 0 && /every rule holds/.test(run.stdout) && /note: 2 merged pull requests landed/.test(run.stdout), `status ${run.status}, ${text(run)}`]
  })
  attempt('the command line: coupling:check refuses a doctored copy with the reason, and writes nothing', () => {
    const dir = copy('cli-stale')
    edit(dir, MAP, (body) => body.replace('"b":"src/c.js","together":6', '"b":"src/c.js","together":7'))
    const before = readFileSync(join(dir, MAP), 'utf8')
    const run = cli(dir, ['--check'])
    const after = readFileSync(join(dir, MAP), 'utf8')
    return [run.status === 1 && /map: artifacts\/coupling\/cochange\.json is stale/.test(run.stderr) && before === after, `status ${run.status}, map ${before === after ? 'untouched' : 'REWRITTEN'}`]
  })
  attempt('the command line: coupling refuses to write with no map, since no baseline is recorded', () => {
    const dir = copy('cli-none')
    rmSync(join(dir, MAP))
    const run = cli(dir, [])
    return [run.status === 1 && /does not exist, so it records no baseline/.test(run.stderr) && !existsSync(join(dir, MAP)), `status ${run.status}, ${text(run)}`]
  })
  attempt('the command line: coupling writes the same bytes twice, and coupling:check then passes', () => {
    const dir = copy('cli-write')
    edit(dir, MAP, (body) => body.replace('"b":"src/c.js","together":6', '"b":"src/c.js","together":7'))
    const first = cli(dir, [])
    const once = readFileSync(join(dir, MAP), 'utf8')
    cli(dir, [])
    const twice = readFileSync(join(dir, MAP), 'utf8')
    const checked = cli(dir, ['--check'])
    const same = once === twice && once === readFileSync(join(control, MAP), 'utf8')
    return [first.status === 0 && same && checked.status === 0, `write ${first.status}, check ${checked.status}, ${same ? 'same bytes as the control' : 'DIFFERENT bytes'}`]
  })
  attempt('the command line: coupling:update moves the baseline to origin/main, and none then lands after it', () => {
    const dir = copy('cli-update')
    const was = recorded(dir).throughCommit
    const run = cli(dir, ['--update'])
    const now = recorded(dir).throughCommit
    const tip = scratchGit(dir)(['rev-parse', 'refs/remotes/origin/main']).trim()
    const checked = cli(dir, ['--check'])
    return [
      run.status === 0 && now === tip && now !== was && /note: 0 merged pull requests landed/.test(checked.stdout) && recorded(dir).units === RATIFIED.units + 2,
      `update ${run.status}, baseline ${now === tip ? 'at origin/main' : 'NOT at origin/main'}, ${text(checked)}`,
    ]
  })
  attempt("the command line: a hook's exported GIT_DIR naming another repository does not redirect it", () => {
    const decoy = join(base, 'decoy')
    mkdirSync(decoy)
    scratchGit(decoy)(['init', '-q'])
    const run = cli(control, ['--check'], { GIT_DIR: join(decoy, '.git'), GIT_WORK_TREE: decoy, GIT_INDEX_FILE: join(decoy, '.git', 'index') })
    return [run.status === 0 && /every rule holds/.test(run.stdout), `status ${run.status}, ${text(run)}`]
  })
  attempt("the command line: a person's git configuration and a .mailmap change no byte of the map", () => {
    const dir = copy('cli-config')
    const home = join(base, 'home')
    mkdirSync(home)
    writeFileSync(join(home, '.gitconfig'), '[diff]\n\trenames = false\n\trenameLimit = 1\n[log]\n\tshowSignature = true\n[core]\n\tquotepath = true\n[mailmap]\n\tfile = .mailmap\n')
    writeFileSync(join(dir, '.mailmap'), 'Someone Else <someone@example.invalid> <1+person@users.noreply.github.com>\n')
    const run = cli(dir, [], { HOME: home, XDG_CONFIG_HOME: join(home, '.config') })
    const same = readFileSync(join(dir, MAP), 'utf8') === readFileSync(join(control, MAP), 'utf8')
    return [run.status === 0 && same, `status ${run.status}, ${same ? 'same bytes as the control' : 'DIFFERENT bytes'}, ${text(run)}`]
  })
  attempt('the command line: a COUPLING_ROOT in no git checkout is refused', () => {
    const outside = join(base, 'outside')
    mkdirSync(outside)
    const run = cli(outside, ['--check'])
    return [run.status === 1 && /history: .* is not in a git checkout/.test(run.stderr), `status ${run.status}, ${text(run)}`]
  })
  attempt('the command line: a COUPLING_ROOT below the top of its checkout is refused', () => {
    const run = cli(join(control, 'tools'), ['--check'])
    return [run.status === 1 && /history: .* is not the top of a git checkout/.test(run.stderr), `status ${run.status}, ${text(run)}`]
  })
  attempt('the command line: a shallow clone is refused, since its history is not whole', () => {
    const dir = join(base, 'shallow')
    // The scratch environment, never this process's: a pre-push hook exports GIT_DIR, which a clone
    // would write this repository's objects under.
    const cloned = spawnSync('git', ['clone', '-q', '--depth', '1', pathToFileURL(control).href, dir], { encoding: 'utf8', env: SCRATCH_GIT_ENV })
    if (cloned.status !== 0) return [false, `the shallow clone failed: ${cloned.stderr}`]
    const run = cli(dir, ['--check'])
    return [run.status === 1 && /history: this is a shallow clone/.test(run.stderr), `status ${run.status}, ${text(run)}`]
  })
  return out
}

function main() {
  const base = mkdtempSync(join(tmpdir(), 'coupling-selftest-'))
  const results: Result[] = []
  let fatal: string | null = null
  try {
    const control = join(base, 'control')
    buildControl(control)
    if (run(base, control, results)) results.push(...others(base, control))
    else fatal = 'the undoctored fixture does not pass'
  } catch (error) {
    fatal = `the fixture could not be built: ${(error as Error).stack}`
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  if (fatal) console.error(`coupling selftest: ${fatal}, so no case can be trusted.`)
  console.log(`coupling selftest: ${results.length - failed.length}/${results.length} cases hold.`)
  process.exit(failed.length === 0 && fatal === null ? 0 : 1)
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main()
