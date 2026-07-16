# ProdXStore — Architecture & Deployment Guide

This document covers everything needed to run ProdXStore on your own
infrastructure using Vercel + Supabase. The backend runs entirely on
Supabase: Postgres (with Row Level Security), Supabase Auth, Supabase
Storage, and Edge Functions.

> For the history of how this app moved off Convex/Hercules onto Supabase,
> see [`SUPABASE_MIGRATION.md`](./SUPABASE_MIGRATION.md). This document
> describes the app as it exists today.

---

## Framework & Runtime Versions

| Component | Version |
|-----------|---------|
| Node.js | 22.x (required) |
| React | 19 |
| Vite | 7 |
| TypeScript | 5.9 |
| @supabase/supabase-js | 2.49 |
| React Router | 7 (declarative / SPA mode) |
| Tailwind CSS | 4 |

---

## 1. Install

```bash
npm install
```

---

## 2. Local Development Setup

### Step 1 — Create a Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Install the CLI (`npm i -g supabase`), then from the repo root:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
   (Or paste `supabase/migrations/00001_schema.sql` into the SQL Editor.)
3. For the review-request email scheduler, edit
   `supabase/migrations/00002_cron.sql` — replace `<PROJECT_REF>` and
   `<SERVICE_ROLE_KEY>` — then run it in the SQL Editor.

### Step 2 — Configure environment variables

```bash
cp .env.example .env
```

Fill in from **Project Settings → API**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

These are the only two variables the frontend needs. The anon key is safe to
ship to the client — access control is enforced by Postgres Row Level
Security, not by keeping this key secret.

### Step 3 — Set Edge Function secrets

```bash
supabase secrets set \
  RAZORPAY_KEY_ID=rzp_... \
  RAZORPAY_KEY_SECRET=... \
  RESEND_API_KEY=re_... \
  EMAIL_FROM="ProdXStore <orders@yourdomain.com>" \
  SITE_URL=https://yourdomain.com \
  OPENAI_API_KEY=sk-...
```

Notes:
- Razorpay keys can also be saved from **Admin → Settings → Razorpay**
  (stored in the `settings` table); env secrets take priority.
- Emails are sent via [Resend](https://resend.com). Without
  `RESEND_API_KEY`, functions log and skip emails instead of failing.
- AI review polish uses any OpenAI-compatible API (`OPENAI_BASE_URL` /
  `OPENAI_MODEL` optional; defaults to OpenAI + `gpt-4o-mini`).

### Step 4 — Deploy the Edge Functions

```bash
supabase functions deploy razorpay-create-order
supabase functions deploy razorpay-verify-payment
supabase functions deploy get-order-by-token
supabase functions deploy send-access-otp
supabase functions deploy verify-access-otp
supabase functions deploy send-delivery-email
supabase functions deploy process-review-emails
supabase functions deploy polish-review
supabase functions deploy generate-testimonials
```

### Step 5 — Start the frontend

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## 3. Authentication

### How it works

Authentication is Supabase Auth, email + password:

1. User submits email/password on `/admin` (login) or a signup flow.
2. `useAuthActions().signIn("password", { email, password, flow })` calls
   `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`.
3. A `public.profiles` row is auto-created for every new `auth.users` row via
   the `handle_new_user()` trigger (`supabase/migrations/00001_schema.sql`).
4. Session state is tracked via `supabase.auth.getSession()` +
   `supabase.auth.onAuthStateChange()`, wrapped by `useConvexAuth()` in
   `src/lib/api/hooks.ts` (the name is legacy — it is fully Supabase-backed).
5. `useCurrentUser()` (`src/hooks/use-auth.ts`) joins the session to the
   `profiles` row to get `name`/`email`/`role`.

### Route protection

`src/components/admin/require-admin.tsx` (`RequireAdmin`) wraps
`/admin/dashboard`: unauthenticated users are redirected to `/admin`,
authenticated non-admins to `/admin/unauthorized`.

### Admin role assignment

Roles live in `public.profiles.role` (`admin` | `super_admin` | `null` for a
regular user) and are **never trusted from the frontend** — every
role-gated read/write is enforced in Postgres via the `security definer`
functions `public.is_admin()` / `public.is_super_admin()`, which look up the
role from `auth.uid()` server-side. Only a `super_admin` can change a
profile's role (see the `"super admin manage roles"` RLS policy).

To create your first admin:

1. Supabase Dashboard → **Authentication → Users → Add user** (email +
   password, auto-confirm), or sign up through the app.
2. Grant the role in the SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Log in at `/admin`.

---

## 4. Razorpay Configuration

Razorpay keys are stored in two places (env secrets take priority):

1. **Edge Function secrets** — `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
   (see step 3 above)
2. **`public.settings` table** — set via Admin → Settings → Razorpay in the
   app UI, used as a fallback

`supabase/functions/razorpay-create-order` and
`supabase/functions/razorpay-verify-payment` handle order creation and HMAC
signature verification. **The order amount is recomputed server-side from
the `products` table** — it is never trusted from the client. The key
secret never reaches the frontend; only `keyId` is exposed (safe — it's the
public identifier used by the Razorpay checkout popup).

For testing, use `rzp_test_*` keys. For production, use `rzp_live_*` keys.

---

## 5. Email

Delivery emails, OTP emails, and review-request emails are sent via
[Resend](https://resend.com) from the relevant Edge Functions
(`send-delivery-email`, `send-access-otp`, `process-review-emails`). Review
request emails are scheduled through the `scheduled_review_emails` table and
a `pg_cron` job (`supabase/migrations/00002_cron.sql`) that invokes
`process-review-emails` on a timer.

Set `EMAIL_FROM` and `SITE_URL` as Edge Function secrets — `SITE_URL` is
used to build links (e.g. the thank-you page) inside outgoing emails.

---

## 6. File Storage

Files are stored in Supabase Storage buckets (defined in
`supabase/migrations/00001_schema.sql`):

| Bucket | Public | Purpose |
|--------|--------|---------|
| `product-images` | Yes | Product photos/screenshots |
| `review-media` | Yes | Buyer-uploaded review photos/videos |
| `delivery-files` | No | Paid digital deliverables |

`delivery-files` is private — buyers get time-limited access through the
`get-order-by-token` Edge Function (gated by a purchase token), never
through a direct client query. `product-images` and `delivery-files` writes
require `public.is_admin()`; anyone can upload to `review-media` (guests
leave reviews) but only admins can update/delete existing objects there.

---

## 7. Production Deployment to Vercel

### Step 1 — Vercel project setup

1. Push the repo to GitHub.
2. Import it in Vercel.
3. Build command: default (`npm run build`) — no special Vercel build step
   is required; the Supabase project and its Edge Functions are deployed
   independently via the Supabase CLI, not as part of the Vercel build.

### Step 2 — Vercel environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

**Never put `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`, `OPENAI_API_KEY`, or
any Supabase service-role key in Vercel.** Those are backend-only secrets
and must only live in Supabase Edge Function secrets
(`supabase secrets set ...`).

### Step 3 — Vercel SPA routing

This is a client-side SPA. `vercel.json` at the project root already
contains the required rewrite:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

This ensures direct URL access (e.g. `/product/ui-component-kit`) works
without a 404. There are no Vercel serverless API routes in this project —
all backend logic runs on Supabase Edge Functions, invoked client-side via
`supabase.functions.invoke()`.

---

## 8. Schema Reference

The authoritative schema is `supabase/migrations/00001_schema.sql`. Summary:

#### `profiles`
Mirrors `auth.users` 1:1 (`id` is the FK/PK). `role` is `admin` |
`super_admin` | `null`. Auto-populated by the `handle_new_user()` trigger on
signup.

#### `products`
`name`, `slug` (unique), `category`, `tagline`, `description`, `price`,
`original_price`, `badge`, `features`/`highlights`/`whats_included` (jsonb),
`image`, `screenshots` (jsonb), `upsell_product_ids` (jsonb).

#### `delivery_assets`
Per-product deliverables: `product_id`, `name`, `delivery_type`, `url`,
`storage_path`, `file_name`, `instructions`, `display_order`, `enabled`.
Admin-only access — buyers reach these via the `get-order-by-token` Edge
Function.

#### `orders`
`razorpay_order_id` (unique), `razorpay_payment_id`, `customer_name`,
`customer_email`, `customer_mobile`, `items` (jsonb), `amount_in_paise`,
`currency`, `promo_code`/`promo_discount`, `affiliate_code`, `status`
(`created`|`paid`|`failed`), `order_number`, `email_sent`,
`download_count`, `internal_notes`. Inserts/updates from client are
service-role only (via Edge Functions); admins can read/update/delete
through RLS.

#### `purchase_tokens` / `purchase_otps`
Support the post-purchase re-access flow (OTP email → token → download
link). No client-facing RLS policies — service role only, except admins can
read `purchase_tokens` for data export.

#### `coupons`
`code` (unique), `discount_type` (`percent`|`flat`), `discount_value`,
`usage_limit`/`usage_count`, `expires_at`, `min_order_value`, `enabled`.
Public can read enabled coupons; admin manages.

#### `affiliates`
`name`, `code` (unique), `email`, `visits`, `conversions`, `revenue_inr`,
`enabled`, `notes`. Admin only; visit/conversion counters are updated via
the `record_affiliate_visit` / `record_affiliate_conversion` RPCs.

#### `settings` (key-value store)
| Key | Default | Description |
|-----|---------|-------------|
| `fallback_exchange_rate` | `0.012` | INR → USD rate |
| `razorpay_key_id` | — | Razorpay public key (fallback) |
| `razorpay_key_secret` | — | Razorpay secret (fallback) |
| `review_email_enabled` | `true` | Review request emails |
| `review_request_delay_days` | `3` | Days to wait before sending review email |
| `review_min_length` | `20` | Min review body chars |
| `review_approval_mode` | `manual` | `manual` or `auto` |
| `review_ai_polish_enabled` | `true` | AI polish on reviews |
| `trust_money_back_days` | `30` | Days on money-back badge |
| `sp_enabled` | `false` | Social proof notifications |
| `sp_demoMode` | `false` | Demo mode |

Keys matching `razorpay%` are excluded from the public-read policy — only
admins can read them back.

#### `reviews`
Buyer reviews with moderation state (`pending`|`approved`|`rejected`|
`hidden`), verified-buyer flag, optional AI-polished title/body, and media
attachments. Inserted via the `submit_review` RPC (validates purchase token,
min length, media count); public reads only `approved` reviews.

#### `ai_testimonials`
Admin-curated synthetic testimonials (`review`|`whatsapp`|`email` type).
Generation is currently disabled for new entries (consumer-protection law);
existing entries remain manageable and display when `status = 'active'`.

#### `scheduled_review_emails`
Replaces Convex's `ctx.scheduler.runAfter` — one row per pending
review-request email, drained by `pg_cron` → `process-review-emails`.

---

## 9. Edge Functions

| Function | Purpose |
|----------|---------|
| `razorpay-create-order` | Create a Razorpay order; recomputes amount server-side |
| `razorpay-verify-payment` | HMAC-verify payment, mark order paid, trigger delivery email |
| `get-order-by-token` | Resolve a purchase token to order + delivery assets |
| `send-access-otp` / `verify-access-otp` | Post-purchase re-access via email OTP |
| `send-delivery-email` | Send the digital-delivery email for a paid order |
| `process-review-emails` | Cron-driven: sends due `scheduled_review_emails` |
| `polish-review` | AI polish of a submitted review (OpenAI-compatible) |
| `generate-testimonials` | Admin tool for managing AI testimonials |

Shared helpers live in `supabase/functions/_shared/utils.ts`.

---

## 10. Data Import (optional)

If migrating data from a prior deployment, use the Supabase Table Editor's
**Insert → Import data from CSV/JSON**, or `supabase db` tooling. Files must
be uploaded directly to the relevant Storage bucket
(`product-images` / `review-media` / `delivery-files`) — Storage objects are
not part of a table import.
