#!/usr/bin/env node
'use strict';

/**
 * make-unresolved-test.test.js — unit test for tools/make-unresolved-test.js.
 *
 * Run:   node tools/make-unresolved-test.test.js
 * Exit:  0 = all pass · 1 = any fail
 *
 * Round-trips a tiny fixture page through the transform in an OS tmp dir and asserts:
 *   Variant A  — keeps modulePreset/groupPreset pointers, drops preset-derived style
 *                attrs, keeps a block-level override, keeps the structural headingLevel,
 *                and keeps the top-level `presets` block.
 *   Variant B  — removes presets / global_colors / global_variables; the brand sidecar
 *                and the discoverable .presets.json / .variables.json carry them.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const T = require('./make-unresolved-test.js');

let pass = 0, fail = 0;
const failures = [];
function test(name, fn) {
  try { fn(); pass++; }
  catch (e) { fail++; failures.push(`  FAIL  ${name} — ${e.message}`); }
}

// ── fixture ──────────────────────────────────────────────────────────────────
// One section (module preset: bg colour), one heading (group font preset: size +
// h1 level), one text that OVERRIDES the preset colour. Mirrors assemble() shape.
const HERO_PRESET_ID = 'secpreset01';
const FONT_GROUP_ID = 'fontgrp01';
const TEXT_PRESET_ID = 'txtpreset01';

const heroAttrs = {
  module: { decoration: { background: { desktop: { value: { color: '$variable({"type":"color","value":{"name":"gcid-dark"}})$' } } } } },
  meta: { adminLabel: { desktop: { value: 'Hero' } } },
  modulePreset: [HERO_PRESET_ID],
  builderVersion: '5.0.0',
};
const headingAttrs = {
  title: { decoration: { font: { font: { desktop: { value: { size: '48px', weight: '600', headingLevel: 'h1' } } } } },
           innerContent: { desktop: { value: 'The Headline' } } },
  groupPreset: { 'divi/font': { presetId: [FONT_GROUP_ID], groupName: 'Heading' } },
  builderVersion: '5.0.0',
};
const textAttrs = {
  // colour here differs from the preset's colour → block-level override, must survive.
  content: { decoration: { bodyFont: { body: { font: { desktop: { value: { size: '17px', color: '#ff0000' } } } } } },
             innerContent: { desktop: { value: '<p>Body copy</p>' } } },
  modulePreset: [TEXT_PRESET_ID],
  builderVersion: '5.0.0',
};

const CRLF = '\r\n';
const b = (name, attrs) => `<!-- wp:divi/${name} ${JSON.stringify(attrs)} -->`;
const content = [
  '<!-- wp:divi/placeholder -->',
  b('section', heroAttrs),
  b('heading', headingAttrs),
  b('text', textAttrs),
  '<!-- /wp:divi/section -->',
  '<!-- /wp:divi/placeholder -->',
].join(CRLF);

const fixture = {
  context: 'et_builder',
  data: { 1: content },
  canvases: {},
  presets: {
    module: {
      'divi/section': { default: HERO_PRESET_ID, items: { [HERO_PRESET_ID]: {
        id: HERO_PRESET_ID, name: 'Hero', moduleName: 'divi/section',
        attrs: { module: { decoration: { background: { desktop: { value: { color: '$variable({"type":"color","value":{"name":"gcid-dark"}})$' } } } } } },
      } } },
      'divi/text': { default: TEXT_PRESET_ID, items: { [TEXT_PRESET_ID]: {
        id: TEXT_PRESET_ID, name: 'Body', moduleName: 'divi/text',
        // preset colour is a brand blue; the block overrides it with #ff0000.
        attrs: { content: { decoration: { bodyFont: { body: { font: { desktop: { value: { size: '17px', color: '$variable({"type":"color","value":{"name":"gcid-body"}})$' } } } } } } } },
      } } },
    },
    group: {
      'divi/font': { default: FONT_GROUP_ID, items: { [FONT_GROUP_ID]: {
        id: FONT_GROUP_ID, name: 'H1', groupName: 'Heading', groupId: 'divi/font', moduleName: 'divi/heading',
        attrs: { title: { decoration: { font: { font: { desktop: { value: { size: '48px', weight: '600', headingLevel: 'h1' } } } } } } },
      } } },
    },
  },
  global_colors: [
    ['gcid-dark', { color: '#111111', status: 'active', label: 'Dark' }],
    ['gcid-body', { color: '#333333', status: 'active', label: 'Body' }],
  ],
  global_variables: [['gvid-space', { value: '2rem' }]],
  images: {},
  thumbnails: [],
};

// ── helpers to read a named block's parsed attrs back out of a content string ──
function blockAttrs(contentStr, name) {
  const re = new RegExp(`<!-- wp:divi\\/${name} `, 'g');
  const m = re.exec(contentStr);
  if (!m) return null;
  const [json] = T.readJson(contentStr, m.index + m[0].length);
  return JSON.parse(json);
}

// ── run ──────────────────────────────────────────────────────────────────────
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'unresolved-test-'));
try {
  const pagePath = path.join(tmp, 'fixture.json');
  fs.writeFileSync(pagePath, JSON.stringify(fixture));
  const written = T.run(pagePath);

  const readSidecar = (suffix) =>
    JSON.parse(fs.readFileSync(path.join(tmp, `fixture.${suffix}.json`), 'utf8'));
  const A = readSidecar('variantA');
  const B = readSidecar('variantB');
  const presetsFile = readSidecar('presets');
  const varsFile = readSidecar('variables');
  const brand = readSidecar('brand');

  // ── Variant A ──
  test('A: all five files written', () => {
    assert.strictEqual(written.length, 5);
  });
  test('A: keeps the top-level presets block', () => {
    assert.ok(A.presets && A.presets.module['divi/section'], 'presets block missing');
  });
  test('A: hero keeps its modulePreset pointer', () => {
    const hero = blockAttrs(A.data[1], 'section');
    assert.deepStrictEqual(hero.modulePreset, [HERO_PRESET_ID]);
  });
  test('A: hero preset-derived background is stripped', () => {
    const hero = blockAttrs(A.data[1], 'section');
    assert.ok(!hero.module || !hero.module.decoration || !hero.module.decoration.background,
      'preset-derived background survived de-inlining');
  });
  test('A: hero keeps structural adminLabel', () => {
    const hero = blockAttrs(A.data[1], 'section');
    assert.strictEqual(hero.meta.adminLabel.desktop.value, 'Hero');
  });
  test('A: heading keeps groupPreset pointer and structural headingLevel', () => {
    const h = blockAttrs(A.data[1], 'heading');
    assert.deepStrictEqual(h.groupPreset['divi/font'].presetId, [FONT_GROUP_ID], 'group pointer lost');
    assert.strictEqual(h.title.decoration.font.font.desktop.value.headingLevel, 'h1', 'headingLevel stripped');
    assert.ok(!('size' in h.title.decoration.font.font.desktop.value), 'preset-derived size not stripped');
  });
  test('A: text keeps its innerContent (structural)', () => {
    const t = blockAttrs(A.data[1], 'text');
    assert.strictEqual(t.content.innerContent.desktop.value, '<p>Body copy</p>');
  });
  test('A: text keeps its block-level colour override', () => {
    const t = blockAttrs(A.data[1], 'text');
    assert.strictEqual(t.content.decoration.bodyFont.body.font.desktop.value.color, '#ff0000',
      'block override was wrongly stripped');
  });

  // ── Variant B ──
  test('B: presets / global_colors / global_variables all removed', () => {
    assert.ok(!('presets' in B), 'presets survived');
    assert.ok(!('global_colors' in B), 'global_colors survived');
    assert.ok(!('global_variables' in B), 'global_variables survived');
  });
  test('B: content identical to A (same de-inlining)', () => {
    assert.strictEqual(B.data[1], A.data[1]);
  });
  test('B: brand sidecar carries all three removed blocks', () => {
    assert.ok(brand.presets && brand.presets.module['divi/section'], 'brand.presets missing');
    assert.strictEqual(brand.global_colors.length, 2);
    assert.strictEqual(brand.global_variables.length, 1);
  });
  test('B: .presets.json is discoverable-shape (values carry .id)', () => {
    const items = presetsFile.presets['divi/section'];
    const first = Object.values(items)[0];
    assert.strictEqual(first.id, HERO_PRESET_ID);
    assert.ok('divi/font' in presetsFile.presets, 'group presets not flattened in');
  });
  test('B: .variables.json is the global_colors array', () => {
    assert.ok(Array.isArray(varsFile) && varsFile.length === 2);
    assert.strictEqual(varsFile[0][0], 'gcid-dark');
  });

  // ── guard: page path only (the "sections stay self-contained" hard constraint) ──
  test('guard: refuses a non-page (library section) input', () => {
    assert.throws(
      () => T.buildVariantA({ context: 'et_builder_layouts', data: { 1: {} }, presets: {} }),
      /not a page build/,
    );
  });
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

console.log('\n── make-unresolved-test results ──');
console.log(`  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
