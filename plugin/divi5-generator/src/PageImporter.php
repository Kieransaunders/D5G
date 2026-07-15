<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_PageImporter {

	/**
	 * Import a Divi 5 et_builder JSON export as a WordPress page.
	 *
	 * ## Brand-in-one-shot payload contract (page path only)
	 *
	 * `$layout` MAY carry an optional top-level `brand` bundle so a single /import
	 * call is self-contained — the connector registers the brand, then compiles the
	 * pointer-only page content against it:
	 *
	 *   {
	 *     "context": "et_builder",
	 *     "data": { "1": "<!-- wp:divi/... -->" },
	 *     "brand": {
	 *       "presets":          { "module": {...}, "group": {...} },
	 *       "global_colors":    [ [ "gcid-x", { "color": "#...", ... } ], ... ],
	 *       "global_variables": [ { "id": "gvid-x", "value": "...", ... }, ... ]
	 *     }
	 *   }
	 *
	 * A `brand_profile_id` (string/int) MAY be supplied instead of/alongside `brand`;
	 * it is resolved via the `d5g/import/resolve_brand_profile` filter (a host app can
	 * hook it to return a `brand` bundle for that id). If the filter yields nothing,
	 * the id is ignored.
	 *
	 * REQUIRED CALL ORDER (enforced internally by resolve_and_register_brand()):
	 *   1. Register brand presets (rewrites `$content` on any old→new id remap).
	 *   2. Register global colours + variables (so `$variable(gcid-…)$` refs resolve).
	 *   3. Compile: inline each referenced preset's attrs into its block, sourcing
	 *      attrs from the *registered* store (post-remap ids).
	 *
	 * FALLBACK (no `brand`/`brand_profile_id`, and no top-level `presets` block):
	 * the page is compiled against whatever presets are already registered on the
	 * site (today's behaviour, where the app pre-registers brand via the separate
	 * /presets/import + /global-variables routes). A legacy fully-inlined export with
	 * a top-level `presets` block still works unchanged — those presets register at
	 * step 3 below and the compile is a no-op on already-inlined blocks.
	 *
	 * @param array $layout  Parsed et_builder export array.
	 * @param array $seo     SEO meta (title, description, slug).
	 * @param bool  $publish Create as published rather than draft.
	 * @return array{page_id:int, action:string, slug:string, warnings:string[], seo_plugin:array{plugin:string|null, fields_written:string[]}, preview_url:string, edit_url:string}
	 */
	public static function import( array $layout, array $seo, bool $publish = false ): array {
		$warnings = array();

		// -----------------------------------------------------------------------
		// 1. Validate the export shape.
		// -----------------------------------------------------------------------
		if ( ( $layout['context'] ?? '' ) !== 'et_builder' ) {
			throw new InvalidArgumentException(
				"Expected context 'et_builder', got '" . ( $layout['context'] ?? 'none' ) . "'. " .
				"Library exports (et_builder_layouts) cannot be used as page imports."
			);
		}
		if ( empty( $layout['data'] ) || ! is_array( $layout['data'] ) ) {
			throw new InvalidArgumentException( 'Export has no data map.' );
		}
		$content = reset( $layout['data'] );
		if ( ! is_string( $content ) || false === strpos( $content, 'wp:divi/placeholder' ) ) {
			throw new InvalidArgumentException( 'Page content is missing the divi/placeholder wrapper.' );
		}

		// -----------------------------------------------------------------------
		// 2. Divi 5 internals availability.
		// -----------------------------------------------------------------------
		$preset_class = 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset';
		$data_class   = 'ET\\Builder\\Packages\\GlobalData\\GlobalData';
		$d5_available = class_exists( $preset_class )
			&& method_exists( $preset_class, 'process_presets_for_import' );

		if ( ! $d5_available ) {
			$warnings[] = 'Divi 5 import helpers not found — ensure Divi 5 is active. Importing content only (no presets or global colours).';
		}

		// -----------------------------------------------------------------------
		// 3. Resolve + register brand (presets, global colours, variables), then
		//    compile the pointer-only page content against the registered store.
		//
		//    Brand sources, in order: an out-of-band `brand` bundle in the payload;
		//    a `brand_profile_id` resolved via filter; otherwise a legacy top-level
		//    `presets`/`global_colors`/`global_variables` block in the layout;
		//    otherwise whatever is already registered on the site.
		// -----------------------------------------------------------------------
		$brand              = self::resolve_brand( $layout );
		$reg                = self::register_brand_and_compile( $brand, $content, $d5_available, $warnings );
		$content            = $reg['content'];
		$presets_imported   = $reg['presets_imported'];
		$colors_imported    = $reg['colors_imported'];
		$variables_imported = $reg['variables_imported'];

		// -----------------------------------------------------------------------
		// 5. Resolve title + slug.
		// -----------------------------------------------------------------------
		$title = $seo['titleTag'] ?? $seo['title'] ?? '';
		if ( ! $title ) {
			// Try to extract from content as last resort.
			if ( preg_match( '/"content":"([^"]{1,120})/', $content, $m ) ) {
				$title = wp_strip_all_tags( stripslashes( $m[1] ) );
			}
		}
		$title = $title ?: 'Imported Page ' . gmdate( 'Y-m-d H:i' );
		$slug  = $seo['slug'] ?? sanitize_title( $title );

		// -----------------------------------------------------------------------
		// 6. Create or update the page.
		// -----------------------------------------------------------------------
		$existing = get_page_by_path( $slug, OBJECT, 'page' );
		$postarr  = array(
			'post_type'   => 'page',
			'post_title'  => sanitize_text_field( $title ),
			'post_name'   => sanitize_title( $slug ),
			'post_status' => $publish ? 'publish' : 'draft',
		);

		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
			if ( ! $publish ) {
				$postarr['post_status'] = ( $existing->post_status === 'publish' ) ? 'publish' : 'draft';
			}
			$page_id = wp_update_post( wp_slash( $postarr ), true );
			$action  = 'updated';
		} else {
			$page_id = wp_insert_post( wp_slash( $postarr ), true );
			$action  = 'created';
		}

		if ( is_wp_error( $page_id ) ) {
			throw new RuntimeException( 'Page save failed: ' . $page_id->get_error_message() );
		}

		// Write Divi 5 block markup directly to bypass wp_kses_post() / balanceTags(),
		// which corrupt block comment delimiters when JSON values contain HTML tags.
		global $wpdb;
		$wpdb->update( $wpdb->posts, array( 'post_content' => $content ), array( 'ID' => $page_id ) );
		clean_post_cache( $page_id );

		// Clear the page-specific Divi CSS cache. Divi generates per-page preset CSS
		// in et-cache/{post_id}/et-core-unified-{post_id}.min.css — if a stale file
		// exists from a previous import with different preset IDs, the new preset
		// classes won't render until the cache is regenerated.
		self::clear_page_css_cache( $page_id );

		update_post_meta( $page_id, '_et_pb_use_builder', 'on' );
		update_post_meta( $page_id, '_et_pb_use_divi_5', 'on' );
		update_post_meta( $page_id, '_wp_page_template', 'page-template-blank.php' );
		update_post_meta( $page_id, '_et_pb_page_layout', 'et_full_width_page' );
		update_post_meta( $page_id, '_et_pb_built_for_post_type', array( 'page' ) );

		// Stamp this page as imported by Divi5 Generator (with timestamp), so
		// GET /pages can list only our imports without relying on _et_pb_* keys
		// that Divi itself also writes.
		update_post_meta( $page_id, '_d5g_imported', time() );

		// -----------------------------------------------------------------------
		// 7. SEO meta.
		// -----------------------------------------------------------------------
		$seo_result = D5G_SeoWriter::write( $page_id, $seo );
		if ( $seo_result['plugin'] === null && ( ! empty( $seo['titleTag'] ) || ! empty( $seo['title'] ) ) ) {
			$warnings[] = 'No supported SEO plugin (Yoast, Rank Math, AIOSEO, SEOPress, or The SEO Framework) detected — SEO values stored in post meta (_d5g_seo_title / _d5g_seo_description). Set them manually in your SEO plugin.';
		}

		return [
			'page_id'            => $page_id,
			'action'             => $action,
			'slug'               => $slug,
			'status'             => get_post_status( $page_id ),
			'preview_url'        => get_preview_post_link( $page_id ),
			'edit_url'           => admin_url( 'post.php?post=' . $page_id . '&action=edit' ),
			'builder_url'        => add_query_arg( [ 'p' => $page_id, 'et_fb' => '1' ], home_url( '/' ) ),
			'presets_imported'   => $presets_imported,
			'colors_imported'    => $colors_imported,
			'variables_imported' => $variables_imported,
			'seo_plugin'         => $seo_result,
			'warnings'           => $warnings,
		];
	}

	/**
	 * Resolve the brand bundle for a page import from the layout payload.
	 *
	 * Precedence:
	 *   1. `$layout['brand']`  — an explicit out-of-band bundle
	 *      { presets, global_colors, global_variables } (the .brand.json shape).
	 *   2. `$layout['brand_profile_id']` — resolved via the
	 *      `d5g/import/resolve_brand_profile` filter; a host app returns a bundle.
	 *   3. Legacy top-level `presets`/`global_colors`/`global_variables` blocks in
	 *      the layout itself (fully-inlined exports still carry these).
	 *
	 * @param array $layout
	 * @return array{presets:array, global_colors:array, global_variables:array}
	 */
	public static function resolve_brand( array $layout ): array {
		if ( ! empty( $layout['brand'] ) && is_array( $layout['brand'] ) ) {
			$b = $layout['brand'];
		} elseif ( ! empty( $layout['brand_profile_id'] ) ) {
			$resolved = apply_filters( 'd5g/import/resolve_brand_profile', null, $layout['brand_profile_id'] );
			$b        = is_array( $resolved ) ? $resolved : array();
		} else {
			// Legacy inline export: read the top-level blocks.
			$b = array(
				'presets'          => $layout['presets'] ?? array(),
				'global_colors'    => $layout['global_colors'] ?? array(),
				'global_variables' => $layout['global_variables'] ?? array(),
			);
		}

		return array(
			'presets'          => is_array( $b['presets'] ?? null ) ? $b['presets'] : array(),
			'global_colors'    => is_array( $b['global_colors'] ?? null ) ? $b['global_colors'] : array(),
			'global_variables' => is_array( $b['global_variables'] ?? null ) ? $b['global_variables'] : array(),
		);
	}

	/**
	 * Register a brand bundle then compile the pointer-only page content against it.
	 *
	 * Call order (load-bearing): register presets (rewriting $content on any old→new
	 * id remap) → register global colours + variables → compile by inlining each
	 * referenced preset's attrs into its block, sourcing attrs from the *registered*
	 * store (GlobalPreset::get_data(), post-remap ids). When Divi is unavailable, the
	 * compile falls back to the supplied bundle's own presets so CI can exercise it.
	 *
	 * @param array  $brand        { presets, global_colors, global_variables }.
	 * @param string $content      The page block-comment content.
	 * @param bool   $d5_available Divi 5 GlobalData/GlobalPreset present.
	 * @param array  $warnings     Collected by reference.
	 * @return array{content:string, presets_imported:bool, colors_imported:bool, variables_imported:bool}
	 */
	public static function register_brand_and_compile( array $brand, string $content, bool $d5_available, array &$warnings ): array {
		$preset_class = 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset';
		$data_class   = 'ET\\Builder\\Packages\\GlobalData\\GlobalData';

		$presets_imported   = false;
		$colors_imported    = false;
		$variables_imported = false;

		// ── 1. Presets — register and remap ids in $content ─────────────────────
		if ( $d5_available && ! empty( $brand['presets'] ) ) {
			$result = $preset_class::process_presets_for_import( $brand['presets'] );
			if ( ! empty( $result['preset_id_mappings'] ) ) {
				foreach ( $result['preset_id_mappings'] as $old => $new ) {
					if ( is_string( $old ) && is_string( $new ) && $old !== $new ) {
						$content = str_replace( $old, $new, $content );
					}
				}
			}
			$presets_imported = true;
			// Mirror GlobalPreset::save_data(): clear Divi's CSS cache so the newly
			// registered preset ids get their CSS generated on next load.
			if ( class_exists( 'ET_Core_PageResource' ) ) {
				ET_Core_PageResource::remove_static_resources( 'all', 'all', true, 'all', true );
			}
		} elseif ( empty( $brand['presets'] ) ) {
			$warnings[] = 'No brand presets supplied — page compiled against presets already registered on the site.';
		}

		// ── 2. Global colours + variables ───────────────────────────────────────
		if ( $d5_available && ! empty( $brand['global_colors'] ) ) {
			if ( method_exists( $data_class, 'get_imported_global_colors' )
				&& method_exists( $data_class, 'set_global_colors' ) ) {
				$converted = $data_class::get_imported_global_colors( $brand['global_colors'] );
				if ( is_array( $converted ) && ! empty( $converted ) ) {
					$data_class::set_global_colors( $converted, true );
					$colors_imported = true;
				}
			} else {
				$warnings[] = 'GlobalData colour import methods not found — global colours skipped.';
			}
		}
		if ( $d5_available && ! empty( $brand['global_variables'] ) ) {
			if ( method_exists( $data_class, 'import_global_variables' ) ) {
				$data_class::import_global_variables( $brand['global_variables'] );
				$variables_imported = true;
			} else {
				$warnings[] = 'GlobalData::import_global_variables not found — global variables skipped.';
			}
		}

		// ── 3. Compile: inline preset attrs into every referenced block ─────────
		// Attr source, in preference order:
		//   (a) the supplied brand bundle's own `presets` — this is the one-shot
		//       path and the shape verified byte-for-byte against the emitter
		//       (module + group under presets.module / presets.group). Compiling
		//       from it is safe regardless of the id-remap above: block attrs carry
		//       only gcid/gvid colour refs, never preset IDs, so the str_replace
		//       remap (which only rewrites modulePreset/presetId pointers) and the
		//       merge are independent.
		//   (b) otherwise the registered store GlobalPreset::get_data() — the
		//       no-bundle fallback, where the app pre-registered brand via the
		//       separate /presets/import + /global-variables routes. This relies on
		//       get_data() returning the same module/group shape; unlike (a) it is
		//       not unit-verifiable here (needs live Divi).
		if ( ! empty( $brand['presets'] ) ) {
			$registry = $brand['presets'];
		} elseif ( $d5_available && method_exists( $preset_class, 'get_data' ) ) {
			$registry = (array) $preset_class::get_data();
		} else {
			$registry = array();
		}
		list( $module_by_id, $group_by_id ) = D5G_PageCompiler::index_preset_attrs( $registry );
		$content = D5G_PageCompiler::compile_content( $content, $module_by_id, $group_by_id );

		return array(
			'content'            => $content,
			'presets_imported'   => $presets_imported,
			'colors_imported'    => $colors_imported,
			'variables_imported' => $variables_imported,
		);
	}

	/**
	 * Delete the page-specific Divi CSS cache files so preset classes are regenerated
	 * on next page load. Divi writes per-page CSS into:
	 *   et-cache/{post_id}/et-core-unified-{post_id}.min.css
	 *   et-cache/{post_id}/et-core-unified-deferred-{post_id}.min.css
	 * These are NOT cleared by ET_Core_PageResource::remove_static_resources() — that
	 * only clears the global/builder cache, not the rendered page CSS.
	 */
	private static function clear_page_css_cache( int $post_id ): void {
		$cache_dir = WP_CONTENT_DIR . '/et-cache/' . $post_id;
		if ( ! is_dir( $cache_dir ) ) {
			return;
		}
		$files = glob( $cache_dir . '/*.css' );
		if ( $files ) {
			foreach ( $files as $file ) {
				@unlink( $file );
			}
		}
	}
}
