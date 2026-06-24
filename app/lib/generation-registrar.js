// generation-registrar.js — shared "a generation finished, register its outputs"
// post-processing, used by BOTH the legacy one-shot /generate pipeline and the
// in-chat agent build path (deliver_page tool).
//
// Keeps the success contract identical across the two paths: same JSON
// validation, same output_files rows + kind classification, same style-check,
// same preview-HTML persistence, same status semantics, same design-project
// promotion. Adding a third producer (the agent) must not drift from /generate.
//
// The legacy /generate path passes an SSE logger (sendSSE/appendLog) so its
// per-step diagnostics stream to the Brief tab. The agent path has no /stream
// channel of its own, so logger is optional and silently no-ops when absent.

'use strict';

const fs   = require('node:fs');
const path = require('node:path');

const { db, promoteIfEligible } = require('../db');

// Classify an output filename into the kind /import and /preview-html select on.
// Mirrors the substring rules in /generate's close handler (server.js:297-299).
function classifyKind(filename) {
  if (filename.includes('seo-meta')) return 'seo-meta';
  if (filename.includes('schema'))   return 'schema';
  if (filename.includes('landing-page') || filename.includes('-page')) return 'page';
  return 'other';
}

// Read every .json in the output dir and keep only the ones that parse.
// Returns { valid, skipped } so the caller can warn about malformed deliverables
// (the classic "HTML written into the .json" failure mode).
function readValidJsonOutputs(outputPath, logger) {
  const allJsonFiles = fs.readdirSync(outputPath).filter(f => f.endsWith('.json'));
  const valid = [];
  for (const f of allJsonFiles) {
    try {
      JSON.parse(fs.readFileSync(path.join(outputPath, f), 'utf8'));
      valid.push(f);
    } catch (_) {
      const warn = `\n⚠ Skipped ${f} — not valid JSON (likely an HTML file with wrong extension)\n`;
      logger?.log(warn);
      logger?.sendLog(warn);
    }
  }
  return valid;
}

// Determine whether a run actually produced an importable page. A landing-page
// file that's on disk but invalid is a hard fail; no landing-page AND no clone
// is also a fail. Same logic as server.js:325-331.
function assessPage(allJsonOnDisk, validJson) {
  const landingOnDisk = allJsonOnDisk.some(f => f.includes('landing-page'));
  const landingValid  = validJson.some(f => f.includes('landing-page'));
  const cloneValid    = validJson.some(f => f.includes('-base-page'));
  const brokenLanding = landingOnDisk && !landingValid;
  const pageProblem   = brokenLanding || (!landingValid && !cloneValid);
  return { landingValid, cloneValid, brokenLanding, pageProblem };
}

// Read the HTML preview file (preferring one named *preview*) from the output
// dir, returning the full HTML string (or null). Stored in DB so /preview-html
// survives an output-dir purge — see server.js:352-364 and /preview-html.
function readPreviewHtml(outputPath) {
  const htmlFiles = fs.readdirSync(outputPath).filter(f => f.endsWith('.html'));
  const previewFile = htmlFiles.find(f => f.includes('preview')) || htmlFiles[0];
  if (!previewFile) return { hasPreview: false, html: null };
  let html = null;
  try { html = fs.readFileSync(path.join(outputPath, previewFile), 'utf8'); }
  catch (_) {}
  return { hasPreview: !!html, html };
}

// Insert / dedupe the output_files rows for a generation. Returns the full row
// list (SELECT after insert) so callers can pass it straight to the UI.
function persistOutputFiles(genId, outputPath, validJson) {
  const insertFile = db.prepare(`INSERT INTO output_files (generation_id, filename, filepath, kind) VALUES (?, ?, ?, ?)`);
  for (const f of validJson) {
    const exists = db.prepare('SELECT id FROM output_files WHERE generation_id=? AND filename=?').get(genId, f);
    if (!exists) insertFile.run(genId, f, path.join(outputPath, f), classifyKind(f));
  }
  return db.prepare('SELECT * FROM output_files WHERE generation_id=?').all(genId);
}

/**
 * Register a completed generation's outputs and return the result summary.
 *
 * @param {object}   args
 * @param {number}   args.genId            - existing generations row id (status running)
 * @param {string}   args.outputPath       - dir the generator wrote into
 * @param {number}   args.exitCode         - producer process exit code (0 = ok)
 * @param {string|null} [args.exportPath]  - original Divi export, drives style-check
 * @param {object}   [args.logger]         - { sendLog(chunk), sendSSE(event,data), log(chunk) }
 * @returns {object} { status, styleCheck, files, hasPreview, pageProblem, designId }
 */
function registerGenerationFromDir({ genId, outputPath, exitCode, exportPath = null, logger = null }) {
  const sendLog  = (chunk) => { logger?.sendLog?.(chunk); logger?.log?.(chunk); };
  const sendSSE  = (event, data) => logger?.sendSSE?.(event, data);

  const allJsonFiles = fs.readdirSync(outputPath).filter(f => f.endsWith('.json'));
  const validJson    = readValidJsonOutputs(outputPath, logger);
  const outputFiles  = persistOutputFiles(genId, outputPath, validJson);

  // Style check — only when a designer export was supplied AND a page exists.
  let styleCheck = 'skipped';
  if (exportPath && validJson.some(f => f.includes('-page') || f.includes('landing'))) {
    const pageFile = validJson.find(f => f.includes('-page') || f.includes('landing'));
    if (pageFile) {
      try {
        const STYLE_CHECK = path.join(__dirname, '..', '..', 'skills', 'divi5-style-check', 'scripts', 'style-check.js');
        const { execSync } = require('node:child_process');
        const out = execSync(`node "${STYLE_CHECK}" "${exportPath}" "${path.join(outputPath, pageFile)}"`, { encoding: 'utf8' });
        styleCheck = 'consistent';
        const scLog = `\n--- STYLE CHECK ---\n${out}\n`;
        sendLog(scLog);
      } catch (e) {
        const report = [e.stdout, e.stderr].filter(Boolean).join('\n') || e.message;
        const crashed = !e.stdout && !e.stderr;
        styleCheck = crashed ? 'error' : 'inconsistent';
        sendLog(`\n--- STYLE CHECK ---\n${report}\n`);
      }
    }
  }

  const { landingValid, cloneValid, brokenLanding, pageProblem } = assessPage(allJsonFiles, validJson);
  if (pageProblem) {
    const warn = brokenLanding
      ? `\n⚠ The page JSON came out malformed (not valid JSON — likely HTML written into the .json). Re-run the generation.\n`
      : `\n⚠ Generation finished but produced no importable Divi page JSON. Re-run it.\n`;
    sendLog(warn);
  }

  const status = exitCode !== 0 ? 'failed' : (pageProblem ? 'no_page' : 'complete');
  db.prepare(`UPDATE generations SET status=?, style_check=? WHERE id=?`).run(status, styleCheck, genId);

  // Auto-promote to a Design Project when a sibling generation shares the same
  // brand + export_path (the "2nd page on one design system" heuristic).
  let designId = null;
  try {
    const newDesignId = promoteIfEligible(genId);
    if (newDesignId) {
      designId = newDesignId;
      sendLog(`\n--- DESIGN PROJECT ---\nPromoted to design project #${newDesignId}. See Designs tab.\n`);
      sendSSE('design_promoted', { designId: newDesignId });
    }
  } catch (_) {}

  const { hasPreview, html: previewHtml } = readPreviewHtml(outputPath);
  db.prepare(`UPDATE generations SET has_preview=?, preview_html=? WHERE id=?`).run(hasPreview ? 1 : 0, previewHtml, genId);

  return { status, styleCheck, files: outputFiles, hasPreview, pageProblem, designId };
}

module.exports = {
  registerGenerationFromDir,
  classifyKind,
  readValidJsonOutputs,
  assessPage,
  readPreviewHtml,
};
