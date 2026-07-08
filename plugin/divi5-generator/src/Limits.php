<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_Limits {

	const PAGE_IMPORT_LIMIT    = 10;
	const LIBRARY_IMPORT_LIMIT = 5;
	const RATE_LIMIT_FREE      = 30;
	const RATE_LIMIT_PRO       = 120;

	public static function is_pro(): bool {
		return function_exists( 'dg_fs' ) && dg_fs()->is_paying();
	}

	public static function get_rate_limit_max(): int {
		return self::is_pro() ? self::RATE_LIMIT_PRO : self::RATE_LIMIT_FREE;
	}

	public static function can_import_page(): bool|WP_Error {
		if ( self::is_pro() ) {
			return true;
		}

		$usage = self::get_usage();

		if ( $usage['page_imports'] >= self::PAGE_IMPORT_LIMIT ) {
			return new WP_Error(
				'limit_reached',
				sprintf(
					'Free plan: %d page imports per month. Upgrade to Pro for unlimited: %s',
					self::PAGE_IMPORT_LIMIT,
					self::upgrade_url()
				),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	public static function can_import_library(): bool|WP_Error {
		if ( self::is_pro() ) {
			return true;
		}

		$usage = self::get_usage();

		if ( $usage['library_imports'] >= self::LIBRARY_IMPORT_LIMIT ) {
			return new WP_Error(
				'limit_reached',
				sprintf(
					'Free plan: %d library item imports per month. Upgrade to Pro for unlimited: %s',
					self::LIBRARY_IMPORT_LIMIT,
					self::upgrade_url()
				),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	public static function increment_page_import(): void {
		if ( self::is_pro() ) {
			return;
		}

		$usage = self::get_usage();
		$usage['page_imports']++;
		self::save_usage( $usage );
	}

	public static function increment_library_import( int $count = 1 ): void {
		if ( self::is_pro() ) {
			return;
		}

		$usage = self::get_usage();
		$usage['library_imports'] += $count;
		self::save_usage( $usage );
	}

	public static function get_usage(): array {
		$key   = '_d5g_usage_' . gmdate( 'Y-m' );
		$usage = get_option( $key, array() );

		if ( ! isset( $usage['page_imports'] ) ) {
			$usage['page_imports'] = 0;
		}
		if ( ! isset( $usage['library_imports'] ) ) {
			$usage['library_imports'] = 0;
		}

		return $usage;
	}

	private static function save_usage( array $usage ): void {
		$key = '_d5g_usage_' . gmdate( 'Y-m' );
		update_option( $key, $usage, false );
	}

	private static function upgrade_url(): string {
		if ( function_exists( 'dg_fs' ) ) {
			return dg_fs()->get_upgrade_url();
		}
		return '';
	}
}
