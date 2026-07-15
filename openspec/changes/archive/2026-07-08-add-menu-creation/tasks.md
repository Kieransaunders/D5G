# Tasks: add-menu-creation

## 1. Menu creation (POST /menus)

- [x] 1.1 Create `src/MenuImporter.php` with `D5G_MenuImporter::create()` — basic menu creation from name + items
- [x] 1.2 Support page items (`page_id`) and URL items (`url`)
- [x] 1.3 Support theme location assignment
- [x] 1.4 Support parent-child nesting via `id`/`parent_id`
- [x] 1.5 Register `require_once` in `divi5-generator.php`
- [x] 1.6 Add `POST /menus` route + handler in `RestApi.php`

## 2. Menu listing (GET /menus)

- [x] 2.1 Implement `D5G_MenuImporter::list_menus()` — read all menus with hierarchical items
- [x] 2.2 Build nested tree from flat `wp_get_nav_menu_items()` output
- [x] 2.3 Add `GET /menus` route + handler in `RestApi.php`

## 3. Auto-place (POST /menus/auto-place)

- [x] 3.1 Implement `D5G_MenuImporter::auto_place()` — read existing menu, match pages by title words
- [x] 3.2 Implement `find_parent_for()` heuristic — split title, filter stop-words, score word overlap
- [x] 3.3 Add `POST /menus/auto-place` route + handler in `RestApi.php`

## 4. Verify all tests green

- [x] 4.1 Run full test suite — confirm all 59 tests pass
