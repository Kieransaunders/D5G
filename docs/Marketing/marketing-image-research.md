# Divi5Generate Marketing Image Research

**Document Date:** 2026-07-06  
**Product:** Divi5Generate — AI-powered Divi 5 page generator + QA system  
**Research Scope:** Visual storytelling strategy, target audience analysis, brand positioning, marketing image concepts

---

## Product Summary

**Divi5Generate** is a Claude Code plugin that generates production-ready Divi 5 pages from natural language briefs. Users describe what they need → AI generates SEO-optimized, preset-driven page JSON → import directly to WordPress with one click.

Unlike generic page builders or AI tools, Divi5Generate:
- Outputs **real Divi 5 JSON** that imports pixel-accurately into WordPress sites
- Includes **two QA gates** (style-check, design-review) to prevent brand drift and spec non-compliance
- **Preserves brand presets** through a preset-first workflow ensuring CSS fidelity
- Comes with **SEO validation** (title, meta description, keyword placement, FAQ schema)
- Provides a **chat-primary interface** with inline preview + one-click import

---

## Target Audience

### Primary

**Divi 5 agencies and freelancers** building client sites. The primary pain point is time: a landing page takes days/weeks to design, build, and QA. Divi5Generate compresses that to minutes while ensuring the output matches the brief and brand system.

**In-house web teams** at SMEs and mid-market companies using Divi 5 for internal websites. Same pain point, same solution.

### Secondary

- **WordPress developers** building Divi-based sites for SaaS, eCommerce, and service businesses
- **Design-to-development hand-off teams** using Claude Design or other design tools that can export JSON
- **Content agencies** building multiple pages for different clients in Divi (brand management + multi-page generation)

### Psychographics

- **Tech-forward** — comfortable with AI, CLI tools, JSON, REST APIs
- **Efficiency-driven** — ROI-focused, billable hours matter, value time savings
- **Quality-conscious** — willingness to use validation gates and QA processes
- **Brand-aware** — maintain design consistency across pages and projects
- **Already invested** in Divi 5 (not shopping for a replacement page builder)

---

## Core Value Propositions

1. **Speed: Pages in Minutes, Not Days**
   - Eliminate repetitive page structure setup
   - No manual preset/variable management
   - Stream generation, preview, and import in one session
   - Compress days of design/build/QA into a single afternoon

2. **Quality by Construction: Two QA Gates**
   - **Gate 1 (pre-import):** Style-check ensures new pages reuse designer presets, palette, and fonts
   - **Gate 2 (post-import):** Design-review confirms deliverable matches the brief specification
   - Catch issues before publication instead of discovering them post-launch

3. **Brand Inheritance: One Design, Many Pages**
   - Extract design system from existing Divi export or brand guidelines
   - Convert to Divi Global Variables for new pages
   - Guarantee brand consistency: new pages automatically inherit colours, fonts, preset IDs
   - No manual colour/font picking or preset hunting

4. **Real WordPress Integration: Not a Separate Platform**
   - Outputs native Divi 5 JSON, not an export-to-code or HTML mock
   - Imports directly to WordPress site via REST API plugin
   - One-click draft creation, preview live, publish directly
   - Works with existing WordPress sites — no platform lock-in

5. **SEO-Ready Out of the Box**
   - Generated title (≤60 chars), meta description (≤155 chars)
   - Primary keyword in h1, title, first 100 words, and ≥1 h2
   - FAQPage JSON-LD schema included
   - Validated before delivery — no on-page duplication, no em-dashes in copy

---

## Key Differentiators

| Capability | Divi5Generate | Framer AI | Generic AI | Divi (manual) |
|-----------|---|---|---|---|
| Outputs real Divi 5 JSON | ✅ | ❌ | ❌ | N/A |
| Works with existing Divi site | ✅ | ❌ | ❌ | ✅ |
| Preserves brand presets | ✅ | partial | ❌ | ✅ |
| SEO validated | ✅ | basic | ❌ | ❌ |
| Import preserves CSS fidelity | ✅ | N/A | N/A | ✅ |
| Taste/aesthetic system | ✅ | basic | ❌ | ❌ |
| FAQPage schema output | ✅ | ❌ | sometimes | ❌ |
| Time to live page | minutes | hours | hours | days/weeks |

**The moat:** Technical knowledge of Divi 5's internal format. The preset-first workflow, CSS cache clearing, preset enable toggles, raw hex requirements, and block comment syntax took weeks of reverse engineering. Competitors starting from scratch face the same learning curve.

---

## Brand & Visual Language

### Tone

- **Confident, technical:** "This works where others fail" — knowledge of Divi internals is the differentiator
- **Efficiency-focused:** Time savings, automation, reduced friction
- **Quality-first:** Validation gates, QA rigor, spec compliance
- **Modern SaaS:** Clean, minimal, purposeful design

### Visual Inspiration

- **Stripe:** workflow diagrams, minimal but technical, premium feel
- **Vercel:** deployment pipelines, data flow visualization, modern dark mode
- **Linear:** clean typography, purposeful use of colour, status/workflow clarity
- **Framer:** motion and interactivity shown cleanly (our Animation preset showcase)

### Colour Palette

*Based on Divi5Generate branding and SaaS precedent:*

- **Primary:** Indigo/violet (#6366f1, Stripe/Vercel blue-alike) — signals intelligence, AI, tech
- **Secondary:** Emerald (#10b981) — signals success, shipping, completion (Gate 2 passes)
- **Accent:** Amber (#f59e0b) — signals decisions, QA checkpoints, attention
- **Neutral:** Slate grays (#1e293b, #64748b, #cbd5e1, #f1f5f9) — technical, clean
- **Validation reds:** #ef4444 — fails, errors, needs fixing
- **Background:** Off-white (#fafafa) or deep slate (#0f172a) for dark mode

---

## Why Each Image Was Selected

### 1. Hero Workflow — "From Brief to Live"

**Strategic purpose:** Land the core value proposition in a single visual. The user sees the entire journey (Brief → Generate → Validate → Import → Live) in one frame. The image says "we handle the whole pipeline; you don't." Differentiator: two QA gates visible, showing quality is built in.

**Why it works:** Workflow diagrams are high-signal for technical products. Shows efficiency (compressed timeline), completeness (all steps visible), and rigor (gates visible). Matches the visual language of Stripe, Vercel, Linear.

**Placement:** Hero banner on landing page, feature page, GitHub README, LinkedIn post, Product Hunt.

---

### 2. Chat Interface + Inline Preview — "Ease of Use"

**Strategic purpose:** Combat the perception that AI + JSON + REST APIs = complexity. The image shows the real UX: chat naturally, preview inline, click to import. No form-filling, no JSON handling, no manual steps.

**Why it works:** Shows the actual product interface. Reassures skeptics that "AI-powered" doesn't mean "hard to use." The preview card and import card visible in the UI prove that iterations and approval are built in. Modern SaaS screenshot style.

**Placement:** Feature page, landing page fold-down, app documentation, tutorial video thumbnail.

---

### 3. QA Gates in Action — "Built-in Validation"

**Strategic purpose:** Differentiate on quality. Two gates (style-check, design-review) catching issues pre-publication. Most AI page builders ship whatever is generated; Divi5Generate validates and blocks publication if needed. Shows professional rigor.

**Why it works:** Amber colour for decisions, visual checkpoints/blockers, clear pass/fail paths. Reassures agencies that they can confidently deliver to clients. High signal of maturity and professionalism.

**Placement:** Feature page ("Quality Assurance"), comparison table, marketing email, Product Hunt.

---

### 4. Brand Inheritance Flow — "One Design, Many Pages"

**Strategic purpose:** Show the technical magic: extract brand system once, pages automatically inherit it. Solves the "brand consistency" pain point visually.

**Why it works:** Data flow visualization shows how presets/colours/fonts cascade from the original design to new pages. Indigo (AI intelligence) flowing to pages. Shows both the extraction step (technical credibility) and the automatic inheritance (ease of use).

**Placement:** Feature page ("Brand Management"), blog post, LinkedIn carousel.

---

### 5. Before-and-After Timeline — "Speed: Days to Minutes"

**Strategic purpose:** Sell the time savings directly. The most compelling metric for agencies is billable hours. A visual showing "manual: 5 days" → "AI: 1 hour" is unmissable.

**Why it works:** Before/after is one of the most effective marketing formats. Quantified benefit (days vs hours). Emphasizes ROI, which is the core pitch to agencies.

**Placement:** Landing page, comparison page, case study, LinkedIn post, presentation slide.

---

## Priority Ranking by Marketing Impact

### Tier 1 — Highest Impact

1. **Hero Workflow** (highest SEO + social shareability + comprehensiveness)
2. **Before-and-After Timeline** (strongest ROI messaging, easiest to parse)
3. **QA Gates** (strongest differentiator vs competitors, quality reassurance)

### Tier 2 — High Impact

4. **Chat Interface + Preview** (addresses ease-of-use objections, shows real UX)
5. **Brand Inheritance Flow** (unique technical advantage, shows scope)

---

## Visual Style Specifications

All images should follow these consistent principles:

- **Color:** Indigo primary (#6366f1), emerald/amber accents, slate neutrals, clean white/dark backgrounds
- **Typography:** Modern sans-serif (Inter, Space Grotesk, or similar), clear hierarchy
- **Composition:** Balanced, with clear focal point; workflow left-to-right or top-to-bottom for clarity
- **Density:** Modern SaaS density (not sparse, not cluttered); generous whitespace
- **Depth:** Subtle shadows, minimal 3D or isometric perspective (not cartoonish)
- **Illustrations:** Technical diagrams, flowcharts, UI mockups — not photographic
- **Branding:** Consistent use of Divi5Generate colour palette; opt for vector/digital art over photos

---

## Context for Image Generation

**Aspect Ratios by Use Case:**
- Landing page hero: 1200×600 (16:9 widescreen) or 2400×1200 (2x density)
- Feature pages: 1200×800 or 1600×900 (3:2)
- Social (LinkedIn/X): 1200×627 (og:image), 1080×1080 (Instagram square)
- GitHub social preview: 1280×640
- Presentations: 1920×1080 (16:9)
- Documentation: 1200×675 or varied

**Typography for Prompts:**
- Modern SaaS style (Stripe, Vercel, Linear)
- Clear, hierarchy-driven
- Minimal ornamentation
- Dark mode friendly

**Aesthetic Guidelines:**
- **NOT:** cartoonish, photorealistic, overly 3D, vintage, playful
- **YES:** clean technical illustrations, modern UI mockups, data visualization, workflow diagrams
