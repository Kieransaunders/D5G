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

### A. iConnectIT example refactor (Phase 5E) — ✅ done (25/06/2026)
Rebuilt via a new generator `examples/iconnectit-homepage.js` using `b.typeScale()`,
`b.spaceScale()`, `b.spacingPresets()`, `b.buttonPresets()`, `b.headingPresets()`.
Copy rewritten UK-English + on-brand (real stack, ALET portal), proper h1, refs not raw
hex, hyphens not em-dashes, varied card lengths. `iConnectITHomepage.json` now passes
validate (exit 0, 0 errors) and taste (exit 0, 0 warnings) and is in the `GOLDEN` list;
regression suite 6/6.

**Exit met:** `node validate.js examples/iConnectITHomepage.json` exits 0; regression covers it.

### A1. Stale test baselines from commit 0e67926 — ✅ done (25/06/2026)
The ANIMATION-warning commit (`0e67926`) added a validator warning but left suites asserting
the old output. Fixed:
- `phase0.test.js` T6 — embedded baseline updated to include the `WARN ANIMATION` line + `1 warning(s)`.
- `smoke.test.js` — assertion relaxed to `0 error(s)` (advisory warnings allowed).
- `phase2.test.js` T4 — `FIND_TEXT` was the old iConnectIT hero string removed in the Phase 5E
  rebuild; repointed to the new h1 ("Portals and apps that connect your whole business.").

All suites now pass (`e2e-render` skips without `DIVI_SITE_URL`/`DIVI_API_KEY`).

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
