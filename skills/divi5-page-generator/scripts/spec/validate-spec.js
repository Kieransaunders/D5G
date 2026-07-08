#!/usr/bin/env node
/**
 * validate-spec.js — the authoring-time Divi compatibility gate.
 *
 * validateSpec(spec) → { errors: string[], warnings: string[] }
 * CLI:  node scripts/spec/validate-spec.js page-spec.json
 *
 * Errors block compilation (unsupported vocabulary = a pattern with no proven
 * Divi mapping). `raw` modules are the escape hatch: they WARN so they surface
 * in the run report, but never block — and never get silently dropped.
 */

'use strict';

const V = require('./vocabulary');

function validateSpec(spec) {
  const errors = [];
  const warnings = [];

  if (!spec || typeof spec !== 'object') {
    return { errors: ['spec must be an object'], warnings };
  }
  if (!spec.slug || typeof spec.slug !== 'string') errors.push('spec.slug (string) is required');
  if (spec.aesthetic && !V.AESTHETICS[spec.aesthetic]) {
    errors.push(`spec.aesthetic "${spec.aesthetic}" is not a known aesthetic — supported: ${Object.keys(V.AESTHETICS).join(', ')}`);
  }
  if (!Array.isArray(spec.sections) || spec.sections.length === 0) {
    errors.push('spec.sections must be a non-empty array');
    return { errors, warnings };
  }

  const theatreNames = V.theatrePresets();
  let heroHeadings = 0;

  spec.sections.forEach((sec, i) => {
    const sid = sec.id || `#${i}`;
    if (sec.layout && !V.LAYOUTS[sec.layout]) {
      errors.push(`section "${sid}": unsupported layout "${sec.layout}" — supported: ${Object.keys(V.LAYOUTS).join(', ')}`);
    }
    if (sec.theatre && !theatreNames.includes(sec.theatre)) {
      errors.push(`section "${sid}": theatre preset "${sec.theatre}" is not in preset-manifest.json — known: ${theatreNames.join(', ')}`);
    }
    if (sec.preset != null && typeof sec.preset !== 'string') {
      errors.push(`section "${sid}": preset must be a string preset name`);
    }

    const cols = Array.isArray(sec.columns) ? sec.columns : [sec.modules || []];
    if (Array.isArray(sec.columns) && sec.layout && sec.columns.length > (V.LAYOUTS[sec.layout] || []).length) {
      errors.push(`section "${sid}": ${sec.columns.length} column(s) declared but layout "${sec.layout}" has ${(V.LAYOUTS[sec.layout] || []).length}`);
    }

    cols.forEach((col) => {
      (col || []).forEach((m, mi) => {
        const where = `section "${sid}" module ${mi}`;
        if (!m || typeof m !== 'object' || !m.kind) {
          errors.push(`${where}: module must be an object with a "kind"`);
          return;
        }
        if (!(m.kind in V.KINDS)) {
          errors.push(`${where}: unknown module kind "${m.kind}" — supported: ${Object.keys(V.KINDS).join(', ')}. If Divi can prove this pattern, add it via the export-first workflow; otherwise use kind "raw".`);
          return;
        }
        if (m.kind === 'raw') {
          warnings.push(`${where}: raw escape-hatch module (builder: ${m.builder || 'unspecified'}) — not covered by the spec vocabulary; verify at the live preview stage`);
        }
        if (m.kind === 'heroHeading') heroHeadings++;
        if (m.kind === 'heading' && m.level == null) {
          errors.push(`${where}: heading requires an explicit "level" (2-6)`);
        }
        if (m.kind === 'image' && !m.alt) {
          errors.push(`${where}: image requires descriptive "alt" text`);
        }
      });
    });
  });

  if (heroHeadings !== 1) {
    errors.push(`page must contain exactly one heroHeading (found ${heroHeadings}) — section headings are "heading" level 2+`);
  }

  return { errors, warnings };
}

module.exports = { validateSpec };

// ─── CLI ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  const fs = require('fs');
  const file = process.argv[2];
  if (!file) { console.error('Usage: node validate-spec.js <page-spec.json>'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { errors, warnings } = validateSpec(spec);
  for (const w of warnings) console.log(`  WARN  ${w}`);
  for (const e of errors) console.log(`  FAIL  ${e}`);
  if (!errors.length) console.log(`PASS spec uses Divi-compatible vocabulary (${warnings.length} warning(s))`);
  process.exit(errors.length ? 1 : 0);
}
