// Analytics backend — V8 runtime
import { query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { QueryCtx } from "./_generated/server";

async function requireAdmin(ctx: QueryCtx) {
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

// rangeMs: 0 = all time, otherwise ms from now (e.g. 7 * 86400000)
export const getSalesData = query({
  args: { rangeMs: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Fetch most recent 2000 paid orders using the status index
    const allPaid = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .order("desc")
      .take(2000);

    const cutoff = args.rangeMs > 0 ? Date.now() - args.rangeMs : 0;
    const orders = cutoff > 0
      ? allPaid.filter((o) => o._creationTime >= cutoff)
      : allPaid;

    // ── Stat cards ─────────────────────────────────────────────────────────────
    // amountInPaise / 100 = ₹ INR
    const totalRevenuePaise = orders.reduce((s, o) => s + o.amountInPaise, 0);
    const totalOrders = orders.length;
    const avgOrderValuePaise = totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0;
    const totalItemsSold = orders.reduce(
      (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0),
      0
    );

    // ── Revenue by day ─────────────────────────────────────────────────────────
    const dayMap: Record<string, number> = {};
    const ordersCountByDay: Record<string, number> = {};
    for (const o of orders) {
      const day = new Date(o._creationTime).toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] ?? 0) + o.amountInPaise;
      ordersCountByDay[day] = (ordersCountByDay[day] ?? 0) + 1;
    }
    const revenueByDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amountInPaise]) => ({
        date,
        revenue: Math.round(amountInPaise / 100),          // ₹
        orders: ordersCountByDay[date] ?? 0,
      }));

    // ── Top products by revenue ────────────────────────────────────────────────
    const productMap: Record<string, { productName: string; revenueInr: number; unitsSold: number }> = {};
    for (const o of orders) {
      for (const item of o.items) {
        const key = String(item.productId);
        if (!productMap[key]) {
          productMap[key] = { productName: item.productName, revenueInr: 0, unitsSold: 0 };
        }
        productMap[key].revenueInr += item.price * item.quantity;
        productMap[key].unitsSold += item.quantity;
      }
    }
    const topProducts = Object.entries(productMap)
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenueInr - a.revenueInr)
      .slice(0, 6);

    // ── Recent orders ──────────────────────────────────────────────────────────
    const recentOrders = allPaid.slice(0, 12).map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber ?? "",
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      amountInr: Math.round(o.amountInPaise / 100),
      itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
      _creationTime: o._creationTime,
    }));

    return {
      totalRevenueInr: Math.round(totalRevenuePaise / 100),
      totalOrders,
      avgOrderValueInr: Math.round(avgOrderValuePaise / 100),
      totalItemsSold,
      revenueByDay,
      topProducts,
      recentOrders,
    };
  },
});
