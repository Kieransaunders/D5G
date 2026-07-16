<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_SettingsPage
 *
 * Task 0 — the Step-1 install command shown on the Settings page swaps on the
 * licence tier: Free points at the public divi5-starter, Pro at the full
 * divi5generate toolkit (Kieransaunders/D5G marketplace).
 *
 * render() reads D5G_Limits::is_pro() internally and is_pro() keys off the
 * D5G_ASSUME_PRO constant, which cannot be defined both true and false in one
 * process — so we test the pure install_instructions_html( $is_pro ) helper and
 * assert behaviour (which command appears), not the literal marketplace URL.
 */
class SettingsInstallInstructions_Test extends TestCase {

	public function test_free_shows_the_starter_install_command(): void {
		$html = D5G_SettingsPage::install_instructions_html( false );

		$this->assertStringContainsString( 'marketplace add Kieransaunders/divi5-starter', $html );
		$this->assertStringContainsString( 'divi5-starter@divi5-starter', $html );
	}

	public function test_free_does_not_show_the_pro_toolkit_command(): void {
		$html = D5G_SettingsPage::install_instructions_html( false );

		$this->assertStringNotContainsString( 'Kieransaunders/D5G', $html );
	}

	public function test_free_shows_the_upgrade_cta(): void {
		$html = D5G_SettingsPage::install_instructions_html( false );

		$this->assertStringContainsString( 'Upgrade to Pro', $html );
	}

	public function test_pro_shows_the_toolkit_marketplace_command(): void {
		$html = D5G_SettingsPage::install_instructions_html( true );

		$this->assertStringContainsString( 'marketplace add Kieransaunders/D5G', $html );
	}

	public function test_pro_does_not_show_the_starter_install_command(): void {
		// Pro users should not be told to install the single-section free starter.
		$html = D5G_SettingsPage::install_instructions_html( true );

		$this->assertStringNotContainsString( 'divi5-starter@divi5-starter', $html );
	}
}
