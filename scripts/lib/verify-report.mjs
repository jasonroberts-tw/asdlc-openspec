/**
 * The verification report's one reading, shared by `scripts/render-verify-report.mjs` and
 * `scripts/render-pr-body.mjs`: from the JSON `scripts/fresh-run.mjs` writes, the status of every
 * Scenario, NFR, task and contract-element ID, the gap analysis in `docs/test-strategy.md` § Verify's
 * five categories with the advisory items beside them, the tests and runtime at each layer per
 * component, the thresholds as their gate printed them, and the verdict with every reason for it;
 * and the Markdown both renderers write. It is the home of how each is derived; the skill that runs
 * it, `.claude/skills/change-verify/SKILL.md`, points here.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. A report assembled by hand from a run's output can call a change verified while a test
 * failed, an obligation is unmet, or a test failed and then passed, which the strategy counts as
 * failing (`docs/decisions.md` § D-13, item 12), and a figure computed over a handful of tests reads
 * as a rate it is not. So the verdict is computed here, from every reason at once, and the two
 * renderers write from one model: a field of the run read in only one of them would let the pull
 * request's body and the epic's note disagree, which `scripts/workflows.selftest.mjs` holds by
 * running both on one stubbed run.
 *
 * WHAT IT DERIVES.
 *
 *   - A test's status is the run's, but a test that failed and then passed its one re-run is `flaky`,
 *     and one that failed twice, or has not been re-run yet, is `fail`: both count as failing.
 *   - A test blocks unless the record sorts it `retire` (a test on an ID the change removes, which
 *     Finalize retires) or it is a fitness test every fitness record of whose NFRs is `advisory`.
 *   - A scenario's status: `to retire` when the change removes it; else `fail` or `flaky` when one of
 *     its tests is; else `no test` for an obligation the record finds unmet and the baseline does not
 *     waive, `waived (baseline)` for one it waives, and `pass`. An NFR's: its tests' and fitness
 *     records', or `no coverage`. A task's: its tests', with the paths under `apps/` its commits
 *     changed (rule 4). A contract operation's: its contract tests', or `no contract test`.
 *   - The gaps. 1: each unmet happy-path or negative obligation, from the record, a waived one listed
 *     apart. 2: each NFR no test cites and no fitness record lists. 3 and 4: the trace gate's `rule 5`
 *     and `rule 6` refusals. 5: each flaky test. The gate's other refusals are listed after them and
 *     block too. Advisory, never blocking: each negative test declared not applicable, each advisory
 *     fitness test that failed, and each component with more E2E tests than functional ones
 *     (`docs/test-strategy.md` § Measuring the shape).
 *   - The verdict is `reject` for any failing blocking test, any gap not waived, any other refusal of
 *     the trace gate or a trace not checked, a Commands' mutation run that did not pass, and any
 *     problem the run reports; otherwise `accept`.
 *
 * ITS FIGURES ARE COUNTS. It computes no rate: a proportion over a change's handful of tests would
 * read as a measurement it is not (`CLAUDE.md` § Stateful counts live in `count-index.md`, under a
 * key, its reporting honesty). The only rates in the report are the thresholds gate's own lines,
 * which give one only at or above `thresholdMinSamples` in `tools/policy.json`, and are quoted as it
 * printed them.
 *
 * INVOCATION. Imported, never run: `verifyProblems(run)` says why a run cannot be reported,
 * `verifyReport(run)` builds the model, and `renderVerifySection(report)` writes the Markdown.
 *
 * NEEDS the run's JSON. No tool, no network.
 */

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const short = (commit) => String(commit).slice(0, 12)
const key = (file, name) => `${file}\u0000${name}`

/** Text made safe for one cell of a Markdown table. */
const cell = (text) => String(text).replaceAll('\\', '\\\\').replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ').trim()

const RUN_FIELDS = ['change', 'commit', 'base', 'environment', 'node', 'platform', 'install', 'tasks', 'tests', 'specs', 'contracts', 'taskPaths', 'baseline', 'trace', 'thresholds', 'fitness', 'problems']
const TEST_FIELDS = ['file', 'name', 'layer', 'ids', 'partition', 'component', 'status', 'durationMs', 'rerun']

/** Why `run` is not what `scripts/fresh-run.mjs` writes, one message per reason; empty when it is. */
export function verifyProblems(run) {
  if (run === null || typeof run !== 'object' || Array.isArray(run)) return ['it holds no JSON object']
  const missing = RUN_FIELDS.filter((f) => !(f in run))
  if (missing.length) return [`it has no ${missing.map((f) => `\`${f}\``).join(', ')}, so it is not what scripts/fresh-run.mjs writes`]
  const problems = []
  for (const f of ['tasks', 'tests', 'specs', 'contracts', 'taskPaths', 'baseline', 'fitness', 'problems']) if (!Array.isArray(run[f])) problems.push(`its \`${f}\` is not a list`)
  if (!problems.length) {
    const bad = run.tests.findIndex((t) => TEST_FIELDS.some((f) => !(f in t)))
    if (bad !== -1) problems.push(`tests[${bad}] lacks one of ${TEST_FIELDS.join(', ')}`)
  }
  return problems
}

/** A test's status with its re-run read: `flaky` for a fail then a pass. */
export function statusOf(test) {
  if (test.status !== 'fail') return test.status
  return test.rerun && test.rerun.status === 'pass' ? 'flaky' : 'fail'
}

const failing = (status) => status === 'fail' || status === 'flaky'

/** The status of a set of tests: the worst of theirs, `fail` over `flaky` over `pass`, or null for none. */
function worst(statuses) {
  if (!statuses.length) return null
  if (statuses.includes('fail')) return 'fail'
  if (statuses.includes('flaky')) return 'flaky'
  if (statuses.every((s) => s === 'skip' || s === 'todo')) return 'skipped'
  return 'pass'
}

/** The verification report's model; see the header for how each part is derived. */
export function verifyReport(run) {
  const byTest = new Map(run.tests.map((t) => [key(t.file, t.name), { ...t, effective: statusOf(t) }]))
  const tests = [...byTest.values()]
  const baseline = new Set(run.baseline)
  const fitnessOf = (id) => run.fitness.filter((f) => Array.isArray(f.nfrIds) && f.nfrIds.includes(id))
  const advisoryFitness = (t) => t.layer === 'fitness' && t.ids.length > 0 && t.ids.every((id) => fitnessOf(id).length > 0 && fitnessOf(id).every((f) => f.failureSemantics === 'advisory'))
  const blocks = (t) => t.partition !== 'retire' && !advisoryFitness(t)
  const listed = (refs) => refs.map((r) => byTest.get(key(r.file, r.name)) ?? { ...r, layer: null, effective: 'not run' })

  const scenarios = []
  const nfrs = []
  const gaps = { coverage: [], waived: [], nfrs: [], elements: [], contracts: [], flaky: [], other: [] }
  for (const spec of [...run.specs].sort((a, b) => byCodePoint(a.id, b.id))) {
    if (spec.kind === 'nfr') {
      const cite = listed(spec.tests.cite ?? [])
      const records = fitnessOf(spec.id).map((f) => f.file)
      const status = worst(cite.map((t) => t.effective)) ?? (records.length ? 'fitness record, no test' : 'no coverage')
      if (!cite.length && !records.length) gaps.nfrs.push(`${spec.id} (${spec.capability}, "${spec.title}"): no test cites it and no fitness record lists it (rule 2)`)
      nfrs.push({ id: spec.id, capability: spec.capability, title: spec.title, source: spec.state, tests: cite, fitness: records, status })
      continue
    }
    const happy = listed(spec.tests.happy ?? [])
    const negative = listed(spec.tests.negative ?? [])
    const unmet = []
    for (const role of ['happy', 'negative']) {
      if (spec.obligation?.[role] !== 'unmet') continue
      const entry = `${spec.id}:${role}`
      const waived = baseline.has(entry) && spec.state !== 'added' && spec.state !== 'modified'
      const text = `${entry} (${spec.capability}, "${spec.title}"): no ${role === 'happy' ? 'happy-path' : 'negative'} test at a layer that counts`
      if (waived) gaps.waived.push(entry)
      else gaps.coverage.push(text)
      unmet.push(waived ? 'waived' : 'unmet')
    }
    let status = worst([...happy, ...negative].map((t) => t.effective))
    if (spec.state === 'removed') status = 'to retire'
    else if (!failing(status)) {
      if (unmet.includes('unmet')) status = 'no test'
      else if (unmet.includes('waived')) status = 'waived (baseline)'
      else if (status === null) status = spec.obligation?.happy === 'exempt' ? 'exempt' : 'no test'
    }
    const declared = spec.obligation?.negative === 'declared'
    scenarios.push({ id: spec.id, capability: spec.capability, title: spec.title, source: spec.state, happy, negative, declared, status })
  }

  const tasks = run.tasks.map((id) => {
    const cited = tests.filter((t) => t.ids.includes(id))
    const paths = run.taskPaths.find((t) => t.id === id)?.paths ?? []
    return { id, paths, tests: cited, status: worst(cited.map((t) => t.effective)) ?? 'no test' }
  })
  const contracts = run.contracts.map((op) => {
    const cited = listed(op.tests ?? [])
    return { file: op.file, operation: op.operation, tests: cited, status: worst(cited.map((t) => t.effective)) ?? 'no contract test' }
  })

  if (run.trace.error) gaps.other.push(`the trace gate was not checked: ${run.trace.error}`)
  for (const failure of run.trace.failures ?? []) {
    if (failure.startsWith('rule 5:')) gaps.elements.push(failure)
    else if (failure.startsWith('rule 6:')) gaps.contracts.push(failure)
    else if (!failure.startsWith('obligation:')) gaps.other.push(failure)
  }
  for (const t of tests.filter((x) => x.effective === 'flaky')) gaps.flaky.push(`${t.file}: "${t.name}" failed, then passed when run once more (${t.rerun.command})`)

  const advisory = [...(run.trace.advisories ?? [])]
  for (const t of tests.filter((x) => advisoryFitness(x) && failing(x.effective))) advisory.push(`${t.file}: "${t.name}", an advisory fitness test, ${t.effective === 'flaky' ? 'is flaky' : 'failed'}`)
  const components = [...new Set(tests.map((t) => t.component ?? '(outside apps/)'))].sort(byCodePoint)
  const layers = []
  for (const component of components) {
    const mine = tests.filter((t) => (t.component ?? '(outside apps/)') === component)
    const count = (layer) => mine.filter((t) => t.layer === layer).length
    if (count('e2e') > count('functional')) advisory.push(`the component ${component} has ${count('e2e')} E2E test(s) and ${count('functional')} functional one(s): an inverted pyramid (docs/test-strategy.md § Measuring the shape)`)
    for (const layer of [...new Set(mine.map((t) => t.layer ?? '(none)'))].sort(byCodePoint)) {
      const here = mine.filter((t) => (t.layer ?? '(none)') === layer)
      layers.push({ component, layer, tests: here.length, ms: Math.round(here.reduce((sum, t) => sum + (t.durationMs ?? 0), 0)) })
    }
  }

  const reasons = []
  const blocking = tests.filter((t) => blocks(t) && t.effective === 'fail')
  for (const t of blocking) reasons.push(`${t.file}: "${t.name}" fails${t.rerun ? ', and failed again when run once more' : ', and has not been run once more yet'}`)
  const count = (list, what) => list.length && reasons.push(`${list.length} ${what}`)
  count(gaps.coverage, 'unmet obligation(s) of a happy-path or negative test the baseline does not waive (gap 1)')
  count(gaps.nfrs, 'NFR(s) without coverage (gap 2)')
  count(gaps.elements, 'implementation element(s) resolving to no task (gap 3)')
  count(gaps.contracts, 'contract element(s) without a contract test (gap 4)')
  count(gaps.flaky, 'flaky test(s), which count as failing (gap 5)')
  count(gaps.other, 'other refusal(s) of the trace gate')
  if (!run.thresholds.skipped && run.thresholds.status !== 0) reasons.push(`\`${run.thresholds.script}\` exited ${run.thresholds.status}`)
  for (const p of run.problems) reasons.push(`the run: ${p}`)

  const partitions = {}
  for (const t of tests) partitions[t.partition] = (partitions[t.partition] ?? 0) + 1
  return {
    change: run.change,
    commit: run.commit,
    base: run.base,
    header: { environment: run.environment, node: run.node, platform: run.platform, install: run.install },
    verdict: reasons.length ? 'reject' : 'accept',
    reasons,
    scenarios,
    nfrs,
    tasks,
    contracts,
    gaps,
    advisory,
    layers,
    partitions,
    tests: tests.length,
    thresholds: run.thresholds,
  }
}

/* --------------------------------------------------------------------------------- Markdown ---- */

const testCell = (list) => (list.length ? list.map((t) => `${cell(t.name)} (${t.layer ?? '?'}, ${t.effective})`).join('; ') : '')
const tally = (rows) => {
  const counts = new Map()
  for (const r of rows) counts.set(r.status, (counts.get(r.status) ?? 0) + 1)
  return [...counts.keys()].sort(byCodePoint).map((s) => `${counts.get(s)} ${s}`).join(', ') || 'none'
}
const list = (items, none = 'None.') => (items.length ? items.map((i) => `- ${cell(i)}`) : [none])

/** The `## Verification report` section, for the pull request's body and the epic's note alike. */
export function renderVerifySection(report) {
  const h = report.header
  const lines = [
    '## Verification report',
    '',
    `Run by \`scripts/fresh-run.mjs\` at \`${short(report.commit)}\`, on \`origin/main\` at \`${short(report.base)}\`: ${h.environment}, on Node ${h.node}, ${h.platform}; \`${h.install.command}\` took ${h.install.ms} ms. ${report.tests} test(s) ran: ${Object.keys(report.partitions).sort(byCodePoint).map((p) => `${report.partitions[p]} ${p}`).join(', ') || 'none'}. Every figure here is a count; a rate appears only where the thresholds gate printed one.`,
    '',
    report.verdict === 'accept' ? '**Verdict: `accept`.** No test failed, no gap is open and every gate the run holds passed.' : `**Verdict: \`reject\`**, for ${report.reasons.length} reason(s):`,
    '',
  ]
  if (report.verdict === 'reject') lines.push(...report.reasons.map((r) => `- ${cell(r)}`), '')
  lines.push('### Status by ID', '')
  lines.push(`<details><summary>Scenarios: ${report.scenarios.length} (${tally(report.scenarios)})</summary>`, '', '| ID | Capability | Source | Happy-path tests | Negative tests | Status |', '|---|---|---|---|---|---|')
  for (const s of report.scenarios) lines.push(`| ${s.id} | ${cell(s.capability)} | ${s.source} | ${testCell(s.happy)} | ${s.declared ? 'declared not applicable' : testCell(s.negative)} | ${s.status} |`)
  lines.push('', '</details>', '')
  lines.push(`NFRs: ${report.nfrs.length} (${tally(report.nfrs)}).`, '')
  if (report.nfrs.length) {
    lines.push('| ID | Capability | Source | Tests | Fitness records | Status |', '|---|---|---|---|---|---|')
    for (const n of report.nfrs) lines.push(`| ${n.id} | ${cell(n.capability)} | ${n.source} | ${testCell(n.tests)} | ${n.fitness.map(cell).join('; ')} | ${n.status} |`)
    lines.push('')
  }
  lines.push(`Tasks: ${report.tasks.length} (${tally(report.tasks)}).`, '')
  if (report.tasks.length) {
    lines.push('| Task | Paths under apps/ its commits changed (rule 4) | Tests | Status |', '|---|---|---|---|')
    for (const t of report.tasks) lines.push(`| ${t.id} | ${t.paths.length ? t.paths.map(cell).join('; ') : 'none'} | ${testCell(t.tests)} | ${t.status} |`)
    lines.push('')
  }
  lines.push(`Contract elements: ${report.contracts.length} (${tally(report.contracts)}).`, '')
  if (report.contracts.length) {
    lines.push('| File | Operation | Contract tests | Status |', '|---|---|---|---|')
    for (const c of report.contracts) lines.push(`| ${cell(c.file)} | ${cell(c.operation)} | ${testCell(c.tests)} | ${c.status} |`)
    lines.push('')
  }
  const g = report.gaps
  lines.push('### Gap analysis', '')
  lines.push('1. Scenarios missing a happy-path or negative test:', '', ...list(g.coverage), '')
  if (g.waived.length) lines.push(`Waived by the baseline, which may fall and never rise: ${g.waived.length} (${g.waived.join(', ')}).`, '')
  lines.push('2. NFRs without coverage:', '', ...list(g.nfrs), '')
  lines.push('3. Implementation elements not resolving to a task:', '', ...list(g.elements), '')
  lines.push('4. Contract elements without contract tests:', '', ...list(g.contracts), '')
  lines.push('5. Flaky tests:', '', ...list(g.flaky), '')
  if (g.other.length) lines.push("The trace gate's other refusals, which block too:", '', ...list(g.other), '')
  lines.push('Advisory, never blocking:', '', ...list(report.advisory), '')
  lines.push('### Tests and runtime by layer, per component', '', '| Component | Layer | Tests | Runtime (ms) |', '|---|---|---|---|')
  lines.push(...report.layers.map((l) => `| ${cell(l.component)} | ${cell(l.layer)} | ${l.tests} | ${l.ms} |`), '')
  lines.push('### Thresholds', '')
  if (report.thresholds.skipped) lines.push(`\`${report.thresholds.script}\` did not run: ${report.thresholds.skipped}.`, '')
  else lines.push(`\`${report.thresholds.script}\` exited ${report.thresholds.status}, and printed:`, '', '```text', report.thresholds.output, '```', '')
  return lines.join('\n')
}
