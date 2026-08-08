-- TodayForest emergency DB snapshot · RPC/function definitions
-- Run in Supabase SQL Editor, then download the result as CSV.
-- This is read-only: it does not alter the database.

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_get_functiondef(p.oid) as create_function_sql
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname, pg_get_function_identity_arguments(p.oid);
