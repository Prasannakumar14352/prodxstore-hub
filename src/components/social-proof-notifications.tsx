import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { SocialProofNotification, SocialProofSettings } from "@/lib/api/types.ts";

// ─── Demo data (only shown when demoMode is enabled by admin) ─────────────────

const DEMO_LOCATIONS = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Hyderabad", "Pune", "Kolkata",
  "New York", "London", "Singapore", "Dubai", "Toronto", "Sydney",
];

const DEMO_NAMES = [
  "Priya", "Rahul", "Ananya", "Vikram", "Neha", "Arjun", "Meera",
  "Kiran", "Rohan", "Divya", "Sanjay", "Pooja", "Amit", "Shreya",
  "Sarah", "James", "Emma", "Carlos", "Fatima", "Yuki",
];

function makeDemoNotifications(products: Array<{ _id: string; name: string; image: string }>): SocialProofNotification[] {
  return products.slice(0, 6).map((p, i) => ({
    id: `demo-${i}`,
    firstName: DEMO_NAMES[i % DEMO_NAMES.length],
    location: DEMO_LOCATIONS[i % DEMO_LOCATIONS.length],
    productName: p.name,
    productImage: p.image,
    purchasedAt: Date.now() - (i + 1) * 8 * 60 * 1000, // staggered fake times
    isDemo: true,
  }));
}

// ─── Time ago helper ──────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Buyer initials avatar ────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-amber-500 to-orange-500",
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-teal-500",
  "from-blue-500 to-cyan-500",
  "from-rose-500 to-pink-500",
  "from-yellow-500 to-amber-500",
];

function BuyerAvatar({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  const colorIndex = name.charCodeAt(0) % AVATAR_COLORS.length;
  return (
    <div className={cn(
      "w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br",
      AVATAR_COLORS[colorIndex]
    )}>
      {initial}
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ duration }: { duration: number }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 rounded-b-2xl overflow-hidden">
      <motion.div
        className="h-full bg-primary/60 origin-left"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration, ease: "linear" }}
      />
    </div>
  );
}

// ─── Single notification card ─────────────────────────────────────────────────

function NotificationCard({
  notification,
  settings,
  onClose,
}: {
  notification: SocialProofNotification;
  settings: SocialProofSettings;
  onClose: () => void;
}) {
  const { firstName, location, productName, productImage, purchasedAt, isDemo } = notification;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="relative w-[320px] max-w-[calc(100vw-32px)] rounded-2xl border border-white/12 bg-card/80 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden"
    >
      {/* Demo badge */}
      {isDemo && (
        <div className="absolute top-2 right-8 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400 font-medium tracking-wide z-10">
          DEMO
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors cursor-pointer z-10"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="flex items-start gap-3 p-3.5 pr-8">
        {/* Product thumbnail */}
        {settings.showProductImage && productImage && (
          <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-white/10 bg-white/5">
            <img
              src={productImage}
              alt={productName}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Verified badge */}
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">
              Verified Purchase
            </span>
          </div>

          {/* Buyer + location */}
          <p className="text-sm text-foreground font-medium leading-snug">
            <span className="font-semibold">{firstName}</span>
            {settings.showLocation && location && (
              <span className="text-muted-foreground font-normal"> from {location}</span>
            )}
          </p>

          {/* Product name */}
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            just purchased{" "}
            <span className="text-foreground font-medium truncate">{productName}</span>
          </p>

          {/* Time ago */}
          {settings.showTimeAgo && (
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              {timeAgo(purchasedAt)}
            </p>
          )}
        </div>

        {/* Avatar (right side, only if no product image) */}
        {(!settings.showProductImage || !productImage) && (
          <BuyerAvatar name={firstName} />
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar duration={settings.displayDuration} />
    </motion.div>
  );
}

// ─── Position styles ──────────────────────────────────────────────────────────

function positionClass(pos: SocialProofSettings["position"]): string {
  switch (pos) {
    case "bottom-right":  return "bottom-6 right-6 items-end";
    case "bottom-center": return "bottom-6 left-1/2 -translate-x-1/2 items-center";
    default:              return "bottom-6 left-6 items-start";
  }
}

// ─── Main controller ──────────────────────────────────────────────────────────

export function SocialProofNotifications() {
  const settings = useQuery(api.socialProof.getSettings);
  const realPurchases = useQuery(api.socialProof.getRecentPurchases);
  const allProducts = useQuery(api.products.list);

  const [current, setCurrent] = useState<SocialProofNotification | null>(null);
  const queueRef = useRef<SocialProofNotification[]>([]);
  const shownRef = useRef<Set<string>>(new Set());
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build the notification queue once we have data
  const buildQueue = useCallback(() => {
    if (!settings || !allProducts) return;

    // Map product id → image for enriching real purchases
    const imgMap = new Map(allProducts.map((p) => [p._id as string, p.image]));

    let items: SocialProofNotification[] = [];

    if (settings.demoMode) {
      items = makeDemoNotifications(allProducts.map((p) => ({ _id: p._id as string, name: p.name, image: p.image })));
    } else if (realPurchases && realPurchases.length > 0) {
      items = realPurchases.map((n) => ({
        ...n,
        productImage: imgMap.get(n.id) ?? n.productImage,
      }));
    }

    queueRef.current = shuffle(items);
  }, [settings, realPurchases, allProducts]);

  // Schedule the next notification
  const scheduleNext = useCallback(() => {
    if (!settings) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const delay = (settings.intervalMin + Math.random() * (settings.intervalMax - settings.intervalMin)) * 1000;

    timerRef.current = setTimeout(() => {
      if (countRef.current >= settings.maxPerSession) return;

      // Find next unshown notification
      let next: SocialProofNotification | undefined;
      let attempts = 0;
      while (attempts < queueRef.current.length) {
        const candidate = queueRef.current[attempts];
        if (candidate && !shownRef.current.has(candidate.id)) {
          next = candidate;
          break;
        }
        attempts++;
      }

      if (!next) {
        // All shown — reshuffle and clear session memory for repeat
        shownRef.current = new Set();
        buildQueue();
        next = queueRef.current[0];
      }

      if (!next) return;

      shownRef.current.add(next.id);
      countRef.current += 1;
      setCurrent(next);

      // Auto-hide after displayDuration
      timerRef.current = setTimeout(() => {
        setCurrent(null);
        scheduleNext();
      }, settings.displayDuration * 1000);
    }, delay);
  }, [settings, buildQueue]);

  // Initialise queue and kick off scheduling when data arrives
  useEffect(() => {
    if (!settings?.enabled) return;
    buildQueue();
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.enabled, settings?.demoMode, realPurchases?.length, allProducts?.length]);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrent(null);
    scheduleNext();
  }, [scheduleNext]);

  // Don't render on admin page
  if (window.location.pathname.startsWith("/admin")) return null;
  if (!settings?.enabled) return null;
  if (!settings.demoMode && (!realPurchases || realPurchases.length === 0)) return null;

  return (
    <div className={cn("fixed z-40 pointer-events-none flex flex-col", positionClass(settings.position))}>
      <AnimatePresence mode="wait">
        {current && (
          <div className="pointer-events-auto">
            <NotificationCard
              key={current.id}
              notification={current}
              settings={settings}
              onClose={handleClose}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
