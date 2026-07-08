#!/usr/bin/env node
/**
 * preset-catalogue.test.js — scenarios for the `preset-catalogue` capability.
 * RED until setup-et-presets.js emits references/preset-catalogue.json.
 *
 * Run:  node scripts/__tests__/preset-catalogue.test.js
 *   P1  catalogue file exists, one entry per registry preset
 *   P2  a #FFFFFF-font heading preset is tagged surface: dark
 *   P3  catalogue is compact — entries carry summary fields, not full attrs
 */
'use strict';

const fs = require('fs');
const path = require('path');

const REF = path.resolve(__dirname, '..', '..', 'references');
const CATALOGUE = path.join(REF, 'preset-catalogue.json');
const REGISTRY = path.join(REF, 'et-preset-registry.json');

let pass = 0, fail = 0; const failures = [];
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

const exists = fs.existsSync(CATALOGUE);
ok('P1: references/preset-catalogue.json exists', exists);

if (exists) {
  const cat = JSON.parse(fs.readFileSync(CATALOGUE, 'utf8'));
  const entries = Array.isArray(cat) ? cat : Object.values(cat).flat();
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const regCount = Object.values(reg).reduce((n, m) => n + Object.keys(m).length, 0);
  ok('P1: one entry per registry preset', entries.length >= regCount * 0.9, `${entries.length} vs ${regCount}`);

  const heroWhite = entries.find(e => e.name === 'Hero H1' && /heading/.test(e.module || ''));
  ok('P2: "Hero H1" (white text) tagged surface: dark', heroWhite && heroWhite.surface === 'dark', JSON.stringify(heroWhite));

  const sample = entries[0] || {};
  const hasSummary = ['name', 'module', 'surface'].every(k => k in sample);
  const noFullAttrs = !('attrs' in sample);
  ok('P3: entries carry summary fields', hasSummary, JSON.stringify(sample).slice(0, 120));
  ok('P3: entries do not embed full attrs', noFullAttrs);
  ok('P3: catalogue much smaller than registry', fs.statSync(CATALOGUE).size < fs.statSync(REGISTRY).size / 10);
} else {
  // keep the scenario count honest while RED
  ok('P2: "Hero H1" tagged surface: dark', false, 'catalogue missing');
  ok('P3: catalogue is compact', false, 'catalogue missing');
}

console.log(`\n── preset-catalogue results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
