-- Rollback for Margenia sales module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

drop function if exists public.create_sale_with_items(
  uuid, timestamptz, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
);

drop function if exists public.void_sale(uuid, uuid, text);

do $$
begin
  if to_regclass('public.inventory_movements') is not null
    and obj_description('public.inventory_movements'::regclass, 'pg_class') = 'created_by_006_sales' then
    drop policy if exists "Users can view inventory movements for their businesses" on public.inventory_movements;
    drop policy if exists "Users can insert inventory movements for their businesses" on public.inventory_movements;
  end if;
end;
$$;

drop policy if exists "Users can view sale payments for their businesses" on public.sale_payments;
drop policy if exists "Users can insert sale payments for their businesses" on public.sale_payments;

drop policy if exists "Users can view sale items for their businesses" on public.sale_items;
drop policy if exists "Users can insert sale items for their businesses" on public.sale_items;

drop policy if exists "Users can view sales for their businesses" on public.sales;
drop policy if exists "Users can insert sales for their businesses" on public.sales;
drop policy if exists "Users can update sales for their businesses" on public.sales;

drop trigger if exists sales_set_updated_at on public.sales;

drop table if exists public.sale_payments;
drop table if exists public.sale_items;
drop table if exists public.sales;

do $$
begin
  if to_regclass('public.inventory_movements') is not null
    and obj_description('public.inventory_movements'::regclass, 'pg_class') = 'created_by_006_sales' then
    drop table public.inventory_movements;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.sales_sale_number_seq') is not null
    and obj_description('public.sales_sale_number_seq'::regclass, 'pg_class') = 'created_by_006_sales' then
    drop sequence public.sales_sale_number_seq;
  end if;
end;
$$;

notify pgrst, 'reload schema';

commit;
