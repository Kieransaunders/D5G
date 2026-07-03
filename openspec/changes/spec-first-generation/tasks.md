# Tasks: Spec-First Generation

RED suite: `node scripts/__tests__/spec-first-generation.test.js` (run from `skills/divi5-page-generator/`). Each group turns its tests green in dependency order.

## 1. Spec vocabulary + validator (T1-T4)

- [ ] 1.1 Define the page-spec vocabulary in `scripts/spec/vocabulary.js`: module kinds mapped 1:1 to `divi-builder.js` exports; layout aliases (`full`, `split-14-10`, `split-16-8`, `split-12-12`, `thirds`) mapped to 24-col ratios; theatre presets read from `scripts/preset-manifest.json`; `raw` kind.
- [ ] 1.2 Implement `scripts/spec/validate-spec.js` — `validateSpec(spec)` returning `{ errors, warnings }` + CLI. Errors name the offending section and value. → turns T1, T2, T3 green.
- [ ] 1.3 `raw` modules validate as warnings (never errors, never dropped). → turns T4 green.

## 2. HTML compiler (T5-T6)

- [ ] 2.1 Add `scripts/spec/preview-base.css` (resets, type scale, spacing tokens) and one thin per-aesthetic override per preset in `references/aesthetics.md` (A-E).
- [ ] 2.2 Implement `scripts/spec/spec-to-html.js` — `specToHtml(spec)`: semantic HTML from the section/module walk; `heroHeading` → the only `h1`; `heading` honours `level`. → turns T5 green.
- [ ] 2.3 Render `theatre` values as a visible text annotation (`⚡ <preset>`); emit no `<script>` and no `@keyframes`. → turns T6 green.

## 3. Divi compiler (T7-T8)

- [ ] 3.1 Implement `scripts/spec/spec-to-divi.js` — `specToDivi(spec)` returning `{ pageJson, seoMeta, schema }`, sharing the same section/module walk as the HTML compiler and calling `divi-builder.js` helpers (`createBuilder`, `section`, `row`, module helpers, `withTheatre`).
- [ ] 3.2 Output passes `scripts/validate.js --keyword`. → turns T7 green.
- [ ] 3.3 Module `preset` names resolve via `loadPresetRegistry` + `presetRef()` (name or registry ID in output; no inline minting). → turns T8 green.

## 4. Fidelity by construction (T9)

- [ ] 4.1 Assert both compilers derive headings from the shared walk; fix any outline divergence until `fidelity-check.js` passes on the compiled pair. → turns T9 green.

## 5. Workflow rewrite (T10)

- [ ] 5.1 Rewrite SKILL.md page-mode (scratch) workflow around `page-spec.json` as the single authored artefact: author spec → `validate-spec` → `spec-to-html` (taste gate) → `spec-to-divi` → existing gates. Keep `--legacy` fallback for one release.
- [ ] 5.2 State explicitly that clone and mutate modes stay JSON-native (`ingest-to-spec` deferred to matrix-coverage work). → turns T10 green.

## 6. Verify

- [ ] 6.1 Full suite green: loop `scripts/__tests__/*.test.js` (known environmental red: `e2e-render.test.js` without live WP).
- [ ] 6.2 End-to-end smoke: compile a real brief's spec to HTML + JSON in `DIVI5_OUT`, run validate/taste/fidelity gates once, confirm zero repair loops.
