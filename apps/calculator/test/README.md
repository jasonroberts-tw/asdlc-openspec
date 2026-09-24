# `apps/calculator/test/`

**The calculator's tests: each `describe` is a requirement's name and each `test` a scenario's
name, verbatim from the spec, so a scenario traces to the test that proves it by exact string.**
`npm run calculator:test` runs every file here whose name ends in `.test.js`, with Node's own test
runner and no framework; a file named otherwise is not run.

Where a row here and a test file disagree, the file wins and the row is corrected; where a test and
the spec disagree, the spec wins and the test is corrected.

| File | What it proves |
|---|---|
| `calculator.test.js` | The arithmetic scenarios of capability `calculator`: number entry, the four operations, chaining left to right, equals, clear, division by zero and overflow, and rounding for display. Each presses the scenario's buttons through `press()` and asserts what `displayText()` shows at every THEN and AND, against the spec's literal values. |
