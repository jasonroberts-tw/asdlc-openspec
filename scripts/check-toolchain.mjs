/**
 * Toolchain gate. It holds `mise.toml`, the one home of every tool version this repository installs
 * (`docs/decisions.md` § D-29), to its lockfile and to every other place a tool could be installed:
 *
 *   1. every `[tools]` pin is an exact MAJOR.MINOR.PATCH version, so the file says what runs rather
 *      than a range each later install resolves again;
 *   2. `mise.lock` holds each tool at its pin, with a URL and a checksum for every platform
 *      `toolchainLockPlatforms` in `tools/policy/tool-settings.json` names, so `mise install --locked`,
 *      which CI runs, verifies what it downloads on every kind of machine this repository is set up on;
 *   3. every `jdx/mise-action` step under `.github/workflows/`, itself pinned by a full commit rather
 *      than a tag a third party can move, pins `version:` to the mise the dev
 *      container copies in (`COPY --from=ghcr.io/jdx/mise:<version>@sha256:<digest>` in
 *      `.devcontainer/Dockerfile`) and carries a `sha256:` of the mise binary, the same in every
 *      step; the container's copy names its image's digest, not the tag alone; and `mise.toml`'s
 *      `min_version` is no newer;
 *   4. nothing installs a tool a second way: no `actions/setup-node` or `actions/setup-python`, no
 *      NodeSource, no npm install of `@beads/bd` and no `uv tool install` in a workflow's step or a
 *      line of the Dockerfile that is not a comment; no version `ARG` in the Dockerfile; and no file
 *      another version manager reads (`.tool-versions`, `.nvmrc`, `.node-version`, `.python-version`,
 *      `.mise.toml`) at the checkout root;
 *   5. `mise.toml` holds only `min_version`, `[tools]`, `[settings]` and `[task_config]`; each tool a
 *      plain version string, since an option table can run a command at install (`postinstall`) or
 *      fetch from a URL the lock does not name; only the settings this file needs, since a setting can
 *      turn off mise's checksum, signature and provenance checks or trust other files, for every
 *      install and shim; no template but `[task_config] dir = "{{cwd}}"`, under which a task a
 *      worktree borrows from the primary checkout runs on the worktree's own files, and no
 *      `[task_config]` but that and `includes = ["tasks.toml"]`, the task move's one registry; and
 *      `[settings] not_found_system_fallback = false` with `auto_install` left on, the two settings
 *      under which a pin that is not installed fails or installs rather than run the system's binary
 *      in its place (asdlc-openspec-8juz.1, questions 1 and 6).
 *
 * WHAT IT DOES NOT SEE. It reads the spellings of a second install named above and no others, so a
 * tool fetched by another route -- a `curl` of a release, `pip`, `corepack` -- passes it, and review
 * is what refuses that. It holds that the lock has a URL and a checksum, not that they are honest: a
 * change to both at once is what the reviewer's floor, which holds `mise.toml` and `mise.lock` to a
 * person, is for.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet: the gate came with mise (`docs/decisions.md`
 * § D-29). Before it, Node's version had four homes that disagreed (`package.json` `engines`, the
 * dev container's `NODE_MAJOR`, CI's setup step reading `engines`, and each machine's own install),
 * and the reviewer's workflow read bd's version back out of the Dockerfile with `sed`. Were this gate
 * wrong, a second home could come back and drift from the pin unseen; a range would let two machines
 * run two versions from one file; a pin moved without `mise lock` would fail every locked install in
 * CI, or install unverified on the first machine of a kind CI does not run; and CI's mise and the
 * container's could drift apart.
 *
 * INVOCATION.
 *
 *   npm run check:toolchain                               the gate
 *   npm run check:toolchain:selftest                      its fixtures -- every refusal on a doctored copy
 *   TOOLCHAIN_CHECK_ROOT=<dir> npm run check:toolchain    the same gate over a doctored copy
 *
 * NEEDS only committed files: `mise.toml`, `mise.lock`, the workflows, the Dockerfile and the policy
 * records. No mise and no network: it parses TOML with the pinned `smol-toml` and YAML with `js-yaml`.
 * 0.11 s wall for the gate and 0.38 s for its selftest's 46 cases through `node --run`
 * (`/usr/bin/time -p`, one run each) on a macOS 26.7.1 laptop with Node 26.8.1, 2026-10-03.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { load as yamlLoad } from 'js-yaml'
import { parse as parseToml } from 'smol-toml'
import { copyPolicy, editPolicy, readPolicy } from '../tools/lib/policy.ts'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = process.env.TOOLCHAIN_CHECK_ROOT ?? REPO_ROOT
const CONFIG = 'mise.toml'
const LOCK = 'mise.lock'
const WORKFLOWS = '.github/workflows'
const DOCKERFILE = '.devcontainer/Dockerfile'
const PLATFORMS_KEY = 'toolchainLockPlatforms'
/** The decision every refusal rests on, with its parentheses, so the citation ends where the section's name does. */
const DECISION = '(`docs/decisions.md` § D-29)'
const SPIKE = 'asdlc-openspec-8juz.1'

/** What `mise.toml` may hold at its top level; an `[env]`, `[hooks]` or `[tasks]` would act on every shim, hook and session. */
const TOP_LEVEL = ['min_version', 'settings', 'task_config', 'tools']
/** The one template admitted: tasks run in the caller's directory (spike, question 1). */
const CWD_TEMPLATE = '{{cwd}}'
/**
 * The one value each `[task_config]` key may hold, both for the task move (asdlc-openspec-8juz.6): tasks
 * run in the caller's directory, and come from `tasks.toml` alone, since another file named here would
 * be a second registry of command names.
 */
const TASK_CONFIG = { dir: CWD_TEMPLATE, includes: ['tasks.toml'] }
/** The settings `mise.toml` may carry: each other one could weaken every install or shim, as item 5 of the header says. */
const SETTINGS = ['auto_install', 'not_found_system_fallback']
/** Files another version manager reads, each a second home for a version `mise.toml` pins. */
const OTHER_VERSION_FILES = ['.mise.toml', '.node-version', '.nvmrc', '.python-version', '.tool-versions']
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

/** Every string value under `value`, with its dotted path. */
function* strings(value, path = '') {
  if (typeof value === 'string') yield [path, value]
  else if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value)) yield* strings(inner, path ? `${path}.${key}` : key)
  }
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

/** Every problem with the toolchain under `root`, one message each; empty when it holds. */
export function runCheck(root) {
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
  for (const key of Object.keys(config.settings ?? {}).filter((k) => !SETTINGS.includes(k)).sort(byCodePoint)) {
    problems.push(
      `\`settings.${key}\` in ${CONFIG} is not one of the settings it may carry (${SETTINGS.join(', ')}): a setting acts on every install and shim, and one can turn off mise's checksum, signature or provenance checks, or trust other files.`,
    )
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
  const tools = config.tools ?? {}
  if (Object.keys(tools).length === 0) problems.push(`${CONFIG} pins no tool under [tools].`)
  for (const [name, value] of Object.entries(tools)) {
    if (typeof value !== 'string') {
      problems.push(
        `${CONFIG} pins ${name} with a table of options, not a plain version string: an option can run a command at install (\`postinstall\`) or fetch from a URL the lock does not name.`,
      )
      continue
    }
    const version = value
    if (!EXACT.test(version)) {
      problems.push(
        `${CONFIG} pins ${name} at ${JSON.stringify(version ?? value)}, not an exact MAJOR.MINOR.PATCH version: a range or a prefix resolves again on each install, so two machines can run two versions from one file.`,
      )
      continue
    }
    pins.set(name, version)
  }

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
  const relock = `run \`mise lock --platform ${platforms.join(',')}\` and commit ${LOCK}`
  const lockText = read(root, LOCK)
  if (lockText === null) {
    problems.push(`${LOCK} is missing: \`mise install --locked\`, which CI runs, has nothing to verify a download against; ${relock}.`)
  } else {
    let lock
    try {
      lock = parseToml(lockText)
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
  for (const name of OTHER_VERSION_FILES.filter((n) => existsSync(join(root, n)))) {
    problems.push(`${name} is at the checkout root, and another version manager reads it: a second home for a version ${CONFIG} pins. Delete it.`)
  }
  return problems
}

function main() {
  const problems = runCheck(ROOT)
  if (problems.length === 0) {
    const config = parseToml(readFileSync(join(ROOT, CONFIG), 'utf8'))
    const platforms = readPolicy(ROOT)[PLATFORMS_KEY]
    const image = MISE_IMAGE.exec(readFileSync(join(ROOT, DOCKERFILE), 'utf8'))[1]
    const actions = workflows(ROOT, []).flatMap(({ steps }) => steps).filter(({ step }) => MISE_ACTION.test(String(step.uses ?? ''))).length
    console.log(
      `toolchain: ${Object.keys(config.tools).length} tool(s) pinned exactly in ${CONFIG}, each in ${LOCK} for ${platforms.length} platform(s); ` +
        `${actions} jdx/mise-action step(s) and the dev container on mise ${image}; no second home.`,
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
const write = (path, text) => (dir) => writeFileSync(join(dir, path), text)
const remove = (path) => (dir) => rmSync(join(dir, path))
const policy = (change) => (dir) => editPolicy(dir, change)
const beforeEntrypoint = (line) => edit(DOCKERFILE, /^ENTRYPOINT \[/m, `${line}\nENTRYPOINT [`)

function cases() {
  return [
    { name: 'control: the live files, undoctored', doctor: () => {}, expect: 'pass' },
    { name: 'control: the one task_config admitted, dir {{cwd}} and includes tasks.toml', doctor: append(CONFIG, `\n[task_config]\ndir = "${CWD_TEMPLATE}"\nincludes = ["tasks.toml"]\n`), expect: 'pass' },
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
    { name: 'two mise-action steps carry two sha256s', doctor: edit(REVIEW, /^( +sha256: )\S+$/m, `$1${'f'.repeat(64)}`), expect: /^\.github\/workflows\/pr-review\.yml's `review` job carries the mise binary's `sha256:` [0-9a-f]{64}, where \.github\/workflows\/pr-review\.yml's `select` job carries f{64}/ },
    { name: 'a min_version newer than the pinned mise', doctor: edit(CONFIG, /^min_version = "[^"]+"$/m, 'min_version = "2099.1.0"'), expect: /^mise\.toml's `min_version` 2099\.1\.0 is newer than the mise/ },
    { name: 'no min_version', doctor: edit(CONFIG, /^min_version = "[^"]+"\n/m, ''), expect: /^mise\.toml has no `min_version`/ },
    { name: 'the dev container copies in no mise', doctor: edit(DOCKERFILE, /^COPY --from=ghcr\.io\/jdx\/mise:.*\n/m, ''), expect: /^\.devcontainer\/Dockerfile copies in no mise/ },
    { name: 'the dev container copies in mise by its tag alone', doctor: edit(DOCKERFILE, /(COPY --from=ghcr\.io\/jdx\/mise:[^\s@]+)@sha256:[0-9a-f]+/, '$1'), expect: /^\.devcontainer\/Dockerfile copies in mise by its tag alone/ },
    { name: 'actions/setup-node back in a workflow', doctor: edit(VERIFY, 'uses: jdx/mise-action@', 'uses: actions/setup-node@'), expect: /^\.github\/workflows\/verify\.yml's `verify` job installs `actions\/setup-node`: a second home/ },
    { name: 'actions/setup-python back in a workflow', doctor: edit(VERIFY, 'uses: jdx/mise-action@', 'uses: actions/setup-python@'), expect: /^\.github\/workflows\/verify\.yml's `verify` job installs `actions\/setup-python`: a second home/ },
    { name: 'NodeSource back in the Dockerfile', doctor: beforeEntrypoint('RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash -'), expect: /^\.devcontainer\/Dockerfile installs NodeSource: a second home/ },
    { name: 'a version ARG back in the Dockerfile', doctor: beforeEntrypoint('ARG VALE_VERSION=3.23.0'), expect: /^\.devcontainer\/Dockerfile declares `ARG VALE_VERSION`: a version stated in the Dockerfile/ },
    { name: 'an npm install of bd back in a workflow', doctor: edit(REVIEW, /^( +run: )bd --version$/m, '$1npm install -g @beads/bd@1.3.0'), expect: /^\.github\/workflows\/pr-review\.yml's `review` job installs an npm install of `@beads\/bd`: a second home/ },
    { name: 'uv tool install back in the Dockerfile', doctor: beforeEntrypoint('RUN uv tool install "graphifyy[mcp]==0.9.73"'), expect: /^\.devcontainer\/Dockerfile installs `uv tool install`: a second home/ },
    { name: 'an .nvmrc at the checkout root', doctor: write('.nvmrc', '24\n'), expect: /^\.nvmrc is at the checkout root, and another version manager reads it/ },
    { name: 'an [env] in mise.toml', doctor: append(CONFIG, '\n[env]\nFOO = "1"\n'), expect: /^`\[env\]` in mise\.toml is not one of min_version, \[tools\], \[settings\] or \[task_config\]/ },
    { name: 'a [tasks] in mise.toml', doctor: append(CONFIG, '\n[tasks.hello]\nrun = "echo hello"\n'), expect: /^`\[tasks\]` in mise\.toml is not one of/ },
    { name: 'a task_config key other than dir and includes', doctor: append(CONFIG, '\n[task_config]\nfoo = "bar"\n'), expect: /^`task_config\.foo` in mise\.toml is not one of/ },
    { name: 'a task_config dir other than {{cwd}}', doctor: append(CONFIG, '\n[task_config]\ndir = "scripts"\n'), expect: /^`task_config\.dir` in mise\.toml holds "scripts", not the one value it may hold/ },
    { name: 'a task_config includes naming another file', doctor: append(CONFIG, '\n[task_config]\nincludes = ["tasks.toml", "more-tasks.toml"]\n'), expect: /^`task_config\.includes` in mise\.toml holds \["tasks\.toml","more-tasks\.toml"\], not the one value it may hold/ },
    { name: 'a template other than task_config dir {{cwd}}', doctor: append(CONFIG, '\n[task_config]\ndir = "{{config_root}}"\n'), expect: /^mise\.toml holds a template at `task_config\.dir` \("\{\{config_root\}\}"\)/ },
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
  ]
}

function copyInputs(dir) {
  for (const path of [CONFIG, LOCK, DOCKERFILE]) cpSync(join(REPO_ROOT, path), join(dir, path), { recursive: true })
  cpSync(join(REPO_ROOT, WORKFLOWS), join(dir, WORKFLOWS), { recursive: true })
  copyPolicy(REPO_ROOT, dir)
}

function selftest() {
  const base = mkdtempSync(join(tmpdir(), 'check-toolchain-'))
  const results = []
  try {
    for (const { name, doctor, expect } of cases()) {
      const dir = join(base, name.replace(/[^a-z0-9]+/gi, '-'))
      copyInputs(dir)
      doctor(dir)
      const problems = runCheck(dir)
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
