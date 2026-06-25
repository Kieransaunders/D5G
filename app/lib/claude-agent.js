// claude-agent.js — interactive, multi-turn Claude sessions via the Agent SDK.
//
// v3: resume-based model — each turn is a fresh query({ prompt, options: { resume } })
// instead of a held-open streaming-input generator. Simpler, less version-sensitive,
// and enables restart-persistence (sdkSessionId survives in DB/memory between turns).
//
// Auth: SDK spawns `claude` CLI using your `claude login` subscription session.

'use strict';

const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../db');
const { registerGenerationFromDir } = require('./generation-registrar');

// ── State ────────────────────────────────────────────────────────────────────
const sessions = new Map(); // appSessionId → Session
const pending  = new Map(); // reqId → { resolve, reject, sessionId }
const IDLE_MS  = 15 * 60 * 1000;

// ── Session ──────────────────────────────────────────────────────────────────
function newSession(cwd, appBase, genOutputs) {
  const s = {
    id: randomUUID(),
    sdkSessionId: null,   // filled from system/init; passed as options.resume next turn
    cwd,
    appBase,
    genOutputs,
    lastMockupPath: null,
    lastBuild: null,
    sink: null,           // current SSE writer; updated each turn
    idleTimer: null,
  };
  sessions.set(s.id, s);
  resetIdle(s);
  return s;
}

function resetIdle(s) {
  if (s.idleTimer) clearTimeout(s.idleTimer);
  s.idleTimer = setTimeout(() => sessions.delete(s.id), IDLE_MS);
}

function closeSession(id) {
  const s = sessions.get(id);
  if (!s) return;
  if (s.idleTimer) clearTimeout(s.idleTimer);
  for (const [rid, p] of pending) {
    if (p.sessionId === id) { p.reject(new Error('session closed')); pending.delete(rid); }
  }
  sessions.delete(id);
}

function detachSink(id, sink) {
  const s = sessions.get(id);
  if (s && s.sink === sink) s.sink = null;
}

// ── Browser round-trip ───────────────────────────────────────────────────────
function askBrowser(s, eventName, data) {
  return new Promise((resolve, reject) => {
    if (!s.sink) return reject(new Error('no client attached to answer'));
    const id = randomUUID();
    pending.set(id, { resolve, reject, sessionId: s.id });
    s.sink.event(eventName, { id, ...data });
  });
}

function answerInput(id, value) {
  const p = pending.get(id);
  if (!p) return false;
  p.resolve(value);
  pending.delete(id);
  return true;
}

// ── canUseTool: intercept AskUserQuestion for browser round-trip ─────────────
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

    const mockup = tool(
      'show_mockup',
      'Show a self-contained HTML mockup of the page in the app canvas (Stage 1). Pass a complete <html> document using the brand colours/fonts. Call this FIRST, before proposing real generation, and call it again each time the user asks for a change so they see it update. This is a draft preview, not the final Divi page.',
      { html: z.string().describe('a complete, self-contained HTML document'), title: z.string().optional() },
      async (a) => {
        try { s.lastMockupPath = path.join(s.cwd, `mockup-${s.id}.html`); fs.writeFileSync(s.lastMockupPath, a.html); } catch (_) {}
        s.sink?.event('mockup', { html: a.html, title: a.title || 'Mockup · draft' });
        return { content: [{ type: 'text', text: 'Mockup is showing in the canvas. Ask if they want changes; when they approve, call start_build to build the real Divi 5 page in-chat, then run the page-generator skill and call deliver_page.' }] };
      },
    );

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

    const startBuild = tool(
      'start_build',
      'Begin building the real Divi 5 page once the user approves the mockup. Call this INSTEAD of asking "shall I generate?" — the user cannot act on prose. Returns the output directory path and the exact build instructions; follow them, then call deliver_page with the same dirPath once the page JSON exists.',
      {
        brand: z.string().describe('brand name'),
        keyword: z.string().optional().describe('primary SEO keyword'),
        pageType: z.string().optional().describe('home / landing / about / contact / page'),
        sections: z.array(z.string()).optional().describe('section labels the user confirmed'),
        ctaLabel: z.string().optional().describe('primary CTA button text'),
        aesthetic: z.string().optional().describe('chosen aesthetic'),
        motion: z.string().optional().describe('DiviTheatre motion preference: yes / want / no'),
      },
      async (a) => {
        const dir = path.join(s.genOutputs, String(Date.now()));
        try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}

        const sectionsArr = Array.isArray(a.sections) ? a.sections : [];
        let genId = null;
        try {
          genId = db.prepare(`
            INSERT INTO generations (brand, keyword, sections, aesthetic, cta_label, cta_url, output_dir, export_path, what_it_does, page_type, sdk_session_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            a.brand || '', a.keyword || '', JSON.stringify(sectionsArr), a.aesthetic || '',
            a.ctaLabel || '', '', dir, null, '', a.pageType || '', s.sdkSessionId || null
          ).lastInsertRowid;
          s.lastBuild = { genId, dir };
        } catch (e) {
          return { content: [{ type: 'text', text: `start_build failed to create a generation row: ${e.message}` }] };
        }

        s.sink?.event('building', { genId, brand: a.brand, keyword: a.keyword });
        s.sink?.event('status', { text: 'Building the Divi 5 page…' });

        const brief = [
          `/divi5generate:divi5-page-generator`,
          `Build a ${a.pageType || 'landing'} page for ${a.brand}.`,
          a.keyword ? `Primary keyword: ${a.keyword}.` : '',
          sectionsArr.length ? `Sections: ${sectionsArr.join(', ')}.` : 'Sections: Hero, Features, CTA.',
          a.aesthetic ? `Aesthetic: ${a.aesthetic}.` : '',
          a.ctaLabel ? `Primary CTA: "${a.ctaLabel}".` : '',
          a.motion ? `DiviTheatre motion: ${a.motion}.` : '',
          (s.lastMockupPath && fs.existsSync(s.lastMockupPath))
            ? `APPROVED MOCKUP: the user approved an HTML mockup at ${s.lastMockupPath}. Read it with the Read tool and reproduce its layout, section order, colours, fonts and copy as faithfully as possible in Divi 5.`
            : '',
          `Write all output files (the [brand]-landing-page.json, seo-meta.json, schema.json and a preview-[brand].html) into this directory: ${dir}`,
          `This is HEADLESS/BRIEF MODE: run fully autonomously to file delivery. Do NOT ask any questions and do NOT stop for approval. The run is only complete when a validated [brand]-landing-page.json (valid et_builder JSON) exists in ${dir}.`,
        ].filter(Boolean).join('\n');

        return {
          content: [{ type: 'text', text:
            `Build started (generation #${genId}). Output directory:\n${dir}\n\n` +
            `Now run the page-generator skill with exactly this prompt:\n\n${brief}\n\n` +
            `When the [brand]-landing-page.json exists in that directory, call deliver_page with dirPath="${dir}". ` +
            `Do NOT tell the user to click anything — you are doing the build.` }],
        };
      },
    );

    const deliverPage = tool(
      'deliver_page',
      'Call this AFTER the divi5-page-generator skill has written the [brand]-landing-page.json into the build directory. Registers the generated page with the app (so it appears in the Generations tab, canvas preview, and import flow) and shows the preview to the user. Pass the same dirPath that start_build returned.',
      { dirPath: z.string().describe('the build output directory start_build returned') },
      async (a) => {
        const dir = a.dirPath;
        if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
          return { content: [{ type: 'text', text: `deliver_page: directory not found: ${dir}. Did the build write its outputs?` }] };
        }
        const build = s.lastBuild || {};
        const genId = build.genId;
        if (!genId) {
          return { content: [{ type: 'text', text: 'deliver_page: no active build to register. Call start_build first.' }] };
        }

        if (s.lastMockupPath && fs.existsSync(s.lastMockupPath)) {
          try { fs.copyFileSync(s.lastMockupPath, path.join(dir, 'mockup-preview.html')); } catch (_) {}
        }

        const { status, files, hasPreview, pageProblem } = registerGenerationFromDir({
          genId, outputPath: dir, exitCode: 0, exportPath: null,
        });

        s.sink?.event('page_built', { genId, status, hasPreview, files });

        if (status === 'complete') {
          return { content: [{ type: 'text', text:
            `Page delivered — generation #${genId} is complete and the preview is showing in the canvas. ` +
            `The user can import it to WordPress from the canvas. Offer to refine anything.` }] };
        }
        return { content: [{ type: 'text', text:
          `Build finished with status "${status}". ${pageProblem ? 'The page JSON was missing or malformed — re-run the page-generator skill and call deliver_page again.' : 'Check the output directory and try again.'}` }] };
      },
    );

    return createSdkMcpServer({ name: 'divi-inputs', version: '1.0.0', tools: [colour, number, form, mockup, startBuild, deliverPage, extract, saveBrand] });
  } catch (e) {
    console.warn('[claude-agent] custom input tools disabled:', e.message);
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
// Run one turn. Creates a new in-memory session on first call; resumes via the
// SDK session id (options.resume) on subsequent turns. Awaits the full turn so
// the caller's HTTP response stays open for the duration.
//
// onSession(id, isNew) fires as soon as the session is identified (before the
// turn completes), so the caller can wire up disconnect handlers early.
//
// resumeSdkSession: a claude SDK session UUID from a previous server run (e.g.
// looked up from the DB on /rerun). Seeds the first turn's options.resume so
// the conversation history is restored from ~/.claude/projects/.
async function startOrContinue({ sessionId, resumeSdkSession, text, cwd, appBase, genOutputs, sink, onSession }) {
  let s = sessionId && sessions.get(sessionId);
  const isNew = !s;
  if (!s) {
    s = newSession(cwd, appBase, genOutputs);
    if (resumeSdkSession) s.sdkSessionId = resumeSdkSession;
  }
  s.sink = sink;
  resetIdle(s);

  if (onSession) onSession(s.id, isNew);

  const sdk = _sdkOverride || await import('@anthropic-ai/claude-agent-sdk');
  const { query } = sdk;
  const inputServer = buildInputTools(s, sdk);

  const options = {
    model: 'sonnet',
    cwd: s.cwd,
    permissionMode: 'default',
    settingSources: ['user', 'project'],
    canUseTool: makeCanUseTool(s),
  };
  if (s.sdkSessionId) options.resume = s.sdkSessionId;
  if (inputServer) options.mcpServers = { 'divi-inputs': inputServer };

  try {
    for await (const msg of query({ prompt: text, options })) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        // Capture the SDK session id on the first turn; subsequent turns reuse it.
        if (!s.sdkSessionId) s.sdkSessionId = msg.session_id;
        s.sink?.event('status', { text: 'thinking…' });
      } else if (msg.type === 'assistant') {
        for (const b of msg.message.content) {
          if (b.type === 'text') s.sink?.data({ chunk: b.text });
          else if (b.type === 'tool_use') s.sink?.event('tool_use', { name: b.name });
        }
      } else if (msg.type === 'result') {
        s.sink?.event('turn_done', {});
      }
    }
  } catch (err) {
    s.sink?.data({ chunk: `\n⚠ ${err.message || err}` });
  }

  // sdkSessionId is the durable key the server persists the transcript under
  // (it survives an app restart in ~/.claude/projects/). It's known by now —
  // captured from the system/init message above — unless the turn errored
  // before init, in which case it's null and the server skips persistence.
  return { sessionId: s.id, isNew, sdkSessionId: s.sdkSessionId };
}

// ponytail: test seam — lets tests inject a mock SDK without mocking the ESM loader.
let _sdkOverride = null;
function _setSdkForTest(mock) { _sdkOverride = mock; }

module.exports = { startOrContinue, answerInput, detachSink, closeSession, _setSdkForTest };
