---
name: divi5-variables-from-styleguide
description: "Convert a brand style guide (prose) or a design-token table/JSON (Figma tokens, CSV, tokens.json) into a Divi 5 importable Global Variables file: a single context:et_builder JSON of global_colors + global_variables with stable gcid-/gvid- IDs. Use when turning brand guidelines or token tables into a Divi import, generating global_colors and global_variables, or producing an et_builder variables JSON. Triggers: style guide to divi, design tokens to divi, divi global variables, divi global colors json, et_builder import, figma tokens to divi, brand tokens to divi."
argument-hint: "[brand-name] [--tokens <file.json|csv>] [--prose <text>]"
allowed-tools: Bash(node *)
---

# Divi 5 Variables from Style Guide

You convert a style guide (any format) and/or explicit design tokens into a **Divi 5
importable** Global Variables JSON file. This is the feeder upstream of `divi5-brand-profile`
and the page generator: it turns a brand's real tokens into the import Divi reads.

## Critical rules

- **Never invent values.** Emit variables only for values explicitly provided (tokens payload
  or prose). If the prose says "deep navy" with no hex, that goes in the missing/ambiguous
  list, not the JSON.
- **Tokens win.** If a tokens payload is supplied, it overrides prose extraction.
- **Stable IDs.** `gcid-<slug>` for colours, `gvid-<slug>` for variables — deterministic, so
  re-importing an update does not churn IDs. Slug: lowercase, non-alphanumerics → `-`,
  collapse repeats, trim ends; append `-2`/`-3` on collision.
- **Every colour needs a variable.** For each `global_colors` entry, also add a
  `global_variables` entry of `type: "colors"` with the same value — so presets and layouts
  can reference every colour.
- **Output MUST pass `scripts/check-variables-json.js`** before delivery. Never hand off a
  file that fails the contract gate.

## When to use

- "Convert this style guide into Divi 5 variables."
- "Create a Divi Global Variables JSON I can import."
- "Generate global_colors and global_variables from these design tokens."

Do NOT use for: importing Divi **layouts** (`context: et_builder_layouts`), importing
**presets** only, or authoring a style guide from scratch.

## Workflow

### Step 0 — Gather
Ask for (or extract from the prompt): brand name (filename + labels); style guide text
(paste / upload / copied sections); optional tokens payload (JSON, or a CSV/table with
`name,type,value`, optional `notes`). If tokens are supplied, prefer them over prose.

### Step 1 — Build a token set
Canonical names: `color.brand.*`, `color.neutral.*`, `color.semantic.*`,
`font.heading.family`, `font.body.family`, `type.h1.size` / `.lineHeight` / `.letterSpacing`,
`space.*`, `radius.*`, `shadow.*`, `layout.container.max`, `layout.text.max`, `link.*`,
`string.*`. If essentials are missing, do not invent — note them.

### Step 2 — Normalize values
- Colours: keep `#RRGGBB` if present; otherwise keep `rgb/rgba/hsl/hsla(...)` as-is.
- Numbers: strings with units (`"16px"`, `"1200px"`) or unitless (`"1.2"`).
- Fonts: family string (`"Roboto"`). Links: URL string. Strings: plain text.

### Step 3 — Stable IDs
Colours: `gcid-<slug>`. Variables: `gvid-<slug>`.

### Step 4 — Emit the import JSON
Output a single object with this root shape (all eight keys required):

```json
{
  "context": "et_builder",
  "data": [],
  "presets": [],
  "global_colors": [["gcid-color-brand-navy", { "color": "#1A2332", "status": "active", "label": "Brand Navy" }]],
  "global_variables": [{
    "id": "gvid-color-brand-navy", "label": "Color Brand Navy", "value": "#1A2332",
    "order": "", "status": "active", "lastUpdated": "2026-03-17T00:00:00.000Z",
    "variableType": "colors", "type": "colors", "groupKey": "colors"
  }],
  "canvases": [], "images": [], "thumbnails": []
}
```
`type`/`variableType`: one of `colors | numbers | strings | fonts | images | links`.
`groupKey`: best-effort group (`colors`, `type`, `space`, `fonts`, `links`, `strings`).
Filename: `<Brand>_Global-Variables.json`. Then validate:

```bash
node scripts/check-variables-json.js <Brand>_Global-Variables.json
```

Fix every FAIL before delivery.

### Step 5 — Report
After the JSON, output: (1) a token table (`token name`, `divi id`, `type`, `value`,
`label`); (2) a missing/ambiguous checklist for anything mentioned but not specified
explicitly.

## How imported colours are used

After import, Divi 5 auto-publishes every global colour as a CSS custom property in a
`<style class="et-vb-global-data et-vb-global-colors">` block, so each colour is usable in
custom CSS / themes immediately:

```css
.my-el { color: var(--gcid-color-brand-navy); }
```

The slug-based IDs above (`gcid-color-brand-navy`, not a GUID) are chosen deliberately for
**portability** — the same label resolves to the same variable name across sites (Divi's
native auto-vars use site-specific GUIDs; stable slugs are the portable form).

To reference a colour inside a preset or layout block (the bridge to the page generator's
preset system), use the variable syntax the builder expects:

```
$variable({"type":"color","value":{"name":"gcid-color-brand-navy","settings":{}}})$
```

This is *why* the "every colour needs a variable" rule exists: a `colors`-type variable for
every `global_colors` entry is what makes colours referenceable in presets. (Nested colour
references — one colour pointing at another via `$variable()` — are out of scope here; this
skill defines base colours as literal values.)

## Troubleshooting (include when relevant)

- **Import blocked**: hosts/security plugins may block `.json` uploads; allow JSON uploads.
- **Fonts not rendering**: variables store family names, but the font must be available on
  the site (uploaded / served) to render.
- **Too many tokens**: start with a baseline set (palette, fonts, type scale, spacing,
  radii, widths), then iterate.

## File map

| File | Purpose |
|---|---|
| [scripts/check-variables-json.js](scripts/check-variables-json.js) | Contract validator (R1-R5) — output must pass |
| [references/token-table-template.md](references/token-table-template.md) | Recommended token CSV/table format |
| [references/example-output-minimal.json](references/example-output-minimal.json) | Corrected minimal example (passes the validator) |
