# Import Capability Gate

Payload-level licence enforcement on `/import`: **Free imports sections into the Divi Library,
Pro creates pages** (PRD §3.2).

`/import` is a Free route (see `pro-rest-endpoint-gating`) but serves both paths, routing on
`$layout['context']`. The gate therefore reads the payload, not the route, and cannot live in
`PRO_ONLY_ROUTES`.

This is a **capability** gate, not a quota. The previous model capped Free at 2 page + 2
library imports/month; it was replaced because a quota expires — a user hits the wall once and
either buys that day or leaves — whereas a capability gate keeps Free permanently useful and
re-sells Pro every time the user hand-assembles a page in the Visual Builder.

### Requirement: Library imports are free and unlimited
The system SHALL permit `/import` of the Divi Library context on any plan, with no monthly
quota and no batch-size limit.

#### Scenario: Free install imports a library layout
- **GIVEN** the install is not Pro
- **WHEN** `D5G_RestApi::import_gate( 'et_builder_layouts', false )` is called
- **THEN** the result is `true` (not a `WP_Error`)

#### Scenario: Library imports are not quota-limited
- **GIVEN** the install is not Pro
- **WHEN** `import_gate( 'et_builder_layouts', false )` is called any number of times, with
  any number of items in the payload
- **THEN** every call returns `true`
- **AND** no usage counter is consulted or written

### Requirement: Page creation requires Pro
The system SHALL reject `/import` of a page-creating payload on a Free install with a
`WP_Error` carrying code `pro_required` and HTTP status 403.

#### Scenario: Free install attempts a page import
- **GIVEN** the install is not Pro
- **WHEN** `D5G_RestApi::import_gate( '', false )` is called
- **THEN** the result `is_wp_error()`
- **AND** `get_error_code()` is `pro_required`
- **AND** the error data `status` is `403`

#### Scenario: Pro install imports a page
- **GIVEN** the install is Pro
- **WHEN** `D5G_RestApi::import_gate( '', true )` is called
- **THEN** the result is `true`

### Requirement: The gate fails closed on an unrecognised context
The system SHALL treat any context other than the Divi Library context as a page import,
because `handle_import()` routes it to the page path.

#### Scenario: Unknown context on Free
- **GIVEN** the install is not Pro
- **WHEN** `D5G_RestApi::import_gate( 'something_else', false )` is called
- **THEN** the result `is_wp_error()` with code `pro_required`

### Requirement: The Free refusal names the Library alternative
The system SHALL tell a refused Free caller that the layout can be imported into the Divi
Library instead, rather than only offering an upgrade link. Free *can* have the section — the
refusal is the moment to say so, and the hand-assembly it implies is the Pro pitch.

#### Scenario: Refusal message content
- **GIVEN** the install is not Pro
- **WHEN** `import_gate( '', false )` returns its `WP_Error`
- **THEN** the message mentions the Divi Library
- **AND** the message includes the Freemius upgrade URL when available

### Requirement: SEO and schema writing is unreachable on Free by control flow
The system SHALL NOT provide a plan-filtered SEO payload. `$seo` and `$schema` are passed only
to `D5G_PageImporter::import()`; the library path in `handle_import()` returns before reaching
them. Since Free cannot create pages, Free cannot reach the SEO writer at all.

This closes the previously-unenforced Free/Pro SEO split by construction: there is no
"title + description only" branch to write, test, or get wrong.

#### Scenario: No plan check exists in the SEO layer
- **GIVEN** the SEO adapters in `src/Seo/*` and `D5G_PageImporter`
- **THEN** none of them consult `D5G_Limits::is_pro()` or filter fields by plan
- **AND** the Free/Pro SEO boundary is enforced solely by `import_gate()` refusing the page path

### Requirement: Ping reports capabilities, not usage
The system SHALL report what the caller may do, rather than a quota consumed, because no
quota exists.

#### Scenario: Ping response shape
- **WHEN** `/ping` is called
- **THEN** the response includes `plan` (`free` or `pro`)
- **AND** a `can` map with `import_library`, `import_page`, `write_seo`, `menus`, `presets`
  and `brand`
- **AND** `limits.rate_per_min`
- **AND** it does NOT include a usage counter or a monthly period
