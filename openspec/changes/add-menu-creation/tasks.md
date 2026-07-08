# Tasks: add-menu-creation

## 1. Menu creation (POST /menus)

- [ ] 1.1 Create `src/MenuImporter.php` with `D5G_MenuImporter::create()` — basic menu creation from name + items
- [ ] 1.2 Support page items (`page_id`) and URL items (`url`)
- [ ] 1.3 Support theme location assignment
- [ ] 1.4 Support parent-child nesting via `id`/`parent_id`
- [ ] 1.5 Register `require_once` in `divi5-generator.php`
- [ ] 1.6 Add `POST /menus` route + handler in `RestApi.php`

## 2. Menu listing (GET /menus)

- [ ] 2.1 Implement `D5G_MenuImporter::list_menus()` — read all menus with hierarchical items
- [ ] 2.2 Build nested tree from flat `wp_get_nav_menu_items()` output
- [ ] 2.3 Add `GET /menus` route + handler in `RestApi.php`

## 3. Auto-place (POST /menus/auto-place)

- [ ] 3.1 Implement `D5G_MenuImporter::auto_place()` — read existing menu, match pages by title words
- [ ] 3.2 Implement `find_parent_for()` heuristic — split title, filter stop-words, score word overlap
- [ ] 3.3 Add `POST /menus/auto-place` route + handler in `RestApi.php`

## 4. Verify all tests green

- [ ] 4.1 Run full test suite — confirm all 15 Menu tests + 45 SEO tests pass
