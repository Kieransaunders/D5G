#!/usr/bin/env node
/**
 * preset-first.test.js — RED proof for the preset-first-default change.
 *
 * Run:    node scripts/__tests__/preset-first.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Asserts the divi5-page-generator SKILL.md makes preset-first the DEFAULT Page-mode
 * style path (load a registry, build via presetRef()), with builder.preset() demoted to
 * override-only. Mirrors the slim-skill prose-assertion style.
 *   T1  default workflow loads a preset registry (loadPresetRegistry) outside Overdrive
 *   T2  the reused-style rule names presetRef() as the default
 *   T3  SKILL.md describes a preset library / preset-first as the default style source
 *   T4  SKILL.md stays <= 150 lines (regression guard, stays green)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const SKILL = path.join(__dirname, '..', '..', 'SKILL.md');
let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; } else { fail++; failures.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

const skill = fs.existsSync(SKILL) ? fs.readFileSync(SKILL, 'utf8') : '';
const lines = skill.split('\n').length;

ok('T1: default workflow loads a preset registry (loadPresetRegistry)', /loadPresetRegistry/.test(skill), 'no loadPresetRegistry reference');
ok('T2: reused-style rule names presetRef() as the default', /presetRef/.test(skill), 'no presetRef reference');
ok('T3: SKILL.md describes a preset library / preset-first default', /preset[- ]first|preset library/i.test(skill), 'no preset-first/library language');
ok('T4: SKILL.md stays <= 150 lines', lines <= 150, `got ${lines}`);

console.log('\n── preset-first test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
