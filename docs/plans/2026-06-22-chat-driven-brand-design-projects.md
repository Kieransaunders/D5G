# Chat-driven Divi 5 Generator with Brand-anchored Design Projects

**Date:** 2026-06-22
**Status:** Approved design — awaiting implementation plan
**Scope:** App UX (chat-primary), Brand Profile entity, Design Project grouping, multi-page per design, skill updates, importer plugin REST additions.

**Decisions locked:**
- Chat-primary UX. Form demoted to a "Structured brief" drawer.
- Auto-promote Design Project after the 2nd page sharing brand + export.
- Previews render inline in chat, with pop-out to a side drawer.
- Full scope: app + workflow + skills + plugin.
- Chat-triggered generations require a **confirm click** (no auto-fire).
- New top-level entity: **Brand Profile**, sourced from URL / Divi export / image / chat / manual, with per-field manual tweaks.

---

## 1. Mental model

```
Brand Profile  ──(1)──▶  Design Project  ──(1:N)──▶  Page (generation)
   ▲                        ▲
   │ sourced from            │ anchored by
   │                          │
 URL · Divi export ·        (optional) Divi export JSON
 image · chat · manual     → locks preset IDs + variables
```

- **Brand Profile** — colours, fonts, logo, voice/tone, tagline. The reusable visual + verbal identity. Created explicitly via the new Brand section. Reusable across multiple Design Projects.
- **Design Project** — a Brand Profile + (optional) a Divi designer export that locks preset IDs and global variables. The unit you iterate against. Auto-promoted after the 2nd page under a brand + export pair, or created explicitly. One brand can have multiple Design Projects.
- **Page** — a generation. Always belongs to exactly one Design Project.

---

## 2. UX

**Default landing view** is the chat. Sidebar collapses to four tabs: `Chat · Brand · Designs · Settings`.

### Chat tab
- Main surface. Drives generation, shows inline preview cards, can reference the active Brand and Design ("add an About page to the *Floria* design").
- Slash hints surfaced as autocomplete: `/generate`, `/brand`, `/design`, `/import`, `/pages`.
- Chat always carries context: active brand profile, active design project, active page (if refining). Shown as a compact context chip row above the input.
- **Generation trigger = confirm button.** When Claude emits a generation intent, the chat renders a card with the proposed brief and a **Start generation →** button. The pipeline does not auto-fire. A 3-second cancel toast is **not** used.
- Preview cards render inline (thumbnail iframe + expand control). Expand → side drawer slides over the right half. Full-page view via existing iframe.
- Other inline card types: file-card (download links), design-card (tokens + linked pages + "Add page" button), import-card (WordPress import status + preview link).

### Brand tab (new)
- Grid of Brand Profile cards. Each card: palette swatches, font pairing, logo thumbnail, name, source badge.
- **New Brand Profile** buttons: *From URL / From Divi export / From image / From chat / Blank*.
- Edit screen per profile: manual tweak controls.
  - Colours: list of `{role, hex, source}`. Colour picker per row, role dropdown (primary / accent / background / surface / muted / success / danger), source badge, "locked" toggle (sticky against re-extraction).
  - Fonts: heading family + body family dropdowns (curated Google Fonts list + custom entry).
  - Logo: upload zone + preview + remove.
  - Voice/tone: textarea.
  - Tagline: single-line input.
  - "Re-extract from [source]" button — only fills empty or non-locked fields.
- Delete profile (refuses if any Design Project references it; offers "archive" instead).

### Designs tab (new)
- List of Design Projects. Each row: name, brand, page count, last modified, page-type badges (Home, About, Contact…).
- Expand a project → its pages listed with status (draft / imported / published) and re-open / revise / import actions.
- "Add page" button per design → opens chat pre-seeded with: *"Generate a [page-type selector] for the [design name] design, reusing its brand and tokens."*
- Create Design Project explicitly: pick a Brand Profile + (optional) Divi export from the saved exports list.

### Settings tab (unchanged)
WordPress site URL + API key + plugin download. No changes.

### Generate form
Collapses into a "Structured brief" drawer accessible from Chat. All existing form fields preserved. Submission still hits `/generate` — it now also accepts `designId` optionally.

---

## 3. Brand extraction — five input paths

All paths converge on the same Brand Profile schema (§4). Each path writes a **draft** profile; user tweaks before saving.

| Source | Flow | Reuses / adds |
|---|---|---|
| **URL** | App endpoint `GET /brand/extract-url?url=…` proxies the URL server-side (dodges CORS, blocks loopback/private IPs, 1 MB cap, 10 s timeout). Pulls `<title>`, meta description, OG image, favicon, `<style>` blocks, stylesheet text (one fetch depth), `font-family` declarations, inline hex/rgb. Bundle sent to Claude via `divi5-extract-style` skill → returns structured Brand Profile JSON. | New `fetchPageBundle()` helper in app; new URL mode in skill. |
| **Divi export** | Existing `extract-from-export.js` already extracts presets + global colours. Extend to also emit a Brand Profile draft: map preset colour groups → named roles, preset fonts → heading/body. | `skills/divi5-extract-style/scripts/extract-from-export.js` |
| **Image** (logo/screenshot) | Upload → app runs client-side canvas dominant-colour pass immediately (fast feedback). "Analyse with Claude" button sends the image to Claude **vision** → returns palette, mood, font guesses (hard for logos — accept lower confidence). | New vision path in skill; client-side colour extraction in app. |
| **Chat** | "Extract brand from conversation" button on chat → Claude reads recent history, pulls any brand cues (stated colours, voice, audience, tagline hints), proposes a Brand Profile. | Pure prompt in skill. |
| **Manual / blank** | Empty Brand Profile form opened directly. | New UI. |

**SSRF mitigation (URL path):** resolve host, reject if A/AAAA record is loopback (`127.0.0.0/8`), link-local (`169.254.0.0/16`), private (`10/8`, `172.16/12`, `192.168/16`), or `.local` mDNS. Cap response body. Short timeout. No redirects to private ranges.

**Vision cost mitigation (image path):** client-side canvas extraction always runs first and is shown immediately. Claude vision is opt-in via a button — never auto-fired.

---

## 4. Brand Profile schema

Stored as JSON in `brand_profiles.data`. Every value carries a `source` so manual tweaks are visible and re-extraction does not silently overwrite them.

```json
{
  "name": "Floria",
  "colors": [
    { "role": "primary",    "hex": "#1A2744", "source": "logo",    "locked": false },
    { "role": "accent",     "hex": "#F97316", "source": "manual",  "locked": true  },
    { "role": "background", "hex": "#FAFAF7", "source": "url",     "locked": false }
  ],
  "fonts": {
    "heading": { "family": "Space Grotesk", "source": "url"   },
    "body":    { "family": "Inter",         "source": "manual" }
  },
  "logo":     { "path": "<app data dir>/logos/floria-<ts>.png", "source": "upload" },
  "voice":    "Warm, expert, a little playful.",
  "tagline":  "Flowers that arrive happy.",
  "audience": "DTC customers in the UK",
  "sourceType": "url",
  "sourceRef":  "https://floria.example.com",
  "extractedAt": "2026-06-22T18:00:00Z"
}
```

**Re-extraction rules:**
- A field with `source: "manual"` or `locked: true` is never overwritten by re-extraction.
- Re-extraction only fills empty fields or fields with `source` in `{url, export, image, chat}` and `locked: false`.
- Re-extraction appends a row to an `extraction_history` array inside the JSON (last 5 entries) for auditability.

---

## 5. Data model changes (`app/db.js`)

New tables. Existing `generations` and `designer_exports` gain nullable FK columns via migrations (the codebase already uses the `ALTER TABLE … ADD COLUMN` migration pattern).

```sql
CREATE TABLE IF NOT EXISTS brand_profiles (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  name        TEXT NOT NULL,
  data        TEXT NOT NULL,           -- Brand Profile JSON (§4)
  source_type TEXT,                    -- url|export|image|chat|manual
  source_ref  TEXT                     -- URL, export file path, or image file path
);

CREATE TABLE IF NOT EXISTS design_projects (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  name            TEXT NOT NULL,
  brand_id        INTEGER REFERENCES brand_profiles(id),
  export_id       INTEGER REFERENCES designer_exports(id),  -- nullable
  tokens_path     TEXT,              -- extracted tokens.js (copy under app data dir)
  variables_path  TEXT,              -- extracted variables.json
  notes           TEXT
);

CREATE TABLE IF NOT EXISTS design_pages (
  design_id     INTEGER REFERENCES design_projects(id),
  generation_id INTEGER REFERENCES generations(id),
  page_type     TEXT,                -- home|about|contact|landing|features|pricing|...
  sort_order    INTEGER DEFAULT 0,
  PRIMARY KEY (design_id, generation_id)
);
```

Migrations appended to the existing `migrations` array:
```js
`ALTER TABLE generations ADD COLUMN design_id INTEGER`,
`ALTER TABLE generations ADD COLUMN page_type TEXT`,
```

**Auto-promotion trigger** (in the `/generate` completion handler, after the existing status update):
1. Look up another `generations` row with the same `brand` and the same `export_path`, `id != genId`.
2. If found **and** no `design_projects` row exists for that brand+export pair → create one (name = brand + " design", link both generations via `design_pages`, copy tokens/variables paths from the extract step).
3. Surface a toast in chat: *"Promoted to design project 'Floria' — 2 pages"*.

Explicit creation (from the Designs tab) bypasses the trigger and just inserts the row.

---

## 6. Chat → generation wiring

The current `/chat` endpoint (`app/server.js:303-326`) just streams Claude text back. The new flow keeps the generate pipeline untouched; chat becomes a new frontend for it.

### 6.1 Chat context preamble
Every `/chat` request is augmented with a context block built from session state:
```
ACTIVE BRAND: Floria (id=3) — primary #1A2744, accent #F97316, heading Space Grotesk, body Inter, voice: warm/expert/playful.
ACTIVE DESIGN: Floria design (id=2) — anchored on export "Client Homepage Export", 1 existing page (Home).
ACTIVE PAGE: (none) / Generation #42 (Home) if refining.
```
This block is prepended to the prompt sent to `claude -p --plugin-dir …`.

### 6.2 Generation intent marker
Claude is instructed (via an updated section in `divi5-page-generator/SKILL.md`) to emit a single-line marker when it believes a generation is warranted:

```
<!-- GEN_INTENT: {"brand":"Floria","designId":2,"pageType":"about","keyword":"about floria","sections":["Hero","Story","Team","CTA"],"ctaLabel":"Meet the team","notes":"warm tone, accent on the team photos"} -->
```

The chat SSE parser intercepts this line, strips it from the visible reply, and emits a `gen_intent` SSE event to the frontend. The frontend renders a **generation proposal card**:

```
┌──────────────────────────────────────────────┐
│ Generate: About page for Floria              │
│ • keyword: about floria                      │
│ • sections: Hero, Story, Team, CTA           │
│ • CTA: Meet the team                         │
│                                              │
│           [ Edit brief ]  [ Start → ]        │
└──────────────────────────────────────────────┘
```

- **Edit brief** opens a small inline editor (the same fields as the form, prefilled).
- **Start →** calls `/generate` with the parsed brief. Does **not** auto-fire.
- The chat stream continues normally around the card; Claude's prose explanation still renders.

### 6.3 Generation lifecycle inside chat
- On `Start →`, the frontend calls `/generate`, gets the `genId`, and subscribes to `/stream/:id` (existing endpoint, unchanged).
- The SSE events are translated into inline chat cards:
  - `log` events → a collapsed "Generation log" card (expandable).
  - `done` event with `hasPreview: true` → a **preview card** inline (thumbnail iframe + "Open full" → side drawer).
  - `done` event with `files` → a **file card** with download links.
- Refinement: a follow-up chat message like "make the hero punchier" is recognised (either via another `GEN_INTENT` with `revisionOf: <genId>` or by the user clicking "Revise" on a prior preview card) and routed into `/generate` with `revisionNotes` and the prior generation context. The existing revision path is reused.

### 6.4 Preview side drawer
- New right-side drawer (slides over ~50% of the main panel) with a full-size iframe of `/preview-html/:id`.
- Header: page title, generation id, "Open in new tab", "Import to WordPress", close.
- Multiple drawers can stack as tabs (so you can compare revisions side by side).

---

## 7. Skill updates

| Skill | Change |
|---|---|
| `divi5-extract-style` | Add URL-fetch mode, image-vision mode, chat-extract mode. Emit Brand Profile JSON as the canonical output. When the source is a Divi export, additionally emit `tokens.js` + `variables.json` (current behaviour preserved). Document the field `source` / `locked` conventions. |
| `divi5-page-generator` | Add **design-project mode**: when invoked with a Brand Profile + tokens.js (or a `--design <id>` reference), reuse the supplied colours/fonts verbatim. Refuse to invent new hex colours outside the supplied palette. Emit the `GEN_INTENT` marker when invoked from chat context (documented format above). |
| `import-to-local` | Add awareness of the new `/pages` list and `/pages delete` endpoints so chat can drive "list pages on the site" and "delete the previous draft" workflows. |
| **NEW**: `divi5-brand-profile` | Documents the Brand Profile schema, the five extraction paths, and the re-extraction rules. Keeps `divi5-extract-style` focused on Divi-token extraction while this skill owns the brand entity lifecycle. |

---

## 8. Importer plugin enhancements (`divi-tools-importer`)

Two new REST endpoints. Both gated by `X-Divi-Tools-Key` (no query-param fallback, matching existing convention). New files registered in `src/RestApi.php`.

| Method | Path | Behaviour |
|---|---|---|
| `GET` | `/wp-json/divi-tools/v1/pages` | Returns `{slug, title, status, modified, permalink, design_hint}` for every page created by this plugin. `design_hint` = the brand keyword from the page's SEO meta if present. Used by chat: "show me all Floria pages currently on the site". |
| `DELETE` | `/wp-json/divi-tools/v1/pages?slug=<slug>` | Deletes a draft page. **Refuses** if `post_status = 'publish'` (returns 409). Powers the "iterate without litter" loop. |

New files:
- `src/PagesLister.php` — implements `GET /pages`.
- `src/PageDeleter.php` — implements `DELETE /pages`.

No changes to existing `/import`, `/preview`, `/export`, `/presets`, `/presets/import`, `/ping`. Version bumped to `1.3.0`.

---

## 9. Testing

| Layer | Tests |
|---|---|
| App — data model | `brand_profiles` CRUD; `design_projects` CRUD; auto-promotion fires on 2nd generation with same brand+export and not on brand-only match; auto-promotion no-ops when an explicit project already exists. |
| App — brand extraction | URL extractor blocks loopback/private/link-local (mocked DNS); URL extractor caps body at 1 MB; image path returns canvas colours immediately before vision call; chat-extract returns valid Brand Profile JSON from a fixture transcript. |
| App — chat wiring | `GEN_INTENT` marker is parsed, stripped from visible reply, and emits a proposal card; **Start →** calls `/generate` with the parsed brief; refinement path passes `revisionOf` correctly; preview card renders inline after `done` event. |
| App — re-extraction rules | A `manual` / `locked` field is preserved across re-extraction; an `auto` field is overwritten; history array caps at 5. |
| Plugin — REST | `GET /pages` returns the expected shape; `DELETE /pages` refuses a published page with 409; both require the API key. |
| Skills | `divi5-extract-style` URL mode returns valid Brand Profile JSON against a fixture HTML bundle; `divi5-page-generator` design-project mode emits no hex outside the supplied palette. |

Tests land in `app/tests/` (Node, existing harness) and `plugin/divi-tools-importer/tests/` (PHP, existing pattern).

---

## 10. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Chat false-positives spawn expensive generations | Confirm button — generations never auto-fire. (Locked.) |
| 2 | URL-fetch SSRF | DNS resolution check, block private/loopback/link-local/`.local`, 1 MB body cap, 10 s timeout, no redirects to private ranges. |
| 3 | Vision cost on image uploads | Client-side canvas dominant-colour runs first and is shown immediately; Claude vision is opt-in via a button. |
| 4 | Manual tweaks lost on re-extraction | Per-field `source` + `locked`; re-extraction only fills empty or unlocked auto fields; history array kept for audit. |
| 5 | Design Project name collisions (same brand, multiple exports) | Name is editable; default is `<brand> design` with a disambiguating suffix if a duplicate exists. |
| 6 | Generations orphaned if a Design Project is deleted | Deleting a project offers "keep pages as standalone generations" (default) or "delete pages too". FK is on `generations.design_id` nullable, so nulling is safe. |
| 7 | Existing form users disrupted by chat-primary default | The "Structured brief" drawer preserves all current fields verbatim. A one-time toast on first load points form-first users to it. |
| 8 | Chat context grows unbounded | Only the active Brand + Design + Page are prepended, not full history. Chat history is still capped/truncated as today. |

---

## 11. Out of scope (explicit)

To keep the plan shippable in a reasonable number of phases:

- **Multi-user / accounts.** Single-user local app remains.
- **Cloud sync of Brand Profiles / Designs.** Local SQLite only. Export-to-file and import-from-file are a possible later addition.
- **Direct editing of generated Divi JSON in a visual editor.** Out of scope; refinement is via chat → regenerate.
- **A/B comparison of multiple Brand Profiles against the same brief.** Later.
- **Automatic brand consistency scoring across a Design Project's pages.** Later (would build on `divi5-style-check`).
- **Plugin: bulk publish, bulk delete, revision history.** Only list + single delete in this round.

---

## 12. File touch-list (for the writing-plans pass)

**App:**
- `app/db.js` — new tables, migrations, helpers (`createBrandProfile`, `getBrandProfile`, `listDesignProjects`, `promoteDesignProject`, etc.).
- `app/server.js` — new endpoints: `GET/POST/PUT/DELETE /brand`, `GET/POST/DELETE /designs`, `GET /brand/extract-url`, `POST /brand/extract-image`, `POST /brand/extract-chat`, chat context preamble, `GEN_INTENT` interception.
- `app/public/index.html` — sidebar restructure (Chat/Brand/Designs/Settings), Brand tab UI, Designs tab UI, structured-brief drawer, preview side drawer, generation proposal card template.
- `app/public/app.js` — chat context state, slash autocomplete, `GEN_INTENT` rendering, preview-card rendering, brand/design CRUD wiring.
- `app/public/style.css` — new components (cards, drawer, brand grid, design list).
- `app/tests/` — new test files per §9.

**Skills:**
- `skills/divi5-extract-style/SKILL.md` + `scripts/extract-from-export.js` — URL/image/chat modes, Brand Profile JSON output.
- `skills/divi5-page-generator/SKILL.md` — design-project mode, `GEN_INTENT` marker spec.
- `skills/import-to-local/SKILL.md` — `/pages` list + delete awareness.
- `skills/divi5-brand-profile/SKILL.md` — new skill (Brand Profile schema, extraction paths, re-extraction rules).

**Plugin:**
- `plugin/divi-tools-importer/src/PagesLister.php` — new.
- `plugin/divi-tools-importer/src/PageDeleter.php` — new.
- `plugin/divi-tools-importer/src/RestApi.php` — register new routes.
- `plugin/divi-tools-importer/divi-tools-importer.php` — version bump to 1.3.0.
- `plugin/divi-tools-importer/tests/` — new REST tests.

**Docs:**
- `README.md` — updated workflow diagram + Brand/Design sections.
- `DEVELOPMENT.md` — updated data model + REST contract table.
