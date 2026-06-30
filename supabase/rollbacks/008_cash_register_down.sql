-- Rollback for Margenia cash register module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

drop function if exists public.close_cash_session(uuid, uuid, jsonb, text);
drop function if exists public.create_cash_movement(uuid, uuid, text, text, text, numeric, text, text, timestamptz);
drop function if exists public.open_cash_session(uuid, numeric, text);

do $$
begin
  if to_regclass('public.cash_session_counts') is not null then
    drop policy if exists "Users can insert cash session counts for their businesses" on public.cash_session_counts;
    drop policy if exists "Users can view cash session counts for their businesses" on public.cash_session_counts;
  end if;

  if to_regclass('public.cash_movements') is not null then
    drop policy if exists "Users can update cash movements for their businesses" on public.cash_movements;
    drop policy if exists "Users can insert cash movements for their businesses" on public.cash_movements;
    drop policy if exists "Users can view cash movements for their businesses" on public.cash_movements;
  end if;

  if to_regclass('public.cash_sessions') is not null then
    drop policy if exists "Users can update cash sessions for their businesses" on public.cash_sessions;
    drop policy if exists "Users can insert cash sessions for their businesses" on public.cash_sessions;
    drop policy if exists "Users can view cash sessions for their businesses" on public.cash_sessions;
    drop trigger if exists cash_sessions_set_updated_at on public.cash_sessions;
  end if;
end;
$$;

drop table if exists public.cash_session_counts;
drop table if exists public.cash_movements;
drop table if exists public.cash_sessions;

do $$
begin
  if to_regclass('public.cash_session_number_seq') is not null
    and obj_description('public.cash_session_number_seq'::regclass, 'pg_class') = 'created_by_008_cash_register' then
    drop sequence public.cash_session_number_seq;
  end if;

  if to_regclass('public.cash_movement_number_seq') is not null
    and obj_description('public.cash_movement_number_seq'::regclass, 'pg_class') = 'created_by_008_cash_register' then
    drop sequence public.cash_movement_number_seq;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
