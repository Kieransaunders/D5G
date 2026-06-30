## ADDED Requirements

### Requirement: Dark-theme colour token palette

The stylesheet `app/public/style.css` SHALL define a dark-theme colour palette as CSS custom properties on `:root`, named with a `--d5-` prefix, with the following canonical values:

- `--d5-bg: #0a0b0e` (app background)
- `--d5-panel: #0c0d11`, `--d5-panel-2: #121419`, `--d5-panel-3: #141620` (three panel tiers)
- `--d5-border: rgba(255,255,255,0.06)` and `--d5-border-strong: rgba(255,255,255,0.12)` (hairline borders)
- `--d5-primary: #f75d00` with `--d5-primary-hover: #ff7a2b`
- `--d5-accent: #f9c22d`
- `--d5-success: #34d399` and `--d5-success-2: #16a34a`
- `--d5-danger: #ef4444`
- `--d5-text`, `--d5-text-2`, `--d5-muted` for the foreground hierarchy (light / dimmed / muted on the dark background)

The palette MAY keep the legacy token names (e.g. `--bg`, `--surface`, `--accent`) as aliases pointing at the new `--d5-*` values during the multi-phase reskin, so screens not yet restyled continue to render.

#### Scenario: Required tokens are present with canonical values
- **WHEN** `app/public/style.css` is parsed
- **THEN** the `:root` block SHALL contain each of `--d5-bg`, `--d5-panel`, `--d5-panel-2`, `--d5-panel-3`, `--d5-border`, `--d5-border-strong`, `--d5-primary`, `--d5-primary-hover`, `--d5-accent`, `--d5-success`, `--d5-success-2`, `--d5-danger`
- **AND** each SHALL be assigned its canonical value listed above

#### Scenario: Primary has a distinct hover variant
- **WHEN** the palette is inspected
- **THEN** `--d5-primary-hover` SHALL be `#ff7a2b`, distinct from `--d5-primary: #f75d00`

### Requirement: Typography fonts loaded from Google Fonts

`app/public/index.html` SHALL load **Plus Jakarta Sans** (UI typeface) and **JetBrains Mono** (monospace typeface for logs and hex values) from Google Fonts in the document `<head>`, with `preconnect` to `fonts.googleapis.com` and `fonts.gstatic.com` (the latter with `crossorigin`).

#### Scenario: Both font families linked
- **WHEN** `app/public/index.html` `<head>` is parsed
- **THEN** it SHALL contain a `<link rel="stylesheet" href="https://fonts.googleapis.com/css2...">` whose URL includes the family `Plus+Jakarta+Sans`
- **AND** another (or the same) Google Fonts `<link>` whose URL includes the family `JetBrains+Mono`

#### Scenario: Preconnect to font origins
- **WHEN** the `<head>` is parsed
- **THEN** it SHALL contain `<link rel="preconnect" href="https://fonts.googleapis.com">`
- **AND** `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`

### Requirement: Typography token and base styles

`app/public/style.css` SHALL set Plus Jakarta Sans as the default UI font (`--d5-font` custom property and applied to `body`) and JetBrains Mono as the monospace font (`--d5-font-mono`). Headings (`h1`–`h4`) SHALL use `letter-spacing: -0.02em`. Font weights up to **800** SHALL be loaded for Plus Jakarta Sans so bold headings render at the intended weight.

#### Scenario: Font tokens defined and applied
- **WHEN** `app/public/style.css` is parsed
- **THEN** it SHALL define `--d5-font` referencing `Plus Jakarta Sans`
- **AND** `--d5-font-mono` referencing `JetBrains Mono`
- **AND** `body` SHALL apply `var(--d5-font)`

#### Scenario: Tight heading tracking
- **WHEN** the heading rules are parsed
- **THEN** at least one heading selector (`h1`, `h2`, `h3`, or `h4`) SHALL set `letter-spacing: -0.02em`

#### Scenario: Weight 800 available
- **WHEN** the Google Fonts URL in `index.html` is inspected
- **THEN** the Plus Jakarta Sans family request SHALL include weight `800` (e.g. `wght@...800` or a sequential range covering 800)

### Requirement: Radii and shadow tokens

`app/public/style.css` SHALL define CSS custom properties for border radii (`--d5-radius`, plus optional tiered variants) and box shadows (`--d5-shadow`, plus optional tiered variants), so later phases consume a single shape/elevation system rather than hard-coding values.

#### Scenario: Radius and shadow tokens exist
- **WHEN** `app/public/style.css` is parsed
- **THEN** the `:root` block SHALL define at least `--d5-radius` and `--d5-shadow`

### Requirement: Thin custom scrollbars

`app/public/style.css` SHALL style scrollbars to be thin and low-contrast against the dark theme, covering both WebKit (`::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, optionally `::-webkit-scrollbar-track`) and Firefox (`scrollbar-width: thin` and `scrollbar-color`) engines.

#### Scenario: WebKit scrollbar styled
- **WHEN** `app/public/style.css` is parsed
- **THEN** it SHALL contain a `::-webkit-scrollbar` rule with a constrained width
- **AND** a `::-webkit-scrollbar-thumb` rule styled with the token palette

#### Scenario: Firefox scrollbar styled
- **WHEN** `app/public/style.css` is parsed
- **THEN** at least one selector SHALL set `scrollbar-width: thin`
- **AND** at least one selector SHALL set `scrollbar-color` referencing a token

### Requirement: Four motion keyframes

`app/public/style.css` SHALL define exactly four named `@keyframes` blocks for the reskin's motion vocabulary: `d5b` (animated thinking dots), `d5pulse`, `d5fade`, `d5spin`. Each SHALL be defined at the top level of the stylesheet (not nested in a rule).

#### Scenario: All four keyframes defined
- **WHEN** `app/public/style.css` is parsed
- **THEN** it SHALL contain `@keyframes d5b`
- **AND** `@keyframes d5pulse`
- **AND** `@keyframes d5fade`
- **AND** `@keyframes d5spin`

### Requirement: Pill badge utility class

`app/public/style.css` SHALL provide a `.d5-badge` class that renders as a pill (horizontal padding, smaller vertical padding, full `border-radius`) coloured from the token palette, suitable for status badges (Active / Live preview / Draft imported / Connected).

#### Scenario: Badge class contract
- **WHEN** `app/public/style.css` is parsed
- **THEN** it SHALL contain a `.d5-badge` rule
- **AND** that rule SHALL set `border-radius` (or reference a `--d5-radius` token)
- **AND** SHALL set horizontal `padding`
- **AND** SHALL reference at least one `--d5-*` colour token

### Requirement: No regression to existing app wiring

Phase 0 is a CSS reskin only. The existing tab-routing, SSE handlers, and all behavioural code in `app/public/app.js` SHALL remain untouched. The full existing test suite at `app/tests/*.test.js` SHALL continue to pass unchanged. The only permitted change to `app/public/index.html` is the addition of Google Fonts `<link>` and `<link rel="preconnect">` tags inside `<head>`.

#### Scenario: app.js unchanged
- **WHEN** the diff for this change is inspected
- **THEN** `app/public/app.js` SHALL NOT appear in the modified files

#### Scenario: Existing test suite stays green
- **WHEN** `npm test` (i.e. `node --test tests/*.test.js`) is run in `app/` after the change
- **THEN** every pre-existing test file SHALL pass (the new `design-tokens.test.js` is excluded from this regression check; it is the RED→GREEN driver for the requirements above)
