<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Imports a SQL dump produced by DTI_DbExporter, then rewrites the source
 * site's URLs to this site's URLs — serialize-aware, so Divi/widget settings
 * survive the length change.
 *
 * Destructive: this DROPs and recreates every prefixed table. Always backs up
 * the current DB first.
 */
class DTI_DbImporter {

	public static function import( string $sql, string $from_url, string $to_url ): array {
		global $wpdb;

		if ( trim( $sql ) === '' ) {
			throw new InvalidArgumentException( 'Empty SQL payload.' );
		}

		// 1. Preserve this site's identity before we overwrite the options table.
		$keep_home = home_url();
		$keep_site = site_url();
		$keep_key  = get_option( DTI_Auth::KEY_OPTION );

		// 2. Back up current DB first — non-negotiable, this overwrites everything.
		$backup = self::backup();

		// 3. Run the incoming dump.
		$statements = self::split( $sql );
		$ran = 0;
		foreach ( $statements as $stmt ) {
			if ( $wpdb->query( $stmt ) === false ) {
				throw new RuntimeException( "SQL failed near: " . substr( $stmt, 0, 120 ) . " — {$wpdb->last_error}" );
			}
			$ran++;
		}

		// 4. Serialize-aware URL rewrite across all prefixed tables.
		$replacements = 0;
		if ( $from_url && $to_url && $from_url !== $to_url ) {
			$replacements = self::search_replace( rtrim( $from_url, '/' ), rtrim( $to_url, '/' ) );
		}

		// 5. Restore this site's identity + our own API key so we don't lock out.
		//    Write straight to the table: the options table was just dropped and
		//    recreated, so the in-memory options cache is stale and update_option()
		//    would skip the write when the new value matches the cached one. The
		//    exporter omits the key row entirely, so it must be re-inserted here.
		self::restore_option( 'home', $keep_home );
		self::restore_option( 'siteurl', $keep_site );
		if ( $keep_key ) {
			self::restore_option( DTI_Auth::KEY_OPTION, $keep_key, 'no' );
		}
		wp_cache_flush();

		return array(
			'tables_imported' => $ran,
			'replacements'    => $replacements,
			'backup_file'     => $backup,
		);
	}

	/** Force an option value into the table, bypassing the stale options cache. */
	private static function restore_option( string $name, string $value, string $autoload = 'yes' ): void {
		global $wpdb;
		$wpdb->query( $wpdb->prepare(
			"REPLACE INTO `{$wpdb->options}` (option_name, option_value, autoload) VALUES (%s, %s, %s)",
			$name, $value, $autoload
		) );
	}

	/** Dump current DB to uploads/dti-backups so a bad import is recoverable. */
	private static function backup(): string {
		$current = DTI_DbExporter::export();
		$dir     = wp_upload_dir()['basedir'] . '/dti-backups';
		wp_mkdir_p( $dir );

		$name = 'pre-import-' . gmdate( 'Ymd-His' ) . '.sql';
		$path = $dir . '/' . $name;
		file_put_contents( $path, $current['sql'] );

		// Keep last 5 backups only.
		$old = glob( $dir . '/pre-import-*.sql' );
		if ( $old && count( $old ) > 5 ) {
			rsort( $old );
			foreach ( array_slice( $old, 5 ) as $f ) {
				@unlink( $f );
			}
		}

		return $name;
	}

	/** Split a dump into statements. Naive ;-newline split — our exporter never
	 *  emits ; inside unquoted SQL, and values are escaped, so this is safe here.
	 *  ponytail: not a general SQL parser; pairs only with DTI_DbExporter output. */
	private static function split( string $sql ): array {
		$out = array();
		foreach ( preg_split( "/;\n/", $sql ) as $stmt ) {
			$stmt = trim( $stmt );
			if ( $stmt === '' || str_starts_with( $stmt, '--' ) ) {
				continue;
			}
			$out[] = $stmt;
		}
		return $out;
	}

	/** Walk every prefixed table, replacing $from→$to in every cell, keeping
	 *  serialized data valid. Returns the number of cells changed. */
	private static function search_replace( string $from, string $to ): int {
		global $wpdb;

		$tables  = $wpdb->get_col( 'SHOW TABLES' );
		$tables  = array_filter( $tables, fn( $t ) => str_starts_with( $t, $wpdb->prefix ) );
		$changed = 0;

		foreach ( $tables as $table ) {
			$pk = self::primary_key( $table );
			if ( ! $pk ) {
				continue; // Can't safely update rows without a unique key.
			}

			$rows = $wpdb->get_results( "SELECT * FROM `$table`", ARRAY_A );
			foreach ( $rows as $row ) {
				$update = array();
				foreach ( $row as $col => $val ) {
					if ( $col === $pk || $val === null || strpos( (string) $val, $from ) === false ) {
						continue;
					}
					$new = self::recursive_replace( $from, $to, $val );
					if ( $new !== $val ) {
						$update[ $col ] = $new;
					}
				}
				if ( $update ) {
					$wpdb->update( $table, $update, array( $pk => $row[ $pk ] ) );
					$changed += count( $update );
				}
			}
		}

		return $changed;
	}

	private static function primary_key( string $table ): ?string {
		global $wpdb;
		$keys = $wpdb->get_results( "SHOW KEYS FROM `$table` WHERE Key_name = 'PRIMARY'", ARRAY_A );
		return $keys[0]['Column_name'] ?? null;
	}

	/**
	 * Serialize-aware string replace. Unserializes, replaces inside the
	 * structure, reserializes — so PHP length prefixes stay correct.
	 */
	private static function recursive_replace( string $from, string $to, $data ) {
		// Try to treat the cell as serialized data first.
		if ( is_string( $data ) && self::is_serialized( $data ) ) {
			$un = @unserialize( $data );
			if ( $un !== false || $data === 'b:0;' ) {
				return serialize( self::replace_in( $from, $to, $un ) );
			}
		}
		return self::replace_in( $from, $to, $data );
	}

	private static function replace_in( string $from, string $to, $data ) {
		if ( is_array( $data ) ) {
			$out = array();
			foreach ( $data as $k => $v ) {
				$out[ self::replace_in( $from, $to, $k ) ] = self::recursive_replace( $from, $to, $v );
			}
			return $out;
		}
		if ( is_object( $data ) ) {
			foreach ( get_object_vars( $data ) as $k => $v ) {
				$data->$k = self::recursive_replace( $from, $to, $v );
			}
			return $data;
		}
		if ( is_string( $data ) ) {
			return str_replace( $from, $to, $data );
		}
		return $data;
	}

	private static function is_serialized( string $data ): bool {
		$data = trim( $data );
		if ( $data === 'N;' ) {
			return true;
		}
		// a:/O:/s: with a length, b:/i:/d: scalars — enough to gate unserialize().
		return (bool) preg_match( '/^[aOsbid]:[0-9]/', $data );
	}
}
