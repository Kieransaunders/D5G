# Delight — Moments of Joy and Surprise in Divi 5

> Delight is not decoration. It is the feeling a user gets when something behaves slightly better
> than expected — a counter that animates, a gallery that grows on hover, a section that arrives
> with purpose. Each delight moment should be **earned by context** and **invisible unless noticed**.
> Never add delight for its own sake. A static, well-composed page beats a janky animated one.

---

## Inventory: choose what fits, not all at once

A page should have **2–4 delight moments**, not more. Pick from the categories below based on
what the brief and the section content naturally support.

---

## 1. DiviTheatre delights (requires user confirmation — see divi-theatre.md)

Only add `data-theatre` attributes when the user has confirmed DiviTheatre is installed. If they
said "No" or "No but I want it" in the motion question, skip to §2.

### Hero choreography
The single highest-impact delight moment. Elements enter sequentially — eyebrow, then headline,
then body, then CTAs — creating a staged reveal that feels cinematic.

```
data-theatre="hero-reveal"
```

Apply to the hero section or hero row. The preset handles staggered timing internally. Duration ~2s
total. This is the #1 delight moment when DiviTheatre is available.

### Feature stagger
Columns in a features row reveal left-to-right rather than appearing all at once. Works best on
3-column grids and bento layouts.

```
data-theatre="stagger"
```

Apply to the row containing the feature columns. Each column fades up with a 120ms stagger.

### Gallery hover growth
Image cells in a gallery or portfolio section scale slightly on hover, with a subtle shadow increase.
Creates the feeling of a responsive, alive page.

```
data-theatre="hover-grow"
```

Apply to each image column or the image module inside a bento grid cell. Scale: 1.03. Do not apply
to text-heavy cards — only image cells where the growth reads as "lift".

### Scroll parallax
Hero background image moves at 40% of scroll speed, creating depth without JavaScript tricks.
Requires a background image set on the section.

```
data-theatre="parallax-scroll"
```

Apply to the hero section. Use a strong, high-contrast image — parallax on a flat-colour section
is invisible.

### Fade-up entrance
A step up from Divi's built-in fade — higher fidelity easing and exact Y-offset control.
Apply to key call-to-action sections, testimonial cards, or a pull quote block.

```
data-theatre="fade-up"
```

---

## 2. Divi-native delights (no DiviTheatre required)

### Animated number counters
The `number-counter` module counts from 0 to the final value when scrolled into view. Use in
stats strips with 3–4 metrics. Numbers should be real (from the brief) or plausibly organic
(not `99.99%`, `100%`, `50%` — the fake-perfect tells from taste.md §10.B).

```js
D.block('divi/number-counter', {
  module: {
    meta: { title: { desktop: { value: '2,847' } } },
    // ...counter config via preset
  }
}, null)
```

Pair with a 1-2 word label below the number. The animation itself is the delight.

### Accordion FAQ
Collapsed accordion instead of a static list of Q+A pairs. The user clicks to reveal — each click
is a small discovery moment. Also reduces visual density.

Use `D.block('divi/accordion', ...)` via the module-reference. Set to single-open so only one
answer shows at a time.

### Section entrance animations (Divi built-in)
Apply Divi's animation presets (`animation: 'fade'`, `animationDirection: 'bottom'`, `animationDelay: '100ms'`)
to key sections. Not as polished as DiviTheatre but achieves a soft reveal without additional plugins.

Use sparingly — max 3–4 sections. If everything animates, nothing feels special.

### Hover card lift
Apply a Divi hover state to cards: background slightly darkens, box-shadow appears. Creates a tactile
feel without motion.

```js
// In the column or section preset, set hover overrides:
// hoverDecoration: { background: { color: '#F0F0F0' }, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }
```

---

## 3. Layout delight moments

These create surprise through composition, not animation.

### The unexpected colour beat
One mid-page section (not the CTA band) uses the accent as a full section background. It breaks
the light/dark alternation rhythm deliberately — the contrast creates a visual jolt. Use it for
stats, a manifesto quote, or a key proof point. See bolder.md B2 for implementation.

Positioned best at 40–60% through the page — after the features section, before testimonials.
Never as the first or last content section.

### The breathing room moment
A stripped-back section immediately after the most content-dense section on the page. Typically
a single large pull quote or a 2-line manifesto statement, centred, no eyebrow, constrained
maxWidth ~700px, generous padding (8–10em top/bottom). Creates relief — and makes the next section
hit harder.

```js
section({ background: { color: '#FFFFFF' }, padding: { top: '9em', bottom: '9em' } }, [
  row({ maxWidth: '740px' }, [
    column({ flexType: '24_24', alignment: 'center' }, [
      heading({ level: 'h2',
        text: 'The work you do matters. The way you present it matters more.',
        preset: P.pullQuote  // 40–48px, weight 500, italic or light, centred
      })
    ])
  ])
])
```

### Gallery-first reveal
A gallery section where the images are visible immediately but the section header scrolls in
from below. First impression is pure imagery — copy arrives as confirmation, not preamble.

Structure: Row with the header BELOW the image row (reversed DOM), or use a sticky header that
appears after the gallery scrolls past. Works best for portfolio and product sections.

---

## Delight pre-flight

- [ ] 2–4 delight moments chosen — not every category, not one per section
- [ ] DiviTheatre presets only present if user confirmed DiviTheatre is installed
- [ ] Every animated element has a `jumpToEnd` / static fallback for reduced-motion (DiviTheatre handles this automatically)
- [ ] Accordion used for FAQ if ≥ 5 questions (collapsed = delight; long open list = data-dump)
- [ ] Number counters use organic, non-round numbers (never `100%`, `50%`, `99.99%`)
- [ ] The breathing room moment exists if the page has ≥ 6 sections
- [ ] Hover states on image grids, not text cards
- [ ] No more than 3 Divi built-in section entrance animations

---

*Delight at its best is invisible. The user just feels like the page is alive.*
