'use strict';

// Builds the request body sent to the Divi Tools Importer plugin's
// POST /wp-json/divi-tools/v1/import endpoint.
//
// The plugin declares exactly these params (see
// plugin/divi-tools-importer/src/RestApi.php → /import route args):
//   layout  (object, required)
//   seo     (object, optional)
//   schema  (object, optional)
//   publish (boolean, optional, default false → draft)
//
// Anything else the app sends is silently ignored by WordPress. Keeping this
// builder as the single source of the payload — and pinning it with
// tests/import-contract.test.js — stops the app and plugin from drifting apart.

// The exact set of keys the plugin's /import endpoint understands.
const IMPORT_PARAMS = Object.freeze(['layout', 'seo', 'schema', 'publish']);

/**
 * @param {object}  opts
 * @param {object}  opts.layout   Divi layout JSON (required).
 * @param {object?} opts.seo      SEO meta object, or null/undefined.
 * @param {object?} opts.schema   Schema.org object, or null/undefined.
 * @param {boolean} [opts.publish=false]  Publish immediately instead of draft.
 * @returns {{layout: object, seo: object, schema: object, publish: boolean}}
 */
function buildImportPayload({ layout, seo, schema, publish = false } = {}) {
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
