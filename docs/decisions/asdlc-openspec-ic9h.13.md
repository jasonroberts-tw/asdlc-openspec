# asdlc-openspec-ic9h.13 · The prompt review authenticates to Anthropic with an API key held as a secret of its environment, in place of workload identity federation

**Recorded 2026-10-10**, carried by `asdlc-openspec-ic9h.13`, a child of `asdlc-openspec-ic9h`. The
maintainer chose it on 2026-10-09, in conversation, while `asdlc-openspec-ic9h.4` was being worked.
The session chose the words, the secret's name, the spend limit and the issue that holds the later
move to federation.

**Builds on / amends:** amends asdlc-openspec-ic9h, whose item 2 chose federation and whose item 3
grants the job `id-token: write`, and D-07, under which the amendment by asdlc-openspec-ic9h says
the loss of a stored API key stands since none is stored. Builds on D-37, under which
`.github/workflows/pr-review.yml` still runs no model and reads no secret.

**Decision.**

1. **The job of `.github/workflows/prompt-review.yml` authenticates to Anthropic with an API key.**
   - The key is a secret of the `prompt-review` environment, `ANTHROPIC_API_KEY`. Only `main`
     deploys to that environment.
   - It reaches the model's step alone, as the `anthropic_api_key` input of
     `anthropics/claude-code-action` (the action's `action.yml` on its default branch, read
     2026-10-09).
   - The key is made for this workflow alone, so that it can be revoked apart from any other. It sits
     in a workspace whose spend limit bounds what a leaked key could spend.
2. **The job grants no `id-token: write`**, since nothing in it exchanges a GitHub OIDC token. Its
   one grant is `contents: read`.
3. **No federation rule, service account or federation id is made**, and the job reads none.
4. **Federation stays the later move**, which `asdlc-openspec-u36b` holds.

**Why.** The maintainer, 2026-10-09: "I want update the plan for how the prompt-review github action
environment runs. Right now it calls for federated identity. I want to start with using an API key
stored as a github environment secret instead."

A key and one secret are the whole setup. Federation needs more before a first run can test anything:

- a service account;
- a rule whose subject is the environment's OIDC subject exactly;
- four ids as secrets, the four `ANTHROPIC_*` secrets D-07's What changed names.

A rule with a wrong subject shows only as a failed exchange in the Console's authentication history
(D-07's What changed). The rule and the account of D-07 were deleted under `asdlc-openspec-wft3`, so
federation would start from nothing.

No gate refuses the key. D-07 had `pr-review:check` refuse a stored key. Since D-37 that check
refuses a secret in `pr-review.yml` alone (D-37 item 2), and in any other workflow only a read of the
App's key (asdlc-openspec-ic9h, item 3).

The alternative that lost:

- **Workload identity federation**, as asdlc-openspec-ic9h's item 2 chose. No key is stored, and the
  short-lived token goes only to a job whose OIDC subject the rule accepts. But a person must make
  the service account and the rule, and match its subject to the environment's, before the first
  run.

Where it loses:

- **The key never expires.** Anyone could spend the workspace's credit, up to its spend limit, until
  a person revokes it, once a step printed the key or an action read it. The same holds once a text led the model to
  print its environment. A federated token would have lapsed within its short life (D-07 item 6).
  The run log is public.
- **The model's step holds a key that lasts**, as it holds `TYPESAFE_API_KEY` (asdlc-openspec-ic9h's
  loss).
- **Nothing in the gates refuses a second workflow that names the environment.** Such a workflow,
  run on `main`, would read the key. `pr-review:check` refuses a second reader of the App's key, and
  nothing does the same for this one. `.github/**` is on the high-risk floor, so such a workflow
  waits for a person.
- **The key is rotated by hand**, where federation needs no rotation.

**What changed.**

- **`docs/decisions/`:** this record, and the amendment at the end of
  `docs/decisions/asdlc-openspec-ic9h.md`.
- **`docs/decisions.md`:** the amendment under D-07.
- **`tools/policy/pr-review.json`:** `prReviewAppKeyEnvironmentMeans` no longer says a run on another
  ref gets the environment's "federation subject".
- **Outside this tree, in the tracker:** `asdlc-openspec-ic9h`, `.6`, `.9` and `.11` rewritten, each
  with a dated section naming what was dropped, and `asdlc-openspec-u36b` filed.

**Figures.**

- Four federation ids, each a secret: the four `ANTHROPIC_*` secrets the What changed of
  `docs/decisions.md` § D-07 names, which
  `git grep -n -o -E 'ANTHROPIC_(FEDERATION_RULE|ORGANIZATION|SERVICE_ACCOUNT|WORKSPACE)_ID' 6a629b0 -- docs/decisions.md`
  prints, one line each.
