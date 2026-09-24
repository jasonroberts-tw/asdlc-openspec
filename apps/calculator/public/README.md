# `apps/calculator/public/`

**The files the calculator's browser page loads, exactly as committed: no build step stands between
this directory and the browser.** A script here is a plain ES module the browser imports as written.
The logic touches no DOM, so the tests under `../test/` import the same file in Node. The page's
wiring takes the document it works on as an argument, so the tests mount it on a DOM that jsdom
builds from `index.html`.

The page's policy refuses inline scripts, inline style attributes and `data:` URLs, so every script
and every style here is a file of its own. The server, `../server.js`, serves only the `.html`,
`.css` and `.js` files that sit directly in this directory. So this README is never served, a file
of another kind answers `404` until the server learns its type, and a file in a subdirectory
answers `404` because the server does not look in one.

Each file's opening comment is the authority on it. Where a row here and a file disagree, the file
wins and the row is corrected.

| File | What it is |
|---|---|
| `index.html` | The page: the display, an `<output>` with `aria-live="polite"`, and the keypad, one `<button type="button">` per key with the key in `data-key` and an `aria-label` on every button that is not a digit. It holds no inline script or style; it links `style.css` and loads `main.js`. |
| `style.css` | All the page's styling: a four-column grid keypad, a display that wraps a long number and then scrolls, and a visible focus ring. Nothing is loaded from another origin. |
| `main.js` | The entry module the page loads: it imports `mount` and calls it on `document`, and does nothing else. It exists because the policy forbids an inline script. |
| `app.js` | `mount(doc)`: wires the keypad's clicks, through one delegated listener, and the keyboard, through one `keydown` listener on `doc`, to `press()`, and shows `displayText()` in the display after every key. A keyboard key it does not map, or one held with Ctrl, Meta or Alt, never reaches `press()`. |
| `calculator.js` | The logic: `initialState()`, `press(state, key)` and `displayText(state)`, a pure state machine from key presses to the text the display shows, with no DOM and no I/O. `press` never changes the state it is given, and a key outside the keypad's own is a thrown `RangeError`, not a silent no-op. |
