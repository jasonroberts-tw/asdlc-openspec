/**
 * Self-test for scripts/hooks/gate-summary.mjs, the Stop and SubagentStop hook: its verdict over
 * untracked files, and the checkout it chooses to gate. Also for the checkout
 * scripts/hooks/block-generated-edit.mjs, the PreToolUse hook on Write and Edit, places an edit in.
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
 * AND A GATE RUN FROM THE WRONG MANIFEST. The hook launches each gate through `runTask`, which reads
 * the gated checkout's own manifest: were it to pick `npm` or `mise` by anything else, every stop
 * would report FAIL while the primary checkout and a worktree sit on either side of the move to mise
 * (asdlc-openspec-8juz.6); and were it to launch a task that manifest lacks, mise would run the
 * definition of the checkout above it, against the wrong tree (asdlc-openspec-8juz.1, question 1).
 * Part 4 is what turns red for either.
 *
 * AND A GENERATED FILE EDITED IN A WORKTREE. Until 2026-10-03 the edit hook judged every path against
 * its own checkout, the primary one for a session in a worktree, so an edit to generated output in a
 * linked worktree passed while the same edit in the primary checkout was refused
 * (asdlc-openspec-d2qv). Part 5 is what turns red for that, and for a fix that placed the edit by the
 * payload's `cwd`, which would pass a worktree session's edit to the primary checkout's output. Its
 * two `GIT_DIR` cases turn red for a fix that ran git with the hook's inherited `GIT_*` variables,
 * which a branch review found placing the primary checkout's trace record in its own directory.
 *
 * Five parts, each asserting the REASON:
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
 *   4. `taskLaunch` and `runTask` over scratch checkouts: one with a `package.json` alone runs a task
 *      with `npm run --silent` (the control), one with a `tasks.toml` with `mise run --quiet`, each
 *      run for real; and a task its own manifest lacks is refused before any launcher starts, in a
 *      worktree whose enclosing checkout defines it and in a `package.json` checkout alike, as is
 *      every task of a checkout with neither manifest.
 *   5. A copy of the edit hook and `_shared.mjs` in a scratch repository with two linked worktrees,
 *      one where the worktree script makes one and one outside the checkout: each path of this
 *      checkout the redirect table assigns, and a file whose header carries a banner, refused in the
 *      primary checkout (the controls), then refused in a worktree with the same reason, through a
 *      symbolic link too; a new file claiming a banner refused in a directory the worktree lacks; a
 *      primary-checkout file refused for a session whose `cwd` is a worktree; the same refusal with
 *      `GIT_DIR`, and with `GIT_WORK_TREE` beside it, in the hook's environment; and an unbannered
 *      file, a document, and a path in another repository or in no checkout, each passed.
 *
 *   mise run gate-summary:selftest
 *
 * Needs `git`, `mise` (`docs/decisions.md` § D-31), and `npm ci` in this checkout; the scratch
 * repositories are its own and removed after.
 * Every GIT_* variable is dropped first: a pre-push hook exports GIT_DIR, which outranks `cwd`, and
 * git would answer for this repository while the case meant a scratch one.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { taskFiles } from '../lib/tasks.mjs'

for (const key of Object.keys(process.env)) if (key.startsWith('GIT_')) delete process.env[key]
const { checkoutOf, generatedFileRedirect, runTask, taskLaunch } = await import('./_shared.mjs')

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
    'scripts/lib/tasks.mjs': readFileSync(join(dirname(HOOK), '../lib/tasks.mjs'), 'utf8'),
    ...taskFiles('package.json', scripts, { private: true }),
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

  console.log("runTask: the launcher each checkout's own manifest calls for, and a task it lacks refused")
  const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  // This node by its path, since a bare `node` may be mise's shim, which pins no version in a scratch
  // directory; and a string, since console.log colours a number when FORCE_COLOR is set.
  const probe = `"${process.execPath}" -e "console.log('ran')"`
  const npmSide = join(base, 'tasks-npm')
  writeTree(npmSide, taskFiles('package.json', { 'probe:here': probe }, { private: true }))
  const miseSide = join(base, 'tasks-mise')
  writeTree(miseSide, {
    ...taskFiles('tasks.toml', { 'probe:here': probe }, { private: true }),
    'mise.toml': '[task_config]\nincludes = ["tasks.toml"]\n',
  })
  // A worktree inside a checkout that defines a task its own manifest does not: what mise would borrow.
  const inner = join(miseSide, '.claude/worktrees/inner')
  writeTree(inner, taskFiles('tasks.toml', { 'probe:other': probe }, { private: true }))

  const ran = await runTask('probe:here', { cwd: npmSide })
  check(
    'control: a checkout with no tasks.toml runs the task with npm, returning its output and the line it ran',
    ran.code === 0 && ran.out === 'ran' && ran.command === 'npm run probe:here',
    JSON.stringify(ran),
  )
  const viaNpm = await taskLaunch('probe:here', npmSide)
  check(
    'a checkout with no tasks.toml launches `npm run --silent <task>`',
    viaNpm.command === NPM && viaNpm.args.join(' ') === 'run --silent probe:here',
    JSON.stringify(viaNpm),
  )
  const viaMise = await taskLaunch('probe:here', miseSide)
  check(
    'a checkout with a tasks.toml launches `mise run --quiet <task>`',
    viaMise.command === 'mise' && viaMise.args.join(' ') === 'run --quiet probe:here' && viaMise.label === 'mise run probe:here',
    JSON.stringify(viaMise),
  )
  // A scratch directory shares no trust, so the run is given it, as a fresh clone's would be.
  const ranMise = await runTask('probe:here', { cwd: miseSide, env: { MISE_TRUSTED_CONFIG_PATHS: miseSide } })
  check(
    'a checkout with a tasks.toml runs the task through mise, returning its output and the line it ran',
    ranMise.code === 0 && ranMise.out === 'ran' && ranMise.command === 'mise run probe:here',
    JSON.stringify(ranMise),
  )
  const borrowed = await runTask('probe:here', { cwd: inner })
  check(
    "a task the worktree's own tasks.toml lacks is refused unrun, though the checkout around it defines it",
    borrowed.code === 127 &&
      borrowed.command === 'probe:here' &&
      borrowed.out.startsWith(`\`probe:here\` is not a task in ${inner}'s own tasks.toml, so it was not run`),
    JSON.stringify(borrowed),
  )
  const absent = await runTask('probe:absent', { cwd: npmSide })
  check(
    "a task a package.json checkout's scripts lack is refused unrun too",
    absent.code === 127 && absent.out.startsWith(`\`probe:absent\` is not a task in ${npmSide}'s own package.json, so it was not run`),
    JSON.stringify(absent),
  )
  const bare = join(base, 'tasks-none')
  writeTree(bare, { 'README.md': 'no manifest\n' })
  const none = await runTask('probe:here', { cwd: bare })
  check(
    'a checkout with neither manifest is refused unrun, naming both',
    none.code === 127 && none.out === `${bare} has neither tasks.toml nor package.json, so it defines no task \`probe:here\`.`,
    JSON.stringify(none),
  )

  console.log('block-generated-edit: an edit to generated output, refused in a linked worktree as in the primary checkout')
  // The generated paths are every path this checkout tracks that the redirect table assigns, asked of
  // the table as `tools/harness/harness.ts` asks it, so a row added there is held here unedited.
  const REPO = resolve(dirname(HOOK), '../..')
  const GENERATED = execFileSync('git', ['ls-files', '-z'], { cwd: REPO, encoding: 'utf8' })
    .split('\0')
    .filter((rel) => rel !== '' && generatedFileRedirect(rel) !== null)
  check('the redirect table assigns at least one path this checkout tracks', GENERATED.length > 0, 'it assigns none')
  // A banner's two halves are kept off one line of this file, as `hasGeneratedBanner` reads a line.
  const namesATool = '// GENERATED by tools/gen/gen.ts'
  const forbidsTheEdit = 'DO NOT EDIT BY HAND'
  const BANNER = `${namesATool} -- ${forbidsTheEdit}\n`
  const [BANNERED, PLAIN, FRESH] = ['gen/out.json', 'gen/plain.json', 'gen/fresh/new.json']
  const EDIT_HOOK = join(dirname(HOOK), 'block-generated-edit.mjs')
  // A copy of the hook in a scratch repository with a worktree where the worktree script makes one and
  // one outside it, as a session that has entered a worktree runs the primary checkout's copy.
  const editHome = repository('edit-home', {
    'scripts/hooks/block-generated-edit.mjs': readFileSync(EDIT_HOOK, 'utf8'),
    'scripts/hooks/_shared.mjs': readFileSync(join(dirname(HOOK), '_shared.mjs'), 'utf8'),
    ...Object.fromEntries(GENERATED.map((rel) => [rel, 'generated\n'])),
    [BANNERED]: `${BANNER}{}\n`,
    [PLAIN]: '{}\n',
    'sub/keep.md': 'kept\n',
  })
  const inside = join(editHome, '.claude', 'worktrees', 'side')
  git(editHome, 'worktree', 'add', '-q', '-b', 'edit-side', inside)
  const away = join(base, 'edit-away')
  git(editHome, 'worktree', 'add', '-q', '-b', 'edit-away', away)
  const via = join(base, 'edit-link')
  symlinkSync(inside, via, 'junction')
  const editCopy = join(editHome, 'scripts/hooks/block-generated-edit.mjs')
  const editIn = (filePath, extra = {}) =>
    JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Edit', tool_input: { file_path: filePath, old_string: 'a', new_string: 'b' }, ...extra })
  const writeIn = (filePath, content) =>
    JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'Write', tool_input: { file_path: filePath, content } })
  /** Spawn the copy as the harness spawns it, `env` added: its exit code and the reason it gives on stderr. */
  const edit = (name, payload, env = {}) => {
    const started = performance.now()
    const r = spawnSync(process.execPath, [editCopy], { input: payload, encoding: 'utf8', env: { ...process.env, ...env } })
    wall[name] = (performance.now() - started) / 1000
    return { code: r.status, why: r.stderr }
  }
  const refusedAs = (got, want) => got.code === 2 && want.code === 2 && got.why === want.why

  const primaryRows = GENERATED.map((rel) => [rel, edit(`edit-primary ${rel}`, editIn(join(editHome, rel)))])
  const bannered = edit('edit-primary banner', editIn(join(editHome, BANNERED)))
  for (const [rel, got] of primaryRows) {
    check(
      `control: ${rel} in the primary checkout is refused with its redirect`,
      got.code === 2 && got.why.startsWith(`${rel} is GENERATED `) && got.why.includes('Edit instead: '),
      `exit ${got.code}: ${got.why}`,
    )
  }
  check(
    'control: a file in the primary checkout whose header carries a banner is refused by the catch-all',
    bannered.code === 2 && bannered.why.startsWith(`${BANNERED} carries a generator's`),
    `exit ${bannered.code}: ${bannered.why}`,
  )
  if (primaryRows.every(([rel, got]) => got.code === 2 && got.why.startsWith(`${rel} is GENERATED `)) && bannered.code === 2) {
    for (const [rel, own] of primaryRows) {
      const got = edit(`edit-inside ${rel}`, editIn(join(inside, rel)))
      check(`${rel} in a linked worktree under .claude/worktrees/ is refused with the same redirect`, refusedAs(got, own), `exit ${got.code}: ${got.why}`)
    }
    const [first, firstOwn] = primaryRows[0]
    const awayRow = edit('edit-away', editIn(join(away, first)))
    check(`${first} in a linked worktree outside the primary checkout is refused with the same redirect`, refusedAs(awayRow, firstOwn), `exit ${awayRow.code}: ${awayRow.why}`)
    const linked = edit('edit-link', editIn(join(via, first)))
    check(`${first} reached through a symbolic link to the worktree is refused with the same redirect`, refusedAs(linked, firstOwn), `exit ${linked.code}: ${linked.why}`)
    const fromSide = edit('edit-cwd', editIn(join(editHome, first), { cwd: inside }))
    check(
      `${first} in the primary checkout, edited by a session whose cwd is a worktree, is refused there`,
      refusedAs(fromSide, firstOwn),
      `exit ${fromSide.code}: ${fromSide.why}`,
    )
    // A hook inherits its session's environment. With `GIT_DIR` and no `GIT_WORK_TREE`, git takes its
    // `cwd` for the top of the work tree, so an edit would be placed in its own directory; with both
    // naming the primary checkout, an edit in a worktree would be placed under the primary one.
    // Either way no redirect matches, unless the hook runs git with no `GIT_*` variable.
    const gitDir = join(editHome, '.git')
    for (const [label, filePath, env] of [
      [`${first} in the primary checkout, with GIT_DIR in the hook's environment, is refused there`, join(editHome, first), { GIT_DIR: gitDir }],
      [
        `${first} in a linked worktree, with GIT_DIR and GIT_WORK_TREE naming the primary checkout in the hook's environment, is refused there`,
        join(inside, first),
        { GIT_DIR: gitDir, GIT_WORK_TREE: editHome },
      ],
    ]) {
      const got = edit(`edit-env ${label}`, editIn(filePath), env)
      check(label, refusedAs(got, firstOwn), `exit ${got.code}: ${got.why}`)
    }
    for (const [where, dir] of [['under .claude/worktrees/', inside], ['outside the primary checkout', away]]) {
      const got = edit(`edit-banner ${where}`, editIn(join(dir, BANNERED)))
      check(`a bannered file in a linked worktree ${where} is refused by the catch-all, as in the primary checkout`, refusedAs(got, bannered), `exit ${got.code}: ${got.why}`)
    }
    const fresh = edit('edit-fresh', writeIn(join(inside, FRESH), `${BANNER}{}\n`))
    check(
      'a Write that claims a banner, into a directory the worktree does not have yet, is refused under its own path',
      fresh.code === 2 && fresh.why.startsWith(`${FRESH} carries a generator's`),
      `exit ${fresh.code}: ${fresh.why}`,
    )
    for (const [label, filePath] of [
      ['a file in a linked worktree with no banner passes', join(inside, PLAIN)],
      ['a hand-written document in a linked worktree passes', join(inside, 'sub/keep.md')],
      [`${first} in another repository passes`, join(other, first)],
      [`${first} outside any checkout passes`, join(outside, first)],
    ]) {
      const got = edit(`edit-pass ${label}`, editIn(filePath))
      check(label, got.code === 0 && got.why === '', `exit ${got.code}: ${got.why}`)
    }
    const runs = Object.keys(wall).filter((name) => name.startsWith('edit-'))
    console.log(
      `  hook wall time: ${wall[`edit-primary ${first}`].toFixed(2)} s in the primary checkout (the control), ` +
        `${wall[`edit-inside ${first}`].toFixed(2)} s in a linked worktree; ` +
        `${runs.reduce((sum, name) => sum + wall[name], 0).toFixed(2)} s for all ${runs.length} runs`,
    )
  } else {
    console.log("  (the copy's controls do not all pass, so its other cases are not run: none could be trusted)")
  }
} finally {
  rmSync(base, { recursive: true, force: true })
}

if (failures > 0) {
  console.log(`\n${failures} gate-summary check(s) failed`)
  process.exit(1)
}
console.log('\nall gate-summary checks passed')
