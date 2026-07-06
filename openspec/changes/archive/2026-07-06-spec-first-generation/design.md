# Design: Spec-First Generation

## Context

Token/time analysis (`docs/token-efficiency-plan.md`) showed the dominant cost of a page run is authoring the page twice (HTML + generator JS) and repairing both across five gates. The compatibility plan (`docs/divi-capability-compatibility-plan.md`) independently needed the mockup constrained to Divi primitives. One artefact fixes both: a typed spec whose vocabulary *is* the capability surface.

## Goals / Non-Goals

**Goals**
- Single authored artefact per page (`page-spec.json`), ~4-8KB.
- Fidelity by construction: HTML preview and Divi JSON compiled from the same spec.
- Compatibility by schema: unsupported patterns are validation errors at authoring time.
- Surgical fixes: gate failures resolved by editing the spec, not re-emitting large files.

**Non-Goals**
- Converting existing Divi exports to specs (`ingest-to-spec`) — deferred until schema coverage vs `attr-paths.json` is measured.
- Simulating motion in the HTML preview.
- Replacing clone/mutate modes — they stay JSON-native.
- A full HTML-to-Divi compiler.

## Decisions

1. **Copy inline in the spec, one pass.** The bottleneck is duplicate authoring + gate loops, not copy tokens. A separate copy pass adds a coordination step (structure → copy → merge → validate) for no measured gain. Revisit only if post-Phase-2 measurement shows copy dominating, or if multi-variant copy (A/B headlines) becomes a feature.
2. **Clone/mutate stay JSON-native.** Spec round-tripping an arbitrary export is silently lossy until the schema's coverage of `attr-paths.json` is known. Prove spec-first on scratch builds where the vocabulary is controlled end to end; build `ingest-to-spec` later with real escape-hatch data. Alternative rejected: converting clones now via the `raw` escape hatch — loss frequency unknown, worse than the current token cost.
3. **Preview polish: two CSS layers, no animation.** Fidelity-by-construction changes what the taste gate judges — the preview only needs to let a human judge rhythm, hierarchy, spacing, colour. A shared base stylesheet (resets, type scale, spacing tokens) plus a thin per-aesthetic override (accents, font pairing, one or two signature cues). Theatre presets render as a visible text annotation (e.g. `⚡ hero-reveal`), emitted automatically from the spec's `theatre` field; motion is judged at the real WordPress preview (Stage 4). Alternative rejected: faking Theatre.js in static HTML — build cost with no honest signal.
4. **Vocabulary = existing builder helpers.** Module kinds map 1:1 to `divi-builder.js` exports (`heroHeading`, `heading`, `text`, `eyebrow`, `button`, `image`, `blurb`, `icon`, `accordion`, `numberCounter`, `divider`); layouts are named aliases of the supported 24-col ratios (`full`, `split-14-10`, `split-16-8`, `split-12-12`, `thirds`); theatre values come from `preset-manifest.json`; presets are `presetRef()` names against the loaded registry. A `raw` kind takes explicit builder calls and downgrades to WARN, never silently drops.

## Risks / Trade-offs

- **Schema too narrow at launch** → pages that need unsupported patterns fall to the `raw` hatch; WARNs in the run report tell us what to add next (feeds the Phase 3 matrix).
- **Preview under-sells the design** → taste gate may pass pages that look flat live; mitigated by Stage 4 visual gate remaining mandatory.
- **Two compilers drifting** → both consume the same spec module and share the section/module walk; unit test asserts heading-outline equality (fidelity pair test).

## Migration Plan

Legacy `generate-*.js` path kept for one release behind `--legacy`. Spec-first becomes the default for scratch page mode when this change ships. Clone/mutate untouched.

## Open Questions

None — the three open questions from the token plan were resolved 03/07/2026 (see `docs/token-efficiency-plan.md` §Decisions).
