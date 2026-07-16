import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { ReactNode } from "react";
import type { DbProduct } from "@/lib/product-visuals.ts";
import { useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import { toast } from "sonner";

export type CartItem = {
  product: DbProduct;
  quantity: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: DbProduct) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  savings: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
};

const STORAGE_KEY = "pxs_cart_v1";
const EXPIRY_DAYS = 30;

type PersistedCart = {
  items: CartItem[];
  savedAt: number; // unix ms
};

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PersistedCart;
    const age = Date.now() - (parsed.savedAt ?? 0);
    if (age > EXPIRY_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: CartItem[]) {
  try {
    const data: PersistedCart = { items, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

function clearStorage() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage immediately — no loading flicker
  const [items, setItems] = useState<CartItem[]>(() => loadFromStorage());
  const [isOpen, setIsOpen] = useState(false);
  // Ref to track whether we've validated against live products yet
  const validatedRef = useRef(false);

  // Live products query — used to detect removed/price-changed products
  const liveProducts = useQuery(api.products.list);

  // Sync cart to localStorage on every change
  useEffect(() => {
    saveToStorage(items);
  }, [items]);

  // Validate cart against live catalogue after products load
  useEffect(() => {
    if (!liveProducts || validatedRef.current) return;
    validatedRef.current = true;

    setItems((prev) => {
      if (prev.length === 0) return prev;

      const productMap = new Map(liveProducts.map((p) => [p._id, p]));
      const removed: string[] = [];
      const priceChanged: string[] = [];

      const updated = prev
        .map((item) => {
          const live = productMap.get(item.product._id);
          if (!live) {
            removed.push(item.product.name);
            return null; // product deleted/unpublished
          }
          // Refresh product data so price/image/name is always current
          const priceChangedFlag = live.price !== item.product.price;
          if (priceChangedFlag) priceChanged.push(live.name);
          return { ...item, product: live };
        })
        .filter((item): item is CartItem => item !== null);

      if (removed.length > 0) {
        toast.warning(
          `${removed.join(", ")} ${removed.length === 1 ? "is" : "are"} no longer available and ${removed.length === 1 ? "was" : "were"} removed from your cart.`
        );
      }
      if (priceChanged.length > 0) {
        toast.info(
          `Prices updated for: ${priceChanged.join(", ")}. Your cart totals have been refreshed.`
        );
      }

      return updated;
    });
  }, [liveProducts]);

  const addItem = useCallback((product: DbProduct) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product._id === product._id);
      if (existing) return prev;
      return [...prev, { product, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product._id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product._id !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => (i.product._id === productId ? { ...i, quantity } : i))
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    clearStorage();
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const savings = items.reduce(
    (sum, i) => sum + (i.product.originalPrice - i.product.price) * i.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        savings,
        isOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
