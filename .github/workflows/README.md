# `.github/workflows/`

**The GitHub Actions workflows: the slowest tier of the gate ladder, and the pull-request reviewer
that merges what passes it.** Each file's header is the authority on it. Where a row here and a
header disagree, the header wins and the row is corrected.

| File | What it is, or what it refuses |
|---|---|
| `verify.yml` | Every gate that reads only committed files, cheapest first. It runs on every pull request, every push to `main`, and every merge the reviewer makes, which dispatches it because a merge made with a workflow token starts no push run. It trusts none of the faster tiers (`CLAUDE.md` § The gate ladder). It checks out the whole history, which `trace:check` walks, and installs the toolchain `mise.toml` pins through `jdx/mise-action`, locked (`docs/decisions.md` § D-31). |
| `pr-review.yml` | The pull-request reviewer, one pull request at a time (`docs/decisions.md` § D-07 and § D-37). For a head that passed `verify`, `scripts/pr-review.mjs` decides by the high-risk floor alone: off it, a rebase merge; on it, a person. A read-only job computes each changed file's reach and co-change partners, which the verdict prints and decides nothing by. No language model and no secret takes part, and the job that merges installs no package. Each job takes its tools from `mise.toml` through `jdx/mise-action`. It reads a token and the network, so it is no tier of the ladder: `pr-review:check` and `pr-review:selftest` hold its wiring and its decisions, at push and in `verify.yml`. |
