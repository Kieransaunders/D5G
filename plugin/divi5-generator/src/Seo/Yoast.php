<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Yoast SEO adapter.
 *
 * Detection: defined( 'WPSEO_VERSION' ).
 * Native meta keys (per Yoast 14–23+, stable across releases):
 *   _yoast_wpseo_title, _yoast_wpseo_metadesc,
 *   _yoast_wpseo_focuskw (primary), _yoast_wpseo_focuskeys (JSON array incl. primary),
 *   _yoast_wpseo_opengraph-{title,description,image},
 *   _yoast_wpseo_twitter-{title,description,image},
 *   _yoast_wpseo_canonical,
 *   _yoast_wpseo_meta-robots-noindex ('1' to noindex),
 *   _yoast_wpseo_meta-robots-nofollow ('1' to nofollow),
 *   _yoast_wpseo_meta-robots-advanced (comma-separated advanced directives).
 */
class D5G_Seo_Yoast extends D5G_Seo_AdapterBase {

	public function id(): string {
		return 'yoast';
	}

	public function detect(): bool {
		return D5G_Seo_Detector::signal( 'yoast' );
	}

	public function write( int $page_id, array $seo ): array {
		$written = array();

		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, '_yoast_wpseo_title', $seo['title'], 'title', $written );
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, '_yoast_wpseo_metadesc', $seo['description'], 'description', $written );
		}

		// Focus keyword (primary). Yoast stores the primary in _focuskw and the
		// full list (incl. primary as [0]) in _focuskeys as JSON.
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$this->store( $page_id, '_yoast_wpseo_focuskw', $seo['focusKeyword'], 'focusKeyword', $written );

			$keys   = array( $seo['focusKeyword'] );
			if ( ! empty( $seo['secondaryKeywords'] ) && is_array( $seo['secondaryKeywords'] ) ) {
				foreach ( $seo['secondaryKeywords'] as $kw ) {
					if ( is_string( $kw ) && $kw !== '' && ! in_array( $kw, $keys, true ) ) {
						$keys[] = $kw;
					}
				}
			}
			if ( count( $keys ) > 1 ) {
				$this->store( $page_id, '_yoast_wpseo_focuskeys', wp_json_encode( $keys ), 'secondaryKeywords', $written );
			}
		}

		// OpenGraph.
		if ( ! empty( $seo['og'] ) && is_array( $seo['og'] ) ) {
			foreach ( array( 'title', 'description', 'image' ) as $f ) {
				if ( ! empty( $seo['og'][ $f ] ) ) {
					$this->store( $page_id, '_yoast_wpseo_opengraph-' . $f, $seo['og'][ $f ], 'og.' . $f, $written );
				}
			}
		}

		// Twitter.
		if ( ! empty( $seo['twitter'] ) && is_array( $seo['twitter'] ) ) {
			foreach ( array( 'title', 'description', 'image' ) as $f ) {
				if ( ! empty( $seo['twitter'][ $f ] ) ) {
					$this->store( $page_id, '_yoast_wpseo_twitter-' . $f, $seo['twitter'][ $f ], 'twitter.' . $f, $written );
				}
			}
		}

		// Canonical.
		if ( ! empty( $seo['canonical'] ) ) {
			$this->store( $page_id, '_yoast_wpseo_canonical', $seo['canonical'], 'canonical', $written );
		}

		// Robots — three-state: absent preserves, true sets, false clears.
		if ( ! empty( $seo['robots'] ) && is_array( $seo['robots'] ) ) {
			if ( isset( $seo['robots']['noindex'] ) ) {
				if ( $seo['robots']['noindex'] ) {
					$this->store( $page_id, '_yoast_wpseo_meta-robots-noindex', '1', 'robots.noindex', $written );
				} else {
					$this->clear( $page_id, '_yoast_wpseo_meta-robots-noindex', 'robots.noindex', $written );
				}
			}
			if ( isset( $seo['robots']['nofollow'] ) ) {
				if ( $seo['robots']['nofollow'] ) {
					$this->store( $page_id, '_yoast_wpseo_meta-robots-nofollow', '1', 'robots.nofollow', $written );
				} else {
					$this->clear( $page_id, '_yoast_wpseo_meta-robots-nofollow', 'robots.nofollow', $written );
				}
			}
			if ( ! empty( $seo['robots']['advanced'] ) ) {
				$this->store( $page_id, '_yoast_wpseo_meta-robots-advanced', $seo['robots']['advanced'], 'robots.advanced', $written );
			}
		}

		return $this->result( $this->id(), $written );
	}
}
