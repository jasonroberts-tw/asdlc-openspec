/**
 * Co-change emitter and gate. It writes `artifacts/coupling/cochange.json`, a map of which files
 * change together in the pull requests merged to `main`, read from git history through the one
 * trunk commit the file records, `throughCommit`; and `npm run coupling:check` holds the committed
 * file to what it re-derives. A later change has `.claude/agents/fan-out-work.md` read it to keep
 * coupled issues out of parallel lanes (asdlc-openspec-gtjp); a person reads its clusters and hubs
 * for where a decomposition would cut. Why it is committed and pinned, where the code graph of
 * `docs/decisions.md` § D-20 is not, is `docs/decisions.md` § D-24.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong or absent. A map that splits one pull request in two, drops one, or credits a deleted file's
 * history to a new file of the same name returns smaller or wrong neighbours and says nothing, and
 * a lane partition read from it puts two coupled issues side by side, to conflict at cherry-pick. A
 * map edited by hand does the same. So the walk is compared with a hand-ratified fixture before
 * every write and every check, which refuse on a disagreement, and the check refuses any byte the
 * walk would not write.
 *
 * WHAT A UNIT IS. One pull request merged to `main`. A pull request lands by rebase merge
 * (`prReviewMergeMethod` in `tools/policy/pr-review.json`), so the trunk has no merge commit, and
 * GitHub commits the rebased run with one committer address and one committer time. A unit is a maximal
 * run of consecutive commits on the first-parent chain through `throughCommit` that share both,
 * where the address matches `couplingMergeCommitterPattern`. Any other commit is a direct push: it
 * is no unit and is counted as `directCommits`, though its renames and deletions are followed. A
 * merge commit on the chain is refused, and so is a `prReviewMergeMethod` other than `rebase`,
 * under which a squash merge would be read as a direct push.
 *
 * WHAT A UNIT CHANGED. Its net diff, from the tree before its first commit to the tree of its last,
 * every unit read by one `git diff-tree --stdin` with renames at `couplingRenameMinSimilarityPercent`
 * and no rename limit; the unit at the root commit lists every path of its last tree as added. A
 * file added and deleted inside one pull request is not in it. Each path is then named as it is
 * at `throughCommit`, walking the units and direct pushes newest first: a rename maps the old name
 * to the new one's name at the baseline, and a path a later step adds, deletes or renames onto
 * ends the earlier file of that name, so a new file does not inherit a deleted one's history. The
 * limit of reading net diffs: a pull request that deletes a file and moves another onto its path
 * reads as an edit of that path, so the moved file's history stays at its old name and the deleted
 * one's carries on. A
 * change to a file absent at `throughCommit` is dropped (`droppedChanges`), and one to a path a
 * glob of `couplingIgnoredPaths` matches is ignored (`ignoredChanges`). What is left is the unit's
 * files: none makes it an `emptyUnit`, more than `couplingMaxUnitFiles` an `oversizedUnit`, and
 * every other unit is `counted`.
 *
 * THE MAP. One JSON document; every count is a whole number, over the counted units only:
 *
 *   - `units`: the merged pull requests through `throughCommit`; `counted`: those counted.
 *   - `files`: each file a counted unit changed, its `changes` and whether it is a `hub`, changed
 *     by at least `couplingHubMinPercent` of the counted units.
 *   - `edges`: each pair changed together by at least `couplingMinTogether` counted units, as `a`
 *     before `b` by code point, `together` and `jaccardPermille`: together over the units that
 *     changed either, in thousandths, rounded half up (`floor((2000t + u) / 2u)`).
 *   - `clusters`: each connected group of two or more non-hub files over the edges at or above
 *     `couplingClusterMinJaccardPermille`, its `id` the least of its files.
 *
 * A rate under its sample is not written (`CLAUDE.md` § Reporting honesty): `jaccardPermille` is
 * null where fewer than `couplingMinSampleUnits` units changed either file, and `hub` and
 * `clusters` are null where fewer than that many units are counted. What the two rates count is
 * `count-index.md` § Rates and metrics.
 *
 * THE BASELINE. `throughCommit` is the map's one commit id, and the only one this emitter writes.
 * It is safe where trace's record forbids an id, because a commit on `main` is never rewritten
 * (`CLAUDE.md` § Git workflow), and `coupling:check` refuses one off `origin/main`'s first-parent
 * chain. `npm run coupling` re-derives through it and never moves it; `npm run coupling:update`
 * moves it to `origin/main` (`CLAUDE.md` § The script suffix contract), so an ordinary pull request
 * leaves the file alone and two open pull requests never conflict on it. A merge to `main` makes
 * the map lag, not wrong: `coupling:check` prints how many pull requests landed after it.
 *
 * THE RULES `npm run coupling:check` holds. It re-derives the map in memory and refuses, each
 * refusal opening with the name below:
 *
 *   - `map`: a committed map that differs from the re-derivation, none, one that is not JSON, a
 *     file in `artifacts/coupling/` the emitter does not write, or a walk that disagrees with its
 *     ratified fixture.
 *   - `baseline`: no `throughCommit` that is a full commit id, one this clone does not have, or one
 *     off `origin/main`'s first-parent chain.
 *   - `history`: a shallow clone, no `origin/main`, a merge commit on the chain, a root below the
 *     top of its checkout, or output of git the walk cannot read.
 *   - `policy`: a `coupling*` key missing, without its `Means` or of the wrong shape, or a
 *     `prReviewMergeMethod` other than `rebase`.
 *
 * NOT THIS GATE'S. Whether a pair that changes together should: the map counts, and a person or a
 * later prompt judges. Which pull request a unit is: a unit carries no number, and the count is
 * held to GitHub's list by hand when the baseline moves, since no gate reads the network. Two pull
 * requests merged by one address in one second read as one unit.
 *
 * INVOCATION.
 *
 *   npm run coupling            re-derive the map through its recorded throughCommit, and write it
 *   npm run coupling:check      re-derive the map, diff it and hold the rules; writes nothing
 *   npm run coupling:update     move throughCommit to origin/main, and write the map through it
 *   npm run coupling:selftest   each refusal on a doctored fixture repository, beside a control
 *
 * `COUPLING_ROOT=<dir>` points the first three at a doctored copy, the top of a git checkout.
 *
 * NEEDS git and the whole history of `origin/main` (a shallow clone is refused, so CI checks out
 * with `fetch-depth: 0`), `origin/main` itself for `coupling:check` and `coupling:update`, and the
 * keys named above: the `coupling*` keys of `tools/policy/tool-settings.json` and
 * `prReviewMergeMethod` of `tools/policy/pr-review.json`, read through `tools/lib/policy.ts`. Reads
 * only committed files and git history; no network.
 * Its cost is on its job in `git-hooks.yml`.
 *
 * KIND: emitter and gate; `coupling` and `coupling:update` write the map, `coupling:check` nothing.
 * INVARIANTS: no timestamp or randomness; one commit id, `throughCommit`, a trunk commit; whole
 *   numbers only; every list sorted by code point; one serialiser; the history walk and the cluster
 *   walk agree with a hand-ratified fixture before anything is written or checked.
 * RE-ENTRY: a second `npm run coupling` writes the same bytes, and `coupling:check` passes exactly
 *   when it would write none; `coupling:update` run twice with `origin/main` unmoved writes the same
 *   bytes.
 * STALE WHEN: a key under `tools/policy/` it reads; this file or `tools/lib/git-env.ts`; a git
 *   release that pairs renames differently; `coupling:update` moving `throughCommit`. A merge to
 *   `main` is not one: it is printed.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, matchesGlob, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { firstDifference, readText } from '../lib/committed.ts'
import { SCRATCH_GIT_ENV, gitIn, gitOk, type Git } from '../lib/git-env.ts'
import { ROOT as REPO_ROOT } from '../lib/paths.ts'
import { POLICY_DIR, readPolicy as readRecords } from '../lib/policy.ts'

export const DIR = 'artifacts/coupling'
export const MAP = `${DIR}/cochange.json`
/** The records that hold the keys this reads, named in a refusal. */
const COUPLING_RECORD = 'tools/policy/tool-settings.json'
const MERGE_RECORD = 'tools/policy/pr-review.json'
/** The trunk the baseline is held to (`CLAUDE.md` § Git workflow). */
const TRUNK = 'origin/main'
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)
const sorted = (items: Iterable<string>) => [...new Set(items)].sort(byCodePoint)
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/* --------------------------------------------------------------------------------- policy ------- */

/** The values the walk and the map read, each from its key of `tools/policy/tool-settings.json`. */
export type Options = {
  pattern: string
  ignored: string[]
  similarity: number
  maxUnitFiles: number
  minTogether: number
  minSampleUnits: number
  hubMinPercent: number
  clusterMinJaccardPermille: number
}

const whole = (min: number, max: number) => (value: unknown) => Number.isInteger(value) && (value as number) >= min && (value as number) <= max
const compiles = (value: unknown) => {
  if (typeof value !== 'string' || value === '') return false
  try {
    new RegExp(value)
    return true
  } catch {
    return false
  }
}

/** Each option's key, what a value of it must be, and that shape in words for a refusal. */
export const KEYS: { [K in keyof Options]: { key: string; ok: (value: unknown) => boolean; shape: string } } = {
  pattern: { key: 'couplingMergeCommitterPattern', ok: compiles, shape: 'a regular expression that compiles' },
  ignored: {
    key: 'couplingIgnoredPaths',
    ok: (value) => Array.isArray(value) && value.every((glob) => typeof glob === 'string' && glob !== ''),
    shape: 'a list of globs',
  },
  similarity: { key: 'couplingRenameMinSimilarityPercent', ok: whole(1, 100), shape: 'a whole number from 1 to 100' },
  maxUnitFiles: { key: 'couplingMaxUnitFiles', ok: whole(2, Number.MAX_SAFE_INTEGER), shape: 'a whole number of at least 2' },
  minTogether: { key: 'couplingMinTogether', ok: whole(1, Number.MAX_SAFE_INTEGER), shape: 'a whole number of at least 1' },
  minSampleUnits: { key: 'couplingMinSampleUnits', ok: whole(1, Number.MAX_SAFE_INTEGER), shape: 'a whole number of at least 1' },
  hubMinPercent: { key: 'couplingHubMinPercent', ok: whole(1, 100), shape: 'a whole number from 1 to 100' },
  clusterMinJaccardPermille: { key: 'couplingClusterMinJaccardPermille', ok: whole(1, 1000), shape: 'a whole number from 1 to 1000' },
}

/** The options under `root`, refusing a key missing, without its `Means`, or of the wrong shape. */
export function readPolicy(root: string): Options {
  let policy: any
  try {
    policy = readRecords(root)
  } catch (error) {
    throw new Error(`policy: ${POLICY_DIR}/ cannot be read: ${(error as Error).message}.`)
  }
  const problems: string[] = []
  const options: any = {}
  for (const [name, { key, ok, shape }] of Object.entries(KEYS)) {
    if (!Object.hasOwn(policy, key)) problems.push(`${COUPLING_RECORD} \`${key}\` is missing`)
    else if (!ok(policy[key])) problems.push(`${COUPLING_RECORD} \`${key}\` is not ${shape}`)
    const means = policy[`${key}Means`]
    if (typeof means !== 'string' || means.trim() === '') problems.push(`${COUPLING_RECORD} \`${key}Means\` is missing`)
    options[name] = policy[key]
  }
  if (policy.prReviewMergeMethod !== 'rebase') {
    problems.push(`${MERGE_RECORD} \`prReviewMergeMethod\` is ${JSON.stringify(policy.prReviewMergeMethod)}, and a pull request reads as one run of commits only when it is \`rebase\``)
  }
  if (problems.length > 0) throw new Error(`policy: ${problems.join('; ')} (the header of tools/coupling/coupling.ts).`)
  return options as Options
}

/* --------------------------------------------------------------------------------- the walk ----- */

type Commit = { sha: string; tree: string; parents: string[]; committer: string; time: string }

/** A unit or a direct push: the tree before its first commit, null at the root, and its last tree. */
type Step = { kind: 'unit' | 'direct'; base: string | null; head: string; first: Commit; last: Commit }

/** One path a step changed: its status letter, the path after the step, and a rename's old path. */
type Change = { status: string; path: string; from: string | null }

/** What the walk read: every unit's files and class, and what it left out. */
export type Walk = {
  units: { files: string[]; kind: 'counted' | 'empty' | 'oversized' }[]
  directCommits: number
  droppedChanges: number
  ignoredChanges: number
}

/** The first-parent chain through `tip`, oldest first, read with plumbing so no config reorders it. */
function chain(git: Git, tip: string): Commit[] {
  const out = git(['--no-replace-objects', 'rev-list', '--first-parent', '--reverse', '--format=%H%x1f%T%x1f%P%x1f%ce%x1f%ct', tip])
  return out
    .split('\n')
    .filter((line) => line.includes('\u001f'))
    .map((line) => {
      const [sha, tree, parents, committer, time] = line.split('\u001f')
      return { sha, tree, parents: parents === '' ? [] : parents.split(' '), committer, time }
    })
}

/**
 * The chain as steps: a run of commits sharing a merger's address and time is one unit. A merge
 * commit is refused, unless `merges` allows it, as only counting the steps after the baseline does.
 */
function steps(commits: Commit[], merger: RegExp, { merges = false } = {}): Step[] {
  const out: Step[] = []
  commits.forEach((commit, n) => {
    if (commit.parents.length > 1 && !merges) {
      throw new Error(
        `history: ${commit.sha.slice(0, 12)} on the first-parent chain is a merge commit, and a pull request here lands by rebase merge` +
          ' (`prReviewMergeMethod`), so its files cannot be read as one pull request\'s.',
      )
    }
    const isUnit = merger.test(commit.committer)
    const open = out[out.length - 1]
    if (isUnit && open?.kind === 'unit' && open.last.committer === commit.committer && open.last.time === commit.time) {
      open.last = commit
      open.head = commit.tree
      return
    }
    out.push({ kind: isUnit ? 'unit' : 'direct', base: n === 0 ? null : commits[n - 1].tree, head: commit.tree, first: commit, last: commit })
  })
  return out
}

const PAIR = /^([0-9a-f]{40}|[0-9a-f]{64}) ([0-9a-f]{40}|[0-9a-f]{64})\n/

/**
 * The changes of each pair of trees, from one `git diff-tree --stdin -z --name-status`: a line
 * `<tree> <tree>` heads each pair, then NUL-ended records; a pair with no change prints its line
 * alone. Refuses a status the walk does not read, so nothing is skipped in silence.
 */
export function parseDiffs(out: string): Map<string, Change[]> {
  const pairs = new Map<string, Change[]>()
  let at = 0
  let open: Change[] | null = null
  const take = () => {
    const end = out.indexOf('\u0000', at)
    if (end < 0) throw new Error(`history: git diff-tree's output ends inside a record: ${JSON.stringify(out.slice(at, at + 80))}.`)
    const field = out.slice(at, end)
    at = end + 1
    return field
  }
  while (at < out.length) {
    const pair = PAIR.exec(out.slice(at, at + 140))
    if (pair) {
      open = []
      pairs.set(`${pair[1]} ${pair[2]}`, open)
      at += pair[0].length
      continue
    }
    if (open === null) throw new Error(`history: git diff-tree printed a record before any pair: ${JSON.stringify(out.slice(at, at + 80))}.`)
    const status = take()
    if (/^R\d*$/.test(status)) {
      const from = take()
      open.push({ status: 'R', from, path: take() })
    } else if (/^[ADMT]$/.test(status)) open.push({ status, from: null, path: take() })
    else throw new Error(`history: git diff-tree printed the status ${JSON.stringify(status)}, which this walk does not read.`)
  }
  return pairs
}

/**
 * Every unit through `through` with its files as named at `through`, and what was left out; the
 * header's WHAT A UNIT IS and WHAT A UNIT CHANGED are the rules. Refuses what it cannot read.
 */
export function walk(git: Git, through: string, o: Options): Walk {
  const all = steps(chain(git, through), new RegExp(o.pattern))
  const keyed = all.filter((step) => step.base !== null).map((step) => `${step.base} ${step.head}`)
  const diffs = keyed.length === 0 ? new Map<string, Change[]>() : parseDiffs(git(['diff-tree', '--stdin', '-r', '-z', '--name-status', `-M${o.similarity}%`, '-l0'], `${keyed.join('\n')}\n`))
  const changesOf = (step: Step): Change[] => {
    if (step.base === null) {
      return git(['ls-tree', '-r', '-z', '--name-only', step.head])
        .split('\u0000')
        .filter((path) => path !== '')
        .map((path) => ({ status: 'A', from: null, path }))
    }
    const changes = diffs.get(`${step.base} ${step.head}`)
    if (changes === undefined) throw new Error(`history: git diff-tree printed nothing for the step ending ${step.last.sha.slice(0, 12)}.`)
    return changes
  }
  const atBaseline = new Set(git(['ls-tree', '-r', '-z', '--name-only', through]).split('\u0000').filter((path) => path !== ''))

  // Each path's name at the baseline as seen from an older step: absent means its own name, null
  // that the file it named is gone. Steps are read newest first, so a later step has spoken.
  const fate = new Map<string, string | null>()
  const named = (path: string) => (fate.has(path) ? fate.get(path)! : path)
  const units: Walk['units'] = []
  let droppedChanges = 0
  let ignoredChanges = 0
  for (const step of [...all].reverse()) {
    const changes = changesOf(step)
    if (step.kind === 'unit') {
      const files = new Set<string>()
      for (const change of changes) {
        const name = change.status === 'D' ? null : named(change.path)
        if (name === null || !atBaseline.has(name)) droppedChanges++
        else if (o.ignored.some((glob) => matchesGlob(name, glob))) ignoredChanges++
        else files.add(name)
      }
      const kind = files.size === 0 ? 'empty' : files.size > o.maxUnitFiles ? 'oversized' : 'counted'
      units.push({ files: sorted(files), kind })
    }
    // What an older step's paths become: a rename's old path is its new path's name, read before
    // this step's own changes; a path this step adds, deletes or renames onto ends an older file.
    const renamed = changes.filter((change) => change.status === 'R').map((change) => [change.from!, named(change.path)] as const)
    for (const change of changes) if (change.status !== 'M' && change.status !== 'T') fate.set(change.path, null)
    for (const [from, name] of renamed) fate.set(from, name)
  }
  return { units: units.reverse(), directCommits: all.filter((step) => step.kind === 'direct').length, droppedChanges, ignoredChanges }
}

/* --------------------------------------------------------------------------------- the map ------ */

export type CoChange = {
  _: string[]
  throughCommit: string
  units: number
  counted: number
  excluded: { directCommits: number; emptyUnits: number; oversizedUnits: number; droppedChanges: number; ignoredChanges: number }
  files: { path: string; changes: number; hub: boolean | null }[]
  edges: { a: string; b: string; together: number; jaccardPermille: number | null }[]
  clusters: { id: string; files: string[] }[] | null
}

const BANNER = [
  'GENERATED by `npm run coupling` (tools/coupling/coupling.ts). Do not edit by hand: a correction goes into the emitter or its keys under tools/policy/, and `npm run coupling` writes it again; only `npm run coupling:update` moves throughCommit.',
  'Which files change together in the pull requests merged to main, read from git history through throughCommit: units is the merged pull requests, counted those neither empty nor over couplingMaxUnitFiles, and excluded what was left out, by reason.',
  'files: each file at throughCommit a counted pull request changed, how many changed it, and whether it is a hub (couplingHubMinPercent). edges: each pair changed together by at least couplingMinTogether, how many, and their Jaccard index in thousandths, null under couplingMinSampleUnits. clusters: the connected groups of non-hub files over edges at or above couplingClusterMinJaccardPermille.',
  'npm run coupling:check re-derives it and refuses a difference; the rules are the header of tools/coupling/coupling.ts.',
]

/** `together` over the units that changed either file, in thousandths, rounded half up. */
export function jaccardPermille(together: number, union: number): number {
  return Math.floor((2000 * together + union) / (2 * union))
}

/** The map of what `walk` read, by the options' thresholds. */
export function mapOf(read: Walk, o: Options, throughCommit: string): CoChange {
  const counted = read.units.filter((unit) => unit.kind === 'counted').map((unit) => unit.files)
  const sampled = counted.length >= o.minSampleUnits
  const changes = new Map<string, number>()
  const together = new Map<string, number>()
  for (const files of counted) {
    for (let i = 0; i < files.length; i++) {
      changes.set(files[i], (changes.get(files[i]) ?? 0) + 1)
      for (let j = i + 1; j < files.length; j++) {
        const pair = `${files[i]}\u0000${files[j]}`
        together.set(pair, (together.get(pair) ?? 0) + 1)
      }
    }
  }
  const hub = (path: string) => (sampled ? changes.get(path)! * 100 >= o.hubMinPercent * counted.length : null)
  const files = sorted(changes.keys()).map((path) => ({ path, changes: changes.get(path)!, hub: hub(path) }))
  const edges = sorted([...together].filter(([, n]) => n >= o.minTogether).map(([pair]) => pair)).map((pair) => {
    const [a, b] = pair.split('\u0000')
    const n = together.get(pair)!
    const union = changes.get(a)! + changes.get(b)! - n
    return { a, b, together: n, jaccardPermille: union < o.minSampleUnits ? null : jaccardPermille(n, union) }
  })
  return {
    _: BANNER,
    throughCommit,
    units: read.units.length,
    counted: counted.length,
    excluded: {
      directCommits: read.directCommits,
      emptyUnits: read.units.filter((unit) => unit.kind === 'empty').length,
      oversizedUnits: read.units.filter((unit) => unit.kind === 'oversized').length,
      droppedChanges: read.droppedChanges,
      ignoredChanges: read.ignoredChanges,
    },
    files,
    edges,
    clusters: sampled ? clustersOf(edges, new Set(files.filter((file) => file.hub).map((file) => file.path)), o.clusterMinJaccardPermille) : null,
  }
}

/** The connected groups of two or more non-hub files over the edges at or above `min`. */
function clustersOf(edges: CoChange['edges'], hubs: Set<string>, min: number): { id: string; files: string[] }[] {
  const parent = new Map<string, string>()
  const top = (path: string): string => {
    let at = path
    while (parent.get(at) !== at) at = parent.get(at)!
    return at
  }
  for (const { a, b, jaccardPermille: j } of edges) {
    if (j === null || j < min || hubs.has(a) || hubs.has(b)) continue
    for (const path of [a, b]) if (!parent.has(path)) parent.set(path, path)
    const [x, y] = [top(a), top(b)].sort(byCodePoint)
    parent.set(y, x)
  }
  const groups = new Map<string, string[]>()
  for (const path of parent.keys()) groups.set(top(path), [...(groups.get(top(path)) ?? []), path])
  return [...groups.values()]
    .map((members) => sorted(members))
    .map((members) => ({ id: members[0], files: members }))
    .sort((p, q) => byCodePoint(p.id, q.id))
}

/**
 * The one serialiser the map is written with: two-space JSON, except that each entry of `files`,
 * `edges` and `clusters` is one line, so a move of the baseline reads as a diff of the pairs that
 * moved.
 */
export function serialise(map: CoChange): string {
  const fields = Object.entries(map).map(([key, value]) => {
    const rows = Array.isArray(value) && value.length > 0 && value.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row))
    const body = rows ? `[\n${(value as object[]).map((row) => `    ${JSON.stringify(row)}`).join(',\n')}\n  ]` : JSON.stringify(value, null, 2).replace(/\n/g, '\n  ')
    return `  ${JSON.stringify(key)}: ${body}`
  })
  return `{\n${fields.join(',\n')}\n}\n`
}

/* --------------------------------------------------------------------------------- ratified ----- */

/** The options the ratified fixture is walked with: its own, never the live policy's. */
export const FIXTURE_OPTIONS: Options = {
  pattern: '^[0-9]+\\+[^@]+@users\\.noreply\\.github\\.com$',
  ignored: ['artifacts/coupling/**'],
  similarity: 50,
  maxUnitFiles: 4,
  minTogether: 2,
  minSampleUnits: 5,
  hubMinPercent: 80,
  clusterMinJaccardPermille: 500,
}

/**
 * The map of the history `ratify` builds, worked out by hand from its stream: eleven pull requests
 * and two direct pushes through the baseline, and one after it that is not read. A unit at the
 * root, a file added and deleted inside one, a person and a bot merging in the same second, an
 * edit and its revert that leave a unit empty, a pure rename, a rename by a direct push, a rename
 * with an edit, a rewrite read as a deletion and an addition, a deletion and a new file of the same
 * name, paths with a space and a non-ASCII letter, an ignored path and an oversized unit are each in
 * it, with a hub, a cluster and a Jaccard index under its sample.
 */
export const RATIFIED = {
  units: 11,
  counted: 9,
  excluded: { directCommits: 2, emptyUnits: 1, oversizedUnits: 1, droppedChanges: 7, ignoredChanges: 1 },
  files: [
    { path: 'docs/howto.md', changes: 3, hub: false },
    { path: 'docs/my file é.md', changes: 4, hub: false },
    { path: 'docs/new.md', changes: 1, hub: false },
    { path: 'lib/core/b.js', changes: 6, hub: false },
    { path: 'package.json', changes: 8, hub: true },
    { path: 'src/a.js', changes: 2, hub: false },
    { path: 'src/c.js', changes: 6, hub: false },
  ],
  edges: [
    { a: 'docs/howto.md', b: 'docs/my file é.md', together: 3, jaccardPermille: null },
    { a: 'docs/howto.md', b: 'package.json', together: 3, jaccardPermille: 375 },
    { a: 'docs/my file é.md', b: 'package.json', together: 4, jaccardPermille: 500 },
    { a: 'lib/core/b.js', b: 'package.json', together: 5, jaccardPermille: 556 },
    { a: 'lib/core/b.js', b: 'src/c.js', together: 6, jaccardPermille: 1000 },
    { a: 'package.json', b: 'src/c.js', together: 5, jaccardPermille: 556 },
  ],
  clusters: [{ id: 'lib/core/b.js', files: ['lib/core/b.js', 'src/c.js'] }],
}

/** Ten lines of a file's text, `tag` naming the file and its version, so no two files are alike. */
const text = (tag: string, changed = 0) =>
  Array.from({ length: 10 }, (_, n) => (n < changed ? `// rewritten line ${n} of ${tag}\n` : `const ${tag.replace(/\W/g, '_')}_${n} = 'line ${n} of ${tag}'\n`)).join('')

/**
 * The fast-import stream of the ratified history, with fixed committers and times: `main` ends one
 * pull request past `refs/heads/through`, the baseline.
 */
export function ratifiedStream(): string {
  const who = {
    person: 'Person <1+person@users.noreply.github.com>',
    bot: 'ci[bot] <2+ci[bot]@users.noreply.github.com>',
    direct: 'Dev <dev@example.invalid>',
  }
  const data = (body: string) => `data ${Buffer.byteLength(body)}\n${body}\n`
  let mark = 0
  const commit = (by: keyof typeof who, time: number, subject: string, ops: string[]) =>
    `commit refs/heads/main\nmark :${++mark}\ncommitter ${who[by]} ${1700000000 + time} +0000\n${data(subject)}${ops.join('')}\n`
  const put = (path: string, body: string) => `M 100644 inline ${path}\n${data(body)}`
  const del = (path: string) => `D ${path}\n`
  const move = (from: string, to: string) => `R ${from} ${to}\n`
  const my = 'docs/my file é.md'
  const stream = [
    commit('person', 1000, 'U1, at the root', [put('src/a.js', text('a')), put('src/b.js', text('b')), put('src/c.js', text('c0')), put('tmp/scratch.txt', text('scratch')), put('docs/old.md', text('old')), put('package.json', text('p0'))]),
    commit('person', 1000, 'U1, the scratch file gone', [del('tmp/scratch.txt'), put('src/c.js', text('c1'))]),
    commit('direct', 1100, 'D1', [put('docs/guide.md', text('guide0'))]),
    commit('person', 1200, 'U2', [put('src/b.js', text('b', 1)), put('src/c.js', text('c2')), put(my, text('my0')), put('package.json', text('p1'))]),
    commit('bot', 1200, 'U3, by the bot in the same second', [put(my, text('my1')), put('docs/guide.md', text('guide1')), put('artifacts/coupling/cochange.json', text('map')), put('src/a.js', text('a1')), put('package.json', text('p2'))]),
    commit('person', 1300, 'U4, an edit', [put('src/c.js', text('c99'))]),
    commit('person', 1300, 'U4, a file a later unit deletes', [put('old/gone.js', text('gone'))]),
    commit('person', 1300, 'U4, the edit reverted', [put('src/c.js', text('c2'))]),
    commit('person', 1400, 'U5, a pure rename', [move('src/b.js', 'lib/b.js'), put('src/c.js', text('c3')), put('package.json', text('p3'))]),
    commit('direct', 1500, 'D2, a rename by a direct push', [move('docs/guide.md', 'docs/howto.md')]),
    commit('person', 1600, 'U6, a rename with an edit', [move('lib/b.js', 'lib/core/b.js'), put('lib/core/b.js', text('b', 3)), put('src/c.js', text('c4')), del('old/gone.js'), put('package.json', text('p4'))]),
    commit('person', 1700, 'U7, a rewrite read as a deletion and an addition', [del('docs/old.md'), put('docs/new.md', text('n0', 10)), put(my, text('my2')), put('docs/howto.md', text('guide2')), put('package.json', text('p5'))]),
    commit('person', 1800, 'U8, a file deleted', [del('src/a.js'), put('lib/core/b.js', text('b', 4)), put('src/c.js', text('c5')), put('package.json', text('p6'))]),
    commit('person', 1900, 'U9, a new file where the deleted one was', [put('src/a.js', text('another a', 10)), put(my, text('my3')), put('docs/howto.md', text('guide3')), put('package.json', text('p7'))]),
    commit('person', 2000, 'U10, oversized', [put('lib/core/b.js', text('b', 5)), put('src/c.js', text('c6')), put('docs/new.md', text('n1', 10)), put('gen/x1.js', text('x1')), put('gen/x2.js', text('x2'))]),
    commit('person', 2100, 'U11, the baseline', [put('lib/core/b.js', text('b', 6)), put('src/c.js', text('c7')), put('src/a.js', text('another a, again', 10))]),
    `reset refs/heads/through\nfrom :${mark}\n\n`,
    commit('person', 2200, 'U12, after the baseline', [put('src/c.js', text('c8'))]),
  ]
  return stream.join('')
}

const comparable = (map: CoChange) => JSON.stringify({ units: map.units, counted: map.counted, excluded: map.excluded, files: map.files, edges: map.edges, clusters: map.clusters })

/**
 * Why `walker` reads the ratified history other than by hand, or null when it agrees. The emitter
 * and the check run it before anything else, since a walk that drops a unit says nothing.
 */
export function ratify(walker: typeof walk = walk): string | null {
  const dir = mkdtempSync(join(tmpdir(), 'coupling-ratify-'))
  try {
    const git = gitIn(dir, SCRATCH_GIT_ENV)
    git(['init', '-q', '--bare'])
    const imported = spawnSync('git', ['fast-import', '--quiet'], { cwd: dir, env: SCRATCH_GIT_ENV, input: ratifiedStream(), encoding: 'utf8' })
    if (imported.status !== 0) throw new Error(`git fast-import refused the fixture: ${imported.stderr.trim()}`)
    const through = git(['rev-parse', 'refs/heads/through']).trim()
    const got = comparable(mapOf(walker(git, through, FIXTURE_OPTIONS), FIXTURE_OPTIONS, through))
    const want = JSON.stringify(RATIFIED)
    return got === want ? null : `the history walk read the hand-ratified fixture as ${got}, where it is ${want}`
  } catch (error) {
    return `the history walk could not read the hand-ratified fixture: ${(error as Error).message}`
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/* --------------------------------------------------------------------------------- inputs ------- */

/** Refuses a root that is not the top of its own git checkout, and a shallow clone. */
function wholeHistory(git: Git, root: string) {
  let top: string
  try {
    top = git(['rev-parse', '--show-toplevel']).trim()
  } catch (error) {
    throw new Error(`history: ${root} is not in a git checkout: ${(error as Error).message}`)
  }
  if (realpathSync(top) !== realpathSync(root)) {
    throw new Error(`history: ${root} is not the top of a git checkout (git reads ${top} from there); point COUPLING_ROOT at a checkout's top.`)
  }
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    throw new Error('history: this is a shallow clone, so the walk would miss every pull request it lacks: fetch the whole history (in CI, check out with `fetch-depth: 0`).')
  }
}

/** The trunk's commit id, refusing a checkout with no trunk to hold the baseline to. */
function trunkTip(git: Git): string {
  if (!gitOk(git, ['rev-parse', '--verify', '--quiet', `${TRUNK}^{commit}`])) {
    throw new Error(`history: ${TRUNK} is not a ref here, so the baseline cannot be held to the trunk: \`git fetch origin main\` (in CI, check out with \`fetch-depth: 0\`).`)
  }
  return git(['rev-parse', `${TRUNK}^{commit}`]).trim()
}

/** The `throughCommit` a map's text records, or the refusal that it records none. */
function recordedThrough(text: string): string {
  let parsed: any
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw new Error(`map: ${MAP} is not JSON (${(error as Error).message}); \`npm run coupling\` writes it.`)
  }
  const through = parsed?.throughCommit
  if (typeof through !== 'string' || !COMMIT_ID.test(through)) {
    throw new Error(`baseline: ${MAP} has no \`throughCommit\` that is a full commit id; \`npm run coupling:update\` writes one.`)
  }
  return through
}

/** The map under `root` through `through`. Throws, with the rule's name first, when it cannot be derived. */
export function derive(root: string, through: string): CoChange {
  const git = gitIn(root)
  wholeHistory(git, root)
  const options = readPolicy(root)
  if (!gitOk(git, ['cat-file', '-e', `${through}^{commit}`])) {
    throw new Error(`baseline: \`throughCommit\` ${through.slice(0, 12)} is not a commit in this clone: \`git fetch origin main\`; if it is still missing, it was never on the trunk.`)
  }
  try {
    return mapOf(walk(git, through, options), options, through)
  } catch (error) {
    const message = (error as Error).message
    throw new Error(/^(history|baseline|policy|map): /.test(message) ? message : `history: ${message}`)
  }
}

/** How a map reads in one line, for the summary a run prints. */
function summary(map: CoChange): string {
  return (
    `${count(map.units, 'merged pull request')} through ${map.throughCommit.slice(0, 12)}, ${map.counted} counted;` +
    ` ${count(map.files.length, 'file')}, ${count(map.edges.length, 'edge')} and ${count(map.clusters?.length ?? 0, 'cluster')}`
  )
}

/* --------------------------------------------------------------------------------- commands ----- */

export type Checked = { failures: string[]; notes: string[]; summary: string }

/**
 * What `check`, `emit` and `update` take: `ratified` says the caller has already held the walk to
 * the ratified fixture, as the selftest does once for its cases, and `walker` is the walk held to
 * it, which only the selftest replaces, with one that disagrees.
 */
type Guarded = { ratified?: boolean; walker?: typeof walk }

/** Every refusal of `coupling:check` under `root`. Writes nothing. */
export function check(root: string, { ratified: already = false, walker = walk }: Guarded = {}): Checked {
  const failures: string[] = []
  const notes: string[] = []
  const done = (line = '') => ({ failures, notes, summary: line })
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) {
    failures.push(`map: ${ratified}; nothing is checked until it agrees.`)
    return done()
  }
  const git = gitIn(root)
  let options: Options
  try {
    wholeHistory(git, root)
    options = readPolicy(root)
  } catch (error) {
    failures.push((error as Error).message)
    return done()
  }
  for (const name of existsSync(join(root, DIR)) ? readdirSync(join(root, DIR)).sort(byCodePoint) : []) {
    if (`${DIR}/${name}` !== MAP) {
      failures.push(`map: ${DIR}/${name} is a file neither \`npm run coupling\` nor \`npm run coupling:update\` writes, so a fresh run would not leave it; delete it (\`CLAUDE.md\` § The script suffix contract).`)
    }
  }
  const committed = readText(join(root, MAP))
  if (committed === null) {
    failures.push(`map: ${MAP} does not exist; run \`npm run coupling:update\` and commit it.`)
    return done()
  }
  let derived: CoChange
  try {
    const through = recordedThrough(committed)
    derived = derive(root, through)
    const trunk = chain(git, trunkTip(git))
    const at = trunk.findIndex((commit) => commit.sha === through)
    if (at < 0) {
      failures.push(
        `baseline: \`throughCommit\` ${through.slice(0, 12)} is not on ${TRUNK}'s first-parent chain, so a rebase merge can rewrite it and the map` +
          ` names a commit the trunk never had; run \`git fetch origin main\`, then \`npm run coupling:update\`.`,
      )
      return done()
    }
    // Only counted: a merge commit after the baseline is the next `coupling:update`'s to refuse.
    const after = steps(trunk.slice(at + 1), new RegExp(options.pattern), { merges: true }).filter((step) => step.kind === 'unit').length
    notes.push(`${count(after, 'merged pull request')} landed on ${TRUNK} after the map's baseline ${through.slice(0, 12)}; \`npm run coupling:update\` moves it there.`)
  } catch (error) {
    failures.push((error as Error).message)
    return done()
  }
  const fresh = serialise(derived)
  if (committed !== fresh) {
    failures.push(`map: ${MAP} is stale, ${firstDifference(committed, fresh)}; run \`npm run coupling\` and commit what it writes, or \`npm run coupling:update\` to move its baseline too.`)
  }
  return done(summary(derived))
}

/** `npm run coupling`: re-derive the map through its recorded baseline and write it. */
export function emit(root: string, { ratified: already = false, walker = walk }: Guarded = {}): CoChange {
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) throw new Error(`map: ${ratified}; refusing to write ${MAP}.`)
  const committed = readText(join(root, MAP))
  if (committed === null) throw new Error(`map: ${MAP} does not exist, so it records no baseline to re-derive through; run \`npm run coupling:update\` and commit it.`)
  const map = derive(root, recordedThrough(committed))
  writeFileSync(join(root, MAP), serialise(map))
  return map
}

/** `npm run coupling:update`: move the baseline to the trunk's tip and write the map through it. */
export function update(root: string, { ratified: already = false, walker = walk }: Guarded = {}): CoChange {
  const ratified = already ? null : ratify(walker)
  if (ratified !== null) throw new Error(`map: ${ratified}; refusing to write ${MAP}.`)
  const git = gitIn(root)
  wholeHistory(git, root)
  const map = derive(root, trunkTip(git))
  mkdirSync(dirname(join(root, MAP)), { recursive: true })
  writeFileSync(join(root, MAP), serialise(map))
  return map
}

/* --------------------------------------------------------------------------------- the CLI ------ */

function main(argv: string[]) {
  const root = process.env.COUPLING_ROOT ? resolve(process.env.COUPLING_ROOT) : REPO_ROOT
  const [flag, ...rest] = argv
  if (rest.length > 0 || (flag !== undefined && flag !== '--check' && flag !== '--update')) {
    console.error('usage: node tools/coupling/coupling.ts [--check | --update]')
    process.exit(1)
  }
  if (flag === '--check') {
    const { failures, notes, summary: line } = check(root)
    for (const note of notes) console.log(`note: ${note}`)
    if (failures.length === 0) {
      console.log(`coupling:check: ${MAP} is current and every rule holds: ${line}.`)
      process.exit(0)
    }
    console.error(`coupling:check: ${failures.length} refusal(s)${line ? ` over ${line}` : '.'}\n`)
    for (const failure of failures) console.error(`  - ${failure}\n`)
    console.error('Each refusal names its rule; the header of tools/coupling/coupling.ts is its home.')
    process.exit(1)
  }
  try {
    const map = flag === '--update' ? update(root) : emit(root)
    console.log(`coupling${flag === '--update' ? ':update' : ''}: wrote ${MAP}: ${summary(map)}.`)
  } catch (error) {
    console.error(`coupling${flag === '--update' ? ':update' : ''}: ${(error as Error).message}`)
    process.exit(1)
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main(process.argv.slice(2))
