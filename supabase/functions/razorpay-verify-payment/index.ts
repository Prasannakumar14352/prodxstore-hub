// Replaces convex/razorpay.ts → verifyPayment.
// HMAC verify → mark paid → token → coupon usage → affiliate conversion
// → schedule review email → trigger delivery email.
import {
  corsHeaders, json, serviceClient, getRazorpayKeys,
  hmacSha256Hex, randomHex, generateOrderNumber,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = await req.json();
    const db = serviceClient();
    const keys = await getRazorpayKeys(db);
    if (!keys) return json({ error: "Razorpay credentials are not configured." }, 500);

    const expected = await hmacSha256Hex(keys.keySecret, `${razorpayOrderId}|${razorpayPaymentId}`);
    if (expected !== razorpaySignature) {
      await db.from("orders").update({ status: "failed" })
        .eq("razorpay_order_id", razorpayOrderId);
      return json({ error: "Payment signature verification failed." }, 403);
    }

    const { data: order } = await db.from("orders").select("*")
      .eq("razorpay_order_id", razorpayOrderId).single();
    if (!order) return json({ error: "Order not found." }, 404);

    // Idempotency
    if (order.status === "paid") {
      const { data: t } = await db.from("purchase_tokens").select("token")
        .eq("order_id", order.id).limit(1).single();
      return json({ success: true, token: t?.token, orderNumber: order.order_number });
    }

    const orderNumber = generateOrderNumber();
    const secureToken = randomHex(32);

    await db.from("orders").update({
      status: "paid", razorpay_payment_id: razorpayPaymentId, order_number: orderNumber,
    }).eq("id", order.id);
    await db.from("purchase_tokens").insert({ order_id: order.id, token: secureToken });

    if (order.promo_code) {
      await db.rpc("increment_coupon_usage", { p_code: order.promo_code });
    }
    if (order.affiliate_code) {
      await db.rpc("record_affiliate_conversion", {
        p_code: order.affiliate_code, p_revenue: order.amount_in_paise / 100,
      });
    }

    // Schedule review request email (replaces ctx.scheduler.runAfter)
    const { data: s } = await db.from("settings").select("value")
      .eq("key", "review_request_delay_days").maybeSingle();
    const delayDays = parseInt(s?.value ?? "3", 10) || 3;
    await db.from("scheduled_review_emails").insert({
      order_id: order.id,
      send_at: new Date(Date.now() + delayDays * 86400_000).toISOString(),
    });

    // Fire-and-forget delivery email
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-delivery-email`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId: order.id }),
    }).catch((e) => console.error("delivery email trigger failed:", e));

    return json({ success: true, token: secureToken, orderNumber });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error verifying payment." }, 500);
  }
});
