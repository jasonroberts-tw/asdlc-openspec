/**
 * The fast local version of the emitted-output checks, for a git pre-commit hook.
 *
 *   node scripts/assert-not-hand-edited.mjs <staged files...>
 *
 * It fails when a staged file is owned by a generator AND no longer matches what that generator
 * produces. The message names the input and the emitter, so the next move is a redirect rather than
 * a guess.
 *
 * WHY BOTH THIS AND CI. The `*:check` scripts are the authority and run in CI. They answer "do the
 * committed build products match their generators", which is the right question at merge time and
 * the wrong one at the moment of the mistake: by then the edit is one of several in the diff and the
 * failure names a file, not a reason. This runs on the staged paths only, at commit time, and answers
 * "you changed a build product, here is where the change belongs".
 *
 * ONE VERIFIER PER GENERATOR, CHOSEN BY PATH. An earlier version ran one generator's `:check` no
 * matter what was staged and exited 0 when it passed. That gate only ever compared its own output
 * tree, so a hand edit to any OTHER build product was detected as suspect and then silently cleared
 * by a check that had never looked at it. Verifiers are now selected by the path that made the file
 * suspect, and a suspect nothing can verify is REPORTED as unverified rather than waved through.
 */
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import {
  ROOT,
  bannerCheckApplies,
  generatedFileRedirect,
  hasGeneratedBanner,
  header,
  toRepoRel,
} from './hooks/_shared.mjs'

const staged = process.argv.slice(2).filter((a) => a !== '')
if (staged.length === 0) process.exit(0)

/** Staged paths that some generator owns. */
const suspect = []
for (const arg of staged) {
  const rel = toRepoRel(arg)
  if (rel === null) continue
  const owned =
    generatedFileRedirect(rel) !== null ||
    (bannerCheckApplies(rel) && hasGeneratedBanner(header(resolve(ROOT, rel))))
  if (owned) suspect.push(rel)
}

if (suspect.length === 0) process.exit(0)

/**
 * Which npm script actually re-derives which build product.
 *
 * `names` pulls the offending paths out of a failing check's output when it prints them, so the
 * message can point at the file rather than at the whole corpus. It is optional: a verifier that
 * names nothing falls back to the staged suspects it claimed.
 *
 * kit 1.5-4 · ADAPT: one row per emitter of yours whose output is committed, in the same change as
 * the emitter, and out with it: a verifier over a file nothing writes is a row that can never fire.
 * The kit's one row left with the learning loop. Delete this line when done.
 */
const VERIFIERS = [
  // Empty. Its one row was the learning loop's `outcomes:check`, over `artifacts/outcomes/`, and
  // left with the loop (`docs/decisions.md` § D-06).
]

/**
 * Only NOW pay for a generator, and only for the ones whose output is actually staged. About two
 * seconds each, which is fine once a commit touches a build product and would not be fine on every
 * commit.
 */
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
function run(script) {
  // Windows needs a shell: since the CVE-2024-27980 fix Node refuses to spawn a .cmd without one.
  // `script` is always a literal from VERIFIERS above, never anything a staged path supplied.
  return process.platform === 'win32'
    ? spawnSync(`${npm} run --silent ${script}`, {
        cwd: ROOT,
        encoding: 'utf8',
        shell: true,
        windowsHide: true,
      })
    : spawnSync(npm, ['run', '--silent', script], { cwd: ROOT, encoding: 'utf8' })
}

const failures = []
const claimed = new Set()

for (const verifier of VERIFIERS) {
  const mine = suspect.filter((rel) => verifier.owns(rel))
  if (mine.length === 0) continue
  for (const rel of mine) claimed.add(rel)

  const check = run(verifier.script)
  if (check.status === 0) continue
  const out = `${check.stdout ?? ''}${check.stderr ?? ''}`
  const named = verifier.names?.(out) ?? []
  failures.push({ script: verifier.script, out, paths: named.length > 0 ? named : mine })
}

/**
 * A build product this table cannot re-derive on its own. Saying nothing would repeat the bug
 * described in the header; failing would break a legitimate regenerate-and-commit of an artifact no
 * verifier here owns. So it is a note, and CI remains the authority.
 */
const unverified = suspect.filter((rel) => !claimed.has(rel))

if (failures.length === 0) {
  if (unverified.length > 0) {
    console.error('note: staged build products this hook cannot re-derive locally:\n')
    for (const rel of unverified) console.error(`  ${rel}`)
    console.error(
      '\nIf you edited one by hand, the change belongs in its generator. CI will catch it.',
    )
  }
  // Everything a verifier could check matches what its generator produces -- which is exactly what a
  // legitimate regenerate-and-commit looks like. Nothing to fail on.
  process.exit(0)
}

console.error('A staged file is a build product and no longer matches its generator.\n')
for (const { paths } of failures) {
  for (const rel of paths) {
    const why = generatedFileRedirect(rel)
    console.error(why ?? `${rel} is generator output and has been changed by hand.`)
    console.error('')
  }
}
for (const { script, out, paths } of failures) {
  if (paths.some((rel) => generatedFileRedirect(rel) !== null)) continue
  console.error(`\`npm run ${script}\` failed. Its full output:\n`)
  console.error(out)
}
console.error('To commit anyway (you almost never want to): LEFTHOOK=0 git commit')
process.exit(1)
