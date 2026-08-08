-- TodayForest emergency DB snapshot · public table/column inventory
-- Run in Supabase SQL Editor and download the result as CSV.
-- Read-only.

select
  table_schema,
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
