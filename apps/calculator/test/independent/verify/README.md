# `apps/calculator/test/independent/verify/`

**The test-builder's tests of the calculator that run at Verify: its E2E tests and every fitness
function whose execution environment is not `build`, each under the directory of its layer.**
`docs/test-strategy.md` § Build exit criteria has them generated before Build exits and executed at
Verify, so no push and no CI step runs them. `npm run calculator:test:verify` runs every test file
here, and passes, saying so, while there is none. The trace, test-inventory and thresholds gates
still read them, through that script's `--dir` (`scripts/lib/test-dirs.mjs`).

Where a row here and a test file disagree, the file wins and the row is corrected.

| Path | What it holds |
|---|---|
| `README.md` | This file. No test is here yet; a change that adds one adds its row. |
