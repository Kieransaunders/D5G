<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers DTI_ThemeBuilderImporter
 */
class ImporterTest extends TestCase {

	protected function setUp(): void {
		MetaStore::reset();
		PostStore::reset();
		ThemeBuilderTestFixtures::reset();
		parent::setUp();
	}

	private function payload( array $overrides = array() ): array {
		return array_merge( array(
			'key'    => 'my-template',
			'use_on' => array( 'singular:post_type:airloop_record:all' ),
			'title'  => 'My Template',
			'body'   => '<!-- wp:divi/placeholder --><!-- /wp:divi/placeholder -->',
		), $overrides );
	}

	public function test_missing_key_is_rejected(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( "/'key' is required/" );
		DTI_ThemeBuilderImporter::import( $this->payload( array( 'key' => '' ) ) );
	}

	public function test_missing_use_on_is_rejected(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( "/'use_on' is required/" );
		DTI_ThemeBuilderImporter::import( $this->payload( array( 'use_on' => '' ) ) );
	}

	public function test_body_without_placeholder_block_is_rejected(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessageMatches( "/'body' must be Divi 5 block markup/" );
		DTI_ThemeBuilderImporter::import( $this->payload( array( 'body' => '<p>no placeholder here</p>' ) ) );
	}

	public function test_first_import_creates_a_new_template(): void {
		$result = DTI_ThemeBuilderImporter::import( $this->payload() );

		$this->assertSame( 'created', $result['action'] );
		$this->assertSame( 'my-template', get_post_meta( $result['template_id'], '_dti_tb_key', true ) );

		$body_post = PostStore::get( $result['body_layout_id'] );
		$this->assertSame( '<!-- wp:divi/placeholder --><!-- /wp:divi/placeholder -->', $body_post->post_content );
	}

	public function test_reimport_with_same_key_updates_in_place(): void {
		$first = DTI_ThemeBuilderImporter::import( $this->payload() );

		$second = DTI_ThemeBuilderImporter::import( $this->payload( array(
			'body' => '<!-- wp:divi/placeholder -->updated<!-- /wp:divi/placeholder -->',
		) ) );

		$this->assertSame( 'updated', $second['action'] );
		$this->assertSame( $first['template_id'], $second['template_id'] );
		$this->assertSame( $first['body_layout_id'], $second['body_layout_id'] );

		$body_post = PostStore::get( $second['body_layout_id'] );
		$this->assertSame( '<!-- wp:divi/placeholder -->updated<!-- /wp:divi/placeholder -->', $body_post->post_content );
	}

	public function test_reimport_replaces_use_on_rules(): void {
		DTI_ThemeBuilderImporter::import( $this->payload( array(
			'use_on' => array(
				'singular:post_type:airloop_record:all',
				'archive:post_type:airloop_record',
			),
		) ) );

		$result = DTI_ThemeBuilderImporter::import( $this->payload( array(
			'use_on' => array( 'singular:post_type:airloop_record:all' ),
		) ) );

		$use_on = get_post_meta( $result['template_id'], '_et_use_on', false );
		$this->assertSame( array( 'singular:post_type:airloop_record:all' ), $use_on );
	}

	public function test_new_template_is_registered_on_live_theme_builder_post(): void {
		ThemeBuilderTestFixtures::$theme_builder_post_id = 555;

		$result = DTI_ThemeBuilderImporter::import( $this->payload() );

		$registered = array_map( 'intval', get_post_meta( 555, '_et_template', false ) );
		$this->assertContains( $result['template_id'], $registered );
	}

	public function test_reimport_does_not_duplicate_registration(): void {
		ThemeBuilderTestFixtures::$theme_builder_post_id = 555;

		$first  = DTI_ThemeBuilderImporter::import( $this->payload() );
		DTI_ThemeBuilderImporter::import( $this->payload() );

		$registered = array_map( 'intval', get_post_meta( 555, '_et_template', false ) );
		$matches    = array_filter( $registered, static fn( $id ) => $id === $first['template_id'] );
		$this->assertCount( 1, $matches );
	}

	public function test_unresolvable_theme_builder_post_returns_a_warning_not_a_failure(): void {
		ThemeBuilderTestFixtures::$theme_builder_post_id = 0;

		$result = DTI_ThemeBuilderImporter::import( $this->payload() );

		$this->assertNotEmpty( $result['template_id'] );
		$this->assertNotEmpty( $result['warnings'] );
	}
}
