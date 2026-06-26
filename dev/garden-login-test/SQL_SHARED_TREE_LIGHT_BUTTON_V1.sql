-- 오늘의숲 · 공유나무 '오늘의 빛 남기기' v1
-- 실행 전제: SQL_SHARED_TREE_SEED_V1.sql와 이전 SQL_SHARED_TREE_GROWTH_V1.sql가 이미 적용되어 있습니다.
-- 이 파일은 개인 정원 마음 기록과 공유나무 빛을 분리합니다.
-- 기존에 저장된 공유나무 빛 기록은 삭제하거나 되돌리지 않습니다.
-- 날짜 기준은 한국 시간(Asia/Seoul)입니다.

-- 1) 이전 성장 v1의 개인 기록 자동 적립을 중단합니다.
-- 개인 정원 마음 기록은 이제 공유나무에 영향을 주지 않습니다.
drop trigger if exists garden_records_add_shared_tree_light on public.garden_records;
drop function if exists public.add_garden_shared_tree_light_for_record();

-- 2) 수동으로 남기는 빛은 개인 마음 기록과 연결하지 않으므로 record_id를 비워둘 수 있게 합니다.
-- 이미 저장된 이전 자동 기록은 그대로 유지됩니다.
alter table public.garden_shared_tree_light_records
  alter column record_id drop not null;

-- 3) 공유나무 화면에서 참여자가 직접 하루 한 번 빛을 남기는 RPC입니다.
-- 테이블은 브라우저에서 직접 읽거나 쓰지 않으며, 이 RPC만 사용합니다.
create or replace function public.add_my_garden_shared_tree_light(p_tree_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tree public.garden_shared_trees%rowtype;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_me is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  -- 현재 사용자가 참여한, 아직 진행 중인 나무만 잠급니다.
  select * into v_tree
  from public.garden_shared_trees
  where id = p_tree_id
    and v_me in (user_one_id, user_two_id)
    and completed_at is null
  for update;

  if not found then
    raise exception 'SHARED_TREE_LIGHT_NOT_FOUND';
  end if;

  if (
    select count(*)
    from public.garden_shared_tree_light_records r
    where r.tree_id = v_tree.id
  ) >= v_tree.target_steps then
    raise exception 'SHARED_TREE_LIGHT_COMPLETE';
  end if;

  if exists (
    select 1
    from public.garden_shared_tree_light_records r
    where r.tree_id = v_tree.id
      and r.user_id = v_me
      and r.record_date = v_today
  ) then
    raise exception 'SHARED_TREE_LIGHT_ALREADY_RECORDED';
  end if;

  insert into public.garden_shared_tree_light_records (
    tree_id,
    user_id,
    record_id,
    record_date
  )
  values (
    v_tree.id,
    v_me,
    null,
    v_today
  );
end;
$$;

-- 4) 기존 목록 RPC는 빛 기록 합계와 오늘의 두 빛 상태를 그대로 반환합니다.
-- 이 함수에는 개인 정원 마음 기록을 읽거나 연결하는 로직이 없습니다.
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

grant execute on function public.add_my_garden_shared_tree_light(uuid) to authenticated;
grant execute on function public.list_my_garden_shared_trees() to authenticated;
