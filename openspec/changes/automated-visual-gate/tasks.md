# Tasks: Automated visual gate

RED proof: 4 failures in `scripts/__tests__/visual-diff.test.js`, all "visual-diff.js
missing". Run: `node scripts/__tests__/visual-diff.test.js` from
`skills/divi5-page-generator/`.

## 1. visual-diff.js pure core
Turns green: T1-T4
- [ ] 1.1 `diff(a, b)` — dependency-free; throw on width/height mismatch; count pixels
      whose max channel difference exceeds a per-pixel threshold; return
      `{mismatchPixels, total, mismatchPct}` [test: T1, T2, T3]
- [ ] 1.2 `gate(mismatchPct, maxMismatch=0.05)` — return `{pass, mismatchPct, maxMismatch}`
      with pass = mismatchPct <= maxMismatch [test: T1, T2, T4]

## 2. CLI
- [ ] 2.1 `node visual-diff.js <a.png> <b.png> [--max-mismatch 0.05]` — load two PNGs
      (pixelmatch + pngjs when installed; clear error + install hint otherwise), diff, exit
      0 within threshold / 1 over; print a report

## 3. Wire SKILL.md Stage 4
Turns green: the spec's Stage-4 scenario
- [ ] 3.1 Rewrite Stage 4 to run `visual-diff.js` (live Playwright screenshot vs Stage 2
      mockup screenshot), blocking delivery on FAIL — replacing manual "compare against the
      mockup" [test: spec scenario]

## 4. Verification
- [ ] 4.1 `visual-diff.test.js` all green (4 assertions)
- [ ] 4.2 Full skill suite stays green; SKILL.md ≤ 150 lines
