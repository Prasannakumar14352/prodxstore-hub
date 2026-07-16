// Replaces convex/razorpay.ts → verifyAccessOtp.
import { corsHeaders, json, serviceClient, sha256Hex } from "../_shared/utils.ts";
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, orderNumber, otp } = await req.json();
    const db = serviceClient();
    const otpHash = await sha256Hex(String(otp) + email);

    const { data: rows } = await db.from("purchase_otps").select("*")
      .eq("email", email).eq("order_number", orderNumber)
      .eq("otp_hash", otpHash).eq("verified", false)
      .order("created_at", { ascending: false }).limit(1);
    const record = rows?.[0];
    if (!record) return json({ error: "Invalid code. Please check and try again." }, 400);
    if (new Date(record.expires_at).getTime() < Date.now()) {
      return json({ error: "This code has expired. Please request a new one." }, 400);
    }

    await db.from("purchase_otps").update({ verified: true }).eq("id", record.id);

    const { data: order } = await db.from("orders").select("id")
      .eq("customer_email", email).eq("order_number", orderNumber)
      .eq("status", "paid").maybeSingle();
    if (!order) return json({ error: "Order not found." }, 404);

    const { data: t } = await db.from("purchase_tokens").select("token")
      .eq("order_id", order.id).limit(1).maybeSingle();
    if (!t) return json({ error: "Access token not found for this order." }, 404);

    return json({ success: true, token: t.token });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error verifying code." }, 500);
  }
});
