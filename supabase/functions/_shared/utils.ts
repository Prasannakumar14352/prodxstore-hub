// Shared helpers for ProdXStore Edge Functions (Deno runtime).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

/** Service-role client — bypasses RLS. Never expose to the browser. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/** Razorpay keys: env secrets take priority, falling back to the settings
 *  table so the existing Admin → Settings → Razorpay panel keeps working. */
export async function getRazorpayKeys(
  db: SupabaseClient,
): Promise<{ keyId: string; keySecret: string } | null> {
  let keyId = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
  let keySecret = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";
  if (!keyId || !keySecret) {
    const { data } = await db.from("settings").select("key, value")
      .in("key", ["razorpay_key_id", "razorpay_key_secret"]);
    for (const row of data ?? []) {
      if (row.key === "razorpay_key_id" && !keyId) keyId = row.value;
      if (row.key === "razorpay_key_secret" && !keySecret) keySecret = row.value;
    }
  }
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return hex(new Uint8Array(sig));
}

export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message));
  return hex(new Uint8Array(digest));
}

export function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return hex(buf);
}

function hex(buf: Uint8Array): string {
  return Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PXS-${ts}-${rand}`;
}

/** Send an email via Resend. No-ops (with a log) when RESEND_API_KEY is unset. */
export async function sendEmail(args: {
  to: string; subject: string; html: string;
}): Promise<boolean> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM") ?? "ProdXStore <onboarding@resend.dev>";
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set — skipping email to ${args.to}: ${args.subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: args.to, subject: args.subject, html: args.html }),
  });
  if (!res.ok) {
    console.error("Email send failed:", await res.text());
    return false;
  }
  return true;
}

export function siteUrl(): string {
  return (Deno.env.get("SITE_URL") ?? "http://localhost:5173").replace(/\/$/, "");
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Resolve enabled delivery assets for a set of product ids, with signed URLs. */
export async function resolveAssets(
  db: SupabaseClient,
  productIds: string[],
): Promise<Record<string, Array<Record<string, unknown>>>> {
  const map: Record<string, Array<Record<string, unknown>>> = {};
  if (productIds.length === 0) return map;
  const { data } = await db.from("delivery_assets").select("*")
    .in("product_id", productIds).eq("enabled", true).order("display_order");
  for (const asset of data ?? []) {
    let url = asset.url as string;
    if (asset.storage_path) {
      const { data: signed } = await db.storage.from("delivery-files")
        .createSignedUrl(asset.storage_path as string, 60 * 60 * 24 * 7); // 7 days
      if (signed?.signedUrl) url = signed.signedUrl;
    }
    const pid = asset.product_id as string;
    (map[pid] ??= []).push({ ...asset, url });
  }
  return map;
}
