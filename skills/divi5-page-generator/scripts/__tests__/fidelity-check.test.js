#!/usr/bin/env node
/**
 * fidelity-check.test.js — RED tests for content-fidelity-gate capability.
 *
 * Run:  node scripts/__tests__/fidelity-check.test.js
 * Exit: 0 = all pass · 1 = one or more failed
 *
 * Covers:
 *   T1  fidelity-check.js exists as a runnable script
 *   T2  h1 mismatch → exit 1 + FAIL output
 *   T3  Matching h1 → no h1 FAIL
 *   T4  Heading outline reorder → exit 1 + outline FAIL
 *   T5  SKILL.md references "fidelity-check" before divi5-deploy instruction
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');

const ROOT     = path.resolve(__dirname, '..', '..');
const SCRIPTS  = path.join(ROOT, 'scripts');
const SKILL_MD = path.join(ROOT, 'SKILL.md');
const CHECK    = path.join(SCRIPTS, 'fidelity-check.js');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else       { fail++; failures.push({ name, detail }); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

function fixture(html, json) {
  const tmp  = require('os').tmpdir();
  const hf   = path.join(tmp, `fid-test-${Date.now()}.html`);
  const jf   = path.join(tmp, `fid-test-${Date.now()}.json`);
  fs.writeFileSync(hf, html);
  fs.writeFileSync(jf, JSON.stringify(json));
  return { hf, jf };
}

// T1: script exists
ok('T1 fidelity-check.js exists', fs.existsSync(CHECK), 'File not found at scripts/fidelity-check.js');

if (fs.existsSync(CHECK)) {
  // T2: h1 mismatch → exit 1
  const { hf: h2, jf: j2 } = fixture(
    '<h1 data-fid="hero-h1">Your Headline</h1>',
    { content: '<h1>A Different Headline</h1>' }
  );
  const r2 = spawnSync('node', [CHECK, j2, h2], { encoding: 'utf8' });
  ok('T2 h1 mismatch exits 1',        r2.status === 1,                    `Exit code: ${r2.status}`);
  ok('T2 h1 mismatch output has FAIL', (r2.stdout + r2.stderr).toLowerCase().includes('fail'), 'No FAIL in output');

  // T3: matching h1 → no h1 FAIL line
  const { hf: h3, jf: j3 } = fixture(
    '<h1 data-fid="hero-h1">Your Headline</h1>',
    { content: '<h1>Your Headline</h1>' }
  );
  const r3 = spawnSync('node', [CHECK, j3, h3], { encoding: 'utf8' });
  const out3 = (r3.stdout + r3.stderr).toLowerCase();
  ok('T3 matching h1 produces no h1 FAIL', !out3.includes('fail h1') && !out3.includes('h1 fail') && !out3.includes('h1 mismatch'), `Output: ${out3.slice(0, 100)}`);

  // T4: heading outline reorder → exit 1
  const { hf: h4, jf: j4 } = fixture(
    '<h1>A</h1><h2>B</h2><h2>C</h2><h2>D</h2>',
    { content: '<h1>A</h1><h2>B</h2><h3>C</h3><h2>D</h2>' }
  );
  const r4 = spawnSync('node', [CHECK, j4, h4], { encoding: 'utf8' });
  ok('T4 outline reorder exits 1',          r4.status === 1,                       `Exit code: ${r4.status}`);
  ok('T4 outline reorder output has FAIL',  (r4.stdout + r4.stderr).toLowerCase().includes('fail'), 'No FAIL in output');
}

// T5: SKILL.md wires fidelity-check before divi5-deploy
const skill = fs.readFileSync(SKILL_MD, 'utf8');
const fidIdx    = Math.min(
  skill.includes('fidelity-check') ? skill.indexOf('fidelity-check') : Infinity,
  skill.includes('Stage 3.5')      ? skill.indexOf('Stage 3.5')      : Infinity
);
const importIdx = skill.includes('divi5-deploy') ? skill.indexOf('divi5-deploy') : Infinity;
ok(
  'T5 SKILL.md references fidelity-check before divi5-deploy',
  fidIdx < importIdx,
  fidIdx === Infinity
    ? 'Neither "fidelity-check" nor "Stage 3.5" found in SKILL.md'
    : `fidelity-check at ${fidIdx}, divi5-deploy at ${importIdx}`
);

// Summary
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}${f.detail ? ': ' + f.detail : ''}`));
}
process.exit(fail > 0 ? 1 : 0);
