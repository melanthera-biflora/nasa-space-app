# Deploying Climatch on Render

For the team's hosted app. People who run Climatch on their own computer follow the README instead; nothing here is
needed for that, and the hosted database is not shared with them.

## What runs where

| Piece | Where | Size |
| --- | --- | --- |
| `climatch-web`: the website (Next.js) | Render web service, Oregon | Starter |
| `climatch-api`: the API and the NASA data files (FastAPI) | Render web service, Oregon | Standard (2 GB) |
| The cache of finished reports, states and place lookups | The team's Supabase project (us-west-1) | As it is now |
| The data files (about 600 MB) | Downloaded from the team's Google Drive on every API build | |

`render.yaml` at the repo root describes both services. Visitors only call the website; it reaches the API over
Render's private network (`API_HOSTPORT`), so there is no cross-site setup.

**Why the API needs 2 GB:** one report for a new place peaks at about 450 MB (pandas and the NetCDF files), so a
512 MB plan (Free or Starter) would restart as soon as two people open new places at once. Check the current prices
on [render.com/pricing](https://render.com/pricing) before you start.

## One-time setup (the owner)

1. **Merge the deploy PR into `main`.** Render reads `render.yaml` from `main` and redeploys on every push to it.
2. **Update the hosted database's tables.** From the repo root, with the Supabase Session pooler string in your local
   `.env` as `DATABASE_URL`:

   ```bash
   .venv/Scripts/python -m backend.store.migrate --remote
   ```

   ```bash
   .venv/Scripts/python -m backend.store.seed
   ```

   `migrate` runs every file in `backend/migrations/` (each is safe to run again; `004` lets the smoke and haze maps be
   stored). `seed` stores the demo reports and the five maps. `--remote` is required because the database isn't on
   your computer.
3. **Create the services from the Blueprint.** In the [Render dashboard](https://dashboard.render.com/): **New →
   Blueprint**, connect GitHub, and give Render's GitHub app access to `melanthera-biflora/nasa-space-app` (the repo
   is private, so an owner of that GitHub account approves it). Pick the repo and the `main` branch.
4. **Paste the database string.** Render asks for `DATABASE_URL` (it's marked `sync: false`, so it never comes from
   git). Paste the same Session pooler string, then **Apply**.
5. **Wait for the first builds.** The API takes about 5–10 minutes (packages, then the 600 MB data download); the
   website about 3 minutes.
6. **Check it.**
   - `https://<the API's onrender.com address>/api/v1/health` says `{"ok": true, "store": "postgres"}`.
   - The website's address (Render shows it on `climatch-web`) opens the household page, and a demo case opens a
     report.

## Keeping it running

- **Every push to `main`** redeploys only the service whose folder changed (`buildFilter` in `render.yaml`).
- **The Supabase project** was planned for deletion after the demo week. Keep it while the app is hosted; without
  it the API still works from files, but every new place is rebuilt from NASA on each visit after a restart.
- **The Drive file** must stay shared as "Anyone with the link". If Google Drive refuses the download (it rate-limits
  large files now and then), the API build stops with "the download isn't a zip": retry the deploy later, or put the
  zip somewhere else and set `DATA_ZIP_URL` on `climatch-api`.

## When something goes wrong

| What you see | Where to look | Likely fix |
| --- | --- | --- |
| The API restarts with "out of memory" | `climatch-api` → Logs and Metrics | A bigger plan |
| Health says `"store": "files"` | `climatch-api` logs: `database unavailable (…)` | Fix `DATABASE_URL` in the dashboard; after several wrong passwords Supabase blocks logins for a few minutes |
| The website says "We can't reach Climatch" | `climatch-api` events | The API is deploying or down; wait or redeploy |
| The website build fails | `climatch-web` → Events → the failed deploy | Run `npm --prefix frontend run build` locally to see the same error |

## Secrets

`DATABASE_URL` lives only in Render's dashboard and in the owner's local `.env`. Never put it in `render.yaml`, a
commit, an issue or a chat channel. The website needs no secret at all.
