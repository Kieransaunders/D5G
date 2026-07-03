#!/usr/bin/env node
/**
 * spec-first-generation.test.js — RED tests for the spec-first-generation change.
 *
 * Run:  node scripts/__tests__/spec-first-generation.test.js
 * Exit: 0 = all pass · 1 = one or more failed
 *
 * One test per scenario in
 * openspec/changes/spec-first-generation/specs/spec-first-generation/spec.md:
 *
 *   T1  valid spec → validateSpec returns no errors, no warnings
 *   T2  unsupported layout "split-13-11" → error naming section + layout
 *   T3  unknown module kind "carousel" → error naming the kind
 *   T4  raw module kind → zero errors, ≥1 warning identifying the raw module
 *   T5  specToHtml: copy + headings compile; exactly one h1; h2 for section heading
 *   T6  specToHtml: theatre annotated as visible text; no <script>; no @keyframes
 *   T7  specToDivi: page JSON passes scripts/validate.js --keyword
 *   T8  specToDivi: preset reference resolves via registry (name or ID), no inline mint
 *   T9  fidelity-check.js passes on the (page.json, preview.html) pair from one spec
 *   T10 SKILL.md documents spec-first scratch workflow + clone/mutate JSON-native guard
 */

'use strict';

const fs   = require('fs');
const os   = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT    = path.resolve(__dirname, '..', '..');
const SCRIPTS = path.join(ROOT, 'scripts');
const SPEC_DIR = path.join(SCRIPTS, 'spec');

let pass = 0, fail = 0;
const failures = [];

function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else      { fail++; failures.push({ name, detail }); console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}

function tryRequire(rel) {
  const p = path.join(SPEC_DIR, rel);
  if (!fs.existsSync(p)) return { mod: null, missing: `scripts/spec/${rel} does not exist` };
  try { return { mod: require(p), missing: null }; }
  catch (e) { return { mod: null, missing: `scripts/spec/${rel} failed to load: ${e.message}` }; }
}

// ---------------------------------------------------------------------------
// Fixture spec — uses only vocabulary the schema must support.
// ---------------------------------------------------------------------------
const PRIMARY_KW = 'artisan bakery reading';

function validSpec() {
  return {
    slug: 'spec-first-fixture',
    aesthetic: 'minimal-editorial',
    dials: { variance: 7, motion: 4, density: 4 },
    seo: { primary: PRIMARY_KW },
    sections: [
      {
        id: 'hero',
        type: 'hero',
        layout: 'split-14-10',
        theatre: 'hero-reveal',
        modules: [
          { kind: 'heroHeading', text: 'Artisan Bakery Reading - Real Bread, Baked Daily' },
          { kind: 'text', text: 'Small-batch sourdough and pastries from our Reading bakehouse, delivered across Berkshire.' },
          { kind: 'button', preset: 'Button — Primary', text: 'Order fresh bread', href: '/order' },
        ],
      },
      {
        id: 'why-us',
        type: 'features',
        layout: 'full',
        modules: [
          { kind: 'heading', level: 2, text: 'Why our artisan bakery is different' },
          { kind: 'text', text: 'Stone-milled flour, a 48-hour ferment, and a wood-fired oven.' },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// R1 — validate-spec
// ---------------------------------------------------------------------------
const vs = tryRequire('validate-spec.js');
const validateSpec = vs.mod && (vs.mod.validateSpec || vs.mod);

// T1 valid spec passes
if (typeof validateSpec !== 'function') {
  ok('T1 valid spec → no errors, no warnings', false, vs.missing || 'validateSpec not exported');
} else {
  const r = validateSpec(validSpec());
  ok('T1 valid spec → no errors, no warnings',
    r && Array.isArray(r.errors) && r.errors.length === 0 && Array.isArray(r.warnings) && r.warnings.length === 0,
    r ? `errors=${JSON.stringify(r.errors)} warnings=${JSON.stringify(r.warnings)}` : 'no result object');
}

// T2 unsupported layout
if (typeof validateSpec !== 'function') {
  ok('T2 unsupported layout split-13-11 → error names section + layout', false, vs.missing || 'validateSpec not exported');
} else {
  const s = validSpec();
  s.sections[0].layout = 'split-13-11';
  const r = validateSpec(s);
  const hit = r && r.errors && r.errors.some(e => String(e).includes('split-13-11') && String(e).includes('hero'));
  ok('T2 unsupported layout split-13-11 → error names section + layout', !!hit,
    r ? `errors=${JSON.stringify(r.errors)}` : 'no result object');
}

// T3 unknown module kind
if (typeof validateSpec !== 'function') {
  ok('T3 unknown kind carousel → error names the kind', false, vs.missing || 'validateSpec not exported');
} else {
  const s = validSpec();
  s.sections[1].modules.push({ kind: 'carousel', items: [] });
  const r = validateSpec(s);
  const hit = r && r.errors && r.errors.some(e => String(e).includes('carousel'));
  ok('T3 unknown kind carousel → error names the kind', !!hit,
    r ? `errors=${JSON.stringify(r.errors)}` : 'no result object');
}

// T4 raw escape hatch warns
if (typeof validateSpec !== 'function') {
  ok('T4 raw module → zero errors, warning identifies it', false, vs.missing || 'validateSpec not exported');
} else {
  const s = validSpec();
  s.sections[1].modules.push({ kind: 'raw', builder: 'codeBlock', args: { content: '<table><tr><td>1</td></tr></table>' } });
  const r = validateSpec(s);
  const warned = r && r.warnings && r.warnings.some(w => /raw/i.test(String(w)));
  ok('T4 raw module → zero errors, warning identifies it',
    r && r.errors && r.errors.length === 0 && warned,
    r ? `errors=${JSON.stringify(r.errors)} warnings=${JSON.stringify(r.warnings)}` : 'no result object');
}

// ---------------------------------------------------------------------------
// R2 — spec-to-html
// ---------------------------------------------------------------------------
const sh = tryRequire('spec-to-html.js');
const specToHtml = sh.mod && (sh.mod.specToHtml || sh.mod);
let html = null;
if (typeof specToHtml === 'function') {
  try { html = specToHtml(validSpec()); } catch (e) { html = null; sh.missing = `specToHtml threw: ${e.message}`; }
}

// T5 structure and copy
if (typeof html !== 'string') {
  ok('T5 specToHtml compiles copy + headings, exactly one h1', false, sh.missing || 'specToHtml did not return a string');
} else {
  const h1Count = (html.match(/<h1[\s>]/g) || []).length;
  const heroInH1 = /<h1[^>]*>[^<]*Artisan Bakery Reading/.test(html);
  const h2Hit = /<h2[^>]*>[^<]*Why our artisan bakery is different/.test(html);
  const copyHit = html.includes('Small-batch sourdough');
  ok('T5 specToHtml compiles copy + headings, exactly one h1',
    h1Count === 1 && heroInH1 && h2Hit && copyHit,
    `h1Count=${h1Count} heroInH1=${heroInH1} h2=${h2Hit} copy=${copyHit}`);
}

// T6 motion annotated, not simulated
if (typeof html !== 'string') {
  ok('T6 theatre annotated as text; no <script>; no @keyframes', false, sh.missing || 'specToHtml did not return a string');
} else {
  const annotated = html.includes('hero-reveal');
  const noScript = !/<script[\s>]/i.test(html);
  const noKeyframes = !html.includes('@keyframes');
  ok('T6 theatre annotated as text; no <script>; no @keyframes',
    annotated && noScript && noKeyframes,
    `annotated=${annotated} noScript=${noScript} noKeyframes=${noKeyframes}`);
}

// ---------------------------------------------------------------------------
// R3 — spec-to-divi
// ---------------------------------------------------------------------------
const sd = tryRequire('spec-to-divi.js');
const specToDivi = sd.mod && (sd.mod.specToDivi || sd.mod);
let divi = null;
if (typeof specToDivi === 'function') {
  try { divi = specToDivi(validSpec()); } catch (e) { divi = null; sd.missing = `specToDivi threw: ${e.message}`; }
}

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spec-first-test-'));
let pageJsonPath = null;

// T7 compiled JSON passes validate.js
if (!divi || (!divi.pageJson && typeof divi !== 'string')) {
  ok('T7 compiled page JSON passes validate.js', false, sd.missing || 'specToDivi returned no pageJson');
} else {
  const payload = typeof divi === 'string' ? divi : (typeof divi.pageJson === 'string' ? divi.pageJson : JSON.stringify(divi.pageJson));
  pageJsonPath = path.join(tmpDir, 'spec-first-fixture-landing-page.json');
  fs.writeFileSync(pageJsonPath, payload);
  let exitOk = false, out = '';
  try {
    out = execFileSync('node', [path.join(SCRIPTS, 'validate.js'), pageJsonPath, '--keyword', PRIMARY_KW], { encoding: 'utf8' });
    exitOk = true;
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  ok('T7 compiled page JSON passes validate.js', exitOk, out.split('\n').filter(l => /FAIL/i.test(l)).slice(0, 5).join(' | ') || 'validate.js exited non-zero');
}

// T8 preset resolves via registry
if (!divi) {
  ok('T8 preset reference resolves via registry (name or ID)', false, sd.missing || 'specToDivi returned nothing');
} else {
  const payload = typeof divi === 'string' ? divi : JSON.stringify(divi);
  let registryId = null;
  try {
    const reg = require(path.join(ROOT, 'references', 'et-preset-registry.json'));
    registryId = reg['divi/button'] && reg['divi/button']['Button — Primary'];
  } catch (_) { /* registry optional for the assertion below */ }
  const byName = payload.includes('Button — Primary');
  const byId = registryId ? payload.includes(registryId) : false;
  ok('T8 preset reference resolves via registry (name or ID)', byName || byId,
    `payload references neither name "Button — Primary" nor registry id ${registryId || '(unresolved)'}`);
}

// ---------------------------------------------------------------------------
// R4 — fidelity by construction
// ---------------------------------------------------------------------------
if (typeof html !== 'string' || !pageJsonPath) {
  ok('T9 fidelity-check.js passes on the compiled pair', false,
    typeof html !== 'string' ? (sh.missing || 'no compiled HTML') : (sd.missing || 'no compiled page JSON'));
} else {
  const htmlPath = path.join(tmpDir, 'preview-spec-first-fixture.html');
  fs.writeFileSync(htmlPath, html);
  let exitOk = false, out = '';
  try {
    out = execFileSync('node', [path.join(SCRIPTS, 'fidelity-check.js'), pageJsonPath, htmlPath], { encoding: 'utf8' });
    exitOk = true;
  } catch (e) { out = (e.stdout || '') + (e.stderr || ''); }
  ok('T9 fidelity-check.js passes on the compiled pair', exitOk,
    out.split('\n').filter(l => /FAIL/i.test(l)).slice(0, 5).join(' | ') || 'fidelity-check exited non-zero');
}

// ---------------------------------------------------------------------------
// R5 — SKILL.md workflow documentation
// ---------------------------------------------------------------------------
const skillText = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');
const specFirstDocumented = /page-spec\.json/.test(skillText);
const cloneGuard = /clone.{0,80}(JSON-native|json-native)|mutate.{0,80}(JSON-native|json-native)/is.test(skillText);
ok('T10 SKILL.md documents spec-first scratch workflow + clone/mutate JSON-native guard',
  specFirstDocumented && cloneGuard,
  `page-spec.json mentioned=${specFirstDocumented} cloneGuard=${cloneGuard}`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${pass} passed, ${fail} failed`);
if (failures.length) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  • ${f.name}${f.detail ? ': ' + f.detail : ''}`));
}
process.exit(fail > 0 ? 1 : 0);
