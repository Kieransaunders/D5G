#!/usr/bin/env node
/**
 * spec-to-html.js — compile a page-spec to the Stage 2 preview HTML.
 *
 * specToHtml(spec) → html string
 * CLI:  node scripts/spec/spec-to-html.js page-spec.json > preview.html
 *
 * The preview's only job is letting a human judge rhythm, hierarchy, spacing
 * and colour (design decision 3): shared base stylesheet + thin per-aesthetic
 * override, semantic HTML from the shared walk, and NO motion — a section's
 * theatre preset renders as a visible text annotation, never a simulation.
 * Fidelity with the Divi JSON is by construction: both compilers consume
 * vocabulary.walkSections().
 */

'use strict';

const fs = require('fs');
const path = require('path');
const V = require('./vocabulary');

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function moduleHtml(m) {
  switch (m.kind) {
    case 'heroHeading': return `<h1 data-fid="hero-h1">${esc(m.text)}</h1>`;
    case 'heading': {
      const lvl = Number(String(m.level).replace(/^h/, '')) || 2;
      return `<h${lvl}>${esc(m.text)}</h${lvl}>`;
    }
    case 'text': return m.html ? m.html : `<p>${esc(m.text)}</p>`;
    case 'eyebrow': return `<p class="eyebrow">${esc(m.text)}</p>`;
    case 'button': return `<a class="btn" href="${esc(m.href || '#')}">${esc(m.text)}</a>`;
    case 'image': return `<img src="${esc(m.src || '')}" alt="${esc(m.alt || '')}">`;
    case 'blurb': {
      const lvl = Number(String(m.titleLevel || 'h3').replace(/^h/, '')) || 3;
      return `<div class="blurb"><h${lvl}>${esc(m.title)}</h${lvl}><p>${esc(m.body)}</p></div>`;
    }
    case 'icon': return `<span class="icon" aria-hidden="true">${esc(m.icon || '')}</span>`;
    case 'accordion':
      return `<div class="accordion">${(m.items || []).map(it =>
        `<details><summary>${esc(it.title)}</summary><p>${esc(it.body)}</p></details>`).join('')}</div>`;
    case 'numberCounter': return `<div class="counter"><strong>${esc(m.number)}</strong> ${esc(m.label || '')}</div>`;
    case 'divider': return '<hr>';
    case 'raw': return `<!-- raw builder module: ${esc(m.builder || 'unspecified')} (rendered at Divi preview stage) -->`;
    default: return `<!-- unknown module kind: ${esc(m.kind)} -->`;
  }
}

function specToHtml(spec) {
  const base = fs.readFileSync(path.join(__dirname, 'preview-base.css'), 'utf8');
  const aestheticFile = path.join(__dirname, 'aesthetics', `${spec.aesthetic || 'minimal-editorial'}.css`);
  const aesthetic = fs.existsSync(aestheticFile) ? fs.readFileSync(aestheticFile, 'utf8') : '';

  const walks = V.walkSections(spec);

  // Per-section grid rules for multi-column layouts (mirrors the JSON flexTypes,
  // so the visual-fidelity gate compares like with like).
  const gridRules = walks
    .filter(w => w.flexTypes.length > 1)
    .map(w => `.sec-${cssSafe(w.section.id)} .cols { grid-template-columns: ${V.gridTemplate(w.layout)}; }`)
    .join('\n');

  const sections = walks.map((w) => {
    const sid = cssSafe(w.section.id);
    const note = w.theatre ? `<div class="theatre-note">&#9889; ${esc(w.theatre)}</div>` : '';
    const colsHtml = w.columns
      .map(col => `<div class="col">${col.map(moduleHtml).join('\n')}</div>`)
      .join('\n');
    const body = w.flexTypes.length > 1 ? `<div class="cols">\n${colsHtml}\n</div>` : colsHtml;
    return `<section class="sec sec-${sid}" data-divi="section" data-layout="${esc(w.layout)}">\n<div class="sec-inner">\n${note}\n${body}\n</div>\n</section>`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc((spec.seo && spec.seo.title) || spec.slug || 'Preview')}</title>
<style>
${base}
${aesthetic}
${gridRules}
</style>
</head>
<body>
${sections}
</body>
</html>
`;
}

function cssSafe(id) {
  return String(id == null ? 'section' : id).toLowerCase().replace(/[^a-z0-9-]+/g, '-');
}

module.exports = { specToHtml };

// ─── CLI ─────────────────────────────────────────────────────────────────
if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error('Usage: node spec-to-html.js <page-spec.json>'); process.exit(1); }
  process.stdout.write(specToHtml(JSON.parse(fs.readFileSync(file, 'utf8'))));
}
