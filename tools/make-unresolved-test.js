#!/usr/bin/env node
'use strict';

/**
 * make-unresolved-test.js — PRIVATE dev tool. Never shipped in any skill.
 *
 * Produces the two "unresolved" page-JSON variants the Pro-gating smoke test
 * needs (docs/pro-gating-relocation-spec.md §4 Steps 1+2, §5), so a human can
 * prove on live Divi that raw toolkit output renders broken while the same page
 * through the Pro /import endpoint renders correctly.
 *
 * Input:  a generated Divi 5 PAGE JSON (context: 'et_builder'), exactly the shape
 *         emitted by skills/divi5-page-generator/scripts/divi-builder.js assemble()
 *         — { context, data:{1:<block-comment string>}, canvases, presets:{module,group},
 *             global_colors, global_variables, images, thumbnails }.
 *
 * Output (written next to the input):
 *   <name>.variantA.json   Step 1 "de-inlined": every page module block keeps its
 *                          modulePreset/groupPreset pointers + structural attrs, but
 *                          the preset-derived inline style attrs are stripped. The
 *                          top-level `presets` block is kept intact. (Validates in the
 *                          validator's NORMAL mode.)
 *   <name>.variantB.json   Step 2 "brand externalised": everything in A, AND the
 *                          top-level presets / global_colors / global_variables are
 *                          removed entirely. (Validates in PRESET-FIRST mode against
 *                          the sidecar files below.)
 *   <name>.presets.json    the removed presets, in the *.presets.json shape the
 *                          validator discovers for preset-first cross-checking.
 *   <name>.variables.json  the removed global_colors, so preset-first gcid checks
 *                          find their definitions on disk.
 *   <name>.brand.json      single out-of-band bundle {presets, global_colors,
 *                          global_variables} — travels to the Pro importer.
 *
 * Usage:
 *   node tools/make-unresolved-test.js <page.json>
 *
 * Validate the output (from the page's own directory):
 *   node skills/divi5-page-generator/scripts/validate.js <name>.variantA.json
 *   node skills/divi5-page-generator/scripts/validate.js <name>.variantB.json
 */

const fs = require('fs');
const path = require('path');

// ── block-comment surgery ────────────────────────────────────────────────────
// data[1] is a CRLF-joined string of `<!-- wp:divi/NAME {json} -->` comments, not
// an object tree. The attrs JSON contains nested {} and `$variable({...})$` tokens
// with escaped quotes, so we cannot pull it with a brace regex — we walk from the
// first `{`, counting braces while respecting string context and backslash escapes.

const CRLF = '\r\n';

/** Extract the balanced JSON object starting at `str[from]` (must be `{`). Returns [json, endIndex]. */
function readJson(str, from) {
  let depth = 0, inStr = false, esc = false;
  for (let i = from; i < str.length; i++) {
    const c = str[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (inStr) { if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return [str.slice(from, i + 1), i + 1]; }
  }
  throw new Error('unbalanced block attrs JSON');
}

/**
 * Walk a block-comment string, calling transform(name, attrs) for every opening or
 * self-closing block that carries an attrs object, and splice the returned attrs
 * back in. Blocks with no attrs (e.g. bare `<!-- wp:divi/placeholder -->`) pass
 * through untouched, as do closing tags.
 */
function transformBlocks(content, transform) {
  const openRe = /<!-- wp:divi\/([a-z0-9-]+)\s/g;
  let out = '';
  let cursor = 0;
  let m;
  while ((m = openRe.exec(content))) {
    const name = m[1];
    const attrsStart = m.index + m[0].length;
    // A block with attrs has `{` right after the space; without attrs it's `/-->` or `-->`.
    if (content[attrsStart] !== '{') continue;
    const [json, jsonEnd] = readJson(content, attrsStart);
    const attrs = JSON.parse(json);
    const newAttrs = transform(name, attrs) || attrs;
    out += content.slice(cursor, attrsStart) + safeBlockJson(newAttrs);
    cursor = jsonEnd;
    openRe.lastIndex = jsonEnd;
  }
  out += content.slice(cursor);
  return out;
}

/**
 * Serialize attrs the way the builder does (safeBlockJson in divi-builder.js):
 * escape < > & so WordPress's HTML processing can't corrupt the comment delimiters.
 */
function safeBlockJson(attrs) {
  return JSON.stringify(attrs).replace(/[<>&]/g, c =>
    c === '<' ? '\\u003c' : c === '>' ? '\\u003e' : '\\u0026'
  );
}

// ── de-inlining ──────────────────────────────────────────────────────────────

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => k in b && deepEqual(a[k], b[k]));
  }
  return false;
}

// Leaf keys that are STRUCTURAL, not stylistic: they change what the block *is*,
// not merely how it looks, so they must survive de-inlining even when they match
// the referenced preset. headingLevel is the load-bearing one — the validator
// (validate.js:187) and SEO/front-end read the heading level from the inline attr,
// and Divi's heading tag (h1/h2/…) is emitted from it. A preset can carry it, but
// the block must keep it inline or the page loses its <h1>.
const STRUCTURAL_LEAF_KEYS = new Set(['headingLevel']);

/**
 * Strip from `blockAttrs` every path that also exists in `presetAttrs` with a
 * deep-equal value — i.e. the value the block inherited from the preset and did
 * not override. Object-level granularity: if the block's value at a path differs
 * from the preset (an override), the whole value is kept. Structural leaf keys
 * (STRUCTURAL_LEAF_KEYS) are always kept. Empty containers left behind by stripping
 * are pruned so the block carries no dead `{}`.
 * Never touches the pointer keys (modulePreset/groupPreset) or builderVersion —
 * those are handled by the caller and never live inside a preset's attrs subtree.
 */
function stripPresetAttrs(blockAttrs, presetAttrs) {
  if (!isPlainObject(presetAttrs)) return;
  for (const key of Object.keys(presetAttrs)) {
    if (!(key in blockAttrs)) continue;
    if (STRUCTURAL_LEAF_KEYS.has(key)) continue;
    const pv = presetAttrs[key];
    const bv = blockAttrs[key];
    if (isPlainObject(pv) && isPlainObject(bv)) {
      stripPresetAttrs(bv, pv);
      if (Object.keys(bv).length === 0) delete blockAttrs[key];
    } else if (deepEqual(pv, bv)) {
      delete blockAttrs[key];
    }
    // else: block overrode this value — keep it.
  }
}

/** Build id → preset-attrs maps for module and group presets from a doc's `presets` block. */
function indexPresets(presets) {
  const moduleById = new Map(); // presetId -> attrs
  const groupById = new Map();  // presetId -> attrs
  for (const grp of Object.values(presets?.module || {})) {
    for (const [id, item] of Object.entries(grp.items || {})) {
      if (item && item.attrs) moduleById.set(String(id), item.attrs);
    }
  }
  for (const grp of Object.values(presets?.group || {})) {
    for (const [id, item] of Object.entries(grp.items || {})) {
      if (item && item.attrs) groupById.set(String(id), item.attrs);
    }
  }
  return { moduleById, groupById };
}

/** De-inline one block's attrs against the preset registry it points at. Mutates in place. */
function deInlineBlock(attrs, moduleById, groupById) {
  // Module preset: modulePreset:[id]
  if (Array.isArray(attrs.modulePreset) && attrs.modulePreset.length) {
    const pAttrs = moduleById.get(String(attrs.modulePreset[0]));
    if (pAttrs) stripPresetAttrs(attrs, pAttrs);
  }
  // Group presets: groupPreset:{ groupId: { presetId:[id], groupName } }
  if (isPlainObject(attrs.groupPreset)) {
    for (const slot of Object.values(attrs.groupPreset)) {
      const id = Array.isArray(slot?.presetId) ? slot.presetId[0] : null;
      if (!id) continue;
      const pAttrs = groupById.get(String(id));
      if (pAttrs) stripPresetAttrs(attrs, pAttrs);
    }
  }
}

// ── variant builders ─────────────────────────────────────────────────────────

function buildVariantA(doc) {
  if (doc.context !== 'et_builder') {
    throw new Error(`input is not a page build (context: ${doc.context}). This tool only de-inlines full-page (et_builder) JSON.`);
  }
  const { moduleById, groupById } = indexPresets(doc.presets);
  const out = JSON.parse(JSON.stringify(doc));
  out.data[1] = transformBlocks(out.data[1], (name, attrs) => {
    deInlineBlock(attrs, moduleById, groupById);
    return attrs;
  });
  return out;
}

function buildVariantB(variantA) {
  const out = JSON.parse(JSON.stringify(variantA));
  const brand = {
    presets: out.presets,
    global_colors: out.global_colors || [],
    global_variables: out.global_variables || [],
  };
  delete out.presets;
  delete out.global_colors;
  delete out.global_variables;
  return { variantB: out, brand };
}

/** Reshape doc.presets → the *.presets.json shape the validator discovers (values carry `.id`). */
function presetsSidecar(presets) {
  const flat = {};
  for (const [name, grp] of Object.entries(presets?.module || {})) flat[name] = grp.items || {};
  for (const [name, grp] of Object.entries(presets?.group || {})) flat[name] = grp.items || {};
  return { presets: flat };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function run(inputPath) {
  const abs = path.resolve(inputPath);
  const doc = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const dir = path.dirname(abs);
  const base = path.basename(abs).replace(/\.json$/i, '');

  const variantA = buildVariantA(doc);
  const { variantB, brand } = buildVariantB(variantA);

  const files = {
    [`${base}.variantA.json`]: variantA,
    [`${base}.variantB.json`]: variantB,
    [`${base}.presets.json`]: presetsSidecar(brand.presets),
    [`${base}.variables.json`]: brand.global_colors,
    [`${base}.brand.json`]: brand,
  };
  const written = [];
  for (const [fname, data] of Object.entries(files)) {
    const p = path.join(dir, fname);
    fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n');
    written.push(p);
  }
  return written;
}

module.exports = {
  readJson, transformBlocks, safeBlockJson,
  deepEqual, stripPresetAttrs, indexPresets, deInlineBlock,
  buildVariantA, buildVariantB, presetsSidecar, run,
};

if (require.main === module) {
  const input = process.argv[2];
  if (!input) {
    console.error('Usage: node tools/make-unresolved-test.js <page.json>');
    process.exit(2);
  }
  try {
    const written = run(input);
    console.log('Wrote:');
    for (const p of written) console.log('  ' + p);
  } catch (e) {
    console.error('Error: ' + e.message);
    process.exit(1);
  }
}
