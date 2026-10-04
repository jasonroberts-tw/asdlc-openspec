# `apps/calculator/test/independent/verify/`

**The test-builder's tests of the calculator that run at Verify: its E2E tests and every fitness
function whose execution environment is not `build`, each under the directory of its layer.**
`docs/test-strategy.md` § Build exit criteria has them generated before Build exits and executed at
Verify, so no push and no CI step runs them. `mise run calculator:test:verify` runs every test file
here, and passes, saying so, while there is none; change-verify's fresh run,
`scripts/fresh-run.mjs`, runs it in a clone of HEAD, and no push or CI step does. The trace and
test-inventory gates still read them, through that script's `--dir`
(`scripts/lib/test-dirs.mjs`); the thresholds gate reads that `--dir` to leave them out of its
coverage and mutation runs (the header of `scripts/check-thresholds.mjs`).

Where a row here and a test file disagree, the file wins and the row is corrected.

| Path | What it holds |
|---|---|
| `README.md` | This file. No test is here yet; a change that adds one adds its row. |
