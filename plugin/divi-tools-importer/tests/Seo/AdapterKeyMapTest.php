<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers \DTI_Seo_Yoast
 * @covers \DTI_Seo_RankMath
 * @covers \DTI_Seo_AIOSEO
 * @covers \DTI_Seo_SEOPress
 * @covers \DTI_Seo_TSF
 * @covers \DTI_Seo_Fallback
 *
 * Feeds a full payload through each adapter and asserts the exact native meta
 * keys + values written. Post meta is captured by the MetaStore stub in
 * tests/bootstrap.php.
 */
class AdapterKeyMap_Test extends TestCase {

	const POST_ID = 42;

	private function full_payload(): array {
		return array(
			'title'              => 'Invoice Software for Small Business',
			'description'        => 'Send your first invoice in 60 seconds.',
			'focusKeyword'       => 'invoice software',
			'secondaryKeywords'  => array( 'invoicing tool', 'small business billing' ),
			'og'                 => array(
				'title'       => 'Invoice Software - Acme',
				'description' => 'Send your first invoice in 60 seconds.',
				'image'      => 'https://cdn.acme.com/og.png',
			),
			'twitter'            => array(
				'title'       => 'Invoice Software - Acme',
				'description' => 'Send your first invoice in 60 seconds.',
				'image'      => 'https://cdn.acme.com/og.png',
			),
			'canonical'          => 'https://acme.com/invoice-software',
			'robots'             => array(
				'noindex'  => true,
				'nofollow' => false,
				'advanced' => 'noimageindex',
			),
		);
	}

	protected function setUp(): void {
		parent::setUp();
		MetaStore::reset();
	}

	// --- Yoast ----------------------------------------------------------------

	public function test_yoast_full_payload_writes_native_keys(): void {
		$result = ( new DTI_Seo_Yoast() )->write( self::POST_ID, $this->full_payload() );

		$this->assertSame( 'yoast', $result['plugin'] );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, '_yoast_wpseo_title' ) );
		$this->assertSame( 'Send your first invoice in 60 seconds.', MetaStore::get( self::POST_ID, '_yoast_wpseo_metadesc' ) );
		$this->assertSame( 'invoice software', MetaStore::get( self::POST_ID, '_yoast_wpseo_focuskw' ) );

		// Focus keys array includes primary + secondaries (deduped).
		$keys = json_decode( MetaStore::get( self::POST_ID, '_yoast_wpseo_focuskeys' ), true );
		$this->assertSame( array( 'invoice software', 'invoicing tool', 'small business billing' ), $keys );

		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, '_yoast_wpseo_opengraph-title' ) );
		$this->assertSame( 'https://cdn.acme.com/og.png', MetaStore::get( self::POST_ID, '_yoast_wpseo_opengraph-image' ) );
		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, '_yoast_wpseo_twitter-title' ) );
		$this->assertSame( 'https://acme.com/invoice-software', MetaStore::get( self::POST_ID, '_yoast_wpseo_canonical' ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_yoast_wpseo_meta-robots-noindex' ) );
		$this->assertSame( 'noimageindex', MetaStore::get( self::POST_ID, '_yoast_wpseo_meta-robots-advanced' ) );
		$this->assertFalse( MetaStore::has( self::POST_ID, '_yoast_wpseo_meta-robots-nofollow' ), 'nofollow=false must not be written' );

		// fields_written lists logical names.
		$this->assertContains( 'title', $result['fields_written'] );
		$this->assertContains( 'focusKeyword', $result['fields_written'] );
		$this->assertContains( 'og.title', $result['fields_written'] );
		$this->assertContains( 'robots.noindex', $result['fields_written'] );
	}

	public function test_yoast_single_keyword_does_not_write_focuskeys_array(): void {
		$payload = array( 'focusKeyword' => 'only kw' );
		( new DTI_Seo_Yoast() )->write( self::POST_ID, $payload );
		$this->assertSame( 'only kw', MetaStore::get( self::POST_ID, '_yoast_wpseo_focuskw' ) );
		$this->assertFalse( MetaStore::has( self::POST_ID, '_yoast_wpseo_focuskeys' ) );
	}

	// --- Rank Math ------------------------------------------------------------

	public function test_rankmath_full_payload_writes_native_keys(): void {
		$result = ( new DTI_Seo_RankMath() )->write( self::POST_ID, $this->full_payload() );

		$this->assertSame( 'rank_math', $result['plugin'] );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, 'rank_math_title' ) );
		$this->assertSame( 'invoice software', MetaStore::get( self::POST_ID, 'rank_math_focus_keyword' ) );

		$keys = json_decode( MetaStore::get( self::POST_ID, 'rank_math_focus_keywords' ), true );
		$this->assertSame( array( 'invoice software', 'invoicing tool', 'small business billing' ), $keys );

		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, 'rank_math_facebook_title' ) );
		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, 'rank_math_twitter_title' ) );
		$this->assertSame( 'https://acme.com/invoice-software', MetaStore::get( self::POST_ID, 'rank_math_canonical_url' ) );

		$robots = json_decode( MetaStore::get( self::POST_ID, 'rank_math_robots' ), true );
		$this->assertSame( 'noindex', $robots['index'] );
		$this->assertSame( 'follow', $robots['follow'] );
		$this->assertSame( 'noimageindex', $robots['advanced'] );
	}

	// --- AIOSEO ---------------------------------------------------------------

	public function test_aioseo_writes_flat_keys_and_envelope(): void {
		$result = ( new DTI_Seo_AIOSEO() )->write( self::POST_ID, $this->full_payload() );

		$this->assertSame( 'aioseo', $result['plugin'] );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, '_aioseo_title' ) );
		$this->assertSame( 'invoice software', MetaStore::get( self::POST_ID, '_aioseo_focus_keyphrase' ) );

		$envelope = json_decode( MetaStore::get( self::POST_ID, '_aioseo_posts_data' ), true );
		$this->assertSame( 'Invoice Software for Small Business', $envelope['title'] );
		$this->assertSame( 'invoice software', $envelope['keyphrase']['focus_page'] );
		$this->assertSame( 'Invoice Software - Acme', $envelope['og']['title'] );
		$this->assertSame( 'https://acme.com/invoice-software', $envelope['canonical_url'] );
		$this->assertTrue( $envelope['robots']['default']['noindex'] );
		$this->assertFalse( $envelope['robots']['default']['nofollow'] );
	}

	public function test_aioseo_envelope_merge_preserves_existing_keyphrase(): void {
		// Simulate a page where the user already set a keyphrase via AIOSEO UI.
		MetaStore::set( self::POST_ID, '_aioseo_posts_data', wp_json_encode( array(
			'keyphrase' => array( 'focus_page' => 'user-set kw' ),
		) ) );

		// Title-only re-import — focusKeyword absent in payload.
		( new DTI_Seo_AIOSEO() )->write( self::POST_ID, array( 'title' => 'New Title' ) );

		$envelope = json_decode( MetaStore::get( self::POST_ID, '_aioseo_posts_data' ), true );
		$this->assertSame( 'user-set kw', $envelope['keyphrase']['focus_page'], 'Pre-existing keyphrase must survive' );
		$this->assertSame( 'New Title', $envelope['title'] );
	}

	// --- SEOPress -------------------------------------------------------------

	public function test_seopress_full_payload_writes_native_keys(): void {
		$result = ( new DTI_Seo_SEOPress() )->write( self::POST_ID, $this->full_payload() );

		$this->assertSame( 'seopress', $result['plugin'] );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, '_seopress_titles_title' ) );
		$this->assertSame( 'Send your first invoice in 60 seconds.', MetaStore::get( self::POST_ID, '_seopress_titles_desc' ) );
		// SEOPress joins focus + secondaries into a single comma string.
		$this->assertSame( 'invoice software, invoicing tool, small business billing', MetaStore::get( self::POST_ID, '_seopress_analysis_target_kw' ) );
		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, '_seopress_social_og_title' ) );
		$this->assertSame( 'https://acme.com/invoice-software', MetaStore::get( self::POST_ID, '_seopress_titles_canonical' ) );
		$this->assertSame( 'yes', MetaStore::get( self::POST_ID, '_seopress_titles_indexing' ) );
	}

	// --- TSF ------------------------------------------------------------------

	public function test_tsf_full_payload_writes_native_keys(): void {
		$result = ( new DTI_Seo_TSF() )->write( self::POST_ID, $this->full_payload() );

		$this->assertSame( 'tsf', $result['plugin'] );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, '_genesis_title' ) );
		$this->assertSame( 'Send your first invoice in 60 seconds.', MetaStore::get( self::POST_ID, '_genesis_description' ) );
		// TSF has no native focus-keyword field — neutral key.
		$this->assertSame( 'invoice software', MetaStore::get( self::POST_ID, '_dti_seo_focuskw' ) );
		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, '_social_title_fb' ) );
		$this->assertSame( 'Invoice Software - Acme', MetaStore::get( self::POST_ID, '_social_title_t' ) );
		$this->assertSame( 'https://acme.com/invoice-software', MetaStore::get( self::POST_ID, '_canonical' ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_genesis_noindex' ) );
	}

	// --- Fallback -------------------------------------------------------------

	public function test_fallback_writes_neutral_keys(): void {
		$result = ( new DTI_Seo_Fallback() )->write( self::POST_ID, $this->full_payload() );

		$this->assertNull( $result['plugin'], 'Fallback reports null plugin' );
		$this->assertSame( 'Invoice Software for Small Business', MetaStore::get( self::POST_ID, '_dti_seo_title' ) );
		$this->assertSame( 'invoice software', MetaStore::get( self::POST_ID, '_dti_seo_focuskw' ) );
		// Fallback does not persist OG/Twitter/canonical/robots.
		$this->assertFalse( MetaStore::has( self::POST_ID, '_dti_seo_og_title' ) );
	}

	public function test_empty_payload_writes_nothing_in_any_adapter(): void {
		foreach ( array(
			new DTI_Seo_Yoast(),
			new DTI_Seo_RankMath(),
			new DTI_Seo_AIOSEO(),
			new DTI_Seo_SEOPress(),
			new DTI_Seo_TSF(),
			new DTI_Seo_Fallback(),
		) as $adapter ) {
			MetaStore::reset();
			$result = $adapter->write( self::POST_ID, array() );
			$this->assertSame( array(), $result['fields_written'], $adapter->id() . ': empty payload must write nothing' );
			$this->assertSame( array(), MetaStore::all_for( self::POST_ID ), $adapter->id() . ': no meta keys touched' );
		}
	}

	// --- Robots clear regression (the noindex ratchet bug) -------------------
	// Setting robots.noindex:true then re-importing with noindex:false MUST
	// clear the directive, not silently leave it set.

	public function test_yoast_noindex_false_clears_previous_noindex(): void {
		$yoast = new DTI_Seo_Yoast();

		// First import: set noindex.
		$yoast->write( self::POST_ID, array( 'robots' => array( 'noindex' => true ) ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_yoast_wpseo_meta-robots-noindex' ) );

		// Re-import with noindex:false → must clear (meta key deleted).
		$result = $yoast->write( self::POST_ID, array( 'robots' => array( 'noindex' => false ) ) );
		$this->assertFalse( MetaStore::has( self::POST_ID, '_yoast_wpseo_meta-robots-noindex' ), 'noindex meta must be deleted after clear' );
		$this->assertContains( 'robots.noindex', $result['fields_written'], 'clear action must be reported in fields_written' );
	}

	public function test_yoast_robots_absent_preserves_existing_noindex(): void {
		$yoast = new DTI_Seo_Yoast();

		// Set noindex via first import.
		$yoast->write( self::POST_ID, array( 'robots' => array( 'noindex' => true ) ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_yoast_wpseo_meta-robots-noindex' ) );

		// Re-import with NO robots key at all → existing noindex must survive.
		$yoast->write( self::POST_ID, array( 'title' => 'New title, no robots opinion' ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_yoast_wpseo_meta-robots-noindex' ), 'absent robots must preserve existing directive' );
	}

	public function test_rankmath_noindex_false_clears_in_envelope(): void {
		$rm = new DTI_Seo_RankMath();

		$rm->write( self::POST_ID, array( 'robots' => array( 'noindex' => true, 'nofollow' => true ) ) );
		$robots = json_decode( MetaStore::get( self::POST_ID, 'rank_math_robots' ), true );
		$this->assertSame( 'noindex', $robots['index'] );
		$this->assertSame( 'nofollow', $robots['follow'] );

		// Re-import with noindex:false → index cleared, nofollow absent → preserved.
		$rm->write( self::POST_ID, array( 'robots' => array( 'noindex' => false ) ) );
		$robots = json_decode( MetaStore::get( self::POST_ID, 'rank_math_robots' ), true );
		$this->assertSame( 'index', $robots['index'], 'noindex:false must clear to index' );
		$this->assertSame( 'nofollow', $robots['follow'], 'absent nofollow must be preserved' );
	}

	public function test_aioseo_noindex_false_clears_in_envelope(): void {
		$aio = new DTI_Seo_AIOSEO();

		$aio->write( self::POST_ID, array( 'robots' => array( 'noindex' => true ) ) );
		$env = json_decode( MetaStore::get( self::POST_ID, '_aioseo_posts_data' ), true );
		$this->assertTrue( $env['robots']['default']['noindex'] );

		$aio->write( self::POST_ID, array( 'robots' => array( 'noindex' => false ) ) );
		$env = json_decode( MetaStore::get( self::POST_ID, '_aioseo_posts_data' ), true );
		$this->assertFalse( $env['robots']['default']['noindex'], 'noindex:false must clear to false in envelope' );
	}

	public function test_tsf_noindex_false_clears_via_delete(): void {
		$tsf = new DTI_Seo_TSF();

		$tsf->write( self::POST_ID, array( 'robots' => array( 'noindex' => true ) ) );
		$this->assertSame( '1', MetaStore::get( self::POST_ID, '_genesis_noindex' ) );

		$tsf->write( self::POST_ID, array( 'robots' => array( 'noindex' => false ) ) );
		$this->assertFalse( MetaStore::has( self::POST_ID, '_genesis_noindex' ), 'noindex meta must be deleted after clear' );
	}
}
