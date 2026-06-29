## Why

Generated Divi 5 pages already ship with a `*-seo-meta.json` sidecar (title, description, focus keyword, slug), but the Divi Tools Importer only persists **title** and **description** to **Yoast** and **Rank Math** — and ignores the focus keyword, OpenGraph/Twitter, canonical, robots, and any other SEO plugin (All in One SEO, SEOPress, The SEO Framework). On sites without Yoast/RankMath, the generated SEO data lands in neutral `_dti_seo_*` keys that no SEO plugin reads, so the user has to re-enter everything by hand. This defeats the "SEO-optimised on import" promise of the generator.

We should write the full set of generated SEO fields into whichever SEO plugin is active, using each plugin's native meta keys, so an imported page is search-ready with zero manual cleanup.

## What Changes

- Extend `DTI_SeoWriter::write()` to persist **focus keyword(s)** to Yoast (`_yoast_wpseo_focuskw`, `_yoast_wpseo_focuskeys`) and Rank Math (`rank_math_focus_keyword`, `rank_math_focus_keywords`).
- Add **All in One SEO** support (`_aioseo_title`, `_aioseo_description`, `_aioseo_focus_keyphrase` and the `_aioseo_posts_data` JSON envelope for AIOSEO ≥ 4.x).
- Add **SEOPress** and **The SEO Framework** lightweight support (title, description, keyphrase).
- Persist **OpenGraph / Twitter / social** fields when present in the sidecar (Yoast `_yoast_wpseo_opengraph-*` / `_yoast_wpseo_twitter-*`; Rank Math `rank_math_facebook_*` / `rank_math_twitter_*`).
- Persist **canonical URL** and **robots directives** (`noindex` / `nofollow`) when present.
- Refactor `SeoWriter` from a single `write()` method into a **plugin adapter pattern** (`DTI_Seo_Plugin\Yoast`, `RankMath`, `AIOSEO`, `SEOPress`, `TSF`, `Fallback`) selected by a detector, so adding future plugins is a one-class change.
- Expand the `seo` payload schema (accepted by `POST /import` and `POST /preview`) with optional `focusKeyword`, `secondaryKeywords[]`, `og{}`, `twitter{}`, `canonical`, `robots{}` fields — all optional and backward-compatible.
- Update `GET /ping` response to report the **detected SEO plugin name** (currently it does not), so the import skill can warn before import.
- Update `readme.txt`, the `import-to-local` skill, and the `*-seo-meta.json` schema doc in `divi5-page-generator` to reflect the new fields and supported plugins.
- **BREAKING** (internal): `SeoWriter::write()` return value changes from a string (`'yoast'|'rankmath'|'none'`) to an array `{ plugin: string, fields_written: string[] }`. Only consumed by `PageImporter::import()` within this repo, updated in the same change.

## Capabilities

### New Capabilities
- `seo-meta-persistence`: The importer persists the full generated SEO sidecar (title, description, focus + secondary keywords, OpenGraph, Twitter, canonical, robots) into whichever SEO plugin is active on the target site — Yoast, Rank Math, All in One SEO, SEOPress, or The SEO Framework — falling back to neutral `_dti_seo_*` post meta when none are active, and reporting exactly which fields were written.

### Modified Capabilities
<!-- None — no prior specs exist in openspec/specs/. -->

## Impact

- **Code**:
  - `plugin/divi-tools-importer/src/SeoWriter.php` — refactored into adapter classes (largest change).
  - `plugin/divi-tools-importer/src/PageImporter.php` — consume new return shape, surface `fields_written` in the import response.
  - `plugin/divi-tools-importer/src/RestApi.php` + `PagePreviewer.php` — accept the expanded `seo` payload and pass it through; `GET /ping` reports detected plugin.
  - `plugin/divi-tools-importer/src/PagesLister.php` — already reads `_yoast_wpseo_title` / `rank_math_title`; extend the `design_hint` resolver to cover AIOSEO/SEOPress/TSF.
- **Schema/contract**:
  - `seo` object in `/import` and `/preview` request payloads — additive fields only; existing `{title, description, slug}` payloads keep working.
  - `seo_plugin` field in import response changes shape (see BREAKING above).
- **Plugin build**: `divi-tools-importer.php` main file + `readme.txt` version bump (1.5.4 → 1.6.0); users rebuild the installable zip via `skills/import-to-local/scripts/build-plugin-zip.sh`.
- **Docs/skills**:
  - `skills/import-to-local/SKILL.md` — update the "What was detected" report and the seo-meta key list.
  - `skills/divi5-page-generator/SKILL.md` + `references/seo.md` — document the expanded `*-seo-meta.json` schema.
- **Dependencies**: none added. All persistence is via `update_post_meta()` and existing plugin constants/classes (`WPSEO_VERSION`, `RankMath`, `AIOSEO\Plugin\AIOSEO`, `SEOPRESS_VERSION`, `THE_SEO_FRAMEWORK_VERSION`).
- **Risk**: low — read-only detection + `update_post_meta()` writes; guarded by `defined()`/`class_exists()` checks; existing Yoast/RankMath title+description paths are preserved verbatim.
