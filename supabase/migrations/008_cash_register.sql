-- Margenia cash register module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

do $$
begin
  if to_regclass('public.businesses') is null
    or to_regclass('public.sales') is null
    or to_regclass('public.sale_payments') is null then
    raise exception 'Antes de instalar Caja debes ejecutar Ventas.';
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
  if to_regclass('public.cash_session_number_seq') is null then
    create sequence public.cash_session_number_seq;
    comment on sequence public.cash_session_number_seq is 'created_by_008_cash_register';
  end if;

  if to_regclass('public.cash_movement_number_seq') is null then
    create sequence public.cash_movement_number_seq;
    comment on sequence public.cash_movement_number_seq is 'created_by_008_cash_register';
  end if;
end;
$$;

revoke all on sequence public.cash_session_number_seq from public;
revoke all on sequence public.cash_session_number_seq from anon;
revoke all on sequence public.cash_movement_number_seq from public;
revoke all on sequence public.cash_movement_number_seq from anon;
grant usage, select on sequence public.cash_session_number_seq to authenticated;
grant usage, select on sequence public.cash_movement_number_seq to authenticated;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_code text not null,
  status text not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by uuid,
  closed_by uuid,
  opening_cash_amount numeric(14,2) not null default 0,
  expected_cash_amount numeric(14,2) not null default 0,
  counted_cash_amount numeric(14,2),
  cash_difference_amount numeric(14,2),
  expected_total_amount numeric(14,2) not null default 0,
  counted_total_amount numeric(14,2),
  total_difference_amount numeric(14,2),
  opening_notes text,
  closing_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_sessions_id_business_id_unique unique (id, business_id),
  constraint cash_sessions_business_code_unique unique (business_id, session_code),
  constraint cash_sessions_code_not_blank check (length(trim(session_code)) > 0),
  constraint cash_sessions_status_check check (status in ('open','closed','voided')),
  constraint cash_sessions_amounts_check check (
    opening_cash_amount >= 0
    and expected_cash_amount >= 0
    and expected_total_amount >= 0
    and (counted_cash_amount is null or counted_cash_amount >= 0)
    and (counted_total_amount is null or counted_total_amount >= 0)
  )
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  session_id uuid not null,
  movement_code text not null,
  direction text not null,
  movement_type text not null,
  payment_method text not null,
  amount numeric(14,2) not null,
  category text,
  description text,
  occurred_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint cash_movements_session_business_fk
    foreign key (session_id, business_id)
    references public.cash_sessions(id, business_id)
    on delete cascade,
  constraint cash_movements_business_code_unique unique (business_id, movement_code),
  constraint cash_movements_code_not_blank check (length(trim(movement_code)) > 0),
  constraint cash_movements_amount_check check (amount > 0),
  constraint cash_movements_direction_check check (direction in ('in','out')),
  constraint cash_movements_type_check check (
    movement_type in ('manual_income','manual_expense','owner_withdrawal','supplier_payment','refund','adjustment','other')
  ),
  constraint cash_movements_method_check check (
    payment_method in ('cash','transfer','card','nequi','daviplata','other')
  )
);

create table if not exists public.cash_session_counts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  session_id uuid not null,
  payment_method text not null,
  expected_amount numeric(14,2) not null default 0,
  counted_amount numeric(14,2) not null default 0,
  difference_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  constraint cash_session_counts_session_business_fk
    foreign key (session_id, business_id)
    references public.cash_sessions(id, business_id)
    on delete cascade,
  constraint cash_session_counts_session_method_unique unique (session_id, payment_method),
  constraint cash_session_counts_amounts_check check (
    expected_amount >= 0 and counted_amount >= 0
  ),
  constraint cash_session_counts_method_check check (
    payment_method in ('cash','transfer','card','nequi','daviplata','other')
  )
);

create unique index if not exists cash_sessions_one_open_per_business_idx
  on public.cash_sessions(business_id)
  where status = 'open';

create index if not exists cash_sessions_business_id_idx on public.cash_sessions(business_id);
create index if not exists cash_sessions_business_status_idx on public.cash_sessions(business_id, status);
create index if not exists cash_sessions_business_opened_at_idx on public.cash_sessions(business_id, opened_at desc);
create index if not exists cash_sessions_business_session_code_idx on public.cash_sessions(business_id, session_code);

create index if not exists cash_movements_business_id_idx on public.cash_movements(business_id);
create index if not exists cash_movements_session_id_idx on public.cash_movements(session_id);
create index if not exists cash_movements_payment_method_idx on public.cash_movements(payment_method);
create index if not exists cash_movements_movement_type_idx on public.cash_movements(movement_type);
create index if not exists cash_movements_occurred_at_idx on public.cash_movements(occurred_at desc);

create index if not exists cash_session_counts_business_id_idx on public.cash_session_counts(business_id);
create index if not exists cash_session_counts_session_id_idx on public.cash_session_counts(session_id);
create index if not exists cash_session_counts_payment_method_idx on public.cash_session_counts(payment_method);

drop trigger if exists cash_sessions_set_updated_at on public.cash_sessions;
create trigger cash_sessions_set_updated_at
  before update on public.cash_sessions
  for each row execute function public.set_updated_at();

alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.cash_session_counts enable row level security;

revoke all on public.cash_sessions from public;
revoke all on public.cash_sessions from anon;
revoke all on public.cash_movements from public;
revoke all on public.cash_movements from anon;
revoke all on public.cash_session_counts from public;
revoke all on public.cash_session_counts from anon;

grant select, insert, update on public.cash_sessions to authenticated;
grant select, insert, update on public.cash_movements to authenticated;
grant select, insert on public.cash_session_counts to authenticated;

drop policy if exists "Users can view cash sessions for their businesses" on public.cash_sessions;
create policy "Users can view cash sessions for their businesses"
  on public.cash_sessions
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = cash_sessions.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert cash sessions for their businesses" on public.cash_sessions;
create policy "Users can insert cash sessions for their businesses"
  on public.cash_sessions
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = cash_sessions.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update cash sessions for their businesses" on public.cash_sessions;
create policy "Users can update cash sessions for their businesses"
  on public.cash_sessions
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = cash_sessions.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = cash_sessions.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view cash movements for their businesses" on public.cash_movements;
create policy "Users can view cash movements for their businesses"
  on public.cash_movements
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = cash_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert cash movements for their businesses" on public.cash_movements;
create policy "Users can insert cash movements for their businesses"
  on public.cash_movements
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = cash_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can update cash movements for their businesses" on public.cash_movements;
create policy "Users can update cash movements for their businesses"
  on public.cash_movements
  for update
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = cash_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = cash_movements.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can view cash session counts for their businesses" on public.cash_session_counts;
create policy "Users can view cash session counts for their businesses"
  on public.cash_session_counts
  for select
  to authenticated
  using (
    exists (
      select 1 from public.businesses b
      where b.id = cash_session_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users can insert cash session counts for their businesses" on public.cash_session_counts;
create policy "Users can insert cash session counts for their businesses"
  on public.cash_session_counts
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = cash_session_counts.business_id
        and b.owner_id = (select auth.uid())
    )
  );

create or replace function public.open_cash_session(
  p_business_id uuid,
  p_opening_cash_amount numeric,
  p_opening_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_session_id uuid;
  v_sequence bigint;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = v_user_id
  ) then
    raise exception 'No tienes permiso para abrir caja en este negocio.';
  end if;

  if coalesce(p_opening_cash_amount, 0) < 0 then
    raise exception 'El valor no puede ser negativo.';
  end if;

  if exists (
    select 1 from public.cash_sessions
    where business_id = p_business_id
      and status = 'open'
  ) then
    raise exception 'Ya existe una caja abierta para este negocio.';
  end if;

  v_sequence := nextval('public.cash_session_number_seq');

  insert into public.cash_sessions (
    business_id,
    session_code,
    opened_by,
    opening_cash_amount,
    expected_cash_amount,
    expected_total_amount,
    opening_notes
  )
  values (
    p_business_id,
    'C-' || extract(year from now())::int || '-' || lpad(v_sequence::text, 6, '0'),
    v_user_id,
    coalesce(p_opening_cash_amount, 0),
    coalesce(p_opening_cash_amount, 0),
    coalesce(p_opening_cash_amount, 0),
    nullif(trim(coalesce(p_opening_notes, '')), '')
  )
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function public.create_cash_movement(
  p_business_id uuid,
  p_session_id uuid,
  p_direction text,
  p_movement_type text,
  p_payment_method text,
  p_amount numeric,
  p_category text,
  p_description text,
  p_occurred_at timestamptz
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_movement_id uuid;
  v_sequence bigint;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = v_user_id
  ) then
    raise exception 'No tienes permiso para registrar movimientos en este negocio.';
  end if;

  if not exists (
    select 1 from public.cash_sessions cs
    where cs.id = p_session_id
      and cs.business_id = p_business_id
      and cs.status = 'open'
  ) then
    raise exception 'No hay caja abierta.';
  end if;

  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Ingresa el valor.';
  end if;

  if p_direction not in ('in','out') then
    raise exception 'Selecciona un tipo de movimiento.';
  end if;

  if p_movement_type not in ('manual_income','manual_expense','owner_withdrawal','supplier_payment','refund','adjustment','other') then
    raise exception 'Selecciona un motivo.';
  end if;

  if p_payment_method not in ('cash','transfer','card','nequi','daviplata','other') then
    raise exception 'Selecciona un método de pago.';
  end if;

  v_sequence := nextval('public.cash_movement_number_seq');

  insert into public.cash_movements (
    business_id,
    session_id,
    movement_code,
    direction,
    movement_type,
    payment_method,
    amount,
    category,
    description,
    occurred_at,
    created_by
  )
  values (
    p_business_id,
    p_session_id,
    'M-' || extract(year from now())::int || '-' || lpad(v_sequence::text, 6, '0'),
    p_direction,
    p_movement_type,
    p_payment_method,
    p_amount,
    nullif(trim(coalesce(p_category, '')), ''),
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_occurred_at, now()),
    v_user_id
  )
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

create or replace function public.close_cash_session(
  p_business_id uuid,
  p_session_id uuid,
  p_counts jsonb,
  p_closing_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_counted_cash numeric(14,2) := 0;
  v_counted_total numeric(14,2) := 0;
  v_expected_cash numeric(14,2) := 0;
  v_expected_total numeric(14,2) := 0;
  v_now timestamptz := now();
  v_opened_at timestamptz;
  v_opening_cash numeric(14,2);
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Usuario no autenticado.';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id
      and b.owner_id = v_user_id
  ) then
    raise exception 'No tienes permiso para cerrar caja en este negocio.';
  end if;

  select opened_at, opening_cash_amount
  into v_opened_at, v_opening_cash
  from public.cash_sessions
  where id = p_session_id
    and business_id = p_business_id
    and status = 'open'
  for update;

  if not found then
    raise exception 'Esta caja ya fue cerrada.';
  end if;

  if p_counts is null
    or jsonb_typeof(p_counts) <> 'array' then
    raise exception 'Ingresa los montos contados.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_counts) as c(payment_method text, counted_amount numeric)
    where c.payment_method not in ('cash','transfer','card','nequi','daviplata','other')
      or coalesce(c.counted_amount, 0) < 0
  ) then
    raise exception 'Selecciona un método de pago válido y montos no negativos.';
  end if;

  if exists (
    select 1
    from (
      select c.payment_method
      from jsonb_to_recordset(p_counts) as c(payment_method text, counted_amount numeric)
      group by c.payment_method
      having count(*) > 1
    ) duplicated
  ) then
    raise exception 'No puedes repetir el mismo método de pago en el cierre.';
  end if;

  with methods(payment_method) as (
    values ('cash'), ('transfer'), ('card'), ('nequi'), ('daviplata'), ('other')
  ),
  counted as (
    select
      c.payment_method,
      coalesce(c.counted_amount, 0)::numeric(14,2) as counted_amount
    from jsonb_to_recordset(p_counts) as c(payment_method text, counted_amount numeric)
  ),
  sales_paid as (
    select
      sp.payment_method,
      coalesce(sum(sp.amount), 0)::numeric(14,2) as amount
    from public.sale_payments sp
    join public.sales s on s.id = sp.sale_id and s.business_id = sp.business_id
    where sp.business_id = p_business_id
      and s.status = 'completed'
      and sp.paid_at >= v_opened_at
      and sp.paid_at <= v_now
    group by sp.payment_method
  ),
  manual_movements as (
    select
      cm.payment_method,
      coalesce(sum(case when cm.direction = 'in' then cm.amount else 0 end), 0)::numeric(14,2) as manual_in,
      coalesce(sum(case when cm.direction = 'out' then cm.amount else 0 end), 0)::numeric(14,2) as manual_out
    from public.cash_movements cm
    where cm.business_id = p_business_id
      and cm.session_id = p_session_id
    group by cm.payment_method
  ),
  calculated as (
    select
      m.payment_method,
      greatest(
        case when m.payment_method = 'cash' then coalesce(v_opening_cash, 0) else 0 end
        + coalesce(sp.amount, 0)
        + coalesce(mm.manual_in, 0)
        - coalesce(mm.manual_out, 0),
        0
      )::numeric(14,2) as expected_amount,
      coalesce(c.counted_amount, 0)::numeric(14,2) as counted_amount
    from methods m
    left join sales_paid sp on sp.payment_method = m.payment_method
    left join manual_movements mm on mm.payment_method = m.payment_method
    left join counted c on c.payment_method = m.payment_method
  ),
  inserted as (
    insert into public.cash_session_counts (
      business_id,
      session_id,
      payment_method,
      expected_amount,
      counted_amount,
      difference_amount
    )
    select
      p_business_id,
      p_session_id,
      payment_method,
      expected_amount,
      counted_amount,
      counted_amount - expected_amount
    from calculated
    returning payment_method, expected_amount, counted_amount
  )
  select
    coalesce(sum(expected_amount), 0)::numeric(14,2),
    coalesce(sum(counted_amount), 0)::numeric(14,2),
    coalesce(sum(expected_amount) filter (where payment_method = 'cash'), 0)::numeric(14,2),
    coalesce(sum(counted_amount) filter (where payment_method = 'cash'), 0)::numeric(14,2)
  into v_expected_total, v_counted_total, v_expected_cash, v_counted_cash
  from inserted;

  update public.cash_sessions
  set
    status = 'closed',
    closed_at = v_now,
    closed_by = v_user_id,
    expected_cash_amount = v_expected_cash,
    counted_cash_amount = v_counted_cash,
    cash_difference_amount = v_counted_cash - v_expected_cash,
    expected_total_amount = v_expected_total,
    counted_total_amount = v_counted_total,
    total_difference_amount = v_counted_total - v_expected_total,
    closing_notes = nullif(trim(coalesce(p_closing_notes, '')), '')
  where id = p_session_id
    and business_id = p_business_id
    and status = 'open';

  if not found then
    raise exception 'Esta caja ya fue cerrada.';
  end if;

  return p_session_id;
end;
$$;

revoke all on function public.open_cash_session(uuid, numeric, text) from public;
revoke all on function public.open_cash_session(uuid, numeric, text) from anon;
grant execute on function public.open_cash_session(uuid, numeric, text) to authenticated;

revoke all on function public.create_cash_movement(uuid, uuid, text, text, text, numeric, text, text, timestamptz) from public;
revoke all on function public.create_cash_movement(uuid, uuid, text, text, text, numeric, text, text, timestamptz) from anon;
grant execute on function public.create_cash_movement(uuid, uuid, text, text, text, numeric, text, text, timestamptz) to authenticated;

revoke all on function public.close_cash_session(uuid, uuid, jsonb, text) from public;
revoke all on function public.close_cash_session(uuid, uuid, jsonb, text) from anon;
grant execute on function public.close_cash_session(uuid, uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;
