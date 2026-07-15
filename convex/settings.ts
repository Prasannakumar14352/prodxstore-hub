import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./users";

// Default fallback rate if live API is unavailable and admin hasn't set one
const DEFAULT_FALLBACK_RATE = 0.012; // ~1 INR = 0.012 USD

/** Get a setting value by key (public) */
export const get = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .unique();
    return row?.value ?? null;
  },
});

// ─── Exchange Rate ─────────────────────────────────────────────────────────────

/** Get the fallback exchange rate (INR → USD) */
export const getFallbackRate = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "fallback_exchange_rate"))
      .unique();
    if (!row) return DEFAULT_FALLBACK_RATE;
    const parsed = parseFloat(row.value);
    return isNaN(parsed) ? DEFAULT_FALLBACK_RATE : parsed;
  },
});

/** Internal version for use from actions (e.g. email) */
export const getFallbackRateInternal = internalQuery({
  args: {},
  handler: async (ctx): Promise<number> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "fallback_exchange_rate"))
      .unique();
    if (!row) return DEFAULT_FALLBACK_RATE;
    const parsed = parseFloat(row.value);
    return isNaN(parsed) ? DEFAULT_FALLBACK_RATE : parsed;
  },
});

export const setFallbackRate = mutation({
  args: { rate: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (args.rate <= 0 || args.rate > 1) {
      throw new ConvexError({ message: "Rate must be between 0 and 1 (e.g. 0.012 for ₹1 = $0.012)", code: "BAD_REQUEST" });
    }

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "fallback_exchange_rate"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { value: String(args.rate) });
    } else {
      await ctx.db.insert("settings", { key: "fallback_exchange_rate", value: String(args.rate) });
    }
  },
});

// ─── Razorpay Config ──────────────────────────────────────────────────────────

/** Get Razorpay Key ID only (safe to expose to frontend for checkout popup) */
export const getRazorpayKeyId = query({
  args: {},
  handler: async (ctx): Promise<string | null> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "razorpay_key_id"))
      .unique();
    return row?.value ?? process.env.RAZORPAY_KEY_ID ?? null;
  },
});

/** Internal: get both Razorpay credentials for server-side use */
export const getRazorpayKeysInternal = internalQuery({
  args: {},
  handler: async (ctx): Promise<{ keyId: string; keySecret: string } | null> => {
    const [keyIdRow, keySecretRow] = await Promise.all([
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "razorpay_key_id")).unique(),
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "razorpay_key_secret")).unique(),
    ]);
    const keyId = keyIdRow?.value ?? process.env.RAZORPAY_KEY_ID;
    const keySecret = keySecretRow?.value ?? process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return null;
    return { keyId, keySecret };
  },
});

/** Admin: save Razorpay credentials to DB */
export const setRazorpayKeys = mutation({
  args: { keyId: v.string(), keySecret: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    if (!args.keyId.startsWith("rzp_")) {
      throw new ConvexError({ message: "Key ID must start with 'rzp_'", code: "BAD_REQUEST" });
    }
    if (args.keySecret.length < 10) {
      throw new ConvexError({ message: "Key Secret appears too short", code: "BAD_REQUEST" });
    }

    // Use inline upsert to avoid complex ctx type threading
    const upsert = async (key: string, value: string) => {
      const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
      if (existing) {
        await ctx.db.patch(existing._id, { value });
      } else {
        await ctx.db.insert("settings", { key, value });
      }
    };

    await upsert("razorpay_key_id", args.keyId);
    await upsert("razorpay_key_secret", args.keySecret);
  },
});

// ─── Review request email helpers (internal) ─────────────────────────────────

/** Get the review request delay in days (default 3) */
export const getReviewDelayDays = internalQuery({
  args: {},
  handler: async (ctx): Promise<number> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_request_delay_days"))
      .unique();
    if (!row) return 3;
    const parsed = parseInt(row.value, 10);
    return isNaN(parsed) || parsed < 0 ? 3 : parsed;
  },
});

/** Get whether review request emails are enabled (default true) */
export const getReviewEmailEnabled = internalQuery({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_email_enabled"))
      .unique();
    // Enabled unless explicitly set to "false"
    return row?.value !== "false";
  },
});

/** Admin: get review request settings for display in admin panel */
export const getReviewEmailSettings = query({
  args: {},
  handler: async (ctx): Promise<{ enabled: boolean; delayDays: number }> => {
    await requireAdmin(ctx);
    const [enabledRow, delayRow] = await Promise.all([
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "review_email_enabled")).unique(),
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "review_request_delay_days")).unique(),
    ]);
    const enabled = enabledRow?.value !== "false";
    const delayDays = delayRow ? (parseInt(delayRow.value, 10) || 3) : 3;
    return { enabled, delayDays };
  },
});

/** Admin: update review request settings */
export const setReviewEmailSettings = mutation({
  args: { enabled: v.boolean(), delayDays: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(args.delayDays) || args.delayDays < 0 || args.delayDays > 365) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Delay must be between 0 and 365 days" });
    }

    const upsert = async (key: string, value: string) => {
      const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    };

    await upsert("review_email_enabled", args.enabled ? "true" : "false");
    await upsert("review_request_delay_days", String(args.delayDays));
  },
});

// ─── Review behaviour settings ────────────────────────────────────────────────

/** Internal: get minimum review body length (default 20) */
export const getMinReviewLength = internalQuery({
  args: {},
  handler: async (ctx): Promise<number> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_min_length"))
      .unique();
    if (!row) return 20;
    const n = parseInt(row.value, 10);
    return isNaN(n) || n < 1 ? 20 : n;
  },
});

/** Internal: get approval mode ("manual" | "auto") — default "manual" */
export const getReviewApprovalMode = internalQuery({
  args: {},
  handler: async (ctx): Promise<"manual" | "auto"> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_approval_mode"))
      .unique();
    return row?.value === "auto" ? "auto" : "manual";
  },
});

/** Internal: get whether AI polish is enabled (default true) */
export const getAiPolishEnabled = internalQuery({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_ai_polish_enabled"))
      .unique();
    return row?.value !== "false";
  },
});

/** Public: get whether to show empty review sections (default true) */
export const getShowEmptyReviews = query({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "review_show_empty_section"))
      .unique();
    return row?.value !== "false";
  },
});

/** Admin: get all review behaviour settings */
export const getReviewSettings = query({
  args: {},
  handler: async (ctx): Promise<{
    minLength: number;
    approvalMode: "manual" | "auto";
    aiPolishEnabled: boolean;
    showEmptySection: boolean;
  }> => {
    await requireAdmin(ctx);
    const keys = [
      "review_min_length",
      "review_approval_mode",
      "review_ai_polish_enabled",
      "review_show_empty_section",
    ];
    const rows = await Promise.all(
      keys.map((k) =>
        ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", k)).unique()
      )
    );
    const [minLengthRow, approvalRow, aiRow, showEmptyRow] = rows;
    return {
      minLength: minLengthRow ? (parseInt(minLengthRow.value, 10) || 20) : 20,
      approvalMode: approvalRow?.value === "auto" ? "auto" : "manual",
      aiPolishEnabled: aiRow?.value !== "false",
      showEmptySection: showEmptyRow?.value !== "false",
    };
  },
});

/** Admin: save review behaviour settings */
export const setReviewSettings = mutation({
  args: {
    minLength: v.number(),
    approvalMode: v.union(v.literal("manual"), v.literal("auto")),
    aiPolishEnabled: v.boolean(),
    showEmptySection: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(args.minLength) || args.minLength < 1 || args.minLength > 500) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Min length must be between 1 and 500" });
    }

    const upsert = async (key: string, value: string) => {
      const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    };

    await upsert("review_min_length", String(args.minLength));
    await upsert("review_approval_mode", args.approvalMode);
    await upsert("review_ai_polish_enabled", args.aiPolishEnabled ? "true" : "false");
    await upsert("review_show_empty_section", args.showEmptySection ? "true" : "false");
  },
});

// ─── Trust Badge Settings ─────────────────────────────────────────────────────

export type TrustBadgeSettings = {
  moneyBackDays: number;
  showMoneyBack: boolean;
  showSecureCheckout: boolean;
  showInstantDelivery: boolean;
  showBuyerCount: boolean;
};

const TRUST_BADGE_DEFAULTS: TrustBadgeSettings = {
  moneyBackDays: 30,
  showMoneyBack: true,
  showSecureCheckout: true,
  showInstantDelivery: true,
  showBuyerCount: true,
};

/** Public: get trust badge settings */
export const getTrustBadgeSettings = query({
  args: {},
  handler: async (ctx): Promise<TrustBadgeSettings> => {
    const keys = [
      "trust_money_back_days",
      "trust_show_money_back",
      "trust_show_secure_checkout",
      "trust_show_instant_delivery",
      "trust_show_buyer_count",
    ];
    const rows = await Promise.all(
      keys.map((k) => ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", k)).unique())
    );
    const [daysRow, moneyBackRow, secureRow, deliveryRow, buyerRow] = rows;
    return {
      moneyBackDays: daysRow ? (parseInt(daysRow.value, 10) || 30) : 30,
      showMoneyBack: moneyBackRow?.value !== "false",
      showSecureCheckout: secureRow?.value !== "false",
      showInstantDelivery: deliveryRow?.value !== "false",
      showBuyerCount: buyerRow?.value !== "false",
    };
  },
});

/** Admin: save trust badge settings */
export const setTrustBadgeSettings = mutation({
  args: {
    moneyBackDays: v.number(),
    showMoneyBack: v.boolean(),
    showSecureCheckout: v.boolean(),
    showInstantDelivery: v.boolean(),
    showBuyerCount: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isInteger(args.moneyBackDays) || args.moneyBackDays < 1 || args.moneyBackDays > 365) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Money-back days must be 1–365" });
    }

    const upsert = async (key: string, value: string) => {
      const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    };

    await upsert("trust_money_back_days", String(args.moneyBackDays));
    await upsert("trust_show_money_back", args.showMoneyBack ? "true" : "false");
    await upsert("trust_show_secure_checkout", args.showSecureCheckout ? "true" : "false");
    await upsert("trust_show_instant_delivery", args.showInstantDelivery ? "true" : "false");
    await upsert("trust_show_buyer_count", args.showBuyerCount ? "true" : "false");
  },
});

/** Admin: get current Razorpay key ID (masked secret) for display */
export const getRazorpayConfig = query({
  args: {},
  handler: async (ctx): Promise<{ keyId: string | null; hasSecret: boolean; mode: "test" | "live" | "none" }> => {
    await requireAdmin(ctx);

    const [keyIdRow, keySecretRow] = await Promise.all([
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "razorpay_key_id")).unique(),
      ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "razorpay_key_secret")).unique(),
    ]);

    const keyId = keyIdRow?.value ?? process.env.RAZORPAY_KEY_ID ?? null;
    const hasSecret = !!(keySecretRow?.value ?? process.env.RAZORPAY_KEY_SECRET);
    const mode = keyId
      ? keyId.includes("_test_") ? "test" : "live"
      : "none";

    return { keyId, hasSecret, mode };
  },
});
