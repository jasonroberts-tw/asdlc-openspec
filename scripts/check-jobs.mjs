/**
 * Job-to-task cross-check gate: the hooks and CI invoke only tasks that exist, through the launcher
 * that reads them, every task they do not invoke is of a kind this file declares, every file a task
 * names is there as it is spelled, and the tasks have one registry.
 *
 *   mise run check:jobs             the gate; prints the re-derived breakdown on every run
 *   mise run check:jobs:selftest    its fixtures -- every assertion exercised on a doctored copy
 *   CHECK_JOBS_ROOT=<dir> mise run check:jobs
 *                                  the same gate over a copy of the tree, with the paths the copy's
 *                                  tasks name resolved inside the copy too
 *
 * THE JOB THIS EXISTS FOR. A task is a public name and nothing gates its citations
 * (the add-task skill opens with that sentence). Two failures follow, and both
 * have happened here. A job names a script that was renamed or deleted: the hook or the CI step then
 * fails on the next push for a reason unrelated to the change being pushed, which is how a gate gets
 * passed with `--no-verify`. And a gate-shaped script is defined and invoked by NOTHING: a
 * selftest sat in `package.json` with no job in either file, a regression suite that reported the
 * past, and a `:check` went red for six weeks before anything wired it. The same cross-check, run
 * by hand and quoted in a note, was found false at the next verification. A cross-check quoted in
 * a note measures one commit. This is the gate.
 *
 * `apps/` IS THE THIRD ROOT since 2026-09-24, when `calculator:serve` and `calculator:test` became
 * the first scripts to name a file there. Wrong here, the gate would pass a `calculator:serve`
 * repointed at a file that is not there, a dead public name found only when a person runs it; and a
 * `calculator:test` whose quoted glob matches nothing, which the old expression never read at all.
 * The glob half answers a measurement: on 2026-09-23 (asdlc-openspec-frm) `node --test` over a
 * quoted glob that matched no file printed `tests 0` and exited 0, so the job and the CI step would
 * read green over a suite that ran nothing. This gate refuses the empty match at push. A matched
 * file with no test in it still passes, so it narrows that bug rather than closing it.
 *
 * A GLOB IS EXPANDED BY `fs.globSync`, the expansion `scripts/run-tests.mjs` hands the test runner,
 * since 2026-09-26 (asdlc-openspec-pta). The wrong fix came first: on 2026-09-24 the brief for
 * asdlc-openspec-zgh.5 said `fs.globSync` was not stable in the Node floor, so a matcher was written
 * here by hand, reading `*` and `?` within one directory and refusing `**` and `[...]`. Node had
 * marked `fs.globSync` stable in 22.17.0 (nodejs/node#57513), inside the floor. A matcher of the
 * gate's own can disagree with the runner either way: pass a glob the runner expands to nothing, or
 * refuse one it runs. The same change reads a path's case from the directory listings: `existsSync`
 * ignores case on macOS, so it would pass `apps/Calculator/serve.js` at a Mac's push, and CI, which
 * runs on Linux, would then fail.
 *
 * WHICH SCRIPTS. The tree's tasks, read through `scripts/lib/tasks.mjs`: `tasks.toml` where the tree
 * has one, `package.json`'s `scripts` otherwise, as a tree from before the move to mise has them. A
 * manifest that loader refuses fails the job with its reason. Below, "script" means a task of either.
 * Beside a `tasks.toml`, `package.json` keeps the scripts `PACKAGE_SCRIPTS` names, and they are read
 * too, by the loader's own parser, for rules 1, 4, 5 and 6.
 *
 * WHAT FAILS THE JOB:
 *   1. an `npm run <name>`, `node --run <name>` or `mise run <name>` token in a `run:` of
 *      `git-hooks.yml` or `.github/workflows/verify.yml` whose <name> is not a script of the registry
 *      that launcher reads: `mise run`, the tasks; `npm run` and `node --run`, `package.json` alone.
 *      So a job left on `node --run check:jobs` beside a `tasks.toml` fails here, not at the push.
 *      Comment lines are not read -- both files quote scripts they deliberately do NOT run -- and a
 *      multi-line `run: |` block is.
 *   2. a script with no `run:` token in either file that `UNJOBBED_BY_KIND` below
 *      does not declare. A gate-shaped one (`check:*`, `*:check`, `*:selftest`, `*:selfcheck`) is
 *      reported as "wire it, or name the exception with its reason"; anything else as "declare its
 *      kind". Either way a new un-jobbed script fails on arrival rather than joining the list. It is
 *      not reported while a job file is missing or does not parse, since every script only that
 *      file runs would then read as un-jobbed.
 *   3. an `UNJOBBED_BY_KIND` entry that names no script, names one twice, names one that HAS a job
 *      (a stale exception is a hole in the gate -- `check-register-status.mjs`'s allowlist rule), or
 *      names one whose spelling contradicts the kind's shape.
 *   4. a script whose command names a `tools/`, `scripts/` or `apps/` path that does not exist on
 *      disk as spelled, case included, read from the directory listings rather than `existsSync`.
 *      A path opens at the start of the command, after whitespace, a quote, `=` or shell punctuation
 *      (`(` `;` `&` `|` `<` and a backtick), and after a leading `./`; it ends at whitespace, a quote
 *      or shell punctuation, `)` and `>` included. Neither the quotes nor the `./` are part of it. A
 *      path after a `>` redirect is not read: the command writes it, so it need not exist yet.
 *   5. a script whose command names such a path with a glob character (`*`, `?`, `[`, `{`) that
 *      matches no file. `fs.globSync` expands it as the runner does, `**`, `[...]` and `{a,b}`
 *      included, with `*` passing over a dotfile; a directory it matches is not a file, and a match
 *      counts only where its path is spelled on disk as it is in the glob, as in 4.
 *   6. beside a `tasks.toml`, a second registry: a `package.json` script `PACKAGE_SCRIPTS` does not
 *      name, or one it names missing; a task `tasks.toml` defines that `package.json` keeps; a task
 *      `mise.toml` defines; and a `mise.toml` whose `[task_config]` lacks `includes = ["tasks.toml"]`,
 *      under which mise reads none of the tasks, or `dir = "{{cwd}}"`, under which a task a worktree
 *      borrows from the primary checkout runs on the primary's files (asdlc-openspec-8juz.1,
 *      question 1). `scripts/check-toolchain.mjs` holds what else `mise.toml` may say.
 *
 * WHAT IS NOT CHECKED, deliberately: WHERE a jobbed script runs (pre-push, CI or both) -- that is
 * the README's Gate column, which a reviewer reads; whether a job's OTHER commands (`git diff`,
 * `npx prettier`, `bd hooks run`) resolve; the `pre-commit` jobs' `{staged_files}` templates; an
 * extglob such as `+(a|b)`, whose parentheses the path reader takes for shell punctuation; and the
 * case of the letters a wildcard segment matches.
 * `fs.globSync` and `path.matchesGlob` both match `*.TEST.js` to `server.test.js` on macOS (measured
 * with Node 26.8.1), so neither of Node's glob matchers reads that case on a Mac; CI, on Linux,
 * refuses such a glob.
 *
 * NEGATIVE TESTING. `--selftest` copies the five files it reads under `os.tmpdir()` and doctors ONE thing
 * per case, asserting the run fails FOR THAT REASON -- plus a control that the undoctored copy
 * passes, without which every other case could be failing on the copy. A case lists the failures it
 * expects, one expression each, and holds only when the run reports exactly those. Until
 * 2026-09-26 one matching failure was enough, and three cases passed while also failing on a fixture
 * file this repository does not have (fixed in asdlc-openspec-zgh.5). The harness's own rule is
 * checked before the cases. Paths and globs are resolved against the real tree, since a copy of
 * five files has no `tools/` or `apps/`: a path case doctors the copy's command line to name what
 * the real tree lacks. A case that needs a file the real tree lacks, such as a dotfile, doctors a
 * copy of the three roots instead. The control must read at least one `apps/` path and one glob, or
 * the apps cases have no passing twin. A case that moves the copy's tasks back into `package.json`
 * holds the shape a tree from before the move has. By hand, point `CHECK_JOBS_ROOT` at a copy, as
 * `check-register-status.mjs` does with `CHECK_REGISTER_ROOT`.
 *
 * Reads only committed files, and lists the directories a path or a glob names; no `../sibling`
 * checkout, no network, milliseconds. Needs `fs.globSync`, stable from Node 22.17.0, inside the
 * `engines` floor in `package.json`, and `smol-toml`, pinned by the lockfile, for `mise.toml` and,
 * through the loader, `tasks.toml`. `pre-push` and CI both, by the add-task skill's step on where a
 * gate runs.
 */
import {
  copyFileSync,
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { parse as parseToml } from 'smol-toml'
import { PACKAGE_JSON, TASKS_TOML, loadTasks, parseTasks, taskFiles } from './lib/tasks.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.CHECK_JOBS_ROOT ?? REPO_ROOT

const PACKAGE = PACKAGE_JSON
const MISE_TOML = 'mise.toml'
const HOOK_JOBS = 'git-hooks.yml'
const VERIFY = '.github/workflows/verify.yml'
const JOB_FILES = [HOOK_JOBS, VERIFY]
/** What `mise.toml`'s `[task_config]` must hold beside a `tasks.toml` (assertion 6), each with what goes wrong without it. */
const TASK_CONFIG = {
  dir: {
    value: '{{cwd}}',
    why:
      'a task a worktree lacks resolves to the primary checkout\'s, and then runs on the primary\'s files, so a gate' +
      ' passes on the wrong tree (asdlc-openspec-8juz.1, question 1).',
  },
  includes: {
    value: [TASKS_TOML],
    why: `mise then reads none of ${TASKS_TOML}'s tasks, so every job, CI step and \`runTask\` launch fails.`,
  },
}

/**
 * An invocation token inside a `run:` string: group 1 or 2 the launcher, group 3 the script.
 * `mise run` is the hooks' and CI's spelling, with `-q` or `--quiet` as `runTask` passes it; never
 * `--silent` there, which in mise silences the task's own output. It costs what `node --run`, the
 * hooks' launcher before it, cost: medians of 91-98 ms through `mise run` against 95 ms through
 * `node --run`, over 20 runs of `counts:check` (asdlc-openspec-8juz.1, question 5). `npm run`, with
 * the `--silent` npm's launcher took, and `node --run` read `package.json` alone, and resolve there.
 */
const RUN_TOKEN_RE = /\b(?:(npm run|node --run) (?:--silent )?|(mise run) (?:-q |--quiet )?)([A-Za-z0-9][A-Za-z0-9:._-]*)/g
/**
 * The scripts `package.json` keeps beside a `tasks.toml`, and no others (assertion 6), each with the
 * reason it stays there and the reason no job runs it. In a tree with no `tasks.toml` they are among
 * the manifest's scripts, declared un-jobbed by these same reasons.
 */
const PACKAGE_SCRIPTS = [
  {
    name: 'calculator:serve',
    why:
      'the command `openspec/specs/calculator-local-server/spec.md` names, run after `npm ci` with no' +
      ' other tool; it serves until a person stops it, so a job running it would never return, and' +
      ' `calculator:test` runs `apps/calculator/serve.js` itself and proves its behaviour.',
  },
  {
    name: 'prepare',
    why:
      "npm's lifecycle script, which `npm ci` runs after an install: it writes the hooks through" +
      ' `scripts/git-hooks.mjs --prepare`, and a job running it would write the config of the' +
      ' checkout it gates. `hooks:selftest` runs that install in scratch repositories.',
  },
]
const PACKAGE_NAMES = PACKAGE_SCRIPTS.map((entry) => entry.name)
/** The spellings this repository gives a gate: `check:<noun>`, and the `:check` / `:selftest` / `:selfcheck` twins. */
const GATE_SHAPED_RE = /^check:|:(?:check|selftest|selfcheck)$/
/**
 * The roots a script's paths are read under: a moved or misspelled script would otherwise pass this
 * gate and fail at the next push. `apps/` is the third, for the calculator's two scripts. Add a root
 * here the day a script of yours lives under a fourth one.
 */
const PATH_ROOTS = ['tools', 'scripts', 'apps']
/**
 * A repo-relative path under one of `PATH_ROOTS` on a script's command line (assertion 4 says where
 * one opens and ends). It opens after a quote because a glob is quoted so that the shell leaves it
 * for Node to expand (`calculator:test`), and after `=` because a flag spells its file there. Group 1
 * is set when the opener is a `>` redirect, whose target the command writes; group 2 is the path,
 * without its quotes or `./`. `\x60` is a backtick.
 */
const REPO_PATH_RE = new RegExp(
  String.raw`(?:^|(>)\|?\s*|[\s"'\x60=(;&|<])(?:\./)?((?:${PATH_ROOTS.join('|')})/[^\s"'\x60&|;<>()]+)`,
  'g',
)
/** A path with one of these is a glob, which existence cannot check (assertion 5). */
const GLOB_CHAR_RE = /[*?[{]/

/**
 * Every script that has no job, BY KIND, each kind with the reason its members are ungated. A name
 * here is a claim about the tasks and the two job files together, and assertion 3 holds every
 * claim: the script exists, no job runs it, and its spelling fits the kind. So the list cannot go
 * stale silently in either direction -- wire a listed script and its entry must go; retire one and
 * its entry must go; add an un-jobbed script and an entry must come.
 *
 * `shape` is a regex the kind's names must match, where the kind HAS a mechanical shape. Bare
 * emitters do not (`worktree:gc`), so that kind is a list and nothing more.
 */
const UNJOBBED_BY_KIND = [
  {
    kind: 'bare emitter or operator command',
    why:
      'writes an artifact or drives an operator procedure. Where it has a `:check` twin, the twin is' +
      ' the gate and the job runs that.',
    names: [
      'citations:support',
      'code-graph',
      'code-graph:mcp',
      'coupling',
      'harness',
      'harness:graph',
      'hooks:install',
      'trace',
      'worktree:gc',
    ],
  },
  {
    kind: ':update baseline',
    shape: /:update$/,
    why: 'rewrites a ratchet or golden; a job that ran it would move the baseline it is meant to hold.',
    names: ['coupling:update', 'thresholds:update', 'trace:update'],
  },
  {
    kind: 'lint and format',
    shape: /^(?:lint|format)(?::|$)/,
    why: 'the whole-repository and `--fix` forms; the jobbed forms are the ones a hook or CI runs.',
    names: [],
  },
  {
    kind: 'check that reads a sibling checkout',
    shape: /:check$/,
    why:
      'CI does not clone the sibling checkout, and a `--check` there would compare a real artifact' +
      ' against one with every source-derived signal zeroed.',
    names: [],
  },
  {
    kind: 'named exception',
    why: 'gate-shaped, or shaped like nothing above, and ungated for its own reason, each stated.',
    names: [
      {
        name: 'calculator:test:verify',
        why:
          "runs the test-builder's E2E tests and Verify-deferred fitness functions, which" +
          ' `docs/test-strategy.md` § Build exit criteria runs at Verify, not at a push or in CI.' +
          ' change-verify\'s fresh run, `scripts/fresh-run.mjs`, runs it in a clone of HEAD, as it runs' +
          ' every script that runs the test runner; no job does. Its `--dir` is also how the trace and' +
          ' test-inventory gates find those tests, and how the thresholds gate leaves them out of its' +
          ' runs (`scripts/lib/test-dirs.mjs`).',
      },
      {
        name: 'gates',
        why:
          'the suite itself (the pre-push block of `git-hooks.yml`, through `git hook run`, forced);' +
          ' a job invoking it would recurse.',
      },
      {
        name: 'tests:fresh',
        why:
          'the verifier\'s fresh run: it clones HEAD and runs `npm ci`, which reads the network, and' +
          ' `change-verify` runs it for one change; `tests:fresh:selftest` stands in at push and in CI' +
          ' (`docs/decisions.md` § D-15, item 3).',
      },
    ],
  },
]

const entryName = (entry) => (typeof entry === 'string' ? entry : entry.name)

/**
 * `path` under `root` as the directory listings spell it, with whether that is exactly how `path`
 * spells it; null when a segment names nothing in any case. `existsSync` cannot tell the two apart
 * on macOS, whose default file system ignores case, and Linux, where CI runs, does not.
 */
function onDisk(root, path) {
  const spelled = []
  let exact = true
  let dir = root
  for (const segment of path.split(/[\\/]/)) {
    if (segment === '' || segment === '.') continue
    let names
    try {
      names = readdirSync(dir)
    } catch {
      return null
    }
    let name = segment
    if (!names.includes(segment)) {
      exact = false
      name = names.find((candidate) => candidate.toLowerCase() === segment.toLowerCase())
      if (name === undefined) return null
    }
    spelled.push(name)
    dir = join(dir, name)
  }
  return { spelled: spelled.join('/'), exact }
}

/**
 * The files `pattern` matches under `root`, expanded by `fs.globSync` as `scripts/run-tests.mjs`
 * expands it for the test runner. A directory it matches is not a file. A match counts only where
 * the listings spell it as the glob does, since `fs.globSync` on macOS finds a fixed segment in any
 * case and returns it in the glob's spelling.
 */
function filesMatching(root, pattern) {
  return globSync(pattern, { cwd: root }).filter(
    (match) =>
      statSync(join(root, match), { throwIfNoEntry: false })?.isFile() &&
      onDisk(root, match)?.exact,
  )
}

/** Lines of a `run:` string that are not YAML-block comments. */
function withoutComments(run) {
  return run
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/**
 * Every `run:` string in a job file, with a label for the failure message. git-hooks.yml is
 * `<hook>: { jobs: [{ name, run }] }`, where a job may instead be `{ name, group: { jobs: [...] } }`,
 * whose jobs are read the same way; verify.yml is `jobs: { <job>: { steps: [{ name, run }] } }`.
 */
function runBlocks(file, doc) {
  const blocks = []
  if (file === HOOK_JOBS) {
    const walk = (where, jobs) => {
      for (const job of jobs) {
        const name = `${where}/${job?.name ?? '(unnamed)'}`
        if (Array.isArray(job?.group?.jobs)) walk(name, job.group.jobs)
        if (typeof job?.run === 'string') blocks.push({ where: name, run: job.run })
      }
    }
    for (const [hook, spec] of Object.entries(doc ?? {})) {
      if (Array.isArray(spec?.jobs)) walk(`${file} ${hook}`, spec.jobs)
    }
    return blocks
  }
  for (const [jobName, job] of Object.entries(doc?.jobs ?? {})) {
    const steps = Array.isArray(job?.steps) ? job.steps : []
    steps.forEach((step, index) => {
      if (typeof step?.run !== 'string') return
      blocks.push({
        where: `${file} ${jobName}/${step.name ?? `step ${index + 1}`}`,
        run: step.run,
      })
    })
  }
  return blocks
}

/** `path`'s text, or null where there is no file. */
const readOr = (path) => (existsSync(path) ? readFileSync(path, 'utf8') : null)

/**
 * Run every assertion against the tree at `root`. Returns the failures and the breakdown rather
 * than exiting, so the selftest can run it against doctored copies. `pathsRoot` is where assertions
 * 4 and 5 look for the named files and globs -- the real tree, when `root` is a five-file copy.
 */
export function runCheck(root, { pathsRoot = root } = {}) {
  const failures = []
  const fail = (message) => failures.push(message)

  let manifest
  try {
    manifest = loadTasks(root)
  } catch (error) {
    fail(error.message)
    return { failures, report: null }
  }
  if (manifest === null) {
    fail(`${PACKAGE} is missing at ${join(root, PACKAGE)}, and there is no ${TASKS_TOML} either.`)
    return { failures, report: null }
  }
  const { file, tasks: scripts } = manifest
  const moved = file === TASKS_TOML
  const kindOf = moved ? 'task' : 'script'
  const names = new Set(Object.keys(scripts))
  // The scripts `npm run` and `node --run` read: the manifest itself in a tree from before the move,
  // and beside a `tasks.toml`, `package.json`'s own, read by the loader's parser.
  let packageScripts = scripts
  if (moved) {
    const text = readOr(join(root, PACKAGE))
    try {
      packageScripts = text === null ? {} : parseTasks(PACKAGE, text)
    } catch (error) {
      fail(error.message)
      return { failures, report: null }
    }
  }
  const packageNames = new Set(Object.keys(packageScripts))
  const registry = (launcher) =>
    launcher === 'mise run' ? { known: names, label: `${file} ${kindOf}` } : { known: packageNames, label: `${PACKAGE} script` }

  /* ------------------------------------------------- 1. every token resolves ------------------- */

  const tokens = []
  const perFile = new Map()
  for (const file of JOB_FILES) {
    const full = join(root, file)
    if (!existsSync(full)) {
      fail(`${file} is missing at ${full}. The cross-check reads both job files; restore it.`)
      continue
    }
    let doc
    try {
      doc = yamlLoad(readFileSync(full, 'utf8'))
    } catch (error) {
      fail(`${file} does not parse as YAML: ${error.message}`)
      continue
    }
    const blocks = runBlocks(file, doc)
    let carrying = 0
    for (const block of blocks) {
      const found = [...withoutComments(block.run).matchAll(RUN_TOKEN_RE)].map((m) => ({
        launcher: m[1] ?? m[2],
        name: m[3],
      }))
      if (found.length > 0) carrying++
      for (const { launcher, name } of found) tokens.push({ launcher, name, where: block.where })
    }
    perFile.set(file, { blocks: blocks.length, carrying })
  }
  let unresolved = 0
  const resolved = []
  for (const token of tokens) {
    const { known, label } = registry(token.launcher)
    if (known.has(token.name)) {
      resolved.push(token)
      continue
    }
    unresolved++
    fail(
      `${token.where} invokes \`${token.launcher} ${token.name}\`, which is not a ${label}.` +
        (moved && token.launcher !== 'mise run' && names.has(token.name)
          ? ` \`${token.launcher}\` reads ${PACKAGE} alone, and the task is in ${TASKS_TOML}, so the job` +
            ` fails on the next push; launch it with \`mise run ${token.name}\`.`
          : ' A job over a script that does not exist fails on the next push for a reason unrelated to' +
            ' the push; rename the token or restore the script.'),
    )
  }
  // A task a job names through the wrong launcher is refused above, once; read as un-jobbed too, it
  // would be refused again below for a reason the first refusal already gives.
  const jobbed = new Set(tokens.map((t) => t.name).filter((name) => names.has(name)))
  const whereRun = (name) =>
    tokens
      .filter((t) => t.name === name)
      .map((t) => t.where)
      .join('; ')

  /* ------------------------------------------------- 3. the declared kinds describe the tree ---- */

  const declared = new Map(PACKAGE_NAMES.map((name) => [name, `kept in ${PACKAGE}`]))
  for (const { name, why } of PACKAGE_SCRIPTS) {
    if (resolved.some((t) => t.name === name)) {
      fail(`\`${name}\` is a script no job may run, but a job runs it (${whereRun(name)}): ${why}`)
    }
  }
  for (const kind of UNJOBBED_BY_KIND) {
    for (const entry of kind.names) {
      const name = entryName(entry)
      if (declared.has(name)) {
        fail(
          `UNJOBBED_BY_KIND lists \`${name}\` twice (${declared.get(name)}; ${kind.kind}). One kind` +
            ` per script.`,
        )
        continue
      }
      declared.set(name, kind.kind)
      if (!names.has(name)) {
        fail(
          `UNJOBBED_BY_KIND lists \`${name}\` (${kind.kind}) but ${file} has no such ${kindOf}. If` +
            ` it was retired, remove the entry; the list must describe the tree.`,
        )
      } else if (jobbed.has(name)) {
        fail(
          `UNJOBBED_BY_KIND lists \`${name}\` (${kind.kind}) as un-jobbed, but a job runs it` +
            ` (${whereRun(name)}). A stale exception is a hole in the gate; remove the entry.`,
        )
      }
      if (kind.shape && !kind.shape.test(name)) {
        fail(
          `UNJOBBED_BY_KIND lists \`${name}\` under "${kind.kind}", whose names match ${kind.shape}.` +
            ` Move it to the kind it is, or add the reason as a named exception.`,
        )
      }
    }
  }

  /* ------------------------------------------------- 2. every un-jobbed script is declared ------ */

  const unjobbed = [...names].filter((name) => !jobbed.has(name))
  // With a job file unread, every script only that file runs would read as un-jobbed: failures
  // caused by the first one, which say nothing the first does not.
  const everyJobFileRead = perFile.size === JOB_FILES.length
  for (const name of everyJobFileRead ? unjobbed : []) {
    if (declared.has(name)) continue
    if (GATE_SHAPED_RE.test(name)) {
      fail(
        `\`${name}\` is gate-shaped and no job runs it -- no \`mise run ${name}\` in ${HOOK_JOBS} or` +
          ` ${VERIFY}. A gate nothing runs reports the past.` +
          ` Wire it -- a \`pre-push\` job and, if it reads only` +
          ` committed files, a verify.yml step -- or add it to the named-exceptions list in` +
          ` scripts/check-jobs.mjs with the reason it stays ungated.`,
      )
    } else {
      fail(
        `\`${name}\` has no job and is of no declared kind. Add it to the matching UNJOBBED_BY_KIND` +
          ` list in scripts/check-jobs.mjs (bare emitter, :update, lint/format, reads a sibling checkout),` +
          ` or give it a job.`,
      )
    }
  }

  /* ------------------------------------------------- 4-5. every path exists, every glob matches */

  let pathNaming = 0
  let appsPaths = 0
  let globs = 0
  const commands = moved ? [...Object.entries(scripts), ...Object.entries(packageScripts)] : Object.entries(scripts)
  for (const [name, command] of commands) {
    const paths = [...command.matchAll(REPO_PATH_RE)]
      .filter(([, redirect]) => redirect === undefined)
      .map(([, , path]) => path)
    if (paths.length > 0) pathNaming++
    for (const path of paths) {
      if (path.startsWith('apps/')) appsPaths++
      if (!GLOB_CHAR_RE.test(path)) {
        const found = onDisk(pathsRoot, path)
        if (found === null) {
          fail(
            `\`${name}\` names ${path}, which does not exist. A script over a file that was moved or` +
              ` deleted is a dead public name; repoint it or retire the script with its README row.`,
          )
        } else if (!found.exact) {
          fail(
            `\`${name}\` names ${path}, which is spelled ${found.spelled} on disk. Case counts on` +
              ` Linux, where CI runs, though not on a Mac's default file system; spell the path as` +
              ` the file is spelled.`,
          )
        }
        continue
      }
      globs++
      if (filesMatching(pathsRoot, path).length === 0) {
        fail(
          `\`${name}\` names the glob ${path}, which matches no file, case counted as Linux counts` +
            ` it. A runner handed a glob that matches nothing can run nothing and still exit 0` +
            ` (\`node --test\` does); repoint the glob or restore the files it named.`,
        )
      }
    }
  }

  /* ------------------------------------------------- 6. the tasks have one registry ------------ */

  if (moved) {
    const kept = PACKAGE_NAMES.map((name) => `\`${name}\``).join(' and ')
    for (const name of [...packageNames].filter((n) => !PACKAGE_NAMES.includes(n))) {
      fail(
        `${PACKAGE} has the script \`${name}\`, and beside ${TASKS_TOML} it keeps ${kept} alone: no hook,` +
          ` CI step or prompt launches a ${PACKAGE} script by \`mise run\`, so a second registry's name` +
          ` is one nothing here reads. Move it to ${TASKS_TOML}.`,
      )
    }
    for (const { name, why } of PACKAGE_SCRIPTS) {
      if (!packageNames.has(name)) fail(`${PACKAGE} has no \`${name}\` script, which it keeps beside ${TASKS_TOML}: ${why}`)
      if (names.has(name)) {
        fail(
          `${TASKS_TOML} defines \`${name}\`, which ${PACKAGE} keeps: one name in two registries, which` +
            ` \`npm run\` and \`mise run\` would each run as its own.`,
        )
      }
    }
    const text = readOr(join(root, MISE_TOML))
    let mise = null
    if (text === null) {
      fail(`${MISE_TOML} is missing at ${join(root, MISE_TOML)}, so mise reads none of ${TASKS_TOML}'s tasks, which its \`[task_config]\` includes.`)
    } else {
      try {
        mise = parseToml(text)
      } catch (error) {
        fail(`${MISE_TOML} does not parse as TOML (${String(error.message).split('\n')[0]}).`)
      }
    }
    if (mise !== null) {
      for (const name of Object.keys(mise.tasks ?? {})) {
        fail(
          `${MISE_TOML} defines the task \`${name}\`: the tasks live in ${TASKS_TOML} alone, which every` +
            ' reader of them reads, and a task here is one none of them sees.',
        )
      }
      for (const [key, { value, why }] of Object.entries(TASK_CONFIG)) {
        if (JSON.stringify(mise.task_config?.[key]) !== JSON.stringify(value)) {
          fail(`${MISE_TOML}'s \`[task_config]\` does not hold \`${key} = ${JSON.stringify(value)}\`: ${why}`)
        }
      }
    }
  }

  const byKind = UNJOBBED_BY_KIND.map((kind) => ({
    kind: kind.kind,
    count: kind.names.map(entryName).filter((name) => unjobbed.includes(name)).length,
  }))
  const report = {
    file,
    scripts: names.size,
    kept: moved ? packageNames.size : null,
    tokens: tokens.length,
    distinct: new Set(tokens.map((t) => t.name)).size,
    unresolved,
    perFile,
    jobbed: jobbed.size,
    unjobbed: unjobbed.length,
    byKind,
    pathNaming,
    appsPaths,
    globs,
  }
  return { failures, report }
}

/** The breakdown, re-derived on every run. */
function describe(report) {
  const files = [...report.perFile]
    .map(([file, { carrying, blocks }]) => `${file} ${carrying} of ${blocks} run blocks`)
    .join(', ')
  const kinds = report.byKind.map(({ kind, count }) => `${count} ${kind}`).join('; ')
  const kept = report.kept === null ? '' : `, beside ${report.kept} kept in ${PACKAGE}`
  return [
    `jobs: ${files} carry a task token; ${report.tokens} tokens name ${report.distinct}` +
      ` distinct scripts, ${report.unresolved} unresolved.`,
    `scripts: ${report.scripts} in ${report.file}${kept} -- ${report.jobbed} jobbed, ${report.unjobbed}` +
      ` un-jobbed and declared by kind (${kinds}). ${report.pathNaming} name a tools/, scripts/ or` +
      ` apps/ path, each held to its spelling on disk, case included; ${report.appsPaths} of those` +
      ` paths under apps/, and ${report.globs} a glob, held to matching a file rather than to` +
      ` existing.`,
  ]
}

/* --------------------------------------------------------------------------------- the gate ----- */

function main() {
  const { failures, report } = runCheck(ROOT)
  if (report) for (const line of describe(report)) console.log(line)
  if (failures.length === 0) {
    console.log(
      'jobs: every token resolves through its launcher, every un-jobbed script is declared, every' +
        ' path exists as spelled, every glob matches a file, and the tasks have one registry.',
    )
    process.exit(0)
  }
  console.error(`\njobs: ${failures.length} failure(s). scripts/check-jobs.mjs.\n`)
  for (const failure of failures) console.error(`  - ${failure}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

/**
 * A case's verdict on the failures its run reported. `expect` is 'pass', one expression, or a list
 * of them: the run must report exactly as many failures as expressions, the i-th matching the i-th.
 * A case that also fails for a second reason is caught, rather than passed on the first.
 */
function judge(expect, failures) {
  if (expect === 'pass') {
    const ok = failures.length === 0
    return { ok, detail: ok ? 'passes' : `unexpected failure(s): ${failures.join(' | ')}` }
  }
  const expected = Array.isArray(expect) ? expect : [expect]
  if (failures.length === 0) return { ok: false, detail: 'PASSED, but should have failed' }
  if (failures.length !== expected.length) {
    return {
      ok: false,
      detail: `failed ${failures.length} time(s), not ${expected.length}: ${failures.join(' | ')}`,
    }
  }
  const ok = expected.every((expression, index) => expression.test(failures[index]))
  return {
    ok,
    detail: ok
      ? `fails for that reason (${failures.length} failure(s))`
      : `failed, but not for that reason: ${failures.join(' | ')}`,
  }
}

/**
 * The harness's own rule, checked before any case: were `judge` to accept a run that fails for its
 * reason and another, every case below could hide a second failure.
 */
function judgeChecks() {
  return [
    {
      name: 'harness: one expected failure and one other is not a pass',
      ok: judge(/^expected/, ['expected', 'another']).ok === false,
    },
    {
      name: 'harness: the right count for the wrong reason is not a pass',
      ok: judge([/^expected/, /^second/], ['expected', 'another']).ok === false,
    },
    {
      name: 'harness: exactly the expected failures, in order, are a pass',
      ok: judge([/^expected/, /^second/], ['expected', 'second']).ok === true,
    },
  ].map(({ name, ok }) => ({ name, ok, detail: ok ? 'holds' : 'the harness rule is broken' }))
}

/**
 * One doctoring per case, in a fresh copy; the run must fail FOR THAT REASON. `expect` is what
 * `judge` reads. `doctor` edits the copy's five files; `tree`, where a case has one, edits a copy
 * of `PATH_ROOTS`, which then stands for the real tree. Each doctoring must change the file it
 * edits, or the fixture is broken and the case throws rather than testing nothing.
 */
function selftest() {
  const files = [PACKAGE, TASKS_TOML, MISE_TOML, ...JOB_FILES]
  const base = mkdtempSync(join(tmpdir(), 'check-jobs-'))
  const harness = judgeChecks()
  const results = [...harness]
  try {
    const pristine = copyTree(base, 'pristine', files)
    const control = runCheck(pristine, { pathsRoot: REPO_ROOT })
    if (control.failures.length > 0 || control.report === null) {
      console.error(
        'selftest: the undoctored copy does not pass, so no case below can be trusted:\n',
      )
      for (const failure of control.failures) console.error(`  - ${failure}\n`)
      process.exit(1)
    }
    // The apps/ cases below break a path or a glob the control reads. A control that read neither
    // would pass without ever proving that a quoted apps/ glob which does match is let through.
    if (control.report.appsPaths === 0 || control.report.globs === 0) {
      console.error(
        `selftest: the undoctored copy reads ${control.report.appsPaths} apps/ path(s) and` +
          ` ${control.report.globs} glob(s); the apps/ cases need at least one of each to have a` +
          ` passing twin. If the calculator's scripts were retired, retire those cases with them.\n`,
      )
      process.exit(1)
    }

    for (const { name, doctor, tree, expect } of cases()) {
      const dir = copyTree(base, name.replace(/[^a-z0-9]+/gi, '-'), files)
      doctor(dir)
      let pathsRoot = REPO_ROOT
      if (tree) {
        pathsRoot = join(dir, 'tree')
        for (const root of PATH_ROOTS) {
          cpSync(join(REPO_ROOT, root), join(pathsRoot, root), { recursive: true })
        }
        tree(pathsRoot)
      }
      const { failures } = runCheck(dir, { pathsRoot })
      results.push({ name, ...judge(expect, failures) })
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }

  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  }
  const copies = results.length - harness.length - 1
  console.log(
    `jobs selftest: ${results.length - failed.length}/${results.length} hold` +
      ` (${harness.length} harness checks, the control and ${copies} doctored copies).`,
  )
  process.exit(failed.length === 0 ? 0 : 1)
}

function copyTree(base, name, files) {
  const dir = join(base, name)
  for (const relative of files) {
    const dest = join(dir, relative)
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(join(REPO_ROOT, relative), dest)
  }
  return dir
}

/** Rewrite one file in a doctored copy; a rewrite that changes nothing is a broken fixture. */
function edit(dir, relative, transform) {
  const path = join(dir, relative)
  const before = readFileSync(path, 'utf8')
  const after = transform(before)
  if (after === before) {
    throw new Error(
      `selftest fixture for ${relative} changed nothing -- the doctoring missed its target`,
    )
  }
  writeFileSync(path, after)
}

/** Rewrite the copy's package.json scripts through its parsed form. */
function editScripts(dir, transform) {
  edit(dir, PACKAGE, (text) => {
    const pkg = JSON.parse(text)
    transform(pkg.scripts)
    return `${JSON.stringify(pkg, null, 2)}\n`
  })
}

/** Rewrite the copy's tasks through their parsed form, as a name-to-command map. */
function editTasks(dir, transform) {
  edit(dir, TASKS_TOML, (text) => {
    const tasks = parseTasks(TASKS_TOML, text)
    transform(tasks)
    return taskFiles(TASKS_TOML, tasks)[TASKS_TOML]
  })
}

/** The copy's tasks moved back into package.json's scripts, as a tree from before the move has them. */
function toPackageJson(dir) {
  const tasks = parseTasks(TASKS_TOML, readFileSync(join(dir, TASKS_TOML), 'utf8'))
  rmSync(join(dir, TASKS_TOML))
  editScripts(dir, (scripts) => Object.assign(scripts, tasks))
}

/** A job appended to the copy's git-hooks.yml, under the last hook's `jobs:` list. */
const appendJob = (name, run) => (text) => `${text}    - name: ${name}\n      run: ${run}\n`

/** A directory in a copy of the roots whose one file is a dotfile, which the real tree lacks. */
function writeHidden(tree) {
  const dir = join(tree, 'apps', 'calculator', 'hidden')
  mkdirSync(dir)
  writeFileSync(join(dir, '.hidden.test.js'), '')
}

function cases() {
  return [
    {
      name: 'control: the undoctored copy passes',
      doctor: () => {},
      expect: 'pass',
    },
    {
      name: 'a hook job invokes a script that does not exist',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'mise run no:such:script')),
      expect: /^git-hooks\.yml pre-push\/doctored invokes `mise run no:such:script`, which is not a tasks\.toml task\. A job over a script that does not exist/,
    },
    {
      // Appended rather than substituted since a later decision: the one `run: |` step verify.yml carried (the
      // correction log's `reports are current`) went with its emitter, so the copy gains a step.
      name: 'a token inside a multi-line `run: |` block in verify.yml is read, and does not resolve',
      doctor: (dir) =>
        edit(
          dir,
          VERIFY,
          (t) =>
            `${t}      - name: doctored\n        run: |\n          set -euo pipefail\n          mise run corrections:nope\n`,
        ),
      expect:
        /^\.github\/workflows\/verify\.yml verify\/doctored invokes `mise run corrections:nope`/,
    },
    {
      // The launchers before the move read package.json alone, so a job left on one fails at the push.
      name: 'a hook job runs a task through `node --run`, which reads package.json alone',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'node --run check:jobs')),
      expect: /^git-hooks\.yml pre-push\/doctored invokes `node --run check:jobs`, which is not a package\.json script\. `node --run` reads package\.json alone, and the task is in tasks\.toml/,
    },
    {
      name: 'a CI step runs a task through `npm run`, which reads package.json alone',
      doctor: (dir) => edit(dir, VERIFY, (t) => `${t}      - name: doctored\n        run: npm run --silent check:jobs\n`),
      expect: /^\.github\/workflows\/verify\.yml verify\/doctored invokes `npm run check:jobs`, which is not a package\.json script\. `npm run` reads package\.json alone/,
    },
    {
      name: 'a hook job runs through `npm run` a script package.json does not have',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'npm run no:such:script')),
      expect: /^git-hooks\.yml pre-push\/doctored invokes `npm run no:such:script`, which is not a package\.json script\. A job over a script that does not exist/,
    },
    {
      // mise's spelling, with the flag `runTask` passes; the message names the launcher alone.
      name: 'a hook job invokes a task that does not exist through `mise run -q`',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'mise run -q no:such:task')),
      expect: /^git-hooks\.yml pre-push\/doctored invokes `mise run no:such:task`, which is not a tasks\.toml task/,
    },
    {
      name: 'a `mise run --quiet` job and a task with a description pass',
      doctor: (dir) => {
        edit(dir, HOOK_JOBS, appendJob('doctored', 'mise run --quiet check:jobs'))
        edit(dir, TASKS_TOML, (t) => t.replace('run = "node scripts/check-jobs.mjs"\n', 'run = "node scripts/check-jobs.mjs"\ndescription = "the job cross-check"\n'))
      },
      expect: 'pass',
    },
    {
      // A tree from before the move, which the loader reads too: every launcher reads package.json.
      name: "the copy's tasks moved back into package.json pass, as a tree from before the move",
      doctor: (dir) => toPackageJson(dir),
      expect: 'pass',
    },
    // Each refusal of the task loader (`scripts/lib/tasks.mjs`), reported in its words.
    ...[
      ['a tasks.toml that does not parse', (t) => `${t}[unclosed\n`, /^tasks\.toml cannot be read as TOML/],
      ['a value in the tasks.toml that is not a table', (t) => `stray = "node scripts/check-jobs.mjs"\n${t}`, /^tasks\.toml: `stray` is not a table, so it is no task\./],
      ['a task in the tasks.toml whose `run` is not a string', (t) => t.replace('run = "node scripts/check-jobs.mjs"\n', 'run = ["node", "scripts/check-jobs.mjs"]\n'), /^tasks\.toml: the task `check:jobs` has no `run` string\./],
      ['a task in the tasks.toml whose description is not a string', (t) => t.replace('run = "node scripts/check-jobs.mjs"\n', 'run = "node scripts/check-jobs.mjs"\ndescription = 1\n'), /^tasks\.toml: the task `check:jobs` has a `description` that is not a string\./],
      ['a task in the tasks.toml carries a key the loader refuses', (t) => t.replace('run = "node scripts/check-jobs.mjs"\n', 'run = "node scripts/check-jobs.mjs"\ndepends = ["counts:check"]\n'), /^tasks\.toml: the task `check:jobs` has `depends`/],
    ].map(([name, change, expect]) => ({ name, doctor: (dir) => edit(dir, TASKS_TOML, change), expect })),
    // The same loader's refusals of a package.json, in a tree from before the move and beside a tasks.toml.
    ...[
      ['a package.json that does not parse', (dir) => edit(dir, PACKAGE, (t) => `${t},`), /^package\.json cannot be read as JSON/],
      ["a package.json whose `scripts` is not an object", (dir) => edit(dir, PACKAGE, (t) => `${JSON.stringify({ ...JSON.parse(t), scripts: ['node scripts/check-jobs.mjs'] }, null, 2)}\n`), /^package\.json's `scripts` is not an object\./],
      ['a package.json script that is not a string', (dir) => editScripts(dir, (scripts) => { scripts.prepare = ['node', 'scripts/git-hooks.mjs'] }), /^package\.json's script `prepare` is not a string\./],
    ].flatMap(([name, change, expect]) => [
      { name: `${name}, beside a tasks.toml`, doctor: change, expect },
      { name: `${name}, as a tree from before the move`, doctor: (dir) => { toPackageJson(dir); change(dir) }, expect },
    ]),
    {
      // The runner runs a group's jobs as it runs the hook's own, so a token inside one is read too.
      name: "a job inside a hook group invokes a script that does not exist",
      doctor: (dir) =>
        edit(dir, HOOK_JOBS, (t) => `${t}    - name: doctored-group\n      group:\n        jobs:\n          - name: doctored\n            run: mise run no:such:script\n`),
      expect: /^git-hooks\.yml pre-push\/doctored-group\/doctored invokes `mise run no:such:script`, which is not/,
    },
    {
      name: 'a `mise run` mention on a comment line is not a job',
      doctor: (dir) => edit(dir, HOOK_JOBS, (t) => `${t}    # run: mise run no:such:script\n`),
      expect: 'pass',
    },
    {
      // The doctored script names this gate, a file that exists whenever the selftest runs, so the
      // missing job is the one thing wrong with it.
      name: 'a new gate-shaped task with no job',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['doctored:check'] = 'node scripts/check-jobs.mjs --doctored'
        }),
      expect: /^`doctored:check` is gate-shaped and no job runs it/,
    },
    {
      name: 'a new task of no declared kind, with no job',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks.doctored = 'node scripts/check-jobs.mjs --doctored'
        }),
      expect: /^`doctored` has no job and is of no declared kind/,
    },
    {
      name: 'a named exception gains a job and its entry goes stale',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'mise run gates')),
      expect: /^UNJOBBED_BY_KIND lists `gates` \(named exception\) as un-jobbed, but a job runs it/,
    },
    {
      name: 'a declared task is retired from tasks.toml and its entry goes stale',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          delete tasks.gates
        }),
      expect: /^UNJOBBED_BY_KIND lists `gates` \(named exception\) but tasks\.toml has no such task/,
    },
    {
      name: 'a script package.json keeps gains a job',
      doctor: (dir) => edit(dir, HOOK_JOBS, appendJob('doctored', 'npm run prepare')),
      expect: /^`prepare` is a script no job may run, but a job runs it \(git-hooks\.yml pre-push\/doctored\): npm's lifecycle script/,
    },
    // 6. One registry.
    {
      name: 'package.json gains a script beside the tasks.toml',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts.doctored = 'node scripts/check-jobs.mjs'
        }),
      expect: /^package\.json has the script `doctored`, and beside tasks\.toml it keeps `calculator:serve` and `prepare` alone/,
    },
    {
      name: 'package.json drops a script it keeps',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          delete scripts['calculator:serve']
        }),
      expect: /^package\.json has no `calculator:serve` script, which it keeps beside tasks\.toml: the command `openspec\/specs\/calculator-local-server\/spec\.md` names/,
    },
    {
      name: 'tasks.toml defines a script package.json keeps',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks.prepare = 'node scripts/git-hooks.mjs --prepare'
        }),
      expect: /^tasks\.toml defines `prepare`, which package\.json keeps: one name in two registries/,
    },
    {
      name: 'mise.toml defines a task',
      doctor: (dir) => edit(dir, MISE_TOML, (t) => `${t}\n[tasks.hello]\nrun = "node scripts/check-jobs.mjs"\n`),
      expect: /^mise\.toml defines the task `hello`: the tasks live in tasks\.toml alone/,
    },
    {
      name: "mise.toml's task_config does not include tasks.toml",
      doctor: (dir) => edit(dir, MISE_TOML, (t) => t.replace(/^includes = .*\n/m, '')),
      expect: /^mise\.toml's `\[task_config\]` does not hold `includes = \["tasks\.toml"\]`: mise then reads none of tasks\.toml's tasks/,
    },
    {
      name: "mise.toml's task_config runs a task in its config's directory",
      doctor: (dir) => edit(dir, MISE_TOML, (t) => t.replace(/^dir = .*\n/m, '')),
      expect: /^mise\.toml's `\[task_config\]` does not hold `dir = "\{\{cwd\}\}"`: a task a worktree lacks resolves to the primary checkout's/,
    },
    {
      name: 'no mise.toml beside the tasks.toml',
      doctor: (dir) => rmSync(join(dir, MISE_TOML)),
      expect: /^mise\.toml is missing at .*, so mise reads none of tasks\.toml's tasks/,
    },
    {
      name: 'a mise.toml that does not parse',
      doctor: (dir) => edit(dir, MISE_TOML, (t) => `${t}[unclosed\n`),
      expect: /^mise\.toml does not parse as TOML/,
    },
    {
      // A jobbed task repointed, not a new one added: a new gate-shaped name would also fail for
      // having no job.
      name: 'a task names a file that was moved',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['check:jobs'] = 'node scripts/check-jobs-renamed.mjs'
        }),
      expect: /^`check:jobs` names scripts\/check-jobs-renamed\.mjs, which does not exist/,
    },
    {
      // package.json's own scripts are read for their paths too.
      name: 'a script package.json keeps names a missing apps/ path',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:serve'] = 'node apps/calculator/serve-renamed.js'
        }),
      expect: /^`calculator:serve` names apps\/calculator\/serve-renamed\.js, which does not exist/,
    },
    {
      // The message must name the path without its quotes, so the expression pins both the read
      // and the strip.
      name: 'a script names a missing quoted apps/ path',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:serve'] = 'node "apps/calculator/serve-renamed.js"'
        }),
      expect: /^`calculator:serve` names apps\/calculator\/serve-renamed\.js, which does not exist/,
    },
    ...[
      ['a quoted apps/ glob matches no file in its directory', 'node --test "apps/calculator/test/*.missing.js"', /^`calculator:test` names the glob apps\/calculator\/test\/\*\.missing\.js, which matches no file/],
      // asdlc-openspec-frm's own reproduction: the test directory renamed, so a fixed leading
      // directory is missing and nothing is listed at all.
      ['a quoted apps/ glob whose directory was renamed matches no file', 'node --test "apps/calculator/tests/*.test.js"', /^`calculator:test` names the glob apps\/calculator\/tests\/\*\.test\.js, which matches no file/],
      // The test runner expands `**` with the same `fs.globSync`, so the gate reads it rather than
      // refusing it as a form it does not match, as its hand-written matcher once did.
      ['a quoted apps/ glob with `**` that matches a file passes', 'node --test "apps/calculator/**/*.test.js"', 'pass'],
      // `[` is the glob's only glob character, so a gate that did not count it would read a literal
      // name that does not exist.
      ['a quoted apps/ glob with `[...]` that matches a file passes', 'node --test "apps/calculator/test/serve[r].test.js"', 'pass'],
      // Its twin fails as a glob, and a gate that did not count `[` would fail it with another
      // message.
      ['a quoted apps/ glob with `[...]` that matches no file', 'node --test "apps/calculator/test/serve[xyz].test.js"', /^`calculator:test` names the glob apps\/calculator\/test\/serve\[xyz\]\.test\.js, which matches no file/],
      // `{` makes a glob too; read as a literal name, it would fail as a path that does not exist.
      ['a quoted apps/ glob with `{a,b}` that matches a file passes', 'node --test "apps/calculator/test/{serve,server}.test.js"', 'pass'],
      // `?` stands for exactly one character, so `serve?` reaches server.test.js; read as a literal
      // `?`, the glob would match nothing and this case would fail.
      ['a quoted apps/ glob with `?` that matches a file passes', 'node --test "apps/calculator/test/serve?.test.js"', 'pass'],
      // Exactly one, never none: a `?` read as a regex's, making the `j` before it optional, would
      // match serve.js.
      ['a glob whose `?` would match only if it matched no character', 'node --test "apps/calculator/serve.j?s"', /^`calculator:test` names the glob apps\/calculator\/serve\.j\?s, which matches no file/],
      // `t*` in apps/calculator/ matches the directory test/ and no file.
      ['a glob that matches only a directory matches no file', 'node --test "apps/calculator/t*"', /^`calculator:test` names the glob apps\/calculator\/t\*, which matches no file/],
      // `fs.globSync` on a Mac finds a fixed segment in any case, and hands back the glob's spelling.
      ['a glob whose fixed directory is in the wrong case matches no file', 'node --test "apps/Calculator/test/*.test.js"', /^`calculator:test` names the glob apps\/Calculator\/test\/\*\.test\.js, which matches no file/],
    ].map(([name, command, expect]) => ({
      name,
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['calculator:test'] = command
        }),
      expect,
    })),
    {
      // As a shell and the test runner read it, `*` passes over a name that opens with a dot.
      name: 'a glob whose only match is a dotfile its `*` does not reach matches no file',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['calculator:test'] = 'node --test "apps/calculator/hidden/*.test.js"'
        }),
      tree: (tree) => writeHidden(tree),
      expect:
        /^`calculator:test` names the glob apps\/calculator\/hidden\/\*\.test\.js, which matches no file/,
    },
    {
      // The previous case's twin: the dotfile is there, and a glob that opens with a dot reaches it.
      name: 'a glob that opens with a dot matches a dotfile',
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['calculator:test'] = 'node --test "apps/calculator/hidden/.*.test.js"'
        }),
      tree: (tree) => writeHidden(tree),
      expect: 'pass',
    },
    {
      // `existsSync` finds this on a Mac; the listings do not, and nor does Linux.
      name: 'a script names an apps/ path in the wrong case',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:serve'] = 'node apps/Calculator/serve.js'
        }),
      expect:
        /^`calculator:serve` names apps\/Calculator\/serve\.js, which is spelled apps\/calculator\/serve\.js on disk/,
    },
    ...[
      ['a path after `./` is read', 'node ./scripts/check-jobs-renamed.mjs', /^`check:jobs` names scripts\/check-jobs-renamed\.mjs, which does not exist/],
      ['a path after `=` is read', 'node --import=scripts/missing-loader.mjs scripts/check-jobs.mjs', /^`check:jobs` names scripts\/missing-loader\.mjs, which does not exist/],
      ['a path glued to shell punctuation is read', 'node scripts/check-jobs.mjs&&scripts/check-jobs-renamed.sh', /^`check:jobs` names scripts\/check-jobs-renamed\.sh, which does not exist/],
      // An input redirect's file must exist, so it is read like any other path, glued or not.
      ['a path glued to a `<` redirect is read', 'node scripts/check-jobs.mjs<scripts/missing-input.txt', /^`check:jobs` names scripts\/missing-input\.txt, which does not exist/],
      // Both paths exist, so any failure here is a path read past the `<` or the `)`.
      ['a path ends at `<` and `)`', '(node scripts/check-jobs.mjs<scripts/README.md)', 'pass'],
      // Read past the `>`, the path does not exist; read as a required file, nor does the target.
      ['a path ends at `>`, and a `>` redirect target is written, not read', 'node scripts/check-jobs.mjs>scripts/check-jobs.log', 'pass'],
      // `scripts/` inside another path is not a root; read from there, the path does not exist.
      ['a root in the middle of another path is not read', 'node scripts/check-jobs.mjs vendor/scripts/absent.mjs', 'pass'],
    ].map(([name, command, expect]) => ({
      name,
      doctor: (dir) =>
        editTasks(dir, (tasks) => {
          tasks['check:jobs'] = command
        }),
      expect,
    })),
    {
      name: 'a job file is missing',
      doctor: (dir) => rmSync(join(dir, VERIFY)),
      expect: /^\.github\/workflows\/verify\.yml is missing at/,
    },
    {
      name: 'a job file does not parse',
      doctor: (dir) => edit(dir, HOOK_JOBS, (t) => `${t}  - [unclosed\n`),
      expect: /^git-hooks\.yml does not parse as YAML/,
    },
  ]
}

if (process.argv.includes('--selftest')) selftest()
else main()
