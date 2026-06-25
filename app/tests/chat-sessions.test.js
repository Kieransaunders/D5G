'use strict';

// Contract test for the chat-session persistence layer (resume + transcript
// restore). Runs against a throwaway DB via the DIVI5_DATA_DIR override so it
// never touches the real history.db. Run: node --test tests/chat-sessions.test.js
//
// NOTE: requires the native better-sqlite3 build for THIS machine. It won't run
// in a cross-arch sandbox — run it on the Mac the app runs on.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Point db.js at a temp data dir BEFORE requiring it.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'divi5-chat-'));
process.env.DIVI5_DATA_DIR = TMP;

const {
  deriveSessionTitle, upsertChatSession, addChatMessage,
  listChatSessions, getChatSession, deleteChatSession,
} = require('../db');

test('deriveSessionTitle trims, collapses whitespace, truncates at 60', () => {
  assert.equal(deriveSessionTitle('  hello   world  '), 'hello world');
  assert.equal(deriveSessionTitle(''), 'Untitled chat');
  assert.equal(deriveSessionTitle('x'.repeat(80)), 'x'.repeat(57) + '…');
});

test('upsert sets title once; later upserts patch fields but keep title', () => {
  const sdk = 'sdk-aaa';
  upsertChatSession({ sdkSessionId: sdk, appSessionId: 'app-1', title: 'First title' });
  // A later turn must not overwrite the title (passes null), but updates app id.
  upsertChatSession({ sdkSessionId: sdk, appSessionId: 'app-2', title: null });
  const { session } = getChatSession(sdk);
  assert.equal(session.title, 'First title');
  assert.equal(session.app_session_id, 'app-2');
});

test('messages persist in order and restore as a transcript', () => {
  const sdk = 'sdk-bbb';
  upsertChatSession({ sdkSessionId: sdk, appSessionId: 'app-x', title: deriveSessionTitle('Build a clowns page') });
  addChatMessage({ sdkSessionId: sdk, role: 'user', content: 'Build a clowns page' });
  addChatMessage({ sdkSessionId: sdk, role: 'assistant', content: '✓ Mockup ready — showing on the right →' });
  addChatMessage({ sdkSessionId: sdk, role: 'user', content: 'make the hero darker' });
  const { messages } = getChatSession(sdk);
  assert.deepEqual(messages.map(m => m.role), ['user', 'assistant', 'user']);
  assert.equal(messages[0].content, 'Build a clowns page');
  assert.equal(messages[2].content, 'make the hero darker');
});

test('mockup html + gen id round-trip for canvas restore', () => {
  const sdk = 'sdk-ccc';
  upsertChatSession({ sdkSessionId: sdk, title: 'x' });
  upsertChatSession({ sdkSessionId: sdk, lastMockupHtml: '<div>mock</div>', lastMockupTitle: 'Draft' });
  upsertChatSession({ sdkSessionId: sdk, genId: 42 });
  const { session } = getChatSession(sdk);
  assert.equal(session.last_mockup_html, '<div>mock</div>');
  assert.equal(session.last_mockup_title, 'Draft');
  assert.equal(session.gen_id, 42);
});

test('listChatSessions returns newest-first with message counts; only non-empty', () => {
  // sdk-ddd has no messages → excluded from the picker list.
  upsertChatSession({ sdkSessionId: 'sdk-ddd', title: 'empty one' });
  const list = listChatSessions();
  const ids = list.map(s => s.sdk_session_id);
  assert.ok(!ids.includes('sdk-ddd'), 'empty sessions are hidden from the list');
  assert.ok(ids.includes('sdk-bbb'), 'sessions with messages appear');
  const bbb = list.find(s => s.sdk_session_id === 'sdk-bbb');
  assert.equal(bbb.message_count, 3);
});

test('delete removes the session and its messages', () => {
  deleteChatSession('sdk-bbb');
  assert.equal(getChatSession('sdk-bbb'), null);
  assert.ok(!listChatSessions().some(s => s.sdk_session_id === 'sdk-bbb'));
});

test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {} });
