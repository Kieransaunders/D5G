#!/usr/bin/env node
/**
 * section-recipes.test.js — scenarios for "reusable section recipes are available"
 * (spec-first-generation). RED until references/section-recipes/ is populated.
 *
 * Run:  node scripts/__tests__/section-recipes.test.js
 *   E1  the required blueprints exist
 *   E2  each blueprint validates as a spec fragment
 *   E3  hero-light pairs legible surfaces (passes the contrast gate)
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPTS = path.resolve(__dirname, '..');
const VALIDATE = path.join(SCRIPTS, 'validate.js');
const RECIPES = path.join(SCRIPTS, '..', 'references', 'section-recipes');
const { validateSpec } = require(path.join(SCRIPTS, 'spec', 'validate-spec.js'));
const { specToDivi } = require(path.join(SCRIPTS, 'spec', 'spec-to-divi.js'));

let pass = 0, fail = 0; const failures = [];
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recipes-'));
function ok(n, c, d) { if (c) pass++; else { fail++; failures.push(`  FAIL  ${n}${d ? ' — ' + d : ''}`); } }

const REQUIRED = ['hero-light', 'features-3col', 'cta-dark', 'footer'];
const load = (name) => JSON.parse(fs.readFileSync(path.join(RECIPES, `${name}.json`), 'utf8'));

// E1 — required blueprints exist
for (const name of REQUIRED) {
  ok(`E1: recipe "${name}.json" exists`, fs.existsSync(path.join(RECIPES, `${name}.json`)));
}

// E2 — each validates as a section inside a minimal page spec
for (const name of REQUIRED) {
  if (!fs.existsSync(path.join(RECIPES, `${name}.json`))) { ok(`E2: "${name}" validates`, false, 'missing'); continue; }
  const section = load(name);
  const spec = { slug: 't', sections: [section] };
  // ensure exactly one heroHeading overall for validate-spec
  const hasHero = JSON.stringify(section).includes('"heroHeading"');
  if (!hasHero) spec.sections.unshift({ id: 'h', layout: 'full', modules: [{ kind: 'heroHeading', text: 'x' }] });
  const { errors } = validateSpec(spec);
  ok(`E2: "${name}" validates as a spec fragment`, errors.length === 0, errors.join('; '));
}

// E3 — hero-light passes the contrast gate
(function () {
  const p = path.join(RECIPES, 'hero-light.json');
  if (!fs.existsSync(p)) { ok('E3: hero-light passes contrast gate', false, 'missing'); return; }
  const spec = { slug: 't', sections: [load('hero-light')] };
  const { pageJson } = specToDivi(spec);
  const f = path.join(tmp, 'hero.json'); fs.writeFileSync(f, pageJson);
  const r = spawnSync('node', [VALIDATE, f], { encoding: 'utf8' });
  ok('E3: hero-light -> no CONTRAST FAIL', !/FAIL\s+CONTRAST/i.test((r.stdout || '') + (r.stderr || '')), (r.stdout || '').slice(-160));
})();

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n── section-recipes results ──\n  ${pass} passed, ${fail} failed`);
if (failures.length) { failures.forEach(f => console.log(f)); process.exit(1); }
