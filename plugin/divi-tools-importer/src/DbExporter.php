<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Dumps the WordPress database to a portable SQL string using $wpdb only —
 * no mysqldump, so it works inside Local's container and on locked-down hosts.
 *
 * ponytail: single-request whole-DB dump. Fine for small/medium sites; a
 * multi-MB DB will hit PHP memory/time limits — upgrade path is chunk-by-table.
 */
class DTI_DbExporter {

	/** Option rows we never ship: cache cruft + this plugin's own secrets. */
	const SKIP_OPTION_LIKE = array( '_transient_%', '_site_transient_%' );
	const SKIP_OPTION_NAME = array( 'dti_api_key_hash', 'dti_api_key_plain', 'dti_rate_limit' );

	public static function export(): array {
		global $wpdb;

		$tables = $wpdb->get_col( 'SHOW TABLES' );
		if ( empty( $tables ) ) {
			throw new RuntimeException( 'No tables found.' );
		}

		// Only our prefix — never touch other apps sharing the database.
		$prefix = $wpdb->prefix;
		$tables = array_filter( $tables, fn( $t ) => str_starts_with( $t, $prefix ) );

		$sql = "-- Divi Tools DB export\n";
		$sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

		foreach ( $tables as $table ) {
			$sql .= self::dump_table( $table );
		}

		$sql .= "\nSET FOREIGN_KEY_CHECKS=1;\n";

		return array(
			'sql'         => $sql,
			'home_url'    => home_url(),
			'site_url'    => site_url(),
			'prefix'      => $prefix,
			'table_count' => count( $tables ),
		);
	}

	private static function dump_table( string $table ): string {
		global $wpdb;

		$create = $wpdb->get_row( "SHOW CREATE TABLE `$table`", ARRAY_N );
		$out  = "DROP TABLE IF EXISTS `$table`;\n";
		$out .= $create[1] . ";\n";

		$where = self::skip_where( $table );
		$rows  = $wpdb->get_results( "SELECT * FROM `$table` $where", ARRAY_A );
		if ( empty( $rows ) ) {
			return $out . "\n";
		}

		$cols     = array_keys( $rows[0] );
		$col_list = '`' . implode( '`, `', $cols ) . '`';

		// Chunk INSERTs so single statements stay under typical max_allowed_packet.
		foreach ( array_chunk( $rows, 200 ) as $chunk ) {
			$values = array();
			foreach ( $chunk as $row ) {
				$escaped = array_map( array( __CLASS__, 'quote' ), array_values( $row ) );
				$values[] = '(' . implode( ', ', $escaped ) . ')';
			}
			$out .= "INSERT INTO `$table` ($col_list) VALUES\n" . implode( ",\n", $values ) . ";\n";
		}

		return $out . "\n";
	}

	/** Exclude transients (options table only). */
	private static function skip_where( string $table ): string {
		global $wpdb;
		if ( $table !== $wpdb->options ) {
			return '';
		}
		$likes = array();
		foreach ( self::SKIP_OPTION_LIKE as $like ) {
			$likes[] = $wpdb->prepare( 'option_name NOT LIKE %s', $like );
		}
		foreach ( self::SKIP_OPTION_NAME as $name ) {
			$likes[] = $wpdb->prepare( 'option_name != %s', $name );
		}
		return 'WHERE ' . implode( ' AND ', $likes );
	}

	private static function quote( $value ): string {
		global $wpdb;
		if ( $value === null ) {
			return 'NULL';
		}
		return "'" . $wpdb->_real_escape( (string) $value ) . "'";
	}
}
