/**
 * Self-test for scripts/hooks/gate-summary.mjs, the Stop and SubagentStop hook: its verdict over
 * untracked files, and the checkout it chooses to gate.
 *
 * THE FAILURE IT EXISTS TO PREVENT. The hook printed `gates: PASS` over files it never read: until
 * 2026-09-25 `citations:check` listed tracked files only, so an unstaged file with a broken pointer
 * passed at every stop (asdlc-openspec-hp8). The hook now runs it with `CITATIONS_UNTRACKED=1`. If
 * that setting were dropped from `GATES`, or the gate stopped honouring it, every other gate would
 * stay green; the untracked case below is what turns red, and it asserts the verdict names
 * `citations:check` and the gate's reason, not only that something failed.
 *
 * Two parts, each asserting the REASON:
 *
 *   1. `checkoutOf` over scratch repositories built under the temporary directory: a directory in a
 *      linked worktree of the repository is gated there; one in another repository, one outside any
 *      checkout, and no directory at all fall back to the hook's own checkout.
 *   2. The hook itself, spawned as the harness spawns it, with `CITATIONS_ROOT` pointing its
 *      citations gate at a scratch tree: a clean tree passes (the control), an untracked file with
 *      a broken pointer fails, an ignored one does not, and a SubagentStop payload labels its
 *      verdict. `check:jobs` runs over this checkout in every case, as it does at every stop, so the
 *      control also fails if this checkout's own jobs do.
 *
 *   npm run gate-summary:selftest
 *
 * Needs `git`, and `npm ci` in this checkout; the scratch repositories are its own and removed after.
 * Every GIT_* variable is dropped first: a pre-push hook exports GIT_DIR, which outranks `cwd`, and
 * git would answer for this repository while the case meant a scratch one.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key]
const { checkoutOf } = await import('./_shared.mjs')

const HOOK = join(resolve(dirname(fileURLToPath(import.meta.url))), 'gate-summary.mjs')
const base = realpathSync(mkdtempSync(join(tmpdir(), 'gate-summary-')))
let failures = 0

function check(label, condition, detail) {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    console.log(`  FAIL ${label}${detail ? ` -- ${detail}` : ''}`)
    failures += 1
  }
}

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' })
}

function writeTree(dir, files) {
  for (const [relative, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, relative)), { recursive: true })
    writeFileSync(join(dir, relative), body)
  }
}

/** A repository with one commit, so a worktree can be added to it. */
function repository(name) {
  const dir = join(base, name)
  writeTree(dir, { 'README.md': `# ${name}\n`, 'sub/keep.md': 'kept\n' })
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  git(dir, '-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', 'commit', '-q', '-m', 'init')
  return dir
}

try {
  console.log('checkoutOf: which checkout a stopping agent is gated in')
  const primary = repository('primary')
  const linked = join(base, 'linked')
  git(primary, 'worktree', 'add', '-q', '-b', 'side', linked)
  const other = repository('other')
  const outside = join(base, 'outside')
  mkdirSync(outside)

  for (const [label, cwd, want] of [
    ['control: a directory inside the hook\'s own checkout is gated there', join(primary, 'sub'), primary],
    ['a directory in a linked worktree of the same repository is gated in that worktree', join(linked, 'sub'), linked],
    ['a directory in another repository falls back to the hook\'s own checkout', other, primary],
    ['a directory outside any checkout falls back to the hook\'s own checkout', outside, primary],
    ['no directory at all falls back to the hook\'s own checkout', undefined, primary],
  ]) {
    const got = checkoutOf(cwd, primary)
    check(label, got === want, `got ${got}, wanted ${want}`)
  }

  console.log('the hook: its verdict over tracked, untracked and ignored files')
  // The fixture's paths are assembled, never written out whole: this file is a tracked text file,
  // and a pointer spelled here would be one `citations:check` resolves against this repository. The
  // gate's own selftest escapes that as history (`tools/citations/`); this one does not need to.
  const md = (name) => `docs/${name}.${'md'}`
  const [TARGET, CITER, DRAFT] = [md('target'), md('citer'), md('draft')]
  const TREE = {
    [TARGET]: '# Target\n\n## Alpha\nthe passage a line citation points at\n',
    [CITER]: `# Citer\nThe passage is at \`${TARGET}:4\`, under \`${TARGET}\` § Alpha.\n`,
  }
  const BROKEN = `# Draft\nIts source is \`${TARGET}:40\`.\n`
  const REASON = 'The pointer is past the end of the file.'

  /** Spawn the hook over a scratch citations tree; `untracked` files are written after `git add`. */
  const runHook = (name, { untracked = {}, tracked = {}, payload = '' } = {}) => {
    const dir = join(base, `tree-${name}`)
    writeTree(dir, { ...TREE, ...tracked })
    git(dir, 'init', '-q')
    git(dir, 'add', '-A')
    writeTree(dir, untracked)
    const started = performance.now()
    const r = spawnSync(process.execPath, [HOOK], {
      input: typeof payload === 'function' ? payload(dir) : payload,
      encoding: 'utf8',
      env: { ...process.env, CITATIONS_ROOT: dir },
    })
    wall[name] = (performance.now() - started) / 1000
    try {
      const out = JSON.parse(r.stdout)
      return { code: r.status, verdict: out.systemMessage ?? '', detail: out.additionalContext ?? '' }
    } catch {
      return { code: r.status, verdict: `(unparseable stdout: ${r.stdout.slice(0, 200)})`, detail: r.stderr }
    }
  }
  /** Each hook run's wall time in seconds, printed at the end: the header's measured cost. */
  const wall = {}

  const control = runHook('control')
  check(
    'control: a clean tree passes, and the verdict says untracked files were read',
    control.code === 0 && control.verdict.startsWith('gates: PASS') && control.verdict.includes('with untracked files'),
    `${control.verdict} ${control.detail.slice(0, 300)}`,
  )
  if (!control.verdict.startsWith('gates: PASS')) {
    console.error('selftest: the control does not pass, so no case below can be trusted.')
    process.exit(1)
  }

  const untracked = runHook('untracked', { untracked: { [DRAFT]: BROKEN } })
  check(
    'an untracked file with a broken pointer turns the verdict to FAIL, naming citations:check and why',
    untracked.code === 0 &&
      untracked.verdict.startsWith('gates: FAIL -- citations:check.') &&
      untracked.detail.includes(`${DRAFT}:2`) &&
      untracked.detail.includes(REASON),
    `${untracked.verdict} ${untracked.detail.slice(0, 300)}`,
  )

  const ignored = runHook('ignored', { tracked: { '.gitignore': `${DRAFT}\n` }, untracked: { [DRAFT]: BROKEN } })
  check(
    'the same file, ignored by git, is not read and the verdict stays PASS',
    ignored.verdict.startsWith('gates: PASS'),
    `${ignored.verdict} ${ignored.detail.slice(0, 300)}`,
  )

  // The payload names a `cwd`, as the harness's does, so the run pays for the git calls that place
  // it; the scratch tree is another repository, so the hook falls back to its own checkout.
  const subagent = runHook('subagent', {
    untracked: { [DRAFT]: BROKEN },
    payload: (dir) =>
      JSON.stringify({ hook_event_name: 'SubagentStop', agent_type: 'Explore', stop_hook_active: false, cwd: dir }),
  })
  check(
    'a SubagentStop verdict says it is a subagent\'s, and still reads the untracked file',
    subagent.verdict.startsWith('subagent Explore gates: FAIL -- citations:check.') && subagent.detail.includes(REASON),
    `${subagent.verdict}`,
  )
  console.log(
    `  hook wall time: ${wall.control.toFixed(2)} s with an empty payload (the control), ` +
      `${wall.subagent.toFixed(2)} s with a SubagentStop payload naming a cwd`,
  )
} finally {
  rmSync(base, { recursive: true, force: true })
}

if (failures > 0) {
  console.log(`\n${failures} gate-summary check(s) failed`)
  process.exit(1)
}
console.log('\nall gate-summary checks passed')
