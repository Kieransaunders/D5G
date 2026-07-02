#!/usr/bin/env node
/**
 * taste-3col.test.js — RED proof for the three-equal-column-check change.
 *
 * Run:    node scripts/__tests__/taste-3col.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Drives the new TASTE-3COL rule: a row whose flexColumnStructure is "equal-columns_3"
 * (the generic "three feature cards" AI tell, per taste.md §5) is flagged, regardless of
 * the columns' content. Complements the existing content-based TASTE-3CARDS.
 *   T1  equal-columns_3  -> TASTE-3COL warn
 *   T2  equal-columns_1  -> not flagged
 *   T3  equal-columns_2  -> not flagged
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'taste-3col-'));
function ok(n, c, d) { if (c) { pass++; } else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

function page(structure) {
  const b = D.createBuilder();
  const pid = b.preset('divi/section', 'S', {});
  const cols = [D.column({}, []), D.column({}, []), D.column({}, [])];
  const content = D.placeholder([D.section({ preset: pid }, [D.row({ structure }, cols)])]);
  return b.assemble({ context: 'et_builder', content, title: 'T', slug: 't' });
}
function run(structure) {
  const f = path.join(tmp, `f-${pass + fail}.json`);
  fs.writeFileSync(f, JSON.stringify(page(structure)));
  const r = spawnSync('node', [TASTE, f], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout || '' };
}
const FLAG = /WARN\s+TASTE-3COL/i;

(function t1() { const r = run('equal-columns_3'); ok('T1: equal-columns_3 -> TASTE-3COL warn', FLAG.test(r.out), r.out.slice(-120)); })();
(function t2() { const r = run('equal-columns_1'); ok('T2: equal-columns_1 -> not flagged', !FLAG.test(r.out), r.out.slice(-120)); })();
(function t3() { const r = run('equal-columns_2'); ok('T3: equal-columns_2 -> not flagged', !FLAG.test(r.out), r.out.slice(-120)); })();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n── taste-3col results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
