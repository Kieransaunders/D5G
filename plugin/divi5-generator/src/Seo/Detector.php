<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Resolves which SEO adapter applies to the current site.
 *
 * Default evaluation order (design D2):
 *   1. Rank Math  — class_exists('RankMath\File')
 *   2. Yoast      — defined('WPSEO_VERSION')
 *   3. AIOSEO     — defined('AIOSEO_VERSION') || class_exists('AIOSEO\Plugin\AIOSEO')
 *   4. SEOPress   — defined('SEOPRESS_VERSION') || function_exists('seopress_get_option')
 *   5. TSF        — defined('THE_SEO_FRAMEWORK_VERSION')
 *   6. Fallback   — always matches
 *
 * The order is filterable via `d5g/seo/adapter_order` (return a reordered
 * array of adapter ids). Unknown ids in the filter are ignored; the Fallback
 * id ('fallback') is always appended last if not present.
 *
 * Detection is centralised in signal() rather than scattered across adapters
 * so tests can override the environment via set_signals() without needing
 * uopz/runkit to redefine PHP's built-in defined()/class_exists().
 */
class D5G_Seo_Detector {

	/**
	 * Test override map. When non-null, signal() reads from here instead of
	 * probing the real environment. Null in production.
	 *
	 * @var array<string,bool>|null
	 */
	private static $signals_override = null;

	/**
	 * Adapter id → class name. Order here is the canonical default.
	 */
	private static function adapters(): array {
		return array(
			'rank_math' => D5G_Seo_RankMath::class,
			'yoast'     => D5G_Seo_Yoast::class,
			'aioseo'    => D5G_Seo_AIOSEO::class,
			'seopress'  => D5G_Seo_SEOPress::class,
			'tsf'       => D5G_Seo_TSF::class,
			'fallback'  => D5G_Seo_Fallback::class,
		);
	}

	/**
	 * Probe the environment for one adapter's detection signal. Centralised so
	 * tests can override via set_signals() instead of redefining PHP builtins.
	 *
	 * @param string $id Adapter id (rank_math, yoast, aioseo, seopress, tsf, fallback).
	 */
	public static function signal( string $id ): bool {
		if ( self::$signals_override !== null ) {
			return ! empty( self::$signals_override[ $id ] );
		}

		switch ( $id ) {
			case 'rank_math':
				return class_exists( 'RankMath\File' ) || class_exists( 'RankMath' );
			case 'yoast':
				return defined( 'WPSEO_VERSION' );
			case 'aioseo':
				return defined( 'AIOSEO_VERSION' ) || class_exists( 'AIOSEO\Plugin\AIOSEO' );
			case 'seopress':
				return defined( 'SEOPRESS_VERSION' ) || function_exists( 'seopress_get_option' );
			case 'tsf':
				return defined( 'THE_SEO_FRAMEWORK_VERSION' );
			case 'fallback':
				return true;
		}
		return false;
	}

	/**
	 * Override detection signals (for tests). Pass an map like
	 * `['yoast' => true, 'rank_math' => false, ...]`; omitted ids read as false
	 * (except 'fallback' which always reads true). Pass null to clear.
	 *
	 * @internal Test harness only.
	 */
	public static function set_signals( ?array $overrides ): void {
		self::$signals_override = $overrides;
	}

	/**
	 * Return the first adapter whose detect() is true. The Fallback adapter
	 * always matches, so this never returns null.
	 */
	public static function resolve(): D5G_Seo_Adapter {
		$registry = self::adapters();
		$order    = self::ordered_ids( array_keys( $registry ) );

		foreach ( $order as $id ) {
			if ( ! isset( $registry[ $id ] ) ) {
				continue;
			}
			$class    = $registry[ $id ];
			$instance = new $class();
			if ( $instance->detect() ) {
				return $instance;
			}
		}

		// Defensive: should be unreachable because Fallback always matches.
		return new D5G_Seo_Fallback();
	}

	/**
	 * Resolve the adapter and return just its id (or null for Fallback).
	 * Convenience for GET /ping and other callers that only need the label.
	 */
	public static function detect_id(): ?string {
		$adapter = self::resolve();
		$id      = $adapter->id();
		return ( $id === 'fallback' ) ? null : $id;
	}

	/**
	 * Apply the d5g/seo/adapter_order filter. Ensures 'fallback' is always
	 * last and that any unknown ids from the filter are dropped.
	 */
	private static function ordered_ids( array $default_ids ): array {
		$filtered = apply_filters( 'd5g/seo/adapter_order', $default_ids );
		if ( ! is_array( $filtered ) ) {
			return $default_ids;
		}

		$registry_keys = array( 'rank_math', 'yoast', 'aioseo', 'seopress', 'tsf', 'fallback' );

		// Drop unknown ids and de-duplicate, preserving the filtered order.
		$clean = array();
		foreach ( $filtered as $id ) {
			if ( is_string( $id ) && in_array( $id, $registry_keys, true ) && ! in_array( $id, $clean, true ) ) {
				$clean[] = $id;
			}
		}

		// Ensure every registered id is present (filter may have removed some),
		// with 'fallback' forced last.
		foreach ( $registry_keys as $id ) {
			if ( $id === 'fallback' ) {
				continue;
			}
			if ( ! in_array( $id, $clean, true ) ) {
				$clean[] = $id;
			}
		}
		if ( ! in_array( 'fallback', $clean, true ) ) {
			$clean[] = 'fallback';
		} elseif ( $clean[ count( $clean ) - 1 ] !== 'fallback' ) {
			// Move fallback to the end if the filter put it elsewhere.
			$clean = array_diff( $clean, array( 'fallback' ) );
			$clean[] = 'fallback';
		}

		return $clean;
	}
}
