## ADDED Requirements

### Requirement: Heading and text are legible against their section background
`validate.js` SHALL resolve the font colour of every heading and text block and compare it against the background colour of the nearest enclosing container (section, row, column, or group), and SHALL FAIL when the pair is effectively invisible and WARN when it is low contrast.

Colours SHALL be resolved from the module's inline attrs first, then from its `modulePreset` attrs, sourced from the bundled `doc.presets` or the on-disk preset registry. A block is judged only when both its foreground and the effective background resolve to a hex colour; unresolved colours are skipped, not failed.

Thresholds use the WCAG relative-luminance contrast ratio: FAIL below 1.5:1, WARN below 3:1 (large-text AA).

#### Scenario: White heading on a white section fails
- **GIVEN** a heading whose preset sets font colour `#FFFFFF`
- **AND** its section's preset sets background colour `#FFFFFF`
- **WHEN** `validate.js` runs
- **THEN** it reports a CONTRAST FAIL naming the heading text and both colours
- **AND** the process exits non-zero

#### Scenario: Dark heading on a white section passes
- **GIVEN** a heading whose preset sets font colour `#13110e`
- **AND** its section's preset sets background colour `#FFFFFF`
- **WHEN** `validate.js` runs
- **THEN** no CONTRAST error is reported for that heading
- **AND** a CONTRAST pass line is printed

#### Scenario: Colours live in the registry, not the bundle
- **GIVEN** a page whose bundled presets carry empty attrs
- **AND** the on-disk registry defines those preset IDs with real colours
- **WHEN** `validate.js` runs
- **THEN** it resolves colours from the registry and still fails an invisible pairing

#### Scenario: Unresolvable colours are skipped
- **GIVEN** a heading whose colour is a variable that cannot be resolved to a hex value
- **WHEN** `validate.js` runs
- **THEN** that heading is not reported as a CONTRAST failure
