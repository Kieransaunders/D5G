<?php

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class D5G_SettingsPage {

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

	public static function render(): void {
		// Show plain key once, then delete it.
		$plain_key = get_option( 'd5g_api_key_plain', '' );
		if ( $plain_key ) {
			delete_option( 'd5g_api_key_plain' );
		}

		$has_key     = (bool) get_option( D5G_Auth::KEY_OPTION );
		$endpoint    = home_url( '/wp-json/divi5-generator/v1/import' );
		$ping_url    = home_url( '/wp-json/divi5-generator/v1/ping' );
		$log         = D5G_Auth::get_log();
		$msg         = sanitize_key( $_GET['d5g_msg'] ?? '' );
		?>
		<div class="wrap">
			<h1>Divi5 Generator</h1>

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

			<table class="form-table" role="presentation">
				<tr>
					<th>API Key</th>
					<td>
						<?php if ( $has_key && ! $plain_key ) : ?>
							<em>Key is set (hidden for security)</em>
						<?php elseif ( ! $has_key ) : ?>
							<em>No key generated yet — activate the plugin to generate one.</em>
						<?php endif; ?>
						<form method="post" style="margin-top:8px">
							<?php wp_nonce_field( 'd5g_action' ); ?>
							<input type="hidden" name="d5g_action" value="regenerate_key">
							<button type="submit" class="button" onclick="return confirm('Regenerate key? Your current key will stop working immediately.')">
								Regenerate Key
							</button>
						</form>
					</td>
				</tr>
				<tr>
					<th>Import Endpoint</th>
					<td>
						<code style="user-select:all"><?php echo esc_html( $endpoint ); ?></code>
					</td>
				</tr>
				<tr>
					<th>Quick test</th>
					<td>
						<input type="text" id="d5g-test-key" class="regular-text" autocomplete="off" spellcheck="false"
							placeholder="Paste your API key" style="font-family:monospace"<?php echo $plain_key ? ' value="' . esc_attr( $plain_key ) . '"' : ''; ?>>
						<button type="button" id="d5g-test-btn" class="button" data-ping="<?php echo esc_url( $ping_url ); ?>">Test connection</button>
						<span id="d5g-test-result" style="margin-left:10px;font-weight:600"></span>
						<p class="description">Sends your key in the <code>X-D5G-Key</code> header (the same path the importer uses) and shows the live response. Your key stays out of the URL and server logs.</p>
						<pre id="d5g-test-output" style="display:none;background:#1e1e1e;color:#d4d4d4;padding:12px;border-radius:6px;overflow-x:auto;font-size:12px;max-width:900px;margin-top:8px"></pre>
				<script>
				(function () {
					var btn = document.getElementById('d5g-test-btn');
					if (!btn) return;
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
					</td>
				</tr>
				<tr>
					<th>SEO plugin</th>
					<td>
						<?php
						if ( defined( 'WPSEO_VERSION' ) ) {
							echo '<span style="color:green">✓ Yoast SEO detected</span>';
						} elseif ( class_exists( 'RankMath' ) ) {
							echo '<span style="color:green">✓ Rank Math detected</span>';
						} else {
							echo '<span style="color:#b32d2e">✗ No SEO plugin detected — install Yoast or Rank Math for automatic meta injection</span>';
						}
						?>
					</td>
				</tr>
				<tr>
					<th>Divi 5</th>
					<td>
						<?php
						if ( class_exists( 'ET\\Builder\\Packages\\GlobalData\\GlobalPreset' ) ) {
							echo '<span style="color:green">✓ Divi 5 detected — full import (presets + colours)</span>';
						} else {
							echo '<span style="color:#b32d2e">✗ Divi 5 not detected — content-only import</span>';
						}
						?>
					</td>
				</tr>
			</table>

			<hr>
			<h2>How to use</h2>
			<p><strong>Step 1 — install the skills into Claude Code</strong> (one-time, in a terminal on your own computer, not this server):</p>
			<pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow-x:auto;font-size:12px">claude plugin marketplace add Kieransaunders/Divi5Generate
claude plugin install divi5generate@divi5generate</pre>
			<p class="description">Requires <a href="https://claude.com/claude-code" target="_blank">Claude Code</a>. Restart Claude Code (or run <code>/reload-plugins</code>) afterwards — the Divi 5 generate/import/review skills are then available in every session. To check it worked, ask Claude: <em>"run /divi5generate:help"</em>.</p>
			<p><strong>Step 2 — connect it to this site.</strong> Give these two values to Claude Code (or paste them into the <code>import</code> skill):</p>
			<ol>
				<li><strong>Site URL:</strong> <code><?php echo esc_html( home_url() ); ?></code></li>
				<li><strong>API Key:</strong> the key shown above (or regenerate to see it again)</li>
			</ol>
			<p>Claude will call the <code>/wp-json/divi5-generator/v1/</code> connector endpoints to preview, import, export, extract brand data, deploy presets/global variables, or verify pages. Page imports can publish immediately for real front-end verification.</p>

			<hr>
			<h2>Example curl</h2>
			<pre style="background:#1e1e1e;color:#d4d4d4;padding:16px;border-radius:6px;overflow-x:auto;font-size:12px">curl -s -X POST \
  '<?php echo esc_html( $endpoint ); ?>' \
  -H 'Content-Type: application/json' \
  -H 'X-D5G-Key: YOUR_KEY_HERE' \
  -d '{
    "layout":  { ...et_builder JSON... },
    "seo":     { "title": "Page Title | Brand", "description": "...", "slug": "page-slug" },
    "schema":  { "@context": "https://schema.org", "@type": "FAQPage", ... },
    "publish": false
  }'</pre>

			<hr>
			<h2>Connector log <small>(last 50)</small></h2>
			<?php if ( empty( $log ) ) : ?>
				<p><em>No imports yet.</em></p>
			<?php else : ?>
				<form method="post" style="margin-bottom:12px">
					<?php wp_nonce_field( 'd5g_action' ); ?>
					<input type="hidden" name="d5g_action" value="clear_log">
					<button type="submit" class="button button-small">Clear log</button>
				</form>
				<table class="widefat striped" style="max-width:900px">
					<thead>
						<tr>
							<th>Time</th>
							<th>Slug</th>
							<th>Action</th>
							<th>Status</th>
							<th>SEO plugin</th>
							<th>Warnings</th>
						</tr>
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
		<?php
	}
}
