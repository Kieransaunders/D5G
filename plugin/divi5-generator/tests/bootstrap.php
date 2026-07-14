<?php
/**
 * PHPUnit bootstrap for the Divi5 Generator SEO layer.
 *
 * Stubs the WordPress helper functions the SEO adapters touch so tests run
 * without loading WordPress. PHP's built-in defined() / class_exists() /
 * function_exists() cannot be redeclared, so adapter detection goes through
 * D5G_Seo_Detector::signal() (override via set_signals()) instead.
 *
 * Post meta is captured in an in-memory MetaStore so tests can inspect exactly
 * which keys + values were written.
 */

// Mark ABSPATH so the SUT's `if ( ! defined( 'ABSPATH' ) ) exit;` guards pass.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

if ( ! defined( 'D5G_VERSION' ) ) {
	define( 'D5G_VERSION', '1.7.0-test' );
}

// Load phpunit (composer) — the SUT has no namespace, so we require its
// classes explicitly below.
require_once __DIR__ . '/../vendor/autoload.php';

/**
 * In-memory post-meta store. Tests read it via MetaStore::all() / MetaStore::get().
 */
final class MetaStore {
	/** @var array<int, array<string, mixed>> post_id => [ meta_key => value ] */
	private static $store = array();

	public static function set( int $post_id, string $key, $value ): void {
		if ( ! isset( self::$store[ $post_id ] ) ) {
			self::$store[ $post_id ] = array();
		}
		self::$store[ $post_id ][ $key ] = $value;
	}

	public static function get( int $post_id, string $key ) {
		return self::$store[ $post_id ][ $key ] ?? '';
	}

	public static function has( int $post_id, string $key ): bool {
		return array_key_exists( $key, self::$store[ $post_id ] ?? array() );
	}

	public static function delete( int $post_id, string $key ): void {
		if ( isset( self::$store[ $post_id ] ) ) {
			unset( self::$store[ $post_id ][ $key ] );
		}
	}

	/** @return array<string, mixed> */
	public static function all_for( int $post_id ): array {
		return self::$store[ $post_id ] ?? array();
	}

	public static function reset(): void {
		self::$store = array();
	}
}

// --- WordPress function stubs -------------------------------------------------

if ( ! function_exists( 'update_post_meta' ) ) {
	function update_post_meta( $post_id, $meta_key, $meta_value ) {
		MetaStore::set( (int) $post_id, (string) $meta_key, $meta_value );
		return true;
	}
}

if ( ! function_exists( 'get_post_meta' ) ) {
	function get_post_meta( $post_id, $key = '', $single = false ) {
		$post_id = (int) $post_id;
		$key     = (string) $key;
		if ( $key === '' ) {
			return MetaStore::all_for( $post_id );
		}
		$val = MetaStore::get( $post_id, $key );
		return $single ? $val : array( $val );
	}
}

if ( ! function_exists( 'delete_post_meta' ) ) {
	function delete_post_meta( $post_id, $meta_key, $meta_value = '' ) {
		MetaStore::delete( (int) $post_id, (string) $meta_key );
		return true;
	}
}

if ( ! function_exists( 'apply_filters' ) ) {
	function apply_filters( $tag, $value ) {
		// No real filter system in tests — return the value unchanged.
		return $value;
	}
}

if ( ! function_exists( 'wp_json_encode' ) ) {
	function wp_json_encode( $data, $options = 0, $depth = 512 ) {
		return json_encode( $data, $options, $depth );
	}
}

// --- Menu test infrastructure ------------------------------------------------

if ( ! class_exists( 'WP_Error' ) ) {
	class WP_Error {
		private $code;
		private $message;
		public function __construct( $code = '', $message = '', $data = '' ) {
			$this->code    = $code;
			$this->message = $message;
		}
		public function get_error_message() { return $this->message; }
		public function get_error_code()    { return $this->code; }
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

final class MenuStore {
	private static $menus = array();
	private static $menu_data = array();
	private static $items = array();
	private static $locations = array();
	private static $next_term_id = 100;
	private static $next_item_id = 500;

	public static function reset(): void {
		self::$menus = array();
		self::$menu_data = array();
		self::$items = array();
		self::$locations = array();
		self::$next_term_id = 100;
		self::$next_item_id = 500;
	}

	public static function get_menu_id( string $name ): ?int {
		return self::$menus[ $name ] ?? null;
	}

	public static function get_items( int $menu_id ): array {
		return self::$items[ $menu_id ] ?? array();
	}

	public static function get_locations(): array {
		return self::$locations;
	}

	public static function create_menu( string $name ): int {
		$id = self::$next_term_id++;
		self::$menus[ $name ] = $id;
		self::$menu_data[ $id ] = array( 'term_id' => $id, 'name' => $name );
		self::$items[ $id ] = array();
		return $id;
	}

	public static function add_item( int $menu_id, array $args ): int {
		$item_id = self::$next_item_id++;
		self::$items[ $menu_id ][ $item_id ] = $args;
		return $item_id;
	}

	public static function update_item( int $menu_id, int $item_id, array $args ): void {
		if ( isset( self::$items[ $menu_id ][ $item_id ] ) ) {
			self::$items[ $menu_id ][ $item_id ] = array_merge( self::$items[ $menu_id ][ $item_id ], $args );
		}
	}

	public static function set_location( string $location, int $menu_id ): void {
		self::$locations[ $location ] = $menu_id;
	}

	public static function menu_exists( string $name ): bool {
		return isset( self::$menus[ $name ] );
	}

	public static function get_all_menus(): array {
		$out = array();
		foreach ( self::$menu_data as $id => $data ) {
			$out[] = (object) $data;
		}
		return $out;
	}

	public static function get_menu_item_objects( int $menu_id ): array {
		if ( ! isset( self::$items[ $menu_id ] ) ) {
			return array();
		}
		$out = array();
		foreach ( self::$items[ $menu_id ] as $id => $args ) {
			$parent = isset( $args['menu-item-parent-id'] ) ? (int) $args['menu-item-parent-id'] : 0;
			$out[] = (object) array(
				'ID'               => $id,
				'title'            => $args['menu-item-title'] ?? '',
				'menu_item_parent' => (string) $parent,
				'object_id'        => $args['menu-item-object-id'] ?? 0,
				'object'           => $args['menu-item-object'] ?? '',
				'type'             => $args['menu-item-type'] ?? 'custom',
				'url'              => $args['menu-item-url'] ?? '',
				'menu_order'       => $args['menu-item-position'] ?? 0,
				'db_id'            => $id,
			);
		}
		return $out;
	}
}

if ( ! function_exists( 'wp_get_nav_menus' ) ) {
	function wp_get_nav_menus( $args = array() ) {
		return MenuStore::get_all_menus();
	}
}

if ( ! function_exists( 'wp_get_nav_menu_items' ) ) {
	function wp_get_nav_menu_items( $menu_id, $args = array() ) {
		return MenuStore::get_menu_item_objects( (int) $menu_id );
	}
}

if ( ! function_exists( 'wp_create_nav_menu' ) ) {
	function wp_create_nav_menu( $name ) {
		if ( MenuStore::menu_exists( $name ) ) {
			return new WP_Error( 'menu_exists', "Menu '{$name}' already exists." );
		}
		return MenuStore::create_menu( $name );
	}
}

if ( ! function_exists( 'wp_get_nav_menu_object' ) ) {
	function wp_get_nav_menu_object( $name ) {
		$id = MenuStore::get_menu_id( $name );
		if ( ! $id ) {
			return false;
		}
		return (object) array( 'term_id' => $id, 'name' => $name );
	}
}

if ( ! function_exists( 'wp_update_nav_menu_item' ) ) {
	function wp_update_nav_menu_item( $menu_id, $item_id = 0, $args = array() ) {
		if ( $item_id === 0 ) {
			return MenuStore::add_item( $menu_id, $args );
		}
		MenuStore::update_item( $menu_id, $item_id, $args );
		return $item_id;
	}
}

if ( ! function_exists( 'has_nav_menu' ) ) {
	function has_nav_menu( $location ) {
		return array_key_exists( $location, MenuStore::get_locations() );
	}
}

if ( ! function_exists( 'get_theme_mod' ) ) {
	function get_theme_mod( $key, $default = false ) {
		if ( $key === 'nav_menu_locations' ) {
			return MenuStore::get_locations();
		}
		return $default;
	}
}

if ( ! function_exists( 'set_theme_mod' ) ) {
	function set_theme_mod( $key, $value ) {
		if ( $key === 'nav_menu_locations' && is_array( $value ) ) {
			foreach ( $value as $location => $menu_id ) {
				MenuStore::set_location( $location, $menu_id );
			}
		}
	}
}

if ( ! function_exists( 'sanitize_title' ) ) {
	function sanitize_title( $title, $context = 'save' ) {
		$title = (string) $title;
		$title = strtolower( $title );
		$title = preg_replace( '/[^a-z0-9\-]+/', '-', $title );
		return trim( $title, '-' );
	}
}

if ( ! function_exists( 'sanitize_text_field' ) ) {
	function sanitize_text_field( $str ) {
		if ( ! is_string( $str ) ) {
			return '';
		}
		// Strip tags, strip control chars, trim. Good enough for tests.
		return trim( strip_tags( $str ) );
	}
}

if ( ! function_exists( 'esc_url_raw' ) ) {
	function esc_url_raw( $url ) {
		$url = (string) $url;
		// Very permissive — only reject obviously non-URL strings.
		if ( ! preg_match( '#^https?://#i', $url ) ) {
			return '';
		}
		return filter_var( $url, FILTER_VALIDATE_URL ) ? $url : '';
	}
}

if ( ! function_exists( 'wp_strip_all_tags' ) ) {
	function wp_strip_all_tags( $str ) {
		return trim( strip_tags( (string) $str ) );
	}
}

// --- RestApi test infrastructure ----------------------------------------------

/** In-memory transient store, keyed like get_transient()/set_transient(). */
final class TransientStore {
	private static $store = array();

	public static function get( string $key ) {
		return self::$store[ $key ] ?? false;
	}

	public static function set( string $key, $value ): void {
		self::$store[ $key ] = $value;
	}

	public static function reset(): void {
		self::$store = array();
	}
}

if ( ! function_exists( 'get_transient' ) ) {
	function get_transient( $key ) {
		return TransientStore::get( (string) $key );
	}
}

if ( ! function_exists( 'set_transient' ) ) {
	function set_transient( $key, $value, $expiration = 0 ) {
		TransientStore::set( (string) $key, $value );
		return true;
	}
}

if ( ! function_exists( 'get_option' ) ) {
	function get_option( $key, $default = false ) {
		return $default;
	}
}

/** Minimal WP_REST_Request double — only what D5G_RestApi::authenticate() reads. */
if ( ! class_exists( 'WP_REST_Request' ) ) {
	class WP_REST_Request {
		private $route;
		private $headers;
		private $params;

		public function __construct( string $route = '', array $headers = array(), array $params = array() ) {
			$this->route   = $route;
			$this->headers = $headers;
			$this->params  = $params;
		}

		public function get_route() {
			return $this->route;
		}

		public function get_header( $name ) {
			return $this->headers[ $name ] ?? null;
		}

		public function get_param( $name ) {
			return $this->params[ $name ] ?? null;
		}
	}
}

// --- Load the system under test ----------------------------------------------

$src = __DIR__ . '/../src';
require_once $src . '/Seo/Adapter.php';
require_once $src . '/Seo/AdapterBase.php';
require_once $src . '/Seo/Normaliser.php';
require_once $src . '/Seo/Fallback.php';
require_once $src . '/Seo/Yoast.php';
require_once $src . '/Seo/RankMath.php';
require_once $src . '/Seo/AIOSEO.php';
require_once $src . '/Seo/SEOPress.php';
require_once $src . '/Seo/TSF.php';
require_once $src . '/Seo/Detector.php';
require_once $src . '/SeoWriter.php';
require_once $src . '/MenuImporter.php';
require_once $src . '/Limits.php';
require_once $src . '/Auth.php';
require_once $src . '/RestApi.php';
