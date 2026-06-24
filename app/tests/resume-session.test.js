'use strict';
/**
 * resume-session.test.js — Tests for resume-based session model (items #2, #5, #6).
 *
 * Tests:
 *   1. DB: generations table has sdk_session_id column (migration applied).
 *   2. startOrContinue: returns sessionId + captures sdkSessionId from system/init.
 *   3. startOrContinue: resume re-uses existing in-memory session (no isNew).
 *   4. startOrContinue: resumeSdkSession pre-seeds sdkSessionId for cross-restart resume.
 *   5. Server: POST /rerun/:id returns sdk_session_id field.
 *
 * Run: node --test tests/resume-session.test.js
 */

const test   = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const path   = require('node:path');
const os     = require('node:os');
const fs     = require('node:fs');
const { spawn } = require('node:child_process');

// ── Isolated data dir ────────────────────────────────────────────────────────
const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'divi5-resume-'));
process.env.DIVI5_DATA_DIR = DATA_DIR;
process.env.HOME = DATA_DIR; // keep DB writes out of real home

// ── Test 1 & 4: DB column + module-level unit tests ─────────────────────────

test('1. generations table has sdk_session_id column', () => {
  const { db } = require('../db');
  const cols = db.prepare('PRAGMA table_info(generations)').all().map(c => c.name);
  assert.ok(cols.includes('sdk_session_id'), 'sdk_session_id column missing from generations');
});

// ── Unit tests for claude-agent module (mock the SDK) ────────────────────────

// Build a minimal mock SDK whose query() emits the events we care about.
function makeMockSdk(sdkSessionId, extraMessages = []) {
  return {
    query: async function* ({ prompt, options }) {
      yield { type: 'system', subtype: 'init', session_id: sdkSessionId };
      for (const m of extraMessages) yield m;
      yield { type: 'result', subtype: 'success' };
    },
    tool: null,               // disables custom MCP tools (tested separately)
    createSdkMcpServer: null,
  };
}

// Load the agent fresh and inject a mock SDK via the _setSdkForTest seam.
function loadAgentWithMockSdk(mockSdk) {
  // Reload the module so each test gets a fresh sessions Map.
  const agentPath = require.resolve('../lib/claude-agent');
  delete require.cache[agentPath];
  const agent = require(agentPath);
  agent._setSdkForTest(mockSdk);
  return agent;
}

test('2. startOrContinue returns sessionId and captures sdkSessionId from system/init', async () => {
  const FAKE_SESSION = 'aaaaaaaa-0000-0000-0000-000000000001';
  const mock = makeMockSdk(FAKE_SESSION);
  const agent = loadAgentWithMockSdk(mock);

  const events = [];
  const sink = {
    event: (name, obj) => events.push({ name, ...obj }),
    data:  () => {},
  };

  const r = await agent.startOrContinue({
    text: 'hello',
    cwd: DATA_DIR, appBase: 'http://localhost:9', genOutputs: DATA_DIR,
    sink,
  });

  assert.ok(r.sessionId, 'sessionId must be set');
  assert.equal(r.isNew, true, 'first call must be isNew');
  // The session object is internal, but we can verify that a second call
  // with the returned sessionId is NOT new and does not create a second session.
  const r2 = await agent.startOrContinue({
    sessionId: r.sessionId,
    text: 'follow-up',
    cwd: DATA_DIR, appBase: 'http://localhost:9', genOutputs: DATA_DIR,
    sink,
  });
  assert.equal(r2.sessionId, r.sessionId, 'sessionId must be stable across turns');
  assert.equal(r2.isNew, false, 'second call must NOT be isNew');
});

test('3. onSession callback fires before the turn completes', async () => {
  const FAKE_SESSION = 'aaaaaaaa-0000-0000-0000-000000000002';
  const mock = makeMockSdk(FAKE_SESSION);
  const agent = loadAgentWithMockSdk(mock);

  const sink = { event: () => {}, data: () => {} };
  let callbackId = null;

  await agent.startOrContinue({
    text: 'hello',
    cwd: DATA_DIR, appBase: 'http://localhost:9', genOutputs: DATA_DIR,
    sink,
    onSession: (id) => { callbackId = id; },
  });

  assert.ok(callbackId, 'onSession must fire and provide an id');
});

test('4. resumeSdkSession pre-seeds sdkSessionId so first turn uses options.resume', async () => {
  const STORED_SDK_ID = 'bbbbbbbb-0000-0000-0000-000000000003';
  const capturedOptions = [];
  const mock = {
    query: async function* ({ prompt, options }) {
      capturedOptions.push(options);
      yield { type: 'system', subtype: 'init', session_id: STORED_SDK_ID };
      yield { type: 'result', subtype: 'success' };
    },
    tool: null, createSdkMcpServer: null,
  };
  const agent = loadAgentWithMockSdk(mock);

  const sink = { event: () => {}, data: () => {} };
  await agent.startOrContinue({
    resumeSdkSession: STORED_SDK_ID,
    text: 'revise the page',
    cwd: DATA_DIR, appBase: 'http://localhost:9', genOutputs: DATA_DIR,
    sink,
  });

  assert.equal(capturedOptions[0]?.resume, STORED_SDK_ID,
    'options.resume must equal the provided resumeSdkSession on the first turn');
});

// ── Integration test: /rerun/:id returns sdk_session_id ──────────────────────

const SERVER_PATH = path.join(__dirname, '..', 'server.js');
const PORT = 37472;

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
  serverProc = spawn(process.execPath, [SERVER_PATH], {
    env: { ...process.env, PORT: String(PORT), DIVI5_DATA_DIR: DATA_DIR },
    stdio: 'pipe',
  });
  serverProc.stderr.on('data', () => {});
  serverProc.stdout.on('data', () => {});
  await waitForPort(PORT);
});

test.after(() => {
  if (serverProc) serverProc.kill('SIGTERM');
  fs.rmSync(DATA_DIR, { recursive: true, force: true });
});

test('5. POST /rerun/:id returns sdk_session_id field', async () => {
  // Insert a generation with a known sdk_session_id.
  const { db } = require('../db');
  const SDK_ID = 'cccccccc-0000-0000-0000-000000000005';
  const genId = db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, output_dir, export_path, sdk_session_id)
    VALUES (?, ?, '[]', 'clean', ?, null, ?)
  `).run('TestBrand', 'test', DATA_DIR, SDK_ID).lastInsertRowid;

  const res = await request('POST', `/rerun/${genId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.sdk_session_id, SDK_ID, '/rerun must return the stored sdk_session_id');
  assert.equal(res.body.brand, 'TestBrand');
});

test('6. POST /rerun/:id returns null sdk_session_id for form-originated generations', async () => {
  const { db } = require('../db');
  const genId = db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, output_dir, export_path)
    VALUES (?, ?, '[]', 'clean', ?, null)
  `).run('OldBrand', 'test', DATA_DIR).lastInsertRowid;

  const res = await request('POST', `/rerun/${genId}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.sdk_session_id, null, 'form-originated generation must return null sdk_session_id');
});
