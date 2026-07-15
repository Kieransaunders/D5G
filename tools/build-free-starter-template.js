#!/usr/bin/env node
/**
 * build-free-starter-template.js — PRIVATE repo tool. Not shipped in the free starter.
 *
 * Regenerates free-toolkit/skills/divi5-services-section/template/services-section.template.json
 * using the real divi-builder, with {{TOKEN}} placeholders where the free skill's
 * fill script substitutes user content. Run whenever divi-builder.js changes shape:
 *
 *   node tools/build-free-starter-template.js
 *
 * The free starter deliberately ships only the OUTPUT of this script (a static
 * template) plus a small fill script — never divi-builder.js itself.
 */

'use strict';

const fs = require('fs');
const path = require('path');

process.env.DIVI5_SKIP_TASTE_GATE = '1'; // one-off template build, no brief exists

const D = require('../skills/divi5-page-generator/scripts/divi-builder');

const b = D.createBuilder({});

// Brand colours arrive as tokens — the fill script swaps in validated hex values.
// Raw hex (not global colours) keeps the free section fully self-contained: no
// variables sidecar, no site registry, nothing to break on a manual VB import.
const accentVar = '{{ACCENT_HEX}}';
const darkVar = '{{DARK_HEX}}';
const BODY = '#555555';

const WATERMARK_HTML =
  '<p>Section created with the free <a href="https://iconnectit.co.uk">D5G Starter for Divi 5</a></p>';

const serviceBlurb = (n) =>
  D.blurb({
    icon: `{{SERVICE_${n}_ICON}}`,
    iconColor: accentVar,
    title: `{{SERVICE_${n}_TITLE}}`,
    titleLevel: 'h3',
    titleColor: darkVar,
    body: `<p>{{SERVICE_${n}_BODY}}</p>`,
    bodyColor: BODY,
  });

const servicesSection = D.section(
  {
    adminLabel: 'Services - D5G Free Starter',
    bgColor: '{{SECTION_BG_HEX}}',
    padding: { top: '6em', bottom: '6em' },
    phonePadding: { top: '4em', bottom: '4em' },
  },
  [
    D.row({ structure: 'equal-columns_1', maxWidth: '760px' }, [
      D.column({}, [
        D.eyebrow('{{EYEBROW}}', accentVar, { textAlign: 'center' }),
        D.heading({
          text: '{{HEADLINE}}',
          level: 'h2',
          font: { size: '38px', phoneSize: '28px', weight: '700', lineHeight: '1.25em', color: darkVar, textAlign: 'center' },
        }),
        D.text({
          html: '<p>{{INTRO}}</p>',
          font: { size: '17px', lineHeight: '1.8em', color: BODY, textAlign: 'center' },
          maxWidth: '640px',
          centered: true,
        }),
      ]),
    ]),
    D.row({ structure: 'equal-columns_3', columnGap: '32px', rowGap: '32px', maxWidth: '1200px' }, [
      D.column({ flexType: '8_24' }, [serviceBlurb(1)]),
      D.column({ flexType: '8_24' }, [serviceBlurb(2)]),
      D.column({ flexType: '8_24' }, [serviceBlurb(3)]),
    ]),
    D.row({ structure: 'equal-columns_1', maxWidth: '760px' }, [
      D.column({}, [
        D.button({
          text: '{{CTA_TEXT}}',
          url: '{{CTA_URL}}',
          background: accentVar,
          color: '#FFFFFF',
          radius: '8px',
        }),
        D.text({
          html: WATERMARK_HTML,
          font: { size: '12px', lineHeight: '1.6em', color: '#767676', textAlign: 'center' },
        }),
      ]),
    ]),
  ]
);

const content = D.placeholder([servicesSection]);
const json = b.assemble({
  context: 'et_builder_layouts',
  content,
  title: '{{LAYOUT_TITLE}}',
  slug: 'd5g-services-section',
});

// Provenance watermark (belt and braces alongside the visible credit module).
json._d5g = {
  generator: 'd5g-free-starter',
  template: 'services-section',
  templateVersion: '1.0.0',
  builderVersion: D.BUILDER_VERSION,
  upgrade: 'https://iconnectit.co.uk',
};

const out = path.join(
  __dirname,
  '../free-toolkit/skills/divi5-services-section/template/services-section.template.json'
);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(json, null, 2) + '\n');
console.log('Wrote ' + out);
