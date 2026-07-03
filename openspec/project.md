# Project: Divi5Generate

A standalone Claude Code plugin (skills + a WordPress importer). The repo IS the plugin root.

## Environment / shipping
- Single environment: **development → main** directly. There is **no `test` environment**
  (this is a skills plugin, not a deployed service).
- `/sswa:verify` **step 4 (promote to test env) is N/A** — skip it. A change is cleared to
  merge on review approval + a green local suite.

## Tests
- Node scripts, no framework. Each test is a runnable `scripts/__tests__/*.test.js` that
  prints `N passed, M failed` and exits non-zero on failure.
- Run one: `node scripts/__tests__/<name>.test.js` from `skills/divi5-page-generator/`.
- Run all: loop over `scripts/__tests__/*.test.js`.
- **Known pre-existing red:** `e2e-render.test.js` needs a live WP server + `DTI_KEY`
  (HTTP 401 otherwise) — environmental, not a regression signal.
