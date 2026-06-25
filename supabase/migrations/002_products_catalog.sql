-- Margenia products catalog.
-- Run manually in Supabase SQL Editor after reviewing.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  brand text,
  category text,
  unit text not null default 'unidad',
  product_type text not null default 'simple',
  track_inventory boolean not null default true,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(trim(name)) > 0),
  constraint products_unit_not_blank check (length(trim(unit)) > 0),
  constraint products_product_type_check check (product_type in ('simple', 'variants')),
  constraint products_status_check check (status in ('active', 'archived')),
  constraint products_id_business_id_unique unique (id, business_id)
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  product_id uuid not null,
  name text not null default 'Presentación estándar',
  sku text,
  purchase_cost numeric(14,2) not null default 0,
  packaging_cost numeric(14,2) not null default 0,
  commission_percent numeric(5,2) not null default 0,
  desired_margin_percent numeric(5,2) not null default 35,
  sale_price numeric(14,2) not null default 0,
  current_stock numeric(14,3) not null default 0,
  minimum_stock numeric(14,3) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_variants_product_business_fk
    foreign key (product_id, business_id)
    references public.products(id, business_id)
    on delete cascade,
  constraint product_variants_name_not_blank check (length(trim(name)) > 0),
  constraint product_variants_purchase_cost_check check (purchase_cost >= 0),
  constraint product_variants_packaging_cost_check check (packaging_cost >= 0),
  constraint product_variants_commission_percent_check check (
    commission_percent >= 0 and commission_percent < 100
  ),
  constraint product_variants_desired_margin_percent_check check (
    desired_margin_percent >= 0 and desired_margin_percent < 100
  ),
  constraint product_variants_rate_sum_check check (
    commission_percent + desired_margin_percent < 100
  ),
  constraint product_variants_sale_price_check check (sale_price >= 0),
  constraint product_variants_current_stock_check check (current_stock >= 0),
  constraint product_variants_minimum_stock_check check (minimum_stock >= 0),
  constraint product_variants_status_check check (status in ('active', 'archived'))
);

create index if not exists products_business_id_idx
  on public.products(business_id);

create index if not exists products_business_status_idx
  on public.products(business_id, status);

create index if not exists products_business_lower_name_idx
  on public.products(business_id, lower(name));

create index if not exists products_business_category_idx
  on public.products(business_id, category);

create index if not exists products_created_at_idx
  on public.products(created_at);

create index if not exists product_variants_business_id_idx
  on public.product_variants(business_id);

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id);

create index if not exists product_variants_business_status_idx
  on public.product_variants(business_id, status);

create index if not exists product_variants_business_current_stock_idx
  on public.product_variants(business_id, current_stock);

create unique index if not exists product_variants_business_lower_sku_unique_idx
  on public.product_variants(business_id, lower(sku))
  where sku is not null and length(trim(sku)) > 0;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;
alter table public.product_variants enable row level security;

drop policy if exists "Users can view products for their businesses" on public.products;
create policy "Users can view products for their businesses"
  on public.products
  for select
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = products.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert products for their businesses" on public.products;
create policy "Users can insert products for their businesses"
  on public.products
  for insert
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = products.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update products for their businesses" on public.products;
create policy "Users can update products for their businesses"
  on public.products
  for update
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = products.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = products.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view variants for their businesses" on public.product_variants;
create policy "Users can view variants for their businesses"
  on public.product_variants
  for select
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = product_variants.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert variants for their businesses" on public.product_variants;
create policy "Users can insert variants for their businesses"
  on public.product_variants
  for insert
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = product_variants.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update variants for their businesses" on public.product_variants;
create policy "Users can update variants for their businesses"
  on public.product_variants
  for update
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = product_variants.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = product_variants.business_id
        and b.owner_id = (select auth.uid())
    )
  );
