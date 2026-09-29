# `.claude/`

**Session configuration, not project content.** What Claude Code loads when a session starts here.

| Path | What it is |
|---|---|
| `settings.json` | Tracked. Two things and nothing else: the enabled plugins and the hook registrations, each with a `statusMessage` and an explicit `timeout` sized to the hook. |
| `settings.local.json` | Untracked (`.gitignore`). Machine-specific permissions: the allow-list that pre-empts the permission classifier on command shapes it cannot resolve. Never a hook, never a plugin. |
| `skills/<name>/SKILL.md` | Skills a session can invoke. Each opens, on the first line after its frontmatter, with the line `CLAUDE.md` § Standing rules for prompts and gates requires. No skill is judged too small to carry it, and `check:prompts` refuses one that does not, and one over its word budget in `tools/policy.json`. |
| `agents/<name>.md` | Agent definitions Claude Code can spawn, under the same opening line, a word budget of their own and the same gate. A workflow's `agentType` is resolved from the agents of the checkout its calling session started in, so a new agent is usable by a workflow once it is on the branch that session starts from. `test-builder.md` is `build-change-task.js`'s test-builder, given no tool but its structured output, which `workflows:selftest` holds. |
| `workflows/<name>.js` | Workflow scripts a skill or an agent runs through the Workflow tool, each named for what it does, with its header naming what runs it. `build-change-task.js` builds and reviews one task of a product change (`change-build` step 3), with the sizes `tools/policy.json` gives it, and stops as `not-red`, before any review, a task of a kind that file names when a scenario the parent named has neither a red record nor an already-green report; for a kind the policy gives independent tests, the `test-builder` agent, whose only tool is its structured output, writes them beside the build, and after the review the architect's runs, of those tests and of every build-stage test an earlier task committed, route each failure to a rewrite, a fix or a re-design, the fixer told only the four fields. `verify-change-trace.js` takes a change's scenario trace (`change-verify` step 4): one tracer per group of scenarios, judging only whether the tests the traceability record gives each scenario exercise it, the design lenses the session names, and skeptics for each gap, sized by `tools/policy.json`, each row's result read in code from the fresh run `scripts/fresh-run.mjs` wrote, its result written out by `scripts/render-trace.mjs`. `review-prompts.js` runs one agent per prompt file in a batched prompt review, each in a worktree of its own, on the findings that met the threshold `tools/policy.json` gives, has skeptics judge each edit and each consolidation of a prompt that an edit would take past its word budget, and says which branches the `continuous-prompt-improvement` agent may merge, which analyses it may mark read and which findings it holds (`CLAUDE.md` § Prompt reviews). `check:prompts` holds the words of each one's string literals, where its agents' prompts are, to a budget in `tools/policy.json`, but asks no opening line of it: each opens with the `meta` literal the runtime needs first, with its header right after. `workflows:selftest` runs each against stubbed agents. |
| `worktree-CONTEXT.md.tmpl` | The briefing `scripts/render-worktree-context.mjs` renders into a new worktree as `.worktree/CONTEXT.md`, which `CLAUDE.md` imports. `check:prompts` holds it to a word budget in `tools/policy.json`. |
| `worktrees/` | Where Claude Code provisions worktrees. Gitignored; the rule is load-bearing (see `.gitignore`). |

## The hooks

Every hook is a Node script under `scripts/hooks/`, registered in `settings.json`, and can be run by
hand with `node scripts/hooks/<name>.mjs < /dev/null` because the shared stdin reader returns null on
empty input.

**A registration names its script as `node "$CLAUDE_PROJECT_DIR"/scripts/hooks/<name>.mjs`, never
by a relative path.** Claude Code runs a hook in the session's current directory, so a relative path
stops loading after a Bash `cd`, and a guard that fails to load blocks nothing
(`asdlc-openspec-7dj`). `worktree:selftest` loads every registration from a subdirectory and from
outside the checkout. `CLAUDE_PROJECT_DIR` names the directory the session started in and does not
follow it into a worktree, so a session that has entered one runs the primary checkout's copy of
each hook, as current as that checkout's last pull. A hook that must act on the worktree finds it
from the payload's `cwd`, as `gate-summary.mjs` and `guard-git.mjs` do; a hook that read
`CLAUDE_PROJECT_DIR` for it would judge the primary checkout instead, which is how the guard applied
no git rule in any entered worktree until `asdlc-openspec-bvf`.

| Event | Script | Blocks? | What it does |
|---|---|---|---|
| `PreToolUse` on Bash | `guard-git.mjs` | yes; its git rules in a linked worktree only | Tokenises the command; refuses pushes, checkouts, branch writes and merges against the protected branches, and `git worktree`, `gc` and `prune`, from a worktree; and every git command in a directory under `.claude/worktrees/<name>/` where git answers for another checkout, as it does in what a removed worktree leaves. From any checkout, refuses a `gh pr create` that does not name `main` as its base, and a `gh` command that applies the reviewer's approval label (`docs/decisions.md` § R-01). Judges a command behind an `rtk` prefix by what `rtk` runs. Fails closed in a worktree when it cannot read its input. |
| `PreToolUse` on Write and Edit | `block-generated-edit.mjs` | yes | Refuses an edit to generated output and names where the change belongs. |
| `PostToolUse` on Write and Edit | `check-emitted-drift.mjs` | never | Re-runs the `:check` twin of any emitter whose input was just edited. |
| `Stop` and `SubagentStop` | `gate-summary.mjs` | never | Runs the fastest gates concurrently over the checkout the stopping agent worked in, untracked files included, and prints one verdict line into the transcript; a subagent's verdict says it is one. It never denies the stop: a hook people disable is a lie in version control. |
| `WorktreeCreate` | `worktree-create.mjs` | yes | Provisions through `scripts/new-worktree.sh`: `agent/<name>` cut from `origin/main`, with a rendered briefing, never Claude Code's native fallback off the default branch. |
| `WorktreeRemove` | `worktree-remove.mjs` | no | Removes the checkout, keeps the branch, and runs the branch sweep for paths under `.claude/worktrees/` only. |

**Hook configuration is snapshotted at session start.** A session that began before a hook was
added never sees it and silently gets the native behaviour; restart the session after changing
`settings.json`. The hook budget is a few hundred milliseconds: an in-session hook may be unsound
(a cached lint is) but must be fast, and a slower tier of the gate ladder never trusts a faster one.
