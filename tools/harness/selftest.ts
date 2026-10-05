/**
 * Selftest of the harness assessment: the core, `tools/harness/harness.ts`, over fixture
 * repositories it builds under the temporary directory, then the graph half,
 * `tools/harness/graph.py --selftest`, through `python`.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. A core that stopped reading an input kind would report a clean harness, and a clean report
 * is what a person stops reading. So each case plants exactly one gap in a copy of an undoctored
 * control that reports no finding and no lead, and holds the run to the keys that gap adds, each
 * with its reason: a case that only saw "something was reported" would pass with the check deleted
 * whenever another one fired. `reach`, the rows the pull-request reviewer prints, is held to one
 * exact row at a fixture's commit, and to that row again after the working tree is edited and with
 * the redirect table made to throw on import, each beside a run of the report that sees the change,
 * so a row that holds is not an edit the case failed to make.
 *
 * INVOCATION.
 *
 *   mise run harness:selftest
 *
 * NEEDS git, Node's `path.matchesGlob`, `js-yaml`, and for the graph half the Python 3 `mise.toml`
 * pins, run as `python` through mise's shims (README.md § Setup); where no `python` runs, the
 * selftest fails and says so (`docs/decisions.md` § D-33). Copies the live config into every
 * fixture, so each case runs with its values. No network.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { PACKAGE_JSON, TASKS_TOML, parseTasks, taskFiles } from '../../scripts/lib/tasks.mjs'
import { SCRATCH_GIT_ENV, gitIn } from '../lib/git-env.ts'
import { ROOT } from '../lib/paths.ts'
import { CONFIG, assess, blobId, reach, serialise, type ReachRow, type Report } from './harness.ts'

const failures: string[] = []
let passed = 0
function check(name: string, ok: boolean, detail: unknown = '') {
  if (ok) passed++
  else failures.push(`${name}: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`)
}

const HOOKS = `pre-commit:
  jobs:
    - name: hand-edits
      glob: 'artifacts/**'
      run: node scripts/assert.mjs {staged_files}

pre-push:
  parallel: true
  jobs:
    # Reads \`config/a.json\` and the rule \`docs/rules.md\` § Rule one cites, as the header of
    # \`scripts/op.mjs\` says (\`scripts/lib/helper.mjs\`).
    - name: check-a
      glob:
        - 'scripts/check-a.mjs'
        - 'scripts/lib/**'
        - 'config/a.json'
        - 'config/b.json'
        - 'package.json'
        - 'package-lock.json'
      run: node --run check:a
    - name: check-b
      glob:
        - 'scripts/check-b.mjs'
        - 'tools/gen/**'
      run: node --run check:b
    - name: gen-check
      glob:
        - 'tools/gen/**'
        - 'artifacts/gen/**'
      run: node --run gen:check
    - name: local
      run: node --run local:only
`

const VERIFY = `name: verify
on: [push]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - run: npm ci
      - name: a
        run: npm run check:a
      - name: b
        run: npm run check:b
      - name: gen
        run: npm run gen:check
      # It is no pre-push job: it costs minutes.
      - name: slow
        run: npm run slow
      #
      # DELIBERATELY ABSENT, each with its reason:
      #   * \`local:only\`: it reads a database a fresh clone lacks.
      #
`

/** The control: every input of every job in its glob, so it reports no finding and no lead. */
const FILES: Record<string, string> = {
  ...taskFiles(
    TASKS_TOML,
    {
      'check:a': 'node scripts/check-a.mjs',
      'check:b': 'node scripts/check-b.mjs',
      gen: 'node tools/gen/gen.ts',
      'gen:check': 'node tools/gen/gen.ts --check',
      'local:only': 'node scripts/local.mjs',
      op: 'node scripts/op.mjs',
      slow: 'node scripts/slow.mjs',
    },
    { type: 'module', devDependencies: { 'js-yaml': '4.1.0' } },
  ),
  'package-lock.json': '{}\n',
  'git-hooks.yml': HOOKS,
  '.github/workflows/verify.yml': VERIFY,
  '.github/workflows/pr-review.yml': 'on: [pull_request]\njobs:\n  review:\n    steps:\n      - run: node scripts/review.mjs next\n',
  '.claude/settings.json': JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR"/scripts/hooks/guard.mjs' }] }] } }),
  '.claude/skills/x/SKILL.md': 'Run `npm run op` when asked.\n',
  'AGENTS.md': 'Read `CLAUDE.md`.\n',
  'CLAUDE.md': '# Rules\n\n## Rule one\n\nOne.\n\n## Rule two\n\nTwo.\n',
  'config/a.json': '{}\n',
  'config/b.json': '{}\n',
  'docs/rules.md': '# Rules\n\n## Rule one\n',
  'docs/extra.md': '# Extra\n',
  'scripts/check-a.mjs': [
    '// Holds `CLAUDE.md` § Rule one.',
    "import { helper } from './lib/helper.mjs'",
    "import { load } from 'js-yaml'",
    "import { readFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    'const ROOT = process.cwd()',
    "const CONFIG_FILE = 'config/a.json'",
    "readFileSync(join(ROOT, CONFIG_FILE), 'utf8')",
    "for (const name of ['config/a.json', 'config/b.json']) readFileSync(join(ROOT, name), 'utf8')",
    "const fixture = (dir) => readFileSync(join(dir, 'docs/extra.md'), 'utf8')",
    "writeFileSync(join(ROOT, 'docs/extra.md'), '')",
    "console.log('run', 'gen')",
    'export { helper, load, fixture }',
    '',
  ].join('\n'),
  'scripts/lib/helper.mjs': 'export const helper = 1\n',
  'scripts/check-jobs.mjs': "const PATH_ROOTS = ['tools', 'scripts', 'apps']\nexport { PATH_ROOTS }\n",
  'scripts/check-b.mjs': [
    "import { spawnSync } from 'node:child_process'",
    "// import { ghost } from './lib/helper.mjs'",
    "const quoted = \"import { helper } from './lib/helper.mjs'\"",
    'const pattern = /[\'"]import/',
    "spawnSync('node', ['--run', 'gen'])",
    "console.log('run `npm run op` by hand')",
    'export { quoted, pattern }',
    '',
  ].join('\n'),
  'scripts/assert.mjs': "import { generatedFileRedirect } from './hooks/_shared.mjs'\nexport { generatedFileRedirect }\n",
  'scripts/hooks/_shared.mjs': "export function generatedFileRedirect(rel) {\n  return rel === 'artifacts/gen/out.json' ? 'artifacts/gen/out.json is GENERATED.\\n\\nThen:         npm run gen' : null\n}\n",
  'scripts/hooks/guard.mjs': "import './_shared.mjs'\n",
  'scripts/op.mjs': 'export {}\n',
  'scripts/local.mjs': 'export {}\n',
  'scripts/slow.mjs': 'export {}\n',
  'scripts/review.mjs': 'export {}\n',
  'scripts/lint-z.mjs': 'export {}\n',
  'scripts/README.md': [
    '# scripts',
    '',
    '| File | Kind | What it is |',
    '|---|---|---|',
    '| `check-a.mjs` | gate, `check:a` | a |',
    '| `check-b.mjs` | gate, `check:b` | b |',
    '| `assert.mjs` | pre-commit job | hand edits |',
    '| `op.mjs` | operator command, `op` | op |',
    '| `local.mjs` | gate, `local:only` | local |',
    '| `slow.mjs` | gate, `slow` | slow |',
    '| `review.mjs` | gate, the reviewer | review |',
    '| `lint-z.mjs` | gate, not wired until you choose a linter | z |',
    '| `lib/helper.mjs` | helper | helper |',
    '',
  ].join('\n'),
  'scripts/hooks/README.md': ['# hooks', '', '| File | Event | Blocks? | What |', '|---|---|---|---|', '| `_shared.mjs` | none: imported | | shared |', '| `guard.mjs` | `PreToolUse` on Bash | yes | guard |', ''].join('\n'),
  'tools/README.md': ['# tools', '', '| Path | Kind | What |', '|---|---|---|', '| `gen/` | emitter, `gen`; gate, `gen:check` | gen |', ''].join('\n'),
  'tools/gen/gen.ts': "import { x } from './lib.ts'\nexport { x }\n",
  'tools/gen/lib.ts': 'export const x = 1\n',
  'artifacts/gen/out.json': '{}\n',
  'tools/policy/tool-settings.json': JSON.stringify({ couplingMinSampleUnits: 5, couplingClusterMinJaccardPermille: 400 }),
  'artifacts/coupling/cochange.json': JSON.stringify({
    throughCommit: 'HEAD',
    units: 9,
    counted: 9,
    files: [
      { path: 'scripts/check-a.mjs', changes: 4, hub: false },
      { path: 'scripts/check-b.mjs', changes: 4, hub: false },
      { path: 'scripts/lib/helper.mjs', changes: 3, hub: false },
    ],
    edges: [{ a: 'scripts/check-a.mjs', b: 'scripts/lib/helper.mjs', together: 3, jaccardPermille: 750 }],
    clusters: [],
  }),
}

const scratch = mkdtempSync(join(tmpdir(), 'harness-selftest-'))
let fixtureCount = 0

/** A fixture repository: the control's files, each doctoring applied (a null body removes the file), the live config, all staged. */
function fixture(doctor: (write: (path: string, body: string | null) => void, read: (path: string) => string) => void = () => {}): string {
  const dir = join(scratch, `repo-${++fixtureCount}`)
  const write = (path: string, body: string | null) => {
    if (body === null) {
      rmSync(join(dir, path))
      return
    }
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), body)
  }
  for (const [path, body] of Object.entries(FILES)) write(path, body)
  cpSync(join(ROOT, CONFIG), join(dir, CONFIG))
  doctor(write, (path) => readFileSync(join(dir, path), 'utf8'))
  const git = gitIn(dir, SCRATCH_GIT_ENV)
  git(['init', '-q'])
  git(['add', '-A'])
  // A commit, so the map's `throughCommit`, `HEAD`, names a tree the never-changed list reads.
  git(['-c', 'user.name=t', '-c', 'user.email=t@example.invalid', 'commit', '-qm', 'fixture'])
  return dir
}

const DATE = '2026-01-02'
const reported = (report: Report) => new Set(report.findings.filter((f) => f.level !== 'note').map((f) => f.key))

try {
  /* ---------------------------------------------------------------------------- the control --- */
  const controlDir = fixture()
  const control = await assess(controlDir, DATE)
  check('control: no finding and no lead', control.summary.findings === 0 && control.summary.leads === 0, control.findings.filter((f) => f.level !== 'note'))
  const notes = new Set(control.findings.filter((f) => f.level === 'note').map((f) => f.key))
  check('control: a gate whose kind says it is not wired is a note', notes.has('reach|scripts/lint-z.mjs'), [...notes])
  check('control: a pre-push-only script the absent block names is a note', notes.has('parity|pre-push-only|local:only'), [...notes])
  check('control: a CI-only script its step comment declares is a note', notes.has('parity|ci-only|slow'), [...notes])
  check('control: a gate run only by another workflow is reached', !notes.has('reach|scripts/review.mjs'), [...notes])
  check('control: a session hook is reached through the settings', !control.findings.some((f) => f.key === 'reach|scripts/hooks/guard.mjs'), control.findings)
  const hubA = control.tables.hubs.find((h) => h.path === 'scripts/check-a.mjs')
  check('control: a hub row counts its globs, its import jobs and its fires per hundred pull requests', hubA?.declaredJobs === 1 && hubA.importJobs === 1 && hubA.changes === 4 && hubA.firesPerHundredPrs === 44, hubA)
  check('control: a rule cited as `§ <heading>` is paired with its script', control.tables.pairing.find((p) => p.section === 'Rule one')?.citedBy.join() === 'scripts/check-a.mjs', control.tables.pairing)
  check('control: the prompt mention is recorded as wiring', control.wiring.some((w) => w.from === 'file:.claude/skills/x/SKILL.md' && w.to === 'script:op' && w.relation === 'names_script'), control.wiring.filter((w) => w.relation === 'names_script'))
  check('control: a generated file is wired to the script that writes it', control.wiring.some((w) => w.from === 'script:gen' && w.to === 'file:artifacts/gen/out.json' && w.relation === 'generates'), control.wiring.filter((w) => w.relation === 'generates'))
  check('control: an import whose two files changed together is not a stable import', control.tables.stableImports.length === 0, control.tables.stableImports)
  check('control: a file read in a loop over literals is a read', control.read.sources.length > 0 && !control.findings.some((f) => f.key.includes('|read|config/b.json')), control.findings)
  check('control: in the map\'s sample, a hub row writes its rate', control.tables.hubs.some((h) => h.firesPerHundredPrs !== null), control.tables.hubs)
  check('control: no file is in enough globs to be listed as never changed', control.tables.neverChanged.length === 0, control.tables.neverChanged)
  check('control: the report names every file it read, by blob id', control.read.sources.some((s) => s.path === 'git-hooks.yml' && s.blob === blobId(FILES['git-hooks.yml'])), control.read.sources)
  check('control: the report names tasks.toml as the file the tasks came from', control.read.tasks === TASKS_TOML, control.read.tasks)
  check('control: a script is wired to its file as declared in tasks.toml', control.wiring.some((w) => w.from === 'script:check:a' && w.relation === 'invokes' && w.declaredIn === TASKS_TOML), control.wiring.filter((w) => w.relation === 'invokes'))
  check('control: a file only the pairing table reads is among them', control.read.sources.some((s) => s.path === 'scripts/lint-z.mjs'), control.read.sources.map((s) => s.path))
  check('control: the report states each check\'s limits', ['glob/import', 'glob/read', 'reach', 'parity', 'observed', 'hubs'].every((k) => typeof control.limits[k] === 'string'), Object.keys(control.limits))
  check('control: a second run writes the same bytes', serialise(await assess(controlDir, DATE)) === serialise(control), 'the report changed')

  /* ---------------------------------------------------------------------------- one gap each --- */
  type Case = { name: string; doctor: Parameters<typeof fixture>[0]; expect: Record<string, RegExp>; notes?: string[]; also?: (r: Report) => [string, boolean, unknown][] }
  const withoutGen = (r: (path: string) => string) => r('git-hooks.yml').replace("        - 'scripts/check-b.mjs'\n        - 'tools/gen/**'\n", "        - 'scripts/check-b.mjs'\n")
  const genLeads = (how: RegExp) => ({
    'glob|pre-push/check-b|launch|tools/gen/gen.ts': how,
    'glob|pre-push/check-b|launch|tools/gen/lib.ts': how,
  })
  const map = (r: (path: string) => string) => JSON.parse(r('artifacts/coupling/cochange.json'))
  const cases: Case[] = [
    {
      name: 'an import outside the glob',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'scripts/lib/**'\n", '')),
      expect: { 'glob|pre-push/check-a|import|scripts/lib/helper.mjs': /imported by `scripts\/check-a.mjs`/ },
    },
    {
      name: 'a pinned package without the lockfile in the glob',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'package-lock.json'\n", '')),
      expect: { 'glob|pre-push/check-a|package|package-lock.json': /imports `js-yaml`, which `package-lock.json` pins/ },
    },
    {
      name: 'a live read outside the glob, which the comment also names',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'config/a.json'\n", '')),
      expect: {
        'glob|pre-push/check-a|read|config/a.json': /joined onto a checkout root and read in `scripts\/check-a.mjs`/,
        'glob|pre-push/check-a|declared|config/a.json': /the comment above the job names it/,
      },
    },
    {
      name: 'a script launched by name, its imports outside the glob',
      doctor: (w, r) => w('git-hooks.yml', withoutGen(r)),
      expect: genLeads(/launches `gen`, by name, which reaches `tools\/gen\/(?:gen|lib).ts`/),
    },
    {
      name: 'a script launched through `npm run --silent`',
      doctor: (w, r) => {
        w('git-hooks.yml', withoutGen(r))
        w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace("spawnSync('node', ['--run', 'gen'])", "spawnSync('npm', ['run', '--silent', 'gen'])"))
      },
      expect: genLeads(/launches `gen`, by name,/),
    },
    {
      name: 'a script launched by a module constant',
      doctor: (w, r) => {
        w('git-hooks.yml', withoutGen(r))
        w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace("spawnSync('node', ['--run', 'gen'])", "const GEN = 'gen'\nspawnSync('node', ['--run', GEN])"))
      },
      expect: genLeads(/launches `gen`, by a name a module constant holds,/),
    },
    {
      name: 'a script launched by a name taken from data',
      doctor: (w, r) => {
        w('git-hooks.yml', withoutGen(r))
        w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace("spawnSync('node', ['--run', 'gen'])", "const GATES = ['gen']\nfor (const g of GATES) spawnSync('npm', ['run', '--silent', g])"))
      },
      expect: genLeads(/launches `gen`, by a name it takes from data,/),
    },
    {
      name: 'a script launched through a configured helper',
      doctor: (w, r) => {
        w('git-hooks.yml', withoutGen(r))
        w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace("spawnSync('node', ['--run', 'gen'])", "const GATES = ['gen']\nfor (const g of GATES) runTask(g)"))
      },
      expect: genLeads(/launches `gen`, by a name it takes from data,/),
    },
    {
      name: 'a script launched through `mise run --quiet`',
      doctor: (w, r) => {
        w('git-hooks.yml', withoutGen(r))
        w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace("spawnSync('node', ['--run', 'gen'])", "spawnSync('mise', ['run', '--quiet', 'gen'])"))
      },
      expect: genLeads(/launches `gen`, by name,/),
    },
    {
      // Were the job's `mise run` token not read, its script would be a parity finding, CI's alone.
      name: 'a job running a task through `mise run --quiet`',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace('run: node --run check:a', 'run: mise run --quiet check:a')),
      expect: {},
      also: (report) => [
        ['the job running it through mise is wired to it', report.wiring.some((w) => w.from === 'job:pre-push/check-a' && w.to === 'script:check:a' && w.relation === 'runs'), report.wiring.filter((w) => w.relation === 'runs')],
      ],
    },
    {
      name: 'a file read in a loop over literals, outside the glob',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'config/b.json'\n", '')),
      expect: { 'glob|pre-push/check-a|read|config/b.json': /joined onto a checkout root and read in `scripts\/check-a.mjs`/ },
    },
    {
      name: 'an import after a nested template literal',
      doctor: (w, r) => w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace('export { quoted, pattern }', "const label = (n) => `${n} ${n > 1 ? `item's` : 'item'}`\nconst later = await import('./lib/helper.mjs')\nexport { quoted, pattern, label, later }")),
      expect: { 'glob|pre-push/check-b|import|scripts/lib/helper.mjs': /imported by `scripts\/check-b.mjs`/ },
    },
    {
      name: 'an import after a regular expression holding a quote, on the same line',
      doctor: (w, r) => w('scripts/check-b.mjs', r('scripts/check-b.mjs').replace('export { quoted, pattern }', "const quote = /'/; const lazy = () => import('./lib/helper.mjs')\nexport { quoted, pattern, quote, lazy }")),
      expect: { 'glob|pre-push/check-b|import|scripts/lib/helper.mjs': /imported by `scripts\/check-b.mjs`/ },
    },
    {
      name: 'two code files that change together, one of them a hub',
      doctor: (w, r) => {
        const m = map(r)
        m.files.find((f: { path: string }) => f.path === 'scripts/check-b.mjs').hub = true
        m.edges.push({ a: 'scripts/check-a.mjs', b: 'scripts/check-b.mjs', together: 3, jaccardPermille: 600 })
        w('artifacts/coupling/cochange.json', JSON.stringify(m))
      },
      expect: {},
    },
    {
      name: 'an import between two changed files that never changed together',
      doctor: (w, r) => w('artifacts/coupling/cochange.json', JSON.stringify({ ...map(r), edges: [] })),
      expect: {},
      also: (report) => [['the import is a stable import', report.tables.stableImports.some((s) => s.a === 'scripts/check-a.mjs' && s.b === 'scripts/lib/helper.mjs'), report.tables.stableImports]],
    },
    {
      name: 'a map under its sample',
      doctor: (w, r) => w('artifacts/coupling/cochange.json', JSON.stringify({ ...map(r), counted: 4 })),
      expect: {},
      also: (report) => [['no rate is written, the counts are', report.tables.hubs.every((h) => h.firesPerHundredPrs === null) && report.tables.hubs.some((h) => h.changes === 4), report.tables.hubs]],
    },
    {
      name: 'a file in enough globs that no counted pull request changed',
      doctor: (w, r) => w(CONFIG, JSON.stringify({ ...JSON.parse(r(CONFIG)), neverChangedMinJobs: 1 })),
      expect: {},
      also: (report) => [['it is listed', report.tables.neverChanged.includes('config/a.json'), report.tables.neverChanged]],
    },
    {
      name: 'a check twin without the file its emitter writes',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'artifacts/gen/**'\n", '')),
      expect: { 'glob|pre-push/gen-check|generated|artifacts/gen/out.json': /runs `gen:check`, the check twin of the emitter that writes `artifacts\/gen\/out.json`/ },
    },
    {
      name: 'a path the job comment names outside the glob',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace('# Reads `config/a.json`', '# Reads `config/a.json`, `docs/extra.md`')),
      expect: { 'glob|pre-push/check-a|declared|docs/extra.md': /the comment above the job names it/ },
    },
    {
      name: 'a glob that matches nothing',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("        - 'config/a.json'\n", "        - 'config/a.json'\n        - 'nothing/**'\n")),
      expect: {},
      notes: ['glob|pre-push/check-a|dead|nothing/**'],
    },
    {
      name: 'a staged-file job whose glob misses a generated file',
      doctor: (w, r) => w('git-hooks.yml', r('git-hooks.yml').replace("glob: 'artifacts/**'", "glob: 'artifacts/other/**'")),
      expect: { 'glob|pre-commit/hand-edits|generated|artifacts/gen/out.json': /imports `scripts\/hooks\/_shared.mjs`, which assigns `artifacts\/gen\/out.json`/ },
      notes: ['glob|pre-commit/hand-edits|dead|artifacts/other/**'],
    },
    {
      name: 'a gate nothing reaches',
      doctor: (w, r) => {
        w('scripts/check-z.mjs', 'export {}\n')
        w('scripts/README.md', r('scripts/README.md').replace('| `lib/helper.mjs`', '| `check-z.mjs` | gate | z |\n| `lib/helper.mjs`'))
      },
      expect: { 'reach|scripts/check-z.mjs': /gives it the kind "gate", and no package script, job, workflow, session hook or prompt reaches it/ },
    },
    {
      name: 'a pre-push-only script the absent block does not name',
      doctor: (w, r) => w('.github/workflows/verify.yml', r('.github/workflows/verify.yml').replace('`local:only`: it reads', 'the local check: it reads')),
      expect: { 'parity|pre-push-only|local:only': /a pre-push job runs it, no step of `.github\/workflows\/verify.yml` does, and its absent block does not name it/ },
    },
    {
      name: 'a CI-only script its step comment does not declare',
      doctor: (w, r) => w('.github/workflows/verify.yml', r('.github/workflows/verify.yml').replace('# It is no pre-push job: it costs minutes.', '# It costs minutes.')),
      expect: { 'parity|ci-only|slow': /a step of `.github\/workflows\/verify.yml` runs it, no pre-push job does, and the comment above its step does not say why/ },
    },
    {
      name: 'two code files that change together and import neither way',
      doctor: (w, r) => {
        const map = JSON.parse(r('artifacts/coupling/cochange.json'))
        map.edges.push({ a: 'scripts/check-a.mjs', b: 'scripts/check-b.mjs', together: 3, jaccardPermille: 600 })
        w('artifacts/coupling/cochange.json', JSON.stringify(map))
      },
      expect: { 'observed|scripts/check-a.mjs|scripts/check-b.mjs': /changed together in 3 counted pull requests \(Jaccard 600\/1000\), and neither imports the other/ },
    },
  ]
  const before = reported(control)
  for (const c of cases) {
    const report = await assess(fixture(c.doctor), DATE)
    const now = reported(report)
    const added = [...now].filter((k) => !before.has(k)).sort()
    const removed = [...before].filter((k) => !now.has(k))
    const want = Object.keys(c.expect).sort()
    check(`${c.name}: reports exactly its keys`, added.join('\n') === want.join('\n') && removed.length === 0, { added, removed, want })
    for (const [key, reason] of Object.entries(c.expect)) {
      const f = report.findings.find((x) => x.key === key)
      check(`${c.name}: ${key} gives its reason`, f !== undefined && reason.test(f.reason), f?.reason ?? 'missing')
    }
    for (const key of c.notes ?? []) check(`${c.name}: ${key} is a note`, report.findings.some((f) => f.key === key && f.level === 'note'), report.findings.filter((f) => f.level === 'note').map((f) => f.key))
    for (const [what, ok, detail] of c.also?.(report) ?? []) check(`${c.name}: ${what}`, ok, detail)
  }

  /* ---------------------------------------------------------------------------- the comparison - */
  const doctored = await assess(fixture(cases[0].doctor), '2026-01-03', control)
  check('comparison: a new finding is named as appeared', doctored.comparison.previous === DATE && doctored.comparison.appeared.join() === 'glob|pre-push/check-a|import|scripts/lib/helper.mjs', doctored.comparison)
  check('comparison: the same script says so', doctored.comparison.scriptChanged === false && doctored.comparison.configChanged === false, doctored.comparison)
  const older = { ...control, read: { ...control.read, script: '0'.repeat(40) } }
  const fixed = await assess(controlDir, '2026-01-04', { ...doctored, read: older.read })
  check('comparison: a finding fixed is named as went, and another script is named', fixed.comparison.went.join() === 'glob|pre-push/check-a|import|scripts/lib/helper.mjs' && fixed.comparison.scriptChanged === true, fixed.comparison)
  const reconfigured = await assess(controlDir, '2026-01-05', { ...control, read: { ...control.read, config: '0'.repeat(40) } })
  check('comparison: another config is named', reconfigured.comparison.configChanged === true && reconfigured.comparison.scriptChanged === false, reconfigured.comparison)

  /* ---------------------------------------------------------------------------- the inputs ----- */
  const refusals: [string, (w: (p: string, b: string | null) => void, r: (p: string) => string) => void, RegExp][] = [
    ['a constant without its Means', (w, r) => w(CONFIG, JSON.stringify({ ...JSON.parse(r(CONFIG)), hubsTopMeans: undefined })), /config: .*`hubsTopMeans` is missing/],
    ['a constant of the wrong shape', (w, r) => w(CONFIG, JSON.stringify({ ...JSON.parse(r(CONFIG)), hubsTop: 0 })), /config: .*`hubsTop` is not a whole number of at least 1/],
    ['a preamble key missing', (w, r) => w(CONFIG, JSON.stringify({ ...JSON.parse(r(CONFIG)), provenance: undefined })), /config: .*`provenance` is missing/],
    ['a constant missing', (w, r) => w(CONFIG, JSON.stringify({ ...JSON.parse(r(CONFIG)), codeExtensions: undefined })), /config: .*`codeExtensions` is missing/],
    ['a policy key the config names missing', (w) => w('tools/policy/tool-settings.json', JSON.stringify({ couplingMinSampleUnits: 5 })), /input: `couplingClusterMinJaccardPermille` in tools\/policy\/tool-settings\.json/],
    ['a constant the config names unreadable', (w) => w('scripts/check-jobs.mjs', 'export {}\n'), /input: `PATH_ROOTS` in scripts\/check-jobs.mjs, which .* names, is not a list of string literals/],
    [
      "a checkout whose tasks are its package.json's scripts, with no tasks.toml",
      (w, r) => {
        for (const [path, body] of Object.entries(taskFiles(PACKAGE_JSON, parseTasks(TASKS_TOML, r(TASKS_TOML)), JSON.parse(r(PACKAGE_JSON))))) w(path, body)
        w(TASKS_TOML, null)
      },
      /^input: .+ has no tasks\.toml, so it defines no task: the tasks live there alone, and package\.json's `scripts` are not read in its place/,
    ],
  ]
  let noMeans = ''
  for (const [name, doctor, reason] of refusals) {
    const dir = fixture(doctor)
    if (noMeans === '') noMeans = dir
    try {
      await assess(dir, DATE)
      check(`${name} is refused`, false, 'accepted')
    } catch (error) {
      check(`${name} is refused, for that reason`, reason.test((error as Error).message), (error as Error).message)
    }
  }

  /* ---------------------------------------------------------------------------- the CLI -------- */
  const out = join(scratch, 'out')
  const cli = spawnSync(process.execPath, [join(ROOT, 'tools/harness/harness.ts'), '--date', DATE, '--out', out], { env: { ...process.env, HARNESS_ROOT: controlDir }, encoding: 'utf8' })
  check('cli: HARNESS_ROOT points the run at a fixture and writes both files', cli.status === 0 && existsSync(join(out, DATE, 'harness.json')) && existsSync(join(out, DATE, 'harness.md')), cli.stderr || cli.stdout)
  const refused = spawnSync(process.execPath, [join(ROOT, 'tools/harness/harness.ts'), '--date', DATE, '--out', out], { env: { ...process.env, HARNESS_ROOT: noMeans }, encoding: 'utf8' })
  check('cli: an unreadable input exits 1 and says why', refused.status === 1 && /harness: config: .*`hubsTopMeans` is missing/.test(refused.stderr), refused.stderr)

  /* ---------------------------------------------------------------------------- reach ---------- */
  // The session hook imports the helper too, so one file is reached every way a row names; and
  // `check-a.mjs` imports a file the commit lacks, as a pull request that adds one leaves its base.
  const reachDoctor: Parameters<typeof fixture>[0] = (w, r) => {
    w('scripts/hooks/guard.mjs', "import './_shared.mjs'\nimport '../lib/helper.mjs'\n")
    w('scripts/check-a.mjs', r('scripts/check-a.mjs').replace("import { helper } from './lib/helper.mjs'", "import { helper } from './lib/helper.mjs'\nimport './lib/new.mjs'"))
  }
  const HELPER: ReachRow = {
    path: 'scripts/lib/helper.mjs',
    globJobs: ['pre-push/check-a'],
    importJobs: ['pre-push/check-a'],
    steps: ['.github/workflows/verify.yml: mise run check:a'],
    hooks: ['PreToolUse Bash: scripts/hooks/guard.mjs'],
  }
  const reachDir = fixture(reachDoctor)
  const head = gitIn(reachDir, SCRATCH_GIT_ENV)(['rev-parse', 'HEAD']).trim()
  const helperRow = reach(reachDir, 'HEAD', ['scripts/lib/helper.mjs'])
  check('reach: a file a job globs and imports, a CI step and a session hook reach is that row exactly, at the full commit id', JSON.stringify(helperRow) === JSON.stringify({ rev: head, rows: [HELPER] }), helperRow)

  const absent = reach(reachDir, head, ['scripts/lib/new.mjs']).rows
  const ABSENT: ReachRow = { path: 'scripts/lib/new.mjs', globJobs: ['pre-push/check-a'], importJobs: [], steps: [], hooks: [] }
  check('reach: a path the commit does not track, though a committed file imports it, is matched by globs alone', JSON.stringify(absent) === JSON.stringify([ABSENT]), absent)

  const asked = ['scripts/lib/new.mjs', 'scripts/lib/helper.mjs', 'docs/extra.md', 'scripts/lib/helper.mjs']
  const first = JSON.stringify(reach(reachDir, 'HEAD', asked))
  const again = JSON.stringify(reach(reachDir, head, [...asked].reverse()))
  const NOTHING: ReachRow = { path: 'docs/extra.md', globJobs: [], importJobs: [], steps: [], hooks: [] }
  check('reach: one row per distinct path in code-point order, and two calls give the same JSON', first === again && first === JSON.stringify({ rev: head, rows: [NOTHING, HELPER, ABSENT] }), { first, again })

  for (const rev of ['no-such-ref', `${head}^{tree}`]) {
    try {
      reach(reachDir, rev, ['scripts/lib/helper.mjs'])
      check(`reach: \`${rev}\`, which names no commit, is refused`, false, 'accepted')
    } catch (error) {
      check(`reach: \`${rev}\`, which names no commit, is refused as an input`, (error as Error).message.startsWith('input: '), (error as Error).message)
    }
  }

  // The working tree drops the job and the hook's import after the commit; the report, which reads
  // the working tree, sees the job go, so a row that holds is the commit's and not an edit missed.
  const editedDir = fixture(reachDoctor)
  const editedHooks = readFileSync(join(editedDir, 'git-hooks.yml'), 'utf8').replace(/ {4}# Reads[\s\S]*?run: node --run check:a\n/, '')
  writeFileSync(join(editedDir, 'git-hooks.yml'), editedHooks)
  writeFileSync(join(editedDir, 'scripts/hooks/guard.mjs'), "import './_shared.mjs'\n")
  const edited = reach(editedDir, 'HEAD', ['scripts/lib/helper.mjs']).rows
  const editedReport = await assess(editedDir, DATE)
  check('reach: an edit to the working tree after the commit does not move the commit\'s row', JSON.stringify(edited) === JSON.stringify([HELPER]), edited)
  check('reach: the same edit is one the report, reading the working tree, sees', editedReport.summary.jobs === control.summary.jobs - 1, { edited: editedReport.summary.jobs, control: control.summary.jobs })

  // The redirect table throws when imported: the report imports it, so it fails for that reason,
  // and a row still given proves `reach` never imports it.
  const throwing = fixture((w, r) => {
    reachDoctor(w, r)
    w('scripts/hooks/_shared.mjs', `throw new Error('the redirect table was imported')\n${r('scripts/hooks/_shared.mjs')}`)
  })
  let thrown: unknown = null
  try {
    const rows = reach(throwing, 'HEAD', ['scripts/lib/helper.mjs']).rows
    check('reach: a redirect table that throws on import is never imported', JSON.stringify(rows) === JSON.stringify([HELPER]), rows)
  } catch (error) {
    check('reach: a redirect table that throws on import is never imported', false, (error as Error).message)
  }
  try {
    await assess(throwing, DATE)
  } catch (error) {
    thrown = error
  }
  check('reach: the same table fails the report, which imports it, for that reason', /the redirect table was imported/.test((thrown as Error | null)?.message ?? ''), (thrown as Error | null)?.message ?? 'the report did not fail')
} finally {
  rmSync(scratch, { recursive: true, force: true })
}

console.log(`harness core selftest: ${passed} passed, ${failures.length} failed.`)
for (const failure of failures) console.error(`  FAIL ${failure}`)

/* ------------------------------------------------------------------------------ the graph half --- */
const graph = spawnSync('python', [join(ROOT, 'tools/harness/graph.py'), '--selftest'], { cwd: ROOT, stdio: 'inherit' })
if (graph.error) {
  console.error(`harness graph selftest: \`python\` could not be run (${graph.error.message}). It is the Python 3 mise.toml pins, on PATH through mise's shims (README.md § Setup).`)
}
process.exit(failures.length > 0 || graph.status !== 0 ? 1 : 0)
