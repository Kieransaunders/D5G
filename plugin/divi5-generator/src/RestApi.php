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

		register_rest_route( self::NAMESPACE, '/theme-builder-template', array(
			'methods'             => 'POST',
			'callback'            => array( __CLASS__, 'handle_theme_builder_template_import' ),
			'permission_callback' => array( __CLASS__, 'authenticate' ),
			'args'                => array(
				'key'    => array( 'required' => true,  'type' => 'string' ),
				'use_on' => array( 'required' => true ),
				'title'  => array( 'required' => false, 'type' => 'string', 'default' => '' ),
				'body'   => array( 'required' => true,  'type' => 'string' ),
				'header' => array( 'required' => false, 'type' => 'string', 'default' => null ),
				'footer' => array( 'required' => false, 'type' => 'string', 'default' => null ),
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

	/**
	 * Routes that require a paying (Pro) licence, per PRD §3's Free/Pro split.
	 * Everything not listed here (ping, preview, import, export, pages) stays Free.
	 */
	/** $layout['context'] value that routes /import to the Divi Library. */
	const LIBRARY_CONTEXT = 'et_builder_layouts';

	const PRO_ONLY_ROUTES = array(
		'/divi5-generator/v1/presets/import',
		'/divi5-generator/v1/presets',
		'/divi5-generator/v1/presets/export',
		'/divi5-generator/v1/global-variables',
		'/divi5-generator/v1/global-variables/export',
		'/divi5-generator/v1/db/export',
		'/divi5-generator/v1/db/import',
		'/divi5-generator/v1/menus',
		'/divi5-generator/v1/menus/auto-place',
		// Theme Builder templates apply sitewide to a whole post type/taxonomy
		// scope, not a single reusable section — a bigger capability than Free's
		// Library import, so it's gated the same as every other create/write
		// feature beyond it.
		'/divi5-generator/v1/theme-builder-template',
	);

	public static function requires_pro( string $route ): bool {
		return in_array( $route, self::PRO_ONLY_ROUTES, true );
	}

	/**
	 * PRD §3.2 — Free imports sections into the Divi Library, Pro creates pages.
	 *
	 * /import serves both and routes on $layout['context'], so this gate reads
	 * the payload rather than living in PRO_ONLY_ROUTES with the other routes.
	 * Fails closed: only the library context is free, anything else is a page.
	 *
	 * Deliberately not a quota. A cap expires and the user leaves; a capability
	 * gate keeps Free useful forever and re-sells Pro every time they assemble a
	 * page by hand. It also puts SEO/schema out of Free's reach by control flow
	 * (both are page-path only), so there is no plan-filtered payload to get wrong.
	 */
	public static function import_gate( string $context, bool $is_pro ): bool|WP_Error {
		if ( $is_pro || self::LIBRARY_CONTEXT === $context ) {
			return true;
		}

		$upgrade_url = function_exists( 'dg_fs' ) ? dg_fs()->get_upgrade_url() : '';

		return new WP_Error(
			'pro_required',
			trim( 'Creating pages requires Divi5 Generator Pro. On the free plan you can '
				. 'import this layout into your Divi Library instead, then drop it onto a '
				. 'page in the Visual Builder. Upgrade: ' . $upgrade_url ),
			array( 'status' => 403 )
		);
	}

	/**
	 * /preview is page creation, not a read.
	 *
	 * D5G_PagePreviewer::preview() calls wp_insert_post() with post_status
	 * 'draft' — it creates a real page the caller can simply publish. The route
	 * is Free and handle_preview() called no gate, so a Free install could POST a
	 * page payload to /preview and walk straight around import_gate(). Found by
	 * end-to-end test on live Divi 5.9.0 (15/07/2026), not by the unit suite,
	 * which only exercised import_gate() in isolation.
	 *
	 * Preview always takes the page path — it rejects library exports — so it
	 * gates as a page import unconditionally.
	 */
	public static function preview_gate( bool $is_pro ): bool|WP_Error {
		return self::import_gate( '', $is_pro );
	}

	public static function pro_gate( string $route, bool $is_pro ): bool|WP_Error {
		if ( self::requires_pro( $route ) && ! $is_pro ) {
			$upgrade_url = function_exists( 'dg_fs' ) ? dg_fs()->get_upgrade_url() : '';
			return new WP_Error(
				'pro_required',
				'This feature requires Divi5 Generator Pro. Upgrade: ' . $upgrade_url,
				array( 'status' => 403 )
			);
		}

		return true;
	}

	public static function authenticate( WP_REST_Request $request ): bool|WP_Error {
		if ( ! D5G_Auth::check_rate_limit() ) {
			return new WP_Error( 'rate_limited', 'Too many requests. Try again in 60 seconds.', array( 'status' => 429 ) );
		}

		// Header only. A key in the query string leaks into browser history,
		// access logs, proxies and analytics — and openspec/specs/importer-
		// integration mandates header-only auth regardless.
		$key = $request->get_header( 'X-D5G-Key' );

		if ( ! $key || ! D5G_Auth::verify( $key ) ) {
			return new WP_Error( 'unauthorized', 'Invalid or missing API key.', array( 'status' => 401 ) );
		}

		$gate = self::pro_gate( $request->get_route(), D5G_Limits::is_pro() );
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		return true;
	}

	public static function handle_preview( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$layout = $request->get_param( 'layout' );

		if ( ! is_array( $layout ) || empty( $layout ) ) {
			return new WP_Error( 'invalid_layout', 'layout must be a non-empty JSON object.', array( 'status' => 400 ) );
		}

		// Preview creates a real draft page (PRD §3.2) — gate it as page creation.
		$gate = self::preview_gate( D5G_Limits::is_pro() );
		if ( is_wp_error( $gate ) ) {
			return $gate;
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

	/**
	 * Defence-in-depth on top of Pro-gating (PRD §4 gap 7): DB export/import
	 * transfers whole prefixed tables over REST, so it stays refused even for
	 * paying sites unless the site owner has explicitly opted in via wp-config.
	 * Pro-gating (pro_gate()) already blocks Free installs before this runs.
	 */
	private static function db_transfer_allowed(): bool|WP_Error {
		if ( ! defined( 'D5G_ALLOW_DB_TRANSFER' ) || ! D5G_ALLOW_DB_TRANSFER ) {
			return new WP_Error(
				'db_transfer_disabled',
				"DB export/import is disabled by default. Add define( 'D5G_ALLOW_DB_TRANSFER', true ); to wp-config.php to enable it on this site.",
				array( 'status' => 403 )
			);
		}
		return true;
	}

	public static function handle_db_export( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$allowed = self::db_transfer_allowed();
		if ( is_wp_error( $allowed ) ) {
			return $allowed;
		}

		try {
			$result = D5G_DbExporter::export();
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'export_failed', $e->getMessage(), array( 'status' => 500 ) );
		}
		return new WP_REST_Response( $result, 200 );
	}

	public static function handle_db_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$allowed = self::db_transfer_allowed();
		if ( is_wp_error( $allowed ) ) {
			return $allowed;
		}

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
		$is_pro = D5G_Limits::is_pro();

		return new WP_REST_Response( array(
			'status'      => 'ok',
			'site'        => get_bloginfo( 'name' ),
			'url'         => home_url(),
			'plan'        => $is_pro ? 'pro' : 'free',
			// PRD §3.2 — capabilities, not quotas. There is no usage to report:
			// Free imports sections into the Library without limit and can never
			// create a page, on any day of the month.
			'can'         => array(
				'import_library' => true,
				'import_page'    => $is_pro,
				'write_seo'      => $is_pro,
				'menus'          => $is_pro,
				'presets'        => $is_pro,
				'brand'          => $is_pro,
			),
			'limits'      => array(
				'rate_per_min' => D5G_Limits::get_rate_limit_max(),
			),
			'divi5'       => class_exists( 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset' ),
			'seo_plugin'  => D5G_Seo_Detector::detect_id(),
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
			'meta_key'       => '_d5g_imported',
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

	public static function handle_theme_builder_template_import( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$payload = array(
			'key'    => (string) $request->get_param( 'key' ),
			'use_on' => $request->get_param( 'use_on' ),
			'title'  => (string) $request->get_param( 'title' ),
			'body'   => (string) $request->get_param( 'body' ),
			'header' => $request->get_param( 'header' ),
			'footer' => $request->get_param( 'footer' ),
		);

		try {
			$result = D5G_ThemeBuilderImporter::import( $payload );
		} catch ( InvalidArgumentException $e ) {
			return new WP_Error( 'validation_failed', $e->getMessage(), array( 'status' => 422 ) );
		} catch ( RuntimeException $e ) {
			return new WP_Error( 'import_failed', $e->getMessage(), array( 'status' => 500 ) );
		}

		D5G_Auth::log_import( array(
			'slug'     => 'tb:' . $payload['key'],
			'action'   => $result['action'],
			'status'   => 'theme_builder_template',
			'warnings' => $result['warnings'],
		) );

		return new WP_REST_Response( $result, 200 );
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

		// PRD §3.2: Library imports are free and unlimited; pages are Pro.
		$gate = self::import_gate( $context, D5G_Limits::is_pro() );
		if ( is_wp_error( $gate ) ) {
			return $gate;
		}

		// Route to library importer for et_builder_layouts (sections, rows, modules).
		if ( self::LIBRARY_CONTEXT === $context ) {
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

		// Standard page import — Pro only, already gated by import_gate() above.
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
