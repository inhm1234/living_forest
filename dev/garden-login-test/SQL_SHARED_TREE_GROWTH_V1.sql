-- 오늘의숲 · 공유나무 성장 v1
-- 실행 전제: SQL_SHARED_TREE_SEED_V1.sql 이 이미 적용되어 있어야 합니다.
-- 범위: 개인 마음 기록이 저장될 때, 참여 중인 공유나무마다 빛 조각 1개를 자동으로 기록합니다.
-- 제외: 과거 기록 소급, 완성 후 기억의 숲 이동, 새 나무 생성, 데이터 일괄 삭제.
-- 날짜 기준은 한국 시간(Asia/Seoul)입니다.

create table if not exists public.garden_shared_tree_light_records (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.garden_shared_trees(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  record_id uuid not null references public.garden_records(id) on delete cascade,
  record_date date not null,
  created_at timestamptz not null default now(),
  constraint garden_shared_tree_light_records_one_per_user_day
    unique (tree_id, user_id, record_date)
);

create index if not exists garden_shared_tree_light_records_tree_date_idx
  on public.garden_shared_tree_light_records (tree_id, record_date);

alter table public.garden_shared_tree_light_records enable row level security;

-- 브라우저는 이 테이블을 직접 읽거나 쓰지 않습니다.
-- 공유나무 목록 RPC와 기록 저장 트리거만 사용합니다.
revoke all on table public.garden_shared_tree_light_records from anon, authenticated;

create or replace function public.add_garden_shared_tree_light_for_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tree public.garden_shared_trees%rowtype;
  v_record_date date := (new.created_at at time zone 'Asia/Seoul')::date;
begin
  -- 참여 중인 공유나무만 잠깐 잠가, 두 사람이 같은 시각에 기록해도 20칸을 넘기지 않게 합니다.
  -- 완료 처리나 기억의 숲 이동은 아직 하지 않습니다.
  for v_tree in
    select *
    from public.garden_shared_trees
    where new.user_id in (user_one_id, user_two_id)
      and completed_at is null
    order by id
    for update
  loop
    if (
      select count(*)
      from public.garden_shared_tree_light_records r
      where r.tree_id = v_tree.id
    ) >= v_tree.target_steps then
      continue;
    end if;

    insert into public.garden_shared_tree_light_records (
      tree_id,
      user_id,
      record_id,
      record_date
    )
    values (
      v_tree.id,
      new.user_id,
      new.id,
      v_record_date
    )
    on conflict (tree_id, user_id, record_date) do nothing;
  end loop;

  return new;
end;
$$;

-- 재실행해도 트리거가 하나만 남도록 합니다.
drop trigger if exists garden_records_add_shared_tree_light on public.garden_records;

create trigger garden_records_add_shared_tree_light
after insert on public.garden_records
for each row
execute function public.add_garden_shared_tree_light_for_record();

-- 기존 씨앗 v1의 0 고정 값을 실제 빛 기록 합계와 오늘의 두 사람 상태로 바꿉니다.
create or replace function public.list_my_garden_shared_trees()
returns table (
  tree_id uuid,
  partner_id uuid,
  progress_count integer,
  target_steps integer,
  created_at timestamptz,
  completed_at timestamptz,
  my_recorded_today boolean,
  partner_recorded_today boolean
)
language sql
security definer
set search_path = public
as $$
  select
    t.id as tree_id,
    case when t.user_one_id = auth.uid() then t.user_two_id else t.user_one_id end as partner_id,
    least(t.target_steps::integer, coalesce(lights.progress_count, 0)) as progress_count,
    t.target_steps::integer,
    t.created_at,
    t.completed_at,
    coalesce(lights.my_recorded_today, false) as my_recorded_today,
    coalesce(lights.partner_recorded_today, false) as partner_recorded_today
  from public.garden_shared_trees t
  left join lateral (
    select
      count(*)::integer as progress_count,
      bool_or(
        r.user_id = auth.uid()
        and r.record_date = (now() at time zone 'Asia/Seoul')::date
      ) as my_recorded_today,
      bool_or(
        r.user_id = case
          when t.user_one_id = auth.uid() then t.user_two_id
          else t.user_one_id
        end
        and r.record_date = (now() at time zone 'Asia/Seoul')::date
      ) as partner_recorded_today
    from public.garden_shared_tree_light_records r
    where r.tree_id = t.id
  ) lights on true
  where auth.uid() in (t.user_one_id, t.user_two_id)
  order by t.created_at desc;
$$;

grant execute on function public.list_my_garden_shared_trees() to authenticated;
