# Spec-First Generation


### Requirement: Page spec validation against the supported vocabulary
The generator MUST provide `scripts/spec/validate-spec.js` exposing `validateSpec(spec)` (and a CLI) that returns `{ errors, warnings }`. It MUST reject module kinds and column layouts outside the supported vocabulary, MUST reject theatre presets not present in `preset-manifest.json`, and MUST accept `raw` modules with a warning rather than an error.

#### Scenario: Valid spec passes
- GIVEN a page spec using only supported module kinds, layouts, and theatre presets
- WHEN `validateSpec(spec)` runs
- THEN it returns zero errors
- AND zero warnings

#### Scenario: Unsupported column layout fails
- GIVEN a spec with a section whose `layout` is `split-13-11`
- WHEN `validateSpec(spec)` runs
- THEN it returns an error
- AND the error message names the offending section and the unsupported layout value

#### Scenario: Unknown module kind fails
- GIVEN a spec containing a module of kind `carousel`
- WHEN `validateSpec(spec)` runs
- THEN it returns an error naming the unknown kind `carousel`

#### Scenario: Raw escape hatch warns instead of failing
- GIVEN a spec containing a module of kind `raw`
- WHEN `validateSpec(spec)` runs
- THEN it returns zero errors
- AND it returns a warning identifying the raw module so it appears in the run report

### Requirement: Spec compiles to the HTML preview
The generator MUST provide `scripts/spec/spec-to-html.js` exposing `specToHtml(spec)` that compiles a valid spec to the Stage 2 preview HTML. The output MUST contain the spec's copy and heading structure with exactly one `h1`, MUST NOT contain script tags or CSS keyframe animations, and MUST render each section's `theatre` value as a visible text annotation.

#### Scenario: Structure and copy compile to HTML
- GIVEN a valid spec whose hero contains a `heroHeading` and whose second section contains a level-2 `heading`
- WHEN `specToHtml(spec)` runs
- THEN the HTML contains the hero heading text inside the document's only `h1`
- AND the second section's heading text appears in an `h2`
- AND the body copy from the spec appears in the HTML

#### Scenario: Motion is annotated, not simulated
- GIVEN a valid spec whose hero section declares `theatre: "hero-reveal"`
- WHEN `specToHtml(spec)` runs
- THEN the HTML contains a visible text annotation naming `hero-reveal`
- AND the HTML contains no `<script>` element
- AND the HTML contains no `@keyframes` rule

### Requirement: Spec compiles to importable Divi 5 JSON
The generator MUST provide `scripts/spec/spec-to-divi.js` exposing `specToDivi(spec)` that compiles the same spec to Divi 5 page JSON through `divi-builder.js` helpers. The output MUST pass the existing structural validator, and every module `preset` reference MUST resolve through the loaded preset registry (by name or registry ID), never by minting an inline style.

#### Scenario: Compiled JSON passes the structural validator
- GIVEN a valid spec with a primary SEO keyword
- WHEN `specToDivi(spec)` runs and the page JSON is written to the output folder
- THEN `node scripts/validate.js <page.json> --keyword "<primary>"` exits 0

#### Scenario: Preset references resolve through the registry
- GIVEN a valid spec whose button module declares `preset: "Button — Primary"`
- WHEN `specToDivi(spec)` runs with the ET preset registry loaded
- THEN the compiled output references that preset by registry name or registry ID
- AND no equivalent inline style is minted for that module

### Requirement: Fidelity by construction
Compiling the HTML preview and the Divi JSON from the same spec MUST produce matching heading outlines, so the existing fidelity gate passes without a repair loop.

#### Scenario: Compiled pair passes the fidelity gate
- GIVEN a valid spec compiled by both `specToHtml(spec)` and `specToDivi(spec)`
- WHEN `node scripts/fidelity-check.js <page.json> <preview.html>` runs on the pair
- THEN it exits 0 with no heading-outline or h1 mismatch

### Requirement: Spec-first workflow is documented and scoped to scratch builds
`SKILL.md` MUST document `page-spec.json` as the single authored artefact for page-mode scratch builds, and MUST state that clone and mutate modes remain JSON-native.

#### Scenario: SKILL.md documents the spec-first scratch workflow and the clone scope guard
- GIVEN the shipped `SKILL.md`
- WHEN its page-mode workflow is read
- THEN it names `page-spec.json` as the only artefact the agent authors and edits for scratch builds
- AND it states that clone and mutate modes stay JSON-native
