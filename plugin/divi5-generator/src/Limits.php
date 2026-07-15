<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_Limits {

	const RATE_LIMIT_FREE = 30;
	const RATE_LIMIT_PRO  = 120;

	public static function is_pro(): bool {
		// Dev/staging escape hatch. Without it, a site with no working Freemius
		// product resolves to Free, and since page creation is Pro (PRD §3.2)
		// every page import 403s — including on our own dev sites, where the
		// Freemius id is still Airloop's. Set in wp-config.php:
		//
		//     define( 'D5G_ASSUME_PRO', true );
		//
		// DECISION NEEDED before .org submission: this is a documented licence
		// bypass. It does not weaken security much in absolute terms — any
		// self-hosted PHP licence check is defeated by editing one line of the
		// plugin — but it lowers the bar from "edit plugin source" to "edit
		// wp-config", which is a real difference in practice. Keep it (the
		// toolkit is the actual gate per §3.1, and the connector's Pro features
		// are workflow conveniences), or strip it from the free build via the
		// Freemius premium-only annotations (F2). Do not leave it undecided.
		if ( defined( 'D5G_ASSUME_PRO' ) && D5G_ASSUME_PRO ) {
			return true;
		}

		return function_exists( 'dg_fs' ) && dg_fs()->is_paying();
	}

	public static function get_rate_limit_max(): int {
		return self::is_pro() ? self::RATE_LIMIT_PRO : self::RATE_LIMIT_FREE;
	}
}
