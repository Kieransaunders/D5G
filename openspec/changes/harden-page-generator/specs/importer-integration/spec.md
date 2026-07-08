## ADDED Requirements

### Requirement: SKILL.md documents the active importer plugin accurately
SKILL.md (and any importer reference it links) SHALL describe the importer that is actually active on the target site: plugin `divi-tools-importer`, REST namespace `divi-tools/v1`, import endpoint `POST /wp-json/divi-tools/v1/import` with body `{layout, seo, schema, publish}`, and authentication header `X-Divi-Tools-Key`. It SHALL state that `publish: false` creates a draft.

#### Scenario: Import instructions name the correct endpoint and header
- **WHEN** a reader follows SKILL.md to import a generated page
- **THEN** the documented endpoint is `POST /wp-json/divi-tools/v1/import`
- **AND** the documented auth header is `X-Divi-Tools-Key`
- **AND** no stale `X-D5G-Key` / `divi5-generator/v1` import instructions remain

### Requirement: Preset setup is documented as attrs-bearing
SKILL.md SHALL instruct that the preset registry is built from `GET /presets?with_attrs=1` so the registry carries colours, and SHALL point to a site-profile reference (endpoint, auth header, output location) so a run does not re-discover them.

#### Scenario: Setup docs require the attrs flag
- **WHEN** a reader sets up the preset registry per SKILL.md
- **THEN** the documented fetch uses `?with_attrs=1`

#### Scenario: A site-profile reference exists
- **WHEN** a reader needs the import endpoint, auth header, and output location
- **THEN** SKILL.md links a site-profile reference that lists them
