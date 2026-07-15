import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import { v } from "convex/values";
import type { ActionCtx, QueryCtx, MutationCtx } from "./_generated/server";
import { internalAction, internalMutation, mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";

// Loads the current authenticated user's row, or null if not signed in.
export async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return null;
  return await ctx.db.get(userId);
}

// Throws unless the caller is authenticated with an admin role.
// Every admin-only query/mutation/action must call this first.
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await currentUser(ctx);
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in.",
    });
  }
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have admin access.",
    });
  }
  return user;
}

// Same as requireAdmin, but for actions (which have no direct ctx.db access).
export async function requireAdminAction(ctx: ActionCtx): Promise<Doc<"users">> {
  const user = await ctx.runQuery(api.users.getCurrentUser, {});
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in.",
    });
  }
  if (user.role !== "admin" && user.role !== "super_admin") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have admin access.",
    });
  }
  return user;
}

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return await currentUser(ctx);
  },
});

export const setUserRole = mutation({
  args: {
    targetUserId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("super_admin")),
  },
  handler: async (ctx, args) => {
    const caller = await requireAdmin(ctx);
    if (caller.role !== "super_admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only super_admins can change roles.",
      });
    }
    const target = await ctx.db.get(args.targetUserId);
    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });
    }
    await ctx.db.patch(args.targetUserId, { role: args.role });
  },
});

export const revokeAdmin = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args) => {
    const caller = await requireAdmin(ctx);
    if (caller.role !== "super_admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Only super_admins can change roles.",
      });
    }
    await ctx.db.patch(args.targetUserId, { role: undefined });
  },
});

// Internal: checks whether any admin exists yet. Used only by createFirstAdmin.
export const anyAdminExists = internalMutation({
  args: {},
  handler: async (ctx): Promise<boolean> => {
    const existingAdmin = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("role"), "admin"),
          q.eq(q.field("role"), "super_admin"),
        ),
      )
      .first();
    return existingAdmin !== null;
  },
});

// Internal: promotes a freshly-created account to super_admin. Used only by
// createFirstAdmin, immediately after createAccount.
export const promoteToSuperAdmin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { role: "super_admin" });
  },
});

// Backend-only. Not exposed in any UI. Run once via:
//   npx convex run users:createFirstAdmin '{"email":"you@example.com","password":"..."}'
// Fails if any admin already exists, so it can never be used to add a second
// admin — use setUserRole (super_admin-only, requires being signed in) for that.
export const createFirstAdmin = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<void> => {
    const existingAdmin = await ctx.runMutation(internal.users.anyAdminExists, {});
    if (existingAdmin) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "An admin already exists.",
      });
    }

    const result = await createAccount(ctx, {
      provider: "password",
      account: { id: args.email, secret: args.password },
      profile: { email: args.email },
    });

    await ctx.runMutation(internal.users.promoteToSuperAdmin, {
      userId: result.user._id,
    });
  },
});
