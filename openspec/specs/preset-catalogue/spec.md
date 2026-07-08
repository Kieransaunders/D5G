# Preset Catalogue


### Requirement: A compact preset catalogue is derived from the registry
`setup-et-presets.js` SHALL, after writing `et-preset-registry.json`, emit `references/preset-catalogue.json`: one compact entry per named preset with `name`, `module`, `surface` (`light` | `dark` | `unknown`), `color`, `size`, `align`, and a coarse `role` (e.g. `hero`, `section-heading`, `card-heading`, `body`, `button`, `section-bg`). The catalogue SHALL be regenerated whenever the registry is refreshed, so the two never drift.

`surface` SHALL be inferred from the preset's own colours: a light background or dark text is `light`; a dark background or light text is `dark`; indeterminate is `unknown`.

#### Scenario: Catalogue emitted alongside the registry
- **WHEN** `setup-et-presets.js` completes a registry refresh
- **THEN** `references/preset-catalogue.json` exists
- **AND** it contains one entry per named preset in the registry

#### Scenario: Surface is inferred from preset colours
- **GIVEN** a heading preset with font colour `#FFFFFF`
- **WHEN** the catalogue is generated
- **THEN** that preset's `surface` is `dark` (built for a dark background)

#### Scenario: Catalogue is compact
- **WHEN** the catalogue is generated
- **THEN** each entry carries only the summary fields, not the full preset attrs
- **AND** the catalogue file is several times smaller than the registry (at least 5x)
