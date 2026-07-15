#!/usr/bin/env node
/**
 * timeline.test.js — timeline() helper produces valid, importable structure.
 *
 * Shape assertions mirror the payload that was live-verified against
 * Divi 5.8.1 via the Divi Tools Importer on 04/07/2026 (page timeline-schema-test).
 *
 * Run: node scripts/__tests__/timeline.test.js
 */

'use strict';

const assert = require('node:assert');
const path = require('path');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');

const SCRIPTS = path.resolve(__dirname, '..');
const b = require(path.join(SCRIPTS, 'divi-builder.js'));

let failures = 0;
function t(name, fn) {
  try { fn(); console.log(`  PASS  ${name}`); }
  catch (e) { failures++; console.log(`  FAIL  ${name}: ${e.message}`); }
}

const items = [
  { title: 'Divi 5.0 launch', date: '26/02/2026', body: '<p>Architecture overhaul.</p>' },
  { title: 'Divi 5.6', date: '25/05/2026', body: '<p>Five new modules.</p>', adminLabel: 'Timeline - 5.6' },
];

t('timeline() emits parent block with matched close tag', () => {
  const out = b.timeline(items);
  assert.match(out, /^<!-- wp:divi\/timeline /);
  assert.match(out, /<!-- \/wp:divi\/timeline -->$/);
});

t('one self-closing timeline-item per input item', () => {
  const out = b.timeline(items);
  const count = (out.match(/<!-- wp:divi\/timeline-item /g) || []).length;
  assert.strictEqual(count, items.length);
  assert.strictEqual((out.match(/\/-->/g) || []).length, items.length);
});

t('items carry verified schema paths (title/date/content innerContent, desktop envelope)', () => {
  const out = b.timeline(items);
  const first = out.split('\r\n').find((l) => l.includes('wp:divi/timeline-item'));
  const attrs = JSON.parse(first.replace('<!-- wp:divi/timeline-item ', '').replace(' /-->', ''));
  assert.strictEqual(attrs.title.innerContent.desktop.value, 'Divi 5.0 launch');
  assert.strictEqual(attrs.date.innerContent.desktop.value, '26/02/2026');
  assert.strictEqual(attrs.content.innerContent.desktop.value, '<p>Architecture overhaul.</p>');
});

t('adminLabel lands at module.meta.adminLabel when given', () => {
  const out = b.timeline(items);
  assert.match(out, /"adminLabel":\{"desktop":\{"value":"Timeline - 5.6"\}\}/);
});

t('date omitted → no date attribute (prune)', () => {
  const out = b.timeline([{ title: 'X', body: '<p>y</p>' }]);
  assert.ok(!out.includes('"date"'));
});

t('full page through validate.js: 0 errors (incl. timeline→timeline-item nesting rule)', () => {
  const content = b.placeholder([
    b.section({ adminLabel: 'Timeline Section' }, [
      b.row({}, [
        b.column({}, [
          b.heading({ level: 'h1', text: 'Timeline Helper Test' }),
          b.timeline(items),
        ]),
      ]),
    ]),
  ]);
  const layout = { context: 'et_builder', data: { 1: content } };
  const tmp = path.join(os.tmpdir(), `timeline-test-${Date.now()}.json`);
  fs.writeFileSync(tmp, JSON.stringify(layout));
  const res = spawnSync('node', [path.join(SCRIPTS, 'validate.js'), tmp], { encoding: 'utf8' });
  fs.unlinkSync(tmp);
  assert.strictEqual(res.status, 0, `validate.js exit ${res.status}\n${res.stdout}${res.stderr}`);
});

console.log(failures ? `\n${failures} failure(s)` : '\nall timeline tests passed');
process.exit(failures ? 1 : 0);
