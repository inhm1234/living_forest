# TodayForest recovery status · 2026-08-08

## Completed

- Public tables confirmed RLS-enabled.
- Anonymous EXECUTE on SECURITY DEFINER functions reduced to zero.
- Push webhook no longer contains service_role authorization.
- Admin statistics moved behind authenticated admin RPC.
- Schema baseline and final push Edge Function source are now versionable.

## Next, non-emergency work

1. Export/reference seed data.
2. Establish an actual data-backup routine separate from schema baseline.
3. Add a small restore test on a non-production Supabase project before treating the baseline as fully disaster-tested.
