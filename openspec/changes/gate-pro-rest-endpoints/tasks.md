## 1. Test infrastructure
- [x] 1.1 Add `WP_REST_Request`, `get_transient`/`set_transient`, `get_option` stubs to `tests/bootstrap.php`; require `Limits.php`, `Auth.php`, `RestApi.php`
- [x] 1.2 Pin `doctrine/instantiator` to `^1.5` (2.1.0 requires PHP 8.4 and fatals under our PHP 8.2 test environment — pre-existing landmine, unrelated to this feature, fixed so tests are runnable)
- [x] 1.3 Add `RestApi` testsuite entry to `phpunit.xml`
- [x] 1.4 Write `tests/RestApiProGateTest.php` (RED — confirmed failing for the right reason)

## 2. Route policy (pure)
- [ ] 2.1 Add `D5G_RestApi::requires_pro( string $route ): bool` with the 9 Pro-only routes from PRD §3 — satisfies scenarios "Preset, global-variable, menu, and DB routes are classified Pro-only" / "Ping, preview, import, export, and pages routes are classified Free"

## 3. Licence gate
- [ ] 3.1 Add `D5G_RestApi::pro_gate( string $route, bool $is_pro ): true|WP_Error` returning `WP_Error( 'pro_required', ..., [ 'status' => 403 ] )` when `requires_pro()` is true and `$is_pro` is false — satisfies "Free install calls a Pro-only route" / "Pro install calls the same route" / "Free install calls /ping"

## 4. Wire into authenticate()
- [ ] 4.1 Call `self::pro_gate( $request->get_route(), D5G_Limits::is_pro() )` in `authenticate()` after the key check, before returning `true` — satisfies "Missing key on a Pro-only route" (already green, guards no regression)

## 5. Verify
- [ ] 5.1 `./vendor/bin/phpunit --testsuite RestApi` — all 6 tests green
- [ ] 5.2 `./vendor/bin/phpunit` (full suite) — no regressions
