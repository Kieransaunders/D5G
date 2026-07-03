'use strict';

/**
 * design-tokens.test.js — RED driver for the Phase 0 redesign change
 * (`openspec/changes/add-frontend-design-tokens/`).
 *
 * Asserts the design-token contract is present in the shipped CSS/HTML:
 *   - dark-theme colour palette on :root (canonical --d5-* values)
 *   - Plus Jakarta Sans + JetBrains Mono loaded from Google Fonts (with preconnect)
 *   - typography tokens, base body font, tight heading tracking, weight 800 available
 *   - radius + shadow tokens
 *   - thin WebKit + Firefox scrollbars
 *   - four @keyframes: d5b, d5pulse, d5fade, d5spin
 *   - .d5-badge pill class
 *   - app.js unmodified relative to HEAD (regression guard)
 *
 * Node-side text assertions over app/public/style.css and app/public/index.html,
 * matching the existing style-check.test.js pattern (no browser). Run from app/ via
 * `node --test tests/design-tokens.test.js` or `npm test`.
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const fs     = require('node:fs');
const path   = require('node:path');
const { spawnSync } = require('node:child_process');

const PUBLIC   = path.join(__dirname, '..', 'public');
const STYLE    = fs.readFileSync(path.join(PUBLIC, 'style.css'), 'utf8');
const INDEX    = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
const REPO     = path.join(__dirname, '..', '..');

// ── helpers ─────────────────────────────────────────────────────────────────

/** Extract the first :root { ... } block from CSS (non-greedy, brace-matched). */
function rootBlock(css) {
  const m = css.match(/:root\s*\{([\s\S]*?)\}/);
  return m ? m[1] : '';
}
const ROOT = rootBlock(STYLE);

/** Quote a regex source for readable failure output. */
function re(src) { return new RegExp(src); }

// ── 1. Colour token palette ─────────────────────────────────────────────────

test('Colour palette: required --d5-* tokens defined at canonical values', () => {
  const expected = {
    '--d5-bg':            '#0a0b0e',
    '--d5-panel':         '#0c0d11',
    '--d5-panel-2':       '#121419',
    '--d5-panel-3':       '#141620',
    '--d5-border':        'rgba(255,255,255,0.06)',
    '--d5-border-strong': 'rgba(255,255,255,0.12)',
    '--d5-primary':       '#f75d00',
    '--d5-primary-hover': '#ff7a2b',
    '--d5-accent':        '#f9c22d',
    '--d5-success':       '#34d399',
    '--d5-success-2':     '#16a34a',
    '--d5-danger':        '#ef4444',
  };
  for (const [name, value] of Object.entries(expected)) {
    // match `--d5-bg: #0a0b0e` allowing flexible whitespace and lowercase hex
    const pat = re(`${name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*${value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}`);
    assert.match(
      ROOT, pat,
      `Expected :root to define \`${name}: ${value}\`. Found :root block:\n${ROOT.slice(0, 500)}…`,
    );
  }
});

test('Colour palette: primary and hover are distinct values', () => {
  assert.match(ROOT, /--d5-primary\s*:\s*#f75d00/i,  'missing --d5-primary');
  assert.match(ROOT, /--d5-primary-hover\s*:\s*#ff7a2b/i, 'missing --d5-primary-hover');
});

// ── 2. Google Fonts loaded ──────────────────────────────────────────────────

test('Fonts: Plus Jakarta Sans and JetBrains Mono linked from Google Fonts', () => {
  assert.match(INDEX, /fonts\.googleapis\.com\/css2[^"']*family=Plus\+Jakarta\+Sans/i,
    'Plus Jakarta Sans not requested from Google Fonts');
  assert.match(INDEX, /fonts\.googleapis\.com\/css2[^"']*family=JetBrains\+Mono/i,
    'JetBrains Mono not requested from Google Fonts');
});

test('Fonts: preconnect to both Google Fonts origins', () => {
  assert.match(INDEX, /<link[^>]*rel=["']preconnect["'][^>]*href=["']https:\/\/fonts\.googleapis\.com["']/i,
    'missing preconnect to fonts.googleapis.com');
  assert.match(INDEX, /<link[^>]*rel=["']preconnect["'][^>]*href=["']https:\/\/fonts\.gstatic\.com["'][^>]*crossorigin/i,
    'missing preconnect to fonts.gstatic.com (with crossorigin)');
});

// ── 3. Typography tokens + base styles ──────────────────────────────────────

test('Typography: --d5-font and --d5-font-mono defined; body applies --d5-font', () => {
  assert.match(ROOT, /--d5-font\s*:[^;]*Plus\+Jakarta\+Sans|Plus Jakarta Sans/i,
    '--d5-font does not reference Plus Jakarta Sans');
  assert.match(ROOT, /--d5-font-mono\s*:[^;]*JetBrains\+Mono|JetBrains Mono/i,
    '--d5-font-mono does not reference JetBrains Mono');
  assert.match(STYLE, /body\s*\{[^}]*font-family\s*:\s*var\(--d5-font\)/i,
    'body does not apply font-family: var(--d5-font)');
});

test('Typography: headings use letter-spacing -0.02em', () => {
  assert.match(STYLE, /h[1-4][^{]*\{[^}]*letter-spacing\s*:\s*-0\.02em/i,
    'no h1–h4 rule sets letter-spacing: -0.02em');
});

test('Typography: Plus Jakarta Sans weight 800 is requested', () => {
  assert.match(INDEX, /family=Plus\+Jakarta\+Sans[^"']*wght[^"']*800/i,
    'Plus Jakarta Sans wght list does not include 800');
});

// ── 4. Radii + shadows ──────────────────────────────────────────────────────

test('Shape: --d5-radius and --d5-shadow tokens defined', () => {
  assert.match(ROOT, /--d5-radius\s*:/, 'missing --d5-radius');
  assert.match(ROOT, /--d5-shadow\s*:/, 'missing --d5-shadow');
});

// ── 5. Scrollbars ───────────────────────────────────────────────────────────

test('Scrollbars: WebKit thin scrollbar with token-coloured thumb', () => {
  assert.match(STYLE, /::-\webkit-scrollbar\s*\{[^}]*width/i,
    'no ::-webkit-scrollbar rule with width');
  assert.match(STYLE, /::-\webkit-scrollbar-thumb\s*\{[^}]*var\(--d5/i,
    'no ::-webkit-scrollbar-thumb rule coloured from a --d5-* token');
});

test('Scrollbars: Firefox scrollbar-width:thin and scrollbar-color', () => {
  assert.match(STYLE, /scrollbar-width\s*:\s*thin/i,
    'no scrollbar-width: thin');
  assert.match(STYLE, /scrollbar-color\s*:[^;]*var\(--d5/i,
    'no scrollbar-color referencing a --d5-* token');
});

// ── 6. Motion keyframes ─────────────────────────────────────────────────────

test('Motion: all four @keyframes defined (d5b, d5pulse, d5fade, d5spin)', () => {
  for (const name of ['d5b', 'd5pulse', 'd5fade', 'd5spin']) {
    const count = (STYLE.match(new RegExp(`@keyframes\\s+${name}\\b`, 'g')) || []).length;
    assert.ok(count >= 1, `@keyframes ${name} not defined (found ${count} occurrence(s))`);
  }
});

// ── 7. Pill badge class ─────────────────────────────────────────────────────

test('Badge: .d5-badge class contract (radius + padding + token colour)', () => {
  const m = STYLE.match(/\.d5-badge\s*\{([^}]*)\}/);
  assert.ok(m, 'no .d5-badge rule found');
  const body = m[1];
  assert.match(body, /(border-radius|var\(--d5-radius)/i,
    '.d5-badge does not set border-radius or reference --d5-radius');
  assert.match(body, /padding/i, '.d5-badge does not set padding');
  assert.match(body, /var\(--d5-/i, '.d5-badge does not reference any --d5-* colour token');
});

// ── 8. No app.js regression ─────────────────────────────────────────────────

test('Regression: app/public/app.js is unmodified relative to HEAD', () => {
  const r = spawnSync('git', ['diff', '--name-only', 'HEAD', '--', 'app/public/app.js'],
    { cwd: REPO, encoding: 'utf8' });
  assert.equal(r.status, 0, `git diff failed: ${r.stderr}`);
  assert.equal(r.stdout.trim(), '',
    'app/public/app.js has been modified — Phase 0 must be CSS-only (no app.js changes)');
});
