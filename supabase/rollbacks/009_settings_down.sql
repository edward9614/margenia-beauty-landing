-- Rollback for Margenia settings module.
-- Review and run manually in Supabase SQL Editor only if needed.

begin;

drop function if exists public.update_business_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

drop function if exists public.update_user_preferences(
  text, text, text, text, text
);

do $$
begin
  if to_regclass('public.user_preferences') is not null then
    drop policy if exists "Users can update their own preferences" on public.user_preferences;
    drop policy if exists "Users can insert their own preferences" on public.user_preferences;
    drop policy if exists "Users can view their own preferences" on public.user_preferences;
    drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_preferences') is not null
    and obj_description('public.user_preferences'::regclass, 'pg_class') = 'created_by_009_settings' then
    drop table public.user_preferences;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
