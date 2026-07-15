# Plan: Shared Team Library (no SaaS)

**Goal:** let a team share brand / brief / design assets across machines — without building or running a SaaS. Each user runs the agent on their **own Claude Code subscription**; the only thing that needs to be shared is the *data store*.

**Date:** 23/06/2026 · **v2** (team / commercial)

---

## 1. The reframed problem

Everything the app + skills collect outside page generation — brand profiles, briefs, designer exports, design projects — lives in a **local** SQLite DB:

```
~/Library/Application Support/Divi5Generator/
├── history.db        ← all tables (gitignored: *.db)
└── exports/          ← designer export JSON, tokens, variables files
```

The plugin syncs via git; the data doesn't. For a **team**, the requirement is stronger than "copy to my new machine": several people need to read a common library and contribute back to it, with no central server to run.

**Key insight:** a **private git repo is already a free, multi-user, versioned shared database.** Read access = repo collaborator. History, diffs, and merge are built in. Compute stays on each user's own machine/subscription. That gives you team sharing with **zero backend** — the same mechanism that already distributes the plugin.

---

## 2. What's in scope

| Table (`app/db.js`) | Holds | Shared? |
|---|---|---|
| `brand_profiles` | colours, fonts, voice, variables (JSON in `data`) | **Yes** |
| `saved_briefs` | reusable page briefs (JSON in `data`) | **Yes** |
| `designer_exports` | label/brand + **filepath** to an export JSON | **Yes** (file travels too) |
| `design_projects` / `design_pages` | groupings of brand+export+pages | Phase 2 |
| `generations`, `output_files` | page-gen history + outputs | No (page generation) |
| `settings` | API keys, site URLs | **No — never shared** (secrets, machine-specific) |

**Path subtlety:** `designer_exports.filepath` etc. are absolute. The bundle copies those files and rebuilds paths on import. JSON blobs (`data`) are self-contained.

---

## 3. Architecture — two layers

This is the part the commercial angle changes. Separate **code** from **data**, and **vendor** content from **customer** content.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PLUGIN  (this repo)            → ships commercially        │
│    skills, app, WP importer.        via marketplace / licence │
│    Read-only to customers.          Updated by you.           │
├─────────────────────────────────────────────────────────────┤
│ 2a. VENDOR LIBRARY  (optional)    → starter kits / templates  │
│     curated brands & briefs.        shipped *with* the plugin │
│     Read-only, updated by you.      (or its own pinned repo)  │
├─────────────────────────────────────────────────────────────┤
│ 2b. CUSTOMER LIBRARY  (per team)  → each agency's OWN private │
│     their brands/briefs/designs.    git repo. Read-write by   │
│     You never see this data.        their team. No SaaS.      │
└─────────────────────────────────────────────────────────────┘
```

- The **plugin** is your product. It must **not** contain any customer brand data.
- The **customer library** is a private git repo *each customer owns*. The app is configured per-install to point at it. Their team are repo collaborators; git handles who can read vs push.
- Optional **vendor library** = starter templates you curate and ship, so a new customer isn't staring at an empty app.

This is why the earlier "commit into the plugin repo" idea is wrong for commercial: customer data must live in the customer's own repo, never yours.

---

## 4. Team sharing model (no backend)

| Concern | How git gives it for free |
|---|---|
| **Membership** | Repo collaborators (or a GitHub org team). |
| **Read access** | `git pull` / `clone`. Read-only members can be granted read scope. |
| **Write / contribute** | Editors `push`; or open PRs if you want review. |
| **Versioning / audit** | Full commit history — who changed which brand, when. |
| **Conflicts** | One-file-per-record format → concurrent edits to *different* brands never clash; same-brand edits surface as a normal git merge (rare on small teams). |
| **Auth** | HTTPS + PAT, or SSH deploy key, stored in app settings. No login system to build. |

**Honest trade-offs:**

- **Git auth is friction for non-technical team members.** Mitigations: the app stores the token and shells out to git so users never touch the CLI; or offer a **synced-folder** transport (Dropbox/Drive/iCloud) as an alternative source — same export/import code, but *last-write-wins, no merge* (flag this clearly).
- **Not real-time.** It's pull/push, not live collaboration. Fine for a brand library (read-heavy, occasional writes). If you ever need many concurrent editors or live sync, *that's* the point where Convex/SaaS earns its keep — be honest with customers about that ceiling.
- **Binary growth.** Logos + export JSON bloat git history over time; add git-lfs later if needed.

---

## 5. Design — the Library layer (app-side)

### 5.1 On-disk format (the shared repo / folder)

```
library/
├── manifest.json              # schema version, exported_at, counts, checksums
├── brand-profiles/<slug>.json
├── briefs/<slug>.json
└── designer-exports/
    ├── <slug>.meta.json
    └── <slug>.export.json
```

One file per record → readable diffs, sane merges. Slugified names; hash suffix on collision. Absolute paths dropped on export, rebuilt on import by sibling convention. Upsert key = `(type, name)` + content hash: same name+hash = skip; same name, different hash = keep both with `(imported)` suffix so a pull never silently clobbers local edits.

### 5.2 Config (per install, in `settings` — never committed)

- `librarySource` = `git` | `folder`
- `libraryRepo` = git URL (for `git`)
- `libraryToken` / SSH key ref (for `git`, HTTPS)
- `libraryPath` = local checkout / synced-folder path
- `libraryRole` = `reader` | `editor` (UI hint only; git enforces the real permission)

### 5.3 App endpoints (`app/server.js`)

- `POST /library/pull` → `git pull` (or read folder) → import into DB. Reports added/updated/skipped/conflicts.
- `POST /library/push` → export DB → `library/` → `git commit && git push` (editors only). Reports committed counts.
- `GET  /library/status` → DB-vs-bundle diff + last sync time + current branch/ahead-behind.

### 5.4 New skill: `library-sync`

`skills/library-sync/SKILL.md`, three verbs:

- **setup** → configure source (repo URL + token, or folder path). First-run for a new team member.
- **pull / "get the latest library"** → `/library/pull`.
- **push / "share my changes"** → `/library/push` (export → commit → push).

Triggers: `share library, team library, pull library, push library, sync brands, get latest brands, library setup, add me to the team library`.

### 5.5 New team-member flow (end state)

```bash
claude plugin marketplace add <your-marketplace>
claude plugin install divi5generate@divi5generate
# open the app, then:
/divi5generate:library-sync   → "setup"  (paste team repo URL + token, once)
/divi5generate:library-sync   → "pull"
```

→ the whole team's brands, briefs, and exports are present and editable locally. Make changes → "push" to share.

---

## 6. Build steps

1. **Library writer** — `app/lib/library-export.js`: DB → folder + `manifest.json` (checksums). Test against a temp `DIVI5_DATA_DIR`.
2. **Library reader** — `app/lib/library-import.js`: folder → DB upsert + file copy + path rewrite + conflict handling. Round-trip test (export → wipe → import → assert equal).
3. **Git transport** — `app/lib/library-git.js`: clone/pull/commit/push via shelled git, token-authenticated. Folder transport is a no-op passthrough.
4. **Endpoints** — `/library/pull`, `/library/push`, `/library/status`.
5. **Settings UI** — source type, repo URL, token, role; Pull / Push / status panel.
6. **Skill** — `skills/library-sync/SKILL.md` (setup / pull / push).
7. **Secrets hygiene** — assert `settings` (API keys, site URLs, library token) are **never** written into `library/`. Test for it.
8. **Docs** — README + DEVELOPMENT: team setup, how to create a customer library repo, reader vs editor.
9. **Verification** — two-clone test: machine A push → machine B pull → assert identical library; plus a deliberate same-brand conflict to confirm graceful handling.

---

## 7. Commercial / distribution notes

- **Plugin** ships via your marketplace (public or licensed). Contains **no customer data**.
- **Provisioning a customer:** they create a private repo (or you script it), add their team as collaborators, paste the URL into the app once. That's the whole "onboarding" — no accounts for you to manage.
- **Vendor starter library** (optional): ship curated templates so the app isn't empty on day one; customers pull yours read-only, build their own on top in their private repo.
- **Pricing handle:** value is the plugin + skills + (optionally) the starter library; the customer brings their own GitHub + Claude subscriptions, so your run-cost is ~zero.

---

## 8. Decisions for you

1. **Transport default:** git repo (versioned, merges, some auth friction) as primary, with synced-folder as the easy-mode fallback? Or folder-only to avoid git entirely for non-technical teams?
2. **Per-customer repo provisioning:** manual (customer makes the repo) vs. app/script-assisted (you create+invite via GitHub API)?
3. **Vendor starter library:** ship curated templates with the plugin, or launch with empty libraries only?
4. **Contribution control:** direct push for editors (simple) vs. PR-based review (safer, more friction)?
5. **Scope:** core three (brands/briefs/exports) first, design projects in Phase 2 — confirm?
