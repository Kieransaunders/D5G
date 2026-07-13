---
name: divi5-theme-builder
description: >
  Build Divi 5 Theme Builder templates (header/body/footer layouts scoped by
  post type or taxonomy) with dynamic-content bindings — the record/detail
  pages, archive layouts, and site-wide templates that divi5-page-generator's
  single-page output can't produce. Use this whenever the task involves a Divi
  Theme Builder template, a "detail page" or "single record page" for a custom
  post type, binding native Divi modules (Text/Image/Heading) to post meta or
  custom fields via Divi's dynamic content ($variable), scoping a layout to
  "all posts of type X" or "records in taxonomy term Y", or programmatically
  installing a TB template from a plugin. Trigger even when the user doesn't say
  "Theme Builder" — e.g. "make a detail page for my CPT", "template that shows
  each record's fields", "dynamic single page in Divi", "install a Divi template
  from my plugin", "why is my $variable showing blank on the page".
---

# Divi 5 Theme Builder templates

`divi5-page-generator` builds one **page** (a `post`/`page` with builder content).
A **Theme Builder template** is different: it renders across *many* URLs — every
post of a type, every record in a taxonomy term — and its modules bind to each
item's own data via dynamic content. Detail/record pages, archive layouts, and
global headers/footers all live here.

This skill covers: the template data model, `use_on` scoping, dynamic-content
binding, the resolution rules that decide whether `$variable(...)` shows real
data or blank, and two build paths (author JSON for manual import, or install
programmatically from PHP).

## When you need this vs a plain page

| Goal | Tool |
|---|---|
| One landing/marketing page | `divi5-page-generator` |
| The same layout for **every** record/post of a type | TB **body** template, scoped `singular:post_type:X` |
| A layout for records in **one group** (taxonomy term) | TB body template, scoped `singular:taxonomy:TAX:term:id:N` |
| Global header/footer | TB header/footer template |
| Archive/index of a CPT | TB body template on an archive condition |

## Data model (verified, Divi 5.x)

A TB template is **two posts** plus a registry entry:

- `et_template` post — the template. Its scope lives in **`_et_use_on`** meta:
  a *flat string, one meta row per condition* (never a serialized array).
  It points at a body layout via `_et_body_layout_id`.
- `et_body_layout` post — holds the actual block markup in `post_content`, with
  `_et_pb_use_builder=on` and `_et_pb_use_divi_5=on`.
- **Registry**: the template id must be listed in the site's live Theme Builder
  post (`_et_template` meta, multi-value). Divi only surfaces/applies templates
  in that registry — per-template meta alone is invisible.

The Divi UI's **export** format wraps all this as
`{"context":"et_theme_builder","templates":[{use_on, layouts:{body:{id}}}],"layouts":{...}}`.
That JSON is the canonical, importable shape — mirror it when authoring by hand.

## `use_on` scoping — the load-bearing decision

```
singular:post_type:airloop_record:all              → every record detail page
singular:taxonomy:airloop_connection:term:id:60     → only records in term 60
```

Taxonomy scoping is not just narrower — it **changes what the Visual Builder can
preview** (see resolution rules below). If you want per-group templates *or* live
data in the builder while designing, scope by taxonomy term, not `:all`.

## Dynamic content binding

Bind a module to a field by putting a `$variable` token in the module's content
value. The token is a plain string embedded in the block attribute:

```
$variable({"type":"content","value":{"name":"<META_KEY>","settings":{"before":"","after":""}}})$
```

Module attribute paths differ per module (getting these wrong renders an empty
container with no error) — see **references/dynamic-content-bindings.md** for the
full catalogue. The essentials:

| Module | Attribute path holding the value |
|---|---|
| Text | `content.innerContent.desktop.value` (wrap in `<p>…</p>`) |
| Heading | `title.innerContent.desktop.value` (NOT `content`) |
| Image | `image.innerContent.desktop.value.src` (+ `.alt`) |

## Resolution rules — why `$variable` shows blank or real data

This is the part that wastes the most time. Read
**references/dynamic-content-bindings.md** for the full model; the load-bearing
facts:

- **Plain field bindings** (`name: "_meta_key"`) resolve against the *current
  post* on any `singular:*` template. They render correctly **on the frontend**
  for the viewed record, and preview live **in the VB** when the template is
  **taxonomy-term-scoped** (the builder has a concrete record set to sample).
  This is the simplest path for a detail page — no loop required.
- **The "only works in a loop" belief is false for single-record pages.** A loop
  (`module.advanced.loop`) is only needed to repeat a design over *many* items on
  one page (a grid/archive). A detail page shows *one* record — plain bindings on
  a `singular:*` template are correct and simpler.
- **Loop bindings** (`loop_<meta_key>`, resolved per-item from the loop query) are
  for modules *inside* a loop row only. Don't reach for them on a detail page.

## Build path A — author importable JSON

Use the `divi5-page-generator` block builder
(`skills/divi5-page-generator/scripts/divi-builder.js`) for the markup — it emits
correct `<!-- wp:divi/... -->` blocks, manages `builderVersion`, and already
protects `$variable({...})$` tokens in `htmlContent()`. For the dynamic-content
tokens, `use_on` scope, and the importable export envelope, use the bundled
helper **`scripts/tb-template.js`** (`node scripts/tb-template.js` self-checks):

```js
const { block, placeholder, section, row, column, heading, text, image } =
  require('../../divi5-page-generator/scripts/divi-builder.js');
const { dynamicContent, useOn, themeBuilderTemplate } =
  require('./scripts/tb-template.js');

const bodyMarkup = placeholder([
  section({}, [ row({}, [ column({}, [
    heading({ text: dynamicContent('post_title') }),
    image({ src: dynamicContent('post_featured_image'),
            alt: dynamicContent('post_featured_image_alt_text') }),
    text({ text: `<p>${dynamicContent('_airloop_dogs_breed', { before: 'Breed: ' })}</p>` }),
  ]) ]) ]),
]);

const exportJson = themeBuilderTemplate({
  bodyMarkup,
  useOn: useOn.taxonomyTerm('airloop_connection', 60),
  title: 'Dogs Detail',
});
```

Write `exportJson` to a `.json` file; the user imports it via Divi → Theme
Builder → Import. Validate the module attribute paths against
**references/dynamic-content-bindings.md** (the builder's `heading`/`text`/`image`
helpers already use the correct paths — hand-authored markup must match them).

## Build path B — install programmatically from PHP (plugins)

When a plugin ships a template (one-click "create my detail page"), write the two
posts + registry entry directly. The exact, verified recipe — including the
`wp_slash` gotcha that corrupts `$variable` JSON, the completeness meta Divi's own
save writes, idempotency via a marker, and cache busting — is in
**references/programmatic-install.md**. Follow it precisely; TB storage internals
are undocumented and easy to get subtly wrong (orphan posts Divi never surfaces).

## Non-negotiable gotchas (all cost hours if missed)

- **`wp_slash` the markup** before `wp_insert_post` — WP unslashes internally and
  will mangle the `$variable({...})$` JSON otherwise.
- **`builderVersion` must match the installed Divi** (e.g. `5.8.1`). Read it at
  runtime; do not hardcode a stale beta string — mismatches cause silent
  render/VB failures.
- **`_et_use_on` is one flat string per meta row**, not a serialized array.
- **Register the template on the live Theme Builder post**, or it stays invisible.
- **Heading uses `title.innerContent`, not `content.innerContent`** — the wrong
  key yields a heading container with no `<h*>` at all.
- **Underscore-prefixed meta keys (`_prop_price`) are hidden from Divi's
  dynamic-content picker** (WP treats `_`-keys as protected). Bind them by writing
  the `$variable` token with the raw key directly — it still resolves. Only if a
  user must pick manually, expose the key (`register_post_meta show_in_rest`, or a
  DC-options filter). See references/dynamic-content-bindings.md.

## Quick verification

After building/installing, confirm on the frontend that the rendered HTML
contains the record's real field values and **zero** literal `$variable(` tokens
(any remaining token = unresolved binding). For the VB half, open the template
and confirm modules show a sample record's data, not blank — if blank, the
template is likely `:all`-scoped rather than taxonomy-scoped.
