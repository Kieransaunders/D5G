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

## Stack & conventions

- **Frontend (`app/public/`)**: vanilla HTML/CSS/JS served by `app/server.js` (Express).
  **No build step.** A reskin is in progress against the Claude Design mockup — see
  `app/REDESIGN-PLAN.md` for the phased plan and `app/redesgn /` for the mockup source.
  Each phase ships as its own SSWA change.
- **WordPress importer (`plugin/divi5-generator/`)**: PHP, flat-file `require_once`
  convention (no autoloader). Tests via PHPUnit ^9 (`composer test`); the test bootstrap
  stubs WP functions so no WP load is needed.
- **Skills (`skills/<name>/SKILL.md`)**: frontmatter (`name`, `description`) is mandatory —
  Claude uses `description` to decide when to invoke. After editing a skill, `git push`
  → restart Desktop or `/reload-plugins`.
- **SEO plugin support**: the importer detects the active SEO plugin and writes native meta
  keys for Yoast, Rank Math, AIOSEO, SEOPress, TSF, or neutral `_dti_seo_*` fallback. See
  `openspec/specs/seo-meta-persistence/spec.md` (the source of truth) and
  `plugin/divi5-generator/src/Seo/`.

## Output location (generated artefacts)

Generated pages, sections, previews, tokens, SEO meta and `generate-*.js` scripts **must
never be written into this repo**. Canonical output folder:

- `process.env.DIVI5_OUT` if set, otherwise `~/Desktop/Divi5 Pages`.

`app/server.js` enforces this. `.gitignore` has a safety-net for stray root artefacts.

## Deviation from SSWA agent-sync guard (intentional)

SSWA expects `CLAUDE.md` to be a symlink to this file so both stay in sync. **This repo
intentionally does NOT do that.** Here, `CLAUDE.md` is the plugin's user-facing docs
(install commands, marketplace registration, skill table, SEO-adapter support matrix) read
by people who install the Divi5Generate plugin into Claude Code. `AGENTS.md` is the
developer-facing instructions for agents working on the repo. They have different audiences
and must remain separate files. SSWA preflight step 2 will report `NOT_SYMLINKED` here —
that is expected and acknowledged; do not "fix" it by symlinking.
