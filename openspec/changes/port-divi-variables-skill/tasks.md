# Tasks: Port styleguide to Divi variables skill

RED proof: 8 failures in `scripts/__tests__/variables-contract.test.js`, all failing with
"check script missing" (the validator capability does not exist yet). The `ran` guard
prevents the should-fail cases from passing spuriously. Run:
`node scripts/__tests__/variables-contract.test.js` from
`skills/divi5-variables-from-styleguide/`.

## 1. Contract validator — check-variables-json.js
Turns green: T1-T8
- [ ] 1.1 CLI: `node check-variables-json.js <file.json>`; exit 0 on pass, 1 on any FAIL;
      print a report (one line per check) [test: T1 positive path]
- [ ] 1.2 R1 — require `context === "et_builder"` [test: T2]
- [ ] 1.3 R2 — require all eight root keys present [test: T3]
- [ ] 1.4 R3 — each `global_colors` entry is `[gcid-…, {color, status, label}]` with a valid
      colour value (`#hex`/`rgb`/`rgba`/`hsl`/`hsla`) [test: T8]
- [ ] 1.5 R4 — each `global_variables` entry has `id` (gvid-), `label`, `value`, `order`,
      `status`, `lastUpdated` (ISO 8601), `variableType`, `type` (in the allowed set),
      `groupKey` [test: T5 missing field, T6 bad type, T7 bad id]
- [ ] 1.6 R5 — every `global_colors` value has a matching `colors`-type variable [test: T4]

## 2. SKILL.md
- [ ] 2.1 Frontmatter: `name: divi5-variables-from-styleguide`, a `description` with strong
      triggers (style guide → divi variables, design tokens → divi, global_colors JSON,
      et_builder import), `argument-hint`
- [ ] 2.2 Workflow body mirroring the 16wells steps: Step 0 gather (brand, prose/tokens),
      Step 1 token set, Step 2 normalize, Step 3 stable gcid-/gvid- IDs, Step 4 emit the
      single et_builder JSON, Step 5 report + missing/ambiguous checklist
- [ ] 2.3 Critical rules: never invent values, tokens win, output MUST pass
      `check-variables-json.js` before delivery

## 3. References
- [ ] 3.1 `references/token-table-template.md` — the name/type/value/notes table format
- [ ] 3.2 `references/example-output-minimal.json` — a CORRECTED minimal example (every
      color carries a matching colors-variable) that passes `check-variables-json.js`

## 4. Verification
- [ ] 4.1 `variables-contract.test.js` all green (8 assertions)
- [ ] 4.2 The corrected `example-output-minimal.json` passes `check-variables-json.js`
- [ ] 4.3 SKILL.md states that output must pass the validator; no invented values rule
      present
