// Coupons backend — V8 runtime
import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function requireAdmin(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not logged in" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return user;
}

// ── Public: list active/valid coupons for display at checkout ─────────────────
// Only returns coupons that are enabled, not expired, and not usage-exhausted
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("coupons").collect();
    const now = new Date().toISOString();
    return all.filter((c) => {
      if (!c.enabled) return false;
      if (c.expiresAt && c.expiresAt < now) return false;
      if (c.usageLimit !== undefined && c.usageCount >= c.usageLimit) return false;
      return true;
    }).map((c) => ({
      _id: c._id,
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue,
    }));
  },
});

// ── Admin: list all coupons ───────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("coupons").order("desc").take(200);
  },
});

// ── Admin: create or update ───────────────────────────────────────────────────

export const upsert = mutation({
  args: {
    id: v.optional(v.id("coupons")),
    code: v.string(),
    discountType: v.union(v.literal("percent"), v.literal("flat")),
    discountValue: v.number(),
    usageLimit: v.optional(v.number()),
    expiresAt: v.optional(v.string()),
    minOrderValue: v.optional(v.number()),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const code = args.code.trim().toUpperCase();
    if (!code) throw new ConvexError({ code: "BAD_REQUEST", message: "Code is required" });
    if (args.discountValue <= 0) throw new ConvexError({ code: "BAD_REQUEST", message: "Discount value must be > 0" });
    if (args.discountType === "percent" && args.discountValue > 100) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Percentage cannot exceed 100" });
    }

    const { id, ...rest } = args;

    if (id) {
      await ctx.db.patch(id, { ...rest, code });
      return id;
    }

    // Check for duplicate code
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();
    if (existing) throw new ConvexError({ code: "CONFLICT", message: `Code "${code}" already exists` });

    return await ctx.db.insert("coupons", { ...rest, code, usageCount: 0 });
  },
});

// ── Admin: toggle enabled ─────────────────────────────────────────────────────

export const toggleEnabled = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const c = await ctx.db.get(args.id);
    if (!c) throw new ConvexError({ code: "NOT_FOUND", message: "Coupon not found" });
    await ctx.db.patch(args.id, { enabled: !c.enabled });
  },
});

// ── Admin: delete ─────────────────────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ── Public: validate a code (called from checkout) ────────────────────────────

export const validate = query({
  args: { code: v.string(), cartTotalInr: v.number() },
  handler: async (ctx, args) => {
    const code = args.code.trim().toUpperCase();
    if (!code) return { valid: false as const, error: "Enter a coupon code" };

    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (!coupon) return { valid: false as const, error: "Invalid coupon code" };
    if (!coupon.enabled) return { valid: false as const, error: "This coupon is no longer active" };
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false as const, error: "This coupon has reached its usage limit" };
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { valid: false as const, error: "This coupon has expired" };
    }
    if (coupon.minOrderValue != null && args.cartTotalInr < coupon.minOrderValue) {
      return {
        valid: false as const,
        error: `Minimum order value of ₹${coupon.minOrderValue} required`,
      };
    }

    const discountAmountInr =
      coupon.discountType === "percent"
        ? Math.round((args.cartTotalInr * coupon.discountValue) / 100)
        : Math.min(coupon.discountValue, args.cartTotalInr);

    return {
      valid: true as const,
      couponId: coupon._id,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmountInr,
      message:
        coupon.discountType === "percent"
          ? `${coupon.discountValue}% off applied!`
          : `₹${coupon.discountValue} off applied!`,
    };
  },
});

// ── Internal: increment usage count after successful payment ──────────────────

export const incrementUsage = internalMutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();
    if (coupon) {
      await ctx.db.patch(coupon._id, { usageCount: coupon.usageCount + 1 });
    }
  },
});
