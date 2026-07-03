# DiviTheatre Motion Presets (Optional)

> DiviTheatre is a separate WordPress plugin that adds Theatre.js-powered cinematic animations
> and CSS/WebGL effects to Divi 5. The landing-page generator supports it as an OPTIONAL motion
> layer. The user MUST be asked before any `data-theatre` attributes are emitted. Never add motion
> without consent.
>
> Repository: ask the user for the download/install URL when they say they want DiviTheatre.

---

## Consent gate (mandatory)

Before generating any `data-theatre` attributes, ask the user:

> **"Do you have DiviTheatre installed? It adds cinematic animations and effects (blur-in, stagger,
> marquee, spotlight, hero-reveal…) to any Divi 5 element. Options: Yes (I'll add motion), No but I
> want it (I'll note where to get it), No (static page only)."**

- **Yes:** read this file, map the MOTION dial to presets, emit `data-theatre` attributes via
  `D.theatreAttrs()` or the `theatre:` / `theatreOpts:` shortcut on any module function.
- **No but I want it:** generate a static page. In the delivery summary, note:
  *"This page is static. To add cinematic motion, install DiviTheatre and add data-theatre
  attributes to these elements: [list]."*
- **No:** static only. Never emit `data-theatre`.

---

## Preset categories

Presets fall into four categories that affect how the engine handles them:

| Category | Driven by | `selfManaged` | Trigger options apply |
|---|---|---|---|
| `element` | Theatre.js keyframe sequence | no | yes — `onScroll`, `onLoad`, `onClick`, `delay`, `duration` |
| `scene` | Theatre.js + self-managed | yes | no (manages own triggers) |
| `pin` | Scroll-scrubbed Theatre.js | yes | no — `distance` only |
| `effect` | CSS / WebGL (no Theatre.js) | yes | no |

**`effect` presets** are self-managed CSS or WebGL effects. They have no Theatre.js keyframe state. `data-theatre-duration` and `data-theatre-delay` do not apply to them. Use them for ambient and interactive visual polish that runs independently of the entrance-animation system.

---

## Preset catalogue

### Entrance animations (`element` / `scene` / `pin`)

| Preset | Category | What it does | Best on |
|---|---|---|---|
| `blur-in` | `element` | Fade in (opacity 0→1) + blur filter resolve (8px→0) over 0.8s | Text modules, headings, blurbs |
| `fade-right` | `element` | Fade in + slide from right | Images, columns |
| `stagger` | `element` | Each direct child fades up, 100 ms offset | Rows with multiple columns, feature grids |
| `hero-reveal` | `scene` | Choreographed: bg fade, headline, sub-text, CTA in sequence | Hero sections |
| `product-reveal` | `pin` | Section pins while a media element scales; content panels reveal in sequence, scrubbed by scroll (Apple-product-page style) | Whole section with one media + 2–3 panels |

### Effects (`effect` — CSS/WebGL, no Theatre.js)

| Preset | What it does | Best on |
|---|---|---|
| `aurora` | Animated multi-gradient background drifts slowly behind content (Aceternity aurora style) | Hero sections, dark-bg sections |
| `depth-stack` | Direct children scroll at different Y rates, creating a parallax depth illusion | Rows with layered content |
| `lamp` | Conic light beam fans down from the top of the element, reveals on scroll (Aceternity lamp style) | Hero sections |
| `liquid-effect` | WebGL shallow-water ripple on a background image; pointer creates ripples with chromatic aberration + specular glint. **Requires Three.js bundle.** | Hero sections, image-heavy sections |
| `magnetize` | Particles scatter around the element and snap to centre on hover (21st.dev magnetic button style) | CTAs, buttons, cards |
| `marquee` | Infinite seamless horizontal scroll strip of cards/images with soft edge fade. Smart drill-down handles Divi's section→row→column nesting. | Image galleries, logo strips, client grids |
| `mask-reveal` | SVG mask tiles or blinds progressively uncover the element on scroll. Pattern: `grid` or `blinds`. Graceful-degrades when `mask` CSS is unsupported. | Sections, images, feature blocks |
| `particle-field` | WebGL floating particle field injected behind content; pointer scatters particles and they spring back. **Requires Three.js bundle.** | Hero sections, dark-bg panels |
| `spotlight` | Radial glow tracks the cursor (Aceternity SpotlightCard style) | Cards, modules, CTAs |
| `text-line-stagger` | Block-level text elements (h1–h6, p, li) inside the container slide up and fade in 60 ms apart. Apple-style easing. | Text modules, heading + body combos |

---

## Trigger options (entrance presets only)

Applies to `element` category presets only. `scene`, `pin`, and `effect` presets manage their own triggers.

| Option | Value | Description |
|---|---|---|
| `trigger` | `onScroll` (default) | Play when element enters viewport (IntersectionObserver, threshold 0.15) |
| `trigger` | `onLoad` | Play on page load |
| `trigger` | `onClick` | Play when element is clicked (once) |
| `delay` | milliseconds | Delay before animation starts |
| `duration` | milliseconds | Override preset duration |
| `mobile` | `true` | Override the <768px mobile skip (use sparingly) |

---

## Pinned scene (`product-reveal`)

Tag a **whole section** with `data-theatre="pin:product-reveal"` (the `pin:` prefix is the canonical builder/validator form; the engine also resolves the bare name). The section pins while a composed timeline scrubs forward on scroll; scrolling back reverses it. Mark children by role:

| Attribute | On | Purpose |
|---|---|---|
| `data-theatre="pin:product-reveal"` | the section | declares the pinned scene |
| `data-theatre-distance` | the same section | runway length (default `150vh`; vh only, e.g. `200vh`) |
| `data-theatre-part="media"` | one child | the element that holds + scales |
| `data-theatre-part="panel"` | 2–3 children | content blocks that reveal in sequence |

Panels are capped at 3. Mobile (≤768px) and `prefers-reduced-motion` skip the pin — the section jumps to its end state. **Never nest inside an `overflow:hidden` ancestor** — sticky positioning requires a clean ancestor chain.

```javascript
D.section({ adminLabel: 'Product reveal', theatre: 'pin:product-reveal', theatreOpts: { distance: '200vh' } }, [
  D.row({ structure: 'equal-columns_1' }, [
    D.column({}, [
      D.image({ src: '...', alt: 'Product', theatrePart: 'media' }),
      D.text({ html: '<h2>Panel one</h2>',  theatrePart: 'panel' }),
      D.text({ html: '<p>Panel two</p>',    theatrePart: 'panel' }),
      D.text({ html: '<p>Panel three</p>',  theatrePart: 'panel' }),
    ]),
  ]),
]);
```

Never combine Divi's native `decoration.sticky` on the same element as `product-reveal` — two pinning systems fight. The validator FAILs on this.

---

## MOTION dial mapping

The taste layer (`taste.md`) sets a MOTION dial (1–10). When DiviTheatre is installed, map it to presets:

| MOTION dial | Recommended presets |
|---|---|
| 1 to 3 (static) | None. Ship clean static layout. |
| 4 to 5 (subtle) | `blur-in` on headings, `fade-right` on images |
| 6 to 7 (fluid) | `blur-in` + `stagger` on rows, `text-line-stagger` on text modules, `spotlight` on cards, `magnetize` on primary CTA |
| 8 to 10 (cinematic) | `hero-reveal` on hero, `stagger` on feature rows, `marquee` on image strips, `aurora` or `lamp` on dark-bg hero, `spotlight` or `mask-reveal` on key sections |

**Pinned scene (`product-reveal`)** sits at the very top of the dial — only offer at **MOTION ≥ 7**, and only when there's a genuine product/feature reveal to choreograph. At most one per page; never on trust-first or content-dense pages. Mobile-disabled by design.

**`effect` presets** are ambient/interactive — layer on top of entrance animations or stand alone. Don't pile multiple effects on the same element.

**WebGL effects** (`particle-field`, `liquid-effect`) require the Three.js bundle — only emit them if the user confirms it's loaded, or you know they have the full DiviTheatre install.

**Rule:** motion must be motivated (taste.md). Each animation should communicate hierarchy, storytelling, feedback, or state transition. If you cannot justify it in one sentence, drop it.

---

## Builder usage

```javascript
const D = require('./scripts/divi-builder');

// Entrance animation — inline shortcut
D.heading({ text: 'Headline', level: 'h2', theatre: 'blur-in', theatreOpts: { trigger: 'onScroll', delay: 200 } });
D.section({ adminLabel: 'Features', theatre: 'stagger' }, [ ...rows ]);
D.section({ adminLabel: 'Hero', theatre: 'hero-reveal', theatreOpts: { trigger: 'onLoad' } }, [ ...rows ]);

// Effect — inline shortcut (no trigger opts needed)
D.section({ adminLabel: 'Hero', theatre: 'aurora' }, [ ...rows ]);
D.button({ text: 'Get Started', url: '#', theatre: 'magnetize' });
D.section({ adminLabel: 'Gallery', theatre: 'marquee' }, [ ...rows ]);
D.module({ theatre: 'spotlight' }, [ ...content ]);

// Explicit attrs (when you need more control)
D.text({ html: '<p>Body</p>', attrs: D.theatreAttrs('text-line-stagger') });
```

Both produce the same `module.decoration.attributes.desktop.value.attributes` structure that Divi 5 renders as HTML data attributes on the module wrapper. (Not `module.advanced.attributes` — that path renders nothing.)

---

## Safety guarantees (handled by DiviTheatre engine)

- **Reduced motion:** all presets jump to final visible state when `prefers-reduced-motion: reduce` matches. No element is left hidden.
- **Mobile:** entrance presets skip on viewports <768px (elements jump to final state). Override per-element with `data-theatre-mobile="true"`. `effect` presets run on all viewports unless they internally opt out.
- **Performance:** WebGL and scroll-driven effects use IntersectionObserver-gated rAF — idle while off-screen, torn down on `pagehide`.
- **Divi conflict:** the engine strips Divi's `et_pb_animation` classes before Theatre.js writes styles.
