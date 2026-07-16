<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_SettingsPage {

	// Free taster: public marketplace. Pro: the full toolkit repo — public, but its
	// existence is advertised only to payers (PRD §3.1 point 3). The obscurity is a
	// bonus, not the lock; the real gate is the Pro /import compile step (§3.1 point 2).
	const FREE_MARKETPLACE = 'Kieransaunders/divi5-starter';
	const PRO_MARKETPLACE  = 'Kieransaunders/D5G';

	public static function register(): void {
		add_options_page(
			'Divi5 Generator',
			'Divi5 Generator',
			'manage_options',
			'divi5-generator',
			array( __CLASS__, 'render' )
		);
	}

	public static function handle_actions(): void {
		if ( ! isset( $_POST['d5g_action'] ) || ! current_user_can( 'manage_options' ) ) {
			return;
		}
		if ( ! check_admin_referer( 'd5g_action' ) ) {
			wp_die( 'Security check failed.' );
		}
		if ( $_POST['d5g_action'] === 'regenerate_key' ) {
			D5G_Auth::generate_key();
			wp_redirect( add_query_arg( array( 'page' => 'divi5-generator', 'd5g_msg' => 'regenerated' ), admin_url( 'options-general.php' ) ) );
			exit;
		}
		if ( $_POST['d5g_action'] === 'clear_log' ) {
			delete_option( D5G_Auth::LOG_OPTION );
			wp_redirect( add_query_arg( array( 'page' => 'divi5-generator', 'd5g_msg' => 'log_cleared' ), admin_url( 'options-general.php' ) ) );
			exit;
		}
	}

	private static function detect_seo(): array {
		if ( class_exists( 'RankMath\\File' ) || class_exists( 'RankMath' ) ) {
			return array( true, 'Rank Math' );
		}
		if ( defined( 'WPSEO_VERSION' ) ) {
			return array( true, 'Yoast SEO' );
		}
		if ( defined( 'AIOSEO_VERSION' ) ) {
			return array( true, 'All in One SEO' );
		}
		if ( defined( 'SEOPRESS_VERSION' ) ) {
			return array( true, 'SEOPress' );
		}
		if ( defined( 'THE_SEO_FRAMEWORK_VERSION' ) ) {
			return array( true, 'The SEO Framework' );
		}
		return array( false, 'Not detected' );
	}

	public static function render(): void {
		// Show plain key once, then delete it.
		$plain_key = get_option( 'd5g_api_key_plain', '' );
		if ( $plain_key ) {
			delete_option( 'd5g_api_key_plain' );
		}

		$has_key  = (bool) get_option( D5G_Auth::KEY_OPTION );
		$is_pro   = class_exists( 'D5G_Limits' ) && D5G_Limits::is_pro();
		$rate     = class_exists( 'D5G_Limits' ) ? D5G_Limits::get_rate_limit_max() : 30;
		$endpoint = home_url( '/wp-json/divi5-generator/v1/import' );
		$ping_url = home_url( '/wp-json/divi5-generator/v1/ping' );
		$site_url = home_url();
		$log      = D5G_Auth::get_log();
		$msg      = sanitize_key( $_GET['d5g_msg'] ?? '' );
		$icon     = defined( 'D5G_FILE' ) ? plugins_url( 'assets/icon-256x256.png', D5G_FILE ) : '';

		list( $has_seo, $seo_name ) = self::detect_seo();
		$has_divi5 = class_exists( 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset' );

		$marketplace = $is_pro ? self::PRO_MARKETPLACE : self::FREE_MARKETPLACE;
		$plugin_name = $is_pro ? 'divi5generate' : 'divi5-starter';
		$install_cmd = "claude plugin marketplace add {$marketplace}\nclaude plugin install {$plugin_name}";
		$upgrade_url = function_exists( 'dg_fs' ) ? dg_fs()->get_upgrade_url() : 'https://checkout.freemius.com/plugin/33991/';
		?>
		<div class="wrap d5g-wrap">
		<style>
			.d5g-wrap{max-width:1180px;margin-right:20px}
			.d5g-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px}
			.d5g-h2{margin:0 0 4px;font:800 19px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f0f0f;letter-spacing:-.01em}
			.d5g-sub{margin:0 0 20px;font-size:13.5px;color:#6b7280}
			.d5g-num{width:28px;height:28px;border-radius:8px;background:#f95e00;color:#fff;font:800 14px sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
			.d5g-code{background:#141414;border-radius:10px;padding:13px 62px 13px 14px;font:500 12px/1.75 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e6e6e6;position:relative;white-space:pre;overflow-x:auto}
			.d5g-copy{position:absolute;top:9px;right:9px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#cbd0d8;border-radius:7px;padding:5px 9px;font:600 11px sans-serif;cursor:pointer}
			.d5g-copy:hover{background:rgba(255,255,255,.16)}
			.d5g-field{display:flex;align-items:center;gap:8px;background:#f7f7f7;border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px}
			.d5g-label{font:600 10.5px sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#9199a5;margin-bottom:4px}
			.d5g-btn{background:#fff;border:1px solid #d7dae0;border-radius:8px;padding:7px 12px;font:600 12px sans-serif;color:#374151;cursor:pointer}
			.d5g-btn:hover{border-color:#f95e00;color:#f95e00}
			.d5g-cta{background:#f95e00;color:#fff;border:none;border-radius:9px;padding:12px 20px;font:700 13px sans-serif;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
			.d5g-cta:hover{background:#e05400;color:#fff}
			.d5g-step{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #f4f5f6}
			.d5g-step:last-child{border-bottom:none}
			.d5g-step p{margin:0;font-size:13.5px;color:#374151;line-height:1.5}
			.d5g-dot{width:22px;height:22px;border-radius:50%;background:#f7f7f7;border:1px solid #e5e7eb;color:#6b7280;font:700 11px sans-serif;display:flex;align-items:center;justify-content:center;flex:none}
			.d5g-chip{font-size:12px;color:#e6e7ea;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);padding:6px 11px;border-radius:8px}
			@keyframes d5dot{0%,100%{opacity:1}50%{opacity:.3}}
			@media (max-width:960px){.d5g-grid3,.d5g-grid2,.d5g-grid4{grid-template-columns:1fr!important}}
		</style>

			<?php if ( $msg === 'regenerated' ) : ?>
				<div class="notice notice-warning"><p>API key regenerated. Your old key no longer works — copy the new one below.</p></div>
			<?php elseif ( $msg === 'log_cleared' ) : ?>
				<div class="notice notice-success"><p>Connector log cleared.</p></div>
			<?php endif; ?>

			<?php if ( $plain_key ) : ?>
				<div class="notice notice-success" style="border-left-color:#2271b1">
					<p><strong>Your API key (shown once — copy it now):</strong></p>
					<p><code style="font-size:15px;user-select:all;background:#f0f6fc;padding:8px 12px;display:inline-block;border-radius:4px"><?php echo esc_html( $plain_key ); ?></code></p>
				</div>
			<?php endif; ?>

			<!-- HERO -->
			<div style="background:linear-gradient(120deg,#222428 0%,#2d2f36 60%,#3a2a1e 100%);border-radius:16px;padding:26px 30px;display:flex;align-items:center;gap:22px;position:relative;overflow:hidden;margin-top:20px">
				<div style="position:absolute;right:-40px;top:-40px;width:200px;height:200px;background:radial-gradient(circle,rgba(249,94,0,.28),transparent 70%);pointer-events:none"></div>
				<?php if ( $icon ) : ?><img src="<?php echo esc_url( $icon ); ?>" alt="" style="width:60px;height:60px;border-radius:14px;flex:none;box-shadow:0 6px 18px rgba(0,0,0,.35)"><?php endif; ?>
				<div style="flex:1;min-width:0">
					<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
						<h1 style="margin:0;font:800 24px/1.1 sans-serif;color:#fff;letter-spacing:-.01em">Divi5 Generator</h1>
						<?php if ( $is_pro ) : ?>
							<span style="font:700 10.5px sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#f9c32e;border:1px solid rgba(249,195,46,.5);background:rgba(249,195,46,.12);padding:4px 9px;border-radius:20px">Pro plan</span>
						<?php else : ?>
							<span style="font:700 10.5px sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e6e7ea;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.08);padding:4px 9px;border-radius:20px">Free plan</span>
						<?php endif; ?>
					</div>
					<p style="margin:6px 0 0;font-size:14px;color:#b9bcc4;max-width:560px">Ask Claude for a Divi&nbsp;5 <?php echo $is_pro ? 'page' : 'section'; ?> in plain English — it lands on your site. No code required.</p>
				</div>
				<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;flex:none">
					<?php if ( $has_key ) : ?>
						<span style="display:inline-flex;align-items:center;gap:7px;font:600 12.5px sans-serif;color:#e6e7ea;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);padding:7px 12px;border-radius:20px"><span style="width:8px;height:8px;border-radius:50%;background:#34d399;animation:d5dot 1.8s infinite"></span>API key active</span>
					<?php else : ?>
						<span style="display:inline-flex;align-items:center;gap:7px;font:600 12.5px sans-serif;color:#fecaca;background:rgba(220,38,38,.14);border:1px solid rgba(248,113,113,.4);padding:7px 12px;border-radius:20px">No API key yet</span>
					<?php endif; ?>
					<span style="font-size:11.5px;color:#8b8e97"><?php echo (int) $rate; ?> requests / min</span>
				</div>
			</div>

			<!-- SET UP IN 3 STEPS -->
			<div style="margin-top:32px">
				<div style="display:flex;align-items:baseline;gap:10px;margin-bottom:4px">
					<h2 class="d5g-h2">Set up in 3 steps</h2><span style="font-size:13px;color:#9199a5">— about 2 minutes</span>
				</div>
				<p class="d5g-sub">Install the <?php echo $is_pro ? 'Pro toolkit' : 'free skill'; ?> in <a href="https://claude.com/claude-code" target="_blank">Claude Code</a>, hand it two values, then just ask.</p>

				<div class="d5g-grid3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">

					<div class="d5g-card" style="padding:22px;display:flex;flex-direction:column">
						<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="d5g-num">1</span><h3 style="margin:0;font:700 15px sans-serif;color:#0f0f0f">Install the <?php echo $is_pro ? 'Pro toolkit' : 'free skill'; ?></h3></div>
						<p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.55">
							<?php if ( $is_pro ) : ?>
								Your licence unlocks the full toolkit — pages, brand systems, deploy &amp; QA. Run this on your own computer, not this server.
							<?php else : ?>
								Adds the Divi&nbsp;5 section generator to Claude Code. Run this on your own computer, not this server.
							<?php endif; ?>
						</p>
						<div class="d5g-code" style="margin-top:auto"><?php echo esc_html( $install_cmd ); ?><button type="button" class="d5g-copy" data-copy="<?php echo esc_attr( $install_cmd ); ?>">Copy</button></div>
						<p style="margin:10px 0 0;font-size:11.5px;color:#9199a5">Then restart Claude Code (or run <code>/reload-plugins</code>).<?php if ( $is_pro ) : ?> This repo isn't advertised publicly — it's yours with your licence, please don't share it.<?php endif; ?></p>
					</div>

					<div class="d5g-card" style="padding:22px;display:flex;flex-direction:column">
						<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="d5g-num">2</span><h3 style="margin:0;font:700 15px sans-serif;color:#0f0f0f">Give Claude your site</h3></div>
						<p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.55">Paste these two values into Claude when it asks. That's the whole connection.</p>
						<div style="display:flex;flex-direction:column;gap:10px;margin-top:auto">
							<div>
								<div class="d5g-label">Site URL</div>
								<div class="d5g-field"><code style="font:500 12px ui-monospace,monospace;color:#374151;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><?php echo esc_html( $site_url ); ?></code><button type="button" class="d5g-btn" style="padding:5px 8px" data-copy="<?php echo esc_attr( $site_url ); ?>">Copy</button></div>
							</div>
							<div>
								<div class="d5g-label">API key</div>
								<div class="d5g-field">
									<?php if ( $plain_key ) : ?>
										<code style="font:500 12px ui-monospace,monospace;color:#374151;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;user-select:all"><?php echo esc_html( $plain_key ); ?></code><button type="button" class="d5g-btn" style="padding:5px 8px" data-copy="<?php echo esc_attr( $plain_key ); ?>">Copy</button>
									<?php elseif ( $has_key ) : ?>
										<code style="font:500 12px ui-monospace,monospace;color:#9199a5;flex:1">••••••••••••</code><span style="font-size:11px;color:#9199a5;flex:none">shown once</span>
									<?php else : ?>
										<span style="font-size:12px;color:#b32d2e;flex:1">No key yet — regenerate below</span>
									<?php endif; ?>
								</div>
							</div>
						</div>
					</div>

					<div class="d5g-card" style="padding:22px;display:flex;flex-direction:column">
						<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span class="d5g-num">3</span><h3 style="margin:0;font:700 15px sans-serif;color:#0f0f0f">Ask in plain English</h3></div>
						<p style="margin:0 0 14px;font-size:13px;color:#6b7280;line-height:1.55">Claude writes the copy, validates it, and imports it straight <?php echo $is_pro ? 'to your site' : 'to your Divi Library'; ?>.</p>
						<div style="margin-top:auto;background:#f7f7f7;border:1px solid #e5e7eb;border-radius:10px;padding:13px 14px">
							<div style="display:flex;gap:9px;align-items:flex-start">
								<span style="width:22px;height:22px;border-radius:6px;background:#222428;color:#fff;font:800 11px sans-serif;display:flex;align-items:center;justify-content:center;flex:none">C</span>
								<p style="margin:0;font-size:12.5px;color:#374151;line-height:1.5">“Build me a <?php echo $is_pro ? 'services page' : 'services section'; ?> for my plumbing business — emergency callouts, boiler servicing, bathroom installs. Brand colour <span style="color:#0B6E4F;font-weight:600">#0B6E4F</span>.”</p>
							</div>
						</div>
					</div>

				</div>
			</div>

			<!-- TWO WAYS TO BUILD -->
			<div style="margin-top:34px">
				<h2 class="d5g-h2">Two ways to build</h2>
				<p class="d5g-sub">Start free with sections you drop in yourself. <?php echo $is_pro ? 'Your Pro licence unlocks whole pages.' : 'Upgrade when hand-assembly becomes the bottleneck.'; ?></p>

				<div class="d5g-grid2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">

					<!-- FREE PATH -->
					<div class="d5g-card" style="border-radius:16px;overflow:hidden">
						<div style="padding:20px 24px;border-bottom:1px solid #f0f1f3;display:flex;align-items:center;justify-content:space-between;gap:10px">
							<div><h3 style="margin:0;font:800 17px sans-serif;color:#0f0f0f">Import a section</h3><p style="margin:4px 0 0;font-size:12.5px;color:#6b7280">Into your Divi Library — unlimited</p></div>
							<span style="font:700 10.5px sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#16a34a;background:#ecfdf3;border:1px solid #b7e9c8;padding:5px 10px;border-radius:20px;flex:none">Free</span>
						</div>
						<div style="padding:8px 24px 22px">
							<div class="d5g-step"><span class="d5g-dot">1</span><p>Ask Claude for a <strong>services section</strong> in your words.</p></div>
							<div class="d5g-step"><span class="d5g-dot">2</span><p>It generates validated Divi&nbsp;5 JSON and <strong>imports it to your Library</strong>.</p></div>
							<div class="d5g-step"><span class="d5g-dot">3</span><p>Open the <strong>Visual Builder</strong>, drop the section onto any page.</p></div>
							<div class="d5g-step"><span class="d5g-dot" style="background:#ecfdf3;border-color:#b7e9c8;color:#16a34a">✓</span><p>Published — you did the assembly, three clicks.</p></div>
						</div>
					</div>

					<!-- PRO PATH -->
					<div style="background:linear-gradient(160deg,#fffdf7,#fff);border:1px solid #f2dfa8;border-radius:16px;overflow:hidden;position:relative">
						<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(120% 60% at 100% 0%,rgba(249,195,46,.12),transparent 60%)"></div>
						<div style="padding:20px 24px;border-bottom:1px solid #f4ecd4;display:flex;align-items:center;justify-content:space-between;gap:10px;position:relative">
							<div><h3 style="margin:0;font:800 17px sans-serif;color:#0f0f0f">Create a whole page</h3><p style="margin:4px 0 0;font-size:12.5px;color:#8a7a4a">Brand, SEO &amp; schema — automatically</p></div>
							<span style="font:700 10.5px sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#8a6d16;background:#fdf3d3;border:1px solid #f2dfa8;padding:5px 10px;border-radius:20px;flex:none"><?php echo $is_pro ? '✓ Unlocked' : 'Pro'; ?></span>
						</div>
						<div style="padding:8px 24px 22px;position:relative">
							<div class="d5g-step" style="border-color:#f6f0dd"><span class="d5g-dot" style="background:#fdf3d3;border-color:#f2dfa8;color:#8a6d16">1</span><?php // The Pro repo is unlisted, not gated — never name it outside the is_pro() branch (PRD §3.1 point 3). ?>
							<p><?php if ( $is_pro ) : ?><strong>Install the full toolkit</strong> — from the Pro-only <code><?php echo esc_html( self::PRO_MARKETPLACE ); ?></code> marketplace repo.<?php else : ?><strong>Unlock the full toolkit</strong> — it ships with your Pro licence.<?php endif; ?></p></div>
							<div class="d5g-step" style="border-color:#f6f0dd"><span class="d5g-dot" style="background:#fdf3d3;border-color:#f2dfa8;color:#8a6d16">2</span><p>Ask for a <strong>full page</strong> — hero, features, FAQ — in your brand.</p></div>
							<div class="d5g-step" style="border-color:#f6f0dd"><span class="d5g-dot" style="background:#fdf3d3;border-color:#f2dfa8;color:#8a6d16">3</span><p>It extracts your colours, fonts &amp; presets, writes <strong>SEO + schema</strong>.</p></div>
							<div class="d5g-step"><span class="d5g-dot" style="background:#f9c32e;border-color:#f9c32e;color:#3a2c05">✓</span><p><strong>One command deploys it</strong> — draft or live — with screenshot QA.</p></div>

							<div style="margin-top:8px;background:#faf6ec;border:1px solid #f2dfa8;border-radius:12px;padding:15px 16px">
								<div style="display:flex;align-items:center;gap:7px;font:700 11px sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#8a6d16;margin-bottom:10px">🔒 Installing the Pro skills</div>
								<?php if ( $is_pro ) : ?>
									<p style="margin:0 0 10px;font-size:12.5px;color:#5b5330;line-height:1.6">Your licence is active. Point Claude Code at the Pro marketplace repo:</p>
									<div class="d5g-code" style="padding:12px 62px 12px 14px"><?php echo esc_html( "claude plugin marketplace add " . self::PRO_MARKETPLACE . "\nclaude plugin install divi5generate" ); ?><button type="button" class="d5g-copy" data-copy="<?php echo esc_attr( "claude plugin marketplace add " . self::PRO_MARKETPLACE . "\nclaude plugin install divi5generate" ); ?>">Copy</button></div>
									<p style="margin:10px 0 0;font-size:11.5px;color:#a08a4a">The advanced skills — full page generator, brand systems, deploy &amp; QA — plus every Pro connector feature on this site.</p>
								<?php else : ?>
									<p style="margin:0 0 10px;font-size:12.5px;color:#5b5330;line-height:1.6">The full toolkit isn't on the public marketplace. Upgrade, and this screen shows you the Pro repo and install command.</p>
									<a class="d5g-cta" href="<?php echo esc_url( $upgrade_url ); ?>">Upgrade to Pro →</a>
								<?php endif; ?>
							</div>
						</div>
					</div>

				</div>
			</div>

			<!-- YOUR CONNECTION -->
			<div style="margin-top:34px">
				<h2 class="d5g-h2">Your connection</h2>
				<p class="d5g-sub">What's live on this site right now.</p>
				<div class="d5g-card" style="border-radius:16px;padding:24px">
					<div class="d5g-grid4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px">

						<div style="border:1px solid #eef0f2;border-radius:12px;padding:16px">
							<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:#9199a5;font-weight:600">API key</span><span style="width:8px;height:8px;border-radius:50%;background:<?php echo $has_key ? '#34d399' : '#f87171'; ?>"></span></div>
							<div style="font:700 14px sans-serif;color:#0f0f0f"><?php echo $has_key ? 'Set &amp; hidden' : 'Not generated'; ?></div>
							<form method="post" style="margin:10px 0 0">
								<?php wp_nonce_field( 'd5g_action' ); ?>
								<input type="hidden" name="d5g_action" value="regenerate_key">
								<button type="submit" class="d5g-btn" onclick="return confirm('Regenerate key? Your current key will stop working immediately.')">Regenerate key</button>
							</form>
						</div>

						<div style="border:1px solid #eef0f2;border-radius:12px;padding:16px">
							<div style="margin-bottom:8px"><span style="font-size:12px;color:#9199a5;font-weight:600">Import endpoint</span></div>
							<code style="font:500 11px ui-monospace,monospace;color:#374151;display:block;line-height:1.4;word-break:break-all">/wp-json/divi5-generator/v1/import</code>
							<button type="button" class="d5g-btn" style="margin-top:10px" data-copy="<?php echo esc_attr( $endpoint ); ?>">Copy endpoint</button>
						</div>

						<div style="border:1px solid <?php echo $has_seo ? '#d5f0de' : '#fde3e0'; ?>;background:<?php echo $has_seo ? '#f6fdf8' : '#fef6f5'; ?>;border-radius:12px;padding:16px">
							<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:<?php echo $has_seo ? '#15803d' : '#c0574f'; ?>;font-weight:600">SEO plugin</span><span style="width:18px;height:18px;border-radius:50%;background:<?php echo $has_seo ? '#c9ecd6' : '#f3d0cc'; ?>;color:<?php echo $has_seo ? '#15803d' : '#b32d2e'; ?>;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700"><?php echo $has_seo ? '✓' : '✕'; ?></span></div>
							<div style="font:700 13.5px sans-serif;color:#0f0f0f"><?php echo esc_html( $seo_name ); ?></div>
							<p style="margin:6px 0 0;font-size:11.5px;color:<?php echo $has_seo ? '#63917a' : '#a1615c'; ?>;line-height:1.4"><?php echo $has_seo ? 'SEO meta is written natively.' : 'Install Yoast or Rank Math for auto meta.'; ?></p>
						</div>

						<div style="border:1px solid <?php echo $has_divi5 ? '#d5f0de' : '#fde3e0'; ?>;background:<?php echo $has_divi5 ? '#f6fdf8' : '#fef6f5'; ?>;border-radius:12px;padding:16px">
							<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:12px;color:<?php echo $has_divi5 ? '#15803d' : '#c0574f'; ?>;font-weight:600">Divi 5</span><span style="width:18px;height:18px;border-radius:50%;background:<?php echo $has_divi5 ? '#c9ecd6' : '#f3d0cc'; ?>;color:<?php echo $has_divi5 ? '#15803d' : '#b32d2e'; ?>;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700"><?php echo $has_divi5 ? '✓' : '✕'; ?></span></div>
							<div style="font:700 13.5px sans-serif;color:#0f0f0f"><?php echo $has_divi5 ? 'Detected' : 'Not detected'; ?></div>
							<p style="margin:6px 0 0;font-size:11.5px;color:<?php echo $has_divi5 ? '#63917a' : '#a1615c'; ?>;line-height:1.4"><?php echo $has_divi5 ? 'Full import — presets + colours.' : 'Content-only import until Divi&nbsp;5 is active.'; ?></p>
						</div>

					</div>

					<!-- quick test -->
					<div style="border-top:1px solid #f0f1f3;padding-top:18px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
						<div style="flex:none">
							<div style="font:700 13px sans-serif;color:#0f0f0f">Quick test</div>
							<div style="font-size:12px;color:#9199a5">Sends your key in the <code>X-D5G-Key</code> header, like the importer does.</div>
						</div>
						<input type="text" id="d5g-test-key" placeholder="Paste your API key" autocomplete="off" spellcheck="false"
							style="flex:1;min-width:200px;background:#f7f7f7;border:1px solid #e5e7eb;border-radius:9px;padding:10px 13px;font:500 13px ui-monospace,monospace;color:#374151"<?php echo $plain_key ? ' value="' . esc_attr( $plain_key ) . '"' : ''; ?>>
						<button type="button" id="d5g-test-btn" class="d5g-cta" data-ping="<?php echo esc_url( $ping_url ); ?>">Test connection</button>
						<span id="d5g-test-result" style="font:600 13px sans-serif"></span>
						<pre id="d5g-test-output" style="display:none;width:100%;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;margin:0"></pre>
					</div>
				</div>
			</div>

			<?php if ( ! $is_pro ) : ?>
			<!-- PRO BANNER -->
			<div style="margin-top:34px;background:linear-gradient(120deg,#222428 0%,#2b2620 55%,#3a2410 100%);border-radius:18px;padding:30px 34px;position:relative;overflow:hidden">
				<div style="position:absolute;right:-30px;top:-50px;width:300px;height:300px;background:radial-gradient(circle,rgba(249,195,46,.22),transparent 68%);pointer-events:none"></div>
				<div style="position:relative;display:flex;gap:34px;align-items:center;flex-wrap:wrap">
					<div style="flex:1;min-width:340px">
						<span style="display:inline-flex;align-items:center;gap:6px;font:700 10.5px sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#f9c32e;background:rgba(249,195,46,.12);border:1px solid rgba(249,195,46,.4);padding:5px 11px;border-radius:20px">⚡ Divi5 Generator Pro</span>
						<h2 style="margin:14px 0 8px;font:800 24px/1.15 sans-serif;color:#fff;letter-spacing:-.015em;max-width:460px">Go from sections to whole pages.</h2>
						<p style="margin:0;font-size:14px;color:#b9bcc4;max-width:480px;line-height:1.55">Now imagine that section — but the entire page, in your brand, with SEO baked in, deployed in one command. That's Pro.</p>
						<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;max-width:520px">
							<span class="d5g-chip">Full page generation</span>
							<span class="d5g-chip">SEO titles, meta &amp; JSON-LD</span>
							<span class="d5g-chip">Brand extract &amp; deploy</span>
							<span class="d5g-chip">Presets &amp; global variables</span>
							<span class="d5g-chip">Nav menus</span>
							<span class="d5g-chip"><?php echo class_exists( 'D5G_Limits' ) ? (int) D5G_Limits::RATE_LIMIT_PRO : 120; ?> req/min — 4× Free</span>
						</div>
					</div>
					<div style="flex:none;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.13);border-radius:16px;padding:22px;width:270px">
						<p style="margin:0 0 16px;font-size:13px;color:#b9bcc4;line-height:1.55">One licence unlocks the <strong style="color:#fff">full Divi5 Generator toolkit</strong> for Claude Code, plus every Pro connector feature on this site.</p>
						<a class="d5g-cta" style="width:100%;justify-content:center;box-sizing:border-box" href="<?php echo esc_url( $upgrade_url ); ?>">Upgrade to Pro →</a>
						<div style="text-align:center;margin-top:10px;font-size:11.5px;color:#8b8e97">See plans &amp; pricing</div>
					</div>
				</div>
			</div>
			<?php endif; ?>

			<!-- ADVANCED -->
			<div class="d5g-card" style="margin-top:28px;overflow:hidden">
				<button type="button" id="d5g-adv-btn" style="width:100%;display:flex;align-items:center;justify-content:space-between;background:#fff;border:none;padding:18px 24px;cursor:pointer;text-align:left">
					<span style="display:flex;flex-direction:column;gap:2px">
						<span style="font:700 15px sans-serif;color:#0f0f0f">Advanced &amp; developer tools</span>
						<span style="font-size:12.5px;color:#9199a5">Example request, connector activity log<?php echo empty( $log ) ? '' : ' (' . count( $log ) . ')'; ?></span>
					</span>
					<span id="d5g-adv-chev" style="color:#9199a5;font-size:14px;transition:transform .2s">▼</span>
				</button>
				<div id="d5g-adv" style="display:none;padding:0 24px 24px;border-top:1px solid #f0f1f3">
					<div style="margin:20px 0 10px;font:700 12px sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#9199a5">Example request</div>
					<pre style="margin:0;background:#141414;color:#d4d4d4;padding:16px 18px;border-radius:10px;overflow-x:auto;font:500 12px/1.7 ui-monospace,monospace">curl -s -X POST \
  '<?php echo esc_html( $endpoint ); ?>' \
  -H 'Content-Type: application/json' \
  -H 'X-D5G-Key: YOUR_KEY_HERE' \
  -d '{
    "layout":  { ...et_builder JSON... },
    "seo":     { "title": "Page Title | Brand", "description": "...", "slug": "page-slug" },
    "schema":  { "@context": "https://schema.org", "@type": "FAQPage", ... },
    "publish": false
  }'</pre>

					<div style="margin-top:22px;display:flex;align-items:baseline;gap:8px">
						<span style="font:700 12px sans-serif;letter-spacing:.05em;text-transform:uppercase;color:#9199a5">Connector log</span><span style="font-size:11.5px;color:#c3c6cc">last 50</span>
					</div>
					<?php if ( empty( $log ) ) : ?>
						<div style="margin-top:10px;border:1px dashed #dfe2e6;border-radius:12px;padding:26px;text-align:center;background:#fafbfc">
							<div style="font:700 14px sans-serif;color:#4b5563">No imports yet</div>
							<p style="margin:6px 0 0;font-size:12.5px;color:#9199a5">Run your first import and it'll appear here — time, slug, status and any warnings.</p>
						</div>
					<?php else : ?>
						<form method="post" style="margin:10px 0 12px">
							<?php wp_nonce_field( 'd5g_action' ); ?>
							<input type="hidden" name="d5g_action" value="clear_log">
							<button type="submit" class="d5g-btn">Clear log</button>
						</form>
						<table class="widefat striped">
							<thead>
								<tr><th>Time</th><th>Slug</th><th>Action</th><th>Status</th><th>SEO plugin</th><th>Warnings</th></tr>
							</thead>
							<tbody>
								<?php foreach ( $log as $entry ) : ?>
									<tr>
										<td><?php echo esc_html( $entry['time'] ); ?></td>
										<td><code><?php echo esc_html( $entry['slug'] ); ?></code></td>
										<td><?php echo esc_html( $entry['action'] ); ?></td>
										<td><?php echo esc_html( $entry['status'] ); ?></td>
										<?php // Library imports write no SEO meta (page-path only, PRD §3.2), so they log no seo_plugin. ?>
										<td><?php echo esc_html( $entry['seo_plugin'] ?? '—' ); ?></td>
										<td>
											<?php if ( ! empty( $entry['warnings'] ) ) : ?>
												<ul style="margin:0">
													<?php foreach ( $entry['warnings'] as $w ) : ?>
														<li style="color:#b32d2e"><?php echo esc_html( $w ); ?></li>
													<?php endforeach; ?>
												</ul>
											<?php else : ?>
												<span style="color:green">None</span>
											<?php endif; ?>
										</td>
									</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					<?php endif; ?>
				</div>
			</div>

			<div style="margin:26px 0 40px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;font-size:12.5px;color:#9199a5">
				<span>Divi5 Generator v<?php echo esc_html( defined( 'D5G_VERSION' ) ? D5G_VERSION : '' ); ?> · by <a href="https://iconnectit.co.uk" target="_blank">iConnectIT</a></span>
				<span><a href="mailto:support@iconnectit.co.uk">support@iconnectit.co.uk</a></span>
			</div>
		</div>
		<script>
		(function () {
			// Copy buttons — data-copy holds the literal text.
			document.querySelectorAll('[data-copy]').forEach(function (b) {
				b.addEventListener('click', function () {
					var done = function () {
						var html = b.innerHTML, c = b.style.color;
						b.innerHTML = 'Copied ✓';
						b.style.color = '#16a34a';
						setTimeout(function () { b.innerHTML = html; b.style.color = c; }, 1300);
					};
					if (navigator.clipboard) {
						navigator.clipboard.writeText(b.dataset.copy).then(done, function () {});
					}
				});
			});

			var adv = document.getElementById('d5g-adv');
			document.getElementById('d5g-adv-btn').addEventListener('click', function () {
				var hidden = adv.style.display === 'none';
				adv.style.display = hidden ? 'block' : 'none';
				document.getElementById('d5g-adv-chev').style.transform = hidden ? 'rotate(180deg)' : '';
			});

			var btn = document.getElementById('d5g-test-btn');
			btn.addEventListener('click', function () {
				var key    = document.getElementById('d5g-test-key').value.trim();
				var result = document.getElementById('d5g-test-result');
				var output = document.getElementById('d5g-test-output');
				if (!key) {
					result.textContent = '✗ Enter your API key first';
					result.style.color = '#b32d2e';
					output.style.display = 'none';
					return;
				}
				result.textContent = 'Testing…';
				result.style.color = '#666';
				output.style.display = 'none';
				fetch(btn.dataset.ping, { headers: { 'X-D5G-Key': key } })
					.then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
					.then(function (res) {
						output.style.display = 'block';
						output.textContent = JSON.stringify(res.body, null, 2);
						if (res.status === 200 && res.body && res.body.status === 'ok') {
							result.textContent = '✓ Connected — key valid';
							result.style.color = 'green';
						} else if (res.status === 401) {
							result.textContent = '✗ 401 — invalid or missing key';
							result.style.color = '#b32d2e';
						} else if (res.status === 429) {
							result.textContent = '✗ 429 — rate limited, wait 60s';
							result.style.color = '#b32d2e';
						} else {
							result.textContent = '✗ HTTP ' + res.status;
							result.style.color = '#b32d2e';
						}
					})
					.catch(function (e) {
						result.textContent = '✗ Request failed (' + e.message + ')';
						result.style.color = '#b32d2e';
						output.style.display = 'block';
						output.textContent = String(e);
					});
			});
		})();
		</script>
		<?php
	}

	/**
	 * Step-1 install instructions, branched on licence tier.
	 *
	 * Free installs get the public divi5-starter (a single credited section)
	 * plus an upgrade CTA; Pro installs get the full divi5generate toolkit from
	 * the public D5G marketplace, with the licensed Add-Ons download kept as an
	 * offline alternative. Returned as a string (not echoed) so both branches
	 * are unit-testable without toggling D5G_Limits::is_pro().
	 */
	public static function install_instructions_html( bool $is_pro ): string {
		ob_start();
		if ( $is_pro ) :
			$addons_url = function_exists( 'dg_fs' ) ? dg_fs()->_get_admin_page_url( 'addons' ) : '';
			?>
			<p>Your Pro licence includes the <strong>full Divi 5 toolkit</strong> — whole-page generation, brand extract/deploy, and one-command import skills. Install it into Claude Code:</p>
			<pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow-x:auto;font-size:12px">claude plugin marketplace add Kieransaunders/D5G</pre>
			<p class="description">Restart Claude Code (or run <code>/reload-plugins</code>) afterwards, then verify with <em>"run /divi5generate:help"</em>.</p>
			<p class="description">Prefer an offline install? Download <code>divi5generate-toolkit.zip</code> from the <a href="<?php echo esc_url( $addons_url ); ?>"><strong>Add-Ons</strong></a> screen (Divi5 Generator → Add-Ons), unzip it, and run <code style="user-select:all">claude plugin marketplace add /path/to/divi5generate</code>.</p>
		<?php else : ?>
			<p>Install the <strong>free Divi 5 Starter</strong> (a services-section generator) into Claude Code:</p>
			<pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow-x:auto;font-size:12px">claude plugin marketplace add Kieransaunders/divi5-starter
claude plugin install divi5-starter@divi5-starter</pre>
			<p class="description">Restart Claude Code (or run <code>/reload-plugins</code>) afterwards. The free starter generates a single credited section. <a href="https://checkout.freemius.com/plugin/33991/" target="_blank"><strong>Upgrade to Pro</strong></a> for the full toolkit: whole-page generation, brand extract/deploy, and one-click import.</p>
		<?php endif;
		return (string) ob_get_clean();
	}
}
