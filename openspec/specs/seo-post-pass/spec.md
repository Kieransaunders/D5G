# Capability: seo-post-pass

The SEO keyword check is a post-pass that runs after layout JSON is finalised, and passes
when the keyword appears in any one of the h1, the opening copy, or any h2.

## Requirements

### Requirement: validate.js keyword check accepts keyword in h1, opening copy, or any h2
`validate.js --keyword` MUST pass when the keyword appears in ANY ONE of: the h1 text, the
first text module body copy, or any h2 heading. It MUST still FAIL when absent from all
three.

#### Scenario: Keyword in opening copy passes
- GIVEN a page JSON where the keyword "IT support London" is absent from the h1 but
  present in the first text module body copy
- WHEN `validate.js` is run with `--keyword "IT support London"`
- THEN the keyword check passes (no FAIL line for keyword)

#### Scenario: Keyword in an h2 passes
- GIVEN a page JSON where the keyword "IT support London" is in an h2 heading but not in
  the h1 or opening copy
- WHEN `validate.js` is run with `--keyword "IT support London"`
- THEN the keyword check passes

#### Scenario: Keyword entirely absent fails
- GIVEN a page JSON where the keyword "IT support London" appears in no h1, h2, or text
- WHEN `validate.js` is run with `--keyword "IT support London"`
- THEN the report contains a FAIL line for keyword placement

### Requirement: SEO keyword requirements must not appear before Stage 3 in SKILL.md
SKILL.md MUST NOT include keyword-placement requirements in Stage 0, 1, or 2 sections. SEO
keyword work MUST only appear as a post-pass after layout JSON is finalised.

#### Scenario: No keyword requirements before layout is built
- GIVEN the SKILL.md sections for Stage 0, Stage 1, and Stage 2
- WHEN those sections are searched for "keyword" as a design constraint
- THEN no keyword-placement requirement appears in those stage sections
