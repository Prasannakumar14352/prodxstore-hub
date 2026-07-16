// ─────────────────────────────────────────────────────────────────────────────
// Supabase-backed API layer.
// Mirrors the old Convex `api.module.fn` surface so components keep working:
// each function is an async function; use with useQuery/useMutation/useAction
// from "@/lib/api/hooks.ts".
// ─────────────────────────────────────────────────────────────────────────────

import { supabase, invokeFunction } from "./supabase.ts";
import { toDoc, toDocs, toRow, check } from "./mappers.ts";
import type {
  ProductDoc, DeliveryAssetDoc, OrderDoc, CouponDoc, AffiliateDoc,
  ReviewDoc, AiTestimonialDoc, UserDoc, SocialProofSettings,
  SocialProofNotification, OrderItem,
} from "./types.ts";
import { SEED_PRODUCTS } from "./seed-data.ts";

// Tag every function with a stable key for react-query caching.
type Fn = (...args: never[]) => Promise<unknown>;
function tag<F extends Fn>(key: string, fn: F): F & { _key: string } {
  return Object.assign(fn, { _key: key });
}

// ─── Settings helpers ─────────────────────────────────────────────────────────

async function getSettingValues(keys: string[]): Promise<Record<string, string>> {
  const rows = check(await supabase.from("settings").select("key, value").in("key", keys));
  const map: Record<string, string> = {};
  for (const r of rows ?? []) map[r.key as string] = r.value as string;
  return map;
}

async function setSetting(key: string, value: string): Promise<void> {
  check(await supabase.rpc("admin_set_setting", { p_key: key, p_value: value }));
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function publicUrl(bucket: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadTo(bucket: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type, upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

async function resolveDeliveryUrl(asset: DeliveryAssetDoc): Promise<DeliveryAssetDoc> {
  if (asset.storagePath) {
    const { data } = await supabase.storage
      .from("delivery-files")
      .createSignedUrl(asset.storagePath, 60 * 60);
    if (data?.signedUrl) return { ...asset, url: data.signedUrl };
  }
  return asset;
}

// ═══════════════════════════ api.products ════════════════════════════════════

const products = {
  list: tag("products.list", async (): Promise<ProductDoc[]> => {
    const rows = check(await supabase.from("products").select("*")
      .order("created_at", { ascending: false }));
    return toDocs<ProductDoc>(rows);
  }),

  getBySlug: tag("products.getBySlug", async (args: { slug: string }): Promise<ProductDoc | null> => {
    const rows = check(await supabase.from("products").select("*").eq("slug", args.slug).limit(1));
    return rows?.[0] ? toDoc<ProductDoc>(rows[0]) : null;
  }),

  getUpsellSuggestions: tag("products.getUpsellSuggestions",
    async (args: { purchasedProductIds: string[] }) => {
      if (args.purchasedProductIds.length === 0) return [];
      const all = toDocs<ProductDoc>(
        check(await supabase.from("products").select("*")),
      );
      const byId = new Map(all.map((p) => [p._id, p]));
      const purchasedSet = new Set(args.purchasedProductIds);
      const purchased = args.purchasedProductIds
        .map((id) => byId.get(id)).filter((p): p is ProductDoc => !!p);
      const categories = new Set(purchased.map((p) => p.category));

      const pinnedIds: string[] = [];
      for (const p of purchased) {
        for (const uid of p.upsellProductIds ?? []) {
          if (!purchasedSet.has(uid) && !pinnedIds.includes(uid)) pinnedIds.push(uid);
        }
      }
      const pinned = pinnedIds.slice(0, 3)
        .map((id) => byId.get(id)).filter((p): p is ProductDoc => !!p);

      const fallback = all.filter(
        (p) => !purchasedSet.has(p._id) && categories.has(p.category) &&
               !pinned.some((x) => x._id === p._id),
      ).slice(0, 3 - pinned.length);

      return [...pinned, ...fallback].slice(0, 3).map((p) => ({
        _id: p._id, name: p.name, slug: p.slug, category: p.category,
        tagline: p.tagline, price: p.price, originalPrice: p.originalPrice,
        image: p.image, badge: p.badge,
      }));
    }),

  setUpsells: tag("products.setUpsells",
    async (args: { productId: string; upsellProductIds: string[] }) => {
      check(await supabase.from("products")
        .update({ upsell_product_ids: args.upsellProductIds })
        .eq("id", args.productId).select("id"));
    }),

  create: tag("products.create", async (args: Omit<ProductDoc, "_id" | "_creationTime">) => {
    const existing = check(await supabase.from("products").select("id").eq("slug", args.slug).limit(1));
    if (existing?.length) throw new Error("A product with this slug already exists.");
    const rows = check(await supabase.from("products").insert(toRow(args)).select("id"));
    return rows?.[0]?.id as string;
  }),

  update: tag("products.update",
    async (args: { id: string } & Omit<ProductDoc, "_id" | "_creationTime">) => {
      const { id, ...fields } = args;
      const existing = check(await supabase.from("products").select("id").eq("slug", fields.slug).limit(1));
      if (existing?.length && existing[0].id !== id) {
        throw new Error("A product with this slug already exists.");
      }
      check(await supabase.from("products").update(toRow(fields)).eq("id", id).select("id"));
    }),

  remove: tag("products.remove", async (args: { id: string }) => {
    check(await supabase.from("products").delete().eq("id", args.id));
  }),

  seed: tag("products.seed", async () => {
    const existing = check(await supabase.from("products").select("id").limit(1));
    if (existing?.length) return;
    const rows = SEED_PRODUCTS.map((p) => toRow(p as unknown as Record<string, unknown>));
    check(await supabase.from("products").insert(rows).select("id"));
  }),
};

// ═══════════════════════════ api.deliveryAssets ══════════════════════════════

const deliveryAssets = {
  listByProduct: tag("deliveryAssets.listByProduct",
    async (args: { productId: string }): Promise<DeliveryAssetDoc[]> => {
      const rows = check(await supabase.from("delivery_assets").select("*")
        .eq("product_id", args.productId).order("display_order"));
      return Promise.all(toDocs<DeliveryAssetDoc>(rows).map(resolveDeliveryUrl));
    }),

  upsert: tag("deliveryAssets.upsert",
    async (args: { id?: string } & Omit<DeliveryAssetDoc, "_id" | "_creationTime">) => {
      const { id, ...data } = args;
      const row = toRow(data);
      if (id) {
        // If a new file replaced the old one, remove the old stored file
        if (data.storagePath || data.storageId) {
          const prev = check(await supabase.from("delivery_assets")
            .select("storage_path").eq("id", id).limit(1));
          const oldPath = prev?.[0]?.storage_path as string | null;
          const newPath = (data.storagePath ?? data.storageId) as string;
          if (oldPath && oldPath !== newPath) {
            await supabase.storage.from("delivery-files").remove([oldPath]);
          }
        }
        check(await supabase.from("delivery_assets").update(row).eq("id", id).select("id"));
        return id;
      }
      const rows = check(await supabase.from("delivery_assets").insert(row).select("id"));
      return rows?.[0]?.id as string;
    }),

  remove: tag("deliveryAssets.remove", async (args: { id: string }) => {
    const prev = check(await supabase.from("delivery_assets")
      .select("storage_path").eq("id", args.id).limit(1));
    const path = prev?.[0]?.storage_path as string | null;
    if (path) await supabase.storage.from("delivery-files").remove([path]);
    check(await supabase.from("delivery_assets").delete().eq("id", args.id));
  }),

  /** Upload a delivery file to Supabase Storage; returns its storage path. */
  uploadFile: tag("deliveryAssets.uploadFile", async (args: { file: File }) => {
    return uploadTo("delivery-files", args.file);
  }),
};

// ═══════════════════════════ api.orders ══════════════════════════════════════

type OrderWithAssets = {
  order: OrderDoc;
  assetsMap: Record<string, Array<DeliveryAssetDoc & { url: string }>>;
} | null;

const orders = {
  // Buyer-facing: goes through an Edge Function (tokens/orders are not
  // client-readable, and delivery files need short-lived signed URLs).
  getOrderByToken: tag("orders.getOrderByToken",
    async (args: { token: string }): Promise<OrderWithAssets> => {
      const res = await invokeFunction<{ order: Record<string, unknown> | null;
        assetsMap: Record<string, Record<string, unknown>[]> }>(
        "get-order-by-token", { token: args.token });
      if (!res?.order) return null;
      const assetsMap: Record<string, Array<DeliveryAssetDoc & { url: string }>> = {};
      for (const [pid, assets] of Object.entries(res.assetsMap ?? {})) {
        assetsMap[pid] = assets.map((a) => toDoc<DeliveryAssetDoc & { url: string }>(a));
      }
      return { order: toDoc<OrderDoc>(res.order), assetsMap };
    }),

  listOrders: tag("orders.listOrders", async (): Promise<OrderDoc[]> => {
    const rows = check(await supabase.from("orders").select("*")
      .order("created_at", { ascending: false }).limit(200));
    return toDocs<OrderDoc>(rows);
  }),

  updateNotes: tag("orders.updateNotes", async (args: { orderId: string; notes: string }) => {
    check(await supabase.from("orders")
      .update({ internal_notes: args.notes }).eq("id", args.orderId).select("id"));
  }),

  deleteOrder: tag("orders.deleteOrder", async (args: { orderId: string }) => {
    // purchase_tokens cascade on delete
    check(await supabase.from("orders").delete().eq("id", args.orderId));
  }),

  exportOrdersCsv: tag("orders.exportOrdersCsv",
    async (args: { status?: "all" | "paid" | "created" | "failed" }) => {
      const filter = args?.status ?? "all";
      let query = supabase.from("orders").select("*")
        .order("created_at", { ascending: false }).limit(2000);
      if (filter !== "all") query = query.eq("status", filter);
      const rows = toDocs<OrderDoc>(check(await query));
      return rows.map((o) => ({
        orderNumber: o.orderNumber ?? o.razorpayOrderId,
        date: new Date(o._creationTime).toISOString().replace("T", " ").slice(0, 19),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerMobile: o.customerMobile ?? "",
        items: o.items.map((i) => `${i.productName}${i.quantity > 1 ? ` x${i.quantity}` : ""}`).join("; "),
        itemCount: o.items.reduce((s, i) => s + i.quantity, 0),
        totalInr: Math.round(o.amountInPaise / 100),
        promoCode: o.promoCode ?? "",
        promoDiscount: o.promoDiscount ? `₹${o.promoDiscount}` : "",
        affiliateCode: o.affiliateCode ?? "",
        status: o.status,
        emailSent: o.emailSent ? "yes" : "no",
        downloads: o.downloadCount ?? 0,
        razorpayOrderId: o.razorpayOrderId,
      }));
    }),

  getProductBuyerCount: tag("orders.getProductBuyerCount",
    async (args: { productId: string }): Promise<number> => {
      const data = check(await supabase.rpc("get_product_buyer_count",
        { p_product_id: args.productId }));
      return (data as number) ?? 0;
    }),

  getAllProductBuyerCounts: tag("orders.getAllProductBuyerCounts",
    async (): Promise<Record<string, number>> => {
      const data = check(await supabase.rpc("get_all_product_buyer_counts"));
      return (data as Record<string, number>) ?? {};
    }),
};

// ═══════════════════════════ api.coupons ═════════════════════════════════════

const coupons = {
  listActive: tag("coupons.listActive", async () => {
    const rows = toDocs<CouponDoc>(
      check(await supabase.from("coupons").select("*").eq("enabled", true)),
    );
    const now = new Date().toISOString();
    return rows
      .filter((c) => (!c.expiresAt || c.expiresAt >= now) &&
                     (c.usageLimit === undefined || c.usageCount < c.usageLimit))
      .map((c) => ({
        _id: c._id, code: c.code, discountType: c.discountType,
        discountValue: c.discountValue, minOrderValue: c.minOrderValue,
      }));
  }),

  list: tag("coupons.list", async (): Promise<CouponDoc[]> => {
    const rows = check(await supabase.from("coupons").select("*")
      .order("created_at", { ascending: false }).limit(200));
    return toDocs<CouponDoc>(rows);
  }),

  validate: tag("coupons.validate",
    async (args: { code: string; cartTotalInr: number }) => {
      const data = check(await supabase.rpc("validate_coupon", {
        p_code: args.code, p_cart_total: args.cartTotalInr,
      }));
      return data as
        | { valid: true; discountType: "percent" | "flat"; discountValue: number;
            discountAmountInr: number; message: string }
        | { valid: false; error: string };
    }),

  upsert: tag("coupons.upsert", async (args: {
    id?: string; code: string; discountType: "percent" | "flat"; discountValue: number;
    usageLimit?: number; expiresAt?: string; minOrderValue?: number; enabled: boolean;
  }) => {
    const code = args.code.trim().toUpperCase();
    if (!code) throw new Error("Code is required");
    if (args.discountValue <= 0) throw new Error("Discount value must be > 0");
    if (args.discountType === "percent" && args.discountValue > 100) {
      throw new Error("Percentage cannot exceed 100");
    }
    const { id, ...rest } = args;
    const row = toRow({ ...rest, code });
    // Explicit nulls so clearing optional fields persists
    row.usage_limit = args.usageLimit ?? null;
    row.expires_at = args.expiresAt ?? null;
    row.min_order_value = args.minOrderValue ?? null;
    if (id) {
      check(await supabase.from("coupons").update(row).eq("id", id).select("id"));
      return id;
    }
    const dup = check(await supabase.from("coupons").select("id").eq("code", code).limit(1));
    if (dup?.length) throw new Error(`Code "${code}" already exists`);
    const rows = check(await supabase.from("coupons")
      .insert({ ...row, usage_count: 0 }).select("id"));
    return rows?.[0]?.id as string;
  }),

  toggleEnabled: tag("coupons.toggleEnabled", async (args: { id: string }) => {
    const rows = check(await supabase.from("coupons").select("enabled").eq("id", args.id).limit(1));
    if (!rows?.length) throw new Error("Coupon not found");
    check(await supabase.from("coupons")
      .update({ enabled: !rows[0].enabled }).eq("id", args.id).select("id"));
  }),

  remove: tag("coupons.remove", async (args: { id: string }) => {
    check(await supabase.from("coupons").delete().eq("id", args.id));
  }),
};

// ═══════════════════════════ api.affiliates ══════════════════════════════════

const affiliates = {
  list: tag("affiliates.list", async (): Promise<AffiliateDoc[]> => {
    const rows = check(await supabase.from("affiliates").select("*")
      .order("created_at", { ascending: false }));
    return toDocs<AffiliateDoc>(rows);
  }),

  upsert: tag("affiliates.upsert", async (args: {
    id?: string; name: string; code: string; email?: string; enabled: boolean; notes?: string;
  }) => {
    const code = args.code.trim().toLowerCase();
    if (!code) throw new Error("Code is required");
    const { id, ...rest } = args;
    const row = toRow({ ...rest, code });
    if (id) {
      check(await supabase.from("affiliates").update(row).eq("id", id).select("id"));
      return id;
    }
    const dup = check(await supabase.from("affiliates").select("id").eq("code", code).limit(1));
    if (dup?.length) throw new Error(`Code "${code}" already exists`);
    const rows = check(await supabase.from("affiliates")
      .insert({ ...row, visits: 0, conversions: 0, revenue_inr: 0 }).select("id"));
    return rows?.[0]?.id as string;
  }),

  toggleEnabled: tag("affiliates.toggleEnabled", async (args: { id: string }) => {
    const rows = check(await supabase.from("affiliates").select("enabled").eq("id", args.id).limit(1));
    if (!rows?.length) throw new Error("Affiliate not found");
    check(await supabase.from("affiliates")
      .update({ enabled: !rows[0].enabled }).eq("id", args.id).select("id"));
  }),

  remove: tag("affiliates.remove", async (args: { id: string }) => {
    check(await supabase.from("affiliates").delete().eq("id", args.id));
  }),

  resetStats: tag("affiliates.resetStats", async (args: { id: string }) => {
    check(await supabase.from("affiliates")
      .update({ visits: 0, conversions: 0, revenue_inr: 0 }).eq("id", args.id).select("id"));
  }),

  recordVisit: tag("affiliates.recordVisit", async (args: { code: string }) => {
    const data = check(await supabase.rpc("record_affiliate_visit", { p_code: args.code }));
    return { valid: !!data, code: args.code };
  }),
};

// ═══════════════════════════ api.settings ════════════════════════════════════

const DEFAULT_FALLBACK_RATE = 0.012;

const settings = {
  getFallbackRate: tag("settings.getFallbackRate", async (): Promise<number> => {
    const map = await getSettingValues(["fallback_exchange_rate"]);
    const parsed = parseFloat(map.fallback_exchange_rate ?? "");
    return isNaN(parsed) ? DEFAULT_FALLBACK_RATE : parsed;
  }),

  setFallbackRate: tag("settings.setFallbackRate", async (args: { rate: number }) => {
    if (args.rate <= 0 || args.rate > 1) {
      throw new Error("Rate must be between 0 and 1 (e.g. 0.012 for ₹1 = $0.012)");
    }
    await setSetting("fallback_exchange_rate", String(args.rate));
  }),

  getRazorpayConfig: tag("settings.getRazorpayConfig", async () => {
    const map = await getSettingValues(["razorpay_key_id", "razorpay_key_secret"]);
    const keyId = map.razorpay_key_id ?? null;
    const hasSecret = !!map.razorpay_key_secret;
    const mode: "test" | "live" | "none" = keyId
      ? (keyId.includes("_test_") ? "test" : "live") : "none";
    return { keyId, hasSecret, mode };
  }),

  setRazorpayKeys: tag("settings.setRazorpayKeys",
    async (args: { keyId: string; keySecret: string }) => {
      if (!args.keyId.startsWith("rzp_")) throw new Error("Key ID must start with 'rzp_'");
      if (args.keySecret.length < 10) throw new Error("Key Secret appears too short");
      await setSetting("razorpay_key_id", args.keyId);
      await setSetting("razorpay_key_secret", args.keySecret);
    }),

  getReviewEmailSettings: tag("settings.getReviewEmailSettings", async () => {
    const map = await getSettingValues(["review_email_enabled", "review_request_delay_days"]);
    return {
      enabled: map.review_email_enabled !== "false",
      delayDays: parseInt(map.review_request_delay_days ?? "", 10) || 3,
    };
  }),

  setReviewEmailSettings: tag("settings.setReviewEmailSettings",
    async (args: { enabled: boolean; delayDays: number }) => {
      if (!Number.isInteger(args.delayDays) || args.delayDays < 0 || args.delayDays > 365) {
        throw new Error("Delay must be between 0 and 365 days");
      }
      await setSetting("review_email_enabled", args.enabled ? "true" : "false");
      await setSetting("review_request_delay_days", String(args.delayDays));
    }),

  getShowEmptyReviews: tag("settings.getShowEmptyReviews", async (): Promise<boolean> => {
    const map = await getSettingValues(["review_show_empty_section"]);
    return map.review_show_empty_section !== "false";
  }),

  getReviewSettings: tag("settings.getReviewSettings", async () => {
    const map = await getSettingValues([
      "review_min_length", "review_approval_mode",
      "review_ai_polish_enabled", "review_show_empty_section",
    ]);
    return {
      minLength: parseInt(map.review_min_length ?? "", 10) || 20,
      approvalMode: (map.review_approval_mode === "auto" ? "auto" : "manual") as "auto" | "manual",
      aiPolishEnabled: map.review_ai_polish_enabled !== "false",
      showEmptySection: map.review_show_empty_section !== "false",
    };
  }),

  setReviewSettings: tag("settings.setReviewSettings", async (args: {
    minLength: number; approvalMode: "manual" | "auto";
    aiPolishEnabled: boolean; showEmptySection: boolean;
  }) => {
    if (!Number.isInteger(args.minLength) || args.minLength < 1 || args.minLength > 500) {
      throw new Error("Min length must be between 1 and 500");
    }
    await setSetting("review_min_length", String(args.minLength));
    await setSetting("review_approval_mode", args.approvalMode);
    await setSetting("review_ai_polish_enabled", args.aiPolishEnabled ? "true" : "false");
    await setSetting("review_show_empty_section", args.showEmptySection ? "true" : "false");
  }),

  getTrustBadgeSettings: tag("settings.getTrustBadgeSettings", async () => {
    const map = await getSettingValues([
      "trust_money_back_days", "trust_show_money_back", "trust_show_secure_checkout",
      "trust_show_instant_delivery", "trust_show_buyer_count",
    ]);
    return {
      moneyBackDays: parseInt(map.trust_money_back_days ?? "", 10) || 30,
      showMoneyBack: map.trust_show_money_back !== "false",
      showSecureCheckout: map.trust_show_secure_checkout !== "false",
      showInstantDelivery: map.trust_show_instant_delivery !== "false",
      showBuyerCount: map.trust_show_buyer_count !== "false",
    };
  }),

  setTrustBadgeSettings: tag("settings.setTrustBadgeSettings", async (args: {
    moneyBackDays: number; showMoneyBack: boolean; showSecureCheckout: boolean;
    showInstantDelivery: boolean; showBuyerCount: boolean;
  }) => {
    if (!Number.isInteger(args.moneyBackDays) || args.moneyBackDays < 1 || args.moneyBackDays > 365) {
      throw new Error("Money-back days must be 1–365");
    }
    await setSetting("trust_money_back_days", String(args.moneyBackDays));
    await setSetting("trust_show_money_back", args.showMoneyBack ? "true" : "false");
    await setSetting("trust_show_secure_checkout", args.showSecureCheckout ? "true" : "false");
    await setSetting("trust_show_instant_delivery", args.showInstantDelivery ? "true" : "false");
    await setSetting("trust_show_buyer_count", args.showBuyerCount ? "true" : "false");
  }),
};

// ═══════════════════════════ api.socialProof ═════════════════════════════════

const SP_DEFAULTS: SocialProofSettings = {
  enabled: true, intervalMin: 20, intervalMax: 40, displayDuration: 6,
  position: "bottom-left", showProductImage: true, showLocation: true,
  showTimeAgo: true, demoMode: false, maxPerSession: 8,
};

const socialProof = {
  getSettings: tag("socialProof.getSettings", async (): Promise<SocialProofSettings> => {
    const keys = Object.keys(SP_DEFAULTS) as (keyof SocialProofSettings)[];
    const map = await getSettingValues(keys.map((k) => `sp_${k}`));
    const val = (k: string) => (`sp_${k}` in map ? map[`sp_${k}`] : null);
    const bool = (k: keyof SocialProofSettings) =>
      val(k) !== null ? val(k) !== "false" : (SP_DEFAULTS[k] as boolean);
    const num = (k: keyof SocialProofSettings) =>
      val(k) !== null ? (parseInt(val(k)!, 10) || (SP_DEFAULTS[k] as number)) : (SP_DEFAULTS[k] as number);
    return {
      enabled: bool("enabled"),
      intervalMin: num("intervalMin"),
      intervalMax: num("intervalMax"),
      displayDuration: num("displayDuration"),
      position: (val("position") as SocialProofSettings["position"]) ?? SP_DEFAULTS.position,
      showProductImage: bool("showProductImage"),
      showLocation: bool("showLocation"),
      showTimeAgo: bool("showTimeAgo"),
      demoMode: val("demoMode") !== null ? val("demoMode") === "true" : SP_DEFAULTS.demoMode,
      maxPerSession: num("maxPerSession"),
    };
  }),

  setSettings: tag("socialProof.setSettings", async (args: SocialProofSettings) => {
    await setSetting("sp_enabled", args.enabled ? "true" : "false");
    await setSetting("sp_intervalMin", String(args.intervalMin));
    await setSetting("sp_intervalMax", String(args.intervalMax));
    await setSetting("sp_displayDuration", String(args.displayDuration));
    await setSetting("sp_position", args.position);
    await setSetting("sp_showProductImage", args.showProductImage ? "true" : "false");
    await setSetting("sp_showLocation", args.showLocation ? "true" : "false");
    await setSetting("sp_showTimeAgo", args.showTimeAgo ? "true" : "false");
    await setSetting("sp_demoMode", args.demoMode ? "true" : "false");
    await setSetting("sp_maxPerSession", String(args.maxPerSession));
  }),

  getRecentPurchases: tag("socialProof.getRecentPurchases",
    async (): Promise<SocialProofNotification[]> => {
      const data = check(await supabase.rpc("get_recent_purchases"));
      return (data as SocialProofNotification[]) ?? [];
    }),
};

// ═══════════════════════════ api.reviews ═════════════════════════════════════

type PublicReview = {
  _id: string; _creationTime: number; productId: string; customerName: string;
  rating: number; title?: string; body: string; isVerifiedBuyer: boolean;
  isFeatured: boolean; helpful: number; mediaUrls?: string[];
  mediaTypes?: string[]; mediaLabels?: string[];
};

function toPublicReview(r: ReviewDoc): PublicReview {
  return {
    _id: r._id,
    _creationTime: r._creationTime,
    productId: r.productId,
    customerName: r.customerName,
    rating: r.rating,
    title: r.aiTitle ?? r.title,
    body: r.aiBody ?? r.body,
    isVerifiedBuyer: r.isVerifiedBuyer,
    isFeatured: r.isFeatured ?? false,
    helpful: r.helpful ?? 0,
    mediaUrls: (r.mediaPaths ?? []).map((p) => publicUrl("review-media", p)),
    mediaTypes: r.mediaTypes,
    mediaLabels: r.mediaLabels,
  };
}

const reviews = {
  getByProduct: tag("reviews.getByProduct", async (args: {
    productId: string;
    statusFilter?: "approved" | "all";
    sort?: "newest" | "highest" | "helpful";
    verifiedOnly?: boolean;
  }): Promise<PublicReview[]> => {
    const sort = args.sort ?? "newest";
    let rows = toDocs<ReviewDoc>(check(
      await supabase.from("reviews").select("*").eq("product_id", args.productId),
    ));
    // RLS already limits non-admins to approved reviews
    if ((args.statusFilter ?? "approved") === "approved") {
      rows = rows.filter((r) => r.status === "approved");
    }
    if (args.verifiedOnly) rows = rows.filter((r) => r.isVerifiedBuyer);
    const key = (r: ReviewDoc) =>
      sort === "highest" ? r.rating : sort === "helpful" ? (r.helpful ?? 0) : r._creationTime;
    rows.sort((a, b) => {
      if (a.isVerifiedBuyer !== b.isVerifiedBuyer) return a.isVerifiedBuyer ? -1 : 1;
      return key(b) - key(a);
    });
    return rows.map(toPublicReview);
  }),

  getRatingStats: tag("reviews.getRatingStats", async (args: { productId: string }) => {
    const rows = toDocs<ReviewDoc>(check(
      await supabase.from("reviews").select("*")
        .eq("product_id", args.productId).eq("status", "approved"),
    ));
    const breakdown: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    for (const r of rows) {
      const star = Math.min(5, Math.max(1, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5;
      breakdown[star] += 1;
      sum += r.rating;
    }
    const total = rows.length;
    return { average: total ? Math.round((sum / total) * 10) / 10 : 0, total, breakdown };
  }),

  submit: tag("reviews.submit", async (args: {
    productId: string; customerName: string; customerEmail: string;
    rating: number; title?: string; body: string; orderToken?: string;
    mediaStorageIds?: string[]; mediaTypes?: string[]; mediaLabels?: string[];
  }) => {
    const data = check(await supabase.rpc("submit_review", {
      p_product_id: args.productId,
      p_customer_name: args.customerName,
      p_customer_email: args.customerEmail,
      p_rating: args.rating,
      p_title: args.title ?? null,
      p_body: args.body,
      p_order_token: args.orderToken ?? null,
      p_media_paths: args.mediaStorageIds ?? [],
      p_media_types: args.mediaTypes ?? [],
      p_media_labels: args.mediaLabels ?? [],
    }));
    return data as { reviewId: string };
  }),

  markHelpful: tag("reviews.markHelpful", async (args: { reviewId: string }) => {
    const data = check(await supabase.rpc("mark_review_helpful", { p_review_id: args.reviewId }));
    return data as { helpful: number };
  }),

  adminList: tag("reviews.adminList", async (args: {
    statusFilter?: "all" | "pending" | "approved" | "rejected" | "hidden";
  }): Promise<ReviewDoc[]> => {
    let query = supabase.from("reviews").select("*")
      .order("created_at", { ascending: false }).limit(500);
    const filter = args?.statusFilter ?? "all";
    if (filter !== "all") query = query.eq("status", filter);
    return toDocs<ReviewDoc>(check(await query));
  }),

  pendingCount: tag("reviews.pendingCount", async (): Promise<number> => {
    // Non-admins can't see pending rows (RLS) → count is 0, same as before
    const { count, error } = await supabase.from("reviews")
      .select("id", { count: "exact", head: true }).eq("status", "pending");
    if (error) return 0;
    return count ?? 0;
  }),

  adminSetStatus: tag("reviews.adminSetStatus", async (args: {
    reviewId: string; status: "pending" | "approved" | "rejected" | "hidden";
  }) => {
    check(await supabase.from("reviews")
      .update({ status: args.status }).eq("id", args.reviewId).select("id"));
  }),

  adminToggleFeatured: tag("reviews.adminToggleFeatured", async (args: { reviewId: string }) => {
    const rows = check(await supabase.from("reviews")
      .select("is_featured").eq("id", args.reviewId).limit(1));
    if (!rows?.length) throw new Error("Review not found");
    check(await supabase.from("reviews")
      .update({ is_featured: !rows[0].is_featured }).eq("id", args.reviewId).select("id"));
  }),

  adminDelete: tag("reviews.adminDelete", async (args: { reviewId: string }) => {
    const rows = check(await supabase.from("reviews")
      .select("media_paths").eq("id", args.reviewId).limit(1));
    const paths = ((rows?.[0]?.media_paths as string[]) ?? [])
      .filter((p) => !/^https?:\/\//.test(p));
    if (paths.length) await supabase.storage.from("review-media").remove(paths);
    check(await supabase.from("reviews").delete().eq("id", args.reviewId));
  }),

  adminGetMediaUrls: tag("reviews.adminGetMediaUrls",
    async (args: { reviewId: string }): Promise<string[]> => {
      const rows = check(await supabase.from("reviews")
        .select("media_paths").eq("id", args.reviewId).limit(1));
      const paths = (rows?.[0]?.media_paths as string[]) ?? [];
      return paths.map((p) => publicUrl("review-media", p));
    }),
};

// ═══════════════════════════ api.reviewsAi / aiTestimonials ══════════════════

const reviewsAi = {
  polishReview: tag("reviewsAi.polishReview", async (args: { reviewId: string }) => {
    return invokeFunction<{
      aiTitle: string; aiBody: string; aiCategory: string; aiSpamScore: number;
    }>("polish-review", { reviewId: args.reviewId });
  }),
};

const aiTestimonials = {
  listActive: tag("aiTestimonials.listActive", async (): Promise<AiTestimonialDoc[]> => {
    const rows = check(await supabase.from("ai_testimonials").select("*").eq("status", "active"));
    return toDocs<AiTestimonialDoc>(rows);
  }),

  listByProduct: tag("aiTestimonials.listByProduct",
    async (args: { productId: string }): Promise<AiTestimonialDoc[]> => {
      const rows = check(await supabase.from("ai_testimonials")
        .select("*").eq("product_id", args.productId));
      return toDocs<AiTestimonialDoc>(rows);
    }),

  toggleStatus: tag("aiTestimonials.toggleStatus", async (args: { id: string }) => {
    const rows = check(await supabase.from("ai_testimonials")
      .select("status").eq("id", args.id).limit(1));
    if (!rows?.length) throw new Error("Not found");
    check(await supabase.from("ai_testimonials")
      .update({ status: rows[0].status === "active" ? "hidden" : "active" })
      .eq("id", args.id).select("id"));
  }),

  remove: tag("aiTestimonials.remove", async (args: { id: string }) => {
    check(await supabase.from("ai_testimonials").delete().eq("id", args.id));
  }),
};

const aiTestimonialsGen = {
  generateForProduct: tag("aiTestimonialsGen.generateForProduct", async (args: {
    productId: string; productName: string; productSlug: string;
    productDescription: string; types: Array<"review" | "whatsapp" | "email">; count: number;
  }) => {
    return invokeFunction<{ generated: number }>("generate-testimonials", args);
  }),
};

// ═══════════════════════════ api.razorpay ════════════════════════════════════

const razorpay = {
  createOrder: tag("razorpay.createOrder", async (args: {
    customerName: string; customerEmail: string; customerMobile?: string;
    items: OrderItem[]; promoCode?: string; promoDiscount?: number;
    finalAmountRupees: number; affiliateCode?: string;
  }) => {
    return invokeFunction<{ orderId: string; amount: number; currency: string; keyId: string }>(
      "razorpay-create-order", args);
  }),

  verifyPayment: tag("razorpay.verifyPayment", async (args: {
    razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string;
  }) => {
    return invokeFunction<{ success: boolean; token: string; orderNumber: string }>(
      "razorpay-verify-payment", args);
  }),

  sendAccessOtp: tag("razorpay.sendAccessOtp",
    async (args: { email: string; orderNumber: string }) => {
      return invokeFunction<{ sent: boolean }>("send-access-otp", args);
    }),

  verifyAccessOtp: tag("razorpay.verifyAccessOtp",
    async (args: { email: string; orderNumber: string; otp: string }) => {
      return invokeFunction<{ success: boolean; token: string }>("verify-access-otp", args);
    }),

  resendDeliveryEmail: tag("razorpay.resendDeliveryEmail",
    async (args: { orderId: string }) => {
      return invokeFunction<{ sent: boolean }>("send-delivery-email", { orderId: args.orderId });
    }),
};

// ═══════════════════════════ api.users ═══════════════════════════════════════

const users = {
  getCurrentUser: tag("users.getCurrentUser", async (): Promise<UserDoc | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    const rows = check(await supabase.from("profiles")
      .select("*").eq("id", session.user.id).limit(1));
    if (!rows?.length) {
      return { _id: session.user.id, _creationTime: Date.now(), email: session.user.email };
    }
    return toDoc<UserDoc>(rows[0]);
  }),
};

// ═══════════════════════════ api.storage ═════════════════════════════════════

const storage = {
  /** Upload a product image; returns its permanent public URL. */
  uploadProductImage: tag("storage.uploadProductImage",
    async (args: { file: File }): Promise<string> => {
      const path = await uploadTo("product-images", args.file);
      return publicUrl("product-images", path);
    }),

  /** Upload review media (guest-allowed); returns the storage path. */
  uploadReviewMedia: tag("storage.uploadReviewMedia",
    async (args: { file: File }): Promise<string> => {
      return uploadTo("review-media", args.file);
    }),
};

// ═══════════════════════════ api.analytics ═══════════════════════════════════

const analytics = {
  getSalesData: tag("analytics.getSalesData", async (args: { rangeMs: number }) => {
    const allPaid = toDocs<OrderDoc>(check(
      await supabase.from("orders").select("*").eq("status", "paid")
        .order("created_at", { ascending: false }).limit(2000),
    ));
    const cutoff = args.rangeMs > 0 ? Date.now() - args.rangeMs : 0;
    const rows = cutoff > 0 ? allPaid.filter((o) => o._creationTime >= cutoff) : allPaid;

    const totalRevenuePaise = rows.reduce((s, o) => s + o.amountInPaise, 0);
    const totalOrders = rows.length;
    const totalItemsSold = rows.reduce(
      (s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0);

    const dayMap: Record<string, number> = {};
    const dayOrders: Record<string, number> = {};
    for (const o of rows) {
      const day = new Date(o._creationTime).toISOString().slice(0, 10);
      dayMap[day] = (dayMap[day] ?? 0) + o.amountInPaise;
      dayOrders[day] = (dayOrders[day] ?? 0) + 1;
    }
    const revenueByDay = Object.entries(dayMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, paise]) => ({
        date, revenue: Math.round(paise / 100), orders: dayOrders[date] ?? 0,
      }));

    const productMap: Record<string, { productName: string; revenueInr: number; unitsSold: number }> = {};
    for (const o of rows) {
      for (const item of o.items) {
        const key = String(item.productId);
        productMap[key] ??= { productName: item.productName, revenueInr: 0, unitsSold: 0 };
        productMap[key].revenueInr += item.price * item.quantity;
        productMap[key].unitsSold += item.quantity;
      }
    }
    const topProducts = Object.entries(productMap)
      .map(([productId, d]) => ({ productId, ...d }))
      .sort((a, b) => b.revenueInr - a.revenueInr).slice(0, 6);

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
      avgOrderValueInr: totalOrders ? Math.round(totalRevenuePaise / totalOrders / 100) : 0,
      totalItemsSold,
      revenueByDay,
      topProducts,
      recentOrders,
    };
  }),
};

// ═══════════════════════════ api.dataExport ══════════════════════════════════

const dataExport = {
  exportAll: tag("dataExport.exportAll", async () => {
    const tables = [
      ["products", "products"], ["deliveryAssets", "delivery_assets"],
      ["orders", "orders"], ["purchaseTokens", "purchase_tokens"],
      ["users", "profiles"], ["reviews", "reviews"],
      ["aiTestimonials", "ai_testimonials"], ["coupons", "coupons"],
      ["affiliates", "affiliates"], ["settings", "settings"],
    ] as const;

    const results = await Promise.all(
      tables.map(([, table]) =>
        supabase.from(table).select("*").limit(2000)
          .then((r) => toDocs<Record<string, unknown>>(check(r))),
      ),
    );

    const out: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    const counts: Record<string, number> = {};
    tables.forEach(([name], i) => {
      out[name] = results[i];
      counts[name] = results[i].length;
    });
    out.counts = counts;
    return out as {
      products: object[]; deliveryAssets: object[]; orders: object[];
      purchaseTokens: object[]; users: object[]; reviews: object[];
      aiTestimonials: object[]; coupons: object[]; affiliates: object[];
      settings: object[]; exportedAt: string; counts: Record<string, number>;
    };
  }),
};

// ═══════════════════════════ export ══════════════════════════════════════════

export const api = {
  products, deliveryAssets, orders, coupons, affiliates, settings, socialProof,
  reviews, reviewsAi, aiTestimonials, aiTestimonialsGen, razorpay, users,
  storage, analytics, dataExport,
};

export { supabase } from "./supabase.ts";
