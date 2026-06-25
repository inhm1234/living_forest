-- 오늘의숲 · 공유나무 씨앗 v1
-- 범위: 기존 친구에게 제안 → 수락 → 둘만의 씨앗 생성 → 공유나무 화면 표시
-- 아직 넣지 않는 것: 마음 기록 연동 성장, 기억의 숲, 완성 후 다음 나무, 자동 알림
-- 기존 친구/편지/장식 테이블과 데이터는 수정하거나 삭제하지 않습니다.

create table if not exists public.garden_shared_trees (
  id uuid primary key default gen_random_uuid(),
  user_one_id uuid not null references auth.users(id) on delete cascade,
  user_two_id uuid not null references auth.users(id) on delete cascade,
  target_steps smallint not null default 20 check (target_steps = 20),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint garden_shared_trees_different_users check (user_one_id <> user_two_id),
  constraint garden_shared_trees_canonical_pair check (user_one_id < user_two_id),
  constraint garden_shared_trees_unique_pair unique (user_one_id, user_two_id)
);

create table if not exists public.garden_shared_tree_invites (
  id uuid primary key default gen_random_uuid(),
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint garden_shared_tree_invites_different_users check (from_user_id <> to_user_id)
);

create index if not exists garden_shared_tree_invites_to_pending_idx
  on public.garden_shared_tree_invites (to_user_id, created_at desc)
  where status = 'pending';

create index if not exists garden_shared_tree_invites_from_pending_idx
  on public.garden_shared_tree_invites (from_user_id, created_at desc)
  where status = 'pending';

alter table public.garden_shared_trees enable row level security;
alter table public.garden_shared_tree_invites enable row level security;

-- 이 테이블들은 브라우저에서 직접 읽지 않고, 아래 RPC만 사용합니다.
revoke all on table public.garden_shared_trees from anon, authenticated;
revoke all on table public.garden_shared_tree_invites from anon, authenticated;

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
  -- 씨앗 v1에서는 progress_count가 0으로 시작합니다.
  -- 다음 단계에서 마음 기록과 연결되면 이 함수의 계산만 확장합니다.
  select
    t.id as tree_id,
    case when t.user_one_id = auth.uid() then t.user_two_id else t.user_one_id end as partner_id,
    0::integer as progress_count,
    t.target_steps::integer,
    t.created_at,
    t.completed_at,
    false as my_recorded_today,
    false as partner_recorded_today
  from public.garden_shared_trees t
  where auth.uid() in (t.user_one_id, t.user_two_id)
  order by t.created_at desc;
$$;

create or replace function public.list_my_garden_shared_tree_invites()
returns table (
  invite_id uuid,
  direction text,
  other_user_id uuid,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    i.id as invite_id,
    case when i.to_user_id = auth.uid() then 'incoming' else 'outgoing' end as direction,
    case when i.to_user_id = auth.uid() then i.from_user_id else i.to_user_id end as other_user_id,
    i.created_at
  from public.garden_shared_tree_invites i
  where i.status = 'pending'
    and auth.uid() in (i.from_user_id, i.to_user_id)
  order by i.created_at desc;
$$;

create or replace function public.create_my_garden_shared_tree_invite(p_friend_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_invite_id uuid;
begin
  if v_me is null then
    raise exception 'LOGIN_REQUIRED';
  end if;
  if p_friend_id is null or p_friend_id = v_me then
    raise exception 'INVALID_SHARED_TREE_FRIEND';
  end if;

  -- 기존 친구 관계가 있는 상대에게만 씨앗을 보낼 수 있습니다.
  if not exists (
    select 1
    from public.list_my_garden_friends() f
    where f.friend_id = p_friend_id
  ) then
    raise exception 'SHARED_TREE_FRIEND_REQUIRED';
  end if;

  v_low := least(v_me, p_friend_id);
  v_high := greatest(v_me, p_friend_id);

  if exists (
    select 1 from public.garden_shared_trees t
    where t.user_one_id = v_low and t.user_two_id = v_high
  ) then
    raise exception 'SHARED_TREE_ALREADY_EXISTS';
  end if;

  if (select count(*) from public.garden_shared_trees t
      where v_me in (t.user_one_id, t.user_two_id) and t.completed_at is null) >= 3 then
    raise exception 'SHARED_TREE_LIMIT_REACHED';
  end if;

  if exists (
    select 1 from public.garden_shared_tree_invites i
    where i.status = 'pending'
      and ((i.from_user_id = v_me and i.to_user_id = p_friend_id)
        or (i.from_user_id = p_friend_id and i.to_user_id = v_me))
  ) then
    raise exception 'SHARED_TREE_INVITE_ALREADY_PENDING';
  end if;

  insert into public.garden_shared_tree_invites (from_user_id, to_user_id)
  values (v_me, p_friend_id)
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

create or replace function public.accept_my_garden_shared_tree_invite(p_invite_id uuid)
returns table (tree_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_invite public.garden_shared_tree_invites%rowtype;
  v_low uuid;
  v_high uuid;
  v_tree_id uuid;
begin
  if v_me is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  select * into v_invite
  from public.garden_shared_tree_invites
  where id = p_invite_id and to_user_id = v_me and status = 'pending'
  for update;

  if not found then
    raise exception 'SHARED_TREE_INVITE_NOT_FOUND';
  end if;

  -- 수락 시점에도 친구 관계가 남아 있는지 한 번 더 확인합니다.
  if not exists (
    select 1 from public.list_my_garden_friends() f
    where f.friend_id = v_invite.from_user_id
  ) then
    raise exception 'SHARED_TREE_FRIEND_REQUIRED';
  end if;

  if (select count(*) from public.garden_shared_trees t
      where v_me in (t.user_one_id, t.user_two_id) and t.completed_at is null) >= 3 then
    raise exception 'SHARED_TREE_LIMIT_REACHED';
  end if;

  v_low := least(v_me, v_invite.from_user_id);
  v_high := greatest(v_me, v_invite.from_user_id);

  insert into public.garden_shared_trees (user_one_id, user_two_id)
  values (v_low, v_high)
  on conflict (user_one_id, user_two_id) do nothing
  returning id into v_tree_id;

  if v_tree_id is null then
    select id into v_tree_id
    from public.garden_shared_trees
    where user_one_id = v_low and user_two_id = v_high;
  end if;

  update public.garden_shared_tree_invites
  set status = 'accepted', responded_at = now()
  where id = v_invite.id;

  -- 같은 두 사람 사이의 반대 방향/중복 제안은 조용히 정리합니다.
  update public.garden_shared_tree_invites
  set status = 'cancelled', responded_at = now()
  where status = 'pending'
    and ((from_user_id = v_me and to_user_id = v_invite.from_user_id)
      or (from_user_id = v_invite.from_user_id and to_user_id = v_me));

  return query select v_tree_id;
end;
$$;

grant execute on function public.list_my_garden_shared_trees() to authenticated;
grant execute on function public.list_my_garden_shared_tree_invites() to authenticated;
grant execute on function public.create_my_garden_shared_tree_invite(uuid) to authenticated;
grant execute on function public.accept_my_garden_shared_tree_invite(uuid) to authenticated;
