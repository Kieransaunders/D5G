<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Imports a Divi 5 Theme Builder template (a "Use On" rule + a body layout,
 * optionally custom header/footer) directly via WordPress APIs.
 *
 * There is no Divi REST/AJAX endpoint for this — Divi's own Theme Builder
 * screen builds et_template + et_header_layout/et_body_layout/et_footer_layout
 * posts and, critically, registers the template ID onto the site's "live"
 * et_theme_builder post's `_et_template` postmeta (done by
 * et_theme_builder_api_save() when the user clicks "Save Changes"). A
 * template's `_et_use_on` / `_et_enabled` / `_et_body_layout_id` postmeta
 * alone is NOT enough — the frontend override
 * (et_theme_builder_frontend_override_template(), template_include priority
 * 98) only considers templates listed in that registry.
 */
class DTI_ThemeBuilderImporter {

	/**
	 * @param array{key:string, use_on:string|string[], title?:string, body:string, header?:string|null, footer?:string|null, header_global?:bool, footer_global?:bool} $payload
	 * @return array{template_id:int, body_layout_id:int, header_layout_id:int, footer_layout_id:int, action:string, warnings:string[]}
	 */
	public static function import( array $payload ): array {
		$warnings = array();

		// -----------------------------------------------------------------------
		// 1. Validate.
		// -----------------------------------------------------------------------
		if ( ! class_exists( 'ET_Theme_Builder_Request' ) || ! function_exists( 'et_theme_builder_get_theme_builder_post_id' ) ) {
			throw new RuntimeException( 'Divi Theme Builder is not available on this site (theme-builder.php not loaded).' );
		}

		$key = sanitize_key( (string) ( $payload['key'] ?? '' ) );
		if ( '' === $key ) {
			throw new InvalidArgumentException( "'key' is required — a stable identifier so re-imports update the same template in place, e.g. 'airloop-record-detail'." );
		}

		$use_on = $payload['use_on'] ?? '';
		$use_on = is_array( $use_on ) ? array_values( array_filter( array_map( 'strval', $use_on ) ) ) : array_filter( array( (string) $use_on ) );
		if ( empty( $use_on ) ) {
			throw new InvalidArgumentException( "'use_on' is required, e.g. 'singular:post_type:airloop_record:all'." );
		}

		$body = (string) ( $payload['body'] ?? '' );
		if ( '' === $body || false === strpos( $body, 'wp:divi/placeholder' ) ) {
			throw new InvalidArgumentException( "'body' must be Divi 5 block markup containing the wp:divi/placeholder wrapper." );
		}

		$title = sanitize_text_field( (string) ( $payload['title'] ?? '' ) ) ?: ( 'DTI Template — ' . $key );

		// -----------------------------------------------------------------------
		// 2. Find an existing template by our own idempotency marker, so
		//    re-imports with the same key update in place rather than
		//    accumulating duplicate templates/registrations.
		// -----------------------------------------------------------------------
		$existing = get_posts( array(
			'post_type'      => 'et_template',
			'post_status'    => array( 'publish', 'draft' ),
			'posts_per_page' => 1,
			'meta_key'       => '_dti_tb_key',
			'meta_value'     => $key,
			'fields'         => 'ids',
		) );
		$template_id = $existing[0] ?? 0;
		$action      = $template_id ? 'updated' : 'created';

		// -----------------------------------------------------------------------
		// 3. Body layout (required).
		// -----------------------------------------------------------------------
		$existing_body_id = $template_id ? (int) get_post_meta( $template_id, '_et_body_layout_id', true ) : 0;
		$body_layout_id   = self::upsert_layout( 'et_body_layout', $existing_body_id, $title . ' Body Layout', $body );

		// -----------------------------------------------------------------------
		// 4. Optional custom header/footer — default to inheriting the site's
		//    global header/footer (id=0, enabled=1), same as a template built
		//    via the UI without touching those slots.
		// -----------------------------------------------------------------------
		$header_content = $payload['header'] ?? null;
		$footer_content = $payload['footer'] ?? null;

		$header_layout_id = 0;
		if ( is_string( $header_content ) && '' !== $header_content ) {
			$existing_header_id = $template_id ? (int) get_post_meta( $template_id, '_et_header_layout_id', true ) : 0;
			$header_layout_id   = self::upsert_layout( 'et_header_layout', $existing_header_id, $title . ' Header Layout', $header_content );
		}

		$footer_layout_id = 0;
		if ( is_string( $footer_content ) && '' !== $footer_content ) {
			$existing_footer_id = $template_id ? (int) get_post_meta( $template_id, '_et_footer_layout_id', true ) : 0;
			$footer_layout_id   = self::upsert_layout( 'et_footer_layout', $existing_footer_id, $title . ' Footer Layout', $footer_content );
		}

		// -----------------------------------------------------------------------
		// 5. Create or update the et_template post itself.
		// -----------------------------------------------------------------------
		$postarr = array(
			'post_type'   => 'et_template',
			'post_title'  => $title,
			'post_status' => 'publish',
		);
		if ( $template_id ) {
			$postarr['ID'] = $template_id;
			$result        = wp_update_post( wp_slash( $postarr ), true );
		} else {
			$result = wp_insert_post( wp_slash( $postarr ), true );
		}
		if ( is_wp_error( $result ) ) {
			throw new RuntimeException( 'Template save failed: ' . $result->get_error_message() );
		}
		$template_id = (int) $result;

		update_post_meta( $template_id, '_et_enabled', '1' );
		update_post_meta( $template_id, '_et_default', '0' );
		update_post_meta( $template_id, '_et_header_layout_id', $header_layout_id );
		update_post_meta( $template_id, '_et_header_layout_enabled', '1' );
		update_post_meta( $template_id, '_et_body_layout_id', $body_layout_id );
		update_post_meta( $template_id, '_et_body_layout_enabled', '1' );
		update_post_meta( $template_id, '_et_footer_layout_id', $footer_layout_id );
		update_post_meta( $template_id, '_et_footer_layout_enabled', '1' );
		update_post_meta( $template_id, '_dti_tb_key', $key );
		update_post_meta( $template_id, '_dti_imported', time() );

		delete_post_meta( $template_id, '_et_use_on' );
		foreach ( $use_on as $rule ) {
			add_post_meta( $template_id, '_et_use_on', sanitize_text_field( $rule ) );
		}
		// A template with a disabled `_et_theme_builder_marked_as_unused` flag is
		// silently excluded from matching — make sure re-importing a previously
		// soft-disabled template re-enables it.
		delete_post_meta( $template_id, '_et_theme_builder_marked_as_unused' );

		// -----------------------------------------------------------------------
		// 6. Register the template on the LIVE Theme Builder post. This is the
		//    step the UI's "Save Changes" button performs and that no amount of
		//    correct per-template postmeta substitutes for.
		// -----------------------------------------------------------------------
		$theme_builder_id = et_theme_builder_get_theme_builder_post_id( true, true );
		if ( ! $theme_builder_id ) {
			$warnings[] = 'Could not resolve or create the live Theme Builder post — template was saved but may not be registered as active.';
		} else {
			$registered = array_map( 'intval', get_post_meta( $theme_builder_id, '_et_template', false ) );
			if ( ! in_array( $template_id, $registered, true ) ) {
				add_post_meta( $theme_builder_id, '_et_template', $template_id, false );
			}
		}

		// -----------------------------------------------------------------------
		// 7. Clear caches — mirrors what et_theme_builder_api_save() does after
		//    a save, plus the et-cache directory (not covered by the function
		//    below on all Divi versions).
		// -----------------------------------------------------------------------
		if ( function_exists( 'et_theme_builder_clear_wp_cache' ) ) {
			et_theme_builder_clear_wp_cache( 'all' );
		}
		if ( class_exists( 'ET_Core_PageResource' ) ) {
			ET_Core_PageResource::remove_static_resources( 'all', 'all' );
		}
		self::clear_et_cache_dir();

		return array(
			'template_id'      => $template_id,
			'body_layout_id'   => $body_layout_id,
			'header_layout_id' => $header_layout_id,
			'footer_layout_id' => $footer_layout_id,
			'action'           => $action,
			'use_on'           => $use_on,
			'warnings'         => $warnings,
		);
	}

	/**
	 * Create or update a header/body/footer layout post with raw Divi 5 block
	 * content, writing post_content directly via $wpdb to bypass wp_kses_post()
	 * / balanceTags() (which corrupt block comment delimiters when JSON
	 * attribute values contain HTML tags) — same reasoning as DTI_PageImporter.
	 */
	private static function upsert_layout( string $post_type, int $existing_id, string $title, string $content ): int {
		$postarr = array(
			'post_type'   => $post_type,
			'post_title'  => $title,
			'post_status' => 'publish',
		);
		if ( $existing_id && get_post( $existing_id ) ) {
			$postarr['ID'] = $existing_id;
			$result        = wp_update_post( wp_slash( $postarr ), true );
		} else {
			$result = wp_insert_post( wp_slash( $postarr ), true );
		}
		if ( is_wp_error( $result ) ) {
			throw new RuntimeException( ucfirst( $post_type ) . ' save failed: ' . $result->get_error_message() );
		}
		$post_id = (int) $result;

		global $wpdb;
		$wpdb->update( $wpdb->posts, array( 'post_content' => $content ), array( 'ID' => $post_id ) );
		clean_post_cache( $post_id );

		update_post_meta( $post_id, '_et_pb_use_builder', 'on' );
		update_post_meta( $post_id, '_et_pb_use_divi_5', 'on' );
		update_post_meta( $post_id, '_dti_imported', time() );

		return $post_id;
	}

	/** Wipe wp-content/et-cache/ — Divi's per-post static CSS is keyed by post ID and survives content-only updates. */
	private static function clear_et_cache_dir(): void {
		$dir = WP_CONTENT_DIR . '/et-cache';
		if ( ! is_dir( $dir ) ) {
			return;
		}
		foreach ( glob( $dir . '/*' ) ?: array() as $path ) {
			if ( is_dir( $path ) ) {
				array_map( 'unlink', glob( $path . '/*.css' ) ?: array() );
			}
		}
	}
}
