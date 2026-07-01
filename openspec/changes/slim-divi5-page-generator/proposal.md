# Slim Divi5 Page Generator

## Why

The `divi5-page-generator` skill regressed from V1 (84-line SKILL.md, nice pages) to the
current version (517-line SKILL.md, erratic layouts that diverge from the HTML mockup).
Root cause analysis shows four compounding failures:

1. **Instruction overload** — 18 reference files read before Stage 1 vs 3 in V1. The
   model can't hold all that and still make clean design calls.
2. **Gates check the wrong thing** — `gate.js` + `validate.js` are rigorous on
   concept/structure/text, but nothing enforces "does the JSON actually match the mockup."
3. **Creative energy guides drift layouts** — `bolder` + `delight` + `overdrive` + dials
   push high-variance output the builder can't faithfully reproduce.
4. **Clone path not used as the deliverable** — `et-pages.js` finds a matching ET template
   but commit `068fe58` made the from-scratch rebuild the imported artefact. The one lever
   that reliably gives human-quality output isn't being pulled.

`gate.js` (concept stamp + taste stamp) already ships — that creative gate is correct and
stays. This change adds the missing fidelity gate (does the JSON match the mockup?) and
fixes the instruction bloat and clone routing.

## What Changes

- `fidelity-check.js` (NEW): L1 content fidelity (h1 + heading outline) and L2 declared-
  style fidelity (heading sizes/weights vs JSON presets) — runs after Stage 3, before
  delivery, exits 1 on FAIL. Incorporates the parked dev's task list from `tasks.md`.
- `SKILL.md` slimmed to ≤ 150 lines; default Page mode reads one taste reference; creative
  energy guides (`bolder.md`, `delight.md`, VARIANCE/MOTION/DENSITY dials) are opt-in via
  `--overdrive` only.
- Clone-and-mutate becomes the delivered artefact when `et-pages.js match` returns a hit.
  `--scratch` flag bypasses. Reverses the `068fe58` preference for the scratch page.
- `validate.js` keyword check relaxed: pass when keyword appears in h1 OR first text
  module OR any h2 (currently fails if keyword isn't in h1).

## Capabilities

- New: `content-fidelity-gate`
- Modified: `slim-skill-instructions`
- New: `clone-first-generation`
- Modified: `seo-post-pass`

## Impact

- **Files changed:** `skills/divi5-page-generator/SKILL.md`,
  `skills/divi5-page-generator/scripts/validate.js`,
  `skills/divi5-page-generator/scripts/fidelity-check.js` (new).
- **Parked work absorbed:** the `tasks.md` left by the other dev (L1/L2/L3 mockup-fidelity
  gate tasks) is the foundation for `content-fidelity-gate`. L3 (Playwright render) is
  deferred — it belongs in a follow-up change once L1/L2 are green.
- **Not affected:** `gate.js` (concept + taste stamps), Section mode, Mutate mode.
- **Breaking:** clone is now the default import when a template matches. Teams relying on
  scratch-over-clone must pass `--scratch`.
