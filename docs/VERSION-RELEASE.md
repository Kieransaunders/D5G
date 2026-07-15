# Releasing a new plugin version to Freemius

The version number in the code **is** the release. The deploy workflow zips whatever
is on `main` and uploads it to Freemius (product `33991`, store `16254`) under the
version in the plugin header.

## Steps

1. **Bump the version** in `plugin/divi5-generator/divi5-generator.php`:
   - the `Version:` header line
   - the `D5G_VERSION` define

   For user-facing releases, also update `Stable tag` and the changelog in
   `plugin/divi5-generator/readme.txt`.

2. **Commit and push to `main`** (PR or direct, as usual).

3. **Deploy** (uploads as `pending` — invisible to customers):

   ```bash
   gh workflow run freemius-deploy.yml -f release_mode=pending
   ```

   Or: GitHub → Actions → "Deploy to Freemius" → Run workflow.

4. **Test the pending build**, then promote it (no re-upload, no version bump):

   ```bash
   gh workflow run freemius-deploy.yml -f release_mode=released -f promote_tag_id=<TAG_ID>
   ```

   (`TAG_ID` is printed in the upload run's log and shown in the Freemius dashboard
   deployment list.) Or flip the tag to Released in the dashboard by hand.

## Guardrails

- Freemius **won't accept the same version twice** — a failed "already deployed" upload
  means you forgot step 1.
- `released` pushes the update to every customer's WP admin. Habit: `pending` → test → promote.
- The green tick is trustworthy: the workflow fails the job on any Freemius API error.

## How the workflow authenticates

`.github/workflows/freemius-deploy.yml` calls the Freemius API v1 directly with a
**product-scoped bearer token** (repo secret `FREEMIUS_API_TOKEN`, from
dashboard.freemius.com → product 33991 → Settings → API Token). No developer keys,
no third-party action. It runs `composer install` first because Freemius requires
its SDK inside the zip and `vendor/` is gitignored.

## Release history

| Version | Freemius tag | Released |
|---|---|---|
| 2.0.0 | 136802 | 2026-07-15 |
