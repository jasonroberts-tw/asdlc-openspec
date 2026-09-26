/**
 * Assessing one node's staleness -- the library half of `pipeline:stale`.
 *
 * Separate from `stale.ts` because the FAIL-vs-REPORT split below is the riskiest policy decision in
 * this feature and it needs to be driven by a test rather than by reading a script's output.
 * `tools/pipeline/selftest.ts` exercises every branch. `stale.ts` is the CLI: it renders what this
 * module decides and owns the exit code.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { short } from './digest.ts'
import type { PipelineNode } from './graph.ts'
import {
  ROOT,
  UNKNOWN_COMMIT,
  siblingCommit,
  commitRelation,
  commitsAhead,
  computeGeneratorDigest,
  computeInputs,
  readStamp,
} from './provenance.ts'

export type Verdict =
  | 'current'
  | 'stale'
  /** The output exists but carries no provenance block: it predates the stamp, or was hand-made. */
  | 'unstamped'
  /** The node has never run: its stamped output is not on disk at all. */
  | 'absent'
  /** Only a `checkout` group could have moved, and there is no checkout here to ask. */
  | 'unverifiable'
  /**
   * The sibling checkout has moved PAST the commit the artifacts were pinned at. Ordinary, and not a
   * defect -- but it makes any `--check` that rebuilds from the sibling checkout report false STALE,
   * so it is reported.
   */
  | 'pin-drift'
  /**
   * The digest gate does not assess it: a whole-output `:check` covers it (`detection.via` is
   * `regeneration`), or the record says why nothing does (`none`). Reported, never failed.
   */
  | 'not-applicable'

export interface Report {
  node: PipelineNode
  verdict: Verdict
  /** The input groups whose digest moved, by name. Empty unless `verdict === 'stale'`. */
  moved: string[]
  /** True when the generator source moved rather than (or as well as) the inputs. */
  generatorMoved: boolean
  detail: string
}

/* ----------------------------------------------------------------------------------------------- *
 * Per-detection-kind assessment
 * ----------------------------------------------------------------------------------------------- */

function assessDigest(node: PipelineNode, root: string): Report {
  const det = node.detection
  if (det.via !== 'digest') throw new Error('assessDigest called on a non-digest node')

  const outputPath = join(root, det.stamp.path)
  if (!existsSync(outputPath)) {
    return {
      node,
      verdict: 'absent',
      moved: [],
      generatorMoved: false,
      detail: `${det.stamp.path} does not exist`,
    }
  }

  const stamp = readStamp(node, root)
  if (!stamp) {
    // ONE pass, reused. `computeInputs` is the expensive call in this module -- a walk and a
    // SHA-256 of every file a node's input groups match, so its cost grows with the inputs -- and
    // this is the branch EVERY digest node takes until its first stamp is written. Calling it a
    // second time for the detail string below would double the hashing to report the same number.
    const { inputs, inputsDigest } = computeInputs(node, root)
    const groups = Object.keys(inputs).length
    return {
      node,
      verdict: 'unstamped',
      moved: [],
      generatorMoved: false,
      // States what the artifact COULD be justified against, not just that it is unstamped. For a
      // hand-maintained output the honest finding is never "re-run it" -- there may be nothing to
      // run -- it is "this file claims a measurement it can no longer justify".
      detail: `${det.stamp.path} carries no "${det.stamp.key}" block; its ${groups} declared input group(s) currently fold to ${short(inputsDigest)}`,
    }
  }

  const { inputs, inputsDigest, unhashable } = computeInputs(node, root)
  const generatorDigest = computeGeneratorDigest(node, root)

  const moved: string[] = []
  let sawUnverifiable = false
  let pinDrift: string | null = null
  for (const [name, value] of Object.entries(inputs)) {
    const was = stamp.inputs[name]
    if (was === value) continue

    if (unhashable.includes(name)) {
      if (value === UNKNOWN_COMMIT) {
        // No checkout here. The stamped commit cannot be confirmed OR refuted, and reporting it as
        // moved would fail CI on every node that reads `../sibling` -- the exact false red this
        // whole design exists to avoid.
        sawUnverifiable = true
        continue
      }
      // THE SAME PIN-DRIFT RULE `assessLegacyCommit` APPLIES, and a digest node needs it just as
      // much. Some nodes carry a `checkout` input group AND are
      // `staleness: 'inputs'`, so once they are stamped, treating "somebody pulled the sibling
      // checkout" as a moved input would FAIL this gate on every developer machine not sitting
      // exactly on the pinned commit. Ahead of the pin is a decision not yet taken, not a defect.
      // Only a DIVERGED checkout -- one that cannot produce the commit the artifact cites -- is a
      // finding, and that falls through to `moved` below.
      if (was !== undefined && commitRelation(was, value, root) === 'ahead') {
        const n = commitsAhead(was, value, root)
        pinDrift = `${name}: stamped at ${was.slice(0, 8)}, checkout ${n === null ? 'ahead' : `${n} commit(s) ahead`} at ${value.slice(0, 8)}`
        continue
      }
    }
    moved.push(name)
  }
  // A group declared in `graph.ts` after the artifact was stamped is a genuine difference, and the
  // fold catches it even when every shared group matches.
  for (const name of Object.keys(stamp.inputs)) {
    if (!(name in inputs) && !moved.includes(name)) moved.push(`${name} (no longer declared)`)
  }

  const generatorMoved = stamp.generatorDigest !== generatorDigest
  if (!moved.length && !generatorMoved) {
    // Ordered most-informative first: a diverged pin outranks a missing checkout outranks "current",
    // because each says something the next one down cannot.
    if (pinDrift) {
      return {
        node,
        verdict: 'pin-drift',
        moved: [],
        generatorMoved: false,
        detail: `every hashable input matches. ${pinDrift}. NOT staleness -- the pin is deliberate.`,
      }
    }
    return {
      node,
      verdict: sawUnverifiable ? 'unverifiable' : 'current',
      moved: [],
      generatorMoved: false,
      detail: sawUnverifiable
        ? `inputs match; ../sibling@${stamp.inputs['../sibling@commit']?.slice(0, 8) ?? '?'} not verifiable without a checkout`
        : `inputsDigest ${short(inputsDigest)}`,
    }
  }

  const bits: string[] = []
  if (moved.length) bits.push(moved.join(', '))
  if (generatorMoved)
    bits.push(`generator source (${short(stamp.generatorDigest)} -> ${short(generatorDigest)})`)
  return { node, verdict: 'stale', moved, generatorMoved, detail: bits.join('; ') }
}

/**
 * A node that parses the sibling checkout and records in its output only the commit it parsed
 * (`detection.via: 'legacy-commit'`). Its signal is a commit comparison rather than a digest --
 * coarser than a digest node's, and correctly so.
 *
 * The distinction that carries the weight is AHEAD versus DIVERGED. A checkout ahead of the pin is
 * the ordinary state of a working clone the moment anyone pulls; a checkout that cannot produce the
 * pinned commit is a genuine finding. See the `'ahead'` branch.
 */
function assessLegacyCommit(node: PipelineNode, root: string): Report {
  const det = node.detection
  if (det.via !== 'legacy-commit') throw new Error('assessLegacyCommit called on the wrong node')

  const abs = join(root, det.stamp.path)
  if (!existsSync(abs)) {
    return {
      node,
      verdict: 'absent',
      moved: [],
      generatorMoved: false,
      detail: `${det.stamp.path} does not exist`,
    }
  }
  let recorded: string | undefined
  try {
    recorded = (JSON.parse(readFileSync(abs, 'utf8')) as Record<string, string>)[det.stamp.key]
  } catch {
    recorded = undefined
  }
  if (!recorded) {
    return {
      node,
      verdict: 'unstamped',
      moved: [],
      generatorMoved: false,
      detail: `${det.stamp.path} has no "${det.stamp.key}"`,
    }
  }
  const live = siblingCommit(root)
  if (live === UNKNOWN_COMMIT) {
    return {
      node,
      verdict: 'unverifiable',
      moved: [],
      generatorMoved: false,
      detail: `pinned at ${recorded.slice(0, 8)}; no ../sibling checkout to compare against`,
    }
  }
  const relation = commitRelation(recorded, live, root)
  if (relation === 'same') {
    return {
      node,
      verdict: 'current',
      moved: [],
      generatorMoved: false,
      detail: `../sibling@${live.slice(0, 8)}`,
    }
  }

  // THE CHECKOUT BEING AHEAD OF THE PIN IS NOT STALENESS. The output was built from the pinned
  // commit on purpose and describes that commit; a rebuild from a later one breaks every comparison
  // across the boundary, so moving the pin is a decision. Somebody pulling the sibling checkout does
  // not make the committed output wrong -- it makes it un-CHECKABLE, which is a different and far
  // more useful thing to report.
  //
  // It is worth reporting because of what it does to the node's own `--check`: run with the
  // checkout ahead of the pin, a `--check` that rebuilds from the sibling checkout rebuilds from the
  // NEWER source, diffs the result against an output built from the older one, and reports a correct
  // output as stale. Guarding that `--check` itself is the node's business; this only reports the
  // condition.
  if (relation === 'ahead') {
    const n = commitsAhead(recorded, live, root)
    return {
      node,
      verdict: 'pin-drift',
      moved: [],
      generatorMoved: false,
      detail:
        `pinned at ${recorded.slice(0, 8)}; checkout is ${n === null ? 'some commits' : `${n} commit(s)`} ahead at ${live.slice(0, 8)}. ` +
        "NOT staleness -- the pin is deliberate. But this node's --check reports false STALE here until the checkout returns to the pin or the pin is deliberately moved.",
    }
  }

  // Not reachable from HEAD. The artifacts cite a commit this checkout cannot produce, which is the
  // shape of a resurrected or force-pushed branch.
  return {
    node,
    verdict: 'stale',
    moved: ['../sibling@commit'],
    generatorMoved: false,
    detail: `pinned ${recorded.slice(0, 8)} is NOT an ancestor of checkout ${live.slice(0, 8)} -- they have diverged`,
  }
}

export function assess(node: PipelineNode, root: string = ROOT): Report {
  switch (node.detection.via) {
    case 'digest':
      return assessDigest(node, root)
    case 'legacy-commit':
      return assessLegacyCommit(node, root)
    case 'regeneration':
      return {
        node,
        verdict: 'not-applicable',
        moved: [],
        generatorMoved: false,
        detail: `covered by \`npm run ${node.detection.script}\` (${node.detection.where})`,
      }
    case 'none':
      return {
        node,
        verdict: 'not-applicable',
        moved: [],
        generatorMoved: false,
        detail: node.detection.why,
      }
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * Policy
 * ----------------------------------------------------------------------------------------------- */

/**
 * Whether a verdict should FAIL the gate, as opposed to being reported.
 *
 * This gate is a RATCHET, in the sense the header of `scripts/lint-ratchet.mjs` gives warning
 * counts: pre-existing debt may improve and must never regress. Every category below but the last
 * is reported loudly and does not fail, and each exclusion is a decision rather than a softening.
 *
 *  - `'grows'` NODES NEVER FAIL. The single most important line in this file. A push blocked on
 *    "a node should be reconciled" is a push people send with `--no-verify`, which skips every
 *    pre-push job and not only this one. `'grows'` is the only `Staleness` value `graph.ts` allows
 *    besides `'inputs'`, so the `staleness !== 'inputs'` test below means `'grows'` alone.
 *
 *  - AN UNSTAMPED ARTIFACT PREDATES THIS MECHANISM. It was built before anything wrote a provenance
 *    block, so there is no record of what it was justified against and this gate has nothing to
 *    compare. Failing on it would make every push red on the commit that introduces the feature,
 *    which is how a gate gets deleted. It becomes binding for that node the moment its emitter runs
 *    once -- and until then the report says so on every push.
 *
 *  - PIN-DRIFT IS NOT STALENESS AT ALL. An output pinned at one `../sibling` commit was built from
 *    that commit on purpose, and a working checkout moves past the pin the moment anyone pulls.
 *    Nothing in this repository caused the move and no commit here repairs it -- moving the pin is
 *    a decision, taken through the `corpus-regen` formula. Failing a push on it would block work
 *    that has nothing to do with the pinned node, on a condition the pusher did not create.
 *    Reported, because it silently invalidates that node's own `--check`; never failed.
 *
 *  - LEGACY-COMMIT DIVERGENCE, by contrast, fails nothing here only because a node that parses the
 *    sibling checkout cannot be fixed by any commit in this repository either -- its rebuild needs
 *    that checkout, which CI does not have. It is the loudest report this gate produces.
 *
 * What DOES fail: a node that carried a valid stamp and whose declared inputs have since moved. That
 * is a change someone made in this repository, to files this repository owns, and the fix is to
 * re-run one named command.
 */
export function fails(r: Report): boolean {
  if (r.node.staleness !== 'inputs') return false
  if (r.node.detection.via === 'legacy-commit') return false
  if (r.verdict === 'unstamped' || r.verdict === 'absent') return false
  return r.verdict === 'stale'
}

/** Reported-but-not-failed, in the order a reader should act on them. */
export const isDebt = (r: Report): boolean =>
  !fails(r) &&
  (r.verdict === 'stale' ||
    r.verdict === 'unstamped' ||
    r.verdict === 'absent' ||
    r.verdict === 'pin-drift')
