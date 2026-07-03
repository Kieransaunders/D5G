# Overdrive — Maximum-Energy Composition for Divi 5

> Overdrive is the combination of Bolder + Delight pushed to their ceiling, held together by a
> deliberate composition rhythm. It is not "make everything big and animated" — it is a specific
> section-flow strategy that creates maximum visual energy while remaining coherent.
>
> **Prerequisite:** the brief must call for creative agency, high-impact launch, premium editorial,
> or fashion/luxury energy. Overdrive applied to a trust-first or regulated-industry brief is a
> tone error. Always confirm in the design read before activating.

---

## Dial settings for overdrive

| Dial | Overdrive value | Divi lever |
|------|----------------|------------|
| VARIANCE | 9 | 25/75 splits, bento with wild cell sizes, full-bleed images |
| MOTION | 7 (8 with DiviTheatre) | hero-reveal + stagger + magnetize minimum three presets |
| DENSITY | 3 | airy padding (8–9em hero, 7em sections), constrained text maxWidth |

---

## Typography at overdrive

| Role | Overdrive size | Notes |
|------|---------------|-------|
| Hero h1 | 88–120px | `clamp(64px, 8vw, 120px)`, tracking `-0.04em`, line-height `1.0` |
| Manifesto h2 | 60–72px | Max one per page — the section that earns this scale |
| Pull quote | 36–44px | Weight 400–500, italic, centred, maxWidth 700px |
| Standard h2 | 40–44px | All other sections — hold this exactly |
| Body | 18px | Slightly up from standard 16px — more breathing room at high VARIANCE |
| Eyebrows | Max 2 per page | Hero + one other. Never above every h2 |

The ratio between 120px h1 and 18px body *is* the design. Do not soften it.

---

## The overdrive section flow

This is the canonical arc. Swap individual families but preserve the rhythm of
**tension → statement → breathing room → proof → tension → landing**.

```
1. HERO          — full-bleed dark, hero-reveal animation, h1 at 88px+, real photography
2. ACCENT STRIP  — accent background stats section, animated counters (the unexpected colour beat)
3. BENTO GRID    — asymmetric features, one cell spans 2 columns, imagery-led tiles
4. BREATHING RM  — single pull quote, white/light BG, 9em padding, stripped back
5. SPLIT 30/70   — deep narrative, photo-heavy side, body copy constrained to 480px
6. GALLERY       — marquee or spotlight image grid, section header left-aligned, real product/lifestyle shots
7. CTA BAND      — full-bleed photo + dark overlay, pill button, h2 ≤ 8 words
8. FOOTER        — dark anchor, large wordmark, 3 link columns
```

The accent strip (position 2) is the unexpected colour beat. The breathing room (position 4) is
the relief after density. The gallery (position 6) is the delight moment before the close.
Never move the breathing room to the last third — it loses its tension-release function.

---

## Image-to-text ratio

On an overdrive page, **≥ 50% of sections must lead with imagery**. Count: hero (image), bento
(images), split (image), gallery (all images), CTA band (background image). If the count falls
below 50%, the page will feel text-heavy regardless of how large the typography is. Add or upgrade
image coverage rather than compensating with decorative elements.

Photography carries the colour palette, the atmosphere, and the brand personality. Never fake it
with icon blurb grids, flat colour blocks, or generated SVG art on an overdrive page.

---

## Per-preset overdrive state

### Organic Tech (A) — overdrive
Deep forest green `#2E4036` hero (full-bleed), clay accent strip with white counters, botanical
full-bleed photography in the split and gallery sections. H1 at 96px, Plus Jakarta Sans 900.
Manifesto h2 in Cormorant Garamond Italic 64px (the one place the drama serif is earned — manifesto
of the brand's ethos). Footer: charcoal with ivory wordmark.

### Midnight Luxe (B) — overdrive
All-dark composition — Obsidian hero, Slate features, dark footer. Champagne gold used only on the
pull quote and the primary CTA, not for a whole accent section. H1 at 104px, Inter Black, tracking
`-0.05em`. Manifesto section: one 44px italic pull quote in ivory, centred on obsidian, nothing
else in the section. The restraint IS the luxury signal.

### Brutalist Signal (C) — overdrive
Red section as the accent strip (not a band — a full content section). H1 at 120px, Space Grotesk
800, no tracking adjustment (the raw default tracking is part of the character). No rounded corners
anywhere — shape lock is sharp (0px). Stats in the accent section in pure black on signal red.
Full-page colour rhythm: Paper → Red → White → Paper → Black. The palette feels like a poster,
not a website.

### Vapor Clinic (D) — overdrive
Motion-maximum: every above-the-fold element uses DiviTheatre. Plasma sections with plasma-on-dark
neon accents are earned here (this is the one preset where the AI-purple is justified). Bento grid
with Plasma hover borders on image cells. H1 at 88px, Sora 800. One "void section" — pure
`#0A0A14` with a single line of body text at 20px and nothing else — before the CTA band.

### Minimal Editorial (E) — overdrive
Typography IS the design. H1 at 120px, Outfit 800, nearly full-viewport width. Body text at 20px
with 1.9 line-height. Photography is sparse but exquisite — one full-bleed image per three sections.
Accent (`#dc2626` or brand equivalent) used only for primary CTAs and the one accent strip.
No bento grid — prefer a full-bleed stagger: three images in a 3-column row with nothing above them
(header below). Feels like a Kinfolk editorial shot through a typographic lens.

---

## Overdrive pre-flight (in addition to taste.md §14 and bolder.md + delight.md checks)

- [ ] Design read confirmed: brief earns overdrive energy (agency/creative/launch/luxury)
- [ ] Dials set: VARIANCE 9, MOTION 7–8, DENSITY 3
- [ ] Hero h1 ≥ 88px with real full-bleed or dark backing
- [ ] Image-to-text ratio ≥ 50% across all sections
- [ ] Accent strip (unexpected colour beat) exists at 40–60% through the page
- [ ] Breathing room moment exists after the densest section
- [ ] Minimum 3 DiviTheatre presets OR Divi-native: counters + entrance animations + accordion
- [ ] Per-preset overdrive state applied — the preset is pushed, not just referenced
- [ ] ≥ 4 different layout families (bento counts, gallery counts, split counts, full-width counts)
- [ ] No 3 consecutive same-family sections
- [ ] Taste pre-flight (taste.md §14) passes — overdrive ≠ ignoring anti-slop rules

---

*Overdrive is a composition choice, not a volume dial. Maximum energy comes from deliberate
contrast — tension sections paired with breathing room — not from making everything larger.*
