-- Margenia business logo storage.
-- Review and run manually in Supabase SQL Editor.

begin;

do $$
begin
  if to_regclass('public.businesses') is null then
    raise exception 'Antes de instalar logos de negocio debes ejecutar las migraciones base de Margenia.';
  end if;

  if to_regclass('storage.buckets') is null
    or to_regclass('storage.objects') is null then
    raise exception 'Supabase Storage no está disponible en este proyecto.';
  end if;
end;
$$;

alter table public.businesses
  add column if not exists logo_path text;

insert into storage.buckets (
  allowed_mime_types,
  file_size_limit,
  id,
  name,
  public
)
values (
  array['image/png', 'image/jpeg', 'image/webp'],
  2097152,
  'business-assets',
  'business-assets',
  true
)
on conflict (id) do update
set
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit,
  public = true;

create or replace function public.user_owns_business_asset(p_business_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null
    or p_business_id is null
    or p_business_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return false;
  end if;

  v_business_id := p_business_id::uuid;

  return exists (
    select 1
    from public.businesses b
    where b.id = v_business_id
      and b.owner_id = v_user_id
  );
end;
$$;

revoke all on function public.user_owns_business_asset(text) from public;
revoke all on function public.user_owns_business_asset(text) from anon;
grant execute on function public.user_owns_business_asset(text) to authenticated;

drop policy if exists "Public can view business assets" on storage.objects;
create policy "Public can view business assets"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-assets');

drop policy if exists "Users can upload logos for their businesses" on storage.objects;
create policy "Users can upload logos for their businesses"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = 'businesses'
    and public.user_owns_business_asset((storage.foldername(name))[2])
  );

drop policy if exists "Users can update logos for their businesses" on storage.objects;
create policy "Users can update logos for their businesses"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = 'businesses'
    and public.user_owns_business_asset((storage.foldername(name))[2])
  )
  with check (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = 'businesses'
    and public.user_owns_business_asset((storage.foldername(name))[2])
  );

drop policy if exists "Users can delete logos for their businesses" on storage.objects;
create policy "Users can delete logos for their businesses"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-assets'
    and (storage.foldername(name))[1] = 'businesses'
    and public.user_owns_business_asset((storage.foldername(name))[2])
  );

create or replace function public.update_business_logo(
  p_business_id uuid,
  p_logo_url text,
  p_logo_path text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
  v_logo_path text := nullif(trim(coalesce(p_logo_path, '')), '');
  v_logo_url text := nullif(trim(coalesce(p_logo_url, '')), '');
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if v_logo_url is not null and v_logo_path is null then
    raise exception 'La URL del logo requiere una ruta válida en Storage.';
  end if;

  if v_logo_path is not null
    and v_logo_path not like ('businesses/' || p_business_id::text || '/%') then
    raise exception 'La ruta del logo no pertenece a este negocio.';
  end if;

  if v_logo_url is not null
    and position(v_logo_path in v_logo_url) = 0 then
    raise exception 'La URL del logo debe corresponder a la ruta de Storage.';
  end if;

  update public.businesses
  set
    logo_path = v_logo_path,
    logo_url = v_logo_url
  where id = p_business_id
    and owner_id = v_user_id
  returning id into v_business_id;

  if v_business_id is null then
    raise exception 'No tienes permiso para modificar este negocio.';
  end if;

  return v_business_id;
end;
$$;

revoke all on function public.update_business_logo(uuid, text, text) from public;
revoke all on function public.update_business_logo(uuid, text, text) from anon;
grant execute on function public.update_business_logo(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;
