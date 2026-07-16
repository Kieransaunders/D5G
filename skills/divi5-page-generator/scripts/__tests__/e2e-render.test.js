#!/usr/bin/env node
/**
 * e2e-render.test.js — live render smoke-test via the /preview endpoint + Playwright.
 *
 * Run:    node scripts/__tests__/e2e-render.test.js
 * Exit:   0 = all pass · 1 = fail · 2 = skipped (no site configured / not reachable)
 *
 * Credentials (first match wins):
 *   1. DIVI_SITE_URL + DIVI_API_KEY env vars
 *   2. ~/Library/Application Support/Divi5Generator/history.db settings table
 *
 * Golden screenshot: scripts/__tests__/golden/homepage.png
 *   - Created automatically on first run.
 *   - On subsequent runs: pixel diff. Fail if changed pixels > DIFF_THRESHOLD.
 *   - Delete the golden file to reset the baseline.
 *
 * Covers:
 *   E1  /preview returns a valid URL with no errors
 *   E2  Playwright: page loads without console errors
 *   E3  Playwright: hero h1 is visible
 *   E4  Playwright: no default-blue buttons (Divi fallback = rgb(46,86,153))
 *   E5  Screenshot diff vs golden (pixel threshold)
 *   E6  Pro-gating gate (negative): a page imported WITHOUT its brand bundle
 *       renders the button NOT in the brand colour — the compile step has no preset
 *       to resolve (logs whether it fell back to Divi default blue). Honest
 *       limitation: this exercises the connector's own compile
 *       being a no-op against an empty brand, not a true connector bypass the way
 *       a raw VB-Portability paste would be. Same broken outcome, Pro path with an
 *       empty brand rather than skipped.
 *   E7  Pro-gating gate (positive): the SAME page imported WITH the brand bundle
 *       (one-shot `brand` payload) compiles to the brand button colour.
 *   E6/E7 use nonce-suffixed preset ids per run so the persistent registration in
 *   E7 can't make a later E6 run resolve (there is no unregister API).
 */

'use strict';

const fs      = require('fs');
const path    = require('path');
const os      = require('os');
const https   = require('https');
const http    = require('http');

const GOLDEN_DIR  = path.join(__dirname, 'golden');
const GOLDEN_FILE = path.join(GOLDEN_DIR, 'homepage.png');
const SOURCE      = path.join(__dirname, '..', '..', 'examples', 'iConnectITHomepage.json');
// Maximum changed pixels before E5 fails (1% of a 1280×800 viewport = ~10240 px)
const DIFF_THRESHOLD = 10000;

let pass = 0, fail = 0, skip = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; process.stdout.write(`  PASS  ${name}\n`); }
  else       { fail++; failures.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); process.stdout.write(`  FAIL  ${name}${detail ? ' — ' + detail : ''}\n`); }
}

// ─── Credentials ─────────────────────────────────────────────────────────────

function loadCreds() {
  if (process.env.DIVI_SITE_URL && process.env.DIVI_API_KEY) {
    return {
      siteUrl: process.env.DIVI_SITE_URL.replace(/\/$/, ''),
      apiKey:  process.env.DIVI_API_KEY,
      wpUser:  process.env.WP_USER || null,
      wpPass:  process.env.WP_PASS || null,
    };
  }
  const dbPath = path.join(os.homedir(), 'Library', 'Application Support', 'Divi5Generator', 'history.db');
  if (!fs.existsSync(dbPath)) return null;
  try {
    const Database = require(path.join(__dirname, '..', '..', '..', '..', 'app', 'node_modules', 'better-sqlite3'));
    const db = new Database(dbPath, { readonly: true });
    const rows = db.prepare('SELECT key, value FROM settings').all();
    db.close();
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
    if (s.siteUrl && s.apiKey) return {
      siteUrl: s.siteUrl.replace(/\/$/, ''),
      apiKey:  s.apiKey,
      wpUser:  s.wpUser || null,
      wpPass:  s.wpPass || null,
    };
  } catch (_) {}
  return null;
}

const creds = loadCreds();
if (!creds) {
  console.log('SKIP: no credentials found (set DIVI_SITE_URL + DIVI_API_KEY or configure the app)');
  process.exit(2);
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function post(url, apiKey, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const data   = JSON.stringify(body);
    const req = lib.request({
      hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), 'X-D5G-Key': apiKey },
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── Gate fixture: an unresolved page + its out-of-band brand bundle ──────────
//
// The Pro-gating gate: a page whose button colour lives ONLY in a preset that
// travels out-of-band. Import the raw (brand-absent) page and the connector's
// compile step has nothing to resolve → the button falls back to Divi default
// blue rgb(46,86,153). Import the SAME page WITH the brand bundle and the
// connector registers the preset, inlines its attrs, and the button renders the
// brand colour. This proves the gate discriminates on brand presence, not on
// which endpoint is hit (/import and /preview share the compile path).
//
// Run-independence: preset ids are nonce-suffixed per run so the "brand present"
// case (which registers presets PERSISTENTLY, with no unregister API) can never
// leave state that makes a later "brand absent" run resolve → the negative case
// would then wrongly render correct. Fresh ids each run = each case is honest.

const BRAND_BUTTON_HEX = '#c8102e';               // distinctive brand red
const BRAND_BUTTON_RGB = 'rgb(200, 16, 46)';      // its computed form
const DEFAULT_BLUE     = ['rgb(46, 86, 153)', 'rgb(38, 74, 135)']; // Divi button fallback

function buildGateFixture() {
  // de-inline.js lives one dir up (scripts/), shared with divi-builder.js so the
  // emitted unresolved shape here can't drift from production. Required lazily so
  // the module load (and thus the clean skip-when-no-site path) never depends on it.
  const { deInlineContent } = require('../de-inline');
  const nonce = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const btnPresetId = 'gatebtn' + nonce;
  const slug = 'd5g-gate-' + nonce;

  // The button's brand colour lives ONLY in the preset attrs (button custom
  // styles enabled + background colour). The block carries pointer + structural
  // content only. This mirrors button() in divi-builder.js.
  const btnPresetAttrs = {
    button: {
      decoration: {
        button: { desktop: { value: { enable: 'on' } } },
        background: { desktop: { value: { color: BRAND_BUTTON_HEX } } },
      },
    },
  };
  // Inlined block (preset attrs merged in) — de-inlining strips them back out,
  // exactly as the builder emits for a page.
  const inlinedBtn = {
    button: {
      innerContent: { desktop: { value: { text: 'Get Started', linkUrl: '#' } } },
      decoration: {
        button: { desktop: { value: { enable: 'on' } } },
        background: { desktop: { value: { color: BRAND_BUTTON_HEX } } },
      },
    },
    meta: { adminLabel: { desktop: { value: 'CTA' } } },
    modulePreset: [btnPresetId],
    builderVersion: '5.0.0',
  };
  const headingAttrs = {
    title: {
      innerContent: { desktop: { value: 'Gate Test Page' } },
      decoration: { font: { font: { desktop: { value: { headingLevel: 'h1' } } } } },
    },
    builderVersion: '5.0.0',
  };
  const b = (name, attrs) => `<!-- wp:divi/${name} ${JSON.stringify(attrs)} -->`;
  const CRLF = '\r\n';
  const inlinedContent = [
    '<!-- wp:divi/placeholder -->',
    '<!-- wp:divi/section -->',
    b('heading', headingAttrs),
    b('button', inlinedBtn),
    '<!-- /wp:divi/section -->',
    '<!-- /wp:divi/placeholder -->',
  ].join(CRLF);

  const presets = {
    module: {
      'divi/button': {
        default: btnPresetId,
        items: { [btnPresetId]: {
          id: btnPresetId, name: 'Gate CTA', moduleName: 'divi/button',
          version: '5.0.0', type: 'module', attrs: btnPresetAttrs,
        } },
      },
    },
  };
  // De-inline so the button block carries the pointer but NOT the brand colour.
  const content = deInlineContent(inlinedContent, presets);

  const layout = { context: 'et_builder', data: { 1: content }, canvases: {}, images: {}, thumbnails: [] };
  const brand  = { presets, global_colors: [], global_variables: [] };
  return { slug, layout, brand };
}

// ─── Main (async) ─────────────────────────────────────────────────────────────

(async () => {
  // ── E1: /preview endpoint ────────────────────────────────────────────────────

  const layout = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
  let previewUrl;
  try {
    const res = await post(
      `${creds.siteUrl}/wp-json/divi5-generator/v1/preview`,
      creds.apiKey,
      { layout }
    );
    ok('E1: /preview returns 200', res.status === 200, `HTTP ${res.status}: ${res.body.slice(0, 120)}`);
    if (res.status === 200) {
      const json = JSON.parse(res.body);
      ok('E1: response has preview_url', typeof json.preview_url === 'string' && json.preview_url.startsWith('http'),
        'got: ' + json.preview_url);
      ok('E1: no errors in response', !json.error && !json.code, json.code || json.error || '');
      previewUrl = json.preview_url;
    }
  } catch (e) {
    ok('E1: /preview reachable', false, e.message);
    console.log('\nSKIP: site not reachable — is Local running?');
    process.exit(2);
  }

  if (!previewUrl) {
    console.log('\nSKIP: no preview URL returned — cannot run E2–E5');
    report();
    return;
  }

  // ── E2–E5: Playwright ────────────────────────────────────────────────────────

  let chromium, browser, page;
  try {
    ({ chromium } = require('playwright'));
  } catch (_) {
    console.log('\nINFO: playwright not installed — skipping E2–E5');
    console.log('      Run: npx playwright install chromium');
    report();
    return;
  }

  try {
    browser = await chromium.launch();
    page    = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });

    // Log in to WordPress if credentials available (preview URLs require auth)
    if (creds.wpUser && creds.wpPass) {
      await page.goto(`${creds.siteUrl}/wp-login.php`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.fill('#user_login', creds.wpUser);
      await page.fill('#user_pass',  creds.wpPass);
      await page.click('#wp-submit');
      await page.waitForLoadState('networkidle');
    }

    // Only capture JS runtime errors — not 404s for missing images/fonts on local
    const jsErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Skip resource 404s (expected on local where external images may be missing)
        if (!text.includes('404') && !text.includes('Failed to load resource')) {
          jsErrors.push(text);
        }
      }
    });
    page.on('pageerror', err => jsErrors.push(err.message));

    await page.goto(previewUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // E2: no JS runtime errors
    ok('E2: no JS runtime errors on page load', jsErrors.length === 0,
      jsErrors.slice(0, 3).join(' | '));

    // E3: hero h1 visible
    const h1 = await page.$('h1');
    ok('E3: h1 is visible on the page', !!h1, 'no <h1> found');

    // E4: no default-blue buttons (Divi fallback colour rgb(46,86,153) = #2E5699)
    const blueButtons = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.et_pb_button, a.et_pb_button, [class*="divi-button"]'));
      return btns.filter(b => {
        const bg = window.getComputedStyle(b).backgroundColor;
        return bg === 'rgb(46, 86, 153)' || bg === 'rgb(38, 74, 135)';
      }).map(b => b.textContent.trim().slice(0, 40));
    });
    ok('E4: no default-blue (unfilled preset) buttons', blueButtons.length === 0,
      blueButtons.length ? `${blueButtons.length} blue button(s): ${blueButtons.join(', ')}` : '');

    // E5: screenshot diff vs golden
    fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    const screenshotBuf = await page.screenshot({ fullPage: true });

    if (!fs.existsSync(GOLDEN_FILE)) {
      fs.writeFileSync(GOLDEN_FILE, screenshotBuf);
      console.log(`  INFO  E5: golden screenshot saved → ${path.relative(process.cwd(), GOLDEN_FILE)}`);
      console.log('        Re-run to diff against it.');
      pass++;
    } else {
      const failPath = GOLDEN_FILE.replace('.png', '-actual.png');
      fs.writeFileSync(failPath, screenshotBuf);

      // Pixel diff with pixelmatch + pngjs
      try {
        const { PNG }      = require('pngjs');
        const pixelmatch   = require('pixelmatch').default ?? require('pixelmatch');

        const goldenPng  = PNG.sync.read(fs.readFileSync(GOLDEN_FILE));
        const actualPng  = PNG.sync.read(screenshotBuf);

        if (goldenPng.width !== actualPng.width || goldenPng.height !== actualPng.height) {
          // Different dimensions = definite layout change
          ok('E5: screenshot matches golden', false,
            `dimensions changed: golden ${goldenPng.width}×${goldenPng.height} vs actual ${actualPng.width}×${actualPng.height}`);
        } else {
          const diff    = new PNG({ width: goldenPng.width, height: goldenPng.height });
          const changed = pixelmatch(goldenPng.data, actualPng.data, diff.data,
            goldenPng.width, goldenPng.height, { threshold: 0.1 });
          const diffPath = GOLDEN_FILE.replace('.png', '-diff.png');
          fs.writeFileSync(diffPath, PNG.sync.write(diff));

          ok('E5: changed pixels within threshold',
            changed <= DIFF_THRESHOLD,
            `${changed} px changed (threshold ${DIFF_THRESHOLD}) — diff at ${path.relative(process.cwd(), diffPath)}`);
          if (changed > 0 && changed <= DIFF_THRESHOLD) {
            console.log(`  INFO  E5: ${changed} pixels changed — within threshold`);
          }
        }
        // Clean up actual if it passed
        if (!failures.some(f => f.includes('E5'))) fs.rmSync(failPath, { force: true });
      } catch (e) {
        ok('E5: pixelmatch diff ran', false, e.message);
      }
    }

    // ── E6/E7: Pro-gating gate — brand-absent renders broken, brand-present correct ──
    // Same page object both ways (one built per run with nonce'd preset ids).
    await runGateChecks(page);

  } catch (e) {
    ok('Playwright run completed without crash', false, e.message);
  } finally {
    if (browser) await browser.close();
  }

  report();
})();

// Import a page via the Pro /import endpoint, publishing it, and return its live
// front-end URL (siteUrl/<slug>/). `layout` may carry a top-level `brand` bundle.
async function importPage(layout, slug) {
  const res = await post(
    `${creds.siteUrl}/wp-json/divi5-generator/v1/import`,
    creds.apiKey,
    { layout, seo: { slug, titleTag: 'Gate Test Page' }, publish: true }
  );
  if (res.status !== 200) {
    throw new Error(`/import HTTP ${res.status}: ${res.body.slice(0, 160)}`);
  }
  const json = JSON.parse(res.body);
  const outSlug = json.slug || slug;
  return new URL(`${outSlug}/`, creds.siteUrl + '/').href;
}

// Read the computed background colour of the first CTA button on the current page.
async function buttonBg(page) {
  return page.evaluate(() => {
    const btn = document.querySelector('.et_pb_button, a.et_pb_button, [class*="divi-button"]');
    return btn ? window.getComputedStyle(btn).backgroundColor : null;
  });
}

// E6 (negative) + E7 (positive): the Pro-gating gate on a live site.
async function runGateChecks(page) {
  let fixture;
  try {
    fixture = buildGateFixture();
  } catch (e) {
    ok('E6/E7: gate fixture built', false, e.message);
    return;
  }

  // ── E6: brand ABSENT → button is NOT the brand colour (broken) ──
  // Assert the robust gate semantic — "not brand-coloured" — rather than an exact
  // fallback value. After de-inlining, the raw button also loses its
  // custom-styles-enabled flag, so its unresolved colour may be Divi default blue
  // OR transparent OR a theme colour; the load-bearing fact is only that it is not
  // the brand red. The default-blue observation is logged for the report, not asserted.
  try {
    const rawLayout = { ...fixture.layout }; // no `brand` key → nothing to resolve
    const url = await importPage(rawLayout, fixture.slug);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const bg = await buttonBg(page);
    ok('E6: raw (brand-absent) button is NOT the brand colour',
      bg !== BRAND_BUTTON_RGB,
      `button resolved to the brand colour ${BRAND_BUTTON_RGB} without a brand bundle`);
    if (bg != null && DEFAULT_BLUE.includes(bg)) {
      console.log(`  INFO  E6: raw button fell back to Divi default blue (${bg})`);
    } else {
      console.log(`  INFO  E6: raw button colour = ${bg} (unresolved, not brand red)`);
    }
  } catch (e) {
    ok('E6: raw import + render', false, e.message);
  }

  // ── E7: brand PRESENT → same page compiles to the brand button colour ──
  try {
    const brandLayout = { ...fixture.layout, brand: fixture.brand };
    const url = await importPage(brandLayout, fixture.slug);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    const bg = await buttonBg(page);
    ok('E7: Pro-compiled (brand-present) button is the brand colour',
      bg === BRAND_BUTTON_RGB,
      `expected ${BRAND_BUTTON_RGB}, got ${bg}`);
    ok('E7: Pro-compiled button is NOT default blue',
      bg != null && !DEFAULT_BLUE.includes(bg),
      `button still default blue: ${bg}`);
  } catch (e) {
    ok('E7: brand import + render', false, e.message);
  }
}

function report() {
  console.log(`\n── E2E render test results ──`);
  console.log(`  ${pass} passed, ${fail} failed${skip ? ', ' + skip + ' skipped' : ''}`);
  if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
}
