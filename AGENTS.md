# Divi5Generate — Agent Instructions (repo development)

This file is the **source of truth for agents working ON this repo**. It is distinct
from `CLAUDE.md`, which is the plugin's user-facing documentation (install, marketplace,
skill list) shipped to people who *install* the plugin — see the deviation note below.

## Environment

- environment: development   # development | test — NEVER production. SSWA preflight guard reads this line.

## Workflow — SSWA (single feature at a time)

This repo uses the **SSWA** workflow on top of OpenSpec. Read `openspec/` for specs and
change proposals. The full loop lives in the `sswa-single-feature-flow` skill; the
artifact format lives in `sswa-openspec-conventions`.

- One feature per branch: `sswa/<change-name>`, kebab-case, same name as the change folder.
- Preflight before every mutating command: env guard (above), one-feature lock, agent-sync.
- Phases of the loop: `/sswa:propose` (RED tests) → `/sswa:apply` (GREEN) → `/sswa:verify`
  (PR + promote to test env) → `/sswa:archive` (sync delta specs into `openspec/specs/`,
  move the change folder into `openspec/changes/archive/<YYYY-MM-DD>-<name>/`).
- Source of truth: `openspec/specs/` describes how the system behaves today. Never hand-edit
  it to describe future behaviour — that is what a change proposal is for.

Active & archived changes live under `openspec/changes/`. Specs are capabilities under
`openspec/specs/<capability>/spec.md`.

## Codebase familiarisation (do this FIRST, before Explore/grep)

This repo is pre-indexed in the `codebase-memory-mcp` graph (project name:
`Volumes-External-Divi5Generate`, ~22k nodes). Any agent — main session or
subagent spawned via the `Agent` tool — onboarding onto this codebase must
query that graph *before* falling back to blind `Grep`/`Read`/`Explore`
sweeps:

1. `codebase-memory-mcp__index_status` (project: `Volumes-External-Divi5Generate`)
   — confirm the index isn't stale; if it's drifted, `index_repository` to
   refresh before trusting it.
2. `codebase-memory-mcp__get_architecture` — packages, services, dependency
   clusters at a glance. Start here for "what does this repo look like".
3. `codebase-memory-mcp__search_code` / `search_graph` / `trace_path` — find
   symbols, call sites, and dependency paths without re-deriving them from
   scratch via grep.

Only reach for `Grep`/`Read`/the `Explore` agent for what the graph doesn't
cover: exact current file contents, recent uncommitted changes, or anything
the index hasn't ingested yet. When spawning a subagent (via the `Agent`
tool) to work in this repo, its prompt must explicitly tell it to check
`codebase-memory-mcp` first — subagents start with no memory of this file
and won't know to do this unless told.

## Stack & conventions

- **Frontend / local app** — split out 16/07/2026, same as the WordPress
  importer below: now a Pro-only Freemius Add-Ons download, private repo
  `Kieransaunders/wp-divi5-generator` (alongside the plugin, as `app/`). It's
  vanilla HTML/CSS/JS served by `server.js` (Express), no build step. A
  gitignored local checkout may exist at `plugin/divi5-generator/app/` on
  disk here but isn't tracked in this repo.
- **WordPress importer** — split into its own **private** repo, 16/07/2026
  (`github.com/Kieransaunders/divi5-generator`, not in this working tree beyond a
  gitignored local checkout at `plugin/divi5-generator/`). Reason: its Pro-gating
  source (`PageCompiler.php`, `RestApi.php`, `Limits.php`, `DbExporter`/`DbImporter`)
  can't sit in this now-public toolkit repo without exposing the mechanism the
  Freemius Pro gate depends on. PHP, flat-file `require_once` convention (no
  autoloader), PHPUnit ^9 (`composer test`) — same as before, just a different repo.
  See `docs/PRD.md` §3.1 and the split rationale there.
- **Skills (`skills/<name>/SKILL.md`)**: frontmatter (`name`, `description`) is mandatory —
  Claude uses `description` to decide when to invoke. After editing a skill, `git push`
  → restart Desktop or `/reload-plugins`.
- **SEO plugin support**: the importer detects the active SEO plugin and writes native meta
  keys for Yoast, Rank Math, AIOSEO, SEOPress, TSF, or neutral `_dti_seo_*` fallback. See
  `openspec/specs/seo-meta-persistence/spec.md` (the source of truth) and
  `src/Seo/` in the plugin's own repo (`Kieransaunders/divi5-generator`, private).

## Output location (generated artefacts)

Generated pages, sections, previews, tokens, SEO meta and `generate-*.js` scripts **must
never be written into this repo**. Canonical output folder:

- `process.env.DIVI5_OUT` if set, otherwise `~/Desktop/Divi5 Pages`.

The app's `server.js` (now in the separate private repo) enforces this. `.gitignore` has a safety-net for stray root artefacts.

## Deviation from SSWA agent-sync guard (intentional)

SSWA expects `CLAUDE.md` to be a symlink to this file so both stay in sync. **This repo
intentionally does NOT do that.** Here, `CLAUDE.md` is the plugin's user-facing docs
(install commands, marketplace registration, skill table, SEO-adapter support matrix) read
by people who install the Divi5Generate plugin into Claude Code. `AGENTS.md` is the
developer-facing instructions for agents working on the repo. They have different audiences
and must remain separate files. SSWA preflight step 2 will report `NOT_SYMLINKED` here —
that is expected and acknowledged; do not "fix" it by symlinking.
