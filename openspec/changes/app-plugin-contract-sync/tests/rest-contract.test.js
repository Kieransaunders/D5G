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

// NOTE: paths here resolve relative to this file's location in the change folder
// (openspec/changes/app-plugin-contract-sync/tests/). The canonical, runnable
// copy lives at app/tests/rest-contract.test.js with app-relative paths.
const SERVER_JS   = path.join(__dirname, '..', '..', '..', '..', 'app', 'server.js');
const REST_API    = path.join(__dirname, '..', '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'RestApi.php');
const DB_EXPORTER = path.join(__dirname, '..', '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'DbExporter.php');
const AUTH        = path.join(__dirname, '..', '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'Auth.php');
const PAGE_IMP    = path.join(__dirname, '..', '..', '..', '..', 'plugin', 'divi5-generator', 'src', 'PageImporter.php');

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

// ─── secret leak: export skip-list must cover Auth-written credentials ────────

test('DbExporter skip-list covers every credential option Auth writes', () => {
  const auth = read(AUTH);
  const exporter = read(DB_EXPORTER);

  // The credential-bearing options Auth writes: the hashed key (KEY_OPTION),
  // the plaintext-for-display key (the `d5g_api_key_plain` literal), and the
  // rate-limit counter (RATE_OPTION, which is auth-adjacent state).
  // The import LOG_OPTION (`d5g_import_log`) is deliberately NOT required here —
  // it is an audit trail, not a secret, and is useful to transfer.
  const creds = [
    ...auth.matchAll(/const (KEY_OPTION|RATE_OPTION)\s*=\s*'([^']+)'/g),
  ].map((m) => m[2]);
  creds.push('d5g_api_key_plain'); // written as a literal, not via the const
  assert.ok(creds.length === 3 && creds.includes('d5g_api_key_hash') && creds.includes('d5g_rate_limit'),
    `could not resolve Auth credential options (got: ${creds.join(', ')})`);

  const skipBlock = exporter.match(/SKIP_OPTION_NAME\s*=\s*array\(([^)]+)\)/);
  assert.ok(skipBlock, 'SKIP_OPTION_NAME array not found');
  const skipped = skipBlock[1];

  for (const k of creds) {
    assert.ok(skipped.includes(`'${k}'`),
      `secret leak: credential option "${k}" is written by Auth but NOT excluded by DbExporter`);
  }
});

// ─── broken DELETE: meta key must match the stamp PageImporter writes ─────────

test('DELETE /pages meta key matches the stamp PageImporter writes', () => {
  const rest = read(REST_API);
  const imp = read(PAGE_IMP);

  // Anchor specifically on the _d5g_imported stamp (PageImporter writes several
  // update_post_meta calls; only this one is the import-stamp that /pages keys off).
  const stampKey = '_d5g_imported';
  assert.ok(
    new RegExp(`update_post_meta\\(\\s*\\$page_id,\\s*'${stampKey}'`).test(imp),
    `PageImporter does not stamp "${stampKey}"`,
  );

  // Find the meta_key used in the delete handler (the route registered with methods DELETE).
  const deleteMeta = rest.match(/'methods'\s*=>\s*'DELETE'[\s\S]*?'meta_key'\s*=>\s*'([^']+)'/);
  assert.ok(deleteMeta, 'DELETE /pages meta_key not found in RestApi.php');
  assert.equal(deleteMeta[1], stampKey,
    `DELETE queries "${deleteMeta[1]}" but pages are stamped "${stampKey}"`);
});
