# Spec-First Generation

## Why

A page-mode run authors the same page three times (HTML mockup, `generate-*.js`, then rewrites of both across five gates), which dominates token cost and wall-clock time (see `docs/token-efficiency-plan.md`). Making a typed `page-spec.json` the single authored artefact — with deterministic compilers to HTML and Divi JSON — makes mockup/JSON fidelity true by construction and turns Divi compatibility into schema validation, superseding the planned heuristic `mockup-compat-check.js` (`docs/divi-capability-compatibility-plan.md`).

## What Changes

- Add a typed page-spec vocabulary (`scripts/spec/validate-spec.js` + schema): supported module kinds, named column layouts, aesthetics, DiviTheatre presets, plus a `raw` escape hatch that WARNs.
- Add `scripts/spec/spec-to-html.js`: compiles a valid spec to the Stage 2 preview HTML using a shared base stylesheet + thin per-aesthetic override. No animation — theatre intent is a visible text annotation.
- Add `scripts/spec/spec-to-divi.js`: compiles the same spec to importable Divi 5 JSON (+ SEO meta, schema sidecars) through existing `divi-builder.js` helpers and `presetRef()`.
- Rewrite the page-mode (scratch) workflow in `SKILL.md` around the spec: the agent authors and edits only `page-spec.json`; both preview and JSON are compiled.
- **Scope guard:** clone and mutate modes stay JSON-native. `ingest-to-spec` is deferred until capability-matrix coverage is measured (Phase 3 of the token plan).
- Copy lives inline in the spec — one authoring pass, no separate copy stage.

## Capabilities

- New: `spec-first-generation`

## Impact

- `skills/divi5-page-generator/`: new `scripts/spec/` modules, new preview stylesheets, SKILL.md workflow rewrite for page mode (scratch path).
- Existing gates unaffected in behaviour: `validate.js`, `taste-check.js`, `fidelity-check.js` still run; fidelity becomes a compiler smoke test rather than a repair loop.
- No changes to the WordPress importer plugin, clone/mutate pipelines, or section mode.
- Legacy hand-written `generate-*.js` path remains available for one release as fallback.
