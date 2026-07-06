# Tasks: Import Divi 5 Theme Builder templates via REST

## Note on RED phase
The implementation (`ThemeBuilderImporter.php`, the `/theme-builder-template` REST route)
was already written and committed on this branch before this proposal — see
`proposal.md`. These tests were therefore written test-after against working code, not
test-first: running the suite produced 53/53 green immediately rather than a RED failure.
A regression sanity check (temporarily removing the `_et_use_on` reset in
`ThemeBuilderImporter::import()`) confirmed `test_reimport_replaces_use_on_rules` does
fail when the behavior it covers breaks, so the tests are real, not vacuous.

Because of this, there is no GREEN work left for `/sswa:apply` — every task below is
already satisfied by the existing implementation. This tasks list exists so
`/sswa:verify` has a checklist to confirm against.

## 1. Validation (tests 1–3)
- [x] 1.1 Reject payload missing `key` — `test_missing_key_is_rejected`
- [x] 1.2 Reject payload missing `use_on` — `test_missing_use_on_is_rejected`
- [x] 1.3 Reject `body` without the `wp:divi/placeholder` block — `test_body_without_placeholder_block_is_rejected`

## 2. Create-or-update by key (tests 4–5)
- [x] 2.1 First import creates a new template + body layout — `test_first_import_creates_a_new_template`
- [x] 2.2 Re-import with the same key updates in place, no duplicates — `test_reimport_with_same_key_updates_in_place`

## 3. Use-on rules (test 6)
- [x] 3.1 Re-import fully replaces `_et_use_on` — `test_reimport_replaces_use_on_rules`

## 4. Live Theme Builder registration (tests 7–9)
- [x] 4.1 New template registered onto the live Theme Builder post — `test_new_template_is_registered_on_live_theme_builder_post`
- [x] 4.2 Re-import does not duplicate the registration — `test_reimport_does_not_duplicate_registration`
- [x] 4.3 Unresolvable Theme Builder post degrades to a warning, not a failure — `test_unresolvable_theme_builder_post_returns_a_warning_not_a_failure`
