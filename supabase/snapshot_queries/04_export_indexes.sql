-- TodayForest emergency DB snapshot · indexes
-- Run in Supabase SQL Editor and download the result as CSV.
-- Read-only.

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
