# Tasks: Make preset-first the default workflow

RED proof: 3 failures in `scripts/__tests__/preset-first.test.js` (T1, T2, T3 — no
preset-first language in SKILL.md). T4 (≤150 lines) stays green. Run:
`node scripts/__tests__/preset-first.test.js` from `skills/divi5-page-generator/`.

## 1. Add Stage 0.5 — Resolve preset library
Turns green: T1, T3
- [x] 1.1 Insert a "Stage 0.5 — Resolve preset library" step between Stage 0 and Stage 1:
      load the ET pack registry (`references/et-preset-registry.json`) via
      `b.loadPresetRegistry(registry)`, or a brand pack when available; note that
      `setup-et-presets.js` must have been run once per site [test: T1, T3]
- [x] 1.2 Point at `examples/preset-first-workflow.js` as the reference sequence
      (registry → presetRef → import) [test: T3]

## 2. Rewrite the reused-style rule (rule 4)
Turns green: T2
- [x] 2.1 Change rule 4 from "every reused style is a `builder.preset()`" to: build every
      reused style from the library via `presetRef()`; use `builder.preset()` only for
      one-off overrides not in the library [test: T2]

## 3. Keep SKILL.md ≤ 150 lines
- [x] 3.1 Confirm line count ≤ 150 after the additions (the slim-skill constraint) [test: T4]

## 4. Verification
- [x] 4.1 `preset-first.test.js` all green (4 assertions)
- [x] 4.2 Full skill suite stays green (no regression to slim-skill / clone-first /
      seo-post-pass / heading-level / phase0 / phase4b / regression / smoke / taste)
