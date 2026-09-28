/**
 * Writes a change's pull-request body with its `## Scenario trace` section: a paragraph that counts
 * the scenarios, by capability and by how each is proved, and the trace condensed to one row per
 * scenario, rendered from the result `.claude/workflows/verify-change-trace.js` returned. It puts
 * the rest of the body, written by the session, before and after the section. It refuses to write
 * when the rows are not one to each scenario of the change's delta specs, when the trace has a gap
 * no majority of its skeptics refuted, when a row's proof is missing, does not exercise its scenario
 * or did not pass, or when a design lens was not read or kept: the section says every scenario is
 * proved, and no verdict may make it contradict its own table.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the add-calculator-web-app finalize built its body
 * with `.scratch/render-pr-body.mjs`, which refused to write when its rows per capability disagreed
 * with the `#### Scenario:` count of each living spec. It found its rows by matching that change's
 * two capability names and counted against the living spec, which holds more scenarios than a change
 * that modifies a capability traces; it was deleted with the change's worktree by
 * `npm run worktree:gc` (`bd show asdlc-openspec-as9`). Were this script wrong, a body could claim
 * every scenario proved while one is missing, doubled or carrying an open gap.
 *
 * INVOCATION, from the change's worktree, before or after the archive:
 *
 *   node scripts/render-pr-body.mjs <change> [--head <file>] [--tail <file>]
 *                                            [--result <file>] [--out <file>]
 *
 * The result defaults to `.scratch/<change>-trace.json` and the body to `.scratch/<change>-pr.md`,
 * the file `.claude/skills/change-finalize/SKILL.md` § 5. Open the pull request names. `--head` and
 * `--tail` hold what goes before and after the section, so a second run rebuilds the whole body; with
 * neither, the body is the section alone. Paths are relative to the checkout; `TRACE_ROOT` names
 * another root, a doctored copy, for a run by hand. It exits 0 when it wrote the body, 1 when it
 * refused, naming each reason, and 2 on a usage error. It is neither an emitter nor a gate, for the
 * reason `scripts/render-trace.mjs` gives; `scripts/workflows.selftest.mjs` holds what it writes and
 * what it refuses, through `scripts/lib/trace.mjs`.
 *
 * NEEDS the result file, the change's delta specs, active or archived, and any head or tail named.
 * No tool, no network.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { deltaScenarios, matchProblems, parseResult, prBodyProblems, renderPrSection, specsDir } from './lib/trace.mjs'

const ROOT = process.env.TRACE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), '..')

function usage(message) {
  console.error(
    `render-pr-body: ${message}\n\nusage: node scripts/render-pr-body.mjs <change> [--head <file>] [--tail <file>] [--result <file>] [--out <file>]`,
  )
  process.exit(2)
}

function refuse(problems) {
  console.error(`render-pr-body: refused, and wrote nothing.\n`)
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}

/** A file's text, or a refusal naming it. */
function read(path, what) {
  try {
    return readFileSync(join(ROOT, path), 'utf8')
  } catch (error) {
    return refuse([`${what} ${path} could not be read (${error.message})`])
  }
}

let parsed
try {
  parsed = parseArgs({
    allowPositionals: true,
    options: { result: { type: 'string' }, out: { type: 'string' }, head: { type: 'string' }, tail: { type: 'string' } },
  })
} catch (error) {
  usage(error.message)
}
const [change, ...extra] = parsed.positionals
if (!change || extra.length) usage('name one change')
const input = parsed.values.result ?? `.scratch/${change}-trace.json`
const output = parsed.values.out ?? `.scratch/${change}-pr.md`

const { result, problem } = parseResult(read(input, 'the result'))
if (problem) refuse([`${input}: ${problem}`])
if (result.change !== change) refuse([`${input} is the result for ${result.change}, not ${change}`])
const specs = specsDir(ROOT, change)
if (specs.problem) refuse([specs.problem])
const scenarios = deltaScenarios(ROOT, specs.dir)
if (!scenarios.length) refuse([`${specs.dir} holds no \`#### Scenario:\` line`])
const problems = [...matchProblems(result.rows, scenarios), ...prBodyProblems(result)]
if (problems.length) refuse(problems)

const head = parsed.values.head === undefined ? '' : read(parsed.values.head, 'the head')
const tail = parsed.values.tail === undefined ? '' : read(parsed.values.tail, 'the tail')
const join2 = (a, b) => (a && !a.endsWith('\n') ? `${a}\n\n${b}` : a ? `${a}\n${b}` : b)
mkdirSync(dirname(join(ROOT, output)), { recursive: true })
writeFileSync(join(ROOT, output), join2(join2(head, renderPrSection(result, scenarios)), tail))
console.log(`render-pr-body: wrote ${output}: the trace of ${result.rows.length} scenario(s) in ${specs.dir}, at ${result.commit}.`)
