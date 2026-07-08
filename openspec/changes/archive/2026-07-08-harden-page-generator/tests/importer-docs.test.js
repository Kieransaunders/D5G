#!/usr/bin/env node
/**
 * importer-docs.test.js — scenarios for the `importer-integration` capability.
 * RED until SKILL.md is corrected to the active divi-tools-importer plugin.
 *
 * Run:  node scripts/__tests__/importer-docs.test.js
 *   D1  documents POST /wp-json/divi-tools/v1/import and header X-Divi-Tools-Key
 *   D2  no stale X-D5G-Key / divi5-generator/v1 import instructions remain
 *   D3  setup docs require /presets?with_attrs=1
 *   D4  a site-profile reference is linked
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SKILL = path.resolve(__dirname, '..', '..', 'SKILL.md');
const src = fs.existsSync(SKILL) ? fs.readFileSync(SKILL, 'utf8') : '';

let pass = 0, fail = 0; const failures = [];
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

ok('D1: documents the divi-tools import endpoint', /\/wp-json\/divi-tools\/v1\/import/.test(src));
ok('D1: documents the X-Divi-Tools-Key header', /X-Divi-Tools-Key/.test(src));
ok('D2: no stale X-D5G-Key header reference', !/X-D5G-Key/.test(src), 'stale header present');
ok('D2: no stale divi5-generator/v1 import route', !/divi5-generator\/v1\/import/.test(src), 'stale route present');
ok('D3: setup docs require ?with_attrs=1', /\/presets\?with_attrs=1/.test(src));
ok('D4: links a site-profile reference', /site[-\s]?profile/i.test(src), 'no site-profile reference');

console.log(`\n── importer-docs results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
