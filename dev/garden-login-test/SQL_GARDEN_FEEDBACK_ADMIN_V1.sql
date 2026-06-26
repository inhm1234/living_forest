-- 오늘의숲 / 살아있는 숲
-- 운영자 전용 '숲의 편지함 관리' v1
-- 이 SQL은 등록된 운영자 1명만 문의 목록 조회, 읽음 처리, 답장 저장을 할 수 있게 합니다.
-- 브라우저 코드에는 운영자 UUID를 넣지 않고, 모든 권한 검사는 Supabase 안에서만 합니다.

-- 운영자 계정: garden_profiles의 닉네임 '인형민' 행에서 확인한 현재 카카오 계정 UUID
-- 운영자 계정을 바꾸려면 아래 세 함수의 v_admin_id 값만 함께 교체하세요.

alter table public.garden_feedback
  add column if not exists operator_status text not null default 'new',
  add column if not exists operator_read_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'garden_feedback_operator_status_check'
      and conrelid = 'public.garden_feedback'::regclass
  ) then
    alter table public.garden_feedback
      add constraint garden_feedback_operator_status_check
      check (operator_status in ('new', 'read', 'replied'));
  end if;
end;
$$;

-- 이미 Table Editor에서 답장을 써 둔 의견이 있다면 답장 완료로 맞춰 둡니다.
update public.garden_feedback
set
  operator_status = 'replied',
  operator_read_at = coalesce(operator_read_at, operator_replied_at, now())
where nullif(btrim(coalesce(operator_reply, '')), '') is not null
  and operator_status <> 'replied';

-- 기존 답장 시각 트리거를 확장합니다.
-- Table Editor에서 답장을 직접 수정해도 상태와 시각이 어긋나지 않습니다.
create or replace function public.set_garden_feedback_operator_reply_timestamp()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.operator_reply := nullif(btrim(coalesce(new.operator_reply, '')), '');

  if new.operator_reply is distinct from old.operator_reply then
    new.operator_replied_at := case
      when new.operator_reply is null then null
      else now()
    end;

    if new.operator_reply is not null then
      new.operator_status := 'replied';
      new.operator_read_at := coalesce(new.operator_read_at, now());
    elsif old.operator_status = 'replied' then
      new.operator_status := case
        when new.operator_read_at is null then 'new'
        else 'read'
      end;
    end if;
  end if;

  return new;
end;
$$;

-- 운영자 여부만 확인하는 안전한 RPC입니다. 다른 계정에는 false만 반환합니다.
create or replace function public.get_my_garden_feedback_admin_access()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id constant uuid := '2029663f-4af7-48df-a32e-47f855c9f1e1'::uuid;
begin
  return auth.uid() = v_admin_id;
end;
$$;

-- 운영자만 전체 문의를 읽습니다. user_id는 반환하지 않고, 작성 당시 닉네임만 관리 화면에 전달합니다.
create or replace function public.list_garden_feedback_for_admin(
  p_status text default 'all',
  p_category text default 'all'
)
returns table (
  feedback_id uuid,
  nickname_snapshot text,
  category text,
  message text,
  created_at timestamptz,
  operator_status text,
  operator_read_at timestamptz,
  operator_reply text,
  operator_replied_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id constant uuid := '2029663f-4af7-48df-a32e-47f855c9f1e1'::uuid;
  v_status text := lower(btrim(coalesce(p_status, 'all')));
  v_category text := lower(btrim(coalesce(p_category, 'all')));
begin
  if auth.uid() is distinct from v_admin_id then
    raise exception 'FEEDBACK_ADMIN_ONLY';
  end if;

  if v_status not in ('all', 'new', 'read', 'replied') then
    raise exception 'INVALID_FEEDBACK_STATUS';
  end if;

  if v_category not in ('all', 'issue', 'idea', 'cheer') then
    raise exception 'INVALID_FEEDBACK_CATEGORY';
  end if;

  return query
  select
    feedback.id,
    feedback.nickname_snapshot,
    feedback.category,
    feedback.message,
    feedback.created_at,
    feedback.operator_status,
    feedback.operator_read_at,
    feedback.operator_reply,
    feedback.operator_replied_at
  from public.garden_feedback as feedback
  where (v_status = 'all' or feedback.operator_status = v_status)
    and (v_category = 'all' or feedback.category = v_category)
  order by feedback.created_at desc;
end;
$$;

-- '읽음'만 남깁니다. 이미 답장한 문의의 상태는 되돌리지 않습니다.
create or replace function public.mark_garden_feedback_read(
  p_feedback_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id constant uuid := '2029663f-4af7-48df-a32e-47f855c9f1e1'::uuid;
  v_found boolean := false;
begin
  if auth.uid() is distinct from v_admin_id then
    raise exception 'FEEDBACK_ADMIN_ONLY';
  end if;

  update public.garden_feedback
  set
    operator_status = case
      when operator_status = 'new' then 'read'
      else operator_status
    end,
    operator_read_at = coalesce(operator_read_at, now())
  where id = p_feedback_id
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

-- 답장을 저장합니다. 기존 답장을 수정해도 사용자는 같은 문의에서 최신 답장을 봅니다.
create or replace function public.save_garden_feedback_admin_reply(
  p_feedback_id uuid,
  p_reply text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id constant uuid := '2029663f-4af7-48df-a32e-47f855c9f1e1'::uuid;
  v_reply text := btrim(coalesce(p_reply, ''));
  v_found boolean := false;
begin
  if auth.uid() is distinct from v_admin_id then
    raise exception 'FEEDBACK_ADMIN_ONLY';
  end if;

  if char_length(v_reply) < 1 or char_length(v_reply) > 1200 then
    raise exception 'INVALID_OPERATOR_REPLY';
  end if;

  update public.garden_feedback
  set
    operator_reply = v_reply,
    operator_status = 'replied',
    operator_read_at = coalesce(operator_read_at, now())
  where id = p_feedback_id
  returning true into v_found;

  return coalesce(v_found, false);
end;
$$;

revoke all on function public.get_my_garden_feedback_admin_access() from public;
revoke all on function public.list_garden_feedback_for_admin(text, text) from public;
revoke all on function public.mark_garden_feedback_read(uuid) from public;
revoke all on function public.save_garden_feedback_admin_reply(uuid, text) from public;

grant execute on function public.get_my_garden_feedback_admin_access() to authenticated;
grant execute on function public.list_garden_feedback_for_admin(text, text) to authenticated;
grant execute on function public.mark_garden_feedback_read(uuid) to authenticated;
grant execute on function public.save_garden_feedback_admin_reply(uuid, text) to authenticated;
