# Capability: taste-mechanical-rules

## ADDED Requirements

### Requirement: taste-check.js flags 3-equal-column rows structurally
`taste-check.js` MUST flag any row whose `flexColumnStructure` resolves to
`equal-columns_3` (the generic "three feature cards" layout), regardless of the columns'
content. It MUST emit a WARN (not a hard FAIL — a 3-col gallery or footer can be legitimate)
and MUST NOT flag `equal-columns_1` or `equal-columns_2`.

#### Scenario: an equal-columns_3 row is flagged
- GIVEN a page containing a row with `flexColumnStructure: "equal-columns_3"`
- WHEN `taste-check.js` runs
- THEN the output contains a TASTE-3COL warning

#### Scenario: a single-column row is not flagged
- GIVEN a page whose rows use `equal-columns_1`
- WHEN `taste-check.js` runs
- THEN there is no TASTE-3COL warning

#### Scenario: a two-column row is not flagged
- GIVEN a page whose rows use `equal-columns_2`
- WHEN `taste-check.js` runs
- THEN there is no TASTE-3COL warning
