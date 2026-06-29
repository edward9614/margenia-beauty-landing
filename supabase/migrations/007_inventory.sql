-- Margenia inventory module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

do $$
begin
  if to_regclass('public.products') is null
    or to_regclass('public.product_variants') is null
    or to_regclass('public.inventory_movements') is null
    or to_regprocedure('public.convert_measurement(numeric,text,text)') is null then
    raise exception 'Antes de instalar Inventario debes ejecutar Productos, Productos por medida y Ventas.';
  end if;
end;
$$;

alter table public.product_variants
  add column if not exists low_stock_threshold numeric(18,6) not null default 0,
  add column if not exists inventory_location text,
  add column if not exists last_counted_at timestamptz;

alter table public.inventory_movements
  add column if not exists movement_code text,
  add column if not exists created_by uuid,
  add column if not exists reason text,
  add column if not exists balance_after numeric(18,6),
  add column if not exists source text not null default 'manual';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.product_variants'::regclass
      and conname = 'product_variants_id_business_id_unique'
  ) then
    alter table public.product_variants
      add constraint product_variants_id_business_id_unique unique (id, business_id);
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.inventory_document_number_seq') is null then
    create sequence public.inventory_document_number_seq;
    comment on sequence public.inventory_document_number_seq is 'created_by_007_inventory';
  end if;
end;
$$;

revoke all on sequence public.inventory_document_number_seq from anon;
grant usage, select on sequence public.inventory_document_number_seq to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.inventory_movements'::regclass
      and conname = 'inventory_movements_source_check'
  ) then
    alter table public.inventory_movements
      add constraint inventory_movements_source_check
      check (source in ('manual','sale','sale_void','count'));
  end if;
end;
$$;

create table if not exists public.inventory_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  count_code text not null,
  status text not null default 'completed',
  notes text,
  created_by uuid,
  counted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint inventory_counts_id_business_id_unique unique (id, business_id),
  constraint inventory_counts_code_not_blank check (length(trim(count_code)) > 0),
  constraint inventory_counts_status_check check (status in ('completed','voided'))
);

create table if not exists public.inventory_count_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  count_id uuid not null,
  variant_id uuid not null,
  product_name text not null,
  variant_name text,
  system_stock numeric(18,6) not null default 0,
  counted_stock numeric(18,6) not null default 0,
  difference_quantity numeric(18,6) not null default 0,
  stock_unit text not null,
  unit_cost numeric(14,6) not null default 0,
  total_difference_cost numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint inventory_count_items_count_business_fk
    foreign key (count_id, business_id)
    references public.inventory_counts(id, business_id)
    on delete cascade,
  constraint inventory_count_items_variant_business_fk
    foreign key (variant_id, business_id)
    references public.product_variants(id, business_id),
  constraint inventory_count_items_counted_stock_check check (counted_stock >= 0),
  constraint inventory_count_items_stock_unit_not_blank check (length(trim(stock_unit)) > 0)
);

create index if not exists product_variants_business_stock_idx
  on public.product_variants(business_id, current_stock);
create index if not exists product_variants_business_location_idx
  on public.product_variants(business_id, inventory_location);

create index if not exists inventory_movements_business_id_idx on public.inventory_movements(business_id);
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements(variant_id);
create index if not exists inventory_movements_type_idx on public.inventory_movements(movement_type);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements(created_at desc);
create index if not exists inventory_movements_reference_idx on public.inventory_movements(reference_type, reference_id);
create index if not exists inventory_movements_code_idx on public.inventory_movements(movement_code);

create index if not exists inventory_counts_business_id_idx on public.inventory_counts(business_id);
create index if not exists inventory_counts_business_counted_at_idx on public.inventory_counts(business_id, counted_at desc);
create unique index if not exists inventory_counts_business_code_unique_idx
  on public.inventory_counts(business_id, count_code);

create index if not exists inventory_count_items_business_id_idx on public.inventory_count_items(business_id);
create index if not exists inventory_count_items_count_id_idx on public.inventory_count_items(count_id);
create index if not exists inventory_count_items_variant_id_idx on public.inventory_count_items(variant_id);

alter table public.inventory_counts enable row level security;
alter table public.inventory_count_items enable row level security;

revoke all on public.inventory_counts from anon;
revoke all on public.inventory_count_items from anon;

grant select, insert, update on public.inventory_counts to authenticated;
grant select, insert on public.inventory_count_items to authenticated;
grant select, insert on public.inventory_movements to authenticated;
grant update on public.product_variants to authenticated;

drop policy if exists "Users can view inventory counts for their businesses" on public.inventory_counts;
create policy "Users can view inventory counts for their businesses"
  on public.inventory_counts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert inventory counts for their businesses" on public.inventory_counts;
create policy "Users can insert inventory counts for their businesses"
  on public.inventory_counts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update inventory counts for their businesses" on public.inventory_counts;
create policy "Users can update inventory counts for their businesses"
  on public.inventory_counts
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = inventory_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view inventory count items for their businesses" on public.inventory_count_items;
create policy "Users can view inventory count items for their businesses"
  on public.inventory_count_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      join public.inventory_counts c on c.business_id = b.id
      where b.id = inventory_count_items.business_id
        and c.id = inventory_count_items.count_id
        and c.business_id = inventory_count_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert inventory count items for their businesses" on public.inventory_count_items;
create policy "Users can insert inventory count items for their businesses"
  on public.inventory_count_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      join public.inventory_counts c on c.business_id = b.id
      where b.id = inventory_count_items.business_id
        and c.id = inventory_count_items.count_id
        and c.business_id = inventory_count_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_inventory_manual_movement(
  p_business_id uuid,
  p_variant_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_quantity_unit text,
  p_unit_cost numeric,
  p_reason text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movement_id uuid;
  v_variant record;
  v_quantity_in_inventory_unit numeric;
  v_signed_quantity numeric;
  v_balance_after numeric;
  v_movement_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para modificar este inventario.';
  end if;

  if p_movement_type not in ('purchase','adjustment','return','waste') then
    raise exception 'Selecciona un tipo de movimiento válido.';
  end if;

  if p_movement_type = 'adjustment' and coalesce(p_quantity, 0) = 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if p_movement_type <> 'adjustment' and coalesce(p_quantity, 0) <= 0 then
    raise exception 'La cantidad debe ser mayor que cero.';
  end if;

  if p_unit_cost is not null and p_unit_cost < 0 then
    raise exception 'El costo unitario no puede ser negativo.';
  end if;

  select pv.*, p.name as product_name, p.status as product_status, p.track_inventory
  into v_variant
  from public.product_variants pv
  join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
  where pv.id = p_variant_id
    and pv.business_id = p_business_id
  for update of pv;

  if not found or v_variant.status <> 'active' or v_variant.product_status <> 'active' then
    raise exception 'Este producto ya no está activo.';
  end if;

  if v_variant.inventory_mode = 'measured' then
    v_quantity_in_inventory_unit :=
      public.convert_measurement(
        abs(p_quantity),
        coalesce(nullif(trim(p_quantity_unit), ''), v_variant.inventory_unit),
        v_variant.inventory_unit
      );
  else
    v_quantity_in_inventory_unit := abs(p_quantity);
  end if;

  if v_quantity_in_inventory_unit <= 0 then
    raise exception 'La unidad no es compatible con este producto.';
  end if;

  if p_movement_type in ('purchase','return') then
    v_signed_quantity := v_quantity_in_inventory_unit;
  elsif p_movement_type = 'waste' then
    v_signed_quantity := -v_quantity_in_inventory_unit;
  else
    v_signed_quantity := case when p_quantity < 0 then -v_quantity_in_inventory_unit else v_quantity_in_inventory_unit end;
  end if;

  v_balance_after := coalesce(v_variant.current_stock, 0) + v_signed_quantity;

  if v_balance_after < 0 then
    raise exception 'No hay suficiente inventario para completar este movimiento.';
  end if;

  update public.product_variants
  set current_stock = v_balance_after
  where id = p_variant_id
    and business_id = p_business_id;

  v_movement_code := 'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.inventory_document_number_seq')::text, 6, '0');

  insert into public.inventory_movements (
    business_id, variant_id, movement_type, quantity, stock_unit, unit_cost,
    total_cost, reference_type, reference_id, notes, movement_code, created_by,
    reason, balance_after, source
  )
  values (
    p_business_id, p_variant_id, p_movement_type, v_signed_quantity,
    coalesce(v_variant.inventory_unit, 'unit'), coalesce(p_unit_cost, v_variant.purchase_cost, 0),
    abs(v_signed_quantity) * coalesce(p_unit_cost, v_variant.purchase_cost, 0),
    'inventory_movement', null, nullif(trim(coalesce(p_notes, '')), ''),
    v_movement_code, (select auth.uid()), nullif(trim(coalesce(p_reason, '')), ''),
    v_balance_after, 'manual'
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

create or replace function public.create_inventory_count(
  p_business_id uuid,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count_id uuid;
  v_count_code text;
  v_item jsonb;
  v_variant record;
  v_counted_stock numeric;
  v_counted_stock_inventory_unit numeric;
  v_difference numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para modificar este inventario.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Selecciona al menos un producto.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) item
    group by item->>'variant_id'
    having count(*) > 1
  ) then
    raise exception 'No puedes repetir el mismo producto en un conteo.';
  end if;

  v_count_code := 'CNT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.inventory_document_number_seq')::text, 6, '0');

  insert into public.inventory_counts (
    business_id, count_code, status, notes, created_by
  )
  values (
    p_business_id, v_count_code, 'completed', nullif(trim(coalesce(p_notes, '')), ''),
    (select auth.uid())
  )
  returning id into v_count_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_counted_stock := coalesce(nullif(trim(v_item->>'counted_stock'), '')::numeric, -1);

    if v_counted_stock < 0 then
      raise exception 'El stock contado no puede ser negativo.';
    end if;

    select pv.*, p.name as product_name, p.status as product_status
    into v_variant
    from public.product_variants pv
    join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
    where pv.id = (v_item->>'variant_id')::uuid
      and pv.business_id = p_business_id
    for update of pv;

    if not found or v_variant.status <> 'active' or v_variant.product_status <> 'active' then
      raise exception 'Este producto ya no está activo.';
    end if;

    if v_variant.inventory_mode = 'measured' then
      v_counted_stock_inventory_unit :=
        public.convert_measurement(
          v_counted_stock,
          coalesce(nullif(trim(v_item->>'stock_unit'), ''), v_variant.inventory_unit),
          v_variant.inventory_unit
        );
    else
      v_counted_stock_inventory_unit := v_counted_stock;
    end if;

    if v_counted_stock_inventory_unit < 0 then
      raise exception 'La unidad no es compatible con este producto.';
    end if;

    v_difference := v_counted_stock_inventory_unit - coalesce(v_variant.current_stock, 0);

    insert into public.inventory_count_items (
      business_id, count_id, variant_id, product_name, variant_name, system_stock,
      counted_stock, difference_quantity, stock_unit, unit_cost, total_difference_cost
    )
    values (
      p_business_id, v_count_id, v_variant.id, v_variant.product_name, v_variant.name,
      coalesce(v_variant.current_stock, 0), v_counted_stock_inventory_unit, v_difference,
      coalesce(v_variant.inventory_unit, 'unit'), coalesce(v_variant.purchase_cost, 0),
      abs(v_difference) * coalesce(v_variant.purchase_cost, 0)
    );

    update public.product_variants
    set current_stock = v_counted_stock_inventory_unit,
        last_counted_at = now()
    where id = v_variant.id
      and business_id = p_business_id;

    if v_difference <> 0 then
      insert into public.inventory_movements (
        business_id, variant_id, movement_type, quantity, stock_unit, unit_cost,
        total_cost, reference_type, reference_id, notes, movement_code, created_by,
        reason, balance_after, source
      )
      values (
        p_business_id, v_variant.id, 'adjustment', v_difference,
        coalesce(v_variant.inventory_unit, 'unit'), coalesce(v_variant.purchase_cost, 0),
        abs(v_difference) * coalesce(v_variant.purchase_cost, 0),
        'inventory_count', v_count_id, 'Conteo físico ' || v_count_code,
        'INV-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.inventory_document_number_seq')::text, 6, '0'),
        (select auth.uid()),
        'Conteo físico', v_counted_stock_inventory_unit, 'count'
      );
    end if;
  end loop;

  return v_count_id;
end;
$$;

create or replace function public.update_inventory_settings(
  p_business_id uuid,
  p_variant_id uuid,
  p_low_stock_threshold numeric,
  p_inventory_location text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para modificar este inventario.';
  end if;

  update public.product_variants
  set low_stock_threshold = greatest(coalesce(p_low_stock_threshold, 0), 0),
      inventory_location = nullif(trim(coalesce(p_inventory_location, '')), '')
  where id = p_variant_id
    and business_id = p_business_id;

  if not found then
    raise exception 'Selecciona un producto.';
  end if;

  return p_variant_id;
end;
$$;

revoke all on function public.create_inventory_manual_movement(
  uuid, uuid, text, numeric, text, numeric, text, text
) from public;
revoke all on function public.create_inventory_manual_movement(
  uuid, uuid, text, numeric, text, numeric, text, text
) from anon;
grant execute on function public.create_inventory_manual_movement(
  uuid, uuid, text, numeric, text, numeric, text, text
) to authenticated;

revoke all on function public.create_inventory_count(uuid, text, jsonb) from public;
revoke all on function public.create_inventory_count(uuid, text, jsonb) from anon;
grant execute on function public.create_inventory_count(uuid, text, jsonb) to authenticated;

revoke all on function public.update_inventory_settings(uuid, uuid, numeric, text) from public;
revoke all on function public.update_inventory_settings(uuid, uuid, numeric, text) from anon;
grant execute on function public.update_inventory_settings(uuid, uuid, numeric, text) to authenticated;

notify pgrst, 'reload schema';

commit;
