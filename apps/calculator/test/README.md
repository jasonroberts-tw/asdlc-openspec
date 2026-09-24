# `apps/calculator/test/`

**The calculator's tests: each `describe` is a requirement's name and each `test` a scenario's
name, verbatim from the spec, so a scenario traces to the test that proves it by exact string,
except the last suite in `page.test.js` and in `server.test.js`, whose name says it is not a spec
scenario.**
`npm run calculator:test` runs every file here whose name ends in `.test.js`, with Node's own test
runner and no framework; a file named otherwise is not run.

Where a row here and a test file disagree, the file wins and the row is corrected; where a test and
the spec disagree, the spec wins and the test is corrected.

| File | What it proves |
|---|---|
| `calculator.test.js` | The arithmetic scenarios of capability `calculator`: number entry, the four operations, chaining left to right, equals, clear, division by zero and overflow, and rounding for display. Each presses the scenario's buttons through `press()` and asserts what `displayText()` shows at every THEN and AND, against the spec's literal values. |
| `page.test.js` | The page scenarios of capability `calculator`: keypad and display, the names assistive technology reads, and keyboard input. Each test builds a fresh DOM with jsdom from the committed `public/index.html`, calls `mount()` on it, and clicks buttons or dispatches `keydown` events. An exception a listener throws fails the test. A last suite, named as not a spec scenario, holds wiring the spec states without a scenario of its own: a chain clicked through every button, and a key typed with AltGr. The scenario 'Space presses the focused button' is a browser's own behaviour, which jsdom does not implement, so it is checked by hand in a real browser. |
| `server.test.js` | The request scenarios of capability `calculator-local-server`: content types, an unknown path, a path outside the calculator, a method other than GET, the page's policy, and everything the page references served locally. `createCalculatorServer` runs in-process over the committed `public/` on a free port of `127.0.0.1`, and every request but CONNECT goes through `http.request` with an explicit path, so `/../package.json` and `/%2e%2e/package.json` reach the server as written, which the test also checks. The traversal test adds three paths that climb from `public/` to the repository root, since the spec's two, resolved under `public/`, name `apps/calculator/package.json`, which does not exist. The page's references are walked from `index.html` through each script's static imports and compared with the list read off the page by hand, so a walk that misses one fails. A last suite, named as not a spec scenario, holds what the design says of every response, and the methods other than POST that the spec refuses: the policy, a type and a length on every status, `Allow: GET`, CONNECT refused like any other method (sent over a raw socket, since Node hands it past the request handler) and its connection closed, so a client that keeps its side open cannot keep a stopped server open, a query ignored, a path matched exactly, a vanished file `404`, including one replaced by a directory or whose directory was replaced by a file, and no symbolic link followed. |
