# Polish — The Finishing Pass

> Polish runs after the page is generated and taste-checked, before delivery. It is a consistency
> audit — not a redesign. Every item below should take seconds to verify or fix. If a fix requires
> structural changes, that is a Stage 3 issue, not a polish issue.
>
> The distinction between "good" and "impeccable" is almost always in the polish pass.

---

## 1. Spacing rhythm lock

Every section padding on the page should fall into one of three values. If padding drifts, it reads
as unresolved rather than intentional.

| Section type | Desktop | Phone |
|-------------|---------|-------|
| Hero | 8em top / 8em bottom | 4.5em |
| Content sections | 6em or 7em — pick one, apply universally | 3.5–4em |
| CTA band | 5em | 3em |
| Footer | 4em | 3em |
| Card internal padding | 2em | 1.5em |

**Check:** open the generator script and verify that every section uses one of the values above.
No `6.5em`, no `7.2em`, no `5.5em` unless explicitly justified.

---

## 2. Typography consistency pass

### Headings
All h2s should be the same size. Pick 40px or 44px and hold it across every section. A h2 that is
40px in the features section and 44px in the testimonials section is a drift — pick one.

All eyebrows: exactly the same size (12px), tracking (2.5px), colour (always the accent), transform
(uppercase). No exceptions.

### Body text
Same size throughout (16px or 18px — pick one for the page). Same line-height (1.75 or 1.8).
Same colour per background type: `#444444` on light, `#CCCCCC` on dark.

### Buttons
Same weight (600), same size (15px or 16px), consistent padding on both primary and ghost variants.
The ghost button padding must produce the same visual height as the primary button.

---

## 3. Colour precision

Open the global colours array in the generator. Every section background, text colour, and accent
reference should trace back to one of the globalColor entries. No stray rgba one-offs or
hardcoded hex strings that don't match the palette.

Run the spot-check mentally:
- Section backgrounds: all from the palette? (white, light gray, dark, accent — those four only)
- Body text: exactly `#444444` on light, `#CCCCCC` on dark, never `#555` or `#CCC` or `#aaa`
- Accent: appears in eyebrows, primary buttons, and the accent section only — nowhere else

**Shape lock:** all border-radius values should be identical for the same component type across the
page. If buttons are pill (`999px`), every button is `999px`. If cards are `16px`, every card is
`16px`. Check: buttons, cards, inputs (if any), image containers.

---

## 4. Image treatment consistency

Within a section type, images should share the same aspect ratio and treatment:

- Gallery/bento images: all portrait 4:5, or all landscape 3:2 — never mixed
- Split section images: same crop orientation on all split sections
- Background images: consistent overlay opacity if used (e.g. always `55%` black overlay, not `40%` on one and `65%` on another)
- All images have descriptive alt text — run a scan

---

## 5. Motion coherence

- All DiviTheatre presets on the page should use the **same trigger type** (all `scroll` or all
  `onLoad`) unless there is a deliberate reason for mixing
- All Divi built-in animations: same easing (`ease-in-out`), duration family (0.6–0.8s)
- **Not every element should animate.** If more than 5 sections have entrance animations, it stops
  feeling special. Reduce to the 3–4 highest-impact moments

---

## 6. Copy final scan

Read every visible string one more time. This pass catches what the taste-check script misses:

- Headlines: reads like a human wrote it, not "Elevate Your Business with Our Seamless Solution"
- Button labels: maximum 4 words, ideally 1–2. Primary CTA is one consistent phrase across hero,
  section CTAs, and navigation link
- Eyebrows: ALL-CAPS, no periods, no punctuation inside the label
- Body: no filler verbs ("leverage", "seamless", "next-gen", "unleash"), no fake precision
- Verify zero em-dashes (`—`) and en-dash separators (`–`) — the validator catches these, but this
  is the human confirmation

---

## 7. Contrast spot-check

| Text situation | Minimum ratio |
|----------------|--------------|
| Body text on section background | 4.5:1 (WCAG AA) |
| Button text on button fill | 4.5:1 |
| Eyebrow on section background | 4.5:1 (small text) |
| Large heading (≥ 24px, bold) | 3:1 (WCAG AA large text) |
| Ghost button text | 4.5:1 on the section BG behind the button |

Quick reference: white (`#FFFFFF`) on `#444444` body = 9.7:1 ✓. `#CCCCCC` on `#0D0D12` = 11.4:1 ✓.
Accent on white — **check this** — a mid-tone accent may fail at small text sizes.

---

## Polish pre-flight checklist

Run this after taste.md §14 passes. Polish confirms the details that taste checks miss.

- [ ] **Spacing:** every section padding is on one of the three rhythm values (no drift)
- [ ] **h2 size:** all h2s are the same pixel size across the page
- [ ] **Eyebrows:** all same size / tracking / colour / case — zero exceptions
- [ ] **Body:** same size and line-height per background type throughout
- [ ] **Colour:** no stray hex values outside the palette; shape lock consistent
- [ ] **Images:** same aspect ratio within section type; consistent overlay opacity
- [ ] **Motion:** ≤ 5 animated elements; consistent trigger and easing family
- [ ] **Copy:** no filler verbs or fake precision; button labels ≤ 4 words; zero em-dashes confirmed
- [ ] **Contrast:** body, buttons, eyebrows all at WCAG AA minimum

When every box is checked, the page is done.

---

*Polish is not optional. It is the difference between a page that is technically correct and one
that reads as professionally finished. Budget 10 minutes. It will feel like a different page.*
