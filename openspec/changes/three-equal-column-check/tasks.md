# Tasks: Structural three-equal-column check

RED proof: 1 failure in `scripts/__tests__/taste-3col.test.js` (T1 — no TASTE-3COL yet).
T2, T3 pass. Run: `node scripts/__tests__/taste-3col.test.js` from
`skills/divi5-page-generator/`.

## 1. TASTE-3COL rule
Turns green: T1, T2, T3
- [x] 1.1 In `taste-check.js`'s parse loop, count row tokens whose
      `module.advanced.flexColumnStructure.desktop.value === "equal-columns_3"`
- [x] 1.2 Emit a WARN `TASTE-3COL` when any are found (not an error); PASS line otherwise
      [test: T1, T2, T3]

## 2. Verification
- [x] 2.1 `taste-3col.test.js` all green (3 assertions)
- [x] 2.2 Existing taste tests (`taste.test.js`, `taste-section-number.test.js`) still green
