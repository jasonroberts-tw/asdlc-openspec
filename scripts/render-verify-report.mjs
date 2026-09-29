/**
 * Writes a change's verification report, `.scratch/<change>-verify.md`, from the JSON
 * `scripts/fresh-run.mjs` wrote: its first line naming the change and the commit, then the section
 * `scripts/lib/verify-report.mjs` renders, the status of every ID, the gap analysis, the tests and
 * runtime by layer, the thresholds and the verdict. It writes on either verdict, since the report
 * goes on the epic as a note when the change is rejected (`.claude/skills/change-verify/SKILL.md`
 * § 6), and prints the verdict; `scripts/render-pr-body.mjs` puts the same section in the pull
 * request's body, and only on `accept`.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. A report the session writes from a run's output by hand can drop a failing test, a flaky
 * one or an open gap, and a report of another change's run, or of no run at all, reads the same as
 * a real one. It refuses JSON that is not a fresh run's, and one for another change.
 *
 * INVOCATION, from the change's worktree, once `npm run tests:fresh` has written the run:
 *
 *   node scripts/render-verify-report.mjs <change>      reads .scratch/<change>-verify.json and
 *                                                       writes .scratch/<change>-verify.md
 *   node scripts/render-verify-report.mjs <change> --run <file> --out <file>
 *
 * Paths are relative to the checkout; `TRACE_ROOT` names another root, a doctored copy, as for the
 * trace's renderers. It exits 0 when it wrote the report, whatever its verdict, 1 when it refused,
 * naming each reason, and 2 on a usage error. It is not an emitter or a gate: it writes only under
 * `.scratch/`, from a run no commit holds (`CLAUDE.md` § The script suffix contract).
 * `scripts/workflows.selftest.mjs` holds what it writes and what it refuses.
 *
 * NEEDS the run's JSON. No tool, no network.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { renderVerifySection, verifyProblems, verifyReport } from './lib/verify-report.mjs'

const ROOT = process.env.TRACE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')

function usage(message) {
  console.error(`render-verify-report: ${message}\n\nusage: node scripts/render-verify-report.mjs <change> [--run <file>] [--out <file>]`)
  process.exit(2)
}

function refuse(problems) {
  console.error('render-verify-report: refused, and wrote nothing.\n')
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}

let parsed
try {
  parsed = parseArgs({ allowPositionals: true, options: { run: { type: 'string' }, out: { type: 'string' } } })
} catch (error) {
  usage(error.message)
}
const [change, ...extra] = parsed.positionals
if (!change || extra.length) usage('name one change')
const input = parsed.values.run ?? `.scratch/${change}-verify.json`
const output = parsed.values.out ?? `.scratch/${change}-verify.md`

let run
try {
  run = JSON.parse(readFileSync(join(ROOT, input), 'utf8'))
} catch (error) {
  refuse([`${input} could not be read as JSON (${error.message}); run \`npm run tests:fresh -- ${change}\` first`])
}
const problems = verifyProblems(run)
if (problems.length) refuse(problems.map((p) => `${input}: ${p}`))
if (run.change !== change) refuse([`${input} is the run for ${run.change}, not ${change}`])

const report = verifyReport(run)
mkdirSync(dirname(join(ROOT, output)), { recursive: true })
writeFileSync(join(ROOT, output), `# Verification report of ${change} at ${run.commit}\n\n${renderVerifySection(report)}`)
console.log(`render-verify-report: wrote ${output}: verdict ${report.verdict}${report.reasons.length ? `, for ${report.reasons.length} reason(s)` : ''}; ${report.tests} test(s), ${report.scenarios.length} scenario(s), ${report.tasks.length} task(s).`)
