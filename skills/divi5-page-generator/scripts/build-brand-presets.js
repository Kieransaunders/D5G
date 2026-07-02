#!/usr/bin/env node
/**
 * build-brand-presets.js — turn feature-A variables into a brand preset pack.
 *
 * buildBrandPresets(variables, roles) -> { presets, global_colors, global_variables }
 *   variables: the divi5-variables-from-styleguide output (global_colors + global_variables)
 *   roles:     { accentGcid, lightGcid, darkGcid, headingFont, h1Size, buttonRadius }
 *
 * Produces a Brand H1 heading preset (brand font + size, text colour via $variable), a
 * Brand Button Primary (background RAW HEX — Divi preset CSS does not resolve colorVar()
 * for backgrounds; text colour via $variable; enable:'on'), and a Brand Section Light
 * (raw-hex background). Reuses the builder's preset helpers so the shape is correct.
 *
 * CLI: node build-brand-presets.js <variables.json> <roles.json> [out.json]
 */
'use strict';

const D = require('./divi-builder.js');

function varRef(gcid) {
  return `$variable({"type":"color","value":{"name":"${gcid}","settings":{}}})$`;
}

function colorHex(variables, gcid) {
  const entry = (variables && variables.global_colors || []).find(c => c[0] === gcid);
  return entry ? entry[1].color : null;
}

function buildBrandPresets(variables, roles) {
  const v = variables || {};
  const r = roles || {};
  // Pack builder, not a page generator — no creative brief, so the gate does not apply
  // (same pattern as the bundled preset-first-workflow.js example).
  process.env.DIVI5_SKIP_TASTE_GATE = '1';
  const b = D.createBuilder({});

  // Heading H1 — brand font + size; text colour via $variable.
  b.headingPreset('Brand H1', {
    level: 'h1',
    family: r.headingFont,
    size: r.h1Size || '56px',
    weight: '700',
    lineHeight: '1.1em',
    color: r.darkGcid ? varRef(r.darkGcid) : undefined,
  });

  // Button — background RAW HEX (preset CSS rule), text colour via $variable, enable on.
  b.buttonPreset('Brand Button Primary', {
    bg: r.accentGcid ? colorHex(v, r.accentGcid) : undefined,
    color: r.lightGcid ? varRef(r.lightGcid) : undefined,
    radius: r.buttonRadius || '999px',
  });

  // Section — background RAW HEX (preset CSS rule).
  const lightHex = r.lightGcid ? colorHex(v, r.lightGcid) : null;
  if (lightHex) {
    b.preset('divi/section', 'Brand Section Light', {
      module: { decoration: { background: D.dv({ color: lightHex }) } },
    });
  }

  const assembled = b.assemble({ context: 'et_builder', content: '', title: 'Brand Presets', slug: 'brand-presets' });
  return {
    presets: assembled.presets,
    global_colors: v.global_colors || [],
    global_variables: v.global_variables || [],
  };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function readJson(file) {
  const fs = require('fs');
  if (!file) return null;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { throw new Error('cannot read/parse ' + file + ': ' + e.message); }
}

function main(argv) {
  const args = argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: build-brand-presets.js <variables.json> <roles.json> [out.json]');
    return 2;
  }
  try {
    const variables = readJson(args[0]);
    const roles = readJson(args[1]);
    const out = buildBrandPresets(variables, roles);
    const json = JSON.stringify(out, null, 2);
    if (args[2]) {
      const fs = require('fs');
      fs.writeFileSync(args[2], json);
      console.log('wrote ' + args[2]);
    } else {
      console.log(json);
    }
    return 0;
  } catch (e) {
    console.error('FAIL: ' + e.message);
    return 1;
  }
}

if (require.main === module) process.exit(main(process.argv));

module.exports = { buildBrandPresets, varRef, colorHex };
