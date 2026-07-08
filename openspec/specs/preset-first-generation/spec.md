# Capability: preset-first-generation

In default Page mode the generator builds styles from a shared preset library (loaded via
`loadPresetRegistry`) and references them with `presetRef()`. Per-page `builder.preset()` is
override-only. This keeps a brand's styles consistent across pages instead of minting a
fresh style set per page.

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


### Requirement: The preset registry carries preset attrs
`setup-et-presets.js` MUST build `references/et-preset-registry.json` from `GET /presets?with_attrs=1`, so each named preset entry is `{ id, attrs }` with real colours/fonts, not a bare name→ID map. Consumers that read the registry MUST tolerate both shapes (`"id"` string or `{ id, attrs }` object).

#### Scenario: Registry is fetched with attributes
- **WHEN** `setup-et-presets.js` refreshes the registry
- **THEN** the fetch requests `/presets?with_attrs=1`
- **AND** heading/section preset entries in the written registry include an `attrs` object

#### Scenario: Registry consumers accept both shapes
- **GIVEN** a registry whose entries are `{ id, attrs }` objects
- **WHEN** `validate.js` and `spec-to-divi.js` read it
- **THEN** neither errors on the object shape
- **AND** preset ID resolution still succeeds

### Requirement: The compiler references presets by ID without inlining their attrs
`spec-to-divi.js` MUST reference a preset by its registry ID and MUST NOT inline the registry's attrs onto the generated blocks. The target site owns the preset styling (matched by ID on import); inlining the designer's raw hex/gcid would re-stamp them onto every block and trip the ET-token and gcid gates.

#### Scenario: Generated blocks carry no inlined preset colours
- **GIVEN** a spec whose modules reference presets that define hex colours
- **WHEN** the page is compiled
- **THEN** the module blocks reference the preset by ID
- **AND** they do not contain the preset's raw hex/gcid values inline

#### Scenario: Compiled page passes the token and gcid gates
- **GIVEN** a compiled page that references site presets by ID
- **WHEN** `validate.js` runs
- **THEN** no ET-token or undefined-gcid errors are raised from preset styling
