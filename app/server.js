'use strict';

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn, execSync } = require('child_process');
const { db, EXPORTS_DIR } = require('./db');
const {
  createBrandProfile, getBrandProfile, listBrandProfiles,
  updateBrandProfile, deleteBrandProfile,
  createDesignProject, getDesignProject, listDesignProjects,
  linkGenerationToDesign, deleteDesignProject,
  promoteIfEligible,
} = require('./db');
const { isSafeHost } = require('./lib/ssrf-guard');
const { extractIntent, stripIntent } = require('./lib/intent-marker');

const PLUGIN_DIR  = path.resolve(__dirname, '..');
const STYLE_CHECK = path.join(PLUGIN_DIR, 'skills', 'divi5-style-check', 'scripts', 'style-check.js');
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
  if (gen?.log) res.write(`event: log\ndata: ${JSON.stringify({ chunk: gen.log })}\n\n`);
  if (gen?.status !== 'running') {
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
    etTemplate,
  } = req.body;

  const sectionsArr = Array.isArray(sections) ? sections : (sections ? [sections] : []);
  const outputPath  = outputDir || path.join(os.homedir(), 'Desktop', 'divi-output');
  fs.mkdirSync(outputPath, { recursive: true });

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
    `/divi5-tools:divi5-page-generator`,
    `Build a landing page for ${brand}. ${whatItDoes || ''}`,
    `Primary keyword: ${keyword}.${secondary}`,
    etTemplateLine || `Sections: ${sectionList}.`,
    aesthetic ? `Aesthetic: ${aesthetic}.` : '',
    `Primary CTA: "${ctaLabel || 'Get Started'}" linking to ${ctaUrl || '#'}.`,
    motionLine,
    revisionNotes ? `REVISION NOTES (apply these changes from the previous version): ${revisionNotes}` : '',
  ].filter(Boolean).join(' ');

  // Insert generation record
  const genId = db.prepare(`
    INSERT INTO generations (brand, keyword, sections, aesthetic, cta_label, cta_url, output_dir, export_path, what_it_does, secondary_keywords, et_template)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(brand, keyword, JSON.stringify(sectionsArr), aesthetic, ctaLabel, ctaUrl, outputPath, exportPath, whatItDoes || '', secondaryKeywords || '', etTemplate || null).lastInsertRowid;

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

  const fullPrompt = paletteHint ? `${prompt} ${paletteHint}` : prompt;

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

  const appendLog = db.prepare(`UPDATE generations SET log = log || ? WHERE id = ?`);

  proc.stdout.on('data', chunk => {
    const text = chunk.toString();
    appendLog.run(text, genId);
    sendSSE(genId, 'log', { chunk: text });
  });

  proc.stderr.on('data', chunk => {
    const text = chunk.toString();
    appendLog.run(text, genId);
    sendSSE(genId, 'log', { chunk: text });
  });

  proc.on('close', async (code) => {
    // Detect output files — only include .json files that are actually valid JSON
    const allJsonFiles = fs.readdirSync(outputPath).filter(f => f.endsWith('.json'));
    const files = allJsonFiles.filter(f => {
      try { JSON.parse(fs.readFileSync(path.join(outputPath, f), 'utf8')); return true; }
      catch (_) {
        const warn = `\n⚠ Skipped ${f} — not valid JSON (likely an HTML file with wrong extension)\n`;
        appendLog.run(warn, genId);
        sendSSE(genId, 'log', { chunk: warn });
        return false;
      }
    });
    const insertFile = db.prepare(`INSERT INTO output_files (generation_id, filename, filepath, kind) VALUES (?, ?, ?, ?)`);
    for (const f of files) {
      const kind = f.includes('seo-meta') ? 'seo-meta' :
                   f.includes('schema')   ? 'schema' :
                   f.includes('landing-page') || f.includes('-page') ? 'page' : 'other';
      const exists = db.prepare('SELECT id FROM output_files WHERE generation_id=? AND filename=?').get(genId, f);
      if (!exists) insertFile.run(genId, f, path.join(outputPath, f), kind);
    }

    // Run style check if export was provided
    let styleCheck = 'skipped';
    if (exportPath && files.some(f => f.includes('-page') || f.includes('landing'))) {
      const pageFile = files.find(f => f.includes('-page') || f.includes('landing'));
      if (pageFile) {
        try {
          const result = runStyleCheck(exportPath, path.join(outputPath, pageFile));
          styleCheck = result.consistent ? 'consistent' : result.crashed ? 'error' : 'inconsistent';
          const scLog = `\n--- STYLE CHECK ---\n${result.report}\n`;
          appendLog.run(scLog, genId);
          sendSSE(genId, 'log', { chunk: scLog });
        } catch (e) {
          appendLog.run(`\nStyle check error: ${e.message}\n`, genId);
        }
      }
    }

    const status = code === 0 ? 'complete' : 'failed';
    db.prepare(`UPDATE generations SET status=?, style_check=? WHERE id=?`).run(status, styleCheck, genId);

    // Auto-promote to a Design Project when a sibling generation shares the
    // same brand + export_path (i.e. this is the 2nd page on one design system).
    const newDesignId = promoteIfEligible(genId);
    if (newDesignId) {
      const msg = `\n--- DESIGN PROJECT ---\nPromoted to design project #${newDesignId}. See Designs tab.\n`;
      appendLog.run(msg, genId);
      sendSSE(genId, 'design_promoted', { designId: newDesignId });
    }

    // Detect HTML preview file
    const allFiles = fs.readdirSync(outputPath);
    const hasPreview = allFiles.some(f => f.endsWith('.html'));
    db.prepare(`UPDATE generations SET has_preview=? WHERE id=?`).run(hasPreview ? 1 : 0, genId);

    // Send final file list to UI
    const outputFiles = db.prepare('SELECT * FROM output_files WHERE generation_id=?').all(genId);
    sendSSE(genId, 'done', { status, styleCheck, files: outputFiles, hasPreview });

    // Close SSE connections
    (sseClients.get(genId) || []).forEach(r => r.end());
    sseClients.delete(genId);
  });
});

// ─── GET /generations — history list ────────────────────────────────────────
app.get('/generations', (req, res) => {
  const rows = db.prepare(`SELECT * FROM generations ORDER BY id DESC LIMIT 50`).all();
  res.json(rows.map(r => ({ ...r, sections: JSON.parse(r.sections) })));
});

// ─── GET /generations/:id — single with files ───────────────────────────────
app.get('/generations/:id', (req, res) => {
  const gen   = db.prepare('SELECT * FROM generations WHERE id=?').get(req.params.id);
  if (!gen) return res.status(404).json({ error: 'Not found' });
  const files = db.prepare('SELECT * FROM output_files WHERE generation_id=?').all(req.params.id);
  res.json({ ...gen, sections: JSON.parse(gen.sections), files });
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

  const proc = spawn(claudeBin, ['-p', '--dangerously-skip-permissions', '--plugin-dir', PLUGIN_DIR, prompt], {
    cwd: PLUGIN_DIR, stdio: ['pipe', 'pipe', 'pipe'],
  });
  proc.stdin.end();

  // Buffer stdout so we can detect a complete GEN_INTENT marker (it may arrive
  // split across chunks) and emit a gen_intent event, then stream the stripped
  // text. We flush the buffer up to the last newline each chunk so prose still
  // streams live; the tail (partial marker) is held back until more arrives.
  let buf = '';
  proc.stdout.on('data', chunk => {
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
  proc.stderr.on('data', chunk => res.write(`data: ${JSON.stringify({ chunk: chunk.toString() })}\n\n`));
  proc.on('close', () => {
    // Flush any remaining buffered text (minus a trailing marker).
    const tail = stripIntent(buf);
    if (tail) res.write(`data: ${JSON.stringify({ chunk: tail })}\n\n`);
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
      const palette = (b.data && b.data.colors || []).slice(0, 4).map(c => c.hex).join(', ');
      lines.push(`ACTIVE BRAND: ${b.name}${palette ? ' — palette: ' + palette : ''}`);
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

function runStyleCheck(originalPath, generatedPath) {
  try {
    const out = execSync(`node "${STYLE_CHECK}" "${originalPath}" "${generatedPath}"`, { encoding: 'utf8' });
    return { consistent: true, report: out };
  } catch (e) {
    const report = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message;
    // Distinguish a style mismatch (script exited non-zero with output) from a crash (no stdout)
    const crashed = !e.stdout && !e.stderr;
    return { consistent: false, crashed, report };
  }
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
        body: JSON.stringify({ layout, seo, schema, draft: true }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!wpRes.ok) {
      const errText = await wpRes.text();
      db.prepare(`UPDATE generations SET import_status='failed' WHERE id=?`).run(id);
      return res.json({ ok: false, error: `WordPress returned ${wpRes.status}: ${errText}` });
    }

    const data = await wpRes.json();
    const previewUrl = data.previewUrl || data.preview_url || null;
    db.prepare(`UPDATE generations SET import_status='imported', preview_url=? WHERE id=?`).run(previewUrl, id);
    res.json({ ok: true, previewUrl });

  } catch (err) {
    db.prepare(`UPDATE generations SET import_status='failed' WHERE id=?`).run(id);
    res.json({ ok: false, error: err.message });
  }
});

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

    if (!wpRes.ok) return res.json({ ok: false, error: `HTTP ${wpRes.status}` });
    res.json({ ok: true, message: 'Connected' });
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Connection timed out' : err.message;
    res.json({ ok: false, error: msg });
  }
});

// ─── GET /preview-html/:id — serve Stage 2 HTML preview file ────────────────
app.get('/preview-html/:id', (req, res) => {
  const gen = db.prepare('SELECT output_dir FROM generations WHERE id=?').get(req.params.id);
  if (!gen) return res.status(404).send('Not found');
  try {
    const files = fs.readdirSync(gen.output_dir).filter(f => f.endsWith('.html'));
    if (!files.length) return res.status(404).send('No preview HTML yet');
    // Prefer file with 'preview' in name
    const html = files.find(f => f.includes('preview')) || files[0];
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(path.join(gen.output_dir, html), 'utf8'));
  } catch (_) {
    res.status(404).send('Preview not available');
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
  const { variables, presets } = profile.data ? JSON.parse(profile.data) : {};

  if (!variables && !presets) {
    return res.status(422).json({ error: 'brand profile has no variables or presets data' });
  }

  const results = {};
  try {
    if (variables) {
      const r = await fetch(`${base}/global-variables`, { method: 'POST', headers, body: JSON.stringify(variables) });
      results.variables = await r.json();
    }
    if (presets?.presets) {
      const r = await fetch(`${base}/presets/import`, { method: 'POST', headers, body: JSON.stringify({ presets: presets.presets }) });
      results.presets = await r.json();
    }
  } catch (e) {
    return res.status(502).json({ error: `deploy failed: ${e.message}` });
  }

  res.json({ ok: true, site: siteUrl.origin, ...results });
});

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
    });
    if (!exp.ok) return res.status(502).json({ error: `remote export failed: ${exp.status}` });
    const dump = await exp.json();

    // 2. Push it into the local site, rewriting remote URL → local URL.
    const imp = await fetch(`${localApi}/db/import`, {
      method: 'POST',
      headers: { 'X-Divi-Tools-Key': localKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: dump.sql, from_url: dump.home_url, to_url: localUrl.origin }),
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
    });
    if (!exp.ok) return res.status(502).json({ error: `local export failed: ${exp.status}` });
    const dump = await exp.json();

    // 2. Import into the remote, rewriting local URL → remote URL.
    const imp = await fetch(`${remoteApi}/db/import`, {
      method: 'POST',
      headers: { 'X-Divi-Tools-Key': remoteKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: dump.sql, from_url: dump.home_url, to_url: remoteUrl.origin }),
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
  app.listen(PORT, () => {
    console.log(`Divi 5 Generator running at http://localhost:${PORT}`);
  });
}

module.exports = { extractPageBundle };
