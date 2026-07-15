# Divi Capability Compatibility Plan

## Purpose

Divi5Generate already has real Divi 5 JSON exports, generated attribute-path maps, builder helpers, and review scripts. The missing layer is a single, explicit compatibility contract that says what the HTML mockup is allowed to express and what the Divi generator is expected to reproduce.

This plan turns the existing reference material into a practical source of truth for beautiful Divi pages:

- HTML mockups stay fast and visual.
- Mockups remain constrained to Divi-compatible primitives.
- Generator helpers are backed by real Divi exports, not guesses.
- Code-first QA happens before visual screenshot review.
- Gaps become export tasks instead of ad hoc JSON paths.

## Current Sources Of Truth

Use this hierarchy when deciding whether a mockup pattern or generator feature is supported.

```text
1. Real Divi JSON exports
   references/Divi design system JSON/
   references/Divi-5-Design-System/

2. Extracted attribute evidence
   references/attr-paths.json
   references/module-attribute-cheatsheet.md

3. Generator implementation
   scripts/divi-builder.js

4. Human notes and known limits
   references/module-reference.md
   references/divi-theatre.md
   references/layout-patterns.md
   references/polish.md

5. HTML mockup compatibility contract
   To be created from the sources above
```

The key rule: if a module or attribute path is not present in the export-backed references, do not guess. Export a real Divi example first, then update the extracted reference files and builder helpers.

## Existing Evidence

The repo currently includes:

- Full Divi design system exports:
  `skills/divi5-page-generator/references/Divi design system JSON/`
- Individual section exports by section type:
  `skills/divi5-page-generator/references/Divi design system JSON/Individual Sections/By Section Type/`
- A second Divi 5 design system pack:
  `skills/divi5-page-generator/references/Divi-5-Design-System/`
- Machine-readable attribute paths:
  `skills/divi5-page-generator/references/attr-paths.json`
- Human-readable generated cheat sheet:
  `skills/divi5-page-generator/references/module-attribute-cheatsheet.md`
- Human module notes and limitations:
  `skills/divi5-page-generator/references/module-reference.md`
- Builder helpers:
  `skills/divi5-page-generator/scripts/divi-builder.js`

The generated cheat sheet is based on thousands of real Divi-saved blocks and should be treated as stronger evidence than external docs or assumptions.

## Compatibility Model

The HTML mockup is not an unconstrained website prototype. It is a Divi-compatible visual sketch.

```text
HTML mockup
    │
    ▼
Divi compatibility gate
    │
    ├── allowed: sections, rows, columns, headings, text, buttons, images
    ├── allowed: supported spacing, backgrounds, type, radius, colours
    ├── allowed: known DiviTheatre presets with safe usage rules
    │
    ├── warn: table/layout workarounds inside text modules
    ├── warn: custom CSS that targets rendered Divi classes
    │
    └── fail: CSS/JS interactions Divi cannot represent
```

The generated Divi JSON and the real Divi preview are the final authority. The HTML mockup is a fast approval artifact, not the source of truth by itself.

## Mockup Vocabulary

### Supported By Default

These should be safe to use in HTML mockups and expected to map to `divi-builder.js` helpers:

- Section backgrounds: flat colour, simple image overlay when supported by helper.
- Rows: one-column, two-column, three-column where taste rules allow, asymmetric 24-column ratios.
- Columns: `24_24`, `18_24`, `16_24`, `14_24`, `12_24`, `10_24`, `8_24`, `6_24`.
- Modules: heading, text, button, image, blurb, icon, accordion, number-counter, divider.
- Typography: explicit h1/h2/h3 levels, max two font families, responsive heading sizes.
- Design tokens: global colours, reusable presets, clamp values where Divi accepts raw CSS values.
- Motion: DiviTheatre attributes emitted through builder helpers only.

### Supported With Caution

These may be allowed, but need explicit review:

- Inline HTML inside text modules for tables, logo bars, or simple SVG icons.
- Custom CSS targeting rendered Divi classes.
- Complex backgrounds, gradients, masks, shadows, and overlays.
- Pinned DiviTheatre scenes such as `pin:product-reveal`.
- Scroll-triggered entrance effects that can temporarily hide content before verification.

### Not Supported Until Proven

These should fail the compatibility gate unless a real Divi export proves the pattern:

- Arbitrary JavaScript interactions in the mockup.
- CSS grid layouts that do not map to Divi row/column or known grid attrs.
- Pseudo-elements carrying meaningful content.
- Canvas/WebGL as required content.
- Sticky/pinned interactions outside known DiviTheatre or Divi sticky attributes.
- Unknown module attribute paths.
- Unsupported module types with no real export example.
- Visual states that require CSS selectors Divi does not render or preserve.

## Proposed New Reference

Create:

`skills/divi5-page-generator/references/divi-capability-matrix.md`

It should summarize:

| Area | Status | Evidence | Builder Support | Mockup Rule |
|---|---|---|---|---|
| Heading levels | supported | export paths | `heading`, `heroHeading` | allowed |
| Buttons | supported | export paths + button preset helper | `button`, `buttonPreset` | allowed |
| Section background image | partial | module-reference limitation | `overlaySection` | caution |
| Number counter percent | supported | export path | `numberCounter` | allowed |
| Product reveal pin | supported if DiviTheatre installed | DiviTheatre manifest | `theatre` attrs | caution |
| Arbitrary JS | unsupported | no Divi export | none | fail |

This matrix should be generated or at least checked against `attr-paths.json` so it does not drift.

## Proposed Gate: Divi Mockup Compatibility

Add a script:

`skills/divi5-page-generator/scripts/mockup-compat-check.js`

Inputs:

```bash
node scripts/mockup-compat-check.js preview-brand.html
```

Checks:

- HTML has exactly one h1 and a valid heading outline.
- Mockup sections map to Divi section/row/column patterns.
- No unsupported CSS features in layout-critical rules.
- No arbitrary script tags.
- No pseudo-element content used for meaningful text.
- No unknown animation or interaction requirement.
- Optional `data-divi-module` annotations map to known builder helpers.
- Optional `data-theatre` annotations use known DiviTheatre presets.

Output:

```text
PASS mockup uses Divi-compatible primitives
WARN section background image requires live render verification
FAIL CSS grid pattern has no supported Divi mapping
```

This gate should run after the HTML taste gate and before JSON generation.

## Code-First QA Sequence

The desired page review sequence is:

```text
Stage 1: Concept
  concept stamp
  aesthetic and motion dials

Stage 2: HTML mockup
  taste gate
  Divi compatibility gate

Stage 3: Divi JSON generation
  node --check generator
  run generator
  validate.js
  taste-check.js
  fidelity-check.js

Stage 4: Real Divi preview
  preview endpoint
  browser screenshot
  blank-section detection
  visual diff where applicable

Stage 5: Import
  publish/update same slug
  SEO meta and schema write
  final screenshot
  run report
```

Visual review must not start until the generated Divi JSON passes the code-first checks.

## Export-First Workflow For New Capabilities

When a requested design pattern is not documented:

1. Create the pattern manually in Divi.
2. Export the section or page JSON.
3. Add the export to the reference pack.
4. Regenerate `attr-paths.json` and `module-attribute-cheatsheet.md`.
5. Add or update builder helpers.
6. Add validator checks for known failure modes.
7. Update the capability matrix.
8. Only then allow HTML mockups to use the pattern.

This keeps the generator tied to proven Divi behavior.

## Implementation Phases

### Phase 1: Document The Matrix

- Create `divi-capability-matrix.md`.
- Seed it from current modules in `attr-paths.json`.
- Mark each module as supported, partial, or reference-only.
- Link every entry to evidence: export file, attr path, builder helper, or known limitation.

### Phase 2: Add Mockup Annotations

Define optional HTML attributes for mockups:

```html
<section data-divi="section" data-layout="split-14-10">
<h1 data-divi="heroHeading">...</h1>
<a data-divi="button" data-style="primary">...</a>
<div data-theatre="hero-reveal">...</div>
```

These annotations make compatibility checks deterministic without requiring a full HTML-to-Divi compiler.

### Phase 3: Build The Compatibility Checker

- Parse HTML mockup.
- Inspect CSS for unsupported layout-critical patterns.
- Validate annotations against the capability matrix.
- Emit PASS/WARN/FAIL.
- Integrate with `gate.js mockup` or run immediately after it.

### Phase 4: Strengthen Code-First QA

- Add a run report that records every code-first gate.
- Include validator warnings, fidelity status, DiviTheatre presets, and unsupported-feature warnings.
- Block preview/import on FAIL.

### Phase 5: Visual Verification

- Screenshot real Divi preview.
- Detect blank or near-blank sections.
- Compare to approved mockup where practical.
- Capture lessons in the run report.

## Acceptance Criteria

- A developer can answer "Can Divi do this?" from one matrix document.
- A mockup can be checked before JSON generation.
- Unsupported HTML/CSS patterns fail before they become generator bugs.
- New Divi features require real export evidence before use.
- Visual review happens after code-first QA, not instead of it.
- Run reports show both code QA and visual QA results.

## Open Questions

- Should the capability matrix be hand-maintained, generated from `attr-paths.json`, or both?
- Should unsupported mockup features be hard FAILs, or WARNs with an explicit workaround?
- How much custom CSS should the generator allow before the page stops being Visual Builder-friendly?
- Should DiviTheatre support be detected from the WordPress site before the generator emits any motion attributes?
- Should the HTML mockup use annotations from day one, or should the checker infer patterns from CSS first?

## Recommended Next Change

After the active frontend-token change is verified and archived, propose a new SSWA change:

`add-divi-compatibility-gate`

Scope:

- Add the Divi capability matrix.
- Add mockup annotation rules.
- Add a first version of `mockup-compat-check.js`.
- Wire it into the page generator workflow before JSON generation.
- Add tests with one passing Divi-safe mockup and one failing unsupported mockup.
