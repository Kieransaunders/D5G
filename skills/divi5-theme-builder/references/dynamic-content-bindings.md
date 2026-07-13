# Dynamic content bindings & resolution (Divi 5.x, verified)

Verified against Divi 5.0.0-public-beta.9.x through 5.8.1 with a real plugin
(AirLoop) syncing custom-post-type records. These are the exact module attribute
paths and the resolution model that decides whether `$variable(...)` produces
real data or an empty container.

## The `$variable` token

A dynamic-content binding is a plain string embedded in a module attribute value:

```
$variable({"type":"content","value":{"name":"<META_KEY>","settings":{"before":"<prefix>","after":"<suffix>"}}})$
```

- `name` — the field id. For post meta, the raw meta key (e.g. `_airloop_dogs_name`).
  Divi's own built-ins use reserved names (`post_title`, `post_featured_image`,
  `post_featured_image_alt_text`, `post_content`, …).
- `before`/`after` — optional literal text wrapped around the resolved value
  (e.g. a `"Breed: "` label). Omit or leave `""` for none.
- In an exported/serialized template the inner `"` appear Unicode-escaped
  (`"`); when emitted by a JS builder that JSON-stringifies attrs, that
  happens automatically. Emit the token as a normal string — don't double-escape.

## Module attribute paths (get these wrong → empty render, no error)

The value lives at a module-specific path. Divi reads a nested
`innerContent.desktop.value` shape:

| Module | Block name | Path to the bound value |
|---|---|---|
| Text | `divi/text` | `content.innerContent.desktop.value` — wrap in `<p>…</p>` |
| Heading | `divi/heading` | `title.innerContent.desktop.value` — **not** `content` |
| Image (src) | `divi/image` | `image.innerContent.desktop.value.src` |
| Image (alt) | `divi/image` | `image.innerContent.desktop.value.alt` |
| Code | `divi/code` | `content.innerContent.desktop.value` |

Example Text module bound to a meta field, with a label prefix:

```
<!-- wp:divi/text {"content":{"innerContent":{"desktop":{"value":"<p>$variable({"type":"content","value":{"name":"_airloop_dogs_breed","settings":{"before":"Breed: ","after":""}}})$</p>"}}},"builderVersion":"5.8.1"} /-->
```

Example Image bound to the record's featured image (a Divi built-in, no custom
meta needed — sideload your image field to the WP featured image at sync time):

```
<!-- wp:divi/image {"image":{"innerContent":{"desktop":{"value":{
  "src":"$variable({"type":"content","value":{"name":"post_featured_image",...}})$",
  "alt":"$variable({...post_featured_image_alt_text...})$"
}}}},"builderVersion":"5.8.1"} /-->
```

## Gotcha: underscore-prefixed meta keys are hidden from the DC picker

WordPress treats a meta key beginning with `_` as **protected** — it's excluded
from the Custom Fields UI, and Divi's dynamic-content dropdown won't list it. So a
key like `_prop_price` or `_airloop_dogs_name` **cannot be picked by hand in the
builder**, even though the binding resolves perfectly once it exists.

Two ways through it:

1. **Bind by writing the token directly** (what a generator does) — emit
   `$variable({"...","name":"_prop_price",...})$` into the module value with the
   raw key. Divi resolves it at render time regardless of whether the picker would
   have shown it. This is the robust path for programmatic generation.
2. **Surface the key in the picker** (only if the user must pick it manually) —
   register it with `register_post_meta(..., ['show_in_rest' => true])`, or add it
   to Divi's custom-field option list via the appropriate
   `divi_module_dynamic_content_options` / `et_builder_custom_fields` filter (a
   plugin like AirLoop registers its `_airloop_*` fields as first-class DC options
   this way, so they appear under the plugin's own group).

If a user says "my field isn't in the dynamic-content dropdown", this is almost
always why — the underscore, not a broken binding.

## Resolution model — plain vs loop, frontend vs VB

Two binding *kinds*, and two *surfaces* where they resolve. Getting the wrong
combination is the #1 cause of "my dynamic content is blank".

### Plain bindings (`name: "_meta_key"`) — use for single-record detail pages

- **Frontend:** resolve against the *currently viewed post*. On a `singular:*`
  Theme Builder template the current post is the record → renders that record's
  value. Works whether scoped `:all` or by taxonomy term.
- **Visual Builder:** resolve once against the template's editing context. When
  the template is **taxonomy-term-scoped** (`singular:taxonomy:TAX:term:id:N`),
  the VB has a concrete set of records to sample and shows **real data** while you
  design. When scoped `:all`, the VB may show blank/placeholder because there's no
  bound record to preview — the frontend still works, but the design experience is
  worse. **Prefer taxonomy-term scoping for detail pages you want to design
  visually.**

### Loop bindings (`loop_<meta_key>`) — only inside a loop

- A loop is `module.advanced.loop` on a `divi/row`; it repeats the row's modules
  once per queried item (a grid/archive of *many* records on *one* page).
- Inside a loop, per-item values arrive as `loop_id` (the item post id), and only
  `loop_`-prefixed options resolve per item (client-side in the VB from the loop
  query results, and via a priority-20 resolver on the frontend).
- **Do not use loop bindings on a detail page.** A detail page shows one record;
  plain bindings on a `singular:*` template are correct and far simpler. The
  widespread "dynamic content only works in a loop" belief comes from people
  hitting the `:all`-scope VB-preview blank and wrongly concluding a loop is
  required. Taxonomy scoping + plain bindings is the real fix.

## Verification

Fetch a rendered record URL and assert: (1) the record's real field value is in
the HTML, and (2) `substr_count(html, '$variable(') === 0`. Any surviving token is
an unresolved binding — usually a wrong attribute path, a `:all`-scope VB export
never saved, or a typo in the meta key `name`.
