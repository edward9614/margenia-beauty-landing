-- Margenia product measurements, batches and inventory movements.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

create or replace function public.measurement_unit_family(p_unit text)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_unit
    when 'unit' then 'count'
    when 'mg' then 'mass'
    when 'g' then 'mass'
    when 'kg' then 'mass'
    when 'oz' then 'mass'
    when 'lb_500g' then 'mass'
    when 'lb_international' then 'mass'
    when 'ml' then 'volume'
    when 'l' then 'volume'
    when 'mm' then 'length'
    when 'cm' then 'length'
    when 'm' then 'length'
    else null
  end;
$$;

create or replace function public.measurement_unit_factor(p_unit text)
returns numeric
language sql
immutable
set search_path = public
as $$
  select case p_unit
    when 'unit' then 1
    when 'mg' then 0.001
    when 'g' then 1
    when 'kg' then 1000
    when 'oz' then 28.349523125
    when 'lb_500g' then 500
    when 'lb_international' then 453.59237
    when 'ml' then 1
    when 'l' then 1000
    when 'mm' then 1
    when 'cm' then 10
    when 'm' then 1000
    else null
  end;
$$;

create or replace function public.convert_measurement(
  p_quantity numeric,
  p_from_unit text,
  p_to_unit text
)
returns numeric
language plpgsql
immutable
set search_path = public
as $$
declare
  v_from_family text;
  v_to_family text;
  v_from_factor numeric;
  v_to_factor numeric;
begin
  if p_quantity is null or p_quantity < 0 then
    raise exception 'La cantidad debe ser mayor o igual a cero.';
  end if;

  v_from_family := public.measurement_unit_family(p_from_unit);
  v_to_family := public.measurement_unit_family(p_to_unit);
  v_from_factor := public.measurement_unit_factor(p_from_unit);
  v_to_factor := public.measurement_unit_factor(p_to_unit);

  if v_from_family is null or v_to_family is null then
    raise exception 'Unidad de medida no soportada.';
  end if;

  if v_from_family <> v_to_family then
    raise exception 'Las unidades de medida no son compatibles.';
  end if;

  if v_from_factor is null or v_to_factor is null or v_to_factor <= 0 then
    raise exception 'Factor de conversión inválido.';
  end if;

  return p_quantity * v_from_factor / v_to_factor;
end;
$$;

alter table public.product_variants
  add column if not exists tax_percent numeric(5,2) not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_tax_percent_check'
  ) then
    alter table public.product_variants
      add constraint product_variants_tax_percent_check
      check (tax_percent >= 0 and tax_percent < 100);
  end if;
end;
$$;

create table if not exists public.inventory_batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  lot_number text,
  expiration_date date,
  initial_quantity numeric(18,6) not null,
  remaining_quantity numeric(18,6) not null,
  stock_unit text not null,
  unit_cost numeric(14,6) not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_batches_initial_quantity_check check (initial_quantity >= 0),
  constraint inventory_batches_remaining_quantity_check check (remaining_quantity >= 0),
  constraint inventory_batches_remaining_lte_initial_check check (remaining_quantity <= initial_quantity),
  constraint inventory_batches_unit_cost_check check (unit_cost >= 0),
  constraint inventory_batches_stock_unit_not_blank check (length(trim(stock_unit)) > 0)
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id),
  batch_id uuid references public.inventory_batches(id),
  movement_type text not null,
  quantity numeric(18,6) not null,
  stock_unit text not null,
  unit_cost numeric(14,6),
  total_cost numeric(14,2),
  reference_type text,
  reference_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  constraint inventory_movements_type_check check (
    movement_type in ('purchase', 'sale', 'adjustment', 'return', 'waste')
  ),
  constraint inventory_movements_quantity_check check (quantity <> 0),
  constraint inventory_movements_stock_unit_not_blank check (length(trim(stock_unit)) > 0),
  constraint inventory_movements_unit_cost_check check (unit_cost is null or unit_cost >= 0),
  constraint inventory_movements_total_cost_check check (total_cost is null or total_cost >= 0)
);

drop trigger if exists inventory_batches_set_updated_at on public.inventory_batches;
create trigger inventory_batches_set_updated_at
  before update on public.inventory_batches
  for each row execute function public.set_updated_at();

create index if not exists inventory_batches_business_id_idx
  on public.inventory_batches(business_id);

create index if not exists inventory_batches_variant_id_idx
  on public.inventory_batches(variant_id);

create index if not exists inventory_batches_expiration_date_idx
  on public.inventory_batches(expiration_date);

create index if not exists inventory_batches_business_variant_idx
  on public.inventory_batches(business_id, variant_id);

create index if not exists inventory_batches_remaining_quantity_idx
  on public.inventory_batches(remaining_quantity);

create index if not exists inventory_movements_business_id_idx
  on public.inventory_movements(business_id);

create index if not exists inventory_movements_variant_id_idx
  on public.inventory_movements(variant_id);

create index if not exists inventory_movements_batch_id_idx
  on public.inventory_movements(batch_id);

create index if not exists inventory_movements_type_idx
  on public.inventory_movements(movement_type);

create index if not exists inventory_movements_created_at_idx
  on public.inventory_movements(created_at desc);

create index if not exists inventory_movements_reference_idx
  on public.inventory_movements(reference_type, reference_id);

alter table public.inventory_batches enable row level security;
alter table public.inventory_movements enable row level security;

revoke all on public.inventory_batches from anon;
revoke all on public.inventory_movements from anon;

grant select, insert, update on public.inventory_batches to authenticated;
grant select, insert on public.inventory_movements to authenticated;

drop policy if exists "Users can view inventory batches for their businesses" on public.inventory_batches;
create policy "Users can view inventory batches for their businesses"
  on public.inventory_batches
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_batches.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert inventory batches for their businesses" on public.inventory_batches;
create policy "Users can insert inventory batches for their businesses"
  on public.inventory_batches
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_batches.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update inventory batches for their businesses" on public.inventory_batches;
create policy "Users can update inventory batches for their businesses"
  on public.inventory_batches
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_batches.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_batches.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view inventory movements for their businesses" on public.inventory_movements;
create policy "Users can view inventory movements for their businesses"
  on public.inventory_movements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert inventory movements for their businesses" on public.inventory_movements;
create policy "Users can insert inventory movements for their businesses"
  on public.inventory_movements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = inventory_movements.business_id
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
  v_variant_id uuid;
  v_inventory_mode text;
  v_measurement_family text;
  v_inventory_unit text;
  v_purchase_package_label text;
  v_purchase_package_quantity numeric;
  v_purchase_package_unit text;
  v_purchase_package_cost numeric;
  v_default_sale_unit text;
  v_allow_fractional_sales boolean;
  v_minimum_sale_quantity numeric;
  v_sale_quantity_step numeric;
  v_quantity_in_inventory_unit numeric;
  v_purchase_cost numeric;
  v_sale_price numeric;
  v_current_stock numeric;
  v_variant_status text;
  v_tax_percent numeric;
  v_lot_number text;
  v_expiration_date date;
  v_batch_id uuid;
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

  if p_variants is null
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_array_length(p_variants) < 1 then
    raise exception 'Agrega al menos una variante.';
  end if;

  insert into public.products (
    business_id, name, description, brand, category, unit, product_type,
    track_inventory, status
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
    v_inventory_mode := coalesce(v_variant ->> 'inventory_mode', 'unit');
    v_measurement_family := coalesce(v_variant ->> 'measurement_family', 'count');
    v_inventory_unit := coalesce(v_variant ->> 'inventory_unit', 'unit');
    v_purchase_package_label := nullif(trim(coalesce(v_variant ->> 'purchase_package_label', '')), '');
    v_purchase_package_quantity := coalesce((v_variant ->> 'purchase_package_quantity')::numeric, 1);
    v_purchase_package_unit := coalesce(v_variant ->> 'purchase_package_unit', 'unit');
    v_purchase_package_cost := coalesce((v_variant ->> 'purchase_package_cost')::numeric, 0);
    v_default_sale_unit := coalesce(v_variant ->> 'default_sale_unit', 'unit');
    v_allow_fractional_sales := coalesce((v_variant ->> 'allow_fractional_sales')::boolean, false);
    v_minimum_sale_quantity := coalesce((v_variant ->> 'minimum_sale_quantity')::numeric, 1);
    v_sale_quantity_step := coalesce((v_variant ->> 'sale_quantity_step')::numeric, 1);
    v_sale_price := coalesce((v_variant ->> 'sale_price')::numeric, 0);
    v_current_stock := coalesce((v_variant ->> 'current_stock')::numeric, 0);
    v_variant_status := coalesce(v_variant ->> 'status', 'active');
    v_tax_percent := coalesce((v_variant ->> 'tax_percent')::numeric, 0);
    v_lot_number := nullif(trim(coalesce(v_variant ->> 'lot_number', '')), '');
    v_expiration_date := nullif(v_variant ->> 'expiration_date', '')::date;

    if v_sale_price <= 0 and p_status = 'active' and v_variant_status = 'active' then
      raise exception 'Ingresa un precio de venta o usa el precio sugerido.';
    end if;

    if v_inventory_mode = 'measured' then
      v_quantity_in_inventory_unit := public.convert_measurement(
        v_purchase_package_quantity,
        v_purchase_package_unit,
        v_inventory_unit
      );

      if v_quantity_in_inventory_unit <= 0 then
        raise exception 'La presentación debe contener una cantidad mayor que cero.';
      end if;

      v_purchase_cost := v_purchase_package_cost / v_quantity_in_inventory_unit;
    else
      v_inventory_mode := 'unit';
      v_measurement_family := 'count';
      v_inventory_unit := 'unit';
      v_purchase_package_label := coalesce(v_purchase_package_label, 'Unidad');
      v_purchase_package_quantity := 1;
      v_purchase_package_unit := 'unit';
      v_purchase_package_cost := coalesce((v_variant ->> 'purchase_cost')::numeric, 0);
      v_default_sale_unit := 'unit';
      v_allow_fractional_sales := false;
      v_minimum_sale_quantity := 1;
      v_sale_quantity_step := 1;
      v_purchase_cost := coalesce((v_variant ->> 'purchase_cost')::numeric, 0);
    end if;

    insert into public.product_variants (
      business_id, product_id, name, sku, purchase_cost, packaging_cost,
      commission_percent, desired_margin_percent, sale_price, current_stock,
      minimum_stock, status, inventory_mode, measurement_family, inventory_unit,
      purchase_package_label, purchase_package_quantity, purchase_package_unit,
      purchase_package_cost, default_sale_unit, allow_fractional_sales,
      minimum_sale_quantity, sale_quantity_step, tax_percent
    )
    values (
      p_business_id,
      v_product_id,
      trim(v_variant ->> 'name'),
      nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
      v_purchase_cost,
      coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
      coalesce((v_variant ->> 'commission_percent')::numeric, 0),
      coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
      v_sale_price,
      v_current_stock,
      coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
      v_variant_status,
      v_inventory_mode,
      v_measurement_family,
      v_inventory_unit,
      v_purchase_package_label,
      v_purchase_package_quantity,
      v_purchase_package_unit,
      v_purchase_package_cost,
      v_default_sale_unit,
      v_allow_fractional_sales,
      v_minimum_sale_quantity,
      v_sale_quantity_step,
      v_tax_percent
    )
    returning id into v_variant_id;

    if v_current_stock > 0 and (v_lot_number is not null or v_expiration_date is not null) then
      insert into public.inventory_batches (
        business_id, variant_id, lot_number, expiration_date, initial_quantity,
        remaining_quantity, stock_unit, unit_cost
      )
      values (
        p_business_id, v_variant_id, v_lot_number, v_expiration_date, v_current_stock,
        v_current_stock, v_inventory_unit, v_purchase_cost
      )
      returning id into v_batch_id;

      insert into public.inventory_movements (
        business_id, variant_id, batch_id, movement_type, quantity, stock_unit,
        unit_cost, total_cost, reference_type, notes
      )
      values (
        p_business_id, v_variant_id, v_batch_id, 'purchase', v_current_stock,
        v_inventory_unit, v_purchase_cost, round(v_purchase_cost * v_current_stock, 2),
        'manual', 'Inventario inicial del producto'
      );
    end if;
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
  v_inventory_mode text;
  v_measurement_family text;
  v_inventory_unit text;
  v_purchase_package_label text;
  v_purchase_package_quantity numeric;
  v_purchase_package_unit text;
  v_purchase_package_cost numeric;
  v_default_sale_unit text;
  v_allow_fractional_sales boolean;
  v_minimum_sale_quantity numeric;
  v_sale_quantity_step numeric;
  v_quantity_in_inventory_unit numeric;
  v_purchase_cost numeric;
  v_sale_price numeric;
  v_current_stock numeric;
  v_variant_status text;
  v_tax_percent numeric;
  v_lot_number text;
  v_expiration_date date;
  v_batch_id uuid;
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

  if p_variants is null
     or jsonb_typeof(p_variants) <> 'array'
     or jsonb_array_length(p_variants) < 1 then
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
    v_inventory_mode := coalesce(v_variant ->> 'inventory_mode', 'unit');
    v_measurement_family := coalesce(v_variant ->> 'measurement_family', 'count');
    v_inventory_unit := coalesce(v_variant ->> 'inventory_unit', 'unit');
    v_purchase_package_label := nullif(trim(coalesce(v_variant ->> 'purchase_package_label', '')), '');
    v_purchase_package_quantity := coalesce((v_variant ->> 'purchase_package_quantity')::numeric, 1);
    v_purchase_package_unit := coalesce(v_variant ->> 'purchase_package_unit', 'unit');
    v_purchase_package_cost := coalesce((v_variant ->> 'purchase_package_cost')::numeric, 0);
    v_default_sale_unit := coalesce(v_variant ->> 'default_sale_unit', 'unit');
    v_allow_fractional_sales := coalesce((v_variant ->> 'allow_fractional_sales')::boolean, false);
    v_minimum_sale_quantity := coalesce((v_variant ->> 'minimum_sale_quantity')::numeric, 1);
    v_sale_quantity_step := coalesce((v_variant ->> 'sale_quantity_step')::numeric, 1);
    v_sale_price := coalesce((v_variant ->> 'sale_price')::numeric, 0);
    v_current_stock := coalesce((v_variant ->> 'current_stock')::numeric, 0);
    v_variant_status := coalesce(v_variant ->> 'status', 'active');
    v_tax_percent := coalesce((v_variant ->> 'tax_percent')::numeric, 0);
    v_lot_number := nullif(trim(coalesce(v_variant ->> 'lot_number', '')), '');
    v_expiration_date := nullif(v_variant ->> 'expiration_date', '')::date;

    if v_inventory_mode = 'measured' then
      v_quantity_in_inventory_unit := public.convert_measurement(
        v_purchase_package_quantity,
        v_purchase_package_unit,
        v_inventory_unit
      );
      if v_quantity_in_inventory_unit <= 0 then
        raise exception 'La presentación debe contener una cantidad mayor que cero.';
      end if;
      v_purchase_cost := v_purchase_package_cost / v_quantity_in_inventory_unit;
    else
      v_inventory_mode := 'unit';
      v_measurement_family := 'count';
      v_inventory_unit := 'unit';
      v_purchase_package_label := coalesce(v_purchase_package_label, 'Unidad');
      v_purchase_package_quantity := 1;
      v_purchase_package_unit := 'unit';
      v_purchase_package_cost := coalesce((v_variant ->> 'purchase_cost')::numeric, 0);
      v_default_sale_unit := 'unit';
      v_allow_fractional_sales := false;
      v_minimum_sale_quantity := 1;
      v_sale_quantity_step := 1;
      v_purchase_cost := coalesce((v_variant ->> 'purchase_cost')::numeric, 0);
    end if;

    if v_variant_id is null then
      insert into public.product_variants (
        business_id, product_id, name, sku, purchase_cost, packaging_cost,
        commission_percent, desired_margin_percent, sale_price, current_stock,
        minimum_stock, status, inventory_mode, measurement_family, inventory_unit,
        purchase_package_label, purchase_package_quantity, purchase_package_unit,
        purchase_package_cost, default_sale_unit, allow_fractional_sales,
        minimum_sale_quantity, sale_quantity_step, tax_percent
      )
      values (
        p_business_id, p_product_id, trim(v_variant ->> 'name'),
        nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
        v_purchase_cost,
        coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
        coalesce((v_variant ->> 'commission_percent')::numeric, 0),
        coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
        v_sale_price, v_current_stock,
        coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
        v_variant_status, v_inventory_mode, v_measurement_family, v_inventory_unit,
        v_purchase_package_label, v_purchase_package_quantity, v_purchase_package_unit,
        v_purchase_package_cost, v_default_sale_unit, v_allow_fractional_sales,
        v_minimum_sale_quantity, v_sale_quantity_step, v_tax_percent
      )
      returning id into v_variant_id;
    else
      update public.product_variants
      set
        name = trim(v_variant ->> 'name'),
        sku = nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
        purchase_cost = v_purchase_cost,
        packaging_cost = coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
        commission_percent = coalesce((v_variant ->> 'commission_percent')::numeric, 0),
        desired_margin_percent = coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
        sale_price = v_sale_price,
        current_stock = v_current_stock,
        minimum_stock = coalesce((v_variant ->> 'minimum_stock')::numeric, 0),
        status = v_variant_status,
        inventory_mode = v_inventory_mode,
        measurement_family = v_measurement_family,
        inventory_unit = v_inventory_unit,
        purchase_package_label = v_purchase_package_label,
        purchase_package_quantity = v_purchase_package_quantity,
        purchase_package_unit = v_purchase_package_unit,
        purchase_package_cost = v_purchase_package_cost,
        default_sale_unit = v_default_sale_unit,
        allow_fractional_sales = v_allow_fractional_sales,
        minimum_sale_quantity = v_minimum_sale_quantity,
        sale_quantity_step = v_sale_quantity_step,
        tax_percent = v_tax_percent
      where id = v_variant_id
        and product_id = p_product_id
        and business_id = p_business_id;

      if not found then
        raise exception 'No encontramos una variante para actualizar.';
      end if;
    end if;

    v_submitted_variant_ids := array_append(v_submitted_variant_ids, v_variant_id);

    if v_current_stock > 0
       and (v_lot_number is not null or v_expiration_date is not null)
       and not exists (
         select 1
         from public.inventory_batches b
         where b.business_id = p_business_id
           and b.variant_id = v_variant_id
           and coalesce(b.lot_number, '') = coalesce(v_lot_number, '')
           and b.expiration_date is not distinct from v_expiration_date
       ) then
      insert into public.inventory_batches (
        business_id, variant_id, lot_number, expiration_date, initial_quantity,
        remaining_quantity, stock_unit, unit_cost
      )
      values (
        p_business_id, v_variant_id, v_lot_number, v_expiration_date, v_current_stock,
        v_current_stock, v_inventory_unit, v_purchase_cost
      )
      returning id into v_batch_id;

      insert into public.inventory_movements (
        business_id, variant_id, batch_id, movement_type, quantity, stock_unit,
        unit_cost, total_cost, reference_type, notes
      )
      values (
        p_business_id, v_variant_id, v_batch_id, 'purchase', v_current_stock,
        v_inventory_unit, v_purchase_cost, round(v_purchase_cost * v_current_stock, 2),
        'manual', 'Inventario inicial del producto'
      );
    end if;
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

notify pgrst, 'reload schema';

commit;
