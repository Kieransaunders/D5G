<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * SEOPress adapter.
 *
 * Detection: defined( 'SEOPRESS_VERSION' ) || function_exists( 'seopress_get_option' ).
 *
 * Native meta keys (SEOPress 5–7+):
 *   _seopress_titles_title, _seopress_titles_desc,
 *   _seopress_analysis_target_kw (focus keyphrase, comma-joined with secondaries),
 *   _seopress_social_og_title / _seopress_social_og_desc / _seopress_social_og_img,
 *   _seopress_social_twitter_title / _seopress_social_twitter_desc / _seopress_social_twitter_img,
 *   _seopress_titles_canonical,
 *   _seopress_titles_indexing ('yes' = noindex).
 *
 * For SEOPRESS_VERSION < 7, also writes the legacy _seopress_meta_title key
 * (deprecated in 5.x, removed in 7.x) for back-compat.
 */
class D5G_Seo_SEOPress extends D5G_Seo_AdapterBase {

	public function id(): string {
		return 'seopress';
	}

	public function detect(): bool {
		return D5G_Seo_Detector::signal( 'seopress' );
	}

	public function write( int $page_id, array $seo ): array {
		$written          = array();
		$legacy_meta      = defined( 'SEOPRESS_VERSION' ) && version_compare( SEOPRESS_VERSION, '7.0.0', '<' );

		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, '_seopress_titles_title', $seo['title'], 'title', $written );
			if ( $legacy_meta ) {
				update_post_meta( $page_id, '_seopress_meta_title', $seo['title'] );
			}
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, '_seopress_titles_desc', $seo['description'], 'description', $written );
		}

		// Focus keyphrase + secondaries — SEOPress stores a single comma-joined
		// string in _seopress_analysis_target_kw.
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$kw = $seo['focusKeyword'];
			if ( ! empty( $seo['secondaryKeywords'] ) && is_array( $seo['secondaryKeywords'] ) ) {
				$kw = implode( ', ', array_merge( array( $seo['focusKeyword'] ), $seo['secondaryKeywords'] ) );
			}
			$this->store( $page_id, '_seopress_analysis_target_kw', $kw, 'focusKeyword', $written );
		}

		// OpenGraph.
		if ( ! empty( $seo['og'] ) && is_array( $seo['og'] ) ) {
			$map = array(
				'title'       => '_seopress_social_og_title',
				'description' => '_seopress_social_og_desc',
				'image'       => '_seopress_social_og_img',
			);
			foreach ( $map as $f => $key ) {
				if ( ! empty( $seo['og'][ $f ] ) ) {
					$this->store( $page_id, $key, $seo['og'][ $f ], 'og.' . $f, $written );
				}
			}
		}

		// Twitter.
		if ( ! empty( $seo['twitter'] ) && is_array( $seo['twitter'] ) ) {
			$map = array(
				'title'       => '_seopress_social_twitter_title',
				'description' => '_seopress_social_twitter_desc',
				'image'       => '_seopress_social_twitter_img',
			);
			foreach ( $map as $f => $key ) {
				if ( ! empty( $seo['twitter'][ $f ] ) ) {
					$this->store( $page_id, $key, $seo['twitter'][ $f ], 'twitter.' . $f, $written );
				}
			}
		}

		// Canonical.
		if ( ! empty( $seo['canonical'] ) ) {
			$this->store( $page_id, '_seopress_titles_canonical', $seo['canonical'], 'canonical', $written );
		}

		// Robots — 'yes' in _seopress_titles_indexing means "noindex".
		if ( ! empty( $seo['robots'] ) && is_array( $seo['robots'] ) ) {
			if ( isset( $seo['robots']['noindex'] ) ) {
				$this->store( $page_id, '_seopress_titles_indexing', $seo['robots']['noindex'] ? 'yes' : 'no', 'robots.noindex', $written );
			}
		}

		return $this->result( $this->id(), $written );
	}
}
