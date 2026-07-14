-- Margenia Customers module.
-- Review and run manually in Supabase SQL Editor.

begin;

do $$
begin
  if to_regclass('public.businesses') is null
    or to_regclass('public.sales') is null
    or to_regclass('public.sale_payments') is null
    or to_regprocedure('public.create_sale_with_items(uuid,timestamptz,text,text,text,text,numeric,numeric,text,numeric,text,text,text,jsonb)') is null then
    raise exception 'Antes de instalar Clientes debes ejecutar las migraciones base y de Ventas.';
  end if;
end;
$$;

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
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

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text not null,
  document_type text,
  document_number text,
  phone text,
  email text,
  birth_date date,
  gender text,
  address text,
  city text,
  preferred_contact_channel text,
  marketing_opt_in boolean not null default false,
  tags text[] not null default '{}',
  notes_summary text,
  status text not null default 'active',
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_id_business_id_unique unique (id, business_id),
  constraint customers_full_name_not_blank check (length(trim(full_name)) >= 2),
  constraint customers_contact_required check (
    length(trim(coalesce(phone, ''))) > 0
    or length(trim(coalesce(email, ''))) > 0
  ),
  constraint customers_document_type_check check (
    document_type is null or document_type in ('cc','ce','nit','passport','other')
  ),
  constraint customers_document_consistency_check check (
    document_number is null or document_type is not null
  ),
  constraint customers_gender_check check (
    gender is null or gender in ('female','male','non_binary','prefer_not_to_say','other')
  ),
  constraint customers_contact_channel_check check (
    preferred_contact_channel is null
    or preferred_contact_channel in ('whatsapp','phone','email','instagram','other')
  ),
  constraint customers_status_check check (status in ('active','inactive','archived')),
  constraint customers_archive_consistency_check check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

comment on table public.customers is 'created_by_011_customers';

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  customer_id uuid not null,
  note text not null,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint customer_notes_customer_business_fk
    foreign key (customer_id, business_id)
    references public.customers(id, business_id)
    on delete cascade,
  constraint customer_notes_note_not_blank check (length(trim(note)) > 0)
);

comment on table public.customer_notes is 'created_by_011_customers';

alter table public.sales add column if not exists customer_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sales'::regclass
      and conname = 'sales_customer_business_fk'
  ) then
    alter table public.sales
      add constraint sales_customer_business_fk
      foreign key (customer_id, business_id)
      references public.customers(id, business_id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists customers_business_status_idx
  on public.customers(business_id, status);
create index if not exists customers_business_name_idx
  on public.customers(business_id, lower(full_name));
create index if not exists customers_business_city_idx
  on public.customers(business_id, lower(city));
create index if not exists customers_business_created_at_idx
  on public.customers(business_id, created_at desc);
create index if not exists customers_business_phone_idx
  on public.customers(business_id, phone)
  where phone is not null and length(trim(phone)) > 0;
create index if not exists customers_business_email_idx
  on public.customers(business_id, lower(email))
  where email is not null and length(trim(email)) > 0;
create unique index if not exists customers_business_document_unique_idx
  on public.customers(business_id, document_type, lower(trim(document_number)))
  where document_number is not null and length(trim(document_number)) > 0;
create index if not exists customer_notes_business_customer_created_idx
  on public.customer_notes(business_id, customer_id, created_at desc);
create index if not exists sales_business_customer_date_idx
  on public.sales(business_id, customer_id, sale_date desc)
  where customer_id is not null;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create or replace function public.sync_sale_customer_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_customer record;
begin
  if new.customer_id is null then
    return new;
  end if;

  select c.full_name, c.phone
  into v_customer
  from public.customers c
  where c.id = new.customer_id
    and c.business_id = new.business_id
    and c.status <> 'archived';

  if v_customer.full_name is null then
    raise exception 'No encontramos un cliente activo para esta venta.';
  end if;

  new.customer_name := v_customer.full_name;
  new.customer_phone := v_customer.phone;
  return new;
end;
$$;

drop trigger if exists sales_sync_customer_snapshot on public.sales;
create trigger sales_sync_customer_snapshot
  before insert or update of customer_id on public.sales
  for each row execute function public.sync_sale_customer_snapshot();

alter table public.customers enable row level security;
alter table public.customer_notes enable row level security;

revoke all on public.customers from public;
revoke all on public.customers from anon;
revoke all on public.customer_notes from public;
revoke all on public.customer_notes from anon;

grant select, insert, update on public.customers to authenticated;
grant select, insert on public.customer_notes to authenticated;

drop policy if exists "Users can view customers for their businesses" on public.customers;
create policy "Users can view customers for their businesses"
  on public.customers
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert customers for their businesses" on public.customers;
create policy "Users can insert customers for their businesses"
  on public.customers
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id
        and b.owner_id = (select auth.uid())
    )
    and created_by = (select auth.uid())
  );

drop policy if exists "Users can update customers for their businesses" on public.customers;
create policy "Users can update customers for their businesses"
  on public.customers
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = customers.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view customer notes for their businesses" on public.customer_notes;
create policy "Users can view customer notes for their businesses"
  on public.customer_notes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.businesses b
      join public.customers c on c.business_id = b.id
      where b.id = customer_notes.business_id
        and c.id = customer_notes.customer_id
        and c.business_id = customer_notes.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert customer notes for their businesses" on public.customer_notes;
create policy "Users can insert customer notes for their businesses"
  on public.customer_notes
  for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from public.businesses b
      join public.customers c on c.business_id = b.id
      where b.id = customer_notes.business_id
        and c.id = customer_notes.customer_id
        and c.business_id = customer_notes.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.create_sale_with_customer(
  p_business_id uuid,
  p_sale_date timestamptz,
  p_customer_id uuid,
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
  v_customer_name text;
  v_customer_phone text;
  v_sale_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if p_customer_id is not null then
    select c.full_name, c.phone
    into v_customer_name, v_customer_phone
    from public.customers c
    join public.businesses b on b.id = c.business_id
    where c.id = p_customer_id
      and c.business_id = p_business_id
      and c.status <> 'archived'
      and b.owner_id = (select auth.uid());

    if not found then
      raise exception 'No encontramos un cliente activo para esta venta.';
    end if;
  end if;

  v_sale_id := public.create_sale_with_items(
    p_business_id,
    p_sale_date,
    coalesce(v_customer_name, p_customer_name),
    coalesce(v_customer_phone, p_customer_phone),
    p_customer_note,
    p_channel,
    p_discount_amount,
    p_shipping_amount,
    p_payment_status,
    p_paid_amount,
    p_payment_method,
    p_payment_reference,
    p_notes,
    p_items
  );

  if p_customer_id is not null then
    update public.sales
    set customer_id = p_customer_id
    where id = v_sale_id
      and business_id = p_business_id;

    if not found then
      raise exception 'No pudimos vincular el cliente a la venta.';
    end if;
  end if;

  return v_sale_id;
end;
$$;

create or replace function public.register_customer_payment(
  p_business_id uuid,
  p_customer_id uuid,
  p_sale_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_paid_at timestamptz,
  p_reference text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_payment_id uuid;
  v_sale record;
  v_new_paid numeric(14,2);
  v_new_balance numeric(14,2);
begin
  if (select auth.uid()) is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = (select auth.uid())
  ) then
    raise exception 'No tienes permiso para registrar abonos en este negocio.';
  end if;

  if not exists (
    select 1 from public.customers c
    where c.id = p_customer_id
      and c.business_id = p_business_id
      and c.status <> 'archived'
  ) then
    raise exception 'No encontramos el cliente.';
  end if;

  select s.*
  into v_sale
  from public.sales s
  where s.id = p_sale_id
    and s.business_id = p_business_id
    and s.customer_id = p_customer_id
  for update;

  if v_sale.id is null then
    raise exception 'No encontramos la venta pendiente del cliente.';
  end if;

  if v_sale.status = 'voided' then
    raise exception 'No puedes registrar abonos en una venta anulada.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El abono debe ser mayor que cero.';
  end if;

  if p_amount > v_sale.balance_due then
    raise exception 'El abono no puede superar el saldo pendiente.';
  end if;

  if p_payment_method not in ('cash','transfer','card','nequi','daviplata','other') then
    raise exception 'Selecciona un método de pago válido.';
  end if;

  insert into public.sale_payments (
    business_id, sale_id, amount, payment_method, paid_at, reference, notes
  )
  values (
    p_business_id, p_sale_id, round(p_amount, 2), p_payment_method,
    coalesce(p_paid_at, now()), nullif(trim(coalesce(p_reference, '')), ''),
    nullif(trim(coalesce(p_notes, '')), '')
  )
  returning id into v_payment_id;

  v_new_paid := round(v_sale.paid_amount + p_amount, 2);
  v_new_balance := greatest(round(v_sale.total_amount - v_new_paid, 2), 0);

  update public.sales
  set paid_amount = v_new_paid,
      balance_due = v_new_balance,
      payment_status = case when v_new_balance = 0 then 'paid' else 'partial' end
  where id = p_sale_id
    and business_id = p_business_id;

  return v_payment_id;
end;
$$;

revoke all on function public.create_sale_with_customer(
  uuid, timestamptz, uuid, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) from public;
revoke all on function public.create_sale_with_customer(
  uuid, timestamptz, uuid, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) from anon;
grant execute on function public.create_sale_with_customer(
  uuid, timestamptz, uuid, text, text, text, text, numeric, numeric, text, numeric, text, text, text, jsonb
) to authenticated;

revoke all on function public.register_customer_payment(
  uuid, uuid, uuid, numeric, text, timestamptz, text, text
) from public;
revoke all on function public.register_customer_payment(
  uuid, uuid, uuid, numeric, text, timestamptz, text, text
) from anon;
grant execute on function public.register_customer_payment(
  uuid, uuid, uuid, numeric, text, timestamptz, text, text
) to authenticated;

revoke all on function public.sync_sale_customer_snapshot() from public;
revoke all on function public.sync_sale_customer_snapshot() from anon;

notify pgrst, 'reload schema';

commit;
