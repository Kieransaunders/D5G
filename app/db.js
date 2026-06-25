'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

// ponytail: DIVI5_DATA_DIR override exists for test isolation; prod uses the default.
const DATA_DIR = process.env.DIVI5_DATA_DIR || path.join(os.homedir(), 'Library', 'Application Support', 'Divi5Generator');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(EXPORTS_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'history.db'));
db.pragma('journal_mode = WAL');   // concurrent reads while writing (app + any helper process)
db.pragma('busy_timeout = 5000');  // wait out transient locks instead of throwing

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

// ─── Chat sessions + transcript (resume-after-restart) ───────────────────────
// A chat session is identified by its durable Claude SDK session UUID
// (sdk_session_id) — that survives an app restart in ~/.claude/projects/, so it
// is the stable key. app_session_id is the *current* in-memory handle, which
// changes whenever a session is resumed into a fresh server process. We persist
// the visible transcript (chat_messages) so the left panel repopulates exactly
// as it was, and last_mockup_html / gen_id so the canvas can be restored too.
db.exec(`
  CREATE TABLE IF NOT EXISTS chat_sessions (
    sdk_session_id   TEXT PRIMARY KEY,
    app_session_id   TEXT,
    title            TEXT,
    last_mockup_html TEXT,
    last_mockup_title TEXT,
    gen_id           INTEGER,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    sdk_session_id TEXT NOT NULL REFERENCES chat_sessions(sdk_session_id),
    role           TEXT NOT NULL,
    content        TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_chat_messages_session
    ON chat_messages (sdk_session_id, id);
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
  // Persist the Stage 2 HTML preview in the DB so /preview-html survives the
  // output dir being cleaned (e.g. a /tmp purge) — the file on disk is fragile.
  `ALTER TABLE generations ADD COLUMN preview_html TEXT`,
  // Claude SDK session UUID — enables conversation resume on re-run (#2/#5/#6).
  `ALTER TABLE generations ADD COLUMN sdk_session_id TEXT`,
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

// A divi-export profile stores colours/fonts under data.variables.
// Derive the flat data.colors / data.fonts the rest of the app reads, while
// keeping the raw variables/presets intact for brand-deploy. Mirrors the
// client-side normalizeBrandData so generation sees the same tokens the UI shows.
function normalizeBrandData(data) {
  if (!data || typeof data !== 'object') return data;
  if (!Array.isArray(data.colors) || data.colors.length === 0) {
    const gc = data.variables && data.variables.global_colors;
    if (Array.isArray(gc) && gc.length) {
      data.colors = gc
        .filter(t => Array.isArray(t) && t[1] && t[1].color)
        .map(([gcid, m]) => ({ role: m.label || gcid, hex: m.color, source: 'divi', gcid }));
    }
  }
  if (!data.fonts || (!data.fonts.heading && !data.fonts.body)) {
    const gv = data.variables && data.variables.global_variables;
    if (Array.isArray(gv)) {
      const fonts = gv.filter(v => v && v.type === 'fonts');
      const find = re => (fonts.find(f => re.test(f.id || '')) || {}).value;
      const heading = find(/heading/i), body = find(/body/i);
      if (heading || body) {
        data.fonts = data.fonts || {};
        if (heading) data.fonts.heading = { family: heading };
        if (body) data.fonts.body = { family: body };
      }
    }
  }
  return data;
}

function getBrandProfile(id) {
  const row = db.prepare('SELECT * FROM brand_profiles WHERE id=?').get(id);
  if (!row) return undefined;
  return { ...row, data: normalizeBrandData(JSON.parse(row.data)) };
}

function listBrandProfiles() {
  return db.prepare('SELECT * FROM brand_profiles ORDER BY id DESC').all()
    .map(r => ({ ...r, data: normalizeBrandData(JSON.parse(r.data)) }));
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

/**
 * Delete a design project. When keepPages is false, also delete the linked
 * generations (and their output_files). When true (default), just unlink them.
 */
function deleteDesignProject(id, keepPages = true) {
  const genIds = db.prepare('SELECT generation_id FROM design_pages WHERE design_id=?')
    .all(id).map(r => r.generation_id).filter(Boolean);
  if (!keepPages && genIds.length) {
    const placeholders = genIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM output_files WHERE generation_id IN (${placeholders})`).run(...genIds);
    db.prepare(`DELETE FROM generations WHERE id IN (${placeholders})`).run(...genIds);
  } else {
    db.prepare('UPDATE generations SET design_id=NULL WHERE design_id=?').run(id);
  }
  db.prepare('DELETE FROM design_pages WHERE design_id=?').run(id);
  db.prepare('DELETE FROM design_projects WHERE id=?').run(id);
}

// ─── Chat session helpers ────────────────────────────────────────────────────

// Derive a short, human title from the first user message of a session.
function deriveSessionTitle(firstUserMessage) {
  const t = String(firstUserMessage || '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Untitled chat';
  return t.length > 60 ? t.slice(0, 57) + '…' : t;
}

// Insert or update the session row keyed by the durable SDK session id. Only
// sets the title on first insert (the first user message names the chat).
// Patch fields (appSessionId, mockup, genId) update in place when provided.
function upsertChatSession({ sdkSessionId, appSessionId = null, title = null, lastMockupHtml = undefined, lastMockupTitle = undefined, genId = undefined }) {
  if (!sdkSessionId) return;
  const existing = db.prepare('SELECT sdk_session_id FROM chat_sessions WHERE sdk_session_id=?').get(sdkSessionId);
  if (!existing) {
    db.prepare(`INSERT INTO chat_sessions (sdk_session_id, app_session_id, title) VALUES (?, ?, ?)`)
      .run(sdkSessionId, appSessionId, title || 'Untitled chat');
  }
  const sets = ['updated_at=datetime(\'now\')'];
  const args = [];
  if (appSessionId != null)        { sets.push('app_session_id=?');    args.push(appSessionId); }
  if (lastMockupHtml !== undefined){ sets.push('last_mockup_html=?');  args.push(lastMockupHtml); }
  if (lastMockupTitle !== undefined){ sets.push('last_mockup_title=?'); args.push(lastMockupTitle); }
  if (genId !== undefined)         { sets.push('gen_id=?');            args.push(genId); }
  args.push(sdkSessionId);
  db.prepare(`UPDATE chat_sessions SET ${sets.join(', ')} WHERE sdk_session_id=?`).run(...args);
}

function addChatMessage({ sdkSessionId, role, content }) {
  if (!sdkSessionId || !role) return;
  db.prepare(`INSERT INTO chat_messages (sdk_session_id, role, content) VALUES (?, ?, ?)`)
    .run(sdkSessionId, role, String(content == null ? '' : content));
  db.prepare(`UPDATE chat_sessions SET updated_at=datetime('now') WHERE sdk_session_id=?`).run(sdkSessionId);
}

// Recent sessions for the picker, newest first, with a message count.
function listChatSessions(limit = 30) {
  return db.prepare(`
    SELECT s.sdk_session_id, s.title, s.gen_id, s.created_at, s.updated_at,
           (SELECT COUNT(*) FROM chat_messages m WHERE m.sdk_session_id = s.sdk_session_id) AS message_count
    FROM chat_sessions s
    WHERE EXISTS (SELECT 1 FROM chat_messages m WHERE m.sdk_session_id = s.sdk_session_id)
    ORDER BY s.updated_at DESC
    LIMIT ?`).all(limit);
}

// Full session for restore: row + ordered transcript.
function getChatSession(sdkSessionId) {
  const session = db.prepare('SELECT * FROM chat_sessions WHERE sdk_session_id=?').get(sdkSessionId);
  if (!session) return null;
  const messages = db.prepare('SELECT role, content, created_at FROM chat_messages WHERE sdk_session_id=? ORDER BY id').all(sdkSessionId);
  return { session, messages };
}

function deleteChatSession(sdkSessionId) {
  db.prepare('DELETE FROM chat_messages WHERE sdk_session_id=?').run(sdkSessionId);
  db.prepare('DELETE FROM chat_sessions WHERE sdk_session_id=?').run(sdkSessionId);
}

module.exports = {
  db, DATA_DIR, EXPORTS_DIR,
  deriveSessionTitle, upsertChatSession, addChatMessage,
  listChatSessions, getChatSession, deleteChatSession,
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, findDesignByBrandExport, promoteIfEligible,
  deleteDesignProject,
};
