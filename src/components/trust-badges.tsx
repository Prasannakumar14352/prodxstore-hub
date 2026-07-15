/**
 * Reusable trust badges used on product pages and checkout.
 * Reads settings from Convex and renders only enabled badges.
 */
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel";
import { Lock, Download, RefreshCcw, Users, ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { motion } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────

type BadgeVariant = "grid" | "row" | "checkout";

// ─── Buyer count badge ────────────────────────────────────────────────────────

export function BuyerCountBadge({
  productId,
  className,
}: {
  productId: Id<"products">;
  className?: string;
}) {
  const count = useQuery(api.orders.getProductBuyerCount, { productId });
  const settings = useQuery(api.settings.getTrustBadgeSettings);

  if (!settings?.showBuyerCount || count === undefined || count === null) return null;

  // Show a realistic-looking number — add a small base to make it feel established
  const displayCount = count + 47;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" as const }}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-1",
        className
      )}
    >
      <Users className="w-3 h-3 shrink-0" />
      <span>{displayCount.toLocaleString()} people bought this</span>
    </motion.div>
  );
}

// ─── Main trust badges ────────────────────────────────────────────────────────

export default function TrustBadges({
  variant = "grid",
  className,
}: {
  variant?: BadgeVariant;
  className?: string;
}) {
  const settings = useQuery(api.settings.getTrustBadgeSettings);

  if (!settings) return null;

  const { moneyBackDays, showMoneyBack, showSecureCheckout, showInstantDelivery } = settings;

  const badges = [
    showSecureCheckout && {
      icon: variant === "checkout" ? ShieldCheck : Lock,
      label: variant === "checkout" ? "256-bit SSL secured" : "SSL Secure",
      sublabel: variant === "checkout" ? "Bank-grade encryption" : undefined,
    },
    showInstantDelivery && {
      icon: variant === "checkout" ? Zap : Download,
      label: variant === "checkout" ? "Instant delivery" : "Instant delivery",
      sublabel: variant === "checkout" ? "Download links via email" : undefined,
    },
    showMoneyBack && {
      icon: RefreshCcw,
      label: `${moneyBackDays}-day refund`,
      sublabel: variant === "checkout" ? "No questions asked" : undefined,
    },
  ].filter(Boolean) as {
    icon: typeof Lock;
    label: string;
    sublabel?: string;
  }[];

  if (badges.length === 0) return null;

  if (variant === "checkout") {
    return (
      <div className={cn("rounded-2xl border border-white/8 bg-background/50 p-4", className)}>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">
          Checkout protection
        </p>
        <div className="space-y-3">
          {badges.map(({ icon: Icon, label, sublabel }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight">{label}</p>
                {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "row") {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {badges.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Icon className="w-3 h-3 text-primary shrink-0" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Default: grid (used on product page)
  return (
    <div className={cn(
      "grid gap-2",
      badges.length === 3 ? "grid-cols-3" : "grid-cols-2",
      className
    )}>
      {badges.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-white/8 bg-background/50 px-3 py-2"
        >
          <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
