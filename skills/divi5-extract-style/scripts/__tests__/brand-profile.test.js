'use strict';

const test   = require('node:test');
const assert = require('node:assert/strict');
const path   = require('node:path');
const fs     = require('node:fs');

const { extractBrandProfileFromExport } = require('../extract-from-export');

function fixture() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'minimal-export.json'), 'utf8'));
}

test('extractBrandProfileFromExport returns a Brand Profile JSON object', () => {
  const profile = extractBrandProfileFromExport(fixture());
  assert.equal(profile.sourceType, 'export');
  assert.equal(typeof profile, 'object');
});

test('pulls colours from global_colors tuples with resolved hex + source:export', () => {
  const profile = extractBrandProfileFromExport(fixture());
  assert.ok(Array.isArray(profile.colors));
  assert.ok(profile.colors.length >= 3, 'should find the 3 global colours');
  for (const c of profile.colors) {
    assert.ok(c.role, 'each colour needs a role');
    assert.ok(/^[#]/.test(c.hex), `hex should start with #, got ${c.hex}`);
    assert.equal(c.source, 'export');
    assert.equal(c.locked, false);
    assert.ok(c.id, 'should carry its gcid- id for re-use');
  }
  // First global colour is the primary; check its core fields (label is also
  // carried but is implementation-detail extra, so we don't deepEqual it).
  const primary = profile.colors.find(c => c.role === 'primary');
  assert.equal(primary.hex, '#2176ff');
  assert.equal(primary.id, 'gcid-primary-color');
  assert.equal(primary.label, 'Primary Color');
});

test('falls back gracefully when there are no global colours', () => {
  const doc = fixture();
  doc.global_colors = [];
  const profile = extractBrandProfileFromExport(doc);
  assert.deepEqual(profile.colors, []);
});

test('extracts heading + body fonts from preset attrs when present', () => {
  const profile = extractBrandProfileFromExport(fixture());
  assert.equal(profile.fonts.heading.family, 'Playfair Display');
  assert.equal(profile.fonts.heading.source, 'export');
  assert.equal(profile.fonts.body.family, 'Inter');
});

test('omits fonts when presets carry none', () => {
  const doc = fixture();
  doc.presets = { module: {}, group: {} };
  const profile = extractBrandProfileFromExport(doc);
  assert.deepEqual(profile.fonts, {});
});
