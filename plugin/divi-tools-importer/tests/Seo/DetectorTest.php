<?php

use PHPUnit\Framework\TestCase;

/**
 * @covers DTI_Seo_Detector
 */
class Detector_Test extends TestCase {

	protected function tearDown(): void {
		DTI_Seo_Detector::set_signals( null );
		parent::tearDown();
	}

	public function test_no_signals_falls_back_to_fallback(): void {
		DTI_Seo_Detector::set_signals( array() );
		$this->assertInstanceOf( DTI_Seo_Fallback::class, DTI_Seo_Detector::resolve() );
		$this->assertNull( DTI_Seo_Detector::detect_id() );
	}

	public function test_rank_math_wins_over_yoast(): void {
		DTI_Seo_Detector::set_signals( array(
			'rank_math' => true,
			'yoast'     => true,
		) );
		$this->assertInstanceOf( DTI_Seo_RankMath::class, DTI_Seo_Detector::resolve() );
		$this->assertSame( 'rank_math', DTI_Seo_Detector::detect_id() );
	}

	public function test_yoast_when_rank_math_absent(): void {
		DTI_Seo_Detector::set_signals( array( 'yoast' => true ) );
		$this->assertInstanceOf( DTI_Seo_Yoast::class, DTI_Seo_Detector::resolve() );
		$this->assertSame( 'yoast', DTI_Seo_Detector::detect_id() );
	}

	public function test_aioseo_after_yoast(): void {
		DTI_Seo_Detector::set_signals( array( 'aioseo' => true, 'yoast' => false ) );
		$this->assertInstanceOf( DTI_Seo_AIOSEO::class, DTI_Seo_Detector::resolve() );
		$this->assertSame( 'aioseo', DTI_Seo_Detector::detect_id() );
	}

	public function test_seopress(): void {
		DTI_Seo_Detector::set_signals( array( 'seopress' => true ) );
		$this->assertSame( 'seopress', DTI_Seo_Detector::detect_id() );
	}

	public function test_tsf_last_real_plugin(): void {
		DTI_Seo_Detector::set_signals( array( 'tsf' => true ) );
		$this->assertSame( 'tsf', DTI_Seo_Detector::detect_id() );
	}

	public function test_default_order_is_rankmath_yoast_aioseo_seopress_tsf(): void {
		// All five plugins "active" — Rank Math wins.
		DTI_Seo_Detector::set_signals( array(
			'rank_math' => true,
			'yoast'     => true,
			'aioseo'    => true,
			'seopress'  => true,
			'tsf'       => true,
		) );
		$this->assertSame( 'rank_math', DTI_Seo_Detector::detect_id() );

		// Disable Rank Math → Yoast wins.
		DTI_Seo_Detector::set_signals( array(
			'yoast'    => true,
			'aioseo'   => true,
			'seopress' => true,
			'tsf'      => true,
		) );
		$this->assertSame( 'yoast', DTI_Seo_Detector::detect_id() );

		// Disable Yoast too → AIOSEO wins.
		DTI_Seo_Detector::set_signals( array(
			'aioseo'   => true,
			'seopress' => true,
			'tsf'      => true,
		) );
		$this->assertSame( 'aioseo', DTI_Seo_Detector::detect_id() );
	}

	public function test_each_adapter_detects_only_when_signal_true(): void {
		foreach ( array( 'yoast', 'rank_math', 'aioseo', 'seopress', 'tsf', 'fallback' ) as $id ) {
			DTI_Seo_Detector::set_signals( array( $id => true ) );
			$class = DTI_Seo_Detector::resolve();
			$this->assertSame( $id, $class->id(), "adapter for $id" );
		}
	}
}
