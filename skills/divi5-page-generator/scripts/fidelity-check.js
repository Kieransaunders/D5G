#!/usr/bin/env node
'use strict';

/**
 * fidelity-check.js — content-fidelity-gate (Stage 3.5)
 *
 * Compares generated Divi 5 page JSON against the approved Stage 2 HTML mockup.
 *
 * L1a — hero h1 text must match (data-fid="hero-h1" in mockup vs <h1> in JSON content)
 * L1b — heading outline (level + text sequence) must match, no add/drop/reorder
 * L2  — heading font-size/weight/family (inline <style> in mockup) vs JSON preset values
 * L2  — column flex-ratio (mockup CSS grid) vs JSON row layout, drift <= +/-5%
 *
 * Usage: node fidelity-check.js <page.json> <mockup.html>
 * Exit: 0 = all pass · 1 = one or more FAIL
 */

const fs   = require('fs');
const path = require('path');

const [, , pageArg, mockupArg] = process.argv;
if (!pageArg || !mockupArg) {
  console.error('Usage: node fidelity-check.js <page.json> <mockup.html>');
  process.exit(1);
}

const html = fs.readFileSync(mockupArg, 'utf8');
const doc  = JSON.parse(fs.readFileSync(pageArg, 'utf8'));

// Flatten all page content into one string to search for headings.
function pageContent(doc) {
  if (typeof doc.content === 'string') return doc.content;
  const parts = [];
  for (const val of Object.values(doc.data || {})) {
    if (typeof val === 'string') parts.push(val);
    else if (val && typeof val.post_content === 'string') parts.push(val.post_content);
  }
  return parts.join('\n');
}
const jsonHtml = pageContent(doc);

let failures = 0;
function FAIL(msg) { failures++; console.log(`FAIL ${msg}`); }
function PASS(msg) { console.log(`PASS ${msg}`); }

function stripTags(s) {
  return s.replace(/<[^>]+>/g, '').trim();
}

function extractHeadings(str) {
  const out = [];
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    out.push({ level: Number(m[1]), text: stripTags(m[2]).replace(/\s+/g, ' ').trim() });
  }
  return out;
}

// ─── L1a: hero h1 ────────────────────────────────────────────────────────
const mockupH1Match = html.match(/<h1[^>]*data-fid=["']hero-h1["'][^>]*>([\s\S]*?)<\/h1>/i)
  || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
const jsonH1Match = jsonHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);

if (mockupH1Match && jsonH1Match) {
  const mockupH1 = stripTags(mockupH1Match[1]).toLowerCase();
  const jsonH1   = stripTags(jsonH1Match[1]).toLowerCase();
  if (mockupH1 === jsonH1) PASS('L1a hero h1 matches');
  else FAIL(`L1a h1 mismatch — mockup: "${mockupH1}" vs json: "${jsonH1}"`);
} else {
  FAIL('L1a h1 missing from mockup or json');
}

// ─── L1b: heading outline ────────────────────────────────────────────────
const mockupHeadings = extractHeadings(html);
const jsonHeadings   = extractHeadings(jsonHtml);

const mockupOutline = mockupHeadings.map(h => `${h.level}:${h.text.toLowerCase()}`).join('|');
const jsonOutline   = jsonHeadings.map(h => `${h.level}:${h.text.toLowerCase()}`).join('|');

if (mockupOutline === jsonOutline) {
  PASS('L1b heading outline matches');
} else {
  FAIL(`L1b heading outline mismatch — mockup: [${mockupOutline}] vs json: [${jsonOutline}]`);
}

// ─── L2: heading font-size/weight/family vs JSON preset ─────────────────
function extractStyleRules(str) {
  const rules = {};
  const styleMatch = str.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (!styleMatch) return rules;
  const css = styleMatch[1];
  const re = /(h[1-3])\s*\{([^}]*)\}/gi;
  let m;
  while ((m = re.exec(css)) !== null) {
    const tag = m[1].toLowerCase();
    const decls = m[2];
    const size   = (decls.match(/font-size\s*:\s*([^;]+);?/i)   || [])[1];
    const weight = (decls.match(/font-weight\s*:\s*([^;]+);?/i) || [])[1];
    const family = (decls.match(/font-family\s*:\s*([^;]+);?/i) || [])[1];
    rules[tag] = {
      size:   size   ? size.trim()   : null,
      weight: weight ? weight.trim() : null,
      family: family ? family.trim().replace(/['"]/g, '') : null,
    };
  }
  return rules;
}

function extractHeadingPresetValues(doc) {
  const out = {};
  const presets = doc.presets || {};
  for (const group of Object.values(presets)) {
    if (!group || typeof group !== 'object') continue;
    for (const preset of Object.values(group)) {
      const font = preset?.attrs?.headingText?.font?.headingFont?.font
        || preset?.attrs?.text?.font?.font;
      if (!font) continue;
      const level = preset?.attrs?.headingLevel || preset?.headingLevel;
      const tag = level ? `h${String(level).replace('h', '')}` : null;
      if (tag) {
        out[tag] = {
          size:   font?.desktop?.value?.size   || null,
          weight: font?.desktop?.value?.weight || null,
          family: font?.desktop?.value?.family || null,
        };
      }
    }
  }
  return out;
}

const mockupStyles = extractStyleRules(html);
const jsonStyles    = extractHeadingPresetValues(doc);

if (Object.keys(mockupStyles).length === 0) {
  PASS('L2 heading style — no mockup <style> rules to compare');
} else {
  let anyChecked = false;
  for (const tag of Object.keys(mockupStyles)) {
    const j = jsonStyles[tag];
    if (!j) continue; // nothing declared in JSON presets for this tag — cannot compare
    anyChecked = true;
    const m = mockupStyles[tag];
    const diffs = [];
    if (m.size && j.size && m.size !== j.size) diffs.push(`size ${m.size} vs ${j.size}`);
    if (m.weight && j.weight && String(m.weight) !== String(j.weight)) diffs.push(`weight ${m.weight} vs ${j.weight}`);
    if (m.family && j.family && m.family !== j.family) diffs.push(`family ${m.family} vs ${j.family}`);
    if (diffs.length) FAIL(`L2 ${tag} style diverges — ${diffs.join(', ')}`);
    else PASS(`L2 ${tag} style matches`);
  }
  if (!anyChecked) PASS('L2 heading style — no comparable JSON preset values found');
}

// ─── L2: column flex-ratio vs JSON row layout ───────────────────────────
function extractMockupColumnRatios(str) {
  const ratios = [];
  const re = /grid-template-columns\s*:\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(str)) !== null) {
    const parts = m[1].trim().split(/\s+/).map(p => parseFloat(p)).filter(n => !isNaN(n));
    if (parts.length > 1) {
      const total = parts.reduce((a, b) => a + b, 0);
      ratios.push(parts.map(p => p / total));
    }
  }
  return ratios;
}

function extractJsonColumnRatios(content) {
  const ratios = [];
  const rowRe = /<!-- wp:divi\/row[^>]*-->([\s\S]*?)<!-- \/wp:divi\/row -->/gi;
  let rowMatch;
  while ((rowMatch = rowRe.exec(content)) !== null) {
    const cols = [...rowMatch[1].matchAll(/<!-- wp:divi\/column\s+({[\s\S]*?})\s*-->/gi)];
    if (cols.length < 2) continue;
    const fractions = cols.map(c => {
      try {
        const attrs = JSON.parse(c[1]);
        const flexType = attrs?.module?.advanced?.width?.desktop?.value?.flexType
          || attrs?.column?.advanced?.width?.desktop?.value?.flexType;
        if (!flexType) return null;
        const [num, den] = flexType.split('_').map(Number);
        return num / den;
      } catch (_) { return null; }
    });
    if (fractions.every(f => f !== null)) ratios.push(fractions);
  }
  return ratios;
}

const mockupRatios = extractMockupColumnRatios(html);
const jsonRatios    = extractJsonColumnRatios(jsonHtml);

if (mockupRatios.length === 0 || jsonRatios.length === 0) {
  PASS('L2 column flex-ratio — no comparable grid data found');
} else {
  const count = Math.min(mockupRatios.length, jsonRatios.length);
  for (let i = 0; i < count; i++) {
    const m = mockupRatios[i];
    const j = jsonRatios[i];
    if (m.length !== j.length) { FAIL(`L2 row ${i} column count mismatch — mockup ${m.length} vs json ${j.length}`); continue; }
    let drift = 0;
    for (let k = 0; k < m.length; k++) drift = Math.max(drift, Math.abs(m[k] - j[k]));
    if (drift > 0.05) FAIL(`L2 row ${i} flex-ratio drift ${(drift * 100).toFixed(1)}% (> 5%)`);
    else PASS(`L2 row ${i} flex-ratio matches (drift ${(drift * 100).toFixed(1)}%)`);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────
if (failures > 0) {
  console.log(`\n${failures} FAIL(s) — fix before delivery`);
  process.exit(1);
} else {
  console.log('\nAll fidelity checks passed');
  process.exit(0);
}
