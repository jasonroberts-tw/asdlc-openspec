# asdlc-openspec-ic9h · The prompt review runs nightly in a scheduled Actions workflow over every pending analysis, reads each run's Langfuse figures, and dev container sessions trace to a Langfuse project of their own

**Recorded 2026-10-09**, carried by `asdlc-openspec-ic9h`, and written under its child
`asdlc-openspec-ic9h.2`. On 2026-10-07 the maintainer asked for the review to run as the first step
of `open-pr`, with its edits in the work's pull request. On 2026-10-09 they replaced that design with
this one, in conversation. They chose items 1 to 6, each from options put to them with the case
where it loses. One of those choices, the App's key, was put a second time once the session found
that its first loss understated what the key can do. At the branch review of this record they chose
item 7's TypeSafe key the same way. The session chose the words, the probes, and the order in which
the children of `asdlc-openspec-ic9h` land.

**Builds on / amends:** amends D-05, D-07, D-08, D-17, D-31, D-32, D-44, D-48, D-49, D-51, D-52,
D-57, R-01 and R-02, as each blockquote under them says. Builds on D-10 and D-12, whose skeptics
and consolidation the review keeps unchanged; on D-15, under which a command that reads
outside the repository is held by its selftest; on D-37, whose reviewer workflow still runs no model
and reads no secret; on D-42, whose TypeSafe calls the review still makes from a script a session
runs; and on D-54, whose container works in a clone of its own.

**Decision.**

1. **The review runs from a scheduled workflow, over whatever is pending.**
   - `.github/workflows/prompt-review.yml` runs the `continuous-prompt-improvement` reviewer on a
     nightly schedule, and whenever a person dispatches it. That is how a person starts a review at
     any time.
   - A run reviews every analysis no review has read, if any is pending.
   - The due thresholds, `promptReviewDueCount` and `promptReviewDueAgeDays`, retire.
   - A run's closing step writes its analysis and launches nothing.
   - The workflow's header becomes the home of when a review starts and of its name, still
     `review-prompts-` followed by the UTC date and time.
   - No second review starts while a review's pull request is open, or while another run of the
     workflow holds its concurrency group. The concurrency group replaces the check for a working
     session in `claude agents --json`, which cannot see a run in Actions.
2. **The job authenticates to Anthropic by workload identity federation**, as D-07 item 6 did, and
   no API key is stored.
   - The federation rule's subject is bound to an environment, `prompt-review`, that only `main`
     deploys to.
   - The rule, the service account and the four secrets of D-07 were deleted under
     `asdlc-openspec-wft3`, so a person creates them again.
3. **The job opens the review's pull request as the agents' App**, through a token it mints at its
   start and revokes at its end.
   - The token comes from a key of the App's that is kept for CI alone, as a secret of that
     environment.
   - The workflow grants its job only `contents: read` and `id-token: write`.
   - `pr-review:check` refuses any other workflow that reads the key, the workflow on any event but
     `schedule` or `workflow_dispatch`, and a job that reads the key outside the environment.
   - The same token reaches the tracker. The job bootstraps it from its Dolt remote, which is a ref
     of this repository, and pushes the review's read, held and closed lines there. So the job is one
     more writer of the tracker. A refused push is reported and never forced (`CLAUDE.md` § The task
     store).
4. **Each analysis records its run's session id**, on a line after its `claude --version` line,
   taken from `CLAUDE_CODE_SESSION_ID`.
   - `scripts/prompt-runs.mjs` parses the line. It is required from a cut-off instant that the
     cutover sets.
   - The variable equals the run's session id, and a workflow agent inherits its parent's (verified
     against the CLI, 2.1.295, `asdlc-openspec-ic9h.1` P1 and P4).
5. **A figures reader passes each pending run's Langfuse figures to the review, and never its
   content.**
   - Per run, the figures are: turns, tool calls by name, input and output tokens, cost where
     Langfuse gives it, wall time, and the count of error-level observations.
   - It runs as a step before the model's. Both projects' Langfuse keys, the host's and the
     container's of item 6, are on that step alone, so the model never holds them.
   - The tracker and the review's pull request are public, so no prompt, response or tool output
     reaches either.
6. **Dev container sessions trace to a Langfuse project of their own.**
   - The keys come from a host directory, mounted read-only.
   - The container's entrypoint installs Langfuse's plugin and configures it from those keys, and
     starts clean when the directory holds none.
   - In the container, the plugin's `configure` writes the secret key to a file only its owner
     reads, mode 600 (`asdlc-openspec-ic9h.1` P6, plugin 1.2.1).
   - A container session then holds no key that reads the maintainer's own traces.
7. **The review's work is unchanged.**
   - It still holds a finding until it recurs or is severe, sends each edit to skeptics, answers each
     changed prompt's stored cases, and opens one pull request decided by the high-risk floor.
   - It still keys held findings through TypeSafe, with `mise run prompt-review:match`. The job holds
     `TYPESAFE_API_KEY` as a secret of the environment, on the model's own step, because the matcher
     runs inside the reviewer's session, where the findings the model forms are.

**Why.** The maintainer, 2026-10-09: "Instead of making the reviews part of the original run as the
card describes, and instead of having reviews be triggered by the run as it currently does, schedule
a nightly review for all pending analysis. It could be a scheduled github actions job, I believe all
the inputs would available for it. Additionally, we could incorporate our Langfuse telemetry data
into the reviews."

That premise was checked first, and it held only in part:

- CI had never read the tracker (D-11 item 1).
- The gates refused `pull-requests: write` outside `pr-review.yml` (D-57 item 4).
- The federation was deleted.
- Nothing had shown the Workflow tool running in a headless run.

Items 2 and 3 answer the first three points. The probes of `asdlc-openspec-ic9h.1` answered the
last: a headless `claude -p` run called the Workflow tool, the WorktreeCreate hook provisioned its
agent's worktree, an `agentType` resolved, and the run waited for a background task and woke when it
ended (verified against the CLI, 2.1.295).

The review read only each run's own account of itself (`.claude/agents/continuous-prompt-improvement.md`
§ 2), and Langfuse held what the session did, but only for the maintainer's own machine
(`asdlc-openspec-pnp`). Items 4 to 6 join the two.

The alternatives that lost:

- **The review as the first step of `open-pr`**, with its edits in the work's pull request: the
  issue's design of 2026-10-07, dropped at the maintainer's word.
  - The review would sit on each pull request's path to its push. The 13 batched reviews took 17 to
    129 minutes each.
  - Of the 8 from #107, the first review pull request to change `tools/policy/prompt-budgets.json`,
    to #180, 7 changed that file. It is on the high-risk floor, so most work pull requests that
    carried a review's edit would have waited for a person.
- **The launch by a run's closing step**, as D-08 and D-17 had it. An analysis written in a week when
  no prompt runs waits past every threshold, and a person cannot start a review below them
  (`asdlc-openspec-hjc`).
- **A timer on the maintainer's machine**, the other scheduler of D-08's lost alternative. No secret
  would move into CI. But the schedule lives outside the repository, where no gate sees it, and it
  runs only on nights when the machine is on.
- **Pushing the review's branch only**, with no App key in CI. No job would hold a token that
  approves. But no pull request would exist until a person or the next session opened one.
- **Keeping the thresholds under the schedule.** Two keys and a due check would stay alive for a
  schedule that already bounds the wait at one night.
- **The session id now, and the reader in a later change.** The review would read self-reports
  only, even for the runs whose traces exist.
- **No TypeSafe key in CI.** No such key would sit on the model's step to leak. But the reviewer's
  session would key every held finding itself, as before `asdlc-openspec-6yt.1`, so a recurring
  minor finding whose key drifts between reviews would start again at one each time.
- **One Langfuse project for the host and the container.** One key pair, mounted once. But any
  container session could read every host trace through the API, the maintainer's prompts among
  them, where D-51 meant the container to hold none of the maintainer's credentials.

Where it loses:

- **It brings back a job that runs a model and reads secrets in CI**, the first since D-37. The
  reviewer writes the tracker and opens a pull request with the token it holds, which D-08's lost
  alternative said D-07 keeps apart.
- **During the job, the model holds a token that can approve a floor pull request the App did not
  open**, such as one the maintainer opened. A text the review reads, from the public tracker or a
  pull request, that led it to approve one through `gh api` would meet nothing in CI that stops it.
  Every container session already holds that route (D-57's first loss). What is new is that the
  model runs unattended.
- **CI holds both projects' Langfuse keys.** The host project's key reads every host trace, the
  maintainer's prompts among them. The figures step holds the keys, and the model's step does not.
- **The model's step holds `TYPESAFE_API_KEY`.** A text that led the model to print its environment
  would put that key in the public run log or the pull request, where anyone could spend it.
- **CI is one more writer of the tracker**, which can conflict with a session's push. A refused push
  fails the run, and its analyses stay pending for the next night.
- **A night with one pending analysis pays the review's fixed cost for one run**: collecting,
  matching and writing the tracker's lines. Edits are still held until a finding recurs.
- **Most runs have no trace until the container traces**, and a run on a host other than the
  maintainer's has none at all.
- **A malformed line in the tracker fails the nightly run**, and is found in the next morning's log
  rather than by the run that wrote it.
- **The workflow's own changes need the maintainer's push**, since the App is recorded as holding no
  Workflows permission (D-51's second loss). `asdlc-openspec-ic9h.11` reads that permission.
- **The plugin and its `langfuse` package are unpinned.** The marketplace serves the plugin's latest
  version, and uv fetches the package at run time.

**What changed.**

- **`docs/decisions.md`:** the amendments under D-05, D-07, D-08, D-17, D-31, D-32, D-44, D-48,
  D-49, D-51, D-52, D-57, R-01 and R-02.
- **`docs/decisions/`:** this record.
- **Nothing else in this tree yet.** Each part lands with a child of `asdlc-openspec-ic9h`:
  - the session line, `asdlc-openspec-ic9h.3`;
  - the figures reader, `.4`;
  - the gate's rule, `.5`;
  - the workflow, `.6`;
  - the cutover of the prompts and the policy, `.7`;
  - the container's tracing, `.8`;
  - the person's steps, `.9` to `.12`.
- **"Applied" covers only this register's changes until the cutover lands.** Until then, a run's
  closing step still launches a review, as `.claude/skills/close-prompt-run/SKILL.md` says. That
  is this decision not yet applied, and not a second decision.

**Figures.**

- 13 batched review pull requests, each 17 to 129 minutes from the launch time in its branch name to
  its creation: `gh pr list --state all --limit 30 --search "head:agent/review-prompts" --json headRefName,createdAt`,
  read 2026-10-09.
- Of the 8 from #107, the first review pull request to change `tools/policy/prompt-budgets.json`,
  to #180, 7 changed it, all but #140:
  `gh pr list --state all --limit 30 --search "head:agent/review-prompts" --json number,files`, read
  2026-10-09.
- The probes' results and their commands: `asdlc-openspec-ic9h.1`'s Findings.
