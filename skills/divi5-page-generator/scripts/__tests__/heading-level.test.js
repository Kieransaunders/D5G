#!/usr/bin/env node
/**
 * heading-level.test.js — RED proof for the require-heading-level change.
 *
 * Run:    node scripts/__tests__/heading-level.test.js
 * Exit:   0 = all pass · 1 = any fail
 *
 * Covers the silent-h2-default foot-gun in the builder:
 *   T1  heading() without an explicit level throws (no silent h2)
 *   T2  heading({level:'h2'}) still emits h2 (regression guard, stays green)
 *   T3  heroHeading() exists and emits h1
 *   T4  heroHeading() forces h1 even when a different level is passed
 *   T5  headingPresets() stores an explicit headingLevel on the h2 group preset
 *       (previously omitted, so a heading using the h2 group preset rendered as
 *       Divi's default level with no explicit h2 marker)
 *
 * No WordPress, no validator — pure builder unit tests.
 */

'use strict';

const path = require('path');
const D    = require(path.join(__dirname, '..', 'divi-builder.js'));

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, detail) {
  if (cond) { pass++; }
  else { fail++; failures.push(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

// ─── T1: heading() without level throws ──────────────────────────────────────

(function t1() {
  let threw = false, msg = '';
  try { D.heading({ text: 'No level given' }); }
  catch (e) { threw = true; msg = e.message; }
  ok('T1: heading() without level throws', threw, 'did not throw');
  ok('T1: error mentions level', /level/i.test(msg), msg);
})();

// ─── T2: heading({level:'h2'}) still emits h2 (regression guard) ─────────────

(function t2() {
  let blk = '', crashed = false;
  try { blk = D.heading({ text: 'Subhead', level: 'h2' }); }
  catch (e) { crashed = true; }
  ok('T2: explicit level h2 still works and emits h2',
    !crashed && /"headingLevel":"h2"/.test(blk),
    crashed ? 'threw' : 'no headingLevel:h2 in block');
})();

// ─── T3: heroHeading() exists and emits h1 ───────────────────────────────────

(function t3() {
  const exists = typeof D.heroHeading === 'function';
  let emits = false, sample = '';
  if (exists) { sample = D.heroHeading({ text: 'Hero' }); emits = /"headingLevel":"h1"/.test(sample); }
  ok('T3: heroHeading exists and emits h1', exists && emits,
    exists ? 'no headingLevel:h1 in block' : 'heroHeading is not defined');
})();

// ─── T4: heroHeading() forces h1 even when level:'h2' is passed ──────────────

(function t4() {
  const exists = typeof D.heroHeading === 'function';
  let emitsH1 = false, sample = '';
  if (exists) { sample = D.heroHeading({ text: 'Hero', level: 'h2' }); emitsH1 = /"headingLevel":"h1"/.test(sample); }
  ok('T4: heroHeading forces h1 (ignores passed level)', exists && emitsH1,
    exists ? 'did not force h1' : 'heroHeading is not defined');
})();

// ─── T5: headingPresets() h2 group preset carries an explicit headingLevel ───

(function t5() {
  let h2level, crashed = false;
  try {
    const b = D.createBuilder();
    const headings = b.headingPresets();
    h2level = headings.h2.attrs.title.decoration.font.font.desktop.value.headingLevel;
  } catch (e) { crashed = true; }
  ok('T5: h2 group preset carries explicit headingLevel:"h2"',
    !crashed && h2level === 'h2',
    crashed ? 'threw' : `got ${h2level}`);
})();

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('\n── heading-level test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
