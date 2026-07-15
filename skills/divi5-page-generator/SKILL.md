---
name: divi5-page-generator
description: "Divi 5 page and section generator — SEO-optimised, preset-driven, validated. Creates complete, importable Divi 5 JSON files for full pages or individual reusable sections using a bundled Node builder library. Use when building Divi 5 pages or sections, generating Divi JSON, or adding a section to an existing Divi page. Triggers: divi, divi 5, divi json, divi page, divi layout, divi section, divi template, wordpress page divi, seo page divi, add divi section."
argument-hint: "[brief: brand, offer, primary keyword, sections, CTA] OR [--section <type> brief] OR [--scratch] OR [--overdrive]"
allowed-tools: Bash(node *), mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_resize
---

# Divi 5 Landing Page & Section Generator

You are a Divi 5 layout architect and SEO specialist. Produce production-ready, importable Divi 5 JSON — validated and mockup-faithful before delivery.

**Detect the mode from the prompt first:**

| Signal | Mode |
|---|---|
| "add a [type] section", `--section` flag | **Section mode** — single reusable section |
| "edit this page", "update the copy", `--mutate` flag, or a `.json` file + change description | **Mutate mode** — round-trip edit of an existing export |
| `--overdrive` flag, "maximum energy", "go all out" | **Overdrive mode** — see [Overdrive](#overdrive) below |
| `--scratch` flag | Skip Stage 0 clone, build from scratch in Stage 3 |
| Everything else | **Page mode** — full landing page (default) |

## Output location (never write into this repo)

Resolve once: `process.env.DIVI5_OUT` if set, else `~/Desktop/Divi5 Pages` (create if absent, expanding `~`). Every generator script writes only there. `cd "${DIVI5_OUT:-$HOME/Desktop/Divi5 Pages}"` before running validate/preview/gate commands — they take bare filenames.

## Section mode

Map the request to an ET section type, read 2-3 matching examples from the ET section library for structure, write `generate-[brand]-[type]-section.js` with `context: 'et_builder_layouts'`, then `node scripts/validate.js [file]` (no `--keyword`/`--meta`; h1 rule does not apply — use h2). Import via Divi Library, not page import.

## Mutate mode

Mutate (like clone) is **JSON-native** — it reads and patches the existing export directly; do not convert exports to a page spec and back. Run `ingest.js <export.json>` to get `.tokens.js` / `.presets.json` / `.outline.json`. Write a `changes.json` (`texts`, `globalColors`, `gcidColors`), apply with `mutate.js <export.json> changes.json [output.json]` — it refuses to write if any source preset ID is lost. Validate the output, then import.

## Workflow (Page mode)

### Stage 0 — ET pack clone (default; skip with `--scratch`)

Check for a matching premade page before building anything:

```bash
node scripts/et-pages.js match "<page type keyword>"
node scripts/et-pages.js clone "<keyword>" [brand]-base-page.json
```

If a match is found, **the mutated clone is the deliverable** — apply brand/copy mutations to it in Stage 3 rather than generating a new page from scratch; do not build a parallel scratch page. If `match` returns no hit, or `--scratch` was passed, skip straight to Stage 3.

### Stage 0.5 — Resolve preset library (preset-first, default)

Styles come from a shared library, not minted per page. Before Stage 3, load a registry and build via `presetRef()`:

```js
const b = D.createBuilder({ tokens });
b.loadPresetRegistry(require('references/et-preset-registry.json')); // run setup-et-presets.js once per site
const P = { hero: b.presetRef('divi/section', 'Section Preset 1'), /* … */ };
```

**Brand pack is the preferred library.** When brand variables exist, build the pack (`node scripts/build-brand-presets.js variables.json roles.json`) and use it as the registry **instead of the ET pack**, referencing presets by stable name — `Brand H1`, `Brand Button Primary`, `Brand Section Light`:

```js
const { buildBrandPresets, brandPresetLibrary } = require('scripts/build-brand-presets.js');
b.loadPresetRegistry(brandPresetLibrary(buildBrandPresets(variables, roles)), { withAttrs: true });
```

Single-import ships the pack with the page (IDs remap together). Two-step live imports the pack, then fetches the SERVER registry (`GET /presets?with_attrs=1`) and matches on **name**, never local IDs. See [examples/preset-first-workflow.js](examples/preset-first-workflow.js).

### Stage 1 — Brief

Ask (or extract from prompt): brand + offer, primary SEO keyword (+ secondaries/location), aesthetic direction (single reference: [references/aesthetics.md](references/aesthetics.md)), sections, CTA. State the Design Read in one line and pick an aesthetic preset. **Headless/brief mode** (a full brief or `brief.json` is supplied): run fully autonomously to file delivery — skip Stage-1 questions and the Stage-2 approval gate, never end the turn on a question.

### Stage 2 — Author `page-spec.json`, compile the preview (taste + approval gate)

**Spec-first (default for scratch builds).** The only artefact you author and edit is `page-spec.json` — sections, layouts, copy, preset names, theatre, SEO. Preview and Divi JSON are both compiled from it, so fidelity is by construction and every fix is a small spec edit. Clone/mutate stay **JSON-native** (no spec round-trip). Run `node scripts/spec/validate-spec.js page-spec.json` (the compat gate — vocabulary = proven Divi mappings; `raw` is the WARN escape hatch; extend export-first via `scripts/spec/vocabulary.js`), then `node scripts/spec/spec-to-html.js page-spec.json > preview-[brand].html`. The preview is the base stylesheet + aesthetic override (`scripts/spec/aesthetics/`); motion renders as a `⚡ preset` annotation, judged at the live Divi preview. Interactive mode: serve, screenshot, get approval. Headless: self-approve. Fix zero-em-dash and layout-variety issues in the spec here — cheaper than after the JSON exists. Start sections from the validated blueprints in [references/section-recipes/](references/section-recipes/) (`hero-light`, `features-3col`, `cta-dark`, `footer`), and choose presets by surface using [references/preset-catalogue.json](references/preset-catalogue.json) so a light-text preset never lands on a light section.

### Stage 3 — Compile + validate

Run `node scripts/spec/spec-to-divi.js page-spec.json` → `[slug]-landing-page.json` + seo-meta + schema in `$DIVI5_OUT`. **Legacy fallback (`--legacy`, one release):** hand-write `generate-[brand].js` per [examples/example-page.js](examples/example-page.js) — `node --check` it before executing. Either path, then run:

```bash
node scripts/validate.js [brand]-landing-page.json --keyword "<primary keyword>" --meta [brand]-seo-meta.json
node scripts/taste-check.js [brand]-landing-page.json
```

Fix every FAIL. WARNs should be resolved unless there's a stated reason.

### Process notes from recent runs

- Read the local repo skill instructions before doing anything else; use the repo's own `divi5-page-generator` skill and gates, not a generic or unrelated landing-page skill.
- Decide the concept and any DiviTheatre presets in the creative gate, before the page exists; motion goes in the spec's `theatre` field (or the `theatre:` helper shortcut in legacy scripts) — never hand-write `data-theatre` attributes.
- Keep generated artefacts (`page-spec.json`, compiled outputs) in the output folder so reruns and refinements stay trivial.
- Treat `validate.js`'s `ANIMATION: no entrance animations found` warning as expected on pages that rely only on DiviTheatre `data-theatre` attributes.
- For Divi attributes, write to `module.decoration.attributes`, not `module.advanced.attributes`.

### Stage 3.5 — Fidelity gate (mandatory, blocks delivery)

Run `fidelity-check.js` against the Stage 2 HTML before anything is handed off:

```bash
node scripts/fidelity-check.js [brand]-landing-page.json preview-[brand].html
```

This checks the JSON's h1 and heading outline, and heading style/column-ratio fidelity, against the approved mockup. **On FAIL, fix the generator and re-run — do not deliver.** Only once this passes should you import via the `divi5-deploy` skill. **Endpoint** (`divi5-generator` plugin): `POST /wp-json/divi5-generator/v1/import`, header `X-D5G-Key`, body `{layout, seo, schema, publish}` — `publish: false` = draft (default; `true` only when asked to go live). Registry once per site via `GET /presets?with_attrs=1` (`setup-et-presets.js`). Details: [site profile](references/site-profile.md).

### Stage 4 — Visual fidelity gate (automated, blocks delivery)

After import, Playwright-screenshot the live page and the Stage 2 mockup, then run `node scripts/visual-diff.js live.png mockup.png --max-mismatch 0.05` — on FAIL (mismatch over threshold), fix and re-run, do not deliver. This catches render-only failures the structural gates miss (wrong font slot shipping a 30px hero, layout drift). Common causes: buttons need `button: { enable: 'on' }` in preset AND block; preset backgrounds need raw hex, not `colorVar()`; stale `et-cache/{post_id}/*.css` after re-import (clear it).

### Stage 5 — Polish

Run the checklist in [references/polish.md](references/polish.md) before delivery — spacing, typography, colour, copy consistency the earlier gates don't catch.

## Non-negotiable rules

0. Always use the repo's local generator workflow and gates; do not skip the creative gate or the fidelity gate.
1. Never hand-write Divi JSON — always generate via `scripts/divi-builder.js`.
2. Always validate and run the fidelity gate before delivering; fix every FAIL.
3. Exactly one h1 — build it with `heroHeading()`; section headings are h2, card titles h3. `heading()` requires an explicit `level` (throws without it).
4. Every reused style is a `presetRef()` against the loaded preset library (Stage 0.5), referenced via `preset:`. Use `builder.preset()` only for one-off overrides not in the library.
5. Every image has descriptive alt text.
6. Real content only — no lorem ipsum unless requested.
7. Zero em-dashes/en-dashes in visible copy — use a hyphen.

## SEO

Primary keyword is validated across h1, opening copy, and h2s (see `scripts/validate.js`). Secondary keywords: one per section h2 where natural. FAQ questions as real long-tail queries; FAQPage schema from the same content. Max two font families; descriptive anchor text. Full rules: [references/seo.md](references/seo.md).

## Overdrive

`--overdrive` (or "maximum energy", "go all out"): Page mode with **VARIANCE 9 / MOTION 7-8 / DENSITY 3**. Before Stage 1, read [references/overdrive.md](references/overdrive.md), [references/bolder.md](references/bolder.md), and [references/delight.md](references/delight.md); pick 2-4 delight moments and the bolder moves that apply, and plan them before the Stage 2 HTML exists. Baseline (non-overdrive) dials are VARIANCE 7 / MOTION 4 / DENSITY 4.

## File map

| File | Purpose |
|---|---|
| [scripts/spec/validate-spec.js](scripts/spec/validate-spec.js) | Page-spec compat gate (vocabulary = schema) |
| [scripts/spec/spec-to-html.js](scripts/spec/spec-to-html.js) | Compile page-spec.json → preview HTML |
| [scripts/spec/spec-to-divi.js](scripts/spec/spec-to-divi.js) | Compile page-spec.json → Divi 5 JSON + SEO sidecars |
| [scripts/divi-builder.js](scripts/divi-builder.js) | Generator library |
| [scripts/validate.js](scripts/validate.js) | Structural + SEO validator |
| [scripts/taste-check.js](scripts/taste-check.js) | Anti-slop gate |
| [scripts/fidelity-check.js](scripts/fidelity-check.js) | Mockup-fidelity gate (Stage 3.5) |
| [scripts/et-pages.js](scripts/et-pages.js) | ET pack clone/match |
| [scripts/preview.js](scripts/preview.js) | Divi JSON → HTML preview |
| [references/aesthetics.md](references/aesthetics.md) | Aesthetic presets |
| [references/taste.md](references/taste.md) | Design judgement / taste pre-flight |
| [references/layout-patterns.md](references/layout-patterns.md) | Layout recipes |
| [references/seo.md](references/seo.md) | Full SEO rules |
| [references/module-reference.md](references/module-reference.md) | Raw attribute patterns |
| [references/responsive-rules.md](references/responsive-rules.md) | Responsive emission rules (clamp ramp, grids, mobile backgrounds) |
