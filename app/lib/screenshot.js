'use strict';

// Full-page live screenshot of a Divi page, for the QA loop:
//   generate → import → /screenshot → compare against the Stage 2 HTML mockup.
//
// Uses playwright-core driving the SYSTEM Chrome (no browser download, no heavy
// playwright dep). Falls back to a bundled chromium if present. Screenshots are
// cached by URL+width hash so re-imports of the same slug are instant.
//
// Pure-ish module: screenshot() does I/O (launches a browser). The pure helpers
// (cacheKey, resolveExecutable) are unit-tested directly.

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

// Where to persist screenshots. Survives app restarts (NOT in /tmp — see the
// volatile-dir note in server.js). One dir, hashed filenames, no sub-tree.
const SHOTS_DIR = process.env.DIVI5_SHOTS_DIR ||
  path.join(os.homedir(), 'Library', 'Application Support', 'Divi5Generator', 'screenshots');

// Candidate Chrome executables, best first. macOS first (this app's audience),
// then Linux. playwright-core's bundled chromium is the last-resort fallback.
const CANDIDATES = [
  // macOS system Chrome
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  // macOS Chromium
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  // Common Linux locations
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

// Resolve a Chrome executable to drive. Returns the first existing candidate,
// or null to let playwright-core use its bundled browser. Exported for testing.
function resolveExecutable() {
  for (const c of CANDIDATES) {
    try {
      if (fs.existsSync(c)) return c;
    } catch { /* ignore stat errors */ }
  }
  return null;
}

// Stable filename for a (url, viewportWidth) pair so repeated imports of the
// same slug reuse the cached PNG instead of re-rendering. Exported for testing.
function cacheKey(url, viewportWidth) {
  const h = crypto.createHash('sha1').update(`${url}|${viewportWidth}`).digest('hex').slice(0, 16);
  return `shot-${h}.png`;
}

function shotPath(url, viewportWidth) {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  return path.join(SHOTS_DIR, cacheKey(url, viewportWidth));
}

/**
 * Capture a full-page PNG of a live URL.
 *
 * @param {object} opts
 * @param {string} opts.url           Fully-qualified URL to shoot (validated by caller).
 * @param {number} [opts.width=1280]  Viewport width.
 * @param {number} [opts.timeoutMs=30000] Navigation timeout.
 * @param {boolean} [opts.fresh=false] Bypass the cache and re-render.
 * @returns {Promise<{path:string, width:number, height:number, cached:boolean, fromCache:boolean}>}
 */
async function screenshot({ url, width = 1280, timeoutMs = 30000, fresh = false } = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('url is required');
  }

  const outPath = shotPath(url, width);

  // Cache hit: return the existing PNG unless the caller wants a fresh render.
  if (!fresh && fs.existsSync(outPath)) {
    const { width: w, height: h } = readPngDims(outPath);
    return { path: outPath, width: w, height: h, cached: true, fromCache: true };
  }

  // Require playwright-core lazily so the app still boots if it isn't installed
  // (the endpoints that don't shoot don't pay the import cost).
  let chromium;
  try {
    ({ chromium } = require('playwright-core'));
  } catch {
    throw new Error('playwright-core is not installed. Run `npm install playwright-core` in app/.');
  }

  const executablePath = resolveExecutable();
  const launchOpts = { headless: true };
  if (executablePath) launchOpts.executablePath = executablePath;

  const browser = await chromium.launch(launchOpts);
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });
    // Let web-fonts + Divi's deferred CSS settle before we capture.
    await page.waitForTimeout(800);
    const buf = await page.screenshot({ fullPage: true, type: 'png' });
    fs.writeFileSync(outPath, buf);
    const { width: w, height: h } = readPngDimsFromBuffer(buf);
    return { path: outPath, width: w, height: h, cached: false, fromCache: false };
  } finally {
    await browser.close().catch(() => {});
  }
}

// ─── PNG dimension readers (no deps) ─────────────────────────────────────────
// PNG header: 8-byte sig, then IHDR: 4-byte length, "IHDR", 4-byte width, 4-byte height.
function readPngDimsFromBuffer(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 24) return { width: 0, height: 0 };
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function readPngDims(file) {
  try {
    const buf = fs.readFileSync(file);
    return readPngDimsFromBuffer(buf);
  } catch {
    return { width: 0, height: 0 };
  }
}

module.exports = {
  screenshot,
  resolveExecutable,
  cacheKey,
  SHOTS_DIR,
};
