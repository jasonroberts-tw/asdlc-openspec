/**
 * Garbage-collects the git state a worktree leaves behind once its work is in the trunk: the ABANDONED
 * CHECKOUT still registered in `git worktree list`, the dead `agent/*` branch and, with it, the
 * `branch.<name>.remote` / `branch.<name>.merge` pair in `.git/config`.
 *
 *   node scripts/prune-worktree-branches.mjs [--dry-run] [--trunk <ref>] [--repo <path>]
 *                                            [--finished <worktree>]...
 *   npm run worktree:gc [-- --finished <worktree>]
 *
 * THE TWO DEFECTS THIS PREVENTS.
 *
 * First, `.git/config` growing without bound. The agent's `git push -u` writes the pair to point at
 * its own pushed branch, as provisioning also did, from the remote-tracking start point, until it
 * cut the branch with `--no-track` (asdlc-openspec-686) -- and nothing ever takes it back out.
 * `scripts/hooks/worktree-remove.mjs` removes the checkout and deliberately not the branch, which is
 * right (the branch is the work, and a pull request is how it reaches trunk), but it means the branch
 * and its two config keys outlive the worktree by design and then outlive the merged pull request by
 * neglect. Measured before this script existed: 222 of 241 local config keys were `branch.agent/*`,
 * spread over 111 branches of which 9 had a live worktree.
 *
 * Second, REGISTERED CHECKOUTS NOBODY IS USING. The `WorktreeRemove` hook fires only when the harness
 * tears a worktree down. A background job that simply ends, or a session that answers "keep" at exit,
 * leaves the checkout on disk and registered, with its branch checked out. The first version of this
 * script read every registered worktree as live, so it spared those branches forever and reported
 * each one as "checked out by a live worktree" -- about checkouts whose pull requests had merged days
 * earlier. Measured 2026-09-14: 22 of 22 registered worktrees were in that state, every one clean,
 * none with a process inside it, 21 branches ancestors of `origin/main` and the 22nd contained by
 * patch-id. REGISTERED IS NOT LIVE, and the worktree sweep below is what tells them apart.
 *
 * THE SAFETY RULE, and it is the whole design: a branch is deleted only when its content is already
 * in the trunk. Three independent proofs are accepted, in this order --
 *
 *   1. the branch is an ANCESTOR of the trunk (`merge-base --is-ancestor`), or
 *   2. its tip is the head of a pull request GitHub records as MERGED into the trunk's branch, or
 *   3. every commit on it has a patch-id that is already upstream (`git cherry` prints no `+`), where
 *      a commit `git cherry` reports as not upstream still counts when its patch-id computed with no
 *      context lines (`-U0`) matches a trunk commit's since the merge base.
 *
 * Pull requests here are rebase-merged, so the commit SHAs on trunk differ and proof 1 fails. Until
 * 2026-09-29 proof 3 stood alone after it, with full context, and that kept merged branches: a
 * patch-id hashes the diff's context lines, so when another pull request changes a line next to the
 * change between the branch's cut and its merge -- the neighbouring `promptWordBudget*` keys of
 * `tools/policy.json`, all the time -- the rebased copy gets a new patch-id. Measured that day, pull
 * request #65's branch, its tip the merged head, read "2 of 9 commit(s) not in origin/main"; a
 * whole-branch `git merge-tree` test did no better, since later pull requests had rewritten the same
 * lines (asdlc-openspec-dxf). Proof 2 is the one that survives both, and proof 3's zero-context
 * reading is its offline fallback.
 *
 * PROOF 2 reads GitHub once per sweep, and only when some branch is not an ancestor: `gh pr list
 * --state merged --base <trunk branch>`, the newest `worktreeGcMergedPrLimit`, waiting at most
 * `worktreeGcGhTimeoutSeconds` (`tools/policy/tool-settings.json`). A rebase merge replays exactly
 * the head's commits, so a branch whose tip is that head has nothing the trunk lacks. `gh` absent,
 * unauthenticated, offline, or past its timeout is no proof, never a failure. `WORKTREE_GC_MERGED_PRS`
 * names a JSON file of `{ number, headRefOid, baseRefName }` to read in its place, or `none` to skip
 * it, for the selftest and a by-hand run; the report's `merged pull requests:` line names the source.
 *
 * Where each loses. Proof 2 proves nothing offline, or for a fan-out lane that never had a pull
 * request of its own. Proof 3's zero-context reading keeps a commit whose own changed lines were
 * edited as it landed, a resolved conflict, and would accept one whose removed and added lines
 * exactly match a different trunk commit's in the same file. A SQUASH merge satisfies neither patch
 * reading -- N commits collapse into one new patch-id -- but squash merging is off here. Every branch
 * this script declines to delete is reported, with the reason, for a human to decide about; nothing
 * is deleted on a guess.
 *
 * A WORKTREE IS ABANDONED, and is removed with a plain `git worktree remove`, only when ALL of these
 * hold. Each is a separate refusal, and the report names the one that failed:
 *
 *   - it sits under `<primary>/.claude/worktrees/`, the one location this repository provisions;
 *   - it is not the worktree this sweep is running from;
 *   - it is not locked -- `git worktree lock` is how a human says "keep this", and it is honoured;
 *   - its HEAD is an `agent/*` or `worktree-*` branch: not detached, not `main`, not a human branch;
 *   - `git status --porcelain` there prints nothing -- no modified, staged or untracked file. Ignored
 *     files (`node_modules/`, `.worktree/`, `.scratch/`) do not count. `git worktree remove` without
 *     `--force` refuses a dirty tree on its own, which makes this a second layer over git's;
 *   - no process has its working directory inside it (THE LIVENESS CHECK, below). A Claude Code
 *     session `chdir`s into the worktree it enters, so a live session shows here, and so does a
 *     lingering MSBuild node for the minutes it takes to idle out -- conservative, and self-correcting
 *     on the next run;
 *   - its branch is contained in the trunk by one of the three proofs above;
 *   - HEAD there has not moved for `worktreeGcMinAgeHours` (`tools/policy/tool-settings.json`),
 *     unless the caller names the worktree with `--finished` (THE AGE RULE, below).
 *
 * THE LIVENESS CHECK, and the defect it closes. Until 2026-09-29 it read only `/proc/<pid>/cwd`, and
 * where `/proc` was absent it was skipped and the clean-and-contained proof stood alone. On
 * 2026-09-28, on macOS, two lanes of a fan-out run lost their worktrees mid-run
 * (asdlc-openspec-zlz): one freshly cut from `origin/main`, one just rebased onto a branch that had
 * since merged. Each was clean and its branch contained, so nothing told it from an abandoned one,
 * and the `WorktreeRemove` hook runs this sweep whenever any other worktree is torn down. One lane
 * then wrote a file at its removed worktree's path, and its `git rebase`, resolving upward from that
 * directory, rebased the primary checkout's `main`. Each platform now does this, first that works:
 *
 *   - Linux and WSL2: `/proc/<pid>/cwd`, as before;
 *   - macOS and other BSDs: `lsof -w -a -d cwd -Fpn`, every process's working directory in one call
 *     (measured 2026-09-29 on macOS: 0.25 s for about 500 processes), run once per sweep. `lsof`
 *     found but exiting non-zero is no answer, and falls through to the age rule alone rather than
 *     to "nobody is there";
 *   - anywhere neither works (native Windows, or a host with no `lsof`): no check, and the age rule
 *     below is all that stands between a lane and its removal.
 *
 * `WORKTREE_GC_LIVENESS` (`proc`, `lsof` or `none`) forces one check alone, for the selftest and a
 * by-hand run; unset, each is tried in the order above. The report's `liveness:` line names the one
 * that ran.
 *
 * THE AGE RULE, and the defect it closes. It once held only where no liveness check worked, and
 * where one did, a clean, contained worktree with no process in it was removed at once. On
 * 2026-09-30, on macOS, a prompt review's workflow agent lost its worktree before its first edit
 * (asdlc-openspec-m4m): it was clean and at the trunk, and no process had its directory there, since
 * each of the agent's Bash calls starts and ends and between them nothing stands in the worktree.
 * Every Bash call it made after was refused, and its finding, 178,551 tokens in, was reviewed again
 * from the start. So a liveness check sees a working agent only while one of its commands runs, and
 * proves no worktree unused: on every host, a clean, contained worktree with no process in it is
 * removed only once HEAD there has not moved for `worktreeGcMinAgeHours`.
 * HEAD's last move is the newest mtime of the worktree's `.git` file (written when it was cut) and of
 * `HEAD` and `logs/HEAD` in its admin directory (moved by a commit, a checkout or a rebase). The
 * index is not read: `git status`, this sweep's own, can rewrite it. With the policy unreadable, no
 * worktree is removed but one named by `--finished`.
 *
 * `--finished <worktree>` is the caller's word that it has finished with a worktree, by its name
 * under `.claude/worktrees/` or by its path, and waives the age rule for that one alone; every other
 * condition above still holds. It is how a session removes the worktree of a change it has just
 * landed, or of a lane it ran, without waiting the threshold out. The report's `min age:` line names
 * the threshold and what was named; a name that matches no registered worktree is reported.
 *
 * Where the age rule loses. An agent that works longer than `worktreeGcMinAgeHours` in one clean,
 * contained worktree without a commit, a checkout or a rebase, and with no command running there
 * when a sweep runs, loses its worktree. A finished worktree no caller names stays, with its branch,
 * until the threshold passes, where the check before it removed it at once. And `--finished` is taken
 * at its word: a caller that names a worktree another agent still works in removes it.
 *
 * A kept worktree keeps its branch with it, reported as `checked out by <path> (<reason>)`.
 *
 * Consequently a stale `origin/main` cannot cause data loss. It can only make fewer branches look
 * contained, which is why this is safe to run from the offline agent sandbox where `git fetch`
 * cannot reach the network, and where proof 2 falls through within its timeout. If the trunk ref is
 * missing altogether there is no evidence of containment at all, and both the worktree sweep and
 * the branch sweep are skipped entirely.
 *
 * WHAT IT WILL NOT TOUCH, regardless of proof:
 *   - the primary checkout, the worktree it runs from, a locked worktree, a worktree outside
 *     `.claude/worktrees/`, any worktree with a change or a process in it, or one whose HEAD moved
 *     within `worktreeGcMinAgeHours` that no `--finished` names;
 *   - any branch a kept worktree has checked out;
 *   - `main`, `release`, and anything not named `agent/*` or `worktree-*`. Human branches are
 *     not this script's business and prefix is how it knows.
 *
 * Deletions are logged to `<git-common-dir>/worktree-gc.log` as `<sha> <branch>` with a timestamp,
 * and the same restore command is printed. A deleted branch was provably contained in the trunk, so
 * its content is not gone; the log is there so the REF can be put back with one command anyway. A
 * removed checkout is not logged on its own line: its branch was contained and is deleted -- and
 * logged -- in the same run, and `git worktree add <path> <sha>` puts the checkout back.
 *
 * Exit status is 0 whenever the sweep ran, whether or not it found anything -- this is a gc, not a
 * gate, and `scripts/hooks/worktree-remove.mjs` calls it on a path where a non-zero exit would be
 * read as a failed teardown. Only a broken invocation (not a git repository, bad flag) exits 1.
 */
import { execFileSync } from 'node:child_process'
import {
  appendFileSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  statSync,
} from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPolicy } from '../tools/lib/policy.ts'

/* ============================================================================================= *
 * Arguments
 * ============================================================================================= */

const argv = process.argv.slice(2)
let dryRun = false
let trunkArg = null
let repoArg = null
/** What each `--finished` named, as given: a worktree's directory name or its path. */
const finishedArgs = []

for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i]
  if (arg === '--dry-run' || arg === '-n') dryRun = true
  else if (arg === '--trunk') trunkArg = argv[(i += 1)]
  else if (arg === '--repo') repoArg = argv[(i += 1)]
  else if (arg === '--finished') {
    const value = argv[(i += 1)]
    if (!value) {
      console.error('prune-worktree-branches: --finished needs a worktree name or path')
      process.exit(1)
    }
    finishedArgs.push(value)
  } else if (arg === '--help' || arg === '-h') {
    console.log(
      'usage: prune-worktree-branches.mjs [--dry-run] [--trunk <ref>] [--repo <path>] [--finished <worktree>]...\n' +
        '\n' +
        '  --dry-run   report what would be removed and change nothing\n' +
        '  --trunk     the ref that proves containment (default origin/main, or $TRUNK_BRANCH)\n' +
        '  --repo      a path inside the repository to operate on (default: the cwd)\n' +
        '  --finished  a worktree the caller has finished with, by its name under .claude/worktrees/\n' +
        '              or its path: removed without waiting out worktreeGcMinAgeHours, once every\n' +
        '              other condition holds; repeatable',
    )
    process.exit(0)
  } else {
    console.error(`prune-worktree-branches: unknown argument ${arg}`)
    process.exit(1)
  }
}

const LIVENESS_METHODS = ['proc', 'lsof']
const livenessArg = process.env.WORKTREE_GC_LIVENESS || null
if (livenessArg !== null && livenessArg !== 'none' && !LIVENESS_METHODS.includes(livenessArg)) {
  console.error(
    `prune-worktree-branches: WORKTREE_GC_LIVENESS=${livenessArg} is not one of proc, lsof, none`,
  )
  process.exit(1)
}
/** `none`, a path to a JSON file of merged pull requests, or unset for `gh` (proof 2). */
const mergedPrsArg = process.env.WORKTREE_GC_MERGED_PRS || null

/** Branches this script must never delete, whatever the proof says: the protected branches
 *  CLAUDE.md § Git workflow names, and a detached HEAD. */
const PROTECTED = new Set(['main', 'release', 'HEAD'])
/** Only worktree-provisioned branch names are in scope. `worktree-*` is EnterWorktree's native
 *  fallback shape, described in `scripts/hooks/guard-git.mjs`, and leaks the same two config keys. */
const OWNED = (name) => name.startsWith('agent/') || name.startsWith('worktree-')

/* ============================================================================================= *
 * git plumbing
 * ============================================================================================= */

const CWD = repoArg ?? process.cwd()

/** Trimmed stdout, or `null` if git failed or said nothing. Never throws. */
function gitOut(args, cwd = CWD) {
  try {
    const out = execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const trimmed = out.trim()
    return trimmed === '' ? null : trimmed
  } catch {
    return null
  }
}

/** True if the command succeeded. Used for writes, where only success matters. */
function gitOk(args, cwd = CWD) {
  try {
    execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return true
  } catch {
    return false
  }
}

/**
 * `{ ok, out }`, for the one read where "said nothing" and "failed" must not be confused: a clean
 * `git status --porcelain` is empty, and a failed one must read as dirty rather than clean.
 */
function gitRun(args, cwd = CWD) {
  try {
    const out = execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { ok: true, out: out.trim() }
  } catch {
    return { ok: false, out: '' }
  }
}

/** The path with symlinks resolved, or the path itself if it cannot be resolved. */
function realpath(p) {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}

// The PRIMARY checkout. `--git-common-dir` is shared by every worktree and always resolves to the
// primary `.git`, so this script does the same thing whether it is run from the primary checkout,
// from a linked worktree, or from the teardown hook -- which matters because branches and
// `.git/config` are shared state and there is only one copy of each to clean.
const COMMON_DIR = gitOut(['rev-parse', '--path-format=absolute', '--git-common-dir'])
if (COMMON_DIR === null) {
  console.error(`prune-worktree-branches: ${CWD} is not a git repository`)
  process.exit(1)
}
const ROOT = gitOut(['rev-parse', '--path-format=absolute', '--show-toplevel']) ?? CWD

const TRUNK = trunkArg ?? process.env.TRUNK_BRANCH ?? 'origin/main'

/* ============================================================================================= *
 * Sweep A -- config sections whose branch is already gone
 * ============================================================================================= */

/**
 * Every `branch.<name>` section in the LOCAL config, as a set of branch names.
 *
 * Parsed from `--name-only` keys rather than `--get-regexp`, because a branch name may itself
 * contain dots (`agent/v1.2-fix`) and the only reliable split is: strip the `branch.` prefix,
 * then drop the final dot-segment, which is the variable.
 */
function configuredBranches() {
  const raw = gitOut(['config', '--local', '--name-only', '--list'])
  if (raw === null) return []
  const names = new Set()
  for (const key of raw.split('\n')) {
    if (!key.startsWith('branch.')) continue
    const body = key.slice('branch.'.length)
    const dot = body.lastIndexOf('.')
    if (dot > 0) names.add(body.slice(0, dot))
  }
  return [...names]
}

/** How many `branch.*` keys the local config holds, for the before/after report. */
function branchKeyCount() {
  const raw = gitOut(['config', '--local', '--name-only', '--list'])
  if (raw === null) return 0
  return raw.split('\n').filter((k) => k.startsWith('branch.')).length
}

const localBranches = new Set(
  (gitOut(['for-each-ref', '--format=%(refname:short)', 'refs/heads/']) ?? '')
    .split('\n')
    .filter(Boolean),
)

const keysBefore = branchKeyCount()

// An orphan section is one describing a branch that no longer exists. `git branch -d` removes the
// section itself, so these are the leavings of a deletion that went around it -- `git update-ref -d`,
// a pruned packed-ref, or a config edited by hand. Cheap to find and unambiguously dead.
const orphans = configuredBranches().filter((name) => !localBranches.has(name))
for (const name of orphans) {
  if (!dryRun) gitOk(['config', '--local', '--remove-section', `branch.${name}`])
}

/* ============================================================================================= *
 * Containment -- the proof both remaining sweeps rest on
 * ============================================================================================= */

/**
 * Proof 2's evidence, read once per sweep: `{ source, count, heads }`, `heads` mapping each head
 * commit of a pull request merged into the trunk's branch to its number, or `{ source: null, why }`.
 */
let mergedCache = null
function mergedPullRequests() {
  if (mergedCache === null) mergedCache = readMergedPullRequests()
  return mergedCache
}

function readMergedPullRequests() {
  if (mergedPrsArg === 'none') return { source: null, why: 'WORKTREE_GC_MERGED_PRS=none' }
  // `origin/main` -> `main`: the base GitHub records. A trunk that is not a remote branch has none.
  const slash = TRUNK.indexOf('/')
  if (slash <= 0) return { source: null, why: `trunk ${TRUNK} is not a remote branch` }
  const base = TRUNK.slice(slash + 1)
  let raw
  let source
  if (mergedPrsArg !== null) {
    source = mergedPrsArg
    try {
      raw = readFileSync(mergedPrsArg, 'utf8')
    } catch {
      return { source: null, why: `cannot read ${mergedPrsArg}` }
    }
  } else {
    source = 'gh'
    const limit = policyNumber('worktreeGcMergedPrLimit')
    const timeout = policyNumber('worktreeGcGhTimeoutSeconds')
    if (limit === null || timeout === null) {
      return { source: null, why: 'no worktreeGcMergedPrLimit or worktreeGcGhTimeoutSeconds' }
    }
    const args = ['pr', 'list', '--state', 'merged', '--base', base, '--limit', String(limit)]
    try {
      raw = execFileSync('gh', [...args, '--json', 'number,headRefOid,baseRefName'], {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeout * 1000,
        maxBuffer: 16 * 1024 * 1024,
      })
    } catch (err) {
      if (err.code === 'ENOENT') return { source: null, why: 'no gh' }
      if (err.code === 'ETIMEDOUT') return { source: null, why: `gh timed out after ${timeout}s` }
      return { source: null, why: `gh exited ${err.status ?? err.code}` }
    }
  }
  let list
  try {
    list = JSON.parse(raw)
  } catch {
    return { source: null, why: `${source} gave no JSON` }
  }
  if (!Array.isArray(list)) return { source: null, why: `${source} gave no list` }
  const heads = new Map()
  for (const pr of list) {
    if (pr?.baseRefName === base && typeof pr.headRefOid === 'string' && Number.isInteger(pr.number)) {
      heads.set(pr.headRefOid, pr.number)
    }
  }
  return { source, count: list.length, heads }
}

/**
 * Patch-ids of the non-merge commits in `range` computed with no context lines, as a map from
 * commit to id, or `null` if git failed. The two reads can exceed `execFileSync`'s default buffer
 * over a long trunk range, hence the larger one.
 */
function zeroContextIds(range) {
  const opts = { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }
  try {
    const log = execFileSync(
      'git',
      ['-C', CWD, 'log', '--no-merges', '-p', '-U0', '--format=commit %H', range],
      { ...opts, stdio: ['ignore', 'pipe', 'pipe'] },
    )
    const out = execFileSync('git', ['-C', CWD, 'patch-id', '--stable'], {
      ...opts,
      input: log,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const ids = new Map()
    for (const line of out.split('\n')) {
      const [id, commit] = line.split(' ')
      if (commit) ids.set(commit, id)
    }
    return ids
  } catch {
    return null
  }
}

/** Trunk-side zero-context patch-ids since each merge base, as a set, computed once per base. */
const trunkIdsByBase = new Map()

/** How many of `commits`, on `branch`, match a trunk commit since the merge base by changed lines. */
function changedLinesMatches(branch, commits) {
  const base = gitOut(['merge-base', TRUNK, branch])
  if (base === null) return 0
  if (!trunkIdsByBase.has(base)) {
    const ids = zeroContextIds(`${base}..${TRUNK}`)
    trunkIdsByBase.set(base, ids === null ? null : new Set(ids.values()))
  }
  const upstream = trunkIdsByBase.get(base)
  const mine = zeroContextIds(`${TRUNK}..${branch}`)
  if (upstream === null || mine === null) return 0
  return commits.filter((c) => mine.has(c) && upstream.has(mine.get(c))).length
}

/**
 * Why `branch` may be deleted, or `null` with a reason when it may not.
 *
 * The proofs are ordered as the header gives them. `--is-ancestor` is a reachability walk and
 * decides most branches with no network; the merged pull requests are read once, on the first
 * branch it does not decide; `git cherry` computes a patch-id for every commit on both sides of the
 * merge base, and the zero-context reading is reached only for the commits it reports as missing.
 */
function containment(branch) {
  if (gitOk(['merge-base', '--is-ancestor', branch, TRUNK])) {
    return { contained: true, proof: 'ancestor of ' + TRUNK }
  }
  const tip = gitOut(['rev-parse', branch])
  const merged = mergedPullRequests()
  if (tip !== null && merged.heads?.has(tip)) {
    return { contained: true, proof: `merged as pull request #${merged.heads.get(tip)}` }
  }
  // `git cherry` SKIPS MERGE COMMITS, so its line count cannot be assumed to cover the range. That
  // is fine on its own -- a merge introduces no content of its own, and whatever it merged arrives
  // as the other parent's commits, which cherry does examine -- but it means the count has to be
  // reconciled against the non-merge commits explicitly. An unexplained gap is treated as no proof.
  const ahead = gitOut(['rev-list', '--count', `${TRUNK}..${branch}`])
  const aheadNoMerges = gitOut(['rev-list', '--count', '--no-merges', `${TRUNK}..${branch}`])
  const cherry = gitOut(['cherry', TRUNK, branch])

  if (ahead === null || aheadNoMerges === null) {
    return { contained: false, reason: 'could not compare against ' + TRUNK }
  }
  if (ahead === '0') return { contained: true, proof: 'no commits beyond ' + TRUNK }

  // Empty output is ambiguous -- no commits to report, or a failed invocation -- and the counts
  // above already rule out the innocent reading, since something is ahead.
  const lines = cherry === null ? [] : cherry.split('\n').filter(Boolean)
  if (lines.length !== Number(aheadNoMerges)) {
    return {
      contained: false,
      reason: `patch comparison covered ${lines.length} of ${aheadNoMerges} non-merge commit(s)`,
    }
  }

  const unapplied = lines.filter((l) => l.startsWith('+'))
  if (unapplied.length === 0) {
    return { contained: true, proof: `all ${lines.length} patch(es) already in ${TRUNK}` }
  }
  const matched = changedLinesMatches(
    branch,
    unapplied.map((l) => l.slice(2)),
  )
  if (matched === unapplied.length) {
    return {
      contained: true,
      proof: `all ${lines.length} patch(es) already in ${TRUNK}, ${matched} by its changed lines alone`,
    }
  }
  return {
    contained: false,
    reason: `${unapplied.length - matched} of ${lines.length} commit(s) not in ${TRUNK}`,
  }
}

/* ============================================================================================= *
 * Sweep B -- abandoned worktrees
 * ============================================================================================= */

/**
 * Every registered worktree, parsed from `git worktree list --porcelain`. The main worktree is
 * listed first, which is how the primary checkout is identified without a second rev-parse.
 */
function listWorktrees() {
  const raw = gitOut(['worktree', 'list', '--porcelain'])
  const entries = []
  let cur = null
  for (const line of (raw ?? '').split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = {
        path: line.slice('worktree '.length),
        branch: null,
        locked: false,
        prunable: false,
        detached: false,
        bare: false,
      }
      entries.push(cur)
    } else if (cur === null) {
      continue
    } else if (line.startsWith('branch ')) {
      cur.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '')
    } else if (line === 'locked' || line.startsWith('locked ')) {
      cur.locked = true
    } else if (line === 'prunable' || line.startsWith('prunable ')) {
      cur.prunable = true
    } else if (line === 'detached') {
      cur.detached = true
    } else if (line === 'bare') {
      cur.bare = true
    }
  }
  return entries
}

/**
 * Every process's working directory from `/proc`, as `[pid, cwd]` pairs, or `{ why }` where `/proc`
 * is not available. Another user's `cwd` link is unreadable and is skipped; every process this
 * repository cares about runs as the operator.
 */
function cwdsFromProc() {
  let pids
  try {
    pids = readdirSync('/proc').filter((name) => /^\d+$/.test(name))
  } catch {
    return { why: 'no /proc' }
  }
  const cwds = []
  for (const pid of pids) {
    try {
      cwds.push([Number(pid), readlinkSync(`/proc/${pid}/cwd`)])
    } catch {
      /* gone, or another user's */
    }
  }
  return cwds
}

/**
 * Every process's working directory from `lsof`, or `{ why }`. `-Fpn` prints a `p<pid>` line and
 * then an `n<path>` line for its cwd; `-w` drops the warnings about processes it may not inspect.
 */
function cwdsFromLsof() {
  let out
  try {
    out = execFileSync('lsof', ['-w', '-a', '-d', 'cwd', '-Fpn'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (err) {
    return { why: err.code === 'ENOENT' ? 'no lsof' : `lsof exited ${err.status ?? err.code}` }
  }
  const cwds = []
  let pid = null
  for (const line of out.split('\n')) {
    if (line.startsWith('p')) pid = Number(line.slice(1))
    else if (line.startsWith('n') && pid !== null) cwds.push([pid, line.slice(1)])
  }
  if (cwds.length === 0) return { why: 'lsof listed no process' }
  return cwds
}

/**
 * The liveness check, run once per sweep: `{ method, cwds }` from the first method that works, or
 * `{ method: null, why }` naming why none did.
 */
let livenessCache = null
function liveness() {
  if (livenessCache !== null) return livenessCache
  if (livenessArg === 'none') {
    livenessCache = { method: null, why: 'WORKTREE_GC_LIVENESS=none' }
    return livenessCache
  }
  const probes = { proc: cwdsFromProc, lsof: cwdsFromLsof }
  const whys = []
  for (const method of livenessArg === null ? LIVENESS_METHODS : [livenessArg]) {
    const cwds = probes[method]()
    if (Array.isArray(cwds)) {
      livenessCache = { method, cwds }
      return livenessCache
    }
    whys.push(cwds.why)
  }
  livenessCache = { method: null, why: whys.join(', ') }
  return livenessCache
}

/**
 * PIDs whose working directory is `dir` or inside it, or `null` where no liveness check works,
 * which the caller treats as "unknown" rather than "none".
 */
function processesIn(dir) {
  const live = liveness()
  if (live.method === null) return null
  const prefix = dir.endsWith(sep) ? dir : dir + sep
  return live.cwds
    .filter(([, cwd]) => cwd === dir || cwd.startsWith(prefix))
    .map(([pid]) => pid)
}

/**
 * The positive number `key` holds in the policy beside this script (`tools/policy/tool-settings.json`),
 * or `null` if it cannot be read as one -- which each caller treats as "remove nothing unproven".
 */
let policyCache
function policyNumber(key) {
  if (policyCache === undefined) {
    policyCache = null
    try {
      const here = dirname(fileURLToPath(import.meta.url))
      policyCache = readPolicy(resolve(here, '..'))
    } catch {
      /* unreadable: stays null */
    }
  }
  const value = policyCache?.[key]
  return typeof value === 'number' && value > 0 ? value : null
}
const minAgeHours = () => policyNumber('worktreeGcMinAgeHours')

/**
 * Hours since HEAD last moved in the worktree at `path`: the newest mtime of its `.git` file and of
 * `HEAD` and `logs/HEAD` in its admin directory. `null` if none of them can be read.
 */
function hoursSinceHeadMoved(path) {
  const adminDir = gitOut(['rev-parse', '--path-format=absolute', '--git-dir'], path)
  const files = [join(path, '.git')]
  if (adminDir !== null) files.push(join(adminDir, 'HEAD'), join(adminDir, 'logs', 'HEAD'))
  let newest = null
  for (const file of files) {
    try {
      const mtime = statSync(file).mtimeMs
      if (newest === null || mtime > newest) newest = mtime
    } catch {
      /* absent: `logs/HEAD` is, where reflogs are off */
    }
  }
  return newest === null ? null : (Date.now() - newest) / 3_600_000
}

const worktrees = listWorktrees()
const PRIMARY = worktrees.length > 0 ? realpath(worktrees[0].path) : realpath(ROOT)
const OWNED_DIR = join(PRIMARY, '.claude', 'worktrees') + sep
const SELF = realpath(ROOT)

/**
 * The worktrees `--finished` names, as a map from real path to what was given: a bare name is a
 * directory under `.claude/worktrees/`, anything with a separator a path from the cwd.
 */
const FINISHED = new Map(
  finishedArgs.map((given) => [
    realpath(given.includes('/') || given.includes(sep) ? resolve(given) : join(OWNED_DIR, given)),
    given,
  ]),
)
/** Every registered worktree's real path, read before the sweep removes any. */
const REGISTERED = new Set(worktrees.map((wt) => realpath(wt.path)))

/** A worktree path as the report prints it: relative to the primary checkout where it is inside. */
function shortPath(p) {
  const rel = relative(PRIMARY, p)
  return rel === '' ? '.' : rel.startsWith('..') ? p : rel
}

/**
 * Whether `wt` is abandoned -- `{ remove: true, proof }` -- or `{ remove: false, reason }` naming the
 * first condition it failed. Every refusal is a separate string so the report, and the selftest,
 * can tell them apart; that is what makes a refusal assertable by reason rather than by survival.
 */
function worktreeVerdict(wt, index) {
  const real = realpath(wt.path)
  if (index === 0) return { remove: false, reason: 'the primary checkout' }
  if (wt.bare) return { remove: false, reason: 'bare' }
  if (real === SELF) return { remove: false, reason: 'the worktree this sweep runs from' }
  if (!real.startsWith(OWNED_DIR)) return { remove: false, reason: 'outside .claude/worktrees/' }
  if (wt.locked) return { remove: false, reason: 'locked' }
  if (wt.detached || wt.branch === null) return { remove: false, reason: 'detached HEAD' }
  if (PROTECTED.has(wt.branch) || !OWNED(wt.branch)) {
    return { remove: false, reason: `branch ${wt.branch} is not worktree-provisioned` }
  }
  const status = gitRun(['status', '--porcelain'], wt.path)
  if (!status.ok) return { remove: false, reason: 'git status failed there' }
  if (status.out !== '') {
    const count = status.out.split('\n').length
    return { remove: false, reason: `${count} uncommitted change(s)` }
  }
  const pids = processesIn(real)
  if (pids !== null && pids.length > 0) {
    const shown = pids.slice(0, 3).join(', ') + (pids.length > 3 ? ', ...' : '')
    return { remove: false, reason: `in use by process ${shown}` }
  }
  const verdict = containment(wt.branch)
  if (!verdict.contained) return { remove: false, reason: `branch ${wt.branch}: ${verdict.reason}` }
  if (FINISHED.has(real)) return { remove: true, proof: `clean, named by --finished, ${verdict.proof}` }

  // THE AGE RULE, on every host: a clean, contained worktree with no process in it is also what a
  // lane looks like the moment it is cut, and what an agent's looks like between two of its calls,
  // so only one whose HEAD has sat still for the policy's threshold is taken as abandoned.
  const minAge = minAgeHours()
  if (minAge === null) return { remove: false, reason: 'no worktreeGcMinAgeHours to wait out' }
  const idle = hoursSinceHeadMoved(wt.path)
  if (idle === null) return { remove: false, reason: 'no HEAD age' }
  if (idle < minAge) {
    return {
      remove: false,
      reason: `HEAD moved ${idle.toFixed(1)}h ago, under worktreeGcMinAgeHours (${minAge})`,
    }
  }
  return { remove: true, proof: `clean, HEAD idle ${idle.toFixed(1)}h, ${verdict.proof}` }
}

const removedWorktrees = []
const keptWorktrees = []
/** Branch name -> the kept worktree holding it, for the branch sweep's report. */
const heldBy = new Map()
let trunkMissing = false

if (gitOut(['rev-parse', '--verify', '--quiet', TRUNK]) === null) {
  // No trunk ref, no evidence, no deletions. The config sweep above still stands on its own.
  trunkMissing = true
} else {
  // A prunable entry is a registration whose directory is already gone. It holds no work and blocks
  // its branch for nothing; `prune` is git's own reconciliation and touches no checkout that exists.
  if (!dryRun) gitOk(['worktree', 'prune'])

  worktrees.forEach((wt, index) => {
    if (wt.prunable) return
    const verdict = worktreeVerdict(wt, index)
    if (!verdict.remove) {
      if (index > 0) keptWorktrees.push({ wt, reason: verdict.reason })
      if (wt.branch !== null) heldBy.set(wt.branch, { wt, reason: verdict.reason })
      return
    }
    if (dryRun) {
      removedWorktrees.push({ wt, proof: verdict.proof })
      return
    }
    // No `--force`: a tree that turned dirty between the status read and this call is refused by git
    // itself, and reported below as kept rather than removed.
    if (gitOk(['worktree', 'remove', wt.path])) {
      removedWorktrees.push({ wt, proof: verdict.proof })
    } else {
      const reason = 'git worktree remove refused it'
      keptWorktrees.push({ wt, reason })
      heldBy.set(wt.branch, { wt, reason })
    }
  })
}

/* ============================================================================================= *
 * Sweep C -- branches whose work is already in the trunk
 * ============================================================================================= */

const deleted = []
const kept = []

if (!trunkMissing) {
  for (const branch of [...localBranches].sort()) {
    if (PROTECTED.has(branch) || !OWNED(branch)) continue
    const holder = heldBy.get(branch)
    if (holder !== undefined) {
      kept.push({
        branch,
        reason: `checked out by ${shortPath(holder.wt.path)} (${holder.reason})`,
      })
      continue
    }
    const verdict = containment(branch)
    if (!verdict.contained) {
      kept.push({ branch, reason: verdict.reason })
      continue
    }
    const sha = gitOut(['rev-parse', branch]) ?? '?'
    if (dryRun) {
      deleted.push({ branch, sha, proof: verdict.proof })
      continue
    }
    if (gitOk(['branch', '-D', branch])) {
      // `git branch -D` drops the branch's config section itself. Doing it again explicitly is what
      // makes the config guarantee unconditional rather than dependent on that behaviour, and
      // `--remove-section` on an absent section is a harmless non-zero exit.
      gitOk(['config', '--local', '--remove-section', `branch.${branch}`])
      deleted.push({ branch, sha, proof: verdict.proof })
    } else {
      kept.push({ branch, reason: 'git branch -D refused it' })
    }
  }
}

/* ============================================================================================= *
 * Report
 * ============================================================================================= */

if (deleted.length > 0 && !dryRun) {
  const stamp = new Date().toISOString()
  const lines = deleted.map(({ branch, sha }) => `${stamp} ${sha} ${branch}\n`).join('')
  try {
    appendFileSync(join(COMMON_DIR, 'worktree-gc.log'), lines)
  } catch {
    /* the log is a convenience; losing it must not fail the sweep */
  }
}

const verb = dryRun ? 'would remove' : 'removed'
console.log(`worktree gc: ${ROOT}`)
console.log(
  `  trunk: ${TRUNK}${trunkMissing ? ' (MISSING -- worktree and branch sweeps skipped)' : ''}`,
)
if (livenessCache !== null) {
  console.log(
    livenessCache.method !== null
      ? `  liveness: ${livenessCache.method}`
      : `  liveness: none (${livenessCache.why})`,
  )
  const waived = FINISHED.size > 0 ? `, waived for --finished ${finishedArgs.join(', ')}` : ''
  console.log(`  min age: ${minAgeHours() ?? '(unset)'}h (worktreeGcMinAgeHours)${waived}`)
}
// A name that matched no registered worktree is a typo or a worktree already gone; either way the
// caller should see that it removed nothing.
for (const [real, given] of FINISHED) {
  if (!REGISTERED.has(real)) console.log(`  --finished ${given}: no registered worktree at ${real}`)
}
if (mergedCache !== null) {
  console.log(
    mergedCache.source !== null
      ? `  merged pull requests: ${mergedCache.source} (${mergedCache.count})`
      : `  merged pull requests: none (${mergedCache.why})`,
  )
}

if (orphans.length > 0) {
  console.log(`  ${verb} ${orphans.length} config section(s) with no branch:`)
  for (const name of orphans) console.log(`    branch.${name}.*`)
}

if (removedWorktrees.length > 0) {
  console.log(`  ${verb} ${removedWorktrees.length} abandoned worktree(s):`)
  for (const { wt, proof } of removedWorktrees) {
    console.log(`    ${shortPath(wt.path)}  ${wt.branch}  (${proof})`)
  }
}

if (deleted.length > 0) {
  console.log(`  ${verb} ${deleted.length} branch(es) whose work is already in ${TRUNK}:`)
  for (const { branch, sha, proof } of deleted) {
    console.log(`    ${branch}  ${sha.slice(0, 8)}  (${proof})`)
  }
  if (!dryRun) {
    console.log(`  restore any of them with:  git branch <name> <sha>`)
    console.log(`  logged to ${join(COMMON_DIR, 'worktree-gc.log')}`)
  }
}

if (keptWorktrees.length > 0) {
  console.log(`  kept ${keptWorktrees.length} worktree(s):`)
  for (const { wt, reason } of keptWorktrees) {
    console.log(`    ${shortPath(wt.path)}  ${wt.branch ?? '(detached)'}  -- ${reason}`)
  }
}

if (kept.length > 0) {
  console.log(`  kept ${kept.length} branch(es):`)
  for (const { branch, reason } of kept) console.log(`    ${branch}  -- ${reason}`)
}

const keysAfter = dryRun ? keysBefore : branchKeyCount()
if (dryRun) {
  console.log(`  branch.* config keys: ${keysBefore} (unchanged, --dry-run)`)
} else {
  console.log(`  branch.* config keys: ${keysBefore} -> ${keysAfter}`)
}
if (orphans.length === 0 && removedWorktrees.length === 0 && deleted.length === 0) {
  console.log('  nothing to collect')
}
