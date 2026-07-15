<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_PagePreviewer {

	const PREVIEW_SLUG  = 'd5g-live-preview';
	const PREVIEW_TITLE = 'D5G Live Preview';

	/**
	 * Create or update the fixed preview page with the supplied Divi 5 layout.
	 *
	 * Imports presets and global colours so Divi renders with the correct design
	 * system. The page is always kept as a draft and never appears in navigation.
	 *
	 * @param array $layout  Parsed et_builder export array.
	 * @return array{preview_url:string, page_id:int, action:string, warnings:string[]}
	 */
	public static function preview( array $layout ): array {
		$warnings = array();

		// -----------------------------------------------------------------------
		// 1. Validate the export shape (same rules as PageImporter).
		// -----------------------------------------------------------------------
		if ( ( $layout['context'] ?? '' ) !== 'et_builder' ) {
			throw new InvalidArgumentException(
				"Expected context 'et_builder', got '" . ( $layout['context'] ?? 'none' ) . "'. " .
				"Library exports (et_builder_layouts) cannot be used here."
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
		$d5_available = class_exists( $preset_class )
			&& method_exists( $preset_class, 'process_presets_for_import' );

		if ( ! $d5_available ) {
			$warnings[] = 'Divi 5 import helpers not found — presets and global colours skipped.';
		}

		// -----------------------------------------------------------------------
		// 3. Resolve + register brand, then compile the pointer-only content — the
		//    same one-shot path as PageImporter, so a preview renders identically to
		//    the eventual import. Brand may ride in $layout['brand'] /
		//    $layout['brand_profile_id'], or (legacy) as top-level presets blocks;
		//    otherwise the preview compiles against presets already on the site
		//    (e.g. pre-registered by the app's /presets/import + /global-variables).
		// -----------------------------------------------------------------------
		$brand   = D5G_PageImporter::resolve_brand( $layout );
		$reg     = D5G_PageImporter::register_brand_and_compile( $brand, $content, $d5_available, $warnings );
		$content = $reg['content'];

		// -----------------------------------------------------------------------
		// 5. Create or overwrite the fixed preview page.
		// -----------------------------------------------------------------------
		$existing = get_page_by_path( self::PREVIEW_SLUG, OBJECT, 'page' );
		$postarr  = array(
			'post_type'    => 'page',
			'post_title'   => self::PREVIEW_TITLE,
			'post_name'    => self::PREVIEW_SLUG,
			'post_content' => $content,
			'post_status'  => 'draft',
		);

		if ( $existing ) {
			$postarr['ID'] = $existing->ID;
			$page_id       = wp_update_post( wp_slash( $postarr ), true );
			$action        = 'updated';
		} else {
			$page_id = wp_insert_post( wp_slash( $postarr ), true );
			$action  = 'created';
		}

		if ( is_wp_error( $page_id ) ) {
			throw new RuntimeException( 'Preview page save failed: ' . $page_id->get_error_message() );
		}

		update_post_meta( $page_id, '_et_pb_use_builder', 'on' );
		update_post_meta( $page_id, '_et_pb_use_divi_5', 'on' );

		return array(
			'preview_url' => get_preview_post_link( $page_id ),
			'page_id'     => $page_id,
			'action'      => $action,
			'warnings'    => $warnings,
		);
	}
}
