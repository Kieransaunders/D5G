<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Contract for an SEO-plugin adapter.
 *
 * One implementing class per supported SEO plugin (Yoast, Rank Math, AIOSEO,
 * SEOPress, The SEO Framework) plus a Fallback. The Detector returns the first
 * adapter whose detect() is true, in the order defined in design D2.
 *
 * write() receives a *normalised* SEO payload (see D5G_Seo_Normaliser) — never
 * raw request input — and returns an array describing what was persisted:
 *
 *     [ 'plugin' => 'yoast'|'rankmath'|'aioseo'|'seopress'|'tsf'|null,
 *       'fields_written' => [ 'title', 'description', 'focusKeyword', 'og.title', ... ] ]
 *
 * `plugin` is null on the Fallback adapter so callers can distinguish
 * "no SEO plugin active" from "wrote to a real plugin".
 */
interface D5G_Seo_Adapter {

	/**
	 * Stable adapter identifier. Lowercase, no spaces. Used in ping/import
	 * responses and in the d5g/seo/adapter_order filter.
	 */
	public function id(): string;

	/**
	 * Return true when this adapter's SEO plugin is active on the site.
	 * MUST be side-effect-free (class/constant checks only — no plugin API calls).
	 */
	public function detect(): bool;

	/**
	 * Persist the normalised SEO payload to the plugin's native post-meta keys.
	 * Empty/absent fields MUST be skipped — never overwrite a user-set value.
	 *
	 * @param int   $page_id Target post ID.
	 * @param array $seo     Normalised payload (see D5G_Seo_Normaliser::normalise()).
	 * @return array{plugin:string|null, fields_written:string[]}
	 */
	public function write( int $page_id, array $seo ): array;
}
