===  Divi Tools Importer ===
Contributors: iconnectit
Tags: divi, divi 5, landing page, seo, import
Requires at least: 6.4
Tested up to: 6.8
Requires PHP: 8.1
Stable tag: 1.6.1
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

REST API endpoint for importing Divi 5 pages, SEO meta, and FAQ schema from Claude Code in a single request.

== Description ==

Divi Tools Importer closes the gap between Claude Code generating a Divi 5 landing page and that page appearing on your WordPress site — without WP-CLI, SSH, or manual copy-pasting.

**What it does:**

* Exposes a secure `POST /wp-json/divi-tools/v1/import` endpoint on your site
* Accepts a Divi 5 page JSON, SEO meta, and FAQ schema in one request
* Creates or updates a **draft** page with the Divi content
* Imports Divi 5 presets, global colours, and global variables automatically
* Writes the title tag and meta description to Yoast SEO or Rank Math
* Stores the FAQ schema and injects it as JSON-LD in the page `<head>` automatically — no manual pasting
* Returns a preview URL so you can review before publishing
* Logs every import in Settings → Divi Tools Importer

**Works on any host** — Kinsta, WP Engine, SiteGround, Flywheel, Local by WP Engine. No SSH, no WP-CLI required.

**How to use:**

1. Install and activate this plugin
2. Go to Settings → Divi Tools Importer
3. Copy your site URL and API key
4. Give those two values to Claude Code
5. Claude calls the endpoint — your page appears as a draft

**Compatible with:**

* Divi 5 (full import — presets, global colours, global variables)
* Yoast SEO, Rank Math, All in One SEO (AIOSEO), SEOPress, The SEO Framework — full SEO meta (title, description, focus + secondary keywords, OpenGraph, Twitter, canonical, robots directives) written to each plugin's native meta keys
* No SEO plugin (values stored in neutral post meta with a warning)

== Supported SEO plugins ==

The importer detects the active SEO plugin on every request and writes generated SEO values to that plugin's native post-meta keys, so an imported page is search-ready with zero manual cleanup. Detection order (override via the `dti/seo/adapter_order` filter):

| Plugin | Detection signal | Fields written |
|---|---|---|
| Rank Math | `RankMath\File` class | title, description, focus + secondary keywords, OG, Twitter, canonical, robots |
| Yoast SEO | `WPSEO_VERSION` | title, description, focus + secondary keywords, OG, Twitter, canonical, robots |
| All in One SEO | `AIOSEO_VERSION` | title, description, keyphrase (flat + JSON envelope), OG, Twitter, canonical, robots |
| SEOPress | `SEOPRESS_VERSION` | title, description, focus + secondary keyphrases, OG, Twitter, canonical, noindex |
| The SEO Framework | `THE_SEO_FRAMEWORK_VERSION` | title, description, OG, Twitter, canonical, robots (no native focus-keyword field — value stored in `_dti_seo_focuskw` for traceability) |
| *(none)* | — | title, description, focus keyword → neutral `_dti_seo_*` keys, with a warning |

== Installation ==

1. Upload the `divi-tools-importer` folder to `/wp-content/plugins/`
2. Activate via Plugins → Installed Plugins
3. Go to Settings → Divi Tools Importer to get your API key

== Frequently Asked Questions ==

= Is the endpoint secure? =

Yes. Every request requires an `X-Divi-Tools-Key` header matching a hashed key stored in your database. The key is never stored in plain text. There is also a rate limit of 30 requests per 60 seconds per IP.

= What if I don't have Divi 5? =

The content will still import — the page will be created with the raw Divi block content. Presets and global colours won't be imported (a warning is returned). Activate Divi 5 for full import.

= What if I don't have Yoast or Rank Math? =

SEO values are now written natively to whichever of Yoast, Rank Math, All in One SEO, SEOPress, or The SEO Framework is active. If none of those are installed, the values are stored in neutral post meta (`_dti_seo_title`, `_dti_seo_description`, `_dti_seo_focuskw`) and a warning is returned so you can set them manually.

= Can I publish immediately instead of creating a draft? =

Pass `"publish": true` in the request body. Default is always draft so you can review first.

= How do I regenerate my API key? =

Settings → Divi Tools Importer → Regenerate Key. Your old key stops working immediately.

== Changelog ==

= 1.6.1 =
* Fix: robots directives (noindex, nofollow) are now three-state — absent preserves the existing value, `true` sets it, `false` clears it. Previously a noindex set via import could not be cleared by re-importing (one-way ratchet).
* Fix: Rank Math robots JSON envelope was not decoded on re-import, so the read-merge-write started from empty each time (user-set advanced directives were lost on re-import).

= 1.6.0 =
* Full SEO meta persistence: focus keyword, secondary keywords, OpenGraph, Twitter, canonical, and robots directives now written to the active SEO plugin's native meta keys (previously only title + description were written).
* Added support for All in One SEO (AIOSEO), SEOPress, and The SEO Framework. Detection order: Rank Math → Yoast → AIOSEO → SEOPress → TSF → neutral fallback.
* `GET /ping` now reports the active SEO plugin via `seo_plugin` (one of `rank_math`, `yoast`, `aioseo`, `seopress`, `tsf`, or `null`).
* `POST /import` response's `seo_plugin` field is now an object: `{ "plugin": "yoast", "fields_written": ["title","description","focusKeyword","og.title"] }` (was previously a bare string). Consumers reading the legacy string should switch to `seo_plugin.plugin`.
* Expanded the accepted `seo` payload with optional `focusKeyword`, `secondaryKeywords[]`, `og{}`, `twitter{}`, `canonical`, `robots{}`. Legacy `{title, description, slug, keyword}` payloads keep working unchanged.
* Adapter architecture: each SEO plugin is one class under `src/Seo/`, selected by `DTI_Seo_Detector`. Override the detection order via the `dti/seo/adapter_order` filter.
* Added PHPUnit test suite (36 tests) covering the normaliser, detector precedence, every adapter's key map, AIOSEO JSON-envelope merge, and legacy-payload regression. The zip build script runs the suite and aborts on failure.

= 1.4.0 =
* Export endpoints for global variables and presets (GET /global-variables/export, GET /presets/export)
* Brand extract and deploy routes in the companion app

= 1.0.0 =
* Initial release

== Upgrade Notice ==

= 1.6.0 =
Adds full SEO meta (focus keyword, OpenGraph, Twitter, canonical, robots) and support for AIOSEO, SEOPress, and The SEO Framework. The `seo_plugin` field in the import response is now an object `{ plugin, fields_written }` — update any consumer that read it as a string.
