=== Divi5 Generator ===
Contributors: iconnectit
Tags: divi, divi 5, ai, page generator, import, export, seo, landing page, rest api
Requires at least: 6.4
Tested up to: 6.8
Requires PHP: 8.1
Stable tag: 1.7.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

AI-powered Divi 5 page generator. Import AI-generated pages, presets, global variables, and SEO metadata into Divi 5 via REST API — no SSH or WP-CLI required.

== Description ==

Divi5 Generator bridges AI-generated page builders (like Claude Code) with your Divi 5 WordPress site. It exposes a secure REST API that lets external tools preview, import, export, and manage Divi 5 pages — including full SEO metadata, presets, global colours, and schema markup.

**Works on any host** — Kinsta, WP Engine, SiteGround, Flywheel, Local by WP Engine. No SSH, no WP-CLI required.

= What it does =

* Exposes secure REST endpoints under `/wp-json/divi5-generator/v1/`
* Renders real Divi 5 previews before a full page import
* Creates or updates Divi 5 pages and Divi Library layouts from generated JSON
* Imports and exports Divi 5 presets, global colours, and global variables
* Exports existing pages and site design data for brand extraction and reuse
* Writes SEO metadata natively to Yoast, Rank Math, AIOSEO, SEOPress, The SEO Framework, or neutral fallback keys
* Stores FAQ/schema JSON-LD and injects it in the page `<head>` automatically
* Lists and deletes managed/generated pages by slug
* Supports database export/import with URL rewriting for controlled site transfer
* Logs all connector actions in the admin settings page

= Support =

Bug reports and feature requests: https://github.com/Kieransaunders/Divi5Generate/issues

= How to use =

1. Install and activate this plugin
2. Go to Settings → Divi5 Generator
3. Copy your site URL and API key
4. Give those two values to your AI page builder tool
5. The tool uses the REST endpoints to preview, import, export, extract brand data, deploy presets/variables, or verify pages

= Compatible with =

* Divi 5 (full import — presets, global colours, global variables)
* Yoast SEO, Rank Math, All in One SEO (AIOSEO), SEOPress, The SEO Framework — full SEO meta (title, description, focus + secondary keywords, OpenGraph, Twitter, canonical, robots directives) written to each plugin's native meta keys
* No SEO plugin (values stored in neutral post meta with a warning)

== Supported SEO plugins ==

The importer detects the active SEO plugin on every request and writes generated SEO values to that plugin's native post-meta keys. Detection order (override via the `d5g/seo/adapter_order` filter):

| Plugin | Detection signal | Fields written |
|---|---|---|
| Rank Math | `RankMath\File` class | title, description, focus + secondary keywords, OG, Twitter, canonical, robots |
| Yoast SEO | `WPSEO_VERSION` | title, description, focus + secondary keywords, OG, Twitter, canonical, robots |
| All in One SEO | `AIOSEO_VERSION` | title, description, keyphrase (flat + JSON envelope), OG, Twitter, canonical, robots |
| SEOPress | `SEOPRESS_VERSION` | title, description, focus + secondary keyphrases, OG, Twitter, canonical, noindex |
| The SEO Framework | `THE_SEO_FRAMEWORK_VERSION` | title, description, OG, Twitter, canonical, robots (no native focus-keyword field — value stored in `_d5g_seo_focuskw` for traceability) |
| *(none)* | — | title, description, focus keyword → neutral `_d5g_seo_*` keys, with a warning |

== REST capabilities ==

* `POST /preview` — render generated Divi JSON on a fixed preview page before full import
* `POST /import` — import or update pages; also routes `et_builder_layouts` into the Divi Library importer
* `GET /export` — export a page by ID or slug
* `POST /presets/import`, `GET /presets`, `GET /presets/export` — manage Divi preset packs
* `POST /global-variables`, `GET /global-variables/export` — import/export Divi global variables and colours
* `GET /pages`, `DELETE /pages/{slug}` — list and remove connector-managed generated pages
* `GET /db/export`, `POST /db/import` — transfer prefixed WordPress tables with serialize-aware URL rewriting
* `GET /ping` — validate API key, Divi 5 availability, connector version, and active SEO plugin

== Installation ==

1. Upload the `divi5-generator` folder to `/wp-content/plugins/`
2. Activate via Plugins → Installed Plugins
3. Go to Settings → Divi5 Generator to get your API key

== Frequently Asked Questions ==

= Is the endpoint secure? =

Yes. Every request requires an `X-D5G-Key` header matching a hashed key stored in your database. The key is never stored in plain text. There is also a rate limit of 30 requests per 60 seconds per IP.

= What if I don't have Divi 5? =

The content will still import — the page will be created with the raw Divi block content. Presets and global colours won't be imported (a warning is returned). Activate Divi 5 for full import.

= What if I don't have Yoast or Rank Math? =

SEO values are written natively to whichever of Yoast, Rank Math, All in One SEO, SEOPress, or The SEO Framework is active. If none of those are installed, the values are stored in neutral post meta (`_d5g_seo_title`, `_d5g_seo_description`, `_d5g_seo_focuskw`) and a warning is returned so you can set them manually.

= Does it publish or create a draft? =

The REST route defaults `publish` to `true`. The import skill intentionally publishes so it can verify the real front-end render; Divi draft previews do not reliably render presets/CSS. Pass `"publish": false` only for workflows that explicitly want draft behaviour.

= How do I regenerate my API key? =

Settings → Divi5 Generator → Regenerate Key. Your old key stops working immediately.

== Changelog ==

= 1.8.0 =
* New: Navigation menu creation — `POST /menus` creates a named menu (or appends to an existing one) with page-link and custom-URL items, parent-child nesting via `id`/`parent_id`, and optional assignment to a theme location.
* New: `GET /menus` lists all menus (or one by `?name=`) as a nested item tree with `theme_locations` and `item_count`.
* New: `POST /menus/auto-place` places a list of generated pages into an existing menu, nesting each under a top-level item whose label shares a significant word with the page title (pages with no match are appended at the top level; pages already in the menu are skipped).
* 59 PHPUnit tests.

= 1.7.0 =
* Renamed plugin from "Divi Tools Connector" to "Divi5 Generator"
* New REST API namespace: `/wp-json/divi5-generator/v1/` (was `divi-tools/v1`)
* New auth header: `X-D5G-Key` (was `X-Divi-Tools-Key`)
* All API keys now start with `d5gk_` (was `dtik_`)
* Updated all internal prefixes: constants (`D5G_`), classes, options, post meta keys (`_d5g_seo_*`)
* Updated settings page path: Settings → Divi5 Generator

= 1.6.1 =
* Fix: robots directives (noindex, nofollow) are now three-state — absent preserves the existing value, `true` sets it, `false` clears it. Previously a noindex set via import could not be cleared by re-importing (one-way ratchet).
* Fix: Rank Math robots JSON envelope was not decoded on re-import, so the read-merge-write started from empty each time (user-set advanced directives were lost on re-import).

= 1.6.0 =
* Full SEO meta persistence: focus keyword, secondary keywords, OpenGraph, Twitter, canonical, and robots directives now written to the active SEO plugin's native meta keys (previously only title + description were written).
* Added support for All in One SEO (AIOSEO), SEOPress, and The SEO Framework.
* `GET /ping` now reports the active SEO plugin via `seo_plugin`.
* Adapter architecture: each SEO plugin is one class under `src/Seo/`, selected by detector.
* 36 PHPUnit tests.

= 1.4.0 =
* Export endpoints for global variables and presets.

= 1.0.0 =
* Initial release.

== Upgrade Notice ==

= 1.7.0 =
Plugin renamed to "Divi5 Generator". The REST API namespace changed to `/wp-json/divi5-generator/v1/` — update any external tools that call the old `divi-tools/v1` endpoints. Auth header is now `X-D5G-Key`. Existing API keys are invalidated; regenerate from Settings → Divi5 Generator.
