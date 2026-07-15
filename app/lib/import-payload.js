'use strict';

// Builds the request body sent to the Divi5 Generator plugin's
// POST /wp-json/divi5-generator/v1/import endpoint.
//
// The plugin declares exactly these params (see
// plugin/divi5-generator/src/RestApi.php → /import route args):
//   layout  (object, required)
//   seo     (object, optional)
//   schema  (object, optional)
//   publish (boolean, optional)
//
// Plugin ≥ 1.5.4 defaults publish → true: imported pages go LIVE so they're
// screenshot-readable without a WP login (draft ?preview=true links 404
// headlessly). This builder matches that — publish defaults to true. Anything
// else the app sends is silently ignored by WordPress. Keeping this builder as
// the single source of the payload — and pinning it with
// tests/import-contract.test.js — stops the app and plugin from drifting apart.

// The exact set of keys the plugin's /import endpoint understands.
const IMPORT_PARAMS = Object.freeze(['layout', 'seo', 'schema', 'publish']);

/**
 * @param {object}  opts
 * @param {object}  opts.layout   Divi layout JSON (required).
 * @param {object?} opts.seo      SEO meta object, or null/undefined.
 * @param {object?} opts.schema   Schema.org object, or null/undefined.
 * @param {boolean} [opts.publish=true]  Publish immediately (default) vs draft.
 * @returns {{layout: object, seo: object, schema: object, publish: boolean}}
 */
function buildImportPayload({ layout, seo, schema, publish = true } = {}) {
  if (layout == null || typeof layout !== 'object') {
    throw new Error('buildImportPayload: layout is required and must be an object');
  }
  return {
    layout,
    seo: seo || {},
    schema: schema || {},
    publish: Boolean(publish),
  };
}

module.exports = { buildImportPayload, IMPORT_PARAMS };
