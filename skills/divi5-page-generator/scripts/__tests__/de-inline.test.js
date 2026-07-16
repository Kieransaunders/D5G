#!/usr/bin/env node
'use strict';

/**
 * de-inline.test.js — Pro-gating relocation: page builds emit UNRESOLVED, sections
 * stay inline.
 *
 * Run:   node scripts/__tests__/de-inline.test.js
 * Exit:  0 = all pass · 1 = any fail
 *
 * Builds a real page and a real section through divi-builder.js (into an OS tmp dir)
 * and asserts:
 *   PAGE (context:'et_builder', default):
 *     - top-level presets / global_colors / global_variables are OMITTED
 *     - blocks keep their modulePreset/groupPreset pointers
 *     - preset-derived inline style attrs are stripped (button enable:'on', bg colour)
 *     - structural attrs survive (heading headingLevel → the <h1>, innerContent)
 *     - a block-level override survives (a colour that differs from the preset)
 *     - the three sidecars are written next to the page: <slug>.presets.json,
 *       <slug>.variables.json, <slug>.brand.json — with the shapes the validator
 *       and the Pro importer consume
 *     - the emitted page passes validate.js in PRESET-FIRST mode with 0 errors
 *   PAGE (externalizeBrand:false):
 *     - old self-contained shape: presets bundled, nothing stripped, no sidecars
 *   SECTION (context:'et_builder_layouts'):
 *     - unchanged: presets bundled, inline preset attrs (bg, button enable) present
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

process.env.DIVI5_SKIP_TASTE_GATE = '1';

const SCRIPTS = path.resolve(__dirname, '..');
const VALIDATE = path.join(SCRIPTS, 'validate.js');
const D = require(path.join(SCRIPTS, 'divi-builder.js'));
const DE = require(path.join(SCRIPTS, 'de-inline.js'));

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; failures.push(`  FAIL  ${name} — ${e.message}`); }
}

/** Parse a named block's attrs back out of a page content string. */
function blockAttrs(contentStr, name) {
  const re = new RegExp(`<!-- wp:divi\\/${name} `, 'g');
  const m = re.exec(contentStr);
  if (!m) return null;
  const [json] = DE.readJson(contentStr, m.index + m[0].length);
  return JSON.parse(json);
}

// ── builders ──────────────────────────────────────────────────────────────────
function buildPage(outDir) {
  const b = D.createBuilder();
  const WHITE = b.globalColor('white', '#ffffff', 'White');
  const ACCENT = b.globalColor('accent', '#c9715a', 'Accent');
  const INK = b.globalColor('ink', '#2a2420', 'Ink');
  const secCream = b.preset('divi/section', 'Section Cream',
    { module: { decoration: { background: D.dv({ color: '#fdf7f2' }) } } });
  const heroH1 = b.headingPreset('Hero H1', { level: 'h1', family: 'DM Serif Display', size: '62px', weight: '400', color: INK });
  const body = b.preset('divi/text', 'Body',
    { content: { decoration: { bodyFont: { body: { font: D.dv({ family: 'DM Sans', size: '17px', color: '#7d6e67' }) } } } } });
  const btn = b.buttonPreset('Primary', { bg: ACCENT, color: WHITE, radius: '999px', fontSize: '16px' });
  const content = D.placeholder([
    D.section({ adminLabel: 'Hero', preset: secCream }, [
      D.row({ structure: 'equal-columns_1', maxWidth: '900px' }, [
        D.column({}, [
          D.heading({ text: 'De-inline test page', level: 'h1', preset: heroH1 }),
          D.text({ html: '<p>Inherited body copy.</p>', preset: body }),
          D.text({ html: '<p>Overridden copy.</p>', preset: body, font: { color: '#ff0000' } }),
          D.button({ text: 'Get Started', url: '#', preset: btn }),
        ]),
      ]),
    ]),
  ]);
  return b.assemble({ context: 'et_builder', content, title: 'De-inline Test', slug: 'deinline-test', outDir });
}

function buildPageInline() {
  const b = D.createBuilder();
  const secCream = b.preset('divi/section', 'Section Cream',
    { module: { decoration: { background: D.dv({ color: '#fdf7f2' }) } } });
  const content = D.placeholder([
    D.section({ adminLabel: 'Hero', preset: secCream }, [
      D.row({}, [D.column({}, [D.heading({ text: 'Hello', level: 'h1' })])]),
    ]),
  ]);
  return b.assemble({ context: 'et_builder', content, title: 'Inline', slug: 'inline-test', externalizeBrand: false });
}

function buildSection() {
  const b = D.createBuilder();
  const ACCENT = b.globalColor('accent', '#c9715a', 'Accent');
  const secPreset = b.preset('divi/section', 'Sec',
    { module: { decoration: { background: D.dv({ color: '#fdf7f2' }) } } });
  const btn = b.buttonPreset('Primary', { bg: ACCENT, color: '#fff', radius: '8px' });
  const content = D.placeholder([
    D.section({ adminLabel: 'S', preset: secPreset }, [
      D.row({}, [D.column({}, [
        D.heading({ text: 'Section heading', level: 'h2' }),
        D.button({ text: 'CTA', url: '#', preset: btn }),
      ])]),
    ]),
  ]);
  return b.assemble({ context: 'et_builder_layouts', content, title: 'Section', slug: 'section-test' });
}

// ── run ──────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'de-inline-'));
try {
  const page = buildPage(tmp);

  // ── PAGE: unresolved top-level shape ──
  test('page: top-level presets / global_colors / global_variables omitted', () => {
    assert.ok(!('presets' in page), 'presets survived');
    assert.ok(!('global_colors' in page), 'global_colors survived');
    assert.ok(!('global_variables' in page), 'global_variables survived');
  });
  test('page: keeps context/data/canvases/images/thumbnails', () => {
    assert.deepStrictEqual(
      Object.keys(page).sort(),
      ['canvases', 'context', 'data', 'images', 'thumbnails'],
    );
  });

  // ── PAGE: block-level de-inlining ──
  test('page: section keeps its modulePreset pointer, drops preset bg', () => {
    const sec = blockAttrs(page.data[1], 'section');
    assert.ok(Array.isArray(sec.modulePreset) && sec.modulePreset.length, 'pointer lost');
    const bg = sec.module && sec.module.decoration && sec.module.decoration.background;
    assert.ok(!bg, 'preset-derived background survived de-inlining');
  });
  test('page: heading keeps headingLevel (the <h1>) and pointer, drops font styles', () => {
    const h = blockAttrs(page.data[1], 'heading');
    assert.ok(Array.isArray(h.modulePreset) && h.modulePreset.length, 'pointer lost');
    const val = h.title.decoration.font.font.desktop.value;
    assert.strictEqual(val.headingLevel, 'h1', 'headingLevel stripped');
    assert.ok(!('size' in val), 'preset-derived size not stripped');
    assert.ok(!('family' in val), 'preset-derived family not stripped');
    assert.strictEqual(h.title.innerContent.desktop.value, 'De-inline test page', 'innerContent lost');
  });
  test('page: button enable:"on" (preset-derived) is stripped', () => {
    const btn = blockAttrs(page.data[1], 'button');
    const dec = btn.button && btn.button.decoration;
    const enable = dec && dec.button && dec.button.desktop && dec.button.desktop.value && dec.button.desktop.value.enable;
    assert.strictEqual(enable, undefined, 'button enable:"on" survived (should be preset-only for pages)');
    assert.ok(Array.isArray(btn.modulePreset) && btn.modulePreset.length, 'pointer lost');
    assert.strictEqual(btn.button.innerContent.desktop.value.text, 'Get Started', 'button text lost');
  });
  test('page: block-level override (#ff0000) survives', () => {
    // The second text overrode the preset colour; it must remain inline.
    assert.ok(page.data[1].includes('#ff0000'), 'block-level colour override was stripped');
  });

  // ── PAGE: sidecars ──
  const readSidecar = (suffix) => JSON.parse(fs.readFileSync(path.join(tmp, `deinline-test.${suffix}.json`), 'utf8'));
  test('page: three sidecars written next to the page', () => {
    for (const s of ['presets', 'variables', 'brand']) {
      assert.ok(fs.existsSync(path.join(tmp, `deinline-test.${s}.json`)), `${s} sidecar missing`);
    }
  });
  test('page: .brand.json bundles all three brand blocks', () => {
    const brand = readSidecar('brand');
    assert.deepStrictEqual(Object.keys(brand).sort(), ['global_colors', 'global_variables', 'presets']);
    assert.ok(brand.presets.module['divi/section'], 'brand.presets.module missing sections');
    assert.strictEqual(brand.global_colors.length, 3, 'expected 3 global colours');
  });
  test('page: .presets.json is discoverable-shape (values carry .id)', () => {
    const pf = readSidecar('presets');
    const items = pf.presets['divi/section'];
    const first = Object.values(items)[0];
    assert.ok(first.id, 'preset item missing .id');
  });
  test('page: .variables.json is the global_colors array', () => {
    const vars = readSidecar('variables');
    assert.ok(Array.isArray(vars) && vars.length === 3);
    assert.ok(vars.every(c => Array.isArray(c) && typeof c[0] === 'string'));
  });

  // ── PAGE: validator preset-first mode passes 0 errors ──
  test('page: validate.js passes in preset-first mode (0 errors)', () => {
    fs.writeFileSync(path.join(tmp, 'deinline-test.json'), JSON.stringify(page, null, 2));
    const r = spawnSync('node', [VALIDATE, path.join(tmp, 'deinline-test.json')], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `validator exited ${r.status}:\n${r.stdout}`);
    assert.ok(/cross-checked against/.test(r.stdout), 'preset-first mode did not trigger');
  });

  // ── PAGE: externalizeBrand:false keeps the old self-contained shape ──
  test('page (externalizeBrand:false): presets bundled, nothing stripped', () => {
    const inline = buildPageInline();
    assert.ok('presets' in inline && 'global_colors' in inline, 'brand blocks were stripped');
    // section keeps its inline preset-derived background
    assert.ok(inline.data[1].includes('#fdf7f2'), 'inline preset bg was stripped');
  });

  // ── SECTION regression: unchanged, fully inline ──
  const section = buildSection();
  test('section: context et_builder_layouts, presets bundled', () => {
    assert.strictEqual(section.context, 'et_builder_layouts');
    assert.ok('presets' in section && 'global_colors' in section, 'section lost its brand blocks');
  });
  test('section: inline preset attrs preserved (bg colour + button enable)', () => {
    const c = section.data['1'].post_content;
    assert.ok(c.includes('#fdf7f2'), 'section preset bg was stripped');
    assert.ok(c.includes('"enable":"on"'), 'section button enable:"on" was stripped');
  });
  test('section: no sidecars written for a section build', () => {
    assert.ok(!fs.existsSync(path.join(tmp, 'section-test.brand.json')), 'section wrote a brand sidecar');
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\n── de-inline results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
