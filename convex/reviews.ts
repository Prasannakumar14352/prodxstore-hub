// V8 runtime — reviews queries and mutations
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

// ─── Helper: generate a unique hex token ──────────────────────────────────────

function generateToken(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Helper: normalize a review doc for the public client ────────────────────

type PublicReview = {
  _id: Id<"reviews">;
  _creationTime: number;
  productId: Id<"products">;
  customerName: string;
  rating: number;
  title?: string;
  body: string;
  isVerifiedBuyer: boolean;
  isFeatured: boolean;
  helpful: number;
  mediaUrls?: string[];
  mediaTypes?: string[];
  mediaLabels?: string[];
};

function toPublicReview(r: Doc<"reviews">, mediaUrls?: (string | null)[]): PublicReview {
  return {
    _id: r._id,
    _creationTime: r._creationTime,
    productId: r.productId,
    customerName: r.customerName,
    rating: r.rating,
    // Prefer AI-polished version if available
    title: r.aiTitle ?? r.title,
    body: r.aiBody ?? r.body,
    isVerifiedBuyer: r.isVerifiedBuyer,
    isFeatured: r.isFeatured ?? false,
    helpful: r.helpful ?? 0,
    mediaUrls: mediaUrls?.filter((u): u is string => u !== null),
    mediaTypes: r.mediaTypes,
    mediaLabels: r.mediaLabels,
  };
}

// ─── Helper: require admin identity ──────────────────────────────────────────

async function assertAdmin(ctx: QueryCtx | MutationCtx) {
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

// ─── Query: reviews for a product (public) ────────────────────────────────────

export const getByProduct = query({
  args: {
    productId: v.id("products"),
    statusFilter: v.optional(v.union(v.literal("approved"), v.literal("all"))),
    sort: v.optional(
      v.union(v.literal("newest"), v.literal("highest"), v.literal("helpful"))
    ),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<PublicReview[]> => {
    const statusFilter = args.statusFilter ?? "approved";
    const sort = args.sort ?? "newest";

    let reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    if (statusFilter === "approved") {
      reviews = reviews.filter((r) => r.status === "approved");
    }
    if (args.verifiedOnly) {
      reviews = reviews.filter((r) => r.isVerifiedBuyer);
    }

    const sortKey = (r: Doc<"reviews">): number => {
      if (sort === "highest") return r.rating;
      if (sort === "helpful") return r.helpful ?? 0;
      return r._creationTime;
    };

    reviews.sort((a, b) => {
      if (a.isVerifiedBuyer !== b.isVerifiedBuyer) return a.isVerifiedBuyer ? -1 : 1;
      return sortKey(b) - sortKey(a);
    });

    // Resolve storage IDs → URLs for reviews that have media
    return await Promise.all(
      reviews.map(async (r) => {
        if (!r.mediaStorageIds?.length) return toPublicReview(r);
        const urls = await Promise.all(
          r.mediaStorageIds.map((id) => ctx.storage.getUrl(id))
        );
        return toPublicReview(r, urls);
      })
    );
  },
});

// ─── Query: rating statistics for a product (public) ─────────────────────────

export const getRatingStats = query({
  args: { productId: v.id("products") },
  handler: async (
    ctx,
    args
  ): Promise<{
    average: number;
    total: number;
    breakdown: Record<1 | 2 | 3 | 4 | 5, number>;
  }> => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const approved = reviews.filter((r) => r.status === "approved");
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of approved) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      breakdown[star] += 1;
      sum += r.rating;
    }
    const total = approved.length;
    const average = total > 0 ? Math.round((sum / total) * 10) / 10 : 0;
    return { average, total, breakdown };
  },
});

// ─── Query: single review by token (public, for email link prefill) ───────────

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<PublicReview | null> => {
    const review = await ctx.db
      .query("reviews")
      .withIndex("by_token", (q) => q.eq("reviewToken", args.token))
      .unique();
    return review ? toPublicReview(review) : null;
  },
});

// ─── Query: admin — all reviews with full fields ──────────────────────────────

export const adminList = query({
  args: {
    statusFilter: v.optional(
      v.union(
        v.literal("all"),
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("hidden")
      )
    ),
  },
  handler: async (ctx, args): Promise<Doc<"reviews">[]> => {
    await assertAdmin(ctx);
    const all = await ctx.db.query("reviews").order("desc").take(500);
    const filter = args.statusFilter ?? "all";
    if (filter === "all") return all;
    return all.filter((r) => r.status === filter);
  },
});

// ─── Query: admin — pending count (for badge) ─────────────────────────────────

export const pendingCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "super_admin")) return 0;
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();
    return rows.length;
  },
});

// ─── Mutation: submit a review (public) ───────────────────────────────────────

export const submit = mutation({
  args: {
    productId: v.id("products"),
    customerName: v.string(),
    customerEmail: v.string(),
    rating: v.number(),
    title: v.optional(v.string()),
    body: v.string(),
    orderToken: v.optional(v.string()),
    // Optional media uploads (max 5 files)
    mediaStorageIds: v.optional(v.array(v.id("_storage"))),
    mediaTypes: v.optional(v.array(v.string())),
    mediaLabels: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ reviewId: Id<"reviews"> }> => {
    const name = args.customerName.trim();
    const email = args.customerEmail.trim();
    const body = args.body.trim();
    const title = args.title?.trim();

    if (!name) throw new ConvexError({ code: "BAD_REQUEST", message: "Please enter your name." });
    if (!Number.isInteger(args.rating) || args.rating < 1 || args.rating > 5) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Please select a rating between 1 and 5 stars." });
    }

    // Read configurable min review length from settings
    const minLength = await ctx.runQuery(internal.settings.getMinReviewLength, {});
    if (body.length < minLength) {
      throw new ConvexError({ code: "BAD_REQUEST", message: `Your review must be at least ${minLength} characters long.` });
    }
    // Cap media at 5 files
    if (args.mediaStorageIds && args.mediaStorageIds.length > 5) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Maximum 5 media files allowed per review." });
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found." });

    let orderId: Id<"orders"> | undefined;
    let orderNumber: string | undefined;
    let isVerifiedBuyer = false;
    let resolvedEmail = email;

    if (args.orderToken) {
      const orderToken = args.orderToken;
      const tokenDoc = await ctx.db
        .query("purchaseTokens")
        .withIndex("by_token", (q) => q.eq("token", orderToken))
        .unique();
      if (tokenDoc) {
        const order = await ctx.db.get(tokenDoc.orderId);
        if (
          order &&
          order.status === "paid" &&
          order.items.some((i) => i.productId === args.productId)
        ) {
          orderId = order._id;
          orderNumber = order.orderNumber ?? undefined;
          isVerifiedBuyer = true;
          if (!resolvedEmail) resolvedEmail = order.customerEmail;
        }
      }
    }

    // Determine status based on approval mode setting
    const approvalMode = await ctx.runQuery(internal.settings.getReviewApprovalMode, {});
    const initialStatus = approvalMode === "auto" ? "approved" : "pending";

    const reviewId = await ctx.db.insert("reviews", {
      productId: args.productId,
      orderId,
      orderNumber,
      customerName: name,
      customerEmail: resolvedEmail,
      rating: args.rating,
      title: title || undefined,
      body,
      status: initialStatus,
      isVerifiedBuyer,
      isFeatured: false,
      helpful: 0,
      reviewToken: generateToken(8),
      reviewTokenUsed: false,
      mediaStorageIds: args.mediaStorageIds ?? [],
      mediaTypes: args.mediaTypes ?? [],
      mediaLabels: args.mediaLabels ?? [],
    });

    return { reviewId };
  },
});

// ─── Mutation: mark a review as helpful (public) ─────────────────────────────

export const markHelpful = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args): Promise<{ helpful: number }> => {
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError({ code: "NOT_FOUND", message: "Review not found." });
    const helpful = (review.helpful ?? 0) + 1;
    await ctx.db.patch(args.reviewId, { helpful });
    return { helpful };
  },
});

// ─── Mutation: admin — update review status ───────────────────────────────────

export const adminSetStatus = mutation({
  args: {
    reviewId: v.id("reviews"),
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("hidden"),
      v.literal("pending")
    ),
  },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    await ctx.db.patch(args.reviewId, { status: args.status });
  },
});

// ─── Mutation: admin — toggle featured ───────────────────────────────────────

export const adminToggleFeatured = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review) throw new ConvexError({ code: "NOT_FOUND", message: "Review not found." });
    await ctx.db.patch(args.reviewId, { isFeatured: !(review.isFeatured ?? false) });
  },
});

// ─── Mutation: admin — delete review ─────────────────────────────────────────

export const adminDelete = mutation({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args) => {
    await assertAdmin(ctx);
    // Delete media files from storage too
    const review = await ctx.db.get(args.reviewId);
    if (review?.mediaStorageIds?.length) {
      for (const sid of review.mediaStorageIds) {
        await ctx.storage.delete(sid);
      }
    }
    await ctx.db.delete(args.reviewId);
  },
});

// ─── Query: admin — resolve media URLs for a single review ───────────────────

export const adminGetMediaUrls = query({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args): Promise<string[]> => {
    await assertAdmin(ctx);
    const review = await ctx.db.get(args.reviewId);
    if (!review?.mediaStorageIds?.length) return [];
    const urls = await Promise.all(
      review.mediaStorageIds.map((id) => ctx.storage.getUrl(id))
    );
    return urls.filter((u): u is string => u !== null);
  },
});

// ─── Internal mutation: save AI polish results ────────────────────────────────

export const saveAiPolish = internalMutation({
  args: {
    reviewId: v.id("reviews"),
    aiTitle: v.optional(v.string()),
    aiBody: v.optional(v.string()),
    aiCategory: v.optional(v.string()),
    aiSpamScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { reviewId, ...fields } = args;
    await ctx.db.patch(reviewId, { ...fields, aiProcessed: true });
  },
});

// ─── Internal query: get full review for AI processing ───────────────────────

export const getForAi = internalQuery({
  args: { reviewId: v.id("reviews") },
  handler: async (ctx, args): Promise<Doc<"reviews"> | null> => {
    return await ctx.db.get(args.reviewId);
  },
});
