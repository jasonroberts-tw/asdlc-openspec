/**
 * The scenario trace's one reading, shared by `scripts/render-trace.mjs` and
 * `scripts/render-pr-body.mjs`: the result `.claude/workflows/verify-change-trace.js` returns, the
 * scenarios of a change's delta specs, the one-to-one match each renderer refuses to write without,
 * and the Markdown each writes.
 *
 * THE FAILURE IT EXISTS TO PREVENT. On 2026-09-24 the add-calculator-web-app finalize built its pull
 * request's body with an untracked `.scratch/render-pr-body.mjs`, which found its rows by matching
 * that change's two capability names in the trace's Markdown and counted them against the living
 * spec (`bd show asdlc-openspec-as9`). Both were right only for that change: a capability of another
 * name matches no row, and a change that modifies a capability the living spec already holds has
 * fewer rows than the living spec has scenarios. Here both renderers read the workflow's JSON result
 * and match it to the change's own delta specs, active or archived, so were this module wrong they
 * would write a trace or a body with a scenario missing, one twice, or one no delta spec holds.
 *
 * INVOCATION. Imported, never run. `scripts/workflows.selftest.mjs` runs both renderers' functions on
 * the result of its stubbed run of the workflow, over delta specs it writes under the temporary
 * directory.
 *
 * NEEDS the delta specs under `openspec/changes/<change>/specs/` or, once archived, under
 * `openspec/changes/archive/<date>-<change>/specs/`, and the result as a file. No tool, no network.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

export const WORKFLOW = '.claude/workflows/verify-change-trace.js'
const HOME = '`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced'
const ROW_FIELDS = ['capability', 'requirement', 'scenario', 'proofKind', 'proof', 'exercises', 'result', 'notes', 'readAt', 'kept', 'gap']

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isRecord = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const keyOf = (r) => `${r.capability}\u0000${r.requirement}\u0000${r.scenario}`
const short = (commit) => String(commit).slice(0, 12)

/** Text made safe for one cell of a Markdown table. */
export const cell = (text) => String(text).replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ').trim()

/**
 * The workflow's result, parsed from `text`, or the reason it cannot be rendered. A file holding
 * `{ "result": { ... } }`, as a workflow state file does, is read through to its result.
 */
export function parseResult(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    return { problem: `it is not JSON (${error.message})` }
  }
  const result = isRecord(parsed) && isRecord(parsed.result) && !('rows' in parsed) ? parsed.result : parsed
  if (!isRecord(result)) return { problem: 'it holds no JSON object' }
  for (const key of ['change', 'stopped', 'why']) {
    if (typeof result[key] !== 'string') return { problem: `it has no \`${key}\`, so it is not what ${WORKFLOW} returns` }
  }
  if (result.stopped === 'refused') return { problem: `the workflow refused its arguments and traced nothing: ${result.why}` }
  if (typeof result.commit !== 'string' || !result.commit) return { problem: 'it names no commit, which the trace\'s first line needs' }
  for (const key of ['rows', 'gaps', 'below', 'manual']) {
    if (!Array.isArray(result[key])) return { problem: `its \`${key}\` is not a list` }
  }
  const bad = result.rows.findIndex((r) => !isRecord(r) || ROW_FIELDS.some((f) => !(f in r)))
  if (bad !== -1) return { problem: `rows[${bad}] lacks one of ${ROW_FIELDS.join(', ')}` }
  if (!isRecord(result.design) || typeof result.design.present !== 'boolean' || !Array.isArray(result.design.lenses)) {
    return { problem: 'its `design` is not { present, lenses }' }
  }
  return { result }
}

/**
 * The folder holding the change's delta specs, relative to `root`: the active change's, or once
 * archived, the one archive folder named for it. Or the reason none is found.
 */
export function specsDir(root, change) {
  const active = `openspec/changes/${change}/specs`
  const archive = 'openspec/changes/archive'
  const archived = existsSync(join(root, archive))
    ? readdirSync(join(root, archive))
        .filter((name) => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${change.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(name))
        .sort(byCodePoint)
        .map((name) => `${archive}/${name}/specs`)
    : []
  const found = [active, ...archived].filter((dir) => existsSync(join(root, dir)) && statSync(join(root, dir)).isDirectory())
  if (found.length === 1) return { dir: found[0] }
  if (!found.length) return { problem: `no delta specs for ${change}: neither ${active} nor an archive folder under ${archive}/ named for it` }
  return { problem: `the delta specs of ${change} are in ${found.length} places, ${found.join(' and ')}; one change has one folder` }
}

/** Every `#### Scenario:` of one delta spec's text, under the `### Requirement:` before it. */
export function parseScenarios(text, capability) {
  const found = []
  let requirement = ''
  for (const line of text.split(/\r?\n/)) {
    const req = /^### Requirement:\s*(.+?)\s*$/.exec(line)
    if (req) requirement = req[1]
    const scen = /^#### Scenario:\s*(.+?)\s*$/.exec(line)
    if (scen) found.push({ capability, requirement, scenario: scen[1] })
  }
  return found
}

/** Every scenario of the delta specs under `root`/`dir`, capability by capability in code-point order. */
export function deltaScenarios(root, dir) {
  const capabilities = readdirSync(join(root, dir))
    .filter((name) => existsSync(join(root, dir, name, 'spec.md')))
    .sort(byCodePoint)
  return capabilities.flatMap((capability) => parseScenarios(readFileSync(join(root, dir, capability, 'spec.md'), 'utf8'), capability))
}

/** Why the rows are not one to each scenario, one message per scenario missing, doubled or unknown. */
export function matchProblems(rows, scenarios) {
  const wanted = new Map(scenarios.map((s) => [keyOf(s), s]))
  const seen = new Map()
  for (const r of rows) seen.set(keyOf(r), (seen.get(keyOf(r)) ?? 0) + 1)
  const problems = []
  for (const s of scenarios) {
    const n = seen.get(keyOf(s)) ?? 0
    if (n === 0) problems.push(`no row for ${s.capability} / ${s.requirement} / ${s.scenario}`)
    if (n > 1) problems.push(`${n} rows for ${s.capability} / ${s.requirement} / ${s.scenario}`)
  }
  for (const r of rows) {
    if (!wanted.has(keyOf(r))) problems.push(`a row for ${r.capability} / ${r.requirement} / ${r.scenario}, which no delta spec holds`)
  }
  return [...new Set(problems)]
}

/** The rows in the delta specs' order, which the match has made one to each scenario. */
const inSpecOrder = (rows, scenarios) => {
  const byKey = new Map(rows.map((r) => [keyOf(r), r]))
  return scenarios.map((s) => byKey.get(keyOf(s)))
}

/** `n in cap` for each capability, in code-point order. */
function perCapability(rows) {
  const counts = new Map()
  for (const r of rows) counts.set(r.capability, (counts.get(r.capability) ?? 0) + 1)
  const parts = [...counts.keys()].sort(byCodePoint).map((c) => `${counts.get(c)} in \`${c}\``)
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : parts.join('')
}

const voteLine = (g) =>
  g.outcome === 'measured'
    ? 'measured when the proof ran, so no skeptic judges it'
    : `${g.upheld} upheld, ${g.refuted} refuted and ${g.skeptics - g.upheld - g.refuted} unverified of ${g.skeptics}`
const gapCell = (r) =>
  (r.gap ? `${r.gap.kind}, ${r.gap.outcome ?? 'not judged'}` : '') +
  (r.traced ? `${r.gap ? '; ' : ''}the skeptics' reading, where the tracer read ${r.traced.proofKind}: ${r.traced.proof}, exercises ${r.traced.exercises ? 'yes' : 'no'}` : '')

/** The trace `.claude/skills/change-verify/SKILL.md` § 4 asks for, its first line naming the commit. */
export function renderTrace(result, scenarios, dir) {
  const rows = inSpecOrder(result.rows, scenarios)
  const kept = rows.filter((r) => r.kept).length
  const lines = [
    `# Scenario trace of ${result.change} at ${result.commit}`,
    '',
    `Taken by \`${WORKFLOW}\` on \`${result.branch}\` and written from its result by \`scripts/render-trace.mjs\`, one row for each \`#### Scenario:\` in \`${dir}\`: ${rows.length} in all, ${perCapability(rows)}.` +
      (kept
        ? ` ${kept} row(s) keep their reading from the trace at \`${result.previous}\`, as "Running again" in ${HOME} allows; every proof was run again at \`${short(result.commit)}\`.`
        : ''),
    '',
    `**Verdict: \`${result.stopped}\`.** ${result.why}`,
    '',
    '| Capability | Requirement | Scenario | Proof | Exercises it | Result | Read at | Gap |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${cell(r.capability)} | ${cell(r.requirement)} | ${cell(r.scenario)} | ${cell(`${r.proofKind}: ${r.proof}`)} | ${r.exercises ? 'yes' : 'NO'} | ${cell(r.result)} | \`${short(r.readAt)}\` | ${cell(gapCell(r))} |`,
    ),
    '',
    '## Design decisions',
    '',
  ]
  if (!result.design.present) lines.push('The change has no `design.md`, so no decision was checked.', '')
  for (const l of result.design.lenses) {
    const how = l.kept ? `kept from \`${short(l.readAt)}\`` : l.status === 'read' ? `read at \`${short(l.readAt)}\`` : `${l.status}: ${l.problems.join('; ')}`
    lines.push(`### ${l.label} (\`${l.key}\`), ${how}`, '')
    lines.push(...(l.checked.length ? l.checked.map((c) => `- ${cell(c.decision)}: ${cell(c.verified)}`) : ['Nothing checked.']), '')
  }
  lines.push('## Gaps', '')
  if (!result.gaps.length) lines.push('None reported.', '')
  for (const g of result.gaps) {
    const at = g.kind === 'design' ? `the decision ${cell(g.decision)}` : `${cell(g.capability)} / ${cell(g.scenario)}`
    lines.push(`- **${g.outcome}** (${voteLine(g)}): \`${g.kind}\` at ${at}, \`${cell(g.where)}\`. ${cell(g.title)}`, `  - Evidence: ${cell(g.evidence)}`)
    lines.push(...g.votes.map((v) => `  - ${cell(v)}`))
  }
  if (result.gaps.length) lines.push('')
  lines.push('## Findings below a gap', '')
  lines.push(...(result.below.length ? result.below.map((b) => `- \`${cell(b.where)}\` (${b.source}): ${cell(b.title)}. ${cell(b.evidence)}`) : ['None reported.']), '')
  return lines.join('\n')
}

/**
 * Why a trace cannot go into a pull request's body, one message per reason. Besides the verdict and
 * the gaps, each row is held to what the section claims of it, a proof that exercises its scenario
 * and passed, so no vote and no outcome can make the section contradict its own table.
 */
export function prBodyProblems(result) {
  const problems = []
  if (result.stopped !== 'no-gap') problems.push(`the trace stopped \`${result.stopped}\`, not \`no-gap\`: ${result.why}`)
  const open = result.rows.filter((r) => r.gap && r.gap.outcome !== 'refuted')
  if (open.length) problems.push(`${open.length} row(s) have a gap no majority refuted: ${open.map((r) => r.scenario).join(', ')}`)
  const design = result.gaps.filter((g) => g.kind === 'design' && g.outcome !== 'refuted')
  if (design.length) problems.push(`${design.length} design gap(s) no majority refuted: ${design.map((g) => g.title).join(', ')}`)
  for (const r of result.rows) {
    const where = `${r.capability} / ${r.scenario}`
    const wanted = r.proofKind === 'manual' ? 'recorded' : 'pass'
    if (!PROVED_BY[r.proofKind]) problems.push(`${where} has no proof`)
    else if (r.exercises !== true) problems.push(`${where}: its proof does not exercise it`)
    if (r.result !== wanted) problems.push(`${where}: its result is ${r.result}, not ${wanted}`)
  }
  for (const l of result.design.lenses) {
    if (l.status !== 'read' && l.status !== 'kept') problems.push(`the design lens ${l.key} is ${l.status}, not read or kept`)
  }
  return problems
}

const PROVED_BY = { test: 'a test', 'test+manual': 'a test, and by hand', manual: 'by hand' }

/** The pull request's `## Scenario trace` section, for a trace with no gap. */
export function renderPrSection(result, scenarios) {
  const rows = inSpecOrder(result.rows, scenarios)
  const by = (kind) => rows.filter((r) => r.proofKind === kind).length
  const refuted = result.gaps.filter((g) => g.outcome === 'refuted').length
  const kept = rows.filter((r) => r.kept).length
  const issues = result.manual.map((m) => `\`${m.issue}\``)
  const hand = by('manual') + by('test+manual')
  const sentences = [
    `Traced by \`change-verify\` at \`${short(result.commit)}\`: every one of the ${rows.length} scenarios in the change's delta specs (${perCapability(rows)}) has a proof that exercises it, and every proof that runs passed at that commit.`,
    `${by('test')} are proved by a test, gate or check, ${by('test+manual')} by one and by hand, and ${by('manual')} by hand only${hand && issues.length ? `, as ${issues.join(' and ')} record${issues.length === 1 ? 's' : ''}` : ''}.`,
  ]
  if (refuted) sentences.push(`The skeptics refuted ${refuted} gap(s) a tracer or a design lens reported; the trace lists each with its votes.`)
  const corrected = rows.filter((r) => r.traced).length
  if (corrected) sentences.push(`${corrected} row(s) carry the reading the skeptics established in place of the tracer's.`)
  if (kept) sentences.push(`${kept} row(s) kept their reading from the trace at \`${short(result.previous)}\`, and their proofs were run again.`)
  return [
    '## Scenario trace',
    '',
    sentences.join(' '),
    '',
    '<details><summary>The trace, one row per scenario</summary>',
    '',
    '| Capability | Requirement | Scenario | Proved by | Proof | Result |',
    '|---|---|---|---|---|---|',
    ...rows.map((r) => `| ${cell(r.capability)} | ${cell(r.requirement)} | ${cell(r.scenario)} | ${PROVED_BY[r.proofKind] ?? cell(r.proofKind)} | ${cell(r.proof)} | ${cell(r.result)} |`),
    '',
    '</details>',
    '',
  ].join('\n')
}
