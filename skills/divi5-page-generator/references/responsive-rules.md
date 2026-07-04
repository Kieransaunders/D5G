# Responsive rules — what the generator must emit

Source: [ET: Mobile Responsive Design With Divi 5](https://www.elegantthemes.com/blog/divi-resources/mobile-responsive-design-with-divi-5)
(05/03/2026, distilled 04/07/2026) cross-checked against `module-schema-reference.md`,
`divi-builder.js`, and real exports. Twelve builder-UI practices reduced to the six that
change what we emit.

## Verification status

| Pattern | JSON shape | Status |
|---|---|---|
| Fluid clamp() spacing/type (raw values) | any numeric field | **VERIFIED** — proven in production pages |
| Per-breakpoint grid column counts | `layout` value | **VERIFIED** — `layout-patterns.md` §4 |
| Per-breakpoint backgrounds | `background` value | **VERIFIED** — `module-reference.md` |
| clamp() via global Number variables | `$variable()$` refs | **BLOCKED** — see Rule 1 caveat |
| minmax auto-wrap columns ("Equal Minimum Width") | `gridColumnWidths` enum + min-width key | **UNVERIFIED** — need one real export |
| Display Order | `module.decoration.order` value | path confirmed, **shape unverified** |
| Image Aspect Ratio / Framing (5.5+) | inside `sizing` (probably) | **UNVERIFIED** — need one real export |
| Background Mask | `background` sub-key | **UNVERIFIED** |

**Do not emit UNVERIFIED shapes.** Build one instance in the VB on the 5.8.1 site, export
via `/export`, run `scripts/extract-attr-paths.py`, then promote the pattern to VERIFIED here.

---

## Rule 1 — Fluid spacing: three-tier clamp() ramp, raw values

Every generated page uses the fluid ramp instead of fixed px padding/margins.
`b.spaceScale()` returns the tiers; `b.spacingPresets()` wraps them as group presets.

| Tier | Our value (`type-scale.js`) | ET equivalent | Use for |
|---|---|---|---|
| L | `clamp(1.5rem, 1rem + 1vw, 2.5rem)` | `clamp(5%, 5vw, 80px)` | section/row outer padding |
| M | `clamp(1rem, 0.6rem + 0.8vw, 1.5rem)` | `clamp(24px, 4vw, 60px)` | column padding, module margins |
| S | `clamp(0.5rem, 0.3rem + 0.6vw, 1rem)` | `clamp(16px, 2.5vw, 30px)` | inner padding, small gaps |

Hero sections may exceed the ramp (see `module-reference.md` fluid hero padding) but must
still be clamp-based, not fixed px per breakpoint.

**Why raw values, not Variable Manager refs.** ET's article recommends registering these
as global Number variables and referencing them via dynamic content. Our builder
deliberately does NOT: Divi (tested v5.0.0-public-beta.9.1) silently drops numeric
global variables on import — REST reports success, the id is absent on re-export, and
`$variable()$` refs resolve to nothing. Colour variables are unaffected. Raw clamp()
strings render correctly and survive round-trips.

**Re-test candidate:** the article demonstrates Number variables working in the current
UI, and our local install is 5.8.1. If a re-test shows `import_global_variables` now
persists numbers, switch `typeScale()`/`spaceScale()` to `b.globalVariable()` refs —
one edit then retunes a whole site, which is the better handover story for clients.
Until that test passes, raw values stay.

## Rule 2 — Fluid typography: clamp() on every heading and body size

`b.typeScale()` → `{ h1, h2, h3, body }` clamp() strings. Pass as `font.size` in presets.
A page set entirely in clamp() sizes needs **no per-breakpoint font-size overrides** —
if you're writing `phone: { size: ... }` on a heading, use the scale instead. Explicit
phone sizes remain acceptable only where a design deliberately breaks the scale (e.g.
oversized display hero), mirroring ET's H1 `clamp(70px, 16vw, 300px)`.

## Rule 3 — Grids: prefer fewer breakpoint overrides

Verified shape (row `module.decoration.layout`):

```js
layout: dv(
  { display: 'grid', gridColumnCount: '3', gridColumnWidths: 'equal',
    columnGap: '24px', rowGap: '24px' },
  { tabletWide: { gridColumnCount: '2' }, phone: { gridColumnCount: '1' } }
)
```

- Card/feature/gallery grids: 3 desktop → 2 tablet → 1 phone is the default breakdown.
- Ultra-wide scaling (ET BP 4): widescreen/ultraWide are **min-width** breakpoints and
  **off by default** — only emit overrides for them when the brief says the site has
  them enabled. Same for phoneWide/tabletWide (off by default; phone/tablet/desktop are
  the three active ones).
- **Better (once verified):** ET BP 11's "Equal Minimum Width Columns" + min width
  (CSS `minmax()`) wraps columns with zero breakpoint overrides. The `gridColumnWidths`
  enum value and the min-width key are unverified — capture from a real export, then
  make this the default for uniform card grids and delete the per-breakpoint counts.

## Rule 4 — Mobile flow: CTA above the fold when columns stack

When a hero/split row stacks on phone, the column containing the primary CTA must not
land below a decorative image. Two tools:

- Column order in source: put the text/CTA column first — it stacks first. Free, always works.
- `module.decoration.order` (Display Order) exists on sections, rows, columns, and
  modules for reordering that source order can't express. Value shape unverified — don't
  emit until captured; restructure source order instead.

## Rule 5 — Backgrounds: simplify below tablet

Hero/band sections with a background image + gradient overlay keep them for
`desktop` (and wider) only. On `tablet` and `phone`, emit a solid colour (brand-derived)
and no image — smaller payload, no awkward cropping:

```js
background: dv(
  { color: '#1a1a2e',
    gradient: { enabled: 'on', stops: [...] },
    image: { url: '...', size: 'cover', position: 'center' } },
  { tablet: { color: '#1a1a2e', image: { enabled: 'off' } } }  // shape of image-off is UNVERIFIED — capture from export
)
```

The exact attr for removing an inherited image at a lower breakpoint is unverified —
verify before emitting; until then, only attach background images at section level where
the desktop-only trade-off is acceptable, and never rely on a bg image for text contrast
on phone. ET pairs the mobile colour with a subtle Background Mask (~9% opacity) —
optional, shape also unverified.

## Rule 6 — Images: aspect ratio always (Divi 5.5+)

Every image element supports Aspect Ratio + Framing (object-fit/position). Emitting an
aspect ratio reserves layout space and kills CLS — the single biggest CWV win available
to the generator. Schema path/value shape still unverified (not visible at
`module-schema-reference.md` path granularity — it lives inside a `sizing`/element value).
Capture from a real 5.5+ export, then emit on **every** image module by default.

---

## design-review hooks

These rules are enforced as WARN checks in the `design-review` skill's checklist:
fixed-px spacing where the ramp should be, per-breakpoint font sizes instead of clamp,
background images persisting to phone, images without aspect ratio (once emittable),
CTA below decorative content in stacked heroes.
