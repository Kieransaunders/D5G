# Capability: taste-mechanical-rules

Mechanical taste rules (banned AI tells) are enforced by `taste-check.js`, not left as prose
the model must remember. A positive-patterns reference documents what good looks like
alongside the ban list.

## ADDED Requirements

### Requirement: taste-check.js flags section-number eyebrow patterns
`taste-check.js` MUST flag short label/text modules whose content matches a section-number
pattern — one to three digits followed by a separator (`/`, `·`, `|`, or `.`) and text
(e.g. `01 / Overview`, `00 / INDEX`, `03 · Process`). It MUST exit 1 (a hard ban per
`taste.md` §10) and MUST NOT flag plain numbers without a separator (e.g. `10 reasons to
switch`).

#### Scenario: section-number eyebrow is flagged
- GIVEN a page containing a short text module "01 / Overview"
- WHEN `taste-check.js` runs
- THEN it exits 1 with a TASTE-SECTION-NUMBER message

#### Scenario: "00 / INDEX" is flagged
- GIVEN a page containing a short text module "00 / INDEX"
- WHEN `taste-check.js` runs
- THEN it exits 1 with a TASTE-SECTION-NUMBER message

#### Scenario: a number without a separator is not flagged
- GIVEN a page containing a short text module "10 reasons to switch"
- WHEN `taste-check.js` runs
- THEN there is no TASTE-SECTION-NUMBER message

### Requirement: A positive-patterns reference exists and is linked
A `references/positive-patterns.md` file MUST exist describing what good composition looks
like (layout families, hero/section composition), and `references/taste.md` MUST link to it
from its positive-patterns section.

#### Scenario: positive-patterns reference present and linked
- GIVEN the skill references directory
- WHEN `positive-patterns.md` and `taste.md` are read
- THEN `positive-patterns.md` exists AND `taste.md` references it
