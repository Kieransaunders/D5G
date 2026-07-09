# Tasks — app-plugin-contract-sync

SSWA ordering: **RED** (tests fail against current code) → **GREEN** (edits make them pass) → **VERIFY** (full suites green).

## 1. RED — update contract tests to the D5G contract

- [ ] 1.1 `app/tests/screenshot-contract.test.js` — plugin path `plugin/divi-tools-importer/divi-tools-importer.php` → `plugin/divi5-generator/divi5-generator.php`; `DTI_VERSION` → `D5G_VERSION`; `EXPECTED_DTI_VERSION` → `EXPECTED_D5G_VERSION` (function names, regex, comments, test name).
- [ ] 1.2 `app/tests/import-contract.test.js` — plugin path `plugin/divi-tools-importer/src/RestApi.php` → `plugin/divi5-generator/src/RestApi.php`.
- [ ] 1.3 `app/tests/wp-pages-contract.test.js` — plugin path `plugin/divi-tools-importer/src/PagesLister.php` → `plugin/divi5-generator/src/PagesLister.php`.
- [ ] 1.4 Add a **namespace + auth-header** contract test (new file `app/tests/rest-contract.test.js`) that asserts `app/server.js` and `plugin/.../RestApi.php` agree on `divi5-generator/v1` and `X-D5G-Key`, and that no `divi-tools/v1` / `X-Divi-Tools-Key` strings remain in `app/server.js`.
- [ ] 1.5 Add a **secret-leak** contract test (in `rest-contract.test.js`) that reads `DbExporter.php` `SKIP_OPTION_NAME` and asserts it contains every option name `Auth.php` writes the key into (`d5g_api_key_hash`, `d5g_api_key_plain`, `d5g_rate_limit`).
- [ ] 1.6 Add a **DELETE-meta** contract test (in `rest-contract.test.js`) that asserts the `meta_key` used by the `/pages/{slug}` DELETE handler in `RestApi.php` equals the meta key `PageImporter.php` stamps (`_d5g_imported`).
- [ ] 1.7 `skills/divi5-page-generator/scripts/__tests__/importer-docs.test.js` — assert `X-D5G-Key` instead of `X-Divi-Tools-Key`.
- [ ] 1.8 Run all updated tests → confirm they **fail** (RED). Expected: namespace/header/version/path/secret/delete tests red.

## 2. GREEN — app layer

- [ ] 2.1 `app/server.js` — rename `EXPECTED_DTI_VERSION` → `EXPECTED_D5G_VERSION`, value `'1.5.4'` → `'1.8.0'`; update the line-29 comment.
- [ ] 2.2 `app/server.js` — every `/wp-json/divi-tools/v1` → `/wp-json/divi5-generator/v1` (import, preview, ping, pages passthrough, brand deploy, migrate pull, migrate push).
- [ ] 2.3 `app/server.js` — every `'X-Divi-Tools-Key'` → `'X-D5G-Key'`.
- [ ] 2.4 `app/server.js` — download name `divi-tools-importer.zip` → `divi5-generator.zip`; 404 hint string updated ("is the Divi5 Generator plugin active?").
- [ ] 2.5 `app/lib/import-payload.js`, `app/lib/wp-pages.js` — header-comment references updated.
- [ ] 2.6 `app/public/index.html` — download-link label text.

## 3. GREEN — plugin layer

- [ ] 3.1 `src/DbExporter.php:18` — `SKIP_OPTION_NAME` array values → `d5g_api_key_hash`, `d5g_api_key_plain`, `d5g_rate_limit`. *(secret-leak fix)*
- [ ] 3.2 `src/RestApi.php:380` — `'_dti_imported'` → `'_d5g_imported'`. *(broken DELETE fix)*
- [ ] 3.3 `src/DbImporter.php` — `dti-backups` → `d5g-backups` (docblock + path).
- [ ] 3.4 `src/PagePreviewer.php` — `dti-live-preview` → `d5g-live-preview`.
- [ ] 3.5 `src/SchemaInjector.php` — `dti_schema_` → `d5g_schema_`.
- [ ] 3.6 `deploy.sh`, `dev-watch.sh` — install-target dir `divi-tools-importer` → `divi5-generator`.

## 4. GREEN — skills & docs

- [ ] 4.1 `skills/divi5-page-generator/SKILL.md` — endpoint, header, plugin name.
- [ ] 4.2 `skills/divi5-page-generator/references/site-profile.md` — plugin name, namespace, header, option name; **remove** the `?dti_key=` query-param-auth claim (false).
- [ ] 4.3 `skills/divi5-deploy/SKILL.md` — preview slug.
- [ ] 4.4 `skills/brand-extract/SKILL.md` — namespace.
- [ ] 4.5 `skills/divi5-page-generator/examples/preset-first-workflow.js` — header + namespace (3 fetches).
- [ ] 4.6 `skills/divi5-page-generator/scripts/setup-et-presets.js` — header + namespace.
- [ ] 4.7 `skills/divi5-page-generator/scripts/divi-builder.js`, `scripts/et-pages.js` — comment refs.
- [ ] 4.8 `skills/divi5-page-generator/scripts/__tests__/e2e-render.test.js` — header + namespace.
- [ ] 4.9 `docs/product-overview.md` — endpoint table + auth note.
- [ ] 4.10 `docs/divi5-css-generation-rules.md`, `docs/divi5-page-generator/RENDER-FAULT-FINDER-SPEC.md`.
- [ ] 4.11 `DEVELOPMENT.md` — directory tree, deploy commands, endpoint table, version-sync invariant, meta-key references.

## 5. VERIFY

- [ ] 5.1 `cd app && npm test` (or the targeted contract loop if the chat/SSE suites hang as on baseline) — all contract tests GREEN.
- [ ] 5.2 `cd plugin/divi5-generator && composer test` — 59/59 still GREEN (no behaviour change in tested classes).
- [ ] 5.3 `grep -rn "divi-tools/v1\|X-Divi-Tools-Key\|EXPECTED_DTI_VERSION\|DTI_VERSION\|divi-tools-importer"` over the live repo — returns nothing outside `openspec/changes/archive/`, `.zcode/`, `node_modules/`, `vendor/`, worktrees.
- [ ] 5.4 Commit + open PR.
