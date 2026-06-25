-- Products catalog diagnostic checks.
-- Run manually in Supabase SQL Editor when you want to verify the catalog setup.
-- These queries are read-only and do not change data or schema.

select
  to_regclass('public.products') as products_table,
  to_regclass('public.product_variants') as variants_table;

select
  routine_name,
  data_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in (
    'create_product_with_variants',
    'update_product_with_variants'
  )
order by routine_name;

select
  proname,
  pg_get_function_identity_arguments(oid) as arguments
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'create_product_with_variants',
    'update_product_with_variants'
  )
order by proname;

select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('products', 'product_variants')
order by tablename;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('products', 'product_variants')
order by tablename, policyname;

select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('products', 'product_variants')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
