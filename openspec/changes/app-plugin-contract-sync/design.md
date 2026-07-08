# Design — app-plugin-contract-sync

This is a rename-completion change, not a feature addition. The design is therefore mostly
about *scope discipline* (what's in, what's out) and *test strategy* (how we prove the
contract holds and stays held), not architecture.

## The contract being pinned

Four values must agree between `app/server.js` and `plugin/divi5-generator/`:

| Value | App side | Plugin side | Test |
|---|---|---|---|
| REST namespace | URL strings in `server.js` | `D5G_RestApi::NAMESPACE` (`RestApi.php:9`) | `rest-contract.test.js` |
| Auth header | `'X-D5G-Key'` literals in `server.js` | `$request->get_header('X-D5G-Key')` (`RestApi.php:155`) | `rest-contract.test.js` |
| Expected version | `EXPECTED_D5G_VERSION` const | `D5G_VERSION` define (`divi5-generator.php:22`) | `screenshot-contract.test.js` |
| Import payload keys | `IMPORT_PARAMS` (`lib/import-payload.js`) | `/import` route `args` (`RestApi.php`) | `import-contract.test.js` |

Plus two correctness invariants the rename broke:

| Invariant | Where | Test |
|---|---|---|
| DB export must not ship the API key | `DbExporter::SKIP_OPTION_NAME` ⊇ Auth-written option names | `rest-contract.test.js` |
| DELETE `/pages/{slug}` meta key = stamp meta key | `RestApi.php` delete handler vs `PageImporter.php` stamp | `rest-contract.test.js` |

## Why one branch, not several

The SSWA rule is one-feature-per-branch. These look like multiple concerns (contract,
security, tests) but they are one feature — *the DTI→D5G rename* — viewed from different
layers. Splitting them would mean: (a) the contract-sync branch would leave the secret-leak
and broken-DELETE bugs live on `main` for longer, and (b) the security branch would touch
the same lines the contract branch just touched. Bundling is the lower-risk choice here
because the edits are mechanical and independently testable.

## Test strategy (RED → GREEN)

The three existing contract tests already enforce the version + payload-keys + page-fields
invariants; they're just pointing at a deleted path. This change:

1. **Repairs the paths** in those three tests → they go GREEN once the plugin-side constant
   they read (`DTI_VERSION`) is renamed to match what the test reads (`D5G_VERSION`). Both
   sides change in lockstep.
2. **Adds one new test file** `app/tests/rest-contract.test.js` covering the four contract
   values not yet covered by an existing test (namespace, header, secret-leak, DELETE-meta).
   These tests read both the app and plugin source, so drift on either side fails them.

All tests are **source-grepping contract tests** — they read `.js` and `.php` as text and
assert on string patterns. This is deliberate: they run with `node --test` (no PHP, no WP,
no network) and fail the moment either side changes without the other following. This is the
same pattern the existing `import-contract` / `wp-pages-contract` / `screenshot-contract`
tests already use.

## Edit safety

- **No route signatures change.** Every `/wp-json/divi-tools/v1/foo` becomes
  `/wp-json/divi5-generator/v1/foo` — same path suffix, same method, same body.
- **No DB migration.** Hard cutover on `_dti_imported` → `_d5g_imported` (per scope decision).
- **No REST response shape changes.** A client that already speaks D5G (the plugin has been
  D5G internally since 1.7.0) sees no difference.
- **PHP edits are 1-line each.** `DbExporter` and the meta-key fix are single-token changes;
  the rest are constant/string renames.

## Risk: the `vendor/` Freemius SDK

`plugin/divi5-generator/vendor/` is committed and contains the Freemius SDK. None of the
edits touch `vendor/`. The `grep` sweep in VERIFY excludes `vendor/` so we don't false-positive
on the SDK's own strings.

## Risk: skills are user-facing docs

The skill edits change what Claude reads when invoking `divi5-page-generator` etc. A wrong
header/endpoint there means a generation run fails to import. This is exactly the failure
this change fixes, so the risk of *editing* them is lower than the risk of leaving them.
After the edit, `/reload-plugins` picks them up (per AGENTS.md).
