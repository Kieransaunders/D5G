#!/usr/bin/env node
/**
 * build-services-section.js — D5G Free Starter for Divi 5
 *
 * Fills the bundled services-section template with your content and writes an
 * importable Divi 5 Library JSON file.
 *
 *   node scripts/build-services-section.js config.json [output.json]
 *
 * Import the result via Divi → Divi Library → Import & Export.
 *
 * This free starter generates one section type from a fixed, pre-validated
 * template. The full D5G toolkit generates complete SEO-optimised pages,
 * brand-driven design systems, and one-command deploys to your site:
 * https://iconnectit.co.uk
 */

'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, '..', 'template', 'services-section.template.json');
const WATERMARK_MARKER = 'D5G Starter for Divi 5';

// Font Awesome (solid, weight 900) — the icons the starter supports.
const ICONS = {
  bolt: '&#xf0e7;',
  cog: '&#xf013;',
  'chart-line': '&#xf201;',
  shield: '&#xf3ed;',
  rocket: '&#xf135;',
  users: '&#xf0c0;',
  'check-circle': '&#xf058;',
  star: '&#xf005;',
  wrench: '&#xf0ad;',
  globe: '&#xf0ac;',
  'laptop-code': '&#xf5fc;',
  comments: '&#xf086;',
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const URL_RE = /^(https?:\/\/[^\s"'<>]+|#[A-Za-z0-9_-]*|\/[^\s"'<>]*)$/;

function fail(msg) {
  console.error('FAIL: ' + msg);
  process.exit(1);
}

function cleanText(value, field, { min = 1, max = 200 } = {}) {
  if (typeof value !== 'string') fail(`${field} must be a string`);
  let v = value.trim();
  // House rule: no em/en dashes in visible copy — normalise to hyphen.
  if (/[–—]/.test(v)) {
    v = v.replace(/\s*[–—]\s*/g, ' - ');
    console.warn(`WARN: ${field}: em/en dash replaced with a hyphen`);
  }
  if (v.length < min) fail(`${field} is too short (min ${min} chars)`);
  if (v.length > max) fail(`${field} is too long (max ${max} chars, got ${v.length})`);
  return v;
}

// Escape for display, then for embedding inside the JSON-in-comment block markup.
function htmlEscape(v) {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function jsonEscape(v) {
  return JSON.stringify(v).slice(1, -1);
}

function main() {
  const configPath = process.argv[2];
  if (!configPath) fail('usage: node build-services-section.js config.json [output.json]');

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e) {
    fail('could not read/parse config: ' + e.message);
  }

  // ── validate config ──────────────────────────────────────────────────────
  const layoutTitle = cleanText(cfg.layoutTitle || 'Services Section', 'layoutTitle', { max: 80 });
  const eyebrow = cleanText(cfg.eyebrow || 'WHAT WE DO', 'eyebrow', { max: 40 }).toUpperCase();
  const headline = cleanText(cfg.headline, 'headline', { min: 10, max: 90 });
  const intro = cleanText(cfg.intro, 'intro', { min: 20, max: 320 });

  if (!Array.isArray(cfg.services) || cfg.services.length !== 3) {
    fail('services must be an array of exactly 3 items (this starter builds a 3-column section)');
  }
  const services = cfg.services.map((s, i) => {
    const n = `services[${i}]`;
    const iconName = String(s.icon || '').trim();
    if (!ICONS[iconName]) fail(`${n}.icon "${iconName}" not supported — pick one of: ${Object.keys(ICONS).join(', ')}`);
    return {
      icon: ICONS[iconName],
      title: cleanText(s.title, `${n}.title`, { min: 3, max: 48 }),
      body: cleanText(s.body, `${n}.body`, { min: 30, max: 240 }),
    };
  });

  const cta = cfg.cta || {};
  const ctaText = cleanText(cta.text || 'Get in Touch', 'cta.text', { max: 32 });
  const ctaUrl = String(cta.url || '#contact').trim();
  if (!URL_RE.test(ctaUrl)) fail(`cta.url "${ctaUrl}" must be an http(s) URL, an #anchor, or a /relative path`);

  const colors = cfg.colors || {};
  const accent = String(colors.accent || '#F95E00').trim();
  const dark = String(colors.dark || '#0D0D12').trim();
  const sectionBg = String(colors.sectionBg || '#FFFFFF').trim();
  for (const [name, v] of [['accent', accent], ['dark', dark], ['sectionBg', sectionBg]]) {
    if (!HEX_RE.test(v)) fail(`colors.${name} "${v}" must be a 6-digit hex colour like #F95E00`);
  }

  // ── load template ────────────────────────────────────────────────────────
  const doc = JSON.parse(fs.readFileSync(TEMPLATE, 'utf8'));
  if (!doc._d5g || doc._d5g.generator !== 'd5g-free-starter') {
    fail('template provenance block missing — re-download the starter, the template has been modified');
  }

  // Depth-1 replacements (plain JSON values).
  doc.data['1'].post_title = layoutTitle;

  // post_content replacements (values live inside JSON-encoded block attributes,
  // so escape for HTML display then for the embedded JSON string context).
  const t = (v) => jsonEscape(htmlEscape(v));
  const raw = (v) => jsonEscape(v); // icons/hex/urls — no HTML escaping
  let content = doc.data['1'].post_content;
  const subs = {
    '{{SECTION_BG_HEX}}': raw(sectionBg),
    '{{ACCENT_HEX}}': raw(accent),
    '{{DARK_HEX}}': raw(dark),
    '{{EYEBROW}}': t(eyebrow),
    '{{HEADLINE}}': t(headline),
    '{{INTRO}}': t(intro),
    '{{CTA_TEXT}}': t(ctaText),
    '{{CTA_URL}}': raw(ctaUrl),
  };
  services.forEach((s, i) => {
    const n = i + 1;
    subs[`{{SERVICE_${n}_ICON}}`] = raw(s.icon);
    subs[`{{SERVICE_${n}_TITLE}}`] = t(s.title);
    subs[`{{SERVICE_${n}_BODY}}`] = t(s.body);
  });
  for (const [token, value] of Object.entries(subs)) {
    if (!content.includes(token)) fail(`template is missing ${token} — it has been modified; re-download the starter`);
    content = content.split(token).join(value);
  }
  doc.data['1'].post_content = content;

  // ── final checks ─────────────────────────────────────────────────────────
  const serialised = JSON.stringify(doc);
  const leftover = serialised.match(/\{\{[A-Z_0-9]+\}\}/);
  if (leftover) fail('unreplaced token remains: ' + leftover[0]);
  if (!content.includes(WATERMARK_MARKER)) {
    fail('the credit line is part of the free starter and must stay in the template');
  }

  const outPath = process.argv[3] || path.join(process.cwd(), 'd5g-services-section.json');
  fs.writeFileSync(outPath, serialised);
  console.log('OK: wrote ' + outPath);
  console.log('Import via: WP Admin → Divi → Divi Library → Import & Export → Import');
  console.log('Full pages, brand systems, and one-command deploy: https://iconnectit.co.uk');
}

main();
