# Capability: content-fidelity-gate

The page generator enforces that generated page JSON matches the approved Stage-2 HTML
mockup at the data level (no browser render). L1 (content) and L2 (declared style) ship;
L3 (Playwright render) is deferred to a follow-up change.

## Requirements

### Requirement: fidelity-check.js performs L1 content fidelity checks
The script `skills/divi5-page-generator/scripts/fidelity-check.js` MUST compare the Stage-2
HTML mockup against the generated page JSON at the data level. It MUST exit 1 on FAIL.

The mockup HTML tags key elements with `data-fid` attributes. The script checks:
- Hero h1 text (trim + case-fold) — FAIL on mismatch
- Heading outline (levels + text sequence) — FAIL on drop, add, or reorder

#### Scenario: h1 mismatch fails
- GIVEN a mockup HTML with `<h1 data-fid="hero-h1">Your Headline</h1>`
- AND a generated JSON whose resolved h1 content is "A Different Headline"
- WHEN `fidelity-check.js <page.json> <mockup.html>` is run
- THEN the script exits with code 1
- AND the output contains "FAIL" and "h1"

#### Scenario: Matching h1 passes the h1 check
- GIVEN a mockup HTML with `<h1 data-fid="hero-h1">Your Headline</h1>`
- AND a generated JSON whose resolved h1 content is "Your Headline"
- WHEN `fidelity-check.js <page.json> <mockup.html>` is run
- THEN the h1 check does not produce a FAIL line

#### Scenario: Heading outline reorder fails
- GIVEN a mockup HTML with heading sequence [h1, h2, h2, h2]
- AND a generated JSON with heading sequence [h1, h2, h3, h2]
- WHEN `fidelity-check.js` is run
- THEN the script exits 1 with an "outline" FAIL

### Requirement: fidelity-check.js performs L2 declared-style fidelity checks
`fidelity-check.js` MUST parse mockup CSS for declared heading font sizes, weights, and
families and compare them to the JSON heading presets. It MUST FAIL if values diverge.

#### Scenario: Heading font-size mismatch fails
- GIVEN a mockup with inline CSS declaring `h2 { font-size: 2rem }`
- AND a JSON heading preset where the h2 font_size resolves to 1rem
- WHEN `fidelity-check.js` is run
- THEN the script exits 1 with a "heading-style" FAIL

### Requirement: fidelity-check.js is wired into the SKILL.md workflow as Stage 3.5
SKILL.md MUST include a Stage 3.5 step that runs `fidelity-check.js` after Stage 3
generation and before the delivery / import step. Delivery is blocked on any FAIL.

#### Scenario: SKILL.md references fidelity-check before import
- GIVEN the SKILL.md on disk
- WHEN its text is searched for "fidelity-check" or "Stage 3.5"
- THEN at least one of those strings appears before the divi5-deploy instruction
