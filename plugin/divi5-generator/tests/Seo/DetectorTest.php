<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers D5G_Seo_Detector
 */
class Detector_Test extends TestCase {

	protected function tearDown(): void {
		D5G_Seo_Detector::set_signals( null );
		parent::tearDown();
	}

	public function test_no_signals_falls_back_to_fallback(): void {
		D5G_Seo_Detector::set_signals( array() );
		$this->assertInstanceOf( D5G_Seo_Fallback::class, D5G_Seo_Detector::resolve() );
		$this->assertNull( D5G_Seo_Detector::detect_id() );
	}

	public function test_rank_math_wins_over_yoast(): void {
		D5G_Seo_Detector::set_signals( array(
			'rank_math' => true,
			'yoast'     => true,
		) );
		$this->assertInstanceOf( D5G_Seo_RankMath::class, D5G_Seo_Detector::resolve() );
		$this->assertSame( 'rank_math', D5G_Seo_Detector::detect_id() );
	}

	public function test_yoast_when_rank_math_absent(): void {
		D5G_Seo_Detector::set_signals( array( 'yoast' => true ) );
		$this->assertInstanceOf( D5G_Seo_Yoast::class, D5G_Seo_Detector::resolve() );
		$this->assertSame( 'yoast', D5G_Seo_Detector::detect_id() );
	}

	public function test_aioseo_after_yoast(): void {
		D5G_Seo_Detector::set_signals( array( 'aioseo' => true, 'yoast' => false ) );
		$this->assertInstanceOf( D5G_Seo_AIOSEO::class, D5G_Seo_Detector::resolve() );
		$this->assertSame( 'aioseo', D5G_Seo_Detector::detect_id() );
	}

	public function test_seopress(): void {
		D5G_Seo_Detector::set_signals( array( 'seopress' => true ) );
		$this->assertSame( 'seopress', D5G_Seo_Detector::detect_id() );
	}

	public function test_tsf_last_real_plugin(): void {
		D5G_Seo_Detector::set_signals( array( 'tsf' => true ) );
		$this->assertSame( 'tsf', D5G_Seo_Detector::detect_id() );
	}

	public function test_default_order_is_rankmath_yoast_aioseo_seopress_tsf(): void {
		// All five plugins "active" — Rank Math wins.
		D5G_Seo_Detector::set_signals( array(
			'rank_math' => true,
			'yoast'     => true,
			'aioseo'    => true,
			'seopress'  => true,
			'tsf'       => true,
		) );
		$this->assertSame( 'rank_math', D5G_Seo_Detector::detect_id() );

		// Disable Rank Math → Yoast wins.
		D5G_Seo_Detector::set_signals( array(
			'yoast'    => true,
			'aioseo'   => true,
			'seopress' => true,
			'tsf'      => true,
		) );
		$this->assertSame( 'yoast', D5G_Seo_Detector::detect_id() );

		// Disable Yoast too → AIOSEO wins.
		D5G_Seo_Detector::set_signals( array(
			'aioseo'   => true,
			'seopress' => true,
			'tsf'      => true,
		) );
		$this->assertSame( 'aioseo', D5G_Seo_Detector::detect_id() );
	}

	public function test_each_adapter_detects_only_when_signal_true(): void {
		foreach ( array( 'yoast', 'rank_math', 'aioseo', 'seopress', 'tsf', 'fallback' ) as $id ) {
			D5G_Seo_Detector::set_signals( array( $id => true ) );
			$class = D5G_Seo_Detector::resolve();
			$this->assertSame( $id, $class->id(), "adapter for $id" );
		}
	}
}
