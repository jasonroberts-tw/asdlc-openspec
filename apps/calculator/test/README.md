# `apps/calculator/test/`

**The calculator's tests: each `describe` is a requirement's name and each `test` a scenario's
name, verbatim from the spec, so a scenario traces to the test that proves it by exact string,
except one suite in `page.test.js` whose name says it is not a spec scenario.**
`npm run calculator:test` runs every file here whose name ends in `.test.js`, with Node's own test
runner and no framework; a file named otherwise is not run.

Where a row here and a test file disagree, the file wins and the row is corrected; where a test and
the spec disagree, the spec wins and the test is corrected.

| File | What it proves |
|---|---|
| `calculator.test.js` | The arithmetic scenarios of capability `calculator`: number entry, the four operations, chaining left to right, equals, clear, division by zero and overflow, and rounding for display. Each presses the scenario's buttons through `press()` and asserts what `displayText()` shows at every THEN and AND, against the spec's literal values. |
| `page.test.js` | The page scenarios of capability `calculator`: keypad and display, the names assistive technology reads, and keyboard input. Each test builds a fresh DOM with jsdom from the committed `public/index.html`, calls `mount()` on it, and clicks buttons or dispatches `keydown` events. An exception a listener throws fails the test. A last suite, named as not a spec scenario, holds wiring the spec states without a scenario of its own: a chain clicked through every button, and a key typed with AltGr. The scenario 'Space presses the focused button' is a browser's own behaviour, which jsdom does not implement, so it is checked by hand in a real browser. |
