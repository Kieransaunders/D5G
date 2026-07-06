# Import Divi 5 Theme Builder templates via REST

## Why
Generated pages can only be dropped onto individual posts today — there's no way to push a
reusable Divi 5 Theme Builder template (header/body/footer + "Use On" rule) into a site
programmatically. Divi has no native REST/AJAX endpoint for this, so agencies wanting a
template applied across a post type (e.g. all `airloop_record` singles) have to build it by
hand in the Theme Builder UI.

This proposal formalizes work already implemented on this branch
(`plugin/divi-tools-importer/src/ThemeBuilderImporter.php`,
`plugin/divi-tools-importer/src/RestApi.php`) — the spec, delta, and tests below are being
written retroactively against existing code, not before it. See the RED-phase note in
`tasks.md` for how that affects the usual propose→apply flow.

## What Changes
- New `POST /theme-builder-template` REST route, authenticated the same way as the
  existing import routes.
- New `DTI_ThemeBuilderImporter::import()` which:
  - Validates `key`, `use_on`, and `body` (must contain the `wp:divi/placeholder` block).
  - Upserts (create-or-update, keyed by a `_dti_tb_key` postmeta marker) the `et_template`
    post plus its `et_body_layout` / `et_header_layout` / `et_footer_layout` posts.
  - Writes `post_content` directly via `$wpdb` (bypassing `wp_kses_post()` /
    `balanceTags()`, which corrupt block-comment delimiters — same reasoning as
    `DTI_PageImporter`).
  - Replaces the template's `_et_use_on` postmeta with the new rule set on every import.
  - Registers the template onto the live `et_theme_builder` post's `_et_template` registry
    (mirrors `et_theme_builder_api_save()`), without duplicating existing registrations.
  - Clears Divi's static CSS caches after a save.
  - Returns a `warnings` array instead of failing hard when the live Theme Builder post
    can't be resolved.
- Plugin version bump to 1.7.0.

## Capabilities
- New: `theme-builder-import`

## Impact
- Affects `plugin/divi-tools-importer` only (REST API surface + a new importer class).
- No changes to the Node `app/` builder or the page-generator skills.
- Adds one new REST route; existing routes/behavior are untouched.
