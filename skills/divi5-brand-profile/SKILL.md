---
name: divi5-brand-profile
description: "Brand Profiles for the Divi5Generator: the canonical schema for a brand (colours, fonts, logo, voice, tagline) and how it is extracted from a URL, a Divi 5 export, an image, a Canva design, a chat, or manual entry. Bridges raw brand input → a reusable, lockable profile that drives design-token extraction and page generation."
when_to_use: "Working with Brand Profiles in the Divi5Generator app — creating one, extracting one from a source, or deciding which fields to lock vs re-extract. Triggers: brand profile, extract brand, brand colours, brand fonts, brand voice, lock brand colour, re-extract brand, brand from url, brand from logo, brand from canva, brand from chat."
---

# Divi 5 Brand Profile

A **Brand Profile** is the single source of truth for a brand's identity inside the Divi5Generator. It is extracted once (from a URL, Divi export, image, Canva design, chat, or by hand) and then reused across every page and Design Project that shares that brand, so a whole site reads from one palette.

## Canonical schema

```json
{
  "name": "Acme",
  "colors": [
    { "role": "primary", "hex": "#1a2744", "source": "url|export|image|chat|manual|canva", "locked": false, "id": "gcid-… (export only)", "label": "Primary Navy" }
  ],
  "fonts": {
    "heading": { "family": "Playfair Display", "source": "url|export|image|chat|manual|canva" },
    "body":    { "family": "Inter",          "source": "…" }
  },
  "logo": null,
  "voice": "Confident, plain-spoken…",
  "tagline": "We make invoicing effortless",
  "sourceType": "url|export|image|chat|manual|canva",
  "sourceRef": "https://acme.com or /path/to/export.json",
  "extractedAt": "ISO timestamp"
}
```

Stored by the app in the `brand_profiles` table (`data` column = the object above as JSON, plus `name`, `source_type`, `source_ref` columns for listing/filtering).

## Field rules

- **`colors[]`** — one entry per distinct brand colour.
  - `role`: `primary`, `accent`, then `color-3`, `color-4`… by prominence.
  - `hex`: lowercase, always `#rrggbb`.
  - `source`: where this value came from (see extraction paths).
  - `locked`: `true` = user pinned it; **never overwrite on re-extraction**.
  - `id`: present **only** for export-sourced colours — the live `gcid-…` so generated pages reuse the existing global colour instead of redefining it.
- **`fonts`** — `heading` and `body`, each `{family, source}`. Omit a key if unknown; never guess a typeface from a vibe.
- **`logo`**, **`voice`**, **`tagline`** — optional; leave empty rather than invent.

## The six extraction paths

| Source | `sourceType` | How |
|---|---|---|
| Public URL | `url` | App `GET /brand/extract-url` returns a page bundle (title, hexes, font-families). Map to colours + fonts — see `divi5-extract-style` §URL mode. |
| Divi 5 export | `export` | `extractBrandProfileFromExport(doc)` — colours carry `gcid-` ids, fonts from preset attrs. |
| Image / logo | `image` | Canvas palette (`source:"image-canvas"`) enriched by vision. |
| Canva design | `canva` | Via the Canva connector: `export-design` → PNG → image-path colours; `get-design-content` → fonts. No token API, so colours are image-derived (approximate). See `divi5-extract-style` §Canva mode. |
| Chat | `chat` | Only explicitly-mentioned values — never inferred. |
| Manual | `manual` | User typed it in the Brand editor. |

The heavy lifting (parsing, palette math, vision prompts) lives in **`divi5-extract-style`**. This skill is the contract: what a Brand Profile *is*, and the rules for keeping it coherent.

## Re-extraction: sticky fields

When re-extracting into an existing profile, preserve what the user set:
- Any colour with `source:"manual"` or `locked:true` is kept verbatim.
- New candidates are **appended**, not replaced; history is capped at 5 per role.
- `name`, `voice`, `tagline` set by the user are sticky across re-extraction.

## Linking to a Design Project

A Brand Profile attaches to a **Design Project** (`design_projects.brand_id`). Once linked, the page generator's chat preamble shows `ACTIVE BRAND: <name> — palette: …` and the generator reuses the profile's colours/fonts verbatim rather than inventing new hexes. See `divi5-page-generator` §design-project mode.
