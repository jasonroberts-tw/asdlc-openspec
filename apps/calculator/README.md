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
| `server.js` | `createCalculatorServer(publicDir)`: the request handler, as a Node HTTP server that is not yet listening. It serves an exact allowlist built once from the flat listing of `publicDir`, `/` for `index.html` and `/<name>` for each `.html`, `.css` and `.js` file, and looks up the raw request path in it, so a path that climbs out of `public/` misses like any unknown path. A miss is `404`, a method other than GET is `405`, and every response carries `Content-Security-Policy: default-src 'self'`. |
| `test/` | The tests, run by `npm run calculator:test`. `test/README.md` has one row per file. |
