# Divi5Generate — Production-Quality Image Generation Prompts

**Document Date:** 2026-07-06  
**Target Models:** GPT-4 Vision / DALL-E 3, Midjourney v6, Leonardo.ai (preferred for consistency)  
**Delivery Format:** PNG (RGB, 8-bit), at specified dimensions, suitable for web, print, and social

---

## Image 1: Hero Workflow — "From Brief to Live"

**Filename:** `hero-workflow.png`  
**Purpose:** Hero banner image conveying the full product journey  
**Target Audience:** All tiers — agencies, freelancers, web teams  
**Marketing Objective:** Communicate completeness and speed ("entire pipeline handled")  
**Key Message:** Brief → Generate → Validate → Import → Live Page  
**Dimensions:** 2400×1200px (16:9, 2x density for retina displays)  
**Aspect Ratio:** 16:9  

### Visual Composition

Horizontal workflow diagram showing 5 stages left-to-right, each with an icon and brief label. The diagram should feel modern and technical, like Stripe's workflow diagrams.

**Stage breakdown:**
1. **Brief** — Speech bubble icon, user silhouette, text "Describe the page"
2. **Generate** — Sparkle/AI icon, flowing lines, text "AI builds page.json"
3. **Validate** — Checkmark shield, amber warning symbols visible, text "QA Gates (2)"
4. **Import** — Plug/connection icon, text "→ WordPress"
5. **Live** — Desktop/browser icon, emerald checkmark, text "Published"

**Visual elements:**
- Each stage is a rounded rectangle with:
  - Large icon (60-80px) in indigo or emerald
  - Stage label below
  - Subtle background colour (light indigo, light emerald, light slate)
- Connecting arrows between stages (indigo stroke, 2-3px)
- On Gate 2, show a small amber amber badge to emphasize quality assurance
- The final stage has a bright emerald background (#10b981) to signal completion

**Style:** Modern SaaS / technical illustration  
**Colour Palette:** Indigo (#6366f1), emerald (#10b981), amber (#f59e0b), slate (#64748b), white backgrounds  
**Typography:** Clean sans-serif (Inter-like), 16px labels, 12px descriptions, light weight  
**Mood:** Professional, efficient, trustworthy  

### Full Generation Prompt

```
Create a modern technical workflow diagram for a software product called "Divi5Generate". 
The image shows a left-to-right flowchart with 5 stages of a page generation pipeline.

Stage 1 (leftmost): "Brief"
- Icon: A speech bubble or chat icon
- Colour: Light indigo background (#f0f4ff)
- Label: "Describe the page" in sans-serif

Stage 2: "Generate"
- Icon: Sparkles or AI stars icon
- Colour: Light indigo background
- Label: "AI builds page.json"

Stage 3: "Validate"
- Icon: Shield with checkmark
- Colour: Light amber background (#fff8e1)
- Label: "QA Gates (2)" in amber accent
- Visual: Add a small amber badge or warning symbol to emphasize validation importance

Stage 4: "Import"
- Icon: Plug or connection icon
- Colour: Light slate background (#f1f5f9)
- Label: "→ WordPress"

Stage 5 (rightmost): "Live"
- Icon: Desktop or browser window
- Colour: Bright emerald background (#10b981)
- Label: "Published" in white text

Connecting Elements:
- Smooth indigo arrows (#6366f1) connecting each stage (3px stroke)
- Subtle drop shadows under each stage box
- Rounded corners (12px border radius)

Overall Design:
- Horizontal layout, clean and spacious
- Modern SaaS aesthetic (like Stripe, Vercel, Linear)
- Sans-serif typography, light weight, clear hierarchy
- Soft, professional colour palette
- No gradients or 3D effects (flat design)
- High contrast and readability
- Grid-based alignment

Dimensions: 2400 x 1200 pixels (16:9 aspect ratio)
Background: White (#ffffff) or very light grey (#fafafa)
Style: Technical illustration, modern minimalist
Mood: Professional, trustworthy, efficient, technical
```

### Negative Prompts / Constraints

- No photorealistic images
- No cartoonish characters or mascots
- No 3D render or isometric perspective
- No gradients or bevels
- No clip art style
- Avoid busy or cluttered composition
- No shadows that are too dark or dramatic

### Usage Locations

- **Landing page hero banner** (top fold, full width)
- **Feature page hero section**
- **GitHub README** (top of document)
- **LinkedIn carousel slide**
- **Product Hunt launch banner**
- **Marketing presentations**
- **Blog post headers**

---

## Image 2: Chat Interface + Inline Preview

**Filename:** `chat-ui-preview.png`  
**Purpose:** Show the real product interface and ease of use  
**Target Audience:** Skeptics ("AI + JSON = complicated"), designers, non-technical decision makers  
**Marketing Objective:** Prove the UX is simple and conversational  
**Key Message:** Type naturally → Preview inline → Import with one click  
**Dimensions:** 1600×1000px (16:10)  
**Aspect Ratio:** 16:10 / 8:5  

### Visual Composition

Screenshot-style mockup of the Divi5Generate app interface. The layout shows:

**Left panel (60% width):**
- **Chat area** at top (70% of panel height)
  - Few message bubbles (user: "Landing page for a pet rescue agency...", AI: response with generation proposal)
  - Messages styled like modern chat apps (rounded bubbles, indigo for AI, slate for user)
  - Markdown formatting visible (bold, italic, code blocks)
  
- **Start button** below chat (prominent, indigo background, "Start Generation" label)

**Right panel (40% width):**
- **Preview Card** (visible during generation)
  - Small preview of generated page layout (mockup of Divi page structure)
  - Sections visible: Hero (with image placeholder), text, button
  - Colour palette from the brief (emerald accents, indigo headings)
  - Below preview: "✓ Looks good" and "✗ Refine" buttons

**Header:**
- Tab bar: "Chat | Brand | Designs | Settings"
- Active tab is "Chat"
- Clean, minimal header

**Footer:**
- "Connected to WordPress site: example.com" status indicator
- Indigo or emerald status dot

**Style:** Modern app UI mockup  
**Colour:** Chat bubbles (indigo for AI, slate for user), preview card shadow, white background  
**Typography:** System font (San Francisco / Inter), 14px body, 16px labels  
**Mood:** Clean, intuitive, modern, approachable  

### Full Generation Prompt

```
Create a clean, modern app interface mockup for an AI page generator called "Divi5Generate". 
The interface shows a chat-first design with inline preview card.

Layout: Two-column design
- Left column (60%): Chat interface
- Right column (40%): Live preview card

Left Column - Chat Area:
- Header: App name "Divi5Generate" with logo
- Tab bar showing: "Chat | Brand | Designs | Settings" (Chat tab is active)
- Chat message history:
  - User message (slate background): "Landing page for a pet rescue agency in Devon, keyword 'adopt a dog Devon'"
  - AI response (indigo background, white text): "I'll create a landing page with Hero, Why Adopt, Featured Dogs, and CTA sections. Ready to start?"
  - Below AI message: A proposal card with "Start Generation →" button (indigo background, white text)
- Input field at bottom: "Type a message..." placeholder text

Right Column - Preview Card:
- Title: "Preview"
- Shows a mockup of a Divi page layout with sections:
  - Hero section with placeholder image and heading "Westcountry Pet Rescue"
  - Two-column section with text and image
  - CTA section with emerald button "Adopt Now"
- Below preview: Two action buttons: "✓ Looks Good" (emerald) and "✗ Refine" (slate outline)
- Subtle drop shadow on the card

Header Elements:
- Top-left: "Divi5Generate" wordmark
- Top-right: Connected status "Connected to wordpress-site.com" with emerald dot
- Settings icon

Overall Style:
- Modern SaaS app aesthetic (like Linear, Figma, Slack)
- Clean white background
- Sans-serif typography (Inter-like)
- Generous whitespace
- Rounded corners (8px)
- Subtle shadows for depth
- High contrast text

Colour Scheme:
- Primary: Indigo (#6366f1) for AI messages and action buttons
- Secondary: Emerald (#10b981) for success/approval buttons
- Neutral: Slate (#1e293b, #64748b) for user messages and text
- Background: White (#ffffff) or off-white (#fafafa)

Dimensions: 1600 x 1000 pixels
Style: UI mockup screenshot, modern app style
Mood: Clean, intuitive, modern, approachable, conversational
```

### Negative Prompts / Constraints

- No realistic camera/window capture effect
- No gradient backgrounds
- No 3D or skeuomorphic elements
- No cartoon characters
- Avoid overly dense or cluttered UI
- No copyright-infringing UI patterns (don't copy exact Slack/Figma designs)

### Usage Locations

- **Feature page** ("How It Works" or "Ease of Use" section)
- **App walkthrough / tutorial**
- **LinkedIn post** ("Here's what the interface looks like...")
- **Blog post** (UX/ease-of-use article)
- **Product Hunt comments** (show the real product)
- **Landing page secondary fold**

---

## Image 3: QA Gates in Action

**Filename:** `qa-gates-validation.png`  
**Purpose:** Differentiate on quality and rigor  
**Target Audience:** Agencies, quality-conscious teams, clients worried about accuracy  
**Marketing Objective:** Prove validation is built in; we catch issues before publishing  
**Key Message:** Two QA Gates ensure brand consistency + spec compliance  
**Dimensions:** 1200×800px (3:2)  
**Aspect Ratio:** 3:2 / 1.5:1  

### Visual Composition

Vertical flowchart showing the two validation gates, styled like a checkpoint system.

**Gate 1 (top):**
- Title: "Gate 1: Style Check" (indigo text)
- Icon: Shield with checkmark
- Description: "Verifies preset IDs, palette colours, fonts"
- Three checkboxes:
  - ✓ Preset IDs match designer export
  - ✓ Colours on brand palette
  - ✓ Fonts inherited from design system
- Status badge: "PASS ✓" (emerald, bold)
- Arrow down to Gate 2

**Gate 2 (below):**
- Title: "Gate 2: Design Review" (indigo text)
- Icon: Clipboard with checkmark
- Description: "Confirms page matches brief specification"
- Three checkboxes:
  - ✓ All required sections present
  - ✓ CTAs positioned correctly
  - ✓ Copy matches approved brief
- Status badge: "PASS ✓" (emerald, bold)
- Arrow down to delivery

**Delivery (bottom):**
- Title: "Delivery Ready" (emerald text)
- Icon: Checkmark in circle
- Description: "Page ready for publication"
- Files shown: page.json, seo-meta.json, schema.json
- Large emerald checkmark background

**Failure Path (shown as dashed line):**
- If a gate fails, show a dashed red path looping back to "Fix and Re-run"
- Example: "FAIL: Missing section — return to generator, fix, re-import"

**Style:** Checkpoint/flowchart diagram  
**Colours:** Indigo for gates, emerald for passes, red (#ef4444) for failures, amber for attention  
**Typography:** Sans-serif, 14-16px, clear hierarchy  
**Mood:** Professional, rigorous, confidence-inspiring  

### Full Generation Prompt

```
Create a modern quality assurance flowchart for "Divi5Generate" showing two validation gates 
that ensure page quality before publication. The diagram should feel technical and professional, 
like a system architecture diagram.

Layout: Vertical top-to-bottom flow

Gate 1 - Style Check (top box):
- Title: "Gate 1: Style Check" in indigo (#6366f1)
- Subtitle: "Pre-import validation"
- Icon: Shield with checkmark in indigo
- Description text: "Verifies preset IDs, palette colours, fonts match designer export"
- Checklist (three items):
  • ✓ Preset IDs match designer export
  • ✓ Colours on approved palette
  • ✓ Fonts inherited correctly
- Result badge (right side): "PASS ✓" with green/emerald background (#10b981), white text, bold

Connector: Downward arrow (indigo, 2px stroke)

Gate 2 - Design Review (middle box):
- Title: "Gate 2: Design Review" in indigo
- Subtitle: "Post-import validation"
- Icon: Clipboard with checkmark in indigo
- Description text: "Confirms page matches brief specification"
- Checklist (three items):
  • ✓ All required sections present
  • ✓ CTAs positioned correctly
  • ✓ Copy matches approved brief
- Result badge: "PASS ✓" in green/emerald

Connector: Downward arrow (indigo, 2px stroke)

Delivery Ready (bottom box):
- Title: "Delivery Ready ✓" in emerald
- Icon: Large emerald checkmark in circle
- Background: Light emerald (#f0fdf4)
- Files listed:
  📄 page.json
  📄 seo-meta.json
  📄 schema.json
- Text: "Page ready for publication"

Failure Path (dashed lines, red accent):
- Show a dashed red line from each gate with label:
  - "FAIL → Fix generator → Re-run"
  - Loop back to generator step

Overall Design:
- Vertical alignment, centered composition
- Each gate is a rounded rectangle with subtle shadow
- Gate backgrounds: Very light indigo or slate
- Colour hierarchy: Indigo for gates, emerald for success, red for failure
- Professional, technical aesthetic
- No gradients or 3D effects

Colour Scheme:
- Primary: Indigo (#6366f1) for gates and text
- Success: Emerald (#10b981) for PASS badges and delivery
- Failure: Red (#ef4444) for dashed fail paths
- Neutral: Slate (#64748b), off-white backgrounds
- Accents: Amber (#f59e0b) for attention/warning if needed

Typography:
- Sans-serif (Inter-like)
- Gate titles: 18px, bold
- Gate descriptions: 14px, regular
- Checklist items: 13px, regular with checkmark
- Badge text: 14px, bold, white on coloured background

Dimensions: 1200 x 800 pixels (3:2 aspect ratio)
Style: Technical diagram, modern SaaS, professional
Mood: Rigorous, quality-assuring, trustworthy, professional
```

### Negative Prompts / Constraints

- No cartoonish gatekeepers or characters
- No overly complex branching (keep it simple: two gates, one pass path)
- No photorealistic elements
- No 3D isometric view (flat design preferred)
- Avoid generic "quality" clip art

### Usage Locations

- **Feature page** ("Quality Assurance" section)
- **Comparison page** (differentiator vs competitors)
- **Marketing email** (case study or feature announcement)
- **Product Hunt** (comment/description)
- **LinkedIn post** ("How we ensure quality...")
- **Presentation slide**
- **Blog post** (technical walkthrough)

---

## Image 4: Brand Inheritance Flow

**Filename:** `brand-inheritance-flow.png`  
**Purpose:** Show the technical advantage of brand management  
**Target Audience:** Designers, brand-conscious teams, multi-page projects  
**Marketing Objective:** Demonstrate how presets + variables automatically flow to new pages  
**Key Message:** Extract once → Pages automatically inherit brand system  
**Dimensions:** 1400×900px (14:9, wide aspect)  
**Aspect Ratio:** 14:9 / ~1.55:1  

### Visual Composition

Horizontal data flow diagram showing brand system inheritance.

**Left side (25%):**
- **Source Design**
  - "Existing Divi Export" label
  - Icon: Document/file icon
  - Visual: Small mockup of original Divi page export

**Middle (50%):**
- **Extraction**
  - "Extract Design System" label
  - Processing icon (gears, flowing arrows)
  - Arrow from source to extraction step
  - Output: Three items flowing down:
    - Palette (colour swatches)
    - Typography (font samples)
    - Presets (preset icons)
  - Each flows into a central "Brand System Registry"

**Right side (25%):**
- **New Pages (multiplied)**
  - Three example pages flowing from the registry
  - Each page has the extracted palette, fonts, presets applied
  - Label: "Page 2", "Page 3", "Page N" with checkmarks
  - Visual: Each page mockup shows the same colour scheme and fonts as the source

**Visual Elements:**
- Indigo arrows showing data flow
- Emerald checkmarks on new pages (showing consistency)
- Colour swatches showing consistent palette
- Clean, symmetrical composition

**Style:** Data flow / system architecture diagram  
**Colours:** Indigo (flow), emerald (success), slate (text), white background  
**Typography:** Sans-serif, 14-16px, minimal labels  
**Mood:** Technical, elegant, showing efficiency  

### Full Generation Prompt

```
Create a horizontal data flow diagram for "Divi5Generate" showing how a brand design system 
is extracted once and then automatically inherited by multiple generated pages.

The diagram should feel like a technical system architecture, suitable for product marketing.

Layout: Horizontal left-to-right flow

Left Section (Source):
- Title: "Existing Divi Export" in indigo
- Icon: File/document icon in indigo
- Visual: Small rectangular mockup of an original Divi 5 page
  - Show a simple page structure (hero section with image, text, button)
  - Colour scheme visible (emerald button, dark blue heading, serif/sans fonts)
  - Dimensions: ~150px wide

Middle Section (Extraction & Registry):
- Transition arrow from source (indigo, 3px, pointing right)
- Central title: "Extract Design System" in indigo, with sparkle/AI icon
- Below, show the extracted components spreading out in three vertical lanes:

Lane 1 - Colour Palette:
- Title: "Palette" in slate
- Visual: 4-5 colour swatches in a row
  - Primary indigo, secondary emerald, accent amber, neutrals (slate, white)
  - Each swatch: 40x40px square with colour hex below

Lane 2 - Typography:
- Title: "Fonts" in slate
- Visual: Font samples
  - "Heading: Space Grotesk Bold" sample text
  - "Body: Inter Regular" sample text

Lane 3 - Presets:
- Title: "Presets" in slate
- Visual: 3 preset component icons
  - Hero preset (large rectangular shape)
  - Button preset (small rounded rectangle)
  - Card preset (medium square)
  - Each labelled with preset name

All three lanes converge into a central box:
- Title: "Brand System Registry" in bold indigo
- Visual: Folder/database icon
- Background: Very light indigo (#f0f4ff)

Right Section (New Pages):
- Arrow from registry (indigo, 3px) pointing to the right
- Three example pages arranged vertically, each showing:
  - Page title: "Page 2", "Page 3", "Page 4" in slate
  - Checkmark icon (emerald, bold ✓)
  - Small page mockup (200px wide, 150px tall) showing:
    - Applied colour scheme (matching the extracted palette)
    - Typography applied (matching fonts)
    - Presets used (button shapes, card layouts from presets)
  - Each page looks visually consistent with the source export

Connecting Elements:
- Indigo arrows flowing left-to-right
- Emerald checkmarks on new pages
- Subtle drop shadows on boxes
- Rounded corners (8px border radius)

Overall Design:
- Balanced, symmetrical composition
- Light, spacious layout (generous padding)
- Modern technical diagram aesthetic
- Flat design, no 3D or gradients
- Clear hierarchy and data flow

Colour Scheme:
- Primary: Indigo (#6366f1) for titles, arrows, icons
- Success: Emerald (#10b981) for checkmarks and validation
- Neutral: Slate (#64748b) for secondary text
- Background: White (#ffffff) with very light indigo accents
- Component backgrounds: Very light indigo (#f0f4ff), white

Typography:
- Sans-serif (Inter-like)
- Main titles: 16px, bold, indigo
- Section titles: 14px, regular, slate
- Font/preset labels: 12px, regular
- Page labels: 13px, bold

Dimensions: 1400 x 900 pixels
Style: System architecture / data flow diagram
Mood: Technical, elegant, showing efficiency and automation
```

### Negative Prompts / Constraints

- No photographs
- No 3D arrows or beveled effects
- No clip art or cartoon graphics
- Avoid overwhelming visual complexity
- No hand-drawn or sketch style

### Usage Locations

- **Feature page** ("Brand Management" section)
- **Blog post** (technical explanation of preset-first workflow)
- **LinkedIn post** (carousel: "How to maintain brand consistency across pages")
- **Documentation** (developer/power-user guide)
- **Webinar slides**
- **Marketing email** (workflow explanation)

---

## Image 5: Before-and-After Timeline

**Filename:** `time-savings-timeline.png`  
**Purpose:** Quantify the ROI (days → minutes)  
**Target Audience:** Agencies, freelancers, decision makers (C-suite)  
**Marketing Objective:** Lead with time savings and productivity gains  
**Key Message:** Manual: 5 days → AI: 1 hour  
**Dimensions:** 1400×700px (2:1)  
**Aspect Ratio:** 2:1 / 14:7  

### Visual Composition

Side-by-side comparison of manual vs AI workflow, with clear time labelling.

**Left side (Before — Manual):**
- Title: "Manual Page Build" in slate
- Timeline showing phases vertically:
  - Design (2 days) — icon: paintbrush
  - Development (2 days) — icon: code brackets
  - QA (1 day) — icon: checklist
  - Total: **5 days** in large red/amber text
- Colour: Light slate background (#f1f5f9) with red accent for slowness

**Right side (After — AI):**
- Title: "Divi5Generate" in indigo
- Timeline showing phases vertically:
  - Brief Chat (5 min) — icon: chat bubble
  - AI Generation (30 min) — icon: sparkles
  - Import & QA (15 min) — icon: upload
  - Total: **~50 minutes** in large emerald text
- Colour: Light indigo background (#f0f4ff) with emerald accent for speed

**Middle divider:**
- Large arrow or "→" pointing from left to right
- Text: "98% faster" in emerald, bold

**Bottom:**
- Summary metric: "From 40 billable hours to 2" or "From weeks to minutes"
- Icon: Clock or hourglass

**Visual Elements:**
- Use different colours to show the time difference:
  - Red/amber for slow manual process
  - Emerald for fast AI process
- Icons for each phase (intuitive, clean)
- Timeline bars showing relative duration
- Clear typography hierarchy

**Style:** Comparison infographic  
**Colours:** Red/amber for "slow", emerald for "fast", indigo for branding  
**Typography:** Sans-serif, bold numbers, clear labels  
**Mood:** Compelling ROI, clear productivity gain  

### Full Generation Prompt

```
Create a compelling before-and-after comparison infographic showing the time savings of 
"Divi5Generate" versus manual page building. The design should feel modern and visually 
impactful, suitable for marketing and presentations.

Layout: Horizontal side-by-side comparison

Left Side - "Manual Page Build":
- Title: "Manual Page Build" in slate/dark text
- Background: Very light grey (#f1f5f9)
- Timeline (vertical breakdown of phases):
  1. Design Phase
     - Icon: Paintbrush icon (slate colour)
     - Label: "Design" in slate
     - Duration: "2 days"
     - Visual: Horizontal bar spanning 2 units
  2. Development Phase
     - Icon: Code brackets icon
     - Label: "Development" in slate
     - Duration: "2 days"
     - Visual: Horizontal bar spanning 2 units
  3. QA & Testing
     - Icon: Checklist icon
     - Label: "QA & Testing" in slate
     - Duration: "1 day"
     - Visual: Horizontal bar spanning 1 unit

Total Time Box (bottom):
- Large bold number: "5 DAYS"
- Text: "5 business days" in red/amber text (#ef4444)
- Background: Light red/pink (#fff0f0)
- Icon: Clock or hourglass in red

Right Side - "Divi5Generate":
- Title: "Divi5Generate" in indigo
- Background: Very light indigo (#f0f4ff)
- Timeline (vertical breakdown of phases):
  1. Chat & Brief
     - Icon: Chat bubble icon (indigo)
     - Label: "Chat & Brief" in indigo
     - Duration: "5 min"
     - Visual: Horizontal bar spanning tiny space
  2. AI Generation
     - Icon: Sparkles/stars icon (indigo)
     - Label: "AI Generation" in indigo
     - Duration: "30 min"
     - Visual: Horizontal bar spanning small space
  3. Import & Review
     - Icon: Upload/import icon (indigo)
     - Label: "Import & Review" in indigo
     - Duration: "15 min"
     - Visual: Horizontal bar spanning small space

Total Time Box (bottom):
- Large bold number: "~1 HOUR"
- Text: "~50 minutes" in emerald text (#10b981)
- Background: Light green (#f0fdf4)
- Icon: Lightning bolt or speed icon in emerald

Center - Impact Callout:
- Large arrow or divider (emerald, pointing right or down)
- Bold text overlay: "98% faster" in emerald, very large
- Sub-text: "From 40 billable hours to 2"

Bottom Section:
- Horizontal bar chart comparison:
  - "Manual" bar (long, red) labeling "5 days"
  - "AI" bar (short, emerald) labeling "~1 hour"
  - Visual representation of the massive time difference

Overall Design:
- Balanced two-column layout
- Clean, spacious composition
- Modern infographic style
- Clear visual hierarchy
- Flat design, no 3D effects
- High contrast between slow (red) and fast (emerald)

Colour Scheme:
- Left (slow): Red/amber (#ef4444) for duration, light grey background
- Right (fast): Emerald (#10b981) for duration, light indigo background
- Accent: Indigo (#6366f1) for titles and branding
- Neutral: Slate (#64748b) for text
- White backgrounds for timers/boxes

Typography:
- Sans-serif (Inter-like)
- Total time numbers: 36px, bold, red or emerald
- Phase labels: 14px, regular
- Duration times: 12px, medium
- Impact callout: 28px, bold, emerald
- Sub-text: 16px, regular, dark

Icons:
- Clean, minimalist icons (2px stroke weight)
- Indigo for right column, slate/red for left column
- 36-48px size

Dimensions: 1400 x 700 pixels (2:1 aspect ratio)
Style: Modern infographic, comparison chart
Mood: Compelling ROI, clear productivity gain, confidence-building
```

### Negative Prompts / Constraints

- No photorealistic images
- No overly complex visualizations
- No pie charts or confusing graph types (use simple bars/timelines)
- Avoid dark or heavy colour schemes (keep it clean and bright)
- No copyright-infringing designs

### Usage Locations

- **Landing page** (above fold, after hero, in value prop section)
- **Pricing/ROI page** (lead with productivity)
- **Sales presentation**
- **Product Hunt launch**
- **LinkedIn carousel** (each phase is one slide)
- **Email marketing** (case study)
- **Webinar thumbnail**
- **Blog post header** (ROI/productivity article)

---

## Generation Notes for All Images

### Technical Specifications

**File Format:** PNG-24 (RGB, 8-bit, no transparency unless specified)  
**Resolution:** 300 DPI equivalent at print size, or 72 DPI screen equivalent (use pixel dimensions above)  
**Colour Space:** sRGB (web-safe)  
**Font Handling:** Embed fonts or render as vector paths (no external font dependencies)

### Quality Checklist

Before final delivery, each image should:
- [ ] Match specified dimensions exactly
- [ ] Use only colours from the approved palette (Indigo, Emerald, Amber, Slate, White, Light greys)
- [ ] Have readable typography (minimum 12px for body text at screen sizes)
- [ ] Include proper contrast (WCAG AA minimum, ideally AAA)
- [ ] Avoid trademarked/copyrighted designs or patterns
- [ ] Look professional at both 1:1 scale and 50% scale (for thumbnails)
- [ ] Render cleanly on both light and dark backgrounds (test both)
- [ ] Have no spelling or grammar errors in any text
- [ ] Use consistent iconography style across all images

### Delivery Checklist

For each image:
- [ ] Save as PNG at specified dimensions
- [ ] Optimize file size (compress without loss of quality)
- [ ] Test rendering on web (Chrome, Safari, Firefox)
- [ ] Test on mobile (iPhone, Android)
- [ ] Test in dark mode if applicable
- [ ] Confirm colours are accurate on calibrated monitor
- [ ] Generate alt text for accessibility

---

## Summary Table

| Image | Filename | Dimensions | Primary Use | Priority |
|-------|----------|-----------|-------------|----------|
| 1. Hero Workflow | `hero-workflow.png` | 2400×1200px | Landing page hero | Tier 1 |
| 2. Chat UI + Preview | `chat-ui-preview.png` | 1600×1000px | Feature page, walkthrough | Tier 2 |
| 3. QA Gates | `qa-gates-validation.png` | 1200×800px | Quality differentiation | Tier 1 |
| 4. Brand Inheritance | `brand-inheritance-flow.png` | 1400×900px | Feature explanation | Tier 2 |
| 5. Time Savings | `time-savings-timeline.png` | 1400×700px | ROI messaging | Tier 1 |

