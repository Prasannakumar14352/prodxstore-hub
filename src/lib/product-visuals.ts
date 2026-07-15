import type { Doc } from "@/convex/_generated/dataModel";

// The database product type — used across storefront and admin
export type DbProduct = Doc<"products">;

// Visual config per category (icon, colors) — purely frontend
import { Palette, Code2, Layers, BookOpen, Zap, Globe, Package } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type VisualConfig = {
  icon: LucideIcon;
  gradient: string;
  accentColor: string;
  borderGlow: string;
};

const CATEGORY_VISUALS: Record<string, VisualConfig> = {
  Design: {
    icon: Palette,
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    accentColor: "text-amber-400",
    borderGlow: "hover:border-amber-500/40",
  },
  Code: {
    icon: Code2,
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accentColor: "text-emerald-400",
    borderGlow: "hover:border-emerald-500/40",
  },
  Productivity: {
    icon: Layers,
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    accentColor: "text-violet-400",
    borderGlow: "hover:border-violet-500/40",
  },
  "E-book": {
    icon: BookOpen,
    gradient: "from-sky-500/20 via-blue-500/10 to-transparent",
    accentColor: "text-sky-400",
    borderGlow: "hover:border-sky-500/40",
  },
  Template: {
    icon: Zap,
    gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
    accentColor: "text-rose-400",
    borderGlow: "hover:border-rose-500/40",
  },
  Course: {
    icon: Globe,
    gradient: "from-cyan-500/20 via-blue-500/10 to-transparent",
    accentColor: "text-cyan-400",
    borderGlow: "hover:border-cyan-500/40",
  },
};

const DEFAULT_VISUAL: VisualConfig = {
  icon: Package,
  gradient: "from-white/5 to-transparent",
  accentColor: "text-muted-foreground",
  borderGlow: "hover:border-white/20",
};

export function getVisuals(category: string): VisualConfig {
  return CATEGORY_VISUALS[category] ?? DEFAULT_VISUAL;
}

// Badge color map
export function getBadgeColor(badge: string): string {
  const map: Record<string, string> = {
    "Best Seller": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    New: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    Popular: "bg-violet-500/20 text-violet-400 border-violet-500/30",
    Hot: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    Sale: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  };
  return map[badge] ?? "bg-primary/20 text-primary border-primary/30";
}
