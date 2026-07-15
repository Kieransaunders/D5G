# Divi5Generate Marketing Assets — Complete Package

**Created:** 2026-07-06  
**Location:** `/docs/Marketing/`  
**Status:** Research, prompts, and vector assets complete. PNG generation instructions included.

---

## Contents

### 📊 Research Documents

1. **`marketing-image-research.md`**
   - Comprehensive product analysis (what Divi5Generate is, target audience, value props)
   - Brand positioning and visual language specifications
   - 5 marketing image concepts with strategic rationale
   - Priority ranking by marketing impact
   - Complete visual style guide

2. **`image-prompts.md`**
   - Production-quality generation prompts for all 5 images
   - Detailed specifications (dimensions, colours, typography, mood)
   - Technical generation notes and quality checklist
   - Usage locations for each asset
   - Summary table of all images

### 🎨 Marketing Assets

**Vector Diagrams (SVG format — ready for web, scalable to any size):**

3. **`assets/hero-workflow.svg`** (2400×1200px, 16:9)
   - Full workflow from Brief → Generate → Validate → Import → Live
   - Shows the 5 stages with icons, labels, and connectors
   - Ideal for: landing page hero, GitHub README, presentations
   - Colours: Indigo, emerald, amber (quality gates highlighted)

4. **`assets/qa-gates-validation.svg`** (1200×800px, 3:2)
   - Vertical flowchart showing Gate 1 (Style Check) and Gate 2 (Design Review)
   - Each gate has checklist items and PASS/FAIL badges
   - Shows delivery files at bottom
   - Ideal for: feature pages, quality differentiation, blog posts

5. **`assets/brand-inheritance-flow.svg`** (1400×900px, 14:9)
   - Horizontal data flow: Extract → Registry → Auto-inherit
   - Shows how presets, colours, fonts flow from one design to many pages
   - Ideal for: feature explanations, blog posts, LinkedIn carousels

6. **`assets/time-savings-timeline.svg`** (1400×700px, 2:1)
   - Side-by-side comparison: Manual (5 days) vs AI (~1 hour)
   - Shows phases for each workflow with time breakdowns
   - 98% faster impact callout in the middle
   - Ideal for: landing page value prop, pricing/ROI pages, email

**Interactive Mockup (HTML):**

7. **`assets/chat-ui-mockup.html`** (1600×1000px, 16:10 aspect)
   - Fully functional HTML mockup of the Divi5Generate chat interface
   - Shows actual UI: tabs, chat bubbles, proposal card, preview pane
   - Demonstrates ease-of-use and conversational flow
   - Ideal for: feature pages, app walkthrough, product demos
   - Can be rendered to PNG using Playwright, Puppeteer, or browser screenshot

---

## Quick Start: Converting Assets to PNG

### Option 1: SVG → PNG (Recommended for web)

**Using a Browser (Simplest):**
1. Open each `.svg` file in Chrome, Firefox, or Safari
2. Right-click → Save As → Select "PNG Image" format
3. Save at 1x or 2x scale (2x for retina displays)

**Using Command Line (Bulk conversion):**

```bash
# Install ImageMagick (macOS: brew install imagemagick)
# Or use SVG conversion tools like:

# Option A: ImageMagick
convert -density 300 hero-workflow.svg -quality 85 hero-workflow.png

# Option B: Inkscape (if installed)
inkscape hero-workflow.svg -e hero-workflow.png -d 300

# Option C: SVGO + Puppeteer (Node.js)
npx svg-to-png assets/hero-workflow.svg
```

**Online Converters:**
- Convertio: https://convertio.co/svg-png/
- CloudConvert: https://cloudconvert.com/svg-to-png
- Zamzar: https://www.zamzar.com/convert/svg-to-png/

### Option 2: HTML → PNG (Chat UI Mockup)

**Using Playwright (Node.js):**
```bash
npm install -D playwright

# Create a script:
cat > render-mockup.js << 'EOF'
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///path/to/chat-ui-mockup.html');
  await page.screenshot({ path: 'chat-ui-preview.png', fullPage: false });
  await browser.close();
})();
EOF

node render-mockup.js
```

**Using Puppeteer (Node.js):**
```bash
npm install -D puppeteer

cat > render-mockup.js << 'EOF'
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.goto('file:///path/to/chat-ui-mockup.html');
  await page.screenshot({ path: 'chat-ui-preview.png' });
  await browser.close();
})();
EOF

node render-mockup.js
```

**Using Browser DevTools:**
1. Open `chat-ui-mockup.html` in Chrome
2. Press F12 (DevTools)
3. Press Ctrl+Shift+P (or Cmd+Shift+P) → "Screenshot"
4. Select "Capture node screenshot"

**Using Mac Screenshot:**
```bash
# Install screencapture tool or use ScreenFlow
# Or use macOS built-in:
# Open in browser → F12 → DevTools
# Right-click element → Capture node screenshot
```

---

## Asset Specifications

| Asset | Format | Dimensions | File Size | Best Use | Priority |
|-------|--------|-----------|-----------|----------|----------|
| Hero Workflow | SVG | 2400×1200 | ~50KB | Landing page hero | Tier 1 |
| QA Gates | SVG | 1200×800 | ~35KB | Feature pages | Tier 1 |
| Brand Inheritance | SVG | 1400×900 | ~45KB | Feature/blog | Tier 2 |
| Time Savings | SVG | 1400×700 | ~40KB | Landing page | Tier 1 |
| Chat UI Mockup | HTML | 1600×1000 | ~8KB | App walkthrough | Tier 2 |

**Notes:**
- SVGs are infinitely scalable; export at 2x density (e.g., 2400×1200) for retina displays
- All colours follow the Divi5Generate brand palette (Indigo #6366f1, Emerald #10b981, Amber #f59e0b)
- Typography uses system fonts (Inter-like); no font dependencies needed
- Chat UI mockup is fully functional HTML; all interactions are CSS-based (no JavaScript required)

---

## Usage Recommendations

### Landing Page (Hero Section)
- **Primary:** Time Savings Timeline (shows ROI immediately)
- **Secondary:** Hero Workflow (shows completeness)
- **Layout:** Full-width, above fold

### Feature Pages
- **"Quality Assurance":** QA Gates diagram
- **"Brand Management":** Brand Inheritance flow
- **"How It Works":** Hero Workflow
- **"Chat Interface":** Chat UI mockup (with walkthrough text)

### Marketing Email & Social
- **LinkedIn Carousel:** 
  1. Time Savings (lead with ROI)
  2. Hero Workflow (show completeness)
  3. QA Gates (show rigor)
  4. Brand Inheritance (show automation)
  5. CTA ("Try it free")
  
- **Twitter/X:** Time Savings (98% faster) with headline
- **Blog posts:** Embed SVGs directly; they render as vector graphics

### Presentations & Webinars
- All SVGs work as slides or backgrounds
- Chat UI mockup as demo screenshot
- Use 16:9 aspect ratio (export at 1920×1080 for presentations)

### Product Hunt & GitHub
- **Hero:** Hero Workflow (top of README)
- **Social Preview:** Time Savings Timeline (og:image)
- **Gallery:** All 5 diagrams as image carousel

### Documentation & Developer Relations
- **README:** Hero Workflow as context
- **API docs:** Brand Inheritance flow (shows data model)
- **Guides:** Chat UI mockup with annotations

---

## Brand Consistency Notes

All assets follow these specifications:

**Colour Palette:**
- Primary: Indigo (#6366f1) — AI, intelligence, primary actions
- Success: Emerald (#10b981) — completion, validation, "go"
- Attention: Amber (#f59e0b) — QA checkpoints, decisions
- Neutral: Slate (#64748b) for text, grey (#e2e8f0) for borders
- Background: Off-white (#fafafa) or white (#ffffff)

**Typography:**
- Font: Inter or system sans-serif
- Hierarchy: 48px (main titles), 24px (section titles), 16px (labels), 14px (body)
- Weight: 700 (titles), 600 (labels), 400 (body)

**Visual Style:**
- Modern SaaS aesthetic (Stripe, Vercel, Linear)
- Flat design (no gradients, minimal shadows)
- Clean whitespace
- Rounded corners (12px for boxes, 8px for buttons)
- Clear data flow (arrows, connectors)

**Accessibility:**
- All text has ≥4.5:1 contrast ratio (WCAG AAA)
- Icons are paired with text labels
- Colours not sole differentiators (checked ✓, failed ✗ use both colour + symbol)

---

## Customization Guide

### To modify an SVG diagram:

1. **Open in Figma** (import SVG, edit, export)
2. **Open in Adobe Illustrator** (native SVG support)
3. **Open in VS Code** (edit XML directly):
   ```xml
   <!-- Example: Change a colour -->
   <rect fill="#6366f1" ... />  <!-- Change #6366f1 to your colour -->
   ```

### To modify the Chat UI mockup:

1. **CSS changes:** Edit the `<style>` section in HTML
2. **Content changes:** Edit text directly in HTML (keep structure)
3. **Layout changes:** Edit flexbox in CSS
4. **Colours:** Search-replace hex codes throughout

---

## Next Steps: Image Generation

If you have access to image generation tools (GPT-4 Vision, DALL-E 3, Midjourney), use the **complete generation prompts in `image-prompts.md`** to create high-fidelity versions of these diagrams.

**Recommended approach:**
1. Use SVGs as is (they're production-quality vector graphics)
2. Generate PNG exports for web/social using the conversion methods above
3. Optionally use AI image generation for more photorealistic/illustrated versions of the diagrams if desired

The SVGs provided here are immediately usable for:
- ✅ Website (embed directly or export to PNG)
- ✅ Documentation (share as PNG or link SVG)
- ✅ Presentations (import SVG to Keynote/Slides)
- ✅ Social media (export PNG at appropriate dimensions)
- ✅ Print (scale SVG to any print size without quality loss)

---

## File Structure

```
docs/Marketing/
├── README.md                           (this file)
├── marketing-image-research.md         (strategy & concepts)
├── image-prompts.md                    (generation prompts)
└── assets/
    ├── hero-workflow.svg               (2400×1200)
    ├── qa-gates-validation.svg         (1200×800)
    ├── brand-inheritance-flow.svg      (1400×900)
    ├── time-savings-timeline.svg       (1400×700)
    ├── chat-ui-mockup.html             (1600×1000)
    └── [PNG exports here when generated]
```

---

## Quality Checklist

Before using any asset in production:

- [ ] Colour accuracy tested on monitor
- [ ] Typography readable at 100% scale
- [ ] Responsive/scalable (SVG = always scalable)
- [ ] No spelling or grammar errors
- [ ] Accessibility (high contrast, alt text)
- [ ] Brand compliance (colours, fonts, style)
- [ ] Rendering tested on Chrome, Safari, Firefox
- [ ] Mobile preview (use browser responsive mode)
- [ ] File size optimized (SVGs <100KB each)

---

## Support & Variations

**Need variations?**
- **Dark mode:** Edit SVGs to use light colours on dark background (#0f172a instead of white)
- **Different language:** Replace text labels in SVGs/HTML
- **Different sizing:** SVGs scale infinitely; export PNG at any size
- **Different colours:** Search-replace hex codes in SVGs or CSS

**Need to add a 6th image?**
Use the methodology in `marketing-image-research.md` to identify the opportunity, then write a prompt in `image-prompts.md` and create the asset.

---

## Credits

**Created:** 2026-07-06 by Claude Code  
**Product:** Divi5Generate by Kieran Saunders / iConnectIT  
**Methodology:** Modern SaaS marketing best practices (Stripe, Vercel, Linear)  
**Tools:** SVG, HTML5, CSS3, vector design principles

---

## License

All marketing assets are part of the Divi5Generate project and follow the same MIT license as the main codebase. Free to use internally and in marketing materials.
