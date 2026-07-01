#!/usr/bin/env node
/**
 * taste-section-number.test.js — RED proof for the harden-taste-rules change.
 *
 * Run:    node scripts/__tests__/taste-section-number.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Drives the new TASTE-SECTION-NUMBER rule (taste.md §10): "00 / INDEX"-style and
 * "01 / Overview"-style section-number eyebrows are banned.
 *   T1  "01 / Overview" -> flagged (exit 1, TASTE-SECTION-NUMBER)
 *   T2  plain label "Our services" -> not flagged
 *   T3  "10 reasons to switch" -> NOT flagged (no separator after the number)
 *   T4  "00 / INDEX" -> flagged
 */
'use strict';

process.env.DIVI5_SKIP_TASTE_GATE = '1';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..');
const TASTE   = path.join(SCRIPTS, 'taste-check.js');
const D       = require(path.join(SCRIPTS, 'divi-builder.js'));

let pass = 0, fail = 0;
const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taste-sn-'));
function ok(n, c, d) { if (c) { pass++; } else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

function page(texts) {
  const b = D.createBuilder();
  const pid = b.preset('divi/section', 'S', {});
  const mods = texts.map(t => D.text({ html: `<p>${t}</p>` }));
  const content = D.placeholder([D.section({ preset: pid }, [D.row({}, [D.column({}, mods)])])]);
  return b.assemble({ context: 'et_builder', content, title: 'T' });
}
function run(texts) {
  const f = path.join(tmp, `f-${pass + fail}.json`);
  fs.writeFileSync(f, JSON.stringify(page(texts)));
  const r = spawnSync('node', [TASTE, f], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout || '' };
}
const FLAG = /FAIL\s+TASTE-SECTION-NUMBER/i;

(function t1() { const r = run(['01 / Overview']); ok('T1: "01 / Overview" flagged', r.status === 1 && FLAG.test(r.out), `exit=${r.status}`); })();
(function t2() { const r = run(['Our services']);   ok('T2: plain label not flagged', !FLAG.test(r.out), r.out.slice(-120)); })();
(function t3() { const r = run(['10 reasons to switch']); ok('T3: number+word (no separator) not flagged', !FLAG.test(r.out), `exit=${r.status}`); })();
(function t4() { const r = run(['00 / INDEX']);     ok('T4: "00 / INDEX" flagged', r.status === 1 && FLAG.test(r.out), `exit=${r.status}`); })();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n── taste-section-number results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
