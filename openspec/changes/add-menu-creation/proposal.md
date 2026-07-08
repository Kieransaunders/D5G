## Why

The plugin can generate and import pages, but cannot create WordPress navigation menus or wire new pages into existing site navigation. This blocks the "build the whole site" workflow.

## What Changes

- New `D5G_MenuImporter` class with methods to create menus, read existing ones, and auto-place generated pages into the right location
- REST endpoints: `GET /menus`, `POST /menus`, `POST /menus/auto-place`
- Title-based heuristic auto-placement: new pages are nested under matching top-level menu items or appended as top-level items

## Capabilities

### New Capabilities
- `menu-creation`: WordPress navigation menu creation, listing, and automatic page placement via REST API

### Modified Capabilities
<!-- None -- first spec in this area -->

## Impact

- Adds 3 new REST endpoints to `divi5-generator/v1`
- New source file `src/MenuImporter.php`
- No breaking changes to existing endpoints
