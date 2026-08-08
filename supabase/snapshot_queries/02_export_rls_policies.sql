-- TodayForest emergency DB snapshot · RLS policies
-- Run in Supabase SQL Editor and download the result as CSV.
-- Read-only.

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
