-- ═══════════════════════════════════════════════════════════════════════════
-- Re-apply public.get_recent_purchases() — fixes PostgREST 404 on
-- POST /rest/v1/rpc/get_recent_purchases in production.
--
-- The function is already defined in 00001_schema.sql (used by the
-- social-proof-notifications feature via supabase.rpc("get_recent_purchases")
-- with no arguments). If POST /rest/v1/rpc/get_recent_purchases 404s in a
-- hosted project, the deployed database is missing this function (or
-- PostgREST's schema cache is stale) — this migration is idempotent
-- (create or replace) and safe to re-run against any current state.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.get_recent_purchases()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'firstName', split_part(trim(o.customer_name), ' ', 1),
    'location', null,
    'productName', coalesce(o.items->0->>'productName', 'a product'),
    'productImage', '',
    'purchasedAt', (extract(epoch from o.created_at) * 1000)::bigint,
    'isDemo', false
  ) order by o.created_at desc), '[]'::jsonb)
  from (select * from public.orders
        where status = 'paid' and created_at >= now() - interval '30 days'
        order by created_at desc limit 50) o;
$$;

-- Explicit grant (functions are PUBLIC-executable by default in Postgres,
-- but making this explicit removes any ambiguity for PostgREST's anon/
-- authenticated roles).
grant execute on function public.get_recent_purchases() to anon, authenticated;

-- Force PostgREST to pick up the (re)created function immediately instead
-- of waiting for its next automatic schema-cache refresh.
notify pgrst, 'reload schema';
