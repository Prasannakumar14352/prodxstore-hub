import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo } from "react";
import type React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Star,
  Download,
  Zap,
  Shield,
  Code2,
  ChevronDown,
  Check,
  Users,
  TrendingUp,
  Menu,
  X,
  ShoppingCart,
  Search,
  SlidersHorizontal,
  Mail,
  Lock,
  RefreshCcw,
  Sparkles,
  ArrowUpDown,
  ArrowDownUp,
  Flame,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { DbProduct } from "@/lib/product-visuals.ts";
import { getVisuals, getBadgeColor } from "@/lib/product-visuals.ts";
import { useCart } from "@/hooks/use-cart.tsx";
import { WishlistToggle, WishlistNavButton } from "@/components/wishlist-button.tsx";
import { PriceTag } from "@/components/price-tag.tsx";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import { HomepageTestimonials } from "./index/_components/homepage-testimonials.tsx";

// ─── Sub-components ────────────────────────────────────────────────────────────

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-background/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 cursor-pointer">
          <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-8 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {["Products", "Testimonials", "FAQ", "Bundle"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="hidden md:flex items-center gap-3">
          <WishlistNavButton />
          <Button size="sm" className="rounded-full px-5 cursor-pointer" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
            Browse All
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <WishlistNavButton />
          <button
            className="text-muted-foreground cursor-pointer"
            onClick={() => setOpen(!open)}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden border-t border-white/5 bg-background/95 px-6 py-4 space-y-3"
        >
          {["Products", "Testimonials", "FAQ", "Bundle"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              onClick={() => setOpen(false)}
            >
              {item}
            </a>
          ))}
          <Button size="sm" className="w-full rounded-full mt-2 cursor-pointer" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
            Browse All
          </Button>
        </motion.div>
      )}
    </header>
  );
}

function ProductCard({ product, index }: { product: DbProduct; index: number }) {
  const { icon: Icon, gradient, accentColor, borderGlow } = getVisuals(product.category);
  const { addItem, items } = useCart();
  const inCart = items.some((i) => i.product._id === product._id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" as const }}
      className={cn(
        "group relative rounded-2xl border border-white/8 bg-card overflow-hidden transition-all duration-300",
        borderGlow
      )}
    >
      {/* Clickable image area → product page */}
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative h-44 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className={cn("absolute inset-0 bg-gradient-to-b", gradient, "opacity-80")} />
          {product.badge && (
            <span
              className={cn(
                "absolute top-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full border",
                getBadgeColor(product.badge)
              )}
            >
              {product.badge}
            </span>
          )}
          <div className="absolute bottom-3 left-3">
            <div className="w-9 h-9 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <Icon className={cn("w-4 h-4", accentColor)} />
            </div>
          </div>
        </div>
      </Link>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">
            {product.category}
          </span>
        </div>
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-base text-foreground mb-1 hover:text-primary transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-4">{product.tagline}</p>

        <ul className="space-y-1.5 mb-5">
          {product.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className={cn("w-3 h-3 shrink-0", accentColor)} />
              {f}
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <PriceTag inr={product.price} className="text-xl font-bold text-foreground" />
            <PriceTag inr={product.originalPrice} className="text-xs text-muted-foreground" strikethrough />
          </div>
          <div className="flex items-center gap-1.5">
            <WishlistToggle product={product} />
            <button
              onClick={() => { if (!inCart) addItem(product); }}
              className={cn(
                "w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer",
                inCart
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
              title={inCart ? "In cart" : "Add to cart"}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
            </button>
            <Button size="sm" className="rounded-full text-xs gap-1.5 cursor-pointer" asChild>
              <Link to={`/product/${product.slug}`}>
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" as const }}
      className="border border-white/8 rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-medium text-foreground hover:bg-white/3 transition-colors cursor-pointer"
      >
        {q}
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0 ml-4", open && "rotate-180")}
        />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-5 pb-4 text-sm text-muted-foreground"
        >
          {a}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Products grid with search, filter & sort ────────────────────────────────

type SortKey = "featured" | "newest" | "price_asc" | "price_desc" | "best_sellers";

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: "featured",     label: "Featured",         icon: <Sparkles className="w-3 h-3" /> },
  { key: "newest",       label: "Newest",            icon: <Zap className="w-3 h-3" /> },
  { key: "price_asc",    label: "Price: Low → High", icon: <ArrowUpDown className="w-3 h-3" /> },
  { key: "price_desc",   label: "Price: High → Low", icon: <ArrowDownUp className="w-3 h-3" /> },
  { key: "best_sellers", label: "Best Sellers",      icon: <Flame className="w-3 h-3" /> },
];

function ProductsGrid() {
  const allProducts = useQuery(api.products.list);
  const buyerCounts = useQuery(api.orders.getAllProductBuyerCounts);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 200);
  const [sortKey, setSortKey] = useState<SortKey>("featured");
  const [sortOpen, setSortOpen] = useState(false);

  // Derive category list from DB products
  const categories = useMemo(() => {
    if (!allProducts) return ["All"];
    const cats = [...new Set(allProducts.map((p) => p.category))];
    return ["All", ...cats];
  }, [allProducts]);

  const sorted = useMemo(() => {
    if (!allProducts) return [];
    const q = debouncedQuery.toLowerCase().trim();
    const filtered = allProducts.filter((p) => {
      const matchCat = activeCategory === "All" || p.category === activeCategory;
      const matchQ =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    const BASE_BUYER_COUNT = 47; // social proof offset
    const counts = buyerCounts ?? {};

    switch (sortKey) {
      case "newest":
        return [...filtered].sort((a, b) => (b._creationTime ?? 0) - (a._creationTime ?? 0));
      case "price_asc":
        return [...filtered].sort((a, b) => a.price - b.price);
      case "price_desc":
        return [...filtered].sort((a, b) => b.price - a.price);
      case "best_sellers":
        return [...filtered].sort((a, b) => {
          const countA = (counts[a._id as string] ?? 0) + BASE_BUYER_COUNT;
          const countB = (counts[b._id as string] ?? 0) + BASE_BUYER_COUNT;
          return countB - countA;
        });
      default:
        // "featured" — keep original DB order
        return filtered;
    }
  }, [allProducts, activeCategory, debouncedQuery, sortKey, buyerCounts]);

  const activeSortOption = SORT_OPTIONS.find((o) => o.key === sortKey)!;

  return (
    <div>
      {/* Search + filters + sort */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 mb-8"
      >
        {/* Row 1: search + sort */}
        <div className="flex gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-white/10 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort dropdown */}
          <div className="relative shrink-0">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className={cn(
                "h-11 px-3.5 rounded-xl border flex items-center gap-2 text-sm transition-colors cursor-pointer whitespace-nowrap",
                sortOpen
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-white/10 bg-card text-muted-foreground hover:text-foreground hover:border-white/20"
              )}
            >
              <span className="text-current">{activeSortOption.icon}</span>
              <span className="hidden sm:inline">{activeSortOption.label}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", sortOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-xl border border-white/10 bg-card shadow-xl overflow-hidden"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setSortKey(opt.key); setSortOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition-colors cursor-pointer text-left",
                        sortKey === opt.key
                          ? "bg-primary/15 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      {opt.icon}
                      {opt.label}
                      {sortKey === opt.key && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Row 2: category tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-white/8 bg-card overflow-x-auto scrollbar-hide">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground ml-2 mr-1 shrink-0" />
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Result count + active sort indicator */}
      <AnimatePresence mode="wait">
        {(query || activeCategory !== "All" || sortKey !== "featured") && (
          <motion.div
            key="count"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 mb-5"
          >
            <p className="text-xs text-muted-foreground">
              {sorted.length === 0
                ? "No products found"
                : `${sorted.length} product${sorted.length === 1 ? "" : "s"}`}
              {query && (
                <span>
                  {" "}for <span className="text-foreground font-medium">"{query}"</span>
                </span>
              )}
            </p>
            {sortKey !== "featured" && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
                {activeSortOption.icon}
                {activeSortOption.label}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {allProducts === undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Grid */}
      {allProducts !== undefined && (sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-14 h-14 rounded-2xl border border-white/8 bg-card flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <p className="text-foreground font-medium mb-1">No products found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Try a different keyword or category
          </p>
          <button
            onClick={() => { setQuery(""); setActiveCategory("All"); }}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </motion.div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence mode="popLayout">
            {sorted.map((product, i) => (
              <motion.div
                key={product._id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <ProductCard product={product} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Newsletter section ───────────────────────────────────────────────────────

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section className="py-20 px-6 border-t border-white/5">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: "easeOut" as const }}
        className="max-w-xl mx-auto text-center"
      >
        <div className="w-12 h-12 rounded-2xl border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <Mail className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
          Get notified when we{" "}
          <span className="font-serif italic font-normal text-primary">drop something new.</span>
        </h2>
        <p className="text-muted-foreground text-sm mb-8">
          Early access, exclusive discounts, and occasional tips for builders. No spam, ever.
        </p>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="font-medium text-foreground">You{"'"}re on the list!</p>
            <p className="text-sm text-muted-foreground">We{"'"}ll be in touch with something good.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5 max-w-md mx-auto">
            <div className="relative flex-1">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full h-11 pl-10 pr-4 rounded-full border border-white/10 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-6 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer shrink-0"
            >
              Subscribe
            </button>
          </form>
        )}

        <p className="mt-4 text-xs text-muted-foreground/60">
          Join 12,400+ creators. Unsubscribe anytime.
        </p>
      </motion.div>
    </section>
  );
}

// ─── Static data ───────────────────────────────────────────────────────────────

const stats = [
  { value: "12,400+", label: "Happy customers", icon: Users },
  { value: "4.9/5", label: "Average rating", icon: Star },
  { value: "98%", label: "Satisfaction rate", icon: TrendingUp },
  { value: "6", label: "Premium products", icon: Download },
];

const faqs = [
  {
    q: "Do I get lifetime access after purchasing?",
    a: "Yes — all purchases include lifetime access and all future updates to that product, forever.",
  },
  {
    q: "What formats are included?",
    a: "Each product page lists the exact formats. Most design products include Figma, code products include TypeScript/React, and ebooks come as PDF.",
  },
  {
    q: "Is there a refund policy?",
    a: "We offer a 30-day no-questions-asked refund. If it's not right for you, just email us.",
  },
  {
    q: "Can I use these in client projects?",
    a: "Yes. All products come with a commercial license covering unlimited client projects.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Index() {
  const allProducts = useQuery(api.products.list);
  const { formatUsd } = useExchangeRate();
  const productCount = allProducts?.length ?? 0;
  const totalPrice = allProducts?.reduce((sum, p) => sum + p.price, 0) ?? 0;
  const bundlePrice = Math.round(totalPrice * 0.9);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden">
      <Navbar />

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] md:min-h-screen flex items-start md:items-center justify-center pt-24 md:pt-16 pb-10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-primary/8 rounded-full blur-[120px]" />
          <div className="absolute top-2/3 left-1/4 w-[400px] h-[300px] bg-violet-500/6 rounded-full blur-[100px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[90px]" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" as const }}
          >
            <Badge
              variant="outline"
              className="mb-6 border-primary/30 bg-primary/10 text-primary text-xs font-medium px-4 py-1.5 rounded-full"
            >
              <Zap className="w-3 h-3 mr-1.5" />
              {productCount > 0 ? `${productCount} premium digital products` : "Premium digital products"}
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" as const }}
            className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-5 md:mb-6 text-balance"
          >
            Tools that make{" "}
            <span className="font-serif italic font-normal text-primary">you ship</span>{" "}
            faster.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" as const }}
            className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 text-balance"
          >
            Meticulously crafted digital products for designers, developers, and creators who refuse to waste time.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" as const }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Button size="lg" className="rounded-full px-6 md:px-8 gap-2 text-sm md:text-base" asChild>
              <a href="#products">
                Shop all products <ArrowRight className="w-4 h-4" />
              </a>
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full px-6 md:px-8 text-sm md:text-base" asChild>
              <a href="#bundle">View bundle deal</a>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8 md:mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex -space-x-2">
              {["SC", "MR", "AT", "JL"].map((init) => (
                <div
                  key={init}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 border border-white/10 flex items-center justify-center text-[9px] font-bold text-foreground"
                >
                  {init}
                </div>
              ))}
            </div>
            <span>
              <strong className="text-foreground">12,400+</strong> creators already shipping
            </span>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-card/50">
        <div className="max-w-5xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            const value = stat.label === "Premium products" && productCount > 0
              ? String(productCount)
              : stat.value;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.07, ease: "easeOut" as const }}
                className="text-center"
              >
                <Icon className="w-5 h-5 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Products ──────────────────────────────────────────────────────── */}
      <section id="products" className="py-24 max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">The collection</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Every product you need,{" "}
            <span className="font-serif italic font-normal text-primary">nothing you don{"'"}t.</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Handpicked tools designed to eliminate the boring parts and accelerate the creative parts.
          </p>
        </motion.div>

        <ProductsGrid />
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="py-20 bg-card/30 border-y border-white/5">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Why thousands choose{" "}
              <span className="font-serif italic font-normal text-primary">ProdXStore</span>
            </h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: "Lifetime access",
                desc: "Pay once, own forever. Every update is included — no subscriptions, no surprises.",
                color: "text-amber-400",
              },
              {
                icon: Zap,
                title: "Instant delivery",
                desc: "Download everything immediately after purchase. No waiting, no shipping delays.",
                color: "text-emerald-400",
              },
              {
                icon: Code2,
                title: "Commercial license",
                desc: "Use in client projects, internal tools, or products. The license covers it all.",
                color: "text-violet-400",
              },
            ].map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" as const }}
                  className="rounded-2xl border border-white/8 bg-card p-7"
                >
                  <Icon className={cn("w-7 h-7 mb-4", feat.color)} />
                  <h3 className="font-semibold text-base mb-2">{feat.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <HomepageTestimonials />

      {/* ── Bundle CTA ────────────────────────────────────────────────────── */}
      <section id="bundle" className="py-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" as const }}
          className="max-w-3xl mx-auto text-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-12 relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-primary/20 rounded-full blur-[60px] pointer-events-none" />
          <Badge
            variant="outline"
            className="mb-5 border-primary/40 bg-primary/15 text-primary text-xs font-medium px-4 py-1.5 rounded-full"
          >
            Limited offer — save 10%
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            Get the complete{" "}
            <span className="font-serif italic font-normal text-primary">bundle.</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            All {productCount > 0 ? productCount : ""} premium products. One flat price. Lifetime access to everything — current and future releases.
          </p>
          <div className="flex items-baseline justify-center gap-3 mb-8">
            <span className="text-5xl font-bold text-foreground">
              {bundlePrice > 0 ? formatUsd(bundlePrice) : "—"}
            </span>
            {totalPrice > 0 && (
              <span className="text-xl text-muted-foreground line-through">
                {formatUsd(totalPrice)}
              </span>
            )}
          </div>
          <Button size="lg" className="rounded-full px-10 gap-2 text-base" asChild>
            <Link to="/checkout">
              Claim bundle deal <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-muted-foreground">30-day money-back guarantee. No questions asked.</p>
        </motion.div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 max-w-2xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold tracking-tight mb-3">
            Frequently asked{" "}
            <span className="font-serif italic font-normal text-primary">questions.</span>
          </h2>
        </motion.div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <FaqItem key={faq.q} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </section>

      {/* ── Newsletter ────────────────────────────────────────────────────── */}
      <NewsletterSection />

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-7 w-auto" />
          </div>
          <p>© {new Date().getFullYear()} ProdXStore. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors cursor-pointer">Terms</a>
            <a href="mailto:prodxstoresupport@gmail.com" className="hover:text-foreground transition-colors cursor-pointer">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
