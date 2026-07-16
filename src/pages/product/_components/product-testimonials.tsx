import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@/lib/api/hooks.ts";
import { api } from "@/lib/api/index.ts";
import type { Doc, Id } from "@/lib/api/types.ts";
import { Star, MessageCircle, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ─── Card renderers (reused from homepage, scoped here) ──────────────────────

function WhatsAppCard({ t }: { t: Doc<"aiTestimonials"> }) {
  const msgs = t.whatsappMessages ?? [];
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-3">
        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider font-medium text-emerald-400">WhatsApp</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-white/10 flex-1 flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 bg-[#1f2c34]">
          <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            {t.whatsappBuyerInitials ?? "B"}
          </div>
          <div>
            <p className="font-semibold text-white text-[11px]">{t.whatsappBuyerName}</p>
            <p className="text-[9px] text-emerald-400">online</p>
          </div>
        </div>
        <div className="px-2.5 py-2.5 space-y-2 bg-[#0b1014] flex-1">
          {msgs.map((m, i) => (
            <div key={i} className={cn("flex", m.sender === "seller" ? "justify-end" : "justify-start")}>
              <div className={cn(
                "rounded-lg px-3 py-1.5 max-w-[85%]",
                m.sender === "seller" ? "bg-[#005c4b] text-white rounded-tr-none" : "bg-[#1f2c34] text-white rounded-tl-none"
              )}>
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{m.text}</p>
                <p className="text-[9px] text-white/40 text-right mt-0.5">{m.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmailCard({ t }: { t: Doc<"aiTestimonials"> }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-3">
        <Mail className="w-3.5 h-3.5 text-violet-400" />
        <span className="text-[10px] uppercase tracking-wider font-medium text-violet-400">Email</span>
      </div>
      <div className="rounded-xl border border-white/10 bg-[#16181f] p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {t.emailInitials ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-xs">{t.emailSender}</p>
            <p className="text-muted-foreground text-[10px]">to me</p>
          </div>
        </div>
        <p className="font-semibold text-foreground text-xs mb-2 leading-snug">{t.emailSubject}</p>
        <p className="text-muted-foreground text-xs leading-relaxed flex-1 line-clamp-5 whitespace-pre-wrap">
          {t.emailBody}
        </p>
      </div>
    </div>
  );
}

function ReviewCard({ t }: { t: Doc<"aiTestimonials"> }) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-1.5 mb-3">
        <Star className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] uppercase tracking-wider font-medium text-amber-400">Verified Review</span>
      </div>
      <div className="rounded-xl border border-white/10 bg-card p-5 flex-1 flex flex-col">
        <div className="flex mb-3">
          {Array.from({ length: t.rating ?? 5 }).map((_, s) => (
            <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ))}
        </div>
        {t.reviewTitle && (
          <p className="font-semibold text-foreground text-sm mb-2 leading-snug">{t.reviewTitle}</p>
        )}
        <p className="text-muted-foreground text-sm leading-relaxed flex-1">
          {'"'}{t.reviewBody}{'"'}
        </p>
        <div className="flex items-center gap-3 mt-4">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 border border-white/10 flex items-center justify-center text-xs font-bold">
            {t.reviewerInitials ?? "?"}
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">{t.reviewerName}</p>
            <p className="text-xs text-muted-foreground">{t.reviewerRole}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductTestimonials({ productId }: { productId: Id<"products"> }) {
  const all = useQuery(api.aiTestimonials.listByProduct, { productId });
  const active = all?.filter((t) => t.status === "active") ?? [];

  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  const perPage = 3;
  const pageCount = Math.max(1, Math.ceil(active.length / perPage));

  const goTo = useCallback((idx: number, d: number) => {
    setDir(d);
    setCurrent(((idx % pageCount) + pageCount) % pageCount);
  }, [pageCount]);

  // Auto-rotate
  useEffect(() => {
    if (active.length === 0) return;
    const id = setInterval(() => goTo(current + 1, 1), 5000);
    return () => clearInterval(id);
  }, [current, active.length, goTo]);

  if (all === undefined) return null;
  if (active.length === 0) return null;

  const displayItems: Doc<"aiTestimonials">[] = Array.from(
    { length: Math.min(perPage, active.length) },
    (_, i) => active[(current * perPage + i) % active.length]
  );

  return (
    <section className="mt-20 scroll-mt-20">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-xl font-bold tracking-tight">What Buyers Say</h2>
        <span className="text-xs text-muted-foreground rounded-full border border-white/10 bg-card px-2.5 py-1">
          {active.length} testimonial{active.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0, x: dir * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -50 }}
            transition={{ duration: 0.35, ease: "easeOut" as const }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {displayItems.map((t, i) => (
              <div key={`${t._id}-${i}`} className="rounded-2xl border border-white/8 bg-card p-5">
                {t.type === "whatsapp" && <WhatsAppCard t={t} />}
                {t.type === "email" && <EmailCard t={t} />}
                {t.type === "review" && <ReviewCard t={t} />}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => goTo(current - 1, -1)}
              className="w-8 h-8 rounded-full border border-white/10 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className={cn(
                    "rounded-full transition-all cursor-pointer",
                    i === current ? "w-5 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(current + 1, 1)}
              className="w-8 h-8 rounded-full border border-white/10 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
