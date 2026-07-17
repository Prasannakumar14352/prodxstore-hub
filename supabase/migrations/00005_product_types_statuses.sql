-- ═══════════════════════════════════════════════════════════════════════════
-- Admin-manageable Product Types and Product Statuses.
--
-- Replaces the hard-coded `product_type`/`status` string enums with lookup
-- tables admins can extend from the UI. The existing `products.product_type`
-- / `products.status` TEXT columns are kept and stay in sync (written
-- alongside the new FK columns) so nothing that already reads them breaks;
-- new code (public visibility, CTA behavior) should read the FK'd lookup
-- row's `is_public`/`is_cta_enabled`/`is_purchasable` flags instead of
-- comparing status strings.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── product_types ────────────────────────────────────────────────────────────
create table if not exists public.product_types (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  icon          text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  is_system     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists product_types_slug_idx on public.product_types (slug);
create index if not exists product_types_is_active_idx on public.product_types (is_active);

-- ─── product_statuses ─────────────────────────────────────────────────────────
create table if not exists public.product_statuses (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  slug             text not null unique,
  description      text,
  badge_label      text,
  badge_variant    text,
  display_order    integer not null default 0,
  is_active        boolean not null default true,
  is_public        boolean not null default false,
  is_purchasable   boolean not null default false,
  is_cta_enabled   boolean not null default false,
  is_system        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists product_statuses_slug_idx on public.product_statuses (slug);
create index if not exists product_statuses_is_active_idx on public.product_statuses (is_active);

-- ─── Seed defaults (idempotent — safe to re-run) ──────────────────────────────
insert into public.product_types (name, slug, description, icon, display_order, is_active, is_system) values
  ('Digital Product',   'digital_product',   'Downloadable file, template, or asset',   'Package',     0, true, true),
  ('SaaS Application',  'saas_application',  'Hosted software product',                 'Layers',      1, true, true),
  ('AI Tool',           'ai_tool',           'AI-powered product or service',           'Sparkles',    2, true, false),
  ('Course',            'course',            'Educational course or training',          'BookOpen',    3, true, false),
  ('Membership',        'membership',        'Recurring membership or community',       'Users',       4, true, false),
  ('Service',           'service',           'Done-for-you or consulting service',      'Wrench',      5, true, false),
  ('Bundle',            'bundle',            'Multiple products sold together',         'Boxes',       6, true, false),
  ('External Product',  'external_product',  'Third-party product listed in the Hub',   'Globe',       7, true, false)
on conflict (slug) do nothing;

insert into public.product_statuses
  (name, slug, description, badge_label, badge_variant, display_order, is_active, is_public, is_purchasable, is_cta_enabled, is_system) values
  ('Draft',        'draft',        'Hidden while being prepared',            null,           'muted',   0, true, false, false, false, true),
  ('Published',    'published',    'Live and visible on the Hub',            null,           'primary', 1, true, true,  true,  true,  true),
  ('Coming Soon',  'coming_soon',  'Visible with a Coming Soon badge',       'Coming Soon',  'info',    2, true, true,  false, true,  true),
  ('Archived',     'archived',     'Retired and hidden from the Hub',        null,           'muted',   3, true, false, false, false, true)
on conflict (slug) do nothing;

-- ─── Link products to the lookup tables ───────────────────────────────────────
alter table public.products
  add column if not exists product_type_id   uuid references public.product_types(id),
  add column if not exists product_status_id uuid references public.product_statuses(id);

create index if not exists products_product_type_id_idx on public.products (product_type_id);
create index if not exists products_product_status_id_idx on public.products (product_status_id);

-- Backfill from the existing text columns (safe to re-run — only fills nulls)
update public.products p
set product_type_id = t.id
from public.product_types t
where p.product_type_id is null and t.slug = coalesce(p.product_type, 'digital_product');

update public.products p
set product_status_id = s.id
from public.product_statuses s
where p.product_status_id is null and s.slug = coalesce(p.status, 'published');

-- Anything that still didn't match (unexpected/legacy value) falls back to
-- the system defaults rather than being left unresolved.
update public.products p
set product_type_id = (select id from public.product_types where slug = 'digital_product')
where p.product_type_id is null;

update public.products p
set product_status_id = (select id from public.product_statuses where slug = 'draft')
where p.product_status_id is null;

-- ═══════════════════════════ Row Level Security ══════════════════════════════
alter table public.product_types    enable row level security;
alter table public.product_statuses enable row level security;

-- Public/anon can read all rows (no sensitive data here — the same "public
-- read" convention already used for public.products); only admins can write.
-- Visibility of *products* is governed by is_public on the assigned status,
-- not by restricting who can read the lookup tables themselves — an
-- inactive status must still be readable so existing products using it
-- resolve correctly.
create policy "public read" on public.product_types for select using (true);
create policy "admin write" on public.product_types for all
  using (public.is_admin()) with check (public.is_admin());

create policy "public read" on public.product_statuses for select using (true);
create policy "admin write" on public.product_statuses for all
  using (public.is_admin()) with check (public.is_admin());
