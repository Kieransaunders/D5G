/**
 * vocabulary.js — the page-spec vocabulary (spec-first-generation).
 *
 * This IS the Divi compatibility surface: everything a page-spec.json may
 * express maps 1:1 to a proven divi-builder.js helper or attribute path.
 * If it isn't here, the spec validator rejects it — that's the compat gate
 * from docs/divi-capability-compatibility-plan.md, enforced as schema
 * instead of a heuristic HTML checker.
 *
 * Extending the vocabulary follows the export-first workflow: prove the
 * pattern with a real Divi export, add a builder helper, THEN add it here.
 */

'use strict';

const path = require('path');

// Module kinds → divi-builder.js helper names (1:1; 'raw' is the escape hatch).
const KINDS = {
  heroHeading: 'heroHeading',
  heading: 'heading',
  text: 'text',
  eyebrow: 'eyebrow',
  button: 'button',
  image: 'image',
  blurb: 'blurb',
  icon: 'icon',
  accordion: 'accordion',
  numberCounter: 'numberCounter',
  divider: 'divider',
  raw: null, // explicit builder call — validates as WARN, never silently dropped
};

// Named layouts → 24-col column flexTypes (the supported ratios from SKILL.md).
const LAYOUTS = {
  'full':        ['24_24'],
  'split-14-10': ['14_24', '10_24'],
  'split-16-8':  ['16_24', '8_24'],
  'split-12-12': ['12_24', '12_24'],
  'thirds':      ['8_24', '8_24', '8_24'],
};

// Aesthetic slugs → references/aesthetics.md presets (A-E) and their preview CSS.
const AESTHETICS = {
  'organic-tech':     'A — Organic Tech (Clinical Boutique)',
  'midnight-luxe':    'B — Midnight Luxe (Dark Editorial)',
  'brutalist-signal': 'C — Brutalist Signal (Raw Precision)',
  'vapor-clinic':     'D — Vapor Clinic (Neon Biotech)',
  'minimal-editorial': 'E — Minimal Editorial (Clean Authority)',
};

// DiviTheatre presets from the generated manifest (never hand-listed).
function theatrePresets() {
  const manifest = require(path.join(__dirname, '..', 'preset-manifest.json'));
  const entries = manifest.presets || manifest;
  const names = [];
  for (const v of Object.values(entries)) {
    if (typeof v === 'string') names.push(v);
    else if (v && v.name) names.push(v.name);
  }
  return names;
}

/** CSS grid template for a named layout, e.g. 'split-14-10' → '14fr 10fr'. */
function gridTemplate(layout) {
  const cols = LAYOUTS[layout];
  if (!cols || cols.length < 2) return null;
  return cols.map(c => `${c.split('_')[0]}fr`).join(' ');
}

/**
 * Shared section/module walk — BOTH compilers derive structure from this,
 * which is what makes fidelity true by construction.
 * Returns [{ section, layout, columns: [[module,...],...], theatre }].
 * Flat `modules` go into the first column; explicit `columns` arrays are
 * honoured; missing trailing columns are empty.
 */
function walkSections(spec) {
  return (spec.sections || []).map((sec) => {
    const colTypes = LAYOUTS[sec.layout] || ['24_24'];
    let columns;
    if (Array.isArray(sec.columns)) {
      columns = colTypes.map((_, i) => sec.columns[i] || []);
    } else {
      columns = colTypes.map((_, i) => (i === 0 ? (sec.modules || []) : []));
    }
    return { section: sec, layout: sec.layout || 'full', flexTypes: colTypes, columns, theatre: sec.theatre || null };
  });
}

/** Heading outline [{ level:1|2|..., text }] — the single source both compilers mirror. */
function headingOutline(spec) {
  const out = [];
  for (const { columns } of walkSections(spec)) {
    for (const col of columns) {
      for (const m of col) {
        if (m.kind === 'heroHeading') out.push({ level: 1, text: String(m.text || '') });
        else if (m.kind === 'heading') out.push({ level: Number(String(m.level).replace(/^h/, '')) || 2, text: String(m.text || '') });
        else if (m.kind === 'blurb' && m.title) out.push({ level: Number(String(m.titleLevel || 'h3').replace(/^h/, '')) || 3, text: String(m.title) });
      }
    }
  }
  return out;
}

module.exports = { KINDS, LAYOUTS, AESTHETICS, theatrePresets, gridTemplate, walkSections, headingOutline };
