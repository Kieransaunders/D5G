# Add frontend design tokens + global CSS (redesign Phase 0)

## Why

The frontend reskin plan (`app/REDESIGN-PLAN.md`) ships in five phases. **Phase 0 is the
~70% visual lift for half a day's work**: define the mockup's dark-theme token palette,
load the two Google Fonts (Plus Jakarta Sans, JetBrains Mono), rewrite base typography,
buttons, inputs, scrollbars, badges, and the four motion keyframes. It is CSS-only — no
DOM/structural changes, no wiring touched — so it delivers an instant premium feel without
risking any of the 123KB of working vanilla-JS behaviour in `app.js`. Everything later
phases build on (the icon rail, chat canvas, card system) consumes these tokens, so they
must land first and land stable.

## What Changes

- Replace the existing `:root` token block in `app/public/style.css` with the mockup's
  dark-theme palette:
  - background `#0a0b0e`; panel surfaces `#0c0d11` / `#121419` / `#141620`
  - hairline borders `rgba(255,255,255,0.06)` → `rgba(255,255,255,0.12)`
  - primary orange `#f75d00` → hover `#ff7a2b`; accent yellow `#f9c22d`
  - success green `#34d399` / `#16a34a`; danger `#ef4444`
- Load **Plus Jakarta Sans** (UI, weights 400–800) and **JetBrains Mono** (logs/hex) from
  Google Fonts via `<link>` + `preconnect` in `app/public/index.html` `<head>`.
- Rewrite base typography: Plus Jakarta Sans as the default `--d5-font`, JetBrains Mono as
  `--d5-font-mono`; headings get `letter-spacing: -0.02em` and weight 800 is available.
- Add `--d5-radius-*` and `--d5-shadow-*` custom properties.
- Style thin custom scrollbars (WebKit `::-webkit-scrollbar` + Firefox `scrollbar-width`).
- Define four `@keyframes`: `d5b` (thinking dots), `d5pulse`, `d5fade`, `d5spin`.
- Add a `.d5-badge` pill class (Active / Live preview / Draft imported / Connected) coloured
  from the token palette.
- **No DOM/ID changes** in `index.html` beyond the two font `<link>` tags. **No `app.js`
  changes at all.** Existing tab routing, SSE handlers, and all `app/tests/*.test.js` MUST
  stay green.

## Capabilities

### New Capabilities
- `frontend-design-tokens`: the dark-theme CSS custom-property palette (colours,
  typography, radii, shadows), the two loaded Google Fonts, the thin scrollbar styling,
  the four motion keyframes, and the pill-badge utility class — the visual foundation that
  every later redesign phase (icon rail, chat canvas, card system) consumes.

### Modified Capabilities
<!-- None — no prior frontend spec exists in openspec/specs/. -->

## Impact

- **Code**:
  - `app/public/style.css` — full `:root` rewrite + new base/font/scrollbar/keyframe/badge
    rules (largest change).
  - `app/public/index.html` — two `<link>` tags + `preconnect` in `<head>` only. No body
    markup changes.
  - `app/public/app.js` — **untouched**.
- **Tests**:
  - New `app/tests/design-tokens.test.js` — RED today; asserts the token contract
    (palette values, font links, keyframes, scrollbar rules, badge class) is present in
    the shipped CSS/HTML. Node-side text assertions, matching the existing
    `style-check.test.js` pattern (no browser).
  - Existing `app/tests/*.test.js` — MUST remain green (regression guard for wiring).
- **Risk**: very low. CSS-only. The only behavioural surface is the two `<link>` tags
  (offline => fonts fall back to system, no JS error). No endpoints, no `app.js`, no DOM
  ids touched.
- **Out of scope** (deferred to later phases): icon nav rail (Phase 1), chat canvas
  restructure (Phase 2), per-screen card reskin (Phase 3), motion/animation polish +
  responsive (Phase 4).
