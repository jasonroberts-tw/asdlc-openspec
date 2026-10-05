/**
 * Writes a change's scenario trace, `.scratch/<change>-trace.md`, from the result
 * `.claude/workflows/verify-change-trace.js` returned: one row per `#### Scenario:` in the change's
 * delta specs, in their order, then the design decisions checked, every gap with its skeptics'
 * votes, and every finding below a gap; and, under its verdict, whether the clause check of
 * `scripts/judge-trace-clauses.mjs` ran, as the workflow's clause run records it, and how many rows it
 * sent the skeptics as an `unasserted` gap. Its first line names the commit the trace was taken at,
 * which "Running again" in `.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced reads.
 * It refuses to write a trace whose rows are not one to each scenario of the delta specs.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the add-calculator-web-app verify wrote its trace
 * with `.scratch/render-trace.mjs`, which spelled that change's name, its date and its two
 * capabilities, printed no design decision, and wrote whatever rows it was given; `npm run worktree:gc`
 * deleted it with the change's worktree, so the next change would have written it again from nothing
 * (`bd show asdlc-openspec-as9`). Were this script wrong, a trace could miss a scenario, or carry one
 * twice, and still read as complete, and a run again would not know which commit to diff against.
 *
 * INVOCATION, from the change's worktree, once the session has saved the workflow's result:
 *
 *   node scripts/render-trace.mjs <change>                  reads .scratch/<change>-trace.json and
 *                                                           writes .scratch/<change>-trace.md
 *   node scripts/render-trace.mjs <change> --result <file> --out <file>
 *
 * Paths are relative to the checkout; `TRACE_ROOT` names another root, a doctored copy, for a run by
 * hand. It exits 0 when it wrote the trace, 1 when it refused, naming each reason, and 2 on a usage
 * error. It is not an emitter, whose output lives under `artifacts/` and is committed, and not a
 * gate: it writes only under `.scratch/`, from a result no commit holds, so it has no `:check` twin
 * (`CLAUDE.md` § The script suffix contract). `scripts/workflows.selftest.mjs` holds what it writes
 * and what it refuses, through `scripts/lib/trace.mjs`.
 *
 * NEEDS the result file and the change's delta specs, active or archived. No tool, no network.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { deltaScenarios, matchProblems, parseResult, renderTrace, specsDir } from './lib/trace.mjs'

const ROOT = process.env.TRACE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')

function usage(message) {
  console.error(`render-trace: ${message}\n\nusage: node scripts/render-trace.mjs <change> [--result <file>] [--out <file>]`)
  process.exit(2)
}

function refuse(problems) {
  console.error(`render-trace: refused, and wrote nothing.\n`)
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}

let parsed
try {
  parsed = parseArgs({ allowPositionals: true, options: { result: { type: 'string' }, out: { type: 'string' } } })
} catch (error) {
  usage(error.message)
}
const [change, ...extra] = parsed.positionals
if (!change || extra.length) usage('name one change')
const input = parsed.values.result ?? `.scratch/${change}-trace.json`
const output = parsed.values.out ?? `.scratch/${change}-trace.md`

let text
try {
  text = readFileSync(join(ROOT, input), 'utf8')
} catch (error) {
  refuse([`${input} could not be read (${error.message}); save the workflow's result there first`])
}
const { result, problem } = parseResult(text)
if (problem) refuse([`${input}: ${problem}`])
if (result.change !== change) refuse([`${input} is the result for ${result.change}, not ${change}`])
const specs = specsDir(ROOT, change)
if (specs.problem) refuse([specs.problem])
const scenarios = deltaScenarios(ROOT, specs.dir)
if (!scenarios.length) refuse([`${specs.dir} holds no \`#### Scenario:\` line`])
const mismatched = matchProblems(result.rows, scenarios)
if (mismatched.length) refuse([...mismatched, `the workflow stopped \`${result.stopped}\`: ${result.why}`])

mkdirSync(dirname(join(ROOT, output)), { recursive: true })
writeFileSync(join(ROOT, output), renderTrace(result, scenarios, specs.dir))
const open = result.gaps.filter((g) => g.outcome !== 'refuted').length
console.log(`render-trace: wrote ${output}: ${result.rows.length} row(s) for the ${scenarios.length} scenario(s) of ${specs.dir}; stopped ${result.stopped}; ${result.gaps.length} gap(s), ${open} not refuted.`)
