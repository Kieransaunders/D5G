'use strict';

// Contract tests for the QA-loop features:
//
// 1. lib/screenshot.js — pure helpers (cacheKey stability, executable
//    resolution) that the /screenshot endpoint depends on.
// 2. Version-sync invariant — the EXPECTED_D5G_VERSION the app hardcodes must
//    match the D5G_VERSION the plugin ships. We lived through a silent drift
//    here (plugin 1.5.3 vs code expecting 1.5.4's publish-default); this test
//    fails the moment they diverge again.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { cacheKey, resolveExecutable } = require('../lib/screenshot');

const PLUGIN_PHP = path.join(
  __dirname, '..', '..', 'plugin', 'divi5-generator', 'divi5-generator.php'
);
const SERVER_JS = path.join(__dirname, '..', 'server.js');

// ─── screenshot lib ──────────────────────────────────────────────────────────

test('cacheKey is deterministic for the same url+width', () => {
  assert.equal(cacheKey('http://localhost:10024/foo/', 1280), cacheKey('http://localhost:10024/foo/', 1280));
});

test('cacheKey differs across urls or widths', () => {
  assert.notEqual(cacheKey('http://a/', 1280), cacheKey('http://b/', 1280));
  assert.notEqual(cacheKey('http://a/', 1280), cacheKey('http://a/', 390));
});

test('cacheKey is filename-safe (no slashes/spaces)', () => {
  const k = cacheKey('http://localhost:10024/has space/and/slashes', 1280);
  assert.match(k, /^shot-[0-9a-f]+\.png$/);
});

test('resolveExecutable returns a string when Chrome exists, or null', () => {
  // On this dev machine Chrome is present; on a clean CI box it returns null.
  // Either is valid — we only assert the contract (string|null, not throwing).
  const exe = resolveExecutable();
  assert.ok(exe === null || typeof exe === 'string');
});

// ─── version-sync invariant ──────────────────────────────────────────────────

function pluginVersion() {
  const php = fs.readFileSync(PLUGIN_PHP, 'utf8');
  const m = php.match(/define\(\s*'D5G_VERSION'\s*,\s*'([^']+)'\s*\)/);
  assert.ok(m, 'D5G_VERSION define not found in plugin PHP');
  return m[1];
}

function appExpectedVersion() {
  const js = fs.readFileSync(SERVER_JS, 'utf8');
  const m = js.match(/EXPECTED_D5G_VERSION\s*=\s*'([^']+)'/);
  assert.ok(m, 'EXPECTED_D5G_VERSION not found in server.js');
  return m[1];
}

test('app EXPECTED_D5G_VERSION matches the plugin D5G_VERSION', () => {
  const appV = appExpectedVersion();
  const pluginV = pluginVersion();
  assert.equal(appV, pluginV,
    `Version drift: app expects D5G ${appV} but the plugin ships ${pluginV}. ` +
    `Update EXPECTED_D5G_VERSION in app/server.js to match.`);
});
