# Divi5Generate Plugin

Standalone Claude Code plugin. This repo IS the plugin — root = plugin root.

## Structure

```
Divi5Generate/
├── .claude-plugin/
│   ├── plugin.json          # plugin name, version, description
│   └── marketplace.json     # advertises this repo as a single-plugin marketplace
├── skills/
│   └── <skill-name>/
│       └── SKILL.md         # frontmatter + instructions
├── commands/
├── docs/
├── app/                     # Node builder library (page generator)
└── plugin/                  # WordPress importer plugin (PHP)
```

## Install on a new machine

```bash
claude plugin marketplace add Kieransaunders/Divi5Generate
claude plugin install divi5generate@divi5generate
```

Then open Claude Code Desktop — it picks up the install automatically from `~/.claude`.

## Plugin registration (settings.json)

```json
"extraKnownMarketplaces": {
  "divi5generate": { "source": { "source": "git", "url": "https://github.com/Kieransaunders/Divi5Generate.git" } }
},
"enabledPlugins": {
  "divi5generate@divi5generate": true
}
```

## Skills

All 7 skills live in `skills/`. Each `SKILL.md` requires:

```yaml
---
name: skill-name
description: "What it does and when to use it. Triggers: keyword1, keyword2."
---
```

`description` is **mandatory** — Claude uses it to decide when to invoke the skill.

After editing a skill: `git push` → restart Desktop or run `/reload-plugins`.

## Testing locally (no push needed)

```bash
claude --plugin-dir /Volumes/External/Divi5Generate
```

Run `/reload-plugins` inside the session to pick up edits without restarting.

## Desktop vs CLI

- **Desktop** pulls from GitHub on load — a `git push` is required for changes to appear.
- **CLI** with `--plugin-dir` reads local files directly.

## Deploying a change

1. Edit skill/command/agent
2. `git add -A && git commit -m "..." && git push`
3. Restart Desktop or `/reload-plugins`

## Skills in this plugin

| Skill | Purpose |
|---|---|
| `divi5-page-generator` | Generate SEO-optimised Divi 5 page JSON |
| `import-to-local` | Import JSON into WordPress via REST API, open preview |
| `design-review` | Audit Divi 5 JSON for structure, SEO, spec compliance |
| `divi5-extract-style` | Extract brand tokens from a Divi 5 export |
| `divi5-style-check` | Validate CSS/style consistency |
| `divi5-plugin-dev` | Custom Divi 5 module/plugin development |
| `divitheatre-engine` | Theatre.js motion engine reference |
