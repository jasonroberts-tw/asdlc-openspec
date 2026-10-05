/**
 * Toolchain gate. It holds `mise.toml`, the one home of every tool version this repository installs
 * (`docs/decisions.md` § D-31), to its lockfile and to every other place a tool could be installed:
 *
 *   1. every `[tools]` pin is an exact MAJOR.MINOR.PATCH version, so the file says what runs rather
 *      than a range each later install resolves again;
 *   2. `mise.lock` holds each tool at its pin, with a URL and a checksum for every platform
 *      `toolchainLockPlatforms` in `tools/policy/tool-settings.json` names, so `mise install --locked`,
 *      which CI runs, verifies what it downloads on every kind of machine this repository is set up on.
 *      A `pypi:` tool is locked otherwise: by a uv lock of all its dependencies under `.mise/locks/`,
 *      which `mise.lock` names by its path and its `uv.lock`'s sha256, whose `pyproject.toml` asks for
 *      the pin with its extras and holds nothing else, and whose `uv.lock` holds that release
 *      (asdlc-openspec-8juz.1, question 7); no lock there is one that no entry of `mise.lock`
 *      names, as a moved pin leaves behind; and a lock's directory holds those two files alone,
 *      since uv reads another, such as a `uv.toml`, as configuration when it runs there;
 *   3. every `jdx/mise-action` step under `.github/workflows/`, itself pinned by a full commit rather
 *      than a tag a third party can move, pins `version:` to the mise the dev
 *      container copies in (`COPY --from=ghcr.io/jdx/mise:<version>@sha256:<digest>` in
 *      `.devcontainer/Dockerfile`) and carries a `sha256:` of the mise binary, the same in every
 *      step; the container's copy names its image's digest, not the tag alone; and `mise.toml`'s
 *      `min_version` is no newer. With a `pypi:` tool pinned, the Dockerfile copies `.mise/locks/`
 *      beside `mise.toml` and `mise.lock`, under the folder its `COPY` of `mise.toml` names, and
 *      `.devcontainer/Dockerfile.dockerignore` lets it into the build context, without which the
 *      image's locked install fails on that tool;
 *   4. nothing installs a tool a second way: no `actions/setup-node` or `actions/setup-python`, no
 *      NodeSource, no npm install of `@beads/bd` and no `uv tool install` in a workflow's step or a
 *      line of the Dockerfile that is not a comment; no version `ARG` in the Dockerfile; and no
 *      tracked file another version manager reads (`.nvmrc`, `.node-version`, `.python-version`) at
 *      the checkout root;
 *   5. `mise.toml` holds only `min_version`, `[tools]`, `[settings]` and `[task_config]`; each tool a
 *      plain version string, since an option table can run a command at install (`postinstall`) or
 *      fetch from a URL the lock does not name, but a `pypi:` tool, which may carry `version` and a list
 *      of `extras` alone, whose dependencies its uv lock holds (asdlc-openspec-8juz.3); only the
 *      settings this file needs, since a setting can
 *      turn off mise's checksum, signature and provenance checks or trust other files, for every
 *      install and shim; no template but `[task_config] dir = "{{cwd}}"`, under which a task a
 *      worktree borrows from the primary checkout runs on the worktree's own files, and no
 *      `[task_config]` but that and `includes = ["tasks.toml"]`, the task move's one registry;
 *      `[settings] not_found_system_fallback = false` with `auto_install` left on, the two settings
 *      under which a pin that is not installed fails or installs rather than run the system's binary
 *      in its place; and of the settings under `task`, only `output`, `quiet` and `timings`, each at
 *      the one value that makes a task print what its command prints, `"interleave"`, `true` and
 *      `false` (asdlc-openspec-8juz.1, questions 1, 4 and 6);
 *   6. no tracked file is a mise config but the root `mise.toml`: not `.mise.toml`, `mise.*.toml`,
 *      `.tool-versions`, a `mise.toml` below the root, nor anything under a `mise/`, `.mise/` or
 *      `.config/mise` directory but the `pypi:` backend's locks under `.mise/locks/`. mise loads each
 *      of those beside `mise.toml`, and trusts it where it trusts the checkout, so its tools, settings,
 *      env or hooks would act on every shim and session while this gate read none of them;
 *   7. what mise itself reads from `mise.toml` -- the config files it loads, each tool's requested
 *      version, and the settings -- is what this gate parsed. The gate reads the file with
 *      `smol-toml`, and mise with its own parser, so a file the two read differently would otherwise
 *      pass here and mean something else to mise. mise is told to read only files named `mise.toml`,
 *      nothing above the checkout and no global config, so a person's own `mise.local.toml` and a
 *      parent checkout's config play no part. Where no `mise` is on PATH the comparison is skipped,
 *      and says so; a `mise` that is found and fails, an untrusted checkout among the causes, is a
 *      failure.
 *
 * WHAT IT DOES NOT SEE. It reads the spellings of a second install named above and no others, so a
 * tool fetched by another route -- a `curl` of a release, `pip`, `corepack` -- passes it, and review
 * is what refuses that. It holds that the lock has a URL and a checksum, not that they are honest: a
 * change to both at once is what the reviewer's floor, which holds every place mise reads a config or
 * a lock from to a person, is for. Likewise a `pypi:` tool's uv lock is held to the digest
 * `mise.lock` records and to the pin it asks for, not each package in it. Rule 7 compares tools,
 * settings and files, not `[task_config]`.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident on the trunk yet: the gate came with mise
 * (`docs/decisions.md` § D-31). Before it, Node's version had four homes that disagreed
 * (`package.json` `engines`, the dev container's `NODE_MAJOR`, CI's setup step reading `engines`, and
 * each machine's own install), and the reviewer's workflow read bd's version back out of the
 * Dockerfile with `sed`. Were this gate wrong, a second home could come back and drift from the pin
 * unseen; a range would let two machines run two versions from one file; a pin moved without
 * `mise lock` would fail every locked install in CI, or install unverified on the first machine of a
 * kind CI does not run; and CI's mise and the container's could drift apart. The near miss, on
 * 2026-10-03: a security review of the branch that added the gate found that a config beside
 * `mise.toml`, and a `mise.toml` the gate's parser and mise's read differently, would each pass the
 * gate as it then stood while mise acted on what the gate never read. Rules 6 and 7, and the floor's
 * wider globs, came from it.
 *
 * INVOCATION.
 *
 *   mise run check:toolchain                               the gate
 *   mise run check:toolchain:selftest                      its fixtures -- every refusal on a doctored copy
 *   TOOLCHAIN_CHECK_ROOT=<dir> mise run check:toolchain    the same gate over a doctored copy
 *
 * NEEDS committed files: `mise.toml`, `mise.lock`, the workflows, the Dockerfile, the policy records
 * and the tracked file list, through `git ls-files` at a checkout's root. It parses TOML with the
 * pinned `smol-toml` and YAML with `js-yaml`. For rule 7 it runs the `mise` on PATH, which reads only
 * `mise.toml` and never the network, in a checkout `mise trust` has trusted, as README.md § Setup
 * asks; its selftest runs a stub, and only in its controls and rule 7's cases: with the stub and a
 * `git ls-files` in every case, its 59 cases took 7.96 s. 0.41 s wall for the gate (1.17 s on the
 * first of two runs) and 2.02 s for its selftest's 61 cases through `node --run` (`/usr/bin/time -p`,
 * the second of two runs) on a macOS 26.7.1 laptop with Node 26.8.1 and mise 2026.10.0, 2026-10-03.
 * With a `pypi:` tool, its uv lock hashed and parsed, and eighteen cases added, 1.45-1.86 s for the gate
 * (two runs, most of it mise's three answers: 0.17 s of user time) and 4.51 s for the selftest's 78
 * cases (12.37 s on the first of two runs), the same host, 2026-10-04. With the lock directory's
 * files and the copy's folder held, and two cases added, 0.18-0.44 s for the gate and 2.31-3.23 s
 * for the selftest's 80, two runs each, the same host and day, at a load average near 64.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { parse as parseToml } from 'smol-toml'
import { gitEnv } from '../tools/lib/git-env.ts'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'
import { TASK_CONFIG as TASK_CONFIG_VALUES } from './lib/tasks.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.TOOLCHAIN_CHECK_ROOT ?? REPO_ROOT
const CONFIG = 'mise.toml'
const LOCK = 'mise.lock'
const WORKFLOWS = '.github/workflows'
const DOCKERFILE = '.devcontainer/Dockerfile'
/** The image's build-context filter, which lets in only what the Dockerfile copies (rule 3). */
const DOCKERIGNORE = '.devcontainer/Dockerfile.dockerignore'
const PLATFORMS_KEY = 'toolchainLockPlatforms'
/** The decision every refusal rests on, with its parentheses, so the citation ends where the section's name does. */
const DECISION = '(`docs/decisions.md` § D-31)'
const SPIKE = 'asdlc-openspec-8juz.1'

/** What `mise.toml` may hold at its top level; an `[env]`, `[hooks]` or `[tasks]` would act on every shim, hook and session. */
const TOP_LEVEL = ['min_version', 'settings', 'task_config', 'tools']
/**
 * The one value each `[task_config]` key may hold, both for the task move (asdlc-openspec-8juz.6), from
 * the task loader, which `check:jobs` holds them to as well: tasks run in the caller's directory, and
 * come from `tasks.toml` alone, since another file named here would be a second registry of names.
 */
const TASK_CONFIG = TASK_CONFIG_VALUES
/** The one template admitted: tasks run in the caller's directory (spike, question 1). */
const CWD_TEMPLATE = TASK_CONFIG.dir
/**
 * The settings `mise.toml` may carry, each by its dotted path, a table's key under its name: each other
 * one could weaken every install or shim, as item 5 of the header says. The three under `task` make a
 * task print only what its command prints (asdlc-openspec-8juz.1, question 4).
 */
const SETTINGS = ['auto_install', 'not_found_system_fallback', 'task.output', 'task.quiet', 'task.timings']
/**
 * The one value each of the three under `task` may hold where it is set: any other changes what a
 * task prints, and `task.output = "silent"` drops a failing task's own output, leaving only mise's
 * `[<task>] ERROR task failed` (asdlc-openspec-8juz.6).
 */
const TASK_SETTING_VALUES = { 'task.output': 'interleave', 'task.quiet': true, 'task.timings': false }
/** Files another version manager reads at the root, each a second home for a version `mise.toml` pins. */
const OTHER_VERSION_FILES = ['.node-version', '.nvmrc', '.python-version']
/** Where the `pypi:` backend keeps its locks (asdlc-openspec-8juz.3): a lock, which configures nothing. */
const PYPI_LOCKS = '.mise/locks/'
/** The backend whose tools uv installs, each with its dependencies in a uv lock of its own. */
const PYPI = 'pypi:'
/**
 * The keys a `pypi:` tool's table may hold: its version, and `extras`, which select more of its
 * dependencies, every one of them in its uv lock. Any other option could run a command at install or
 * fetch from a URL the lock does not name (rule 5).
 */
const PYPI_OPTIONS = ['version', 'extras']
/** A Python package extra's name. */
const EXTRA_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/
/** The `[project]` keys mise writes in a uv lock's `pyproject.toml` (asdlc-openspec-8juz.3), and no other table. */
const PYPROJECT_KEYS = ['name', 'version', 'requires-python', 'dependencies']
/** A Python package's name as the index compares it (PEP 503): lower case, each run of `-`, `_` and `.` one `-`. */
const pep503 = (name) => name.toLowerCase().replace(/[-_.]+/g, '-')
/** A directory under `.mise/locks/` that holds one `pypi:` tool's uv lock, as `mise lock` names it. */
const LOCK_DIR = /^(\.mise\/locks\/pypi-[^/]+\/[^/]+~[0-9a-f]+)\//
/** The files `mise lock` writes in a uv lock's directory, and all that directory may hold. */
const UV_LOCK_FILES = ['pyproject.toml', 'uv.lock']

/**
 * Whether mise would read the tracked file at `path` as a project config beside the root `mise.toml`
 * (rule 6). `.config/mise.toml` is a `mise.toml` by name, and `.config/mise/` a `mise/` directory.
 */
function isOtherMiseConfig(path) {
  if (path === CONFIG || path.startsWith(PYPI_LOCKS)) return false
  const name = path.slice(path.lastIndexOf('/') + 1)
  return name === CONFIG || name === '.mise.toml' || name === '.tool-versions' || /^\.?mise\..+\.toml$/.test(name) || /(^|\/)\.?mise\//.test(path)
}
const EXACT = /^\d+\.\d+\.\d+$/
const CHECKSUM = /^[a-z0-9]+:[0-9a-f]{32,}$/
const SHA256 = /^[0-9a-f]{64}$/
const MISE_ACTION = /^jdx\/mise-action@/
const MISE_IMAGE = /^COPY\s+--from=ghcr\.io\/jdx\/mise:([^\s@]+)(@sha256:[0-9a-f]{64})?\s/m
const VERSION_ARG = /^ARG\s+(\w+_(?:VERSION|MAJOR))\b/gm
/** Each second way to install a tool `mise.toml` pins, as a workflow's step or a Dockerfile line would spell it. */
const SECOND_HOMES = [
  [/\bactions\/setup-node@/, '`actions/setup-node`'],
  [/\bactions\/setup-python@/, '`actions/setup-python`'],
  [/nodesource/i, 'NodeSource'],
  [/\bnpm\s+(?:install|i)\b[^\n]*@beads\/bd\b/, 'an npm install of `@beads/bd`'],
  [/\buv\s+tool\s+install\b/, '`uv tool install`'],
]

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0)
const isText = (v) => typeof v === 'string' && v.trim() !== ''
const firstLine = (text) => String(text).split('\n')[0]
const tuple = (version) => version.split('.').map(Number)
const isNewer = (a, b) => {
  const [x, y] = [tuple(a), tuple(b)]
  for (let i = 0; i < Math.max(x.length, y.length); i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  return false
}
const read = (root, path) => (existsSync(join(root, path)) ? readFileSync(join(root, path), 'utf8') : null)

/** The extras a lock entry or a dependency spells, sorted: a list, or one comma-separated string. */
const extrasList = (value) =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : []).map((e) => String(e).trim()).filter(Boolean).sort(byCodePoint)

/**
 * Rule 2 for a `pypi:` tool, whose lock entry has no platforms: the uv lock `entry` names by `uv.path`
 * under `.mise/locks/`, its `uv.lock` hashing to `uv.digest`, its `pyproject.toml` asking for exactly
 * the pin with `extras`, and the entry's extras the pin's. One message each; empty when it holds.
 */
function pypiLockProblems(root, name, version, entry, extras, relock) {
  const at = `${name}@${version}`
  const pkg = name.slice(PYPI.length)
  const prefix = `${PYPI_LOCKS}pypi-${pkg}/${version}~`
  const path = typeof entry.uv?.path === 'string' ? entry.uv.path : ''
  if (!path.startsWith(prefix) || !/^[0-9a-f]+$/.test(path.slice(prefix.length))) {
    return [
      `${LOCK} names no uv lock for ${at} under ${prefix}<hash> (it names ${JSON.stringify(path || null)}): a ${PYPI} tool's dependencies are locked there, not per platform; ${relock}, and commit ${PYPI_LOCKS}.`,
    ]
  }
  if (!existsSync(join(root, path, 'uv.lock'))) return [`${path}/uv.lock is missing, which ${LOCK} names for ${at}; ${relock}, and commit ${PYPI_LOCKS}.`]
  const problems = []
  const digest = `sha256:${createHash('sha256').update(readFileSync(join(root, path, 'uv.lock'))).digest('hex')}`
  if (entry.uv?.digest !== digest) {
    problems.push(`${path}/uv.lock hashes to ${digest}, where ${LOCK} records ${entry.uv?.digest ?? 'no digest'} for ${at}: the uv lock is not the one ${LOCK} records; ${relock}.`)
  }
  const want = `${pkg}${extras.length > 0 ? `[${extras.join(',')}]` : ''}==${version}`
  let project = {}
  let asked = null
  try {
    const doc = parseToml(read(root, `${path}/pyproject.toml`) ?? '')
    project = doc.project ?? {}
    asked = project.dependencies ?? null
    // uv reads the whole file beside its lock: a `[tool.uv]` index or source fetches from where
    // `mise.lock` does not say.
    const others = [...Object.keys(doc).filter((key) => key !== 'project'), ...Object.keys(project).filter((key) => !PYPROJECT_KEYS.includes(key)).map((key) => `project.${key}`)]
    if (others.length > 0) {
      problems.push(`${path}/pyproject.toml holds ${others.sort(byCodePoint).map((key) => `\`${key}\``).join(', ')}: a uv lock's pyproject names the pin alone, since another key, such as a \`[tool.uv]\` index or source, can fetch from where ${LOCK} does not say; ${relock}.`)
    }
  } catch {
    // Reported as asking for nothing, below.
  }
  const one = Array.isArray(asked) && asked.length === 1 ? /^([^\s[=]+)(?:\[([^\]]*)\])?==(\S+)$/.exec(String(asked[0])) : null
  if (!one || pep503(one[1]) !== pep503(pkg) || one[3] !== version || extrasList(one[2] ?? '').join(',') !== extras.join(',')) {
    problems.push(`${path}/pyproject.toml asks for ${JSON.stringify(asked ?? null)}, where ${CONFIG} pins ${want}: the uv lock was resolved for another pin; ${relock}.`)
  }
  let packages = []
  try {
    packages = parseToml(readFileSync(join(root, path, 'uv.lock'), 'utf8')).package ?? []
  } catch {
    // Reported as holding no package, below.
  }
  if (!(Array.isArray(packages) && packages.some((p) => pep503(String(p?.name ?? '')) === pep503(pkg) && p?.version === version))) {
    problems.push(`${path}/uv.lock holds no ${pkg} ${version}, the release ${CONFIG} pins: the uv lock locks something else; ${relock}.`)
  }
  const locked = extrasList(entry.options?.extras)
  if (locked.join(',') !== extras.join(',')) {
    problems.push(`${LOCK} records the extras ${JSON.stringify(locked)} for ${at}, where ${CONFIG} gives ${JSON.stringify(extras)}; ${relock}.`)
  }
  return problems
}

/** Every string value under `value`, with its dotted path. */
function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value]
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) yield* strings(inner, path ? `${path}.${key}` : key)
  }
}

/** Each setting's dotted path: a table such as `task` gives one path per key under it, `task.output`. */
function settingPaths(settings, prefix = '') {
  return Object.entries(settings ?? {}).flatMap(([key, value]) =>
    value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
      ? settingPaths(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

/** The workflows under `root`, each with its parsed steps; a file that does not parse is a problem of its own. */
function workflows(root, problems) {
  const dir = join(root, WORKFLOWS)
  if (!existsSync(dir)) return []
  const out = []
  for (const name of readdirSync(dir).filter((n) => /\.ya?ml$/.test(n)).sort(byCodePoint)) {
    const path = `${WORKFLOWS}/${name}`
    let doc
    try {
      doc = yamlLoad(readFileSync(join(dir, name), 'utf8'))
    } catch (error) {
      problems.push(`${path} does not parse as YAML: ${firstLine(error.message)}.`)
      continue
    }
    const steps = []
    for (const [job, body] of Object.entries(doc?.jobs ?? {})) {
      for (const step of body?.steps ?? []) steps.push({ job, step: step ?? {} })
    }
    out.push({ path, steps })
  }
  return out
}

/**
 * The files git tracks under `root`, or every file when `root` is no checkout's root, as the
 * selftest's copies and a doctored copy under `.scratch/` are not: git there would list another
 * tree's files. `gitEnv` drops the `GIT_*` keys a hook sets, which would point git at another tree.
 */
function trackedFiles(root) {
  const listed = existsSync(join(root, '.git'))
    ? spawnSync('git', ['ls-files', '-z'], { cwd: root, env: gitEnv(), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    : { status: null }
  if (listed.status === 0) return listed.stdout.split('\0').filter(Boolean)
  const out = []
  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue
      const path = `${prefix}${entry.name}`
      if (entry.isDirectory()) walk(join(dir, entry.name), `${path}/`)
      else out.push(path)
    }
  }
  walk(root, '')
  return out
}

/** `value` with every object's keys in code-point order, so two readings compare as JSON. */
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort(byCodePoint).map((key) => [key, canonical(value[key])]))
      : value

/**
 * Rule 7: what `mise` itself reads from `mise.toml`, held to `pins` and `settings` as this gate parsed
 * them. `mise` is the command and its leading arguments, a stub in the selftest. Pushes onto `notes`
 * why it compared nothing, when no `mise` is on PATH.
 */
function miseView(root, mise, pins, settings, notes) {
  // A directory of this process's own for the global config that never exists: a fixed name in the
  // shared temporary directory is one another user could create first, and mise would load it.
  const private_ = mkdtempSync(join(tmpdir(), 'check-toolchain-mise-'))
  try {
    return askMise(root, mise, pins, settings, notes, join(private_, 'no-global-config.toml'))
  } finally {
    rmSync(private_, { recursive: true, force: true })
  }
}

function askMise(root, mise, pins, settings, notes, globalConfig) {
  const real = realpathSync(root)
  const own = join(real, CONFIG)
  const env = {
    ...process.env,
    MISE_OVERRIDE_CONFIG_FILENAMES: CONFIG,
    MISE_CEILING_PATHS: dirname(real),
    MISE_GLOBAL_CONFIG_FILE: globalConfig,
  }
  const problems = []
  const ask = (args) => {
    const run = spawnSync(mise[0], [...mise.slice(1), ...args], { cwd: root, env, encoding: 'utf8' })
    if (run.error?.code === 'ENOENT') return { absent: true }
    if (run.status !== 0) {
      problems.push(
        `mise is on PATH, and \`mise ${args.join(' ')}\` fails: ${firstLine(run.stderr || run.stdout).trim()} If it says ${CONFIG} is not trusted, run \`mise trust\` in the checkout.`,
      )
      return {}
    }
    try {
      return { value: JSON.parse(run.stdout) }
    } catch {
      problems.push(`\`mise ${args.join(' ')}\` printed no JSON, so what mise reads from ${CONFIG} cannot be compared.`)
      return {}
    }
  }
  const configs = ask(['config', 'ls', '--json'])
  if (configs.absent) {
    notes.push(`no \`mise\` on PATH, so what mise itself reads from ${CONFIG} was not compared with this gate's reading (rule 7).`)
    return problems
  }
  if (Array.isArray(configs.value)) {
    for (const path of configs.value.map((c) => String(c?.path ?? '')).filter((p) => p !== own && p.startsWith(`${real}/`))) {
      problems.push(`mise reads ${path.slice(real.length + 1)} as well as ${CONFIG}: a second config, whose tools, settings, env or hooks this gate does not read.`)
    }
  }
  const listed = ask(['ls', '--current', '--json'])
  if (listed.value && typeof listed.value === 'object') {
    const seen = new Map()
    for (const [name, entries] of Object.entries(listed.value)) {
      for (const entry of Array.isArray(entries) ? entries : []) {
        if (entry?.source?.path === own) seen.set(name, String(entry.requested_version ?? entry.version ?? ''))
      }
    }
    for (const name of [...new Set([...seen.keys(), ...pins.keys()])].sort(byCodePoint)) {
      if (seen.get(name) !== pins.get(name)) {
        problems.push(
          `mise reads ${name} at ${seen.get(name) ?? 'nothing'} from ${CONFIG}, where this gate reads ${pins.get(name) ?? 'nothing'}: the two parsers read the file differently, so a pin this gate holds is not the one mise installs.`,
        )
      }
    }
  }
  const local = ask(['settings', 'ls', '--local', '--json'])
  if (local.value !== undefined) {
    const theirs = JSON.stringify(canonical(local.value ?? {}))
    const ours = JSON.stringify(canonical(settings ?? {}))
    if (theirs !== ours) {
      problems.push(`mise reads [settings] in ${CONFIG} as ${theirs}, where this gate reads ${ours}: the two parsers read the file differently, so a setting this gate admits is not the one mise applies.`)
    }
  }
  return problems
}

/**
 * Every problem with the toolchain under `root`, one message each; empty when it holds. `mise` is the
 * command rule 7 runs, and `notes` receives why it compared nothing, when no `mise` is on PATH.
 */
export function runCheck(root, { mise = ['mise'], notes = [] } = {}) {
  const problems = []
  const configText = read(root, CONFIG)
  if (configText === null) return [`${CONFIG} is missing under ${root}: it is the one home of every tool version this repository installs ${DECISION}.`]
  let config
  try {
    config = parseToml(configText)
  } catch (error) {
    return [`${CONFIG} does not parse as TOML: ${firstLine(error.message)}.`]
  }

  // 5. What the file may hold.
  for (const key of Object.keys(config).filter((k) => !TOP_LEVEL.includes(k)).sort(byCodePoint)) {
    problems.push(
      `\`[${key}]\` in ${CONFIG} is not one of min_version, [tools], [settings] or [task_config]: an [env] or a [hooks] there acts on every shim, hook and session that enters the checkout, and a task there is a second registry of command names.`,
    )
  }
  for (const key of settingPaths(config.settings).filter((k) => !SETTINGS.includes(k)).sort(byCodePoint)) {
    problems.push(
      `\`settings.${key}\` in ${CONFIG} is not one of the settings it may carry (${SETTINGS.join(', ')}): a setting acts on every install and shim, and one can turn off mise's checksum, signature or provenance checks, or trust other files.`,
    )
  }
  for (const [key, want] of Object.entries(TASK_SETTING_VALUES)) {
    const value = key.split('.').reduce((at, part) => (at !== null && typeof at === 'object' ? at[part] : undefined), config.settings)
    if (value !== undefined && value !== want) {
      problems.push(
        `\`settings.${key}\` in ${CONFIG} holds ${JSON.stringify(value)}, not the one value it may hold, ${JSON.stringify(want)}: a task then prints otherwise than its command prints, as \`node --run\` printed it, and \`"silent"\` drops a failing task's own output (${SPIKE}, question 4).`,
      )
    }
  }
  for (const [key, value] of Object.entries(config.task_config ?? {}).sort(([a], [b]) => byCodePoint(a, b))) {
    if (!Object.hasOwn(TASK_CONFIG, key)) problems.push(`\`task_config.${key}\` in ${CONFIG} is not one of \`task_config.dir\` or \`task_config.includes\`.`)
    else if (JSON.stringify(value) !== JSON.stringify(TASK_CONFIG[key])) {
      problems.push(
        `\`task_config.${key}\` in ${CONFIG} holds ${JSON.stringify(value)}, not the one value it may hold, ${JSON.stringify(TASK_CONFIG[key])}: tasks run in the caller's directory, and come from tasks.toml alone.`,
      )
    }
  }
  for (const [path, value] of strings(config)) {
    if (value.includes('{{') && !(path === 'task_config.dir' && value === CWD_TEMPLATE)) {
      problems.push(
        `${CONFIG} holds a template at \`${path}\` (${JSON.stringify(value)}): a template is evaluated by every shim and hook, and the one admitted is \`[task_config] dir = "${CWD_TEMPLATE}"\` (${SPIKE}, question 1).`,
      )
    }
  }
  if (config.settings?.not_found_system_fallback !== false) {
    problems.push(
      `${CONFIG} does not set \`[settings] not_found_system_fallback = false\`: a shim whose pinned tool is not installed then runs whatever the system has under that name, and says nothing (${SPIKE}, question 6).`,
    )
  }
  if (config.settings?.auto_install === false) {
    problems.push(
      `${CONFIG} turns \`auto_install\` off: \`mise run\` then runs the system's binary in place of a pin that is not installed, and says nothing, where left on it installs the pin (${SPIKE}, question 6).`,
    )
  }

  // 1. Exact pins.
  const pins = new Map()
  /** Each `pypi:` tool's extras, sorted, as rule 2 holds its uv lock to them. */
  const extrasOf = new Map()
  const tools = config.tools ?? {}
  if (Object.keys(tools).length === 0) problems.push(`${CONFIG} pins no tool under [tools].`)
  for (const [name, value] of Object.entries(tools)) {
    let version = value
    if (typeof value !== 'string') {
      if (!name.startsWith(PYPI) || value === null || typeof value !== 'object' || Array.isArray(value)) {
        problems.push(
          `${CONFIG} pins ${name} with a table of options, not a plain version string: an option can run a command at install (\`postinstall\`) or fetch from a URL the lock does not name.`,
        )
        continue
      }
      const others = Object.keys(value).filter((key) => !PYPI_OPTIONS.includes(key)).sort(byCodePoint)
      if (others.length > 0) {
        problems.push(
          `${CONFIG} gives ${name} ${others.map((key) => `\`${key}\``).join(', ')}: a ${PYPI} tool's table holds \`version\` and \`extras\` alone, since another option can run a command at install (\`postinstall\`) or fetch from a URL the lock does not name.`,
        )
        continue
      }
      if (value.extras !== undefined && !(Array.isArray(value.extras) && value.extras.length > 0 && value.extras.every((e) => typeof e === 'string' && EXTRA_NAME.test(e)))) {
        problems.push(`${CONFIG} gives ${name} \`extras\` ${JSON.stringify(value.extras)}, not a list of extra names.`)
        continue
      }
      extrasOf.set(name, extrasList(value.extras ?? []))
      version = value.version
    }
    if (!EXACT.test(version)) {
      problems.push(
        `${CONFIG} pins ${name} at ${JSON.stringify(version ?? value)}, not an exact MAJOR.MINOR.PATCH version: a range or a prefix resolves again on each install, so two machines can run two versions from one file.`,
      )
      continue
    }
    pins.set(name, version)
  }

  // 7. What mise itself reads, once every pin parsed here, so a refusal above is not said twice.
  if (pins.size === Object.keys(tools).length) problems.push(...miseView(root, mise, pins, config.settings, notes))

  // 2. The lockfile, for every platform the policy names.
  let platforms = []
  try {
    const value = readPolicy(root)[PLATFORMS_KEY]
    if (value === undefined) problems.push(`\`${PLATFORMS_KEY}\` is missing from tools/policy/: nothing says which platforms ${LOCK} must cover.`)
    else if (!Array.isArray(value) || value.length === 0 || !value.every(isText)) problems.push(`\`${PLATFORMS_KEY}\` in tools/policy/ is not a non-empty list of platform names.`)
    else platforms = value
  } catch (error) {
    problems.push(`tools/policy/ cannot be read: ${firstLine(error.message)}.`)
  }
  const relock = `run \`mise install\`, then \`mise lock --platform ${platforms.join(',')}\`, and commit ${LOCK}`
  const lockText = read(root, LOCK)
  /** Every uv lock `mise.lock` names, once it parses: rule 6's list of the locks `.mise/locks/` may hold. */
  let uvLocks = null
  if (lockText === null) {
    problems.push(`${LOCK} is missing: \`mise install --locked\`, which CI runs, has nothing to verify a download against; ${relock}.`)
  } else {
    let lock
    try {
      lock = parseToml(lockText)
      uvLocks = new Set(Object.values(lock.tools ?? {}).flatMap((entries) => (Array.isArray(entries) ? entries : [])).map((e) => e?.uv?.path).filter(isText))
    } catch (error) {
      problems.push(`${LOCK} does not parse as TOML: ${firstLine(error.message)}.`)
    }
    for (const [name, version] of lock ? pins : []) {
      const entries = Array.isArray(lock.tools?.[name]) ? lock.tools[name] : []
      const entry = entries.find((e) => e?.version === version)
      if (!entry) {
        const held = entries.map((e) => e?.version).filter(isText).join(', ') || 'no version'
        problems.push(
          `${LOCK} holds ${name} at ${held}, not at ${version}, the pin in ${CONFIG}: \`mise install --locked\`, which CI runs, refuses a tool the lock does not hold. Moving a pin means ${relock}.`,
        )
        continue
      }
      if (name.startsWith(PYPI)) {
        problems.push(...pypiLockProblems(root, name, version, entry, extrasOf.get(name) ?? [], relock))
        continue
      }
      for (const platform of platforms) {
        const at = entry[`platforms.${platform}`]
        if (!isText(at?.url) || !CHECKSUM.test(String(at?.checksum ?? ''))) {
          problems.push(`${LOCK} has no URL and checksum for ${name}@${version} on ${platform}: a machine of that kind installs it unverified, or fails a locked install; ${relock}.`)
        }
      }
    }
  }

  // 3. One mise for CI and the dev container.
  const dockerText = read(root, DOCKERFILE)
  const copied = dockerText === null ? null : MISE_IMAGE.exec(dockerText)
  const image = copied?.[1]
  if (dockerText === null) problems.push(`${DOCKERFILE} is missing: the dev container's tools are installed by the mise it copies in.`)
  else if (!image) {
    problems.push(`${DOCKERFILE} copies in no mise (\`COPY --from=ghcr.io/jdx/mise:<version>@sha256:<digest> …\`): the dev container would install the toolchain with a mise nothing pins, or none.`)
  } else if (!copied[2]) {
    problems.push(`${DOCKERFILE} copies in mise by its tag alone: a tag can be moved to another image, so the container would install with a mise nobody checked. Pin it \`@sha256:<digest>\`, as the workflows pin theirs.`)
  }
  // 3, with a pypi: tool: the image's locked install reads its uv lock beside the two files.
  const pypiPins = [...pins.keys()].filter((name) => name.startsWith(PYPI))
  if (dockerText !== null && pypiPins.length > 0) {
    const code = dockerText.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n')
    // Beside means under the folder the `COPY` of `mise.toml` names, where mise looks for the lock.
    const into = /^COPY\b[^\n]*\smise\.toml\s[^\n]*\s(\S+)[ \t]*$/m.exec(code)?.[1].replace(/\/+$/, '') ?? null
    const lockCopies = [...code.matchAll(/^COPY\b[^\n]*\s\.mise\/locks\/?\s+(\S+)[ \t]*$/gm)].map((m) => m[1].replace(/\/+$/, ''))
    if (!lockCopies.some((dest) => into === null || dest === `${into}/.mise/locks`)) {
      problems.push(
        `${DOCKERFILE} copies no \`${PYPI_LOCKS}\` beside ${CONFIG} and ${LOCK}${into === null ? '' : `, into ${into}/.mise/locks`}: the image's \`mise install --locked\` fails on ${pypiPins.join(', ')}, whose uv lock is there.`,
      )
    }
    const admitted = (read(root, DOCKERIGNORE) ?? '').split('\n').some((line) => /^!\.mise\/locks(?:\/(?:\*\*)?)?$/.test(line.trim()))
    if (!admitted) {
      problems.push(`${DOCKERIGNORE} does not let \`${PYPI_LOCKS}\` into the image's build context (\`!.mise/locks/**\`): the image's \`mise install --locked\` fails on ${pypiPins.join(', ')}, whose uv lock is there.`)
    }
  }
  const wfs = workflows(root, problems)
  let firstSha
  for (const { path, steps } of wfs) {
    for (const { job, step } of steps.filter(({ step }) => MISE_ACTION.test(String(step.uses ?? '')))) {
      const version = String(step.with?.version ?? '')
      if (!version) {
        problems.push(`${path}'s \`${job}\` job runs jdx/mise-action with no \`version:\`, so it installs whichever mise is newest that day.`)
      } else if (image && version !== image) {
        problems.push(`${path}'s \`${job}\` job pins mise ${version}, and ${DOCKERFILE} copies in ${image}: CI and the dev container would install the toolchain with two mise releases.`)
      }
      if (!/^jdx\/mise-action@[0-9a-f]{40}$/.test(String(step.uses))) {
        problems.push(`${path}'s \`${job}\` job runs ${step.uses}, a third party's action by a tag, which can be moved to other code; pin it by its full commit.`)
      }
      const sha = String(step.with?.sha256 ?? '')
      if (!SHA256.test(sha)) {
        problems.push(`${path}'s \`${job}\` job runs jdx/mise-action and carries no \`sha256:\` of the mise binary, so a release swapped under its tag would install unseen.`)
      } else if (!firstSha) firstSha = { path, job, sha }
      else if (sha !== firstSha.sha) {
        problems.push(
          `${path}'s \`${job}\` job carries the mise binary's \`sha256:\` ${sha}, where ${firstSha.path}'s \`${firstSha.job}\` job carries ${firstSha.sha}: one mise release has one binary, so at most one of them is that release.`,
        )
      }
    }
  }
  if (config.min_version === undefined) problems.push(`${CONFIG} has no \`min_version\`, so an older mise reads it as best it can rather than refuse.`)
  else if (typeof config.min_version !== 'string' || !EXACT.test(config.min_version)) problems.push(`${CONFIG}'s \`min_version\` ${JSON.stringify(config.min_version)} is not an exact MAJOR.MINOR.PATCH version.`)
  else if (image && isNewer(config.min_version, image)) {
    problems.push(`${CONFIG}'s \`min_version\` ${config.min_version} is newer than the mise ${image} the dev container and CI install: each of them would refuse the file.`)
  }

  // 4. No second home.
  const second = (where, text) => {
    for (const [pattern, what] of SECOND_HOMES) {
      if (pattern.test(text)) problems.push(`${where} installs ${what}: a second home for a tool ${CONFIG} pins, which drifts from the pin unseen ${DECISION}. Install it through mise.`)
    }
  }
  for (const { path, steps } of wfs) {
    for (const { job, step } of steps) second(`${path}'s \`${job}\` job`, `${step.uses ?? ''}\n${step.run ?? ''}`)
  }
  if (dockerText !== null) {
    const code = dockerText.split('\n').filter((line) => !line.trimStart().startsWith('#')).join('\n')
    second(DOCKERFILE, code)
    for (const [, name] of code.matchAll(VERSION_ARG)) {
      problems.push(`${DOCKERFILE} declares \`ARG ${name}\`: a version stated in the Dockerfile is a second home for one ${CONFIG} pins. Pin the tool in ${CONFIG}.`)
    }
  }
  const tracked = trackedFiles(root)
  for (const name of OTHER_VERSION_FILES.filter((n) => tracked.includes(n))) {
    problems.push(`${name} is at the checkout root, and another version manager reads it: a second home for a version ${CONFIG} pins. Delete it.`)
  }

  // 6. No other mise config, at any depth.
  for (const path of tracked.filter(isOtherMiseConfig).sort(byCodePoint)) {
    problems.push(
      `${path} is a mise config beside ${CONFIG}: mise loads its tools, settings, env and hooks too, and trusts it where it trusts the checkout, and this gate reads none of them. Move what it holds into ${CONFIG}, or delete it.`,
    )
  }
  // 2, the rest: no uv lock under `.mise/locks/` that no entry of the lockfile names. Only a lock's
  // own directory counts, so a README beside the locks is none.
  const stale = new Set(tracked.map((path) => LOCK_DIR.exec(path)?.[1]).filter(Boolean))
  for (const dir of uvLocks === null ? [] : [...stale].filter((d) => !uvLocks.has(d)).sort(byCodePoint)) {
    problems.push(`${dir} is a uv lock no entry of ${LOCK} names, as a moved pin leaves behind: delete it.`)
  }
  // 2, and a uv lock's directory holds its `pyproject.toml` and `uv.lock` alone.
  const extra = tracked.filter((path) => {
    const dir = LOCK_DIR.exec(path)?.[1]
    return dir !== undefined && !UV_LOCK_FILES.includes(path.slice(dir.length + 1))
  })
  for (const path of extra.sort(byCodePoint)) {
    problems.push(
      `${path} sits in a uv lock's directory, which holds its \`pyproject.toml\` and \`uv.lock\` alone: another file there, such as a \`uv.toml\`, which uv reads as configuration when it runs in that directory, could fetch from where ${LOCK} does not say. Delete it.`,
    )
  }
  return problems
}

function main() {
  const notes = []
  const problems = runCheck(ROOT, { notes })
  for (const note of notes) console.log(`toolchain: ${note}`)
  if (problems.length === 0) {
    const config = parseToml(readFileSync(join(ROOT, CONFIG), 'utf8'))
    const platforms = readPolicy(ROOT)[PLATFORMS_KEY]
    const image = MISE_IMAGE.exec(readFileSync(join(ROOT, DOCKERFILE), 'utf8'))[1]
    const actions = workflows(ROOT, []).flatMap(({ steps }) => steps).filter(({ step }) => MISE_ACTION.test(String(step.uses ?? ''))).length
    const names = Object.keys(config.tools)
    const pypi = names.filter((name) => name.startsWith(PYPI)).length
    console.log(
      `toolchain: ${names.length} tool(s) pinned exactly in ${CONFIG}, ${names.length - pypi} in ${LOCK} for ${platforms.length} platform(s) and ${pypi} by a uv lock under ${PYPI_LOCKS}; ` +
        `${actions} jdx/mise-action step(s) and the dev container on mise ${image}; no second home and no other mise config; ` +
        (notes.length === 0 ? `and mise reads ${CONFIG} as this gate does.` : 'mise itself not asked.'),
    )
    process.exit(0)
  }
  console.error(`toolchain: ${problems.length} problem(s).\n`)
  for (const problem of problems) console.error(`  - ${problem}\n`)
  process.exit(1)
}

/* --------------------------------------------------------------------------------- selftest ----- */

const VERIFY = `${WORKFLOWS}/verify.yml`
const REVIEW = `${WORKFLOWS}/pr-review.yml`

/** Replace `from` in one file of a doctored copy; an edit that changes nothing is a broken fixture. */
const edit = (path, from, to) => (dir) => {
  const full = join(dir, path)
  const before = readFileSync(full, 'utf8')
  const after = before.replace(from, to)
  if (after === before) throw new Error(`selftest fixture for ${path} changed nothing -- the doctoring missed its target`)
  writeFileSync(full, after)
}
const append = (path, text) => (dir) => writeFileSync(join(dir, path), `${readFileSync(join(dir, path), 'utf8')}${text}`)
const write = (path, text) => (dir) => {
  mkdirSync(dirname(join(dir, path)), { recursive: true })
  writeFileSync(join(dir, path), text)
}
const remove = (path) => (dir) => rmSync(join(dir, path))
const policy = (change) => (dir) => editPolicy(dir, change)
const beforeEntrypoint = (line) => edit(DOCKERFILE, /^ENTRYPOINT \[/m, `${line}\nENTRYPOINT [`)

function cases() {
  return [
    { name: 'control: the live files, undoctored', doctor: () => {}, expect: 'pass' },
    // The live file carries the one [task_config] admitted and the three task settings; without them it passes too.
    { name: 'control: no [task_config] and no task setting', doctor: (dir) => { edit(CONFIG, /^\[task_config\]\n[\s\S]*$/m, '')(dir); edit(CONFIG, /^task\.[a-z_]+ = .*\n/gm, '')(dir) }, expect: 'pass' },
    { name: 'control: a commented mention of an old install', doctor: beforeEntrypoint('# NodeSource and ARG NODE_MAJOR=22 once installed Node here.'), expect: 'pass' },
    { name: 'a pin that is a range', doctor: edit(CONFIG, /^node = "[^"]+"$/m, 'node = "24"'), expect: /^mise\.toml pins node at "24", not an exact MAJOR\.MINOR\.PATCH version/ },
    { name: 'a pin the lock does not hold', doctor: edit(CONFIG, /^(gh = "[^"]+")$/m, '$1\njq = "1.8.1"'), expect: /^mise\.lock holds jq at no version, not at 1\.8\.1, the pin in mise\.toml/ },
    { name: 'a pin moved without mise lock', doctor: edit(CONFIG, /^gh = "[^"]+"$/m, 'gh = "2.0.0"'), expect: /^mise\.lock holds gh at [0-9.]+, not at 2\.0\.0, the pin in mise\.toml/ },
    { name: 'a platform missing from the lock', doctor: edit(LOCK, '[tools.vale."platforms.windows-x64"]', '[tools.vale."platforms.windows-arm64"]'), expect: /^mise\.lock has no URL and checksum for vale@[0-9.]+ on windows-x64/ },
    { name: 'a checksum missing from the lock', doctor: edit(LOCK, /(\[tools\.node\."platforms\.linux-x64"\]\n)checksum = "[^"]+"\n/, '$1'), expect: /^mise\.lock has no URL and checksum for node@[0-9.]+ on linux-x64/ },
    { name: 'a platform the policy adds and the lock does not cover', doctor: policy((p) => p[PLATFORMS_KEY].push('linux-riscv64')), expect: /has no URL and checksum for [^ ]+ on linux-riscv64/ },
    {
      name: 'the policy without the platforms',
      doctor: policy((p) => {
        delete p[PLATFORMS_KEY]
        delete p[`${PLATFORMS_KEY}Means`]
      }),
      expect: /^`toolchainLockPlatforms` is missing from tools\/policy\//,
    },
    { name: 'no lockfile', doctor: remove(LOCK), expect: /^mise\.lock is missing/ },
    { name: 'a workflow pins another mise than the container', doctor: edit(VERIFY, /^( +version: )\S+$/m, '$12026.1.0'), expect: /^\.github\/workflows\/verify\.yml's `verify` job pins mise 2026\.1\.0, and \.devcontainer\/Dockerfile copies in/ },
    { name: 'a mise-action step with no version', doctor: edit(VERIFY, /^ +version: \S+\n/m, ''), expect: /^\.github\/workflows\/verify\.yml's `verify` job runs jdx\/mise-action with no `version:`/ },
    { name: 'the mise action pinned by a tag', doctor: edit(VERIFY, /jdx\/mise-action@[0-9a-f]{40}/, 'jdx/mise-action@v5'), expect: /^\.github\/workflows\/verify\.yml's `verify` job runs jdx\/mise-action@v5, a third party's action by a tag/ },
    { name: 'a mise-action step with no sha256', doctor: edit(VERIFY, /^ +sha256: \S+\n/m, ''), expect: /^\.github\/workflows\/verify\.yml's `verify` job runs jdx\/mise-action and carries no `sha256:`/ },
    { name: 'two mise-action steps carry two sha256s', doctor: edit(REVIEW, /^( +sha256: )\S+$/m, `$1${'f'.repeat(64)}`), expect: /^\.github\/workflows\/verify\.yml's `verify` job carries the mise binary's `sha256:` [0-9a-f]{64}, where \.github\/workflows\/pr-review\.yml's `queue` job carries f{64}/ },
    { name: 'a min_version newer than the pinned mise', doctor: edit(CONFIG, /^min_version = "[^"]+"$/m, 'min_version = "2099.1.0"'), expect: /^mise\.toml's `min_version` 2099\.1\.0 is newer than the mise/ },
    { name: 'no min_version', doctor: edit(CONFIG, /^min_version = "[^"]+"\n/m, ''), expect: /^mise\.toml has no `min_version`/ },
    { name: 'the dev container copies in no mise', doctor: edit(DOCKERFILE, /^COPY --from=ghcr\.io\/jdx\/mise:.*\n/m, ''), expect: /^\.devcontainer\/Dockerfile copies in no mise/ },
    { name: 'the dev container copies in mise by its tag alone', doctor: edit(DOCKERFILE, /(COPY --from=ghcr\.io\/jdx\/mise:[^\s@]+)@sha256:[0-9a-f]+/, '$1'), expect: /^\.devcontainer\/Dockerfile copies in mise by its tag alone/ },
    { name: 'actions/setup-node back in a workflow', doctor: edit(VERIFY, 'uses: jdx/mise-action@', 'uses: actions/setup-node@'), expect: /^\.github\/workflows\/verify\.yml's `verify` job installs `actions\/setup-node`: a second home/ },
    { name: 'actions/setup-python back in a workflow', doctor: edit(VERIFY, 'uses: jdx/mise-action@', 'uses: actions/setup-python@'), expect: /^\.github\/workflows\/verify\.yml's `verify` job installs `actions\/setup-python`: a second home/ },
    { name: 'NodeSource back in the Dockerfile', doctor: beforeEntrypoint('RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -'), expect: /^\.devcontainer\/Dockerfile installs NodeSource: a second home/ },
    { name: 'a version ARG back in the Dockerfile', doctor: beforeEntrypoint('ARG VALE_VERSION=3.23.0'), expect: /^\.devcontainer\/Dockerfile declares `ARG VALE_VERSION`: a version stated in the Dockerfile/ },
    { name: 'an npm install of bd back in a workflow', doctor: edit(REVIEW, /^( +run: )node scripts\/pr-review\.mjs next$/m, '$1npm install -g @beads/bd@1.3.0'), expect: /^\.github\/workflows\/pr-review\.yml's `queue` job installs an npm install of `@beads\/bd`: a second home/ },
    { name: 'uv tool install back in the Dockerfile', doctor: beforeEntrypoint('RUN uv tool install "graphifyy[mcp]==0.9.73"'), expect: /^\.devcontainer\/Dockerfile installs `uv tool install`: a second home/ },
    { name: 'an .nvmrc at the checkout root', doctor: write('.nvmrc', '24\n'), expect: /^\.nvmrc is at the checkout root, and another version manager reads it/ },
    { name: 'an [env] in mise.toml', doctor: append(CONFIG, '\n[env]\nFOO = "1"\n'), expect: /^`\[env\]` in mise\.toml is not one of min_version, \[tools\], \[settings\] or \[task_config\]/ },
    { name: 'a [tasks] in mise.toml', doctor: append(CONFIG, '\n[tasks.hello]\nrun = "echo hello"\n'), expect: /^`\[tasks\]` in mise\.toml is not one of/ },
    { name: 'a task_config key other than dir and includes', doctor: edit(CONFIG, /^(includes = \["tasks\.toml"\])$/m, '$1\nfoo = "bar"'), expect: /^`task_config\.foo` in mise\.toml is not one of/ },
    { name: 'a task_config dir other than {{cwd}}', doctor: edit(CONFIG, /^dir = "\{\{cwd\}\}"$/m, 'dir = "scripts"'), expect: /^`task_config\.dir` in mise\.toml holds "scripts", not the one value it may hold/ },
    { name: 'a task_config includes naming another file', doctor: edit(CONFIG, /^includes = \["tasks\.toml"\]$/m, 'includes = ["tasks.toml", "more-tasks.toml"]'), expect: /^`task_config\.includes` in mise\.toml holds \["tasks\.toml","more-tasks\.toml"\], not the one value it may hold/ },
    { name: 'a template other than task_config dir {{cwd}}', doctor: edit(CONFIG, /^dir = "\{\{cwd\}\}"$/m, 'dir = "{{config_root}}"'), expect: /^mise\.toml holds a template at `task_config\.dir` \("\{\{config_root\}\}"\)/ },
    { name: 'a task setting it does not admit', doctor: edit(CONFIG, /^(task\.timings = false)$/m, '$1\ntask.run_auto_install = false'), expect: /^`settings\.task\.run_auto_install` in mise\.toml is not one of the settings it may carry/ },
    { name: 'a task setting at a value it does not admit', doctor: edit(CONFIG, /^task\.output = "interleave"$/m, 'task.output = "silent"'), expect: /^`settings\.task\.output` in mise\.toml holds "silent", not the one value it may hold, "interleave"/ },
    { name: 'the system fallback left on', doctor: edit(CONFIG, /^not_found_system_fallback = false\n/m, ''), expect: /^mise\.toml does not set `\[settings\] not_found_system_fallback = false`/ },
    { name: 'a tool pinned with a table of options', doctor: edit(CONFIG, /^gh = "([^"]+)"$/m, 'gh = { version = "$1", postinstall = "echo installed" }'), expect: /^mise\.toml pins gh with a table of options, not a plain version string/ },
    { name: 'a setting that turns a check off', doctor: edit(CONFIG, /^(not_found_system_fallback = false)$/m, '$1\ngithub_attestations = false'), expect: /^`settings\.github_attestations` in mise\.toml is not one of the settings it may carry/ },
    { name: 'auto_install turned off', doctor: edit(CONFIG, /^(not_found_system_fallback = false)$/m, '$1\nauto_install = false'), expect: /^mise\.toml turns `auto_install` off/ },
    { name: 'a mise.toml that is not TOML', doctor: write(CONFIG, 'node = \n'), expect: /^mise\.toml does not parse as TOML/ },
    { name: 'no mise.toml', doctor: remove(CONFIG), expect: /^mise\.toml is missing under / },
    { name: 'no tool under [tools]', doctor: edit(CONFIG, /^\[tools\]\n[\s\S]*?(?=^\[settings\])/m, ''), expect: /^mise\.toml pins no tool under \[tools\]/ },
    { name: 'a min_version that is not exact', doctor: edit(CONFIG, /^min_version = "[^"]+"$/m, 'min_version = "2026.10"'), expect: /^mise\.toml's `min_version` "2026\.10" is not an exact MAJOR\.MINOR\.PATCH version/ },
    { name: 'the platforms not a list', doctor: policy((p) => { p[PLATFORMS_KEY] = 'linux-x64' }), expect: /^`toolchainLockPlatforms` in tools\/policy\/ is not a non-empty list of platform names/ },
    { name: 'a policy record that cannot be read', doctor: write('tools/policy/tool-settings.json', '{\n'), expect: /^tools\/policy\/ cannot be read: / },
    { name: 'a mise.lock that is not TOML', doctor: write(LOCK, 'tools = \n'), expect: /^mise\.lock does not parse as TOML/ },
    { name: 'a workflow that is not YAML', doctor: write(VERIFY, 'jobs: [\n'), expect: /^\.github\/workflows\/verify\.yml does not parse as YAML/ },
    { name: 'no Dockerfile', doctor: remove(DOCKERFILE), expect: /^\.devcontainer\/Dockerfile is missing/ },
    // 6. Another mise config, at any depth; the live control holds a pypi: tool's uv lock under
    // .mise/locks/ to be none.
    { name: 'a mise config directory beside mise.toml', doctor: write('.mise/config.toml', '[env]\nFOO = "1"\n'), expect: /^\.mise\/config\.toml is a mise config beside mise\.toml/ },
    { name: 'a mise.toml below the root', doctor: write('apps/mise.toml', '[hooks]\nenter = "echo"\n'), expect: /^apps\/mise\.toml is a mise config beside mise\.toml/ },
    { name: 'a mise.local.toml tracked', doctor: write('mise.local.toml', '[settings]\njobs = 3\n'), expect: /^mise\.local\.toml is a mise config beside mise\.toml/ },
    { name: 'a .tool-versions', doctor: write('.tool-versions', 'node 22.0.0\n'), expect: /^\.tool-versions is a mise config beside mise\.toml/ },
    { name: 'a .config/mise config', doctor: write('.config/mise/config.toml', '[env]\nFOO = "1"\n'), expect: /^\.config\/mise\/config\.toml is a mise config beside mise\.toml/ },
    { name: 'a .config/mise.toml', doctor: write('.config/mise.toml', '[env]\nFOO = "1"\n'), expect: /^\.config\/mise\.toml is a mise config beside mise\.toml/ },
    { name: 'a .mise.toml', doctor: write('.mise.toml', '[hooks]\nenter = "echo"\n'), expect: /^\.mise\.toml is a mise config beside mise\.toml/ },
    // 7. What mise itself reads, through the stub `mise`.
    { name: 'control: no mise on PATH, so mise is not asked, and says so', doctor: () => {}, mise: 'absent', expect: 'pass' },
    { name: 'mise is on PATH and fails', doctor: () => {}, stub: (o) => { o.fail = 'mise ERROR Config files in mise.toml are not trusted.' }, expect: /^mise is on PATH, and `mise config ls --json` fails: mise ERROR Config files in mise\.toml are not trusted\./ },
    { name: 'mise prints no JSON', doctor: () => {}, stub: (o) => { o.raw = 'node 24.21.0\n' }, expect: /^`mise config ls --json` printed no JSON, so what mise reads from mise\.toml cannot be compared/ },
    { name: 'mise reads another version than this gate', doctor: () => {}, stub: (o) => { o['ls --current --json'].node[0].requested_version = '24.20.0' }, expect: /^mise reads node at 24\.20\.0 from mise\.toml, where this gate reads [0-9.]+: the two parsers read the file differently/ },
    {
      name: 'mise reads a tool this gate does not',
      doctor: () => {},
      stub: (o) => { o['ls --current --json'].jq = [{ version: '1.8.1', requested_version: '1.8.1', source: { type: 'mise.toml', path: o.own } }] },
      expect: /^mise reads jq at 1\.8\.1 from mise\.toml, where this gate reads nothing/,
    },
    { name: 'mise reads a setting this gate does not', doctor: () => {}, stub: (o) => { o['settings ls --local --json'].jobs = 3 }, expect: /^mise reads \[settings\] in mise\.toml as .*"jobs":3.*, where this gate reads/ },
    { name: 'mise reads a second config file', doctor: () => {}, stub: (o) => { o['config ls --json'].push({ path: join(o.real, '.mise/config.toml'), tools: [] }) }, expect: /^mise reads \.mise\/config\.toml as well as mise\.toml/ },
  ]
}

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** The live tree's first `pypi:` tool with the uv lock `mise.lock` names for it, which `pypiCases` doctor; null with none. */
function livePypi() {
  const lock = parseToml(readFileSync(join(REPO_ROOT, LOCK), 'utf8'))
  for (const [name, entries] of Object.entries(lock.tools ?? {})) {
    const entry = name.startsWith(PYPI) && Array.isArray(entries) ? entries.find((e) => isText(e?.uv?.path)) : undefined
    if (entry) return { name, version: String(entry.version), path: entry.uv.path, pkg: name.slice(PYPI.length) }
  }
  return null
}

/** Rules 2 and 5 for a `pypi:` tool, each case breaking one thing in a copy of the live tree's. */
function pypiCases({ name, version, path, pkg }) {
  const at = `${escape(name)}@${escape(version)}`
  return [
    { name: 'a pypi: tool given an option besides version and extras', doctor: edit(CONFIG, new RegExp(`^("${escape(name)}" = \\{[^}\\n]*)\\}$`, 'm'), '$1, postinstall = "echo installed" }'), expect: new RegExp(`^mise\\.toml gives ${escape(name)} \`postinstall\`: a pypi: tool's table holds \`version\` and \`extras\` alone`) },
    { name: 'extras given to a tool that is not a pypi: tool', doctor: edit(CONFIG, /^gh = "([^"]+)"$/m, 'gh = { version = "$1", extras = ["mcp"] }'), expect: /^mise\.toml pins gh with a table of options, not a plain version string/ },
    { name: "a pypi: tool's extras that are not a list of names", doctor: edit(CONFIG, /extras = \[[^\]\n]*\]/, 'extras = "mcp; rm -rf ~"'), expect: new RegExp(`^mise\\.toml gives ${escape(name)} \`extras\` "mcp; rm -rf ~", not a list of extra names`) },
    { name: 'a pypi: pin moved without mise lock', doctor: edit(CONFIG, `version = "${version}"`, 'version = "0.0.1"'), expect: new RegExp(`^mise\\.lock holds ${escape(name)} at ${escape(version)}, not at 0\\.0\\.1, the pin in mise\\.toml`) },
    { name: 'mise.lock naming no uv lock for a pypi: tool', doctor: edit(LOCK, /^uv = \{[^\n]*\}\n/m, ''), expect: new RegExp(`^mise\\.lock names no uv lock for ${at} under ${escape(`${PYPI_LOCKS}pypi-${pkg}/${version}~`)}<hash>`) },
    { name: 'a uv lock edited by hand', doctor: append(`${path}/uv.lock`, '# edited\n'), expect: new RegExp(`^${escape(path)}/uv\\.lock hashes to sha256:[0-9a-f]{64}, where mise\\.lock records sha256:[0-9a-f]{64} for ${at}`) },
    { name: 'a uv lock missing', doctor: remove(`${path}/uv.lock`), expect: new RegExp(`^${escape(path)}/uv\\.lock is missing, which mise\\.lock names for ${at}`) },
    { name: 'a uv lock resolved for another extra', doctor: edit(`${path}/pyproject.toml`, /\[[^\]"\n]*\]==/, '[all]=='), expect: new RegExp(`^${escape(path)}/pyproject\\.toml asks for \\["${escape(pkg)}\\[all\\]==${escape(version)}"\\], where mise\\.toml pins ${escape(pkg)}`) },
    { name: "mise.lock's extras for a pypi: tool not the pin's", doctor: edit(LOCK, /^extras = "[^"\n]*"$/m, 'extras = "all"'), expect: new RegExp(`^mise\\.lock records the extras \\["all"\\] for ${at}, where mise\\.toml gives`) },
    { name: 'a uv lock no entry of mise.lock names, as a moved pin leaves behind', doctor: write(`${PYPI_LOCKS}pypi-${pkg}/0.0.1~deadbeef/uv.lock`, 'version = 1\n'), expect: new RegExp(`^${escape(`${PYPI_LOCKS}pypi-${pkg}/0.0.1~deadbeef`)} is a uv lock no entry of mise\\.lock names`) },
    { name: 'control: a README beside the uv locks is no stale lock', doctor: write(`${PYPI_LOCKS}README.md`, '# Locks\n'), expect: 'pass' },
    { name: "a pypi: tool's extras list holding a name that is no extra", doctor: edit(CONFIG, /extras = \[[^\]\n]*\]/, 'extras = ["mcp", "x; rm -rf ~"]'), expect: new RegExp(`^mise\\.toml gives ${escape(name)} \`extras\` \\["mcp","x; rm -rf ~"\\], not a list of extra names`) },
    { name: 'a uv lock resolved for another release', doctor: edit(`${path}/pyproject.toml`, `==${version}`, '==0.0.1'), expect: new RegExp(`^${escape(path)}/pyproject\\.toml asks for \\[".*==0\\.0\\.1"\\], where mise\\.toml pins`) },
    { name: 'a uv lock resolved for another package', doctor: edit(`${path}/pyproject.toml`, `"${pkg}[`, '"another-package['), expect: new RegExp(`^${escape(path)}/pyproject\\.toml asks for \\["another-package\\[`) },
    { name: "a uv lock's pyproject naming a source of its own", doctor: append(`${path}/pyproject.toml`, `\n[tool.uv.sources]\n${pkg} = { url = "https://example.invalid/x.whl" }\n`), expect: new RegExp(`^${escape(path)}/pyproject\\.toml holds \`tool\`: a uv lock's pyproject names the pin alone`) },
    { name: 'a uv lock that holds no package at the pin', doctor: edit(`${path}/uv.lock`, new RegExp(`^(name = "${escape(pkg)}"\\nversion = )"${escape(version)}"`, 'm'), '$1"0.0.1"'), expect: new RegExp(`^${escape(path)}/uv\\.lock holds no ${escape(pkg)} ${escape(version)}, the release mise\\.toml pins`) },
    { name: 'the dev container copies no .mise/locks though a pypi: tool is pinned', doctor: edit(DOCKERFILE, /^COPY [^\n]*\.mise\/locks[^\n]*\n/m, ''), expect: /^\.devcontainer\/Dockerfile copies no `\.mise\/locks\/` beside mise\.toml and mise\.lock/ },
    { name: "the dev container's build context leaves .mise/locks out", doctor: edit(DOCKERIGNORE, /^!\.mise\/locks\/\*\*\n/m, ''), expect: /^\.devcontainer\/Dockerfile\.dockerignore does not let `\.mise\/locks\/` into the image's build context/ },
    { name: 'the dev container copies .mise/locks elsewhere than beside mise.toml', doctor: edit(DOCKERFILE, /^(COPY [^\n]*\.mise\/locks\s+)(\S+)$/m, '$1/tmp/elsewhere/.mise/locks'), expect: /^\.devcontainer\/Dockerfile copies no `\.mise\/locks\/` beside mise\.toml and mise\.lock, into \S+\/\.mise\/locks: / },
    { name: "a file beside a uv lock's pyproject and uv.lock", doctor: write(`${path}/uv.toml`, '[[index]]\nurl = "https://example.invalid/simple"\ndefault = true\n'), expect: new RegExp(`^${escape(path)}/uv\\.toml sits in a uv lock's directory, which holds its \`pyproject\\.toml\` and \`uv\\.lock\` alone`) },
  ]
}

/**
 * The stub `mise` the selftest runs: it answers each query with what the fixture's own `mise.toml`
 * says, as this gate parsed it, unless a case doctors an answer. The first argument is its answers.
 */
const STUB = `import { readFileSync } from 'node:fs'
const [answers, ...args] = process.argv.slice(2)
const out = JSON.parse(readFileSync(answers, 'utf8'))
if (out.fail) { process.stderr.write(out.fail + '\\n'); process.exit(1) }
if (out.raw) { process.stdout.write(out.raw); process.exit(0) }
process.stdout.write(JSON.stringify(out[args.join(' ')] ?? null))
`

/** The answers a mise that reads the fixture's `mise.toml` as this gate does would give. */
function stubAnswers(dir) {
  const real = realpathSync(dir)
  const own = join(real, CONFIG)
  let config = {}
  try {
    config = parseToml(readFileSync(join(dir, CONFIG), 'utf8'))
  } catch {
    // A case whose mise.toml does not parse never reaches rule 7.
  }
  const tools = Object.fromEntries(
    Object.entries(config.tools ?? {}).map(([name, value]) => {
      const version = typeof value === 'string' ? value : String(value?.version ?? '')
      return [name, [{ version, requested_version: version, source: { type: 'mise.toml', path: own } }]]
    }),
  )
  return { own, real, 'config ls --json': [{ path: own, tools: Object.keys(tools) }], 'ls --current --json': tools, 'settings ls --local --json': config.settings ?? {} }
}

function copyInputs(dir) {
  for (const path of [CONFIG, LOCK, DOCKERFILE, DOCKERIGNORE]) cpSync(join(REPO_ROOT, path), join(dir, path), { recursive: true })
  cpSync(join(REPO_ROOT, WORKFLOWS), join(dir, WORKFLOWS), { recursive: true })
  if (existsSync(join(REPO_ROOT, PYPI_LOCKS))) cpSync(join(REPO_ROOT, PYPI_LOCKS), join(dir, PYPI_LOCKS), { recursive: true })
  copyPolicy(REPO_ROOT, dir)
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-toolchain-'))
  const results = []
  const pypi = livePypi()
  // The pypi: cases doctor the live tree's uv lock; with none to doctor, they cannot hold the rules.
  if (pypi === null) results.push({ name: 'the pypi: cases', ok: false, detail: `no pypi: tool in the live ${LOCK} names a uv lock, so rules 2 and 5 for one are not tested` })
  try {
    const stub = join(base, 'mise-stub.mjs')
    writeFileSync(stub, STUB)
    for (const { name, doctor, expect, stub: doctorAnswers, mise } of [...cases(), ...(pypi ? pypiCases(pypi) : [])]) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      copyInputs(dir)
      doctor(dir)
      const answers = stubAnswers(dir)
      doctorAnswers?.(answers)
      const answersFile = `${dir}.answers.json`
      writeFileSync(answersFile, JSON.stringify(answers))
      const notes = []
      // Only a control or a rule-7 case asks the stub: three spawns a case cost every case 0.1 s.
      const asks = mise !== 'absent' && (doctorAnswers || name.startsWith('control'))
      const command = asks ? [process.execPath, stub, answersFile] : [join(base, 'no-such-mise')]
      const problems = runCheck(dir, { mise: command, notes })
      if (mise === 'absent' && notes.length === 0) problems.push('selftest: no note says mise was not asked')
      let ok
      let detail
      if (expect === 'pass') {
        ok = problems.length === 0
        detail = ok ? 'passes' : `unexpected problem(s): ${problems.join(' | ')}`
      } else {
        ok = problems.some((problem) => expect.test(problem))
        detail = ok
          ? `fails for that reason (${problems.length} problem(s))`
          : problems.length === 0
            ? 'PASSED, but should have failed'
            : `failed, but not for that reason: ${problems.join(' | ')}`
      }
      results.push({ name, ok, detail })
      if (name.startsWith('control: the live') && !ok) {
        console.error(`selftest: the undoctored copy does not pass, so no case can be trusted: ${detail}`)
        process.exit(1)
      }
    }
  } finally {
    rmSync(base, { recursive: true, force: true })
  }
  const failed = results.filter((result) => !result.ok)
  for (const { name, ok, detail } of results) console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name} -- ${detail}`)
  const controls = results.filter((result) => result.name.startsWith('control')).length
  console.log(`toolchain selftest: ${results.length - failed.length}/${results.length} cases hold (${controls} controls and ${results.length - controls} doctored copies).`)
  process.exit(failed.length === 0 ? 0 : 1)
}

if (process.argv.includes('--selftest')) selftest()
else main()
