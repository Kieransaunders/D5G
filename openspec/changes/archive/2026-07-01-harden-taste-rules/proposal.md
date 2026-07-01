# Harden the taste layer (mechanical rule + positive patterns)

## Why
`taste.md` §10 bans section-number eyebrows (`00 / INDEX`, `01 / Overview`,
`06 · how it works`) as a clear AI tell, but `taste-check.js` does not enforce them — the
rule lives only in prose the model must remember. And the taste layer is overwhelmingly
*negative* (a long ban list) with one positive example (Floria). "Not slop" is easier to hit
by matching a good reference than obeying bans, so a small positive-patterns reference
rounds it out.

## What Changes
- **F** — new `TASTE-SECTION-NUMBER` rule in `taste-check.js`: flags short text/label
  modules matching a section-number pattern (`0*\d{1,3}` + separator `/ · | .` + text),
  e.g. `01 / Overview`, `00 / INDEX`. Exits 1 (hard ban per §10).
- **E** — new `references/positive-patterns.md`: a concise "what good looks like"
  distillation (layout families, hero/section composition), linked from `taste.md` §13.

## Capabilities
- New: `taste-mechanical-rules`

## Impact
- **Files changed:** `scripts/taste-check.js` (new rule block); new
  `references/positive-patterns.md`; `references/taste.md` (one link line).
- **Not affected:** the existing taste rules (em-dash, AI-tell, h1-verb, 3cards, eyebrow)
  and their tests. SKILL.md unchanged (already references taste.md).
