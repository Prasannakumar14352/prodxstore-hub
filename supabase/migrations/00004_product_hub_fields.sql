-- ═══════════════════════════════════════════════════════════════════════════
-- ProdXStore Hub is a product directory: each product's full experience
-- (checkout, delivery, SaaS/subscriptions, dashboards, etc.) lives on its
-- own external landing page. These columns let the Hub display a card and
-- redirect out to that landing page, without adding any commerce logic
-- here. Every column is either nullable or has a default, so existing rows
-- and the existing admin/public code paths keep working unchanged.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.products
  add column if not exists product_type          text not null default 'digital_product'
    check (product_type in (
      'digital_product', 'saas_application', 'ai_tool', 'course',
      'membership', 'service', 'bundle', 'external_product'
    )),
  add column if not exists status                text not null default 'published'
    check (status in ('draft', 'published', 'coming_soon', 'archived')),
  add column if not exists landing_page_url       text,
  add column if not exists cta_text               text not null default 'View Product',
  add column if not exists open_in_new_tab        boolean not null default true,
  add column if not exists featured               boolean not null default false,
  add column if not exists display_order          integer not null default 0,
  add column if not exists target_audience        text,
  add column if not exists product_logo           text,
  add column if not exists card_short_description text,
  add column if not exists price_label            text;

create index if not exists products_status_idx on public.products (status);
create index if not exists products_display_order_idx on public.products (display_order);

comment on column public.products.product_type is
  'Directory category of what the product is (not a payment/plan model).';
comment on column public.products.status is
  'draft/archived are hidden from the public Hub; coming_soon shows a badge.';
comment on column public.products.landing_page_url is
  'External URL for this product''s own landing page/checkout/app. When set, the Hub card and CTA link out here instead of the internal /product/:slug page.';
