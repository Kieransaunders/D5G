<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_RestApi
 *
 * RED: D5G_RestApi::requires_pro() and D5G_RestApi::pro_gate() do not exist yet.
 * They define server-side enforcement of the PRD §3 Free/Pro REST route split.
 */
class RestApiProGate_Test extends TestCase {

	protected function setUp(): void {
		TransientStore::reset();
	}

	const PRO_ROUTES = array(
		'/divi5-generator/v1/presets/import',
		'/divi5-generator/v1/presets',
		'/divi5-generator/v1/presets/export',
		'/divi5-generator/v1/global-variables',
		'/divi5-generator/v1/global-variables/export',
		'/divi5-generator/v1/db/export',
		'/divi5-generator/v1/db/import',
		'/divi5-generator/v1/menus',
		'/divi5-generator/v1/menus/auto-place',
	);

	const FREE_ROUTES = array(
		'/divi5-generator/v1/ping',
		'/divi5-generator/v1/preview',
		'/divi5-generator/v1/import',
		'/divi5-generator/v1/export',
		'/divi5-generator/v1/pages',
		'/divi5-generator/v1/pages/my-slug',
	);

	// -----------------------------------------------------------------------
	// requires_pro() — pure route classification
	// -----------------------------------------------------------------------

	public function test_preset_global_variable_menu_and_db_routes_are_pro_only(): void {
		foreach ( self::PRO_ROUTES as $route ) {
			$this->assertTrue( D5G_RestApi::requires_pro( $route ), "expected {$route} to be Pro-only" );
		}
	}

	public function test_ping_preview_import_export_and_pages_routes_are_free(): void {
		foreach ( self::FREE_ROUTES as $route ) {
			$this->assertFalse( D5G_RestApi::requires_pro( $route ), "expected {$route} to be Free" );
		}
	}

	// -----------------------------------------------------------------------
	// pro_gate() — 403 pro_required enforcement
	// -----------------------------------------------------------------------

	public function test_free_install_is_rejected_on_a_pro_only_route(): void {
		$result = D5G_RestApi::pro_gate( '/divi5-generator/v1/db/export', false );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'pro_required', $result->get_error_code() );
	}

	public function test_pro_install_is_allowed_on_a_pro_only_route(): void {
		$result = D5G_RestApi::pro_gate( '/divi5-generator/v1/db/export', true );

		$this->assertTrue( $result );
	}

	public function test_free_install_is_never_blocked_on_a_free_route(): void {
		$result = D5G_RestApi::pro_gate( '/divi5-generator/v1/ping', false );

		$this->assertTrue( $result );
	}

	// -----------------------------------------------------------------------
	// authenticate() — auth (401) is checked before the licence gate (403)
	// -----------------------------------------------------------------------

	public function test_missing_key_on_a_pro_only_route_returns_unauthorized_not_pro_required(): void {
		$request = new WP_REST_Request( '/divi5-generator/v1/db/export', array(), array() );

		$result = D5G_RestApi::authenticate( $request );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'unauthorized', $result->get_error_code() );
	}
}
