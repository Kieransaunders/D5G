'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const DATA_DIR = path.join(os.homedir(), 'Library', 'Application Support', 'Divi5Generator');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(EXPORTS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'history.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS generations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    brand           TEXT NOT NULL,
    keyword         TEXT NOT NULL,
    sections        TEXT NOT NULL,
    aesthetic       TEXT NOT NULL,
    cta_label       TEXT,
    cta_url         TEXT,
    output_dir      TEXT NOT NULL,
    export_path     TEXT,
    status          TEXT NOT NULL DEFAULT 'running',
    style_check     TEXT,
    spec_check      TEXT,
    validator_errors INTEGER DEFAULT 0,
    validator_warns  INTEGER DEFAULT 0,
    log             TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS output_files (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    generation_id  INTEGER REFERENCES generations(id),
    filename       TEXT NOT NULL,
    filepath       TEXT NOT NULL,
    kind           TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS designer_exports (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    saved_at     TEXT NOT NULL DEFAULT (datetime('now')),
    label        TEXT NOT NULL,
    brand        TEXT NOT NULL,
    filepath     TEXT NOT NULL,
    preset_count INTEGER DEFAULT 0,
    colour_count INTEGER DEFAULT 0
  );
`);

// ─── Saved briefs ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS saved_briefs (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    name       TEXT NOT NULL,
    data       TEXT NOT NULL
  );
`);

// ─── Brand Profiles / Design Projects (chat-driven brand-design layer) ───────
db.exec(`
  CREATE TABLE IF NOT EXISTS brand_profiles (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,
    source_type TEXT,
    source_ref  TEXT
  );

  CREATE TABLE IF NOT EXISTS design_projects (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    name            TEXT NOT NULL,
    brand_id        INTEGER REFERENCES brand_profiles(id),
    export_id       INTEGER REFERENCES designer_exports(id),
    tokens_path     TEXT,
    variables_path  TEXT,
    notes           TEXT
  );

  CREATE TABLE IF NOT EXISTS design_pages (
    design_id     INTEGER REFERENCES design_projects(id),
    generation_id INTEGER REFERENCES generations(id),
    page_type     TEXT,
    sort_order    INTEGER DEFAULT 0,
    PRIMARY KEY (design_id, generation_id)
  );
`);

// ─── Migrations: add new columns if they don't exist ────────────────────────
const migrations = [
  `ALTER TABLE generations ADD COLUMN import_status TEXT`,
  `ALTER TABLE generations ADD COLUMN preview_url TEXT`,
  `ALTER TABLE generations ADD COLUMN brief_json TEXT`,
  `ALTER TABLE generations ADD COLUMN saved_export_id INTEGER`,
  `ALTER TABLE generations ADD COLUMN what_it_does TEXT`,
  `ALTER TABLE generations ADD COLUMN secondary_keywords TEXT`,
  `ALTER TABLE generations ADD COLUMN has_preview INTEGER DEFAULT 0`,
  `ALTER TABLE generations ADD COLUMN et_template TEXT`,
  `ALTER TABLE generations ADD COLUMN design_id INTEGER`,
  `ALTER TABLE generations ADD COLUMN page_type TEXT`,
];
for (const sql of migrations) {
  try { db.exec(sql); } catch (_) {}
}

// ─── Brand Profile helpers ───────────────────────────────────────────────────
function createBrandProfile({ name, data, source_type = null, source_ref = null }) {
  return db.prepare(
    `INSERT INTO brand_profiles (name, data, source_type, source_ref) VALUES (?, ?, ?, ?)`
  ).run(name, JSON.stringify(data), source_type, source_ref).lastInsertRowid;
}

function getBrandProfile(id) {
  const row = db.prepare('SELECT * FROM brand_profiles WHERE id=?').get(id);
  if (!row) return undefined;
  return { ...row, data: JSON.parse(row.data) };
}

function listBrandProfiles() {
  return db.prepare('SELECT * FROM brand_profiles ORDER BY id DESC').all()
    .map(r => ({ ...r, data: JSON.parse(r.data) }));
}

function updateBrandProfile(id, { name, data, source_type, source_ref }) {
  const existing = getBrandProfile(id);
  if (!existing) throw new Error(`brand_profile ${id} not found`);
  const merged = {
    name:        name        ?? existing.name,
    data:        data        ?? existing.data,
    source_type: source_type ?? existing.source_type,
    source_ref:  source_ref  ?? existing.source_ref,
  };
  db.prepare(
    `UPDATE brand_profiles SET name=?, data=?, source_type=?, source_ref=?, updated_at=datetime('now') WHERE id=?`
  ).run(merged.name, JSON.stringify(merged.data), merged.source_type, merged.source_ref, id);
}

function deleteBrandProfile(id) {
  db.prepare('DELETE FROM brand_profiles WHERE id=?').run(id);
}

// ─── Design Project helpers + auto-promotion ─────────────────────────────────
function createDesignProject({ name, brand_id = null, export_id = null, tokens_path = null, variables_path = null, notes = null }) {
  return db.prepare(
    `INSERT INTO design_projects (name, brand_id, export_id, tokens_path, variables_path, notes) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(name, brand_id, export_id, tokens_path, variables_path, notes).lastInsertRowid;
}

function getDesignProject(id) {
  return db.prepare('SELECT * FROM design_projects WHERE id=?').get(id);
}

function listDesignProjects() {
  return db.prepare(`
    SELECT p.*, b.name AS brand_name,
           (SELECT COUNT(*) FROM design_pages dp WHERE dp.design_id = p.id) AS page_count
    FROM design_projects p
    LEFT JOIN brand_profiles b ON b.id = p.brand_id
    ORDER BY p.id DESC
  `).all();
}

function linkGenerationToDesign(designId, generationId, pageType, sortOrder = 0) {
  db.prepare(
    `INSERT INTO design_pages (design_id, generation_id, page_type, sort_order) VALUES (?, ?, ?, ?)
     ON CONFLICT(design_id, generation_id) DO UPDATE SET page_type=excluded.page_type`
  ).run(designId, generationId, pageType, sortOrder);
  db.prepare('UPDATE generations SET design_id=? WHERE id=?').run(designId, generationId);
}

function findDesignByBrandExport(brand, exportPath) {
  // A design is anchored by (brand_id OR brand name on a generation) + (export_id
  // OR export_path on a generation). For auto-promotion we match on the raw brand
  // string + export_path of linked generations.
  return db.prepare(`
    SELECT dp.* FROM design_projects dp
    JOIN design_pages dpv ON dpv.design_id = dp.id
    JOIN generations g ON g.id = dpv.generation_id
    WHERE g.brand = ? AND g.export_path = ?
    LIMIT 1
  `).get(brand, exportPath) || null;
}

/**
 * Returns the new project id if a generation qualifies for auto-promotion, else null.
 * Qualifies when: another generation exists with the same brand + same export_path
 * AND no design project yet groups that brand+export pair.
 */
function promoteIfEligible(generationId) {
  const gen = db.prepare('SELECT brand, export_path FROM generations WHERE id=?').get(generationId);
  if (!gen || !gen.brand || !gen.export_path) return null;

  const sibling = db.prepare(`
    SELECT id FROM generations
    WHERE brand=? AND export_path=? AND id != ?
    LIMIT 1
  `).get(gen.brand, gen.export_path, generationId);
  if (!sibling) return null;

  if (findDesignByBrandExport(gen.brand, gen.export_path)) return null;

  const projectId = createDesignProject({ name: `${gen.brand} design` });
  linkGenerationToDesign(projectId, generationId, 'home', 0);
  linkGenerationToDesign(projectId, sibling.id, 'home', 0); // sibling page_type resolved later by user
  return projectId;
}

module.exports = {
  db, DATA_DIR, EXPORTS_DIR,
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, findDesignByBrandExport, promoteIfEligible,
};
