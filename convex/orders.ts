import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin } from "./users";

// ─── Helper: generate order number ───────────────────────────────────────────

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PXS-${ts}-${rand}`;
}

// ─── Internal: insert order ───────────────────────────────────────────────────

export const insertOrder = internalMutation({
  args: {
    razorpayOrderId: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerMobile: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    amountInPaise: v.number(),
    currency: v.string(),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    affiliateCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("orders", {
      ...args,
      status: "created",
      emailSent: false,
      downloadCount: 0,
    });
    return id;
  },
});

// ─── Internal: mark order paid + generate token ───────────────────────────────

export const markOrderPaid = internalMutation({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    secureToken: v.string(),
  },
  handler: async (ctx, args): Promise<{ orderId: string; orderNumber: string; promoCode: string | undefined; affiliateCode: string | undefined; amountInr: number }> => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order_id", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId)
      )
      .unique();

    if (!order) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Order not found." });
    }

    const orderNumber = generateOrderNumber();

    await ctx.db.patch(order._id, {
      status: "paid",
      razorpayPaymentId: args.razorpayPaymentId,
      orderNumber,
    });

    // Store the secure token
    await ctx.db.insert("purchaseTokens", {
      orderId: order._id,
      token: args.secureToken,
    });

    // Schedule review request email after configured delay
    const delayDays = await ctx.runQuery(internal.settings.getReviewDelayDays);
    const delayMs = delayDays * 24 * 60 * 60 * 1000;
    await ctx.scheduler.runAfter(delayMs, internal.email.sendReviewRequestEmail, {
      orderId: order._id,
    });

    return { orderId: order._id, orderNumber, promoCode: order.promoCode, affiliateCode: order.affiliateCode, amountInr: order.amountInPaise / 100 };
  },
});

// ─── Internal: mark order failed ──────────────────────────────────────────────

export const markOrderFailed = internalMutation({
  args: { razorpayOrderId: v.string() },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order_id", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId)
      )
      .unique();
    if (order) {
      await ctx.db.patch(order._id, { status: "failed" });
    }
  },
});

// ─── Internal: mark email sent ────────────────────────────────────────────────

export const markEmailSent = internalMutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.orderId, { emailSent: true });
  },
});

// ─── Internal: get order by razorpay ID ───────────────────────────────────────

export const getOrderByRazorpayId = internalQuery({
  args: { razorpayOrderId: v.string() },
  handler: async (ctx, args): Promise<Doc<"orders"> | null> => {
    return await ctx.db
      .query("orders")
      .withIndex("by_razorpay_order_id", (q) =>
        q.eq("razorpayOrderId", args.razorpayOrderId)
      )
      .unique();
  },
});

// ─── Public: get order by secure token (for thank-you page) ──────────────────

export const getOrderByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenDoc = await ctx.db
      .query("purchaseTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!tokenDoc) return null;

    const order = await ctx.db.get(tokenDoc.orderId);
    if (!order || order.status !== "paid") return null;

    // Fetch delivery assets for each product item, resolving storage URLs
    const productIds = [...new Set(order.items.map((i) => i.productId))];
    const assetsMap: Record<string, Array<Doc<"deliveryAssets"> & { url: string }>> = {};
    for (const pid of productIds) {
      const assets = await ctx.db
        .query("deliveryAssets")
        .withIndex("by_product", (q) => q.eq("productId", pid))
        .collect();
      const enabled = assets.filter((a) => a.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
      assetsMap[pid] = await Promise.all(
        enabled.map(async (a) => {
          if (a.storageId) {
            const url = await ctx.storage.getUrl(a.storageId as Parameters<typeof ctx.storage.getUrl>[0]);
            return { ...a, url: url ?? a.url };
          }
          return a;
        })
      );
    }

    return { order, assetsMap };
  },
});

// ─── Public: Admin — list all orders ─────────────────────────────────────────

export const listOrders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    return await ctx.db.query("orders").order("desc").take(200);
  },
});

// ─── Public: Admin — update internal notes ───────────────────────────────────

export const updateNotes = mutation({
  args: { orderId: v.id("orders"), notes: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.orderId, { internalNotes: args.notes });
  },
});

// ─── Public: Admin — delete order ────────────────────────────────────────────

export const deleteOrder = mutation({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Delete associated tokens
    const tokens = await ctx.db
      .query("purchaseTokens")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    for (const t of tokens) await ctx.db.delete(t._id);
    await ctx.db.delete(args.orderId);
  },
});

export const getOrderDetailsForEmail = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "paid") return null;

    const productIds = [...new Set(order.items.map((i) => i.productId))];
    const assetsMap: Record<string, Array<Doc<"deliveryAssets"> & { url: string }>> = {};
    for (const pid of productIds) {
      const assets = await ctx.db
        .query("deliveryAssets")
        .withIndex("by_product", (q) => q.eq("productId", pid))
        .collect();
      const enabled = assets.filter((a) => a.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
      assetsMap[pid] = await Promise.all(
        enabled.map(async (a) => {
          if (a.storageId) {
            const url = await ctx.storage.getUrl(a.storageId as Parameters<typeof ctx.storage.getUrl>[0]);
            return { ...a, url: url ?? a.url };
          }
          return a;
        })
      );
    }
    return { order, assetsMap };
  },
});

export const getPurchaseTokenForOrder = internalQuery({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("purchaseTokens")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .unique();
  },
});

export const getPurchaseForOtp = internalQuery({
  args: { email: v.string(), orderNumber: v.string() },
  handler: async (ctx, args) => {
    // Find paid order matching email and orderNumber
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("customerEmail", args.email))
      .collect();
    const order = orders.find(
      (o) => o.orderNumber === args.orderNumber && o.status === "paid"
    );
    if (!order) return null;
    return order;
  },
});

export const saveOtp = internalMutation({
  args: {
    email: v.string(),
    orderNumber: v.string(),
    otpHash: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Remove any existing OTPs for this email+order
    const existing = await ctx.db
      .query("purchaseOtps")
      .withIndex("by_email_order", (q) =>
        q.eq("email", args.email).eq("orderNumber", args.orderNumber)
      )
      .collect();
    for (const o of existing) await ctx.db.delete(o._id);

    await ctx.db.insert("purchaseOtps", {
      email: args.email,
      orderNumber: args.orderNumber,
      otpHash: args.otpHash,
      expiresAt: args.expiresAt,
      verified: false,
    });
  },
});

export const verifyOtpAndGetOrder = internalMutation({
  args: { email: v.string(), orderNumber: v.string(), otpHash: v.string() },
  handler: async (ctx, args) => {
    const otpDoc = await ctx.db
      .query("purchaseOtps")
      .withIndex("by_email_order", (q) =>
        q.eq("email", args.email).eq("orderNumber", args.orderNumber)
      )
      .unique();

    if (!otpDoc) return { success: false as const, error: "Invalid OTP" };
    if (otpDoc.verified) return { success: false as const, error: "OTP already used" };
    if (Date.now() > otpDoc.expiresAt) return { success: false as const, error: "OTP expired" };
    if (otpDoc.otpHash !== args.otpHash) return { success: false as const, error: "Invalid OTP" };

    await ctx.db.patch(otpDoc._id, { verified: true });

    // Find the order and its delivery token
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_email", (q) => q.eq("customerEmail", args.email))
      .collect();
    const order = orders.find((o) => o.orderNumber === args.orderNumber);
    if (!order) return { success: false as const, error: "Order not found" };

    const tokenDoc = await ctx.db
      .query("purchaseTokens")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .unique();

    return { success: true as const, token: tokenDoc?.token ?? "" };
  },
});

// ─── Public: get buyer count for a product ────────────────────────────────────

// ─── Public: Admin — export orders as CSV rows ───────────────────────────────
// Returns all paid orders formatted for CSV export (client-side generation)

export const exportOrdersCsv = query({
  args: {
    status: v.optional(v.union(v.literal("all"), v.literal("paid"), v.literal("created"), v.literal("failed"))),
  },
  handler: async (ctx, args): Promise<Array<{
    orderNumber: string;
    date: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    items: string;
    itemCount: number;
    totalInr: number;
    promoCode: string;
    promoDiscount: string;
    affiliateCode: string;
    status: string;
    emailSent: string;
    downloads: number;
    razorpayOrderId: string;
  }>> => {
    await requireAdmin(ctx);

    const filterStatus = args.status ?? "all";
    let rows: Doc<"orders">[];
    if (filterStatus === "all") {
      rows = await ctx.db.query("orders").order("desc").take(2000);
    } else {
      rows = await ctx.db
        .query("orders")
        .withIndex("by_status", (q) => q.eq("status", filterStatus))
        .order("desc")
        .take(2000);
    }

    return rows.map((o) => ({
      orderNumber: o.orderNumber ?? o.razorpayOrderId,
      date: new Date(o._creationTime).toISOString().replace("T", " ").slice(0, 19),
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerMobile: o.customerMobile ?? "",
      items: o.items.map((i) => `${i.productName}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join("; "),
      itemCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
      totalInr: Math.round(o.amountInPaise / 100),
      promoCode: o.promoCode ?? "",
      promoDiscount: o.promoDiscount ? `₹${o.promoDiscount}` : "",
      affiliateCode: o.affiliateCode ?? "",
      status: o.status,
      emailSent: o.emailSent ? "yes" : "no",
      downloads: o.downloadCount ?? 0,
      razorpayOrderId: o.razorpayOrderId,
    }));
  },
});

export const getProductBuyerCount = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<number> => {
    // Count paid orders that include this product
    const paid = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();
    return paid.filter((o) =>
      o.items.some((item) => item.productId === args.productId)
    ).length;
  },
});

// ─── Public: All product buyer counts in one scan (for storefront sort) ──────

export const getAllProductBuyerCounts = query({
  args: {},
  handler: async (ctx): Promise<Record<string, number>> => {
    const paid = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .collect();

    const counts: Record<string, number> = {};
    for (const order of paid) {
      for (const item of order.items) {
        const key = item.productId as string;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return counts;
  },
});
