# Divi5Generate 2.0.0 — Release Checklist

**Owner:** Kieran · **Created:** 15/07/2026 · **Goal:** first paid sale within 60 days

Split out of `docs/PRD.md` (audit finding #12 — the PRD was doing four jobs: requirements,
strategy, status and session log, which made contradictions inevitable). The PRD keeps the
*decisions*. This file keeps the *work*. Session narrative belongs in neither.

**The critical path is one item: [K1](#k1). Everything commercial is downstream of it.**

---

## Blocked on Kieran (nothing ships without these)

| # | Task | Where | Est |
|---|---|---|---|
| <a id="k1"></a>**K1** | **Confirm the Freemius product is launch-ready** — plans, pricing, and a premium build pipeline. ~~Create the product / swap the id~~ **not needed:** `33991` / slug `divi5-generator` is this product's own id (confirmed 15/07; Airloop is a different product, id `31132`). The id and public_key stand; what's unverified is whether the product is *configured*. **Unblocks: F2, .org, the `D5G_ASSUME_PRO` decision, and every Pro test path.** | freemius.com | 15 min |
| ~~**K2**~~ | ~~Render test~~ **DONE 15/07** — see [Test results](#test-results). Renders correctly on Divi 5.9.0, watermark and CTA intact. **`builderVersion: "5.9.0"` is settled** — 5.9.0 is the current Divi release, so the 5.8.0 back-compat case was dropped as out of scope (Kieran's call, 15/07). | Local | ✅ |
| **K3** | Merge [PR #29](https://github.com/Kieransaunders/Divi5Generate/pull/29) — capability gate. Mergeable, CI clean. | GitHub | 5 min |
| **K4** | Create public repo `Kieransaunders/divi5-starter`, push `free-toolkit/` contents to its root. **After K2 only.** | GitHub | 10 min |
| **K5** | Freemius: attach the full-toolkit zip as a Pro-licensed download. Needs K1. | Freemius | 15 min |
| **K6** | Point a URL at the landing page (`docs/Marketing/launch-2.0.0/landing-page.html`); subdomain of iconnectit.co.uk is fine. | DNS | 20 min |
| **K7** | Swap the free-starter credit URL to the real landing URL once K6 exists — currently `https://iconnectit.co.uk` placeholder. Distributed copies can't be fixed retroactively, so **before K4**. | repo | 10 min |
| **K8** | Capture the 6 screenshots per `docs/Marketing/launch-2.0.0/screenshot-plan.md` → `plugin/divi5-generator/.wordpress-org/` | Local + app | 20 min |
| **K9** | Update README install instructions — the old public `claude plugin marketplace add Kieransaunders/Divi5Generate` path no longer applies (§3.1). | repo | 10 min |
| **K10** | Submit the free build to WordPress.org. Needs F2 + K8. | .org portal | 20 min + review wait |
| **K11** | On-Mac smoke tests from `FOLLOW-UP.md`: chat e2e, keep-alive, session restore. | Local | 40 min |

## Agent-doable (unblocked — can run while you're away)

| # | Task | Notes |
|---|---|---|
| **A1** | **`harden-rest-auth`** — the last security defect, now **rate-limiter only** (the plaintext-key half of the finding was wrong — see D6). Two-bucket limiter: strict per-IP on failed auth, per-key on success. Today it runs pre-auth and keys on `REMOTE_ADDR` only, so **every visitor behind a CDN shares one 30/min bucket** — the first customer on Cloudflare gets a self-rate-limiting site. Must land before .org. Needs decision D5. |
| **A2** | Spec hygiene — sync + archive `gate-pro-rest-endpoints` (complete, all tasks `[x]`, never synced/archived); its delta spec is stale (`d5g_key`, removed in #29); the §3.2 capability gate has no spec at all. |
| **A3** | Free-starter prep for K4: gitignore `.DS_Store`, parameterise `builderVersion`, pull the credit URL into one constant so K7 is a single edit. |
| **A4** | **F2 — Freemius premium/free build split.** `@fs_premium_only` annotations so premium code strips from the free zip. **Source annotation is doable; verification is not** — proving premium code is absent needs a real Freemius deploy. Blocked on K1. Don't start blind. **Also fixes the activation screen** — see below. |

## Decisions (yours — recommendation attached)

| # | Decision | Recommendation |
|---|---|---|
| **D1** | `D5G_ASSUME_PRO` — keep, or strip from the free build? It's a documented licence bypass (wp-config one-liner = free Pro). | Strip from the free build via F2 annotations. Keep in the premium/dev build. Settle before K10. |
| **D2** | Product name — "Divi5 Generator" leads with ET's trademark; .org rejects names *beginning* with one. | Rename before K10: **"D5G — AI Page Generator for Divi 5"**, slug `d5g-page-generator`. Cheaper now than with an install base. |
| **D3** | Pricing | £89 single (1 user/1 site) / £249 agency (3 users/25 sites) + capped lifetime. See PRD §3.3. |
| **D4** | Free starter: 1 section (Services) or 3 (Hero/Services/CTA)? | **Ship 1.** It's built and validated; Hero+CTA is your first post-launch re-engagement beat. You can't test "feels like a demo" with zero users. |
| **D5** | Do real customers sit behind Cloudflare/CDN? | Decides whether trusted-proxy is core to A1 or a `D5G_TRUSTED_PROXY` opt-in. **Never** honour `X-Forwarded-For` unconditionally — it's caller-supplied. |
| ~~**D6**~~ | ~~Plaintext key: drop it or keep the admin "show my key" UI?~~ | **No decision needed — already correct.** It's show-once: `SettingsPage::render()` deletes `d5g_api_key_plain` on first view (`admin/SettingsPage.php:39-43`), with a regenerate button for later. The audit's finding overstated it. Verified live 15/07. |

## <a id="test-plan"></a>How to run the manual Free test

The site is left ready for this. `divi-5-airtable-plugin` (Divi 5.9.0, `http://localhost:10015`)
has the 2.0.0 connector active and reports `plan: free`.

1. **Load the starter as a free user would** — it isn't published yet, so point Claude Code at
   the local copy: `claude --plugin-dir /Volumes/External/Divi5Generate/free-toolkit`.
   That gives exactly what a free user gets: one plugin, one skill, no builder, no validator,
   no references.
2. **Ask for a section** — e.g. *"create a services section for a roofing company in Exeter,
   three services, navy and orange, CTA 'Get a quote'"*. It writes a JSON file.
3. **Import it** — WP Admin → Divi → Divi Library → Import & Export → Import.
4. **Use it** — open any page in the Visual Builder, insert the section from the Library,
   publish. *That hand-assembly is the Pro pitch; watch how it feels.*
5. **Hit the wall on purpose** — try a page import or `/preview`; both should return
   `403 pro_required` naming the Library.

**Toggling plan:** `wp-config.php:77` holds a commented-out `define( 'D5G_ASSUME_PRO', true );`.
Uncomment for Pro, re-comment for Free. Allow a few seconds for opcache.

**Getting a key:** Settings → Divi5 Generator shows it **once**, then deletes the plaintext
(by design — see D6). Use Regenerate to get a fresh one; the old key stops working.

> **Open question this surfaced, worth settling before K4:** the starter tells users to import
> by hand via Divi's own Library UI, and it ships no deploy skill — so **the free loop never
> touches the free connector**. Divi's native portability does all the work. That leaves the
> .org connector with no job in the free tier, and a free user who never installs it never sees
> the upgrade prompt, so the funnel never runs. Either give the starter a small `import`
> command that POSTs to `/import` (making the connector the easy path and the page-import 403
> the natural upsell moment), or accept the connector is Pro-only and its .org listing is pure
> discovery. Recommend the former.

---

## <a id="test-results"></a>Test results — live Divi 5.9.0, 15/07/2026

Ran the whole free loop against `divi-5-airtable-plugin` (Divi 5.9.0, WP 7.0.1) with the
2.0.0 build deployed and activated.

| Check | Result |
|---|---|
| Activation + key generation | ✅ `D5G_VERSION 2.0.0`, key generated, Divi 5 detected |
| **Airloop licence bleed** | ✅ **`is_pro: false`** — Airloop's Freemius does *not* leak into D5G, despite both being installed |
| `/ping` shape | ✅ `plan: free`, `can` map, `rate_per_min`, **no usage counter** — matches the spec exactly |
| Free → Library import | ✅ 200, created `et_pb_layout`, no warnings |
| Free → page import | ✅ 403 `pro_required`, message names the Library, real upgrade URL |
| **Free → `/preview`** | ❌ **BYPASS — created page 3914 on a Free install.** Fixed (`3efd62c`), re-verified 403 |
| `D5G_ASSUME_PRO` | ✅ works — `plan: pro` after opcache picked up wp-config |
| **Render on Divi 5.9.0** | ✅ **Correct.** Eyebrow, heading, intro, 3 icon columns, "Book a Call" button (exercises the `enable:'on'` toggle), watermark line all present |

**Verdict on `builderVersion: "5.9.0"`: settled ✅.** Proven correct on a live 5.9.0 site. 5.9.0
is the current Divi release, so the 5.8.x back-compat case (content claiming a newer version
than the site, skipping migrations) was dropped as out of scope — Kieran's call, 15/07. The
PRD's long-running "UNVERIFIED, confirm before trusting it" flag on this string is now closed.

**Site left in this state** (dev site, all reversible):
- `divi5-generator` **2.0.0 deployed and activated** (`divi-tools-importer` 1.7.0 left active and untouched — no class conflict, different REST namespaces).
- **`define( 'D5G_ASSUME_PRO', true );` added to `wp-config.php` line 77.** Remove it to test the Free path again.
- Test artefacts deleted (page 3914, library item 3913).
- API key: regenerate from Settings → Divi5 Generator (the plaintext is show-once, so any key pasted into docs is already dead).

### Activation screen: licence-first is a symptom of "no free build", not a config bug

The activation screen demands a licence key and demotes "Activate Free Version" to a small
link — the wrong way round now that Free is a real product, not a trial. **It resolves itself
with F2 and needs no UI work.** Traced through `vendor/freemius/wordpress-sdk/templates/connect.php:57`:

```php
$require_license_key = $is_premium_only ||
    ( $is_freemium && ( $is_premium_code || ! $has_release_on_freemius ) &&
      fs_request_get_bool( 'require_license', ( $is_premium_code || $has_release_on_freemius ) ) );
```

- **Premium build** (`is_premium => true`, `divi5-generator.php:53` — the only build we have): `$is_premium_code` true → the clause is true and `require_license` defaults to true → **licence wall**. Correct behaviour: a premium zip only reaches licence holders.
- **Free build** (`is_premium => false`): `$is_premium_code` false, and the expression collapses to **false** either way `has_release_on_freemius` goes → friendly opt-in, free as the primary action.

So .org users get the right screen automatically — **but only once F2 produces a free build.**
Shipping the current premium build to .org would put a licence wall in front of every free user.

**Testing the free opt-in before F2:** append `&require_license=false` to the activation URL
(the SDK reads exactly that param at line 57), or click the small "Activate Free Version" link
(`skip_activation` — it works, it's just ugly).

**Not set, worth a decision after F2:** `'anonymous_mode' => true` lets the plugin run with no
opt-in screen at all. Don't touch it before F2 — F2 determines what free users see anyway.

**Issues found in passing:**

0. ~~**PHP warning on every library import**~~ **FIXED 15/07.** `Undefined array key "seo_plugin"` at `admin/SettingsPage.php:225` fired for every library import, because library imports correctly log no `seo_plugin` (SEO is page-path only, §3.2) while the log renderer assumed the key. Now null-coalesced to an em-dash. It was a PHP notice on the happy path and Plugin Check would have flagged it.
1. `deploy.sh` rsyncs `vendor/` — including PHPUnit and dev dependencies — into the WP plugin dir. Fine for dev; must not reach the .org build.
2. `CLAUDE.md` still describes the SEO adapters as implementing `DTI_Seo_Adapter`. Stale — the rename to `D5G_` is complete; the 2.0.0 source declares no `DTI_` classes.

## Status of the code

- `release/2.0.0-reconcile` → [PR #29](https://github.com/Kieransaunders/Divi5Generate/pull/29), 5 commits ahead of `main`, CI clean, 75 tests green.
- `free-starter-launch` → `a64efcc`, pushed 15/07, no PR. Feeds K4.
- The capability gate is **code-complete, live-ness unverified**: `is_pro()` resolves against Freemius product `33991`, which *is* the right product (corrected 15/07). So the gate should work once a licence is present — but no site here has one, so any install without `D5G_ASSUME_PRO` returns 403 on every page import. That is the gate behaving correctly on an unlicensed site, not a misconfiguration.
- Unverified end-to-end: nothing proves `handle_import` wires the gate correctly against live WordPress, or that the app renders `pro_required` as anything but a raw 403.
