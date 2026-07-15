import { motion, AnimatePresence } from "motion/react";
import { X, Minus, Plus, ShoppingBag, ArrowRight, Trash2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useNavigate, Link } from "react-router-dom";
import { getVisuals } from "@/lib/product-visuals.ts";
import { cn } from "@/lib/utils.ts";
import { useExchangeRate } from "@/hooks/use-exchange-rate.ts";

export function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity, totalItems, subtotal, savings, addItem } =
    useCart();
  const navigate = useNavigate();
  const { formatUsd } = useExchangeRate();

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring" as const, damping: 28, stiffness: 260 }}
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-card border-l border-white/8 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">
                  Cart{" "}
                  {totalItems > 0 && (
                    <span className="text-muted-foreground font-normal text-sm">
                      ({totalItems} {totalItems === 1 ? "item" : "items"})
                    </span>
                  )}
                </span>
              </div>
              <button
                onClick={closeCart}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <ShoppingBag className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Add some products to get started
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-5 rounded-full"
                    onClick={closeCart}
                  >
                    Browse products
                  </Button>
                </div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.product._id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex gap-3 p-3 rounded-xl border border-white/8 bg-background/50"
                  >
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="text-xs text-muted-foreground">{item.product.category}</p>
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.product.name}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.product._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 border border-white/10 rounded-full px-1">
                          <button
                            onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-medium w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-foreground">
                            {formatUsd(item.product.price * item.quantity)}
                          </span>
                          {item.quantity > 1 && (
                            <p className="text-[10px] text-muted-foreground">
                              {formatUsd(item.product.price)} each
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Cross-sell nudge — shown when exactly 1 item in cart */}
            {items.length === 1 && (() => {
              // No cross-sell possible without other cart items context
              return null;
            })()}

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-6 py-5 border-t border-white/8 space-y-3">
                {savings > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">You save</span>
                    <span className="text-emerald-400 font-medium">−{formatUsd(savings)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Subtotal</span>
                  <span className="text-lg font-bold text-foreground">{formatUsd(subtotal)}</span>
                </div>
                <Button
                  className="w-full rounded-full gap-2"
                  size="lg"
                  onClick={handleCheckout}
                >
                  Checkout <ArrowRight className="w-4 h-4" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  30-day money-back guarantee
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
