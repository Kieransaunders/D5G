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
