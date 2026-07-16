// Replaces convex/razorpay.ts → sendAccessOtp (access-purchase-later flow).
import { corsHeaders, json, serviceClient, sha256Hex, sendEmail, escapeHtml } from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { email, orderNumber } = await req.json();
    if (!email || !orderNumber) return json({ error: "Email and order number are required." }, 400);

    const db = serviceClient();
    const { data: order } = await db.from("orders").select("id, customer_name")
      .eq("customer_email", email).eq("order_number", orderNumber)
      .eq("status", "paid").maybeSingle();
    if (!order) return json({ error: "No order found with this email and order number." }, 404);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await sha256Hex(otp + email);

    await db.from("purchase_otps").insert({
      email, order_number: orderNumber, otp_hash: otpHash,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      verified: false,
    });

    await sendEmail({
      to: email,
      subject: `Your ProdXStore access code: ${otp}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2>Hi ${escapeHtml(order.customer_name ?? "there")},</h2>
        <p>Your one-time code to access order <strong>${escapeHtml(orderNumber)}</strong>:</p>
        <p style="font-size:32px;font-weight:700;letter-spacing:6px">${otp}</p>
        <p style="color:#71717a;font-size:13px">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>`,
    });

    return json({ sent: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error sending code." }, 500);
  }
});
