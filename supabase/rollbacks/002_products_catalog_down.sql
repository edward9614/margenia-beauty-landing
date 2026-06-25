-- Rollback for 002_products_catalog.sql.
-- Run manually only if you need to remove the products module.

begin;

revoke all on function public.create_product_with_variants(
  uuid, text, text, text, text, text, text, boolean, text, jsonb
) from public;

revoke all on function public.create_product_with_variants(
  uuid, text, text, text, text, text, text, boolean, text, jsonb
) from anon;

revoke all on function public.update_product_with_variants(
  uuid, uuid, text, text, text, text, text, text, boolean, text, jsonb
) from public;

revoke all on function public.update_product_with_variants(
  uuid, uuid, text, text, text, text, text, text, boolean, text, jsonb
) from anon;

drop function if exists public.update_product_with_variants(
  uuid, uuid, text, text, text, text, text, text, boolean, text, jsonb
);

drop function if exists public.create_product_with_variants(
  uuid, text, text, text, text, text, text, boolean, text, jsonb
);

drop policy if exists "Users can update variants for their businesses" on public.product_variants;
drop policy if exists "Users can insert variants for their businesses" on public.product_variants;
drop policy if exists "Users can view variants for their businesses" on public.product_variants;

drop policy if exists "Users can update products for their businesses" on public.products;
drop policy if exists "Users can insert products for their businesses" on public.products;
drop policy if exists "Users can view products for their businesses" on public.products;

drop trigger if exists product_variants_set_updated_at on public.product_variants;
drop trigger if exists products_set_updated_at on public.products;

drop table if exists public.product_variants;
drop table if exists public.products;

-- Do not drop public.set_updated_at() here. It may be shared by other tables.
-- Do not drop public.businesses, public.profiles, or any auth objects.

commit;
