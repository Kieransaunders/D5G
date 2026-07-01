# Capability: slim-skill-instructions

The `divi5-page-generator` SKILL.md is kept short and focused. Default Page mode reads at
most one taste reference before Stage 1, and creative-energy guides are opt-in via
`--overdrive`.

## Requirements

### Requirement: SKILL.md must not exceed 150 lines
The `divi5-page-generator` SKILL.md MUST be ≤ 150 lines total.

#### Scenario: Line count passes
- GIVEN the SKILL.md file at `skills/divi5-page-generator/SKILL.md`
- WHEN its total line count is measured
- THEN the count is ≤ 150

### Requirement: Default Page mode reads at most one taste reference before Stage 1
In default Page mode the SKILL.md MUST reference at most one taste/aesthetic file before
the first Stage heading. Additional reference files MUST only appear under opt-in flags.

#### Scenario: Single reference before Stage 1
- GIVEN the SKILL.md default Page mode instructions
- WHEN its text before the first Stage heading is scanned for `references/` paths
- THEN at most one `references/` path appears in that section

### Requirement: Creative-energy guides are opt-in and off by default
In default Page mode the SKILL.md MUST NOT instruct the model to read `bolder.md`,
`delight.md`, or set VARIANCE, MOTION, or DENSITY values. These MUST only appear under
the `--overdrive` flag section.

#### Scenario: Creative dials absent outside overdrive
- GIVEN the SKILL.md text before the Overdrive section
- WHEN searched for "VARIANCE", "MOTION", "DENSITY", "bolder.md", "delight.md"
- THEN none of those strings appear before the overdrive section marker
