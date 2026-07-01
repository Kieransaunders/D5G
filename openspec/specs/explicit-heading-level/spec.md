# Capability: explicit-heading-level

The builder never silently assigns a heading level. Every heading block and heading preset
carries an explicit `headingLevel`, and the hero is built with a dedicated helper that
cannot produce anything other than h1.

### Requirement: heading() requires an explicit level
The builder's `heading()` function MUST throw when called without a `level` option. It MUST
NOT silently default to `h2` or any other level.

#### Scenario: heading() with no level throws
- GIVEN the builder module loaded
- WHEN `heading({ text: 'No level given' })` is called with no `level` option
- THEN it throws an error whose message mentions "level"

#### Scenario: explicit level h2 still works
- GIVEN the builder module loaded
- WHEN `heading({ text: 'Subhead', level: 'h2' })` is called
- THEN it returns a heading block containing `"headingLevel":"h2"`

### Requirement: heroHeading() always emits h1
A `heroHeading(opts)` helper MUST emit a heading block with `headingLevel: 'h1'`. It MUST
ignore any `level` option passed, so the single hero h1 cannot be mis-marked.

#### Scenario: heroHeading emits h1
- GIVEN the builder module loaded
- WHEN `heroHeading({ text: 'Hero' })` is called
- THEN the returned block contains `"headingLevel":"h1"`

#### Scenario: heroHeading ignores a passed level
- GIVEN the builder module loaded
- WHEN `heroHeading({ text: 'Hero', level: 'h2' })` is called
- THEN the returned block still contains `"headingLevel":"h1"`

### Requirement: headingPresets() emits headingLevel explicitly for every level
`headingPresets()` MUST store an explicit `headingLevel` on each h1, h2, and h3 group
preset. The h2 preset MUST NOT omit `headingLevel`.

#### Scenario: h2 group preset carries explicit headingLevel
- GIVEN a builder instance with `headingPresets()` called
- WHEN the h2 group preset's font value is inspected
- THEN it contains `headingLevel: 'h2'`
