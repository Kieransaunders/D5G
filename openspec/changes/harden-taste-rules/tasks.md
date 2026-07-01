# Tasks: Harden the taste layer

RED proof: 2 failures in `scripts/__tests__/taste-section-number.test.js` (T1, T4 — the
section-number rule does not exist yet). T2, T3 pass (no false positives). Run:
`node scripts/__tests__/taste-section-number.test.js` from `skills/divi5-page-generator/`.

## 1. TASTE-SECTION-NUMBER rule
Turns green: T1, T2, T3, T4
- [x] 1.1 Add a `TASTE-SECTION-NUMBER` block to `taste-check.js`: scan each section's
      modules; flag short (≤40 char) text matching `/^0*\d{1,3}\s*(\/|·|\||\.)\s*\S/i`;
      exit 1 with the offending strings [test: T1, T4]
- [x] 1.2 Do NOT flag a number followed by a plain word with no separator [test: T3]

## 2. Positive-patterns reference
Turns green: spec positive-patterns scenario
- [x] 2.1 Create `references/positive-patterns.md` — concise "what good looks like"
      (layout families, hero/section composition), distilled from taste.md §13 + aesthetics
- [x] 2.2 Link it from `references/taste.md` §13

## 3. Verification
- [x] 3.1 `taste-section-number.test.js` all green (4 assertions)
- [x] 3.2 Existing `taste.test.js` still green; full suite green
