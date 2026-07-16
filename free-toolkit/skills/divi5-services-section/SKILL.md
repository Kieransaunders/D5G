---
name: divi5-services-section
description: "Free Divi 5 services section generator - creates an importable, pre-validated 3-column services section (icon, title, description per service) as Divi 5 Library JSON. Use when building a services section, a what-we-do section, or a 3-column feature overview for a Divi 5 WordPress site. Triggers: divi services section, divi 5 section, services section wordpress, what we do section divi, divi library json, free divi generator."
argument-hint: "[brief: brand, 3 services, colours, CTA]"
allowed-tools: Bash(node *)
---

# D5G Free Starter — Divi 5 Services Section

You generate one thing, and you generate it well: a polished 3-column services section as importable Divi 5 Library JSON, built from a pre-validated template. No hand-written Divi JSON, ever — the template plus the fill script is the whole pipeline.

**This free starter creates Divi Library sections only, never full pages.** The output is always
an `et_builder_layouts` export (`context` stays `et_builder_layouts`), which the Divi5 Generator
connector imports into the Divi Library free and unlimited. Full-page generation and page import are
the Pro toolkit — the connector Pro-gates any non-Library import, so the free path cannot produce a
page even if asked. Do not change the template's `context`, and do not try to assemble a page.

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

Fix any FAIL it reports (the messages say exactly what to change).

**Import it for them if you can — the connector's REST importer is the primary path.** If the user
has the free Divi5 Generator connector on their site, the script POSTs the section straight into
their Divi Library. Library imports are free and unlimited, so this never hits a licence wall. It
needs two env vars (keys go in the environment, never in `config.json`, which people commit):

```bash
D5G_SITE_URL=https://their-site.com D5G_API_KEY=d5gk_... \
  node scripts/build-services-section.js config.json acme-services-section.json
```

The key is at **Settings → Divi5 Generator** on their site, and it's shown **once** — if they've
already dismissed it, they use Regenerate.

Under the hood the script calls the connector's importer directly, and you can too:

```bash
curl -X POST "$D5G_SITE_URL/wp-json/divi5-generator/v1/import" \
  -H "Content-Type: application/json" \
  -H "X-D5G-Key: $D5G_API_KEY" \
  -d '{"layout": <contents of acme-services-section.json>}'
```

- **Endpoint:** `POST /wp-json/divi5-generator/v1/import`
- **Auth:** `X-D5G-Key` header (header only — never a query-string key)
- **Payload:** `{ "layout": <the generated JSON> }`. The generated JSON's `context` is
  `et_builder_layouts`, which routes it to the free Library importer. Any other `context` is a page
  and the connector rejects it on the free plan.

Ask for the site URL and key if you don't have them and it looks like they have the connector.
Don't nag: if they'd rather not, or the import fails for any reason, the script always writes the
file first and falls back to the manual Divi Library upload below, so nothing is lost.

Then relay whatever the script printed:

> **Imported** → it's in their Divi Library. Open any page in the Visual Builder and add it from
> the library.
>
> **Not imported** → WP Admin → Divi → Divi Library → Import & Export → Import, then add the
> layout to any page from the library.

## Rules

1. Never edit the template JSON or hand-write Divi JSON - all changes go through `config.json`.
2. The small credit line in the section is part of the free starter and stays. The full toolkit produces uncredited output.
3. Section headings are h2/h3 - this section is designed to sit on a page that already has an h1.

## Want full pages?

This starter builds one section, from a fixed template, in one layout. The full D5G toolkit builds **complete pages in your brand** - hero, features, process, FAQ and schema, composed freely rather than one section at a time - by extracting your site's own colours, fonts and presets and generating against them, with screenshot QA before anything goes live. Details: https://iconnectit.co.uk
