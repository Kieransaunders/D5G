## ADDED Requirements

### Requirement: Import payload validation
The importer MUST reject a payload missing `key`, missing `use_on`, or whose `body` does
not contain a `wp:divi/placeholder` block, raising a validation error before touching the
database.

#### Scenario: Missing key is rejected
- GIVEN an import payload with no `key`
- WHEN `DTI_ThemeBuilderImporter::import()` is called
- THEN an `InvalidArgumentException` is thrown mentioning `'key' is required`
- AND no post is created

#### Scenario: Missing use_on is rejected
- GIVEN an import payload with a `key` and `body` but no `use_on`
- WHEN `DTI_ThemeBuilderImporter::import()` is called
- THEN an `InvalidArgumentException` is thrown mentioning `'use_on' is required`

#### Scenario: Body without the Divi placeholder block is rejected
- GIVEN an import payload whose `body` does not contain `wp:divi/placeholder`
- WHEN `DTI_ThemeBuilderImporter::import()` is called
- THEN an `InvalidArgumentException` is thrown mentioning `'body' must be Divi 5 block markup`

### Requirement: Create-or-update by stable key
The importer MUST create a new `et_template` (and body layout) on first import of a given
`key`, and MUST update the same posts in place on a subsequent import with the same `key`,
rather than creating duplicates.

#### Scenario: First import creates a new template
- GIVEN no existing template tagged with `_dti_tb_key = "my-template"`
- WHEN a valid payload with `key = "my-template"` is imported
- THEN the result reports `action = "created"`
- AND a new `et_template` post exists with `_dti_tb_key = "my-template"`
- AND its body layout post's content equals the payload's `body`

#### Scenario: Re-import with the same key updates in place
- GIVEN a template was already imported with `key = "my-template"`
- WHEN a second payload with the same `key` and different `body` is imported
- THEN the result reports `action = "updated"`
- AND the same `template_id` and `body_layout_id` are reused (no duplicate posts)
- AND the body layout post's content reflects the new `body`

### Requirement: Use-on rules are fully replaced on every import
The importer MUST overwrite the template's `_et_use_on` postmeta with exactly the rules
from the current payload, discarding any rules from a previous import.

#### Scenario: Re-import narrows the use_on rules
- GIVEN a template imported with `use_on = ["singular:post_type:airloop_record:all", "archive:post_type:airloop_record"]`
- WHEN it is re-imported with `use_on = ["singular:post_type:airloop_record:all"]`
- THEN the template's `_et_use_on` postmeta contains exactly one entry,
  `"singular:post_type:airloop_record:all"`

### Requirement: Template is registered on the live Theme Builder post
The importer MUST add the template's ID to the live Theme Builder post's `_et_template`
registry so it takes effect on the frontend, and MUST NOT add a duplicate entry if the
template is already registered.

#### Scenario: New template is registered
- GIVEN a live Theme Builder post with no existing `_et_template` entries
- WHEN a new template is imported
- THEN the live Theme Builder post's `_et_template` postmeta contains the new template's ID

#### Scenario: Re-import does not duplicate the registration
- GIVEN a template already registered on the live Theme Builder post
- WHEN the same template is re-imported
- THEN the live Theme Builder post's `_et_template` postmeta contains that template's ID
  exactly once

### Requirement: Missing live Theme Builder post degrades to a warning
The importer MUST NOT fail the whole import when the live Theme Builder post cannot be
resolved — the template itself is still saved, and a warning is returned instead.

#### Scenario: Theme Builder post cannot be resolved
- GIVEN `et_theme_builder_get_theme_builder_post_id()` returns a falsy value
- WHEN a valid payload is imported
- THEN the import still succeeds and returns the saved `template_id`
- AND the result's `warnings` array contains a message about the registration not
  happening
