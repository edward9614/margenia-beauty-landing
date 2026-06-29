-- Margenia sales module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

do $$
begin
  if to_regclass('public.products') is null
    or to_regclass('public.product_variants') is null
    or to_regclass('public.combos') is null
    or to_regclass('public.combo_items') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'product_variants'
        and column_name = 'inventory_mode'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'product_variants'
        and column_name = 'inventory_unit'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'product_variants'
        and column_name = 'default_sale_unit'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'product_variants'
        and column_name = 'current_stock'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'product_variants'
        and column_name = 'purchase_cost'
    )
    or to_regprocedure('public.convert_measurement(numeric,text,text)') is null then
    raise exception 'Antes de instalar Ventas debes ejecutar las migraciones de Productos, Productos por medida y Combos.';
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
  if to_regclass('public.sales_sale_number_seq') is null then
    create sequence public.sales_sale_number_seq;
    comment on sequence public.sales_sale_number_seq is 'created_by_006_sales';
  end if;
end;
$$;

revoke all on sequence public.sales_sale_number_seq from anon;
grant usage, select on sequence public.sales_sale_number_seq to authenticated;

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

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.combos'::regclass
      and conname = 'combos_id_business_id_unique'
  ) then
    alter table public.combos
      add constraint combos_id_business_id_unique unique (id, business_id);
  end if;
end;
$$;

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_number bigint not null default nextval('public.sales_sale_number_seq'),
  sale_code text not null,
  sale_date timestamptz not null default now(),
  customer_name text,
  customer_phone text,
  customer_note text,
  channel text,
  payment_status text not null default 'paid',
  status text not null default 'completed',
  subtotal_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  shipping_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  paid_amount numeric(14,2) not null default 0,
  balance_due numeric(14,2) not null default 0,
  total_cost numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  gross_margin_percent numeric(7,2) not null default 0,
  notes text,
  void_reason text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_id_business_id_unique unique (id, business_id),
  constraint sales_sale_code_not_blank check (length(trim(sale_code)) > 0),
  constraint sales_amounts_non_negative check (
    subtotal_amount >= 0 and discount_amount >= 0 and tax_amount >= 0
    and shipping_amount >= 0 and total_amount >= 0 and paid_amount >= 0
    and balance_due >= 0 and total_cost >= 0
  ),
  constraint sales_channel_check check (
    channel is null or channel in ('local','instagram','whatsapp','online_store','feria','otro')
  ),
  constraint sales_payment_status_check check (payment_status in ('paid','partial','pending')),
  constraint sales_status_check check (status in ('completed','voided')),
  constraint sales_paid_consistency_check check (
    (payment_status = 'paid' and balance_due = 0)
    or (payment_status = 'pending' and paid_amount = 0)
    or (payment_status = 'partial' and paid_amount > 0 and balance_due > 0)
  )
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  item_type text not null,
  product_id uuid,
  variant_id uuid,
  combo_id uuid,
  item_name text not null,
  variant_name text,
  sku text,
  quantity numeric(18,6) not null,
  quantity_unit text not null default 'unit',
  quantity_in_inventory_unit numeric(18,6) not null default 1,
  unit_price numeric(14,2) not null default 0,
  subtotal_amount numeric(14,2) not null default 0,
  discount_amount numeric(14,2) not null default 0,
  tax_amount numeric(14,2) not null default 0,
  total_amount numeric(14,2) not null default 0,
  unit_cost numeric(14,6) not null default 0,
  total_cost numeric(14,2) not null default 0,
  gross_profit numeric(14,2) not null default 0,
  gross_margin_percent numeric(7,2) not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  constraint sale_items_sale_business_fk
    foreign key (sale_id, business_id)
    references public.sales(id, business_id)
    on delete cascade,
  constraint sale_items_variant_fk
    foreign key (variant_id, business_id)
    references public.product_variants(id, business_id),
  constraint sale_items_combo_fk
    foreign key (combo_id, business_id)
    references public.combos(id, business_id),
  constraint sale_items_quantity_check check (quantity > 0),
  constraint sale_items_quantity_inventory_check check (quantity_in_inventory_unit > 0),
  constraint sale_items_quantity_unit_not_blank check (length(trim(quantity_unit)) > 0),
  constraint sale_items_amounts_non_negative check (
    unit_price >= 0 and subtotal_amount >= 0 and discount_amount >= 0
    and tax_amount >= 0 and total_amount >= 0 and total_cost >= 0
  ),
  constraint sale_items_item_type_check check (item_type in ('product','combo')),
  constraint sale_items_position_check check (position >= 0)
);

create table if not exists public.sale_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  sale_id uuid not null,
  amount numeric(14,2) not null,
  payment_method text not null,
  paid_at timestamptz not null default now(),
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  constraint sale_payments_sale_business_fk
    foreign key (sale_id, business_id)
    references public.sales(id, business_id)
    on delete cascade,
  constraint sale_payments_amount_check check (amount > 0),
  constraint sale_payments_method_check check (
    payment_method in ('cash','transfer','card','nequi','daviplata','other')
  )
);

do $$
begin
  if to_regclass('public.inventory_movements') is null then
    create table public.inventory_movements (
      id uuid primary key default gen_random_uuid(),
      business_id uuid not null references public.businesses(id) on delete cascade,
      variant_id uuid not null references public.product_variants(id),
      movement_type text not null,
      quantity numeric(18,6) not null,
      stock_unit text not null,
      unit_cost numeric(14,6),
      total_cost numeric(14,2),
      reference_type text,
      reference_id uuid,
      notes text,
      created_at timestamptz not null default now(),
      constraint inventory_movements_quantity_check check (quantity <> 0),
      constraint inventory_movements_stock_unit_not_blank check (length(trim(stock_unit)) > 0),
      constraint inventory_movements_costs_check check (
        (unit_cost is null or unit_cost >= 0)
        and (total_cost is null or total_cost >= 0)
      ),
      constraint inventory_movements_type_check check (
        movement_type in ('sale','sale_void','adjustment','purchase','return','waste')
      )
    );

    comment on table public.inventory_movements is 'created_by_006_sales';
  end if;
end;
$$;

create index if not exists sales_business_id_idx on public.sales(business_id);
create index if not exists sales_business_status_idx on public.sales(business_id, status);
create index if not exists sales_business_payment_status_idx on public.sales(business_id, payment_status);
create index if not exists sales_business_sale_date_idx on public.sales(business_id, sale_date desc);
create index if not exists sales_business_sale_code_idx on public.sales(business_id, sale_code);
create unique index if not exists sales_business_sale_code_unique_idx
  on public.sales(business_id, sale_code);

create index if not exists sale_items_business_id_idx on public.sale_items(business_id);
create index if not exists sale_items_sale_id_idx on public.sale_items(sale_id);
create index if not exists sale_items_variant_id_idx on public.sale_items(variant_id);
create index if not exists sale_items_combo_id_idx on public.sale_items(combo_id);
create index if not exists sale_items_item_type_idx on public.sale_items(item_type);

create index if not exists sale_payments_business_id_idx on public.sale_payments(business_id);
create index if not exists sale_payments_sale_id_idx on public.sale_payments(sale_id);
create index if not exists sale_payments_method_idx on public.sale_payments(payment_method);
create index if not exists sale_payments_paid_at_idx on public.sale_payments(paid_at desc);

create index if not exists inventory_movements_business_id_idx on public.inventory_movements(business_id);
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements(variant_id);
create index if not exists inventory_movements_type_idx on public.inventory_movements(movement_type);
create index if not exists inventory_movements_reference_idx on public.inventory_movements(reference_type, reference_id);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements(created_at desc);

drop trigger if exists sales_set_updated_at on public.sales;
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_payments enable row level security;
alter table public.inventory_movements enable row level security;

revoke all on public.sales from anon;
revoke all on public.sale_items from anon;
revoke all on public.sale_payments from anon;
revoke all on public.inventory_movements from anon;

grant select, insert, update on public.sales to authenticated;
grant select, insert on public.sale_items to authenticated;
grant select, insert on public.sale_payments to authenticated;
grant select, insert on public.inventory_movements to authenticated;

drop policy if exists "Users can view sales for their businesses" on public.sales;
create policy "Users can view sales for their businesses"
  on public.sales
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = sales.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert sales for their businesses" on public.sales;
create policy "Users can insert sales for their businesses"
  on public.sales
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = sales.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update sales for their businesses" on public.sales;
create policy "Users can update sales for their businesses"
  on public.sales
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = sales.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = sales.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view sale items for their businesses" on public.sale_items;
create policy "Users can view sale items for their businesses"
  on public.sale_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      join public.sales s on s.business_id = b.id
      where b.id = sale_items.business_id
        and s.id = sale_items.sale_id
        and s.business_id = sale_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert sale items for their businesses" on public.sale_items;
create policy "Users can insert sale items for their businesses"
  on public.sale_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      join public.sales s on s.business_id = b.id
      where b.id = sale_items.business_id
        and s.id = sale_items.sale_id
        and s.business_id = sale_items.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view sale payments for their businesses" on public.sale_payments;
create policy "Users can view sale payments for their businesses"
  on public.sale_payments
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      join public.sales s on s.business_id = b.id
      where b.id = sale_payments.business_id
        and s.id = sale_payments.sale_id
        and s.business_id = sale_payments.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert sale payments for their businesses" on public.sale_payments;
create policy "Users can insert sale payments for their businesses"
  on public.sale_payments
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      join public.sales s on s.business_id = b.id
      where b.id = sale_payments.business_id
        and s.id = sale_payments.sale_id
        and s.business_id = sale_payments.business_id
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
      select 1 from public.businesses b
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
      select 1 from public.businesses b
      where b.id = inventory_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_sale_with_items(
  p_business_id uuid,
  p_sale_date timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_note text,
  p_channel text,
  p_discount_amount numeric,
  p_shipping_amount numeric,
  p_payment_status text,
  p_paid_amount numeric,
  p_payment_method text,
  p_payment_reference text,
  p_notes text,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_sale_number bigint;
  v_sale_code text;
  v_item jsonb;
  v_item_type text;
  v_variant record;
  v_combo record;
  v_combo_item record;
  v_quantity numeric;
  v_quantity_unit text;
  v_quantity_in_inventory_unit numeric;
  v_unit_price numeric;
  v_line_discount numeric;
  v_tax_percent numeric;
  v_line_subtotal numeric;
  v_line_tax numeric;
  v_line_total numeric;
  v_line_cost numeric;
  v_line_profit numeric;
  v_line_margin numeric;
  v_required_quantity numeric;
  v_default_sale_unit_in_inventory_unit numeric;
  v_sale_units numeric;
  v_total_subtotal numeric := 0;
  v_total_item_discount numeric := 0;
  v_total_tax numeric := 0;
  v_total_amount numeric := 0;
  v_total_cost numeric := 0;
  v_total_profit numeric := 0;
  v_gross_margin numeric := 0;
  v_paid_amount numeric := coalesce(p_paid_amount, 0);
  v_balance_due numeric := 0;
  v_payment_status text := coalesce(nullif(trim(p_payment_status), ''), 'paid');
  v_payment_method text := nullif(trim(coalesce(p_payment_method, '')), '');
  v_customer_name text := nullif(trim(coalesce(p_customer_name, '')), '');
  v_global_discount numeric := coalesce(p_discount_amount, 0);
  v_shipping_amount numeric := coalesce(p_shipping_amount, 0);
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para registrar ventas en este negocio.';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Agrega al menos un producto o combo.';
  end if;

  if v_payment_status not in ('paid','partial','pending') then
    raise exception 'Selecciona un estado de pago válido.';
  end if;

  if coalesce(p_channel, 'local') not in ('local','instagram','whatsapp','online_store','feria','otro') then
    raise exception 'Selecciona un canal válido.';
  end if;

  drop table if exists pg_temp.sale_required_stock;
  create temporary table sale_required_stock (
    variant_id uuid primary key,
    required_quantity numeric(18,6) not null,
    current_stock numeric(18,6) not null,
    track_inventory boolean not null
  ) on commit drop;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_type := coalesce(v_item->>'item_type', '');
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_quantity_unit := coalesce(nullif(trim(v_item->>'quantity_unit'), ''), 'unit');
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_line_discount := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_tax_percent := coalesce((v_item->>'tax_percent')::numeric, 0);

    if v_item_type not in ('product','combo') then
      raise exception 'Selecciona un producto o combo válido.';
    end if;

    if v_quantity <= 0 then
      raise exception 'La cantidad debe ser mayor que cero.';
    end if;

    if v_unit_price <= 0 then
      raise exception 'El precio debe ser mayor que cero.';
    end if;

    if v_line_discount < 0 or v_tax_percent < 0 or v_tax_percent >= 100 then
      raise exception 'Revisa descuentos e impuestos.';
    end if;

    if v_item_type = 'product' then
      select pv.*, p.name as product_name, p.status as product_status, p.track_inventory
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
      where pv.id = (v_item->>'variant_id')::uuid
        and pv.business_id = p_business_id
      for update of pv;

      if v_variant.id is null or v_variant.status <> 'active' or v_variant.product_status <> 'active' then
        raise exception 'Este producto ya no está activo.';
      end if;

      if v_variant.inventory_mode = 'measured' then
        v_quantity_in_inventory_unit :=
          public.convert_measurement(v_quantity, v_quantity_unit, v_variant.inventory_unit);
        v_default_sale_unit_in_inventory_unit :=
          public.convert_measurement(
            1,
            coalesce(v_variant.default_sale_unit, v_variant.inventory_unit),
            v_variant.inventory_unit
          );

        if v_default_sale_unit_in_inventory_unit <= 0 then
          raise exception 'La unidad de venta no es compatible con el inventario.';
        end if;

        v_sale_units := v_quantity_in_inventory_unit / v_default_sale_unit_in_inventory_unit;
      else
        v_quantity_in_inventory_unit := v_quantity;
        v_quantity_unit := 'unit';
        v_sale_units := v_quantity;
      end if;

      if v_quantity_in_inventory_unit <= 0 or v_sale_units <= 0 then
        raise exception 'La cantidad debe ser mayor que cero.';
      end if;

      insert into sale_required_stock (
        variant_id, required_quantity, current_stock, track_inventory
      )
      values (
        v_variant.id, v_quantity_in_inventory_unit, coalesce(v_variant.current_stock, 0),
        coalesce(v_variant.track_inventory, true)
      )
      on conflict (variant_id)
      do update set
        required_quantity = sale_required_stock.required_quantity + excluded.required_quantity,
        current_stock = least(sale_required_stock.current_stock, excluded.current_stock),
        track_inventory = sale_required_stock.track_inventory or excluded.track_inventory;

      v_line_subtotal := round(v_sale_units * v_unit_price, 2);
      v_line_tax := round(greatest(v_line_subtotal - v_line_discount, 0) * (v_tax_percent / 100), 2);
      v_line_total := greatest(v_line_subtotal - v_line_discount + v_line_tax, 0);
      v_line_cost := round(v_quantity_in_inventory_unit * coalesce(v_variant.purchase_cost, 0), 2);
      v_line_profit := v_line_total - v_line_cost;
      v_line_margin := case when v_line_total > 0 then round((v_line_profit / v_line_total) * 100, 2) else 0 end;
    else
      select c.*
      into v_combo
      from public.combos c
      where c.id = (v_item->>'combo_id')::uuid
        and c.business_id = p_business_id
        and c.status = 'active';

      if v_combo.id is null then
        raise exception 'Este combo ya no está activo.';
      end if;

      if not exists (
        select 1
        from public.combo_items ci
        where ci.combo_id = v_combo.id
          and ci.business_id = p_business_id
          and ci.status = 'active'
      ) then
        raise exception 'Este combo no tiene productos activos.';
      end if;

      v_line_subtotal := round(v_quantity * v_unit_price, 2);
      v_line_tax := round(greatest(v_line_subtotal - v_line_discount, 0) * (v_tax_percent / 100), 2);
      v_line_total := greatest(v_line_subtotal - v_line_discount + v_line_tax, 0);
      v_line_cost := 0;

      for v_combo_item in
        select ci.*, pv.purchase_cost, pv.current_stock, pv.inventory_unit, pv.status as variant_status,
          p.status as product_status, p.track_inventory
        from public.combo_items ci
        join public.product_variants pv on pv.id = ci.variant_id and pv.business_id = ci.business_id
        join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
        where ci.combo_id = v_combo.id
          and ci.business_id = p_business_id
          and ci.status = 'active'
        for update of pv
      loop
        if v_combo_item.variant_status <> 'active' or v_combo_item.product_status <> 'active' then
          raise exception 'Este combo tiene productos que ya no están activos.';
        end if;

        v_required_quantity := v_combo_item.quantity_in_inventory_unit * v_quantity;

        if coalesce(v_combo_item.track_inventory, true)
        then
          insert into sale_required_stock (
            variant_id, required_quantity, current_stock, track_inventory
          )
          values (
            v_combo_item.variant_id, v_required_quantity,
            coalesce(v_combo_item.current_stock, 0), true
          )
          on conflict (variant_id)
          do update set
            required_quantity = sale_required_stock.required_quantity + excluded.required_quantity,
            current_stock = least(sale_required_stock.current_stock, excluded.current_stock),
            track_inventory = true;
        end if;

        v_line_cost := v_line_cost + round(v_required_quantity * coalesce(v_combo_item.purchase_cost, 0), 2);
      end loop;

      v_line_profit := v_line_total - v_line_cost;
      v_line_margin := case when v_line_total > 0 then round((v_line_profit / v_line_total) * 100, 2) else 0 end;
    end if;

    v_total_subtotal := v_total_subtotal + v_line_subtotal;
    v_total_item_discount := v_total_item_discount + v_line_discount;
    v_total_tax := v_total_tax + v_line_tax;
    v_total_amount := v_total_amount + v_line_total;
    v_total_cost := v_total_cost + v_line_cost;
  end loop;

  if exists (
    select 1
    from sale_required_stock
    where track_inventory = true
      and required_quantity > current_stock
  ) then
    raise exception 'No hay suficiente inventario para completar esta venta.';
  end if;

  if v_global_discount < 0 or v_shipping_amount < 0 then
    raise exception 'Revisa descuentos y envío.';
  end if;

  v_total_amount := greatest(v_total_amount - v_global_discount + v_shipping_amount, 0);
  v_total_profit := v_total_amount - v_total_cost;
  v_gross_margin := case when v_total_amount > 0 then round((v_total_profit / v_total_amount) * 100, 2) else 0 end;

  if v_payment_status = 'paid' then
    if v_paid_amount <> v_total_amount then
      raise exception 'El monto pagado debe ser igual al total.';
    end if;

    if v_payment_method is null then
      raise exception 'Selecciona un método de pago.';
    end if;
  elsif v_payment_status = 'partial' then
    if v_customer_name is null then
      raise exception 'Agrega el nombre del cliente para ventas pendientes.';
    end if;

    if v_paid_amount <= 0 or v_paid_amount >= v_total_amount then
      raise exception 'Para un pago parcial, el monto pagado debe ser mayor que cero y menor al total.';
    end if;

    if v_payment_method is null then
      raise exception 'Selecciona un método de pago.';
    end if;
  else
    if v_customer_name is null then
      raise exception 'Agrega el nombre del cliente para ventas pendientes.';
    end if;

    if v_paid_amount <> 0 then
      raise exception 'Una venta pendiente no debe tener monto pagado.';
    end if;
  end if;

  v_balance_due := greatest(v_total_amount - v_paid_amount, 0);
  v_sale_number := nextval('public.sales_sale_number_seq');
  v_sale_code := 'V-' || to_char(coalesce(p_sale_date, now()), 'YYYY') || '-' || lpad(v_sale_number::text, 6, '0');

  insert into public.sales (
    business_id, sale_number, sale_code, sale_date, customer_name, customer_phone,
    customer_note, channel, payment_status, status, subtotal_amount, discount_amount,
    tax_amount, shipping_amount, total_amount, paid_amount, balance_due, total_cost,
    gross_profit, gross_margin_percent, notes
  )
  values (
    p_business_id, v_sale_number, v_sale_code, coalesce(p_sale_date, now()),
    v_customer_name, nullif(trim(coalesce(p_customer_phone, '')), ''),
    nullif(trim(coalesce(p_customer_note, '')), ''), coalesce(p_channel, 'local'),
    v_payment_status, 'completed', v_total_subtotal,
    v_total_item_discount + v_global_discount, v_total_tax, v_shipping_amount,
    v_total_amount, v_paid_amount, v_balance_due, v_total_cost, v_total_profit,
    v_gross_margin, nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_type := coalesce(v_item->>'item_type', '');
    v_quantity := coalesce((v_item->>'quantity')::numeric, 0);
    v_quantity_unit := coalesce(nullif(trim(v_item->>'quantity_unit'), ''), 'unit');
    v_unit_price := coalesce((v_item->>'unit_price')::numeric, 0);
    v_line_discount := coalesce((v_item->>'discount_amount')::numeric, 0);
    v_tax_percent := coalesce((v_item->>'tax_percent')::numeric, 0);

    if v_item_type = 'product' then
      select pv.*, p.name as product_name, p.status as product_status, p.track_inventory
      into v_variant
      from public.product_variants pv
      join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
      where pv.id = (v_item->>'variant_id')::uuid
        and pv.business_id = p_business_id
      for update of pv;

      if v_variant.inventory_mode = 'measured' then
        v_quantity_in_inventory_unit :=
          public.convert_measurement(v_quantity, v_quantity_unit, v_variant.inventory_unit);
        v_default_sale_unit_in_inventory_unit :=
          public.convert_measurement(
            1,
            coalesce(v_variant.default_sale_unit, v_variant.inventory_unit),
            v_variant.inventory_unit
          );

        if v_default_sale_unit_in_inventory_unit <= 0 then
          raise exception 'La unidad de venta no es compatible con el inventario.';
        end if;

        v_sale_units := v_quantity_in_inventory_unit / v_default_sale_unit_in_inventory_unit;
      else
        v_quantity_in_inventory_unit := v_quantity;
        v_quantity_unit := 'unit';
        v_sale_units := v_quantity;
      end if;

      if v_quantity_in_inventory_unit <= 0 or v_sale_units <= 0 then
        raise exception 'La cantidad debe ser mayor que cero.';
      end if;

      v_line_subtotal := round(v_sale_units * v_unit_price, 2);
      v_line_tax := round(greatest(v_line_subtotal - v_line_discount, 0) * (v_tax_percent / 100), 2);
      v_line_total := greatest(v_line_subtotal - v_line_discount + v_line_tax, 0);
      v_line_cost := round(v_quantity_in_inventory_unit * coalesce(v_variant.purchase_cost, 0), 2);
      v_line_profit := v_line_total - v_line_cost;
      v_line_margin := case when v_line_total > 0 then round((v_line_profit / v_line_total) * 100, 2) else 0 end;

      insert into public.sale_items (
        business_id, sale_id, item_type, product_id, variant_id, item_name, variant_name, sku,
        quantity, quantity_unit, quantity_in_inventory_unit, unit_price, subtotal_amount,
        discount_amount, tax_amount, total_amount, unit_cost, total_cost, gross_profit,
        gross_margin_percent, position
      )
      values (
        p_business_id, v_sale_id, 'product', v_variant.product_id, v_variant.id,
        v_variant.product_name, v_variant.name, v_variant.sku, v_quantity, v_quantity_unit,
        v_quantity_in_inventory_unit, v_unit_price, v_line_subtotal, v_line_discount,
        v_line_tax, v_line_total, coalesce(v_variant.purchase_cost, 0), v_line_cost,
        v_line_profit, v_line_margin, coalesce((v_item->>'position')::integer, 0)
      );

      if coalesce(v_variant.track_inventory, true) then
        update public.product_variants
        set current_stock = current_stock - v_quantity_in_inventory_unit
        where id = v_variant.id
          and business_id = p_business_id
          and current_stock >= v_quantity_in_inventory_unit;

        if not found then
          raise exception 'No hay suficiente inventario para completar esta venta.';
        end if;

        insert into public.inventory_movements (
          business_id, variant_id, movement_type, quantity, stock_unit, unit_cost,
          total_cost, reference_type, reference_id, notes
        )
        values (
          p_business_id, v_variant.id, 'sale', -v_quantity_in_inventory_unit,
          coalesce(v_variant.inventory_unit, 'unit'), coalesce(v_variant.purchase_cost, 0),
          v_line_cost, 'sale', v_sale_id, 'Venta ' || v_sale_code
        );
      end if;
    else
      select c.*
      into v_combo
      from public.combos c
      where c.id = (v_item->>'combo_id')::uuid
        and c.business_id = p_business_id
        and c.status = 'active';

      v_line_subtotal := round(v_quantity * v_unit_price, 2);
      v_line_tax := round(greatest(v_line_subtotal - v_line_discount, 0) * (v_tax_percent / 100), 2);
      v_line_total := greatest(v_line_subtotal - v_line_discount + v_line_tax, 0);
      v_line_cost := 0;

      for v_combo_item in
        select ci.*, pv.purchase_cost, pv.current_stock, pv.inventory_unit, pv.status as variant_status,
          p.status as product_status, p.track_inventory
        from public.combo_items ci
        join public.product_variants pv on pv.id = ci.variant_id and pv.business_id = ci.business_id
        join public.products p on p.id = pv.product_id and p.business_id = pv.business_id
        where ci.combo_id = v_combo.id
          and ci.business_id = p_business_id
          and ci.status = 'active'
        for update of pv
      loop
        v_required_quantity := v_combo_item.quantity_in_inventory_unit * v_quantity;
        v_line_cost := v_line_cost + round(v_required_quantity * coalesce(v_combo_item.purchase_cost, 0), 2);

        if coalesce(v_combo_item.track_inventory, true) then
          update public.product_variants
          set current_stock = current_stock - v_required_quantity
          where id = v_combo_item.variant_id
            and business_id = p_business_id
            and current_stock >= v_required_quantity;

          if not found then
            raise exception 'No hay suficiente inventario para completar esta venta.';
          end if;

          insert into public.inventory_movements (
            business_id, variant_id, movement_type, quantity, stock_unit, unit_cost,
            total_cost, reference_type, reference_id, notes
          )
          values (
            p_business_id, v_combo_item.variant_id, 'sale', -v_required_quantity,
            coalesce(v_combo_item.inventory_unit, 'unit'), coalesce(v_combo_item.purchase_cost, 0),
            round(v_required_quantity * coalesce(v_combo_item.purchase_cost, 0), 2),
            'sale', v_sale_id, 'Combo ' || v_combo.name || ' en venta ' || v_sale_code
          );
        end if;
      end loop;

      v_line_profit := v_line_total - v_line_cost;
      v_line_margin := case when v_line_total > 0 then round((v_line_profit / v_line_total) * 100, 2) else 0 end;

      insert into public.sale_items (
        business_id, sale_id, item_type, combo_id, item_name, quantity, quantity_unit,
        quantity_in_inventory_unit, unit_price, subtotal_amount, discount_amount,
        tax_amount, total_amount, unit_cost, total_cost, gross_profit,
        gross_margin_percent, position
      )
      values (
        p_business_id, v_sale_id, 'combo', v_combo.id, v_combo.name, v_quantity, 'unit',
        v_quantity, v_unit_price, v_line_subtotal, v_line_discount, v_line_tax,
        v_line_total, case when v_quantity > 0 then round(v_line_cost / v_quantity, 6) else 0 end,
        v_line_cost, v_line_profit, v_line_margin, coalesce((v_item->>'position')::integer, 0)
      );
    end if;
  end loop;

  if v_paid_amount > 0 then
    insert into public.sale_payments (
      business_id, sale_id, amount, payment_method, reference
    )
    values (
      p_business_id, v_sale_id, v_paid_amount, v_payment_method,
      nullif(trim(coalesce(p_payment_reference, '')), '')
    );
  end if;

  return v_sale_id;
end;
$$;

create or replace function public.void_sale(
  p_sale_id uuid,
  p_business_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_sale record;
  v_movement record;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  select s.*
  into v_sale
  from public.sales s
  join public.businesses b on b.id = s.business_id
  where s.id = p_sale_id
    and s.business_id = p_business_id
    and b.owner_id = (select auth.uid())
  for update of s;

  if v_sale.id is null then
    raise exception 'No encontramos esta venta.';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'Esta venta ya fue anulada.';
  end if;

  update public.sales
  set status = 'voided',
      void_reason = nullif(trim(coalesce(p_reason, '')), ''),
      voided_at = now()
  where id = p_sale_id
    and business_id = p_business_id;

  for v_movement in
    select *
    from public.inventory_movements
    where business_id = p_business_id
      and reference_type = 'sale'
      and reference_id = p_sale_id
      and movement_type = 'sale'
    for update
  loop
    update public.product_variants
    set current_stock = current_stock + abs(v_movement.quantity)
    where id = v_movement.variant_id
      and business_id = p_business_id;

    insert into public.inventory_movements (
      business_id, variant_id, movement_type, quantity, stock_unit, unit_cost,
      total_cost, reference_type, reference_id, notes
    )
    values (
      p_business_id, v_movement.variant_id, 'sale_void', abs(v_movement.quantity),
      v_movement.stock_unit, v_movement.unit_cost, v_movement.total_cost,
      'sale', p_sale_id, 'Anulación de venta ' || v_sale.sale_code
    );
  end loop;

  return p_sale_id;
end;
$$;

revoke all on function public.create_sale_with_items(
  uuid, timestamptz, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) from public;
revoke all on function public.create_sale_with_items(
  uuid, timestamptz, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) from anon;
grant execute on function public.create_sale_with_items(
  uuid, timestamptz, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) to authenticated;

revoke all on function public.void_sale(uuid, uuid, text) from public;
revoke all on function public.void_sale(uuid, uuid, text) from anon;
grant execute on function public.void_sale(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
