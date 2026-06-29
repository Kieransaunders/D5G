<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Normalises the raw `seo` payload from the REST request into a stable shape
 * that adapters can consume without re-implementing alias resolution and type
 * coercion in every class.
 *
 * Input shape (all optional, aliases accepted):
 *   {
 *     title | titleTag, description | metaDescription, slug,
 *     focusKeyword | keyword, secondaryKeywords[],
 *     og{title,description,image},
 *     twitter{title,description,image},
 *     canonical, robots{noindex,nofollow,advanced}
 *   }
 *
 * Output shape (only non-empty keys present):
 *   {
 *     title?:string, description?:string, focusKeyword?:string,
 *     secondaryKeywords?:string[], og?:array, twitter?:array,
 *     canonical?:string, robots?:array
 *   }
 *
 * Resolution rules (see spec "Field alias resolution"):
 *   - title:   titleTag wins over title
 *   - description: metaDescription wins over description
 *   - focusKeyword: focusKeyword wins over keyword
 *
 * All values are sanitised (text fields via sanitize_text_field, URLs via
 * esc_url_raw, bools cast). Empty strings / null / empty arrays are dropped.
 */
class DTI_Seo_Normaliser {

	/**
	 * Normalise a raw seo payload.
	 *
	 * @param array $seo Raw input (may be empty).
	 * @return array Normalised payload with only non-empty keys present.
	 */
	public static function normalise( array $seo ): array {
		$out = array();

		// Title — titleTag alias wins.
		$title = self::string_coalesce( $seo['titleTag'] ?? null, $seo['title'] ?? null );
		if ( $title !== '' ) {
			$out['title'] = $title;
		}

		// Description — metaDescription alias wins.
		$desc = self::string_coalesce( $seo['metaDescription'] ?? null, $seo['description'] ?? null );
		if ( $desc !== '' ) {
			$out['description'] = $desc;
		}

		// Focus keyword — focusKeyword wins over legacy `keyword` alias.
		$focus = self::string_coalesce( $seo['focusKeyword'] ?? null, $seo['keyword'] ?? null );
		if ( $focus !== '' ) {
			$out['focusKeyword'] = $focus;
		}

		// Secondary keywords — array of non-empty, de-duplicated strings.
		if ( ! empty( $seo['secondaryKeywords'] ) && is_array( $seo['secondaryKeywords'] ) ) {
			$clean = array();
			foreach ( $seo['secondaryKeywords'] as $kw ) {
				$kw = self::to_string( $kw );
				if ( $kw !== '' && ! in_array( $kw, $clean, true ) ) {
					$clean[] = $kw;
				}
			}
			if ( $clean ) {
				$out['secondaryKeywords'] = $clean;
			}
		}

		// OpenGraph.
		$og = self::normalise_social( $seo['og'] ?? array() );
		if ( $og ) {
			$out['og'] = $og;
		}

		// Twitter.
		$tw = self::normalise_social( $seo['twitter'] ?? array() );
		if ( $tw ) {
			$out['twitter'] = $tw;
		}

		// Canonical URL.
		if ( ! empty( $seo['canonical'] ) ) {
			$url = esc_url_raw( (string) $seo['canonical'] );
			if ( $url ) {
				$out['canonical'] = $url;
			}
		}

		// Robots directives.
		$robots = self::normalise_robots( $seo['robots'] ?? array() );
		if ( $robots ) {
			$out['robots'] = $robots;
		}

		return $out;
	}

	/**
	 * Normalise an OpenGraph/Twitter sub-object. Only title/description/image
	 * are honoured; other keys are dropped.
	 */
	private static function normalise_social( $in ): array {
		if ( ! is_array( $in ) ) {
			return array();
		}
		$out = array();
		$t = self::to_string( $in['title'] ?? null );
		if ( $t !== '' ) {
			$out['title'] = $t;
		}
		$d = self::to_string( $in['description'] ?? null );
		if ( $d !== '' ) {
			$out['description'] = $d;
		}
		if ( ! empty( $in['image'] ) ) {
			$img = esc_url_raw( (string) $in['image'] );
			if ( $img ) {
				$out['image'] = $img;
			}
		}
		return $out;
	}

	/**
	 * Normalise the robots sub-object.
	 *
	 * Three-state semantics (critical for the noindex/nofollow ratchet fix):
	 *   - key ABSENT in input  → field omitted → adapter preserves existing meta
	 *   - key present, TRUE     → field emitted as true  → adapter sets the directive
	 *   - key present, FALSE    → field emitted as false → adapter CLEARS the directive
	 *
	 * This distinguishes "I have no opinion" (absent) from "I explicitly want
	 * this indexable" (false), so a re-import with noindex:false can clear a
	 * previously-written noindex instead of silently leaving it set.
	 *
	 * `advanced` remains write-only-when-non-empty (clearing it via empty
	 * string is not supported — documented minor limitation).
	 */
	private static function normalise_robots( $in ): array {
		if ( ! is_array( $in ) ) {
			return array();
		}
		$out = array();
		if ( array_key_exists( 'noindex', $in ) ) {
			$out['noindex'] = self::to_bool( $in['noindex'] );
		}
		if ( array_key_exists( 'nofollow', $in ) ) {
			$out['nofollow'] = self::to_bool( $in['nofollow'] );
		}
		if ( array_key_exists( 'advanced', $in ) ) {
			$adv = self::to_string( $in['advanced'] );
			if ( $adv !== '' ) {
				$out['advanced'] = $adv;
			}
		}
		return $out;
	}

	/**
	 * First non-empty string among args, sanitised. Empty/null/arrays → ''.
	 */
	private static function string_coalesce( ...$vals ): string {
		foreach ( $vals as $v ) {
			$s = self::to_string( $v );
			if ( $s !== '' ) {
				return $s;
			}
		}
		return '';
	}

	private static function to_string( $v ): string {
		if ( $v === null || is_array( $v ) ) {
			return '';
		}
		$s = trim( sanitize_text_field( (string) $v ) );
		return $s;
	}

	private static function to_bool( $v ): bool {
		if ( is_bool( $v ) ) {
			return $v;
		}
		if ( is_string( $v ) ) {
			$v = strtolower( trim( $v ) );
			return in_array( $v, array( '1', 'true', 'yes', 'on' ), true );
		}
		return (bool) $v;
	}
}
