'use strict';

// Contract test: the fields the app expects from the plugin's /pages list must
// match the fields the plugin actually emits. Reads PagesLister.php so the test
// fails the moment either side adds, renames, or drops a field.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const {
  PAGE_FIELDS, isValidSlug, normalizePage, normalizePagesList,
} = require('../lib/wp-pages');

const PAGES_LISTER_PHP = path.join(
  __dirname, '..', '..', 'plugin', 'divi-tools-importer', 'src', 'PagesLister.php'
);

// Pull the keys the plugin puts in each `$out[] = array( ... )` page entry.
function declaredPageFields() {
  const php = fs.readFileSync(PAGES_LISTER_PHP, 'utf8');
  const start = php.indexOf('$out[] = array(');
  assert.notEqual(start, -1, 'page array literal not found in PagesLister.php');
  const slice = php.slice(start, php.indexOf(');', start));
  const keys = [...slice.matchAll(/'(\w+)'\s*=>/g)].map(m => m[1]);
  assert.ok(keys.length > 0, 'could not parse declared page fields');
  return keys;
}

test('app PAGE_FIELDS match what the plugin emits per page', () => {
  const declared = declaredPageFields().sort();
  assert.deepEqual([...PAGE_FIELDS].sort(), declared,
    `app/plugin page fields drifted. plugin emits: ${declared.join(', ')}`);
});

test('normalizePage keeps only known fields with safe defaults', () => {
  const out = normalizePage({ slug: 'x', title: 'T', extra: 'nope' });
  assert.deepEqual(Object.keys(out).sort(), [...PAGE_FIELDS].sort());
  assert.equal('extra' in out, false);
  assert.equal(out.status, 'unknown'); // missing → default, never undefined
});

test('normalizePage tolerates junk input', () => {
  assert.equal(normalizePage(null).title, '(untitled)');
  assert.equal(normalizePage(undefined).slug, '');
});

test('normalizePagesList maps arrays and ignores non-arrays', () => {
  assert.deepEqual(normalizePagesList('nope'), []);
  assert.equal(normalizePagesList([{ slug: 'a' }, { slug: 'b' }]).length, 2);
});

test('isValidSlug matches the plugin route regex [a-z0-9-]+', () => {
  assert.equal(isValidSlug('my-page-1'), true);
  assert.equal(isValidSlug('Bad Slug'), false);
  assert.equal(isValidSlug('UPPER'), false);
  assert.equal(isValidSlug(''), false);
  assert.equal(isValidSlug('../etc'), false);
});
