# asdlc-openspec-pu8m · A direct push of an open pull request's head to `main` passes the ruleset's pull request rule, so only its other rules refuse it

**Recorded 2026-10-08**, carried by `asdlc-openspec-pu8m`. On 2026-10-07 the maintainer chose to
record it, over adding a rule that refuses it and over leaving it unrecorded, each put with the case
where it loses. The session chose the words, and how the entry reads now that D-57 has changed the
ruleset the evidence was taken under.

**Builds on / amends:** amends R-02, whose risk says the ruleset refuses a direct push to `main` for
everyone, and D-51 item 7, whose ruleset's first rule is a pull request. Builds on D-57, which
changed that ruleset after the evidence was taken.

**Decision.**

1. **GitHub counts a commit already submitted in a pull request as meeting ruleset 24542312's pull
   request rule.** So a direct push of an open pull request's head to `main` is refused by the
   ruleset's other rules alone. On 2026-10-06 the agents' App ran `git push origin HEAD:main` with
   #167's head, `06a1535`. Rule suite 4390232975 recorded `pull_request` as passed and
   `required_status_checks` as failed, on `pr-review`, and that failure alone refused the push.
2. **It is recorded, not refused.** Such a head is one GitHub's auto-merge would merge anyway once
   its checks pass, so the push skips no check the floor holds.
3. **Under D-57's ruleset it is untried.** Since 2026-10-08 the ruleset requires one approving
   review beside `verify`. Nobody has tried whether GitHub counts a pull request's approval toward a
   direct push of its head, as it counted the pull request, since `CLAUDE.md` § Git workflow forbids
   an agent a push to `main`. Until a person shows otherwise, take it that a head that is approved
   and passed `verify` can land by a direct push.

**Why.** The register said that a direct push is refused for everyone (R-02's risk, and D-51 item 7's
pull request rule), and the probe found otherwise. The register wins over every document, so the next
person to plan on that sentence plans on what GitHub does not do. The alternatives lost:

- **A rule that refuses it**, such as restricting who may update the branch, if a personal
  repository's ruleset offers one, which nobody checked. A rule that refuses every push but a merge
  may also refuse auto-merge's own merge, which would then need a bypass, and D-57 left the ruleset
  with none.
- **Leaving it unrecorded.** The register would keep saying that a direct push is refused for
  everyone.

Where it loses:

- **Such a head lands by a push that no `open-pr` step makes.** It skips auto-merge's rebase, so the
  commit lands as it was pushed. Ruleset 23890833 still refuses a non-fast-forward push (R-02's
  Figures), so only a head already on top of `main` lands this way.
- **The approval rule's effect on such a push is assumed, not shown** (item 3). If GitHub refuses a
  head with no approval, a head on the floor stays refused until a person approves it. If it does
  not, the route is wider than this entry records.

**What changed.**

- **`docs/decisions.md`:** the amendments under D-51 and R-02.
- **`docs/decisions/`:** this record.

**Figures.**

- Rule suite 4390232975, at 16:29:07Z on 2026-10-06, for `076f9db..06a1535`: `asdlc-openspec-owva`'s
  note of 2026-10-06, which quotes the maintainer's terminal and the rule suite GitHub recorded.
  `gh api repos/jasonroberts-tw/asdlc-openspec/rulesets/rule-suites/4390232975` answered 404 to this
  session's account on 2026-10-08, so this entry did not re-read it.
