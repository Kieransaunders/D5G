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
	 * Best-effort brand/keyword hint from SEO meta (Yoast, RankMath, or the
	 * plugin's own fallback keys). Empty string when nothing is set.
	 */
	private static function design_hint( int $post_id ): string {
		// Yoast.
		$yoast_title = get_post_meta( $post_id, '_yoast_wpseo_title', true );
		if ( $yoast_title ) {
			return wp_strip_all_tags( $yoast_title );
		}
		// RankMath.
		$rankmath_title = get_post_meta( $post_id, 'rank_math_title', true );
		if ( $rankmath_title ) {
			return wp_strip_all_tags( $rankmath_title );
		}
		// Plugin fallback (written when no SEO plugin is active).
		$dti_title = get_post_meta( $post_id, '_dti_seo_title', true );
		if ( $dti_title ) {
			return wp_strip_all_tags( $dti_title );
		}
		return '';
	}
}
