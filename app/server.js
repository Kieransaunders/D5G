'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn, execSync } = require('child_process');
const { db, EXPORTS_DIR, DATA_DIR } = require('./db');
const {
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, deleteDesignProject,
} = require('./db');
const { isSafeHost } = require('./lib/ssrf-guard');
const { extractIntent, stripIntent } = require('./lib/intent-marker');
const { buildImportPayload } = require('./lib/import-payload');
const { normalizePagesList, isValidSlug } = require('./lib/wp-pages');
const { startOrContinue, answerInput, detachSink } = require('./lib/claude-agent');
const { registerGenerationFromDir } = require('./lib/generation-registrar');
const { screenshot: takeScreenshot, resolveExecutable } = require('./lib/screenshot');

// The DTI plugin version this app's client behaviour is written against. When
// /ping reports a lower deployed version, the health chip warns — e.g. an older
// plugin defaults imports to draft (pre-1.5.4), which silently breaks live QA.
// Bump this in lockstep with plugin/divi-tools-importer.php DTI_VERSION.
const EXPECTED_DTI_VERSION = '1.5.4';

// Local/loopback hosts the QA loop is *meant* to screenshot — the user's own
// WordPress site. Unlike brand-extract (which fetches arbitrary public URLs and
// must block private ranges), screenshots target the configured site, which is
// usually localhost. Allow loopback + .local explicitly here.
const LOCAL_HOST_RE = /^(localhost|127\.|\.local$|::1)/i;

const PLUGIN_DIR  = path.resolve(__dirname, '..');

// Generation outputs must live on persistent storage. A caller-supplied dir in
// /tmp (or the OS temp dir) gets purged by macOS — periodic clean removes files
// after a few days and reboots wipe it — which later breaks /preview-html and
// /download with no obvious cause. Redirect volatile paths to the app data dir.
const GEN_OUTPUTS = path.join(DATA_DIR, 'outputs');
function resolveOutputDir(outputDir) {
  const isVolatile = p =>
    /^(\/private)?\/tmp(\/|$)/.test(p) ||
    p === os.tmpdir() || p.startsWith(os.tmpdir() + path.sep);
  if (!outputDir || isVolatile(outputDir)) {
    return path.join(GEN_OUTPUTS, String(Date.now()));
  }
  return outputDir;
}

const ET_PAGES    = require(path.join(PLUGIN_DIR, 'skills', 'divi5-page-generator', 'scripts', 'et-pages.js'));
const PORT        = parseInt(process.env.PORT) || 3747;

const app    = express();
const upload = multer({ dest: os.tmpdir() });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── SSE clients map: generationId → [res, ...] ────────────────────────────
const sseClients = new Map();

function sendSSE(genId, event, data) {
  const clients = sseClients.get(genId) || [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

// ─── GET /et-pages — ET pack page list ──────────────────────────────────────
app.get('/et-pages', (_req, res) => {
  try {
    res.json(ET_PAGES.list());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /stream/:id — SSE live log ─────────────────────────────────────────
app.get('/stream/:id', (req, res) => {
  const id = parseInt(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send existing log on connect
  const gen = db.prepare('SELECT * FROM generations WHERE id = ?').get(id);
  if (!gen) {
    res.write(`event: done\ndata: ${JSON.stringify({ status: 'not_found' })}\n\n`);
    return res.end();
  }
  if (gen.log) res.write(`event: log\ndata: ${JSON.stringify({ chunk: gen.log })}\n\n`);
  if (gen.status !== 'running') {
    const files = db.prepare('SELECT * FROM output_files WHERE generation_id=?').all(id);
    const hasPreview = gen.output_dir ? (() => { try { return fs.readdirSync(gen.output_dir).some(f => f.endsWith('.html')); } catch { return false; } })() : false;
    res.write(`event: done\ndata: ${JSON.stringify({ status: gen.status, styleCheck: gen.style_check, files, hasPreview })}\n\n`);
    return res.end();
  }

  if (!sseClients.has(id)) sseClients.set(id, []);
  sseClients.get(id).push(res);

  req.on('close', () => {
    const list = sseClients.get(id) || [];
    sseClients.set(id, list.filter(r => r !== res));
  });
});

// ─── POST /generate ──────────────────────────────────────────────────────────
app.post('/generate', upload.single('exportFile'), (req, res) => {
  const {
    brand, whatItDoes, keyword, secondaryKeywords,
    sections, aesthetic, ctaLabel, ctaUrl,
    motion, outputDir, exportLabel, savedExportId, revisionNotes,
    etTemplate, brandId, mockupPath,
  } = req.body;

  const sectionsArr = Array.isArray(sections) ? sections : (sections ? [sections] : []);
  const outputPath  = resolveOutputDir(outputDir);
  try {
    fs.mkdirSync(outputPath, { recursive: true });
  } catch (e) {
    return res.status(400).json({ error: `Cannot write to output folder "${outputPath}": ${e.message}` });
  }

  // Resolve designer export: saved selection takes priority over new upload
  let exportPath = null;
  if (savedExportId) {
    const saved = db.prepare('SELECT * FROM designer_exports WHERE id=?').get(parseInt(savedExportId));
    if (saved && fs.existsSync(saved.filepath)) exportPath = saved.filepath;
  }
  if (!exportPath && req.file) {
    const dest = path.join(EXPORTS_DIR, `${Date.now()}-${req.file.originalname}`);
    fs.renameSync(req.file.path, dest);
    exportPath = dest;

    // Parse preset/colour counts for history
    try {
      const doc = JSON.parse(fs.readFileSync(dest, 'utf8'));
      const presets = Object.values(doc.presets?.module || {});
      const presetCount = presets.reduce((n, g) => n + Object.keys(g.items || {}).length, 0);
      const colourCount = (doc.global_colors || []).length;
      db.prepare(`INSERT INTO designer_exports (label, brand, filepath, preset_count, colour_count)
                  VALUES (?, ?, ?, ?, ?)`)
        .run(exportLabel || brand, brand, dest, presetCount, colourCount);
    } catch (_) {}
  }

  // Build brief prompt
  const sectionList = sectionsArr.join(', ') || 'Hero, Features, CTA';
  const motionLine  = motion === 'yes' ? 'DiviTheatre motion: Yes.' :
                      motion === 'want' ? 'DiviTheatre motion: No but I want it.' : '';
  const secondary   = secondaryKeywords ? ` Secondary keywords: ${secondaryKeywords}.` : '';

  // Resolve ET template sections for the prompt
  let etTemplateLine = '';
  if (etTemplate) {
    const hit = ET_PAGES.match(etTemplate);
    const sectionStr = hit ? hit.sections.join(', ') : '';
    etTemplateLine = `ET pack template: "${etTemplate}"${sectionStr ? ` (sections: ${sectionStr})` : ''}. Use Stage 0 to clone this template as the starting point before customising copy and branding.`;
  }

  const prompt = [
    `/divi5generate:divi5-page-generator`,
    `Build a landing page for ${brand}. ${whatItDoes || ''}`,
    `Primary keyword: ${keyword}.${secondary}`,
    etTemplateLine || `Sections: ${sectionList}.`,
    aesthetic ? `Aesthetic: ${aesthetic}.` : '',
    `Primary CTA: "${ctaLabel || 'Get Started'}" linking to ${ctaUrl || '#'}.`,
    motionLine,
    revisionNotes ? `REVISION NOTES (apply these changes from the previous version): ${revisionNotes}` : '',
    (mockupPath && fs.existsSync(mockupPath))
      ? `APPROVED MOCKUP: the user approved an HTML mockup at ${mockupPath}. Read it with the Read tool and reproduce its layout, section order, colours, fonts and copy as faithfully as possible in Divi 5.`
      : '',
  ].filter(Boolean).join(' ');

  // Insert generation record
  const genId = db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, cta_label, cta_url, output_dir, export_path, what_it_does, secondary_keywords, et_template)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brand || '', keyword || '', JSON.stringify(sectionsArr), aesthetic || '', ctaLabel || '', ctaUrl || '', outputPath, exportPath, whatItDoes || '', secondaryKeywords || '', etTemplate || null).lastInsertRowid;

  res.json({ id: genId });

  // ── Extract design tokens from export and seed output dir ──────────────
  let paletteHint = '';
  if (exportPath) {
    try {
      const extractScript = path.join(PLUGIN_DIR, 'skills', 'divi5-extract-style', 'scripts', 'extract-from-export.js');
      if (fs.existsSync(extractScript)) {
        execSync(`node "${extractScript}" "${exportPath}" --out "${outputPath}"`, { encoding: 'utf8' });
        // Extract palette from presets (global_colors may be empty)
        const doc = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
        const allHex = [...new Set(
          JSON.stringify(doc.presets || {}).match(/#[0-9a-fA-F]{6}\b/g) || []
        )];
        if (allHex.length) paletteHint = `Brand colour palette extracted from the designer export — use ONLY these colours: ${allHex.join(', ')}. Do NOT invent new colours.`;
      }
    } catch (_) {}
  }

  // A picked brand profile injects its exact palette + fonts (overrides the
  // looser export-scraped hint above).
  if (brandId && !paletteHint) {
    const b = getBrandProfile(parseInt(brandId));
    if (b && b.data) {
      const colors = (b.data.colors || []).map(c => c.role ? `${c.hex} (${c.role})` : c.hex).join(', ');
      const fonts = [b.data.fonts?.heading?.family && `headings ${b.data.fonts.heading.family}`,
                     b.data.fonts?.body?.family && `body ${b.data.fonts.body.family}`].filter(Boolean).join(', ');
      const bits = [];
      if (colors) bits.push(`use ONLY these brand colours, do not invent new ones: ${colors}`);
      if (fonts)  bits.push(`brand fonts: ${fonts}`);
      if (bits.length) paletteHint = `Brand "${b.name}" — ${bits.join('; ')}.`;
    }
  }

  const fullPrompt = paletteHint ? `${prompt} ${paletteHint}` : prompt;

  runClaudeGeneration(genId, outputPath, fullPrompt, exportPath);
});

// ── Run the divi5 generator via the claude CLI, streaming logs over SSE ──────
// Shared by /generate and /design-handoff. exportPath is optional and only
// drives the post-run style check (skipped when null).
function runClaudeGeneration(genId, outputPath, fullPrompt, exportPath = null) {
  // ── Spawn claude ────────────────────────────────────────────────────────
  const claudeBin = findClaude();
  if (!claudeBin) {
    db.prepare(`UPDATE generations SET status='failed', log=? WHERE id=?`)
      .run('ERROR: claude CLI not found. Install Claude Code first.', genId);
    sendSSE(genId, 'log', { chunk: 'ERROR: claude CLI not found. Install Claude Code first.\n' });
    sendSSE(genId, 'done', { status: 'failed' });
    return;
  }

  const proc = spawn(claudeBin, ['-p', '--dangerously-skip-permissions',
    '--plugin-dir', PLUGIN_DIR, fullPrompt], {
    cwd: outputPath,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.stdin.end(); // send immediate EOF so claude doesn't wait for stdin

  // Hang guard (same issue as /chat): a stalled page-generator run would emit
  // nothing forever, leaving a stuck generation + orphan process. Kill it after
  // the no-output window and mark the run failed so the UI stops "running".
  const GEN_TIMEOUT_MS = 180000; // 3 min with zero output
  let lastGenOutputAt = Date.now();
  const genHangTimer = setInterval(() => {
    if (Date.now() - lastGenOutputAt >= GEN_TIMEOUT_MS) {
      clearInterval(genHangTimer);
      const warn = '\n⚠ Generation stalled (no output for 3 min) — killed. Re-run, or try a smaller brief.\n';
      appendLog.run(warn, genId);
      sendSSE(genId, 'log', { chunk: warn });
      sendSSE(genId, 'done', { status: 'failed' });
      db.prepare(`UPDATE generations SET status='failed' WHERE id=?`).run(genId);
      proc.kill('SIGKILL');
    }
  }, 30000);
  const resetGenHang = () => { lastGenOutputAt = Date.now(); };
  const appendLog = db.prepare(`UPDATE generations SET log = log || ? WHERE id = ?`);

  proc.stdout.on('data', chunk => {
    resetGenHang();
    const text = chunk.toString();
    appendLog.run(text, genId);
    sendSSE(genId, 'log', { chunk: text });
  });

  proc.stderr.on('data', chunk => {
    resetGenHang();
    const text = chunk.toString();
    appendLog.run(text, genId);
    sendSSE(genId, 'log', { chunk: text });
  });

  proc.on('close', async (code) => {
    clearInterval(genHangTimer);

    // Register the generation's outputs via the shared helper so the success
    // contract is identical to the in-chat agent build path (deliver_page).
    // The logger adapts the legacy per-run SSE/log plumbing to the helper's
    // { sendLog, sendSSE } shape.
    const logger = {
      sendLog: (chunk) => appendLog.run(chunk, genId),
      sendSSE: (event, data) => sendSSE(genId, event, data),
    };
    const { status, styleCheck, files: outputFiles, hasPreview } =
      registerGenerationFromDir({ genId, outputPath, exitCode: code, exportPath, logger });

    // Send final file list to UI
    sendSSE(genId, 'done', { status, styleCheck, files: outputFiles, hasPreview });

    // Close SSE connections
    (sseClients.get(genId) || []).forEach(r => r.end());
    sseClients.delete(genId);
  });
}

// ─── POST /design-handoff — ingest a Claude Design hand-off bundle ───────────
// Accepts a Claude Design hand-off bundle (.zip or .json) and runs the
// claude-design-to-divi skill, which converts it into an importable Divi 5 page
// via the page generator. Streams progress over the same SSE channel as
// /generate, so the UI can reuse the existing generation view.
app.post('/design-handoff', upload.single('bundle'), (req, res) => {
  const { brand, brandId, outputDir, publish } = req.body;
  if (!req.file) return res.status(400).json({ error: 'No hand-off bundle uploaded' });

  const outputPath = resolveOutputDir(outputDir);
  try {
    fs.mkdirSync(outputPath, { recursive: true });
  } catch (e) {
    return res.status(400).json({ error: `Cannot write to output folder "${outputPath}": ${e.message}` });
  }

  // Store the uploaded bundle (zip or json) alongside other exports.
  const safeName   = (req.file.originalname || 'bundle').replace(/[^a-zA-Z0-9._-]/g, '_');
  const bundlePath = path.join(EXPORTS_DIR, `${Date.now()}-${safeName}`);
  fs.renameSync(req.file.path, bundlePath);

  const genId = db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, cta_label, cta_url, output_dir, export_path, what_it_does)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brand || 'claude-design', '', '[]', '', '', '', outputPath, bundlePath,
         'Imported from a Claude Design hand-off bundle').lastInsertRowid;

  res.json({ id: genId });

  // Build the skill prompt. brand/brandId become the --brand flag; quotes are
  // stripped so the value can't break the surrounding prompt token.
  const brandArg   = (brand || brandId || '').toString().replace(/["\\]/g, '');
  const brandFlag  = brandArg ? ` --brand "${brandArg}"` : '';
  const publishFlag = (publish === 'true' || publish === true) ? ' --publish' : '';
  const prompt = [
    `/divi5generate:claude-design-to-divi`,
    `${bundlePath}${brandFlag}${publishFlag}`,
    `Convert this Claude Design hand-off bundle into an importable Divi 5 page, then preview it.`,
  ].join(' ');

  runClaudeGeneration(genId, outputPath, prompt, null);
});

// Parse the stored sections value defensively. The generator writes plain text
// ("Hero,Services,CTA") but older rows may hold JSON arrays; JSON.parse throws
// on the former and used to 500 the whole history list.
function parseSections(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith('[')) { try { return JSON.parse(s); } catch { /* fall through */ } }
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

// ─── GET /generations — history list ────────────────────────────────────────
// Emits a `viewable` flag so the UI can grey out / skip entries whose output
// dir was purged (e.g. /tmp generations) and which have no DB-stored preview —
// without it, clicking those lands on a dead "/preview-html" error.
function generationViewable(r) {
  if (r.has_preview && r.preview_html && r.preview_html.length > 0) return true;
  if (r.output_dir && fs.existsSync(r.output_dir)) {
    try {
      return fs.readdirSync(r.output_dir).some(f => f.endsWith('.html'));
    } catch { return false; }
  }
  return false;
}

app.get('/generations', (req, res) => {
  const rows = db.prepare(`SELECT * FROM generations ORDER BY id DESC LIMIT 50`).all();
  res.json(rows.map(r => ({
    ...r,
    sections: parseSections(r.sections),
    viewable: generationViewable(r),
  })));
});

// ─── GET /generations/:id — single with files ───────────────────────────────
app.get('/generations/:id', (req, res) => {
  const gen   = db.prepare('SELECT * FROM generations WHERE id=?').get(req.params.id);
  if (!gen) return res.status(404).json({ error: 'Not found' });
  const files = db.prepare('SELECT * FROM output_files WHERE generation_id=?').all(req.params.id);
  res.json({ ...gen, sections: parseSections(gen.sections), files });
});

// ─── GET /download/:id/:filename ────────────────────────────────────────────
app.get('/download/:id/:filename', (req, res) => {
  const file = db.prepare('SELECT * FROM output_files WHERE generation_id=? AND filename=?')
    .get(req.params.id, req.params.filename);
  if (!file || !fs.existsSync(file.filepath)) return res.status(404).json({ error: 'File not found' });
  res.download(file.filepath, file.filename);
});

// ─── GET /exports — saved designer exports ───────────────────────────────────
app.get('/exports', (req, res) => {
  res.json(db.prepare('SELECT * FROM designer_exports ORDER BY id DESC').all());
});

// ─── GET /download-plugin — serve the importer plugin ZIP ────────────────────
app.get('/download-plugin', (req, res) => {
  // The zip isn't committed (the Claude Code plugin installer rejects nested
  // zips), so always build it from the unpacked source on demand.
  const buildScript = path.join(PLUGIN_DIR, 'skills', 'import-to-local', 'scripts', 'build-plugin-zip.sh');
  if (!fs.existsSync(buildScript)) return res.status(404).json({ error: 'Plugin build script not found' });
  try {
    const zip = execSync(`bash "${buildScript}"`).toString().trim();
    res.download(zip, 'divi-tools-importer.zip');
  } catch (e) {
    res.status(500).json({ error: 'Could not build plugin ZIP' });
  }
});

// ─── GET /settings ───────────────────────────────────────────────────────────
app.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const out  = {};
  rows.forEach(r => { out[r.key] = r.value; });
  // Never expose the raw API key — send a masked version
  if (out.apiKey) out.apiKey = out.apiKey.replace(/.(?=.{4})/g, '•');
  res.json(out);
});

// ─── POST /settings ───────────────────────────────────────────────────────────
app.post('/settings', (req, res) => {
  const { siteUrl, apiKey } = req.body;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  if (siteUrl !== undefined) upsert.run('siteUrl', siteUrl.trim());
  if (apiKey  !== undefined && !apiKey.includes('•')) upsert.run('apiKey', apiKey.trim());
  res.json({ ok: true });
});

// Chat role prompt. Chat is a *conversation*, not the page builder — the heavy
// generation runs separately in /generate. Without this, the spawned claude
// inherited the global "you MUST invoke skills" hook + the page-generator skill
// (via --plugin-dir) and hijacked the turn: it ran the skill silently for
// minutes (→ hang-guard timeout) and asked clarifying questions via the
// AskUserQuestion tool, which is invisible in `-p` text mode with stdin closed
// (→ "can't answer the AI's questions"). Keeping it conversational fixes both.
const CHAT_SYSTEM_PROMPT = [
  'You are the assistant inside the "Divi 5 Generator" web app chat box.',
  'Your ONLY job is a short conversation that turns the request into a page brief.',
  'Reply in plain, concise prose (under ~120 words). You have NO tools, skills,',
  'files or shell here — never invoke any.',
  'If you need more detail, ASK in your reply as a normal question; the user',
  'answers in their next message. NEVER use AskUserQuestion.',
  'When you have enough to build a page, end your reply with ONE line:',
  '<!-- GEN_INTENT: {"pageType":"...","brand":"...","keyword":"...","sections":["..."],"ctaLabel":"...","aesthetic":"..."} -->',
  'Include only fields you know. The app turns that into a "Generate" button and',
  'the real page build happens elsewhere — do NOT try to build the page yourself.',
].join(' ');

// ─── POST /chat — stream a Claude response ───────────────────────────────────
// Body: { message, history:[{role,content}], ctx:{ brandId, designId, generationId } }
// Streams SSE. Scans stdout for a GEN_INTENT marker and emits a `gen_intent`
// event (the frontend renders a confirm card); the marker is stripped from the
// visible text stream. Prepends an ACTIVE BRAND/DESIGN/PAGE preamble from ctx.
app.post('/chat', (req, res) => {
  const { message, history = [], ctx = {} } = req.body;
  const context = history.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  const preamble = buildChatPreamble(ctx);
  const prompt  = [preamble, context && `${context}`, `User: ${message}`].filter(Boolean).join('\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const claudeBin = findClaude();
  if (!claudeBin) {
    res.write(`data: ${JSON.stringify({ chunk: 'ERROR: claude CLI not found.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    return res.end();
  }

  // No --plugin-dir (chat doesn't need the divi skills — brand/design context is
  // injected via the preamble) and --setting-sources project to skip the global
  // ~/.claude hooks/skills. --disallowed-tools AskUserQuestion is belt-and-braces
  // so the model can't ask an invisible question. See CHAT_SYSTEM_PROMPT above.
  const proc = spawn(claudeBin, ['-p', '--dangerously-skip-permissions',
    '--setting-sources', 'project',
    '--disallowed-tools', 'AskUserQuestion',
    '--append-system-prompt', CHAT_SYSTEM_PROMPT, prompt], {
    cwd: PLUGIN_DIR, stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.stdin.end();

  // Hang guard: claude executing the page-generator skill can stall and emit
  // nothing for minutes (a known skill-level issue). A streaming fetch that
  // never gets a byte eventually fails as "Failed to fetch" in the browser and
  // leaves an orphan claude process. Kill it after the window and report it so
  // the user gets a clear message instead of an infinite wait.
  const CHAT_TIMEOUT_MS = 120000; // 2 min with zero output
  let lastOutputAt = Date.now();
  let gotAnyOutput = false;
  const hangTimer = setInterval(() => {
    if (Date.now() - lastOutputAt >= CHAT_TIMEOUT_MS) {
      clearInterval(hangTimer);
      res.write(`data: ${JSON.stringify({ chunk: '\n\n⚠ The generation stalled (no output for 2 min). The page-generator skill sometimes hangs. Try the Structured brief form, or rephrase the request.' })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      proc.kill('SIGKILL');
    }
  }, 15000);
  const resetHang = () => { lastOutputAt = Date.now(); gotAnyOutput = true; };

  // If the client disconnects (browser closed / navigates away), kill the
  // spawned claude so it doesn't run on as an orphan. NOTE: must listen on
  // `res` (the response closes when the client goes away), NOT `req` — `req`
  // fires 'close' as soon as the request body finishes reading, which would
  // kill claude before it emits anything.
  const onClientGone = () => {
    clearInterval(hangTimer);
    proc.kill('SIGKILL');
  };
  res.on('close', onClientGone);

  // Buffer stdout so we can detect a complete GEN_INTENT marker (it may arrive
  // split across chunks) and emit a gen_intent event, then stream the stripped
  // text. We flush the buffer up to the last newline each chunk so prose still
  // streams live; the tail (partial marker) is held back until more arrives.
  let buf = '';
  proc.stdout.on('data', chunk => {
    resetHang();
    buf += chunk.toString();
    const intent = extractIntent(buf);
    if (intent) {
      res.write(`event: gen_intent\ndata: ${JSON.stringify(intent)}\n\n`);
      buf = stripIntent(buf);
    }
    const nl = buf.lastIndexOf('\n');
    if (nl >= 0) {
      const emit = buf.slice(0, nl + 1);
      buf = buf.slice(nl + 1);
      res.write(`data: ${JSON.stringify({ chunk: emit })}\n\n`);
    }
  });
  proc.stderr.on('data', chunk => {
    resetHang();
    res.write(`data: ${JSON.stringify({ chunk: chunk.toString() })}\n\n`);
  });
  proc.on('close', () => {
    clearInterval(hangTimer);
    res.off('close', onClientGone);
    // Flush any remaining buffered text (minus a trailing marker).
    const tail = stripIntent(buf);
    if (tail) res.write(`data: ${JSON.stringify({ chunk: tail })}\n\n`);
    // If claude never produced real output, the skill likely stalled or asked
    // a clarifying question it couldn't deliver in -p mode. Surface that.
    if (!gotAnyOutput) {
      res.write(`data: ${JSON.stringify({ chunk: '⚠ No response — the request produced no output. If the AI was asking a question, retry; or use the Structured brief form.' })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  });
});

// Build the ACTIVE BRAND/DESIGN/PAGE preamble from chat context. Cheap DB reads;
// missing ids just omit the relevant line.
function buildChatPreamble(ctx) {
  if (!ctx || (!ctx.brandId && !ctx.designId && !ctx.generationId)) return '';
  const lines = ['[CHAT CONTEXT]'];
  if (ctx.brandId) {
    const b = getBrandProfile(ctx.brandId);
    if (b) {
      lines.push(`ACTIVE BRAND: ${b.name}`);
      const colors = (b.data && b.data.colors) || [];
      if (colors.length) {
        const swatches = colors.map(c => c.role ? `${c.hex} (${c.role})` : c.hex).join(', ');
        lines.push(`Brand palette — use ONLY these colours, do not invent new ones: ${swatches}`);
      }
      const fonts = (b.data && b.data.fonts) || {};
      const fontLine = [fonts.heading && `headings ${fonts.heading.family}`, fonts.body && `body ${fonts.body.family}`].filter(Boolean).join(', ');
      if (fontLine) lines.push(`Brand fonts: ${fontLine}.`);
    }
  }
  if (ctx.designId) {
    const d = getDesignProject(ctx.designId);
    if (d) lines.push(`ACTIVE DESIGN: ${d.name} (id ${d.id}) — reuse its tokens/colours verbatim`);
  }
  if (ctx.generationId) {
    lines.push(`ACTIVE PAGE: generation id ${ctx.generationId}`);
  }
  lines.push('[/CHAT CONTEXT]');
  return lines.join('\n');
}

// ─── POST /agent/chat — interactive, multi-turn Claude session via Agent SDK ──
// Body: { message, ctx, sessionId? }. First call (no sessionId) creates a
// persistent session and replies with `event: session {id}`; the client sends
// that id on every follow-up so the conversation iterates on the SAME page.
// SSE events: data:{chunk}|{done}, event: session|ask_question|ask_input|
// tool_use|status|turn_done. The session stays alive between turns (idle-closed
// after 15 min) — no stdin EOF, no hang-guard.
// Two-stage flow guidance, prepended to the first user turn. Keeps Claude Code
// defaults + the divi5generate skills intact (we steer via the message, not by
// replacing the system prompt).
// Scratch working dir for agent chat sessions — keeps any stray writes out of
// the repo root. In-chat Stage-2 builds now write under GEN_OUTPUTS (below) via
// the start_build / deliver_page tools, NOT the legacy /generate path.
const AGENT_CWD = path.join(GEN_OUTPUTS, '_chat');
try { fs.mkdirSync(AGENT_CWD, { recursive: true }); } catch (_) {}

const AGENT_GUIDE = [
  'You are helping build a Divi 5 web page inside an app, in TWO stages.',
  'STAGE 1 — MOCKUP (always first): have a short, focused conversation to gather the brief. Use the AskUserQuestion tool for choices and the pick_colour / pick_number / collect_fields tools for inputs. Then produce ONE self-contained HTML mockup of the page and show it by calling the show_mockup tool (use the brand colours/fonts if given). Iterate: each time the user asks for a change ("darker hero", "swap the sections"), call show_mockup again. Never ask "shall I generate?" in plain text — the user can only act through the tools and cards.',
  'STAGE 2 — BUILD: only once the user approves the mockup, call the start_build tool with the brief (brand, keyword, pageType, sections, ctaLabel, aesthetic, motion). It returns an output directory and the exact prompt to run. THEN actually run the divi5-page-generator skill yourself (in headless/brief mode) to write the [brand]-landing-page.json into that directory, and finally call the deliver_page tool with that directory so the app registers the page and shows the preview in the canvas. You are doing the build end-to-end — never hand off to a form or ask the user to click Start.',
].join('\n');

app.post('/agent/chat', async (req, res) => {
  const { message, ctx = {}, sessionId = null } = req.body || {};
  // Brand/design preamble + stage guidance only on the first turn; the SDK
  // session retains context after that, so follow-ups send just the raw message.
  const text = sessionId ? message : [AGENT_GUIDE, buildChatPreamble(ctx), `User: ${message}`].filter(Boolean).join('\n\n');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const sink = {
    event: (name, obj) => res.write(`event: ${name}\ndata: ${JSON.stringify(obj)}\n\n`),
    data:  (obj)        => res.write(`data: ${JSON.stringify(obj)}\n\n`),
  };

  // Keep-alive: Claude can go silent for tens of seconds while it thinks or
  // builds a mockup (and during a question round-trip). With no bytes flowing,
  // browsers/proxies drop the streaming response → "network error". A comment
  // ping every 15s keeps it open. Client ignores lines that aren't data:/event:.
  const keepAlive = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 15000);

  // Attached uploads (from /agent/upload): tell the agent the paths so it can
  // Read them (images via vision, exports/PDFs as files).
  const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];
  const text2 = attachments.length
    ? `${text}\n\n[Attached files — open with the Read tool: ${attachments.join(', ')}]`
    : text;

  let sid = sessionId;
  try {
    const r = await startOrContinue({ sessionId, text: text2, cwd: AGENT_CWD, appBase: `http://127.0.0.1:${PORT}`, genOutputs: GEN_OUTPUTS, sink });
    sid = r.sessionId;
    if (r.isNew) sink.event('session', { id: sid });
    res.on('close', () => { clearInterval(keepAlive); detachSink(sid, sink); }); // client left mid-turn; keep session
    await r.done;                                  // resolves on this turn's `result`
  } catch (e) {
    try { sink.data({ chunk: `\n⚠ ${e.message}` }); } catch (_) {}
  } finally {
    clearInterval(keepAlive);
    try { sink.data({ done: true }); res.end(); } catch (_) {}
  }
});

// ─── POST /agent/answer — feed an AskUserQuestion pick or custom input back ───
// Body: { id, value }. id came from an ask_question or ask_input event. value is
// a string (multiSelect joined / form JSON-stringified client-side).
app.post('/agent/answer', (req, res) => {
  const { id, value } = req.body || {};
  if (!id || typeof value !== 'string') return res.status(400).json({ error: 'id and value required' });
  res.json({ ok: answerInput(id, value) });
});

// ─── POST /agent/upload — attach an image/file to the chat for the agent ─────
// Saves into the agent scratch dir and returns its absolute path. The client
// then passes that path in the next /agent/chat as attachments[]; the agent
// reads it (images via vision, exports/PDFs as files).
const AGENT_UPLOADS = path.join(AGENT_CWD, 'uploads');
try { fs.mkdirSync(AGENT_UPLOADS, { recursive: true }); } catch (_) {}
app.post('/agent/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const safe = (req.file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const dest = path.join(AGENT_UPLOADS, `${Date.now()}-${safe}`);
  try { fs.renameSync(req.file.path, dest); } catch (e) { return res.status(500).json({ error: e.message }); }
  res.json({ path: dest, filename: safe });
});

// ─── GET /prereqs — check claude is installed ────────────────────────────────
app.get('/prereqs', (req, res) => {
  const claudeBin = findClaude();
  let claudeVersion = null;
  if (claudeBin) {
    try { claudeVersion = execSync(`${claudeBin} --version`).toString().trim(); } catch (_) {}
  }
  res.json({ claudeFound: !!claudeBin, claudeVersion });
});

// ─── helpers ────────────────────────────────────────────────────────────────
function findClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN; // ponytail: test/override hook
  const candidates = [
    'claude',
    '/usr/local/bin/claude',
    path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
    path.join(os.homedir(), '.local', 'bin', 'claude'),
  ];
  for (const c of candidates) {
    try { execSync(`which "${c}" 2>/dev/null || test -f "${c}"`); return c; } catch (_) {}
  }
  try { return execSync('which claude').toString().trim(); } catch (_) { return null; }
}

// ─── POST /import/:id — Import generated page to WordPress ───────────────────
app.post('/import/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });
    const { siteUrl, apiKey } = settings;
    if (!siteUrl || !apiKey) return res.status(400).json({ error: 'WordPress settings not configured' });

    const pageFile  = db.prepare(`SELECT * FROM output_files WHERE generation_id=? AND kind='page'`).get(id);
    const seoFile   = db.prepare(`SELECT * FROM output_files WHERE generation_id=? AND kind='seo-meta'`).get(id);
    const schemaFile= db.prepare(`SELECT * FROM output_files WHERE generation_id=? AND kind='schema'`).get(id);

    if (!pageFile || !fs.existsSync(pageFile.filepath)) {
      return res.status(404).json({ error: 'Page output file not found' });
    }

    const rawPage = fs.readFileSync(pageFile.filepath, 'utf8');
    if (rawPage.trimStart().startsWith('<')) {
      return res.json({ ok: false, error: 'Page file contains HTML, not JSON — the skill wrote an HTML preview with a .json extension. Re-run the generation.' });
    }
    const layout = JSON.parse(rawPage);
    const seo    = seoFile   && fs.existsSync(seoFile.filepath)   ? JSON.parse(fs.readFileSync(seoFile.filepath,   'utf8')) : null;
    const schema = schemaFile&& fs.existsSync(schemaFile.filepath) ? JSON.parse(fs.readFileSync(schemaFile.filepath,'utf8')) : null;

    // Plugin ≥ 1.5.4 (and buildImportPayload) default to publish=true so the
    // imported page is LIVE and screenshot-readable. Allow an explicit
    // publish:false override to force a draft.
    const publish = req.body?.publish !== false;

    db.prepare(`UPDATE generations SET import_status='importing' WHERE id=?`).run(id);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let wpRes;
    try {
      wpRes = await fetch(`${siteUrl}/wp-json/divi-tools/v1/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Divi-Tools-Key': apiKey,
        },
        body: JSON.stringify(buildImportPayload({ layout, seo, schema, publish })),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!wpRes.ok) {
      const errText = await wpRes.text();
      db.prepare(`UPDATE generations SET import_status='failed' WHERE id=?`).run(id);
      return res.json({ ok: false, error: mapImportError(wpRes.status, errText) });
    }

    const data = await wpRes.json();
    const previewUrl = data.previewUrl || data.preview_url || null;
    // The permalink is the screenshot target: a published page renders at
    // siteUrl/<slug>/ with no login (draft ?preview=true links 404 headlessly).
    const slug = data.slug || null;
    let liveUrl = null;
    if (slug) {
      try { liveUrl = new URL(`${slug}/`, siteUrl).href; } catch { liveUrl = null; }
    }
    db.prepare(`UPDATE generations SET import_status='imported', preview_url=? WHERE id=?`).run(previewUrl, id);
    res.json({ ok: true, previewUrl, slug, liveUrl, status: data.status || null, warnings: data.warnings || [] });

  } catch (err) {
    db.prepare(`UPDATE generations SET import_status='failed' WHERE id=?`).run(id);
    res.json({ ok: false, error: err.name === 'AbortError' ? 'WordPress import timed out' : err.message });
  }
});

// Map WordPress/DTI HTTP errors to actionable user messages instead of raw
// `${status}: ${text}`. Keep the underlying detail for the curious.
function mapImportError(status, text) {
  let detail = text;
  try { detail = JSON.parse(text).message || text; } catch { /* keep raw */ }
  switch (status) {
    case 401: return 'API key rejected — check it in Settings → Divi Tools Importer on your site.';
    case 404: return 'Plugin not found at /wp-json/divi-tools/v1 — is Divi Tools Importer active?';
    case 409: return `Conflict: ${detail}`;
    case 422: return `Layout rejected: ${detail}`;
    case 429: return 'Rate limited by the site (max 30/min). Wait a minute and retry.';
    case 500: return `Server error on the site: ${detail}`;
    default:  return `WordPress returned ${status}: ${detail}`;
  }
}

// ─── GET /test-connection — Test WordPress site connection ────────────────────
app.get('/test-connection', async (req, res) => {
  try {
    const settingsRows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    settingsRows.forEach(r => { settings[r.key] = r.value; });
    const { siteUrl, apiKey } = settings;
    if (!siteUrl || !apiKey) return res.json({ ok: false, error: 'No WordPress settings saved' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let wpRes;
    try {
      wpRes = await fetch(`${siteUrl}/wp-json/divi-tools/v1/ping`, {
        headers: { 'X-Divi-Tools-Key': apiKey },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!wpRes.ok) {
      const code = wpRes.status;
      const hint = code === 401 ? 'API key rejected' : code === 404 ? 'Plugin not active' : `HTTP ${code}`;
      return res.json({ ok: false, error: hint });
    }
    const ping = await wpRes.json();
    // Surface plugin health so the UI can show a version-drift warning: an
    // older plugin silently defaults imports to draft and breaks live QA.
    const deployed = ping.dti_version || null;
    res.json({
      ok: true,
      message: 'Connected',
      divi5: ping.divi5 === true,
      yoast: ping.yoast === true,
      rankmath: ping.rankmath === true,
      pluginVersion: deployed,
      versionOk: deployed ? versionOk(deployed, EXPECTED_DTI_VERSION) : null,
      expectedVersion: EXPECTED_DTI_VERSION,
    });
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    res.json({ ok: false, error: msg });
  }
});

// Compare a semver-ish deployed version against the expected one. Returns
// 'ok' | 'behind' | 'ahead'. Only major.minor matter for drift detection.
function versionOk(deployed, expected) {
  const a = String(deployed).split('.').map(Number);
  const b = String(expected).split('.').map(Number);
  for (let i = 0; i < 2; i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x < y) return 'behind';
    if (x > y) return 'ahead';
  }
  return 'ok';
}

// Load the saved WordPress connection (site URL + API key) from settings.
function wpConnection() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  rows.forEach(r => { s[r.key] = r.value; });
  return { siteUrl: s.siteUrl, apiKey: s.apiKey };
}

// Call a plugin endpoint on the configured site with the saved key + a timeout.
async function wpFetch(pathname, { method = 'GET', apiKey, siteUrl, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${siteUrl}/wp-json/divi-tools/v1${pathname}`, {
      method,
      headers: { 'X-Divi-Tools-Key': apiKey },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// ─── GET /wp-pages — list DTI-imported pages on the connected site ───────────
app.get('/wp-pages', async (req, res) => {
  const { siteUrl, apiKey } = wpConnection();
  if (!siteUrl || !apiKey) return res.status(400).json({ error: 'WordPress settings not configured' });
  try {
    const wpRes = await wpFetch('/pages', { siteUrl, apiKey });
    if (!wpRes.ok) return res.json({ ok: false, error: `WordPress returned ${wpRes.status}` });
    const pages = normalizePagesList(await wpRes.json());
    res.json({ ok: true, pages });
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    res.json({ ok: false, error: msg });
  }
});

// ─── DELETE /wp-pages/:slug — remove one DTI-imported page (no-litter) ───────
app.delete('/wp-pages/:slug', async (req, res) => {
  const { slug } = req.params;
  if (!isValidSlug(slug)) return res.status(400).json({ error: 'invalid slug' });
  const { siteUrl, apiKey } = wpConnection();
  if (!siteUrl || !apiKey) return res.status(400).json({ error: 'WordPress settings not configured' });
  try {
    const wpRes = await wpFetch(`/pages/${slug}`, { method: 'DELETE', siteUrl, apiKey });
    if (wpRes.status === 404) return res.json({ ok: false, error: 'No imported page with that slug' });
    if (!wpRes.ok) return res.json({ ok: false, error: `WordPress returned ${wpRes.status}` });
    const data = await wpRes.json();
    res.json({ ok: true, deleted: data.deleted || slug, id: data.id ?? null });
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    res.json({ ok: false, error: msg });
  }
});

// ─── GET /preview-html/:id — serve Stage 2 HTML preview file ────────────────
app.get('/preview-html/:id', (req, res) => {
  const gen = db.prepare('SELECT output_dir, preview_html FROM generations WHERE id=?')
    .get(req.params.id);
  if (!gen) return res.status(404).send('Not found');

  // 1. Prefer the live file on disk (always current if the dir still exists).
  const dirExists = gen.output_dir && fs.existsSync(gen.output_dir);
  if (dirExists) {
    try {
      const files = fs.readdirSync(gen.output_dir).filter(f => f.endsWith('.html'));
      if (files.length) {
        const html = files.find(f => f.includes('preview')) || files[0];
        res.setHeader('Content-Type', 'text/html');
        return res.send(fs.readFileSync(path.join(gen.output_dir, html), 'utf8'));
      }
    } catch (e) {
      return res.status(500).send(`Could not read preview from ${gen.output_dir}: ${e.message}`);
    }
  }

  // 2. Fall back to the copy stored in the DB — survives a cleaned output dir.
  if (gen.preview_html) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(gen.preview_html);
  }

  // 3. No HTML preview — this generation only has JSON output (direct form path).
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888;background:#f9f9f9;text-align:center">
    <div><div style="font-size:2rem;margin-bottom:8px">📄</div><p style="margin:0;font-size:0.9rem">No HTML mockup for this generation.<br>Import to WordPress to preview the live Divi page.</p></div>
  </body></html>`);
});

// ─── GET /screenshot?url=… — full-page PNG of a live Divi page (QA loop) ──────
// Renders the live URL through real Divi 5 (presets, global colours, CSS), then
// returns the cached PNG so the import card can show what the page actually
// looks like. Meant for the configured WordPress site (often localhost), so we
// allow loopback/.local here rather than enforcing the public-only SSRF guard.
app.get('/screenshot', async (req, res) => {
  const raw = String(req.query.url || '').trim();
  if (!raw) return res.status(400).json({ error: 'url query param required' });

  let u;
  try { u = new URL(raw); }
  catch { return res.status(400).json({ error: 'Invalid URL' }); }

  // Allow the local site; for anything else, fall back to the public-only guard
  // so this endpoint can't be turned into an internal-network scanner.
  const host = u.hostname;
  const isLocal = LOCAL_HOST_RE.test(host) || host === '127.0.0.1';
  if (!isLocal && !(await isSafeHost(host))) {
    return res.status(400).json({ error: `Blocked host: ${host}. Screenshots target your configured WordPress site.` });
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only http/https URLs can be screenshotted.' });
  }

  if (!resolveExecutable()) {
    return res.status(500).json({ error: 'No Chrome/Chromium found. Install Google Chrome to enable live screenshots.' });
  }

  const width = Math.min(Math.max(parseInt(req.query.width) || 1280, 320), 2560);
  const fresh = req.query.fresh === '1' || req.query.fresh === 'true';

  try {
    const result = await takeScreenshot({ url: u.href, width, fresh });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Screenshot-Cache', result.fromCache ? 'HIT' : 'MISS');
    res.sendFile(result.path);
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    res.status(502).json({ error: `Screenshot failed: ${msg}` });
  }
});

// ─── POST /preview/:id — real server-rendered preview via the plugin ─────────
// Calls the plugin's POST /preview, which writes a fixed draft
// (dti-live-preview) rendered through real Divi 5 and returns its preview URL.
// No page litter: the same draft is overwritten each time. Distinct from the
// app's local /preview-html mockup, which only approximates the design.
app.post('/preview/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const pageFile = db.prepare(`SELECT * FROM output_files WHERE generation_id=? AND kind='page'`).get(id);
  if (!pageFile || !fs.existsSync(pageFile.filepath)) {
    return res.status(404).json({ error: 'Page output file not found' });
  }
  let layout;
  try {
    layout = JSON.parse(fs.readFileSync(pageFile.filepath, 'utf8'));
  } catch {
    return res.status(400).json({ error: 'Page output is not valid JSON' });
  }

  const { siteUrl, apiKey } = wpConnection();
  if (!siteUrl || !apiKey) {
    return res.status(400).json({ error: 'WordPress settings not configured' });
  }

  try {
    const wpRes = await fetch(`${siteUrl}/wp-json/divi-tools/v1/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Divi-Tools-Key': apiKey },
      body: JSON.stringify({ layout }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await wpRes.json();
    if (!wpRes.ok) {
      return res.status(wpRes.status).json({ error: data.message || `WordPress returned ${wpRes.status}` });
    }
    res.json({ ok: true, previewUrl: data.preview_url, pageId: data.page_id, warnings: data.warnings || [] });
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'WordPress preview timed out' : err.message;
    res.json({ ok: false, error: msg });
  }
});

// ─── GET /briefs — list saved briefs ─────────────────────────────────────────
app.get('/briefs', (req, res) => {
  res.json(db.prepare('SELECT id, name, data FROM saved_briefs ORDER BY id DESC').all().map(r => ({
    ...r, data: JSON.parse(r.data),
  })));
});

// ─── POST /briefs — save a brief ──────────────────────────────────────────────
app.post('/briefs', (req, res) => {
  const { name, data } = req.body;
  if (!name || !data) return res.status(400).json({ error: 'name and data required' });
  const id = db.prepare('INSERT INTO saved_briefs (name, data) VALUES (?, ?)').run(name, JSON.stringify(data)).lastInsertRowid;
  res.json({ id });
});

// ─── DELETE /briefs/:id ───────────────────────────────────────────────────────
app.delete('/briefs/:id', (req, res) => {
  db.prepare('DELETE FROM saved_briefs WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ─── /brand — Brand Profile CRUD ─────────────────────────────────────────────
app.get('/brand', (_req, res) => {
  res.json(listBrandProfiles());
});

// ─── GET /brand/extract-url — fetch + parse a public page ────────────────────
// Registered BEFORE /brand/:id so the literal path wins over the :id param.
// Returns a "page bundle": title, meta, og image, favicon, candidate colours,
// font families, and stylesheet hrefs. The bundle prefills the Brand editor;
// richer AI analysis arrives in Phase 3.6/7.
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

  // Cap the response at 1 MiB to bound memory; flag truncation.
  const MAX = 1024 * 1024;
  const reader = upstream.body.getReader();
  let buf = Buffer.alloc(0);
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf = Buffer.concat([buf, value]);
    if (buf.length > MAX) { truncated = true; buf = buf.slice(0, MAX); break; }
  }
  const html = buf.toString('utf8');

  const bundle = extractPageBundle(html, url);
  res.json({ ...bundle, truncated, sourceUrl: raw });
});

// ─── GET /brand/extract-divi — pull brand from a live Divi 5 site ────────────
// Calls the plugin's export endpoints, saves the result as a brand_profile.
// Query params: site (WP home URL), key (DTI API key), name (optional profile name)
app.get('/brand/extract-divi', async (req, res) => {
  const { site, key, name } = req.query;
  if (!site || !key) return res.status(400).json({ error: 'site and key query params required' });

  let siteUrl;
  try { siteUrl = new URL(site); }
  catch { return res.status(400).json({ error: 'invalid site url' }); }
  if (!(await isSafeHost(siteUrl.hostname))) {
    return res.status(400).json({ error: 'blocked: private/loopback/link-local host' });
  }

  const base = siteUrl.origin + '/wp-json/divi-tools/v1';
  const headers = { 'X-Divi-Tools-Key': key, 'Content-Type': 'application/json' };

  let variables, presets;
  try {
    const [vRes, pRes] = await Promise.all([
      fetch(`${base}/global-variables/export`, { headers }),
      fetch(`${base}/presets/export`, { headers }),
    ]);
    if (!vRes.ok) return res.status(502).json({ error: `variables export failed: ${vRes.status}` });
    if (!pRes.ok) return res.status(502).json({ error: `presets export failed: ${pRes.status}` });
    variables = await vRes.json();
    presets   = await pRes.json();
  } catch (e) {
    return res.status(502).json({ error: `fetch failed: ${e.message}` });
  }

  const profileName = name || siteUrl.hostname;
  const data = { variables, presets };
  const id = createBrandProfile({ name: profileName, data, source_type: 'divi-export', source_ref: siteUrl.origin });

  res.json({ id, name: profileName, colors: variables.global_colors?.length ?? 0, variables: variables.global_variables?.length ?? 0 });
});

// ─── POST /brand/:id/deploy — push brand profile to a target Divi 5 site ─────
// Body: { site: "https://...", key: "..." }
app.post('/brand/:id/deploy', async (req, res) => {
  const profile = getBrandProfile(parseInt(req.params.id));
  if (!profile) return res.status(404).json({ error: 'brand profile not found' });

  const { site, key } = req.body;
  if (!site || !key) return res.status(400).json({ error: 'site and key required' });

  let siteUrl;
  try { siteUrl = new URL(site); }
  catch { return res.status(400).json({ error: 'invalid site url' }); }
  if (!(await isSafeHost(siteUrl.hostname))) {
    return res.status(400).json({ error: 'blocked: private/loopback/link-local host' });
  }

  const base = siteUrl.origin + '/wp-json/divi-tools/v1';
  const headers = { 'X-Divi-Tools-Key': key, 'Content-Type': 'application/json' };
  const { variables, presets } = profile.data || {}; // getBrandProfile already parsed it

  if (!variables && !presets) {
    return res.status(422).json({ error: 'brand profile has no variables or presets data' });
  }

  const results = {};
  try {
    if (variables) {
      const r = await fetch(`${base}/global-variables`, { method: 'POST', headers, body: JSON.stringify(variables) });
      results.variables = await r.json();
    }
    // Skip when there are no presets — an empty list would 400 on the import endpoint.
    const presetCount = presets?.presets
      ? (Array.isArray(presets.presets) ? presets.presets.length : Object.keys(presets.presets).length)
      : 0;
    if (presetCount > 0) {
      const r = await fetch(`${base}/presets/import`, { method: 'POST', headers, body: JSON.stringify({ presets: presets.presets }) });
      results.presets = await r.json();
    } else {
      results.presets = { skipped: 'no presets in profile' };
    }
  } catch (e) {
    return res.status(502).json({ error: `deploy failed: ${e.message}` });
  }

  res.json({ ok: true, site: siteUrl.origin, ...results });
});

// A whole-DB transfer can be large; cap each leg so a hung WP endpoint can't
// leave the migrate request (and the UI) waiting forever.
const MIGRATE_TIMEOUT_MS = 120000;

// ─── POST /migrate/pull — copy a remote site's DB into a local dev site ───────
// Body: { remote, remoteKey, local, localKey }
// remote = public source (SSRF-checked); local = your dev target (loopback OK).
app.post('/migrate/pull', async (req, res) => {
  const { remote, remoteKey, local, localKey } = req.body;
  if (!remote || !remoteKey || !local || !localKey) {
    return res.status(400).json({ error: 'remote, remoteKey, local, localKey all required' });
  }

  let remoteUrl, localUrl;
  try { remoteUrl = new URL(remote); localUrl = new URL(local); }
  catch { return res.status(400).json({ error: 'invalid remote or local url' }); }

  // Guard the public source only; the local target is meant to be a dev host.
  if (!(await isSafeHost(remoteUrl.hostname))) {
    return res.status(400).json({ error: 'blocked: remote is a private/loopback host' });
  }

  const remoteApi = remoteUrl.origin + '/wp-json/divi-tools/v1';
  const localApi  = localUrl.origin  + '/wp-json/divi-tools/v1';

  try {
    // 1. Pull the dump from the remote.
    const exp = await fetch(`${remoteApi}/db/export`, {
      headers: { 'X-Divi-Tools-Key': remoteKey },
      signal: AbortSignal.timeout(MIGRATE_TIMEOUT_MS),
    });
    if (!exp.ok) return res.status(502).json({ error: `remote export failed: ${exp.status}` });
    const dump = await exp.json();

    // 2. Push it into the local site, rewriting remote URL → local URL.
    const imp = await fetch(`${localApi}/db/import`, {
      method: 'POST',
      headers: { 'X-Divi-Tools-Key': localKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: dump.sql, from_url: dump.home_url, to_url: localUrl.origin }),
      signal: AbortSignal.timeout(MIGRATE_TIMEOUT_MS),
    });
    const result = await imp.json();
    if (!imp.ok) return res.status(502).json({ error: `local import failed: ${imp.status}`, detail: result });

    res.json({ ok: true, from: remoteUrl.origin, to: localUrl.origin, ...result });
  } catch (e) {
    return res.status(502).json({ error: `pull failed: ${e.message}` });
  }
});

// ─── POST /migrate/push — copy a local dev site's DB up to a remote site ──────
// Body: { local, localKey, remote, remoteKey, confirmHost }
// Overwrites the remote's DB, so confirmHost must match the remote hostname.
app.post('/migrate/push', async (req, res) => {
  const { local, localKey, remote, remoteKey, confirmHost } = req.body;
  if (!local || !localKey || !remote || !remoteKey) {
    return res.status(400).json({ error: 'local, localKey, remote, remoteKey all required' });
  }

  let remoteUrl, localUrl;
  try { remoteUrl = new URL(remote); localUrl = new URL(local); }
  catch { return res.status(400).json({ error: 'invalid remote or local url' }); }

  // Typed-confirmation guard — this overwrites a live site.
  if (confirmHost !== remoteUrl.hostname) {
    return res.status(412).json({ error: `confirmHost must equal "${remoteUrl.hostname}" to push` });
  }
  if (!(await isSafeHost(remoteUrl.hostname))) {
    return res.status(400).json({ error: 'blocked: remote is a private/loopback host' });
  }

  const remoteApi = remoteUrl.origin + '/wp-json/divi-tools/v1';
  const localApi  = localUrl.origin  + '/wp-json/divi-tools/v1';

  try {
    // 1. Export the local dev DB.
    const exp = await fetch(`${localApi}/db/export`, {
      headers: { 'X-Divi-Tools-Key': localKey },
      signal: AbortSignal.timeout(MIGRATE_TIMEOUT_MS),
    });
    if (!exp.ok) return res.status(502).json({ error: `local export failed: ${exp.status}` });
    const dump = await exp.json();

    // 2. Import into the remote, rewriting local URL → remote URL.
    const imp = await fetch(`${remoteApi}/db/import`, {
      method: 'POST',
      headers: { 'X-Divi-Tools-Key': remoteKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: dump.sql, from_url: dump.home_url, to_url: remoteUrl.origin }),
      signal: AbortSignal.timeout(MIGRATE_TIMEOUT_MS),
    });
    const result = await imp.json();
    if (!imp.ok) return res.status(502).json({ error: `remote import failed: ${imp.status}`, detail: result });

    res.json({ ok: true, from: localUrl.origin, to: remoteUrl.origin, ...result });
  } catch (e) {
    return res.status(502).json({ error: `push failed: ${e.message}` });
  }
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

// ─── /designs — Design Projects ──────────────────────────────────────────────
app.get('/designs', (_req, res) => {
  res.json(listDesignProjects());
});

app.post('/designs', (req, res) => {
  const { name, brand_id, export_id, tokens_path, variables_path, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = createDesignProject({ name, brand_id, export_id, tokens_path, variables_path, notes });
  res.json({ id });
});

app.get('/designs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const proj = getDesignProject(id);
  if (!proj) return res.status(404).json({ error: 'Not found' });
  const pages = db.prepare(`
    SELECT dp.page_type, dp.sort_order, g.id AS generation_id, g.brand, g.keyword, g.status
    FROM design_pages dp
    JOIN generations g ON g.id = dp.generation_id
    WHERE dp.design_id=? ORDER BY dp.sort_order, g.id
  `).all(id);
  res.json({ ...proj, pages });
});

app.delete('/designs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const keepPages = req.query.keepPages !== 'false'; // default: keep generations
  deleteDesignProject(id, keepPages);
  res.json({ ok: true });
});

// ─── bundle parser (pure, exported for unit testing) ─────────────────────────
function extractPageBundle(html, url) {
  const pickAttr = (re) => (html.match(re) || [])[1] || '';
  const title    = pickAttr(/<title[^>]*>([^<]*)<\/title>/i).trim();
  const metaDesc = pickAttr(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
  const ogImage  = pickAttr(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const favicon  = pickAttr(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i);

  const colors = [...new Set((html.match(/#[0-9a-fA-F]{6}\b/g) || []).map(s => s.toLowerCase()))].slice(0, 20);
  const fonts = [...new Set(
    [...html.matchAll(/font-family\s*:\s*([^;"']+)/gi)]
      .map(m => m[1].split(',')[0].trim().replace(/["']/g, ''))
      .filter(Boolean)
  )].slice(0, 10);

  const stylesheets = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']*)["']/gi)]
    .map(m => m[1]).slice(0, 5)
    .map(href => { try { return new URL(href, url).href; } catch { return href; } });

  return { title, metaDesc, ogImage, favicon, colors, fonts, stylesheets };
}

// ─── GET /pick-folder — Native macOS folder picker ────────────────────────────
app.get('/pick-folder', (req, res) => {
  try {
    const result = execSync(
      `osascript -e 'POSIX path of (choose folder with prompt "Choose output folder:")'`,
      { encoding: 'utf8', timeout: parseInt(process.env.OSASCRIPT_TIMEOUT) || 60000 }
    ).trim();
    res.json({ path: result || null });
  } catch (_) {
    res.json({ path: null });
  }
});

// ─── DELETE /generations/:id ──────────────────────────────────────────────────
app.delete('/generations/:id', (req, res) => {
  const id = parseInt(req.params.id);
  db.prepare('DELETE FROM output_files WHERE generation_id=?').run(id);
  db.prepare('DELETE FROM generations WHERE id=?').run(id);
  res.json({ ok: true });
});

// ─── POST /rerun/:id — Load a past generation's brief ────────────────────────
app.post('/rerun/:id', (req, res) => {
  const gen = db.prepare('SELECT * FROM generations WHERE id=?').get(req.params.id);
  if (!gen) return res.status(404).json({ error: 'Not found' });
  res.json({
    brand:              gen.brand,
    what_it_does:       gen.what_it_does,
    keyword:            gen.keyword,
    secondary_keywords: gen.secondary_keywords,
    sections:           JSON.parse(gen.sections || '[]'),
    aesthetic:          gen.aesthetic,
    cta_label:          gen.cta_label,
    cta_url:            gen.cta_url,
    output_dir:         gen.output_dir,
    export_path:        gen.export_path,
    et_template:        gen.et_template || null,
  });
});

// Only bind the port when run as the main module, so test code can require()
// this file (to grab extractPageBundle) without starting a second server.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Divi 5 Generator running at http://localhost:${PORT}`);
  });
  // Friendly message instead of an unhandled-error stack trace when the port is
  // already taken (usually a leftover instance from a previous run).
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n⚠ Port ${PORT} is already in use — the app is probably already running.`);
      console.error(`  Open http://localhost:${PORT}, or free the port and retry:`);
      console.error(`    lsof -ti tcp:${PORT} | xargs kill -9\n`);
      process.exit(1);
    }
    throw err;
  });
}

module.exports = { extractPageBundle };
