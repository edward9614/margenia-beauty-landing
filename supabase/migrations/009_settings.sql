-- Margenia settings module.
-- Review and run manually in Supabase SQL Editor.

begin;

do $$
begin
  if to_regclass('public.businesses') is null
    or to_regclass('public.profiles') is null then
    raise exception 'Antes de instalar Configuración debes ejecutar la migración 001_app_foundation.sql.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    execute '
      create function public.set_updated_at()
      returns trigger
      language plpgsql
      set search_path = public
      as $fn$
      begin
        new.updated_at = now();
        return new;
      end;
      $fn$;
    ';
  end if;
end;
$$;

alter table public.businesses
  add column if not exists business_type text,
  add column if not exists country text,
  add column if not exists currency text default 'COP',
  add column if not exists description text,
  add column if not exists city text,
  add column if not exists address text,
  add column if not exists phone text,
  add column if not exists contact_email text,
  add column if not exists instagram text,
  add column if not exists website text,
  add column if not exists logo_url text,
  add column if not exists timezone text default 'America/Bogota',
  add column if not exists language text default 'es',
  add column if not exists date_format text default 'DD/MM/YYYY',
  add column if not exists fiscal_name text,
  add column if not exists fiscal_id text,
  add column if not exists fiscal_regime text,
  add column if not exists fiscal_address text,
  add column if not exists billing_email text;

alter table public.businesses
  alter column currency set default 'COP',
  alter column timezone set default 'America/Bogota',
  alter column language set default 'es',
  alter column date_format set default 'DD/MM/YYYY';

do $$
begin
  if to_regclass('public.user_preferences') is null then
    create table public.user_preferences (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null unique references auth.users(id) on delete cascade,
      first_name text,
      last_name text,
      phone text,
      language text default 'es',
      theme text default 'system',
      created_at timestamptz default now(),
      updated_at timestamptz default now()
    );

    comment on table public.user_preferences is 'created_by_009_settings';
  end if;
end;
$$;

alter table public.user_preferences
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists language text default 'es',
  add column if not exists theme text default 'system',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_preferences_language_check'
      and conrelid = 'public.user_preferences'::regclass
  ) then
    alter table public.user_preferences
      add constraint user_preferences_language_check
      check (language in ('es', 'pt', 'en'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'user_preferences_theme_check'
      and conrelid = 'public.user_preferences'::regclass
  ) then
    alter table public.user_preferences
      add constraint user_preferences_theme_check
      check (theme in ('light', 'system'));
  end if;
end;
$$;

alter table public.user_preferences enable row level security;

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

drop policy if exists "Users can view their own preferences" on public.user_preferences;
create policy "Users can view their own preferences"
  on public.user_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Users can insert their own preferences" on public.user_preferences;
create policy "Users can insert their own preferences"
  on public.user_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "Users can update their own preferences" on public.user_preferences;
create policy "Users can update their own preferences"
  on public.user_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_preferences from public;
revoke all on public.user_preferences from anon;
grant select, insert, update on public.user_preferences to authenticated;

create or replace function public.update_business_settings(
  p_business_id uuid,
  p_name text,
  p_description text,
  p_business_type text,
  p_country text,
  p_city text,
  p_address text,
  p_phone text,
  p_contact_email text,
  p_instagram text,
  p_website text,
  p_logo_url text,
  p_currency text,
  p_timezone text,
  p_language text,
  p_date_format text,
  p_fiscal_name text,
  p_fiscal_id text,
  p_fiscal_regime text,
  p_fiscal_address text,
  p_billing_email text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
  v_currency text := upper(coalesce(nullif(trim(p_currency), ''), 'COP'));
  v_language text := lower(coalesce(nullif(trim(p_language), ''), 'es'));
  v_date_format text := coalesce(nullif(trim(p_date_format), ''), 'DD/MM/YYYY');
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'America/Bogota');
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if nullif(trim(coalesce(p_name, '')), '') is null then
    raise exception 'El nombre del negocio es obligatorio.';
  end if;

  if v_currency not in ('COP', 'USD', 'MXN', 'PEN', 'CLP', 'ARS', 'BRL') then
    raise exception 'La moneda seleccionada no es válida.';
  end if;

  if v_language not in ('es', 'pt', 'en') then
    raise exception 'El idioma seleccionado no es válido.';
  end if;

  if v_date_format not in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD') then
    raise exception 'El formato de fecha seleccionado no es válido.';
  end if;

  if v_timezone not in (
    'America/Bogota',
    'America/Mexico_City',
    'America/Lima',
    'America/Santiago',
    'America/Argentina/Buenos_Aires',
    'America/Sao_Paulo'
  ) then
    raise exception 'La zona horaria seleccionada no es válida.';
  end if;

  update public.businesses
  set
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    business_type = nullif(trim(coalesce(p_business_type, '')), ''),
    country = nullif(trim(coalesce(p_country, '')), ''),
    city = nullif(trim(coalesce(p_city, '')), ''),
    address = nullif(trim(coalesce(p_address, '')), ''),
    phone = nullif(trim(coalesce(p_phone, '')), ''),
    contact_email = nullif(trim(coalesce(p_contact_email, '')), ''),
    instagram = case
      when nullif(trim(coalesce(p_instagram, '')), '') is null then null
      when left(trim(p_instagram), 1) = '@' then regexp_replace(trim(p_instagram), '^@+', '@')
      else '@' || trim(p_instagram)
    end,
    website = nullif(trim(coalesce(p_website, '')), ''),
    logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
    currency = v_currency,
    timezone = v_timezone,
    language = v_language,
    date_format = v_date_format,
    fiscal_name = nullif(trim(coalesce(p_fiscal_name, '')), ''),
    fiscal_id = nullif(trim(coalesce(p_fiscal_id, '')), ''),
    fiscal_regime = nullif(trim(coalesce(p_fiscal_regime, '')), ''),
    fiscal_address = nullif(trim(coalesce(p_fiscal_address, '')), ''),
    billing_email = nullif(trim(coalesce(p_billing_email, '')), '')
  where id = p_business_id
    and owner_id = v_user_id
  returning id into v_business_id;

  if v_business_id is null then
    raise exception 'No tienes permiso para modificar este negocio.';
  end if;

  return v_business_id;
end;
$$;

create or replace function public.update_user_preferences(
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_language text,
  p_theme text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_preference_id uuid;
  v_language text := lower(coalesce(nullif(trim(p_language), ''), 'es'));
  v_theme text := lower(coalesce(nullif(trim(p_theme), ''), 'system'));
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if v_language not in ('es', 'pt', 'en') then
    raise exception 'El idioma seleccionado no es válido.';
  end if;

  if v_theme not in ('light', 'system') then
    raise exception 'La preferencia visual seleccionada no es válida.';
  end if;

  insert into public.user_preferences (
    first_name,
    last_name,
    language,
    phone,
    theme,
    user_id
  )
  values (
    nullif(trim(coalesce(p_first_name, '')), ''),
    nullif(trim(coalesce(p_last_name, '')), ''),
    v_language,
    nullif(trim(coalesce(p_phone, '')), ''),
    v_theme,
    v_user_id
  )
  on conflict (user_id) do update
  set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    language = excluded.language,
    phone = excluded.phone,
    theme = excluded.theme,
    updated_at = now()
  returning id into v_preference_id;

  return v_preference_id;
end;
$$;

revoke all on function public.update_business_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.update_business_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) from anon;
grant execute on function public.update_business_settings(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

revoke all on function public.update_user_preferences(
  text, text, text, text, text
) from public;
revoke all on function public.update_user_preferences(
  text, text, text, text, text
) from anon;
grant execute on function public.update_user_preferences(
  text, text, text, text, text
) to authenticated;

notify pgrst, 'reload schema';

commit;
