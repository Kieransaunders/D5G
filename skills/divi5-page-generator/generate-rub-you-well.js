#!/usr/bin/env node
/**
 * generate-rub-you-well.js — Rub You Well massage shop, Frome High Street.
 * Vapor Clinic aesthetic: warm cream, blush terracotta, frosted glass cards.
 * Sections: Hero · Strip · Treatments · FAQ · CTA Band · Footer
 *
 * Preset-first workflow: presets are already registered on the site.
 * Run generate-rub-you-well-presets.js first if rub-you-well-registry.json is missing.
 *
 * Run: node generate-rub-you-well.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const D    = require('./scripts/divi-builder.js');

// ── 1. Design tokens ──────────────────────────────────────────────────────────
const T = {
  accent: '#c9715a',
  serif:  'DM Serif Display',
  sans:   'DM Sans',
};

// ── 2. Load preset registry ───────────────────────────────────────────────────
const REGISTRY_FILE = path.join(__dirname, 'rub-you-well-registry.json');
if (!fs.existsSync(REGISTRY_FILE)) {
  console.error('Missing rub-you-well-registry.json — run: DTI_KEY=xxx node generate-rub-you-well-presets.js');
  process.exit(1);
}
const TOKENS = require('./references/Divi design system JSON/divi-design-system.tokens.js');
const b = D.createBuilder({ tokens: TOKENS });
b.loadPresetRegistry(JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf8')));

// Shorthand: look up RYW brand presets by name
const ref = (mod, name) => b.presetRef(`divi/${mod}`, `RYW ${name}`);

const P = {
  secCream:   ref('section', 'Section – Cream'),
  secCream2:  ref('section', 'Section – Cream 2'),
  secAccent:  ref('section', 'Section – Accent'),
  secInk:     ref('section', 'Section – Ink'),
  heroH1:     ref('heading', 'Hero H1'),
  secH2:      ref('heading', 'Section H2'),
  ctaH2:      ref('heading', 'CTA H2'),
  cardH3:     ref('heading', 'Card H3'),
  eyebrow:    ref('text',    'Eyebrow'),
  body:       ref('text',    'Body'),
  bodyCenter: ref('text',    'Body Center'),
  bodyOnDark: ref('text',    'Body On Dark'),
  cardText:   ref('text',    'Card Text'),
  cardPrice:  ref('text',    'Card Price'),
  footerText: ref('text',    'Footer Text'),
  btnPrimary: ref('button',  'Button – Primary'),
  btnGhost:   ref('button',  'Button – Ghost'),
  btnWhite:   ref('button',  'Button – White'),
};

// Variable ref for eyebrow color (registered in preset setup)
const ACCENT_REF = `$variable({"type":"color","value":{"name":"gcid-ryw-accent","settings":{}}})$`;

// ── 3. Sections ───────────────────────────────────────────────────────────────

// ── Hero ──
const hero = D.section({ adminLabel: 'Hero', preset: P.secCream, padding: { top: '100px', bottom: '80px' } }, [
  D.row({ structure: 'equal-columns_2', alignItems: 'center', columnGap: '64px', maxWidth: '1200px' }, [

    D.column({ flexType: '12_24' }, [
      D.eyebrow('Frome High Street · Est. 2019', ACCENT_REF, { textAlign: 'left', preset: P.eyebrow }),
      D.heading({ text: 'Massage Frome has been waiting for', level: 'h1', preset: P.heroH1 }),
      D.text({
        html: '<p>Expert massage Frome locals have trusted since 2019. Whether you need deep relief or total relaxation, we have got hands for that.</p>',
        preset: P.body,
      }),
      D.row({ structure: 'equal-columns_2', columnGap: '16px', maxWidth: '480px' }, [
        D.column({ flexType: '12_24' }, [
          D.button({ text: 'Book Your Treatment', url: '#book', preset: P.btnPrimary }),
        ]),
        D.column({ flexType: '12_24' }, [
          D.button({ text: 'View Treatments', url: '#treatments', preset: P.btnGhost }),
        ]),
      ]),
    ]),

    D.column({ flexType: '12_24' }, [
      D.image({
        src: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=900&q=80',
        alt: 'Massage therapist performing a relaxing back massage in a calm treatment room in Frome',
      }),
    ]),
  ]),
]);

// ── Social proof strip ──
const strip = D.section({ adminLabel: 'Strip', preset: P.secAccent }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.text({
        html: '<p style="text-align:center;color:rgba(255,255,255,1);font-family:\'DM Sans\',sans-serif;font-size:14px;font-weight:500;letter-spacing:0.04em;margin:0">4.9 on Google &nbsp;·&nbsp; 300+ happy clients &nbsp;·&nbsp; Walk-ins welcome when available</p>',
      }),
    ]),
  ]),
]);

// ── Treatments ──
const CARD_BG = 'rgba(255,252,248,0.85)';

function treatmentCard(title, body, price) {
  return D.block('column', {
    module: { decoration: {
      background: D.dv({ color: CARD_BG }),
      border:     D.dv({ radius: { topLeft: '20px', topRight: '20px', bottomLeft: '20px', bottomRight: '20px', sync: 'on' } }),
      spacing:    D.dv({ padding: { top: '32px', bottom: '32px', left: '28px', right: '28px', syncVertical: 'off', syncHorizontal: 'off' } }),
    } },
    builderVersion: D.BUILDER_VERSION,
  }, [
    D.heading({ text: title, level: 'h3', preset: P.cardH3 }),
    D.text({ html: `<p>${body}</p>`, preset: P.cardText }),
    D.text({ html: `<p>${price}</p>`, preset: P.cardPrice }),
  ]);
}

const treatments = D.section({ adminLabel: 'Treatments', preset: P.secCream, padding: { top: '90px', bottom: '90px' } }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.eyebrow('Our treatments', ACCENT_REF, { textAlign: 'left', preset: P.eyebrow }),
      D.heading({ text: 'The right massage Frome bodies need', level: 'h2', preset: P.secH2 }),
      D.text({
        html: '<p>All treatments are tailored to you. Tell us what hurts or what you want to switch off, and we will do the rest.</p>',
        preset: P.body,
      }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_3', columnGap: '24px', maxWidth: '1200px' }, [
    D.column({ flexType: '8_24' }, [
      treatmentCard('Back Rub',
        'A targeted treatment for the back, shoulders, and neck - where most of us carry our tension. Deeply effective, deeply satisfying.',
        'From £35 &middot; 30 min'),
    ]),
    D.column({ flexType: '8_24' }, [
      treatmentCard('Special Time',
        'Our signature full-body experience. A luxurious head-to-toe treatment that takes its time, works every muscle, and sends you out floating.',
        'From £70 &middot; 90 min'),
    ]),
    D.column({ flexType: '8_24' }, [
      treatmentCard('Head Rub',
        'Indian head massage for the scalp, neck, and shoulders. Relieves headaches, reduces stress, and leaves your mind blissfully quiet.',
        'From £30 &middot; 30 min'),
    ]),
  ]),
]);

// ── FAQ ──
const faqs = [
  { q: 'Do I need to book in advance?',
    a: 'We recommend booking ahead to secure your preferred time, but walk-ins are welcome when we have availability. Check our booking link for same-day slots.' },
  { q: 'What should I wear to my appointment?',
    a: 'We provide towels and draping. You will only undress to your comfort level. Most people undress fully for a full-body massage, but that is entirely your choice.' },
  { q: 'How long is a typical massage session?',
    a: 'Sessions run from 30 to 90 minutes depending on the treatment. We recommend 60 minutes for your first visit so there is time for a proper consultation.' },
  { q: 'Is massage suitable if I am pregnant?',
    a: 'Yes. We offer pregnancy massage from the second trimester onwards. Please let us know when booking so we can adjust technique and positioning for your safety and comfort.' },
  { q: 'Do you sell gift vouchers?',
    a: 'Yes. Gift vouchers are available in any denomination and make a perfect present. Buy online or pop into the shop on Frome High Street to pick one up.' },
  { q: 'Where exactly are you on Frome High Street?',
    a: 'We are on Frome High Street in the town centre, easily walkable from the main car parks. Full address and a map link are in the booking confirmation email.' },
];

function faqCard({ q, a }) {
  return D.block('column', {
    module: { decoration: {
      background: D.dv({ color: CARD_BG }),
      border:     D.dv({ radius: { topLeft: '20px', topRight: '20px', bottomLeft: '20px', bottomRight: '20px', sync: 'on' } }),
      spacing:    D.dv({ padding: { top: '28px', bottom: '28px', left: '30px', right: '30px', syncVertical: 'off', syncHorizontal: 'off' } }),
    } },
    builderVersion: D.BUILDER_VERSION,
  }, [
    D.heading({ text: q, level: 'h3', preset: P.cardH3 }),
    D.text({ html: `<p>${a}</p>`, preset: P.cardText }),
  ]);
}

const faq = D.section({ adminLabel: 'FAQ', preset: P.secCream2, padding: { top: '90px', bottom: '90px' } }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.eyebrow('Common questions', ACCENT_REF, { textAlign: 'left', preset: P.eyebrow }),
      D.heading({ text: 'Everything you need to know', level: 'h2', preset: P.secH2 }),
      D.text({
        html: '<p>Got a question we have not answered? Drop us a message, we are friendly, we promise.</p>',
        preset: P.body,
      }),
    ]),
  ]),
  D.row({ structure: 'equal-columns_2', columnGap: '16px', rowGap: '16px', maxWidth: '1200px' }, [
    D.column({ flexType: '12_24' }, faqs.slice(0, 3).map(faqCard)),
    D.column({ flexType: '12_24' }, faqs.slice(3).map(faqCard)),
  ]),
]);

// ── CTA Band ──
const cta = D.section({ adminLabel: 'CTA Band', preset: P.secInk, padding: { top: '90px', bottom: '90px' } }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '800px' }, [
    D.column({}, [
      D.heading({ text: 'Ready to feel yourself again?', level: 'h2', preset: P.ctaH2 }),
      D.text({
        html: '<p>Book online in under a minute. Same-day slots often available.</p>',
        preset: P.bodyOnDark,
      }),
      D.row({ structure: 'equal-columns_2', columnGap: '16px', maxWidth: '460px' }, [
        D.column({ flexType: '12_24' }, [
          D.button({ text: 'Book Your Treatment', url: '#book', preset: P.btnWhite }),
        ]),
        D.column({ flexType: '12_24' }, [
          D.button({ text: 'Buy a Gift Voucher', url: '#gift', preset: P.btnGhost }),
        ]),
      ]),
    ]),
  ]),
]);

// ── Footer ──
const footer = D.section({ adminLabel: 'Footer', preset: P.secCream, padding: { top: '36px', bottom: '36px' } }, [
  D.row({ structure: 'equal-columns_1', maxWidth: '1200px' }, [
    D.column({}, [
      D.text({
        html: '<p style="text-align:center;color:#7d6e67;font-size:13px">Rub You Well &middot; Frome High Street &nbsp;&nbsp;|&nbsp;&nbsp; <a href="#" style="color:#7d6e67;text-decoration:none">Treatments</a> &nbsp;&nbsp;|&nbsp;&nbsp; <a href="#" style="color:#7d6e67;text-decoration:none">Gift Vouchers</a> &nbsp;&nbsp;|&nbsp;&nbsp; <a href="#" style="color:#7d6e67;text-decoration:none">Privacy Policy</a></p>',
        preset: P.footerText,
      }),
    ]),
  ]),
]);

// ── 4. Assemble ───────────────────────────────────────────────────────────────
const content = D.placeholder([hero, strip, treatments, faq, cta, footer]);
const layout  = b.assemble({ context: 'et_builder', content, title: 'Rub You Well | Massage Frome High Street' });

// Preset-first: presets are already on the site — don't re-send them
delete layout.presets;

fs.writeFileSync(path.join(__dirname, 'rub-you-well-landing-page.json'), JSON.stringify(layout, null, 2));
fs.writeFileSync(path.join(__dirname, 'rub-you-well-seo-meta.json'), JSON.stringify({
  keyword:     'massage frome',
  title:       'Rub You Well | Massage Frome High Street',
  description: 'Expert massage Frome town centre. Back rubs, head massage, full-body treatments and gift vouchers. Book same-day on Frome High Street.',
  keywords:    ['massage frome', 'massage frome high street', 'back massage frome', 'indian head massage frome', 'massage gift vouchers frome'],
  slug:        'rub-you-well-massage-frome',
}, null, 2));

console.log('Wrote rub-you-well-landing-page.json');
console.log('Wrote rub-you-well-seo-meta.json');
