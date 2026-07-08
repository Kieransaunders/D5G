<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_MenuImporter
 *
 * RED: These tests fail because D5G_MenuImporter does not exist yet.
 * They define the contract for menu creation, listing, and auto-placement.
 */
class MenuImporter_Test extends TestCase {

	protected function setUp(): void {
		MenuStore::reset();
	}

	// -----------------------------------------------------------------------
	// Menu creation (POST /menus)
	// -----------------------------------------------------------------------

	public function test_creates_menu_with_page_items(): void {
		$result = D5G_MenuImporter::create( array(
			'name'  => 'Main Menu',
			'items' => array(
				array( 'label' => 'Home',    'page_id' => 1 ),
				array( 'label' => 'About',   'page_id' => 2 ),
				array( 'label' => 'Contact', 'page_id' => 3 ),
			),
		) );

		$this->assertIsInt( $result['menu_id'] );
		$this->assertSame( 'Main Menu', $result['name'] );
		$this->assertSame( 3, $result['item_count'] );
	}

	public function test_creates_menu_with_custom_url_items(): void {
		$result = D5G_MenuImporter::create( array(
			'name'  => 'Footer',
			'items' => array(
				array( 'label' => 'Google', 'url' => 'https://google.com' ),
			),
		) );

		$this->assertSame( 1, $result['item_count'] );
		$this->assertSame( 'Google', $result['items'][0]['label'] );
	}

	public function test_reuses_existing_menu_with_warning(): void {
		MenuStore::create_menu( 'Exists' );

		$result = D5G_MenuImporter::create( array(
			'name'  => 'Exists',
			'items' => array(
				array( 'label' => 'New Page', 'page_id' => 99 ),
			),
		) );

		$this->assertSame( 1, $result['item_count'] );
		$this->assertNotEmpty( $result['warnings'] );
		$this->assertStringContainsString( 'already exists', $result['warnings'][0] );
	}

	public function test_throws_on_empty_name(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessage( 'Menu name is required' );
		D5G_MenuImporter::create( array( 'items' => array() ) );
	}

	public function test_assigns_valid_theme_location(): void {
		MenuStore::set_location( 'primary', 0 );

		$result = D5G_MenuImporter::create( array(
			'name'     => 'Primary',
			'location' => 'primary',
			'items'    => array(
				array( 'label' => 'Home', 'page_id' => 1 ),
			),
		) );

		$locations = MenuStore::get_locations();
		$this->assertSame( $result['menu_id'], $locations['primary'] );
	}

	public function test_warns_on_invalid_theme_location(): void {
		$result = D5G_MenuImporter::create( array(
			'name'     => 'Test',
			'location' => 'nonexistent',
			'items'    => array(
				array( 'label' => 'Home', 'page_id' => 1 ),
			),
		) );

		$this->assertNotEmpty( $result['warnings'] );
		$this->assertStringContainsString( 'does not exist', $result['warnings'][0] );
	}

	public function test_nests_child_under_parent_by_id(): void {
		$result = D5G_MenuImporter::create( array(
			'name'  => 'Nested',
			'items' => array(
				array( 'id' => 's', 'label' => 'Services',   'page_id' => 10 ),
				array( 'id' => 'w', 'label' => 'Web Design', 'page_id' => 11, 'parent_id' => 's' ),
			),
		) );

		$this->assertSame( 2, $result['item_count'] );
		$child = $result['items'][1];
		$this->assertArrayHasKey( 'parent_db_id', $child );
	}

	// -----------------------------------------------------------------------
	// Menu listing (GET /menus)
	// -----------------------------------------------------------------------

	public function test_list_menus_returns_all_menus(): void {
		MenuStore::create_menu( 'Primary' );
		MenuStore::create_menu( 'Footer' );

		$result = D5G_MenuImporter::list_menus();

		$this->assertCount( 2, $result['menus'] );
	}

	public function test_list_menus_filters_by_name(): void {
		MenuStore::create_menu( 'Primary' );
		MenuStore::create_menu( 'Footer' );

		$result = D5G_MenuImporter::list_menus( 'Footer' );

		$this->assertCount( 1, $result['menus'] );
		$this->assertSame( 'Footer', $result['menus'][0]['name'] );
	}

	public function test_list_menus_returns_hierarchical_items(): void {
		$menu_id = MenuStore::create_menu( 'Main' );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Home',
			'menu-item-object-id' => 1,
			'menu-item-type'     => 'post_type',
			'menu-item-position' => 1,
		) );
		$svc_id = MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Services',
			'menu-item-object-id' => 2,
			'menu-item-type'     => 'post_type',
			'menu-item-position' => 2,
		) );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'      => 'Web Design',
			'menu-item-object-id'  => 3,
			'menu-item-type'       => 'post_type',
			'menu-item-position'   => 3,
			'menu-item-parent-id'  => $svc_id,
		) );

		$result = D5G_MenuImporter::list_menus( 'Main' );
		$items  = $result['menus'][0]['items'];

		$this->assertCount( 2, $items );
		$this->assertCount( 1, $items[1]['children'] );
		$this->assertSame( 'Web Design', $items[1]['children'][0]['label'] );
	}

	// -----------------------------------------------------------------------
	// Auto-place (POST /menus/auto-place)
	// -----------------------------------------------------------------------

	public function test_auto_place_throws_on_missing_menu(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessage( 'not found' );
		D5G_MenuImporter::auto_place( array(
			'menu_name' => 'Nope',
			'pages'     => array(),
		) );
	}

	public function test_auto_place_nests_under_matching_parent(): void {
		$menu_id = MenuStore::create_menu( 'Main' );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Home',
			'menu-item-object-id' => 1,
			'menu-item-type'     => 'post_type',
		) );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Services',
			'menu-item-object-id' => 2,
			'menu-item-type'     => 'post_type',
		) );

		$result = D5G_MenuImporter::auto_place( array(
			'menu_name' => 'Main',
			'pages'     => array(
				array( 'page_id' => 10, 'title' => 'Web Design Services' ),
			),
		) );

		$this->assertSame( 1, $result['placed'] );
		$this->assertArrayHasKey( 'parent_db_id', $result['items'][0] );
	}

	public function test_auto_place_appends_when_no_match(): void {
		$menu_id = MenuStore::create_menu( 'Main' );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Home',
			'menu-item-object-id' => 1,
			'menu-item-type'     => 'post_type',
		) );

		$result = D5G_MenuImporter::auto_place( array(
			'menu_name' => 'Main',
			'pages'     => array(
				array( 'page_id' => 30, 'title' => 'Contact' ),
			),
		) );

		$this->assertSame( 1, $result['placed'] );
		$this->assertArrayNotHasKey( 'parent_db_id', $result['items'][0] );
	}

	public function test_auto_place_skips_existing_page(): void {
		$menu_id = MenuStore::create_menu( 'Main' );
		MenuStore::add_item( $menu_id, array(
			'menu-item-title'    => 'Home',
			'menu-item-object-id' => 1,
			'menu-item-type'     => 'post_type',
		) );

		$result = D5G_MenuImporter::auto_place( array(
			'menu_name' => 'Main',
			'pages'     => array(
				array( 'page_id' => 1, 'title' => 'Home' ),
				array( 'page_id' => 2, 'title' => 'New Page' ),
			),
		) );

		$this->assertSame( 1, $result['placed'] );
		$this->assertSame( 1, $result['skipped'] );
	}

	public function test_auto_place_requires_menu_name(): void {
		$this->expectException( InvalidArgumentException::class );
		$this->expectExceptionMessage( 'menu_name is required' );
		D5G_MenuImporter::auto_place( array( 'pages' => array() ) );
	}
}
