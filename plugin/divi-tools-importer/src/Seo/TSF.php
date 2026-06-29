<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The SEO Framework (TSF) adapter.
 *
 * Detection: defined( 'THE_SEO_FRAMEWORK_VERSION' ).
 *
 * TSF uses the Genesis-style meta keys (it shares lineage with the Genesis SEO
 * framework). The free version of TSF has no native focus-keyword field, so the
 * focus keyword is persisted to the neutral _dti_seo_focuskw key for
 * traceability (it surfaces in GET /pages design_hint if no title is present).
 */
class DTI_Seo_TSF extends DTI_Seo_AdapterBase {

	public function id(): string {
		return 'tsf';
	}

	public function detect(): bool {
		return DTI_Seo_Detector::signal( 'tsf' );
	}

	public function write( int $page_id, array $seo ): array {
		$written = array();

		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, '_genesis_title', $seo['title'], 'title', $written );
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, '_genesis_description', $seo['description'], 'description', $written );
		}

		// TSF free has no native focus-keyword field; persist to neutral key
		// so the value is not lost and is visible to GET /pages design_hint.
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$this->store( $page_id, '_dti_seo_focuskw', $seo['focusKeyword'], 'focusKeyword', $written );
		}

		// OpenGraph (Facebook).
		if ( ! empty( $seo['og'] ) && is_array( $seo['og'] ) ) {
			$map = array(
				'title'       => '_social_title_fb',
				'description' => '_social_description_fb',
				'image'       => '_social_image_fb',
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
				'title'       => '_social_title_t',
				'description' => '_social_description_t',
				'image'       => '_social_image_t',
			);
			foreach ( $map as $f => $key ) {
				if ( ! empty( $seo['twitter'][ $f ] ) ) {
					$this->store( $page_id, $key, $seo['twitter'][ $f ], 'twitter.' . $f, $written );
				}
			}
		}

		// Canonical.
		if ( ! empty( $seo['canonical'] ) ) {
			$this->store( $page_id, '_canonical', $seo['canonical'], 'canonical', $written );
		}

		// Robots.
		if ( ! empty( $seo['robots'] ) && is_array( $seo['robots'] ) ) {
			if ( ! empty( $seo['robots']['noindex'] ) ) {
				$this->store( $page_id, '_genesis_noindex', '1', 'robots.noindex', $written );
			}
			if ( ! empty( $seo['robots']['nofollow'] ) ) {
				$this->store( $page_id, '_genesis_nofollow', '1', 'robots.nofollow', $written );
			}
		}

		return $this->result( $this->id(), $written );
	}
}
