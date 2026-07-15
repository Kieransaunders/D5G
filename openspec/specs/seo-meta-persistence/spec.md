# SEO Meta Persistence

The Divi Tools Importer persists the full generated SEO sidecar (title, description,
focus + secondary keywords, OpenGraph, Twitter, canonical, robots) into whichever SEO
plugin is active on the target site — Yoast, Rank Math, All in One SEO, SEOPress, or The
SEO Framework — falling back to neutral `_dti_seo_*` post meta when none are active, and
reporting exactly which fields were written.

### Requirement: SEO plugin detection

The importer SHALL detect which WordPress SEO plugin is active on the target site by checking well-known PHP classes and constants, in this fixed priority order: Rank Math, Yoast, All in One SEO (AIOSEO), SEOPress, The SEO Framework. When none of those are active, the importer SHALL report `null` (fallback mode). Detection MUST be side-effect-free and MUST NOT load plugin files, call plugin APIs, or write to the database.

#### Scenario: Rank Math active
- **WHEN** `Rank Math\File` class exists at import time
- **THEN** the detector SHALL report `rank_math` regardless of whether Yoast is also installed

#### Scenario: Only Yoast active
- **WHEN** `WPSEO_VERSION` is defined and no higher-priority SEO plugin class exists
- **THEN** the detector SHALL report `yoast`

#### Scenario: AIOSEO active
- **WHEN** `AIOSEO_VERSION` is defined (or `AIOSEO\Plugin\AIOSEO` class exists) and no higher-priority SEO plugin is active
- **THEN** the detector SHALL report `aioseo`

#### Scenario: SEOPress active
- **WHEN** `SEOPRESS_VERSION` is defined (or `seopress_get_option` function exists) and no higher-priority SEO plugin is active
- **THEN** the detector SHALL report `seopress`

#### Scenario: The SEO Framework active
- **WHEN** `THE_SEO_FRAMEWORK_VERSION` is defined and no higher-priority SEO plugin is active
- **THEN** the detector SHALL report `tsf`

#### Scenario: No supported SEO plugin active
- **WHEN** none of the supported plugin signals are present
- **THEN** the detector SHALL report `null` (fallback mode) and the importer SHALL persist SEO values to neutral `_dti_seo_*` post meta

#### Scenario: Detection order is overridable
- **WHEN** a filter callback is registered on `dti/seo/adapter_order` returning a reordered array of plugin ids
- **THEN** the detector SHALL evaluate plugins in the supplied order instead of the default order

### Requirement: Ping reports active SEO plugin

The `GET /wp-json/divi5-generator/v1/ping` response SHALL include a `seo_plugin` field whose value is the detected plugin id (`yoast`, `rank_math`, `aioseo`, `seopress`, `tsf`) or `null` when no supported SEO plugin is active.

#### Scenario: Ping with Yoast installed
- **WHEN** the client calls `GET /ping` on a site where Yoast is active
- **THEN** the JSON response SHALL contain `"seo_plugin": "yoast"`

#### Scenario: Ping with no SEO plugin
- **WHEN** the client calls `GET /ping` on a site with no supported SEO plugin
- **THEN** the JSON response SHALL contain `"seo_plugin": null`

### Requirement: SEO payload schema

The `seo` object accepted by `POST /import` and `POST /preview` SHALL accept the following fields. All fields are optional; payloads containing only legacy fields (`title`, `description`, `slug`, `keyword`, and the `titleTag` / `metaDescription` aliases) SHALL continue to import without error and with identical behaviour to the previous plugin version.

- `title` (string) — or alias `titleTag`
- `description` (string) — or alias `metaDescription`
- `slug` (string)
- `focusKeyword` (string) — canonical name; `keyword` is treated as a backward-compatible alias
- `secondaryKeywords` (string[])
- `og` (object) — optional keys: `title`, `description`, `image`
- `twitter` (object) — optional keys: `title`, `description`, `image`
- `canonical` (string URL)
- `robots` (object) — optional keys: `noindex` (bool), `nofollow` (bool), `advanced` (string)

#### Scenario: Legacy payload still accepted
- **WHEN** the importer receives `{ "layout": ..., "seo": { "title": "T", "description": "D", "slug": "s" }, "status": "publish" }`
- **THEN** the import SHALL succeed and SHALL persist title and description exactly as in plugin version 1.4.x

#### Scenario: Field alias resolution
- **WHEN** the `seo` object contains `titleTag` but not `title`
- **THEN** the importer SHALL treat `titleTag` as the title value
- **WHEN** the `seo` object contains both `focusKeyword` and `keyword`
- **THEN** the importer SHALL use `focusKeyword` and ignore `keyword`

#### Scenario: Optional fields absent
- **WHEN** the `seo` object omits `og`, `twitter`, `canonical`, and `robots`
- **THEN** the importer SHALL NOT modify any pre-existing OpenGraph, Twitter, canonical, or robots meta for that post

### Requirement: Persist SEO meta to the active plugin's native keys

When a supported SEO plugin is active, the importer SHALL persist every supplied SEO field to that plugin's native post-meta keys, using the canonical key map defined in the change design. When the plugin's storage uses a JSON envelope (e.g. AIOSEO `_aioseo_posts_data`), the adapter SHALL merge into any existing JSON rather than overwriting it. Empty or absent fields SHALL be skipped — they MUST NOT overwrite values the user set manually in the SEO plugin's UI.

#### Scenario: Yoast full payload
- **WHEN** the active plugin is Yoast and the `seo` payload contains title, description, focusKeyword, and og.title
- **THEN** the importer SHALL write `_yoast_wpseo_title`, `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`, and `_yoast_wpseo_opengraph-title` for the imported page

#### Scenario: Rank Math with secondary keywords
- **WHEN** the active plugin is Rank Math and the payload contains `focusKeyword` and `secondaryKeywords: ["a","b"]`
- **THEN** the importer SHALL write `rank_math_focus_keyword` with the primary keyword and `rank_math_focus_keywords` containing the full set as JSON

#### Scenario: AIOSEO JSON envelope merge
- **WHEN** the active plugin is AIOSEO and the page already has `_aioseo_posts_data` meta with a keyphrase set by the user
- **WHEN** the incoming payload contains only title and description
- **THEN** the importer SHALL preserve the existing keyphrase in `_aioseo_posts_data` and SHALL only update the title and description keys

#### Scenario: Unknown field for plugin
- **WHEN** the active plugin is The SEO Framework and the payload contains `focusKeyword`
- **THEN** the importer SHALL persist it to a neutral `_dti_seo_focuskw` key for traceability (TSF free has no native focus-keyword field) and SHALL NOT error

#### Scenario: No SEO plugin active
- **WHEN** detection returns `null` and the payload contains title, description, and focusKeyword
- **THEN** the importer SHALL write `_dti_seo_title`, `_dti_seo_description`, and `_dti_seo_focuskw` for the page

### Requirement: Robots directives are three-state (set, clear, preserve)

The `robots.noindex` and `robots.nofollow` fields SHALL follow three-state semantics to avoid a one-way ratchet where a directive can be set via import but never cleared:

- **Absent from payload** → the adapter SHALL NOT touch the corresponding plugin meta key, preserving any existing value (whether set by a previous import or manually by the user in the SEO plugin UI).
- **Present and `true`** → the adapter SHALL write the plugin's "noindex"/"nofollow" value.
- **Present and `false`** → the adapter SHALL clear the directive: delete the meta key (Yoast, TSF) or set it to the plugin's "index"/"follow" value (Rank Math, AIOSEO, SEOPress), restoring the page to indexable/followable state.

The `robots.advanced` field remains write-only-when-non-empty (sending an empty string does NOT clear it — documented minor limitation).

#### Scenario: Clear a previously-set noindex
- **WHEN** a page was imported with `robots.noindex: true` (page is noindexed), then the same slug is re-imported with `robots.noindex: false`
- **THEN** the importer SHALL clear the noindex directive so the page returns to indexable, and `fields_written` SHALL include `robots.noindex`

#### Scenario: Absent robots field preserves existing directive
- **WHEN** a page was imported with `robots.noindex: true`, then the same slug is re-imported with a payload that omits the `robots` object entirely
- **THEN** the importer SHALL NOT modify the existing noindex directive — the page remains noindexed

#### Scenario: Clear only one directive
- **WHEN** a page has both noindex and nofollow set, and is re-imported with `robots: {noindex: false}` (nofollow absent)
- **THEN** the importer SHALL clear noindex only and SHALL preserve the existing nofollow directive

### Requirement: Import response reports SEO write outcome

The `POST /import` response SHALL include a `seo_plugin` field of shape `{ plugin: string|null, fields_written: string[] }`. `fields_written` SHALL list the logical field names that were persisted (e.g. `["title","description","focusKeyword","og.title"]`), not the underlying meta keys. When no fields were written (empty SEO payload), `fields_written` SHALL be an empty array.

#### Scenario: Full payload imported under Yoast
- **WHEN** a payload with title, description, focusKeyword, and og.title is imported on a Yoast site
- **THEN** the response SHALL contain `"seo_plugin": { "plugin": "yoast", "fields_written": ["title","description","focusKeyword","og.title"] }`

#### Scenario: Empty SEO payload
- **WHEN** the request body's `seo` field is `{}` or absent
- **THEN** the response SHALL contain `"seo_plugin": { "plugin": "<detected-or-null>", "fields_written": [] }`

### Requirement: Plugin-adapter extensibility

The SEO persistence logic SHALL be organised as one adapter class per supported plugin behind a shared interface, plus a Fallback adapter. Adding support for a new SEO plugin SHALL require: (a) one new adapter class, (b) one entry in the detector's ordered list. It SHALL NOT require modifying any other adapter or the import flow.

#### Scenario: Adding a new plugin adapter
- **WHEN** a developer adds a new class implementing the SEO adapter interface and registers it in the detector
- **THEN** the existing Yoast, Rank Math, AIOSEO, SEOPress, TSF, and Fallback adapters SHALL remain unchanged and SHALL continue to pass their existing tests

### Requirement: No overwrite of pre-existing SEO on re-import is undocumented

Re-importing a page with the same slug SHALL overwrite that page's SEO meta with the incoming payload's values. This matches the existing refine-loop behaviour for layout and presets. This overwrite semantics SHALL be documented in the `divi5-deploy` skill so the user is aware before re-importing over a manually-tuned page.

#### Scenario: Re-import over manually edited SEO
- **WHEN** a page was imported with title "A", then the user manually changed the title in Yoast to "B", then the same slug is re-imported with title "A"
- **THEN** the page's Yoast title SHALL be "A" after the re-import, and the import skill SHALL have warned the user that re-import overwrites SEO meta
