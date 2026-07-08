## Why

A real generation run shipped a page with a white hero heading on a white hero background — invisible text — and it passed every gate. Root cause was a chain of gaps: the local preset registry cached preset **names and IDs but not their colours**, so the generator was colour-blind and could pair a light-text preset with a light section; no gate compared text colour against section background; and the SKILL pointed at the wrong importer plugin/endpoint/auth header, so each run re-discovered the same facts from scratch. This change hardens the skill against that whole class of failure and cuts the per-run discovery cost.

## What Changes

- **Registry carries attrs.** `setup-et-presets.js` fetches `GET /presets?with_attrs=1` so the cached registry holds real colours/fonts, not just name→ID.
- **Preset catalogue.** A compact derived index (`name · module · surface light/dark · colour · size · align · role`) emitted alongside the registry, so preset selection is contrast-aware and does not require re-reading the ~900 KB registry.
- **Contrast gate.** `validate.js` resolves each heading/text colour against its nearest container background and FAILs on invisible (< 1.5:1) / WARNs on low-contrast (< 3:1) pairings, reading colours from the registry offline.
- **Reference-by-ID compile.** `spec-to-divi.js` references presets by ID (site owns styling) instead of inlining the designer's raw hex/gcid onto every block, which otherwise trips the token/gcid gates.
- **Section-level presets** become first-class page-spec vocabulary (`section.preset`), validated by `validate-spec.js` and compiled by `spec-to-divi.js`.
- **Section recipes.** A small library of validated section blueprints (hero-light, features-3col, cta-dark, footer) to compose from.
- **Accurate importer docs.** SKILL.md documents the real active plugin (`divi-tools-importer`): endpoint `POST /wp-json/divi-tools/v1/import`, auth header `X-Divi-Tools-Key`, `GET /presets?with_attrs=1`, plus a site-profile reference.

## Capabilities

### New Capabilities
- `preset-catalogue`: a compact, contrast-aware preset index derived from the registry, refreshed with it.
- `contrast-gate`: validate.js render-safety check that fails invisible / low-contrast text against section backgrounds.
- `importer-integration`: accurate documentation of the active importer plugin, endpoints, and auth for generate→import.

### Modified Capabilities
- `preset-first-generation`: the registry MUST carry preset attrs (`with_attrs=1`); the compiler references presets by ID without inlining their attrs.
- `spec-first-generation`: section-level `preset` is supported vocabulary; reusable section recipes are documented.

## Impact

- Skill scripts: `setup-et-presets.js`, `validate.js`, `spec/spec-to-divi.js`, `spec/validate-spec.js`, `spec/vocabulary.js`.
- Data: `references/et-preset-registry.json` (rebuilt with attrs), new `references/preset-catalogue.json`, new `references/section-recipes/`.
- Docs: `SKILL.md` importer section + site-profile reference.
- No change to the WordPress plugins; existing endpoints unchanged. Generated pages still import via the same route.
