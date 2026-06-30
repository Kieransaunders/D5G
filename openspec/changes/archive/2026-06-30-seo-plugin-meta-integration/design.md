## Context

The Divi Tools Importer (`plugin/divi-tools-importer/`) is a small WordPress plugin that accepts a generated Divi 5 layout plus a `seo` sidecar via `POST /wp-json/divi-tools/v1/import`. Today, `DTI_SeoWriter::write()` (`src/SeoWriter.php`, ~50 lines) hard-codes three behaviours:

1. If `WPSEO_VERSION` is defined → write `_yoast_wpseo_title` and `_yoast_wpseo_metadesc`.
2. Else if `RankMath` class exists → write `rank_math_title` and `rank_math_description`.
3. Else → fall back to `_dti_seo_title` / `_dti_seo_description`.

This ignores the **focus keyword** that the generator already emits in `*-seo-meta.json`, ignores **OpenGraph / Twitter / canonical / robots** entirely, and supports only **two** of the five common WordPress SEO plugins. The generator's SEO investment is silently lost on AIOSEO / SEOPress / The SEO Framework sites.

The `seo` payload schema is not documented anywhere; consumers (the `import-to-local` skill, `app/server.js`) only know about `{title, description, slug}` from convention.

Constraints:
- The plugin is distributed as an installable zip built on demand by `skills/import-to-local/scripts/build-plugin-zip.sh`; there is no auto-update channel.
- All persistence MUST use `update_post_meta()` — no direct DB writes for SEO (unlike `post_content`, which bypasses `wp_kses_post` for valid reasons; SEO meta is plain strings).
- Detection MUST be cheap (≤ 1ms) and side-effect-free; it runs on every `/ping` and `/import`.
- Existing payloads (`{title, description}` only) MUST keep working unchanged.

## Goals / Non-Goals

**Goals:**
- Persist the **full** generated SEO sidecar (title, description, focus keyword, secondary keywords, OpenGraph, Twitter, canonical, robots) into whichever SEO plugin is active.
- Support the **five** mainstream WordPress SEO plugins: Yoast, Rank Math, All in One SEO (AIOSEO), SEOPress, The SEO Framework (TSF).
- Make adding a sixth plugin a **one-class change** via an adapter pattern.
- Detect and report the active plugin in `GET /ping` so the importer skill can warn the user pre-import.
- Document the `seo` payload schema in one canonical place, consumed by the generator skill and the import skill.

**Non-Goals:**
- **No XML sitemap generation or ping.** That is the SEO plugin's job.
- **No content analysis / SEO scoring** (Yoast's red/orange/green bulb). We only persist values; the plugin computes scores.
- **No schema.org / JSON-LD changes.** Schema is already handled by `SchemaInjector.php` and is orthogonal to SEO-plugin meta.
- **No multisite / network-wide logic.** Single-site only.
- **No REST endpoints to *read* SEO meta back** beyond what `PagesLister` already exposes for the `design_hint`. (Reading full SEO back is a future change if asked.)
- **No GUI / admin settings page changes.** Detection is automatic.

## Decisions

### D1. Adapter pattern with a single interface — one file per plugin

Introduce a `DTI_Seo_Adapter` interface and one implementing class per plugin, all in a new `src/Seo/` namespace directory:

```
src/Seo/
  Adapter.php          (interface: detect(), write(int $page_id, array $seo): array)
  Detector.php         (returns the first matching Adapter instance, or Fallback)
  Yoast.php
  RankMath.php
  AIOSEO.php
  SEOPress.php
  TSF.php
  Fallback.php         (writes _dti_seo_* — current behaviour)
```

`DTI_SeoWriter::write()` becomes a thin facade that calls `Detector::resolve()` then delegates — preserving the call site in `PageImporter` and keeping the public surface stable during refactor.

**Why not extend the existing `if/else` chain?** A fifth and sixth `if` block makes the method unmaintainable, and the OG/Twitter/canonical branching multiplies each block's size 3-4×. Adapters isolate per-plugin quirks (AIOSEO's JSON envelope, SEOPress's `_seopress_titles_title` prefix) in one place.

**Why a directory per-namespace vs. a single `SeoWriters.php` file?** PSR-4 is not enforced (this plugin uses a flat `Class` → `src/Class.php` mapper via the main plugin file's `require_once` chain). We'll mirror that convention — one file per adapter — and `require_once` them from `divi-tools-importer.php` alongside the existing loads. No autoloader introduced.

**Alternatives considered:**
- *Hook-based (`add_filter('dti/seo/write', ...)`)*: flexible but spreads the logic across consumer plugins, which we don't control. Rejected — we are the only consumer.
- *A single `SeoWriter::write()` with a plugin-keyed dispatch table*: simpler, but loses the per-plugin field-name isolation. Rejected for the same reason as the if-chain.

### D2. Detection order and signals

`Detector::resolve()` checks plugins in this fixed order and returns the first match:

| Order | Plugin | Signal |
|---|---|---|
| 1 | Rank Math | `class_exists('RankMath\File')` (the canonical entry class; `RankMath` itself is sometimes lazy-loaded) |
| 2 | Yoast | `defined('WPSEO_VERSION')` |
| 3 | AIOSEO | `defined('AIOSEO_VERSION')` or `class_exists('AIOSEO\Plugin\AIOSEO')` |
| 4 | SEOPress | `defined('SEOPRESS_VERSION')` or `function_exists('seopress_get_option')` |
| 5 | TSF | `defined('THE_SEO_FRAMEWORK_VERSION')` |
| 6 | Fallback | always matches |

**Why Rank Math before Yoast?** Sites occasionally have *both* installed during migration (one disabled, one active). Rank Math's "import-and-replace Yoast" onboarding is the more common direction; if Rank Math's classes are loaded, it is the active plugin. The order is otherwise arbitrary and reversible via filter — we'll expose `dti/seo/adapter_order` so users with non-standard setups can reorder without editing code.

**Why not use `is_plugin_active()`?** That requires loading `plugin.php` and assumes a known plugin basename per install. Class/constant checks are cheaper and work on VIP / bedrock / composer-managed sites where the plugin path differs.

### D3. Expanded `seo` payload schema (additive only)

The `seo` object accepted by `POST /import` and `POST /preview` gains optional fields. All existing fields keep working; everything new is opt-in:

```jsonc
{
  // existing — unchanged
  "title":          "Invoice Software for Small Business",   // or "titleTag"
  "description":    "Acme Invoice lets you…",                  // or "metaDescription"
  "slug":           "invoice-software",
  "keyword":        "invoice software",                        // existing alias

  // new — all optional, all ignored if absent
  "focusKeyword":   "invoice software",                        // canonical name (keyword is kept as alias)
  "secondaryKeywords": ["invoicing tool", "small business billing"],
  "og": {
    "title":       "Invoice Software — Acme",
    "description": "Send your first invoice in 60 seconds.",
    "image":       "https://cdn.acme.com/og/invoice.png"
  },
  "twitter": {
    "title":       "Invoice Software — Acme",
    "description": "Send your first invoice in 60 seconds.",
    "image":       "https://cdn.acme.com/og/invoice.png"
  },
  "canonical":     "https://acme.com/invoice-software",
  "robots": {
    "noindex":     false,
    "nofollow":    false,
    "advanced":    ""                                          // e.g. "noimageindex, nosnippet"
  }
}
```

**Alias resolution rule:** the writer normalises inputs once, in this priority order: `titleTag` > `title`; `metaDescription` > `description`; `focusKeyword` > `keyword`. Empty/absent optional fields are silently skipped — they never overwrite a value the user set manually in the SEO plugin UI.

**Why not nest everything under `seo.meta.*`?** Backward compatibility — `{title, description, slug, keyword}` is the documented shape in `import-to-local/SKILL.md`. Renaming would break every existing `payload.json` on disk in `~/Desktop/Divi5 Pages`.

### D4. Per-plugin meta key map (the contract)

Each adapter maps the normalised payload to its plugin's native post-meta keys. The full map is the implementation detail, but the canonical targets are:

| Field | Yoast | Rank Math | AIOSEO | SEOPress | TSF |
|---|---|---|---|---|---|
| title | `_yoast_wpseo_title` | `rank_math_title` | `_aioseo_title` (and `_aioseo_posts_data.title`) | `_seopress_titles_title` | `_genesis_title` |
| description | `_yoast_wpseo_metadesc` | `rank_math_description` | `_aioseo_description` | `_seopress_titles_desc` | `_genesis_description` |
| focus kw | `_yoast_wpseo_focuskw` + `_yoast_wpseo_focuskeys` (extras) | `rank_math_focus_keyword` + `rank_math_focus_keywords` (extras, JSON array) | `_aioseo_focus_keyphrase` + `_aioseo_posts_data.keyphrases.focus_page` JSON | `_seopress_analysis_target_kw` | `_primary_term_tsf`* |
| og:title | `_yoast_wpseo_opengraph-title` | `rank_math_facebook_title` | `_aioseo_posts_data.og.title` JSON | `_seopress_social_og_title` | `_social_title_fb` |
| twitter:title | `_yoast_wpseo_twitter-title` | `rank_math_twitter_title` | `_aioseo_posts_data.twitter.title` JSON | `_seopress_social_twitter_title` | `_social_title_t` |
| canonical | `_yoast_wpseo_canonical` | `rank_math_canonical_url` | `_aioseo_posts_data.canonical_url` JSON | `_seopress_titles_canonical` | `_canonical` |
| noindex | `_yoast_wpseo_meta-robots-noindex` (`1`) | `rank_math_robots\index` (`noindex`) | `_aioseo_posts_data.robots.default.noindex` JSON | `_seopress_titles_indexing` (`yes`/`no`) | `_genesis_noindex` |

*TSF has no native "focus keyword" field in the free version; we persist it to a custom `_dti_seo_focuskw` key for traceability and skip silently if absent.

**AIOSEO ≥ 4.x JSON envelope:** AIOSEO stores most post-level settings inside a single `_aioseo_posts_data` JSON meta. The adapter reads the existing JSON (or `{}`), merges the supplied keys, and writes it back atomically. Classic `_aioseo_title` / `_aioseo_description` are also written for back-compat with AIOSEO ≤ 3.x and with templates that read the flat keys.

### D5. Return shape from the adapter (and from `write()`)

`Adapter::write()` returns `array{ plugin: string, fields_written: string[] }`, e.g. `["plugin" => "yoast", "fields_written" => ["title","description","focusKeyword","og.title"]]`. `DTI_SeoWriter::write()` returns the same array. `PageImporter` passes it straight through as the `seo_plugin` field of the import response (changing its shape from a string to an object — flagged **BREAKING** in the proposal, consumed only inside this repo).

### D6. Reporting in `GET /ping`

`/ping` currently returns `{ status: "ok", divi: bool, versions: {...} }`-ish. Add `seo_plugin: string|null` (the detector's `id()`, or `null` when only Fallback matched). The import skill reads this to decide whether to warn the user pre-import.

## Risks / Trade-offs

- **[Plugin version skew]** A future Yoast/AIOSEO release could rename a meta key. → *Mitigation:* all keys are private (`_*`) and plugin-internal; the major SEO plugins commit to meta-key stability across releases (it would break their own REST API). Each adapter is one file, so a fix is a one-line edit + zip rebuild. Add a per-adapter constant `MIN_PLUGIN_VERSION` and skip writing (with a warning) if the detected version is older than the one the key map was verified against.
- **[Double-write on AIOSEO]** Writing both `_aioseo_title` (flat) and `_aioseo_posts_data` (JSON) could let the two drift if AIOSEO reads only one. → *Mitigation:* AIOSEO 4.x reads from `_aioseo_posts_data`; the flat keys are belt-and-braces. Document in the adapter docblock. Verify on AIOSEO 4.2+ during implementation.
- **[Two SEO plugins active]** Unusual but possible during migration. → *Mitigation:* D2 detection order is deterministic; expose `dti/seo/adapter_order` filter for overrides. Log which adapter won in the import response.
- **[Overwriting user-set values]** If the user manually tuned the SEO in WP Admin and then re-imports, our write would clobber it. → *Mitigation:* the import flow already updates the *same page* in place by slug (a deliberate design choice — re-imports are the refine loop). Document this explicitly in the import skill: *re-importing overwrites SEO meta by design*. No code change needed, but call it out.
- **[Payload size growth]** Adding OG/Twitter/canonical can roughly double the `seo` sidecar size for image-heavy pages. → *Mitigation:* still well under any sane REST body limit (tens of KB). No action.
- **[No tests for new adapters]** The plugin currently has no PHPUnit suite. → *Mitigation:* ship a `tests/SeoAdaptersTest.php` covering the normalisation + key-map logic (pure functions, no WP needed) plus a `tests/AdapterDetectionTest.php` that fakes `defined()` constants. Wire into the zip-build step so a red test blocks the release zip.

## Migration Plan

1. **Ship** as plugin version `1.6.0` (current: `1.5.4`). Bump `divi-tools-importer.php` header + `DTI_VERSION` constant + `readme.txt` Stable tag and changelog.
2. **No DB migration** — there is no schema change. Old `_dti_seo_*` keys remain readable by `PagesLister` for back-compat.
3. **User rollout:** rebuild the zip (`build-plugin-zip.sh`), upload via WP Admin → Plugins → Add New → Upload → replace existing. No data loss; next import populates the new fields.
4. **Rollback:** deactivate `1.5.0`, re-upload `1.4.x` zip. Already-written native meta keys stay in the SEO plugin's UI; subsequent imports under 1.4.x simply won't refresh focus-keyword/OG/etc. No corruption path.
5. **Skill updates** ship in the same change: `import-to-local/SKILL.md` documents the new `seo_plugin` response shape and `ping` field; `divi5-page-generator/SKILL.md` + `references/seo.md` document the expanded `*-seo-meta.json` schema.

## Open Questions

- **Q1.** Should `PagesLister::design_hint` read focus-keyword for the hint when no title is present, or stay title-only? *Default for now:* title-only (no behaviour change). Revisit if users ask for keyword-based filtering in `GET /pages`.
- **Q2.** Do we want a `DELETE /seo?slug=…` convenience endpoint to clear all SEO meta for a page in one call? *Default:* no — out of scope. Users can do this in the SEO plugin UI. Add only if a workflow need arises.
- **Q3.** For SEOPress, the title/description meta keys carry the `_seopress_titles_` prefix; should we also write the legacy `_seopress_meta_title` (deprecated in SEOPress 5)? *Default:* yes, both, until SEOPRESS_VERSION ≥ 7 (then drop the legacy key).
