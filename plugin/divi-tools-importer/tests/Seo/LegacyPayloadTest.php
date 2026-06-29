<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers \DTI_SeoWriter
 *
 * Regression guard: a legacy `{ title, description, slug, keyword }` payload
 * (the documented 1.4.x shape) must produce identical writes to the previous
 * plugin version, with no PHP warnings and the same field names.
 */
class LegacyPayload_Test extends TestCase {

	const POST_ID = 7;

	protected function setUp(): void {
		parent::setUp();
		MetaStore::reset();
		DTI_Seo_Detector::set_signals( null );
	}

	protected function tearDown(): void {
		DTI_Seo_Detector::set_signals( null );
		parent::tearDown();
	}

	public function test_legacy_payload_on_yoast_matches_pre_1_6_writes(): void {
		DTI_Seo_Detector::set_signals( array( 'yoast' => true ) );

		$legacy = array(
			'title'       => 'Coffee Shop in Frome',
			'description' => 'Best coffee in town.',
			'slug'        => 'coffee-shop-frome',
			'keyword'     => 'coffee shop in frome',
		);
		$result = DTI_SeoWriter::write( self::POST_ID, $legacy );

		$this->assertSame( 'yoast', $result['plugin'] );
		$this->assertSame( 'Coffee Shop in Frome', MetaStore::get( self::POST_ID, '_yoast_wpseo_title' ) );
		$this->assertSame( 'Best coffee in town.', MetaStore::get( self::POST_ID, '_yoast_wpseo_metadesc' ) );
		// Legacy `keyword` alias resolves to focusKeyword.
		$this->assertSame( 'coffee shop in frome', MetaStore::get( self::POST_ID, '_yoast_wpseo_focuskw' ) );
		// No new fields written beyond what 1.4.x produced (title, description).
		$this->assertFalse( MetaStore::has( self::POST_ID, '_yoast_wpseo_opengraph-title' ) );
		$this->assertFalse( MetaStore::has( self::POST_ID, '_yoast_wpseo_canonical' ) );
	}

	public function test_legacy_payload_on_rankmath_matches_pre_1_6_writes(): void {
		DTI_Seo_Detector::set_signals( array( 'rank_math' => true ) );

		$legacy = array(
			'titleTag'        => 'Coffee Shop in Frome',
			'metaDescription' => 'Best coffee in town.',
		);
		$result = DTI_SeoWriter::write( self::POST_ID, $legacy );

		$this->assertSame( 'rank_math', $result['plugin'] );
		$this->assertSame( 'Coffee Shop in Frome', MetaStore::get( self::POST_ID, 'rank_math_title' ) );
		$this->assertSame( 'Best coffee in town.', MetaStore::get( self::POST_ID, 'rank_math_description' ) );
	}

	public function test_legacy_payload_with_only_title_and_description_runs_warning_free(): void {
		DTI_Seo_Detector::set_signals( array( 'yoast' => true ) );

		// No warnings expected — capture errors via error_reporting.
		$errors = array();
		set_error_handler( function ( $errno, $errstr ) use ( &$errors ) {
			$errors[] = "$errno: $errstr";
			return true;
		} );

		DTI_SeoWriter::write( self::POST_ID, array(
			'title'       => 'T',
			'description' => 'D',
		) );

		restore_error_handler();
		$this->assertSame( array(), $errors, 'Legacy payload must not emit PHP warnings: ' . implode( '; ', $errors ) );
	}

	public function test_no_plugin_active_falls_back_to_dti_keys(): void {
		DTI_Seo_Detector::set_signals( array() );

		$result = DTI_SeoWriter::write( self::POST_ID, array(
			'title'       => 'T',
			'description' => 'D',
			'keyword'     => 'kw',
		) );

		$this->assertNull( $result['plugin'] );
		$this->assertSame( 'T', MetaStore::get( self::POST_ID, '_dti_seo_title' ) );
		$this->assertSame( 'D', MetaStore::get( self::POST_ID, '_dti_seo_description' ) );
		$this->assertSame( 'kw', MetaStore::get( self::POST_ID, '_dti_seo_focuskw' ) );
	}

	public function test_empty_seo_payload_returns_empty_fields_written(): void {
		DTI_Seo_Detector::set_signals( array( 'yoast' => true ) );

		$result = DTI_SeoWriter::write( self::POST_ID, array() );
		$this->assertSame( 'yoast', $result['plugin'] );
		$this->assertSame( array(), $result['fields_written'] );
	}
}
