# Brand preset pack generator

## Why
Feature A produces a brand's `global_colors` + `global_variables`, and feature B made
preset-first the default — but the default library is the ET pack. A brand has no way to
generate its OWN preset pack from its variables, so the "use/create Divi presets" loop is
not yet closed: brand colours live as variables but no brand presets reference them. This
turns the variables skill's output into a ready-to-import brand preset pack.

## What Changes
- New `scripts/build-brand-presets.js` exporting `buildBrandPresets(variables, roles)`:
  given feature-A variables + a role map (`accentGcid`, `lightGcid`, `darkGcid`,
  `headingFont`, `h1Size`, `buttonRadius`, …), produces a preset pack — a `Brand H1` heading
  preset (brand font + size, text colour via `$variable`), a `Brand Button Primary` (background
  as raw hex per Divi's preset-CSS rule, text colour via `$variable`, `enable:'on'`), and a
  `Brand Section Light` (raw-hex background). Returns `{presets, global_colors,
  global_variables}` — a complete importable pack.
- Reuses the builder's `headingPreset()` / `buttonPreset()` / `preset()` helpers, so the
  Divi preset shape is correct by construction.
- CLI: `node build-brand-presets.js <variables.json> <roles.json> [out.json]`.

## Capabilities
- New: `brand-preset-generation`

## Impact
- **New files:** `scripts/build-brand-presets.js` (function + CLI). No SKILL.md change in
  this slice (wiring it into Stage 0.5 as the preferred brand-pack source is a follow-up).
- **Not affected:** existing skills; the builder library (consumed, not modified).
- **Source:** consumes the `divi5-variables-from-styleguide` output format directly.
