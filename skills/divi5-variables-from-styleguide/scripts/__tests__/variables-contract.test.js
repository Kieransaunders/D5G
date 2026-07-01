#!/usr/bin/env node
/**
 * variables-contract.test.js — RED proof for the port-divi-variables-skill change.
 *
 * Run:    node scripts/__tests__/variables-contract.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Exercises the Divi 5 Global Variables import contract that the new
 * `divi5-variables-from-styleguide` skill must produce, enforced by
 * `scripts/check-variables-json.js`:
 *   T1  a correct minimal file passes
 *   T2  context !== "et_builder" fails (R1)
 *   T3  a missing root key fails (R2)
 *   T4  a color without a matching colors-variable fails (R5 — the orphan-color rule
 *       the upstream 16wells example actually violates)
 *   T5  a variable missing a required field fails (R4)
 *   T6  a variable with an invalid type fails (R4)
 *   T7  an id without the gvid-/gcid- prefix fails (R3/R4)
 *
 * The `ran` guard prevents the "should fail" cases from passing spuriously while the
 * validator script does not yet exist.
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..');
const CHECK   = path.join(SCRIPTS, 'check-variables-json.js');

let pass = 0, fail = 0, i = 0;
const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vars-contract-'));
function ok(name, cond, detail) {
  if (cond) { pass++; } else { fail++; failures.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

function run(obj) {
  const f = path.join(tmp, `f-${i++}.json`);
  fs.writeFileSync(f, JSON.stringify(obj));
  const r = spawnSync('node', [CHECK, f], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const ran = !/Cannot find module|MODULE_NOT_FOUND/.test(out);
  return { status: r.status, out, ran };
}

// Correct minimal file — every color has a matching colors-variable (R5 satisfied).
const VALID = {
  context: 'et_builder', data: [], presets: [],
  global_colors: [
    ['gcid-color-brand-navy', { color: '#1A2332', status: 'active', label: 'Brand Navy' }],
  ],
  global_variables: [
    { id: 'gvid-color-brand-navy', label: 'Color Brand Navy', value: '#1A2332', order: '', status: 'active', lastUpdated: '2026-03-17T00:00:00.000Z', variableType: 'colors', type: 'colors', groupKey: 'colors' },
    { id: 'gvid-font-heading-family', label: 'Font Heading Family', value: 'Roboto', order: '', status: 'active', lastUpdated: '2026-03-17T00:00:00.000Z', variableType: 'fonts', type: 'fonts', groupKey: 'fonts' },
  ],
  canvases: [], images: [], thumbnails: [],
};

function clone(m) { return JSON.parse(JSON.stringify(VALID)); }

// ─── T1: valid passes ────────────────────────────────────────────────────────
(function t1() {
  const { ran, status, out } = run(VALID);
  ok('T1: correct minimal file passes (exit 0)', ran && status === 0, ran ? `exit=${status}` : 'check script missing');
})();

// ─── T2: context !== et_builder fails (R1) ───────────────────────────────────
(function t2() {
  const bad = clone(); bad.context = 'et_builder_layouts';
  const { ran, status, out } = run(bad);
  ok('T2: wrong context fails', ran && status === 1 && /context/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T3: missing root key fails (R2) ─────────────────────────────────────────
(function t3() {
  const bad = clone(); delete bad.canvases;
  const { ran, status, out } = run(bad);
  ok('T3: missing root key (canvases) fails', ran && status === 1 && /canvases|root|missing/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T4: orphan color (no matching colors-variable) fails (R5) ───────────────
(function t4() {
  const bad = clone();
  bad.global_colors.push(['gcid-color-brand-blue', { color: '#0066FF', status: 'active', label: 'Brand Blue' }]);
  // no gvid-color-brand-blue variable added — orphan
  const { ran, status, out } = run(bad);
  ok('T4: color without matching colors-variable fails', ran && status === 1 && /color|orphan|variable/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T5: variable missing a required field fails (R4) ────────────────────────
(function t5() {
  const bad = clone(); delete bad.global_variables[1].groupKey;
  const { ran, status, out } = run(bad);
  ok('T5: variable missing groupKey fails', ran && status === 1 && /groupKey|missing|field/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T6: variable with invalid type fails (R4) ───────────────────────────────
(function t6() {
  const bad = clone(); bad.global_variables[1].type = 'widgets'; bad.global_variables[1].variableType = 'widgets';
  const { ran, status, out } = run(bad);
  ok('T6: invalid variable type fails', ran && status === 1 && /type|widgets|invalid/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T7: id without gvid-/gcid- prefix fails (R3/R4) ─────────────────────────
(function t7() {
  const bad = clone(); bad.global_variables[1].id = 'font-heading-family';
  const { ran, status, out } = run(bad);
  ok('T7: variable id without gvid- prefix fails', ran && status === 1 && /gvid|prefix|id/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── T8: invalid color value fails (R3) ──────────────────────────────────────
(function t8() {
  const bad = clone(); bad.global_colors[0][1].color = 'not-a-color';
  const { ran, status, out } = run(bad);
  ok('T8: invalid color value fails', ran && status === 1 && /color|invalid/i.test(out), ran ? `exit=${status}` : 'script missing');
})();

// ─── Cleanup + report ────────────────────────────────────────────────────────
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n── variables-contract test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
