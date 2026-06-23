'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractIntent, stripIntent } = require('../lib/intent-marker');

test('extracts a GEN_INTENT marker', () => {
  const text = 'Sure. <!-- GEN_INTENT: {"brand":"Floria","pageType":"about"} --> Done.';
  assert.deepEqual(extractIntent(text), { brand: 'Floria', pageType: 'about' });
  assert.equal(stripIntent(text).includes('GEN_INTENT'), false);
});

test('returns null when no marker present', () => {
  assert.equal(extractIntent('just text'), null);
  assert.equal(stripIntent('just text'), 'just text');
});

test('handles multi-line text with marker on its own line', () => {
  const text = 'line1\n<!-- GEN_INTENT: {"keyword":"x"} -->\nline3';
  assert.deepEqual(extractIntent(text), { keyword: 'x' });
  assert.ok(stripIntent(text).includes('line1'));
  assert.ok(stripIntent(text).includes('line3'));
});

test('returns null for a malformed JSON marker (does not throw)', () => {
  const text = '<!-- GEN_INTENT: {not valid json} -->';
  assert.equal(extractIntent(text), null);
});

test('stripIntent collapses the resulting blank lines', () => {
  const text = 'a\n\n<!-- GEN_INTENT: {"k":1} -->\n\nb';
  assert.equal(stripIntent(text), 'a\n\nb');
});

test('handles null/undefined input safely', () => {
  assert.equal(extractIntent(null), null);
  assert.equal(extractIntent(undefined), null);
  assert.equal(stripIntent(undefined), '');
});
