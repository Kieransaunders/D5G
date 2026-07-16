#!/usr/bin/env node
'use strict';

/**
 * make-unresolved-test.js — PRIVATE dev tool. Never shipped in any skill.
 *
 * Produces the two "unresolved" page-JSON variants the Pro-gating smoke test
 * needs (docs/pro-gating-relocation-spec.md §4 Steps 1+2, §5), so a human can
 * prove on live Divi that raw toolkit output renders broken while the same page
 * through the Pro /import endpoint renders correctly.
 *
 * Input:  a generated Divi 5 PAGE JSON (context: 'et_builder'), exactly the shape
 *         emitted by skills/divi5-page-generator/scripts/divi-builder.js assemble()
 *         — { context, data:{1:<block-comment string>}, canvases, presets:{module,group},
 *             global_colors, global_variables, images, thumbnails }.
 *
 * Output (written next to the input):
 *   <name>.variantA.json   Step 1 "de-inlined": every page module block keeps its
 *                          modulePreset/groupPreset pointers + structural attrs, but
 *                          the preset-derived inline style attrs are stripped. The
 *                          top-level `presets` block is kept intact. (Validates in the
 *                          validator's NORMAL mode.)
 *   <name>.variantB.json   Step 2 "brand externalised": everything in A, AND the
 *                          top-level presets / global_colors / global_variables are
 *                          removed entirely. (Validates in PRESET-FIRST mode against
 *                          the sidecar files below.)
 *   <name>.presets.json    the removed presets, in the *.presets.json shape the
 *                          validator discovers for preset-first cross-checking.
 *   <name>.variables.json  the removed global_colors, so preset-first gcid checks
 *                          find their definitions on disk.
 *   <name>.brand.json      single out-of-band bundle {presets, global_colors,
 *                          global_variables} — travels to the Pro importer.
 *
 * Usage:
 *   node tools/make-unresolved-test.js <page.json>
 *
 * Validate the output (from the page's own directory):
 *   node skills/divi5-page-generator/scripts/validate.js <name>.variantA.json
 *   node skills/divi5-page-generator/scripts/validate.js <name>.variantB.json
 */

const fs = require('fs');
const path = require('path');

// De-inlining primitives are shared with divi-builder.js's page emit path so the
// "unresolved" shape this tool proved on live Divi can never drift from what the
// builder actually emits (docs/pro-gating-relocation-spec.md §4).
const {
  readJson, safeBlockJson, transformBlocks,
  stripPresetAttrs, indexPresets, deInlineBlock,
  deInlineContent, presetsSidecar,
} = require('../skills/divi5-page-generator/scripts/de-inline.js');

// ── variant builders ─────────────────────────────────────────────────────────

function buildVariantA(doc) {
  if (doc.context !== 'et_builder') {
    throw new Error(`input is not a page build (context: ${doc.context}). This tool only de-inlines full-page (et_builder) JSON.`);
  }
  const out = JSON.parse(JSON.stringify(doc));
  out.data[1] = deInlineContent(out.data[1], doc.presets);
  return out;
}

function buildVariantB(variantA) {
  const out = JSON.parse(JSON.stringify(variantA));
  const brand = {
    presets: out.presets,
    global_colors: out.global_colors || [],
    global_variables: out.global_variables || [],
  };
  delete out.presets;
  delete out.global_colors;
  delete out.global_variables;
  return { variantB: out, brand };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function run(inputPath) {
  const abs = path.resolve(inputPath);
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const dir = path.dirname(abs);
  const base = path.basename(abs).replace(/\.json$/i, '');

  const variantA = buildVariantA(doc);
  const { variantB, brand } = buildVariantB(variantA);

  const files = {
    [`${base}.variantA.json`]: variantA,
    [`${base}.variantB.json`]: variantB,
    [`${base}.presets.json`]: presetsSidecar(brand.presets),
    [`${base}.variables.json`]: brand.global_colors,
    [`${base}.brand.json`]: brand,
  };
  const written = [];
  for (const [fname, data] of Object.entries(files)) {
    const p = path.join(dir, fname);
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    written.push(p);
  }
  return written;
}

module.exports = {
  readJson, transformBlocks, safeBlockJson,
  stripPresetAttrs, indexPresets, deInlineBlock,
  buildVariantA, buildVariantB, presetsSidecar, run,
};

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node tools/make-unresolved-test.js <page.json>');
    process.exit(2);
  }
  try {
    const written = run(input);
    console.log('Wrote:');
    for (const p of written) console.log('  ' + p);
  } catch (e) {
    console.error('Error: ' + e.message);
    process.exit(1);
  }
}
