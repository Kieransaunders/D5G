# Divi5Generate — PRD & Commercialisation Plan

**Version:** 1.0 · **Date:** 14/07/2026 · **Owner:** Kieran (iConnectIT)
**Status of product:** release candidate, pre-commercial · **Target:** first paid sale within 60 days

> "Feature-complete" overstated it. Wrong Freemius credentials, unverified Divi 5 render, no onboarding, no deployed landing page and open security items (§4) describe a release candidate. Corrected 15/07/2026.

---

## 1. What the product is

Divi5Generate is an AI page-generation system for Divi 5 WordPress sites, sold as two coupled components:

1. **The toolkit (Claude Code plugin `divi5generate`)** — skills, a builder library (~784-line Node module that emits valid Divi 5 block JSON), a 418-line validator, and a local browser app (chat-primary, port 3747) with brand profiles, design projects, one-click import, and screenshot QA. Runs on the customer's own Claude subscription — **we carry zero AI inference cost**.
2. **The connector (WordPress plugin "Divi5 Generator" v1.8.0)** — a secure REST API on the customer's Divi 5 site: preview, import/export pages, preset packs, global variables, SEO meta written natively to 5 SEO plugins, JSON-LD schema, menu creation/auto-place, managed page cleanup, DB transfer. 59 PHPUnit tests. Freemius SDK already embedded.

The moat is the reverse-engineered knowledge of Divi 5 internals (preset-first workflow, per-page CSS cache clearing, the `enable:'on'` button toggle, raw-hex-in-preset-backgrounds, `wp_kses_post` bypass). A competitor starting today repeats weeks of debugging we've already banked as code.

## 2. Who it's for and why now

**Primary ICP:** Divi agencies and freelancers (1–10 people) who build client sites and already use — or are willing to adopt — Claude Code. They bill per site; a page that takes 4–8 hours manually lands in under an hour with brand fidelity and SEO baked in.
**Secondary:** in-house SME web teams running Divi.

**Why now:** Divi 5 left beta and went official on 26/02/2026. The third-party module/tooling ecosystem is being rebuilt for the new block format right now — early movers get the "the Divi 5 AI tool" positioning while it's uncontested. Our own docs still say "Divi 5 is in public beta"; that's stale and the window it implied is actually open.

## 3. Commercial model — decision required (recommendation firm)

Four shapes were on the table (product-overview.md). Recommendation: **B-first, BYO-Claude**.

| Shape | Verdict |
|---|---|
| **A. SaaS web app** | Defer. Requires hosting Claude API, billing, accounts, support load — wrong for a one-person op, and adds per-page inference cost we currently don't have. Revisit at 100+ paying connector customers. |
| **B. Paid WP plugin (Freemius)** | **Do this.** Freemius is already wired into the connector. Licence carrier = the WP plugin; the full Claude Code toolkit is delivered with the licence (see §3.1). |
| **C. Agency-internal tool** | Already true by default — it's our own delivery advantage regardless. Not a product decision. |
| **D. MCP / Claude marketplace** | Free distribution channel for the **free starter only** (see §3.1), not the full toolkit. It funnels to Pro. |

### 3.1 Distribution pivot (15/07/2026) — toolkit is the product, not the demand driver

The original plan ("toolkit free, connector is the toll booth") had a hole Kieran spotted: Divi's **native portability accepts any valid `et_builder` JSON**, so anyone with the full toolkit can generate unlimited pages and import them manually through the Visual Builder — bypassing the connector's free-tier limits entirely. The connector's value is workflow (one-click deploy, preview/screenshot QA, SEO meta persistence, menus, brand extract/deploy), not access. Therefore:

- **The full toolkit (`divi5generate` Claude plugin) is no longer published anywhere public.** It ships as a download attached to a **paid Pro licence only** — not on free-tier signup (DECIDED 15/07/2026; earlier drafts said "free-tier signup or Pro", which contradicted the §3.2 table). Not on public GitHub, not on an open marketplace. The taster is `divi5-starter`, not the toolkit. This is friction, not DRM — one licence-holder could redistribute it — but it stops casual copying, and the GPL obligation only covers the WP plugin's PHP, not the Node/skills toolkit (MIT/proprietary at our choice).
- **The demand drivers become output and a taster:**
  - Sample pages as importable JSON + demo video + landing page — shows the quality, and the manual-import faff sells the connector.
  - **`divi5-starter` — free public Claude plugin** (built 15/07/2026, lives at `free-toolkit/` in this repo, to be published as its own public GitHub repo `Kieransaunders/divi5-starter`). One skill: a 3-column **services section** generator. Fill-in template + small script only — **no divi-builder.js, no validator, no references ship with it**. Output carries a visible credit line ("Section created with the free D5G Starter for Divi 5") plus a `_d5g` provenance block; the fill script refuses to run if the credit is stripped from the template. Validated 0-errors against the private toolkit's own validator.
  - Template regeneration is private-repo-only: `node tools/build-free-starter-template.js`.
- **Free WP connector stays on WordPress.org** — install base and discovery; Pro workflow features remain the upsell for people importing manually at volume.

Trade-off accepted: "try full generation yourself" disappears from the funnel; the starter section is the taste-test.

### 3.2 Free / Pro split — capability gate, not quota (DECIDED 15/07/2026)

**Free imports sections into the Divi Library. Pro creates pages.** That single line is the gate.

The previous model capped Free at 2 page + 2 library imports/month. It was replaced because a quota gate expires and a capability gate doesn't: a free user hits the 2-page wall once, and either buys that day or leaves for good. Library-only Free stays useful indefinitely — the user keeps generating sections and assembling them by hand in the Visual Builder, and upgrades at the moment that hand-assembly becomes the bottleneck. **The friction is the pitch, and it re-sells itself every week.** It also matches the free toolkit's actual output, which is already a self-contained Divi Library section.

| Capability | Free (WordPress.org) | Pro (Freemius) |
|---|---|---|
| `/ping`, `/export` | ✅ | ✅ |
| `/preview` | ❌ — **it creates a real draft page**, see below | ✅ |
| `/import` → Divi Library (sections, rows, modules) | ✅ unlimited | ✅ |
| `/import` → pages (full page creation) | ❌ | ✅ |
| SEO meta writing (Yoast/RankMath/AIOSEO/SEOPress/TSF) | ❌ — structurally unreachable, see below | ✅ full |
| Schema/JSON-LD injection | ❌ — same | ✅ |
| Preset pack import/export, global variables | ❌ | ✅ |
| Brand extract / brand deploy (agency starter kit) | ❌ | ✅ |
| Menus create/list/auto-place | ❌ | ✅ |
| Managed pages list/delete | ✅ | ✅ |
| DB export/import (site transfer) | ❌ | ✅ (+ `D5G_ALLOW_DB_TRANSFER` opt-in) |
| **Claude toolkit: services-section starter (`divi5-starter`, public)** | ✅ (credited output) | ✅ |
| **Claude toolkit: full page generator, brand systems, deploy skills** | ❌ | ✅ (Freemius download) |

**`/preview` is Pro, because it is page creation in disguise (found 15/07/2026 by live test).** `D5G_PagePreviewer::preview()` calls `wp_insert_post()` with `post_status => 'draft'` — it creates a **real page**. The route is Free and called no capability gate, so a Free install could POST a page payload to `/preview`, get a real draft, and hit Publish. The unit tests could not see this: they exercised `import_gate()` in isolation, never the wiring. An end-to-end test against live Divi 5.9.0 created page 3914 on a Free install within minutes of the gate shipping. **Free loses nothing real** — `/preview` refuses library exports (422), which are Free's only output, so preview was never usable on Free anyway. It is a Pro QA tool and the table now says so.

**Why SEO and schema need no plan check.** `$seo` and `$schema` are only ever passed to `D5G_PageImporter::import()` — the library path in `handle_import()` returns before reaching them. Free cannot create pages, so Free cannot reach the SEO writer. This is enforced by control flow, not by a plan-filtered payload, which means there is no "title + description only" branch to write, test, or get wrong. The earlier promise of a partial SEO tier was never implemented and is now unnecessary.

**Two audit findings close by construction, not by patch:** the unenforced Free SEO split, and the library batch-limit bypass (`can_import_library()` checked usage without knowing the batch size). Neither exists under a capability gate. The `PAGE_IMPORT_LIMIT` / `LIBRARY_IMPORT_LIMIT` counters and their usage-tracking become dead code and should be removed; rate limiting stays.

**Accepted trade-off:** the connector never creates the page for a Free user — they insert the imported section into a page themselves from the Divi Library (three clicks in the Visual Builder). The page still appears, on their site, for real; they just do the assembly. That hand-assembly *is* the Pro pitch, delivered at the moment it lands: now imagine this, but the whole page, with your brand, automatically. Free users combining several free sections into a page by hand is product segmentation, not DRM, and is the intended friction (§3.1).

**Open decision — `D5G_ASSUME_PRO` (added 15/07/2026, needs a call before .org submission).** Because page creation is now Pro, any site where Freemius doesn't resolve to "paying" gets `403` on every page import — including our own dev/staging sites, which hold no licence. (This is *not* because the Freemius id is wrong — that gap-1 claim was mistaken, see §4 gap 1; `33991` is the correct product. An unlicensed site correctly resolves to Free.) `is_pro()` therefore honours a `define( 'D5G_ASSUME_PRO', true );` escape hatch in `wp-config.php`, without which the product cannot be tested at all pre-launch. It is a documented licence bypass. In absolute terms it costs little — any self-hosted PHP licence check dies to a one-line source edit — but it lowers the bar from "edit plugin source" to "edit wp-config", which matters in practice. **Either** keep it (defensible: the toolkit is the real gate per §3.1, and the connector's Pro features are workflow conveniences, not access) **or** strip it from the free build via the Freemius premium-only annotations (F2). Do not ship to .org with this undecided.

**Rejected: "Free may create a page containing one section."** It would restore a connector-built demo page, but it cannot be enforced. A page's content arrives as a single Gutenberg block string (`PageImporter::import()` does `reset( $layout['data'] )`), so counting sections means parsing Divi block markup in PHP — fragile against the format churn in §8, and it would publish more reverse-engineered Divi internals into the GPL .org build. Fatally, a section is an unbounded container (section → row → column → module): six rows in one section is a complete page that passes a one-section check. The gate would cost real code and gate nothing.

### 3.3 What a licence actually grants (DECIDED 15/07/2026)

The paid asset is the **toolkit** (per-person), but pricing is denominated in **sites** (per-install). Those are different units, and conflating them left a hole: a Single customer could buy one activation and use the downloaded toolkit to generate pages for unlimited other sites via manual Visual Builder import — the same bypass that forced the §3.1 pivot. A licence therefore grants both dimensions explicitly:

| | Pro Single | Pro Agency |
|---|---|---|
| Toolkit users | 1 named person or sole trader | up to 3 named people in one company |
| Active sites receiving its output | 1 production site | 25 active client sites |
| On expiry | updates, support and new activations stop; the installed version keeps working | same |

Output made for a licensed site remains the customer's, permanently, with no phone-home.

**Both seat count and site count are contractual, not technical.** The toolkit is markdown and Node on someone's laptop — no login, no activation, no callback — so neither clause is enforceable in code, and manual import to unlicensed sites cannot be detected. This is stated plainly rather than implied away: EULA terms and update/support access are the levers, matching the "friction, not DRM" position already accepted in §3.1 and §8. The connector's Freemius activation enforces the *site* count for connector-driven workflows only.

### Pricing (DECISION — recommendation)

- **Pro Single:** £89/year — 1 user, 1 site
- **Pro Agency:** £249/year — 3 users, 25 sites
- **Lifetime (launch-only):** £299 single / £799 agency — capped at 50 sales, funds the first year
- **Marginal cost is low, not zero.** Inference cost is genuinely zero to us (the customer's own Claude subscription generates), which is the real structural advantage — but Freemius takes a revenue share plus payment processing, and support, download hosting, refunds, release testing and Divi-version compatibility work all scale with customer count. Price on value (one billable page pays for a year), and stop claiming "100% margin" in any external copy.

## 4. Current state audit (what the codebase says today)

**Done and solid:** connector v2.0.0 with 73 tests; validator + two QA gates; preset-first workflow; SEO adapters for 5 plugins; chat app with session persistence; full marketing image pack delivered 06/07/2026 (`docs/Marketing/`).

### 4.0 Blind-spot pass (15/07/2026) — verified against the code

Each claim below was checked against the source, not assumed.

| Finding | Status |
|---|---|
| **Free/Pro SEO split unenforced** — no plan filter in `PageImporter` or `src/Seo/*`; `$seo` passed whole | **Closed by §3.2.** SEO is page-path only; Free can't create pages, so it's unreachable. No filter needed. |
| **Library batch-limit bypass** — `can_import_library()` checked usage without the batch size, so usage 0 + batch of 100 passed, then incremented by 100 | **Closed by §3.2.** No quota, nothing to bypass. |
| **API key accepted in URL query** (`?d5g_key=`) — leaks to history, logs, proxies, analytics | **Fixed 15/07.** Header-only now. Also a 3-way drift: `openspec/specs/importer-integration/spec.md` already mandated header-only *and wrongly claimed the code complied*, while `skills/divi5-deploy/SKILL.md` shipped a `?d5g_key=` curl example. Code and skill both corrected. |
| **Plaintext key stored** in `d5g_api_key_plain` alongside the hash (`Auth.php:22`) | **Mostly wrong — closed 15/07.** The plaintext is **show-once**: `SettingsPage::render()` reads it and immediately `delete_option()`s it (`admin/SettingsPage.php:39-43`, comment: *"Show plain key once, then delete it"*). So it exists only between key generation and the first settings-page view, which is the show-once pattern the audit recommended as the *fix*. Verified live: after viewing the settings page, `d5g_api_key_plain` was `(MISSING)` while the hash remained. "Hashed-key auth" is accurate. |
| **Rate limiter runs pre-auth** — unauthenticated callers can exhaust the bucket | **Open — needs design.** Moving it after auth enables unlimited key brute-forcing against `wp_check_password` (bcrypt, expensive). Correct shape is two buckets: strict per-IP on failed auth, per-key on success. |
| **Rate limiter keys on `REMOTE_ADDR` only** (`Auth.php:39`) | **Open.** Behind Cloudflare/any CDN, `REMOTE_ADDR` is the CDN's IP — every visitor shares one 30/min bucket, so the site is trivially self-DoSed and the legit app breaks. Needs a trusted-proxy constant before honouring `X-Forwarded-For` (never trust XFF unconditionally). |
| **Repo state diverged** — local `main` behind `origin/main`, 18 dirty files, PRD's "git writes blocked" workaround | **Fixed 15/07.** The blocker was a **stale zero-byte `.git/index.lock` from 14/07 15:06** with no owning process — worktree commits (`a64efcc`) succeeded because worktrees use their own index, which is why the two session logs contradicted each other. Lock cleared, work committed (`ba99aee`), merged with #28 (`f298f78`), 73/73 green. |
| **.org free build ships premium code** with runtime-only gating; no `@fs_premium_only` annotations | **Open — critical path.** Freemius's deploy expects annotations to strip premium code from the free zip. Note: freemium-with-upsell is *not* prohibited on .org (thousands do it) and a runtime `pro_required` check isn't itself a rejection trigger — but premium code shouldn't be in the free zip regardless, and **the built ZIP must be inspected, not the source tree**. |
| **Success metrics didn't multiply** (200 × 3% = 6, not 10) | **Fixed** — §7 rewritten, funnels separated. |
| **"Zero marginal cost / 100% margin"** ignores Freemius rev-share, processing, support, hosting | **Fixed** — §3.3. |
| **Starter's MIT licence vs "required" credit** — MIT permits removing the tamper check | **Open (accept).** Treat the credit as voluntary growth, not an enforceable term, or pick a different licence deliberately. |
| **PRD does four jobs and is gitignored** (`.gitignore:74`) — the source-of-truth doc has no history or backup | **Open.** Split into PRD + decision log + release checklist + session notes, and decide whether to track `/docs/`. |

**Gaps from the earlier audit (each becomes a punch-list item below):**

1. ~~**Freemius init is copy-pasted from Airloop** — `divi5-generator.php` has `'premium_slug' => 'Airloop-premium'` and product id `33991`. If that id is Airloop's Freemius product, licensing will activate against the wrong product.~~ **MOSTLY WRONG — corrected 15/07/2026.** Only `premium_slug` was copy-pasted (now `divi5-generator-premium`). **`33991` is this product's own Freemius id** (slug `divi5-generator`), confirmed by Kieran and cross-checked against Airloop's plugin source, which is a *different* product: **id `31132`, slug `airloop`** (`Airloop-premium/src/Freemius.php:32`). The gap-1 inference was drawn from the one bad value and over-generalised to the whole block; it then propagated into the blind-spot audit, the release checklist and PR #29's description. **Still unverified:** whether the 33991 product has plans/pricing configured and a premium build pipeline (F2) — an id being correct is not the same as a product being launch-ready.
2. ~~**Version drift:** plugin header/`D5G_VERSION` = 1.8.0; `readme.txt` stable tag = 1.7.0; `.claude-plugin/plugin.json` = 1.7.0.~~ **Closed** — all synced to 2.0.0 in `ba99aee`, with `app/server.js` `EXPECTED_D5G_VERSION` as the lockstep contract test.
3. **GitHub repo 404s:** `github.com/Kieransaunders/Divi5Generate` is private or renamed. The README install command (`claude plugin marketplace add Kieransaunders/Divi5Generate`), Plugin URI, and support URL are all dead until it's public.
4. ~~**No licence enforcement in code:** every REST endpoint is available to anyone with the API key.~~ **Closed in code, blocked on Freemius** — `pro_gate()` + `requires_pro()` in `RestApi.php` return `403 pro_required`, landed via PR #28 and covered by `RestApiProGateTest.php`. `is_pro()` resolves against Freemius product `33991`, which is the correct product (gap 1's claim to the contrary was wrong). What remains unverified is whether that product is *configured* — plans, pricing, premium build — and whether the gate behaves correctly against live WordPress.
5. **Stale beta claims:** docs and `builderVersion: "5.0.0-public-beta.9.1"` predate Divi 5 official (26/02/2026, now on 5.8/5.9). Need a compatibility pass against current Divi 5 stable.
6. **Naming/trademark risk:** "Divi5 Generator" leads with Elegant Themes' trademark. WordPress.org rejects slugs/names that *begin* with a trademark; ET may also object. "for Divi 5" suffix form is the accepted pattern.
7. **DB export/import endpoint** is a big attack surface for a public commercial plugin (full table transfer over REST). Either Pro-gate it behind an explicit opt-in constant or split it into a separate internal-only plugin.
8. **Pending on-Mac smoke tests** (FOLLOW-UP.md): Stage 2 chat e2e, keep-alive fix confirmation, session-persistence flow.
9. **No EULA/privacy/terms**, no support channel other than the dead GitHub issues link, no landing page.

## 5. Requirements for commercial v2.0

### Functional
- **F1 — Licence gating:** Pro endpoints return `403 { "code": "pro_required" }` on free installs; Freemius activation UI in Settings → Divi5 Generator; app surfaces the Pro state via `/ping`.
- **F2 — Correct Freemius product:** own product id, correct slugs, premium build pipeline (Freemius deploy produces free + premium zips from one source).
- **F3 — .org-compliant free build:** passes Plugin Check; readme.txt with screenshots, FAQ, External Services section (n/a for the connector — it makes no outbound calls; state that explicitly); tested up to current WP.
- **F4 — Divi 5 stable compatibility:** builder emits a current `builderVersion`; import/preview verified on Divi 5.8+; add a version-compat matrix to docs.
- **F5 — Update path:** free updates via .org, Pro updates via Freemius; the app's `EXPECTED_D5G_VERSION` contract test stays the drift guard.
- **F6 — Onboarding:** first-run wizard in the app (connect site → paste key → test ping → generate demo page) replacing the current README-driven setup.

### Non-functional
- Support: single email (support@iconnectit.co.uk) + public issues on the (made-public) repo. Response SLA: 2 business days, stated on the site.
- Legal: UK GDPR privacy notice (the connector stores nothing off-site; the app stores data locally in SQLite — say so), EULA for Pro, refund policy (Freemius default 30 days).
- Security: rate limiting already present (30 req/60s); add Pro-gate + `D5G_ALLOW_DB_TRANSFER` constant for DB endpoints; keep hashed-key auth.

### Non-goals for v2.0
No SaaS, no hosted Claude API, no white-label, no Envato. Divi Marketplace listing is phase 2 (after .org traction — their review queue and rev-share come later).

## 6. Ship plan — triaged punch list

### AUTOMATE — Claude does these (next 2–3 working sessions, no input needed)
- [x] Fix Freemius init block — `premium_slug` corrected to `divi5-generator-premium`; `id`/`public_key` still Airloop's (blocked on Kieran creating the real product — see KIERAN-ONLY)
- [x] Implement F1 licence gating in `RestApi.php` + tests — found already built and fully tested on branch `sswa/gate-pro-rest-endpoints` (openspec change `gate-pro-rest-endpoints`); merged into main by file copy (git merge itself was blocked by a stale-lock issue on this mount — see below), re-verified 68/68 tests green in a clean sandbox
- [x] Sync versions: readme stable tag → 2.0.0, plugin header/`D5G_VERSION` → 2.0.0, `.claude-plugin/plugin.json` + `marketplace.json` → 2.0.0, `app/server.js` `EXPECTED_D5G_VERSION` → 2.0.0 (lockstep contract test), changelog + upgrade notice added
- [ ] Rename pass: "D5G Page Generator for Divi 5" across plugin header, readme, settings page (pending DECISION 2 — not done, avoid renaming until you've confirmed)
- [x] Ran a manual `wp-plugin-submission-check`-style audit (the skill's `scripts/check.py` isn't present in this environment, so this was a manual pass against the same guideline set) — fixed: readme tags trimmed 9→5, short description cut to 135 chars (was 160, over the 150 limit), External Services section corrected to disclose Freemius (was wrongly claiming zero outbound calls — Freemius does call home for licence/updates/opt-in analytics), added Screenshots section, added DB-transfer FAQ. Reviewed and accepted as-is: `$wpdb` calls in `DbExporter`/`DbImporter` interpolate table names from `SHOW TABLES` output (not request input) — standard pattern, not a request-controlled injection risk, especially now Pro-gated + opt-in-gated. No PCP/plugin-check CLI run (needs a live WP install) — do that as part of the on-Mac smoke test.
- [x] Updated stale beta claims + `builderVersion` — `divi-builder.js`'s `BUILDER_VERSION` changed from `'5.0.0-public-beta.9.1'` to `'5.9.0'` (Divi 5 confirmed official since 26/02/2026, now on 5.9 per Elegant Themes' release notes). **UNVERIFIED against a live Divi 5.9 export** — flagged inline in the code and here; confirm on your Mac smoke test before trusting it, since import/preview compatibility hinges on this string. Did not re-run generator fixtures (no fixture asserts an exact value, so risk is low, but worth a real generate+import test).
- [x] Landing page + launch copy — self-contained HTML landing page (hero, workflow/time-savings/QA-gates diagrams from your existing `docs/Marketing/assets/` SVGs, feature grid, Free/£89/£249 pricing) delivered and saved as a Cowork artifact; LinkedIn launch post and one direct-outreach email template — all in `docs/Marketing/launch-2.0.0/`
- [x] Screenshot plan: 6 shots specified in `docs/Marketing/launch-2.0.0/screenshot-plan.md` and in `readme.txt`'s `== Screenshots ==` — capture is a KIERAN-ONLY task (needs your live app + a real WP site)

**Also automated, not on the original list:**
- [x] DB export/import defence-in-depth (PRD gap 7 / `D5G_ALLOW_DB_TRANSFER`): both endpoints now refuse with `403 db_transfer_disabled` unless the site owner defines `D5G_ALLOW_DB_TRANSFER` in `wp-config.php` — on top of the existing Pro-gate. 3 new tests (68 total, up from 65).

**Session log — 14/07/2026:** git write operations (`merge`, `commit`) failed on this mount — `.git/index.lock`/`ORIG_HEAD.lock` etc. get created then can't be unlinked by the sandbox, and the rename-the-lock workaround that's worked before didn't clear it this time (merge got stuck mid-way with a dangling `MERGE_HEAD`, which was cleaned up — no conflict markers, main was left unmodified and safe). Worked around by copying the winning file versions directly rather than via git, and verifying the result with a full PHPUnit run in an isolated sandbox copy (73/73 green) rather than trusting the merge. **Nothing has been `git add`/committed** — see the last-mile checklist for the exact commands to run locally.

> **RESOLVED 15/07/2026 — the git-writes-blocked claim above is stale; do not work around it.** `worktree add`, `add` and `commit` all succeed on this mount now. The copy-files-instead-of-merging workaround is no longer needed, and future sessions should use git normally. The *only* reason the 2.0.0 connector changes are still uncommitted is that nobody has run the commit — not that they can't.

**Follow-up same session:** Kieran flagged Free-tier import limits weren't tight enough — `D5G_Limits::PAGE_IMPORT_LIMIT`/`LIBRARY_IMPORT_LIMIT` existed in code since 1.8.0 (10/5) but were **never actually enforceable in tests**: the `get_option()` bootstrap stub always returned the default, so `save_usage()`'s state was silently discarded. Fixed both — limits dropped to 2/2 per month ("enough to see it, not enough to run a site on" — Kieran's call), and added a real in-memory `OptionStore` to the test bootstrap plus 5 new tests (`LimitsTest.php`) so this path has coverage for the first time. readme.txt FAQ + changelog updated with the actual numbers.

**Session log — 15/07/2026 (distribution pivot, §3.1):**
- [x] Built the free `divi5-starter` plugin at `free-toolkit/` — services-section skill (SKILL.md + fill script + tokenised template + example config), own `.claude-plugin/plugin.json` + `marketplace.json`, README, MIT LICENSE. Template generated from the real builder via new private tool `tools/build-free-starter-template.js`; ships no builder/validator/references. Watermark: visible credit module + `_d5g` provenance key + tamper check in the fill script. Verified: example output passes the full validator (0 errors, 2 accepted warnings: no presets — deliberate, self-contained; no entrance animations — zero-dependency), all failure paths tested (bad icon/hex/url, wrong service count, em-dash normalisation, HTML/JSON injection escaping, stripped-watermark refusal).
- [x] PRD updated: §3.1 added, model table + free/Pro split amended.
- [x] **Committed** as `a64efcc` on branch `free-starter-launch` (worktree `.claude/worktrees/free-starter-launch`, off main 768e80e). 10 files, 528 insertions. Re-verified before commit: manifests coherent, no Freemius reference, watermark + `_d5g` block intact, fill script regenerates `example-output.json` byte-identically with zero deps. Not pushed, no PR.
- [ ] **`builderVersion: "5.9.0"` — the risk is real but is NOT what §6/14-07 says it is.** Read of the Divi 5.8.1 source (local install) settles the mechanism: nothing validates or rejects `builderVersion` at import. It is a *back-compat gate*, consumed in two places:
  - `server/Migration/*.php` — each migration holds a `$_release_version` and runs only `if version_compare(content_version, release_version, '<')`. Highest release_version in 5.8.1 is **5.8.1**.
  - `server/FrontEnd/Assets/DetectFeature.php:1977` — same threshold pattern to decide whether legacy asset/compat paths load.

  So claiming `5.9.0` means "my content is newer than anything you know about" → **every migration and legacy-compat path is skipped**. That is correct *iff* our emitted attr shapes really are current. If any shape is stale, the failure is **silent wrong rendering, not a rejected import** — the PRD's "import/preview compatibility hinges on this string" is wrong and should not drive the test plan.
  - Corollary: a *lower* value is the safer default, not a riskier one. Migrations additionally gate on `has_legacy_*_attrs_tree()`, so they no-op on current content and only act if something genuinely is stale. Claiming a version we have actually tested is more defensible than claiming one we have not.
  - ~~**Local reality check: the two Local sites run Divi 5.8.1 and 5.8.0 — there is no 5.9 to test against here.**~~ **Wrong, corrected 15/07/2026:** `divi-5-airtable-plugin` runs **Divi 5.9.0** and `equitable-private-midwifery-services` runs **5.8.0**. Both halves are testable locally today — 5.9.0 verifies the claim directly, 5.8.0 is the risky case where migrations are skipped. See the test plan in `docs/RELEASE-CHECKLIST.md`.

### KIERAN-ONLY — needs your credentials/accounts (~2–3 hours total)
- [ ] **Review + commit the 2.0.0 connector changes** — still uncommitted in main's working tree (`plugin/`, `app/server.js`, `.claude-plugin/*`, readme/version sync). ~~sandbox git writes are blocked~~ **that blocker was environmental and is gone (15/07)** — just `git add -A && git commit` on a branch off main. Not done for you because the diff is broad and wants your eyes (10 min)
  - [x] The *free-starter* slice of this is already committed — `a64efcc` on branch `free-starter-launch` (`free-toolkit/` + `tools/build-free-starter-template.js`). Not pushed, no PR.
- [ ] ~~Make the GitHub repo public~~ **Superseded by §3.1:** keep THIS repo private (it now carries the licensed toolkit). Instead: create public repo `Kieransaunders/divi5-starter` and push the contents of `free-toolkit/` to its root (10 min)
- [ ] Freemius: attach the full-toolkit zip as a licensed download (or gated download link) so buyers get the Claude plugin with their licence; decide free-signup vs Pro-only access (15 min)
- [ ] Update README.md install instructions — the old `claude plugin marketplace add Kieransaunders/Divi5Generate` public-install path no longer applies to the full toolkit (10 min)
- [ ] Landing page: swap the free-starter credit-line URL target once the real landing URL exists (currently points at iconnectit.co.uk; set in `tools/build-free-starter-template.js` + regenerate, and in the starter's SKILL.md/README) (10 min)
- [ ] Freemius dashboard: create the Divi5 Generator product, confirm product id + public key, set pricing — then swap the two `TODO(Kieran)`-marked values in `divi5-generator.php` (30 min)
- [ ] On-Mac smoke tests from FOLLOW-UP.md (chat e2e, session restore) **plus**: generate one real page and confirm Divi 5.9 accepts `builderVersion: "5.9.0"` on import (the value is unverified — see Session log) (40 min)
- [ ] Capture the 6 screenshots per `docs/Marketing/launch-2.0.0/screenshot-plan.md`, save to `plugin/divi5-generator/.wordpress-org/` (20 min)
- [ ] WordPress.org: submit the free build via the developer portal once the above lands (20 min + review wait)
- [ ] Point a URL at the landing page (artifact + `docs/Marketing/launch-2.0.0/landing-page.html`; subdomain of iconnectit.co.uk is fine) (20 min)

### DECISION — your call, my recommendation attached
1. **Pricing** — recommend £89/£249/year + capped lifetime (see §3). Cheap enough to be an impulse buy for an agency, dear enough to signal it's a pro tool.
2. **Name** — recommend renaming before .org submission: "**D5G — AI Page Generator for Divi 5**" (slug `d5g-page-generator`). Avoids trademark rejection and a forced rename later with an installed base. Keep "Divi5Generate" as the repo/toolkit name.
3. **DB transfer endpoints** — ~~recommend~~ **done**: Pro-gate + `D5G_ALLOW_DB_TRANSFER` opt-in constant implemented and tested (14/07/2026), rather than removal — it's a genuine agency feature but never on by default.
4. **Claude Code dependency** — accept it for v2.0. Position honestly: "works with your Claude subscription". The addressable market is smaller but the margin is 100% and the fit with early-adopter agencies is exact. API-backed generation is the v3 upsell, not a launch blocker.

## 7. Success metrics (first 90 days)

Targets must multiply. The previous set (200 installs × 3% = 6, but "≥ 10 customers") did not.

| Metric | Target | Note |
|---|---|---|
| Free connector installs (.org) | ≥ 350 | tracked separately from the starter — different funnel |
| `divi5-starter` installs (public GitHub) | ≥ 100 | toolkit-side funnel; a starter user has no connector yet |
| Free → Pro conversion | ≥ 3% | of *connector* installs |
| Paying customers | ≥ 10 | 350 × 3% ≈ 10 ✅ |
| Support load | ≤ 2 tickets/week | |
| Refunds | ≤ 1 | |

Diagnostics: conversion strong + installs weak → the constraint is distribution (Divi Facebook groups, YouTube reviewers). Installs strong + conversion weak → Free is too generous; the first lever is moving preset import to Pro, **not** reinstating import quotas (§3.2).

## 8. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Divi 5 block-format churn post-5.9 | Medium | Builder abstraction layer already isolates it; contract test + compat matrix per release |
| ET objects to name/positioning | Medium | Rename (DECISION 2); frame as complementary ecosystem tool; approach ET for marketplace listing in phase 2 |
| Claude Code requirement caps the market | High (known) | Accepted for v2.0; free tier still useful (import/preview any generated JSON); API mode later |
| One-person support load | Low at launch | Docs-first support, FAQ from real tickets, Freemius handles billing/refunds |
| Security incident on a paid plugin | Low | Hashed keys, rate limits, DB endpoints opt-in, no outbound calls; run the wp-performance-review + submission-check skills pre-release |
| Toolkit redistributed by a licence-holder | Medium | Accepted (§3.1): non-public distribution is friction, not DRM. Real protection = hosted API (v3 SaaS). Mitigate with update cadence — pirated copies go stale, Freemius buyers get updates |

---

*Lives at `docs/PRD.md`, now tracked in git (the `/docs/` ignore rule was dropped 15/07/2026 — this file is the source of truth for the commercial model and had no history or backup).*

*This file holds **decisions**. The **work** lives in `docs/RELEASE-CHECKLIST.md` (triaged: blocked-on-Kieran / agent-doable / decisions, plus the `builderVersion` test plan). Session narrative belongs in neither — §6's session logs are kept for now as an audit trail but should not accrete further. Splitting these was audit finding #12: one file doing requirements + strategy + status + session log makes contradictions inevitable, and it produced three of them.*

*Vault overview at `02-Projects/Divi5Generate.md` carries the one-page summary — **stale as of 15/07/2026**: it still says "internal tool, not a customer-facing product" and "no urgent work", both superseded by this PRD.*
