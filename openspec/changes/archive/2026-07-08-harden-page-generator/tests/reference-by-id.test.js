#!/usr/bin/env node
/**
 * reference-by-id.test.js — scenarios for the reference-by-ID compile requirement
 * (preset-first-generation). The compiler references presets by ID and must NOT
 * inline the registry's raw hex/gcid onto blocks, so the token/gcid gates stay clean.
 *
 * Run:  node scripts/__tests__/reference-by-id.test.js
 *   R1  compiled blocks reference presets by ID and carry no inlined preset hex/gcid
 *   R2  a coherent compiled page raises no TOKEN / undefined-gcid FAIL
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'refid-'));
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

// A legible page: dark hero heading on white section + a section heading.
const spec = {
  slug: 't', sections: [
    { id: 'hero', layout: 'full', preset: 'Section — Hero',
      modules: [{ kind: 'heroHeading', text: 'the hero headline here', preset: 'H1 Hero' }] },
    { id: 'body', layout: 'full', preset: 'Section — White',
      modules: [{ kind: 'heading', level: 2, text: 'a section heading', preset: 'Section H2' }] },
  ],
};
const { pageJson } = specToDivi(spec);
const file = path.join(tmp, 'p.json');
fs.writeFileSync(file, pageJson);

// R1 — blocks reference by ID; the content string carries no inlined preset colours.
(function () {
  const doc = JSON.parse(pageJson);
  const content = doc.data['1'];
  ok('R1: heading blocks reference a modulePreset ID', /"modulePreset":\["[a-z0-9]+"\]/i.test(content));
  ok('R1: no inlined hex colour in block content', !/#[0-9a-fA-F]{6}/.test(content), 'found inlined hex');
  ok('R1: no inlined gcid- ref in block content', !/gcid-/.test(content), 'found inlined gcid');
})();

// R2 — token/gcid gates stay clean.
(function () {
  const r = spawnSync('node', [VALIDATE, file], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  ok('R2: no ET-token FAIL', !/FAIL\s+TOKEN/i.test(out), out.slice(-160));
  ok('R2: no undefined-gcid FAIL', !/gcid.*not defined|not defined in global_colors/i.test(out), out.slice(-160));
})();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n── reference-by-id results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
