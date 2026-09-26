/**
 * stale.ts — `npm run pipeline:stale` and `pipeline:stale:check`: has a declared input moved since
 * a node stamped its output?
 *
 * CHECKS. Every node of `graph.ts` whose detection is `digest` or `legacy-commit`. For a `digest`
 * node it re-folds the declared input groups and the generator source into a digest and compares it
 * with the stamp the node wrote into its own output; for a `legacy-commit` node it compares the
 * sibling checkout's commit with the one the output recorded. It runs no generator and needs no
 * checkout, so a `digest` node whose own `--check` cannot run in CI still sits behind an automated
 * gate: this is the digest gate `CLAUDE.md` § The gate ladder says stands in for it. Which verdicts
 * fail and which are only reported is decided in `assess.ts` (`fails`, `isDebt`); this file
 * renders the report and owns the exit code. A node detected by `regeneration` or `none` is not
 * assessed here, and `--verbose` says why for each.
 *
 * It does not replace a node's own `--check` twin, which regenerates the whole output and diffs it
 * and so catches strictly more than a digest can; that stays the deep gate, run before quoting a
 * number out of the output. This gate is what makes FORGETTING to run it visible. Nor does it queue
 * work: `--queue` is deliberately absent, and the note at the foot of this file says why.
 *
 * THE FAILURE IT EXISTS TO PREVENT. None recorded in this repository yet (2026-09-23). On day one,
 * this is what it would let through if it were wrong: an edit to a declared input, or to an
 * emitter's own source, pushed without a re-run, so that a committed output describes inputs that
 * no longer exist while every tier stays green. `tools/pipeline/example/entries.json` edited
 * without `npm run pipeline:example` is that shape, and this gate is the only one over that node
 * (the INVOCATION paragraph of `example/emit.ts` says so). Wrong the other way, it would fail a
 * push on a condition the pusher did not cause, such as an unstamped output or a sibling checkout
 * pulled past its pin; a push blocked on that is sent with `--no-verify`, which skips every
 * pre-push job and not only this one. The first incident replaces this paragraph.
 *
 * INVOCATION.
 *   npm run pipeline:stale                 the report; exits 0 whatever it finds
 *   npm run pipeline:stale:check           the same report; exits 1 when a gated node is STALE
 *   npm run pipeline:stale -- --verbose    adds the nodes not assessed here, and why for each
 * `--check` and `--verbose` combine. `pipeline:stale:check` is the `pipeline-stale` pre-push job in
 * `lefthook.yml` and a step of `.github/workflows/verify.yml`: one run took 0.08 s wall clock over
 * the record as it stood on 2026-09-23 (`/usr/bin/time -p node tools/pipeline/stale.ts --check`).
 * Its negative tests are `npm run pipeline:selftest`.
 *
 * NEEDS. Nothing outside this repository for a node whose inputs are all committed files. A node
 * with a `checkout` input group, or detected by `legacy-commit`, asks the sibling checkout for its
 * HEAD (`../lib/sibling-root.ts`, where `SIBLING_ROOT` overrides the path); where there is none, as
 * in CI, that node reports SKIPPED and never fails. No token, no network. There is no root override
 * variable because the root is derived from where the file stands (`provenance.ts`): to run it
 * against a fixture, copy the engine under a temp directory and run the copy, as
 * `npm run pipeline:selftest` does.
 */
import { assess, fails, isDebt, type Report, type Verdict } from './assess.ts'
import { NODES } from './graph.ts'

const CHECK = process.argv.includes('--check')
const VERBOSE = process.argv.includes('--verbose')

const SYMBOL: Record<Verdict, string> = {
  current: 'OK      ',
  stale: 'STALE   ',
  unstamped: 'UNSTAMPED',
  absent: 'ABSENT  ',
  unverifiable: 'SKIPPED ',
  'pin-drift': 'PIN-DRIFT',
  'not-applicable': '--      ',
}

const reports = NODES.map((n) => assess(n))
const failing = reports.filter(fails)
const debt = reports.filter(isDebt)

const width = Math.max(...reports.map((r) => r.node.id.length))
const show = VERBOSE ? reports : reports.filter((r) => r.verdict !== 'not-applicable')

console.log(
  "PIPELINE STALENESS -- declared inputs re-folded against the stamp in each node's output\n",
)
for (const r of show) {
  console.log(`  ${SYMBOL[r.verdict]} ${r.node.id.padEnd(width)}  ${r.detail}`)
}
if (!VERBOSE) {
  const hidden = reports.length - show.length
  if (hidden)
    console.log(`\n  (${hidden} node(s) not assessed here -- \`--verbose\` says why for each)`)
}

const fixLines = (r: Report): void => {
  // PIN-DRIFT HAS NO "run this" LINE, deliberately. Printing the node's `regenerate` command beside
  // it would read as an instruction to rebuild from the newer sibling commit, which is a decision
  // and not a repair. Moving a pin is the cycle in `.beads/formulas/corpus-regen.formula.toml`,
  // which carries the change through everything downstream, and its WHAT MUST NOT HAPPEN list is
  // why that is not one command. The choice is a human's.
  if (r.verdict === 'pin-drift') {
    console.log('      to CHECK this node: return the checkout to the pinned commit first.')
    console.log('      to MOVE the pin: bd mol wisp corpus-regen --var reason="<new commit>"')
    return
  }
  console.log(`      run: ${r.node.regenerate}`)
  if (r.node.check) console.log(`      then verify: npm run ${r.node.check}`)
  if (r.node.needsSiblingCheckout) {
    console.log('      NEEDS the sibling ../sibling checkout; cannot be done in CI.')
  }
}

if (debt.length) {
  console.log('\nREPORTED, NOT GATED')
  console.log('-------------------')
  // Said once, up front, because it invalidates the `then verify:` line printed against any node
  // below whose `--check` rebuilds from the sibling checkout. With the checkout ahead of the pin,
  // that `--check` rebuilds from newer source than the output was built from and reports a correct
  // output as stale.
  if (debt.some((r) => r.verdict === 'pin-drift')) {
    console.log(
      '\n  NOTE: the sibling checkout is ahead of the commit an output below was pinned at,\n' +
        '  so any `npm run <node>:check` below that reads it will report STALE whether or\n' +
        '  not the output is. Return the checkout to the pin before trusting one.',
    )
  }
  for (const r of debt) {
    const why =
      r.verdict === 'pin-drift'
        ? 'NOT A DEFECT. The output was built from a pinned sibling commit and the checkout has simply been pulled past it. Returning the checkout to the pin, or rebuilding the output from the newer commit, are both decisions -- neither is a repair.'
        : r.node.staleness === 'grows'
          ? 'ASSET, `grows`: reopens because a run asked for something absent, not because time passed. Worth a bead, not worth failing a push.'
          : r.node.detection.via === 'legacy-commit'
            ? 'The sibling ../sibling checkout has diverged from the pin. No commit in THIS repository caused it and none can fix it: its rebuild needs that checkout, which CI does not have, so it is not a push gate.'
            : 'This artifact predates the provenance stamp, so there is nothing to compare it against. This node becomes gated the first time its emitter runs.'
    console.log(`\n  ${r.node.id} -- ${r.detail}`)
    console.log(`      why not gated: ${why}`)
    fixLines(r)
  }
}

if (failing.length) {
  console.error(`\n${failing.length} node(s) are out of date with their declared inputs:\n`)
  for (const r of failing) {
    console.error(`  ${r.node.id} -- ${r.detail}`)
    console.error(`      run: ${r.node.regenerate}`)
    if (r.node.check) console.error(`      then verify: npm run ${r.node.check}`)
    if (r.node.needsSiblingCheckout) {
      console.error('      NEEDS the sibling ../sibling checkout; this cannot be done in CI.')
    }
  }
  console.error(
    '\nThe digest gate never runs a generator, so it cannot tell you WHAT changed inside the\n' +
      "output -- only that the inputs it was justified against have moved. Run the node's own\n" +
      '`--check` for that.',
  )
  if (CHECK) process.exit(1)
}

const current = reports.filter((r) => r.verdict === 'current').length
console.log(
  `\npipeline: ${current} current, ${failing.length} stale and gated, ${debt.length} reported`,
)

/* ----------------------------------------------------------------------------------------------- *
 * `--queue` IS NOT HERE, AND ITS ABSENCE IS DELIBERATE.
 *
 * Queueing belongs on `post-merge`, never on `pre-push`: a hook that writes to the issue tracker on
 * every push is a hook that gets bypassed, and staleness becomes WORK when a change lands on trunk
 * rather than when somebody is trying to push. It also branches -- an in-repo artifact digest gets
 * per-node beads, but the upstream commit moving gets `bd mol wisp corpus-regen`, because that
 * formula already encodes invariants a generic "regenerate a node" bead would lose.
 *
 * Neither belongs in a file wired into `pre-push`.
 * ----------------------------------------------------------------------------------------------- */
