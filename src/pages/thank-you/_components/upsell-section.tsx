import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ShoppingCart, Sparkles, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";
import { cn } from "@/lib/utils.ts";

type UpsellProduct = {
  _id: string;
  name: string;
  slug: string;
  category: string;
  tagline: string;
  price: number;
  originalPrice: number;
  image: string;
  badge?: string;
};

function UpsellCard({ product, index }: { product: UpsellProduct; index: number }) {
  const { formatUsd } = useExchangeRate();
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.1, duration: 0.45, ease: "easeOut" as const }}
      className="rounded-2xl border border-white/8 bg-card overflow-hidden flex flex-col group hover:border-primary/30 transition-colors"
    >
      <Link to={`/product/${product.slug}`} className="relative aspect-[16/9] overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {discount > 0 && (
          <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{discount}%
          </div>
        )}
        {product.badge && (
          <div className="absolute top-2.5 left-2.5 bg-white/10 backdrop-blur text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20">
            {product.badge}
          </div>
        )}
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{product.category}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-semibold text-sm text-foreground mb-1 hover:text-primary transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 flex-1">{product.tagline}</p>

        <div className="flex items-center justify-between gap-2 mt-auto">
          <div>
            <span className="text-base font-bold text-foreground">{formatUsd(product.price)}</span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through ml-1.5">{formatUsd(product.originalPrice)}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" className="rounded-full text-xs px-3 h-7 gap-1.5">
              <Link to={`/product/${product.slug}`}>
                <ShoppingCart className="w-3 h-3" /> Buy now
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="rounded-full text-xs px-2 h-7">
              <Link to={`/product/${product.slug}`}>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function UpsellSection({
  purchasedProductIds,
}: {
  purchasedProductIds: Id<"products">[];
}) {
  const suggestions = useQuery(
    api.products.getUpsellSuggestions,
    purchasedProductIds.length > 0 ? { purchasedProductIds } : "skip"
  );

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="mt-10"
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">You might also like</h2>
          <p className="text-[11px] text-muted-foreground">Handpicked just for you</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-primary/80">
          <Tag className="w-3 h-3" />
          <span>Explore more products</span>
        </div>
      </div>

      <div className={cn(
        "grid gap-4",
        suggestions.length === 1 ? "grid-cols-1 max-w-sm" :
        suggestions.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {suggestions.map((p, i) => (
          <UpsellCard key={p._id} product={p} index={i} />
        ))}
      </div>
    </motion.div>
  );
}
