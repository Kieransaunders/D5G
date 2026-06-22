# Chat-driven Divi 5 Generator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Make the Divi 5 Generator app chat-primary, with explicit Brand Profiles (extractable from URL / Divi export / image / chat / manual), Design Projects that group pages on the same brand+tokens, inline chat previews, and importer plugin support for listing/deleting drafts.

**Architecture:** Evolutionary, not rewrite. New `brand_profiles` / `design_projects` / `design_pages` SQLite tables layered on the existing `generations` schema. Chat becomes the default tab; the existing form collapses into a "Structured brief" drawer. Generation pipeline is untouched — chat emits a `GEN_INTENT` marker that renders a confirm card, which then calls `/generate` as today. Two new REST endpoints on the importer plugin (`GET /pages`, `DELETE /pages`).

**Tech Stack:** Node.js + Express + better-sqlite3 (app), vanilla JS + SSE (frontend), PHP (importer plugin), Markdown skill files. Tests via Node's built-in `node:test` runner (existing pattern in `app/tests/`).

**Reference:** Design rationale, entity graph, schema, and risks live in [`docs/plans/2026-06-22-chat-driven-brand-design-projects.md`](./2026-06-22-chat-driven-brand-design-projects.md). Read it first.

**Working directory:** `/Volumes/External/Divi5Generate`

**Conventions:**
- TDD for all logic (DB helpers, endpoints, SSRF guards, marker parsing, plugin REST).
- For pure UI: implement → verify in browser at http://localhost:3747 → add integration test where feasible.
- One commit per task. Commit messages: `feat(<area>): …`, `test(<area>): …`, `docs(<area>): …`.
- Run `npm test` from `app/` after every logic task. Run the app (`npm start` from `app/`) after every UI task to sanity check.
- Never commit secrets/API keys. Never commit nested `.zip` files (the plugin installer rejects them).

---

## Phase 1 — Data model foundation

All schema + helper work, no UI. Fully testable in isolation. This is the bedrock; everything else builds on it.

### Task 1.1: Add `brand_profiles`, `design_projects`, `design_pages` tables

**Files:**
- Modify: `app/db.js`
- Test: `app/tests/db.test.js` (create)

**Step 1: Write the failing test**

Create `app/tests/db.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('os');
const fs = require('node:fs');

// Point DATA_DIR at a temp dir so we don't touch the real history.db
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'd5g-db-'));
process.env.HOME = TMP; // db.js uses os.homedir()

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
```

**Step 2: Run to verify it fails**

```bash
cd app && node --test tests/db.test.js
```
Expected: FAIL — `PRAGMA table_info(brand_profiles)` returns empty.

**Step 3: Implement**

In `app/db.js`, add after the existing `saved_briefs` block:

```js
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
```

Append to the existing `migrations` array:

```js
  `ALTER TABLE generations ADD COLUMN design_id INTEGER`,
  `ALTER TABLE generations ADD COLUMN page_type TEXT`,
```

**Step 4: Run to verify it passes**

```bash
cd app && node --test tests/db.test.js
```
Expected: PASS (4 tests).

**Step 5: Commit**

```bash
git add app/db.js app/tests/db.test.js
git commit -m "feat(db): add brand_profiles, design_projects, design_pages tables"
```

---

### Task 1.2: Brand Profile CRUD helpers

**Files:**
- Modify: `app/db.js` (add helpers exported alongside `db`)
- Test: `app/tests/db.test.js` (extend)

**Step 1: Add failing tests** — append to `app/tests/db.test.js`:

```js
const {
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
} = require('../db');

test('createBrandProfile inserts and returns the row', () => {
  const id = createBrandProfile({ name: 'Floria', data: { name: 'Floria' }, source_type: 'manual' });
  const row = getBrandProfile(id);
  assert.equal(row.name, 'Floria');
  assert.deepEqual(JSON.parse(row.data), { name: 'Floria' });
  assert.equal(row.source_type, 'manual');
});

test('listBrandProfiles returns newest first', () => {
  const a = createBrandProfile({ name: 'A', data: {} });
  const b = createBrandProfile({ name: 'B', data: {} });
  const names = listBrandProfiles().map(r => r.name);
  assert.deepEqual(names, ['B', 'A']);
});

test('updateBrandProfile merges data and bumps updated_at', () => {
  const id = createBrandProfile({ name: 'X', data: { colors: [] }, source_type: 'manual' });
  updateBrandProfile(id, { name: 'X', data: { colors: [{ role: 'primary', hex: '#000' }] } });
  const row = getBrandProfile(id);
  assert.deepEqual(JSON.parse(row.data).colors[0].hex, '#000');
});

test('deleteBrandProfile removes the row', () => {
  const id = createBrandProfile({ name: 'Y', data: {} });
  deleteBrandProfile(id);
  assert.equal(getBrandProfile(id), undefined);
});
```

**Step 2: Run to verify it fails**

```bash
node --test tests/db.test.js
```
Expected: FAIL — `createBrandProfile is not a function`.

**Step 3: Implement** — add to `app/db.js` before `module.exports`:

```js
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
```

Update `module.exports`:

```js
module.exports = {
  db, DATA_DIR, EXPORTS_DIR,
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
};
```

**Step 4: Run to verify it passes**

```bash
node --test tests/db.test.js
```
Expected: PASS (8 tests total).

**Step 5: Commit**

```bash
git add app/db.js app/tests/db.test.js
git commit -m "feat(db): brand profile CRUD helpers"
```

---

### Task 1.3: Design Project CRUD helpers + auto-promotion logic

**Files:**
- Modify: `app/db.js`
- Test: `app/tests/db.test.js` (extend)

**Step 1: Add failing tests** — append:

```js
const {
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, findDesignByBrandExport, promoteIfEligible,
  createGenerationFixture,  // test helper, see below
} = require('../db');

// Reset-friendly: tests insert directly into generations
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
```

**Step 2: Run to verify it fails**

```bash
node --test tests/db.test.js
```
Expected: FAIL — `createDesignProject is not a function`.

**Step 3: Implement** — add to `app/db.js`:

```js
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
  // A design is anchored by (brand_id OR brand name on a generation) + (export_id OR export_path on a generation).
  // For auto-promotion we match on the raw brand string + export_path of linked generations.
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

module.exports.createGenerationFixture = genFixture; // alias for tests (optional)
```

Add the new helpers to `module.exports`.

**Step 4: Run to verify it passes**

```bash
node --test tests/db.test.js
```
Expected: PASS (12 tests total).

**Step 5: Commit**

```bash
git add app/db.js app/tests/db.test.js
git commit -m "feat(db): design project CRUD + auto-promotion logic"
```

---

## Phase 2 — Brand Profile REST API + manual UI

Wiring the manual path first so the entity is usable end-to-end before tackling extraction complexity.

### Task 2.1: Brand Profile REST endpoints

**Files:**
- Modify: `app/server.js`
- Test: `app/tests/server.test.js` (extend)

**Step 1: Add failing tests** — append to `app/tests/server.test.js`. Follow the existing pattern (spawn server on test port, raw HTTP requests). Example:

```js
test('POST /brand creates a profile, GET /brand lists it', async () => {
  const post = await request('POST', '/brand', { name: 'Floria', data: { colors: [] }, source_type: 'manual' });
  assert.equal(post.status, 200);
  const postId = JSON.parse(post.body).id;
  assert.ok(postId);

  const list = await request('GET', '/brand');
  assert.equal(list.status, 200);
  const rows = JSON.parse(list.body);
  assert.ok(rows.some(r => r.id === postId && r.name === 'Floria'));
});

test('PUT /brand/:id updates data', async () => {
  const post = await request('POST', '/brand', { name: 'X', data: { colors: [] } });
  const id = JSON.parse(post.body).id;
  const put = await request('PUT', `/brand/${id}`, { data: { colors: [{ role: 'primary', hex: '#1A2744' }] } });
  assert.equal(put.status, 200);
  const get = await request('GET', `/brand/${id}`);
  assert.deepEqual(JSON.parse(get.body).data.colors[0].hex, '#1A2744');
});

test('DELETE /brand/:id removes the profile', async () => {
  const post = await request('POST', '/brand', { name: 'Y', data: {} });
  const id = JSON.parse(post.body).id;
  const del = await request('DELETE', `/brand/${id}`);
  assert.equal(del.status, 200);
  const get = await request('GET', `/brand/${id}`);
  assert.equal(get.status, 404);
});
```

If `request()` helper doesn't exist yet in the test file, add one returning `{ status, body }`. (Likely already there — check first.)

**Step 2: Run to verify it fails**

```bash
cd app && node --test tests/server.test.js
```
Expected: FAIL — 404 on POST /brand.

**Step 3: Implement** — add to `app/server.js` (after the existing `/briefs` routes):

```js
const {
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
} = require('./db');

// ─── /brand — Brand Profile CRUD ────────────────────────────────────────────
app.get('/brand', (_req, res) => {
  res.json(listBrandProfiles());
});

app.get('/brand/:id', (req, res) => {
  const row = getBrandProfile(parseInt(req.params.id));
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/brand', (req, res) => {
  const { name, data, source_type, source_ref } = req.body;
  if (!name || !data) return res.status(400).json({ error: 'name and data required' });
  const id = createBrandProfile({ name, data, source_type: source_type || 'manual', source_ref });
  res.json({ id });
});

app.put('/brand/:id', (req, res) => {
  const { name, data, source_type, source_ref } = req.body;
  try {
    updateBrandProfile(parseInt(req.params.id), { name, data, source_type, source_ref });
    res.json({ ok: true });
  } catch (e) { res.status(404).json({ error: e.message }); }
});

app.delete('/brand/:id', (req, res) => {
  deleteBrandProfile(parseInt(req.params.id));
  res.json({ ok: true });
});
```

**Step 4: Run to verify it passes**

```bash
node --test tests/server.test.js
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/server.js app/tests/server.test.js
git commit -m "feat(api): brand profile CRUD endpoints"
```

---

### Task 2.2: Brand tab UI — grid + manual edit form

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** (UI task — verify by inspection)

In `index.html`:
- Add a `Brand` button to the `.tab-bar` (between Generate and Chat per design, or wherever natural — design says sidebar order is `Chat · Brand · Designs · Settings`).
- Add `<div id="tab-brand" hidden>…</div>` containing:
  - A "New Brand Profile" button group: *From URL*, *From Divi export*, *From image*, *From chat*, *Blank*.
  - A `<div id="brandGrid"></div>` for cards.
  - A hidden `<div id="brandEditor" hidden>…</div>` modal/inline panel with: name input, colours list (`#brandColors`), font dropdowns (`brandHeadingFont`, `brandBodyFont`), logo upload (`#brandLogoInput`), voice textarea, tagline input, save/delete buttons.

In `app.js`:
- `loadBrandGrid()` → GET `/brand` → render cards (palette swatches, font names, logo thumbnail).
- `openBrandEditor(id|null)` → load profile (or blank) into the editor.
- `addBrandColorRow(role, hex, source)`, `removeBrandColorRow(idx)` — dynamic colour rows.
- `saveBrandProfile()` → POST or PUT `/brand`.
- `deleteBrandProfileUI()` → confirm → DELETE → refresh grid.

In `style.css`:
- `.brand-grid`, `.brand-card`, `.brand-card-swatches`, `.brand-editor`, `.color-row` etc. Follow the existing CSS variables (`--surface`, `--border`, `--text`, `--muted`).

**Step 2: Verify in browser**

```bash
cd app && npm start
# open http://localhost:3747, click Brand tab
```
Create a blank profile, add a couple of colours, save, see it in the grid. Edit it, change a colour, save. Delete it.

**Step 3: Commit**

```bash
git add app/public/
git commit -m "feat(ui): brand tab with grid + manual editor"
```

---

## Phase 3 — Brand extraction paths

Each source is its own task. Order: URL (most complex, highest risk) → Divi export (extend existing) → Image → Chat. Manual is done in Phase 2.

### Task 3.1: SSRF guard utility

**Files:**
- Create: `app/lib/ssrf-guard.js`
- Test: `app/tests/ssrf-guard.test.js`

**Step 1: Write failing test** — `app/tests/ssrf-guard.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { isSafeHost } = require('../lib/ssrf-guard');

test('blocks loopback IPv4', async () => {
  assert.equal(await isSafeHost('127.0.0.1'), false);
  assert.equal(await isSafeHost('127.255.255.255'), false);
});
test('blocks private ranges', async () => {
  assert.equal(await isSafeHost('10.0.0.1'), false);
  assert.equal(await isSafeHost('192.168.1.1'), false);
  assert.equal(await isSafeHost('172.16.0.1'), false);
  assert.equal(await isSafeHost('172.31.255.255'), false);
});
test('blocks link-local', async () => {
  assert.equal(await isSafeHost('169.254.1.1'), false);
});
test('blocks .local mDNS', async () => {
  assert.equal(await isSafeHost('something.local'), false);
});
test('allows public hostnames', async () => {
  // use a known public DNS name
  assert.equal(await isSafeHost('example.com'), true);
});
```

**Step 2: Run to fail**

```bash
node --test tests/ssrf-guard.test.js
```
Expected: FAIL — module not found.

**Step 3: Implement** — `app/lib/ssrf-guard.js`:

```js
'use strict';
const dns = require('node:dns').promises;
const net = require('node:net');

const BLOCKED_SUFFIXES = ['.local', '.internal', '.localhost'];

function ipInRange(ip, cidr) {
  const [base, bits] = cidr.split('/');
  const b = base.split('.').map(Number);
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  const ipInt = ip.split('.').reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
  const baseInt = b.reduce((acc, o) => (acc << 8) + Number(o), 0) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

const BLOCKED_CIDRS = ['127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'];

async function isSafeHost(hostname) {
  const h = hostname.toLowerCase().trim();
  if (BLOCKED_SUFFIXES.some(s => h.endsWith(s))) return false;
  if (net.isIPv4(h)) return !BLOCKED_CIDRS.some(c => ipInRange(h, c));
  if (net.isIPv6(h) && (h === '::1' || h.startsWith('fe80'))) return false;
  let addrs;
  try { addrs = await dns.lookup(h, { all: true }); }
  catch { return false; }
  return addrs.every(a => !BLOCKED_CIDRS.some(c => ipInRange(a.address, c))) &&
         addrs.every(a => !(net.isIPv6(a.address) && (a.address === '::1' || a.address.startsWith('fe80'))));
}

module.exports = { isSafeHost, ipInRange };
```

**Step 4: Run to pass**

```bash
node --test tests/ssrf-guard.test.js
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/lib/ssrf-guard.js app/tests/ssrf-guard.test.js
git commit -m "feat(app): SSRF guard for URL-based brand extraction"
```

---

### Task 3.2: URL fetch + bundle endpoint

**Files:**
- Modify: `app/server.js`
- Test: `app/tests/server.test.js` (extend)

**Step 1: Write failing test** (mock the upstream fetch by hitting a known stable URL like `https://example.com`, or stub `global.fetch`):

```js
test('GET /brand/extract-url rejects private IPs', async () => {
  const r = await request('GET', '/brand/extract-url?url=http://127.0.0.1/');
  assert.equal(r.status, 400);
  assert.ok(/blocked/i.test(r.body));
});

test('GET /brand/extract-url rejects missing url param', async () => {
  const r = await request('GET', '/brand/extract-url');
  assert.equal(r.status, 400);
});

test('GET /brand/extract-url returns a bundle for a public URL', async () => {
  // example.com is a stable public page; assert shape, not exact content
  const r = await request('GET', '/brand/extract-url?url=https://example.com');
  assert.equal(r.status, 200);
  const body = JSON.parse(r.body);
  assert.ok(body.title);
  assert.ok(Array.isArray(body.colors) || Array.isArray(body.fonts));
});
```

> Note: the third test hits the real network. If CI flakiness becomes an issue, swap to a local fixture server. Keep it for now.

**Step 2: Run to fail**

```bash
node --test tests/server.test.js
```
Expected: FAIL — endpoint missing.

**Step 3: Implement** — add to `app/server.js`:

```js
const { isSafeHost } = require('./lib/ssrf-guard');
const { URL } = require('url');

// ─── GET /brand/extract-url — fetch + parse a public page ───────────────────
app.get('/brand/extract-url', async (req, res) => {
  const raw = req.query.url;
  if (!raw) return res.status(400).json({ error: 'url query param required' });
  let url;
  try { url = new URL(raw); }
  catch { return res.status(400).json({ error: 'invalid url' }); }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return res.status(400).json({ error: 'only http/https allowed' });
  }
  if (!(await isSafeHost(url.hostname))) {
    return res.status(400).json({ error: 'blocked: private/loopback/link-local host' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  let upstream;
  try {
    upstream = await fetch(raw, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Divi5Generator/1.0 (brand-extractor)' },
    });
  } catch (e) {
    return res.status(502).json({ error: `fetch failed: ${e.message}` });
  } finally { clearTimeout(timeout); }

  const MAX = 1024 * 1024;
  // Read up to MAX+1 bytes so we can detect truncation.
  const reader = upstream.body.getReader();
  let buf = Buffer.alloc(0);
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf = Buffer.concat([buf, value]);
    if (buf.length > MAX) { truncated = true; buf = buf.slice(0, MAX); break; }
  }
  const html = buf.toString('utf8');

  const bundle = extractPageBundle(html, url);
  res.json({ ...bundle, truncated, sourceUrl: raw });
});

// ─── bundle parser (pure, exported for testing) ─────────────────────────────
function extractPageBundle(html, url) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  const metaDesc = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '';
  const ogImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i) || [])[1] || '';
  const favicon = (html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i) || [])[1] || '';

  const colors = [...new Set((html.match(/#[0-9a-fA-F]{6}\b/g) || []).map(s => s.toLowerCase()))].slice(0, 20);
  const fontFamilies = [...new Set(
    [...html.matchAll(/font-family\s*:\s*([^;"']+)/gi)]
      .map(m => m[1].split(',')[0].trim().replace(/["']/g, ''))
      .filter(Boolean)
  )].slice(0, 10);

  // Stylesheet hrefs (don't fetch them — pass to Claude if needed later)
  const stylesheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']*)["']/gi)]
    .map(m => m[1]).slice(0, 5)
    .map(href => { try { return new URL(href, url).href; } catch { return href; } });

  return { title, metaDesc, ogImage, favicon, colors, fonts: fontFamilies, stylesheets };
}

module.exports = { extractPageBundle };
```

> **Tip:** also export `extractPageBundle` from `server.js` so it's directly unit-testable without HTTP.

**Step 4: Run to pass**

```bash
node --test tests/server.test.js
```
Expected: PASS.

**Step 5: Commit**

```bash
git add app/server.js app/tests/server.test.js
git commit -m "feat(api): /brand/extract-url with SSRF guard + bundle parser"
```

---

### Task 3.3: Wire URL extraction into the Brand editor

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`

**Step 1: Implement** — the "From URL" button in the Brand tab opens a small prompt/dialog asking for a URL, calls `GET /brand/extract-url?url=…`, gets back the bundle, then POSTs the bundle to a new endpoint `POST /brand/extract-claude` (added in Task 7.2 when skills are updated) which returns Brand Profile JSON draft. For Phase 3, ship it as a draft pre-fill: bundle colours + fonts flow straight into the Brand editor as candidate values, and a banner says "AI analysis available — click here once skills are updated."

> Simplification: until the skill is wired (Phase 7), just pre-fill the manual editor with extracted `colors` (as candidate rows with `source: 'url'`) and `fonts` (heading = fonts[0], body = fonts[1] || fonts[0]). The user can edit before saving. This is genuinely useful even without Claude analysis.

**Step 2: Verify in browser** — try `https://stripe.com`, see colours pre-fill.

**Step 3: Commit**

```bash
git add app/public/
git commit -m "feat(ui): From-URL brand extraction prefills editor"
```

---

### Task 3.4: Extend `extract-from-export.js` to emit Brand Profile JSON

**Files:**
- Modify: `skills/divi5-extract-style/scripts/extract-from-export.js`
- Test: `skills/divi5-extract-style/scripts/__tests__/brand-profile.test.js` (create)

**Step 1: Inspect** the existing script's output shape. It currently writes `tokens.js` + `variables.json`. Read it first.

**Step 2: Write failing test** against a fixture export (use an existing small export in `skills/divi5-page-generator/references/Divi design system JSON/` or synthesize a minimal one):

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

test('extractBrandProfileFromExport returns Brand Profile JSON', () => {
  const { extractBrandProfileFromExport } = require('../extract-from-export');
  const exportDoc = require('./fixtures/minimal-export.json');
  const profile = extractBrandProfileFromExport(exportDoc);
  assert.equal(profile.sourceType, 'export');
  assert.ok(Array.isArray(profile.colors));
  assert.ok(profile.colors.every(c => c.role && c.hex && c.source === 'export'));
  assert.ok(profile.fonts.heading || profile.fonts.body);
});
```

Create `__tests__/fixtures/minimal-export.json` — a tiny Divi export doc with 1 preset group and 2 global colours. Copy structure from a real export, trim to minimal.

**Step 3: Run to fail**

```bash
cd skills/divi5-extract-style/scripts && node --test __tests__/brand-profile.test.js
```
Expected: FAIL — function not exported.

**Step 4: Implement** — add to `extract-from-export.js`:

```js
function extractBrandProfileFromExport(exportDoc) {
  const colors = [];
  const globalColors = exportDoc.global_colors || [];
  globalColors.forEach((c, idx) => {
    const role = idx === 0 ? 'primary' : idx === 1 ? 'accent' : `color-${idx}`;
    colors.push({ role, hex: String(c.color || c.value || c).toLowerCase(), source: 'export', locked: false });
  });
  if (colors.length === 0) {
    // fallback: scan presets for hex values
    const hexes = [...new Set((JSON.stringify(exportDoc.presets || {}).match(/#[0-9a-fA-F]{6}\b/g) || []))]
      .slice(0, 6).map(s => s.toLowerCase());
    hexes.forEach((h, i) => colors.push({
      role: i === 0 ? 'primary' : i === 1 ? 'accent' : `color-${i}`,
      hex: h, source: 'export', locked: false,
    }));
  }

  const fonts = {};
  const fontScan = [...new Set(
    [...JSON.stringify(exportDoc.presets || {}).matchAll(/fontFamily["']?\s*[:=]\s*["']([^"']+)/g)]
      .map(m => m[1].trim())
  )];
  if (fontScan[0]) fonts.heading = { family: fontScan[0], source: 'export' };
  if (fontScan[1]) fonts.body    = { family: fontScan[1], source: 'export' };
  else if (fontScan[0]) fonts.body = { family: fontScan[0], source: 'export' };

  return {
    name: '',
    colors,
    fonts,
    logo: null,
    voice: '',
    tagline: '',
    sourceType: 'export',
    sourceRef: '',
    extractedAt: new Date().toISOString(),
  };
}

module.exports.extractBrandProfileFromExport = extractBrandProfileFromExport;
```

**Step 5: Run to pass**

```bash
node --test __tests__/brand-profile.test.js
```
Expected: PASS.

**Step 6: Commit**

```bash
git add skills/divi5-extract-style/
git commit -m "feat(skill): extract-from-export emits Brand Profile JSON"
```

---

### Task 3.5: Image extraction — client-side canvas dominant colours

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`

**Step 1: Implement** — in the Brand editor:
- Logo upload input already exists (Task 2.2).
- On file selected: render into an offscreen `<canvas>` (max 64×64 to keep it fast), read pixel data, compute a frequency map of quantised colours (quantise to 4 bits per channel: `#XYY` style), return top 6 by count, excluding near-white/near-black unless dominant.
- Prefill the colours list as candidate rows with `source: 'image-canvas'` (locked: false).
- Show a small note: "Canvas-derived colours — for a richer analysis, click 'Analyse with Claude' (vision)."

Reference algorithm:
```js
function dominantColors(file, maxColors = 6) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const W = 64, H = 64;
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      const counts = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;                          // skip transparent
        const r = data[i] & 0xf0, g = data[i+1] & 0xf0, b = data[i+2] & 0xf0;
        const key = (r << 16) | (g << 8) | b;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
      const out = sorted.slice(0, maxColors).map(([k]) => {
        const r = (k >> 16) & 0xff, g = (k >> 8) & 0xff, b = k & 0xff;
        return '#' + [r, g, b].map(x => (x+8).toString(16).padStart(2, '0')).join('');
      });
      resolve(out);
    };
    img.src = URL.createObjectURL(file);
  });
}
```

**Step 2: Verify** — upload a logo, see palette prefill.

**Step 3: Commit**

```bash
git add app/public/
git commit -m "feat(ui): canvas-based dominant colour extraction from logo upload"
```

---

### Task 3.6: Image vision extraction (optional Claude analyse)

**Files:**
- Modify: `app/server.js` (new `POST /brand/extract-image`)
- Test: `app/tests/server.test.js` (light — assert endpoint shape, mock Claude since it spawns a process)

This calls Claude via `claude -p --plugin-dir …` with the image attached. Implementation detail: the app's `/chat` and `/generate` already spawn Claude; reuse that pattern. Claude reads the image with vision and returns Brand Profile JSON.

**Step 1: Implement** — `POST /brand/extract-image` accepts `multipart/form-data` with an image file. Saves to a temp path, spawns Claude with a prompt asking for Brand Profile JSON from the image, streams back JSON.

Keep this task lightweight — wrap the existing spawn pattern. Tests assert it returns 400 on missing file and 200 with valid JSON shape on a tiny fixture (skip the actual Claude call in CI by detecting `CLAUDE_BIN=echo` env or by mocking).

**Step 2-5:** TDD as above.

**Step 6: Commit**

```bash
git add app/server.js app/tests/server.test.js app/public/
git commit -m "feat(api): /brand/extract-image via Claude vision"
```

---

### Task 3.7: Chat-extract brand

**Files:**
- Modify: `app/server.js` (new `POST /brand/extract-chat`)
- Modify: `app/public/app.js` (button in Brand tab → "From chat" sends recent chat history)

**Step 1: Implement** — `POST /brand/extract-chat` accepts `{ history: [...] }`. Builds a prompt: *"Extract a Brand Profile JSON from this conversation. Only include explicitly mentioned colours/fonts/voice. Leave other fields empty."* Calls `claude -p --plugin-dir …`, returns JSON. Frontend opens the editor prefilled with the result.

**Step 2-5:** TDD with mocked Claude spawn.

**Step 6: Commit**

```bash
git add app/server.js app/tests/server.test.js app/public/
git commit -m "feat(api): /brand/extract-chat from conversation history"
```

---

## Phase 4 — Design Projects

### Task 4.1: Design Project REST endpoints

**Files:**
- Modify: `app/server.js`
- Test: `app/tests/server.test.js` (extend)

**Step 1: Failing tests** for: `GET /designs` (list), `POST /designs` (create), `GET /designs/:id` (with pages list), `DELETE /designs/:id` (offers `?keepPages=true` default).

**Step 2: Run to fail.**

**Step 3: Implement** — wire to `listDesignProjects`, `createDesignProject`, `getDesignProject`. Delete handler:
```js
app.delete('/designs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const keepPages = req.query.keepPages !== 'false';
  if (!keepPages) {
    // delete linked generations too
    const genIds = db.prepare('SELECT generation_id FROM design_pages WHERE design_id=?').all(id).map(r => r.generation_id);
    db.prepare('DELETE FROM output_files WHERE generation_id IN (' + genIds.map(()=>'?').join(',') + ')').run(...genIds);
    db.prepare('DELETE FROM generations WHERE id IN (' + genIds.map(()=>'?').join(',') + ')').run(...genIds);
  } else {
    db.prepare('UPDATE generations SET design_id=NULL WHERE design_id=?').run(id);
  }
  db.prepare('DELETE FROM design_pages WHERE design_id=?').run(id);
  db.prepare('DELETE FROM design_projects WHERE id=?').run(id);
  res.json({ ok: true });
});
```

**Step 4-5:** Pass, commit.

---

### Task 4.2: Designs tab UI

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** — Designs tab shows list of projects with brand name, page count, last modified. Each expandable to show pages (each row: page type, status, [Re-open] [Revise] [Import] buttons). "New Design Project" button → modal: pick Brand Profile + optional Divi export + name. "Add page" per design → opens Chat tab with prefilled context.

**Step 2: Verify** in browser.

**Step 3: Commit**.

---

### Task 4.3: Auto-promotion trigger on generation completion

**Files:**
- Modify: `app/server.js` (in `/generate` close handler)

**Step 1: Implement** — after the existing status update in the `proc.on('close', …)` handler, add:
```js
const newDesignId = promoteIfEligible(genId);
if (newDesignId) {
  const msg = `\n--- DESIGN PROJECT ---\nPromoted to design project #${newDesignId}. See Designs tab.\n`;
  appendLog.run(msg, genId);
  sendSSE(genId, 'log', { chunk: msg });
  sendSSE(genId, 'design_promoted', { designId: newDesignId });
}
```

**Step 2: Add a test** that triggers `/generate` twice with the same brand+export and asserts a `design_projects` row exists. (May require mocking the Claude spawn — follow whatever pattern the existing server tests use, or skip the spawn and test `promoteIfEligible` directly per Task 1.3.)

**Step 3-5:** Commit.

---

## Phase 5 — Chat-primary UX shell

The big visible change. Lots of UI; logic only for marker parsing.

### Task 5.1: Sidebar restructure — Chat/Brand/Designs/Settings

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** — reorder `.tab-bar` to `Chat · Brand · Designs · Settings`. Default active tab = Chat. Move Generate form into a collapsible `<details class="brief-drawer">` inside the Chat tab. Toggle via a "Structured brief" link.

**Step 2: Verify** — open app, see Chat as default. Click "Structured brief" to expand the form. Form still works end-to-end.

**Step 3: Commit**.

---

### Task 5.2: GEN_INTENT marker parser

**Files:**
- Modify: `app/server.js` (in `/chat` stream handler)
- Create: `app/lib/intent-marker.js`
- Test: `app/tests/intent-marker.test.js`

**Step 1: Failing test**:
```js
const { extractIntent, stripIntent } = require('../lib/intent-marker');

test('extracts a GEN_INTENT marker', () => {
  const text = 'Sure. <!-- GEN_INTENT: {"brand":"Floria","pageType":"about"} --> Done.';
  assert.deepEqual(extractIntent(text), { brand: 'Floria', pageType: 'about' });
  assert.equal(stripIntent(text).includes('GEN_INTENT'), false);
});

test('returns null when no marker present', () => {
  assert.equal(extractIntent('just text'), null);
  assert.equal(stripIntent('just text'), 'just text');
});

test('handles multi-line text with marker on its own line', () => {
  const text = 'line1\n<!-- GEN_INTENT: {"keyword":"x"} -->\nline3';
  assert.deepEqual(extractIntent(text), { keyword: 'x' });
});
```

**Step 2: Run to fail.**

**Step 3: Implement** — `app/lib/intent-marker.js`:
```js
'use strict';
const RE = /<!--\s*GEN_INTENT:\s*(\{.*?\})\s*-->/s;

function extractIntent(text) {
  const m = text && text.match(RE);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function stripIntent(text) {
  return (text || '').replace(RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { extractIntent, stripIntent };
```

**Step 4: Pass, commit.**

---

### Task 5.3: Chat SSE emits `gen_intent` events

**Files:**
- Modify: `app/server.js` (`/chat` handler)

**Step 1: Implement** — change the `/chat` stdout handler to buffer-then-scan for markers:
```js
const { extractIntent, stripIntent } = require('./lib/intent-marker');
let buf = '';
proc.stdout.on('data', chunk => {
  buf += chunk.toString();
  // scan and emit complete intent markers immediately
  const intent = extractIntent(buf);
  if (intent) {
    res.write(`event: gen_intent\ndata: ${JSON.stringify(intent)}\n\n`);
    buf = stripIntent(buf);
  }
  // emit remaining text as data chunks
  if (buf) {
    res.write(`data: ${JSON.stringify({ chunk: chunk.toString() })}\n\n`);
  }
});
```

> Note: simpler approach — emit chunks as today, and let the frontend scan for the marker in the accumulated reply. Either works. Pick one; document in the commit.

**Step 2: Verify** — type a chat message that would trigger a generation (e.g. "build a landing page for Floria"). See the `gen_intent` event arrive (in devtools network tab on the SSE connection).

**Step 3: Commit.**

---

### Task 5.4: Generation proposal card + Start button

**Files:**
- Modify: `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** — on `gen_intent` SSE event, render a card in the chat stream above the assistant's text reply:
```
┌─ Generate: <pageType||'page'> for <brand> ──┐
│  • keyword: …                                │
│  • sections: …                               │
│  • CTA: …                                    │
│  [ Edit brief ]            [ Start → ]       │
└──────────────────────────────────────────────┘
```
- "Edit brief" opens the Structured Brief drawer prefilled.
- "Start →" calls `/generate` with the parsed fields + the active `designId` from chat context, subscribes to `/stream/:id`.

**Step 2: Verify** — click Start, see generation kick off, log card + preview card render inline.

**Step 3: Commit.**

---

### Task 5.5: Inline preview card + file card + import card

**Files:**
- Modify: `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** — extend the existing `/stream/:id` SSE subscription (currently used by the form flow) to render into the chat stream when triggered from chat:
- On `done` with `hasPreview: true` → render a `<div class="preview-card">` with an `<iframe src="/preview-html/:id">` thumbnail (height 320px, click to expand).
- On `done` with `files` → render a `<div class="file-card">` with download links.
- Render an Import card with the existing import button.

**Step 2: Verify.**

**Step 3: Commit.**

---

### Task 5.6: Preview side drawer

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`, `app/public/style.css`

**Step 1: Implement** — `<aside id="previewDrawer" class="preview-drawer" hidden>` sliding from the right, ~50% width on desktop, full-width on narrow screens. Click a preview card's "Open full" → populate the drawer iframe with `/preview-html/:id`, unhide. Drawer header: title, [Open in new tab] [Import] [×]. Multiple drawers stack as tabs (`#drawerTabs`).

**Step 2: Verify** — compare two revisions side by side via two drawer tabs.

**Step 3: Commit.**

---

### Task 5.7: Chat context state + slash hints

**Files:**
- Modify: `app/public/app.js`, `app/public/index.html`

**Step 1: Implement** — chat state object:
```js
const chatCtx = { brandId: null, designId: null, generationId: null };
```
- Context chip row above the chat input shows the active brand / design / page. Clicking a chip clears it.
- Slash autocomplete: typing `/` shows a small menu (`/generate`, `/brand`, `/design`, `/import`, `/pages`). Selecting one inserts a template prompt.
- Every `/chat` POST includes `chatCtx` in the body; server prepends a preamble (Phase 5 wiring in `/chat` handler).

Server side: extend `/chat` to accept `{ message, history, ctx }` and prepend:
```
ACTIVE BRAND: <name or none> — <palette summary>
ACTIVE DESIGN: <name or none> — <page count>
ACTIVE PAGE: <gen id or none>
```

**Step 2: Verify** — pick a brand in the Brand tab, return to Chat, see the chip. Type a message — check the network request body includes `ctx`.

**Step 3: Commit.**

---

## Phase 6 — Form demotion polish

### Task 6.1: One-time toast + structured-brief drawer wiring

**Files:**
- Modify: `app/public/index.html`, `app/public/app.js`

**Step 1: Implement** — add a `localStorage` flag `d5g.seenChatPrimaryToast`. On first load after upgrade, show a toast: *"The form is now in 'Structured brief' under Chat. Click to dismiss."* Drawer remembers open/closed state in `localStorage`.

**Step 2: Verify.**

**Step 3: Commit.**

---

## Phase 7 — Skill updates

### Task 7.1: Update `divi5-extract-style/SKILL.md`

**Files:**
- Modify: `skills/divi5-extract-style/SKILL.md`

**Step 1: Implement** — add sections:
- "URL extraction mode" — describe the bundle the app passes in (title, colors, fonts, stylesheets) and how to interpret it into a Brand Profile JSON. Reference the Brand Profile schema in `skills/divi5-brand-profile/SKILL.md`.
- "Image extraction mode" — vision prompt template for logo/screenshot analysis.
- "Chat extraction mode" — prompt template for extracting brand cues from a conversation.
- "Brand Profile JSON output" — show the canonical shape (colours with role/hex/source/locked, fonts, logo, voice, tagline, sourceType, sourceRef, extractedAt).

Keep the existing Divi-export-token-extraction instructions intact as the "Divi export mode".

**Step 2: Verify** — read through, ensure a fresh Claude session could follow.

**Step 3: Commit** `docs(skill): add URL/image/chat extraction modes`.

---

### Task 7.2: New skill `divi5-brand-profile`

**Files:**
- Create: `skills/divi5-brand-profile/SKILL.md`

**Step 1: Implement** — frontmatter + body documenting:
- The Brand Profile schema (copy from design doc §4).
- The five extraction paths and when to use each.
- The re-extraction rules (manual/locked fields are sticky; history array caps at 5).
- Pointers to `divi5-extract-style` for the heavy lifting.

**Step 2: Commit** `feat(skill): add divi5-brand-profile skill`.

---

### Task 7.3: Update `divi5-page-generator/SKILL.md` — design-project mode + GEN_INTENT

**Files:**
- Modify: `skills/divi5-page-generator/SKILL.md`

**Step 1: Implement** — add:
- "Design-project mode" — when the prompt preamble includes `ACTIVE DESIGN:` with a tokens.js path, **reuse** those colours/fonts verbatim. Do not invent new hex colours outside the supplied palette.
- "Generation intent marker (chat mode)" — when invoked from the app's chat, emit a single-line `<!-- GEN_INTENT: {…} -->` marker with the parsed brief (brand, designId, pageType, keyword, sections, ctaLabel, notes). Then continue with normal prose.
- Document the exact JSON shape so the parser stays in sync.

**Step 2: Commit** `docs(skill): add design-project mode + GEN_INTENT marker spec`.

---

### Task 7.4: Update `import-to-local/SKILL.md` — new endpoints

**Files:**
- Modify: `skills/import-to-local/SKILL.md`

**Step 1: Implement** — document `GET /wp-json/divi-tools/v1/pages` and `DELETE /wp-json/divi-tools/v1/pages?slug=<slug>` with example requests/responses. Add a section "Iterate without litter" describing the list → delete-draft workflow.

**Step 2: Commit** `docs(skill): document /pages list + delete endpoints`.

---

## Phase 8 — Importer plugin enhancements

### Task 8.1: `PagesLister.php`

**Files:**
- Create: `plugin/divi-tools-importer/src/PagesLister.php`
- Modify: `plugin/divi-tools-importer/src/RestApi.php`

**Step 1: Implement** — `PagesLister` queries `wp_posts` for posts whose `_divi_tools_imported` meta key is set (the plugin already stamps this on import — verify in `PageImporter.php`). Returns:
```php
[
  [ 'slug' => ..., 'title' => ..., 'status' => ..., 'modified' => ..., 'permalink' => ..., 'design_hint' => ... ],
  ...
]
```
`design_hint` = the brand/keyword from the page's SEO meta (Yoast/RankMath) if present.

Register in `RestApi.php`:
```php
register_rest_route('divi-tools/v1', '/pages', [
  'methods'  => 'GET',
  'callback' => [ new PagesLister(), 'list' ],
  'permission_callback' => [ new Auth(), 'check' ],
]);
```

**Step 2: Verify** — deploy via `bash plugin/divi-tools-importer/deploy.sh`, then `curl -H "X-Divi-Tools-Key: $KEY" https://divi-5-airtable-plugin.local/wp-json/divi-tools/v1/pages`.

**Step 3: Commit** `feat(plugin): GET /pages endpoint`.

---

### Task 8.2: `PageDeleter.php`

**Files:**
- Create: `plugin/divi-tools-importer/src/PageDeleter.php`
- Modify: `plugin/divi-tools-importer/src/RestApi.php`

**Step 1: Implement** — `PageDeleter` accepts `slug` query param, looks up the post, **refuses with 409** if `post_status === 'publish'`, otherwise `wp_delete_post($id, true)`. Returns `{ ok: true, deleted: <slug> }` or appropriate errors.

Register:
```php
register_rest_route('divi-tools/v1', '/pages', [
  'methods'  => 'DELETE',
  'callback' => [ new PageDeleter(), 'delete' ],
  'permission_callback' => [ new Auth(), 'check' ],
]);
```

**Step 2: Verify** — curl test with a draft slug, then attempt with a published slug (expect 409).

**Step 3: Commit** `feat(plugin): DELETE /pages endpoint with publish guard`.

---

### Task 8.3: Version bump + README/DEVELOPMENT updates

**Files:**
- Modify: `plugin/divi-tools-importer/divi-tools-importer.php` (Version: 1.3.0)
- Modify: `DEVELOPMENT.md` (REST API contract table)
- Modify: `README.md` (workflow + endpoints)

**Step 1:** bump version, update docs.

**Step 2:** `bash plugin/build-zip.sh` to verify the zip builds cleanly.

**Step 3: Commit** `chore(plugin): bump to 1.3.0, update docs`.

---

## Phase 9 — Integration, polish, docs

### Task 9.1: Chat-driven end-to-end smoke test

**Files:**
- Test: `app/tests/chat-e2e.test.js`

**Step 1: Implement** — a single test that drives the full chat flow against a mocked Claude spawn (set `CLAUDE_BIN` to a tiny script that echoes a canned response containing a `GEN_INTENT` marker). Assert:
1. Chat SSE emits `gen_intent`.
2. Calling `/generate` with the parsed intent creates a generation.
3. `promoteIfEligible` returns a project id on the 2nd identical run.

**Step 2-5:** TDD, commit `test(app): chat-driven e2e smoke`.

---

### Task 9.2: README + DEVELOPMENT + user-flow updates

**Files:**
- Modify: `README.md`, `DEVELOPMENT.md`, `docs/user-flow.md`

**Step 1:** Update the mermaid flow in README to show: Brand extract → Design project → Chat → Preview → Import. Update DEVELOPMENT.md data-model section + REST contract table. Update user-flow.md with the new chat-primary path.

**Step 2: Commit** `docs: update README, DEVELOPMENT, user-flow for chat-primary + brand`.

---

### Task 9.3: Full regression pass

**Step 1:** Run all tests:
```bash
cd app && npm test
cd skills/divi5-extract-style/scripts && node --test
cd skills/divi5-page-generator/scripts && npm test
```

**Step 2:** Manual smoke:
- Launch app, create a Brand Profile manually, generate a page referencing it.
- Generate a 2nd page under the same brand+export → verify auto-promotion.
- Use chat to ask for a 3rd page → verify proposal card + Start button.
- Import to WordPress → verify draft.
- Hit `GET /pages` → verify it's listed.
- `DELETE /pages?slug=…` → verify it's gone.

**Step 3:** Fix anything broken; final commit.

---

## Execution order (suggested)

Linear, but Phases 2/3/4 can be parallelised across subagents once Phase 1 is merged:

```
Phase 1 (DB)  ──┬─▶ Phase 2 (Brand CRUD + UI)
                ├─▶ Phase 3 (Extraction paths)        [needs Phase 2 for editor]
                └─▶ Phase 4 (Design projects)         [needs Phase 2/3 data]
                                                       │
Phase 5 (Chat UX) ◀────────────────────────────────── ┘
        │
        ├─▶ Phase 6 (Form polish)
        ├─▶ Phase 7 (Skills)
        └─▶ Phase 8 (Plugin)  ← independent of app
                │
                └─▶ Phase 9 (Integration + docs)
```

---

## Out of scope (per design doc §11)

- Multi-user / accounts.
- Cloud sync of Brand Profiles.
- Visual editor for generated JSON.
- A/B comparison of Brand Profiles.
- Automatic cross-page brand-consistency scoring.
- Plugin bulk publish/delete/revision history.

---

## Reference index

- **Design doc:** [`docs/plans/2026-06-22-chat-driven-brand-design-projects.md`](./2026-06-22-chat-driven-brand-design-projects.md)
- **Existing app server:** `app/server.js`
- **Existing DB:** `app/db.js`
- **Existing tests:** `app/tests/server.test.js`, `app/tests/style-check.test.js`
- **Existing extract script:** `skills/divi5-extract-style/scripts/extract-from-export.js`
- **Plugin canonical source:** `plugin/divi-tools-importer/src/`
- **Plugin tests pattern:** see existing `Auth.php` / `RestApi.php` for the registration idiom; PHP tests live under `plugin/divi-tools-importer/tests/` (create if absent).
