# The calculator's Binding Surface

**What a test of the calculator may depend on, and what its code must keep: the seven items
`docs/test-strategy.md` § Binding Surface lists, each as the app stands, or stated as absent where
the app has none.** A test that depends on anything this file does not declare is a test defect.

The living specs under `openspec/specs/` and the register win over this file, and this file wins
over the code, the tests and the other files under `apps/calculator/`: where one of them does not do
what an item says, that one is corrected. A change to an item edits this file in the same pull
request, a product change in its design (`.claude/skills/change-design/SKILL.md` § 3. Write it).

## 1. Contract artifacts

None. `apps/calculator/contracts/` does not exist, and no machine-readable contract states what the
server answers: capability `calculator-local-server`'s scenarios do, `CLS-001` and `CLS-007` to
`CLS-012` among them. The first contract a change writes goes there.

## 2. Module boundaries and dependency rules

Paths are relative to `apps/calculator/`.

| Module | What it imports | What it exports |
|---|---|---|
| `public/calculator.js` | nothing | `initialState`, `press`, `displayText` |
| `public/app.js` | `./calculator.js` | `mount` |
| `public/main.js` | `./app.js` | nothing: it calls `mount(document)` |
| `server.js` | Node's built-in modules (`node:*`) | `createCalculatorServer` |
| `serve.js` | Node's built-in modules (`node:*`) and `./server.js` | `parsePort`, `listenOnLoopback`, `listenRefusal` |

- `public/calculator.js` touches no DOM and does no I/O, so the same file runs in the browser and
  under Node.
- `public/app.js` works on the document it is given, and never on the global one.
- A file under `public/` imports only files in `public/`, by a relative path, and the page loads
  nothing from another origin. The test of `CLS-012` in `test/server.test.js` holds this.
- The app has no runtime dependency: `package.json` has `devDependencies` and no `dependencies`, and
  `jsdom`, among them, is imported by the tests alone.

No fitness function checks these rules, because the calculator has no NFR:
`git grep -n "NFR-" -- openspec/specs` finds none. Apart from `CLS-012`, only review holds them.

## 3. Entry points and start commands

- **The server, as a process:** `npm run calculator:serve`, which runs
  `node apps/calculator/serve.js`. `serve.js` runs its command only when `node` runs the file
  itself, so a test can import it.
- **The page:** `GET /` answers `public/index.html`, which links `style.css` and loads `main.js`,
  and `main.js` calls `mount(document)`.
- **In process, what the tests call:**
  - `createCalculatorServer(publicDir)`: a Node HTTP server over `publicDir` that is not yet
    listening; its caller listens.
  - `parsePort(value)`, `listenOnLoopback(server, port)` and `listenRefusal(error, port)`, from
    `serve.js`.
  - `mount(doc)`, on a document holding `#display` and `#keypad`. It throws, naming the id, when
    either is missing.
  - `initialState()`, `press(state, key)` and `displayText(state)`. `press` takes the keys `0` to
    `9`, `.`, `+`, `-`, `*`, `/`, `=` and `C`, returns a new state without changing the one it is
    given, and throws a `RangeError` on any other key.
- **The page's markup a test reaches:** one `<output id="display">` with `aria-live="polite"`, and
  in `#keypad` one `<button type="button">` per key, with its key in `data-key` and, on every button
  that is not a digit, an `aria-label`. Keyboard input is a `keydown` on the document; the keys it
  acts on are `0` to `9`, `.`, `+`, `-`, `*`, `/`, `=`, `Enter` and `Escape`.
- **The tests:** `npm run calculator:test`, which runs `scripts/run-tests.mjs` over
  `apps/calculator/test/*.test.js`.

## 4. Configuration keys, environment variables and ports

- **`PORT`**, read by `serve.js` alone: the port to listen on, a whole number written in digits,
  from `1` to `65535`. Unset, it is `8080`, whose one home is `DEFAULT_PORT` in `serve.js`. Any
  other value is refused in one line on stderr, with status 1.
- **The host** is `127.0.0.1`, fixed as `HOST` in `serve.js`. No variable changes it.
- **Nothing else.** There is no configuration file and no other environment variable. The
  worktree's `.worktree/ports.env` is not read: a person passes its `APP_PORT` as `PORT`.
- **A test's port.** `createCalculatorServer` never listens, so a test listens on port `0` of
  `127.0.0.1` and takes the port it is given. A test of `serve.js` finds a free port the same way
  and passes it as `PORT`, unless its scenario names a port or leaves `PORT` unset.

## 5. Readiness and health signals

- **No health endpoint.**
- **Ready:** `serve.js` prints one line on stdout,
  `Calculator running at http://127.0.0.1:<port>/ (Ctrl-C to stop)`, once the server is listening
  and its signal handlers are set. It prints nothing on stdout before that line.
- **Refused:** one line on stderr, status 1, and nothing on stdout.
- **Stopped:** `SIGINT` or `SIGTERM` closes the server and every connection, then exits with status
  0. A second signal while it closes exits with status 0 at once.
- **In process:** `listenOnLoopback` resolves with the bound port once the server is listening, and
  rejects with the listen error.
- **The page:** `mount` shows what `displayText` gives for a fresh state, `0`, before it returns.

## 6. The test data seeding interface

None. The calculator stores nothing: no database, no file it writes, and no state kept between
requests or between page loads. A test builds its own starting state:

- **the logic's:** `initialState()`, then the keys the test presses;
- **the page's:** a fresh DOM built from `public/index.html`, with `mount` called on its document;
- **the server's:** the `publicDir` the test passes to `createCalculatorServer`, whose flat listing
  is read once, when the server is created, and whose files are read on every request.

## 7. Injection points for clock, randomness and ID generation

None, because nothing needs one: the calculator's code reads no clock, draws no random number,
generates no ID and sets no timer.
`git grep -n -E "Date|Math.random|crypto|randomUUID|setTimeout|setInterval|performance.now|process.hrtime" -- apps/calculator/public apps/calculator/server.js apps/calculator/serve.js`
finds nothing. Its one behaviour in time is Node's own: a request whose headers do not arrive in
time gets Node's `408`, at Node's default timeouts, which the calculator neither sets nor exposes.
