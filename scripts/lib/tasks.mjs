/**
 * The task manifest, read in one place: the tasks a tree or a commit defines, each name with its
 * command, from `tasks.toml` where it has one and from `package.json`'s `scripts` otherwise. Every
 * gate and tool that reads which tasks exist, and `runTask` in `scripts/hooks/_shared.mjs`, which
 * launches one, read them through here, so moving the tasks to mise (asdlc-openspec-8juz.6) changes
 * the manifest and the job files' tokens, and no reader.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. A reader with its own copy of the read sees the wrong manifest across the move: one still
 * reading `package.json` finds no task, and one reading `tasks.toml` at a commit from before the move
 * finds none either. The test-inventory gate compares a branch's head with its merge base, so the
 * second would read no test patterns at the base and pass a test the move deleted. And a task with a
 * key mise reads and the readers do not, such as `depends`, `dir` or `env`, would run otherwise than
 * the command every reader sees, so any key but `run` and `description`, each a string, is refused;
 * and so is a template in either (`{{`, `{%` or `{#`), which mise renders, `exec()` included, before
 * the task runs. The near miss, on 2026-10-04: the session review of asdlc-openspec-8juz.6 showed
 * `{{ exec(command='echo --selftest') }}` in `counts:check` turn the gate into its selftest under
 * mise, while this loader and `check:jobs` passed the command.
 *
 * Imported, never run:
 *
 *   loadTasks(root)          the tasks of the working tree at `root`: { file, tasks }, or null when
 *                            it has neither manifest
 *   tasksFrom(read)          the same from `read(path)`, a path's text or null: a commit's blobs, or
 *                            the files a tool has read
 *   parseTasks(file, text)   one manifest's text; throws naming the file and the task at fault
 *   launchFor(manifest, name, args)   the command, arguments and label that launch one task
 *   taskFiles(file, tasks)   a fixture's manifest in either shape, for the readers' selftests
 *
 * Each refusal is held, in its words, by `check:jobs:selftest`, since the job gate reports a
 * manifest this refuses with its reason; the readers' selftests hold each reader in both shapes.
 *
 * NEEDS `smol-toml` from this checkout's `node_modules`, only to read or write a `tasks.toml`. It is
 * required then, not when this file loads, so a hook loads this file in a checkout with no
 * `tasks.toml` or no `npm ci`, and so does the copy under the temporary directory that
 * `gate-summary:selftest` makes.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

export const TASKS_TOML = 'tasks.toml'
export const PACKAGE_JSON = 'package.json'
/**
 * The one value each key of `mise.toml`'s `[task_config]` may hold beside a `tasks.toml`: a task runs
 * in the directory `mise run` is called from, and the tasks come from this file alone. `check:jobs`
 * and `check:toolchain` both hold `mise.toml` to it (`docs/decisions.md` § D-36, items 1 and 4).
 */
export const TASK_CONFIG = Object.freeze({ dir: '{{cwd}}', includes: Object.freeze([TASKS_TOML]) })

/** The keys a task in `tasks.toml` may have; every other one is mise's, and changes how it runs. */
const TASK_KEYS = new Set(['run', 'description'])
/**
 * What opens a template in Tera, which mise renders in a task's `run` before the task runs and in
 * every task's `description` whenever it loads the tasks, `exec()` included, so a command no reader
 * sees runs. A shell's own `${#VAR}` holds `{#` too, and mise already refuses it as an unclosed comment.
 */
const TEMPLATE_OPENER = /\{\{|\{%|\{#/

const toml = () => createRequire(import.meta.url)('smol-toml')
const isTable = (value) => value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)

/** Each task's command in the order `text` gives them; throws naming `file` and the task at fault. */
export function parseTasks(file, text) {
  if (file === PACKAGE_JSON) {
    let manifest
    try {
      manifest = JSON.parse(text)
    } catch (error) {
      throw new Error(`${file} cannot be read as JSON (${error.message}).`)
    }
    const scripts = manifest?.scripts ?? {}
    if (!isTable(scripts)) throw new Error(`${file}'s \`scripts\` is not an object.`)
    for (const [name, command] of Object.entries(scripts)) {
      if (typeof command !== 'string') throw new Error(`${file}'s script \`${name}\` is not a string.`)
    }
    return { ...scripts }
  }
  if (file === TASKS_TOML) {
    let doc
    try {
      doc = toml().parse(text)
    } catch (error) {
      throw new Error(`${file} cannot be read as TOML (${String(error.message).split('\n')[0]}).`)
    }
    const tasks = {}
    for (const [name, task] of Object.entries(doc)) {
      if (!isTable(task)) throw new Error(`${file}: \`${name}\` is not a table, so it is no task.`)
      const extra = Object.keys(task).filter((key) => !TASK_KEYS.has(key))
      if (extra.length > 0) {
        throw new Error(
          `${file}: the task \`${name}\` has ${extra.map((key) => `\`${key}\``).join(', ')}. A task here has \`run\` and` +
            ' an optional `description`, each a string, because any other key makes mise run it otherwise than the' +
            ' command every reader sees.',
        )
      }
      if (typeof task.run !== 'string') throw new Error(`${file}: the task \`${name}\` has no \`run\` string.`)
      if (task.description !== undefined && typeof task.description !== 'string') {
        throw new Error(`${file}: the task \`${name}\` has a \`description\` that is not a string.`)
      }
      for (const key of ['run', 'description']) {
        const opener = typeof task[key] === 'string' ? TEMPLATE_OPENER.exec(task[key])?.[0] : undefined
        if (opener !== undefined) {
          throw new Error(
            `${file}: the task \`${name}\` has a template in its \`${key}\` (\`${opener}\`). mise renders it, \`exec()\`` +
              ' included, before it runs a task, so the task would run otherwise than the command every reader sees.',
          )
        }
      }
      tasks[name] = task.run
    }
    return tasks
  }
  throw new Error(`${file} is not a task manifest: the tasks live in ${TASKS_TOML} or in ${PACKAGE_JSON}'s \`scripts\`.`)
}

/** `{ file, tasks }` from the first manifest `read` finds, `tasks.toml` before `package.json`; null with neither. */
export function tasksFrom(read) {
  for (const file of [TASKS_TOML, PACKAGE_JSON]) {
    const text = read(file)
    if (typeof text === 'string') return { file, tasks: parseTasks(file, text) }
  }
  return null
}

/** The tasks of the working tree at `root`, as `tasksFrom` gives them. */
export function loadTasks(root) {
  return tasksFrom((file) => {
    try {
      return readFileSync(join(root, file), 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  })
}

/**
 * How the task `name` of `manifest`, as `tasksFrom` gives it, is launched with `args`, as
 * `{ command, args, label }`: `mise run --quiet` beside a `tasks.toml`, which hands the task the
 * arguments after its name and would take a `--` for itself (asdlc-openspec-8juz.1, question 3), and
 * in a tree from before the move `npm run --silent`, `npm.cmd` on Windows, with a `--` before them.
 * `runTask` in `scripts/hooks/_shared.mjs` and `scripts/fresh-run.mjs` both launch a task through here.
 */
export function launchFor(manifest, name, args = []) {
  return manifest.file === TASKS_TOML
    ? { command: 'mise', args: ['run', '--quiet', name, ...args], label: `mise run ${name}` }
    : {
        command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
        args: ['run', '--silent', name, ...(args.length > 0 ? ['--', ...args] : [])],
        label: `npm run ${name}`,
      }
}

/**
 * A fixture's manifest holding `tasks`, a name-to-command map, in the shape `file` names, as
 * `{ path: text }`. `pkg` is the rest of its `package.json`, which a `tasks.toml` fixture has too.
 * @returns {Record<string, string>}
 */
export function taskFiles(file, tasks, pkg = {}) {
  if (file === PACKAGE_JSON) return { [PACKAGE_JSON]: `${JSON.stringify({ ...pkg, scripts: tasks }, null, 2)}\n` }
  if (file === TASKS_TOML) {
    const doc = Object.fromEntries(Object.entries(tasks).map(([name, run]) => [name, { run }]))
    return { [TASKS_TOML]: `${toml().stringify(doc)}\n`, [PACKAGE_JSON]: `${JSON.stringify(pkg, null, 2)}\n` }
  }
  throw new Error(`${file} is not a task manifest: the tasks live in ${TASKS_TOML} or in ${PACKAGE_JSON}'s \`scripts\`.`)
}
