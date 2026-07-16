<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_PageCompiler
 * @covers D5G_PageImporter::resolve_brand
 * @covers D5G_PageImporter::register_brand_and_compile
 *
 * The Pro connector's "compile" step: raw generated page JSON carries only preset
 * pointers (modulePreset / groupPreset) with the preset-derived visual attrs
 * stripped and the brand definitions absent. These tests prove the connector
 * inlines each referenced preset's attrs back into its block (preset base, block
 * override), restoring button enable:'on', handling group presets, tolerating
 * unknown pointers, and never touching the free/section (library) path.
 *
 * Fixtures are a trimmed slice of the REAL emitted "variant B" shape produced by
 * tools/make-unresolved-test.js on examples/iConnectITHomepage.json, so the merge
 * runs against attrs Divi actually emits (nested $variable(...)$ tokens included).
 */
class PageCompiler_Test extends TestCase {

	/** @return array registry in GlobalPreset::get_data() shape */
	private function registry(): array {
		return json_decode( file_get_contents( __DIR__ . '/fixtures/registry.json' ), true );
	}

	private function content(): string {
		return file_get_contents( __DIR__ . '/fixtures/unresolved-content.txt' );
	}

	/** Pull one block's attrs back out of a compiled content string by module name. */
	private function block_attrs( string $content, string $name ): array {
		if ( ! preg_match( '/<!-- wp:divi\/' . preg_quote( $name, '/' ) . '\s(\{.*?\})\s\/-->/s', $content, $m ) ) {
			$this->fail( "block divi/{$name} not found in compiled content" );
		}
		return json_decode( $m[1], true );
	}

	// ── merge() precedence ──────────────────────────────────────────────────────

	public function test_merge_block_wins_on_leaf_conflict(): void {
		$preset = array( 'a' => array( 'x' => 1, 'y' => 2 ) );
		$block  = array( 'a' => array( 'y' => 99 ) );
		$this->assertSame(
			array( 'a' => array( 'x' => 1, 'y' => 99 ) ),
			D5G_PageCompiler::merge( $preset, $block ),
			'block value overrides the preset on a leaf conflict; other preset leaves survive'
		);
	}

	public function test_merge_replaces_lists_wholesale(): void {
		$preset = array( 'k' => array( 1, 2, 3 ) );
		$block  = array( 'k' => array( 9 ) );
		$this->assertSame( array( 'k' => array( 9 ) ), D5G_PageCompiler::merge( $preset, $block ) );
	}

	// ── index_preset_attrs() ────────────────────────────────────────────────────

	public function test_index_flattens_module_and_group_presets_by_id(): void {
		list( $mod, $grp ) = D5G_PageCompiler::index_preset_attrs( $this->registry() );
		$this->assertArrayHasKey( 'gg0z3dipdg', $mod, 'section module preset indexed by id' );
		$this->assertArrayHasKey( 'hws463o8lj', $grp, 'button group preset indexed by id, flattened across group names' );
	}

	// ── compile_content() — the inliner ─────────────────────────────────────────

	public function test_module_preset_attrs_are_inlined_as_base(): void {
		$out     = D5G_PageCompiler::compile_content( $this->content(), ...$this->indexed() );
		$section = $this->block_attrs( $out, 'section' );

		// The section preset (gg0z3dipdg) carries a background colour + padding the
		// raw block did not. After compile they must be present.
		$this->assertArrayHasKey( 'decoration', $section['module'], 'preset decoration merged into the block' );
		$this->assertStringContainsString(
			'gcid-dark',
			json_encode( $section['module']['decoration'] ),
			'brand background colour ref restored from the preset'
		);
		// Structural attr the raw block already carried survives.
		$this->assertSame( 'Hero', $section['module']['meta']['adminLabel']['desktop']['value'] );
		// Pointer is preserved.
		$this->assertSame( array( 'gg0z3dipdg' ), $section['modulePreset'] );
	}

	public function test_block_override_beats_preset_on_leaf_conflict(): void {
		$out  = D5G_PageCompiler::compile_content( $this->content(), ...$this->indexed() );
		$text = $this->block_attrs( $out, 'text' );

		// Raw text block carried its own module.decoration.sizing.maxWidth=520px.
		// The preset must not clobber that override.
		$this->assertSame(
			'520px',
			$text['module']['decoration']['sizing']['desktop']['value']['maxWidth'],
			'block-level override survives the preset merge'
		);
	}

	public function test_group_button_preset_restores_enable_on(): void {
		$out    = D5G_PageCompiler::compile_content( $this->content(), ...$this->indexed() );
		$button = $this->block_attrs( $out, 'button' );

		$this->assertSame(
			'on',
			$button['button']['decoration']['button']['desktop']['value']['enable'],
			"button enable:'on' restored from the group preset — the #1 cause of default blue buttons on import"
		);
	}

	public function test_group_font_preset_inlined_into_heading(): void {
		$out     = D5G_PageCompiler::compile_content( $this->content(), ...$this->indexed() );
		$heading = $this->block_attrs( $out, 'heading' );

		// The font group preset (ck7ubnjx0a) carries family/size the raw heading lacked.
		$this->assertStringContainsString(
			'family',
			json_encode( $heading['title']['decoration']['font'] ),
			'group font preset attrs inlined into the heading'
		);
	}

	// ── unknown pointer → graceful ──────────────────────────────────────────────

	public function test_unknown_module_pointer_leaves_block_unchanged(): void {
		$content = '<!-- wp:divi/text {"content":{"innerContent":{"desktop":{"value":"hi"}}},"modulePreset":["does-not-exist"]} /-->';
		$out     = D5G_PageCompiler::compile_content( $content, array(), array() );
		$attrs   = $this->block_attrs( $out, 'text' );
		$this->assertSame( 'hi', $attrs['content']['innerContent']['desktop']['value'], 'block content untouched' );
		$this->assertSame( array( 'does-not-exist' ), $attrs['modulePreset'], 'pointer preserved, import proceeds' );
	}

	public function test_blocks_without_attrs_pass_through(): void {
		$content = "<!-- wp:divi/placeholder -->\r\n<!-- /wp:divi/placeholder -->";
		$this->assertSame(
			$content,
			D5G_PageCompiler::compile_content( $content, ...$this->indexed() ),
			'bare blocks and closing tags are untouched'
		);
	}

	public function test_safe_block_json_escapes_delimiter_chars(): void {
		$json = D5G_PageCompiler::safe_block_json( array( 'v' => '<a href="x">&' ) );
		$this->assertStringNotContainsString( '<', $json, '< escaped so WP cannot corrupt the comment' );
		$this->assertStringNotContainsString( '>', $json );
		$this->assertStringContainsString( 'u003c', strtolower( $json ), '< survives as its unicode escape' );
	}

	// ── resolve_brand() precedence ──────────────────────────────────────────────

	public function test_resolve_brand_prefers_explicit_bundle(): void {
		$brand  = array( 'presets' => array( 'module' => array() ), 'global_colors' => array( array( 'gcid-x', array() ) ), 'global_variables' => array() );
		$layout = array( 'brand' => $brand, 'presets' => array( 'module' => array( 'ignored' => true ) ) );
		$out    = D5G_PageImporter::resolve_brand( $layout );
		$this->assertSame( $brand['global_colors'], $out['global_colors'] );
		$this->assertArrayNotHasKey( 'ignored', $out['presets']['module'] ?? array(), 'top-level presets ignored when brand bundle present' );
	}

	public function test_resolve_brand_falls_back_to_legacy_top_level_blocks(): void {
		$layout = array( 'presets' => array( 'module' => array( 'x' => 1 ) ), 'global_colors' => array( array( 'gcid-y', array() ) ) );
		$out    = D5G_PageImporter::resolve_brand( $layout );
		$this->assertSame( array( 'x' => 1 ), $out['presets']['module'] );
		$this->assertSame( array( array( 'gcid-y', array() ) ), $out['global_colors'] );
	}

	// ── register_brand_and_compile() glue (Divi-absent CI path) ─────────────────

	public function test_register_and_compile_uses_bundle_presets_when_divi_absent(): void {
		$brand = array(
			'presets'          => $this->registry(), // module/group id→item shape doubles as the file `presets` block
			'global_colors'    => array(),
			'global_variables' => array(),
		);
		$warnings = array();
		$result   = D5G_PageImporter::register_brand_and_compile( $brand, $this->content(), false, $warnings );

		$this->assertFalse( $result['presets_imported'], 'no registration attempted with Divi absent' );
		$button = $this->block_attrs( $result['content'], 'button' );
		$this->assertSame(
			'on',
			$button['button']['decoration']['button']['desktop']['value']['enable'],
			'compile still inlines from the supplied bundle when Divi cannot register it'
		);
	}

	// ── free / library (section) path is untouched ──────────────────────────────

	public function test_library_section_export_is_never_compiled(): void {
		// The compiler only ever runs on the et_builder (page) path — via
		// PageImporter/PagePreviewer. A library export (et_builder_layouts) is
		// routed to D5G_LibraryImporter and never reaches PageCompiler. This
		// regression guard asserts the compiler is not wired into that class.
		$src = file_get_contents( dirname( __DIR__ ) . '/src/LibraryImporter.php' );
		$this->assertStringNotContainsString(
			'D5G_PageCompiler',
			$src,
			'free/section (library) path must not invoke the page compiler'
		);
	}

	/** Helper: registry indexed into [ moduleById, groupById ] for spread into compile_content(). */
	private function indexed(): array {
		return D5G_PageCompiler::index_preset_attrs( $this->registry() );
	}
}
