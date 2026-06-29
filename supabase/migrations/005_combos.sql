-- Margenia combos module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'inventory_mode'
  )
  or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'inventory_unit'
  )
  or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'product_variants'
      and column_name = 'default_sale_unit'
  )
  or to_regprocedure('public.convert_measurement(numeric,text,text)') is null then
    raise exception 'Antes de instalar Combos debes ejecutar la migración de productos por medida.';
  end if;
end;
$$;

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

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_variants_id_business_id_unique'
  ) then
    alter table public.product_variants
      add constraint product_variants_id_business_id_unique unique (id, business_id);
  end if;
end;
$$;

create table if not exists public.combos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  category text,
  sale_price numeric(14,2) not null default 0,
  packaging_cost numeric(14,2) not null default 0,
  commission_percent numeric(5,2) not null default 0,
  desired_margin_percent numeric(5,2) not null default 35,
  tax_percent numeric(5,2) not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combos_name_not_blank check (length(trim(name)) > 0),
  constraint combos_sale_price_check check (sale_price >= 0),
  constraint combos_packaging_cost_check check (packaging_cost >= 0),
  constraint combos_commission_percent_check check (
    commission_percent >= 0 and commission_percent < 100
  ),
  constraint combos_desired_margin_percent_check check (
    desired_margin_percent >= 0 and desired_margin_percent < 100
  ),
  constraint combos_rate_sum_check check (
    commission_percent + desired_margin_percent + tax_percent < 100
  ),
  constraint combos_tax_percent_check check (tax_percent >= 0 and tax_percent < 100),
  constraint combos_status_check check (status in ('active', 'archived')),
  constraint combos_id_business_id_unique unique (id, business_id)
);

create table if not exists public.combo_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  combo_id uuid not null,
  product_id uuid not null,
  variant_id uuid not null,
  quantity numeric(18,6) not null default 1,
  quantity_unit text not null default 'unit',
  quantity_in_inventory_unit numeric(18,6) not null default 1,
  position integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint combo_items_combo_business_fk
    foreign key (combo_id, business_id)
    references public.combos(id, business_id)
    on delete cascade,
  constraint combo_items_variant_business_fk
    foreign key (variant_id, business_id)
    references public.product_variants(id, business_id),
  constraint combo_items_quantity_check check (quantity > 0),
  constraint combo_items_quantity_inventory_check check (quantity_in_inventory_unit > 0),
  constraint combo_items_quantity_unit_not_blank check (length(trim(quantity_unit)) > 0),
  constraint combo_items_position_check check (position >= 0),
  constraint combo_items_status_check check (status in ('active', 'archived'))
);

create index if not exists combos_business_id_idx
  on public.combos(business_id);

create index if not exists combos_business_status_idx
  on public.combos(business_id, status);

create index if not exists combos_business_lower_name_idx
  on public.combos(business_id, lower(name));

create index if not exists combos_business_created_at_idx
  on public.combos(business_id, created_at desc);

create index if not exists combo_items_business_id_idx
  on public.combo_items(business_id);

create index if not exists combo_items_combo_id_idx
  on public.combo_items(combo_id);

create index if not exists combo_items_variant_id_idx
  on public.combo_items(variant_id);

create index if not exists combo_items_business_status_idx
  on public.combo_items(business_id, status);

create index if not exists combo_items_combo_position_idx
  on public.combo_items(combo_id, position);

create unique index if not exists combo_items_active_variant_unique_idx
  on public.combo_items(combo_id, variant_id)
  where status = 'active';

drop trigger if exists combos_set_updated_at on public.combos;
create trigger combos_set_updated_at
  before update on public.combos
  for each row execute function public.set_updated_at();

drop trigger if exists combo_items_set_updated_at on public.combo_items;
create trigger combo_items_set_updated_at
  before update on public.combo_items
  for each row execute function public.set_updated_at();

alter table public.combos enable row level security;
alter table public.combo_items enable row level security;

revoke all on public.combos from anon;
revoke all on public.combo_items from anon;

grant select, insert, update on public.combos to authenticated;
grant select, insert, update on public.combo_items to authenticated;

drop policy if exists "Users can view combos for their businesses" on public.combos;
create policy "Users can view combos for their businesses"
  on public.combos
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = combos.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert combos for their businesses" on public.combos;
create policy "Users can insert combos for their businesses"
  on public.combos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = combos.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update combos for their businesses" on public.combos;
create policy "Users can update combos for their businesses"
  on public.combos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = combos.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      where b.id = combos.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view combo items for their businesses" on public.combo_items;
create policy "Users can view combo items for their businesses"
  on public.combo_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      where b.id = combo_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert combo items for their businesses" on public.combo_items;
create policy "Users can insert combo items for their businesses"
  on public.combo_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.businesses b
      join public.combos c on c.business_id = b.id
      where b.id = combo_items.business_id
        and c.id = combo_items.combo_id
        and c.business_id = combo_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update combo items for their businesses" on public.combo_items;
create policy "Users can update combo items for their businesses"
  on public.combo_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      join public.combos c on c.business_id = b.id
      where b.id = combo_items.business_id
        and c.id = combo_items.combo_id
        and c.business_id = combo_items.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.businesses b
      join public.combos c on c.business_id = b.id
      where b.id = combo_items.business_id
        and c.id = combo_items.combo_id
        and c.business_id = combo_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_combo_with_items(
  p_business_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_sale_price numeric,
  p_packaging_cost numeric,
  p_commission_percent numeric,
  p_desired_margin_percent numeric,
  p_tax_percent numeric,
  p_status text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_combo_id uuid;
  v_item jsonb;
  v_variant record;
  v_quantity numeric;
  v_quantity_unit text;
  v_quantity_in_inventory_unit numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para modificar este combo.';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Escribe el nombre del combo.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Agrega al menos un producto al combo.';
  end if;

  insert into public.combos (
    business_id, name, description, category, sale_price, packaging_cost,
    commission_percent, desired_margin_percent, tax_percent, status
  )
  values (
    p_business_id, trim(p_name), nullif(trim(coalesce(p_description, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''), coalesce(p_sale_price, 0),
    coalesce(p_packaging_cost, 0), coalesce(p_commission_percent, 0),
    coalesce(p_desired_margin_percent, 35), coalesce(p_tax_percent, 0),
    coalesce(p_status, 'active')
  )
  returning id into v_combo_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_quantity_unit := coalesce(nullif(trim(v_item->>'quantity_unit'), ''), 'unit');

    if v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor que cero.';
    end if;

    select pv.*, p.status as product_status
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
    where pv.id = (v_item->>'variant_id')::uuid
      and pv.business_id = p_business_id
      and pv.status = 'active'
      and p.status = 'active';

    if v_variant.id is null then
      raise exception 'Selecciona un producto activo.';
    end if;

    if v_variant.inventory_mode = 'measured' then
      if to_regprocedure('public.convert_measurement(numeric,text,text)') is null then
        raise exception 'El soporte de medidas no está instalado.';
      end if;
      v_quantity_in_inventory_unit :=
        public.convert_measurement(v_quantity, v_quantity_unit, v_variant.inventory_unit);
    else
      v_quantity_in_inventory_unit := v_quantity;
      v_quantity_unit := 'unit';
    end if;

    if v_quantity_in_inventory_unit <= 0 then
      raise exception 'La cantidad debe ser mayor que cero.';
    end if;

    insert into public.combo_items (
      business_id, combo_id, product_id, variant_id, quantity, quantity_unit,
      quantity_in_inventory_unit, position, status
    )
    values (
      p_business_id, v_combo_id, v_variant.product_id, v_variant.id, v_quantity,
      v_quantity_unit, v_quantity_in_inventory_unit,
      coalesce((v_item->>'position')::integer, 0), 'active'
    );
  end loop;

  return v_combo_id;
end;
$$;

create or replace function public.update_combo_with_items(
  p_combo_id uuid,
  p_business_id uuid,
  p_name text,
  p_description text,
  p_category text,
  p_sale_price numeric,
  p_packaging_cost numeric,
  p_commission_percent numeric,
  p_desired_margin_percent numeric,
  p_tax_percent numeric,
  p_status text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_item jsonb;
  v_item_id uuid;
  v_seen_item_ids uuid[] := '{}';
  v_variant record;
  v_quantity numeric;
  v_quantity_unit text;
  v_quantity_in_inventory_unit numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1
    from public.combos c
    join public.businesses b on b.id = c.business_id
    where c.id = p_combo_id
      and c.business_id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para modificar este combo.';
  end if;

  if length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Escribe el nombre del combo.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Agrega al menos un producto al combo.';
  end if;

  update public.combos
  set
    name = trim(p_name),
    description = nullif(trim(coalesce(p_description, '')), ''),
    category = nullif(trim(coalesce(p_category, '')), ''),
    sale_price = coalesce(p_sale_price, 0),
    packaging_cost = coalesce(p_packaging_cost, 0),
    commission_percent = coalesce(p_commission_percent, 0),
    desired_margin_percent = coalesce(p_desired_margin_percent, 35),
    tax_percent = coalesce(p_tax_percent, 0),
    status = coalesce(p_status, 'active')
  where id = p_combo_id
    and business_id = p_business_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_id := nullif(v_item->>'id', '')::uuid;
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_quantity_unit := coalesce(nullif(trim(v_item->>'quantity_unit'), ''), 'unit');

    if v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor que cero.';
    end if;

    select pv.*, p.status as product_status
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
    where pv.id = (v_item->>'variant_id')::uuid
      and pv.business_id = p_business_id
      and pv.status = 'active'
      and p.status = 'active';

    if v_variant.id is null then
      raise exception 'Selecciona un producto activo.';
    end if;

    if v_variant.inventory_mode = 'measured' then
      if to_regprocedure('public.convert_measurement(numeric,text,text)') is null then
        raise exception 'El soporte de medidas no está instalado.';
      end if;
      v_quantity_in_inventory_unit :=
        public.convert_measurement(v_quantity, v_quantity_unit, v_variant.inventory_unit);
    else
      v_quantity_in_inventory_unit := v_quantity;
      v_quantity_unit := 'unit';
    end if;

    if v_quantity_in_inventory_unit <= 0 then
      raise exception 'La cantidad debe ser mayor que cero.';
    end if;

    if v_item_id is not null then
      update public.combo_items
      set
        product_id = v_variant.product_id,
        variant_id = v_variant.id,
        quantity = v_quantity,
        quantity_unit = v_quantity_unit,
        quantity_in_inventory_unit = v_quantity_in_inventory_unit,
        position = coalesce((v_item->>'position')::integer, 0),
        status = 'active'
      where id = v_item_id
        and combo_id = p_combo_id
        and business_id = p_business_id;

      if not found then
        raise exception 'No encontramos un producto del combo para actualizar.';
      end if;

      v_seen_item_ids := array_append(v_seen_item_ids, v_item_id);
    else
      insert into public.combo_items (
        business_id, combo_id, product_id, variant_id, quantity, quantity_unit,
        quantity_in_inventory_unit, position, status
      )
      values (
        p_business_id, p_combo_id, v_variant.product_id, v_variant.id, v_quantity,
        v_quantity_unit, v_quantity_in_inventory_unit,
        coalesce((v_item->>'position')::integer, 0), 'active'
      )
      returning id into v_item_id;

      v_seen_item_ids := array_append(v_seen_item_ids, v_item_id);
    end if;
  end loop;

  update public.combo_items
  set status = 'archived'
  where combo_id = p_combo_id
    and business_id = p_business_id
    and status = 'active'
    and not (id = any(v_seen_item_ids));

  return p_combo_id;
end;
$$;

revoke all on function public.create_combo_with_items(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) from public;
revoke all on function public.create_combo_with_items(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) from anon;
grant execute on function public.create_combo_with_items(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) to authenticated;

revoke all on function public.update_combo_with_items(
  uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) from public;
revoke all on function public.update_combo_with_items(
  uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) from anon;
grant execute on function public.update_combo_with_items(
  uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
) to authenticated;

notify pgrst, 'reload schema';

commit;
