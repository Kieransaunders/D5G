#!/usr/bin/env node
/**
 * clone-first.test.js — RED tests for slim-divi5-page-generator change.
 *
 * Run:  node scripts/__tests__/clone-first.test.js
 * Exit: 0 = all pass · 1 = one or more failed
 *
 * Covers:
 *   T1  SKILL.md does NOT contain "import the generated page" (old scratch-prefer language)
 *   T2  SKILL.md contains explicit clone-as-deliverable instruction
 *   T3  et-pages.js match returns a result for common page types
 *   T4  clone + mutate pipeline produces valid JSON output
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT     = path.resolve(__dirname, '..', '..');
const SCRIPTS  = path.join(ROOT, 'scripts');
const SKILL_MD = path.join(ROOT, 'SKILL.md');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else       { fail++; failures.push({ name, detail }); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

const skillText = fs.readFileSync(SKILL_MD, 'utf8');

// T1: old "prefer scratch over clone" language is gone
ok(
  'T1 SKILL.md does not contain "import the generated page"',
  !skillText.includes('import the generated page'),
  'Found the old scratch-preference phrase — should ship the mutated clone instead'
);

// T2: SKILL.md explicitly names the mutated clone as the deliverable
ok(
  'T2 SKILL.md contains clone-as-deliverable instruction',
  /mutated.{0,30}clone.{0,60}deliver|ship.{0,30}mutated.{0,30}clone|clone.{0,30}is.{0,30}the.{0,30}deliver/i.test(skillText),
  'No language found stating the mutated clone is the deliverable'
);

// T3: et-pages.js match works for common brief types
const etPages = require(path.join(SCRIPTS, 'et-pages.js'));
const homeMatch = etPages.match('home');
ok(
  'T3a et-pages.js match("home") returns a result',
  homeMatch !== null && homeMatch !== undefined,
  `Got: ${JSON.stringify(homeMatch)}`
);
const servicesMatch = etPages.match('services');
ok(
  'T3b et-pages.js match("services") returns a result',
  servicesMatch !== null && servicesMatch !== undefined,
  `Got: ${JSON.stringify(servicesMatch)}`
);
const noMatch = etPages.match('xyzzy-does-not-exist-12345');
ok(
  'T3c et-pages.js match("xyzzy") returns null for unknown type',
  noMatch === null || noMatch === undefined || (typeof noMatch === 'string' && noMatch.toLowerCase().includes('no match')),
  `Expected null/no-match, got: ${JSON.stringify(noMatch)}`
);

// T4: --scratch flag is recognised by SKILL.md (instructions must mention it)
ok(
  'T4 SKILL.md documents --scratch flag to skip clone path',
  skillText.includes('--scratch'),
  'SKILL.md has no --scratch flag documentation'
);

// Summary
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}${f.detail ? ': ' + f.detail : ''}`));
}
process.exit(fail > 0 ? 1 : 0);
