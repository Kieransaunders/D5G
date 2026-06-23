# Divi 5 Generator — Consolidated Roadmap

**Date:** 2026-06-23
**Status:** Active — merges the two 2026-06-22 plans, reconciled against code.
**Supersedes:** `2026-06-22-amazing-generator-from-new-or-existing.md`, `2026-06-22-design-system-upgrade-and-quality-gates.md`

> **Design principle:** A page that validates must render. Validation that passes while the live render is broken is a bug in the validator, not a success.

---

## Done (verified against code, 2026-06-23)

| Phase | What | Evidence |
|---|---|---|
| **-1** Rebuild zip / drop stale duplicate | Importer ships unpacked under `plugin/divi-tools-importer/`; zip built on demand (`import-to-local/scripts/build-plugin-zip.sh`) | nested-zip installer constraint |
| **1A** Inline preset attrs; `presetRef()` throws without `{withAttrs}` | `divi-builder.js:749–792` |
| **1B** `colorRef()` falls back not throws; `b.color()` accessor | `divi-builder.js:696–740` |
| **1C** Validator kills silent preset-first bypass (phantom-ID + gcid checks) | `validate.js:255–323` |
| **1D** Importer returns preset attrs (`GET /presets?with_attrs=1`) | `RestApi.php:58–162` |
| **2** Round-trip: `ingest.js` + `mutate.js` | both present in `scripts/` |
| **4A** `/preview` render smoke-test | wired into SKILL.md |
| **4B** Fixture suite (B0–B8) | `__tests__/phase4b.test.js`, all green |
| **5A** `typeScale()`/`spaceScale()`/`globalVariable()` + `references/type-scale.js` | `divi-builder.js:823–867` |
| **5B** `spacingPresets()` | `divi-builder.js:899` |
| **5C** `buttonPresets()` w/ hardcoded `enable:'on'` | `divi-builder.js:920–940` |
| **5D** `headingPresets()` | `divi-builder.js:950` |
| **6A** GAP-A: button `enable:'on'` validator (group/module/inline) | `validate.js:332–373`, tested as B8 |
| **7A** `taste-check.js` (5 rules incl. TASTE-EYEBROW) + **7B** wired into SKILL.md | `scripts/taste-check.js`, SKILL.md:235 |
| **8B** `regression.test.js` (validate + taste per golden) | passes |
| **GAP-B** `codeBlock([])` throws; exported as `D.codeBlock()` | `divi-builder.js`, tested as B9 |

All six test suites pass: `phase0`, `phase2`, `phase4b`, `regression`, `smoke`, `taste`.

---

## Open work

### A. iConnectIT example refactor (Phase 5E) — *not started*
`iConnectITHomepage.json` fails validate: phantom preset IDs, no h1, raw hex, em-dashes, `"harness"` AI-tell.
Needs a full rebuild using `b.typeScale()`, `b.spacingPresets()`, `b.buttonPresets()`.
Once it passes validate + taste, add it to the `GOLDEN` list in `regression.test.js` (there's already a TODO comment there).

**Exit:** `node validate.js examples/iConnectITHomepage.json` exits 0; regression suite covers it.

### D. Phase 3 taste/visual polish — *deferred, not started*
- **3B** Playwright visual-diff with numeric fidelity score + threshold gate (today `e2e-render.test.js` renders but doesn't score).
- **3C** Section library: extract best-per-type into builder-ready `D.section(...)` partials under `references/section-library/`.

Lower priority — pages work and pass taste; this is "ok → amazing". Pick up after A–C.

---

## Order

1. **A** (iConnectIT refactor) — rebuild example to validate + taste clean, then add to regression.
2. **B** (Phase 3) — only if quality bar needs raising.

A alone is the remaining gap closure. B is a separate polish pass.

---

## Open questions (carried from prior plans, still unanswered)

1. **Preset strategy** — inline-always vs preset-first? Current hybrid is the documented bug source; 1A/1C made it loud but didn't pick a default.
2. **Mutator scope** — `mutate.js` exists; is the current change-set (copy/colour/section) enough, or do you want full "edit anything"?
3. **Design bar** — Floria references as the hard target for the Phase 3 visual gate?
4. **Golden strategy** — live examples (lazy) or frozen JSON snapshots (stricter)? See item C.
