# Plan: Westway Cinema → Claude Design System

Date: 2026-06-23

## What's already done

- `skills/design-sync/SKILL.md` created — skill registered in plugin
- 4 card HTML files built in `/tmp/divi5-ds-westway-cinema/`:
  - `colors.html` — 7 palette swatches
  - `typography.html` — Poppins specimens (display/H2/eyebrow/body)
  - `voice.html` — tagline, tone, CTA patterns
  - `page-westway-landing.html` — full landing page preview

**Note:** `/tmp/` is ephemeral — cards may need regenerating in a new session.

---

## New session steps

### 1. Authenticate

```
/design-login
```

Link your claude.ai account. Required once per machine.

### 2. Regenerate cards + push in one go

Start the app if not running:

```bash
node app/server.js
```

Then run:

```
/divi5generate:design-sync westway-cinema
```

The skill hits `localhost:3747`, builds the cards, and pushes via DesignSync.

### 3. If the skill can't find a Westway brand profile (none in DB yet)

Brand data is in `westway-cinema.tokens.js` and `westway-page-spec.json`. Tell it manually:

> "Build the brand cards from `westway-cinema.tokens.js` — dark `#292929`, accent `#AD3CA4`, font Poppins, voice: warm/local/Frome community cinema"

### 4. DesignSync call sequence (the skill handles this automatically)

1. `list_projects` — check for existing project
2. `create_project name="Westway Cinema Brand System"` — if none found
3. `finalize_plan` — lock 4 paths, `localDir=/tmp/divi5-ds-westway-cinema`
4. `write_files` — upload all 4 cards

### 5. Use it in Claude Design

Open `claude.ai/design` → new design → Design System pane shows:

- **Brand** group: Colors, Typography, Voice
- **Pages** group: Landing page preview

Describe a mockup ("create a membership sign-up page for Westway Cinema") and Claude Design pulls from the brand system.

---

## Reverse flow: mockup → Divi page

After designing in Claude Design:

1. Export as HTML
2. In new session: say "use this mockup as my brief" and attach/paste the HTML
3. The `design-sync` skill (pull flow) maps visual regions to Divi section types and hands off a structured brief to `divi5-page-generator`
