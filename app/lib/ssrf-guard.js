'use strict';

// SSRF guard for URL-based brand extraction. Blocks loopback, private,
// link-local, and other non-publicly-routable destinations before we ever
// call fetch(). Pure module: no I/O of its own except DNS resolution.

const dns = require('node:dns').promises;
const net = require('node:net');

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost', '.invalid', '.example', '.test'];

// Networks that must never be fetched: loopback, private, link-local,
// carrier-grade NAT, the 0.0.0.0/8 "this host" block, and benchmarking ranges.
const BLOCKED_CIDRS = [
  '0.0.0.0/8',
  '10.0.0.0/8',
  '100.64.0.0/10',
  '127.0.0.0/8',
  '169.254.0.0/16',
  '172.16.0.0/12',
  '192.0.2.0/24',
  '192.168.0.0/16',
  '198.18.0.0/15',
  '198.51.100.0/24',
  '203.0.113.0/24',
  '224.0.0.0/4',  // multicast
  '240.0.0.0/4',  // reserved
];

function ipInRange(ip, cidr) {
  const [base, bits] = cidr.split('/');
  const b = base.split('.').map(Number);
  const n = Number(bits);
  const mask = n === 0 ? 0 : (~0 << (32 - n)) >>> 0;
  const ipInt = ip.split('.').reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
  const baseInt = b.reduce((acc, o) => ((acc << 8) + Number(o)) >>> 0, 0);
  return (ipInt & mask) === (baseInt & mask);
}

function blockedV4(ip) {
  return BLOCKED_CIDRS.some(c => ipInRange(ip, c));
}

function blockedV6(ip) {
  // Loopback, link-local, IPv4-mapped loopback (e.g. ::ffff:127.0.0.1), unique-local.
  if (ip === '::1') return true;
  if (ip.startsWith('fe80')) return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped && blockedV4(mapped[1])) return true;
  return false;
}

/**
 * Resolve hostname and return true only if EVERY resolved address is on a
 * public network. A non-resolving name is treated as unsafe.
 */
async function isSafeHost(hostname) {
  const h = String(hostname || '').toLowerCase().trim();
  if (!h) return false;
  if (BLOCKED_SUFFIXES.some(s => h.endsWith(s))) return false;
  if (net.isIPv4(h)) return !blockedV4(h);
  if (net.isIPv6(h)) return !blockedV6(h);

  let addrs;
  try {
    addrs = await dns.lookup(h, { all: true });
  } catch {
    return false;
  }
  if (addrs.length === 0) return false;
  return addrs.every(a =>
    net.isIPv4(a.address) ? !blockedV4(a.address) : !blockedV6(a.address)
  );
}

module.exports = { isSafeHost, ipInRange, blockedV4, blockedV6 };
