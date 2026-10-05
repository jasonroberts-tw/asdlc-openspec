# `.github/workflows/`

**The GitHub Actions workflows: the slowest tier of the gate ladder, and the pull-request reviewer
that merges what passes it.** Each file's header is the authority on it. Where a row here and a
header disagree, the header wins and the row is corrected.

| File | What it is, or what it refuses |
|---|---|
| `verify.yml` | Every gate that reads only committed files, cheapest first. It runs on every pull request, every push to `main`, and every merge the reviewer makes, which dispatches it because a merge made with a workflow token starts no push run. It trusts none of the faster tiers (`CLAUDE.md` § The gate ladder). It checks out the whole history, which `trace:check` walks, and installs the toolchain `mise.toml` pins through `jdx/mise-action`, locked (`docs/decisions.md` § D-31). |
| `pr-review.yml` | The pull-request reviewer, one pull request at a time (`docs/decisions.md` § D-07, § D-37 and § D-46). For a head that passed `verify`, `scripts/pr-review.mjs` decides by the high-risk floor alone: off it, a rebase merge; on it, a person. Its one job runs `next`, then `act`; it computes no reach or co-change, which the branch review's brief carries. No language model and no secret takes part, and the job installs no npm package and decides a merge by the floor it recomputes, never by a comment. It takes from `mise.toml`, through `jdx/mise-action`, only the tools it runs: Node and gh. It reads a token and the network, so it is no tier of the ladder: `pr-review:check` and `pr-review:selftest` hold its wiring and its decisions, at push and in `verify.yml`. |
