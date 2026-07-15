import { motion, AnimatePresence } from "motion/react";
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist.tsx";
import { cn } from "@/lib/utils.ts";
import type { DbProduct } from "@/lib/product-visuals.ts";

/** Small heart toggle button for product cards and detail pages */
export function WishlistToggle({ product, className }: { product: DbProduct; className?: string }) {
  const { isWishlisted, toggleItem } = useWishlist();
  const wishlisted = isWishlisted(product._id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleItem(product);
      }}
      className={cn(
        "w-8 h-8 rounded-full border flex items-center justify-center transition-all cursor-pointer",
        wishlisted
          ? "border-rose-400/50 bg-rose-400/10 text-rose-400"
          : "border-white/10 bg-white/5 text-muted-foreground hover:border-rose-400/40 hover:text-rose-400",
        className
      )}
      title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <Heart className={cn("w-3.5 h-3.5 transition-all", wishlisted && "fill-rose-400")} />
    </button>
  );
}

/** Nav/FAB wishlist button with badge count */
export function WishlistNavButton() {
  const { count, openWishlist } = useWishlist();

  return (
    <button
      onClick={openWishlist}
      className="relative w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-white/20 transition-all cursor-pointer"
      title="Wishlist"
    >
      <Heart className="w-4 h-4" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center"
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
