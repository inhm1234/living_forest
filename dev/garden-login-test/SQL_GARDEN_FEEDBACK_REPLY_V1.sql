-- 오늘의숲 / 살아있는 숲
-- 비공개 피드백 답장 v1
-- 운영자는 Supabase Table Editor에서 public.garden_feedback.operator_reply만 작성합니다.
-- 사용자는 자기 의견과 그 의견에 달린 답장만 RPC로 읽을 수 있습니다.

alter table public.garden_feedback
  add column if not exists operator_reply text,
  add column if not exists operator_replied_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'garden_feedback_operator_reply_length'
      and conrelid = 'public.garden_feedback'::regclass
  ) then
    alter table public.garden_feedback
      add constraint garden_feedback_operator_reply_length
      check (
        operator_reply is null
        or char_length(btrim(operator_reply)) between 1 and 1200
      );
  end if;
end;
$$;

-- Table Editor에서 운영자가 답장을 쓰거나 수정하면 답장 시각을 자동으로 남깁니다.
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
  end if;

  return new;
end;
$$;

drop trigger if exists garden_feedback_operator_reply_timestamp on public.garden_feedback;

create trigger garden_feedback_operator_reply_timestamp
before update of operator_reply on public.garden_feedback
for each row
execute function public.set_garden_feedback_operator_reply_timestamp();

-- 브라우저에서는 자기 피드백과 그에 대한 운영자 답장만 읽습니다.
create or replace function public.list_my_garden_feedback()
returns table (
  feedback_id uuid,
  category text,
  message text,
  created_at timestamptz,
  operator_reply text,
  operator_replied_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'LOGIN_REQUIRED';
  end if;

  return query
  select
    feedback.id,
    feedback.category,
    feedback.message,
    feedback.created_at,
    feedback.operator_reply,
    feedback.operator_replied_at
  from public.garden_feedback as feedback
  where feedback.user_id = v_user_id
  order by feedback.created_at desc;
end;
$$;

revoke all on function public.list_my_garden_feedback() from public;
grant execute on function public.list_my_garden_feedback() to authenticated;
