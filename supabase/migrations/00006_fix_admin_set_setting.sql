-- ═══════════════════════════════════════════════════════════════════════════
-- Re-apply public.admin_set_setting(p_key text, p_value text) — fixes
-- PostgREST 404 on POST /rest/v1/rpc/admin_set_setting in production.
--
-- The function is already defined in 00001_schema.sql (used by
-- src/lib/api/index.ts's setSetting() via
-- supabase.rpc("admin_set_setting", { p_key, p_value })). If this 404s in a
-- hosted project, the deployed database is missing it (or PostgREST's
-- schema cache is stale) — same class of issue as get_recent_purchases in
-- 00003_get_recent_purchases.sql. This migration is idempotent
-- (create or replace) and safe to re-run against any current state.
--
-- public.settings columns (verified against 00001_schema.sql, not guessed):
--   key text primary key, value text not null, updated_at timestamptz not null default now()
-- ═══════════════════════════════════════════════════════════════════════════

-- Internal upsert — only ever called from admin_set_setting below, never
-- directly by the frontend.
create or replace function public.upsert_setting(p_key text, p_value text)
returns void language sql security definer set search_path = public as $$
  insert into public.settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
$$;
revoke execute on function public.upsert_setting(text, text) from public, anon, authenticated;

-- Public-facing RPC: restricted to authenticated users whose
-- public.profiles.role is 'admin' or 'super_admin' (public.is_admin()
-- resolves this server-side from auth.uid() — never trusts anything the
-- client asserts about its own role).
create or replace function public.admin_set_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  perform public.upsert_setting(p_key, p_value);
end; $$;

-- Explicit grant/revoke: only signed-in users may even attempt the call —
-- admin_set_setting's own is_admin() check is what actually enforces the
-- role restriction. Anonymous visitors are blocked outright.
revoke all on function public.admin_set_setting(text, text) from public;
revoke execute on function public.admin_set_setting(text, text) from anon;
grant execute on function public.admin_set_setting(text, text) to authenticated;

-- Force PostgREST to pick up the (re)created functions immediately instead
-- of waiting for its next automatic schema-cache refresh.
notify pgrst, 'reload schema';
