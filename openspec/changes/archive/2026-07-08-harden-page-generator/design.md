# Design: harden-page-generator

## Context

Five gaps let an invisible-text page pass every gate. They span the setup script, the registry data, the compiler, the validator, and the docs — so the change is deliberately a bundle, but each piece is small and independently testable.

## Key decision: where colours live vs. where the gate reads them

The tempting fix — bundle the designer's full preset attrs into every page so the validator can see the colours — backfires: `applyPreset()` inlines those attrs onto each block, re-stamping raw hex and `gcid-*` values that then trip the existing ET-token and undefined-gcid gates (11 false failures observed).

Decision: **the compiler references presets by ID (the site owns the styling, matched on import); the contrast gate reads colours from the on-disk registry, not from inlined block attrs.** This keeps generated pages clean, preserves the token/gcid gates, and still gives the gate full colour visibility. The registry therefore MUST carry attrs (`with_attrs=1`) — that is the single enabling change; everything else composes on top.

## Components

- `setup-et-presets.js` — fetch `?with_attrs=1`; emit `preset-catalogue.json` after the registry.
- `references/et-preset-registry.json` — now `{name: {id, attrs}}`. Consumers already tolerate both shapes.
- `spec/validate-spec.js` + `spec/vocabulary.js` — accept `section.preset`.
- `spec/spec-to-divi.js` — apply `section.preset`; reference by ID, no attr inlining.
- `validate.js` — contrast gate (registry-first colour resolution, container background stack).
- `references/section-recipes/` — starter blueprints.
- `SKILL.md` — correct importer plugin/endpoint/header + site-profile link.

## Testing

Node `scripts/__tests__/*.test.js`, no framework (repo convention). Each new scenario gets a runnable test. The contrast gate, section-preset vocabulary, reference-by-ID, and catalogue emission are all unit-testable offline against fixture JSON + a small fixture registry; the importer-docs requirements are asserted by grepping SKILL.md.

## Non-goals

- No WordPress plugin changes.
- No brand-pack / two-step live-import redesign (folds in later without rework).
- No automated visual-diff run here — the existing `visual-diff.js` gate is documented, not re-implemented.
