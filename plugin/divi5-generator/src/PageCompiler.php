<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Compile "unresolved" Divi 5 page content into render-correct block markup.
 *
 * The public Node toolkit emits page JSON whose module blocks carry only preset
 * pointers (modulePreset:[id], groupPreset:{slot:{presetId:[id]}}) and structural
 * attrs — the preset-derived visual attrs are NOT inlined, and the brand
 * definitions (presets, global_colors, global_variables) travel out-of-band. Such
 * a file renders broken if imported directly (buttons default blue, brand colours
 * unresolved, headings at the default size). This class is the Pro connector's
 * "compile" step: it inlines each referenced preset's attrs back into its block,
 * mirroring the builder's applyPreset()/applyGroupPreset() merge (preset attrs as
 * the base, block attrs override on leaf conflicts).
 *
 * It is a PHP port of the block-comment surgery + merge in the private dev tool
 * tools/make-unresolved-test.js — but the INVERSE operation (inline, not strip).
 *
 * All methods are pure and static so both D5G_PageImporter and D5G_PagePreviewer
 * can call them, and so the merge can be unit-tested without WordPress or Divi.
 *
 * PRESET SOURCE: attrs are read from the *registered* preset store
 * (GlobalPreset::get_data(), post-registration) rather than any `presets` block in
 * the file — so the compile always sees the final (possibly remapped) preset IDs,
 * whether the brand was supplied inline in this request or was already on the site.
 */
class D5G_PageCompiler {

	/**
	 * Deep-merge $b into $a; $b wins on leaf conflicts. Associative arrays merge
	 * recursively; lists (and scalars) are replaced wholesale. PHP mirror of the
	 * builder's merge() (divi-builder.js:97-108).
	 *
	 * @param array $a Base attrs (e.g. the preset's attrs).
	 * @param array $b Override attrs (e.g. the block's own attrs).
	 * @return array
	 */
	public static function merge( array $a, array $b ): array {
		$out = $a;
		foreach ( $b as $k => $v ) {
			if ( is_array( $v ) && self::is_assoc( $v )
				&& isset( $out[ $k ] ) && is_array( $out[ $k ] ) && self::is_assoc( $out[ $k ] ) ) {
				$out[ $k ] = self::merge( $out[ $k ], $v );
			} else {
				$out[ $k ] = $v;
			}
		}
		return $out;
	}

	/** True for an associative array (JSON object), false for a list or empty array. */
	private static function is_assoc( array $arr ): bool {
		if ( array() === $arr ) {
			return false;
		}
		return array_keys( $arr ) !== range( 0, count( $arr ) - 1 );
	}

	/**
	 * Flatten a GlobalPreset::get_data()-shaped registry into id => attrs maps.
	 *
	 * $data shape (same as the file's `presets` block and GlobalPreset::get_data()):
	 *   { module: { "divi/x": { default, items: { id: { id, attrs, ... } } } },
	 *     group:  { "divi/y": { default, items: { id: { id, attrs, ... } } } } }
	 *
	 * Group presets are flattened across ALL group names by their preset id, because
	 * a block's groupPreset slot references a preset purely by id — the group name in
	 * the slot is decorative.
	 *
	 * @param array $data Registry (module/group) as returned by GlobalPreset::get_data().
	 * @return array{0: array<string,array>, 1: array<string,array>} [ moduleById, groupById ]
	 */
	public static function index_preset_attrs( array $data ): array {
		$module_by_id = array();
		$group_by_id  = array();

		foreach ( (array) ( $data['module'] ?? array() ) as $grp ) {
			foreach ( (array) ( $grp['items'] ?? array() ) as $id => $item ) {
				if ( is_array( $item ) && isset( $item['attrs'] ) && is_array( $item['attrs'] ) ) {
					$module_by_id[ (string) $id ] = $item['attrs'];
				}
			}
		}
		foreach ( (array) ( $data['group'] ?? array() ) as $grp ) {
			foreach ( (array) ( $grp['items'] ?? array() ) as $id => $item ) {
				if ( is_array( $item ) && isset( $item['attrs'] ) && is_array( $item['attrs'] ) ) {
					$group_by_id[ (string) $id ] = $item['attrs'];
				}
			}
		}

		return array( $module_by_id, $group_by_id );
	}

	/**
	 * Inline one block's referenced preset attrs into $attrs (preset base, block wins).
	 * Restores button group presets' enable:'on' naturally — it lives in the group
	 * preset's attrs, so the merge brings it back. Unknown pointers are skipped.
	 *
	 * @param array $attrs        The block's own attrs (pointers + structural).
	 * @param array $module_by_id id => attrs (module presets).
	 * @param array $group_by_id  id => attrs (group presets).
	 * @return array The compiled attrs.
	 */
	public static function inline_block_attrs( array $attrs, array $module_by_id, array $group_by_id ): array {
		$result = $attrs;

		// Module preset: modulePreset:[id]
		if ( isset( $attrs['modulePreset'][0] ) ) {
			$id = (string) $attrs['modulePreset'][0];
			if ( isset( $module_by_id[ $id ] ) ) {
				$result = self::merge( $module_by_id[ $id ], $result );
			}
		}

		// Group presets: groupPreset:{ slot: { presetId:[id], groupName } }
		if ( isset( $attrs['groupPreset'] ) && is_array( $attrs['groupPreset'] ) ) {
			foreach ( $attrs['groupPreset'] as $slot ) {
				$id = isset( $slot['presetId'][0] ) ? (string) $slot['presetId'][0] : '';
				if ( '' !== $id && isset( $group_by_id[ $id ] ) ) {
					$result = self::merge( $group_by_id[ $id ], $result );
				}
			}
		}

		return $result;
	}

	/**
	 * Walk the block-comment string in post_content and inline preset attrs into
	 * every block that carries an attrs object. Blocks with no attrs
	 * (`<!-- wp:divi/placeholder -->`) and closing tags pass through untouched.
	 *
	 * PHP mirror of transformBlocks() in tools/make-unresolved-test.js — the attrs
	 * JSON contains nested {} and $variable({...})$ tokens with escaped quotes, so
	 * we walk from the first `{` counting braces while respecting string context,
	 * never a brace regex.
	 *
	 * @param string $content      The data[1] block-comment string.
	 * @param array  $module_by_id id => attrs (module presets).
	 * @param array  $group_by_id  id => attrs (group presets).
	 * @return string The compiled content.
	 */
	public static function compile_content( string $content, array $module_by_id, array $group_by_id ): string {
		$out    = '';
		$cursor = 0;
		$len    = strlen( $content );

		if ( ! preg_match_all( '/<!-- wp:divi\/[a-z0-9-]+\s/', $content, $m, PREG_OFFSET_CAPTURE ) ) {
			return $content;
		}

		foreach ( $m[0] as $match ) {
			$attrs_start = $match[1] + strlen( $match[0] );
			// A block with attrs has `{` right after the space; without attrs it's `/-->` or `-->`.
			if ( $attrs_start >= $len || '{' !== $content[ $attrs_start ] ) {
				continue;
			}
			$json_end = self::read_json_end( $content, $attrs_start );
			if ( null === $json_end ) {
				continue; // Unbalanced — leave the rest untouched.
			}
			$json  = substr( $content, $attrs_start, $json_end - $attrs_start );
			$attrs = json_decode( $json, true );
			if ( ! is_array( $attrs ) ) {
				continue; // Not decodable — pass through.
			}

			$compiled = self::inline_block_attrs( $attrs, $module_by_id, $group_by_id );

			$out   .= substr( $content, $cursor, $attrs_start - $cursor ) . self::safe_block_json( $compiled );
			$cursor = $json_end;
		}

		$out .= substr( $content, $cursor );
		return $out;
	}

	/**
	 * Index of the char just past the balanced JSON object starting at $from
	 * (which must be `{`). Returns null if unbalanced. Respects string context and
	 * backslash escapes — mirror of readJson() in make-unresolved-test.js.
	 */
	private static function read_json_end( string $str, int $from ): ?int {
		$depth = 0;
		$in_str = false;
		$esc    = false;
		$len    = strlen( $str );
		for ( $i = $from; $i < $len; $i++ ) {
			$c = $str[ $i ];
			if ( $esc ) { $esc = false; continue; }
			if ( '\\' === $c ) { $esc = true; continue; }
			if ( $in_str ) { if ( '"' === $c ) { $in_str = false; } continue; }
			if ( '"' === $c ) { $in_str = true; continue; }
			if ( '{' === $c ) { $depth++; }
			elseif ( '}' === $c ) { $depth--; if ( 0 === $depth ) { return $i + 1; } }
		}
		return null;
	}

	/**
	 * Serialize attrs the way the builder does (safeBlockJson, divi-builder.js:171):
	 * escape < > & so WordPress's HTML processing can't corrupt the block-comment
	 * delimiters. JSON_HEX_* emit uppercase hex (<) where JS emits lowercase
	 * (<); both are valid JSON and Divi reads either. Non-ASCII stays
	 * \uXXXX-escaped (no JSON_UNESCAPED_UNICODE), matching JSON.stringify, so the
	 * value survives byte-for-byte through WordPress's content handling.
	 */
	public static function safe_block_json( array $attrs ): string {
		return (string) wp_json_encode( $attrs, JSON_HEX_TAG | JSON_HEX_AMP );
	}
}
