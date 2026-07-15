import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("products").order("desc").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Query: upsell suggestions for a set of purchased product IDs ────────────
// Returns up to 3 products the buyer doesn't already own:
//   1. Any pinned upsell products on the purchased items (admin-configured)
//   2. Fallback: other products in the same categories, sorted by price
export const getUpsellSuggestions = query({
  args: { purchasedProductIds: v.array(v.id("products")) },
  handler: async (ctx, args): Promise<Array<{
    _id: string; name: string; slug: string; category: string; tagline: string;
    price: number; originalPrice: number; image: string; badge?: string;
  }>> => {
    if (args.purchasedProductIds.length === 0) return [];

    // Fetch purchased products to know their categories & pinned upsells
    const purchased = await Promise.all(
      args.purchasedProductIds.map((id) => ctx.db.get(id))
    );
    const purchasedSet = new Set(args.purchasedProductIds as string[]);
    const categories = new Set(purchased.filter(Boolean).map((p) => p!.category));

    // Collect pinned upsell IDs (deduplicated, not already owned)
    const pinnedIds: string[] = [];
    for (const p of purchased) {
      if (p?.upsellProductIds) {
        for (const uid of p.upsellProductIds) {
          if (!purchasedSet.has(uid) && !pinnedIds.includes(uid)) {
            pinnedIds.push(uid);
          }
        }
      }
    }

    // Resolve pinned products
    const pinned = (
      await Promise.all(pinnedIds.slice(0, 3).map((id) => ctx.db.get(id as Id<"products">)))
    ).filter((p): p is Doc<"products"> => p !== null && "name" in p);

    if (pinned.length >= 3) {
      return pinned.slice(0, 3).map((p) => ({
        _id: p._id, name: p.name, slug: p.slug, category: p.category,
        tagline: p.tagline, price: p.price, originalPrice: p.originalPrice,
        image: p.image, badge: p.badge,
      }));
    }

    // Fallback: same-category products not yet purchased
    const all = await ctx.db.query("products").collect();
    const suggestions = all
      .filter((p) => !purchasedSet.has(p._id) && categories.has(p.category))
      .slice(0, 3 - pinned.length);

    // Merge pinned + fallback
    const result = [...pinned, ...suggestions].slice(0, 3);
    return result.map((p) => ({
      _id: p._id, name: p.name, slug: p.slug, category: p.category,
      tagline: p.tagline, price: p.price, originalPrice: p.originalPrice,
      image: p.image, badge: p.badge,
    }));
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

// ── Admin: set pinned upsell products for a product ───────────────────────────
export const setUpsells = mutation({
  args: {
    productId: v.id("products"),
    upsellProductIds: v.array(v.id("products")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not signed in." });
    await ctx.db.patch(args.productId, { upsellProductIds: args.upsellProductIds });
  },
});

const productFields = {
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
};

export const create = mutation({
  args: productFields,
  handler: async (ctx, args) => {
    // Check slug uniqueness
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      throw new ConvexError({ code: "CONFLICT", message: "A product with this slug already exists." });
    }
    return await ctx.db.insert("products", args);
  },
});

export const update = mutation({
  args: { id: v.id("products"), ...productFields },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    // Check slug uniqueness for other products
    const existing = await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", fields.slug))
      .unique();
    if (existing && existing._id !== id) {
      throw new ConvexError({ code: "CONFLICT", message: "A product with this slug already exists." });
    }
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("products") },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) throw new ConvexError({ code: "NOT_FOUND", message: "Product not found." });
    await ctx.db.delete(args.id);
  },
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("products").first();
    if (existing) return; // already seeded

    const seedData = [
      {
        name: "UI Component Kit",
        slug: "ui-component-kit",
        category: "Design",
        tagline: "300+ production-ready components",
        description:
          "A comprehensive library of beautifully crafted UI components for Figma and React. Built with accessibility and responsiveness in mind, this kit gives your team a shared design language that ships directly to code — no redesign work needed.",
        price: 49,
        originalPrice: 89,
        badge: "Best Seller",
        features: ["Figma + React source", "Dark & light themes", "Lifetime updates"],
        highlights: [
          { label: "Components", value: "300+" },
          { label: "File formats", value: "Figma, TSX" },
          { label: "Themes", value: "Dark & Light" },
          { label: "Updates", value: "Lifetime" },
        ],
        whatsIncluded: [
          "300+ Figma component frames",
          "React/TypeScript source code",
          "Dark & light theme tokens",
          "Component documentation",
          "Usage examples & Storybook",
          "Lifetime free updates",
        ],
        image: "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
      {
        name: "Developer Toolkit",
        slug: "developer-toolkit",
        category: "Code",
        tagline: "Ship faster with proven patterns",
        description:
          "A battle-tested collection of TypeScript templates, CI/CD blueprints, and API boilerplates used by hundreds of engineering teams. Stop rebuilding the same infrastructure — start with solid foundations.",
        price: 79,
        originalPrice: 149,
        badge: "New",
        features: ["TypeScript templates", "CI/CD blueprints", "API boilerplates"],
        highlights: [
          { label: "Templates", value: "50+" },
          { label: "Language", value: "TypeScript" },
          { label: "Frameworks", value: "Next, Vite, Node" },
          { label: "Updates", value: "Lifetime" },
        ],
        whatsIncluded: [
          "50+ TypeScript project templates",
          "GitHub Actions CI/CD workflows",
          "REST & GraphQL API boilerplates",
          "Authentication starter kits",
          "Database migration scripts",
          "Docker & deployment configs",
        ],
        image: "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1743385779313-ac03bb0f997b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
      {
        name: "Notion OS Bundle",
        slug: "notion-os-bundle",
        category: "Productivity",
        tagline: "Your second brain, fully wired",
        description:
          "A fully interconnected Notion workspace system with 15 linked databases, a GTD-inspired workflow, and an annual review system. Built over two years of iteration by a productivity obsessive.",
        price: 29,
        originalPrice: 59,
        badge: "Popular",
        features: ["15 linked databases", "GTD workflow", "Annual review system"],
        highlights: [
          { label: "Databases", value: "15 linked" },
          { label: "Templates", value: "30+" },
          { label: "System", value: "GTD-based" },
          { label: "Format", value: "Notion" },
        ],
        whatsIncluded: [
          "15 interlinked Notion databases",
          "Task & project management system",
          "Personal CRM template",
          "Knowledge base & note system",
          "Annual & weekly review templates",
          "Video walkthrough (45 min)",
        ],
        image: "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1627757757997-369fb38812e1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
      {
        name: "Startup Playbook",
        slug: "startup-playbook",
        category: "E-book",
        tagline: "Zero to launch in 90 days",
        description:
          "A 180-page actionable guide walking you through everything from validating your idea to acquiring your first 100 customers. Written by a founder who built and sold two startups.",
        price: 19,
        originalPrice: 39,
        badge: undefined,
        features: ["180-page PDF", "Checklist templates", "Investor deck"],
        highlights: [
          { label: "Pages", value: "180" },
          { label: "Format", value: "PDF" },
          { label: "Bonuses", value: "Deck + Checklist" },
          { label: "Updates", value: "Free" },
        ],
        whatsIncluded: [
          "180-page PDF e-book",
          "Investor pitch deck template",
          "90-day launch checklist",
          "Customer interview scripts",
          "Pricing strategy worksheet",
          "Landing page swipe file",
        ],
        image: "https://images.unsplash.com/photo-1743385779313-ac03bb0f997b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1676116777245-1cc40079cd38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1768979121229-392fce4957ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
      {
        name: "Motion Design Pack",
        slug: "motion-design-pack",
        category: "Design",
        tagline: "60fps animations, zero effort",
        description:
          "200+ production-ready Lottie animations and After Effects source files covering UI transitions, loading states, onboarding illustrations, and micro-interactions.",
        price: 59,
        originalPrice: 99,
        badge: "Hot",
        features: ["200+ Lottie files", "After Effects source", "React components"],
        highlights: [
          { label: "Animations", value: "200+" },
          { label: "Formats", value: "Lottie, AE, TSX" },
          { label: "Categories", value: "8" },
          { label: "Updates", value: "Lifetime" },
        ],
        whatsIncluded: [
          "200+ Lottie JSON files",
          "After Effects source files",
          "React animation components",
          "8 animation categories",
          "Speed & color control docs",
          "Figma motion prototypes",
        ],
        image: "https://images.unsplash.com/photo-1758883019110-04c79dc56a71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1771226281605-f1e505ade901?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1540612597331-63c67ea382fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
      {
        name: "Brand Identity Kit",
        slug: "brand-identity-kit",
        category: "Design",
        tagline: "Professional brand in a day",
        description:
          "Everything you need to build a cohesive, memorable brand from scratch. Logo templates, typography pairings, color system guidelines, and a complete social media kit.",
        price: 39,
        originalPrice: 79,
        badge: undefined,
        features: ["Logo templates", "Brand guidelines", "Social media kit"],
        highlights: [
          { label: "Logo variants", value: "40+" },
          { label: "Social templates", value: "60+" },
          { label: "Format", value: "Figma" },
          { label: "Updates", value: "Lifetime" },
        ],
        whatsIncluded: [
          "40+ logo template variants",
          "Brand guidelines document",
          "Typography pairing guide",
          "Color system & palette",
          "60+ social media templates",
          "Business card & stationery",
        ],
        image: "https://images.unsplash.com/photo-1768979121229-392fce4957ab?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1200&q=80",
        screenshots: [
          "https://images.unsplash.com/photo-1771226281605-f1e505ade901?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
          "https://images.unsplash.com/photo-1758883019110-04c79dc56a71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800&q=80",
        ],
      },
    ];

    for (const p of seedData) {
      await ctx.db.insert("products", p);
    }
  },
});
