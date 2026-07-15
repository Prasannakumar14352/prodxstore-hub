import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import type { DbProduct } from "@/lib/product-visuals.ts";

type WishlistContextType = {
  items: DbProduct[];
  toggleItem: (product: DbProduct) => void;
  removeItem: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  count: number;
  isOpen: boolean;
  openWishlist: () => void;
  closeWishlist: () => void;
};

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<DbProduct[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const toggleItem = useCallback((product: DbProduct) => {
    setItems((prev) => {
      const exists = prev.some((p) => p._id === product._id);
      return exists ? prev.filter((p) => p._id !== product._id) : [...prev, product];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((p) => p._id !== productId));
  }, []);

  const isWishlisted = useCallback(
    (productId: string) => items.some((p) => p._id === productId),
    [items]
  );

  const openWishlist = useCallback(() => setIsOpen(true), []);
  const closeWishlist = useCallback(() => setIsOpen(false), []);

  return (
    <WishlistContext.Provider
      value={{ items, toggleItem, removeItem, isWishlisted, count: items.length, isOpen, openWishlist, closeWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
