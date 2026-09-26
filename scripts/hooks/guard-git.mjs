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
 * whether the command runs in a linked worktree and skips every git rule if not. The PR-base and
 * approval-label rules below are the exceptions and apply everywhere, because what they guard is not
 * worktree isolation. Where the command runs is the payload's `cwd`, never `CLAUDE_PROJECT_DIR`;
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
 * IT ALSO GUARDS THE PR BASE, EVERYWHERE. `gh pr create` with no `--base` uses the repository's
 * DEFAULT branch: a GitHub setting that lives outside this repository, that this guard cannot read,
 * and that need not be the trunk. Whoever omits the flag gets whatever that setting says when the
 * command runs, and the mistake is invisible until a human looks. The rule does not rest on `main`
 * being protected on GitHub, and it is not: on 2026-09-23 the branch-protection endpoint answered
 * 404 and the rulesets applying to `main` were empty. The trunk is `main`; the base is typed, never
 * inferred (CLAUDE.md § Git workflow). That has nothing to do with worktrees, so unlike the git
 * rules it is enforced in the primary checkout too.
 *
 * IT ALSO GUARDS THE APPROVAL LABEL, EVERYWHERE. It refuses a `gh` command that applies the
 * reviewer's approval label, `prReviewLabels.approved` in `tools/policy.json`, in any letter case,
 * alone or in a comma-separated list: `gh pr edit` or `gh issue edit` with `--add-label`, `gh pr
 * create` with `--label`, and `gh api` writing an issue's labels with a `labels` field. It also
 * refuses a `gh api` label write whose body it cannot read (`--input`, a `-F labels…=@file` field),
 * and any label at all while it cannot read the policy. The reviewer merges a high-risk pull request
 * once that label is applied after its verdict by an account with write access, and it cannot tell a
 * person from an agent holding their credentials (docs/decisions.md § R-01). No incident yet: were
 * this rule wrong, an agent could apply the label, and a pull request no person read would merge. It
 * holds in the primary checkout too, because the hook runs only on a session's Bash calls, and a
 * person approves from the web UI or a terminal of their own. It reads only the command line, so a
 * label applied through the web UI, curl, a browser tool, a GraphQL mutation (which names a label by
 * its id) or a program the command starts passes it. It reads the policy only when a command applies
 * a label, from this file's own checkout, the one the session started in (`.claude/README.md`
 * § The hooks); `GUARD_GIT_ROOT` names another checkout, so a by-hand run or the selftest can point
 * it at a doctored copy. The rule needs nothing but that file:
 *
 *   printf '%s' '{"tool_input":{"command":"gh pr edit 1 --add-label x"}}' | GUARD_GIT_ROOT=/tmp/copy node scripts/hooks/guard-git.mjs
 *
 * Exit 2 is the documented way for a PreToolUse hook to block, and stderr becomes the reason shown
 * to the agent -- which is what turns a blocked attempt into a course correction rather than a
 * confused retry loop.
 */
import { spawnSync } from 'node:child_process'
import { basename, join } from 'node:path'
import { readHookInput, readOr, ROOT } from './_shared.mjs'

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
 */
function gitOut(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true })
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
const PR_MERGE = `merging is the orchestrator's call, not a task agent's. Open the PR and stop.`

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
 * The approval label, then every `gh` rule together.
 * ============================================================================================= */

/** Where the approval label is spelled. `GUARD_GIT_ROOT` points a by-hand run at a doctored copy. */
const POLICY = join(process.env.GUARD_GIT_ROOT ?? ROOT, 'tools', 'policy.json')

/**
 * `prReviewLabels.approved` from the policy, or `null` when the file cannot be read or does not
 * spell it. Read only once a command is found to apply a label, so every other command costs nothing.
 */
function approvalLabel() {
  try {
    const label = JSON.parse(readOr(POLICY, 'null'))?.prReviewLabels?.approved
    return typeof label === 'string' && label.trim() !== '' ? label : null
  } catch {
    return null
  }
}

/**
 * Every value `rest` gives any of `names`: `--name value`, `--name=value`, and for a short flag
 * `-n value`, `-nvalue` and `-n=value`, as gh's flag parser reads them.
 */
function flagValues(rest, names) {
  const out = []
  for (let i = 0; i < rest.length; i++) {
    const t = rest[i]
    for (const name of names) {
      if (t === name) {
        if (i + 1 < rest.length) out.push(rest[i + 1])
      } else if (name.startsWith('--')) {
        if (t.startsWith(`${name}=`)) out.push(t.slice(name.length + 1))
      } else if (t.startsWith(name) && !t.startsWith('--')) {
        out.push(t.slice(name.length).replace(/^=/, ''))
      }
    }
  }
  return out
}

/** Each label a list of values names, split at commas as `--add-label "a,b"` is. */
const labelNames = (values) =>
  values.flatMap((v) => v.split(',')).map((v) => v.trim()).filter((v) => v !== '')

/** The body of a `gh api` label write is out of sight: this stands for "labels it cannot read". */
const UNSEEN = Symbol('unseen')

/**
 * An issue's own endpoint, or its labels: `repos/<owner>/<repo>/issues/<n>` and `…/labels`, with or
 * without a leading slash or the API's host. A pull request is an issue here, and both accept labels
 * by `POST`, `PUT` or `PATCH`.
 */
const ISSUE_ENDPOINT = /(?:^|\/)repos\/[^/]+\/[^/]+\/issues\/[^/?]+(?:\/labels)?\/?(?:\?.*)?$/
const LABEL_WRITES = new Set(['POST', 'PUT', 'PATCH'])

/** The labels a `gh api` call writes to an issue, `UNSEEN`, or `null` if it writes none. */
function apiLabels(endpoint, rest) {
  if (!ISSUE_ENDPOINT.test(endpoint)) return null
  const raw = flagValues(rest, ['-f', '--raw-field'])
  const typed = flagValues(rest, ['-F', '--field'])
  const input = flagValues(rest, ['--input'])
  // gh's own default: GET, or POST once a field or a body is given.
  const methods = flagValues(rest, ['-X', '--method'])
  const method =
    methods.length > 0
      ? methods[methods.length - 1].toUpperCase()
      : raw.length + typed.length + input.length > 0
        ? 'POST'
        : 'GET'
  if (!LABEL_WRITES.has(method)) return null
  const isLabels = (field) => /^labels(?:\[|=|$)/.test(field)
  const value = (field) => field.slice(field.indexOf('=') + 1)
  if (input.length > 0) return UNSEEN
  if (typed.filter(isLabels).some((f) => value(f).startsWith('@'))) return UNSEEN
  const names = labelNames([...raw, ...typed].filter(isLabels).map(value))
  return names.length > 0 ? names : null
}

/** The labels this `gh` call applies, `UNSEEN`, or `null` if it applies none. */
function labelsApplied({ group, sub, rest }) {
  let names = []
  if ((group === 'pr' || group === 'issue') && sub === 'edit') {
    names = labelNames(flagValues(rest, ['--add-label']))
  } else if (group === 'pr' && sub === 'create') {
    names = labelNames(flagValues(rest, ['--label', '-l']))
  } else if (group === 'api') {
    return apiLabels(sub, rest)
  }
  return names.length > 0 ? names : null
}

const APPROVAL = (label) =>
  `\`${label}\` is the reviewer's approval label (prReviewLabels.approved in tools/policy.json), ` +
  `and a person applies it, never an agent: the reviewer merges a high-risk pull request on it, and ` +
  `cannot tell a person from an agent holding their credentials (CLAUDE.md § Git workflow, ` +
  `docs/decisions.md § R-01). Leave the pull request waiting for a person, and say so in your report.`
const LABEL_UNSEEN = (label) =>
  `this writes an issue's labels from a body the guard cannot read (\`--input\`, or a ` +
  `\`-F labels…=@file\` field), so it cannot tell whether it applies \`${label}\`, the reviewer's ` +
  `approval label, which a person applies, never an agent (CLAUDE.md § Git workflow). Pass each ` +
  `label as \`-f labels[]=<name>\`, or use \`gh pr edit --add-label\`.`
const POLICY_UNREAD =
  `this applies a label, and \`prReviewLabels.approved\` could not be read from ${POLICY}, so the ` +
  `guard cannot tell whether it is the reviewer's approval label, which a person applies, never an ` +
  `agent (CLAUDE.md § Git workflow). It refuses every label until the policy reads.`

/**
 * The reason to deny a `gh` call that applies the approval label, or `null` to allow it.
 *
 * Label names match in any letter case, because GitHub resolves them that way: `Review:Approved`
 * applies the label the policy spells in lower case, and the reviewer counts it.
 */
function approvalDenial(call) {
  const applied = labelsApplied(call)
  if (applied === null) return null
  const label = approvalLabel()
  if (label === null) return POLICY_UNREAD
  if (applied === UNSEEN) return LABEL_UNSEEN(label)
  const wanted = label.toLowerCase()
  return applied.some((name) => name.toLowerCase() === wanted) ? APPROVAL(label) : null
}

/**
 * The reason to deny this `gh` call, or `null` to allow it. The approval label is judged on every
 * call; otherwise only `gh pr` is.
 *
 * `linked` separates two different kinds of rule that happen to share a command. The BASE rule is
 * about where an omitted `--base` falls back to -- a default branch set on GitHub, not here -- so it
 * is just as true in the primary checkout and applies everywhere. The approval-label rule applies
 * everywhere too: this hook runs only on a session's commands, and the label is a person's to apply.
 * The MERGE rule is about worktree isolation: merging is the orchestrator's call, and in the primary
 * checkout the orchestrator is the person typing, so blocking them there would be wrong.
 */
function denialForGh(call, linked) {
  const approval = approvalDenial(call)
  if (approval !== null) return approval
  const { group, sub, rest } = call
  if (group !== 'pr') return null
  if (sub === 'create') return basesTrunk(rest) ? null : PR_BASE
  if (sub === 'merge') return linked ? PR_MERGE : null
  return null
}

/* ============================================================================================= *
 * Walk.
 * ============================================================================================= */

/**
 * Walk every statement, descending into `bash -c` strings. Returns the first reason to deny.
 *
 * The git rules are worktree-only and are skipped entirely when `linked` is false; the `gh` rules
 * decide for themselves (see `denialForGh`).
 */
function inspect(command, linked, depth = 0) {
  if (depth > 2) return null
  for (const tokens of parse(command)) {
    if (linked) {
      const call = gitCall(tokens)
      if (call !== null) {
        const reason = denialFor(call)
        if (reason !== null) return reason
      }
    }
    const gh = ghCall(tokens)
    if (gh !== null) {
      const reason = denialForGh(gh, linked)
      if (reason !== null) return reason
    }
    for (const script of inlineScripts(tokens)) {
      const reason = inspect(script, linked, depth + 1)
      if (reason !== null) return reason
    }
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
  if (!linked) process.exit(0)
  deny(
    'the hook payload could not be read, so this command cannot be checked against the worktree ' +
      'rules. This guard fails closed by design.',
  )
}

const command = input.tool_input.command
if (command.trim() === '') process.exit(0)

const reason = inspect(command, linked)
if (reason !== null) deny(reason)
process.exit(0)
