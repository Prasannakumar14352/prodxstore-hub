import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdmin } from "./users";

// ─── Admin: list all affiliates ──────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("affiliates").collect();
  },
});

// ─── Admin: upsert (create or update) ───────────────────────────────────────

export const upsert = mutation({
  args: {
    id: v.optional(v.id("affiliates")),
    name: v.string(),
    code: v.string(),
    email: v.optional(v.string()),
    enabled: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const code = args.code.toLowerCase().trim().replace(/[^a-z0-9-_]/g, "");
    if (!code) throw new ConvexError({ code: "BAD_REQUEST", message: "Invalid affiliate code." });

    // Check uniqueness
    const existing = await ctx.db
      .query("affiliates")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    if (existing && existing._id !== args.id) {
      throw new ConvexError({ code: "CONFLICT", message: `Code "${code}" is already taken.` });
    }

    if (args.id) {
      await ctx.db.patch(args.id, {
        name: args.name,
        code,
        email: args.email,
        enabled: args.enabled,
        notes: args.notes,
      });
      return args.id;
    } else {
      return await ctx.db.insert("affiliates", {
        name: args.name,
        code,
        email: args.email,
        visits: 0,
        conversions: 0,
        revenueInr: 0,
        enabled: args.enabled,
        notes: args.notes,
      });
    }
  },
});

// ─── Admin: toggle enabled ───────────────────────────────────────────────────

export const toggleEnabled = mutation({
  args: { id: v.id("affiliates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const aff = await ctx.db.get(args.id);
    if (!aff) throw new ConvexError({ code: "NOT_FOUND", message: "Affiliate not found." });
    await ctx.db.patch(args.id, { enabled: !aff.enabled });
  },
});

// ─── Admin: remove ───────────────────────────────────────────────────────────

export const remove = mutation({
  args: { id: v.id("affiliates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// ─── Admin: reset stats ───────────────────────────────────────────────────────

export const resetStats = mutation({
  args: { id: v.id("affiliates") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, { visits: 0, conversions: 0, revenueInr: 0 });
  },
});

// ─── Public: record a visit ───────────────────────────────────────────────────

export const recordVisit = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const aff = await ctx.db
      .query("affiliates")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!aff || !aff.enabled) return null;
    await ctx.db.patch(aff._id, { visits: aff.visits + 1 });
    return { valid: true, code: aff.code, name: aff.name };
  },
});

// ─── Internal: record a conversion after paid order ───────────────────────────

export const recordConversion = internalMutation({
  args: { code: v.string(), revenueInr: v.number() },
  handler: async (ctx, args) => {
    const aff = await ctx.db
      .query("affiliates")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();
    if (!aff) return;
    await ctx.db.patch(aff._id, {
      conversions: aff.conversions + 1,
      revenueInr: aff.revenueInr + args.revenueInr,
    });
  },
});
