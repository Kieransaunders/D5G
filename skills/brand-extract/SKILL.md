---
name: brand-extract
description: "Extract a brand profile from a live Divi 5 WordPress site — pulls global variables (colours, spacing, typography tokens) and presets via the Divi Tools Importer plugin, then saves the result as a reusable Brand Profile in the app database."
when_to_use: "User wants to capture the brand/design system from an existing Divi 5 site so it can be reused on new pages or deployed to a fresh site. Triggers: extract brand, capture brand, brand from site, pull brand from wordpress, extract divi brand, divi brand profile, extract design system, agency starter kit extract."
argument-hint: "[site-url] [api-key]  — or omit to be prompted"
---

# Brand Extract Skill

Pull the complete Divi 5 design system (global colours, variables, presets) from a live WordPress site and save it as a Brand Profile in the Divi5Generator app.

## Pre-requisites

- **Divi Tools Importer v1.4+** must be installed and active on the source site.
- The **Divi5Generator app** must be running locally (`http://localhost:3747`). If it isn't, tell the user to double-click `app/launch.command`.

## Steps

### 1. Gather credentials

If the user hasn't provided them, ask for:
- **Site URL** — e.g. `https://client-site.local` or `https://www.client.com`
- **API key** — starts with `dtik_`, found at **Settings → Divi Tools Importer**
- **Profile name** (optional) — defaults to the site hostname

Never log or store the API key beyond the current request.

### 2. Call the app extract endpoint

```bash
curl -s "http://localhost:3747/brand/extract-divi?site=<SITE_URL>&key=<API_KEY>&name=<NAME>"
```

Success response:
```json
{ "id": 3, "name": "client.com", "colors": 6, "variables": 12 }
```

Report the profile ID, name, color count, and variable count to the user.

### 3. Handle errors

| Error | Cause | Fix |
|---|---|---|
| `variables export failed: 404` | Plugin not installed / old version | Install/update to v1.4+ |
| `variables export failed: 401` | Wrong API key | Check Settings → Divi Tools Importer |
| `blocked: private/loopback` | App can't reach that host | Use the public URL or ensure the site is accessible |
| `fetch failed` | Site down or wrong URL | Verify the site URL |

### 4. Open the app

```bash
open "http://localhost:3747"
```

If `open` isn't available (non-Mac), use `xdg-open` or tell the user to navigate to that URL.

### 5. Report back

Tell the user:

> **Brand profile saved** (ID: `<id>`, name: `<name>`)
> - `<colors>` global colours captured
> - `<variables>` design variables captured
>
> The app is open — click the **Brand** tab to review and edit the profile.
>
> Next:
> - Generate pages that use this brand: `/divi5generate:divi5-page-generator`
> - Deploy this brand to a new site: `/divi5generate:brand-deploy`

## What gets captured

| Data | Source endpoint |
|---|---|
| Global colours (`gcid-…`) | `GET /wp-json/divi-tools/v1/global-variables/export` |
| Design variables (spacing, radii, font sizes) | same |
| Module presets (buttons, text, cards) | `GET /wp-json/divi-tools/v1/presets/export` |

Typography (font family names) is captured if set as a variable. If the theme uses hardcoded font stacks, suggest the user add them as variables first.
