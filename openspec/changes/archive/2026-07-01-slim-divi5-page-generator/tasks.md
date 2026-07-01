# Tasks: Slim Divi5 Page Generator

RED proof: 13 failures across 4 test files. All fail for the right reason (missing
capability, not syntax error). Run suite: `node scripts/__tests__/<file>.test.js` from
`skills/divi5-page-generator/`.

## 1. content-fidelity-gate — write fidelity-check.js
Turns green: fidelity-check.test.js T1, T2, T3, T4

Absorbs parked dev L1 + L2 tasks:

- [x] 1.1 Create `scripts/fidelity-check.js` with CLI: `node fidelity-check.js <page.json> <mockup.html>` [test: T1 script exists]
- [x] 1.2 L1a — parse `data-fid="hero-h1"` from mockup HTML; extract h1 text from page JSON content; compare (trim + case-fold); exit 1 + FAIL on mismatch [test: T2 h1 mismatch, T3 matching h1]
- [x] 1.3 L1b — extract heading outline (level + text sequence) from both; exit 1 + FAIL on drop/add/reorder [test: T4 outline reorder]
- [x] 1.4 L2 — parse inline `<style>` from mockup HTML for h1–h3 font-size/weight/family; compare to JSON heading preset values; exit 1 + FAIL on divergence (parked task 2.1)
- [x] 1.5 L2 — compare column flex-ratio from mockup CSS grid to JSON row layout; FAIL if drift > ±5% (parked task 2.2)
- [x] 1.6 Wire `Stage 3.5` into SKILL.md: run `fidelity-check.js` after Stage 3 generation, before delivery; block on FAIL [test: T5 SKILL.md wiring]

## 2. slim-skill-instructions — rewrite SKILL.md
Turns green: slim-skill.test.js T1–T4 (7 assertions)

- [x] 2.1 Rewrite SKILL.md to ≤ 150 lines. Keep: mode detection table, output location, Stage 0–3.5 steps, non-negotiable rules, delivery. Cut: verbose descriptions, inline sub-sections that repeat docs, all creative-energy prose [test: T1]
- [x] 2.2 Default Page mode: keep one taste reference only (aesthetics.md). Remove all other `references/` paths from the pre-Stage-1 section [test: T2]
- [x] 2.3 Move `bolder.md`, `delight.md`, VARIANCE/MOTION/DENSITY dials into the `--overdrive` flag section only [test: T3, T4]

## 3. clone-first-generation — update SKILL.md Stage 0
Turns green: clone-first.test.js T2, T4

- [x] 3.1 Rewrite Stage 0 delivery instruction: when a clone matches, the mutated clone is the file passed to `import-to-local` — not a parallel scratch page [test: T2]
- [x] 3.2 Document `--scratch` flag: skip Stage 0, proceed straight to Stage 3 [test: T4]
- [x] 3.3 Confirm SKILL.md does not contain "import the generated page" [test: clone-first T1 — already passing; must stay passing after 2.1/3.1]

## 4. seo-post-pass — relax validate.js keyword check
Turns green: seo-keyword-relax.test.js T1, T2

- [x] 4.1 In `validate.js`, update the `--keyword` check: resolve as PASS when keyword found in h1 text, OR first text-module body copy, OR any h2 — not h1-only [test: T1 text, T2 h2]
- [x] 4.2 Confirm keyword-absent case still FAILs (test T3 — already passing; must stay passing)
- [x] 4.3 Confirm SKILL.md Stage 0–2 sections have no keyword-placement design constraint (test T4 — already passing after 2.1)

## 5. Verification
- [x] 5.1 All 13 RED tests now pass (green suite)
- [x] 5.2 Existing test suites still pass: `phase0.test.js`, `phase2.test.js`, `smoke.test.js` (fixed 3 pre-existing bugs unrelated to this change: missing `DIVI5_SKIP_TASTE_GATE` opt-out in `phase0.test.js`/`phase4b.test.js`/`smoke.test.js`, a `process` shadowing bug in `examples/example-divitheatre-page.js`, and a stale embedded baseline in `phase0.test.js` T6 missing the `HEADING-PRESET` line added by `026e0d4`)
- [x] 5.3 SKILL.md line count ≤ 150 confirmed by `wc -l`
