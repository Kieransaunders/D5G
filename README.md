# D5G

Generator toolkit. Install only if you've been sent this link — it isn't listed anywhere.

## Install

```bash
claude plugin marketplace add Kieransaunders/D5G
claude plugin install divi5generate@divi5generate
```

Open Claude Code Desktop — it picks up the install from `~/.claude`. Node.js must be on PATH.

Run `/divi5generate:launch` to start the local app at `http://localhost:3747`.

## Skills

| Skill | What it does |
|-------|-------------|
| `divi5generate:divi5-page-generator` | Build a page from a brief |
| `divi5generate:divi5-extract-style` | Pull design tokens from an export or a brand guide |
| `divi5generate:divi5-style-check` | Check a generated page against a designer export |
| `divi5generate:design-review` | Audit an export, or compare an import against a brief |
| `divi5generate:divi5-deploy` | Push to a site — import, publish, screenshot, menus |
| `divi5generate:launch-app` | Start the local app |
| `divi5generate:divi5-brand-profile` | Manage brand profiles |
| `divi5generate:brand-extract` | Pull a brand profile from a live site |
| `divi5generate:brand-deploy` | Push a brand profile to a site |
| `divi5generate:design-sync` | Bridge a brand profile to a design-system project |
| `divi5generate:claude-design-to-divi` | Convert a design hand-off into an importable page |
| `divi5generate:divi5-variables-from-styleguide` | Convert a style guide into a variables file |
| `divi5generate:divi5-plugin-dev` | Scaffold, build, and debug builder modules |
| `divi5generate:divitheatre-engine` | Motion-engine reference |
| `divi5generate:divitheatre-section` | Generate a single animated section |
| `divi5generate:divi5-css-patterns` | CSS knowledge base |
| `divi5generate:divi5-compatibility` | Validation rules, fixes, conflicts |
| `divi5generate:divi5-performance` | Performance diagnostics |

## Commands

| Command | What it does |
|---------|-------------|
| `/divi5generate:launch` | Start the local app |
| `/divi5generate:help` | Connect a site and get an API key |

## Site connector

`divi5-deploy`, `brand-extract`, and `brand-deploy` need the companion site plugin (separate, private repo). `/divi5generate:help` walks through install and API key setup.
