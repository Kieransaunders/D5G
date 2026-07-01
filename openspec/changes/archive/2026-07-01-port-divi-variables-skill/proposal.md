# Port styleguide to Divi variables skill

## Why
The repo can extract a brand from a *live site* (`brand-extract`) and define its *schema*
(`divi5-brand-profile`), but there is no path from a raw style guide, Figma token export,
or CSV into a Divi 5 importable `global_colors` + `global_variables` JSON. The token sets in
`divi5-page-generator/references/...tokens.js` are hand-authored JS, not derived from a
brand's real tokens via a deterministic pipeline. This is the missing feeder upstream of
`divi5-brand-profile`, and it is exactly the capability of 16wells'
`divi-styleguide-variables` skill, ported here as a first-class sibling.

## What Changes
- New skill `divi5-variables-from-styleguide`: style guide (prose) or token table/JSON → a
  single `context: "et_builder"` JSON with `global_colors` + `global_variables`, stable
  `gcid-`/`gvid-` IDs, tokens-win, never-invent.
- New contract validator `scripts/check-variables-json.js` — the deterministic gate the
  skill's output must pass. Enforces rules R1-R5, including the orphan-color rule (R5) that
  the upstream 16wells example actually violates.
- Reference files: `token-table-template.md` and a **corrected**
  `example-output-minimal.json` (every color carries a matching colors-variable).

## Capabilities
- New: `divi-variables-import`

## Impact
- **New files:** `skills/divi5-variables-from-styleguide/` (SKILL.md, scripts, references).
- **Not affected:** existing skills. `divi5-brand-profile` is the intended downstream
  consumer; wiring the output into a brand profile is a follow-up change. This change ships
  the producer and its contract gate.
- **Source attribution:** ports the contract from 16wells/divi-styleguide-variables (MIT);
  validator and skill are authored fresh here, not copied verbatim.
