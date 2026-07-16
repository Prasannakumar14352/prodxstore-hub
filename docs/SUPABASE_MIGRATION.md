# Convex → Supabase Migration Guide

The app now runs entirely on Supabase: Postgres (with Row Level Security), Supabase Auth, Supabase Storage, and Edge Functions. The frontend talks to it through `src/lib/api/`, which keeps the old `api.module.fn` + `useQuery`/`useMutation` shape, so components are unchanged apart from imports.

## 1. Create the project & apply the schema

1. Create a project at https://supabase.com/dashboard.
2. Install the CLI (`npm i -g supabase`), then from the repo root:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
   (Or paste `supabase/migrations/00001_schema.sql` into the SQL Editor.)
3. For the review-request email scheduler, edit `supabase/migrations/00002_cron.sql` — replace `<PROJECT_REF>` and `<SERVICE_ROLE_KEY>` — then run it in the SQL Editor.

## 2. Frontend environment

Copy `.env.example` to `.env` and fill in from **Project Settings → API**:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Then `npm install` and `npm run dev`.

## 3. Edge Function secrets

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
- Razorpay keys can also be saved from **Admin → Settings → Razorpay** (stored in the `settings` table); env secrets take priority.
- Emails use [Resend](https://resend.com) (replacing the Hercules SDK). Without `RESEND_API_KEY`, functions log and skip emails instead of failing.
- AI review polish uses any OpenAI-compatible API (`OPENAI_BASE_URL` / `OPENAI_MODEL` optional; defaults to OpenAI + `gpt-4o-mini`).

## 4. Deploy the Edge Functions

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

## 5. Recreate the admin account

Convex Auth password hashes can't be moved, so register a fresh admin:

1. In the Supabase Dashboard → **Authentication → Users → Add user** (email + password, auto-confirm), or sign up via the app if you add a signup flow.
2. Grant the role in the SQL Editor:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Log in at `/admin`.

## 6. Import your existing data (optional)

Use the JSON from the old **Admin → Data Export** panel. Field names change camelCase → snake_case and `_id`/`_creationTime` → `id`/`created_at`; the Supabase **Table Editor → Insert → Import data from CSV/JSON** handles most of it after renaming columns. Files stored in Convex File Storage must be re-uploaded to the `product-images`, `review-media`, or `delivery-files` buckets.

## What changed under the hood

| Concern | Before (Convex) | After (Supabase) |
|---|---|---|
| Database | Convex documents | Postgres + RLS policies |
| Auth | Convex Auth (password) | Supabase Auth |
| Files | Convex File Storage | Storage buckets (`product-images`, `review-media`, `delivery-files`) |
| Server logic | Convex mutations/actions | RLS + SQL RPCs + 9 Edge Functions |
| Scheduled emails | `ctx.scheduler.runAfter` | `scheduled_review_emails` table + pg_cron → `process-review-emails` |
| Payment amount | trusted client total | **recomputed server-side** (security fix) |
| AI testimonials | generated fake reviews | generation disabled (consumer-protection law); existing entries still display & are manageable |
