<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_Limits
 *
 * The Free tier import cap had no test coverage before this — the old
 * get_option() stub in bootstrap.php always returned the default, so
 * save_usage()'s state was silently discarded and a "limit reached" path
 * could never actually be observed in a test. Fixed alongside this suite
 * (see OptionStore in bootstrap.php).
 *
 * Free tier is a taster (PAGE_IMPORT_LIMIT / LIBRARY_IMPORT_LIMIT = 2/month
 * as of 14/07/2026) — enough to see the product generate and import a real
 * page, not enough to run a client site on Free.
 */
class Limits_Test extends TestCase {

	protected function setUp(): void {
		TransientStore::reset();
		OptionStore::reset();
	}

	public function test_free_install_can_import_up_to_the_page_limit(): void {
		for ( $i = 0; $i < D5G_Limits::PAGE_IMPORT_LIMIT; $i++ ) {
			$this->assertTrue( D5G_Limits::can_import_page(), "import {$i} should be allowed" );
			D5G_Limits::increment_page_import();
		}
	}

	public function test_free_install_is_refused_once_the_page_limit_is_reached(): void {
		for ( $i = 0; $i < D5G_Limits::PAGE_IMPORT_LIMIT; $i++ ) {
			D5G_Limits::increment_page_import();
		}

		$result = D5G_Limits::can_import_page();

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'limit_reached', $result->get_error_code() );
	}

	public function test_free_install_is_refused_once_the_library_limit_is_reached(): void {
		D5G_Limits::increment_library_import( D5G_Limits::LIBRARY_IMPORT_LIMIT );

		$result = D5G_Limits::can_import_library();

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'limit_reached', $result->get_error_code() );
	}

	public function test_page_and_library_usage_are_counted_independently(): void {
		D5G_Limits::increment_page_import();

		$usage = D5G_Limits::get_usage();

		$this->assertSame( 1, $usage['page_imports'] );
		$this->assertSame( 0, $usage['library_imports'] );
	}

	public function test_usage_persists_across_calls_within_the_same_month(): void {
		D5G_Limits::increment_page_import();
		D5G_Limits::increment_page_import();

		$this->assertSame( 2, D5G_Limits::get_usage()['page_imports'] );
	}
}
