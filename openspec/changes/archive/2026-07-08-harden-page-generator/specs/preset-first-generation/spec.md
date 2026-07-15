## ADDED Requirements

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
