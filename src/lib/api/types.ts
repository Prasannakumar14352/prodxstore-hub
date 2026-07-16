// Type shims replacing convex/_generated/dataModel.
// All IDs are Postgres UUIDs (plain strings). Rows are mapped to the same
// camelCase shapes the app used with Convex, including _id / _creationTime.

export type Id<_T extends string = string> = string;

interface BaseDoc {
  _id: string;
  _creationTime: number; // Unix ms (derived from created_at)
}

export interface ProductDoc extends BaseDoc {
  name: string;
  slug: string;
  category: string;
  tagline: string;
  description: string;
  price: number;
  originalPrice: number;
  badge?: string;
  features: string[];
  highlights: Array<{ label: string; value: string }>;
  whatsIncluded: string[];
  image: string;
  screenshots: string[];
  upsellProductIds?: string[];
}

export interface DeliveryAssetDoc extends BaseDoc {
  productId: string;
  name: string;
  deliveryType: string;
  url: string;
  storagePath?: string;
  /** Legacy alias kept for existing component code */
  storageId?: string;
  fileName?: string;
  instructions?: string;
  displayOrder: number;
  enabled: boolean;
}

export interface OrderItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
}

export interface OrderDoc extends BaseDoc {
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  customerName: string;
  customerEmail: string;
  customerMobile?: string;
  items: OrderItem[];
  amountInPaise: number;
  currency: string;
  promoCode?: string;
  promoDiscount?: number;
  affiliateCode?: string;
  status: "created" | "paid" | "failed";
  orderNumber?: string;
  emailSent?: boolean;
  downloadCount?: number;
  internalNotes?: string;
}

export interface PurchaseTokenDoc extends BaseDoc {
  orderId: string;
  token: string;
}

export interface CouponDoc extends BaseDoc {
  code: string;
  discountType: "percent" | "flat";
  discountValue: number;
  usageLimit?: number;
  usageCount: number;
  expiresAt?: string;
  minOrderValue?: number;
  enabled: boolean;
}

export interface AffiliateDoc extends BaseDoc {
  name: string;
  code: string;
  email?: string;
  visits: number;
  conversions: number;
  revenueInr: number;
  enabled: boolean;
  notes?: string;
}

export interface SettingDoc extends BaseDoc {
  key: string;
  value: string;
}

export interface ReviewDoc extends BaseDoc {
  productId: string;
  orderId?: string;
  orderNumber?: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title?: string;
  body: string;
  status: "pending" | "approved" | "rejected" | "hidden";
  isVerifiedBuyer: boolean;
  isFeatured?: boolean;
  helpful?: number;
  aiTitle?: string;
  aiBody?: string;
  aiCategory?: string;
  aiSpamScore?: number;
  aiProcessed?: boolean;
  reviewToken?: string;
  reviewTokenUsed?: boolean;
  mediaPaths?: string[];
  /** Legacy alias kept for existing component code */
  mediaStorageIds?: string[];
  mediaTypes?: string[];
  mediaLabels?: string[];
}

export interface AiTestimonialDoc extends BaseDoc {
  productId: string;
  productName: string;
  productSlug: string;
  type: "review" | "whatsapp" | "email";
  reviewerName?: string;
  reviewerInitials?: string;
  reviewerRole?: string;
  rating?: number;
  reviewTitle?: string;
  reviewBody?: string;
  whatsappBuyerName?: string;
  whatsappBuyerInitials?: string;
  whatsappMessages?: Array<{ sender: "buyer" | "seller"; text: string; time: string }>;
  emailSender?: string;
  emailInitials?: string;
  emailSubject?: string;
  emailBody?: string;
  status: "active" | "hidden";
  displayOrder?: number;
}

export interface UserDoc extends BaseDoc {
  name?: string;
  email?: string;
  image?: string;
  role?: "admin" | "super_admin";
}

export interface DataModel {
  products: ProductDoc;
  deliveryAssets: DeliveryAssetDoc;
  orders: OrderDoc;
  purchaseTokens: PurchaseTokenDoc;
  coupons: CouponDoc;
  affiliates: AffiliateDoc;
  settings: SettingDoc;
  reviews: ReviewDoc;
  aiTestimonials: AiTestimonialDoc;
  users: UserDoc;
}

export type Doc<T extends keyof DataModel> = DataModel[T];

// ─── Social proof types (were exported from convex/socialProof.ts) ───────────

export type SocialProofNotification = {
  id: string;
  firstName: string;
  location: string | null;
  productName: string;
  productImage: string;
  purchasedAt: number;
  isDemo: boolean;
};

export type SocialProofSettings = {
  enabled: boolean;
  intervalMin: number;
  intervalMax: number;
  displayDuration: number;
  position: "bottom-left" | "bottom-right" | "bottom-center";
  showProductImage: boolean;
  showLocation: boolean;
  showTimeAgo: boolean;
  demoMode: boolean;
  maxPerSession: number;
};
