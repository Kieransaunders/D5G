# Capability: brand-preset-generation

A function turns a brand's `global_colors` + `global_variables` (the
`divi5-variables-from-styleguide` output) plus a role map into a Divi preset pack whose
heading/button/section presets use the brand's fonts/sizes and reference its colours via
`$variable()` where Divi permits (text), using raw hex where Divi requires it (backgrounds).

## ADDED Requirements

### Requirement: buildBrandPresets produces a preset pack from variables + roles
`build-brand-presets.js` MUST export `buildBrandPresets(variables, roles)` returning an
object with `presets`, `global_colors`, `global_variables`. The `presets.module` MUST
contain at least `divi/heading`, `divi/button`, and `divi/section` entries.

#### Scenario: result carries heading, button, and section presets
- GIVEN feature-A variables and a role map
- WHEN `buildBrandPresets(variables, roles)` is called
- THEN the result's `presets.module` has `divi/heading`, `divi/button`, and `divi/section`

### Requirement: button and heading presets reference brand colours via $variable
A button preset MUST reference a brand colour via `$variable({"type":"color",...})` (its
text colour); a heading preset MUST use the brand heading font family from the role map.
Backgrounds use raw hex (looked up from the variables) because Divi preset CSS does not
resolve `colorVar()` for backgrounds.

#### Scenario: button preset references a colour via $variable
- GIVEN variables with brand colours and a role map
- WHEN the preset pack is built
- THEN at least one `divi/button` preset's serialized attrs contain `$variable(`

#### Scenario: heading preset uses the brand heading font
- GIVEN a role map with `headingFont: "Plus Jakarta Sans"`
- WHEN the preset pack is built
- THEN at least one `divi/heading` preset's serialized attrs contain that font family

### Requirement: button presets carry enable:"on"
Every generated button preset MUST carry `enable: "on"` so it renders as a button.

#### Scenario: button preset has enable on
- GIVEN variables and a role map
- WHEN the preset pack is built
- THEN at least one `divi/button` preset's serialized attrs contain `"enable":"on"`

### Requirement: brand pack is usable as a preset library
`build-brand-presets.js` MUST export `brandPresetLibrary(pack)` that converts a
`buildBrandPresets` pack into a name-keyed registry (module → name → `{ id, attrs }`) so a
builder can `loadPresetRegistry(lib, { withAttrs: true })` and resolve the brand presets by
their stable names via `presetRef()`. The registry MUST carry inlined attrs so the resolved
presets render correctly (single-import mode, where the same pack is imported alongside the
page and IDs remap consistently).

#### Scenario: brand presets resolve by name from the pack
- GIVEN a pack from `buildBrandPresets(variables, roles)`
- WHEN `brandPresetLibrary(pack)` is loaded via `loadPresetRegistry(lib, { withAttrs: true })`
- THEN `presetRef('divi/heading', 'Brand H1')`, `presetRef('divi/button', 'Brand Button Primary')`, and `presetRef('divi/section', 'Brand Section Light')` each return an entry with an `id` and non-null `attrs` without throwing

#### Scenario: resolved button preset carries the brand accent background
- GIVEN a pack built from variables whose accent colour is a known hex
- WHEN the button preset is resolved via `presetRef('divi/button', 'Brand Button Primary')`
- THEN its serialized `attrs` contain that accent hex (proving the resolved preset is the brand one, not an ET default)

### Requirement: Stage 0.5 sources the preset library from the brand pack
The `divi5-page-generator` SKILL.md Stage 0.5 MUST instruct the generator to build the brand
preset pack (`build-brand-presets.js`) and use it as the preset library — replacing the ET
registry — referencing the brand presets by their stable names (`Brand H1`,
`Brand Button Primary`, `Brand Section Light`). It MUST distinguish the two consumption
paths: single-import (local `brandPresetLibrary`) and two-step live (import the pack, fetch
the server registry with attrs, then `presetRef` by name).

#### Scenario: Stage 0.5 documents the brand-pack wiring
- GIVEN the `divi5-page-generator/SKILL.md`
- WHEN the Stage 0.5 section is read
- THEN it references `build-brand-presets` and each of the three brand preset names
- AND it states that the brand pack replaces the ET registry when brand variables are available
