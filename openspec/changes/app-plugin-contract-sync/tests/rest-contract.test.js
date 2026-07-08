'use strict';

// RED state — this is the contract test that enforces the app↔plugin D5G values.
// It fails against current `main` because:
//   - app/server.js still hardcodes `divi-tools/v1` and `X-Divi-Tools-Key`
//   - DbExporter.php SKIP_OPTION_NAME still lists the stale `dti_*` option names
//   - RestApi.php delete handler queries `_dti_imported`, not `_d5g_imported`
// It goes GREEN after the app-plugin-contract-sync change.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const SERVER_JS   = path.join(__dirname, '..', '..', '..', 'app', 'server.js');
const REST_API    = path.join(__dirname, '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'RestApi.php');
const DB_EXPORTER = path.join(__dirname, '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'DbExporter.php');
const AUTH        = path.join(__dirname, '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'Auth.php');
const PAGE_IMP    = path.join(__dirname, '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'PageImporter.php');

const read = (p) => fs.readFileSync(p, 'utf8');

// ─── namespace + auth header ─────────────────────────────────────────────────

test('app and plugin agree on the REST namespace divi5-generator/v1', () => {
  const php = read(REST_API);
  const m = php.match(/const NAMESPACE\s*=\s*'([^']+)'/);
  assert.ok(m, 'D5G_RestApi::NAMESPACE not found');
  assert.equal(m[1], 'divi5-generator/v1', 'plugin namespace drifted');

  const js = read(SERVER_JS);
  assert.ok(!/divi-tools\/v1/.test(js), 'app still references the stale divi-tools/v1 namespace');
});

test('app sends X-D5G-Key, matching the header the plugin reads', () => {
  const php = read(REST_API);
  const m = php.match(/get_header\(\s*'([^']+)'\s*\)/);
  assert.ok(m, 'no get_header() call found in RestApi.php');
  assert.equal(m[1], 'X-D5G-Key', 'plugin reads a different header');

  const js = read(SERVER_JS);
  assert.ok(!/X-Divi-Tools-Key/.test(js), 'app still sends the stale X-Divi-Tools-Key header');
  assert.ok(/'X-D5G-Key'/.test(js), 'app does not send X-D5G-Key');
});

// ─── secret leak: export skip-list must cover Auth-written options ────────────

test('DbExporter skip-list covers every option Auth writes the key into', () => {
  const auth = read(AUTH);
  const exporter = read(DB_EXPORTER);

  // Auth writes the hash to KEY_OPTION, the plain key to 'd5g_api_key_plain',
  // and rate-limit state to RATE_OPTION.
  const authKeys = [
    ...auth.matchAll(/const \w+_OPTION\s*=\s*'([^']+)'/g),
    ...auth.matchAll(/update_option\(\s*'([^']+)'/g),
  ].map((m) => m[1]);
  // The plain-key write is a literal, not the const — include it explicitly.
  assert.ok(authKeys.includes('d5g_api_key_plain'), 'expected d5g_api_key_plain write in Auth');

  const skipBlock = exporter.match(/SKIP_OPTION_NAME\s*=\s*array\(([^)]+)\)/);
  assert.ok(skipBlock, 'SKIP_OPTION_NAME array not found');
  const skipped = skipBlock[1];

  for (const k of authKeys) {
    assert.ok(skipped.includes(`'${k}'`),
      `secret leak: option "${k}" is written by Auth but NOT excluded by DbExporter`);
  }
});

// ─── broken DELETE: meta key must match the stamp PageImporter writes ─────────

test('DELETE /pages meta key matches the stamp PageImporter writes', () => {
  const rest = read(REST_API);
  const imp = read(PAGE_IMP);

  const stamped = imp.match(/update_post_meta\(\s*\$page_id,\s*'([^']+)'/);
  assert.ok(stamped, 'PageImporter import-stamp not found');
  const stampKey = stamped[1];
  assert.equal(stampKey, '_d5g_imported', 'PageImporter stamps an unexpected meta key');

  // Find the meta_key used in the delete handler (the route registered with methods DELETE).
  const deleteMeta = rest.match(/'methods'\s*=>\s*'DELETE'[\s\S]*?'meta_key'\s*=>\s*'([^']+)'/);
  assert.ok(deleteMeta, 'DELETE /pages meta_key not found in RestApi.php');
  assert.equal(deleteMeta[1], stampKey,
    `DELETE queries "${deleteMeta[1]}" but pages are stamped "${stampKey}"`);
});
