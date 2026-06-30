# Tasks: Add frontend design tokens + global CSS (redesign Phase 0)

Scope: CSS-only reskin of `app/public/style.css` plus two Google Fonts `<link>` tags in
`app/public/index.html` `<head>`. **No `app.js` changes. No DOM/ID changes beyond the font
links.** Drives the RED tests in `app/tests/design-tokens.test.js` to GREEN without
regressing any existing test.

## 1. RED test scaffold

- [ ] 1.1 Add `app/tests/design-tokens.test.js` (Node `node:test` + `node:assert/strict`,
      reading `app/public/style.css` and `app/public/index.html` as text). One `test()` per
      requirement scenario in `specs/frontend-design-tokens/spec.md`. Confirm it FAILS now
      for the right reason (tokens/links/keyframes absent) by running
      `node --test tests/design-tokens.test.js` from `app/`.

## 2. Colour token palette

- [ ] 2.1 Rewrite the `:root` block in `app/public/style.css` to define every `--d5-*`
      token at its canonical value (palette, surfaces, borders, primary+hover, accent,
      success ×2, danger, text hierarchy) per the spec.
- [ ] 2.2 Keep the legacy token names (`--bg`, `--surface`, `--surface-2`, `--border`,
      `--border-2`, `--text`, `--text-2`, `--muted`, `--accent`, `--accent-h`, `--success`,
      `--warn`, `--danger`, `--radius`, `--font`, `--mono`) as aliases pointing at the
      closest `--d5-*` value, so untouched Phase-3+ screens still render. (`--warn` →
      `--d5-accent`, `--accent` → `--d5-primary`, etc.)

## 3. Typography

- [ ] 3.1 In `app/public/index.html` `<head>`, add `<link rel="preconnect"
      href="https://fonts.googleapis.com">` and `<link rel="preconnect"
      href="https://fonts.gstatic.com" crossorigin>`.
- [ ] 3.2 Add a single Google Fonts `<link rel="stylesheet">` loading Plus Jakarta Sans
      (weights including 800) and JetBrains Mono from `fonts.googleapis.com`.
- [ ] 3.3 In `style.css`, set `--d5-font` to `Plus Jakarta Sans` + system fallbacks and
      `--d5-font-mono` to `JetBrains Mono` + monospace fallbacks; apply `--d5-font` to
      `body`.
- [ ] 3.4 Add heading rule(s) (`h1`–`h4`) with `letter-spacing: -0.02em`; ensure a weight
      of 800 is reachable for headings.

## 4. Radii, shadows, scrollbars, motion, badges

- [ ] 4.1 Define `--d5-radius` (and any tiered `--d5-radius-sm` / `--d5-radius-lg` you want)
      and `--d5-shadow` (plus tiered variants) on `:root`.
- [ ] 4.2 Add WebKit scrollbar rules: `::-webkit-scrollbar` (width), `::-webkit-scrollbar-thumb`
      (token-coloured), optional `::-webkit-scrollbar-track`.
- [ ] 4.3 Add Firefox scrollbar rules: `scrollbar-width: thin` and `scrollbar-color` on a
      main surface selector.
- [ ] 4.4 Define the four top-level `@keyframes`: `d5b` (thinking dots bounce), `d5pulse`,
      `d5fade`, `d5spin`.
- [ ] 4.5 Add a `.d5-badge` class: pill shape (horizontal padding, tight vertical padding,
      full radius), coloured from `--d5-*` tokens, sized for status labels.

## 5. Verify GREEN + no regression

- [ ] 5.1 Run `node --test tests/design-tokens.test.js` from `app/` → all design-token
      tests GREEN.
- [ ] 5.2 Run `npm test` from `app/` → every pre-existing test file still GREEN (no
      wiring regression). `design-tokens.test.js` is included in the glob, that's fine —
      it should be green too.
- [ ] 5.3 Smoke-launch `npm start` in `app/`, open `http://localhost:3000/`, click each
      nav tab, confirm no console errors and the dark theme renders. (Manual; document the
      run in the verify step.)
