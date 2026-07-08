# Capability: clone-first-generation

When an ET template matches the brief, the mutated clone is the delivered artefact. A
parallel from-scratch page is not generated or preferred.

## Requirements

### Requirement: Mutated ET clone is the delivered artefact when a template matches
When `et-pages.js match` returns a result for the brief, the mutated clone MUST be the file
imported to WordPress. A parallel from-scratch page MUST NOT be generated or preferred.
SKILL.md MUST NOT contain language preferring the scratch page over the clone.

#### Scenario: Brief matches ET template — clone is imported
- GIVEN a user brief whose page type matches one of the 24 ET templates
- WHEN the skill runs Stage 0 and `et-pages.js match` returns a non-null result
- THEN `et-pages.js clone` produces `[brand]-base-page.json`
- AND that file is mutated via `mutate.js`
- AND the mutated file is the single artefact passed to `divi5-deploy`

#### Scenario: No match falls back to scratch
- GIVEN a brief whose page type does not match any ET template
- WHEN `et-pages.js match` returns null
- THEN the skill proceeds to Stage 3 from-scratch generation
- AND the user is informed no template matched

#### Scenario: --scratch flag bypasses clone path
- GIVEN a brief with the `--scratch` flag
- WHEN the skill detects that flag
- THEN Stage 0 is skipped and Stage 3 from-scratch runs immediately

### Requirement: SKILL.md must not contain scratch-preference language
The phrase "import the generated page" (the 068fe58 regression) MUST NOT appear in SKILL.md.

#### Scenario: SKILL.md language check
- GIVEN the SKILL.md on disk
- WHEN searched for "import the generated page"
- THEN no matches are found
