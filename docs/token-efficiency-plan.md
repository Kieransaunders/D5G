# Token & Time Efficiency Plan

Status: agreed — 03/07/2026 (open questions resolved, see Decisions; ready to propose as SSWA change `spec-first-generation`)
Companion to: `docs/divi-capability-compatibility-plan.md` (same root cause, one fix)

## Problem

A single page-mode run costs a large multiple of what it should, in both tokens and wall-clock time. Measured against the current `divi5-page-generator` workflow, the spend breaks down as:

| Cost | Source | Rough size per run |
|---|---|---|
| Output tokens ×3 | The page is authored three times: HTML mockup, `generate-*.js`, then rewrites of both on gate failures | 25-30KB HTML + 15-20KB JS + N× partial rewrites |
| Input tokens up front | SKILL.md + aesthetics + taste + layout-patterns + seo + module-reference + polish read before work starts | ~90KB (taste.md alone 24KB; overdrive adds bolder/delight/overdrive = +24KB) |
| Input tokens mid-run | "Read 2-3 matching ET section examples" = raw Divi exports into context | 50-200KB each |
| Gate loop overhead | 5 sequential gates (concept → taste → validate/taste-check → fidelity → visual-diff), each FAIL triggers a re-emit and re-run | multiplies everything above |
| Image tokens | Screenshot/refine loops in `import-to-local` + Stage 4 visual diff | ~1-2K tokens per screenshot × iterations |
| Agent fan-out | Any subagent re-reads the skill + references from scratch | full duplication per agent |

Output tokens are the expensive, slow kind. The dominant cost is not the references — it is **authoring the same content in two formats and repairing both across five gates**.

## Root cause

The HTML mockup is free-form. Because it is free-form:

- the generator script must be written separately (nothing can compile free-form HTML to Divi JSON),
- fidelity between the two must be *checked* (Stage 3.5) instead of being true by construction,
- Divi compatibility must be *policed* (the proposed `mockup-compat-check.js` heuristic HTML/CSS analyser),
- every fix touches two large artefacts.

The compatibility plan and the token problem are the same problem. Fix the artefact, and both gates collapse.

## Core change: spec-first generation

The agent authors **one artefact**: `page-spec.json`. Everything else is compiled deterministically.

```text
page-spec.json  ← the ONLY thing the agent writes and edits
    │
    ├── spec-to-html.js   → preview-[brand].html   (taste/approval gate, unchanged UX)
    └── spec-to-divi.js   → [brand]-landing-page.json + seo-meta + schema
        (thin wrapper over existing divi-builder.js helpers)
```

The spec is typed: sections, column ratios from the supported list, module types from the capability matrix, preset refs by name, copy, alt text, `theatre:` presets, SEO keyword slots. Illustrative shape:

```json
{
  "slug": "acme-landing",
  "aesthetic": "editorial-bold",
  "dials": { "variance": 7, "motion": 4, "density": 4 },
  "seo": { "primary": "…", "secondary": ["…"] },
  "sections": [
    {
      "type": "hero", "layout": "split-14-10", "preset": "Brand Section Light",
      "theatre": "hero-reveal",
      "modules": [
        { "kind": "heroHeading", "text": "…" },
        { "kind": "text", "text": "…" },
        { "kind": "button", "preset": "Brand Button Primary", "text": "…", "href": "…" }
      ]
    }
  ]
}
```

### What this buys

1. **Fidelity by construction.** HTML and Divi JSON come from the same spec. Stage 3.5 (`fidelity-check.js`) shrinks to a compiler smoke test; the most expensive fix loop disappears.
2. **Compatibility by schema.** The capability matrix from the compatibility plan becomes the spec's JSON Schema. An unsupported pattern is a schema validation error at authoring time — no heuristic HTML/CSS parser (`mockup-compat-check.js`) needed. The matrix doc is still worth generating from `attr-paths.json`, but its enforcement point is the schema, which cannot drift from the compiler because the compiler consumes the same vocabulary.
3. **Surgical fixes.** A gate failure means an `Edit` on a small JSON file, not re-emitting 30KB of HTML plus 20KB of JS.
4. **Output tokens ≈ copy + structure only.** The spec for a typical page is 4-8KB — roughly a 70-80% cut in authored output before counting saved fix loops.
5. **Mutate mode gets simpler too**: `ingest.js` can emit a spec from an existing export, and edits become spec edits.

The escape hatch stays: a `raw` module kind that takes explicit builder-helper calls, for the genuinely custom 5% — flagged WARN so it shows in the run report.

## Supporting changes (independent wins)

These pay off even before spec-first lands.

### 1. One gate command, compact output

`node scripts/gate.js all <slug>` runs concept-check, taste, validate, fidelity in sequence and prints **only FAILs/WARNs with a one-line fix hint each**. One command, one read, instead of four commands with verbose PASS noise. Exit non-zero on any FAIL so the agent never has to parse prose.

### 2. Outline, never read

- `node scripts/et-pages.js outline <file>` prints a compact structural outline of any Divi export (sections → ratios → module kinds → preset names). This replaces "read 2-3 matching examples" — the agent reads ~1KB instead of ~150KB.
- New non-negotiable rule in SKILL.md: **never `Read`/`cat` generated page JSON or raw reference exports — use `outline`, `validate.js`, `preview.js`.**

### 3. Reference diet

- `node scripts/ref.js aesthetic <name>` prints only the chosen preset's block from aesthetics.md; same for one layout recipe. The agent stops front-loading 90KB of markdown.
- Move every machine-checkable rule out of taste.md into `taste-check.js` (many already are — the doc duplicates the code). Target: taste.md ≤ 6KB of judgement-only guidance.
- Overdrive: collapse overdrive/bolder/delight into one `overdrive.md` ≤ 8KB; the delight-moment *catalogue* becomes data the gate can sample from, not prose to read.

### 4. Screenshot budget

- Fixed width (1280), full-page, one screenshot per gate attempt.
- Re-screenshot only after a fix is applied; hard cap the `import-to-local` refine loop at 3 iterations, then deliver with a WARN list rather than looping.
- `visual-diff.js` already gives a mismatch %; make it also name the worst-diff region (top/middle/bottom third) so a failure is actionable in one iteration.

### 5. No agent fan-out

One agent per page. Subagents each re-read the skill and references — pure duplication. If parallelism is ever wanted (multi-page site), hand each agent a finished spec and the compiler, never the full skill context.

## Expected impact

Per page-mode run, roughly:

- Authored output: ~50KB+ → ~6-10KB (spec + small edits) — **~80% cut** on the expensive token class.
- Up-front reference input: ~90-120KB → ~15-20KB.
- Gate iterations: typical 3-5 loops across two artefacts → 1-2 loops on one small artefact.
- Wall-clock: dominated today by re-emitting large files and screenshot loops; both are capped or eliminated.

## Phasing

**Phase 1 — quick wins, no architecture change (ship first):**
`gate.js all`, `et-pages.js outline`, `ref.js aesthetic`, "never read JSON" rule, screenshot caps, taste.md diet. Each is a small script or SKILL.md edit; all are independently testable.

**Phase 2 — spec-first (scratch builds only):**
Define `page-spec.schema.json` (vocabulary = current builder helpers + supported ratios/presets). Build `spec-to-html.js` and `spec-to-divi.js` as wrappers over `divi-builder.js`. Rewrite the page-mode workflow in SKILL.md around the spec. Keep `--scratch`/legacy path for one release as fallback. Scope guards (see Decisions below): copy stays inline in the spec; clone/mutate remain JSON-native; preview CSS is static per-aesthetic with no animation.

**Phase 3 — capability matrix as schema:**
Generate the matrix doc *and* the schema's allowed-values from `attr-paths.json` so neither drifts. Retire the planned heuristic `mockup-compat-check.js`; the export-first workflow for new capabilities (compatibility plan §Export-First) now ends with "add it to the schema" instead of "update the checker". Matrix coverage numbers (schema vocabulary vs `attr-paths.json`) are the prerequisite for `ingest-to-spec` — see Decision 2.

**SSWA change name:** `spec-first-generation` (supersedes the proposed `add-divi-compatibility-gate` — same goals, cheaper enforcement point).

## Decisions (03/07/2026)

The three open questions are resolved. None change the phase order; all say "don't gold-plate Phase 2, and don't let clone-conversion jump the queue ahead of proving schema coverage."

### 1. Copy stays in the spec — one pass

The dominant spend is authoring twice and fixing across five gates, not the copy itself. A separate copy pass adds a coordination step (structure model → copy model → merge → validate) to optimise a part that isn't the bottleneck. Ship spec-first with copy inline, measure actual per-run cost after Phase 2 lands, and only split copy out if it dominates what's left.

*Revisit trigger:* multi-variant copy generation (A/B headlines, multiple CTA tones) is a legitimate case for a cheap separate pass — but that's a feature decision, not a token-efficiency one.

### 2. Clone/mutate stay JSON-native through Phase 2

Converting an existing Divi export to spec and back is a round-trip through the schema's vocabulary — anything the export uses that isn't in the schema gets dropped or forced through the `raw` escape hatch, and we won't know how often until Phase 3's matrix work measures schema coverage against `attr-paths.json`. A silently lossy clone is worse than the current token cost.

*Sequencing:* prove spec-first on scratch builds (vocabulary controlled end to end) → measure matrix/schema coverage in Phase 3 → build `ingest-to-spec` as Phase 3+ with real data on what the escape hatch must catch.

### 3. Preview polish: two CSS layers, no animation

Fidelity-by-construction changes what the taste gate judges. The mockup no longer has to be a convincing proxy the fidelity check must trust — its only job is letting a human judge rhythm, hierarchy, spacing, and colour. So:

- **Shared base stylesheet** (write once): resets, type scale, spacing tokens.
- **Thin per-aesthetic override**: accent colours, font pairing, one or two signature layout cues (e.g. the bento grid shape).
- **No animation in the preview.** Don't fake Theatre.js motion in static HTML — annotate the section with a text/icon tag (`⚡ hero-reveal`) so the taste gate sees intent. Motion is judged at the real WordPress preview (Stage 4), the only place it can be judged honestly.
