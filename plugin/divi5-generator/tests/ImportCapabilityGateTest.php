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

	// -----------------------------------------------------------------------
	// Preview creates a page, so it takes the page gate
	// -----------------------------------------------------------------------

	public function test_preview_is_page_creation_and_is_refused_on_free(): void {
		// RED — found by end-to-end test on a live Divi 5.9.0 site, 15/07/2026.
		// D5G_PagePreviewer::preview() calls wp_insert_post() with post_status
		// 'draft': it creates a REAL page. /preview is not in PRO_ONLY_ROUTES and
		// handle_preview() never called the gate, so a Free install could POST a
		// page payload to /preview, get a real draft page, and hit Publish —
		// bypassing the capability gate completely. Verified: free install
		// created page 3914 (post_type 'page', 7181 bytes).
		//
		// Preview always takes the page path (it rejects library exports), so it
		// gates as a page import regardless of the payload's context.
		$result = D5G_RestApi::preview_gate( false );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'pro_required', $result->get_error_code() );
		$this->assertSame( 403, $result->get_error_data()['status'] );
	}

	public function test_preview_is_allowed_on_pro(): void {
		$this->assertTrue( D5G_RestApi::preview_gate( true ) );
	}

	public function test_free_page_refusal_names_the_library_alternative(): void {
		// A 403 that only says "upgrade" wastes the moment. Free CAN have this
		// section — just via the Library — and the message should say so.
		$result  = D5G_RestApi::import_gate( '', false );
		$message = strtolower( $result->get_error_message() );

		$this->assertStringContainsString( 'library', $message );
	}
}
