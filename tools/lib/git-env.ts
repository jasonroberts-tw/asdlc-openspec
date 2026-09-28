/**
 * git-env.ts — a copy of this process's environment without any `GIT_*` key, for running git
 * against a tree other than this checkout.
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
 * INVOCATION. Imported, never run: `import { gitEnv } from '../lib/git-env.ts'`.
 * NEEDS. Nothing; it reads `process.env` and writes nothing.
 */

/** `process.env` without any `GIT_*` key, so git run with `cwd` or `-C` means that directory. */
export function gitEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_')) env[key] = value
  }
  return env
}
