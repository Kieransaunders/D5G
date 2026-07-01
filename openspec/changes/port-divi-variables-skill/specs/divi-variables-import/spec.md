# Capability: divi-variables-import

A skill converts a style guide (prose or token table/JSON) into a single Divi 5 importable
JSON of `global_colors` + `global_variables`, and a validator (`check-variables-json.js`)
enforces the import contract deterministically. The skill's output MUST pass the validator.

## ADDED Requirements

### Requirement: Output is a single et_builder import with all root keys
The skill MUST output one JSON object with `context: "et_builder"` and the keys `data`,
`presets`, `global_colors`, `global_variables`, `canvases`, `images`, `thumbnails`.

#### Scenario: Validator rejects a wrong context
- GIVEN a candidate JSON whose `context` is not `"et_builder"`
- WHEN `check-variables-json.js` runs against it
- THEN it exits 1 with a message mentioning "context"

#### Scenario: Validator rejects a missing root key
- GIVEN a candidate JSON missing any of the eight root keys
- WHEN `check-variables-json.js` runs against it
- THEN it exits 1 naming the missing key

### Requirement: global_colors are well-formed tuples with valid colours
Each `global_colors` entry MUST be a `[id, object]` tuple where the id begins `gcid-` and
the object has `color` (a valid `#hex`/`rgb`/`rgba`/`hsl`/`hsla` string), `status`, and
`label`.

#### Scenario: Validator rejects an invalid colour value
- GIVEN a global_color whose `color` is `"not-a-color"`
- WHEN `check-variables-json.js` runs against it
- THEN it exits 1 mentioning "color"

### Requirement: global_variables carry every required field with valid type and stable id
Each `global_variables` entry MUST be an object with `id` (begins `gvid-`), `label`,
`value`, `order`, `status`, `lastUpdated` (ISO 8601), `variableType`, `type` (one of
`colors`, `numbers`, `strings`, `fonts`, `images`, `links`), and `groupKey`.

#### Scenario: Validator rejects a variable missing a required field
- GIVEN a variable missing `groupKey`
- WHEN checked, THEN the validator exits 1 mentioning the field

#### Scenario: Validator rejects an invalid variable type
- GIVEN a variable whose `type` is `"widgets"`
- WHEN checked, THEN the validator exits 1

#### Scenario: Validator rejects an id without the gvid- prefix
- GIVEN a variable whose `id` is `"font-heading-family"`
- WHEN checked, THEN the validator exits 1

### Requirement: Every color has a matching colors-variable
For every `global_colors` entry there MUST be at least one `global_variables` entry of
`type: "colors"` whose `value` equals the color's `color`. The upstream 16wells example
violates this (it ships a Blue color with no matching variable); the validator enforces the
skill's stated rule so presets and layouts can reference every color consistently.

#### Scenario: Validator rejects an orphan color
- GIVEN a global_color whose value matches no `colors`-type variable
- WHEN checked, THEN the validator exits 1
