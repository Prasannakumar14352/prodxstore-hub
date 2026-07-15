"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdminAction } from "./users";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import Razorpay from "razorpay";
import crypto from "crypto";

async function getRazorpayKeys(ctx: ActionCtx): Promise<{ keyId: string; keySecret: string }> {
  const keys = await ctx.runQuery(internal.settings.getRazorpayKeysInternal, {});
  if (!keys) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Razorpay credentials are not configured. Please add them in Admin → Settings → Razorpay.",
    });
  }
  return keys;
}

// ─── Create Order ──────────────────────────────────────────────────────────────

export const createOrder = action({
  args: {
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
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    finalAmountRupees: v.number(),
    affiliateCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> => {
    const { keyId, keySecret } = await getRazorpayKeys(ctx);
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const amountInPaise = Math.round(args.finalAmountRupees * 100);
    const receipt = `rcpt_${Date.now()}`;

    const rzpOrder = await rzp.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt,
    });

    await ctx.runMutation(internal.orders.insertOrder, {
      razorpayOrderId: rzpOrder.id,
      customerName: args.customerName,
      customerEmail: args.customerEmail,
      customerMobile: args.customerMobile,
      items: args.items,
      amountInPaise,
      currency: "INR",
      promoCode: args.promoCode,
      promoDiscount: args.promoDiscount,
      affiliateCode: args.affiliateCode,
    });

    return { orderId: rzpOrder.id, amount: amountInPaise, currency: "INR", keyId };
  },
});

// ─── Verify Payment ───────────────────────────────────────────────────────────

export const verifyPayment = action({
  args: {
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.string(),
    razorpaySignature: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; token: string; orderNumber: string }> => {
    const { keySecret } = await getRazorpayKeys(ctx);

    // HMAC-SHA256 verification
    const body = `${args.razorpayOrderId}|${args.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== args.razorpaySignature) {
      await ctx.runMutation(internal.orders.markOrderFailed, {
        razorpayOrderId: args.razorpayOrderId,
      });
      throw new ConvexError({ code: "FORBIDDEN", message: "Payment signature verification failed." });
    }

    // Generate secure token (64 hex chars)
    const secureToken = crypto.randomBytes(32).toString("hex");

    const result = await ctx.runMutation(internal.orders.markOrderPaid, {
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.razorpayPaymentId,
      secureToken,
    });

    // Increment coupon usage if a promo code was applied
    if (result.promoCode) {
      await ctx.runMutation(internal.coupons.incrementUsage, { code: result.promoCode });
    }

    // Record affiliate conversion if attributed
    if (result.affiliateCode) {
      await ctx.runMutation(internal.affiliates.recordConversion, {
        code: result.affiliateCode,
        revenueInr: result.amountInr,
      });
    }

    // Schedule delivery email asynchronously
    await ctx.runAction(internal.email.sendDeliveryEmailByOrderId, {
      orderId: result.orderId as Id<"orders">,
    });

    return { success: true, token: secureToken, orderNumber: result.orderNumber };
  },
});

// ─── Send OTP for access-purchase-later ───────────────────────────────────────

export const sendAccessOtp = action({
  args: { email: v.string(), orderNumber: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    const order = await ctx.runQuery(internal.orders.getPurchaseForOtp, {
      email: args.email,
      orderNumber: args.orderNumber,
    });
    if (!order) {
      throw new ConvexError({ code: "NOT_FOUND", message: "No order found with this email and order number." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp + args.email).digest("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await ctx.runMutation(internal.orders.saveOtp, {
      email: args.email,
      orderNumber: args.orderNumber,
      otpHash,
      expiresAt,
    });

    await ctx.runAction(internal.email.sendOtpEmail, {
      email: args.email,
      otp,
      orderNumber: args.orderNumber,
      customerName: order.customerName,
    });

    return { sent: true };
  },
});

// ─── Verify OTP ────────────────────────────────────────────────────────────────

export const verifyAccessOtp = action({
  args: { email: v.string(), orderNumber: v.string(), otp: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; token: string }> => {
    const otpHash = crypto.createHash("sha256").update(args.otp + args.email).digest("hex");

    const result = await ctx.runMutation(internal.orders.verifyOtpAndGetOrder, {
      email: args.email,
      orderNumber: args.orderNumber,
      otpHash,
    });

    if (!result.success) {
      throw new ConvexError({ code: "BAD_REQUEST", message: result.error });
    }

    return { success: true, token: result.token };
  },
});

// ─── Resend delivery email (admin) ────────────────────────────────────────────

export const resendDeliveryEmail = action({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args): Promise<{ sent: boolean }> => {
    await requireAdminAction(ctx);
    await ctx.runAction(internal.email.sendDeliveryEmailByOrderId, {
      orderId: args.orderId,
    });
    return { sent: true };
  },
});
