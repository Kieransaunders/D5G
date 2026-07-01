# Positive patterns — what good looks like

Anti-slop rules (see [taste.md](taste.md)) tell you what to avoid. This file is the positive
counterpart: the composition moves that make a Divi 5 landing page read as designed, not
generated. Read it alongside [layout-patterns.md](layout-patterns.md) and the Floria
references before building.

## Hero (one of these, not a centred text stack on flat colour)
- **Asymmetric split** — left copy / right real image (default for most briefs).
- **Editorial centred** — oversized type, lots of negative space; only for manifesto /
  launch / editorial briefs with low VARIANCE.
- The hero always carries one real image. A text-only hero on a flat background reads
  incomplete, not minimal.

## Layout families (pick ≥ 4 different ones per page; never repeat a structure)
- split hero · image gallery / bento grid · staggered testimonials · vertical FAQ ·
  full-width CTA band · logo wall · numbered process (numbers are `text()`, not headings) ·
  single-column manifesto.
- The "three equal icon-blurb cards" row is the single most common AI tell — do not use it.
  Use a 2-column zig-zag, an asymmetric grid, or grouped tiles instead.

## Section composition
- **Section headers vary**: left-aligned for split/gallery sections; centred only for
  manifesto bands. An eyebrow on every section reads like a Divi demo — max one eyebrow per
  three sections, hero counts as one.
- **Spacing rhythm**: hero ~7-8em desktop / ~4em phone; content sections ~5-7em / ~3.5-4em;
  text rows constrained ~700-800px; card rows ≤ ~1200px; consistent ~30px column gaps.
- **Cards earn elevation**: contrasting background + radius + ~2em padding, or group with a
  divider / whitespace instead. Don't card everything.

## Colour & type
- One accent, locked for the whole page, referenced as a global colour everywhere.
- One corner-radius scale held across the page.
- Hierarchy by weight + colour, not just raw scale (h1 ≈ 3-4× body, heavier than h2).
- Max two font families; `Inter` as the *display* font is the most-tested AI tell.

## The one-line test
If the HTML preview could be mistaken for a default Divi demo — centred hero, three equal
blurbs, an eyebrow on every section — it fails the taste gate even when every anti-slop
checklist item passes. Match a good reference here, don't just obey the bans.
