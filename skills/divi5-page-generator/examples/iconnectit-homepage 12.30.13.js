#!/usr/bin/env node
/**
 * iconnectit-homepage.js — iConnectIT homepage, "AI-forward agency" brand refresh.
 *
 * Replaces the earlier Noloco/portal-focused version with the current brand
 * direction: light sections, near-black headings, gray body copy, a single
 * Inter font family, and orange/amber as the sole accent colours. One dark
 * section (Process) plus a dark CTA/footer close the page.
 *
 * Built with the Phase-5 helpers: b.typeScale() b.headingPresets() b.buttonPresets()
 * Quality bar: passes scripts/validate.js AND scripts/taste-check.js (exit 0).
 * Run: node examples/iconnectit-homepage.js → writes iConnectITHomepage.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const D = require('../scripts/divi-builder');
process.env.DIVI5_SKIP_TASTE_GATE = '1';
const TOKENS = require('../references/Divi design system JSON/divi-design-system.tokens.js');

const b = D.createBuilder({ tokens: TOKENS });

// ─── brand palette ───────────────────────────────────────────────────────────
const ACCENT     = b.globalColor('accent',       '#F95E00', 'Accent Orange');
const ACCENT_700 = b.globalColor('dmtl913igj',   '#C44B00', 'Accent Orange 700'); // button hover
const AMBER      = b.globalColor('amber',        '#F9C22D', 'Amber Highlight');
const HEADING    = b.globalColor('heading',      '#1A1A1A', 'Heading Near-Black');
const BODY       = b.globalColor('body',         '#6B7280', 'Body Gray');
const BODY_LIGHT = b.globalColor('body-light',   '#9CA3AF', 'Body on Dark');
const BORDER     = b.globalColor('border',       '#E5E7EB', 'Border Light Gray');
const BG_ALT     = b.globalColor('bg-alt',       '#F8FAFC', 'Background Alt');
const DARK       = b.globalColor('dark',         '#0F0F0F', 'Section Dark');
b.globalColor('primary-color',   '#F95E00', 'Primary');
b.globalColor('secondary-color', '#1A1A1A', 'Secondary');

const WHITE = b.colorRef('White');
const FONT = 'Inter';

const ts       = b.typeScale();
const headings = b.headingPresets(ts);
const buttons  = b.buttonPresets({ hoverGcid: 'dmtl913igj' });

const pad = (top, bottom) => D.dv({ padding: { top, bottom: bottom || top, syncVertical: bottom && bottom !== top ? 'off' : 'on', syncHorizontal: 'off' } });

const P = {
  sectionWhite: b.preset('divi/section', 'Section - White', { module: { decoration: { background: D.dv({ color: WHITE }), spacing: pad('6em') } } }),
  sectionAlt:   b.preset('divi/section', 'Section - Alt',   { module: { decoration: { background: D.dv({ color: BG_ALT }), spacing: pad('5em') } } }),
  sectionStrip: b.preset('divi/section', 'Section - Strip', { module: { decoration: { background: D.dv({ color: BG_ALT }), spacing: pad('2.5em') } } }),
  sectionDark:  b.preset('divi/section', 'Section - Dark',  { module: { decoration: { background: D.dv({ color: DARK }),  spacing: pad('6em') } } }),

  bodyOnLight: b.preset('divi/text', 'Body - on light', { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT, size: '17px', lineHeight: '1.75em', color: BODY,       textAlign: 'left' }) } } } } }),
  bodyOnDark:  b.preset('divi/text', 'Body - on dark',  { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT, size: '17px', lineHeight: '1.75em', color: BODY_LIGHT, textAlign: 'left' }) } } } } }),
  numeral:     b.preset('divi/text', 'Step numeral',    { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT, size: '13px', weight: '700', lineHeight: '1.5em', color: ACCENT, letterSpacing: '2px', textAlign: 'left' }) } } } } }),
  footHead:    b.preset('divi/text', 'Footer heading',  { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT, size: '14px', weight: '700', lineHeight: '1.6em', color: WHITE, letterSpacing: '1px', textAlign: 'left' }) } } } } }),
  footLink:    b.preset('divi/text', 'Footer links',    { content: { decoration: { bodyFont: { body: { font: D.dv({ family: FONT, size: '15px', lineHeight: '2em', color: BODY_LIGHT, textAlign: 'left' }) } } } } }),
};

const H = (text, { level = 'h2', onDark = false, gp } = {}) => D.heading({
  text, level, gp,
  font: { family: FONT, weight: '700', color: onDark ? WHITE : HEADING, textAlign: 'left', lineHeight: '1.15em' },
});

// ─── SECTION 1 — Hero (white) ─────────────────────────────────────────────────
const hero = D.section({ adminLabel: 'Hero', preset: P.sectionWhite }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '800px' }, [
    D.column({}, [
      D.eyebrow('AI-FORWARD AGENCY', ACCENT, { textAlign: 'left' }),
      H('Build smarter. Connect faster. Scale effortlessly.', { level: 'h1', gp: headings.h1 }),
      D.text({
        html: '<p>We are a low-code and no-code AI agency that eliminates complexity and crafts intentional, scalable systems, so your team can focus on what matters.</p>',
        preset: P.bodyOnLight, maxWidth: '600px',
      }),
      D.button({ text: 'Start a project', url: '#contact', gp: buttons.primary }),
      D.button({ text: 'See our work', url: '#work', color: ACCENT, background: 'transparent' }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_3', columnGap: '16px', rowGap: '16px', maxWidth: '900px' }, [
    D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Projects delivered', number: 60, percent: true, numberColor: ACCENT }) ]),
    D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Faster than dev teams', number: 80, percent: true, numberColor: ACCENT }) ]),
    D.column({ flexType: '8_24' }, [ D.numberCounter({ title: 'Client retention', number: 100, percent: true, numberColor: ACCENT }) ]),
  ]),
]);

// ─── SECTION 2 — Tools strip ──────────────────────────────────────────────────
const toolsStrip = D.section({ adminLabel: 'Tools Strip', preset: P.sectionStrip }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1000px' }, [
    D.column({}, [
      D.text({ html: '<p>Built on the best no-code and AI platforms</p>', font: { family: FONT, size: '13px', weight: '700', color: BODY, letterSpacing: '2px', textAlign: 'center' } }),
      D.text({ html: '<p>Make &middot; n8n &middot; Airtable &middot; OpenAI &middot; Notion &middot; Zapier &middot; Webflow &middot; Bubble</p>', font: { family: FONT, size: '16px', weight: '600', color: HEADING, textAlign: 'center' } }),
    ]),
  ]),
]);

// ─── SECTION 3 — About ────────────────────────────────────────────────────────
const about = D.section({ adminLabel: 'About', preset: P.sectionWhite }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1100px', columnGap: '56px' }, [
    D.column({ flexType: '12_24' }, [
      D.eyebrow('ABOUT', ACCENT, { textAlign: 'left' }),
      H('We use AI to cut through complexity and build systems that work.', { level: 'h2', gp: headings.h2 }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.text({ html: '<p>iConnectIT was founded on a simple belief: powerful software should not require massive teams or multi-year timelines. Using the best low-code and no-code platforms combined with AI, we build intentional, scalable solutions in weeks, not months.</p>', preset: P.bodyOnLight, maxWidth: '520px' }),
      D.text({ html: '<p>From automating repetitive workflows to deploying intelligent AI agents, we connect the tools your business already loves, and make them work together seamlessly.</p>', preset: P.bodyOnLight, maxWidth: '520px' }),
    ]),
  ]),
]);

// ─── SECTION 4 — Services ─────────────────────────────────────────────────────
const services = D.section({ adminLabel: 'Services', preset: P.sectionAlt }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1100px', columnGap: '56px' }, [
    D.column({ flexType: '12_24' }, [
      D.eyebrow('SERVICES', ACCENT, { textAlign: 'left' }),
      H('Everything you need to move faster.', { level: 'h2', gp: headings.h2 }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.text({ html: '<p>We deliver end-to-end solutions, from strategy to deployment, using the best platforms available today.</p>', preset: P.bodyOnLight, maxWidth: '480px' }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_2', columnGap: '24px', rowGap: '24px', maxWidth: '1100px' }, [
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf085;', iconColor: ACCENT, title: 'AI Automation', body: '<p>Replace repetitive, manual processes with intelligent pipelines that learn, adapt, and scale, powered by the latest AI models.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf121;', iconColor: ACCENT, title: 'No-Code App Building', body: '<p>Full-featured web applications built without traditional code.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf0c1;', iconColor: ACCENT, title: 'System Integration', body: '<p>Connect your CRM, ERP, marketing tools, and databases into one seamless ecosystem, eliminating data silos and manual handoffs.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf304;', iconColor: ACCENT, title: 'AI Strategy and Consulting', body: '<p>We audit your current stack, identify the highest-impact opportunities, and deliver a prioritised roadmap.</p>' }),
    ]),
  ]),
]);

// ─── SECTION 5 — Process (dark) ──────────────────────────────────────────────
const processSection = D.section({ adminLabel: 'Process', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1100px', columnGap: '56px' }, [
    D.column({ flexType: '10_24' }, [
      D.eyebrow('PROCESS', ACCENT, { textAlign: 'left' }),
      H('Our process is simple, purposeful, and adaptable.', { level: 'h2', onDark: true, gp: headings.h2 }),
    ]),
    D.column({ flexType: '14_24' }, [
      D.text({ html: '<p>01</p>', preset: P.numeral }),
      H('Discover', { level: 'h3', onDark: true, gp: headings.h3 }),
      D.text({ html: '<p>We listen deeply to understand your goals, existing stack, pain points, and what success looks like for your team.</p>', preset: P.bodyOnDark }),
      D.text({ html: '<p>02</p>', preset: P.numeral }),
      H('Define', { level: 'h3', onDark: true, gp: headings.h3 }),
      D.text({ html: '<p>We map your workflow, select the right tools, and produce a clear spec, no surprises, no scope creep.</p>', preset: P.bodyOnDark }),
      D.text({ html: '<p>03</p>', preset: P.numeral }),
      H('Build', { level: 'h3', onDark: true, gp: headings.h3 }),
      D.text({ html: '<p>We construct your solution in sprints, with weekly demos so you are always in the loop and changes cost nothing.</p>', preset: P.bodyOnDark }),
      D.text({ html: '<p>04</p>', preset: P.numeral }),
      H('Deploy and Scale', { level: 'h3', onDark: true, gp: headings.h3 }),
      D.text({ html: '<p>We ship to production, train your team, and remain on hand as your solution evolves and grows with you.</p>', preset: P.bodyOnDark }),
    ]),
  ]),
]);

// ─── SECTION 6 — Work ──────────────────────────────────────────────────────────
const work = D.section({ adminLabel: 'Work', preset: P.sectionAlt }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '760px' }, [
    D.column({}, [
      D.eyebrow('WORK', ACCENT, { textAlign: 'left' }),
      H('Recent projects.', { level: 'h2', gp: headings.h2 }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_2', columnGap: '24px', rowGap: '24px', maxWidth: '1100px' }, [
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf201;', iconColor: ACCENT, title: 'Lead Qualification Engine', body: '<p>An AI pipeline that scores, enriches, and routes inbound leads, reducing SDR time by 70 percent for a B2B SaaS company.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf121;', iconColor: ACCENT, title: 'Client Onboarding Portal', body: '<p>Onboarding time cut from two weeks to 48 hours.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf0c1;', iconColor: ACCENT, title: 'Ops Data Hub', body: '<p>Connected HubSpot, Xero, and a custom Airtable base into a single source of truth, eliminating 15 hours of manual reporting per week.</p>' }),
    ]),
    D.column({ flexType: '12_24' }, [
      D.blurb({ icon: '&#xf304;', iconColor: ACCENT, title: 'AI Readiness Roadmap', body: '<p>A 90-day transformation plan for a 50-person professional services firm, identifying 400,000 dollars in annual automation savings.</p>' }),
    ]),
  ]),
]);

// ─── SECTION 7 — CTA (dark) ───────────────────────────────────────────────────
const cta = D.section({ adminLabel: 'CTA', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '720px' }, [
    D.column({}, [
      D.heading({ text: 'Ready to build something great?', level: 'h2', gp: headings.h2, font: { family: FONT, weight: '700', color: WHITE, textAlign: 'center', lineHeight: '1.15em' } }),
      D.text({ html: '<p>Tell us about your project and we will get back to you within 24 hours. No pressure, no jargon, just a real conversation.</p>', font: { family: FONT, size: '17px', lineHeight: '1.75em', color: BODY_LIGHT, textAlign: 'center' }, maxWidth: '560px', centered: true }),
      D.button({ text: 'hello@iconnectit.com', url: 'mailto:hello@iconnectit.com', color: WHITE, background: 'transparent' }),
    ]),
  ]),
]);

// ─── SECTION 8 — Footer (dark) ────────────────────────────────────────────────
const footer = D.section({ adminLabel: 'Footer', preset: P.sectionDark }, [
  D.row({ structure: 'equal-columns_4', columnGap: '32px', rowGap: '32px', maxWidth: '1100px' }, [
    D.column({ flexType: '9_24' }, [
      D.text({ html: '<p>iConnectIT</p>', font: { family: FONT, size: '20px', weight: '700', color: WHITE, textAlign: 'left' } }),
      D.text({ html: '<p>Low-code and no-code AI agency. We build systems that connect, automate, and scale.</p>', preset: P.footLink, maxWidth: '320px' }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Services</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="#services">AI Automation</a><br><a href="#services">No-Code Apps</a><br><a href="#services">System Integration</a><br><a href="#services">AI Strategy</a></p>', preset: P.footLink }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Company</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="#about">About</a><br><a href="#process">Process</a><br><a href="#work">Work</a><br><a href="#contact">Contact</a></p>', preset: P.footLink }),
    ]),
    D.column({ flexType: '5_24' }, [
      D.text({ html: '<p>Contact</p>', preset: P.footHead }),
      D.text({ html: '<p><a href="mailto:hello@iconnectit.com">hello@iconnectit.com</a><br><a href="#book">Book a call</a></p>', preset: P.footLink }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_1', maxWidth: '1100px' }, [
    D.column({}, [
      D.text({ html: '<p>&copy; 2026 iConnectIT. All rights reserved.</p>', font: { family: FONT, size: '14px', color: BODY_LIGHT, textAlign: 'left' } }),
    ]),
  ]),
]);

// ─── assemble ────────────────────────────────────────────────────────────────
const content = D.placeholder([hero, toolsStrip, about, services, processSection, work, cta, footer]);
const json = b.assemble({ context: 'et_builder', content, title: 'iConnectIT Homepage' });

const outFile = path.join(__dirname, 'iConnectITHomepage.json');
fs.writeFileSync(outFile, JSON.stringify(json));
console.log('Wrote ' + outFile);
