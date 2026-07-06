-- Margenia business logo storage rollback.
-- Review and run manually in Supabase SQL Editor.

begin;

drop function if exists public.update_business_logo(uuid, text, text);
drop function if exists public.user_owns_business_asset(text);

do $$
begin
  if to_regclass('storage.objects') is not null then
    drop policy if exists "Public can view business assets" on storage.objects;
    drop policy if exists "Users can upload logos for their businesses" on storage.objects;
    drop policy if exists "Users can update logos for their businesses" on storage.objects;
    drop policy if exists "Users can delete logos for their businesses" on storage.objects;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
