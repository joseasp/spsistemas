# Supabase workflow

This project treats the database schema as code. All structural changes live in
SQL migrations under `supabase/migrations/` and are applied to Supabase via the
CLI.

## Setup (one time per machine)

1) Download the Supabase CLI (already placed at `tools/supabase/supabase.exe`).
2) Create an access token in Supabase and save it to:
   - `supabase/env/.env` as `SUPABASE_ACCESS_TOKEN=...`
3) Link the project:
   - `npm run db:link`
4) Install and run Docker Desktop (required for db dump/pull/reset).

## Day-to-day flow

- Edit or add migrations in `supabase/migrations/`.
- Apply them to the linked project:
  - `npm run db:push`

## Reading state from Supabase

- Pull current schema into migrations (requires Docker):
  - `npm run db:pull`
- Dump schema for inspection (requires Docker):
  - `npm run db:dump`
  - Save to file: `npm run db:dump | Out-File -FilePath supabase/schema.sql -Encoding utf8`

## Common gotchas

- Run commands from the project root (`C:\...\restaurante_silva`).
- If `db:dump` hangs on first run, it is downloading a Docker image; wait.

## Notes

- Frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env`.
- Never put the Supabase secret key in frontend code.
