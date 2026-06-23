'use strict';

// GEN_INTENT marker parser. The page-generator skill emits a single-line
// <!-- GEN_INTENT: {…} --> marker in chat mode; the server extracts the JSON
// to surface a confirm card, and strips it from the visible reply.

const RE = /<!--\s*GEN_INTENT:\s*(\{.*?\})\s*-->/s;

function extractIntent(text) {
  const m = text && String(text).match(RE);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function stripIntent(text) {
  if (!text) return '';
  return String(text).replace(RE, '').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { extractIntent, stripIntent };
