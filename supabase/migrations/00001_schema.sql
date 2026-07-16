-- ═══════════════════════════════════════════════════════════════════════════
-- ProdXStore — Supabase schema (migrated from Convex)
-- Apply with: supabase db push  (or paste into the SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Profiles (replaces Convex users table; auth.users owns identity) ────────
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  email      text,
  image      text,
  role       text check (role in ('admin','super_admin')),
  created_at timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data->>'name', new.email);
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role in ('admin','super_admin'));
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'super_admin');
$$;

-- ─── Products ────────────────────────────────────────────────────────────────
create table public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  slug               text not null unique,
  category           text not null,
  tagline            text not null,
  description        text not null,
  price              numeric not null,
  original_price     numeric not null,
  badge              text,
  features           jsonb not null default '[]',
  highlights         jsonb not null default '[]',
  whats_included     jsonb not null default '[]',
  image              text not null,
  screenshots        jsonb not null default '[]',
  upsell_product_ids jsonb,
  created_at         timestamptz not null default now()
);

-- ─── Delivery Assets ─────────────────────────────────────────────────────────
create table public.delivery_assets (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  name          text not null,
  delivery_type text not null,
  url           text not null default '',
  storage_path  text,                 -- Supabase Storage object path (was storageId)
  file_name     text,
  instructions  text,
  display_order int not null default 0,
  enabled       boolean not null default true,
  created_at    timestamptz not null default now()
);
create index delivery_assets_product_idx on public.delivery_assets (product_id);

-- ─── Orders ──────────────────────────────────────────────────────────────────
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  customer_name       text not null,
  customer_email      text not null,
  customer_mobile     text,
  items               jsonb not null,
  amount_in_paise     bigint not null,
  currency            text not null default 'INR',
  promo_code          text,
  promo_discount      numeric,
  affiliate_code      text,
  status              text not null default 'created'
                        check (status in ('created','paid','failed')),
  order_number        text,
  email_sent          boolean default false,
  download_count      int default 0,
  internal_notes      text,
  created_at          timestamptz not null default now()
);
create index orders_status_idx on public.orders (status);
create index orders_email_idx  on public.orders (customer_email);

-- ─── Purchase Tokens ─────────────────────────────────────────────────────────
create table public.purchase_tokens (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  token      text not null unique,
  created_at timestamptz not null default now()
);
create index purchase_tokens_order_idx on public.purchase_tokens (order_id);

-- ─── Purchase OTPs ───────────────────────────────────────────────────────────
create table public.purchase_otps (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  order_number text not null,
  otp_hash     text not null,
  expires_at   timestamptz not null,
  verified     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index purchase_otps_email_order_idx on public.purchase_otps (email, order_number);

-- ─── Coupons ─────────────────────────────────────────────────────────────────
create table public.coupons (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  discount_type   text not null check (discount_type in ('percent','flat')),
  discount_value  numeric not null,
  usage_limit     int,
  usage_count     int not null default 0,
  expires_at      text,               -- ISO 8601 string (matches Convex data)
  min_order_value numeric,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ─── Affiliates ──────────────────────────────────────────────────────────────
create table public.affiliates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  email       text,
  visits      int not null default 0,
  conversions int not null default 0,
  revenue_inr numeric not null default 0,
  enabled     boolean not null default true,
  notes       text,
  created_at  timestamptz not null default now()
);

-- ─── Settings (key-value) ────────────────────────────────────────────────────
create table public.settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.upsert_setting(p_key text, p_value text)
returns void language sql security definer set search_path = public as $$
  insert into public.settings (key, value) values (p_key, p_value)
  on conflict (key) do update set value = excluded.value, updated_at = now();
$$;
revoke execute on function public.upsert_setting from anon, authenticated;

-- Admin-callable wrapper
create or replace function public.admin_set_setting(p_key text, p_value text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  perform public.upsert_setting(p_key, p_value);
end; $$;

-- ─── Reviews ─────────────────────────────────────────────────────────────────
create table public.reviews (
  id                uuid primary key default gen_random_uuid(),
  product_id        uuid not null references public.products(id) on delete cascade,
  order_id          uuid references public.orders(id) on delete set null,
  order_number      text,
  customer_name     text not null,
  customer_email    text not null default '',
  rating            int not null check (rating between 1 and 5),
  title             text,
  body              text not null,
  status            text not null default 'pending'
                      check (status in ('pending','approved','rejected','hidden')),
  is_verified_buyer boolean not null default false,
  is_featured       boolean default false,
  helpful           int default 0,
  ai_title          text,
  ai_body           text,
  ai_category       text,
  ai_spam_score     numeric,
  ai_processed      boolean default false,
  review_token      text unique,
  review_token_used boolean default false,
  media_paths       jsonb default '[]',
  media_types       jsonb default '[]',
  media_labels      jsonb default '[]',
  created_at        timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id);
create index reviews_status_idx  on public.reviews (status);

-- ─── AI Testimonials ─────────────────────────────────────────────────────────
create table public.ai_testimonials (
  id                      uuid primary key default gen_random_uuid(),
  product_id              uuid not null references public.products(id) on delete cascade,
  product_name            text not null,
  product_slug            text not null,
  type                    text not null check (type in ('review','whatsapp','email')),
  reviewer_name           text,
  reviewer_initials       text,
  reviewer_role           text,
  rating                  int,
  review_title            text,
  review_body             text,
  whatsapp_buyer_name     text,
  whatsapp_buyer_initials text,
  whatsapp_messages       jsonb,
  email_sender            text,
  email_initials          text,
  email_subject           text,
  email_body              text,
  status                  text not null default 'active' check (status in ('active','hidden')),
  display_order           double precision,
  created_at              timestamptz not null default now()
);
create index ai_testimonials_product_idx on public.ai_testimonials (product_id);
create index ai_testimonials_status_idx  on public.ai_testimonials (status);

-- ─── Scheduled review-request emails (replaces ctx.scheduler.runAfter) ───────
create table public.scheduled_review_emails (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders(id) on delete cascade,
  send_at    timestamptz not null,
  sent       boolean not null default false,
  created_at timestamptz not null default now()
);
create index scheduled_review_emails_due_idx on public.scheduled_review_emails (sent, send_at);

-- ═══════════════════════════ Row Level Security ══════════════════════════════

alter table public.profiles                enable row level security;
alter table public.products                enable row level security;
alter table public.delivery_assets         enable row level security;
alter table public.orders                  enable row level security;
alter table public.purchase_tokens         enable row level security;
alter table public.purchase_otps           enable row level security;
alter table public.coupons                 enable row level security;
alter table public.affiliates              enable row level security;
alter table public.settings                enable row level security;
alter table public.reviews                 enable row level security;
alter table public.ai_testimonials         enable row level security;
alter table public.scheduled_review_emails enable row level security;

-- profiles
create policy "own or admin read" on public.profiles for select
  using (auth.uid() = id or public.is_admin());
create policy "super admin manage roles" on public.profiles for update
  using (public.is_super_admin()) with check (public.is_super_admin());

-- products: public read, admin write
create policy "public read" on public.products for select using (true);
create policy "admin write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- delivery assets: admin only (buyers get them via the get-order-by-token function)
create policy "admin all" on public.delivery_assets for all
  using (public.is_admin()) with check (public.is_admin());

-- orders: admin read/update/delete; inserts happen via Edge Functions (service role)
create policy "admin read"   on public.orders for select using (public.is_admin());
create policy "admin update" on public.orders for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.orders for delete using (public.is_admin());

-- purchase tokens: admin read (data export); everything else via service role
create policy "admin read" on public.purchase_tokens for select using (public.is_admin());
-- purchase_otps + scheduled_review_emails: no client policies (service role only)

-- coupons: public can read enabled coupons (checkout offers); admin full control
create policy "public read enabled" on public.coupons for select
  using (enabled = true or public.is_admin());
create policy "admin write" on public.coupons for insert with check (public.is_admin());
create policy "admin update" on public.coupons for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.coupons for delete using (public.is_admin());

-- affiliates: admin only (visits recorded via RPC)
create policy "admin all" on public.affiliates for all
  using (public.is_admin()) with check (public.is_admin());

-- settings: public read except razorpay creds; writes via admin_set_setting RPC
create policy "public read safe keys" on public.settings for select
  using (key not like 'razorpay%' or public.is_admin());

-- reviews: public read approved; admin everything; inserts via submit_review RPC
create policy "public read approved" on public.reviews for select
  using (status = 'approved' or public.is_admin());
create policy "admin update" on public.reviews for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.reviews for delete using (public.is_admin());

-- ai testimonials: public read active; admin write
create policy "public read active" on public.ai_testimonials for select
  using (status = 'active' or public.is_admin());
create policy "admin write" on public.ai_testimonials for insert with check (public.is_admin());
create policy "admin update" on public.ai_testimonials for update
  using (public.is_admin()) with check (public.is_admin());
create policy "admin delete" on public.ai_testimonials for delete using (public.is_admin());

-- ═══════════════════════════ Public RPCs ═════════════════════════════════════

-- Coupon validation (checkout)
create or replace function public.validate_coupon(p_code text, p_cart_total numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c public.coupons%rowtype; discount numeric;
begin
  select * into c from public.coupons where code = upper(trim(p_code)) and enabled;
  if not found then
    return jsonb_build_object('valid', false, 'error', 'Invalid coupon code.');
  end if;
  if c.expires_at is not null and c.expires_at < to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') then
    return jsonb_build_object('valid', false, 'error', 'This coupon has expired.');
  end if;
  if c.usage_limit is not null and c.usage_count >= c.usage_limit then
    return jsonb_build_object('valid', false, 'error', 'This coupon has reached its usage limit.');
  end if;
  if c.min_order_value is not null and p_cart_total < c.min_order_value then
    return jsonb_build_object('valid', false, 'error',
      'Minimum order value of ₹' || c.min_order_value || ' required for this coupon.');
  end if;
  discount := case when c.discount_type = 'percent'
                   then round(p_cart_total * c.discount_value / 100.0, 2)
                   else least(c.discount_value, p_cart_total) end;
  return jsonb_build_object(
    'valid', true,
    'discountType', c.discount_type,
    'discountValue', c.discount_value,
    'discountAmountInr', discount,
    'message', 'Coupon ' || c.code || ' applied!');
end; $$;

create or replace function public.increment_coupon_usage(p_code text)
returns void language sql security definer set search_path = public as $$
  update public.coupons set usage_count = usage_count + 1 where code = p_code;
$$;
revoke execute on function public.increment_coupon_usage from anon, authenticated;

-- Affiliate tracking
create or replace function public.record_affiliate_visit(p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare updated int;
begin
  update public.affiliates set visits = visits + 1 where code = p_code and enabled;
  get diagnostics updated = row_count;
  return updated > 0;
end; $$;

create or replace function public.record_affiliate_conversion(p_code text, p_revenue numeric)
returns void language sql security definer set search_path = public as $$
  update public.affiliates
  set conversions = conversions + 1, revenue_inr = revenue_inr + p_revenue
  where code = p_code and enabled;
$$;
revoke execute on function public.record_affiliate_conversion from anon, authenticated;

-- Buyer counts (public trust badges / storefront sorting)
create or replace function public.get_product_buyer_count(p_product_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from public.orders o
  where o.status = 'paid'
    and exists (select 1 from jsonb_array_elements(o.items) i
                where i->>'productId' = p_product_id::text);
$$;

create or replace function public.get_all_product_buyer_counts()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(pid, cnt), '{}'::jsonb) from (
    select i->>'productId' as pid, count(*) as cnt
    from public.orders o, jsonb_array_elements(o.items) i
    where o.status = 'paid'
    group by 1
  ) t;
$$;

-- Social proof: privacy-safe recent purchases (first name only)
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

-- Public review submission (validates purchase token, settings, min length)
create or replace function public.submit_review(
  p_product_id uuid, p_customer_name text, p_customer_email text,
  p_rating int, p_title text, p_body text, p_order_token text,
  p_media_paths jsonb default '[]', p_media_types jsonb default '[]',
  p_media_labels jsonb default '[]'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_min_length int; v_approval text; v_order public.orders%rowtype;
  v_order_id uuid; v_order_number text; v_verified boolean := false;
  v_email text := trim(coalesce(p_customer_email, ''));
  v_body text := trim(p_body); v_name text := trim(p_customer_name);
  v_review_id uuid;
begin
  if v_name = '' then raise exception 'Please enter your name.'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Please select a rating between 1 and 5 stars.'; end if;

  select coalesce(nullif(value, '')::int, 20) into v_min_length
  from public.settings where key = 'review_min_length';
  v_min_length := coalesce(v_min_length, 20);
  if length(v_body) < v_min_length then
    raise exception 'Your review must be at least % characters long.', v_min_length;
  end if;
  if jsonb_array_length(coalesce(p_media_paths, '[]')) > 5 then
    raise exception 'Maximum 5 media files allowed per review.';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Product not found.';
  end if;

  if p_order_token is not null and p_order_token <> '' then
    select o.* into v_order
    from public.purchase_tokens t join public.orders o on o.id = t.order_id
    where t.token = p_order_token and o.status = 'paid';
    if found and exists (select 1 from jsonb_array_elements(v_order.items) i
                         where i->>'productId' = p_product_id::text) then
      v_order_id := v_order.id;
      v_order_number := v_order.order_number;
      v_verified := true;
      if v_email = '' then v_email := v_order.customer_email; end if;
    end if;
  end if;

  select coalesce(value, 'manual') into v_approval
  from public.settings where key = 'review_approval_mode';

  insert into public.reviews (
    product_id, order_id, order_number, customer_name, customer_email,
    rating, title, body, status, is_verified_buyer, is_featured, helpful,
    review_token, review_token_used, media_paths, media_types, media_labels
  ) values (
    p_product_id, v_order_id, v_order_number, v_name, v_email,
    p_rating, nullif(trim(coalesce(p_title,'')), ''), v_body,
    case when v_approval = 'auto' then 'approved' else 'pending' end,
    v_verified, false, 0,
    encode(gen_random_bytes(8), 'hex'), false,
    coalesce(p_media_paths, '[]'), coalesce(p_media_types, '[]'), coalesce(p_media_labels, '[]')
  ) returning id into v_review_id;

  return jsonb_build_object('reviewId', v_review_id);
end; $$;

-- Public: mark a review helpful
create or replace function public.mark_review_helpful(p_review_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update public.reviews set helpful = coalesce(helpful, 0) + 1
  where id = p_review_id returning helpful into v;
  if not found then raise exception 'Review not found.'; end if;
  return jsonb_build_object('helpful', v);
end; $$;

-- ═══════════════════════════ Storage buckets ═════════════════════════════════

insert into storage.buckets (id, name, public) values
  ('product-images', 'product-images', true),
  ('review-media',   'review-media',   true),
  ('delivery-files', 'delivery-files', false)
on conflict (id) do nothing;

-- Admins manage product images & delivery files
create policy "admin manage product images" on storage.objects for all
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "admin manage delivery files" on storage.objects for all
  using (bucket_id = 'delivery-files' and public.is_admin())
  with check (bucket_id = 'delivery-files' and public.is_admin());

-- Anyone can upload review media (guests leave reviews); nobody can overwrite
create policy "public upload review media" on storage.objects for insert
  with check (bucket_id = 'review-media');
create policy "admin manage review media" on storage.objects for update
  using (bucket_id = 'review-media' and public.is_admin());
create policy "admin delete review media" on storage.objects for delete
  using (bucket_id = 'review-media' and public.is_admin());
