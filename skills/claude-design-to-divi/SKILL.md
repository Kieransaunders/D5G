---
name: claude-design-to-divi
description: "Turn a Claude Design hand-off into an importable Divi 5 page. Consumes the Claude Code hand-off bundle (design intent + component structure + styling context) — or a standalone HTML export as fallback — and drives the divi5-page-generator to emit validated Divi 5 JSON, ready for import-to-local. Use when a design built in Claude Design is ready to become a real Divi page. Triggers: claude design handoff, hand off to claude code, design bundle, claude design to divi, build this design in divi, mockup to divi, design export to wordpress."
argument-hint: "[path to hand-off bundle dir or export file] [--brand <name-or-id>] [--publish]"
allowed-tools: Bash, Read, Write, Glob, Grep
---

# Claude Design → Divi 5

You convert a **Claude Design** hand-off into a production-ready, importable
Divi 5 page. You do **not** re-implement the Divi builder or the importer — you
parse the design, build a structured brief, and delegate:

- **`divi5-page-generator`** assembles + validates the Divi 5 JSON (owns the builder).
- **`design-sync`** owns the brand ↔ Claude Design bridge; reuse a brand profile
  rather than re-deriving tokens when one exists.
- **`import-to-local`** previews and imports the result into WordPress.

This skill is the *front of that pipeline*: design in, brief out, generator runs,
page lands as a draft.

---

## Inputs (detect which you have, in this order)

| Input | How to detect | Quality |
|---|---|---|
| **Hand-off bundle** | A directory (or `.zip`) containing a manifest plus components + styling. This is what Claude Design packages when you "hand off to Claude Code". | **Best** — structured intent, component tree, real tokens. |
| **Standalone HTML export** | A single `.html` file exported from Claude Design. | Fallback — infer structure from the DOM. |
| **Pasted description / screenshot** | No file; user describes or shares an image. | Last resort — treat as a normal brief and route straight to `divi5-page-generator`. |

If you only have HTML or a description, prefer the existing
`design-sync` **pull-brief** flow — it already covers that case. This skill's
value is the **bundle** path.

> Note: Claude Design is in research preview and the *contents* of the hand-off
> bundle are documented (design intent, component structure, styling context)
> but the exact on-disk schema is not yet a stable public contract. Parse
> defensively against the shape in `references/example-handoff-bundle.json` and
> adapt to what you actually find — never assume a key is present.

---

## Workflow

### 1. Locate and identify the bundle

```bash
# Bundle dir passed as arg, or look in the obvious places
ls -la "$ARG" 2>/dev/null
# Unzip if it's an archive
case "$ARG" in *.zip) unzip -o "$ARG" -d /tmp/cd-bundle && ARG=/tmp/cd-bundle;; esac
# Find the manifest
find "$ARG" -maxdepth 2 -iname 'manifest.json' -o -iname '*.handoff.json' 2>/dev/null
```

Read the manifest. Confirm it is a Claude Design hand-off (look for a design
title, a components/sections array, and a styling/tokens block). If it is not a
recognisable bundle, fall back to the HTML or description path above.

### 2. Parse the three parts

Pull the bundle apart into the brief inputs the generator needs:

- **Design intent** → page purpose, audience, primary message, CTA. Becomes the
  generator's `brand` + `keyword` + page goal. Infer the SEO primary keyword
  from the hero headline / page title if the intent doesn't state one.
- **Component structure** → the ordered list of sections and the modules inside
  each. Map every component to a Divi section/module (see the mapping table).
  Preserve order and nesting; this is the layout skeleton.
- **Styling context** → colours, typography, spacing tokens, component styles.
  These become the palette + type scale the generator applies, and should be
  reconciled with the brand profile in the next step.

Capture the result as an explicit, written **section plan** before generating —
list each Divi section, its modules, and the copy/tokens it carries. Show it to
the user so they can correct the mapping before any JSON is built.

### 3. Reconcile the brand

```bash
curl -s http://localhost:${PORT:-4321}/brand   # list brand profiles
```

- If `--brand` is given or a profile clearly matches the bundle's tokens, use
  that profile's colours/fonts/presets so the page matches the live Divi site
  (the generator reads these as global colours/variables).
- If the bundle's styling diverges from the brand profile, **flag the conflict**
  and ask which wins. Do not silently override brand tokens.
- If no profile exists, offer to create one from the bundle's styling via
  `design-sync` so future pages stay consistent.

### 4. Map components → a Divi section plan

Use this baseline mapping; extend it from the 47 ET reference section types the
generator knows. When a Claude Design component has no clean Divi equivalent,
choose the closest section type and note the approximation.

| Claude Design component | Divi 5 section / modules |
|---|---|
| Hero / header band | `Hero` section → heading (h1), subhead text, primary button, optional image/overlay |
| Feature grid / cards | `Features` section → multi-column rows of blurbs (icon + heading + text) |
| Logo strip / clients | `Statistics`/`Features` row of images |
| Testimonial / quote | `Testimonial` section → quote text + person blurb |
| Pricing tiers | `Pricing` section → columns of heading + price + list + button |
| FAQ / accordion | `FAQ` section → accordion module |
| Call to action band | `CTA` section → heading + button |
| Steps / how it works | `How-It-Works` section → numbered rows |
| Footer | `Footer` section → columns of links/text |

Rules carried from the generator: a page has exactly one **h1** (the hero
headline); section headings are **h2**. Keep copy verbatim from the design
unless the user asks to rewrite.

### 5. Generate, validate, and (optionally) publish

Hand the section plan + tokens to **`divi5-page-generator`** in **page mode**.
Do not write builder code here — invoke the generator skill with the structured
brief you assembled (brand, keyword, ordered sections, palette, CTA, copy).

The generator produces and validates:
- `<brand>-landing-page.json` — the importable Divi 5 page (`et_builder` context)
- `<brand>-seo-meta.json` — title/description/OG meta
- `<brand>-schema.json` — schema.org JSON-LD (when applicable)

Fix every validator FAIL before proceeding. These three files are exactly what
the app's importer consumes (page / seo-meta / schema).

### 6. Preview and import

Route to **`import-to-local`** (or the app) to preview and import:

- Preview the rendered page before touching WordPress.
- Import as a **draft** by default. Only pass `--publish` (→ `publish: true` on
  the importer) when the user explicitly asks to go live.
- After import, surface the preview URL and remind the user the page is a draft
  in Divi until they publish.

---

## Output contract

A successful run leaves the user with: a written section plan they approved, the
three generator output files, and an imported WordPress draft (preview URL). The
page must round-trip cleanly — re-running the design after edits should reproduce
the same section structure.

## What this skill deliberately does NOT do

- It does not call any Claude Design API — it consumes a delivered bundle/export.
  (If a stable Claude Design MCP/API ships, add it as an input source here.)
- It does not assemble Divi JSON directly — `divi5-page-generator` owns that.
- It does not push brand tokens to Claude Design — that is `design-sync`'s push flow.
