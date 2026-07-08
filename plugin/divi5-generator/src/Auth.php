<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_Auth {

	const KEY_OPTION  = 'd5g_api_key_hash';
	const LOG_OPTION  = 'd5g_import_log';
	const RATE_OPTION = 'd5g_rate_limit';

	public static function maybe_generate_key(): void {
		if ( ! get_option( self::KEY_OPTION ) ) {
			self::generate_key();
		}
	}

	public static function generate_key(): string {
		$key = 'd5gk_' . bin2hex( random_bytes( 24 ) );
		update_option( self::KEY_OPTION, wp_hash_password( $key ), false );
		update_option( 'd5g_api_key_plain', $key, false );
		return $key;
	}

	public static function verify( string $key ): bool {
		$hash = get_option( self::KEY_OPTION );
		if ( ! $hash ) {
			return false;
		}
		return wp_check_password( $key, $hash );
	}

	/**
	 * Per-IP rate limit: 30 req/min free, 120 req/min Pro.
	 */
	public static function check_rate_limit(): bool {
		$max    = D5G_Limits::get_rate_limit_max();
		$ip     = sanitize_text_field( $_SERVER['REMOTE_ADDR'] ?? 'unknown' );
		$key    = self::RATE_OPTION . '_' . md5( $ip );
		$data   = get_transient( $key );
		$count  = is_array( $data ) ? (int) $data['count'] : 0;

		if ( $count >= $max ) {
			return false;
		}

		set_transient( $key, array( 'count' => $count + 1 ), 60 );
		return true;
	}

	public static function log_import( array $entry ): void {
		$log   = get_option( self::LOG_OPTION, array() );
		array_unshift( $log, array_merge( $entry, array( 'time' => gmdate( 'Y-m-d H:i:s' ) ) ) );
		$log   = array_slice( $log, 0, 50 ); // keep last 50
		update_option( self::LOG_OPTION, $log, false );
	}

	public static function get_log(): array {
		return get_option( self::LOG_OPTION, array() );
	}
}
