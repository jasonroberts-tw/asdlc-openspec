# `scripts/hooks/`

**Harness hooks only: the in-session tier of the gate ladder, run on every matching tool call,
inside a budget of a few hundred milliseconds.** A git pre-commit or pre-push job is a script under
`scripts/`, never here. A hook may be unsound, because a slower tier never trusts it
(`CLAUDE.md` § The gate ladder); it may not be slow, and it never blocks a stop.

A file here runs only when `.claude/settings.json` registers it, and a session reads that file once,
at its start. Where this table and the settings file disagree, the settings file wins.
The settings file registers `CNT-HOOKS` hooks.
Every hook carries the same four-part header as a gate (`CLAUDE.md` § Standing rules for prompts and
gates), and every one can be run by hand with empty input, where it exits clean with nothing to do.

<!-- kit 3.1-1 · WRITE: one row per file, added in the same change as the file and its
     registration. The kit lists only what it laid down. -->

| File | Event | Blocks? | What it is, or what it refuses |
|---|---|---|---|
| `_shared.mjs` | none: imported | | The helpers every hook here shares: the repository root (`ROOT`); the stdin reader that returns null on empty input (`readHookInput`); the payload and file readers (`editTarget`, `toRepoRel`, `header`, `readOr`); the generated-output predicates (`hasGeneratedBanner`, `bannerCheckApplies`, `generatedFileRedirect`); `npmRun`, which runs an npm script without a shell; and `checkoutOf`, which finds the checkout a payload's `cwd` is in. It imports Node's built-in `fs`, `path`, `url` and `child_process` only, and reads no file and starts no process when loaded, because it is loaded on every tool call: only `npmRun` and `checkoutOf` start one, when a hook calls them. |
| `block-generated-edit.mjs` | `PreToolUse` on Write and Edit | yes | Refuses an edit to generated output, and names the hand-maintained source where the change belongs. |
| `check-emitted-drift.mjs` | `PostToolUse` on Write and Edit | never | Re-runs the `:check` twin of any emitter whose input was just edited. |
| `gate-summary.mjs` | `Stop` and `SubagentStop` | never | Runs the fastest gates concurrently over the checkout the stopping agent worked in, with `citations:check` reading untracked files too, and prints one verdict line, which says what each gate read from that gate's own output. It never denies the stop: a hook people disable is a lie in version control. Its header gives the measured cost of each event. |
| `gate-summary.selftest.mjs` | none: `gate-summary:selftest` | | The Stop hook's tests: an untracked file with a broken pointer turns its verdict to FAIL for that reason, an ignored one does not, and `checkoutOf` gates a linked worktree there and falls back otherwise, over scratch repositories; and a copy of the hook in a scratch repository runs its gates in a linked worktree and says what that worktree's own gate read. A pre-push job and a CI step. |
| `guard-git.mjs` | `PreToolUse` on Bash | yes, in a linked worktree | Tokenises the command and refuses, from a worktree, a push, checkout, branch write or merge against a protected branch, and `git worktree`, `gc` and `prune`. Where the command runs is the payload's `cwd`, never `CLAUDE_PROJECT_DIR`, which stays at the primary checkout after `EnterWorktree`. A no-op in the primary checkout. Fails closed when it cannot read its input. |
| `worktree-create.mjs` | `WorktreeCreate` | yes | Provisions through `scripts/new-worktree.sh`, so a worktree is always `agent/<name>` cut from `origin/main` with a rendered briefing, never the harness's native fallback. |
| `worktree-remove.mjs` | `WorktreeRemove` | no | Removes the checkout, keeps the branch, and runs the branch sweep for paths under `.claude/worktrees/` only. |
| `worktree-hooks.selftest.mjs` | none: `worktree:selftest` | | The negative tests for the two worktree hooks, the guard (run as the harness runs it in a worktree a session has entered) and the branch sweep, and the check that every command `.claude/settings.json` registers loads its script from any working directory. It also renders the briefing template through a scratch copy of `scripts/render-worktree-context.mjs`, with values holding `&` and `\`, and asserts that no placeholder survives, that nothing is written outside the worktree path given, and that `ports.env` names its reader and no file this checkout lacks. It runs a copy of `scripts/new-worktree.sh` from a scratch checkout that trails its remote by a template change, and asserts the briefing is the base's template, and the checkout's once the script is doctored back to the checkout's renderer. Each case asserts the reason a refusal reports, not the refusal alone. A pre-push job. |
