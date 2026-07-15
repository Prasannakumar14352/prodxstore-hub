import { motion, AnimatePresence } from "motion/react";
import { X, Heart, ShoppingCart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "@/hooks/use-wishlist.tsx";
import { useCart } from "@/hooks/use-cart.tsx";
import { Button } from "@/components/ui/button.tsx";
import { getVisuals } from "@/lib/product-visuals.ts";
import { cn } from "@/lib/utils.ts";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";

export function WishlistDrawer() {
  const { items, removeItem, isOpen, closeWishlist } = useWishlist();
  const { addItem, items: cartItems } = useCart();
  const { formatUsd } = useExchangeRate();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeWishlist}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-card border-l border-white/8 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400 fill-rose-400" />
                <h2 className="font-semibold text-sm text-foreground">Wishlist</h2>
                {items.length > 0 && (
                  <span className="text-xs text-muted-foreground">({items.length})</span>
                )}
              </div>
              <button
                onClick={closeWishlist}
                className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-4 px-5 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="w-14 h-14 rounded-2xl border border-white/8 bg-background flex items-center justify-center mb-4">
                    <Heart className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="font-medium text-sm text-foreground mb-1">Your wishlist is empty</p>
                  <p className="text-xs text-muted-foreground mb-5">
                    Save products you love by tapping the heart icon
                  </p>
                  <Button size="sm" variant="secondary" className="rounded-full text-xs" onClick={closeWishlist} asChild>
                    <Link to="/#products">Browse products</Link>
                  </Button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((product) => {
                    const { icon: Icon, gradient, accentColor } = getVisuals(product.category);
                    const inCart = cartItems.some((i) => i.product._id === product._id);
                    return (
                      <motion.div
                        key={product._id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-background/50 group"
                      >
                        {/* Thumbnail */}
                        <Link
                          to={`/product/${product.slug}`}
                          onClick={closeWishlist}
                          className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer"
                        >
                          <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                          <div className={cn("absolute inset-0 bg-gradient-to-b", gradient, "opacity-70")} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Icon className={cn("w-4 h-4", accentColor)} />
                          </div>
                        </Link>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/product/${product.slug}`}
                            onClick={closeWishlist}
                            className="block text-sm font-medium text-foreground hover:text-primary transition-colors truncate cursor-pointer"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground truncate">{product.tagline}</p>
                          <p className="text-sm font-bold text-primary mt-0.5">{formatUsd(product.price)}</p>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => addItem(product)}
                            disabled={inCart}
                            className={cn(
                              "w-7 h-7 rounded-full border flex items-center justify-center transition-all cursor-pointer",
                              inCart
                                ? "border-primary/30 bg-primary/10 text-primary"
                                : "border-white/10 bg-white/5 text-muted-foreground hover:border-primary/40 hover:text-primary"
                            )}
                            title={inCart ? "In cart" : "Add to cart"}
                          >
                            <ShoppingCart className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => removeItem(product._id)}
                            className="w-7 h-7 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:border-rose-400/40 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer"
                            title="Remove from wishlist"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-white/8 space-y-2">
                <Button
                  className="w-full rounded-xl text-sm"
                  onClick={() => {
                    items.forEach((p) => {
                      if (!cartItems.some((i) => i.product._id === p._id)) addItem(p);
                    });
                    closeWishlist();
                  }}
                >
                  <ShoppingCart className="w-3.5 h-3.5 mr-2" />
                  Add all to cart
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
