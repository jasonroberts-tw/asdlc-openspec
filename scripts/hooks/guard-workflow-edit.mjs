/**
 * PreToolUse hook on Write and Edit. Refuses an edit that would leave a workflow other than
 * `.github/workflows/pr-review.yml` able to set the reviewer's `pr-review` status green itself: a
 * grant of `statuses: write`, `checks: write` or `write-all`, to every job or to one, or a job whose
 * id or name is the status's context. The rule is `forgeProblems` in `scripts/pr-review.mjs`, which
 * `pr-review:check` also runs over every workflow at pre-push and in CI; this runs it over the file
 * as the edit would leave it, before the edit lands.
 *
 * WHAT IT WOULD LET THROUGH IF IT WERE WRONG. No incident yet. Since 2026-10-05 (asdlc-openspec-3cp3,
 * docs/decisions.md § D-47) GitHub merges a pull request once `verify` and `pr-review` pass on its
 * head, so whatever sets `pr-review` green decides the merge. A branch whose workflow could set it
 * would turn it green on its own head after the reviewer set it red, and GitHub would merge a head
 * on the high-risk floor that no person read. `pr-review:check` refuses such a workflow, but `verify`
 * runs the branch's own copy of that check, which the same branch can weaken; this refuses the edit
 * in the session that makes it. Routine edits pass, such as a gate's step added to `verify.yml`,
 * which 52 commits had made by that day (`git rev-list --count HEAD -- .github/workflows/verify.yml`).
 * It sees Write and Edit alone: a workflow written through Bash passes it, and so does a job whose
 * name an expression builds.
 *
 * Exit 2 blocks the edit, and stderr is the reason the agent reads. A Write is judged by its
 * `content`; an Edit by the file with its first `old_string`, or every one under `replace_all`,
 * replaced, as Claude Code applies it. An Edit whose `old_string` the file does not hold lands
 * nothing, and passes.
 *
 *   printf '%s' '{"tool_input":{"file_path":".github/workflows/x.yml","content":"permissions: write-all\n"}}' | node scripts/hooks/guard-workflow-edit.mjs
 *
 * Needs `git`, which places the path in its checkout (`editedCheckout`), and `js-yaml`, resolved
 * from this file's own checkout. It reads `prReviewStatusContext` from the policy of the checkout
 * the edit lands in, or of the one `GUARD_WORKFLOW_ROOT` names, so a by-hand run or the selftest can
 * point it at a doctored copy. Every path but a workflow exits 0 before any of that loads. On a
 * workflow it fails closed: a result that does not parse, or a policy or parser it cannot load,
 * refuses the edit with the reason.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { editedCheckout, readHookInput } from './_shared.mjs'

/** A workflow file, where GitHub reads one from. */
const WORKFLOW_FILE = /^\.github\/workflows\/[^/]+\.ya?ml$/

/**
 * The file's text once the edit lands, or `null` when it lands nothing. `current` is the file's text
 * now, or `null` when there is none.
 */
function editedText(toolInput, current) {
  if (typeof toolInput.content === 'string') return toolInput.content
  const { old_string: from, new_string: to, replace_all: all } = toolInput
  if (typeof from !== 'string' || typeof to !== 'string' || from === '' || current === null) return null
  const at = current.indexOf(from)
  if (at < 0) return null
  return all ? current.split(from).join(to) : `${current.slice(0, at)}${to}${current.slice(at + from.length)}`
}

function refuse(reason) {
  process.stderr.write(`BLOCKED by repository policy: ${reason}\n`)
  process.exit(2)
}

const input = await readHookInput()
if (input === null) process.exit(0)
const toolInput = input.tool_input ?? {}
const target = editedCheckout(toolInput.file_path)
if (target === null || !WORKFLOW_FILE.test(target.rel)) process.exit(0)
const { root, rel } = target
const abs = resolve(root, rel)
const text = editedText(toolInput, existsSync(abs) ? readFileSync(abs, 'utf8') : null)
if (text === null) process.exit(0)

let problems
try {
  const { load } = await import('js-yaml')
  const { readPolicy } = await import('../../tools/lib/policy.ts')
  const { forgeProblems } = await import('../pr-review.mjs')
  const context = readPolicy(process.env.GUARD_WORKFLOW_ROOT ?? root)?.prReviewStatusContext
  if (typeof context !== 'string' || context === '') throw new Error('`prReviewStatusContext` could not be read from tools/policy/')
  problems = forgeProblems(rel, load(text), context)
} catch (error) {
  refuse(
    `${rel} is a workflow, and this edit could not be judged: ${error.message}. A workflow other than ` +
      `.github/workflows/pr-review.yml must not be able to set the reviewer's status (docs/decisions.md § D-47), ` +
      'so the edit waits until the file parses and the policy reads.',
  )
}
if (problems.length > 0) refuse(problems.join(' '))
process.exit(0)
