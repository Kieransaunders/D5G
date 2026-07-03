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
- Wire the pack into the generator: export `brandPresetLibrary(pack)` converting the pack
  into a name-keyed registry a builder can `loadPresetRegistry(lib, {withAttrs:true})` and
  `presetRef()` by stable name — so the brand pack IS the preset library, not the ET pack.
- Update `divi5-page-generator/SKILL.md` **Stage 0.5** to source the preset library from the
  brand pack (build → use as library) when brand variables exist, referencing the brand
  presets by their stable names (`Brand H1`, `Brand Button Primary`, `Brand Section Light`),
  and to distinguish single-import (local library) from two-step live (fetch server registry
  by name after import).

## Capabilities
- New: `brand-preset-generation`

## Impact
- **New files:** `scripts/build-brand-presets.js` (function + CLI + `brandPresetLibrary`).
- **Modified:** `divi5-page-generator/SKILL.md` Stage 0.5 (preset library sourced from the
  brand pack, referenced by stable preset name).
- **Not affected:** the builder library (consumed, not modified).
- **Source:** consumes the `divi5-variables-from-styleguide` output format directly.
- **Cross-boundary note:** the two-step live path imports the pack and re-fetches the
  server-assigned registry (IDs remap on import), so integration hinges on **preset name
  stability**, not local IDs; the local `brandPresetLibrary` is only valid for single-import
  mode where the same pack ships with the page.
