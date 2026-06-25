begin;

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

notify pgrst, 'reload schema';

commit;
