#!/usr/bin/env node
/**
 * seo-keyword-relax.test.js — RED tests for seo-post-pass capability.
 *
 * Run:  node scripts/__tests__/seo-keyword-relax.test.js
 * Exit: 0 = all pass · 1 = one or more failed
 *
 * Covers:
 *   T1  keyword in first text module body copy → passes (no FAIL)
 *   T2  keyword in an h2 heading → passes (no FAIL)
 *   T3  keyword absent from h1, h2, and text → FAIL
 *   T4  SKILL.md has no keyword-placement requirement before Stage 3
 */

'use strict';

const fs            = require('fs');
const path          = require('path');
const { spawnSync } = require('child_process');
const os            = require('os');

const ROOT      = path.resolve(__dirname, '..', '..');
const SCRIPTS   = path.join(ROOT, 'scripts');
const SKILL_MD  = path.join(ROOT, 'SKILL.md');
const VALIDATE  = path.join(SCRIPTS, 'validate.js');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else       { fail++; failures.push({ name, detail }); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

// Minimal valid-looking page JSON with keyword in opening text only (not h1)
function pageWithKeywordIn(location, keyword) {
  const h1   = location === 'h1'   ? keyword : 'Welcome to Our Site';
  const text = location === 'text' ? `We provide ${keyword} for you.` : 'Generic body copy here.';
  const h2   = location === 'h2'   ? keyword : 'Our Services';
  // Minimal Divi JSON shape the validator can parse
  return JSON.stringify({
    data: {
      'post-1': {
        post_title:   'Test Page',
        post_content: `[et_pb_section][et_pb_row][et_pb_column][et_pb_text]<h1>${h1}</h1>[/et_pb_text][et_pb_text]<p>${text}</p>[/et_pb_text][et_pb_text]<h2>${h2}</h2>[/et_pb_text][/et_pb_column][/et_pb_row][/et_pb_section]`,
        post_status: 'publish',
        post_type:   'page',
      }
    }
  });
}

function runValidate(jsonStr, keyword) {
  const jf = path.join(os.tmpdir(), `seo-test-${Date.now()}.json`);
  fs.writeFileSync(jf, jsonStr);
  return spawnSync('node', [VALIDATE, jf, '--keyword', keyword], { encoding: 'utf8' });
}

const KW = 'IT support London';

// T1: keyword in opening text passes
const r1 = runValidate(pageWithKeywordIn('text', KW), KW);
const hasKeywordFail1 = (r1.stdout + r1.stderr).match(/FAIL.*keyword/i);
ok('T1 keyword in opening text → no keyword FAIL', !hasKeywordFail1, `Got: ${r1.stdout.slice(0, 200)}`);

// T2: keyword in h2 passes
const r2 = runValidate(pageWithKeywordIn('h2', KW), KW);
const hasKeywordFail2 = (r2.stdout + r2.stderr).match(/FAIL.*keyword/i);
ok('T2 keyword in h2 → no keyword FAIL', !hasKeywordFail2, `Got: ${r2.stdout.slice(0, 200)}`);

// T3: keyword absent everywhere → FAIL
const r3 = runValidate(pageWithKeywordIn('nowhere', KW), KW);
const hasKeywordFail3 = (r3.stdout + r3.stderr).match(/FAIL.*keyword/i);
ok('T3 keyword absent → keyword FAIL present', !!hasKeywordFail3, `Output: ${r3.stdout.slice(0, 200)}`);

// T4: SKILL.md has no keyword design constraint before Stage 3
const skill = fs.readFileSync(SKILL_MD, 'utf8');
// Find where the first "Stage 3" appears
const stage3Idx = skill.search(/###?\s+Stage\s+3\b/i);
const preStage3 = stage3Idx > -1 ? skill.slice(0, stage3Idx) : skill;
// "keyword" as a design constraint (not just mentioning it)
const kwDesignMatch = preStage3.match(/keyword.{0,40}(placement|in the h1|must appear|required)/i);
ok(
  'T4 SKILL.md has no keyword-placement constraint before Stage 3',
  !kwDesignMatch,
  kwDesignMatch ? `Found: "${kwDesignMatch[0]}"` : ''
);

// Summary
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}${f.detail ? ': ' + f.detail : ''}`));
}
process.exit(fail > 0 ? 1 : 0);
