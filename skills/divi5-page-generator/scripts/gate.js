#!/usr/bin/env node
/**
 * gate.js — the creative-gate enforcer for the divi5-page-generator skill.
 *
 * This is the forcing function that stops the model skipping the two steps that
 * turn generic output into designed output: (1) committing to a creative concept
 * + delight moments before building, and (2) building an HTML mockup and passing
 * the taste rules on it before generating any JSON.
 *
 * divi-builder.js assemble() REFUSES to emit JSON unless both stamps for the page
 * slug exist on disk. So skipping these steps produces no deliverable — the
 * shortcut is dead. The model can't "forget"; the gate is mechanical.
 *
 * Two commands:
 *
 *   Stage 1 — concept stamp (run before any section is designed):
 *     node gate.js concept --slug <slug> --concept "<one big-idea sentence>" \
 *         --voice "<adj>,<adj>,<adj>" \
 *         --delight '[{"section":"hero","idea":"..."},{"section":"...","idea":"..."}]' \
 *         --aesthetic "<preset name>" \
 *         --dials "<variance>,<motion>,<density>"
 *     → validates fields and writes <slug>.concept.json
 *
 *   Stage 2 — mockup taste stamp (run after preview-<slug>.html exists):
 *     node gate.js mockup --slug <slug> <preview.html>
 *     → runs the taste rules on the HTML; on PASS writes <slug>.mockup.gate.json
 *
 * Stamps are page-scoped (keyed by slug) so a project folder holding many pages
 * keeps each page's concept + taste provenance separate. A catalog app can archive
 * these alongside each generated page.
 *
 * Exit 0 = stamp written · 1 = rejected (no stamp written).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.env.DIVI5_OUT || path.join(os.homedir(), 'Desktop', 'Divi5 Pages');

// ─── args ───────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const cmd = argv[0];
function flag(name) {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const v = argv[i + 1];
  return (v === undefined || v.startsWith('--')) ? null : v;
}
// Every flag in gate.js (--slug, --concept, --voice, --delight, --aesthetic,
// --dials) takes a value, so a positional is any arg that is not a flag and not
// the value immediately following a flag.
function positional() {
  for (let i = 1; i < argv.length; i++) {
    if (argv[i].startsWith('--')) { i++; continue; }
    return argv[i];
  }
  return null;
}

function die(msg) { console.error('GATE FAIL: ' + msg); process.exit(1); }

// ─── shared taste rules (kept in sync with taste-check.js bans) ─────────────

const EM_RE = /[—–]|&mdash;|&ndash;|&#8212;|&#8211;/g;
const AI_TELL_WORDS = [
  'Unlock', 'Leverage', 'Transform', 'Seamlessly', 'Streamline', 'Elevate',
  'Supercharge', 'Revolutionize', 'Unleash', 'Empower', 'Harness', 'Reimagine',
];
const AI_TELL_RE = new RegExp('\\b(' + AI_TELL_WORDS.join('|') + ')\\b', 'i');
const VERB_STARTS = /^(Build|Get|Discover|Find|Start|Try|Join|See|Make|Create|Grow|Scale|Run|Use|Boost|Drive|Help|Take|Learn|Save|Improve|Increase|Reduce|Achieve|Deliver|Enable|Maximize|Optimize)\b/i;

/** Strip an HTML document down to the text a reader sees. */
function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract the inner text of every <h1>/<h2> in raw HTML (mockup headings). */
function mockupHeadings(html) {
  const out = [];
  const re = /<h([12])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out.push({ level: 'h' + m[1], text: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() });
  }
  return out;
}

// ─── concept stamp ──────────────────────────────────────────────────────────

function stampConcept() {
  const slug = (flag('--slug') || '').trim();
  if (!slug) die('--slug <slug> is required (matches the page slug passed to assemble())');

  const concept = (flag('--concept') || '').trim();
  const voice = (flag('--voice') || '').split(',').map(s => s.trim()).filter(Boolean);
  let delight = [];
  const delightRaw = flag('--delight');
  if (delightRaw) {
    try { delight = JSON.parse(delightRaw); }
    catch (e) { die('--delight must be JSON: ' + e.message); }
  }
  const aesthetic = (flag('--aesthetic') || '').trim();
  const dialsRaw = (flag('--dials') || '').split(',').map(s => s.trim());

  // validate
  if (concept.length < 12) die('--concept must be one real sentence (>=12 chars) stating the big idea for this page. A generic brief is not a concept.');
  if (voice.length < 3) die('--voice needs >=3 adjectives describing the tone (e.g. "dry,confident,technical").');
  if (!Array.isArray(delight) || delight.length < 2 || delight.length > 4) die('--delight needs 2-4 moments, each {section, idea}. An empty delight list means no delight was planned.');
  for (const d of delight) {
    if (!d || typeof d !== 'object' || !d.section || !d.idea) die('--delight each item needs {section, idea}; got ' + JSON.stringify(d));
  }
  if (!aesthetic) die('--aesthetic <preset name> is required');
  if (dialsRaw.length !== 3 || dialsRaw.some(n => !/^\d+$/.test(n))) die('--dials must be "<variance>,<motion>,<density>" as integers');

  const stamp = {
    type: 'concept',
    slug,
    concept,
    voice,
    aesthetic,
    dials: { variance: +dialsRaw[0], motion: +dialsRaw[1], density: +dialsRaw[2] },
    delightMoments: delight,
    created: new Date().toISOString(),
  };
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, slug + '.concept.json');
  fs.writeFileSync(file, JSON.stringify(stamp, null, 2));
  console.log('GATE OK: wrote ' + path.relative(process.cwd(), file));
  console.log('  concept: ' + concept);
  console.log('  delight: ' + delight.length + ' moment(s) across ' + [...new Set(delight.map(d => d.section))].join(', '));
}

// ─── mockup taste stamp ─────────────────────────────────────────────────────

function stampMockup() {
  const slug = (flag('--slug') || '').trim();
  if (!slug) die('--slug <slug> is required');
  const htmlPath = positional();
  if (!htmlPath) die('usage: node gate.js mockup --slug <slug> <preview.html>');
  const full = path.resolve(htmlPath);
  if (!fs.existsSync(full)) die('preview HTML not found: ' + full);

  const html = fs.readFileSync(full, 'utf8');
  const visible = htmlToText(html);
  const headings = mockupHeadings(html);
  const h1s = headings.filter(h => h.level === 'h1');

  const fails = [];

  // em-dash / en-dash anywhere in visible copy
  const em = visible.match(new RegExp(EM_RE.source, EM_RE.flags));
  if (em) fails.push('em/en-dash in copy (' + em.length + 'x) — use a hyphen "-". First: "' + visible.slice(visible.indexOf(em[0]) - 20, visible.indexOf(em[0]) + 20).trim() + '"');

  // exactly one h1
  if (h1s.length === 0) fails.push('no <h1> in the mockup — the hero headline must be an h1');
  else if (h1s.length > 1) fails.push(h1s.length + ' <h1>s — exactly one is allowed');

  // AI buzzwords in h1/h2
  const aiTell = headings.filter(h => AI_TELL_RE.test(h.text));
  if (aiTell.length) fails.push('AI buzzword in h1/h2 — "' + aiTell.map(h => h.text.slice(0, 50)).join('" | "') + '". Rewrite without Unlock/Leverage/Transform/Streamline/etc.');

  // h1 starts with a generic verb
  const verbH1 = h1s.filter(h => VERB_STARTS.test(h.text.trim()));
  if (verbH1.length) fails.push('h1 starts with a generic verb — "' + verbH1[0].text.slice(0, 60) + '". Open with a noun, number, or adjective.');

  if (fails.length) {
    console.error('GATE FAIL: mockup did not pass the taste rules. Fix the HTML, do not bypass:');
    fails.forEach(f => console.error('  - ' + f));
    process.exit(1);
  }

  const stamp = {
    type: 'mockup',
    slug,
    html: path.basename(full),
    tastePass: true,
    checks: {
      emDashHits: 0,
      h1Count: h1s.length,
      aiTellHits: 0,
      verbH1: false,
    },
    created: new Date().toISOString(),
  };
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, slug + '.mockup.gate.json');
  fs.writeFileSync(file, JSON.stringify(stamp, null, 2));
  console.log('GATE OK: wrote ' + path.relative(process.cwd(), file));
  console.log('  mockup taste: PASS (1 h1, no em-dash, no AI buzzwords, no verb-start h1)');
}

// ─── dispatch ───────────────────────────────────────────────────────────────

if (cmd === 'concept') stampConcept();
else if (cmd === 'mockup') stampMockup();
else {
  console.error('usage: node gate.js <concept|mockup> ...');
  console.error('  concept: --slug --concept --voice --delight --aesthetic --dials');
  console.error('  mockup:  --slug <preview.html>');
  process.exit(1);
}
