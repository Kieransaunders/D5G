# Divi 5.3–5.6 knowledge gap — action list

**Date:** 04/07/2026 (updated same day)
**Trigger:** Review of [cjsimon2/Divi5-ToolKit](https://github.com/cjsimon2/Divi5-ToolKit) — a CSS-side scaffolding plugin. Not a JSON generator (no overlap with our pipeline), but its knowledge base is current to Divi 5.6 and exposed gaps in ours.

**Licence:** MIT, declared in the plugin's `.claude-plugin/plugin.json` (an earlier version of this doc wrongly said unlicensed — there's no LICENSE file, but the manifest declares MIT). On that basis its three knowledge skills — `divi5-css-patterns`, `divi5-compatibility`, `divi5-performance` — have been **vendored into `skills/` with attribution** (NOTICE.md in each). `module-reference.md` now carries the breakpoint widths table, the 5.5 aspect-ratio rule, and a do-not-guess warning for 5.6 module JSON.

## What our skills don't know yet

Checked `divi5-page-generator/references/module-reference.md` — no hits for any of the following.

### 5.6 modules (released 25/05/2026) — not in module-reference

| Module | Why it matters for generation |
|---|---|
| Timeline | Chronology sections (pairs with Loop Builder) — currently we'd fake this with blurbs |
| Breadcrumbs | Theme Builder templates + SEO; Home Link has its own settings group, not the general link styling |
| SVG | Inline SVG with native stroke/width — replaces image-module workarounds |
| Table of Contents | Auto-generates from headings — good for long-form/SEO pages |
| Instagram Feed | Social proof sections |

### 5.5 (12/05/2026)
- **Aspect Ratio setting on every image element** — reserves space, kills CLS. Generator should emit this on every image module. Biggest quick win.
- **Framing settings** — object-fit/position via builder attrs.
- Image presets + composable image option groups.

### 5.4
- **Sizing Variable Generator** — native fluid `clamp()` type scales. May overlap with our `type-scale.js`; check whether emitting Divi sizing variables beats baking clamp() into attrs.
- **Relative Colorscheme Generator** — HSL derivative shades from a base colour (relevant to `divi5-brand-profile`).

### 5.3 (24/04/2026)
- **Pseudo-class editing** (`:checked`, `:focus`, `:active`) as builder attrs — forms no longer need custom CSS for these.
- **Nested Option Presets** — presets within presets (e.g. CTA > Button > Border).
- **Contact Form 7 Styler module**.

### Cross-version, absent from our references
- **Canvas system + Canvas Portal module** — off-canvas menus, popups. We can't currently generate these at all.
- **Loop Builder** — native repeating content with CSS Grid; the route to blog/product grid sections.
- **Default breakpoint widths** — ours names the five keys but not the widths: phone 767, phoneWide 860, tablet 980, tabletWide 1024, desktop base, widescreen 1280 (min-width), ultraWide 2560 (min-width). Only 3 active by default.

## Status: CLOSED (04/07/2026)

The JSON schema gap is closed — and better than the original plan. Instead of exporting
module examples one by one, `scripts/extract-module-schema.py` mines the **authoritative
`module.json` definitions inside the Divi theme itself**
(`includes/builder-5/visual-builder/packages/module-library/src/components/`).
Run against the local Divi **5.8.1** install (note: two minor versions past the 5.6
this doc was written for), it produced
`references/module-schema-reference.md` — attribute paths for all 83 modules, including
every previously missing one.

Verified end-to-end: a Timeline page built purely from the extracted schema passed
`validate.js` (whose parent→child nesting rules are now sourced from the same data)
and imported + rendered correctly via the Divi Tools Importer on `localhost:10015`
(page `timeline-schema-test`, id 3141).

Caveat that remains: the schema reference proves a path *exists*, not its exact value
shape. For complex value objects, cross-check the cheat sheet or a real export
(`/export` endpoint) before shipping a new builder helper.

## Original close-out plan (superseded)

1. On a Divi 5.6 site, build one instance of each new module (Timeline, Breadcrumbs, SVG, TOC, Instagram Feed, Canvas Portal, a Loop Builder grid) and export.
2. Run `skills/divi5-page-generator/scripts/extract-attr-paths.py` against the export to capture real attribute schemas.
3. Add each to `module-reference.md` + a minimal example to `examples/`.
4. Update the generator to always set Aspect Ratio on image modules.
5. Add breakpoint widths table to module-reference.
6. Teach `design-review` to flag: images without aspect ratio, chronology-as-blurbs (suggest Timeline), long-form pages without TOC.

## Optional: run the toolkit alongside

Its skills auto-activate for Divi CSS work and complement (don't overlap) our JSON pipeline:

```bash
claude plugin marketplace add cjsimon2/Divi5-ToolKit
claude plugin install divi5-toolkit@divi5-toolkit
```

Useful for post-import CSS refinement, audits, and its `/responsive` device-matrix check.

## Follow-up (04/07/2026) — responsive rules + design-review checks

`references/responsive-rules.md` now encodes ET's mobile best practices as emission rules;
`design-review` gained the matching WARN checks incl. plan item 6 (aspect ratio,
chronology→Timeline, long-form→TOC). Number global variables remain known-broken on
import (see divi-builder.js typeScale comment) — re-test on 5.8.1. Five value shapes
still to capture from one real export: minmax columns, Display Order, Aspect Ratio,
image-off per breakpoint, Background Mask.
