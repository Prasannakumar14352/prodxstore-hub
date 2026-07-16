// Replaces Convex's ctx.scheduler.runAfter → review request emails.
// Invoke every 15 min via pg_cron (see migrations/00002_cron.sql) or any scheduler.
import {
  corsHeaders, json, serviceClient, sendEmail, escapeHtml, siteUrl,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const db = serviceClient();

    const { data: enabledRow } = await db.from("settings").select("value")
      .eq("key", "review_email_enabled").maybeSingle();
    if (enabledRow?.value === "false") return json({ processed: 0, skipped: "disabled" });

    const { data: due } = await db.from("scheduled_review_emails").select("*")
      .eq("sent", false).lte("send_at", new Date().toISOString()).limit(25);

    let processed = 0;
    for (const job of due ?? []) {
      const { data: order } = await db.from("orders").select("*")
        .eq("id", job.order_id).eq("status", "paid").maybeSingle();
      // Mark as sent regardless so failed orders don't retry forever
      await db.from("scheduled_review_emails").update({ sent: true }).eq("id", job.id);
      if (!order) continue;

      const { data: t } = await db.from("purchase_tokens").select("token")
        .eq("order_id", order.id).limit(1).maybeSingle();
      const reviewLink = t
        ? `${siteUrl()}/thank-you/${t.token}#review`
        : siteUrl();

      const firstItem = (order.items as Array<{ productName: string }>)[0];
      await sendEmail({
        to: order.customer_email,
        subject: `How's ${firstItem?.productName ?? "your purchase"} working out?`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px">
          <h2>Hi ${escapeHtml(order.customer_name)},</h2>
          <p>You picked up <strong>${escapeHtml(firstItem?.productName ?? "a product")}</strong> a few days ago — we'd love to hear how it's going.</p>
          <p>A quick review helps other buyers and takes under a minute.</p>
          <p style="margin-top:20px">
            <a href="${reviewLink}" style="background:#d97706;color:#000;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:700">Leave a review</a>
          </p>
        </div>`,
      });
      processed++;
    }

    return json({ processed });
  } catch (e) {
    console.error(e);
    return json({ error: "Internal error." }, 500);
  }
});
