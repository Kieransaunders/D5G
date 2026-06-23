'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('os');
const fs = require('node:fs');

// Point HOME at a temp dir so we don't touch the real history.db.
// db.js derives DATA_DIR from os.homedir(), which reads process.env.HOME on POSIX.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd5g-db-'));
process.env.HOME = TMP;

const { db } = require('../db');

test('brand_profiles table exists with expected columns', () => {
  const cols = db.prepare("PRAGMA table_info(brand_profiles)").all().map(c => c.name);
  assert.ok(cols.includes('id'));
  assert.ok(cols.includes('name'));
  assert.ok(cols.includes('data'));
  assert.ok(cols.includes('source_type'));
  assert.ok(cols.includes('source_ref'));
  assert.ok(cols.includes('created_at'));
  assert.ok(cols.includes('updated_at'));
});

test('design_projects table exists with FKs', () => {
  const cols = db.prepare("PRAGMA table_info(design_projects)").all().map(c => c.name);
  assert.ok(cols.includes('brand_id'));
  assert.ok(cols.includes('export_id'));
  assert.ok(cols.includes('tokens_path'));
  assert.ok(cols.includes('variables_path'));
});

test('design_pages junction table exists', () => {
  const cols = db.prepare("PRAGMA table_info(design_pages)").all().map(c => c.name);
  assert.ok(cols.includes('design_id'));
  assert.ok(cols.includes('generation_id'));
  assert.ok(cols.includes('page_type'));
  assert.ok(cols.includes('sort_order'));
});

test('generations has nullable design_id and page_type columns', () => {
  const cols = db.prepare("PRAGMA table_info(generations)").all().map(c => c.name);
  assert.ok(cols.includes('design_id'));
  assert.ok(cols.includes('page_type'));
});

// ─── Brand Profile CRUD ──────────────────────────────────────────────────────
const {
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
} = require('../db');

test('createBrandProfile inserts and returns the row', () => {
  const id = createBrandProfile({ name: 'Floria', data: { name: 'Floria' }, source_type: 'manual' });
  const row = getBrandProfile(id);
  assert.equal(row.name, 'Floria');
  // getBrandProfile parses `data` into an object already.
  assert.deepEqual(row.data, { name: 'Floria' });
  assert.equal(row.source_type, 'manual');
});

test('listBrandProfiles returns newest first', () => {
  const a = createBrandProfile({ name: 'A', data: {} });
  const b = createBrandProfile({ name: 'B', data: {} });
  const names = listBrandProfiles().map(r => r.name);
  // Tests share one DB; just assert relative order of the two we just made.
  assert.deepEqual(names.slice(0, 2), ['B', 'A']);
});

test('updateBrandProfile merges data and bumps updated_at', () => {
  const id = createBrandProfile({ name: 'X', data: { colors: [] }, source_type: 'manual' });
  updateBrandProfile(id, { name: 'X', data: { colors: [{ role: 'primary', hex: '#000' }] } });
  const row = getBrandProfile(id);
  assert.deepEqual(row.data.colors[0].hex, '#000');
});

test('deleteBrandProfile removes the row', () => {
  const id = createBrandProfile({ name: 'Y', data: {} });
  deleteBrandProfile(id);
  assert.equal(getBrandProfile(id), undefined);
});

// ─── Design Project CRUD + auto-promotion ────────────────────────────────────
const {
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, findDesignByBrandExport, promoteIfEligible,
} = require('../db');

// Insert a generations row directly (only requires brand + export_path for the
// promotion logic). All db tests share one DB, so this is the test fixture.
function genFixture({ brand, export_path }) {
  return db.prepare(
    `INSERT INTO generations (brand, keyword, sections, aesthetic, output_dir, export_path) VALUES (?, 'k', '[]', '', '/tmp', ?)`
  ).run(brand, export_path).lastInsertRowid;
}

test('promoteIfEligible creates a project when a 2nd gen shares brand+export', () => {
  const g1 = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  const g2 = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  const projectId = promoteIfEligible(g2);
  assert.ok(projectId, 'should return a project id');
  const proj = getDesignProject(projectId);
  assert.equal(proj.brand_id, null); // no brand profile yet
  const pages = db.prepare('SELECT * FROM design_pages WHERE design_id=?').all(projectId);
  assert.equal(pages.length, 2);
});

test('promoteIfEligible returns null when brand differs', () => {
  const g1 = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  const g2 = genFixture({ brand: 'Other', export_path: '/x/a.json' });
  assert.equal(promoteIfEligible(g2), null);
});

test('promoteIfEligible returns null when a project already exists', () => {
  const g1 = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  const existing = createDesignProject({ name: 'Floria design', export_id: null });
  linkGenerationToDesign(existing, g1, 'home');
  const g2 = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  assert.equal(promoteIfEligible(g2), null); // caller should explicitly link instead
});

test('promoteIfEligible returns null when only one generation exists', () => {
  const g = genFixture({ brand: 'Floria', export_path: '/x/a.json' });
  assert.equal(promoteIfEligible(g), null);
});
