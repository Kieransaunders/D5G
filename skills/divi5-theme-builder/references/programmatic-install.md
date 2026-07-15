# Installing a Theme Builder template from PHP (verified)

For plugins that ship a template ("one-click create my detail page"). Verified
end-to-end against Divi 5.x with live custom-post-type records. TB storage
internals are undocumented and easy to get subtly wrong — the classic failure is
creating posts Divi never surfaces (no registry entry) or corrupting the
`$variable` JSON (no `wp_slash`). Follow this exactly.

## Preconditions — fail loudly if unmet

- Divi active (theme or Divi Builder plugin).
- The Theme Builder API is loaded — `et_theme_builder_get_theme_builder_post_id()`
  exists. Without it you'd only create orphan posts. Throw before writing anything.

## The write path

```php
// 1. Body layout post — holds the block markup. wp_slash is REQUIRED:
//    wp_insert_post() unslashes internally and would corrupt $variable({...}) JSON.
$body_id = (int) wp_insert_post( array(
    'post_type'    => 'et_body_layout',
    'post_status'  => 'publish',
    'post_title'   => 'My Record Detail — Body',
    'post_content' => wp_slash( $markup ),   // <-- do not omit wp_slash
) );
update_post_meta( $body_id, '_et_pb_use_builder', 'on' );
update_post_meta( $body_id, '_et_pb_use_divi_5', 'on' );

// 2. Template post.
$tpl_id = (int) wp_insert_post( array(
    'post_type'   => 'et_template',
    'post_status' => 'publish',
    'post_title'  => 'My Record Detail',
) );
update_post_meta( $tpl_id, '_et_body_layout_id', $body_id );

// 3. Scope — flat string, ONE meta row per condition (never a serialized array).
delete_post_meta( $tpl_id, '_et_use_on' );
add_post_meta( $tpl_id, '_et_use_on', 'singular:taxonomy:my_tax:term:id:' . $term_id );
// or 'singular:post_type:my_cpt:all' for every post of the type.

// 4. Completeness meta Divi's own "Save Changes" writes. Miss any of these (or
//    leave the "marked as unused" flag) and Divi excludes the template.
update_post_meta( $tpl_id, '_et_enabled', '1' );
update_post_meta( $tpl_id, '_et_default', '0' );
update_post_meta( $tpl_id, '_et_body_layout_enabled', '1' );
update_post_meta( $tpl_id, '_et_header_layout_id', 0 );
update_post_meta( $tpl_id, '_et_header_layout_enabled', '1' );
update_post_meta( $tpl_id, '_et_footer_layout_id', 0 );
update_post_meta( $tpl_id, '_et_footer_layout_enabled', '1' );
delete_post_meta( $tpl_id, '_et_theme_builder_marked_as_unused' );

// 5. Register on the live Theme Builder post — the step that actually makes Divi
//    surface (admin) and apply (frontend) the template. Per-template meta alone
//    is invisible without this.
$tb_id = (int) et_theme_builder_get_theme_builder_post_id( true, true );
$registered = array_map( 'intval', (array) get_post_meta( $tb_id, '_et_template', false ) );
if ( ! in_array( $tpl_id, $registered, true ) ) {
    add_post_meta( $tb_id, '_et_template', $tpl_id, false ); // multi-value meta
}

// 6. Bust caches so it renders on the next request.
if ( function_exists( 'et_theme_builder_clear_wp_cache' ) ) { et_theme_builder_clear_wp_cache( 'all' ); }
if ( class_exists( '\ET_Core_PageResource' ) ) { \ET_Core_PageResource::remove_static_resources( 'all', 'all' ); }
```

## Body-only rule

Leave header/footer as `id 0, enabled` (as above). The Theme Builder is global,
shared state site owners curate carefully — never overwrite their header/footer.
Install a body layout only.

## Idempotency

Re-running must **update**, not duplicate (the user may have customised the layout
in the VB). Store a marker meta on both posts (e.g. `_myplugin_tb_template = '1'`,
or the connection/scope id as the value for per-scope templates). On re-run: find
the existing template by marker, update its `et_body_layout` `post_content` in
place (`wp_slash` again), and refresh the meta. Only create fresh when no marker
match exists.

For **per-group** installs (one template per taxonomy term), put the group id in
the marker *value* so each scope gets its own template and re-runs update the
right one — a single global marker would collapse them into one.

## builderVersion

The block markup carries `builderVersion`. Match the installed Divi version. Read
it at runtime (e.g. from `ET_CORE_VERSION` / the theme version) rather than
hardcoding — a stale beta string causes silent render and VB failures.

## Post-install check

Fetch a record URL server-side and assert the field values are present and
`substr_count($html, '$variable(') === 0`. If tokens survive where a hand-built
(UI-exported) template resolves, diff your emitted markup against the export — the
delta is almost always a wrong module attribute path or a missing module
attribute the Divi UI writes.
