# Automated visual gate

## Why
Stage 4 of the workflow is manual eyeballing — "screenshot the live page and compare
against the mockup." The class of bug this is meant to catch (the h1 renders at 30px not
72px because of the wrong font slot; layout drift between mockup and live) is exactly what
a perceptual/pixel diff catches automatically, yet nothing enforces it. A page can ship
with a visibly broken hero as long as the structural validators pass. This automates the
gate.

## What Changes
- New `scripts/visual-diff.js` with a **dependency-free** pure diff core:
  - `diff(a, b)` — given two `{data, width, height}` RGBA buffers, returns
    `{mismatchPixels, total, mismatchPct}` (per-pixel channel-distance).
  - `gate(mismatchPct, maxMismatch)` — returns `{pass, mismatchPct, maxMismatch}`.
  - CLI `node visual-diff.js <a.png> <b.png> [--max-mismatch 0.05]` — loads two PNGs
    (pixelmatch + pngjs when installed; errors with an install hint otherwise), diffs them,
    exits 0 if within threshold, 1 otherwise.
- SKILL.md **Stage 4 rewritten** to run `visual-diff.js` between the live Playwright
  screenshot and the Stage 2 mockup screenshot, blocking delivery on FAIL (above threshold),
  instead of "compare against the mockup" by eye.

## Capabilities
- New: `visual-fidelity-gate`

## Impact
- **Files changed:** new `skills/divi5-page-generator/scripts/visual-diff.js`; SKILL.md
  Stage 4 only. SKILL.md must stay ≤ 150 lines.
- **Dependencies:** the pure diff/gate is dependency-free (tests run without `npm install`).
  The PNG CLI uses `pixelmatch` + `pngjs` (already devDeps) at runtime.
- **Not affected:** the structural validators (`validate.js`, `fidelity-check.js`,
  `taste-check.js`) — this is a rendered-pixel layer on top of them.
