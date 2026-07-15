# Pro toolkit delivery (Freemius-hosted add-on)

How a paying customer receives the full private toolkit (the `divi5generate`
Claude Code plugin — skills, builder, references) after buying Pro.

**Model (PRD §3.1/§3.2):** the toolkit is the product; the connector is the
licence carrier. The toolkit is **not** on public GitHub and **not** bundled in
the plugin zip (that would leak it into the free .org build — PRD §4). It ships
as a **Freemius-hosted add-on download**, gated by the licence. Free users get
the public `divi5-starter` instead.

## The automated hand-off

1. Customer buys Pro → activates the licence in **Divi5 Generator → Account**.
2. **Divi5 Generator → Add-Ons** now shows the "Divi 5 Toolkit" with a
   **Download** button (Freemius serves a signed, licence-checked URL).
3. They unzip and run `claude plugin marketplace add /path/to/divi5generate`.

The plugin already wires this up: `has_addons => true`
(`divi5-generator.php`), and the settings page shows the download link + install
command to Pro users only (`is_pro()` branch in `admin/SettingsPage.php`).

## Build the toolkit zip

```bash
bash tools/build-toolkit-zip.sh          # → ~/Desktop/divi5generate-toolkit.zip
```

`git archive` under the hood: only committed files, no `node_modules`, no
untracked cruft, no stray secrets. Top-level folder `divi5generate/` with
`.claude-plugin/ + skills/ + commands/`. ~22 MB.

## One-time Freemius dashboard setup (only you can do this)

1. **Confirm Pro is sellable first** — Divi5 Generator → **Pricing**: at least
   one paid plan with a price. If the checkout
   (`checkout.freemius.com/plugin/33991/`) is blank, this is why. Nothing below
   matters until a buyer can pay. *(PRD K1 — still open.)*
2. **Create the add-on** — Add-Ons → New Add-On, name "Divi 5 Toolkit".
3. **Include it in the Pro plan(s)** at £0 so every Pro licence unlocks it
   (Add-On → Plans / bundle).
4. **Deploy the zip** — upload `divi5generate-toolkit.zip` to the add-on
   (Add-On → Deployment → upload), set the version, release it.
5. Test end to end on a licensed staging site: Add-Ons tab → Download works.

## Updating the toolkit

Rebuild and re-upload with a bumped version. If manual upload gets tedious,
mirror `.github/workflows/freemius-deploy.yml` against the add-on's own product
id — deferred until it's worth the CI (the toolkit changes rarely).

## Gotcha

`has_addons => true` makes the Add-Ons menu appear even before the add-on
exists in the dashboard — it just shows empty. Create the add-on (steps above)
so the menu isn't a dead end for early Pro users.
