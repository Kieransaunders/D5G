# Divi 5 Module Attribute Reference

For attribute overrides the builder helpers don't expose directly — pass via the `attrs:` option, which deep-merges into the generated attributes.

## Heading level (SEO-critical)

Lives inside the font value (confirmed against the official Divi 5 Design System exports):

```json
"title": { "decoration": { "font": { "font": { "desktop": { "value": { "headingLevel": "h2", "size": "38px" } } } } } }
```

The builder's `heading({ level })` sets this. Default in Divi is h2 — which is why explicit levels are mandatory (otherwise pages ship without an h1).

## Responsive breakpoints

`desktop` (required baseline), `tabletWide`, `tablet`, `phoneWide`, `phone`. Only include breakpoints that differ from desktop. The builder's `dv(value, { phone: {...} })` helper builds these.

## Row layout

- `flexColumnStructure`: `equal-columns_1/2/3/4`, `offset-columns_2` (first smaller), `offset-columns_6` (second smaller), `css-grid-grids_2`
- Grid alternative: `layout.desktop.value = { display: "grid", gridColumnCount: "3", gridColumnWidths: "equal", columnGap, rowGap }` with `tablet: { gridColumnCount: "1" }`

## Column flexType (fraction of 24)

`24_24` full, `18_24` 75%, `16_24` 66%, `12_24` 50%, `8_24` 33%, `6_24` 25%, `3_5` 60%, `2_5` 40%.

## Background beyond flat colour

```json
"background": { "desktop": { "value": {
  "color": "#1a1a2e",
  "gradient": { "stops": [...], "enabled": "on" },
  "image": { "url": "...", "size": "cover", "position": "center" }
} } }
```

## Sticky/fixed, z-index, overflow

`module.decoration.position`, `.zIndex`, `.overflow` — same `dv()` shape. Check `Divi/includes/builder-5/visual-builder/packages/module-library/src/components/<module>/module.json` for any module's full attribute schema.

## Global colour variable syntax

Unescaped form (what you write in JS — serialisation handles escaping):

```
$variable({"type":"color","value":{"name":"gcid-accent","settings":{}}})$
```

With opacity: `"settings":{"opacity":10}`. Defined in `global_colors` as `["gcid-slug", {"color":"#hex","status":"active","label":"Name"}]`.

## FontAwesome icon unicodes (common)

Lightning `&#xf0e7;` Star `&#xf005;` Check-circle `&#xf058;` Cog `&#xf013;` Rocket `&#xf135;` Shield `&#xf3ed;` Chart `&#xf201;` Users `&#xf0c0;` Clock `&#xf017;` Globe `&#xf0ac;` Envelope `&#xf0e0;` Phone `&#xf095;` Map-pin `&#xf3c5;` Quote `&#xf10d;` Arrow-right `&#xf061;` Lightbulb `&#xf0eb;` Laptop-code `&#xf5fc;` Handshake `&#xf2b5;` Trophy `&#xf091;` Briefcase `&#xf0b1;` Chart-bar `&#xf080;` Coins `&#xf51e;` Key `&#xf084;` Leaf `&#xf06c;` Lock `&#xf023;` Magic `&#xf0d0;` Paper-plane `&#xf1d8;` Seedling `&#xf4d8;` Target `&#xf05b;` Thumbs-up `&#xf164;` Wrench `&#xf0ad;`

## Module catalogue (37)

**Structural:** section, row, column, group, group-carousel, placeholder
**Text/content:** text, heading, blurb, icon, icon-list, icon-list-item, divider
**Media:** image, video, video-slider, video-slider-item, slider, slide
**Interactive:** button, accordion, accordion-item, toggle, contact-form, contact-field, signup, login, search
**Specialised:** pricing-tables, pricing-table, number-counter, countdown-timer, map, map-pin, menu
**Social:** social-media-follow, social-media-follow-network

Container-child pairings (enforced by validator): accordion→accordion-item, icon-list→icon-list-item, pricing-tables→pricing-table, slider→slide, video-slider→video-slider-item, contact-form→contact-field, social-media-follow→-network.

## HTML workarounds (inside divi/text innerContent)

WordPress passes `<table>`, `<tr>`, `<td>` and their inline `style` attrs through sanitisation unchanged — use table structure for layouts the builder can't handle cleanly.

**Card with border/shadow:**
```html
<table style="width:100%;border:1px solid #e0e0e0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);padding:24px;">
  <tr><td>Content here</td></tr>
</table>
```

**Logo bar — white conversion without separate files:**
```html
<table style="width:100%;"><tr>
  <td><img src="logo.png" style="filter:brightness(0) invert(1);height:40px;"></td>
  <!-- repeat per logo -->
</tr></table>
```

**Inline SVG icon (survives sanitisation):**
```html
<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
</svg>
```

**Full-bleed background fallback** (when SSR doesn't render section backgrounds):
```html
<!-- inside a full-width row with maxWidth:100% and zero padding -->
<div style="background:linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)),url(image.jpg) center/cover no-repeat;padding:80px 40px;">
  Content here
</div>
```

Use these only when native Divi attrs fail — they're invisible to the Visual Builder's design panel.

## Known SSR / JSON limitations

**Testimonial module — author/jobTitle fields ignored by SSR.**
Only `innerContent` renders. Put attribution inline as plain text:
```
"Great product." — Jane Smith, Head of Marketing
```
Do not use unicode-encoded HTML tags inside `innerContent` — they render literally.

**Section background images unreliable via JSON attrs.**
Use the inline CSS workaround in the HTML workarounds section above instead. Always set a fallback solid background color on the section so the layout doesn't collapse if the image fails.

**Box shadow hover on columns — not natively supported.**
Use `customCss.main` with a CSS transition rule as the workaround.

**CSS specificity is unusually deep.**
Generic selectors lose. When targeting via `customCss`, use full specificity chains or `!important`.
