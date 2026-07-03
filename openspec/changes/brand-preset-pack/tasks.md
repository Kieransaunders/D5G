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

## 3. Stage 0.5 wiring (RED)
RED proof: 3 failures in `scripts/__tests__/brand-preset-wiring.test.js` (`brandPresetLibrary
not exported`; Stage 0.5 not wired). Run from `skills/divi5-page-generator/`.
- [x] 3.1 Export `brandPresetLibrary(pack)` from `build-brand-presets.js` — convert
      `pack.presets.module[*].items` into a name-keyed registry (`module → item.name →
      {id: item.id, attrs: item.attrs}`) so `loadPresetRegistry(lib, {withAttrs:true})` +
      `presetRef()` resolve by stable name [test: W1, W2]
- [x] 3.2 Update `SKILL.md` Stage 0.5: when brand variables exist, build the pack
      (`build-brand-presets.js`) and use it as the preset library instead of the ET
      registry, referencing `Brand H1` / `Brand Button Primary` / `Brand Section Light` by
      name; note single-import (local `brandPresetLibrary`) vs two-step live (import pack →
      fetch server registry with attrs → `presetRef` by name, since IDs remap on import)
      [test: W3]. Kept SKILL.md ≤150 lines (slim-skill budget) — now 142.

## 4. Verification
- [x] 4.1 `brand-presets.test.js` all green (4 assertions)
- [x] 4.2 `brand-preset-wiring.test.js` all green (3 assertions)
- [x] 4.3 Full skill suite green — only pre-existing `e2e-render` fails (HTTP 401: needs a
      live WP server + DTI_KEY; untouched by this change)
