# Graph Report - .  (2026-06-23)

## Corpus Check
- Large corpus: 236 files · ~922,278 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1015 nodes · 1319 edges · 67 communities (55 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.83)
- Token cost: 449,881 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_WP Importer Plugin (PHP AuthSettings)|WP Importer Plugin (PHP: Auth/Settings)]]
- [[_COMMUNITY_App SQLite Data Layer|App SQLite Data Layer]]
- [[_COMMUNITY_BrandDesign-Sync Skills|Brand/Design-Sync Skills]]
- [[_COMMUNITY_Divi5 Module Build & Dynamic Content|Divi5 Module Build & Dynamic Content]]
- [[_COMMUNITY_Style Extraction (preview.js)|Style Extraction (preview.js)]]
- [[_COMMUNITY_Divi Builder Library|Divi Builder Library]]
- [[_COMMUNITY_Generator App Frontend (app.js)|Generator App Frontend (app.js)]]
- [[_COMMUNITY_GlyphToken Validation|Glyph/Token Validation]]
- [[_COMMUNITY_Divi5 Module & SEO Reference|Divi5 Module & SEO Reference]]
- [[_COMMUNITY_DiviTheatre Example Page|DiviTheatre Example Page]]
- [[_COMMUNITY_Style-Check Tool|Style-Check Tool]]
- [[_COMMUNITY_JSON Validator|JSON Validator]]
- [[_COMMUNITY_Emitter Hardening  DiviTheatre|Emitter Hardening / DiviTheatre]]
- [[_COMMUNITY_Rub-You-Well Generator|Rub-You-Well Generator]]
- [[_COMMUNITY_Example Page Generator|Example Page Generator]]
- [[_COMMUNITY_Taste  Anti-Slop Check|Taste / Anti-Slop Check]]
- [[_COMMUNITY_Preset Ingest|Preset Ingest]]
- [[_COMMUNITY_Phase2 Tests|Phase2 Tests]]
- [[_COMMUNITY_Theatre.js Baked State|Theatre.js Baked State]]
- [[_COMMUNITY_Pet-Rescue Generator|Pet-Rescue Generator]]
- [[_COMMUNITY_DB ExportImport (PHP)|DB Export/Import (PHP)]]
- [[_COMMUNITY_Builder package.json|Builder package.json]]
- [[_COMMUNITY_Brand Profile Extraction|Brand Profile Extraction]]
- [[_COMMUNITY_Chat E2E Tests|Chat E2E Tests]]
- [[_COMMUNITY_E2E Render Tests|E2E Render Tests]]
- [[_COMMUNITY_Taste Tests|Taste Tests]]
- [[_COMMUNITY_Phase0 Tests|Phase0 Tests]]
- [[_COMMUNITY_App package.json|App package.json]]
- [[_COMMUNITY_Phase4b Tests|Phase4b Tests]]
- [[_COMMUNITY_Server Tests|Server Tests]]
- [[_COMMUNITY_Style-Check Tests|Style-Check Tests]]
- [[_COMMUNITY_Preset Strategy & Import Guide|Preset Strategy & Import Guide]]
- [[_COMMUNITY_Preset-First Workflow|Preset-First Workflow]]
- [[_COMMUNITY_SSRF Guard|SSRF Guard]]
- [[_COMMUNITY_Preset Mutation|Preset Mutation]]
- [[_COMMUNITY_Smoke Tests|Smoke Tests]]
- [[_COMMUNITY_App Generation UI Helpers|App Generation UI Helpers]]
- [[_COMMUNITY_Marketplace Manifest|Marketplace Manifest]]
- [[_COMMUNITY_App Data Model & Tabs|App Data Model & Tabs]]
- [[_COMMUNITY_REST API & Local Mac App|REST API & Local Mac App]]
- [[_COMMUNITY_Rub-You-Well Presets|Rub-You-Well Presets]]
- [[_COMMUNITY_BrandDesign UI Tabs|Brand/Design UI Tabs]]
- [[_COMMUNITY_ET Preset Setup|ET Preset Setup]]
- [[_COMMUNITY_Regression Tests|Regression Tests]]
- [[_COMMUNITY_Plugin & Skills Overview|Plugin & Skills Overview]]
- [[_COMMUNITY_ET Page Cloning|ET Page Cloning]]
- [[_COMMUNITY_Brand Editor UI|Brand Editor UI]]
- [[_COMMUNITY_Page & SEO Importer (PHP)|Page & SEO Importer (PHP)]]
- [[_COMMUNITY_AI Page Generator Architecture|AI Page Generator Architecture]]
- [[_COMMUNITY_Chat UI Helpers|Chat UI Helpers]]
- [[_COMMUNITY_Two-Gate QA Workflow|Two-Gate QA Workflow]]
- [[_COMMUNITY_Fixture Generator|Fixture Generator]]
- [[_COMMUNITY_Variable-First Builder|Variable-First Builder]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 66|Community 66]]

## God Nodes (most connected - your core abstractions)
1. `divi5-page-generator Skill` - 18 edges
2. `divi5-plugin-dev SKILL` - 17 edges
3. `block()` - 15 edges
4. `withTheatre()` - 15 edges
5. `WP_REST_Request` - 14 edges
6. `prune()` - 14 edges
7. `applyPreset()` - 14 edges
8. `WP_REST_Response` - 13 edges
9. `merge()` - 13 edges
10. `dv()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Design-System Reuse Extractor` --semantically_similar_to--> `Taste / Aesthetic System (5 palettes)`  [INFERRED] [semantically similar]
  DESIGN-SYSTEM-REUSE.notes.md → docs/product-overview.md
- `Local SQLite Schema (generations/output_files)` --conceptually_related_to--> `App Data Model (app/db.js SQLite)`  [INFERRED]
  docs/plans/2026-06-21-local-mac-app.md → DEVELOPMENT.md
- `Generator App index.html UI` --implements--> `Local Browser App (chat-primary)`  [INFERRED]
  app/public/index.html → README.md
- `Design-System Token Linting` --semantically_similar_to--> `validate.js (tokensByKey + glyph set)`  [INFERRED] [semantically similar]
  docs/plans/2026-06-18-variable-first-builder-design.md → .planning/phases/00-prep-emitter-hardening/00-01-PLAN.md
- `/launch command (start app)` --references--> `Generator App index.html UI`  [INFERRED]
  commands/launch.md → app/public/index.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Two-Gate QA Pipeline (generate → style-check → import → design-review)** — readme_skill_pagegenerator, readme_skill_stylecheck, readme_skill_importtolocal, readme_skill_designreview [EXTRACTED 0.90]
- **Four-Layer Generator Architecture** — product_overview_skilllayer, product_overview_builderlibrary, product_overview_importplugin, product_overview_validator [EXTRACTED 0.90]
- **Phase 0 Emitter Hardening (validate.js + divi-builder.js + glyphs.js)** — 00_prep_emitter_hardening_00_01_plan_validatejs, 00_prep_emitter_hardening_00_01_plan_dividbuilder, 00_prep_emitter_hardening_00_01_plan_glyphsjs [EXTRACTED 0.85]
- **Agency Starter-kit: extract → store → deploy** — brand_extract_skill, divi5_brand_profile_schema, brand_deploy_skill, divi_tools_importer_readme [EXTRACTED 0.90]
- **Two-tier render-safety gate (lint + live verify)** — render_fault_finder_render_safety_js, render_fault_finder_verify_rendered_js, divi5_page_generator_validate, divi_tools_importer_import_endpoint [EXTRACTED 0.85]
- **Chat → GEN_INTENT → page generation** — plans_chat_driven_gen_intent_marker, divi5_page_generator_design_project_mode, plans_chat_driven_brand_profile_entity, plans_chat_driven_design_project_entity [EXTRACTED 0.85]
- **Three Parallel Module Components in Sync** — skill_module_json, skill_php_server_index, skill_jsx_index [EXTRACTED 1.00]
- **DiviTheatre Animation Wiring (project/sheet/object/play)** — core_api_getproject, core_api_sheet_object, core_api_onvalueschange, baked_state_schema_sheetsbyid [EXTRACTED 1.00]
- **Page Generation to Import Pipeline** — seo_validate_js, skill_style_check_js, skill_import_to_local, skill_preview_endpoint [INFERRED 0.85]

## Communities (67 total, 12 thin omitted)

### Community 0 - "WP Importer Plugin (PHP: Auth/Settings)"
Cohesion: 0.06
Nodes (26): DTI_SettingsPage, DTI_Auth, DTI_GlobalVariablesImporter, DTI_LibraryImporter, DTI_PageExporter, DTI_PagePreviewer, DTI_PagesLister, DTI_PresetManager (+18 more)

### Community 1 - "App SQLite Data Layer"
Cohesion: 0.05
Nodes (50): createBrandProfile(), createDesignProject(), Database, db, deleteBrandProfile(), deleteDesignProject(), EXPORTS_DIR, findDesignByBrandExport() (+42 more)

### Community 2 - "Brand/Design-Sync Skills"
Cohesion: 0.06
Nodes (53): brand-deploy Skill, Agency Starter-kit Workflow, brand-extract Skill, AI Tells (banned by default), Em-dash Ban (mechanical), design-review Skill, Taste — Anti-Slop Design Judgement, Three Dials (Variance/Motion/Density) (+45 more)

### Community 3 - "Divi5 Module Build & Dynamic Content"
Cohesion: 0.06
Nodes (43): Build Configuration (webpack + package.json), TypeScript Variant (@divi/* package imports), Webpack Externals (React/Divi globals), conversion-outline.json (D4->D5 migration), nonResponsiveAttributes & Regex Fallback, divi_module_dynamic_content_options filter, Dynamic Content Sources & Loop Builder, Loop Builder + Custom Post Type integration (+35 more)

### Community 4 - "Style Extraction (preview.js)"
Cohesion: 0.10
Nodes (36): args, deskVal(), doOpen, extractStyles(), FLEX_MAP, fs, globalColors, jsonFile (+28 more)

### Community 5 - "Divi Builder Library"
Cohesion: 0.17
Nodes (35): accordion(), applyGroupPreset(), applyPreset(), assertKnownPreset(), block(), blurb(), button(), codeBlock() (+27 more)

### Community 6 - "Generator App Frontend (app.js)"
Cohesion: 0.05
Nodes (18): BRAND_FONT_OPTIONS, briefLink, CHAT_EXAMPLES, chatCtx, chatHistory, chatInputEl, dropZone, exportInput (+10 more)

### Community 7 - "Glyph/Token Validation"
Cohesion: 0.06
Nodes (29): buildGlyphRe(), dashHits, { DEFAULT_GLYPH_SOURCE, buildGlyphRe }, etSystemGcids, glyphRe, path, tokensByKey, allGcidRefs (+21 more)

### Community 8 - "Divi5 Module & SEO Reference"
Cohesion: 0.07
Nodes (33): Divi 5 Module Attribute Reference, Row flexColumnStructure / Column flexType, Global Colour Variable Syntax ($variable()$), Heading Level (headingLevel in font value), HTML Workarounds (table/SVG inside innerContent), Divi 5 Module Catalogue (37 modules), Responsive Breakpoints, Known SSR / JSON Limitations (+25 more)

### Community 9 - "DiviTheatre Example Page"
Cohesion: 0.07
Nodes (24): b, cGhost, content, cPlasma, cta, cVoid, cWhite, D (+16 more)

### Community 10 - "Style-Check Tool"
Cohesion: 0.07
Nodes (23): collectByKey(), colourMatch, colourNew, colourRawWarn, coveredTypes, fails, fontFails, fontWarns (+15 more)

### Community 11 - "JSON Validator"
Cohesion: 0.08
Nodes (22): allGcidRefs, ALLOWED_CHILDREN, allPresetRefs, args, CONTAINER_ONLY_CHILD, contents, definedColors, err() (+14 more)

### Community 12 - "Emitter Hardening / DiviTheatre"
Cohesion: 0.11
Nodes (23): divi-builder.js (emitter), glyphs.js (banned-glyph source of truth), htmlContent() escaping helper, Phase 0 Plan — Prep & Emitter Hardening, theatreAttrs() sole attributes writer, validate.js (tokensByKey + glyph set), DiviTheatre Consent Gate, DiviTheatre Presets + Skill Integration Plan (+15 more)

### Community 13 - "Rub-You-Well Generator"
Cohesion: 0.10
Nodes (17): b, content, cta, D, faq, faqs, footer, fs (+9 more)

### Community 14 - "Example Page Generator"
Cohesion: 0.10
Nodes (20): b, BODY_DARK, content, D, DARK, darkHero, faq, FEAT_IMGS (+12 more)

### Community 15 - "Taste / Anti-Slop Check"
Cohesion: 0.10
Nodes (15): AI_TELL_RE, AI_TELL_WORDS, aiTells, emExamples, errors, eyebrowMax, eyebrowModules, fs (+7 more)

### Community 16 - "Preset Ingest"
Cohesion: 0.10
Nodes (17): base, colorHex, colorId, colorRef, dir, doc, fs, outlinePath (+9 more)

### Community 17 - "Phase2 Tests"
Cohesion: 0.11
Nodes (15): changesPath, EXAMPLES, failures, fs, INGEST, MUTATE, mutatedPath, os (+7 more)

### Community 18 - "Theatre.js Baked State"
Cohesion: 0.16
Nodes (18): Baked Theatre.js State Schema, BasicKeyframedTrack / handles (easing), sheetsById / definitionVersion top-level shape, core.types prop constructors, createRafDriver (custom tick source), getProject(id, { state }), obj.onValuesChange (per-frame DOM write), project.sheet / sheet.object (+10 more)

### Community 19 - "Pet-Rescue Generator"
Cohesion: 0.11
Nodes (14): b, content, ctaBand, D, directory, footer, fs, hero (+6 more)

### Community 21 - "Builder package.json"
Cohesion: 0.12
Nodes (15): author, description, devDependencies, pixelmatch, playwright, pngjs, directories, example (+7 more)

### Community 22 - "Brand Profile Extraction"
Cohesion: 0.15
Nodes (10): collectPresets(), extractBrandProfileFromExport(), fs, parseExport(), path, assert, { extractBrandProfileFromExport }, fs (+2 more)

### Community 23 - "Chat E2E Tests"
Cohesion: 0.13
Nodes (11): assert, DATA_DIR, ENV, FAKE_CLAUDE, fs, http, os, path (+3 more)

### Community 24 - "E2E Render Tests"
Cohesion: 0.13
Nodes (10): creds, failures, fs, GOLDEN_DIR, GOLDEN_FILE, http, https, os (+2 more)

### Community 25 - "Taste Tests"
Cohesion: 0.13
Nodes (5): fs, os, path, { spawnSync }, TASTE

### Community 26 - "Phase0 Tests"
Cohesion: 0.16
Nodes (12): D, eq(), EXAMPLES, failures, fs, glyphs, ok(), path (+4 more)

### Community 27 - "App package.json"
Cohesion: 0.15
Nodes (12): dependencies, better-sqlite3, express, multer, description, main, name, scripts (+4 more)

### Community 28 - "Phase4b Tests"
Cohesion: 0.15
Nodes (9): D, failures, fs, os, path, SCRIPTS, { spawnSync }, tmp (+1 more)

### Community 29 - "Server Tests"
Cohesion: 0.17
Nodes (11): assert, DATA_DIR, fs, http, makeDesign(), os, path, request() (+3 more)

### Community 30 - "Style-Check Tests"
Cohesion: 0.15
Nodes (8): assert, fs, os, path, SCRIPT, { spawnSync }, test, tmpFiles

### Community 31 - "Preset Strategy & Import Guide"
Cohesion: 0.20
Nodes (12): Divi 5 Tools Developer Guide, ET Pack Clone-First Path, Divi Tools Importer Plugin, PageImporter.php, Hybrid Inline+Dedupe Preset Strategy, applyPreset() inlining pattern, Buttons require enable:'on', Per-page CSS cache clearing (+4 more)

### Community 32 - "Preset-First Workflow"
Cohesion: 0.21
Nodes (10): api(), D, fetchRegistry(), fs, http, importPage(), importPresetPack(), path (+2 more)

### Community 33 - "SSRF Guard"
Cohesion: 0.24
Nodes (10): BLOCKED_CIDRS, BLOCKED_SUFFIXES, blockedV4(), blockedV6(), ipInRange(), isSafeHost(), net, assert (+2 more)

### Community 34 - "Preset Mutation"
Cohesion: 0.18
Nodes (9): changes, doc, [exportFile, changesFile, outArg], fs, lost, outputPresets, path, ser (+1 more)

### Community 35 - "Smoke Tests"
Cohesion: 0.18
Nodes (9): EXAMPLES, failures, fs, gen, pagePath, path, ROOT, SCRIPTS (+1 more)

### Community 36 - "App Generation UI Helpers"
Cohesion: 0.20
Nodes (10): advanceStep(), appendLog(), loadGeneration(), loadLatestIntoCanvas(), renderFiles(), renderStyleCheckDetails(), renderVerdicts(), showHtmlPreview() (+2 more)

### Community 37 - "Marketplace Manifest"
Cohesion: 0.22
Nodes (8): description, name, owner, email, name, url, plugins, $schema

### Community 38 - "App Data Model & Tabs"
Cohesion: 0.28
Nodes (9): App Data Model (app/db.js SQLite), GEN_INTENT Chat Marker, Auto-promotion (promoteIfEligible), Generator App index.html UI, Brand Tab (Brand Profiles), Chat Tab (proposal cards), Designs Tab (Design Projects), Migrate Tab (DB pull/push) (+1 more)

### Community 39 - "REST API & Local Mac App"
Cohesion: 0.22
Nodes (9): Divi Tools REST API Contract, /launch command (start app), Generator App Improvement Plan, Import to WordPress button, launch.command self-starter, claude CLI subprocess driver, Local Mac App Plan, Electron Shell Architecture (+1 more)

### Community 40 - "Rub-You-Well Presets"
Cohesion: 0.22
Nodes (6): D, fs, http, path, SKILL_DIR, TOKENS

### Community 41 - "Brand/Design UI Tabs"
Cohesion: 0.28
Nodes (9): applyHash(), closeBrandEditor(), collectBrandEditor(), deleteBrandProfileUI(), deleteDesign(), loadBrandGrid(), loadDesignsList(), saveBrandProfile() (+1 more)

### Community 42 - "ET Preset Setup"
Cohesion: 0.22
Nodes (7): FREEBIE, fs, http, https, path, REGISTRY_OUT, SKILL_DIR

### Community 43 - "Regression Tests"
Cohesion: 0.22
Nodes (7): EXAMPLES, GOLDEN, path, ROOT, { spawnSync }, TASTE, VALIDATE

### Community 44 - "Plugin & Skills Overview"
Cohesion: 0.25
Nodes (8): Single-plugin Marketplace Registration, Divi5Generate Plugin, Plugin Skills (7 skills), extract-from-export.js, Brand Tokens File (.tokens.js), /help command (getting started), divi5-extract-style skill, divi5-page-generator skill

### Community 45 - "ET Page Cloning"
Cohesion: 0.36
Nodes (6): clone(), fs, list(), match(), PACK, path

### Community 46 - "Brand Editor UI"
Cohesion: 0.33
Nodes (7): addBrandColorRow(), emptyBrandData(), extractFromUrl(), fillFontSelects(), openBrandEditor(), paintBrandEditor(), renderBrandColorRows()

### Community 48 - "AI Page Generator Architecture"
Cohesion: 0.33
Nodes (6): Design-System Reuse Extractor, Divi 5 Global Variables & Presets (id-referenced), Layer 2 — Builder Library (divi-builder.js), Divi 5 AI Page Generator Overview, Layer 1 — AI Skill (landing-page), Taste / Aesthetic System (5 palettes)

### Community 49 - "Chat UI Helpers"
Cohesion: 0.33
Nodes (6): appendChatMsg(), appendIntentCard(), chatImport(), escapeHtml(), renderBrandCard(), sendChat()

### Community 50 - "Two-Gate QA Workflow"
Cohesion: 0.33
Nodes (6): Local Browser App (chat-primary), Divi5Generate README, Two-Gate QA Workflow, design-review skill (Gate 2), import-to-local skill, divi5-style-check skill (Gate 1)

### Community 51 - "Fixture Generator"
Cohesion: 0.33
Nodes (3): D, fs, path

### Community 52 - "Variable-First Builder"
Cohesion: 0.83
Nodes (4): colorRef() / variableRef() token API, Variable-First Builder Design, overlaySection() helper, Variable-First Builder Implementation Plan

## Knowledge Gaps
- **474 isolated node(s):** `$schema`, `name`, `description`, `name`, `email` (+469 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handle_import()` connect `WP Importer Plugin (PHP: Auth/Settings)` to `Page & SEO Importer (PHP)`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `divi5-page-generator Skill` (e.g. with `Landing Page Guide (HTML)` and `Pet Rescue Preview (HTML)`) actually correct?**
  _`divi5-page-generator Skill` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `$schema`, `name`, `description` to the rest of the system?**
  _492 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `WP Importer Plugin (PHP: Auth/Settings)` be split into smaller, more focused modules?**
  _Cohesion score 0.05649717514124294 - nodes in this community are weakly interconnected._
- **Should `App SQLite Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.05310734463276836 - nodes in this community are weakly interconnected._
- **Should `Brand/Design-Sync Skills` be split into smaller, more focused modules?**
  _Cohesion score 0.05878084179970972 - nodes in this community are weakly interconnected._
- **Should `Divi5 Module Build & Dynamic Content` be split into smaller, more focused modules?**
  _Cohesion score 0.06201550387596899 - nodes in this community are weakly interconnected._