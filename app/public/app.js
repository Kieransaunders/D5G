'use strict';

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
      return `
        <div class="history-item" onclick="loadGeneration(${r.id})">
          <div>
            <div class="h-brand">${r.brand}</div>
            <div class="h-meta">${r.keyword} · ${r.sections.join(', ')}</div>
            <div class="h-meta">${r.created_at}</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            ${hasPreview ? `<button type="button" class="btn-view" onclick="viewMockup(${r.id}, event)" title="View mockup">View</button>` : ''}
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
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.tab;
    // Generic: hide every tab-<name> panel, show the chosen one.
    document.querySelectorAll('[id^="tab-"]').forEach(panel => {
      panel.hidden = panel.id !== `tab-${target}`;
    });
    if (target === 'brand') loadBrandGrid();
    if (target === 'designs') loadDesignsList();
  });
});

// Sync visible panel to whichever tab is marked active in the HTML on load
// (Chat is the default). Triggers the active tab's load hook too.
(function syncActiveTabOnLoad() {
  const active = document.querySelector('.tab.active');
  if (active) active.click();
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

function appendChatMsg(role, text) {
  const el = document.getElementById('chatMessages');
  const div = document.createElement('div');
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
  input.style.height = '72px';
  document.getElementById('chatSend').disabled = true;

  appendChatMsg('user', message);
  const replyEl = appendChatMsg('assistant', '…');
  let reply = '';

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
    reply = `Error: ${e.message}`;
    replyEl.textContent = reply;
  }

  chatHistory.push({ role: 'user', content: message });
  chatHistory.push({ role: 'assistant', content: reply });
  document.getElementById('chatSend').disabled = false;
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

// Append inline preview + file + import cards into the chat stream for a gen.
function appendGenerationCards(genId, files, hasPreview) {
  const el = document.getElementById('chatMessages');
  const wrap = document.createElement('div');
  wrap.className = 'gen-cards';
  wrap.style.alignSelf = 'stretch';

  if (hasPreview) {
    const preview = document.createElement('div');
    preview.className = 'gen-card gen-card-preview';
    preview.innerHTML = `
      <div class="gen-card-title">Preview · generation #${genId}</div>
      <iframe src="/preview-html/${genId}?t=${Date.now()}" sandbox="allow-same-origin allow-scripts" loading="lazy"></iframe>
      <div class="gen-card-actions">
        <button type="button" class="btn-link" data-drawer-open="${genId}">Open full</button>
      </div>`;
    wrap.appendChild(preview);
    preview.querySelector('[data-drawer-open]').addEventListener('click', () => openPreviewDrawer(genId));
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
    if (status) status.innerHTML = r.ok && r.permalink
      ? `✅ Imported — <a href="${r.permalink}" target="_blank">view</a>`
      : `⚠️ ${escapeHtml(r.error || 'import failed')}`;
  } catch (e) {
    if (status) status.textContent = `⚠️ ${e.message}`;
  }
  btn.disabled = false;
}

document.getElementById('chatSend').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
});
document.getElementById('chatClear').addEventListener('click', () => {
  chatHistory.length = 0;
  document.getElementById('chatMessages').innerHTML = '';
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
  el.textContent = 'Testing…';
  try {
    const data = await fetch('/test-connection').then(r => r.json());
    if (data.ok) {
      el.innerHTML = '<span class="style-pass">Connected successfully</span>';
    } else {
      el.innerHTML = `<span class="style-fail">Failed: ${data.error}</span>`;
    }
  } catch (err) {
    el.innerHTML = `<span class="style-fail">Error: ${err.message}</span>`;
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

// ─── HTML Preview panel ───────────────────────────────────────────────────────
function showHtmlPreview(genId) {
  const panel = document.getElementById('previewPanel');
  const frame = document.getElementById('previewFrame');
  if (!panel || !frame) return;
  frame.src = `/preview-html/${genId}?t=${Date.now()}`;
  panel.style.display = '';
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

// Mutable working copy of the profile currently open in the editor (null = closed).
let brandEditing = null;

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
}

function renderBrandCard(p) {
  const data = p.data || {};
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
      <button type="button" class="btn-link brand-card-edit" data-brand-edit="${p.id}">Edit</button>
    </div>`;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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
      brandEditing = { id: p.id, name: p.name, source_type: p.source_type || 'manual', data: p.data || emptyBrandData() };
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
  document.getElementById('brandHeadingFont').value = d.fonts?.heading?.family || '';
  document.getElementById('brandBodyFont').value = d.fonts?.body?.family || '';
  renderBrandColorRows();
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
      <input type="color" value="${c.hex}" data-color-hex="${i}">
      <input type="text" value="${escapeHtml(c.role || '')}" placeholder="role" data-color-role="${i}" style="flex:1">
      <span class="color-source">${escapeHtml(c.source || 'manual')}</span>
      <button type="button" class="btn-link color-remove" data-color-remove="${i}" style="color:var(--danger)">✕</button>
    </div>`).join('');
}

function addBrandColorRow(role = '', hex = '#6366f1', source = 'manual') {
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
    if (mode === 'url') { extractFromUrl(); return; }
    openBrandEditor(null);
  });
});
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
