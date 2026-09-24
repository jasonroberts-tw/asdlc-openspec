# `apps/calculator/`

**A calculator for the browser, written as plain ES modules that run exactly as committed, with the
tests that hold it to its spec.** There is no build step: the browser and Node's test runner load
the same files.

What the calculator does is capability `calculator`'s spec, and it wins over this page and over the
code. While the change that adds the calculator is open, that is its delta spec,
`openspec/changes/add-calculator-web-app/specs/calculator/spec.md`; once the change is archived, it
is the living spec, `openspec/specs/calculator/spec.md`. Where a row here and a file disagree, the
file wins and the row is corrected.

| Path | What it is |
|---|---|
| `public/` | The files the browser loads. `public/README.md` has one row per file. |
| `test/` | The tests, run by `npm run calculator:test`. `test/README.md` has one row per file. |
