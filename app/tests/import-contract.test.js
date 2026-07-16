'use strict';

// Contract test: the payload the app sends to the importer plugin must only
// contain params the plugin actually declares. This reads the plugin's real
// route registration so the test fails the moment app and plugin drift apart
// (e.g. the old `draft: true` bug, which the plugin silently ignored).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { buildImportPayload, IMPORT_PARAMS } = require('../lib/import-payload');

const REST_API_PHP = path.join(
  __dirname, '..', '..', 'plugin', 'divi5-generator', 'src', 'RestApi.php'
);

// Pull the declared arg keys for the /import route out of RestApi.php.
function declaredImportParams() {
  const php = fs.readFileSync(REST_API_PHP, 'utf8');
  const route = php.indexOf("'/import'");
  assert.notEqual(route, -1, '/import route not found in RestApi.php');
  // Grab the args array for this route: from the route up to the closing of
  // its register_rest_route( ... ) call.
  const argsStart = php.indexOf("'args'", route);
  const slice = php.slice(argsStart, php.indexOf('register_rest_route', argsStart + 1));
  const keys = [...slice.matchAll(/'(\w+)'\s*=>\s*array\(\s*'required'/g)].map(m => m[1]);
  assert.ok(keys.length > 0, 'could not parse declared /import args');
  return keys;
}

test('app IMPORT_PARAMS match what the plugin declares', () => {
  const declared = declaredImportParams().sort();
  assert.deepEqual([...IMPORT_PARAMS].sort(), declared,
    `app/plugin import params drifted. plugin declares: ${declared.join(', ')}`);
});

test('buildImportPayload only emits keys the plugin understands', () => {
  const payload = buildImportPayload({
    layout: { a: 1 }, seo: { title: 't' }, schema: { '@type': 'X' }, publish: true,
  });
  const declared = declaredImportParams();
  for (const key of Object.keys(payload)) {
    assert.ok(declared.includes(key), `payload key "${key}" is not a declared plugin param`);
  }
});

test('publish flag maps correctly; defaults to true (live for QA)', () => {
  // Plugin ≥ 1.5.4 + this builder default to publish=true so imported pages
  // render live (screenshot-readable without a WP login). Drafts 404 headlessly.
  assert.equal(buildImportPayload({ layout: {} }).publish, true);
  assert.equal(buildImportPayload({ layout: {}, publish: false }).publish, false);
  assert.equal(buildImportPayload({ layout: {}, publish: 'no' }).publish, true); // truthy string coerced
  // No legacy `draft` key should ever be emitted.
  assert.equal('draft' in buildImportPayload({ layout: {} }), false);
});

test('seo and schema default to empty objects, never null', () => {
  const p = buildImportPayload({ layout: {} });
  assert.deepEqual(p.seo, {});
  assert.deepEqual(p.schema, {});
});

test('buildImportPayload rejects a missing layout', () => {
  assert.throws(() => buildImportPayload({}), /layout is required/);
});

test('brand bundle rides inside layout, not as a 5th top-level payload key', () => {
  const brand = { presets: { module: {} }, global_colors: [], global_variables: [] };
  const p = buildImportPayload({ layout: { context: 'et_builder' }, brand });
  // The plugin reads $layout['brand'] — so brand must be nested, and the payload
  // must still expose only the four declared IMPORT_PARAMS.
  assert.deepEqual(p.layout.brand, brand, 'brand not merged into layout');
  assert.equal('brand' in p, false, 'brand leaked to the top level of the payload');
  assert.deepEqual(Object.keys(p).sort(), [...IMPORT_PARAMS].sort());
});

test('no brand bundle leaves the layout untouched', () => {
  const layout = { context: 'et_builder', data: { 1: 'x' } };
  const p = buildImportPayload({ layout });
  assert.equal('brand' in p.layout, false);
});
