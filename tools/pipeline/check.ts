/**
 * `npm run pipeline:check` -- does `tools/pipeline/graph.ts` still describe this repository?
 *
 * CHECKS. The record's shape (no node declared twice, no edge to an unknown node, no cycle over the
 * blocking edges), that every input, output and generator glob matches a file, that every `prompt`
 * and every `package.json` script a node names exists, that a `regeneration` node's gate runs where
 * it says, that no file edge goes undeclared, that every node id appears in `docs/pipeline.md`, and
 * that the tracker's formula agrees with the record (`formulas.ts`). The manifest is a
 * hand-maintained record of a graph that moves, and every other consumer of it -- the staleness
 * gate, the prose page, the formula -- is only as good as the record.
 *
 * THE FAILURE IT EXISTS TO PREVENT. None recorded in this repository yet (2026-09-23). On day one,
 * this is what it would let through if it were wrong: an input group whose glob matches nothing,
 * which folds to a constant digest and reports CURRENT forever, so that the staleness gate stays
 * green over a node whose input was renamed out from under it. That is the quiet failure, and it is
 * why an input glob matching zero files is an ERROR here rather than a warning. Behind it come the
 * louder ones: a file edge nobody declared, which lets a change cascade through the staleness gate
 * without one line of output, and a node that says a gate covers it when no tier runs that gate.
 * The first incident replaces this paragraph.
 *
 * INVOCATION.
 *   npm run pipeline:check
 * No flags. It is the `pipeline-check` pre-push job in `lefthook.yml` and a step of
 * `.github/workflows/verify.yml`: one run took 0.08 s wall clock over the record as it stood on
 * 2026-09-23 (`/usr/bin/time -p node tools/pipeline/check.ts`). Its negative tests are
 * `npm run pipeline:selftest`.
 *
 * NEEDS. Nothing outside this repository: it runs no generator and needs no `../sibling` checkout.
 * There is no root override variable because the root is derived from where the file stands
 * (`provenance.ts`): to run it against a fixture, copy the engine under a temp directory and run
 * the copy, as `npm run pipeline:selftest` does.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkFormulas } from './formulas.ts'
import { filesMatching } from './glob.ts'
import { NODES, edges, type PipelineNode } from './graph.ts'
import { ROOT } from './provenance.ts'

const problems: string[] = []
const notes: string[] = []
const formulaNotes: string[] = []

const fail = (node: string, msg: string): void => void problems.push(`${node}: ${msg}`)

const scripts = (
  JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
    scripts: Record<string, string>
  }
).scripts

const ids = new Set(NODES.map((n) => n.id))

/* ----------------------------------------------------------------------------------------------- *
 * Shape
 * ----------------------------------------------------------------------------------------------- */

const seen = new Set<string>()
for (const n of NODES) {
  if (seen.has(n.id)) fail(n.id, 'declared twice')
  seen.add(n.id)
}

for (const n of NODES) {
  for (const d of [...n.dependsOn, ...(n.advisoryOn ?? [])]) {
    if (!ids.has(d)) fail(n.id, `depends on "${d}", which is not a node`)
    if (d === n.id) fail(n.id, 'depends on itself')
  }

  // TWO CHECKS STOOD HERE until the node kind they belonged to was retired with its last member.
  // Each asserted something about that kind's own exception field, and with the kind, its one
  // special value and the field all gone, the type system refuses what they asserted. This note
  // stands where they stood, by the retirement rule in the record's own header.

  // A digest-stamped node must stamp one of its OWN outputs. Stamping something else would put the
  // record of what a node was built from in a file some other node overwrites.
  if (n.detection.via === 'digest' || n.detection.via === 'legacy-commit') {
    const stamped = n.detection.stamp.path
    const covered = n.outputs.some((g) => filesMatching(ROOT, [g]).includes(stamped))
    if (!covered) fail(n.id, `stamps ${stamped}, which none of its declared outputs matches`)
  }
  if (n.detection.via === 'digest' && !n.inputs.length) {
    fail(n.id, 'is digest-stamped but declares no inputs, so its digest is a constant')
  }
  if (n.detection.via === 'digest' && !n.generator.length) {
    fail(n.id, 'is digest-stamped but declares no generator source, so a code change is invisible')
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * Cycles -- over BLOCKING edges only
 *
 * Advisory edges are excluded because a real one can BE a cycle by construction: a node that
 * reconciles its own labels against a table derived from its output reads the node it feeds.
 * Folding those in would make this check permanently red and teach everyone to ignore it.
 * ----------------------------------------------------------------------------------------------- */

{
  const state = new Map<string, 'visiting' | 'done'>()
  const stack: string[] = []
  const visit = (id: string): void => {
    if (state.get(id) === 'done') return
    if (state.get(id) === 'visiting') {
      const from = stack.indexOf(id)
      problems.push(`cycle: ${[...stack.slice(from), id].join(' -> ')}`)
      return
    }
    state.set(id, 'visiting')
    stack.push(id)
    for (const d of NODES.find((n) => n.id === id)?.dependsOn ?? []) if (ids.has(d)) visit(d)
    stack.pop()
    state.set(id, 'done')
  }
  for (const n of NODES) visit(n.id)
}

/* ----------------------------------------------------------------------------------------------- *
 * Globs resolve to something
 * ----------------------------------------------------------------------------------------------- */

/*
 * NO GLOB IS EXEMPT FROM THE EMPTY-MATCH RULE, and this note records that the one exemption there
 * used to be was removed rather than lost.
 *
 * It covered a node whose output could not exist until a per-item lifecycle had admitted work: for
 * that one kind, a glob matching nothing was a fact about position rather than a dead citation, and
 * it was reported as a NOTE. The kind is retired and every path the exemption named is gone, so
 * the header's rule holds for every node without exception: an input, output or
 * generator glob that matches no file is an ERROR here, because the only thing it can now be is a
 * citation nothing reported.
 */

function checkGlobs(n: PipelineNode, what: string, globs: readonly string[]): void {
  for (const g of globs) {
    if (filesMatching(ROOT, [g]).length) continue
    fail(n.id, `${what} glob matches no file: ${g}`)
  }
}

for (const n of NODES) {
  for (const group of n.inputs) {
    if (group.kind === 'checkout') continue
    if (group.mayBeEmpty) continue
    if (!filesMatching(ROOT, group.globs).length) {
      fail(n.id, `input group "${group.name}" matches no file (globs: ${group.globs.join(', ')})`)
    }
  }
  checkGlobs(n, 'output', n.outputs)
  checkGlobs(n, 'generator', n.generator)
}

/* ----------------------------------------------------------------------------------------------- *
 * Every node's `prompt` names a file that is there
 *
 * This was the graph's least-checked claim and it stayed that way for a while: the manifest/prose
 * check below asserts that every node id APPEARS in `docs/pipeline.md` and never opened
 * `prompt` at all, so the field could name a file that had been retired, moved or never existed and
 * nothing said so.
 *
 * It cost something, and the instance is historical twice over -- the node it happened to is gone.
 * One node's `prompt` named a document that successive decisions had retired around a single
 * surviving paragraph, and which carried no heading of that node’s name at all, so every
 * reference to a section of it resolved to nothing. The live part was moved and the remainder
 * retired; had this check existed, the retirement would have failed
 * a gate here instead of being found by an audit.
 *
 * Existence is the floor, deliberately. It cannot tell that a prompt still DESCRIBES its node -- only
 * that a reader following the pointer arrives at a file. That is the failure that actually happens: a
 * prompt is retired or moved on one side and the manifest is not updated on the other.
 *
 * `prompt` is repository-relative, not root-relative-with-a-directory-convention. Every live node's
 * now sits at the repository root -- `S-BASELINE`'s was the one exception, under `artifacts/`, and it
 * left with the node -- but joining against ROOT is what keeps both spellings one check, so a future
 * prompt that belongs beside its evidence rather than at the root needs no change here.
 * ----------------------------------------------------------------------------------------------- */

for (const n of NODES) {
  if (n.prompt === null) continue
  if (!existsSync(join(ROOT, n.prompt))) {
    fail(
      n.id,
      `names prompt "${n.prompt}", which does not exist. A retired or moved prompt leaves this` +
        ' field pointing at nothing, and a reader who follows it concludes the node is undocumented' +
        ' rather than that the record is wrong. Repoint it, or set `prompt: null` with a comment.',
    )
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * npm scripts exist
 * ----------------------------------------------------------------------------------------------- */

for (const n of NODES) {
  if (n.regenerateScript && !(n.regenerateScript in scripts)) {
    fail(n.id, `regenerateScript "${n.regenerateScript}" is not in package.json`)
  }
  if (n.check && !(n.check in scripts)) {
    fail(n.id, `check "${n.check}" is not in package.json`)
  }
  if (n.detection.via === 'regeneration' && !(n.detection.script in scripts)) {
    fail(n.id, `detection script "${n.detection.script}" is not in package.json`)
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * A `regeneration` node's `where` is verified against the hooks, not taken on trust
 *
 * `detection: { via: 'regeneration' }` is how a node opts OUT of the digest gate, on the grounds that
 * a stronger whole-output check already runs somewhere binding. When that claim is false the node has
 * no gate at all, AND `pipeline:stale` prints a reassuring "covered by `npm run X`" line about it --
 * which is worse than claiming nothing, because it reads as a green answer to a question nobody
 * asked. Existing in `package.json` is not the same as running; this asserts the second.
 * ----------------------------------------------------------------------------------------------- */

{
  const lefthook = readFileSync(join(ROOT, 'lefthook.yml'), 'utf8')
  const ci = readFileSync(join(ROOT, '.github/workflows/verify.yml'), 'utf8')
  // Anchored on `run: npm run <script>` -- or `run: node --run <script>`, the pre-push hook's
  // launcher -- so that a mention inside a comment -- of which these two files
  // have many, several naming scripts they deliberately do NOT run -- is not counted.
  const runs = (haystack: string, script: string): boolean =>
    new RegExp(
      `\\brun:\\s*(?:npm run|node --run) ${script.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\s|$|")`,
      'm',
    ).test(haystack)

  for (const n of NODES) {
    if (n.detection.via !== 'regeneration') continue
    const { script, where } = n.detection
    const inCi = runs(ci, script)
    const inHook = runs(lefthook, script)
    const actual = inCi && inHook ? 'CI + pre-push' : inCi ? 'CI' : inHook ? 'pre-push' : 'nowhere'
    if (actual === 'nowhere') {
      fail(
        n.id,
        `claims its staleness is covered by \`npm run ${script}\`, but that script runs in neither` +
          ' lefthook.yml nor verify.yml. Either wire it up, or change detection to `none` with the' +
          ' gap written down -- a node must not report itself covered by a gate nobody runs.',
      )
    } else if (actual !== where) {
      fail(n.id, `declares \`${script}\` runs in "${where}"; it actually runs in "${actual}"`)
    }
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * Edges cross-examined against the file sets
 *
 * A declared edge A -> B should be visible in the files: something A emits should be something B
 * reads. This cannot be an ERROR in both directions, and the asymmetry is the point.
 *
 *  - A declared edge with NO file-level justification is reported, not failed. Real edges are not
 *    always file edges: one node can depend on another through a glob they both share, and a
 *    retired node's dependence was a schema keeping up with components rather than a file it
 *    opened.
 *  - An UNDECLARED file edge -- B digests a file A emits, and B does not name A -- IS an error. That
 *    is the manifest failing to describe a dependency the digest gate will otherwise cascade
 *    through silently, and it is the direction that produces a wrong `bd ready` frontier.
 * ----------------------------------------------------------------------------------------------- */

{
  const emits = new Map<string, Set<string>>()
  for (const n of NODES) emits.set(n.id, new Set(filesMatching(ROOT, n.outputs)))

  const declared = new Set(edges().map((e) => `${e.from}->${e.to}`))

  for (const n of NODES) {
    const reads = new Set(
      n.inputs.flatMap((g) => (g.kind === 'checkout' ? [] : filesMatching(ROOT, g.globs))),
    )
    if (!reads.size) continue
    for (const other of NODES) {
      if (other.id === n.id) continue
      const overlap = [...(emits.get(other.id) as Set<string>)].filter((f) => reads.has(f))
      if (!overlap.length) continue
      if (!declared.has(`${other.id}->${n.id}`)) {
        fail(
          n.id,
          `digests ${overlap.length} file(s) emitted by ${other.id} (e.g. ${overlap[0]}) but does` +
            ` not declare it in dependsOn or advisoryOn`,
        )
      }
    }
  }

  for (const e of edges()) {
    if (e.advisory) continue
    const to = NODES.find((n) => n.id === e.to) as PipelineNode
    if (!to.inputs.length) continue
    const reads = new Set(
      to.inputs.flatMap((g) => (g.kind === 'checkout' ? [] : filesMatching(ROOT, g.globs))),
    )
    const overlap = [...(emits.get(e.from) ?? new Set<string>())].filter((f) => reads.has(f))
    if (!overlap.length) notes.push(`${e.from} -> ${e.to} is declared but is not a file edge`)
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * The manifest against the prose
 *
 * The risk this record carries is that it is one more copy of the graph to keep in sync: the
 * header of `graph.ts` calls the prose page "a second copy", and says the real fix is to GENERATE
 * the page's mermaid block and per-node lines from this record. Until an emitter does, this is the
 * floor: every node id here must appear in `docs/pipeline.md`, and every node id drawn in that
 * file's mermaid block must exist here. It cannot catch a wrong EDGE, but it does catch the failure
 * that actually happens to two hand-kept copies -- a node added or renamed on one side and
 * forgotten on the other.
 * ----------------------------------------------------------------------------------------------- */

{
  const prompts = readFileSync(join(ROOT, 'docs/pipeline.md'), 'utf8')
  for (const n of NODES) {
    // NO EXEMPTION STANDS HERE. There were two, both sub-nodes named in the prose by their own
    // command rather than by an id, so an id search failed on a node the page did describe. Both
    // are retired, so every node id is searched for exactly as written.
    if (!prompts.includes(n.id)) {
      fail(n.id, 'is not mentioned anywhere in docs/pipeline.md')
    }
  }

  const mermaid = prompts.slice(
    prompts.indexOf('```mermaid'),
    prompts.indexOf('```', prompts.indexOf('```mermaid') + 3),
  )
  // Node labels look like `CO["C-ONE<br/>what it emits"]` or `AT["A-TWO"]`. Some drawn labels put
  // prose straight after the id (`AT["A-TWO bind"]`) and are not matched; the count is deliberately
  // not stated here, because it moves whenever a node is added or retired, and a stale numeral in
  // a comment is worse than none. This is a floor, not a parser, and generating
  // the block outright replaces it.
  for (const [, drawn] of mermaid.matchAll(/\["([A-Z]-[A-Z-]+?)(?:<|")/g)) {
    if (!ids.has(drawn as string)) {
      problems.push(`mermaid: draws "${drawn}", which is not a node in tools/pipeline/graph.ts`)
    }
  }
}

/* ----------------------------------------------------------------------------------------------- *
 * The manifest against the `bd` formula
 *
 * The prose check above closes the loop with `docs/pipeline.md`. This one closes it with
 * `.beads/formulas/corpus-regen.formula.toml`: the header of `formulas.ts` calls a formula "one
 * more copy of the graph".
 *
 * The assertions, why each is a failure or a note, and the things deliberately NOT asserted are all
 * documented in `tools/pipeline/formulas.ts`. It lives in its own module for two reasons: this file
 * is long enough, and `pipeline:selftest` needs the logic importable so it can run it against a
 * fixture that reintroduces the drift -- an assertion nothing has ever watched fail is an assertion
 * on trust. The resolver of every declared gate, the absence of one at the lane's entry, the lane's
 * connectedness and the cascade's coverage of every node downstream of the root are FAILURES; a prose citation of a retired script is the one note.
 * ----------------------------------------------------------------------------------------------- */

{
  const formula = checkFormulas(ROOT, scripts)
  problems.push(...formula.problems)
  formulaNotes.push(...formula.notes)
}

/* ----------------------------------------------------------------------------------------------- *
 * Report
 * ----------------------------------------------------------------------------------------------- */

console.log(`pipeline:check -- ${NODES.length} nodes, ${edges().length} edges\n`)

if (notes.length) {
  console.log('Declared edges with no file-level justification (expected for non-file edges):')
  for (const n of notes) console.log(`  - ${n}`)
  console.log()
}

if (formulaNotes.length) {
  console.log('Formula observations (reported, not failed -- see tools/pipeline/formulas.ts):')
  for (const n of formulaNotes) console.log(`  - ${n}`)
  console.log()
}

if (problems.length) {
  console.error(`${problems.length} manifest problem(s):\n`)
  for (const p of problems) console.error(`  ${p}`)
  console.error('\ntools/pipeline/graph.ts no longer describes this repository. Fix the record.')
  process.exit(1)
}

console.log('The manifest matches the repository.')
