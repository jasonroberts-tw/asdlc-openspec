/**
 * PreToolUse hook. Refuses a Bash command that would damage state SHARED between git worktrees.
 *
 * THE DEFECT THIS PREVENTS: a task agent running in a linked worktree reaching past its branch. The
 * object store, the packed refs and the trunk branch itself are shared with every sibling worktree,
 * so `git push origin main`, `git gc` and `git worktree remove` are not local mistakes -- they land on
 * work an agent cannot see and did not consent to. `.worktree/CONTEXT.md` asks the agent not to do
 * this, but context is advice; this is the part that holds.
 *
 * THE GIT RULES ARE A NO-OP IN THE PRIMARY CHECKOUT. CLAUDE.md § Git workflow forbids pushing to,
 * switching to or rewriting a protected branch from a worktree; the primary checkout is where a
 * person works, and what they commit or push there is theirs to decide. So the guard asks git
 * whether the command runs in a linked worktree and skips every git rule if not. The PR-base,
 * merge-bypass, worktree-prune and graphify rules below are the exceptions and apply everywhere,
 * because what they guard is not worktree isolation. Where the command runs is the payload's `cwd`, never `CLAUDE_PROJECT_DIR`;
 * `commandDir` below says what reading the variable cost.
 *
 * IT FAILS CLOSED, unlike the three advisory hooks beside it. A guard that allows the command when
 * it cannot read the payload is not a guard: the shell version of this file needed `jq`, which is
 * not installed here, and its `[ -z "$cmd" ] && exit 0` therefore allowed every command -- including
 * the one command it existed to stop.
 *
 * IT PARSES, it does not glob. The shell version matched substrings of the raw command, which
 * refused `git push origin agent/BD-12-fix-main-nav`, `git switch development` and
 * `echo 'see docs/git worktree notes'` while allowing `git -C /repo push origin main` and
 * `git push --all`. Wrong in both directions. Commands here are split into statements, tokenised
 * quote-aware, and matched on the git SUBCOMMAND and the resolved REF.
 *
 * IT REFUSES EVERY GIT CALL IN A STRAY WORKTREE DIRECTORY: one under `.claude/worktrees/<name>/`
 * where git answers for another checkout, which is what a worktree removed under a live session
 * leaves once the session writes a file there (`strayWorktreeDir` below, and its incident).
 *
 * IT ALSO GUARDS THE PR BASE, EVERYWHERE. `gh pr create` with no `--base` uses the repository's
 * DEFAULT branch: a GitHub setting that lives outside this repository, that this guard cannot read,
 * and that need not be the trunk. Whoever omits the flag gets whatever that setting says when the
 * command runs, and the mistake is invisible until a human looks. The rule does not rest on `main`
 * being protected on GitHub, and it is not: on 2026-09-23 the branch-protection endpoint answered
 * 404 and the rulesets applying to `main` were empty. The trunk is `main`; the base is typed, never
 * inferred (CLAUDE.md § Git workflow). That has nothing to do with worktrees, so unlike the git
 * rules it is enforced in the primary checkout too.
 *
 * IT ALSO GUARDS THE MERGE PAST THE CHECKS, EVERYWHERE. It refuses `gh pr merge` with `--admin`,
 * which merges with the maintainer's bypass of the checks the trunk's ruleset requires, `verify` and
 * `pr-review` (docs/decisions.md § D-47): that is a person's merge of a head on the high-risk floor,
 * and a session holding the maintainer's credentials could otherwise make it. From a worktree it lets
 * `gh pr merge --auto` through, which only asks GitHub to merge once those checks pass, and refuses
 * any other merge as the orchestrator's call. No incident yet: were this rule wrong, an agent could
 * merge a pull request no person read. Until 2026-10-05 (asdlc-openspec-3cp3) it guarded the
 * reviewer's approval label in the same place, which retired with the label. It reads only the
 * command line, so a merge through `gh api`, curl, a browser tool or the web UI passes it
 * (docs/decisions.md § R-01).
 *
 *   printf '%s' '{"tool_input":{"command":"gh pr merge 1 --admin --rebase"}}' | node scripts/hooks/guard-git.mjs
 *
 * IT ALSO REFUSES A BARE `git worktree prune`, EVERYWHERE. git cannot tell a removed worktree from
 * one whose path it cannot see, and in a dev container on a bind-mounted clone every worktree made on
 * the host is the second kind. A session there works in the primary checkout, where the git rules
 * are off, so a prune it typed would take every host worktree's record. On 2026-10-06 a prune run in
 * such a container, by the WorktreeRemove hook through a pre-push selftest, left git with no record
 * of any of the host's worktrees (asdlc-openspec-486e). Its `--dry-run` passes; the sweep,
 * `scripts/prune-worktree-branches.mjs`, prunes by its own rule.
 *
 * IT ALSO GUARDS THE LOCAL CODE GRAPH, EVERYWHERE. It refuses graphify's `update`, `watch`, `hook
 * install` and `claude install` (`GRAPHIFY_ERODING` below), run by name or as a Python module,
 * because the first three rebuild the graph through the path that erodes its document layer and the
 * last writes graphify's advice to run `update` into CLAUDE.md (docs/decisions.md § D-20). It lets
 * one through that asks for help, which graphify answers with a line of help alone. It holds in the
 * primary checkout too, because that is where `mise run code-graph` builds the graph. No session has
 * run one here yet. Were this rule wrong, a session following graphify's own advice, which its
 * user-level skill and the block `claude install` writes both give, would erode the graph: on
 * 2026-10-01, on a clone holding a copy of the first graph, two `graphify update` runs took its
 * concept nodes from 157 to 22 and its links between documents and code from 898 to 156 (D-20). It
 * reads a statement that opens with graphify, after any environment assignments, so graphify behind
 * a launcher (`env`, `uvx`, `pipx run`) or a shell word (`nohup`, `time`, `then`), in `bash -lc` or
 * `eval`, or its library called through `python -c`, as graphify's own skill runs its `--update`,
 * passes it; the git rules above miss the same shell forms.
 *
 * Exit 2 is the documented way for a PreToolUse hook to block, and stderr becomes the reason shown
 * to the agent -- which is what turns a blocked attempt into a course correction rather than a
 * confused retry loop.
 */
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { basename } from 'node:path'
import { gitEnv, readHookInput } from './_shared.mjs'

/* ============================================================================================= *
 * Are we in a linked worktree?
 * ============================================================================================= */

/**
 * The directory the command will run in: the payload's `cwd`, or this process's own directory when
 * the payload names none. The harness sets both to the session's current directory
 * (https://code.claude.com/docs/en/hooks.md: `cwd` is the "Current working directory when the hook
 * is invoked", and "Handlers run in the current directory"), and the payload's `cwd` follows the
 * session into a worktree and through every `cd` (https://code.claude.com/docs/en/worktrees.md, the
 * note "Hook paths don't follow the worktree").
 *
 * NOT `CLAUDE_PROJECT_DIR`. Until 2026-09-25 this read that variable first, under the comment
 * "Claude Code sets this to the session's project root". It does, and the root stays where the
 * session started: after `EnterWorktree` it still names the primary checkout. So in every session
 * that had entered a worktree the guard judged the primary checkout, found no linked worktree and
 * applied no git rule. From `.claude/worktrees/7dj-hook-paths`, `git worktree list` ran unrefused
 * while `gh pr create --help` was refused, which proved the guard was running
 * (asdlc-openspec-bvf). Nothing else refused a push to `main`, which has no branch protection on
 * GitHub (the PR-base rule below). The selftest set the variable to the worktree, which the harness
 * never does, and passed.
 */
function commandDir(input) {
  return typeof input?.cwd === 'string' && input.cwd !== '' ? input.cwd : process.cwd()
}

/** One `git rev-parse` path in `dir`, or `null` if git cannot answer (not a repository, git missing). */
function gitPath(dir, flag) {
  return gitOut(dir, ['rev-parse', '--path-format=absolute', flag])
}

/**
 * The trimmed stdout of a git command run in `dir`, or `null` if it fails or says nothing.
 *
 * Every caller treats `null` as "do not judge", so a missing git, a detached HEAD, an absent
 * `origin/main` or a `cwd` that no longer exists degrades to allowing the command rather than
 * blocking on a question git could not answer.
 *
 * WITH NO `GIT_*` VARIABLE, as `gitEnv` in `_shared.mjs` gives. An inherited `GIT_DIR` outranks
 * `dir`, so until 2026-10-06 every git call here answered for the checkout it named: naming the
 * shared `.git`, it let `git push origin main` and `gh pr merge` through from a linked worktree, and
 * naming a worktree's git directory, as git exports it to a hook run there, it refused them in the
 * primary checkout. 13 of 28 cases measured gave a wrong verdict (asdlc-openspec-vz5b,
 * asdlc-openspec-hn4x).
 */
function gitOut(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, env: gitEnv(), encoding: 'utf8', windowsHide: true })
  if (r.status !== 0 || typeof r.stdout !== 'string') return null
  const out = r.stdout.trim()
  return out === '' ? null : out
}

/**
 * True only when `dir` is in a LINKED worktree. `--git-dir` is `<common>/worktrees/<name>` there,
 * and equal to `--git-common-dir` in the primary checkout. Anything unanswerable counts as "not a
 * worktree", so an environment without git is never blocked.
 */
function inLinkedWorktree(dir) {
  const gitDir = gitPath(dir, '--git-dir')
  const common = gitPath(dir, '--git-common-dir')
  if (gitDir === null || common === null) return false
  return gitDir !== common
}

/** A worktree's directory under `.claude/worktrees/`, the one location this repository provisions. */
const WORKTREE_PATH = /^(.*?[\\/]\.claude[\\/]worktrees[\\/][^\\/]+)(?:[\\/]|$)/

/** The path with symlinks resolved, or the path itself if it cannot be resolved. */
function realpathOr(p) {
  try {
    return realpathSync(p)
  } catch {
    return p
  }
}

/**
 * `{ worktree, toplevel }` when `dir` sits under `.claude/worktrees/<name>/` but git there answers
 * for another checkout, or `null`.
 *
 * WHY THIS EXISTS. A worktree removed under a live session leaves the session's directory gone, and
 * the first file the session writes there recreates it with no `.git` file in it. Git run from that
 * directory then walks upward and finds the PRIMARY checkout, so `inLinkedWorktree` answers false
 * and every git rule above is skipped. On 2026-09-28 a lane working asdlc-openspec-j09.5 lost its
 * worktree `.claude/worktrees/agent-a844b327378a4720e` to `npm run worktree:gc`, wrote
 * `scripts/test-trace.mjs` at that path, and ran `git fetch origin` and `git rebase origin/main`
 * there, which rebased the primary checkout's `main` (its reflog: `rebase (finish): refs/heads/main
 * onto f09c923`). It was a fast-forward, so nothing was lost (asdlc-openspec-0ga). THE SIGNAL IS
 * THE PATH: nothing git says in such a directory tells it from the primary checkout, but a directory
 * under `.claude/worktrees/<name>/` belongs to that worktree, and `--show-toplevel` must be it. An
 * unanswerable toplevel (no repository at all, git missing) is not judged: git would fail there too.
 */
function strayWorktreeDir(dir) {
  const match = WORKTREE_PATH.exec(dir)
  if (match === null) return null
  const toplevel = gitPath(dir, '--show-toplevel')
  if (toplevel === null) return null
  const worktree = match[1]
  if (realpathOr(toplevel) === realpathOr(worktree)) return null
  return { worktree, toplevel }
}

/** The refusal for any git call in a stray worktree directory, naming both paths. */
function strayDenial({ worktree, toplevel }) {
  return (
    `this command runs git in ${worktree}, but git there answers for ${toplevel}. A directory ` +
    'under .claude/worktrees/ with no checkout of its own is what is left of a worktree removed ' +
    'under the session, and git run in it acts on another checkout. Do not run git here. Stop and ' +
    'report that the worktree was removed; anything it held that was not pushed is only in this ' +
    'directory now.'
  )
}

/* ============================================================================================= *
 * Did the sanctioned provisioner actually make this worktree?
 * ============================================================================================= */

/**
 * A description of how this worktree is wrong, or `null` if it looks properly provisioned.
 *
 * WHY THIS EXISTS. Worktrees live at `.claude/worktrees/<name>` -- the location the `EnterWorktree`
 * tool uses natively -- and `scripts/hooks/worktree-create.mjs` routes that tool through
 * `scripts/new-worktree.sh` so each one is cut from `origin/main` onto `agent/<name>` with a probed
 * port pair and a rendered briefing. Since the tool and the script now agree on WHERE, location
 * carries no information and this guard does not look at it.
 *
 * What the tool and the script still disagree about is everything the script does after choosing
 * the path. Claude Code snapshots hook configuration at session start, so a session that began
 * before the hook was added carries a config without it and `EnterWorktree` silently falls back to
 * its native behaviour: branch `worktree-<name>`, cut from whatever `worktree.baseRef` names
 * (`fresh`, the default, takes `origin/<default branch>`; `head` takes the local HEAD), and no
 * `.worktree/CONTEXT.md`, so the briefing CLAUDE.md @-imports is absent and the agent never reads
 * the rules of a shared repository. No `worktree.baseRef` value names `origin/main` itself: the
 * default branch is a GitHub setting outside this repository, `main` when checked on 2026-09-23,
 * which is the same reason the PR-base rule below will not infer it.
 *
 * No incident here yet. Were this check wrong, it would let an agent do real work in a worktree with
 * no briefing, on a branch CLAUDE.md § Git workflow does not provide for, cut from a base no file in
 * this repository chose.
 *
 * A WorktreeCreate hook cannot cover this, because the failure is that no WorktreeCreate hook ran.
 * This one is a PreToolUse Bash hook, so it fires on the agent's first command whatever the
 * session's hook snapshot contains -- the only place left to catch it.
 *
 * THE SIGNAL IS THE BRANCH NAME. `new-worktree.sh` always names the branch `agent/<name>`; the
 * native fallback always names it `worktree-<name>`. The base cannot be the signal: while the
 * default branch is `main`, a `fresh` fallback starts from the same `origin/main` the script does,
 * and the two differ at most by how recently it was fetched. The name is cheap, needs no network,
 * and does not move as `origin/main` does. The base distance is measured only to put a number in
 * the message when there is one, and never decides, because a legitimately long-lived `agent/*`
 * branch may sit far behind `origin/main` for good reasons.
 */
function unprovisionedWorktree(dir) {
  const branch = gitOut(dir, ['rev-parse', '--abbrev-ref', 'HEAD'])
  if (branch === null || branch === 'HEAD') return null // detached; not a shape we judge
  if (branch.startsWith('agent/')) return null

  // For the message only. `null` whenever git cannot answer -- offline, no origin/main, a shallow
  // clone -- because the branch name has already decided and this must never be what blocks.
  let behind = null
  const counts = gitOut(dir, ['rev-list', '--left-right', '--count', `origin/${TRUNK}...HEAD`])
  if (counts !== null) {
    const [left] = counts.split(/\s+/)
    if (/^\d+$/.test(left)) behind = Number(left)
  }
  return { branch, behind }
}

/* ============================================================================================= *
 * Parsing.
 * ============================================================================================= */

/** Characters that end one statement and begin another, outside quotes. Covers `&&` and `||`. */
const SEPARATORS = new Set([';', '|', '&', '\n', '\r', '(', ')', '{', '}'])

/**
 * Split a command line into statements of tokens, quote-aware.
 *
 * The quoting matters in both directions: `echo 'see docs/git worktree notes'` becomes ONE token
 * that is not a git invocation (the old false positive), while a `git push origin main` hidden in a
 * `bash -c` string is recovered by `inlineScripts` below (the old bypass).
 */
function parse(command) {
  const statements = []
  let tokens = []
  let cur = ''
  let open = false
  let quote = null

  const endToken = () => {
    if (open) tokens.push(cur)
    cur = ''
    open = false
  }
  const endStatement = () => {
    endToken()
    if (tokens.length > 0) statements.push(tokens)
    tokens = []
  }

  for (let i = 0; i < command.length; i++) {
    const ch = command[i]
    if (quote !== null) {
      // Inside single quotes a backslash is literal; inside double quotes it escapes.
      if (quote === '"' && ch === '\\' && i + 1 < command.length) {
        cur += command[++i]
        open = true
        continue
      }
      if (ch === quote) {
        quote = null
        continue
      }
      cur += ch
      open = true
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      open = true
      continue
    }
    if (ch === '\\' && i + 1 < command.length) {
      cur += command[++i]
      open = true
      continue
    }
    if (ch === ' ' || ch === '\t') {
      endToken()
      continue
    }
    if (ch === '$' && command[i + 1] === '(') {
      i++
      endStatement()
      continue
    }
    // A brace groups commands only as a word of its own, `{ git push origin main; }`, as the shell
    // reads it. Inside a word it is a letter: until 2026-09-26 it split the statement anywhere, so
    // `gh api repos/{owner}/{repo}/issues/1/labels`, gh's own placeholder form, lost its endpoint and
    // matched no rule (asdlc-openspec-g1b's selftest found it).
    if (ch === '{' || ch === '}') {
      const next = command[i + 1]
      const word = next === undefined || next === ' ' || next === '\t' || SEPARATORS.has(next)
      if (open || !word) {
        cur += ch
        open = true
        continue
      }
    }
    if (ch === '`' || SEPARATORS.has(ch)) {
      endStatement()
      continue
    }
    cur += ch
    open = true
  }
  endStatement()
  return statements
}

/** `FOO=bar git push` -- environment assignments come before the command name. */
const ENV_ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/

/** The command name, lowercased and stripped of any directory. */
function commandName(token) {
  return basename(token.replace(/\\/g, '/')).toLowerCase()
}

/** Index of the command name in a statement, past any environment assignments. */
function nameIndex(tokens) {
  let i = 0
  while (i < tokens.length && ENV_ASSIGNMENT.test(tokens[i])) i++
  return i < tokens.length ? i : -1
}

/** git's own options that take a SEPARATE argument, which must be skipped along with their value. */
const GIT_OPTS_WITH_VALUE = new Set([
  '-C',
  '-c',
  '--git-dir',
  '--work-tree',
  '--namespace',
  '--exec-path',
])

/**
 * The git subcommand and its arguments, or `null` if the statement is not a git invocation.
 *
 * Skipping git's global options is what closes the `git -C /repo push origin main` bypass: the
 * subcommand is found by position past the options, not by looking for the string `git push`.
 */
function gitCall(tokens) {
  const start = nameIndex(tokens)
  if (start === -1) return null
  const name = commandName(tokens[start])
  if (name !== 'git' && name !== 'git.exe') return null

  let i = start + 1
  while (i < tokens.length) {
    const t = tokens[i]
    if (GIT_OPTS_WITH_VALUE.has(t)) {
      i += 2
      continue
    }
    if (t.startsWith('-')) {
      i++
      continue
    }
    break
  }
  if (i >= tokens.length) return null
  return { sub: tokens[i].toLowerCase(), rest: tokens.slice(i + 1) }
}

/** Shells whose `-c` argument is another command line, and must therefore be parsed as one. */
const INTERPRETERS = new Set(['bash', 'sh', 'zsh', 'dash', 'ksh', 'pwsh', 'powershell'])
const INLINE_FLAGS = new Set(['-c', '-command', '--command', '/c', '-e'])

/** Command lines embedded in a `bash -c '...'` style invocation. */
function inlineScripts(tokens) {
  const start = nameIndex(tokens)
  if (start === -1) return []
  if (!INTERPRETERS.has(commandName(tokens[start]).replace(/\.exe$/, ''))) return []
  const out = []
  for (let i = start + 1; i < tokens.length; i++) {
    if (INLINE_FLAGS.has(tokens[i].toLowerCase()) && i + 1 < tokens.length) out.push(tokens[i + 1])
  }
  return out
}

/**
 * gh's flags that take a SEPARATE value and can come before the words that name the command: `-R`
 * and `--repo`, which every `pr` and `issue` command inherits, and each `gh api` flag that takes one,
 * since `gh api -X POST <endpoint>` is the usual order. A value-taking flag missing from this set
 * makes its value read as a command word, so the call matches a wrong group or none, never a rule
 * it should not.
 */
const GH_OPTS_WITH_VALUE = new Set([
  '-R',
  '--repo',
  '--hostname',
  '-X',
  '--method',
  '-H',
  '--header',
  '-f',
  '--raw-field',
  '-F',
  '--field',
  '--input',
  '-q',
  '--jq',
  '-t',
  '--template',
  '--cache',
  '-p',
  '--preview',
])

/**
 * The `gh` command group, subcommand and arguments -- `gh --repo o/r pr create --fill` becomes
 * `{ group: 'pr', sub: 'create', rest: ['--repo', 'o/r', '--fill'] }` -- or `null` if this is not a
 * `gh` invocation. For `gh api`, `sub` is the endpoint.
 *
 * The first two bare words name the command wherever the flags sit, and `rest` is every other
 * token, the flags before them included. Until 2026-09-26 the scan stopped at the first flag, so
 * `gh --repo o/r pr create` with no `--base` matched no rule and passed the PR-base rule, and
 * `gh api -X POST <endpoint>` could not be read at all (found in asdlc-openspec-g1b's premise check).
 */
function ghCall(tokens) {
  const start = nameIndex(tokens)
  if (start === -1) return null
  if (commandName(tokens[start]).replace(/\.exe$/, '') !== 'gh') return null
  const words = []
  const rest = []
  let i = start + 1
  while (i < tokens.length && words.length < 2) {
    const t = tokens[i]
    if (GH_OPTS_WITH_VALUE.has(t)) {
      rest.push(...tokens.slice(i, i + 2))
      i += 2
      continue
    }
    if (t.startsWith('-')) rest.push(t)
    else words.push(t)
    i++
  }
  if (words.length < 2) return null
  const group = words[0].toLowerCase()
  const sub = words[1].toLowerCase()
  // `gh pr new` is gh's own alias of `gh pr create` (`gh help pr create`, ALIASES), and until
  // 2026-09-26 it passed every rule written for `create`.
  return {
    group,
    sub: group === 'pr' && sub === 'new' ? 'create' : sub,
    rest: [...rest, ...tokens.slice(i)],
  }
}

/* ============================================================================================= *
 * Refs.
 * ============================================================================================= */

/**
 * The branch a ref token would land on: `+HEAD:refs/heads/main` -> `main`.
 *
 * The DESTINATION half of a refspec is the half that matters -- `git push origin HEAD:main` and
 * `git push origin :main` (which deletes it) both target `main` without containing `main` as a
 * standalone word.
 */
function refTarget(token) {
  const parts = token.replace(/^\+/, '').split(':')
  return parts[parts.length - 1].replace(/^refs\/heads\//, '')
}

const isOption = (t) => t.startsWith('-')
const nonOptions = (rest) => rest.filter((t) => !isOption(t) && t !== '')

/* ============================================================================================= *
 * Rules.
 * ============================================================================================= */

/**
 * The repository's trunk -- the branch checked out in the primary worktree, the base every agent
 * branch is cut from, and the target of every pull request. Renaming trunk is this one line rather
 * than a dozen scattered string literals, and the only reason a rename
 * is cheap is that it is named once.
 */
const TRUNK = 'main'
const TRUNK_REMOTE = `origin/${TRUNK}`

/**
 * Every long-lived branch, not just the trunk: the protected branches CLAUDE.md § Git workflow
 * names, the trunk and `release`. No `release` branch existed on 2026-09-23 (`git ls-remote --heads
 * origin`); naming it now means the day one is cut it is guarded from its first push, rather than
 * from the first time an agent has already written it. The trunk is spelled through `TRUNK`, so a
 * trunk rename cannot quietly drop it from this set.
 */
const PROTECTED = new Set([TRUNK, 'release'])
const protectedNames = [...PROTECTED].join(', ')

/** Does this ref token land on a branch a task agent must not write? */
const isProtected = (t) => PROTECTED.has(refTarget(t))

const PUSH = `you cannot push to a long-lived branch (${protectedNames}). Push your own branch and open a PR against ${TRUNK}.`
const CHECKOUT = `you cannot switch to or rewrite a long-lived branch (${protectedNames}); ${TRUNK} is checked out in the primary worktree and git would refuse anyway. Stay on your branch.`
const MERGE = `rebase onto ${TRUNK_REMOTE} rather than merging ${TRUNK} into your branch.`
const WORKTREE = 'worktree management belongs to the orchestrator, not to a task agent.'
const OBJECTS = 'the object store is shared with sibling worktrees currently in use.'
const WORKTREE_PRUNE =
  '`git worktree prune` takes every record git reads as stale, and in a dev container on a ' +
  "bind-mounted clone that is every worktree made on the host, whose path the container cannot see " +
  '(asdlc-openspec-486e). `git worktree prune --dry-run` shows what it would take; the prune is a ' +
  "person's, run where every record it names is really gone."

/**
 * A `git worktree prune` that would prune. Only a dry run passes, and only one spelt from this list
 * alone: git honours the last of `--dry-run --no-dry-run` and accepts an abbreviated option, so a
 * guard that looked for `--dry-run` anywhere let a prune through.
 */
const DRY_RUN_ONLY = new Set(['-n', '--dry-run', '-v', '--verbose'])
const isBarePrune = ({ sub, rest }) => {
  if (sub !== 'worktree' || nonOptions(rest)[0] !== 'prune') return false
  const flags = rest.slice(rest.indexOf('prune') + 1)
  const dryRun = flags.every((t) => DRY_RUN_ONLY.has(t)) && flags.some((t) => t === '-n' || t === '--dry-run')
  return !dryRun
}

/** Flags that create or reset a branch; the name that FOLLOWS one is the branch being written. */
const BRANCH_CREATE = new Set(['-b', '-B', '-c', '-C'])
/** Flags that make `git branch` a write rather than a read. */
const BRANCH_WRITE = new Set(['-f', '--force', '-m', '-M', '-d', '-D', '--delete', '--move'])

/**
 * The reason to deny this git call, or `null` to allow it.
 *
 * `rebase` is deliberately absent: `.worktree/CONTEXT.md` instructs agents to rebase onto
 * `origin/main`, and forbidding it here would contradict the briefing.
 */
function denialFor({ sub, rest }) {
  switch (sub) {
    case 'push': {
      // `--all` and `--mirror` name no ref and push every local branch, the protected ones
      // included. This is the case the substring version allowed outright.
      if (rest.some((t) => t === '--all' || t === '--mirror')) return PUSH
      return nonOptions(rest).some(isProtected) ? PUSH : null
    }
    case 'checkout':
    case 'switch': {
      // `git checkout main -- path` restores one file FROM main without switching branches, which
      // is not the thing this rule exists to stop. An explicit `--` says the command is about
      // paths, so nothing is being checked out.
      if (rest.includes('--')) return null
      // `-b agent/x main` creates a branch FROM main, which is fine. `-B main` rewrites main.
      // Same for the other protected names.
      const created = rest.findIndex((t) => BRANCH_CREATE.has(t))
      if (created !== -1) return isProtected(rest[created + 1] ?? '') ? CHECKOUT : null
      return nonOptions(rest).some(isProtected) ? CHECKOUT : null
    }
    case 'branch': {
      if (!rest.some((t) => BRANCH_WRITE.has(t))) return null
      return nonOptions(rest).some(isProtected) ? CHECKOUT : null
    }
    case 'merge':
      return nonOptions(rest).some((t) =>
        t.startsWith('origin/') ? PROTECTED.has(t.slice(7)) : isProtected(t),
      )
        ? MERGE
        : null
    case 'worktree':
      return WORKTREE
    case 'gc':
    case 'prune':
      return OBJECTS
    case 'reflog':
      return rest.some((t) => t.toLowerCase() === 'expire') ? OBJECTS : null
    default:
      return null
  }
}

/* ============================================================================================= *
 * Pull requests.
 * ============================================================================================= */

const PR_BASE =
  `a pull request must name \`${TRUNK}\` as its base: \`gh pr create --base ${TRUNK} ...\`. ` +
  `The base is typed, never inferred: with no \`--base\`, gh takes the repository's GitHub default ` +
  `branch, a setting outside this repository that need not be the trunk.`
const PR_MERGE =
  `a merge now is the orchestrator's call, not a task agent's. From a worktree, ask GitHub to merge ` +
  `once \`verify\` and \`pr-review\` have passed, with \`prReviewMergeMethod\` in tools/policy/pr-review.json: ` +
  `\`gh pr merge <number> --auto --rebase\` (open-pr § 7).`
const PR_ADMIN =
  `\`--admin\` merges past the checks the trunk's ruleset requires, with the maintainer's bypass: ` +
  `that is a person's merge of a head on the high-risk floor, never an agent's (CLAUDE.md § Git ` +
  `workflow). Enable auto-merge with \`--auto\`, and leave a head on the floor to a person.`

/**
 * Does this `gh pr create` explicitly target the trunk?
 *
 * FALSE WHEN THE FLAG IS ABSENT, which is the whole point: `gh pr create` with no `--base` silently
 * uses the repository's default branch. That default is a GitHub setting this guard cannot read, so
 * "unspecified" is the exact failure this rule exists to catch -- not a case to wave through, even
 * while the default happens to be the trunk.
 */
function basesTrunk(rest) {
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]
    if (t === '--base' || t === '-B') return refTarget(rest[i + 1] ?? '') === TRUNK
    if (t.startsWith('--base=')) return refTarget(t.slice('--base='.length)) === TRUNK
  }
  return false
}

/* ============================================================================================= *
 * Every `gh` rule together.
 * ============================================================================================= */

/**
 * Whether `rest` sets the boolean flag `name`: `--name`, or `--name=<value>` with any value but
 * `false`, as gh's flag parser reads it.
 */
const flagSet = (rest, name) =>
  rest.some((t) => t === name || (t.startsWith(`${name}=`) && t.slice(name.length + 1) !== 'false'))

/**
 * The reason to deny this `gh` call, or `null` to allow it. Only `gh pr` is judged.
 *
 * `linked` separates two different kinds of rule that happen to share a command. The BASE rule is
 * about where an omitted `--base` falls back to -- a default branch set on GitHub, not here -- so it
 * is just as true in the primary checkout and applies everywhere. The ADMIN rule applies everywhere
 * too: this hook runs only on a session's commands, and a merge past the required checks is a
 * person's. The MERGE rule is about worktree isolation: a merge now is the orchestrator's call, and
 * in the primary checkout the orchestrator is the person typing, so blocking them there would be
 * wrong. Auto-merge, and turning it off, are not a merge now: GitHub merges once the checks pass.
 */
function denialForGh({ group, sub, rest }, linked) {
  if (group !== 'pr') return null
  if (sub === 'create') return basesTrunk(rest) ? null : PR_BASE
  if (sub === 'merge') {
    if (flagSet(rest, '--admin')) return PR_ADMIN
    if (linked && !flagSet(rest, '--auto') && !flagSet(rest, '--disable-auto')) return PR_MERGE
  }
  return null
}

/* ============================================================================================= *
 * The local code graph.
 * ============================================================================================= */

/**
 * graphify's commands that erode the local code graph, each spelled as the words graphify reads it
 * by, with what it does; each says it without naming another graphify command, so a refusal names
 * its own alone. graphify 0.9.73 takes its command from its first argument and a second word from its
 * second, with no option before them (its `__main__.py` and `cli.py`), so a command matches by
 * position and nowhere else; re-read both when the `pypi:graphifyy` pin in mise.toml moves. Every
 * other command still runs: `query`, `path` and `explain` read the graph, and `extract` builds it
 * as `mise run code-graph` does.
 */
const ERODES = 'the local code graph through the path that erodes its document layer'
const GRAPHIFY_ERODING = new Map([
  ['update', `rebuilds ${ERODES}`],
  ['watch', `rebuilds, on every change it sees, ${ERODES}`],
  ['hook install', `installs git hooks that rebuild ${ERODES}`],
  ['claude install', `writes into CLAUDE.md graphify's advice to rebuild ${ERODES}`],
])

/**
 * The arguments that make graphify print a line of help and do nothing else, wherever they sit after
 * its command: its `__main__.py`, the "universal help guard", which exempts none of the four above.
 */
const GRAPHIFY_HELP = new Set(['-h', '--help', '-?'])

/** A Python interpreter, which runs graphify as a module: `python3 -m graphify update`. */
const PYTHON = /^(?:python[0-9.]*|py)$/
/** The modules that run graphify's command line: the package, and its `__main__` by name. */
const GRAPHIFY_MODULES = new Set(['graphify', 'graphify.__main__'])
/** Python's short options that take a value, as the rest of their token or as the next one. */
const PYTHON_SHORT_WITH_VALUE = new Set(['W', 'X'])
/** Python's long options that take a SEPARATE value. */
const PYTHON_LONG_WITH_VALUE = new Set(['--check-hash-based-pycs'])

/**
 * The arguments after the module a Python command line runs, read as Python reads its options, or
 * `null` when it runs no module that is graphify's. Short options may group, `-um graphify`, and
 * `-m`, `-W` and `-X` take the rest of their token as their value, `-mgraphify`, or else the next
 * token. A `-c` ends the options with a script, which is not read; so does anything not an option.
 */
function pythonModuleArgs(tokens, start) {
  for (let i = start; i < tokens.length; i++) {
    const t = tokens[i]
    if (!t.startsWith('-') || t === '-') return null
    if (t.startsWith('--')) {
      if (PYTHON_LONG_WITH_VALUE.has(t)) i++
      continue
    }
    for (let j = 1; j < t.length; j++) {
      const rest = t.slice(j + 1)
      if (t[j] === 'c') return null
      if (t[j] === 'm') {
        const module = rest !== '' ? rest : tokens[i + 1]
        return GRAPHIFY_MODULES.has(module) ? tokens.slice(rest !== '' ? i + 1 : i + 2) : null
      }
      if (PYTHON_SHORT_WITH_VALUE.has(t[j])) {
        if (rest === '') i++
        break
      }
    }
  }
  return null
}

/**
 * graphify's arguments, or `null` if the statement does not run graphify: `graphify update .` by any
 * path, or graphify run as a Python module (`pythonModuleArgs`).
 */
function graphifyArgs(tokens) {
  const start = nameIndex(tokens)
  if (start === -1) return null
  const name = commandName(tokens[start]).replace(/\.exe$/, '')
  if (name === 'graphify') return tokens.slice(start + 1)
  return PYTHON.test(name) ? pythonModuleArgs(tokens, start + 1) : null
}

const GRAPHIFY = (words, does) =>
  `\`graphify ${words}\` ${does} (docs/decisions.md § D-20). A person builds and refreshes the ` +
  'graph with `mise run code-graph`, which spends their own plan, so do not run it yourself; if the ' +
  'graph needs a refresh, say so in your report.'

/** The reason to deny a graphify call with these arguments, or `null` to allow it. */
function graphifyDenial(args) {
  if (args.slice(1).some((a) => GRAPHIFY_HELP.has(a))) return null
  const words = [args.slice(0, 2).join(' '), args[0]].find((w) => GRAPHIFY_ERODING.has(w))
  return words === undefined ? null : GRAPHIFY(words, GRAPHIFY_ERODING.get(words))
}

/* ============================================================================================= *
 * Walk.
 * ============================================================================================= */

/**
 * Walk every statement, descending into `bash -c` strings. Returns the first reason to deny.
 *
 * The git rules are worktree-only and are skipped entirely when `linked` is false; the `gh` rules
 * decide for themselves (see `denialForGh`), and the graphify rule applies everywhere
 * (`graphifyDenial`). In a stray worktree directory (`strayWorktreeDir`)
 * every git call is refused, whatever it is: git there answers for another checkout.
 */
function inspect(command, linked, stray, depth = 0) {
  if (depth > 2) return null
  for (const tokens of parse(command)) {
    const reason = inspectStatement(tokens, linked, stray, depth)
    if (reason !== null) return reason
  }
  return null
}

/** One statement's reason to deny, or `null`. */
function inspectStatement(tokens, linked, stray, depth) {
  const call = gitCall(tokens)
  if (call !== null && stray !== null) return strayDenial(stray)
  if (call !== null && isBarePrune(call)) return WORKTREE_PRUNE
  if (call !== null && linked) {
    const reason = denialFor(call)
    if (reason !== null) return reason
  }
  const gh = ghCall(tokens)
  if (gh !== null) {
    const reason = denialForGh(gh, linked)
    if (reason !== null) return reason
  }
  const graphify = graphifyArgs(tokens)
  if (graphify !== null) {
    const reason = graphifyDenial(graphify)
    if (reason !== null) return reason
  }
  for (const script of inlineScripts(tokens)) {
    const reason = inspect(script, linked, stray, depth + 1)
    if (reason !== null) return reason
  }
  return null
}

/* ============================================================================================= *
 * Entry point.
 * ============================================================================================= */

function deny(reason) {
  process.stderr.write(`BLOCKED by repository policy: ${reason}\n`)
  process.exit(2)
}

// Run by hand, with no payload on stdin: nothing to judge.
if (process.stdin.isTTY) process.exit(0)

// Read stdin BEFORE deciding anything, so the writer never meets a closed pipe.
const input = await readHookInput()
const dir = commandDir(input)
const linked = inLinkedWorktree(dir)
// Only where git found no linked worktree: in one, `--show-toplevel` is that worktree by definition.
const stray = linked ? null : strayWorktreeDir(dir)

// THE WORKTREE WAS NOT PROVISIONED BY THE SCRIPT. Refuse everything, not just git: the agent is
// about to do real work against a commit it did not choose, and every command it runs deepens that.
// Escaping does not need the shell -- `ExitWorktree` is a tool -- so refusing every Bash command
// leaves a way out rather than a deadlock.
const unprovisioned = linked ? unprovisionedWorktree(dir) : null
if (unprovisioned !== null) {
  const { branch, behind } = unprovisioned
  // A distance of 0 or an unanswerable one says nothing: while the default branch is the trunk, a
  // native fallback can start from the same commit the script would have.
  const distance = behind !== null && behind > 0 ? `, ${behind} commit(s) behind ${TRUNK_REMOTE}` : ''
  deny(
    `this worktree is on '${branch}', not an agent/* branch${distance}. Every worktree here is ` +
      `provisioned by scripts/new-worktree.sh, which cuts agent/<name> from ${TRUNK_REMOTE} and ` +
      "renders the briefing .worktree/CONTEXT.md. A 'worktree-*' branch is the EnterWorktree " +
      "tool's native fallback, which it uses when the WorktreeCreate hook is not registered -- " +
      'Claude Code snapshots hook config at session start, so a session that began before the hook ' +
      'was added never sees it, takes its base from the worktree.baseRef setting instead, and ' +
      'renders no briefing. Do not work here; the checkout may not contain what you were sent to ' +
      "see, and nothing in it states this repository's rules. Leave with ExitWorktree (action: " +
      '"remove"), then re-enter -- restarting an old session re-reads the hook configuration.',
  )
}

// FAILING CLOSED IS A WORKTREE RULE, NOT A GLOBAL ONE. Inside a linked worktree an unreadable
// payload must not be waved through -- that was the original defect. In the primary checkout the
// same strictness would block every command in the repository over a hook plumbing fault, which is
// far worse than the one mistake left unguarded there, so an unreadable payload is allowed instead.
if (input === null || typeof input?.tool_input?.command !== 'string') {
  if (!linked && stray === null) process.exit(0)
  deny(
    'the hook payload could not be read, so this command cannot be checked against the worktree ' +
      'rules. This guard fails closed by design.',
  )
}

const command = input.tool_input.command
if (command.trim() === '') process.exit(0)

const reason = inspect(command, linked, stray)
if (reason !== null) deny(reason)
process.exit(0)
