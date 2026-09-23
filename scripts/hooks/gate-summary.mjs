/**
 * Stop hook. Runs the fast gates and prints one line saying whether they passed.
 *
 * THE DEFECT THIS PREVENTS: reporting completion without running the gates. The screen-generation run
 * reported "lint" as unavailable rather than papering over it, which was right -- but the only reason
 * that was possible is that someone remembered to check. This makes the check unconditional.
 *
 * IT NEVER BLOCKS. A Stop hook that denies the stop can trap a session in a loop when the failure is
 * pre-existing or not fixable from here, and a hook people disable is a lie in version control. The
 * accountability mechanism is that the verdict is in the transcript where both the user and the agent
 * can see it, not that the agent is held hostage to it.
 *
 * WHAT IT RUNS is `GATES` below, and nothing else: `check:jobs` (every script a `lefthook.yml` or
 * `.github/workflows/verify.yml` job names exists, and every script no job names is declared) and
 * `citations:check` (every citation in a tracked text file resolves, and no prompt cites a memory
 * key). Both read only committed files, neither runs an emitter, and both also run at pre-push and in
 * CI, which are the tiers that decide anything (`CLAUDE.md` § The gate ladder).
 *
 * Budget: the gates run CONCURRENTLY, so the wall clock is the slower one and not their sum. MEASURED
 * 2026-09-23 on a macOS laptop: 0.30s wall for the whole hook (`time node
 * scripts/hooks/gate-summary.mjs`), against 0.16s for `npm run check:jobs` and 0.21s for
 * `npm run citations:check` alone. Neither keeps a cache, so there is no cold first run to budget for.
 *
 * THIS HEADER ONCE DESCRIBED GATES THE HOOK NEVER RAN. Until 2026-09-23 it explained `typecheck`,
 * `lint:strict:cached` and `pipeline:check` at length, and the worktree briefing
 * (`.claude/worktree-CONTEXT.md.tmpl`) named the same three, while `GATES` held the two above. The
 * prose arrived with the files this repository was bootstrapped from and was never true here: there
 * is no `typecheck` or `lint:strict:cached` script, so an agent that trusted the briefing went
 * looking for a gate that does not exist. A gate joins `GATES`, this paragraph's list and its
 * measured cost in one change, or none of them.
 *
 *   node scripts/hooks/gate-summary.mjs    no flags; registered as the `Stop` hook in
 *                                          `.claude/settings.json`, and safe to run by hand
 *
 * Needs `npm` on PATH and `npm ci` in this checkout, and nothing outside it.
 */
import { npmRun, readHookInput } from './_shared.mjs'

/**
 * The fast gates, in the order they are worth reading. Both read only committed files and neither
 * runs an emitter. Every other gate runs at pre-push and in CI; one that moves here brings its
 * measured cost into the header's budget in the same change.
 */
const GATES = [
  'check:jobs',
  'citations:check',
]

await readHookInput()

const results = await Promise.all(
  GATES.map(async (gate) => ({ gate, ...(await npmRun(gate, { timeoutMs: 180_000 })) })),
)
const failed = results.filter((r) => r.code !== 0)

const verdict =
  failed.length === 0
    ? `gates: PASS (${GATES.join(', ')})`
    : `gates: FAIL -- ${failed.map((f) => f.gate).join(', ')}. Do not report this as complete.`

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
