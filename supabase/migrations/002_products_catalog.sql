-- Margenia products catalog.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'set_updated_at'
      and pg_get_function_arguments(p.oid) = ''
  ) then
    execute $function$
      create function public.set_updated_at()
      returns trigger
      language plpgsql
      as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$;
    $function$;
  end if;
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
  constraint product_variants_sku_not_blank check (
    sku is null or length(trim(sku)) > 0
  ),
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

create index if not exists products_business_created_at_idx
  on public.products(business_id, created_at desc);

create index if not exists product_variants_business_id_idx
  on public.product_variants(business_id);

create index if not exists product_variants_product_id_idx
  on public.product_variants(product_id);

create index if not exists product_variants_business_status_idx
  on public.product_variants(business_id, status);

create index if not exists product_variants_business_current_stock_idx
  on public.product_variants(business_id, current_stock);

create unique index if not exists product_variants_business_lower_sku_unique_idx
  on public.product_variants(business_id, lower(trim(sku)))
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

revoke all on public.products from anon;
revoke all on public.product_variants from anon;

grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.product_variants to authenticated;

drop policy if exists "Users can view products for their businesses" on public.products;
create policy "Users can view products for their businesses"
  on public.products
  for select
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
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
  to authenticated
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

create or replace function public.create_product_with_variants(
  p_business_id uuid,
  p_name text,
  p_description text,
  p_brand text,
  p_category text,
  p_unit text,
  p_product_type text,
  p_track_inventory boolean,
  p_status text,
  p_variants jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product_id uuid;
  v_variant jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes acceso a este negocio.';
  end if;

  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) < 1 then
    raise exception 'Agrega al menos una variante.';
  end if;

  insert into public.products (
    business_id,
    name,
    description,
    brand,
    category,
    unit,
    product_type,
    track_inventory,
    status
  )
  values (
    p_business_id,
    trim(p_name),
    nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_brand, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    trim(p_unit),
    p_product_type,
    p_track_inventory,
    p_status
  )
  returning id into v_product_id;

  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    insert into public.product_variants (
      business_id,
      product_id,
      name,
      sku,
      purchase_cost,
      packaging_cost,
      commission_percent,
      desired_margin_percent,
      sale_price,
      current_stock,
      minimum_stock,
      status
    )
    values (
      p_business_id,
      v_product_id,
      trim(v_variant ->> 'name'),
      nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
      coalesce((v_variant ->> 'purchase_cost')::numeric, 0),
      coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
      coalesce((v_variant ->> 'commission_percent')::numeric, 0),
      coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
      coalesce((v_variant ->> 'sale_price')::numeric, 0),
      coalesce((v_variant ->> 'current_stock')::numeric, 0),
      coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
      coalesce(v_variant ->> 'status', 'active')
    );
  end loop;

  return v_product_id;
end;
$$;

create or replace function public.update_product_with_variants(
  p_product_id uuid,
  p_business_id uuid,
  p_name text,
  p_description text,
  p_brand text,
  p_category text,
  p_unit text,
  p_product_type text,
  p_track_inventory boolean,
  p_status text,
  p_variants jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_variant jsonb;
  v_variant_id uuid;
  v_submitted_variant_ids uuid[] := '{}';
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes acceso a este negocio.';
  end if;

  if not exists (
    select 1
    from public.products p
    where p.id = p_product_id
      and p.business_id = p_business_id
  ) then
    raise exception 'No encontramos este producto.';
  end if;

  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) < 1 then
    raise exception 'Agrega al menos una variante.';
  end if;

  update public.products
  set
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    brand = nullif(trim(coalesce(p_brand, '')), ''),
    category = nullif(trim(coalesce(p_category, '')), ''),
    unit = trim(p_unit),
    product_type = p_product_type,
    track_inventory = p_track_inventory,
    status = p_status
  where id = p_product_id
    and business_id = p_business_id;

  for v_variant in select * from jsonb_array_elements(p_variants)
  loop
    v_variant_id := nullif(v_variant ->> 'id', '')::uuid;

    if v_variant_id is null then
      insert into public.product_variants (
        business_id,
        product_id,
        name,
        sku,
        purchase_cost,
        packaging_cost,
        commission_percent,
        desired_margin_percent,
        sale_price,
        current_stock,
        minimum_stock,
        status
      )
      values (
        p_business_id,
        p_product_id,
        trim(v_variant ->> 'name'),
        nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
        coalesce((v_variant ->> 'purchase_cost')::numeric, 0),
        coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
        coalesce((v_variant ->> 'commission_percent')::numeric, 0),
        coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
        coalesce((v_variant ->> 'sale_price')::numeric, 0),
        coalesce((v_variant ->> 'current_stock')::numeric, 0),
        coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
        coalesce(v_variant ->> 'status', 'active')
      )
      returning id into v_variant_id;
    else
      update public.product_variants
      set
        name = trim(v_variant ->> 'name'),
        sku = nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
        purchase_cost = coalesce((v_variant ->> 'purchase_cost')::numeric, 0),
        packaging_cost = coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
        commission_percent = coalesce((v_variant ->> 'commission_percent')::numeric, 0),
        desired_margin_percent = coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
        sale_price = coalesce((v_variant ->> 'sale_price')::numeric, 0),
        current_stock = coalesce((v_variant ->> 'current_stock')::numeric, 0),
        minimum_stock = coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
        status = coalesce(v_variant ->> 'status', 'active')
      where id = v_variant_id
        and product_id = p_product_id
        and business_id = p_business_id;

      if not found then
        raise exception 'No encontramos una variante para actualizar.';
      end if;
    end if;

    v_submitted_variant_ids := array_append(v_submitted_variant_ids, v_variant_id);
  end loop;

  update public.product_variants
  set status = 'archived'
  where product_id = p_product_id
    and business_id = p_business_id
    and not (id = any(v_submitted_variant_ids));

  return p_product_id;
end;
$$;

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

grant execute on function public.create_product_with_variants(
  uuid, text, text, text, text, text, text, boolean, text, jsonb
) to authenticated;

grant execute on function public.update_product_with_variants(
  uuid, uuid, text, text, text, text, text, text, boolean, text, jsonb
) to authenticated;

commit;
