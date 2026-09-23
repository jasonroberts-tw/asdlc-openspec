## Why

This repository has the machinery for product work (the six `change-*` skills, the `openspec:check`
gate, the `spec-change` epics of `docs/decisions.md` § D-02) and no product for it to act on:
`openspec/specs/` is empty, and no change has yet run through all six stages. Issue
`asdlc-openspec-zgh` asks for one small, real change to run end to end so the run shows what in the
lifecycle fails; it seeds this change and is its epic. A simple calculator web application, run
locally only, is small enough to finish in one pass and still has observable behaviour worth
specifying: arithmetic, entry rules, error handling, and how a person starts it on their own
machine. It also leaves the repository with a demo product that later changes can modify, so the
MODIFIED, REMOVED and RENAMED paths of the archive have something to act on.

## What Changes

- A calculator page: a display and a keypad of digits, a decimal point, the four arithmetic
  operators, equals and clear, also driven from the keyboard.
- Arithmetic as a basic pocket calculator does it: each operation applies to the running result
  when the next operator or equals is pressed, left to right, with no operator precedence.
- Division by zero shows `Error` instead of a number, and the next digit or clear starts over.
- Results are shown rounded to ten significant digits, so `0.1 + 0.2` shows `0.3`.
- One npm script, `calculator:serve`, starts a local server for the page on the loopback interface
  only, prints its URL, and stops cleanly on an interrupt. There is no deployment, no
  infrastructure, and nothing that is reachable from another machine.
- The port comes from `PORT`, or is `8080` when it is unset; a port in use or an invalid value is
  refused in one line, not a stack trace.
- The server answers only for the calculator's own files: any other path, including one that tries
  to climb out of the calculator's directory, is `404`.
- The page loads nothing from any origin but the local server, and says so to the browser in a
  `Content-Security-Policy` header, so it works with no network access.

Nothing existing changes behaviour, so nothing here is breaking: the repository had no product.

## Capabilities

### New Capabilities

- `calculator`: the calculator as a person uses it in the browser: the keypad and display, number
  entry, the four operations and how they chain, equals, clear, division by zero, and how results
  are rounded for display.
- `calculator-local-server`: running the calculator on one's own machine: the npm script that
  starts it, the loopback-only listener and its port, the files it will and will not serve, the
  absence of any other origin, and stopping it.

### Modified Capabilities

None. `openspec/specs/` holds no capability yet.

## Impact

- **Code:** a new directory for the application's page, its calculation logic and its server, and
  tests beside them. Where it lives, and how the logic is kept testable apart from the page, is
  settled by `change-design`.
- **`package.json`:** one new script, `calculator:serve`, under a new `calculator` prefix, and
  whatever test script the design names. A new prefix is a new sub-section of `README.md` § The npm
  scripts (`.claude/skills/add-npm-script/SKILL.md` § 1. Name it). `npm run check:jobs` refuses a
  script that no job runs unless it is declared with its reason, and `calculator:serve` is one no
  gate should run.
- **Dependencies:** the server uses Node's own `http` module and adds no runtime dependency. Testing
  the page's behaviour may need a DOM for Node; `change-design` decides whether that is a new
  devDependency and which one.
- **Gates:** the calculator's tests read only committed files, so they belong in `lefthook.yml`
  (pre-push, with a glob over the application's directory) and in `.github/workflows/verify.yml`
  (`CLAUDE.md` § The gate ladder). A server test binds a loopback port; `change-design` records
  whether that counts as the network the gate ladder keeps out of CI.
- **`.claude/worktree-CONTEXT.md.tmpl`:** its paragraph "Nothing in this repository serves a port",
  and its instruction to stop on wanting one, stop being true. The rendered `.worktree/ports.env`
  already reserves an `APP_PORT` for each worktree; the design says whether the server reads it.
- **`docs/decisions.md`:** the briefing calls a port-serving application something this repository
  "deliberately does not contain". Reversing that is recorded as a new register entry in this
  change's pull request, with a dated amendment under any entry it changes.
- **`README.md`:** a row in § Working here for running the calculator, the new § The npm scripts
  sub-section, and the local-run steps. `count-index.md` and `docs/pipeline.md` are unaffected: the
  change adds no keyed count and no generated artifact.
