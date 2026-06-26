-- 오늘의숲 / 살아있는 숲
-- 운영자 전용 비공개 피드백 v1
-- 앱 사용자는 피드백을 작성만 할 수 있고, 서로의 피드백은 조회할 수 없습니다.
-- 운영자는 Supabase Dashboard의 Table Editor에서 public.garden_feedback을 확인합니다.

create table if not exists public.garden_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname_snapshot text not null default '',
  category text not null check (category in ('issue', 'idea', 'cheer')),
  message text not null check (char_length(btrim(message)) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint garden_feedback_nickname_length check (char_length(nickname_snapshot) <= 80)
);

create index if not exists garden_feedback_created_at_idx
  on public.garden_feedback (created_at desc);

alter table public.garden_feedback enable row level security;

-- 브라우저는 테이블을 직접 읽거나 쓰지 않습니다.
-- 아래 SECURITY DEFINER RPC만 사용하므로 다른 사용자의 의견은 앱에서 볼 수 없습니다.
revoke all on table public.garden_feedback from anon, authenticated;

create or replace function public.submit_my_garden_feedback(
  p_category text,
  p_message text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_category text := lower(btrim(coalesce(p_category, '')));
  v_message text := btrim(coalesce(p_message, ''));
  v_nickname text := '';
  v_feedback_id uuid;
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  if v_category not in ('issue', 'idea', 'cheer') then
    raise exception 'INVALID_FEEDBACK_CATEGORY';
  end if;

  if char_length(v_message) < 1 or char_length(v_message) > 1000 then
    raise exception 'INVALID_FEEDBACK_MESSAGE';
  end if;

  select coalesce(nickname, '')
    into v_nickname
  from public.garden_profiles
  where id = v_user_id;

  insert into public.garden_feedback (
    user_id,
    nickname_snapshot,
    category,
    message
  )
  values (
    v_user_id,
    left(coalesce(v_nickname, ''), 80),
    v_category,
    v_message
  )
  returning id into v_feedback_id;

  return v_feedback_id;
end;
$$;

grant execute on function public.submit_my_garden_feedback(text, text) to authenticated;
