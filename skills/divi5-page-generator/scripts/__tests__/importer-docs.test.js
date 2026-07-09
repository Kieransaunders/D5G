#!/usr/bin/env node
/**
 * importer-docs.test.js — scenarios for the `importer-integration` capability.
 * Enforces that SKILL.md documents the active divi5-generator plugin (the
 * committed plugin registers namespace divi5-generator/v1 and reads X-D5G-Key).
 *
 * Run:  node scripts/__tests__/importer-docs.test.js
 *   D1  documents POST /wp-json/divi5-generator/v1/import and header X-D5G-Key
 *   D2  no stale X-Divi-Tools-Key / divi-tools/v1 import instructions remain
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

ok('D1: documents the divi5-generator import endpoint', /\/wp-json\/divi5-generator\/v1\/import/.test(src));
ok('D1: documents the X-D5G-Key header', /X-D5G-Key/.test(src));
ok('D2: no stale X-Divi-Tools-Key header reference', !/X-Divi-Tools-Key/.test(src), 'stale header present');
ok('D2: no stale divi-tools/v1 import route', !/divi-tools\/v1\/import/.test(src), 'stale route present');
ok('D3: setup docs require ?with_attrs=1', /\/presets\?with_attrs=1/.test(src));
ok('D4: links a site-profile reference', /site[-\s]?profile/i.test(src), 'no site-profile reference');

console.log(`\n── importer-docs results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
