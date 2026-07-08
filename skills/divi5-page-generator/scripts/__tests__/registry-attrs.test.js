#!/usr/bin/env node
/**
 * registry-attrs.test.js — scenarios for "the preset registry carries preset attrs"
 * (preset-first-generation).
 *
 * Run:  node scripts/__tests__/registry-attrs.test.js
 *   A1  setup-et-presets.js fetches /presets with_attrs=1
 *   A2  registry entries for heading/section presets include an attrs object
 *   A3  registry consumers accept the {id,attrs} shape (validate-spec preset lookup)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const SCRIPTS = path.resolve(__dirname, '..');
const SETUP = path.join(SCRIPTS, 'setup-et-presets.js');
const REGISTRY = path.join(SCRIPTS, '..', 'references', 'et-preset-registry.json');

let pass = 0, fail = 0; const failures = [];
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

// A1 — setup fetches with attrs
(function () {
  const src = fs.readFileSync(SETUP, 'utf8');
  ok('A1: setup fetches /presets?with_attrs=1', /\/presets\?with_attrs=1/.test(src), 'flag missing');
})();

// A2 — registry entries carry attrs
(function () {
  const reg = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const H = reg['divi/heading'] || {};
  const entry = H['Hero H1'];
  ok('A2: "Hero H1" entry is an {id,attrs} object', !!(entry && typeof entry === 'object' && entry.id && entry.attrs), JSON.stringify(entry).slice(0, 80));
  const sec = (reg['divi/section'] || {})['Section — Hero'];
  ok('A2: "Section — Hero" entry carries attrs', !!(sec && sec.attrs), JSON.stringify(sec).slice(0, 80));
})();

// A3 — consumers accept both shapes (spec-to-divi resolves an object-shaped entry to an ID)
(function () {
  const { specToDivi } = require(path.join(SCRIPTS, 'spec', 'spec-to-divi.js'));
  const spec = { slug: 't', sections: [{ id: 'h', layout: 'full', preset: 'Section — Hero',
    modules: [{ kind: 'heroHeading', text: 'the hero headline', preset: 'H1 Hero' }] }] };
  let okCompile = true, note = '';
  try { specToDivi(spec); } catch (e) { okCompile = false; note = e.message.slice(0, 100); }
  ok('A3: object-shaped registry entries compile without error', okCompile, note);
})();

console.log(`\n── registry-attrs results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
