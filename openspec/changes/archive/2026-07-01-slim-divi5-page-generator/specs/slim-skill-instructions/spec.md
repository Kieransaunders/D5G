# Capability: slim-skill-instructions

## MODIFIED Requirements

### Requirement: SKILL.md must not exceed 150 lines
(Previously: no line limit enforced; SKILL.md grew to 517 lines.)

The `divi5-page-generator` SKILL.md MUST be ≤ 150 lines total.

#### Scenario: Line count passes
- GIVEN the SKILL.md file at `skills/divi5-page-generator/SKILL.md`
- WHEN its total line count is measured
- THEN the count is ≤ 150

### Requirement: Default Page mode reads at most one taste reference before Stage 1
(Previously: default mode read taste.md, aesthetics, bolder, delight, overdrive, polish,
layout-patterns, seo, and content-strategy — up to 18 files — before any section was
designed.)

In default Page mode the SKILL.md MUST reference at most one taste/aesthetic file before
the first Stage heading. Additional reference files MUST only appear under opt-in flags.

#### Scenario: Single reference before Stage 1
- GIVEN the SKILL.md default Page mode instructions
- WHEN its text before the first Stage heading is scanned for `references/` paths
- THEN at most one `references/` path appears in that section

### Requirement: Creative-energy guides are opt-in and off by default
(Previously: `bolder.md`, `delight.md`, `overdrive.md`, and VARIANCE/MOTION/DENSITY dial
instructions were active in default Page mode.)

In default Page mode the SKILL.md MUST NOT instruct the model to read `bolder.md`,
`delight.md`, or set VARIANCE, MOTION, or DENSITY values. These MUST only appear under
the `--overdrive` flag section.

#### Scenario: Creative dials absent outside overdrive
- GIVEN the SKILL.md text before the Overdrive section
- WHEN searched for "VARIANCE", "MOTION", "DENSITY", "bolder.md", "delight.md"
- THEN none of those strings appear before the overdrive section marker
