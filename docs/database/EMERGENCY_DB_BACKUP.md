# TodayForest DB emergency backup · 2026-08-08

The repository does not currently contain enough SQL to recreate all RPCs used by the live app.
The live Supabase database is therefore the source of truth until a complete snapshot is captured.

## Do not do yet

- Do not delete or rename live RPCs.
- Do not create a fresh production database from repository SQL.
- Do not treat the SQL files under `dev/` as a complete migration history.

## Next action

1. Open Supabase SQL Editor.
2. Run `supabase/snapshot_queries/01_export_rpc_definitions.sql`.
3. Download the result as CSV and keep it outside the public web deployment.
4. Repeat queries 02–05 for policies, columns, indexes and triggers.
5. Convert the exported snapshot into versioned migrations only after reviewing it.

The queries are metadata reads and do not modify live data.
