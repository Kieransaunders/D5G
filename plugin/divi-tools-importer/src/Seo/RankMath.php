<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Rank Math SEO adapter.
 *
 * Detection: class_exists( 'RankMath\File' ) — the canonical entry class.
 * Native meta keys:
 *   rank_math_title, rank_math_description,
 *   rank_math_focus_keyword (primary), rank_math_focus_keywords (JSON array incl. primary),
 *   rank_math_facebook_title / rank_math_facebook_description / rank_math_facebook_image,
 *   rank_math_twitter_title / rank_math_twitter_description / rank_math_twitter_image,
 *   rank_math_canonical_url,
 *   rank_math_robots (JSON object: { index: 'index'|'noindex', follow: 'follow'|'nofollow', advanced: '...' }).
 */
class DTI_Seo_RankMath extends DTI_Seo_AdapterBase {

	public function id(): string {
		return 'rank_math';
	}

	public function detect(): bool {
		return DTI_Seo_Detector::signal( 'rank_math' );
	}

	public function write( int $page_id, array $seo ): array {
		$written = array();

		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, 'rank_math_title', $seo['title'], 'title', $written );
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, 'rank_math_description', $seo['description'], 'description', $written );
		}

		// Focus keyword(s). rank_math_focus_keyword = primary (string);
		// rank_math_focus_keywords = full set as JSON (primary first).
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$this->store( $page_id, 'rank_math_focus_keyword', $seo['focusKeyword'], 'focusKeyword', $written );

			$keys = array( $seo['focusKeyword'] );
			if ( ! empty( $seo['secondaryKeywords'] ) && is_array( $seo['secondaryKeywords'] ) ) {
				foreach ( $seo['secondaryKeywords'] as $kw ) {
					if ( is_string( $kw ) && $kw !== '' && ! in_array( $kw, $keys, true ) ) {
						$keys[] = $kw;
					}
				}
			}
			$this->store( $page_id, 'rank_math_focus_keywords', wp_json_encode( $keys ), 'secondaryKeywords', $written );
		}

		// OpenGraph (Rank Math calls these "facebook").
		if ( ! empty( $seo['og'] ) && is_array( $seo['og'] ) ) {
			$map = array(
				'title'       => 'rank_math_facebook_title',
				'description' => 'rank_math_facebook_description',
				'image'       => 'rank_math_facebook_image',
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
				'title'       => 'rank_math_twitter_title',
				'description' => 'rank_math_twitter_description',
				'image'       => 'rank_math_twitter_image',
			);
			foreach ( $map as $f => $key ) {
				if ( ! empty( $seo['twitter'][ $f ] ) ) {
					$this->store( $page_id, $key, $seo['twitter'][ $f ], 'twitter.' . $f, $written );
				}
			}
		}

		// Canonical.
		if ( ! empty( $seo['canonical'] ) ) {
			$this->store( $page_id, 'rank_math_canonical_url', $seo['canonical'], 'canonical', $written );
		}

		// Robots — stored as a JSON object. Read-merge-write so a user-set
		// 'advanced' directive is preserved when only noindex is supplied.
		if ( ! empty( $seo['robots'] ) && is_array( $seo['robots'] ) ) {
			$existing = get_post_meta( $page_id, 'rank_math_robots', true );
			$robots   = is_array( $existing ) ? $existing : array();
			$robots['index']    = ! empty( $seo['robots']['noindex'] ) ? 'noindex' : 'index';
			$robots['follow']   = ! empty( $seo['robots']['nofollow'] ) ? 'nofollow' : 'follow';
			if ( ! empty( $seo['robots']['advanced'] ) ) {
				$robots['advanced'] = $seo['robots']['advanced'];
			}
			$this->store( $page_id, 'rank_math_robots', wp_json_encode( $robots ), 'robots', $written );
		}

		return $this->result( $this->id(), $written );
	}
}
