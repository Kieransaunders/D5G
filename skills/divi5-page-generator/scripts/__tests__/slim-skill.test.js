#!/usr/bin/env node
/**
 * slim-skill.test.js — RED tests for slim-divi5-page-generator change.
 *
 * Run:  node scripts/__tests__/slim-skill.test.js
 * Exit: 0 = all pass · 1 = one or more failed
 *
 * Covers:
 *   T1  SKILL.md is ≤ 150 lines
 *   T2  Default mode reads ≤ 1 reference file before the first Stage heading
 *   T3  VARIANCE / MOTION / DENSITY dials absent from default (non-overdrive) instructions
 *   T4  bolder.md and delight.md absent from default instructions
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..', '..');
const SKILL_MD = path.join(ROOT, 'SKILL.md');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else       { fail++; failures.push({ name, detail }); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

const skillText = fs.readFileSync(SKILL_MD, 'utf8');
const skillLines = skillText.split('\n');

// T1: line count ≤ 150
ok(
  'T1 SKILL.md is ≤ 150 lines',
  skillLines.length <= 150,
  `Currently ${skillLines.length} lines — target ≤ 150`
);

// T2: at most 1 reference path before the first "## Stage" / "### Stage" heading
const firstStageIdx = skillLines.findIndex(l => /^#{2,3}\s+Stage\s+[0-9]/i.test(l));
const preStageText  = firstStageIdx === -1 ? skillText : skillLines.slice(0, firstStageIdx).join('\n');
const refMatches    = (preStageText.match(/references\//g) || []).length;
ok(
  'T2 Default mode references at most 1 file before Stage 1',
  refMatches <= 1,
  `Found ${refMatches} references/ paths before first Stage heading — target ≤ 1`
);

// T3: VARIANCE / MOTION / DENSITY absent outside overdrive section
// Isolate the overdrive section so we don't penalise it for mentioning the dials
const overdriveStart = skillText.indexOf('## Overdrive');
const defaultSection = overdriveStart > -1
  ? skillText.slice(0, overdriveStart)
  : skillText;

const dials = ['VARIANCE', 'MOTION', 'DENSITY'];
dials.forEach(dial => {
  ok(
    `T3 "${dial}" dial absent from default (non-overdrive) instructions`,
    !defaultSection.includes(dial),
    `"${dial}" found in default mode section — should be overdrive-only`
  );
});

// T4: bolder.md and delight.md absent outside overdrive section
['bolder.md', 'delight.md'].forEach(ref => {
  ok(
    `T4 "${ref}" absent from default instructions`,
    !defaultSection.includes(ref),
    `"${ref}" found in default mode — should be overdrive-only`
  );
});

// Summary
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}${f.detail ? ': ' + f.detail : ''}`));
}
process.exit(fail > 0 ? 1 : 0);
