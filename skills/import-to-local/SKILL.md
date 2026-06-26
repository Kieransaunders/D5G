---
name: import-to-local
description: "Import Divi 5 landing page JSON into any WordPress site (local or hosted) as a published page via the Divi Tools Importer plugin REST API, screenshot it live, and run the accept/refine loop. Use when importing or deploying a generated Divi 5 page into WordPress and previewing it live. Triggers: import divi page, import to local, localwp import, preview divi page, publish divi landing page, divi local site, import divi hosted, deploy divi page."
argument-hint: "[site-url] [api-key]  — or omit to be prompted"
---

# Divi 5 Page Importer

Close the loop on a generated Divi 5 page: validate it, push it to any WordPress site via the Divi Tools Importer plugin, open the preview, then act on the user's verdict. Works on **any host** — Local, Kinsta, WP Engine, SiteGround, Flywheel — no SSH or WP-CLI required.

## Pre-requisite

The **Divi Tools Importer** plugin must be installed and active on the target site.

The plugin ships as unpacked source under `plugin-src/` (a bundled `.zip` can't live inside a Claude Code plugin — the installer rejects nested zips). Build the installable zip on demand:

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/build-plugin-zip.sh" ~/Downloads
```

It prints the path to the finished zip (e.g. `~/Downloads/divi-tools-importer.zip`). Tell the user:

> "I've built the plugin zip at `~/Downloads/divi-tools-importer.zip`. Install it via **WordPress Admin → Plugins → Add New → Upload Plugin**, then activate it."

After activation they go to **Settings → Divi Tools Importer** to copy their site URL and API key.

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
6. **Re-runs with the same slug update the same page in place.** No page litter.
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
- "What is your Divi Tools Importer API key?" (starts with `dtik_`)

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
curl -s -X POST "<site-url>/wp-json/divi-tools/v1/preview" \
  -H "Content-Type: application/json" \
  -H "X-Divi-Tools-Key: <api-key>" \
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
curl -s "<site-url>/wp-json/divi-tools/v1/ping?dti_key=<api-key>"
```

Check the response:
- `status: "ok"` → proceed
- HTTP 401 → wrong key, ask the user to check Settings → Divi Tools Importer
- HTTP 404 → plugin not active, ask user to activate it
- Connection refused / timeout → site is down or URL is wrong

> **Where this runs:** every call below curls the target site. If you're in an environment that can't reach `localhost` (e.g. a sandboxed/Cowork session, which can't reach the user's Mac at `localhost:10024`), target a **public** URL or drive the site via the browser extension instead. Under Claude Code on the Mac, `localhost` works fine.

Report what was detected: Divi 5, Yoast, RankMath. **If no SEO plugin is present, DTI still persists SEO to post meta** (`dti_seo_title` / `dti_seo_description`) and stores/injects schema by slug — nothing is lost. "Set meta manually" only means surfacing it in an SEO plugin later if the user installs one.

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
curl -s -X POST "<site-url>/wp-json/divi-tools/v1/import" \
  -H "Content-Type: application/json" \
  -H "X-Divi-Tools-Key: <api-key>" \
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
curl -s -X POST "<site-url>/wp-json/divi-tools/v1/import" \
  -H "Content-Type: application/json" \
  -H "X-Divi-Tools-Key: <api-key>" \
  -d @payload.json  # same payload with "publish": true
```

Confirm the live URL: `<site-url>/<slug>/`

---

## Iterate without litter — list & delete draft pages

When refining a page across several rounds, drafts pile up on the site. Two endpoints (plugin ≥ 1.3.0) let you list and delete previously-imported pages so you can keep iterating on one clean draft.

### List imported pages

```bash
curl -s "<site-url>/wp-json/divi-tools/v1/pages" \
  -H "X-Divi-Tools-Key: <api-key>"
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
curl -s -X DELETE "<site-url>/wp-json/divi-tools/v1/pages?slug=invoice-software" \
  -H "X-Divi-Tools-Key: <api-key>"
```

Returns `{ "ok": true, "deleted": "invoice-software" }`. **Safety:** the endpoint refuses with HTTP `409` if the page is `publish`ed — it never deletes a live page. Trash a published page manually in WP Admin if you really mean to.

### Suggested workflow

1. `GET /pages` → see your drafts (+ their `design_hint`).
2. Re-import your refined layout against the same `slug` → updates the existing draft in place (no new page created).
3. Only delete when you want to start clean for that slug: `DELETE /pages?slug=…`.
4. `GET /pages` again to confirm.
