"use node";

import { Hercules } from "@usehercules/sdk";
import escapeHtml from "escape-html";
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY!,
  apiVersion: "2025-12-09",
});

const FROM = "ProdXStore <prodxstoresupport@gmail.com>";
const SUPPORT_EMAIL = "prodxstoresupport@gmail.com";

// ─── Currency conversion ───────────────────────────────────────────────────────

async function fetchLiveRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=INR&to=USD");
    if (!res.ok) return null;
    const data = await res.json() as { rates: { USD: number } };
    return data.rates.USD;
  } catch {
    return null;
  }
}

function inrToUsd(inrAmount: number, rate: number): string {
  return `$${(inrAmount * rate).toFixed(2)}`;
}

// ─── Shared email styles ──────────────────────────────────────────────────────

const STYLES = `
  body { margin:0; padding:0; background:#0f0f12; font-family:'Segoe UI',Arial,sans-serif; color:#e5e5e5; }
  .wrapper { max-width:600px; margin:0 auto; padding:32px 16px; }
  .card { background:#1a1a20; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; }
  .logo { font-size:22px; font-weight:700; color:#fff; margin-bottom:8px; }
  .logo span { color:#d97706; }
  h1 { font-size:24px; font-weight:700; color:#fff; margin:0 0 8px; }
  p { font-size:15px; color:#a1a1aa; line-height:1.6; margin:0 0 16px; }
  .highlight { color:#fff; font-weight:600; }
  .divider { border:none; border-top:1px solid rgba(255,255,255,0.08); margin:24px 0; }
  .info-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
  .info-label { color:#71717a; font-size:13px; }
  .info-value { color:#e5e5e5; font-size:13px; font-weight:500; }
  .asset-card { background:#0f0f12; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:16px; margin:8px 0; }
  .asset-name { font-weight:600; color:#fff; font-size:14px; margin-bottom:4px; }
  .asset-type { font-size:12px; color:#d97706; margin-bottom:8px; }
  .asset-instructions { font-size:12px; color:#71717a; margin-bottom:8px; }
  .btn { display:inline-block; background:#d97706; color:#000; padding:12px 28px; border-radius:999px; text-decoration:none; font-weight:700; font-size:14px; }
  .btn-outline { display:inline-block; border:1px solid rgba(255,255,255,0.15); color:#e5e5e5; padding:10px 20px; border-radius:999px; text-decoration:none; font-size:13px; margin-top:6px; }
  .footer { text-align:center; margin-top:24px; font-size:12px; color:#52525b; }
`;

// ─── Delivery email after successful payment ──────────────────────────────────

export const sendDeliveryEmailByOrderId = internalAction({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<void> => {
    const orderWithAssets = await ctx.runQuery(internal.orders.getOrderDetailsForEmail, {
      orderId: args.orderId,
    });
    if (!orderWithAssets) return;

    const { order, assetsMap } = orderWithAssets;

    const tokenDoc = await ctx.runQuery(internal.orders.getPurchaseTokenForOrder, {
      orderId: args.orderId,
    });
    const thankYouUrl = tokenDoc
      ? `${process.env.VITE_CONVEX_URL?.replace("convex.cloud", "onhercules.app") ?? "https://prodxstore.onhercules.app"}/thank-you/${tokenDoc.token}`
      : "#";

    // Fetch live rate → admin fallback → hardcoded
    const liveRate = await fetchLiveRate();
    const dbFallbackRate = await ctx.runQuery(internal.settings.getFallbackRateInternal);
    const rate = liveRate ?? dbFallbackRate ?? 0.012;

    const inrTotal = Math.round(order.amountInPaise / 100);
    const usdDisplay = inrToUsd(inrTotal, rate);

    const allAssets = Object.values(assetsMap).flat();
    const assetsHtml = allAssets.map((a) => `
      <div class="asset-card">
        <div class="asset-name">${escapeHtml(a.name)}</div>
        <div class="asset-type">${escapeHtml(a.deliveryType)}</div>
        ${a.instructions ? `<div class="asset-instructions">${escapeHtml(a.instructions)}</div>` : ""}
        <a href="${escapeHtml(a.url)}" class="btn-outline">Download / Access →</a>
      </div>
    `).join("");

    const html = `
      <!DOCTYPE html><html><head><style>${STYLES}</style></head>
      <body><div class="wrapper"><div class="card">
        <div class="logo">PROD<span>X</span>STORE</div>
        <p style="color:#71717a;font-size:13px;margin-bottom:24px;">Digital Products Marketplace</p>
        <h1>Your Purchase Is Ready 🎉</h1>
        <p>Hi <span class="highlight">${escapeHtml(order.customerName)}</span>, your payment was successful!</p>
        <hr class="divider"/>
        <div class="info-row"><span class="info-label">Order Number</span><span class="info-value">${escapeHtml(order.orderNumber ?? "—")}</span></div>
        <div class="info-row"><span class="info-label">Product</span><span class="info-value">${escapeHtml(order.items.map(i => i.productName).join(", "))}</span></div>
        <div class="info-row"><span class="info-label">Amount Paid</span><span class="info-value">${escapeHtml(usdDisplay)}</span></div>
        <div class="info-row"><span class="info-label">Purchase Date</span><span class="info-value">${new Date(order._creationTime).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
        <hr class="divider"/>
        <p style="font-weight:600;color:#fff;margin-bottom:12px;">Your Downloads</p>
        ${assetsHtml || '<p>Your downloads will be available shortly.</p>'}
        <hr class="divider"/>
        <div style="text-align:center;margin-top:24px;">
          <a href="${escapeHtml(thankYouUrl)}" class="btn">Open Your Purchase →</a>
        </div>
        <hr class="divider"/>
        <p style="font-size:13px;color:#52525b;">Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#d97706;">${SUPPORT_EMAIL}</a></p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} ProdXStore. All rights reserved.</div>
      </div></body></html>
    `;

    const text = `Hi ${order.customerName}, your ProdXStore purchase is ready!\n\nOrder: ${order.orderNumber}\nAmount: ${usdDisplay}\n\nView your downloads: ${thankYouUrl}\n\nSupport: ${SUPPORT_EMAIL}`;

    await hercules.email.send({
      from: FROM,
      to: order.customerEmail,
      subject: `Your ProdXStore Purchase Is Ready 🎉 — Order ${order.orderNumber ?? ""}`,
      html,
      text,
    });

    await ctx.runMutation(internal.orders.markEmailSent, { orderId: args.orderId });
  },
});

// ─── Review request email ─────────────────────────────────────────────────────

export const sendReviewRequestEmail = internalAction({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args): Promise<void> => {
    // Check if review emails are enabled
    const enabled = await ctx.runQuery(internal.settings.getReviewEmailEnabled);
    if (!enabled) return;

    const orderData = await ctx.runQuery(internal.orders.getOrderDetailsForEmail, {
      orderId: args.orderId,
    });
    if (!orderData) return;
    const { order } = orderData;
    if (order.status !== "paid") return;

    // Get the purchase token so we can pre-link reviews as verified buyer
    const tokenDoc = await ctx.runQuery(internal.orders.getPurchaseTokenForOrder, {
      orderId: args.orderId,
    });
    if (!tokenDoc) return;

    const baseUrl =
      process.env.VITE_CONVEX_URL?.replace("convex.cloud", "onhercules.app") ??
      "https://prodxstore.onhercules.app";

    // Build one review link per unique product (token embedded for verified linking)
    const uniqueProducts = [
      ...new Map(order.items.map((i) => [i.productId, i])).values(),
    ];

    const reviewLinksHtml = uniqueProducts
      .map(
        (item) => `
        <div class="asset-card" style="margin-bottom:10px;">
          <div class="asset-name">${escapeHtml(item.productName)}</div>
          <a href="${escapeHtml(`${baseUrl}/thank-you/${tokenDoc.token}#reviews`)}" class="btn-outline" style="margin-top:8px;display:inline-block;">
            Write a Review →
          </a>
        </div>`
      )
      .join("");

    const thankYouUrl = `${baseUrl}/thank-you/${tokenDoc.token}`;

    const html = `
      <!DOCTYPE html><html><head><style>${STYLES}</style></head>
      <body><div class="wrapper"><div class="card">
        <div class="logo">PROD<span>X</span>STORE</div>
        <p style="color:#71717a;font-size:13px;margin-bottom:24px;">Digital Products Marketplace</p>
        <h1>How's everything going? ⭐</h1>
        <p>Hi <span class="highlight">${escapeHtml(order.customerName)}</span>, we hope you're enjoying your purchase from ProdXStore!</p>
        <p>If you have a moment, we'd love to hear what you think. Your review helps other buyers make better decisions.</p>
        <hr class="divider"/>
        <p style="font-weight:600;color:#fff;margin-bottom:12px;">Share your experience</p>
        ${reviewLinksHtml}
        <hr class="divider"/>
        <p style="font-size:13px;color:#71717a;">
          Or visit your full purchase page to leave a review there:<br/>
          <a href="${escapeHtml(thankYouUrl)}" style="color:#d97706;">${escapeHtml(thankYouUrl)}</a>
        </p>
        <hr class="divider"/>
        <p style="font-size:13px;color:#52525b;">
          Need help? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#d97706;">${SUPPORT_EMAIL}</a>
        </p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} ProdXStore. All rights reserved.<br/>
      You received this because you purchased from ProdXStore. Order: ${escapeHtml(order.orderNumber ?? "")}</div>
      </div></body></html>
    `;

    const text = `Hi ${order.customerName},\n\nWe hope you're enjoying your ProdXStore purchase!\n\nWe'd love your feedback. Visit your purchase page to leave a review:\n${thankYouUrl}\n\nThank you!\nProdXStore Support — ${SUPPORT_EMAIL}`;

    await hercules.email.send({
      from: FROM,
      to: order.customerEmail,
      subject: `How's your ${uniqueProducts[0]?.productName ?? "purchase"}? Leave a review ⭐`,
      html,
      text,
    });
  },
});

export const sendOtpEmail = internalAction({
  args: {
    email: v.string(),
    otp: v.string(),
    orderNumber: v.string(),
    customerName: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    const html = `
      <!DOCTYPE html><html><head><style>${STYLES}</style></head>
      <body><div class="wrapper"><div class="card">
        <div class="logo">PROD<span>X</span>STORE</div>
        <p style="color:#71717a;font-size:13px;margin-bottom:24px;">Digital Products Marketplace</p>
        <h1>Your Access Code</h1>
        <p>Hi <span class="highlight">${escapeHtml(args.customerName)}</span>, here is your one-time code to access order <span class="highlight">${escapeHtml(args.orderNumber)}</span>:</p>
        <div style="text-align:center;margin:32px 0;">
          <div style="font-size:48px;font-weight:800;letter-spacing:12px;color:#d97706;">${escapeHtml(args.otp)}</div>
          <p style="color:#71717a;font-size:13px;margin-top:8px;">Valid for 10 minutes. Do not share this code.</p>
        </div>
        <p style="font-size:13px;color:#52525b;">If you didn't request this, ignore this email. Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#d97706;">${SUPPORT_EMAIL}</a></p>
      </div></div></body></html>
    `;

    await hercules.email.send({
      from: FROM,
      to: args.email,
      subject: `Your ProdXStore Access Code: ${args.otp}`,
      html,
      text: `Your ProdXStore access code is: ${args.otp}\n\nValid for 10 minutes.\n\nOrder: ${args.orderNumber}`,
    });
  },
});
