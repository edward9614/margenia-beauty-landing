-- Rollback for Margenia combos module.
-- Run manually in Supabase SQL Editor after reviewing.

begin;

drop function if exists public.create_combo_with_items(
  uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
);

drop function if exists public.update_combo_with_items(
  uuid, uuid, text, text, text, numeric, numeric, numeric, numeric, numeric, text, jsonb
);

drop policy if exists "Users can view combo items for their businesses" on public.combo_items;
drop policy if exists "Users can insert combo items for their businesses" on public.combo_items;
drop policy if exists "Users can update combo items for their businesses" on public.combo_items;

drop policy if exists "Users can view combos for their businesses" on public.combos;
drop policy if exists "Users can insert combos for their businesses" on public.combos;
drop policy if exists "Users can update combos for their businesses" on public.combos;

drop trigger if exists combo_items_set_updated_at on public.combo_items;
drop trigger if exists combos_set_updated_at on public.combos;

drop table if exists public.combo_items;
drop table if exists public.combos;

notify pgrst, 'reload schema';

commit;
