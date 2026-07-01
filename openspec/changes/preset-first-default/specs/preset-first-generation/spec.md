# Capability: preset-first-generation

In default Page mode the generator builds styles from a shared preset library (loaded via
`loadPresetRegistry`) and references them with `presetRef()`. Per-page `builder.preset()` is
override-only. This keeps a brand's styles consistent across pages instead of minting a
fresh style set per page.

## ADDED Requirements

### Requirement: Default Page mode resolves a preset library before generating
The SKILL.md default Page-mode workflow MUST include a step that loads a preset registry
with `loadPresetRegistry()` before Stage 3 generation. The registry source MUST be the ET
pack registry (`references/et-preset-registry.json`, populated by `setup-et-presets.js`) or a
brand pack when one is available. SKILL.md MUST note that `setup-et-presets.js` must have
been run once per site (or a brand pack loaded) for the registry to resolve.

#### Scenario: SKILL.md references loadPresetRegistry in the default workflow
- GIVEN the SKILL.md on disk
- WHEN searched for "loadPresetRegistry"
- THEN it appears in the default Page-mode workflow (outside the Overdrive section)

### Requirement: Reused styles are built from the library via presetRef()
The non-negotiable reused-style rule MUST name `presetRef()` against the loaded library as
the default. `builder.preset()` MUST be described as override-only — for one-off styles not
present in the library, not the primary way styles are defined.

#### Scenario: SKILL.md names presetRef as the default style path
- GIVEN the SKILL.md on disk
- WHEN searched for "presetRef"
- THEN it appears (the reused-style rule points at it as the default)

### Requirement: SKILL.md describes preset-first as the default style source
SKILL.md MUST describe a preset library / preset-first approach as the default style source
for Page mode.

#### Scenario: preset-first language present
- GIVEN the SKILL.md on disk
- WHEN searched for "preset-first" or "preset library" (case-insensitive)
- THEN at least one match is found
