# Divi5 Generator — Frontend Redesign Plan

**Source of truth:** `redesgn /App redesign discussion/Divi5 Generator.dc.html` (Claude Design mockup, dark theme).
**Target:** `app/public/` (`index.html` · `app.js` · `style.css`) served by `server.js`.
**Date:** 30/06/2026 · Status: plan only, not started.

---

## 1. The key finding

The mockup is a **reskin, not a rebuild**. The current app already has every screen the
mockup shows, and every backend route they need already exists:

| Mockup screen | Already in app? | Backend route(s) already wired |
|---|---|---|
| Chat (chat column + canvas) | Yes (`data-tab="chat"`) | `/chat`, `/agent/chat`, `/stream/:id`, `/agent/sessions` |
| Live preview / Generating / QA canvas | Partial | `/generate` + `/stream/:id` (SSE log), `/preview-html/:id`, `/screenshot`, `/import/:id` |
| Brand profiles | Yes (`brand`) | `/brand`, `/brand/extract-url`, `/brand/extract-divi`, `/brand/:id` CRUD, `/brand/:id/deploy` |
| Designs projects | Yes (`designs`) | `/designs` CRUD |
| Brief (structured form) | Yes (`generate`) — *richer than mockup* | `/generate`, `/briefs`, `/et-pages` |
| Migrate (pull/push) | Yes (`migrate`) | `/migrate/pull`, `/migrate/push` |
| Settings (WP + plugin) | Yes (`settings`) | `/settings`, `/test-connection`, `/download-plugin`, `/prereqs` |

**Implication:** no new server work. The whole job is the front end — a new visual
language and a restructured Chat shell. That de-risks it massively.

---

## 2. What actually changes (gap analysis)

**Shell / navigation**
- Text tab-bar in a left sidebar → **78px icon nav rail** (Chat · Brand · Designs · Brief · Migrate · Settings), account avatar pinned bottom. Active state = orange tint + border.
- Current sidebar is form-first; mockup is **chat-first** with a dedicated canvas.

**Chat tab — the biggest lift**
- Two columns: **432px chat column** (header, scrolling messages, composer) + **flexible canvas**.
- Canvas has **four states**: `empty` → `live preview` (desktop/mobile toggle) → `generating` (step checklist + live JetBrains-Mono log stream) → `QA` (Compare / Live / Mockup tabs).
- Empty state: gradient logo, "Describe the page you want to build", three clickable example prompts.
- Message bubbles, animated thinking dots, auto-growing composer with attach + "Brief" shortcut + Send.

**Visual system (applies everywhere)**
- Background `#0a0b0e`, panels `#0c0d11` / `#121419` / `#141620`, hairline borders `rgba(255,255,255,0.06–0.12)`.
- Primary orange `#f75d00` → hover `#ff7a2b`; accent yellow `#f9c22d`; green `#34d399` / `#16a34a`; danger `#ef4444`.
- Fonts: **Plus Jakarta Sans** (UI) + **JetBrains Mono** (logs/hex). Tight heading tracking (`-0.02em`), weights to 800.
- Custom thin scrollbars, pill badges (Active / Live preview / Draft imported / Connected), 4 keyframe animations (`d5b` dots, `d5pulse`, `d5fade`, `d5spin`).

**Per-screen polish** — Brand cards + brand-kit (palette swatches with hex, typeface specimen), Designs project cards with page thumbnails, simplified Brief, two-panel Migrate with pull/push, Settings with connection status pill.

---

## 3. The one real decision: how to build it

| Option | What it means | Verdict |
|---|---|---|
| **A. Reskin in place** | Keep vanilla `app.js` logic + endpoint wiring, restructure `index.html` DOM and rewrite `style.css` to the mockup; re-point handlers to new IDs. | **Recommended.** Reuses ~123KB of working, wired behaviour. No build step — right for a local Express tool. Risk is mechanical (ID re-pointing), not architectural. |
| B. Fresh Preact-via-CDN SPA | Rebuild the front end as a single-file Preact app (no webpack) mirroring the mockup's component model — which is literally authored as a React/DCLogic component. | Cleanest match to the mockup's structure and closest to your React instinct, but throws away working vanilla wiring and risks regressing subtle behaviours (SSE streaming, file drop, ET templates). Reach for this only if the in-place restructure gets too tangled in Phase 2. |
| C. Full framework + build step | React + Vite/bundler. | Rejected — adds a toolchain to a zero-build local tool for no payoff. |

**Assumption I'm running with:** Option A, vanilla, no build step. Say the word if you'd
rather I prototype the Chat shell in Preact-CDN first — it's the only screen where the
component model genuinely earns its keep.

**Keep the richer Brief.** The mockup's Brief is simpler than what you have (it drops ET
templates, Theatre.js motion, designer-export upload, output folder). Don't lose those —
restyle the existing fields and tuck the advanced ones behind an "Advanced" disclosure so
the default view matches the mockup's calm look.

---

## 4. Phased build (each phase ships standing on its own)

**Phase 0 — Design tokens + global CSS** *(half day, ~70% of the visual lift)*
Define CSS custom properties (colours, fonts, radii, shadows), load the two Google Fonts,
rewrite base typography, buttons, inputs, scrollbars, badges, the 4 keyframes. Instant
premium feel before any structural change.

**Phase 1 — App shell**
Replace the text tab-bar with the icon nav rail (active/hover states, bottom avatar).
Keep the existing JS tab-routing — just new markup + classes.

**Phase 2 — Chat tab restructure** *(the hard part)*
Build the chat-column + canvas split and the four canvas states. Wire:
`empty → preview` to `/chat` (or `/agent/chat`), `generating` step list + log stream to the
existing `/stream/:id` SSE, `QA` Compare to `/preview-html/:id` + `/screenshot`, Import to
`/import/:id`. Desktop/Mobile toggle drives an iframe width.

**Phase 3 — Reskin the other five screens**
Brand, Designs, Brief (with Advanced disclosure), Migrate, Settings — restyle existing DOM
to the card/panel system. Mostly CSS + light markup; logic untouched.

**Phase 4 — Polish & responsive**
Entrance animations, `prefers-reduced-motion`, focus rings, keyboard nav, accessibility
pass (contrast already strong on dark), behaviour at 1440 / 1024 / mobile. Final A/B against
the mockup.

---

## 5. Risks & how I'll handle them

- **`app.js` is 123KB and DOM-coupled** → restructuring IDs can break handlers. Mitigation: phase it, keep the logic layer, re-point IDs screen-by-screen, smoke-test each tab before moving on.
- **SSE generating-log mapping** → the mockup's scripted log is fake; real logs come from `/stream/:id`. Mitigation: map real event types to the step checklist early in Phase 2.
- **Brief feature loss** → covered above (Advanced disclosure).
- **No automated UI tests** → I'll add a lightweight Playwright smoke pass (launch app, click each nav item, run one generate end-to-end) so the reskin doesn't regress wiring.

---

## 6. What I'd need from you before building

Nothing blocking. Defaults I'll assume unless you redirect: Option A (vanilla, no build),
keep the richer Brief behind Advanced, work directly in `app/public/` on a branch. The mockup
is the visual spec; I'll match it screen-for-screen and flag any place the live data shape
forces a deviation.
