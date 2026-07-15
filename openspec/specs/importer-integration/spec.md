# Importer Integration

### Requirement: SKILL.md documents the active importer plugin accurately
SKILL.md (and any importer reference it links) SHALL describe the importer that is actually active on the target site: plugin `divi5-generator`, REST namespace `divi5-generator/v1`, import endpoint `POST /wp-json/divi5-generator/v1/import` with body `{layout, seo, schema, publish}`, and authentication header `X-D5G-Key`. It SHALL state that `publish: false` creates a draft.

#### Scenario: Import instructions name the correct endpoint and header
- **WHEN** a reader follows SKILL.md to import a generated page
- **THEN** the documented endpoint is `POST /wp-json/divi5-generator/v1/import`
- **AND** the documented auth header is `X-D5G-Key`
- **AND** no stale `X-Divi-Tools-Key` / `divi-tools/v1` / `divi-tools-importer` import instructions remain

### Requirement: Auth is header-only, no query-param fallback
The plugin SHALL accept the API key via the `X-D5G-Key` request header only, and SHALL NOT read it from a query parameter. A key in the query string leaks into browser history, access logs, proxies and analytics.

Importer references SHALL document the header form only, and SHALL NOT claim a `?dti_key=` or `?d5g_key=` fallback exists.

> This requirement previously constrained only the documentation, and justified itself with the claim that "the plugin's `Auth::verify` path reads only the header" — which was **false**: `RestApi.php` read `$request->get_param( 'd5g_key' )` as a fallback, and `skills/divi5-deploy/SKILL.md` shipped a `?d5g_key=` curl example. A spec asserting the code's behaviour as rationale, while constraining only the docs, let all three drift apart unnoticed. Both are now bound, and the fallback was removed in PR #29 (15/07/2026).

#### Scenario: The plugin ignores a query-param key
- **GIVEN** a request carrying no `X-D5G-Key` header but a valid key in a `d5g_key` query parameter
- **WHEN** `D5G_RestApi::authenticate()` runs
- **THEN** the result `is_wp_error()` with code `unauthorized`

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
