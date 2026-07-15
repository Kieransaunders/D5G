#!/usr/bin/env node
/**
 * preset-catalogue.js — derive a compact, contrast-aware preset index from the
 * on-disk preset registry (references/et-preset-registry.json).
 *
 *   buildCatalogue(registry) -> [{ name, module, surface, color, size, align, role }]
 * CLI:  node scripts/preset-catalogue.js   (reads the registry, writes the catalogue)
 *
 * `surface` is the background a preset is BUILT FOR: a light background or dark
 * text means 'light'; a dark background or light text means 'dark'. This is the
 * field that stops a light-text preset landing on a light section.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REF = path.join(__dirname, '..', 'references');
const REGISTRY = path.join(REF, 'et-preset-registry.json');
const CATALOGUE = path.join(REF, 'preset-catalogue.json');

function relLum(hex) {
  const s = hex.replace('#', '');
  const n = s.length === 3 ? s.split('').map(c => c + c).join('') : s.slice(0, 6);
  const ch = [0, 2, 4].map(i => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

// Walk attrs, classifying each hex `color` by whether it sits under a
// background subtree (bg) or a font/bodyFont subtree (fg). First hit wins.
function scan(node, ctx, acc) {
  if (!node || typeof node !== 'object') return;
  for (const [k, v] of Object.entries(node)) {
    let c = ctx;
    if (k === 'background') c = 'bg';
    else if (k === 'font' || k === 'bodyFont') c = 'fg';
    if (k === 'color' && typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v)) {
      if (c === 'bg') acc.bg = acc.bg || v.toLowerCase();
      else if (c === 'fg') acc.fg = acc.fg || v.toLowerCase();
    }
    if (k === 'size' && typeof v === 'string' && !acc.size) acc.size = v;
    if (k === 'textAlign' && typeof v === 'string' && !acc.align) acc.align = v;
    if (k === 'headingLevel' && typeof v === 'string' && !acc.level) acc.level = v;
    scan(v, c, acc);
  }
}

function surfaceOf(fg, bg) {
  if (bg) return relLum(bg) > 0.5 ? 'light' : 'dark';
  if (fg) return relLum(fg) > 0.5 ? 'dark' : 'light'; // light text -> built for a dark bg
  return 'unknown';
}

function roleOf(module, name, level) {
  if (module === 'divi/section') return 'section-bg';
  if (module === 'divi/button') return 'button';
  if (module === 'divi/text') return /eyebrow/i.test(name) ? 'eyebrow' : 'body';
  if (module === 'divi/heading') {
    if (level === 'h1' || /\bhero\b|\bh1\b/i.test(name)) return 'hero';
    if (level === 'h2' || /\bh2\b|section/i.test(name)) return 'section-heading';
    if (level === 'h3' || /\bh3\b|card/i.test(name)) return 'card-heading';
    return 'heading';
  }
  return module.replace('divi/', '');
}

function buildCatalogue(registry) {
  const out = [];
  for (const [module, presets] of Object.entries(registry || {})) {
    if (!presets || typeof presets !== 'object') continue;
    for (const [name, entry] of Object.entries(presets)) {
      const attrs = (entry && typeof entry === 'object' && entry.attrs) ? entry.attrs : {};
      const acc = {};
      scan(attrs, null, acc);
      const item = { name, module, surface: surfaceOf(acc.fg, acc.bg), role: roleOf(module, name, acc.level) };
      const color = acc.bg || acc.fg;
      if (color) item.color = color;   // omit null fields to keep the catalogue lean
      if (acc.size) item.size = acc.size;
      if (acc.align) item.align = acc.align;
      out.push(item);
    }
  }
  return out;
}

module.exports = { buildCatalogue };

// ─── CLI ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  if (!fs.existsSync(REGISTRY)) {
    console.error('Error: registry not found at', REGISTRY, '- run setup-et-presets.js first.');
    process.exit(1);
  }
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const catalogue = buildCatalogue(registry);
  fs.writeFileSync(CATALOGUE, JSON.stringify(catalogue));
  console.log(`  ✓ Preset catalogue: ${catalogue.length} entries → references/preset-catalogue.json`);
}
