import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAdmin } from "./users";

/** After uploading, resolve a storageId to its permanent serving URL (admin only) */
export const resolveStorageUrl = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args): Promise<string> => {
    await requireAdmin(ctx);
    const url = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    if (!url) throw new ConvexError({ code: "NOT_FOUND", message: "Storage file not found" });
    return url;
  },
});

/** Resolve a storageId to its public URL (read-only query for display, admin only) */
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args): Promise<string | null> => {
    await requireAdmin(ctx);
    try {
      return await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    } catch {
      return null;
    }
  },
});

/** Generate a short-lived upload URL for Convex File Storage (admin only) */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Generate an upload URL for review media.
 * Gated by a valid purchase token (no login required — buyers are guests).
 * Max 5 files per review, accepted types: image/* and video/mp4.
 */
export const generateReviewMediaUploadUrl = mutation({
  args: { orderToken: v.string() },
  handler: async (ctx, args): Promise<string> => {
    // Verify the token maps to a paid order
    const tokenDoc = await ctx.db
      .query("purchaseTokens")
      .withIndex("by_token", (q) => q.eq("token", args.orderToken))
      .unique();
    if (!tokenDoc) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid purchase token." });
    }
    const order = await ctx.db.get(tokenDoc.orderId);
    if (!order || order.status !== "paid") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Order not verified." });
    }
    return await ctx.storage.generateUploadUrl();
  },
});
