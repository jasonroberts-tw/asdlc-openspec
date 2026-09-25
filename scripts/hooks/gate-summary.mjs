/**
 * Stop and SubagentStop hook. Runs the fast gates over the checkout the stopping agent worked in,
 * untracked files included, and prints one line saying whether they passed.
 *
 * THE DEFECT THIS PREVENTS: reporting completion without running the gates. The screen-generation run
 * reported "lint" as unavailable rather than papering over it, which was right -- but the only reason
 * that was possible is that someone remembered to check. This makes the check unconditional.
 *
 * AND A PASS OVER FILES IT NEVER READ. Until 2026-09-25 `citations:check` read `git ls-files` only,
 * and the hook ran at `Stop` only. In the add-calculator-web-app session it printed PASS at all 33
 * stops while the change's new design sat unstaged and unread, and when the prompt-review subagents
 * stopped after writing review files, one of them with a pointer the gate refuses, no gate ran at all
 * (asdlc-openspec-hp8). Staging first, the workaround one skill adopted, still left the verdict line
 * claiming what it had not checked. So `citations:check` runs with `CITATIONS_UNTRACKED=1`, which
 * adds every untracked file git does not ignore; and the hook is registered for `SubagentStop` too.
 *
 * WHICH CHECKOUT. The one the payload's `cwd` is in, when that is a checkout of this repository, and
 * the hook's own otherwise (`checkoutOf` in `_shared.mjs`). The hooks reference documents `cwd` for
 * `SubagentStop`, but not whether a subagent launched with worktree isolation reports its own
 * worktree there; so the verdict names the checkout whenever it is not the hook's own, and a
 * subagent's verdict says it is one.
 *
 * IT NEVER BLOCKS. A Stop hook that denies the stop can trap a session in a loop when the failure is
 * pre-existing or not fixable from here, and a hook people disable is a lie in version control. The
 * accountability mechanism is that the verdict is in the transcript where both the user and the agent
 * can see it, not that the agent is held hostage to it.
 *
 * WHAT IT RUNS is `GATES` below, and nothing else: `check:jobs` (every script a `lefthook.yml` or
 * `.github/workflows/verify.yml` job names exists, and every script no job names is declared) and
 * `citations:check` (every citation in a tracked or untracked text file resolves, and no prompt cites
 * a memory key). Neither runs an emitter, and both also run at pre-push and in CI, over committed
 * files only, which are the tiers that decide anything (`CLAUDE.md` § The gate ladder).
 *
 * Budget: the gates run CONCURRENTLY, so the wall clock is the slower one and not their sum. MEASURED
 * 2026-09-23 on a macOS laptop: 0.30s wall for the whole hook (`time node
 * scripts/hooks/gate-summary.mjs`), against 0.16s for `npm run check:jobs` and 0.21s for
 * `npm run citations:check` alone. Neither keeps a cache, so there is no cold first run to budget for.
 * MEASURED 2026-09-25 with untracked files read, on a macOS 26.7 laptop (Apple M3 Max) with
 * Node 26.8.1: 0.28-0.30s wall over this checkout with an empty payload (`/usr/bin/time -p node
 * scripts/hooks/gate-summary.mjs`, two runs). A payload naming a `cwd` adds the git calls that place
 * it: `gate-summary:selftest` times its own runs over a two-file scratch tree at 0.24-0.25s for an
 * empty payload and 0.28-0.30s for a `SubagentStop` payload with a `cwd`, so about 0.05s more. A
 * `SubagentStop` costs that once per subagent, however short its run.
 *
 * THIS HEADER ONCE DESCRIBED GATES THE HOOK NEVER RAN. Until 2026-09-23 it explained `typecheck`,
 * `lint:strict:cached` and `pipeline:check` at length, and the worktree briefing
 * (`.claude/worktree-CONTEXT.md.tmpl`) named the same three, while `GATES` held the two above. The
 * prose arrived with the files this repository was bootstrapped from and was never true here: there
 * is no `typecheck` or `lint:strict:cached` script, so an agent that trusted the briefing went
 * looking for a gate that does not exist. A gate joins `GATES`, this paragraph's list and its
 * measured cost in one change, or none of them.
 *
 *   node scripts/hooks/gate-summary.mjs    no flags; registered as the `Stop` and `SubagentStop`
 *                                          hook in `.claude/settings.json`, and safe to run by hand
 *   npm run gate-summary:selftest          its fixtures (`gate-summary.selftest.mjs`)
 *
 * Each gate's own root override passes through, so a by-hand run can point it at a doctored copy:
 * `CITATIONS_ROOT=<dir> node scripts/hooks/gate-summary.mjs`, which is how the selftest runs it.
 *
 * Needs `npm` and `git` on PATH and `npm ci` in the checkout it gates, and nothing outside it.
 */
import { realpathSync } from 'node:fs'
import { ROOT, checkoutOf, npmRun, readHookInput } from './_shared.mjs'

/**
 * The fast gates, in the order they are worth reading, each with the environment it runs under.
 * Every other gate runs at pre-push and in CI; one that moves here brings its measured cost into the
 * header's budget in the same change.
 */
const GATES = [
  { script: 'check:jobs', env: {}, reads: 'check:jobs' },
  { script: 'citations:check', env: { CITATIONS_UNTRACKED: '1' }, reads: 'citations:check with untracked files' },
]

const input = await readHookInput()
const root = checkoutOf(input?.cwd)

const results = await Promise.all(
  GATES.map(async (gate) => ({
    gate: gate.script,
    ...(await npmRun(gate.script, { timeoutMs: 180_000, cwd: root, env: gate.env })),
  })),
)
const failed = results.filter((r) => r.code !== 0)

const who =
  input?.hook_event_name === 'SubagentStop'
    ? `subagent${typeof input.agent_type === 'string' && input.agent_type ? ` ${input.agent_type}` : ''} `
    : ''
const where = root === realpathSync(ROOT) ? '' : ` in ${root}`
const verdict =
  failed.length === 0
    ? `${who}gates: PASS${where} (${GATES.map((g) => g.reads).join(', ')})`
    : `${who}gates: FAIL${where} -- ${failed.map((f) => f.gate).join(', ')}. Do not report this as complete.`

const detail =
  failed.length === 0
    ? verdict
    : [
        verdict,
        '',
        ...failed.flatMap((f) => [`--- npm run ${f.gate} (exit ${f.code}) ---`, f.out, '']),
      ].join('\n')

process.stdout.write(`${JSON.stringify({ systemMessage: verdict, additionalContext: detail })}\n`)
process.exit(0)
