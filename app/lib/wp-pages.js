'use strict';

// Client helpers for the Divi Tools Importer plugin's page-management routes:
//   GET    /wp-json/divi-tools/v1/pages          → list DTI-imported pages
//   DELETE /wp-json/divi-tools/v1/pages/{slug}    → delete one by slug
//
// The plugin returns each page as { slug, title, status, modified, permalink,
// design_hint } (see plugin/divi-tools-importer/src/PagesLister.php). We pin
// that shape with tests/wp-pages-contract.test.js so the app's list UI can't
// silently drift from what the plugin actually sends.

// The fields the plugin's /pages list emits per page, in declaration order.
const PAGE_FIELDS = Object.freeze([
  'slug', 'title', 'status', 'modified', 'permalink', 'design_hint',
]);

// Plugin slug rule: /pages/(?P<slug>[a-z0-9-]+). Reject anything else before
// we build a request URL, so a bad slug fails fast instead of 404ing remotely.
const SLUG_RE = /^[a-z0-9-]+$/;

function isValidSlug(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

// Reduce a raw plugin page object to exactly the known fields, with safe
// defaults, so the rest of the app never reads an undefined key.
function normalizePage(raw) {
  const page = raw && typeof raw === 'object' ? raw : {};
  return {
    slug: page.slug || '',
    title: page.title || '(untitled)',
    status: page.status || 'unknown',
    modified: page.modified || null,
    permalink: page.permalink || null,
    design_hint: page.design_hint || null,
  };
}

function normalizePagesList(rawList) {
  return Array.isArray(rawList) ? rawList.map(normalizePage) : [];
}

module.exports = { PAGE_FIELDS, isValidSlug, normalizePage, normalizePagesList };
