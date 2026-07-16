#!/usr/bin/env node
'use strict';

/**
 * de-inline.js — page de-inlining primitives (Pro-gating relocation).
 *
 * Shared by:
 *   - divi-builder.js assemble()   — de-inlines page (et_builder) output at emit
 *     time so the toolkit emits pointer-only blocks with the brand externalised.
 *   - tools/make-unresolved-test.js — the dev-only smoke-test transform that first
 *     PROVED this shape on live Divi 5.9. Both import these helpers so the emitted
 *     "unresolved" shape can never drift from the shape the gate was validated
 *     against (docs/pro-gating-relocation-spec.md §4 Steps 1+2).
 *
 * What "de-inline" means: a page module carries, inline, every visual attr it
 * inherited from its preset (applyPreset() merges preset attrs as the base). For
 * pages we strip those inherited attrs back out, leaving only:
 *   - the preset POINTERS (modulePreset / groupPreset),
 *   - structural attrs the block owns (content, admin label, links, images),
 *   - structural leaf keys that happen to live in a preset (headingLevel — the
 *     page's <h1> is emitted from it, so it must stay inline; see STRUCTURAL_LEAF_KEYS),
 *   - and any explicit block-level OVERRIDE (a value that differs from the preset).
 * The brand definitions (presets / global_colors / global_variables) then travel
 * out-of-band to the Pro importer, which re-inlines them at import time. Raw output
 * therefore renders visually broken without Pro — that is the enforceable gate.
 *
 * SECTIONS (et_builder_layouts) are never de-inlined — the free Library path stays
 * fully self-contained and inlined. These helpers operate on page content only; the
 * caller gates on context.
 */

// ── block-comment surgery ────────────────────────────────────────────────────
// A page's data[1] is a CRLF-joined string of `<!-- wp:divi/NAME {json} -->`
// comments, not an object tree. The attrs JSON contains nested {} and
// `$variable({...})$` tokens with escaped quotes, so we cannot pull it with a
// brace regex — we walk from the first `{`, counting braces while respecting
// string context and backslash escapes.

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
 * Serialize attrs the way the builder does (safeBlockJson in divi-builder.js):
 * escape < > & so WordPress's HTML processing can't corrupt the comment delimiters.
 */
function safeBlockJson(attrs) {
  return JSON.stringify(attrs).replace(/[<>&]/g, c =>
    c === '<' ? '\\u003c' : c === '>' ? '\\u003e' : '\\u0026'
  );
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

/**
 * De-inline every block in a page content string against the doc's preset registry.
 * Pure: returns a new content string; does not mutate its arguments.
 * @param {string} content  data[1] block-comment string
 * @param {object} presets  the doc's `presets` block ({ module, group })
 * @returns {string}
 */
function deInlineContent(content, presets) {
  const { moduleById, groupById } = indexPresets(presets);
  return transformBlocks(content, (name, attrs) => {
    deInlineBlock(attrs, moduleById, groupById);
    return attrs;
  });
}

/** Reshape a doc.presets block → the *.presets.json shape the validator discovers (values carry `.id`). */
function presetsSidecar(presets) {
  const flat = {};
  for (const [name, grp] of Object.entries(presets?.module || {})) flat[name] = grp.items || {};
  for (const [name, grp] of Object.entries(presets?.group || {})) flat[name] = grp.items || {};
  return { presets: flat };
}

/**
 * Write the three out-of-band brand sidecars for an unresolved page build into `dir`,
 * keyed by `slug`. Shared by every page compiler that externalises the brand so the
 * sidecar shapes can't drift:
 *   <slug>.presets.json    — validator-discoverable preset registry (preset-first mode)
 *   <slug>.variables.json  — global_colors (for preset-first gcid checks)
 *   <slug>.brand.json      — { presets, global_colors, global_variables } the Pro importer consumes
 * `brand` is { presets, global_colors, global_variables }. Requires `fs`/`path` — call
 * only from a Node CLI/generator context (never from browser code). Creates `dir`.
 * Returns the list of written paths.
 */
function writeBrandSidecars(dir, slug, brand) {
  const fs = require('fs');
  const path = require('path');
  const safeSlug = String(slug || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'page';
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) { /* may already exist */ }
  const files = {
    [`${safeSlug}.presets.json`]: presetsSidecar(brand.presets),
    [`${safeSlug}.variables.json`]: brand.global_colors || [],
    [`${safeSlug}.brand.json`]: {
      presets: brand.presets,
      global_colors: brand.global_colors || [],
      global_variables: brand.global_variables || [],
    },
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
  readJson, safeBlockJson, transformBlocks,
  isPlainObject, deepEqual, STRUCTURAL_LEAF_KEYS,
  stripPresetAttrs, indexPresets, deInlineBlock, deInlineContent,
  presetsSidecar, writeBrandSidecars,
};
