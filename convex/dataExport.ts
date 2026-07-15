import { query } from "./_generated/server";
import { requireAdmin } from "./users";

/**
 * Full data export for migration purposes.
 * Returns all tables as raw documents (up to 2000 rows per table).
 * Admin only.
 */
export const exportAll = query({
  args: {},
  handler: async (ctx): Promise<{
    products: object[];
    deliveryAssets: object[];
    orders: object[];
    purchaseTokens: object[];
    users: object[];
    reviews: object[];
    aiTestimonials: object[];
    coupons: object[];
    affiliates: object[];
    settings: object[];
    exportedAt: string;
    counts: Record<string, number>;
  }> => {
    await requireAdmin(ctx);

    const [
      products,
      deliveryAssets,
      orders,
      purchaseTokens,
      users,
      reviews,
      aiTestimonials,
      coupons,
      affiliates,
      settings,
    ] = await Promise.all([
      ctx.db.query("products").order("desc").take(2000),
      ctx.db.query("deliveryAssets").take(2000),
      ctx.db.query("orders").order("desc").take(2000),
      ctx.db.query("purchaseTokens").take(2000),
      ctx.db.query("users").take(2000),
      ctx.db.query("reviews").take(2000),
      ctx.db.query("aiTestimonials").take(2000),
      ctx.db.query("coupons").take(2000),
      ctx.db.query("affiliates").take(2000),
      ctx.db.query("settings").take(2000),
    ]);

    const counts: Record<string, number> = {
      products: products.length,
      deliveryAssets: deliveryAssets.length,
      orders: orders.length,
      purchaseTokens: purchaseTokens.length,
      users: users.length,
      reviews: reviews.length,
      aiTestimonials: aiTestimonials.length,
      coupons: coupons.length,
      affiliates: affiliates.length,
      settings: settings.length,
    };

    return {
      products,
      deliveryAssets,
      orders,
      purchaseTokens,
      users,
      reviews,
      aiTestimonials,
      coupons,
      affiliates,
      settings,
      exportedAt: new Date().toISOString(),
      counts,
    };
  },
});
