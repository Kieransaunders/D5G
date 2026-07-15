## Why

Every REST endpoint under `divi5-generator/v1` is reachable by anyone holding a valid API
key — Free and Pro alike. `D5G_Limits::is_pro()` (backed by Freemius `dg_fs()->is_paying()`)
already exists and gates *quota* (page/library import counts), but nothing gates the
endpoints the PRD's Free/Pro split (`docs/PRD.md` §3) says should be Pro-only outright:
preset packs, global variables, menu creation, and DB export/import. A Free install can
call `/presets/export`, `/db/export`, etc. today and get a 200. This is PRD gap #4
("No licence enforcement in code") and punch-list item F1.

## What Changes

- `D5G_RestApi` gains a pure route-policy check — `requires_pro( string $route ): bool` and
  `pro_gate( string $route, bool $is_pro ): true|WP_Error` — listing exactly which routes are
  Pro-only, matching the PRD §3 Free/Pro table.
- `authenticate()` calls `pro_gate()` after key verification (so an invalid/missing key still
  gets 401, not 403 — no leaking which routes exist to unauthenticated callers) and before any
  handler runs.
- Free-tier calls to a Pro-only route get `403 { code: "pro_required" }` with an upgrade URL.
- `/ping`, `/preview`, `/import`, `/export`, `/pages`, `/pages/{slug}` remain available on
  Free (unchanged — matches PRD §3 "✅ Free" rows).

## Capabilities

### New Capabilities
- `pro-rest-endpoint-gating`: server-side enforcement that Pro-only REST routes reject
  Free-tier callers with 403, while Free-tier routes remain unaffected.

### Modified Capabilities
<!-- None — first spec covering RestApi authorization -->

## Out of scope (separate PRD items, not this change)
- Partial SEO field gating (Free = title+description only) — a content-filtering concern
  inside `SeoWriter`/adapters, not route-level 403 gating.
- `D5G_ALLOW_DB_TRANSFER` opt-in constant for DB endpoints (PRD security note) — an
  additional defence-in-depth layer on top of Pro-gating, tracked separately.
- Fixing the copy-pasted Freemius product id/slug (PRD gap #1) — `is_pro()` gating logic is
  correct regardless of which Freemius product it resolves against; that's a config fix, not
  a code-gating fix.

## Impact

- Modifies `plugin/divi5-generator/src/RestApi.php` (`authenticate()`, two new static methods)
- No new files, no new dependencies, no breaking changes to already-Free endpoints
- Adds `tests/RestApiProGateTest.php` + a `RestApi` testsuite entry in `phpunit.xml`
