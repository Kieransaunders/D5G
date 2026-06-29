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
