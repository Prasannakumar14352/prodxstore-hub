import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Check,
  ShoppingCart,
  Zap,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import { getVisuals, getBadgeColor } from "@/lib/product-visuals.ts";
import { useCart } from "@/hooks/use-cart.tsx";
import { WishlistToggle } from "@/components/wishlist-button.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn, isExternalProductUrl, normalizeExternalUrl } from "@/lib/utils.ts";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import ReviewsSection from "./_components/reviews-section.tsx";
import { ProductTestimonials } from "./_components/product-testimonials.tsx";
import TrustBadges, { BuyerCountBadge } from "@/components/trust-badges.tsx";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const product = useQuery(api.products.getBySlug, id ? { slug: id } : "skip");
  const allProducts = useQuery(api.products.list);
  const { addItem, items } = useCart();
  const { formatUsd } = useExchangeRate();
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  // A product with its own landing page shouldn't be reachable as an
  // internal page at all — this only matters if someone lands on
  // /product/:slug directly (e.g. an old bookmark or shared link); the Hub's
  // own cards already link straight to the external URL.
  const externalUrl = product
    ? product.landingPageUrl?.trim() ||
      (isExternalProductUrl(product.slug) ? normalizeExternalUrl(product.slug) : null)
    : null;

  useEffect(() => {
    if (externalUrl) window.location.replace(externalUrl);
  }, [externalUrl]);

  if (externalUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Redirecting…</p>
      </div>
    );
  }

  // Loading state
  if (product === undefined) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-6 pt-28 pb-24">
          <div className="grid lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-video rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Not found
  if (product === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Product not found.</p>
          <Button onClick={() => navigate("/")} variant="secondary" className="rounded-full">
            Back to store
          </Button>
        </div>
      </div>
    );
  }

  const { icon: Icon, gradient, accentColor } = getVisuals(product.category);
  const inCart = items.some((i) => i.product._id === product._id);
  const allImages = [product.image, ...product.screenshots];
  const relatedProducts = (allProducts ?? []).filter((p) => p._id !== product._id).slice(0, 3);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <header className="fixed top-0 inset-x-0 z-40 border-b border-white/5 backdrop-blur-xl bg-background/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to store
          </button>
          <div className="flex-1" />
          <img src="https://hercules-cdn.com/file_3y9pBv81Yd6f6aK28NIgGthc" alt="ProdXStore" className="h-7 w-auto" />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-28 pb-28 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* ── Left: Images ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
          >
            {/* Main image */}
            <div className="relative rounded-2xl overflow-hidden border border-white/8 aspect-video mb-3">
              <img
                src={allImages[activeScreenshot]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <div className={cn("absolute inset-0 bg-gradient-to-t", gradient, "opacity-60")} />
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
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setActiveScreenshot((prev) => (prev - 1 + allImages.length) % allImages.length)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setActiveScreenshot((prev) => (prev + 1) % allImages.length)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveScreenshot(i)}
                    className={cn(
                      "flex-1 aspect-video rounded-lg overflow-hidden border transition-all cursor-pointer",
                      activeScreenshot === i
                        ? "border-primary/60 ring-1 ring-primary/30"
                        : "border-white/8 opacity-60 hover:opacity-90"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* ── Right: Details ───────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" as const }}
            className="space-y-6"
          >
            {/* Category + name */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                  <Icon className={cn("w-4 h-4", accentColor)} />
                </div>
                <Badge variant="outline" className="text-xs border-white/10 text-muted-foreground rounded-full">
                  {product.category}
                </Badge>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">5.0</span>
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{product.name}</h1>
              <p className={cn("text-lg font-medium", accentColor)}>{product.tagline}</p>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed text-sm">{product.description}</p>

            {/* Highlights */}
            {product.highlights.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {product.highlights.map((h) => (
                  <div key={h.label} className="rounded-xl border border-white/8 bg-card/50 p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{h.label}</p>
                    <p className="font-semibold text-foreground text-sm">{h.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* What's included */}
            {product.whatsIncluded.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-3">
                  What{"'"}s included
                </p>
                <ul className="space-y-2">
                  {product.whatsIncluded.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                      <div className="w-4 h-4 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pricing + CTA */}
            <div className="rounded-2xl border border-white/8 bg-card p-5 space-y-4">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-foreground">{formatUsd(product.price)}</span>
                <span className="text-lg text-muted-foreground line-through">{formatUsd(product.originalPrice)}</span>
                <span className="text-sm text-emerald-400 font-medium">
                  Save {formatUsd(product.originalPrice - product.price)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {inCart ? (
                  <Button size="lg" variant="secondary" className="flex-1 rounded-full gap-2" disabled>
                    <Check className="w-4 h-4" />
                    Added to cart
                  </Button>
                ) : (
                  <Button size="lg" className="flex-1 rounded-full gap-2" onClick={() => addItem(product)}>
                    <ShoppingCart className="w-4 h-4" />
                    Add to cart
                  </Button>
                )}
                <Button
                  size="lg"
                  className="flex-1 rounded-full gap-2"
                  variant="secondary"
                  onClick={() => {
                    addItem(product);
                    navigate("/checkout");
                  }}
                >
                  <Zap className="w-4 h-4" />
                  Buy now
                </Button>
                <WishlistToggle product={product} className="w-12 h-12 rounded-full shrink-0" />
              </div>

              <p className="text-center text-xs text-muted-foreground">
                Instant download · Lifetime access
              </p>

              {/* Buyer count social proof */}
              <div className="flex justify-center">
                <BuyerCountBadge productId={product._id} />
              </div>

              {/* Trust badges — dynamic from settings */}
              <TrustBadges variant="grid" className="pt-1" />
            </div>
          </motion.div>
        </div>

        {/* ── Related products ──────────────────────────────────── */}
        {relatedProducts.length > 0 && (
          <div className="mt-24">
            <h2 className="text-xl font-bold tracking-tight mb-6">You might also like</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedProducts.map((rp, i) => {
                const { icon: RpIcon, gradient: rpGrad, accentColor: rpAccent } = getVisuals(rp.category);
                const rpInCart = items.some((it) => it.product._id === rp._id);
                return (
                  <motion.div
                    key={rp._id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.08, ease: "easeOut" as const }}
                    className="group rounded-2xl border border-white/8 bg-card overflow-hidden transition-all duration-300"
                  >
                    <Link to={`/product/${rp.slug}`} className="block">
                      <div className="relative h-36 overflow-hidden">
                        <img src={rp.image} alt={rp.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className={cn("absolute inset-0 bg-gradient-to-b", rpGrad, "opacity-70")} />
                        <div className="absolute bottom-3 left-3 w-8 h-8 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                          <RpIcon className={cn("w-3.5 h-3.5", rpAccent)} />
                        </div>
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">{rp.category}</p>
                        <h3 className="font-semibold text-sm text-foreground mb-0.5">{rp.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{rp.tagline}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">₹{rp.price}</span>
                          <button
                            onClick={(e) => { e.preventDefault(); if (!rpInCart) addItem(rp); }}
                            className={cn(
                              "text-xs rounded-full px-3 py-1.5 border transition-all cursor-pointer",
                              rpInCart
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-primary"
                            )}
                          >
                            {rpInCart ? "In cart" : "Add to cart"}
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── AI Testimonials ─────────────────────────────────────── */}
        <ProductTestimonials productId={product._id} />

        {/* ── Reviews ─────────────────────────────────────────────── */}
        <ReviewsSection productId={product._id} />
      </main>

      {/* ── Mobile sticky CTA ───────────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background/90 backdrop-blur-xl border-t border-white/8">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{product.name}</p>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-foreground">₹{product.price}</span>
              <span className="text-xs text-muted-foreground line-through">₹{product.originalPrice}</span>
            </div>
          </div>
          <WishlistToggle product={product} />
          {inCart ? (
            <button disabled className="flex-1 max-w-[160px] h-10 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium flex items-center justify-center gap-2">
              <Check className="w-3.5 h-3.5" />
              In cart
            </button>
          ) : (
            <button
              onClick={() => addItem(product)}
              className="flex-1 max-w-[160px] h-10 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add to cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
