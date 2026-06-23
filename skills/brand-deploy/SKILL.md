---
name: brand-deploy
description: "Deploy a saved Brand Profile (colours, variables, presets) from the Divi5Generator app to a target Divi 5 WordPress site — the agency starter-kit deploy step."
when_to_use: "User wants to push a captured brand/design system onto a new or blank Divi 5 site. Triggers: deploy brand, push brand, brand deploy, import brand to site, agency starter kit deploy, apply brand profile, copy brand to new site, divi brand deploy."
argument-hint: "[brand-profile-id] [site-url] [api-key]  — or omit to be prompted"
---

# Brand Deploy Skill

Push a saved Brand Profile's variables and presets to any Divi 5 WordPress site in one call. Completes the agency starter-kit workflow: extract once, deploy many times.

## Pre-requisites

- A saved Brand Profile in the app (run `/divi5generate:brand-extract` first if you haven't).
- **Divi Tools Importer v1.4+** installed and active on the **target** site.
- The **Divi5Generator app** running at `http://localhost:3747`.

## Steps

### 1. Gather inputs

If not provided, ask for:
- **Brand Profile ID** — the numeric ID returned by brand-extract, or list available profiles:
  ```bash
  curl -s http://localhost:3747/brand | python3 -m json.tool
  ```
- **Target site URL** — the new site to deploy to
- **Target site API key** — `dtik_…` from the new site's Settings → Divi Tools Importer

### 2. Deploy

```bash
curl -s -X POST http://localhost:3747/brand/<ID>/deploy \
  -H "Content-Type: application/json" \
  -d '{"site":"<SITE_URL>","key":"<API_KEY>"}'
```

Success response:
```json
{
  "ok": true,
  "site": "https://new-site.com",
  "variables": { "colors_imported": 6, "variables_imported": 12, "warnings": [] },
  "presets": { "imported_count": 8, "warnings": [] }
}
```

### 3. Report back

Tell the user what was deployed and flag any warnings. Then suggest:

> Brand deployed. Open the Divi Variable Manager on the new site to swap the client's hex values — the whole site updates instantly.

## Error reference

| Error | Fix |
|---|---|
| `brand profile not found` | Check the profile ID — list with `GET /brand` |
| `brand profile has no variables or presets data` | Profile was created without Divi data — re-extract with brand-extract |
| `401` from target site | Wrong API key for that site |
| `404` from target site | Plugin not installed on target site |
