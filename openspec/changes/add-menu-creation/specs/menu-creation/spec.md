## ADDED Requirements

### Requirement: Create a named menu
The system SHALL create a new WordPress navigation menu given a unique name, or append items to an existing menu.

#### Scenario: New menu created from name
- **WHEN** a POST request submits a unique menu name
- **THEN** the system creates a new menu and returns its term ID
- **AND** the response includes `menu_id`, `name`, `item_count`, and `items`

#### Scenario: Existing menu is reused with a warning
- **WHEN** a POST request submits a name that already exists
- **THEN** the system appends items to the existing menu
- **AND** the response includes a warning that the menu already exists

#### Scenario: Empty name is rejected
- **WHEN** a POST request submits an empty menu name
- **THEN** the system rejects the request with a 422 error

### Requirement: Add page links to a menu
The system SHALL add page post-type items to a menu given a page ID.

#### Scenario: Page item added to menu
- **WHEN** submitting a menu item with a `page_id`
- **THEN** the system creates a post_type menu item linking to that page
- **AND** the response includes the item's `db_id` and `label`

#### Scenario: Custom URL item added to menu
- **WHEN** submitting a menu item with a `url`
- **THEN** the system creates a custom menu item with that URL
- **AND** the response includes the item's `db_id` and `label`

### Requirement: Assign menu to a theme location
The system SHALL assign a menu to a WordPress theme location when specified.

#### Scenario: Valid theme location is assigned
- **WHEN** submitting a menu with a `location` that exists in the active theme
- **THEN** the system sets that location to point to the created menu

#### Scenario: Invalid theme location logs a warning
- **WHEN** submitting a menu with a `location` that does not exist
- **THEN** the system creates the menu
- **AND** the response includes a warning that the location was not assigned

### Requirement: Nest menu items as parent-child
The system SHALL support parent-child relationships between menu items using client-supplied `id` / `parent_id` references.

#### Scenario: Child item nested under parent
- **WHEN** submitting items with an `id` and `parent_id` referencing a sibling item's `id`
- **THEN** the child item is created with the parent's DB ID set as its parent
- **AND** the response includes `parent_db_id` on the child entry

### Requirement: List existing menus with item hierarchy
The system SHALL return all registered menus with their items organised as a nested tree.

#### Scenario: All menus listed
- **WHEN** a GET request is sent to the menus endpoint
- **THEN** the response contains a `menus` array with each menu's `id`, `name`, `slug`, `theme_locations`, `item_count`, and nested `items`

#### Scenario: Filter by menu name
- **WHEN** a GET request includes a `name` query parameter
- **THEN** only menus matching that name are returned

#### Scenario: Items returned as hierarchical tree
- **WHEN** a menu has child items
- **THEN** each parent item includes a `children` array with its nested items

### Requirement: Auto-place pages into menu by title matching
The system SHALL accept a list of generated pages and place each one into an existing menu based on title-word overlap with top-level items.

#### Scenario: Page nested under matching parent
- **WHEN** a page title shares a significant word with a top-level menu item's label
- **THEN** the page is added as a child of that item
- **AND** the response includes `parent_db_id` on that entry

#### Scenario: Page appended when no parent matches
- **WHEN** a page title has no word overlap with any top-level item
- **THEN** the page is appended as a top-level item
- **AND** the response has no `parent_db_id` on that entry

#### Scenario: Existing page skipped
- **WHEN** a page's `page_id` already exists in the target menu
- **THEN** the page is skipped with a warning
- **AND** the `skipped` count is incremented
