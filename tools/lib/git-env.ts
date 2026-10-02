/**
 * git-env.ts — a copy of this process's environment without any `GIT_*` key, for running git
 * against a tree other than this checkout; `gitIn`, which runs git in one tree with it; and
 * `SCRATCH_GIT_ENV`, the environment of a scratch repository a tool builds for itself.
 *
 * THE FAILURE IT EXISTS TO PREVENT. Git exports `GIT_DIR`, `GIT_WORK_TREE` and `GIT_INDEX_FILE` to
 * every hook, and `GIT_DIR` outranks both `cwd` and `-C <dir>`. A tool that builds a scratch
 * repository and runs git in it from inside a pre-push hook then reads or writes THIS repository
 * while claiming to read the scratch one. No incident yet here: if this were wrong,
 * `citations:selftest` would pass at the prompt and at the hook for different reasons, and it
 * asserts that `gitEnv()` leaks no `GIT_*` key.
 *
 * WHAT A RETIREMENT TOOK OUT. This function came from `tools/lib/sibling-root.ts`, which
 * `docs/decisions.md` § D-15 deleted with the pipeline graph: `resolveSiblingRoot` and
 * `primaryCheckout` found a sibling checkout beside the primary one, and nothing here reads one.
 * `tools/lib/estate-root.ts`, its copy from before a rename, went with it.
 *
 * WHAT A SECOND EMITTER BROUGHT IN. `gitIn` and `SCRATCH_GIT_ENV` came from `tools/trace/trace.ts`
 * when `tools/coupling/coupling.ts` needed them too (asdlc-openspec-3oln, 2026-10-02): imported from
 * trace, they would have loaded trace's own imports on every coupling run, and a retirement of
 * trace would have taken coupling's git runner with it.
 *
 * INVOCATION. Imported, never run:
 * `import { gitEnv, gitIn, SCRATCH_GIT_ENV, type Git } from '../lib/git-env.ts'`.
 * NEEDS. Nothing at load: it reads `process.env` and writes nothing. A function `gitIn` returns
 * needs git on the PATH when it is called.
 */
import { spawnSync } from 'node:child_process'
import { devNull } from 'node:os'

/** `process.env` without any `GIT_*` key, so git run with `cwd` or `-C` means that directory. */
export function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_')) env[key] = value
  }
  return env
}

/** A git command run in one tree: its arguments and what to feed its stdin, and what it printed on success. */
export type Git = (args: string[], input?: string) => string

/** git in `root`, with no inherited `GIT_*` key, so a hook's `GIT_DIR` cannot point it elsewhere. */
export function gitIn(root: string, env: NodeJS.ProcessEnv = gitEnv()): Git {
  return (args, input) => {
    const run = spawnSync('git', ['-c', 'core.quotepath=off', ...args], { cwd: root, env, input, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    if (run.error) throw new Error(`git could not start: ${run.error.message}`)
    if (run.status !== 0) throw new Error(`\`git ${args.join(' ')}\` failed: ${(run.stderr || run.stdout).trim()}`)
    return run.stdout
  }
}

/** The environment of a scratch repository: no `GIT_*` key, and no configuration of this machine's. */
export const SCRATCH_GIT_ENV: NodeJS.ProcessEnv = { ...gitEnv(), GIT_CONFIG_GLOBAL: devNull, GIT_CONFIG_SYSTEM: devNull }
