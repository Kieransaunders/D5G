<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_RestApi
 *
 * PRD §4 gap 7: DB export/import transfers whole prefixed tables over REST —
 * too big an attack surface to leave on by default even for Pro sites. It
 * must stay refused unless the site owner opts in via wp-config.php.
 *
 * D5G_ALLOW_DB_TRANSFER is a real PHP constant, so it can only be asserted
 * once per process — this suite covers the default-off state (the state
 * every fresh install ships in). The opt-in-true path is exercised manually
 * per docs/generator-runbook.md once a site defines the constant.
 */
class DbTransferGate_Test extends TestCase {

	protected function setUp(): void {
		TransientStore::reset();
	}

	public function test_db_export_is_refused_by_default(): void {
		$request = new WP_REST_Request( '/divi5-generator/v1/db/export', array(), array() );

		$result = D5G_RestApi::handle_db_export( $request );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'db_transfer_disabled', $result->get_error_code() );
	}

	public function test_db_import_is_refused_by_default(): void {
		$request = new WP_REST_Request( '/divi5-generator/v1/db/import', array(), array(
			'sql' => 'SELECT 1',
		) );

		$result = D5G_RestApi::handle_db_import( $request );

		$this->assertTrue( is_wp_error( $result ) );
		$this->assertSame( 'db_transfer_disabled', $result->get_error_code() );
	}

	public function test_db_transfer_refusal_returns_403(): void {
		$request = new WP_REST_Request( '/divi5-generator/v1/db/export', array(), array() );

		$result = D5G_RestApi::handle_db_export( $request );

		$data = $result->get_error_data();
		$this->assertSame( 403, $data['status'] );
	}
}
