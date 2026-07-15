<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_Limits {

	const RATE_LIMIT_FREE = 30;
	const RATE_LIMIT_PRO  = 120;

	public static function is_pro(): bool {
		// Dev/staging escape hatch, premium build only (D1, decided 15/07/2026).
		// This whole block is stripped from the free/.org build by Freemius's
		// build processor (see the is__premium_only() wrapper) — a free-build
		// user can't bypass licensing by editing wp-config. Without it, a site
		// with no working Freemius product resolves to Free, and since page
		// creation is Pro (PRD §3.2) every page import 403s — including our own
		// dev sites, where the Freemius id was still Airloop's. Set in
		// wp-config.php on a premium-build dev/staging site:
		//
		//     define( 'D5G_ASSUME_PRO', true );
		//
		if ( function_exists( 'dg_fs' ) && dg_fs()->is__premium_only() ) {
			if ( defined( 'D5G_ASSUME_PRO' ) && D5G_ASSUME_PRO ) {
				return true;
			}
		}

		return function_exists( 'dg_fs' ) && dg_fs()->is_paying();
	}

	public static function get_rate_limit_max(): int {
		return self::is_pro() ? self::RATE_LIMIT_PRO : self::RATE_LIMIT_FREE;
	}
}
