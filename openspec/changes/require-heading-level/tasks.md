# Tasks: Require Explicit Heading Level

RED proof: 5 failures in `scripts/__tests__/heading-level.test.js` (T1 ×2 assertions, T3,
T4, T5). T2 stays green as a regression guard. Run:
`node scripts/__tests__/heading-level.test.js` from `skills/divi5-page-generator/`.

## 1. heading() requires level
Turns green: T1
- [x] 1.1 In `divi-builder.js` `heading()`, throw when `o.level` is falsy; the message MUST
      mention "level" [test: T1]
- [x] 1.2 Set `headingLevel: o.level` and drop the `|| 'h2'` fallback [test: T1, T2]

## 2. heroHeading() helper
Turns green: T3, T4
- [x] 2.1 Add module-level `heroHeading(opts)` that calls `heading({ ...opts, level: 'h1' })`
      (spread `opts` before `level` so the explicit h1 wins) [test: T3, T4]
- [x] 2.2 Add `heroHeading` to the module.exports list next to `heading` [test: T3, T4]

## 3. headingPresets() emits explicit h2 level
Turns green: T5
- [x] 3.1 In `headingPresets()` inner `gp()`, emit `headingLevel` unconditionally — remove
      the `headingLevel !== 'h2' ? headingLevel : undefined` conditional [test: T5]

## 4. SKILL.md + call-site sweep
- [x] 4.1 Note `heroHeading()` in SKILL.md as the preferred hero constructor and state that
      `heading()` requires `level`
- [x] 4.2 Grep all `heading(` call sites under the skill (examples/, scripts/, references/):
      add `level:` to any that omit it. The RED suite covers the tests; this catches
      generator and example files

## 5. Verification
- [x] 5.1 `heading-level.test.js` all green (6 assertions)
- [x] 5.2 Full skill suite green: phase0, phase2, phase4b, slim-skill, clone-first,
      fidelity-check, seo-keyword-relax, taste, smoke, regression, e2e-render
