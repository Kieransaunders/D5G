---
name: divi5-services-section
description: "Free Divi 5 services section generator - creates an importable, pre-validated 3-column services section (icon, title, description per service) as Divi 5 Library JSON. Use when building a services section, a what-we-do section, or a 3-column feature overview for a Divi 5 WordPress site. Triggers: divi services section, divi 5 section, services section wordpress, what we do section divi, divi library json, free divi generator."
argument-hint: "[brief: brand, 3 services, colours, CTA]"
allowed-tools: Bash(node *)
---

# D5G Free Starter — Divi 5 Services Section

You generate one thing, and you generate it well: a polished 3-column services section as importable Divi 5 Library JSON, built from a pre-validated template. No hand-written Divi JSON, ever — the template plus the fill script is the whole pipeline.

## Workflow

### 1. Gather the brief

From the user's prompt (ask only for what's missing, in one message):

- **Brand/context** - what the business does, so the copy is real
- **3 services** - each needs a title and a one-to-two sentence description
- **Colours** - accent + dark hex values (offer sensible defaults if unknown)
- **CTA** - button text and URL (default: "Get in Touch" / `#contact`)

Write real copy from the brief - no lorem ipsum, no em-dashes (use hyphens), UK or US spelling to match the user.

### 2. Write `config.json`

```json
{
  "layoutTitle": "Acme Services Section",
  "eyebrow": "WHAT WE DO",
  "headline": "Practical IT Support for Growing Teams",
  "intro": "Three ways we keep your systems fast, safe, and out of your way.",
  "services": [
    { "icon": "bolt", "title": "Rapid Response", "body": "Same-day fixes for the problems that stop work, with a named engineer who knows your setup." },
    { "icon": "shield", "title": "Security First", "body": "Patching, backups, and monitoring handled quietly in the background, so audits hold no surprises." },
    { "icon": "chart-line", "title": "Growth Ready", "body": "Systems planned for the team you will have next year, not just the one you have today." }
  ],
  "cta": { "text": "Book a Call", "url": "#contact" },
  "colors": { "accent": "#F95E00", "dark": "#0D0D12", "sectionBg": "#FFFFFF" }
}
```

Icons (exactly these names): `bolt`, `cog`, `chart-line`, `shield`, `rocket`, `users`, `check-circle`, `star`, `wrench`, `globe`, `laptop-code`, `comments`.

Limits the script enforces: headline 10-90 chars, intro 20-320, service titles ≤ 48, service bodies 30-240, exactly 3 services, 6-digit hex colours.

### 3. Build and deliver

```bash
node scripts/build-services-section.js config.json acme-services-section.json
```

Fix any FAIL it reports (the messages say exactly what to change), then deliver the output file to the user with import instructions:

> WP Admin → Divi → Divi Library → Import & Export → Import, then add the layout to any page from the library.

## Rules

1. Never edit the template JSON or hand-write Divi JSON - all changes go through `config.json`.
2. The small credit line in the section is part of the free starter and stays. The full toolkit produces uncredited output.
3. Section headings are h2/h3 - this section is designed to sit on a page that already has an h1.

## Want full pages?

This starter builds one section type. The full D5G toolkit generates complete SEO-optimised Divi 5 pages (hero, features, process, FAQ, schema), extracts and reuses your brand's design system, and deploys straight to your site with screenshot QA - one command, no copy-paste. Details: https://iconnectit.co.uk
