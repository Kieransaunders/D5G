# App improvement plan

**Thesis:** the `app/` builder earns its place by being the Divi Tools Importer
plugin's **faithful front-door, complete client, and test harness** — the thing
that makes the plugin worth installing. Work is ordered by value-to-effort.

The app already consumes 8 of the plugin's 13 route groups: `import`, `ping`,
`global-variables` (export/import), `presets` (export/import), and
`db/export`/`db/import` (via brand-deploy and migrate). The gaps below are the
high-value pieces still missing.

## Phase 0 — Contract integrity ✅ (PR #2)
Fixed the import payload (`draft` → `publish`; the plugin silently ignored
`draft`) and added `tests/import-contract.test.js`, which parses the plugin's
real route registration so the suite fails if app and plugin params drift.
This is the foundation everything else builds on.

## Phase 1 — Close the remaining client gaps
The unused plugin routes are exactly the high-value UX pieces.

| Plugin route | Status | Unlocks |
|---|---|---|
| `GET /pages` | ✅ done (PR #2 follow-up) | "Imported pages" list in Settings |
| `DELETE /pages/{slug}` | ✅ done | One-click no-litter cleanup of drafts |
| `POST /preview` | todo | True server-rendered live preview (app currently fakes it with local `/preview-html`) |
| `GET /export` | todo | Pull an existing live page back into the app to refine/re-import |

Each app route is backed by a `lib/` helper with its own contract test, mirroring
Phase 0 (`lib/wp-pages.js` + `tests/wp-pages-contract.test.js`).

## Phase 2 — Connection & onboarding hub
- Lean into `/download-plugin` (already builds the zip): a guided "Connect your
  site" flow — install plugin → paste API key → `/test-connection` confirms.
- **Version sync:** surface the plugin version from `/ping` (currently `1.5.3`)
  and warn when app expectations and plugin version diverge. This keeps the
  contract from silently rotting in production.

## Phase 3 — The verify/refine loop (the app's real reason to exist)
Generate → live preview (`/preview`) → accept or refine → publish (now wired) →
or discard (`DELETE /pages/{slug}`). The plugin is headless WP code; the human
judgement loop lives only in the app.

## Phase 4 — Reliability & trust
- Map plugin HTTP responses to clear UI states (401 key, 404 plugin-not-installed,
  422 bad layout, 5xx) instead of raw `WordPress returned ${status}: ${text}`.
- A "plugin health" panel (reachable / authed / version) on the settings page.

## Phase 5 — Brand → page → import pipeline (optional, higher effort)
Wire brand profiles + `global-variables`/`presets` push so a brand profile
deterministically drives a generation that imports cleanly. The plumbing exists
in `/brand/:id/deploy` and `/migrate/*`; this connects it end-to-end.

## Cross-cutting: the contract-test pattern
Every plugin endpoint the app consumes should have a `lib/` helper whose shape is
pinned by a test that reads the plugin's PHP source. This is what makes the app a
*trustworthy* client rather than a fragile one.
