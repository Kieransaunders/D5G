'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafeHost, ipInRange } = require('../lib/ssrf-guard');

test('ipInRange matches an address inside the CIDR', () => {
  assert.equal(ipInRange('127.0.0.1', '127.0.0.0/8'), true);
  assert.equal(ipInRange('127.255.255.255', '127.0.0.0/8'), true);
  assert.equal(ipInRange('10.1.2.3', '10.0.0.0/8'), true);
  assert.equal(ipInRange('8.8.8.8', '10.0.0.0/8'), false);
});

test('blocks loopback IPv4', async () => {
  assert.equal(await isSafeHost('127.0.0.1'), false);
  assert.equal(await isSafeHost('127.255.255.255'), false);
});

test('blocks private ranges', async () => {
  assert.equal(await isSafeHost('10.0.0.1'), false);
  assert.equal(await isSafeHost('192.168.1.1'), false);
  assert.equal(await isSafeHost('172.16.0.1'), false);
  assert.equal(await isSafeHost('172.31.255.255'), false);
  // 172.32.x is OUTSIDE the private /12 and should be allowed (by IP rules)
  assert.equal(await isSafeHost('172.32.0.1'), true);
});

test('blocks link-local', async () => {
  assert.equal(await isSafeHost('169.254.1.1'), false);
});

test('blocks .local mDNS and friends', async () => {
  assert.equal(await isSafeHost('something.local'), false);
  assert.equal(await isSafeHost('svc.internal'), false);
  assert.equal(await isSafeHost('app.localhost'), false);
});

test('rejects non-resolving hostnames', async () => {
  assert.equal(await isSafeHost('this-host-definitely-does-not-exist.invalid'), false);
});

test('allows a known public host', async () => {
  // example.com is a stable, publicly resolvable IANA reserved domain.
  assert.equal(await isSafeHost('example.com'), true);
});
