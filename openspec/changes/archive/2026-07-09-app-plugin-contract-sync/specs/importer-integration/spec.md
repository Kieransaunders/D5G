# Importer Integration

### Requirement: SKILL.md documents the active importer plugin accurately
SKILL.md (and any importer reference it links) SHALL describe the importer that is actually active on the target site: plugin `divi5-generator`, REST namespace `divi5-generator/v1`, import endpoint `POST /wp-json/divi5-generator/v1/import` with body `{layout, seo, schema, publish}`, and authentication header `X-D5G-Key`. It SHALL state that `publish: false` creates a draft.

#### Scenario: Import instructions name the correct endpoint and header
- **WHEN** a reader follows SKILL.md to import a generated page
- **THEN** the documented endpoint is `POST /wp-json/divi5-generator/v1/import`
- **AND** the documented auth header is `X-D5G-Key`
- **AND** no stale `X-Divi-Tools-Key` / `divi-tools/v1` / `divi-tools-importer` import instructions remain

### Requirement: Auth is header-only, no query-param fallback
Importer references SHALL document authentication via the `X-D5G-Key` request header only. References SHALL NOT claim a `?dti_key=` or `?d5g_key=` query-parameter fallback exists, because the plugin's `Auth::verify` path reads only the header (`RestApi.php` reads `X-D5G-Key` via `$request->get_header`).

#### Scenario: No query-param auth is advertised
- **WHEN** a reader consults the site-profile reference for how to authenticate
- **THEN** the reference shows the `X-D5G-Key` header
- **AND** it does not advertise a query-parameter alternative

### Requirement: Preset setup is documented as attrs-bearing
SKILL.md SHALL instruct that the preset registry is built from `GET /presets?with_attrs=1` so the registry carries colours, and SHALL point to a site-profile reference (endpoint, auth header, output location) so a run does not re-discover them.

#### Scenario: Setup docs require the attrs flag
- **WHEN** a reader sets up the preset registry per SKILL.md
- **THEN** the documented fetch uses `?with_attrs=1`

#### Scenario: A site-profile reference exists
- **WHEN** a reader needs the import endpoint, auth header, and output location
- **THEN** SKILL.md links a site-profile reference that lists them
