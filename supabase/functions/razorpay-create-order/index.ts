// Replaces convex/razorpay.ts → createOrder.
// SECURITY IMPROVEMENT over the Convex version: the total is recomputed from
// database prices + a server-side coupon revalidation instead of trusting the
// client's finalAmountRupees.
import { corsHeaders, json, serviceClient, getRazorpayKeys } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const {
      customerName, customerEmail, customerMobile, items,
      promoCode, promoDiscount, finalAmountRupees, affiliateCode,
    } = await req.json();

    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0) {
      return json({ error: "Invalid order payload." }, 400);
    }

    const db = serviceClient();
    const keys = await getRazorpayKeys(db);
    if (!keys) {
      return json({ error: "Razorpay credentials are not configured. Please add them in Admin → Settings → Razorpay." }, 500);
    }

    // Recompute the amount server-side from real product prices
    const productIds = items.map((i: { productId: string }) => i.productId);
    const { data: products, error: pErr } = await db
      .from("products").select("id, price").in("id", productIds);
    if (pErr) throw pErr;

    let subtotal = 0;
    for (const item of items) {
      const p = products?.find((x) => x.id === item.productId);
      if (!p) return json({ error: "One of the products no longer exists." }, 400);
      subtotal += Number(p.price) * (item.quantity ?? 1);
    }

    let discount = 0;
    if (promoCode) {
      const { data: v } = await db.rpc("validate_coupon", {
        p_code: promoCode, p_cart_total: subtotal,
      });
      if (v?.valid) discount = Number(v.discountAmountInr);
    }
    const serverTotal = Math.max(subtotal - discount, 1);
    if (Math.abs(serverTotal - Number(finalAmountRupees)) > 1) {
      return json({ error: "Price mismatch. Please refresh and try again." }, 400);
    }

    const amountInPaise = Math.round(serverTotal * 100);
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(`${keys.keyId}:${keys.keySecret}`),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: amountInPaise, currency: "INR", receipt: `rcpt_${Date.now()}` }),
    });
    if (!rzpRes.ok) {
      console.error("Razorpay order creation failed:", await rzpRes.text());
      return json({ error: "Failed to create payment order." }, 502);
    }
    const rzpOrder = await rzpRes.json();

    const { error: insErr } = await db.from("orders").insert({
      razorpay_order_id: rzpOrder.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_mobile: customerMobile ?? null,
      items,
      amount_in_paise: amountInPaise,
      currency: "INR",
      promo_code: promoCode ?? null,
      promo_discount: promoDiscount ?? null,
      affiliate_code: affiliateCode ?? null,
      status: "created",
      email_sent: false,
      download_count: 0,
    });
    if (insErr) throw insErr;

    return json({ orderId: rzpOrder.id, amount: amountInPaise, currency: "INR", keyId: keys.keyId });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error creating order." }, 500);
  }
});
