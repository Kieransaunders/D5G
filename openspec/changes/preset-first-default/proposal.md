# Make preset-first the default workflow

## Why
The builder has full preset-first plumbing (`loadPresetRegistry`, `presetRef`, the
`preset-first-workflow.js` demo, `setup-et-presets.js`), but the default Page-mode workflow
ignores it: Stage 3 mints per-page styles via `builder.preset()` (non-negotiable rule 4),
so every generated page redefines its own section/heading/button styles and there is no
shared, brand-consistent style library. That is exactly the style drift across a multi-page
site that "use Divi presets" is meant to prevent. The plumbing exists; the workflow does not
pull the lever.

## What Changes
- New Stage 0.5 — **Resolve preset library**: load a preset registry
  (`loadPresetRegistry`) in the default Page-mode workflow before Stage 3, sourced from the
  ET pack registry (`references/et-preset-registry.json`, populated once by
  `setup-et-presets.js`), or a brand pack when one is available.
- **Rule 4 rewritten**: every reused style is built from the library via `presetRef()`;
  `builder.preset()` is demoted to override-only (one-off styles not in the library).
- SKILL.md points at `preset-first-workflow.js` as the reference for the registry →
  `presetRef()` → import sequence.

## Capabilities
- New: `preset-first-generation`

## Impact
- **Files changed:** `skills/divi5-page-generator/SKILL.md` only (new Stage 0.5 + rewritten
  rule 4). SKILL.md must stay ≤ 150 lines (the slim-skill constraint).
- **Not affected:** Section mode, Mutate mode, the clone-first Stage 0 (a matched clone is
  still the deliverable; its mutations now draw on the preset library too), the builder
  library, the validators.
- **Prerequisite noted:** `setup-et-presets.js` must have been run once per site (or a brand
  pack loaded) for the registry to resolve. The skill states this.
