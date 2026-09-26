/**
 * Job-to-script cross-check gate: the hooks and CI invoke only scripts that exist, every script
 * they do not invoke is of a kind this file declares, and every file a script names is there as it
 * is spelled.
 *
 *   npm run check:jobs             the gate; prints the re-derived breakdown on every run
 *   npm run check:jobs:selftest    its fixtures -- every assertion exercised on a doctored copy
 *   CHECK_JOBS_ROOT=<dir> npm run check:jobs
 *                                  the same gate over a copy of the tree, with the paths the copy's
 *                                  scripts name resolved inside the copy too
 *
 * THE JOB THIS EXISTS FOR. A `package.json` script is a public name and nothing gates its citations
 * (the add-npm-script skill opens with that sentence). Two failures follow, and both
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
 * WHAT FAILS THE JOB:
 *   1. an `npm run <name>` or `node --run <name>` token in a `run:` of `lefthook.yml` or
 *      `.github/workflows/verify.yml` whose <name> is not a `package.json` script (the hook launches
 *      through `node --run`, CI through `npm run`; both name the same script).
 *      Comment lines are not read -- both files quote scripts they deliberately do NOT run -- and a
 *      multi-line `run: |` block is.
 *   2. a `package.json` script with no `run:` token in either file that `UNJOBBED_BY_KIND` below
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
 *
 * WHAT IS NOT CHECKED, deliberately: WHERE a jobbed script runs (pre-push, CI or both) -- that is
 * `pipeline:check`'s question for the graph's regeneration nodes and the README's Gate column for
 * the rest; whether a job's OTHER commands (`git diff`, `npx prettier`, `bd hooks run`) resolve; the
 * `pre-commit` jobs' `{staged_files}` templates; an extglob such as `+(a|b)`, whose parentheses the
 * path reader takes for shell punctuation; and the case of the letters a wildcard segment matches.
 * `fs.globSync` and `path.matchesGlob` both match `*.TEST.js` to `server.test.js` on macOS (measured
 * with Node 26.8.1), so neither of Node's glob matchers reads that case on a Mac; CI, on Linux,
 * refuses such a glob.
 *
 * NEGATIVE TESTING. `--selftest` copies the three files under `os.tmpdir()` and doctors ONE thing
 * per case, asserting the run fails FOR THAT REASON -- plus a control that the undoctored copy
 * passes, without which every other case could be failing on the copy. A case lists the failures it
 * expects, one expression each, and holds only when the run reports exactly those. Until
 * 2026-09-26 one matching failure was enough, and three cases passed while also failing on a fixture
 * file this repository does not have (fixed in asdlc-openspec-zgh.5). The harness's own rule is
 * checked before the cases. Paths and globs are resolved against the real tree, since a copy of
 * three files has no `tools/` or `apps/`: a path case doctors the copy's command line to name what
 * the real tree lacks. A case that needs a file the real tree lacks, such as a dotfile, doctors a
 * copy of the three roots instead. The control must read at least one `apps/` path and one glob, or
 * the apps cases have no passing twin. By hand, point `CHECK_JOBS_ROOT` at a copy, as
 * `check-register-status.mjs` does with `CHECK_REGISTER_ROOT`.
 *
 * Reads only committed files, and lists the directories a path or a glob names; no `../sibling`
 * checkout, no network, milliseconds. Needs `fs.globSync`, stable from Node 22.17.0, inside the
 * `engines` floor in `package.json`. `pre-push` and CI both, by the add-npm-script skill's step on
 * where a gate runs.
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

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.CHECK_JOBS_ROOT ?? REPO_ROOT

const PACKAGE = 'package.json'
const LEFTHOOK = 'lefthook.yml'
const VERIFY = '.github/workflows/verify.yml'
const JOB_FILES = [LEFTHOOK, VERIFY]

/**
 * An invocation token inside a `run:` string: group 1 the launcher, group 2 the script. `npm run` is
 * CI's spelling and `--silent` is how `scripts/hooks/_shared.mjs` spells it; `node --run` is the
 * pre-push hook's (node_modules/.bin on PATH, no npm start-up -- measured at
 * 2.1-3.1s for `npm run` against 0.9-1.2s for `node --run` on one Windows host).
 */
const NPM_RUN_RE = /\b(npm run|node --run) (?:--silent )?([A-Za-z0-9][A-Za-z0-9:._-]*)/g
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
 * here is a claim about `package.json` and the two job files together, and assertion 3 holds every
 * claim: the script exists, no job runs it, and its spelling fits the kind. So the list cannot go
 * stale silently in either direction -- wire a listed script and its entry must go; retire one and
 * its entry must go; add an un-jobbed script and an entry must come.
 *
 * `shape` is a regex the kind's names must match, where the kind HAS a mechanical shape. Bare
 * emitters do not (`worktree:gc`, `pipeline:example`), so that kind is a list and nothing more.
 */
const UNJOBBED_BY_KIND = [
  {
    kind: 'bare emitter or operator command',
    why:
      'writes an artifact or drives an operator procedure. Where it has a `:check` twin, the twin is' +
      ' the gate and the job runs that.',
    names: [
      'worktree:gc',
      'pipeline:example',
      'pipeline:stale',
    ],
  },
  {
    kind: ':update baseline',
    shape: /:update$/,
    why: 'rewrites a ratchet or golden; a job that ran it would move the baseline it is meant to hold.',
    names: [],
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
        name: 'calculator:serve',
        why:
          'serves the calculator until a person stops it, so a job running it would never return;' +
          ' `calculator:test` runs `apps/calculator/serve.js` itself and proves its behaviour.',
      },
      {
        name: 'gates',
        why: 'the suite itself (`lefthook run pre-push --force`); a job invoking it would recurse.',
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
 * Every `run:` string in a job file, with a label for the failure message. lefthook.yml is
 * `<hook>: { jobs: [{ name, run }] }`; verify.yml is `jobs: { <job>: { steps: [{ name, run }] } }`.
 */
function runBlocks(file, doc) {
  const blocks = []
  if (file === LEFTHOOK) {
    for (const [hook, spec] of Object.entries(doc ?? {})) {
      if (!Array.isArray(spec?.jobs)) continue
      for (const job of spec.jobs) {
        if (typeof job?.run !== 'string') continue
        blocks.push({ where: `${file} ${hook}/${job.name ?? '(unnamed)'}`, run: job.run })
      }
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

/**
 * Run every assertion against the tree at `root`. Returns the failures and the breakdown rather
 * than exiting, so the selftest can run it against doctored copies. `pathsRoot` is where assertions
 * 4 and 5 look for the named files and globs -- the real tree, when `root` is a three-file copy.
 */
export function runCheck(root, { pathsRoot = root } = {}) {
  const failures = []
  const fail = (message) => failures.push(message)

  const pkgPath = join(root, PACKAGE)
  if (!existsSync(pkgPath)) {
    fail(`${PACKAGE} is missing at ${pkgPath}.`)
    return { failures, report: null }
  }
  const scripts = JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {}
  const names = new Set(Object.keys(scripts))

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
      const found = [...withoutComments(block.run).matchAll(NPM_RUN_RE)].map((m) => ({
        launcher: m[1],
        name: m[2],
      }))
      if (found.length > 0) carrying++
      for (const { launcher, name } of found) tokens.push({ launcher, name, where: block.where })
    }
    perFile.set(file, { blocks: blocks.length, carrying })
  }
  let unresolved = 0
  for (const { launcher, name, where } of tokens) {
    if (names.has(name)) continue
    unresolved++
    fail(
      `${where} invokes \`${launcher} ${name}\`, which is not a ${PACKAGE} script. A job over a` +
        ` script that does not exist fails on the next push for a reason unrelated to the push;` +
        ` rename the token or restore the script.`,
    )
  }
  const jobbed = new Set(tokens.map((t) => t.name).filter((n) => names.has(n)))

  /* ------------------------------------------------- 3. the declared kinds describe the tree ---- */

  const declared = new Map()
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
          `UNJOBBED_BY_KIND lists \`${name}\` (${kind.kind}) but ${PACKAGE} has no such script. If` +
            ` it was retired, remove the entry; the list must describe the tree.`,
        )
      } else if (jobbed.has(name)) {
        fail(
          `UNJOBBED_BY_KIND lists \`${name}\` (${kind.kind}) as un-jobbed, but a job runs it` +
            ` (${tokens
              .filter((t) => t.name === name)
              .map((t) => t.where)
              .join('; ')}). A stale exception is a hole in the gate; remove the entry.`,
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
        `\`${name}\` is gate-shaped and no job runs it -- no \`npm run ${name}\` in ${LEFTHOOK} or` +
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
  for (const [name, command] of Object.entries(scripts)) {
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

  const byKind = UNJOBBED_BY_KIND.map((kind) => ({
    kind: kind.kind,
    count: kind.names.map(entryName).filter((name) => unjobbed.includes(name)).length,
  }))
  const report = {
    scripts: names.size,
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
  return [
    `jobs: ${files} carry an \`npm run\` token; ${report.tokens} tokens name ${report.distinct}` +
      ` distinct scripts, ${report.unresolved} unresolved.`,
    `scripts: ${report.scripts} in ${PACKAGE} -- ${report.jobbed} jobbed, ${report.unjobbed}` +
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
      'jobs: every token resolves, every un-jobbed script is declared, every path exists as' +
        ' spelled, every glob matches a file.',
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
 * `judge` reads. `doctor` edits the copy's three files; `tree`, where a case has one, edits a copy
 * of `PATH_ROOTS`, which then stands for the real tree. Each doctoring must change the file it
 * edits, or the fixture is broken and the case throws rather than testing nothing.
 */
function selftest() {
  const files = [PACKAGE, ...JOB_FILES]
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

/** Rewrite the copy's package.json through its parsed form. */
function editScripts(dir, transform) {
  edit(dir, PACKAGE, (text) => {
    const pkg = JSON.parse(text)
    transform(pkg.scripts)
    return `${JSON.stringify(pkg, null, 2)}\n`
  })
}

/** A job appended to the copy's lefthook.yml, under the last hook's `jobs:` list. */
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
      name: 'a lefthook job invokes a script that does not exist',
      doctor: (dir) => edit(dir, LEFTHOOK, appendJob('doctored', 'npm run no:such:script')),
      expect: /^lefthook\.yml pre-push\/doctored invokes `npm run no:such:script`, which is not/,
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
            `${t}      - name: doctored\n        run: |\n          set -euo pipefail\n          npm run corrections:nope\n`,
        ),
      expect:
        /^\.github\/workflows\/verify\.yml verify\/doctored invokes `npm run corrections:nope`/,
    },
    {
      // The hook's own launcher; the message names the spelling the job used.
      name: 'a lefthook job invokes a script that does not exist through `node --run`',
      doctor: (dir) => edit(dir, LEFTHOOK, appendJob('doctored', 'node --run no:such:script')),
      expect: /^lefthook\.yml pre-push\/doctored invokes `node --run no:such:script`, which is not/,
    },
    {
      name: 'a `npm run` mention on a comment line is not a job',
      doctor: (dir) => edit(dir, LEFTHOOK, (t) => `${t}    # run: npm run no:such:script\n`),
      expect: 'pass',
    },
    {
      // The doctored script names this gate, a file that exists whenever the selftest runs, so the
      // missing job is the one thing wrong with it.
      name: 'a new gate-shaped script with no job',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['doctored:check'] = 'node scripts/check-jobs.mjs --doctored'
        }),
      expect: /^`doctored:check` is gate-shaped and no job runs it/,
    },
    {
      name: 'a new script of no declared kind, with no job',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts.doctored = 'node scripts/check-jobs.mjs --doctored'
        }),
      expect: /^`doctored` has no job and is of no declared kind/,
    },
    {
      name: 'a named exception gains a job and its entry goes stale',
      doctor: (dir) => edit(dir, LEFTHOOK, appendJob('doctored', 'npm run gates')),
      expect: /^UNJOBBED_BY_KIND lists `gates` \(named exception\) as un-jobbed, but a job runs it/,
    },
    {
      name: 'a declared script is retired from package.json and its entry goes stale',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          delete scripts.gates
        }),
      expect:
        /^UNJOBBED_BY_KIND lists `gates` \(named exception\) but package\.json has no such script/,
    },
    {
      // A jobbed script repointed, not a new one added: a new gate-shaped name would also fail for
      // having no job.
      name: 'a script names a file that was moved',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node scripts/check-jobs-renamed.mjs'
        }),
      expect: /^`check:jobs` names scripts\/check-jobs-renamed\.mjs, which does not exist/,
    },
    {
      name: 'a script names a missing apps/ path',
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
    {
      name: 'a quoted apps/ glob matches no file in its directory',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/test/*.missing.js"'
        }),
      expect:
        /^`calculator:test` names the glob apps\/calculator\/test\/\*\.missing\.js, which matches no file/,
    },
    {
      // asdlc-openspec-frm's own reproduction: the test directory renamed, so a fixed leading
      // directory is missing and nothing is listed at all.
      name: 'a quoted apps/ glob whose directory was renamed matches no file',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/tests/*.test.js"'
        }),
      expect:
        /^`calculator:test` names the glob apps\/calculator\/tests\/\*\.test\.js, which matches no file/,
    },
    {
      // The test runner expands `**` with the same `fs.globSync`, so the gate reads it rather than
      // refusing it as a form it does not match, as its hand-written matcher once did.
      name: 'a quoted apps/ glob with `**` that matches a file passes',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/**/*.test.js"'
        }),
      expect: 'pass',
    },
    {
      // `[` is the glob's only glob character, so a gate that did not count it would read a literal
      // name that does not exist.
      name: 'a quoted apps/ glob with `[...]` that matches a file passes',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/test/serve[r].test.js"'
        }),
      expect: 'pass',
    },
    {
      // Its twin fails as a glob, and a gate that did not count `[` would fail it with another
      // message.
      name: 'a quoted apps/ glob with `[...]` that matches no file',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/test/serve[xyz].test.js"'
        }),
      expect:
        /^`calculator:test` names the glob apps\/calculator\/test\/serve\[xyz\]\.test\.js, which matches no file/,
    },
    {
      // `{` makes a glob too; read as a literal name, it would fail as a path that does not exist.
      name: 'a quoted apps/ glob with `{a,b}` that matches a file passes',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/test/{serve,server}.test.js"'
        }),
      expect: 'pass',
    },
    {
      // `?` stands for exactly one character, so `serve?` reaches server.test.js; read as a literal
      // `?`, the glob would match nothing and this case would fail.
      name: 'a quoted apps/ glob with `?` that matches a file passes',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/test/serve?.test.js"'
        }),
      expect: 'pass',
    },
    {
      // Exactly one, never none: a `?` read as a regex's, making the `j` before it optional, would
      // match serve.js.
      name: 'a glob whose `?` would match only if it matched no character',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/serve.j?s"'
        }),
      expect: /^`calculator:test` names the glob apps\/calculator\/serve\.j\?s, which matches no file/,
    },
    {
      // `t*` in apps/calculator/ matches the directory test/ and no file.
      name: 'a glob that matches only a directory matches no file',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/t*"'
        }),
      expect: /^`calculator:test` names the glob apps\/calculator\/t\*, which matches no file/,
    },
    {
      // As a shell and the test runner read it, `*` passes over a name that opens with a dot.
      name: 'a glob whose only match is a dotfile its `*` does not reach matches no file',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/hidden/*.test.js"'
        }),
      tree: (tree) => writeHidden(tree),
      expect:
        /^`calculator:test` names the glob apps\/calculator\/hidden\/\*\.test\.js, which matches no file/,
    },
    {
      // The previous case's twin: the dotfile is there, and a glob that opens with a dot reaches it.
      name: 'a glob that opens with a dot matches a dotfile',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/calculator/hidden/.*.test.js"'
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
    {
      // `fs.globSync` on a Mac finds a fixed segment in any case, and hands back the glob's spelling.
      name: 'a glob whose fixed directory is in the wrong case matches no file',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['calculator:test'] = 'node --test "apps/Calculator/test/*.test.js"'
        }),
      expect:
        /^`calculator:test` names the glob apps\/Calculator\/test\/\*\.test\.js, which matches no file/,
    },
    {
      name: 'a path after `./` is read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node ./scripts/check-jobs-renamed.mjs'
        }),
      expect: /^`check:jobs` names scripts\/check-jobs-renamed\.mjs, which does not exist/,
    },
    {
      name: 'a path after `=` is read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node --import=scripts/missing-loader.mjs scripts/check-jobs.mjs'
        }),
      expect: /^`check:jobs` names scripts\/missing-loader\.mjs, which does not exist/,
    },
    {
      name: 'a path glued to shell punctuation is read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node scripts/check-jobs.mjs&&scripts/check-jobs-renamed.sh'
        }),
      expect: /^`check:jobs` names scripts\/check-jobs-renamed\.sh, which does not exist/,
    },
    {
      // An input redirect's file must exist, so it is read like any other path, glued or not.
      name: 'a path glued to a `<` redirect is read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node scripts/check-jobs.mjs<scripts/missing-input.txt'
        }),
      expect: /^`check:jobs` names scripts\/missing-input\.txt, which does not exist/,
    },
    {
      // Both paths exist, so any failure here is a path read past the `<` or the `)`.
      name: 'a path ends at `<` and `)`',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = '(node scripts/check-jobs.mjs<scripts/README.md)'
        }),
      expect: 'pass',
    },
    {
      // Read past the `>`, the path does not exist; read as a required file, nor does the target.
      name: 'a path ends at `>`, and a `>` redirect target is written, not read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node scripts/check-jobs.mjs>scripts/check-jobs.log'
        }),
      expect: 'pass',
    },
    {
      // `scripts/` inside another path is not a root; read from there, the path does not exist.
      name: 'a root in the middle of another path is not read',
      doctor: (dir) =>
        editScripts(dir, (scripts) => {
          scripts['check:jobs'] = 'node scripts/check-jobs.mjs vendor/scripts/absent.mjs'
        }),
      expect: 'pass',
    },
    {
      name: 'a job file is missing',
      doctor: (dir) => rmSync(join(dir, VERIFY)),
      expect: /^\.github\/workflows\/verify\.yml is missing at/,
    },
    {
      name: 'a job file does not parse',
      doctor: (dir) => edit(dir, LEFTHOOK, (t) => `${t}  - [unclosed\n`),
      expect: /^lefthook\.yml does not parse as YAML/,
    },
  ]
}

if (process.argv.includes('--selftest')) selftest()
else main()
