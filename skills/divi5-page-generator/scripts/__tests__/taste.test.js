#!/usr/bin/env node
/**
 * taste.test.js — One failing fixture per taste-check rule.
 *
 * Run:   node scripts/__tests__/taste.test.js
 * Exit:  0 = all pass · 1 = any fail
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TASTE = path.resolve(__dirname, '..', 'taste-check.js');

let passed = 0;
let failed = 0;

function ok(label, cond, detail) {
  if (cond) { console.log(`  PASS  ${label}`); passed++; }
  else       { console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); failed++; }
}

function run(doc) {
  const tmp = path.join(os.tmpdir(), `taste-test-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(doc));
  const r = spawnSync(process.execPath, [TASTE, tmp], { encoding: 'utf8' });
  fs.rmSync(tmp, { force: true });
  return { status: r.status, out: r.stdout + r.stderr };
}

// Minimal doc with one post_content string containing Divi blocks
function doc(content) {
  return { data: { 1: { post_content: content } } };
}

// Block comment helpers
const sec  = (inner) => `<!-- wp:divi/section -->${inner}<!-- /wp:divi/section -->`;
const row  = (inner) => `<!-- wp:divi/row -->${inner}<!-- /wp:divi/row -->`;
const col  = (inner) => `<!-- wp:divi/column -->${inner}<!-- /wp:divi/column -->`;
const heading = (level, text) =>
  `<!-- wp:divi/heading ${JSON.stringify({ content: { innerContent: { desktop: { value: text } } }, decoration: { font: { font: { desktop: { value: { headingLevel: level } } } } } })} /-->`;
const blurb = (body) =>
  `<!-- wp:divi/blurb ${JSON.stringify({ content: { innerContent: { desktop: { value: body } } } })} /-->`;
const eyebrow = (text) =>
  `<!-- wp:divi/eyebrow ${JSON.stringify({ content: { innerContent: { desktop: { value: text } } } })} /-->`;

// ─── TASTE-EM ────────────────────────────────────────────────────────────────
console.log('\n── TASTE-EM ──');
{
  const bad = doc(sec(row(col(heading('h1', 'Hello — World')))));
  const { status, out } = run(bad);
  ok('EM: em-dash in h1 exits 1', status === 1, 'exit=' + status);
  ok('EM: TASTE-EM in output', /TASTE-EM/i.test(out), out.slice(-200));
}

// ─── TASTE-AI-TELL ───────────────────────────────────────────────────────────
console.log('\n── TASTE-AI-TELL ──');
{
  const bad = doc(sec(row(col(heading('h1', 'Unlock Your Potential')))));
  const { status, out } = run(bad);
  ok('AI-TELL: buzzword in h1 exits 1', status === 1, 'exit=' + status);
  ok('AI-TELL: TASTE-AI-TELL in output', /TASTE-AI-TELL/i.test(out), out.slice(-200));
}

// ─── TASTE-H1-VERB ───────────────────────────────────────────────────────────
console.log('\n── TASTE-H1-VERB ──');
{
  const bad = doc(sec(row(col(heading('h1', 'Build Something Great')))));
  const { status, out } = run(bad);
  // This is a warning, not an error — exits 0 but warns
  ok('H1-VERB: verb h1 produces TASTE-H1-VERB warning', /TASTE-H1-VERB/i.test(out), out.slice(-200));
}

// ─── TASTE-3CARDS ────────────────────────────────────────────────────────────
console.log('\n── TASTE-3CARDS ──');
{
  // Three blurbs with identical body lengths
  const b = blurb('Same length body text here for all three cards.');
  const bad = doc(sec(row(col(b + b + b))));
  const { status, out } = run(bad);
  ok('3CARDS: equal blurbs produces TASTE-3CARDS warning', /TASTE-3CARDS/i.test(out), out.slice(-200));
}

// ─── TASTE-EYEBROW ───────────────────────────────────────────────────────────
console.log('\n── TASTE-EYEBROW ──');
{
  // 4 sections each with an eyebrow → exceeds ceil(4/3)=2
  const s = (eb) => sec(row(col(eyebrow(eb) + heading('h2', 'Section Title'))));
  const bad = doc(s('Services') + s('Process') + s('Pricing') + s('Contact'));
  const { status, out } = run(bad);
  ok('EYEBROW: 4 eyebrows in 4 sections produces TASTE-EYEBROW', /TASTE-EYEBROW/i.test(out), out.slice(-200));

  // 1 eyebrow in 4 sections → fine
  const good = doc(sec(row(col(eyebrow('Services') + heading('h1', 'Our Services')))) +
    sec(row(col(heading('h2', 'What we do')))) +
    sec(row(col(heading('h2', 'Our process')))) +
    sec(row(col(heading('h2', 'Contact us')))));
  const r2 = run(good);
  ok('EYEBROW: 1 eyebrow in 4 sections passes', !/TASTE-EYEBROW.*FAIL|FAIL.*TASTE-EYEBROW/i.test(r2.out), r2.out.slice(-200));
}

// ─── report ──────────────────────────────────────────────────────────────────

console.log(`\n── taste test results ──`);
console.log(`  ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
