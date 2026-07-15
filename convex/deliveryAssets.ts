// Delivery assets backend — V8 runtime
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";

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

// Resolve a single asset — replaces storageId with a fresh signed URL
async function resolveAsset(ctx: QueryCtx | MutationCtx, asset: Doc<"deliveryAssets">) {
  if (asset.storageId) {
    const url = await ctx.storage.getUrl(asset.storageId as Parameters<typeof ctx.storage.getUrl>[0]);
    return { ...asset, url: url ?? asset.url };
  }
  return asset;
}

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const assets = await ctx.db
      .query("deliveryAssets")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const sorted = assets.sort((a, b) => a.displayOrder - b.displayOrder);
    return await Promise.all(sorted.map((a) => resolveAsset(ctx, a)));
  },
});

// Generate an upload URL for the admin to upload a delivery file
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("deliveryAssets")),
    productId: v.id("products"),
    name: v.string(),
    deliveryType: v.string(),
    url: v.string(),
    storageId: v.optional(v.string()),
    fileName: v.optional(v.string()),
    instructions: v.optional(v.string()),
    displayOrder: v.number(),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...data } = args;
    if (id) {
      // If a new file was uploaded, delete the old stored file
      if (args.storageId) {
        const existing = await ctx.db.get(id);
        if (existing?.storageId && existing.storageId !== args.storageId) {
          await ctx.storage.delete(existing.storageId as Parameters<typeof ctx.storage.delete>[0]);
        }
      }
      await ctx.db.patch(id, data);
      return id;
    }
    return await ctx.db.insert("deliveryAssets", data);
  },
});

export const remove = mutation({
  args: { id: v.id("deliveryAssets") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const asset = await ctx.db.get(args.id);
    if (asset?.storageId) {
      // Clean up stored file when asset is deleted
      await ctx.storage.delete(asset.storageId as Parameters<typeof ctx.storage.delete>[0]);
    }
    await ctx.db.delete(args.id);
  },
});

// Public: resolve delivery assets for a paid order (used by thank-you + access pages)
export const resolveForOrder = query({
  args: { productIds: v.array(v.id("products")) },
  handler: async (ctx, args) => {
    const result: Record<string, Array<Doc<"deliveryAssets"> & { url: string }>> = {};
    for (const pid of args.productIds) {
      const assets = await ctx.db
        .query("deliveryAssets")
        .withIndex("by_product", (q) => q.eq("productId", pid))
        .collect();
      const enabled = assets.filter((a) => a.enabled).sort((a, b) => a.displayOrder - b.displayOrder);
      result[pid] = await Promise.all(enabled.map((a) => resolveAsset(ctx, a)));
    }
    return result;
  },
});
