# `apps/calculator/test/independent/build/`

**The test-builder's tests of the calculator that run at Build: its contract tests and the fitness
functions whose execution environment is `build`, each under the directory of its layer.** The
build workflow writes a file here only at a layer `architectRunLayers` in `tools/policy.json` lists
and declared to run at build, and stops a run that puts any other here (the header of
`.claude/workflows/build-change-task.js`). `npm run calculator:test:independent` runs every test
file here, at each push and in CI, and passes, saying so, while there is none.

Where a row here and a test file disagree, the file wins and the row is corrected.

| Path | What it holds |
|---|---|
| `README.md` | This file. No test is here yet; a change that adds one adds its row. |
