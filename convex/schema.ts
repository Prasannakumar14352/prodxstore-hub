import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  // ─── Users ────────────────────────────────────────────────────────────────
  // Extends Convex Auth's built-in `users` table (id, name, email, ...) with
  // an admin role. Absent role = regular authenticated user, no admin access.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(v.union(v.literal("admin"), v.literal("super_admin"))),
  }).index("email", ["email"]),

  // ─── Products ─────────────────────────────────────────────────────────────
  products: defineTable({
    name: v.string(),
    slug: v.string(),
    category: v.string(),
    tagline: v.string(),
    description: v.string(),
    price: v.number(),
    originalPrice: v.number(),
    badge: v.optional(v.string()),
    features: v.array(v.string()),
    highlights: v.array(v.object({ label: v.string(), value: v.string() })),
    whatsIncluded: v.array(v.string()),
    image: v.string(),
    screenshots: v.array(v.string()),
    upsellProductIds: v.optional(v.array(v.id("products"))), // pinned upsell products
  }).index("by_slug", ["slug"]),

  // ─── Delivery Assets ──────────────────────────────────────────────────────
  // Unlimited delivery assets per product (Drive links, ZIPs, PDFs, etc.)
  deliveryAssets: defineTable({
    productId: v.id("products"),
    name: v.string(),
    deliveryType: v.string(),
    url: v.string(),            // external link or "" when using storageId
    storageId: v.optional(v.string()), // Convex storage ID for uploaded files
    fileName: v.optional(v.string()),  // original filename for display
    instructions: v.optional(v.string()),
    displayOrder: v.number(),
    enabled: v.boolean(),
  }).index("by_product", ["productId"]),

  // ─── Orders ───────────────────────────────────────────────────────────────
  orders: defineTable({
    razorpayOrderId: v.string(),
    razorpayPaymentId: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    customerMobile: v.optional(v.string()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        price: v.number(),
        quantity: v.number(),
      })
    ),
    amountInPaise: v.number(),
    currency: v.string(),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    affiliateCode: v.optional(v.string()),
    status: v.union(
      v.literal("created"),
      v.literal("paid"),
      v.literal("failed")
    ),
    // Set after payment verification
    orderNumber: v.optional(v.string()),
    emailSent: v.optional(v.boolean()),
    downloadCount: v.optional(v.number()),
    internalNotes: v.optional(v.string()),
  })
    .index("by_razorpay_order_id", ["razorpayOrderId"])
    .index("by_status", ["status"])
    .index("by_email", ["customerEmail"]),

  // ─── Purchase Tokens ──────────────────────────────────────────────────────
  // Secure tokens for /thank-you/:token and re-access links
  purchaseTokens: defineTable({
    orderId: v.id("orders"),
    token: v.string(),
  })
    .index("by_token", ["token"])
    .index("by_order", ["orderId"]),

  // ─── Purchase OTPs ────────────────────────────────────────────────────────
  // Hashed OTPs for access-purchase-later flow (no customer accounts needed)
  purchaseOtps: defineTable({
    email: v.string(),
    orderNumber: v.string(),
    otpHash: v.string(),
    expiresAt: v.number(),
    verified: v.boolean(),
  }).index("by_email_order", ["email", "orderNumber"]),

  // ─── Coupons ──────────────────────────────────────────────────────────────
  coupons: defineTable({
    code: v.string(),                                   // uppercase, e.g. SAVE20
    discountType: v.union(v.literal("percent"), v.literal("flat")), // % off or ₹ off
    discountValue: v.number(),                          // e.g. 20 for 20% or ₹200
    usageLimit: v.optional(v.number()),                 // null = unlimited
    usageCount: v.number(),                             // incremented on each paid order
    expiresAt: v.optional(v.string()),                  // ISO 8601 UTC, null = no expiry
    minOrderValue: v.optional(v.number()),              // min cart total in ₹ to apply
    enabled: v.boolean(),
  }).index("by_code", ["code"]),

  // ─── Affiliates ───────────────────────────────────────────────────────────────
  affiliates: defineTable({
    name: v.string(),                  // Display name, e.g. "John Doe"
    code: v.string(),                  // Unique slug, e.g. "john" → /ref/john
    email: v.optional(v.string()),     // Affiliate's email (optional)
    visits: v.number(),                // Times /ref/:code was hit
    conversions: v.number(),           // # of paid orders attributed
    revenueInr: v.number(),            // Sum of attributed order amounts
    enabled: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_code", ["code"])
    .index("by_enabled", ["enabled"]),

  // Key-value store for app-level configuration (e.g. fallback exchange rate)
  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // ─── Reviews ──────────────────────────────────────────────────────────────────
  reviews: defineTable({
    productId: v.id("products"),
    orderId: v.optional(v.id("orders")),
    orderNumber: v.optional(v.string()),
    customerName: v.string(),
    customerEmail: v.string(),
    rating: v.number(),
    title: v.optional(v.string()),
    body: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("hidden")
    ),
    isVerifiedBuyer: v.boolean(),
    isFeatured: v.optional(v.boolean()),
    helpful: v.optional(v.number()),
    // AI polish fields
    aiTitle: v.optional(v.string()),
    aiBody: v.optional(v.string()),
    aiCategory: v.optional(v.string()),
    aiSpamScore: v.optional(v.number()),
    aiProcessed: v.optional(v.boolean()),
    // Review request email token
    reviewToken: v.optional(v.string()),
    reviewTokenUsed: v.optional(v.boolean()),
    // Media uploads (screenshots / video testimonial)
    mediaStorageIds: v.optional(v.array(v.id("_storage"))),
    mediaTypes: v.optional(v.array(v.string())),      // "image" | "video"
    mediaLabels: v.optional(v.array(v.string())),     // "WhatsApp", "Email", "Social", "Video", etc.
  })
    .index("by_product", ["productId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["status"])
    .index("by_token", ["reviewToken"])
    .index("by_email", ["customerEmail"]),

  // ─── AI Testimonials ──────────────────────────────────────────────────────
  // Admin-generated AI testimonials per product (review / whatsapp / email cards)
  aiTestimonials: defineTable({
    productId: v.id("products"),
    productName: v.string(),
    productSlug: v.string(),
    type: v.union(
      v.literal("review"),
      v.literal("whatsapp"),
      v.literal("email")
    ),
    // review fields
    reviewerName: v.optional(v.string()),
    reviewerInitials: v.optional(v.string()),
    reviewerRole: v.optional(v.string()),
    rating: v.optional(v.number()),
    reviewTitle: v.optional(v.string()),
    reviewBody: v.optional(v.string()),
    // whatsapp fields
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
    // email fields
    emailSender: v.optional(v.string()),
    emailInitials: v.optional(v.string()),
    emailSubject: v.optional(v.string()),
    emailBody: v.optional(v.string()),
    // display
    status: v.union(v.literal("active"), v.literal("hidden")),
    displayOrder: v.optional(v.number()),
  })
    .index("by_product", ["productId"])
    .index("by_status", ["status"]),
});
