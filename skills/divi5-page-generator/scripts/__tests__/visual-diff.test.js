#!/usr/bin/env node
/**
 * visual-diff.test.js — RED proof for the automated-visual-gate change.
 *
 * Run:    node scripts/__tests__/visual-diff.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Exercises the pure diff/gate logic of scripts/visual-diff.js using synthetic RGBA pixel
 * buffers (no PNG files, no browser). pixelmatch is the diff engine.
 *   T1  identical images -> 0% mismatch -> gate passes
 *   T2  maximally different images -> ~100% mismatch -> gate fails
 *   T3  dimension mismatch -> diff throws
 *   T4  gate honours the max-mismatch threshold (0.3 vs 0.5 passes, vs 0.2 fails)
 */
'use strict';

const path = require('path');
let D = null;
try { D = require(path.join(__dirname, '..', 'visual-diff.js')); } catch (e) { D = null; }

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; } else { fail++; failures.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

// Build a {data: Uint8Array, width, height} RGBA buffer filled with one value (no deps).
function solid(w, h, v) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < data.length; i += 4) { data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255; }
  return { data, width: w, height: h };
}

const IDENT_A = solid(2, 2, 0);
const IDENT_B = solid(2, 2, 0);
const WHITE = solid(2, 2, 255);
const BLACK = solid(2, 2, 0);

// ─── T1: identical -> 0% -> pass ─────────────────────────────────────────────
(function t1() {
  if (!D) return ok('T1: identical images -> 0% mismatch -> passes', false, 'visual-diff.js missing');
  let r;
  try { r = D.diff(IDENT_A, IDENT_B); } catch (e) { return ok('T1', false, 'threw: ' + e.message); }
  ok('T1: identical images -> 0% mismatch', r.mismatchPct === 0, `pct=${r.mismatchPct}`);
  ok('T1: gate passes at default threshold', D.gate(r.mismatchPct, 0.05).pass === true, 'gate did not pass');
})();

// ─── T2: maximally different -> ~100% -> fail ───────────────────────────────
(function t2() {
  if (!D) return ok('T2: maximally different -> fails', false, 'visual-diff.js missing');
  let r;
  try { r = D.diff(WHITE, BLACK); } catch (e) { return ok('T2', false, 'threw: ' + e.message); }
  ok('T2: maximally different -> high mismatch', r.mismatchPct > 0.9, `pct=${r.mismatchPct}`);
  ok('T2: gate fails at default threshold', D.gate(r.mismatchPct, 0.05).pass === false, 'gate did not fail');
})();

// ─── T3: dimension mismatch -> throws ───────────────────────────────────────
(function t3() {
  if (!D) return ok('T3: dimension mismatch throws', false, 'visual-diff.js missing');
  let threw = false;
  try { D.diff(solid(2, 2, 0), solid(3, 1, 0)); } catch (e) { threw = true; }
  ok('T3: dimension mismatch throws', threw, 'did not throw');
})();

// ─── T4: gate honours threshold ─────────────────────────────────────────────
(function t4() {
  if (!D) return ok('T4: gate honours threshold', false, 'visual-diff.js missing');
  ok('T4: 0.3 mismatch passes at 0.5 threshold', D.gate(0.3, 0.5).pass === true, 'should pass');
  ok('T4: 0.3 mismatch fails at 0.2 threshold', D.gate(0.3, 0.2).pass === false, 'should fail');
})();

console.log('\n── visual-diff test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
