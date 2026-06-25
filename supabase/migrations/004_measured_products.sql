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
  alter column current_stock type numeric(18,6),
  alter column minimum_stock type numeric(18,6);

alter table public.product_variants
  add column inventory_mode text not null default 'unit',
  add column measurement_family text not null default 'count',
  add column inventory_unit text not null default 'unit',
  add column purchase_package_label text,
  add column purchase_package_quantity numeric(18,6) not null default 1,
  add column purchase_package_unit text not null default 'unit',
  add column purchase_package_cost numeric(14,2) not null default 0,
  add column default_sale_unit text not null default 'unit',
  add column allow_fractional_sales boolean not null default false,
  add column minimum_sale_quantity numeric(18,6) not null default 1,
  add column sale_quantity_step numeric(18,6) not null default 1;

update public.product_variants
set
  inventory_mode = 'unit',
  measurement_family = 'count',
  inventory_unit = 'unit',
  purchase_package_label = 'Unidad',
  purchase_package_quantity = 1,
  purchase_package_unit = 'unit',
  purchase_package_cost = purchase_cost,
  default_sale_unit = 'unit',
  allow_fractional_sales = false,
  minimum_sale_quantity = 1,
  sale_quantity_step = 1;

alter table public.product_variants
  add constraint product_variants_inventory_mode_check
    check (inventory_mode in ('unit', 'measured')),
  add constraint product_variants_measurement_family_check
    check (measurement_family in ('count', 'mass', 'volume', 'length')),
  add constraint product_variants_purchase_package_quantity_check
    check (purchase_package_quantity > 0),
  add constraint product_variants_purchase_package_cost_check
    check (purchase_package_cost >= 0),
  add constraint product_variants_minimum_sale_quantity_check
    check (minimum_sale_quantity > 0),
  add constraint product_variants_sale_quantity_step_check
    check (sale_quantity_step > 0),
  add constraint product_variants_measurement_mode_units_check
    check (
      (
        inventory_mode = 'unit'
        and measurement_family = 'count'
        and inventory_unit = 'unit'
        and purchase_package_unit = 'unit'
        and default_sale_unit = 'unit'
        and allow_fractional_sales = false
      )
      or
      (
        inventory_mode = 'measured'
        and measurement_family in ('mass', 'volume', 'length')
        and public.measurement_unit_family(inventory_unit) = measurement_family
        and public.measurement_unit_family(purchase_package_unit) = measurement_family
        and public.measurement_unit_family(default_sale_unit) = measurement_family
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
  v_variant_status text;
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
    v_variant_status := coalesce(v_variant ->> 'status', 'active');

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
      status,
      inventory_mode,
      measurement_family,
      inventory_unit,
      purchase_package_label,
      purchase_package_quantity,
      purchase_package_unit,
      purchase_package_cost,
      default_sale_unit,
      allow_fractional_sales,
      minimum_sale_quantity,
      sale_quantity_step
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
      coalesce((v_variant ->> 'current_stock')::numeric, 0),
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
      v_sale_quantity_step
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
  v_variant_status text;
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
    v_variant_status := coalesce(v_variant ->> 'status', 'active');

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
        status,
        inventory_mode,
        measurement_family,
        inventory_unit,
        purchase_package_label,
        purchase_package_quantity,
        purchase_package_unit,
        purchase_package_cost,
        default_sale_unit,
        allow_fractional_sales,
        minimum_sale_quantity,
        sale_quantity_step
      )
      values (
        p_business_id,
        p_product_id,
        trim(v_variant ->> 'name'),
        nullif(trim(coalesce(v_variant ->> 'sku', '')), ''),
        v_purchase_cost,
        coalesce((v_variant ->> 'packaging_cost')::numeric, 0),
        coalesce((v_variant ->> 'commission_percent')::numeric, 0),
        coalesce((v_variant ->> 'desired_margin_percent')::numeric, 35),
        v_sale_price,
        coalesce((v_variant ->> 'current_stock')::numeric, 0),
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
        v_sale_quantity_step
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
        current_stock = coalesce((v_variant ->> 'current_stock')::numeric, 0),
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
        sale_quantity_step = v_sale_quantity_step
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

notify pgrst, 'reload schema';

commit;
