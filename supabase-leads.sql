create table if not exists beauty_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  instagram text,
  sells text not null,
  control_method text not null,
  wants_beta text not null,
  intent text default 'lista_espera',
  created_at timestamptz default now()
);

alter table beauty_leads
add column if not exists intent text default 'lista_espera';
