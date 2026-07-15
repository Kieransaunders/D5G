# Pro REST Endpoint Gating

Route-level licence enforcement: which REST routes a Free install may call at all.

Distinct from **payload-level** gating — `/import` is a Free *route*, but what it will import
depends on the payload. See `import-capability-gate`.

### Requirement: Pro-only routes are declared as an explicit, pure policy
The system SHALL expose a route-policy check that classifies each REST route as Pro-only
or not, independent of any Freemius/licence lookup, so the policy itself is unit-testable
without WordPress or Freemius loaded.

#### Scenario: Preset, global-variable, menu, and DB routes are classified Pro-only
- **GIVEN** the routes `/divi5-generator/v1/presets/import`, `/divi5-generator/v1/presets`,
  `/divi5-generator/v1/presets/export`, `/divi5-generator/v1/global-variables`,
  `/divi5-generator/v1/global-variables/export`, `/divi5-generator/v1/db/export`,
  `/divi5-generator/v1/db/import`, `/divi5-generator/v1/menus`, and
  `/divi5-generator/v1/menus/auto-place`
- **WHEN** `D5G_RestApi::requires_pro( $route )` is called for each
- **THEN** it returns `true` for every one of them

#### Scenario: Ping, preview, import, export, and pages routes are classified Free
- **GIVEN** the routes `/divi5-generator/v1/ping`, `/divi5-generator/v1/preview`,
  `/divi5-generator/v1/import`, `/divi5-generator/v1/export`, `/divi5-generator/v1/pages`,
  and `/divi5-generator/v1/pages/my-slug`
- **WHEN** `D5G_RestApi::requires_pro( $route )` is called for each
- **THEN** it returns `false` for every one of them
- **AND** `/import` being Free at the route level does not imply every payload is permitted
  — page-creating payloads are gated separately by `import-capability-gate`

### Requirement: Free-tier calls to a Pro-only route are rejected with 403 pro_required
The system SHALL reject a Free-tier request to a Pro-only route with a `WP_Error` carrying
code `pro_required` and HTTP status 403, including an upgrade URL in the message.

#### Scenario: Free install calls a Pro-only route
- **GIVEN** `D5G_Limits::is_pro()` would return `false`
- **WHEN** `D5G_RestApi::pro_gate( '/divi5-generator/v1/db/export', false )` is called
- **THEN** the result `is_wp_error()`
- **AND** `get_error_code()` is `pro_required`
- **AND** the error data `status` is `403`

#### Scenario: Pro install calls the same route
- **GIVEN** `D5G_Limits::is_pro()` would return `true`
- **WHEN** `D5G_RestApi::pro_gate( '/divi5-generator/v1/db/export', true )` is called
- **THEN** the result is `true` (not a `WP_Error`)

### Requirement: Free-tier calls to a Free route are never blocked by the pro gate
The system SHALL NOT reject Free-tier requests to routes not classified Pro-only, regardless
of licence state.

#### Scenario: Free install calls /ping
- **GIVEN** `D5G_Limits::is_pro()` would return `false`
- **WHEN** `D5G_RestApi::pro_gate( '/divi5-generator/v1/ping', false )` is called
- **THEN** the result is `true` (not a `WP_Error`)

### Requirement: Authentication failure is reported before the licence gate
The system SHALL return 401 for a missing or invalid API key on a Pro-only route rather than
403, so an unauthenticated caller cannot distinguish a Pro-gated route from a nonexistent one
by response code alone.

#### Scenario: Missing key on a Pro-only route
- **GIVEN** no `X-D5G-Key` header is present
- **WHEN** `D5G_RestApi::authenticate()` runs against a request for
  `/divi5-generator/v1/db/export`
- **THEN** the result `is_wp_error()`
- **AND** `get_error_code()` is `unauthorized` (not `pro_required`)

### Requirement: The licence state honours a site-owner dev override
The system SHALL treat the install as Pro when `D5G_ASSUME_PRO` is defined truthy in
`wp-config.php`, because a site with no working Freemius product otherwise resolves to Free
and cannot exercise any Pro path — including our own dev and staging sites.

This is a deliberate, documented licence bypass and is an open decision (PRD §3.2): either
strip it from the free build via Freemius premium-only annotations (F2), or accept it on the
grounds that the toolkit is the real gate (§3.1). It SHALL NOT be documented in `readme.txt`.

#### Scenario: Dev override forces Pro
- **GIVEN** `D5G_ASSUME_PRO` is defined as `true`
- **WHEN** `D5G_Limits::is_pro()` is called
- **THEN** it returns `true` without consulting Freemius

#### Scenario: No override and no Freemius
- **GIVEN** `D5G_ASSUME_PRO` is not defined
- **AND** `dg_fs()` is unavailable or reports not-paying
- **THEN** `D5G_Limits::is_pro()` returns `false`
