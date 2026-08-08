# TodayForest Supabase schema safety

This directory is intentionally excluded from the production Cloudflare Pages build.

## Emergency snapshot order

Run the SQL files in `snapshot_queries/` in Supabase SQL Editor and export each result as CSV.
The first and most important result is `01_export_rpc_definitions.sql` because the web app
calls many RPC functions that are not reproducible from the repository alone.

Upload the exported CSV files back to the development workspace. They can then be converted
into versioned, restorable migrations without changing the live database first.

These snapshot queries are read-only.
