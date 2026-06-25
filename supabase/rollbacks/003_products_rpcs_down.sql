begin;

drop function if exists public.create_product_with_variants(
  uuid, text, text, text, text, text, text, boolean, text, jsonb
);

drop function if exists public.update_product_with_variants(
  uuid, uuid, text, text, text, text, text, text, boolean, text, jsonb
);

notify pgrst, 'reload schema';

commit;
