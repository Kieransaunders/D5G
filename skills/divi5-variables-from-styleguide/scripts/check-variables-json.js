#!/usr/bin/env node
/**
 * check-variables-json.js — Divi 5 Global Variables import contract validator.
 *
 * Usage: node check-variables-json.js <file.json>
 * Exit:  0 = passes the divi-variables-import contract · 1 = any FAIL · 2 = usage
 *
 * Enforces rules R1-R5 that output from the divi5-variables-from-styleguide skill
 * MUST satisfy before delivery. Pair with the skill; never hand-import a file that
 * does not pass this.
 */
'use strict';

const fs = require('fs');

const ALLOWED_TYPES = ['colors', 'numbers', 'strings', 'fonts', 'images', 'links'];
const ROOT_KEYS = ['context', 'data', 'presets', 'global_colors', 'global_variables', 'canvases', 'images', 'thumbnails'];
const REQ_VAR_FIELDS = ['id', 'label', 'value', 'order', 'status', 'lastUpdated', 'variableType', 'type', 'groupKey'];

// hex (#rgb | #rrggbb | #rrggbbaa) or rgb()/rgba()/hsl()/hsla() function
const COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|^(rgb|rgba|hsl|hsla)\([^)]*\)$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/;

let fails = 0, passes = 0;
const fail = m => { fails++; console.log('  FAIL  ' + m); };
const pass = m => { passes++; /* console.log('  PASS  ' + m); */ };

const file = process.argv[2];
if (!file) { console.error('Usage: check-variables-json.js <file.json>'); process.exit(2); }

let doc;
try {
  doc = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (e) {
  console.log('FAIL: JSON does not parse — ' + e.message);
  process.exit(1);
}

// ─── R1: context ─────────────────────────────────────────────────────────────
if (doc.context === 'et_builder') pass('R1');
else fail('R1: context must be "et_builder" (got ' + JSON.stringify(doc && doc.context) + ')');

// ─── R2: all eight root keys ─────────────────────────────────────────────────
for (const k of ROOT_KEYS) {
  if (doc && k in doc) pass('R2:' + k);
  else fail('R2: missing root key "' + k + '"');
}

// ─── R3: global_colors tuples ────────────────────────────────────────────────
const colors = Array.isArray(doc && doc.global_colors) ? doc.global_colors : [];
if (!Array.isArray(doc && doc.global_colors)) fail('R3: global_colors must be an array');
for (const c of colors) {
  if (!Array.isArray(c) || c.length !== 2) { fail('R3: global_colors entry must be a [id, object] tuple'); continue; }
  const [id, obj] = c;
  if (!/^gcid-/.test(id)) fail('R3: global_color id must start with "gcid-" (got ' + JSON.stringify(id) + ')');
  if (!obj || typeof obj !== 'object') { fail('R3: global_color ' + id + ' value must be an object'); continue; }
  if (!COLOR_RE.test(String(obj.color))) fail('R3: global_color "' + id + '" has invalid color "' + obj.color + '"');
  else pass('R3:' + id);
  if (!obj.status) fail('R3: global_color "' + id + '" missing status');
  if (!obj.label) fail('R3: global_color "' + id + '" missing label');
}

// ─── R4: global_variables fields ─────────────────────────────────────────────
const vars = Array.isArray(doc && doc.global_variables) ? doc.global_variables : [];
if (!Array.isArray(doc && doc.global_variables)) fail('R4: global_variables must be an array');
for (const v of vars) {
  if (!v || typeof v !== 'object') { fail('R4: global_variables entry must be an object'); continue; }
  for (const f of REQ_VAR_FIELDS) {
    if (!(f in v)) fail('R4: variable "' + (v.id || '?') + '" missing field "' + f + '"');
  }
  if (v.id && !/^gvid-/.test(v.id)) fail('R4: variable id must start with "gvid-" (got ' + JSON.stringify(v.id) + ')');
  if (v.type && !ALLOWED_TYPES.includes(v.type)) fail('R4: variable "' + (v.id || '?') + '" has invalid type "' + v.type + '"');
  if (v.lastUpdated && !ISO_RE.test(String(v.lastUpdated))) fail('R4: variable "' + (v.id || '?') + '" lastUpdated is not ISO 8601 ("' + v.lastUpdated + '")');
}

// ─── R5: every color has a matching colors-variable (by value) ───────────────
const colorVarValues = new Set(vars.filter(v => v && v.type === 'colors').map(v => String(v.value)));
for (const c of colors) {
  if (!Array.isArray(c) || !c[1]) continue;
  const val = String(c[1].color);
  if (colorVarValues.has(val)) pass('R5:' + c[0]);
  else fail('R5: color "' + c[0] + '" ("' + val + '") has no matching colors-type variable');
}

console.log(`\n── variables contract: ${passes} passed, ${fails} failed ──`);
process.exit(fails ? 1 : 0);
