<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_RestApi {

	const NAMESPACE = 'divi5-generator/v1';

	public static function register_routes(): void {
		register_rest_route( self::NAMESPACE, '/import', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_import' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'layout'  => array( 'required' => true,  'type' => 'object' ),
				'seo'     => array( 'required' => false, 'type' => 'object', 'default' => array() ),
				'schema'  => array( 'required' => false, 'type' => 'object', 'default' => array() ),
				'publish' => array( 'required' => false, 'type' => 'boolean', 'default' => true ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/preview', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_preview' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'layout' => array( 'required' => true, 'type' => 'object' ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/export', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_export' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'id'   => array( 'required' => false, 'type' => 'integer', 'default' => 0 ),
				'slug' => array( 'required' => false, 'type' => 'string',  'default' => '' ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/presets/import', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_presets_import' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'presets' => array( 'required' => true, 'type' => 'object' ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/presets', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_presets_list' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'module'     => array( 'required' => false, 'type' => 'string',  'default' => '' ),
				'with_attrs' => array( 'required' => false, 'type' => 'boolean', 'default' => false ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/presets/export', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_presets_export' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/global-variables', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_global_variables_import' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/global-variables/export', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_global_variables_export' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/db/export', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_db_export' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/db/import', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_db_import' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'sql'      => array( 'required' => true,  'type' => 'string' ),
				'from_url' => array( 'required' => false, 'type' => 'string', 'default' => '' ),
				'to_url'   => array( 'required' => false, 'type' => 'string', 'default' => '' ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/ping', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_ping' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/pages', array(
			'methods'             => 'GET',
			'callback'            => array( __CLASS__, 'handle_pages_list' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
		) );

		register_rest_route( self::NAMESPACE, '/pages/(?P<slug>[a-z0-9-]+)', array(
			'methods'             => 'DELETE',
			'callback'            => array( __CLASS__, 'handle_pages_delete' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'slug' => array( 'required' => true, 'type' => 'string', 'sanitize_callback' => 'sanitize_title' ),
			),
		) );

		register_rest_route( self::NAMESPACE, '/menus', array(
			array(
				'methods'             => 'POST',
				'callback'            => array( __CLASS__, 'handle_menu_create' ),
				'permission_callback' => array( __CLASS__, 'authenticate' ),
				'args'                => array(
					'name'     => array( 'required' => true, 'type' => 'string' ),
					'location' => array( 'required' => false, 'type' => 'string', 'default' => '' ),
					'items'    => array( 'required' => false, 'type' => 'array',  'default' => array() ),
				),
			),
			array(
				'methods'             => 'GET',
				'callback'            => array( __CLASS__, 'handle_menus_list' ),
				'permission_callback' => array( __CLASS__, 'authenticate' ),
				'args'                => array(
					'name' => array( 'required' => false, 'type' => 'string', 'default' => '' ),
				),
			),
		) );

		register_rest_route( self::NAMESPACE, '/menus/auto-place', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_menu_auto_place' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'menu_name' => array( 'required' => true, 'type' => 'string' ),
				'pages'     => array( 'required' => true, 'type' => 'array' ),
			),
		) );
	}

	public static function authenticate( WP_REST_Request $request ): bool|WP_Error {
		if ( ! D5G_Auth::check_rate_limit() ) {
			return new WP_Error( 'rate_limited', 'Too many requests. Try again in 60 seconds.', array( 'status' => 429 ) );
		}

		$key = $request->get_header( 'X-D5G-Key' );
		if ( ! $key ) {
			// Also accept as query param for easy browser testing.
			$key = sanitize_text_field( $request->get_param( 'd5g_key' ) ?? '' );
		}

		if ( ! $key || ! D5G_Auth::verify( $key ) ) {
			return new WP_Error( 'unauthorized', 'Invalid or missing API key.', array( 'status' => 401 ) );
		}

		return true;
	}

	public static function handle_preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$layout = $request->get_param( 'layout' );

		if ( ! is_array( $layout ) || empty( $layout ) ) {
			return new WP_Error( 'invalid_layout', 'layout must be a non-empty JSON object.', array( 'status' => 400 ) );
		}

		try {
			$result = D5G_PagePreviewer::preview( $layout );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'preview_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id   = (int) $request->get_param( 'id' );
		$slug = sanitize_text_field( (string) $request->get_param( 'slug' ) );

		try {
			$result = D5G_PageExporter::export( $id, $slug );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'not_found', $e->getMessage(), array( 'status' => 404 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'export_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_presets_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$presets = $request->get_param( 'presets' );

		if ( ! is_array( $presets ) || empty( $presets ) ) {
			return new WP_Error( 'invalid_presets', 'presets must be a non-empty JSON object.', array( 'status' => 400 ) );
		}

		try {
			$result = D5G_PresetManager::import_presets( $presets );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_presets_list( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$module     = sanitize_text_field( (string) $request->get_param( 'module' ) );
		$with_attrs = (bool) $request->get_param( 'with_attrs' );

		try {
			$result = D5G_PresetManager::list_presets( $module, $with_attrs );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'list_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_presets_export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		try {
			$result = D5G_PresetManager::export_presets();
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'export_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_global_variables_export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		try {
			$result = D5G_GlobalVariablesImporter::export();
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'export_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_global_variables_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		// Accept the full Global Variables JSON as the POST body.
		$payload = $request->get_json_params();

		if ( ! is_array( $payload ) || empty( $payload ) ) {
			return new WP_Error( 'invalid_payload', 'POST body must be a valid Global Variables JSON object.', array( 'status' => 400 ) );
		}

		try {
			$result = D5G_GlobalVariablesImporter::import( $payload );
		} catch ( \InvalidArgumentException $e ) {
			return new WP_Error( 'invalid_payload', $e->getMessage(), array( 'status' => 400 ) );
		} catch ( \RuntimeException $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_db_export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		try {
			$result = D5G_DbExporter::export();
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'export_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_db_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$sql      = (string) $request->get_param( 'sql' );
		$from_url = esc_url_raw( (string) $request->get_param( 'from_url' ) );
		$to_url   = esc_url_raw( (string) $request->get_param( 'to_url' ) );

		try {
			$result = D5G_DbImporter::import( $sql, $from_url, $to_url );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'invalid_payload', $e->getMessage(), array( 'status' => 400 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_menus_list( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$name = sanitize_text_field( (string) $request->get_param( 'name' ) );

		try {
			$result = D5G_MenuImporter::list_menus( $name ?: null );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'list_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_menu_create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$payload = array(
			'name'     => sanitize_text_field( (string) $request->get_param( 'name' ) ),
			'location' => sanitize_text_field( (string) $request->get_param( 'location' ) ),
			'items'    => $request->get_param( 'items' ) ?: array(),
		);

		try {
			$result = D5G_MenuImporter::create( $payload );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'menu_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 201 );
	}

	public static function handle_menu_auto_place( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$payload = array(
			'menu_name' => sanitize_text_field( (string) $request->get_param( 'menu_name' ) ),
			'pages'     => $request->get_param( 'pages' ) ?: array(),
		);

		try {
			$result = D5G_MenuImporter::auto_place( $payload );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'auto_place_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_ping( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( array(
			'status'      => 'ok',
			'site'        => get_bloginfo( 'name' ),
			'url'         => home_url(),
			'divi5'       => class_exists( 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset' ),
			'seo_plugin'  => D5G_Seo_Detector::detect_id(),
			// Legacy boolean flags kept for back-compat — superseded by seo_plugin.
			'yoast'       => defined( 'WPSEO_VERSION' ),
			'rankmath'    => class_exists( 'RankMath' ),
			'dti_version' => D5G_VERSION,
		), 200 );
	}

	public static function handle_pages_list( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( D5G_PagesLister::list(), 200 );
	}

	public static function handle_pages_delete( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$slug = sanitize_title( (string) $request->get_param( 'slug' ) );

		$query = new WP_Query( array(
			'name'           => $slug,
			'post_type'      => 'page',
			'post_status'    => array( 'draft', 'publish', 'pending', 'private', 'trash' ),
			'posts_per_page' => 1,
			'no_found_rows'  => true,
			'meta_key'       => '_dti_imported',
		) );

		if ( empty( $query->posts ) ) {
			return new WP_Error( 'not_found', "No DTI-imported page found with slug: {$slug}", array( 'status' => 404 ) );
		}

		$post_id = $query->posts[0]->ID;
		$deleted = wp_delete_post( $post_id, true );

		if ( ! $deleted ) {
			return new WP_Error( 'delete_failed', 'WordPress refused to delete the page.', array( 'status' => 500 ) );
		}

		return new WP_REST_Response( array( 'deleted' => $slug, 'id' => $post_id ), 200 );
	}

	public static function handle_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$layout  = $request->get_param( 'layout' );
		$seo     = $request->get_param( 'seo' )    ?: array();
		$schema  = $request->get_param( 'schema' ) ?: array();
		$publish = (bool) $request->get_param( 'publish' );

		// Allow top-level title/slug as convenience aliases — merge into $seo so
		// PageImporter::import() picks them up from the canonical location.
		$top_title = sanitize_text_field( (string) ( $request->get_param( 'title' ) ?? '' ) );
		$top_slug  = sanitize_title( (string) ( $request->get_param( 'slug' )  ?? '' ) );
		if ( $top_title && empty( $seo['title'] ) && empty( $seo['titleTag'] ) ) {
			$seo['title'] = $top_title;
		}
		if ( $top_slug && empty( $seo['slug'] ) ) {
			$seo['slug'] = $top_slug;
		}

		// Validate layout is an array (REST converts object → assoc array).
		if ( ! is_array( $layout ) || empty( $layout ) ) {
			return new WP_Error( 'invalid_layout', 'layout must be a non-empty JSON object.', array( 'status' => 400 ) );
		}

		$context = $layout['context'] ?? '';

		// Route to library importer for et_builder_layouts (sections, rows, modules).
		if ( $context === 'et_builder_layouts' ) {
			try {
				$result = D5G_LibraryImporter::import( $layout );
			} catch ( InvalidArgumentException $e ) {
				return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
			} catch ( RuntimeException $e ) {
				return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
			}
			D5G_Auth::log_import( array(
				'slug'     => $result['imported'][0]['title'] ?? 'library',
				'action'   => $result['imported'][0]['action'] ?? 'created',
				'status'   => 'library',
				'warnings' => $result['warnings'],
			) );
			return new WP_REST_Response( $result, 200 );
		}

		// Standard page import.
		try {
			$result = D5G_PageImporter::import( $layout, $seo, $publish );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		// Save schema for automatic <head> injection.
		if ( ! empty( $schema ) && is_array( $schema ) ) {
			D5G_SchemaInjector::save( $result['slug'], $schema );
			$result['schema_saved'] = true;
		} else {
			$result['schema_saved'] = false;
		}

		D5G_Auth::log_import( array(
			'slug'       => $result['slug'],
			'action'     => $result['action'],
			'status'     => $result['status'],
			'seo_plugin' => $result['seo_plugin']['plugin'],
			'warnings'   => $result['warnings'],
		) );

		return new WP_REST_Response( $result, 200 );
	}
}
