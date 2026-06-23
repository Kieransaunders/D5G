<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Import and export Divi 5 global colours and variables.
 *
 * POST /wp-json/divi-tools/v1/global-variables
 *   body: { global_colors: [...], global_variables: [...] }
 *   Returns: { colors_imported, variables_imported, warnings[] }
 *
 * GET /wp-json/divi-tools/v1/global-variables
 *   Returns: { global_colors: [...], global_variables: [...] }
 */
class DTI_GlobalVariablesImporter {

	public static function import( array $payload ): array {
		$data_class = 'ET\\Builder\\Packages\\GlobalData\\GlobalData';
		$warnings   = [];

		if ( ! class_exists( $data_class ) ) {
			throw new RuntimeException( 'Divi 5 GlobalData class not available.' );
		}

		$colors_imported    = 0;
		$variables_imported = 0;

		// ── Global colours ───────────────────────────────────────────────────
		// global_colors is an array of tuples: [ [gcid, {color, status, label}], ... ]
		if ( ! empty( $payload['global_colors'] ) && is_array( $payload['global_colors'] ) ) {
			if ( method_exists( $data_class, 'get_imported_global_colors' )
				&& method_exists( $data_class, 'set_global_colors' ) ) {

				$converted = $data_class::get_imported_global_colors( $payload['global_colors'] );
				$data_class::set_global_colors( $converted, true ); // true = merge, not replace
				$colors_imported = count( $payload['global_colors'] );
			} else {
				$warnings[] = 'GlobalData::set_global_colors not found — colours skipped.';
			}
		}

		// ── Global variables ─────────────────────────────────────────────────
		// global_variables is an array of objects: [ {id, label, value, status, type}, ... ]
		if ( ! empty( $payload['global_variables'] ) && is_array( $payload['global_variables'] ) ) {
			if ( method_exists( $data_class, 'import_global_variables' ) ) {
				$data_class::import_global_variables( $payload['global_variables'] );
				$variables_imported = count( $payload['global_variables'] );
			} else {
				$warnings[] = 'GlobalData::import_global_variables not found — variables skipped.';
			}
		}

		if ( $colors_imported === 0 && $variables_imported === 0 ) {
			throw new \InvalidArgumentException( 'Payload contained no global_colors or global_variables to import.' );
		}

		return [
			'colors_imported'    => $colors_imported,
			'variables_imported' => $variables_imported,
			'warnings'           => $warnings,
		];
	}

	public static function export(): array {
		$data_class = 'ET\\Builder\\Packages\\GlobalData\\GlobalData';

		if ( ! class_exists( $data_class ) ) {
			throw new RuntimeException( 'Divi 5 GlobalData class not available.' );
		}

		// get_global_colors() → { gcid: {color,label,status,...}, ... }
		// Reshape to the [ [gcid, {...}], ... ] tuple format the import side wants.
		$colors_map = method_exists( $data_class, 'get_global_colors' )
			? (array) $data_class::get_global_colors()
			: [];
		$global_colors = [];
		foreach ( $colors_map as $gcid => $meta ) {
			$global_colors[] = array( $gcid, $meta );
		}

		// get_global_variables() → { numbers:{}, strings:{}, fonts:{ id:{...} }, ... }
		// Flatten to a single list of {type, id, ...} objects (import format).
		$vars_by_type = method_exists( $data_class, 'get_global_variables' )
			? (array) $data_class::get_global_variables()
			: [];
		$global_variables = [];
		foreach ( $vars_by_type as $type => $entries ) {
			foreach ( (array) $entries as $id => $entry ) {
				$entry = (array) $entry;
				$entry['type'] = $type;
				$entry['id']   = $entry['id'] ?? $id;
				$global_variables[] = $entry;
			}
		}

		return [
			'global_colors'    => $global_colors,
			'global_variables' => $global_variables,
		];
	}
}
