## ADDED Requirements

### Requirement: Section-level presets are supported vocabulary
A page-spec section MAY carry an optional `preset` (a string naming a `divi/section` preset). `validate-spec.js` MUST accept it as supported vocabulary, and `spec-to-divi.js` MUST apply it to the compiled section so the section's background/styling comes from that preset. A non-string `section.preset` MUST be rejected as an error.

#### Scenario: A section preset compiles onto the section
- **GIVEN** a spec section with `"preset": "Section — Hero"`
- **WHEN** the spec is validated and compiled
- **THEN** `validate-spec.js` reports no error for `section.preset`
- **AND** the compiled section references that section preset

#### Scenario: A non-string section preset is rejected
- **GIVEN** a spec section whose `preset` is a number
- **WHEN** `validate-spec.js` runs
- **THEN** it returns an error naming the offending section

### Requirement: Reusable section recipes are available
The skill MUST provide a small library of validated section blueprints under `references/section-recipes/` (at minimum `hero-light`, `features-3col`, `cta-dark`, `footer`), each a spec fragment that passes `validate-spec.js` and pairs presets whose surfaces are mutually legible. SKILL.md MUST reference the library as the starting point for composing sections.

#### Scenario: Recipes are valid spec fragments
- **GIVEN** each blueprint in `references/section-recipes/`
- **WHEN** it is embedded in a minimal page spec and validated
- **THEN** `validate-spec.js` returns no errors

#### Scenario: Recipes pair legible surfaces
- **GIVEN** the `hero-light` recipe
- **WHEN** its section and heading presets are resolved against the registry
- **THEN** the heading colour and section background pass the contrast gate
