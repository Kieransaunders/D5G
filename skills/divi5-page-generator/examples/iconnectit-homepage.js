#!/usr/bin/env node
/**
 * iconnectit-homepage.js — Phase 5E rebuild of the iConnectIT homepage golden.
 *
 * Replaces the hand-authored examples/iConnectITHomepage.json (which failed
 * validate: phantom preset IDs, no h1, raw hex, em-dashes, "harness" AI-tell).
 *
 * Built with the Phase-5 helpers the roadmap calls for:
 *   b.typeScale()  b.spaceScale()  b.spacingPresets()  b.buttonPresets()  b.headingPresets()
 *
 * Quality bar: passes scripts/validate.js AND scripts/taste-check.js (exit 0).
 * Run: node examples/iconnectit-homepage.js  → writes iConnectITHomepage.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../scripts/divi-builder');
// Bundled demo only — has no brief, so it skips the creative gate. Real generators
// MUST NOT set this: produce <slug>.concept.json + <slug>.mockup.gate.json via
// scripts/gate.js instead (see SKILL.md "The creative gate").
process.env.DIVI5_SKIP_TASTE_GATE = '1';
const TOKENS = require('../references/Divi design system JSON/divi-design-system.tokens.js');

const b = D.createBuilder({ tokens: TOKENS });

// ─── brand palette ───────────────────────────────────────────────────────────
// iConnectIT brand colours (NOT in the ET design system) → registered as global
// colours so we reference variables, never raw hex, in text/font paths.
const ACCENT    = b.globalColor('accent',         '#F95E00', 'Accent Orange');
const ACCENT_700 = b.globalColor('dmtl913igj',    '#C44B00', 'Accent Orange 700'); // button hover
const DARK      = b.globalColor('dark',           '#0F0F0F', 'Brand Dark');
const BODY_DARK = b.globalColor('body-dark',      '#9CA3AF', 'Body on Dark');
const BODY      = b.globalColor('body',           '#4B5563', 'Body on Light');
const NUMERAL   = b.globalColor('numeral',        '#9CA3AF', 'Step Numeral');
// buttonPresets() defaults reference these gcid slugs — register matching colours
b.globalColor('primary-color',   '#F95E00', 'Primary');
b.globalColor('secondary-color', '#1F2937', 'Secondary Slate'); // dark so its white label stays WCAG-readable

// ET design-system colour references (resolved server-side by Divi)
const WHITE   = b.colorRef('White');
const GRAY_BG = b.colorRef('Background - Light Gray');

const FONT_HEAD = 'Plus Jakarta Sans';
const FONT_BODY = 'Source Sans 3';

// ─── Phase-5 design-system helpers ───────────────────────────────────────────
const ts       = b.typeScale();        // { h1, h2, h3, body } fluid font-size vars
const ss       = b.spaceScale();        // { l, m, s } fluid spacing vars
const spacing  = b.spacingPresets(ss);  // margin/padding group presets
const headings = b.headingPresets(ts);  // { h1, h2, h3 } font group presets (type scale)
const buttons  = b.buttonPresets({ hoverGcid: 'dmtl913igj' }); // { primary, secondary } button group presets (enable:'on')

// ─── module presets (sections, body, eyebrow) ────────────────────────────────
const pad = (top, bottom) => D.dv({ padding: { top, bottom: bottom || top, syncVertical: bottom && bottom !== top ? 'off' : 'on', syncHorizontal: 'off' } });

const P = {
  sectionDark:   b.preset('divi/section', 'Section - Dark',       { module: { decoration: { background: D.dv({ color: DARK }),    spacing: pad('6em') } } }),
  sectionWhite:  b.preset('divi/section', 'Section - White',      { module: { decoration: { background: D.dv({ color: WHITE }),   spacing: pad('6em') } } }),
  sectionGray:   b.preset('divi/section', 'Section - Light Gray', { module: { decoration: { background: D.dv({ color: GRAY_BG }), spacing: pad('5em') } } }),
  sectionStrip:  b.preset('divi/section', 'Section - Strip',      { module: { decoration: { background: D.dv({ color: GRAY_BG }), spacing: pad('2.5em') } } }),
  sectionAccent: b.preset('divi/section', 'Section - Accent',     { module: { decoration: { background: D.dv({ color: DARK }),    spacing: pad('6em') } } }),

  bodyOnDark:  b.preset('divi/text', 'Body - on dark',  { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT_BODY, size: '17px', lineHeight: '1.8em', color: BODY_DARK, textAlign: 'left' }) } } } } }),
  bodyOnLight: b.preset('divi/text', 'Body - on light', { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT_BODY, size: '17px', lineHeight: '1.8em', color: BODY,      textAlign: 'left' }) } } } } }),
  numeral:     b.preset('divi/text', 'Step numeral',    { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT_BODY, size: '13px', weight: '700', lineHeight: '1.5em', color: NUMERAL, letterSpacing: '2px', textAlign: 'left' }) } } } } }),
  footHead:    b.preset('divi/text', 'Footer heading',  { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT_HEAD, size: '14px', weight: '700', lineHeight: '1.6em', color: WHITE, letterSpacing: '1px', textAlign: 'left' }) } } } } }),
  footLink:    b.preset('divi/text', 'Footer links',    { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT_BODY, size: '15px', lineHeight: '2em', color: BODY_DARK, textAlign: 'left' }) } } } } }),
};

// heading() helper to apply the type-scale group preset + brand colour/family.
const H = (text, { level = 'h2', onDark = false, gp } = {}) => D.heading({
  text, level, gp,
  font: { family: FONT_HEAD, color: onDark ? WHITE : DARK, textAlign: 'left', lineHeight: '1.18em' },
});

// ─── SECTION 1 — Hero (dark) ─────────────────────────────────────────────────
const hero = D.section({ adminLabel: 'Hero', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1200px', columnGap: '48px' }, [
    D.column({ flexType: '13_24' }, [
      D.eyebrow('UK TECH CONSULTANCY', ACCENT, { textAlign: 'left' }),
      H('Portals and apps that connect your whole business.', { level: 'h1', onDark: true, gp: headings.h1 }),
      D.text({
        html: '<p>iConnectIT builds client portals, internal tools, and custom apps for UK SMEs. We work on Noloco, Airtable, and the automation platforms your team already uses, so you go live in weeks rather than quarters.</p>',
        preset: P.bodyOnDark, maxWidth: '520px',
      }),
      D.button({ text: 'Book a consultation', url: '#contact', gp: buttons.primary }),
      D.button({ text: 'See our work', url: '#work', color: WHITE, background: 'transparent' }),
    ]),
    D.column({ flexType: '11_24' }, [
      D.row({ structure: 'equal-columns_3', columnGap: '16px', rowGap: '16px' }, [
        D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Projects delivered', number: 50, numberColor: ACCENT }) ]),
        D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Weeks to first launch', number: 6, numberColor: ACCENT }) ]),
        D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Client retention', number: 90, percent: true, numberColor: ACCENT }) ]),
      ]),
    ]),
  ]),
]);

// ─── SECTION 2 — Tools strip (light gray) ────────────────────────────────────
const toolsStrip = D.section({ adminLabel: 'Tools Strip', preset: P.sectionStrip }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1000px' }, [
    D.column({}, [
      D.text({ html: '<p>Built on the tools your business already runs on</p>', font: { family: FONT_BODY, size: '13px', weight: '700', color: BODY, letterSpacing: '2px', textAlign: 'center' } }),
      D.text({ html: '<p>Noloco · Airtable · Make.com · n8n · React · Convex</p>', font: { family: FONT_HEAD, size: '20px', weight: '600', color: DARK, textAlign: 'center' } }),
    ]),
  ]),
]);

// ─── SECTION 3 — About (white) ───────────────────────────────────────────────
const about = D.section({ adminLabel: 'About', preset: P.sectionWhite }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1100px', columnGap: '56px' }, [
    D.column({ flexType: '12_24' }, [
      H('We build systems that connect, automate, and scale.', { level: 'h2', gp: headings.h2 }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.text({ html: '<p>Most small businesses run on a tangle of spreadsheets, inboxes, and disconnected apps. We replace that with one joined-up system: a portal your clients and team actually want to use, sat on data you trust, with the repetitive work automated away.</p>', preset: P.bodyOnLight, maxWidth: '520px' }),
      D.text({ html: '<p>When an off-the-shelf tool will not do, we build the real thing in React and Convex. Either way you get plain-English handover and a system you own.</p>', preset: P.bodyOnLight, maxWidth: '520px' }),
    ]),
  ]),
]);

// ─── SECTION 4 — Services (light gray) ───────────────────────────────────────
// Deliberately varied body lengths to avoid the "three equal cards" tell.
const services = D.section({ adminLabel: 'Services', preset: P.sectionGray }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '760px' }, [
    D.column({}, [
      H('Everything you need to move faster.', { level: 'h2', gp: headings.h2 }),
      D.text({ html: '<p>Strategy through to launch, delivered on platforms built for speed.</p>', preset: P.bodyOnLight }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_2', columnGap: '24px', rowGap: '24px', maxWidth: '1100px' }, [
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Client portals', body: '<p>Branded Noloco portals on your Airtable data. One place for clients and staff to track work, share files, raise requests, and see exactly where things stand, with permissions that keep the right people on the right records.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Automation', body: '<p>Make.com and n8n flows that quietly remove the manual steps eating your week.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Custom apps', body: '<p>When the no-code ceiling gets in the way, we build full applications in React and Convex with real-time data and an interface your team will use every day without being told to.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'AI where it earns its place', body: '<p>Practical AI wired into your workflows to triage, draft, and route, never bolted on for show.</p>' }),
    ]),
  ]),
]);

// ─── SECTION 5 — Process (white) ─────────────────────────────────────────────
const processSection = D.section({ adminLabel: 'Process', preset: P.sectionWhite }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1100px', columnGap: '56px' }, [
    D.column({ flexType: '10_24' }, [
      H('A simple, purposeful process.', { level: 'h2', gp: headings.h2 }),
      D.text({ html: '<p>Three focused phases. No mystery months.</p>', preset: P.bodyOnLight }),
    ]),
    D.column({ flexType: '14_24' }, [
      D.text({ html: '<p>01</p>', preset: P.numeral }),
      H('Discovery and data audit', { level: 'h3', gp: headings.h3 }),
      D.text({ html: '<p>We map your data, users, and the workflows that matter before a single screen gets designed.</p>', preset: P.bodyOnLight }),
      D.text({ html: '<p>02</p>', preset: P.numeral }),
      H('Build and automate', { level: 'h3', gp: headings.h3 }),
      D.text({ html: '<p>Your portal or app comes together on live data, with Make.com or n8n connected from day one.</p>', preset: P.bodyOnLight }),
      D.text({ html: '<p>03</p>', preset: P.numeral }),
      H('Launch and handover', { level: 'h3', gp: headings.h3 }),
      D.text({ html: '<p>Training, documentation, and a support window, so your team owns the system with confidence.</p>', preset: P.bodyOnLight }),
    ]),
  ]),
]);

// ─── SECTION 6 — Work (dark) ─────────────────────────────────────────────────
const work = D.section({ adminLabel: 'Work', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '760px' }, [
    D.column({}, [
      H('Recent projects.', { level: 'h2', onDark: true, gp: headings.h2 }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_2', columnGap: '24px', rowGap: '24px', maxWidth: '1100px' }, [
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Partner engagement portal', titleColor: WHITE, bodyColor: BODY_DARK, body: '<p>A portal for an education trust managing employer engagement across six schools, all on a single Airtable base, with role-based access for every partner organisation and a live view of activity per school.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Lead routing engine', titleColor: WHITE, bodyColor: BODY_DARK, body: '<p>Scores and assigns inbound enquiries automatically, cutting first-response time by two thirds.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Single source of truth', titleColor: WHITE, bodyColor: BODY_DARK, body: '<p>Connected HubSpot, Xero, and Airtable into one reconciled view, removing around 15 hours of manual reporting every month.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ title: 'Self-serve onboarding app', titleColor: WHITE, bodyColor: BODY_DARK, body: '<p>Replaced a brittle 12-step spreadsheet process with a self-serve portal that guides each new client through setup, chases its own missing information, and takes onboarding from two weeks down to two days.</p>' }),
    ]),
  ]),
]);

// ─── SECTION 7 — CTA (accent dark) ───────────────────────────────────────────
const cta = D.section({ adminLabel: 'CTA', preset: P.sectionAccent }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '720px' }, [
    D.column({}, [
      D.heading({ text: 'Ready to build something that lasts?', level: 'h2', gp: headings.h2, font: { family: FONT_HEAD, color: WHITE, textAlign: 'center', lineHeight: '1.18em' } }),
      D.text({ html: '<p>Tell us about your project and we will reply within one working day. No pressure, no jargon, just a straight conversation about what you need.</p>', font: { family: FONT_BODY, size: '17px', lineHeight: '1.8em', color: BODY_DARK, textAlign: 'center' }, maxWidth: '560px', centered: true }),
      D.button({ text: 'Start a conversation', url: '#contact', gp: buttons.primary }),
    ]),
  ]),
]);

// ─── SECTION 8 — Footer (dark) ───────────────────────────────────────────────
const footer = D.section({ adminLabel: 'Footer', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_4', columnGap: '32px', rowGap: '32px', maxWidth: '1100px' }, [
    D.column({ flexType: '9_24' }, [
      D.text({ html: '<p>iConnectIT</p>', font: { family: FONT_HEAD, size: '20px', weight: '700', color: WHITE, textAlign: 'left' } }),
      D.text({ html: '<p>UK tech consultancy. We build systems that connect, automate, and scale.</p>', preset: P.footLink, maxWidth: '320px' }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Services</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="#services">Client portals</a><br><a href="#services">Automation</a><br><a href="#services">Custom apps</a></p>', preset: P.footLink }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Company</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="#about">About</a><br><a href="#work">Work</a><br><a href="#contact">Contact</a></p>', preset: P.footLink }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Contact</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="mailto:hello@iconnectit.co.uk">hello@iconnectit.co.uk</a></p>', preset: P.footLink }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_1', maxWidth: '1100px' }, [
    D.column({}, [
      D.text({ html: '<p>© 2026 iConnectIT. All rights reserved. Built with no-code, powered by sense.</p>', font: { family: FONT_BODY, size: '14px', color: BODY_DARK, textAlign: 'left' } }),
    ]),
  ]),
]);

// ─── assemble ────────────────────────────────────────────────────────────────
const content = D.placeholder([hero, toolsStrip, about, services, processSection, work, cta, footer]);
// externalizeBrand:false — committed demo/validation fixture kept self-contained
// and inline; real generation externalizes the brand by default.
const json = b.assemble({ context: 'et_builder', content, title: 'iConnectIT Homepage', externalizeBrand: false });

const outFile = path.join(__dirname, 'iConnectITHomepage.json');
fs.writeFileSync(outFile, JSON.stringify(json));
console.log('Wrote ' + outFile);
