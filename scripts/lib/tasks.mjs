/**
 * The task manifest, read in one place: the tasks a tree or a commit defines, each name with its
 * command, from its `tasks.toml`, which holds them alone. Every gate and tool that reads which tasks
 * exist, and `runTask` in `scripts/hooks/_shared.mjs`, which launches one, read them through here. A
 * tree or a commit with no `tasks.toml` is refused, never read from `package.json`'s `scripts` in its
 * place (`docs/decisions.md` § D-40); `parseTasks` still reads those, the two scripts npm keeps, for
 * `check:jobs` to hold them apart from the tasks.
 *
 * THE FAILURE IT EXISTS TO PREVENT. No incident yet; this is what it would let through if it were
 * wrong. A reader with its own copy of the read sees another manifest than the rest. A read that fell
 * back to `package.json`'s `scripts` where a tree had no `tasks.toml`, as this one did until no open
 * pull request's merge base predated the move to mise (asdlc-openspec-8juz.7), takes a `tasks.toml`
 * deleted by mistake for a tree from before the move, and passes on whatever `package.json` still
 * holds: the test-inventory gate, which compares a branch's head with its merge base, read every test
 * of a head whose `tasks.toml` was gone and passed. And a task with a key mise reads and the readers
 * do not, such as `depends`, `dir` or `env`, would run otherwise than the command every reader sees,
 * so any key but `run` and `description`, each a string, is refused; and so is a template in either
 * (`{{`, `{%` or `{#`), which mise renders, `exec()` included, before the task runs. The near miss,
 * on 2026-10-04: the session review of asdlc-openspec-8juz.6 showed
 * `{{ exec(command='echo --selftest') }}` in `counts:check` turn the gate into its selftest under
 * mise, while this loader and `check:jobs` passed the command.
 *
 * Imported, never run:
 *
 *   loadTasks(root)          the tasks of the working tree at `root`: { file, tasks }, `file` being
 *                            `tasks.toml`; throws, naming `root`, where it has none
 *   tasksFrom(read, where)   the same from `read(path)`, a path's text or null: a commit's blobs, or
 *                            the files a tool has read; the refusal names `where`
 *   parseTasks(file, text)   one file's tasks, `tasks.toml`'s or `package.json`'s `scripts`; throws
 *                            naming the file and the task at fault
 *   launchFor(name, args)    the command, arguments and label that launch one task
 *   taskFiles(file, tasks)   a fixture's manifest: a `tasks.toml`, or for a case the loader refuses,
 *                            the `scripts` of a `package.json` from before the move
 *
 * Each refusal is held, in its words, by `check:jobs:selftest`, since the job gate reports a
 * manifest this refuses with its reason; the refusal of a commit with no `tasks.toml` by
 * `tests:inventory:selftest` too.
 *
 * NEEDS `smol-toml` from this checkout's `node_modules`, only to read or write a `tasks.toml`. It is
 * required then, not when this file loads, so a hook loads this file in a checkout with no `npm ci`
 * and reports why it cannot read the tasks there; the copy under the temporary directory that
 * `gate-summary:selftest` makes links this checkout's `node_modules` for it.
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

/**
 * Each command `text` names, in its order: the tasks of a `tasks.toml`, or the `scripts` of a
 * `package.json`, which `check:jobs` reads beside it. Throws naming `file` and the task at fault.
 */
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
  throw new Error(`${file} names no command this reads: the tasks live in ${TASKS_TOML}, and ${PACKAGE_JSON} keeps two scripts beside it.`)
}

/**
 * `{ file, tasks }` from `read(TASKS_TOML)`, `file` being `tasks.toml`. Where it gives no text, throws
 * naming `where`: `package.json` is not read in its place.
 */
export function tasksFrom(read, where = 'the tree read') {
  const text = read(TASKS_TOML)
  if (typeof text !== 'string') {
    throw new Error(
      `${where} has no ${TASKS_TOML}, so it defines no task: the tasks live there alone, and ${PACKAGE_JSON}'s` +
        ' `scripts` are not read in its place (`docs/decisions.md` § D-40). Restore it, or rebase a branch cut' +
        ' before the move to mise onto origin/main.',
    )
  }
  return { file: TASKS_TOML, tasks: parseTasks(TASKS_TOML, text) }
}

/** The tasks of the working tree at `root`, as `tasksFrom` gives them; the refusal names `root`. */
export function loadTasks(root) {
  return tasksFrom((file) => {
    try {
      return readFileSync(join(root, file), 'utf8')
    } catch (error) {
      if (error.code === 'ENOENT') return null
      throw error
    }
  }, root)
}

/**
 * How the task `name` is launched with `args`, as `{ command, args, label }`: `mise run --quiet`,
 * which hands the task the arguments after its name and would take a `--` for itself
 * (asdlc-openspec-8juz.1, question 3). `runTask` in `scripts/hooks/_shared.mjs` and
 * `scripts/fresh-run.mjs` both launch a task through here.
 */
export function launchFor(name, args = []) {
  return { command: 'mise', args: ['run', '--quiet', name, ...args], label: `mise run ${name}` }
}

/**
 * A fixture's manifest holding `tasks`, a name-to-command map, as `{ path: text }`: with `file`
 * `tasks.toml`, that file and a `package.json` whose rest is `pkg`; with `file` `package.json`, that
 * file alone with `tasks` as its `scripts`, a tree from before the move, which the loader refuses.
 * @returns {Record<string, string>}
 */
export function taskFiles(file, tasks, pkg = {}) {
  if (file === PACKAGE_JSON) return { [PACKAGE_JSON]: `${JSON.stringify({ ...pkg, scripts: tasks }, null, 2)}\n` }
  if (file === TASKS_TOML) {
    const doc = Object.fromEntries(Object.entries(tasks).map(([name, run]) => [name, { run }]))
    return { [TASKS_TOML]: `${toml().stringify(doc)}\n`, [PACKAGE_JSON]: `${JSON.stringify(pkg, null, 2)}\n` }
  }
  throw new Error(`${file} names no command this reads: the tasks live in ${TASKS_TOML}, and ${PACKAGE_JSON} keeps two scripts beside it.`)
}
