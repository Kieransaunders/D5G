'use strict';

/**
 * chat-e2e.test.js — Task 9.1 chat-driven end-to-end smoke.
 *
 * Drives the full chat flow against a MOCKED Claude spawn: CLAUDE_BIN points at
 * a tiny shell script that echoes a canned response containing a GEN_INTENT
 * marker. Asserts:
 *   1. POST /chat SSE emits a `gen_intent` event (marker parsed + stripped).
 *   2. POST /generate with the parsed intent creates a generation (returns id).
 *   3. promoteIfEligible returns a project id on the 2nd identical run, null after.
 *
 * Run: node --test tests/chat-e2e.test.js
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const path   = require('node:path');
const os     = require('node:os');
const fs     = require('node:fs');
const { spawn } = require('node:child_process');

const SERVER_PATH = path.join(__dirname, '..', 'server.js');
const PORT = 37471; // distinct from server.test.js (37470)

// Isolated data dir + DB so the smoke run never touches the real history.
// Must be set BEFORE any require('../db') in this process — db.js reads it at load.
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'divi5-e2e-'));
process.env.DIVI5_DATA_DIR = DATA_DIR;

// Fake claude: prints a line of prose + a GEN_INTENT marker, then exits 0.
const FAKE_CLAUDE = path.join(DATA_DIR, 'fake-claude.sh');
fs.writeFileSync(FAKE_CLAUDE,
  '#!/bin/sh\n' +
  'echo "Sure — here is a plan."\n' +
  'echo \'<!-- GEN_INTENT: {"brand":"Floria","keyword":"florist","pageType":"about"} -->\'\n',
  { mode: 0o755 });

const ENV = { ...process.env, PORT: String(PORT), DIVI5_DATA_DIR: DATA_DIR, CLAUDE_BIN: FAKE_CLAUDE };

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: PORT, path: pathname, method, headers: {} };
    let bodyStr;
    if (body) {
      bodyStr = JSON.stringify(body);
      opts.headers['Content-Type']   = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// Collect the full SSE stream from a POST until the connection closes.
function streamSSE(pathname, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = http.request({
      hostname: '127.0.0.1', port: PORT, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
    }, (res) => {
      let raw = '';
      res.on('data', d => { raw += d; });
      res.on('end', () => resolve(raw));
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function waitForPort(port, maxMs = 8000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function attempt() {
      const sock = http.get({ hostname: '127.0.0.1', port, path: '/prereqs' }, () => { sock.destroy(); resolve(); });
      sock.on('error', () => {
        if (Date.now() - start > maxMs) return reject(new Error('Server did not start'));
        setTimeout(attempt, 200);
      });
    })();
  });
}

let serverProc;

test.before(async () => {
  serverProc = spawn(process.execPath, [SERVER_PATH], { env: ENV, stdio: 'pipe' });
  serverProc.stderr.on('data', () => {});
  serverProc.stdout.on('data', () => {});
  await waitForPort(PORT);
});

test.after(() => {
  if (serverProc) serverProc.kill('SIGTERM');
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('1. POST /chat SSE emits gen_intent and strips the marker from prose', async () => {
  const raw = await streamSSE('/chat', { message: 'Make me an about page', history: [], ctx: {} });
  assert.ok(raw.includes('event: gen_intent'), 'expected a gen_intent SSE event');

  // The intent payload should carry the marker fields.
  const line = raw.split('\n').find(l => l.startsWith('data:') && l.includes('Floria'));
  assert.ok(line, 'gen_intent data line missing brand');
  const intent = JSON.parse(line.replace(/^data:\s*/, ''));
  assert.equal(intent.brand, 'Floria');
  assert.equal(intent.pageType, 'about');

  // Marker must not leak into the visible prose chunks.
  assert.ok(!raw.includes('GEN_INTENT'), 'raw marker leaked into the stream');
});

test('2. POST /generate with the parsed intent creates a generation', async () => {
  const res = await request('POST', '/generate', {
    brand: 'Floria', whatItDoes: 'florist', keyword: 'florist',
    sections: ['Hero', 'CTA'], aesthetic: 'clean', ctaLabel: 'Order', ctaUrl: '#',
  });
  assert.equal(res.status, 200);
  assert.equal(typeof res.body.id, 'number', 'expected a generation id');
});

test('3. promoteIfEligible promotes on the 2nd identical run, then is idempotent', () => {
  // Use the same isolated DB the server writes to.
  const db = require('../db');
  const ins = db.db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, output_dir, export_path)
    VALUES (?, ?, '[]', 'clean', '/tmp/out', ?)
  `);
  // Use a brand+export unique to this test so prior rows can't create a sibling.
  const exportPath = '/tmp/floria-e2e-export.json';
  const brand = 'FloriaE2E';

  // 1st run: no sibling yet → no promotion.
  const first = ins.run(brand, 'florist', exportPath).lastInsertRowid;
  assert.equal(db.promoteIfEligible(first), null, 'no project before a sibling exists');

  // 2nd run on the same brand+export: sibling found → promote.
  const second = ins.run(brand, 'florist', exportPath).lastInsertRowid;
  const projectId = db.promoteIfEligible(second);
  assert.equal(typeof projectId, 'number', 'expected a design project id on the 2nd run');

  // 3rd eligible run must not spawn a duplicate project (idempotent).
  const third = ins.run(brand, 'florist', exportPath).lastInsertRowid;
  assert.equal(db.promoteIfEligible(third), null, 'must not create a duplicate project');
});
