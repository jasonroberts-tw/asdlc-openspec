## Context

The repository holds no product code. It is a Node toolchain: gates under `scripts/`, emitters
under `tools/`, run by Node 22.18 or newer directly (`package.json` `engines`), with no bundler, no
`tsconfig.json` and no test framework. This change adds the first product, the first code that runs
in a browser, and the first process that listens on a port.

These constraints bind the design:

- **No build step, no deployment.** The delta spec for `calculator-local-server` requires that the
  server "SHALL need no build step, no deployment, no account and no network access". So the browser
  runs the committed files exactly as written.
- **`Content-Security-Policy: default-src 'self'`** is sent with the page (same spec). It blocks
  inline scripts, inline style attributes and `data:` URLs. Every script and style is therefore a
  file of its own.
- **The gate ladder** (`CLAUDE.md` § The gate ladder). A check that reads only committed files is a
  pre-push job and a `.github/workflows/verify.yml` step. `scripts/check-jobs.mjs` refuses a script
  that no job runs unless it is declared by kind, with its reason.
- **One change, one pull request** (`docs/decisions.md` § D-02). The app, its tests, its gate
  wiring, the register entry and the amended worktree briefing land together.
- **The accepted register entry.** On 2026-09-23 the maintainer accepted a new register entry,
  written in this change as `docs/decisions.md` § D-04. It says: `apps/calculator/` is a demo product that listens on
  `127.0.0.1` only, and only when a person starts it. A test that starts that server from committed
  files and talks to it over a temporary loopback port reads only committed files, so it is a
  pre-push job and a CI step. The worktree briefing's "Nothing in this repository serves a port"
  paragraph is amended to match.

## Goals / Non-Goals

**Goals**

- Every scenario in both delta specs is proved by a test that runs in `npm run gates` and in CI.
- The calculation logic is testable in Node without a browser, and the page adds only wiring.
- The server cannot be made to serve a file outside the calculator's `public/` directory, by
  construction rather than by path sanitising.
- No runtime dependency. At most one new devDependency.

**Non-Goals**

- Operator precedence, memory keys, percent, sign change, history, or a digit limit on entry. The
  accepted spec has none of them.
- A bundler, TypeScript for the app, a service worker, or offline caching.
- Container, port-forwarding or deployment configuration. The dev container is untouched; VS Code
  forwards a loopback port from a container on its own.
- Tests in a real browser in CI. A real-browser check is a one-time manual step in `change-verify`
  (see Risks).
- Reading `.worktree/ports.env`. The spec names `PORT` and a default of `8080`, and nothing else.
  How the banner of that file should read is `asdlc-openspec-5pf`.

## Decisions

### 1. Layout: `apps/calculator/`, with the served files in `public/`

```text
apps/calculator/
  README.md          thesis and one row per file (CLAUDE.md § Every directory and document says what it is, and who wins)
  serve.js           the CLI that `npm run calculator:serve` runs: PORT, listen, print, signals
  server.js          createCalculatorServer(publicDir): the request handler over an allowlist
  public/
    README.md        never served: the allowlist admits only .html, .css and .js
    index.html       the page: display and keypad markup, no inline script or style
    style.css
    main.js          entry module: imports mount() and calls it on document
    app.js           mount(doc): wires buttons, keyboard and display to the logic
    calculator.js    pure logic: no DOM, no I/O
  test/
    README.md
    calculator.test.js   the calculator scenarios, driven through the pure logic
    page.test.js         keypad, display, names for assistive technology, keyboard: a DOM in Node
    server.test.js       the request scenarios: in-process HTTP against server.js
    serve.test.js        the command's scenarios: PORT, loopback, refusals and signals, spawned
```

`apps/` rather than a top-level `calculator/` or `demo/`: the directory names what kind of thing it
holds, and a second demo product would sit beside this one without a move. `README.md` § How it is
laid out gains a row for `apps/`. `public/` and `test/` each hold more than one file of one kind, so
each has its own `README.md`.

*Lost:* tests beside the source in `public/`. They would be `.js` files inside the served directory,
and the allowlist would serve them.

### 2. Plain JavaScript ES modules everywhere in the app

The browser cannot run TypeScript without a build step, and the spec forbids one. Node runs `.js`
as an ES module here because `package.json` has `"type": "module"`. So one set of files serves the
browser, the server and the tests. Types, where they help, are JSDoc comments.

*Lost:* TypeScript for the server and tests with JavaScript for the page, which puts two languages
in one small app for no gain. Also TypeScript with a bundler, which the spec forbids.

### 3. The logic is a pure state machine in `public/calculator.js`

It exports `initialState()`, `press(state, key)` returning a new state, and `displayText(state)`.
A key is one of `0`–`9`, `.`, `+`, `-`, `*`, `/`, `=` and `C`. The state is:

| Field | Meaning |
|---|---|
| `entry` | the number being typed, as a string (so `1.50` and `0.` show as typed), or `null` when none is |
| `value` | the last completed number or result, and the left operand of `op`: an exact fraction, a `BigInt` numerator over a positive `BigInt` denominator, in lowest terms. A typed number is read into one exactly, whatever its length. A result is kept exact, and only the display rounds. |
| `op` | the pending operator, or `null` |
| `error` | `true` while `Error` is shown |

`displayText` returns `Error` when `error` is set, `entry` when a number is being typed, and
otherwise `value` formatted. The transitions:

| Key | When | Effect |
|---|---|---|
| digit | `error` | reset, then treat as below |
| digit | `entry` is `null` or `"0"` | `entry` = the digit |
| digit | otherwise | append to `entry` |
| `.` | `error` | reset, then treat as below |
| `.` | `entry` is `null` | `entry` = `"0."` |
| `.` | `entry` has a `.` | nothing |
| `.` | otherwise | append `.` |
| operator | `error` | nothing |
| operator | `entry` set, `op` set | `value` = `value` `op` `entry`, exactly, or `error`; `entry` = `null`; `op` = key |
| operator | `entry` set, no `op` | `value` = `entry`, read exactly, or `error` if it is too large to be finite; `entry` = `null`; `op` = key |
| operator | `entry` is `null` | `op` = key (replaces a pending operator, or continues from a result) |
| `=` | `error`, or no `op`, or `entry` is `null` | nothing |
| `=` | otherwise | `value` = `value` `op` `entry`, exactly, or `error`; `entry` = `null`; `op` = `null` |
| `C` | always | `initialState()` |

"Or `error`" covers three cases:

- a division by zero;
- a result too large to be finite: its magnitude, compared exactly, is more than the largest finite
  double, `(2^53 − 1) · 2^971`. That is how overflow sets `error`;
- a typed number too large to be finite (`1` followed by 309 zeros), on every row that takes one:
  an operator with or without a pending operation, and `=`.

**Every value is an exact fraction, and only the display rounds.** No arithmetic runs on binary
doubles, and no result is rounded before it is carried:

- **A typed number** is read from the entry's text: its digits with the point removed, over a power of
  ten, so `1.50` is `150/100`, that is `3/2`. No digit is lost, whatever the entry's length.
- **The four operations** work on fractions: `a/b + c/d = (ad + cb)/bd`, and `−` likewise;
  `(a/b) × (c/d) = ac/bd`; `(a/b) ÷ (c/d) = ad/bc`, refusing `c = 0`. Every result is reduced to
  lowest terms by the greatest common divisor, and its denominator kept positive, so a fraction is
  never `-0`.
- **Carrying.** The value carried into the next operation is the exact result. So `1 ÷ 3 × 3` is
  `(1/3) × 3 = 1`, although the display showed `0.3333333333` in between. The maintainer decided
  this on 2026-09-24.
- **Rounding for display**, once, to ten significant digits, a tie away from zero. The power of ten
  of the leading digit, `e`, comes from the digit counts of numerator and denominator, corrected by
  one exact comparison. The ten digits are `floor(|n| · 10^(9−e) / d)`, and the remainder decides
  the rounding: twice the remainder at or above the denominator rounds the magnitude up. A carry to
  `10^10` moves `e` up by one.

The consequences, each a scenario in the spec:
- `1.000001 − 1` shows `0.000001`, where binary arithmetic gives `9.999999999e-7`.
- `1e-150 + 1e-150` shows `2e-150`, with no limit on decimal places.
- `3.000000003 × 0.5` shows `1.500000002`: the tie goes away from zero.
- `1 + 0.0000000004999999999` shows `1`, rounded once from its exact value.
- `1 ÷ 3 × 3` shows `1`, since the carried value is exactly `1/3`.
- `17976931348` followed by 298 zeros, `× 1 =`, shows `1.797693135e+308`. The exact result is under
  the largest double, so it is a result and not an error. That its rounded display reads above the
  largest double is only text.

**Formatting works from the fraction.** The rounded digits and `e` pick the notation: exponent
notation (`1e+10`, `2e-7`, `-1.5e+21`) when `e` is 10 or more, or below −6; otherwise plain digits.
Trailing zeros after the decimal point are trimmed, the zeros of a whole number are kept, and zero
shows as `0`. A taken typed number, shown after an operator, is formatted the same way.

**Checked.** On 2026-09-24, before the code changed, a throwaway reference of this arithmetic and the
transition table was run in the change's worktree (under the gitignored `.scratch/`, so it is not
committed). It gave the expected display for every T1 scenario that computes or formats a number, and
for fifteen more probes: 62 checks in all, a figure of that day. The committed proof is
`npm run calculator:test`. Among the probes:
- `0.1 × 3 − 0.3` → `0`, `2 ÷ 3 × 3` → `2` and `1 ÷ 7 × 7` → `1`;
- a negative tie → `-1.500000002`, and an even-digit tie, `3.000000005 × 0.5` → `1.500000003`;
- `1e-200 × 1e-200` → `1e-400`, and a typed 17-digit difference kept exact;
- the largest double, typed, shown as `1.797693135e+308`, and that number `+ 1` → `Error`.

*Lost:*
- **Carrying the rounded result the display shows.** The maintainer chose it on 2026-09-23 and
  reversed it on 2026-09-24. Once arithmetic was exact, its only visible effect was
  `1 ÷ 3 × 3` showing `0.9999999999`, not `1`.
- **Exact decimal arithmetic on each double's shortest form (`String(n)`), rounded at every step.**
  It needed the rounded carry, since `1/3` has no finite decimal. It also left typed numbers limited
  to a double's range and precision: more than about 16 digits lost, below `5e-324` zero, and
  subnormal results short of ten digits.
- **Binary arithmetic with `Number(n.toPrecision(10))` as the rounding.** The third review of the
  build found that ties went in whichever direction the double fell (`1234567.8915` → `…891` but
  `1234567.8935` → `…894`), and that reading an exact sum back as a double before rounding rounded
  twice.
- **Rounding a binary sum to its operands' decimal places with `toFixed`.** `toFixed` stops at 100
  places, so the second review found that `1e-150 + 1e-150` showed `0`.

After `=`, `entry` and `op` are both `null`. So a digit starts a new number whose `value` is replaced
at the next operator (a new calculation), and an operator continues from `value`. The spec's "After
a result" behaviour needs no flag of its own.

*Lost:* a decimal arithmetic library. It would be a runtime dependency, and with no bundler it would
have to be vendored into `public/`. The four operations above take `BigInt` and a few dozen lines,
and need nothing more. Also lost: evaluating a typed expression string, which would bring precedence
the spec rules out, and a parser.

### 4. The page is thin wiring in `public/app.js`, mounted by `public/main.js`

`mount(doc)` finds the display and the keypad in the document it is given (never a global), and
holds the state in a closure. It handles clicks on the keypad through one delegated listener that
reads each button's `data-key`, and keyboard input through one `keydown` listener on `doc`. After
every key it sets the display's `textContent` to `displayText(state)`.

- **Buttons.** Each is `<button type="button" data-key="…" aria-label="…">`. The label is `add`,
  `subtract`, `multiply`, `divide`, `equals`, `clear` or `decimal point`; a digit button has no
  label and is named by its text. The operators show `−`, `×` and `÷` (U+2212, U+00D7, U+00F7) and
  carry `data-key` `-`, `*` and `/`.
- **Display.** An `<output>` with `aria-live="polite"` set explicitly, as the spec's scenario reads.
- **Keyboard.** `0`–`9`, `.`, `+`, `-`, `*` and `/` map to themselves, `Enter` and `=` to `=`, and
  `Escape` to `C`. Every mapped key calls `preventDefault()`. That stops `/` opening a browser's
  quick-find, and stops `Enter` also clicking a focused button, which would press it twice. A
  keydown with Ctrl, Meta or Alt held is ignored, so browser shortcuts keep working. That falls
  under the spec's "Any other key SHALL change nothing".
- **`main.js`** exists because the page's policy forbids an inline `<script>`. It is two lines:
  import `mount`, call it on `document`.

### 5. The server serves an allowlist, built once, matched exactly

`createCalculatorServer(publicDir)` reads `publicDir` once, at creation. It maps `/` to `index.html`
and `/<name>` to each file whose extension is `.html`, `.css` or `.js`, with its `Content-Type`
(`text/html; charset=utf-8`, `text/css; charset=utf-8`, `text/javascript; charset=utf-8`). It does not
descend into subdirectories. For each request:

- **A method other than `GET`** gets `405`, with `Allow: GET`.
- **The path** is the raw request target up to any `?`. It is looked up in the map exactly: not
  decoded, not normalised, not resolved against the file system. A miss is `404`. So `/../package.json`
  and `/%2e%2e/package.json` fail for the same reason as `/no-such-file`: they are not keys. No path
  arithmetic exists to get wrong.
- **A hit** is read from disk on every request, so an edit shows on reload without a restart. A file
  that has vanished since startup is `404`.
- **Every response,** including `404` and `405`, carries `Content-Security-Policy: default-src 'self'`.

*Lost:* resolving the path under `publicDir` and checking the result stays inside it. That is the
usual static-server shape and the usual source of traversal bugs: decoding order, separators on
Windows, symlinks. The allowlist removes the question.

*Considered and left out:* a `Host` header check against DNS rebinding. The server holds no state and
serves only files that are public in this repository, so a rebinding page could read nothing worth
having.

### 6. The CLI (`serve.js`) is separate from the handler (`server.js`)

The split lets the HTTP scenarios run in-process against `createCalculatorServer` on port `0`,
which is fast and needs no spawn. Only the scenarios that concern the process are tested by spawning
`serve.js`: the printed URL, `PORT`, the default port, a refused port and the signals. `serve.js`:

- **Port.** It reads `PORT`: `/^\d+$/` and 1–65535, else a one-line refusal naming the value, on
  stderr, exit 1. Unset means `8080`, held in one constant with a comment citing the spec
  requirement. `README.md` names no port, so the number has one home in the code.
- **Listening.** It listens on `127.0.0.1` only, then prints `Calculator running at
  http://127.0.0.1:<port>/ (Ctrl-C to stop)` on stdout.
- **Listen errors.** `EADDRINUSE` is refused in one line naming the port. Any other listen error is
  refused in one line naming its code. Both exit 1, with no stack trace.
- **Signals.** On `SIGINT` or `SIGTERM` it calls `server.close()` and `server.closeAllConnections()`,
  so a keep-alive socket cannot hold the process open, and exits 0 once closed.
- **Header.** It opens with the four-part header `CLAUDE.md` § Standing rules for prompts and gates
  gives scripts. `apps/` is not one of the directories that rule names, but a script a person runs
  is what that header is for. Its day-one "what it would let through" paragraph is binding a public
  interface, or serving a file from outside `public/`.

### 7. Tests use Node's own runner, with jsdom as the one new devDependency

- **Runner.** `node:test` runs every test file, so there is no framework to add. Each `describe` is
  a requirement's name and each `test` a scenario's name, both verbatim from the delta specs, so
  `change-verify` can trace scenario to test by exact string.
- **`calculator.test.js`.** Drives `press()` through each scenario's key sequence and checks
  `displayText()`. These are the calculator's arithmetic scenarios.
- **`page.test.js`.** Builds a DOM with jsdom from the committed `public/index.html`, calls
  `mount(dom.window.document)`, clicks buttons and dispatches `keydown` events. It covers the
  keypad, the display, the names assistive technology reads, and the keyboard scenarios, plus one
  click-through chain that proves the wiring reaches the logic.
- **`server.test.js`, in-process.** Content types, `404`, the traversal paths, `405`, the policy
  header, and "everything the page references is served locally". That last test reads the page's
  `src` and `href` attributes and each script's static `import` specifiers, then asserts each is
  relative and answers `200`. The raw `/../` and `%2e%2e` paths go through `http.request` with an
  explicit `path`, which Node's client sends unchanged.
- **`serve.test.js`, spawned.** The command's scenarios live in a file of their own, since they
  test `serve.js` rather than the handler (decided during the build of `zgh.4`, 2026-09-24). It
  runs `process.execPath` on `serve.js`, with a free port found by
  binding port `0` on `127.0.0.1` and closing it.
  - *The default port* runs with `PORT` removed from the environment. It accepts either outcome that
    proves the default is `8080`: the URL printed with `8080`, or a refusal naming `8080` when
    something on the machine already holds it.
  - *The npm script* is proved in two parts. The test asserts that `package.json`'s
    `calculator:serve` is exactly `node apps/calculator/serve.js`, and the spawned process proves
    what that command does. Spawning `npm` itself would add a package manager's start-up and its
    platform differences to every run.
- **jsdom.** A pinned devDependency, never shipped to the browser. `jsdom` does not run
  `<script type="module">`, which is why `mount` takes its document as an argument.

*Lost:* Playwright or another real browser in the test suite. It downloads browsers at install time
and is heavy for pre-push, and the dev container is built to need nothing from the network at
create time. Also lost: happy-dom, which is lighter, but through version 19 it evaluated JavaScript by default
in a VM context that code could escape (CVE-2025-61927, GHSA-37j7-fg3j-429f, fixed in 20.0.0). jsdom
is the conservative choice for a devDependency. Also lost: no DOM library at all, testing the page by
parsing HTML with regular expressions, which is fragile and cannot check that the keyboard works.

### 8. Gate and documentation wiring

- **`package.json`.**
  - `calculator:serve` runs `node apps/calculator/serve.js`.
  - `calculator:test` runs Node's test runner over `apps/calculator/test/`, in a form that Node
    22.18 expands itself on every platform (the build fixes the exact argument).
  - `jsdom` is added, pinned exactly. If it or anything it pulls in has an install script, the build
    declares it in `allowScripts`, as `@fission-ai/openspec` is.
- **`lefthook.yml`.** A pre-push job, `calculator-test`, with the glob `apps/calculator/**`,
  `package.json` and `package-lock.json`, and a cost note measured on the host that adds it.
- **`.github/workflows/verify.yml`.** A step running `npm run calculator:test`, placed by cost
  (seconds), next to the OpenSpec steps.
- **`scripts/check-jobs.mjs`.**
  - `calculator:serve` becomes a named exception in `UNJOBBED_BY_KIND`: it serves until a person
    stops it, so a job running it would never return, and `calculator:test` proves its behaviour.
  - `REPO_PATH_RE` gains `apps` as a third root, as its comment asks "the day a script of yours lives
    under a third one", so a moved `serve.js` is refused at push. The gate's selftest gains a case
    for a missing `apps/` path.
- **`.claude/worktree-CONTEXT.md.tmpl`.** The port paragraphs say that `npm run calculator:serve`
  is the one thing that listens on a port, on `127.0.0.1`, when a person starts it, and that
  `PORT=<the worktree's APP_PORT>` keeps two worktrees from colliding. They also say that wanting a
  port for anything else still means stop. The `worktree-hooks` job's glob already covers the
  template.
- **`docs/decisions.md`.** `docs/decisions.md` § D-04 as accepted, with the status line, the range
  bounds and the summary table updated in the same commit, as the register's own header requires.
- **`README.md`.**
  - § How it is laid out: a row for `apps/`.
  - § Working here: a row for running the calculator.
  - § The npm scripts: a `### calculator` sub-section.
  - § What runs automatically: a row for the new pre-push job.
- **Unaffected.** `count-index.md` (no key moves: `CNT-HOOKS` counts `.claude/settings.json`
  entries, which this change does not touch) and `tools/pipeline/graph.ts` (no emitter).

## Risks / Trade-offs

- **jsdom is not a browser.** It checks structure, names and event wiring, but not layout, real
  focus behaviour or the browser enforcing the security policy. *Mitigation:* `change-verify` opens
  the served page once in a real browser, runs one calculation by clicks and one by keyboard, checks
  that the console reports no policy violation, and records the result.
- **The allowlist fails closed.** A future file in a subdirectory of `public/`, or with another
  extension (an image, a font), gets `404` until the table learns its type. *Mitigation:* the
  "everything the page references is served locally" test fails on the first such reference, and
  names it.
- **Port races in tests.** A free port found by binding `0` and closing it can be taken before the
  child binds it. *Mitigation:* the window is milliseconds, and only `server.test.js` and
  `serve.test.js` bind ports. The default-port test tolerates `8080` being in use by design, and
  holds it for a moment only when it is free.
- **Signals on Windows.** `child.kill('SIGINT')` on Windows ends the process without running its
  handler, so the interrupt test cannot pass there. *Mitigation:* that one test is skipped on
  `win32`, printing why (`CLAUDE.md` § The gate ladder allows a skip that prints why). CI runs it on
  `ubuntu-latest`, which is binding.
- **A consequence of the accepted spec.** "Equals with no operation pending … SHALL change nothing"
  means `5`, `=`, `3` shows `53`: equals never closed the entry, so the digit extends it. This is
  consistent, but unlike some pocket calculators.
- **Exact fractions grow, and entry has no digit limit.** A long chain of divisions by numbers with
  no common factor grows the numerator and the denominator (`1 ÷ 7 ÷ 11 ÷ 13 …`), and a typed
  number is kept at every digit it has. *Mitigation:* every result is reduced to lowest terms, and
  `BigInt` has no fixed width. A chain a person types stays within hundreds of digits, which costs
  microseconds. *Accepted:* a chain long enough to slow the page takes more key presses than anyone
  makes.

  The limits of the earlier binary designs are gone: typed digits past the sixteenth, results below
  `5e-324`, and subnormal results short of ten digits (Decisions, item 3, *Lost*). What remains is
  the spec's own bound: a typed number or result too large to be finite shows `Error`.
- **A new supply-chain surface.** jsdom brings transitive devDependencies. *Mitigation:* an exact pin,
  the lockfile, `npm ci` everywhere, and nothing of it served to the browser.
- **A stale briefing in new worktrees.** The amended template reaches a new worktree only after the
  primary checkout has pulled `main`, because the renderer reads the checkout's copy
  (`asdlc-openspec-kce`). Until then a new worktree still says nothing serves a port.
