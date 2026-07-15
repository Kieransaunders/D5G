# App↔Plugin WP-REST Contract

The local Express app (`app/server.js`) and the WordPress importer plugin
(`plugin/divi5-generator/`) SHALL agree on four contract values: REST namespace,
authentication header name, expected plugin version, and import-payload shape.
Drift on any of these has historically broken the whole generate→import flow
silently. This capability pins them and is enforced by contract tests that read
both sides from source.

### Requirement: Shared REST namespace
The app SHALL address importer endpoints under the namespace `divi5-generator/v1`, matching the `D5G_RestApi::NAMESPACE` constant the plugin registers.

#### Scenario: App namespace matches plugin namespace
- **WHEN** the contract test reads `app/server.js` for the namespace string
- **AND** reads `plugin/divi5-generator/src/RestApi.php` for the registered namespace
- **THEN** both resolve to `divi5-generator/v1`

### Requirement: Shared authentication header name
The app SHALL send its API key in the `X-D5G-Key` header, matching the header the plugin's `Auth::verify` path reads.

#### Scenario: App header matches plugin header
- **WHEN** the contract test greps `app/server.js` for the auth header
- **AND** greps `plugin/divi5-generator/src/RestApi.php` for the header it reads
- **THEN** both are `X-D5G-Key`
- **AND** no `X-Divi-Tools-Key` header remains in `app/server.js`

### Requirement: Version-sync invariant
The version the app pins as its expected plugin version SHALL equal the `D5G_VERSION` constant the plugin ships. A mismatch fails the contract test, because it has historically indicated the app and plugin have drifted out of lockstep.

#### Scenario: EXPECTED_D5G_VERSION matches D5G_VERSION
- **WHEN** the contract test reads `EXPECTED_D5G_VERSION` from `app/server.js`
- **AND** reads `D5G_VERSION` from `plugin/divi5-generator/divi5-generator.php`
- **THEN** the two strings are equal

### Requirement: Import payload keys match declared route args
The keys the app builds into the `/import` payload SHALL be a subset of the args the plugin declares for the `/import` route, so the plugin never silently ignores a field the app sends.

#### Scenario: No undeclared payload keys are sent
- **WHEN** the contract test parses the `args` array of the `/import` route from `RestApi.php`
- **AND** compares it to the keys the app's `buildImportPayload` emits
- **THEN** every emitted key is declared in the route args

### Requirement: DB export excludes the active API-key options
The DB exporter SHALL exclude from its dump the option names that the active `Auth` class writes the API key and rate-limit state to. This prevents the hashed (and plaintext-display) API key from being shipped in a `POST /db/export` response.

#### Scenario: Exporter skip-list matches Auth option names
- **WHEN** the contract test reads `D5G_DbExporter::SKIP_OPTION_NAME`
- **AND** reads the option names `D5G_Auth` writes (`KEY_OPTION`, the `d5g_api_key_plain` literal, `RATE_OPTION`)
- **THEN** every Auth-written key name is in the skip-list
