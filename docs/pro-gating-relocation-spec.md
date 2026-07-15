# Pro Gating — Page-Compilation Relocation Spec

**Date:** 15/07/2026 · **Status:** spec, pending the live-Divi smoke test (§5) before any code
**Feeds:** PRD §3.1 #2 (the enforceable gate). Sections→Library (Free) path is explicitly out of scope and stays self-contained.

## Goal

Move the "make a generated page actually render correctly" magic OUT of the public Node toolkit and INTO the Pro connector's import path, so that raw toolkit JSON pasted straight into the Divi Visual Builder imports **structurally present but visually broken**, while the same JSON through the Pro `/import` endpoint renders correctly and on-brand. The connector is Freemius-licensed, so this makes the gate enforceable.

## Files of record

- Builder: `skills/divi5-page-generator/scripts/divi-builder.js` (the "~784-line" module; actually ~1,211 lines)
- Validator: `skills/divi5-page-generator/scripts/validate.js`
- Connector import path: `plugin/divi5-generator/src/{PageImporter,PagePreviewer,PresetManager,GlobalVariablesImporter,LibraryImporter,RestApi}.php`
- Workflow/payload: `examples/preset-first-workflow.js`, `app/lib/import-payload.js`, `scripts/__tests__/e2e-render.test.js`

## 1. Where render-correctness lives today (emit-time)

The builder makes output render-ready by **inlining every visual style into each block's own attrs**; the preset registry is treated as VB-only decoration.

- **Preset inlining (core).** `applyPreset()` merges preset `attrs` as the base of the module attrs, stamps `modulePreset:[id]` — `divi-builder.js:134-141`. In-code rationale: *"Divi 5 only generates front-end CSS from inline block attrs — preset registry entries are used by the Visual Builder only."*
- **Group presets** inlined the same way — `applyGroupPreset()` `:150-156` (*"a bare groupPreset pointer with no inline fallback silently renders as unstyled on REST-imported pages"*).
- **`enable:'on'` button toggle** inlined on every button — `button()` `:667`, `buttonPresets()` `:1090`, `buttonPreset()` `:1110`. Validator calls a missing toggle *"the #1 cause of default blue buttons on import"* — `validate.js:370-374, 440-467`.
- **Raw-hex preset backgrounds** — `preset-first-workflow.js:87-91`; validator exempts `background/button/border/boxShadow` from the variable-ref rule — `validate.js:660-663`.
- **Brand / global-variable refs.** `globalColor()`/`colorVar()` emit `$variable({...gcid-…})$` (`:815-826`); `globalVariable()`/`varRef()` emit `$variable({...gvid-…})$` (`:971-986`). These resolve **only if** the matching `gcid-`/`gvid-` definitions are registered on the site; the definitions ride in the export's `global_colors`/`global_variables` arrays — `assemble()` `:1172-1197`.
- **Per-page CSS:** toolkit does nothing — relies on inline attrs + Divi's normal front-end CSS generation.
- **Pointer-only mode already exists.** `presetRef()` `:906-928` + `loadPresetRegistry(...,{withAttrs})` can emit blocks that reference presets without inlining; `preset-first-workflow.js:180-188` builds a page then `delete layout.presets` and registers CSS out-of-band. The validator has a matching **preset-first mode** (`validate.js:281-314, 341-364`). **This is the ready-made scaffold for the relocation.**

## 2. What the connector already does (import-side)

Everything needed to register a brand and regenerate CSS already exists; it's just redundant today because the toolkit double-covers render via inline attrs.

- Preset registration + old→new ID remap — `PageImporter.php:53-62` (mirror in `PagePreviewer.php:56-65`).
- Global CSS-cache clear — `PageImporter.php:64-67`; per-page cache clear (`wp-content/et-cache/{post_id}/*.css`) — `:145-149, 186-205`.
- Global colours + variables import — `PageImporter.php:74-97`, `GlobalVariablesImporter.php:30-53`.
- `wp_kses_post`/`balanceTags` bypass (direct `$wpdb->posts` write) — `PageImporter.php:139-143`.
- Standalone Pro routes `/presets/import`, `/presets`, `/global-variables` — `PresetManager.php:26-58`, `GlobalVariablesImporter.php`; all Pro-only (`RestApi.php:171-186`). Page `/import` + `/preview` Pro-gated by `$layout['context']` — `RestApi.php:204-235`. Free = library sections only.

## 3. Current boundary

**Today the toolkit emits COMPLETE, render-ready `et_builder` JSON — manual Visual-Builder import renders correctly with zero connector involvement** (every visual attr inlined, `divi-builder.js:134-156, 667`). The connector's registration is redundant for render on a single-file import; it only matters for VB *editing* and `$variable()` colour resolution. So the leverage is real: **render-correctness lives in the emitter and must be removed from the file.**

### ⚠️ Load-bearing contradiction to settle first

The codebase holds two mutually exclusive beliefs about front-end CSS:
- **(A)** *"Divi 5 only generates front-end CSS from inline block attrs; the preset registry is VB-only"* — `divi-builder.js:130-133, 146-148, 904, 962-963`.
- **(B)** The importer registers presets + clears caches *specifically so Divi generates preset-class CSS on the front end* — `PageImporter.php:64-67, 145-149`; all of `preset-first-workflow.js` depends on (B).

If (A) is literally true, de-inlining breaks raw render and the importer must re-inline. If (B) is true, a raw file that still contains a `presets` block can **self-heal** when Divi's VB portability-import registers those presets → the gate fails. **The §5 smoke test must settle this before any commit.**

## 4. Proposed relocation (cheap — 1–2 last-mile steps, no PHP builder rewrite)

Both apply **only to full-page builds (`context:'et_builder'`)**. Sections/library (`et_builder_layouts`, `LibraryImporter.php`, `divi5-services-section`) stay fully inlined and self-contained — Free's path is untouched.

### Step 1 — De-inline preset attrs on page builds (cheapest, but weak alone)

- **Moves:** the inlining in `applyPreset()`/`applyGroupPreset()` (`:138, :152`) out of the emitter for pages; blocks emit pointer-only (`modulePreset:[id]`, `groupPreset:{presetId}`) + structural attrs only; the `presets` registry stays in the file. A PHP mirror of `applyPreset()` runs in `PageImporter` (after `:53-67`, before the DB write at `:142`) to inline preset attrs.
- **Raw render:** breaks **only if belief (A) holds** — buttons default blue, headings 30px, brand colours gone. If (B) holds and VB self-registers the embedded `presets`, raw output self-heals → **gate fails.**
- **Reverse difficulty:** LOW–MEDIUM — styling values are still in the file (`presets`); ~40 lines of JS re-runs the merge.
- **Effort:** ~½ day. **Free path:** unaffected.

### Step 2 — Externalise the brand definitions (robust; the load-bearing one)

- **Moves:** strip `presets`, `global_colors`, `global_variables` from the page file entirely (`assemble()` `:1172-1174` emits them empty for pages). They travel out-of-band to the Pro importer — the app already holds the brand profile and the Pro-only `/presets/import` + `/global-variables` routes already register them. This is exactly the `delete layout.presets` shape of `preset-first-workflow.js:188`, already validated by the validator's preset-first mode (`validate.js:281-314`).
- **Emitted output:** blocks carry `modulePreset` pointers to IDs **defined nowhere in the file**, and `$variable(gcid-…)$` refs with **no matching definitions**.
- **Raw render:** **meaningfully broken regardless of (A)/(B)** — pointers reference non-existent presets, colour refs unresolved, buttons default blue. VB **cannot** self-heal because the definitions aren't present to import.
- **Reverse difficulty:** HIGH — the brand's colour values, font stacks, sizes and preset CSS are simply **absent from the file**; the connector is the only source, and it's Freemius-licensed.
- **Effort:** ~1–1.5 days. Main risk: importer must reliably obtain the brand definitions — ensure `/import` can accept/look up a brand-profile id so a single call is self-contained. **Free path:** unaffected.

### Recommendation

**Ship Step 1 + Step 2 together.** Step 1 alone is reversible and (A)/(B)-dependent; **Step 2 is what makes raw paste unrecoverable and off-brand** while keeping the change to "strip 3 blocks + move one merge into PHP" — not a builder reimplementation.

## 5. Live Divi 5.9 smoke test (proves the gate holds)

Prereqs: Local WP + Divi 5.9 + Pro connector with a valid Pro key; app configured (`DIVI_SITE_URL`/`DIVI_API_KEY`, per `e2e-render.test.js:48-73`). Source: `examples/iConnectITHomepage.json` (buttons, brand colours, headings).

**A. Generate:** build a page with the relocated emitter (Step 1+2) → `page.raw.json` (pointer-only, no `presets`/`global_colors`/`global_variables`); keep the brand definitions separately.

**B. Prove raw is broken (negative case):**
1. Divi 5.9 site → VB on a blank page → Portability → Import `page.raw.json` (also test clipboard-paste of a section).
2. Save, view the **published front end** (not the VB canvas — VB may resolve pointers client-side; front-end is the real test).
3. Objective checks (reuse `e2e-render.test.js` E3/E4):
   - Buttons: `getComputedStyle(btn).backgroundColor === 'rgb(46, 86, 153)'` (Divi default blue) — `:185-194`.
   - Brand colour: hero/section background computed colour ≠ brand hex.
   - Heading: hero `h1` computed `font-size` ≈ 30px (default).
   - Screenshot diff vs golden exceeds `DIFF_THRESHOLD` widely — `:196-236`.
   - **Gate passes if ≥2 fail.** If buttons aren't blue and colours resolve, the relocation didn't bite → investigate VB self-heal / belief (B) → fall back to Step 2 full externalisation.
4. **VB self-heal check (critical):** after import, query `/wp-json/divi5-generator/v1/presets` (or inspect GlobalPreset store) — confirm the raw file's pointers were **not** registered. If they were, the `presets` block must be stripped (Step 2).

**C. Prove Pro fixes it (positive case):**
5. Run the same page through Pro `/import` (`app/lib/import-payload.js` → `POST /wp-json/divi5-generator/v1/import`, brand registered via `/presets/import` + `/global-variables` first).
6. View published front end, re-run E3/E4/E5: buttons brand-coloured (no `rgb(46,86,153)`), colours resolved, headings at preset size, screenshot within threshold → **gate confirmed** (same JSON: broken raw vs correct via Pro).

## Bottom line

Viable, because render-correctness genuinely lives in the emitter today and the connector already owns the registration machinery, with a pointer-only mode + validator support already scaffolded. **Two things could sink it and must be settled empirically first:** (1) the (A)-vs-(B) front-end-CSS contradiction, (2) whether VB Portability self-registers an embedded `presets` block. **Step 1 alone is at risk from both; Step 2 (externalising the brand so the values are absent from the file) holds regardless** — and is still a cheap, last-mile change.
