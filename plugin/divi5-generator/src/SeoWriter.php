<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * SEO persistence facade.
 *
 * Thin entry point kept for back-compat with the existing PageImporter call
 * site. Delegates to the adapter selected by D5G_Seo_Detector after running
 * the payload through D5G_Seo_Normaliser.
 *
 * Return shape (changed in 1.6.0):
 *     array{ plugin: string|null, fields_written: string[] }
 *
 * `plugin` is null when no supported SEO plugin is active (Fallback adapter).
 */
class D5G_SeoWriter {

	/**
	 * Normalise the payload, resolve the active adapter, and persist.
	 *
	 * @param int   $page_id Target post ID.
	 * @param array $seo     Raw SEO payload (aliases and optional fields OK).
	 * @return array{plugin:string|null, fields_written:string[]}
	 */
	public static function write( int $page_id, array $seo ): array {
		$normalised = D5G_Seo_Normaliser::normalise( $seo );
		$adapter    = D5G_Seo_Detector::resolve();
		return $adapter->write( $page_id, $normalised );
	}
}
