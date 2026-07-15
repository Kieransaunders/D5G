# SEO Meta Persistence

### Requirement: Ping reports active SEO plugin

The `GET /wp-json/divi5-generator/v1/ping` response SHALL include a `seo_plugin` field whose value is the detected plugin id (`yoast`, `rank_math`, `aioseo`, `seopress`, `tsf`) or `null` when no supported SEO plugin is active.

#### Scenario: Ping with Yoast installed
- **WHEN** the client calls `GET /ping` on a site where Yoast is active
- **THEN** the JSON response SHALL contain `"seo_plugin": "yoast"`
