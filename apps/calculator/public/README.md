# `apps/calculator/public/`

**The files the calculator's browser page loads, exactly as committed: no build step stands between
this directory and the browser.** A script here is a plain ES module the browser imports as written,
and the logic touches no DOM, so the tests under `../test/` import the same file in Node.

Each file's opening comment is the authority on it. Where a row here and a file disagree, the file
wins and the row is corrected.

| File | What it is |
|---|---|
| `calculator.js` | The logic: `initialState()`, `press(state, key)` and `displayText(state)`, a pure state machine from key presses to the text the display shows, with no DOM and no I/O. `press` never changes the state it is given, and a key outside the keypad's own is a thrown `RangeError`, not a silent no-op. |
