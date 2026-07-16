import { useState } from "react";
import { useQuery, useMutation, useAction } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { Doc, Id } from "@/lib/api/types.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  Loader2,
  Trash2,
  Eye,
  EyeOff,
  MessageSquare,
  Mail,
  Star,
  ChevronDown,
  ChevronUp,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";

// ─── WhatsApp card preview ─────────────────────────────────────────────────

function WhatsAppCard({ t }: { t: Doc<"aiTestimonials"> }) {
  const msgs = t.whatsappMessages ?? [];
  return (
    <div className="rounded-xl overflow-hidden border border-white/10 text-xs w-full max-w-xs bg-[#0f1417]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34]">
        <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[11px]">
          {t.whatsappBuyerInitials ?? "?"}
        </div>
        <div>
          <p className="font-semibold text-white text-[11px]">{t.whatsappBuyerName ?? "Buyer"}</p>
          <p className="text-[9px] text-emerald-400">online</p>
        </div>
      </div>
      {/* Messages */}
      <div className="px-2 py-2 space-y-1.5 bg-[#0b1014]">
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.sender === "seller" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "rounded-lg px-2.5 py-1.5 max-w-[80%]",
                m.sender === "seller"
                  ? "bg-[#005c4b] text-white rounded-tr-none"
                  : "bg-[#1f2c34] text-white rounded-tl-none"
              )}
            >
              <p className="leading-snug whitespace-pre-wrap text-[10px]">{m.text}</p>
              <p className="text-[8px] text-white/40 text-right mt-0.5">{m.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Email card preview ────────────────────────────────────────────────────

function EmailCard({ t }: { t: Doc<"aiTestimonials"> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#1a1d24] p-4 text-xs w-full max-w-sm">
      {/* Email header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold shrink-0">
          {t.emailInitials ?? "?"}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{t.emailSender ?? "Customer"}</p>
          <p className="text-muted-foreground text-[10px]">to me</p>
        </div>
      </div>
      <p className="font-semibold text-foreground mb-2 leading-snug">{t.emailSubject}</p>
      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6 text-[11px]">
        {t.emailBody}
      </p>
    </div>
  );
}

// ─── Review card preview ────────────────────────────────────────────────────

function ReviewCard({ t }: { t: Doc<"aiTestimonials"> }) {
  return (
    <div className="rounded-xl border border-white/10 bg-card p-4 text-xs w-full max-w-sm">
      <div className="flex mb-3">
        {Array.from({ length: t.rating ?? 5 }).map((_, s) => (
          <Star key={s} className="w-3 h-3 text-amber-400 fill-amber-400" />
        ))}
      </div>
      {t.reviewTitle && (
        <p className="font-semibold text-foreground mb-1.5">{t.reviewTitle}</p>
      )}
      <p className="text-muted-foreground leading-relaxed mb-4">{t.reviewBody}</p>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-primary/30 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
          {t.reviewerInitials ?? "?"}
        </div>
        <div>
          <p className="font-medium text-foreground">{t.reviewerName}</p>
          <p className="text-muted-foreground text-[10px]">{t.reviewerRole}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Single testimonial row ────────────────────────────────────────────────

function TestimonialRow({ t }: { t: Doc<"aiTestimonials"> }) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useMutation(api.aiTestimonials.toggleStatus);
  const remove = useMutation(api.aiTestimonials.remove);

  const TypeIcon =
    t.type === "whatsapp" ? MessageCircle : t.type === "email" ? Mail : Star;
  const typeLabel =
    t.type === "whatsapp" ? "WhatsApp" : t.type === "email" ? "Email" : "Review";
  const typeColor =
    t.type === "whatsapp" ? "text-emerald-400" : t.type === "email" ? "text-violet-400" : "text-amber-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-xl border bg-card transition-colors",
        t.status === "hidden" ? "border-white/5 opacity-50" : "border-white/8"
      )}
    >
      {/* Row header */}
      <div className="flex items-center gap-3 p-3">
        <div className={cn("w-7 h-7 rounded-lg border border-white/10 bg-background flex items-center justify-center shrink-0", typeColor)}>
          <TypeIcon className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-medium uppercase tracking-wider", typeColor)}>{typeLabel}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-foreground font-medium truncate">
              {t.type === "whatsapp"
                ? t.whatsappBuyerName
                : t.type === "email"
                ? t.emailSender
                : t.reviewerName}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground truncate">{t.productName}</span>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {t.type === "review"
              ? t.reviewTitle ?? t.reviewBody?.slice(0, 60)
              : t.type === "email"
              ? t.emailSubject
              : (t.whatsappMessages?.[0]?.text ?? "").slice(0, 60)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={async () => {
              await toggle({ id: t._id });
              toast.success(t.status === "active" ? "Hidden" : "Shown");
            }}
            className="w-7 h-7 rounded-lg border border-white/8 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
            title={t.status === "active" ? "Hide" : "Show"}
          >
            {t.status === "active" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={async () => {
              await remove({ id: t._id });
              toast.success("Deleted");
            }}
            className="w-7 h-7 rounded-lg border border-white/8 flex items-center justify-center text-muted-foreground hover:text-red-400 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded((e) => !e)}
            className="w-7 h-7 rounded-lg border border-white/8 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded preview */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/8"
          >
            <div className="p-4">
              {t.type === "whatsapp" && <WhatsAppCard t={t} />}
              {t.type === "email" && <EmailCard t={t} />}
              {t.type === "review" && <ReviewCard t={t} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Generate panel for a single product ──────────────────────────────────

function ProductGeneratePanel({
  product,
}: {
  product: { _id: Id<"products">; name: string; slug: string; description: string };
}) {
  const [expanded, setExpanded] = useState(false);
  const [types, setTypes] = useState<Set<"review" | "whatsapp" | "email">>(
    new Set(["review", "whatsapp", "email"])
  );
  const [count, setCount] = useState(2);
  const [generating, setGenerating] = useState(false);
  const generate = useAction(api.aiTestimonialsGen.generateForProduct);
  const testimonials = useQuery(api.aiTestimonials.listByProduct, { productId: product._id });

  const activeCount = testimonials?.filter((t) => t.status === "active").length ?? 0;

  const toggleType = (t: "review" | "whatsapp" | "email") => {
    setTypes((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (types.size === 0) return toast.error("Select at least one type");
    setGenerating(true);
    try {
      const res = await generate({
        productId: product._id,
        productName: product.name,
        productSlug: product.slug,
        productDescription: product.description,
        types: Array.from(types),
        count,
      });
      toast.success(`Generated ${res.generated} testimonials for ${product.name}`);
    } catch {
      toast.error("Generation failed — check AI Gateway key");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-card">
      <button
        className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-white/2 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex-1 flex items-center gap-3 min-w-0 text-left">
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-medium text-sm text-foreground truncate">{product.name}</span>
            <span className="text-xs text-muted-foreground">
              {activeCount} active testimonial{activeCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/8"
          >
            <div className="p-4 space-y-4">
              {/* Generate controls */}
              <div className="rounded-lg border border-white/8 bg-background/50 p-4 space-y-3">
                <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  AI Generate Testimonials
                </p>

                <div className="flex flex-wrap gap-2">
                  {(["review", "whatsapp", "email"] as const).map((type) => {
                    const Icon = type === "whatsapp" ? MessageCircle : type === "email" ? Mail : Star;
                    const label = type === "whatsapp" ? "WhatsApp Chat" : type === "email" ? "Email Screenshot" : "Star Review";
                    return (
                      <button
                        key={type}
                        onClick={() => toggleType(type)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors cursor-pointer",
                          types.has(type)
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {label}
                        {types.has(type) && <Check className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Count per type:</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setCount(n)}
                        className={cn(
                          "w-7 h-7 rounded-full border text-xs transition-colors cursor-pointer",
                          count === n
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/10 text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="rounded-full gap-1.5"
                  onClick={handleGenerate}
                  disabled={generating || types.size === 0}
                >
                  {generating ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating {types.size * count}…</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate {types.size * count} testimonials</>
                  )}
                </Button>
              </div>

              {/* Existing testimonials */}
              {testimonials === undefined ? (
                <Skeleton className="h-12 w-full rounded-xl" />
              ) : testimonials.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No testimonials yet — generate some above</p>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {testimonials.map((t) => (
                      <TestimonialRow key={t._id} t={t} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────

export function AiTestimonialsTab() {
  const products = useQuery(api.products.list);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">AI-Generated Testimonials</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Generate realistic WhatsApp chats, email screenshots, and star reviews for each product. 
            Active testimonials appear in the homepage carousel automatically.
          </p>
        </div>
      </div>

      {products === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Add products first to generate testimonials for them.
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductGeneratePanel key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
