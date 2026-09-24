# Review of the `change-propose` skill

**Written:** 2026-09-23

The review of `.claude/skills/change-propose/SKILL.md`, the first of the six `change-*` stages. Where
this file and the skill disagree about what the skill says, the skill wins; this file is the evidence
for why it says it. Where either disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

## Review of 2026-09-23

### The prompt and the run reviewed

- **Prompt:** `.claude/skills/change-propose/SKILL.md` as it stood at `ac307b6` (then `origin/main`),
  last changed by `6fbec90` (`git log origin/main -- .claude/skills/change-propose/SKILL.md`).
- **Run:** 2026-09-23, a live user present. The invocation: `/change-propose Write a demo application
  for this repository. A simple calculator web application. No infra/deployment, local run only.`
- **Output:** commit `aa7f050` on `agent/add-calculator-web-app`, cut from `origin/main` at `ac307b6`.
  It adds `openspec/changes/add-calculator-web-app/proposal.md` and two delta specs, `calculator` and
  `calculator-local-server`, 393 lines in all (`git show --stat aa7f050`). The branch was not pushed
  when this review was written (`git branch -r` does not list it).
- **Tracker:** the seed `asdlc-openspec-zgh` became the epic. It carries the `spec-change` and
  `repo:asdlc-openspec` labels, the spec id `openspec/changes/add-calculator-web-app`, the metadata
  `change: add-calculator-web-app`, and a dated note recording the choice (`bd show
  asdlc-openspec-zgh`). A defect found on the way was filed as `asdlc-openspec-5pf`, labelled
  `repo:asdlc-openspec` only and linked `discovered-from` the epic (`bd show asdlc-openspec-5pf`).
- **Input:** the session's own analysis of the run, passed with this review's request. It is an
  input, not a verdict; the corrections below say where it is wrong.

### What the earlier reviews' changes did in this run

None: this is the skill's first review, and it carried no `Reviewed:` trailer before it.

### What the run cost that the prompt did not prevent

1. **The worktree briefing forbids what the request needed, and the skill reads the briefing too
   late to ask about it.**
   - `.claude/worktree-CONTEXT.md.tmpl` says "Nothing in this repository serves a port" and "If you
     find yourself wanting a port, stop". `CLAUDE.md` § Worktree-local context gives the briefing
     precedence where it conflicts.
   - A local calculator web app serves a port. Step 4 reads `.worktree/CONTEXT.md` only after the
     name is confirmed and the epic is open, so a session following the skill as written meets the
     stop instruction after the tracker writes.
   - The session read the template before the cut, by its own choice, and put "local server or
     static file" into the same question as the name. The user chose the server. The proposal's
     `## Impact` names the template and a new `docs/decisions.md` entry for the reversal.
   - **Fix, applied,** in step 2: before asking, read the template at `origin/main`. A conflict with
     it goes into the same question as the name, and if the user goes ahead, `## Impact` names the
     template and the register entry.

2. **Steps 1 and 2 checked a stale checkout, and so did the briefing the worktree was given.**
   - The primary checkout's `main` was `053e51c`, four commits behind `origin/main` at `ac307b6`
     (`git rev-list --count main..origin/main`). The worktree was cut from `ac307b6`.
   - For `openspec/` the two agreed: `git diff --stat main origin/main -- openspec` is empty, and
     `git ls-tree -r --name-only 053e51c openspec/` lists only `openspec/README.md` and
     `openspec/config.yaml`. A change landed on `origin/main` in the gap would have been missed.
   - **Fix, applied,** in step 1: `git fetch origin main` first, and read what steps 1 and 2 check at
     `origin/main`, not in the checkout. Step 2's new briefing read uses the same form.

3. **The tracker bracket's commands are not named.** The opening paragraph points at `CLAUDE.md`
   § The task store, which says to pull and push but names no command. The session read
   `.claude/skills/bead/SKILL.md` to learn them. The `bead` skill's review made the same fix for the
   same cost (`docs/prompt-reviews/bead.2026-09-23.md` § Review of 2026-09-23, its finding 5).
   - **Fix, proposed, not applied:** in the opening paragraph, extend the bracket sentence with
     "pull before the first write (`bd dolt pull`), push after the last (`bd dolt push`), and report
     a rejected push rather than forcing it", as the `bead` skill words it.
   - The permission classifier refused this edit ("Modify Shared Resources"), and it was not retried
     (`CLAUDE.md` § Guards). It is the maintainer's to apply.

4. **Step 7 checks the specs but not the citations the proposal carries.** The proposal cites three
   sections by `<file>.md § <Heading>`. Step 7 runs only `npm run openspec:check`, so a broken pointer
   would first be refused at push, stages later. The session ran `npm run citations:check` unprompted.
   Run for this review on a tree holding the proposal, it passed and printed a two-line summary.
   - **Fix, proposed, not applied:** in step 7, after the `openspec:check` bullet, add "Run
     `npm run citations:check`. Every `<file>.md § <Heading>` in the proposal and the specs must
     resolve, and without this run a broken one is first refused at push, stages later."
   - The permission classifier refused this edit too, for the same reason, and it was not retried.

### Corrections to the run's own analysis

- **The briefing the worktree got was stale, even though the cut was not.** The analysis says the
  stale `main` "made no difference here". It did make one. The rendered `.worktree/CONTEXT.md` says
  "The trunk-based model in the project instructions describes how the *team* reaches `main`". That
  is the template at `053e51c`; `b5d087e` replaced the sentence on `origin/main`
  (`git diff 053e51c ac307b6 -- .claude/worktree-CONTEXT.md.tmpl`). The branch was cut at `ac307b6`,
  and the briefing says so in its first lines.
  - The cause is outside the skill. `scripts/new-worktree.sh` runs the renderer from the primary
    checkout's path, and `scripts/render-worktree-context.mjs` reads the template relative to its own
    location (its `ROOT` and `TEMPLATE` constants). The template is therefore the checkout's working
    copy, not the commit the worktree was cut from.
  - The port paragraphs are the same in both versions, so finding 1 stands.
  - No issue carries this: `bd list --all --desc-contains "render-worktree-context"` returns
    `asdlc-openspec-5pf` and `asdlc-openspec-pb2`, and neither is about it. Finding 2's fix reads the
    template at `origin/main`, which avoids the stale copy for the question in step 2.
- **The seed's title is not wrong.** The analysis says `bd list` shows a title that does not name
  the change. The title is "Smoke-test the change-* lifecycle end to end on one small real change".
  That is what the epic is for, and the calculator is that small real change. Only the description's
  "A candidate:" sentence names something else, and the session's dated note records what replaced it.
  The epic's spec id and `change` metadata both name the change (`bd show asdlc-openspec-zgh`).

### Deliberately not changed

- **What a seed's title and description become (analysis item 1).** The session added a dated note
  and left the title alone, which was right (see the correction above). Later stages find the epic by
  its `change` metadata, not by title. One run's good judgement is no evidence for a rule; the `bead`
  skill's reviews declined rules on the same ground (`docs/prompt-reviews/bead.2026-09-23.md`
  § Second review of 2026-09-23, *Deliberately not changed*). Revisit if a seed's title ever
  contradicts its change.
- **A pointer for discovered issues (analysis item 6).** `docs/decisions.md` § D-02, item 3, states
  the rule, and `.claude/skills/change-build/SKILL.md` § 5. What the build turns up spells the
  command. The session filed `asdlc-openspec-5pf` correctly without a line here.
- **Impact prompts (analysis item 7).** A reversed stance is covered by finding 1's fix wherever the
  briefing names the stance. A decision that binds the repository beyond one change is already
  routed to the register by `.claude/skills/change-design/SKILL.md`. The gates and `check:jobs`
  declarations are for the design and the plan to settle. The session named all of them unprompted.
- **Status nudges during silent stretches (analysis item 8).** Harness behaviour, not the skill's.
  The `bead` skill's third review recorded the same thing under *Narration*.
- **The briefing template, the renderer and `docs/prompt-reviews/README.md`.** This review writes
  only the skill and this file, and files nothing: the session that asked for it makes every tracker
  write. That includes the stale-template defect named in the corrections. The README has no table of
  its files, though `CLAUDE.md` § Every directory and document says what it is, and who wins asks for
  one, so no row was added for this file.

### What this review could not verify

- No transcript was available. These rest on the analysis alone: that the name, seed and run mode
  were asked in one question; that the template was read before the cut; that the `bead` skill was
  read to find the bracket commands; that `npm run openspec:check` passed on its first run; and the
  harness's requests for status.
- Whether the tracker writes were pushed. `bd show` shows the note and the new issue locally.
- The review agent was isolated in its own worktree, `agent/agent-aa5505cbddf995eee`, at `ac307b6`,
  and its edits to the session's worktree were refused. It made its edits in its own worktree. It
  checked the three proposal files out there, uncommitted, only so that the gates ran on the same
  tree as the session's. Neither `aa7f050` nor this worktree changes any other file the gates read
  (`git diff --quiet ac307b6 aa7f050 -- .claude docs`).
- Whether the permission classifier would refuse findings 3 and 4's edits in the session's own
  worktree.
