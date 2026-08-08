-- TodayForest decoration catalog/recipe seed snapshot
-- Snapshot date: 2026-08-08
-- Purpose: restore non-user reference data after rebuilding the database.
-- Safe to rerun: UPSERTs by primary key. Does not delete rows.

begin;

-- 1) Decoration item catalog
insert into public.garden_decoration_items (
  item_key,
  display_name,
  item_kind,
  is_active,
  created_at,
  updated_at,
  is_daily_findable,
  default_placement_slot,
  daily_find_sort_order
) values
  ('amber_mushroom', '주황 버섯', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'meadow_left', 50),
  ('branch_letter', '낮은 가지의 봉투', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'low_branch_left', 90),
  ('crafted_flower_meadow', '꽃빛 작은 들판', 'recipe_result', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, false, NULL, 0),
  ('crafted_moonlit_mushroom_lamp', '달빛 버섯등', 'recipe_result', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, false, NULL, 0),
  ('crafted_mossy_path', '이끼꽃 숲길', 'recipe_result', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, false, NULL, 0),
  ('firefly_jar', '반딧불 병', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'back_garden_left', 110),
  ('forest_ribbon', '숲 리본', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'low_branch_right', 100),
  ('leafy_pile', '낙엽 더미', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'meadow_right', 60),
  ('little_sign', '작은 표지판', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'back_garden_right', 120),
  ('mossy_round_rock', '이끼 낀 둥근 돌', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'tree_base_right', 40),
  ('mushroom_pair', '작은 버섯 두 개', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'tree_base_left', 30),
  ('pink_wildflower', '분홍 들꽃', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'front_bed_left', 10),
  ('tiny_hedgehog', '작은 고슴도치', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'path_left', 70),
  ('tiny_squirrel', '작은 다람쥐', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'path_right', 80),
  ('white_daisies', '하얀 데이지', 'basic', true, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:47:02.755531+00:00'::timestamptz, true, 'front_bed_right', 20)
on conflict (item_key) do update set
  display_name = excluded.display_name,
  item_kind = excluded.item_kind,
  is_active = excluded.is_active,
  updated_at = excluded.updated_at,
  is_daily_findable = excluded.is_daily_findable,
  default_placement_slot = excluded.default_placement_slot,
  daily_find_sort_order = excluded.daily_find_sort_order;

-- 2) Decoration recipes
insert into public.garden_decoration_recipes (
  recipe_key,
  display_name,
  description,
  result_item_key,
  required_items,
  flexible_quantity,
  flexible_item_keys,
  is_enabled,
  sort_order,
  created_at,
  updated_at
) values
  ('flower_meadow_v1', '꽃빛 작은 들판', '들꽃과 데이지가 모여 정원 한편에 작은 꽃길을 만들어요.', 'crafted_flower_meadow', $seed_json$[{"item_key":"pink_wildflower","quantity":1},{"item_key":"white_daisies","quantity":1}]$seed_json$::jsonb, 1, ARRAY['pink_wildflower', 'white_daisies', 'mushroom_pair', 'mossy_round_rock', 'amber_mushroom', 'leafy_pile', 'tiny_hedgehog', 'tiny_squirrel', 'branch_letter', 'forest_ribbon', 'firefly_jar', 'little_sign']::text[], true, 10, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:33:35.010341+00:00'::timestamptz),
  ('moonlit_mushroom_lamp_v1', '달빛 버섯등', '두 종류의 버섯이 은은한 숲빛을 머금은 특별장식이 돼요.', 'crafted_moonlit_mushroom_lamp', $seed_json$[{"item_key":"mushroom_pair","quantity":1},{"item_key":"amber_mushroom","quantity":1}]$seed_json$::jsonb, 1, ARRAY['pink_wildflower', 'white_daisies', 'mushroom_pair', 'mossy_round_rock', 'amber_mushroom', 'leafy_pile', 'tiny_hedgehog', 'tiny_squirrel', 'branch_letter', 'forest_ribbon', 'firefly_jar', 'little_sign']::text[], true, 20, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:33:35.010341+00:00'::timestamptz),
  ('mossy_path_v1', '이끼꽃 숲길', '둥근 돌과 낙엽이 포근한 숲길로 이어져요.', 'crafted_mossy_path', $seed_json$[{"item_key":"mossy_round_rock","quantity":1},{"item_key":"leafy_pile","quantity":1}]$seed_json$::jsonb, 1, ARRAY['pink_wildflower', 'white_daisies', 'mushroom_pair', 'mossy_round_rock', 'amber_mushroom', 'leafy_pile', 'tiny_hedgehog', 'tiny_squirrel', 'branch_letter', 'forest_ribbon', 'firefly_jar', 'little_sign']::text[], true, 30, '2026-08-03T21:30:25.010855+00:00'::timestamptz, '2026-08-03T21:33:35.010341+00:00'::timestamptz)
on conflict (recipe_key) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  result_item_key = excluded.result_item_key,
  required_items = excluded.required_items,
  flexible_quantity = excluded.flexible_quantity,
  flexible_item_keys = excluded.flexible_item_keys,
  is_enabled = excluded.is_enabled,
  sort_order = excluded.sort_order,
  updated_at = excluded.updated_at;

commit;
