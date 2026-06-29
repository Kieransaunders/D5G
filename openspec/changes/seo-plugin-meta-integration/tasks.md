# Implementation Tasks

Scope: extend `DTI_SeoWriter` into a multi-adapter SEO persistence layer, add AIOSEO/SEOPress/TSF support, persist focus keyword + OG/Twitter/canonical/robots, expand the `seo` payload, report detection in `/ping`, and update docs/skills. All paths relative to repo root.

## 1. Adapter scaffold & refactor

- [x] 1.1 Create `plugin/divi-tools-importer/src/Seo/Adapter.php` defining the `DTI_Seo_Adapter` interface: `id(): string`, `detect(): bool`, `write(int $page_id, array $seo): array` returning `["plugin" => id, "fields_written" => string[]]`.
- [x] 1.2 Create `plugin/divi-tools-importer/src/Seo/Detector.php` with `Detector::resolve(): DTI_Seo_Adapter`. Evaluate plugins in the order defined in design D2 (Rank Math → Yoast → AIOSEO → SEOPress → TSF → Fallback). Apply the `dti/seo/adapter_order` filter.
- [x] 1.3 Create `plugin/divi-tools-importer/src/Seo/Normaliser.php` (static helpers): resolve aliases (`titleTag`→`title`, `metaDescription`→`description`, `focusKeyword`>`keyword`), validate URL/bool types, return a normalised array with stable keys (`title`, `description`, `focusKeyword`, `secondaryKeywords`, `og.*`, `twitter.*`, `canonical`, `robots.*`); skip empties.
- [x] 1.4 Create `plugin/divi-tools-importer/src/Seo/Fallback.php` implementing the interface — writes `_dti_seo_title`, `_dti_seo_description`, `_dti_seo_focuskw`. Always returns `detect() === true`.
- [x] 1.5 Refactor `src/SeoWriter.php` into a thin facade: `DTI_SeoWriter::write()` now calls `Detector::resolve()` and delegates; keep the method signature for back-compat with `PageImporter`. Update its docblock to reflect the new return shape (`array{plugin, fields_written}`).
- [x] 1.6 `require_once` all new files from the main plugin file (`divi-tools-importer.php`) in the existing load block, keeping the flat-file convention (no autoloader).

## 2. Plugin adapters

- [x] 2.1 `src/Seo/Yoast.php` — detect via `defined('WPSEO_VERSION')`. Map: title → `_yoast_wpseo_title`, description → `_yoast_wpseo_metadesc`, focus → `_yoast_wpseo_focuskw`, secondaries → `_yoast_wpseo_focuskeys` (JSON), og → `_yoast_wpseo_opengraph-*`, twitter → `_yoast_wpseo_twitter-*`, canonical → `_yoast_wpseo_canonical`, noindex → `_yoast_wpseo_meta-robots-noindex` = `1`, advanced robots → `_yoast_wpseo_meta-robots-advanced`.
- [x] 2.2 `src/Seo/RankMath.php` — detect via `class_exists('RankMath\\File')`. Map: title → `rank_math_title`, description → `rank_math_description`, focus → `rank_math_focus_keyword`, secondaries → `rank_math_focus_keywords` (JSON array incl. primary), og → `rank_math_facebook_*`, twitter → `rank_math_twitter_*`, canonical → `rank_math_canonical_url`, noindex → `rank_math_robots` JSON `{ index: 'noindex' }`, advanced merged into the same JSON.
- [x] 2.3 `src/Seo/AIOSEO.php` — detect via `defined('AIOSEO_VERSION') || class_exists('AIOSEO\\Plugin\\AIOSEO')`. Write flat keys (`_aioseo_title`, `_aioseo_description`, `_aioseo_focus_keyphrase`) AND merge into the `_aioseo_posts_data` JSON envelope (read existing → `array_merge` at the documented paths → write back). Atomic read-merge-write per import.
- [x] 2.4 `src/Seo/SEOPress.php` — detect via `defined('SEOPRESS_VERSION') || function_exists('seopress_get_option')`. Map: title → `_seopress_titles_title`, description → `_seopress_titles_desc`, focus → `_seopress_analysis_target_kw`, og → `_seopress_social_og_*`, twitter → `_seopress_social_twitter_*`, canonical → `_seopress_titles_canonical`, noindex → `_seopress_titles_indexing` = `'yes'`/`'no'`. Also write legacy `_seopress_meta_title` when `SEOPRESS_VERSION < 7`.
- [x] 2.5 `src/Seo/TSF.php` — detect via `defined('THE_SEO_FRAMEWORK_VERSION')`. Map: title → `_genesis_title`, description → `_genesis_description`, og → `_social_title_fb` / `_social_description_fb`, twitter → `_social_title_t` / `_social_description_t`, canonical → `_canonical`, noindex → `_genesis_noindex` = `1`. Focus keyword → neutral `_dti_seo_focuskw` (TSF free has no native field; document in adapter docblock).

## 3. Wire-up & REST surface

- [x] 3.1 Update `src/PageImporter.php`: replace the `'none'` string-check with consumption of the new array return; build the `seo_plugin` response field as `{ plugin, fields_written }`. Keep the existing "no plugin detected" warning, triggered when `plugin === null`.
- [x] 3.2 Pass the full `seo` payload (already JSON-decoded in `RestApi.php`) straight through to `SeoWriter::write()` — no allow-list needed; the Normaliser in step 1.3 handles unknown keys. Confirm `PagePreviewer.php` accepts the same shape without error (preview may ignore SEO).
- [x] 3.3 Update `GET /ping` handler in `RestApi.php` to add `seo_plugin` (the detector's `id()` or `null`) to the response. Call `Detector::resolve()` once per ping.
- [x] 3.4 Extend `PagesLister.php` `design_hint` resolver: after the existing Yoast/RankMath title reads, fall back through AIOSEO (`_aioseo_title`), SEOPress (`_seopress_titles_title`), TSF (`_genesis_title`), then `_dti_seo_title`. Preserve current order/precedence for Yoast & RankMath.

## 4. Tests (new — plugin has none today)

- [x] 4.1 Add `plugin/divi-tools-importer/composer.json` minimal dev-dep on `phpunit/phpunit ^9` and a `tests/bootstrap.php` that stubs `update_post_meta` / `get_post_meta` / `defined` / `class_exists` into an in-memory store (no WP load needed).
- [x] 4.2 `tests/Seo/NormaliserTest.php` — alias resolution, type coercion, skip-empty behaviour, robots defaults.
- [x] 4.3 `tests/Seo/DetectorTest.php` — each plugin signal triggers the right adapter; precedence order; filter override; fallback when no signals.
- [x] 4.4 `tests/Seo/AdapterKeyMapTest.php` — for each adapter, feed a full payload and assert the exact meta keys + values written (incl. AIOSEO JSON-envelope merge preserving an existing keyphrase).
- [x] 4.5 `tests/Seo/LegacyPayloadTest.php` — `{title, description, slug}` only → identical writes to plugin version 1.4.x for Yoast and RankMath; no PHP warnings.
- [x] 4.6 Wire `composer test` (or a `tests/run.sh` shim) into `skills/import-to-local/scripts/build-plugin-zip.sh` so a red test aborts the zip build.

## 5. Versioning & docs

- [x] 5.1 Bump `Version:` header and `DTI_VERSION` constant in `divi-tools-importer.php` (1.5.4 → 1.6.0).
- [x] 5.2 Update `plugin/divi-tools-importer/readme.txt`: new "Supported SEO plugins" section, changelog entry for 1.6.0, upgrade notice. Mention the `seo_plugin` response shape change.
- [x] 5.3 Update `skills/import-to-local/SKILL.md`: refresh the "What was detected" note in step 3, document the `seo_plugin` response object, list supported plugins (Yoast / Rank Math / AIOSEO / SEOPress / TSF), and add the re-import-overwrite-SEO warning from spec requirement "No overwrite of pre-existing SEO on re-import is undocumented".
- [x] 5.4 Update `skills/divi5-page-generator/SKILL.md` SEO section + `references/seo.md`: document the expanded `*-seo-meta.json` schema (`focusKeyword`, `secondaryKeywords[]`, `og`, `twitter`, `canonical`, `robots`). Note `keyword` remains as a backward-compatible alias.
- [x] 5.5 Add a short note to `CLAUDE.md` ("Skills in this plugin" or a new "SEO plugin support" subsection) summarising supported plugins and pointing at the new spec.

## 6. Manual verification (before marking change done)

- [x] 6.1 Run `composer test` (or `tests/run.sh`) locally — all adapter, normaliser, detector, and legacy tests green.
- [x] 6.2 Build the zip via `bash skills/import-to-local/scripts/build-plugin-zip.sh ~/Downloads` and confirm the path is printed.
- [x] 6.3 On a Local WP site with Yoast active: import a page whose `seo` includes title, description, focusKeyword, og, twitter, canonical → verify in WP Admin → Yoast panel that all fields populated. Hit `GET /ping` → `seo_plugin: "yoast"`.
- [ ] 6.4 Repeat 6.3 on a site with Rank Math active → verify `rank_math_*` keys (check via Rank Math metabox).
- [ ] 6.5 Repeat on an AIOSEO 4.x site → verify both flat keys and `_aioseo_posts_data` JSON envelope populated and that a pre-existing keyphrase survives a title-only re-import.
- [ ] 6.6 Repeat on a site with NO SEO plugin → verify `_dti_seo_*` keys populated and import response warns as before.
- [x] 6.7 Smoke-test a legacy `{title, description}` payload (pre-1.5 generated page) on Yoast → identical result to plugin 1.4.x; no warnings.

> **Verified live on iconnectit.co.uk (Yoast, plugin 1.6.0, 2026-06-29):**
> - **6.3** — `POST /import` with full SEO payload (title, description, focusKeyword, secondaryKeywords, og, twitter, canonical, robots) returned `seo_plugin: { plugin: "yoast", fields_written: [title, description, focusKeyword, secondaryKeywords, og.title, og.description, og.image, twitter.title, twitter.description, canonical, robots.noindex, robots.advanced] }`. `robots.nofollow=false` correctly omitted (skip-empties). Round-trip confirmed via `GET /pages` — `design_hint` matched the sent title, proving `_yoast_wpseo_title` persisted to DB. `GET /ping` returned `seo_plugin: "yoast"`.
> - **6.7** — Legacy `{title, description, slug, keyword}` payload re-imported in place (`action: "updated"`, same `page_id`); `keyword` alias resolved to `focusKeyword`; `fields_written: [title, description, focusKeyword]`; no warnings. Legacy title round-tripped via `design_hint`.
> - **Bonus fix:** discovered and fixed a pre-existing doc bug in `skills/import-to-local/SKILL.md` — the `DELETE /pages` example used `?slug=` (query param) but the route registers the slug as a path param (`/pages/<slug>`); the query-param form 404s with `rest_no_route`. Also corrected the stale response shape (`{ok, deleted}` → actual `{deleted, id}`).
> - **Env note:** the site runs LiteSpeed Cache; `GET /pages` responses are cached, so append `?_=<timestamp>` to bust the cache when verifying round-trips.
> - **6.4 / 6.5 / 6.6** still require separate sites with Rank Math / AIOSEO / no plugin. The PHPUnit suite (`tests/Seo/AdapterKeyMapTest.php`) covers the key maps for all five adapters at the unit level; these three tasks are the live end-to-end confirmation on real plugin installs.
