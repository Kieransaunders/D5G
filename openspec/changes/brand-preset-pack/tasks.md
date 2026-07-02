# Tasks: Brand preset pack generator

RED proof: 4 failures in `scripts/__tests__/brand-presets.test.js` ("build-brand-presets.js
missing"). Run: `node scripts/__tests__/brand-presets.test.js` from
`skills/divi5-page-generator/`.

## 1. build-brand-presets.js
Turns green: T1-T4
- [x] 1.1 Export `buildBrandPresets(variables, roles)` that creates a builder, sets
      `DIVI5_SKIP_TASTE_GATE='1'` (pack builder, no page brief), and returns
      `{presets, global_colors, global_variables}` [test: T1]
- [x] 1.2 Register a `Brand H1` via `headingPreset` with the role map's font + size and text
      colour via `$variable(darkGcid)` [test: T3]
- [x] 1.3 Register a `Brand Button Primary` via `buttonPreset` with background as RAW HEX
      (looked up from variables by `accentGcid`), text colour via `$variable(lightGcid)`,
      `enable:'on'` (buttonPreset default) [test: T2, T4]
- [x] 1.4 Register a `Brand Section Light` via `preset('divi/section', ...)` with a RAW-HEX
      background (looked up from `lightGcid`)

## 2. CLI
- [x] 2.1 `node build-brand-presets.js <variables.json> <roles.json> [out.json]` — read the
      two files, build, write the pack JSON (or print to stdout)

## 3. Verification
- [x] 3.1 `brand-presets.test.js` all green (4 assertions)
- [x] 3.2 Full skill suite stays green (no regression)
