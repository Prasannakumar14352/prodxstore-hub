# ProdXStore — Migration & Deployment Guide

This document covers everything needed to run ProdXStore outside of the
Hercules platform — on your own infrastructure using Vercel + Convex.

---

## Framework & Runtime Versions

| Component | Version |
|-----------|---------|
| Node.js | 22.x (required) |
| React | 19 |
| Vite | 7 |
| TypeScript | 5.9 |
| Convex | 1.42 |
| React Router | 7 (declarative / SPA mode) |
| Tailwind CSS | 4 |

---

## 1. Install

```bash
npm install
```

> Uses `pnpm` in the Hercules environment. Outside Hercules, `npm` or `pnpm`
> both work. The lockfile is `pnpm-lock.yaml` — if using `npm`, delete it and
> run `npm install` to generate `package-lock.json`.

---

## 2. Hercules-Specific Packages to Replace

These packages are Hercules platform packages. They work on Hercules but will
not resolve outside it without substitutes.

| Package | Used for | Replacement path |
|---------|----------|-----------------|
| `@usehercules/auth` | OIDC auth hooks (`useAuth`, `signinRedirect`) | Any OIDC-compatible library: `react-oidc-context` directly, Clerk, Auth0, WorkOS |
| `@usehercules/sdk` | Email sending (`hercules.email.send`) in `convex/email.ts` | Resend, SendGrid, Postmark, Nodemailer |
| `@usehercules/vite` | Vite plugin (HMR, proxy) in `vite.config.ts` | Remove the plugin; standard Vite works fine |

### Replacing `@usehercules/vite` (simplest step)

In `vite.config.ts`, remove the import and the `hercules()` plugin call:

```ts
// BEFORE
import hercules from "@usehercules/vite";
plugins: [react(), tailwindcss(), hercules()],

// AFTER
plugins: [react(), tailwindcss()],
```

### Replacing `@usehercules/auth`

`convex/auth.config.ts` uses `HERCULES_OIDC_AUTHORITY` and
`HERCULES_OIDC_CLIENT_ID`. These map directly to any OIDC provider's
`domain` and `applicationID`. Update them to your provider's values.

The frontend hook at `src/hooks/use-auth.ts` re-exports from
`@usehercules/auth/react`. Replace it with `react-oidc-context` or your
chosen provider's React hooks.

### Replacing `@usehercules/sdk` email

In `convex/email.ts`, replace:

```ts
import { Hercules } from "@usehercules/sdk";
const hercules = new Hercules({ apiKey: process.env.HERCULES_API_KEY! ... });
await hercules.email.send({ from, to, subject, html, text });
```

With your provider. Example using Resend:

```ts
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY!);
await resend.emails.send({ from, to, subject, html, text });
```

---

## 3. Local Development Setup

### Step 1 — Create `.env.local`

```bash
cp .env.example .env.local
```

Fill in all values. See `.env.example` for descriptions.

### Step 2 — Connect Convex

If using your existing Convex project:

```bash
npx convex dev --configure existing
```

Select your project when prompted. This writes `CONVEX_DEPLOYMENT` to
`.env.local` and starts the Convex dev server.

To create a new Convex project:

```bash
npx convex dev --configure new
```

### Step 3 — Set Convex environment variables

In the Convex Dashboard (`dashboard.convex.dev`):
1. Open your project
2. Go to **Settings → Environment Variables**
3. Add:
   - `HERCULES_OIDC_AUTHORITY` (or your OIDC authority URL)
   - `HERCULES_OIDC_CLIENT_ID`
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - `HERCULES_API_KEY` (or your email provider key)

### Step 4 — Start the frontend

In a second terminal:

```bash
npm run dev
```

The app runs at `http://localhost:5173`.

---

## 4. Authentication Configuration

### How it works

Authentication uses OpenID Connect (OIDC). The flow is:

1. User clicks Sign In → redirected to the OIDC provider
2. Provider authenticates the user and redirects to `/auth/callback`
3. `src/pages/auth/Callback.tsx` processes the callback and syncs the user
   to the Convex `users` table via `api.users.updateCurrentUser`
4. User's `tokenIdentifier` is stored as `{issuer}|{subject}` — this is the
   stable, globally unique user identifier used throughout the backend

### On Hercules

- Authority: automatically set to `https://{app-id}.hercules-auth.com`
- `convex/auth.config.ts` reads `HERCULES_OIDC_AUTHORITY` and
  `HERCULES_OIDC_CLIENT_ID` from the Convex environment

### On your own deployment

Replace the authority/client values in Convex environment variables with
your OIDC provider's values. The `convex/auth.config.ts` file does not need
to change — it reads from environment variables.

**Do not edit `src/pages/auth/Callback.tsx`**. It handles the OIDC callback
and user sync. If you switch auth libraries, update `src/hooks/use-auth.ts`
and `src/components/ui/signin.tsx` instead.

### Admin role assignment

User roles are stored in the `users` table (`role: "user" | "admin" | "super_admin"`).
The first time you deploy to a new Convex project, assign yourself admin via
the Convex Dashboard → Data → `users` table → find your record → set
`role` to `"admin"`.

---

## 5. Razorpay Configuration

Razorpay keys are stored in two places (Convex DB takes priority over env vars):

1. **Convex DB** — set via Admin → Settings → Razorpay in the app UI
2. **Convex environment variables** — `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
   as a fallback

The backend (`convex/razorpay.ts`) calls `internal.settings.getRazorpayKeysInternal`
which checks the DB first, then env vars.

**The key secret is never sent to the frontend.** Only `keyId` is exposed
(this is safe — it's the public identifier used in the Razorpay checkout popup).

For testing, use `rzp_test_*` keys. For production, use `rzp_live_*` keys.

---

## 6. Email Configuration

Delivery emails, OTP emails, and review request emails are sent from
`convex/email.ts` via the Hercules SDK.

### On your own deployment

Replace the SDK call with your email provider. The `FROM` address and HTML
template are defined in `convex/email.ts`. The `sendDeliveryEmailByOrderId`
and `sendOtpEmail` internal actions are the main entry points.

The `VITE_CONVEX_URL` variable is used to build the thank-you page link inside
emails. Outside Hercules, set `VITE_APP_URL` to your production domain and
update the URL construction logic in `sendDeliveryEmailByOrderId`.

---

## 7. Convex File Storage

Paid delivery files are stored in Convex File Storage (not public URLs).
`convex/storage.ts` provides:

- `generateUploadUrl` — admin file upload
- `generateReviewMediaUploadUrl` — buyer review media upload (gated by purchase token)
- `resolveStorageUrl` / `getUrl` — generate time-limited serving URLs

Convex Storage works identically on any Convex deployment — no changes needed.

---

## 8. Production Deployment to Vercel

### Step 1 — Vercel project setup

1. Push the repo to GitHub
2. Import it in Vercel
3. Set build command and environment variables (see below)

### Step 2 — Build command

```
npx convex deploy --cmd "npm run build"
```

This deploys Convex functions first, then builds the Vite frontend. Use this
as the Vercel build command.

### Step 3 — Vercel environment variables

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `CONVEX_DEPLOY_KEY` | From Convex Dashboard → Settings → Deploy Keys |
| `VITE_CONVEX_URL` | `https://your-project.convex.cloud` |
| `VITE_HERCULES_OIDC_AUTHORITY` | Your OIDC provider authority URL |
| `VITE_HERCULES_OIDC_CLIENT_ID` | Your OIDC client ID |
| `VITE_APP_URL` | Your Vercel production URL |

**Do NOT put `RAZORPAY_KEY_SECRET` or `HERCULES_API_KEY` in Vercel.**
Those are backend-only secrets and must only be in Convex Dashboard environment
variables.

### Step 4 — Vercel SPA routing

This is a client-side SPA. Create `vercel.json` in the project root:

```json
{
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

This ensures direct URL access (e.g. `/product/ui-component-kit`) works
without a 404.

---

## 9. Schema Compatibility Report

### Tables

#### `users`
| Field | Type | Notes |
|-------|------|-------|
| `_id` | `Id<"users">` | Auto-generated |
| `_creationTime` | `number` | Auto-generated (ms timestamp) |
| `tokenIdentifier` | `string` | OIDC `{issuer}\|{subject}` |
| `name` | `string?` | |
| `email` | `string?` | |
| `role` | `"user"\|"admin"\|"super_admin"` optional | |

Indexes: `by_token` on `["tokenIdentifier"]`

---

#### `products`
| Field | Type |
|-------|------|
| `name` | `string` |
| `slug` | `string` — unique |
| `category` | `string` |
| `tagline` | `string` |
| `description` | `string` |
| `price` | `number` — INR |
| `originalPrice` | `number` — INR |
| `badge` | `string?` |
| `features` | `string[]` |
| `highlights` | `{label: string, value: string}[]` |
| `whatsIncluded` | `string[]` |
| `image` | `string` — URL |
| `screenshots` | `string[]` — URLs |
| `upsellProductIds` | `Id<"products">[]?` |

Indexes: `by_slug` on `["slug"]`

---

#### `deliveryAssets`
| Field | Type |
|-------|------|
| `productId` | `Id<"products">` |
| `name` | `string` |
| `deliveryType` | `string` |
| `url` | `string` |
| `storageId` | `string?` |
| `fileName` | `string?` |
| `instructions` | `string?` |
| `displayOrder` | `number` |
| `enabled` | `boolean` |

Indexes: `by_product` on `["productId"]`

---

#### `orders`
| Field | Type |
|-------|------|
| `razorpayOrderId` | `string` |
| `razorpayPaymentId` | `string?` |
| `customerName` | `string` |
| `customerEmail` | `string` |
| `items` | `{productId, productName, price, quantity}[]` |
| `amountInPaise` | `number` |
| `status` | `"created"\|"paid"\|"failed"` |
| `orderNumber` | `string?` |

Indexes: `by_razorpay_order_id`, `by_status`, `by_email`

---

#### `settings` (key-value store)
| Key | Default | Description |
|-----|---------|-------------|
| `fallback_exchange_rate` | `0.012` | INR → USD rate |
| `razorpay_key_id` | — | Razorpay public key |
| `razorpay_key_secret` | — | Razorpay secret |
| `review_email_enabled` | `true` | Review request emails |
| `review_request_delay_days` | `3` | Days to wait before sending review email |
| `review_min_length` | `20` | Min review body chars |
| `review_approval_mode` | `manual` | `manual` or `auto` |
| `review_ai_polish_enabled` | `true` | AI polish on reviews |
| `trust_money_back_days` | `30` | Days on money-back badge |
| `sp_enabled` | `false` | Social proof notifications |
| `sp_demoMode` | `false` | Demo mode |

Full key list: see `convex/settings.ts`

---

### Key Backend Functions

#### Public Actions (Node.js runtime)
| Function | Description |
|----------|-------------|
| `api.razorpay.createOrder` | Create Razorpay order + insert DB record |
| `api.razorpay.verifyPayment` | HMAC verify + mark paid + send email |
| `api.razorpay.sendAccessOtp` | Send re-access OTP |
| `api.razorpay.verifyAccessOtp` | Verify OTP + return purchase token |

#### Scheduled Functions
| Trigger | Function | Description |
|---------|----------|-------------|
| `ctx.scheduler.runAfter(delayMs)` | `internal.email.sendReviewRequestEmail` | Fires N days after purchase |

---

## 10. Data Export

Use Admin → Settings → Export Data to download all live data as JSON or CSV.

To import into a new Convex project:
- Use Convex Dashboard → Data (JSON import per table)
- Or use the `npx convex import` CLI command

---

## 11. Removing Hercules Runtime Dependency

After completing all replacements, uninstall Hercules packages:

```bash
npm uninstall @usehercules/auth @usehercules/sdk @usehercules/vite @usehercules/eslint-plugin
```

Then update:
- `vite.config.ts` — remove `hercules()` plugin
- `src/hooks/use-auth.ts` — replace auth hook source
- `src/components/ui/signin.tsx` — replace sign-in button
- `convex/email.ts` — replace Hercules SDK email call
- `eslint.config.js` — remove `@usehercules/eslint-plugin`

After these changes, the project has zero Hercules runtime dependency.
