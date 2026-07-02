# Structural three-equal-column check

## Why
`taste-check.js` has `TASTE-3CARDS`, but it only fires when three blurb bodies happen to be
within ±25% length. A 3-equal-column feature row with varied copy — the same AI tell — sails
past undetected. taste.md §5 calls the generic 3-identical-column feature row "the most
common tell," so the structure itself should be flagged, independent of content.

## What Changes
- New `TASTE-3COL` rule in `taste-check.js`: flags any row whose `flexColumnStructure` is
  `equal-columns_3` (the builder's own declaration of a 3-equal-column layout). Emitted as a
  WARN (a 3-col gallery/footer can be legitimate; the generic feature row is the problem).
  Complements the content-based `TASTE-3CARDS`.

## Capabilities
- Modified: `taste-mechanical-rules`

## Impact
- **Files changed:** `scripts/taste-check.js` only (new rule block + row scan in the parse
  loop). No SKILL.md change (taste.md §5 already documents the ban).
- **Not affected:** the existing taste rules and their tests; the new rule reads the row
  attr the builder already emits.
