## Context

The plugin uses flat-file `require_once` convention (no autoloader). New classes are manually registered in `divi5-generator.php` and their source files required at the end of `tests/bootstrap.php`. REST routes are registered in `D5G_RestApi::register_routes()`.

The existing `PageImporter` creates pages via `wp_insert_post` and returns `page_id`. Menu items need to reference those page IDs.

## Goals / Non-Goals

**Goals:**
- New `D5G_MenuImporter` class in `src/MenuImporter.php`
- Three REST endpoints: `GET /menus`, `POST /menus`, `POST /menus/auto-place`
- Title-word-overlap heuristic for auto-placement
- Full test coverage using in-memory stubs (no WordPress dependency)

**Non-Goals:**
- Not modifying the existing menu — only creating/appending
- No WP-CLI commands (future)
- No UI in the admin (the app drives this via REST)

## Decisions

1. **Static class (no autoloader)** — matches `PageImporter`, `SeoWriter`, etc.
2. **Nested hierarchy via `id`/`parent_id`** — client supplies string IDs for parent referencing; two-pass creation (first pass creates all items, second pass sets parents).
3. **Auto-placement heuristic: word overlap** — split page title into words, filter stop-words, match against top-level item labels. Simple, predictable, no ML dependency.
4. **Test stubs in `bootstrap.php`** — `MenuStore` holds in-memory state; `wp_create_nav_menu` etc are stubbed. Matches the existing `MetaStore` pattern from SEO tests.

## Risks / Trade-offs

- **Word-overlap heuristic is simplistic** — "SEO Services" won't nest under "Services" if the word is in both. Mitigation: the heuristic scores by word count; longer overlap wins. Users can always fall back to explicit `POST /menus` placement.
- **No rollback** — menu items are appended; there is no "undo" endpoint. Mitigation: the app can track created DB IDs and call `wp_delete_post` on menu items if needed.
