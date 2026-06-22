#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');
const D    = require('/Users/boss/.claude/plugins/cache/iconnectit-claude-plugins/divi5-tools/0.5.0/skills/landing-page/scripts/divi-builder.js');

// ── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  coral: '#f0552d', ink: '#13110e', paper: '#fbfaf7',
  white: '#ffffff', muted: '#6b665d', line: '#e9e5dd',
  head: 'Space Grotesk', body: 'Inter',
};
const HERO_IMG = 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80';

// ── Builder ──────────────────────────────────────────────────────────────────
const b = D.createBuilder();
b.globalColor('coral', T.coral, 'Coral Accent');
b.globalColor('ink',   T.ink,   'Ink');
b.globalColor('paper', T.paper, 'Paper');
b.globalColor('muted', T.muted, 'Muted Text');
b.globalColor('white', T.white, 'White');

// ── Presets ──────────────────────────────────────────────────────────────────
// Section backgrounds use raw hex — variable refs produce no CSS in Divi's preset generator
const P = {
  secPaper: b.preset('divi/section', 'Section - Paper', {
    module: { decoration: { background: D.dv({ color: T.paper }), spacing: D.dv({ padding: { top: '80px', bottom: '80px', syncVertical: 'on', syncHorizontal: 'off' } }) } },
  }),
  secWhite: b.preset('divi/section', 'Section - White', {
    module: { decoration: { background: D.dv({ color: T.white }), spacing: D.dv({ padding: { top: '80px', bottom: '96px', syncVertical: 'off', syncHorizontal: 'off' } }) } },
  }),
  secCoral: b.preset('divi/section', 'Section - Coral', {
    module: { decoration: { background: D.dv({ color: T.coral }), spacing: D.dv({ padding: { top: '52px', bottom: '52px', syncVertical: 'on', syncHorizontal: 'off' } }) } },
  }),
  secInk: b.preset('divi/section', 'Section - Ink', {
    module: { decoration: { background: D.dv({ color: T.ink }), spacing: D.dv({ padding: { top: '88px', bottom: '88px', syncVertical: 'on', syncHorizontal: 'off' } }) } },
  }),

  h1Hero: b.preset('divi/heading', 'H1 Hero', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h1', family: T.head, size: '56px', weight: '700', lineHeight: '1.05em', color: T.ink, textAlign: 'left', letterSpacing: '-0.02em' },
      { phone: { size: '34px' } },
    ) } } },
  }),
  h2Section: b.preset('divi/heading', 'H2 Section', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h2', family: T.head, size: '38px', weight: '700', lineHeight: '1.15em', color: T.ink, textAlign: 'left', letterSpacing: '-0.02em' },
      { phone: { size: '26px' } },
    ) } } },
  }),
  h2Light: b.preset('divi/heading', 'H2 Section Light', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h2', family: T.head, size: '40px', weight: '700', lineHeight: '1.1em', color: T.white, textAlign: 'left', letterSpacing: '-0.02em' },
      { phone: { size: '26px' } },
    ) } } },
  }),
  h3Card: b.preset('divi/heading', 'H3 Card', {
    title: { decoration: { font: { font: D.dv(
      { headingLevel: 'h3', family: T.head, size: '20px', weight: '600', lineHeight: '1.3em', color: T.ink, textAlign: 'left' },
    ) } } },
  }),
  eyebrow: b.preset('divi/text', 'Eyebrow', {
    content: { decoration: { bodyFont: { body: { font: D.dv(
      { family: T.head, size: '12px', weight: '600', lineHeight: '1em', color: T.coral, textAlign: 'left', letterSpacing: '0.1em' },
    ) } } } },
  }),
  bodyLight: b.preset('divi/text', 'Body Light', {
    content: { decoration: { bodyFont: { body: { font: D.dv(
      { family: T.body, size: '17px', lineHeight: '1.8em', color: T.muted, textAlign: 'left' },
    ) } } } },
  }),
  bodyDark: b.preset('divi/text', 'Body Dark', {
    content: { decoration: { bodyFont: { body: { font: D.dv(
      { family: T.body, size: '17px', lineHeight: '1.8em', color: 'rgba(255,255,255,0.65)', textAlign: 'left' },
    ) } } } },
  }),
  footerText: b.preset('divi/text', 'Footer Text', {
    content: { decoration: { bodyFont: { body: { font: D.dv(
      { family: T.body, size: '14px', lineHeight: '1.6em', color: T.muted, textAlign: 'center' },
    ) } } } },
  }),
  statNumInk: b.preset('divi/number-counter', 'Stat Num Ink', {
    number: { decoration: { font: { font: D.dv({ family: T.head, size: '36px', weight: '700', color: T.ink }) } } },
    title:  { decoration: { font: { font: D.dv({ family: T.body, size: '13px', weight: '400', color: T.muted }) } } },
  }),
  statNumWhite: b.preset('divi/number-counter', 'Stat Num White', {
    number: { decoration: { font: { font: D.dv({ family: T.head, size: '52px', weight: '700', color: T.white, letterSpacing: '-0.02em' }) } } },
    title:  { decoration: { font: { font: D.dv({ family: T.body, size: '13px', weight: '500', color: 'rgba(255,255,255,0.85)', letterSpacing: '0.06em' }) } } },
  }),
  // button: D.dv({ enable: 'on' }) is the critical flag — without it Divi ignores all custom button styles
  btnPrimary: b.preset('divi/button', 'Button - Primary', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.body, size: '15px', color: b.colorVar('white'), weight: '600' }) },
      background: D.dv({ color: T.coral }),  // raw hex — variable refs produce no CSS in presets
      spacing:    D.dv({ padding: { top: '14px', bottom: '14px', left: '28px', right: '28px', syncVertical: 'on', syncHorizontal: 'on' } }),
      border:     D.dv({ radius: { topLeft: '6px', topRight: '6px', bottomLeft: '6px', bottomRight: '6px', sync: 'on' } }),
    }},
  }),
  btnGhost: b.preset('divi/button', 'Button - Ghost', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.body, size: '15px', color: T.ink, weight: '500' }) },
      background: D.dv({ color: 'transparent' }),
      spacing:    D.dv({ padding: { top: '14px', bottom: '14px', left: '28px', right: '28px', syncVertical: 'on', syncHorizontal: 'on' } }),
      border: { desktop: { value: { styles: { all: 'solid' }, widths: { all: '1.5px' }, colors: { all: T.line }, radius: { topLeft: '6px', topRight: '6px', bottomLeft: '6px', bottomRight: '6px', sync: 'on' } } } },
    }},
  }),
  btnCoralLg: b.preset('divi/button', 'Button - Coral Large', {
    button: { decoration: {
      button:     D.dv({ enable: 'on' }),
      font:       { font: D.dv({ family: T.head, size: '16px', color: b.colorVar('white'), weight: '600' }) },
      background: D.dv({ color: T.coral }),  // raw hex
      spacing:    D.dv({ padding: { top: '16px', bottom: '16px', left: '32px', right: '32px', syncVertical: 'on', syncHorizontal: 'on' } }),
      border:     D.dv({ radius: { topLeft: '6px', topRight: '6px', bottomLeft: '6px', bottomRight: '6px', sync: 'on' } }),
    }},
  }),
};

// ── Helpers ──────────────────────────────────────────────────────────────────
// null children = self-closing block (<!-- wp:divi/code ... /-->)
const codeBlock = (html) => D.code(html);

// Coral top-border divider above each step card
const coralDivider = () => D.block('divider', {
  divider: { advanced: { line: D.dv({ show: 'on', color: T.coral, weight: '2px', style: 'solid' }) } },
  module:  { decoration: { spacing: D.dv({ padding: { bottom: '24px', top: '0px', syncVertical: 'off', syncHorizontal: 'off' } }) } },
}, null);

// Step number preset (large, light-grey decorative number)
const stepNumPreset = (n) => b.preset('divi/number-counter', `Step Num ${n}`, {
  number: { decoration: { font: { font: D.dv({ family: T.head, size: '52px', weight: '700', color: T.line }) } } },
  title:  { decoration: { font: { font: D.dv({ size: '0px' }) } } }, // hide title label
});

// ── HERO ─────────────────────────────────────────────────────────────────────
const hero = D.section({ adminLabel: 'Hero', preset: P.secPaper }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1200px', columnGap: '80px' }, [
    D.column({ flexType: '13_24', phoneFlex: '24_24' }, [
      D.text({ html: '<p>READING AND THE WEST COUNTRY</p>', preset: P.eyebrow }),
      D.heading({ text: 'Adopt a rescue dog Devon - find your new best friend', level: 'h1', preset: P.h1Hero }),
      D.text({
        html: '<p>Ready to adopt a rescue dog Devon families love? Every animal here is looked after by our volunteer fosterers and ready for a loving home. Browse who\'s waiting today, updated live from Airtable.</p>',
        preset: P.bodyLight, maxWidth: '460px',
      }),
      D.row({ structure: 'equal-columns_2', maxWidth: '460px', columnGap: '16px' }, [
        D.column({ flexType: '12_24', phoneFlex: '24_24' }, [
          D.button({ text: 'Browse all pets',    url: '#airloop-grid',  preset: P.btnPrimary, color: b.colorVar('white'), background: T.coral }),
        ]),
        D.column({ flexType: '12_24', phoneFlex: '24_24' }, [
          D.button({ text: 'How adoption works', url: '#how-it-works', preset: P.btnGhost,   color: T.ink,   background: 'transparent' }),
        ]),
      ]),
      D.divider({ show: true }),
      D.row({ structure: 'equal-columns_3', maxWidth: '380px', columnGap: '0px' }, [
        D.column({ flexType: '8_24', phoneFlex: '8_24' }, [
          D.numberCounter({ number: '6',   title: 'Pets in our care', preset: P.statNumInk }),
        ]),
        D.column({ flexType: '8_24', phoneFlex: '8_24' }, [
          D.numberCounter({ number: '4',   title: 'Towns covered',    preset: P.statNumInk }),
        ]),
        D.column({ flexType: '8_24', phoneFlex: '8_24' }, [
          D.numberCounter({ number: '100', title: 'Health checked',   preset: P.statNumInk, percent: true }),
        ]),
      ]),
    ]),
    D.column({ flexType: '11_24', phoneFlex: '24_24' }, [
      D.image({ src: HERO_IMG, alt: 'Golden retriever sitting in a garden, looking at the camera' }),
    ]),
  ]),
]);

// ── STATS BAND ───────────────────────────────────────────────────────────────
const statsBand = D.section({ adminLabel: 'Stats Band', preset: P.secCoral }, [
  D.row({ structure: 'equal-columns_3', maxWidth: '900px', columnGap: '32px' }, [
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      D.numberCounter({ number: '6',   title: 'PETS IN OUR CARE', preset: P.statNumWhite }),
    ]),
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      D.numberCounter({ number: '4',   title: 'TOWNS COVERED',    preset: P.statNumWhite }),
    ]),
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      D.numberCounter({ number: '100', title: 'HEALTH CHECKED',   preset: P.statNumWhite, percent: true }),
    ]),
  ]),
]);

// ── DIRECTORY ────────────────────────────────────────────────────────────────
const directory = D.section({ adminLabel: 'Directory', preset: P.secWhite }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.heading({ text: 'Adopt a rescue dog Devon - meet the animals', level: 'h2', preset: P.h2Section }),
      D.text({
        html: '<p>Pulled live from the rescue database, no manual updates needed. Every listing you see is real-time from Airtable.</p>',
        preset: P.bodyLight, maxWidth: '560px',
      }),
      codeBlock("<div id='airloop-grid'>[airloop_display id='__AIRLOOP_DISPLAY_ID__']</div>"),
    ]),
  ]),
]);

// ── HOW IT WORKS ─────────────────────────────────────────────────────────────
const howItWorks = D.section({ adminLabel: 'How It Works', preset: P.secPaper }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.heading({ text: 'How adoption works', level: 'h2', preset: P.h2Section }),
      D.text({ html: '<p>Three simple steps stand between you and a new companion. We handle the rest.</p>', preset: P.bodyLight, maxWidth: '520px' }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_3', maxWidth: '1200px', columnGap: '40px' }, [
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      coralDivider(),
      D.numberCounter({ number: '1', preset: stepNumPreset(1) }),
      D.heading({ text: 'Fill in a short form', level: 'h3', preset: P.h3Card }),
      D.text({ html: '<p>Tell us about your home, lifestyle and the kind of animal you are looking for. Takes about two minutes.</p>', preset: P.bodyLight }),
    ]),
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      coralDivider(),
      D.numberCounter({ number: '2', preset: stepNumPreset(2) }),
      D.heading({ text: 'Meet your match', level: 'h3', preset: P.h3Card }),
      D.text({ html: '<p>We will introduce you to the animals that fit your situation. You can visit at a foster home or arrange a video call first.</p>', preset: P.bodyLight }),
    ]),
    D.column({ flexType: '8_24', phoneFlex: '24_24' }, [
      coralDivider(),
      D.numberCounter({ number: '3', preset: stepNumPreset(3) }),
      D.heading({ text: 'Bring them home', level: 'h3', preset: P.h3Card }),
      D.text({ html: '<p>Once you are both happy, we complete the adoption paperwork and hand over everything you need for a smooth first week.</p>', preset: P.bodyLight }),
    ]),
  ]),
]);

// ── CTA BAND ─────────────────────────────────────────────────────────────────
const ctaBand = D.section({ adminLabel: 'CTA Band', preset: P.secInk }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', maxWidth: '1200px', columnGap: '80px' }, [
    D.column({ flexType: '15_24', phoneFlex: '24_24' }, [
      D.heading({ text: 'Could you give one of them a home?', level: 'h2', preset: P.h2Light }),
      D.text({ html: '<p>Start an adoption enquiry in two minutes. We will match you with the right companion and guide you through every step.</p>', preset: P.bodyDark }),
    ]),
    D.column({ flexType: '9_24', phoneFlex: '24_24' }, [
      D.button({ text: 'Start an enquiry', url: '#contact', preset: P.btnCoralLg, color: b.colorVar('white'), background: T.coral }),
    ]),
  ]),
]);

// ── FOOTER ───────────────────────────────────────────────────────────────────
const footer = D.section({ adminLabel: 'Footer', preset: P.secPaper }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.text({ html: '<p>Westcountry Pet Rescue - Demo data, live from Airtable</p>', preset: P.footerText }),
      D.text({ html: '<p>Powered by Airloop</p>', preset: P.footerText }),
    ]),
  ]),
]);

// ── Assemble + write ──────────────────────────────────────────────────────────
const content = D.placeholder([hero, statsBand, directory, howItWorks, ctaBand, footer]);
const json    = b.assemble({ context: 'et_builder', content, title: 'Westcountry Pet Rescue - Demo Page' });

fs.writeFileSync(path.join(__dirname, 'pet-rescue-landing-page.json'), JSON.stringify(json, null, 2));
fs.writeFileSync(path.join(__dirname, 'pet-rescue-seo-meta.json'), JSON.stringify({
  keyword:     'adopt a rescue dog Devon',
  title:       'Adopt a Rescue Dog Devon | Westcountry Pet Rescue',
  description: 'Find your perfect rescue dog in Devon and the West Country. Browse animals available for adoption, updated live from Airtable. Start your enquiry today.',
  slug:        'adopt-rescue-dog-devon',
}, null, 2));

console.log('Wrote pet-rescue-landing-page.json + pet-rescue-seo-meta.json');
