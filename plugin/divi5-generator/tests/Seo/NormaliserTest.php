<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_Seo_Normaliser
 */
class Normaliser_Test extends TestCase {

	public function test_alias_title_tag_wins_over_title(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'titleTag' => 'From TitleTag',
			'title'    => 'From title',
		) );
		$this->assertSame( 'From TitleTag', $out['title'] );
	}

	public function test_alias_meta_description_wins(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'metaDescription' => 'From metaDescription',
			'description'     => 'From description',
		) );
		$this->assertSame( 'From metaDescription', $out['description'] );
	}

	public function test_alias_focus_keyword_wins_over_legacy_keyword(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'focusKeyword' => 'focus kw',
			'keyword'      => 'legacy kw',
		) );
		$this->assertSame( 'focus kw', $out['focusKeyword'] );
	}

	public function test_legacy_keyword_alone_still_resolves(): void {
		$out = D5G_Seo_Normaliser::normalise( array( 'keyword' => 'legacy kw' ) );
		$this->assertSame( 'legacy kw', $out['focusKeyword'] );
	}

	public function test_empty_payload_yields_empty_array(): void {
		$this->assertSame( array(), D5G_Seo_Normaliser::normalise( array() ) );
	}

	public function test_empty_strings_are_skipped(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'title'    => '',
			'titleTag' => '   ',
			'description' => null,
		) );
		$this->assertArrayNotHasKey( 'title', $out );
		$this->assertArrayNotHasKey( 'description', $out );
	}

	public function test_secondary_keywords_filtered_for_empties(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'secondaryKeywords' => array( 'a', '', "  \t", 'b', 'a' ),
		) );
		$this->assertSame( array( 'a', 'b' ), $out['secondaryKeywords'] );
	}

	public function test_og_with_invalid_image_drops_image(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'og' => array( 'title' => 'OG title', 'image' => 'not-a-url' ),
		) );
		$this->assertSame( 'OG title', $out['og']['title'] );
		$this->assertArrayNotHasKey( 'image', $out['og'] );
	}

	public function test_canonical_invalid_url_dropped(): void {
		$out = D5G_Seo_Normaliser::normalise( array( 'canonical' => 'javascript:alert(1)' ) );
		$this->assertArrayNotHasKey( 'canonical', $out );
	}

	public function test_robots_explicit_false_preserved_so_adapters_can_clear(): void {
		// Explicit false MUST be emitted (not dropped) so adapters can clear a
		// previously-written directive. Dropping it created a one-way ratchet
		// where noindex could be set but never cleared via re-import.
		$out = D5G_Seo_Normaliser::normalise( array(
			'robots' => array( 'noindex' => false, 'nofollow' => false ),
		) );
		$this->assertArrayHasKey( 'robots', $out );
		$this->assertFalse( $out['robots']['noindex'] );
		$this->assertFalse( $out['robots']['nofollow'] );
	}

	public function test_robots_absent_fields_omitted_so_existing_meta_preserved(): void {
		// If noindex is absent from input, it must be absent from output so the
		// adapter skips it (preserves any existing plugin-set value).
		$out = D5G_Seo_Normaliser::normalise( array(
			'robots' => array( 'noindex' => true ),
		) );
		$this->assertArrayHasKey( 'noindex', $out['robots'] );
		$this->assertArrayNotHasKey( 'nofollow', $out['robots'] );
	}

	public function test_robots_empty_object_emits_nothing(): void {
		$out = D5G_Seo_Normaliser::normalise( array( 'robots' => array() ) );
		$this->assertArrayNotHasKey( 'robots', $out );
	}

	public function test_robots_section_absent_emits_nothing(): void {
		$out = D5G_Seo_Normaliser::normalise( array( 'title' => 'T' ) );
		$this->assertArrayNotHasKey( 'robots', $out );
	}

	public function test_robots_noindex_true_is_emitted(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'robots' => array( 'noindex' => true ),
		) );
		$this->assertTrue( $out['robots']['noindex'] );
		// nofollow was absent from input → must NOT be emitted (preserve semantics).
		$this->assertArrayNotHasKey( 'nofollow', $out['robots'] );
	}

	public function test_robots_string_truthy_coerced(): void {
		$out = D5G_Seo_Normaliser::normalise( array(
			'robots' => array( 'noindex' => 'yes', 'advanced' => 'noimageindex' ),
		) );
		$this->assertTrue( $out['robots']['noindex'] );
		$this->assertSame( 'noimageindex', $out['robots']['advanced'] );
	}

	public function test_non_array_og_treated_as_empty(): void {
		$out = D5G_Seo_Normaliser::normalise( array( 'og' => 'string-not-object' ) );
		$this->assertArrayNotHasKey( 'og', $out );
	}

	public function test_full_payload_normalises_every_field(): void {
		$in = array(
			'titleTag'           => 'Title',
			'metaDescription'    => 'Desc',
			'focusKeyword'       => 'kw',
			'secondaryKeywords'  => array( 'kw2' ),
			'og'                 => array( 'title' => 'OG', 'image' => 'https://x/y.png' ),
			'twitter'            => array( 'title' => 'TW' ),
			'canonical'          => 'https://x/canonical',
			'robots'             => array( 'noindex' => true ),
		);
		$out = D5G_Seo_Normaliser::normalise( $in );

		$this->assertSame( 'Title', $out['title'] );
		$this->assertSame( 'Desc', $out['description'] );
		$this->assertSame( 'kw', $out['focusKeyword'] );
		$this->assertSame( array( 'kw2' ), $out['secondaryKeywords'] );
		$this->assertSame( 'OG', $out['og']['title'] );
		$this->assertSame( 'https://x/y.png', $out['og']['image'] );
		$this->assertSame( 'TW', $out['twitter']['title'] );
		$this->assertSame( 'https://x/canonical', $out['canonical'] );
		$this->assertTrue( $out['robots']['noindex'] );
	}
}
