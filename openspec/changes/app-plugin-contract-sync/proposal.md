## Why

The 1.7.0 rename `divi-tools-importer` (DTI) → `divi5-generator` (D5G) was applied to the
plugin's runtime constants (namespace, auth header, version, class prefixes, meta keys) but
never propagated to anything that *talks to* or *describes* the plugin. The shipped app,
the contract tests, the Claude skills, the deploy scripts, and the docs all still describe
the old protocol. Result: **the app and the plugin in the same repo cannot communicate** —
`/import`, `/preview`, `/ping`, `/pages`, `/wp-pages`, `/migrate/*`, and `/brand/:id/deploy`
in `app/server.js` all 404/401 against `plugin/divi5-generator/`. Three contract tests are
failing today (they read `plugin/divi-tools-importer/...`, a path that does not exist), and
two latent bugs from the incomplete rename ship secrets and silently break deletion.

Verified against current `main`:

| Concern | App / docs say | Plugin actually does | Effect |
|---|---|---|---|
| REST namespace | `divi-tools/v1` (`app/server.js` ×16) | `divi5-generator/v1` (`RestApi.php:9`) | every route 404 |
| Auth header | `X-Divi-Tools-Key` (×14) | `X-D5G-Key` (`RestApi.php:155`) | every request 401 |
| Version pin | `EXPECTED_DTI_VERSION = '1.5.4'` (`server.js:30`) | `D5G_VERSION = '1.8.0'` (`divi5-generator.php:22`) | version-gate always false |
| Contract tests | `plugin/divi-tools-importer/...` | only `plugin/divi5-generator/` exists | 3 tests ENOENT |
| Secret leak | — | `DbExporter.php:18` skips `dti_api_key_hash` but `Auth.php:9` writes `d5g_api_key_hash` | API-key hash in DB dump |
| Broken DELETE | — | `RestApi.php:380` queries `_dti_imported`; `PageImporter.php:160` stamps `_d5g_imported` | `DELETE /pages/{slug}` always 404 |

All six are symptoms of the same incomplete rename. They share one root cause, which is why
they belong in one SSWA change.

## What Changes

Complete the DTI → D5G rename across every layer that references it, so the app, tests,
skills, and docs describe the protocol the committed plugin actually implements, and the
two latent rename bugs stop shipping.

### App layer (`app/`)
- **Version pin.** `server.js`: `EXPECTED_DTI_VERSION` → `EXPECTED_D5G_VERSION`; value `'1.5.4'` → `'1.8.0'`.
- **REST namespace.** All `/wp-json/divi-tools/v1` → `/wp-json/divi5-generator/v1` (import, preview, ping, pages, brand deploy, migrate pull/push).
- **Auth header.** All `'X-Divi-Tools-Key'` → `'X-D5G-Key'`.
- **Download name.** `divi-tools-importer.zip` → `divi5-generator.zip`; the 404 hint string ("is Divi Tools Importer active?") updated.
- **Lib comments.** `lib/import-payload.js`, `lib/wp-pages.js`: path + endpoint references in header docs.
- **UI string.** `public/index.html` download link label.

### Plugin layer (`plugin/divi5-generator/`)
- **Secret leak fix.** `src/DbExporter.php:18`: `SKIP_OPTION_NAME` excludes `d5g_api_key_hash`, `d5g_api_key_plain`, `d5g_rate_limit` (the names `Auth.php` actually writes), not the stale `dti_*` names.
- **Broken DELETE fix.** `src/RestApi.php:380`: `meta_key '_dti_imported'` → `'_d5g_imported'` (matches `PageImporter.php:160` and `PagesLister.php:21`).
- **Rename leftovers.** `src/DbImporter.php` backup dir `dti-backups` → `d5g-backups`; `src/PagePreviewer.php` preview slug `dti-live-preview` → `d5g-live-preview`; `src/SchemaInjector.php` option prefix `dti_schema_` → `d5g_schema_`.
- **Deploy scripts.** `deploy.sh`, `dev-watch.sh`: install target `wp-content/plugins/divi-tools-importer` → `divi5-generator`.

### Tests layer
- `app/tests/screenshot-contract.test.js`: plugin path → `plugin/divi5-generator/divi5-generator.php`; `DTI_VERSION` → `D5G_VERSION`; `EXPECTED_DTI_VERSION` → `EXPECTED_D5G_VERSION`.
- `app/tests/import-contract.test.js`, `app/tests/wp-pages-contract.test.js`: plugin path → `plugin/divi5-generator/src/{RestApi,PagesLister}.php`.
- `skills/divi5-page-generator/scripts/__tests__/importer-docs.test.js`: assert `X-D5G-Key` (not `X-Divi-Tools-Key`).

### Skills & docs layer
- `skills/divi5-page-generator/SKILL.md` + `references/site-profile.md`: plugin name, namespace, auth header, option name (`dti_api_key_hash` → `d5g_api_key_hash`); **remove the false claim** that `?dti_key=` query-param auth is supported (only the header is checked, `RestApi.php:155`).
- `skills/divi5-deploy/SKILL.md`: preview slug reference.
- `skills/brand-extract/SKILL.md`: endpoint namespace.
- `skills/divi5-page-generator/examples/preset-first-workflow.js`, `scripts/setup-et-presets.js`, `scripts/divi-builder.js`, `scripts/et-pages.js`, `scripts/__tests__/e2e-render.test.js`: header + namespace.
- `docs/product-overview.md`, `docs/divi5-css-generation-rules.md`, `docs/divi5-page-generator/RENDER-FAULT-FINDER-SPEC.md`.
- `DEVELOPMENT.md`: full sweep (directory tree, deploy commands, endpoint table, version-sync invariant).

### Spec delta
- `openspec/specs/importer-integration/spec.md`: namespace/header/plugin-name updated to D5G (it currently asserts the DTI names as SHALL requirements — factually wrong today).

## Capabilities

### Modified Capabilities
- **`importer-integration`** — the documented namespace, auth header, plugin slug, and version constant move from `divi-tools/v1` + `X-Divi-Tools-Key` + `divi-tools-importer` + `DTI_VERSION` to `divi5-generator/v1` + `X-D5G-Key` + `divi5-generator` + `D5G_VERSION`. Also corrects the false query-param-auth claim.
- **`app-wp-rest-contract`** *(new capability)* — pins the app↔plugin REST contract (namespace, auth header, version-sync invariant, payload shape) so app and plugin cannot silently drift. The three contract tests are the enforcement.

## Impact

- **App:** `app/server.js`, `app/lib/import-payload.js`, `app/lib/wp-pages.js`, `app/public/index.html`. No route signatures change; only constants/strings. No DB migration.
- **Plugin:** 6 PHP source files (1-line each, plus `DbExporter` array), 2 shell scripts. No REST route signatures change.
- **Tests:** 3 app contract tests + 1 skill test move from RED to GREEN.
- **Skills/docs:** ~10 files, string-only edits.
- **Data:** hard cutover on the `_dti_imported` → `_d5g_imported` meta key. Pages previously imported under `_dti_imported` will no longer appear in `GET /pages` and will not be deletable via `DELETE /pages/{slug}` — accepted (per scope decision). No backfill.
- **No change** to the REST request/response *shapes*; existing client integrations that already speak D5G are unaffected. The only externally visible change is that the documented protocol now matches the one already deployed.

## Non-goals

- `/db/import` raw-SQL hardening — intentional feature, needs its own design decision → separate change.
- App `localhost` bind + auth token — separate security change.
- `app/public/app.js` modularisation / E2E coverage — separate change.
- CI / lint setup — separate change.
- `_dti_imported` legacy-data backfill — explicitly declined (hard cutover).
