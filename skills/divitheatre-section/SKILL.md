---
name: divitheatre-section
description: "Generates a single, importable Divi 5 section for one DiviTheatre animation preset - one section per effect. Use when you want a standalone section that showcases a specific DiviTheatre animation: pin:product-reveal, hero-reveal, stagger, parallax-scroll, fade-up, fade-left, fade-right, scale-in, hover-grow. Produces a validated et_builder_layouts JSON ready for Divi Library import. Triggers: divitheatre section, theatre section, pin product reveal section, animated section divi, divi theatre effect, divi animation section, pin section divi, product reveal section, showcase animation divi."
argument-hint: "<preset-name> [brand] [brief]"
allowed-tools: Bash(node *)
---

# DiviTheatre Section Generator

You generate **one self-contained Divi 5 section** that demonstrates a single DiviTheatre animation preset. The output is an `et_builder_layouts` JSON importable via Divi Library -> Import (with "Import Presets" checked).

DiviTheatre **must already be installed** on the target WordPress site. If the user is unsure, ask first - a section with `data-theatre` attributes on a site without the plugin is harmless (attributes are ignored) but the animation won't play.

---

## Output location

Write all artefacts to the **Divi5 output folder** - never into this repo:

```js
const os = require('os'), path = require('path'), fs = require('fs');
const OUT = process.env.DIVI5_OUT || path.join(os.homedir(), 'Desktop', 'Divi5 Pages');
fs.mkdirSync(OUT, { recursive: true });
```

Tell the user the full path when done.

---

## Supported presets

| Preset | Effect | Section role |
|---|---|---|
| `pin:product-reveal` | Section pins while media scales; content panels reveal in scroll sequence | Full-section hero or feature set-piece |
| `hero-reveal` | Choreographed bg fade, headline, body, CTA | Hero section |
| `stagger` | Row children cascade up with 100ms offset | Feature or testimonial row |
| `parallax-scroll` | Background image drifts on scroll | Image-led CTA or divider |
| `fade-up` | Element fades in + translates up | Any content section |
| `fade-left` | Element slides in from left | Split image/text |
| `fade-right` | Element slides in from right | Split image/text |
| `scale-in` | Element scales from 0.9 to 1 + fades | Card grid |
| `hover-grow` | Scales to 1.08 on hover | CTA / button emphasis |

If no preset is specified in the arguments, **default to `pin:product-reveal`** - it is the most visually striking and the primary use-case for this skill.

---

## Workflow

### Step 1 - Identify preset and gather brief

Parse `$ARGUMENTS`:
- First word/token that matches a preset name -> `PRESET`
- Remaining text -> brand name, product/feature description, copy direction

If running interactively (no arguments), ask in one `AskUserQuestion` call:
1. Which preset (single-select from the table above, default `pin:product-reveal`)
2. Brand / product name
3. One-sentence description of what is being showcased

### Step 2 - Design the section structure

Map the chosen preset to its canonical section anatomy:

**`pin:product-reveal`** (default)
```
section  [data-theatre="pin:product-reveal"]  [data-theatre-distance="200vh"]
  row (full-width)
    column
      image/video  [data-theatre-part="media"]   <- the element that pins + scales
      text panel 1 [data-theatre-part="panel"]   <- reveals first
      text panel 2 [data-theatre-part="panel"]   <- reveals second
      text panel 3 [data-theatre-part="panel"]   <- reveals third (optional)
```
- Use a real product/feature image (or `https://picsum.photos/1200/800?random=1` as placeholder).
- Each panel = a short heading + 1-2 sentences of benefit copy. No Lorem Ipsum.
- Section background: dark (obsidian or navy) so the pinned reveal reads cinematically.

**`hero-reveal`**
```
section  [data-theatre="hero-reveal"]
  row: eyebrow text | h2 heading | body paragraph | CTA button
```
Background image with dark overlay. `theatreOpts: { trigger: 'onLoad' }`.

**`stagger`**
```
section
  row  [data-theatre="stagger"]
    column x 3:  blurb (icon + title + body)
```
Each column child staggers in automatically.

**`parallax-scroll`**
```
section  [data-theatre="parallax-scroll"]   (background image)
  row: h2 + body + button
```
Self-managed; no trigger needed.

**`fade-up` / `fade-left` / `fade-right`**
```
section
  row (split)
    column: image   [data-theatre="fade-left"]
    column: h2 + body + button   [data-theatre="fade-right"]
```

**`scale-in`**
```
section
  row x N: blurb cards  [data-theatre="scale-in"] per card
```

**`hover-grow`**
```
section (CTA band)
  row: heading + body + button  [data-theatre="hover-grow"] on button
```

### Step 3 - Write the generator script

**Preset slug rule.** Transform the preset name to a filename-safe slug before using it in script names, JSON slugs, and output filenames:
- Lowercase, replace `:` with `-`, replace remaining non-alphanumeric characters (except `-`) with `-`, collapse consecutive `-` to one.
- Examples: `pin:product-reveal` -> `pin-product-reveal`, `fade-up` -> `fade-up`.

Use `presetSlug` and `brandSlug` consistently in the filename, the JSON `slug` field, and the output file path.

File: `generate-theatre-<presetSlug>-<brandSlug>.js` in `OUT`.

**Before running this script manually**, set `CLAUDE_SKILL_DIR`:
```bash
export CLAUDE_SKILL_DIR="<path-to-divi5generate>/skills/divitheatre-section"
```
The app sets this automatically when it invokes the skill.

```js
const os = require('os'), path = require('path'), fs = require('fs');

if (!process.env.CLAUDE_SKILL_DIR) {
  throw new Error(
    'CLAUDE_SKILL_DIR is not set. Before running manually:\n' +
    '  export CLAUDE_SKILL_DIR="<path-to-divi5generate>/skills/divitheatre-section"'
  );
}
const D = require(path.join(process.env.CLAUDE_SKILL_DIR, '../divi5-page-generator/scripts/divi-builder.js'));

const OUT = process.env.DIVI5_OUT || path.join(os.homedir(), 'Desktop', 'Divi5 Pages');
fs.mkdirSync(OUT, { recursive: true });

const PRESET = 'pin:product-reveal'; // set to the chosen preset
const BRAND  = 'acme';               // set to the brand name
const presetSlug = PRESET.toLowerCase().replace(/:/g, '-').replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
const brandSlug  = BRAND.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');

const builder = D.createBuilder();

// --- global colours (brand-specific only; ET design system colours via colorRef) ---
const accent = builder.globalColor('theatre-accent', '#your-hex', 'Accent');

// --- section content ---
const content = D.placeholder([
  /* your section block */
]);

const json = builder.assemble({
  context: 'et_builder_layouts',
  content,
  title: `${BRAND} ${PRESET} Section`,
  slug: `${brandSlug}-${presetSlug}-section`,
});

const outFile = path.join(OUT, `${brandSlug}-${presetSlug}-section.json`);
fs.writeFileSync(outFile, JSON.stringify(json, null, 2));

// on-disk gate: validate immediately after writing
const written = fs.readFileSync(outFile, 'utf8').trimStart();
if (written[0] !== '{') { console.error('FAIL: not JSON'); process.exit(1); }
const parsed = JSON.parse(written);
if (parsed.context !== 'et_builder_layouts') { console.error('FAIL: wrong context:', parsed.context); process.exit(1); }
console.log('OK: valid et_builder_layouts section JSON');
console.log('Written:', outFile);
```

#### Theatre attribute helpers

```js
// Option A: inline shortcut on the module helper
D.section({ theatre: 'pin:product-reveal', theatreOpts: { distance: '200vh' } }, rows)
D.image({ src: '...', alt: '...', theatrePart: 'media' })
D.text({ html: '<h3>Panel 1</h3><p>...</p>', theatrePart: 'panel' })

// Option B: explicit attrs
D.image({ src: '...', alt: '...', attrs: D.theatreAttrs('pin:product-reveal') })
```

Both approaches write into `module.decoration.attributes.desktop.value.attributes` - the only path Divi 5 renders as HTML data attributes.

### Step 4 - Run and validate

```bash
cd "${DIVI5_OUT:-$HOME/Desktop/Divi5 Pages}"
node generate-theatre-<presetSlug>-<brandSlug>.js
node ${CLAUDE_SKILL_DIR}/../divi5-page-generator/scripts/validate.js ${brandSlug}-${presetSlug}-section.json
```

For section mode, omit `--keyword` and `--meta` (no SEO requirements). Fix all FAILs. The h1 rule does NOT apply to sections - use h2 for the section heading.

#### On-disk gate (mandatory before delivery)

The gate runs automatically at the end of the generated script (see above). Do not declare done until the script prints `OK: valid et_builder_layouts section JSON`.

### Step 5 - Deliver

Tell the user:
1. The full output path.
2. Import via **Divi Library -> Import -> check "Import Presets"** - not the page importer.
3. Place the section on a page that has DiviTheatre active.
4. For `pin:product-reveal`: remind them that the section must not be inside an ancestor with `overflow: hidden` (kills the sticky pin). As a top-level page section it is safe.
5. For placeholder images: flag any `picsum.photos` URLs so they can swap in real photography before launch.

---

## Design rules for theatre sections

- **Dark backgrounds** for `pin:product-reveal` and `hero-reveal` - the animation reads against dark.
- **No Lorem Ipsum.** Write real benefit-driven copy matched to the brand.
- **One section, one animation.** Don't stack multiple `data-theatre` presets in the same section - the engine picks the first and ignores others. Per-element attributes are fine.
- **Mobile parity.** All presets jump to final visible state on viewports under 768px - never leave content hidden on mobile. The `pin:product-reveal` scene does not pin on mobile; it renders as a normal scrollable section.
- **`prefers-reduced-motion` parity.** The engine handles this automatically (jumps to end state). No extra code needed.
- **Spacing.** Use fluid padding - `clamp(60px, 10vw, 140px)` for top/bottom on a full-section pin reveal.

---

## `pin:product-reveal` - detailed anatomy

This is the flagship preset. When in doubt, use it.

```
[section: dark bg, 100vh+ height, data-theatre="pin:product-reveal" data-theatre-distance="200vh"]
  [row: full-width, no gutter]
    [column: 100%]
      [image: product screenshot/photo, data-theatre-part="media"]
        - scales from 0.85 to 1.0 while pinned; sits above panels visually
      [text/heading: "Panel 1 - Feature name", data-theatre-part="panel"]
        - fades in at 0-33% of the scroll runway
      [text: "Panel 2 - Feature name", data-theatre-part="panel"]
        - fades in at 33-66%
      [text: "Panel 3 - Feature name", data-theatre-part="panel"]  <- optional
        - fades in at 66-100%
```

**Copy pattern per panel:**
```
[h3] Feature name
[p]  One or two sentences of benefit copy. Concrete, specific, no fluff.
```

**Distance guidance:**
- 2 panels -> `150vh`
- 3 panels -> `200vh` (default)
- Very detailed copy -> `250vh`

The engine caps panels at 3. A 4th `data-theatre-part="panel"` child is silently ignored.

---

## File map

| Path | Purpose |
|---|---|
| `${CLAUDE_SKILL_DIR}/../divi5-page-generator/scripts/divi-builder.js` | Builder library |
| `${CLAUDE_SKILL_DIR}/../divi5-page-generator/scripts/validate.js` | Structural validator |
| `${CLAUDE_SKILL_DIR}/../divi5-page-generator/references/divi-theatre.md` | Full preset catalogue + trigger reference |
| `${CLAUDE_SKILL_DIR}/../divitheatre-engine/SKILL.md` | Theatre.js engine internals (when debugging animation) |
