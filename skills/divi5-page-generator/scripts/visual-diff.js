#!/usr/bin/env node
/**
 * visual-diff.js — automated visual-fidelity gate.
 *
 * Pure core (dependency-free):
 *   diff(a, b)               -> { mismatchPixels, total, mismatchPct }
 *                                a, b = { data: Uint8Array(RGBA), width, height }
 *                                throws on width/height mismatch
 *   gate(mismatchPct, max)   -> { pass, mismatchPct, maxMismatch }
 *
 * CLI (needs pixelmatch + pngjs installed: `npm install`):
 *   node visual-diff.js <a.png> <b.png> [--max-mismatch 0.05] [--per-pixel 30]
 *   exit 0 = within threshold · 1 = over threshold / error
 *
 * Used by Stage 4 to block delivery when the live page diverges from the approved mockup
 * beyond a threshold (catches the wrong-font-slot 30px-hero class of bug).
 */
'use strict';

const DEFAULT_MAX_MISMATCH = 0.05;
const DEFAULT_PER_PIXEL = 30;

function diff(a, b, perPixelThreshold) {
  const t = perPixelThreshold == null ? DEFAULT_PER_PIXEL : perPixelThreshold;
  if (!a || !b || a.width !== b.width || a.height !== b.height) {
    throw new Error('visual-diff: dimension mismatch ' +
      (a && a.width) + 'x' + (a && a.height) + ' vs ' + (b && b.width) + 'x' + (b && b.height));
  }
  const total = a.width * a.height;
  let mismatched = 0;
  for (let i = 0; i < total; i++) {
    const o = i * 4;
    const dr = Math.abs(a.data[o] - b.data[o]);
    const dg = Math.abs(a.data[o + 1] - b.data[o + 1]);
    const db = Math.abs(a.data[o + 2] - b.data[o + 2]);
    if (Math.max(dr, dg, db) > t) mismatched++;
  }
  return { mismatchPixels: mismatched, total, mismatchPct: total ? mismatched / total : 0 };
}

function gate(mismatchPct, maxMismatch) {
  const max = maxMismatch == null ? DEFAULT_MAX_MISMATCH : maxMismatch;
  return { pass: mismatchPct <= max, mismatchPct, maxMismatch: max };
}

// ─── CLI ─────────────────────────────────────────────────────────────────────
function loadPng(file) {
  let pngjs, pixelmatch;
  try { pngjs = require('pngjs'); } catch (e) { /* not installed */ }
  if (!pngjs) throw new Error('pngjs not installed — run `npm install` in skills/divi5-page-generator');
  const PNG = pngjs.PNG;
  const fs = require('fs');
  return new Promise((resolve, reject) => {
    fs.createReadStream(file)
      .pipe(new PNG())
      .on('parsed', function () { resolve({ data: this.data, width: this.width, height: this.height }); })
      .on('error', reject);
  });
}

async function main(argv) {
  const args = argv.slice(2);
  const files = [];
  let maxMismatch = DEFAULT_MAX_MISMATCH;
  let perPixel = DEFAULT_PER_PIXEL;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--max-mismatch') { maxMismatch = parseFloat(args[++i]); }
    else if (args[i] === '--per-pixel') { perPixel = parseFloat(args[++i]); }
    else files.push(args[i]);
  }
  if (files.length !== 2) { console.error('Usage: visual-diff.js <a.png> <b.png> [--max-mismatch 0.05] [--per-pixel 30]'); return 2; }
  try {
    const [a, b] = await Promise.all([loadPng(files[0]), loadPng(files[1])]);
    const r = diff(a, b, perPixel);
    const g = gate(r.mismatchPct, maxMismatch);
    console.log(`visual-diff: ${(r.mismatchPct * 100).toFixed(2)}% mismatch (threshold ${(maxMismatch * 100).toFixed(2)}%) — ${g.pass ? 'PASS' : 'FAIL'}`);
    return g.pass ? 0 : 1;
  } catch (e) {
    console.log('FAIL: ' + e.message);
    return 1;
  }
}

if (require.main === module) {
  main(process.argv).then(code => process.exit(code));
}

module.exports = { diff, gate, DEFAULT_MAX_MISMATCH, DEFAULT_PER_PIXEL };
