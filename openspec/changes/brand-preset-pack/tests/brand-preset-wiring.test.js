#!/usr/bin/env node
/**
 * brand-preset-wiring.test.js — RED proof for the Stage 0.5 wiring slice of
 * brand-preset-pack.
 *
 * Run:  node scripts/__tests__/brand-preset-wiring.test.js
 * Exit: 0 = all pass · 1 = any fail
 *
 * Closes the loop: the brand pack from buildBrandPresets must be usable AS the preset
 * library (replacing the ET registry), resolvable by the brand presets' STABLE NAMES —
 * the contract that survives the import ID-remap boundary.
 *   W1  brandPresetLibrary(pack) loads via loadPresetRegistry({withAttrs:true}) and
 *       presetRef() resolves all three brand presets to {id, attrs} without throwing
 *   W2  the resolved button preset carries the brand accent hex (it's the brand preset,
 *       not an ET default)
 *   W3  SKILL.md Stage 0.5 documents the brand-pack-as-preset-library wiring, by stable name
 */
'use strict';

const path = require('path');
const fs = require('fs');
const SKILL_DIR = path.join(__dirname, '..', '..');

let B = null, D = null;
try { B = require(path.join(SKILL_DIR, 'scripts', 'build-brand-presets.js')); } catch (e) { B = null; }
try { D = require(path.join(SKILL_DIR, 'scripts', 'divi-builder.js')); } catch (e) { D = null; }

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

// ── W1 + W2: pack is a usable preset library, resolved by stable name ──────────
let resolved = null, threw = null;
if (B && D && typeof B.brandPresetLibrary === 'function') {
  try {
    const pack = B.buildBrandPresets(VARIABLES, ROLES);
    const lib = B.brandPresetLibrary(pack);
    const b = D.createBuilder({});
    b.loadPresetRegistry(lib, { withAttrs: true });
    resolved = {
      h1: b.presetRef('divi/heading', 'Brand H1'),
      btn: b.presetRef('divi/button', 'Brand Button Primary'),
      sec: b.presetRef('divi/section', 'Brand Section Light'),
    };
  } catch (e) { threw = e.message; }
}

const hasIdAttrs = r => !!(r && r.id && r.attrs);
ok('W1: brandPresetLibrary resolves Brand H1 / Button Primary / Section Light by name',
  !!resolved && hasIdAttrs(resolved.h1) && hasIdAttrs(resolved.btn) && hasIdAttrs(resolved.sec),
  B && typeof B.brandPresetLibrary === 'function' ? (threw || 'a preset did not resolve to {id, attrs}') : 'brandPresetLibrary not exported');

ok('W2: resolved button preset carries the brand accent hex #c9715a',
  !!resolved && JSON.stringify(resolved.btn.attrs || {}).toLowerCase().includes('c9715a'),
  'accent hex not present in resolved button attrs');

// ── W3: SKILL.md Stage 0.5 documents the wiring ───────────────────────────────
let skill = '';
try { skill = fs.readFileSync(path.join(SKILL_DIR, 'SKILL.md'), 'utf8'); } catch (e) { skill = ''; }
const stage05 = (skill.split(/^###\s+Stage\s+0\.5/m)[1] || '').split(/^###\s+Stage\s+1/m)[0];
ok('W3: Stage 0.5 references build-brand-presets and the three stable brand preset names',
  /build-brand-presets/.test(stage05) &&
  /Brand H1/.test(stage05) && /Brand Button Primary/.test(stage05) && /Brand Section Light/.test(stage05),
  'Stage 0.5 does not wire in the brand pack by name');

console.log('\n── brand-preset-wiring test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
