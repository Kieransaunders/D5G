#!/usr/bin/env node
/**
 * brand-presets.test.js — RED proof for the brand-preset-pack change.
 *
 * Run:    node scripts/__tests__/brand-presets.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Drives scripts/build-brand-presets.js: given feature-A variables (global_colors) + a
 * role map, produce a preset pack that references the brand colours via $variable() and
 * uses the brand fonts/sizes.
 *   T1  result has presets.module entries for divi/heading, divi/button, divi/section
 *   T2  a button preset references a colour via $variable(...) and the accent gcid
 *   T3  a heading preset uses the brand heading font family
 *   T4  a button preset carries enable:"on"
 */
'use strict';

const path = require('path');
let B = null;
try { B = require(path.join(__dirname, '..', 'build-brand-presets.js')); } catch (e) { B = null; }

let pass = 0, fail = 0;
const failures = [];
function ok(n, c, d) { if (c) { pass++; } else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

const VARIABLES = {
  global_colors: [
    ['gcid-accent', { color: '#c9715a', status: 'active', label: 'Accent' }],
    ['gcid-light', { color: '#fdf7f2', status: 'active', label: 'Light' }],
    ['gcid-dark', { color: '#2a2420', status: 'active', label: 'Dark' }],
  ],
  global_variables: [],
};
const ROLES = { accentGcid: 'gcid-accent', lightGcid: 'gcid-light', darkGcid: 'gcid-dark', headingFont: 'Plus Jakarta Sans', h1Size: '56px', buttonRadius: '999px' };

const o = B ? B.buildBrandPresets(VARIABLES, ROLES) : null;
const hasModule = m => !!(o && o.presets && o.presets.module && o.presets.module[m]);
const itemsOf = m => {
  if (!(o && o.presets && o.presets.module && o.presets.module[m] && o.presets.module[m].items)) return [];
  return Object.values(o.presets.module[m].items);
};
const presetHas = (m, sub) => itemsOf(m).some(it => JSON.stringify(it).includes(sub));

ok('T1: presets.module has divi/heading + divi/button + divi/section',
  hasModule('divi/heading') && hasModule('divi/button') && hasModule('divi/section'),
  o ? 'missing module keys' : 'build-brand-presets.js missing');
ok('T2: button preset references a colour via $variable (its text colour; bg is raw hex per Divi preset rule)',
  !!o && presetHas('divi/button', '$variable('),
  'no $variable color ref in button preset');
ok('T3: heading preset uses the brand heading font',
  !!o && presetHas('divi/heading', ROLES.headingFont), 'heading font not found in preset');
ok('T4: button preset carries enable:"on"',
  !!o && presetHas('divi/button', '"enable":"on"'), 'no enable:on in button preset');

console.log('\n── brand-presets test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
