<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_Limits {

	const RATE_LIMIT_FREE = 30;
	const RATE_LIMIT_PRO  = 120;

	public static function is_pro(): bool {
		return function_exists( 'dg_fs' ) && dg_fs()->is_paying();
	}

	public static function get_rate_limit_max(): int {
		return self::is_pro() ? self::RATE_LIMIT_PRO : self::RATE_LIMIT_FREE;
	}
}
