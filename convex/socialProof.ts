import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./users";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocialProofNotification = {
  id: string;
  firstName: string;
  location: string | null;
  productName: string;
  productImage: string;
  purchasedAt: number; // Unix ms
  isDemo: boolean;
};

export type SocialProofSettings = {
  enabled: boolean;
  intervalMin: number;   // seconds between notifications (min)
  intervalMax: number;   // seconds between notifications (max)
  displayDuration: number; // seconds to show each notification
  position: "bottom-left" | "bottom-right" | "bottom-center";
  showProductImage: boolean;
  showLocation: boolean;
  showTimeAgo: boolean;
  demoMode: boolean;
  maxPerSession: number;
};

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULTS: SocialProofSettings = {
  enabled: true,
  intervalMin: 20,
  intervalMax: 40,
  displayDuration: 6,
  position: "bottom-left",
  showProductImage: true,
  showLocation: true,
  showTimeAgo: true,
  demoMode: false,
  maxPerSession: 8,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

// ─── Public: get recent purchases for social proof display ────────────────────
// Returns privacy-safe data only: first name, product name/image, timestamp
// Scoped to last 30 days, paid orders only, max 50

export const getRecentPurchases = query({
  args: {},
  handler: async (ctx): Promise<SocialProofNotification[]> => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const paid = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "paid"))
      .order("desc")
      .take(200);

    // Filter to last 30 days
    const recent = paid.filter((o) => o._creationTime >= thirtyDaysAgo);

    // Build notifications, one per order (first item's product image/name)
    const notifications: SocialProofNotification[] = recent.slice(0, 50).map((o) => {
      const firstItem = o.items[0];
      return {
        id: o._id as string,
        firstName: firstName(o.customerName),
        // No location stored in orders schema — leave null
        location: null,
        productName: firstItem?.productName ?? "a product",
        productImage: "", // filled client-side from product data if needed
        purchasedAt: o._creationTime,
        isDemo: false,
      };
    });

    return notifications;
  },
});

// ─── Public: get social proof settings ───────────────────────────────────────

export const getSettings = query({
  args: {},
  handler: async (ctx): Promise<SocialProofSettings> => {
    const keys: (keyof SocialProofSettings)[] = [
      "enabled", "intervalMin", "intervalMax", "displayDuration",
      "position", "showProductImage", "showLocation", "showTimeAgo",
      "demoMode", "maxPerSession",
    ];

    const rows = await Promise.all(
      keys.map((k) =>
        ctx.db.query("settings")
          .withIndex("by_key", (q) => q.eq("key", `sp_${k}`))
          .unique()
      )
    );

    const val = (i: number) => rows[i]?.value ?? null;

    return {
      enabled:          val(0) !== null ? val(0) !== "false"      : DEFAULTS.enabled,
      intervalMin:      val(1) !== null ? (parseInt(val(1)!, 10) || DEFAULTS.intervalMin)  : DEFAULTS.intervalMin,
      intervalMax:      val(2) !== null ? (parseInt(val(2)!, 10) || DEFAULTS.intervalMax)  : DEFAULTS.intervalMax,
      displayDuration:  val(3) !== null ? (parseInt(val(3)!, 10) || DEFAULTS.displayDuration) : DEFAULTS.displayDuration,
      position:         (val(4) as SocialProofSettings["position"]) ?? DEFAULTS.position,
      showProductImage: val(5) !== null ? val(5) !== "false"      : DEFAULTS.showProductImage,
      showLocation:     val(6) !== null ? val(6) !== "false"      : DEFAULTS.showLocation,
      showTimeAgo:      val(7) !== null ? val(7) !== "false"      : DEFAULTS.showTimeAgo,
      demoMode:         val(8) !== null ? val(8) === "true"       : DEFAULTS.demoMode,
      maxPerSession:    val(9) !== null ? (parseInt(val(9)!, 10)  || DEFAULTS.maxPerSession) : DEFAULTS.maxPerSession,
    };
  },
});

// ─── Admin: save social proof settings ───────────────────────────────────────

export const setSettings = mutation({
  args: {
    enabled:          v.boolean(),
    intervalMin:      v.number(),
    intervalMax:      v.number(),
    displayDuration:  v.number(),
    position:         v.union(v.literal("bottom-left"), v.literal("bottom-right"), v.literal("bottom-center")),
    showProductImage: v.boolean(),
    showLocation:     v.boolean(),
    showTimeAgo:      v.boolean(),
    demoMode:         v.boolean(),
    maxPerSession:    v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const upsert = async (key: string, value: string) => {
      const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", key)).unique();
      if (existing) await ctx.db.patch(existing._id, { value });
      else await ctx.db.insert("settings", { key, value });
    };

    await upsert("sp_enabled",          args.enabled ? "true" : "false");
    await upsert("sp_intervalMin",      String(args.intervalMin));
    await upsert("sp_intervalMax",      String(args.intervalMax));
    await upsert("sp_displayDuration",  String(args.displayDuration));
    await upsert("sp_position",         args.position);
    await upsert("sp_showProductImage", args.showProductImage ? "true" : "false");
    await upsert("sp_showLocation",     args.showLocation ? "true" : "false");
    await upsert("sp_showTimeAgo",      args.showTimeAgo ? "true" : "false");
    await upsert("sp_demoMode",         args.demoMode ? "true" : "false");
    await upsert("sp_maxPerSession",    String(args.maxPerSession));
  },
});
