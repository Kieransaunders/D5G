<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Fallback adapter — used when no supported SEO plugin is active.
 *
 * Persists title / description / focus keyword to neutral _d5g_seo_* post meta
 * (read back by PagesLister::design_hint and surfaced in the import response
 * as a "set manually in your SEO plugin" warning). Always matches.
 */
class D5G_Seo_Fallback extends D5G_Seo_AdapterBase {

	public function id(): string {
		return 'fallback';
	}

	public function detect(): bool {
		return D5G_Seo_Detector::signal( 'fallback' );
	}

	public function write( int $page_id, array $seo ): array {
		$written = array();

		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, '_d5g_seo_title', $seo['title'], 'title', $written );
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, '_d5g_seo_description', $seo['description'], 'description', $written );
		}
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$this->store( $page_id, '_d5g_seo_focuskw', $seo['focusKeyword'], 'focusKeyword', $written );
		}

		// Fallback reports null so callers can distinguish "no SEO plugin".
		return $this->result( null, $written );
	}
}
