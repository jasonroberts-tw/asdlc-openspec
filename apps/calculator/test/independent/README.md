# `apps/calculator/test/independent/`

**The calculator's contract, fitness and E2E tests, which the build workflow's test-builder writes
from the specs, the design and the Binding Surface alone, and which the app-builder never reads, runs
or changes.** Each sits under the directory of the stage it runs at, `build` or `verify`, then of its
layer, one of `independentLayers` in `tools/policy.json`, under the path `independentTestDir` gives;
its name and `// trace:` metadata follow the convention whose one home is the header of
`scripts/test-trace.mjs`. The mechanics are the header of `.claude/workflows/build-change-task.js`.

Where a row here and a test file disagree, the file wins and the row is corrected; where a test and
the spec disagree, the spec wins and the test is rewritten by the test-builder.

| Path | What it holds |
|---|---|
| `README.md` | This file. No test is here yet: the calculator has no contract artifact under `apps/calculator/contracts/` and no NFR (`apps/calculator/binding-surface.md` § 1. Contract artifacts and § 2. Module boundaries and dependency rules), so no task of it has had a contract or fitness test to write. |
| `build/` | The tests that run at Build, contract tests and build-time fitness functions, which `npm run calculator:test:independent` runs at each push and in CI; `build/README.md` has one row per file. |
| `verify/` | The tests that run at Verify, E2E tests and Verify-deferred fitness functions, which `npm run calculator:test:verify` runs; `verify/README.md` has one row per file. |
