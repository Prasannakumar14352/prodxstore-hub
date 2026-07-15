import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ─── Queries ─────────────────────────────────────────────────────────────────

export const listActive = query({
  args: {},
  handler: async (ctx): Promise<Doc<"aiTestimonials">[]> => {
    return await ctx.db
      .query("aiTestimonials")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
  },
});

export const listByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<Doc<"aiTestimonials">[]> => {
    return await ctx.db
      .query("aiTestimonials")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("aiTestimonials") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    await ctx.db.delete(args.id);
  },
});

export const toggleStatus = mutation({
  args: { id: v.id("aiTestimonials") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthorized");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new Error("Not found");
    await ctx.db.patch(args.id, {
      status: doc.status === "active" ? "hidden" : "active",
    });
  },
});

// Internal save used by AI generation action
export const saveGenerated = internalMutation({
  args: {
    productId: v.id("products"),
    productName: v.string(),
    productSlug: v.string(),
    type: v.union(v.literal("review"), v.literal("whatsapp"), v.literal("email")),
    reviewerName: v.optional(v.string()),
    reviewerInitials: v.optional(v.string()),
    reviewerRole: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewTitle: v.optional(v.string()),
    reviewBody: v.optional(v.string()),
    whatsappBuyerName: v.optional(v.string()),
    whatsappBuyerInitials: v.optional(v.string()),
    whatsappMessages: v.optional(
      v.array(
        v.object({
          sender: v.union(v.literal("buyer"), v.literal("seller")),
          text: v.string(),
          time: v.string(),
        })
      )
    ),
    emailSender: v.optional(v.string()),
    emailInitials: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args): Promise<Id<"aiTestimonials">> => {
    return await ctx.db.insert("aiTestimonials", {
      ...args,
      status: "active",
    });
  },
});
