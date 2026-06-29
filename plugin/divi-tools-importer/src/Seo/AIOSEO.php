<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * All in One SEO (AIOSEO) adapter.
 *
 * Detection: defined( 'AIOSEO_VERSION' ) || class_exists( 'AIOSEO\Plugin\AIOSEO' ).
 *
 * AIOSEO 4.x stores most post-level settings inside a single JSON envelope at
 * `_aioseo_posts_data`. We read-merge-write that envelope, AND write the flat
 * classic keys (`_aioseo_title`, `_aioseo_description`, `_aioseo_focus_keyphrase`)
 * for back-compat with AIOSEO ≤ 3.x and with templates that read the flat keys.
 *
 * Envelope paths merged:
 *   title, description, keyphrase.focus_page, og.title, og.description,
 *   twitter.title, twitter.description, canonical_url, robots.default.noindex,
 *   robots.default.nofollow, robots.advanced.og_images_only / etc.
 */
class DTI_Seo_AIOSEO extends DTI_Seo_AdapterBase {

	public function id(): string {
		return 'aioseo';
	}

	public function detect(): bool {
		return DTI_Seo_Detector::signal( 'aioseo' );
	}

	public function write( int $page_id, array $seo ): array {
		$written = array();

		// Flat keys (classic AIOSEO ≤ 3.x + template back-compat).
		if ( ! empty( $seo['title'] ) ) {
			$this->store( $page_id, '_aioseo_title', $seo['title'], 'title', $written );
		}
		if ( ! empty( $seo['description'] ) ) {
			$this->store( $page_id, '_aioseo_description', $seo['description'], 'description', $written );
		}
		if ( ! empty( $seo['focusKeyword'] ) ) {
			$this->store( $page_id, '_aioseo_focus_keyphrase', $seo['focusKeyword'], 'focusKeyword', $written );
		}

		// JSON envelope merge (AIOSEO 4.x).
		$envelope = $this->read_envelope( $page_id );
		$changed  = false;

		if ( ! empty( $seo['title'] ) ) {
			$envelope['title'] = $seo['title'];
			$changed = true;
		}
		if ( ! empty( $seo['description'] ) ) {
			$envelope['description'] = $seo['description'];
			$changed = true;
		}
		if ( ! empty( $seo['focusKeyword'] ) ) {
			if ( ! isset( $envelope['keyphrase'] ) || ! is_array( $envelope['keyphrase'] ) ) {
				$envelope['keyphrase'] = array();
			}
			$envelope['keyphrase']['focus_page'] = $seo['focusKeyword'];
			$changed = true;
		}
		if ( ! empty( $seo['og'] ) && is_array( $seo['og'] ) ) {
			foreach ( array( 'title', 'description', 'image' ) as $f ) {
				if ( ! empty( $seo['og'][ $f ] ) ) {
					$envelope['og'][ $f ] = $seo['og'][ $f ];
					$changed = true;
					if ( ! in_array( 'og.' . $f, $written, true ) ) {
						$written[] = 'og.' . $f;
					}
				}
			}
		}
		if ( ! empty( $seo['twitter'] ) && is_array( $seo['twitter'] ) ) {
			foreach ( array( 'title', 'description', 'image' ) as $f ) {
				if ( ! empty( $seo['twitter'][ $f ] ) ) {
					$envelope['twitter'][ $f ] = $seo['twitter'][ $f ];
					$changed = true;
					if ( ! in_array( 'twitter.' . $f, $written, true ) ) {
						$written[] = 'twitter.' . $f;
					}
				}
			}
		}
		if ( ! empty( $seo['canonical'] ) ) {
			$envelope['canonical_url'] = $seo['canonical'];
			$changed = true;
			if ( ! in_array( 'canonical', $written, true ) ) {
				$written[] = 'canonical';
			}
		}
		if ( ! empty( $seo['robots'] ) && is_array( $seo['robots'] ) ) {
			if ( ! isset( $envelope['robots']['default'] ) || ! is_array( $envelope['robots']['default'] ) ) {
				$envelope['robots']['default'] = array();
			}
			// Three-state: absent preserves existing envelope value; present
			// (true or false) overwrites — false clears back to indexable.
			if ( isset( $seo['robots']['noindex'] ) ) {
				$envelope['robots']['default']['noindex'] = ! empty( $seo['robots']['noindex'] );
			}
			if ( isset( $seo['robots']['nofollow'] ) ) {
				$envelope['robots']['default']['nofollow'] = ! empty( $seo['robots']['nofollow'] );
			}
			if ( ! empty( $seo['robots']['advanced'] ) ) {
				$envelope['robots']['advanced'] = $seo['robots']['advanced'];
			}
			$changed = true;
			if ( ! in_array( 'robots', $written, true ) ) {
				$written[] = 'robots';
			}
		}

		if ( $changed ) {
			update_post_meta( $page_id, '_aioseo_posts_data', wp_json_encode( $envelope ) );
		}

		return $this->result( $this->id(), $written );
	}

	/**
	 * Read the existing _aioseo_posts_data envelope as an associative array.
	 * Returns an empty array if absent or unparseable (never throws — a corrupt
	 * envelope must not block the import).
	 */
	private function read_envelope( int $page_id ): array {
		$raw = get_post_meta( $page_id, '_aioseo_posts_data', true );
		if ( ! is_string( $raw ) || $raw === '' ) {
			return array();
		}
		$decoded = json_decode( $raw, true );
		return is_array( $decoded ) ? $decoded : array();
	}
}
