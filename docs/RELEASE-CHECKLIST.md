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
| ~~**K2**~~ | ~~Render test on Divi 5.9.0~~ **DONE 15/07** — see [Test results](#test-results). Renders correctly on 5.9.0, watermark and CTA intact. **5.8.0 half still outstanding** (that Local site wasn't running) — the risky case where migrations are skipped. | Local | 5 min |
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
| **A1** | **`harden-rest-auth`** — the last security defects. Two-bucket rate limiter (strict per-IP on failed auth, per-key on success); `REMOTE_ADDR`-only keying means **every visitor behind a CDN shares one 30/min bucket**; plaintext key in `d5g_api_key_plain`. Must land before .org. Needs decisions D5/D6. |
| **A2** | Spec hygiene — sync + archive `gate-pro-rest-endpoints` (complete, all tasks `[x]`, never synced/archived); its delta spec is stale (`d5g_key`, removed in #29); the §3.2 capability gate has no spec at all. |
| **A3** | Free-starter prep for K4: gitignore `.DS_Store`, parameterise `builderVersion`, pull the credit URL into one constant so K7 is a single edit. |
| **A4** | **F2 — Freemius premium/free build split.** `@fs_premium_only` annotations so premium code strips from the free zip. **Source annotation is doable; verification is not** — proving premium code is absent needs a real Freemius deploy. Blocked on K1. Don't start blind. |

## Decisions (yours — recommendation attached)

| # | Decision | Recommendation |
|---|---|---|
| **D1** | `D5G_ASSUME_PRO` — keep, or strip from the free build? It's a documented licence bypass (wp-config one-liner = free Pro). | Strip from the free build via F2 annotations. Keep in the premium/dev build. Settle before K10. |
| **D2** | Product name — "Divi5 Generator" leads with ET's trademark; .org rejects names *beginning* with one. | Rename before K10: **"D5G — AI Page Generator for Divi 5"**, slug `d5g-page-generator`. Cheaper now than with an install base. |
| **D3** | Pricing | £89 single (1 user/1 site) / £249 agency (3 users/25 sites) + capped lifetime. See PRD §3.3. |
| **D4** | Free starter: 1 section (Services) or 3 (Hero/Services/CTA)? | **Ship 1.** It's built and validated; Hero+CTA is your first post-launch re-engagement beat. You can't test "feels like a demo" with zero users. |
| **D5** | Do real customers sit behind Cloudflare/CDN? | Decides whether trusted-proxy is core to A1 or a `D5G_TRUSTED_PROXY` opt-in. **Never** honour `X-Forwarded-For` unconditionally — it's caller-supplied. |
| **D6** | Plaintext key: drop it (show-once at generation + regenerate button) or keep the admin "show my key" UI? | Drop it. "Hashed-key auth" is a half-truth while the plaintext sits in the same options table. |

## <a id="test-plan"></a>Test plan (K2) — the `builderVersion` question

**The PRD is out of date here.** It says *"the two Local sites run Divi 5.8.1 and 5.8.0 — there
is no 5.9 to test against here."* Not true as of 15/07/2026:

| Local site | Divi | Tests |
|---|---|---|
| `divi-5-airtable-plugin` | **5.9.0** | the `builderVersion: "5.9.0"` claim directly — does our emitted markup render correctly on the version we claim? |
| `equitable-private-midwifery-services` | **5.8.0** | the risky case — content claims 5.9.0 on an older site, so **every migration is skipped**. If any attr shape is stale, this is where it renders wrong. |

Why it matters: `builderVersion` is a back-compat gate, not a validity check — nothing rejects
it at import. Claiming 5.9.0 says "my content is newer than anything you know about", so Divi
skips every migration and legacy-compat path. That's correct *only if* our attr shapes are
current — and they come from `divi-builder.js`, developed against `5.0.0-public-beta.9.1`.
**A stale shape fails silently as wrong rendering, not a rejected import.**

If it renders correctly on 5.9.0 but wrong on 5.8.0 → drop the emitted `builderVersion` to a
version we've actually tested. The PRD already reasons that a lower value is the *safer*
default: migrations gate on `has_legacy_*_attrs_tree()` and no-op on current content.

**Note:** the connector installed on `equitable` is the old `divi-tools-importer`, pre-rename.
Update it before testing the 2.0.0 REST paths there.

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

**Verdict on `builderVersion: "5.9.0"`:** proven correct *on a 5.9.0 site*. The claim is no
longer unverified there. **Still unproven on 5.8.0**, which is the case that matters — content
claiming 5.9.0 on an older site skips every migration, and a stale attr shape would fail
silently as wrong rendering.

**Site left in this state** (dev site, all reversible):
- `divi5-generator` **2.0.0 deployed and activated** (`divi-tools-importer` 1.7.0 left active and untouched — no class conflict, different REST namespaces).
- **`define( 'D5G_ASSUME_PRO', true );` added to `wp-config.php` line 77.** Remove it to test the Free path again.
- Test artefacts deleted (page 3914, library item 3913).
- API key: `d5gk_edab66208ce70b67ba8a3d688b3133584d4aae9bbb44c649`

**Two issues found in passing, not yet actioned:**
1. `deploy.sh` rsyncs `vendor/` — including PHPUnit and dev dependencies — into the WP plugin dir. Fine for dev; must not reach the .org build.
2. `CLAUDE.md` still describes the SEO adapters as implementing `DTI_Seo_Adapter`. Stale — the rename to `D5G_` is complete; the 2.0.0 source declares no `DTI_` classes.

## Status of the code

- `release/2.0.0-reconcile` → [PR #29](https://github.com/Kieransaunders/Divi5Generate/pull/29), 5 commits ahead of `main`, CI clean, 75 tests green.
- `free-starter-launch` → `a64efcc`, pushed 15/07, no PR. Feeds K4.
- The capability gate is **code-complete, live-ness unverified**: `is_pro()` resolves against Freemius product `33991`, which *is* the right product (corrected 15/07). So the gate should work once a licence is present — but no site here has one, so any install without `D5G_ASSUME_PRO` returns 403 on every page import. That is the gate behaving correctly on an unlicensed site, not a misconfiguration.
- Unverified end-to-end: nothing proves `handle_import` wires the gate correctly against live WordPress, or that the app renders `pro_required` as anything but a raw 403.
