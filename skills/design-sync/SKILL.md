---
name: design-sync
description: "Sync a Divi5Generate brand profile to a claude.ai/design Design System project, pushing colour-palette, typography, and voice reference cards so Claude Design has the brand ready when mocking up pages. Also pushes existing section/page preview HTML as reference cards. Reverse flow: accept a Claude Design HTML export as a visual brief for the page generator. Triggers: design sync, sync brand to claude design, claude design mockup, push brand to design, design system, brand cards, mockup brief."
argument-hint: "[brand-name-or-id] [--project <uuid>|new] [--port 3747]"
allowed-tools: Bash, Read, Write, DesignSync
---

# Design Sync — Brand Profile ↔ Claude Design

Bridges the Divi5Generate brand profile system with `claude.ai/design` Design System projects.

## Prerequisite — design-system auth (read first)

`DesignSync` talks to `claude.ai/design` through the user's **claude.ai login**. It does **not** work on an API-key or provider-token session — every call returns `DesignSync needs design-system authorization`. There is **no `/design-login` command in most environments**, despite what the error text suggests.

The only reliable way to get design scopes: relaunch Claude Code and pick **`/login` → "Claude account with subscription"** (a Pro/Max claude.ai account). If `/design-login` happens to exist in the user's build, that also works.

So before touching the push flow: if the first `DesignSync method=list_projects` call returns the auth error, **stop and tell the user to relaunch with a subscription login** — do not loop retrying. You can still build the card bundle (steps 1-3) on any session; only the push (step 4) needs auth. The pull-brief flow needs no auth at all.

## Two directions

| Direction | Trigger |
|---|---|
| **Push** — brand profile → Claude Design system | Default. Pushes colour, font, voice cards. |
| **Pull brief** — Claude Design HTML export → page gen brief | User pastes/provides a Claude Design export path. |

---

## Push flow

### 1. Resolve the brand

```bash
curl -s http://localhost:${PORT:-3747}/brand
```

If `args` names a brand, match by name (case-insensitive) or id. If multiple brands exist and none is specified, list them and ask the user to pick one.

### 2. Generate card HTML files to a temp dir

Write three files to `/tmp/divi5-ds-<brand-slug>/`:

#### `colors.html`
```html
<!-- @dsCard group="Brand" -->
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:system-ui,sans-serif;padding:24px;background:#f9f9f9;margin:0}
  h2{font-size:13px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.08em;margin:0 0 16px}
  .swatches{display:flex;gap:12px;flex-wrap:wrap}
  .swatch{width:72px;text-align:center}
  .dot{width:72px;height:72px;border-radius:12px;border:1px solid rgba(0,0,0,.08)}
  .label{font-size:11px;color:#444;margin-top:6px;word-break:break-all}
  .role{font-size:10px;color:#888}
</style></head><body>
<h2>BRAND_NAME Palette</h2>
<div class="swatches">SWATCH_HTML</div>
</body></html>
```

Replace `BRAND_NAME` with `brand.name`. Replace `SWATCH_HTML` with one `<div class="swatch">` per colour:
```html
<div class="swatch">
  <div class="dot" style="background:HEX"></div>
  <div class="label">HEX</div>
  <div class="role">ROLE</div>
</div>
```

#### `typography.html`
```html
<!-- @dsCard group="Brand" -->
<!DOCTYPE html><html><head><meta charset="UTF-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=HEADING_FAMILY:wght@400;700&family=BODY_FAMILY:wght@400;600&display=swap">
<style>
  body{font-family:system-ui,sans-serif;padding:24px;background:#f9f9f9;margin:0}
  .spec{margin-bottom:24px;padding:16px;background:#fff;border-radius:8px;border:1px solid #eee}
  .meta{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
  .heading-sample{font-family:'HEADING_FAMILY',serif;font-size:28px;font-weight:700;color:#1a1a1a;line-height:1.2}
  .body-sample{font-family:'BODY_FAMILY',sans-serif;font-size:15px;color:#444;line-height:1.6;margin-top:8px}
</style></head><body>
<div class="spec">
  <div class="meta">Heading - HEADING_FAMILY</div>
  <div class="heading-sample">The quick brown fox</div>
</div>
<div class="spec">
  <div class="meta">Body - BODY_FAMILY</div>
  <div class="body-sample">Pack my box with five dozen liquor jugs. The five boxing wizards jump quickly.</div>
</div>
</body></html>
```

Replace `HEADING_FAMILY`/`BODY_FAMILY` with values from `brand.fonts.heading.family` / `brand.fonts.body.family`. Use `system-ui` if a font is missing.

#### `voice.html`
```html
<!-- @dsCard group="Brand" -->
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:system-ui,sans-serif;padding:24px;background:#f9f9f9;margin:0}
  .card{background:#fff;border-radius:8px;border:1px solid #eee;padding:20px}
  .label{font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px}
  .tagline{font-size:20px;font-weight:700;color:#1a1a1a;margin-bottom:20px}
  .voice{font-size:14px;color:#444;line-height:1.6}
</style></head><body>
<div class="card">
  <div class="label">Tagline</div>
  <div class="tagline">TAGLINE</div>
  <div class="label">Voice &amp; Tone</div>
  <div class="voice">VOICE</div>
</div>
</body></html>
```

Replace `TAGLINE` and `VOICE` from `brand.tagline` / `brand.voice`. If either is empty, omit that block.

### 3. Optionally add page preview cards

```bash
curl -s http://localhost:${PORT:-3747}/generations | \
  node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
  d.filter(g=>g.status==='done' && g.brand==='BRAND_NAME').slice(0,5).forEach(g=>console.log(g.id,g.keyword));"
```

For each matching generation, fetch its preview HTML:
```bash
curl -s http://localhost:${PORT:-3747}/preview-html/ID > /tmp/divi5-ds-<brand-slug>/page-ID.html
```

Then prepend `<!-- @dsCard group="Pages" -->\n` to each fetched file.

### 4. Push to Claude Design

**List existing projects first:**
```
DesignSync method=list_projects
```

- If `--project <uuid>` was passed, use it (verify it's a design-system type with `get_project`).
- If `--project new` was passed, create one: `DesignSync method=create_project name="BRAND_NAME Brand System"`.
- If one project exists with the brand name, use it. Otherwise ask the user to pick or create.

**Finalize the plan:**
```
DesignSync method=finalize_plan
  projectId=<uuid>
  localDir=/tmp/divi5-ds-<brand-slug>
  writes=["colors.html","typography.html","voice.html","page-*.html"]
```

**Write files:**
```
DesignSync method=write_files
  projectId=<uuid>
  planId=<planId>
  files=[
    {path:"colors.html", localPath:"colors.html"},
    {path:"typography.html", localPath:"typography.html"},
    {path:"voice.html", localPath:"voice.html"},
    ... page files ...
  ]
```

### 5. Report

Tell the user:
- Project name and URL hint: `claude.ai/design` → Design System tab
- Cards pushed: `Brand/Colors`, `Brand/Typography`, `Brand/Voice`, `Pages/…`
- How to use: "Open claude.ai/design, open the project, and the brand palette/fonts appear in the Design System pane when you create a new mockup."

---

## Pull (brief) flow

Triggered when the user provides a path to an exported HTML file from Claude Design, or says "use this mockup as my brief".

1. Read the HTML file.
2. Extract visual intent: section types visible, color scheme, layout rhythm, CTA text, hero message.
3. Hand this off to the `divi5-page-generator` skill as a structured brief:
   - `brand`: from filename or user
   - `keyword`: infer from hero headline
   - `sections`: map visual regions to Divi section types
   - `palette`: hex values found in the HTML
4. Say: "Feeding this mockup into the page generator as a brief…" then invoke the generator.

---

## Port resolution

Default port: **3747** (`process.env.PORT || 3747`). Override with `--port N` in args or check:
```bash
curl -s http://localhost:3747/prereqs 2>/dev/null | grep -q '"ok"' && echo 3747 || echo "not running"
```

If the app is not running, tell the user to start it first (`node app/server.js` from the repo root).
