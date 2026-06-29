<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Lists pages imported by Divi Tools Importer.
 *
 * Keyed off the `_dti_imported` meta stamp that PageImporter writes, so the
 * list contains only pages this plugin created — not every Divi page on the
 * site. `design_hint` pulls the brand/keyword from Yoast/RankMath SEO meta
 * (or the plugin's own _dti_seo_* fallback) when available.
 */
class DTI_PagesLister {

	public static function list(): array {
		$query = new WP_Query( array(
			'post_type'      => 'page',
			'post_status'    => array( 'draft', 'publish', 'pending', 'private' ),
			'meta_key'       => '_dti_imported',
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'posts_per_page' => 200,
			'no_found_rows'  => true,
		) );

		$out = array();
		foreach ( $query->posts as $post ) {
			$out[] = array(
				'slug'       => $post->post_name,
				'title'      => get_the_title( $post ),
				'status'     => $post->post_status,
				'modified'   => $post->post_modified,
				'permalink'  => get_permalink( $post ),
				'design_hint'=> self::design_hint( $post->ID ),
			);
		}
		return $out;
	}

	/**
	 * Best-effort brand/keyword hint from SEO meta. Walks every supported SEO
	 * plugin's title key in turn (Yoast → Rank Math → AIOSEO → SEOPress → TSF),
	 * then falls back to the plugin's own _dti_seo_* keys. Empty string when
	 * nothing is set.
	 */
	private static function design_hint( int $post_id ): string {
		$keys = array(
			'_yoast_wpseo_title',      // Yoast
			'rank_math_title',         // Rank Math
			'_aioseo_title',           // AIOSEO (flat key; envelope title not read here for perf)
			'_seopress_titles_title',  // SEOPress
			'_genesis_title',          // The SEO Framework
			'_dti_seo_title',          // Plugin fallback
		);
		foreach ( $keys as $key ) {
			$val = get_post_meta( $post_id, $key, true );
			if ( $val ) {
				return wp_strip_all_tags( $val );
			}
		}
		return '';
	}
}
