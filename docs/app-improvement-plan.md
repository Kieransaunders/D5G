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
| `POST /preview` | ✅ done | Real server-rendered preview via `app.post('/preview/:id')`; the chat/canvas flow still uses the local mockup, but the plugin preview is now wired for the QA flow |
| `GET /export` | todo | Pull an existing live page back into the app to refine/re-import |

Each app route is backed by a `lib/` helper with its own contract test, mirroring
Phase 0 (`lib/wp-pages.js` + `tests/wp-pages-contract.test.js`).

## Phase 3 — The verify/refine loop ✅ (the app's real reason to exist)
Generate → import → **auto-screenshot the live page → compare against the mockup** →
accept or refine → or discard (`DELETE /pages/{slug}`). The screenshot loop is the
core fidelity gate and the app's reason to exist; it landed here.

- `lib/screenshot.js` — `playwright-core` driving the **system Chrome** (no browser
  download, works for any user with Chrome installed). True full-page capture,
  cached by `url|width` hash so re-imports of the same slug are instant.
- `GET /screenshot?url=…` — renders the live URL, returns the PNG. SSRF-guarded:
  localhost/loopback/.local allowed (your own WP site); private ranges blocked.
- Post-import, the canvas flips to a **QA compare layer** — two panes side-by-side:
  the Stage 2 mockup vs the live Divi render. Tabs: Compare / Live render / Mockup,
  plus a ↻ Re-shoot (cache bypass) and Open-live link.
- `buildImportPayload` defaults `publish=true` (matches plugin ≥1.5.4) so the
  imported page is live and screenshot-readable; drafts 404 headlessly.
- Contract tests pin the invariants: `tests/screenshot-contract.test.js` checks
  cacheKey determinism and the version-sync invariant (app `EXPECTED_DTI_VERSION`
  must equal the plugin's `DTI_VERSION`).

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

✅ The screenshot-driven compare loop landed (see the Phase 3 entry in this doc's
Phase 1 table above for the full breakdown). The remaining piece is surfacing the
human verdict back into the app as a structured "accept/refine" card.

## Phase 4 — Reliability & trust
- ✅ Plugin HTTP errors map to clear UI messages (`mapImportError` in server.js:
  401→key, 404→plugin-inactive, 422→bad-layout, 429→rate-limited, 5xx→server).
- ✅ **Plugin health panel**: `/test-connection` now returns `pluginVersion` +
  `versionOk`; the Settings tab renders health chips (Divi 5 ✓ / SEO plugin /
  plugin version, with a **version-drift warning** when the deployed plugin is
  behind what the app expects — the silent cause of broken live QA).
- A dedicated "plugin health" panel on a dashboard (beyond the Settings chips)
  is still open but lower-value now that the chips exist.

## Phase 5 — Brand → page → import pipeline (optional, higher effort)
Wire brand profiles + `global-variables`/`presets` push so a brand profile
deterministically drives a generation that imports cleanly. The plumbing exists
in `/brand/:id/deploy` and `/migrate/*`; this connects it end-to-end.

## Phase 6 — Claude Design ingest (visual authoring → Divi)
[Claude Design](https://www.anthropic.com/news/claude-design-anthropic-labs)
(Anthropic Labs, April 2026) turns prompts into design-system-aware visuals. Two
mechanisms matter for us, both confirmed in the
[Get started](https://support.claude.com/en/articles/14604416-get-started-with-claude-design)
docs:
- **Handoff bundle** — when a design is ready to build, Claude Design packages
  *design intent, component structure, and styling context* and sends it to
  **Claude Code** (local agent against the real repo, or **Claude Code Web**)
  with a single instruction. This app *is* a Claude Code project, so the handoff
  lands natively — structured input, not scraped HTML.
- **`/design-sync`** — Claude Design imports a design system from **GitHub, an
  uploaded file, or a local codebase**, building from real tokens and component
  names. It is two-way.

Direction A — **design → Divi page** (primary): a `claude-design-to-divi` skill
consumes the handoff bundle (component structure + styling context) as the
generation *input* instead of a text brief, and emits Divi 5 module JSON.
Everything downstream — preview → `/import` → imported-pages cleanup — already
exists. (Standalone-HTML export is a fallback input when no bundle is available.)

Direction B — **design-system sync**: publish the app's extracted Divi brand
(tokens + component names) into the repo in a `/design-sync`-friendly shape, so
Claude Design builds from the live site's real brand; and consume a synced design
system back into a brand profile, pushed via `/brand/:id/deploy`. Two-way, mirrors
Claude Design's own `/design-sync`.

Direction C — **live round-trip** (depends on Phase 1 `GET /export`): pull a live
WP page → edit in Claude Design → hand off → re-import.

Integration paths, easiest first:
1. **Handoff bundle → Claude Code** — the official, structured path; native to
   this Claude Code project. No unconfirmed API. Build `claude-design-to-divi`
   to read the bundle.
2. **Claude Design → Canva → app** — Claude Design exports to Canva, and the
   Canva MCP is already connected in this environment (`export-design` returns
   HTML/PDF). A live bridge for users who route through Canva.
3. **Direct Claude Design MCP/API** — only once a stable programmatic surface
   ships; treat as research preview until then.

Recommended start: path 1 + Direction A — a self-contained "hand off from Claude
Design, publish to Divi" slice built on the official handoff bundle.

## Cross-cutting: the contract-test pattern
Every plugin endpoint the app consumes should have a `lib/` helper whose shape is
pinned by a test that reads the plugin's PHP source. This is what makes the app a
*trustworthy* client rather than a fragile one.
