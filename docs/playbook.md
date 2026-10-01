# The playbook: a route through one issue

**Written:** 2026-09-28, against `main` at `7c1383f`.

**Status:** amended 2026-09-28 by `asdlc-openspec-iom`. The issue route is named the harness route,
and the change route the product route. Amended 2026-09-28 by `asdlc-openspec-hvm`: the pipeline's
commands and page are gone (`docs/decisions.md` § D-15), and an emitter's `:check` twin says what
to regenerate. Amended 2026-09-28 by `asdlc-openspec-j09.3`, which adds the row of § 5 for an ID
that `openspec:check` finds on two headers of different titles. Amended 2026-09-28 by
`asdlc-openspec-as9`: the Verify step that traces every scenario names
`.claude/workflows/verify-change-trace.js` and `scripts/render-trace.mjs`. Amended 2026-09-28 by
`asdlc-openspec-j09.8`: the Plan stage's first step names each task's kind and IDs and traceability
rules 1 to 3, where it had a scenario marked manual. Amended 2026-09-28 by `asdlc-openspec-j09.12`:
the Finalize step that settles the living spec runs `npm run trace` before the gates, and sends a
test `trace:check` refuses back to `change-build`. Amended 2026-09-29 by `asdlc-openspec-j09.13`:
the Build step for what the build turns up sends a scenario or NFR that must change back to Propose
and runs a re-design pass, and the step that hands over holds the Build exit criteria. Amended
2026-09-29 by `asdlc-openspec-j09.14`: the Verify step that traces every scenario takes a fresh run
of every test in a clone of HEAD, runs each failing test once more, checks traceability rules 1 to 3
and writes the verification report, and the verdict step rejects on the report and puts it on the
epic and in the pull request. Amended 2026-09-29 by the prompt review in #74: the step that
watches the checks ends the turn to wait only if the watcher's exit wakes the session, as
`.claude/skills/open-pr/SKILL.md` § 6 now says. Amended 2026-09-29 by `asdlc-openspec-03c`: the
steps that write the run's analysis and launch a review, and the rows for a primary checkout and an
analysis, name `.claude/skills/close-prompt-run/SKILL.md`, where `CLAUDE.md` § Prompt reviews held
them. Amended 2026-10-01 by the prompt review `review-prompts-20261001-1331`, as
`.claude/skills/bead/SKILL.md` § 4 and § 7 now say. The step for a defect found on the way files one
the branch leaves unfixed, in a file the issue changes or not. The step that closes the issue keeps
one whose criterion needs the merged change open, with a note, until a person merges it. Amended
2026-10-01 by `asdlc-openspec-f69`: the step that writes the pull request's body first holds the
branch to each criterion and to itself, as `.claude/skills/bead/SKILL.md` § 6 now says. Amended
2026-10-01 by `asdlc-openspec-ivn`: the step that pushes first reviews the branch with the
`branch-reviewer` agent, as `.claude/skills/open-pr/SKILL.md` § 5 now says. Amended 2026-10-01 by
`asdlc-openspec-uc1`: § 5's row for the bare hook runner's skip-all, which the new runner does not
have (`docs/decisions.md` § D-19), is the row for a clone whose hooks are not installed.

**This is a route, not an authority.** Every step below names the file or the command that decides
it. Where this page and that file disagree, the file wins, and this page is what needs correcting;
where it and the register (`docs/decisions.md`) disagree, the register wins.

The unit of work here is one issue in `bd`. It takes one of two routes to the trunk:

- **The harness route (§ 4.2)** carries a harness change: a change to the rules, skills, agents,
  gates, tools or documents that run the work. A product fix that changes no requirement takes it
  too.
- **The product route (§ 4.3)** carries a product change: a change to what the product does, stated
  as requirements.

Both end in the same pull request and the same reviewer (§ 4.4).

**The product is a demo.** `apps/calculator/` is a calculator served on loopback only, carried so
that the product route has something real to act on (`docs/decisions.md` § D-04). Nobody ships it.
This page uses it only as the worked example: the change `add-calculator-web-app`, archived at
`openspec/changes/archive/2026-09-24-add-calculator-web-app/`, was the first to run every stage of
the product route, and its epic is `asdlc-openspec-zgh`.

## 1. Words you will meet

| Word | What it means here |
|---|---|
| issue | One unit of work in the tracker, with an id such as `asdlc-openspec-zgh`; also called a bead. Every task is one, never a checklist (`CLAUDE.md` § The task store). |
| `bd` | The tracker's command-line tool. Its database syncs through the git remote and is never committed (`README.md` § Setup). |
| the queue | What `bd ready` lists: the open issues nothing blocks (`CLAUDE.md` § The task store). |
| tracker bracket | `bd dolt pull` before a run's first tracker write and `bd dolt push` after its last; a rejected push is reported, never forced (`CLAUDE.md` § The task store). |
| premise | What an issue claims is true of the repository, checked against the trunk before any work (`.claude/skills/bead/SKILL.md` § 1. Verify the premise before any work). |
| found issue | An issue a run files `discovered-from` the one it worked, carrying a `foundAtLabels` label and `assetLabels` labels from `tools/policy.json` (`CLAUDE.md` § The task store). |
| harness | Everything in this repository that runs the work: the rules, skills, agents, gates, hooks, tools and documents. A harness change takes the harness route (§ 4.2). |
| product | What the work is done on: the demo calculator's code under `apps/` and its requirements under `openspec/` (`docs/decisions.md` § D-04). |
| change | A product change: a change to what the product does, stated as requirements. One worktree, one pull request and one epic (`docs/decisions.md` § D-02). |
| epic | The issue that carries a change. Its tasks are its children, and it carries the change label, `specChangeLabel` in `tools/policy.json`, which keeps them out of the general queue (`docs/decisions.md` § D-02). |
| capability | One area of the product's behaviour with a living spec of its own, such as `calculator` (`openspec/README.md`). |
| living spec | `openspec/specs/<capability>/spec.md`: what the product does now. It wins over any archived change (`openspec/README.md`). |
| proposal | A change's `proposal.md`: why, what changes, the capabilities it touches, and its impact (`.claude/skills/change-propose/SKILL.md` § 5. Write the proposal). |
| delta spec | A change's requirements added, modified, removed or renamed against the living spec, one file per capability (`.claude/skills/change-propose/SKILL.md` § 6. Write one delta spec per capability). |
| requirement, scenario | A `### Requirement:` stated with SHALL or MUST, proved by `#### Scenario:` blocks of WHEN and THEN lines, each written so it can become a test (`.claude/skills/change-propose/SKILL.md` § 6. Write one delta spec per capability). |
| design | A change's `design.md`, the how, written only when the change needs one (`.claude/skills/change-design/SKILL.md` § 2. Decide whether it needs a design). |
| trace | One row per scenario, naming the proof that exercises it and its result as run (`.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced). |
| verification report | What Verify found, from a fresh run of every test: the status of every ID, the gap analysis, the tests by layer, the thresholds and the verdict. It goes on the epic and into the pull request, never into a committed file (`scripts/lib/verify-report.mjs`). |
| archive | The pinned OpenSpec CLI merging a change's deltas into the living spec and moving the change under `openspec/changes/archive/`, on the change's branch, before the merge (`.claude/skills/change-finalize/SKILL.md` § 3. Archive). |
| send-back | A later stage reopening an earlier stage's work. The epic gets that stage's `rerouteLabels` label, because the rework lands as commits and never as an issue (`CLAUDE.md` § Product work runs as OpenSpec-format changes). |
| trunk | `main`. The protected branches are `main` and `release`, and nothing is pushed to either from a worktree (`CLAUDE.md` § Git workflow). |
| worktree | A checkout of its own under `.claude/worktrees/<name>`, on the branch `agent/<name>` cut from `origin/main`, made only through `scripts/new-worktree.sh` (`.claude/README.md`). |
| primary checkout | The clone a session starts in. The premise is read from here, and a prompt review is launched from here (`.claude/skills/close-prompt-run/SKILL.md` § 3. Launch the review). |
| gate | A check that refuses one thing. Its header names the failure it exists to prevent, and its `:selftest` proves it still refuses (`CLAUDE.md` § Standing rules for prompts and gates). |
| gate ladder | The same checks in session, at commit, at push and in CI; a slower tier never trusts a faster one (`CLAUDE.md` § The gate ladder). |
| `npm run gates` | The forced full pre-push suite, and the only way to run it by hand (`CLAUDE.md` § The gate ladder). |
| register | `docs/decisions.md`: the decisions (`D-NN`) and risks (`R-NN`) no agent re-argues, amended and never rewritten (`CLAUDE.md` § Decisions live in the register). |
| policy file | `tools/policy.json`: every constant a prompt or a tool reads, each beside a `Means` sibling saying what it decides (`docs/decisions.md` § D-03). |
| count key | A `CNT-*` key in `count-index.md`, written where the numeral would go (`count-index.md` § How to use it). |
| prompt | `CLAUDE.md`, `AGENTS.md`, a skill, an agent, a workflow script's literals or the worktree briefing template, each held to a word budget in the policy file (`README.md` § The npm scripts, the `check:prompts` row). |
| pull-request reviewer | `.github/workflows/pr-review.yml`: it judges one pull request at a time against the issues its title cites, then merges it or leaves it to a person (`docs/decisions.md` § D-07). |
| approval label | What a person applies to approve a head the reviewer left to a person, `prReviewLabels` in `tools/policy.json`. An agent never applies it (`CLAUDE.md` § Git workflow). |
| analysis | A run's account of itself, left as a note on the issue it worked, which a prompt review later reads (`.claude/skills/close-prompt-run/SKILL.md` § 1. Write the analysis, or none). |
| prompt review | A background session that reads the pending analyses as one batch and proposes prompt edits as one pull request, which a person merges or not (`CLAUDE.md` § Prompt reviews). |
| `.scratch/` | The gitignored directory for commit messages, pull-request bodies and tracker notes, each passed to its tool by file (`CLAUDE.md` § Bash command style). |
| `RUN THESE YOURSELF` | The block ending a report, listing in order each command the permission classifier refused (`CLAUDE.md` § Guards). |

## 2. Where the truth lives

| If you are asking | Read |
|---|---|
| what rule an agent must follow | `CLAUDE.md`, then the skill or agent it names |
| what is ready to be worked | `bd ready` |
| what an issue asks, and what it waits on | `bd show <id>` |
| what was decided, and whether it still stands | `docs/decisions.md` |
| what the product does now | `openspec/specs/<capability>/spec.md` |
| why the product does that | the `proposal.md` and `design.md` of the change that set it, under `openspec/changes/archive/` |
| which changes are in flight | `bd list --label <specChangeLabel> --type epic --status open,in_progress,blocked --json`, and each one's `openspec/changes/<change>/` on its branch |
| what a constant decides | `tools/policy.json`, the key's `Means` sibling |
| how many of anything | `count-index.md`, by key |
| what runs automatically, and on what trigger | `README.md` § What runs automatically |
| what an npm script does, and which tier runs it | `README.md` § The npm scripts |
| what a gate refuses, and why it exists | the gate's own header; `scripts/README.md` and `tools/README.md` list them |
| what to regenerate after an input moves | the emitter's `:check` twin, which `npm run gates` runs |
| what a worktree is for, and how to finish in it | `.worktree/CONTEXT.md` inside it, rendered from `.claude/worktree-CONTEXT.md.tmpl` |
| what the reviewer said about a pull request | its `pr-review` status, and `gh pr view <number> --comments` |
| why a prompt says what it says | the pull requests that changed it, found as `CLAUDE.md` § Standing rules for prompts and gates says |
| what keeps needing a fix across runs | the label counts `.claude/skills/change-finalize/SKILL.md` § 9. Report prints |
| what was retired, and how to recover it | `docs/retired/README.md`, and the register entry that retired it |

## 3. Before you start

There is no separate prerequisite checker. A machine is ready when it has followed its platform's
list in `README.md` § Setup, and `npm run gates` reads green from the primary checkout. A new
worktree has no `node_modules`, so `npm ci` is the first command inside one
(`.claude/worktree-CONTEXT.md.tmpl`).

Every tracker write sits inside a tracker bracket, and every command is its own call, never chained,
with any long prose passed from a file under `.scratch/` (`CLAUDE.md` § Bash command style).

## 4. The route

| Phase | What happens | What it leaves behind | How it can end |
|---|---|---|---|
| 4.1 Pick and check | An issue is taken from the queue and its premise checked against the trunk | A claim; a note on the issue when the premise does not hold | Claimed; stopped with the evidence; or handed to the product route |
| 4.2 The harness route | The work, in a worktree, gated before and after a rebase | Commits on `agent/<name>`; any found issues | Ready for a pull request; or a red gate, reported |
| 4.3 The product route | The `change-*` stages, each in a fresh session, each stopping where a person decides | A proposal and delta specs, a design or a note ruling one out, child issues, commits, the archive | Ready for a pull request; stopped for review; or sent back to an earlier stage |
| 4.4 The pull request | Opened, watched to the reviewer's verdict, and merged | A pull request and its `pr-review` verdict | Merged; changes requested; left to a person; or a review that did not complete |
| 4.5 Close and account | The issue closed, the run's analysis written, a prompt review launched if one is due | A closed issue whose reason names the pull request; an analysis note | Closed; or open, waiting on a person or on an issue |

### 4.1 Pick and check

1. Pull the tracker, then take the top of the queue, leaving a change's tasks to its own stages:
   `bd ready --exclude-label <specChangeLabel>`. Decided by: `.claude/skills/bead/SKILL.md`, its
   opening paragraph.
2. With several issues, partition them before claiming any: two branches that add rows beside the
   same anchor stay separate, and two issues describing one defect are one lane. A sweep of the
   queue goes to the `fan-out-work` agent instead. Decided by: `.claude/skills/bead/SKILL.md`
   § 2. Partition before claiming, and `.claude/agents/fan-out-work.md` § 2. Partition the ready
   work into lanes.
3. Read the issue with `bd show <id>`, then the code it talks about as the trunk has it:
   `git fetch origin main`, then `git show origin/main:<path>`. Decided by:
   `.claude/skills/bead/SKILL.md` § 1. Verify the premise before any work.
4. Decide, citing file and line, whether the issue is still valid, already fixed, obsolete or
   blocked. With a live user, a premise that does not hold is shown and the session stops; in an
   autonomous session it is written into the issue as a note, and the issue stays open. Decided by:
   `.claude/skills/bead/SKILL.md` § 1. Verify the premise before any work.
5. Choose the route. An issue that would make a requirement read differently, something a user or a
   caller of the product can observe, goes to `change-propose` (§ 4.3). A refactor, a gate, a
   document or the tooling goes on by the harness route (§ 4.2). Decided by:
   `.claude/skills/change-propose/SKILL.md` § 1. Decide that it is a change, and `CLAUDE.md`
   § Product work runs as OpenSpec-format changes.
6. Claim it inside a tracker bracket: `bd update <id> --claim`. A deferred issue refuses the claim
   until `bd undefer <id>`, which only someone who means to work it now runs. Decided by:
   `.claude/skills/bead/SKILL.md` § 3. Claim, then work in a worktree.

### 4.2 The harness route

This is the route of the `bead` skill (`.claude/skills/bead/SKILL.md`). It carries every harness
change, and any product fix that changes no requirement, such as a refactor or a fix that brings the
code back to its spec (`docs/decisions.md` § D-02, item 2).

1. Make the worktree with `EnterWorktree`, whose hook provisions it through
   `scripts/new-worktree.sh`, never with `git worktree add`. Run `npm ci`, then read
   `.worktree/CONTEXT.md`. Decided by: `.claude/skills/bead/SKILL.md` § 3. Claim, then work in a
   worktree.
2. Make the change. A file that is generated output is never edited by hand; the correction goes
   into its hand-maintained source, and `scripts/hooks/block-generated-edit.mjs` names where.
   Decided by: `CLAUDE.md` § Three kinds of file, and never a fourth.
3. After the last edit to an emitter or its inputs, regenerate what it writes; its `:check` twin
   refuses an artifact left stale. Decided by: `.claude/skills/bead/SKILL.md` § 4. Implement,
   regenerate, gate, and `CLAUDE.md` § The script suffix contract.
4. A defect found on the way is fixed here only when it sits in a file the issue already changes.
   One left unfixed is searched for (`bd search`, then `bd list --all --desc-contains`, each with a
   second phrasing), and noted on a match or filed as a found issue before the pull request opens.
   Decided by: `.claude/skills/bead/SKILL.md` § 4. Implement, regenerate, gate, and `CLAUDE.md`
   § The task store for its labels.
5. Stage every new file with `git add`, then run `npm run gates`. The citations and count-index
   gates read only tracked files, so an unstaged file passes them unread. Decided by:
   `.claude/skills/bead/SKILL.md` § 4. Implement, regenerate, gate.
6. Commit, with the message passed from a file under `.scratch/`. Decided by: `CLAUDE.md` § Bash
   command style.
7. `git fetch origin`, then `git rebase origin/main`, then `npm run gates` again. A rebase that
   conflicts in a way you did not anticipate is stopped and reported. Decided by:
   `.claude/skills/bead/SKILL.md` § 5. Rebase and gate again, and `CLAUDE.md` § The gate ladder.

Then open the pull request (§ 4.4).

### 4.3 The product route

Each stage is a skill, run in a fresh session that picks the change up from its name, its epic and
its worktree, never from an earlier stage's conversation (`CLAUDE.md` § Product work runs as
OpenSpec-format changes). The calculator change shows what each stage leaves: its archive holds the
proposal, the design and the delta specs of its capabilities `calculator` and
`calculator-local-server`, and `bd show asdlc-openspec-zgh` lists its tasks and the issues it found.

The route stops for a person at every review below, at each doubt about a scenario's expected
value, and at each gap `change-verify` finds. Each question that recommends an option shows where
that option loses (`CLAUDE.md` § A question shows where its recommendation loses).

#### Propose

1. Propose a kebab-case name, a verb and its object, and have the user confirm it; it names the
   branch and the worktree, and cannot change once the worktree exists. Decided by:
   `.claude/skills/change-propose/SKILL.md` § 2. Name it, and ask.
2. Open the epic: a seeding issue becomes the epic, keeping its id; otherwise a new epic is created.
   Either way it carries the change label and the `change` metadata the later stages find it by.
   Decided by: `.claude/skills/change-propose/SKILL.md` § 3. Open the epic.
3. Cut the worktree with `EnterWorktree` and the change's name, then `npm ci`. Decided by:
   `.claude/skills/change-propose/SKILL.md` § 4. Cut the worktree.
4. Write `openspec/changes/<change>/proposal.md`, after reading the living spec so that a specified
   requirement is modified rather than added twice. Decided by:
   `.claude/skills/change-propose/SKILL.md` § 5. Write the proposal.
5. Write one delta spec per capability the proposal lists, in the exact grammar the archive merges.
   Decided by: `.claude/skills/change-propose/SKILL.md` § 6. Write one delta spec per capability.
6. Run `npm run openspec:check`, commit, and stop: the user reviews the proposal and the specs
   before anything else happens. Decided by: `.claude/skills/change-propose/SKILL.md` § 7. Check it,
   commit it, and stop.

#### Design

1. Decide whether the change needs a design. If not, write no file, and record why as a note on
   the epic. Decided by: `.claude/skills/change-design/SKILL.md` § 2. Decide whether it needs a
   design.
2. Write `design.md`: context, goals, each decision with the alternative that lost, risks. Every
   value the product computes or carries forward gets its representation, its precision and its
   rounding rule. A behaviour no scenario states goes into a delta spec, and a decision that binds
   the repository beyond the change is proposed to the user as a register entry, as
   `docs/decisions.md` § D-04 was accepted during the calculator change's design stage. Decided by:
   `.claude/skills/change-design/SKILL.md` § 3. Write it.
3. Work out every scenario's expected value from the design, and put any that depends on an
   unmade choice to the user now. Decided by: `.claude/skills/change-design/SKILL.md` § 4. Settle
   each scenario's expected value.
4. Stage, run `npm run openspec:check` and `npm run citations:check`, commit, and stop for the
   user's review. Decided by: `.claude/skills/change-design/SKILL.md` § 5. Commit it, and stop.

#### Plan

1. Draft the tasks to `.scratch/<change>-plan.md`, in dependency order, each with its kind, the
   scenario and NFR IDs it satisfies, its proof and what it waits on, and draft the epic's
   acceptance criteria. The draft holds traceability rules 1 to 3, lists every task that is not
   `asset:product` as exempt from rule 3, and proves no scenario by hand. Decided by:
   `.claude/skills/change-plan/SKILL.md` § 2. Draft the tasks and the epic's criteria.
2. Show the draft and write nothing to the tracker until the user approves it. Decided by:
   `.claude/skills/change-plan/SKILL.md` § 3. Stop for approval.
3. File each task as a child of the epic with `bd create --parent`, and write the approved criteria
   into the epic. Decided by: `.claude/skills/change-plan/SKILL.md` § 4. File it.

#### Build

1. Take a child already in progress first; otherwise the first of `bd ready --parent <epic>`, and
   claim it. Decided by: `.claude/skills/change-build/SKILL.md` § 2. Take the next task.
2. Run `.claude/workflows/build-change-task.js` for the task with the Workflow tool, with the
   `assetLabels` key of what the task mainly changes; `buildReviewLenses` in `tools/policy.json`
   picks its reviewers. Decided by: `.claude/skills/change-build/SKILL.md` § 3. Build it, and prove
   it.
3. Act on what it returns, run the task's proof yourself, regenerate, put any doubt about an
   expected value to the user, then commit. Decided by: `.claude/skills/change-build/SKILL.md` § 3.
   Build it, and prove it.
4. Close the task with the subject of the commit that built it, never its id, since the rebase and
   the rebase merge rewrite every id. Decided by: `.claude/skills/change-build/SKILL.md` § 4. Close
   it.
5. What the build turns up. A defect out of scope is a found issue, without the change label. Work
   in scope but missing from the plan is a new child, once the user agrees. A scenario or NFR that
   must change stops the build and goes back to `change-propose`. A design that cannot hold gets a
   re-design pass: a new `design.md` and contract artifacts and no delta spec, committed before the
   code it allows. Either reopens the tasks the trace record links to what changed. Decided by:
   `.claude/skills/change-build/SKILL.md` § 5. What the build turns up.
6. Repeat until no child of the epic is open, then run `npm run trace`, commit the record and run
   `npm run gates`, and hand over only when each Build exit criterion holds, each shown by the gate
   or the workflow result the skill names. Decided by: `.claude/skills/change-build/SKILL.md` § 6.
   Repeat, then hand over.

#### Verify

1. Every child of the epic is closed; if not, the build has not finished. Decided by:
   `.claude/skills/change-verify/SKILL.md` § 2. Every task is closed.
2. `npm run openspec:check` passes: the deltas validate and apply to the living spec. Decided by:
   `.claude/skills/change-verify/SKILL.md` § 3. The specs are valid, and apply.
3. Run every test, the trace gate and the Commands' mutation run in a fresh clone of HEAD with
   `npm run tests:fresh`, and run each failing test once more, by name, as its own call; a test
   that fails and then passes is flaky and counts as failing. Trace every scenario to the tests the
   traceability record gives it, reading each rather than trusting its name, with
   `.claude/workflows/verify-change-trace.js`, which takes each result from that run;
   `scripts/render-trace.mjs` writes the trace into `.scratch/<change>-trace.md`. Check traceability
   rules 1 to 3 against the epic's children, and write the verification report with
   `scripts/render-verify-report.mjs`. A manual verification is no proof. Decided by:
   `.claude/skills/change-verify/SKILL.md` § 4. Every scenario is traced.
4. `npm run gates` passes. Decided by: `.claude/skills/change-verify/SKILL.md` § 5. The gates are
   green.
5. On a gap, a failing blocking test, an unmet obligation or a gap-analysis item not waived, the
   user picks the stage that fixes it, and the epic is labelled and noted. The report goes on the
   epic, and verification runs again once it is fixed. With none, the report goes on the epic, and
   the trace and the report go to the pull request, never into a committed file. Decided by:
   `.claude/skills/change-verify/SKILL.md` § 6. Verdict.

#### Finalize

1. Rebase onto `origin/main` and run `change-verify` again from its step 2. Decided by:
   `.claude/skills/change-finalize/SKILL.md` § 2. Rebase, and verify again.
2. Archive with the pinned CLI, merging the deltas into `openspec/specs/`. Decided by:
   `.claude/skills/change-finalize/SKILL.md` § 3. Archive.
3. Write each new capability's Purpose, read each living spec the archive touched, repoint every
   path the archive moved, run `npm run trace` and `npm run gates`, and commit. A test `trace:check`
   refuses, on an ID the change removed or modified, undoes the archive and sends the change back to
   `change-build`. Decided by: `.claude/skills/change-finalize/SKILL.md` § 4. Settle the living spec.
4. Open the pull request (§ 4.4), titled `<change>: <what changed> (<epic id>)`, then leave the
   worktree with `ExitWorktree`, keeping it. Decided by: `.claude/skills/change-finalize/SKILL.md`
   § 5. Open the pull request, and § 6. Leave the worktree.
5. Once it has merged, clean up, check each of the epic's acceptance criteria against a command or
   a file, and close the epic (§ 4.5). Decided by: `.claude/skills/change-finalize/SKILL.md` § 7.
   Merge, through the reviewer, and § 8. Clean up, check the epic's criteria, and close it.

### 4.4 The pull request

Every pull request is opened with the `open-pr` skill, whoever opens it.

1. Test the merge against each open pull request that touches a file this branch touches, and name
   any conflict in the body. Decided by: `.claude/skills/open-pr/SKILL.md` § 2. Test the merge
   against the open pull requests.
2. End the title with the ids of the issues the branch carries, in parentheses. The reviewer reads
   them from there and nowhere else, and a title that carries none leaves the merge to a person.
   Decided by: `.claude/skills/open-pr/SKILL.md` § 3. The title.
3. Hold the branch to each criterion as worded and to itself, and fix a gap the body would
   disclose, or make the tree say what is true and file its follow-up. Then write the body to a file
   under `.scratch/`, opening with any register entry or prerequisite the work named, and naming
   every found issue. Decided by: `.claude/skills/open-pr/SKILL.md` § 4. The body, and
   `.claude/skills/bead/SKILL.md` § 6. Open the pull request and watch its checks.
4. Review the branch first, in a context of its own: the `branch-reviewer` agent reads the brief
   `node scripts/pr-review.mjs brief --local` writes, and the session fixes what it says the
   reviewer would refuse. Then push, open it with `--base main` typed, and mark the reviewer's
   status pending with `PR=<number> node scripts/pr-review.mjs mark`. Decided by:
   `.claude/skills/open-pr/SKILL.md` § 5. Push, open, and mark it pending.
5. Watch it with one watcher, `gh pr checks <number> --watch`, in the background, and end the turn
   to wait only if the watcher's exit wakes the session. Decided by:
   `.claude/skills/open-pr/SKILL.md` § 6. Watch it with one watcher.
6. Act on the outcome. `verify` runs every gate that reads only committed files; once it passes, the
   reviewer judges the head against the cited issues' acceptance criteria, its maintainability and
   its risk, and merges it, requests changes, or leaves it to a person. The table of what each
   status asks is `.claude/skills/open-pr/SKILL.md` § 7. Act on the outcome. Decided by:
   `scripts/pr-review.mjs`, under `docs/decisions.md` § D-07.

A person decides the merge when the reviewer judges the risk high, when a criterion cannot be
verified, or when the title cites no issue. The paths and JSON keys that make a pull request high
risk whatever the reviewer says are `prReviewHighRiskPaths` and `prReviewHighRiskJsonKeys` in
`tools/policy.json`. The person merges it, or applies the approval label for the reviewer to merge
it; an agent never applies that label (`CLAUDE.md` § Git workflow, and `docs/decisions.md` § R-01
for what that rule alone still holds).

### 4.5 Close and account

1. When every check is green, close the issue with a reason naming the pull request, from a file:
   `bd close <id> --reason-file <file>`. If a person decides the merge, an issue whose criterion
   needs the merged change stays open, with a note naming the pull request, until it merges.
   Whoever sees the merge closes it. An acceptance criterion that acts outside the repository is
   not performed; it becomes a follow-up issue labelled `human`. Decided by:
   `.claude/skills/bead/SKILL.md` § 7. Close on green, with a reason.
2. A change's epic closes only after the cleanup and a check of each criterion as met, unmet or not
   exercised; a criterion with no approved follow-up keeps it open. Decided by:
   `.claude/skills/change-finalize/SKILL.md` § 8. Clean up, check the epic's criteria, and close it.
3. Write the run's analysis as a note on the issue it worked, from a file, inside a tracker bracket:
   its marker line, the prompts the run loaded and the commit it read them at, what made the run
   slower or wrong, and the counts across runs. Decided by:
   `.claude/skills/close-prompt-run/SKILL.md` § 1. Write the analysis, or none.
4. Check whether a review of the pending analyses is due, and if one is, launch it in the
   background from the primary checkout, under a name of its own, without waiting for it. Decided
   by: `.claude/skills/close-prompt-run/SKILL.md` § 2 and § 3.
5. Report what was verified, what changed, both gate runs as measured, the pull request, the
   issue's final state and every follow-up filed, ending with a `RUN THESE YOURSELF` block for any
   refused command. Decided by: `.claude/skills/bead/SKILL.md` § 8. Report, and `CLAUDE.md`
   § Guards.

What the runs leave behind, and how it reaches the prompts and the rules, is `README.md` § The
work, and what its runs leave behind. Nothing a program derives from them instructs an agent until a
person merges it (`CLAUDE.md` § A program proposes; only a person promotes).

## 5. When it goes wrong

| What you see | What it means | What to do |
|---|---|---|
| `issue not claimable: status deferred` | The issue was deferred out of the queue. | `bd undefer <id>`, only if you mean to work it now, then claim it (§ 4.1). |
| A gate fails on a missing binary in a new worktree | `npm ci` has not run there. | `npm ci`, then run the gate again (§ 3). |
| `npm run gates` refuses: no `hook.asdlc-pre-push.command` | The clone's hooks are not installed: `npm ci` ran with install scripts blocked, or with `CI` set. | `npm run hooks:install`, then `npm run gates` again (`CLAUDE.md` § The gate ladder). |
| The gates are green, yet a pointer in a new file is broken | The file was not staged, so the citations gate never read it. | `git add` it, then `npm run gates` again (§ 4.2, step 5). |
| A hook refuses a git or `gh` command, or an edit | A guard caught a slip: a protected branch, the approval label, generated output. | Read the refusal, which names what to do instead; never retry a variation (`.claude/worktree-CONTEXT.md.tmpl`). |
| The permission classifier refuses a command | Its judgement of that call, not a rule of the repository. | Skip it, no workaround, and list it in `RUN THESE YOURSELF` (`CLAUDE.md` § Guards). |
| A rebase conflicts in a way you did not anticipate | Someone else's work landed on the same lines. | Stop and report it; do not resolve it creatively (`.claude/worktree-CONTEXT.md.tmpl`). |
| ``<id>: no `repo:` label`` from `beads:check` | An open issue does not say where its work lands. | Add its `repo:` label (`CLAUDE.md` § The task store). |
| ``<id>: filed `discovered-from` … and carries no label that `assetLabels` `` from `beads:check` | A found issue does not say what kind of file it would fix. | Add the `assetLabels` label that fits (`CLAUDE.md` § The task store). |
| `<path>: <count> words, over its budget of <budget>` from `check:prompts` | An edit took a prompt past its word budget. | Consolidate it first (`.claude/agents/continuous-prompt-improvement.md` § How a prompt is consolidated); a raise is a person's to merge. |
| `TBD - created by archiving change` refused by `openspec:check` | A new capability still has the archive's placeholder Purpose. | Write its Purpose (`.claude/skills/change-finalize/SKILL.md` § 4. Settle the living spec). |
| `` `[<ID>]` heads 2 different scenarios `` or `` different NFR requirements `` from `openspec:check` | A reworded header kept its ID; a new header took an ID already in use; or two changes in flight took one ID, and this branch rebased onto the one that merged first. | Give the reworded or new header, and its tests, the next free ID the refusal names (the header of `scripts/check-openspec.mjs`). |
| `change-verify` lists children that are not closed | The build has not finished. | Run `change-build` in a fresh session (`.claude/skills/change-verify/SKILL.md` § 2. Every task is closed). |
| `gh pr checks --watch` exits at once with "no checks reported" | Nothing had registered yet. | Start the one watcher again; it is not a second one (`.claude/skills/open-pr/SKILL.md` § 6. Watch it with one watcher). |
| `pr-review` fails, or says "A person decides" | The reviewer's verdict on this head. | The row for its words in `.claude/skills/open-pr/SKILL.md` § 7. Act on the outcome. |
| `bd dolt push` is rejected | The tracker's remote moved, or refused the write. | Report the exact command and its error; never force it (`CLAUDE.md` § The task store). |

## 6. Crib sheet

Each line is its own call, never chained. `<specChangeLabel>` and `<marker>` stand for the values of
`specChangeLabel` and `promptReviewAnalysisMarker` in `tools/policy.json`.

The harness route:

```bash
bd dolt pull                                         # sync tracker before any write
bd ready --exclude-label <specChangeLabel>           # the queue, without change tasks
bd show <id>                                         # the issue and its dependencies
git fetch origin main                                # read code as trunk has
git show origin/main:<path>                          # one file at the trunk
bd update <id> --claim                               # claim it inside the bracket
npm ci                                               # first command in a worktree
bd search "<words>"                                  # a follow-up filed already, titles
bd list --all --desc-contains "<words>"              # the same search over descriptions
git add <new file>                                   # stage before the gates run
npm run gates                                        # the forced full pre-push suite
git fetch origin                                     # then rebase onto the trunk
git rebase origin/main                               # rebase, never merge the trunk
npm run gates                                        # gate again after the rebase
git push -u origin agent/<name>                      # publish the agent branch once
gh pr create --base main --head agent/<name> --title "<what changed> (<id>)" --body-file .scratch/<pr>.md   # open it, base typed
PR=<number> node scripts/pr-review.mjs mark          # set the review status pending
gh pr checks <number> --watch                        # one watcher, in the background
gh pr view <number> --comments                       # read the reviewer's verdict comment
bd close <id> --reason-file .scratch/<reason>.md     # close, naming the pull request
bd note <id> --file .scratch/<analysis>.md           # leave the run's analysis note
bd list --all --notes-contains "<marker>" --json -n 0   # is a prompt review due
bd dolt push                                         # sync tracker after the last write
```

The product route adds:

```bash
bd list --label <specChangeLabel> --type epic --metadata-field change=<change> --json   # find the change's epic
npm run openspec:check                               # validate and trial-archive every change
bd ready --parent <epic> --json                      # the change's next ready task
bd list --parent <epic> --status open,in_progress,blocked,deferred --json   # empty means the build finished
OPENSPEC_TELEMETRY=0 node_modules/.bin/openspec archive <change> --yes   # merge deltas into living spec
npm run worktree:gc -- --dry-run                     # what the sweep would remove
bd count -t epic -l <specChangeLabel> --by-label     # changes, and their send-backs
```
