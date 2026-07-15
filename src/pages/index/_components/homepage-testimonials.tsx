import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel";
import { Star, ChevronLeft, ChevronRight, MessageCircle, Mail, Shield, CheckCircle, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils.ts";

// ─── WhatsApp Card ────────────────────────────────────────────────────────────

function WhatsAppCard({ t }: { t: Doc<"aiTestimonials"> }) {
  const msgs = t.whatsappMessages ?? [];
  return (
    <div className="h-full flex flex-col">
      {/* Header pill */}
      <div className="flex items-center gap-1.5 mb-3">
        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-[10px] uppercase tracking-wider font-medium text-emerald-400">WhatsApp</span>
      </div>
      {/* Chat bubble UI */}
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
              <div
                className={cn(
                  "rounded-lg px-3 py-1.5 max-w-[85%]",
                  m.sender === "seller"
                    ? "bg-[#005c4b] text-white rounded-tr-none"
                    : "bg-[#1f2c34] text-white rounded-tl-none"
                )}
              >
                <p className="text-[11px] leading-snug whitespace-pre-wrap">{m.text}</p>
                <p className="text-[9px] text-white/40 text-right mt-0.5">{m.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Product link */}
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground truncate max-w-[70%]">{t.productName}</p>
        <Link
          to={`/product/${t.productSlug}`}
          className="text-[10px] text-primary hover:underline cursor-pointer"
        >
          View product →
        </Link>
      </div>
    </div>
  );
}

// ─── Email Card ───────────────────────────────────────────────────────────────

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
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground truncate max-w-[70%]">{t.productName}</p>
        <Link
          to={`/product/${t.productSlug}`}
          className="text-[10px] text-primary hover:underline cursor-pointer"
        >
          View product →
        </Link>
      </div>
    </div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

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
      <div className="mt-3 flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground truncate max-w-[70%]">{t.productName}</p>
        <Link
          to={`/product/${t.productSlug}`}
          className="text-[10px] text-primary hover:underline cursor-pointer"
        >
          View product →
        </Link>
      </div>
    </div>
  );
}

// ─── Single testimonial slide ─────────────────────────────────────────────────

function TestimonialSlide({ t }: { t: Doc<"aiTestimonials"> }) {
  return (
    <div className="h-full">
      {t.type === "whatsapp" && <WhatsAppCard t={t} />}
      {t.type === "email" && <EmailCard t={t} />}
      {t.type === "review" && <ReviewCard t={t} />}
    </div>
  );
}

// ─── Stat badges ──────────────────────────────────────────────────────────────

const statBadges = [
  { icon: CheckCircle, label: "3000+ Customers served", color: "text-emerald-400" },
  { icon: Shield, label: "100% Verified Reviews", color: "text-primary" },
  { icon: Lock, label: "Secure & Trusted", color: "text-violet-400" },
];

// ─── Main exported component ──────────────────────────────────────────────────

export function HomepageTestimonials() {
  const all = useQuery(api.aiTestimonials.listActive);
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1); // 1 = forward, -1 = backward

  // Shuffle once per load for variety
  const [shuffled, setShuffled] = useState<Doc<"aiTestimonials">[]>([]);

  useEffect(() => {
    if (all && all.length > 0) {
      const copy = [...all].sort(() => Math.random() - 0.5);
      setShuffled(copy);
      setCurrent(0);
    }
  }, [all]);

  const total = shuffled.length;
  const perPage = 3; // show 3 cards at a time on desktop
  const pageCount = Math.max(1, Math.ceil(total / perPage));

  const goTo = useCallback(
    (idx: number, d: number) => {
      setDir(d);
      setCurrent(((idx % pageCount) + pageCount) % pageCount);
    },
    [pageCount]
  );

  // Auto-rotate every 5s
  useEffect(() => {
    if (total === 0) return;
    const id = setInterval(() => goTo(current + 1, 1), 5000);
    return () => clearInterval(id);
  }, [current, total, goTo]);

  const visibleItems = shuffled.slice(
    current * perPage,
    current * perPage + perPage
  );

  // If total < perPage fill from beginning (wrap-around)
  const displayItems: Doc<"aiTestimonials">[] = [];
  if (shuffled.length > 0) {
    for (let i = 0; i < perPage; i++) {
      displayItems.push(shuffled[(current * perPage + i) % shuffled.length]);
    }
  }

  // Platform rating: average of review-type testimonials
  const reviews = shuffled.filter((t) => t.type === "review");
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, t) => s + (t.rating ?? 5), 0) / reviews.length
      : 4.9;

  // Loading / empty states — keep static section if no AI testimonials yet
  if (all === undefined) return null; // still loading
  if (all.length === 0) return <StaticFallback />;

  return (
    <section id="testimonials" className="py-24 max-w-5xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">Testimonials</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Real results, real{" "}
          <span className="font-serif italic font-normal text-primary">people.</span>
        </h2>
        {/* Platform rating */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          ))}
          <span className="text-sm font-semibold text-foreground">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">{all.length}+ testimonials</span>
        </div>
      </motion.div>

      {/* Stat badges */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {statBadges.map((b) => (
          <div
            key={b.label}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-2"
          >
            <b.icon className={cn("w-3.5 h-3.5", b.color)} />
            <span className="text-xs font-medium text-foreground">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Carousel */}
      <div className="relative">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={current}
            initial={{ opacity: 0, x: dir * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -60 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
            className="grid md:grid-cols-3 gap-5"
          >
            {displayItems.map((t, i) => (
              <div key={`${t._id}-${i}`} className="rounded-2xl border border-white/8 bg-card p-5">
                <TestimonialSlide t={t} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Nav arrows */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => goTo(current - 1, -1)}
              className="w-9 h-9 rounded-full border border-white/10 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {/* Dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: pageCount }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i, i > current ? 1 : -1)}
                  className={cn(
                    "rounded-full transition-all cursor-pointer",
                    i === current
                      ? "w-5 h-1.5 bg-primary"
                      : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                  )}
                />
              ))}
            </div>
            <button
              onClick={() => goTo(current + 1, 1)}
              className="w-9 h-9 rounded-full border border-white/10 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* See what customers are saying sub-section */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        See what our customers are saying about their success…
      </p>
    </section>
  );
}

// ─── Static fallback (shown when no AI testimonials generated yet) ─────────────

const staticFallbackData = [
  {
    name: "Priya Singh",
    role: "Freelancer",
    avatar: "PS",
    text: "I always wanted to start an online business but didn't know how. This ready-made website gave me the confidence to begin, and it's very user-friendly & easy to set up.",
    rating: 5,
  },
  {
    name: "Yuvraj Sharma",
    role: "Digital Marketer",
    avatar: "YS",
    text: "Finally, got a digital product business opportunity that works. I've already made best sales, and the ROI has been excellent.",
    rating: 5,
  },
  {
    name: "Lavanya Reddy",
    role: "Online Seller",
    avatar: "LR",
    text: "I bought this website to resell digital products, and the bonus package is huge — over 1,000+ premium products that have greatly increased my sales.",
    rating: 4,
  },
];

function StaticFallback() {
  return (
    <section id="testimonials" className="py-24 max-w-5xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-primary font-medium mb-3">Testimonials</p>
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
          Real results, real{" "}
          <span className="font-serif italic font-normal text-primary">creators.</span>
        </h2>
      </motion.div>
      {/* Stat badges */}
      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {statBadges.map((b) => (
          <div key={b.label} className="flex items-center gap-2 rounded-full border border-white/10 bg-card px-4 py-2">
            <b.icon className={cn("w-3.5 h-3.5", b.color)} />
            <span className="text-xs font-medium text-foreground">{b.label}</span>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {staticFallbackData.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" as const }}
            className="rounded-2xl border border-white/8 bg-card p-6 flex flex-col"
          >
            <div className="flex mb-4">
              {Array.from({ length: t.rating }).map((_, s) => (
                <Star key={s} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 mb-5">
              {'"'}{t.text}{'"'}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/20 border border-white/10 flex items-center justify-center text-xs font-bold">
                {t.avatar}
              </div>
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
