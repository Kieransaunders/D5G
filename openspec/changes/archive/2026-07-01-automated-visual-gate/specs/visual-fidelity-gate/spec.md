# Capability: visual-fidelity-gate

A pixel-level diff gate compares the live rendered page against the approved mockup and
blocks delivery when they diverge beyond a threshold — catching render-only failures
(wrong font slot shipping a 30px hero, layout drift) that the structural validators cannot
see.

## ADDED Requirements

### Requirement: visual-diff.js exposes a pure diff and a threshold gate
`visual-diff.js` MUST export a dependency-free `diff(a, b)` that takes two
`{data, width, height}` RGBA buffers and returns `{mismatchPixels, total, mismatchPct}`,
throwing on a width/height mismatch. It MUST export `gate(mismatchPct, maxMismatch)` that
returns `{pass}` true when `mismatchPct <= maxMismatch`.

#### Scenario: identical images pass with zero mismatch
- GIVEN two identical RGBA buffers
- WHEN `diff(a, b)` is called
- THEN `mismatchPct` is 0 AND `gate(0, 0.05).pass` is true

#### Scenario: maximally different images fail
- GIVEN two RGBA buffers where every pixel differs maximally
- WHEN `diff` then `gate(pct, 0.05)` is called
- THEN `mismatchPct` exceeds 0.9 AND `gate(...).pass` is false

#### Scenario: dimension mismatch throws
- GIVEN buffers of differing width/height
- WHEN `diff(a, b)` is called
- THEN it throws

#### Scenario: gate honours the threshold
- GIVEN a mismatchPct of 0.3
- THEN `gate(0.3, 0.5).pass` is true AND `gate(0.3, 0.2).pass` is false

### Requirement: SKILL.md Stage 4 runs the visual diff automatically
SKILL.md Stage 4 MUST instruct running `visual-diff.js` between the live Playwright
screenshot and the Stage 2 mockup screenshot, with delivery blocked on a FAIL (mismatch
above threshold). It MUST NOT rely on manual visual comparison as the only check.

#### Scenario: SKILL.md references visual-diff in Stage 4
- GIVEN the SKILL.md on disk
- WHEN Stage 4 is searched for "visual-diff"
- THEN it appears, described as the automated comparison that blocks delivery
