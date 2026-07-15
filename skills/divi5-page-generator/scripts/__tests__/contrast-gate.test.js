#!/usr/bin/env node
/**
 * contrast-gate.test.js — scenarios for the `contrast-gate` capability.
 *
 * Run:  node scripts/__tests__/contrast-gate.test.js
 * Exit: 0 = all pass · 1 = any fail
 *
 * Uses the real on-disk registry (stable presets):
 *   Section — Hero = #FFFFFF bg · Hero H1 = #FFFFFF text · H1 Hero = #13110e text
 *   C1  white heading on white section -> CONTRAST FAIL + non-zero exit
 *   C2  dark heading on white section  -> no CONTRAST FAIL, pass line
 *   C3  colours come from the registry (bundle carries empty attrs) -> still FAIL
 *   C4  unresolvable colour             -> skipped, not failed
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..');
const VALIDATE = path.join(SCRIPTS, 'validate.js');
const { specToDivi } = require(path.join(SCRIPTS, 'spec', 'spec-to-divi.js'));

let pass = 0, fail = 0; const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'contrast-'));
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

function compile(spec) {
  const { pageJson } = specToDivi(spec);
  const f = path.join(tmp, `p-${pass + fail}.json`);
  fs.writeFileSync(f, pageJson);
  return f;
}
function validate(file) {
  const r = spawnSync('node', [VALIDATE, file], { encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
const heroSpec = (headingPreset, sectionPreset) => ({
  slug: 't', sections: [{
    id: 'hero', layout: 'full', ...(sectionPreset ? { preset: sectionPreset } : {}),
    modules: [{ kind: 'heroHeading', text: 'the hero headline here', preset: headingPreset }],
  }],
});
const CONTRAST_FAIL = /FAIL\s+CONTRAST/i;

// C1 — white on white fails
(function () {
  const r = validate(compile(heroSpec('Hero H1', 'Section — Hero')));
  ok('C1: white heading on white section -> CONTRAST FAIL', CONTRAST_FAIL.test(r.out), r.out.slice(-160));
  ok('C1: process exits non-zero', r.status !== 0, `status ${r.status}`);
})();

// C2 — dark on white passes
(function () {
  const r = validate(compile(heroSpec('H1 Hero', 'Section — Hero')));
  ok('C2: dark heading on white section -> no CONTRAST FAIL', !CONTRAST_FAIL.test(r.out), r.out.slice(-160));
  ok('C2: a CONTRAST pass line is printed', /PASS\s+CONTRAST/i.test(r.out), r.out.slice(-160));
})();

// C3 — colours resolved from the registry (compiled bundle has empty preset attrs)
(function () {
  const file = compile(heroSpec('Hero H1', 'Section — Hero'));
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const items = doc.presets.module['divi/heading'].items;
  const anyAttrs = Object.values(items).some(i => i.attrs && Object.keys(i.attrs).length);
  ok('C3: bundle carries empty preset attrs (colours live in registry)', !anyAttrs, 'bundle had inlined attrs');
  ok('C3: FAIL still raised via registry resolution', CONTRAST_FAIL.test(validate(file).out));
})();

// C4 — unresolvable colours are skipped, not failed
(function () {
  // Heading preset "Heading 1" has no hex colour; no section preset -> bg unresolved.
  const r = validate(compile(heroSpec('Heading 1', null)));
  ok('C4: unresolvable colour is not a CONTRAST FAIL', !CONTRAST_FAIL.test(r.out), r.out.slice(-160));
})();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n── contrast-gate results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
