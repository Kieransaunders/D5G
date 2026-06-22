#!/usr/bin/env node
/**
 * generate-rub-you-well-presets.js
 * Step 1 of preset-first workflow for Rub You Well.
 *
 * Imports brand-specific presets (custom colors, pill buttons, typography)
 * that aren't in the ET standard library, then writes the merged registry
 * to rub-you-well-registry.json for use by the page generator.
 *
 * Run once per site, or re-run when the brand design changes.
 * Usage: DTI_KEY=dtik_xxx node generate-rub-you-well-presets.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const http = require('http');

const BASE_URL = process.env.DTI_URL || 'http://localhost:10015';
const KEY      = process.env.DTI_KEY;
if (!KEY) { console.error('DTI_KEY env var required'); process.exit(1); }

const SKILL_DIR   = path.join(__dirname, 'scripts');
const D           = require(path.join(SKILL_DIR, 'divi-builder.js'));
const TOKENS      = require('./references/Divi design system JSON/divi-design-system.tokens.js');
const ET_REGISTRY = './references/et-preset-registry.json';
const REGISTRY_OUT = './rub-you-well-registry.json';

function api(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const url = new URL(endpoint, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || 80,
      path: url.pathname + url.search,
      headers: {
        'X-Divi-Tools-Key': KEY,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve(data); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

(async () => {
  // ── 1. Design tokens ────────────────────────────────────────────────────────
  const T = {
    cream:  '#fdf7f2',
    cream2: '#f9f0e8',
    accent: '#c9715a',
    ink:    '#2a2420',
    muted:  '#7d6e67',
    white:  '#ffffff',
    serif:  'DM Serif Display',
    sans:   'DM Sans',
  };

  // ── 2. Build brand preset pack ───────────────────────────────────────────────
  const b = D.createBuilder({ tokens: TOKENS });

  // Custom global colours (registered alongside presets)
  const WHITE = b.globalColor('ryw-white',  T.white,  'RYW White');
  const MUTED = b.globalColor('ryw-muted',  T.muted,  'RYW Muted');
  const ACCENT = b.globalColor('ryw-accent', T.accent, 'RYW Terracotta');
  const INK    = b.globalColor('ryw-ink',    T.ink,    'RYW Ink');

  // ── Sections (backgrounds must be raw hex — variable refs don't generate CSS)
  b.preset('divi/section', 'RYW Section – Cream', {
    module: { decoration: {
      background: D.dv({ color: T.cream }),
      spacing: D.dv({ padding: { top: '90px', bottom: '90px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });
  b.preset('divi/section', 'RYW Section – Cream 2', {
    module: { decoration: {
      background: D.dv({ color: T.cream2 }),
      spacing: D.dv({ padding: { top: '90px', bottom: '90px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });
  b.preset('divi/section', 'RYW Section – Accent', {
    module: { decoration: {
      background: D.dv({ color: T.accent }),
      spacing: D.dv({ padding: { top: '14px', bottom: '14px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });
  b.preset('divi/section', 'RYW Section – Ink', {
    module: { decoration: {
      background: D.dv({ color: T.ink }),
      spacing: D.dv({ padding: { top: '90px', bottom: '90px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });

  // ── Buttons (backgrounds raw hex; font colors use variable refs — works at render time)
  b.preset('divi/button', 'RYW Button – Primary', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.sans, size: '16px', color: WHITE, weight: '600' }) },
      background: D.dv({ color: T.accent }),
      border:     D.dv({ radius: { topLeft: '999px', topRight: '999px', bottomLeft: '999px', bottomRight: '999px', sync: 'on' } }),
      spacing:    D.dv({ padding: { top: '16px', bottom: '16px', left: '36px', right: '36px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });
  b.preset('divi/button', 'RYW Button – Ghost', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.sans, size: '16px', color: INK, weight: '600' }) },
      background: D.dv({ color: 'rgba(0,0,0,0)' }),
      border:     D.dv({
        styles: { all: { width: '1.5px', color: T.ink, style: 'solid' } },
        radius: { topLeft: '999px', topRight: '999px', bottomLeft: '999px', bottomRight: '999px', sync: 'on' },
      }),
      spacing:    D.dv({ padding: { top: '16px', bottom: '16px', left: '36px', right: '36px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });
  b.preset('divi/button', 'RYW Button – White', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.sans, size: '16px', color: INK, weight: '600' }) },
      background: D.dv({ color: T.white }),
      border:     D.dv({ radius: { topLeft: '999px', topRight: '999px', bottomLeft: '999px', bottomRight: '999px', sync: 'on' } }),
      spacing:    D.dv({ padding: { top: '16px', bottom: '16px', left: '36px', right: '36px', syncVertical: 'on', syncHorizontal: 'off' } }),
    } },
  });

  // ── Typography (font colors use variable refs — fine for text/heading presets)
  b.preset('divi/heading', 'RYW Hero H1', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h1', family: T.serif, size: '62px', weight: '400', lineHeight: '1.08em', color: INK, letterSpacing: '-0.02em', textAlign: 'left' },
      { phone: { size: '38px' } }
    ) } } },
  });
  b.preset('divi/heading', 'RYW Section H2', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h2', family: T.serif, size: '40px', weight: '400', lineHeight: '1.1em', color: INK, letterSpacing: '-0.02em', textAlign: 'left' },
      { phone: { size: '28px' } }
    ) } } },
  });
  b.preset('divi/heading', 'RYW CTA H2', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h2', family: T.serif, size: '44px', weight: '400', lineHeight: '1.1em', color: WHITE, letterSpacing: '-0.02em', textAlign: 'center' },
      { phone: { size: '30px' } }
    ) } } },
  });
  b.preset('divi/heading', 'RYW Card H3', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h3', family: T.serif, size: '24px', weight: '400', lineHeight: '1.2em', color: INK, textAlign: 'left' }
    ) } } },
  });
  b.preset('divi/text', 'RYW Eyebrow', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '11px', weight: '600', color: ACCENT,
      textAlign: 'left', letterSpacing: '3px',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Body', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '17px', lineHeight: '1.7em', color: MUTED, textAlign: 'left',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Body Center', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '17px', lineHeight: '1.7em', color: MUTED, textAlign: 'center',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Body On Dark', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '17px', lineHeight: '1.7em', color: 'rgba(255,255,255,0.6)', textAlign: 'center',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Card Text', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '15px', lineHeight: '1.65em', color: MUTED, textAlign: 'left',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Card Price', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '13px', lineHeight: '1.4em', weight: '600', color: ACCENT, textAlign: 'left',
    }) } } } },
  });
  b.preset('divi/text', 'RYW Footer Text', {
    content: { decoration: { bodyFont: { body: { font: D.dv({
      family: T.sans, size: '13px', lineHeight: '1.5em', color: MUTED, textAlign: 'center',
    }) } } } },
  });

  // ── 3. Import preset pack ────────────────────────────────────────────────────
  const assembled = b.assemble({ context: 'et_builder', content: '', title: '', slug: '' });

  console.log('Importing Rub You Well brand presets...');
  const importResult = await api('POST', '/wp-json/divi-tools/v1/presets/import', {
    presets: assembled.presets,
  });
  if (importResult.code) { console.error('Import failed:', importResult); process.exit(1); }
  console.log(`  ✓ Imported ${importResult.imported_count} presets`);

  // Also import custom global colours via a minimal page import to register them
  // (preset import doesn't handle global_colors — use the page import endpoint with no content)
  const colorsPayload = {
    layout: {
      context: 'et_builder',
      data: { 1: '<!-- wp:divi/placeholder -->\n<!-- /wp:divi/placeholder -->' },
      canvases: {},
      presets: { module: {}, group: {} },
      global_colors: assembled.global_colors,
      global_variables: [],
      images: {},
      thumbnails: [],
    },
    seo: { slug: '_ryw-color-setup' },
    publish: false,
  };
  const colorsResult = await api('POST', '/wp-json/divi-tools/v1/import', colorsPayload);
  console.log(`  ✓ Registered ${assembled.global_colors.length} custom global colours`);

  // ── 4. Fetch full registry and write ────────────────────────────────────────
  const listResult = await api('GET', '/wp-json/divi-tools/v1/presets');
  const registry   = listResult.presets || {};

  // Merge with ET registry if it exists
  let merged = {};
  if (fs.existsSync(ET_REGISTRY)) {
    merged = JSON.parse(fs.readFileSync(ET_REGISTRY, 'utf8'));
  }
  for (const [mod, names] of Object.entries(registry)) {
    merged[mod] = Object.assign({}, merged[mod] || {}, names);
  }

  fs.writeFileSync(REGISTRY_OUT, JSON.stringify(merged, null, 2));
  console.log(`  ✓ Registry written to ${REGISTRY_OUT}`);

  // Print the brand preset IDs for confirmation
  console.log('\nRYW brand preset IDs:');
  const RYW_NAMES = [
    ['divi/section', 'RYW Section – Cream'],
    ['divi/section', 'RYW Section – Accent'],
    ['divi/section', 'RYW Section – Ink'],
    ['divi/button',  'RYW Button – Primary'],
    ['divi/button',  'RYW Button – Ghost'],
    ['divi/heading', 'RYW Hero H1'],
    ['divi/text',    'RYW Body'],
    ['divi/text',    'RYW Eyebrow'],
  ];
  for (const [mod, name] of RYW_NAMES) {
    const id = merged[mod]?.[name] || '(not found)';
    console.log(`  ${name.padEnd(28)} → ${id}`);
  }
  console.log('\n✓ Done — now run: node generate-rub-you-well.js\n');
})();
