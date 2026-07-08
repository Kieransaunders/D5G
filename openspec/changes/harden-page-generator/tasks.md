# Tasks: harden-page-generator

Status legend: `[x]` already implemented this session (needs a test to lock it), `[ ]` still to do.
RED tests are written in the propose step (see `tests/`); each task turns its scenario(s) green.

## 1. Registry carries attrs (preset-first-generation)

- [x] 1.1 `setup-et-presets.js` fetches `GET /presets?with_attrs=1`
- [x] 1.2 Rebuild `references/et-preset-registry.json` with attrs (name→{id,attrs})
- [x] 1.3 Test: registry entries for a heading/section preset include an `attrs` object
- [x] 1.4 Test: `validate.js` + `spec-to-divi.js` read the `{id,attrs}` shape without error

## 2. Reference-by-ID compile (preset-first-generation)

- [x] 2.1 `spec-to-divi.js` resolvePreset no longer inlines registry attrs (button base only)
- [x] 2.2 Test: compiled blocks reference presets by ID and carry no inlined preset hex/gcid
- [x] 2.3 Test: a compiled page passes the ET-token and gcid gates

## 3. Contrast gate (contrast-gate)

- [x] 3.1 `validate.js` resolves fg/bg (registry-first) and walks a container background stack
- [x] 3.2 FAIL < 1.5:1, WARN < 3:1, skip when either colour is unresolved
- [x] 3.3 Test: white-on-white heading → FAIL, non-zero exit
- [x] 3.4 Test: dark-on-white heading → pass line, no error
- [x] 3.5 Test: colours from registry (empty bundle) still trigger the FAIL
- [x] 3.6 Test: unresolvable colour is skipped, not failed

## 4. Section-level presets (spec-first-generation)

- [x] 4.1 `spec-to-divi.js` applies `section.preset` to the compiled section
- [x] 4.2 `validate-spec.js` / `vocabulary.js` accept `section.preset` (string); reject non-string
- [x] 4.3 Test: section with `preset` compiles and validates; non-string preset errors

## 5. Preset catalogue (preset-catalogue)

- [x] 5.1 Add catalogue emission to `setup-et-presets.js` → `references/preset-catalogue.json`
- [x] 5.2 Infer `surface` (light/dark/unknown) and `role` per preset from its attrs
- [x] 5.3 Test: catalogue emitted alongside registry, one entry per preset, compact (no full attrs)
- [x] 5.4 Test: a `#FFFFFF`-font heading preset is tagged `surface: dark`

## 6. Section recipes (spec-first-generation)

- [x] 6.1 Add `references/section-recipes/{hero-light,features-3col,cta-dark,footer}.json`
- [x] 6.2 Test: each recipe validates as a spec fragment
- [x] 6.3 Test: `hero-light` section+heading presets pass the contrast gate

## 7. Importer docs (importer-integration)

- [x] 7.1 Fix SKILL.md import section: `POST /wp-json/divi-tools/v1/import`, header `X-Divi-Tools-Key`, `publish:false` = draft; remove stale `X-D5G-Key` / `divi5-generator/v1` import refs
- [x] 7.2 Document `GET /presets?with_attrs=1` for setup; add a site-profile reference
- [x] 7.3 Test: SKILL.md contains the correct endpoint + header and no stale import strings

## 8. Close-out

- [x] 8.1 Full suite green (except known-red `e2e-render.test.js` needing a live server)
- [ ] 8.2 Regenerate the divi5-generator sample page and confirm contrast PASS + fidelity PASS
