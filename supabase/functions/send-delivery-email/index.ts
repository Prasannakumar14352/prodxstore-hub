// Replaces convex/email.ts → sendDeliveryEmailByOrderId (was Hercules SDK; now Resend).
import {
  corsHeaders, json, serviceClient, sendEmail, escapeHtml, siteUrl, resolveAssets,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { orderId } = await req.json();
    const db = serviceClient();

    const { data: order } = await db.from("orders").select("*")
      .eq("id", orderId).eq("status", "paid").maybeSingle();
    if (!order) return json({ error: "Paid order not found." }, 404);

    const { data: t } = await db.from("purchase_tokens").select("token")
      .eq("order_id", order.id).limit(1).maybeSingle();
    const accessLink = t ? `${siteUrl()}/thank-you/${t.token}` : siteUrl();

    const items = order.items as Array<{ productId: string; productName: string; quantity: number }>;
    const productIds = [...new Set(items.map((i) => i.productId))];
    const assetsMap = await resolveAssets(db, productIds);

    const assetHtml = items.map((item) => {
      const assets = assetsMap[item.productId] ?? [];
      const links = assets.map((a) =>
        `<div style="background:#f4f4f5;border-radius:10px;padding:12px;margin:6px 0">
           <div style="font-weight:600">${escapeHtml(String(a.name))}</div>
           <div style="font-size:12px;color:#d97706">${escapeHtml(String(a.delivery_type))}</div>
           ${a.instructions ? `<div style="font-size:12px;color:#71717a">${escapeHtml(String(a.instructions))}</div>` : ""}
           <a href="${escapeHtml(String(a.url))}" style="font-size:13px">Download / Open →</a>
         </div>`).join("");
      return `<h3 style="margin:16px 0 4px">${escapeHtml(item.productName)}</h3>${links || "<p style='font-size:13px;color:#71717a'>Delivery details available on your access page.</p>"}`;
    }).join("");

    const sent = await sendEmail({
      to: order.customer_email,
      subject: `Your ProdXStore order ${order.order_number ?? ""} is ready 🎉`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2>Thanks for your purchase, ${escapeHtml(order.customer_name)}!</h2>
        <p>Order <strong>${escapeHtml(order.order_number ?? "")}</strong> · ₹${Math.round(order.amount_in_paise / 100)}</p>
        ${assetHtml}
        <p style="margin-top:24px">
          <a href="${accessLink}" style="background:#d97706;color:#000;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700">Open your access page</a>
        </p>
        <p style="color:#71717a;font-size:12px;margin-top:24px">Keep this email — the button above always gets you back to your downloads.</p>
      </div>`,
    });

    if (sent) await db.from("orders").update({ email_sent: true }).eq("id", order.id);
    return json({ sent });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error sending delivery email." }, 500);
  }
});
