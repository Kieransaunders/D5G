<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Shared helpers for concrete SEO adapters.
 *
 * Provides the bookkeeping every adapter needs: a `store()` helper that writes
 * one meta key + records the logical field name in the running $written list,
 * so adapters stay declarative. Subclasses implement id(), detect(), write().
 */
abstract class D5G_Seo_AdapterBase implements D5G_Seo_Adapter {

	/**
	 * Write a single post-meta value and record the logical field name.
	 *
	 * @param int    $page_id Target post.
	 * @param string $key     Native meta key for the active plugin.
	 * @param mixed  $value   Value (already sanitised by the Normaliser).
	 * @param string $logical Logical field name (e.g. 'title', 'og.title').
	 * @param array  $written Running list of written field names (by ref).
	 */
	protected function store( int $page_id, string $key, $value, string $logical, array &$written ): void {
		update_post_meta( $page_id, $key, $value );
		if ( ! in_array( $logical, $written, true ) ) {
			$written[] = $logical;
		}
	}

	/**
	 * Delete a post-meta key entirely, restoring the plugin's default for that
	 * field. Used to CLEAR a directive the consumer explicitly set to false
	 * (e.g. robots.noindex:false on a re-import). Records the logical field
	 * name just like store() so fields_written reflects the action.
	 *
	 * @param int    $page_id Target post.
	 * @param string $key     Native meta key for the active plugin.
	 * @param string $logical Logical field name (e.g. 'robots.noindex').
	 * @param array  $written Running list of written field names (by ref).
	 */
	protected function clear( int $page_id, string $key, string $logical, array &$written ): void {
		delete_post_meta( $page_id, $key );
		if ( ! in_array( $logical, $written, true ) ) {
			$written[] = $logical;
		}
	}

	/**
	 * Build the standard return shape.
	 *
	 * @param string|null $plugin  Adapter id (null for the Fallback).
	 * @param array       $written List of logical field names persisted.
	 */
	protected function result( ?string $plugin, array $written ): array {
		return array(
			'plugin'         => $plugin,
			'fields_written' => array_values( $written ),
		);
	}
}
