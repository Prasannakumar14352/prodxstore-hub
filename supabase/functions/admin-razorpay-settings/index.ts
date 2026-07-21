// Admin-only Razorpay credentials read/write.
//
// The key secret must never travel to the browser as a raw select/RPC
// result — even from an authorized admin session, that's a plaintext
// secret sitting in devtools' network tab / browser memory. This function
// is the single point where it's read from or written to `public.settings`,
// using the service-role client (bypasses RLS, never exposed to the
// frontend). Callers only ever receive `hasSecret: boolean`, never the
// secret's value — not on read, not echoed back on write.
//
// One request per save (action: "set" writes both key_id and key_secret in
// one upsert) — a single round trip instead of two.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Explicit allowlist (not "*") so the Access-Control-Allow-Origin response
// header can safely echo back one specific, known-good origin per request.
const ALLOWED_ORIGINS = new Set([
  "https://www.prodxstore.com",
  "https://prodxstore.com",
  "https://prodxstore.app",
  "http://localhost:3000",
  "http://localhost:5173",
]);

function corsHeadersFor(origin: string | null): Record<string, string> {
  const allowOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : "";
  return {
    // Only ever set when the request's Origin is in the allowlist; an
    // unrecognized origin gets no Allow-Origin header at all (the browser
    // then blocks it client-side — the correct behavior, not an error here).
    ...(allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    // Tells caches/CDNs the response varies by Origin, since it's echoed
    // conditionally rather than being a fixed "*".
    "Vary": "Origin",
  };
}

function jsonResponse(origin: string | null, status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(origin), "Content-Type": "application/json" },
  });
}

// ─── Structured logging ───────────────────────────────────────────────────────
function log(event: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ fn: "admin-razorpay-settings", event, ts: new Date().toISOString(), ...data }));
}

// ─── Handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  // Preflight must return immediately — before auth, before body parsing,
  // before anything else — or the browser never gets past OPTIONS to send
  // the real POST.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeadersFor(origin) });
  }

  log("incoming_request", { method: req.method, origin });

  if (req.method !== "POST") {
    return jsonResponse(origin, 405, {
      success: false, error: "Only POST is supported.", message: "Method not allowed.",
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      log("config_error", {
        missing: [
          !SUPABASE_URL && "SUPABASE_URL",
          !SUPABASE_ANON_KEY && "SUPABASE_ANON_KEY",
          !SUPABASE_SERVICE_ROLE_KEY && "SUPABASE_SERVICE_ROLE_KEY",
        ].filter(Boolean),
      });
      return jsonResponse(origin, 500, {
        success: false, error: "Server is not configured correctly.", message: "Missing required secrets.",
      });
    }

    // ── Authentication: validate the caller's session ────────────────────────
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      log("auth_failure", { reason: "missing_authorization_header" });
      return jsonResponse(origin, 401, {
        success: false, error: "Missing Authorization header.", message: "Not signed in.",
      });
    }

    const asUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await asUser.auth.getUser();
    if (userError || !user) {
      log("auth_failure", { reason: "invalid_session", error: userError?.message });
      return jsonResponse(origin, 401, {
        success: false, error: "Invalid or expired session.", message: "Please sign in again.",
      });
    }
    log("authenticated_user", { userId: user.id });

    // ── Authorization: admin/super_admin only, checked server-side ───────────
    // Never trust a role the client claims about itself — this looks it up
    // via the service-role client (bypasses RLS) against public.profiles.
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: profile, error: profileError } = await db
      .from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profileError) {
      log("database_failure", { stage: "profile_lookup", userId: user.id, error: profileError.message });
      return jsonResponse(origin, 500, {
        success: false, error: "Could not verify permissions.", message: "Database error.",
        details: profileError.message,
      });
    }
    const role = profile?.role;
    if (role !== "admin" && role !== "super_admin") {
      log("authorization_failure", { userId: user.id, role: role ?? null });
      return jsonResponse(origin, 403, {
        success: false, error: "Admin access required.", message: "You don't have permission to do this.",
      });
    }

    // ── Body ──────────────────────────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(origin, 400, {
        success: false, error: "Request body must be valid JSON.", message: "Bad request.",
      });
    }
    const action = typeof body.action === "string" ? body.action : "get";

    // ── action: "get" — never returns the secret's value, only whether one exists ──
    if (action === "get") {
      const { data, error } = await db.from("settings").select("key, value")
        .in("key", ["razorpay_key_id", "razorpay_key_secret"]);
      if (error) {
        log("database_failure", { stage: "settings_read", userId: user.id, error: error.message });
        return jsonResponse(origin, 500, {
          success: false, error: "Failed to load Razorpay settings.", message: "Database error.",
          details: error.message,
        });
      }
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key as string] = row.value as string;
      const keyId: string | null = map.razorpay_key_id ?? null;
      const hasSecret = !!map.razorpay_key_secret;
      const mode: "test" | "live" | "none" = keyId ? (keyId.includes("_test_") ? "test" : "live") : "none";
      log("get_success", { userId: user.id, mode, hasSecret });
      return jsonResponse(origin, 200, { success: true, keyId, hasSecret, mode });
    }

    // ── action: "set" — validates, then upserts both rows in one call ─────────
    if (action === "set") {
      const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";
      const keySecret = typeof body.keySecret === "string" ? body.keySecret.trim() : "";

      if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(keyId)) {
        return jsonResponse(origin, 400, {
          success: false,
          error: "Key ID must look like rzp_test_... or rzp_live_...",
          message: "Invalid Key ID.",
        });
      }
      if (keySecret.length < 10) {
        return jsonResponse(origin, 400, {
          success: false, error: "Key Secret appears too short.", message: "Invalid Key Secret.",
        });
      }

      const now = new Date().toISOString();
      const { error } = await db.from("settings").upsert(
        [
          { key: "razorpay_key_id", value: keyId, updated_at: now },
          { key: "razorpay_key_secret", value: keySecret, updated_at: now },
        ],
        { onConflict: "key" },
      );
      if (error) {
        log("database_failure", { stage: "settings_write", userId: user.id, error: error.message });
        return jsonResponse(origin, 500, {
          success: false, error: "Failed to save Razorpay credentials.", message: "Database error.",
          details: error.message,
        });
      }

      log("save_success", { userId: user.id, keyId });
      // Never echo the secret back, even on success.
      return jsonResponse(origin, 200, { success: true, message: "Razorpay credentials saved." });
    }

    return jsonResponse(origin, 400, {
      success: false, error: `Unknown action: ${action}`, message: "Bad request.",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log("unhandled_exception", { error: message });
    return jsonResponse(origin, 500, {
      success: false, error: "An unexpected error occurred.", message: "Internal server error.",
    });
  }
});
