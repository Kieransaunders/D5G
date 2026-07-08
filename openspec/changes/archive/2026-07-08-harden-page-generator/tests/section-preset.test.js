#!/usr/bin/env node
/**
 * section-preset.test.js — scenarios for "section-level presets are supported vocabulary"
 * (spec-first-generation).
 *
 * Run:  node scripts/__tests__/section-preset.test.js
 *   S1  a section preset compiles onto the section block (modulePreset present)
 *   S2  validate-spec accepts a string section.preset (no error)
 *   S3  validate-spec rejects a non-string section.preset  [drives 4.2 — RED until implemented]
 */
'use strict';

const path = require('path');

const SCRIPTS = path.resolve(__dirname, '..');
const { specToDivi } = require(path.join(SCRIPTS, 'spec', 'spec-to-divi.js'));
const { validateSpec } = require(path.join(SCRIPTS, 'spec', 'validate-spec.js'));

let pass = 0, fail = 0; const failures = [];
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

const withPreset = (p) => ({ slug: 't', sections: [{
  id: 'hero', layout: 'full', preset: p,
  modules: [{ kind: 'heroHeading', text: 'the hero headline', preset: 'H1 Hero' }],
}] });

// S1 — compiles onto the section
(function () {
  const { pageJson } = specToDivi(withPreset('Section — Hero'));
  const content = JSON.parse(pageJson).data['1'];
  const sectionBlock = content.match(/<!--\s*wp:divi\/section\s+(\{[\s\S]*?\})\s*-->/);
  ok('S1: a section block is emitted', !!sectionBlock);
  ok('S1: the section carries a modulePreset', !!sectionBlock && /"modulePreset":\["[a-z0-9]+"\]/i.test(sectionBlock[1]), sectionBlock && sectionBlock[1].slice(0, 120));
})();

// S2 — string preset accepted
(function () {
  const { errors } = validateSpec(withPreset('Section — Hero'));
  ok('S2: string section.preset -> no error', errors.length === 0, errors.join('; '));
})();

// S3 — non-string preset rejected (RED until validate-spec enforces it)
(function () {
  const { errors } = validateSpec(withPreset(42));
  const flagged = errors.some(e => /preset/i.test(e) && /hero|section/i.test(e));
  ok('S3: non-string section.preset -> error naming the section', flagged, errors.join('; ') || '(no errors returned)');
})();

console.log(`\n── section-preset results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
