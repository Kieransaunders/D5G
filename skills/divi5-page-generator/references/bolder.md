# Bolder — Amplification Guide for Divi 5

> Read this when the brief calls for agency, creative, impact, or statement energy, and the design
> read confirms VARIANCE ≥ 8. Bolder is not a default — it is a deliberate commit to a direction
> already chosen. Applied to the wrong brief (trust-first, regulated, public sector), it reads as
> aggressive rather than confident.

---

## When to activate

Activate bolder moves when the brief or client signals include:

- Words: "bold", "strong", "powerful", "impactful", "statement", "confident", "not boring"
- Sector: agency, creative studio, fashion, luxury, tech-forward brand
- Aesthetic preset: Brutalist Signal or Midnight Luxe (both are built for bolder)
- Logo is high-contrast, geometric, or editorial in character
- VARIANCE dial is at 8–10 after the design read

Do **not** activate for: legal, healthcare, finance, public sector, regulated industries, or any brief
that says "clean", "professional", "minimal", "safe". Bolder on those reads as a tone error.

---

## The five bolder moves (Divi 5 mechanics)

### B1 — Typographic scale

Push h1 to **88–120px** desktop (vs the standard 56–72px range). Only applies when:
- The hero is full-bleed dark or has a strong image backing it
- The headline is ≤ 6 words (longer copy at this scale breaks in two lines and loses impact)
- VARIANCE is 8+

```js
heading({ level: 'h1', text: 'Built to Last', preset: P.h1 }, {
  module: {
    advanced: {
      customCss: {
        main: 'font-size: clamp(64px, 8vw, 120px); letter-spacing: -0.04em; line-height: 1.0;'
      }
    }
  }
})
```

Pair with body text at exactly 18px — the contrast between 120px and 18px is the design.

### B2 — Committed accent section

Use the accent as a **full section background** (not just a CTA band). One section per page, two at absolute most. Must be the established accent colour, not a new one. Works best for a stats strip or a "why us" moment mid-page.

```js
section({
  background: { color: T.accent },  // T.accent = brand accent hex
  padding: { top: '6em', bottom: '6em' }
}, [...])
```

All text inside: headings `#FFFFFF`, body `#E8E8E8`. Buttons in white with accent text (inverted).

### B3 — Asymmetric push

Move from 50/50 splits to **30/70 or 25/75** when the dominant column has a strong visual anchor (large image, dark colour block, or bold display numeral). The light column with constrained copy creates dramatic tension.

```js
row({ ... }, [
  column({ flexType: '6_24' }, [  // 25% — light side, constrained text
    eyebrow(...),
    heading({ level: 'h2', ... }),
    text(...),
  ]),
  column({ flexType: '18_24' }, [  // 75% — heavy side, image or accent block
    image({ ... }),
  ])
])
```

Phone: both columns become `24_24`.

### B4 — Display numeral as texture

A giant number (180–280px) as background typographic texture behind a stat or section title.
Low opacity (0.05–0.08) so it reads as depth, not content. Achievable via `customCss` on a heading
module positioned absolutely, or as a `text()` module styled as decoration.

```js
// In the section's customCss or via a positioned text module:
// Font-size: 220px, opacity: 0.06, position: absolute, top: 0, right: 40px, color: currentColor
// Use the section heading colour so it works on both dark and light backgrounds
```

This works best in stats strips and "years of experience" or "projects completed" sections. One per
page — two makes it a pattern, three makes it noise.

### B5 — Weight contrast jump

Standard page: headings at 700 (Bold). Bolder page: h1 at 800–900 (ExtraBold / Black), h2 stays at
700. The *jump* communicates hierarchy without needing more size.

Most Google Fonts support 800+ when loaded correctly. Load the weight explicitly:

```js
// In builder font config — request the 900 weight
fontWeight: '900'
```

Subtext after a 900-weight h1 at 400 regular creates maximum contrast.

---

## Bolder pre-flight (extra check before taste.md §14)

- [ ] VARIANCE is 8+ in the design read — bolder is activated intentionally, not by default
- [ ] H1 is at minimum 80px (if B1 activated)
- [ ] Accent section exists and uses the established accent, not a new colour (if B2 activated)
- [ ] Asymmetric split is 30/70 or tighter, with a strong anchor on the wide side (if B3 activated)
- [ ] Display numeral is max one instance, opacity 0.05–0.08 (if B4 activated)
- [ ] Weight jump: h1 at 800+, h2 at 700, body at 400 (if B5 activated)
- [ ] No more than 3 bolder moves active on a single page — stacking all five reads as chaos

---

*Activate bolder when the brief earns it. Skip it when it doesn't. A well-executed restrained page
is better than an aggressive one applied to the wrong brief.*
