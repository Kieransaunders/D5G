---
name: brand-extract
description: "Extract a brand profile from a LIVE Divi 5 WordPress site via the Divi5 Generator plugin — pulls global variables (colours, spacing, typography tokens) and presets, then saves them as a reusable Brand Profile in the app database. Use when capturing the design system from an existing live site so it can be reused or deployed elsewhere (for a JSON export file instead, use divi5-extract-style). Triggers: extract brand, capture brand, brand from site, pull brand from wordpress, extract divi brand, extract design system, agency starter kit extract."
argument-hint: "[site-url] [api-key]  — or omit to be prompted"
---

# Brand Extract Skill

Pull the complete Divi 5 design system (global colours, variables, presets) from a live WordPress site and save it as a Brand Profile in the Divi5Generator app.

## Pre-requisites

- **Divi5 Generator v1.7+** must be installed and active on the source site.
- The **Divi5Generator app** must be running locally (`http://localhost:3747`). If it isn't, tell the user to double-click `app/launch.command`.
- This flow curls `localhost`. In an environment that can't reach the user's Mac (e.g. a sandboxed/Cowork session), `localhost:3747` is refused — run under Claude Code on the Mac, or target a public URL / the browser extension.

## Steps

### 1. Gather credentials

If the user hasn't provided them, ask for:
- **Site URL** — e.g. `https://client-site.local` or `https://www.client.com`
- **API key** — starts with `d5gk_`, found at **Settings → Divi5 Generator**
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
| `variables export failed: 401` | Wrong API key | Check Settings → Divi5 Generator |
| `blocked: private/loopback` | App can't reach that host | Use the public URL or ensure the site is accessible |
| `fetch failed` | Site down or wrong URL | Verify the site URL |

### 4. Open the app at the new profile

```bash
open "http://localhost:3747/#brand/<id>"
```

This deep-links directly to the Brand tab and opens the profile editor. If `open` isn't available (non-Mac), use `xdg-open`.

### 5. Report back

Tell the user:

> **Brand profile saved** (ID: `<id>`, name: `<name>`)
> - `<colors>` global colours captured
> - `<variables>` design variables captured
>
> The app is open directly on the new brand profile — review and edit it there.
>
> Next:
> - Generate pages that use this brand: `/divi5generate:divi5-page-generator`
> - Deploy this brand to a new site: `/divi5generate:brand-deploy`

## What gets captured

| Data | Source endpoint |
|---|---|
| Global colours (`gcid-…`) | `GET /wp-json/divi5-generator/v1/global-variables/export` |
| Design variables (spacing, radii, font sizes) | same |
| Module presets (buttons, text, cards) | `GET /wp-json/divi5-generator/v1/presets/export` |

Typography (font family names) is captured if set as a variable. If the theme uses hardcoded font stacks, suggest the user add them as variables first.

### When the export endpoints fail

These endpoints can fail on a real site even when the data plainly exists:

- `global-variables/export` returns **non-200** (seen: HTTP 500 when named semantic slots resolve as references rather than carrying their own hex).
- `presets/export` returns `{"presets":[]}` (empty).

Fallbacks:

- **Colours:** recover from the migrator's `GET /wp-json/divi5-generator/v1/db/export` — grep the dump for `gcid-*` slugs and the adjacent hex values (this is how `gcid-primary/-secondary/-heading/-body/-link` were recovered).
- **Always report counts explicitly** (e.g. "0 presets", "10 colours"). When presets come back empty, do **not** silently accept `[]` — tell the user to confirm in the Divi UI that presets exist.
- If `global-variables/export` 500s, tell the user to enable `WP_DEBUG` / `WP_DEBUG_LOG` and re-run so the trace is captured for the plugin fix.
