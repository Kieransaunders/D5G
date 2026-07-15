# Site profile — connecting the generator to a WordPress site

The importer that runs on the target site is the **`divi5-generator`** plugin
(REST namespace `divi5-generator/v1`). Capture these once per site so a run does not
re-discover them.

| Fact | Value |
|---|---|
| Import endpoint | `POST /wp-json/divi5-generator/v1/import` |
| Body | `{ layout, seo, schema, publish }` — `layout` is the `et_builder` page JSON, `seo` the meta sidecar, `schema` the JSON-LD |
| Draft vs publish | `"publish": false` creates a **draft** (default when reviewing); `true` publishes |
| Auth header | `X-D5G-Key: <key>` — header only; there is **no** query-param fallback (sending the key in the URL leaks it into access logs) |
| Preset registry | `GET /presets?with_attrs=1` → `name → {id, attrs}`; `setup-et-presets.js` writes it to `references/et-preset-registry.json` and derives `references/preset-catalogue.json` |
| Export a page (verify) | `GET /wp-json/divi5-generator/v1/export?id=<post_id>` |
| Output location | generated files go to `$DIVI5_OUT` (default `~/Desktop/Divi5 Pages`) |

Storage on the site: presets live in the `wp_options` row
`et_divi_builder_global_presets_d5` (Divi's `GlobalPreset` store); the API key is
kept as a bcrypt hash in option `d5g_api_key_hash`. Divi 5 serialises page content
as Gutenberg `wp:divi/*` block markup (not `et_pb_section` shortcodes).

Example import (draft):

```bash
curl -s -X POST 'http://localhost:10015/wp-json/divi5-generator/v1/import' \
  -H 'Content-Type: application/json' \
  -H 'X-D5G-Key: <key>' \
  -d @<(node -e 'const f=require("fs");console.log(JSON.stringify({
    layout: JSON.parse(f.readFileSync("slug-landing-page.json")),
    seo:    JSON.parse(f.readFileSync("slug-seo-meta.json")),
    schema: JSON.parse(f.readFileSync("slug-schema.json")),
    publish:false}))')
```
