# Module Attribute Path Cheat Sheet

Auto-generated from real Divi 5 exports in `references/Divi design system JSON/Individual Sections/By Section Type/` — 3248 real blocks across 25 module types.

Regenerate: `python3 scripts/extract-attr-paths.py`

These paths are GROUND TRUTH (from actual Divi-saved JSON). If a builder helper writes a path not listed here for a module that IS listed, treat it as suspect and cross-check before shipping — this is how the number-counter percent-sign bug (wrong path `percent.advanced.sign` instead of `number.advanced.enablePercentSign`) was found.

Modules with NO entry here have no verified export example in this repo. Do not guess their attribute paths — export a real example from Divi first (Divi Library → Import & Export, or the Divi Tools Connector `/export` endpoint) before building a helper for them.

## accordion-item
- `title.innerContent`
- `content.innerContent`
- `module.advanced.open`

## blurb
- `imageIcon.innerContent`
- `content.innerContent`
- `title.innerContent`
- `module.decoration.layout`
- `imageIcon.advanced.width`
- `imageIcon.decoration.border`
- `module.decoration.sizing`
- `module.advanced.loop`
- `module.advanced.text.text`
- `module.decoration.spacing`
- `imageIcon.advanced.color`
- `module.meta.adminLabel`
- `module.decoration.border`
- `module.advanced.link`
- `imageIcon.advanced.placement`
- `module.decoration.background`
- `imageIcon.decoration.spacing`
- `css`
- `module.decoration.order`
- `title.decoration.font.font`

## button
- `button.innerContent`
- `module.advanced.alignment`
- `module.decoration.spacing`
- `module.decoration.layout`
- `module.decoration.order`
- `module.advanced.loop`

## column
- `module.decoration.sizing`

## contact-field
- `fieldItem.advanced.fullwidth`
- `fieldItem.advanced.id`
- `fieldItem.advanced.type`
- `fieldItem.innerContent`
- `module.decoration.sizing`

## countdown-timer
- `title.innerContent`
- `content.advanced.dateTime`
- `module.advanced.text.text`
- `number.decoration.font.font`
- `module.decoration.background`

## counter
- `title.innerContent`
- `barProgress.innerContent`

## divider
- `divider.advanced.line`
- `module.decoration.background`
- `module.decoration.sizing`
- `module.decoration.border`

## filterable-portfolio
- `portfolio.advanced.includedCategories`
- `portfolio.advanced.postsNumber`
- `portfolioGrid.decoration.layout`

## heading
- `title.innerContent`
- `title.decoration.font.font`
- `module.decoration.layout`
- `module.decoration.spacing`
- `module.advanced.link`
- `module.decoration.sizing`
- `module.decoration.border`
- `module.decoration.background`

## icon
- `icon.innerContent`
- `module.decoration.sizing`
- `icon.advanced.size`
- `icon.advanced.color`
- `module.decoration.position`
- `module.decoration.transform`
- `icon.advanced.align`
- `module.decoration.spacing`
- `module.decoration.layout`
- `module.decoration.background`
- `module.decoration.order`
- `module.decoration.border`

## icon-list-item
- `content.innerContent`
- `icon.innerContent`
- `icon.advanced.color`

## image
- `image.innerContent`
- `module.advanced.sizing`
- `module.decoration.layout`
- `image.advanced.lightbox`
- `image.advanced.overlay`
- `image.decoration.border`
- `image.decoration.boxShadow`
- `module.decoration.order`
- `module.advanced.spacing`
- `module.advanced.align`
- `css`
- `module.decoration.disabledOn`
- `module.decoration.filters`

## login
- `title.innerContent`
- `content.innerContent`

## map-pin
- `pin.innerContent`

## menu
- `logo.innerContent`
- `menu.advanced.menuId`
- `cartIcon.advanced.show`
- `searchIcon.advanced.show`
- `module.decoration.sizing`
- `cartQuantity.advanced.show`
- `module.advanced.text.text`
- `module.decoration.order`
- `module.decoration.spacing`
- `menuDropdown.advanced.direction`
- `menu.decoration.font.font`

## number-counter
- `title.innerContent`
- `number.innerContent`
- `number.advanced.enablePercentSign`
- `module.decoration.layout`
- `number.decoration.font.font`
- `module.decoration.sizing`
- `css`
- `title.decoration.font.font`

## pricing-table
- `currencyFrequency.innerContent`
- `subtitle.innerContent`
- `title.innerContent`
- `price.innerContent`
- `button.innerContent`
- `content.innerContent`
- `module.advanced.featured`
- `module.decoration.sizing`

## shop
- `elements.advanced.showPagination`

## signup
- `field.advanced.lastNameField`
- `field.advanced.firstNameField`
- `title.innerContent`
- `field.advanced.nameField`
- `module.advanced.layout`
- `content.innerContent`
- `title.decoration.font.font`
- `footerContent.innerContent`
- `module.advanced.emailService`
- `module.decoration.layout`
- `module.decoration.sizing`
- `module.decoration.spacing`

## slide
- `title.innerContent`
- `button.innerContent`
- `content.innerContent`
- `module.decoration.background`
- `image.innerContent`

## social-media-follow-network
- `socialNetwork.innerContent`
- `module.decoration.background`

## text
- `content.innerContent`
- `content.decoration.bodyFont.body.font`
- `module.advanced.text.text`
- `locked`
- `content.decoration.bodyFont.link.font`
- `module.decoration.sizing`
- `module.decoration.layout`
- `module.meta.adminLabel`
- `module.advanced.link`
- `module.decoration.background`
- `module.advanced.loop`

## toggle
- `title.innerContent`
- `content.innerContent`
- `module.decoration.spacing`
- `module.decoration.border`

## video
- `video.innerContent`
- `thumbnail.innerContent`
