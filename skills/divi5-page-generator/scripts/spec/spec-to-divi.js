#!/usr/bin/env node
/**
 * spec-to-divi.js — compile a page-spec to importable Divi 5 JSON.
 *
 * specToDivi(spec, opts) → { pageJson, seoMeta, schema }
 *   pageJson : string — the et_builder export (write as <slug>-landing-page.json)
 *   seoMeta  : object — title/description/keyword sidecar
 *   schema   : object — WebPage JSON-LD
 * CLI:  node scripts/spec/spec-to-divi.js page-spec.json [outdir]
 *
 * Every module goes through divi-builder.js helpers (never hand-written JSON).
 * Preset references resolve by NAME against references/et-preset-registry.json
 * (or a registry passed via opts.registry): known names keep their registry ID
 * so live imports match by ID; the preset is bundled in doc.presets
 * (single-import mode) so validate.js can verify every reference offline and
 * the page renders without a server round-trip.
 *
 * Gate note: this is a pure compiler, so — like ingest/mutate — it does not
 * call assemble() and its stamp check. The spec path's mechanical gates are
 * validate-spec.js (compat) and the workflow's gate.js concept/mockup stamps,
 * which SKILL.md still requires before import.
 *
 * The export also carries a literal `content` heading-outline mirror (the
 * documented convention fidelity-check.js reads), generated from the SAME
 * walk as the HTML compiler — fidelity by construction.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../divi-builder');
const V = require('./vocabulary');
const { validateSpec } = require('./validate-spec');

const BUNDLED_BUTTON_BASE = {
  button: { decoration: { button: { desktop: { value: { enable: 'on' } } } } },
};

function loadRegistry(opts) {
  if (opts && opts.registry) return opts.registry;
  const p = path.join(__dirname, '..', '..', 'references', 'et-preset-registry.json');
  if (fs.existsSync(p)) {
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return {}; }
  }
  return {};
}

const KIND_TO_DIVI_MODULE = {
  section: 'divi/section',
  button: 'divi/button',
  heading: 'divi/heading',
  heroHeading: 'divi/heading',
  text: 'divi/text',
  blurb: 'divi/blurb',
  image: 'divi/image',
  icon: 'divi/icon',
  accordion: 'divi/accordion',
  numberCounter: 'divi/number-counter',
  divider: 'divi/divider',
};

function specToDivi(spec, opts) {
  const { errors, warnings } = validateSpec(spec);
  if (errors.length) {
    throw new Error(`spec failed validation:\n  ${errors.join('\n  ')}`);
  }

  const registry = loadRegistry(opts);
  const presetStore = {}; // moduleName -> { default, items } (bundled, single-import mode)

  /** Resolve a preset name for a module kind → { id, attrs }, bundling it in doc.presets. */
  function resolvePreset(kind, name) {
    const moduleName = KIND_TO_DIVI_MODULE[kind] || 'divi/text';
    const regMap = registry[moduleName] || {};
    const regEntry = regMap[name];
    const id = typeof regEntry === 'string' ? regEntry
      : (regEntry && regEntry.id) ? String(regEntry.id)
      : D.randomId();
    // Reference presets by ID only — the target site owns their styling (matched
    // by ID on import, as setup-et-presets.js guarantees the presets exist there).
    // Inlining the registry's attrs would re-stamp the designer's raw hex/gcid onto
    // every block, tripping the token/gcid gates for no render benefit. validate.js
    // reads colours from the registry (not the bundle) for the contrast gate.
    const attrs = (moduleName === 'divi/button') ? BUNDLED_BUTTON_BASE : {};
    if (!presetStore[moduleName]) presetStore[moduleName] = { default: id, items: {} };
    if (!presetStore[moduleName].items[id]) {
      presetStore[moduleName].items[id] = {
        id, name, moduleName,
        version: D.BUILDER_VERSION, type: 'module',
        created: Date.now(), updated: Date.now(),
        attrs,
      };
    }
    return { id, attrs };
  }

  function buildModule(m) {
    const preset = m.preset ? resolvePreset(m.kind, m.preset) : undefined;
    switch (m.kind) {
      case 'heroHeading': return D.heroHeading({ text: m.text, preset });
      case 'heading': return D.heading({ text: m.text, level: `h${String(m.level).replace(/^h/, '')}`, preset });
      case 'text': return D.text({ html: m.html || `<p>${m.text || ''}</p>`, preset });
      case 'eyebrow': return D.eyebrow(m.text, undefined, { preset });
      case 'button': return D.button({ text: m.text, url: m.href, preset });
      case 'image': return D.image({ src: m.src, alt: m.alt, preset });
      case 'blurb': return D.blurb({ icon: m.icon, title: m.title, titleLevel: m.titleLevel || 'h3', body: m.body, preset });
      case 'icon': return D.icon({ unicode: m.icon, color: m.color, preset });
      case 'accordion': return D.accordion(
        (m.items || []).map(it => ({ question: it.title, answer: it.body, open: it.open })),
        { preset });
      case 'numberCounter': return D.numberCounter({ number: m.number, title: m.label, percent: m.percent, preset });
      case 'divider': return D.divider(m);
      case 'raw': {
        const fn = m.builder && D[m.builder];
        if (typeof fn !== 'function') {
          throw new Error(`raw module: unknown builder helper "${m.builder}"`);
        }
        return fn(m.args || {});
      }
      default:
        throw new Error(`unknown module kind "${m.kind}" reached the compiler — validate-spec should have caught this`);
    }
  }

  // ── shared walk → Divi structure ────────────────────────────────────────
  const walks = V.walkSections(spec);
  const sectionBlocks = walks.map((w) => {
    const columns = w.columns.map((col, i) =>
      D.column({ flexType: w.flexTypes[i] }, col.map(buildModule)));
    const rowOpts = {};
    const sectionOpts = { adminLabel: w.section.id || w.section.type || 'section' };
    if (w.section.preset) sectionOpts.preset = resolvePreset('section', w.section.preset);
    if (w.theatre) sectionOpts.theatre = w.theatre;
    return D.section(sectionOpts, [D.row(rowOpts, columns)]);
  });

  const content = D.placeholder(sectionBlocks);

  // Literal heading-outline mirror for fidelity-check.js — same walk as the
  // HTML compiler, so the outlines cannot diverge.
  const outline = V.headingOutline(spec)
    .map(h => `<h${h.level}>${h.text}</h${h.level}>`)
    .join('\n');

  const doc = {
    context: 'et_builder',
    data: { 1: content },
    canvases: {},
    presets: { module: presetStore },
    global_colors: [],
    global_variables: [],
    images: {},
    thumbnails: [],
    content: outline,
  };

  const firstText = (() => {
    for (const w of walks) for (const col of w.columns) for (const m of col) {
      if (m.kind === 'text') return m.text || '';
    }
    return '';
  })();
  const h1 = (V.headingOutline(spec).find(h => h.level === 1) || {}).text || '';

  const seoMeta = {
    title: (spec.seo && spec.seo.title) || h1,
    description: (spec.seo && spec.seo.description) || String(firstText).slice(0, 155),
    keyword: (spec.seo && spec.seo.primary) || '',
    slug: spec.slug,
  };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seoMeta.title,
    description: seoMeta.description,
  };

  return { pageJson: JSON.stringify(doc, null, 2), seoMeta, schema, warnings };
}

module.exports = { specToDivi };

// ─── CLI ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  const os = require('os');
  const file = process.argv[2];
  if (!file) { console.error('Usage: node spec-to-divi.js <page-spec.json> [outdir]'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const out = process.argv[3] || process.env.DIVI5_OUT || path.join(os.homedir(), 'Desktop', 'Divi5 Pages');
  fs.mkdirSync(out, { recursive: true });
  const { pageJson, seoMeta, schema, warnings } = specToDivi(spec);
  const slug = spec.slug || 'page';
  fs.writeFileSync(path.join(out, `${slug}-landing-page.json`), pageJson);
  fs.writeFileSync(path.join(out, `${slug}-seo-meta.json`), JSON.stringify(seoMeta, null, 2));
  fs.writeFileSync(path.join(out, `${slug}-schema.json`), JSON.stringify(schema, null, 2));
  for (const w of warnings) console.log(`  WARN  ${w}`);
  console.log(`Wrote ${slug}-landing-page.json, ${slug}-seo-meta.json, ${slug}-schema.json → ${out}`);
}
