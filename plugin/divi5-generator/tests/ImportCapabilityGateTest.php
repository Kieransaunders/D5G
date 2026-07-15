<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_RestApi
 *
 * RED: D5G_RestApi::import_gate() does not exist yet.
 *
 * PRD §3.2 — the Free/Pro line is a capability, not a quota: Free imports
 * sections into the Divi Library without limit; only page creation is Pro.
 * /import serves both, routing on $layout['context'], so this gate cannot
 * live in PRO_ONLY_ROUTES — it has to read the payload.
 */
class ImportCapabilityGate_Test extends TestCase {

	const LIBRARY_CONTEXT = 'et_builder_layouts';

	// -----------------------------------------------------------------------
	// Library imports — free, unlimited, no quota
	// -----------------------------------------------------------------------

	public function test_library_import_is_allowed_on_free(): void {
		$this->assertTrue(
			D5G_RestApi::import_gate( self::LIBRARY_CONTEXT, false ),
			'Free must be able to import sections into the Divi Library.'
		);
	}

	public function test_library_import_is_allowed_on_pro(): void {
		$this->assertTrue( D5G_RestApi::import_gate( self::LIBRARY_CONTEXT, true ) );
	}

	public function test_library_import_has_no_batch_limit_on_free(): void {
		// The old quota checked usage without knowing the batch size, so a first
		// request of 100 items sailed past a limit of 2. There is no quota now,
		// so batch size is irrelevant by construction — assert it stays that way.
		for ( $i = 0; $i < 100; $i++ ) {
			$this->assertTrue(
				D5G_RestApi::import_gate( self::LIBRARY_CONTEXT, false ),
				"Library import {$i} must not be rate-gated by a quota."
			);
		}
	}

	// -----------------------------------------------------------------------
	// Page imports — Pro only
	// -----------------------------------------------------------------------

	public function test_page_import_is_refused_on_free(): void {
		$result = D5G_RestApi::import_gate( '', false );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'pro_required', $result->get_error_code() );
		$this->assertSame( 403, $result->get_error_data()['status'] );
	}

	public function test_page_import_is_allowed_on_pro(): void {
		$this->assertTrue( D5G_RestApi::import_gate( '', true ) );
	}

	public function test_unknown_context_is_treated_as_a_page_import(): void {
		// Fail closed: anything that is not explicitly the library context takes
		// the page path in handle_import(), so it must take the page gate too.
		$result = D5G_RestApi::import_gate( 'something_else', false );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'pro_required', $result->get_error_code() );
	}

	public function test_free_page_refusal_names_the_library_alternative(): void {
		// A 403 that only says "upgrade" wastes the moment. Free CAN have this
		// section — just via the Library — and the message should say so.
		$result  = D5G_RestApi::import_gate( '', false );
		$message = strtolower( $result->get_error_message() );

		$this->assertStringContainsString( 'library', $message );
	}
}
