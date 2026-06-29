-- Rollback for Margenia inventory module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

drop function if exists public.create_inventory_manual_movement(
  uuid, uuid, text, numeric, text, numeric, text, text
);

drop function if exists public.create_inventory_count(uuid, text, jsonb);

drop function if exists public.update_inventory_settings(uuid, uuid, numeric, text);

do $$
begin
  if to_regclass('public.inventory_count_items') is not null then
    drop policy if exists "Users can view inventory count items for their businesses" on public.inventory_count_items;
    drop policy if exists "Users can insert inventory count items for their businesses" on public.inventory_count_items;
  end if;

  if to_regclass('public.inventory_counts') is not null then
    drop policy if exists "Users can view inventory counts for their businesses" on public.inventory_counts;
    drop policy if exists "Users can insert inventory counts for their businesses" on public.inventory_counts;
    drop policy if exists "Users can update inventory counts for their businesses" on public.inventory_counts;
  end if;
end;
$$;

drop table if exists public.inventory_count_items;
drop table if exists public.inventory_counts;

do $$
begin
  if to_regclass('public.inventory_document_number_seq') is not null
    and obj_description('public.inventory_document_number_seq'::regclass, 'pg_class') = 'created_by_007_inventory' then
    drop sequence public.inventory_document_number_seq;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
