# Coding-agent brief — Pro gating via page-compilation relocation

**Repo:** `Divi5Generate` (this repo). Work on a branch (`chore/licensing` is fine, or `feat/pro-gating`). Do **not** commit to `main` directly.

> **Historical note (16/07/2026):** written when the connector still lived in
> this repo. It has since split into its own private repo
> (`Kieransaunders/divi5-generator` — `docs/PRD.md` §3.4); `plugin/divi5-generator/...`
> paths below are stale for that reason (separate from whether the gating work
> itself was completed — it was, see PRD §6).
**Read first:** `docs/pro-gating-relocation-spec.md` (full spec, file:line refs) and `docs/PRD.md` §3.1–3.3. This brief is the execution plan; the spec is the source of truth for *what moves*.

## Goal (one sentence)

Move page render-correctness out of the public Node toolkit and into the Freemius-gated Pro connector, so raw generated JSON imports **visually broken** without Pro, and renders **correctly** through the Pro `/import` endpoint — making the connector the enforceable gate.

## Hard constraints — read before touching anything

1. **Page path only.** All changes apply to full-page builds (`context: 'et_builder'`). The **section / Divi Library path must not change** — `et_builder_layouts`, `LibraryImporter.php`, and the free `free-toolkit/` `divi5-services-section` skill stay fully self-contained and inlined. Free = sections into the Library; that behaviour is untouched.
2. **No PHP reimplementation of the builder.** You are moving 1–2 last-mile steps, not porting the ~1,200-line `divi-builder.js` into PHP. If you find yourself rewriting the builder in PHP, stop.
3. **The validator's "preset-first mode" must keep passing** — `skills/divi5-page-generator/scripts/validate.js:281-314, 341-364`. Unresolved page output is validated against out-of-band registry files, not treated as an error.
4. **Do not publish anything public.** This brief does not include pushing `Kieransaunders/D5G` public — that happens only after the smoke test (below) passes and Kieran green-lights it.
5. **Check what PR #33 already did** (`git show 19875e4 --stat`) before building Task 0 — "skill-install UX + Pro toolkit delivery" may already exist; extend, don't duplicate.

## Key files (from the spec)

- Builder: `skills/divi5-page-generator/scripts/divi-builder.js` — `applyPreset()` :134-141, `applyGroupPreset()` :150-156, `button()` :667, `assemble()` :1172-1197, `presetRef()` :906-928, `loadPresetRegistry(...,{withAttrs})`.
- Validator: `skills/divi5-page-generator/scripts/validate.js` — preset-first mode :281-314, :341-364.
- Connector: `plugin/divi5-generator/src/PageImporter.php` — preset registration + ID remap :53-62, CSS-cache clear :64-67, global colours/vars :74-97, `wp_kses_post` bypass (direct `$wpdb` write) :139-143, per-page cache clear :145-149, :186-205. Mirror in `PagePreviewer.php:56-65`. Pro routes: `PresetManager.php:26-58`, `GlobalVariablesImporter.php:30-53`, `RestApi.php` PRO_ONLY_ROUTES :171-186, page gate :204-235.
- Workflow / payload / tests: `examples/preset-first-workflow.js:87-91,180-188`, `app/lib/import-payload.js`, `scripts/__tests__/e2e-render.test.js` (config :48-73, button-colour check :185-194, screenshot diff :196-236).

---

## Task 0 — `is_pro()` install-instructions swap (independent, do anytime)

The connector's Settings/onboarding panel shows the Claude toolkit install command. Branch on the existing `is_pro()` (from PR #28):

- **Free:** `claude plugin marketplace add Kieransaunders/divi5-starter && claude plugin install divi5-starter@divi5-starter`
- **Pro (`is_pro()` true):** `claude plugin marketplace add Kieransaunders/D5G`

Single PHP conditional in the settings/onboarding renderer. Optionally wrap the Pro block in a Freemius `@fs_premium_only` annotation so the `D5G` URL is absent from the built free `.org` zip (verify by inspecting the built zip, not the source tree). Add/extend a test. **This does not depend on the smoke test.**

---

## Task 1 — Build the smoke-test transform (unblocks the gate check)

Create `tools/make-unresolved-test.js` (private, dev-only — never shipped in any skill). Input: any generated page JSON. Output: two variants, so a human can prove the gate on live Divi before real code lands.

- **Variant A (Step 1 — de-inlined):** strip inline style attrs from page modules, keep `modulePreset`/`groupPreset` pointers, keep the top-level `presets` block.
- **Variant B (Step 2 — brand externalised):** as A, **and** remove the top-level `presets`, `global_colors`, and `global_variables` arrays entirely (they travel out-of-band to Pro).

Match the exact emitted shape in `divi-builder.js` `assemble()` (:1172-1197). Add a small unit test that round-trips a fixture. Output must still pass `validate.js` preset-first mode.

---

## ⛔ GATE — human smoke test (must pass before Task 2)

**Do not implement Task 2 until Kieran confirms this passed.** He runs it on live Divi 5.9 (`divi-5-airtable-plugin`, Local, `D5G_ASSUME_PRO` or a Pro key). Full procedure in `docs/pro-gating-relocation-spec.md` §5. Pass criteria: raw Variant B imported via VB Portability renders **meaningfully broken** on the *published front end* (≥2 of: buttons default blue `rgb(46,86,153)`, brand colours unresolved, headings ~30px, screenshot diff over threshold), **and** the same JSON through Pro `/import` renders correct. If raw output renders "good enough", the gate is weak → report back; do not proceed.

---

## Task 2 — Implement the relocation (only after the gate passes)

Ship **Step 1 + Step 2 together** (Step 2 is load-bearing).

**Builder (`divi-builder.js`), page builds only:**
- Stop inlining preset attrs for pages — emit pointer-only (`modulePreset:[id]`, `groupPreset:{presetId}`) + structural attrs (content, heading level, admin label). Reuse the existing `presetRef()` / `loadPresetRegistry(...,{withAttrs:false})` path — this mode already exists.
- In `assemble()`, for pages, emit `presets`, `global_colors`, `global_variables` **empty/absent** (they go out-of-band). Sections keep them inline.

**Connector (`PageImporter.php`), page import path:**
- After preset registration + ID remap (:53-62), **inline each referenced preset's attrs into its block** before the DB write (:142) — a PHP mirror of the builder's `applyPreset()` merge (preset attrs as base, block attrs override). This is the "compile" step.
- Resolve brand: register presets + global colours + variables from the supplied brand profile (reuse `GlobalData` / `GlobalVariablesImporter` paths, :74-97). Ensure `/import` can accept or look up a **brand-profile id** so a single call is self-contained (today the app registers brand via the separate Pro routes `/presets/import` + `/global-variables` — make the page import path able to do it in one shot, or document the required call order).
- Keep the existing CSS-cache clears (:64-67, :145-149) and `wp_kses_post` bypass (:139-143).
- Mirror any needed changes in `PagePreviewer.php`.

**Do not** change `RestApi.php` gating semantics (page `/import` + `/preview` already Pro-gated); just ensure the compile step runs inside the already-Pro path.

## Task 3 — Automated verification

- Wire `scripts/__tests__/e2e-render.test.js` as the standing check: same page, (a) raw variant → asserts broken (button `rgb(46,86,153)`, screenshot diff high), (b) Pro `/import` → asserts correct (brand button colour, diff within threshold).
- Add PHP unit coverage for the new inliner in `PageImporter` (preset attrs correctly merged; free/section path untouched).
- Run the full suites green: PHPUnit (`plugin/`) and the Node tests. The `app/server.js` `EXPECTED_D5G_VERSION` lockstep contract test must still pass.

## Done criteria

- [ ] Task 0 shipped + tested (independent).
- [ ] `tools/make-unresolved-test.js` produces both variants, passes validator preset-first mode.
- [ ] **Gate confirmed by Kieran** on live Divi 5.9.
- [ ] Builder emits unresolved page JSON (pointers + empty brand blocks); sections unchanged.
- [ ] `PageImporter` compiles unresolved → correct, brand-accurate page; PagePreviewer mirrored.
- [ ] `e2e-render.test.js` proves broken-raw vs correct-via-Pro; PHPUnit + Node green; version lockstep intact.
- [ ] Bump `D5G_VERSION` + all version-sync points; changelog entry. Commit on a branch, PR, **do not merge to main or publish D5G without Kieran's sign-off.**

## Decision log discipline

Keep a running list of choices + rejected alternatives + why (per repo convention). At the end, give a short decision summary: key choices, trade-offs, anything to know before it ships, and any assumptions made to keep moving.
