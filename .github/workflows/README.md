# `.github/workflows/`

**The GitHub Actions workflows: the slowest tier of the gate ladder, and the pull-request reviewer
that merges what passes it.** Each file's header is the authority on it. Where a row here and a
header disagree, the header wins and the row is corrected.

| File | What it is, or what it refuses |
|---|---|
| `verify.yml` | Every gate that reads only committed files, cheapest first. It runs on every pull request, every push to `main`, and every merge the reviewer makes, which dispatches it because a merge made with a workflow token starts no push run. It trusts none of the faster tiers (`CLAUDE.md` § The gate ladder). |
| `pr-review.yml` | The pull-request reviewer, one pull request at a time (`docs/decisions.md` § D-07). Claude Code, as `.claude/agents/pr-reviewer.md`, reviews a head that passed `verify` against the acceptance criteria of the issues its title cites, and judges maintainability and risk. `scripts/pr-review.mjs` turns the verdict into a status, a label and, when every dimension passes and the risk is not high, a rebase merge. It reads a token and a language model, so it is no tier of the ladder: `pr-review:check` and `pr-review:selftest` hold its wiring and its decisions, at push and in `verify.yml`. |
