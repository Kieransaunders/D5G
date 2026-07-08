---
name: divi5-deploy
description: "Deploy generated Divi 5 content to any WordPress site (local or hosted) via the Divi5 Generator REST API — publish pages/sections as live pages, preview them in real Divi 5, screenshot and verify, persist SEO meta, manage draft pages, and create/list/auto-place navigation menus. Use when importing, publishing, previewing, or deploying a generated Divi 5 page into WordPress, or when creating a WordPress nav menu from generated pages. Triggers: import divi page, deploy divi page, publish divi landing page, preview divi page, live preview divi, import divi hosted, localwp import, create wordpress menu, divi navigation menu, nav menu from pages, auto-place pages in menu, list divi menus, delete divi draft, manage divi pages."
argument-hint: "[site-url] [api-key]  — or omit to be prompted"
---

# Divi 5 Deploy

Deploy generated Divi 5 content to any WordPress site and act on the result. This skill closes the loop on **pages** (validate → preview → import → publish → screenshot → verify) and also manages **navigation menus** (create, list, auto-place generated pages into a menu). Works on **any host** — Local, Kinsta, WP Engine, SiteGround, Flywheel — no SSH or WP-CLI required.

Every call below hits the Divi5 Generator REST API (`/wp-json/divi5-generator/v1/`) with the `X-D5G-Key` header. Pages, previews, draft management, and menus all use the same site URL + API key.

## Pre-requisite

The **Divi5 Generator** plugin must be installed and active on the target site.

The plugin ships as unpacked source under `plugin-src/` (a bundled `.zip` can't live inside a Claude Code plugin — the installer rejects nested zips). Build the installable zip on demand:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/build-plugin-zip.sh" ~/Downloads
```

It prints the path to the finished zip (e.g. `~/Downloads/divi5-generator.zip`). Tell the user:

> "I've built the plugin zip at `~/Downloads/divi5-generator.zip`. Install it via **WordPress Admin → Plugins → Add New → Upload Plugin**, then activate it."

After activation they go to **Settings → Divi5 Generator** to copy their site URL and API key.

## Output location

This skill reads a generated layout and writes temporary payloads (`payload.json`, `preview-payload.json`). All of these live in the **Divi5 output folder**, never the plugin repo: `process.env.DIVI5_OUT` if set, otherwise `~/Desktop/Divi5 Pages`. Run shell steps from there so bare filenames resolve:

```bash
cd "${DIVI5_OUT:-$HOME/Desktop/Divi5 Pages}"
```

## Non-negotiable rules

1. **Publish on import, always.** Always pass `"status": "publish"` — never draft. Divi draft previews require WP login and do not fully render presets or CSS. The only way to verify a page is designed correctly is to see it live. After the quality loop is complete, the user can unpublish manually if needed.
2. **Screenshot immediately after import.** Use Playwright MCP to take a full-page screenshot of the live URL. Compare it against the Stage 2 HTML mockup and fix any render errors before reporting success.
3. **Never touch any page other than the one keyed to this import's slug.**
4. **Validator FAILs block import** — run `landing-page`'s `scripts/validate.js` first; fix all FAILs before sending. WARNs are reported but don't block.
5. **Refinements amend the run's `generate-*.js` and regenerate** — never hand-edit the JSON.
6. **Re-runs with the same slug update the same page in place.** No page litter. Note: re-importing **overwrites the page's SEO meta** with the incoming payload's values (matching the refine-loop behaviour for layout/presets). If the user manually tuned title/description/keywords in the SEO plugin UI between imports, warn them before re-importing — those manual edits will be replaced by the regenerated sidecar's values.
7. **Never log or store the API key.** Use it only in the request header.

---

## Workflow

### 1. Resolve inputs

**Layout JSON** — explicit path if given; otherwise the most recent `*-landing-page.json` or `*-section.json` in the output folder (`${DIVI5_OUT:-~/Desktop/Divi5 Pages}`). Confirm if ambiguous.

Check the `context` field to determine import type:
- `"context": "et_builder"` → **page import** (standard flow below)
- `"context": "et_builder_layouts"` → **section/library import** — use the same `/import` endpoint; the plugin handles both contexts. Remind the user to import via **Divi Library → Import → check "Import Presets"**, not via page import. Skip SEO and schema steps (not applicable to sections).

**SEO meta** — matching `*-seo-meta.json` if present. Keys used: `title`/`titleTag`, `description`/`metaDescription`, `slug`, `keyword`.

**Schema** — matching `*-schema.json` if present. Sent as-is; the plugin stores it and auto-injects it into `<head>` by slug.

**Site URL + API key** — from `$ARGUMENTS`, or ask via AskUserQuestion:
- "What is your WordPress site URL?" (e.g. `https://mysite.com` or `http://mysite.local`)
- "What is your Divi5 Generator API key?" (starts with `d5gk_`)

### 2. Validate

```bash
node <CLAUDE_SKILL_DIR>/../landing-page/scripts/validate.js <layout.json> \
  --keyword "<keyword from seo-meta>" \
  --meta <seo-meta.json>
```

Show the report. Stop on any FAIL — hand back to `landing-page` skill to fix.

### 2.5. Live preview (fidelity gate — before full import)

Build a temporary payload with just the layout:

```bash
node -e "
const l = JSON.parse(require('fs').readFileSync('<layout.json>','utf8'));
require('fs').writeFileSync('preview-payload.json', JSON.stringify({layout:l}));
"
```

POST it to the preview endpoint:

```bash
curl -s -X POST "<site-url>/wp-json/divi5-generator/v1/preview" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: <api-key>" \
  -d @preview-payload.json
```

Parse the response and open the `preview_url` in the browser:

```bash
open "<preview_url>"
```

This renders the page via **real Divi 5** — full presets, global colours, animations, responsive breakpoints — without creating a named page. The preview overwrites a fixed draft (`dti-live-preview`) each time, so there is no page litter.

Wait for the user's verdict:

| Verdict | Action |
|---|---|
| **Approved** | Proceed to Step 3 (full `/import`) |
| **Refine** | Hand back to `landing-page` skill — fix `generate-*.js`, regenerate, re-validate, re-preview |

### 3. Ping the site

```bash
curl -s "<site-url>/wp-json/divi5-generator/v1/ping?d5g_key=<api-key>"
```

Check the response:
- `status: "ok"` → proceed
- HTTP 401 → wrong key, ask the user to check Settings → Divi5 Generator
- HTTP 404 → plugin not active, ask user to activate it
- Connection refused / timeout → site is down or URL is wrong

> **Where this runs:** every call below curls the target site. If you're in an environment that can't reach `localhost` (e.g. a sandboxed/Cowork session, which can't reach the user's Mac at `localhost:10024`), target a **public** URL or drive the site via the browser extension instead. Under Claude Code on the Mac, `localhost` works fine.

Report what was detected: the `seo_plugin` field in the ping response names the active SEO plugin (one of `rank_math`, `yoast`, `aioseo`, `seopress`, `tsf`, or `null`). The importer writes the full SEO sidecar — title, description, focus + secondary keywords, OpenGraph, Twitter, canonical, and robots directives — to whichever plugin is active, using its native post-meta keys. **If `seo_plugin` is `null`** (no supported plugin installed), D5G falls back to neutral `_d5g_seo_*` keys and stores/injects schema by slug — nothing is lost, but the SEO plugin UI won't show the values until one is installed.

### 4. Build the payload and import

Assemble `payload.json` in the output folder (`${DIVI5_OUT:-~/Desktop/Divi5 Pages}`):

```json
{
  "layout":  <contents of layout JSON>,
  "seo":     <contents of seo-meta JSON, or {}>,
  "schema":  <contents of schema JSON, or {}>,
  "status":  "publish"
}
```

Send it:

```bash
curl -s -X POST "<site-url>/wp-json/divi5-generator/v1/import" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: <api-key>" \
  -d @payload.json
```

Parse the JSON response. On error:
- `401` → invalid key
- `422` → layout validation failed (show `message`)
- `429` → rate limited, wait 60s and retry
- `500` → server error (show `message`)

### 5. Screenshot and verify

Immediately after a successful import, take a full-page screenshot of the live URL using Playwright:

```
mcp__plugin_playwright_playwright__browser_navigate → <permalink>
mcp__plugin_playwright_playwright__browser_take_screenshot → fullPage: true
```

Compare against the Stage 2 HTML mockup. Look for:
- Correct section order and background colours
- Buttons styled (not default blue)
- Grid rendering correctly (not stacked/broken)
- Images loading
- Fonts applying

Fix any hard FAILs (see Stage 4 in `divi5-page-generator` for root causes and fixes) before reporting to the user.

### 6. Present the report

Show the user:
- Page action (created / updated), slug, status
- Screenshot of the live page
- What was imported: presets, global colours, global variables
- **SEO:** the `seo_plugin` field of the import response is `{ plugin, fields_written }`. `plugin` is the active SEO plugin's id (`rank_math` / `yoast` / `aioseo` / `seopress` / `tsf`) or `null` when none is active. `fields_written` lists which logical SEO fields landed in the plugin (e.g. `["title","description","focusKeyword","og.title"]`). If `plugin` is `null`, surface the warning to the user.
- Any render issues found and fixed
- Live URL: `<site-url>/<slug>/`

### 7. Decide

| Verdict | Action |
|---|---|
| **Looks good** | Done — live URL delivered. User can unpublish manually if needed. |
| **Refine** | Take feedback, amend `generate-*.js`, regenerate, re-validate, re-import, re-screenshot. |
| **Re-import** | User edited the script: validate then import again (same slug → updates in place). |
| **Rewrite** | Hand back to `landing-page` skill with amended brief. |

---

## Publish flow (after accept)

```bash
curl -s -X POST "<site-url>/wp-json/divi5-generator/v1/import" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: <api-key>" \
  -d @payload.json  # same payload with "publish": true
```

Confirm the live URL: `<site-url>/<slug>/`

---

## Iterate without litter — list & delete draft pages

When refining a page across several rounds, drafts pile up on the site. Two endpoints (plugin ≥ 1.3.0) let you list and delete previously-imported pages so you can keep iterating on one clean draft.

### List imported pages

```bash
curl -s "<site-url>/wp-json/divi5-generator/v1/pages" \
  -H "X-D5G-Key: <api-key>"
```

Returns an array:

```json
[
  { "slug": "invoice-software", "title": "Invoice Software for Small Business",
    "status": "draft", "modified": "2026-06-23 10:14:00",
    "permalink": "<site-url>/?page_id=42", "design_hint": "Acme" }
]
```

`design_hint` is the brand/keyword from the page's SEO meta (Yoast/RankMath) if present — handy for spotting which drafts belong to which brand.

### Delete a draft page

```bash
curl -s -X DELETE "<site-url>/wp-json/divi5-generator/v1/pages/<slug>" \
  -H "X-D5G-Key: <api-key>"
```

The slug goes in the **path**, not as a query param — e.g. `/pages/invoice-software`, not `/pages?slug=invoice-software` (the query-param form returns 404 `rest_no_route`).

Returns `{ "deleted": "invoice-software", "id": 123 }`. **Safety:** the endpoint refuses with HTTP `409` if the page is `publish`ed — it never deletes a live page. Trash a published page manually in WP Admin if you really mean to.

### Suggested workflow

1. `GET /pages` → see your drafts (+ their `design_hint`).
2. Re-import your refined layout against the same `slug` → updates the existing draft in place (no new page created).
3. Only delete when you want to start clean for that slug: `DELETE /pages?slug=…`.
4. `GET /pages` again to confirm.

---

## Navigation menus (plugin ≥ 1.8.0)

Create, list, and auto-fill WordPress navigation menus from the generated pages. Three endpoints, same `X-D5G-Key` auth as page import.

### Resolve inputs

- **Site URL + API key** — same as the page flow (step 1 above). If you already resolved them for a page import in this session, reuse them.
- **Menu name** — required for create and auto-place. Confirm with the user if not given.
- **Theme location** (optional) — a registered nav menu location slug from the active theme (e.g. `primary`, `footer`). The plugin checks the theme's registered locations; a bad location creates the menu anyway and returns a warning.
- **Pages** — for auto-place, gather `{page_id, title}` pairs. The `page_id` comes from the import response of each generated page; `title` is the page's title (used for parent-matching). Reuse the page IDs you already have from earlier `/import` calls in the session.

### Create a menu — `POST /menus`

Creates a new menu, or **appends** to an existing menu if the name already exists (returns a `warnings` entry). Items can nest via client-supplied `id` / `parent_id`.

```bash
curl -s -X POST "<site-url>/wp-json/divi5-generator/v1/menus" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: <api-key>" \
  -d '{
    "name": "Main Menu",
    "location": "primary",
    "items": [
      { "label": "Home",        "page_id": 12 },
      { "label": "Services",    "id": "svc", "page_id": 18 },
      { "label": "Roofing",     "parent_id": "svc", "page_id": 24 },
      { "label": "Google",      "url": "https://google.com" }
    ]
  }'
```

Item fields:
- `label` — required (items without it are skipped with a warning).
- `page_id` — link to a WordPress page (optional `post_type`, default `page`).
- `url` — custom-URL item (use this OR `page_id`, not both).
- `id` — optional client-side handle for nesting (defaults to `idx_{i}`).
- `parent_id` — references another item's `id` to nest as a child.

Response (HTTP 201):
```json
{
  "menu_id": 5,
  "name": "Main Menu",
  "location": "primary",
  "item_count": 4,
  "items": [
    { "db_id": 101, "label": "Home",        "page_id": 12 },
    { "db_id": 102, "label": "Services",    "page_id": 18 },
    { "db_id": 103, "label": "Roofing",     "page_id": 24, "parent_db_id": 102 },
    { "db_id": 104, "label": "Google",      "url": "https://google.com" }
  ],
  "warnings": []
}
```

Warnings you may see: `"menu_exists"` (appended to existing menu), `"invalid_location"` (location not registered in the active theme — menu still created, just not assigned), or per-item `"missing_label"` / `"missing_page_id_or_url"`.

### List menus — `GET /menus`

Returns every menu as a nested tree. Optional `?name=` filters to one menu.

```bash
curl -s "<site-url>/wp-json/divi5-generator/v1/menus?name=Main%20Menu" \
  -H "X-D5G-Key: <api-key>"
```

Response (HTTP 200):
```json
{
  "menus": [
    {
      "id": 5,
      "name": "Main Menu",
      "slug": "main-menu",
      "theme_locations": ["primary"],
      "item_count": 4,
      "items": [
        { "db_id": 101, "label": "Home",     "page_id": 12, "type": "post_type", "url": "", "order": 1, "children": [] },
        { "db_id": 102, "label": "Services", "page_id": 18, "type": "post_type", "url": "", "order": 2,
          "children": [
            { "db_id": 103, "label": "Roofing", "page_id": 24, "type": "post_type", "url": "", "order": 1, "children": [] }
          ]
        },
        { "db_id": 104, "label": "Google",   "type": "custom", "url": "https://google.com", "order": 3, "children": [] }
      ]
    }
  ]
}
```

Use this to verify a create, or to inspect an existing menu before deciding what to add.

### Auto-place generated pages — `POST /menus/auto-place`

Given a target menu and a list of generated pages, this endpoint places each page into the menu by **title-word overlap**: if a page title shares a significant word with an existing top-level item's label, the page is added as a child of that item; otherwise it's appended as a new top-level item. Pages already present in the menu (by `page_id`) are skipped with a warning.

```bash
curl -s -X POST "<site-url>/wp-json/divi5-generator/v1/menus/auto-place" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: <api-key>" \
  -d '{
    "menu_name": "Main Menu",
    "pages": [
      { "page_id": 24, "title": "Roofing Repairs Exeter" },
      { "page_id": 31, "title": "Gutter Cleaning" },
      { "page_id": 42, "title": "About Us" }
    ]
  }'
```

Response (HTTP 200):
```json
{
  "menu_id": 5,
  "placed": 3,
  "skipped": 0,
  "items": [
    { "db_id": 110, "label": "Roofing Repairs Exeter", "page_id": 24, "parent_db_id": 102 },
    { "db_id": 111, "label": "Gutter Cleaning",        "page_id": 31 },
    { "db_id": 112, "label": "About Us",               "page_id": 42 }
  ],
  "warnings": []
}
```

An entry with `parent_db_id` was nested under a matched top-level item; an entry without it was appended at the top level. A `skipped` count > 0 means some pages were already in the menu — each gets a warning entry.

### Menu workflow tips

- **Pair with page import.** After importing a batch of generated pages, gather their `page_id`s and call `/menus/auto-place` to wire them into the site nav in one shot — no manual menu editing in WP Admin.
- **Two-pass nesting.** `POST /menus` resolves `parent_id` references in a single pass: list parents before children in the `items` array so `id` handles resolve.
- **Verify with `GET /menus`.** Always list the menu after a create or auto-place to confirm the tree shape matches the user's intent before reporting success.
- **Bad location is not fatal.** If the theme lacks the requested location, the menu is still created — surface the warning and tell the user which locations their theme actually registers (visible in the `theme_locations` of any existing menu, or WP Admin → Appearance → Menus → Manage Locations).
