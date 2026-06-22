# Design-system reuse — local notes

**Date:** 17/06/2026
**Status:** Built + verified end-to-end. Git-ignored (local working notes, not committed).

## What this solves

The `landing-page` skill is a one-way generator — it invents its own palette/presets and can't ingest an existing Divi 5 export. To make generated pages **inherit a client's existing Divi 5 branding**, we bridge the two via an extractor.

Divi 5 variables and presets are **global, site-level records referenced by id** (`gcid-…`, `gvid-…`, random preset ids). A generated page inherits a site's design system for free *as long as it references ids that already exist on that install*. The generator already supported referencing ids (`globalColor('gcid-…')` reuses the id; `preset: '<id>'` binds `modulePreset`) — it just had no way to discover them. The extractor produces them.

## What was added

1. **`skills/style-variables/scripts/extract-from-export.js`** — parses a Divi 5 export's `global_colors` (resolving derived `$variable(...)$` shades), `global_variables`, and `presets.module` + `presets.group`. Writes:
   - `<name>.variables.json` — importable Global Variables (seeds a fresh site).
   - `<name>.tokens.js` — `require()`-able map: `colorRef[label]`, `colorId[label]`, `colorHex[id]`, `variableRef[label]`, `variableId[label]`, `preset[name]`, `presetList`.
   - `<name>.presets.json` — raw module + group preset definitions.
   - Plus a stdout report table.
2. **`skills/style-variables/SKILL.md`** — broadened description/triggers to cover extraction; added a "Reusing an existing site's design system" section.
3. **`skills/landing-page/SKILL.md`** — Stage 1 now checks the working dir for a `*.tokens.js` and prefers it over inventing a palette.

## How to use

```bash
node skills/style-variables/scripts/extract-from-export.js <export.json> --out <dir> --name "<Brand>"
```

Then in `generate-<brand>.js`:

```js
const T = require('./<Brand>.tokens.js');
// colour field: drop the ready reference string
D.section({ background: T.colorRef['Gray 100'] }, [...])
// preset: pass the existing id
D.heading({ text: '…', level: 'h1', preset: T.preset['h1'] })
```

**Two paths:**
- **Existing site** (export already imported there) → reference ids only. Do **not** re-register colours via `builder.globalColor()` — ships a colliding definition.
- **Fresh site** → import `<name>.variables.json` first, and the original export with **Import Presets** checked, then import the generated page.

## Verified against

`Krafter Lite.json` (real Divi 5 export, `et_builder_layouts`): 7 global colours (incl. 4 derived, chain resolved), 7 global variables (fluid `clamp()` scale), 15 presets (2 module + 13 group). End-to-end smoke confirmed the generated page references the existing `gcid-zclnclpjct` colour id and binds `modulePreset` to `0k069snprj` (content row), `xqzb7munpk` (h1), `vd9yw3f4rr` (body text).

## Follow-up

- [ ] Real-install smoke: run extractor on a live site export, then run `landing-page` in the same folder; confirm it announces reuse and the imported page renders with the site's branding.
- [ ] Consider an option to emit a `generate-<brand>.js` stub pre-wired to the tokens file.
