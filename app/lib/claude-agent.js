// claude-agent.js — interactive, multi-turn Claude sessions via the Agent SDK.
//
// v2: persistent session per chat (SDK streaming input), so follow-up messages
// ("make the purple darker", "try a serif") iterate on the SAME page with the
// session's full tool/context state — not a fresh run each time. Adds:
//   • AskUserQuestion round-trip (incl. multiSelect, handled client-side)
//   • Custom input tools (pick_colour / pick_number / collect_fields) via an
//     in-process SDK MCP server — for inputs AskUserQuestion can't express.
//
// Auth: none here. The SDK spawns the `claude` CLI and uses your `claude login`
// (subscription) session. No ANTHROPIC_API_KEY.
//
// CommonJS importing an ESM-only SDK → dynamic import().

const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

// ── State ────────────────────────────────────────────────────────────────────
const sessions = new Map(); // sessionId → Session
const pending  = new Map(); // reqId → { resolve, reject, sessionId }  (questions + custom inputs)
const IDLE_MS  = 15 * 60 * 1000; // close a session after 15 min of no activity

// ── Session ──────────────────────────────────────────────────────────────────
function newSession(cwd, appBase) {
  const s = {
    id: randomUUID(),
    cwd,
    appBase,           // e.g. http://127.0.0.1:3747 — so tools can call the app's own endpoints
    lastMockupPath: null, // path of the most recent Stage-1 mockup HTML (fed to Stage 2)
    sink: null,        // current SSE writer { event, data } for the active turn
    queue: [],         // SDKUserMessages waiting to be pulled by the input generator
    waiters: [],       // resolvers parked when the generator is awaiting input
    closed: false,
    onTurnEnd: null,   // resolve() the current turn's HTTP response on `result`
    idleTimer: null,
  };
  sessions.set(s.id, s);
  resetIdle(s);
  return s;
}

function resetIdle(s) {
  if (s.idleTimer) clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(() => closeSession(s.id), IDLE_MS);
}

// The async iterable handed to query(). Stays open for the life of the session;
// yields each user message as it's pushed, parking when the queue is empty.
async function* inputStream(s) {
  while (!s.closed) {
    if (s.queue.length) { yield s.queue.shift(); continue; }
    await new Promise((r) => s.waiters.push(r));
  }
}

function pushMessage(s, text) {
  s.queue.push({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } });
  const w = s.waiters.shift();
  if (w) w();
  resetIdle(s);
}

function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return;
  s.closed = true;
  if (s.idleTimer) clearTimeout(s.idleTimer);
  s.waiters.splice(0).forEach((w) => w());            // unblock the generator → query() ends
  for (const [rid, p] of pending) {                   // reject outstanding asks
    if (p.sessionId === id) { p.reject(new Error('session closed')); pending.delete(rid); }
  }
  sessions.delete(id);
}

function detachSink(id, sink) {
  const s = sessions.get(id);
  if (s && s.sink === sink) s.sink = null;            // turn's client went away; keep session
}

// ── Browser round-trip ───────────────────────────────────────────────────────
// Emit an SSE event and block until the browser POSTs the answer to /agent/answer.
function askBrowser(s, eventName, data) {
  return new Promise((resolve, reject) => {
    if (!s.sink) return reject(new Error('no client attached to answer'));
    const id = randomUUID();
    pending.set(id, { resolve, reject, sessionId: s.id });
    s.sink.event(eventName, { id, ...data });
  });
}

// Resolve a parked question/input. Value is a plain string (multiSelect joined
// client-side; form values JSON-stringified client-side).
function answerInput(id, value) {
  const p = pending.get(id);
  if (!p) return false;
  p.resolve(value);
  pending.delete(id);
  return true;
}

// ── canUseTool: auto-allow everything except AskUserQuestion (round-tripped) ──
function makeCanUseTool(s) {
  return async (toolName, input) => {
    if (toolName !== 'AskUserQuestion') return { behavior: 'allow', updatedInput: input };
    const questions = (input && input.questions) || [];
    const answers = {};
    s.sink?.event('status', { text: 'waiting for your answer…' });
    for (const q of questions) {
      answers[q.question] = await askBrowser(s, 'ask_question', { question: q });
    }
    s.sink?.event('status', { text: 'applying your choices…' });
    return { behavior: 'allow', updatedInput: { questions, answers } };
  };
}

// ── Custom input tools (in-process SDK MCP server) ───────────────────────────
// Degrades gracefully: if the SDK helpers or zod aren't present, returns null
// and the chat runs without them (AskUserQuestion still works).
function buildInputTools(s, sdk) {
  try {
    const { tool, createSdkMcpServer } = sdk;
    if (!tool || !createSdkMcpServer) return null;
    const { z } = require('zod');

    const colour = tool(
      'pick_colour',
      'Ask the user to choose a colour with a visual colour picker. Use when a colour decision benefits from seeing it (brand accent, section background). Returns the chosen hex string.',
      { label: z.string().describe('what this colour is for'), default: z.string().optional() },
      async (a) => ({ content: [{ type: 'text', text: await askBrowser(s, 'ask_input', { kind: 'colour', label: a.label, default: a.default || '#7c3aed' }) }] }),
    );

    const number = tool(
      'pick_number',
      'Ask the user to choose a number on a slider (spacing, corner radius, font size, column count, etc.). Returns the number, with the unit appended if one was given.',
      { label: z.string(), min: z.number(), max: z.number(), step: z.number().optional(), default: z.number().optional(), unit: z.string().optional() },
      async (a) => ({ content: [{ type: 'text', text: await askBrowser(s, 'ask_input', { kind: 'slider', label: a.label, min: a.min, max: a.max, step: a.step || 1, default: a.default ?? a.min, unit: a.unit || '' }) }] }),
    );

    const form = tool(
      'collect_fields',
      'Collect several short text values at once via a small form (e.g. business name, tagline, phone, email). Returns a JSON object of field name → value.',
      { fields: z.array(z.object({ name: z.string(), label: z.string(), placeholder: z.string().optional() })) },
      async (a) => ({ content: [{ type: 'text', text: await askBrowser(s, 'ask_input', { kind: 'form', fields: a.fields }) }] }),
    );

    // STAGE 1 — show a fast, self-contained HTML mockup in the canvas. Cheap to
    // regenerate, so the user iterates on it across turns before any Divi JSON
    // is built. Fire-and-return; the HTML renders via srcdoc client-side.
    const mockup = tool(
      'show_mockup',
      'Show a self-contained HTML mockup of the page in the app canvas (Stage 1). Pass a complete <html> document using the brand colours/fonts. Call this FIRST, before proposing real generation, and call it again each time the user asks for a change so they see it update. This is a draft preview, not the final Divi page.',
      { html: z.string().describe('a complete, self-contained HTML document'), title: z.string().optional() },
      async (a) => {
        // Persist the latest mockup so Stage 2 (/generate) can match it.
        try { s.lastMockupPath = path.join(s.cwd, `mockup-${s.id}.html`); fs.writeFileSync(s.lastMockupPath, a.html); } catch (_) {}
        s.sink?.event('mockup', { html: a.html, title: a.title || 'Mockup · draft' });
        return { content: [{ type: 'text', text: 'Mockup is showing in the canvas. Ask if they want changes; when they approve, call propose_page to build the real Divi 5 page.' }] };
      },
    );

    // Extract brand tokens from a public URL, reusing the app's own robust
    // parser (/brand/extract-url) rather than reinventing colour/og parsing.
    const extract = tool(
      'extract_brand',
      'Extract brand tokens (colours, fonts, logo, title, meta, OG image) from a public website URL. Use when the user gives a site to base the design on, then use the result to drive the mockup. Returns JSON.',
      { url: z.string().describe('a public http(s) URL') },
      async (a) => {
        try {
          const r = await fetch(`${s.appBase}/brand/extract-url?url=${encodeURIComponent(a.url)}`);
          return { content: [{ type: 'text', text: await r.text() }] };
        } catch (e) { return { content: [{ type: 'text', text: `extract failed: ${e.message}` }] }; }
      },
    );

    // Save a brand profile into the app's Brand section so it's reusable.
    const saveBrand = tool(
      'save_brand',
      'Save a brand profile (colours/fonts/logo/voice/tagline) into the app Brand section so it can be reused on future pages. Call after extracting a brand from a URL, a Divi export, or an uploaded image and the user wants to keep it.',
      {
        name: z.string(),
        colors: z.array(z.object({ hex: z.string(), role: z.string().optional() })).optional(),
        fonts: z.object({ heading: z.object({ family: z.string() }).optional(), body: z.object({ family: z.string() }).optional() }).optional(),
        logo: z.string().optional(),
        voice: z.string().optional(),
        tagline: z.string().optional(),
      },
      async (a) => {
        try {
          const { createBrandProfile } = require('../db');
          const id = createBrandProfile({
            name: a.name,
            data: { colors: a.colors || [], fonts: a.fonts || {}, logo: a.logo || null, voice: a.voice || '', tagline: a.tagline || '' },
            source_type: 'chat',
          });
          s.sink?.event('brand_saved', { id, name: a.name });
          return { content: [{ type: 'text', text: `Saved brand "${a.name}" (id ${id}) to the Brand section.` }] };
        } catch (e) { return { content: [{ type: 'text', text: `save failed: ${e.message}` }] }; }
      },
    );

    // STAGE 2 — once the mockup is approved, the agent calls this instead of
    // asking "shall I generate?" in prose. It renders the app's existing
    // one-click Generate card, which runs the real /generate pipeline and shows
    // a preview in the canvas. Fire-and-return — the user drives generation.
    const propose = tool(
      'propose_page',
      'Propose generating the Divi 5 page once you have gathered enough of the brief. Renders a one-click Generate card in the app that runs the real page generator and shows a live preview. ALWAYS use this when ready to build — never ask "shall I generate?" in plain text, the user cannot act on prose.',
      {
        brand: z.string().optional(),
        keyword: z.string().optional(),
        pageType: z.string().optional(),
        sections: z.array(z.string()).optional(),
        ctaLabel: z.string().optional(),
        aesthetic: z.string().optional(),
      },
      async (a) => {
        // Carry the approved mockup path so Stage 2 matches the draft, not just the text brief.
        s.sink?.event('gen_intent', s.lastMockupPath ? { ...a, mockupPath: s.lastMockupPath } : a);
        return { content: [{ type: 'text', text: 'Generate card shown to the user. They can click Start to generate and preview the page. Offer to refine the brief or wait for their result.' }] };
      },
    );

    return createSdkMcpServer({ name: 'divi-inputs', version: '1.0.0', tools: [colour, number, form, mockup, propose, extract, saveBrand] });
  } catch (e) {
    console.warn('[claude-agent] custom input tools disabled:', e.message);
    return null;
  }
}

// ── Runner: one long-lived query() per session ───────────────────────────────
async function startRunner(s) {
  const sdk = await import('@anthropic-ai/claude-agent-sdk');
  const { query } = sdk;
  const inputServer = buildInputTools(s, sdk);

  const options = {
    model: 'sonnet',
    cwd: s.cwd,
    permissionMode: 'default',
    settingSources: ['user', 'project'], // loads this repo's divi5generate skills (verified via smoke test)
    canUseTool: makeCanUseTool(s),
  };
  if (inputServer) options.mcpServers = { 'divi-inputs': inputServer };

  (async () => {
    try {
      for await (const msg of query({ prompt: inputStream(s), options })) {
        const sink = s.sink;
        if (!sink) continue; // no client attached for this moment; drop UI events
        if (msg.type === 'system' && msg.subtype === 'init') {
          sink.event('status', { text: 'thinking…' });
        } else if (msg.type === 'assistant') {
          for (const b of msg.message.content) {
            if (b.type === 'text') sink.data({ chunk: b.text });
            else if (b.type === 'tool_use') sink.event('tool_use', { name: b.name });
          }
        } else if (msg.type === 'result') {
          sink.event('turn_done', {});
          if (s.onTurnEnd) { const f = s.onTurnEnd; s.onTurnEnd = null; f(); }
        }
      }
    } catch (err) {
      s.sink?.data({ chunk: `\n⚠ ${err.message || err}` });
      if (s.onTurnEnd) { const f = s.onTurnEnd; s.onTurnEnd = null; f(); }
    } finally {
      closeSession(s.id);
    }
  })();
}

// ── Public API ───────────────────────────────────────────────────────────────
// Start a new turn (creating the session on first call). Returns the sessionId,
// whether it was newly created, and a `done` promise that resolves when this
// turn's response is complete (so the caller can end the HTTP response).
async function startOrContinue({ sessionId, text, cwd, appBase, sink }) {
  let s = sessionId && sessions.get(sessionId);
  const isNew = !s;
  if (!s) s = newSession(cwd, appBase);
  s.sink = sink;
  resetIdle(s);
  const done = new Promise((resolve) => { s.onTurnEnd = resolve; });
  if (isNew) await startRunner(s);
  pushMessage(s, text);
  return { sessionId: s.id, isNew, done };
}

module.exports = { startOrContinue, answerInput, detachSink, closeSession };
