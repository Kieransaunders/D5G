<?php
/**
 * PHPUnit bootstrap for the Divi Tools Importer SEO layer.
 *
 * Stubs the WordPress helper functions the SEO adapters touch so tests run
 * without loading WordPress. PHP's built-in defined() / class_exists() /
 * function_exists() cannot be redeclared, so adapter detection goes through
 * DTI_Seo_Detector::signal() (override via set_signals()) instead.
 *
 * Post meta is captured in an in-memory MetaStore so tests can inspect exactly
 * which keys + values were written.
 */

// Mark ABSPATH so the SUT's `if ( ! defined( 'ABSPATH' ) ) exit;` guards pass.
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ );
}

if ( ! defined( 'DTI_VERSION' ) ) {
	define( 'DTI_VERSION', '1.6.0-test' );
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

	/** @var array<int, array<string, array>> post_id => [ meta_key => [ values... ] ] — for add_post_meta() multi-value keys */
	private static $multi = array();

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
		if ( isset( self::$multi[ $post_id ] ) ) {
			unset( self::$multi[ $post_id ][ $key ] );
		}
	}

	public static function add( int $post_id, string $key, $value ): void {
		self::$multi[ $post_id ][ $key ][] = $value;
	}

	public static function has_multi( int $post_id, string $key ): bool {
		return array_key_exists( $key, self::$multi[ $post_id ] ?? array() );
	}

	/** @return array<int, mixed> */
	public static function all_multi( int $post_id, string $key ): array {
		return self::$multi[ $post_id ][ $key ] ?? array();
	}

	/** @return array<string, mixed> */
	public static function all_for( int $post_id ): array {
		return self::$store[ $post_id ] ?? array();
	}

	public static function reset(): void {
		self::$store = array();
		self::$multi = array();
	}
}

/**
 * In-memory post store backing wp_insert_post()/wp_update_post()/get_post()
 * for the Theme Builder importer tests.
 */
final class PostStore {
	private static $posts = array();
	private static $next_id = 1000;

	public static function insert( array $postarr ): int {
		$id = self::$next_id++;
		self::$posts[ $id ] = $postarr + array( 'ID' => $id );
		return $id;
	}

	public static function update( array $postarr ): int {
		$id = (int) $postarr['ID'];
		self::$posts[ $id ] = array_merge( self::$posts[ $id ] ?? array(), $postarr );
		return $id;
	}

	public static function get( int $id ) {
		return isset( self::$posts[ $id ] ) ? (object) self::$posts[ $id ] : null;
	}

	public static function set_content( int $id, string $content ): void {
		if ( isset( self::$posts[ $id ] ) ) {
			self::$posts[ $id ]['post_content'] = $content;
		}
	}

	/** @return int[] IDs of posts matching post_type + a MetaStore key/value pair */
	public static function find_ids_by_type_and_meta( string $post_type, string $meta_key, string $meta_value ): array {
		$ids = array();
		foreach ( self::$posts as $id => $post ) {
			if ( ( $post['post_type'] ?? '' ) === $post_type && MetaStore::get( $id, $meta_key ) === $meta_value ) {
				$ids[] = $id;
			}
		}
		return $ids;
	}

	public static function reset(): void {
		self::$posts   = array();
		self::$next_id = 1000;
	}
}

/** Test-settable fixtures for Theme Builder globals that aren't post/meta state. */
final class ThemeBuilderTestFixtures {
	public static $theme_builder_post_id = 999;

	public static function reset(): void {
		self::$theme_builder_post_id = 999;
	}
}

class WP_Error {
	private $message;
	public function __construct( $code = '', $message = '' ) {
		$this->message = $message;
	}
	public function get_error_message() {
		return $this->message;
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
		if ( MetaStore::has_multi( $post_id, $key ) ) {
			$vals = MetaStore::all_multi( $post_id, $key );
			return $single ? ( $vals[0] ?? '' ) : $vals;
		}
		$val = MetaStore::get( $post_id, $key );
		return $single ? $val : array( $val );
	}
}

if ( ! function_exists( 'add_post_meta' ) ) {
	function add_post_meta( $post_id, $meta_key, $meta_value, $unique = false ) {
		MetaStore::add( (int) $post_id, (string) $meta_key, $meta_value );
		return true;
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

// --- Theme Builder importer stubs ---------------------------------------------

if ( ! defined( 'WP_CONTENT_DIR' ) ) {
	define( 'WP_CONTENT_DIR', sys_get_temp_dir() . '/dti-test-wp-content-nonexistent' );
}

if ( ! function_exists( 'sanitize_key' ) ) {
	function sanitize_key( $key ) {
		return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $key ) );
	}
}

if ( ! function_exists( 'wp_slash' ) ) {
	function wp_slash( $value ) {
		return $value;
	}
}

if ( ! function_exists( 'is_wp_error' ) ) {
	function is_wp_error( $thing ) {
		return $thing instanceof WP_Error;
	}
}

if ( ! function_exists( 'wp_insert_post' ) ) {
	function wp_insert_post( $postarr, $wp_error = false ) {
		return PostStore::insert( $postarr );
	}
}

if ( ! function_exists( 'wp_update_post' ) ) {
	function wp_update_post( $postarr, $wp_error = false ) {
		return PostStore::update( $postarr );
	}
}

if ( ! function_exists( 'get_post' ) ) {
	function get_post( $id ) {
		return PostStore::get( (int) $id );
	}
}

if ( ! function_exists( 'clean_post_cache' ) ) {
	function clean_post_cache( $id ) {
		// No-op — no object cache in tests.
	}
}

if ( ! function_exists( 'get_posts' ) ) {
	function get_posts( array $args ) {
		return PostStore::find_ids_by_type_and_meta(
			(string) ( $args['post_type'] ?? '' ),
			(string) ( $args['meta_key'] ?? '' ),
			(string) ( $args['meta_value'] ?? '' )
		);
	}
}

if ( ! class_exists( 'ET_Theme_Builder_Request' ) ) {
	// Presence signals "Divi Theme Builder is loaded" to DTI_ThemeBuilderImporter::import().
	class ET_Theme_Builder_Request {}
}

if ( ! function_exists( 'et_theme_builder_get_theme_builder_post_id' ) ) {
	function et_theme_builder_get_theme_builder_post_id( $create = true, $unknown = true ) {
		return ThemeBuilderTestFixtures::$theme_builder_post_id;
	}
}

// Minimal $wpdb stub — DTI_ThemeBuilderImporter writes post_content directly via
// $wpdb->update() to bypass wp_kses_post()/balanceTags() corrupting block markup.
final class DTI_Test_WPDB {
	public $posts = 'wp_posts';
	public function update( $table, array $data, array $where ) {
		if ( isset( $where['ID'] ) && array_key_exists( 'post_content', $data ) ) {
			PostStore::set_content( (int) $where['ID'], (string) $data['post_content'] );
		}
		return 1;
	}
}
$GLOBALS['wpdb'] = new DTI_Test_WPDB();

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
require_once $src . '/ThemeBuilderImporter.php';
