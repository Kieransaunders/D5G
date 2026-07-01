# Require Explicit Heading Level

## Why
The builder's `heading()` defaults `headingLevel` to `h2` silently (`o.level || 'h2'`), and
`headingPresets()` omits `headingLevel` on the h2 group preset
(`headingLevel !== 'h2' ? headingLevel : undefined`). The fallout: a hero the author forgot
to mark ships as an h2, the validator catches the "no h1" failure downstream, and headings
built on the h2 group preset carry no explicit level marker at all. The skill audits this
fallout in `validate.js`; the fix belongs at the source — eliminate the silent default in
the builder so the mis-classification cannot occur in the first place.

## What Changes
- **BREAKING:** `heading()` throws if `level` is omitted. Every call site must declare its
  level (h1-h6). Decorative numerals and eyebrows already use `text()`, not `heading()`.
- Add `heroHeading(opts)` — a convenience that always emits `headingLevel: 'h1'` and ignores
  any `level` passed, so the single hero h1 cannot be accidentally marked otherwise.
- `headingPresets()` now emits `headingLevel` explicitly for the h2 group preset (and h1,
  h3) — no level is left implicit.

## Capabilities
- New: `explicit-heading-level`

## Impact
- **Files changed:** `skills/divi5-page-generator/scripts/divi-builder.js` (`heading()`,
  new `heroHeading()`, `headingPresets()`), and the module `exports` list.
- **Breaking:** any generator or example calling `heading()` without `level` will throw at
  build time. The RED proof confirms the existing test suite already passes `level:`; the
  apply phase fixes any example/generator file that does not.
- **Not affected:** `headingPreset()` (single preset) already emits whatever level is
  passed. The validator's heading-outline / SEO h1 checks stay — they simply become
  unreachable defenses rather than the primary enforcement.
