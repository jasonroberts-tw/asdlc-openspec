# `apps/calculator/`

**A calculator for the browser, written as plain ES modules that run exactly as committed, with the
local server that hands them to the browser and the tests that hold both to their specs.** There is
no build step: the browser and Node's test runner load the same files.

What the calculator does is capability `calculator`'s spec, and what its server does is capability
`calculator-local-server`'s; each wins over this page and over the code. While the change that adds
the calculator is open, those are its delta specs,
`openspec/changes/add-calculator-web-app/specs/calculator/spec.md` and
`openspec/changes/add-calculator-web-app/specs/calculator-local-server/spec.md`; once the change is
archived, they are the living specs, `openspec/specs/calculator/spec.md` and
`openspec/specs/calculator-local-server/spec.md`. Where a row here and a file disagree, the file
wins and the row is corrected.

| Path | What it is |
|---|---|
| `public/` | The files the browser loads. `public/README.md` has one row per file. |
| `serve.js` | The command `npm run calculator:serve` runs: `createCalculatorServer` over `public/`, found from this file rather than from the working directory, listening on `127.0.0.1` and no other interface, at the port `PORT` names or at the default it holds, with the URL printed. An invalid `PORT` or a listen error is refused in one line on stderr, with status 1 and no stack trace. `SIGINT` (Ctrl-C) or `SIGTERM` closes the server and every connection, then exits 0. It exports `parsePort`, `listenOnLoopback` and `listenRefusal` for the tests, and runs the command only when `node` runs the file itself. |
| `server.js` | `createCalculatorServer(publicDir)`: the request handler, as a Node HTTP server that is not yet listening. It serves an exact allowlist built once from the flat listing of `publicDir`, `/` for `index.html` and `/<name>` for each `.html`, `.css` and `.js` file, and looks up the raw request path in it, so a path that climbs out of `public/` misses like any unknown path. A miss is `404`, a method other than GET is `405`, and every response it writes carries `Content-Security-Policy: default-src 'self'` (Node's own answers to malformed requests do not; see the design, item 5). |
| `test/` | The tests, run by `npm run calculator:test`. `test/README.md` has one row per file. |
