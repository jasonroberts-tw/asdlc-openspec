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
 * AND A HOOK THAT IGNORED THE CHECKOUT IT WAS GIVEN. On 2026-09-25 the review of pull request 40
 * found that a hook which ran its gates in its own checkout, ignoring `checkoutOf`, passed every case
 * the first two parts held, while `README.md` said this test held the hook to a linked worktree; and
 * that the verdict said "with untracked files" over a checkout whose gate predates the setting
 * (asdlc-openspec-wdt). Part 3 is what turns red for either.
 *
 * Three parts, each asserting the REASON:
 *
 *   1. `checkoutOf` over scratch repositories built under the temporary directory: a directory in a
 *      linked worktree of the repository is gated there; one in another repository, one outside any
 *      checkout, and no directory at all fall back to the hook's own checkout.
 *   2. The hook itself, spawned as the harness spawns it, with `CITATIONS_ROOT` pointing its
 *      citations gate at a scratch tree: a clean tree passes (the control), an untracked file with
 *      a broken pointer fails, an ignored one does not, and a SubagentStop payload labels its
 *      verdict. `check:jobs` runs over this checkout in every case, as it does at every stop, so the
 *      control also fails if this checkout's own jobs do.
 *   3. A copy of the hook and `_shared.mjs` in a scratch repository with stub gates that print where
 *      they ran, as a session inside a worktree runs the primary checkout's copy: a `cwd` in the
 *      copy's own checkout passes (the control); a `cwd` in a linked worktree, whose committed
 *      citations stub ignores `CITATIONS_UNTRACKED`, passes there with a verdict naming the worktree
 *      and saying tracked files only; and a stub that fails there fails the verdict there.
 *
 *   npm run gate-summary:selftest
 *
 * Needs `git`, and `npm ci` in this checkout; the scratch repositories are its own and removed after.
 * Every GIT_* variable is dropped first: a pre-push hook exports GIT_DIR, which outranks `cwd`, and
 * git would answer for this repository while the case meant a scratch one.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
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

function commit(dir, ...args) {
  git(dir, '-c', 'user.name=selftest', '-c', 'user.email=selftest@example.invalid', 'commit', '-q', ...args)
}

/** A repository with one commit of `files`, so a worktree can be added to it. */
function repository(name, files = { 'README.md': `# ${name}\n`, 'sub/keep.md': 'kept\n' }) {
  const dir = join(base, name)
  writeTree(dir, files)
  git(dir, 'init', '-q')
  git(dir, 'add', '-A')
  commit(dir, '-m', 'init')
  return dir
}

/** Each hook run's wall time in seconds, printed at the end: the header's measured cost. */
const wall = {}

/** Spawn `hook` as the harness spawns it, with `payload` on stdin; its exit code, verdict and detail. */
function spawnHook(name, hook, payload, env = {}) {
  const started = performance.now()
  const r = spawnSync(process.execPath, [hook], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } })
  wall[name] = (performance.now() - started) / 1000
  try {
    const out = JSON.parse(r.stdout)
    return { code: r.status, verdict: out.systemMessage ?? '', detail: out.additionalContext ?? '' }
  } catch {
    return { code: r.status, verdict: `(unparseable stdout: ${r.stdout.slice(0, 200)})`, detail: r.stderr }
  }
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
    return spawnHook(name, HOOK, typeof payload === 'function' ? payload(dir) : payload, { CITATIONS_ROOT: dir })
  }

  const control = runHook('control')
  check(
    'control: a clean tree passes, and the verdict says untracked files were read',
    control.code === 0 && control.verdict.startsWith('gates: PASS') && control.verdict.includes('with untracked files'),
    `${control.verdict} ${control.detail.slice(0, 300)}`,
  )
  if (!control.verdict.startsWith('gates: PASS')) {
    // Thrown, never `process.exit`, which would skip the `finally` that removes the scratch trees.
    throw new Error('selftest: the control does not pass, so no case below can be trusted.')
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

  console.log('a copy of the hook in a checkout of its own: which checkout it gates, and what it says it read')
  // The stubs stand in for the gated checkout's own copy of each gate. The line the honouring stub
  // prints is the one `tools/citations/check.ts` prints; part 2's control holds the hook to the real
  // gate's line, so a change to either side fails there.
  const stubGate = (honoursUntracked) =>
    [
      "import { existsSync, realpathSync } from 'node:fs'",
      'const gate = process.argv[2]',
      'console.log(`${gate} ran in ${realpathSync(process.cwd())}`)',
      honoursUntracked
        ? "if (gate === 'citations:check' && process.env.CITATIONS_UNTRACKED === '1') console.log('untracked files read too (CITATIONS_UNTRACKED=1): 0')"
        : '// Cut before CITATIONS_UNTRACKED: it reads tracked files only and says nothing of untracked ones.',
      "process.exit(existsSync('stub-fails') ? 1 : 0)",
      '',
    ].join('\n')
  const scripts = { 'check:jobs': 'node stub-gate.mjs check:jobs', 'citations:check': 'node stub-gate.mjs citations:check' }
  const home = repository('hook-home', {
    'scripts/hooks/gate-summary.mjs': readFileSync(HOOK, 'utf8'),
    'scripts/hooks/_shared.mjs': readFileSync(join(dirname(HOOK), '_shared.mjs'), 'utf8'),
    'package.json': `${JSON.stringify({ private: true, scripts }, null, 2)}\n`,
    'stub-gate.mjs': stubGate(true),
    'sub/keep.md': 'kept\n',
  })
  const side = join(base, 'hook-side')
  git(home, 'worktree', 'add', '-q', '-b', 'side', side)
  writeTree(side, { 'stub-gate.mjs': stubGate(false) })
  commit(side, '-a', '-m', 'a citations gate cut before CITATIONS_UNTRACKED')
  const copy = join(home, 'scripts/hooks/gate-summary.mjs')
  const stopIn = (cwd) => JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: false, cwd })

  const own = spawnHook('copy-control', copy, stopIn(join(home, 'sub')))
  check(
    "control: a cwd in the copy's own checkout is gated there, and the verdict says untracked files were read",
    own.code === 0 && own.verdict === 'gates: PASS (check:jobs, citations:check with untracked files)',
    `${own.verdict} ${own.detail.slice(0, 300)}`,
  )
  if (own.verdict.startsWith('gates: PASS')) {
    const older = spawnHook('copy-worktree', copy, stopIn(join(side, 'sub')))
    check(
      "a cwd in a linked worktree is gated there, and the verdict names what that worktree's own gate read",
      older.code === 0 &&
        older.verdict.startsWith(`gates: PASS in ${side} (check:jobs, citations:check over tracked files only`) &&
        !older.verdict.includes('with untracked files'),
      `${older.verdict} ${older.detail.slice(0, 300)}`,
    )

    writeTree(side, { 'stub-fails': '' })
    const failing = spawnHook('copy-failing', copy, stopIn(join(side, 'sub')))
    check(
      'a gate that fails in the linked worktree fails the verdict there, and its output says it ran there',
      failing.code === 0 &&
        failing.verdict.startsWith(`gates: FAIL in ${side} -- check:jobs, citations:check.`) &&
        failing.detail.includes(`check:jobs ran in ${side}`) &&
        failing.detail.includes(`citations:check ran in ${side}`),
      `${failing.verdict} ${failing.detail.slice(0, 300)}`,
    )
  } else {
    console.log('  (the copy\'s control does not pass, so its other cases are not run: none could be trusted)')
  }
} finally {
  rmSync(base, { recursive: true, force: true })
}

if (failures > 0) {
  console.log(`\n${failures} gate-summary check(s) failed`)
  process.exit(1)
}
console.log('\nall gate-summary checks passed')
