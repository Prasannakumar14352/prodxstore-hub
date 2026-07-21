// Admin-only Razorpay credentials read/write.
//
// The key secret must never travel to the browser as a raw select/RPC
// result — even from an authorized admin session, that's a plaintext
// secret sitting in devtools' network tab / browser memory. This function
// is the single point where it's read from or written to `public.settings`,
// using the service-role client (bypasses RLS). The frontend only ever
// receives `hasSecret: boolean`, never the value.
//
// One request per save (action: "set" writes both key_id and key_secret in
// one call) — replaces two separate admin_set_setting RPC round-trips.
import { corsHeaders, json, serviceClient, requireAdmin } from "../_shared/utils.ts";
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await requireAdmin(req))) return json({ error: "Admin access required." }, 403);
    const db = serviceClient();
    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "get";

    if (action === "get") {
      const { data } = await db.from("settings").select("key, value")
        .in("key", ["razorpay_key_id", "razorpay_key_secret"]);
      const map: Record<string, string> = {};
      for (const row of data ?? []) map[row.key as string] = row.value as string;
      const keyId: string | null = map.razorpay_key_id ?? null;
      const hasSecret = !!map.razorpay_key_secret;
      const mode: "test" | "live" | "none" = keyId
        ? (keyId.includes("_test_") ? "test" : "live") : "none";
      return json({ keyId, hasSecret, mode });
    }

    if (action === "set") {
      const keyId = typeof body.keyId === "string" ? body.keyId.trim() : "";
      const keySecret = typeof body.keySecret === "string" ? body.keySecret.trim() : "";
      if (!keyId.startsWith("rzp_")) return json({ error: "Key ID must start with 'rzp_'." }, 400);
      if (keySecret.length < 10) return json({ error: "Key Secret appears too short." }, 400);

      const now = new Date().toISOString();
      const { error } = await db.from("settings").upsert([
        { key: "razorpay_key_id", value: keyId, updated_at: now },
        { key: "razorpay_key_secret", value: keySecret, updated_at: now },
      ], { onConflict: "key" });
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error." }, 500);
  }
});
