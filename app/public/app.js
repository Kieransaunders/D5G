'use strict';

// Currently-open brand profile. Declared up top: load-time tab routing
// (renderBrandCanvas) can run before the editor section, which would otherwise
// hit the temporal dead zone.
let brandEditing = null;

// ─── Prerequisites check ─────────────────────────────────────────────────────
async function checkPrereqs() {
  const el = document.getElementById('prereqs');
  el.innerHTML = '<div class="prereq"><span>Checking…</span></div>';
  try {
    const r = await fetch('/prereqs');
    const { claudeFound, claudeVersion } = await r.json();
    el.innerHTML = claudeFound
      ? `<div class="prereq"><span class="ok">✓</span> Claude Code ${claudeVersion}</div>`
      : `<div class="prereq"><span class="fail">✗</span> Claude Code not found — <a href="https://claude.ai/download" target="_blank" style="color:var(--accent)">install it</a></div>`;
  } catch {
    el.innerHTML = '<div class="prereq"><span class="fail">✗</span> Server not responding</div>';
  }
}

// ─── File drop zone ──────────────────────────────────────────────────────────
const dropZone    = document.getElementById('dropZone');
const exportInput = document.getElementById('exportInput');
const exportName  = document.getElementById('exportName');
const exportLabelField = document.getElementById('exportLabelField');

exportInput.addEventListener('change', () => {
  const f = exportInput.files[0];
  if (f) {
    exportName.textContent = f.name;
    exportLabelField.style.display = '';
  }
});
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('over');
  const f = e.dataTransfer.files[0];
  if (f && f.name.endsWith('.json')) {
    const dt = new DataTransfer();
    dt.items.add(f);
    exportInput.files = dt.files;
    exportName.textContent = f.name;
    exportLabelField.style.display = '';
  }
});

// ─── ET Pages dropdown ────────────────────────────────────────────────────────
async function loadEtPages() {
  try {
    const pages = await fetch('/et-pages').then(r => r.json());
    const sel = document.getElementById('etTemplate');
    pages.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.slug;
      opt.textContent = p.title.replace(/ - Page$/, '');
      opt.dataset.sections = p.sections.join(', ');
      sel.appendChild(opt);
    });
  } catch {}
}

document.getElementById('etTemplate').addEventListener('change', (e) => {
  const opt = e.target.selectedOptions[0];
  const hint    = document.getElementById('etTemplateSections');
  const note    = document.getElementById('sectionsNote');
  const hasTemplate = !!e.target.value;
  if (hasTemplate && opt.dataset.sections) {
    hint.textContent = 'Sections: ' + opt.dataset.sections;
    hint.style.display = '';
    note.style.display = '';
  } else {
    hint.style.display = 'none';
    note.style.display = 'none';
  }
});

// ─── Step tracker ────────────────────────────────────────────────────────────
const STEP_PATTERNS = [
  { id: 'step-clone',      triggers: ['Stage 0', 'ET template', 'ET pack template', 'Cloned', 'clone'] },
  { id: 'step-brief',      triggers: ['Stage 1', 'Brief', 'Reading this as', 'Design Read', 'dials set'] },
  { id: 'step-preview',    triggers: ['Stage 2', 'HTML Preview', 'preview-', 'taste pre-flight', 'Approved'] },
  { id: 'step-generate',   triggers: ['Stage 3', 'Generate', 'Validator', 'validate.js', 'FAILs', '0 errors'] },
  { id: 'step-stylecheck', triggers: ['STYLE CHECK', 'style-check', 'CONSISTENT', 'INCONSISTENT'] },
];

let activeStep = null;

function advanceStep(text) {
  for (const s of STEP_PATTERNS) {
    if (s.triggers.some(t => text.includes(t))) {
      if (activeStep !== s.id) {
        if (activeStep) {
          const prev = document.getElementById(activeStep);
          if (prev) prev.className = 'step done';
        }
        activeStep = s.id;
        const el = document.getElementById(s.id);
        if (el) el.className = 'step active';
      }
    }
  }
}

function completeAllSteps(status) {
  STEP_PATTERNS.forEach(s => {
    const el = document.getElementById(s.id);
    if (!el) return;
    if (el.classList.contains('active') || el.classList.contains('done')) {
      el.className = status === 'failed' ? 'step fail' : 'step done';
    }
  });
}

// ─── Log rendering ───────────────────────────────────────────────────────────
const logBox = document.getElementById('logBox');

function appendLog(text) {
  // Colorise key patterns
  const html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(✓[^\n]*|CONSISTENT[^\n]*|0 errors[^\n]*)/g, '<span class="log-pass">$1</span>')
    .replace(/(✖[^\n]*|INCONSISTENT[^\n]*|FAIL[^\n]*)/g, '<span class="log-fail">$1</span>')
    .replace(/(⚠[^\n]*|WARN[^\n]*)/g,  '<span class="log-warn">$1</span>')
    .replace(/(^#{1,3} .+|^={3,}|^─{3,}|STYLE CONSISTENCY REPORT|VERDICT:.*)/gm,
             '<span class="log-head">$1</span>');
  logBox.insertAdjacentHTML('beforeend', html);
  logBox.scrollTop = logBox.scrollHeight;
  advanceStep(text);
}

// ─── Output files ─────────────────────────────────────────────────────────────
function renderFiles(genId, files) {
  const list = document.getElementById('fileList');
  list.innerHTML = '';
  files.forEach(f => {
    const icon = f.kind === 'page' ? '📄' : f.kind === 'seo-meta' ? '🔍' : f.kind === 'schema' ? '🧩' : '📁';
    const row = document.createElement('div');
    row.className = 'file-row';
    row.innerHTML = `
      <div class="file-info">
        <span class="file-icon">${icon}</span>
        <div>
          <div class="file-name-text">${f.filename}</div>
          <div class="file-kind">${f.kind}</div>
        </div>
      </div>
      <a class="btn-dl" href="/download/${genId}/${encodeURIComponent(f.filename)}" download="${f.filename}">Download</a>
    `;
    list.appendChild(row);
  });
}

function renderVerdicts(styleCheck) {
  const el = document.getElementById('verdicts');
  el.innerHTML = '';
  if (!styleCheck || styleCheck === 'skipped') return;
  const badge = document.createElement('span');
  if (styleCheck === 'consistent') {
    badge.className = 'badge pass';
    badge.textContent = '✓ Style consistent';
  } else if (styleCheck === 'error') {
    badge.className = 'badge warn';
    badge.textContent = '⚠ Style check error';
  } else {
    badge.className = 'badge fail';
    badge.textContent = '✖ Style inconsistent';
  }
  el.appendChild(badge);
}

// ─── Form submit ─────────────────────────────────────────────────────────────
document.getElementById('genForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Reset UI
  logBox.innerHTML = '';
  document.getElementById('fileList').innerHTML = '';
  document.getElementById('verdicts').innerHTML = '';
  document.getElementById('progressPanel').style.display = '';
  document.getElementById('logPanel').style.display = '';
  document.getElementById('outputPanel').style.display = 'none';
  STEP_PATTERNS.forEach(s => {
    const el = document.getElementById(s.id);
    if (el) el.className = 'step';
  });
  activeStep = null;

  const btn = document.getElementById('genBtn');
  btn.disabled = true;
  btn.textContent = 'Generating…';

  const form   = e.target;
  const data   = new FormData(form);

  // Clear revision notes now that they're captured in FormData
  document.getElementById('revisionNotes').value = '';
  document.getElementById('revisionNotesField').style.display = 'none';

  try {
    const res  = await fetch('/generate', { method: 'POST', body: data });
    const { id } = await res.json();

    // Open SSE stream
    const es = new EventSource(`/stream/${id}`);

    es.addEventListener('log', ev => {
      const { chunk } = JSON.parse(ev.data);
      appendLog(chunk);
    });

    es.addEventListener('done', ev => {
      const { status, styleCheck, files, hasPreview } = JSON.parse(ev.data);
      es.close();
      completeAllSteps(status);
      btn.disabled = false;
      btn.textContent = 'Generate Page';

      if (files && files.length) {
        currentGenId = id;
        renderFiles(id, files);
        renderVerdicts(styleCheck);
        renderStyleCheckDetails(logBox.textContent || '');
        document.getElementById('outputPanel').style.display = '';
        document.getElementById('importRow').style.display = '';
        document.getElementById('importStatus').textContent = '';
        document.getElementById('previewLink').style.display = 'none';
      }

      if (hasPreview) showHtmlPreview(id);

      // If this generation was kicked off from a chat intent card, surface
      // inline preview/file/import cards in the chat stream.
      if (pendingChatGeneration && pendingChatGeneration.card) {
        appendGenerationCards(id, files, hasPreview);
        const startBtn = pendingChatGeneration.card.querySelector('[data-intent-start]');
        if (startBtn) { startBtn.disabled = false; startBtn.textContent = 'Start →'; }
        pendingChatGeneration = null;
      }

      loadHistory();
    });

    es.onerror = () => {
      es.close();
      btn.disabled = false;
      btn.textContent = 'Generate Page';
    };

  } catch (err) {
    appendLog(`\nError: ${err.message}\n`);
    btn.disabled = false;
    btn.textContent = 'Generate Page';
  }
});

// ─── History ─────────────────────────────────────────────────────────────────
async function loadHistory() {
  try {
    const rows = await fetch('/generations').then(r => r.json());
    const list = document.getElementById('historyList');
    if (!rows.length) {
      list.innerHTML = '<div class="empty">No generations yet — fill in the form and click Generate.</div>';
      return;
    }
    list.innerHTML = rows.map(r => {
      const statusIcon = r.status === 'complete' ? '✓' : r.status === 'failed' ? '✖' : '…';
      const statusColor = r.status === 'complete' ? 'var(--success)' : r.status === 'failed' ? 'var(--danger)' : 'var(--warn)';
      const hasPreview = r.status === 'complete' && !!r.has_preview;
      const viewable = !!r.viewable;
      const deadHint = viewable ? '' : `<div class="h-meta" style="color:var(--warn)">⚠ preview purged — re-run to restore</div>`;
      return `
        <div class="history-item${viewable ? '' : ' history-item-dead'}" onclick="${viewable ? `loadGeneration(${r.id})` : ''}">
          <div>
            <div class="h-brand">${r.brand}</div>
            <div class="h-meta">${r.keyword} · ${r.sections.join(', ')}</div>
            <div class="h-meta">${r.created_at}</div>
            ${deadHint}
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${hasPreview && viewable ? `<button type="button" class="btn-view" onclick="viewMockup(${r.id}, event)" title="View mockup">View</button>` : ''}
            <button type="button" class="btn-rerun" onclick="openRevisionDrawer(${r.id}, event)">Re-run</button>
            <button type="button" class="btn-delete" onclick="deleteGeneration(${r.id}, event)" title="Delete">✕</button>
            <span style="color:${statusColor};font-weight:600">${statusIcon}</span>
          </div>
        </div>
        <div class="revision-drawer" id="drawer-${r.id}" style="display:none">
          <div class="revision-label">Revision notes <span class="revision-hint">(optional — describe what to change)</span></div>
          <textarea class="revision-textarea" id="revision-${r.id}" placeholder="e.g. Make the hero headline punchier, add a pricing section, use darker colours"></textarea>
          <div style="display:flex;gap:8px;margin-top:8px">
            <button type="button" class="btn-generate" style="flex:1;padding:8px" onclick="rerunGeneration(${r.id}, event)">Generate revised page</button>
            <button type="button" class="btn-secondary" onclick="closeRevisionDrawer(${r.id}, event)">Cancel</button>
          </div>
        </div>
      `;
    }).join('');
  } catch {}
}

async function loadGeneration(id) {
  const gen = await fetch(`/generations/${id}`).then(r => r.json());
  if (gen.has_preview) showInCanvas(id, { title: `${gen.brand} · ${gen.keyword}` });
  logBox.innerHTML = '';
  appendLog(gen.log || '(no log)');
  document.getElementById('logPanel').style.display = '';
  document.getElementById('progressPanel').style.display = 'none';
  if (gen.files && gen.files.length) {
    currentGenId = id;
    renderFiles(id, gen.files);
    renderVerdicts(gen.style_check);
    renderStyleCheckDetails(gen.log || '');
    document.getElementById('outputPanel').style.display = '';
    document.getElementById('importRow').style.display = '';
    document.getElementById('importStatus').textContent = gen.import_status === 'imported' ? 'Already imported' : '';
    const link = document.getElementById('previewLink');
    if (gen.preview_url) {
      link.href = gen.preview_url;
      link.style.display = 'inline-block';
    } else {
      link.style.display = 'none';
    }
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(name, { updateHash = true } = {}) {
  const btn = document.querySelector(`.tab[data-tab="${name}"]`);
  if (!btn) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('[id^="tab-"]').forEach(panel => {
    panel.hidden = panel.id !== `tab-${name}`;
  });
  updateMainForTab(name);
  if (name === 'brand') loadBrandGrid();
  if (name === 'designs') loadDesignsList();
  if (name === 'generate') loadGenBrandOptions();
  if (updateHash) history.replaceState(null, '', `#${name}`);
}

// The right pane is contextual: design canvas for page tabs, a live brand
// preview for the Brand tab, and a neutral idle panel for Migrate/Settings —
// so you never see an unrelated page while editing a brand or settings.
function updateMainForTab(tab) {
  const isPageTab = tab === 'chat' || tab === 'generate' || tab === 'designs';
  const isBrand   = tab === 'brand';
  document.getElementById('canvasPanel').hidden  = !isPageTab;
  document.getElementById('historyPanel').hidden = !isPageTab;
  document.getElementById('brandCanvas').hidden  = !isBrand;
  const idle = document.getElementById('idleCanvas');
  idle.hidden = isPageTab || isBrand;
  if (!idle.hidden) {
    const copy = {
      migrate:  ['Database migration', 'Pull a live site into local, or push local up — the controls are on the left.'],
      settings: ['Settings', 'Configure your WordPress site URL and API key on the left.'],
    }[tab] || ['Nothing to preview here', "This tab's controls are in the panel on the left."];
    document.getElementById('idleCanvasTitle').textContent = copy[0];
    document.getElementById('idleCanvasSub').textContent = copy[1];
  }
  if (isBrand) renderBrandCanvas();
}

// Inject a Google-Fonts stylesheet so the preview renders in the real family.
// Non-Google families just 404 silently and fall back to the default stack.
function loadPreviewFont(family) {
  if (!family) return;
  const id = 'previewfont-' + family.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// Render the open brand profile's palette + fonts into the right pane.
function renderBrandCanvas() {
  const stage = document.getElementById('brandCanvasStage');
  const title = document.getElementById('brandCanvasTitle');
  if (!stage) return;
  const d = brandEditing?.data;
  const colors  = d?.colors || [];
  const heading = d?.fonts?.heading?.family;
  const body    = d?.fonts?.body?.family;
  title.textContent = brandEditing?.name ? `Brand preview · ${brandEditing.name}` : 'Brand preview';

  if (!brandEditing || (colors.length === 0 && !heading && !body)) {
    stage.innerHTML = `<div class="canvas-empty">
      <div class="canvas-empty-title">No brand open</div>
      <div class="canvas-empty-sub">Click a profile's <strong>Edit</strong>, or extract one with <strong>From Divi export</strong>. Its palette and fonts preview here.</div>
    </div>`;
    return;
  }

  loadPreviewFont(heading);
  loadPreviewFont(body);

  // Pick the most saturated, mid-dark colour as the kit's hero accent.
  const lum = hex => { const m = pickerHex(hex).match(/\w\w/g).map(h => parseInt(h, 16)); return 0.299*m[0] + 0.587*m[1] + 0.114*m[2]; };
  const sat = hex => { const m = pickerHex(hex).match(/\w\w/g).map(h => parseInt(h, 16)); return Math.max(...m) - Math.min(...m); };
  const accent = [...colors].sort((a, b) => sat(b.hex) - sat(a.hex))[0]?.hex || 'var(--accent)';
  const onAccent = lum(accent) > 150 ? '#1a1a1a' : '#ffffff';
  const tagline = d?.tagline || '';

  const swatches = colors.map((c, i) => {
    const textOn = lum(c.hex) > 150 ? '#1a1a1a' : '#ffffff';
    return `
    <button type="button" class="bk-swatch" data-copy="${escapeHtml(c.hex)}" title="Click to copy ${escapeHtml(c.hex)}"
            style="background:${escapeHtml(pickerHex(c.hex))};color:${textOn}">
      <span class="bk-swatch-copy">⧉ copy</span>
      <span class="bk-swatch-meta">
        <span class="bk-swatch-role">${escapeHtml(c.role || 'Colour ' + (i+1))}</span>
        <span class="bk-swatch-hex">${escapeHtml(c.hex)}</span>
      </span>
    </button>`;
  }).join('');

  const fontCard = (label, family) => family ? `
    <div class="bk-font-card">
      <div class="bk-font-head">
        <span class="bk-font-label">${label}</span>
        <span class="bk-font-name">${escapeHtml(family)}</span>
      </div>
      <div class="bk-font-aa" style="font-family:'${escapeHtml(family)}',sans-serif">Aa</div>
      <div class="bk-font-pangram" style="font-family:'${escapeHtml(family)}',sans-serif">
        <div style="font-weight:700;font-size:1.15rem">The quick brown fox jumps</div>
        <div style="font-size:0.9rem;opacity:.85">over the lazy dog · 0123456789</div>
      </div>
    </div>` : '';

  stage.innerHTML = `
    <div class="bk">
      <div class="bk-hero" style="background:${escapeHtml(pickerHex(accent))};color:${onAccent}">
        <div class="bk-hero-kicker" style="color:${onAccent};opacity:.7">BRAND KIT</div>
        <div class="bk-hero-name">${escapeHtml(brandEditing.name || 'Untitled brand')}</div>
        ${tagline ? `<div class="bk-hero-tag" style="opacity:.85">${escapeHtml(tagline)}</div>` : ''}
        <div class="bk-hero-chips">
          ${colors.length ? `<span class="bk-chip" style="border-color:${onAccent}44;color:${onAccent}">${colors.length} colour${colors.length===1?'':'s'}</span>` : ''}
          ${(heading||body) ? `<span class="bk-chip" style="border-color:${onAccent}44;color:${onAccent}">${[heading,body].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' / ')}</span>` : ''}
        </div>
      </div>

      ${colors.length ? `
      <div class="bk-section">
        <div class="bk-section-title">Colour palette</div>
        <div class="bk-swatches">${swatches}</div>
      </div>` : ''}

      ${(heading || body) ? `
      <div class="bk-section">
        <div class="bk-section-title">Typography</div>
        <div class="bk-fonts">${fontCard('Heading', heading)}${fontCard('Body', body)}</div>
      </div>` : ''}
    </div>`;

  // Click a swatch to copy its hex, with brief inline feedback.
  stage.querySelectorAll('.bk-swatch').forEach(el => {
    el.addEventListener('click', () => {
      const hex = el.dataset.copy;
      navigator.clipboard?.writeText(hex);
      const tag = el.querySelector('.bk-swatch-copy');
      const prev = tag.textContent;
      tag.textContent = '✓ copied';
      setTimeout(() => { tag.textContent = prev; }, 1100);
    });
  });
}

document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// Hash routing — #brand, #brand/42, #designs, #chat, #generate
function applyHash(hash) {
  const [tab, id] = (hash.replace('#', '') || 'chat').split('/');
  const validTabs = ['chat', 'generate', 'brand', 'designs', 'migrate', 'settings'];
  switchTab(validTabs.includes(tab) ? tab : 'chat', { updateHash: false });
  if (tab === 'brand' && id) {
    // wait for grid to render, then open the editor
    loadBrandGrid().then(() => openBrandEditor(parseInt(id)));
  }
}

window.addEventListener('hashchange', () => applyHash(location.hash));

// ── Migrate tab — DB pull / push ──────────────────────────────────────────
function migrateVal(id) { return document.getElementById(id).value.trim(); }

// Persist migrate fields so you don't re-type URLs + keys every run.
// Local-only dev tool; same trust level as the stored settings API key.
const MIGRATE_FIELDS = ['mgRemote','mgRemoteKey','mgLocal','mgLocalKey'];
function saveMigrateFields() {
  const store = {};
  for (const id of MIGRATE_FIELDS) store[id] = document.getElementById(id)?.value || '';
  try { localStorage.setItem('d5g.migrate', JSON.stringify(store)); } catch {}
}
function restoreMigrateFields() {
  let store;
  try { store = JSON.parse(localStorage.getItem('d5g.migrate') || '{}'); } catch { return; }
  for (const id of MIGRATE_FIELDS) {
    const el = document.getElementById(id);
    if (el && store[id]) el.value = store[id];
  }
}
MIGRATE_FIELDS.forEach(id => {
  document.getElementById(id)?.addEventListener('change', saveMigrateFields);
});
restoreMigrateFields();

async function runMigrate(url, body, btn, resultEl) {
  btn.disabled = true;
  resultEl.style.color = 'var(--muted)';
  resultEl.textContent = 'Working… (large sites can take a minute)';
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    resultEl.style.color = 'var(--accent)';
    resultEl.innerHTML = `✓ ${data.from} → ${data.to}<br>` +
      `${data.tables_imported} statements, ${data.replacements} URL replacements` +
      (data.backup_file ? `<br>Backup: <code>${data.backup_file}</code>` : '');
  } catch (e) {
    resultEl.style.color = '#c0392b';
    resultEl.textContent = '✗ ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

document.getElementById('runPull').addEventListener('click', () => {
  saveMigrateFields();
  runMigrate('/migrate/pull', {
    remote:    migrateVal('mgRemote'),
    remoteKey: migrateVal('mgRemoteKey'),
    local:     migrateVal('mgLocal'),
    localKey:  migrateVal('mgLocalKey'),
  }, document.getElementById('runPull'), document.getElementById('migrateResult'));
});

document.getElementById('runPush').addEventListener('click', () => {
  const remote = migrateVal('mgRemote');
  let host = '';
  try { host = new URL(remote).hostname; } catch {}
  if (!host) {
    const el = document.getElementById('migrateResult');
    el.style.color = '#c0392b';
    el.textContent = '✗ Enter a valid remote site URL first.';
    return;
  }
  const typed = prompt(`PUSH overwrites the live database at ${host}.\nThe remote is backed up first, but all its content will be replaced.\n\nType the hostname to confirm:`);
  if (typed !== host) {
    const el = document.getElementById('migrateResult');
    el.style.color = '#c0392b';
    el.textContent = typed == null ? '✗ Push cancelled.' : `✗ "${typed}" doesn't match "${host}" — push cancelled.`;
    return;
  }
  saveMigrateFields();
  runMigrate('/migrate/push', {
    local:      migrateVal('mgLocal'),
    localKey:   migrateVal('mgLocalKey'),
    remote,
    remoteKey:  migrateVal('mgRemoteKey'),
    confirmHost: host,
  }, document.getElementById('runPush'), document.getElementById('migrateResult'));
});

// Sync on load — hash wins over the HTML active class
(function syncActiveTabOnLoad() {
  if (location.hash) {
    applyHash(location.hash);
  } else {
    const active = document.querySelector('.tab.active');
    if (active) switchTab(active.dataset.tab, { updateHash: false });
  }
})();

// One-time toast: tell existing users the form moved to the "Brief" tab.
(function chatPrimaryToast() {
  if (localStorage.getItem('d5g.seenChatPrimaryToast')) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '💬 Chat is now the home screen. The form moved to the <strong>Brief</strong> tab (or “Structured brief →” in Chat).';
  toast.style.cursor = 'pointer';
  toast.addEventListener('click', () => { toast.remove(); localStorage.setItem('d5g.seenChatPrimaryToast', '1'); });
  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) localStorage.setItem('d5g.seenChatPrimaryToast', '1'); }, 100);
})();

// "Structured brief" link inside Chat → jump to the demoted Generate form.
const briefLink = document.getElementById('chatOpenBrief');
if (briefLink) {
  briefLink.addEventListener('click', () => {
    const genTab = document.querySelector('.tab[data-tab=generate]');
    if (genTab) genTab.click();
  });
}

// ─── Chat ─────────────────────────────────────────────────────────────────────
const chatHistory = [];
// Active chat context — sent with each /chat POST so the server can prepend
// an ACTIVE BRAND/DESIGN/PAGE preamble. Chips to display/clear it land in 5.7.
const chatCtx = { brandId: null, designId: null, generationId: null };

// Onboarding empty-state shown when the chat has no messages. Example prompts
// are clickable — they fill the input so a first-time user knows what to type.
const CHAT_EXAMPLES = [
  'Build a landing page for a coffee roastery — keyword "specialty coffee beans", sections Hero, Features, CTA',
  'Make me an About page for a dental clinic, warm and reassuring tone',
  'Create a pricing page for a SaaS invoicing tool with 3 tiers',
];
function renderChatEmptyState() {
  const el = document.getElementById('chatMessages');
  if (!el || el.querySelector('.msg')) return; // real messages present → no empty state
  el.innerHTML = `
    <div id="chatEmpty" class="chat-empty">
      <div class="chat-empty-title">Describe the page you want</div>
      <div class="chat-empty-sub">Tell Claude what to build and it'll propose a page you can generate, preview, and import — all from here. Try one:</div>
      <div class="chat-empty-examples">
        ${CHAT_EXAMPLES.map(p => `<button type="button" class="chat-example" data-prompt="${escapeHtml(p)}">${escapeHtml(p)}</button>`).join('')}
      </div>
      <div class="chat-empty-hint">Type <code>/</code> for shortcuts · attach a <strong>Brand</strong> or <strong>Design</strong> from their tabs for on-brand output</div>
    </div>`;
  el.querySelectorAll('.chat-example').forEach(b => {
    b.addEventListener('click', () => {
      const input = document.getElementById('chatInput');
      input.value = b.dataset.prompt;
      input.focus();
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 160) + 'px';
    });
  });
}

function appendChatMsg(role, text) {
  const el = document.getElementById('chatMessages');
  const empty = document.getElementById('chatEmpty');
  if (empty) empty.remove();
  const div = document.createElement('div');
  div.className = 'msg';
  div.style.cssText = `padding:10px 12px;border-radius:8px;font-size:0.8125rem;line-height:1.5;white-space:pre-wrap;max-width:92%;${role === 'user' ? 'align-self:flex-end;background:var(--accent);color:#fff;' : 'align-self:flex-start;background:var(--surface);border:1px solid var(--border);'}`;
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
  return div;
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  input.style.height = '';
  setChatBusy(true);

  appendChatMsg('user', message);
  const replyEl = appendChatMsg('assistant', 'Thinking… (first reply can take ~30s while Claude spins up)');
  let reply = '';

  // Watchdog: if no chunk arrives within the window, tell the user the
  // generation is still running (or may have stalled) instead of leaving them
  // staring at "Thinking…" until the browser throws "Failed to fetch".
  let lastChunkAt = Date.now();
  const watchdog = setInterval(() => {
    const idle = Math.round((Date.now() - lastChunkAt) / 1000);
    if (idle >= 30) {
      replyEl.textContent = reply
        ? `${reply}\n\n…still working (${idle}s since last output — large generations can take a few minutes)`
        : `Still working… ${idle}s and no output yet. If this drags on, the page-generator skill may be stuck — try the Structured brief form instead, or cancel and retry.`;
    }
  }, 10000);

  try {
    const res = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatHistory, ctx: chatCtx }),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let eventName = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      lastChunkAt = Date.now();  // any traffic resets the watchdog
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line === '') { eventName = null; continue; }
        if (line.startsWith('event: ')) { eventName = line.slice(7).trim(); continue; }
        if (!line.startsWith('data: ')) continue;
        const d = JSON.parse(line.slice(6));
        if (eventName === 'gen_intent' && d) {
          appendIntentCard(d);
          eventName = null;
        } else if (d.chunk) {
          reply += d.chunk;
          replyEl.textContent = reply;
          document.getElementById('chatMessages').scrollTop = 999999;
        }
      }
    }
  } catch (e) {
    // "Failed to fetch" happens when the streaming connection drops (often
    // because a hung generation timed out). Give a useful message, not the raw
    // network error.
    const msg = e.message === 'Failed to fetch'
      ? 'Connection dropped — the generation may still be running on the server, or the page-generator skill stalled. Check the History tab in a minute, or retry with the Structured brief form.'
      : `Error: ${e.message}`;
    reply = reply ? `${reply}\n\n⚠ ${msg}` : `⚠ ${msg}`;
    replyEl.textContent = reply;
  } finally {
    clearInterval(watchdog);
  }

  chatHistory.push({ role: 'user', content: message });
  chatHistory.push({ role: 'assistant', content: reply });
  setChatBusy(false);
}

// ─── Interactive (Agent SDK) chat — multi-turn ──────────────────────────────
// Talks to /agent/chat, which keeps a persistent Claude session. The first turn
// returns a session id (event: session); we send it on every follow-up so
// "make the purple darker" iterates on the SAME page with full context. Skills'
// AskUserQuestion arrive as ask_question cards; custom tools (colour/slider/
// form) arrive as ask_input widgets. Both round-trip via POST /agent/answer.
let chatSessionId = null;
let chatResumeSession = null; // SDK session UUID to resume on the next new chat (set by re-run)
let chatBusy = false;   // guards against a second send while a turn is in flight
function setChatBusy(b) { chatBusy = b; const el = document.getElementById('chatSend'); if (el) el.disabled = b; }

// Minimal, dependency-free, XSS-safe Markdown → HTML for assistant replies.
// Everything is HTML-escaped FIRST, then only a fixed allow-list of tags is
// introduced (strong/em/code/pre/a[http]/h1-3/ul/ol/li/p). No raw HTML survives.
function renderMarkdown(src) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const blocks = [];
  // pull fenced code blocks out before escaping the rest
  src = String(src).replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, _lang, code) => {
    blocks.push(`<pre><code>${esc(code.replace(/\n$/, ''))}</code></pre>`);
    return ` ${blocks.length - 1} `;
  });
  let out = esc(src);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const lines = out.split('\n');
  let html = '', list = null;
  const closeList = () => { if (list) { html += `</${list}>`; list = null; } };
  for (const line of lines) {
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (h) { closeList(); html += `<h${h[1].length}>${h[2]}</h${h[1].length}>`; }
    else if (ul) { if (list !== 'ul') { closeList(); html += '<ul>'; list = 'ul'; } html += `<li>${ul[1]}</li>`; }
    else if (ol) { if (list !== 'ol') { closeList(); html += '<ol>'; list = 'ol'; } html += `<li>${ol[1]}</li>`; }
    else if (line.trim() === '') { closeList(); }
    else if (/^ \d+ $/.test(line.trim())) { closeList(); html += line.trim(); }
    else { closeList(); html += `<p>${line}</p>`; }
  }
  closeList();
  return html.replace(/ (\d+) /g, (_, i) => blocks[+i]);
}
let chatAttachments = [];   // absolute paths returned by /agent/upload, sent with next message

// Attach button → file picker → upload → chip. Paths ride the next message.
document.getElementById('chatAttach')?.addEventListener('click', () => document.getElementById('chatFile').click());
document.getElementById('chatFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  const list = document.getElementById('chatAttachList');
  const chip = document.createElement('span');
  chip.textContent = `⏳ ${file.name}`;
  list.appendChild(chip);
  try {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch('/agent/upload', { method: 'POST', body: fd }).then(r => r.json());
    if (r.path) { chatAttachments.push(r.path); chip.textContent = `📎 ${r.filename}`; }
    else { chip.textContent = `⚠ ${file.name}`; }
  } catch { chip.textContent = `⚠ ${file.name}`; }
});

async function sendChatAgent() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;
  input.value = '';
  input.style.height = '';
  setChatBusy(true);

  appendChatMsg('user', message);
  const replyEl = appendChatMsg('assistant', '');
  let reply = '';
  const scrollChat = () => { document.getElementById('chatMessages').scrollTop = 999999; };
  const setReply = (t) => { replyEl.style.display = ''; replyEl.textContent = t; scrollChat(); };
  // Render the assistant reply as Markdown (headings, bold, lists, code, links).
  const renderReply = () => {
    replyEl.style.display = '';
    replyEl.style.whiteSpace = 'normal';   // markdown blocks manage their own spacing
    replyEl.classList.add('md');
    replyEl.innerHTML = renderMarkdown(reply);
    scrollChat();
  };
  // Branded spinner while Claude works (no text yet); hidden while waiting on the
  // user or when the bubble is empty at end of turn.
  const showWorking = (label, secs) => {
    replyEl.style.display = '';
    replyEl.innerHTML = `<span class="chat-working"><img class="chat-logo-spin" src="/iconnectit.png" alt="" onerror="this.outerHTML='&lt;span class=\\'chat-spinner\\'&gt;&lt;/span&gt;'"><span>${escapeHtml(label)}${secs ? ` · ${secs}s` : ''}</span></span>`;
    scrollChat();
  };
  const stopWorking = () => { if (!reply) replyEl.style.display = 'none'; };

  // Feedback watchdog: after answering a question Claude can work silently for a
  // bit (e.g. building a mockup). Keep the spinner alive with elapsed time; the
  // server's keep-alive ping prevents the connection actually dropping. Paused
  // while we're awaiting the user's answer to a card.
  let lastBeat = Date.now();
  let working = 'Thinking';
  let awaitingUser = false;
  const beat = () => { lastBeat = Date.now(); };
  showWorking(working);
  const watchdog = setInterval(() => {
    if (awaitingUser || reply) return;
    const idle = Math.round((Date.now() - lastBeat) / 1000);
    showWorking(working, idle >= 4 ? idle : 0);
  }, 1000);

  try {
    const attachments = chatAttachments;
    chatAttachments = [];
    document.getElementById('chatAttachList').innerHTML = '';
    const res = await fetch('/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, ctx: chatCtx, sessionId: chatSessionId, resumeSdkSession: chatSessionId ? null : (chatResumeSession || null), attachments }),
    });
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    let eventName = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      beat();                               // any traffic (incl. keep-alive pings) resets the watchdog
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (line === '') { eventName = null; continue; }
        if (line.startsWith('event: ')) { eventName = line.slice(7).trim(); continue; }
        if (!line.startsWith('data: ')) continue;
        const d = JSON.parse(line.slice(6));
        if (eventName === 'session') {
          chatSessionId = d.id;
          chatResumeSession = null; // consumed
          eventName = null;
        } else if (eventName === 'ask_question') {
          awaitingUser = true; stopWorking();   // your turn — pause the spinner
          appendQuestionCard(d.id, d.question);
          eventName = null;
        } else if (eventName === 'ask_input') {
          awaitingUser = true; stopWorking();
          appendInputCard(d.id, d);
          eventName = null;
        } else if (eventName === 'mockup') {
          awaitingUser = false;
          showMockupInCanvas(d.html, d.title);   // Stage 1: draft preview
          if (!reply) setReply('✓ Mockup ready — showing on the right →');
          appendMockupGenerateCard();
          eventName = null;
        } else if (eventName === 'gen_intent') {
          awaitingUser = false;
          appendIntentCard(d);                    // Stage 2: one-click Generate card (legacy fallback)
          stopWorking();
          eventName = null;
        } else if (eventName === 'building') {
          // Stage 2 (in-chat build) started: keep the approved mockup showing,
          // flip the canvas status to a building indicator, keep the spinner alive.
          awaitingUser = false;
          working = 'Building the Divi 5 page';
          const cs = document.getElementById('canvasStatus');
          if (cs) cs.textContent = 'Building the real Divi 5 page\u2026';
          if (!reply) showWorking(working);
          eventName = null;
        } else if (eventName === 'page_built') {
          // Stage 2 finished in-chat: render the real preview in the canvas and
          // drop the file/import cards into the chat (same result shape as /generate).
          awaitingUser = false;
          if (d.status === 'complete' && d.hasPreview) {
            showInCanvas(d.genId, { title: `Preview \u00b7 generation #${d.genId}` });
            appendGenerationCards(d.genId, d.files, d.hasPreview);
            if (!reply) setReply('\u2713 Page built \u2014 showing on the right \u2192');
          } else {
            appendGenerationCards(d.genId, d.files, d.hasPreview);
            setReply(`\u26a0 Build finished with status "${d.status}". You can retry or refine.`);
          }
          if (typeof loadHistory === 'function') { try { loadHistory(); } catch {} }
          stopWorking();
          eventName = null;
        } else if (eventName === 'brand_saved') {
          appendChatMsg('assistant', `✓ Saved brand "${d.name}" to your Brand tab.`);
          if (typeof loadBrandGrid === 'function') { try { loadBrandGrid(); } catch {} }
          eventName = null;
        } else if (eventName === 'tool_use') {
          awaitingUser = false;
          working = d.name === 'show_mockup' ? 'Building the mockup'
                  : d.name === 'extract_brand' ? 'Reading the site'
                  : d.name === 'start_build' ? 'Building the Divi 5 page'
                  : d.name === 'deliver_page' ? 'Finishing your page'
                  : d.name === 'propose_page' ? 'Preparing the build' : `Running ${d.name}`;
          if (!reply) showWorking(working);
          eventName = null;
        } else if (eventName === 'status') {
          awaitingUser = false;
          working = (d.text || working).replace(/[…\.]+$/, '');
          if (!reply) showWorking(working);
          eventName = null;
        } else if (eventName === 'turn_done') {
          eventName = null;                   // turn complete; response will end
        } else if (d.chunk) {
          awaitingUser = false;
          reply += d.chunk;
          renderReply();
        }
      }
    }
  } catch (e) {
    const msg = e.message === 'Failed to fetch'
      ? 'Connection dropped — the run may still be going on the server. Check History, or retry.'
      : `Error: ${e.message}`;
    reply = reply ? `${reply}\n\n⚠ ${msg}` : `⚠ ${msg}`;
    renderReply();
  } finally {
    clearInterval(watchdog);
    stopWorking();   // hide the spinner bubble if the turn ended with no text
  }

  chatHistory.push({ role: 'user', content: message });
  chatHistory.push({ role: 'assistant', content: reply });
  setChatBusy(false);
}

// Append a locked-state confirmation line to a question/input card.
function lockCard(card, chosen) {
  card.querySelectorAll('button,input').forEach(b => b.disabled = true);
  const t = document.createElement('div');
  t.style.cssText = 'margin-top:6px;font-size:.75rem;opacity:.8';
  t.textContent = `✓ ${chosen}`;
  card.appendChild(t);
}

// Render an AskUserQuestion. Single-select: click an option → answer immediately.
// Multi-select: toggle options, then a Done button sends the joined labels.
function appendQuestionCard(id, q) {
  const el = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'intent-card';
  const multi = !!q.multiSelect;
  const opts = (q.options || []).map((o) => {
    // o.preview is sanitised server-side (SDK strips <script>/<style>); only
    // present when HTML previews are enabled. Off by default → label+description.
    const preview = o.preview ? `<div class="q-preview" style="margin-top:6px">${o.preview}</div>` : '';
    return `<button type="button" class="q-opt" data-label="${escapeHtml(o.label)}">
      <div class="opt-title">${multi ? '☐ ' : ''}${escapeHtml(o.label)}</div>
      ${o.description ? `<div class="opt-desc">${escapeHtml(o.description)}</div>` : ''}
      ${preview}
    </button>`;
  }).join('');
  card.innerHTML = `
    <div class="intent-card-title">${escapeHtml(q.header || 'Question')}${multi ? ' · pick any' : ''}</div>
    <div style="font-size:.8125rem;margin:4px 0 8px">${escapeHtml(q.question || '')}</div>
    <div class="q-opts">${opts}</div>
    ${multi ? '<button type="button" class="q-done btn-generate" style="min-width:auto;height:auto;padding:6px 14px;margin-top:6px">Done →</button>' : ''}
    <div class="q-free">
      <input type="text" class="q-free-input" placeholder="…or type your own answer">
      <button type="button" class="q-free-send">Send</button>
    </div>`;
  el.appendChild(card);
  el.scrollTop = el.scrollHeight;

  if (multi) {
    const chosen = new Set();
    card.querySelectorAll('.q-opt').forEach(b => b.addEventListener('click', () => {
      const lbl = b.dataset.label;
      const head = b.querySelector('div');
      if (chosen.has(lbl)) { chosen.delete(lbl); head.textContent = '☐ ' + lbl; b.classList.remove('selected'); }
      else { chosen.add(lbl); head.textContent = '☑ ' + lbl; b.classList.add('selected'); }
    }));
    card.querySelector('.q-done').addEventListener('click', () => {
      if (!chosen.size) return;
      const joined = [...chosen].join(', ');
      postAnswer(id, joined); lockCard(card, joined);
    });
  } else {
    card.querySelectorAll('.q-opt').forEach(b =>
      b.addEventListener('click', () => { postAnswer(id, b.dataset.label); lockCard(card, b.dataset.label); }));
  }
  const freeInput = card.querySelector('.q-free-input');
  const sendFree = () => { const v = freeInput.value.trim(); if (v) { postAnswer(id, v); lockCard(card, v); } };
  card.querySelector('.q-free-send').addEventListener('click', sendFree);
  freeInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendFree(); } });
}

// Render a custom input tool (ask_input): colour picker, slider, or mini form.
function appendInputCard(id, d) {
  const el = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'intent-card';
  let body = '';
  if (d.kind === 'colour') {
    body = `
      <div class="intent-card-title">${escapeHtml(d.label || 'Pick a colour')}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
        <input type="color" class="ci-colour" value="${escapeHtml(d.default || '#7c3aed')}" style="width:48px;height:36px;border:1px solid var(--border);border-radius:6px;background:none">
        <input type="text" class="ci-hex" value="${escapeHtml(d.default || '#7c3aed')}" style="width:110px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:monospace">
        <button type="button" class="ci-send btn-generate" style="min-width:auto;height:auto;padding:6px 14px">Use →</button>
      </div>`;
  } else if (d.kind === 'slider') {
    const unit = d.unit || '';
    body = `
      <div class="intent-card-title">${escapeHtml(d.label || 'Pick a value')}</div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:6px">
        <input type="range" class="ci-range" min="${d.min}" max="${d.max}" step="${d.step || 1}" value="${d.default}" style="flex:1">
        <span class="ci-val" style="min-width:64px;font-family:monospace">${d.default}${escapeHtml(unit)}</span>
        <button type="button" class="ci-send btn-generate" style="min-width:auto;height:auto;padding:6px 14px">Use →</button>
      </div>`;
  } else if (d.kind === 'form') {
    const fields = (d.fields || []).map(f =>
      `<label style="display:block;margin:6px 0 2px;font-size:.75rem;opacity:.85">${escapeHtml(f.label || f.name)}</label>
       <input type="text" class="ci-field" data-name="${escapeHtml(f.name)}" placeholder="${escapeHtml(f.placeholder || '')}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px">`).join('');
    body = `
      <div class="intent-card-title">A few details</div>
      ${fields}
      <button type="button" class="ci-send btn-generate" style="min-width:auto;height:auto;padding:6px 14px;margin-top:8px">Submit →</button>`;
  }
  card.innerHTML = body;
  el.appendChild(card);
  el.scrollTop = el.scrollHeight;

  if (d.kind === 'colour') {
    const swatch = card.querySelector('.ci-colour');
    const hex = card.querySelector('.ci-hex');
    swatch.addEventListener('input', () => { hex.value = swatch.value; });
    hex.addEventListener('input', () => { if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) swatch.value = hex.value; });
    card.querySelector('.ci-send').addEventListener('click', () => { postAnswer(id, hex.value); lockCard(card, hex.value); });
  } else if (d.kind === 'slider') {
    const range = card.querySelector('.ci-range');
    const val = card.querySelector('.ci-val');
    const unit = d.unit || '';
    range.addEventListener('input', () => { val.textContent = range.value + unit; });
    card.querySelector('.ci-send').addEventListener('click', () => { const out = range.value + unit; postAnswer(id, out); lockCard(card, out); });
  } else if (d.kind === 'form') {
    card.querySelector('.ci-send').addEventListener('click', () => {
      const obj = {};
      card.querySelectorAll('.ci-field').forEach(i => { obj[i.dataset.name] = i.value; });
      postAnswer(id, JSON.stringify(obj)); lockCard(card, 'submitted');
    });
  }
}

function postAnswer(id, value) {
  return fetch('/agent/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, value }),
  });
}

// Render a generation proposal card from a GEN_INTENT payload. "Start" fills the
// Brief form from the intent and submits it (no auto-fire — explicit click).
function appendIntentCard(intent) {
  const el = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'intent-card';
  const rows = Object.entries(intent)
    .filter(([k]) => !['designId'].includes(k))
    .map(([k, v]) => `<div><span class="brand-card-src">${escapeHtml(k)}</span> ${escapeHtml(String(v))}</div>`)
    .join('');
  card.innerHTML = `
    <div class="intent-card-title">Generate: ${escapeHtml(intent.pageType || 'page')}${intent.brand ? ' for ' + escapeHtml(intent.brand) : ''}</div>
    <div class="intent-card-rows">${rows}</div>
    <div class="intent-card-actions">
      <button type="button" class="btn-link" data-intent-edit>Edit brief</button>
      <button type="button" class="btn-generate" data-intent-start style="min-width:auto;height:auto;padding:6px 14px">Start →</button>
    </div>`;
  el.appendChild(card);
  el.scrollTop = el.scrollHeight;
  card.querySelector('[data-intent-edit]').addEventListener('click', () => fillFormFromIntent(intent));
  card.querySelector('[data-intent-start]').addEventListener('click', () => startGenerationFromIntent(intent, card));
}

function fillFormFromIntent(intent) {
  const f = document.forms.genForm;
  if (!f) return;
  if (intent.brand)    f.elements.brand.value = intent.brand;
  if (intent.keyword)  f.elements.keyword.value = intent.keyword;
  if (intent.sections) f.elements.sections.value = Array.isArray(intent.sections) ? intent.sections.join(', ') : intent.sections;
  if (intent.ctaLabel && f.elements.cta_label) f.elements.cta_label.value = intent.ctaLabel;
  if (intent.aesthetic) f.elements.aesthetic.value = intent.aesthetic;
  // Carry the approved mockup path through a hidden field so /generate matches it.
  if (intent.mockupPath) {
    let h = f.elements.mockupPath;
    if (!h) { h = document.createElement('input'); h.type = 'hidden'; h.name = 'mockupPath'; f.appendChild(h); }
    h.value = intent.mockupPath;
  }
  document.querySelector('.tab[data-tab=generate]').click();
}

async function startGenerationFromIntent(intent, card) {
  fillFormFromIntent(intent);
  const startBtn = card.querySelector('[data-intent-start]');
  startBtn.disabled = true;
  startBtn.textContent = 'Starting…';
  // The /generate handler assigns an id; the SSE 'done' event carries it. We
  // can't know the id here, so mark that the *next* completed generation should
  // surface inline in chat. Cleared once consumed in the done handler.
  pendingChatGeneration = { intent, card };
  const form = document.forms.genForm;
  if (form && form.requestSubmit) form.requestSubmit();
  else if (form) form.dispatchEvent(new Event('submit', { cancelable: true }));
}

let pendingChatGeneration = null;

// Append a "Generate Divi Page" action card after a Stage-1 mockup is shown.
function appendMockupGenerateCard() {
  const el = document.getElementById('chatMessages');
  const card = document.createElement('div');
  card.className = 'gen-card gen-card-import';
  card.innerHTML = `
    <div class="gen-card-title">Ready to build</div>
    <button type="button" class="btn-import" data-mockup-generate>Generate Divi Page</button>`;
  el.appendChild(card);
  el.scrollTop = el.scrollHeight;
  card.querySelector('[data-mockup-generate]').addEventListener('click', (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Building…';
    chatInputEl.value = 'Build the Divi 5 page now.';
    sendChatAgent();
  });
}

// Append inline preview + file + import cards into the chat stream for a gen.
function appendGenerationCards(genId, files, hasPreview) {
  const el = document.getElementById('chatMessages');
  const wrap = document.createElement('div');
  wrap.className = 'gen-cards';
  wrap.style.alignSelf = 'stretch';

  if (hasPreview) {
    // The big preview lives in the canvas on the right — show a compact pointer
    // here, plus a button to focus it.
    const preview = document.createElement('div');
    preview.className = 'gen-card gen-card-preview-note';
    preview.innerHTML = `
      <div class="gen-card-title">✓ Preview ready — showing on the right →</div>
      <button type="button" class="btn-link" data-canvas-focus="${genId}">View in canvas</button>`;
    wrap.appendChild(preview);
    preview.querySelector('[data-canvas-focus]').addEventListener('click',
      () => showInCanvas(genId));
  }

  if (files && files.length) {
    const fileCard = document.createElement('div');
    fileCard.className = 'gen-card gen-card-files';
    fileCard.innerHTML = `
      <div class="gen-card-title">Files · ${files.length}</div>
      <div class="gen-card-filelist">${files.map(f =>
        `<a class="gen-card-file" href="/download/${genId}/${encodeURIComponent(f.filename)}" target="_blank">${escapeHtml(f.filename)}</a>`
      ).join('')}</div>`;
    wrap.appendChild(fileCard);

    const importCard = document.createElement('div');
    importCard.className = 'gen-card gen-card-import';
    importCard.innerHTML = `
      <div class="gen-card-title">Import</div>
      <button type="button" class="btn-import" data-chat-import="${genId}">Import to WordPress</button>
      <span class="gen-card-status" data-chat-import-status="${genId}"></span>`;
    wrap.appendChild(importCard);
    importCard.querySelector('[data-chat-import]').addEventListener('click', (e) => chatImport(genId, e.target));
  }

  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;
}

async function chatImport(genId, btn) {
  const status = document.querySelector(`[data-chat-import-status="${genId}"]`);
  btn.disabled = true;
  if (status) status.textContent = 'Importing…';
  try {
    const r = await fetch(`/import/${genId}`, { method: 'POST' }).then(r => r.json());
    if (r.ok && r.previewUrl) {
      const liveLink = r.liveUrl || r.previewUrl;
      const verdict = r.status === 'publish'
        ? `✅ Live — <a href="${liveLink}" target="_blank">view</a>`
        : `✅ Imported — <a href="${r.previewUrl}" target="_blank">view</a>`;
      if (status) status.innerHTML = verdict;
      // If the page went live, open the QA compare layer (mockup vs screenshot).
      if (r.liveUrl) showQaCompare(genId, r.liveUrl);
    } else if (status) {
      status.innerHTML = `⚠️ ${escapeHtml(r.error || 'import failed')}`;
    }
  } catch (e) {
    if (status) status.textContent = `⚠️ ${e.message}`;
  }
  btn.disabled = false;
}

// Interactive (Agent SDK) chat is the default. To fall back to the old one-shot
// `claude -p` path, set USE_AGENT_CHAT = false.
const USE_AGENT_CHAT = true;
const chatSubmit = () => { if (chatBusy) return; return USE_AGENT_CHAT ? sendChatAgent() : sendChat(); };
document.getElementById('chatSend').addEventListener('click', chatSubmit);
document.getElementById('chatInput').addEventListener('keydown', e => {
  // Enter sends; Shift+Enter inserts a newline (standard chat behaviour).
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    const sm = document.getElementById('slashMenu'); if (sm) sm.hidden = true;
    chatSubmit();
  }
});
// Auto-grow the textarea with content (min/max via CSS).
(() => {
  const ta = document.getElementById('chatInput');
  if (!ta) return;
  const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'; };
  ta.addEventListener('input', grow);
})();
document.getElementById('chatClear').addEventListener('click', () => {
  chatHistory.length = 0;
  chatSessionId = null;                 // start a fresh Claude session next message
  document.getElementById('chatMessages').innerHTML = '';
  resetCanvas();                        // blank the preview — no stale generation
  renderChatEmptyState();
});

// ─── Chat context chips + slash hints (5.7) ──────────────────────────────────
// Chips show the active brand/design/page sent in the chat preamble. Click a
// chip to clear that piece of context.
async function setChatContext(field, id) {
  chatCtx[field] = id || null;
  await renderChatChips();
}
window.setChatContext = setChatContext; // exposed for Brand/Designs tabs to call

async function renderChatChips() {
  const wrap = document.getElementById('chatContextChips');
  if (!wrap) return;
  const chips = [];
  if (chatCtx.brandId) {
    try {
      const b = await fetch(`/brand/${chatCtx.brandId}`).then(r => r.json());
      if (!b.error) chips.push(['brand', `Brand: ${b.name}`]);
    } catch {}
  }
  if (chatCtx.designId) {
    try {
      const d = await fetch(`/designs/${chatCtx.designId}`).then(r => r.json());
      if (!d.error) chips.push(['design', `Design: ${d.name}`]);
    } catch {}
  }
  if (chatCtx.generationId) chips.push(['page', `Page: gen #${chatCtx.generationId}`]);
  wrap.innerHTML = chips.map(([field, label]) =>
    `<button type="button" class="ctx-chip" data-clear-ctx="${field}">${escapeHtml(label)} ✕</button>`).join('');
  wrap.querySelectorAll('[data-clear-ctx]').forEach(btn => {
    btn.addEventListener('click', () => { chatCtx[btn.dataset.clearCtx] = null; renderChatChips(); });
  });
}

// Slash autocomplete: typing '/' at the start of the input shows a shortcut menu.
const SLASH_COMMANDS = [
  ['/generate', 'Propose a page generation (chat mode)'],
  ['/brand',    'Attach a brand profile to the chat'],
  ['/design',   'Attach a design project to the chat'],
  ['/import',   'Import the active page to WordPress'],
  ['/pages',    'List imported pages on the site'],
];
const slashMenu = document.getElementById('slashMenu');
const chatInputEl = document.getElementById('chatInput');
chatInputEl.addEventListener('input', () => {
  const v = chatInputEl.value;
  if (v.startsWith('/') && !v.includes('\n')) {
    const q = v.slice(1).toLowerCase();
    const hits = SLASH_COMMANDS.filter(([cmd]) => cmd.slice(1).startsWith(q));
    slashMenu.innerHTML = hits.map(([cmd, desc]) =>
      `<div class="slash-item" data-slash="${cmd}"><strong>${cmd}</strong> <span>${escapeHtml(desc)}</span></div>`).join('');
    slashMenu.hidden = hits.length === 0;
    slashMenu.querySelectorAll('[data-slash]').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        applySlashCommand(item.dataset.slash);
      });
    });
  } else {
    slashMenu.hidden = true;
  }
});
chatInputEl.addEventListener('blur', () => setTimeout(() => slashMenu.hidden = true, 150));

function applySlashCommand(cmd) {
  chatInputEl.value = '';
  slashMenu.hidden = true;
  switch (cmd) {
    case '/generate':
      chatInputEl.value = 'Build a ';
      chatInputEl.focus();
      break;
    case '/brand':
      document.querySelector('.tab[data-tab=brand]').click();
      break;
    case '/design':
      document.querySelector('.tab[data-tab=designs]').click();
      break;
    case '/import':
      chatInputEl.value = 'Import the current page to WordPress.';
      chatInputEl.focus();
      break;
    case '/pages':
      chatInputEl.value = 'List the pages already imported to the site.';
      chatInputEl.focus();
      break;
  }
}

// ─── Settings load / save ─────────────────────────────────────────────────────
async function loadSettings() {
  try {
    const s = await fetch('/settings').then(r => r.json());
    if (s.siteUrl) document.getElementById('siteUrl').value = s.siteUrl;
    if (s.apiKey)  document.getElementById('apiKey').value  = s.apiKey;
  } catch {}
}

document.getElementById('saveSettings').addEventListener('click', async () => {
  const siteUrl = document.getElementById('siteUrl').value.trim();
  const apiKey  = document.getElementById('apiKey').value.trim();
  await fetch('/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteUrl, apiKey }),
  });
  const confirm = document.getElementById('settingsSaved');
  confirm.removeAttribute('hidden');
  setTimeout(() => confirm.setAttribute('hidden', ''), 2500);
});

// ─── Plugin info toggle ───────────────────────────────────────────────────────
const pluginToggle = document.getElementById('pluginInfoToggle');
const pluginInfo   = document.getElementById('pluginInfo');
pluginToggle.addEventListener('click', () => {
  const open = pluginInfo.hasAttribute('hidden');
  pluginInfo.toggleAttribute('hidden', !open);
  pluginToggle.textContent = open ? 'Hide' : 'How to install';
  pluginToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
});

// ─── DiviTheatre info toggle ─────────────────────────────────────────────────
const theatreToggle = document.getElementById('theatreInfoToggle');
const theatreInfo   = document.getElementById('theatreInfo');
theatreToggle.addEventListener('click', () => {
  const open = theatreInfo.hasAttribute('hidden');
  if (open) {
    theatreInfo.removeAttribute('hidden');
    theatreToggle.textContent = 'Hide';
    theatreToggle.setAttribute('aria-expanded', 'true');
  } else {
    theatreInfo.setAttribute('hidden', '');
    theatreToggle.textContent = 'What is this?';
    theatreToggle.setAttribute('aria-expanded', 'false');
  }
});

// ─── Saved exports dropdown ───────────────────────────────────────────────────
async function loadExports() {
  try {
    const exports = await fetch('/exports').then(r => r.json());
    const sel = document.getElementById('savedExportSelect');
    // Remove all but first placeholder option
    while (sel.options.length > 1) sel.remove(1);
    exports.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.label} (${e.brand}, ${e.preset_count} presets)`;
      sel.appendChild(opt);
    });
  } catch {}
}

document.getElementById('savedExportSelect').addEventListener('change', (e) => {
  const dropZone = document.getElementById('dropZone');
  const exportLabelField = document.getElementById('exportLabelField');
  const hiddenSavedId = document.getElementById('savedExportId');
  if (e.target.value) {
    dropZone.style.display = 'none';
    exportLabelField.style.display = 'none';
    hiddenSavedId.value = e.target.value;
  } else {
    dropZone.style.display = '';
    hiddenSavedId.value = '';
  }
});

// ─── Browse / pick folder ─────────────────────────────────────────────────────
document.getElementById('pickFolderBtn').addEventListener('click', async () => {
  try {
    const { path } = await fetch('/pick-folder').then(r => r.json());
    if (path) document.getElementById('outputDir').value = path;
  } catch {}
});

// ─── Import to WordPress ──────────────────────────────────────────────────────
let currentGenId = null;

document.getElementById('importBtn').addEventListener('click', async () => {
  if (!currentGenId) return;
  const btn    = document.getElementById('importBtn');
  const status = document.getElementById('importStatus');
  const link   = document.getElementById('previewLink');
  btn.disabled = true;
  btn.textContent = 'Importing…';
  status.textContent = '';
  link.style.display = 'none';
  try {
    const r = await fetch(`/import/${currentGenId}`, { method: 'POST' });
    const data = await r.json();
    if (data.ok) {
      status.innerHTML = '<span class="style-pass">Imported as draft</span>';
      if (data.previewUrl) {
        link.href = data.previewUrl;
        link.style.display = 'inline-block';
      }
    } else {
      status.innerHTML = `<span class="style-fail">Import failed: ${data.error}</span>`;
    }
  } catch (err) {
    status.innerHTML = `<span class="style-fail">Error: ${err.message}</span>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Import to WordPress';
  }
});

// ─── Test connection ──────────────────────────────────────────────────────────
document.getElementById('testConnection').addEventListener('click', async () => {
  const el = document.getElementById('connectionResult');
  const health = document.getElementById('connectionHealth');
  el.textContent = 'Testing…';
  if (health) health.hidden = true;
  try {
    const data = await fetch('/test-connection').then(r => r.json());
    if (data.ok) {
      el.innerHTML = '<span class="style-pass">Connected successfully</span>';
      renderHealthChips(data);
    } else {
      el.innerHTML = `<span class="style-fail">Failed: ${data.error}</span>`;
    }
  } catch (err) {
    el.innerHTML = `<span class="style-fail">Error: ${err.message}</span>`;
  }
});

// Render the plugin health chips from the enriched /test-connection response.
// Surfaces Divi 5, SEO plugin, and — critically — a version-drift warning when
// the deployed plugin is behind what the app expects (silent cause of broken
// live QA: an older plugin imports as draft, not publish).
function renderHealthChips(data) {
  const health = document.getElementById('connectionHealth');
  if (!health) return;
  health.innerHTML = '';
  const chip = (label, tone) => {
    const c = document.createElement('span');
    c.className = `health-chip ${tone}`;
    c.textContent = label;
    return c;
  };
  health.appendChild(chip(data.divi5 ? 'Divi 5 ✓' : 'Divi 5 missing', data.divi5 ? 'ok' : 'bad'));
  if (data.yoast)      health.appendChild(chip('Yoast ✓', 'ok'));
  else if (data.rankmath) health.appendChild(chip('RankMath ✓', 'ok'));
  else                 health.appendChild(chip('No SEO plugin', 'warn'));
  if (data.pluginVersion) {
    const tone = data.versionOk === 'ok' ? 'ok'
      : data.versionOk === 'behind' ? 'bad' : 'warn';
    const label = data.versionOk === 'behind'
      ? `Plugin ${data.pluginVersion} — update needed (expected ${data.expectedVersion})`
      : `Plugin v${data.pluginVersion}`;
    health.appendChild(chip(label, tone));
  }
  health.hidden = false;
}

// ─── Imported pages: list + delete (no-litter cleanup) ────────────────────────
async function loadWpPages() {
  const box = document.getElementById('wpPagesList');
  box.textContent = 'Loading…';
  let data;
  try {
    data = await fetch('/wp-pages').then(r => r.json());
  } catch (err) {
    box.innerHTML = `<span class="style-fail">Error: ${err.message}</span>`;
    return;
  }
  if (!data.ok) {
    box.innerHTML = `<span class="style-fail">${data.error}</span>`;
    return;
  }
  box.textContent = '';
  if (!data.pages.length) {
    box.innerHTML = '<span class="field-hint">No imported pages yet.</span>';
    return;
  }
  for (const page of data.pages) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border,#2a2a2a)';

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.textContent = page.title;
    const meta = document.createElement('div');
    meta.className = 'field-hint';
    meta.textContent = `${page.slug} · ${page.status}`;
    info.append(title, meta);

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:8px;white-space:nowrap';
    if (page.permalink) {
      const view = document.createElement('a');
      view.href = page.permalink;
      view.target = '_blank';
      view.rel = 'noopener';
      view.textContent = 'View ↗';
      view.style.color = 'var(--accent)';
      actions.append(view);
    }
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-secondary';
    del.textContent = 'Delete';
    del.addEventListener('click', () => deleteWpPage(page.slug, page.title, del));
    actions.append(del);

    row.append(info, actions);
    box.append(row);
  }
}

async function deleteWpPage(slug, title, btn) {
  if (!confirm(`Delete "${title}" from the connected site? This permanently removes the page.`)) return;
  btn.disabled = true;
  btn.textContent = 'Deleting…';
  try {
    const data = await fetch(`/wp-pages/${encodeURIComponent(slug)}`, { method: 'DELETE' }).then(r => r.json());
    if (data.ok) {
      loadWpPages();
    } else {
      btn.disabled = false;
      btn.textContent = 'Delete';
      alert(`Could not delete: ${data.error}`);
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Delete';
    alert(`Error: ${err.message}`);
  }
}

document.getElementById('refreshPages').addEventListener('click', loadWpPages);

// ─── Import a Claude Design hand-off bundle ───────────────────────────────────
document.getElementById('dhImportBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('dhBundle');
  const status = document.getElementById('dhStatus');
  const btn = document.getElementById('dhImportBtn');
  const file = fileInput.files[0];
  if (!file) { status.innerHTML = '<span class="style-fail">Choose a bundle file first.</span>'; return; }

  const data = new FormData();
  data.append('bundle', file);
  data.append('brand', document.getElementById('dhBrand').value.trim());
  if (document.getElementById('dhPublish').checked) data.append('publish', 'true');

  btn.disabled = true;
  btn.textContent = 'Building…';
  status.textContent = 'Uploading bundle…\n';

  try {
    const res = await fetch('/design-handoff', { method: 'POST', body: data });
    const out = await res.json();
    if (!res.ok || !out.id) {
      status.innerHTML = `<span class="style-fail">${out.error || 'Upload failed'}</span>`;
      btn.disabled = false; btn.textContent = 'Build from bundle';
      return;
    }

    const es = new EventSource(`/stream/${out.id}`);
    es.addEventListener('log', ev => { status.textContent += JSON.parse(ev.data).chunk; });
    es.addEventListener('done', ev => {
      es.close();
      const { status: s } = JSON.parse(ev.data);
      const ok = s === 'complete';
      status.innerHTML += `\n<span class="${ok ? 'style-pass' : 'style-fail'}">Finished: ${s}</span>`;
      btn.disabled = false; btn.textContent = 'Build from bundle';
      loadWpPages();
      if (typeof loadHistory === 'function') loadHistory();
    });
    es.onerror = () => { es.close(); btn.disabled = false; btn.textContent = 'Build from bundle'; };
  } catch (err) {
    status.innerHTML = `<span class="style-fail">Error: ${err.message}</span>`;
    btn.disabled = false; btn.textContent = 'Build from bundle';
  }
});

// ─── Re-run a past generation ─────────────────────────────────────────────────
function viewMockup(id, event) {
  event.stopPropagation();
  showHtmlPreview(id);
}

function openRevisionDrawer(id, event) {
  event.stopPropagation();
  // Close any other open drawers
  document.querySelectorAll('.revision-drawer').forEach(d => d.style.display = 'none');
  const drawer = document.getElementById(`drawer-${id}`);
  if (drawer) {
    drawer.style.display = '';
    drawer.querySelector('textarea').focus();
  }
}

function closeRevisionDrawer(id, event) {
  event.stopPropagation();
  const drawer = document.getElementById(`drawer-${id}`);
  if (drawer) drawer.style.display = 'none';
}

async function deleteGeneration(id, event) {
  event.stopPropagation();
  if (!confirm('Delete this generation from history?')) return;
  await fetch(`/generations/${id}`, { method: 'DELETE' });
  loadHistory();
}

async function rerunGeneration(id, event) {
  event.stopPropagation();
  try {
    const data = await fetch(`/rerun/${id}`, { method: 'POST' }).then(r => r.json());
    if (data.error) return;

    // Capture revision notes before switching tabs
    const revisionNotes = (document.getElementById(`revision-${id}`)?.value || '').trim();

    // If this generation was built in-chat, resume the conversation instead of
    // re-submitting the old form — the full context (mockup, prior turns, brand)
    // is still in the Claude SDK session stored in ~/.claude/projects/.
    if (data.sdk_session_id) {
      chatSessionId = null;                          // start a fresh in-memory session
      chatResumeSession = data.sdk_session_id;       // SDK resume for the first turn
      document.querySelector('.tab[data-tab=chat]').click();
      const input = document.getElementById('chatInput');
      if (input) {
        input.value = revisionNotes
          ? `I want to revise this page. Revision notes: ${revisionNotes}`
          : 'I want to revisit and refine this page.';
        input.focus();
      }
      return;
    }

    const form = document.getElementById('genForm');
    form.querySelector('[name=brand]').value             = data.brand || '';
    form.querySelector('[name=whatItDoes]').value        = data.what_it_does || '';
    form.querySelector('[name=keyword]').value           = data.keyword || '';
    form.querySelector('[name=secondaryKeywords]').value = data.secondary_keywords || '';
    form.querySelector('[name=ctaLabel]').value          = data.cta_label || '';
    form.querySelector('[name=ctaUrl]').value            = data.cta_url || '';
    document.getElementById('outputDir').value      = data.output_dir || '';
    document.getElementById('revisionNotes').value  = revisionNotes;

    // Sections checkboxes
    form.querySelectorAll('[name=sections]').forEach(cb => {
      cb.checked = Array.isArray(data.sections) && data.sections.includes(cb.value);
    });

    // Aesthetic radio
    form.querySelectorAll('[name=aesthetic]').forEach(r => {
      r.checked = r.value === (data.aesthetic || '');
    });

    // ET template
    const etSel = document.getElementById('etTemplate');
    etSel.value = data.et_template || '';
    etSel.dispatchEvent(new Event('change'));

    // Switch to generate tab (reuse the generic tab switcher)
    document.querySelector('.tab[data-tab=generate]').click();

    if (revisionNotes) {
      document.getElementById('revisionNotesField').style.display = '';
    }

    // Auto-submit so the user gets immediate feedback
    form.requestSubmit();

  } catch {}
}

// ─── Style check details panel ────────────────────────────────────────────────
function renderStyleCheckDetails(logText) {
  const panel = document.getElementById('styleCheckDetails');
  if (!logText) { panel.style.display = 'none'; return; }
  // Scope to the style-check report — the full log also carries the render
  // validator's "all checks pass" summary, which reads as contradictory next
  // to an INCONSISTENT style verdict (they measure different things).
  const start = logText.indexOf('STYLE CONSISTENCY REPORT');
  const report = start === -1 ? logText : logText.slice(start);
  const lines = report.split('\n');
  // Keep the verdict, section headers, and the ✖/⚠/✓ detail bullets (the
  // bullets don't contain the words FAIL/WARN, so match on the glyphs too).
  const relevant = lines.filter(l => /FAIL|WARN|VERDICT|CONSISTENT|INCONSISTENT|[✖⚠✓]/.test(l));
  if (!relevant.length) { panel.style.display = 'none'; return; }
  const html = relevant.map(l => {
    const cls = /✖|FAIL|INCONSISTENT/.test(l) ? 'style-fail' :
                /⚠|WARN/.test(l) ? 'style-warn' : 'style-pass';
    const escaped = l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return `<div class="${cls}">${escaped}</div>`;
  }).join('');
  panel.innerHTML = '<strong style="font-size:0.75rem;color:var(--muted);display:block;margin-bottom:6px">STYLE CHECK DETAILS</strong>' + html;
  panel.style.display = '';
}

// ─── Saved Briefs ────────────────────────────────────────────────────────────
async function loadBriefs() {
  try {
    const briefs = await fetch('/briefs').then(r => r.json());
    const sel = document.getElementById('savedBriefSelect');
    while (sel.options.length > 1) sel.remove(1);
    briefs.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      opt.dataset.brief = JSON.stringify(b.data);
      sel.appendChild(opt);
    });
  } catch {}
}

document.getElementById('savedBriefSelect').addEventListener('change', (e) => {
  const opt = e.target.selectedOptions[0];
  if (!opt || !opt.dataset.brief) return;
  const d = JSON.parse(opt.dataset.brief);
  const form = document.getElementById('genForm');
  if (d.brand)             form.querySelector('[name=brand]').value = d.brand;
  if (d.whatItDoes)        form.querySelector('[name=whatItDoes]').value = d.whatItDoes;
  if (d.keyword)           form.querySelector('[name=keyword]').value = d.keyword;
  if (d.secondaryKeywords) form.querySelector('[name=secondaryKeywords]').value = d.secondaryKeywords;
  if (d.ctaLabel)          form.querySelector('[name=ctaLabel]').value = d.ctaLabel;
  if (d.ctaUrl)            form.querySelector('[name=ctaUrl]').value = d.ctaUrl;
  if (d.outputDir)         document.getElementById('outputDir').value = d.outputDir;
  if (d.sections) {
    form.querySelectorAll('[name=sections]').forEach(cb => {
      cb.checked = d.sections.includes(cb.value);
    });
  }
  if (d.aesthetic) {
    form.querySelectorAll('[name=aesthetic]').forEach(r => { r.checked = r.value === d.aesthetic; });
  }
  if (d.motion) {
    form.querySelectorAll('[name=motion]').forEach(r => { r.checked = r.value === d.motion; });
  }
  if (d.etTemplate !== undefined) {
    const sel = document.getElementById('etTemplate');
    sel.value = d.etTemplate || '';
    sel.dispatchEvent(new Event('change'));
  }
  e.target.value = ''; // reset dropdown after loading
});

document.getElementById('saveBriefBtn').addEventListener('click', async () => {
  const name = prompt('Brief name:');
  if (!name) return;
  const form = document.getElementById('genForm');
  const data = {
    brand:             form.querySelector('[name=brand]').value,
    whatItDoes:        form.querySelector('[name=whatItDoes]').value,
    keyword:           form.querySelector('[name=keyword]').value,
    secondaryKeywords: form.querySelector('[name=secondaryKeywords]').value,
    ctaLabel:          form.querySelector('[name=ctaLabel]').value,
    ctaUrl:            form.querySelector('[name=ctaUrl]').value,
    outputDir:         document.getElementById('outputDir').value,
    sections:          [...form.querySelectorAll('[name=sections]:checked')].map(c => c.value),
    aesthetic:         form.querySelector('[name=aesthetic]:checked')?.value || '',
    motion:            form.querySelector('[name=motion]:checked')?.value || 'no',
    etTemplate:        document.getElementById('etTemplate').value || '',
  };
  await fetch('/briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data }),
  });
  await loadBriefs();
});

// ─── Design canvas (persistent live preview on the right) ─────────────────────
let canvasGenId = null;
// ─── QA compare layer (post-import: mockup vs live screenshot) ──────────────
// After a successful import, the canvas switches from "just the mockup" to a
// compare view: the Stage 2 mockup beside a real full-page screenshot of the
// live Divi page. This is the visual fidelity gate — if the live render drifts
// from the mockup, it shows here.
let qaActiveGenId = null;
let qaLiveUrl = null;

function setQaView(view) {
  const panel = document.getElementById('qaCompare');
  if (panel) panel.dataset.qaView = view;
  document.querySelectorAll('#qaTabs button').forEach(b =>
    b.classList.toggle('active', b.dataset.qa === view));
}

// Render the QA layer for a generation. liveUrl is the published page permalink.
async function showQaCompare(genId, liveUrl) {
  qaActiveGenId = genId;
  qaLiveUrl = liveUrl;
  const panel = document.getElementById('qaCompare');
  const frame = document.getElementById('canvasFrame');
  const empty = document.getElementById('canvasEmpty');
  if (!panel) return;

  // Mockup pane: mirror the canvas iframe's mockup into the QA compare pane.
  const mockupFrame = document.getElementById('qaMockupFrame');
  if (mockupFrame) mockupFrame.src = `/preview-html/${genId}?t=${Date.now()}`;

  // Open-live link + re-shoot button.
  const openLive = document.getElementById('qaOpenLive');
  if (openLive) { openLive.href = liveUrl; openLive.hidden = false; }

  // Reveal the QA layer over the canvas stage.
  if (empty) empty.hidden = true;
  if (frame) frame.hidden = true;   // mockup now lives in the QA pane
  panel.hidden = false;
  setQaView('compare');

  await loadQaScreenshot(liveUrl, false);
}

// Fetch the live screenshot and load it into the <img>. fresh=true bypasses cache.
async function loadQaScreenshot(liveUrl, fresh) {
  const img = document.getElementById('qaLiveImg');
  const loading = document.getElementById('qaShotLoading');
  if (!img || !liveUrl) return;
  if (loading) loading.hidden = false;
  img.style.opacity = '0.4';
  try {
    const u = `/screenshot?url=${encodeURIComponent(liveUrl)}${fresh ? '&fresh=1' : ''}&t=${Date.now()}`;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('screenshot load failed'));
      img.src = u;
    });
    img.style.opacity = '1';
  } catch (e) {
    if (loading) loading.textContent = '⚠️ Could not render live page. Is the site reachable & Chrome installed?';
  } finally {
    if (loading) loading.hidden = true;
  }
}

// QA tabs (Compare / Live / Mockup).
document.getElementById('qaTabs')?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-qa]');
  if (btn) setQaView(btn.dataset.qa);
});
// Re-shoot button bypasses cache.
document.getElementById('qaRefresh')?.addEventListener('click', () => {
  if (qaLiveUrl) loadQaScreenshot(qaLiveUrl, true);
});

function showInCanvas(genId, meta = {}) {
  const frame = document.getElementById('canvasFrame');
  if (!frame) return;
  canvasGenId = genId;
  const url = `/preview-html/${genId}?t=${Date.now()}`;
  frame.removeAttribute('srcdoc');   // clear any Stage-1 draft (srcdoc beats src)
  frame.src = url;
  frame.hidden = false;
  document.getElementById('canvasEmpty').hidden = true;
  document.getElementById('canvasTitle').textContent = meta.title || `Preview · generation #${genId}`;
  const newTab = document.getElementById('canvasNewTab');
  newTab.href = url; newTab.hidden = false;
  document.getElementById('canvasImport').hidden = false;
  const cg = document.getElementById('canvasGenerate'); if (cg) cg.hidden = true;
  document.getElementById('canvasStatus').textContent = '';
  document.getElementById('canvasPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Blank the canvas — used when starting a fresh chat session so a previous
// generation's preview (or draft mockup) doesn't linger.
function resetCanvas() {
  canvasGenId = null;
  const frame = document.getElementById('canvasFrame');
  if (frame) { frame.removeAttribute('srcdoc'); frame.src = ''; frame.hidden = true; }
  const empty = document.getElementById('canvasEmpty'); if (empty) empty.hidden = false;
  const title = document.getElementById('canvasTitle'); if (title) title.textContent = 'Preview';
  ['canvasNewTab', 'canvasImport'].forEach(id => { const e = document.getElementById(id); if (e) e.hidden = true; });
  const st = document.getElementById('canvasStatus'); if (st) st.textContent = '';
}

// Stage 1: render an HTML mockup draft in the canvas via srcdoc (no saved
// generation). Import is hidden — it's a draft until the real Divi page is built.
function showMockupInCanvas(html, title) {
  const frame = document.getElementById('canvasFrame');
  if (!frame) return;
  canvasGenId = null;
  frame.removeAttribute('src');
  frame.srcdoc = html;
  frame.hidden = false;
  document.getElementById('canvasEmpty').hidden = true;
  document.getElementById('canvasTitle').textContent = title || 'Mockup · draft';
  const newTab = document.getElementById('canvasNewTab'); if (newTab) newTab.hidden = true;
  const imp = document.getElementById('canvasImport'); if (imp) imp.hidden = true;
  const gen = document.getElementById('canvasGenerate'); if (gen) gen.hidden = false;
  document.getElementById('canvasStatus').textContent = 'Draft mockup — ask for changes, or click Generate Divi Page when ready';
  document.getElementById('canvasPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Load the most recent completed generation that has a preview into the canvas.
async function loadLatestIntoCanvas() {
  try {
    const rows = await fetch('/generations').then(r => r.json());
    const hit = rows.find(r => r.status === 'complete' && r.has_preview);
    if (hit) showInCanvas(hit.id, { title: `${hit.brand} · ${hit.keyword}` });
  } catch {}
}

// Viewport toggle (Desktop / Mobile frame width).
document.getElementById('viewportToggle')?.addEventListener('click', e => {
  const btn = e.target.closest('button[data-vw]');
  if (!btn) return;
  document.querySelectorAll('#viewportToggle button').forEach(b => b.classList.toggle('active', b === btn));
  document.getElementById('canvasFrame').classList.toggle('mobile', btn.dataset.vw === 'mobile');
});

// Canvas Import button → reuse the import endpoint, report into canvas-status.
document.getElementById('canvasImport')?.addEventListener('click', async (e) => {
  if (!canvasGenId) return;
  const btn = e.currentTarget;
  const status = document.getElementById('canvasStatus');
  btn.disabled = true; status.textContent = 'Importing…';
  try {
    const r = await fetch(`/import/${canvasGenId}`, { method: 'POST' }).then(r => r.json());
    if (r.ok && r.previewUrl) {
      const link = r.liveUrl || r.previewUrl;
      status.innerHTML = r.status === 'publish'
        ? `✅ Live — <a href="${link}" target="_blank" style="color:var(--accent)">view in WordPress ↗</a>`
        : `✅ Imported — <a href="${r.previewUrl}" target="_blank" style="color:var(--accent)">view ↗</a>`;
      // If published, open the QA compare layer (mockup vs live screenshot).
      if (r.liveUrl) showQaCompare(canvasGenId, r.liveUrl);
    } else {
      status.textContent = `⚠️ ${r.error || 'import failed'}`;
    }
  } catch (err) { status.textContent = `⚠️ ${err.message}`; }
  btn.disabled = false;
});

// ─── Generate Divi Page button (canvas toolbar — shown during mockup phase) ───
document.getElementById('canvasGenerate')?.addEventListener('click', () => {
  chatInputEl.value = 'Build the Divi 5 page now.';
  sendChatAgent();
});

// ─── HTML Preview panel (now routes to the canvas) ────────────────────────────
function showHtmlPreview(genId) {
  showInCanvas(genId);
}

// Preview side drawer — pop a generation preview out to ~50% width on the right.
function openPreviewDrawer(genId) {
  const drawer = document.getElementById('previewDrawer');
  const frame = document.getElementById('previewDrawerFrame');
  const title = document.getElementById('previewDrawerTitle');
  const newTab = document.getElementById('previewDrawerNewTab');
  if (!drawer || !frame) return;
  const url = `/preview-html/${genId}?t=${Date.now()}`;
  frame.src = url;
  newTab.href = url;
  title.textContent = `Preview · generation #${genId}`;
  drawer.hidden = false;
}
document.getElementById('previewDrawerClose').addEventListener('click', () => {
  const drawer = document.getElementById('previewDrawer');
  const frame = document.getElementById('previewDrawerFrame');
  drawer.hidden = true;
  frame.src = '';
});

// ─── Revision notes field ─────────────────────────────────────────────────────
document.getElementById('clearRevision').addEventListener('click', () => {
  document.getElementById('revisionNotes').value = '';
  document.getElementById('revisionNotesField').style.display = 'none';
});

// ─── Init ────────────────────────────────────────────────────────────────────
renderChatEmptyState();
loadLatestIntoCanvas();
checkPrereqs();
loadHistory();
loadSettings();
loadExports();
loadBriefs();
loadEtPages();

// ─── Brand Profiles ───────────────────────────────────────────────────────────
// Brand Profile `data` shape (canonical across app + skills):
//   { name, colors:[{role,hex,source,locked}], fonts:{heading:{family},body:{family}},
//     logo, voice, tagline }

const BRAND_FONT_OPTIONS = [
  '', 'Inter', 'Poppins', 'Montserrat', 'Roboto', 'Open Sans', 'Lato',
  'Playfair Display', 'Merriweather', 'Lora', 'Source Sans Pro', 'Nunito',
  'Work Sans', 'Raleway', 'DM Sans', 'Archivo', 'Oswald', 'IBM Plex Sans',
];

function emptyBrandData() {
  return { colors: [], fonts: {}, logo: null, voice: '', tagline: '' };
}

async function loadBrandGrid() {
  const grid = document.getElementById('brandGrid');
  let profiles;
  try {
    profiles = await fetch('/brand').then(r => r.json());
  } catch {
    grid.innerHTML = '<div class="empty">Could not load brand profiles.</div>';
    return;
  }
  if (!Array.isArray(profiles) || profiles.length === 0) {
    grid.innerHTML = '<div class="empty">No brand profiles yet — create one with ＋ Blank.</div>';
    return;
  }
  grid.innerHTML = profiles.map(renderBrandCard).join('');
  grid.querySelectorAll('[data-brand-edit]').forEach(btn => {
    btn.addEventListener('click', () => openBrandEditor(parseInt(btn.dataset.brandEdit)));
  });
  grid.querySelectorAll('[data-brand-use]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setChatContext('brandId', parseInt(btn.dataset.brandUse));
      switchTab('chat');
      document.getElementById('chatInput')?.focus();
    });
  });
}

function renderBrandCard(p) {
  const data = normalizeBrandData(p.data || {});
  const swatches = (data.colors || []).slice(0, 6).map(c =>
    `<span class="brand-card-swatch" style="background:${c.hex}" title="${escapeHtml(c.role || c.hex)}:${c.hex}"></span>`
  ).join('');
  const fontLine = [data.fonts?.heading?.family, data.fonts?.body?.family]
    .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' / ');
  const meta = [fontLine, data.tagline].filter(Boolean).join(' · ');
  return `
    <div class="brand-card" data-brand-card="${p.id}">
      <div class="brand-card-head">
        <strong>${escapeHtml(p.name)}</strong>
        <span class="brand-card-src">${escapeHtml(p.source_type || 'manual')}</span>
      </div>
      <div class="brand-card-swatches">${swatches || '<span class="brand-card-no-swatches">no colours</span>'}</div>
      ${meta ? `<div class="brand-card-meta">${escapeHtml(meta)}</div>` : ''}
      <div style="display:flex;gap:14px;align-items:center">
        <button type="button" class="btn-link brand-card-edit" data-brand-edit="${p.id}">Edit</button>
        <button type="button" class="btn-link brand-card-use" data-brand-use="${p.id}" style="color:var(--accent)">Use in chat →</button>
      </div>
    </div>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// A divi-export profile stores { variables: { global_colors, global_variables }, presets }.
// The editor/cards read data.colors + data.fonts. Derive those onto the same object so
// the raw divi data (gcid tuples needed for brand-deploy) is preserved on save.
function normalizeBrandData(data) {
  if (!data || typeof data !== 'object') return data;
  if (!Array.isArray(data.colors) || data.colors.length === 0) {
    const gc = data.variables?.global_colors;
    if (Array.isArray(gc) && gc.length) {
      data.colors = gc
        .filter(t => Array.isArray(t) && t[1])
        .map(([gcid, meta]) => ({ role: meta.label || gcid, hex: meta.color || '', source: 'divi', gcid }))
        .filter(c => c.hex);
    }
  }
  if (!data.fonts?.heading && !data.fonts?.body) {
    const gv = data.variables?.global_variables;
    if (Array.isArray(gv)) {
      const fonts = gv.filter(v => v?.type === 'fonts');
      const find = re => fonts.find(f => re.test(f.id || ''))?.value;
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

// Font selects only list preset families — inject the profile's own family if missing.
function ensureFontOption(selectId, family) {
  if (!family) return;
  const sel = document.getElementById(selectId);
  if (![...sel.options].some(o => o.value === family)) {
    sel.add(new Option(family, family));
  }
}

function fillFontSelects() {
  const heading = document.getElementById('brandHeadingFont');
  const body = document.getElementById('brandBodyFont');
  for (const sel of [heading, body]) {
    sel.innerHTML = BRAND_FONT_OPTIONS.map(f => `<option value="${f}">${f || '— none —'}</option>`).join('');
  }
}

function openBrandEditor(id) {
  const editor = document.getElementById('brandEditor');
  const title = document.getElementById('brandEditorTitle');
  const delBtn = document.getElementById('brandDelete');

  fillFontSelects();
  editor.hidden = false;
  editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  if (id == null) {
    brandEditing = { id: null, name: '', source_type: 'manual', data: emptyBrandData() };
    title.textContent = 'New brand profile';
    delBtn.hidden = true;
  } else {
    brandEditing = { id, name: '', source_type: 'manual', data: emptyBrandData(), _loading: true };
    title.textContent = 'Edit brand profile';
    delBtn.hidden = false;
    fetch(`/brand/${id}`).then(r => r.json()).then(p => {
      if (!p || p.error) return;
      brandEditing = { id: p.id, name: p.name, source_type: p.source_type || 'manual', data: normalizeBrandData(p.data || emptyBrandData()) };
      paintBrandEditor();
    });
  }
  paintBrandEditor();
}

function paintBrandEditor() {
  if (!brandEditing) return;
  const d = brandEditing.data;
  document.getElementById('brandName').value = brandEditing.name || '';
  document.getElementById('brandTagline').value = d.tagline || '';
  document.getElementById('brandVoice').value = d.voice || '';
  ensureFontOption('brandHeadingFont', d.fonts?.heading?.family);
  ensureFontOption('brandBodyFont', d.fonts?.body?.family);
  document.getElementById('brandHeadingFont').value = d.fonts?.heading?.family || '';
  document.getElementById('brandBodyFont').value = d.fonts?.body?.family || '';
  renderBrandColorRows();
  renderBrandCanvas();
}

function renderBrandColorRows() {
  const wrap = document.getElementById('brandColors');
  const colors = brandEditing?.data?.colors || [];
  if (colors.length === 0) {
    wrap.innerHTML = '<span class="field-hint">No colours yet.</span>';
    return;
  }
  wrap.innerHTML = colors.map((c, i) => `
    <div class="color-row" data-color-idx="${i}">
      <input type="color" value="${pickerHex(c.hex)}" data-color-hex="${i}" title="${escapeHtml(c.hex)}">
      <input type="text" value="${escapeHtml(c.role || '')}" placeholder="role" data-color-role="${i}">
      <span class="color-source">${escapeHtml(c.source || 'manual')}</span>
      <button type="button" class="color-remove" data-color-remove="${i}" aria-label="Remove colour" title="Remove">✕</button>
    </div>`).join('');
}

// <input type=color> only accepts #RRGGBB; coerce rgb()/rgba() so the picker
// shows the right swatch instead of falling back to black.
function pickerHex(c) {
  if (typeof c !== 'string') return '#000000';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = c.match(/\d+/g);
  if (m && m.length >= 3) {
    return '#' + m.slice(0, 3).map(v => Math.min(255, +v).toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}

function addBrandColorRow(role = '', hex = '#f75d00', source = 'manual') {
  if (!brandEditing) return;
  brandEditing.data.colors.push({ role, hex, source, locked: false });
  renderBrandColorRows();
}

function collectBrandEditor() {
  if (!brandEditing) return null;
  const d = brandEditing.data;
  d.tagline = document.getElementById('brandTagline').value.trim();
  d.voice = document.getElementById('brandVoice').value.trim();
  const heading = document.getElementById('brandHeadingFont').value;
  const body = document.getElementById('brandBodyFont').value;
  d.fonts = {};
  if (heading) d.fonts.heading = { family: heading };
  if (body) d.fonts.body = { family: body };
  // colours read live from their inputs
  document.querySelectorAll('#brandColors .color-row').forEach(row => {
    const i = parseInt(row.dataset.colorIdx);
    const c = d.colors[i];
    if (!c) return;
    c.hex = row.querySelector('[data-color-hex]').value;
    c.role = row.querySelector('[data-color-role]').value.trim();
  });
  const name = document.getElementById('brandName').value.trim();
  return { name, data: d, source_type: brandEditing.source_type };
}

async function saveBrandProfile() {
  const payload = collectBrandEditor();
  if (!payload) return;
  if (!payload.name) {
    alert('Brand name is required.');
    return;
  }
  const method = brandEditing.id ? 'PUT' : 'POST';
  const url = brandEditing.id ? `/brand/${brandEditing.id}` : '/brand';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json());
  if (res.error) { alert(res.error); return; }
  closeBrandEditor();
  await loadBrandGrid();
}

async function deleteBrandProfileUI() {
  if (!brandEditing?.id) return;
  if (!confirm(`Delete brand profile "${brandEditing.name}"? This cannot be undone.`)) return;
  const res = await fetch(`/brand/${brandEditing.id}`, { method: 'DELETE' }).then(r => r.json());
  if (res.error) { alert(res.error); return; }
  closeBrandEditor();
  await loadBrandGrid();
}

function closeBrandEditor() {
  brandEditing = null;
  document.getElementById('brandEditor').hidden = true;
}

// Fetch a public page, parse a bundle, and prefill the editor with candidate
// colours + fonts. Richer Claude analysis is wired in Phase 3.6/7; for now the
// bundle alone is genuinely useful (plan Task 3.3 simplification).
async function extractFromUrl() {
  const url = prompt('Paste a public URL to extract brand cues from:');
  if (!url) return;
  openBrandEditor(null);                 // open a blank editor to receive the bundle
  const editor = document.getElementById('brandEditor');
  let banner = document.getElementById('brandExtractStatus');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'brandExtractStatus';
    banner.style.cssText = 'font-size:0.75rem;color:var(--muted);padding:6px 8px;border-radius:6px;background:var(--bg)';
    editor.insertBefore(banner, editor.firstChild);
  }
  banner.textContent = `Fetching ${url}…`;
  banner.style.color = 'var(--muted)';

  let bundle;
  try {
    const res = await fetch(`/brand/extract-url?url=${encodeURIComponent(url)}`);
    bundle = await res.json();
    if (!res.ok) throw new Error(bundle.error || `HTTP ${res.status}`);
  } catch (e) {
    banner.textContent = `Could not extract: ${e.message}`;
    banner.style.color = 'var(--danger)';
    return;
  }

  // Prefill candidate colours (role auto-assigned by order) + fonts.
  const colors = (bundle.colors || []).slice(0, 6).map((hex, i) => ({
    role: ['', 'primary', 'accent', ''][i] || `color-${i}`,
    hex,
    source: 'url',
    locked: false,
  }));
  if (brandEditing) {
    brandEditing.data.colors = colors;
    const f = bundle.fonts || [];
    if (f[0]) brandEditing.data.fonts = { heading: { family: f[0], source: 'url' } };
    if (f[1]) brandEditing.data.fonts.body = { family: f[1], source: 'url' };
    else if (f[0]) brandEditing.data.fonts.body = { family: f[0], source: 'url' };
    if (!brandEditing.name && bundle.title) brandEditing.name = bundle.title;
    paintBrandEditor();
  }

  const parts = [
    bundle.title ? `“${bundle.title}”` : null,
    `${colors.length} colours`,
    (bundle.fonts || []).length ? `${bundle.fonts.length} fonts` : null,
    bundle.truncated ? 'page truncated' : null,
  ].filter(Boolean);
  banner.textContent = `Extracted from URL — ${parts.join(' · ')}. Review before saving.`;
  banner.style.color = 'var(--muted)';
}

// Draw an image into a small offscreen canvas and return the most frequent
// quantised colours (4 bits/channel). Purely client-side — no upload. Excludes
// near-transparent pixels; down-weights near-white/near-black unless dominant.
function dominantColors(file, maxColors = 6) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const W = 64, H = 64;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      let data;
      try { data = ctx.getImageData(0, 0, W, H).data; }
      catch (e) { reject(e); return; }
      const counts = new Map();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 128) continue;                       // skip transparent
        const r = data[i] & 0xf0, g = data[i + 1] & 0xf0, b = data[i + 2] & 0xf0;
        const key = (r << 16) | (g << 8) | b;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      const out = [...counts.entries()].sort((a, b) => b[1] - a[1])
        .slice(0, maxColors).map(([k]) => {
          const r = (k >> 16) & 0xff, g = (k >> 8) & 0xff, b = k & 0xff;
          return '#' + [r, g, b].map(x => (x + 8).toString(16).padStart(2, '0')).join('');
        });
      URL.revokeObjectURL(img.src);
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('could not load image')); };
    img.src = URL.createObjectURL(file);
  });
}

// On logo upload: derive candidate colours via canvas and prefill the editor.
document.getElementById('brandLogoInput').addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file || !brandEditing) return;
  const banner = (function () {
    let b = document.getElementById('brandExtractStatus');
    if (!b) {
      b = document.createElement('div');
      b.id = 'brandExtractStatus';
      b.style.cssText = 'font-size:0.75rem;color:var(--muted);padding:6px 8px;border-radius:6px;background:var(--bg)';
      document.getElementById('brandEditor').insertBefore(b, document.getElementById('brandEditor').firstChild);
    }
    return b;
  })();
  banner.textContent = `Analysing ${file.name}…`;
  try {
    const hexes = await dominantColors(file);
    brandEditing.data.colors = hexes.map((hex, i) => ({
      role: ['', 'primary', 'accent', ''][i] || `color-${i}`,
      hex, source: 'image-canvas', locked: false,
    }));
    renderBrandColorRows();
    banner.textContent = `Canvas-derived ${hexes.length} colours from logo. For richer analysis, use “From chat” (vision) once wired.`;
  } catch (err) {
    banner.textContent = `Could not read image: ${err.message}`;
    banner.style.color = 'var(--danger)';
  }
});

// ── Brand tab wiring ──
document.querySelectorAll('[data-brand-new]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    const mode = btn.dataset.brandNew;
    if (mode === 'url')    { extractFromUrl(); return; }
    if (mode === 'export') { extractFromDiviFile(); return; }
    if (mode === 'image')  { extractFromImageFile(); return; }
    openBrandEditor(null);
  });
});

// From Divi export — read an uploaded Divi 5 export JSON and pull its palette.
function extractFromDiviFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    let doc;
    try { doc = JSON.parse(await file.text()); }
    catch { alert('That file is not valid JSON — pick a Divi export (.json).'); return; }

    openBrandEditor(null);
    if (!brandEditing) return;

    // Divi export shapes: global_colors as [{id,color,label}] or tuple [[id,{color}]].
    const gc = doc.global_colors || doc.variables?.global_colors || [];
    const colors = [];
    for (const c of gc) {
      if (Array.isArray(c) && c[1]?.color) colors.push({ role: c[1].label || c[0], hex: c[1].color, source: 'divi' });
      else if (c?.color)                   colors.push({ role: c.label || c.id || '', hex: c.color, source: 'divi' });
    }
    // Fallback: scrape unique hexes out of presets if no global colours.
    if (!colors.length) {
      [...new Set(JSON.stringify(doc.presets || {}).match(/#[0-9a-fA-F]{6}\b/g) || [])]
        .slice(0, 8).forEach((hex, i) => colors.push({ role: `color-${i + 1}`, hex, source: 'divi' }));
    }
    brandEditing.data.colors = colors;
    if (doc.variables) brandEditing.data.variables = doc.variables;     // keep for brand-deploy
    if (doc.presets)   brandEditing.data.presets   = { presets: doc.presets };
    brandEditing.name = brandEditing.name || file.name.replace(/\.json$/i, '');
    paintBrandEditor();
    renderBrandCanvas();
    if (!colors.length) alert('No colours found in that export — it may not contain global colours or presets.');
  };
  input.click();
}

// From image — sample a dominant palette client-side via canvas quantisation.
function extractFromImageFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      const W = 96, H = Math.max(1, Math.round(96 * img.height / img.width));
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      // Bucket colours into a coarse 3-bit-per-channel grid, average each bucket.
      const buckets = {};
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 128) continue; // skip transparent
        const key = (data[i] & 0xE0) << 16 | (data[i + 1] & 0xE0) << 8 | (data[i + 2] & 0xE0);
        const b = buckets[key] || (buckets[key] = { n: 0, r: 0, g: 0, b: 0 });
        b.n++; b.r += data[i]; b.g += data[i + 1]; b.b += data[i + 2];
      }
      const toHex = v => v.toString(16).padStart(2, '0');
      const colors = Object.values(buckets).sort((a, b) => b.n - a.n).slice(0, 6).map((b, i) => ({
        role: `color-${i + 1}`,
        hex: '#' + toHex(Math.round(b.r / b.n)) + toHex(Math.round(b.g / b.n)) + toHex(Math.round(b.b / b.n)),
        source: 'image',
      }));
      URL.revokeObjectURL(img.src);

      openBrandEditor(null);
      if (!brandEditing) return;
      brandEditing.data.colors = colors;
      brandEditing.name = brandEditing.name || file.name.replace(/\.[^.]+$/, '');
      paintBrandEditor();
      renderBrandCanvas();
    };
    img.onerror = () => alert('Could not read that image.');
    img.src = URL.createObjectURL(file);
  };
  input.click();
}
document.getElementById('brandEditorClose').addEventListener('click', closeBrandEditor);
document.getElementById('brandAddColor').addEventListener('click', () => addBrandColorRow());
document.getElementById('brandSave').addEventListener('click', saveBrandProfile);
document.getElementById('brandDelete').addEventListener('click', deleteBrandProfileUI);
// delegate remove-color clicks
document.getElementById('brandColors').addEventListener('click', e => {
  const btn = e.target.closest('[data-color-remove]');
  if (!btn) return;
  const i = parseInt(btn.dataset.colorRemove);
  if (brandEditing) {
    brandEditing.data.colors.splice(i, 1);
    renderBrandColorRows();
  }
});

// ─── Design Projects ──────────────────────────────────────────────────────────
async function loadDesignsList() {
  const wrap = document.getElementById('designsList');
  let designs;
  try {
    designs = await fetch('/designs').then(r => r.json());
  } catch {
    wrap.innerHTML = '<div class="empty">Could not load design projects.</div>';
    return;
  }
  if (!Array.isArray(designs) || designs.length === 0) {
    wrap.innerHTML = '<div class="empty">No design projects yet. They auto-form after your 2nd page sharing a brand + export.</div>';
    return;
  }
  wrap.innerHTML = designs.map(d => `
    <div class="design-card" data-design="${d.id}">
      <div class="design-card-head">
        <strong>${escapeHtml(d.name)}</strong>
        <span class="brand-card-src">${d.page_count || 0} page(s)</span>
      </div>
      <div class="brand-card-meta">${d.brand_name ? 'brand: ' + escapeHtml(d.brand_name) : 'no brand linked'} · created ${escapeHtml((d.created_at || '').split(' ')[0])}</div>
      <button type="button" class="btn-link design-expand" data-design-expand="${d.id}" style="font-size:0.75rem;color:var(--accent)">Show pages</button>
      <button type="button" class="btn-link design-use" data-design-use="${d.id}" style="font-size:0.75rem;color:var(--accent)">Use in chat</button>
      <button type="button" class="btn-link design-delete" data-design-delete="${d.id}" style="font-size:0.75rem;color:var(--danger)">Delete</button>
      <div class="design-pages" data-design-pages="${d.id}" hidden style="margin-top:6px;display:flex;flex-direction:column;gap:4px"></div>
    </div>`).join('');

  wrap.querySelectorAll('[data-design-expand]').forEach(btn => {
    btn.addEventListener('click', () => toggleDesignPages(parseInt(btn.dataset.designExpand)));
  });
  wrap.querySelectorAll('[data-design-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteDesign(parseInt(btn.dataset.designDelete)));
  });
  wrap.querySelectorAll('[data-design-use]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await setChatContext('designId', parseInt(btn.dataset.designUse));
      document.querySelector('.tab[data-tab=chat]').click();
    });
  });
}

async function toggleDesignPages(id) {
  const pages = document.querySelector(`[data-design-pages="${id}"]`);
  const btn = document.querySelector(`[data-design-expand="${id}"]`);
  if (!pages.hidden) { pages.hidden = true; btn.textContent = 'Show pages'; return; }
  const proj = await fetch(`/designs/${id}`).then(r => r.json());
  if (proj.error || !Array.isArray(proj.pages) || proj.pages.length === 0) {
    pages.innerHTML = '<span class="field-hint">No linked pages.</span>';
  } else {
    pages.innerHTML = proj.pages.map(p => `
      <div class="design-page-row">
        <span class="brand-card-src">${escapeHtml(p.page_type || 'page')}</span>
        <span>${escapeHtml(p.brand || '?')} · ${escapeHtml(p.keyword || '')}</span>
        <span class="field-hint">#${p.generation_id} ${escapeHtml(p.status || '')}</span>
      </div>`).join('');
  }
  pages.hidden = false;
  btn.textContent = 'Hide pages';
}

async function deleteDesign(id) {
  if (!confirm('Delete this design project? Linked generations are kept (unlinked).')) return;
  await fetch(`/designs/${id}?keepPages=true`, { method: 'DELETE' });
  await loadDesignsList();
}

// Fill the Brief form's brand-profile dropdown, preserving the current pick.
async function loadGenBrandOptions() {
  const sel = document.getElementById('genBrand');
  if (!sel) return;
  const keep = sel.value;
  try {
    const profiles = await fetch('/brand').then(r => r.json());
    sel.innerHTML = '<option value="">— none —</option>' +
      (profiles || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    if (keep) sel.value = keep;
  } catch {}
}

function openDesignModal() {
  // Prefill brand dropdown from current brand profiles.
  fetch('/brand').then(r => r.json()).then(profiles => {
    const sel = document.getElementById('designBrand');
    sel.innerHTML = '<option value="">— none —</option>' +
      (profiles || []).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    document.getElementById('designModal').hidden = false;
  });
}

document.getElementById('designNewBtn').addEventListener('click', openDesignModal);
document.getElementById('designModalClose').addEventListener('click', () => {
  document.getElementById('designModal').hidden = true;
});
document.getElementById('designCreate').addEventListener('click', async () => {
  const name = document.getElementById('designName').value.trim();
  if (!name) { alert('Name is required.'); return; }
  const brand_id = document.getElementById('designBrand').value || null;
  const notes = document.getElementById('designNotes').value.trim() || null;
  const res = await fetch('/designs', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, brand_id: brand_id ? parseInt(brand_id) : null, notes }),
  }).then(r => r.json());
  if (res.error) { alert(res.error); return; }
  document.getElementById('designName').value = '';
  document.getElementById('designNotes').value = '';
  document.getElementById('designModal').hidden = true;
  await loadDesignsList();
});
