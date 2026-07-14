-- Rollback for Margenia Customers module.
-- Review and run manually in Supabase SQL Editor.

begin;

drop function if exists public.create_sale_with_customer(
  uuid, timestamptz, uuid, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
);

drop function if exists public.register_customer_payment(
  uuid, uuid, uuid, numeric, text, timestamptz, text, text
);

drop trigger if exists sales_sync_customer_snapshot on public.sales;
drop function if exists public.sync_sale_customer_snapshot();

alter table public.sales drop constraint if exists sales_customer_business_fk;
alter table public.sales drop column if exists customer_id;

drop policy if exists "Users can view customer notes for their businesses" on public.customer_notes;
drop policy if exists "Users can insert customer notes for their businesses" on public.customer_notes;
drop policy if exists "Users can view customers for their businesses" on public.customers;
drop policy if exists "Users can insert customers for their businesses" on public.customers;
drop policy if exists "Users can update customers for their businesses" on public.customers;

drop trigger if exists customers_set_updated_at on public.customers;

drop table if exists public.customer_notes;
drop table if exists public.customers;

notify pgrst, 'reload schema';

commit;
