/**
 * PostToolUse hook. After a write to anything an EMITTER reads, re-check that the committed output
 * still matches what that emitter produces.
 *
 * THE DEFECT THIS PREVENTS: editing an input and forgetting to re-run the emitter. The committed
 * output and its source then disagree, and nothing says so until CI -- by which point several more
 * changes are layered on top and the drift is no longer attributable to the edit that caused it.
 *
 * The failure mode is a property of emitted output, not of any one generator: the hook outlived
 * the generator that was the first example of it, and every emitter that has been retired since took
 * its trigger rows with it in the same change. What is here is the same defect against the emitters
 * the kit laid down.
 *
 * Only fires for the inputs listed in `TRIGGERS`. A write to a README or a story file cannot change
 * emitted output, and paying two seconds to prove that on every edit is how a hook gets turned off.
 *
 * Exit 2 surfaces the drift to the agent as feedback. The tool call has already run, so this blocks
 * nothing -- it just makes the consequence visible at the moment it is created.
 */
import { npmRun, readHookInput, editTarget, toRepoRel } from './_shared.mjs'

/**
 * Paths whose contents an emitter reads, paired with the gates worth re-running.
 *
 * kit 1.5-6 · ADAPT: one row per input of an emitter of yours, and one for the emitter itself: a
 * change to the emitter changes every file it emits, so an emitter edit not followed by a re-run is
 * the same defect as an input edit not followed by one. The rows below cover the emitters the kit
 * laid down. Delete this line when done.
 */
const TRIGGERS = [
  // The two hand-authored inputs of the learning loop: the policy record carrying the loop's
  // constants, and the one schema the record's writer and every reader share. An edit to either
  // changes what `npm run outcomes` accepts or derives, and `outcomes:check` is the gate that says so.
  {
    re: { test: (rel) => rel === 'tools/outcomes/policy.json' || rel === 'tools/outcomes/run-outcome.schema.json' },
    gates: ['outcomes:check'],
  },
]

/** What to do about each gate's failure, appended to the report. */
const HINTS = {
  'outcomes:check':
    'Run `npm run outcomes` and commit the regenerated tree under artifacts/outcomes/ alongside this change.',
}

const input = await readHookInput()
if (input === null) process.exit(0)

const rel = toRepoRel(editTarget(input).filePath)
if (rel === null) process.exit(0)

const gates = TRIGGERS.find((t) => t.re.test(rel))?.gates
if (gates === undefined) process.exit(0)

// Concurrently: the gates are independent, and serialising them doubles the wall clock of a hook that
// fires on every edit to a watched input.
const results = await Promise.all(gates.map(async (g) => ({ gate: g, ...(await npmRun(g)) })))
const failed = results.filter((r) => r.code !== 0)

if (failed.length === 0) process.exit(0)

process.stderr.write(
  [
    `${rel} changed and the emitter gates now fail. Fix this before moving on.`,
    '',
    ...failed.flatMap((f) => [`--- npm run ${f.gate} (exit ${f.code}) ---`, f.out, '']),
    ...failed.map((f) => HINTS[f.gate] ?? 'The emitter output no longer matches its inputs.'),
    '',
  ].join('\n'),
)
process.exit(2)
